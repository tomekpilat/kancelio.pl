# Plan marketingowy Kancelio.pl

Aktualizacja: 2026-08-17

## 1. Decyzja

Kancelio jest gotowe do kontrolowanego pilotażu, ale nie do szerokiego skalowania reklam. Produkt ma już wartościowy rdzeń: kalkulatory, checklisty całych procesów, prywatne sprawy, współdzielenie zadań i dokumentów oraz katalog kancelarii i specjalistów. Przed większym budżetem trzeba domknąć pomiar, zaufanie i podaż specjalistów w jednym mieście.

Rekomendowany punkt wejścia to jeden proces:

> Sprzedaż mieszkania lub domu — od wyceny i dokumentów do aktu, przekazania kluczy i przepisania mediów.

To jest wyróżnik lepszy niż pozycjonowanie Kancelio jako kolejnego kalkulatora taksy lub katalogu firm.

## 2. Pozycjonowanie marki

### Obietnica

**Kancelio pomaga ogarnąć całą sprawę, a nie tylko jeden dokument lub wizytę u notariusza.**

### Komunikat dla klienta

- dowiesz się, co zrobić i w jakiej kolejności;
- policzysz orientacyjne koszty;
- zbierzesz dokumenty i zadania w jednym miejscu;
- zaprosisz drugą stronę;
- znajdziesz właściwego specjalistę na właściwym etapie.

### Komunikat dla specjalisty

- profil trafia do klienta z konkretną potrzebą i kontekstem sprawy;
- specjalista wybiera obsługiwane procesy, etapy i miasta;
- kontakt jest chroniony przed automatycznym pobieraniem;
- na początku publikacja profilu jest bezpłatna.

## 3. Co musi być gotowe przed płatnym ruchem

### Priorytet P0

1. Potwierdzić działanie obu stron specjalistów po wdrożeniu Coolify.
2. Skonfigurować Google Search Console, przesłać sitemapę i sprawdzić indeksację wszystkich publicznych stron.
3. Naprawić przekazywanie parametrów zdarzeń do GA4. Obecne `track(name)` ignoruje drugi argument, więc nie zapisuje rodzaju sprawy, profesji ani etapu.
4. Oznaczyć w GA4 jako kluczowe zdarzenia:
   - `calculator_complete`;
   - `client_case_created`;
   - `specialist_contact_revealed`;
   - `office_contact_reveal`;
   - `specialist_profile_saved`.
5. Wprowadzić ręczną moderację i prosty status „zweryfikowany”. Przed promocją katalogu powinno działać minimum 15 zweryfikowanych profili w pierwszym mieście, w tym po 3–5 w najważniejszych kategoriach dla sprzedaży nieruchomości.
6. Dodać widoczne strony „O Kancelio”, „Kontakt” i „Jak weryfikujemy specjalistów” oraz wskazać osoby merytorycznie sprawdzające treści prawne i podatkowe.
7. Przetestować cały lejek na telefonie: wejście z Google → kalkulator → checklista → zapisanie sprawy → wyszukanie specjalisty → odsłonięcie kontaktu.

