# Sieć specjalistów Kancelio — dokumentacja techniczna

## 1. Cel i zakres

Moduł rozszerza Kancelio z katalogu kancelarii notarialnych do katalogu specjalistów obsługujących cały proces klienta. Profil jest powiązany z:

- profesją;
- miastem i opcjonalną obsługą zdalną;
- rodzajami spraw;
- etapami procesu;
- listą konkretnych usług.

Publiczna wyszukiwarka zwraca wspólny format dla nowych profili i istniejących kancelarii. Dane kontaktowe pozostają poza publicznym API i są ujawniane dopiero po poprawnej weryfikacji Cloudflare Turnstile.

## 2. Architektura

```text
Przeglądarka
 ├─ specjalisci.html + specialist-directory.js
 │   ├─ RPC search_specialists (dane publiczne)
 │   ├─ OpenStreetMap Nominatim (geokodowanie zapytania)
 │   └─ Edge Function reveal-*-contact (kontakt po Turnstile)
 ├─ dla-specjalistow.html + specialist-editor.js
 │   ├─ Supabase Auth (e-mail/hasło lub Google)
 │   ├─ specialist_profiles (wizytówka publiczna)
 │   └─ specialist_contacts (kontakt prywatny)
 └─ moje-sprawy.html + client-portal.js
     └─ KANCELIO_CASE_TEMPLATES (rekomendacje per sprawa i etap)
```

Warstwy:

1. Statyczny frontend HTML/CSS/JavaScript, wdrażany przez obecny kontener Nginx.
2. Supabase Auth do logowania i identyfikacji właściciela profilu.
3. PostgreSQL z RLS do danych profili i kontaktów.
4. Funkcje SQL `security definer` jako kontrolowane publiczne powierzchnie wyszukiwania.
5. Supabase Edge Functions do sprawdzania Turnstile i pobierania prywatnego kontaktu z użyciem service role.

## 3. Model danych

Migracja: `supabase/migrations/20260818150000_specialist_network.sql`.

### `specialist_profiles`

| Kolumna | Znaczenie |
|---|---|
| `id` | UUID profilu |
| `owner_id` | użytkownik Supabase Auth; jeden profil na konto |
| `name` | nazwa firmy albo imię i nazwisko |
| `profession` | kontrolowany identyfikator profesji |
| `city` | główne miasto obsługi |
| `bio` | publiczny opis, maksymalnie 900 znaków |
| `services` | 1–12 nazw usług prezentowanych jako tagi |
| `case_types` | obsługiwane rodzaje spraw |
| `stages` | etapy procesu, na których specjalista pomaga |
| `website` | opcjonalny publiczny adres HTTPS/HTTP |
| `remote_available` | możliwość obsługi zdalnej |
| `public_latitude`, `public_longitude` | przybliżony punkt mapy |
| `is_published` | widoczność w publicznym katalogu |

Dozwolone profesje:

- `lawyer`
- `real_estate_agent`
- `property_valuator`
- `technical_inspector`
- `mortgage_broker`
- `tax_advisor`
- `energy_auditor`
- `surveyor`
- `insurance_agent`
- `property_manager`
- `moving_company`
- `translator`
- `mediator`

Notariusze nadal zapisują się w `notary_offices`. Funkcja wyszukiwania mapuje ich do wspólnego formatu z profesją `notary`.

### `specialist_contacts`

| Kolumna | Znaczenie |
|---|---|
| `profile_id` | klucz profilu i relacja 1:1 |
| `street_address` | prywatny adres ulicy |
| `postal_code` | kod w formacie `00-000` |
| `email` | prywatny adres kontaktowy |
| `phone` | opcjonalny telefon |

Rozdzielenie tabel jest celowe: funkcja publicznego wyszukiwania nie ma możliwości przypadkowego zwrócenia danych kontaktowych.

## 4. Uprawnienia i RLS

- Rola `anon` nie ma dostępu tabelowego do profili ani kontaktów.
- Rola `authenticated` może odczytać, utworzyć, zmienić i usunąć wyłącznie profil, którego `owner_id = auth.uid()`.
- Kontakt można odczytać lub zmienić tylko wtedy, gdy powiązany profil należy do użytkownika.
- Publiczny katalog korzysta wyłącznie z `search_specialists(...)` z prawem `execute` dla `anon` i `authenticated`.
- Edge Function używa `SUPABASE_SERVICE_ROLE_KEY` dopiero po poprawnej weryfikacji Turnstile i sprawdzeniu `is_published = true`.

## 5. Kontrakt wyszukiwarki

RPC:

```sql
search_specialists(
  p_city text,
  p_profession text,
  p_case_type text,
  p_stage text
)
```

Zwracane pola mają wspólny format dla `specialist_profiles` i `notary_offices`:

```text
id, source_type, name, profession, city, services, case_types, stages,
bio, website, remote_available, public_latitude, public_longitude
```

`source_type` przyjmuje:

- `specialist` — nowy profil;
- `notary` — istniejąca kancelaria.

Filtrowanie miasta uwzględnia profile zdalne. Frontend może dodatkowo geokodować pełny adres i sortować wyniki według przybliżonej odległości.

## 6. Ujawnianie danych kontaktowych

Nowa funkcja: `supabase/functions/reveal-specialist-contact/index.ts`.

Żądanie:

