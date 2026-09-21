#!/usr/bin/env bash
# Arranca toldos-testar en 4310 con todas las rutas de escritura en tmp/ui-audit.
# Las variables de entorno prevalecen sobre .env (dotenv no pisa las existentes)
# y WORKFLOW_SETTINGS_FILE evita heredar .toldos-testar-settings.json.
set -euo pipefail
cd "$(dirname "$0")/../../.."
D="$PWD/tmp/ui-audit"
mkdir -p "$D"/{review,plan,rps,export,archive,rpsplan}
export NODE_ENV=development HOST=127.0.0.1 PORT=4310
export ENABLE_FILE_WRITES=false ENABLE_HERA=true ENABLE_LEGACY_EXPORTS=false
export WORKFLOW_SETTINGS_FILE="$D/settings.json"
export REVIEW_DIRECTORY="$D/review" PLANTEAMIENTOS_DIRECTORY="$D/plan"
export RPS_UPLOAD_DIRECTORY="$D/rps" EXPORT_DIRECTORY="$D/export"
export ORDER_ARCHIVE_ROOT="$D/archive" RPS_PLANTEAMIENTOS_DIRECTORY="$D/rpsplan"
exec node src/server.js
