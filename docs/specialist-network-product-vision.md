# Kancelio jako koordynator całego procesu — opis funkcjonalności i wizja projektu

## 1. Wizja

Kancelio ma być cyfrowym koordynatorem złożonych spraw życiowych, a nie tylko kalkulatorem opłat ani katalogiem kancelarii. Użytkownik powinien w jednym miejscu:

1. zrozumieć cały proces;
2. policzyć orientacyjne koszty;
3. otrzymać checklistę dokumentów i zadań;
4. zaprosić drugą stronę;
5. przypisać odpowiedzialność;
6. znaleźć właściwego specjalistę dokładnie na potrzebnym etapie;
7. bezpiecznie nawiązać kontakt;
8. doprowadzić sprawę do końca, także po podpisaniu dokumentów.

Docelowa obietnica produktu:

> Kancelio prowadzi Cię przez całą sprawę — pokazuje co, kiedy, z kim i przez kogo trzeba zrobić.

## 2. Problem użytkownika

Przy sprzedaży domu, najmie, darowiźnie lub sprawie spadkowej klient nie potrzebuje jednej usługi. Potrzebuje sekwencji działań wykonywanych przez różne osoby. Informacje są rozproszone między wyszukiwarką, e-mailami, dokumentami, bankiem, urzędem i komunikatorami. Użytkownik często:

- nie wie, jakiego specjalisty potrzebuje;
- szuka go za wcześnie albo za późno;
- nie potrafi przekazać mu kontekstu;
- nie zna zależności między zadaniami;
- gubi dokumenty i terminy;
- nie wie, co pozostaje do wykonania po transakcji.

Zwykły katalog firm odpowiada na pytanie „kto działa w mieście”. Kancelio ma odpowiadać na pytanie „kogo potrzebuję teraz, dlaczego i co powinienem przygotować przed kontaktem”.

## 3. Role

### Klient / właściciel sprawy

- tworzy sprawę;
- widzi checklistę i postęp;
- dodaje dokumenty oraz własne zadania;
- zaprasza uczestników;
- przegląda rekomendowanych specjalistów;
- ujawnia kontakt i komunikuje się poza systemem w wersji pierwszej.

### Uczestnik sprawy

- ma dostęp do udostępnionej sprawy;
- wykonuje przypisane pozycje;
- dodaje potrzebne pliki;
- może korzystać z zakładki specjalistów.

### Specjalista

- zakłada konto e-mailem, hasłem lub przez Google;
- uzupełnia jedną wizytówkę;
- wskazuje profesję, usługi, miasta, sprawy i etapy;
- publikuje, ukrywa, edytuje lub usuwa profil;
- otrzymuje kontakt od klienta świadomego kontekstu sprawy.

### Administrator Kancelio — etap przyszły

- moderuje profile;
- weryfikuje uprawnienia lub dokumenty zawodowe;
- obsługuje zgłoszenia i nadużycia;
- zarządza taksonomią spraw, etapów i specjalizacji;
- analizuje jakość dopasowania bez dostępu do prywatnej treści dokumentów klienta.

## 4. Funkcjonalność dostarczona w pierwszej wersji

### 4.1. Wspólna wyszukiwarka

Filtry:

- miasto lub pełny adres;
- rodzaj sprawy;
- profesja;
- etap procesu.

Wynik zawiera:

- nazwę specjalisty;
- profesję;
- miasto;
- opis;
- konkretne usługi;
- etapy pomocy;
- informację o obsłudze zdalnej;
- przybliżony punkt na mapie;
- stronę internetową;
- przycisk ujawnienia chronionego kontaktu.

Istniejące kancelarie notarialne są prezentowane w tej samej wyszukiwarce. Użytkownik nie musi wiedzieć, że dane pochodzą z dwóch modeli.

### 4.2. Profil specjalisty

Profil łączy tradycyjną wizytówkę z kontekstem procesu. Najważniejsze są nie słowa reklamowe, ale odpowiedzi:

- kim jesteś;
- w jakich sprawach pomagasz;
- na jakim etapie należy się z Tobą skontaktować;
- jakie konkretne usługi wykonujesz;
- gdzie działasz i czy obsługujesz zdalnie.

### 4.3. Specjaliści w sprawie

Każda zapisana sprawa ma sekcję „Specjaliści do tej sprawy”. Rekomendacje są podzielone na zakładki:

1. Przygotowanie;
2. Dokumenty;
3. Umowa i formalności;
4. Po zakończeniu.

Domyślnie otwiera się pierwszy etap z niewykonanymi zadaniami. Każda rekomendacja wyjaśnia, dlaczego dany specjalista może być potrzebny. Link przekazuje do wyszukiwarki rodzaj sprawy, etap, profesję i miasto.

