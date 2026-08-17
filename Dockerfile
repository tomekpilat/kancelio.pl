# Kancelio.pl calculator and directory frontend — static assets served by nginx.
# Authentication, persistence and protected contact reveal are provided by
# Supabase; only publishable browser configuration is injected here.

FROM nginx:alpine

# Custom config (security headers, gzip, cache policy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Generate public runtime configuration from Coolify/Docker environment values.
COPY assets/config.js /opt/kancelio/config.template.js
COPY docker/40-kancelio-config.sh /docker-entrypoint.d/40-kancelio-config.sh
RUN chmod +x /docker-entrypoint.d/40-kancelio-config.sh

# Public calculator, directory, office editor and legal pages.
COPY index.html /usr/share/nginx/html/index.html
COPY kalkulator.html /usr/share/nginx/html/kalkulator.html
COPY dla-kancelarii.html /usr/share/nginx/html/dla-kancelarii.html
COPY kancelarie.html /usr/share/nginx/html/kancelarie.html
COPY privacy.html /usr/share/nginx/html/privacy.html
COPY assets/ /usr/share/nginx/html/assets/
COPY variants/ /usr/share/nginx/html/variants/

EXPOSE 80

# Healthcheck for Coolify / Docker — nginx returns 200 on "/"
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
