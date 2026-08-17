# Notary directory setup

The directory keeps the nginx frontend static while Supabase provides email/password
and Google authentication, PostgreSQL persistence, row-level security and the server-side
contact-reveal function. Cloudflare Turnstile protects email, phone and street
address from direct anonymous access.

## 1. Create and migrate Supabase

1. Create a Supabase project in the preferred EU region.
2. Install and authenticate the Supabase CLI.
3. Link this repository to the project and apply the migration:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

The migration creates two deliberately separate tables:

- `notary_offices` contains searchable public metadata plus the owner ID.
- `notary_office_contacts` contains street address, email and phone.

Anonymous users have no table-level access. Public search goes through
`search_notary_offices`, which only returns safe fields. RLS limits office and
contact edits to the authenticated owner.

## 2. Configure authentication

Keep the Supabase Email provider enabled. Decide whether users must confirm
their address before the first sign-in; the frontend supports the confirmation
flow and redirects back to `https://kancelio.pl/dla-kancelarii.html`.

For production email delivery, configure custom SMTP under **Supabase → Project
Settings → Authentication → SMTP Settings**. The default Supabase mailer is
rate-limited and intended only for initial testing.

To enable social authentication with Google, create a Web OAuth client in
Google Auth Platform. Add the production and local development origins.
Configure its client ID and secret under
**Supabase → Authentication → Providers → Google**.

Set the Supabase Site URL and redirect allow list to include:

- `https://kancelio.pl/dla-kancelarii.html`
- `https://kancelio.pl/moje-sprawy.html`
- `http://localhost:8080/dla-kancelarii.html`
- `http://localhost:8080/moje-sprawy.html`

## 3. Configure Turnstile

Create a Cloudflare Turnstile widget for `kancelio.pl`. Keep the secret key out
of Docker and browser configuration. Set Edge Function secrets and deploy:

```bash
supabase secrets set TURNSTILE_SECRET_KEY=YOUR_SECRET
supabase secrets set ALLOWED_ORIGINS=https://kancelio.pl,https://www.kancelio.pl
supabase functions deploy reveal-office-contact
```

The function validates every token with Cloudflare Siteverify before using the
Supabase service role to read a protected contact. Tokens are single-use and
responses use `Cache-Control: no-store`.

For local Turnstile testing, Cloudflare provides a test site key and secret.
Never use the test secret in production.

## 4. Set frontend environment variables

Add these variables to the Coolify application:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
TURNSTILE_SITE_KEY=...
GA_MEASUREMENT_ID=G-...
```

Only the publishable Supabase key and Turnstile site key reach the browser.
The GA4 measurement ID is also public by design. The container entrypoint
writes these values to `/assets/config.js`. Do not put the
Supabase secret/service-role key or Turnstile secret in Coolify frontend
variables.

`GA_MEASUREMENT_ID` is optional during local development. When it is missing,
the site does not show an analytics banner and does not load Google Analytics.
When configured, the Google tag is blocked until the visitor explicitly grants
analytics consent. No calculator values, city, case titles, account data or form
contents are attached to analytics events.
See [analytics-setup.md](analytics-setup.md) for GA4 property, Coolify and
verification steps.

## 5. Apply the client-case migration

Apply migrations again after deploying the client portal:

```bash
supabase db push
```

`client_cases` stores only the authenticated owner's case type, user-provided
short title, optional city, checklist completion keys and status. RLS prevents
users from reading or changing another user's cases. The migration also adds
the three granular services used by the new calculators to office profiles.

## 6. Local frontend preview

Without runtime values, the pages render in setup mode and do not attempt auth
or database requests. To exercise the complete flow, run the same Docker image
with the three public variables:

```bash
docker build -t kancelio-directory .
docker run --rm -p 8080:80 \
  -e SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
  -e SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
  -e TURNSTILE_SITE_KEY=... \
  -e GA_MEASUREMENT_ID=G-... \
  kancelio-directory
```

Then open `/dla-kancelarii.html` to create a listing and `/kancelarie.html` to
search. A calculator selection links to the directory with the matching
service preselected.

## Operational notes

- Map pins are intentionally approximate. The full address remains protected.
- Add an office-verification/moderation process before promoting the directory
  broadly; Google login verifies account access, not professional status.
- Review the privacy policy with Polish counsel before production launch and
  record the chosen Supabase region and provider transfer safeguards.
- Monitor Turnstile failures and Edge Function traffic. Add gateway rate limits
  if contact-reveal abuse appears.
