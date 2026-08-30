#!/bin/bash
# Envía el email de "clase de muestra" (mismo diseño que sendWelcomeEmail)
# a cada lead listado en clase-muestra-leads.csv, usando la API de Resend.
#
# Antes de la primera vez, guarda tu RESEND_API_KEY en el Llavero:
#   Acceso a Llaveros -> Nueva contraseña
#   Nombre del elemento: irl-resend-api
#   Cuenta: resend
#   Contraseña: la clave (la sacas de Vercel -> Settings -> Environment Variables -> RESEND_API_KEY)
#
# Rellena scripts/clase-muestra-leads.csv (nombre,email por fila, con
# cabecera) antes de ejecutar. Repasa scripts/build_clase_muestra_email.py
# si quieres cambiar el texto del email.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSV="$SCRIPT_DIR/clase-muestra-leads.csv"
FROM_EMAIL="IRL Estudios <inscripciones@irlestudios.com>"
REPLY_TO="irlestudiosmadrid@gmail.com"
SUBJECT="Un adelanto de cómo doy clase — Producción Musical Iniciación"

if [ ! -f "$CSV" ]; then
  echo "No encuentro $CSV" >&2
  exit 1
fi

API_KEY="$(security find-generic-password -a "resend" -s "irl-resend-api" -w 2>/dev/null || true)"
if [ -z "$API_KEY" ]; then
  echo "No encontré la clave de Resend en el Llavero (nombre 'irl-resend-api', cuenta 'resend')." >&2
  echo "Guárdala con Acceso a Llaveros -> Nueva contraseña, o con:" >&2
  echo "  security add-generic-password -a resend -s irl-resend-api -w 'TU_CLAVE'" >&2
  exit 1
fi

TMPDIR_SEND="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SEND"' EXIT

first_line=true
while IFS=, read -r nombre email; do
  if $first_line; then first_line=false; continue; fi
  nombre="$(echo "$nombre" | sed 's/^"//;s/"$//')"
  email="$(echo "$email" | sed 's/^"//;s/"$//' | tr -d '[:space:]')"
  if [ -z "$email" ]; then continue; fi

  echo "Enviando a $nombre <$email>..."
  html="$(python3 "$SCRIPT_DIR/build_clase_muestra_email.py" "$nombre")"

  python3 - "$html" "$email" "$nombre" "$FROM_EMAIL" "$REPLY_TO" "$SUBJECT" "$API_KEY" "$TMPDIR_SEND" <<'PYEOF'
import json, sys, urllib.request

html, email, nombre, from_email, reply_to, subject, api_key, tmpdir = sys.argv[1:9]

text = (
    f"Hola {nombre},\n\n"
    "Hace un tiempo dejaste tu contacto porque te interesaba el curso Producción Musical Iniciación. "
    "Para que puedas hacerte una idea real de cómo son las clases grabé este vídeo para ti hablando "
    "sobre cómo entiendo la manera de enseñar y un pequeño adelanto haciendo un beat:\n\n"
    "https://youtu.be/zmW5EDQQwds\n\n"
    "Qué incluye el curso:\n"
    "- 8 sesiones de 2h presenciales en el estudio, en grupos de máximo 4 personas.\n"
    "- Sample pack exclusivo, curado y creado por mí con los sonidos que uso en mis propias producciones.\n"
    "- Acceso a un campus virtual con materiales utilizados en clase, recursos extra, foro de dudas y calendario del curso.\n"
    "- Horarios flexibles, adaptados a la disponibilidad del grupo una vez esté completo.\n\n"
    "Si quieres apuntarte, aquí tienes el link directo de inscripción:\n"
    "https://irlestudios.com/inscripcion.html?curso=Producci%C3%B3n%20musical%20Iniciaci%C3%B3n\n\n"
    "Cualquier duda, responde directamente a este email, lo leo yo mismo.\n\n"
    "Un abrazo,\nAlex — Turian Boy\nIRL Estudios\n\n"
    "Si prefieres no recibir más información sobre este curso, responde a este email y te damos de baja."
)

payload = json.dumps({
    "from": from_email,
    "to": [email],
    "reply_to": reply_to,
    "subject": subject,
    "html": html,
    "text": text,
}).encode("utf-8")

req = urllib.request.Request(
    "https://api.resend.com/emails",
    data=payload,
    method="POST",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    },
)
try:
    with urllib.request.urlopen(req) as r:
        print("  -> status:", r.status, r.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("  -> ERROR status:", e.code, e.read().decode("utf-8"))
PYEOF

done < "$CSV"

echo "Listo."
