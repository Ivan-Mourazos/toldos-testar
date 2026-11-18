# Puerta enrollable TGM con simulador de enrolle · Plan de trabajo

> **Para agentes:** sub-skill obligatoria: superpowers:subagent-driven-development (recomendada) o
> superpowers:executing-plans. Los pasos usan casillas (`- [ ]`).

**Objetivo:** añadir «Puertas → TGM → Enrollable» a Planteamientos, con la cadena de tubos colocada por un simulador de
enrolle que evita que los tubos se monten en el tubo de enrolle, y con corte y plano automáticos.

**Arquitectura:** la geometría de las simulaciones de Codex pasa a TypeScript puro (`src/puertas/enrolle/`), sin
pantalla. Un colocador reparte los tubos en tramos iguales y los mueve dentro de un desvío máximo para separarlos lo
más posible. El cálculo TGM construye una enrollable de Portanova ciega con esa cadena de tubos y la calcula con el
código que ya existe. La pantalla añade el formulario TGM y el simulador en canvas.

**Tecnología:** TypeScript, Express 5, React 19, vitest, Playwright, pnpm.

**Diseño:** `docs/superpowers/specs/2026-11-18-puertas-tgm-enrolle-design.md`.

## Normas generales (valen para todas las tareas)

- Trabajo en el worktree `..\toldos-testar-codex`, rama `codex-trabajo`. `git add ruta/fichero`, nunca `git add -A`,
  `stash`, `reset` ni `checkout` de ficheros ajenos. Mantener los finales de línea. Commits en castellano con el porqué.
- No subir a `main` ni desplegar: lo hace Iván o el coordinador al final.
- Pruebas primero (TDD). Pruebas rápidas: `pnpm exec vitest run --maxWorkers=6 <ficheros>`.
- Antes de dar una tarea por terminada: `pnpm test && pnpm typecheck && pnpm lint`; si toca el cliente, además
  `pnpm exec vite build`.
- No tocar la paridad de remolques (`src/remolques/paridad-produccion.test.ts`,
  `src/client/remolques/resultados-paridad.test.tsx`) ni sus fixtures.
- Nunca arrancar la web con el `.env` real: solo `bash .claude/skills/running-toldos-testar/start-isolated.sh`
  (si 4310 está ocupado: `PORT=4312 FAKE_COORDINA_PORT=4322 …`), y comprobar en `/api/health` `simulationMode: true`
  y `fileWritesEnabled: false`. Nada se escribe fuera de `tmp/` del repo.
- Unidades: la puerta en **cm** (como el resto de Puertas); la geometría del enrolle en **mm**; la pantalla de
  Puertas en **mm** (usa `src/client/puertas/medidasPuertas.ts`). Decimales con coma (`toLocaleString('es-ES')`).
- Textos y comentarios en castellano llano. Diseño de CoordinaOT (`src/client/coordina/tokens.css`, `piezas.css`), en
  claro y oscuro. Solo escritorio (1280×720 a 1920).
- Lo que no está decidido por Iván va a `docs/modelos/dudas-abiertas.md` y se programa con el valor provisional
  indicado, con un comentario `// Provisional (Q-TGM0x)`. No inventar más reglas que las de este plan.
- Portanova, Araujo, Santa Pau, System Dock y saco confeccionado deben dar exactamente lo mismo que antes.

## Ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/puertas/enrolle/geometria.ts` (nuevo) | Modelo del rollo: tubo de enrolle, perfil fleco, tubos; separación entre tubos durante todo el enrollado; diámetro final; ángulos al perfil |
| `src/puertas/enrolle/geometria.test.ts` (nuevo) | Contraste con los HTML de Codex y perfil fleco |
| `src/puertas/enrolle/colocar.ts` (nuevo) | Reparto igual, corrección dentro del desvío, avisos |
| `src/puertas/enrolle/colocar.test.ts` (nuevo) | Corrección, saco, número de tubos, avisos |
| `src/puertas/clientes/tgm.json` (nuevo) | Ficha TGM y valores por defecto del enrolle |
| `src/puertas/clientes.ts` | Acepta `calculo: "tgm"` y el bloque `enrolle` |
| `src/puertas/tipos.ts` | Bloque `tgm` de la puerta; `enrollable.sinSaco` y `enrollable.anchoEt` |
| `src/puertas/nuevaPuertaCliente.ts`, `src/puertas/pedido.ts`, `src/puertas/rps.ts` | Crear, guardar y leer de RPS la puerta TGM |
| `src/puertas/calcular.ts` | Enrollable sin saco y E.T. de ancho variable; reparto al cálculo TGM |
| `src/puertas/tgm.ts` (nuevo) | Cálculo TGM: puerta derivada + colocador + cálculo de Portanova |
| `src/puertas/tgm.test.ts` (nuevo) | Puerta TGM completa: piezas, corte y plano |
| `src/client/puertas/ConfigurarTgm.tsx` (nuevo) | Formulario de la puerta TGM |
| `src/client/puertas/SimuladorEnrolle.tsx` (nuevo) | Dibujo del rollo en canvas, barra, reproducir, datos |
| `src/client/puertas/PuertasView.tsx` | Muestra `ConfigurarTgm` si la puerta es TGM |
| `docs/modelos/dudas-abiertas.md` | Dudas Q-TGM01..05 |

---

### Tarea 1: geometría del enrolle (contraste con Codex)

**Ficheros:**
- Crear: `src/puertas/enrolle/geometria.ts`
- Prueba: `src/puertas/enrolle/geometria.test.ts`

**Interfaces que produce:**
```ts
export interface ConfigEnrolle {
  diametroEnrolle: number; // mm, 88,9
  diametroTubo: number;    // mm, 42
  grosor: number;          // mm, 0,8
  altoPerfil: number;      // mm, 0 = sin perfil (tarea 2)
  anchoPerfil: number;     // mm
}
export const CONFIG_CODEX: ConfigEnrolle;
export interface Punto { x: number; y: number }
export interface TuboColocado extends Punto { marca: number; angulo: number } // angulo: rad del punto de apoyo
export interface ModeloEnrolle { cfg: ConfigEnrolle; largo: number; marcas: number[]; tubos: TuboColocado[]; camino: Tramo[] }
export interface Pareja { i: number; j: number; separacion: number; donde: number } // mm; donde = mm enrollados
export function construir(cfg: ConfigEnrolle, marcas: number[], largo?: number): ModeloEnrolle; // largo por defecto = última marca
export function centros(m: ModeloEnrolle, avance: number): Punto[];
export function separacionFinal(m: ModeloEnrolle): Pareja;      // rollo terminado, la pareja más justa
export function revisarCiclo(m: ModeloEnrolle): Pareja[];       // todas las parejas, de menor a mayor separación
export function diametroFinal(m: ModeloEnrolle): number;        // mm
```
Las marcas son mm de lona desde el perfil fleco hasta el eje de cada tubo, en orden creciente. `largo` es la lona
que se enrolla; con saco es mayor que la última marca.

- [ ] **Paso 1: prueba que falla**

```ts
// src/puertas/enrolle/geometria.test.ts
import { describe, expect, it } from 'vitest';
import { CONFIG_CODEX, construir, revisarCiclo, separacionFinal, diametroFinal } from './geometria.ts';

// Valores de las simulaciones HTML de Codex (18/11/2026), tubo de enrolle Ø88,9, tubos Ø42, lona 0,8.
describe('geometría del enrolle: contraste con Codex', () => {
  it('4200 con [1470, 2714, 4200]: lo más justo, T1–T2 a 79,5 mm', () => {
    const p = revisarCiclo(construir(CONFIG_CODEX, [1470, 2714, 4200]));
    expect(p[0]).toMatchObject({ i: 0, j: 1 });
    expect(p[0].separacion).toBeCloseTo(79.513, 1);
    expect(p[0].donde).toBeCloseTo(2601.2, 0);
    const resto = Object.fromEntries(p.map(x => [`${x.i}${x.j}`, x.separacion]));
    expect(resto['12']).toBeCloseTo(83.945, 1);
    expect(resto['02']).toBeCloseTo(84.203, 1);
  });
  it('3660 con [1138, 2471, 3660]: lo más justo, T1–T3 a 80 mm', () => {
    const p = revisarCiclo(construir(CONFIG_CODEX, [1138, 2471, 3660]));
    expect(p[0]).toMatchObject({ i: 0, j: 2 });
    expect(p[0].separacion).toBeCloseTo(79.978, 1);
    expect(p[0].donde).toBeCloseTo(3547.7, 0);
  });
  it('tramos iguales: casi se tocan (6 mm en 4200, 15,5 mm en 3660)', () => {
    expect(revisarCiclo(construir(CONFIG_CODEX, [1400, 2800, 4200]))[0].separacion).toBeCloseTo(5.959, 1);
    expect(revisarCiclo(construir(CONFIG_CODEX, [1220, 2440, 3660]))[0].separacion).toBeCloseTo(15.536, 1);
  });
  it('vale para cualquier número de tubos y da el diámetro final', () => {
    const m = construir(CONFIG_CODEX, [1008, 1816, 2869, 3826, 4782]);
    expect(m.tubos).toHaveLength(5);
    expect(revisarCiclo(m)).toHaveLength(10);
    expect(separacionFinal(m).separacion).toBeGreaterThan(30);
    expect(diametroFinal(m)).toBeGreaterThan(88.9 + 2 * 42);
  });
  it('con saco: el largo enrollado pasa del último tubo y el rollo sigue girando', () => {
    const corto = construir(CONFIG_CODEX, [1100, 2200, 3300]);
    const largo = construir(CONFIG_CODEX, [1100, 2200, 3300], 4400);
    expect(largo.largo).toBe(4400);
    expect(diametroFinal(largo)).toBeGreaterThan(diametroFinal(corto));
  });
});
```