### 4.4. Ochrona kontaktu

E-mail, telefon i adres nie trafiają do publicznego RPC ani HTML. Dostęp wymaga jednorazowego tokenu Turnstile zweryfikowanego po stronie serwera. To ogranicza scraping, nie utrudniając klientowi kontaktu.

## 5. Przykład podróży: sprzedaż mieszkania lub domu

### Przygotowanie

- agent nieruchomości — strategia sprzedaży, oferta i prezentacje;
- rzeczoznawca — niezależna wycena;
- inspektor techniczny — stan nieruchomości i potencjalne ryzyka.

### Dokumenty

- specjalista świadectw energetycznych — obowiązkowe świadectwo;
- prawnik — analiza stanu prawnego lub niestandardowej umowy;
- geodeta — dokumentacja gruntu, granic lub budynku, jeśli potrzebna.

### Transakcja

- notariusz — projekt i podpisanie aktu;
- ekspert kredytowy — finansowanie kupującego i warunki banku;
- prawnik — negocjacje lub złożona struktura transakcji.

### Po transakcji

- doradca podatkowy — PIT-39 i ulga mieszkaniowa;
- doradca ubezpieczeniowy — zakończenie lub zmiana polisy;
- firma przeprowadzkowa — opróżnienie i transport;
- zarządca — rozliczenia administracyjne, protokół i zmiana danych.

W ten sposób strona pozycjonuje się nie tylko na „notariusz sprzedaż mieszkania”, lecz również na pełne spektrum intencji: „co zrobić po sprzedaży mieszkania”, „jak przepisać media”, „odbiór techniczny”, „świadectwo energetyczne”, „PIT-39”, „wycena nieruchomości” i „protokół przekazania”.

## 6. Taksonomia specjalistów

Pierwsza wersja obejmuje:

- notariusza;
- prawnika / radcę prawnego;
- agenta nieruchomości;
- rzeczoznawcę majątkowego;
- inspektora technicznego;
- eksperta kredytowego;
- doradcę podatkowego;
- specjalistę świadectw energetycznych;
- geodetę;
- doradcę ubezpieczeniowego;
- zarządcę nieruchomości;
- firmę przeprowadzkową;
- tłumacza przysięgłego;
- mediatora.

Nową profesję należy dodawać wtedy, gdy występuje w wielu procesach albo w krytycznym, powtarzalnym etapie jednej sprawy. Zbyt szeroka lista bez podaży profili obniża zaufanie do wyszukiwarki.

## 7. Zasady rekomendacji

Pierwsza wersja używa jawnych reguł produktowych zapisanych przy szablonie sprawy. Jest to celowe:

- rekomendacja jest przewidywalna;
- można ją łatwo zrecenzować prawnie i merytorycznie;
- nie wymaga przesyłania prywatnych danych do modelu AI;
- można mierzyć kliknięcia i poprawiać reguły.

Kolejne wersje mogą zwiększać ranking na podstawie:

- zgodności miasta i odległości;
- zgodności rodzaju sprawy;
- zgodności aktualnego etapu;
- kompletności i weryfikacji profilu;
- dostępności;
- czasu odpowiedzi;
- jakości współpracy mierzonej po zakończeniu sprawy.

Nie należy używać ceny jako jedynego kryterium. W procesach prawnych i finansowych ważniejsze są dopasowanie, uprawnienia, doświadczenie i transparentność.

## 8. Docelowy przepływ kontaktu

### Wersja 1 — wdrożona

1. Klient wybiera rekomendację.
2. Otwiera wyniki z gotowymi filtrami.
3. Ujawnia kontakt po Turnstile.
4. Kontaktuje się e-mailem lub telefonicznie.

### Wersja 2 — zapytanie ofertowe

1. Klient wybiera specjalistę.
2. Kancelio pokazuje listę informacji potrzebnych do zapytania.
3. Klient świadomie wybiera zakres danych udostępnianych specjaliście.
4. System tworzy zapytanie powiązane ze sprawą bez przekazywania całego folderu dokumentów.
5. Specjalista odpowiada w systemie lub na zweryfikowany e-mail.

### Wersja 3 — specjalista jako uczestnik sprawy

Po akceptacji klient może zaprosić specjalistę do ograniczonej roli. Dostęp powinien być granularny:

- tylko wskazane zadania;
- tylko przypisane dokumenty;
- termin ważności dostępu;
- historia dostępu i możliwość natychmiastowego cofnięcia;
- brak dostępu do pozostałych uczestników i plików bez dodatkowej zgody.

## 9. Zaufanie, moderacja i bezpieczeństwo

