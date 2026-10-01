#!/usr/bin/env bash
# Arranca toldos-testar en 4310 con todas las rutas de escritura en tmp/ui-audit.
# Las variables de entorno prevalecen sobre .env (dotenv no pisa las existentes)
# y WORKFLOW_SETTINGS_FILE evita heredar .toldos-testar-settings.json.
set -euo pipefail
cd "$(dirname "$0")/../../.."
# ISOLATED_DIR: otra carpeta de prueba, siempre dentro de tmp/ del repositorio (la e2e de la fase 5
# activa la generación en la suya y no debe tocar la configuración de la instancia de 4310).
D="${ISOLATED_DIR:-$PWD/tmp/ui-audit}"
case "$D" in /*) ;; *) D="$PWD/$D" ;; esac
case "$D" in *..*) echo "ISOLATED_DIR no puede llevar «..»: $D" >&2; exit 1 ;; esac
case "$D" in "$PWD"/tmp/*) ;; *) echo "ISOLATED_DIR tiene que estar dentro de $PWD/tmp: $D" >&2; exit 1 ;; esac
mkdir -p "$D"/{review,plan,rps,export,archive,rpsplan,rem-plan,rem-oficina,rem-revision,borradores}
export NODE_ENV=development HOST=127.0.0.1 PORT="${PORT:-4310}"
# Recarga de Vite en un puerto propio (24310 para 4310…): dos aisladas a la vez no chocan.
export VITE_HMR_PORT="${VITE_HMR_PORT:-$((PORT + 20000))}"
export ENABLE_FILE_WRITES=false ENABLE_HERA=true ENABLE_LEGACY_EXPORTS=false
export WORKFLOW_SETTINGS_FILE="$D/settings.json"
export REVIEW_DIRECTORY="$D/review" PLANTEAMIENTOS_DIRECTORY="$D/plan"
export RPS_UPLOAD_DIRECTORY="$D/rps" EXPORT_DIRECTORY="$D/export"
export ORDER_ARCHIVE_ROOT="$D/archive" RPS_PLANTEAMIENTOS_DIRECTORY="$D/rpsplan"
export REMOLQUES_PLANTEAMIENTOS_DIRECTORY="$D/rem-plan" REMOLQUES_OFICINA_TECNICA_DIRECTORY="$D/rem-oficina/{YYYY}"
export REMOLQUES_REVISION_DIRECTORY="$D/rem-revision"
export DRAFTS_DIRECTORY="$D/borradores"
# CoordinaOT simulado (scripts/fake-coordina.mjs): la aislada nunca pregunta al real.
export FAKE_COORDINA_PORT="${FAKE_COORDINA_PORT:-4320}"
export COORDINA_URL="http://127.0.0.1:$FAKE_COORDINA_PORT" COORDINA_CLAVE="clave-de-prueba"
node scripts/fake-coordina.mjs &
FAKE_PID=$!
# Sin exec: el shell sigue vivo para parar el simulado cuando el servidor termine o lo
# corten (Ctrl+C / kill); si no, quedaría huérfano escuchando en 4320.
# El servidor corre en background y wait() lo espera: así la trap se ejecuta inmediatamente
# cuando bash recibe SIGTERM (de otro modo bash difiere la trap hasta que el hijo en foreground
# salga, dejando los procesos huérfanos).
node src/server.js &
SERVER_PID=$!
trap 'kill "$SERVER_PID" "$FAKE_PID" 2>/dev/null || true' EXIT
trap 'exit 143' INT TERM
wait "$SERVER_PID"