- [ ] **Paso 2: comprobar que falla**

Ejecutar: `pnpm exec vitest run src/puertas/enrolle/geometria.test.ts`
Esperado: FALLA, «Cannot find module './geometria.ts'».

- [ ] **Paso 3: implementación (traducción fiel del HTML de Codex, generalizada)**

```ts
// src/puertas/enrolle/geometria.ts
// Geometría del rollo de una puerta enrollable. Traducción de las simulaciones de Codex (18/11/2026):
// la lona tensa se modela como el contorno de varios discos (tubo de enrolle y tubos ya enrollados) que crecen
// un grosor de lona por vuelta. Todo en mm y radianes.
export interface ConfigEnrolle { diametroEnrolle: number; diametroTubo: number; grosor: number; altoPerfil: number; anchoPerfil: number }
export const CONFIG_CODEX: ConfigEnrolle = { diametroEnrolle: 88.9, diametroTubo: 42, grosor: 0.8, altoPerfil: 0, anchoPerfil: 0 };
export interface Punto { x: number; y: number }
export interface TuboColocado extends Punto { marca: number; angulo: number }
export interface Pareja { i: number; j: number; separacion: number; donde: number }
interface Disco { x: number; y: number; base: number; inicio: number }
interface Apoyo extends Punto { a: number }
type Tramo =
  | { tipo: 'linea'; a: number; desde: Apoyo; inicio: number; fin: number }
  | { tipo: 'arco'; a: number; r: number; disco: Disco; inicio: number; fin: number };
export interface ModeloEnrolle { cfg: ConfigEnrolle; largo: number; marcas: number[]; tubos: TuboColocado[]; camino: Tramo[] }

const TAU = 2 * Math.PI, PRECISION = 0.02;
const medidas = (cfg: ConfigEnrolle) => {
  const tubo = cfg.diametroTubo / 2, crecimiento = cfg.grosor / TAU;
  return { eje: cfg.diametroEnrolle / 2, tubo, desfase: tubo + cfg.grosor / 2, crecimiento };
};

function apoyo(d: Disco, a: number, g: number): Apoyo {
  const c = Math.cos(a), s = Math.sin(a), r = d.base + g * a;
  return { x: d.x + r * c - g * s, y: d.y + r * s + g * c, a };
}

function contorno(cfg: ConfigEnrolle, discos: Disco[], largo: number): Tramo[] {
  const { desfase, crecimiento: g } = medidas(cfg);
  const fin = largo / desfase + TAU, eventos = [0, fin];
  for (let i = 1; i < discos.length; i++) {
    const d = discos[i];
    if (d.inicio < fin) eventos.push(d.inicio);
    for (const p of discos.slice(0, i)) {
      const dx = d.x - p.x, dy = d.y - p.y, sep = Math.hypot(dx, dy);
      if (!sep || Math.abs(p.base - d.base) > sep) continue;
      const dir = Math.atan2(dy, dx), medio = Math.acos((p.base - d.base) / sep), desde = Math.max(p.inicio, d.inicio);
      for (const raiz of [dir - medio, dir + medio])
        for (let a = raiz + TAU * Math.ceil((desde - raiz) / TAU); a < fin; a += TAU) if (a > desde) eventos.push(a);
    }
  }
  eventos.sort((a, b) => a - b);
  const arcos: Array<{ a: number; b: number; disco: Disco }> = [];
  for (let i = 1; i < eventos.length; i++) {
    const a = eventos[i - 1], b = eventos[i];
    if (b - a < 1e-10) continue;
    const m = (a + b) / 2, c = Math.cos(m), s = Math.sin(m);
    let dueno = discos[0], alto = dueno.base;
    for (const d of discos.slice(1)) {
      const h = d.base + d.x * c + d.y * s;
      if (m >= d.inicio && h > alto) { dueno = d; alto = h; }
    }
    const ultimo = arcos.at(-1);
    if (ultimo && ultimo.disco === dueno) ultimo.b = b; else arcos.push({ a, b, disco: dueno });
  }
  const tramos: Tramo[] = [];
  let recorrido = 0, anterior: Apoyo | null = null;
  for (const { a, b, disco } of arcos) {
    const primero = apoyo(disco, a, g);
    if (anterior) {
      const tramo = Math.hypot(primero.x - anterior.x, primero.y - anterior.y);
      if (tramo > 1e-8) { tramos.push({ tipo: 'linea', a, desde: anterior, inicio: recorrido, fin: recorrido + tramo }); recorrido += tramo; }
    }
    if (recorrido >= largo) break;
    const r = disco.base + g * a, tramo = (b - a) * (r + g * (b - a) / 2);
    tramos.push({ tipo: 'arco', a, r, disco, inicio: recorrido, fin: recorrido + tramo });
    recorrido += tramo;
    if (recorrido >= largo) break;
    anterior = apoyo(disco, b, g);
  }
  return tramos;
}

function en(cfg: ConfigEnrolle, camino: Tramo[], largo: number): Apoyo {
  const g = medidas(cfg).crecimiento;
  let lo = 0, hi = camino.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (camino[m].fin < largo) lo = m + 1; else hi = m; }
  const p = camino[lo], ds = largo - p.inicio;
  if (p.tipo === 'linea') return { x: p.desde.x - ds * Math.sin(p.a), y: p.desde.y + ds * Math.cos(p.a), a: p.a };
  return apoyo(p.disco, p.a + 2 * ds / (p.r + Math.sqrt(p.r * p.r + 2 * g * ds)), g);
}

/** Discos fijos del tubo de enrolle; el perfil fleco se añade en la tarea 2. */
function discosIniciales(cfg: ConfigEnrolle): Disco[] {
  const { eje } = medidas(cfg);
  return [{ x: 0, y: 0, base: eje + cfg.grosor / 2, inicio: 0 }];
}

export function construir(cfg: ConfigEnrolle, marcas: number[], largo = marcas.at(-1) ?? 0): ModeloEnrolle {
  const { desfase, crecimiento: g } = medidas(cfg);
  const discos = discosIniciales(cfg), tubos: TuboColocado[] = [];
  let camino = contorno(cfg, discos, largo);
  for (const marca of marcas) {
    const p = en(cfg, camino, marca);
    const x = p.x + desfase * Math.cos(p.a), y = p.y + desfase * Math.sin(p.a);
    tubos.push({ x, y, marca, angulo: p.a });
    if (marca < largo) {
      // El tubo empieza a estorbar en la vuelta siguiente, por el lado contrario (Codex).
      const inicio = p.a + Math.PI;
      discos.push({ x, y, inicio, base: desfase - g * inicio });
      camino = contorno(cfg, discos, largo);
    }
  }
  return { cfg, largo, marcas, tubos, camino };
}

export function centros(m: ModeloEnrolle, avance: number): Punto[] {
  const { desfase } = medidas(m.cfg), p = en(m.cfg, m.camino, avance), c = Math.cos(p.a), s = Math.sin(p.a);
  return m.tubos.map(t => {
    if (avance >= t.marca) return t;
    const libre = t.marca - avance;
    return { x: p.x + desfase * c - libre * s, y: p.y + desfase * s + libre * c };
  });
}

const hueco = (m: ModeloEnrolle, a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y) - m.cfg.diametroTubo;

export function separacionFinal(m: ModeloEnrolle): Pareja {
  let mejor: Pareja = { i: 0, j: 0, separacion: Infinity, donde: m.largo };
  for (let i = 0; i < m.tubos.length; i++) for (let j = i + 1; j < m.tubos.length; j++) {
    const s = hueco(m, m.tubos[i], m.tubos[j]);
    if (s < mejor.separacion) mejor = { i, j, separacion: s, donde: m.largo };
  }
  return mejor;
}

/** Todas las parejas durante todo el enrollado. Fuera de [marca i, marca j] los dos tubos se mueven juntos. */
export function revisarCiclo(m: ModeloEnrolle): Pareja[] {
  const { desfase } = medidas(m.cfg), parejas: Pareja[] = [];
  for (let i = 0; i < m.tubos.length; i++) for (let j = i + 1; j < m.tubos.length; j++) {
    const desde = m.marcas[i], hasta = m.marcas[j];
    let mejor = Infinity, donde = desde;
    const medir = (avance: number) => {
      const q = centros(m, avance), s = hueco(m, q[i], q[j]);
      if (s < mejor) { mejor = s; donde = avance; }
      return s;
    };
    const afinar = (a: number, b: number, sa: number, sb: number, rMin: number) => {
      const ritmo = Math.hypot(hasta - a, desfase) / rMin;
      if (Math.min(sa, sb) - ritmo * (b - a) / 2 >= mejor - PRECISION) return;
      const medio = (a + b) / 2, sm = medir(medio);
      afinar(a, medio, sa, sm, rMin); afinar(medio, b, sm, sb, rMin);
    };
    for (const t of m.camino) {
      const lo = Math.max(desde, t.inicio), hi = Math.min(hasta, t.fin);
      if (lo >= hi) continue;
      let a = lo, sa = medir(a);
      if (t.tipo === 'linea') continue;
      for (let b = Math.min(a + 12, hi); a < hi; b = Math.min(a + 12, hi)) {
        const sb = medir(b); afinar(a, b, sa, sb, t.r); a = b; sa = sb;
      }
    }
    parejas.push({ i, j, separacion: mejor, donde });
  }
  return parejas.sort((a, b) => a.separacion - b.separacion);
}

export function diametroFinal(m: ModeloEnrolle): number {
  const fin = en(m.cfg, m.camino, m.largo);
  const radios = [Math.hypot(fin.x, fin.y) + m.cfg.grosor / 2, ...m.tubos.map(t => Math.hypot(t.x, t.y) + m.cfg.diametroTubo / 2 + m.cfg.grosor)];
  return 2 * Math.max(...radios);
}
```

