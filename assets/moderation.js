(function () {
  "use strict";

  const app = window.Kancelio;
  const client = app.getClient();
  const $ = (id) => document.getElementById(id);
  let session = null;

  function notice(message, type = "") { $("moderationNotice").textContent = message; $("moderationNotice").className = `notice ${type}`.trim(); }
  function clearNotice() { $("moderationNotice").textContent = ""; $("moderationNotice").className = "notice hidden"; }
  function text(tag, value, className) { const node = document.createElement(tag); if (value != null) node.textContent = value; if (className) node.className = className; return node; }
  function statusLabel(status) { return ({ pending: "Oczekuje", verified: "Zweryfikowany", rejected: "Odrzucony" })[status] || status; }

  function renderReadiness(rows) {
    if (!rows.length) { $("readinessGrid").replaceChildren(text("div", "Żadne miasto nie ma jeszcze zweryfikowanych profili.", "empty")); return; }
    $("readinessGrid").replaceChildren(...rows.map((row) => {
      const card = text("article", null, `readiness-card${row.is_ready ? " ready" : ""}`);
      card.append(text("h3", row.city), text("div", `${row.verified_profiles} / ${row.target_profiles}`, "readiness-score"));
      card.append(text("p", `${row.verified_professions} ${Number(row.verified_professions) === 1 ? "specjalizacja" : "specjalizacji"} · ${row.is_ready ? "próg kampanii osiągnięty" : "jeszcze nie promujemy lokalnie"}`));
      const bar = text("div", null, "readiness-bar"); const fill = document.createElement("span"); fill.style.width = `${Math.min(100, Number(row.verified_profiles) / Number(row.target_profiles) * 100)}%`; bar.append(fill); card.append(bar); return card;
    }));
  }

  async function moderate(profile, status, note, button) {
    button.disabled = true;
    const { error } = await client.rpc("admin_set_directory_moderation", { p_source_type: profile.source_type, p_id: profile.id, p_status: status, p_note: note || null });
    button.disabled = false;
    if (error) { notice("Nie udało się zmienić statusu profilu.", "error"); return; }
    notice(status === "verified" ? "Profil został zweryfikowany i może pojawić się w katalogu." : status === "rejected" ? "Profil został odrzucony." : "Profil wrócił do kolejki.", "success");
    await loadDashboard();
  }

  function renderProfile(profile) {
    const card = text("article", null, "moderation-card");
    const head = text("div", null, "moderation-card-head"); const identity = document.createElement("div");
    identity.append(text("h3", profile.name), text("div", `${app.specialistProfessionById[profile.profession]?.label || profile.profession} · ${profile.city} · aktualizacja ${new Date(profile.updated_at).toLocaleDateString("pl-PL")}`, "moderation-meta"));
    head.append(identity, text("span", statusLabel(profile.moderation_status), `moderation-status ${profile.moderation_status}`)); card.append(head);
    if (profile.bio) card.append(text("p", profile.bio, "moderation-meta"));
    card.append(text("div", `Kontakt: ${profile.contact_email || "brak e-maila"}${profile.contact_phone ? ` · ${profile.contact_phone}` : ""}${profile.contact_address ? ` · ${profile.contact_address}` : ""}`, "moderation-meta"));
    const services = text("div", null, "moderation-services"); (profile.services || []).forEach((service) => services.append(text("span", app.serviceById[service]?.label || service))); card.append(services);
    const note = document.createElement("textarea"); note.className = "moderation-note"; note.maxLength = 800; note.placeholder = "Notatka dla właściciela profilu (wymagana przy odrzuceniu)"; note.value = profile.moderation_note || ""; card.append(note);
    const actions = text("div", null, "moderation-actions");
    if (profile.moderation_status === "verified") { const publicLink = text("a", "Otwórz publiczny profil →"); publicLink.href = `/specjalista/${encodeURIComponent(profile.slug)}`; publicLink.target = "_blank"; publicLink.rel = "noopener"; actions.append(publicLink); }
    const verify = text("button", "Zweryfikuj", "button small"); verify.type = "button"; verify.addEventListener("click", () => moderate(profile, "verified", note.value.trim(), verify));
    const reject = text("button", "Odrzuć", "button secondary danger small"); reject.type = "button"; reject.addEventListener("click", () => { if (!note.value.trim()) { notice("Przy odrzuceniu wpisz powód w notatce.", "error"); note.focus(); return; } moderate(profile, "rejected", note.value.trim(), reject); });
    const pending = text("button", "Do ponownej weryfikacji", "button secondary small"); pending.type = "button"; pending.addEventListener("click", () => moderate(profile, "pending", note.value.trim(), pending));
    actions.append(verify, reject, pending); card.append(actions); return card;
  }

  async function loadDashboard() {
    clearNotice(); const status = $("moderationStatus").value || null; const city = $("moderationCity").value.trim() || null;
    const [profilesResult, readinessResult] = await Promise.all([
      client.rpc("admin_list_directory_profiles", { p_status: status }),
      client.rpc("admin_directory_readiness", { p_city: city }),
    ]);
    if (profilesResult.error || readinessResult.error) { notice("Nie udało się pobrać kolejki. Sprawdź migrację i uprawnienia administratora.", "error"); return; }
    const profiles = profilesResult.data || []; $("moderationSummary").textContent = `Profile w wybranym statusie: ${profiles.length}.`;
    $("moderationList").replaceChildren(...(profiles.length ? profiles.map(renderProfile) : [text("div", "Kolejka jest pusta.", "empty")])); renderReadiness(readinessResult.data || []);
  }

  async function setSession(nextSession) {
    session = nextSession; $("moderationAuth").classList.toggle("hidden", Boolean(session)); $("moderationDenied").classList.add("hidden"); $("moderationDashboard").classList.add("hidden");
    if (!session) return;
    const { data, error } = await client.rpc("is_platform_admin");
    if (error || !data) { $("moderationDenied").classList.remove("hidden"); return; }
    $("moderationDashboard").classList.remove("hidden"); await loadDashboard();
  }

  if (!client) { notice("Panel wymaga konfiguracji Supabase.", "error"); $("moderationAuth").querySelectorAll("input,button").forEach((control) => { control.disabled = true; }); return; }
  $("moderationAuthForm").addEventListener("submit", async (event) => { event.preventDefault(); const { error } = await client.auth.signInWithPassword({ email: $("moderationEmail").value.trim(), password: $("moderationPassword").value }); if (error) notice("Nie udało się zalogować.", "error"); });
  $("moderationGoogleLogin").addEventListener("click", async () => { const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/moderacja.html` } }); if (error) notice("Nie udało się rozpocząć logowania przez Google.", "error"); });
  $("moderationFilters").addEventListener("submit", (event) => { event.preventDefault(); loadDashboard(); });
  client.auth.getSession().then(({ data }) => setSession(data.session)); client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
})();
