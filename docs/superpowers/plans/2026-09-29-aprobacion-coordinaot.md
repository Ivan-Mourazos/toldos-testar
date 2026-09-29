# Aprobación leída de CoordinaOT — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la web de planteamientos (toldos-testar) lea sola el estado de cada OF en CoordinaOT, lo enseñe en Pedidos y solo deje generar archivos cuando todas las OF del pedido están aprobadas.

**Architecture:** CoordinaOT gana una ruta de solo lectura `GET /api/integracion/ofs` protegida con clave compartida. Toldos la consulta desde su servidor (`src/coordinaStatus.js`, con tiempo máximo y caché), aplica reglas puras compartidas con la web (`src/reviewRules.js`) y comprueba la aprobación en el propio `generate-files`. La web pide el estado por su servidor (la clave no llega al navegador).

**Tech Stack:** CoordinaOT: Next.js 16 (App Router), TypeScript, better-sqlite3, vitest. Toldos: Express 5 (ESM, JS), React 19 + TS (Vite), vitest, Playwright para e2e.

Spec: `docs/superpowers/specs/2026-09-29-aprobacion-coordinaot-design.md`.

## Global Constraints

- CoordinaOT manda: toldos **solo lee**; ninguna escritura en CoordinaOT; sin botones de aprobar/devolver en toldos.
- El enlace es la OF (`awning.of`, p. ej. `0230194`), nunca el código de pedido.
- Si CoordinaOT no responde, **no se genera**. Mensaje exacto: «No se puede comprobar la aprobación en CoordinaOT; inténtalo en un momento.»
- Generar lo sigue pulsando el autor; nada automático.
- Cabecera `X-Clave-Integracion`; variable en CoordinaOT `INTEGRACION_CLAVE`; en toldos `COORDINA_URL` y `COORDINA_CLAVE`. La clave nunca llega al navegador.
- CoordinaOT responde solo `of`, `estado`, `nota` (texto solo si `devuelta`), `actualizado`.
- Toldos: tiempo máximo 4 s por consulta, caché 30 s por OF; `generate-files` consulta **sin caché**. Pedidos refresca cada 60 s.
- Textos en castellano llano, sin jerga. Comentarios de código en castellano, con el porqué.
- Nunca usar el `.env` real de toldos ni tocar el servidor 192.168.0.90. Pruebas de toldos contra la instancia aislada (4310).
- Commits en castellano explicando el porqué, terminados en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Conservar los finales de línea de cada fichero.
- Solo escritorio (1280×720, 1600, 1920).

## Mapa de ficheros

**coordina-ot** (`C:\Users\ivan.sanchez\Documents\Proyectos DEV\coordina-ot`)
- Create `src/lib/integracion.ts` — reglas puras: clave, lista de OF, resumen por OF.
- Modify `src/lib/server/estado-db.ts` — añade `leerOverlayPorOrdenes`.
- Create `src/app/api/integracion/ofs/route.ts` — la ruta.
- Create `src/lib/__tests__/integracion.test.ts`, `src/lib/__tests__/api-integracion-ofs.test.ts`.
- Modify `.env.example`, `DEPLOY.md` — `INTEGRACION_CLAVE`.

**toldos-testar**
- Modify `src/reviewRules.js` (+ `src/reviewRules.test.js`) — `uniqueOfs`, `coordinaGroup`, `generationBlock`, `COORDINA_UNAVAILABLE`.
- Create `src/coordinaStatus.js` (+ `src/coordinaStatus.test.js`) — cliente HTTP con caché.
- Modify `src/config.js` — `coordinaUrl`, `coordinaClave`.
- Modify `src/server.js` — ruta `GET /api/coordina/ofs` y comprobación en `generate-files`.
- Create `scripts/fake-coordina.mjs` — CoordinaOT simulado para la instancia aislada.
- Modify `.claude/skills/running-toldos-testar/start-isolated.sh` y `SKILL.md` — arranca el simulado y apunta a él.
- Create `src/client/hooks/useCoordinaStatus.ts` — la web pide el estado (60 s).
- Modify `src/client/ordersInbox.ts` (+ test), `src/client/components/OrdersInbox.tsx`, `src/client/views/ReviewsView.tsx`, `src/client/components/ReviewOrderDetail.tsx`, `src/client/generatePermission.ts`, `src/client/relieve.css`, `src/client/types.ts`.
- Create `scripts/test-coordina-approval-e2e.mjs`.

---

### Task 1: CoordinaOT — ruta de estado de OF

Modelo recomendado: **Opus, esfuerzo medio** (web madre).

**Files:**
- Create: `src/lib/integracion.ts`
- Modify: `src/lib/server/estado-db.ts` (añadir función exportada al final de la zona de lecturas, junto a `leerOverlayDeOfs`)
- Create: `src/app/api/integracion/ofs/route.ts`
- Test: `src/lib/__tests__/integracion.test.ts`, `src/lib/__tests__/api-integracion-ofs.test.ts`
- Modify: `.env.example`, `DEPLOY.md`

**Interfaces:**
- Produces (HTTP, lo consume toldos en Task 3): `GET /api/integracion/ofs?ofs=0230194,0230195` con cabecera `X-Clave-Integracion`. 200 → `{ ofs: [{ of: string, estado: string, nota: string, actualizado: string | null }] }`; 401 clave mala; 400 lista inválida; 503 sin `INTEGRACION_CLAVE`.
- `estado` ∈ `pendiente | en_curso | por_revisar | en_revision | devuelta | aprobada | anulada | sin_estado`.

Contexto: en `of_overlay` el `of_id` es `«OF»:«tarea»` (p. ej. `0232360:11`); también hay ids de maqueta sin `:` (`ped-7-of1`). Una OF puede tener varias filas (varias tareas). Se agrupan por el número antes de `:` y manda la **menos avanzada**, con este orden de avance: `devuelta`, `pendiente`, `en_curso`, `por_revisar`, `en_revision`, `anulada`, `aprobada`. La observación de CoordinaOT se guarda también en estados que no son `devuelta`: solo se envía como `nota` si el resumen es `devuelta`.

- [ ] **Step 1: Comprobar las tareas por OF en la base local (solo lectura)**

```bash
cd "/c/Users/ivan.sanchez/Documents/Proyectos DEV/coordina-ot"
cat > /tmp/ofs-varias.cjs <<'EOF'
const D = require(process.cwd() + '/node_modules/better-sqlite3');
const db = new D('data/coordina.db', { readonly: true, fileMustExist: true });
console.log(db.prepare("SELECT substr(of_id,1,instr(of_id,':')-1) orden, group_concat(of_id || '=' || estado, ' | ') filas FROM of_overlay WHERE instr(of_id,':')>0 GROUP BY orden HAVING count(*)>1 LIMIT 10").all());
EOF
node /tmp/ofs-varias.cjs
```
Anotar en el informe qué OF tienen varias filas y con qué estados. Si alguna mezcla una tarea de Diseño con una de OT, la regla «manda la menos avanzada» sigue siendo segura (bloquea antes que dejar pasar); no cambiarla sin consultar.

- [ ] **Step 2: Test de las reglas puras (falla)**