Google zaleca przede wszystkim unikalne, aktualne i pomocne treści tworzone dla ludzi, z jasną strukturą i wiarygodnymi źródłami. Zmiany SEO mogą przynosić efekt od kilku godzin do kilku miesięcy, dlatego nie należy oceniać ich po kilku dniach: [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## 4. Lejek i pomiar

### Główny lejek klienta

1. Wejście na stronę procesu.
2. Rozpoczęcie kalkulatora.
3. Ukończenie kalkulatora.
4. Otwarcie checklisty lub wyszukiwarki.
5. Utworzenie sprawy.
6. Dodanie zadania albo dokumentu.
7. Zaproszenie drugiej strony.
8. Wyszukanie specjalisty.
9. Odsłonięcie kontaktu.

### Lejek specjalisty

1. Wejście na „Dla specjalistów”.
2. Rejestracja.
3. Uzupełnienie profilu.
4. Publikacja profilu.
5. Weryfikacja przez Kancelio.
6. Wyświetlenie w wynikach.
7. Odsłonięcie kontaktu przez klienta.

### North Star Metric

**Liczba tygodniowych spraw, w których użytkownik wykonał wartościową czynność:** utworzył sprawę i dodał dokument/zadanie albo odsłonił kontakt zweryfikowanego specjalisty.

### Progi pilotażowe — hipotezy do walidacji

Nie są to benchmarki rynkowe. To progi decyzyjne dla pierwszych 500–1000 sesji o wysokiej intencji:

| Wskaźnik | Minimalny próg pilotażu |
| --- | ---: |
| ukończenie kalkulatora / rozpoczęcie | 35% |
| przejście z wyniku do checklisty lub wyszukiwarki | 15% |
| utworzenie sprawy / ukończenie kalkulatora | 5% |
| odsłonięcie kontaktu / wyszukanie specjalisty | 8% |
| publikacja profilu / rozpoczęta rejestracja specjalisty | 40% |
| powrót użytkownika do sprawy w 14 dni | 15% |

Jeżeli dwa kolejne tygodnie są poniżej progów, nie zwiększamy budżetu. Najpierw poprawiamy komunikat, stronę docelową lub krok, na którym użytkownicy odpadają.

Google Analytics pozwala oznaczyć zdarzenia biznesowe jako kluczowe i użyć ich później do oceny kanałów oraz kampanii: [GA4 key events](https://support.google.com/analytics/answer/13128484).

## 5. Strategia SEO

### Obecny stan

Mocne strony:

- osobne strony głównych procesów;
- unikalne tytuły i opisy większości stron;
- canonicale na najważniejszych stronach contentowych;
- sitemap i robots.txt;
- treści obejmujące etapy po czynności notarialnej;
- część stron ma zdjęcia i metadane Open Graph;
- prywatny panel klienta jest wyłączony z indeksowania.

Najważniejsze braki:

- tylko jedna strona ma dane strukturalne JSON-LD;
- katalogi są ładowane w przeglądarce i nie mają indeksowalnych stron pojedynczych profili;
- brakuje stron procesu dla wielu pytań o wysokiej intencji;
- część publicznych stron nie ma canonicala;
- brakuje jawnej polityki redakcyjnej, autorów i recenzentów merytorycznych;
- nie ma statycznych stron miasto + usługa opartych o realną podaż;
- stary `kalkulator.html` może konkurować z nową stroną główną, jeśli nie ma jednoznacznego canonicala lub przekierowania.

### Architektura treści

#### Klaster 1 — sprzedaż mieszkania lub domu

- sprzedaż mieszkania krok po kroku;
- dokumenty do sprzedaży mieszkania z rynku wtórnego;
- dokumenty do sprzedaży domu i działki;
- świadectwo energetyczne przy sprzedaży;
- protokół zdawczo-odbiorczy i stany liczników;
- przepisanie prądu, gazu, internetu i zgłoszenie do zarządcy;
- podatek PIT po sprzedaży nieruchomości;
- sprzedaż nieruchomości z kredytem i hipoteką;
- sprzedaż odziedziczonej lub darowanej nieruchomości;
- koszty sprzedającego i kupującego.

#### Klaster 2 — najem okazjonalny

- najem okazjonalny krok po kroku;
- oświadczenie najemcy i lokal zastępczy;
- zgłoszenie umowy do urzędu skarbowego;
- dokumenty właściciela lokalu zastępczego;
- zakończenie najmu i protokół odbioru.

#### Klaster 3 — spadek

- odrzucenie spadku: termin, koszt i dokumenty;
- odrzucenie spadku w imieniu dziecka;
- notariusz czy sąd;
- poświadczenie dziedziczenia;
- nieruchomość w spadku: księga wieczysta, podatek i sprzedaż.

### Strony lokalne

Strony typu „agent nieruchomości Warszawa” lub „rzeczoznawca Kraków do sprzedaży mieszkania” tworzymy dopiero wtedy, gdy w danym mieście istnieją zweryfikowane profile i unikalna treść. Nie publikujemy setek pustych kombinacji miasto × zawód.

Docelowo każdy publiczny profil powinien mieć stabilny URL, unikalny opis, obsługiwane procesy i etapy oraz odpowiednie dane strukturalne. Google opisuje `LocalBusiness` jako sposób przekazania wyszukiwarce m.in. nazwy, adresu i szczegółów lokalnej firmy; wdrożenie trzeba walidować w Rich Results Test: [LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business).

### Standard artykułu

Każda strona procesu powinna zawierać:

- jednoznaczną odpowiedź na pytanie użytkownika na początku;
- interaktywną checklistę albo kalkulator;
- dokumenty, etapy, koszty i typowe błędy;
- datę aktualizacji;
- podstawę prawną i linki do źródeł urzędowych;
- autora i recenzenta merytorycznego;
- FAQ wynikające z rzeczywistych zapytań Search Console;
- CTA do zapisania sprawy oraz znalezienia właściwego specjalisty.

Zdjęcia powinny być osadzone przez standardowe `<img>`, mieć opisowy `alt`, warianty responsywne i znajdować się przy związanej z nimi treści. To pomaga zarówno użytkownikom, jak i wyszukiwarce: [Google image SEO](https://developers.google.com/search/docs/appearance/google-images).

## 6. Plan kanałów

### 1. SEO i treści — główny silnik popytu

- publikować 2 mocne strony/artykuły tygodniowo przez 12 tygodni;
- aktualizować je na podstawie zapytań z Search Console;
- zdobywać linki z blogów agentów, rzeczoznawców, kancelarii i portali lokalnych;
- zamiast ogólnych porad tworzyć narzędzia, wzory i checklisty, które warto zachować lub udostępnić.

### 2. Partnerstwa — najpierw podaż, potem ruch

- zacząć od Warszawy albo miasta, w którym najłatwiej pozyskać 15–25 aktywnych profili;
- co tydzień zaprosić ręcznie 30 dopasowanych specjalistów;
- zaoferować bezpłatny profil za informację zwrotną i zgodę na oznaczenie „profil pilotażowy/zweryfikowany”;
- przygotować zestaw partnerski: opis korzyści, krótki film, grafika i gotowy link do profilu;
- poprosić partnerów o link z ich strony do checklisty procesu, nie tylko do strony głównej.

### 3. Google Search Ads — mały test wysokiej intencji

Uruchomić dopiero po spełnieniu P0. Pierwsze kampanie:

- kalkulator kosztów notarialnych sprzedaż mieszkania;
- dokumenty do sprzedaży mieszkania;
- sprzedaż mieszkania krok po kroku;
- protokół zdawczo-odbiorczy mieszkania;
- przepisanie mediów po sprzedaży;
- specjalista + miasto wyłącznie tam, gdzie są profile.

Budżet testowy: 50–100 zł dziennie przez minimum 14 dni. Każda grupa reklam prowadzi do strony dokładnie odpowiadającej zapytaniu. Wykluczamy frazy o pracy, studiach, darmowych poradach prawnych i niezwiązanych wzorach.

Keyword Planner pozwala filtrować pomysły według liczby wyszukiwań, konkurencji, stawek i lokalizacji. Prognozy są aktualizowane codziennie i uwzględniają sezonowość, dlatego powinny być punktem startowym, nie obietnicą wyniku: [Keyword Planner](https://support.google.com/google-ads/answer/7337243).

### 4. Meta Ads — nie jako pierwszy kanał

Nie zwiększać obecnie budżetu na zimny ruch z Meta. Intencja użytkownika jest silniejsza w Google Search, u partnerów i w treściach odpowiadających na konkretne pytanie. Meta można później wykorzystać do:

- promocji użytecznego wzoru lub checklisty;
- krótkich filmów edukacyjnych;
- przypominania osobom, które rozpoczęły proces, jeżeli zostanie wdrożona zgodna prawnie zgoda reklamowa.

Obecny mechanizm cookies celowo nie udziela zgody na reklamowe przechowywanie ani personalizację, więc przed remarketingiem potrzebna byłaby osobna decyzja prawna i produktowa.

### 5. PR i społeczności

- publikować dane zagregowane, np. „najczęściej pomijany etap po sprzedaży mieszkania”, bez ujawniania danych użytkowników;
- przygotować eksperckie komentarze ze zweryfikowanymi partnerami;
- dystrybuować checklisty w grupach lokalnych tylko jako pomocną odpowiedź, bez masowego spamu;
- budować newsletter „Jedna rzecz do ogarnięcia w tym tygodniu” dopiero po dodaniu świadomego zapisu i obsługi zgód.

## 7. Harmonogram 12 tygodni

### Tydzień 1–2: fundament

- wdrożenie i test całego lejka;
- Search Console, GA4 i kluczowe zdarzenia;
- naprawa parametrów analitycznych;
- dashboard tygodniowy;
- strony zaufania i proces moderacji;
- badanie słów kluczowych dla trzech klastrów.

### Tydzień 3–4: podaż i dowód wartości

- wybór pierwszego miasta;
- 15–25 zweryfikowanych profili;
- 5 rozmów z klientami i 10 ze specjalistami;
- poprawa formularza na podstawie porzuceń;
- dwa pierwsze case studies lub cytaty partnerów.

### Tydzień 5–8: content i dystrybucja

- 8 stron wysokiej intencji dla sprzedaży nieruchomości;
- 4 wzory/checklisty do zapisania lub udostępnienia;
- linkowanie wewnętrzne: artykuł → kalkulator → sprawa → specjalista;
- 10 partnerstw linkowych lub merytorycznych;
- pierwsze indeksowalne strony profili.

### Tydzień 8–10: płatna walidacja

- Google Search Ads 50–100 zł dziennie;
- osobne kampanie według intencji;
- cotygodniowe wykluczanie nietrafionych zapytań;
- porównanie kosztu utworzonej sprawy i odsłoniętego kontaktu, nie samego kliknięcia.

### Tydzień 11–12: decyzja o skalowaniu

- porównanie SEO, partnerstw i reklam;
- wywiady z osobami, które utworzyły sprawę, ale nie skontaktowały się ze specjalistą;
- utrzymanie tylko kanałów spełniających progi;
- decyzja: drugie miasto albo drugi proces, ale nie oba jednocześnie.

## 8. Budżet

### Wariant właścicielski: 1–3 tys. zł miesięcznie

- większość treści i partnerstw wykonywana wewnętrznie;
- 1–1,5 tys. zł na Search Ads;
- reszta na korektę prawną/merytoryczną, grafiki i narzędzia.

### Wariant walidacyjny: 6–10 tys. zł miesięcznie

- 2–4 tys. zł na eksperckie treści i redakcję;
- 2–3 tys. zł na Search Ads;
- 1–2 tys. zł na pozyskanie i obsługę partnerów;
- pozostała część na analitykę, grafiki i testy konwersji.

Budżetu nie zwiększamy, dopóki nie znamy kosztu utworzonej aktywnej sprawy oraz kosztu odsłonięcia kontaktu zweryfikowanego specjalisty.

## 9. Raport tygodniowy

Raport powinien mieścić się na jednej stronie:

1. sesje organiczne i płatne;
2. zapytania, pozycje i CTR z Search Console;
3. ukończone kalkulatory;
4. utworzone sprawy;
5. aktywne sprawy;
6. wyszukania i odsłonięcia kontaktów;
7. rejestracje, opublikowane i zweryfikowane profile;
8. koszt aktywnej sprawy i koszt odsłonięcia kontaktu według kanału;
9. trzy największe miejsca utraty użytkowników;
10. jedna hipoteza testowana w kolejnym tygodniu.

Core Web Vitals należy kontrolować osobno dla mobile i desktop. Docelowe progi Google to LCP do 2,5 s, INP do 200 ms i CLS do 0,1 dla co najmniej 75% wizyt: [Web Vitals](https://web.dev/articles/vitals).

## 10. Kryteria gotowości do skalowania

Kancelio można promować szerzej dopiero, gdy jednocześnie:

- wszystkie P0 są zakończone;
- jedno miasto ma wystarczającą liczbę zweryfikowanych specjalistów;
- przez cztery tygodnie działa poprawny pomiar lejka;
- co najmniej dwa kanały dostarczają aktywne sprawy lub odsłonięcia kontaktu w akceptowalnym koszcie;
- istnieją dowody zaufania: profile zweryfikowane, źródła, recenzenci i pierwsze opinie;
- proces sprzedaży nieruchomości ma co najmniej 8–12 wysokiej jakości stron odpowiadających na różne intencje;
- strona przechodzi testy wydajności i cały lejek mobilny bez błędów.

Najważniejsza zasada: najpierw udowodnić, że Kancelio prowadzi użytkownika od pytania do wykonanej czynności, a dopiero potem kupować większy ruch.
