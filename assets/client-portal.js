(function () {
  "use strict";

  const app = window.Kancelio;
  const client = app.getClient();
  const templates = window.KANCELIO_CASE_TEMPLATES || {};
  const $ = (id) => document.getElementById(id);
  const categories = [["preparation", "1. Przygotowanie"], ["documents", "2. Dokumenty"], ["transaction", "3. Umowa i formalności"], ["aftercare", "4. Po podpisaniu"]];
  const acceptedTypes = ["application/pdf", "image/jpeg", "image/png", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  const typeByExtension = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", txt: "text/plain", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  const legacyCompletionAliases = {
    inheritance_rejection: { succession_order: ["inheritance_basis"], family_followup: ["heirs"] },
    preliminary_sale: { conditions: ["terms"] },
    sale: { preliminary_terms: ["payment"] },
    donation: { tax_group: ["relationship"] },
    power: { purpose: ["scope"] },
    will: { goals: ["instructions"] },
  };
  let session = null;
  let authMode = "login";
  let cases = [];
  let pendingInviteToken = new URLSearchParams(location.search).get("invite") || sessionStorage.getItem("kancelio.pendingInvite");

  function notice(message, type = "") {
    const box = $("portalNotice");
    box.textContent = message;
    box.className = `portal-notice ${type}`.trim();
  }
  function hideNotice() { $("portalNotice").className = "portal-notice hidden"; }
  function createElement(tag, text, className) {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function setAuthMode(mode) {
    authMode = mode;
    const signup = mode === "signup";
    $("loginMode").classList.toggle("active", !signup);
    $("signupMode").classList.toggle("active", signup);
    $("loginMode").setAttribute("aria-pressed", String(!signup));
    $("signupMode").setAttribute("aria-pressed", String(signup));
    $("authPassword").autocomplete = signup ? "new-password" : "current-password";
    $("authSubmit").textContent = signup ? "Załóż konto" : "Zaloguj się";
    $("authTitle").textContent = pendingInviteToken ? "Zaloguj się, aby dołączyć do sprawy" : signup ? "Utwórz konto klienta" : "Zaloguj się do swoich spraw";
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
    if (pendingInviteToken) sessionStorage.setItem("kancelio.pendingInvite", pendingInviteToken);
  }
  function authRedirectUrl() {
    const url = new URL("/moje-sprawy.html", location.origin);
    if (pendingInviteToken) url.searchParams.set("invite", pendingInviteToken);
    return url.href;
  }
  function participantLabel(participant, ownerId) {
    if (!participant) return "Nieprzypisane";
    if (participant.user_id === ownerId || participant.role === "owner") return "Właściciel sprawy";
    return participant.display_name || participant.email;
  }
  function templateSource(caseItem, key) {
    return templates[caseItem.case_type]?.items.find((item) => item.key === key)?.source;
  }

  async function acceptInvitation() {
    if (!pendingInviteToken || !session) return;
    const { error } = await client.rpc("accept_client_case_invitation", { invitation_token: pendingInviteToken });
    if (error) {
      const message = error.message || "";
      if (message.includes("email_mismatch")) notice("To zaproszenie jest przypisane do innego adresu e-mail. Zaloguj się właściwym kontem.", "error");
      else if (message.includes("invitation_expired")) notice("Zaproszenie wygasło. Poproś właściciela sprawy o nowy link.", "error");
      else if (message.includes("invalid_invitation")) notice("Zaproszenie jest nieprawidłowe albo zostało już użyte.", "error");
      else notice("Nie udało się przyjąć zaproszenia.", "error");
      return;
    }
    pendingInviteToken = null;
    sessionStorage.removeItem("kancelio.pendingInvite");
    history.replaceState({}, "", "/moje-sprawy.html");
    notice("Dołączyłeś do wspólnej sprawy. Możecie razem uzupełniać checklistę.", "success");
    window.KancelioAnalytics?.track("case_invitation_accepted");
  }

  async function seedMissingItems(caseItem) {
    const definition = templates[caseItem.case_type];
    if (!definition || caseItem.owner_id !== session.user.id) return false;
    const existing = new Set((caseItem.client_case_items || []).map((item) => item.template_key).filter(Boolean));
    const completedLegacy = new Set(caseItem.completed_items || []);
    const rows = definition.items.filter((item) => !existing.has(item.key)).map((item, index) => ({
      case_id: caseItem.id, template_key: item.key, item_type: item.itemType, category: item.category,
      title: item.title, description: item.description,
      completed: completedLegacy.has(item.key) || (legacyCompletionAliases[caseItem.case_type]?.[item.key] || []).some((key) => completedLegacy.has(key)),
      is_custom: false, sort_order: index * 10, created_by: session.user.id,
    }));
    if (!rows.length) return false;
    const { error } = await client.from("client_case_items").insert(rows);
    if (error && !/duplicate key/i.test(error.message || "")) throw error;
    return true;
  }

  async function loadCases(allowSeed = true) {
    const { data, error } = await client.from("client_cases").select(`
      id,owner_id,case_type,title,city,completed_items,status,created_at,updated_at,
      client_case_participants(id,user_id,email,display_name,role,status),
      client_case_items(id,template_key,item_type,category,title,description,assigned_participant_id,due_date,completed,is_custom,sort_order,created_by,created_at,client_case_files(id,storage_path,original_name,mime_type,size_bytes,uploaded_by,created_at))
    `).order("updated_at", { ascending: false });
    if (error) {
      notice("Nie udało się pobrać spraw. Zastosuj najnowszą migrację Supabase i spróbuj ponownie.", "error");
      return;
    }
    cases = data || [];
    if (allowSeed) {
      try {
        const seeded = await Promise.all(cases.map(seedMissingItems));
        if (seeded.some(Boolean)) return loadCases(false);
      } catch (_error) { notice("Sprawy są dostępne, ale nie udało się uzupełnić nowej checklisty.", "error"); }
    }
    renderCases();
  }

  async function updateItem(caseItem, item, changes) {
    const { error } = await client.from("client_case_items").update(changes).eq("id", item.id);
    if (error) { notice("Nie udało się zapisać zmiany.", "error"); return false; }
    Object.assign(item, changes);
    renderCases();
    return true;
  }
  function renderParticipants(caseItem) {
    const wrap = createElement("div", null, "case-people");
    wrap.append(createElement("strong", "Osoby w sprawie:"));
    (caseItem.client_case_participants || []).forEach((participant) => {
      const suffix = participant.status === "pending" ? " · oczekuje" : "";
      wrap.append(createElement("span", `${participantLabel(participant, caseItem.owner_id)}${suffix}`, `person-chip ${participant.status}`));
    });
    return wrap;
  }
  function assignmentSelect(caseItem, item) {
    const select = document.createElement("select");
    select.className = "assignment-select";
    select.setAttribute("aria-label", `Osoba odpowiedzialna za: ${item.title}`);
    select.append(new Option("Nieprzypisane", ""));
    (caseItem.client_case_participants || []).forEach((participant) => {
      const option = new Option(`${participantLabel(participant, caseItem.owner_id)}${participant.status === "pending" ? " (oczekuje)" : ""}`, participant.id);
      option.selected = item.assigned_participant_id === participant.id;
      select.append(option);
    });
    select.addEventListener("change", async () => {
      select.disabled = true;
      const saved = await updateItem(caseItem, item, { assigned_participant_id: select.value || null });
      if (!saved) select.disabled = false;
    });
    return select;
  }

  async function openFile(file) {
    const { data, error } = await client.storage.from("case-documents").createSignedUrl(file.storage_path, 60);
    if (error || !data?.signedUrl) { notice("Nie udało się otworzyć pliku.", "error"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function deleteFile(file, button) {
    if (!window.confirm(`Usunąć plik „${file.original_name}”?`)) return;
    button.disabled = true;
    const storageResult = await client.storage.from("case-documents").remove([file.storage_path]);
    if (storageResult.error) { button.disabled = false; notice("Nie udało się usunąć pliku.", "error"); return; }
    const { error } = await client.from("client_case_files").delete().eq("id", file.id);
    notice(error ? "Plik usunięto z magazynu, ale nie udało się odświeżyć listy." : "Plik został usunięty.", error ? "error" : "success");
    await loadCases(false);
  }
  function renderFiles(caseItem, item) {
    const list = createElement("div", null, "item-files");
    (item.client_case_files || []).forEach((file) => {
      const row = createElement("div", null, "file-row");
      const open = createElement("button", file.original_name, "file-link");
      open.type = "button";
      open.addEventListener("click", () => openFile(file));
      row.append(open, createElement("span", `${Math.max(1, Math.round(file.size_bytes / 1024))} KB`, "file-size"));
      if (file.uploaded_by === session.user.id || caseItem.owner_id === session.user.id) {
        const remove = createElement("button", "Usuń", "file-remove");
        remove.type = "button";
        remove.addEventListener("click", () => deleteFile(file, remove));
        row.append(remove);
      }
      list.append(row);
    });
    return list;
  }
  async function uploadFile(caseItem, item, fileInput) {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 10485760) { notice("Plik jest większy niż 10 MB.", "error"); fileInput.value = ""; return; }
    const extension = file.name.split(".").pop().toLowerCase();
    const mimeType = acceptedTypes.includes(file.type) ? file.type : typeByExtension[extension];
    if (!mimeType) { notice("Dozwolone są pliki PDF, JPG, PNG, TXT, DOC i DOCX.", "error"); fileInput.value = ""; return; }
    fileInput.disabled = true;
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "dokument";
    const path = `${caseItem.id}/${item.id}/${crypto.randomUUID()}-${safeName}`;
    const upload = await client.storage.from("case-documents").upload(path, file, { upsert: false, contentType: mimeType });
    if (upload.error) { fileInput.disabled = false; notice("Nie udało się przesłać pliku. Sprawdź migrację i spróbuj ponownie.", "error"); return; }
    const { error } = await client.from("client_case_files").insert({ case_id: caseItem.id, item_id: item.id, storage_path: path, original_name: file.name, mime_type: mimeType, size_bytes: file.size, uploaded_by: session.user.id });
    if (error) {
      await client.storage.from("case-documents").remove([path]);
      fileInput.disabled = false;
      notice("Nie udało się przypisać pliku do checklisty.", "error");
      return;
    }
    notice("Dokument został bezpiecznie dodany do sprawy.", "success");
    window.KancelioAnalytics?.track("case_file_uploaded");
    await loadCases(false);
  }

  function renderItem(caseItem, item) {
    const wrap = createElement("div", null, `case-item${item.completed ? " complete" : ""}`);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.completed;
    checkbox.setAttribute("aria-label", `Oznacz jako wykonane: ${item.title}`);
    checkbox.addEventListener("change", async () => {
      checkbox.disabled = true;
      const saved = await updateItem(caseItem, item, { completed: checkbox.checked });
      if (!saved) { checkbox.checked = !checkbox.checked; checkbox.disabled = false; }
    });
    const body = createElement("div", null, "item-body");
    const titleRow = createElement("div", null, "item-title-row");
    titleRow.append(createElement("strong", item.title), createElement("span", item.item_type === "document" ? "Dokument" : "Zadanie", `item-kind ${item.item_type}`));
    body.append(titleRow);
    if (item.description) body.append(createElement("small", item.description));
    if (item.due_date) body.append(createElement("span", `Termin: ${new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(`${item.due_date}T12:00:00`))}`, "item-due"));
    const source = templateSource(caseItem, item.template_key);
    if (source) {
      const link = createElement("a", "Sprawdź oficjalne informacje →", "item-source");
      link.href = source; link.target = "_blank"; link.rel = "noopener noreferrer";
      body.append(link);
    }
    const tools = createElement("div", null, "item-tools");
    tools.append(assignmentSelect(caseItem, item));
    const uploadLabel = createElement("label", "Dodaj plik", "upload-button");
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx";
    input.addEventListener("change", () => uploadFile(caseItem, item, input));
    uploadLabel.append(input); tools.append(uploadLabel);
    if (item.is_custom && (item.created_by === session.user.id || caseItem.owner_id === session.user.id)) {
      const remove = createElement("button", "Usuń pozycję", "item-delete");
      remove.type = "button";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Usunąć pozycję „${item.title}” wraz z plikami?`)) return;
        const { error } = await client.from("client_case_items").delete().eq("id", item.id);
        if (error) notice("Nie udało się usunąć pozycji.", "error"); else await loadCases(false);
      });
      tools.append(remove);
    }
    body.append(tools, renderFiles(caseItem, item));
    wrap.append(checkbox, body);
    return wrap;
  }

  function renderCustomItemForm(caseItem) {
    const details = document.createElement("details");
    details.className = "case-tool-panel";
    const form = createElement("form", null, "custom-item-form");
    form.innerHTML = `<label>Rodzaj<select name="itemType"><option value="document">Dokument</option><option value="task">Zadanie</option></select></label><label>Etap<select name="category">${categories.map(([value, label]) => `<option value="${value}">${label.replace(/^\d\. /, "")}</option>`).join("")}</select></label><label class="wide">Nazwa<input name="title" required minlength="2" maxlength="160" placeholder="np. Potwierdzenie zamknięcia umowy na prąd"></label><label class="wide">Wskazówka<textarea name="description" maxlength="600" rows="2" placeholder="Co trzeba zrobić lub dostarczyć?"></textarea></label><label>Osoba odpowiedzialna<select name="assignee"></select></label><label>Termin<input name="dueDate" type="date"></label><button class="button" type="submit">Dodaj do checklisty</button>`;
    const assignee = form.elements.assignee;
    assignee.append(new Option("Nieprzypisane", ""));
    (caseItem.client_case_participants || []).forEach((participant) => {
      assignee.append(new Option(participantLabel(participant, caseItem.owner_id), participant.id));
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const submit = form.querySelector("button"); submit.disabled = true;
      const { error } = await client.from("client_case_items").insert({ case_id: caseItem.id, item_type: data.get("itemType"), category: data.get("category"), title: String(data.get("title") || "").trim(), description: String(data.get("description") || "").trim() || null, assigned_participant_id: data.get("assignee") || null, due_date: data.get("dueDate") || null, is_custom: true, sort_order: 900, created_by: session.user.id });
      submit.disabled = false;
      if (error) { notice("Nie udało się dodać pozycji.", "error"); return; }
      notice("Własna pozycja została dodana.", "success");
      window.KancelioAnalytics?.track("case_custom_item_created");
      await loadCases(false);
    });
    details.append(createElement("summary", "+ Dodaj własny dokument lub zadanie"), form);
    return details;
  }

  function renderInvitePanel(caseItem) {
    const details = document.createElement("details");
    details.className = "case-tool-panel";
    const content = createElement("div", null, "invite-content");
    content.append(createElement("p", "Podaj konkretny adres e-mail. Link zadziała tylko po zalogowaniu na ten adres i wygaśnie po 7 dniach."));
    const form = createElement("form", null, "invite-form");
    form.innerHTML = `<label>Rola / nazwa osoby<input name="name" required minlength="2" maxlength="80" placeholder="np. Kupujący"></label><label>E-mail<input name="email" type="email" required maxlength="254" placeholder="druga.strona@email.pl"></label><button class="button" type="submit">Utwórz zaproszenie</button>`;
    const result = createElement("div", null, "invite-result hidden");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form); const button = form.querySelector("button"); button.disabled = true;
      const response = await client.rpc("create_client_case_invitation", { target_case_id: caseItem.id, invited_email: String(data.get("email") || "").trim(), participant_name: String(data.get("name") || "").trim() });
      button.disabled = false;
      if (response.error) { notice((response.error.message || "").includes("already_joined") ? "Ta osoba już uczestniczy w sprawie." : "Nie udało się utworzyć zaproszenia.", "error"); return; }
      const shareUrl = new URL("/moje-sprawy.html", location.origin); shareUrl.searchParams.set("invite", response.data);
      result.classList.remove("hidden"); result.replaceChildren(createElement("p", "Wyślij ten prywatny link zaproszonej osobie:"));
      const input = document.createElement("input"); input.readOnly = true; input.value = shareUrl.href;
      const copy = createElement("button", "Kopiuj link", "button secondary"); copy.type = "button";
      copy.addEventListener("click", async () => { await navigator.clipboard.writeText(shareUrl.href); copy.textContent = "Skopiowano"; });
      const share = createElement("button", "Udostępnij", "button secondary"); share.type = "button"; share.classList.toggle("hidden", !navigator.share);
      share.addEventListener("click", () => navigator.share({ title: caseItem.title, text: "Dołącz do wspólnej checklisty w Kancelio.pl", url: shareUrl.href }));
      result.append(input, copy, share); notice("Zaproszenie gotowe. Wyślij link właściwej osobie.", "success");
      window.KancelioAnalytics?.track("case_invitation_created"); await loadCases(false);
    });
    content.append(form, result); details.append(createElement("summary", "Zaproś drugą stronę"), content);
    return details;
  }

  function renderCase(caseItem) {
    const template = templates[caseItem.case_type];
    const items = (caseItem.client_case_items || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const completedCount = items.filter((item) => item.completed).length;
    const percent = items.length ? Math.round((completedCount / items.length) * 100) : 0;
    const isOwner = caseItem.owner_id === session.user.id;
    const card = createElement("article", null, "case-card");
    const head = createElement("div", null, "case-card-head");
    const titleBox = document.createElement("div");
    titleBox.append(createElement("h3", caseItem.title), createElement("div", `${template.label}${caseItem.city ? ` · ${caseItem.city}` : ""}`, "case-meta"));
    const progress = createElement("div", null, "case-progress"); progress.append(createElement("span", `${completedCount}/${items.length} gotowe`));
    const track = createElement("div", null, "progress-track"); const bar = document.createElement("span"); bar.style.width = `${percent}%`; track.append(bar); progress.append(track);
    head.append(titleBox, progress); card.append(head, renderParticipants(caseItem));
    categories.forEach(([category, label]) => {
      const groupItems = items.filter((item) => item.category === category); if (!groupItems.length) return;
      const section = createElement("section", null, "checklist-group"); section.append(createElement("h4", label));
      const checklist = createElement("div", null, "case-checklist"); groupItems.forEach((item) => checklist.append(renderItem(caseItem, item)));
      section.append(checklist); card.append(section);
    });
    const tools = createElement("div", null, "case-tools-grid"); tools.append(renderCustomItemForm(caseItem)); if (isOwner) tools.append(renderInvitePanel(caseItem)); card.append(tools);
    const actions = createElement("div", null, "case-actions");
    const calculator = createElement("a", "Otwórz kalkulator", "button secondary"); calculator.href = template.calculator;
    const directory = createElement("a", `Znajdź ${template.directoryLabel || "kancelarię"}`, "button");
    const params = new URLSearchParams({ service: template.service }); if (caseItem.city) params.set("city", caseItem.city); directory.href = `/kancelarie.html?${params}`;
    actions.append(calculator, directory);
    if (isOwner) {
      const remove = createElement("button", "Usuń sprawę", "button secondary danger-button"); remove.type = "button";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Usunąć sprawę „${caseItem.title}” wraz z dokumentami? Tej operacji nie można cofnąć.`)) return;
        remove.disabled = true;
        const { data: files } = await client.from("client_case_files").select("storage_path").eq("case_id", caseItem.id);
        if (files?.length) await client.storage.from("case-documents").remove(files.map((file) => file.storage_path));
        const { error } = await client.from("client_cases").delete().eq("id", caseItem.id);
        if (error) { remove.disabled = false; notice("Nie udało się usunąć sprawy.", "error"); return; }
        cases = cases.filter((item) => item.id !== caseItem.id); renderCases(); notice("Sprawa i jej dokumenty zostały usunięte.", "success");
      });
      actions.append(remove);
    }
    card.append(actions); return card;
  }
  function renderCases() {
    const list = $("caseList");
    if (!cases.length) { list.replaceChildren(createElement("div", "Nie masz jeszcze zapisanej sprawy. Dodaj pierwszą powyżej — otrzymasz checklistę całego procesu, nie tylko wizyty u notariusza.", "empty-cases")); return; }
    list.replaceChildren(...cases.map(renderCase));
  }
  async function setSession(nextSession) {
    session = nextSession;
    $("authSection").classList.toggle("hidden", Boolean(session)); $("caseDashboard").classList.toggle("hidden", !session);
    $("accountEmail").textContent = session?.user?.email || "";
    if (session) { await acceptInvitation(); await loadCases(); }
  }

  fillTypes(); setAuthMode("login");
  $("loginMode").addEventListener("click", () => setAuthMode("login")); $("signupMode").addEventListener("click", () => setAuthMode("signup"));
  $("caseType").addEventListener("change", rememberPending); $("caseCity").addEventListener("input", rememberPending);
  if (!client) {
    notice("Panel spraw wymaga konfiguracji Supabase.", "error");
    $("authForm").querySelectorAll("input,button").forEach((element) => { element.disabled = true; }); $("googleLogin").disabled = true; return;
  }
  $("authForm").addEventListener("submit", async (event) => {
    event.preventDefault(); hideNotice(); rememberPending();
    const email = $("authEmail").value.trim(); const password = $("authPassword").value; $("authSubmit").disabled = true;
    try {
      if (authMode === "signup") {
        const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectUrl() } }); if (error) throw error;
        if (!data.session) notice("Konto utworzone. Potwierdź adres przez link wysłany e-mailem.", "success");
      } else { const { error } = await client.auth.signInWithPassword({ email, password }); if (error) throw error; }
      $("authPassword").value = "";
    } catch (error) { notice(/invalid login credentials/i.test(error.message) ? "Nieprawidłowy e-mail lub hasło." : "Nie udało się wykonać operacji. Sprawdź dane i spróbuj ponownie.", "error"); }
    finally { $("authSubmit").disabled = false; }
  });
  $("googleLogin").addEventListener("click", async () => { rememberPending(); const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: authRedirectUrl() } }); if (error) notice("Nie udało się rozpocząć logowania przez Google.", "error"); });
  $("logout").addEventListener("click", () => client.auth.signOut());
  $("caseForm").addEventListener("submit", async (event) => {
    event.preventDefault(); hideNotice(); if (!$("caseForm").reportValidity()) return;
    const type = $("caseType").value; const template = templates[type]; const title = $("caseTitle").value.trim() || template.label; $("saveCase").disabled = true;
    const { error } = await client.from("client_cases").insert({ owner_id: session.user.id, case_type: type, title, city: $("caseCity").value.trim() || null });
    $("saveCase").disabled = false;
    if (error) { notice("Nie udało się zapisać sprawy. Sprawdź konfigurację bazy i spróbuj ponownie.", "error"); return; }
    $("caseTitle").value = ""; sessionStorage.removeItem("kancelio.pendingCaseType"); sessionStorage.removeItem("kancelio.pendingCaseCity");
    await loadCases(); notice("Sprawa zapisana. Checklista prowadzi od przygotowania aż po czynności po podpisaniu.", "success"); window.KancelioAnalytics?.track("client_case_created");
  });
  client.auth.getSession().then(({ data, error }) => { if (error) notice("Nie udało się odczytać sesji. Zaloguj się ponownie.", "error"); setSession(data.session); });
  client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
})();
