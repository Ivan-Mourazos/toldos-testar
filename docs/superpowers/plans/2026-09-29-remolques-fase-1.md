# Remolques · fase 1: base común y cálculo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que toldos-testar se llame «Planteamientos TGM», tenga acceso a Remolques desde la barra y lleve dentro el cálculo de remolques probado contra los 32 planteamientos reales.

**Architecture:** El cálculo y la geometría de remolques (TypeScript puro) se copian a `src/remolques/` con imports relativos terminados en `.ts`, para que los use Vite en la web y Node 24 (que ejecuta TypeScript sin compilar) en el servidor. Una prueba de paridad recalcula los 32 planteamientos de producción, anonimizados, y exige el mismo resultado. La marca y el enlace a la web vieja de remolques son un cambio pequeño en la barra.

**Tech Stack:** toldos-testar (Vite + React 19 + TS en `src/client`, Express 5 ESM en `src/server.js`, vitest, pnpm). Origen: `C:\Users\ivan.sanchez\Documents\Proyectos DEV\Remolques-TGM` (solo lectura).

Spec: `docs/superpowers/specs/2026-09-29-unificacion-remolques-design.md` (fase 1).

## Global Constraints

- La lógica de cálculo de remolques **no se toca**: solo cambian las rutas de los imports.
- Imports de `src/remolques/` relativos y con extensión `.ts`; sin `enum`, `namespace` ni otra sintaxis que Node no pueda borrar (Node del servidor: v24.14.0).
- El repositorio de remolques es de solo lectura: no se modifica ni se hace commit en él.
- Los datos de producción (`tmp/remolques-produccion/`) no se suben: al repositorio solo va el fichero de paridad **sin nombres de clientes ni personas y sin `snapshotSvg`**.
- Nombre visible «Planteamientos TGM»; el nombre técnico (repositorio, `/webs/toldos-testar`, PM2 `toldos-testar`, `app` de `/api/health`) no cambia.
- Toldos no cambia de comportamiento.
- No tocar ni añadir al commit ficheros con cambios ajenos (hoy: `src/client/styles.css`, `src/client/dark.css`, `src/client/relieve.css`, `src/client/components/OrdersInbox.tsx`, de Iván y Codex). Añadir siempre por ruta explícita; nada de `git add -A`, `git stash`, `reset` ni `checkout` de otros ficheros.
- Conservar los finales de línea de cada fichero. Comentarios y textos en castellano; commits en castellano explicando el porqué, terminados en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Nunca usar el `.env` real para pruebas ni tocar el servidor 192.168.0.90. Pruebas de la web contra la instancia aislada (4310).
- Solo escritorio.

## Mapa de ficheros

- Create `src/remolques/calc/{lona,baqueton,ollaos,params,redondeo,validar-params,materiales-seed}.ts` y sus tests en `src/remolques/calc/__tests__/`.
- Create `src/remolques/geometry/{caida,chaflan,color-lona,contorno,curva,perfil,tono,ventana,visibilidad}.ts` y sus tests en `src/remolques/geometry/__tests__/`.
- Create `src/remolques/entradas-vacias.ts` (lo usa `lona.test.ts`).
- Create `src/remolques/README.md` (de dónde viene y la regla de no tocar la lógica).
- Modify `tsconfig.json` (`allowImportingTsExtensions`).
- Create `scripts/remolques-fixture-paridad.mjs`, `src/remolques/__fixtures__/produccion-2026-09.json`, `src/remolques/paridad-produccion.test.ts`.
- Modify `src/config.js`, `src/server.js` (ruta `GET /api/app-info`), `src/client/App.tsx`, `index.html`, `.env.example`, `.env.production.example`.

---

### Task 1: El cálculo de remolques dentro de toldos

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:** los de `src/remolques/calc`, `src/remolques/geometry`, `src/remolques/entradas-vacias.ts`, `src/remolques/README.md`, `tsconfig.json`.

