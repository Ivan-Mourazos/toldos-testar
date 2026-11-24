# Regla única de stock de lona en toda la web — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que toda la web calcule el stock de lona igual (stock en almacén − reservas de otros pedidos = disponible), lo enseñe con la cuenta a la vista y la mande a CoordinaOT para el bloque «Falta material» y el correo.

**Architecture:** el cálculo vive en un solo sitio, `summarizeFabricStock` (`src/domain/fabricStock.js`). RPS devuelve además las reservas de lona con su OF; quien pide el stock dice qué OF son «del propio pedido» y esas reservas no restan. Todo lo demás (línea bajo el buscador de tela en toldos y remolques, aviso de «Generar archivos», datos a CoordinaOT) consume esa función. CoordinaOT acepta los campos nuevos (opcionales) y los pinta.

**Tech Stack:** Node ≥ 22.18, Express 5, React 19, TypeScript/JS con JSDoc, vitest, mssql (solo `SELECT`), pnpm. CoordinaOT: Next.js + SQLite, vitest.

**Diseño:** `docs/superpowers/specs/2026-11-24-stock-lona-todos-los-pedidos-design.md` (sección «Regla de stock» y correo).

## Global Constraints

- RPS es solo lectura: solo `SELECT`.
- Nunca arrancar la web con el `.env` real; capturas en la instancia aislada (`bash .claude/skills/running-toldos-testar/start-isolated.sh`, puerto 4310).
- Textos en castellano llano; cifras con coma (`toLocaleString('es-ES')`). No citar el Excel.
- Diseño de CoordinaOT (`src/client/coordina/`), claro y oscuro; solo escritorio (1280×720 a 1920).
- Las asignaciones (`CPRMOMaterial` sin reserva) **no** cuentan. Solo restan las reservas de Almacén (`STKStockReserve`).
- Las reservas de las OF del propio pedido **no restan**: se enseñan aparte.
- Commits en castellano explicando el porqué; `git add` por ruta; nada de `add -A`, `stash`, `reset`.
- Antes de subir: `pnpm test && pnpm typecheck && pnpm lint`, y `pnpm exec vite build` si se toca el cliente.
- CoordinaOT se despliega **antes** que Planteamientos (valida las claves exactas del JSON).

## Datos de RPS verificados (24/11/2026, solo lectura)

Reserva → OF: `STKStockReserve.ItemType = 5`, `IDItem = CPRMOMaterial.IDMOMaterial` → `CPRMOMaterial.IDMOTask = CPRMOTask.IDMOTask` → `CPRMOTask.IDManufacturingOrder = CPRManufacturingOrder.IDManufacturingOrder`. Las 39 reservas de lona actuales tienen todas su OF (p. ej. PLAST880NEGRP204: 198 m de la OF 0234125, pedido AR.26.05622).

## Archivos

| Archivo | Cambio |
|---|---|
| `src/domain/fabricStock.js` | `summarizeFabricStock(rows, code, { reservas, ofsPropias })`: separa reservado de otros / propio |
| `src/rpsCatalog.js` | `stockId` en las filas de stock; nueva `queryRpsFabricReserveRows()` |
| `src/fabricRpsServices.js` | servicio y ruta aceptan `ofs` |
| `src/server.js` | conectar `loadReserves` |
| `src/stockLona.js`, `src/stockLonaAviso.js`, `src/stockLonaProduccion.js` | faltas con la cuenta; aviso con la cuenta; se pasan las OF de la entrega |
| `src/client/fabricStock.ts`, `src/client/hooks/useFabricStock.ts`, `src/client/components/FabricStockLine.tsx` | cuenta en la línea; OF del pedido en la consulta |
| `src/client/components/AwningColumn.tsx`, `OrderHeader.tsx`, `src/client/remolques/Campos.tsx` | pasan las OF del pedido |
| `coordina-ot/src/lib/server/stock-lona-db.ts`, `src/lib/correo-stock.ts`, `src/components/AvisoStockPase.tsx` | aceptan y pintan la cuenta |

---

### Task 1: el cálculo único

