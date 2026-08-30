#!/bin/bash
# Sincroniza uno o mas campos [data-key-html] de una pagina del sitio con
# lo que hay guardado en Vercel Blob, leyendo la contraseña de /admin desde
# el Llavero de macOS (no la pide nunca por teclado).
#
# Uso: sync-content.sh <pagina> <clave1> [<clave2> ...]
# Ejemplo: sync-content.sh produccion-musical-iniciacion faq_html
#
# Requiere haber guardado la contraseña una vez con:
#   Acceso a Llaveros -> Nueva contraseña -> nombre "irl-admin-panel", cuenta "admin"

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Uso: sync-content.sh <pagina> <clave1> [<clave2> ...]" >&2
  exit 1
fi

PAGE="$1"
shift
KEYS=("$@")

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
HTML_FILE="$REPO_ROOT/site/$PAGE.html"

if [ ! -f "$HTML_FILE" ]; then
  echo "No existe $HTML_FILE" >&2
  exit 1
fi

TMPDIR_SYNC="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_SYNC"' EXIT

PASSWORD="$(security find-generic-password -a "admin" -s "irl-admin-panel" -w 2>/dev/null || true)"
if [ -z "$PASSWORD" ]; then
  echo "No encontré la contraseña en el Llavero (nombre 'irl-admin-panel', cuenta 'admin')." >&2
  echo "Guárdala con Acceso a Llaveros -> Nueva contraseña, o con:" >&2
  echo "  security add-generic-password -a admin -s irl-admin-panel -w 'TU_CONTRASEÑA'" >&2
  exit 1
fi

COOKIES="$TMPDIR_SYNC/cookies.txt"
curl -s -c "$COOKIES" -X POST "https://irlestudios.com/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$PASSWORD\"}" -o "$TMPDIR_SYNC/login.json"

if ! grep -q '"ok":true' "$TMPDIR_SYNC/login.json"; then
  echo "Login fallido. Respuesta: $(cat "$TMPDIR_SYNC/login.json")" >&2
  exit 1
fi

echo "Sesión iniciada."

curl -s "https://irlestudios.com/api/content?page=$PAGE" -o "$TMPDIR_SYNC/current.json"

python3 "$SCRIPT_DIR/merge_keys.py" "$TMPDIR_SYNC/current.json" "$HTML_FILE" "${KEYS[@]}" \
  > "$TMPDIR_SYNC/merged.json"

echo "Claves a actualizar en '$PAGE': ${KEYS[*]}"

curl -s -b "$COOKIES" -X PUT "https://irlestudios.com/api/content?page=$PAGE" \
  -H "Content-Type: application/json" \
  --data-binary "@$TMPDIR_SYNC/merged.json" \
  -w "HTTP status: %{http_code}\n" -o "$TMPDIR_SYNC/result.json"

echo "Respuesta: $(cat "$TMPDIR_SYNC/result.json")"
