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
  let lastGeocodeRequestAt = 0;

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

  function mapPinIcon(type = "office") {
    if (!window.L?.divIcon) return undefined;
    const label = type === "search" ? "Szukana lokalizacja" : "Kancelaria";
    return window.L.divIcon({
      className: "k-map-marker-shell",
      html: `<span class="k-map-pin ${type === "search" ? "search" : ""}" role="img" aria-label="${label}"><span></span></span>`,
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -36],
    });
  }

  async function searchPolishAddress(query) {
    const elapsed = Date.now() - lastGeocodeRequestAt;
    if (elapsed < 1100) await new Promise((resolve) => window.setTimeout(resolve, 1100 - elapsed));
    lastGeocodeRequestAt = Date.now();
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.search = new URLSearchParams({ q: `${query}, Polska`, format: "jsonv2", limit: "1", countrycodes: "pl", addressdetails: "1", "accept-language": "pl" });
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Geocoding failed");
    const [match] = await response.json();
    return match || null;
  }

  window.Kancelio = Object.freeze({
    config,
    services,
    serviceById,
    isConfigured,
    getClient,
    safeWebsite,
    mapPinIcon,
    searchPolishAddress,
  });
})();
