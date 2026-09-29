# Remolques · fase 2b: render 3D y ollaos según ganchos — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el dibujo de cada lona o baquetón de remolques sea un render 3D realista (three.js) y que se puedan meter los ganchos del pedido para que la web ponga los ollaos entre ellos.

**Architecture:** Tres capas separadas. (1) Cálculo puro en `src/remolques/calc/ganchos.ts`, enganchado a `calcLona` / `calcBaqueton` como un tercer modo de ollaos. (2) Una descripción pura de la escena en `src/remolques/escena/` (coordenadas 3D de la lona, el cajón, cada ollao, gancho, goma, cierre, ventana y cota), sin three.js y con pruebas. (3) El render en `src/client/remolques/render/`, que convierte esa descripción en mallas three.js, cargado aparte (`React.lazy`) y con el dibujo SVG de siempre (`Escena3D`) como respaldo.

**Tech Stack:** TypeScript, React 19, three.js (nuevo, con `@types/three`), vitest (entorno node), Playwright para la e2e en la instancia aislada.

**Spec:** `docs/superpowers/specs/2026-09-30-remolques-fase-2b-render-design.md`. Lo que hace el taller de verdad: `docs/remolques/cierres-y-acabados.md`.

## Global Constraints

- Los resultados de hoy no cambian: `src/remolques/paridad-produccion.test.ts` y `src/client/remolques/resultados-paridad.test.tsx` (32 planteamientos reales) siguen pasando sin tocarlos.
- Los modos «Repartidos» (`REPARTIDOS`) y «A medida» (`SEGUN SE INDICA`) funcionan igual; el nuevo valor es `SEGUN GANCHOS`, etiqueta «Según ganchos».
- Ganchos con el mismo convenio que los ollaos: delante y detrás de izquierda a derecha, laterales de atrás a delante; medidos **sobre el remolque**; se pasan a la lona hecha sumando la mitad de la diferencia entre la medida hecha y la del remolque (hoy 0,5 cm); nunca un 0,5 fijo en el código.
- «Medido al revés» por lado: `x → M − x` con `M` la medida del remolque de ese lado (laterales: largo; delante: ancho; detrás: ancho trasero si va sesgado).
- «Ollaos en los extremos» sí/no, por defecto sí; la distancia al borde es `primerOllao` (por defecto la de Parámetros, 2,5 cm).
- Redondeo a 0,1 cm con `excelRound(v, 1)`.
- Bloquea guardar: un lado con menos de dos ganchos o un gancho fuera de `0…M`. Solo avisa: medidas que bajan o dos ganchos en la misma posición.
- three.js solo en el trozo cargado al abrir el render (`React.lazy`); el bundle principal no lo lleva.
- Sin WebGL o si el render falla, se ve `Escena3D` con la línea «Este equipo no puede mostrar el 3D: se ve el dibujo técnico.»
- Rotulación: no se dibuja.
- Diseño igual que CoordinaOT: tokens y piezas de `src/client/coordina/` (`tira-3d` + `pestana` + `pestana-activa`, `chip-3d`, `--aviso-*`, `--surface`, `--border`, `--text`, `--text-muted`), en claro y oscuro.
- Solo escritorio (1280×720 a 1920); no adaptar a móvil.
- Textos de la interfaz y comentarios en castellano; decimales con coma (`toLocaleString('es-ES')`, `InputDecimal`). No citar el Excel en la interfaz.
- Nunca arrancar la web con el `.env` real: solo la instancia aislada `bash .claude/skills/running-toldos-testar/start-isolated.sh` (puerto 4310). RPS es de solo lectura.
- Commits en castellano explicando el porqué, terminando en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. `git add` con rutas explícitas; nada de `git add -A`, stash, reset ni checkout de ficheros ajenos. Mantener los finales de línea.

## Mapa de ficheros

Crear:
- `src/remolques/calc/ganchos.ts` — ollaos según ganchos: paso a la lona hecha, puntos medios, extremos, avisos y errores.
- `src/remolques/calc/__tests__/ganchos.test.ts`
- `src/remolques/escena/tipos.ts` — tipos de la descripción de la escena.
- `src/remolques/escena/constantes.ts` — medidas fijas del dibujo (ollao, goma, cremallera…).
- `src/remolques/escena/comun.ts` — cajón, ollaos, ganchos, gomas y caja, comunes a lona y baquetón.
- `src/remolques/escena/lona.ts`, `src/remolques/escena/baqueton.ts` — escena de cada tipo.
- `src/remolques/escena/cierres.ts`, `src/remolques/escena/ventana.ts`, `src/remolques/escena/cotas.ts`
- `src/remolques/escena/index.ts` — `construirEscena`.
- `src/remolques/escena/__tests__/escena.test.ts`, `src/remolques/escena/__tests__/detalles.test.ts`
- `src/client/remolques/render/materiales.ts`, `piezas.ts`, `cuerpo.ts`, `cajon.ts`, `herrajes.ts`, `cierres.ts`, `ventana.ts`, `mallas.ts` — mallas three.js.
- `src/client/remolques/render/camaras.ts`, `proyeccion.ts`, `CapaCotas.tsx`, `RenderRemolque.tsx` — cámaras, cotas y componente.
- `src/client/remolques/render/mallas.test.ts`, `detalles.test.ts`, `camaras.test.ts`
- `src/client/remolques/DibujoRemolque.tsx`, `useDiferido.ts`, `soporteWebGL.ts`, `DibujoRemolque.test.tsx`
- `src/client/remolques/ganchos-pantalla.test.tsx`
- `scripts/lib/remolques-e2e.mjs` — ayudas compartidas de las e2e de remolques.
- `scripts/test-remolques-2b-e2e.mjs`

Modificar:
- `src/remolques/calc/ollaos.ts` (tipos `ModoOllaos`, `RepartoLados`, `sinPosiciones`), `lona.ts`, `baqueton.ts`
- `src/remolques/pedidos/validar-planteamiento.ts` y su prueba
- `src/client/remolques/opciones.ts`, `FormularioLona.tsx`, `FormularioBaqueton.tsx`, `Resultados.tsx`, `RemolquesView.tsx`
- `src/client/coordina/remolques.css`
- `package.json`, `pnpm-lock.yaml` (three)
- `.claude/skills/running-toldos-testar/drive.mjs` (opciones de arranque del navegador)
- `scripts/test-remolques-2a-e2e.mjs` (usa las ayudas compartidas; el dibujo puede ser canvas)

## Sistema de coordenadas de la escena (lo usan las tareas 4 a 7)

- Centímetros. `y` hacia arriba, `y = 0` es el borde de arriba del cajón (donde acaba la lona; en el baquetón, donde está la cubierta plana).
- `z` a lo largo: `z = 0` es la trasera de la lona hecha (o del baquetón hecho), `z = largo` la delantera.
- `x` a lo ancho, centrado: `x < 0` es el lado **izquierdo** del remolque mirando hacia delante desde detrás.
- Ollaos de **detrás** (mirando la trasera desde fuera, de izquierda a derecha): `x = −anchoAtras/2 + p`.
- Ollaos de **delante** (mirando el frente desde fuera, de izquierda a derecha, que es `x` decreciente): `x = anchoDelante/2 − p`.
- **Laterales**, de atrás a delante: `z = p`, en `x = ±semiancho(z)` (los dos lados llevan las mismas posiciones).

---

### Task 1: Cálculo de ollaos «Según ganchos»

Modelo recomendado: el más barato (el código está completo). Esfuerzo: medio.

**Files:**
- Create: `src/remolques/calc/ganchos.ts`
- Modify: `src/remolques/calc/ollaos.ts`, `src/remolques/calc/lona.ts`, `src/remolques/calc/baqueton.ts`
- Test: `src/remolques/calc/__tests__/ganchos.test.ts`

**Interfaces:**
- Produces (en `ollaos.ts`): `type ModoOllaos = "REPARTIDOS" | "SEGUN SE INDICA" | "SEGUN GANCHOS" | ""`, `interface RepartoLados { laterales: number[]; atras: number[]; delante: number[] }`, `sinPosiciones(): RepartoLados`.
- Produces (en `ganchos.ts`): `type Lado`, `LADOS`, `NOMBRE_LADO`, `MAX_GANCHOS_POR_LADO = 11`, `type LadosAlReves = Record<Lado, boolean>`, `sinReves()`, `interface MedidaLado { remolque: number; hecha: number }`, `puntosMedios(posiciones: number[]): number[]`, `ganchosSobreLona(ganchos, medida, alReves): number[]`, `ollaosSegunGanchos(o: OpcionesGanchos): { ollaos: RepartoLados; ganchos: RepartoLados }`, `medidasRemolque(input: { largo: number; ancho: number; anchoAtras?: number }): Record<Lado, number>`, `avisosGanchos(ganchos: RepartoLados): AvisoGanchos[]`, `erroresGanchos(ganchos: RepartoLados, remolque: Record<Lado, number>): AvisoGanchos[]` con `interface AvisoGanchos { lado: Lado; mensaje: string }`.
- Produces: campos nuevos opcionales en `LonaInput` y `BaquetonInput`: `ganchos?: RepartoLados`, `ganchosAlReves?: LadosAlReves`, `ollaosExtremos?: boolean`; y en `LonaResult` y `BaquetonResult`: `ganchos?: RepartoLados` (solo en el modo `SEGUN GANCHOS`, ya sobre la lona hecha).

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/remolques/calc/__tests__/ganchos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { DEFAULT_PARAMS } from "../params.ts";
import { calcLona, type LonaInput } from "../lona.ts";
import { calcBaqueton, type BaquetonInput } from "../baqueton.ts";
import {
  avisosGanchos, erroresGanchos, ganchosSobreLona, medidasRemolque, ollaosSegunGanchos, puntosMedios, sinReves,
} from "../ganchos.ts";

// Pedidos que traen las posiciones de los ganchos del remolque en vez de las de los ollaos:
// el taller pone un ollao en el medio de cada par de ganchos (Iván, 30/09/2026).
const lona = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  largo: 250, ancho: 151, altoDelante: 62,
  tipoPerfil: "TIPO 01", recogeDelante: "NO", recogeAtras: "NO",
  modoOllaos: "SEGUN GANCHOS",
  ganchos: { laterales: [5, 125, 245], atras: [15, 75, 135], delante: [15, 75, 135] },
  ...extra,
});

describe("puntosMedios", () => {
  it("un punto en el medio de cada par seguido, ordenando antes", () => {
    expect(puntosMedios([30, 10, 20])).toEqual([15, 25]);
    expect(puntosMedios([10])).toEqual([]);
  });
  it("redondea a 0,1 cm alejándose de cero en la mitad", () => {
    expect(puntosMedios([10.5, 25.8])).toEqual([18.2]);
  });
});

describe("ganchosSobreLona", () => {
  it("suma la mitad de lo que la lona hecha es más grande que el remolque", () => {
    expect(ganchosSobreLona([15, 75], { remolque: 151, hecha: 152 }, false)).toEqual([15.5, 75.5]);
    expect(ganchosSobreLona([10], { remolque: 181, hecha: 183 }, false)).toEqual([11]);
  });
  it("medido al revés cuenta desde el otro extremo del remolque y ordena", () => {
    expect(ganchosSobreLona([16, 76, 136], { remolque: 151, hecha: 152 }, true)).toEqual([15.5, 75.5, 135.5]);
  });
});

describe("ollaosSegunGanchos", () => {
  const medidas = {
    laterales: { remolque: 250, hecha: 251 },
    atras: { remolque: 151, hecha: 152 },
    delante: { remolque: 151, hecha: 152 },
  };
  it("sin extremos, solo los puntos medios", () => {
    const r = ollaosSegunGanchos({
      ganchos: { laterales: [5, 125, 245], atras: [15, 75, 135], delante: [15, 75, 135] },
      alReves: sinReves(), extremos: false, distanciaExtremo: 2.5, medidas,
    });
    expect(r.ollaos).toEqual({ laterales: [65.5, 185.5], atras: [45.5, 105.5], delante: [45.5, 105.5] });
    expect(r.ganchos.laterales).toEqual([5.5, 125.5, 245.5]);
  });
  it("con extremos, uno a la distancia elegida de cada borde de la lona hecha", () => {
    const r = ollaosSegunGanchos({
      ganchos: { laterales: [5, 125, 245], atras: [], delante: [15, 75, 135] },
      alReves: sinReves(), extremos: true, distanciaExtremo: 4, medidas,
    });
    expect(r.ollaos.delante).toEqual([4, 45.5, 105.5, 148]);
    expect(r.ollaos.laterales).toEqual([4, 65.5, 185.5, 247]);
    // Un lado sin ganchos no inventa extremos: está sin hacer y la validación lo dice.
    expect(r.ollaos.atras).toEqual([]);
  });
});

describe("calcLona con SEGUN GANCHOS", () => {
  it("reparte los ollaos entre los ganchos y extremos a primerOllao por defecto", () => {
    const res = calcLona(lona(), DEFAULT_PARAMS);
    expect(res.lonaHecha).toEqual({ largo: 251, ancho: 152, anchoAtras: 152 });
    expect(res.reparto).toEqual({
      laterales: [2.5, 65.5, 185.5, 248.5],
      atras: [2.5, 45.5, 105.5, 149.5],
      delante: [2.5, 45.5, 105.5, 149.5],
    });
    expect(res.ganchos).toEqual({ laterales: [5.5, 125.5, 245.5], atras: [15.5, 75.5, 135.5], delante: [15.5, 75.5, 135.5] });
  });
  it("sin extremos si se pide", () => {
    expect(calcLona(lona({ ollaosExtremos: false }), DEFAULT_PARAMS).reparto.delante).toEqual([45.5, 105.5]);
  });
  it("medido al revés detrás usa el ancho trasero del remolque sesgado", () => {
    const res = calcLona(lona({
      anchoAtras: 141,
      ganchos: { laterales: [5, 125, 245], atras: [10, 130], delante: [15, 75, 135] },
      ganchosAlReves: { laterales: false, atras: true, delante: false },
    }), DEFAULT_PARAMS);
    expect(res.lonaHecha.anchoAtras).toBe(142);
    expect(res.ganchos?.atras).toEqual([11.5, 131.5]);
    expect(res.reparto.atras).toEqual([2.5, 71.5, 139.5]);
  });
  it("los otros modos no llevan ganchos en el resultado", () => {
    const res = calcLona(lona({ modoOllaos: "REPARTIDOS" }), DEFAULT_PARAMS);
    expect("ganchos" in res).toBe(false);
  });
});

describe("calcBaqueton con SEGUN GANCHOS", () => {
  const baqueton = (extra: Partial<BaquetonInput> = {}): BaquetonInput => ({
    ...emptyBaqueton(),
    largo: 181, ancho: 121, baqueton: 22,
    modoOllaos: "SEGUN GANCHOS",
    ganchos: { laterales: [10, 90, 170], atras: [20, 100], delante: [20, 100] },
    ...extra,
  });
  it("pasa los ganchos al remolque hecho del baquetón", () => {
    const res = calcBaqueton(baqueton(), DEFAULT_PARAMS);
    expect(res.remolqueHecho).toEqual({ largo: 182, ancho: 122 });
    expect(res.reparto).toEqual({
      laterales: [2.5, 50.5, 130.5, 179.5],
      atras: [2.5, 60.5, 119.5],
      delante: [2.5, 60.5, 119.5],
    });
    expect(res.ganchos?.laterales).toEqual([10.5, 90.5, 170.5]);
  });
  it("sigue la demasía del cliente, no un medio centímetro fijo", () => {
    const res = calcBaqueton(baqueton({ clienteEspecifico: "AYALA", ganchos: { laterales: [10, 90], atras: [20, 100], delante: [20, 100] } }), DEFAULT_PARAMS);
    expect(res.remolqueHecho.largo).toBe(183);
    expect(res.ganchos?.laterales).toEqual([11, 91]);
  });
});

describe("medidasRemolque", () => {
  it("detrás es el ancho trasero si va sesgado", () => {
    expect(medidasRemolque({ largo: 600, ancho: 250, anchoAtras: 200 })).toEqual({ laterales: 600, atras: 200, delante: 250 });
    expect(medidasRemolque({ largo: 600, ancho: 250 })).toEqual({ laterales: 600, atras: 250, delante: 250 });
  });
});