**Files:**
- Modify: `src/domain/fabricStock.js`
- Test: `src/domain/fabricStock.test.js`

**Interfaces:**
- Produces: `summarizeFabricStock(rows, code, { reservas = [], ofsPropias = [] } = {})` → `{ code, metros, reservado, reservadoPropio, disponible, bobinasConDisponible, mayorBobinaDisponible, consignacion, almacenes }`.
  - `rows`: `{ stockId, code, warehouseCode, warehouseName, roll, meters, reserved }[]` (`reserved` = total de la bobina).
  - `reservas`: `{ stockId, of, quantity }[]`.
  - `reservado` = reservado por **otros** pedidos (lo que se resta). `reservadoPropio` = reservado por `ofsPropias` (no se resta).
  - `disponible = metros − reservado`, bobina a bobina, nunca negativo.

- [ ] **Step 1: pruebas que fallan** (añadir al final de `src/domain/fabricStock.test.js`)

```js
describe('reservas del propio pedido', () => {
  const rows = [
    { stockId: 1, code: 'PLAST880NEGRP204', warehouseCode: '5', warehouseName: 'NUEVA SEDE', roll: 'A', meters: 65, reserved: 50 },
    { stockId: 2, code: 'PLAST880NEGRP204', warehouseCode: '5', warehouseName: 'NUEVA SEDE', roll: 'B', meters: 65, reserved: 0 },
  ];
  const reservas = [
    { stockId: 1, of: '0234125', quantity: 40 },
    { stockId: 1, of: '234999', quantity: 10 },
  ];

  it('sin OF propias resta todas las reservas, como hasta ahora', () => {
    const s = summarizeFabricStock(rows, 'PLAST880NEGRP204', { reservas });
    expect(s).toMatchObject({ metros: 130, reservado: 50, reservadoPropio: 0, disponible: 80 });
  });

  it('las reservas de las OF del pedido no restan y se cuentan aparte', () => {
    const s = summarizeFabricStock(rows, 'PLAST880NEGRP204', { reservas, ofsPropias: ['234125'] });
    expect(s).toMatchObject({ metros: 130, reservado: 10, reservadoPropio: 40, disponible: 120 });
    expect(s.mayorBobinaDisponible).toBe(65);
  });

  it('compara la OF normalizada a 7 cifras en los dos lados', () => {
    const s = summarizeFabricStock(rows, 'PLAST880NEGRP204', { reservas, ofsPropias: ['0234999'] });
    expect(s).toMatchObject({ reservado: 40, reservadoPropio: 10 });
  });

  it('sin lista de reservas por OF se comporta igual que antes', () => {
    const s = summarizeFabricStock(rows, 'PLAST880NEGRP204', { ofsPropias: ['0234125'] });
    expect(s).toMatchObject({ reservado: 50, reservadoPropio: 0, disponible: 80 });
  });
});
```

- [ ] **Step 2: ejecutar y ver que fallan**

Run: `pnpm exec vitest run src/domain/fabricStock.test.js`
Expected: FAIL (`reservadoPropio` undefined, `reservado` 50 en el segundo caso).

- [ ] **Step 3: implementación**

En `src/domain/fabricStock.js`:

```js
import { normalizeOf } from '../reviewRules.js';
```

Cambiar la firma y el bucle:

```js
export function summarizeFabricStock(rows = [], code = '', { reservas = [], ofsPropias = [] } = {}) {
  const wanted = String(code || '').trim().toUpperCase();
  const propias = new Set(ofsPropias.map(normalizeOf).filter(Boolean));
  const propioPorBobina = new Map();
  for (const r of reservas) {
    if (!propias.has(normalizeOf(r?.of))) continue;
    propioPorBobina.set(r.stockId, (propioPorBobina.get(r.stockId) || 0) + (Number(r.quantity) || 0));
  }
  let metros = 0;
  let reservado = 0;
  let reservadoPropio = 0;
  // …resto de variables igual…
  for (const row of rows) {
    // …mismos filtros de código, almacén excluido y metros <= 0…
    const total = Math.max(Number(row.reserved) || 0, 0);
    const propio = Math.min(propioPorBobina.get(row.stockId) || 0, total);
    const otros = Math.min(total - propio, meters);
    const free = meters - otros;
    if (consignmentWarehouse.test(warehouse)) { consignacion += free; continue; }
    metros += meters;
    reservado += otros;
    reservadoPropio += propio;
    // …resto igual (disponible, bobinas, almacenes) con `free`…
  }
  return { code: wanted, metros: round(metros), reservado: round(reservado), reservadoPropio: round(reservadoPropio), disponible: round(disponible), /* …resto igual… */ };
}
```

