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
# Todo va entre llaves: bash lee el bloque entero antes de empezar. Sin ellas lee el fichero
# a medida que avanza, y el git pull de abajo lo cambia a mitad de camino (25/11/2026).
{
set -euo pipefail
cd "$(dirname "$0")/.."

PUERTO=4400
t0=$SECONDS
# Colores solo si la salida es una pantalla (no en logs ni tuberías): pasos en cian,
# el final bueno en verde y los errores en rojo, para encontrarlos entre la salida del build.
if [ -t 1 ]; then c_paso=$'\e[1;36m'; c_ok=$'\e[1;32m'; c_mal=$'\e[1;31m'; c_fin=$'\e[0m'
else c_paso=; c_ok=; c_mal=; c_fin=; fi
paso() { echo; echo "${c_paso}── $1  ($((SECONDS - t0)) s)${c_fin}"; }
ok() { echo; echo "${c_ok}── $1  ($((SECONDS - t0)) s)${c_fin}"; }
mal() { echo "${c_mal}!! $1${c_fin}"; }

activa=$(cat .dist-activa 2>/dev/null || echo dist)
if [ "$activa" = "dist-a" ]; then nueva=dist-b; else nueva=dist-a; fi

paso "git pull"
# El árbol de producción llegó a tener commits propios (Codex, 15/09/2026): el pull fallaría.
if [ -n "$(git log --oneline origin/main..HEAD)" ]; then
  mal "Hay commits locales que no están en origin/main. Resuélvelo antes de desplegar:"
  git log --oneline origin/main..HEAD
  exit 1
fi
lock_antes=$(git rev-parse HEAD:pnpm-lock.yaml)
pm2_antes=$(git rev-parse HEAD:ecosystem.config.cjs)
git pull --ff-only

# Dependencias y Chromium solo si cambió el lockfile: tocan node_modules con la web en marcha.
if [ "$(git rev-parse HEAD:pnpm-lock.yaml)" != "$lock_antes" ]; then
  paso "pnpm install + Chromium (cambiaron las dependencias)"
  pnpm install --frozen-lockfile
  PLAYWRIGHT_SKIP_BROWSER_GC=1 pnpm exec playwright-core install chromium
fi

# Tipos y build a la vez: no dependen uno del otro. Los tipos van con caché
# (node_modules/.cache/tsc): no borrarla. Si falla cualquiera de los dos, no se cambia nada.
paso "tipos y build en $nueva a la vez (la web sigue sirviendo desde $activa)"
log_tipos=$(mktemp)
pnpm typecheck > "$log_tipos" 2>&1 &
pid_tipos=$!
if ! pnpm exec vite build --outDir "$nueva" --emptyOutDir; then
  wait "$pid_tipos" || true
  rm -f "$log_tipos"
  exit 1
fi
paso "esperando a la comprobación de tipos"
if ! wait "$pid_tipos"; then
  cat "$log_tipos"
  rm -f "$log_tipos"
  mal "La comprobación de tipos ha fallado: no se cambia de versión."
  exit 1
fi
rm -f "$log_tipos"

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
# La tabla de PM2 solo tapa los pasos; si falla, el error sigue saliendo.
pnpm -s pm2:reload > /dev/null
# pm2 save solo guarda la lista de PM2 para cuando arranque la máquina: hace falta si cambió
# ecosystem.config.cjs (variables o forma de arrancar), no en cada despliegue.
if [ "$(git rev-parse HEAD:ecosystem.config.cjs)" != "$pm2_antes" ]; then pm2 save; fi

for _ in $(seq 1 60); do
  if curl -fsS -m 2 "http://127.0.0.1:$PUERTO/api/health" >/dev/null 2>&1; then
    ok "listo: la web responde con $nueva"
    exit 0
  fi
  sleep 1
done

echo
mal "La web no responde tras 60 s. Mira: pnpm pm2:logs"
mal "Para volver a la versión anterior: echo $activa > .dist-activa && pnpm pm2:reload"
exit 1
}
exit
