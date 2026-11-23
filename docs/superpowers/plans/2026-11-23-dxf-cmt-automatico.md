# DWG/DXF a corte automático — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** subir un DWG o DXF en «DXF a CMT» y obtener, tras una vista previa y las decisiones del técnico, un DXF 2004 limpio (máquina nueva) y el CMT (máquina vieja) de la misma geometría.

**Architecture:** módulo nuevo `src/cmt/preparacion/` de funciones puras: hornear (descomponer a líneas/arcos/textos en coordenadas del mundo), marco, unidades, capas, solapes, salida y un orquestador `preparar()`. La ruta `POST /api/cmt/preparar` pasa el DWG por ODA, llama a `preparar()` y, si no queda nada pendiente, genera el CMT con `dxfACmt` sobre el DXF limpio. La tabla de capas es un JSON junto a la configuración del servidor. La página `CmtView` enseña la vista previa y lo pendiente.

**Tech Stack:** TypeScript/JS ESM, Node (Express), React, Vitest, pnpm. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-11-23-dxf-cmt-automatico-design.md`

## Global Constraints

- Marco del corte = rectángulo (eje X/Y) en la capa `0`; en la oficina nunca se dibuja en la capa 0.
- DWG siempre ×1000 (planos en metros). DXF: `$INSUNITS` 6 → ×1000, 5 → ×10, 4 → ×1; otro código distinto de 0 → duda; sin unidades, por tamaño (lado mayor < 100 unidades → ×1000, si no ×1). Resultado fuera de 10 mm…`LARGO_MAXIMO_MM` (provisional 60 000, se fija con la Task 0) → no se genera.
- Nunca sale un DXF o CMT vacío: si no queda nada que cortar, es una duda.
- Las correcciones marcadas «Revisión 23/11» en cada tarea son obligatorias y mandan sobre el código de ejemplo de esa tarea.
- Salida siempre en mm, DXF 2004 (AC1018), solo capas `DISCO1, DISCO2, CUTTER, ROTULADOR, taladro, texto`.
- Capas desconocidas: las elige el técnico y se guardan en la tabla. Nunca por color automático.
- Solapes en la misma capa (tras asignar capas): se quitan solos, tolerancia 0,01 mm. Entre capas distintas: decide el técnico (por pareja de capas).
- Nada se genera ni se manda con algo pendiente o con dudas.
- No escribir nunca en carpetas de producción ni en `maqcorte` durante pruebas; los DWG de la oficina solo se leen, y siempre a través de copias en `tmp/`.
- Textos y mensajes de la interfaz en castellano llano, sin decir «experimental». Nombres normalizados (mayúscula inicial).
- Pruebas acotadas: `pnpm vitest run src/cmt src/cmtHerramientaRoutes.test.js src/cmtMaquinaRoutes.test.js src/client/cmt --maxWorkers=6`, más `pnpm typecheck` y `pnpm lint`. No lanzar la suite entera.
- Trabajo en la rama `feat/dxf-cmt-automatico` (worktree). Commits solo con autorización de Iván; merge a `main` y despliegue, solo con su permiso.

---

### Task 0: Estudio de planos reales (solo lectura)

**Files:**
- Create: `tmp/dxf-auto-estudio/estudio.mjs`, `tmp/dxf-auto-estudio/INFORME.md` (sin versionar)
- Create: `src/cmt/preparacion/capasIniciales.json` (propuesta; se revisa con Iván antes de usarla)

**Interfaces:**
- Produces: `capasIniciales.json` con forma `{ "NOMBRE EN MAYÚSCULAS": "DISCO1"|"DISCO2"|"CUTTER"|"ROTULADOR"|"taladro"|"texto"|"NO_CORTAR" }`.

- [ ] **Step 1: Copiar muestras.** Copiar a `tmp/dxf-auto-estudio/dwg/` (solo lectura del origen) ~60 DWG recientes de `\\192.168.0.128\Oftecnica\Oficina Tecnica\2026\` repartidos entre toldos, remolques y puertas. Convertirlos a DXF en `tmp/dxf-auto-estudio/dxf/` con `C:\Users\ivan.sanchez\tools\oda\ODAFileConverter.exe <in> <out> ACAD2018 DXF 0 1 "*.dwg"`.
- [ ] **Step 2: Script de estudio.** `estudio.mjs` usa `leerDxf` y `prepararEntidades` de `src/cmt` (ejecutar con `node --experimental-strip-types` o `pnpm tsx` si está en el proyecto) y saca por fichero: `$INSUNITS`, extensión del dibujo, rectángulos cerrados en la capa 0 (polilínea de 4 vértices o 4 líneas), entidades en capa 0 que no son rectángulo, tipos de entidad (cuenta de SPLINE, ELLIPSE, POLYLINE, HATCH, MTEXT…), capas con su color y nº de entidades.
- [ ] **Step 3: Capas de corte reales.** Sobre `tmp/bot-estudio/pares-2026/` (DXF de corte hechos a mano y su CMT del robot), cruzar capa del DXF → herramienta del CMT para proponer la tabla. Contar también el origen (esquina mínima) de esos DXF para saber dónde colocar el dibujo en el DXF limpio.
- [ ] **Step 4: Informe.** `INFORME.md`: tabla capa → herramienta propuesta con nº de casos, capas dudosas, cuántos planos tienen 0, 1 o más marcos, si hay piezas dibujadas en la capa 0, unidades, frecuencia de SPLINE/ELLIPSE (si son frecuentes, hay que añadir su soporte a la Task 2), y origen habitual de los DXF a mano.
- [ ] **Step 5: Revisión.** El coordinador revisa el informe y enseña la tabla propuesta a Iván. Solo con su visto bueno queda `capasIniciales.json`.

---

### Task 1: Tipos y DXF de prueba

**Files:**
- Create: `src/cmt/preparacion/tipos.ts`
- Create: `src/cmt/preparacion/pruebaDxf.ts` (ayuda solo para pruebas)
- Test: `src/cmt/preparacion/pruebaDxf.test.ts`

**Interfaces:**
- Produces: tipos `Herramienta`, `HERRAMIENTAS`, `P`, `Caja`, `Pieza`, `Matriz`; `dxfPrueba(opciones): string`.

- [ ] **Step 1: Escribir `tipos.ts`**

```ts
export type Herramienta = 'DISCO1' | 'DISCO2' | 'CUTTER' | 'ROTULADOR' | 'taladro' | 'texto' | 'NO_CORTAR';
export const HERRAMIENTAS: Herramienta[] = ['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'taladro', 'texto', 'NO_CORTAR'];
export interface P { x: number; y: number }
export interface Caja { x0: number; y0: number; x1: number; y1: number }
/** Ángulos en grados, sentido antihorario. `circulo` = vuelta entera. */
export type Pieza =
  | { tipo: 'linea'; capa: string; id: string; a: P; b: P }
  | { tipo: 'arco'; capa: string; id: string; c: P; r: number; desde: number; hasta: number; circulo: boolean }
  | { tipo: 'texto'; capa: string; id: string; pares: [number, string][] };
/** Igual que `entidades.ts`: x' = m0·x + m2·y + m4 ; y' = m1·x + m3·y + m5. */
export type Matriz = [number, number, number, number, number, number];
```

- [ ] **Step 2: Escribir la prueba de `pruebaDxf`**

```ts
import { describe, expect, it } from 'vitest';
import { leerDxf } from '../dxf.ts';
import { dxfPrueba } from './pruebaDxf.ts';

describe('dxfPrueba', () => {
  it('produce un DXF que leerDxf acepta, con capas y unidades', () => {
    const d = leerDxf(dxfPrueba({ insunits: 6, capas: { corte: 1 }, entidades: ['0\nLINE\n8\ncorte\n10\n0\n20\n0\n11\n1\n21\n0'] }));
    expect(d.entities).toHaveLength(1);
    expect(d.layers.corte.color).toBe(1);
  });
});
```

- [ ] **Step 3: Ejecutar y ver que falla** — `pnpm vitest run src/cmt/preparacion/pruebaDxf.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 4: Escribir `pruebaDxf.ts`**

```ts
/** DXF mínimo para pruebas: cabecera con $EXTMIN e $INSUNITS, tabla de capas y entidades en texto DXF. */
export function dxfPrueba({ insunits, capas = {}, entidades = [], bloques = [] }: {
  insunits?: number; capas?: Record<string, number>; entidades?: string[]; bloques?: string[];
}): string {
  const cab = ['0', 'SECTION', '2', 'HEADER', '9', '$EXTMIN', '10', '0', '20', '0', '30', '0',
    ...(insunits === undefined ? [] : ['9', '$INSUNITS', '70', String(insunits)]), '0', 'ENDSEC'];
  const tablas = ['0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER',
    ...Object.entries({ '0': 7, ...capas }).flatMap(([n, c]) => ['0', 'LAYER', '2', n, '70', '0', '62', String(c)]),
    '0', 'ENDTAB', '0', 'ENDSEC'];
  const blq = ['0', 'SECTION', '2', 'BLOCKS', ...bloques.flatMap(b => b.split('\n')), '0', 'ENDSEC'];
  const ent = ['0', 'SECTION', '2', 'ENTITIES', ...entidades.flatMap(e => e.split('\n')), '0', 'ENDSEC', '0', 'EOF'];
  return [...cab, ...tablas, ...blq, ...ent].join('\n') + '\n';
}
```

- [ ] **Step 5: Ejecutar** → PASS.
- [ ] **Step 6: Commit** (si Iván lo ha autorizado) `feat(cmt): tipos de la preparación automática del corte`.

---

### Task 2: Hornear (descomponer a piezas en el mundo)

**Revisión 23/11 (obligatorio, con prueba por punto):**
- `hornear` conserva las validaciones de `src/cmt/validacion.ts`: códigos obligatorios ausentes, `r > 0`, `h > 0` y polilíneas con anchura (`40/41/43` ≠ 0) → duda, nunca `0` ni `NaN` en silencio.
- `INSERT` con normal `230 < 0` en `src/cmt/entidades.ts:31-32`: hoy niega `sx` antes de girar y deja sin negar el punto de inserción, con lo que el bloque queda mal colocado cuando `10 ≠ 0` o `50 ≠ 0`. Correcto: matriz del INSERT en OCS y luego espejo `(-x, y)` por la izquierda. Es un fallo también del conversor actual: prueba con un bloque girado y desplazado en `230 = -1` comparando con el resultado de ZWCAD (o con el cálculo a mano), y comprobar que `pnpm vitest run src/cmt` sigue en verde.
- `TEXT`: si `72` y `73` son 0, el punto es `10/20` y no se transforma ni se emite `11/21`; si no, el ancla es `11/21`.
- Estilo de texto (`7`): copiar al `TEXT` el ancho (`41`) y el oblicuo (`51`) del estilo cuando la entidad no los traiga, y avisar si el estilo usa una fuente `.shx`.

**Files:**
- Create: `src/cmt/preparacion/hornear.ts`
- Test: `src/cmt/preparacion/hornear.test.ts`

**Interfaces:**
- Consumes: `EntidadDxf` ya pasadas por `prepararEntidades` (pueden llevar `transformacion`), `number/value/values` de `../dxf.ts`.
- Produces:
  - `hornear(entidades: EntidadDxf[]): { piezas: Pieza[]; avisos: Duda[]; dudas: Duda[] }`
  - `transformarPiezas(piezas: Pieza[], m: Matriz): Pieza[]` (lanza `Error` si la escala no es uniforme para arcos/textos)
  - `tramoPolilinea(p: P, q: P, bulge: number)` → `{ tipo:'linea', a, b } | { tipo:'arco', c, r, desde, hasta }`
  - `normGrados(g: number): number` en [0, 360)

Reglas: LINE en coordenadas del mundo (sin OCS). ARC, CIRCLE, LWPOLYLINE y TEXT con `230 < 0` aplican antes el espejo OCS `[-1,0,0,1,0,0]`. LWPOLYLINE se descompone en líneas y arcos (como EXPLODE). TEXT: se transforman 10/20 y 11/21, `40 ×= s`, `50` girado; con espejo → duda. POINT, HATCH, WIPEOUT, IMAGE, VIEWPORT y espacio papel (67=1) → se omiten con aviso agregado. Cualquier otro tipo (SPLINE, ELLIPSE, MTEXT sin descomponer…) → duda con el texto «Hay una entidad X en la capa Y que no se puede preparar: conviértela a líneas, arcos o polilíneas en ZWCAD».

- [ ] **Step 1: Pruebas que fallan**

```ts
import { describe, expect, it } from 'vitest';
import { hornear, transformarPiezas, tramoPolilinea } from './hornear.ts';
import type { EntidadDxf } from '../tipos.ts';

const e = (type: string, pairs: [number, string][], transformacion?: EntidadDxf['transformacion']): EntidadDxf => ({ type, pairs, transformacion });

describe('tramoPolilinea', () => {
  it('bulge 1 es media vuelta antihoraria con centro en el punto medio', () => {
    const t = tramoPolilinea({ x: 0, y: 0 }, { x: 2, y: 0 }, 1);
    expect(t.tipo).toBe('arco');
    if (t.tipo !== 'arco') return;
    expect(t.c.x).toBeCloseTo(1); expect(t.c.y).toBeCloseTo(0); expect(t.r).toBeCloseTo(1);
    expect(t.desde).toBeCloseTo(180); expect(t.hasta).toBeCloseTo(0);
  });
  it('bulge negativo invierte desde/hasta', () => {
    const t = tramoPolilinea({ x: 0, y: 0 }, { x: 2, y: 0 }, -1);
    if (t.tipo !== 'arco') throw new Error('arco');
    expect(t.desde).toBeCloseTo(0); expect(t.hasta).toBeCloseTo(180);
  });
});

describe('hornear', () => {
  it('descompone una polilínea cerrada en cuatro líneas', () => {
    const r = hornear([e('LWPOLYLINE', [[5, 'A'], [8, 'corte'], [70, '1'], [90, '4'], [10, '0'], [20, '0'], [10, '2'], [20, '0'], [10, '2'], [20, '1'], [10, '0'], [20, '1']])]);
    expect(r.dudas).toEqual([]);
    expect(r.piezas.map(p => p.tipo)).toEqual(['linea', 'linea', 'linea', 'linea']);
    expect(r.piezas.every(p => p.capa === 'corte')).toBe(true);
  });
  it('aplica la transformación de bloque a un arco con giro de 90°', () => {
    const r = hornear([e('ARC', [[5, 'B'], [8, 'corte'], [10, '1'], [20, '0'], [40, '1'], [50, '0'], [51, '90']], [0, 1, -1, 0, 10, 0])]);
    const a = r.piezas[0];
    if (a.tipo !== 'arco') throw new Error('arco');
    expect(a.c.x).toBeCloseTo(10); expect(a.c.y).toBeCloseTo(1);
    expect(a.desde).toBeCloseTo(90); expect(a.hasta).toBeCloseTo(180);
  });
  it('un espejo intercambia desde y hasta', () => {
    const r = hornear([e('ARC', [[5, 'C'], [8, 'corte'], [10, '0'], [20, '0'], [40, '1'], [50, '0'], [51, '90']], [-1, 0, 0, 1, 0, 0])]);
    const a = r.piezas[0];
    if (a.tipo !== 'arco') throw new Error('arco');
    expect(a.desde).toBeCloseTo(90); expect(a.hasta).toBeCloseTo(180);
  });
  it('normal -Z en un círculo refleja el centro en X', () => {
    const r = hornear([e('CIRCLE', [[5, 'D'], [8, 'corte'], [10, '3'], [20, '4'], [40, '1'], [230, '-1']])]);
    const a = r.piezas[0];
    if (a.tipo !== 'arco') throw new Error('arco');
    expect(a.c.x).toBeCloseTo(-3); expect(a.c.y).toBeCloseTo(4); expect(a.circulo).toBe(true);
  });
  it('escala desigual en un arco es duda', () => {
    const r = hornear([e('ARC', [[5, 'E'], [8, 'corte'], [10, '0'], [20, '0'], [40, '1'], [50, '0'], [51, '90']], [2, 0, 0, 1, 0, 0])]);
    expect(r.dudas[0].motivo).toMatch(/escala desigual/);
  });
  it('SPLINE es duda con indicación para ZWCAD', () => {
    const r = hornear([e('SPLINE', [[5, 'F'], [8, 'corte']])]);
    expect(r.dudas[0].motivo).toMatch(/SPLINE en la capa corte.*ZWCAD/);
  });
  it('omite HATCH con aviso', () => {
    const r = hornear([e('HATCH', [[5, 'G'], [8, 'corte']])]);
    expect(r.piezas).toEqual([]); expect(r.dudas).toEqual([]); expect(r.avisos).toHaveLength(1);
  });
});

describe('transformarPiezas', () => {
  it('escala ×1000 líneas, arcos y altura de texto', () => {
    const [l, a, t] = transformarPiezas([
      { tipo: 'linea', capa: 'x', id: '1', a: { x: 0, y: 0 }, b: { x: 1.5, y: 0 } },
      { tipo: 'arco', capa: 'x', id: '2', c: { x: 1, y: 1 }, r: 0.02, desde: 0, hasta: 90, circulo: false },
      { tipo: 'texto', capa: 'x', id: '3', pares: [[10, '1'], [20, '2'], [40, '0.05'], [1, 'A']] },
    ], [1000, 0, 0, 1000, 0, 0]);
    expect(l.tipo === 'linea' && l.b.x).toBeCloseTo(1500);
    expect(a.tipo === 'arco' && a.r).toBeCloseTo(20);
    expect(t.tipo === 'texto' && Number(t.pares.find(p => p[0] === 40)![1])).toBeCloseTo(50);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla.**
- [ ] **Step 3: Implementar `hornear.ts`**

```ts
import { number, value } from '../dxf.ts';
import type { Duda, EntidadDxf } from '../tipos.ts';
import type { Matriz, P, Pieza } from './tipos.ts';

const ID: Matriz = [1, 0, 0, 1, 0, 0];
const ESPEJO_OCS: Matriz = [-1, 0, 0, 1, 0, 0];
const OMITIR = new Set(['POINT', 'HATCH', 'WIPEOUT', 'IMAGE', 'VIEWPORT']);
const RAD = Math.PI / 180;

export const normGrados = (g: number) => ((g % 360) + 360) % 360;
export const aplicar = (m: Matriz, p: P): P => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
export const componer = (a: Matriz, b: Matriz): Matriz => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];

