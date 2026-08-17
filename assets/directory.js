(function () {
  "use strict";

  const app = window.Kancelio;
  const client = app.getClient();
  const form = document.getElementById("searchForm");
  const cityInput = document.getElementById("citySearch");
  const serviceSelect = document.getElementById("serviceSearch");
  const results = document.getElementById("results");
  const summary = document.getElementById("searchSummary");
  const configNotice = document.getElementById("configNotice");
  const dialog = document.getElementById("contactDialog");
  const contactTitle = document.getElementById("contactTitle");
  const contactStatus = document.getElementById("contactStatus");
  const contactDetails = document.getElementById("contactDetails");
  const turnstileSlot = document.getElementById("turnstileSlot");

  let map;
  let markerLayer;
  let turnstileWidget = null;
  let activeOffice = null;
  let searchedPoint = null;

  function initMap() {
    if (!window.L) return;
    map = window.L.map("directoryMap").setView([52.0693, 19.4803], 6);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    markerLayer = window.L.featureGroup().addTo(map);
  }

  function populateServices() {
    app.services.forEach((service) => {
      const option = document.createElement("option");
      option.value = service.id;
      option.textContent = service.label;
      serviceSelect.append(option);
    });
  }

  function addText(parent, tag, value, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    parent.append(element);
    return element;
  }

  function renderOffice(office) {
    const card = document.createElement("article");
    card.className = "office-card";
    addText(card, "h2", office.name);
    addText(card, "div", office.city, "office-city");
    if (Number.isFinite(office.distanceKm)) {
      addText(card, "div", `około ${office.distanceKm < 1 ? `${Math.round(office.distanceKm * 1000)} m` : `${office.distanceKm.toFixed(1)} km`} od szukanego miejsca`, "office-distance");
    }

    const tags = document.createElement("div");
    tags.className = "tags";
    office.services.forEach((serviceId) => {
      addText(tags, "span", app.serviceById[serviceId]?.label ?? serviceId, "tag");
    });
    card.append(tags);

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const reveal = document.createElement("button");
    reveal.type = "button";
    reveal.className = "button gold small";
    reveal.textContent = "Pokaż kontakt i adres";
    reveal.addEventListener("click", () => openContact(office));
    actions.append(reveal);

    const website = app.safeWebsite(office.website);
    if (website) {
      const link = document.createElement("a");
      link.className = "button secondary small";
      link.href = website;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Strona kancelarii";
      actions.append(link);
    }
    card.append(actions);
    return card;
  }

  function updateMap(offices, searchPoint = null) {
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    const points = [];
    if (searchPoint) {
      const point = [searchPoint.lat, searchPoint.lng];
      window.L.marker(point, { icon: app.mapPinIcon("search") }).bindPopup("<strong>Szukana lokalizacja</strong>").addTo(markerLayer);
      points.push(point);
    }
    offices.forEach((office) => {
      if (office.public_latitude == null || office.public_longitude == null) return;
      const point = [office.public_latitude, office.public_longitude];
      const marker = window.L.marker(point, { icon: app.mapPinIcon() }).bindPopup(`<strong>${escapeHtml(office.name)}</strong><br>${escapeHtml(office.city)}<br><small>Punkt przybliżony</small>`);
      marker.addTo(markerLayer);
      points.push(point);
    });
    if (points.length === 1) map.setView(points[0], searchPoint ? 14 : 12);
    else if (points.length > 1) map.fitBounds(markerLayer.getBounds(), { padding: [30, 30], maxZoom: 12 });
    else map.setView([52.0693, 19.4803], 6);
  }

  function distanceKm(from, office) {
    if (office.public_latitude == null || office.public_longitude == null) return Number.POSITIVE_INFINITY;
    const radians = (degrees) => degrees * Math.PI / 180;
    const latDelta = radians(office.public_latitude - from.lat);
    const lngDelta = radians(office.public_longitude - from.lng);
    const lat1 = radians(from.lat);
    const lat2 = radians(office.public_latitude);
    const a = Math.sin(latDelta / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async function geocode(query) {
    if (!query) return null;
    const match = await app.searchPolishAddress(query);
    if (!match) return null;
    const address = match.address || {};
    return {
      lat: Number(match.lat),
      lng: Number(match.lon),
      city: address.city || address.town || address.village || address.municipality || query,
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[character]);
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (cityInput.value.trim()) params.set("city", cityInput.value.trim());
    if (serviceSelect.value) params.set("service", serviceSelect.value);
    const query = params.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
  }

  async function search() {
    if (!client) return;
    const enteredLocation = cityInput.value.trim();
    summary.textContent = enteredLocation ? "Szukamy lokalizacji i pasujących kancelarii…" : "Szukamy kancelarii…";
    results.replaceChildren();
    searchedPoint = null;
    let cityForDatabase = enteredLocation;
    if (enteredLocation) {
      try {
        searchedPoint = await geocode(enteredLocation);
        if (searchedPoint) cityForDatabase = searchedPoint.city;
      } catch (error) {
        console.warn("Address lookup unavailable", error);
      }
    }
    const { data, error } = await client.rpc("search_notary_offices", {
      p_city: cityForDatabase || null,
      p_service: serviceSelect.value || null,
    });

    if (error) {
      console.error(error);
      summary.textContent = "Nie udało się pobrać wyników. Spróbuj ponownie za chwilę.";
      updateMap([], searchedPoint);
      return;
    }

    const offices = (data ?? []).map((office) => ({
      ...office,
      distanceKm: searchedPoint ? distanceKm(searchedPoint, office) : null,
    })).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    updateUrl();
    summary.textContent = offices.length
      ? `Znaleziono: ${offices.length} ${offices.length === 1 ? "kancelarię" : "kancelarii"}.${searchedPoint ? " Wyniki są ułożone od najbliższych." : ""} Punkty kancelarii są przybliżone.`
      : searchedPoint
        ? "Nie znaleźliśmy jeszcze kancelarii w tej lokalizacji. Zmień adres, miasto lub rodzaj czynności."
        : "Brak kancelarii dla wybranych kryteriów. Zmień miasto lub rodzaj czynności.";
    if (!offices.length) {
      addText(results, "div", "Nie znaleźliśmy jeszcze pasującej kancelarii.", "empty");
    } else {
      results.replaceChildren(...offices.map(renderOffice));
    }
    updateMap(offices, searchedPoint);
  }

  function showContactStatus(message, type = "") {
    contactStatus.textContent = message;
    contactStatus.className = `notice ${type}`.trim();
  }

  function resetContactDialog() {
    activeOffice = null;
    contactStatus.className = "notice hidden";
    contactDetails.classList.add("hidden");
    contactDetails.replaceChildren();
    if (turnstileWidget != null && window.turnstile) {
      window.turnstile.remove(turnstileWidget);
      turnstileWidget = null;
    }
    turnstileSlot.classList.remove("hidden");
    turnstileSlot.replaceChildren();
  }

  function openContact(office) {
    resetContactDialog();
    activeOffice = office;
    contactTitle.textContent = office.name;
    dialog.showModal();

    const siteKey = app.config.turnstileSiteKey;
    const configuredSiteKey = typeof siteKey === "string" && siteKey && !siteKey.startsWith("${");
    if (!configuredSiteKey || !window.turnstile) {
      showContactStatus("Ochrona kontaktu nie jest jeszcze skonfigurowana.", "error");
      return;
    }

    turnstileWidget = window.turnstile.render(turnstileSlot, {
      sitekey: siteKey,
      action: "reveal_contact",
      callback: (token) => revealContact(office.id, token),
      "error-callback": () => showContactStatus("Weryfikacja nie powiodła się. Spróbuj ponownie.", "error"),
      "expired-callback": () => showContactStatus("Weryfikacja wygasła. Wykonaj ją ponownie.", "error"),
    });
  }

  function appendContact(label, value, href) {
    if (!value) return;
    const line = document.createElement("div");
    line.className = "contact-line";
    addText(line, "small", label);
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = value;
      line.append(link);
    } else {
      addText(line, "strong", value);
    }
    contactDetails.append(line);
  }

  async function revealContact(officeId, token) {
    showContactStatus("Sprawdzamy weryfikację…");
    try {
      const response = await fetch(`${app.config.supabaseUrl}/functions/v1/reveal-office-contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: app.config.supabasePublishableKey,
        },
        body: JSON.stringify({ officeId, turnstileToken: token }),
      });
      if (!response.ok) throw new Error("Reveal failed");
      const { contact } = await response.json();
      if (!activeOffice || activeOffice.id !== officeId) return;
      contactDetails.replaceChildren();
      appendContact("Adres", `${contact.street_address}, ${contact.postal_code} ${activeOffice.city}`);
      appendContact("E-mail", contact.email, `mailto:${contact.email}`);
      appendContact("Telefon", contact.phone, contact.phone ? `tel:${contact.phone.replace(/[^+\d]/g, "")}` : null);
      contactDetails.classList.remove("hidden");
      showContactStatus("Dane kontaktowe zostały bezpiecznie odsłonięte.", "success");
      turnstileSlot.classList.add("hidden");
    } catch (error) {
      console.error(error);
      showContactStatus("Nie udało się odsłonić kontaktu. Odśwież weryfikację i spróbuj ponownie.", "error");
      window.turnstile?.reset(turnstileWidget);
    }
  }

  populateServices();
  initMap();

  const params = new URLSearchParams(location.search);
  cityInput.value = params.get("city") ?? "";
  const requestedService = params.get("service") ?? "";
  if (app.serviceById[requestedService]) serviceSelect.value = requestedService;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    search();
  });
  document.getElementById("closeDialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", resetContactDialog);

  if (!client) {
    configNotice.classList.remove("hidden");
    summary.textContent = "Katalog czeka na konfigurację połączenia z bazą danych.";
    return;
  }
  search();
})();
