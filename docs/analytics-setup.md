# Google Analytics 4 setup

Kancelio uses the Google tag only after explicit analytics consent. The browser
does not download `gtag.js` before consent, and the rejection option does not
limit calculators, authentication or the directory.

## Create the GA4 web stream

1. In Google Analytics, create or select the Kancelio GA4 property.
2. Under **Admin → Data collection and modification → Data streams**, create a
   **Web** stream for `https://kancelio.pl`.
3. Copy the measurement ID in the `G-...` format.
4. In the GA property, keep Google Signals and advertising personalization off
   unless a separately reviewed advertising use case is introduced.

Official references:

- [Set up Analytics for a website](https://support.google.com/analytics/answer/9304153)
- [Google consent mode](https://developers.google.com/tag-platform/security/guides/consent)

## Configure Coolify

In the Kancelio application, open **Environment Variables** and add:

```text
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Save the variable and redeploy the application. The Docker entrypoint writes
the public measurement ID into `/assets/config.js`. Do not place Google service
account credentials or Analytics API secrets in this application.

If the variable is absent or does not match the `G-...` format, Kancelio neither
shows the analytics consent banner nor loads Google Analytics.

## Events

The frontend sends only parameter-free product events:

- `calculator_start`
- `calculator_complete`
- `directory_open`
- `directory_search`
- `contact_reveal_start`
- `office_contact_reveal`
- `click_phone`
- `click_email`
- `case_save_start`
- `client_case_created`

URLs sent to GA are stripped of query parameters. Amounts, city, selected
service, case title, email address, account ID and form contents are not added
to events.

## Verify after deployment

1. Open Kancelio in a private browser window.
2. Before making a choice, verify in Developer Tools that there is no request
   to `googletagmanager.com` or `google-analytics.com`.
3. Choose **Tylko niezbędne** and confirm the tag remains blocked.
4. Clear the site's local storage, reload, grant analytics consent and use a
   calculator.
5. Confirm `page_view`, `calculator_start` and `calculator_complete` in GA4
   Realtime or DebugView.
6. Use **Ustawienia cookies** to withdraw consent and confirm that subsequent
   product interactions no longer create Analytics requests.

Have the final privacy text and retention settings reviewed by Polish counsel
before using analytics for advertising or combining it with other identifiers.