- [ ] **Paso 4: comprobar que pasa**

Ejecutar: `pnpm exec vitest run src/puertas/enrolle/geometria.test.ts`
Esperado: 5 pruebas en verde. Si los números de Codex no salen a ±0,1 mm, comparar línea a línea con
`C:\Users\ivan.sanchez\AppData\Local\Temp\enr\core.js` (núcleo extraído del HTML de Codex); no ajustar las pruebas.

- [ ] **Paso 5: commit**

```bash
git add src/puertas/enrolle/geometria.ts src/puertas/enrolle/geometria.test.ts
git commit -m "feat(puertas): geometría del enrolle de las simulaciones de Codex, para cualquier número de tubos"
```

---

### Tarea 2: perfil fleco y ángulo de cada tubo al perfil

**Ficheros:**
- Modificar: `src/puertas/enrolle/geometria.ts` (`discosIniciales` y nueva función)
- Prueba: `src/puertas/enrolle/geometria.test.ts`

**Interfaces que produce:**
```ts
export function angulosAlPerfil(m: ModeloEnrolle): number[]; // grados, 0–180, uno por tubo
```

El perfil fleco está en el arranque de la lona (ángulo 0). Abulta `altoPerfil` (10 mm, Iván 18/11) y tiene
`anchoPerfil` de ancho (10 mm: bulto redondo de 1 cm con la varilla dentro, Iván 18/11). Se modela como un disco de radio `anchoPerfil/2` con el centro a
`eje + altoPerfil − anchoPerfil/2` en el ángulo 0, que empieza a estorbar en la vuelta siguiente, como los tubos.

- [ ] **Paso 1: prueba que falla**

```ts
// añadir a src/puertas/enrolle/geometria.test.ts
import { angulosAlPerfil } from './geometria.ts';

describe('perfil fleco', () => {
  const conPerfil = { ...CONFIG_CODEX, altoPerfil: 10, anchoPerfil: 10 };
  it('sin perfil da lo mismo que Codex', () => {
    const a = revisarCiclo(construir(CONFIG_CODEX, [1470, 2714, 4200]))[0];
    const b = revisarCiclo(construir({ ...CONFIG_CODEX, altoPerfil: 0, anchoPerfil: 20 }, [1470, 2714, 4200]))[0];
    expect(b.separacion).toBeCloseTo(a.separacion, 6);
  });
  it('el bulto del perfil cambia dónde caen los tubos y agranda el rollo', () => {
    const sin = construir(CONFIG_CODEX, [1470, 2714, 4200]);
    const con = construir(conPerfil, [1470, 2714, 4200]);
    expect(con.tubos[2].angulo).not.toBeCloseTo(sin.tubos[2].angulo, 2);
    expect(diametroFinal(con)).toBeGreaterThan(diametroFinal(sin));
  });
  it('da el ángulo de cada tubo al perfil, entre 0 y 180 grados', () => {
    const angulos = angulosAlPerfil(construir(conPerfil, [1470, 2714, 4200]));
    expect(angulos).toHaveLength(3);
    for (const a of angulos) { expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThanOrEqual(180); }
  });
  it('un tubo justo una vuelta después del arranque queda encima del perfil', () => {
    const vuelta = Math.PI * (88.9 + 0.8);
    expect(angulosAlPerfil(construir(conPerfil, [vuelta, 3000]))[0]).toBeLessThan(20);
  });
});
```

- [ ] **Paso 2: comprobar que falla**

Ejecutar: `pnpm exec vitest run src/puertas/enrolle/geometria.test.ts`
Esperado: FALLA, `angulosAlPerfil` no existe y el perfil no cambia nada.

- [ ] **Paso 3: implementación**

```ts
// en src/puertas/enrolle/geometria.ts, sustituir discosIniciales
/** Tubo de enrolle y perfil fleco. El perfil es un bulto en el arranque de la lona que la lona tapa a partir de la
 * vuelta siguiente; se modela como un disco más (bulto de 1 cm, Iván 18/11). */
function discosIniciales(cfg: ConfigEnrolle): Disco[] {
  const { eje, crecimiento: g } = medidas(cfg);
  const discos: Disco[] = [{ x: 0, y: 0, base: eje + cfg.grosor / 2, inicio: 0 }];
  if (cfg.altoPerfil > 0 && cfg.anchoPerfil > 0) {
    const r = cfg.anchoPerfil / 2, inicio = Math.PI;
    discos.push({ x: eje + cfg.altoPerfil - r, y: 0, inicio, base: r + cfg.grosor / 2 - g * inicio });
  }
  return discos;
}

/** Ángulo de cada tubo al perfil fleco (que está en el ángulo 0), en grados de 0 a 180. */
export function angulosAlPerfil(m: ModeloEnrolle): number[] {
  return m.tubos.map(t => {
    const a = ((t.angulo % TAU) + TAU) % TAU;
    return Math.min(a, TAU - a) * 180 / Math.PI;
  });
}
```

- [ ] **Paso 4: comprobar que pasa**

Ejecutar: `pnpm exec vitest run src/puertas/enrolle/geometria.test.ts`
Esperado: todas en verde, también las de la tarea 1.

- [ ] **Paso 5: commit**

```bash
git add src/puertas/enrolle/geometria.ts src/puertas/enrolle/geometria.test.ts
git commit -m "feat(puertas): el perfil fleco abulta en el rollo y se mide el ángulo de cada tubo a él"
```

---

### Tarea 3: colocador de tubos

**Ficheros:**
- Crear: `src/puertas/enrolle/colocar.ts`
- Prueba: `src/puertas/enrolle/colocar.test.ts`

**Interfaces:**
- Usa: `ConfigEnrolle`, `construir`, `revisarCiclo`, `separacionFinal`, `angulosAlPerfil`, `diametroFinal`, `Pareja`
  de la tarea 1-2; `AvisoPuerta` de `src/puertas/tipos.ts` (`{ codigo; nivel: 'error' | 'aviso'; texto }`).
- Produce:
```ts
export interface AjustesEnrolle { margen: number; desvio: number; anguloPerfil: number } // mm, mm, grados
export interface DatosColocar { largo: number; nTubos: number; conSaco: boolean; manual?: number[] | null } // mm
export interface Colocacion {
  marcas: number[]; iguales: number[]; parejas: Pareja[]; angulos: number[]; diametroFinal: number;
  desvioUsado: number; avisos: AvisoPuerta[];
}
export function repartoIgual(largo: number, nTubos: number, conSaco: boolean): number[];
export function colocarTubos(cfg: ConfigEnrolle, ajustes: AjustesEnrolle, d: DatosColocar): Colocacion;
```

Criterio (cambio sobre el diseño, ver nota al final): partiendo de tramos iguales, se buscan las posiciones que dan la
**mayor separación** entre tubos con el rollo terminado, sin alejarse de los tramos iguales más del desvío máximo
(100 mm por defecto) y con todos los tubos a más del ángulo mínimo del perfil (25° en la ficha TGM, Q-TGM02). Luego se revisa el enrollado
completo. Sin saco, el último tubo es el final de la lona y no se mueve. Con saco se mueven todos.

- [ ] **Paso 1: prueba que falla**