```json
{
  "profileId": "uuid",
  "turnstileToken": "token"
}
```

Wymagania:

1. `Origin` musi należeć do `ALLOWED_ORIGINS` albo być lokalnym adresem deweloperskim.
2. Token Turnstile musi mieć akcję `reveal_specialist_contact`.
3. Hostname odpowiedzi Turnstile musi odpowiadać hostname żądania.
4. Profil musi istnieć i być opublikowany.

Kancelarie nadal używają `reveal-office-contact` z akcją `reveal_contact`. Frontend wybiera funkcję na podstawie `source_type`.

## 7. Frontend

### `specjalisci.html`

- filtry: lokalizacja, rodzaj sprawy, profesja, etap;
- parametry URL: `city`, `case`, `profession`, `stage`;
- mapa z przybliżonymi punktami;
- karty usług i etapów;
- kontakt po Turnstile;
- CTA do rejestracji specjalisty.

Przykład linku kontekstowego:

```text
/specjalisci.html?case=sale&profession=property_valuator&stage=preparation&city=Warszawa
```

### `dla-specjalistow.html`

- logowanie i rejestracja e-mail/hasło;
- OAuth Google przez Supabase;
- jeden profil na użytkownika;
- edycja, publikacja/ukrycie i usunięcie profilu;
- automatyczne przybliżone geokodowanie podanego adresu;
- rozdzielny zapis profilu i kontaktu.

### `moje-sprawy.html`

Rekomendacje są częścią `KANCELIO_CASE_TEMPLATES`. Każdy wpis ma format:

```js
{
  profession: "tax_advisor",
  stage: "aftercare",
  reason: "Ocena PIT-39, kosztów i możliwości ulgi mieszkaniowej."
}
```

Panel sprawy pokazuje zakładki etapów. Link do katalogu przenosi typ sprawy, etap, profesję i miasto.

## 8. Rejestry słownikowe

Słowniki frontendowe znajdują się w `assets/kancelio.js`:

- `specialistProfessions` i `specialistProfessionById`;
- `caseTypes` i `caseTypeById`;
- `caseStages` i `caseStageById`.

Dodanie nowego typu wymaga synchronizacji:

1. ograniczeń `check` w migracji bazy;
2. słownika w `assets/kancelio.js`;
3. rekomendacji w `assets/case-templates.js`;
4. tekstów SEO i ewentualnych stron procesu.

## 9. Wdrożenie

### Supabase

1. Uruchom migrację `20260818150000_specialist_network.sql` w SQL Editor albo przez Supabase CLI.
2. Wdróż funkcję:

```bash
supabase functions deploy reveal-specialist-contact --project-ref bllhplbexaknsbciztsv
```

3. Ustaw lub potwierdź sekrety funkcji:

```text
TURNSTILE_SECRET_KEY
ALLOWED_ORIGINS=https://kancelio.pl
```

`SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` są dostępne w środowisku funkcji Supabase.

### Coolify

Nie są potrzebne nowe zmienne. Nadal wymagane są:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
TURNSTILE_SITE_KEY
GA_MEASUREMENT_ID
```

Po wdrożeniu sprawdź, czy obrazy kontenera zawierają nowe strony, skrypty, CSS i migracja nie jest błędnie traktowana jako część runtime Nginx.

### Supabase Auth

Do listy dozwolonych redirect URL dodaj:

```text
https://kancelio.pl/dla-specjalistow.html
https://kancelio.pl/dla-specjalistow.html#profil
```

## 10. Walidacja przed wdrożeniem

- `node --check` dla nowych i zmienionych skryptów;
- `git diff --check`;
- rejestracja e-mail i Google;
- zapis nowego profilu oraz ponowny odczyt po przeładowaniu;
- ukrycie i usunięcie profilu;
- wyszukiwanie bez filtrów i z każdym filtrem;
- wyszukiwanie pełnego adresu oraz sortowanie odległości;
- wynik kancelarii w tej samej wyszukiwarce;
- poprawna i błędna weryfikacja Turnstile;
- link z zakładki specjalistów w zapisanej sprawie;
- responsywność przy szerokości 390 px;
- brak publicznego odczytu tabel kontaktowych przez klucz anon.

## 11. Obserwowalność i analityka

Zdarzenia frontendowe:

- `specialist_search` z `case_type`, `profession`, `stage`;
- `specialist_contact_revealed` z `profession`;
- `specialist_profile_saved` z `profession`.

Nie należy przekazywać do analityki miasta, adresu, nazwy profilu, danych kontaktowych ani treści sprawy.

## 12. Ograniczenia pierwszej wersji

- profil nie przechodzi jeszcze ręcznej moderacji ani weryfikacji uprawnień zawodowych;
- nie ma wiadomości wewnętrznych — kontakt odbywa się przez ujawniony e-mail lub telefon;
- rekomendacje są regułami produktowymi, nie poradą prawną i nie wynikiem AI;
- nie zapisujemy specjalisty jako uczestnika sprawy;
- nie ma ocen, opinii, dostępności ani rezerwacji terminów;
- przybliżone współrzędne są publiczne, dokładny adres pozostaje chroniony.

Kolejne wersje powinny dodać moderację, zapytania ofertowe powiązane ze sprawą, zgodę klienta na udostępnienie wybranego zakresu danych oraz historię kontaktów bez ujawniania zawartości prywatnych dokumentów.