**Interfaces:**
- Produces: `src/remolques/calc/lona.ts` exporta `calcLona(input: LonaInput, params: CalcParams): LonaResult` y los tipos; `src/remolques/calc/baqueton.ts` exporta `calcBaqueton(input: BaquetonInput, params: CalcParams): BaquetonResult`; `src/remolques/calc/params.ts` exporta `DEFAULT_PARAMS`, `CalcParams`; igual que en el origen, mismos nombres.

- [ ] **Step 1: Copiar sin cambiar nada**

```bash
cd "/c/Users/ivan.sanchez/Documents/Proyectos DEV/toldos-testar"
SRC="../Remolques-TGM/src"
mkdir -p src/remolques/calc/__tests__ src/remolques/geometry/__tests__
cp $SRC/lib/calc/*.ts src/remolques/calc/
cp $SRC/lib/calc/__tests__/*.ts src/remolques/calc/__tests__/
cp $SRC/lib/geometry/*.ts src/remolques/geometry/
cp $SRC/lib/geometry/__tests__/*.ts src/remolques/geometry/__tests__/
cp $SRC/components/workspace/entradas-vacias.ts src/remolques/entradas-vacias.ts
```

- [ ] **Step 2: Comprobar que no hay imports de fuera**

Run: `grep -rhn "from \"@/" src/remolques | sed 's/.*from "@\///' | sort -u`
Expected: solo `lib/calc/…`, `lib/geometry/…` y `components/workspace/entradas-vacias`. Si sale cualquier otra ruta (p. ej. `lib/store`, `lib/rps`), PARAR e informar (NEEDS_CONTEXT): esa dependencia no está en el plan.

- [ ] **Step 3: Reescribir los imports a relativos con `.ts`**

Escribir un script de un solo uso en `tmp/` (no se sube) que, para cada `.ts` de `src/remolques`, sustituya:
- `@/lib/calc/X` → ruta relativa a `src/remolques/calc/X.ts`
- `@/lib/geometry/X` → ruta relativa a `src/remolques/geometry/X.ts`
- `@/components/workspace/entradas-vacias` → ruta relativa a `src/remolques/entradas-vacias.ts`
- imports relativos que ya existan sin extensión (`./x`, `../x`) → con `.ts`

calculando la ruta con `path.relative` desde el directorio del fichero (con `/` y prefijo `./` cuando haga falta), y conservando los finales de línea del fichero. Después:

Run: `grep -rn "from \"@/\|from '@/" src/remolques; grep -rnE "from \"\.\.?/[^\"]*[^s]\"" src/remolques | grep -v "\.ts\"" | head`
Expected: ninguna línea.

- [ ] **Step 4: Permitir imports con `.ts` en TypeScript**

En `tsconfig.json`, dentro de `compilerOptions`, añadir `"allowImportingTsExtensions": true,` (ya hay `noEmit: true`, que lo permite).

- [ ] **Step 5: README de la carpeta**

`src/remolques/README.md`:
```markdown
# Remolques (fase 1 de la unificación)

Cálculo y geometría de lonas de remolque y baquetones, copiados el 29/09/2026 de
`Remolques-TGM/src/lib/{calc,geometry}` (commit a7ffef0) sin tocar la lógica: solo
cambiaron los imports (relativos y con `.ts`, para que Node 24 los ejecute sin compilar).

- `paridad-produccion.test.ts` recalcula los 32 planteamientos reales de producción
  (`__fixtures__/produccion-2026-09.json`, anonimizado) y exige el mismo resultado.
- Cualquier cambio de cálculo tiene que seguir pasando esa prueba o explicar por qué
  cambia una medida real (Iván lo aprueba).
- Diseño: `docs/superpowers/specs/2026-09-29-unificacion-remolques-design.md`.
```

- [ ] **Step 6: Pruebas, tipos, lint y Node**

