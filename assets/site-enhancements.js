(function () {
  "use strict";

  const calculator = document.querySelector(".calculator");
  if (!calculator) return;

  const style = document.createElement("style");
  style.textContent = `
    .k-more-tools{max-width:1120px;margin:42px auto 0;padding:34px;border:1px solid #ded7ca;background:#fff}.k-more-tools h2{margin:0 0 6px}.k-more-tools>p{margin:0 0 20px;color:#697080}.k-tool-links{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.k-tool-link{padding:17px;border:1px solid #ded7ca;text-decoration:none;background:#faf9f6}.k-tool-link strong{display:block;color:#0b1325}.k-tool-link span{color:#697080;font-size:12px}.k-save-case{display:block;text-align:center;text-decoration:none;border:1px solid #9b794b;color:#0b1325;padding:10px 12px;border-radius:3px;font-weight:700}@media(max-width:720px){.k-tool-links{grid-template-columns:1fr}.k-more-tools{padding:24px}}
  `;
  document.head.append(style);

  const nav = document.querySelector("header nav");
  const existingBack = nav?.querySelector(".back");
  if (nav && existingBack && !nav.querySelector('a[href="/kalkulatory.html"]')) {
    const toolsLink = document.createElement("a");
    toolsLink.className = "back";
    toolsLink.href = "/kalkulatory.html";
    toolsLink.textContent = "Wszystkie kalkulatory →";
    nav.insertBefore(toolsLink, existingBack);
  }

  const section = document.createElement("section");
  section.className = "k-more-tools";
  const heading = document.createElement("h2");
  heading.textContent = "Przygotuj konkretną sprawę";
  const intro = document.createElement("p");
  intro.textContent = "Nowe kalkulatory łączą koszt z checklistą dokumentów i dalszymi krokami.";
  const links = document.createElement("div");
  links.className = "k-tool-links";
  [
    ["/odrzucenie-spadku.html", "Odrzucenie spadku", "Koszt, termin i dokumenty"],
    ["/najem-okazjonalny.html", "Najem okazjonalny", "Oświadczenie najemcy i załączniki"],
    ["/umowa-przedwstepna.html", "Umowa przedwstępna", "Nieruchomość, koszt i forma"],
  ].forEach(([href, title, description]) => {
    const link = document.createElement("a");
    link.className = "k-tool-link";
    link.href = href;
    const strong = document.createElement("strong"); strong.textContent = title;
    const span = document.createElement("span"); span.textContent = description;
    link.append(strong, span); links.append(link);
  });
  section.append(heading, intro, links);
  calculator.after(section);

  const leadSearch = document.querySelector(".lead-search");
  const type = document.getElementById("type");
  if (leadSearch && type && !document.getElementById("caseLink")) {
    const save = document.createElement("a");
    save.className = "k-save-case";
    save.textContent = "Zapisz sprawę i checklistę";
    const update = () => { save.href = `/moje-sprawy.html?new=${encodeURIComponent(type.value)}`; };
    type.addEventListener("change", update); update(); leadSearch.append(save);
  }

  const footer = document.querySelector("footer");
  if (footer && !footer.querySelector('a[href="/privacy.html"]')) {
    footer.append(" · ");
    const privacy = document.createElement("a");
    privacy.href = "/privacy.html";
    privacy.textContent = "Prywatność i cookies";
    footer.append(privacy);
  }
})();
