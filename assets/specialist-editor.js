(function () {
  "use strict";

  const app = window.Kancelio;
  const client = app.getClient();
  const $ = (id) => document.getElementById(id);
  let session = null;
  let authMode = "login";
  let profileId = null;
  let currentCoordinates = { latitude: null, longitude: null };

  function notice(message, type = "") { const box = $("specialistEditorNotice"); box.textContent = message; box.className = `notice ${type}`.trim(); }
  function hideNotice() { $("specialistEditorNotice").className = "notice hidden"; }
  function checkbox(container, name, value, label) {
    const option = document.createElement("label"); option.className = "check-option";
    const input = document.createElement("input"); input.type = "checkbox"; input.name = name; input.value = value;
    const span = document.createElement("span"); span.textContent = label; option.append(input, span); container.append(option);
  }
  function initOptions() {
    app.specialistProfessions.filter(({ id }) => id !== "notary").forEach(({ id, label }) => $("profileProfession").append(new Option(label, id)));
    app.caseTypes.forEach(({ id, label }) => checkbox($("profileCaseTypes"), "caseTypes", id, label));
    app.caseStages.forEach(({ id, label }) => checkbox($("profileStages"), "stages", id, label));
  }
  function selected(name) { return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value); }
  function setSelected(name, values) { const set = new Set(values || []); document.querySelectorAll(`input[name="${name}"]`).forEach((input) => { input.checked = set.has(input.value); }); }
  function setAuthMode(mode) {
    authMode = mode; const signup = mode === "signup";
    $("specialistLoginMode").classList.toggle("active", !signup); $("specialistSignupMode").classList.toggle("active", signup);
    $("specialistAuthPassword").autocomplete = signup ? "new-password" : "current-password";
    $("specialistAuthSubmit").textContent = signup ? "Załóż konto" : "Zaloguj się";
    $("specialistAuthTitle").textContent = signup ? "Załóż konto specjalisty" : "Zaloguj się do swojego profilu"; hideNotice();
  }
  function redirectUrl() { return new URL("/dla-specjalistow.html#profil", location.origin).href; }
  function populate(profile, contact) {
    $("profileName").value = profile?.name || ""; $("profileProfession").value = profile?.profession || ""; $("profileCity").value = profile?.city || "";
    $("profileWebsite").value = profile?.website || ""; $("profileBio").value = profile?.bio || ""; $("profileServices").value = (profile?.services || []).join(", ");
    $("profileRemote").checked = Boolean(profile?.remote_available); $("profilePublished").checked = profile ? profile.is_published : true;
    setSelected("caseTypes", profile?.case_types); setSelected("stages", profile?.stages);
    $("profileEmail").value = contact?.email || session?.user?.email || ""; $("profilePhone").value = contact?.phone || ""; $("profileAddress").value = contact?.street_address || ""; $("profilePostalCode").value = contact?.postal_code || "";
    currentCoordinates = { latitude: profile?.public_latitude ?? null, longitude: profile?.public_longitude ?? null };
  }
  function renderModeration(profile) {
    const box = $("specialistModerationStatus"); box.replaceChildren();
    if (!profile) { box.className = "owner-verification hidden"; return; }
    const status = profile.moderation_status || "pending"; box.className = `owner-verification ${status}`;
    if (status === "verified") {
      box.append("Profil zweryfikowany. Jest widoczny w katalogu, gdy publikacja jest włączona. ");
      if (profile.slug) { const link = document.createElement("a"); link.href = `/specjalista/${encodeURIComponent(profile.slug)}`; link.textContent = "Zobacz publiczny profil →"; box.append(link); }
    } else if (status === "rejected") {
      box.textContent = `Profil wymaga poprawy przed publikacją.${profile.moderation_note ? ` Powód: ${profile.moderation_note}` : ""}`;
    } else box.textContent = "Profil czeka na weryfikację Kancelio. Po akceptacji pojawi się w publicznym katalogu.";
  }
  async function loadProfile() {
    const { data: profile, error } = await client.from("specialist_profiles").select("id,slug,name,profession,city,bio,services,case_types,stages,website,remote_available,public_latitude,public_longitude,is_published,moderation_status,moderation_note,verified_at").maybeSingle();
    if (error) { notice("Nie udało się pobrać profilu. Zastosuj migrację modułu specjalistów.", "error"); return; }
    profileId = profile?.id || null;
    let contact = null;
    if (profileId) { const result = await client.from("specialist_contacts").select("street_address,postal_code,email,phone").eq("profile_id", profileId).maybeSingle(); if (!result.error) contact = result.data; }
    populate(profile, contact); renderModeration(profile); $("specialistEditorTitle").textContent = profileId ? "Edytuj profil specjalisty" : "Uzupełnij profil specjalisty"; $("specialistDanger").classList.toggle("hidden", !profileId);
  }
  async function setSession(nextSession) {
    session = nextSession; document.body.classList.toggle("specialist-signed-in", Boolean(session)); $("specialistAuth").classList.toggle("hidden", Boolean(session)); $("specialistEditor").classList.toggle("hidden", !session); $("specialistAccountEmail").textContent = session?.user?.email || "";
    if (session) await loadProfile();
  }
  function parseServices() { return [...new Set($("profileServices").value.split(",").map((value) => value.trim()).filter(Boolean))].slice(0, 12); }
  async function locate() {
    const query = [$("profileAddress").value.trim(), $("profilePostalCode").value.trim(), $("profileCity").value.trim()].filter(Boolean).join(", ");
    if (!query) return currentCoordinates;
    try { const match = await app.searchPolishAddress(query); if (!match) return currentCoordinates; return { latitude: Math.round(Number(match.lat) * 1000) / 1000, longitude: Math.round(Number(match.lon) * 1000) / 1000 }; }
    catch (_error) { return currentCoordinates; }
  }
  async function saveProfile(event) {
    event.preventDefault(); hideNotice(); if (!$("specialistProfileForm").reportValidity()) return;
    const caseTypes = selected("caseTypes"); const stages = selected("stages"); const services = parseServices();
    if (!caseTypes.length || !stages.length || !services.length) { notice("Wybierz co najmniej jedną sprawę, etap i usługę.", "error"); return; }
    $("saveSpecialistProfile").disabled = true; const coordinates = await locate();
    const profile = { owner_id: session.user.id, name: $("profileName").value.trim(), profession: $("profileProfession").value, city: $("profileCity").value.trim(), bio: $("profileBio").value.trim() || null, services, case_types: caseTypes, stages, website: app.safeWebsite($("profileWebsite").value.trim()), remote_available: $("profileRemote").checked, public_latitude: coordinates.latitude, public_longitude: coordinates.longitude, is_published: $("profilePublished").checked };
    const result = await client.from("specialist_profiles").upsert(profile, { onConflict: "owner_id" }).select("id").single();
    if (result.error) { $("saveSpecialistProfile").disabled = false; notice("Nie udało się zapisać profilu. Sprawdź pola i migrację bazy.", "error"); return; }
    profileId = result.data.id; currentCoordinates = coordinates;
    const contact = { profile_id: profileId, street_address: $("profileAddress").value.trim() || null, postal_code: $("profilePostalCode").value.trim() || null, email: $("profileEmail").value.trim(), phone: $("profilePhone").value.trim() || null };
    const contactResult = await client.from("specialist_contacts").upsert(contact, { onConflict: "profile_id" });
    $("saveSpecialistProfile").disabled = false;
    if (contactResult.error) { notice("Profil zapisano, ale nie udało się zapisać danych kontaktowych.", "error"); return; }
    $("specialistDanger").classList.remove("hidden"); $("specialistEditorTitle").textContent = "Edytuj profil specjalisty";
    notice(profile.is_published ? "Profil został zapisany i przekazany do weryfikacji." : "Profil zapisano jako ukryty.", "success"); window.KancelioAnalytics?.track("specialist_profile_saved", { profession: profile.profession }); await loadProfile();
  }

  initOptions(); setAuthMode("login");
  $("specialistLoginMode").addEventListener("click", () => setAuthMode("login")); $("specialistSignupMode").addEventListener("click", () => setAuthMode("signup"));
  if (!client) { notice("Panel specjalisty wymaga konfiguracji Supabase.", "error"); $("specialistAuth").querySelectorAll("input,button").forEach((control) => { control.disabled = true; }); return; }
  $("specialistAuthForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const email = $("specialistAuthEmail").value.trim(); const password = $("specialistAuthPassword").value; $("specialistAuthSubmit").disabled = true;
    try { if (authMode === "signup") { const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl() } }); if (error) throw error; if (!data.session) notice("Konto utworzone. Potwierdź adres przez wiadomość e-mail.", "success"); } else { const { error } = await client.auth.signInWithPassword({ email, password }); if (error) throw error; } $("specialistAuthPassword").value = ""; }
    catch (_error) { notice("Nie udało się zalogować lub utworzyć konta. Sprawdź dane.", "error"); } finally { $("specialistAuthSubmit").disabled = false; }
  });
  $("specialistGoogleLogin").addEventListener("click", async () => { const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectUrl() } }); if (error) notice("Nie udało się rozpocząć logowania przez Google.", "error"); });
  $("specialistProfileForm").addEventListener("submit", saveProfile);
  $("deleteSpecialistProfile").addEventListener("click", async () => {
    if (!profileId || !window.confirm("Usunąć profil specjalisty i dane kontaktowe? Tej operacji nie można cofnąć.")) return;
    $("deleteSpecialistProfile").disabled = true; const { error } = await client.from("specialist_profiles").delete().eq("id", profileId); $("deleteSpecialistProfile").disabled = false;
    if (error) { notice("Nie udało się usunąć profilu.", "error"); return; }
    profileId = null; populate(null, null); renderModeration(null); $("specialistDanger").classList.add("hidden"); $("specialistEditorTitle").textContent = "Uzupełnij profil specjalisty"; notice("Profil został usunięty z katalogu.", "success");
  });
  client.auth.getSession().then(({ data, error }) => { if (error) notice("Nie udało się odczytać sesji.", "error"); setSession(data.session); }); client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
})();