```ts
// src/puertas/enrolle/colocar.test.ts
import { describe, expect, it } from 'vitest';
import { CONFIG_CODEX } from './geometria.ts';
import { colocarTubos, repartoIgual } from './colocar.ts';

const ajustes = { margen: 5, desvio: 100, anguloPerfil: 20 };
const tgm = { ...CONFIG_CODEX, altoPerfil: 10, anchoPerfil: 10 };

describe('reparto igual', () => {
  it('con tubo abajo, n tramos; con saco, n + 1', () => {
    expect(repartoIgual(4200, 3, false)).toEqual([1400, 2800, 4200]);
    expect(repartoIgual(4000, 3, true)).toEqual([1000, 2000, 3000]);
  });
});

describe('colocar tubos', () => {
  it('4200 con 3 tubos: separa mucho más que los tramos iguales y sin pasarse del desvío', () => {
    const c = colocarTubos(CONFIG_CODEX, { ...ajustes, anguloPerfil: 0 }, { largo: 4200, nTubos: 3, conSaco: false });
    expect(c.marcas.at(-1)).toBe(4200);
    expect(c.parejas[0].separacion).toBeGreaterThan(70);
    c.marcas.forEach((m, k) => expect(Math.abs(m - c.iguales[k])).toBeLessThanOrEqual(100));
    expect(c.avisos).toEqual([]);
  });
  it('con perfil fleco ningún tubo cae encima del perfil', () => {
    const c = colocarTubos(tgm, ajustes, { largo: 3660, nTubos: 3, conSaco: false });
    expect(Math.min(...c.angulos)).toBeGreaterThanOrEqual(20);
    expect(c.parejas[0].separacion).toBeGreaterThanOrEqual(5);
  });
  it('con saco se mueven todos los tubos y ninguno llega al saco', () => {
    const c = colocarTubos(tgm, ajustes, { largo: 4400, nTubos: 3, conSaco: true });
    expect(c.marcas).toHaveLength(3);
    expect(c.marcas.at(-1)!).toBeLessThan(4400);
  });
  it('5 y 6 tubos en menos de un segundo', () => {
    const t = performance.now();
    expect(colocarTubos(tgm, ajustes, { largo: 4782, nTubos: 5, conSaco: false }).parejas[0].separacion).toBeGreaterThan(5);
    expect(colocarTubos(tgm, ajustes, { largo: 6000, nTubos: 6, conSaco: false }).parejas).toHaveLength(15);
    expect(performance.now() - t).toBeLessThan(1000);
  });
  it('posiciones a mano: no las mueve y avisa si se solapan', () => {
    const sinPerfil = { ...ajustes, anguloPerfil: 0 };
    const c = colocarTubos(CONFIG_CODEX, sinPerfil, { largo: 4200, nTubos: 3, conSaco: false, manual: [1400, 2800, 4200] });
    expect(c.marcas).toEqual([1400, 2800, 4200]);
    expect(c.avisos).toEqual([]); // 6 mm > margen 5
    const justo = colocarTubos(CONFIG_CODEX, { ...sinPerfil, margen: 10 }, { largo: 4200, nTubos: 3, conSaco: false, manual: [1400, 2800, 4200] });
    expect(justo.avisos.map(a => a.codigo)).toEqual(['TUBOS_SOLAPAN']);
  });
  it('sin sitio: TUBOS_SOLAPAN', () => {
    const c = colocarTubos(CONFIG_CODEX, { margen: 50, desvio: 0, anguloPerfil: 0 }, { largo: 4200, nTubos: 3, conSaco: false });
    expect(c.avisos.some(a => a.codigo === 'TUBOS_SOLAPAN' && a.nivel === 'error')).toBe(true);
  });
  it('si hace falta más desvío, lo propone con DESVIO_EXCEDIDO', () => {
    // Con ±100 mm se llega a unos 75 mm (prototipo del 18/11); con ±50 no debería bastar para 70.
    const c = colocarTubos(CONFIG_CODEX, { margen: 70, desvio: 50, anguloPerfil: 0 }, { largo: 4200, nTubos: 3, conSaco: false });
    expect(c.avisos.map(a => a.codigo)).toEqual(['DESVIO_EXCEDIDO']);
    expect(c.desvioUsado).toBe(100);
  });
});
```

- [ ] **Paso 2: comprobar que falla**

Ejecutar: `pnpm exec vitest run src/puertas/enrolle/colocar.test.ts`
Esperado: FALLA, «Cannot find module './colocar.ts'».

- [ ] **Paso 3: implementación**

```ts
// src/puertas/enrolle/colocar.ts
import type { AvisoPuerta } from '../tipos.ts';
import { angulosAlPerfil, construir, diametroFinal, revisarCiclo, separacionFinal, type ConfigEnrolle, type Pareja } from './geometria.ts';

export interface AjustesEnrolle { margen: number; desvio: number; anguloPerfil: number }
export interface DatosColocar { largo: number; nTubos: number; conSaco: boolean; manual?: number[] | null }
export interface Colocacion {
  marcas: number[]; iguales: number[]; parejas: Pareja[]; angulos: number[]; diametroFinal: number;
  desvioUsado: number; avisos: AvisoPuerta[];
}
const TRAMO_MINIMO = 50; // mm entre dos tubos o entre el último y el saco
const mm = (x: number) => Math.round(x).toLocaleString('es-ES');

export function repartoIgual(largo: number, nTubos: number, conSaco: boolean): number[] {
  const tramos = conSaco ? nTubos + 1 : nTubos;
  return Array.from({ length: nTubos }, (_, k) => Math.round(largo * (k + 1) / tramos * 10) / 10);
}

/** Busca, paso a paso, las marcas que más separan los tubos con el rollo terminado. */
function buscar(cfg: ConfigEnrolle, a: AjustesEnrolle, d: DatosColocar, iguales: number[], desvio: number): number[] {
  const moviles = d.conSaco ? iguales.length : iguales.length - 1;
  const nota = (marcas: number[]) => {
    const m = construir(cfg, marcas, d.largo);
    const encima = angulosAlPerfil(m).some(x => x < a.anguloPerfil);
    return separacionFinal(m).separacion - (encima ? 1000 : 0);
  };
  let x = iguales.slice(), mejor = nota(x);
  for (let paso = 50; paso >= 1; paso /= 2) {
    let mejora = true;
    while (mejora) {
      mejora = false;
      for (let k = 0; k < moviles; k++) for (const s of [-paso, paso]) {
        const y = x.slice(); y[k] += s;
        const antes = k === 0 ? 0 : y[k - 1], despues = k + 1 < y.length ? y[k + 1] : d.largo;
        if (Math.abs(y[k] - iguales[k]) > desvio || y[k] < antes + TRAMO_MINIMO || y[k] > despues - TRAMO_MINIMO) continue;
        const v = nota(y);
        if (v > mejor + 1e-6) { mejor = v; x = y; mejora = true; }
      }
    }
  }
  return x;
}

function evaluar(cfg: ConfigEnrolle, a: AjustesEnrolle, d: DatosColocar, marcas: number[], iguales: number[], desvioUsado: number): Colocacion {
  const m = construir(cfg, marcas, d.largo), parejas = revisarCiclo(m), angulos = angulosAlPerfil(m), avisos: AvisoPuerta[] = [];
  const justa = parejas[0];
  if (justa && justa.separacion < a.margen)
    avisos.push({ codigo: 'TUBOS_SOLAPAN', nivel: 'error', texto: `Los tubos ${justa.i + 1} y ${justa.j + 1} quedan a ${justa.separacion.toLocaleString('es-ES', { maximumFractionDigits: 1 })} mm al enrollar (mínimo ${mm(a.margen)} mm). Cambia el número de tubos o el reparto.` });
  const encima = angulos.findIndex(x => x < a.anguloPerfil);
  if (encima >= 0)
    avisos.push({ codigo: 'TUBO_SOBRE_PERFIL', nivel: 'error', texto: `El tubo ${encima + 1} cae encima del perfil fleco (${Math.round(angulos[encima])}°, mínimo ${mm(a.anguloPerfil)}°).` });
  return { marcas, iguales, parejas, angulos, diametroFinal: diametroFinal(m), desvioUsado, avisos };
}

export function colocarTubos(cfg: ConfigEnrolle, a: AjustesEnrolle, d: DatosColocar): Colocacion {
  const iguales = repartoIgual(d.largo, d.nTubos, d.conSaco);
  if (d.manual?.length === d.nTubos) {
    const usado = Math.max(...d.manual.map((m, k) => Math.abs(m - iguales[k])));
    return evaluar(cfg, a, d, d.manual, iguales, usado);
  }
  const dentro = evaluar(cfg, a, d, buscar(cfg, a, d, iguales, a.desvio), iguales, a.desvio);
  if (!dentro.avisos.length) return dentro;
  // Si no cabe dentro del desvío, se prueba con el doble y se avisa para que lo decida el técnico.
  const fuera = evaluar(cfg, a, d, buscar(cfg, a, d, iguales, 2 * a.desvio), iguales, 2 * a.desvio);
  if (fuera.avisos.length) return dentro;
  fuera.avisos.push({ codigo: 'DESVIO_EXCEDIDO', nivel: 'aviso', texto: `Para separar los tubos, algún tramo se aleja del reparto igual más de ${mm(a.desvio)} mm. Revisa las posiciones.` });
  return fuera;
}
```

- [ ] **Paso 4: comprobar que pasa**

Ejecutar: `pnpm exec vitest run src/puertas/enrolle/colocar.test.ts`
Esperado: todas en verde. Si con ±50 mm ya se llega a 70 mm, bajar el desvío de esa prueba a 25 (sin tocar la
lógica) y anotarlo en el informe. Si la de 3660 con perfil no encuentra sitio, no aflojar la prueba: informar de la
separación y los ángulos que salen. Si la prueba de tiempo pasa de 1 s, no subir el límite: avisar al coordinador (habría que
llevar el cálculo a un worker, como dice el diseño).

- [ ] **Paso 5: commit**

```bash
git add src/puertas/enrolle/colocar.ts src/puertas/enrolle/colocar.test.ts
git commit -m "feat(puertas): colocador de tubos que separa lo más posible dentro del desvío y avisa si se solapan"
```

---

### Tarea 4: ficha TGM, datos de la puerta y dudas

**Ficheros:**
- Crear: `src/puertas/clientes/tgm.json`
- Modificar: `src/puertas/clientes.ts:9,27` (tipo y `validar`), `src/puertas/tipos.ts` (bloque `tgm`,
  `enrollable.sinSaco`, `enrollable.anchoEt`), `src/puertas/nuevaPuertaCliente.ts:10-12`, `src/puertas/pedido.ts:23-24`,
  `src/puertas/rps.ts:42-69`, `docs/modelos/dudas-abiertas.md` (al final)
- Prueba: `src/puertas/clientes.test.ts`, `src/puertas/rps.test.ts`, nuevo `src/puertas/tgm.test.ts`

