#!/usr/bin/env bash
# Actualiza Planteamientos en el servidor sin dejar la web en blanco mientras compila.
#
#   cd /webs/toldos-testar && bash scripts/desplegar.sh
#
# Antes `vite build` vaciaba dist/ con la web en marcha. Ahora hay dos carpetas, dist-a y dist-b:
# se compila en la libre, se pasan deploy:check y deploy:smoke sobre ella con la web en pie, y solo
# al final se apunta .dist-activa a la nueva y se recarga PM2. Si algo falla antes, no se toca nada.
#
# Volver a la versión anterior (sigue compilada en la otra carpeta):
#   echo dist-a > .dist-activa && pnpm pm2:reload      (o dist-b)
set -euo pipefail
cd "$(dirname "$0")/.."

PUERTO=4400
t0=$SECONDS
paso() { echo; echo "── $1  ($((SECONDS - t0)) s)"; }

activa=$(cat .dist-activa 2>/dev/null || echo dist)
if [ "$activa" = "dist-a" ]; then nueva=dist-b; else nueva=dist-a; fi

paso "git pull"
# El árbol de producción llegó a tener commits propios (Codex, 15/09/2026): el pull fallaría.
if [ -n "$(git log --oneline origin/main..HEAD)" ]; then
  echo "!! Hay commits locales que no están en origin/main. Resuélvelo antes de desplegar:"
  git log --oneline origin/main..HEAD
  exit 1
fi
lock_antes=$(git rev-parse HEAD:pnpm-lock.yaml)
git pull --ff-only

# Dependencias y Chromium solo si cambió el lockfile: tocan node_modules con la web en marcha.
if [ "$(git rev-parse HEAD:pnpm-lock.yaml)" != "$lock_antes" ]; then
  paso "pnpm install + Chromium (cambiaron las dependencias)"
  pnpm install --frozen-lockfile
  PLAYWRIGHT_SKIP_BROWSER_GC=1 pnpm exec playwright-core install chromium
fi

paso "tipos (con caché en node_modules/.cache/tsc: no borrarla)"
pnpm typecheck

paso "build en $nueva (la web sigue sirviendo desde $activa)"
pnpm exec vite build --outDir "$nueva" --emptyOutDir

# Quien tenga Planteamientos abierto sigue pidiendo los ficheros de su versión al entrar en una
# parte que aún no había cargado. Se conservan los de la versión anterior de los últimos 7 días
# (cp -p mantiene su fecha, así que los viejos se van cayendo solos).
if [ -d "$activa/assets" ]; then
  find "$activa/assets" -maxdepth 1 -type f -mtime -7 -exec cp -pn {} "$nueva/assets/" \;
fi

paso "deploy:check y deploy:smoke sobre $nueva"
DIST_DIR=$nueva pnpm deploy:check
DIST_DIR=$nueva pnpm deploy:smoke

paso "cambio a $nueva y recarga"
echo "$nueva" > .dist-activa
pnpm pm2:reload
pm2 save

for _ in $(seq 1 60); do
  if curl -fsS -m 2 "http://127.0.0.1:$PUERTO/api/health" >/dev/null 2>&1; then
    paso "listo: la web responde con $nueva"
    exit 0
  fi
  sleep 1
done

echo
echo "!! La web no responde tras 60 s. Mira: pnpm pm2:logs"
echo "!! Para volver a la versión anterior: echo $activa > .dist-activa && pnpm pm2:reload"
exit 1
