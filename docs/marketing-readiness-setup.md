# Wdrożenie marketing readiness

Ten dokument opisuje czynności wymagane po scaleniu zmian. Kod dostarcza moderację, publiczne profile, sitemapę profili, parametry GA4, canonicale, JSON-LD i strony zaufania. Google Search Console, konfiguracja GA4 oraz wybór administratora wymagają ręcznej operacji właściciela projektu.

## 1. Migracja Supabase

Uruchom w SQL Editor:

`supabase/migrations/20260818210000_marketing_readiness.sql`

Migracja:

- dodaje statusy `pending`, `verified`, `rejected`;
- dodaje stabilne slugi profili;
- tworzy listę administratorów;
- chroni status przed samodzielną zmianą przez właściciela;
- przywraca `pending` po zmianie danych publicznych lub kontaktowych;
- ogranicza publiczne wyszukiwanie do zweryfikowanych profili;
- tworzy RPC panelu moderacji i licznik 15 profili na miasto.

Po migracji istniejące profile otrzymają status `pending`. Jest to celowe: przed oznaczeniem ich jako zweryfikowane trzeba przejrzeć dane.

## 2. Pierwszy administrator

Najpierw znajdź UUID konta:

```sql
select id, email
from auth.users
order by created_at;
```

Następnie dodaj właściwe konto:

```sql
insert into public.platform_admins (user_id)
values ('TU-WSTAW-UUID-UZYTKOWNIKA')
on conflict (user_id) do nothing;
```

Nie dodawaj administratorów na podstawie adresu e-mail w kodzie frontendowym. Tabela nie ma polityk umożliwiających użytkownikom samodzielne dopisanie się.

Panel: `https://kancelio.pl/moderacja.html`

## 3. Edge Functions

Wdróż lub ponownie wdróż:

```bash
supabase functions deploy reveal-specialist-contact --project-ref bllhplbexaknsbciztsv
supabase functions deploy reveal-office-contact --project-ref bllhplbexaknsbciztsv
supabase functions deploy directory-sitemap --project-ref bllhplbexaknsbciztsv
```

Pierwsze dwie funkcje odmawiają ujawnienia kontaktu profilu bez statusu `verified`. `directory-sitemap` zwraca wyłącznie opublikowane i zweryfikowane profile.

Po deployu sprawdź:

- `https://kancelio.pl/profile-sitemap.xml`
- `https://kancelio.pl/robots.txt`
- przykładowy publiczny profil `/specjalista/<slug>`.

## 4. Redirect URL dla moderatora

W Supabase → Authentication → URL Configuration dodaj:

- `https://kancelio.pl/moderacja.html`

Jest to potrzebne, jeżeli administrator loguje się do panelu przez Google.

## 5. Google Search Console

Rekomendowane jest utworzenie usługi domenowej `kancelio.pl` i weryfikacja rekordem DNS. Dzięki temu konfiguracja obejmuje HTTPS i wszystkie przyszłe subdomeny.

Po weryfikacji:

1. Otwórz **Indeksowanie → Mapy witryn**.
2. Prześlij `https://kancelio.pl/sitemap.xml`.
3. Prześlij `https://kancelio.pl/profile-sitemap.xml`.
4. W **Sprawdzenie adresu URL** przetestuj stronę główną, checklistę sprzedaży, katalog i jeden zweryfikowany profil.
5. Poproś o indeksację stron zaufania i pierwszych profili.
6. Co tydzień sprawdzaj raport **Strony** oraz błędy danych strukturalnych.

Nie publikuj masowo stron miasto × profesja, dopóki nie mają realnych profili i unikalnej treści.

## 6. GA4 — parametry i definicje niestandardowe

Frontend przekazuje tylko zatwierdzone, niespersonalizowane parametry:

- `case_type`;
- `profession`;
- `stage`;
- `source_type`;
- `service`;
- `calculator_type`.

Nie przekazujemy miasta, nazwy profilu, adresu, e-maila, telefonu, kwot kalkulatora ani treści sprawy.

W GA4 → Administracja → Definicje niestandardowe utwórz wymiary o zakresie **Zdarzenie**:

| Nazwa | Parametr zdarzenia |
| --- | --- |
| Rodzaj sprawy | `case_type` |
| Profesja | `profession` |
| Etap procesu | `stage` |
| Źródło profilu | `source_type` |
| Usługa | `service` |

## 7. GA4 — kluczowe zdarzenia

Po pojawieniu się zdarzeń w Administracja → Zdarzenia oznacz gwiazdką:

- `calculator_complete`;
- `client_case_created`;
- `specialist_contact_revealed`;
- `office_contact_reveal`;
- `specialist_profile_saved`.

Nie oznaczaj jako kluczowych samych odsłon strony ani rozpoczęcia kalkulatora. Kluczowe zdarzenie powinno reprezentować osiągnięcie wartości, nie zwykły ruch.

## 8. Dashboard tygodniowy

Najprostsza wersja powinna powstać w Looker Studio z dwóch źródeł:

- Google Analytics 4;
- Google Search Console — Site Impression i URL Impression.

### Pierwszy wiersz — wynik

- użytkownicy;
- ukończone kalkulatory;
- utworzone sprawy;
- odsłonięcia kontaktu specjalisty;
- odsłonięcia kontaktu kancelarii;
- opublikowane profile specjalistów.

### Drugi wiersz — konwersja

- `calculator_complete / calculator_start`;
- `client_case_created / calculator_complete`;
- `specialist_contact_revealed / specialist_search`;
- `specialist_profile_saved / wejścia na dla-specjalistow.html`.

### Trzeci wiersz — SEO

- kliknięcia organiczne;
- wyświetlenia;
- CTR;
- średnia pozycja;
- pięć stron z największym wzrostem i spadkiem kliknięć;
- zapytania związane ze sprzedażą nieruchomości.

### Filtry

- zakres dat: ostatnie 7 dni z porównaniem do poprzednich 7;
- źródło/medium;
- urządzenie;
- `case_type`;
- `profession`;
- `stage`.

## 9. Próg kampanii lokalnej

Panel moderacji pokazuje liczbę zweryfikowanych profili względem minimalnego progu 15. Przed uruchomieniem reklam dla miasta sprawdź również ręcznie:

- co najmniej 3–5 profili w najważniejszych kategoriach sprzedaży nieruchomości;
- obecność notariusza, agenta, rzeczoznawcy, inspektora i eksperta kredytowego;
- kompletne opisy i działające strony internetowe;
- brak duplikatów;
- aktualność danych kontaktowych.

Nie należy uzupełniać progu profilami fikcyjnymi ani kopiowanymi bez zgody właściciela.

## 10. Test odbiorczy

1. Zaloguj się jako specjalista i zapisz profil.
2. Potwierdź status `pending` i brak profilu w publicznej wyszukiwarce.
3. Zaloguj się jako administrator i oznacz profil jako `verified`.
4. Potwierdź obecność w katalogu, publiczny URL i sitemapę.
5. Odsłoń kontakt po Turnstile.
6. Zmień w profilu opis lub telefon.
7. Potwierdź automatyczny powrót do `pending` oraz zniknięcie z katalogu.
8. Ponownie zweryfikuj profil.
9. Zaakceptuj analitykę i sprawdź zdarzenia w GA4 DebugView/Realtime.
