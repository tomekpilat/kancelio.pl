(function () {
  "use strict";

  const services = [
    { id: "sale", label: "Sprzedaż nieruchomości" },
    { id: "donation", label: "Darowizna nieruchomości" },
    { id: "power", label: "Pełnomocnictwo notarialne" },
    { id: "will", label: "Testament" },
    { id: "mortgage", label: "Hipoteka i kredyt" },
    { id: "inheritance", label: "Spadek i poświadczenie dziedziczenia" },
    { id: "inheritance_rejection", label: "Odrzucenie lub przyjęcie spadku" },
    { id: "occasional_lease", label: "Najem okazjonalny — oświadczenie najemcy" },
    { id: "preliminary_sale", label: "Umowa przedwstępna nieruchomości" },
    { id: "marital", label: "Umowy majątkowe małżeńskie" },
    { id: "company", label: "Spółki i obsługa przedsiębiorców" },
    { id: "certification", label: "Poświadczenia podpisów i dokumentów" },
  ];

  const serviceById = Object.fromEntries(services.map((service) => [service.id, service]));
  const config = window.KANCELIO_CONFIG || {};
  let client;

  function hasValue(value) {
    return typeof value === "string" && value.length > 0 && !value.startsWith("${");
  }

  function isConfigured() {
    return hasValue(config.supabaseUrl) && hasValue(config.supabasePublishableKey);
  }

  function getClient() {
    if (!isConfigured() || !window.supabase?.createClient) return null;
    if (!client) {
      client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, detectSessionInUrl: true },
      });
    }
    return client;
  }

  function safeWebsite(value) {
    if (!value) return null;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  window.Kancelio = Object.freeze({
    config,
    services,
    serviceById,
    isConfigured,
    getClient,
    safeWebsite,
  });
})();