Run: `pnpm vitest run src/remolques`
Expected: pasan todas las pruebas copiadas (anotar cuántas; deben ser las mismas que en el origen: `cd ../Remolques-TGM && pnpm exec vitest run src/lib/calc src/lib/geometry` — solo lectura, para contar).

Run: `pnpm exec tsc --noEmit -p . && pnpm lint`
Expected: sin errores. Si el lint del proyecto marca reglas en el código copiado, no cambiar la lógica: preferir desactivar la regla concreta para `src/remolques/**` en `eslint.config.js` con un comentario del porqué (código copiado de otro proyecto), e informarlo.

Run: `node -e "import('./src/remolques/calc/lona.ts').then((m) => console.log(typeof m.calcLona, typeof m.USAR_COLUMNA_ATRAS))"`
Expected: `function boolean` (Node ejecuta el TypeScript directamente; puede salir un aviso ExperimentalWarning, anotarlo).

Run: `pnpm vitest run && pnpm build`
Expected: toda la suite y el build pasan.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json src/remolques
git commit -m "feat(remolques): el cálculo de lonas y baquetones entra en la web de planteamientos

Primer paso de la unificación: el cálculo y la geometría de remolques se copian
sin tocar la lógica, con sus pruebas, e imports relativos con .ts para que los
use tanto la web como el servidor (Node 24 ejecuta TypeScript sin compilar).

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Paridad con los 32 planteamientos reales

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:** `scripts/remolques-fixture-paridad.mjs`, `src/remolques/__fixtures__/produccion-2026-09.json`, `src/remolques/paridad-produccion.test.ts`.

**Interfaces:**
- Consumes: `calcLona`, `calcBaqueton` (Task 1).

- [ ] **Step 1: Script que anonimiza**

`scripts/remolques-fixture-paridad.mjs`:
```js
// Genera el fichero de paridad de remolques a partir de una copia de los datos de
// producción (tmp/remolques-produccion/planteamientos.json, que NO se sube). Quita lo
// que no hace falta para calcular y todo nombre de cliente o persona: la prueba solo
// necesita entrada, parámetros y resultado.
// Uso: node scripts/remolques-fixture-paridad.mjs [origen] [destino]
import { readFileSync, writeFileSync } from 'node:fs';

const origen = process.argv[2] || 'tmp/remolques-produccion/planteamientos.json';
const destino = process.argv[3] || 'src/remolques/__fixtures__/produccion-2026-09.json';
const datos = JSON.parse(readFileSync(origen, 'utf8'));
const lista = Array.isArray(datos) ? datos : Object.values(datos);

const limpios = lista.map((rec, indice) => ({
  caso: `${rec.tipo}-${String(indice + 1).padStart(2, '0')}`,
  tipo: rec.tipo,
  creado: rec.createdAt.slice(0, 10),
  input: {
    ...rec.input,
    cabecera: { ...rec.input.cabecera, cliente: '', realizadoPor: '', revision: '', numeroPedido: '', ordenFabricacion: '' },
    observaciones: ''
  },
  paramsSnapshot: rec.paramsSnapshot,
  result: rec.result
}));

writeFileSync(destino, `${JSON.stringify(limpios, null, 1)}\n`);
console.log(`${destino}: ${limpios.length} planteamientos`);
```
Antes de ejecutarlo, comprobar leyendo `calcLona`/`calcBaqueton` que no usan `cabecera` ni `observaciones` (si alguno los usa, no vaciar ese campo y anotarlo). `clienteEspecifico` del baquetón **se conserva**: es la clave de los extras por cliente de los parámetros y cambia el cálculo.

Run: `node scripts/remolques-fixture-paridad.mjs`
Expected: `src/remolques/__fixtures__/produccion-2026-09.json: 32 planteamientos`.

Run: `grep -ci "snapshotSvg\|realizadoPor\":\s*\"[^\"]" src/remolques/__fixtures__/produccion-2026-09.json`
Expected: `0`. Revisar a ojo que no queda ningún nombre de cliente fuera de `clienteEspecifico` y de los extras de cliente dentro de `paramsSnapshot` (son parámetros de cálculo).