Actualizar el comentario de cabecera: «Disponible = metros − reservado por otros pedidos. Lo reservado por las OF del propio pedido (`ofsPropias`) no resta: va en `reservadoPropio`. Las asignaciones no cuentan.»

- [ ] **Step 4: ejecutar y ver que pasan**

Run: `pnpm exec vitest run src/domain/fabricStock.test.js`
Expected: PASS (las pruebas antiguas también).

- [ ] **Step 5: commit**

```bash
git add src/domain/fabricStock.js src/domain/fabricStock.test.js
git commit -m "feat(stock): las reservas del propio pedido no restan del disponible"
```

---

### Task 2: reservas por OF desde RPS y ruta con `ofs`

**Files:**
- Modify: `src/rpsCatalog.js:280-310`, `src/fabricRpsServices.js`, `src/server.js:184,541`
- Test: `src/fabricRpsServices.test.js`

**Interfaces:**
- Consumes: `summarizeFabricStock(rows, code, { reservas, ofsPropias })` (Task 1).
- Produces:
  - `queryRpsFabricReserveRows(): Promise<{ stockId: number, of: string, quantity: number }[]>`.
  - `createFabricStockService({ loadRows, loadReserves = async () => [], ttlMs, now })` → `getStock(codes: string[], { ofs?: string[] } = {})`.
  - `GET /api/catalog/fabrics/stock?codes=A,B&ofs=0234125,0234124`.

- [ ] **Step 1: pruebas que fallan** (en `src/fabricRpsServices.test.js`)

```js
it('getStock no resta las reservas de las OF indicadas', async () => {
  const service = createFabricStockService({
    loadRows: async () => [{ stockId: 7, code: 'X1', warehouseCode: '1', warehouseName: 'ARZÚA', roll: 'A', meters: 100, reserved: 30 }],
    loadReserves: async () => [{ stockId: 7, of: '0234125', quantity: 30 }],
  });
  const [con] = await service.getStock(['X1'], { ofs: ['0234125'] });
  const [sin] = await service.getStock(['X1']);
  expect(con).toMatchObject({ disponible: 100, reservado: 0, reservadoPropio: 30 });
  expect(sin).toMatchObject({ disponible: 70, reservado: 30, reservadoPropio: 0 });
});

it('la ruta pasa las OF de la consulta y descarta las que no son números', async () => {
  const getStock = vi.fn(async () => []);
  const res = { json: vi.fn(), status: vi.fn(() => res) };
  await fabricStockHandler({ getStock })({ query: { codes: 'X1', ofs: '234125,abc;drop,0234124' } }, res);
  expect(getStock).toHaveBeenCalledWith(['X1'], { ofs: ['0234125', '0234124'] });
});
```

- [ ] **Step 2: ejecutar y ver que fallan**

Run: `pnpm exec vitest run src/fabricRpsServices.test.js`
Expected: FAIL.

- [ ] **Step 3: implementación**

`src/rpsCatalog.js`: en `queryRpsFabricStockRows` añadir `s.IDStock AS stockId,` al `SELECT`. Debajo, nueva función:

```js
// Reservas de lona de Almacén con su OF (reserva → material de OF → tarea → OF). Solo
// lectura. Sirve para no restar lo que ya está reservado para el propio pedido.
export async function queryRpsFabricReserveRows() {
  const pool = await getPool();
  const result = await pool.request()
    .input('company', sql.VarChar(10), config.db.company)
    .query(`
    SELECT r.IDStock AS stockId, mo.CodManufacturingOrder AS [of], r.Quantity AS quantity
    FROM dbo.STKStockReserve r
    JOIN dbo.STKStock s ON s.IDStock = r.IDStock AND s.CodCompany = r.CodCompany
    JOIN dbo.STKArticle a ON a.IDArticle = s.IDArticle AND a.CodCompany = s.CodCompany
    JOIN dbo.GENProductFamily pf ON pf.IDProductFamily = a.IDProductFamily AND pf.CodCompany = a.CodCompany
    JOIN dbo.CPRMOMaterial m ON r.ItemType = 5 AND m.IDMOMaterial = r.IDItem AND m.CodCompany = r.CodCompany
    JOIN dbo.CPRMOTask t ON t.IDMOTask = m.IDMOTask AND t.CodCompany = m.CodCompany
    JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder = t.IDManufacturingOrder AND mo.CodCompany = t.CodCompany
    WHERE r.CodCompany = @company AND pf.Description = 'LONA';
  `);
  return result.recordset;
}
```

`src/fabricRpsServices.js`:

```js
import { normalizeOf } from './reviewRules.js';

export function createFabricStockService({ loadRows, loadReserves = async () => [], ttlMs = 60_000, now = Date.now }) {
  const rows = createCachedValue({
    load: async () => {
      const [stockRows, reservas] = await Promise.all([loadRows(), loadReserves()]);
      return { rows: stockRows, reservas, consultado: new Date(now()).toISOString() };
    },
    ttlMs,
    now
  });
  return {
    async getStock(codes, { ofs = [] } = {}) {
      const { rows: stockRows, reservas, consultado } = await rows.get();
      return codes.map((code) => ({ ...summarizeFabricStock(stockRows, code, { reservas, ofsPropias: ofs }), consultado }));
    },
    reset: rows.reset
  };
}
```

En `fabricStockHandler`: `await service.getStock(codes, { ofs: parseOfs(req.query?.ofs) })`, con:

```js
function parseOfs(value) {
  const list = String(Array.isArray(value) ? value.join(',') : value || '')
    .split(',').map((of) => of.trim()).filter((of) => /^\d{1,10}$/.test(of)).map(normalizeOf);
  return [...new Set(list)].slice(0, 50);
}
```

`src/server.js:184`: `createFabricStockService({ loadRows: queryRpsFabricStockRows, loadReserves: queryRpsFabricReserveRows })` y añadir el import.

- [ ] **Step 4: ejecutar y ver que pasan**

Run: `pnpm exec vitest run src/fabricRpsServices.test.js src/domain/fabricStock.test.js`
Expected: PASS.

- [ ] **Step 5: comprobar la consulta contra RPS (solo lectura)**

Run: `node tmp/tela-0930/sql.mjs "<el SELECT de queryRpsFabricReserveRows con @company>" 10`
Expected: filas con `stockId`, `of` y `quantity`; ninguna con `of` nulo.

- [ ] **Step 6: commit**

```bash
git add src/rpsCatalog.js src/fabricRpsServices.js src/fabricRpsServices.test.js src/server.js
git commit -m "feat(stock): leer de RPS a qué OF va cada reserva de lona"
```

---

### Task 3: «Generar archivos» con la cuenta y las OF de la entrega

**Files:**
- Modify: `src/stockLona.js:35-42`, `src/stockLonaAviso.js`, `src/stockLonaProduccion.js:60-100`
- Test: `src/stockLona.test.js`, `src/stockLonaProduccion.test.js`

**Interfaces:**
- Consumes: `getStock(codes, { ofs })` (Task 2).
- Produces: `FaltaLona = { codigo, descripcion, necesita, disponible, stock, reservado, reservadoPropio, ofs }`. Hasta la Task 6 lo que se manda a CoordinaOT se recorta a `{ codigo, descripcion, necesita, disponible, ofs }`.

- [ ] **Step 1: pruebas que fallan**

En `src/stockLona.test.js`:

```js
it('la falta lleva la cuenta completa', () => {
  const faltas = faltasLona(
    [{ codigo: 'PLAST880NEGRP204', descripcion: 'PVC negro 204', ml: 410.2, ofs: ['0234125'], origen: 'corte' }],
    [{ code: 'PLAST880NEGRP204', metros: 1257.8, reservado: 860, reservadoPropio: 40, disponible: 397.8 }],
  );
  expect(faltas).toEqual([{ codigo: 'PLAST880NEGRP204', descripcion: 'PVC negro 204', necesita: 410.2,
    stock: 1257.8, reservado: 860, reservadoPropio: 40, disponible: 397.8, ofs: ['0234125'] }]);
});

it('el aviso enseña stock menos reservas de otros pedidos', () => {
  expect(textoAvisoStock([{ codigo: 'PLAST880NEGRP204', descripcion: 'PVC negro 204', necesita: 410.2,
    stock: 1257.8, reservado: 860, reservadoPropio: 40, disponible: 397.8, ofs: ['0234125'] }])[0]).toBe(
    'No llega el stock de PLAST880NEGRP204 PVC negro 204: stock 1.257,80 m − reservado por otros pedidos 860,00 m = disponible 397,80 m; necesita 410,20 m, faltan 12,40 m. Reservado para este pedido: 40,00 m (no se resta).');
});
```

En `src/stockLonaProduccion.test.js`: un caso que compruebe que `stock.getStock` se llama con `(codigos, { ofs: <ofs de la entrega> })` y que lo enviado a `coordina.enviarStockLona` tiene en `faltas` solo las claves `codigo, descripcion, necesita, disponible, ofs`.

- [ ] **Step 2: ejecutar y ver que fallan**

Run: `pnpm exec vitest run src/stockLona.test.js src/stockLonaProduccion.test.js`
Expected: FAIL.

- [ ] **Step 3: implementación**

`src/stockLona.js`:

```js
/** @typedef {{ codigo: string, descripcion: string, necesita: number, disponible: number, stock: number, reservado: number, reservadoPropio: number, ofs: string[] }} FaltaLona */

/** @param {NecesidadLona[]} necesidades @param {{ code: string, metros?: number, reservado?: number, reservadoPropio?: number, disponible: number }[]} stock @returns {FaltaLona[]} */
export function faltasLona(necesidades, stock) {
  const porCodigo = new Map(stock.map(s => [s.code, s]));
  return necesidades.flatMap(({ codigo, descripcion, ml, ofs }) => {
    const s = porCodigo.get(codigo);
    const disponible = s?.disponible ?? 0;
    return disponible < ml ? [{ codigo, descripcion, necesita: ml, stock: s?.metros ?? 0, reservado: s?.reservado ?? 0,
      reservadoPropio: s?.reservadoPropio ?? 0, disponible, ofs }] : [];
  });
}
```

`src/stockLonaAviso.js`:

```js
export function textoAvisoStock(faltas) {
  if (!faltas.length) return [];
  const m = n => `${formatoMl.format(n)} m`;
  return [
    ...faltas.map(f => `No llega el stock de ${[f.codigo, f.descripcion].filter(Boolean).join(' ')}: stock ${m(f.stock)} − reservado por otros pedidos ${m(f.reservado)} = disponible ${m(f.disponible)}; necesita ${m(f.necesita)}, faltan ${m(f.necesita - f.disponible)}.`
      + (f.reservadoPropio > 0 ? ` Reservado para este pedido: ${m(f.reservadoPropio)} (no se resta).` : '')),
    'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.',
  ];
}
```

`src/stockLonaProduccion.js`:
- `consultarStock(opciones, ofs)`: `stock.getStock(lonas.map(l => l.codigo), { ofs })`. Ajustar el `@typedef ServiciosStockLona` (`getStock: (codigos: string[], opciones?: { ofs?: string[] }) => …`).
- En `informarStock`, antes de mandar: `faltas: faltas.map(ajustar).map(({ codigo, descripcion, necesita, disponible, ofs }) => ({ codigo, descripcion, necesita, disponible, ofs }))` con el comentario «CoordinaOT valida las claves exactas: la cuenta completa va cuando acepte los campos nuevos (Task 6)».

- [ ] **Step 4: ejecutar y ver que pasan**