function uniforme(m: Matriz): { s: number; espejo: boolean } | null {
  const a2 = m[0] ** 2 + m[1] ** 2, b2 = m[2] ** 2 + m[3] ** 2, cruz = m[0] * m[2] + m[1] * m[3], ref = Math.max(a2, b2);
  if (Math.abs(a2 - b2) > 1e-6 * ref || Math.abs(cruz) > 1e-6 * ref) return null;
  return { s: Math.sqrt(a2), espejo: m[0] * m[3] - m[1] * m[2] < 0 };
}
const anguloImagen = (m: Matriz, g: number) => normGrados(Math.atan2(m[1] * Math.cos(g * RAD) + m[3] * Math.sin(g * RAD), m[0] * Math.cos(g * RAD) + m[2] * Math.sin(g * RAD)) / RAD);

export function tramoPolilinea(p: P, q: P, bulge: number):
  { tipo: 'linea'; a: P; b: P } | { tipo: 'arco'; c: P; r: number; desde: number; hasta: number } {
  if (Math.abs(bulge) < 1e-12) return { tipo: 'linea', a: p, b: q };
  const dx = q.x - p.x, dy = q.y - p.y, cuerda = Math.hypot(dx, dy);
  const d = cuerda * (1 - bulge * bulge) / (4 * bulge); // del punto medio al centro, hacia la izquierda de p→q
  const c = { x: (p.x + q.x) / 2 - dy / cuerda * d, y: (p.y + q.y) / 2 + dx / cuerda * d };
  const r = Math.hypot(p.x - c.x, p.y - c.y);
  const ap = normGrados(Math.atan2(p.y - c.y, p.x - c.x) / RAD), aq = normGrados(Math.atan2(q.y - c.y, q.x - c.x) / RAD);
  return bulge > 0 ? { tipo: 'arco', c, r, desde: ap, hasta: aq } : { tipo: 'arco', c, r, desde: aq, hasta: ap };
}

export function transformarPieza(p: Pieza, m: Matriz): Pieza {
  if (p.tipo === 'linea') return { ...p, a: aplicar(m, p.a), b: aplicar(m, p.b) };
  const u = uniforme(m);
  if (!u) throw new Error(`Hay un bloque con escala desigual en la capa ${p.capa}: descompón el bloque en ZWCAD y revisa sus arcos y textos`);
  if (p.tipo === 'arco') {
    const c = aplicar(m, p.c), r = p.r * u.s;
    if (p.circulo) return { ...p, c, r, desde: 0, hasta: 360 };
    const a0 = anguloImagen(m, p.desde), a1 = anguloImagen(m, p.hasta);
    return { ...p, c, r, desde: u.espejo ? a1 : a0, hasta: u.espejo ? a0 : a1 };
  }
  if (u.espejo) throw new Error(`Hay un texto reflejado en la capa ${p.capa}: descompón el bloque en ZWCAD y endereza el texto`);
  const pares = p.pares.map(([c, v]) => [c, v] as [number, string]);
  const punto = (cx: number, cy: number) => {
    const ix = pares.findIndex(([c]) => c === cx), iy = pares.findIndex(([c]) => c === cy);
    if (ix < 0 || iy < 0) return;
    const q = aplicar(m, { x: Number(pares[ix][1]), y: Number(pares[iy][1]) });
    pares[ix] = [cx, String(q.x)]; pares[iy] = [cy, String(q.y)];
  };
  punto(10, 20); punto(11, 21);
  const i40 = pares.findIndex(([c]) => c === 40); if (i40 >= 0) pares[i40] = [40, String(Number(pares[i40][1]) * u.s)];
  const i50 = pares.findIndex(([c]) => c === 50), g = anguloImagen(m, i50 >= 0 ? Number(pares[i50][1]) : 0);
  if (i50 >= 0) pares[i50] = [50, String(g)]; else if (g > 1e-9) pares.push([50, String(g)]);
  return { ...p, pares };
}
export const transformarPiezas = (piezas: Pieza[], m: Matriz) => piezas.map(p => transformarPieza(p, m));

function vertices(e: EntidadDxf): { x: number; y: number; bulge: number }[] {
  const out: { x: number; y: number; bulge: number }[] = [];
  for (const [c, v] of e.pairs) {
    if (c === 10) out.push({ x: Number(v), y: NaN, bulge: 0 });
    else if (c === 20 && out.length) out[out.length - 1].y = Number(v);
    else if (c === 42 && out.length) out[out.length - 1].bulge = Number(v);
  }
  return out;
}

function locales(e: EntidadDxf, capa: string, id: string): Pieza[] {
  if (e.type === 'LINE') return [{ tipo: 'linea', capa, id, a: { x: number(e, 10), y: number(e, 20) }, b: { x: number(e, 11), y: number(e, 21) } }];
  if (e.type === 'CIRCLE') return [{ tipo: 'arco', capa, id, c: { x: number(e, 10), y: number(e, 20) }, r: number(e, 40), desde: 0, hasta: 360, circulo: true }];
  if (e.type === 'ARC') return [{ tipo: 'arco', capa, id, c: { x: number(e, 10), y: number(e, 20) }, r: number(e, 40), desde: normGrados(number(e, 50)), hasta: normGrados(number(e, 51)), circulo: false }];
  if (e.type === 'LWPOLYLINE') {
    const v = vertices(e), cerrada = (number(e, 70) & 1) === 1, out: Pieza[] = [];
    const n = cerrada ? v.length : v.length - 1;
    for (let i = 0; i < n; i++) {
      const p = v[i], q = v[(i + 1) % v.length];
      if (Math.hypot(q.x - p.x, q.y - p.y) < 1e-12) continue;
      out.push({ ...tramoPolilinea(p, q, p.bulge), capa, id: `${id}#${i}`, circulo: false } as Pieza);
    }
    return out;
  }
  return [{ tipo: 'texto', capa, id, pares: e.pairs.filter(([c]) => ![5, 8, 210, 220, 230].includes(c)) }];
}

