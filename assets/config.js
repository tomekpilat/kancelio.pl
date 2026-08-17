window.KANCELIO_CONFIG = Object.freeze({
  supabaseUrl: "${SUPABASE_URL}",
  supabasePublishableKey: "${SUPABASE_PUBLISHABLE_KEY}",
  turnstileSiteKey: "${TURNSTILE_SITE_KEY}",
  gaMeasurementId: "${GA_MEASUREMENT_ID}",
});

(function loadPrivacyControls() {
  const siteScript = document.createElement("script");
  siteScript.src = "/assets/site-enhancements.js?v=20260818-1";
  siteScript.defer = true;
  document.head.append(siteScript);
  const navScript = document.createElement("script");
  navScript.src = "/assets/site-nav.js?v=20260818-4";
  navScript.defer = true;
  document.head.append(navScript);
  const script = document.createElement("script");
  script.src = "/assets/analytics.js?v=20260817-5";
  script.defer = true;
  document.head.append(script);
})();
