(function () {
  "use strict";

  const navs = [...document.querySelectorAll("header nav")];
  if (!navs.length) return;

  const links = [
    ["/kalkulatory.html", "Kalkulatory"],
    ["/sprzedaz-nieruchomosci-checklista.html", "Sprzedaż krok po kroku"],
    ["/kancelarie.html", "Kancelarie"],
    ["/moje-sprawy.html", "Moje sprawy"],
    ["/dla-kancelarii.html", "Dla kancelarii"],
  ];
  let authClient = null;
  let currentSession = null;

  const style = document.createElement("style");
  style.textContent = `
    .k-site-nav{position:relative;z-index:1200;width:min(1180px,calc(100% - 36px));min-height:76px;margin-inline:auto;display:flex;align-items:center;justify-content:space-between;gap:22px;color:#f5f5f7}
    .k-site-nav .brand,.k-site-nav .logo{flex:0 0 auto;color:#fff;text-decoration:none}
    .k-site-menu{display:flex;align-items:center;justify-content:flex-end;gap:17px;min-width:0}
    .k-site-links{display:flex;align-items:center;gap:17px;white-space:nowrap}
    .k-site-links>a{position:relative;color:#f5f5f7;font-size:12px;font-weight:650;text-decoration:none}
    .k-site-links>a:hover,.k-site-links>a:focus-visible,.k-site-links>a.is-active{color:#c5a880}
    .k-site-links>a.is-active::after{content:"";position:absolute;right:0;bottom:-8px;left:0;height:1px;background:#c5a880}
    .k-nav-toggle{display:none;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(197,168,128,.55);border-radius:3px;background:transparent;color:#fff;font-size:12px;font-weight:700;cursor:pointer}
    .k-nav-toggle-lines,.k-nav-toggle-lines::before,.k-nav-toggle-lines::after{display:block;width:16px;height:1px;background:#c5a880}
    .k-nav-toggle-lines{position:relative}.k-nav-toggle-lines::before,.k-nav-toggle-lines::after{content:"";position:absolute;left:0}.k-nav-toggle-lines::before{top:-5px}.k-nav-toggle-lines::after{top:5px}
    .k-account{position:relative;flex:0 0 auto}
    .k-account-login,.k-account-trigger{display:inline-flex;min-height:36px;align-items:center;gap:8px;padding:7px 11px;border:1px solid rgba(197,168,128,.65);border-radius:999px;background:rgba(255,255,255,.05);color:#fff;font-size:12px;font-weight:700;text-decoration:none;cursor:pointer}
    .k-account-login:hover,.k-account-trigger:hover{background:rgba(197,168,128,.12)}
    .k-account-dot{width:7px;height:7px;border-radius:50%;background:#70d39b;box-shadow:0 0 0 3px rgba(112,211,155,.13)}
    .k-account-popover{position:absolute;top:calc(100% + 10px);right:0;width:265px;padding:10px;border:1px solid #ded7ca;border-radius:5px;background:#fff;color:#202633;box-shadow:0 16px 44px rgba(11,19,37,.22)}
    .k-account-popover[hidden]{display:none}
    .k-account-email{display:block;overflow:hidden;padding:6px 8px 10px;color:#697080;font-size:11px;text-overflow:ellipsis;white-space:nowrap}
    .k-account-popover a,.k-account-popover button{display:flex;width:100%;padding:9px 8px;border:0;border-radius:3px;background:transparent;color:#202633;font:600 12px Inter,system-ui,sans-serif;text-align:left;text-decoration:none;cursor:pointer}
    .k-account-popover a:hover,.k-account-popover button:hover{background:#f4f0e8}.k-account-popover button{color:#9b2c2c}
    @media(max-width:1040px){
      .k-site-nav{min-height:68px;align-items:center}.k-nav-toggle{display:inline-flex}.k-site-menu{position:absolute;top:calc(100% - 1px);right:0;left:0;display:none;align-items:stretch;padding:15px;border:1px solid rgba(197,168,128,.5);background:#0b1325;box-shadow:0 18px 40px rgba(0,0,0,.25)}
      .k-site-nav.is-open .k-site-menu{display:block}.k-site-links{display:grid;gap:0}.k-site-links>a{padding:11px 7px;border-bottom:1px solid rgba(255,255,255,.08);font-size:13px}.k-site-links>a.is-active::after{display:none}
      .k-account{margin-top:12px}.k-account-login,.k-account-trigger{width:100%;justify-content:center;border-radius:3px}.k-account-popover{position:static;width:100%;margin-top:8px;box-shadow:none}
    }
  `;
  document.head.append(style);

  function isActive(href) {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return path === href.replace(/\/$/, "");
  }

  function accountMarkup(index) {
    if (!currentSession?.user) {
      return `<a class="k-account-login" href="/moje-sprawy.html" aria-label="Zaloguj się lub utwórz konto">Zaloguj się</a>`;
    }
    const email = currentSession.user.email || "Konto Kancelio";
    return `<button class="k-account-trigger" type="button" aria-expanded="false" aria-controls="k-account-menu-${index}"><span class="k-account-dot" aria-hidden="true"></span>Zalogowano</button>
      <div id="k-account-menu-${index}" class="k-account-popover" hidden>
        <span class="k-account-email" title="${escapeAttribute(email)}">${escapeHtml(email)}</span>
        <a href="/moje-sprawy.html">Panel: moje sprawy</a>
        <a href="/dla-kancelarii.html">Panel kancelarii</a>
        <button type="button" data-k-signout>Wyloguj się</button>
      </div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function renderNav(nav, index) {
    nav.classList.add("k-site-nav");
    nav.innerHTML = `<a class="brand" href="/">Kancelio<span>.pl</span></a>
      <button class="k-nav-toggle" type="button" aria-expanded="false" aria-controls="k-site-menu-${index}"><span class="k-nav-toggle-lines" aria-hidden="true"></span>Menu</button>
      <div id="k-site-menu-${index}" class="k-site-menu">
        <div class="k-site-links">${links.map(([href, label]) => `<a href="${href}"${isActive(href) ? ' class="is-active" aria-current="page"' : ""}>${label}</a>`).join("")}</div>
        <div class="k-account">${accountMarkup(index)}</div>
      </div>`;

    const toggle = nav.querySelector(".k-nav-toggle");
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelector(".k-account-trigger")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const trigger = event.currentTarget;
      const popover = nav.querySelector(".k-account-popover");
      const open = popover.hidden;
      popover.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    });
    nav.querySelector("[data-k-signout]")?.addEventListener("click", async () => {
      if (authClient) await authClient.auth.signOut();
    });
  }

  function renderAll() {
    navs.forEach(renderNav);
  }

  function configured() {
    const config = window.KANCELIO_CONFIG;
    return Boolean(config?.supabaseUrl && config?.supabasePublishableKey && !config.supabaseUrl.startsWith("${") && !config.supabasePublishableKey.startsWith("${"));
  }

  function loadSupabase() {
    if (window.supabase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="supabase-js"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  async function getAuthClient() {
    if (!window.Kancelio && document.querySelector('script[src*="/assets/kancelio.js"]')) {
      for (let attempt = 0; attempt < 20 && !window.Kancelio; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }
    }
    if (window.Kancelio?.getClient) return window.Kancelio.getClient();
    if (!configured()) return null;
    await loadSupabase();
    if (!window.__KANCELIO_NAV_CLIENT) {
      window.__KANCELIO_NAV_CLIENT = window.supabase.createClient(
        window.KANCELIO_CONFIG.supabaseUrl,
        window.KANCELIO_CONFIG.supabasePublishableKey
      );
    }
    return window.__KANCELIO_NAV_CLIENT;
  }

  async function initAuth() {
    try {
      authClient = await getAuthClient();
      if (!authClient) return;
      const { data } = await authClient.auth.getSession();
      currentSession = data.session;
      renderAll();
      authClient.auth.onAuthStateChange((_event, session) => {
        currentSession = session;
        renderAll();
      });
    } catch (error) {
      console.warn("Kancelio navigation auth unavailable", error);
    }
  }

  document.addEventListener("click", () => {
    document.querySelectorAll(".k-account-popover").forEach((popover) => { popover.hidden = true; });
    document.querySelectorAll(".k-account-trigger").forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    navs.forEach((nav) => nav.classList.remove("is-open"));
    document.querySelectorAll(".k-account-popover").forEach((popover) => { popover.hidden = true; });
  });

  renderAll();
  initAuth();
})();