**Interfaces que produce:**
```ts
// tipos.ts, dentro de Puerta
tgm?: {
  altoHueco: number;          // cm
  altoTotal: number | null;   // cm; si falta, alto del hueco + añadido
  anadido: number;            // cm, 30
  diametroEnrolle: number;    // mm, 88,9
  nTubos: number;
  diametroTubo: 42;           // mm
  anchoEt: number;            // cm, ancho de corte de la E.T. (p. ej. 14,5)
  abajo: 'tubo' | 'saco';     // la medida del saco es enrollable.saco, como en Portanova
  grosor: number;             // mm, 0,8
  tubosManual: number[] | null; // mm desde el perfil; null = los coloca la web
  ajustes: { margen: number; desvio: number; altoPerfil: number; anchoPerfil: number; anguloPerfil: number }; // mm y grados
};
// tipos.ts, dentro de enrollable
sinSaco?: boolean;   // TGM con tubo abajo
cierreBajo?: number; // cm de lona que se doblan en el cierre con el tubo de abajo (Q-TGM05)
anchoEt?: number;    // cm; si falta, REGLAS_ENROLLABLE.corteEntrada (8)
// clientes.ts
calculo: 'portanova'|'araujo'|'santapau'|'tgm'|'pendiente';
enrolle?: { diametroEnrolle: number; diametroTubo: 42; grosor: number; anadido: number; anchoEt: number; nTubos: number;
  margen: number; desvio: number; altoPerfil: number; anchoPerfil: number; anguloPerfil: number };
```

- [ ] **Paso 1: prueba que falla**

```ts
// src/puertas/tgm.test.ts (primera parte)
import { describe, expect, it } from 'vitest';
import { fichaPorId } from './clientes.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { leerPedidoPuertas } from './pedido.ts';

describe('ficha TGM', () => {
  it('está habilitada, con solo la enrollable y los valores del enrolle', () => {
    const f = fichaPorId('tgm')!;
    expect(f).toMatchObject({ nombre: 'TGM', habilitado: true, calculo: 'tgm' });
    expect(f.tipos.map(t => t.id)).toEqual(['enrollable']);
    expect(f.enrolle).toMatchObject({ diametroEnrolle: 88.9, diametroTubo: 42, grosor: 0.8, anadido: 30, altoPerfil: 10 });
  });
  it('una puerta nueva TGM lleva su bloque, ciega y con saco de 120', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    expect(p.modelo).toBe('PUERTAENR');
    expect(p.enrollable.sinVentanal).toBe(true);
    expect(p.tgm).toMatchObject({ anadido: 30, diametroEnrolle: 88.9, abajo: 'saco', altoTotal: null, tubosManual: null });
  });
  it('General sigue oculta para los códigos que no son de ningún cliente', () => {
    expect(fichaPorId('general')!.habilitado).toBe(false);
  });
});
```

Añadir a `src/puertas/clientes.test.ts` una prueba de que `validar` rechaza `calculo: 'tgm'` sin bloque `enrolle`.
Añadir a la prueba de `pedido.ts` que un pedido guardado con una puerta TGM se lee igual (copiar el patrón de Santa
Pau del mismo fichero) y que una puerta TGM sin `tgm` da error.

- [ ] **Paso 2: comprobar que falla**

Ejecutar: `pnpm exec vitest run src/puertas/tgm.test.ts src/puertas/clientes.test.ts src/puertas/pedido.test.ts`
Esperado: FALLA, no existe la ficha `tgm`.

- [ ] **Paso 3: implementación**

`src/puertas/clientes/tgm.json`:
```json
{
  "id": "tgm",
  "nombre": "TGM",
  "codigoRps": "",
  "unidadHoja": "cm",
  "habilitado": true,
  "calculo": "tgm",
  "rollos": { "rollo": 300, "rolloCristal": 140, "rolloSaco": 300 },
  "rollosConfirmados": false,
  "remates": "Puerta enrollable propia de TGM: lona sujeta con varilla a un perfil fleco atornillado al tubo de enrolle",
  "perfiles": {},
  "rotulos": { "espaciador": "", "cremallera": "", "plantilla": "general" },
  "tipos": [ { "id": "enrollable", "nombre": "Enrollable", "modelo": "PUERTAENR" } ],
  "articulos": { "PUERTAENR": "enrollable" },
  "enrolle": { "diametroEnrolle": 88.9, "diametroTubo": 42, "grosor": 0.8, "anadido": 30, "anchoEt": 8, "nTubos": 3,
    "margen": 5, "desvio": 100, "altoPerfil": 10, "anchoPerfil": 10, "anguloPerfil": 25 }
}
```
Conservar el final de línea que usen los otros JSON de `src/puertas/clientes/`.

`clientes.ts`: añadir `'tgm'` al tipo `calculo` y a la lista de `validar` (línea 27); en `validar`, si
`calculo === 'tgm'`, exigir `enrolle` con todos sus campos numéricos y positivos (salvo `altoPerfil`, que puede ser 0).

`nuevaPuertaCliente.ts`, dentro del objeto que devuelve `nuevaPuertaDeCliente`:
```ts
    ...(f.calculo==='tgm'&&f.enrolle?{enrollable:{...nuevaPuerta(t.modelo).enrollable,sinVentanal:true,anchoEt:f.enrolle.anchoEt},
      ventanasConfirmadas:true,
      tgm:{altoHueco:0,altoTotal:null,anadido:f.enrolle.anadido,diametroEnrolle:f.enrolle.diametroEnrolle,nTubos:f.enrolle.nTubos,
        diametroTubo:42 as const,anchoEt:f.enrolle.anchoEt,abajo:'saco' as const,grosor:f.enrolle.grosor,tubosManual:null,
        ajustes:{margen:f.enrolle.margen,desvio:f.enrolle.desvio,altoPerfil:f.enrolle.altoPerfil,anchoPerfil:f.enrolle.anchoPerfil,anguloPerfil:f.enrolle.anguloPerfil}}}:{}),
```
`pedido.ts`, junto a las líneas 23-24:
```ts
      if((fichaPorId(p.clientePuertas)!.calculo==='tgm')!==Boolean(p.tgm))return error();
```
`rps.ts`: para una ficha `tgm`, crear la puerta con `nuevaPuertaDeCliente(ficha.id,tipo.id)` (igual que Santa Pau en
la línea 60). TGM no tiene código RPS propio todavía (`codigoRps: ""`), así que no se asocia a ningún cliente de RPS:
añadir una prueba en `rps.test.ts` de que un código desconocido sigue cayendo en General.

`docs/modelos/dudas-abiertas.md`, al final, con el formato de las secciones que ya hay:
```markdown
## Puertas · TGM enrollable · 18/11/2026

- **Q-TGM01 · Bolsillo de la varilla (contestada).** Iván, 18/11: la lona lleva 3,5 cm de más arriba para la
  entrada de la varilla (como la cabecera de Portanova), los 30 cm de enrolle se cuentan desde la varilla ya puesta
  y el bolsillo va soldado.
- **Q-TGM02 · Perfil fleco (contestada).** Bulto de 1 cm (Iván, 18/11); basta con que el tubo quede un poco
  desplazado. Calculado con el modelo del rollo: el bulto sube 9,6 mm encima del perfil y a 25° ya está por debajo de
  la mitad (5 mm); a unos 36° desaparece. Mínimo 25°.
- **Q-TGM03 · E.T. (contestada).** Iván, 18/11: la E.T. es solo una tira de lona que sujeta el tubo. Se corta del
  ancho exacto que dice el pedido (depende del tubo), se suelda 2-3 cm por arriba y por abajo y el tubo va en el
  centro. No cambia las uniones de la lona.
- **Q-TGM04 · Tubo abajo (contestada).** Iván, 18/11: sin saco, el tubo de abajo va en el cierre: la lona lleva un
  aumento que se dobla, se suelda y deja el tubo dentro con la medida terminada.
- **Q-TGM05 · Aumento del cierre de abajo.** ¿Cuántos cm de lona lleva el cierre del tubo de abajo? Mientras tanto,
  el ancho de la E.T. (lo mismo que necesita la tira para rodear el tubo y soldarse).
```

- [ ] **Paso 4: comprobar que pasa**

Ejecutar: `pnpm exec vitest run --maxWorkers=6 src/puertas`
Esperado: todo en verde, también las pruebas que ya había.

- [ ] **Paso 5: commit**

```bash
git add src/puertas/clientes/tgm.json src/puertas/clientes.ts src/puertas/tipos.ts src/puertas/nuevaPuertaCliente.ts src/puertas/pedido.ts src/puertas/rps.ts src/puertas/tgm.test.ts src/puertas/clientes.test.ts src/puertas/pedido.test.ts src/puertas/rps.test.ts docs/modelos/dudas-abiertas.md
git commit -m "feat(puertas): ficha TGM con la enrollable propia y sus valores de enrolle; dudas Q-TGM01..05"
```
(Si la prueba de `pedido.ts` está en otro fichero, añadir ese en su lugar.)

---

### Tarea 5: enrollable sin saco y E.T. de ancho variable

**Ficheros:**
- Modificar: `src/puertas/calcular.ts` (`huecosEntrada` línea 47, `entrada` línea 139, enrollable 149-253)
- Prueba: `src/puertas/enrollableSinVentanal.test.ts`

**Interfaces:**
- Usa: `enrollable.sinSaco`, `enrollable.anchoEt` de la tarea 4.
- Produce: `huecosEntrada(largo, diametro, cintas = [], altoEt?: number)`; con `altoEt` los huecos se centran en esa
  E.T. Sin `sinSaco` ni `anchoEt`, el resultado es idéntico al de ahora.

- [ ] **Paso 1: prueba que falla**

