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
COPY kalkulatory.html /usr/share/nginx/html/kalkulatory.html
COPY sprzedaz-nieruchomosci-checklista.html /usr/share/nginx/html/sprzedaz-nieruchomosci-checklista.html
COPY odrzucenie-spadku.html /usr/share/nginx/html/odrzucenie-spadku.html
COPY najem-okazjonalny.html /usr/share/nginx/html/najem-okazjonalny.html
COPY umowa-przedwstepna.html /usr/share/nginx/html/umowa-przedwstepna.html
COPY moje-sprawy.html /usr/share/nginx/html/moje-sprawy.html
COPY specjalisci.html /usr/share/nginx/html/specjalisci.html
COPY dla-specjalistow.html /usr/share/nginx/html/dla-specjalistow.html
COPY privacy.html /usr/share/nginx/html/privacy.html
COPY robots.txt /usr/share/nginx/html/robots.txt
COPY sitemap.xml /usr/share/nginx/html/sitemap.xml
COPY assets/ /usr/share/nginx/html/assets/
COPY variants/ /usr/share/nginx/html/variants/

EXPOSE 80

# Healthcheck for Coolify / Docker — nginx returns 200 on "/"
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 && \
      wget -qO- http://127.0.0.1/sprzedaz-nieruchomosci-checklista.html >/dev/null 2>&1 && \
      wget -qO- http://127.0.0.1/specjalisci.html >/dev/null 2>&1 && \
      wget -qO- http://127.0.0.1/dla-specjalistow.html >/dev/null 2>&1 || exit 1
