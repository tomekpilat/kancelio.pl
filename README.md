# Kancelio.pl — kalkulator kosztów i teaser

A static public notarial-cost calculator for **Kancelio.pl**, with a separate
"coming soon" page and email waitlist for notary offices. No backend or
database is required: nginx serves the pages and an external provider collects
emails.

> Note on language: repository files, config, and comments are in English.
> The **visible page copy is in Polish on purpose** — the audience is Polish
> notaries. Translate the copy only if you want an English-facing page.

---

## Structure

```
kancelio.pl/
├── index.html              # default public notarial-cost calculator
├── kalkulator.html         # explicit URL alias for the calculator
├── dla-kancelarii.html     # notary-office teaser and waitlist
├── docs/                   # product and launch notes
├── Dockerfile              # nginx:alpine serving the static files
├── nginx.conf              # security headers, gzip, cache policy
├── .dockerignore
├── .gitignore
└── variants/               # alternative designs — swap any into index.html
    ├── classic.html        # deep navy + gold, framed (same as current index)
    ├── elegant.html        # light, archival paper, hairline gold rules
    ├── prestige.html       # ceremonial: navy, double gold frame with corners
    ├── minimal.html        # bare navy, wordmark + one line + input
    ├── fusion.html         # "Modern Prestige" — gold + blue accent
    └── minimal-adaptive.html  # light/dark auto (follows the OS theme)
```

## Choosing a variant

`dla-kancelarii.html` is the notary teaser. To switch its design, copy a
variant over it:

```bash
cp variants/prestige.html dla-kancelarii.html
git add dla-kancelarii.html && git commit -m "Switch teaser to prestige variant"
```

## Connect the email form (required to actually collect emails)

Every variant ships with a working form wired for **Formspree** and a preview
mode. Out of the box the form is in preview mode: it shows the success screen
but does **not** store anything.

To collect real emails:

1. Create a form at https://formspree.io and copy your endpoint
   (e.g. `https://formspree.io/f/abcdwxyz`).
2. In `dla-kancelarii.html` (and any variant you use), replace `YOUR_FORM_ID`:
   ```html
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST" ...>
   ```
3. Commit and redeploy.

Prefer a full mailing-list tool? **MailerLite** or **Brevo** (both EU-based,
GDPR-friendly, with double opt-in) give you an embeddable form — paste their
snippet in place of the `<form>` block. Recommended if you want the list +
sending built in.

**GDPR:** email is personal data. Keep the privacy-policy link and consent
note (already present in the elegant/prestige variants), enable double opt-in,
and keep data in the EU. MailerLite/Brevo (EU) handle this for you.

## Run locally (Docker)

```bash
docker build -t kancelio-teaser .
docker run --rm -p 8080:80 kancelio-teaser
# open http://localhost:8080
```

Or, without Docker, just open `index.html` in a browser. The calculator is the
default page at `http://localhost:8080/`; the teaser is available at
`http://localhost:8080/dla-kancelarii.html`.

The calculator also remains available at `http://localhost:8080/kalkulator.html`. Its
current rules are kept in a versioned JavaScript object for the static
validation phase. See `docs/calculator-launch-plan.md` before moving the rules
into the future public API.

## Deploy on Coolify (Hetzner)

1. Push this repo to GitHub (see below).
2. In Coolify: **New Resource → Application → from your GitHub repo**,
   build type **Dockerfile**.
3. Set the domain, e.g. `kancelio.pl` (or `www.kancelio.pl`). Coolify issues
   HTTPS automatically via Let's Encrypt.
4. Add the DNS record so the domain points at your server (see below).
5. Deploy.

### DNS record

At your domain registrar, in the DNS zone, add an **A record** pointing the
name to your Hetzner VPS IPv4:

| Type | Name  | Value (example)   | TTL  |
|------|-------|-------------------|------|
| A    | `@`   | `95.217.xx.xx`    | 3600 |
| A    | `www` | `95.217.xx.xx`    | 3600 |

Point `Name` to your actual server IP. The A record must exist **before**
Let's Encrypt can issue the certificate. DNS changes can take minutes to a few
hours to propagate.

## Push this repo to GitHub

Run inside this folder (repo already named `kancelio.pl` on GitHub):

```bash
git init
git add .
git commit -m "Teaser: coming-soon page + Docker/nginx deploy"
git branch -M main
# SSH:
git remote add origin git@github.com:<your-username>/kancelio.pl.git
# or HTTPS:
# git remote add origin https://github.com/<your-username>/kancelio.pl.git
git push -u origin main
```

---

© 2026 Kancelio.pl — private repository.