describe("avisos y errores", () => {
  it("avisa de medidas que bajan y de ganchos repetidos, sin bloquear", () => {
    const avisos = avisosGanchos({ laterales: [5, 100, 100], atras: [160, 110, 60], delante: [10, 60] });
    expect(avisos.map((a) => a.lado)).toEqual(["laterales", "atras"]);
    expect(avisos[0].mensaje).toBe("Hay dos ganchos de laterales en la misma posición.");
    expect(avisos[1].mensaje).toBe("Los ganchos de atrás van bajando: ¿está medido al revés? La web los ordena de menor a mayor.");
  });
  it("un lado con menos de dos ganchos o con ganchos fuera del remolque es un error", () => {
    const errores = erroresGanchos(
      { laterales: [5, 700], atras: [10], delante: [10, 60] },
      { laterales: 600, atras: 250, delante: 250 },
    );
    expect(errores).toEqual([
      { lado: "laterales", mensaje: "Hay ganchos de laterales fuera del remolque (0 a 600 cm)." },
      { lado: "atras", mensaje: "Pon al menos dos ganchos en atrás: los ollaos van entre ellos." },
    ]);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm exec vitest run src/remolques/calc/__tests__/ganchos.test.ts`
Expected: FAIL, `Failed to resolve import "../ganchos.ts"`.

- [ ] **Step 3: Tipos comunes en `ollaos.ts`**

Añadir al principio de `src/remolques/calc/ollaos.ts`, tras los imports:

```ts
/** "" = sin elegir. «SEGUN GANCHOS»: el pedido trae los ganchos y los ollaos van entre ellos. */
export type ModoOllaos = "REPARTIDOS" | "SEGUN SE INDICA" | "SEGUN GANCHOS" | "";

/** Posiciones por lado, con el convenio de siempre: delante y detrás de izquierda a derecha,
 *  laterales de atrás a delante. */
export interface RepartoLados { laterales: number[]; atras: number[]; delante: number[] }

export const sinPosiciones = (): RepartoLados => ({ laterales: [], atras: [], delante: [] });
```

- [ ] **Step 4: Crear `src/remolques/calc/ganchos.ts`**

```ts
import { excelRound } from "./redondeo.ts";
import type { RepartoLados } from "./ollaos.ts";

// Ollaos «según ganchos» (Iván, 30/09/2026): hay pedidos que traen las posiciones de los
// ganchos del remolque en vez de las de los ollaos, y el taller pone un ollao en el medio de
// cada par de ganchos y, si se quiere, uno en cada extremo. Las medidas siguen el convenio de
// los ollaos y van sobre el remolque; la lona hecha es algo más grande y va centrada, así que
// se les suma la mitad de esa diferencia. A veces el pedido viene medido desde el otro extremo.

export type Lado = keyof RepartoLados;
export const LADOS: Lado[] = ["laterales", "atras", "delante"];
export const NOMBRE_LADO: Record<Lado, string> = { laterales: "laterales", atras: "atrás", delante: "delante" };

/** Once ganchos dan diez ollaos entre ellos y, con los dos extremos, los doce que caben en la
 *  tabla de ollaos y en la hoja de taller. */
export const MAX_GANCHOS_POR_LADO = 11;

export type LadosAlReves = Record<Lado, boolean>;
export const sinReves = (): LadosAlReves => ({ laterales: false, atras: false, delante: false });

export interface MedidaLado { remolque: number; hecha: number }

export interface OpcionesGanchos {
  /** Sobre el remolque, como vienen en el pedido. */
  ganchos: RepartoLados;
  alReves: LadosAlReves;
  extremos: boolean;
  distanciaExtremo: number;
  medidas: Record<Lado, MedidaLado>;
}

export interface ResultadoGanchos {
  ollaos: RepartoLados;
  /** Ya sobre la lona hecha, ordenados. */
  ganchos: RepartoLados;
}

export interface AvisoGanchos { lado: Lado; mensaje: string }

const r1 = (v: number) => excelRound(v, 1);
const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });

export function puntosMedios(posiciones: number[]): number[] {
  const orden = [...posiciones].sort((a, b) => a - b);
  return orden.slice(1).map((p, i) => r1((orden[i] + p) / 2));
}

export function ganchosSobreLona(ganchos: number[], medida: MedidaLado, alReves: boolean): number[] {
  const desfase = (medida.hecha - medida.remolque) / 2;
  return ganchos
    .map((x) => (alReves ? medida.remolque - x : x))
    .sort((a, b) => a - b)
    .map((x) => r1(x + desfase));
}

export function ollaosSegunGanchos(o: OpcionesGanchos): ResultadoGanchos {
  const ollaos = {} as RepartoLados;
  const ganchos = {} as RepartoLados;
  for (const lado of LADOS) {
    const sobreLona = ganchosSobreLona(o.ganchos[lado], o.medidas[lado], o.alReves[lado]);
    const medios = puntosMedios(sobreLona);
    // Sin al menos dos ganchos el lado está sin hacer: no se inventan los extremos.
    ollaos[lado] = o.extremos && sobreLona.length >= 2
      ? [r1(o.distanciaExtremo), ...medios, r1(o.medidas[lado].hecha - o.distanciaExtremo)]
      : medios;
    ganchos[lado] = sobreLona;
  }
  return { ollaos, ganchos };
}

export function medidasRemolque(input: { largo: number; ancho: number; anchoAtras?: number }): Record<Lado, number> {
  const atras = (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input.ancho;
  return { laterales: input.largo, atras, delante: input.ancho };
}

export function avisosGanchos(ganchos: RepartoLados): AvisoGanchos[] {
  const avisos: AvisoGanchos[] = [];
  for (const lado of LADOS) {
    const v = ganchos[lado];
    if (new Set(v).size !== v.length) {
      avisos.push({ lado, mensaje: `Hay dos ganchos de ${NOMBRE_LADO[lado]} en la misma posición.` });
    }
    if (v.some((x, i) => i > 0 && x < v[i - 1])) {
      avisos.push({
        lado,
        mensaje: `Los ganchos de ${NOMBRE_LADO[lado]} van bajando: ¿está medido al revés? La web los ordena de menor a mayor.`,
      });
    }
  }
  return avisos;
}

export function erroresGanchos(ganchos: RepartoLados, remolque: Record<Lado, number>): AvisoGanchos[] {
  const errores: AvisoGanchos[] = [];
  for (const lado of LADOS) {
    const v = ganchos[lado];
    if (v.length < 2) {
      errores.push({ lado, mensaje: `Pon al menos dos ganchos en ${NOMBRE_LADO[lado]}: los ollaos van entre ellos.` });
    } else if (remolque[lado] > 0 && v.some((x) => x < 0 || x > remolque[lado])) {
      errores.push({
        lado,
        mensaje: `Hay ganchos de ${NOMBRE_LADO[lado]} fuera del remolque (0 a ${fmt(remolque[lado])} cm).`,
      });
    }
  }
  return errores;
}
```

Nota para quien implemente: en «avisos y errores» la prueba espera el aviso de repetidos de laterales **antes** que el de bajada de atrás; el bucle recorre `LADOS` en orden y dentro de cada lado mira primero los repetidos.

- [ ] **Step 5: Enganchar el modo en `lona.ts`**

En `src/remolques/calc/lona.ts`:

1. Imports: cambiar la línea de `ollaos.ts` y añadir la de `ganchos.ts`:

```ts
import { calcOllaos, sinPosiciones, type ModoOllaos, type OllaosResult, type RepartoLados } from "./ollaos.ts";
import { ollaosSegunGanchos, sinReves, type LadosAlReves } from "./ganchos.ts";
```

2. En `LonaInput`, sustituir `modoOllaos: "REPARTIDOS" | "SEGUN SE INDICA" | "";` por:

```ts
  modoOllaos: ModoOllaos;
```

y añadir, tras `ollaosManuales`:

```ts
  /** Con «SEGUN GANCHOS»: posiciones de los ganchos sobre el remolque, con el convenio de los ollaos. */
  ganchos?: RepartoLados;
  /** Lados que el pedido mide desde el otro extremo. */
  ganchosAlReves?: LadosAlReves;
  /** Con «SEGUN GANCHOS»: un ollao más en cada extremo, a `primerOllao` del borde. Ausente = sí. */
  ollaosExtremos?: boolean;
```

3. En `LonaResult`, tras `reparto`:

```ts
  /** Solo con «SEGUN GANCHOS»: los ganchos ya sobre la lona hecha, para dibujarlos. */
  ganchos?: RepartoLados;
```

4. Sustituir el bloque `const reparto = …;` por:

```ts
  const segunGanchos = input.modoOllaos === "SEGUN GANCHOS"
    ? ollaosSegunGanchos({
        ganchos: input.ganchos ?? sinPosiciones(),
        alReves: input.ganchosAlReves ?? sinReves(),
        extremos: input.ollaosExtremos ?? true,
        distanciaExtremo: input.primerOllao ?? params.primerOllao,
        medidas: {
          laterales: { remolque: input.largo, hecha: lonaHecha.largo },
          atras: { remolque: anchoAtras, hecha: lonaHecha.anchoAtras },
          delante: { remolque: input.ancho, hecha: lonaHecha.ancho },
        },
      })
    : null;
  // Sin modo elegido no se reparte nada: enseñar un reparto plausible que
  // nadie ha confirmado es justo el fallo que este bloque corrige, y aquí
  // acabaría dibujado en la hoja de taller.
  const reparto = input.modoOllaos === ""
    ? { laterales: [], atras: [], delante: [] }
    : segunGanchos
      ? segunGanchos.ollaos
      : input.modoOllaos === "SEGUN SE INDICA"
        ? input.ollaosManuales
        : {
            laterales: ollaos.largo.posiciones,
            atras: ollaos.anchoAtras.posiciones,
            delante: ollaos.ancho.posiciones,
          };
```

5. En el `return`, tras `ollaos, reparto, metrosTela,` añadir `...(segunGanchos ? { ganchos: segunGanchos.ganchos } : {}),` (así los otros modos no llevan la clave y la paridad no cambia).

- [ ] **Step 6: Enganchar el modo en `baqueton.ts`**

En `src/remolques/calc/baqueton.ts`:

1. Imports:

```ts
import { calcOllaos, sinPosiciones, type ModoOllaos, type OllaosResult, type RepartoLados } from "./ollaos.ts";
import { ollaosSegunGanchos, sinReves, type LadosAlReves } from "./ganchos.ts";
```

2. En `BaquetonInput`: `modoOllaos: ModoOllaos;` y, tras `ollaosManuales`, los mismos tres campos opcionales `ganchos?`, `ganchosAlReves?`, `ollaosExtremos?` con los mismos comentarios que en la lona.

3. En `BaquetonResult`, tras `reparto`: `ganchos?: RepartoLados;` con el comentario «Solo con «SEGUN GANCHOS»: los ganchos ya sobre el remolque hecho, para dibujarlos.»

4. Sustituir el bloque `const reparto = …;` por:

```ts
  const segunGanchos = input.modoOllaos === "SEGUN GANCHOS"
    ? ollaosSegunGanchos({
        ganchos: input.ganchos ?? sinPosiciones(),
        alReves: input.ganchosAlReves ?? sinReves(),
        extremos: input.ollaosExtremos ?? true,
        distanciaExtremo: input.primerOllao ?? params.primerOllao,
        medidas: {
          laterales: { remolque: input.largo, hecha: remolqueHecho.largo },
          atras: { remolque: input.ancho, hecha: remolqueHecho.ancho },
          delante: { remolque: input.ancho, hecha: remolqueHecho.ancho },
        },
      })
    : null;
  // Sin modo elegido no se reparte nada, igual que en la lona: un reparto que
  // nadie ha confirmado acabaría dibujado en la hoja de taller.
  const reparto = input.modoOllaos === ""
    ? { laterales: [], atras: [], delante: [] }
    : segunGanchos
      ? segunGanchos.ollaos
      : input.modoOllaos === "SEGUN SE INDICA"
        ? input.ollaosManuales
        : {
            laterales: ollaos.largo.posiciones,
            atras: ollaos.ancho.posiciones,
            delante: ollaos.ancho.posiciones,
          };
```

5. En el `return`, tras `ollaos, reparto,` añadir `...(segunGanchos ? { ganchos: segunGanchos.ganchos } : {}),`.

- [ ] **Step 7: Ver que pasa, y que la paridad sigue igual**

Run: `pnpm exec vitest run src/remolques src/client/remolques`
Expected: PASS todo, incluidos `paridad-produccion.test.ts` (32 casos) y `resultados-paridad.test.tsx`.

Run: `pnpm typecheck`
Expected: falla en `RemolquesView.tsx`, porque `Resultados.tsx` tiene su propio `type ModoOllaos` sin el modo nuevo. En `src/client/remolques/Resultados.tsx` sustituye la línea `type ModoOllaos = 'REPARTIDOS' | 'SEGUN SE INDICA' | '';` por `import type { ModoOllaos } from '../../remolques/calc/ollaos.ts';` (con los demás imports) y nada más; la pantalla del modo es la tarea 3. Vuelve a ejecutar `pnpm typecheck`: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/remolques/calc/ganchos.ts src/remolques/calc/__tests__/ganchos.test.ts src/remolques/calc/ollaos.ts src/remolques/calc/lona.ts src/remolques/calc/baqueton.ts src/client/remolques/Resultados.tsx
git commit -m "feat(remolques): ollaos según los ganchos del pedido

Hay pedidos que traen las posiciones de los ganchos del remolque y no las de
los ollaos; el taller pone un ollao en el medio de cada par de ganchos y, si se
quiere, uno en cada extremo. Se pasan a la lona hecha con la mitad de su
demasía y cada lado se puede marcar como medido al revés.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Validación del modo «Según ganchos»

Modelo recomendado: el más barato. Esfuerzo: bajo.

**Files:**
- Modify: `src/remolques/pedidos/validar-planteamiento.ts:75-95`
- Test: `src/remolques/pedidos/__tests__/validar-planteamiento.test.ts`

**Interfaces:**
- Consumes: `erroresGanchos`, `medidasRemolque` de `src/remolques/calc/ganchos.ts`; `sinPosiciones` de `src/remolques/calc/ollaos.ts`.
- Produces: errores con `campo: "ganchos"` (la pantalla de la tarea 3 los enseña con `erroresVisibles.ganchos`).

- [ ] **Step 1: Escribir la prueba que falla**

Añadir al final de `src/remolques/pedidos/__tests__/validar-planteamiento.test.ts` (usa el `lonaValida()` que ya hay en el fichero: largo 600, ancho 250):

```ts
describe("ollaos según ganchos", () => {
  const conGanchos = (extra = {}) => ({
    ...lonaValida(),
    modoOllaos: "SEGUN GANCHOS" as const,
    ganchos: { laterales: [5, 300, 595], atras: [10, 125, 240], delante: [10, 125, 240] },
    ...extra,
  });
  const camposGanchos = (input: Parameters<typeof erroresPlanteamiento>[0]) =>
    erroresPlanteamiento(input).filter((e) => e.campo === "ganchos").map((e) => e.mensaje);

  it("con dos o más ganchos por lado dentro del remolque es válido y no pide ollaos a medida", () => {
    expect(errorPlanteamientoIncompleto(conGanchos())).toBeNull();
  });

  it("bloquea un lado con menos de dos ganchos", () => {
    expect(camposGanchos(conGanchos({ ganchos: { laterales: [5, 595], atras: [10, 240], delante: [10] } })))
      .toEqual(["Pon al menos dos ganchos en delante: los ollaos van entre ellos."]);
  });

  it("bloquea ganchos fuera del remolque, con el ancho trasero si va sesgado", () => {
    expect(camposGanchos(conGanchos({ ganchos: { laterales: [5, 700], atras: [10, 240], delante: [10, 240] } })))
      .toEqual(["Hay ganchos de laterales fuera del remolque (0 a 600 cm)."]);
    expect(camposGanchos(conGanchos({ anchoAtras: 200 })))
      .toEqual(["Hay ganchos de atrás fuera del remolque (0 a 200 cm)."]);
  });

  it("las medidas que bajan solo son un aviso, no un error", () => {
    expect(camposGanchos(conGanchos({ ganchos: { laterales: [595, 300, 5], atras: [10, 240], delante: [10, 240] } })))
      .toEqual([]);
  });

  it("la distancia del extremo solo se valida si lleva extremos", () => {
    expect(erroresPlanteamiento(conGanchos({ primerOllao: -1 })))
      .toContainEqual(expect.objectContaining({ campo: "primerOllao" }));
    expect(erroresPlanteamiento(conGanchos({ primerOllao: -1, ollaosExtremos: false })))
      .not.toContainEqual(expect.objectContaining({ campo: "primerOllao" }));
  });

  it("vale igual para el baquetón", () => {
    const baqueton = {
      ...emptyBaqueton(),
      cabecera: { ...emptyBaqueton().cabecera, numeroPedido: "AR2603583" },
      largo: 181, ancho: 121, baqueton: 22, material: "PVC 580 AZUL", rotulacion: false,
      modoOllaos: "SEGUN GANCHOS" as const,
      ganchos: { laterales: [10, 170], atras: [20], delante: [20, 100] },
    };
    expect(camposGanchos(baqueton)).toEqual(["Pon al menos dos ganchos en atrás: los ollaos van entre ellos."]);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm exec vitest run src/remolques/pedidos/__tests__/validar-planteamiento.test.ts`
Expected: FAIL; el primer caso da «Completa los ollaos a medida de laterales, atrás, delante…» porque hoy todo lo que no es «Repartidos» se valida como «A medida».

- [ ] **Step 3: Validar el modo aparte**

En `src/remolques/pedidos/validar-planteamiento.ts`, añadir imports:

```ts
import { erroresGanchos, medidasRemolque } from "../calc/ganchos.ts";
import { sinPosiciones } from "../calc/ollaos.ts";
```

y sustituir `  } else {` (el que abre el bloque de `vacias`) por:

```ts
  } else if (input.modoOllaos === "SEGUN GANCHOS") {
    for (const error of erroresGanchos(input.ganchos ?? sinPosiciones(), medidasRemolque(input))) {
      errores.push({ campo: "ganchos", mensaje: error.mensaje });
    }
    if (input.ollaosExtremos ?? true) {
      agregar(
        !Number.isFinite(input.primerOllao) || Number(input.primerOllao) < 0,
        "primerOllao",
        "La distancia del ollao del extremo no puede ser negativa.",
      );
    }
  } else {
```

(El `else` final sigue cubriendo «A medida» y el modo sin elegir, como hoy.)

- [ ] **Step 4: Ver que pasa**

Run: `pnpm exec vitest run src/remolques`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/remolques/pedidos/validar-planteamiento.ts src/remolques/pedidos/__tests__/validar-planteamiento.test.ts
git commit -m "feat(remolques): validar los ollaos según ganchos

Un lado con menos de dos ganchos o con ganchos fuera del remolque no deja
guardar: sin ellos no se sabe dónde van los ollaos. Hasta ahora todo lo que no
era «Repartidos» se validaba como «A medida» y pedía ollaos que este modo no usa.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Pantalla del modo «Según ganchos»

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Modify: `src/client/remolques/opciones.ts`, `src/client/remolques/FormularioLona.tsx:136-149`, `src/client/remolques/FormularioBaqueton.tsx:66-79`, `src/client/remolques/Resultados.tsx`, `src/client/remolques/RemolquesView.tsx:125-142`, `src/client/coordina/remolques.css`
- Test: `src/client/remolques/ganchos-pantalla.test.tsx`

**Interfaces:**
- Consumes: de la tarea 1, `ModoOllaos`, `sinPosiciones`, `MAX_GANCHOS_POR_LADO`, `sinReves`, `avisosGanchos`; los campos `ganchos`, `ganchosAlReves`, `ollaosExtremos` de la entrada. De la tarea 2, `erroresVisibles.ganchos`.
- Produces: en `Resultados.tsx`, `interface GanchosPantalla` y `pantallaGanchos(input, error, onChange): GanchosPantalla | undefined`; prop nueva opcional `ganchos?: GanchosPantalla` en `ResultadosLona` y `ResultadosBaqueton`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/client/remolques/ganchos-pantalla.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { FormularioLona } from './FormularioLona';
import { MODOS_OLLAOS } from './opciones';
import { pantallaGanchos, ResultadosLona } from './Resultados';

const lona = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: 'TIPO 01',
  modoOllaos: 'SEGUN GANCHOS',
  ganchos: { laterales: [5, 100, 200, 295], atras: [160, 110, 60, 10], delante: [10, 60, 110, 160] },
  ...extra,
});
const desescapar = (t: string) => t.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('ollaos según ganchos en pantalla', () => {
  it('el modo aparece en el desplegable', () => {
    expect(MODOS_OLLAOS).toContainEqual({ value: 'SEGUN GANCHOS', label: 'Según ganchos' });
  });

  it('enseña el editor de ganchos, los avisos y los ollaos calculados', () => {
    const input = lona();
    const html = desescapar(renderToStaticMarkup(
      <ResultadosLona
        res={calcLona(input, DEFAULT_PARAMS)}
        modoOllaos={input.modoOllaos}
        primerOllao={2.5}
        onOllaosChange={() => {}}
        ganchos={pantallaGanchos(input, undefined, () => {})}
      />,
    ));
    expect(html).toContain('Ganchos del pedido');
    expect(html.match(/Medido al revés/g)).toHaveLength(3);
    expect(html).toContain('aria-label="DELANTE · IZQUIERDA A DERECHA, gancho 1"');
    expect(html).toContain('Los ganchos de atrás van bajando');
    // Delante: ganchos 10, 60, 110, 160 → sobre la lona 10,5… → ollaos 2,5 · 35,5 · 85,5 · 135,5 · 198,5.
    for (const valor of ['35,5', '85,5', '135,5', '198,5']) expect(html).toContain(`>${valor}<`);
    expect(html).toContain('uno en cada extremo, a 2,5 cm del borde');
  });

  it('el formulario pide los extremos y su distancia solo en este modo', () => {
    const conExtremos = renderToStaticMarkup(<FormularioLona input={lona()} materiales={[]} onChange={() => {}} />);
    expect(conExtremos).toContain('Ollaos en los extremos');
    expect(conExtremos).toContain('Extremo al borde');
    const sinExtremos = renderToStaticMarkup(<FormularioLona input={lona({ ollaosExtremos: false })} materiales={[]} onChange={() => {}} />);
    expect(sinExtremos).toContain('Ollaos en los extremos');
    expect(sinExtremos).not.toContain('Extremo al borde');
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm exec vitest run src/client/remolques/ganchos-pantalla.test.tsx`
Expected: FAIL (`pantallaGanchos` no existe; el desplegable no tiene la opción).

- [ ] **Step 3: La opción del desplegable**

En `src/client/remolques/opciones.ts`, `MODOS_OLLAOS` pasa a:

```ts
export const MODOS_OLLAOS: Opcion[] = [
  { value: 'REPARTIDOS', label: 'Repartidos automáticamente' },
  { value: 'SEGUN SE INDICA', label: 'A medida' },
  { value: 'SEGUN GANCHOS', label: 'Según ganchos' },
];
```

- [ ] **Step 4: Extremos en los dos formularios**

En `FormularioLona.tsx` y en `FormularioBaqueton.tsx`, dentro de la `rem-banda` de «Distribución de ollaos», sustituir el ternario `{input.modoOllaos === 'REPARTIDOS' ? (…) : (<p className="rem-nota …">…</p>)}` por (en el baquetón el tipo es `BaquetonInput`; el resto igual):

```tsx
          {input.modoOllaos === 'REPARTIDOS' ? (
            <>
              <CampoNum name="pasoOllaos" error={errores.pasoOllaos} label="Paso" value={input.pasoOllaos} onChange={(v) => set('pasoOllaos', v)} />
              <CampoNum name="primerOllao" error={errores.primerOllao} label="Primer ollao" value={input.primerOllao ?? DEFAULT_PARAMS.primerOllao}
                onChange={(v) => set('primerOllao', v)} />
            </>
          ) : input.modoOllaos === 'SEGUN GANCHOS' ? (
            <>
              <CampoSiNo name="ollaosExtremos" label="Ollaos en los extremos" value={input.ollaosExtremos ?? true}
                onChange={(v) => set('ollaosExtremos', v)} />
              {(input.ollaosExtremos ?? true) && (
                <CampoNum name="primerOllao" error={errores.primerOllao} label="Extremo al borde"
                  value={input.primerOllao ?? DEFAULT_PARAMS.primerOllao} onChange={(v) => set('primerOllao', v)} />
              )}
            </>
          ) : (
            <p className="rem-nota rem-span-2">Introduce las posiciones exactas en el apartado de ollaos del resultado.</p>
          )}
```

En `FormularioBaqueton.tsx` añade `CampoSiNo` al import de `./Campos` si no está.

- [ ] **Step 5: Editor de ganchos en `Resultados.tsx`**

En `src/client/remolques/Resultados.tsx`:

1. Imports (la tarea 1 ya cambió el `type ModoOllaos` local por el importado; júntalo con `sinPosiciones` en una sola línea):

```tsx
import { sinPosiciones, type ModoOllaos } from '../../remolques/calc/ollaos.ts';
import { avisosGanchos, MAX_GANCHOS_POR_LADO, sinReves } from '../../remolques/calc/ganchos.ts';
```

2. Tras `const HUECOS = …`, añadir:

```tsx
const HUECOS_GANCHOS = Array.from({ length: MAX_GANCHOS_POR_LADO }, (_, i) => i);

/** Cambia una casilla de una lista de posiciones: vaciarla la quita y no se saltan huecos.
 *  Devuelve null si el valor no vale (y entonces no se cambia nada). */
function cambiarPosicion(lista: number[], indice: number, valor: number | null, maximo: number): number[] | null {
  const siguiente = [...lista];
  if (valor === null) {
    if (indice < siguiente.length) siguiente.splice(indice, 1);
  } else {
    if (!Number.isFinite(valor) || valor <= 0 || indice > siguiente.length) return null;
    siguiente[indice] = valor;
  }
  return siguiente.slice(0, maximo);
}

export interface GanchosPantalla {
  /** Sobre el remolque, como vienen en el pedido. */
  ganchos: RepartoOllaos;
  alReves: Record<ClaveReparto, boolean>;
  extremos: boolean;
  avisos: string[];
  error?: string;
  onChange: (ganchos: RepartoOllaos, alReves: Record<ClaveReparto, boolean>) => void;
}

/** Lo que el editor de ganchos necesita de una lona o un baquetón; undefined en los otros modos. */
export function pantallaGanchos(
  input: { modoOllaos: ModoOllaos; ganchos?: RepartoOllaos; ganchosAlReves?: Record<ClaveReparto, boolean>; ollaosExtremos?: boolean },
  error: string | undefined,
  onChange: GanchosPantalla['onChange'],
): GanchosPantalla | undefined {
  if (input.modoOllaos !== 'SEGUN GANCHOS') return undefined;
  const ganchos = input.ganchos ?? sinPosiciones();
  return {
    ganchos,
    alReves: input.ganchosAlReves ?? sinReves(),
    extremos: input.ollaosExtremos ?? true,
    avisos: avisosGanchos(ganchos).map((aviso) => aviso.mensaje),
    error,
    onChange,
  };
}
```

3. En `EditorOllaos`, el cuerpo de `cambiar` pasa a usar la función común (mismo comportamiento que hoy):

```tsx
  const cambiar = (clave: ClaveReparto, indice: number, valor: number | null) => {
    const siguiente = cambiarPosicion(reparto[clave], indice, valor, 12);
    if (siguiente) onChange({ ...reparto, [clave]: siguiente });
  };
```

4. Añadir el editor de ganchos tras `EditorOllaos`:

```tsx
function EditorGanchos({ ganchos, alReves, error, onChange }: GanchosPantalla) {
  return (
    <div className={`rem-ollaos-editor${error ? ' is-invalido' : ''}`}>
      <header>
        <h4>Ganchos del pedido</h4>
        <span>Sobre el remolque · cm</span>
      </header>
      {filas.map(({ clave, nombre }) => {
        const posiciones = ganchos[clave];
        return (
          <section key={clave} className="rem-ollaos-fila">
            <div className="rem-ollaos-nombre">
              <p>{nombre}</p>
              <span>{posiciones.length} {posiciones.length === 1 ? 'gancho' : 'ganchos'}</span>
              <label className="rem-ganchos-reves">
                <input
                  type="checkbox"
                  checked={alReves[clave]}
                  onChange={(evento) => onChange(ganchos, { ...alReves, [clave]: evento.target.checked })}
                />
                Medido al revés
              </label>
            </div>
            <div className="rem-ollaos-casillas">
              {HUECOS_GANCHOS.map((indice) => (
                <label key={indice}>
                  <span>{indice + 1}</span>
                  <InputDecimal
                    data-campo={clave === 'laterales' && indice === 0 ? 'ganchos' : undefined}
                    aria-invalid={Boolean(error && posiciones.length < 2)}
                    aria-label={`${nombre}, gancho ${indice + 1}`}
                    disabled={indice > posiciones.length}
                    value={posiciones[indice]}
                    onValor={(valor) => {
                      const siguiente = cambiarPosicion(posiciones, indice, valor, MAX_GANCHOS_POR_LADO);
                      if (siguiente) onChange({ ...ganchos, [clave]: siguiente }, alReves);
                    }}
                  />
                </label>
              ))}
            </div>
          </section>
        );
      })}
      {error && <p role="alert" className="rem-error rem-ollaos-error">{error}</p>}
    </div>
  );
}
```

5. `Ollaos` recibe `ganchos?: GanchosPantalla` y su cuerpo (tras el `if (modo === '')`) pasa a:

```tsx
  return (
    <div className="rem-ollaos">
      {modo === 'SEGUN SE INDICA' ? (
        <EditorOllaos reparto={reparto} error={error} onChange={onChange} />
      ) : (
        <>
          {modo === 'SEGUN GANCHOS' && ganchos && (
            <>
              <EditorGanchos {...ganchos} />
              {ganchos.avisos.length > 0 && (
                <ul className="rem-ganchos-avisos" role="status">
                  {ganchos.avisos.map((aviso) => <li key={aviso}>{aviso}</li>)}
                </ul>
              )}
            </>
          )}
          <TablaReparto reparto={reparto} />
        </>
      )}
      {modo === 'REPARTIDOS' && (
        <p className="rem-pie-ollaos">Primer y último ollao a {fmt(primerOllao)} cm del borde.</p>
      )}
      {modo === 'SEGUN GANCHOS' && (
        <p className="rem-pie-ollaos">
          {ganchos?.extremos
            ? `Un ollao entre cada par de ganchos y uno en cada extremo, a ${fmt(primerOllao)} cm del borde.`
            : 'Un ollao entre cada par de ganchos.'}
          {' '}Posiciones sobre la lona hecha.
        </p>
      )}
    </div>
  );
```

6. `PropsComunes` añade `ganchos?: GanchosPantalla;`, y `ResultadosLona` / `ResultadosBaqueton` lo desestructuran y lo pasan a `<Ollaos … ganchos={ganchos} />`.

- [ ] **Step 6: Conectar en `RemolquesView.tsx`**

Importar `pantallaGanchos` junto a `ResultadosBaqueton, ResultadosLona`. En `<ResultadosLona …>` añadir:

```tsx
                  ganchos={pantallaGanchos(lona, ws.erroresVisibles.ganchos,
                    (ganchos, ganchosAlReves) => ws.cambiarInput({ ...lona, ganchos, ganchosAlReves }))}
```

y en `<ResultadosBaqueton …>` lo mismo con `baq`.

- [ ] **Step 7: Estilos (CoordinaOT)**

Añadir al final del bloque de ollaos de `src/client/coordina/remolques.css` (tras `.rem-ollaos-casillas …`):

```css
/* Ollaos según ganchos: «Medido al revés» bajo el nombre del lado y los avisos, con los
   tokens de aviso de CoordinaOT. */
.rem-ganchos-reves {
  align-items: center;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  font-size: 10px;
  font-weight: 600;
  gap: 4px;
}
.rem-ganchos-reves input { accent-color: var(--accent); margin: 0; }
.rem-ganchos-avisos {
  background: var(--aviso-fondo);
  border: 1px solid var(--aviso-borde);
  border-radius: 0.5rem;
  color: var(--aviso-texto);
  display: grid;
  font-size: 11px;
  font-weight: 600;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0.5rem 0.625rem;
}
```

Comprueba con `grep -n "\-\-accent:" src/client/coordina/tokens.css` que `--accent` existe; si el token del color de acento se llama de otra forma, usa ese.

- [ ] **Step 8: Ver que pasa**

Run: `pnpm exec vitest run src/client/remolques src/remolques`
Expected: PASS, incluida la paridad de `Resultados`.

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 9: Comprobarlo en la instancia aislada**

Arranca `bash .claude/skills/running-toldos-testar/start-isolated.sh` en segundo plano (si 4310 ya escucha, no la arranques otra vez). Con un script de Playwright en `tmp/` y `openApp` de `.claude/skills/running-toldos-testar/drive.mjs`: Nuevo pedido → Remolques → pedido `AR.26.99997` → «+ Remolque» → TIPO 01, 300 × 200 × 100 → «Según ganchos» → mete delante 10, 60, 110, 160 → la tabla enseña 2,5 · 35,5 · 85,5 · 135,5 · 198,5; marca «Medido al revés» en delante con 40, 90, 140, 190 y comprueba lo mismo. Captura en claro y oscuro a 1600×1000 en `tmp/ui-audit/remolques-2b/ganchos-*.png` y **mira las capturas**.

- [ ] **Step 10: Commit**

```bash
git add src/client/remolques/opciones.ts src/client/remolques/FormularioLona.tsx src/client/remolques/FormularioBaqueton.tsx src/client/remolques/Resultados.tsx src/client/remolques/RemolquesView.tsx src/client/coordina/remolques.css src/client/remolques/ganchos-pantalla.test.tsx
git commit -m "feat(remolques): meter los ganchos del pedido en pantalla

Con «Según ganchos» se meten los ganchos de cada lado sobre el remolque, se
puede marcar un lado como medido al revés y la tabla enseña los ollaos que salen.
Los avisos de medidas que bajan o repetidas se ven al momento, sin bloquear.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Escena del remolque (lógica pura)

Modelo recomendado: el más barato (el código está completo). Esfuerzo: medio.

**Files:**
- Create: `src/remolques/escena/tipos.ts`, `constantes.ts`, `comun.ts`, `lona.ts`, `baqueton.ts`, `cierres.ts`, `ventana.ts`, `cotas.ts`, `index.ts`
- Test: `src/remolques/escena/__tests__/casos.ts` (casos de prueba compartidos), `src/remolques/escena/__tests__/escena.test.ts`, `src/remolques/escena/__tests__/detalles.test.ts`

**Interfaces:**
- Consumes: `LonaInput`/`LonaResult` (con `ganchos?`), `BaquetonInput`/`BaquetonResult`, `CalcParams`, `findRecogida`, `perfilForma`, `calcularVentanaFrontal`, `colorBaseMaterial`, `puntosMedios`, `RepartoLados`.
- Produces: `construirEscena(elemento: ElementoEscena, params: CalcParams): EscenaRemolque | null`; los tipos de `tipos.ts` (`Vec3`, `Vista`, `LadoBorde`, `Marca`, `Gancho`, `Goma`, `CierreEsquina`, `CuerpoLona`, `CuerpoBaqueton`, `Cajon`, `VentanaEscena`, `CotaEscena`, `EtiquetaEscena`, `EscenaRemolque`, `ElementoEscena`); constantes de `constantes.ts`.

- [ ] **Step 1: Tipos y constantes**

Crear `src/remolques/escena/tipos.ts`:

```ts
import type { BaquetonInput, BaquetonResult } from "../calc/baqueton.ts";
import type { LonaInput, LonaResult } from "../calc/lona.ts";

// Descripción de la escena del render (fase 2b): dónde va cada cosa en centímetros, sin
// three.js, para poder probarla. Ejes: y hacia arriba (y = 0 es el borde de arriba del cajón);
// z a lo largo (0 = trasera de la lona hecha, largo = delantera); x a lo ancho, centrado, con
// x < 0 el lado izquierdo del remolque mirando hacia delante desde detrás.

export type Vec3 = [number, number, number];
export type Perfil2D = Array<[number, number]>;
export type Vista = "tres-cuartos" | "delante" | "detras" | "lateral" | "arriba";
export type LadoBorde = "delante" | "atras" | "izquierdo" | "derecho";
export type Esquina = "delante-izquierda" | "delante-derecha" | "atras-izquierda" | "atras-derecha";
export type TipoCierre = "NO" | "GOMA" | "CREMALLERA" | "VELCRO" | "PUENTES";

/** Un ollao o un gancho: su lado, su posición con el convenio de los ollaos y dónde cae. */
export interface Marca { lado: LadoBorde; posicion: number; punto: Vec3; normal: Vec3 }
/** `delPedido`: el gancho viene del pedido («Según ganchos»); si no, es uno genérico entre dos ollaos. */
export interface Gancho extends Marca { delPedido: boolean }
/** Recorrido de la goma de un lado: de ollao a gancho, en orden a lo largo del borde. */
export interface Goma { lado: LadoBorde; puntos: Vec3[] }

export interface CierreEsquina {
  esquina: Esquina;
  tipo: TipoCierre;
  /** Pie de la arista vertical de la esquina (y = 0). */
  base: Vec3;
  /** Alto de la pared en esa esquina: hasta donde sube la arista vertical. */
  alto: number;
  /** Dirección, sobre el lateral, que se aleja del paño delantero o trasero. */
  haciaLateral: Vec3;
  /** Normal hacia fuera del lateral. */
  normal: Vec3;
  /** Ancho de la oreja o solapa que dobla sobre el lateral; 0 si no lleva. */
  oreja: number;
  /** Alturas de los ollaos de la oreja (goma) o de los puentes. */
  alturas: number[];
  /** Cremallera: distancia a la esquina y alto hasta el que llega. */
  cremallera: { distancia: number; hasta: number } | null;
  /** Velcro: ancho de la tira en el borde de la oreja. */
  velcro: { ancho: number } | null;
}

export interface CuerpoLona {
  tipo: "lona";
  /** Perfiles de las caras, x centrado, emparejados punto a punto. */
  perfilDelante: Perfil2D;
  perfilAtras: Perfil2D;
  largo: number;
  /** Alto del dobladillo de la bastilla de enfundar; 0 sin bastilla. */
  bastilla: number;
}

export interface CuerpoBaqueton {
  tipo: "baqueton";
  largo: number;
  ancho: number;
  caidaLateral: number;
  caidaDelante: number;
  caidaAtras: number;
}

/** Cajón genérico de chapa galvanizada, con las medidas del remolque. */
export interface Cajon { largo: number; anchoDelante: number; anchoAtras: number; alto: number; zDesde: number; zHasta: number }

export interface VentanaEscena { centro: Vec3; ancho: number; alto: number }

/** Línea de cota, con las vistas en que se enseña. */
export interface CotaEscena { vistas: Vista[]; desde: Vec3; hasta: Vec3; texto: string }
/** Número junto a un ollao o un gancho. */
export interface EtiquetaEscena { vistas: Vista[]; punto: Vec3; texto: string }

export interface EscenaRemolque {
  cuerpo: CuerpoLona | CuerpoBaqueton;
  /** Color base del material (hex). */
  color: string;
  cajon: Cajon;
  ollaos: Marca[];
  ganchos: Gancho[];
  gomas: Goma[];
  cierres: CierreEsquina[];
  ventana: VentanaEscena | null;
  cotas: CotaEscena[];
  etiquetas: EtiquetaEscena[];
  /** Caja que envuelve lona y cajón, para encuadrar las cámaras. */
  caja: { min: Vec3; max: Vec3 };
}

export type ElementoEscena =
  | { tipo: "lona"; input: LonaInput; res: LonaResult }
  | { tipo: "baqueton"; input: BaquetonInput; res: BaquetonResult };
```

Crear `src/remolques/escena/constantes.ts`:

```ts
// Medidas del render, en cm, sacadas de lo que hace el taller (docs/remolques/cierres-y-acabados.md).

/** Aro de latón niquelado del ollao. */
export const DIAMETRO_OLLAO = 2;
/** Del centro del ollao al borde de abajo de la lona. */
export const OLLAO_AL_BORDE = 2.5;
/** Del borde de abajo de la lona (o del faldón) al gancho del cajón. */
export const GANCHO_BAJO_BORDE = 8;
/** Cuerda elástica perimetral de 6 mm. */
export const DIAMETRO_GOMA = 0.6;
/** Alto del cajón genérico; el del baquetón crece para que quepa el faldón. */
export const ALTO_CAJON = 40;
export const CAJON_BAJO_FALDON = 25;
/** Dobladillo de la bastilla de enfundar. */
export const BASTILLA = 5;
export const CREMALLERA_A_ESQUINA = 5;
export const CREMALLERA_BAJO_CIMA = 4;
export const ANCHO_VELCRO = 3;
/** Separación a lo alto de los puentes y de los ollaos de la oreja, y margen arriba y abajo. */
export const PASO_CIERRE = 20;
export const MARGEN_CIERRE = 10;
/** Demasía del paño sin recogida, si Parámetros no trae «NO». */
export const DEMASIA_SIN_RECOGIDA = 3;
/** Margen de la ventana a la cubierta, el mismo que usa el dibujo técnico. */
export const MARGEN_VENTANA = 5;
/** Las cotas van a esta distancia de la lona y las etiquetas a esta del ollao o gancho. */
export const SEPARACION_COTA = 15;
export const SEPARACION_ETIQUETA = 6;
```

- [ ] **Step 2: Escribir la prueba que falla (cuerpo, ollaos, ganchos, gomas)**

Crear `src/remolques/escena/__tests__/casos.ts` (no es una prueba: los casos que usan las dos pruebas de la escena; importar un fichero `.test.ts` desde otro repetiría sus pruebas):

```ts
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { construirEscena } from "../index.ts";

/** Lona TIPO 01 de 300 × 200 × 100 (hecha 301 × 201) con tres ollaos a medida por lado. */
export const lonaPrueba = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: "TIPO 01",
  recogeDelante: "NO", recogeAtras: "NO", material: "PVC ROJO",
  modoOllaos: "SEGUN SE INDICA",
  ollaosManuales: { laterales: [2.5, 150.5, 298.5], atras: [2.5, 100.5, 198.5], delante: [2.5, 100.5, 198.5] },
  ...extra,
});

export const escenaLona = (extra: Partial<LonaInput> = {}) => {
  const input = lonaPrueba(extra);
  return construirEscena({ tipo: "lona", input, res: calcLona(input, DEFAULT_PARAMS) }, DEFAULT_PARAMS);
};

export const escenaBaqueton = (extra: Partial<BaquetonInput> = {}) => {
  const input: BaquetonInput = { ...emptyBaqueton(), largo: 181, ancho: 121, baqueton: 22, modoOllaos: "REPARTIDOS", material: "PVC ROJO", ...extra };
  return construirEscena({ tipo: "baqueton", input, res: calcBaqueton(input, DEFAULT_PARAMS) }, DEFAULT_PARAMS);
};
```

Crear `src/remolques/escena/__tests__/escena.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { EscenaRemolque, LadoBorde } from "../tipos.ts";
import { escenaBaqueton, escenaLona } from "./casos.ts";

const delLado = (e: EscenaRemolque, lado: LadoBorde) => e.ollaos.filter((o) => o.lado === lado);

describe("escena de la lona", () => {
  const e = escenaLona()!;

  it("la lona hecha con su perfil centrado, sobre un cajón con las medidas del remolque", () => {
    expect(e.cuerpo).toMatchObject({ tipo: "lona", largo: 301, bastilla: 0 });
    if (e.cuerpo.tipo !== "lona") throw new Error("no es lona");
    expect(e.cuerpo.perfilDelante).toEqual([[-100.5, 0], [-100.5, 100], [100.5, 100], [100.5, 0]]);
    expect(e.cajon).toEqual({ largo: 300, anchoDelante: 200, anchoAtras: 200, alto: 40, zDesde: 0.5, zHasta: 300.5 });
    expect(e.caja).toEqual({ min: [-100.5, -40, 0], max: [100.5, 100, 301] });
    expect(e.color).toBe("#b82b2f");
  });

  it("cada ollao cae en su borde con el convenio de siempre", () => {
    expect(delLado(e, "atras")[0]).toEqual({ lado: "atras", posicion: 2.5, punto: [-98, 2.5, 0], normal: [0, 0, -1] });
    expect(delLado(e, "delante")[0]).toEqual({ lado: "delante", posicion: 2.5, punto: [98, 2.5, 301], normal: [0, 0, 1] });
    expect(delLado(e, "izquierdo")[1].punto).toEqual([-100.5, 2.5, 150.5]);
    expect(delLado(e, "derecho")[1].punto).toEqual([100.5, 2.5, 150.5]);
    expect(e.ollaos).toHaveLength(12);
  });

  it("sin ganchos del pedido, un gancho genérico entre cada par de ollaos, en el cajón", () => {
    const derechos = e.ganchos.filter((g) => g.lado === "derecho");
    expect(derechos.map((g) => g.posicion)).toEqual([76.5, 224.5]);
    expect(derechos[0]).toEqual({ lado: "derecho", posicion: 76.5, punto: [100, -8, 76.5], normal: [1, 0, 0], delPedido: false });
    expect(e.ganchos.find((g) => g.lado === "atras")!.punto).toEqual([-49, -8, 0.5]);
    expect(e.ganchos).toHaveLength(8);
  });

  it("la goma va de ollao a gancho a lo largo de cada borde", () => {
    expect(e.gomas).toHaveLength(4);
    expect(e.gomas.find((g) => g.lado === "derecho")!.puntos).toEqual([
      [100.5, 2.5, 2.5], [100, -8, 76.5], [100.5, 2.5, 150.5], [100, -8, 224.5], [100.5, 2.5, 298.5],
    ]);
  });

  it("en el remolque sesgado los laterales siguen el ancho de cada punto", () => {
    const sesgada = escenaLona({ anchoAtras: 150 })!;
    expect(delLado(sesgada, "derecho")[1].punto).toEqual([88, 2.5, 150.5]);
  });

  it("con «Según ganchos» los ganchos son los del pedido", () => {
    const g = escenaLona({
      modoOllaos: "SEGUN GANCHOS",
      ganchos: { laterales: [5, 100, 200, 295], atras: [10, 190], delante: [10, 190] },
    })!;
    const derechos = g.ganchos.filter((x) => x.lado === "derecho");
    expect(derechos.map((x) => x.posicion)).toEqual([5.5, 100.5, 200.5, 295.5]);
    expect(derechos.every((x) => x.delPedido)).toBe(true);
    expect(delLado(g, "derecho").map((o) => o.posicion)).toEqual([2.5, 53, 150.5, 248, 298.5]);
  });

  it("sin forma decidida no hay escena", () => {
    expect(escenaLona({ tipoPerfil: "" })).toBeNull();
    expect(escenaLona({ tipoPerfil: "TIPO 05", radioEsquina: 0 })).toBeNull();
  });
});

describe("escena del baquetón", () => {
  it("cubierta plana con faldones, ollaos en el borde del faldón y cajón más alto", () => {
    const e = escenaBaqueton()!;
    expect(e.cuerpo).toEqual({ tipo: "baqueton", largo: 182, ancho: 122, caidaLateral: 22, caidaDelante: 22, caidaAtras: 22 });
    expect(e.cajon.alto).toBe(47);
    expect(delLado(e, "derecho")[0].punto).toEqual([61, -19.5, 2.5]);
    expect(e.ganchos.find((g) => g.lado === "derecho")!.punto[1]).toBe(-30);
    expect(e.cierres).toEqual([]);
  });
  it("sin baquetón no hay escena", () => {
    expect(escenaBaqueton({ baqueton: 0 })).toBeNull();
  });
});
```

- [ ] **Step 3: Ver que falla**

Run: `pnpm exec vitest run src/remolques/escena`
Expected: FAIL, no resuelve `../index.ts`.

- [ ] **Step 4: Lo común**

Crear `src/remolques/escena/comun.ts`:

```ts
import { puntosMedios } from "../calc/ganchos.ts";
import type { RepartoLados } from "../calc/ollaos.ts";
import { GANCHO_BAJO_BORDE, OLLAO_AL_BORDE } from "./constantes.ts";
import type { Cajon, EscenaRemolque, Gancho, Goma, LadoBorde, Marca, Vec3 } from "./tipos.ts";

/** Medidas de la lona hecha (o del baquetón hecho) que fijan dónde cae cada ollao. */
export interface MedidasCuerpo { largo: number; anchoDelante: number; anchoAtras: number }
/** Altura (y) del borde de abajo de la lona o del faldón en cada lado. */
export interface Bordes { delante: number; atras: number; laterales: number }

const limitar = (t: number) => Math.min(Math.max(t, 0), 1);

export const semiancho = (m: MedidasCuerpo, z: number) =>
  (m.anchoAtras + (m.anchoDelante - m.anchoAtras) * limitar(z / m.largo)) / 2;

export function cajonDe(largoCuerpo: number, largo: number, anchoDelante: number, anchoAtras: number, alto: number): Cajon {
  // La lona hecha es algo más grande que el remolque y va centrada sobre él.
  const zDesde = (largoCuerpo - largo) / 2;
  return { largo, anchoDelante, anchoAtras, alto, zDesde, zHasta: zDesde + largo };
}

export const semianchoCajon = (c: Cajon, z: number) =>
  (c.anchoAtras + (c.anchoDelante - c.anchoAtras) * limitar((z - c.zDesde) / c.largo)) / 2;

const marca = (lado: LadoBorde, posicion: number, punto: Vec3, normal: Vec3): Marca => ({ lado, posicion, punto, normal });

export function marcasOllaos(reparto: RepartoLados, m: MedidasCuerpo, bordes: Bordes): Marca[] {
  const y = (borde: number) => borde + OLLAO_AL_BORDE;
  return [
    ...reparto.atras.map((p) => marca("atras", p, [-m.anchoAtras / 2 + p, y(bordes.atras), 0], [0, 0, -1])),
    ...reparto.delante.map((p) => marca("delante", p, [m.anchoDelante / 2 - p, y(bordes.delante), m.largo], [0, 0, 1])),
    ...reparto.laterales.flatMap((p) => [
      marca("izquierdo", p, [-semiancho(m, p), y(bordes.laterales), p], [-1, 0, 0]),
      marca("derecho", p, [semiancho(m, p), y(bordes.laterales), p], [1, 0, 0]),
    ]),
  ];
}

/** Posiciones de los ganchos: las del pedido o, si no las hay, una entre cada par de ollaos. */
export function posicionesGanchos(reparto: RepartoLados, delPedido?: RepartoLados): RepartoLados {
  return delPedido ?? {
    laterales: puntosMedios(reparto.laterales),
    atras: puntosMedios(reparto.atras),
    delante: puntosMedios(reparto.delante),
  };
}

export function marcasGanchos(pos: RepartoLados, delPedido: boolean, m: MedidasCuerpo, c: Cajon, bordes: Bordes): Gancho[] {
  const y = (borde: number) => Math.min(borde, 0) - GANCHO_BAJO_BORDE;
  const gancho = (lado: LadoBorde, posicion: number, punto: Vec3, normal: Vec3): Gancho =>
    ({ lado, posicion, punto, normal, delPedido });
  return [
    ...pos.atras.map((p) => gancho("atras", p, [-m.anchoAtras / 2 + p, y(bordes.atras), c.zDesde], [0, 0, -1])),
    ...pos.delante.map((p) => gancho("delante", p, [m.anchoDelante / 2 - p, y(bordes.delante), c.zHasta], [0, 0, 1])),
    ...pos.laterales.flatMap((p) => [
      gancho("izquierdo", p, [-semianchoCajon(c, p), y(bordes.laterales), p], [-1, 0, 0]),
      gancho("derecho", p, [semianchoCajon(c, p), y(bordes.laterales), p], [1, 0, 0]),
    ]),
  ];
}

const LADOS_BORDE: LadoBorde[] = ["delante", "atras", "izquierdo", "derecho"];

export function gomasDe(ollaos: Marca[], ganchos: Gancho[]): Goma[] {
  return LADOS_BORDE.flatMap((lado) => {
    const deOllaos = ollaos.filter((o) => o.lado === lado);
    const deGanchos = ganchos.filter((g) => g.lado === lado);
    if (deOllaos.length === 0 || deGanchos.length === 0) return [];
    // Orden estable: con la misma posición el ollao va antes que el gancho.
    const puntos = [...deOllaos, ...deGanchos].sort((a, b) => a.posicion - b.posicion).map((x) => x.punto);
    return [{ lado, puntos }];
  });
}

export function cajaDe(anchoMax: number, altoMax: number, largo: number, altoCajon: number): EscenaRemolque["caja"] {
  return { min: [-anchoMax / 2, -altoCajon, 0], max: [anchoMax / 2, altoMax, largo] };
}
```

- [ ] **Step 5: Cierres, ventana y cotas**

Crear `src/remolques/escena/cierres.ts`:

```ts
import { excelRound } from "../calc/redondeo.ts";
import { findRecogida, type CalcParams } from "../calc/params.ts";
import type { LonaInput } from "../calc/lona.ts";
import {
  ANCHO_VELCRO, CREMALLERA_A_ESQUINA, CREMALLERA_BAJO_CIMA, DEMASIA_SIN_RECOGIDA, MARGEN_CIERRE, PASO_CIERRE,
} from "./constantes.ts";
import type { CierreEsquina, CuerpoLona, Esquina, Perfil2D, TipoCierre, Vec3 } from "./tipos.ts";

const r1 = (v: number) => excelRound(v, 1);

export function tipoCierre(nombre: string): TipoCierre {
  if (nombre.startsWith("PUENTES")) return "PUENTES";
  return nombre === "GOMA" || nombre === "CREMALLERA" || nombre === "VELCRO" ? nombre : "NO";
}

/** Alturas repartidas de abajo arriba, con un margen en cada punta. */
export function alturasCierre(alto: number): number[] {
  const util = alto - 2 * MARGEN_CIERRE;
  if (util <= 0) return [r1(alto / 2)];
  const tramos = Math.max(1, Math.round(util / PASO_CIERRE));
  return Array.from({ length: tramos + 1 }, (_, i) => r1(MARGEN_CIERRE + (util * i) / tramos));
}

/** La demasía de la recogida sobre la de «NO» se reparte entre las dos esquinas del paño:
 *  es la oreja que dobla sobre el lateral. */
export function orejaRecogida(params: CalcParams, nombre: string): number {
  const sinRecogida = params.recogidas.find((r) => r.nombre === "NO")?.delante ?? DEMASIA_SIN_RECOGIDA;
  return r1(Math.max(0, (findRecogida(params, nombre).delante - sinRecogida) / 2));
}

export function cierresLona(input: LonaInput, cuerpo: CuerpoLona, params: CalcParams): CierreEsquina[] {
  const esquinas: Array<{ esquina: Esquina; nombre: string; perfil: Perfil2D; z: number; lado: -1 | 1; hacia: Vec3 }> = [
    { esquina: "delante-izquierda", nombre: input.recogeDelante, perfil: cuerpo.perfilDelante, z: cuerpo.largo, lado: -1, hacia: [0, 0, -1] },
    { esquina: "delante-derecha", nombre: input.recogeDelante, perfil: cuerpo.perfilDelante, z: cuerpo.largo, lado: 1, hacia: [0, 0, -1] },
    { esquina: "atras-izquierda", nombre: input.recogeAtras, perfil: cuerpo.perfilAtras, z: 0, lado: -1, hacia: [0, 0, 1] },
    { esquina: "atras-derecha", nombre: input.recogeAtras, perfil: cuerpo.perfilAtras, z: 0, lado: 1, hacia: [0, 0, 1] },
  ];
  return esquinas.map(({ esquina, nombre, perfil, z, lado, hacia }) => {
    const tipo = tipoCierre(nombre);
    // El segundo punto del perfil es donde acaba la pared vertical (el hombro o el arranque del radio).
    const alto = perfil[1][1];
    const semi = perfil[perfil.length - 1][0];
    const conOreja = tipo === "GOMA" || tipo === "VELCRO" || tipo === "PUENTES";
    return {
      esquina, tipo,
      base: [lado * semi, 0, z],
      alto,
      haciaLateral: hacia,
      normal: [lado, 0, 0],
      oreja: conOreja ? orejaRecogida(params, nombre) : 0,
      alturas: tipo === "GOMA" || tipo === "PUENTES" ? alturasCierre(alto) : [],
      cremallera: tipo === "CREMALLERA" ? { distancia: CREMALLERA_A_ESQUINA, hasta: r1(alto - CREMALLERA_BAJO_CIMA) } : null,
      velcro: tipo === "VELCRO" ? { ancho: ANCHO_VELCRO } : null,
    };
  });
}
```

Crear `src/remolques/escena/ventana.ts`:

```ts
import type { LonaInput } from "../calc/lona.ts";
import { calcularVentanaFrontal } from "../geometry/ventana.ts";
import { MARGEN_VENTANA } from "./constantes.ts";
import type { CuerpoLona, VentanaEscena } from "./tipos.ts";

export function ventanaLona(input: LonaInput, cuerpo: CuerpoLona): VentanaEscena | null {
  if (input.ventana !== true) return null;
  const ancho = cuerpo.perfilDelante[cuerpo.perfilDelante.length - 1][0] * 2;
  // calcularVentanaFrontal trabaja con el perfil desde x = 0, como el dibujo técnico.
  const perfil = cuerpo.perfilDelante.map(([x, y]) => [x + ancho / 2, y] as [number, number]);
  const v = calcularVentanaFrontal(perfil, ancho, MARGEN_VENTANA, { ancho: input.ventanaAncho, alto: input.ventanaAlto });
  if (!v) return null;
  // De frente, la izquierda de quien mira es x positivo.
  return { centro: [ancho / 2 - (v.x + v.ancho / 2), v.y + v.alto / 2, cuerpo.largo], ancho: v.ancho, alto: v.alto };
}
```

Crear `src/remolques/escena/cotas.ts`:

```ts
import { SEPARACION_COTA, SEPARACION_ETIQUETA } from "./constantes.ts";
import type { Cajon, CotaEscena, CuerpoBaqueton, CuerpoLona, EtiquetaEscena, Gancho, LadoBorde, Marca, Vista } from "./tipos.ts";

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });
const S = SEPARACION_COTA;

/** Vista en la que se lee cada lado; el izquierdo no tiene vista propia. */
const VISTA_DEL_LADO: Record<LadoBorde, Vista | null> = { delante: "delante", atras: "detras", derecho: "lateral", izquierdo: null };

export function cotasCuerpo(cuerpo: CuerpoLona | CuerpoBaqueton, cajon: Cajon): CotaEscena[] {
  const yAbajo = -cajon.alto - S;
  const L = cuerpo.largo;
  if (cuerpo.tipo === "lona") {
    const wD = cuerpo.perfilDelante[cuerpo.perfilDelante.length - 1][0] * 2;
    const wA = cuerpo.perfilAtras[cuerpo.perfilAtras.length - 1][0] * 2;
    const hD = Math.max(...cuerpo.perfilDelante.map(([, y]) => y));
    const hA = Math.max(...cuerpo.perfilAtras.map(([, y]) => y));
    const wMax = Math.max(wD, wA);
    return [
      { vistas: ["lateral", "tres-cuartos"], desde: [wMax / 2, yAbajo, 0], hasta: [wMax / 2, yAbajo, L], texto: fmt(L) },
      { vistas: ["arriba"], desde: [wMax / 2 + S, 0, 0], hasta: [wMax / 2 + S, 0, L], texto: fmt(L) },
      { vistas: ["delante", "tres-cuartos"], desde: [-wD / 2, yAbajo, L], hasta: [wD / 2, yAbajo, L], texto: fmt(wD) },
      { vistas: ["arriba"], desde: [-wD / 2, 0, L + S], hasta: [wD / 2, 0, L + S], texto: fmt(wD) },
      { vistas: ["detras"], desde: [-wA / 2, yAbajo, 0], hasta: [wA / 2, yAbajo, 0], texto: fmt(wA) },
      { vistas: ["delante", "tres-cuartos"], desde: [-wD / 2 - S, 0, L], hasta: [-wD / 2 - S, hD, L], texto: fmt(hD) },
      { vistas: ["lateral"], desde: [wD / 2, 0, L + S], hasta: [wD / 2, hD, L + S], texto: fmt(hD) },
      { vistas: ["detras"], desde: [wA / 2 + S, 0, 0], hasta: [wA / 2 + S, hA, 0], texto: fmt(hA) },
      { vistas: ["lateral"], desde: [wA / 2, 0, -S], hasta: [wA / 2, hA, -S], texto: fmt(hA) },
    ];
  }
  const W = cuerpo.ancho;
  return [
    { vistas: ["lateral", "tres-cuartos"], desde: [W / 2, yAbajo, 0], hasta: [W / 2, yAbajo, L], texto: fmt(L) },
    { vistas: ["arriba"], desde: [W / 2 + S, 0, 0], hasta: [W / 2 + S, 0, L], texto: fmt(L) },
    { vistas: ["delante", "tres-cuartos"], desde: [-W / 2, yAbajo, L], hasta: [W / 2, yAbajo, L], texto: fmt(W) },
    { vistas: ["arriba"], desde: [-W / 2, 0, L + S], hasta: [W / 2, 0, L + S], texto: fmt(W) },
    { vistas: ["detras"], desde: [-W / 2, yAbajo, 0], hasta: [W / 2, yAbajo, 0], texto: fmt(W) },
    { vistas: ["delante"], desde: [-W / 2 - S, 0, L], hasta: [-W / 2 - S, -cuerpo.caidaDelante, L], texto: fmt(cuerpo.caidaDelante) },
    { vistas: ["detras"], desde: [W / 2 + S, 0, 0], hasta: [W / 2 + S, -cuerpo.caidaAtras, 0], texto: fmt(cuerpo.caidaAtras) },
    { vistas: ["lateral"], desde: [W / 2, 0, -S], hasta: [W / 2, -cuerpo.caidaLateral, -S], texto: fmt(cuerpo.caidaLateral) },
  ];
}

export function etiquetasMarcas(ollaos: Marca[], ganchos: Gancho[]): EtiquetaEscena[] {
  const etiquetas: EtiquetaEscena[] = [];
  for (const o of ollaos) {
    const vista = VISTA_DEL_LADO[o.lado];
    if (vista) etiquetas.push({ vistas: [vista], punto: [o.punto[0], o.punto[1] + SEPARACION_ETIQUETA, o.punto[2]], texto: fmt(o.posicion) });
  }
  // Los ganchos genéricos no son una medida: solo se rotulan los del pedido.
  for (const g of ganchos) {
    const vista = VISTA_DEL_LADO[g.lado];
    if (vista && g.delPedido) etiquetas.push({ vistas: [vista], punto: [g.punto[0], g.punto[1] - SEPARACION_ETIQUETA, g.punto[2]], texto: fmt(g.posicion) });
  }
  return etiquetas;
}
```

- [ ] **Step 6: Escena de la lona y del baquetón**

Crear `src/remolques/escena/lona.ts`:

```ts
import type { LonaInput, LonaResult } from "../calc/lona.ts";
import type { CalcParams, TipoPerfil } from "../calc/params.ts";
import { colorBaseMaterial } from "../geometry/color-lona.ts";
import { perfilForma, type PerfilOpts } from "../geometry/perfil.ts";
import { cierresLona } from "./cierres.ts";
import { cajaDe, cajonDe, gomasDe, marcasGanchos, marcasOllaos, posicionesGanchos } from "./comun.ts";
import { ALTO_CAJON, BASTILLA } from "./constantes.ts";
import { cotasCuerpo, etiquetasMarcas } from "./cotas.ts";
import type { CuerpoLona, EscenaRemolque, Perfil2D } from "./tipos.ts";
import { ventanaLona } from "./ventana.ts";

/** El mismo criterio que el dibujo técnico: sin la forma decidida y sus medidas no hay nada que dibujar. */
export function lonaDibujable(input: LonaInput): boolean {
  if (!(input.largo > 0 && input.ancho > 0 && input.altoDelante > 0) || input.tipoPerfil === "") return false;
  if ((input.tipoPerfil === "TIPO 02" || input.tipoPerfil === "TIPO 03") && !((input.aguas ?? 0) > 0)) return false;
  if (input.tipoPerfil === "TIPO 04" && !((input.chaflan ?? 0) > 0)) return false;
  if (input.tipoPerfil === "TIPO 05" && !((input.radioEsquina ?? 0) > 0)) return false;
  return true;
}

function opcionesPerfil(input: LonaInput, ancho: number, alto: number): PerfilOpts {
  return {
    ancho, altoDelante: alto,
    alturaPico: input.aguas ?? 0,
    radioCumbrera: input.radioCumbrera ?? 0,
    radioHombro: input.radioHombro ?? 0,
    chaflan: input.chaflan ?? 0,
    radioChaflanAbajo: input.radioChaflanAbajo ?? 0,
    radioChaflanArriba: input.radioChaflanArriba ?? 0,
    radio: input.radioEsquina ?? 0,
  };
}

const centrar = (puntos: Perfil2D, ancho: number): Perfil2D => puntos.map(([x, y]) => [x - ancho / 2, y]);

export function perfilesLona(input: LonaInput, wD: number, wA: number, hD: number, hA: number) {
  const tipo = input.tipoPerfil as TipoPerfil;
  const delante = perfilForma(tipo, opcionesPerfil(input, wD, hD)).puntos;
  const calculadoAtras = perfilForma(tipo, opcionesPerfil(input, wA, hA)).puntos;
  // Las dos caras se emparejan punto a punto para tejer el contorno, como en el dibujo técnico:
  // si el acotado de radios deja distinto número de puntos, la trasera es la delantera escalada.
  const atras = calculadoAtras.length === delante.length
    ? calculadoAtras
    : delante.map(([x, y]) => [(x * wA) / wD, (y * hA) / hD] as [number, number]);
  return { delante: centrar(delante, wD), atras: centrar(atras, wA) };
}

export function escenaLona(input: LonaInput, res: LonaResult, params: CalcParams): EscenaRemolque | null {
  if (!lonaDibujable(input)) return null;
  const largo = res.lonaHecha.largo;
  const wD = res.lonaHecha.ancho;
  const wA = res.lonaHecha.anchoAtras;
  const hD = input.altoDelante;
  const hA = input.altoAtras > 0 ? input.altoAtras : input.altoDelante;
  const perfiles = perfilesLona(input, wD, wA, hD, hA);
  const cuerpo: CuerpoLona = {
    tipo: "lona", perfilDelante: perfiles.delante, perfilAtras: perfiles.atras, largo,
    bastilla: input.bastillaEnfundar ? BASTILLA : 0,
  };
  const anchoAtrasRemolque = (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input.ancho;
  const cajon = cajonDe(largo, input.largo, input.ancho, anchoAtrasRemolque, ALTO_CAJON);
  const medidas = { largo, anchoDelante: wD, anchoAtras: wA };
  const bordes = { delante: 0, atras: 0, laterales: 0 };
  const ollaos = marcasOllaos(res.reparto, medidas, bordes);
  const ganchos = marcasGanchos(posicionesGanchos(res.reparto, res.ganchos), Boolean(res.ganchos), medidas, cajon, bordes);
  return {
    cuerpo,
    color: colorBaseMaterial(input.material),
    cajon, ollaos, ganchos,
    gomas: gomasDe(ollaos, ganchos),
    cierres: cierresLona(input, cuerpo, params),
    ventana: ventanaLona(input, cuerpo),
    cotas: cotasCuerpo(cuerpo, cajon),
    etiquetas: etiquetasMarcas(ollaos, ganchos),
    caja: cajaDe(Math.max(wD, wA), Math.max(hD, hA), largo, cajon.alto),
  };
}
```

Crear `src/remolques/escena/baqueton.ts`:

```ts
import type { BaquetonInput, BaquetonResult } from "../calc/baqueton.ts";
import { colorBaseMaterial } from "../geometry/color-lona.ts";
import { cajaDe, cajonDe, gomasDe, marcasGanchos, marcasOllaos, posicionesGanchos } from "./comun.ts";
import { ALTO_CAJON, CAJON_BAJO_FALDON } from "./constantes.ts";
import { cotasCuerpo, etiquetasMarcas } from "./cotas.ts";
import type { CuerpoBaqueton, EscenaRemolque } from "./tipos.ts";

export function baquetonDibujable(input: BaquetonInput): boolean {
  return input.largo > 0 && input.ancho > 0 && input.baqueton > 0;
}

export function escenaBaqueton(input: BaquetonInput, res: BaquetonResult): EscenaRemolque | null {
  if (!baquetonDibujable(input)) return null;
  const largo = res.remolqueHecho.largo;
  const ancho = res.remolqueHecho.ancho;
  const cuerpo: CuerpoBaqueton = {
    tipo: "baqueton", largo, ancho,
    caidaLateral: input.baqueton,
    caidaDelante: res.baquetonDelantero ?? input.baqueton,
    caidaAtras: res.baquetonTrasero ?? input.baqueton,
  };
  const alto = Math.max(ALTO_CAJON, Math.max(cuerpo.caidaLateral, cuerpo.caidaDelante, cuerpo.caidaAtras) + CAJON_BAJO_FALDON);
  const cajon = cajonDe(largo, input.largo, input.ancho, input.ancho, alto);
  const medidas = { largo, anchoDelante: ancho, anchoAtras: ancho };
  const bordes = { delante: -cuerpo.caidaDelante, atras: -cuerpo.caidaAtras, laterales: -cuerpo.caidaLateral };
  const ollaos = marcasOllaos(res.reparto, medidas, bordes);
  const ganchos = marcasGanchos(posicionesGanchos(res.reparto, res.ganchos), Boolean(res.ganchos), medidas, cajon, bordes);
  return {
    cuerpo,
    color: colorBaseMaterial(input.material),
    cajon, ollaos, ganchos,
    gomas: gomasDe(ollaos, ganchos),
    cierres: [],
    ventana: null,
    cotas: cotasCuerpo(cuerpo, cajon),
    etiquetas: etiquetasMarcas(ollaos, ganchos),
    caja: cajaDe(ancho, 0, largo, cajon.alto),
  };
}
```

Crear `src/remolques/escena/index.ts`:

```ts
import type { CalcParams } from "../calc/params.ts";
import { escenaBaqueton } from "./baqueton.ts";
import { escenaLona } from "./lona.ts";
import type { ElementoEscena, EscenaRemolque } from "./tipos.ts";

export function construirEscena(elemento: ElementoEscena, params: CalcParams): EscenaRemolque | null {
  return elemento.tipo === "lona"
    ? escenaLona(elemento.input, elemento.res, params)
    : escenaBaqueton(elemento.input, elemento.res);
}
```

(Los tipos se importan siempre de `./tipos.ts`.)

- [ ] **Step 7: Ver que pasa la primera prueba**

Run: `pnpm exec vitest run src/remolques/escena/__tests__/escena.test.ts`
Expected: PASS.

- [ ] **Step 8: Prueba de cierres, ventana y cotas**

Crear `src/remolques/escena/__tests__/detalles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { alturasCierre, orejaRecogida, tipoCierre } from "../cierres.ts";
import { escenaLona } from "./casos.ts";

describe("cierres de las esquinas", () => {
  it("reconoce cada recogida", () => {
    expect(["NO", "", "GOMA", "CREMALLERA", "VELCRO", "PUENTES ESVA", "PUENTES HIJOS DE PEDRO LOPEZ"].map(tipoCierre))
      .toEqual(["NO", "NO", "GOMA", "CREMALLERA", "VELCRO", "PUENTES", "PUENTES"]);
  });

  it("la oreja es la demasía de la recogida sobre «NO», repartida en las dos esquinas", () => {
    expect(orejaRecogida(DEFAULT_PARAMS, "GOMA")).toBe(12);
    expect(orejaRecogida(DEFAULT_PARAMS, "PUENTES HIJOS DE PEDRO LOPEZ")).toBe(19.8);
    expect(orejaRecogida(DEFAULT_PARAMS, "CREMALLERA")).toBe(0);
  });

  it("reparte a lo alto con margen arriba y abajo", () => {
    expect(alturasCierre(100)).toEqual([10, 30, 50, 70, 90]);
    expect(alturasCierre(15)).toEqual([7.5]);
  });

  it("cremallera a 5 cm de la esquina y hasta 4 cm por debajo de la cima", () => {
    const e = escenaLona({ recogeDelante: "CREMALLERA" })!;
    const c = e.cierres.find((x) => x.esquina === "delante-derecha")!;
    expect(c).toMatchObject({ tipo: "CREMALLERA", base: [100.5, 0, 301], alto: 100, oreja: 0, cremallera: { distancia: 5, hasta: 96 } });
    expect(c.haciaLateral).toEqual([0, 0, -1]);
    expect(e.cierres.find((x) => x.esquina === "atras-derecha")!.tipo).toBe("NO");
  });

  it("en un perfil a dos aguas la cima de la esquina es el hombro", () => {
    const e = escenaLona({ tipoPerfil: "TIPO 02", aguas: 20, recogeAtras: "CREMALLERA" })!;
    expect(e.cierres.find((x) => x.esquina === "atras-izquierda")!.cremallera).toEqual({ distancia: 5, hasta: 76 });
  });

  it("velcro de 3 cm en la oreja y puentes repartidos a lo alto", () => {
    const e = escenaLona({ recogeDelante: "VELCRO", recogeAtras: "PUENTES HIJOS DE PEDRO LOPEZ" })!;
    expect(e.cierres.find((x) => x.esquina === "delante-izquierda")).toMatchObject({ oreja: 12, velcro: { ancho: 3 }, alturas: [] });
    expect(e.cierres.find((x) => x.esquina === "atras-izquierda")).toMatchObject({ tipo: "PUENTES", oreja: 19.8, alturas: [10, 30, 50, 70, 90] });
  });
});

describe("ventana", () => {
  it("centrada en el frente, con sus medidas", () => {
    const e = escenaLona({ ventana: true, ventanaAncho: 50, ventanaAlto: 35 })!;
    expect(e.ventana).toEqual({ centro: [0, 77.5, 301], ancho: 50, alto: 35 });
    expect(escenaLona({ ventana: false })!.ventana).toBeNull();
  });
});

describe("cotas y etiquetas", () => {
  const e = escenaLona()!;
  it("largo, ancho y altos de la lona hecha en las vistas rectas", () => {
    const textos = (vista: string) => e.cotas.filter((c) => c.vistas.includes(vista as never)).map((c) => c.texto);
    expect(textos("delante")).toEqual(["201", "100"]);
    expect(textos("lateral")).toEqual(["301", "100", "100"]);
    expect(textos("tres-cuartos")).toEqual(["301", "201", "100"]);
  });
  it("la posición de cada ollao en la vista de su lado", () => {
    const delante = e.etiquetas.filter((x) => x.vistas.includes("delante"));
    expect(delante.map((x) => x.texto)).toEqual(["2,5", "100,5", "198,5"]);
    expect(delante[0].punto).toEqual([98, 8.5, 301]);
    expect(e.etiquetas.some((x) => x.vistas.includes("arriba"))).toBe(false);
  });
});
```

- [ ] **Step 9: Ver que pasa todo**

Run: `pnpm exec vitest run src/remolques && pnpm typecheck && pnpm lint`
Expected: PASS y sin errores.

- [ ] **Step 10: Commit**

```bash
git add src/remolques/escena
git commit -m "feat(remolques): describir la escena del render en centímetros

Dónde cae cada ollao, gancho, goma, cierre, ventana y cota, calculado aparte del
render para poder probarlo: si una pieza sale mal en el 3D, se sabe si es la
medida o el dibujo.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: three.js y las mallas base (lona, baquetón, cajón, ollaos, ganchos, goma)

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `src/client/remolques/render/materiales.ts`, `piezas.ts`, `cuerpo.ts`, `cajon.ts`, `herrajes.ts`, `mallas.ts`
- Test: `src/client/remolques/render/casos-prueba.ts` (caso compartido por las pruebas del render), `src/client/remolques/render/mallas.test.ts`

**Interfaces:**
- Consumes: `EscenaRemolque` y sus tipos (tarea 4), `DIAMETRO_OLLAO`, `DIAMETRO_GOMA`.
- Produces: `type ClaveMaterial`, `type Materiales = Record<ClaveMaterial, THREE.Material>`, `crearMateriales(color: string, o: { texturas: boolean }): Materiales`, `liberarMateriales(m: Materiales): void`; `interface Pieza { geometria: THREE.BufferGeometry; material: ClaveMaterial }`, `v3`, `sobreCara(punto, normal, separacion?)`, `escalarUV`, `caminoPoligonal`; `geometriaContorno(c: CuerpoLona)`, `geometriaPano(perfil, z)`, `piezasCuerpo(c)`; `piezasCajon(c: Cajon, conBorde: boolean)`; `geometriaOllao()`, `geometriaHueco()`, `geometriaGancho()`, `geometriaGoma(g: Goma)`, `NORMAL_LADO`; `construirMallas(escena, materiales): THREE.Group`, `liberarGrupo(grupo)`.

- [ ] **Step 1: Instalar three**

Run: `pnpm add three && pnpm add -D @types/three`
Expected: `package.json` gana `three` en dependencies y `@types/three` en devDependencies; `pnpm-lock.yaml` cambia.

- [ ] **Step 2: Escribir la prueba que falla**

Crear `src/client/remolques/render/casos-prueba.ts` (no es una prueba ni lo usa la web: el caso que comparten las pruebas del render; importar un `.test.ts` desde otro repetiría sus pruebas):

```ts
import { emptyLona } from '../../../remolques/entradas-vacias.ts';
import { calcLona, type LonaInput } from '../../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../../remolques/calc/params.ts';
import { construirEscena } from '../../../remolques/escena/index.ts';
import type { EscenaRemolque } from '../../../remolques/escena/tipos.ts';

/** Lona TIPO 01 de 300 × 200 × 100 (hecha 301 × 201) con tres ollaos a medida por lado. */
export function escenaDePrueba(extra: Partial<LonaInput> = {}): EscenaRemolque {
  const input: LonaInput = {
    ...emptyLona(), largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: 'TIPO 01',
    recogeDelante: 'NO', recogeAtras: 'NO', material: 'PVC ROJO', modoOllaos: 'SEGUN SE INDICA',
    ollaosManuales: { laterales: [2.5, 150.5, 298.5], atras: [2.5, 100.5, 198.5], delante: [2.5, 100.5, 198.5] },
    ...extra,
  };
  return construirEscena({ tipo: 'lona', input, res: calcLona(input, DEFAULT_PARAMS) }, DEFAULT_PARAMS)!;
}
```

Crear `src/client/remolques/render/mallas.test.ts`:

```ts
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { emptyBaqueton } from '../../../remolques/entradas-vacias.ts';
import { calcBaqueton } from '../../../remolques/calc/baqueton.ts';
import { DEFAULT_PARAMS } from '../../../remolques/calc/params.ts';
import { construirEscena } from '../../../remolques/escena/index.ts';
import { escenaDePrueba } from './casos-prueba';
import { geometriaContorno } from './cuerpo';
import { construirMallas, liberarGrupo } from './mallas';
import { crearMateriales } from './materiales';

const mallasCon = (grupo: THREE.Group, material: THREE.Material) => {
  const lista: THREE.Mesh[] = [];
  grupo.traverse((o) => { if (o instanceof THREE.Mesh && o.material === material) lista.push(o); });
  return lista;
};

describe('mallas del render', () => {
  it('el contorno de la lona ocupa la lona hecha, con arrugas de pocos milímetros', () => {
    const escena = escenaDePrueba();
    if (escena.cuerpo.tipo !== 'lona') throw new Error('no es lona');
    const geo = geometriaContorno(escena.cuerpo);
    geo.computeBoundingBox();
    const caja = geo.boundingBox!;
    expect(caja.min.x).toBeCloseTo(-100.5, 0);
    expect(caja.max.x).toBeCloseTo(100.5, 0);
    expect(caja.min.y).toBeCloseTo(0, 0);
    expect(caja.max.y).toBeCloseTo(100, 0);
    expect(caja.min.z).toBeCloseTo(0, 5);
    expect(caja.max.z).toBeCloseTo(301, 5);
  });

  it('un aro de latón por ollao, un gancho por gancho y un tubo de goma por lado', () => {
    const escena = escenaDePrueba();
    const materiales = crearMateriales(escena.color, { texturas: false });
    const grupo = construirMallas(escena, materiales);
    const [ollaos] = mallasCon(grupo, materiales.laton) as THREE.InstancedMesh[];
    expect(ollaos.count).toBe(escena.ollaos.length);
    const [ganchos] = mallasCon(grupo, materiales.herraje) as THREE.InstancedMesh[];
    expect(ganchos.count).toBe(escena.ganchos.length);
    expect(mallasCon(grupo, materiales.goma)).toHaveLength(escena.gomas.length);
    expect(mallasCon(grupo, materiales.chapa).length).toBeGreaterThanOrEqual(2);
    liberarGrupo(grupo);
  });

  it('el baquetón es una cubierta y cuatro faldones', () => {
    const input = { ...emptyBaqueton(), largo: 181, ancho: 121, baqueton: 22, modoOllaos: 'REPARTIDOS' as const, material: 'PVC ROJO' };
    const escena = construirEscena({ tipo: 'baqueton', input, res: calcBaqueton(input, DEFAULT_PARAMS) }, DEFAULT_PARAMS)!;
    const materiales = crearMateriales(escena.color, { texturas: false });
    expect(mallasCon(construirMallas(escena, materiales), materiales.lona)).toHaveLength(5);
  });
});
```

- [ ] **Step 3: Ver que falla**

Run: `pnpm exec vitest run src/client/remolques/render/mallas.test.ts`
Expected: FAIL, no resuelve `./cuerpo`.

- [ ] **Step 4: Materiales y piezas**

Crear `src/client/remolques/render/materiales.ts`:

```ts
import * as THREE from 'three';

// Materiales del render: lona de PVC (tejido con algo de brillo), chapa galvanizada, latón de
// los ollaos, goma blanca y herrajes. Las texturas se pintan en un canvas; en las pruebas (sin
// DOM) se piden sin texturas.

export type ClaveMaterial = 'lona' | 'lonaOscura' | 'chapa' | 'laton' | 'hueco' | 'goma' | 'oscuro' | 'malla' | 'cincha' | 'herraje';
export type Materiales = Record<ClaveMaterial, THREE.Material>;

function lienzo(lado: number, pintar: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  pintar(ctx);
  const textura = new THREE.CanvasTexture(canvas);
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  return textura;
}

/** Trama y urdimbre del tejido: las UV van en centímetros, así que se repite cada 2 cm. */
function texturaTejido() {
  const t = lienzo(64, (ctx) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 4) {
      ctx.fillStyle = i % 8 ? '#9a9a9a' : '#6a6a6a';
      ctx.fillRect(i, 0, 2, 64);
      ctx.fillRect(0, i, 64, 2);
    }
  });
  t?.repeat.set(0.5, 0.5);
  return t;
}

/** Malla de la ventana: hilos opacos y huecos transparentes, cada 1,5 cm. */
function texturaRejilla() {
  const t = lienzo(32, (ctx) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 32; i += 8) {
      ctx.fillRect(i, 0, 2, 32);
      ctx.fillRect(0, i, 32, 2);
    }
  });
  t?.repeat.set(1 / 1.5, 1 / 1.5);
  return t;
}

export function crearMateriales(color: string, { texturas }: { texturas: boolean }): Materiales {
  const tejido = texturas ? texturaTejido() : null;
  const rejilla = texturas ? texturaRejilla() : null;
  const lona = (tono: THREE.Color) => new THREE.MeshPhysicalMaterial({
    color: tono, roughness: 0.62, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.55,
    side: THREE.DoubleSide, bumpMap: tejido, bumpScale: 0.15,
  });
  return {
    lona: lona(new THREE.Color(color)),
    lonaOscura: lona(new THREE.Color(color).multiplyScalar(0.8)),
    chapa: new THREE.MeshStandardMaterial({ color: '#b9bfc4', metalness: 0.85, roughness: 0.38 }),
    laton: new THREE.MeshStandardMaterial({ color: '#c8a24a', metalness: 1, roughness: 0.28 }),
    hueco: new THREE.MeshBasicMaterial({ color: '#1b1b1b' }),
    goma: new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.7 }),
    oscuro: new THREE.MeshStandardMaterial({ color: '#202225', roughness: 0.8, side: THREE.DoubleSide }),
    malla: new THREE.MeshStandardMaterial({
      color: '#2a2c2e', roughness: 0.9, side: THREE.DoubleSide,
      transparent: true, alphaMap: rejilla, opacity: rejilla ? 1 : 0.55,
    }),
    cincha: new THREE.MeshStandardMaterial({ color: '#f4f4f1', roughness: 0.85, side: THREE.DoubleSide }),
    herraje: new THREE.MeshStandardMaterial({ color: '#d4d7da', metalness: 0.9, roughness: 0.3 }),
  };
}

export function liberarMateriales(materiales: Materiales) {
  const texturas = new Set<THREE.Texture>();
  for (const material of Object.values(materiales)) {
    for (const valor of Object.values(material)) if (valor instanceof THREE.Texture) texturas.add(valor);
    material.dispose();
  }
  texturas.forEach((t) => t.dispose());
}
```

Crear `src/client/remolques/render/piezas.ts`:

```ts
import * as THREE from 'three';
import type { Vec3 } from '../../../remolques/escena/tipos.ts';
import type { ClaveMaterial } from './materiales';

export interface Pieza { geometria: THREE.BufferGeometry; material: ClaveMaterial }

export const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);

const ARRIBA = new THREE.Vector3(0, 1, 0);

/** Lleva el plano XY de una pieza a una cara vertical de normal `normal`, con su Y hacia
 *  arriba y su Z hacia fuera, en `punto` (más `separacion` hacia fuera). Siempre es un giro,
 *  nunca un espejo: con la normal (0, 0, −1) el gancho sigue abriendo hacia arriba. */
export function sobreCara(punto: Vec3 | THREE.Vector3, normal: Vec3 | THREE.Vector3, separacion = 0): THREE.Matrix4 {
  const z = (Array.isArray(normal) ? v3(normal) : normal.clone()).normalize();
  const x = new THREE.Vector3().crossVectors(ARRIBA, z).normalize();
  const p = (Array.isArray(punto) ? v3(punto) : punto.clone()).addScaledVector(z, separacion);
  return new THREE.Matrix4().makeBasis(x, ARRIBA, z).setPosition(p);
}

/** UV en centímetros, para que la trama de la lona tenga el mismo tamaño en todas las piezas. */
export function escalarUV(geo: THREE.BufferGeometry, ancho: number, alto: number) {
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * ancho, uv.getY(i) * alto);
  uv.needsUpdate = true;
  return geo;
}

/** Recorrido de tramos rectos: la goma va tensa de un punto al siguiente. */
export function caminoPoligonal(puntos: THREE.Vector3[]) {
  const camino = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < puntos.length; i += 1) camino.add(new THREE.LineCurve3(puntos[i - 1], puntos[i]));
  return camino;
}
```

- [ ] **Step 5: Cuerpo, cajón y herrajes**

Crear `src/client/remolques/render/cuerpo.ts`:

```ts
import * as THREE from 'three';
import type { CuerpoBaqueton, CuerpoLona, Perfil2D } from '../../../remolques/escena/tipos.ts';
import { escalarUV, type Pieza } from './piezas';

/** Amplitud de las arrugas del contorno: se notan con la luz rasante y no cambian la forma. */
const ARRUGA = 0.35;
/** Largo de cada tramo del contorno a lo largo del remolque. */
const TRAMO_Z = 10;

function longitudes(perfil: Perfil2D): number[] {
  const s = [0];
  for (let i = 1; i < perfil.length; i += 1) {
    s.push(s[i - 1] + Math.hypot(perfil[i][0] - perfil[i - 1][0], perfil[i][1] - perfil[i - 1][1]));
  }
  return s;
}

/** Normal hacia fuera en cada punto del perfil, que va de la base izquierda a la derecha. */
function normales(perfil: Perfil2D): Perfil2D {
  return perfil.map((_, i) => {
    const a = perfil[Math.max(i - 1, 0)];
    const b = perfil[Math.min(i + 1, perfil.length - 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const largo = Math.hypot(dx, dy) || 1;
    return [-dy / largo, dx / largo];
  });
}

export function geometriaContorno(c: CuerpoLona): THREE.BufferGeometry {
  const n = c.perfilDelante.length;
  const filas = Math.max(2, Math.ceil(c.largo / TRAMO_Z) + 1);
  const s = longitudes(c.perfilDelante);
  const posiciones: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let f = 0; f < filas; f += 1) {
    const t = f / (filas - 1);
    const z = c.largo * t;
    const perfil = c.perfilAtras.map(([x, y], i) => [
      x + (c.perfilDelante[i][0] - x) * t,
      y + (c.perfilDelante[i][1] - y) * t,
    ] as [number, number]);
    const ns = normales(perfil);
    for (let i = 0; i < n; i += 1) {
      // Las arrugas se apagan en las costuras (z = 0 y z = largo) y en el borde de abajo, que va sujeto.
      const altura = Math.min(perfil[i][1] / 20, 1);
      const a = ARRUGA * Math.sin(Math.PI * t) * altura * Math.sin(z * 0.21 + s[i] * 0.09) * Math.sin(s[i] * 0.043 + 1.3);
      posiciones.push(perfil[i][0] + ns[i][0] * a, perfil[i][1] + ns[i][1] * a, z);
      uvs.push(s[i], z);
    }
  }
  for (let f = 0; f < filas - 1; f += 1) {
    for (let i = 0; i < n - 1; i += 1) {
      const a = f * n + i;
      const b = a + 1;
      const c2 = a + n;
      const d = c2 + 1;
      indices.push(a, c2, b, b, c2, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function geometriaPano(perfil: Perfil2D, z: number): THREE.BufferGeometry {
  const forma = new THREE.Shape(perfil.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ShapeGeometry(forma, 12);
  geo.translate(0, 0, z);
  return geo;
}

function piezasBaqueton(c: CuerpoBaqueton): Pieza[] {
  const plano = (ancho: number, alto: number) => escalarUV(new THREE.PlaneGeometry(ancho, alto), ancho, alto);
  return [
    { geometria: plano(c.ancho, c.largo).rotateX(-Math.PI / 2).translate(0, 0, c.largo / 2), material: 'lona' },
    { geometria: plano(c.largo, c.caidaLateral).rotateY(Math.PI / 2).translate(c.ancho / 2, -c.caidaLateral / 2, c.largo / 2), material: 'lona' },
    { geometria: plano(c.largo, c.caidaLateral).rotateY(-Math.PI / 2).translate(-c.ancho / 2, -c.caidaLateral / 2, c.largo / 2), material: 'lona' },
    { geometria: plano(c.ancho, c.caidaDelante).translate(0, -c.caidaDelante / 2, c.largo), material: 'lona' },
    { geometria: plano(c.ancho, c.caidaAtras).rotateY(Math.PI).translate(0, -c.caidaAtras / 2, 0), material: 'lona' },
  ];
}

export function piezasCuerpo(c: CuerpoLona | CuerpoBaqueton): Pieza[] {
  if (c.tipo === 'baqueton') return piezasBaqueton(c);
  return [
    { geometria: geometriaContorno(c), material: 'lona' },
    { geometria: geometriaPano(c.perfilDelante, c.largo), material: 'lona' },
    { geometria: geometriaPano(c.perfilAtras, 0), material: 'lona' },
  ];
}
```

Crear `src/client/remolques/render/cajon.ts`:

```ts
import * as THREE from 'three';
import type { Cajon } from '../../../remolques/escena/tipos.ts';
import type { Pieza } from './piezas';

/** Caja de chapa de y = −alto a y = 0, más ancha delante o detrás si el remolque va sesgado. */
export function geometriaCajon(c: Cajon): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const t = pos.getZ(i) + 0.5;
    const semi = (c.anchoAtras + (c.anchoDelante - c.anchoAtras) * t) / 2;
    pos.setXYZ(i, pos.getX(i) * 2 * semi, (pos.getY(i) - 0.5) * c.alto, c.zDesde + c.largo * t);
  }
  geo.computeVertexNormals();
  return geo;
}

const ensanchar = (c: Cajon, cm: number, alto: number): Cajon => ({
  ...c, alto,
  anchoDelante: c.anchoDelante + 2 * cm, anchoAtras: c.anchoAtras + 2 * cm,
  largo: c.largo + 2 * cm, zDesde: c.zDesde - cm, zHasta: c.zHasta + cm,
});

/** El cajón, su nervio a media altura y, en la lona, el perfil de arriba. En el baquetón el
 *  perfil de arriba asomaría a través del faldón, que va medio centímetro por fuera. */
export function piezasCajon(c: Cajon, conBorde: boolean): Pieza[] {
  const piezas: Pieza[] = [
    { geometria: geometriaCajon(c), material: 'chapa' },
    { geometria: geometriaCajon(ensanchar(c, 0.6, 3)).translate(0, -c.alto / 2 + 1.5, 0), material: 'chapa' },
  ];
  if (conBorde) piezas.push({ geometria: geometriaCajon(ensanchar(c, 1.2, 5)), material: 'chapa' });
  return piezas;
}
```

Crear `src/client/remolques/render/herrajes.ts`:

```ts
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DIAMETRO_GOMA, DIAMETRO_OLLAO } from '../../../remolques/escena/constantes.ts';
import type { Goma, LadoBorde, Vec3 } from '../../../remolques/escena/tipos.ts';
import { caminoPoligonal, v3 } from './piezas';

export const NORMAL_LADO: Record<LadoBorde, Vec3> = {
  delante: [0, 0, 1], atras: [0, 0, -1], izquierdo: [-1, 0, 0], derecho: [1, 0, 0],
};

const TUBO_OLLAO = 0.25;

/** Aro del ollao en el plano XY, mirando a +Z. */
export const geometriaOllao = () => new THREE.TorusGeometry(DIAMETRO_OLLAO / 2 - TUBO_OLLAO, TUBO_OLLAO, 10, 24);

/** El agujero oscuro dentro del aro. */
export const geometriaHueco = () => new THREE.CircleGeometry(DIAMETRO_OLLAO / 2 - TUBO_OLLAO, 16);

/** Placa remachada al cajón y un gancho que sale por +Z y abre hacia arriba. */
export function geometriaGancho(): THREE.BufferGeometry {
  const placa = new THREE.BoxGeometry(2.4, 3.2, 0.3);
  const gancho = new THREE.TorusGeometry(0.9, 0.22, 8, 16, Math.PI);
  gancho.rotateX(Math.PI);      // media vuelta de abajo
  gancho.rotateY(Math.PI / 2);  // al plano YZ, saliendo del cajón
  gancho.translate(0, 0, 0.9);
  return mergeGeometries([placa.toNonIndexed(), gancho.toNonIndexed()])!;
}

/** Separación de la goma respecto al punto: pasa por fuera del ollao y por la punta del gancho. */
const FUERA_GOMA = 0.8;

export function geometriaGoma(goma: Goma): THREE.BufferGeometry {
  const fuera = v3(NORMAL_LADO[goma.lado]);
  const puntos = goma.puntos.map((p) => v3(p).addScaledVector(fuera, FUERA_GOMA));
  return new THREE.TubeGeometry(caminoPoligonal(puntos), Math.max(2, (puntos.length - 1) * 4), DIAMETRO_GOMA / 2, 6, false);
}
```

- [ ] **Step 6: Montar el grupo**

Crear `src/client/remolques/render/mallas.ts`:

```ts
import * as THREE from 'three';
import type { EscenaRemolque, Vec3 } from '../../../remolques/escena/tipos.ts';
import { piezasCajon } from './cajon';
import { piezasCuerpo } from './cuerpo';
import { geometriaGancho, geometriaGoma, geometriaHueco, geometriaOllao } from './herrajes';
import type { Materiales } from './materiales';
import { sobreCara, type Pieza } from './piezas';

function instancias(geometria: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[]) {
  const malla = new THREE.InstancedMesh(geometria, material, matrices.length);
  matrices.forEach((m, i) => malla.setMatrixAt(i, m));
  malla.castShadow = true;
  return malla;
}

export function construirMallas(escena: EscenaRemolque, materiales: Materiales): THREE.Group {
  const grupo = new THREE.Group();
  const anadir = ({ geometria, material }: Pieza) => {
    const malla = new THREE.Mesh(geometria, materiales[material]);
    malla.castShadow = true;
    malla.receiveShadow = true;
    grupo.add(malla);
  };
  piezasCuerpo(escena.cuerpo).forEach(anadir);
  piezasCajon(escena.cajon, escena.cuerpo.tipo === 'lona').forEach(anadir);

  const ollaos: Array<{ punto: Vec3; normal: Vec3 }> = escena.ollaos.map(({ punto, normal }) => ({ punto, normal }));
  if (ollaos.length > 0) {
    grupo.add(instancias(geometriaOllao(), materiales.laton, ollaos.map((o) => sobreCara(o.punto, o.normal, 0.25))));
    grupo.add(instancias(geometriaHueco(), materiales.hueco, ollaos.map((o) => sobreCara(o.punto, o.normal, 0.2))));
  }
  if (escena.ganchos.length > 0) {
    grupo.add(instancias(geometriaGancho(), materiales.herraje, escena.ganchos.map((g) => sobreCara(g.punto, g.normal, 0.15))));
  }
  escena.gomas.forEach((goma) => anadir({ geometria: geometriaGoma(goma), material: 'goma' }));
  return grupo;
}

export function liberarGrupo(grupo: THREE.Group) {
  grupo.traverse((objeto) => {
    if (objeto instanceof THREE.Mesh) objeto.geometry.dispose();
  });
}
```

- [ ] **Step 7: Ver que pasa**

Run: `pnpm exec vitest run src/client/remolques/render && pnpm typecheck && pnpm lint`
Expected: PASS y sin errores. Si `mergeGeometries` se queja de atributos distintos, comprueba que las dos geometrías pasan por `toNonIndexed()` y tienen `position`, `normal` y `uv`.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml src/client/remolques/render/materiales.ts src/client/remolques/render/piezas.ts src/client/remolques/render/cuerpo.ts src/client/remolques/render/cajon.ts src/client/remolques/render/herrajes.ts src/client/remolques/render/mallas.ts src/client/remolques/render/casos-prueba.ts src/client/remolques/render/mallas.test.ts
git commit -m "feat(remolques): mallas three.js de la lona, el cajón, los ollaos y la goma

La lona con su perfil, arrugas suaves y tejido de PVC sobre un cajón genérico de
chapa; ollaos de latón de 2 cm en su sitio, ganchos en el cajón y la goma de
6 mm de ollao a gancho, que es lo que el dibujo de antes no enseñaba bien.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Mallas de los detalles (cierres, ventana, bastilla, costuras)

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `src/client/remolques/render/cierres.ts`, `src/client/remolques/render/ventana.ts`
- Modify: `src/client/remolques/render/cuerpo.ts` (`piezasCuerpo`), `src/client/remolques/render/mallas.ts` (`construirMallas`)
- Test: `src/client/remolques/render/detalles.test.ts`

**Interfaces:**
- Consumes: `CierreEsquina`, `VentanaEscena`, `CuerpoLona` (tarea 4); `Pieza`, `v3`, `sobreCara`, `escalarUV`, `caminoPoligonal` (tarea 5); `ANCHO_VELCRO`.
- Produces: `piezasCierres(cierres: CierreEsquina[]): { piezas: Pieza[]; ollaos: Array<{ punto: Vec3; normal: Vec3 }>; gomas: THREE.Vector3[][] }`, `piezasVentana(v: VentanaEscena): Pieza[]`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/client/remolques/render/detalles.test.ts`:

```ts
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { escenaDePrueba } from './casos-prueba';
import { piezasCierres } from './cierres';
import { piezasCuerpo } from './cuerpo';
import { piezasVentana } from './ventana';

const cierre = (recogida: string) =>
  escenaDePrueba({ recogeDelante: recogida }).cierres.filter((c) => c.esquina === 'delante-derecha');
const maxY = (geo: THREE.BufferGeometry) => { geo.computeBoundingBox(); return geo.boundingBox!.max.y; };

describe('cierres en 3D', () => {
  it('goma: oreja con ollaos en el borde y en el lateral, y la goma en zigzag entre ellos', () => {
    const r = piezasCierres(cierre('GOMA'));
    expect(r.piezas).toHaveLength(1);
    expect(r.ollaos).toHaveLength(5 + 4);
    expect(r.gomas).toHaveLength(1);
    expect(r.gomas[0]).toHaveLength(9);
  });

  it('cremallera hasta 4 cm por debajo de la cima, con su tirador', () => {
    const r = piezasCierres(cierre('CREMALLERA'));
    expect(r.piezas.map((p) => p.material)).toEqual(['oscuro', 'herraje']);
    expect(maxY(r.piezas[0].geometria)).toBeCloseTo(96, 1);
  });

  it('velcro: la oreja y la tira de 3 cm en su borde', () => {
    expect(piezasCierres(cierre('VELCRO')).piezas.map((p) => p.material)).toEqual(['lona', 'oscuro']);
  });

  it('puentes: solapa, una placa y una anilla por altura y la cincha blanca', () => {
    const r = piezasCierres(cierre('PUENTES HIJOS DE PEDRO LOPEZ'));
    expect(r.piezas).toHaveLength(1 + 5 * 2 + 1);
    expect(r.piezas.at(-1)!.material).toBe('cincha');
  });

  it('sin recogida no se dibuja nada', () => {
    expect(piezasCierres(cierre('NO'))).toEqual({ piezas: [], ollaos: [], gomas: [] });
  });
});

describe('ventana y acabados', () => {
  it('ventana: marco, malla, persiana enrollada y dos cintas', () => {
    const escena = escenaDePrueba({ ventana: true, ventanaAncho: 50, ventanaAlto: 35 });
    const piezas = piezasVentana(escena.ventana!);
    expect(piezas.map((p) => p.material)).toEqual(['oscuro', 'malla', 'lona', 'oscuro', 'oscuro']);
    // La persiana va encima de la ventana (su borde de arriba está en 95).
    expect(maxY(piezas[2].geometria)).toBeGreaterThan(95);
  });

  it('bastilla: cuatro franjas de 5 cm en el borde de abajo; costuras en las dos caras', () => {
    const sin = piezasCuerpo(escenaDePrueba().cuerpo);
    const con = piezasCuerpo(escenaDePrueba({ bastillaEnfundar: true }).cuerpo);
    expect(con.length - sin.length).toBe(4);
    expect(maxY(con.at(-1)!.geometria)).toBeCloseTo(5, 5);
    expect(sin.filter((p) => p.material === 'lonaOscura')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm exec vitest run src/client/remolques/render/detalles.test.ts`
Expected: FAIL, no resuelve `./cierres`.

- [ ] **Step 3: Cierres**

Crear `src/client/remolques/render/cierres.ts`:

```ts
import * as THREE from 'three';
import { ANCHO_VELCRO } from '../../../remolques/escena/constantes.ts';
import type { CierreEsquina, Vec3 } from '../../../remolques/escena/tipos.ts';
import { escalarUV, sobreCara, v3, type Pieza } from './piezas';

// Cierres de las esquinas como los hace el taller (docs/remolques/cierres-y-acabados.md):
// la oreja o solapa del paño dobla sobre el lateral y encima va la goma, el velcro, la
// cremallera o los puentes con su cincha.

export interface CierresEnMallas {
  piezas: Pieza[];
  ollaos: Array<{ punto: Vec3; normal: Vec3 }>;
  gomas: THREE.Vector3[][];
}

/** Ollaos de la oreja: a esta distancia de su borde; los del lateral, a esta otra más allá. */
const OLLAO_EN_OREJA = 2.5;
const OLLAO_EN_LATERAL = 6;
/** Los puentes van a esta distancia del borde de la solapa. */
const PUENTE_EN_SOLAPA = 4;
const ANCHO_CINCHA = 2.5;
const CINCHA_SUELTA = 12;

export function piezasCierres(cierres: CierreEsquina[]): CierresEnMallas {
  const r: CierresEnMallas = { piezas: [], ollaos: [], gomas: [] };
  for (const c of cierres) {
    if (c.tipo === 'NO') continue;
    const base = v3(c.base);
    const hacia = v3(c.haciaLateral);
    const normal = v3(c.normal);
    /** Punto sobre el lateral: `a` cm desde la esquina, a `y` de alto y `fuera` cm hacia fuera. */
    const punto = (a: number, y: number, fuera: number) =>
      base.clone().addScaledVector(hacia, a).add(new THREE.Vector3(0, y, 0)).addScaledVector(normal, fuera);
    const colocar = (geometria: THREE.BufferGeometry, centro: THREE.Vector3, material: Pieza['material']) => {
      geometria.applyMatrix4(sobreCara(centro, normal));
      r.piezas.push({ geometria, material });
    };
    const plano = (ancho: number, alto: number) => escalarUV(new THREE.PlaneGeometry(ancho, alto), ancho, alto);

    if (c.oreja > 0) colocar(plano(c.oreja, c.alto), punto(c.oreja / 2, c.alto / 2, 0.35), 'lona');

    if (c.tipo === 'GOMA') {
      const enOreja = c.alturas.map((y) => punto(c.oreja - OLLAO_EN_OREJA, y, 0.4));
      const medias = c.alturas.slice(1).map((y, i) => (c.alturas[i] + y) / 2);
      const enLateral = medias.map((y) => punto(c.oreja + OLLAO_EN_LATERAL, y, 0.1));
      for (const p of [...enOreja, ...enLateral]) r.ollaos.push({ punto: [p.x, p.y, p.z], normal: c.normal });
      // Zigzag de arriba abajo: oreja, lateral, oreja…, por fuera de los ollaos.
      const zigzag: THREE.Vector3[] = [];
      enOreja.forEach((p, i) => {
        zigzag.push(p.clone().addScaledVector(normal, 0.8));
        if (enLateral[i]) zigzag.push(enLateral[i].clone().addScaledVector(normal, 0.8));
      });
      r.gomas.push(zigzag.reverse());
    }

    if (c.velcro) colocar(plano(ANCHO_VELCRO, c.alto), punto(c.oreja - ANCHO_VELCRO / 2, c.alto / 2, 0.45), 'oscuro');

    if (c.cremallera) {
      const { distancia, hasta } = c.cremallera;
      colocar(new THREE.BoxGeometry(1, hasta, 0.3), punto(distancia, hasta / 2, 0.2), 'oscuro');
      colocar(new THREE.BoxGeometry(1.2, 2.6, 0.4), punto(distancia, hasta - 2, 0.5), 'herraje');
    }

    if (c.tipo === 'PUENTES') {
      const a = c.oreja - PUENTE_EN_SOLAPA;
      for (const y of c.alturas) {
        const placa = new THREE.CylinderGeometry(1.6, 1.6, 0.25, 20).rotateX(Math.PI / 2).scale(1, 1.5, 1);
        colocar(placa, punto(a, y, 0.5), 'herraje');
        colocar(new THREE.BoxGeometry(3.2, 1.2, 0.5), punto(a, y, 0.9), 'herraje');
      }
      // La cincha sube por los puentes y abajo queda suelta para abrochar.
      colocar(plano(ANCHO_CINCHA, c.alto + CINCHA_SUELTA), punto(a, (c.alto - CINCHA_SUELTA) / 2, 1.3), 'cincha');
    }
  }
  return r;
}
```

Nota: la prueba de puentes espera `1 + 5 * 2 + 1` piezas (solapa, placa y anilla por altura, cincha) con la cincha la última; la de goma, 5 ollaos en la oreja y 4 en el lateral (uno entre cada par de alturas), y un zigzag de 9 puntos.

- [ ] **Step 4: Ventana**

Crear `src/client/remolques/render/ventana.ts`:

```ts
import * as THREE from 'three';
import type { VentanaEscena } from '../../../remolques/escena/tipos.ts';
import { escalarUV, type Pieza } from './piezas';

// Ventana de malla con borde negro y, encima, la persiana de lona enrollada y sujeta con dos
// cintas (fotos IMG_3931 e IMG_3932).
const MARCO = 2;
const RADIO_PERSIANA = 1.8;
const ANCHO_CINTA = 2.5;

export function piezasVentana(v: VentanaEscena): Pieza[] {
  const [cx, cy, z] = v.centro;
  const fuera = z + 0.3;
  const w = v.ancho / 2;
  const h = v.alto / 2;
  const exterior = new THREE.Shape([
    new THREE.Vector2(-w - MARCO, -h - MARCO), new THREE.Vector2(w + MARCO, -h - MARCO),
    new THREE.Vector2(w + MARCO, h + MARCO), new THREE.Vector2(-w - MARCO, h + MARCO),
  ]);
  exterior.holes.push(new THREE.Path([
    new THREE.Vector2(-w, -h), new THREE.Vector2(-w, h), new THREE.Vector2(w, h), new THREE.Vector2(w, -h),
  ]));
  const yPersiana = cy + h + RADIO_PERSIANA;
  const zPersiana = fuera + RADIO_PERSIANA + 0.2;
  const cinta = (x: number) => new THREE.PlaneGeometry(ANCHO_CINTA, 2 * RADIO_PERSIANA + 4)
    .translate(cx + x, yPersiana, zPersiana + RADIO_PERSIANA + 0.1);
  return [
    { geometria: new THREE.ShapeGeometry(exterior).translate(cx, cy, fuera), material: 'oscuro' },
    { geometria: escalarUV(new THREE.PlaneGeometry(v.ancho, v.alto), v.ancho, v.alto).translate(cx, cy, fuera - 0.1), material: 'malla' },
    {
      geometria: new THREE.CylinderGeometry(RADIO_PERSIANA, RADIO_PERSIANA, v.ancho + 2 * MARCO, 24)
        .rotateZ(Math.PI / 2).translate(cx, yPersiana, zPersiana),
      material: 'lona',
    },
    { geometria: cinta(-v.ancho / 3), material: 'oscuro' },
    { geometria: cinta(v.ancho / 3), material: 'oscuro' },
  ];
}
```

- [ ] **Step 5: Bastilla y costuras en `cuerpo.ts`**

En `src/client/remolques/render/cuerpo.ts`, importar `caminoPoligonal` de `./piezas` y `BASTILLA` no hace falta (la escena ya trae `c.bastilla`). Añadir antes de `piezasCuerpo`:

```ts
/** Cuadrilátero vertical de `a` a `b`, de `y = 0` a `y = alto`. */
function franja(a: THREE.Vector3, b: THREE.Vector3, alto: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const largo = a.distanceTo(b);
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    a.x, 0, a.z, b.x, 0, b.z, b.x, alto, b.z, a.x, alto, a.z,
  ], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, largo, 0, largo, alto, 0, alto], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return geo;
}

/** El dobladillo de la bastilla, un pelo por fuera de la lona para que se vea el doble. */
function piezasBastilla(c: CuerpoLona): Pieza[] {
  const wA = c.perfilAtras[c.perfilAtras.length - 1][0];
  const wD = c.perfilDelante[c.perfilDelante.length - 1][0];
  const f = 0.3;
  const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
  return [
    franja(V(-wA, -f), V(wA, -f), c.bastilla),
    franja(V(-wD, c.largo + f), V(wD, c.largo + f), c.bastilla),
    franja(V(wA + f, 0), V(wD + f, c.largo), c.bastilla),
    franja(V(-wA - f, 0), V(-wD - f, c.largo), c.bastilla),
  ].map((geometria) => ({ geometria, material: 'lonaOscura' as const }));
}

/** Costura de cada cara con el contorno: el perfil sin la base. */
function costura(perfil: Perfil2D, z: number): Pieza {
  const puntos = perfil.map(([x, y]) => new THREE.Vector3(x, y, z));
  return { geometria: new THREE.TubeGeometry(caminoPoligonal(puntos), perfil.length * 4, 0.18, 4, false), material: 'lonaOscura' };
}
```

y `piezasCuerpo` pasa a:

```ts
export function piezasCuerpo(c: CuerpoLona | CuerpoBaqueton): Pieza[] {
  if (c.tipo === 'baqueton') return piezasBaqueton(c);
  return [
    { geometria: geometriaContorno(c), material: 'lona' },
    { geometria: geometriaPano(c.perfilDelante, c.largo), material: 'lona' },
    { geometria: geometriaPano(c.perfilAtras, 0), material: 'lona' },
    costura(c.perfilDelante, c.largo),
    costura(c.perfilAtras, 0),
    ...(c.bastilla > 0 ? piezasBastilla(c) : []),
  ];
}
```

(La prueba de mallas de la tarea 5 cuenta 5 mallas de material `lona` en el baquetón; en la lona las costuras son `lonaOscura`, así que no la rompen.)

- [ ] **Step 6: Montar cierres y ventana en `mallas.ts`**

En `src/client/remolques/render/mallas.ts`, importar `piezasCierres` de `./cierres`, `piezasVentana` de `./ventana` y `caminoPoligonal` de `./piezas`. En `construirMallas`, tras `piezasCajon(…)`:

```ts
  const cierres = piezasCierres(escena.cierres);
  cierres.piezas.forEach(anadir);
  if (escena.ventana) piezasVentana(escena.ventana).forEach(anadir);
```

`ollaos` pasa a `[...escena.ollaos.map(({ punto, normal }) => ({ punto, normal })), ...cierres.ollaos]`, y tras las gomas de los bordes:

```ts
  cierres.gomas.forEach((puntos) => anadir({
    geometria: new THREE.TubeGeometry(caminoPoligonal(puntos), Math.max(2, puntos.length * 4), DIAMETRO_GOMA / 2, 6, false),
    material: 'goma',
  }));
```

(importa `DIAMETRO_GOMA` de `../../../remolques/escena/constantes.ts`).

La prueba de mallas de la tarea 5 usa recogidas «NO», así que sus cuentas no cambian.

- [ ] **Step 7: Ver que pasa**

Run: `pnpm exec vitest run src/client/remolques/render && pnpm typecheck && pnpm lint`
Expected: PASS y sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/client/remolques/render/cierres.ts src/client/remolques/render/ventana.ts src/client/remolques/render/cuerpo.ts src/client/remolques/render/mallas.ts src/client/remolques/render/detalles.test.ts
git commit -m "feat(remolques): cierres, ventana y bastilla en el render

Cada recogida se ve como la hace el taller: oreja con goma en zigzag, tira de
velcro, cremallera a 5 cm de la esquina o solapa con puentes y cincha; la
ventana de malla con su persiana enrollada, y el dobladillo de la bastilla.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Cámaras, cotas y el componente del render

Modelo recomendado: el más capaz (Opus). Esfuerzo: alto (integración con WebGL y ajuste visual).

**Files:**
- Create: `src/client/remolques/render/camaras.ts`, `proyeccion.ts`, `CapaCotas.tsx`, `RenderRemolque.tsx`
- Modify: `src/client/coordina/remolques.css`
- Test: `src/client/remolques/render/camaras.test.ts`

**Interfaces:**
- Consumes: `EscenaRemolque`, `Vista` (tarea 4); `crearMateriales`, `liberarMateriales`, `construirMallas`, `liberarGrupo` (tareas 5 y 6).
- Produces: `MARGEN_ENCUADRE`, `encuadre(caja)`, `crearCamara(vista, caja, aspecto)`; `aPantalla`, `cotasVisibles(escena, vista, camara, ancho, alto): CotasPantalla`; `CapaCotas`; `export default function RenderRemolque(props: { escena: EscenaRemolque; vista: Vista; conCotas: boolean; onFallo: () => void })`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/client/remolques/render/camaras.test.ts`:

```ts
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Vista } from '../../../remolques/escena/tipos.ts';
import { crearCamara } from './camaras';
import { escenaDePrueba } from './casos-prueba';
import { cotasVisibles } from './proyeccion';

const VISTAS: Vista[] = ['tres-cuartos', 'delante', 'detras', 'lateral', 'arriba'];

describe('cámaras', () => {
  const escena = escenaDePrueba();
  const esquinas = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(
    i & 1 ? escena.caja.max[0] : escena.caja.min[0],
    i & 2 ? escena.caja.max[1] : escena.caja.min[1],
    i & 4 ? escena.caja.max[2] : escena.caja.min[2],
  ));

  it.each(VISTAS.flatMap((v) => [[v, 16 / 10], [v, 1]] as const))('%s con aspecto %d enseña el remolque entero', (vista, aspecto) => {
    const camara = crearCamara(vista, escena.caja, aspecto);
    for (const p of esquinas) {
      const ndc = p.clone().project(camara);
      expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1);
      expect(ndc.z).toBeGreaterThan(-1);
      expect(ndc.z).toBeLessThan(1);
    }
  });

  it('las vistas rectas no tienen perspectiva', () => {
    expect(crearCamara('delante', escena.caja, 1.6)).toBeInstanceOf(THREE.OrthographicCamera);
    expect(crearCamara('tres-cuartos', escena.caja, 1.6)).toBeInstanceOf(THREE.PerspectiveCamera);
  });
});

describe('cotas en pantalla', () => {
  it('de frente, el ancho es una línea horizontal y se leen los tres ollaos de delante', () => {
    const escena = escenaDePrueba();
    const camara = crearCamara('delante', escena.caja, 1.6);
    const cotas = cotasVisibles(escena, 'delante', camara, 800, 500);
    const ancho = cotas.lineas.find((l) => l.texto === '201')!;
    expect(Math.abs(ancho.y1 - ancho.y2)).toBeLessThan(0.01);
    expect(Math.abs(ancho.x2 - ancho.x1)).toBeGreaterThan(200);
    expect(cotas.marcas.map((m) => m.texto)).toEqual(['2,5', '100,5', '198,5']);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm exec vitest run src/client/remolques/render/camaras.test.ts`
Expected: FAIL, no resuelve `./camaras`.

- [ ] **Step 3: Cámaras y proyección**

Crear `src/client/remolques/render/camaras.ts`:

```ts
import * as THREE from 'three';
import type { EscenaRemolque, Vista } from '../../../remolques/escena/tipos.ts';

/** Aire alrededor del remolque: deja sitio a las cotas, que van a 15 cm. */
export const MARGEN_ENCUADRE = 30;
const FOV = 30;

export function encuadre(caja: EscenaRemolque['caja']) {
  const min = new THREE.Vector3(...caja.min).subScalar(MARGEN_ENCUADRE);
  const max = new THREE.Vector3(...caja.max).addScalar(MARGEN_ENCUADRE);
  return { centro: min.clone().add(max).multiplyScalar(0.5), tamano: max.clone().sub(min) };
}

/** Desde dónde mira cada vista. La 3/4 mira desde delante a la derecha y algo por encima. */
const DIRECCION: Record<Vista, [number, number, number]> = {
  'tres-cuartos': [1, 0.6, 1.25],
  delante: [0, 0, 1],
  detras: [0, 0, -1],
  lateral: [1, 0, 0],
  arriba: [0, 1, 0],
};

export function crearCamara(vista: Vista, caja: EscenaRemolque['caja'], aspecto: number): THREE.Camera {
  const { centro, tamano } = encuadre(caja);
  const direccion = new THREE.Vector3(...DIRECCION[vista]).normalize();
  const radio = tamano.length() / 2;
  if (vista === 'tres-cuartos') {
    const camara = new THREE.PerspectiveCamera(FOV, aspecto, 1, radio * 20);
    // La esfera que envuelve la caja cabe en el lado más corto del encuadre.
    const semiFov = THREE.MathUtils.degToRad(FOV / 2);
    const semiFovCorto = aspecto < 1 ? Math.atan(Math.tan(semiFov) * aspecto) : semiFov;
    camara.position.copy(centro).addScaledVector(direccion, radio / Math.sin(semiFovCorto));
    camara.lookAt(centro);
    camara.updateMatrixWorld();
    return camara;
  }
  const [ancho, alto] = vista === 'delante' || vista === 'detras'
    ? [tamano.x, tamano.y]
    : vista === 'lateral' ? [tamano.z, tamano.y] : [tamano.x, tamano.z];
  let semiAncho = ancho / 2;
  let semiAlto = alto / 2;
  if (semiAncho / semiAlto > aspecto) semiAlto = semiAncho / aspecto;
  else semiAncho = semiAlto * aspecto;
  const camara = new THREE.OrthographicCamera(-semiAncho, semiAncho, semiAlto, -semiAlto, 1, radio * 8);
  camara.position.copy(centro).addScaledVector(direccion, radio * 4);
  // Vista de arriba con el frente del remolque arriba en la pantalla.
  if (vista === 'arriba') camara.up.set(0, 0, 1);
  camara.lookAt(centro);
  camara.updateProjectionMatrix();
  camara.updateMatrixWorld();
  return camara;
}
```

Crear `src/client/remolques/render/proyeccion.ts`:

```ts
import * as THREE from 'three';
import type { EscenaRemolque, Vec3, Vista } from '../../../remolques/escena/tipos.ts';

export interface LineaCota { x1: number; y1: number; x2: number; y2: number; texto: string; tx: number; ty: number }
export interface MarcaCota { x: number; y: number; texto: string }
export interface CotasPantalla { lineas: LineaCota[]; marcas: MarcaCota[] }

export function aPantalla(p: Vec3, camara: THREE.Camera, ancho: number, alto: number) {
  const v = new THREE.Vector3(p[0], p[1], p[2]).project(camara);
  return { x: ((v.x + 1) / 2) * ancho, y: ((1 - v.y) / 2) * alto };
}

export function cotasVisibles(escena: EscenaRemolque, vista: Vista, camara: THREE.Camera, ancho: number, alto: number): CotasPantalla {
  camara.updateMatrixWorld();
  const lineas = escena.cotas.filter((c) => c.vistas.includes(vista)).map((c) => {
    const a = aPantalla(c.desde, camara, ancho, alto);
    const b = aPantalla(c.hasta, camara, ancho, alto);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, texto: c.texto, tx: (a.x + b.x) / 2, ty: (a.y + b.y) / 2 };
  });
  const marcas = escena.etiquetas.filter((e) => e.vistas.includes(vista))
    .map((e) => ({ ...aPantalla(e.punto, camara, ancho, alto), texto: e.texto }));
  return { lineas, marcas };
}
```

- [ ] **Step 4: Ver que pasa**

Run: `pnpm exec vitest run src/client/remolques/render/camaras.test.ts`
Expected: PASS.

- [ ] **Step 5: La capa de cotas**

Crear `src/client/remolques/render/CapaCotas.tsx`:

```tsx
import React, { useId } from 'react';
import type { CotasPantalla } from './proyeccion';

// Cotas encima del render, en SVG: el texto se lee igual de nítido en cualquier vista.
export function CapaCotas({ cotas, ancho, alto }: { cotas: CotasPantalla; ancho: number; alto: number }) {
  const flecha = `rem-render-flecha-${useId().replace(/:/g, '')}`;
  return (
    <svg className="rem-render-cotas" width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true">
      <defs>
        <marker id={flecha} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M8 0 L0 4 L8 8 z" />
        </marker>
      </defs>
      {cotas.lineas.map((l, i) => {
        const vertical = Math.abs(l.x2 - l.x1) < Math.abs(l.y2 - l.y1);
        return (
          <g key={`l${i}`}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} markerStart={`url(#${flecha})`} markerEnd={`url(#${flecha})`} />
            <text x={vertical ? l.tx + 8 : l.tx} y={vertical ? l.ty + 4 : l.ty - 6} textAnchor={vertical ? 'start' : 'middle'}>
              {l.texto}
            </text>
          </g>
        );
      })}
      {cotas.marcas.map((m, i) => (
        <text key={`m${i}`} className="rem-render-marca" x={m.x} y={m.y} textAnchor="middle">{m.texto}</text>
      ))}
    </svg>
  );
}
```

- [ ] **Step 6: El componente del render**

Crear `src/client/remolques/render/RenderRemolque.tsx`:

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { EscenaRemolque, Vista } from '../../../remolques/escena/tipos.ts';
import { crearCamara, encuadre } from './camaras';
import { CapaCotas } from './CapaCotas';
import { construirMallas, liberarGrupo } from './mallas';
import { crearMateriales, liberarMateriales, type Materiales } from './materiales';
import { cotasVisibles, type CotasPantalla } from './proyeccion';

// Render 3D de la lona o el baquetón (fase 2b). Se carga aparte (React.lazy desde
// DibujoRemolque) para que three.js no pese en el resto de la web. Pinta a demanda: al cambiar
// la escena, la vista, el tamaño o al girar, no en bucle.

interface Motor {
  renderer: THREE.WebGLRenderer;
  escena: THREE.Scene;
  sol: THREE.DirectionalLight;
  suelo: THREE.Mesh;
  camara: THREE.Camera | null;
  controles: OrbitControls | null;
  grupo: THREE.Group | null;
  materiales: Materiales | null;
  ancho: number;
  alto: number;
}

export interface RenderRemolqueProps {
  escena: EscenaRemolque;
  vista: Vista;
  conCotas: boolean;
  onFallo: () => void;
}

export default function RenderRemolque({ escena, vista, conCotas, onFallo }: RenderRemolqueProps) {
  const lienzo = useRef<HTMLDivElement>(null);
  const motor = useRef<Motor | null>(null);
  const datos = useRef({ escena, vista, conCotas });
  datos.current = { escena, vista, conCotas };
  const onFalloRef = useRef(onFallo);
  onFalloRef.current = onFallo;
  const [cotas, setCotas] = useState<CotasPantalla | null>(null);
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });
  const [movida, setMovida] = useState(false);

  const pintar = useCallback(() => {
    const m = motor.current;
    if (!m?.camara) return;
    m.renderer.render(m.escena, m.camara);
    const d = datos.current;
    setCotas(d.conCotas ? cotasVisibles(d.escena, d.vista, m.camara, m.ancho, m.alto) : null);
  }, []);

  const colocarCamara = useCallback(() => {
    const m = motor.current;
    if (!m || m.ancho === 0 || m.alto === 0) return;
    const d = datos.current;
    m.controles?.dispose();
    m.controles = null;
    const camara = crearCamara(d.vista, d.escena.caja, m.ancho / m.alto);
    m.camara = camara;
    if (d.vista === 'tres-cuartos') {
      const controles = new OrbitControls(camara, m.renderer.domElement);
      controles.target.copy(encuadre(d.escena.caja).centro);
      controles.enablePan = false;
      // Girar alrededor, sin meterse bajo el suelo.
      controles.minPolarAngle = 0.15;
      controles.maxPolarAngle = Math.PI / 2 - 0.05;
      controles.addEventListener('change', pintar);
      controles.addEventListener('start', () => setMovida(true));
      controles.update();
      m.controles = controles;
    }
    setMovida(false);
    pintar();
  }, [pintar]);

  useEffect(() => {
    const caja = lienzo.current;
    if (!caja) return undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      // preserveDrawingBuffer: la e2e lee los píxeles y la fase 4 capturará cada vista para el PDF.
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      onFalloRef.current();
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('role', 'img');
    caja.appendChild(renderer.domElement);

    const escena3D = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    escena3D.environment = entorno;
    escena3D.add(new THREE.HemisphereLight(0xffffff, 0x9aa0a6, 0.8));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.bias = -0.0004;
    escena3D.add(sol, sol.target);
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.16 }));
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    escena3D.add(suelo);
    motor.current = { renderer, escena: escena3D, sol, suelo, camara: null, controles: null, grupo: null, materiales: null, ancho: 0, alto: 0 };

    const observador = new ResizeObserver(([entrada]) => {
      const m = motor.current;
      const { width, height } = entrada.contentRect;
      if (!m || width === 0 || height === 0) return;
      m.ancho = width;
      m.alto = height;
      renderer.setSize(width, height, false);
      setTamano({ ancho: width, alto: height });
      colocarCamara();
    });
    observador.observe(caja);

    return () => {
      observador.disconnect();
      const m = motor.current;
      m?.controles?.dispose();
      if (m?.grupo) liberarGrupo(m.grupo);
      if (m?.materiales) liberarMateriales(m.materiales);
      entorno.dispose();
      pmrem.dispose();
      suelo.geometry.dispose();
      (suelo.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      motor.current = null;
    };
  }, [colocarCamara]);

  useEffect(() => {
    const m = motor.current;
    if (!m) return;
    if (m.grupo) {
      m.escena.remove(m.grupo);
      liberarGrupo(m.grupo);
    }
    if (m.materiales) liberarMateriales(m.materiales);
    m.materiales = crearMateriales(escena.color, { texturas: true });
    m.grupo = construirMallas(escena, m.materiales);
    m.escena.add(m.grupo);
    m.renderer.domElement.setAttribute('aria-label', escena.cuerpo.tipo === 'lona'
      ? 'Render de la lona sobre el remolque'
      : 'Render del baquetón sobre el remolque');
    const { centro, tamano: t } = encuadre(escena.caja);
    const radio = t.length() / 2;
    m.sol.position.copy(centro).add(new THREE.Vector3(0.6, 1.3, 0.9).normalize().multiplyScalar(radio * 3));
    m.sol.target.position.copy(centro);
    const sombra = m.sol.shadow.camera;
    sombra.left = -radio; sombra.right = radio; sombra.top = radio; sombra.bottom = -radio;
    sombra.near = 1; sombra.far = radio * 6;
    sombra.updateProjectionMatrix();
    m.suelo.scale.set(t.x * 4, t.z * 4, 1);
    m.suelo.position.set(centro.x, escena.caja.min[1] - 0.05, centro.z);
    colocarCamara();
  }, [escena, colocarCamara]);

  useEffect(() => { colocarCamara(); }, [vista, colocarCamara]);
  useEffect(() => { pintar(); }, [conCotas, pintar]);

  return (
    <div className="rem-render" ref={lienzo}>
      {cotas && <CapaCotas cotas={cotas} ancho={tamano.ancho} alto={tamano.alto} />}
      {vista === 'tres-cuartos' && movida && (
        <button type="button" className="chip-3d rem-render-reiniciar" onClick={colocarCamara}>
          Volver a la vista fija
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Estilos del render**

Añadir a `src/client/coordina/remolques.css`, tras el bloque `.rem-dibujo-pie`:

```css
/* Render 3D (fase 2b): el lienzo transparente sobre la superficie del panel, así se ve bien en
   claro y en oscuro; las cotas en SVG encima, con los tokens de texto de CoordinaOT. */
.rem-render { aspect-ratio: 16 / 10; background: var(--surface); position: relative; }
.rem-render canvas { display: block; height: 100%; width: 100%; }
.rem-render-cotas { inset: 0; pointer-events: none; position: absolute; z-index: 1; }
.rem-render-cotas line { stroke: var(--text); stroke-width: 1; }
.rem-render-cotas marker path { fill: var(--text); }
.rem-render-cotas text {
  fill: var(--text);
  font-family: var(--font);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 3px;
}
.rem-render-cotas .rem-render-marca { font-size: 10px; font-weight: 500; }
.rem-render-reiniciar { bottom: 0.625rem; position: absolute; right: 0.625rem; z-index: 2; }
```

- [ ] **Step 8: Ver que pasa y compila**

Run: `pnpm exec vitest run src/client/remolques && pnpm typecheck && pnpm lint`
Expected: PASS y sin errores. (El componente se ve de verdad en la tarea 8, cuando `DibujoRemolque` lo monta.)

- [ ] **Step 9: Commit**

```bash
git add src/client/remolques/render/camaras.ts src/client/remolques/render/proyeccion.ts src/client/remolques/render/CapaCotas.tsx src/client/remolques/render/RenderRemolque.tsx src/client/remolques/render/camaras.test.ts src/client/coordina/remolques.css
git commit -m "feat(remolques): componente del render con vistas fijas y cotas

Cinco vistas fijas (3/4, delante, detrás, lateral y arriba); las rectas sin
perspectiva para que las cotas sean exactas. En la 3/4 se puede girar y volver a
la vista fija. Pinta a demanda y libera todo al desmontarse.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: El dibujo en la pantalla, con respaldo

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `src/client/remolques/DibujoRemolque.tsx`, `src/client/remolques/useDiferido.ts`, `src/client/remolques/soporteWebGL.ts`
- Modify: `src/client/remolques/RemolquesView.tsx:100-124`, `src/client/coordina/remolques.css`
- Test: `src/client/remolques/DibujoRemolque.test.tsx`

**Interfaces:**
- Consumes: `construirEscena`, `ElementoEscena`, `Vista` (tarea 4); `RenderRemolque` por defecto de `./render/RenderRemolque` (tarea 7); `Escena3D` como respaldo.
- Produces: `DibujoRemolque(props: ElementoEscena & { params: CalcParams; observaciones: string; onObservacionesChange: (v: string) => void; respaldo: React.ReactNode })`; `useDiferido<T>(valor: T, ms?: number): T`; `soporteWebGL(): boolean`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/client/remolques/DibujoRemolque.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { DibujoRemolque } from './DibujoRemolque';

const pintar = (extra: Partial<LonaInput>) => {
  const input: LonaInput = { ...emptyLona(), largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: 'TIPO 01', observaciones: 'OJO', ...extra };
  return renderToStaticMarkup(
    <DibujoRemolque tipo="lona" input={input} res={calcLona(input, DEFAULT_PARAMS)} params={DEFAULT_PARAMS}
      observaciones={input.observaciones} onObservacionesChange={() => {}} respaldo={<p>RESPALDO</p>} />,
  );
};

describe('DibujoRemolque', () => {
  it('sin WebGL enseña el dibujo técnico y lo dice, con las observaciones debajo', () => {
    const html = pintar({});
    expect(html).toContain('RESPALDO');
    expect(html).toContain('Este equipo no puede mostrar el 3D: se ve el dibujo técnico.');
    expect(html).toContain('name="observaciones"');
    expect(html).toContain('value="OJO"');
  });

  it('sin forma decidida enseña el dibujo técnico (su aviso de qué falta) sin decir nada del 3D', () => {
    const html = pintar({ tipoPerfil: '' });
    expect(html).toContain('RESPALDO');
    expect(html).not.toContain('no puede mostrar el 3D');
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm exec vitest run src/client/remolques/DibujoRemolque.test.tsx`
Expected: FAIL, no resuelve `./DibujoRemolque`.

- [ ] **Step 3: Ayudas**

Crear `src/client/remolques/useDiferido.ts`:

```ts
import { useEffect, useState } from 'react';

/** El valor con un pequeño retraso: el render no se rehace en cada tecla, sino al parar. */
export function useDiferido<T>(valor: T, ms = 150): T {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const espera = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(espera);
  }, [valor, ms]);
  return diferido;
}
```

Crear `src/client/remolques/soporteWebGL.ts`:

```ts
/** Si este navegador puede pintar en 3D. Sin DOM (pruebas, servidor) no puede. */
export function soporteWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: `DibujoRemolque`**

Crear `src/client/remolques/DibujoRemolque.tsx`:

```tsx
import React, { Suspense, useMemo, useState } from 'react';
import type { CalcParams } from '../../remolques/calc/params.ts';
import { construirEscena } from '../../remolques/escena/index.ts';
import type { ElementoEscena, Vista } from '../../remolques/escena/tipos.ts';
import { soporteWebGL } from './soporteWebGL';
import { useDiferido } from './useDiferido';

// El dibujo del elemento activo (fase 2b): el render 3D y, si el equipo no puede con él o
// falla, el dibujo técnico de siempre. three.js va en un trozo aparte que solo se pide aquí.
const RenderRemolque = React.lazy(() => import('./render/RenderRemolque'));

const VISTAS: Array<{ vista: Vista; nombre: string }> = [
  { vista: 'tres-cuartos', nombre: '3/4' },
  { vista: 'delante', nombre: 'Delante' },
  { vista: 'detras', nombre: 'Detrás' },
  { vista: 'lateral', nombre: 'Lateral' },
  { vista: 'arriba', nombre: 'Arriba' },
];

class LimiteFallo extends React.Component<{ onFallo: () => void; children: React.ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() { return { fallo: true }; }
  componentDidCatch() { this.props.onFallo(); }
  render() { return this.state.fallo ? null : this.props.children; }
}

type Props = ElementoEscena & {
  params: CalcParams;
  observaciones: string;
  onObservacionesChange: (valor: string) => void;
  /** El dibujo técnico (Escena3D), para cuando no hay 3D o falta la forma. */
  respaldo: React.ReactNode;
};

export function DibujoRemolque(props: Props) {
  const { tipo, input, res, params } = props;
  // Se difiere el elemento entero: tipo, entrada y resultado cambian juntos al pasar de una
  // lona a un baquetón y nunca deben mezclarse.
  const elemento = useMemo(() => ({ tipo, input, res }) as ElementoEscena, [tipo, input, res]);
  const diferido = useDiferido(elemento);
  const escena = useMemo(() => construirEscena(diferido, params), [diferido, params]);
  const [puede3D] = useState(soporteWebGL);
  const [fallo, setFallo] = useState(false);
  const [vista, setVista] = useState<Vista>('tres-cuartos');
  const [conCotas, setConCotas] = useState(false);
  const usar3D = puede3D && !fallo && escena != null;

  return (
    <section className="rem-dibujo" aria-label="Dibujo del remolque">
      {usar3D ? (
        <>
          <header className="rem-dibujo-cabecera">
            <p className="rem-dibujo-etiqueta">Render</p>
            <span className="rem-dibujo-separador" aria-hidden="true" />
            <div className="tira-3d rem-dibujo-vistas" role="group" aria-label="Vista">
              {VISTAS.map(({ vista: v, nombre }) => (
                <button key={v} type="button" className={v === vista ? 'pestana pestana-activa' : 'pestana'}
                  aria-pressed={v === vista} onClick={() => setVista(v)}>
                  {nombre}
                </button>
              ))}
            </div>
            <button type="button" className="chip-3d rem-dibujo-cotas" aria-pressed={conCotas} onClick={() => setConCotas(!conCotas)}>
              Cotas
            </button>
          </header>
          <LimiteFallo onFallo={() => setFallo(true)}>
            <Suspense fallback={<div className="rem-render rem-render-cargando" role="status">Cargando el 3D…</div>}>
              <RenderRemolque escena={escena} vista={vista} conCotas={conCotas} onFallo={() => setFallo(true)} />
            </Suspense>
          </LimiteFallo>
        </>
      ) : (
        <>
          {props.respaldo}
          {escena != null && (
            <p className="rem-render-aviso" role="status">Este equipo no puede mostrar el 3D: se ve el dibujo técnico.</p>
          )}
        </>
      )}
      <div className="rem-dibujo-pie">
        <label className="rem-observaciones">
          <span>Observaciones</span>
          <input
            name="observaciones"
            autoComplete="off"
            placeholder="Añadir indicaciones para producción…"
            value={props.observaciones}
            onChange={(evento) => props.onObservacionesChange(evento.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
```

Nota: `useState(soporteWebGL)` pasa la función como inicializador, así que solo se mira una vez.

- [ ] **Step 5: Usarlo en `RemolquesView.tsx`**

Importar `DibujoRemolque` de `./DibujoRemolque`. Sustituir el ternario de los dos `<Escena3D … />` por:

```tsx
              {lineaActiva.tipo === 'lona' ? (
                <DibujoRemolque tipo="lona" input={lona} res={resLona} params={params}
                  observaciones={lona.observaciones}
                  onObservacionesChange={(observaciones) => ws.cambiarInput({ ...lona, observaciones })}
                  respaldo={(
                    <Escena3D modo="lona" medidasHechas={resLona.lonaHecha} largo={lona.largo} ancho={lona.ancho} anchoAtras={lona.anchoAtras}
                      altoDelante={lona.altoDelante} altoAtras={lona.altoAtras}
                      aguas={lona.aguas} radioCumbrera={lona.radioCumbrera} radioHombro={lona.radioHombro}
                      radioEsquina={lona.radioEsquina} chaflan={lona.chaflan}
                      radioChaflanAbajo={lona.radioChaflanAbajo} radioChaflanArriba={lona.radioChaflanArriba}
                      ollaos={resLona.reparto}
                      recogeDelante={lona.recogeDelante} recogeAtras={lona.recogeAtras}
                      bastillaEnfundar={lona.bastillaEnfundar}
                      tipoPerfil={lona.tipoPerfil} ventana={lona.ventana}
                      ventanaAncho={lona.ventanaAncho} ventanaAlto={lona.ventanaAlto}
                      material={lona.material} />
                  )} />
              ) : (
                <DibujoRemolque tipo="baqueton" input={baq} res={resBaq} params={params}
                  observaciones={baq.observaciones}
                  onObservacionesChange={(observaciones) => ws.cambiarInput({ ...baq, observaciones })}
                  respaldo={(
                    <Escena3D modo="baqueton" medidasHechas={resBaq.remolqueHecho} largo={baq.largo} ancho={baq.ancho}
                      altoDelante={0} altoAtras={0} tipoPerfil="TIPO 01"
                      baqueton={baq.baqueton} baquetonDelantero={resBaq.baquetonDelantero} baquetonTrasero={resBaq.baquetonTrasero}
                      material={baq.material} ollaos={resBaq.reparto} />
                  )} />
              )}
```

(Las observaciones pasan a `DibujoRemolque`: `Escena3D` sin `onObservacionesChange` no pinta su pie.) Actualiza el comentario de encima del bloque: «El render 3D (fase 2b) y, de respaldo, el dibujo de la web de remolques.»

- [ ] **Step 6: Estilos**

Añadir a `src/client/coordina/remolques.css`, tras los estilos de `.rem-render`:

```css
/* Cabecera del dibujo con las vistas (pestañas de CoordinaOT) y el interruptor de cotas. */
.rem-dibujo-vistas { margin-left: auto; }
.rem-dibujo-cotas[aria-pressed="true"] { border-color: var(--accent); color: var(--text); }
/* El dibujo técnico de respaldo ya trae su propio marco. */
.rem-dibujo .rem-dibujo { border: 0; border-radius: 0; box-shadow: none; }
.rem-render-cargando { align-items: center; color: var(--text-muted); display: flex; font-size: 12px; justify-content: center; }
.rem-render-aviso { color: var(--text-muted); font-size: 12px; margin: 0; padding: 0.5rem 0.75rem 0; }
```

Mira en `src/client/coordina/piezas.css` cómo se marca un `chip-3d` activo; si hay una clase para eso, úsala en vez de la regla `[aria-pressed="true"]`.

- [ ] **Step 7: Ver que pasa y que three.js va aparte**

Run: `pnpm exec vitest run src/client/remolques src/remolques && pnpm typecheck && pnpm lint`
Expected: PASS y sin errores.

Run: `pnpm exec vite build`
Expected: termina bien. Luego comprueba que el trozo principal no lleva three.js:

Run: `grep -l "WebGLRenderer" dist/assets/*.js`
Expected: un solo fichero, que **no** es el `index-*.js` que carga `dist/index.html` (míralo con `grep -o 'assets/index-[^"]*\.js' dist/index.html`).

- [ ] **Step 8: Verlo en la instancia aislada**

Con la instancia aislada en 4310 (arráncala en segundo plano si no escucha), un script en `tmp/` con `openApp`: Remolques → pedido `AR.26.99996` → «+ Remolque» con TIPO 05 (radio 8), 300 × 200 × 120, ventana 50 × 35, recogida delante GOMA y detrás CREMALLERA, bastilla sí, ollaos repartidos. Espera a que `.rem-render canvas` se vea, captura cada vista con y sin cotas, en claro y en oscuro (`localStorage['toldos-tema'] = 'dark'` y recargar), a 1600×1000 y 1280×720, en `tmp/ui-audit/remolques-2b/`. **Mira todas las capturas** y compáralas con las fotos de `tmp/fotos-remolques/` (IMG_3930 a IMG_3935, `PUENTES 1.jpg`, `lona_camion_arquillada_tir_2.jpg`). Apunta en el informe lo que no se parezca (proporciones de ollaos, goma, cierres, color, luz) y arréglalo si es de materiales, luces o separaciones; si es de medidas de la escena, dilo y no lo toques.

- [ ] **Step 9: Commit**

```bash
git add src/client/remolques/DibujoRemolque.tsx src/client/remolques/useDiferido.ts src/client/remolques/soporteWebGL.ts src/client/remolques/DibujoRemolque.test.tsx src/client/remolques/RemolquesView.tsx src/client/coordina/remolques.css
git commit -m "feat(remolques): el render 3D en la pantalla, con el dibujo de siempre de respaldo

El editor enseña el render con sus vistas y cotas, rehecho al parar de teclear.
three.js solo se descarga al abrir un elemento de remolques, y si el equipo no
puede con el 3D se ve el dibujo técnico y se dice.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Prueba de punta a punta y capturas

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `scripts/lib/remolques-e2e.mjs`, `scripts/test-remolques-2b-e2e.mjs`
- Modify: `scripts/test-remolques-2a-e2e.mjs`, `.claude/skills/running-toldos-testar/drive.mjs`

**Interfaces:**
- Consumes: la pantalla de las tareas 3 y 8; `openApp` de `drive.mjs`.
- Produces: `openApp(viewport, { user, launchArgs })`; en `scripts/lib/remolques-e2e.mjs`, las ayudas `esperado`, `elegir`, `num`, `teclearCaso`, `comprobarCaso` movidas tal cual desde la e2e de la 2a.

- [ ] **Step 1: Opciones de arranque en `drive.mjs`**

En `.claude/skills/running-toldos-testar/drive.mjs`, `openApp` pasa a aceptar `launchArgs`:

```js
export async function openApp(viewport = { width: 1600, height: 1000 }, { user = DEFAULT_USER, launchArgs = [] } = {}) {
```

y `chromium.launch({ headless: true, args: launchArgs })`. El resto igual.

- [ ] **Step 2: Ayudas compartidas**

Mover **tal cual** desde `scripts/test-remolques-2a-e2e.mjs` a `scripts/lib/remolques-e2e.mjs` las funciones `esperado`, `elegir`, `num`, `teclearCaso` y `comprobarCaso` (y las constantes que usan, `fmt`, `norm`, `CLAVES_OLLAOS`), con `export`. En `comprobarCaso`, la comprobación del dibujo pasa de `page.locator('.rem-dibujo svg')` a `page.locator('.rem-dibujo').locator('canvas, svg')` (con 3D el dibujo es un canvas). La e2e de la 2a las importa desde `./lib/remolques-e2e.mjs`.

Run (con la aislada en 4310): `node scripts/test-remolques-2a-e2e.mjs`
Expected: termina bien, igual que antes (la parte de RPS puede salir SALTADO si RPS no responde).

- [ ] **Step 3: La e2e de la 2b**

Crear `scripts/test-remolques-2b-e2e.mjs`. Qué tiene que hacer, en este orden (usa las ayudas compartidas y `assert` de `node:assert/strict`; cabecera de comentario explicando qué prueba, como la de la 2a):

1. **Casos de la fixture** (`src/remolques/__fixtures__/produccion-2026-09.json`): el primer caso de cada `tipoPerfil` de lona, uno con ventana, uno con bastilla y un baquetón. Para cada recogida de `DEFAULT_PARAMS.recogidas` que no salga en esos casos, reutiliza el primer caso TIPO 01 cambiando «Delante» a esa recogida.
2. **Para cada caso**, en un pedido de prueba `AR.26.99995`: `teclearCaso`, espera a que se vea `.rem-render canvas`, y comprueba que el canvas **no está en blanco**: 

```js
const pintado = await page.locator('.rem-render canvas').evaluate((c) => {
  const copia = document.createElement('canvas');
  copia.width = 64; copia.height = 40;
  const ctx = copia.getContext('2d');
  ctx.drawImage(c, 0, 0, 64, 40);
  const { data } = ctx.getImageData(0, 0, 64, 40);
  let opacos = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) opacos += 1;
  return opacos / (64 * 40);
});
assert.ok(pintado > 0.05, `${caso}: el render pinta algo (${pintado})`);
```

   Pulsa cada vista (`getByRole('group', { name: 'Vista' }).getByRole('button', { name })`) y captura en `tmp/ui-audit/remolques-2b/<caso>-<vista>.png`.
3. **Cotas**: en «Delante», pulsa «Cotas» y comprueba que `.rem-render-cotas text` tiene el ancho de la lona hecha del caso (`fmt(result.lonaHecha.ancho)`); vuelve a pulsar y comprueba que la capa desaparece.
4. **Vista fija**: en «3/4», arrastra el ratón sobre el canvas, comprueba que sale «Volver a la vista fija», púlsalo y comprueba que desaparece.
5. **Según ganchos**: lona TIPO 01 300 × 200 × 100, recogidas NO; modo «Según ganchos»; delante 10, 60, 110, 160 → la tabla de delante da 2,5 · 35,5 · 85,5 · 135,5 · 198,5; marca «Medido al revés» en delante con 40, 90, 140, 190 → la misma tabla; mete detrás 160, 110, 60, 10 → sale el aviso «Los ganchos de atrás van bajando»; deja laterales con un solo gancho → «Falta:» lo dice; con cotas en «Delante» se leen las posiciones de los ganchos (10,5 · 60,5 · 110,5 · 160,5).
6. **Respaldo**: otro `openApp` con `launchArgs: ['--disable-webgl', '--disable-3d-apis']`: el mismo caso enseña `.rem-dibujo svg` y el texto «Este equipo no puede mostrar el 3D: se ve el dibujo técnico.»
7. **Claro y oscuro, 1600×1000 y 1280×720**: repite las capturas de un caso con ventana y de un baquetón en las cuatro combinaciones (oscuro: `localStorage.setItem('toldos-tema', 'dark')` y recargar).
8. **Errores de consola**: al final, `errors` de `openApp` vacío.
9. **three.js aparte**: comprueba en las peticiones de red de la primera carga (antes de abrir Remolques) que no se pide el trozo que lleva `WebGLRenderer`, y que sí se pide al abrir el primer elemento.

- [ ] **Step 4: Ejecutarla y mirar las capturas**

Run (aislada en 4310): `node scripts/test-remolques-2b-e2e.mjs`
Expected: termina bien. **Mira todas las capturas** de `tmp/ui-audit/remolques-2b/` y compáralas con las fotos de `tmp/fotos-remolques/`; apunta en el informe, por caso, lo que se parece y lo que no.

- [ ] **Step 5: Todas las pruebas**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo pasa.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/remolques-e2e.mjs scripts/test-remolques-2b-e2e.mjs scripts/test-remolques-2a-e2e.mjs .claude/skills/running-toldos-testar/drive.mjs
git commit -m "test(remolques): prueba de punta a punta del render y de los ganchos

Cada perfil, cada recogida, ventana, bastilla y baquetón pintan algo en todas
las vistas; las cotas y la vista fija funcionan; «Según ganchos» da los ollaos
esperados; sin WebGL se ve el dibujo técnico, y three.js no se descarga hasta
abrir un elemento de remolques.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Después del plan

- Revisión final de toda la rama con el modelo más capaz (Opus, esfuerzo alto).
- Enseñar a Iván las capturas junto a sus fotos antes de darlo por bueno.
- Despliegue: lleva dependencia nueva (three), así que la línea de siempre con `pnpm install`: `cd /webs/toldos-testar && git pull --ff-only && pnpm install --frozen-lockfile && pnpm build && pnpm deploy:check && pnpm deploy:smoke && pnpm pm2:reload && pm2 save`.