`src/lib/__tests__/integracion.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { claveValida, leerOfsPedidas, resumirOf } from "../integracion";

describe("claveValida", () => {
  test("acepta solo la clave exacta", () => {
    expect(claveValida("secreta-123", "secreta-123")).toBe(true);
    expect(claveValida("secreta-124", "secreta-123")).toBe(false);
    expect(claveValida("", "secreta-123")).toBe(false);
    expect(claveValida(null, "secreta-123")).toBe(false);
    expect(claveValida("secreta-123", "")).toBe(false);
  });
});

describe("leerOfsPedidas", () => {
  test("lista limpia y sin repetidas", () => {
    expect(leerOfsPedidas("0230194, 0230195,0230194")).toEqual(["0230194", "0230195"]);
  });
  test("rechaza vacío, formatos raros y más de 50", () => {
    expect(leerOfsPedidas(null)).toBeNull();
    expect(leerOfsPedidas("")).toBeNull();
    expect(leerOfsPedidas("0230194,abc")).toBeNull();
    expect(leerOfsPedidas("0230194:5")).toBeNull();
    expect(leerOfsPedidas(Array.from({ length: 51 }, (_, i) => String(1000000 + i)).join(","))).toBeNull();
  });
});

describe("resumirOf", () => {
  test("sin filas: sin_estado", () => {
    expect(resumirOf("0230194", [])).toEqual({ of: "0230194", estado: "sin_estado", nota: "", actualizado: null });
  });
  test("una fila aprobada", () => {
    expect(resumirOf("0230194", [{ estado: "aprobada", observacion: "vieja", updatedAt: "2026-09-29T08:00:00Z" }]))
      .toEqual({ of: "0230194", estado: "aprobada", nota: "", actualizado: "2026-09-29T08:00:00Z" });
  });
  test("varias tareas: manda la menos avanzada y la nota solo si está devuelta", () => {
    const r = resumirOf("0230700", [
      { estado: "aprobada", observacion: null, updatedAt: "2026-09-29T08:00:00Z" },
      { estado: "devuelta", observacion: "Falta el lado del brazo", updatedAt: "2026-09-29T09:00:00Z" },
    ]);
    expect(r).toEqual({ of: "0230700", estado: "devuelta", nota: "Falta el lado del brazo", actualizado: "2026-09-29T09:00:00Z" });
    expect(resumirOf("0230701", [
      { estado: "aprobada", observacion: null, updatedAt: "2026-09-29T08:00:00Z" },
      { estado: "en_revision", observacion: "nota interna", updatedAt: "2026-09-29T07:00:00Z" },
    ])).toEqual({ of: "0230701", estado: "en_revision", nota: "", actualizado: "2026-09-29T08:00:00Z" });
  });
  test("un estado desconocido se trata como pendiente", () => {
    expect(resumirOf("0230194", [{ estado: "rara", observacion: null, updatedAt: "2026-09-29T08:00:00Z" }]).estado).toBe("pendiente");
  });
});
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `pnpm vitest run src/lib/__tests__/integracion.test.ts`
Expected: FAIL (no existe `../integracion`).

- [ ] **Step 4: Implementar `src/lib/integracion.ts`**

```ts
import { timingSafeEqual } from "node:crypto";

// ─── Integración de solo lectura con la web de planteamientos ────────────────
// La web de toldos (y después la de remolques) pregunta cómo están sus OF para
// enseñar «aprobado» o «devuelto» sin que nadie lo copie a mano. CoordinaOT
// manda: aquí solo se lee, y solo se cuenta el estado de las OF que se piden.

export const MAX_OFS = 50;
const OF_RE = /^\d{5,9}$/;

export type EstadoIntegracion =
  | "pendiente" | "en_curso" | "por_revisar" | "en_revision"
  | "devuelta" | "aprobada" | "anulada" | "sin_estado";

export interface EstadoOfIntegracion {
  of: string;
  estado: EstadoIntegracion;
  nota: string;
  actualizado: string | null;
}

export interface FilaOverlayOf {
  estado: string;
  observacion: string | null;
  updatedAt: string;
}

// De menos a más avanzada. Con varias tareas de la misma OF manda la primera
// de esta lista: una devuelta gana a una aprobada, y así nunca se da por buena
// una OF que alguien ha parado.
const AVANCE: readonly EstadoIntegracion[] = [
  "devuelta", "pendiente", "en_curso", "por_revisar", "en_revision", "anulada", "aprobada",
];

