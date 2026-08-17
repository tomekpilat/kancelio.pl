(function () {
  "use strict";

  const app = window.Kancelio;
  const client = app.getClient();
  const $ = (id) => document.getElementById(id);
  const templates = {
    inheritance_rejection: {
      label: "Odrzucenie lub przyjęcie spadku", service: "inheritance_rejection", calculator: "/odrzucenie-spadku.html",
      items: [
        ["identity", "Dokument tożsamości", "Dowód osobisty lub paszport."],
        ["death_certificate", "Odpis aktu zgonu", "USC lub usługa online gov.pl."],
        ["deceased_data", "Dane spadkodawcy", "PESEL, ostatni adres i data śmierci."],
        ["inheritance_basis", "Podstawa dziedziczenia", "Testament albo informacje o dziedziczeniu ustawowym."],
        ["heirs", "Dane znanych spadkobierców", "W tym wcześniejsze oświadczenia spadkowe."],
      ],
    },
    occasional_lease: {
      label: "Najem okazjonalny", service: "occasional_lease", calculator: "/najem-okazjonalny.html",
      items: [
        ["lease", "Umowa najmu", "Podpisana lub uzgodniony projekt."],
        ["identity", "Dokument tożsamości najemcy", "Oraz dane osób zamieszkujących."],
        ["alternative_address", "Adres lokalu zastępczego", "Wskazany przez najemcę."],
        ["owner_consent", "Zgoda właściciela lokalu zastępczego", "Sprawdź, czy wynajmujący wymaga poświadczenia podpisu."],
        ["tax_office", "Zgłoszenie do urzędu skarbowego", "Właściciel: 14 dni od rozpoczęcia najmu."],
      ],
    },
    preliminary_sale: {
      label: "Umowa przedwstępna nieruchomości", service: "preliminary_sale", calculator: "/umowa-przedwstepna.html",
      items: [
        ["identity", "Dokumenty tożsamości stron", "Uwzględnij stan cywilny i reprezentację."],
        ["land_register", "Numer księgi wieczystej", "Sprawdź aktualną treść EKW."],
        ["acquisition", "Podstawa nabycia", "Poprzedni akt, orzeczenie lub APD."],
        ["property_docs", "Dokumenty lokalu lub gruntu", "Zakres potwierdzi kancelaria."],
        ["terms", "Cena, termin i płatności", "Ustal zadatek lub zaliczkę oraz termin aktu końcowego."],
      ],
    },
    sale: { label: "Sprzedaż mieszkania lub domu", service: "sale", calculator: "/", items: [["identity","Dokumenty tożsamości stron","Dane małżonków lub pełnomocników."],["land_register","Numer księgi wieczystej","Aktualna treść EKW."],["acquisition","Podstawa nabycia","Akt, orzeczenie albo APD."],["property_docs","Dokumenty nieruchomości","Zaświadczenia zależne od lokalu, domu lub gruntu."],["payment","Warunki płatności i wydania","Kredyt, rachunek, terminy i protokół."]] },
    donation: { label: "Darowizna nieruchomości", service: "donation", calculator: "/", items: [["identity","Dokumenty tożsamości","Darczyńca i obdarowany."],["land_register","Numer księgi wieczystej","Aktualna treść EKW."],["acquisition","Podstawa nabycia","Dokument własności darczyńcy."],["relationship","Dokumenty pokrewieństwa","Jeśli mają znaczenie podatkowe."]] },
    power: { label: "Pełnomocnictwo notarialne", service: "power", calculator: "/", items: [["identity","Dokument tożsamości mocodawcy","Oryginał na wizytę."],["representative","Dane pełnomocnika","Imiona, nazwisko, PESEL i adres."],["scope","Dokładny zakres umocowania","Wypisz czynności, instytucje i ograniczenia."],["subject","Dane przedmiotu sprawy","Np. numer KW, rachunku lub spółki."]] },
    will: { label: "Testament", service: "will", calculator: "/", items: [["identity","Dokument tożsamości","Oryginał na wizytę."],["beneficiaries","Dane osób wskazanych","Imiona, nazwiska i możliwie PESEL."],["instructions","Własne decyzje","Spisz intencje, ale nie podpisuj gotowego aktu."],["assets","Dane szczególnych składników","Np. numer KW przy zapisie windykacyjnym."]] },
  };

  let session = null;
  let authMode = "login";
  let cases = [];

  function notice(message, type = "") {
    const box = $("portalNotice");
    box.textContent = message;
    box.className = `portal-notice ${type}`.trim();
  }

  function hideNotice() { $("portalNotice").className = "portal-notice hidden"; }

  function setAuthMode(mode) {
    authMode = mode;
    const signup = mode === "signup";
    $("loginMode").classList.toggle("active", !signup);
    $("signupMode").classList.toggle("active", signup);
    $("loginMode").setAttribute("aria-pressed", String(!signup));
    $("signupMode").setAttribute("aria-pressed", String(signup));
    $("authPassword").autocomplete = signup ? "new-password" : "current-password";
    $("authSubmit").textContent = signup ? "Załóż konto" : "Zaloguj się";
    $("authTitle").textContent = signup ? "Utwórz konto klienta" : "Zaloguj się do swoich spraw";
    hideNotice();
  }

  function fillTypes() {
    Object.entries(templates).forEach(([value, template]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = template.label;
      $("caseType").append(option);
    });
    const params = new URLSearchParams(location.search);
    const pending = params.get("new") || sessionStorage.getItem("kancelio.pendingCaseType");
    if (templates[pending]) $("caseType").value = pending;
    $("caseCity").value = params.get("city") || sessionStorage.getItem("kancelio.pendingCaseCity") || "";
  }

  function rememberPending() {
    sessionStorage.setItem("kancelio.pendingCaseType", $("caseType").value);
    sessionStorage.setItem("kancelio.pendingCaseCity", $("caseCity").value.trim());
  }

  function createElement(tag, text, className) {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  async function updateCompleted(caseItem, key, checked) {
    const completed = new Set(caseItem.completed_items || []);
    if (checked) completed.add(key); else completed.delete(key);
    const values = [...completed];
    const template = templates[caseItem.case_type];
    const status = template.items.every(([itemKey]) => completed.has(itemKey)) ? "ready" : "preparing";
    const { error } = await client.from("client_cases").update({ completed_items: values, status }).eq("id", caseItem.id);
    if (error) {
      notice("Nie udało się zapisać postępu. Spróbuj ponownie.", "error");
      return false;
    }
    caseItem.completed_items = values;
    caseItem.status = status;
    renderCases();
    return true;
  }

  function renderCase(caseItem) {
    const template = templates[caseItem.case_type];
    const card = createElement("article", null, "case-card");
    const head = createElement("div", null, "case-card-head");
    const titleBox = document.createElement("div");
    titleBox.append(createElement("h3", caseItem.title), createElement("div", `${template.label}${caseItem.city ? ` · ${caseItem.city}` : ""}`, "case-meta"));
    const completed = new Set(caseItem.completed_items || []);
    const percent = Math.round((completed.size / template.items.length) * 100);
    const progress = createElement("div", null, "case-progress");
    progress.append(createElement("span", `${completed.size}/${template.items.length} gotowe`));
    const track = createElement("div", null, "progress-track");
    const bar = document.createElement("span");
    bar.style.width = `${percent}%`;
    track.append(bar); progress.append(track); head.append(titleBox, progress); card.append(head);

    const checklist = createElement("div", null, "case-checklist");
    template.items.forEach(([key, label, hint]) => {
      const item = createElement("label", null, `case-item${completed.has(key) ? " complete" : ""}`);
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox"; checkbox.checked = completed.has(key);
      const copy = document.createElement("span");
      copy.append(createElement("strong", label), createElement("small", hint));
      checkbox.addEventListener("change", async () => {
        checkbox.disabled = true;
        const saved = await updateCompleted(caseItem, key, checkbox.checked);
        if (!saved) { checkbox.checked = !checkbox.checked; checkbox.disabled = false; }
      });
      item.append(checkbox, copy); checklist.append(item);
    });
    card.append(checklist);

    const actions = createElement("div", null, "case-actions");
    const calculator = createElement("a", "Otwórz kalkulator", "button secondary");
    calculator.href = template.calculator;
    const directory = createElement("a", "Znajdź kancelarię", "button");
    const params = new URLSearchParams({ service: template.service });
    if (caseItem.city) params.set("city", caseItem.city);
    directory.href = `/kancelarie.html?${params}`;
    const remove = createElement("button", "Usuń sprawę", "button secondary");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Usunąć sprawę „${caseItem.title}”? Tej operacji nie można cofnąć.`)) return;
      remove.disabled = true;
      const { error } = await client.from("client_cases").delete().eq("id", caseItem.id);
      if (error) { remove.disabled = false; notice("Nie udało się usunąć sprawy.", "error"); return; }
      cases = cases.filter((item) => item.id !== caseItem.id);
      renderCases();
      notice("Sprawa została usunięta.", "success");
    });
    actions.append(calculator, directory, remove); card.append(actions);
    return card;
  }

  function renderCases() {
    const list = $("caseList");
    if (!cases.length) {
      list.replaceChildren(createElement("div", "Nie masz jeszcze zapisanej sprawy. Dodaj pierwszą powyżej — otrzymasz prywatną checklistę przygotowań.", "empty-cases"));
      return;
    }
    list.replaceChildren(...cases.map(renderCase));
  }

  async function loadCases() {
    const { data, error } = await client.from("client_cases").select("id,case_type,title,city,completed_items,status,created_at").order("updated_at", { ascending: false });
    if (error) { notice("Nie udało się pobrać spraw. Upewnij się, że migracja Supabase została zastosowana.", "error"); return; }
    cases = data || [];
    renderCases();
  }

  async function setSession(nextSession) {
    session = nextSession;
    $("authSection").classList.toggle("hidden", Boolean(session));
    $("caseDashboard").classList.toggle("hidden", !session);
    $("accountEmail").textContent = session?.user?.email || "";
    if (session) await loadCases();
  }

  fillTypes();
  $("loginMode").addEventListener("click", () => setAuthMode("login"));
  $("signupMode").addEventListener("click", () => setAuthMode("signup"));
  $("caseType").addEventListener("change", rememberPending);
  $("caseCity").addEventListener("input", rememberPending);

  if (!client) {
    notice("Panel spraw wymaga konfiguracji Supabase.", "error");
    $("authForm").querySelectorAll("input,button").forEach((element) => { element.disabled = true; });
    $("googleLogin").disabled = true;
    return;
  }

  $("authForm").addEventListener("submit", async (event) => {
    event.preventDefault(); hideNotice();
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    $("authSubmit").disabled = true;
    try {
      if (authMode === "signup") {
        const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/moje-sprawy.html` } });
        if (error) throw error;
        if (!data.session) notice("Konto utworzone. Potwierdź adres przez link wysłany e-mailem.", "success");
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      $("authPassword").value = "";
    } catch (error) {
      const message = /invalid login credentials/i.test(error.message) ? "Nieprawidłowy e-mail lub hasło." : "Nie udało się wykonać operacji. Sprawdź dane i spróbuj ponownie.";
      notice(message, "error");
    } finally { $("authSubmit").disabled = false; }
  });

  $("googleLogin").addEventListener("click", async () => {
    rememberPending();
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/moje-sprawy.html` } });
    if (error) notice("Nie udało się rozpocząć logowania przez Google.", "error");
  });
  $("logout").addEventListener("click", () => client.auth.signOut());
  $("caseForm").addEventListener("submit", async (event) => {
    event.preventDefault(); hideNotice();
    if (!$("caseForm").reportValidity()) return;
    const type = $("caseType").value;
    const template = templates[type];
    const title = $("caseTitle").value.trim() || template.label;
    $("saveCase").disabled = true;
    const { data, error } = await client.from("client_cases").insert({ owner_id: session.user.id, case_type: type, title, city: $("caseCity").value.trim() || null }).select("id,case_type,title,city,completed_items,status,created_at").single();
    $("saveCase").disabled = false;
    if (error) { notice("Nie udało się zapisać sprawy. Sprawdź konfigurację bazy i spróbuj ponownie.", "error"); return; }
    cases.unshift(data); $("caseTitle").value = ""; sessionStorage.removeItem("kancelio.pendingCaseType"); sessionStorage.removeItem("kancelio.pendingCaseCity"); renderCases();
    notice("Sprawa zapisana. Możesz od razu zaznaczać przygotowane dokumenty.", "success");
    window.KancelioAnalytics?.track("client_case_created");
  });

  client.auth.getSession().then(({ data, error }) => {
    if (error) notice("Nie udało się odczytać sesji. Zaloguj się ponownie.", "error");
    setSession(data.session);
  });
  client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
})();
