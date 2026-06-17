#!/bin/sh
set -e

mkdir -p /usr/share/nginx/html

# Gera /config.json em runtime a partir das variaveis do container.
# Assim a IA funciona no Docker sem precisar rebuildar para trocar a chave.
envsubst '${OPENROUTER_API_KEY} ${OPENROUTER_MODEL}' \
  < /etc/nginx/config.json.template \
  > /usr/share/nginx/html/config.json

chmod 644 /usr/share/nginx/html/config.json