/** Compara en tiempo constante; sin clave configurada no vale ninguna. */
export function claveValida(recibida: string | null, esperada: string | undefined): boolean {
  if (!esperada || !recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `?ofs=0230194,0230195` → lista sin repetidas, o null si algo no es una OF. */
export function leerOfsPedidas(param: string | null): string[] | null {
  const ofs = [...new Set((param ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  if (ofs.length === 0 || ofs.length > MAX_OFS) return null;
  return ofs.every((of) => OF_RE.test(of)) ? ofs : null;
}

function normalizar(estado: string): EstadoIntegracion {
  return (AVANCE as readonly string[]).includes(estado) ? (estado as EstadoIntegracion) : "pendiente";
}

export function resumirOf(of: string, filas: readonly FilaOverlayOf[]): EstadoOfIntegracion {
  if (filas.length === 0) return { of, estado: "sin_estado", nota: "", actualizado: null };
  const conEstado = filas.map((f) => ({ ...f, normal: normalizar(f.estado) }));
  const peor = conEstado.reduce((a, b) => (AVANCE.indexOf(b.normal) < AVANCE.indexOf(a.normal) ? b : a));
  const actualizado = filas.map((f) => f.updatedAt).sort().at(-1) ?? null;
  return {
    of,
    estado: peor.normal,
    nota: peor.normal === "devuelta" ? (peor.observacion ?? "").trim() : "",
    actualizado,
  };
}
```

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/lib/__tests__/integracion.test.ts`
Expected: PASS.

- [ ] **Step 6: Lectura en `estado-db.ts`**

Añadir junto a `leerOverlayDeOfs`:
```ts
/** Filas de `of_overlay` de estas OF, agrupadas por número de OF (lo que va
 *  antes de `:` en `of_id`). Para la integración de solo lectura con la web
 *  de planteamientos (`/api/integracion/ofs`): una OF puede tener varias
 *  tareas y allí se decide cuál manda. */
export function leerOverlayPorOrdenes(
  ordenes: readonly string[],
): Map<string, Array<{ estado: string; observacion: string | null; updatedAt: string }>> {
  const porOrden = new Map<string, Array<{ estado: string; observacion: string | null; updatedAt: string }>>();
  if (ordenes.length === 0) return porOrden;
  const filas = abrir()
    .prepare(
      `SELECT substr(of_id, 1, instr(of_id || ':', ':') - 1) AS orden, estado, observacion, updated_at AS updatedAt
         FROM of_overlay
        WHERE substr(of_id, 1, instr(of_id || ':', ':') - 1) IN (${ordenes.map(() => "?").join(",")})`,
    )
    .all(...ordenes) as Array<{ orden: string; estado: string; observacion: string | null; updatedAt: string }>;
  for (const { orden, ...fila } of filas) {
    const lista = porOrden.get(orden) ?? [];
    lista.push(fila);
    porOrden.set(orden, lista);
  }
  return porOrden;
}
```

- [ ] **Step 7: Test de la ruta (falla)**

`src/lib/__tests__/api-integracion-ofs.test.ts`:
```ts
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let dir: string;
let route: typeof import("../../app/api/integracion/ofs/route");
let estadoDb: typeof import("../server/estado-db");

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "coordina-api-integracion-"));
  process.env.COORDINA_DB_PATH = path.join(dir, "test.db");
  route = await import("../../app/api/integracion/ofs/route");
  estadoDb = await import("../server/estado-db");
});

afterAll(() => {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* WAL abierto en Windows */ }
});

beforeEach(() => {
  process.env.INTEGRACION_CLAVE = "clave-de-prueba";
  const db = estadoDb.getDb();
  db.prepare("DELETE FROM of_overlay").run();
  const alta = db.prepare("INSERT INTO of_overlay (of_id, estado, observacion, updated_at) VALUES (?, ?, ?, ?)");
  alta.run("0230194:5", "aprobada", null, "2026-09-29T08:00:00Z");
  alta.run("0230195:5", "devuelta", "Falta el lado del brazo", "2026-09-29T09:00:00Z");
  alta.run("0230700:1", "aprobada", null, "2026-09-29T08:00:00Z");
  alta.run("0230700:6", "en_revision", "interna", "2026-09-29T07:00:00Z");
});

const pedir = (ofs: string, clave: string | null = "clave-de-prueba") =>
  route.GET(new Request(`http://x/api/integracion/ofs?ofs=${encodeURIComponent(ofs)}`, {
    headers: clave === null ? {} : { "X-Clave-Integracion": clave },
  }));

test("sin clave o con clave mala: 401 y nada de datos", async () => {
  for (const res of [await pedir("0230194", null), await pedir("0230194", "otra")]) {
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain("aprobada");
  }
});

test("sin INTEGRACION_CLAVE configurada: 503", async () => {
  delete process.env.INTEGRACION_CLAVE;
  expect((await pedir("0230194")).status).toBe(503);
});

test("lista inválida: 400", async () => {
  expect((await pedir("0230194,abc")).status).toBe(400);
});

test("responde cada OF con solo sus cuatro campos", async () => {
  const res = await pedir("0230194,0230195,0230700,0239999");
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(await res.json()).toEqual({
    ofs: [
      { of: "0230194", estado: "aprobada", nota: "", actualizado: "2026-09-29T08:00:00Z" },
      { of: "0230195", estado: "devuelta", nota: "Falta el lado del brazo", actualizado: "2026-09-29T09:00:00Z" },
      { of: "0230700", estado: "en_revision", nota: "", actualizado: "2026-09-29T08:00:00Z" },
      { of: "0239999", estado: "sin_estado", nota: "", actualizado: null },
    ],
  });
});
```

Si el `INSERT` falla por alguna columna `NOT NULL` sin valor por defecto, añadir esa columna al `INSERT` con el valor neutro que use `guardarMutacion`, y anotarlo en el informe.

- [ ] **Step 8: Ejecutar y ver que falla**

Run: `pnpm vitest run src/lib/__tests__/api-integracion-ofs.test.ts`
Expected: FAIL (no existe la ruta).

- [ ] **Step 9: Implementar la ruta**

`src/app/api/integracion/ofs/route.ts`:
```ts
import { NextResponse } from "next/server";
import { claveValida, leerOfsPedidas, resumirOf } from "@/lib/integracion";
import { leerOverlayPorOrdenes } from "@/lib/server/estado-db";

// ─── GET /api/integracion/ofs?ofs=0230194,0230195 ────────────────────────────
// Solo lectura, para la web de planteamientos: cómo está cada OF (aprobada,
// devuelta con su nota, en revisión…). Pide la cabecera X-Clave-Integracion
// igual a INTEGRACION_CLAVE. Sin la variable configurada no responde nada:
// una integración a medio montar no debe quedar abierta.
// Solo sale `of`, `estado`, `nota` y `actualizado`: ni cliente, ni personas,
// ni notas internas.

export const dynamic = "force-dynamic";

const sinCache = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const esperada = process.env.INTEGRACION_CLAVE;
  if (!esperada) {
    return NextResponse.json({ error: "Integración sin configurar" }, { status: 503, headers: sinCache });
  }
  if (!claveValida(req.headers.get("x-clave-integracion"), esperada)) {
    return NextResponse.json({ error: "Clave no válida" }, { status: 401, headers: sinCache });
  }
  const ofs = leerOfsPedidas(new URL(req.url).searchParams.get("ofs"));
  if (!ofs) {
    return NextResponse.json({ error: "Lista de OF no válida" }, { status: 400, headers: sinCache });
  }
  const filas = leerOverlayPorOrdenes(ofs);
  return NextResponse.json({ ofs: ofs.map((of) => resumirOf(of, filas.get(of) ?? [])) }, { headers: sinCache });
}
```

- [ ] **Step 10: Ejecutar, suite completa y lint**

Run: `pnpm vitest run src/lib/__tests__/api-integracion-ofs.test.ts src/lib/__tests__/integracion.test.ts && pnpm test && pnpm lint`
Expected: todo PASS, lint sin errores.

- [ ] **Step 11: Documentar la variable**

En `.env.example`, al final:
```
# Integración de solo lectura con la web de planteamientos (toldos, remolques).
# La misma clave va en COORDINA_CLAVE de esa web. Sin valor, /api/integracion/ofs
# responde 503. Generar con: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
INTEGRACION_CLAVE=
```
En `DEPLOY.md`, en la sección de variables de `.env.local`, añadir un párrafo con lo mismo.

- [ ] **Step 12: Commit (en coordina-ot)**

```bash
git add src/lib/integracion.ts src/lib/server/estado-db.ts src/app/api/integracion/ofs/route.ts src/lib/__tests__/integracion.test.ts src/lib/__tests__/api-integracion-ofs.test.ts .env.example DEPLOY.md
git commit -m "feat(integracion): estado de OF de solo lectura para la web de planteamientos

La web de toldos tiene que saber si un pedido está aprobado o devuelto en
CoordinaOT sin que nadie lo copie a mano. Ruta nueva protegida con clave que solo
cuenta el estado de las OF que se piden; con varias tareas manda la menos
avanzada para no dar nunca por buena una OF parada.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
No hacer push: lo decide Iván al desplegar.

---

### Task 2: Toldos — reglas puras de aprobación

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:**
- Modify: `src/reviewRules.js`
- Test: `src/reviewRules.test.js`

**Interfaces:**
- Produces:
  - `COORDINA_UNAVAILABLE: string` = `'No se puede comprobar la aprobación en CoordinaOT; inténtalo en un momento.'`
  - `uniqueOfs(awnings: {letter: string, of: string}[]): string[]`
  - `coordinaGroup(awnings, status): 'por_revisar' | 'devuelto' | 'aprobado'`
  - `generationBlock(awnings, status): string | null`
  - `status` tiene la forma `{ disponible: boolean, ofs?: Record<string, { estado: string, nota?: string, actualizado?: string | null }>, motivo?: string }`.

- [ ] **Step 1: Tests (fallan)**

Añadir a `src/reviewRules.test.js` (y al `import` de arriba `COORDINA_UNAVAILABLE, coordinaGroup, generationBlock, uniqueOfs`):
```js
describe('aprobación leída de CoordinaOT', () => {
  const awnings = [{ letter: 'A', of: '0230194' }, { letter: 'B', of: ' 0230195 ' }];
  const status = (ofs) => ({ disponible: true, ofs });
  const ok = { estado: 'aprobada', nota: '' };

  it('uniqueOfs limpia espacios, vacíos y repetidas', () => {
    expect(uniqueOfs([...awnings, { letter: 'C', of: '0230194' }, { letter: 'D', of: '' }])).toEqual(['0230194', '0230195']);
  });

  it('coordinaGroup: aprobado solo con todas aprobadas', () => {
    expect(coordinaGroup(awnings, status({ '0230194': ok, '0230195': ok }))).toBe('aprobado');
    expect(coordinaGroup(awnings, status({ '0230194': ok, '0230195': { estado: 'en_revision' } }))).toBe('por_revisar');
    expect(coordinaGroup(awnings, status({ '0230194': ok }))).toBe('por_revisar');
  });

  it('coordinaGroup: una devuelta manda', () => {
    expect(coordinaGroup(awnings, status({ '0230194': ok, '0230195': { estado: 'devuelta', nota: 'x' } }))).toBe('devuelto');
  });

  it('coordinaGroup: sin CoordinaOT o sin toldos, por revisar', () => {
    expect(coordinaGroup(awnings, { disponible: false })).toBe('por_revisar');
    expect(coordinaGroup(awnings, undefined)).toBe('por_revisar');
    expect(coordinaGroup([], status({}))).toBe('por_revisar');
  });

  it('generationBlock: null con todo aprobado', () => {
    expect(generationBlock(awnings, status({ '0230194': ok, '0230195': ok }))).toBeNull();
  });

  it('generationBlock: falta la OF va primero, aunque CoordinaOT no responda', () => {
    expect(generationBlock([{ letter: 'A', of: '0230194' }, { letter: 'B', of: '' }], { disponible: false }))
      .toBe('Falta la OF en el toldo B.');
    expect(generationBlock([{ letter: 'A', of: '' }, { letter: 'C', of: ' ' }], status({})))
      .toBe('Falta la OF en los toldos A, C.');
  });

  it('generationBlock: CoordinaOT sin responder bloquea', () => {
    expect(generationBlock(awnings, { disponible: false })).toBe(COORDINA_UNAVAILABLE);
  });

  it('generationBlock: dice qué falta y cómo está', () => {
    expect(generationBlock(awnings, status({ '0230194': { estado: 'devuelta', nota: 'n' }, '0230195': { estado: 'en_revision' } })))
      .toBe('Sin aprobar en CoordinaOT: A (0230194) devuelta, B (0230195) en revisión.');
    expect(generationBlock(awnings, status({ '0230194': ok })))
      .toBe('Sin aprobar en CoordinaOT: B (0230195) sin revisión en CoordinaOT.');
  });

  it('generationBlock: pedido sin toldos', () => {
    expect(generationBlock([], status({}))).toBe('El pedido no tiene toldos.');
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/reviewRules.test.js`
Expected: FAIL (funciones no exportadas).

- [ ] **Step 3: Implementar al final de `src/reviewRules.js`**

```js
// Aprobación leída de CoordinaOT (diseño 29/09/2026): CoordinaOT aprueba o devuelve
// cada OF y aquí solo se lee. Estas reglas las usan el servidor (generate-files) y la
// web (grupos de Pedidos y botón «Generar archivos»), para que digan lo mismo.

export const COORDINA_UNAVAILABLE = 'No se puede comprobar la aprobación en CoordinaOT; inténtalo en un momento.';

const coordinaStateLabels = {
  devuelta: 'devuelta',
  pendiente: 'pendiente',
  en_curso: 'en curso',
  por_revisar: 'por revisar',
  en_revision: 'en revisión',
  anulada: 'anulada',
  aprobada: 'aprobada',
  sin_estado: 'sin revisión en CoordinaOT'
};

function cleanOf(value) {
  return String(value ?? '').trim();
}

function coordinaState(status, of) {
  return status?.ofs?.[cleanOf(of)]?.estado || 'sin_estado';
}

/** @param {{ letter: string, of: string }[]} awnings */
export function uniqueOfs(awnings) {
  return [...new Set(awnings.map((awning) => cleanOf(awning.of)).filter(Boolean))];
}

/**
 * Grupo de Pedidos según CoordinaOT. Sin respuesta, todo queda por revisar.
 * @returns {'por_revisar' | 'devuelto' | 'aprobado'}
 */
export function coordinaGroup(awnings, status) {
  if (!status?.disponible || awnings.length === 0) return 'por_revisar';
  const states = awnings.map((awning) => coordinaState(status, awning.of));
  if (states.includes('devuelta')) return 'devuelto';
  return states.every((state) => state === 'aprobada') ? 'aprobado' : 'por_revisar';
}

/**
 * Por qué no se puede generar todavía, en castellano llano; null si se puede.
 * La OF que falta va primero: sin ella ni siquiera se puede preguntar a CoordinaOT.
 */
export function generationBlock(awnings, status) {
  if (awnings.length === 0) return 'El pedido no tiene toldos.';
  const withoutOf = awnings.filter((awning) => !cleanOf(awning.of)).map((awning) => awning.letter);
  if (withoutOf.length === 1) return `Falta la OF en el toldo ${withoutOf[0]}.`;
  if (withoutOf.length > 1) return `Falta la OF en los toldos ${withoutOf.join(', ')}.`;
  if (!status?.disponible) return COORDINA_UNAVAILABLE;
  const notApproved = awnings.filter((awning) => coordinaState(status, awning.of) !== 'aprobada');
  if (notApproved.length === 0) return null;
  const detail = notApproved
    .map((awning) => `${awning.letter} (${cleanOf(awning.of)}) ${coordinaStateLabels[coordinaState(status, awning.of)] || coordinaState(status, awning.of)}`)
    .join(', ');
  return `Sin aprobar en CoordinaOT: ${detail}.`;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/reviewRules.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/reviewRules.js src/reviewRules.test.js
git commit -m "feat(aprobacion): reglas de grupo y de generar según CoordinaOT

Servidor y web tienen que decir lo mismo sobre si un pedido está aprobado y por
qué no se puede generar. Reglas puras: falta de OF primero, CoordinaOT sin
responder bloquea y se dice qué toldo falta y cómo está.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Toldos — cliente de CoordinaOT, ruta y comprobación al generar

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:**
- Create: `src/coordinaStatus.js`, `src/coordinaStatus.test.js`
- Modify: `src/config.js`, `src/server.js`
- Create: `scripts/fake-coordina.mjs`
- Modify: `.claude/skills/running-toldos-testar/start-isolated.sh`, `.claude/skills/running-toldos-testar/SKILL.md`

**Interfaces:**
- Consumes: `COORDINA_UNAVAILABLE`, `generationBlock`, `uniqueOfs` de Task 2; la ruta de Task 1.
- Produces:
  - `createCoordinaClient({ url, key, fetchImpl?, timeoutMs?, cacheMs?, now? }) → { statusOf(ofs: string[], opts?: { fresh?: boolean }): Promise<{ disponible: true, ofs: Record<string, {estado, nota, actualizado}> } | { disponible: false, motivo: string }> }`
  - HTTP en toldos: `GET /api/coordina/ofs?ofs=0230194,0230195` → lo mismo que `statusOf`.
  - `generate-files`: 409 con `{ error }` si falta aprobación u OF; 503 con `{ error: COORDINA_UNAVAILABLE }` si CoordinaOT no responde.
  - Simulado: `scripts/fake-coordina.mjs` escucha en `FAKE_COORDINA_PORT` (4320); `GET /api/integracion/ofs` como CoordinaOT (todas `aprobada` por defecto); `POST /__estado` con `{ "ofs": { "0230195": { "estado": "devuelta", "nota": "…" } } }` fija estados; `POST /__caido` con `{ "caido": true }` responde 500; `POST /__reset` vuelve a todo aprobado.

- [ ] **Step 1: Tests del cliente (fallan)**

`src/coordinaStatus.test.js`:
```js
import { describe, expect, it, vi } from 'vitest';
import { createCoordinaClient } from './coordinaStatus.js';

const reply = (ofs, status = 200) => vi.fn(async () => ({ ok: status < 400, status, json: async () => ({ ofs }) }));

describe('cliente de CoordinaOT', () => {
  it('sin URL o sin clave: no disponible, sin llamar', async () => {
    const fetchImpl = reply([]);
    const client = createCoordinaClient({ url: '', key: 'k', fetchImpl });
    expect(await client.statusOf(['0230194'])).toEqual({ disponible: false, motivo: 'CoordinaOT no está configurado.' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('pide con la clave en la cabecera y devuelve por OF', async () => {
    const fetchImpl = reply([{ of: '0230194', estado: 'aprobada', nota: '', actualizado: '2026-09-29T08:00:00Z' }]);
    const client = createCoordinaClient({ url: 'http://coordina:4300/', key: 'secreta', fetchImpl });
    const result = await client.statusOf(['0230194', '0230194', '']);
    expect(result).toEqual({ disponible: true, ofs: { '0230194': { estado: 'aprobada', nota: '', actualizado: '2026-09-29T08:00:00Z' } } });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://coordina:4300/api/integracion/ofs?ofs=0230194');
    expect(init.headers['X-Clave-Integracion']).toBe('secreta');
  });

  it('guarda 30 s y fresh vuelve a preguntar', async () => {
    let now = 1000;
    const fetchImpl = reply([{ of: '0230194', estado: 'aprobada', nota: '', actualizado: null }]);
    const client = createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl, now: () => now });
    await client.statusOf(['0230194']);
    await client.statusOf(['0230194']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await client.statusOf(['0230194'], { fresh: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    now += 30001;
    await client.statusOf(['0230194']);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('respuesta de error o fallo de red: no disponible', async () => {
    expect(await createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl: reply([], 401) }).statusOf(['0230194']))
      .toEqual({ disponible: false, motivo: 'CoordinaOT respondió 401.' });
    const failing = vi.fn(async () => { throw new Error('timeout'); });
    expect(await createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl: failing }).statusOf(['0230194']))
      .toEqual({ disponible: false, motivo: 'CoordinaOT no responde.' });
  });

  it('parte en bloques de 50 OF', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ofs: [] }) }));
    const client = createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl });
    await client.statusOf(Array.from({ length: 120 }, (_, i) => String(1000000 + i)));
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('sin nada que preguntar: disponible y vacío', async () => {
    const fetchImpl = reply([]);
    expect(await createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl }).statusOf([])).toEqual({ disponible: true, ofs: {} });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/coordinaStatus.test.js`
Expected: FAIL (no existe el módulo).

- [ ] **Step 3: Implementar `src/coordinaStatus.js`**

```js
// Estado de las OF en CoordinaOT (diseño 29/09/2026). CoordinaOT aprueba y devuelve;
// aquí solo se pregunta por su ruta de solo lectura /api/integracion/ofs, con la clave
// compartida en la cabecera. Cuatro segundos como mucho y 30 s de memoria por OF, para
// que Pedidos no pregunte de más; «Generar archivos» pide siempre fresco.