export function hornear(entidades: EntidadDxf[]): { piezas: Pieza[]; avisos: Duda[]; dudas: Duda[] } {
  const piezas: Pieza[] = [], avisos: Duda[] = [], dudas: Duda[] = [], omitidas = new Map<string, number>();
  for (const e of entidades) {
    const capa = value(e, 8), id = value(e, 5);
    if (number(e, 67) === 1) continue;
    if (OMITIR.has(e.type)) { omitidas.set(e.type, (omitidas.get(e.type) ?? 0) + 1); continue; }
    if (!['LINE', 'ARC', 'CIRCLE', 'LWPOLYLINE', 'TEXT'].includes(e.type)) {
      dudas.push({ handle: id, tipo: e.type, capa, motivo: `Hay una entidad ${e.type} en la capa ${capa || '(sin nombre)'} que no se puede preparar: conviértela a líneas, arcos o polilíneas en ZWCAD` });
      continue;
    }
    const m = e.transformacion ?? ID;
    const total = e.type !== 'LINE' && number(e, 230, 1) < 0 ? componer(m, ESPEJO_OCS) : m;
    try { piezas.push(...locales(e, capa, id).map(p => transformarPieza(p, total))); }
    catch (error) { dudas.push({ handle: id, tipo: e.type, capa, motivo: error instanceof Error ? error.message : String(error) }); }
  }
  for (const [tipo, n] of omitidas) avisos.push({ tipo, motivo: `Se han omitido ${n} ${tipo} (no se cortan)` });
  return { piezas, avisos, dudas };
}
```

- [ ] **Step 4: Comprobar la convención de `transformacion`.** Leer cómo `src/cmt/geometria.ts` aplica `e.transformacion` y confirmar que es `x' = m0·x + m2·y + m4`. Añadir una prueba con `src/cmt/__fixtures__/corpus-bloque.dxf`: tras `leerDxf` + `prepararEntidades` + `hornear`, el ancho y alto (mm) de la caja de las líneas y arcos coinciden con `resumirObjetos(dxfACmt(...).objetos)` (de `src/cmtHerramientaRoutes.js`) con tolerancia 0,1 mm. Si no coinciden, corregir `hornear` (no el conversor).
- [ ] **Step 5: Ejecutar** → PASS.
- [ ] **Step 6: Commit** `feat(cmt): descomponer el plano a líneas, arcos y textos en el mundo`.

---

### Task 3: Marco del corte en la capa 0

**Revisión 23/11 (obligatorio, con prueba por punto):**
- `clasificar`: para «cruza» o «fuera», intersección real entre segmento o arco y rectángulo, no solo cajas. Una diagonal fuera cuya caja toca una esquina del marco es «fuera».
- `cajaPieza` de `TEXT`: usar `11/21` cuando `72` o `73` ≠ 0, si no `10/20`. Para arcos, `normGrados(hasta - desde) || 360`.
- `esBorde`: además de la coordenada perpendicular, el tramo tiene que caer dentro del lado del marco.
- `toleranciaDe`: relativa al tamaño del marco candidato, no a la caja de todo el dibujo; así una entidad olvidada lejos no infla la tolerancia.

**Files:**
- Create: `src/cmt/preparacion/marco.ts`
- Test: `src/cmt/preparacion/marco.test.ts`

**Interfaces:**
- Consumes: `Pieza`, `Caja`, `normGrados` (Task 2).
- Produces:
  - `cajaPieza(p: Pieza): Caja` (texto: su punto 10/20)
  - `cajaDe(piezas: Pieza[]): Caja | null`
  - `toleranciaDe(piezas: Pieza[]): number` = `1e-6 × lado mayor + 1e-9`
  - `buscarMarcos(piezas: Pieza[]): Caja[]` — rectángulos de líneas en capa `0` que contienen al menos una pieza de otra capa
  - `clasificar(p: Pieza, marco: Caja, tol: number): 'dentro' | 'fuera' | 'cruza'`
  - `esBorde(p: Pieza, marco: Caja, tol: number): boolean` (línea de capa 0 sobre un lado del marco)

- [ ] **Step 1: Pruebas que fallan**

```ts
import { describe, expect, it } from 'vitest';
import { buscarMarcos, clasificar, cajaPieza } from './marco.ts';
import type { Pieza } from './tipos.ts';

const l = (capa: string, x1: number, y1: number, x2: number, y2: number, id = `${capa}${x1}${y1}${x2}${y2}`): Pieza => ({ tipo: 'linea', capa, id, a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });
const rect = (x0: number, y0: number, x1: number, y1: number) => [l('0', x0, y0, x1, y0), l('0', x1, y1, x1, y0), l('0', x1, y1, x0, y1), l('0', x0, y0, x0, y1)];

describe('buscarMarcos', () => {
  it('encuentra un rectángulo de cuatro líneas sueltas en capa 0 con corte dentro', () => {
    expect(buscarMarcos([...rect(0, 0, 10, 5), l('corte', 1, 1, 2, 2)])).toEqual([{ x0: 0, y0: 0, x1: 10, y1: 5 }]);
  });
  it('ignora un rectángulo vacío y uno en otra capa', () => {
    expect(buscarMarcos([...rect(0, 0, 10, 5), l('corte', 20, 20, 21, 21)])).toEqual([]);
  });
  it('devuelve dos marcos si los hay (marco viejo y nuevo)', () => {
    expect(buscarMarcos([...rect(0, 0, 10, 5), ...rect(20, 0, 30, 5), l('corte', 1, 1, 2, 2), l('corte', 21, 1, 22, 2)])).toHaveLength(2);
  });
});

describe('clasificar', () => {
  const m = { x0: 0, y0: 0, x1: 10, y1: 5 };
  it('dentro, fuera y cruza', () => {
    expect(clasificar(l('c', 1, 1, 2, 2), m, 1e-6)).toBe('dentro');
    expect(clasificar(l('c', 11, 1, 12, 2), m, 1e-6)).toBe('fuera');
    expect(clasificar(l('c', 9, 1, 12, 2), m, 1e-6)).toBe('cruza');
  });
  it('la caja de un arco incluye su punto más alto', () => {
    expect(cajaPieza({ tipo: 'arco', capa: 'c', id: 'a', c: { x: 0, y: 0 }, r: 1, desde: 0, hasta: 180, circulo: false }).y1).toBeCloseTo(1);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla.**
- [ ] **Step 3: Implementar `marco.ts`**

```ts
import { normGrados } from './hornear.ts';
import type { Caja, Pieza } from './tipos.ts';

