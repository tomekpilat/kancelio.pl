# Publiczny kalkulator kosztów — plan uruchomienia

## Cel i hipoteza

Kalkulator odpowiada na pytanie klienta w momencie wysokiej intencji („ile kosztuje notariusz?”), a Kancelio zamienia anonimowe wejście w zgodny z RODO lead. Jednocześnie narzędzie jest korzyścią dla kancelarii: może kierować do nich osoby, które znają już przybliżony budżet i rodzaj sprawy.

Główne KPI: wejście → rozpoczęcie kalkulacji, kalkulacja → zapis na premierę, udział powracających użytkowników oraz rozkład typów czynności. Nie zapisujemy wartości sprawy ani wyborów bez zgody analitycznej użytkownika.

## Etapy

1. **Tydzień 1 — walidacja:** opublikować statyczny kalkulator z czterema czynnościami, zdarzeniami analitycznymi bez danych osobowych i istniejącym zapisem MailerLite.
2. **Tydzień 2 — kontrola merytoryczna:** zlecić notariuszowi i doradcy podatkowemu przegląd wariantów, tekstów i przypadków brzegowych; dodać datę weryfikacji.
3. **Tydzień 3–4 — SEO:** osobne strony odpowiadające na intencje sprzedaży, darowizny, pełnomocnictwa i testamentu, z FAQ i linkami do źródeł prawa.
4. **Po walidacji MVP — API:** przenieść reguły do wersjonowanego silnika backendowego i wystawić publiczny endpoint tylko do obliczeń.
5. **Po uruchomieniu sieci kancelarii:** CTA „poproś o dokładną wycenę/termin”, routing leada za wyraźną zgodą i widget dla partnerów.

## Docelowa architektura

- `FeeRuleSet` przechowuje reguły, datę obowiązywania, źródło prawne i status publikacji. Opublikowane reguły są niezmienne; korekta tworzy nową wersję.
- Czysta funkcja `calculate(ruleSet, input)` zwraca pozycje, założenia, ostrzeżenia i sumę. Korzystają z niej aplikacja kancelarii i publiczny kalkulator.
- `POST /api/v1/public/fees/calculate` jest bez sesji i przyjmuje wyłącznie typ czynności, kwotę oraz warianty. Nie tworzy sprawy i nie przyjmuje danych stron czynności.
- Endpoint ma walidację schematu, limit wielkości żądania, throttling IP, cache po skrócie wejścia, identyfikator wersji reguł w odpowiedzi i monitoring błędów.
- E-mail trafia osobnym żądaniem do dostawcy listy. Kontekst kalkulacji jest przekazywany dopiero po osobnej, jasnej zgodzie; retencja i podmioty przetwarzające są opisane w polityce prywatności.

Przykładowa odpowiedź API:

```json
{
  "rule_set": "PL-2026-08-17",
  "currency": "PLN",
  "items": [{ "code": "notary_fee_max", "amount": "2195.00" }],
  "total": "2699.85",
  "assumptions": ["Maksymalna taksa", "10 stron, 2 wypisy"],
  "warnings": ["Wynik nie jest ofertą kancelarii"]
}
```

## Zasady zaufania

- Zawsze nazywać taksę „maksymalną”, oddzielać wynagrodzenie notariusza od podatków i opłat przekazywanych instytucjom.
- Pokazywać założenia, wersję reguł, datę ostatniej kontroli i źródła. Zmiany prawa uruchamiają przegląd i nową wersję reguł.
- Nie obiecywać „dokładnego kosztu”. Podatek od darowizny i nietypowe stany prawne kierować do indywidualnej oceny.
- Przed kampanią uzyskać akceptację merytoryczną i sprawdzić komunikację pod kątem zasad wykonywania zawodu oraz reklamy kancelarii.

## Promocja

1. **SEO:** strony „koszt notariusza przy sprzedaży mieszkania”, „koszt darowizny”, „pełnomocnictwo notarialne — koszt” i aktualizowana tabela taksy. Każda strona zawiera kalkulator, krótką odpowiedź, założenia, FAQ oraz autora i datę weryfikacji.
2. **Partnerzy:** widget lub link z UTM dla pośredników, doradców kredytowych, deweloperów i kancelarii. Partner dostaje użyteczne narzędzie, Kancelio — jakościowy ruch i backlink.
3. **Treści eksperckie:** odpowiedzi na realne pytania w społecznościach bez podszywania się pod poradę indywidualną; publikacje aktualizacyjne po zmianie stawek.
4. **Płatne testy:** dopiero po zmierzeniu konwersji organicznej. Mały test reklam w wyszukiwarce na jedną czynność i region, z wykluczeniami oraz limitem kosztu leada.

Co tydzień przeglądamy funnel, błędy formularza i zapytania bez wyniku. Co miesiąc porównujemy konwersję typów czynności. Testy A/B obejmują wyłącznie kolejność i treść CTA — nie ukrywają zastrzeżeń ani kosztów.