- [ ] **Step 2: La prueba**

`src/remolques/paridad-produccion.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import casos from './__fixtures__/produccion-2026-09.json';
import { calcLona, type LonaInput } from './calc/lona.ts';
import { calcBaqueton, type BaquetonInput } from './calc/baqueton.ts';
import type { CalcParams } from './calc/params.ts';

// Paridad con producción (diseño 29/09/2026): los 32 planteamientos reales de remolques,
// del 08/09 al 25/09/2026, recalculados con sus propios parámetros tienen que dar
// exactamente lo mismo que se guardó. Única diferencia conocida: los baquetones
// anteriores al campo `baquetonDelantero` no lo tienen guardado y el cálculo lo da null.
type Caso = { caso: string; tipo: 'lona' | 'baqueton'; creado: string; input: unknown; paramsSnapshot: unknown; result: Record<string, unknown> };

function sinCamposNuevosVacios(calculado: Record<string, unknown>, guardado: Record<string, unknown>) {
  const copia = { ...calculado };
  if (!('baquetonDelantero' in guardado) && copia.baquetonDelantero === null) delete copia.baquetonDelantero;
  return copia;
}

describe('paridad de remolques con producción', () => {
  const lista = casos as Caso[];

  it('hay 32 planteamientos reales', () => {
    expect(lista).toHaveLength(32);
  });

  it.each(lista.map((c) => [c.caso, c] as const))('%s da lo mismo que en producción', (_nombre, caso) => {
    const params = caso.paramsSnapshot as CalcParams;
    const calculado = caso.tipo === 'lona'
      ? calcLona(caso.input as LonaInput, params)
      : calcBaqueton(caso.input as BaquetonInput, params);
    expect(sinCamposNuevosVacios(calculado as unknown as Record<string, unknown>, caso.result)).toEqual(caso.result);
  });
});
```
(`resolveJsonModule` ya está en el tsconfig. Si `it.each` con tuplas da problemas de tipos, usar un `for` con `it(...)` dentro.)

- [ ] **Step 3: Ejecutar**

Run: `pnpm vitest run src/remolques/paridad-produccion.test.ts`
Expected: 33 pruebas pasan (1 + 32).

- [ ] **Step 4: Comprobar que la prueba detecta un cambio**

Cambiar temporalmente en `src/remolques/calc/baqueton.ts` una suma (p. ej. `+ params.baquetonDemasiaFinal` → `+ params.baquetonDemasiaFinal + 0.1`), ejecutar la prueba y ver que fallan los baquetones; deshacer el cambio a mano y volver a ejecutar (todo pasa). Anotar en el informe.

- [ ] **Step 5: Suite y commit**

Run: `pnpm vitest run && pnpm lint && pnpm exec tsc --noEmit -p .`

```bash
git add scripts/remolques-fixture-paridad.mjs src/remolques/__fixtures__/produccion-2026-09.json src/remolques/paridad-produccion.test.ts
git commit -m "test(remolques): paridad con los 32 planteamientos reales de producción

Para que la unificación no empeore nada, cada planteamiento de remolque hecho en
septiembre se recalcula con sus parámetros y tiene que dar lo mismo. Los datos van
sin nombres de clientes ni personas.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: «Planteamientos TGM» y acceso a Remolques

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:** `src/config.js`, `src/server.js`, `src/client/App.tsx`, `index.html`, `.env.example`, `.env.production.example`, `src/client/relieve.css` **solo si** no tiene cambios ajenos en ese momento (si los tiene, poner el estilo en un fichero nuevo `src/client/remolques-nav.css` importado desde `App.tsx`).

**Interfaces:**
- Produces: `GET /api/app-info` → `{ remolquesUrl: string }` (vacío si no está configurado).

- [ ] **Step 1: Configuración**

En `src/config.js`, dentro de `config`:
```js
  // Unificación con remolques (diseño 29/09/2026, fase 1): mientras sus pantallas no
  // estén dentro, la barra enlaza con la web de remolques. Sin valor, no sale el enlace.
  remolquesUrl: process.env.REMOLQUES_URL || '',