Run: `pnpm exec vitest run src/stockLona.test.js src/stockLonaProduccion.test.js`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add src/stockLona.js src/stockLonaAviso.js src/stockLonaProduccion.js src/stockLona.test.js src/stockLonaProduccion.test.js
git commit -m "feat(stock): el aviso de Generar archivos enseña la cuenta y no cuenta las reservas del pedido"
```

---

### Task 4: la línea de stock en pantalla (toldos y remolques)

**Files:**
- Modify: `src/client/fabricStock.ts`, `src/client/hooks/useFabricStock.ts`, `src/client/components/FabricStockLine.tsx`, `src/client/components/AwningColumn.tsx:686,856`, `src/client/components/OrderHeader.tsx:79`, `src/client/remolques/Campos.tsx:413`
- Test: `src/client/fabricStock.test.ts` (crear si no existe)

**Interfaces:**
- Consumes: `GET /api/catalog/fabrics/stock?codes=…&ofs=…` (Task 2).
- Produces: `FabricStock.reservadoPropio: number`; `useFabricStocks(codes, ofs?: string[])`, `useFabricStock(code, ofs?)`; `FabricStockLine`/`FabricStockCodeLine` con prop `ofs?: string[]`.

- [ ] **Step 1: pruebas que fallan** (`src/client/fabricStock.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { fabricStockLine, type FabricStock } from './fabricStock';

const base: FabricStock = { code: 'PLAST880NEGRP204', metros: 1257.8, reservado: 860, reservadoPropio: 0, disponible: 397.8,
  bobinasConDisponible: 10, mayorBobinaDisponible: 65, consignacion: 0, almacenes: [] };