const RAD = Math.PI / 180;
export function cajaPieza(p: Pieza): Caja {
  if (p.tipo === 'linea') return { x0: Math.min(p.a.x, p.b.x), y0: Math.min(p.a.y, p.b.y), x1: Math.max(p.a.x, p.b.x), y1: Math.max(p.a.y, p.b.y) };
  if (p.tipo === 'texto') {
    const x = Number(p.pares.find(([c]) => c === 10)?.[1] ?? 0), y = Number(p.pares.find(([c]) => c === 20)?.[1] ?? 0);
    return { x0: x, y0: y, x1: x, y1: y };
  }
  const barrido = p.circulo ? 360 : normGrados(p.hasta - p.desde);
  const angulos = [p.desde, p.desde + barrido, ...[0, 90, 180, 270, 360].filter(g => normGrados(g - p.desde) <= barrido || p.circulo)];
  const xs = angulos.map(g => p.c.x + p.r * Math.cos(g * RAD)), ys = angulos.map(g => p.c.y + p.r * Math.sin(g * RAD));
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
export function cajaDe(piezas: Pieza[]): Caja | null {
  if (!piezas.length) return null;
  return piezas.map(cajaPieza).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }));
}
export function toleranciaDe(piezas: Pieza[]): number {
  const c = cajaDe(piezas); return c ? 1e-6 * Math.max(c.x1 - c.x0, c.y1 - c.y0) + 1e-9 : 1e-9;
}
export function clasificar(p: Pieza, m: Caja, tol: number): 'dentro' | 'fuera' | 'cruza' {
  const c = cajaPieza(p);
  if (c.x0 >= m.x0 - tol && c.x1 <= m.x1 + tol && c.y0 >= m.y0 - tol && c.y1 <= m.y1 + tol) return 'dentro';
  if (c.x1 < m.x0 - tol || c.x0 > m.x1 + tol || c.y1 < m.y0 - tol || c.y0 > m.y1 + tol) return 'fuera';
  return 'cruza';
}
export function esBorde(p: Pieza, m: Caja, tol: number): boolean {
  if (p.tipo !== 'linea') return false;
  const en = (v: number, a: number) => Math.abs(v - a) <= tol;
  const horizontal = en(p.a.y, p.b.y) && (en(p.a.y, m.y0) || en(p.a.y, m.y1));
  const vertical = en(p.a.x, p.b.x) && (en(p.a.x, m.x0) || en(p.a.x, m.x1));
  return horizontal || vertical;
}
export function buscarMarcos(piezas: Pieza[]): Caja[] {
  const tol = toleranciaDe(piezas), en = (a: number, b: number) => Math.abs(a - b) <= tol;
  const ls = piezas.filter((p): p is Extract<Pieza, { tipo: 'linea' }> => p.tipo === 'linea' && p.capa === '0');
  const H = ls.filter(p => en(p.a.y, p.b.y) && !en(p.a.x, p.b.x)).map(p => ({ y: p.a.y, x0: Math.min(p.a.x, p.b.x), x1: Math.max(p.a.x, p.b.x) }));
  const V = ls.filter(p => en(p.a.x, p.b.x) && !en(p.a.y, p.b.y)).map(p => ({ x: p.a.x, y0: Math.min(p.a.y, p.b.y), y1: Math.max(p.a.y, p.b.y) }));
  const lado = (x: number, y0: number, y1: number) => V.some(v => en(v.x, x) && en(v.y0, y0) && en(v.y1, y1));
  const marcos: Caja[] = [];
  for (const a of H) for (const b of H) {
    if (b.y <= a.y + tol || !en(a.x0, b.x0) || !en(a.x1, b.x1)) continue;
    if (!lado(a.x0, a.y, b.y) || !lado(a.x1, a.y, b.y)) continue;
    const m = { x0: a.x0, y0: a.y, x1: a.x1, y1: b.y };
    if (marcos.some(o => en(o.x0, m.x0) && en(o.y0, m.y0) && en(o.x1, m.x1) && en(o.y1, m.y1))) continue;
    if (piezas.some(p => p.capa !== '0' && clasificar(p, m, tol) === 'dentro')) marcos.push(m);
  }
  return marcos;
}
```

- [ ] **Step 4: Ejecutar** → PASS.
- [ ] **Step 5: Commit** `feat(cmt): marco del corte en la capa 0`.

---

### Task 4: Unidades y capas

**Revisión 23/11 (obligatorio):**
- Pruebas añadidas para `decidirEscala`:
  - DXF con `$INSUNITS = 4` y 80 mm → ×1.
  - `$INSUNITS = 1` → error.
  - DWG de 50 unidades (50 m) → error si supera `LARGO_MAXIMO_MM`.
- `asignarCapas` busca en la tabla y en `capasDxf` por `claveCapa` (sin distinguir mayúsculas). Nunca devuelve como desconocida una capa vacía `""`, ni una de las 6 capas fijas del bot.

**Files:**
- Create: `src/cmt/preparacion/unidades.ts`, `src/cmt/preparacion/capas.ts`
- Test: `src/cmt/preparacion/unidades.test.ts`, `src/cmt/preparacion/capas.test.ts`

**Interfaces:**
- Produces:
  - `decidirEscala(origen: 'dwg' | 'dxf', insunits: number | undefined, caja: Caja): { factor: number; motivo: string } | { error: string }`
  - `CAPAS_FIJAS: Record<string, Herramienta>`, `claveCapa(capa: string): string`
  - `interface CapaDesconocida { capa: string; color: number; piezas: number }`
  - `asignarCapas(piezas: Pieza[], tabla: Record<string, Herramienta>, decisiones: Record<string, Herramienta>, capasDxf: Record<string, { color: number }>): { piezas: Pieza[]; desconocidas: CapaDesconocida[]; descartadas: number }` — las piezas conocidas salen con la capa de destino; las de capas desconocidas se devuelven con su capa original; `NO_CORTAR` se descarta.

- [ ] **Step 1: Pruebas que fallan**

```ts
// unidades.test.ts
import { describe, expect, it } from 'vitest';
import { decidirEscala } from './unidades.ts';
const caja = (w: number, h: number) => ({ x0: 0, y0: 0, x1: w, y1: h });
describe('decidirEscala', () => {
  it('DWG siempre ×1000', () => expect(decidirEscala('dwg', 4, caja(6, 2.5))).toMatchObject({ factor: 1000 }));
  it('DXF en metros declarados', () => expect(decidirEscala('dxf', 6, caja(6, 2.5))).toMatchObject({ factor: 1000 }));
  it('DXF de la web en mm', () => expect(decidirEscala('dxf', 4, caja(6000, 2500))).toMatchObject({ factor: 1 }));
  it('DXF que dice mm pero mide 6 unidades se toma en metros', () => expect(decidirEscala('dxf', 4, caja(6, 2.5))).toMatchObject({ factor: 1000 }));
  it('DWG que daría 300 m no se genera', () => expect(decidirEscala('dwg', 6, caja(300, 2))).toHaveProperty('error'));
});
```

```ts
// capas.test.ts
import { describe, expect, it } from 'vitest';
import { asignarCapas } from './capas.ts';
import type { Pieza } from './tipos.ts';
const l = (capa: string): Pieza => ({ tipo: 'linea', capa, id: capa, a: { x: 0, y: 0 }, b: { x: 1, y: 0 } });
describe('asignarCapas', () => {
  it('usa las fijas, la tabla y las decisiones; lista las desconocidas con su color', () => {
    const r = asignarCapas([l('disco1'), l('corte'), l('LINEAS'), l('cotas'), l('raro')], { CORTE: 'DISCO1', COTAS: 'NO_CORTAR' }, { LINEAS: 'ROTULADOR' }, { raro: { color: 3 } });
    expect(r.piezas.map(p => p.capa)).toEqual(['DISCO1', 'DISCO1', 'ROTULADOR', 'raro']);
    expect(r.desconocidas).toEqual([{ capa: 'raro', color: 3, piezas: 1 }]);
    expect(r.descartadas).toBe(1);
  });
  it('taladro y texto salen en minúsculas como las capas del bot', () => {
    expect(asignarCapas([l('TALADRO'), l('Texto')], {}, {}, {}).piezas.map(p => p.capa)).toEqual(['taladro', 'texto']);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que fallan.**
- [ ] **Step 3: Implementar**

```ts
// unidades.ts
import type { Caja } from './tipos.ts';
/** Lado mayor admitido tras escalar. Provisional: se fija con el estudio de la Task 0 (corte real más largo × 1,5)
 *  para que un DWG en cm o en mm escalado ×1000 no pase como si fuera un corte largo. */
export const LARGO_MAXIMO_MM = 60_000;
export function decidirEscala(origen: 'dwg' | 'dxf', insunits: number | undefined, caja: Caja): { factor: number; motivo: string } | { error: string } {
  const lado = Math.max(caja.x1 - caja.x0, caja.y1 - caja.y0);
  let factor: number, motivo: string;
  if (origen === 'dwg') { factor = 1000; motivo = 'Plano DWG en metros: se pasa a mm (×1000)'; }
  else if (insunits === 6) { factor = 1000; motivo = 'El DXF está en metros: se pasa a mm (×1000)'; }
  else if (insunits === 5) { factor = 10; motivo = 'El DXF está en centímetros: se pasa a mm (×10)'; }
  else if (insunits === 4) { factor = 1; motivo = 'El DXF está en mm'; }
  else if (insunits !== undefined && insunits !== 0) return { error: `El DXF tiene unas unidades que no se usan en la oficina (código ${insunits}): guárdalo en metros o en mm desde ZWCAD` };
  else if (lado < 100) { factor = 1000; motivo = 'Por su tamaño, el DXF está en metros: se pasa a mm (×1000)'; }
  else { factor = 1; motivo = 'El DXF ya está en mm'; }
  const mm = lado * factor;
  if (mm < 10 || mm > LARGO_MAXIMO_MM) return { error: `Con esa escala el corte mediría ${Math.round(mm).toLocaleString('es-ES')} mm: revisa las unidades del plano en ZWCAD` };
  return { factor, motivo };
}
```

```ts
// capas.ts
import type { Herramienta, Pieza } from './tipos.ts';
export const CAPAS_FIJAS: Record<string, Herramienta> = { DISCO1: 'DISCO1', DISCO2: 'DISCO2', CUTTER: 'CUTTER', ROTULADOR: 'ROTULADOR', TALADRO: 'taladro', TEXTO: 'texto' };
export const claveCapa = (capa: string) => capa.trim().toUpperCase();
export interface CapaDesconocida { capa: string; color: number; piezas: number }
export function asignarCapas(piezas: Pieza[], tabla: Record<string, Herramienta>, decisiones: Record<string, Herramienta>, capasDxf: Record<string, { color: number }>) {
  const salida: Pieza[] = [], desconocidas = new Map<string, CapaDesconocida>(); let descartadas = 0;
  for (const p of piezas) {
    const k = claveCapa(p.capa), h = CAPAS_FIJAS[k] ?? decisiones[k] ?? tabla[k];
    if (h === 'NO_CORTAR') { descartadas++; continue; }
    if (h) { salida.push({ ...p, capa: h }); continue; }
    const d = desconocidas.get(k) ?? { capa: p.capa, color: Math.abs(capasDxf[p.capa]?.color ?? 7), piezas: 0 };
    d.piezas++; desconocidas.set(k, d); salida.push(p);
  }
  return { piezas: salida, desconocidas: [...desconocidas.values()], descartadas };
}
```

- [ ] **Step 4: Ejecutar** → PASS.
- [ ] **Step 5: Commit** `feat(cmt): escala a mm y capas del corte`.

---

### Task 5: Solapes

**Revisión 23/11 (obligatorio, con prueba por punto):**
- Colinealidad simétrica: medir siempre la distancia de los extremos del tramo corto a la recta del largo. `restar(p, q)` y `restar(q, p)` tienen que detectar el mismo solape. Prueba: tramo de 10 mm desviado 0,005 mm sobre uno de 3 000 mm, en los dos órdenes.
- En `buscarSolapes`, `zonas` es la caja del tramo realmente pisado, no la de la pieza entera.
- `aplicarSolapes` lanza un error si `gana` no es ni `a` ni `b`.

**Files:**
- Create: `src/cmt/preparacion/solapes.ts`
- Test: `src/cmt/preparacion/solapes.test.ts`

**Interfaces:**
- Consumes: `Pieza`, `cajaPieza` (Task 3), `normGrados` (Task 2).
- Produces:
  - `TOL_MM = 0.01`
  - `longitud(p: Pieza): number`
  - `restar(p: Pieza, q: Pieza, tol?: number): Pieza[]` — lo que queda de `p` quitando lo que pisa `q` (textos no se tocan)
  - `quitarRepetidos(piezas: Pieza[]): { piezas: Pieza[]; mm: number }` — misma capa; se queda la primera en el orden del fichero
  - `interface GrupoSolape { clave: string; capas: [string, string]; zonas: Caja[]; mm: number }` (`clave` = las dos capas ordenadas unidas por `|`)
  - `buscarSolapes(piezas: Pieza[]): GrupoSolape[]`
  - `aplicarSolapes(piezas: Pieza[], decisiones: Record<string, string>): Pieza[]` — `decisiones[clave]` = capa que se queda; a la otra se le quita lo pisado

- [ ] **Step 1: Pruebas que fallan**

```ts
import { describe, expect, it } from 'vitest';
import { aplicarSolapes, buscarSolapes, longitud, quitarRepetidos, restar } from './solapes.ts';
import type { Pieza } from './tipos.ts';
const l = (capa: string, x1: number, y1: number, x2: number, y2: number, id = 'l'): Pieza => ({ tipo: 'linea', capa, id, a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });
const arco = (capa: string, desde: number, hasta: number, circulo = false): Pieza => ({ tipo: 'arco', capa, id: 'a', c: { x: 0, y: 0 }, r: 100, desde, hasta, circulo });
const total = (ps: Pieza[]) => ps.reduce((s, p) => s + longitud(p), 0);

describe('restar', () => {
  it('quita el tramo central de una línea y deja dos', () => {
    const r = restar(l('D', 0, 0, 100, 0), l('D', 30, 0, 60, 0));
    expect(r).toHaveLength(2); expect(total(r)).toBeCloseTo(70);
  });
  it('líneas paralelas a 0,02 mm no se tocan', () => expect(restar(l('D', 0, 0, 100, 0), l('D', 0, 0.02, 100, 0.02))).toHaveLength(1));
  it('línea idéntica en sentido contrario desaparece', () => expect(restar(l('D', 0, 0, 100, 0), l('D', 100, 0, 0, 0))).toEqual([]));
  it('arco pisado por la mitad', () => expect(total(restar(arco('D', 0, 180), arco('D', 90, 270)))).toBeCloseTo(100 * Math.PI / 2));
  it('círculo menos un arco queda en un solo arco', () => {
    const r = restar(arco('D', 0, 360, true), arco('D', 350, 10));
    expect(r).toHaveLength(1); expect(total(r)).toBeCloseTo(100 * Math.PI * 2 * 340 / 360);
  });
});

describe('quitarRepetidos', () => {
  it('quita duplicados de la misma capa y respeta las de otra', () => {
    const r = quitarRepetidos([l('D', 0, 0, 100, 0, '1'), l('D', 0, 0, 100, 0, '2'), l('R', 0, 0, 100, 0, '3')]);
    expect(r.piezas.map(p => p.id)).toEqual(['1', '3']); expect(r.mm).toBeCloseTo(100);
  });
});

describe('solapes entre capas', () => {
  it('agrupa por pareja y aplica la decisión', () => {
    const ps = [l('DISCO1', 0, 0, 100, 0, '1'), l('ROTULADOR', 50, 0, 150, 0, '2')];
    const g = buscarSolapes(ps);
    expect(g).toHaveLength(1); expect(g[0].clave).toBe('DISCO1|ROTULADOR'); expect(g[0].mm).toBeCloseTo(50);
    const r = aplicarSolapes(ps, { 'DISCO1|ROTULADOR': 'DISCO1' });
    expect(total(r.filter(p => p.capa === 'ROTULADOR'))).toBeCloseTo(50);
    expect(total(r.filter(p => p.capa === 'DISCO1'))).toBeCloseTo(100);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que fallan.**
- [ ] **Step 3: Implementar `solapes.ts`**

```ts
import { normGrados } from './hornear.ts';
import { cajaPieza } from './marco.ts';
import type { Caja, Pieza } from './tipos.ts';

export const TOL_MM = 0.01;
type Linea = Extract<Pieza, { tipo: 'linea' }>; type Arco = Extract<Pieza, { tipo: 'arco' }>;
const barrido = (a: Arco) => a.circulo ? 360 : (normGrados(a.hasta - a.desde) || 360);
export const longitud = (p: Pieza) => p.tipo === 'linea' ? Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y) : p.tipo === 'arco' ? p.r * barrido(p) * Math.PI / 180 : 0;
const cercanas = (a: Caja, b: Caja, t: number) => a.x0 <= b.x1 + t && b.x0 <= a.x1 + t && a.y0 <= b.y1 + t && b.y0 <= a.y1 + t;

function restarLineas(p: Linea, q: Linea, tol: number): Pieza[] {
  const L = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y); if (L <= tol) return [p];
  const u = { x: (p.b.x - p.a.x) / L, y: (p.b.y - p.a.y) / L };
  const dist = (r: { x: number; y: number }) => Math.abs((r.x - p.a.x) * u.y - (r.y - p.a.y) * u.x);
  if (dist(q.a) > tol || dist(q.b) > tol) return [p];
  const t = (r: { x: number; y: number }) => (r.x - p.a.x) * u.x + (r.y - p.a.y) * u.y;
  const lo = Math.max(0, Math.min(t(q.a), t(q.b))), hi = Math.min(L, Math.max(t(q.a), t(q.b)));
  if (hi - lo <= tol) return [p];
  const en = (s: number) => ({ x: p.a.x + u.x * s, y: p.a.y + u.y * s });
  const out: Pieza[] = [];
  if (lo > tol) out.push({ ...p, b: en(lo) });
  if (L - hi > tol) out.push({ ...p, a: en(hi) });
  return out;
}

function restarArcos(p: Arco, q: Arco, tol: number): Pieza[] {
  if (Math.hypot(p.c.x - q.c.x, p.c.y - q.c.y) > tol || Math.abs(p.r - q.r) > tol) return [p];
  const tg = tol / p.r * 180 / Math.PI, ps = p.circulo ? 0 : p.desde, pe = ps + barrido(p), qsw = barrido(q);
  const quitar: [number, number][] = [];
  for (const k of [-360, 0, 360]) {
    const qs = (q.circulo ? 0 : q.desde) + k, lo = Math.max(ps, qs), hi = Math.min(pe, qs + qsw);
    if (hi - lo > tg) quitar.push([lo, hi]);
  }
  if (!quitar.length) return [p];
  quitar.sort((a, b) => a[0] - b[0]);
  const quedan: [number, number][] = []; let cursor = ps;
  for (const [lo, hi] of quitar) { if (lo - cursor > tg) quedan.push([cursor, lo]); cursor = Math.max(cursor, hi); }
  if (pe - cursor > tg) quedan.push([cursor, pe]);
  if (p.circulo && quedan.length > 1 && quedan[0][0] === ps && quedan[quedan.length - 1][1] === pe) {
    const ultimo = quedan.pop()!; quedan[0] = [ultimo[0], quedan[0][1] + 360];
  }
  return quedan.map(([lo, hi]) => ({ ...p, circulo: false, desde: normGrados(lo), hasta: normGrados(hi) }));
}

export function restar(p: Pieza, q: Pieza, tol = TOL_MM): Pieza[] {
  if (p.tipo === 'linea' && q.tipo === 'linea') return restarLineas(p, q, tol);
  if (p.tipo === 'arco' && q.tipo === 'arco') return restarArcos(p, q, tol);
  return [p];
}
function restarTodas(p: Pieza, otras: Pieza[]): Pieza[] {
  let trozos = [p];
  for (const q of otras) {
    const cq = cajaPieza(q);
    trozos = trozos.flatMap(t => cercanas(cajaPieza(t), cq, TOL_MM) ? restar(t, q) : [t]);
    if (!trozos.length) break;
  }
  return trozos;
}
export function quitarRepetidos(piezas: Pieza[]): { piezas: Pieza[]; mm: number } {
  const salida: Pieza[] = [], porCapa = new Map<string, Pieza[]>(); let mm = 0;
  for (const p of piezas) {
    if (p.tipo === 'texto') { salida.push(p); continue; }
    const previas = porCapa.get(p.capa) ?? [];
    const trozos = restarTodas(p, previas);
    mm += longitud(p) - trozos.reduce((s, t) => s + longitud(t), 0);
    previas.push(...trozos); porCapa.set(p.capa, previas); salida.push(...trozos);
  }
  return { piezas: salida, mm };
}
export interface GrupoSolape { clave: string; capas: [string, string]; zonas: Caja[]; mm: number }
export function buscarSolapes(piezas: Pieza[]): GrupoSolape[] {
  const grupos = new Map<string, GrupoSolape>(), ps = piezas.filter(p => p.tipo !== 'texto'), cajas = ps.map(cajaPieza);
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    if (ps[i].capa === ps[j].capa || !cercanas(cajas[i], cajas[j], TOL_MM)) continue;
    const pisado = longitud(ps[i]) - restar(ps[i], ps[j]).reduce((s, t) => s + longitud(t), 0);
    if (pisado <= TOL_MM) continue;
    const capas = [ps[i].capa, ps[j].capa].sort() as [string, string], clave = capas.join('|');
    const g = grupos.get(clave) ?? { clave, capas, zonas: [], mm: 0 };
    g.mm += pisado; g.zonas.push(longitud(ps[i]) < longitud(ps[j]) ? cajas[i] : cajas[j]); grupos.set(clave, g);
  }
  return [...grupos.values()];
}
export function aplicarSolapes(piezas: Pieza[], decisiones: Record<string, string>): Pieza[] {
  let actual = piezas;
  for (const [clave, gana] of Object.entries(decisiones)) {
    const [a, b] = clave.split('|'), pierde = gana === a ? b : a, ganadoras = actual.filter(p => p.capa === gana);
    actual = actual.flatMap(p => p.capa === pierde ? restarTodas(p, ganadoras) : [p]);
  }
  return actual;
}
```

- [ ] **Step 4: Ejecutar** → PASS. Añadir una prueba de rendimiento: 3.000 líneas aleatorias en 6 capas, `quitarRepetidos` + `buscarSolapes` < 2 s con `--maxWorkers=6`.
- [ ] **Step 5: Commit** `feat(cmt): quitar líneas repetidas y detectar solapes entre capas`.

---

### Task 6: DXF limpio y CMT recolocado

**Revisión 23/11 (obligatorio):**
- Añadir `textosCad?: Array<{capa:string, pares:[number,string][]}>` al `@param` JSDoc de `escribirDxf2004` (`src/domain/corteLona/dxfCorte.js:16`). Sin esto, `pnpm typecheck` falla.
- `textosCad` no emite `11/21` cuando `72` y `73` son 0.

**Files:**
- Modify: `src/domain/corteLona/dxfCorte.js` (nuevo parámetro `textosCad`)
- Modify: `src/cmt/tipos.ts` (`OpcionesCmt.recolocar`), `src/cmt/index.ts`
- Create: `src/cmt/preparacion/salida.ts`
- Test: `src/cmt/preparacion/salida.test.ts`, y que sigan pasando `src/domain/corteLona/dxf.test.js` y `src/cmt/cmt.test.ts`

**Interfaces:**
- Consumes: `escribirDxf2004` (`src/domain/corteLona/dxfCorte.js`), `cajaDe` (Task 3).
- Produces:
  - `escribirDxf2004(entidades, { ..., textosCad })` con `textosCad?: Array<{ capa: string; pares: [number, string][] }>` — TEXT con sus códigos 1, 10/20, 11/21, 40, 41, 50, 51, 71, 72, 73 desplazados con `dx/dy`; estilo de la plantilla.
  - `OpcionesCmt.recolocar?: boolean` — lleva el dibujo a 300/20 mm aunque no haya leyenda.
  - `escribirDxfLimpio(piezas: Pieza[]): string` — DXF 2004 sin leyenda, esquina inferior izquierda en `ORIGEN_DXF` (por defecto `{x:0,y:0}`, se ajusta con lo que diga el informe de la Task 0).

- [ ] **Step 1: Pruebas que fallan**

```ts
import { describe, expect, it } from 'vitest';
import { dxfACmt } from '../index.ts';
import { leerDxf } from '../dxf.ts';
import { escribirDxfLimpio } from './salida.ts';
import type { Pieza } from './tipos.ts';

const piezas: Pieza[] = [
  { tipo: 'linea', capa: 'DISCO1', id: '1', a: { x: 5000, y: 3000 }, b: { x: 6000, y: 3000 } },
  { tipo: 'arco', capa: 'DISCO1', id: '2', c: { x: 6000, y: 3100 }, r: 100, desde: 270, hasta: 0, circulo: false },
  { tipo: 'arco', capa: 'ROTULADOR', id: '3', c: { x: 5500, y: 3050 }, r: 2.5, desde: 0, hasta: 360, circulo: true },
];

describe('escribirDxfLimpio', () => {
  it('escribe AC1018 en mm, sin leyenda, con el dibujo en el origen y solo capas del bot', () => {
    const texto = escribirDxfLimpio(piezas);
    expect(texto).toContain('AC1018');
    const d = leerDxf(texto);
    expect(d.entities.map(e => e.type).sort()).toEqual(['ARC', 'CIRCLE', 'LINE']);
    const xs = d.entities.filter(e => e.type === 'LINE').flatMap(e => e.pairs.filter(([c]) => c === 10 || c === 11).map(([, v]) => Number(v)));
    expect(Math.min(...xs)).toBeCloseTo(0);
  });
  it('el CMT del DXF limpio sale sin dudas y recolocado', () => {
    const r = dxfACmt(escribirDxfLimpio(piezas), { recolocar: true });
    expect(r.dudas).toEqual([]); expect(r.cmt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla.**
- [ ] **Step 3: `escribirDxf2004` con `textosCad`.** Cambiar la firma a `escribirDxf2004({ lineas, textos, circulos = [], arcos = [], textosCad = [] }, opciones)`, incluir `textosCad` en la comprobación de capas y añadir tras los arcos:

```js
  for (const t of textosCad) {
    const g = (c) => t.pares.find((p) => p[0] === c)?.[1];
    const valor = String(g(1) ?? '').replace(/[^\x20-\xff]/gu, (ch) => '\\U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
    const pt = (cx, cy) => g(cx) === undefined ? '' : ` ${cx}\n${n((Number(g(cx)) + dx) * k)}\n ${cy}\n${n((Number(g(cy)) + dy) * k)}\n ${cx + 20}\n0.0\n`;
    const opc = (c) => g(c) === undefined ? '' : `${String(c).padStart(3)}\n${g(c)}\n`;
    body += ent('TEXT', t.capa, 'AcDbText', `${pt(10, 20)} 40\n${n(Number(g(40)) * k)}\n  1\n${valor}\n${opc(50)}${opc(41)}${opc(51)}${opc(71)}${opc(72)}${pt(11, 21)}100\nAcDbText\n${opc(73)}`);
  }
```

- [ ] **Step 4: `recolocar` en `dxfACmt`.** En `src/cmt/tipos.ts` añadir a `OpcionesCmt`: `/** Lleva el dibujo a 300 y 20 mm aunque no haya leyenda (DXF limpio de la preparación). */ recolocar?: boolean;`. En `src/cmt/index.ts` cambiar `if (sinLeyenda) recolocar(g.objects);` por `if (sinLeyenda || opciones.recolocar) recolocar(g.objects);`.
- [ ] **Step 5: Implementar `salida.ts`**

```ts
import { escribirDxf2004 } from '../../domain/corteLona/dxfCorte.js';
import { cajaDe } from './marco.ts';
import type { Pieza } from './tipos.ts';

/** Esquina inferior izquierda del dibujo en el DXF limpio (revisar con el informe de la Task 0). */
export const ORIGEN_DXF = { x: 0, y: 0 };

export function escribirDxfLimpio(piezas: Pieza[]): string {
  const caja = cajaDe(piezas.filter(p => p.tipo !== 'texto')) ?? cajaDe(piezas) ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
  const lineas = [], arcos = [], circulos = [], textosCad = [];
  for (const p of piezas) {
    if (p.tipo === 'linea') lineas.push({ capa: p.capa, x1: p.a.x, y1: p.a.y, x2: p.b.x, y2: p.b.y });
    else if (p.tipo === 'arco' && p.circulo) circulos.push({ capa: p.capa, x: p.c.x, y: p.c.y, r: p.r });
    else if (p.tipo === 'arco') arcos.push({ capa: p.capa, x: p.c.x, y: p.c.y, r: p.r, desde: p.desde, hasta: p.hasta });
    else textosCad.push({ capa: p.capa, pares: p.pares });
  }
  return escribirDxf2004({ lineas, textos: [], circulos, arcos, textosCad },
    { dx: ORIGEN_DXF.x - caja.x0, dy: ORIGEN_DXF.y - caja.y0, leyenda: false });
}
```

(Tipar los arrays con los tipos JSDoc de `escribirDxf2004` para que pase `pnpm typecheck`.)

- [ ] **Step 6: Ejecutar** salida, `src/domain/corteLona/dxf.test.js`, `src/cmt/cmt.test.ts` → PASS.
- [ ] **Step 7: Commit** `feat(cmt): DXF limpio de corte y CMT recolocado sin leyenda`.

---

### Task 7: Orquestador `preparar()`

**Revisión 23/11 (obligatorio, con prueba por punto; manda sobre el código del paso 3):**
- **Orden de las dudas.** Las dudas de entidades (SPLINE, ELLIPSE, escala desigual, texto en espejo, anchura…) no cortan el proceso antes del marco. Se guarda cada duda con su caja y su capa. Solo bloquean las que quedan dentro del marco, o que cruzan y se incluyen, y cuya capa no es `NO_CORTAR`. Prueba: SPLINE en el cajetín fuera del marco → `listo`.
- **Corte vacío.** Si `finales` está vacío → duda «No queda nada que cortar dentro del marco» y `listo: false`.
- **MTEXT.** Tras `descomponerMtext`, poner a cada entidad generada la capa (`8`) y el handle (`5`) del MTEXT de origen si no los trae. Las barras de fracción salen de `rule()` en `src/cmt/textos-cad.ts:193` sin capa.
- **Cruces.** Mientras `pendientes.cruces` esté sin decidir, las piezas que cruzan se quedan en `vista` marcadas (`cruza: true`) para que el técnico las vea.
- **Varios marcos.** La escala de la vista se calcula con `decidirEscala` sobre el marco mayor, no con `origen === 'dwg' ? 1000 : 1`.
- **Medidas.** `medidasMm` se calcula después de `asignarCapas` y `aplicarSolapes`, sin las capas `NO_CORTAR`.
- **Fuente.** `leerFuente(ruta)` va en `try/catch` con el mismo mensaje de falta de Arial que `src/cmt/index.ts:71`.

**Files:**
- Create: `src/cmt/preparacion/index.ts`
- Test: `src/cmt/preparacion/preparar.test.ts`

**Interfaces:**
- Consumes: todo lo anterior; `leerDxf`, `prepararEntidades`, `quitarLeyendaWeb`, `descomponerMtext`, `leerFuente`, `conReservas`.
- Produces:

```ts
export interface DecisionesPreparacion { marco?: number; cruces?: 'incluir' | 'excluir'; capas?: Record<string, Herramienta>; solapes?: Record<string, string> }
export interface OpcionesPreparacion { origen: 'dwg' | 'dxf'; tabla: Record<string, Herramienta>; decisiones?: DecisionesPreparacion; rutaFuente?: string; sinTextos?: boolean }
export interface Pendientes { marcos?: Caja[]; cruces?: number; capas?: CapaDesconocida[]; solapes?: GrupoSolape[] }
export interface ResultadoPreparacion {
  listo: boolean; dxf: string | null; escala: number | null; medidasMm: { ancho: number; alto: number } | null;
  pendientes: Pendientes; avisos: Duda[]; dudas: Duda[];
  vista: Pieza[];               // líneas y arcos en mm (sin textos) para la vista previa
  capasNuevas: Record<string, Herramienta>; // decisiones de capa aplicadas, para guardar en la tabla
}
export function preparar(dxfTexto: string, o: OpcionesPreparacion): ResultadoPreparacion
```

Orden (cada paso que deja algo pendiente devuelve `listo:false` con la vista hasta ahí):
1. `leerDxf` → `quitarLeyendaWeb` → `prepararEntidades` → quitar TEXT/MTEXT si `sinTextos` → MTEXT con `descomponerMtext` (fuente: `o.rutaFuente ?? process.env.CMT_ARIAL_PATH ?? C:/Windows/Fonts/arial.ttf` en Windows; sin fuente → duda igual que en `src/cmt/index.ts`) → `hornear`. Dudas → fin.
2. `buscarMarcos`. Ninguno y `origen==='dwg'` → duda «No hay marco del corte: dibuja un rectángulo en la capa 0 alrededor del corte». Varios sin `decisiones.marco` válido → `pendientes.marcos` (en mm) y fin.
3. `decidirEscala(origen, $INSUNITS, marco ?? cajaDe(piezas))`; error → duda.
4. Con marco: piezas que cruzan (capa ≠ 0) sin `decisiones.cruces` → `pendientes.cruces = n`; se queda lo `dentro` (+ lo que cruza si `incluir`). Piezas de capa 0 fuera de `esBorde` → aviso «Hay N elementos en la capa 0 que no son el marco: no se cortan». Se quita toda la capa 0.
5. `transformarPiezas(·, [k,0,0,k,0,0])`.
6. `asignarCapas`; desconocidas → `pendientes.capas`. Si hay pendientes de 4 o 6, fin (no buscar solapes con capas sin asignar).
7. `quitarRepetidos` → aviso «Se han quitado X mm de líneas repetidas» si `mm > 0`. `buscarSolapes`; grupos sin decisión → `pendientes.solapes`, fin.
8. `aplicarSolapes` → `escribirDxfLimpio` → `listo: true`.

- [ ] **Step 1: Pruebas que fallan** (con `dxfPrueba` de la Task 1)

```ts
import { describe, expect, it } from 'vitest';
import { preparar } from './index.ts';
import { dxfPrueba } from './pruebaDxf.ts';

const L = (capa: string, x1: number, y1: number, x2: number, y2: number) => `0\nLINE\n8\n${capa}\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y2}`;
const marco = (x0: number, y0: number, x1: number, y1: number) => `0\nLWPOLYLINE\n8\n0\n90\n4\n70\n1\n10\n${x0}\n20\n${y0}\n10\n${x1}\n20\n${y0}\n10\n${x1}\n20\n${y1}\n10\n${x0}\n20\n${y1}`;

describe('preparar', () => {
  it('DWG con marco: coge lo de dentro, ×1000 y genera', () => {
    const r = preparar(dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), L('DISCO1', 20, 20, 21, 20)] }), { origen: 'dwg', tabla: {} });
    expect(r.listo).toBe(true); expect(r.escala).toBe(1000); expect(r.medidasMm).toEqual({ ancho: 3000, alto: 0 });
  });
  it('DWG sin marco es duda', () => {
    expect(preparar(dxfPrueba({ entidades: [L('DISCO1', 1, 1, 4, 1)] }), { origen: 'dwg', tabla: {} }).dudas[0].motivo).toMatch(/capa 0/);
  });
  it('dos marcos piden elegir y con la decisión sigue', () => {
    const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), marco(20, 0, 30, 5), L('DISCO1', 1, 1, 4, 1), L('DISCO1', 21, 1, 22, 1)] });
    expect(preparar(t, { origen: 'dwg', tabla: {} }).pendientes.marcos).toHaveLength(2);
    expect(preparar(t, { origen: 'dwg', tabla: {}, decisiones: { marco: 1 } }).medidasMm?.ancho).toBe(1000);
  });
  it('capa desconocida pendiente; con decisión se genera y se devuelve para guardar', () => {
    const t = dxfPrueba({ capas: { LINEAS: 3 }, entidades: [marco(0, 0, 10, 5), L('LINEAS', 1, 1, 4, 1)] });
    expect(preparar(t, { origen: 'dwg', tabla: {} }).pendientes.capas).toEqual([{ capa: 'LINEAS', color: 3, piezas: 1 }]);
    const r = preparar(t, { origen: 'dwg', tabla: {}, decisiones: { capas: { LINEAS: 'DISCO1' } } });
    expect(r.listo).toBe(true); expect(r.capasNuevas).toEqual({ LINEAS: 'DISCO1' });
  });
  it('solape entre capas pide decisión', () => {
    const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), L('ROTULADOR', 1, 1, 4, 1)] });
    expect(preparar(t, { origen: 'dwg', tabla: {} }).pendientes.solapes?.[0].clave).toBe('DISCO1|ROTULADOR');
    expect(preparar(t, { origen: 'dwg', tabla: {}, decisiones: { solapes: { 'DISCO1|ROTULADOR': 'DISCO1' } } }).listo).toBe(true);
  });
  it('lo que cruza el marco pide decisión', () => {
    const t = dxfPrueba({ entidades: [marco(0, 0, 10, 5), L('DISCO1', 1, 1, 4, 1), L('DISCO1', 9, 1, 12, 1)] });
    expect(preparar(t, { origen: 'dwg', tabla: {} }).pendientes.cruces).toBe(1);
    expect(preparar(t, { origen: 'dwg', tabla: {}, decisiones: { cruces: 'excluir' } }).listo).toBe(true);
  });
  it('DXF de la web en mm sin marco se trata entero (×1)', () => {
    const r = preparar(dxfPrueba({ insunits: 4, entidades: [L('DISCO1', 0, 0, 3000, 0)] }), { origen: 'dxf', tabla: {} });
    expect(r.listo).toBe(true); expect(r.escala).toBe(1);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla.**
- [ ] **Step 3: Implementar `index.ts`**

```ts
import { leerDxf, number, value } from '../dxf.ts';
import { prepararEntidades } from '../entidades.ts';
import { leerFuente } from '../fuente.ts';
import { quitarLeyendaWeb } from '../leyenda.ts';
import { conReservas } from '../reservas.ts';
import { descomponerMtext } from '../textos-cad.ts';
import type { Duda, EntidadDxf } from '../tipos.ts';
import { asignarCapas, claveCapa, type CapaDesconocida } from './capas.ts';
import { hornear, transformarPiezas } from './hornear.ts';
import { buscarMarcos, cajaDe, clasificar, esBorde, toleranciaDe } from './marco.ts';
import { escribirDxfLimpio } from './salida.ts';
import { aplicarSolapes, buscarSolapes, quitarRepetidos, type GrupoSolape } from './solapes.ts';
import type { Caja, Herramienta, Pieza } from './tipos.ts';
import { decidirEscala } from './unidades.ts';

// (interfaces DecisionesPreparacion, OpcionesPreparacion, Pendientes, ResultadoPreparacion de arriba)

const r2 = (v: number) => Math.round(v * 100) / 100;
const escalarCaja = (c: Caja, k: number): Caja => ({ x0: c.x0 * k, y0: c.y0 * k, x1: c.x1 * k, y1: c.y1 * k });

function insunits(d: ReturnType<typeof leerDxf>): number | undefined {
  const cab = d.sections.HEADER?.[0]?.pairs ?? [];
  const i = cab.findIndex(([c, v]) => c === 9 && v === '$INSUNITS');
  return i >= 0 && cab[i + 1]?.[0] === 70 ? Number(cab[i + 1][1]) : undefined;
}

export function preparar(dxfTexto: string, o: OpcionesPreparacion): ResultadoPreparacion {
  const dec = o.decisiones ?? {}, avisos: Duda[] = [], dudas: Duda[] = [], pendientes: Pendientes = {};
  const fin = (extra: Partial<ResultadoPreparacion>): ResultadoPreparacion =>
    ({ listo: false, dxf: null, escala: null, medidasMm: null, pendientes, avisos, dudas, vista: [], capasNuevas: {}, ...extra });
  try {
    // 1. Leer, quitar leyenda de la web, descomponer bloques, MTEXT a TEXT, hornear.
    const d = leerDxf(dxfTexto);
    const ley = quitarLeyendaWeb(d); d.entities = ley.entidades;
    if (ley.quitada) avisos.push({ motivo: 'Se ha quitado la leyenda del bot o de oficina' });
    prepararEntidades(d, avisos);
    let ents: EntidadDxf[] = o.sinTextos ? d.entities.filter(e => !['TEXT', 'MTEXT'].includes(e.type)) : d.entities;
    if (ents.some(e => e.type === 'MTEXT')) {
      const ruta = o.rutaFuente ?? process.env.CMT_ARIAL_PATH ?? (process.platform === 'win32' ? 'C:/Windows/Fonts/arial.ttf' : undefined);
      if (!ruta) { dudas.push({ motivo: 'Falta la fuente Arial en el equipo que convierte: avisa al responsable o elige «sin textos»' }); return fin({}); }
      const fuente = conReservas(leerFuente(ruta), {}, avisos);
      ents = ents.flatMap(e => e.type !== 'MTEXT' ? [e]
        : descomponerMtext(e, d, fuente, avisos).map(t => ({ ...t, transformacion: t.transformacion ?? e.transformacion })));
    }
    const h = hornear(ents); avisos.push(...h.avisos); dudas.push(...h.dudas);
    if (dudas.length) return fin({});
    let piezas = h.piezas;

    // 2. Marco.
    const marcos = buscarMarcos(piezas);
    let marco: Caja | null = null;
    if (marcos.length === 1) marco = marcos[0];
    else if (marcos.length > 1) {
      if (dec.marco === undefined || !marcos[dec.marco]) {
        const k = o.origen === 'dwg' ? 1000 : 1;
        pendientes.marcos = marcos.map(m => escalarCaja(m, k));
        return fin({ vista: transformarPiezas(piezas.filter(p => p.tipo !== 'texto'), [k, 0, 0, k, 0, 0]) });
      }
      marco = marcos[dec.marco];
    } else if (o.origen === 'dwg') {
      dudas.push({ motivo: 'No hay marco del corte: dibuja un rectángulo en la capa 0 alrededor del corte' });
      return fin({});
    }

    // 3. Escala.
    const esc = decidirEscala(o.origen, insunits(d), marco ?? cajaDe(piezas.filter(p => p.capa !== '0')) ?? { x0: 0, y0: 0, x1: 0, y1: 0 });
    if ('error' in esc) { dudas.push({ motivo: esc.error }); return fin({}); }
    avisos.push({ motivo: esc.motivo });
    const k = esc.factor;

    // 4. Recorte por marco y capa 0.
    if (marco) {
      const tol = toleranciaDe(piezas);
      const cruzan = piezas.filter(p => p.capa !== '0' && clasificar(p, marco!, tol) === 'cruza');
      if (cruzan.length && !dec.cruces) pendientes.cruces = cruzan.length;
      const ceroSuelto = piezas.filter(p => p.capa === '0' && clasificar(p, marco!, tol) !== 'fuera' && !esBorde(p, marco!, tol)).length;
      if (ceroSuelto) avisos.push({ motivo: `Hay ${ceroSuelto} elementos en la capa 0 que no son el marco: no se cortan` });
      piezas = piezas.filter(p => {
        if (p.capa === '0') return false;
        const c = clasificar(p, marco!, tol);
        return c === 'dentro' || (c === 'cruza' && dec.cruces === 'incluir');
      });
    } else {
      const cero = piezas.filter(p => p.capa === '0').length;
      if (cero) avisos.push({ motivo: `Hay ${cero} elementos en la capa 0: no se cortan` });
      piezas = piezas.filter(p => p.capa !== '0');
    }

    // 5. A mm.
    piezas = transformarPiezas(piezas, [k, 0, 0, k, 0, 0]);
    const vistaDe = (ps: Pieza[]) => ps.filter(p => p.tipo !== 'texto');
    const caja = cajaDe(vistaDe(piezas));
    const medidasMm = caja ? { ancho: r2(caja.x1 - caja.x0), alto: r2(caja.y1 - caja.y0) } : null;
    const base = { escala: k, medidasMm };

    // 6. Capas.
    const capasPlano = new Set(piezas.map(p => claveCapa(p.capa)));
    const capasNuevas = Object.fromEntries(Object.entries(dec.capas ?? {}).map(([c, v]) => [claveCapa(c), v]).filter(([c]) => capasPlano.has(c))) as Record<string, Herramienta>;
    const a = asignarCapas(piezas, o.tabla, capasNuevas, d.layers);
    if (a.descartadas) avisos.push({ motivo: `Se han quitado ${a.descartadas} elementos de capas que no se cortan` });
    if (a.desconocidas.length) pendientes.capas = a.desconocidas;
    if (pendientes.cruces || pendientes.capas) return fin({ ...base, vista: vistaDe(a.piezas) });

    // 7. Solapes.
    const rep = quitarRepetidos(a.piezas);
    if (rep.mm > 0) avisos.push({ motivo: `Se han quitado ${Math.round(rep.mm).toLocaleString('es-ES')} mm de líneas repetidas` });
    const grupos = buscarSolapes(rep.piezas), sinDecidir = grupos.filter(g => !g.capas.includes(dec.solapes?.[g.clave] ?? ''));
    if (sinDecidir.length) { pendientes.solapes = sinDecidir; return fin({ ...base, vista: vistaDe(rep.piezas) }); }

    // 8. Salida.
    const finales = aplicarSolapes(rep.piezas, dec.solapes ?? {});
    return { listo: true, dxf: escribirDxfLimpio(finales), ...base, pendientes, avisos, dudas, vista: vistaDe(finales), capasNuevas };
  } catch (error) {
    dudas.push({ motivo: `No se pudo preparar el plano: ${error instanceof Error ? error.message : String(error)}` });
    return fin({});
  }
}
```

Comprobar al implementar: que `conReservas(fuente, {}, avisos)` acepta un objeto de opciones vacío (ver `src/cmt/reservas.ts`) y que `descomponerMtext` devuelve entidades TEXT (si conserva `transformacion`, la línea del `map` no cambia nada). `number` y `value` se importan por si `insunits` necesita leer de otra forma; quitar lo que no se use para que pase `pnpm lint`.
- [ ] **Step 4: Prueba real.** Añadir una prueba con `src/cmt/__fixtures__/AR2605081.dxf` (DXF de la web con leyenda): `origen:'dxf'` → `listo`, escala 1, la leyenda quitada, y el CMT de `dxfACmt(r.dxf, {recolocar:true})` tiene las mismas herramientas y nº de trazos (±2 %) que el de `dxfACmt(original, {sinLeyenda:true})`.
- [ ] **Step 5: Ejecutar** → PASS.
- [ ] **Step 6: Commit** `feat(cmt): preparar el plano para el corte con decisiones pendientes`.

---

### Task 8: Tabla de capas y rutas del servidor

**Revisión 23/11 (obligatorio):**
- **`/api/cmt/enviar`.** Pasar `recolocar` a `convertir` solo si llega `true` (`...(recolocar ? { recolocar: true } : {})`). La prueba de `src/cmtMaquinaRoutes.test.js:45` espera exactamente `{ sinLeyenda: true, sinTextos: true }`.
- **JSON en `src/server.js`.** Importarlo con `import inicial from './cmt/preparacion/capasIniciales.json' with { type: 'json' };`, como ya hace `src/cmt/index.ts`.
- **Validación de `/api/cmt/preparar`:**
  - `nombre` saneado con `nombreBaseDxf` y con longitud acotada.
  - `decisiones` tiene que ser un objeto: ni `null` ni array → 400.
  - Manejador de errores de 4 argumentos: 413 si el cuerpo es demasiado grande, 400 si el JSON está roto, siempre en JSON.
- **Respuesta.** Con `listo: false` no van ficheros. Con `listo` van `nombreDxf` y `nombreCmt`, ya con su extensión.
- **`cmtTablaCapas`:**
  - No guarda claves vacías ni las 6 capas fijas del bot.
  - Crea la carpeta con `fs.mkdir(..., { recursive: true })`.
  - Pone en cola las escrituras para que dos guardados a la vez no se pisen. Prueba con dos `guardar` simultáneos.

**Files:**
- Create: `src/cmtTablaCapas.js`
- Modify: `src/cmtHerramientaRoutes.js`, `src/cmtMaquinaRoutes.js`, `src/server.js`
- Test: `src/cmtTablaCapas.test.js`, `src/cmtHerramientaRoutes.test.js`, `src/cmtMaquinaRoutes.test.js`

**Interfaces:**
- Produces:
  - `crearTablaCapas({ archivo, inicial }) → { leer(): Promise<Record<string,string>>, guardar(nuevas: Record<string,string>): Promise<Record<string,string>>, reemplazar(tabla): Promise<Record<string,string>> }` — claves en mayúsculas, valores en `HERRAMIENTAS`, escritura con `writeFileAtomic` de `src/workflow.js`; si el fichero no existe se usa `inicial` (`capasIniciales.json`).
  - `POST /api/cmt/preparar` cuerpo `{ nombre: '*.dxf'|'*.dwg', archivoBase64, decisiones?, sinTextos? }` → `{ listo, nombre, escala, medidasMm, pendientes, avisos: string[], dudas: string[], vista, dxfBase64?, cmtBase64?, resumen? }`.
  - `GET /api/cmt/capas` → `{ tabla }`; `PUT /api/cmt/capas` `{ tabla }` → `{ tabla }`.
  - `/api/cmt/enviar` admite `recolocar?: boolean` y lo pasa a `dxfACmt`.

- [ ] **Step 1: Pruebas de `crearTablaCapas`** (carpeta temporal con `fs.mkdtemp`): sin fichero devuelve `inicial`; `guardar({ lineas: 'DISCO1' })` persiste `LINEAS`; valor no válido → error; `reemplazar` sustituye todo.
- [ ] **Step 2: Implementar `src/cmtTablaCapas.js`.**

```js
import fs from 'node:fs/promises';
import { writeFileAtomic } from './workflow.js';
const VALIDAS = ['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'taladro', 'texto', 'NO_CORTAR'];
const limpiar = (t) => Object.fromEntries(Object.entries(t ?? {}).map(([k, v]) => {
  if (!VALIDAS.includes(v)) throw new Error(`Herramienta no válida para la capa ${k}.`);
  return [k.trim().toUpperCase(), v];
}));
export function crearTablaCapas({ archivo, inicial = {} }) {
  async function leer() {
    try { return limpiar(JSON.parse(await fs.readFile(archivo, 'utf8'))); }
    catch (error) { if (error.code === 'ENOENT') return limpiar(inicial); throw error; }
  }
  async function reemplazar(tabla) { const t = limpiar(tabla); await writeFileAtomic(archivo, JSON.stringify(t, null, 2)); return t; }
  async function guardar(nuevas) { return reemplazar({ ...(await leer()), ...limpiar(nuevas) }); }
  return { leer, guardar, reemplazar };
}
```

- [ ] **Step 3: Pruebas de la ruta `/api/cmt/preparar`** en `src/cmtHerramientaRoutes.test.js` con `oda` y `tablaCapas` falsos: `.txt` → 400; `.dwg` llama a `oda.convertir(buf, { desde: 'dwg', hasta: 'dxf' })`; con ODA no configurado (`disponible:false`) → 409 «Para abrir DWG hace falta ODA en el servidor: avisa a informática o sube un DXF»; resultado con pendientes → `listo:false` sin `cmtBase64`; resultado listo → `dxfBase64` + `cmtBase64` y `tablaCapas.guardar` llamado con `capasNuevas`.
- [ ] **Step 4: Implementar la ruta.** En `registrarRutasCmtHerramienta(app, { convertir = dxfACmt, preparar = prepararPlano, oda, tablaCapas } = {})` añadir, con el mismo control de tamaño (30 MB) y base64 que `/api/cmt/convertir`:

```js
  app.post('/api/cmt/preparar', express.json({ limit: '41mb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { nombre, archivoBase64, decisiones = {}, sinTextos = false } = req.body ?? {};
    const tipo = /\.dwg$/i.test(nombre ?? '') ? 'dwg' : /\.dxf$/i.test(nombre ?? '') ? 'dxf' : null;
    if (!tipo || typeof archivoBase64 !== 'string' || !archivoBase64 || typeof sinTextos !== 'boolean' || typeof decisiones !== 'object')
      return res.status(400).json({ ok: false, error: 'Elige un fichero .dwg o .dxf.' });
    // …mismas comprobaciones de tamaño y base64 que /api/cmt/convertir…
    let contenido = Buffer.from(archivoBase64, 'base64');
    if (tipo === 'dwg') {
      if (!oda?.disponible) return res.status(409).json({ ok: false, error: 'Para abrir DWG hace falta ODA en el servidor: avisa a informática o sube un DXF.' });
      contenido = await oda.convertir(contenido, { desde: 'dwg', hasta: 'dxf' });
    }
    const r = preparar(textoDxf(contenido), { origen: tipo, tabla: await tablaCapas.leer(), decisiones, sinTextos });
    const base = nombre.replace(/\.(dwg|dxf)$/i, '');
    const salida = { ok: true, listo: r.listo, nombre: base, escala: r.escala, medidasMm: r.medidasMm, pendientes: r.pendientes,
      avisos: avisosLegibles(r.avisos), dudas: [...new Set(r.dudas.map(lineaDuda))], vista: r.vista };
    if (!r.listo || salida.dudas.length) return res.json({ ...salida, listo: false });
    const c = await convertir(r.dxf, { recolocar: true, sinTextos });
    const dudasCmt = [...new Set(c.dudas.map(lineaDuda))];
    if (dudasCmt.length || !c.cmt) return res.json({ ...salida, listo: false, dudas: dudasCmt });
    if (Object.keys(r.capasNuevas).length) await tablaCapas.guardar(r.capasNuevas);
    return res.json({ ...salida, dxfBase64: Buffer.from(r.dxf, 'latin1').toString('base64'), cmtBase64: c.cmt.toString('base64'),
      resumen: resumirObjetos(c.objetos), avisos: [...salida.avisos, ...avisosLegibles(c.avisos)] });
  });
  app.get('/api/cmt/capas', async (_req, res) => res.json({ tabla: await tablaCapas.leer() }));
  app.put('/api/cmt/capas', express.json(), async (req, res) => {
    try { res.json({ tabla: await tablaCapas.reemplazar(req.body?.tabla) }); }
    catch (error) { res.status(400).json({ error: error.message }); }
  });
```

Envolver el cuerpo en `try/catch` → 422 «No se pudo preparar el plano: …», como `/api/cmt/convertir`. Comprobar la codificación del DXF limpio: la plantilla es ANSI_1252, así que se codifica en `latin1`.
- [ ] **Step 5: `/api/cmt/enviar`.** Aceptar `recolocar` booleano opcional (400 si no es booleano) y pasarlo en las opciones de `convertir` dentro de `prepararMaquina`. Prueba en `src/cmtMaquinaRoutes.test.js`.
- [ ] **Step 6: `server.js`.** Crear `tablaCapas = crearTablaCapas({ archivo: path.join(path.dirname(config.workflowSettingsFile), 'capas-corte.json'), inicial })` con `inicial` importado de `src/cmt/preparacion/capasIniciales.json`, y pasar `{ oda, tablaCapas }` a `registrarRutasCmtHerramienta`.
- [ ] **Step 7: Ejecutar** las pruebas acotadas → PASS.
- [ ] **Step 8: Commit** `feat(cmt): ruta para preparar DWG/DXF y tabla de capas`.

---

### Task 9: Página «DXF a CMT» con vista previa y decisiones

**Revisión 23/11 (obligatorio; manda sobre el paso 1 y sobre «Comportamiento»):**
- **Pruebas.** El repo no tiene Testing Library ni jsdom, y no hay que instalarlos.
  - Las pruebas de componentes usan `renderToStaticMarkup` de `react-dom/server`, como `src/client/components/CorteMaquina.test.tsx`.
  - Las transiciones de estado se prueban como funciones puras: `completas`, aplicar una decisión, decisiones pendientes.
  - La interacción real se comprueba en el navegador en el paso 5.
- **`BotonMandarMaquina`.** `cuerpo` es una función: `cuerpo={async () => ({ nombre: nombreDxf, dxfBase64, sinTextos, recolocar: true })}`.
- **Vista previa.** Los círculos completos se pintan con `<circle>`. El `large-arc-flag` se calcula con `((hasta - desde + 360) % 360) > 180`. No copiar el cálculo de `CorteLona.tsx:186`.
- **Descargas.**
  - `descarga.ts` comprueba `listo` y usa `nombreDxf` y `nombreCmt`.
  - «Descargar todos» baja el DXF y el CMT de cada plano que esté `listo` y se salta los que tienen algo pendiente, diciéndolo.

**Files:**
- Modify: `src/client/cmt/conversion.ts`, `src/client/views/CmtView.tsx`, `src/client/cmt/cmt.css`, `src/client/cmt/descarga.ts`
- Create: `src/client/cmt/VistaPreparacion.tsx`, `src/client/cmt/Pendientes.tsx`
- Test: `src/client/cmt/conversion.test.ts`, `src/client/cmt/Pendientes.test.tsx`

**Interfaces:**
- Consumes: respuesta de `POST /api/cmt/preparar` (Task 8).
- Produces: `prepararArchivo(archivo: File, decisiones: Decisiones, sinTextos?: boolean, pedir?): Promise<ResultadoPreparacion>`; `<VistaPreparacion vista marcos zonas />`; `<Pendientes pendientes valor onCambio />`; `completas(pendientes, decisiones): boolean`.

Comportamiento:
- La zona de arrastre acepta `.dxf` y `.dwg` («Arrastra aquí uno o varios DWG o DXF»).
- Al subir, se llama a `prepararArchivo` sin decisiones. Cada fila enseña la vista previa (SVG, colores de capa: DISCO1 azul, DISCO2 cian, CUTTER verde, ROTULADOR rojo, taladro magenta y desconocidas en gris), la escala («Plano en metros: ×1000») y las medidas en mm.
- Si hay pendientes, panel «Antes de generar»:
  - **Marcos:** botones de opción «Marco 1 (6.000 × 2.500 mm)»…, resaltando el elegido en la vista.
  - **Cruces:** «N elementos cruzan el borde del marco» → «Incluirlos» / «Dejarlos fuera».
  - **Capas nuevas:** por capa, su muestra de color, «N elementos» y un desplegable (Disco 1, Disco 2, Cutter, Rotulador, Taladro, Texto, No cortar). Nota: «Se recordará para la próxima vez».
  - **Solapes:** por grupo, «DISCO1 y ROTULADOR se pisan en X mm» → «Se queda DISCO1» / «Se queda ROTULADOR». Las zonas se marcan en la vista.
  - Botón **«Aplicar y generar»**, desactivado mientras `completas()` sea falso. Vuelve a llamar con las decisiones acumuladas; si salen pendientes nuevos (por ejemplo, solapes tras asignar capas), se muestran igual.
- Con `listo`: resumen actual (herramientas, trazos), **Descargar DXF**, **Descargar CMT** y `BotonMandarMaquina` con `cuerpo = { nombre: base + '.dxf', dxfBase64: resultado.dxfBase64, sinTextos, recolocar: true }`.
- El texto de introducción pasa a: «Sube un DWG o un DXF. En los DWG se corta lo que hay dentro del rectángulo de la capa 0. Antes de generar verás el corte y lo que haya que decidir.»
- Mantener «Convertir sin textos» cuando las dudas sean de textos.

- [ ] **Step 1: Pruebas que fallan.** `conversion.test.ts`: `prepararArchivo` rechaza `.pdf`, manda `{nombre, archivoBase64, decisiones, sinTextos}` a `/api/cmt/preparar`; `completas()` es falso con una capa sin elegir y verdadero cuando todo está elegido. `Pendientes.test.tsx` (Testing Library, como `src/client/components/CorteMaquina.test.tsx`): elegir «Disco 1» en el desplegable de `LINEAS` llama a `onCambio` con `{ capas: { LINEAS: 'DISCO1' } }`, y el botón «Aplicar y generar» está desactivado hasta elegir todo.
- [ ] **Step 2: Ejecutar y ver que fallan.**
- [ ] **Step 3: Implementar** `conversion.ts` (tipos y `prepararArchivo`, reutilizando `archivoBase64`; límite de 30 MB), `VistaPreparacion.tsx` (SVG como `corte-dibujo` de `src/client/components/CorteLona.tsx`: `viewBox` con Y invertida, `vectorEffect="non-scaling-stroke"`; arcos con `path` `A`), `Pendientes.tsx`, `descarga.ts` (`descargarDxf` análogo a `descargarCmt`) y `CmtView.tsx`.
- [ ] **Step 4: Ejecutar** las pruebas de cliente, `pnpm typecheck` y `pnpm lint` → PASS.
- [ ] **Step 5: Comprobación en el navegador** con la skill `running-toldos-testar`: subir un DXF de la web (`src/cmt/__fixtures__/AR2605081.dxf`) y un DWG de prueba de `tmp/dxf-auto-estudio/dwg/`; captura de la vista previa con pendientes y después con «listo». Escritorio, 1280×720 o más.
- [ ] **Step 6: Commit** `feat(cmt): la página prepara DWG y DXF con vista previa y decisiones`.

---

### Task 10: Tabla de capas en Configuración

**Revisión 23/11:** sin Testing Library ni jsdom. Pruebas con `renderToStaticMarkup` y con la lógica de edición extraída a funciones puras.

**Files:**
- Create: `src/client/components/TablaCapasCorte.tsx`
- Modify: `src/client/views/SettingsView.tsx`
- Test: `src/client/components/TablaCapasCorte.test.tsx`

- [ ] **Step 1: Prueba que falla:** carga `GET /api/cmt/capas`, enseña filas «Capa → Herramienta» ordenadas, permite cambiar la herramienta, borrar una fila y añadir una nueva (nombre + desplegable), y «Guardar» hace `PUT /api/cmt/capas` con la tabla completa.
- [ ] **Step 2: Implementar** el componente con el estilo de los paneles de Configuración (CoordinaOT) e incluirlo en `SettingsView.tsx` como sección «Capas del corte». Las seis capas fijas no aparecen (no se pueden cambiar).
- [ ] **Step 3: Ejecutar** las pruebas, `pnpm typecheck` y `pnpm lint` → PASS.
- [ ] **Step 4: Commit** `feat(cmt): editar la tabla de capas del corte en Configuración`.

---

### Task 11: Verificación con planos reales y entrega

- [ ] **Step 1:** Con 10 DWG del estudio (toldos, remolques, puertas), pasar por `preparar` (script en `tmp/dxf-auto-estudio/verificar.mjs`) y comparar el CMT resultante con el CMT del robot del mismo pedido (`tmp/cmt-estudio/comparar-forma.mjs` y `cruce-herramientas.mjs`): mismas herramientas y forma ±0,1 mm, salvo diferencias explicadas (líneas repetidas quitadas).
- [ ] **Step 2:** Abrir 2 CMT en Cutmatic de este PC (`tmp/cmt-estudio/abrir-en-cutmatic.ps1`) y 2 DXF limpios en ZWCAD (copias en `tmp`).
- [ ] **Step 3:** Pruebas acotadas, `pnpm typecheck`, `pnpm lint`; `git status` limpio salvo lo de `tmp/`.
- [ ] **Step 4:** Informe a Iván: qué se probó, diferencias, y pasos para el .90: ODA comprobado en el .90. `comprobarOda` solo se usa en `pnpm deploy:check` y solo prueba dxf → dwg, así que además hay que convertir allí un DWG real a DXF. También hay que revisar la variable `ODA_FILE_CONVERTER`. Configuración no enseña el estado de ODA. Merge, push y despliegue solo con su permiso; dar los comandos de despliegue en una línea con `&&`.
- [ ] **Step 5:** Corte de prueba real en la máquina (lo decide Iván), en `maqcorte\2026\CMT PRUEBA\`.
