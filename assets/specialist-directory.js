(function () {
  "use strict";

  const app = window.Kancelio;
  const client = app.getClient();
  const $ = (id) => document.getElementById(id);
  let map;
  let markerLayer;
  let searchedPoint = null;
  let turnstileWidget = null;
  let activeProfile = null;

  function addOptions(select, values) {
    values.forEach(({ id, label }) => select.append(new Option(label, id)));
  }
  function initFilters() {
    addOptions($("specialistCase"), app.caseTypes);
    addOptions($("specialistProfession"), app.specialistProfessions);
    addOptions($("specialistStage"), app.caseStages);
    const params = new URLSearchParams(location.search);
    $("specialistCity").value = params.get("city") || "";
    if (app.caseTypeById[params.get("case")]) $("specialistCase").value = params.get("case");
    if (app.specialistProfessionById[params.get("profession")]) $("specialistProfession").value = params.get("profession");
    if (app.caseStageById[params.get("stage")]) $("specialistStage").value = params.get("stage");
    updateContext();
  }
  function updateContext() {
    const caseType = app.caseTypeById[$("specialistCase").value]?.label;
    const profession = app.specialistProfessionById[$("specialistProfession").value]?.label;
    const stage = app.caseStageById[$("specialistStage").value]?.label;
    const parts = [caseType, stage, profession].filter(Boolean);
    $("contextHint").classList.toggle("hidden", !parts.length);
    $("contextHint").textContent = parts.length ? `Szukasz w kontekście: ${parts.join(" · ")}. Wyniki możesz dalej zawęzić albo zmienić etap procesu.` : "";
  }
  function initMap() {
    if (!window.L) return;
    map = window.L.map("specialistMap").setView([52.0693, 19.4803], 6);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    markerLayer = window.L.featureGroup().addTo(map);
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }
  function distanceKm(from, profile) {
    if (profile.public_latitude == null || profile.public_longitude == null) return Number.POSITIVE_INFINITY;
    const radians = (degrees) => degrees * Math.PI / 180;
    const latDelta = radians(profile.public_latitude - from.lat);
    const lngDelta = radians(profile.public_longitude - from.lng);
    const a = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(profile.public_latitude)) * Math.sin(lngDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  async function geocode(query) {
    if (!query) return null;
    const match = await app.searchPolishAddress(query);
    if (!match) return null;
    const address = match.address || {};
    return { lat: Number(match.lat), lng: Number(match.lon), city: address.city || address.town || address.village || address.municipality || query };
  }
  function updateMap(profiles) {
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    const points = [];
    if (searchedPoint) {
      const point = [searchedPoint.lat, searchedPoint.lng];
      window.L.marker(point, { icon: app.mapPinIcon("search") }).bindPopup("<strong>Szukana lokalizacja</strong>").addTo(markerLayer);
      points.push(point);
    }
    profiles.forEach((profile) => {
      if (profile.public_latitude == null || profile.public_longitude == null) return;
      const point = [profile.public_latitude, profile.public_longitude];
      window.L.marker(point, { icon: app.mapPinIcon(profile.source_type === "notary" ? "office" : "specialist") })
        .bindPopup(`<strong>${escapeHtml(profile.name)}</strong><br>${escapeHtml(app.specialistProfessionById[profile.profession]?.label || profile.profession)}<br>${escapeHtml(profile.city)}`)
        .addTo(markerLayer);
      points.push(point);
    });
    if (points.length === 1) map.setView(points[0], searchedPoint ? 13 : 11);
    else if (points.length > 1) map.fitBounds(markerLayer.getBounds(), { padding: [30, 30], maxZoom: 12 });
    else map.setView([52.0693, 19.4803], 6);
  }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function renderProfile(profile) {
    const card = element("article", null, "specialist-card");
    const head = element("div", null, "specialist-card-head");
    const identity = document.createElement("div");
    identity.append(element("h2", profile.name), element("div", profile.city, "office-city"));
    if (Number.isFinite(profile.distanceKm)) identity.append(element("div", profile.distanceKm < 1 ? `${Math.round(profile.distanceKm * 1000)} m od szukanego miejsca` : `${profile.distanceKm.toFixed(1)} km od szukanego miejsca`, "office-distance"));
    const badges = element("div", null, "specialist-badges"); badges.append(element("span", app.specialistProfessionById[profile.profession]?.label || profile.profession, "profession-badge"));
    if (profile.is_verified) badges.append(element("span", "✓ Zweryfikowany", "verified-badge-small"));
    head.append(identity, badges);
    card.append(head);
    if (profile.bio) card.append(element("p", profile.bio, "specialist-bio"));
    const services = element("div", null, "tags");
    (profile.services || []).slice(0, 8).forEach((service) => services.append(element("span", app.serviceById[service]?.label || service, "tag")));
    card.append(services);
    const stages = element("div", null, "stage-tags");
    (profile.stages || []).forEach((stage) => stages.append(element("span", app.caseStageById[stage]?.label || stage, "stage-tag")));
    card.append(stages);
    if (profile.remote_available) card.append(element("div", "Możliwa obsługa zdalna", "remote-note"));
    const actions = element("div", null, "card-actions");
    if (profile.slug) { const profileLink = element("a", "Zobacz profil", "button secondary small"); profileLink.href = `/specjalista/${encodeURIComponent(profile.slug)}`; actions.append(profileLink); }
    const contact = element("button", "Pokaż kontakt", "button gold small"); contact.type = "button"; contact.addEventListener("click", () => openContact(profile)); actions.append(contact);
    const website = app.safeWebsite(profile.website);
    if (website) { const link = element("a", "Strona specjalisty", "button secondary small"); link.href = website; link.target = "_blank"; link.rel = "noopener noreferrer"; actions.append(link); }
    card.append(actions);
    return card;
  }
  function updateUrl() {
    const params = new URLSearchParams();
    if ($("specialistCity").value.trim()) params.set("city", $("specialistCity").value.trim());
    if ($("specialistCase").value) params.set("case", $("specialistCase").value);
    if ($("specialistProfession").value) params.set("profession", $("specialistProfession").value);
    if ($("specialistStage").value) params.set("stage", $("specialistStage").value);
    history.replaceState({}, "", `${location.pathname}${params.size ? `?${params}` : ""}`);
  }
  async function search() {
    if (!client) { $("specialistConfigNotice").classList.remove("hidden"); return; }
    $("specialistConfigNotice").classList.add("hidden");
    $("specialistSummary").textContent = "Szukamy pasujących specjalistów…";
    let city = $("specialistCity").value.trim(); searchedPoint = null;
    try { if (city) { searchedPoint = await geocode(city); if (searchedPoint) city = searchedPoint.city; } } catch (_error) { $("specialistSummary").textContent = "Nie udało się rozpoznać adresu. Szukamy po wpisanej nazwie miasta."; }
    const { data, error } = await client.rpc("search_specialists", { p_city: city || null, p_profession: $("specialistProfession").value || null, p_case_type: $("specialistCase").value || null, p_stage: $("specialistStage").value || null });
    if (error) { $("specialistConfigNotice").classList.remove("hidden"); $("specialistSummary").textContent = "Nie udało się pobrać wyników. Sprawdź migrację modułu specjalistów."; updateMap([]); return; }
    const profiles = (data || []).map((profile) => ({ ...profile, distanceKm: searchedPoint ? distanceKm(searchedPoint, profile) : null })).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    $("specialistSummary").textContent = profiles.length ? `Znaleziono ${profiles.length} ${profiles.length === 1 ? "profil" : "profili"}.${searchedPoint ? " Najbliższe wyniki są pokazane jako pierwsze." : ""}` : "Brak profili dla tych kryteriów. Zmień etap, specjalizację albo obszar.";
    $("specialistResults").replaceChildren(...(profiles.length ? profiles.map(renderProfile) : [element("div", "Nie znaleźliśmy jeszcze pasującego specjalisty. Możesz poszerzyć kryteria lub wrócić później — katalog jest rozwijany.", "empty")]));
    updateMap(profiles); updateUrl(); updateContext();
    window.KancelioAnalytics?.track("specialist_search", { case_type: $("specialistCase").value || "all", profession: $("specialistProfession").value || "all", stage: $("specialistStage").value || "all" });
  }
  function resetDialog() {
    $("specialistContactStatus").className = "notice hidden"; $("specialistContactStatus").textContent = ""; $("specialistContactDetails").classList.add("hidden"); $("specialistContactDetails").replaceChildren();
    if (turnstileWidget != null && window.turnstile) { window.turnstile.remove(turnstileWidget); turnstileWidget = null; }
    $("specialistTurnstileSlot").replaceChildren();
  }
  function openContact(profile) {
    activeProfile = profile; resetDialog(); $("specialistContactTitle").textContent = profile.name; $("specialistContactDialog").showModal();
    const siteKey = app.config.turnstileSiteKey;
    if (!window.turnstile || !siteKey || siteKey.startsWith("${")) { showContactStatus("Weryfikacja antybotowa nie jest skonfigurowana.", "error"); return; }
    const action = profile.source_type === "notary" ? "reveal_contact" : "reveal_specialist_contact";
    turnstileWidget = window.turnstile.render($("specialistTurnstileSlot"), { sitekey: siteKey, action, callback: (token) => revealContact(profile, token), "error-callback": () => showContactStatus("Nie udało się wykonać weryfikacji.", "error") });
  }
  function showContactStatus(message, type = "") { $("specialistContactStatus").textContent = message; $("specialistContactStatus").className = `notice ${type}`.trim(); }
  function contactLine(label, value, href) {
    if (!value) return;
    const line = element("div", null, "contact-line"); line.append(element("small", label));
    if (href) { const link = element("a", value); link.href = href; line.append(link); } else line.append(document.createTextNode(value));
    $("specialistContactDetails").append(line);
  }
  async function revealContact(profile, token) {
    showContactStatus("Pobieramy dane kontaktowe…");
    const isNotary = profile.source_type === "notary";
    const endpoint = isNotary ? "reveal-office-contact" : "reveal-specialist-contact";
    const payload = isNotary ? { officeId: profile.id, turnstileToken: token } : { profileId: profile.id, turnstileToken: token };
    try {
      const response = await fetch(`${app.config.supabaseUrl}/functions/v1/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: app.config.supabasePublishableKey }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Contact unavailable");
      const { contact } = await response.json(); if (!activeProfile || activeProfile.id !== profile.id) return;
      $("specialistContactDetails").replaceChildren();
      contactLine("Adres", [contact.street_address, contact.postal_code, profile.city].filter(Boolean).join(", "));
      contactLine("E-mail", contact.email, `mailto:${contact.email}`); contactLine("Telefon", contact.phone, contact.phone ? `tel:${contact.phone.replace(/\s+/g, "")}` : null);
      $("specialistContactDetails").classList.remove("hidden"); $("specialistContactStatus").className = "notice hidden";
      window.KancelioAnalytics?.track("specialist_contact_revealed", { profession: profile.profession });
    } catch (_error) { showContactStatus("Nie udało się odsłonić kontaktu. Odśwież stronę i spróbuj ponownie.", "error"); }
  }

  initFilters(); initMap();
  $("specialistSearchForm").addEventListener("submit", (event) => { event.preventDefault(); search(); });
  ["specialistCase", "specialistProfession", "specialistStage"].forEach((id) => $(id).addEventListener("change", updateContext));
  $("closeSpecialistDialog").addEventListener("click", () => $("specialistContactDialog").close());
  $("specialistContactDialog").addEventListener("close", () => { activeProfile = null; resetDialog(); });
  search();
})();
