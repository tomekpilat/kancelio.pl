# Kancelio.pl teaser — a static site served by nginx.
# The image is intentionally tiny and contains no backend: the teaser is a
# "coming soon" page, and emails are collected by an external form provider
# (MailerLite / Brevo / Formspree).

FROM nginx:alpine

# Custom config (security headers, gzip, cache policy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Landing page + privacy policy + variants
COPY index.html /usr/share/nginx/html/index.html
COPY privacy.html /usr/share/nginx/html/privacy.html
COPY variants/ /usr/share/nginx/html/variants/

EXPOSE 80

# Healthcheck for Coolify / Docker — nginx returns 200 on "/"
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1