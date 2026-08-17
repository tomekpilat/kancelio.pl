(function () {
  "use strict";

  const app = window.Kancelio;
  const client = app.getClient();
  const form = document.getElementById("officeForm");
  const profileSection = document.getElementById("profil");
  const publicHeader = document.getElementById("publicHeader");
  const dashboardHeader = document.getElementById("dashboardHeader");
  const publicBenefits = document.getElementById("publicBenefits");
  const publicProfileIntro = document.getElementById("publicProfileIntro");
  const authPanel = document.getElementById("authPanel");
  const configNotice = document.getElementById("configNotice");
  const signedOutActions = document.getElementById("signedOutActions");
  const accountEmail = document.getElementById("accountEmail");
  const authTitle = document.getElementById("authTitle");
  const authDescription = document.getElementById("authDescription");
  const emailAuthForm = document.getElementById("emailAuthForm");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const emailAuthSubmit = document.getElementById("emailAuthSubmit");
  const authStatus = document.getElementById("authStatus");
  const loginMode = document.getElementById("loginMode");
  const signupMode = document.getElementById("signupMode");
  const googleLogin = document.getElementById("googleLogin");
  const status = document.getElementById("formStatus");
  const saveButton = document.getElementById("saveOffice");
  const cityInput = document.getElementById("officeCity");
  const emailInput = document.getElementById("officeEmail");
  const coordinateLabel = document.getElementById("mapCoordinates");
  const editorTitle = document.getElementById("editorTitle");

  const cityCenters = {
    warszawa: [52.2297, 21.0122], krakow: [50.0647, 19.945], lodz: [51.7592, 19.456],
    wroclaw: [51.1079, 17.0385], poznan: [52.4064, 16.9252], gdansk: [54.352, 18.6466],
    szczecin: [53.4285, 14.5528], bydgoszcz: [53.1235, 18.0084], lublin: [51.2465, 22.5684],
    bialystok: [53.1325, 23.1688], katowice: [50.2649, 19.0238], gdynia: [54.5189, 18.5305],
    czestochowa: [50.8118, 19.1203], radom: [51.4027, 21.1471], torun: [53.0138, 18.5984],
    rzeszow: [50.0412, 21.9991], kielce: [50.8661, 20.6286], olsztyn: [53.7784, 20.4801],
    opole: [50.6751, 17.9213], zielonagora: [51.9356, 15.5062],
  };

  let session = null;
  let officeId = null;
  let map = null;
  let marker = null;
  let coordinates = null;
  let loadedUserId = null;
  let emailAuthMode = "login";

  function normalize(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").toLowerCase();
  }

  function renderServices() {
    const container = document.getElementById("serviceOptions");
    app.services.forEach((service) => {
      const label = document.createElement("label");
      label.className = "service-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "services";
      input.value = service.id;
      const text = document.createElement("span");
      text.textContent = service.label;
      label.append(input, text);
      container.append(label);
    });
  }

  function showStatus(message, type = "") {
    status.textContent = message;
    status.className = `notice ${type}`.trim();
  }

  function hideStatus() {
    status.className = "notice hidden";
    status.textContent = "";
  }

  function showAuthStatus(message, type = "") {
    authStatus.textContent = message;
    authStatus.className = `notice ${type}`.trim();
  }

  function hideAuthStatus() {
    authStatus.textContent = "";
    authStatus.className = "notice hidden";
  }

  function setEmailAuthMode(mode) {
    emailAuthMode = mode;
    const signingUp = mode === "signup";
    loginMode.classList.toggle("active", !signingUp);
    loginMode.setAttribute("aria-pressed", String(!signingUp));
    signupMode.classList.toggle("active", signingUp);
    signupMode.setAttribute("aria-pressed", String(signingUp));
    authPassword.setAttribute("autocomplete", signingUp ? "new-password" : "current-password");
    emailAuthSubmit.textContent = signingUp ? "Załóż konto" : "Zaloguj się";
    authTitle.textContent = signingUp ? "Utwórz konto kancelarii" : "Zaloguj się, aby rozpocząć";
    authDescription.textContent = signingUp
      ? "Podaj e-mail i ustaw hasło. Link potwierdzający wyślemy na Twoją skrzynkę."
      : "Użyj własnego konta e-mail albo kontynuuj przez Google.";
    hideAuthStatus();
  }

  function setAuthBusy(busy) {
    emailAuthSubmit.disabled = busy;
    googleLogin.disabled = busy;
    loginMode.disabled = busy;
    signupMode.disabled = busy;
  }

  function authErrorMessage(error) {
    const code = error?.code ?? "";
    const message = error?.message ?? "";
    if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
      return "Nieprawidłowy e-mail lub hasło.";
    }
    if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
      return "Najpierw potwierdź adres e-mail, korzystając z wiadomości od Kancelio.";
    }
    if (code === "weak_password" || /password should be at least/i.test(message)) {
      return "Hasło nie spełnia wymagań bezpieczeństwa. Użyj co najmniej 8 znaków.";
    }
    return "Nie udało się wykonać operacji. Sprawdź dane i spróbuj ponownie.";
  }

  function updateCoordinates(lat, lng, center = false) {
    coordinates = [Number(lat.toFixed(5)), Number(lng.toFixed(5))];
    coordinateLabel.textContent = `${coordinates[0]}, ${coordinates[1]} (punkt przybliżony)`;
    if (!marker) marker = window.L.marker(coordinates, { draggable: true }).addTo(map);
    else marker.setLatLng(coordinates);
    if (center) map.setView(coordinates, 12);
    marker.off("dragend").on("dragend", () => {
      const point = marker.getLatLng();
      updateCoordinates(point.lat, point.lng);
    });
  }

  function initMap() {
    if (map || !window.L) return;
    map = window.L.map("officeMap").setView([52.0693, 19.4803], 6);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.on("click", (event) => updateCoordinates(event.latlng.lat, event.latlng.lng));
  }

  function populateForm(office, contact) {
    document.getElementById("officeName").value = office?.name ?? "";
    cityInput.value = office?.city ?? "";
    document.getElementById("officeWebsite").value = office?.website ?? "";
    document.getElementById("officeAddress").value = contact?.street_address ?? "";
    document.getElementById("officePostalCode").value = contact?.postal_code ?? "";
    emailInput.value = contact?.email ?? session?.user?.email ?? "";
    document.getElementById("officePhone").value = contact?.phone ?? "";
    const selected = new Set(office?.services ?? []);
    form.querySelectorAll('input[name="services"]').forEach((input) => {
      input.checked = selected.has(input.value);
    });
    if (office?.public_latitude != null && office?.public_longitude != null) {
      updateCoordinates(office.public_latitude, office.public_longitude, true);
    }
  }

  async function loadOffice() {
    hideStatus();
    const { data: office, error: officeError } = await client
      .from("notary_offices")
      .select("id, name, city, services, website, public_latitude, public_longitude")
      .maybeSingle();
    if (officeError) {
      showStatus("Nie udało się pobrać wizytówki. Spróbuj ponownie.", "error");
      return;
    }

    officeId = office?.id ?? null;
    let contact = null;
    if (officeId) {
      const result = await client
        .from("notary_office_contacts")
        .select("street_address, postal_code, email, phone")
        .eq("office_id", officeId)
        .maybeSingle();
      if (result.error) {
        showStatus("Pobrano wizytówkę, ale nie udało się odczytać chronionych danych.", "error");
      } else {
        contact = result.data;
      }
    }
    populateForm(office, contact);
    saveButton.textContent = officeId ? "Zapisz zmiany" : "Opublikuj wizytówkę";
    editorTitle.textContent = officeId ? "Edytuj profil kancelarii" : "Uzupełnij profil kancelarii";
  }

  function setSession(nextSession) {
    session = nextSession;
    const signedIn = Boolean(session?.user);
    publicHeader.classList.toggle("hidden", signedIn);
    dashboardHeader.classList.toggle("hidden", !signedIn);
    publicBenefits.classList.toggle("hidden", signedIn);
    publicProfileIntro.classList.toggle("hidden", signedIn);
    authPanel.classList.toggle("hidden", signedIn);
    profileSection.classList.toggle("dashboard-section", signedIn);
    signedOutActions.classList.toggle("hidden", signedIn);
    form.classList.toggle("hidden", !signedIn);
    accountEmail.textContent = session?.user?.email ?? "";
    if (!signedIn) setEmailAuthMode(emailAuthMode);
    if (signedIn && loadedUserId !== session.user.id) {
      loadedUserId = session.user.id;
      initMap();
      setTimeout(() => map?.invalidateSize(), 0);
      loadOffice();
    } else if (!signedIn) {
      loadedUserId = null;
    }
  }

  function oauthError() {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return query.get("error_description") || query.get("error") || hash.get("error_description") || hash.get("error");
  }

  renderServices();

  if (!client) {
    if (window.location.protocol === "file:") {
      configNotice.textContent = "Panel nie działa po otwarciu pliku lokalnego. Przejdź do https://kancelio.pl/dla-kancelarii.html.";
    }
    configNotice.classList.remove("hidden");
    signedOutActions.querySelectorAll("button, input").forEach((element) => { element.disabled = true; });
    return;
  }

  loginMode.addEventListener("click", () => setEmailAuthMode("login"));
  signupMode.addEventListener("click", () => setEmailAuthMode("signup"));

  emailAuthForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAuthStatus();
    if (!emailAuthForm.reportValidity()) return;

    setAuthBusy(true);
    try {
      const credentials = { email: authEmail.value.trim(), password: authPassword.value };
      if (emailAuthMode === "signup") {
        const { data, error } = await client.auth.signUp({
          ...credentials,
          options: { emailRedirectTo: `${window.location.origin}/dla-kancelarii.html` },
        });
        if (error) throw error;
        authPassword.value = "";
        if (!data.session) {
          showAuthStatus("Konto zostało utworzone. Sprawdź skrzynkę e-mail i potwierdź rejestrację.", "success");
        }
      } else {
        const { error } = await client.auth.signInWithPassword(credentials);
        if (error) throw error;
        authPassword.value = "";
      }
    } catch (error) {
      showAuthStatus(authErrorMessage(error), "error");
    } finally {
      setAuthBusy(false);
    }
  });

  googleLogin.addEventListener("click", async () => {
    setAuthBusy(true);
    const redirectTo = `${window.location.origin}/dla-kancelarii.html`;
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      showAuthStatus("Nie udało się rozpocząć logowania przez Google.", "error");
      setAuthBusy(false);
    }
  });

  document.getElementById("logout").addEventListener("click", async () => {
    await client.auth.signOut();
  });

  cityInput.addEventListener("change", () => {
    if (coordinates) return;
    const center = cityCenters[normalize(cityInput.value.trim())];
    if (center) updateCoordinates(center[0], center[1], true);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideStatus();
    if (!form.reportValidity()) return;

    const services = [...form.querySelectorAll('input[name="services"]:checked')].map((input) => input.value);
    if (!services.length) {
      showStatus("Wybierz co najmniej jedną usługę.", "error");
      form.querySelector('input[name="services"]')?.focus();
      return;
    }
    if (!coordinates) {
      showStatus("Wskaż przybliżoną lokalizację kancelarii na mapie.", "error");
      document.getElementById("officeMap").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Zapisuję…";

    const officePayload = {
      owner_id: session.user.id,
      name: document.getElementById("officeName").value.trim(),
      city: cityInput.value.trim(),
      services,
      website: document.getElementById("officeWebsite").value.trim() || null,
      public_latitude: coordinates[0],
      public_longitude: coordinates[1],
      is_published: false,
    };

    try {
      const officeResult = await client
        .from("notary_offices")
        .upsert(officePayload, { onConflict: "owner_id" })
        .select("id")
        .single();
      if (officeResult.error) throw officeResult.error;
      officeId = officeResult.data.id;

      const contactResult = await client.from("notary_office_contacts").upsert({
        office_id: officeId,
        street_address: document.getElementById("officeAddress").value.trim(),
        postal_code: document.getElementById("officePostalCode").value.trim(),
        email: emailInput.value.trim(),
        phone: document.getElementById("officePhone").value.trim() || null,
      });
      if (contactResult.error) throw contactResult.error;

      const publishResult = await client
        .from("notary_offices")
        .update({ is_published: true })
        .eq("id", officeId);
      if (publishResult.error) throw publishResult.error;

      showStatus("Wizytówka została opublikowana i jest już dostępna w wyszukiwarce.", "success");
      saveButton.textContent = "Zapisz zmiany";
    } catch (error) {
      console.error(error);
      showStatus("Nie udało się zapisać wizytówki. Sprawdź dane i spróbuj ponownie.", "error");
      saveButton.textContent = officeId ? "Zapisz zmiany" : "Opublikuj wizytówkę";
    } finally {
      saveButton.disabled = false;
    }
  });

  client.auth.getSession().then(({ data, error }) => {
    setSession(data.session);
    const callbackError = oauthError();
    if (error || callbackError) {
      configNotice.textContent = callbackError
        ? `Logowanie nie zostało zakończone: ${callbackError}`
        : "Nie udało się odczytać sesji. Zaloguj się ponownie przez Google.";
      configNotice.classList.remove("hidden");
    }
  });
  client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
})();
