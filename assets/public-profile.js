(function () {
  "use strict";

  const app = window.Kancelio;
  const client = app.getClient();
  const $ = (id) => document.getElementById(id);
  let profile = null;
  let widget = null;

  function slugFromLocation() {
    const match = location.pathname.match(/^\/specjalista\/([a-z0-9-]+)\/?$/i);
    return match ? decodeURIComponent(match[1]) : new URLSearchParams(location.search).get("slug");
  }
  function notice(message, type = "") { $("publicProfileNotice").textContent = message; $("publicProfileNotice").className = `notice ${type}`.trim(); }
  function tagList(container, values, labels) { container.replaceChildren(...(values || []).map((value) => { const tag = document.createElement("span"); tag.textContent = labels[value]?.label || value; return tag; })); }
  function setMeta(profileData) {
    const profession = app.specialistProfessionById[profileData.profession]?.label || profileData.profession;
    const title = `${profileData.name} — ${profession}, ${profileData.city} | Kancelio.pl`;
    const description = `${profileData.name}: zweryfikowany ${profession.toLowerCase()} w mieście ${profileData.city}. Sprawdź usługi, obsługiwane sprawy i chronione dane kontaktowe.`;
    document.title = title; document.querySelector('meta[name="description"]').content = description; $("profileOgTitle").content = title; $("profileOgDescription").content = description;
    const canonical = `https://kancelio.pl/specjalista/${encodeURIComponent(profileData.slug)}`; $("profileCanonical").href = canonical;
    const structured = document.createElement("script"); structured.type = "application/ld+json"; structured.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "ProfessionalService", name: profileData.name,
      description: profileData.bio || description, url: canonical, areaServed: profileData.city,
      address: { "@type": "PostalAddress", addressLocality: profileData.city, addressCountry: "PL" },
      serviceType: profileData.services || [], sameAs: app.safeWebsite(profileData.website) ? [app.safeWebsite(profileData.website)] : undefined,
    }); document.head.append(structured);
    const breadcrumb = document.createElement("script"); breadcrumb.type = "application/ld+json"; breadcrumb.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Kancelio.pl", item: "https://kancelio.pl/" },
      { "@type": "ListItem", position: 2, name: "Specjaliści", item: "https://kancelio.pl/specjalisci.html" },
      { "@type": "ListItem", position: 3, name: profileData.name, item: canonical },
    ] }); document.head.append(breadcrumb);
  }
  function initMap(profileData) {
    if (!window.L || profileData.public_latitude == null || profileData.public_longitude == null) { $("publicProfileMap").classList.add("hidden"); return; }
    const point = [profileData.public_latitude, profileData.public_longitude]; const map = window.L.map("publicProfileMap", { scrollWheelZoom: false }).setView(point, 12);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    window.L.marker(point, { icon: app.mapPinIcon(profileData.source_type === "notary" ? "office" : "specialist") }).addTo(map).bindPopup(`${profileData.name}<br><small>Punkt przybliżony</small>`).openPopup();
  }
  function render(profileData) {
    profile = profileData; const profession = app.specialistProfessionById[profileData.profession]?.label || profileData.profession;
    $("publicProfileName").textContent = profileData.name; $("publicProfileLead").textContent = `${profession} · ${profileData.city}`; $("publicProfileCity").textContent = profileData.city;
    $("publicProfileBio").textContent = profileData.bio || `${profileData.name} wspiera klientów w sprawach i etapach wskazanych poniżej.`;
    $("publicProfileVerifiedAt").textContent = profileData.verified_at ? `Zweryfikowano ${new Date(profileData.verified_at).toLocaleDateString("pl-PL")}` : "Zweryfikowano przez Kancelio";
    tagList($("publicProfileServices"), profileData.services, app.serviceById); tagList($("publicProfileCases"), profileData.case_types, app.caseTypeById); tagList($("publicProfileStages"), profileData.stages, app.caseStageById);
    $("publicProfileRemote").classList.toggle("hidden", !profileData.remote_available); const website = app.safeWebsite(profileData.website); $("publicProfileWebsite").classList.toggle("hidden", !website); if (website) $("publicProfileWebsite").href = website;
    $("publicProfile").classList.remove("hidden"); setMeta(profileData); initMap(profileData); window.KancelioAnalytics?.track("specialist_profile_view", { profession: profileData.profession, source_type: profileData.source_type });
  }
  function contactLine(label, value, href) { if (!value) return; const row = document.createElement("div"); row.className = "contact-line"; const caption = document.createElement("small"); caption.textContent = label; row.append(caption); if (href) { const link = document.createElement("a"); link.href = href; link.textContent = value; row.append(link); } else row.append(document.createTextNode(value)); $("publicProfileContactDetails").append(row); }
  function contactStatus(message, type = "") { $("publicProfileContactStatus").textContent = message; $("publicProfileContactStatus").className = `notice ${type}`.trim(); }
  async function reveal(token) {
    const notary = profile.source_type === "notary"; const endpoint = notary ? "reveal-office-contact" : "reveal-specialist-contact"; const body = notary ? { officeId: profile.id, turnstileToken: token } : { profileId: profile.id, turnstileToken: token };
    try { const response = await fetch(`${app.config.supabaseUrl}/functions/v1/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: app.config.supabasePublishableKey }, body: JSON.stringify(body) }); if (!response.ok) throw new Error("Unavailable"); const { contact } = await response.json(); $("publicProfileContactDetails").replaceChildren(); contactLine("Adres", [contact.street_address, contact.postal_code, profile.city].filter(Boolean).join(", ")); contactLine("E-mail", contact.email, `mailto:${contact.email}`); contactLine("Telefon", contact.phone, contact.phone ? `tel:${contact.phone.replace(/\s+/g, "")}` : null); $("publicProfileContactDetails").classList.remove("hidden"); $("publicProfileContactStatus").className = "notice hidden"; window.KancelioAnalytics?.track("specialist_contact_revealed", { profession: profile.profession, source_type: profile.source_type }); }
    catch (_error) { contactStatus("Nie udało się odsłonić kontaktu. Spróbuj ponownie.", "error"); }
  }
  function openContact() {
    $("publicProfileContactTitle").textContent = profile.name; $("publicProfileContactDialog").showModal(); $("publicProfileContactDetails").classList.add("hidden"); $("publicProfileContactDetails").replaceChildren(); $("publicProfileContactStatus").className = "notice hidden";
    const siteKey = app.config.turnstileSiteKey; if (!window.turnstile || !siteKey || siteKey.startsWith("${")) { contactStatus("Weryfikacja antybotowa nie jest skonfigurowana.", "error"); return; }
    const action = profile.source_type === "notary" ? "reveal_contact" : "reveal_specialist_contact"; widget = window.turnstile.render($("publicProfileTurnstile"), { sitekey: siteKey, action, callback: reveal, "error-callback": () => contactStatus("Nie udało się wykonać weryfikacji.", "error") });
  }
  function closeContact() { $("publicProfileContactDialog").close(); if (widget != null && window.turnstile) window.turnstile.remove(widget); widget = null; $("publicProfileTurnstile").replaceChildren(); }
  async function init() {
    const slug = slugFromLocation(); if (!client || !slug) { notice("Nie znaleziono profilu. Wróć do wyszukiwarki specjalistów.", "error"); return; }
    const { data, error } = await client.rpc("get_public_specialist_profile", { p_slug: slug }); const profileData = data?.[0]; if (error || !profileData) { notice("Profil nie jest dostępny lub oczekuje na weryfikację.", "error"); $("publicProfileName").textContent = "Profil niedostępny"; $("publicProfileLead").textContent = "Wróć do katalogu, aby zobaczyć zweryfikowanych specjalistów."; return; } render(profileData);
  }
  $("publicProfileContact").addEventListener("click", openContact); $("closePublicProfileDialog").addEventListener("click", closeContact); $("publicProfileContactDialog").addEventListener("cancel", (event) => { event.preventDefault(); closeContact(); }); init();
})();
