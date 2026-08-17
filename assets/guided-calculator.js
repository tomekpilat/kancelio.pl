(function () {
  "use strict";

  const definition = window.KANCELIO_CALCULATOR;
  if (!definition) return;

  const money = (value) => new Intl.NumberFormat("pl-PL", {
    style: "currency", currency: "PLN", minimumFractionDigits: 2,
  }).format(value);
  const $ = (id) => document.getElementById(id);
  const vat = 0.23;
  let userInteracted = false;

  function maxFee(value) {
    if (value <= 3000) return 100;
    if (value <= 10000) return 100 + 0.03 * (value - 3000);
    if (value <= 30000) return 310 + 0.02 * (value - 10000);
    if (value <= 60000) return 710 + 0.01 * (value - 30000);
    if (value <= 1000000) return 1010 + 0.004 * (value - 60000);
    if (value <= 2000000) return 4770 + 0.002 * (value - 1000000);
    return Math.min(10000, 6770 + 0.0025 * (value - 2000000));
  }

  function currentValues() {
    return {
      value: Math.max(0, Number($("propertyValue")?.value) || 0),
      pages: Math.max(1, Number($("pages")?.value) || 1),
      copies: Math.max(1, Number($("copies")?.value) || 1),
      certifiedConsent: Boolean($("certifiedConsent")?.checked),
    };
  }

  function calculate() {
    const values = currentValues();
    const rows = [];
    let fee = 0;

    if (definition.type === "inheritance_rejection") fee = 50;
    if (definition.type === "occasional_lease") fee = 480.6;
    if (definition.type === "preliminary_sale") fee = maxFee(values.value);

    rows.push([definition.feeLabel || "Maksymalna taksa", fee]);
    rows.push(["VAT 23% od taksy", fee * vat]);

    if (definition.includeCopies) {
      const copies = values.pages * values.copies * 6;
      rows.push([`Wypisy (${values.copies} × ${values.pages} str.)`, copies]);
      rows.push(["VAT 23% od wypisów", copies * vat]);
    }

    if (definition.type === "occasional_lease" && values.certifiedConsent) {
      rows.push(["Poświadczenie podpisu właściciela lokalu zastępczego", 20]);
      rows.push(["VAT 23% od poświadczenia", 20 * vat]);
    }

    return { rows, total: rows.reduce((sum, row) => sum + row[1], 0) };
  }

  function render() {
    const result = calculate();
    $("costRows").replaceChildren(...result.rows.map(([label, value]) => {
      const row = document.createElement("div");
      row.className = "cost-row";
      const name = document.createElement("span");
      name.textContent = label;
      const dots = document.createElement("span");
      dots.className = "dots";
      const amount = document.createElement("strong");
      amount.textContent = money(value);
      row.append(name, dots, amount);
      return row;
    }));
    $("total").textContent = money(result.total);
  }

  function updateLinks() {
    const city = $("directoryCity").value.trim();
    const directoryParams = new URLSearchParams({ service: definition.service });
    const caseParams = new URLSearchParams({ new: definition.type });
    if (city) {
      directoryParams.set("city", city);
      caseParams.set("city", city);
    }
    $("directoryLink").href = `/kancelarie.html?${directoryParams}`;
    $("saveCaseLink").href = `/moje-sprawy.html?${caseParams}`;
  }

  function markInteraction() {
    if (!userInteracted) {
      userInteracted = true;
      window.KancelioAnalytics?.track("calculator_start");
    }
    render();
    window.clearTimeout(markInteraction.timer);
    markInteraction.timer = window.setTimeout(() => {
      window.KancelioAnalytics?.track("calculator_complete");
    }, 700);
  }

  document.querySelectorAll("[data-calculator-input]").forEach((input) => {
    input.addEventListener("input", markInteraction);
    input.addEventListener("change", markInteraction);
  });
  $("directoryCity").addEventListener("input", updateLinks);
  $("saveCaseLink").addEventListener("click", () => window.KancelioAnalytics?.track("case_save_start"));
  render();
  updateLinks();
})();
