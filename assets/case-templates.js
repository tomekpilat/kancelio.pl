(function () {
  "use strict";

  const item = (key, itemType, category, title, description, source) => ({
    key, itemType, category, title, description, source,
  });

  const official = {
    landRegister: "https://ekw.ms.gov.pl/eukw_ogol/menu.do",
    energy: "https://www.gov.pl/web/rozwoj-technologia/swiadectwa-charakterystyki-energetycznej--obowiazki-od-wielu-lat",
    pitSale: "https://www.podatki.gov.pl/podatki-osobiste/pit/informacje-podstawowe/co-jest-opodatkowane/zbycie-nieruchomosci",
    lease: "https://www.podatki.gov.pl/pit/abc-pit/najem-prywatny/",
    inheritance: "https://www.gov.pl/web/sprawiedliwosc/sprawy-spadkowe",
  };

  const templates = {
    sale: {
      label: "Sprzedaż mieszkania lub domu", service: "sale", calculator: "/", directoryLabel: "notariusza do sprzedaży",
      items: [
        item("sale_strategy", "task", "preparation", "Wybierz sposób sprzedaży", "Porównaj sprzedaż samodzielną z umową pośrednictwa: prowizję, wyłączność, okres wypowiedzenia, zakres zdjęć, ogłoszeń i prezentacji."),
        item("sale_price", "task", "preparation", "Ustal cenę i warunki oferty", "Zbierz porównywalne oferty, określ wyposażenie pozostające w nieruchomości i minimalne akceptowalne warunki."),
        item("identity", "document", "documents", "Dokumenty tożsamości stron", "Dowody osobiste lub paszporty oraz dane małżonków, pełnomocników lub reprezentantów."),
        item("land_register", "document", "documents", "Numer i aktualna treść księgi wieczystej", "Sprawdź właścicieli, hipoteki, służebności i wzmianki w Elektronicznych Księgach Wieczystych.", official.landRegister),
        item("acquisition", "document", "documents", "Podstawa nabycia nieruchomości", "Akt notarialny, postanowienie sądu, akt poświadczenia dziedziczenia lub inny dokument własności."),
        item("property_certificates", "document", "documents", "Zaświadczenia dotyczące lokalu, domu lub gruntu", "Zakres zależy od nieruchomości: mogą być potrzebne dokumenty ze spółdzielni, wspólnoty, gminy, ewidencji gruntów albo planowania przestrzennego."),
        item("mortgage", "document", "documents", "Dokumenty banku przy hipotece", "Uzyskaj aktualne saldo, warunki spłaty i zgodę na wykreślenie hipoteki albo promesę banku."),
        item("energy_certificate", "document", "documents", "Świadectwo charakterystyki energetycznej", "Przy sprzedaży budynku lub lokalu sprzedający co do zasady przekazuje kupującemu odpowiednie świadectwo.", official.energy),
        item("preliminary_terms", "task", "transaction", "Ustal zadatek, terminy i warunki", "Zapisz cenę, sposób finansowania, termin umowy końcowej, wydania oraz skutki niespełnienia warunków."),
        item("buyer_financing", "document", "transaction", "Potwierdź finansowanie kupującego", "Przy kredycie ustal dokumenty banku, rachunki do spłaty zobowiązań i sposób uruchomienia środków."),
        item("notary_draft", "task", "transaction", "Przekaż dokumenty i przeczytaj projekt aktu", "Wyślij komplet wcześniej, sprawdź dane, cenę, rachunki, terminy wydania i odpowiedzialność stron."),
        item("handover_protocol", "document", "aftercare", "Podpisz protokół przekazania", "Zapisz datę i godzinę, stany liczników, liczbę kluczy, wyposażenie, zauważone usterki oraz wykonaj zdjęcia."),
        item("utilities", "task", "aftercare", "Przepisz lub zamknij umowy na media", "Energia, gaz, woda, ogrzewanie, internet, telewizja i inne usługi. Zachowaj potwierdzenia oraz końcowe odczyty."),
        item("manager_notice", "task", "aftercare", "Powiadom zarządcę, wspólnotę lub spółdzielnię", "Przekaż datę zmiany właściciela, dane do rozliczenia opłat i protokół liczników, jeśli jest wymagany."),
        item("insurance", "task", "aftercare", "Rozlicz ubezpieczenie nieruchomości", "Powiadom ubezpieczyciela i ustal rozwiązanie, zwrot składki lub dalsze obowiązywanie ochrony."),
        item("pit_check", "task", "aftercare", "Sprawdź obowiązek PIT po sprzedaży", "Sprzedaż przed upływem ustawowego okresu może wymagać rozliczenia PIT-39; sprawdź datę nabycia i możliwą ulgę mieszkaniową.", official.pitSale),
      ],
    },
    preliminary_sale: {
      label: "Umowa przedwstępna nieruchomości", service: "preliminary_sale", calculator: "/umowa-przedwstepna.html", directoryLabel: "notariusza do umowy przedwstępnej",
      items: [
        item("property_search", "task", "preparation", "Zweryfikuj ofertę i pośrednika", "Sprawdź zakres umowy pośrednictwa, prowizję, źródło oferty oraz tożsamość osoby prezentującej nieruchomość."),
        item("technical_review", "task", "preparation", "Sprawdź stan techniczny i koszty utrzymania", "Rozważ oględziny ze specjalistą, poproś o rachunki, informacje o remontach, funduszu remontowym i planowanych inwestycjach."),
        item("identity", "document", "documents", "Dokumenty tożsamości i reprezentacji", "Uwzględnij stan cywilny, pełnomocnictwa i sposób reprezentacji stron."),
        item("land_register", "document", "documents", "Numer księgi wieczystej", "Sprawdź właścicieli, hipoteki, roszczenia, służebności i wzmianki.", official.landRegister),
        item("acquisition", "document", "documents", "Podstawa nabycia przez sprzedającego", "Poprzedni akt, orzeczenie sądu, akt poświadczenia dziedziczenia albo inny dokument."),
        item("property_docs", "document", "documents", "Dokumenty lokalu, domu lub gruntu", "Ustal z kancelarią dokumenty ze spółdzielni, gminy, ewidencji gruntów i planowania przestrzennego."),
        item("credit_capacity", "task", "preparation", "Sprawdź finansowanie przed zobowiązaniem", "Ustal wkład własny, warunki banku i bezpieczny termin na decyzję kredytową."),
        item("deposit", "task", "transaction", "Wybierz zadatek albo zaliczkę", "Zapisz kwotę, termin zapłaty, skutki rezygnacji i sytuacje niezależne od stron."),
        item("conditions", "task", "transaction", "Zapisz warunki umowy końcowej", "Cena, termin, finansowanie, wykreślenie hipoteki, opróżnienie nieruchomości, dokumenty i wydanie."),
        item("agreement_form", "task", "transaction", "Wybierz formę umowy", "Porównaj zwykłą formę pisemną z aktem notarialnym i omów możliwość ujawnienia roszczenia w księdze wieczystej."),
        item("final_documents", "document", "transaction", "Uzupełnij dokumenty do aktu sprzedaży", "Po umowie przedwstępnej monitoruj ważność zaświadczeń i warunki banku."),
        item("final_deadline", "task", "aftercare", "Monitoruj warunki i termin umowy końcowej", "Przypisz osobom zadania, terminy dostarczenia dokumentów i potwierdzenia wykonania warunków."),
      ],
    },
    occasional_lease: {
      label: "Najem okazjonalny", service: "occasional_lease", calculator: "/najem-okazjonalny.html", directoryLabel: "notariusza do najmu okazjonalnego",
      items: [
        item("eligibility", "task", "preparation", "Sprawdź, czy najem okazjonalny pasuje do umowy", "Zweryfikuj strony, przeznaczenie mieszkalne i wymagany okres umowy; wątpliwości potwierdź z prawnikiem lub notariuszem."),
        item("lease", "document", "documents", "Umowa najmu", "Uzgodnij czynsz, opłaty, kaucję, czas trwania, wypowiedzenie, naprawy i zasady korzystania z lokalu."),
        item("identity", "document", "documents", "Dane i dokument tożsamości najemcy", "Przygotuj również dane osób, które mają zamieszkać w lokalu."),
        item("alternative_address", "document", "documents", "Wskazanie lokalu zastępczego", "Najemca wskazuje lokal, do którego będzie mógł się przenieść w razie wykonania obowiązku opróżnienia lokalu."),
        item("owner_consent", "document", "documents", "Zgoda właściciela lokalu zastępczego", "Ustal wymaganą formę i czy podpis właściciela ma zostać poświadczony."),
        item("notarial_statement", "document", "transaction", "Oświadczenie najemcy u notariusza", "Najemca poddaje się egzekucji i zobowiązuje do opróżnienia oraz wydania lokalu."),
        item("deposit", "task", "transaction", "Rozlicz kaucję i pierwsze płatności", "Zachowaj potwierdzenia przelewów i jasno opisz, co obejmuje każda kwota."),
        item("handover", "document", "transaction", "Protokół przekazania lokalu", "Dodaj stany liczników, listę wyposażenia i kluczy oraz zdjęcia stanu lokalu."),
        item("tax_office", "document", "aftercare", "Zgłoszenie umowy do urzędu skarbowego", "Właściciel powinien pilnować ustawowego terminu licznego od rozpoczęcia najmu i zachować potwierdzenie zgłoszenia.", official.lease),
        item("utilities", "task", "aftercare", "Ustal rozliczanie mediów i usług", "Zapisz, kto zgłasza liczniki, zawiera umowy i opłaca energię, gaz, wodę, internet oraz opłaty administracyjne."),
        item("insurance", "document", "aftercare", "Sprawdź ubezpieczenie", "Ustal zakres polisy właściciela i ewentualnego OC najemcy."),
        item("expiry", "task", "aftercare", "Monitoruj termin umowy i załączników", "Przed przedłużeniem sprawdź aktualność wskazania lokalu oraz wymaganych oświadczeń."),
      ],
    },
    inheritance_rejection: {
      label: "Odrzucenie lub przyjęcie spadku", service: "inheritance_rejection", calculator: "/odrzucenie-spadku.html", directoryLabel: "notariusza do sprawy spadkowej",
      items: [
        item("deadline", "task", "preparation", "Ustal i zapisz termin na oświadczenie", "Zanotuj, kiedy dowiedziałeś się o tytule powołania do spadku; termin wymaga indywidualnej oceny.", official.inheritance),
        item("succession_order", "task", "preparation", "Ustal podstawę i kolejność dziedziczenia", "Sprawdź testament, pokrewieństwo oraz wcześniejsze oświadczenia innych spadkobierców."),
        item("identity", "document", "documents", "Dokument tożsamości", "Dowód osobisty lub paszport osoby składającej oświadczenie."),
        item("death_certificate", "document", "documents", "Odpis aktu zgonu", "Uzyskaj właściwy odpis z urzędu stanu cywilnego lub dostępnej usługi publicznej."),
        item("relationship_docs", "document", "documents", "Dokumenty potwierdzające pokrewieństwo", "W zależności od sprawy mogą być potrzebne akty urodzenia, małżeństwa lub zmiany nazwiska."),
        item("testament", "document", "documents", "Testament lub informacje o dziedziczeniu ustawowym", "Przekaż oryginał testamentu, jeśli istnieje, oraz dane znanych spadkobierców."),
        item("prior_statements", "document", "documents", "Wcześniejsze oświadczenia spadkowe", "Zbierz wypisy aktów lub informacje o oświadczeniach złożonych przez osoby dziedziczące wcześniej."),
        item("minor", "task", "transaction", "Sprawdź sytuację małoletnich", "Jeśli skutki oświadczenia przechodzą na dziecko, niezwłocznie ustal wymaganą procedurę i reprezentację."),
        item("statement", "document", "transaction", "Złóż oświadczenie i zachowaj wypis", "Potwierdź właściwość notariusza lub sądu oraz zachowaj dokument do dalszych czynności."),
        item("family_followup", "task", "aftercare", "Poinformuj kolejne osoby i zaplanuj dalsze kroki", "Odrzucenie może zmienić kolejność dziedziczenia. Ustal, kto następny powinien sprawdzić swój termin."),
      ],
    },
    donation: {
      label: "Darowizna nieruchomości", service: "donation", calculator: "/", directoryLabel: "notariusza do darowizny",
      items: [
        item("intent", "task", "preparation", "Ustal zakres darowizny i zabezpieczenia", "Omów udział, służebność mieszkania, prawo użytkowania, polecenia i skutki dla przyszłego spadku."),
        item("tax_group", "task", "preparation", "Sprawdź pokrewieństwo i skutki podatkowe", "Przygotuj informacje o relacji stron i wcześniejszych darowiznach."),
        item("identity", "document", "documents", "Dokumenty tożsamości stron", "Dane darczyńcy, obdarowanego, małżonków i pełnomocników."),
        item("land_register", "document", "documents", "Numer księgi wieczystej", "Sprawdź aktualną treść, hipoteki, służebności i wzmianki.", official.landRegister),
        item("acquisition", "document", "documents", "Podstawa nabycia przez darczyńcę", "Akt notarialny, orzeczenie, APD lub inny dokument własności."),
        item("property_docs", "document", "documents", "Dokumenty nieruchomości", "Zakres potwierdzi kancelaria zależnie od lokalu, domu, gruntu, sposobu nabycia i obciążeń."),
        item("act_review", "task", "transaction", "Przeczytaj projekt aktu i obowiązki stron", "Sprawdź opis nieruchomości, prawa zastrzeżone dla darczyńcy, koszty i termin wydania."),
        item("handover", "document", "aftercare", "Udokumentuj wydanie nieruchomości", "Jeśli zmienia się osoba korzystająca, sporządź protokół, odczyty liczników i przekaż klucze."),
        item("utilities", "task", "aftercare", "Zaktualizuj media, zarządcę i ubezpieczenie", "Powiadom dostawców, wspólnotę lub spółdzielnię, urząd gminy oraz ubezpieczyciela odpowiednio do sytuacji."),
        item("tax_confirmation", "document", "aftercare", "Zachowaj potwierdzenie rozliczenia podatkowego", "Notariusz zwykle wykonuje część obowiązków przy akcie; potwierdź, czy pozostają dodatkowe zgłoszenia."),
      ],
    },
    power: {
      label: "Pełnomocnictwo notarialne", service: "power", calculator: "/", directoryLabel: "notariusza do pełnomocnictwa",
      items: [
        item("purpose", "task", "preparation", "Ustal dokładny cel pełnomocnictwa", "Wypisz czynności, instytucje, przedmiot sprawy, ograniczenia kwotowe i wymagane zgody."),
        item("institution_draft", "document", "preparation", "Poproś o wymagania lub wzór instytucji", "Bank, sąd, urząd albo zagraniczny odbiorca może wymagać konkretnej treści, formy, apostille lub tłumaczenia."),
        item("identity", "document", "documents", "Dokument tożsamości mocodawcy", "Oryginał dokumentu na wizytę."),
        item("representative", "document", "documents", "Pełne dane pełnomocnika", "Imiona, nazwisko, PESEL, adres i inne dane wymagane dla konkretnej czynności."),
        item("subject", "document", "documents", "Dane przedmiotu sprawy", "Np. numer księgi wieczystej, rachunku, pojazdu, spółki lub postępowania."),
        item("scope_review", "task", "transaction", "Sprawdź zakres, czas i dalsze pełnomocnictwa", "Ustal możliwość substytucji, datę wygaśnięcia oraz sposób odwołania."),
        item("original_delivery", "task", "aftercare", "Przekaż właściwy dokument pełnomocnikowi", "Ustal, gdzie wymagany jest oryginał, wypis albo tłumaczenie."),
        item("revocation", "task", "aftercare", "Zaplanuj odwołanie i powiadomienia", "Po odwołaniu odbierz dokumenty i poinformuj pełnomocnika oraz instytucje, w których był używany."),
      ],
    },
    will: {
      label: "Testament", service: "will", calculator: "/", directoryLabel: "notariusza do testamentu",
      items: [
        item("goals", "task", "preparation", "Spisz cele, nie gotowy tekst aktu", "Zanotuj, kogo chcesz zabezpieczyć i jakie sytuacje chcesz uregulować; treść prawną ustal z notariuszem."),
        item("family", "document", "preparation", "Przygotuj informacje o sytuacji rodzinnej", "Małżonek, dzieci, wcześniejsze związki, osoby wymagające opieki i potencjalni spadkobiercy ustawowi."),
        item("identity", "document", "documents", "Dokument tożsamości", "Oryginał dokumentu osoby sporządzającej testament."),
        item("beneficiaries", "document", "documents", "Dane wskazywanych osób", "Imiona, nazwiska, daty urodzenia, PESEL i relacja, jeśli są znane."),
        item("assets", "document", "documents", "Lista najważniejszych składników majątku", "Nieruchomości, firmy, rachunki i przedmioty, które mogą wymagać szczególnego uregulowania."),
        item("special_wishes", "task", "transaction", "Omów zapisy, wykonawcę i szczególne decyzje", "Notariusz pomoże dobrać rozwiązania i wyjaśnić skutki, w tym ryzyko sporów lub zachowku."),
        item("notary_visit", "document", "transaction", "Sporządź testament i zachowaj informacje o akcie", "Nie udostępniaj niepotrzebnie treści; zapisz kancelarię i datę dokumentu w bezpiecznym miejscu."),
        item("trusted_person", "task", "aftercare", "Poinformuj zaufaną osobę, gdzie szukać testamentu", "Nie musisz ujawniać treści. Ustal możliwość rejestracji w odpowiednim rejestrze z notariuszem."),
        item("review", "task", "aftercare", "Wracaj do testamentu po ważnych zmianach", "Małżeństwo, rozwód, narodziny, śmierć bliskiej osoby, sprzedaż majątku lub zmiana miejsca zamieszkania mogą uzasadniać przegląd."),
      ],
    },
  };

  window.KANCELIO_CASE_TEMPLATES = Object.freeze(templates);
})();
