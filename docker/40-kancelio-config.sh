#!/bin/sh
set -eu

envsubst '${SUPABASE_URL} ${SUPABASE_PUBLISHABLE_KEY} ${TURNSTILE_SITE_KEY}' \
  < /opt/kancelio/config.template.js \
  > /usr/share/nginx/html/assets/config.js