Przed aktywną promocją katalogu należy dodać:

- status profilu: roboczy, oczekujący, zweryfikowany, odrzucony, zawieszony;
- weryfikację e-maila i telefonu;
- dla zawodów regulowanych — numer uprawnienia i ręczną kontrolę;
- przycisk zgłoszenia profilu;
- regulamin publikacji;
- zasady opinii i przeciwdziałania manipulacji;
- rejestr zmian profilu;
- limity tworzenia i edycji chroniące przed spamem;
- monitoring błędów Edge Functions i nietypowych prób odsłaniania kontaktów.

Kancelio nie powinno sugerować, że rekomendacja jest gwarancją jakości. W języku produktu należy używać „możesz potrzebować”, „pasujący profil” i „sprawdź uprawnienia oraz warunki współpracy”.

## 10. Model biznesowy

Rekomendowana kolejność:

### Etap 1 — podaż i jakość katalogu

- bezpłatne profile;
- ręczny onboarding pierwszych specjalistów;
- treści SEO i lokalne strony kategorii;
- mierzenie wyszukań bez wyniku.

### Etap 2 — profil rozszerzony

- dodatkowe miasta i obszary;
- portfolio, certyfikaty, dostępność;
- weryfikacja konta;
- statystyki wyświetleń i kontaktów;
- priorytet wyłącznie po zachowaniu jasnego oznaczenia reklamy.

### Etap 3 — płatność za wartość

- abonament za panel leadów;
- opłata za kwalifikowane zapytanie, nie za samo wyświetlenie;
- narzędzia CRM i szablony odpowiedzi;
- integracje kalendarza;
- płatności lub rezerwacje dla usług o standardowym zakresie.

Nie należy zaczynać od aukcji pozycji w wynikach. Bez wystarczającej podaży i danych o jakości osłabiłoby to podstawową obietnicę dopasowania.

## 11. Kierunek SEO

Architektura treści powinna łączyć trzy wymiary:

1. proces — np. sprzedaż mieszkania;
2. etap lub zadanie — np. świadectwo energetyczne, protokół przekazania;
3. specjalista i lokalizacja — np. rzeczoznawca majątkowy Warszawa.

Docelowe klastry:

- `/procesy/sprzedaz-nieruchomosci/`
- `/procesy/sprzedaz-nieruchomosci/swiadectwo-energetyczne/`
- `/specjalisci/rzeczoznawca-majatkowy/warszawa/`
- `/specjalisci/doradca-podatkowy/pit-39/`
- `/poradniki/przepisanie-mediow-po-sprzedazy/`

Każda strona powinna prowadzić do kalkulatora, checklisty, założenia sprawy i gotowej wyszukiwarki specjalistów. Treści muszą odpowiadać na realne pytania procesu, a nie być automatycznie generowanymi kopiami nazw miast.

## 12. Metryki produktu

Najważniejsze:

- odsetek spraw, w których otwarto zakładkę specjalistów;
- przejście z rekomendacji do wyników;
- liczba wyników na kombinację sprawa × etap × miasto;
- odsetek wyszukań bez wyniku;
- ujawnienie kontaktu / wyświetlenie wyniku;
- kontakt / utworzona sprawa;
- kompletność profilu specjalisty;
- czas od rejestracji do publikacji profilu;
- powracalność klienta do sprawy po pierwszym kontakcie;
- zakończenie procesu i liczba ukończonych etapów.

Metryki nie mogą zawierać nazw spraw, kwot, adresów, e-maili ani treści dokumentów.

## 13. Plan rozwoju

### Teraz

- uruchomić migrację i Edge Function;
- przetestować cały przepływ produkcyjny;
- pozyskać po 3–5 profili dla najważniejszych profesji w pierwszym mieście;
- obserwować wyszukiwania bez wyników.

### Następnie

- moderacja i weryfikacja zawodowa;
- formularz zapytania z kontrolowanym udostępnieniem kontekstu;
- zapis wybranego specjalisty w sprawie;
- status kontaktu: planowany, wysłany, odpowiedź, wybrany, zakończony;
- przypisywanie zadań do specjalisty z ograniczonym dostępem;
- przypomnienia i terminy.

### Docelowo

Kancelio staje się warstwą koordynacji między klientem, drugą stroną i siecią specjalistów. Każdy nowy kalkulator lub proces dostarcza nie tylko ruch SEO, ale również uporządkowaną sprawę, checklistę, potrzebę specjalistyczną i mierzalny moment kontaktu. To tworzy spójny produkt end-to-end, którego wartość rośnie wraz z liczbą obsługiwanych procesów i jakością sieci ekspertów.