```ts
// añadir a src/puertas/enrollableSinVentanal.test.ts
import { huecosEntrada } from './calcular.ts';

describe('enrollable TGM: sin saco y E.T. de otro ancho', () => {
  const con = (cambios: object) => { const p = ciega(); return { ...p, enrollable: { ...p.enrollable, ...cambios } }; };
  it('E.T. de 14,5: se corta a 14,5 y las uniones de la lona no cambian (Q-TGM03)', () => {
    const r = calcularPuerta(con({ anchoEt: 14.5 }));
    const et = r.piezas.filter(x => x.clase === 'entrada');
    expect(et.length).toBeGreaterThan(0);
    expect(et.every(x => x.alto === 14.5)).toBe(true);
    expect(r.uniones.filter(u => u.tubo).every(u => u.solape === 7.5)).toBe(true);
  });
  it('los huecos de Ø42 se centran en la E.T. de 14,5', () => {
    expect(huecosEntrada(300, 42, [], 14.5)[0]).toMatchObject({ y: 2.5, alto: 9.5, ancho: 5 });
    expect(huecosEntrada(300, 42)[0]).toMatchObject({ y: 2, alto: 9.5 });
  });
  it('sin saco: no hay pieza de saco y el paño baja el aumento del cierre', () => {
    const r = calcularPuerta(con({ sinSaco: true, cierreBajo: 8 }));
    expect(r.piezas.some(x => x.clase === 'saco')).toBe(false);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const abajo = Math.min(...r.piezas.filter(x => x.clase === 'pano').map(x => x.origenAlzado![1]));
    expect(abajo).toBe(-8);
  });
  it('sin cambios, la ciega de Portanova da lo mismo que antes', () => {
    expect(calcularPuerta(con({}))).toEqual(calcularPuerta(ciega()));
  });
});
```

- [ ] **Paso 2: comprobar que falla**

Ejecutar: `pnpm exec vitest run src/puertas/enrollableSinVentanal.test.ts`
Esperado: FALLA en las tres primeras.

- [ ] **Paso 3: implementación**

En `calcular.ts`:
```ts
export function huecosEntrada(largo: number, diametro: 30 | 42, cintas: number[] = [], altoEt?: number): Hueco[] {
  const alto = altoEt ?? (diametro === 42 ? 13.5 : 12), h = diametro === 42 ? 9.5 : 7.5;
  // … resto sin cambios
}
```
Dentro de `calcularPuerta`, antes de `function entrada`:
```ts
  // TGM: la E.T. es una tira que se corta del ancho exacto del pedido, se suelda 2-3 cm arriba y abajo y lleva el
  // tubo en el centro (Iván, 18/11/2026). No cambia el solape de las uniones de la lona.
  const corteEt = p.modelo==='PUERTAENR' ? p.enrollable.anchoEt ?? REGLAS_ENROLLABLE.corteEntrada : 0;
```
y sustituir, solo en la rama `PUERTAENR` (línea 139 y las de entradas entre ventanales 201-202),
`REGLAS_ENROLLABLE.corteEntrada` por `corteEt`. `REGLAS_ENROLLABLE.solapeEntrada` no se toca.

Sin saco (`e.sinSaco`), en la rama `PUERTAENR`:
- `origenInferior = e.sinSaco ? -(e.cierreBajo ?? 0) : s.rematado`: el paño de abajo baja el aumento del cierre, que
  se dobla y se suelda con el tubo dentro (Iván, 18/11, Q-TGM04); marcar la raya del doblez en 0;
- no añadir ninguna pieza de saco (envolver en `if (!e.sinSaco)` el bloque de saco de las líneas 230-250);
- no marcar la raya de soldar el saco (`marcarEn(origen+2…)` de la línea 183 cuando `nombre==='inferior'`);
- no dar el aviso `SACO` de la línea 64 cuando `p.enrollable.sinSaco`.

- [ ] **Paso 4: comprobar que pasa**

Ejecutar: `pnpm exec vitest run --maxWorkers=6 src/puertas`
Esperado: todo en verde. Ninguna prueba existente de Portanova, Araujo o Santa Pau debe cambiar.

- [ ] **Paso 5: commit**

```bash
git add src/puertas/calcular.ts src/puertas/enrollableSinVentanal.test.ts
git commit -m "feat(puertas): la enrollable admite ir sin saco y una E.T. de otro ancho, para la puerta TGM"
```

---

### Tarea 6: cálculo de la puerta TGM

**Ficheros:**
- Crear: `src/puertas/tgm.ts`
- Modificar: `src/puertas/calcular.ts` (reparto en `calcularPuerta`, tras Santa Pau)
- Prueba: `src/puertas/tgm.test.ts`

**Interfaces:**
- Usa: `colocarTubos`, `AjustesEnrolle` (tarea 3); `ConfigEnrolle` (tarea 1); bloque `tgm` (tarea 4);
  `sinSaco`, `anchoEt`, `huecosEntrada(largo, 42, [], altoEt)` (tarea 5); `sacoPuerta` de `saco.ts`.
- Produce:
```ts
export interface EnrolleTgm { cfg: ConfigEnrolle; ajustes: AjustesEnrolle; largo: number; conSaco: boolean; altoLona: number; colocacion: Colocacion }
export function enrolleTgm(p: Puerta): EnrolleTgm | null;   // null si faltan medidas
export function puertaTgmDerivada(p: Puerta, e: EnrolleTgm): Puerta;
export function calcularTgm(p: Puerta, calcularEnrollable: (p: Puerta) => ResultadoPuerta): ResultadoPuerta;
```

Reglas (diseño, sección «Cómo coloca»):
- Alto de la lona (cm) = `altoTotal` o, si falta, `altoHueco + anadido`.
- El alto de la lona se mide hasta la varilla ya puesta (Iván, 18/11: los 30 cm de enrolle cuentan desde la
  varilla). Encima lleva 3,5 cm para la entrada de la varilla, que es la cabecera de Portanova (`p.alto + 3,5`), así
  que no hay que cambiarla. Las marcas del simulador se miden desde la varilla.
- Con saco: largo enrollado (mm) = `(altoLona − sacoPuerta(p).rematado) × 10`; tubos en `n + 1` tramos.
- Con tubo abajo: largo enrollado (mm) = `(altoLona − diametroTubo / 20) × 10` (el tubo va en el cierre, con su
  eje a medio tubo del bajo); el último tubo es el final y **no lleva E.T.**: va en el cierre, que lleva
  `cierreBajo = anchoEt` cm de aumento (provisional Q-TGM05).
- Altura de cada tubo desde abajo (cm) = `altoLona − marca / 10`, redondeada a 0,1.
- La puerta derivada es la enrollable ciega de Portanova con `alto = altoLona`, `sinSaco = abajo === 'tubo'`,
  `anchoEt`, `cierreBajo` (solo con tubo abajo) y las entradas `{ altura, diametro: 42, largo: frente, alto: anchoEt,
  huecos: huecosEntrada(frente, 42, [], anchoEt) }` de todos los tubos menos el del cierre.
- Los avisos del colocador se añaden a los del cálculo.

- [ ] **Paso 1: prueba que falla**

```ts
// añadir a src/puertas/tgm.test.ts
import { calcularPuerta } from './calcular.ts';
import { enrolleTgm } from './tgm.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import type { Puerta } from './tipos.ts';

const puertaTgm = (cambios: Partial<NonNullable<Puerta['tgm']>> = {}): Puerta => {
  const p = nuevaPuertaDeCliente('tgm', 'enrollable');
  return { ...p, of: 'OF1', frente: 300, alto: 400, color: 'BLANCO', confirmada: true, tgm: { ...p.tgm!, altoHueco: 400, nTubos: 3, ...cambios } };
};

describe('cálculo de la puerta TGM', () => {
  it('lona = hueco + 30, tubos colocados por el simulador', () => {
    const e = enrolleTgm(puertaTgm())!;
    expect(e.altoLona).toBe(430);
    expect(e.conSaco).toBe(true);
    expect(e.colocacion.marcas).toHaveLength(3);
    expect(e.colocacion.avisos.filter(a => a.nivel === 'error')).toEqual([]);
  });
  it('el paño llega a la varilla + 3,5 cm de entrada de varilla', () => {
    const r = calcularPuerta(puertaTgm({ abajo: 'tubo' }));
    const panos = r.piezas.filter(x => x.clase === 'pano');
    const arriba = Math.max(...panos.map(x => x.origenAlzado![1] + x.alto));
    expect(arriba).toBeCloseTo(430 + 3.5, 1);
  });
  it('el alto total manda sobre hueco + añadido', () => {
    expect(enrolleTgm(puertaTgm({ altoTotal: 450 }))!.altoLona).toBe(450);
  });
  it('sale una puerta ciega con 3 E.T. a la altura del simulador, saco y sin errores', () => {
    const p = puertaTgm(), r = calcularPuerta(p), e = enrolleTgm(p)!;
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.piezas.some(x => x.clase === 'cristal')).toBe(false);
    expect(r.piezas.filter(x => x.clase === 'saco').length).toBeGreaterThan(0);
    const ejes = r.uniones.filter(u => u.tubo).map(u => u.altura).concat(r.piezas.filter(x => x.clase === 'entrada').map(x => x.origenAlzado![1] + x.alto / 2));
    for (const m of e.colocacion.marcas) expect(ejes.some(y => Math.abs(y - (430 - m / 10)) < .11)).toBe(true);
  });
  it('con tubo abajo no lleva saco y el último tubo va en el cierre, sin E.T.', () => {
    const p = puertaTgm({ abajo: 'tubo' }), r = calcularPuerta(p);
    expect(r.piezas.some(x => x.clase === 'saco')).toBe(false);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(enrolleTgm(p)!.largo).toBeCloseTo((430 - 2.1) * 10, 1);
    const ets = r.uniones.filter(u => u.tubo).length + r.piezas.filter(x => x.clase === 'entrada').length;
    expect(ets).toBe(2); // 3 tubos: 2 en E.T. y el de abajo en el cierre
    const abajo = Math.min(...r.piezas.filter(x => x.clase === 'pano').map(x => x.origenAlzado![1]));
    expect(abajo).toBeCloseTo(-8, 1); // aumento del cierre = ancho de la E.T. (Q-TGM05)
  });
  it('E.T. de 14,5', () => {
    const p = puertaTgm({ anchoEt: 14.5 });
    const r = calcularPuerta({ ...p, enrollable: { ...p.enrollable, anchoEt: 14.5 } });
    expect(r.piezas.filter(x => x.clase === 'entrada').every(x => x.alto === 14.5)).toBe(true);
  });
  it('si los tubos se montan, error TUBOS_SOLAPAN', () => {
    const p = puertaTgm({ tubosManual: [1400, 1450, 1500] });
    expect(calcularPuerta(p).avisos.some(a => a.codigo === 'TUBOS_SOLAPAN')).toBe(true);
  });
  it('sin alto del hueco no calcula y lo pide', () => {
    expect(calcularPuerta(puertaTgm({ altoHueco: 0 })).avisos.some(a => a.codigo === 'TGM_MEDIDAS')).toBe(true);
  });
  it('sale el corte y el plano, y el pedido se guarda', async () => {
    const p = puertaTgm();
    const pedido = pedidoDe([p]);
    expect(() => generarCortePuertas(pedido)).not.toThrow();
    // Usar escribirPlanoPuertas igual que en enrollableSinVentanal.test.ts ('sale el corte y el plano…'), en tmp/.
  });
});
```
Antes de escribir el último caso, abrir `src/puertas/enrollableSinVentanal.test.ts` (prueba «sale el corte y el
plano, y el pedido se guarda», línea 39) y copiar exactamente cómo llama a `generarCortePuertas`,
`escribirPlanoPuertas` y `leerPedidoPuertas`, cambiando solo la puerta.