describe('fabricStockLine con la cuenta', () => {
  it('enseña stock menos reservas de otros pedidos', () => {
    expect(fabricStockLine(base).text).toBe('Stock RPS: 1.257,8 m − 860 m reservados por otros pedidos = 397,8 m disponibles en 10 bobinas (la mayor, 65 m)');
  });
  it('sin reservas no enseña la resta', () => {
    expect(fabricStockLine({ ...base, reservado: 0, disponible: 1257.8 }).text).toBe('Stock RPS: 1.257,8 m disponibles en 10 bobinas (la mayor, 65 m)');
  });
  it('lo reservado para este pedido sale aparte y no resta', () => {
    expect(fabricStockLine({ ...base, reservadoPropio: 40 }).text).toContain(' · 40 m reservados para este pedido (no se restan)');
  });
});
```

- [ ] **Step 2: ejecutar y ver que fallan**

Run: `pnpm exec vitest run src/client/fabricStock.test.ts`
Expected: FAIL.

- [ ] **Step 3: implementación**

`src/client/fabricStock.ts`: añadir `reservadoPropio: number;` al tipo. En `fabricStockLine`:

```ts
const resta = stock.reservado > 0 ? `${meters(stock.metros)} m − ${meters(stock.reservado)} m reservados por otros pedidos = ` : '';
const propio = stock.reservadoPropio > 0 ? ` · ${meters(stock.reservadoPropio)} m reservados para este pedido (no se restan)` : '';
// sin stock:
return { text: `Sin stock en RPS${stock.reservado > 0 ? ` (${meters(stock.metros)} m − ${meters(stock.reservado)} m reservados por otros pedidos)` : ''}${propio}${need}${consignment}`, tone: 'aviso', title };
// con stock:
let text = `Stock RPS: ${resta}${meters(stock.disponible)} m disponibles en ${rolls}${biggest}${propio}${need}`;
```

Quitar la variable `reserved` antigua. En `stockTitle`: «Disponible = stock en almacén menos lo reservado por otros pedidos en RPS. Lo reservado para este pedido no se resta.»

`src/client/hooks/useFabricStock.ts`: la clave de caché pasa a ser `${code}|${ofs.join(',')}`; `loadFabricStocks(codes, ofs = [])` añade `&ofs=${encodeURIComponent(ofs.join(','))}` cuando hay OF; `useFabricStocks(codes, ofs = [])` y `useFabricStock(code, ofs = [])` (en las dependencias del efecto, `ofs.join(',')`).

`src/client/components/FabricStockLine.tsx`: `FabricStockLine({ selection, neededMl, ofs })` → `FabricStockCodeLine({ code, neededMl, prefix, ofs })` → `useFabricStock(code, ofs)`.

Llamadas: pasar las OF del pedido que ya tiene cada pantalla.
- `AwningColumn.tsx` y `OrderHeader.tsx`: las OF de todos los toldos del borrador (`draft.awnings.map(a => a.of).filter(Boolean)`); si el componente no las tiene, añadir la prop `ofsPedido: string[]` desde `OrderView.tsx`, que sí tiene el borrador.
- `remolques/Campos.tsx`: las `ordenFabricacion` de los elementos del pedido de remolques, por prop desde el formulario que lo contiene.

- [ ] **Step 4: ejecutar y ver que pasan**

Run: `pnpm exec vitest run src/client/fabricStock.test.ts && pnpm typecheck`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: commit**

```bash
git add src/client/fabricStock.ts src/client/fabricStock.test.ts src/client/hooks/useFabricStock.ts src/client/components/FabricStockLine.tsx src/client/components/AwningColumn.tsx src/client/components/OrderHeader.tsx src/client/views/OrderView.tsx src/client/remolques/Campos.tsx
git commit -m "feat(stock): la línea de stock enseña la cuenta y no resta lo reservado para el pedido"
```

(Añadir al `git add` solo los ficheros que de verdad se hayan tocado.)

---

### Task 5: CoordinaOT acepta y pinta la cuenta (repo `coordina-ot`)

**Files:**
- Modify: `src/lib/server/stock-lona-db.ts:4,62-68`, `src/lib/correo-stock.ts`, `src/components/AvisoStockPase.tsx`
- Test: `src/lib/__tests__/stock-lona-db.test.ts`, `correo-stock.test.ts`, `aviso-stock-pase.test.ts`

**Interfaces:**
- Produces: `FaltaLona = { codigo, descripcion, necesita, disponible, ofs, stock?: number, reservado?: number, reservadoPropio?: number }`. Se aceptan las faltas con 5 claves (formato actual) o con 8 (con la cuenta).

- [ ] **Step 1: pruebas que fallan**
  - `stock-lona-db.test.ts`: una falta con `stock: 1257.8, reservado: 860, reservadoPropio: 40` se acepta y se guarda; una con solo `stock` (7 claves) se rechaza; la de 5 claves sigue aceptándose.
  - `correo-stock.test.ts`: con la cuenta, el texto plano contiene `Stock en almacén: 1.257,8 m`, `− Reservado (otros pedidos): 860 m`, `= Disponible: 397,8 m`, `Necesita este pedido: 410,2 m`, `Faltan: 12,4 m` y `Reservado para este pedido: 40 m (no se resta)`; el HTML contiene las mismas cifras y «Faltan» en rojo (`#c20e4d`). Sin la cuenta, el correo sale como ahora.
  - `aviso-stock-pase.test.ts`: con la cuenta, la línea dice `stock 1.257,8 m − 860 m reservados = 397,8 m disponible · necesita 410,2 m`.

- [ ] **Step 2: ejecutar y ver que fallan**

Run: `pnpm exec vitest run src/lib/__tests__/stock-lona-db.test.ts src/lib/__tests__/correo-stock.test.ts src/lib/__tests__/aviso-stock-pase.test.ts`
Expected: FAIL.

- [ ] **Step 3: implementación**

`stock-lona-db.ts`:

```ts
export interface FaltaLona { codigo: string; descripcion: string; necesita: number; disponible: number; ofs: string[];
  stock?: number; reservado?: number; reservadoPropio?: number }
const CLAVES_FALTA = ["codigo", "descripcion", "necesita", "disponible", "ofs"];
const CLAVES_CUENTA = ["stock", "reservado", "reservadoPropio"];
// …en el bucle:
const conCuenta = tieneClaves(f, [...CLAVES_FALTA, ...CLAVES_CUENTA]);
if (!(conCuenta || tieneClaves(f, CLAVES_FALTA)) || /* …validaciones actuales… */) return null;
if (conCuenta && ![f.stock, f.reservado, f.reservadoPropio].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0)) return null;
faltas.push({ ...base, necesita: f.necesita, disponible: f.disponible, ofs: f.ofs.map(texto),
  ...(conCuenta ? { stock: f.stock as number, reservado: f.reservado as number, reservadoPropio: f.reservadoPropio as number } : {}) });
```