```
En `.env.example` y `.env.production.example`, al final:
```
# Web de remolques mientras se une a esta (fase 1). Es la dirección que abre el
# navegador de cada puesto, no la interna del servidor. Ej.: http://192.168.0.90:4500
REMOLQUES_URL=
```

- [ ] **Step 2: Ruta**

En `src/server.js`, junto a `/api/health`:
```js
// Datos de la web que necesita la barra de arriba (diseño 29/09/2026).
app.get('/api/app-info', (_req, res) => {
  res.set('Cache-Control', 'no-store').json({ remolquesUrl: config.remolquesUrl });
});
```

- [ ] **Step 3: Marca y enlace**

`index.html`: `<title>Planteamientos TGM</title>`.

`src/client/App.tsx`:
- La marca: `<div><h1>Planteamientos</h1><span>TGM</span></div>` en lugar de `Toldos` / `Planteamientos`. Comprobar con `grep -rn "Toldos" src/client scripts .claude/skills/running-toldos-testar` que ninguna prueba ni helper busca el texto «Toldos» de la marca; si alguno lo hace, actualizarlo.
- Leer `/api/app-info` una vez al montar (`useEffect` + `fetch`, sin reintentos; si falla, sin enlace).
- Tras el último `TabButton`, si hay `remolquesUrl`:
```tsx
<a className="tecla-3d sobre-oscuro app-remolques-link" href={remolquesUrl}>
  <Truck aria-hidden="true" />Remolques
</a>
```
con `Truck` de `lucide-react`. Mismo alto y aspecto que las pestañas (reutilizar las clases de `TabButton`: mirar `src/client/components/TabButton.tsx` y replicar su marcado/clases para que se vea igual). Se abre en la misma pestaña.

- [ ] **Step 4: Comprobar en la instancia aislada**

Reiniciar la aislada con `REMOLQUES_URL=http://127.0.0.1:4500` exportado antes de `bash .claude/skills/running-toldos-testar/start-isolated.sh` (parar antes lo que escuche en 4310/4320 con PowerShell `Get-NetTCPConnection -LocalPort <p> -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`; esperar a `/api/health`). Capturas de la barra en claro y oscuro a 1280×720 y 1600×1000 con `openApp` de `.claude/skills/running-toldos-testar/drive.mjs` (script en `tmp/`): se lee «Planteamientos / TGM», el enlace «Remolques» está alineado con las pestañas y no se monta con el botón de tema ni con «Soy». Reiniciar después sin `REMOLQUES_URL` y comprobar que el enlace no sale. Dejar la aislada arrancada.

- [ ] **Step 5: Suite y commit**

Run: `pnpm vitest run && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm build && node scripts/test-rps-e2e.mjs`

```bash
git add src/config.js src/server.js src/client/App.tsx index.html .env.example .env.production.example <css que se haya tocado>
git commit -m "feat(marca): Planteamientos TGM y acceso a Remolques desde la barra

La web deja de llamarse solo Toldos porque va a reunir toldos y remolques. Mientras
las pantallas de remolques no estén dentro, la barra enlaza con su web actual
(REMOLQUES_URL); el nombre técnico no cambia para no romper despliegues.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Despliegue (lo hace Iván)

1. En `/webs/toldos-testar/.env` añadir `REMOLQUES_URL=` con la dirección con la que los puestos abren hoy la web de remolques (p. ej. `http://192.168.0.90:4500`).
2. `cd /webs/toldos-testar && git pull --ff-only && pnpm build && pnpm deploy:check && pnpm deploy:smoke && pnpm pm2:reload && pm2 save`
