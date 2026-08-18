(function () {
  "use strict";

  const origin = "https://kancelio.pl";
  const path = location.pathname === "/index.html" ? "/" : location.pathname;
  const canonical = document.querySelector('link[rel="canonical"]')?.href || `${origin}${path}`;
  const title = document.title.split("|")[0].split("— Kancelio.pl")[0].trim();
  const description = document.querySelector('meta[name="description"]')?.content || "Kancelio pomaga przejść całą sprawę krok po kroku.";
  const labels = {
    "/kalkulatory.html": "Kalkulatory i checklisty", "/sprzedaz-nieruchomosci-checklista.html": "Sprzedaż nieruchomości krok po kroku",
    "/odrzucenie-spadku.html": "Odrzucenie spadku", "/najem-okazjonalny.html": "Najem okazjonalny", "/umowa-przedwstepna.html": "Umowa przedwstępna",
    "/kancelarie.html": "Kancelarie", "/specjalisci.html": "Specjaliści", "/dla-kancelarii.html": "Dla kancelarii", "/dla-specjalistow.html": "Dla specjalistów",
    "/o-kancelio.html": "O Kancelio", "/kontakt.html": "Kontakt", "/weryfikacja-specjalistow.html": "Weryfikacja specjalistów", "/standard-redakcyjny.html": "Standard redakcyjny",
  };

  function add(data, marker) {
    if (document.querySelector(`script[data-kancelio-schema="${marker}"]`)) return;
    const script = document.createElement("script"); script.type = "application/ld+json"; script.dataset.kancelioSchema = marker; script.textContent = JSON.stringify(data); document.head.append(script);
  }

  add({ "@context": "https://schema.org", "@type": "Organization", name: "Kancelio.pl", url: `${origin}/`, logo: `${origin}/assets/favicon.svg`, email: "kontakt@kancelio.pl", description: "Kancelio pomaga przejść cały proces: od kosztów i dokumentów po zadania oraz dobór zweryfikowanych specjalistów." }, "organization");
  if (path === "/") add({ "@context": "https://schema.org", "@type": "WebSite", name: "Kancelio.pl", url: `${origin}/`, inLanguage: "pl-PL", description }, "website");
  else if (!path.startsWith("/specjalista/") && labels[path]) add({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Kancelio.pl", item: `${origin}/` },
    { "@type": "ListItem", position: 2, name: labels[path] || title, item: canonical },
  ] }, "breadcrumbs");
})();