- [ ] **Paso 2: comprobar que falla**

Ejecutar: `pnpm exec vitest run src/puertas/tgm.test.ts`
Esperado: FALLA, «Cannot find module './tgm.ts'».

- [ ] **Paso 3: implementación**

```ts
// src/puertas/tgm.ts
// Puerta enrollable propia de TGM (Iván, 18/11/2026): la cadena de tubos la coloca el simulador de enrolle y la
// confección es la de la enrollable ciega de Portanova.
import type { Puerta, ResultadoPuerta } from './tipos.ts';
import { huecosEntrada } from './calcular.ts';
import { sacoPuerta } from './saco.ts';
import { colocarTubos, type AjustesEnrolle, type Colocacion } from './enrolle/colocar.ts';
import type { ConfigEnrolle } from './enrolle/geometria.ts';

export interface EnrolleTgm { cfg: ConfigEnrolle; ajustes: AjustesEnrolle; largo: number; conSaco: boolean; altoLona: number; colocacion: Colocacion }
const d1 = (x: number) => Math.round(x * 10) / 10;

export function enrolleTgm(p: Puerta): EnrolleTgm | null {
  const t = p.tgm;
  if (!t || !(t.altoHueco > 0) || !(p.frente > 0) || !(t.nTubos >= 1) || !(t.anchoEt > 0)) return null;
  const altoLona = t.altoTotal && t.altoTotal > 0 ? t.altoTotal : t.altoHueco + t.anadido;
  const conSaco = t.abajo === 'saco';
  // Sin saco, el tubo de abajo va en el cierre con su eje a medio tubo del bajo (Iván, 18/11/2026, Q-TGM04).
  const bajo = conSaco ? sacoPuerta(p).rematado : t.diametroTubo / 20;
  const largo = d1((altoLona - bajo) * 10);
  const cfg: ConfigEnrolle = { diametroEnrolle: t.diametroEnrolle, diametroTubo: t.diametroTubo, grosor: t.grosor, altoPerfil: t.ajustes.altoPerfil, anchoPerfil: t.ajustes.anchoPerfil };
  const ajustes: AjustesEnrolle = { margen: t.ajustes.margen, desvio: t.ajustes.desvio, anguloPerfil: t.ajustes.anguloPerfil };
  return { cfg, ajustes, largo, conSaco, altoLona, colocacion: colocarTubos(cfg, ajustes, { largo, nTubos: t.nTubos, conSaco, manual: t.tubosManual }) };
}

export function puertaTgmDerivada(p: Puerta, e: EnrolleTgm): Puerta {
  const t = p.tgm!;
  return { ...p, alto: e.altoLona,
    enrollable: { ...p.enrollable, sinVentanal: true, sinSaco: !e.conSaco, anchoEt: t.anchoEt,
      ...(e.conSaco ? {} : { cierreBajo: t.anchoEt }) }, // aumento provisional (Q-TGM05)
    // Sin saco, el último tubo va en el cierre de abajo y no lleva E.T.
    entradas: (e.conSaco ? e.colocacion.marcas : e.colocacion.marcas.slice(0, -1)).map(m => ({ altura: d1(e.altoLona - m / 10), diametro: 42 as const, largo: p.frente, alto: t.anchoEt, huecos: huecosEntrada(p.frente, 42, [], t.anchoEt) })) };
}

export function calcularTgm(p: Puerta, calcularEnrollable: (p: Puerta) => ResultadoPuerta): ResultadoPuerta {
  const e = enrolleTgm(p);
  if (!e) return { version: 1, piezas: [], alternativasSaco: null, empates: [], uniones: [], bolsillo: null,
    avisos: [{ codigo: 'TGM_MEDIDAS', nivel: 'error', texto: 'Faltan el frente, el alto del hueco, el número de tubos o el ancho de la E.T.' }] };
  const r = calcularEnrollable(puertaTgmDerivada(p, e));
  return { ...r, avisos: [...e.colocacion.avisos, ...r.avisos] };
}
```
En `calcularPuerta` (`calcular.ts`), tras la línea de Santa Pau:
```ts
  if (p.tgm) return calcularTgm(p, q => calcularPuerta({ ...q, tgm: undefined }));
```
(con `import { calcularTgm } from './tgm.ts';`). Si el import circular `tgm.ts ↔ calcular.ts` da problemas en
vitest, mover `huecosEntrada` a un fichero propio `src/puertas/huecosEntrada.ts` y reexportarlo desde `calcular.ts`.

Comprobar que el plano y la vista usan la altura de la lona: si el plano TGM dibuja la puerta con `p.alto` original
(alto del hueco), hacer que las funciones que reciben la puerta para el plano y el corte usen
`puertaTgmDerivada(p, enrolleTgm(p)!)` cuando `p.tgm` exista (buscar con `grep -n "calcularPuerta(" src/puertas/*.ts`).

- [ ] **Paso 4: comprobar que pasa**

Ejecutar: `pnpm exec vitest run --maxWorkers=6 src/puertas`
Esperado: todo en verde.

- [ ] **Paso 5: commit**

```bash
git add src/puertas/tgm.ts src/puertas/tgm.test.ts src/puertas/calcular.ts
git commit -m "feat(puertas): cálculo de la puerta TGM con la cadena de tubos del simulador de enrolle"
```

---

### Tarea 7: pantalla de la puerta TGM y simulador

**Ficheros:**
- Crear: `src/client/puertas/ConfigurarTgm.tsx`, `src/client/puertas/SimuladorEnrolle.tsx`,
  `src/client/puertas/SimuladorEnrolle.test.tsx`
- Modificar: `src/client/puertas/PuertasView.tsx:26,73`, `src/client/puertas/puertas.css`

**Interfaces:**
- Usa: `enrolleTgm`, `puertaTgmDerivada` (tarea 6); `construir`, `centros`, `revisarCiclo` (tarea 1);
  `angulosAlPerfil` (tarea 2). Para las props, copiar la firma de `ConfigurarSantaPau`
  (`{ p, cambiar, corte, derecha, letra, vistas }`) y su estructura de paneles.
- Produce: `<ConfigurarTgm …/>` y `<SimuladorEnrolle enrolle={EnrolleTgm} />`.

Lo que se ve (diseño, tabla «Partes del código»):
- **Datos de la puerta** (en mm, con `medidasPuertas.ts`): frente, alto del hueco, alto total (opcional), añadido,
  Ø enrolle, nº de tubos, Ø tubos (42, solo lectura), ancho de E.T., abajo tubo/saco, medida del saco (cuando hay
  saco), lona/color, grosor.
- **Ajustes del enrolle** (plegado): margen mínimo, desvío máximo, alto y ancho del perfil fleco, ángulo mínimo del
  perfil. Valores por defecto de la ficha TGM y botón «Restaurar valores por defecto».
- **Simulador:** canvas con el tubo de enrolle, el perfil fleco, la lona y los tubos; barra para enrollar y
  desenrollar; botón «Reproducir»; separación mínima y entre qué tubos; diámetro final; tabla de tramos (tramo igual,
  tramo colocado, diferencia); botón «Ir al punto más justo» (lleva la barra a `parejas[0].donde`).
- **Tubos a mano:** casilla «Colocar los tubos a mano»; al marcarla, la tabla de tramos se puede editar y se guarda en
  `tgm.tubosManual` (mm); al desmarcarla, `tubosManual = null`.
- Los avisos del cálculo (`TUBOS_SOLAPAN`, `TUBO_SOBRE_PERFIL`, `DESVIO_EXCEDIDO`) salen donde salen los del resto de
  puertas.
- Colores de `tokens.css` leídos con `getComputedStyle` para que el canvas se vea bien en claro y oscuro; la pareja
  más justa en el color de error cuando baja del margen.

- [ ] **Paso 1: prueba que falla**

