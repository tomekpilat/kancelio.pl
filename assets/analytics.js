(function () {
  "use strict";

  const measurementId = window.KANCELIO_CONFIG?.gaMeasurementId;
  const configured = typeof measurementId === "string"
    && /^G-[A-Z0-9]+$/i.test(measurementId)
    && !measurementId.startsWith("${");
  const consentKey = "kancelio.analyticsConsent.v1";
  let consent = null;
  let tagLoaded = false;

  try { consent = localStorage.getItem(consentKey); } catch { consent = null; }

  function saveConsent(value) {
    consent = value;
    try { localStorage.setItem(consentKey, value); } catch { /* Browser may block storage. */ }
  }

  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  }

  function consentPayload(analyticsStorage) {
    return {
      analytics_storage: analyticsStorage,
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    };
  }

  function loadGoogleAnalytics() {
    if (!configured || tagLoaded || consent !== "granted") return;
    tagLoaded = true;
    ensureGtag();
    window.gtag("consent", "default", consentPayload("denied"));
    window.gtag("consent", "update", consentPayload("granted"));
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: `${location.origin}${location.pathname}`,
      page_path: location.pathname,
      send_page_view: true,
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.append(script);
  }

  function removeAnalyticsCookies() {
    document.cookie.split(";").forEach((entry) => {
      const name = entry.split("=")[0].trim();
      if (name === "_ga" || name.startsWith("_ga_")) {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.kancelio.pl; SameSite=Lax`;
      }
    });
  }

  function revokeConsent() {
    saveConsent("denied");
    if (window.gtag) window.gtag("consent", "update", consentPayload("denied"));
    removeAnalyticsCookies();
  }

  function addStyles() {
    if (document.getElementById("kancelio-consent-styles")) return;
    const style = document.createElement("style");
    style.id = "kancelio-consent-styles";
    style.textContent = `
      .k-consent{position:fixed;z-index:10000;left:18px;right:18px;bottom:18px;max-width:780px;margin:auto;padding:20px;border:1px solid #c5a880;background:#fff;color:#202633;box-shadow:0 18px 55px rgba(11,19,37,.24);font:14px/1.5 Inter,system-ui,sans-serif}
      .k-consent strong{display:block;margin-bottom:5px;color:#0b1325;font:600 20px Playfair Display,serif}.k-consent p{margin:0;color:#697080}.k-consent a{color:#9b794b}.k-consent-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px}.k-consent button,.k-cookie-settings{min-height:42px;padding:9px 15px;border:1px solid #0b1325;border-radius:3px;background:#0b1325;color:#fff;font:700 13px Inter,system-ui,sans-serif;cursor:pointer}.k-consent button.secondary{background:#fff;color:#0b1325}.k-cookie-settings{position:fixed;z-index:9998;right:12px;bottom:12px;min-height:34px;padding:6px 10px;border-color:#9b794b;background:#fff;color:#0b1325;font-size:11px}.k-consent.hidden{display:none}@media(max-width:560px){.k-consent{left:10px;right:10px;bottom:10px}.k-consent-actions{display:grid}.k-consent button{width:100%}}
    `;
    document.head.append(style);
  }

  function showBanner() {
    addStyles();
    let banner = document.getElementById("kancelio-consent");
    if (!banner) {
      banner = document.createElement("section");
      banner.id = "kancelio-consent";
      banner.className = "k-consent";
      banner.setAttribute("role", "dialog");
      banner.setAttribute("aria-label", "Ustawienia cookies");
      const title = document.createElement("strong");
      title.textContent = "Analityka tylko za Twoją zgodą";
      const text = document.createElement("p");
      text.append("Chcemy mierzyć, które narzędzia są przydatne. Google Analytics uruchomimy dopiero po zgodzie; nie wysyłamy kwot ani treści spraw. ");
      const privacy = document.createElement("a");
      privacy.href = "/privacy.html#cookies";
      privacy.textContent = "Dowiedz się więcej";
      text.append(privacy, ".");
      const actions = document.createElement("div");
      actions.className = "k-consent-actions";
      const reject = document.createElement("button");
      reject.type = "button"; reject.className = "secondary"; reject.textContent = "Tylko niezbędne";
      const accept = document.createElement("button");
      accept.type = "button"; accept.textContent = "Zgadzam się na analitykę";
      reject.addEventListener("click", () => { revokeConsent(); banner.classList.add("hidden"); });
      accept.addEventListener("click", () => { saveConsent("granted"); loadGoogleAnalytics(); banner.classList.add("hidden"); });
      actions.append(reject, accept); banner.append(title, text, actions); document.body.append(banner);
    }
    banner.classList.remove("hidden");
  }

  function addSettingsButton() {
    addStyles();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "k-cookie-settings";
    button.textContent = "Ustawienia cookies";
    button.addEventListener("click", showBanner);
    document.body.append(button);
  }

  const allowedEventParameters = new Set([
    "case_type", "profession", "stage", "source_type", "service", "calculator_type",
  ]);

  function safeEventParameters(parameters) {
    if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) return {};
    return Object.fromEntries(Object.entries(parameters).flatMap(([key, value]) => {
      if (!allowedEventParameters.has(key) || !["string", "number", "boolean"].includes(typeof value)) return [];
      const normalized = typeof value === "string" ? value.slice(0, 80) : value;
      return [[key, normalized]];
    }));
  }

  function track(name, parameters = {}) {
    if (consent !== "granted" || !tagLoaded || !window.gtag) return;
    if (typeof name !== "string" || !/^[a-z][a-z0-9_]{0,39}$/.test(name)) return;
    window.gtag("event", name, safeEventParameters(parameters));
  }

  function observeProductEvents() {
    let legacyStarted = false;
    const legacyInputs = document.querySelectorAll(".calculator input, .calculator select");
    legacyInputs.forEach((input) => input.addEventListener("input", () => {
      if (!legacyStarted) { legacyStarted = true; track("calculator_start"); }
      window.clearTimeout(observeProductEvents.timer);
      observeProductEvents.timer = window.setTimeout(() => track("calculator_complete"), 700);
    }));
    document.addEventListener("submit", (event) => {
      if (event.target?.id === "searchForm") track("directory_search");
    });
    document.addEventListener("click", (event) => {
      const target = event.target.closest("a,button");
      if (!target) return;
      const href = target.getAttribute("href") || "";
      if (href.startsWith("tel:")) track("click_phone");
      if (href.startsWith("mailto:")) track("click_email");
      if (/pokaż kontakt/i.test(target.textContent)) track("contact_reveal_start");
      if (target.id === "directoryLink") track("directory_open");
    });
    const contactStatus = document.getElementById("contactStatus");
    if (contactStatus) {
      new MutationObserver(() => {
        if (contactStatus.classList.contains("success")) track("office_contact_reveal");
      }).observe(contactStatus, { childList: true, attributes: true });
    }
  }

  window.KancelioAnalytics = Object.freeze({ track, showSettings: showBanner });
  if (!configured) return;
  addSettingsButton();
  if (consent === "granted") loadGoogleAnalytics();
  else if (consent !== "denied") showBanner();
  observeProductEvents();
})();
