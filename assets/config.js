window.KANCELIO_CONFIG = Object.freeze({
  supabaseUrl: "${SUPABASE_URL}",
  supabasePublishableKey: "${SUPABASE_PUBLISHABLE_KEY}",
  turnstileSiteKey: "${TURNSTILE_SITE_KEY}",
  gaMeasurementId: "${GA_MEASUREMENT_ID}",
});

(function loadPrivacyControls() {
  let favicon = document.querySelector('link[rel~="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.append(favicon);
  }
  favicon.type = "image/svg+xml";
  favicon.href = "/assets/favicon.svg?v=20260818-1";

  const siteScript = document.createElement("script");
  siteScript.src = "/assets/site-enhancements.js?v=20260818-2";
  siteScript.defer = true;
  document.head.append(siteScript);
  const seoScript = document.createElement("script");
  seoScript.src = "/assets/seo-structured-data.js?v=20260818-1";
  seoScript.defer = true;
  document.head.append(seoScript);
  const navScript = document.createElement("script");
  navScript.src = "/assets/site-nav.js?v=20260818-6";
  navScript.defer = true;
  document.head.append(navScript);
  const script = document.createElement("script");
  script.src = "/assets/analytics.js?v=20260818-6";
  script.defer = true;
  document.head.append(script);
})();