```tsx
// src/client/puertas/SimuladorEnrolle.test.tsx
// Copiar el entorno (jsdom, render) de src/client/puertas/medidasPuertas.test.tsx.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimuladorEnrolle } from './SimuladorEnrolle';
import { enrolleTgm } from '../../puertas/tgm';
import { nuevaPuertaDeCliente } from '../../puertas/nuevaPuertaCliente';

const enrolle = () => {
  const p = nuevaPuertaDeCliente('tgm', 'enrollable');
  return enrolleTgm({ ...p, frente: 300, tgm: { ...p.tgm!, altoHueco: 400 } })!;
};

describe('simulador de enrolle', () => {
  it('muestra la separación mínima, el diámetro final y una fila por tramo', () => {
    render(<SimuladorEnrolle enrolle={enrolle()} />);
    expect(screen.getByText(/Separación mínima/)).toBeTruthy();
    expect(screen.getByText(/Diámetro final/)).toBeTruthy();
    expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(1 + 3);
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ir al punto más justo' })).toBeTruthy();
  });
});
```
Si `@testing-library/react` no está en el proyecto, usar lo mismo que use `medidasPuertas.test.tsx` (no instalar
paquetes nuevos sin preguntar).

- [ ] **Paso 2: comprobar que falla**

Ejecutar: `pnpm exec vitest run src/client/puertas/SimuladorEnrolle.test.tsx`
Esperado: FALLA, no existe `SimuladorEnrolle`.

- [ ] **Paso 3: implementación del simulador**

```tsx
// src/client/puertas/SimuladorEnrolle.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EnrolleTgm } from '../../puertas/tgm';
import { centros, construir } from '../../puertas/enrolle/geometria';

const mm = (x: number, d = 0) => x.toLocaleString('es-ES', { maximumFractionDigits: d });

export function SimuladorEnrolle({ enrolle }: { enrolle: EnrolleTgm }) {
  const { cfg, largo, colocacion: c, ajustes } = enrolle;
  const modelo = useMemo(() => construir(cfg, c.marcas, largo), [cfg, c.marcas, largo]);
  const [avance, setAvance] = useState(largo);
  const [reproduciendo, setReproduciendo] = useState(false);
  const lienzo = useRef<HTMLCanvasElement>(null);
  useEffect(() => setAvance(largo), [largo]);

  useEffect(() => {
    if (!reproduciendo) return;
    let id = 0, t0 = performance.now();
    const paso = (t: number) => {
      const v = Math.min(largo, ((t - t0) / 6000) * largo);
      setAvance(v);
      if (v < largo) id = requestAnimationFrame(paso); else setReproduciendo(false);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [reproduciendo, largo]);

  useEffect(() => {
    const cv = lienzo.current, ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const css = getComputedStyle(cv);
    const color = (v: string, d: string) => css.getPropertyValue(v).trim() || d;
    const tinta = color('--texto', '#222'), suave = color('--borde', '#999'), error = color('--error', '#c00'), acento = color('--acento', '#06c');
    const escala = cv.height / (c.diametroFinal * 1.25);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(escala, 0, 0, -escala, cv.width / 2, cv.height / 2);
    ctx.lineWidth = 1 / escala;
    ctx.strokeStyle = suave; ctx.beginPath(); ctx.arc(0, 0, cfg.diametroEnrolle / 2, 0, 2 * Math.PI); ctx.stroke();
    if (cfg.altoPerfil > 0) { ctx.fillStyle = suave; ctx.fillRect(cfg.diametroEnrolle / 2 - 1, -cfg.anchoPerfil / 2, cfg.altoPerfil + 1, cfg.anchoPerfil); }
    const q = centros(modelo, avance), justa = c.parejas[0];
    q.forEach((t, k) => {
      const enJuego = justa && (k === justa.i || k === justa.j) && justa.separacion < ajustes.margen;
      ctx.strokeStyle = enJuego ? error : avance >= modelo.tubos[k].marca ? acento : tinta;
      ctx.beginPath(); ctx.arc(t.x, t.y, cfg.diametroTubo / 2, 0, 2 * Math.PI); ctx.stroke();
    });
  }, [modelo, avance, c, cfg, ajustes]);

  const justa = c.parejas[0];
  return (
    <section className="simulador-enrolle panel">
      <canvas ref={lienzo} width={420} height={420} aria-label="Rollo de la puerta" />
      <div className="simulador-enrolle__mandos">
        <input type="range" min={0} max={largo} step={1} value={avance} onChange={e => setAvance(Number(e.target.value))} aria-label="Enrollado" />
        <span>{mm(avance)} de {mm(largo)} mm enrollados</span>
        <button type="button" className="boton" onClick={() => { setAvance(0); setReproduciendo(true); }}>Reproducir</button>
        <button type="button" className="boton" onClick={() => justa && setAvance(justa.donde)}>Ir al punto más justo</button>
      </div>
      <dl className="simulador-enrolle__datos">
        <dt>Separación mínima</dt>
        <dd>{justa ? `${mm(justa.separacion, 1)} mm, tubos ${justa.i + 1} y ${justa.j + 1}` : '—'}</dd>
        <dt>Diámetro final</dt><dd>{mm(c.diametroFinal)} mm</dd>
      </dl>
      <table className="tabla">
        <thead><tr><th>Tubo</th><th>Reparto igual</th><th>Colocado</th><th>Diferencia</th><th>Ángulo al perfil</th></tr></thead>
        <tbody>{c.marcas.map((m, k) => (
          <tr key={k}><td>{k + 1}</td><td>{mm(c.iguales[k])}</td><td>{mm(m)}</td><td>{mm(m - c.iguales[k])}</td><td>{mm(c.angulos[k])}°</td></tr>
        ))}</tbody>
      </table>
    </section>
  );
}
```
Las clases (`panel`, `boton`, `tabla`) y los nombres de variables CSS (`--texto`, `--borde`, `--error`, `--acento`)
son orientativos: usar los que existen en `src/client/coordina/tokens.css` y `piezas.css` (mirar qué usa
`ConfigurarSantaPau.tsx`). Añadir a `puertas.css` solo la maquetación de `.simulador-enrolle` (canvas a la izquierda,
datos y tabla a la derecha a partir de 1280 px).

- [ ] **Paso 4: `ConfigurarTgm` y `PuertasView`**

`ConfigurarTgm.tsx`, copiando la estructura de `ConfigurarSantaPau.tsx`: los campos de «Datos de la puerta» y
«Ajustes del enrolle» escriben en `p.tgm` con `cambiar({ ...p, tgm: { ...p.tgm!, campo } })`; el ancho de E.T. se
escribe también en `p.enrollable.anchoEt` y «abajo» en `p.enrollable.sinSaco`. Debajo, `<SimuladorEnrolle
enrolle={enrolleTgm(p)} />` si `enrolleTgm(p)` no es `null`; si es `null`, el texto «Escribe el frente y el alto del
hueco para ver el enrolle». La vista de corte, el alzado y las vistas que reciben la puerta, con
`puertaTgmDerivada(p, enrolleTgm(p)!)`.

`PuertasView.tsx`: importar `ConfigurarTgm` y, junto a la línea 73:
```tsx
  if(p.tgm)return <ConfigurarTgm p={p} cambiar={cambiar} corte={corte} derecha={derecha} letra={letra} vistas={vistas}/>;
```

- [ ] **Paso 5: comprobar**

Ejecutar: `pnpm exec vitest run --maxWorkers=6 src/client/puertas src/puertas && pnpm typecheck && pnpm lint && pnpm exec vite build`
Esperado: todo en verde.

- [ ] **Paso 6: capturas**

Arrancar la instancia aislada (`bash .claude/skills/running-toldos-testar/start-isolated.sh`), comprobar
`/api/health` (`simulationMode: true`, `fileWritesEnabled: false`), y con `.claude/skills/running-toldos-testar/drive.mjs`
crear una puerta Puertas → TGM → Enrollable de 3000 × 4000 mm con 3 tubos. Capturas en
`tmp/ui-audit/puertas-tgm/`, en claro y oscuro, a 1280×720 y 1600×1000: formulario, simulador a medio enrollar,
simulador terminado, y una con tubos a mano solapados (aviso rojo). Mirarlas: nada cortado, todo legible, colores de
CoordinaOT. Parar la instancia al terminar.

- [ ] **Paso 7: commit**

```bash
git add src/client/puertas/ConfigurarTgm.tsx src/client/puertas/SimuladorEnrolle.tsx src/client/puertas/SimuladorEnrolle.test.tsx src/client/puertas/PuertasView.tsx src/client/puertas/puertas.css
git commit -m "feat(puertas): pantalla de la puerta TGM con el simulador de enrolle"
```

---

### Tarea 8: verificación final

- [ ] `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`, todo en verde.
- [ ] `git status`: solo los ficheros de este plan; `docs/gcp/` y `paseo.json` sin tocar.
- [ ] `git diff main --stat -- src/remolques src/client/remolques`: vacío.
- [ ] Informe al coordinador: commits, pruebas ejecutadas con su resultado, capturas, y lo que quedó provisional
  (Q-TGM01..05).

---

## Nota: cambio de criterio respecto al diseño

El diseño decía «mover los tubos lo mínimo hasta el margen de 5 mm». Al probar la geometría de Codex, los tramos
iguales dejan los tubos a 6 mm (4200) y 15,5 mm (3660) en el peor momento del enrollado, y las posiciones de los HTML
de Codex (unos ±9 cm del reparto igual) los dejan a unos 80 mm. Mover «lo mínimo» daría puertas que cumplen por los
pelos. El plan usa: **separar lo más posible sin alejarse más del desvío máximo (±10 cm) de los tramos iguales**.
Pendiente de que Iván lo confirme.
