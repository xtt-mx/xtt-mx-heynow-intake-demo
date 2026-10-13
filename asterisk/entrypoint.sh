#!/bin/sh
# Renderiza la configuración con las variables del .env y arranca Asterisk.
set -eu

: "${PUBLIC_DOMAIN:?Falta PUBLIC_DOMAIN}"
: "${PUBLIC_IP:?Falta PUBLIC_IP}"
: "${SIP_WEB_USER:?Falta SIP_WEB_USER}"
: "${SIP_WEB_PASSWORD:?Falta SIP_WEB_PASSWORD}"
: "${HEY_DID:?Falta HEY_DID}"
: "${HEY_AUTH_TOKEN:?Falta HEY_AUTH_TOKEN}"
export RTP_START="${RTP_START:-10000}"
export RTP_END="${RTP_END:-10100}"
export MAX_CONCURRENT_CALLS="${MAX_CONCURRENT_CALLS:-3}"
export MAX_CALL_SECONDS="${MAX_CALL_SECONDS:-900}"

cert="/etc/letsencrypt/live/${PUBLIC_DOMAIN}/fullchain.pem"
if [ ! -r "$cert" ]; then
  echo "No encuentro el certificado TLS en $cert. Ejecuta certbot primero (ver README)." >&2
  exit 1
fi

# Lista explícita de variables: extensions.conf usa ${...} propios de Asterisk y no se
# deben tocar. El token de HeyNow NO se escribe a disco: el dialplan lo lee con ENV().
vars='$PUBLIC_DOMAIN $PUBLIC_IP $SIP_WEB_USER $SIP_WEB_PASSWORD $RTP_START $RTP_END'
for file in http.conf pjsip.conf rtp.conf; do
  envsubst "$vars" < "/opt/templates/$file" > "/etc/asterisk/$file"
done
for file in extensions.conf websocket_client.conf modules.conf logger.conf ari.conf manager.conf; do
  cp "/opt/templates/$file" "/etc/asterisk/$file"
done
chmod 600 /etc/asterisk/pjsip.conf

exec asterisk -f -vvv