`correo-stock.ts`: si la falta trae `stock`, el texto plano de la tarjeta pasa a:

```
No llega el stock de {codigo} {descripcion}
Stock en almacén: {stock}
− Reservado (otros pedidos): {reservado}
= Disponible: {disponible}
Necesita este pedido: {necesita}
Faltan: {necesita − disponible}
[Reservado para este pedido: {reservadoPropio} (no se resta)]
```

y el HTML, una tabla de cinco filas con las mismas etiquetas (cifras a la derecha, «Faltan» en negrita y `#c20e4d`, la línea del propio pedido en `C.apagado`). Sin `stock`, la tarjeta actual de Necesita/Stock disponible.

`AvisoStockPase.tsx`: si `f.stock !== undefined`, `{f.codigo} · {textoOFStock(f.ofs)} · stock {metrosStock(f.stock)} − {metrosStock(f.reservado)} reservados = {metrosStock(f.disponible)} disponible · necesita {metrosStock(f.necesita)}`; si no, la línea actual.

- [ ] **Step 4: ejecutar y ver que pasan**

Run: `pnpm test && pnpm typecheck && pnpm lint` (en `coordina-ot`)
Expected: PASS.

- [ ] **Step 5: commit** (en `coordina-ot`)

```bash
git add src/lib/server/stock-lona-db.ts src/lib/correo-stock.ts src/components/AvisoStockPase.tsx src/lib/__tests__/stock-lona-db.test.ts src/lib/__tests__/correo-stock.test.ts src/lib/__tests__/aviso-stock-pase.test.ts
git commit -m "feat(stock): el aviso y el correo de falta de material enseñan stock menos reservas"
```

---

### Task 6: Planteamientos manda la cuenta a CoordinaOT

Solo cuando la Task 5 esté desplegada en CoordinaOT (si no, CoordinaOT rechaza el envío entero).

**Files:**
- Modify: `src/stockLonaProduccion.js` (el recorte de la Task 3)
- Test: `src/stockLonaProduccion.test.js`

- [ ] **Step 1: prueba que falla**: lo enviado a `coordina.enviarStockLona` tiene en cada falta `codigo, descripcion, necesita, disponible, ofs, stock, reservado, reservadoPropio`.
- [ ] **Step 2:** `pnpm exec vitest run src/stockLonaProduccion.test.js` → FAIL.
- [ ] **Step 3:** quitar el recorte: `faltas: faltas.map(ajustar)`; borrar el comentario de la Task 3.
- [ ] **Step 4:** `pnpm exec vitest run src/stockLonaProduccion.test.js` → PASS.
- [ ] **Step 5: commit**

```bash
git add src/stockLonaProduccion.js src/stockLonaProduccion.test.js
git commit -m "feat(stock): mandar a CoordinaOT la cuenta completa del stock de lona"
```

---

### Task 7: verificación final

- [ ] `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build` en `toldos-testar` → todo verde.
- [ ] Instancia aislada (`start-isolated.sh`, `/api/health` con `simulationMode: true` y `fileWritesEnabled: false`): capturas con Playwright de la línea de stock en un toldo y en un remolque, claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/stock-regla-unica/`. Mirarlas.
- [ ] Prueba en ensayo de CoordinaOT: generar un pedido con una lona que no llega, pasarlo y ver el bloque y el correo (solo a `CORREO_ENSAYO_PARA`) con la cuenta.
- [ ] Despliegue (lo hace Iván): primero CoordinaOT, luego Planteamientos.

## Fuera de este plan

Van en un plan aparte, después del estudio de planos manuales: el modal de «Planos a corte», la detección de lona y ML y el aviso «Sin comprobar el stock de lona» en CoordinaOT.