const CHUNK = 50;

export function createCoordinaClient({ url, key, fetchImpl = fetch, timeoutMs = 4000, cacheMs = 30000, now = () => Date.now() }) {
  const cache = new Map();
  const base = String(url || '').replace(/\/+$/, '');

  async function statusOf(ofs, { fresh = false } = {}) {
    if (!base || !key) return { disponible: false, motivo: 'CoordinaOT no está configurado.' };
    const wanted = [...new Set(ofs.map((of) => String(of ?? '').trim()).filter(Boolean))];
    const result = {};
    const missing = [];
    for (const of of wanted) {
      const hit = cache.get(of);
      if (!fresh && hit && now() - hit.at < cacheMs) result[of] = hit.value;
      else missing.push(of);
    }
    try {
      for (let index = 0; index < missing.length; index += CHUNK) {
        const chunk = missing.slice(index, index + CHUNK);
        const response = await fetchImpl(`${base}/api/integracion/ofs?ofs=${chunk.map(encodeURIComponent).join(',')}`, {
          headers: { 'X-Clave-Integracion': key },
          signal: AbortSignal.timeout(timeoutMs)
        });
        if (!response.ok) return { disponible: false, motivo: `CoordinaOT respondió ${response.status}.` };
        const data = await response.json();
        for (const item of data.ofs || []) {
          const value = { estado: String(item.estado || 'sin_estado'), nota: String(item.nota || ''), actualizado: item.actualizado ?? null };
          cache.set(item.of, { at: now(), value });
          result[item.of] = value;
        }
      }
    } catch {
      return { disponible: false, motivo: 'CoordinaOT no responde.' };
    }
    return { disponible: true, ofs: result };
  }

  return { statusOf };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/coordinaStatus.test.js`
Expected: PASS.

- [ ] **Step 5: Configuración**

En `src/config.js`, dentro de `config`, después de `ruleParametersFile`:
```js
  // Aprobación leída de CoordinaOT (diseño 29/09/2026). Sin las dos, «Generar archivos»
  // queda bloqueado: nunca se genera sin aprobación comprobada.
  coordinaUrl: process.env.COORDINA_URL || '',
  coordinaClave: process.env.COORDINA_CLAVE || '',
```

- [ ] **Step 6: Servidor**

En `src/server.js`:
1. Imports: `import { createCoordinaClient } from './coordinaStatus.js';`, `import { awningLetter } from './domain/awningCompleteness.js';` y añadir `generationBlock, uniqueOfs` al import existente de `./reviewRules.js`.
2. Tras `const app = express();`: `const coordina = createCoordinaClient({ url: config.coordinaUrl, key: config.coordinaClave });`
3. Ruta nueva, antes de `app.get('/api/reviews', …)`:
```js
// Estado de las OF en CoordinaOT para la web (Pedidos y el pedido abierto). La clave
// vive aquí, en el servidor: el navegador nunca la ve.
app.get('/api/coordina/ofs', async (req, res, next) => {
  try {
    const ofs = String(req.query.ofs || '').split(',').map((of) => of.trim()).filter(Boolean).slice(0, 500);
    res.set('Cache-Control', 'no-store').json(await coordina.statusOf(ofs));
  } catch (error) {
    next(error);
  }
});
```
4. En `generate-files`, justo después de `assertDeploymentModelsEnabled(order, deploymentFeatures);`:
```js
    // Solo se genera lo que CoordinaOT ha aprobado, OF por OF, preguntando en el momento.
    // Si CoordinaOT no responde, no se genera (diseño 29/09/2026, opción A).
    const approvalAwnings = order.awnings.map((awning, index) => ({ letter: awningLetter(index), of: awning.of }));
    const approval = await coordina.statusOf(uniqueOfs(approvalAwnings), { fresh: true });
    const approvalBlock = generationBlock(approvalAwnings, approval);
    if (approvalBlock) throw httpError(approval.disponible ? 409 : 503, approvalBlock);
```
Comprobar que el manejador de errores de Express devuelve `{ error: message }` con `error.statusCode` (buscar `app.use((error` en `server.js`); si no, adaptarlo sin cambiar el comportamiento del resto de rutas.

- [ ] **Step 7: CoordinaOT simulado**

`scripts/fake-coordina.mjs`:
```js
// CoordinaOT simulado para la instancia aislada (4310) y las pruebas e2e: responde a
// /api/integracion/ofs como el de verdad, con todas las OF aprobadas por defecto para
// que las pruebas que generan archivos sigan funcionando. Nunca se usa contra el real.
//   POST /__estado {"ofs":{"0230195":{"estado":"devuelta","nota":"…"}}}  fija estados
//   POST /__caido {"caido":true}                                            responde 500
//   POST /__reset                                                           todo aprobado
import http from 'node:http';

const port = Number(process.env.FAKE_COORDINA_PORT || 4320);
const key = process.env.COORDINA_CLAVE || 'clave-de-prueba';
let states = {};
let down = false;

async function body(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}

const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (req.method === 'POST' && url.pathname === '/__estado') { Object.assign(states, (await body(req)).ofs || {}); return send(res, 200, { ok: true }); }
  if (req.method === 'POST' && url.pathname === '/__caido') { down = Boolean((await body(req)).caido); return send(res, 200, { ok: true }); }
  if (req.method === 'POST' && url.pathname === '/__reset') { states = {}; down = false; return send(res, 200, { ok: true }); }
  if (req.method === 'GET' && url.pathname === '/api/integracion/ofs') {
    if (down) return send(res, 500, { error: 'caído' });
    if (req.headers['x-clave-integracion'] !== key) return send(res, 401, { error: 'Clave no válida' });
    const ofs = (url.searchParams.get('ofs') || '').split(',').map((of) => of.trim()).filter(Boolean);
    return send(res, 200, { ofs: ofs.map((of) => ({ of, estado: 'aprobada', nota: '', actualizado: null, ...states[of] })) });
  }
  send(res, 404, { error: 'No existe' });
}).listen(port, '127.0.0.1', () => console.log(`CoordinaOT simulado en http://127.0.0.1:${port}`));
```

- [ ] **Step 8: Instancia aislada apuntando al simulado**

En `start-isolated.sh`, antes de `exec node src/server.js`:
```bash
# CoordinaOT simulado (scripts/fake-coordina.mjs): la aislada nunca pregunta al real.
export FAKE_COORDINA_PORT="${FAKE_COORDINA_PORT:-4320}"
export COORDINA_URL="http://127.0.0.1:$FAKE_COORDINA_PORT" COORDINA_CLAVE="clave-de-prueba"
node scripts/fake-coordina.mjs &
```
En `SKILL.md`, en «Start the isolated instance», añadir: «The script also starts a fake CoordinaOT on 4320 (`scripts/fake-coordina.mjs`, all OFs approved by default; `POST /__estado`, `/__caido`, `/__reset` to change it). The isolated instance never talks to the real CoordinaOT.»

- [ ] **Step 9: Reiniciar la aislada y comprobar**

Parar el proceso que escucha en 4310 (y el de 4320 si existe) y arrancar de nuevo `bash .claude/skills/running-toldos-testar/start-isolated.sh` en segundo plano. Luego:
```bash
curl -fsS "http://127.0.0.1:4310/api/coordina/ofs?ofs=0230194"
curl -fsS -X POST http://127.0.0.1:4320/__caido -d '{"caido":true}'
curl -fsS "http://127.0.0.1:4310/api/coordina/ofs?ofs=0239999"
curl -fsS -X POST http://127.0.0.1:4320/__reset
```
Expected: primero `{"disponible":true,"ofs":{"0230194":{"estado":"aprobada",…}}}`; con el simulado caído y una OF no guardada en caché, `{"disponible":false,"motivo":"CoordinaOT respondió 500."}`.

- [ ] **Step 10: Suite, lint, e2e que generan**

Run: `pnpm vitest run && pnpm lint && node scripts/test-rps-e2e.mjs && node scripts/test-antica-workflow.mjs`
Expected: todo PASS (el simulado aprueba por defecto, así que generar sigue funcionando).

- [ ] **Step 11: Commit**

```bash
git add src/coordinaStatus.js src/coordinaStatus.test.js src/config.js src/server.js scripts/fake-coordina.mjs .claude/skills/running-toldos-testar/start-isolated.sh .claude/skills/running-toldos-testar/SKILL.md
git commit -m "feat(aprobacion): toldos pregunta a CoordinaOT y no genera sin aprobación

Generar archivos comprueba en el servidor, en el momento, que CoordinaOT ha
aprobado todas las OF del pedido; si no responde, no genera. La web pregunta por
una ruta propia para que la clave no salga del servidor. La instancia aislada usa
un CoordinaOT simulado que aprueba por defecto.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Toldos — Pedidos agrupado por CoordinaOT

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:**
- Create: `src/client/hooks/useCoordinaStatus.ts`
- Modify: `src/client/types.ts`, `src/client/ordersInbox.ts`, `src/client/ordersInbox.test.ts`, `src/client/components/OrdersInbox.tsx`, `src/client/views/ReviewsView.tsx`, `src/client/relieve.css`

**Interfaces:**
- Consumes: `coordinaGroup`, `uniqueOfs` (Task 2); `GET /api/coordina/ofs` (Task 3). `ReviewSummary.summary.awningList` ya trae `{ letter, model, of, state, notes }`.
- Produces:
  - `type CoordinaStatus = { disponible: boolean; ofs?: Record<string, { estado: string; nota?: string; actualizado?: string | null }>; motivo?: string }` en `types.ts`.
  - `useCoordinaStatus(ofs: string[], enabled?: boolean): { status: CoordinaStatus | null; loading: boolean }` — pide al montar, al cambiar la lista y cada 60 s.
  - `pendingGroups(pending, status)` sustituye a `pendingGroups(pending)`; grupos `por_revisar` («Por revisar»), `devuelto` («Devueltos»), `aprobado` («Aprobados · falta generar»), en ese orden, con `tone` `review | returned | approved`.

- [ ] **Step 1: Tests de grupos (fallan)**

En `src/client/ordersInbox.test.ts`, sustituir las pruebas existentes de `pendingGroups` por:
```ts
describe('pendingGroups según CoordinaOT', () => {
  const review = (code: string, ofs: string[]) => ({
    orderCode: code,
    status: 'PENDING_REVIEW',
    updatedAt: '2026-09-29T08:00:00Z',
    summary: { technician: 'IVÁN', customer: '', models: [], awnings: ofs.length, ofs, awningList: ofs.map((of, index) => ({ letter: String.fromCharCode(65 + index), model: 'ARZUA PRO', of, state: 'ok' as const, notes: [] })) }
  }) as unknown as ReviewSummary;
  const aprobada = { estado: 'aprobada', nota: '' };

  it('reparte por lo que dice CoordinaOT, en orden fijo', () => {
    const status = { disponible: true, ofs: { '1': aprobada, '2': aprobada, '3': { estado: 'devuelta', nota: 'Falta cota' }, '4': { estado: 'en_revision' } } };
    const groups = pendingGroups([review('R', ['4']), review('A', ['1', '2']), review('D', ['1', '3'])], status);
    expect(groups.map((group) => [group.key, group.label, group.reviews.map((item) => item.orderCode)])).toEqual([
      ['por_revisar', 'Por revisar', ['R']],
      ['devuelto', 'Devueltos', ['D']],
      ['aprobado', 'Aprobados · falta generar', ['A']]
    ]);
  });

  it('sin respuesta de CoordinaOT, todo por revisar', () => {
    const groups = pendingGroups([review('A', ['1'])], { disponible: false });
    expect(groups.map((group) => group.key)).toEqual(['por_revisar']);
    expect(pendingGroups([review('A', ['1'])], null).map((group) => group.key)).toEqual(['por_revisar']);
  });
});
```
(Ajustar el import de `ReviewSummary` y `pendingGroups` a los que ya use el fichero.)

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/client/ordersInbox.test.ts`
Expected: FAIL.

- [ ] **Step 3: Tipos y reglas de la bandeja**

En `src/client/types.ts`, junto a `ReviewSummary`:
```ts
export type CoordinaStatus = {
  disponible: boolean;
  ofs?: Record<string, { estado: string; nota?: string; actualizado?: string | null }>;
  motivo?: string;
};
```
En `src/client/ordersInbox.ts`, sustituir `pendingGroupOrder` y `pendingGroups`:
```ts
// Bloques de la bandeja según CoordinaOT (diseño 29/09/2026): el grupo sale de cómo
// están sus OF allí, no del estado guardado aquí. Sin respuesta, todo por revisar.
export const pendingGroupOrder = [
  { key: 'por_revisar', label: 'Por revisar', tone: 'review' },
  { key: 'devuelto', label: 'Devueltos', tone: 'returned' },
  { key: 'aprobado', label: 'Aprobados · falta generar', tone: 'approved' }
] as const;

export function reviewAwnings(review: ReviewSummary) {
  return (review.summary.awningList || []).map((item) => ({ letter: item.letter, of: item.of }));
}

export function pendingGroups(pending: ReviewSummary[], status: CoordinaStatus | null) {
  return pendingGroupOrder
    .map((group) => ({ ...group, reviews: pending.filter((review) => coordinaGroup(reviewAwnings(review), status) === group.key) }))
    .filter((group) => group.reviews.length > 0);
}
```
Con `import { coordinaGroup } from '../reviewRules.js';` (añadir al import existente de `isPendingGeneration`) e `import type { CoordinaStatus, ReviewSummary } from './types';`.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/client/ordersInbox.test.ts`
Expected: PASS.

- [ ] **Step 5: Hook `useCoordinaStatus`**

`src/client/hooks/useCoordinaStatus.ts`:
```ts
import { useEffect, useState } from 'react';
import type { CoordinaStatus } from '../types';

// Estado de las OF en CoordinaOT (diseño 29/09/2026): se pide al abrir, al cambiar
// la lista y cada minuto mientras la pantalla está abierta. Pregunta a nuestro
// servidor, que es quien tiene la clave.
const REFRESH_MS = 60_000;

export function useCoordinaStatus(ofs: string[], enabled = true) {
  const [status, setStatus] = useState<CoordinaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const key = [...new Set(ofs.filter(Boolean))].sort().join(',');

  useEffect(() => {
    if (!enabled || !key) { setStatus({ disponible: true, ofs: {} }); return; }
    let cancelled = false;
    const load = () => {
      setLoading(true);
      fetch(`/api/coordina/ofs?ofs=${encodeURIComponent(key)}`)
        .then((response) => response.json() as Promise<CoordinaStatus>)
        .then((data) => { if (!cancelled) setStatus(data); })
        .catch(() => { if (!cancelled) setStatus({ disponible: false, motivo: 'Sin conexión con el servidor.' }); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [key, enabled]);

  return { status, loading };
}
```

- [ ] **Step 6: Bandeja**

En `src/client/views/ReviewsView.tsx`: calcular las OF de los pendientes y pasar el estado a `OrdersInbox`:
```tsx
const pendingOfs = pending.flatMap((review) => (review.summary.awningList || []).map((item) => item.of));
const { status: coordinaStatus } = useCoordinaStatus(pendingOfs, selectedCode === '');
```
y en `<OrdersInbox … coordinaStatus={coordinaStatus} />`.

En `src/client/components/OrdersInbox.tsx`:
1. Nueva prop `coordinaStatus: CoordinaStatus | null`.
2. `const groups = pendingGroups(sections.pending, coordinaStatus);` y en el `map` de grupos usar `group.key` como `key` y `className={\`orders-group-title tone-${group.tone}\`}`.
3. Aviso bajo la barra de filtros cuando `coordinaStatus && !coordinaStatus.disponible`:
```tsx
<p className="orders-coordina-down" role="status"><AlertTriangle aria-hidden="true" />No se puede consultar CoordinaOT; los pedidos se muestran como por revisar.</p>
```
4. `OrderRow` y `AwningChip` reciben `coordinaStatus`. En `AwningChip` añadir después del icono de cálculo una marca de CoordinaOT:
```tsx
const coordina = coordinaStatus?.disponible ? coordinaStatus.ofs?.[item.of.trim()]?.estado : undefined;
// …dentro del span, tras el icono existente:
{coordina === 'aprobada' && <span className="orders-chip-coordina is-approved" aria-label="aprobada en CoordinaOT">✓</span>}
{coordina === 'devuelta' && <span className="orders-chip-coordina is-returned" aria-label="devuelta en CoordinaOT">↩</span>}
{coordina && coordina !== 'aprobada' && coordina !== 'devuelta' && <span className="orders-chip-coordina is-waiting" aria-label="en revisión en CoordinaOT">•</span>}
```
y en el `title` del chip añadir `· CoordinaOT: ${coordina ?? 'sin datos'}`.
5. En el detalle desplegado, en cada `<li>`, si la OF está devuelta, añadir tras las notas:
```tsx
{nota && <span className="orders-detail-returned"><strong>Devuelta en CoordinaOT:</strong> {nota}</span>}
```
con `const nota = coordinaStatus?.ofs?.[item.of.trim()]?.estado === 'devuelta' ? coordinaStatus.ofs[item.of.trim()].nota : '';`

- [ ] **Step 7: Estilos**

Al final de `src/client/relieve.css`:
```css
/* Aprobación de CoordinaOT en Pedidos (29/09/2026). */
.orders-coordina-down { align-items: center; background: var(--warn-bg); border: 1px solid var(--warn); border-radius: 8px; color: var(--accent-text); display: flex; font-size: 13px; font-weight: 600; gap: 8px; margin: 0 0 10px; padding: 8px 12px; }
.orders-coordina-down svg { height: 16px; width: 16px; }
.orders-chip-coordina { font-size: 11px; font-weight: 800; margin-left: 2px; }
.orders-chip-coordina.is-approved { color: var(--ok); }
.orders-chip-coordina.is-returned { color: var(--danger); }
.orders-chip-coordina.is-waiting { color: var(--text-muted); }
.orders-detail-returned { color: var(--danger); display: block; font-size: 12px; margin-top: 2px; }
```
Después ejecutar `node scripts/generate-dark-theme.mjs` (usa variables, así que no debería añadir nada; comprobar que no rompe).

- [ ] **Step 8: Suite, lint, tsc, build**

Run: `pnpm vitest run && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm build`
Expected: todo PASS.

- [ ] **Step 9: Commit**

```bash
git add src/client/hooks/useCoordinaStatus.ts src/client/types.ts src/client/ordersInbox.ts src/client/ordersInbox.test.ts src/client/components/OrdersInbox.tsx src/client/views/ReviewsView.tsx src/client/relieve.css src/client/dark.generated.css
git commit -m "feat(pedidos): grupos y marcas según lo que dice CoordinaOT

Los pedidos pendientes se reparten en Por revisar, Devueltos y Aprobados · falta
generar según el estado real de sus OF en CoordinaOT, que se relee cada minuto.
Cada toldo lleva su marca, la nota de devolución se ve al desplegar y, si
CoordinaOT no responde, se avisa y todo queda por revisar.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Toldos — pedido abierto: botón según CoordinaOT, sin pregunta manual

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:**
- Modify: `src/client/components/ReviewOrderDetail.tsx`, `src/client/views/ReviewsView.tsx`, `src/client/generatePermission.ts`, `src/client/generatePermission.test.ts` (crear si no existe), `src/client/relieve.css`

**Interfaces:**
- Consumes: `generationBlock` (Task 2), `useCoordinaStatus` (Task 4), `awningLetter` de `../../domain/awningCompleteness.js`.
- Produces: `generateState(review, currentUser, status) → { allowed: boolean, note: string }` en `generatePermission.ts`.

- [ ] **Step 1: Test (falla)**

`src/client/generatePermission.test.ts` (añadir si existe):
```ts
import { describe, expect, it } from 'vitest';
import { generateState } from './generatePermission';

const review = (technician: string, ofs: string[], status = 'PENDING_REVIEW') => ({
  status,
  order: { technician, awnings: ofs.map((of) => ({ of })) }
}) as unknown as Parameters<typeof generateState>[0];
const aprobado = { disponible: true, ofs: { '0230194': { estado: 'aprobada' } } };

describe('generateState', () => {
  it('el autor con todo aprobado puede', () => {
    expect(generateState(review('IVÁN', ['0230194']), 'IVÁN', aprobado)).toEqual({ allowed: true, note: '' });
  });
  it('otro usuario no, aunque esté aprobado', () => {
    expect(generateState(review('ÁNGEL', ['0230194']), 'IVÁN', aprobado)).toEqual({ allowed: false, note: 'Lo genera el autor (Ángel)' });
  });
  it('sin aprobar, dice qué falta', () => {
    expect(generateState(review('IVÁN', ['0230194']), 'IVÁN', { disponible: true, ofs: { '0230194': { estado: 'en_revision' } } }))
      .toEqual({ allowed: false, note: 'Sin aprobar en CoordinaOT: A (0230194) en revisión.' });
  });
  it('mientras carga, apagado y sin nota', () => {
    expect(generateState(review('IVÁN', ['0230194']), 'IVÁN', null)).toEqual({ allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' });
  });
  it('ya generado: nada', () => {
    expect(generateState(review('IVÁN', ['0230194'], 'PRODUCED'), 'IVÁN', aprobado)).toEqual({ allowed: false, note: '' });
  });
});
```
Si `controlLabel('ÁNGEL')` no devuelve «Ángel», ajustar el texto esperado al que devuelva (es la misma función que usa hoy la nota «Lo genera el autor»).

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `pnpm vitest run src/client/generatePermission.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar en `src/client/generatePermission.ts`**

Añadir (manteniendo `canGenerateReview`):
```ts
import { generationBlock } from '../reviewRules.js';
import { awningLetter } from '../domain/awningCompleteness.js';
import { controlLabel } from './components/controlLabels';
import type { CoordinaStatus, ReviewPackage } from './types';

// Botón «Generar archivos» del pedido abierto (diseño 29/09/2026): además de ser el
// autor, CoordinaOT tiene que haber aprobado todas las OF. La nota dice por qué no.
export function generateState(review: Pick<ReviewPackage, 'status' | 'order'>, currentUser: string, status: CoordinaStatus | null) {
  if (review.status === 'PRODUCED' || !canGenerateReview(review.status, '', currentUser)) return { allowed: false, note: '' };
  if (review.order.technician && review.order.technician !== currentUser) {
    return { allowed: false, note: `Lo genera el autor (${controlLabel(review.order.technician)})` };
  }
  if (!status) return { allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' };
  const awnings = (review.order.awnings || []).map((awning, index) => ({ letter: awningLetter(index), of: String(awning.of || '') }));
  const block = generationBlock(awnings, status);
  return block ? { allowed: false, note: block } : { allowed: true, note: '' };
}
```
Si importar `controlLabel` desde aquí crea un ciclo o falla en tsc, mover el import a donde ya se use sin ciclo y anotarlo en el informe; la ruta exacta del fichero `controlLabels` es la que ya importa `OrdersInbox.tsx` (`./controlLabels` desde `components/`).

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `pnpm vitest run src/client/generatePermission.test.ts`
Expected: PASS.

- [ ] **Step 5: Pedido abierto**

En `ReviewsView.tsx`:
```tsx
const detailOfs = selectedReview ? (selectedReview.order.awnings || []).map((awning) => String(awning.of || '')) : [];
const { status: detailCoordina } = useCoordinaStatus(detailOfs, Boolean(selectedReview) && selectedReview?.status !== 'PRODUCED');
```
Pasar `coordinaStatus={detailCoordina}` a `ReviewOrderDetail`. En `generateSelected`, sustituir la guarda por `if (!selectedReview || !generateState(selectedReview, currentUser, detailCoordina).allowed) return;` y cambiar el `message` del `onConfirm` a:
```ts
message: 'CoordinaOT ya lo ha aprobado. Se guardará el PDF definitivo en Planteamientos y un Excel de reserva por cada OF en Subida de material.',
```
(mantener `confirmLabel: 'Sí, generar archivos'`: lo usan las pruebas e2e).

En `ReviewOrderDetail.tsx`: nueva prop `coordinaStatus: CoordinaStatus | null`; sustituir `canGenerate`/`generateNote` por:
```tsx
const { allowed: canGenerate, note: generateNote } = generateState(review, currentUser, coordinaStatus);
```
El resto del botón no cambia (`disabled={disabled || !canGenerate}`, `title`, `review-generate-note`).

- [ ] **Step 6: Nota legible**

En `relieve.css`, si `.review-generate-note` no admite dos líneas, añadir:
```css
.review-generate-note { max-width: 320px; white-space: normal; }
```

- [ ] **Step 7: Suite, lint, tsc, build y e2e existentes**

Run: `pnpm vitest run && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm build && node scripts/test-rps-e2e.mjs && node scripts/test-antica-workflow.mjs && node scripts/test-bambalina-workflow.mjs && node scripts/test-hera-workflow.mjs`
Expected: todo PASS. Reiniciar antes la aislada (cambió `server.js` en Task 3 y el build).

- [ ] **Step 8: Commit**

```bash
git add src/client/generatePermission.ts src/client/generatePermission.test.ts src/client/components/ReviewOrderDetail.tsx src/client/views/ReviewsView.tsx src/client/relieve.css
git commit -m "feat(pedido): Generar archivos se activa al aprobar CoordinaOT, sin preguntar

El autor ya no tiene que confirmar a mano que el pedido está aprobado: el botón
se enciende cuando CoordinaOT ha aprobado todas las OF y, si no, dice qué toldo
falta y cómo está. La confirmación que queda solo dice qué se guarda y dónde.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Toldos — prueba de extremo a extremo y capturas

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:**
- Create: `scripts/test-coordina-approval-e2e.mjs`

**Interfaces:**
- Consumes: instancia aislada 4310 con el simulado en 4320 (Task 3), `openApp`, `addAwning`, `fillArzuaAR2603332` de `.claude/skills/running-toldos-testar/drive.mjs`.

- [ ] **Step 1: Escribir la prueba**

`scripts/test-coordina-approval-e2e.mjs`:
```js
// Prueba e2e de la aprobación leída de CoordinaOT (diseño 29/09/2026), contra la
// instancia aislada y el CoordinaOT simulado (4320): guarda AR2603332 (OF 0230194),
// y comprueba Pedidos y el botón con la OF en revisión, devuelta (con su nota),
// aprobada (se genera) y con CoordinaOT caído (aviso y no se genera).
import assert from 'node:assert/strict';
import { fillArzuaAR2603332, addAwning, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';

const FAKE = `http://127.0.0.1:${process.env.FAKE_COORDINA_PORT || 4320}`;
const set = (ofs) => fetch(`${FAKE}/__estado`, { method: 'POST', body: JSON.stringify({ ofs }) });
const down = (caido) => fetch(`${FAKE}/__caido`, { method: 'POST', body: JSON.stringify({ caido }) });
await fetch(`${FAKE}/__reset`, { method: 'POST' });

const { browser, page } = await openApp({ width: 1600, height: 1000 });
page.setDefaultTimeout(15000);
const shot = (name) => page.screenshot({ path: `tmp/ui-audit/shots/coordina-${name}.png` });

try {
  await set({ '0230194': { estado: 'en_revision' } });
  await addAwning(page, 'Arzúa Pro');
  await fillArzuaAR2603332(page);
  await page.getByRole('button', { name: /Guardar para revisión/ }).click();
  const overwrite = page.getByRole('button', { name: /Sobrescribir|Guardar de nuevo|Sí, guardar/ });
  if (await overwrite.count()) await overwrite.first().click();
  await page.waitForTimeout(1500);

  const openOrders = async () => {
    await page.getByRole('button', { name: /^Pedidos/ }).first().click();
    await page.waitForTimeout(1500);
  };
  const groupOf = (code) => page.locator('.orders-group', { has: page.locator('.orders-row', { hasText: code }) }).locator('.orders-group-title');

  await openOrders();
  assert.match(await groupOf('AR2603332').innerText(), /Por revisar/);
  console.log('OK: en revisión en CoordinaOT → «Por revisar»');
  await shot('por-revisar');

  await set({ '0230194': { estado: 'devuelta', nota: 'Falta el lado del brazo' } });
  await page.reload(); await openOrders();
  assert.match(await groupOf('AR2603332').innerText(), /Devueltos/);
  const row = page.locator('.orders-row', { hasText: 'AR2603332' });
  await row.locator('.orders-row-toggle').click();
  await row.getByText('Falta el lado del brazo').waitFor();
  console.log('OK: devuelta → «Devueltos» con la nota al desplegar');
  await shot('devuelto');

  await row.getByRole('button', { name: 'Abrir el pedido' }).click();
  await page.waitForTimeout(1500);
  const generate = page.getByRole('button', { name: 'Generar archivos' });
  assert.equal(await generate.isDisabled(), true);
  await page.getByText(/Sin aprobar en CoordinaOT: A \(0230194\) devuelta/).waitFor();
  console.log('OK: devuelta → botón apagado con el motivo');

  await down(true);
  await page.reload(); await openOrders();
  await page.getByText('No se puede consultar CoordinaOT; los pedidos se muestran como por revisar.').waitFor();
  console.log('OK: CoordinaOT caído → aviso en Pedidos');
  await shot('caido');
  const serverSays = await page.evaluate(() => fetch('/api/reviews/AR2603332/generate-files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(async (r) => [r.status, (await r.json()).error]));
  assert.deepEqual(serverSays, [503, 'No se puede comprobar la aprobación en CoordinaOT; inténtalo en un momento.']);
  console.log('OK: CoordinaOT caído → el servidor no genera (503)');
  await down(false);

  await set({ '0230194': { estado: 'aprobada', nota: '' } });
  await page.reload(); await openOrders();
  assert.match(await groupOf('AR2603332').innerText(), /Aprobados · falta generar/);
  const approvedRow = page.locator('.orders-row', { hasText: 'AR2603332' });
  await approvedRow.locator('.orders-row-toggle').click();
  await approvedRow.getByRole('button', { name: 'Abrir el pedido' }).click();
  await page.waitForTimeout(1500);
  assert.equal(await page.getByRole('button', { name: 'Generar archivos' }).isDisabled(), false);
  console.log('OK: aprobada → «Aprobados · falta generar» y botón encendido para el autor');
  await shot('aprobado');

  console.log('Aprobación CoordinaOT: OK');
} finally {
  await fetch(`${FAKE}/__reset`, { method: 'POST' });
  await browser.close();
}
```
Si «Guardar para revisión» usa otro texto o diálogo en esta versión, adaptarlo mirando `scripts/test-rps-e2e.mjs`, que ya guarda AR2603332.

- [ ] **Step 2: Ejecutar**

Con la aislada recién reiniciada: `node scripts/test-coordina-approval-e2e.mjs`
Expected: todas las líneas `OK:` y `Aprobación CoordinaOT: OK`.

- [ ] **Step 3: Capturas en oscuro**

Repetir con el modo oscuro puesto (añadir tras `openApp`: `await page.evaluate(() => localStorage.setItem('toldos-tema', 'dark')); await page.reload();` en una copia temporal en `tmp/`, no en el script) y mirar las cuatro capturas de cada modo: aviso, marcas ✓/↩/• y nota legibles en claro y oscuro.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-coordina-approval-e2e.mjs
git commit -m "test(e2e): aprobación leída de CoordinaOT de punta a punta

Recorre en revisión, devuelto con nota, CoordinaOT caído y aprobado contra el
CoordinaOT simulado, y comprueba también que el servidor se niega a generar si
CoordinaOT no responde.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Despliegue (lo hace Iván; se le dan los comandos al final)

1. Generar una clave: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
2. CoordinaOT: poner `INTEGRACION_CLAVE=<clave>` en `.env.local` y desplegar con su línea habitual.
3. Toldos: poner `COORDINA_URL=http://127.0.0.1:4300` y `COORDINA_CLAVE=<clave>` en su `.env` y desplegar con `git pull --ff-only && pnpm build && pnpm deploy:check && pnpm deploy:smoke && pnpm pm2:reload && pm2 save`.
4. Comprobar en el servidor: `curl -s "http://127.0.0.1:4400/api/coordina/ofs?ofs=<una OF real>"` → `"disponible":true`.
