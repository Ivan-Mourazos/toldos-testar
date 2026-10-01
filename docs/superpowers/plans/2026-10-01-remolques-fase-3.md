# Remolques · fase 3: fichas de cliente — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que lo habitual de cada cliente de remolques (perfil, recogidas, material, extras de baquetón, observaciones y, sobre todo, sus medidas con los ollaos del CAD) viva en una ficha por cliente, se aplique sola al obtener sus pedidos de RPS con la marca «del cliente», y se vaya llenando desde el trabajo diario con «Guardar en la ficha del cliente».

**Architecture:** Cuatro capas. (1) Un módulo puro nuevo `src/remolques/clientes/` (tipos, validación, semilla, parámetros efectivos, aplicar la ficha, diferencias) que usan el servidor y la web. (2) En el servidor, un almacén `src/remolquesClientesStore.js` copiado del de parámetros (versión, 409, historial, cola), sembrado una vez desde los parámetros actuales, y sus rutas `/api/remolques/clientes…`; el almacén de parámetros deja fuera lo que pasó a las fichas, y el servidor calcula con los **parámetros efectivos** = generales + fichas (los extras de cada ficha como un cliente de baquetón con su nombre, su recogida propia como una recogida más). El cálculo (`calcLona`, `calcBaqueton`) no cambia. (3) En Parámetros › Remolques, la hoja general queda solo con GENERAL y las recogidas normales, y una hoja nueva «Clientes». (4) En Remolques, «Obtener datos del pedido» aplica la ficha (o sugiere una por el nombre) y marca lo que pone; cada elemento tiene «Guardar en la ficha del cliente».

**Tech Stack:** TypeScript (el servidor lo ejecuta sin compilar, Node ≥ 22.18: solo tipos borrables e `import type`), React 19, Express 5 (rutas en `src/server.js`, JS), vitest (entorno node; componentes con `renderToStaticMarkup`), Playwright para la e2e en una instancia aislada.

**Spec:** `docs/superpowers/specs/2026-10-01-remolques-fase-3-fichas-cliente-design.md` y «Fase 3 en detalle» de `docs/superpowers/specs/2026-09-29-unificacion-remolques-design.md`. Patrones que se copian: `src/remolquesParametersStore.js` (almacén con versión, historial y cola), `src/client/remolques/useRemolquesParameters.ts` (borrador de Parámetros), la marca «Propuesta · compruébala» de toldos (`.fabric-proposal-pending` en `src/client/coordina/nuevo-pedido.css`).

## Decisiones del plan (lo que el spec no fija)

- **`DEFAULT_PARAMS` no cambia.** Es el catálogo del código (con HPL, AYALA, GENERAL WOLDER y la recogida de HPL) y de él tiran las pruebas de cálculo, de hoja y de dibujo y las e2e. Lo nuevo es `PARAMS_GENERALES = sinEntradasDeCliente(DEFAULT_PARAMS)`: lo que valen los parámetros generales sin fichero y lo que restaura «Restaurar valores por defecto».
- **Parámetros efectivos = generales + fichas** (`paramsConFichas`). Cada ficha con extras de baquetón entra como un cliente de baquetón con el nombre de la ficha; su recogida propia, como una recogida más. Así `calcLona`/`calcBaqueton`, la hoja de taller y el dibujo siguen igual, y el elemento sigue guardando nombres (`clienteEspecifico`, `recogeAtras`). Si un nombre de la ficha coincide con uno general, manda el de la ficha (y la validación de fichas no deja poner a una recogida propia el nombre de una general).
- **`GET /api/remolques/parametros` devuelve los efectivos** (Remolques calcula y sus desplegables ofrecen lo mismo que hoy); `?detalle=1` (la hoja de Parámetros) devuelve los generales con su versión. El servidor calcula con los efectivos al guardar para revisión y en la vista previa del PDF. Un pedido guardado conserva en `params` los efectivos del momento: «Corregir» y la paridad no cambian. Con las fichas de partida, los efectivos son exactamente `DEFAULT_PARAMS` (hay prueba).
- **Siembra segura:** el almacén de fichas crea su fichero la primera vez que se lee y no existe (y el servidor lo lee al arrancar), dentro de su cola para no sembrar dos veces: versión 1, sin autor, motivo «Fichas creadas a partir de los parámetros de remolques», con su línea de historial. Toma los clientes de baquetón (menos GENERAL) y la recogida «PUENTES HIJOS DE PEDRO LOPEZ» de los **parámetros guardados en el servidor** (si Iván cambió algún extra, la ficha lo lleva); si esos parámetros ya no tienen ninguno, los del código. Si no se puede escribir, se usan sin guardar, se avisa en el log y se reintenta en la siguiente lectura. Un fichero de fichas roto no se vuelve a sembrar (se avisa y no hay fichas).
- **Parámetros ya guardados con clientes:** el almacén de parámetros los deja fuera al leer (no salen en la hoja ni cuentan como cambio) y el siguiente guardado los quita del fichero. El historial antiguo los conserva; «Cargar esta versión» también los quita.
- **Códigos de RPS de la semilla** en la constante `CODIGOS_RPS_SEMILLA` (`src/remolques/clientes/semilla.ts`): HIJOS DE PEDRO LOPEZ `001300`, GENERAL WOLDER `001047` y AYALA **los dos** candidatos `036662` («REMOLQUES AYALA») y `048286` («ENGANCHES Y REMOLQUES AYALA S.L.U»), marcado «PENDIENTE DE IVÁN»: quien coordina lo ajusta antes de desplegar (después, desde la hoja Clientes).
- **Ficha:** `id` estable sacado del nombre (`hijos-de-pedro-lopez`); el nombre es único sin acentos ni mayúsculas y no puede ser «GENERAL».
- **Medida habitual** = elemento (lona o baquetón) + largo × ancho del remolque, exactos; las posiciones por lado (`delante`, `atras`, `laterales`) con el mismo convenio que el «A medida» del formulario (`ollaosManuales`).
- **«Vacío» al obtener el pedido:** lo que está sin elegir, y además lo que RPS da solo por no mencionarlo: recogida «NO» (RPS no la menciona) y ventana «No». Lo que RPS dice de verdad manda: rotulación sí/no, aguas, medidas, material sugerido, ventana «Sí» (sí se rellenan sus medidas si faltan).
- **Trabajo habitual** (lona o baquetón): se guarda y se ve en la ficha, pero no se aplica: el tipo de cada elemento lo da su línea de RPS.
- **Cremallera del 9:** no hay campo en el planteamiento; con la ficha en «Sí», las lonas reciben la observación «CREMALLERA DEL 9». La duda Q-R04 (qué clientes la piden) sigue abierta.
- **Material:** la ficha guarda el mismo texto que el campo «Material» del formulario (la bobina). En la hoja Clientes es un campo de texto; lo cómodo es guardarlo desde un pedido.
- **Sugerencia por nombre:** solo si el pedido trae código de cliente; si se contesta «No», vuelve a preguntar la siguiente vez que se obtenga. Sin «Soy», «Añadir el código y aplicar» aplica la ficha a este pedido pero no guarda el código (y lo dice).
- **`POST /api/remolques/clientes/desde-pedido`** no pide versión: se aplica sobre la última (solo toca una ficha). El motivo lo pone el servidor: «Código añadido desde el pedido AR…» (solo el código) o «Desde el pedido AR…». Si hay que crear la ficha y su nombre ya es de otra, la nueva se llama «NOMBRE (código)».
- **Marcas «del cliente»** en `LineaPedido.delCliente = { ficha, campos }`: viajan con el borrador del navegador y el del servidor (no con el pedido guardado, que no las necesita). Cambiar un campo quita su marca.
- **El cliente de RPS del elemento** se guarda al importar en `origenRps.cliente` (campo nuevo, opcional). «Guardar en la ficha del cliente» sale si el elemento lo tiene o si el pedido de RPS en pantalla es este; si no, no sale. Va en la cabecera del editor.
- **Extras de baquetón en «Guardar en la ficha»:** si el baquetón usa los extras de otro cliente (`clienteEspecifico` distinto de GENERAL y de la ficha), se ofrece copiarlos a la ficha.
- **Hoja «Clientes»:** entrada propia bajo «Remolques» en la lista de la izquierda de Parámetros («Generales» y «Clientes»); guarda con la barra de siempre («Quién hace el cambio» y «Motivo») y su historial dice qué fichas cambiaron. **Cambiado después (01/10/2026):** una versión por ficha, con su botón «Guardar», motivo opcional e historial automático de cada ficha (diseño, apartado 3).
- La e2e va en su propia aislada (`tmp/clientes`, puertos 4313/4323): cambia y borra las fichas de esa carpeta.

## Global Constraints

- Solo escritorio (1280×720 a 1920); no adaptar a móvil.
- Textos de la interfaz y comentarios en castellano llano; decimales con coma (`toLocaleString('es-ES')`). No citar el Excel en la interfaz.
- Diseño igual que CoordinaOT: tokens y piezas de `src/client/coordina/` (`ghost-button`, `primary-button`, `tecla-3d`, `bloque-3d-hundido`, `panel-3d`, `parameter-band`, `parameters-save-dialog`…), en claro y oscuro.
- Nunca arrancar la web con el `.env` real. Esta fase usa su propia aislada: `ISOLATED_DIR="$PWD/tmp/clientes" PORT=4313 FAKE_COORDINA_PORT=4323 bash .claude/skills/running-toldos-testar/start-isolated.sh` (Codex usa 4312; los borradores, 4311). Comprobar `/api/health`: `simulationMode` true y `fileWritesEnabled` false.
- En las pruebas no se escribe nada fuera de `tmp/` del repositorio (`path.resolve('tmp/tests/…')` con `mkdtemp`, nunca `os.tmpdir()`).
- RPS es solo lectura (`SELECT`); esta fase no añade consultas a RPS. No se toca el servidor 192.168.0.90 (despliega Iván). `coordina-ot` y `Remolques-TGM` son de solo lectura.
- La paridad de remolques no se toca: `src/remolques/paridad-produccion.test.ts`, `src/client/remolques/resultados-paridad.test.tsx`, `src/remolques/hoja/__tests__/paridad-hoja.test.ts` y sus fixtures siguen pasando sin cambiarlos. `calcLona`, `calcBaqueton`, `DEFAULT_PARAMS` y `crearInputDesdeRps` no cambian.
- Las e2e de remolques que ya existen (`scripts/test-remolques-2a-e2e.mjs`, `-4-e2e.mjs`, `-5-e2e.mjs`, `-vista-previa-e2e.mjs`, `scripts/test-borradores-e2e.mjs`) pasan sin cambiarlas.
- No cambia nada de toldos.
- Commits en castellano explicando el porqué, terminando en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. `git add` con rutas explícitas; nada de `git add -A`, stash, reset ni checkout de ficheros ajenos. Mantener los finales de línea de cada fichero. Codex trabaja en `..\toldos-testar-codex` (rama `codex-trabajo`): para subir, `git pull --rebase origin main` y `git push origin HEAD:main`; sin worktree, `git pull --rebase` y `git push origin main`.
- Antes de subir: `pnpm test && pnpm typecheck && pnpm lint`, y `pnpm exec vite build` si se toca el cliente.
- Pantallas cambiadas: capturas con Playwright en la aislada, claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/remolques-clientes/`, y mirarlas.

## Orden y reparto

| Tarea | Depende de | UI independiente | Modelo recomendado |
| --- | --- | --- | --- |
| 1. Ficha: tipos, validación, semilla y parámetros efectivos | — | no | el más barato |
| 2. Aplicar la ficha y diferencias para el botón | 1 | no | el más barato |
| 3. Servidor: almacén, siembra, rutas y parámetros efectivos | 1, 2 | no | intermedio (Sonnet) |
| 4. Parámetros › Remolques › Clientes | 1, 3 | **sí** | intermedio (Sonnet) |
| 5. Parámetros generales sin clientes | 1, 3 | **sí** | el más barato |
| 6. «Obtener datos»: la ficha, las marcas «del cliente» y la sugerencia | 2, 3 | no | el más capaz (Opus) |
| 7. «Guardar en la ficha del cliente» | 2, 3, 6 | no | intermedio (Sonnet) |
| 8. e2e, otras e2e igual y documentación | todas | no | intermedio (Sonnet) |

Las tareas 4 y 5 son solo de pantalla y no tocan los ficheros de la 6 ni de la 7: Codex puede hacerlas en paralelo **cuando la 3 ya esté en `main`** (la 5 antes no: una hoja general sin clientes guardada contra un servidor viejo borraría los clientes antes de crear las fichas). La 4 y la 5 tampoco se pisan entre sí (la 4 toca `App.tsx`, `ParametersView.tsx` y `parametros.css`; la 5, `RemolquesParametersView.tsx` y `useRemolquesParameters.ts`).

## Mapa de ficheros

Crear:
- `src/remolques/clientes/tipos.ts` — `FichaCliente`, `MedidaHabitual`, `ExtrasBaqueton`, `SnapshotFichas`, `MarcaDelCliente`.
- `src/remolques/clientes/reglas.ts` — nombres, códigos, sugerencia, validación, qué fichas cambian.
- `src/remolques/clientes/semilla.ts` — códigos de la semilla, entradas de cliente de unos parámetros, fichas de partida.
- `src/remolques/clientes/params-efectivos.ts` — `sinEntradasDeCliente`, `PARAMS_GENERALES`, `paramsConFichas`.
- `src/remolques/clientes/aplicar.ts` — aplicar la ficha al importar, marcas tras un cambio.
- `src/remolques/clientes/diferencias.ts` — lo distinto de la ficha y la ficha con lo marcado.
- `src/remolques/clientes/__tests__/reglas.test.ts`, `semilla.test.ts`, `aplicar.test.ts`, `diferencias.test.ts`
- `src/remolquesClientesStore.js` + `src/remolquesClientesStore.test.js` — almacén de fichas.
- `src/client/remolques/fichasClientes.ts` + `fichasClientes.test.ts` — llamadas a la API de fichas.
- `src/client/remolques/useFichasClientes.ts` + `useFichasClientes.test.tsx` — borrador de la hoja Clientes.
- `src/client/remolques/ClientesRemolquesView.tsx` + `ClientesRemolquesView.test.tsx` — hoja Clientes.
- `src/client/remolques/posicionesTexto.ts` + `posicionesTexto.test.ts` — «2,5 · 10 · 40» ↔ números.
- `src/client/remolques/fichaAlObtener.ts` + `fichaAlObtener.test.ts` — qué ficha toca a un pedido y la pregunta.
- `src/client/remolques/del-cliente-pantalla.test.tsx` — las marcas en los formularios.
- `src/client/remolques/guardarEnFicha.ts` + `guardarEnFicha.test.ts`, `src/client/remolques/useGuardarEnFicha.ts`, `src/client/remolques/GuardarEnFicha.tsx` + `GuardarEnFicha.test.tsx` — el botón y su ventana.
- `scripts/test-remolques-clientes-e2e.mjs` — prueba de punta a punta.

Modificar:
- `src/remolquesParametersStore.js` + test, `src/config.js` + test, `src/server.js`.
- `src/remolques/rps/types.ts`, `src/remolques/workspace/importar-rps.ts` + test, `src/remolques/workspace/lineas.ts`, `src/remolques/workspace/estado.ts` + test.
- `src/client/remolques/useRemolques.ts`, `Campos.tsx`, `FormularioLona.tsx`, `FormularioBaqueton.tsx`, `RemolquesView.tsx`, `src/client/coordina/remolques.css`.
- `src/client/remolques/RemolquesParametersView.tsx` + test, `useRemolquesParameters.ts` + test.
- `src/client/views/ParametersView.tsx`, `src/client/App.tsx`, `src/client/coordina/parametros.css`.
- `README.md`, `.env.example`, `.env.production.example`, `.claude/skills/running-toldos-testar/SKILL.md`, `docs/modelos/dudas-abiertas.md`.

---

### Task 1: Ficha: tipos, validación, semilla y parámetros efectivos

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Create: `src/remolques/clientes/tipos.ts`, `src/remolques/clientes/reglas.ts`, `src/remolques/clientes/semilla.ts`, `src/remolques/clientes/params-efectivos.ts`
- Test: `src/remolques/clientes/__tests__/reglas.test.ts`, `src/remolques/clientes/__tests__/semilla.test.ts`

**Interfaces:**
- Consumes: `CalcParams`, `ClienteBaqueton`, `Recogida`, `TipoPerfil`, `TIPOS_PERFIL`, `DEFAULT_PARAMS` (`src/remolques/calc/params.ts`); `RepartoLados` (`src/remolques/calc/ollaos.ts`); `TipoPlanteamiento` (`src/remolques/store/types.ts`); `ClienteRps` (`src/remolques/rps/types.ts`); `validarParams` (solo en la prueba).
- Produces (tipos): `ExtrasBaqueton = Omit<ClienteBaqueton, "nombre">`, `PerfilFicha`, `VentanaFicha`, `MedidaHabitual { tipo; largo; ancho; ollaos: RepartoLados }`, `FichaCliente { id; nombre; codigosRps: string[]; trabajo?; perfil?; recogeDelante?; recogeAtras?; recogidaPropia?; bastillaEnfundar?; ventana?; rotulacion?; material?; sesgoDetras?; cremallera?; extrasBaqueton?; observaciones?; medidas? }`, `SnapshotFichas { version; updatedAt; updatedBy; reason; fichas }`, `MarcaDelCliente { ficha: string; campos: string[] }`.
- Produces (reglas): `normalizarNombre(valor: string): string`, `CAMPOS_PERFIL`, `CAMPOS_EXTRAS`, `LADOS_OLLAOS`, `idFicha(nombre: string, usados: ReadonlySet<string>): string`, `fichaPorCodigo(fichas, codigo): FichaCliente | null`, `sugerirFicha(fichas, cliente: Pick<ClienteRps, "nombre" | "alias">): FichaCliente | null`, `fichasCambiadas(antes, despues): string[]`, `validarFichas(bruto: unknown, { recogidasGenerales }: { recogidasGenerales: readonly string[] }): { ok: true; fichas: FichaCliente[] } | { ok: false; errores: string[] }`.
- Produces (semilla): `CODIGOS_RPS_SEMILLA`, `RECOGIDA_PROPIA_SEMILLA`, `MOTIVO_SEMILLA`, `esRecogidaPasada(nombre: string): boolean`, `interface EntradasDeCliente { clientesBaqueton: ClienteBaqueton[]; recogidas: Recogida[] }`, `entradasDeCliente(params: CalcParams): EntradasDeCliente`, `fichasSemilla(entradas: EntradasDeCliente): FichaCliente[]`.
- Produces (efectivos): `sinEntradasDeCliente(params: CalcParams): CalcParams`, `PARAMS_GENERALES: CalcParams`, `paramsConFichas(params: CalcParams, fichas: readonly FichaCliente[]): CalcParams`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/remolques/clientes/__tests__/reglas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { PARAMS_GENERALES } from "../params-efectivos.ts";
import { fichaPorCodigo, fichasCambiadas, idFicha, normalizarNombre, sugerirFicha, validarFichas } from "../reglas.ts";
import { entradasDeCliente, fichasSemilla } from "../semilla.ts";
import type { FichaCliente, MedidaHabitual } from "../tipos.ts";

const generales = PARAMS_GENERALES.recogidas.map((r) => r.nombre);
const semilla = () => fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
const ficha = (cambios: Partial<FichaCliente> = {}): FichaCliente => ({
  id: "talleres-cal", nombre: "TALLERES CAL", codigosRps: ["009999"], ...cambios,
});
const validar = (fichas: unknown) => validarFichas(fichas, { recogidasGenerales: generales });

describe("normalizarNombre e idFicha", () => {
  it("sin acentos, signos ni mayúsculas", () => {
    expect(normalizarNombre(" Hijos de Pedro López, S.L. ")).toBe("HIJOS DE PEDRO LOPEZ S L");
  });

  it("el identificador sale del nombre y no se repite", () => {
    expect(idFicha("Hijos de Pedro López", new Set())).toBe("hijos-de-pedro-lopez");
    expect(idFicha("AYALA", new Set(["ayala", "ayala-2"]))).toBe("ayala-3");
    expect(idFicha("  ", new Set())).toBe("ficha");
  });
});

describe("fichaPorCodigo y sugerirFicha", () => {
  it("busca por el código de cliente de RPS", () => {
    const fichas = semilla();
    expect(fichaPorCodigo(fichas, " 001300 ")?.nombre).toBe("HIJOS DE PEDRO LOPEZ");
    expect(fichaPorCodigo(fichas, "048286")?.nombre).toBe("AYALA");
    expect(fichaPorCodigo(fichas, "000000")).toBeNull();
    expect(fichaPorCodigo(fichas, "")).toBeNull();
  });

  it("sugiere la ficha cuyo nombre está en el nombre o el alias de RPS, sin acentos ni mayúsculas", () => {
    const fichas = semilla();
    expect(sugerirFicha(fichas, { nombre: "ENGANCHES Y REMOLQUES AYALA S.L.U", alias: null })?.nombre).toBe("AYALA");
    expect(sugerirFicha(fichas, { nombre: "OTRO NOMBRE", alias: "Hijos de Pedro López" })?.nombre).toBe("HIJOS DE PEDRO LOPEZ");
    expect(sugerirFicha(fichas, { nombre: "TALLERES CAL", alias: null })).toBeNull();
  });

  it("si casan varias, la de nombre más largo", () => {
    const fichas = [ficha({ id: "wolder", nombre: "WOLDER" }), ficha({ id: "gw", nombre: "GENERAL WOLDER", codigosRps: [] })];
    expect(sugerirFicha(fichas, { nombre: "GENERAL WOLDER S.L.", alias: null })?.id).toBe("gw");
  });
});

describe("validarFichas", () => {
  it("las fichas de partida son válidas", () => {
    expect(validar(semilla())).toMatchObject({ ok: true });
  });

  it("limpia el nombre, los códigos y las observaciones vacías", () => {
    expect(validar([ficha({ nombre: " TALLERES CAL ", codigosRps: [" 009999 ", ""], observaciones: ["UNA", " ", "DOS "] })]))
      .toEqual({ ok: true, fichas: [ficha({ observaciones: ["UNA", "DOS"] })] });
  });

  it("un código solo puede estar en una ficha", () => {
    expect(validar([ficha(), ficha({ id: "otra", nombre: "OTRA" })]))
      .toEqual({ ok: false, errores: ["El código de RPS 009999 está en dos fichas: «TALLERES CAL» y «OTRA»"] });
  });

  it("el nombre: obligatorio, sin repetir y nunca GENERAL", () => {
    expect(validar([
      ficha({ nombre: " " }),
      ficha({ id: "b", nombre: "general", codigosRps: [] }),
      ficha({ id: "c", nombre: "Talleres Cal", codigosRps: ["1"] }),
      ficha({ id: "d", nombre: "TALLERES CAL", codigosRps: ["2"] }),
    ])).toEqual({ ok: false, errores: [
      "Ficha 1: falta el nombre",
      "Ficha «general»: «GENERAL» es el valor general del baquetón; usa otro nombre",
      "Ficha «TALLERES CAL»: el nombre está repetido",
    ] });
  });

  it("la recogida propia no se llama como una de Parámetros, y las habituales tienen que existir", () => {
    expect(validar([ficha({
      recogidaPropia: { nombre: "GOMA", delante: 1, atras: 1, lateralSoloAtras: 0, lateralSoloDelante: 0 },
      recogeDelante: "INVENTADA",
    })])).toEqual({ ok: false, errores: [
      "Ficha «TALLERES CAL»: la recogida propia «GOMA» se llama como una de Parámetros; usa otro nombre",
      "Ficha «TALLERES CAL»: la recogida de delante «INVENTADA» no existe",
    ] });
  });

  it("una recogida habitual puede ser la propia de la ficha", () => {
    const propia = { nombre: "PUENTES CAL", delante: 30, atras: 30, lateralSoloAtras: 5, lateralSoloDelante: 5, panoTraseroConAnchoDelante: true };
    expect(validar([ficha({ recogidaPropia: propia, recogeDelante: "PUENTES CAL", recogeAtras: "GOMA" })])).toMatchObject({ ok: true });
  });

  it("las medidas habituales: elemento, largo y ancho, posiciones y sin repetir", () => {
    const medida: MedidaHabitual = { tipo: "lona", largo: 200, ancho: 120, ollaos: { delante: [2.5, 60.5, 118.5], atras: [], laterales: [] } };
    expect(validar([ficha({ medidas: [medida, medida] })]))
      .toEqual({ ok: false, errores: ["Ficha «TALLERES CAL»: medida 2: la medida 200 × 120 está repetida"] });
    expect(validar([ficha({ medidas: [{ ...medida, ollaos: { delante: [], atras: [], laterales: [] } }] })]))
      .toEqual({ ok: false, errores: ["Ficha «TALLERES CAL»: medida 1: no tiene ningún ollao"] });
    expect(validar([ficha({ medidas: [{ ...medida, largo: 0 }] })]).ok).toBe(false);
    expect(validar([ficha({ medidas: [medida, { ...medida, tipo: "baqueton" }] })]).ok).toBe(true);
  });

  it("no es una lista: 400", () => {
    expect(validar({})).toEqual({ ok: false, errores: ["Las fichas tienen que ser una lista."] });
  });
});

describe("fichasCambiadas", () => {
  it("dice qué fichas se añaden, cambian o quitan", () => {
    const [hpl, ayala, wolder] = semilla();
    expect(fichasCambiadas([hpl, ayala, wolder], [{ ...hpl, sesgoDetras: 1.5 }, wolder, ficha()]))
      .toEqual(["HIJOS DE PEDRO LOPEZ", "TALLERES CAL", "AYALA"]);
    expect(fichasCambiadas([hpl], [{ ...hpl }])).toEqual([]);
  });
});
```

Crear `src/remolques/clientes/__tests__/semilla.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { validarParams } from "../../calc/validar-params.ts";
import { PARAMS_GENERALES, paramsConFichas, sinEntradasDeCliente } from "../params-efectivos.ts";
import { entradasDeCliente, fichasSemilla } from "../semilla.ts";

describe("fichas de partida", () => {
  it("salen de los clientes de baquetón y de la recogida de HPL, con sus códigos de RPS", () => {
    const fichas = fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
    expect(fichas.map((f) => [f.id, f.nombre, f.codigosRps])).toEqual([
      ["hijos-de-pedro-lopez", "HIJOS DE PEDRO LOPEZ", ["001300"]],
      ["ayala", "AYALA", ["036662", "048286"]],
      ["general-wolder", "GENERAL WOLDER", ["001047"]],
    ]);
    expect(fichas[0].extrasBaqueton).toMatchObject({
      extraLargoCostura: 11, extraBaquetonTrasero: 10, observaciones: ["ABIERTO EN LA PARTE TRASERA (REFORZAR)"],
    });
    expect(fichas[0].recogidaPropia).toEqual({
      nombre: "PUENTES HIJOS DE PEDRO LOPEZ", delante: 42.5, atras: 42.5, lateralSoloAtras: 11.5, lateralSoloDelante: 9,
      panoTraseroConAnchoDelante: true,
    });
    expect(fichas[2].extrasBaqueton?.observaciones).toHaveLength(3);
    expect(fichas.some((f) => f.nombre === "GENERAL")).toBe(false);
  });

  it("toman los valores guardados en Parámetros, no los del código", () => {
    const guardados = {
      ...DEFAULT_PARAMS,
      clientesBaqueton: DEFAULT_PARAMS.clientesBaqueton.map((c) => (c.nombre === "HIJOS DE PEDRO LOPEZ" ? { ...c, extraLargoCostura: 12 } : c)),
    };
    expect(fichasSemilla(entradasDeCliente(guardados))[0].extrasBaqueton?.extraLargoCostura).toBe(12);
  });

  it("si los parámetros ya no tienen clientes, valen los del código", () => {
    expect(fichasSemilla({ clientesBaqueton: [], recogidas: [] })).toEqual(fichasSemilla(entradasDeCliente(DEFAULT_PARAMS)));
  });

  it("un cliente que no está en la lista de códigos se crea sin código", () => {
    const [general] = DEFAULT_PARAMS.clientesBaqueton;
    expect(fichasSemilla({ clientesBaqueton: [{ ...general, nombre: "TALLERES CAL" }], recogidas: [] })).toEqual([{
      id: "talleres-cal", nombre: "TALLERES CAL", codigosRps: [],
      extrasBaqueton: {
        extraLargoCostura: 0, extraAnchoCostura: 0, extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
        extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0, observaciones: [],
      },
    }]);
  });
});

describe("parámetros generales y efectivos", () => {
  it("los generales solo tienen GENERAL y las recogidas normales, y son válidos", () => {
    expect(PARAMS_GENERALES.clientesBaqueton.map((c) => c.nombre)).toEqual(["GENERAL"]);
    expect(PARAMS_GENERALES.recogidas.some((r) => r.nombre === "PUENTES HIJOS DE PEDRO LOPEZ")).toBe(false);
    expect(PARAMS_GENERALES.recogidas).toHaveLength(DEFAULT_PARAMS.recogidas.length - 1);
    expect(validarParams(PARAMS_GENERALES).ok).toBe(true);
  });

  it("con las fichas de partida se calcula con los mismos parámetros que antes", () => {
    expect(paramsConFichas(PARAMS_GENERALES, fichasSemilla(entradasDeCliente(DEFAULT_PARAMS)))).toEqual(DEFAULT_PARAMS);
  });

  it("aplicarlo dos veces da lo mismo, y lo de la ficha sustituye a una entrada del mismo nombre", () => {
    const fichas = fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
    const una = paramsConFichas(PARAMS_GENERALES, fichas);
    expect(paramsConFichas(una, fichas)).toEqual(una);
    const otra = paramsConFichas(DEFAULT_PARAMS, [{ ...fichas[1], extrasBaqueton: { ...fichas[1].extrasBaqueton!, extraLargoCostura: 5 } }]);
    expect(otra.clientesBaqueton.filter((c) => c.nombre === "AYALA")).toEqual([{ ...DEFAULT_PARAMS.clientesBaqueton[2], extraLargoCostura: 5 }]);
  });

  it("una ficha sin extras ni recogida propia no añade nada", () => {
    expect(paramsConFichas(PARAMS_GENERALES, [{ id: "x", nombre: "X", codigosRps: [] }])).toEqual(PARAMS_GENERALES);
  });

  it("sinEntradasDeCliente no cambia nada más", () => {
    const { clientesBaqueton: _c, recogidas: _r, ...resto } = sinEntradasDeCliente(DEFAULT_PARAMS);
    const { clientesBaqueton: _c2, recogidas: _r2, ...restoCodigo } = DEFAULT_PARAMS;
    expect(resto).toEqual(restoCodigo);
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/remolques/clientes`
Expected: FAIL — `Failed to resolve import "../params-efectivos.ts"` (y los demás módulos).

- [ ] **Step 3: Escribir los tipos**

Crear `src/remolques/clientes/tipos.ts`:

```ts
import type { RepartoLados } from "../calc/ollaos.ts";
import type { ClienteBaqueton, Recogida, TipoPerfil } from "../calc/params.ts";
import type { TipoPlanteamiento } from "../store/types.ts";

// Fichas de cliente de remolques (fase 3, diseño 01/10/2026): lo habitual de cada cliente real,
// con uno o varios códigos de RPS. Salvo el nombre y los códigos, todo es opcional: lo que no se
// rellena no se toca al aplicar la ficha.

/** Los siete extras del baquetón y sus observaciones, como estaban en Parámetros. */
export type ExtrasBaqueton = Omit<ClienteBaqueton, "nombre">;

export interface PerfilFicha {
  tipoPerfil: TipoPerfil;
  aguas?: number;
  radioCumbrera?: number;
  radioHombro?: number;
  radioEsquina?: number;
  chaflan?: number;
  radioChaflanAbajo?: number;
  radioChaflanArriba?: number;
}

export interface VentanaFicha {
  lleva: boolean;
  ancho?: number;
  alto?: number;
}

/**
 * Una medida habitual: el largo × ancho del remolque (lo que se teclea) y las posiciones de los
 * ollaos de cada lado medidas sobre la lona hecha, de izquierda a derecha, como en el CAD. Se
 * guardan e imprimen tal cual, sin ajustarlas.
 */
export interface MedidaHabitual {
  tipo: TipoPlanteamiento;
  largo: number;
  ancho: number;
  ollaos: RepartoLados;
}

export interface FichaCliente {
  id: string;
  /** El nombre que se ve. */
  nombre: string;
  /** Códigos de cliente de RPS; un código solo puede estar en una ficha. */
  codigosRps: string[];
  /** Se guarda y se ve; no se aplica (el tipo de cada elemento lo da su línea de RPS). */
  trabajo?: TipoPlanteamiento;
  perfil?: PerfilFicha;
  recogeDelante?: string;
  recogeAtras?: string;
  /** La recogida que solo usa este cliente (p. ej. los puentes de Hijos de Pedro López). */
  recogidaPropia?: Recogida;
  bastillaEnfundar?: boolean;
  ventana?: VentanaFicha;
  rotulacion?: boolean;
  /** La bobina, con el mismo texto que el campo «Material» del formulario. */
  material?: string;
  /** Cuántos cm es más ancho el remolque detrás: pone el ancho de detrás («Detrás distinto»). */
  sesgoDetras?: number;
  /** Cremallera del 9: sale como observación en las lonas. */
  cremallera?: boolean;
  extrasBaqueton?: ExtrasBaqueton;
  /** Observaciones fijas, una por línea: salen siempre en sus planteamientos. */
  observaciones?: string[];
  medidas?: MedidaHabitual[];
}

export interface SnapshotFichas {
  version: number;
  updatedAt: string;
  updatedBy: string;
  reason: string;
  fichas: FichaCliente[];
}

/** Qué campos de un elemento puso la ficha (marca «del cliente»); cada uno se quita al cambiarlo. */
export interface MarcaDelCliente {
  ficha: string;
  campos: string[];
}
```

- [ ] **Step 4: Escribir las reglas**

Crear `src/remolques/clientes/reglas.ts`:

```ts
import { TIPOS_PERFIL, type TipoPerfil } from "../calc/params.ts";
import type { ClienteRps } from "../rps/types.ts";
import type { FichaCliente } from "./tipos.ts";

// Reglas puras de las fichas de cliente: las usan el servidor (almacén) y la web.

/** Sin acentos, signos ni mayúsculas: así se comparan nombres de cliente (como hacía el baquetón). */
export const normalizarNombre = (valor: string): string => valor
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^A-Z0-9]+/gi, " ")
  .trim()
  .toLocaleUpperCase("es-ES");

export const CAMPOS_PERFIL = [
  "aguas", "radioCumbrera", "radioHombro", "radioEsquina", "chaflan", "radioChaflanAbajo", "radioChaflanArriba",
] as const;
export const CAMPOS_EXTRAS = [
  "extraLargoCostura", "extraAnchoCostura", "extraBaquetonLargoDelante", "extraBaquetonLargoDetras",
  "extraLargoFinal", "extraAnchoFinal", "extraBaquetonTrasero",
] as const;
export const LADOS_OLLAOS = ["delante", "atras", "laterales"] as const;

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const esTexto = (v: unknown): v is string => typeof v === "string";
const listaDeTextos = (v: unknown): v is string[] => Array.isArray(v) && v.every(esTexto);
const noNegativo = (v: unknown) => esNumero(v) && v >= 0;
const positivo = (v: unknown) => esNumero(v) && v > 0;

/** Identificador estable sacado del nombre («hijos-de-pedro-lopez»), sin repetir ninguno de `usados`. */
export function idFicha(nombre: string, usados: ReadonlySet<string>): string {
  const base = normalizarNombre(nombre).toLowerCase().replace(/ /g, "-") || "ficha";
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  return id;
}

export function fichaPorCodigo(fichas: readonly FichaCliente[], codigo: string | null | undefined): FichaCliente | null {
  const buscado = String(codigo ?? "").trim();
  if (!buscado) return null;
  return fichas.find((f) => f.codigosRps.some((c) => c.trim() === buscado)) ?? null;
}

/**
 * La ficha cuyo nombre está dentro del nombre o del alias del cliente de RPS, sin acentos ni
 * mayúsculas (como se buscaban hasta ahora los clientes de baquetón). Si casan varias, la de
 * nombre más largo, que es la más concreta.
 */
export function sugerirFicha(fichas: readonly FichaCliente[], cliente: Pick<ClienteRps, "nombre" | "alias">): FichaCliente | null {
  const textos = [cliente.alias ?? "", cliente.nombre].map(normalizarNombre).filter(Boolean);
  const casan = fichas.filter((f) => {
    const nombre = normalizarNombre(f.nombre);
    return nombre !== "" && textos.some((texto) => texto.includes(nombre));
  });
  return [...casan].sort((a, b) => normalizarNombre(b.nombre).length - normalizarNombre(a.nombre).length)[0] ?? null;
}

/** Nombres de las fichas añadidas, cambiadas o quitadas (para el historial). */
export function fichasCambiadas(antes: readonly FichaCliente[], despues: readonly FichaCliente[]): string[] {
  const pendientes = new Map(antes.map((f) => [f.id, f]));
  const nombres: string[] = [];
  for (const ficha of despues) {
    const anterior = pendientes.get(ficha.id);
    if (!anterior || JSON.stringify(anterior) !== JSON.stringify(ficha)) nombres.push(ficha.nombre);
    pendientes.delete(ficha.id);
  }
  for (const quitada of pendientes.values()) nombres.push(quitada.nombre);
  return nombres;
}

type Resultado = { ok: true; fichas: FichaCliente[] } | { ok: false; errores: string[] };

/**
 * Validación estricta antes de guardar todas las fichas. Devuelve las fichas limpias (nombre y
 * códigos sin espacios, sin observaciones vacías) o los errores en castellano llano.
 */
export function validarFichas(bruto: unknown, { recogidasGenerales }: { recogidasGenerales: readonly string[] }): Resultado {
  if (!Array.isArray(bruto)) return { ok: false, errores: ["Las fichas tienen que ser una lista."] };
  const errores: string[] = [];
  const ids = new Set<string>();
  const nombres = new Set<string>();
  const codigos = new Map<string, string>();
  const generales = new Set(recogidasGenerales.map(normalizarNombre));
  const propias = new Set<string>();
  const fichas = bruto.map((elemento, i) => {
    const ficha = esObjeto(elemento) ? elemento : {};
    const nombre = esTexto(ficha.nombre) ? ficha.nombre.trim() : "";
    const quien = nombre ? `Ficha «${nombre}»` : `Ficha ${i + 1}`;
    const mal = (texto: string) => { errores.push(`${quien}: ${texto}`); };
    if (!esTexto(ficha.id) || !ficha.id.trim()) mal("falta el identificador");
    else if (ids.has(ficha.id)) mal("el identificador está repetido");
    else ids.add(ficha.id);
    const clave = normalizarNombre(nombre);
    if (!nombre) mal("falta el nombre");
    else if (clave === "GENERAL") mal("«GENERAL» es el valor general del baquetón; usa otro nombre");
    else if (nombres.has(clave)) mal("el nombre está repetido");
    nombres.add(clave);
    const codigosRps = listaDeTextos(ficha.codigosRps) ? ficha.codigosRps.map((c) => c.trim()).filter(Boolean) : null;
    if (!codigosRps) mal("los códigos de RPS tienen que ser textos");
    else for (const codigo of codigosRps) {
      const otra = codigos.get(codigo);
      if (otra === undefined) codigos.set(codigo, nombre);
      else if (otra === nombre) mal(`el código ${codigo} está repetido`);
      else errores.push(`El código de RPS ${codigo} está en dos fichas: «${otra}» y «${nombre}»`);
    }
    comprobarOpcionales(ficha, mal, generales, propias);
    const observaciones = listaDeTextos(ficha.observaciones)
      ? { observaciones: ficha.observaciones.map((o) => o.trim()).filter(Boolean) }
      : {};
    return { ...ficha, nombre, codigosRps: codigosRps ?? [], ...observaciones } as unknown as FichaCliente;
  });
  return errores.length > 0 ? { ok: false, errores } : { ok: true, fichas };
}

function comprobarOpcionales(
  f: Record<string, unknown>, mal: (texto: string) => void, generales: Set<string>, propias: Set<string>,
) {
  if (f.trabajo !== undefined && f.trabajo !== "lona" && f.trabajo !== "baqueton") mal("el trabajo habitual es lona o baquetón");
  if (f.perfil !== undefined) {
    const perfil = esObjeto(f.perfil) ? f.perfil : {};
    if (!TIPOS_PERFIL.includes(perfil.tipoPerfil as TipoPerfil)) mal("elige el perfil");
    for (const campo of CAMPOS_PERFIL) {
      if (perfil[campo] !== undefined && !noNegativo(perfil[campo])) mal(`el perfil: «${campo}» tiene que ser un número`);
    }
  }
  let propia = "";
  if (f.recogidaPropia !== undefined) {
    const recogida = esObjeto(f.recogidaPropia) ? f.recogidaPropia : {};
    propia = esTexto(recogida.nombre) ? recogida.nombre.trim() : "";
    const clave = normalizarNombre(propia);
    if (!propia) mal("la recogida propia necesita un nombre");
    else if (generales.has(clave)) mal(`la recogida propia «${propia}» se llama como una de Parámetros; usa otro nombre`);
    else if (propias.has(clave)) mal(`la recogida «${propia}» ya es la propia de otra ficha`);
    propias.add(clave);
    for (const campo of ["delante", "atras", "lateralSoloAtras", "lateralSoloDelante"] as const) {
      if (!esNumero(recogida[campo])) mal(`la recogida propia: «${campo}» tiene que ser un número`);
    }
    if (recogida.panoTraseroConAnchoDelante !== undefined && typeof recogida.panoTraseroConAnchoDelante !== "boolean") {
      mal("la recogida propia: «paño trasero con el ancho de delante» es sí o no");
    }
  }
  for (const [lado, texto] of [["recogeDelante", "de delante"], ["recogeAtras", "de detrás"]] as const) {
    const valor = f[lado];
    if (valor === undefined) continue;
    const existe = esTexto(valor)
      && (generales.has(normalizarNombre(valor)) || (propia !== "" && normalizarNombre(valor) === normalizarNombre(propia)));
    if (!existe) mal(`la recogida ${texto} «${String(valor)}» no existe`);
  }
  for (const campo of ["bastillaEnfundar", "rotulacion", "cremallera"] as const) {
    if (f[campo] !== undefined && typeof f[campo] !== "boolean") mal(`«${campo}» es sí o no`);
  }
  if (f.ventana !== undefined) {
    const ventana = esObjeto(f.ventana) ? f.ventana : {};
    if (typeof ventana.lleva !== "boolean") mal("la ventana es sí o no");
    for (const campo of ["ancho", "alto"] as const) {
      if (ventana[campo] !== undefined && !noNegativo(ventana[campo])) mal(`la ventana: «${campo}» tiene que ser un número`);
    }
  }
  if (f.material !== undefined && !esTexto(f.material)) mal("el material tiene que ser un texto");
  if (f.sesgoDetras !== undefined && !positivo(f.sesgoDetras)) mal("el sesgo detrás tiene que ser un número mayor que 0");
  if (f.extrasBaqueton !== undefined) {
    const extras = esObjeto(f.extrasBaqueton) ? f.extrasBaqueton : {};
    for (const campo of CAMPOS_EXTRAS) {
      if (!esNumero(extras[campo])) mal(`los extras de baquetón: «${campo}» tiene que ser un número`);
    }
    if (!listaDeTextos(extras.observaciones)) mal("los extras de baquetón: las observaciones son líneas de texto");
  }
  if (f.observaciones !== undefined && !listaDeTextos(f.observaciones)) mal("las observaciones fijas son líneas de texto");
  if (f.medidas !== undefined) comprobarMedidas(f.medidas, mal);
}

function comprobarMedidas(medidas: unknown, mal: (texto: string) => void) {
  if (!Array.isArray(medidas)) {
    mal("las medidas habituales tienen que ser una lista");
    return;
  }
  const vistas = new Set<string>();
  medidas.forEach((elemento, i) => {
    const medida = esObjeto(elemento) ? elemento : {};
    const n = `medida ${i + 1}`;
    if (medida.tipo !== "lona" && medida.tipo !== "baqueton") mal(`${n}: es de lona o de baquetón`);
    if (!positivo(medida.largo) || !positivo(medida.ancho)) {
      mal(`${n}: el largo y el ancho tienen que ser mayores que 0`);
    } else {
      const clave = `${String(medida.tipo)}:${medida.largo}x${medida.ancho}`;
      if (vistas.has(clave)) mal(`${n}: la medida ${fmt(medida.largo as number)} × ${fmt(medida.ancho as number)} está repetida`);
      vistas.add(clave);
    }
    const ollaos = esObjeto(medida.ollaos) ? medida.ollaos : {};
    const lados = LADOS_OLLAOS.map((lado) => ollaos[lado]);
    if (!lados.every((p) => Array.isArray(p) && p.every(positivo))) {
      mal(`${n}: las posiciones de los ollaos tienen que ser números mayores que 0`);
    } else if (lados.every((p) => (p as unknown[]).length === 0)) {
      mal(`${n}: no tiene ningún ollao`);
    }
  });
}
```

- [ ] **Step 5: Escribir la semilla y los parámetros efectivos**

Crear `src/remolques/clientes/semilla.ts`:

```ts
import { DEFAULT_PARAMS, type CalcParams, type ClienteBaqueton, type Recogida } from "../calc/params.ts";
import { idFicha, normalizarNombre } from "./reglas.ts";
import type { FichaCliente } from "./tipos.ts";

// Las fichas se crean una vez, al desplegar la fase 3, con lo que había por cliente en los
// parámetros de remolques. Los códigos de cliente se buscaron en RPS (solo lectura) el 01/10/2026.

/**
 * Códigos de cliente de RPS de las fichas de partida.
 * PENDIENTE DE IVÁN (AYALA): en RPS hay dos clientes, 036662 «REMOLQUES AYALA» y 048286
 * «ENGANCHES Y REMOLQUES AYALA S.L.U». Van los dos hasta que lo confirme: quitar aquí el que no sea
 * antes de desplegar (después, desde Parámetros › Remolques › Clientes).
 */
export const CODIGOS_RPS_SEMILLA: Readonly<Record<string, readonly string[]>> = {
  "HIJOS DE PEDRO LOPEZ": ["001300"],
  "GENERAL WOLDER": ["001047"],
  AYALA: ["036662", "048286"],
};

/** Recogidas que eran de un solo cliente: pasan a su ficha como recogida propia. */
export const RECOGIDA_PROPIA_SEMILLA: Readonly<Record<string, string>> = {
  "PUENTES HIJOS DE PEDRO LOPEZ": "HIJOS DE PEDRO LOPEZ",
};

export const MOTIVO_SEMILLA = "Fichas creadas a partir de los parámetros de remolques";

export const esRecogidaPasada = (nombre: string): boolean =>
  Object.prototype.hasOwnProperty.call(RECOGIDA_PROPIA_SEMILLA, nombre);

export interface EntradasDeCliente {
  clientesBaqueton: ClienteBaqueton[];
  recogidas: Recogida[];
}

/** Lo que en unos parámetros es de un cliente: los clientes de baquetón (menos GENERAL) y las recogidas propias. */
export function entradasDeCliente(params: CalcParams): EntradasDeCliente {
  return {
    clientesBaqueton: params.clientesBaqueton.filter((c) => c.nombre !== "GENERAL"),
    recogidas: params.recogidas.filter((r) => esRecogidaPasada(r.nombre)),
  };
}

/** Las fichas de partida: una por cliente de baquetón, con sus extras, y la recogida propia en la suya. */
export function fichasSemilla(entradas: EntradasDeCliente): FichaCliente[] {
  const hayAlgo = entradas.clientesBaqueton.length > 0 || entradas.recogidas.length > 0;
  // Unos parámetros que ya no tienen clientes (se guardaron limpios antes de crear las fichas):
  // valen los del código, que son los que había.
  const fuente = hayAlgo ? entradas : entradasDeCliente(DEFAULT_PARAMS);
  const fichas: FichaCliente[] = [];
  const ids = new Set<string>();
  const fichaDe = (nombre: string): FichaCliente => {
    const limpio = nombre.trim();
    const existente = fichas.find((f) => normalizarNombre(f.nombre) === normalizarNombre(limpio));
    if (existente) return existente;
    const id = idFicha(limpio, ids);
    ids.add(id);
    const nueva: FichaCliente = { id, nombre: limpio, codigosRps: [...(CODIGOS_RPS_SEMILLA[limpio] ?? [])] };
    fichas.push(nueva);
    return nueva;
  };
  for (const { nombre, ...extras } of fuente.clientesBaqueton) {
    fichaDe(nombre).extrasBaqueton = { ...extras, observaciones: [...extras.observaciones] };
  }
  for (const recogida of fuente.recogidas) {
    fichaDe(RECOGIDA_PROPIA_SEMILLA[recogida.nombre]).recogidaPropia = { ...recogida };
  }
  return fichas;
}
```

Crear `src/remolques/clientes/params-efectivos.ts`:

```ts
import { DEFAULT_PARAMS, type CalcParams } from "../calc/params.ts";
import { esRecogidaPasada } from "./semilla.ts";
import type { FichaCliente } from "./tipos.ts";

// Parámetros generales y efectivos (fase 3). En Parámetros quedan GENERAL y las recogidas normales;
// para calcular, a esos se les suma lo de cada ficha: sus extras de baquetón como un cliente de
// baquetón con el nombre de la ficha y su recogida propia como una recogida más. Así el cálculo,
// la hoja de taller y el dibujo no cambian.

/** Los parámetros sin lo que pasó a las fichas: solo GENERAL en el baquetón y sin recogidas de cliente. */
export function sinEntradasDeCliente(params: CalcParams): CalcParams {
  return {
    ...params,
    clientesBaqueton: params.clientesBaqueton.filter((c) => c.nombre === "GENERAL"),
    recogidas: params.recogidas.filter((r) => !esRecogidaPasada(r.nombre)),
  };
}

/** Lo que valen los parámetros generales sin fichero (y «Restaurar valores por defecto»). */
export const PARAMS_GENERALES: CalcParams = sinEntradasDeCliente(DEFAULT_PARAMS);

/** Los parámetros con que se calcula. Lo de la ficha sustituye a una entrada del mismo nombre. */
export function paramsConFichas(params: CalcParams, fichas: readonly FichaCliente[]): CalcParams {
  const clientes = fichas.flatMap((f) => (f.extrasBaqueton
    ? [{ nombre: f.nombre, ...f.extrasBaqueton, observaciones: [...f.extrasBaqueton.observaciones] }]
    : []));
  const propias = fichas.flatMap((f) => (f.recogidaPropia ? [{ ...f.recogidaPropia }] : []));
  const nombresClientes = new Set(clientes.map((c) => c.nombre));
  const nombresPropias = new Set(propias.map((r) => r.nombre));
  return {
    ...params,
    clientesBaqueton: [...params.clientesBaqueton.filter((c) => !nombresClientes.has(c.nombre)), ...clientes],
    recogidas: [...params.recogidas.filter((r) => !nombresPropias.has(r.nombre)), ...propias],
  };
}
```

- [ ] **Step 6: Ejecutar las pruebas y ver que pasan**

Run: `pnpm exec vitest run src/remolques/clientes`
Expected: PASS (2 ficheros).

- [ ] **Step 7: Tipos y lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/remolques/clientes/tipos.ts src/remolques/clientes/reglas.ts src/remolques/clientes/semilla.ts src/remolques/clientes/params-efectivos.ts src/remolques/clientes/__tests__/reglas.test.ts src/remolques/clientes/__tests__/semilla.test.ts
git commit -m "feat(remolques): fichas de cliente: tipos, validación y semilla

Lo que hoy está por cliente en los parámetros de remolques (extras de
baquetón de HPL, AYALA y GENERAL WOLDER y la recogida de puentes de HPL)
pasa a fichas por cliente real con sus códigos de RPS. Los parámetros
efectivos (generales + fichas) son los de siempre, así que el cálculo, la
hoja y la paridad no cambian. Los códigos de AYALA quedan pendientes de
confirmar.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Aplicar la ficha y diferencias para el botón

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo-medio.

**Files:**
- Create: `src/remolques/clientes/aplicar.ts`, `src/remolques/clientes/diferencias.ts`
- Modify: `src/remolques/workspace/lineas.ts` (solo el campo `delCliente`, que `aplicar.ts` necesita para compilar)
- Test: `src/remolques/clientes/__tests__/aplicar.test.ts`, `src/remolques/clientes/__tests__/diferencias.test.ts`

**Interfaces:**
- Consumes: de la tarea 1 `FichaCliente`, `MarcaDelCliente`, `MedidaHabitual`, `PerfilFicha`, `VentanaFicha`, `ExtrasBaqueton`, `CAMPOS_PERFIL`, `CAMPOS_EXTRAS`, `normalizarNombre`; `LonaInput` (`src/remolques/calc/lona.ts`), `BaquetonInput` (`src/remolques/calc/baqueton.ts`), `RepartoLados`, `findClienteBaqueton`, `nombrePerfil`, `CalcParams`; `etiquetaOpcion(valor: string): string` (`src/remolques/etiquetas.ts`); `LineaPedido` (`src/remolques/workspace/lineas.ts`).
- Produces (lineas): `LineaPedido.delCliente?: MarcaDelCliente`.
- Produces (aplicar): `LINEA_CREMALLERA = "CREMALLERA DEL 9"`, `medidaHabitual(ficha, tipo, largo, ancho): MedidaHabitual | null`, `aplicarFichaAlImportar(linea: LineaPedido, ficha: FichaCliente): LineaPedido`, `aplicarFichaALineas(lineas: LineaPedido[], ficha: FichaCliente | null): LineaPedido[]`, `marcasTrasCambio(marca: MarcaDelCliente | undefined, antes: object, despues: object): MarcaDelCliente | undefined`.
- Produces (diferencias): `type ElementoFicha = { tipo: "lona"; input: LonaInput } | { tipo: "baqueton"; input: BaquetonInput }`, `CLAVES_FICHA`, `type ClaveFicha`, `interface ValoresFicha`, `interface DiferenciaFicha { clave: ClaveFicha; etiqueta: string; antes: string; despues: string; nota?: string; marcada: boolean }`, `valoresDelElemento(elemento, params): ValoresFicha`, `diferenciasConFicha(elemento: ElementoFicha, ficha: FichaCliente | null, params: CalcParams): DiferenciaFicha[]`, `fichaConCambios(ficha: FichaCliente, elemento: ElementoFicha, claves: readonly string[], params: CalcParams): FichaCliente`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/remolques/clientes/__tests__/aplicar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { BaquetonInput } from "../../calc/baqueton.ts";
import type { LonaInput } from "../../calc/lona.ts";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import type { LineaPedido } from "../../workspace/lineas.ts";
import { aplicarFichaALineas, aplicarFichaAlImportar, LINEA_CREMALLERA, marcasTrasCambio } from "../aplicar.ts";
import type { ExtrasBaqueton, FichaCliente, MedidaHabitual } from "../tipos.ts";

// Como sale de RPS: medidas y aguas, «NO» en la recogida que no menciona y «» en la que sí,
// ventana sí/no según la mencione, rotulación sin dato y sin bobina.
const deRps = (cambios: Partial<LonaInput> = {}): LineaPedido => ({
  version: "10", tipo: "lona",
  input: {
    ...emptyLona(), largo: 200, ancho: 120, altoDelante: 100, altoAtras: 100, aguas: 15,
    recogeDelante: "NO", recogeAtras: "", ventana: false, rotulacion: null, material: "", ...cambios,
  },
});
const baqueton = (cambios: Partial<BaquetonInput> = {}): LineaPedido => ({
  version: "11", tipo: "baqueton", input: { ...emptyBaqueton(), largo: 200, ancho: 120, baqueton: 28, ...cambios },
});
const MEDIDA: MedidaHabitual = {
  tipo: "lona", largo: 200, ancho: 120,
  ollaos: { delante: [2.5, 10, 40, 70, 100, 108.5], atras: [2.5, 60.5, 118.5], laterales: [2.5, 100, 197.5] },
};
const EXTRAS: ExtrasBaqueton = {
  extraLargoCostura: 1, extraAnchoCostura: 1, extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
  extraLargoFinal: 1, extraAnchoFinal: 1, extraBaquetonTrasero: 0, observaciones: [],
};
const FICHA: FichaCliente = {
  id: "talleres-cal", nombre: "TALLERES CAL", codigosRps: ["009999"],
  perfil: { tipoPerfil: "TIPO 02", aguas: 20 },
  recogeDelante: "GOMA", recogeAtras: "PUENTES ESVA", bastillaEnfundar: false,
  ventana: { lleva: true, ancho: 50, alto: 35 }, rotulacion: true, material: "LONA GRIS",
  observaciones: ["ETIQUETA DETRÁS"], medidas: [MEDIDA],
};

describe("aplicarFichaAlImportar · lona", () => {
  it("rellena lo vacío con la ficha y lo marca «del cliente»", () => {
    const linea = aplicarFichaAlImportar(deRps(), FICHA);
    expect(linea.input).toMatchObject({
      tipoPerfil: "TIPO 02", aguas: 15, recogeDelante: "GOMA", recogeAtras: "PUENTES ESVA", bastillaEnfundar: false,
      ventana: true, ventanaAncho: 50, ventanaAlto: 35, rotulacion: true, material: "LONA GRIS",
      modoOllaos: "SEGUN SE INDICA", ollaosManuales: MEDIDA.ollaos, observaciones: "ETIQUETA DETRÁS",
    });
    expect(linea.delCliente).toEqual({ ficha: "TALLERES CAL", campos: [
      "tipoPerfil", "recogeDelante", "recogeAtras", "bastillaEnfundar", "ventana", "ventanaAncho", "ventanaAlto",
      "rotulacion", "material", "modoOllaos", "ollaosManuales", "observaciones",
    ] });
  });

  it("lo que RPS dice de verdad manda: rotulación, material, aguas y la ventana con su medida", () => {
    const linea = aplicarFichaAlImportar(deRps({ rotulacion: false, material: "LONA AZUL", ventana: true, ventanaAncho: 60 }), FICHA);
    expect(linea.input).toMatchObject({ rotulacion: false, material: "LONA AZUL", aguas: 15, ventana: true, ventanaAncho: 60, ventanaAlto: 35 });
    for (const campo of ["rotulacion", "material", "ventana", "ventanaAncho"]) expect(linea.delCliente?.campos).not.toContain(campo);
    expect(linea.delCliente?.campos).toContain("ventanaAlto");
  });

  it("medida exacta: ollaos «según se indica» con sus posiciones, en una copia; otra medida no", () => {
    const linea = aplicarFichaAlImportar(deRps(), FICHA);
    const ollaos = (linea.input as LonaInput).ollaosManuales;
    expect(ollaos).toEqual(MEDIDA.ollaos);
    expect(ollaos.delante).not.toBe(MEDIDA.ollaos.delante);
    expect((aplicarFichaAlImportar(deRps({ ancho: 121 }), FICHA).input as LonaInput).modoOllaos).toBe("");
    expect((aplicarFichaAlImportar(deRps({ modoOllaos: "REPARTIDOS" }), FICHA).input as LonaInput).modoOllaos).toBe("REPARTIDOS");
  });

  it("el sesgo pone el ancho de detrás", () => {
    const linea = aplicarFichaAlImportar(deRps(), { id: "h", nombre: "HPL", codigosRps: [], sesgoDetras: 1.5 });
    expect((linea.input as LonaInput).anchoAtras).toBe(121.5);
    expect(linea.delCliente).toEqual({ ficha: "HPL", campos: ["anchoAtras"] });
  });

  it("la cremallera del 9 y las observaciones fijas se añaden sin repetir", () => {
    const linea = aplicarFichaAlImportar(deRps({ observaciones: "ETIQUETA DETRAS" }), {
      id: "c", nombre: "C", codigosRps: [], cremallera: true, observaciones: ["Etiqueta detrás"],
    });
    expect((linea.input as LonaInput).observaciones).toBe(`ETIQUETA DETRAS\n${LINEA_CREMALLERA}`);
  });

  it("sin nada que poner, devuelve la misma línea", () => {
    const linea = deRps();
    expect(aplicarFichaAlImportar(linea, { id: "v", nombre: "V", codigosRps: [] })).toBe(linea);
  });
});

describe("aplicarFichaAlImportar · baquetón", () => {
  it("pone el cliente de los extras si estaba en GENERAL, no si RPS ya dio otro", () => {
    const ficha: FichaCliente = { ...FICHA, extrasBaqueton: EXTRAS, medidas: [{ ...MEDIDA, tipo: "baqueton" }] };
    const linea = aplicarFichaAlImportar(baqueton(), ficha);
    expect(linea.input).toMatchObject({ clienteEspecifico: "TALLERES CAL", rotulacion: true, material: "LONA GRIS", modoOllaos: "SEGUN SE INDICA" });
    expect(linea.delCliente?.campos).toEqual(["clienteEspecifico", "rotulacion", "material", "modoOllaos", "ollaosManuales", "observaciones"]);
    expect((aplicarFichaAlImportar(baqueton({ clienteEspecifico: "AYALA" }), ficha).input as BaquetonInput).clienteEspecifico).toBe("AYALA");
  });

  it("una medida de lona no se aplica a un baquetón", () => {
    expect((aplicarFichaAlImportar(baqueton(), FICHA).input as BaquetonInput).modoOllaos).toBe("");
  });
});

describe("aplicarFichaALineas y marcasTrasCambio", () => {
  it("sin ficha deja las líneas como están", () => {
    const lineas = [deRps(), baqueton()];
    expect(aplicarFichaALineas(lineas, null)).toBe(lineas);
    expect(aplicarFichaALineas(lineas, FICHA)[0].delCliente?.ficha).toBe("TALLERES CAL");
  });

  it("cambiar un campo quita su marca; sin marcas, nada", () => {
    const linea = aplicarFichaAlImportar(deRps(), FICHA);
    const antes = linea.input as LonaInput;
    const marca = marcasTrasCambio(linea.delCliente, antes, { ...antes, recogeDelante: "NO" });
    expect(marca?.campos).not.toContain("recogeDelante");
    expect(marca?.campos).toContain("recogeAtras");
    expect(marcasTrasCambio(linea.delCliente, antes, { ...antes })).toBe(linea.delCliente);
    expect(marcasTrasCambio({ ficha: "X", campos: ["material"] }, antes, { ...antes, material: "OTRA" })).toBeUndefined();
    expect(marcasTrasCambio(undefined, antes, antes)).toBeUndefined();
  });
});
```

Crear `src/remolques/clientes/__tests__/diferencias.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { etiquetaOpcion } from "../../etiquetas.ts";
import { diferenciasConFicha, fichaConCambios, type ElementoFicha } from "../diferencias.ts";
import type { FichaCliente, MedidaHabitual } from "../tipos.ts";

const lona = (cambios: Partial<LonaInput> = {}): ElementoFicha => ({ tipo: "lona", input: { ...emptyLona(), largo: 200, ancho: 120, ...cambios } });
const OLLAOS = { delante: [2.5, 60.5, 118.5], atras: [2.5, 60.5, 118.5], laterales: [2.5, 100, 197.5] };
const conOllaos = (cambios: Partial<LonaInput> = {}) => lona({ modoOllaos: "SEGUN SE INDICA", ollaosManuales: OLLAOS, ...cambios });
const BASE: FichaCliente = { id: "talleres-cal", nombre: "TALLERES CAL", codigosRps: ["009999"] };

describe("diferenciasConFicha", () => {
  it("la medida con sus ollaos sale marcada y «nueva»; lo habitual, desmarcado con antes y después", () => {
    const d = diferenciasConFicha(conOllaos({ tipoPerfil: "TIPO 02", aguas: 20, recogeDelante: "GOMA", rotulacion: true }), BASE, DEFAULT_PARAMS);
    expect(d.map(({ clave, marcada }) => [clave, marcada])).toEqual([["medida", true], ["perfil", false], ["recogeDelante", false], ["rotulacion", false]]);
    expect(d[0]).toMatchObject({
      etiqueta: "Medida 200 × 120 de lona con sus ollaos", nota: "nueva", antes: "—",
      despues: "Delante 2,5 · 60,5 · 118,5 | Atrás 2,5 · 60,5 · 118,5 | Laterales 2,5 · 100 · 197,5",
    });
    expect(d[1]).toMatchObject({ etiqueta: "Perfil y sus medidas", antes: "—", despues: "Recto con aguas · aguas 20" });
    expect(d[2]).toMatchObject({ etiqueta: "Recogida delante", antes: "—", despues: etiquetaOpcion("GOMA") });
    expect(d[3]).toMatchObject({ etiqueta: "Rotulación", antes: "—", despues: "Sí" });
    expect(d[1]).not.toHaveProperty("nota");
  });

  it("la misma medida con otras posiciones «actualiza la de antes»; igual, no sale", () => {
    const vieja: MedidaHabitual = { tipo: "lona", largo: 200, ancho: 120, ollaos: { delante: [2.5, 118.5], atras: [], laterales: [] } };
    expect(diferenciasConFicha(conOllaos(), { ...BASE, medidas: [vieja] }, DEFAULT_PARAMS)[0])
      .toMatchObject({ clave: "medida", nota: "actualiza la de antes", antes: "Delante 2,5 · 118,5" });
    const igual: MedidaHabitual = { ancho: 120, largo: 200, tipo: "lona", ollaos: { laterales: OLLAOS.laterales, delante: OLLAOS.delante, atras: OLLAOS.atras } };
    expect(diferenciasConFicha(conOllaos(), { ...BASE, medidas: [igual] }, DEFAULT_PARAMS)).toEqual([]);
  });

  it("sin ollaos a medida no hay medida que guardar; sin ficha, todo es nuevo", () => {
    expect(diferenciasConFicha(lona({ modoOllaos: "REPARTIDOS" }), BASE, DEFAULT_PARAMS)).toEqual([]);
    expect(diferenciasConFicha(lona({ bastillaEnfundar: true }), null, DEFAULT_PARAMS))
      .toEqual([{ clave: "bastillaEnfundar", etiqueta: "Bastilla de enfundar", antes: "—", despues: "Sí", marcada: false }]);
  });

  it("el sesgo, la ventana y la cremallera del 9", () => {
    const d = diferenciasConFicha(lona({ anchoAtras: 121.5, ventana: true, ventanaAncho: 50, ventanaAlto: 35, observaciones: "CREMALLERA DEL 9" }), BASE, DEFAULT_PARAMS);
    expect(d.map((x) => [x.clave, x.despues])).toEqual([
      ["ventana", "Sí · 50 × 35"], ["sesgoDetras", "1,5 cm más ancho detrás"], ["cremallera", "Sí"],
    ]);
  });

  it("baquetón: los extras del cliente que usa, si no son los de la ficha", () => {
    const b: ElementoFicha = { tipo: "baqueton", input: { ...emptyBaqueton(), largo: 200, ancho: 120, clienteEspecifico: "AYALA" } };
    expect(diferenciasConFicha(b, BASE, DEFAULT_PARAMS)).toEqual([{
      clave: "extrasBaqueton", etiqueta: "Extras de baquetón", antes: "—",
      despues: "costura +1 / +1 · baquetón 0 / 0 · final +1 / +1 · trasero 0", marcada: false,
    }]);
    expect(diferenciasConFicha({ ...b, input: { ...b.input, clienteEspecifico: "GENERAL" } }, BASE, DEFAULT_PARAMS)).toEqual([]);
  });
});

describe("fichaConCambios", () => {
  it("guarda solo lo marcado; la medida sustituye a la del mismo largo × ancho, en su sitio", () => {
    const otra: MedidaHabitual = { tipo: "lona", largo: 300, ancho: 120, ollaos: { delante: [2.5], atras: [], laterales: [] } };
    const conMedidas: FichaCliente = { ...BASE, medidas: [{ tipo: "lona", largo: 200, ancho: 120, ollaos: { delante: [1], atras: [], laterales: [] } }, otra] };
    const elemento = conOllaos({ recogeDelante: "GOMA" });
    const nueva = fichaConCambios(conMedidas, elemento, ["medida"], DEFAULT_PARAMS);
    expect(nueva.medidas).toEqual([{ tipo: "lona", largo: 200, ancho: 120, ollaos: OLLAOS }, otra]);
    expect(nueva.recogeDelante).toBeUndefined();
    expect(fichaConCambios(BASE, elemento, ["recogeDelante"], DEFAULT_PARAMS)).toEqual({ ...BASE, recogeDelante: "GOMA" });
    expect(fichaConCambios(BASE, elemento, ["medida"], DEFAULT_PARAMS).medidas).toEqual([{ tipo: "lona", largo: 200, ancho: 120, ollaos: OLLAOS }]);
  });

  it("los extras de otro cliente pasan a la ficha", () => {
    const b: ElementoFicha = { tipo: "baqueton", input: { ...emptyBaqueton(), clienteEspecifico: "GENERAL WOLDER" } };
    const { nombre: _n, ...extras } = DEFAULT_PARAMS.clientesBaqueton.find((c) => c.nombre === "GENERAL WOLDER")!;
    expect(fichaConCambios(BASE, b, ["extrasBaqueton"], DEFAULT_PARAMS).extrasBaqueton).toEqual(extras);
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/remolques/clientes`
Expected: FAIL — `Failed to resolve import "../aplicar.ts"` y `"../diferencias.ts"`.

- [ ] **Step 3: La marca en la línea del pedido**

En `src/remolques/workspace/lineas.ts`, añadir la importación de tipo junto a las demás:

```ts
import type { MarcaDelCliente } from "../clientes/tipos.ts";
```

y en `interface LineaPedido`, después de `origenRps?: OrigenRps | null;`:

```ts
  /** Campos que puso la ficha del cliente al obtener el pedido (marca «del cliente», fase 3). */
  delCliente?: MarcaDelCliente;
```

- [ ] **Step 4: Escribir `aplicar.ts`**

Crear `src/remolques/clientes/aplicar.ts`:

```ts
import type { BaquetonInput } from "../calc/baqueton.ts";
import type { LonaInput } from "../calc/lona.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import type { LineaPedido } from "../workspace/lineas.ts";
import { CAMPOS_PERFIL } from "./reglas.ts";
import type { FichaCliente, MarcaDelCliente, MedidaHabitual } from "./tipos.ts";

// La ficha del cliente sobre los elementos recién creados desde RPS (fase 3): solo rellena lo que
// está vacío y apunta qué ha puesto para marcarlo «del cliente». Lo que el técnico cambie, manda.
// Solo se usa al obtener el pedido: abrir un borrador o «Corregir» no la vuelve a aplicar.

export const LINEA_CREMALLERA = "CREMALLERA DEL 9";

const r1 = (v: number) => Math.round(v * 10) / 10;
const lineasDe = (texto: string) => texto.split("\n").map((l) => l.trim()).filter(Boolean);
const clave = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLocaleUpperCase("es-ES");

export function medidaHabitual(ficha: FichaCliente, tipo: TipoPlanteamiento, largo: number, ancho: number): MedidaHabitual | null {
  return ficha.medidas?.find((m) => m.tipo === tipo && m.largo === largo && m.ancho === ancho) ?? null;
}

function conObservaciones(actual: string, nuevas: readonly string[], campos: string[]): string {
  const lineas = lineasDe(actual);
  const faltan = nuevas.map((n) => n.trim()).filter((n) => n && !lineas.some((l) => clave(l) === clave(n)));
  if (faltan.length === 0) return actual;
  campos.push("observaciones");
  return [...lineas, ...faltan].join("\n");
}

function conOllaos<T extends LonaInput | BaquetonInput>(input: T, medida: MedidaHabitual | null, campos: string[]): T {
  if (!medida || input.modoOllaos !== "") return input;
  campos.push("modoOllaos", "ollaosManuales");
  return {
    ...input,
    modoOllaos: "SEGUN SE INDICA",
    ollaosManuales: { laterales: [...medida.ollaos.laterales], atras: [...medida.ollaos.atras], delante: [...medida.ollaos.delante] },
  };
}

function aplicarLona(entrada: LonaInput, ficha: FichaCliente, campos: string[]): LonaInput {
  let input: LonaInput = { ...entrada };
  const perfil = ficha.perfil;
  if (perfil && input.tipoPerfil === "") {
    input.tipoPerfil = perfil.tipoPerfil;
    campos.push("tipoPerfil");
    for (const campo of CAMPOS_PERFIL) {
      const valor = perfil[campo];
      if (valor != null && valor > 0 && !(input[campo] ?? 0)) {
        input[campo] = valor;
        campos.push(campo);
      }
    }
  }
  // RPS solo dice si el texto menciona una recogida: «» si la menciona sin tipo y «NO» si no la
  // menciona. Ninguna de las dos es una decisión: las dos se rellenan con la de la ficha.
  for (const lado of ["recogeDelante", "recogeAtras"] as const) {
    const valor = ficha[lado];
    if (valor && (input[lado] === "" || input[lado] === "NO") && input[lado] !== valor) {
      input[lado] = valor;
      campos.push(lado);
    }
  }
  if (ficha.bastillaEnfundar != null && input.bastillaEnfundar === null) {
    input.bastillaEnfundar = ficha.bastillaEnfundar;
    campos.push("bastillaEnfundar");
  }
  if (ficha.ventana) {
    // Igual con la ventana: un «No» de RPS solo dice que el texto no la menciona.
    if (input.ventana !== true && ficha.ventana.lleva) {
      input.ventana = true;
      campos.push("ventana");
    } else if (input.ventana === null) {
      input.ventana = false;
      campos.push("ventana");
    }
    if (input.ventana) {
      for (const [campo, valor] of [["ventanaAncho", ficha.ventana.ancho], ["ventanaAlto", ficha.ventana.alto]] as const) {
        if (valor != null && valor > 0 && !(input[campo] ?? 0)) {
          input[campo] = valor;
          campos.push(campo);
        }
      }
    }
  }
  if (ficha.rotulacion != null && input.rotulacion === null) {
    input.rotulacion = ficha.rotulacion;
    campos.push("rotulacion");
  }
  if (ficha.material && !input.material.trim()) {
    input.material = ficha.material;
    campos.push("material");
  }
  if (ficha.sesgoDetras && input.ancho > 0 && !(input.anchoAtras ?? 0)) {
    input.anchoAtras = r1(input.ancho + ficha.sesgoDetras);
    campos.push("anchoAtras");
  }
  input = conOllaos(input, medidaHabitual(ficha, "lona", input.largo, input.ancho), campos);
  const fijas = [...(ficha.cremallera ? [LINEA_CREMALLERA] : []), ...(ficha.observaciones ?? [])];
  return { ...input, observaciones: conObservaciones(input.observaciones, fijas, campos) };
}

function aplicarBaqueton(entrada: BaquetonInput, ficha: FichaCliente, campos: string[]): BaquetonInput {
  let input: BaquetonInput = { ...entrada };
  if (ficha.extrasBaqueton && input.clienteEspecifico === "GENERAL") {
    input.clienteEspecifico = ficha.nombre;
    campos.push("clienteEspecifico");
  }
  if (ficha.rotulacion != null && input.rotulacion === null) {
    input.rotulacion = ficha.rotulacion;
    campos.push("rotulacion");
  }
  if (ficha.material && !input.material.trim()) {
    input.material = ficha.material;
    campos.push("material");
  }
  input = conOllaos(input, medidaHabitual(ficha, "baqueton", input.largo, input.ancho), campos);
  return { ...input, observaciones: conObservaciones(input.observaciones, ficha.observaciones ?? [], campos) };
}

/** La ficha sobre un elemento recién creado desde RPS: solo rellena lo vacío y marca lo que pone. */
export function aplicarFichaAlImportar(linea: LineaPedido, ficha: FichaCliente): LineaPedido {
  const campos: string[] = [];
  const input = linea.tipo === "lona"
    ? aplicarLona(linea.input as LonaInput, ficha, campos)
    : aplicarBaqueton(linea.input as BaquetonInput, ficha, campos);
  return campos.length > 0 ? { ...linea, input, delCliente: { ficha: ficha.nombre, campos } } : linea;
}

export function aplicarFichaALineas(lineas: LineaPedido[], ficha: FichaCliente | null): LineaPedido[] {
  return ficha ? lineas.map((linea) => aplicarFichaAlImportar(linea, ficha)) : lineas;
}

/** Tras un cambio del técnico, la marca pierde los campos que ya no tienen el valor de la ficha. */
export function marcasTrasCambio(marca: MarcaDelCliente | undefined, antes: object, despues: object): MarcaDelCliente | undefined {
  if (!marca) return undefined;
  const a = antes as Record<string, unknown>;
  const d = despues as Record<string, unknown>;
  const campos = marca.campos.filter((campo) => JSON.stringify(a[campo]) === JSON.stringify(d[campo]));
  if (campos.length === marca.campos.length) return marca;
  return campos.length > 0 ? { ...marca, campos } : undefined;
}
```

- [ ] **Step 5: Escribir `diferencias.ts`**

Crear `src/remolques/clientes/diferencias.ts`:

```ts
import type { BaquetonInput } from "../calc/baqueton.ts";
import type { LonaInput } from "../calc/lona.ts";
import type { RepartoLados } from "../calc/ollaos.ts";
import { findClienteBaqueton, nombrePerfil, type CalcParams } from "../calc/params.ts";
import { etiquetaOpcion } from "../etiquetas.ts";
import { LINEA_CREMALLERA, medidaHabitual } from "./aplicar.ts";
import { CAMPOS_PERFIL, normalizarNombre } from "./reglas.ts";
import type { ExtrasBaqueton, FichaCliente, MedidaHabitual, PerfilFicha, VentanaFicha } from "./tipos.ts";

// «Guardar en la ficha del cliente» (fase 3): qué tiene un elemento distinto de la ficha (la medida
// con sus ollaos, marcada; lo habitual, desmarcado) y cómo queda la ficha con lo que se marque.

export type ElementoFicha = { tipo: "lona"; input: LonaInput } | { tipo: "baqueton"; input: BaquetonInput };

export const CLAVES_FICHA = [
  "medida", "perfil", "recogeDelante", "recogeAtras", "bastillaEnfundar", "ventana", "rotulacion", "material",
  "sesgoDetras", "cremallera", "extrasBaqueton",
] as const;
export type ClaveFicha = (typeof CLAVES_FICHA)[number];

export interface ValoresFicha {
  medida?: MedidaHabitual;
  perfil?: PerfilFicha;
  recogeDelante?: string;
  recogeAtras?: string;
  bastillaEnfundar?: boolean;
  ventana?: VentanaFicha;
  rotulacion?: boolean;
  material?: string;
  sesgoDetras?: number;
  cremallera?: boolean;
  extrasBaqueton?: ExtrasBaqueton;
}

export interface DiferenciaFicha {
  clave: ClaveFicha;
  etiqueta: string;
  /** «—» si la ficha no lo tiene. */
  antes: string;
  despues: string;
  /** Solo la medida: «nueva» o «actualiza la de antes». */
  nota?: string;
  /** Marcada al abrir la ventana: solo la medida con sus ollaos. */
  marcada: boolean;
}

const NADA = "—";
const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const conSigno = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));
const r1 = (v: number) => Math.round(v * 10) / 10;
/** JSON con las claves ordenadas: el mismo valor escrito en otro orden es igual. */
const estable = (valor: unknown) => JSON.stringify(valor, (_clave, v: unknown) => (
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
    : v
));
const copiaOllaos = (o: RepartoLados): RepartoLados => ({ delante: [...o.delante], atras: [...o.atras], laterales: [...o.laterales] });

const ETIQUETA_PERFIL: Record<(typeof CAMPOS_PERFIL)[number], string> = {
  aguas: "aguas", radioCumbrera: "radio cumbrera", radioHombro: "radio hombro", radioEsquina: "radio esquina",
  chaflan: "chaflán", radioChaflanAbajo: "radio abajo", radioChaflanArriba: "radio arriba",
};
const ETIQUETAS: Record<Exclude<ClaveFicha, "medida">, string> = {
  perfil: "Perfil y sus medidas", recogeDelante: "Recogida delante", recogeAtras: "Recogida detrás",
  bastillaEnfundar: "Bastilla de enfundar", ventana: "Ventana", rotulacion: "Rotulación", material: "Material",
  sesgoDetras: "Sesgo detrás", cremallera: "Cremallera del 9", extrasBaqueton: "Extras de baquetón",
};

/** Lo que el elemento diría a la ficha; lo que no tiene (sin elegir, vacío), no está. */
export function valoresDelElemento(elemento: ElementoFicha, params: CalcParams): ValoresFicha {
  const valores: ValoresFicha = {};
  const { input } = elemento;
  const o = input.ollaosManuales;
  if (input.modoOllaos === "SEGUN SE INDICA" && input.largo > 0 && input.ancho > 0
    && [o.delante, o.atras, o.laterales].some((lado) => lado.length > 0)) {
    valores.medida = { tipo: elemento.tipo, largo: input.largo, ancho: input.ancho, ollaos: copiaOllaos(o) };
  }
  if (elemento.tipo === "lona") {
    const lona = elemento.input;
    if (lona.tipoPerfil) {
      const perfil: PerfilFicha = { tipoPerfil: lona.tipoPerfil };
      for (const campo of CAMPOS_PERFIL) {
        const valor = lona[campo];
        if (valor != null && valor > 0) perfil[campo] = valor;
      }
      valores.perfil = perfil;
    }
    if (lona.recogeDelante) valores.recogeDelante = lona.recogeDelante;
    if (lona.recogeAtras) valores.recogeAtras = lona.recogeAtras;
    if (lona.bastillaEnfundar !== null) valores.bastillaEnfundar = lona.bastillaEnfundar;
    if (lona.ventana !== null) {
      valores.ventana = lona.ventana
        ? { lleva: true, ...(lona.ventanaAncho ? { ancho: lona.ventanaAncho } : {}), ...(lona.ventanaAlto ? { alto: lona.ventanaAlto } : {}) }
        : { lleva: false };
    }
  }
  if (input.rotulacion !== null) valores.rotulacion = input.rotulacion;
  if (input.material.trim()) valores.material = input.material.trim();
  if (elemento.tipo === "lona") {
    const lona = elemento.input;
    if (lona.ancho > 0 && (lona.anchoAtras ?? 0) > lona.ancho) valores.sesgoDetras = r1((lona.anchoAtras ?? 0) - lona.ancho);
    if (lona.observaciones.split("\n").some((l) => normalizarNombre(l) === normalizarNombre(LINEA_CREMALLERA))) valores.cremallera = true;
  } else {
    const nombre = elemento.input.clienteEspecifico;
    const cliente = nombre && nombre !== "GENERAL" ? findClienteBaqueton(params, nombre) : null;
    if (cliente && cliente.nombre === nombre) {
      const { nombre: _nombre, ...extras } = cliente;
      valores.extrasBaqueton = { ...extras, observaciones: [...extras.observaciones] };
    }
  }
  return valores;
}

function valorEnFicha(ficha: FichaCliente | null, clave: ClaveFicha, nuevos: ValoresFicha): unknown {
  if (!ficha) return undefined;
  if (clave === "medida") {
    const m = nuevos.medida!;
    return medidaHabitual(ficha, m.tipo, m.largo, m.ancho) ?? undefined;
  }
  return ficha[clave];
}

const textoOllaos = (o: RepartoLados) => ([["Delante", o.delante], ["Atrás", o.atras], ["Laterales", o.laterales]] as const)
  .filter(([, posiciones]) => posiciones.length > 0)
  .map(([lado, posiciones]) => `${lado} ${posiciones.map(fmt).join(" · ")}`)
  .join(" | ");

function texto(clave: ClaveFicha, valor: unknown): string {
  if (valor === undefined) return NADA;
  switch (clave) {
    case "medida":
      return textoOllaos((valor as MedidaHabitual).ollaos);
    case "perfil": {
      const perfil = valor as PerfilFicha;
      const medidas = CAMPOS_PERFIL.flatMap((c) => (perfil[c] != null ? [`${ETIQUETA_PERFIL[c]} ${fmt(perfil[c]!)}`] : []));
      return [nombrePerfil(perfil.tipoPerfil), ...medidas].join(" · ");
    }
    case "recogeDelante":
    case "recogeAtras":
      return etiquetaOpcion(String(valor));
    case "bastillaEnfundar":
    case "rotulacion":
    case "cremallera":
      return valor ? "Sí" : "No";
    case "ventana": {
      const ventana = valor as VentanaFicha;
      if (!ventana.lleva) return "No";
      return ventana.ancho && ventana.alto ? `Sí · ${fmt(ventana.ancho)} × ${fmt(ventana.alto)}` : "Sí";
    }
    case "material":
      return String(valor);
    case "sesgoDetras":
      return `${fmt(valor as number)} cm más ancho detrás`;
    case "extrasBaqueton": {
      const e = valor as ExtrasBaqueton;
      return `costura ${conSigno(e.extraLargoCostura)} / ${conSigno(e.extraAnchoCostura)} · baquetón ${conSigno(e.extraBaquetonLargoDelante)} / ${conSigno(e.extraBaquetonLargoDetras)} · final ${conSigno(e.extraLargoFinal)} / ${conSigno(e.extraAnchoFinal)} · trasero ${conSigno(e.extraBaquetonTrasero)}`;
    }
  }
}

function etiqueta(clave: ClaveFicha, nuevos: ValoresFicha): string {
  if (clave !== "medida") return ETIQUETAS[clave];
  const m = nuevos.medida!;
  return `Medida ${fmt(m.largo)} × ${fmt(m.ancho)} de ${m.tipo === "lona" ? "lona" : "baquetón"} con sus ollaos`;
}

/** Lo que el elemento tiene distinto de la ficha (o todo, si el cliente no tiene ficha). */
export function diferenciasConFicha(elemento: ElementoFicha, ficha: FichaCliente | null, params: CalcParams): DiferenciaFicha[] {
  const nuevos = valoresDelElemento(elemento, params);
  const diferencias: DiferenciaFicha[] = [];
  for (const clave of CLAVES_FICHA) {
    const nuevo = nuevos[clave];
    if (nuevo === undefined) continue;
    const antes = valorEnFicha(ficha, clave, nuevos);
    if (estable(antes) === estable(nuevo)) continue;
    diferencias.push({
      clave,
      etiqueta: etiqueta(clave, nuevos),
      antes: texto(clave, antes),
      despues: texto(clave, nuevo),
      ...(clave === "medida" ? { nota: antes === undefined ? "nueva" : "actualiza la de antes" } : {}),
      marcada: clave === "medida",
    });
  }
  return diferencias;
}

/** La ficha con lo marcado del elemento. La medida sustituye a la del mismo elemento y largo × ancho. */
export function fichaConCambios(ficha: FichaCliente, elemento: ElementoFicha, claves: readonly string[], params: CalcParams): FichaCliente {
  const nuevos = valoresDelElemento(elemento, params);
  const siguiente: FichaCliente = { ...ficha };
  for (const clave of CLAVES_FICHA) {
    const valor = nuevos[clave];
    if (!claves.includes(clave) || valor === undefined) continue;
    if (clave === "medida") {
      const medida = valor as MedidaHabitual;
      const actuales = ficha.medidas ?? [];
      const igual = (m: MedidaHabitual) => m.tipo === medida.tipo && m.largo === medida.largo && m.ancho === medida.ancho;
      siguiente.medidas = actuales.some(igual) ? actuales.map((m) => (igual(m) ? medida : m)) : [...actuales, medida];
    } else {
      (siguiente as unknown as Record<string, unknown>)[clave] = valor;
    }
  }
  return siguiente;
}
```

- [ ] **Step 6: Ejecutar las pruebas y ver que pasan**

Run: `pnpm exec vitest run src/remolques/clientes src/remolques/workspace`
Expected: PASS (las de `workspace` siguen igual: `delCliente` es opcional).

- [ ] **Step 7: Tipos y lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/remolques/clientes/aplicar.ts src/remolques/clientes/diferencias.ts src/remolques/clientes/__tests__/aplicar.test.ts src/remolques/clientes/__tests__/diferencias.test.ts src/remolques/workspace/lineas.ts
git commit -m "feat(remolques): aplicar la ficha del cliente y ver lo distinto

Al obtener un pedido de RPS, la ficha solo rellena lo vacío (también la
recogida o la ventana que RPS no menciona), pone los ollaos «a medida» si
el largo × ancho coincide exactamente con una medida habitual y apunta
qué ha puesto para marcarlo «del cliente». Para el botón «Guardar en la
ficha del cliente», lo que el elemento tiene distinto de la ficha y cómo
queda con lo marcado.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Servidor: almacén, siembra, rutas y parámetros efectivos

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (el código está completo; hay que encajarlo en `server.js` y comprobarlo en la aislada).

**Files:**
- Create: `src/remolquesClientesStore.js`, `src/remolquesClientesStore.test.js`, `src/client/remolques/fichasClientes.ts`, `src/client/remolques/fichasClientes.test.ts`
- Modify: `src/remolquesParametersStore.js`, `src/remolquesParametersStore.test.js`, `src/config.js`, `src/config.test.js`, `src/server.js`

**Interfaces:**
- Consumes: de las tareas 1 y 2 `validarFichas`, `fichasCambiadas`, `fichaPorCodigo`, `idFicha`, `normalizarNombre`, `fichasSemilla`, `entradasDeCliente`, `MOTIVO_SEMILLA`, `sinEntradasDeCliente`, `PARAMS_GENERALES`, `paramsConFichas`, `fichaConCambios`, `ElementoFicha`, `FichaCliente`, `SnapshotFichas`; `writeFileAtomic(targetPath, contents)` (`src/workflow.js`); `REMOLQUES_PARAMETERS_SAVED` (`src/client/remolques/useRemolquesParameters.ts`); `ClienteRps`.
- Produces (almacén de parámetros): `createRemolquesParametersStore(...)` devuelve además `entradasDeCliente(): Promise<EntradasDeCliente>`; `get()`/`getSnapshot()` ya sin lo que pasó a las fichas.
- Produces (almacén de fichas): `createRemolquesClientesStore({ file, historyFile?, technicians, semilla: () => Promise<FichaCliente[]>, recogidasGenerales: () => Promise<string[]>, logger? })` → `{ get(): Promise<FichaCliente[]>, getSnapshot(): Promise<SnapshotFichas>, save({ baseVersion, fichas, updatedBy, reason }): Promise<SnapshotFichas>, desdePedido({ numeroPedido, cliente: { codigo, nombre }, fichaId?, elemento?, claves, updatedBy, params }): Promise<{ ficha, snapshot }>, history(limit?): Promise<object[]> }`. Errores con `code`: `INVALID_INPUT` (400), `VERSION_CONFLICT` (409, con `current`), `CODE_TAKEN` (409), `NOT_FOUND` (404).
- Produces (config): `config.remolquesClientesFile` (semilla `REMOLQUES_CLIENTES_FILE`, por defecto `remolques-clientes.json` junto a `remolques-parameters.json`).
- Produces (rutas): `GET /api/remolques/clientes` → `SnapshotFichas`; `PUT /api/remolques/clientes` (cuerpo `{ baseVersion, fichas, updatedBy, reason }`); `GET /api/remolques/clientes/historial?limit=` → `{ entries }`; `POST /api/remolques/clientes/desde-pedido` → `{ ficha, snapshot }`; `GET /api/remolques/parametros` → efectivos; `?detalle=1` → generales con versión.
- Produces (web): `RUTA_FICHAS`, `REMOLQUES_CLIENTES_SAVED = 'remolques-clientes-saved'`, `nombreClienteRps(cliente: Pick<ClienteRps, 'nombre' | 'alias'>): string`, `leerFichas(): Promise<SnapshotFichas>`, `interface CuerpoDesdePedido`, `guardarDesdePedido(cuerpo): Promise<{ ficha: FichaCliente; snapshot: SnapshotFichas }>`, `avisarFichasGuardadas(): void`.

- [ ] **Step 1: Escribir las pruebas que fallan del almacén de fichas**

Crear `src/remolquesClientesStore.test.js`:

```js
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRemolquesClientesStore } from './remolquesClientesStore.js';
import { DEFAULT_PARAMS } from './remolques/calc/params.ts';
import { PARAMS_GENERALES } from './remolques/clientes/params-efectivos.ts';
import { entradasDeCliente, fichasSemilla, MOTIVO_SEMILLA } from './remolques/clientes/semilla.ts';
import { emptyLona } from './remolques/entradas-vacias.ts';

let dir;
let logger;
const file = () => path.join(dir, 'remolques-clientes.json');
const store = (extra = {}) => createRemolquesClientesStore({
  file: file(),
  technicians: ['IVÁN', 'JAIME'],
  semilla: async () => fichasSemilla(entradasDeCliente(DEFAULT_PARAMS)),
  recogidasGenerales: async () => PARAMS_GENERALES.recogidas.map((r) => r.nombre),
  logger,
  ...extra
});
const LONA = {
  tipo: 'lona',
  input: { ...emptyLona(), largo: 200, ancho: 120, modoOllaos: 'SEGUN SE INDICA', ollaosManuales: { delante: [2.5, 60.5, 118.5], atras: [], laterales: [] }, recogeDelante: 'GOMA' }
};

beforeEach(async () => {
  const root = path.resolve('tmp/tests/remolques-clientes');
  await mkdir(root, { recursive: true });
  dir = await mkdtemp(path.join(root, 'caso-'));
  logger = { warn: vi.fn() };
});

describe('fichas de partida', () => {
  it('sin fichero se crean una sola vez, aunque se lean dos veces a la vez', async () => {
    const s = store();
    const [a, b] = await Promise.all([s.get(), s.get()]);
    expect(a.map((f) => f.nombre)).toEqual(['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']);
    expect(b).toEqual(a);
    expect(await s.getSnapshot()).toMatchObject({ version: 1, updatedBy: '', reason: MOTIVO_SEMILLA });
    expect(await s.history()).toMatchObject([{ version: 1, reason: MOTIVO_SEMILLA, changedSections: ['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER'] }]);
    expect(JSON.parse(await readFile(file(), 'utf8')).fichas).toHaveLength(3);
  });

  it('si no se pueden guardar, se usan igual y se avisa', async () => {
    const bloqueo = path.join(dir, 'bloqueo');
    await writeFile(bloqueo, 'no es una carpeta');
    const s = store({ historyFile: path.join(bloqueo, 'historial.jsonl') });
    expect((await s.get()).map((f) => f.nombre)).toEqual(['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']);
    expect(logger.warn).toHaveBeenCalled();
    expect(existsSync(file())).toBe(false);
  });

  it('un fichero roto no se vuelve a sembrar: no hay fichas y se avisa', async () => {
    await writeFile(file(), '{ roto', 'utf8');
    expect(await store().get()).toEqual([]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(await readFile(file(), 'utf8')).toBe('{ roto');
  });
});

describe('guardar todas las fichas', () => {
  it('con versión e historial; si otro puesto guardó antes, 409 con lo actual', async () => {
    const s = store();
    const { fichas } = await s.getSnapshot();
    const cambiadas = fichas.map((f) => (f.id === 'ayala' ? { ...f, codigosRps: ['048286'] } : f));
    expect(await s.save({ baseVersion: 1, fichas: cambiadas, updatedBy: 'iván', reason: 'AYALA confirmado' }))
      .toMatchObject({ version: 2, updatedBy: 'IVÁN', reason: 'AYALA confirmado' });
    expect((await store().get()).find((f) => f.id === 'ayala').codigosRps).toEqual(['048286']);
    expect((await s.history())[0]).toMatchObject({ version: 2, changedSections: ['AYALA'], parameters: { fichas: cambiadas } });
    await expect(s.save({ baseVersion: 1, fichas, updatedBy: 'IVÁN', reason: 'Tarde' }))
      .rejects.toMatchObject({ code: 'VERSION_CONFLICT', current: { version: 2 } });
  });

  it('exige quién, motivo y versión, y no guarda un código en dos fichas', async () => {
    const s = store();
    const { fichas } = await s.getSnapshot();
    const base = { baseVersion: 1, fichas, updatedBy: 'IVÁN', reason: 'Prueba' };
    await expect(s.save({ ...base, updatedBy: 'NADIE' })).rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'Elige quién hace el cambio («Soy»).' });
    await expect(s.save({ ...base, reason: ' ' })).rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'Indica el motivo del cambio.' });
    await expect(s.save({ ...base, baseVersion: undefined })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    const repetido = fichas.map((f) => (f.id === 'ayala' ? { ...f, codigosRps: ['001300'] } : f));
    await expect(s.save({ ...base, fichas: repetido }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'El código de RPS 001300 está en dos fichas: «HIJOS DE PEDRO LOPEZ» y «AYALA»' });
    expect(await s.history()).toHaveLength(1);
  });

  it('sin cambios no crea una versión', async () => {
    const s = store();
    const { fichas } = await s.getSnapshot();
    expect((await s.save({ baseVersion: 1, fichas, updatedBy: 'IVÁN', reason: 'Nada' })).version).toBe(1);
  });
});

describe('desde un pedido', () => {
  const pedido = { numeroPedido: 'AR.26.04286', updatedBy: 'IVÁN', params: DEFAULT_PARAMS };

  it('añade el código a una ficha con el motivo «Código añadido desde el pedido…»', async () => {
    const s = store();
    const { ficha, snapshot } = await s.desdePedido({ ...pedido, cliente: { codigo: '036999', nombre: 'REMOLQUES AYALA BIS' }, fichaId: 'ayala', claves: [] });
    expect(ficha.codigosRps).toEqual(['036662', '048286', '036999']);
    expect(snapshot).toMatchObject({ version: 2, updatedBy: 'IVÁN', reason: 'Código añadido desde el pedido AR.26.04286' });
  });

  it('crea la ficha si el cliente no tiene, y guarda solo lo marcado', async () => {
    const s = store();
    const { ficha, snapshot } = await s.desdePedido({ ...pedido, updatedBy: 'JAIME', cliente: { codigo: '009999', nombre: 'TALLERES CAL' }, elemento: LONA, claves: ['medida'] });
    expect(ficha).toEqual({ id: 'talleres-cal', nombre: 'TALLERES CAL', codigosRps: ['009999'], medidas: [{ tipo: 'lona', largo: 200, ancho: 120, ollaos: LONA.input.ollaosManuales }] });
    expect(snapshot.reason).toBe('Desde el pedido AR.26.04286');
    expect((await s.history(1))[0]).toMatchObject({ changedSections: ['TALLERES CAL'], updatedBy: 'JAIME' });
  });

  it('un nombre que ya es de otra ficha lleva el código', async () => {
    const s = store();
    const { ficha } = await s.desdePedido({ ...pedido, cliente: { codigo: '777777', nombre: 'Ayala' }, claves: [] });
    expect(ficha).toMatchObject({ nombre: 'Ayala (777777)', codigosRps: ['777777'] });
  });

  it('una ficha que ya no existe o un código de otra ficha no se guardan', async () => {
    const s = store();
    await expect(s.desdePedido({ ...pedido, cliente: { codigo: '1', nombre: 'X' }, fichaId: 'no-existe', claves: [] }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(s.desdePedido({ ...pedido, cliente: { codigo: '001300', nombre: 'X' }, fichaId: 'ayala', claves: [] }))
      .rejects.toMatchObject({ code: 'CODE_TAKEN', message: 'El código 001300 ya está en la ficha «HIJOS DE PEDRO LOPEZ».' });
    await expect(s.desdePedido({ ...pedido, cliente: { codigo: '', nombre: 'X' }, claves: [] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(s.desdePedido({ ...pedido, cliente: { codigo: '1', nombre: 'X' }, claves: ['medida'] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'Falta el elemento del pedido.' });
    expect(await s.history()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Pruebas nuevas del almacén de parámetros**

En `src/remolquesParametersStore.test.js`:
- Añadir `import { PARAMS_GENERALES } from './remolques/clientes/params-efectivos.ts';`.
- En todo el fichero, `DEFAULT_PARAMS` pasa a `PARAMS_GENERALES` **salvo** en el `import` de `DEFAULT_PARAMS` (se queda para las pruebas nuevas). Así «sin fichero son los del código» espera `PARAMS_GENERALES`, «un fichero guardado antes de los ganchos corazón» parte de `PARAMS_GENERALES.recogidas`, etc.
- Sustituir la prueba `'un fichero guardado antes de la marca del paño trasero de HPL la recibe sin cambiar sus medidas'` por estas dos:

```js
  it('los clientes y la recogida de HPL pasan a las fichas: no salen en los generales, pero se leen para crearlas', async () => {
    const guardadas = DEFAULT_PARAMS.recogidas.map(({ panoTraseroConAnchoDelante: _marca, ...r }) => r);
    const clientes = DEFAULT_PARAMS.clientesBaqueton.map((c) => (c.nombre === 'AYALA' ? { ...c, extraLargoCostura: 2 } : c));
    await writeFile(file(), JSON.stringify({ recogidas: guardadas, clientesBaqueton: clientes }), 'utf8');
    const s = store();
    expect(await s.get()).toEqual(PARAMS_GENERALES);
    const entradas = await s.entradasDeCliente();
    expect(entradas.clientesBaqueton.map((c) => c.nombre)).toEqual(['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']);
    expect(entradas.clientesBaqueton[1].extraLargoCostura).toBe(2);
    // La marca del paño trasero que el fichero no traía se le pone al leer, como antes.
    expect(entradas.recogidas).toEqual([DEFAULT_PARAMS.recogidas.find((r) => r.nombre === 'PUENTES HIJOS DE PEDRO LOPEZ')]);
  });

  it('al guardar, lo que pasó a las fichas sale del fichero', async () => {
    await writeFile(file(), JSON.stringify(DEFAULT_PARAMS), 'utf8');
    const s = store();
    await s.save(input({ ...DEFAULT_PARAMS, demasiaAlto: 6 }));
    const { parameters } = JSON.parse(await readFile(file(), 'utf8'));
    expect(parameters.clientesBaqueton.map((c) => c.nombre)).toEqual(['GENERAL']);
    expect(parameters.recogidas.some((r) => r.nombre === 'PUENTES HIJOS DE PEDRO LOPEZ')).toBe(false);
    expect(await s.history(1)).toMatchObject([{ changedSections: ['lona'] }]);
  });
```

En `src/config.test.js`, añadir `const originalRemolquesClientesFile = process.env.REMOLQUES_CLIENTES_FILE;` con las demás, `restoreEnvironment('REMOLQUES_CLIENTES_FILE', originalRemolquesClientesFile);` en `afterEach`, y después de la prueba de `REMOLQUES_PARAMETERS_FILE`:

```js
  test('las fichas de cliente de remolques van junto a sus parámetros y REMOLQUES_CLIENTES_FILE manda si se indica', async () => {
    process.env.RULE_PARAMETERS_FILE = '/var/lib/toldos-testar/rule-parameters.json';
    delete process.env.REMOLQUES_PARAMETERS_FILE;
    delete process.env.REMOLQUES_CLIENTES_FILE;
    expect((await loadConfig('production', '')).remolquesClientesFile.replace(/\\/g, '/')).toBe('/var/lib/toldos-testar/remolques-clientes.json');
    process.env.REMOLQUES_PARAMETERS_FILE = '/otra/ruta/remolques.json';
    expect((await loadConfig('production', '')).remolquesClientesFile.replace(/\\/g, '/')).toBe('/otra/ruta/remolques-clientes.json');
    process.env.REMOLQUES_CLIENTES_FILE = '/fichas/clientes.json';
    expect((await loadConfig('production', '')).remolquesClientesFile).toBe('/fichas/clientes.json');
  });
```

- [ ] **Step 3: Pruebas de la API de fichas en la web**

Crear `src/client/remolques/fichasClientes.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guardarDesdePedido, leerFichas, nombreClienteRps, REMOLQUES_CLIENTES_SAVED } from './fichasClientes';
import { REMOLQUES_PARAMETERS_SAVED } from './useRemolquesParameters';

afterEach(() => vi.unstubAllGlobals());
const respuesta = (status: number, datos: unknown) => ({ ok: status < 400, status, json: async () => datos });

describe('fichas de cliente en la web', () => {
  it('el nombre del cliente de RPS: el alias si lo tiene', () => {
    expect(nombreClienteRps({ nombre: 'ENGANCHES Y REMOLQUES AYALA S.L.U', alias: ' REMOLQUES AYALA ' })).toBe('REMOLQUES AYALA');
    expect(nombreClienteRps({ nombre: ' TALLERES CAL ', alias: null })).toBe('TALLERES CAL');
  });

  it('lee las fichas y rechaza una respuesta sin su forma', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respuesta(200, { version: 3, fichas: [] })).mockResolvedValueOnce(respuesta(200, {})));
    expect(await leerFichas()).toEqual({ version: 3, fichas: [] });
    await expect(leerFichas()).rejects.toThrow('Las fichas de cliente recibidas no son válidas.');
  });

  it('guardar desde un pedido manda el cuerpo y avisa a Remolques y a Parámetros', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { ficha: { id: 'a', nombre: 'A', codigosRps: ['1'] }, snapshot: { version: 2, fichas: [] } }));
    const dispatchEvent = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { dispatchEvent });
    const cuerpo = { numeroPedido: 'AR.26.04286', cliente: { codigo: '1', nombre: 'A' }, fichaId: 'a', claves: [], updatedBy: 'IVÁN' };
    expect((await guardarDesdePedido(cuerpo)).ficha.nombre).toBe('A');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/remolques/clientes/desde-pedido');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(cuerpo);
    expect(dispatchEvent.mock.calls.map(([e]) => e.type)).toEqual([REMOLQUES_CLIENTES_SAVED, REMOLQUES_PARAMETERS_SAVED]);
  });

  it('si el servidor no lo guarda, su mensaje', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(409, { error: 'El código 1 ya está en la ficha «B».' })));
    await expect(guardarDesdePedido({ numeroPedido: 'AR.26.04286', cliente: { codigo: '1', nombre: 'A' }, claves: [], updatedBy: 'IVÁN' }))
      .rejects.toThrow('El código 1 ya está en la ficha «B».');
  });
});
```

- [ ] **Step 4: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/remolquesClientesStore.test.js src/remolquesParametersStore.test.js src/config.test.js src/client/remolques/fichasClientes.test.ts`
Expected: FAIL — no existen `./remolquesClientesStore.js`, `entradasDeCliente` del almacén de parámetros, `remolquesClientesFile` ni `./fichasClientes`.

- [ ] **Step 5: El almacén de parámetros deja fuera lo que pasó a las fichas**

En `src/remolquesParametersStore.js`:

```js
import { sinEntradasDeCliente } from './remolques/clientes/params-efectivos.ts';
import { entradasDeCliente } from './remolques/clientes/semilla.ts';
```

En el comentario de cabecera, cambiar «(recogidas, clientes con baquetón, demasías...)» por «(recogidas, demasías, extras generales del baquetón...). Lo que era de un cliente (sus extras de baquetón y su recogida propia) vive en su ficha (`remolquesClientesStore.js`): aquí se deja fuera al leer y sale del fichero en el siguiente guardado».

En `readCurrent`, sustituir

```js
    const parameters = normalizarParams(raw, { migrar: !modern });
    if (technicians) parameters.tecnicos = [...technicians];
    return { raw, snapshot: {
```

por

```js
    // Completos (con lo que era de un cliente) solo para crear las fichas la primera vez.
    const completos = normalizarParams(raw, { migrar: !modern });
    const parameters = sinEntradasDeCliente(completos);
    if (technicians) parameters.tecnicos = [...technicians];
    return { raw, completos, snapshot: {
```

En `write`, sustituir

```js
    const validation = validarParams(next);
    if (!validation.ok) throw storeError('INVALID_INPUT', validation.errores.join('. '));
    const changedSections = Object.entries(sections).filter(([, fields]) => fields.some((field) => JSON.stringify(current.parameters[field]) !== JSON.stringify(next[field]))).map(([name]) => name);
    if (!changedSections.length) return current;
    const saved = { version: current.version + 1, updatedAt: new Date().toISOString(), updatedBy: by, reason: why, parameters: { ...raw, ...next } };
```

por

```js
    // Una versión antigua cargada del historial puede traer clientes: se quedan en sus fichas.
    const limpio = sinEntradasDeCliente(next);
    const validation = validarParams(limpio);
    if (!validation.ok) throw storeError('INVALID_INPUT', validation.errores.join('. '));
    const changedSections = Object.entries(sections).filter(([, fields]) => fields.some((field) => JSON.stringify(current.parameters[field]) !== JSON.stringify(limpio[field]))).map(([name]) => name);
    if (!changedSections.length) return current;
    const saved = { version: current.version + 1, updatedAt: new Date().toISOString(), updatedBy: by, reason: why, parameters: { ...raw, ...limpio } };
```

y en ese mismo `write`, `return { ...saved, parameters: next };` pasa a `return { ...saved, parameters: limpio };`.

Antes del `return` final del almacén:

```js
  /** Lo que era de un cliente en los parámetros guardados (o los del código): para crear las fichas. */
  async function entradasDeClienteGuardadas() { return entradasDeCliente((await readCurrent()).completos); }
  return { get, getSnapshot, save, history, entradasDeCliente: entradasDeClienteGuardadas };
```

(y quitar el `return { get, getSnapshot, save, history };` anterior).

- [ ] **Step 6: Escribir el almacén de fichas**

Crear `src/remolquesClientesStore.js`:

```js
/**
 * Fichas de cliente de remolques (fase 3): un JSON junto a los parámetros de remolques, común a todos
 * los puestos, con versión (409 si otro guardó antes) e historial como ellos. Si el fichero no
 * existe, se crea una vez con lo que había por cliente en los parámetros (la semilla). Se lee en
 * cada petición para que un cambio a mano se vea sin reiniciar.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fichaConCambios } from './remolques/clientes/diferencias.ts';
import { fichaPorCodigo, fichasCambiadas, idFicha, normalizarNombre, validarFichas } from './remolques/clientes/reglas.ts';
import { MOTIVO_SEMILLA } from './remolques/clientes/semilla.ts';
import { writeFileAtomic } from './workflow.js';

const storeError = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra });
const VACIO = () => ({ version: 0, updatedAt: '', updatedBy: '', reason: '', fichas: [] });
const esElemento = (e) => (e?.tipo === 'lona' || e?.tipo === 'baqueton') && e.input && typeof e.input === 'object';

export function createRemolquesClientesStore({ file, historyFile = file.replace(/\.json$/i, '') + '-history.jsonl', technicians, semilla, recogidasGenerales, logger = console }) {
  let queue = Promise.resolve();
  const enCola = (tarea) => {
    const resultado = queue.then(tarea);
    queue = resultado.catch(() => {});
    return resultado;
  };

  async function leerFichero() {
    try {
      const stored = JSON.parse(await fs.readFile(file, 'utf8'));
      if (Array.isArray(stored?.fichas) && Number.isInteger(stored.version)) {
        return { snapshot: { version: stored.version, updatedAt: String(stored.updatedAt || ''), updatedBy: String(stored.updatedBy || ''), reason: String(stored.reason || ''), fichas: stored.fichas } };
      }
      logger.warn(`Las fichas de cliente de remolques (${file}) no tienen la forma esperada: no se usan.`);
    } catch (error) {
      if (error.code === 'ENOENT') return { falta: true };
      logger.warn(`No se pudieron leer las fichas de cliente de remolques (${file}): ${error.message}.`);
    }
    // Un fichero roto no se vuelve a sembrar: se perdería lo que tuviera.
    return { snapshot: VACIO() };
  }

  async function guardar(saved, changedSections) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.mkdir(path.dirname(historyFile), { recursive: true });
    await writeFileAtomic(file, `${JSON.stringify(saved, null, 2)}\n`);
    const { fichas, ...cabecera } = saved;
    // `parameters` para que «Cargar esta versión» del historial funcione como en los parámetros.
    await fs.appendFile(historyFile, `${JSON.stringify({ ...cabecera, changedSections, parameters: { fichas } })}\n`);
  }

  async function sembrarSiFalta() {
    const leido = await leerFichero();
    if (!leido.falta) return leido.snapshot;
    const validacion = validarFichas(await semilla(), { recogidasGenerales: await recogidasGenerales() });
    if (!validacion.ok) {
      logger.warn(`Las fichas de partida de remolques no son válidas: ${validacion.errores.join('. ')}.`);
      return VACIO();
    }
    const saved = { version: 1, updatedAt: new Date().toISOString(), updatedBy: '', reason: MOTIVO_SEMILLA, fichas: validacion.fichas };
    try {
      await guardar(saved, validacion.fichas.map((f) => f.nombre));
    } catch (error) {
      // Se calcula con ellas igual; la siguiente lectura lo vuelve a intentar.
      logger.warn(`No se pudieron guardar las fichas de partida de remolques (${file}): ${error.message}. Se usan sin guardar.`);
    }
    return saved;
  }

  // Al guardar ya se está dentro de la cola: se siembra directamente. Fuera, por la cola, para que
  // dos lecturas a la vez no siembren dos veces.
  async function readCurrent({ enLaCola = false } = {}) {
    const leido = await leerFichero();
    if (!leido.falta) return leido.snapshot;
    return enLaCola ? sembrarSiFalta() : enCola(sembrarSiFalta);
  }
  async function getSnapshot() { return readCurrent(); }
  async function get() { return (await readCurrent()).fichas; }

  function autor(updatedBy) {
    const by = typeof updatedBy === 'string' ? updatedBy.trim().toUpperCase() : '';
    if (!technicians.includes(by)) throw storeError('INVALID_INPUT', 'Elige quién hace el cambio («Soy»).');
    return by;
  }

  async function escribir(current, fichas, by, why) {
    const validacion = validarFichas(fichas, { recogidasGenerales: await recogidasGenerales() });
    if (!validacion.ok) throw storeError('INVALID_INPUT', validacion.errores.join('. '));
    const changedSections = fichasCambiadas(current.fichas, validacion.fichas);
    if (!changedSections.length) return current;
    const saved = { version: current.version + 1, updatedAt: new Date().toISOString(), updatedBy: by, reason: why, fichas: validacion.fichas };
    await guardar(saved, changedSections);
    return saved;
  }

  async function write({ baseVersion, fichas, updatedBy, reason } = {}) {
    const by = autor(updatedBy);
    const why = typeof reason === 'string' ? reason.trim() : '';
    if (!why) throw storeError('INVALID_INPUT', 'Indica el motivo del cambio.');
    if (!Number.isInteger(baseVersion) || baseVersion < 0) throw storeError('INVALID_INPUT', 'Indica la versión que estás editando.');
    if (!Array.isArray(fichas)) throw storeError('INVALID_INPUT', 'Indica las fichas del cambio.');
    const current = await readCurrent({ enLaCola: true });
    if (baseVersion !== current.version) throw storeError('VERSION_CONFLICT', 'Otro puesto guardó cambios antes.', { current });
    return escribir(current, fichas, by, why);
  }

  function nuevaFicha(fichas, nombre, codigo) {
    // Si ya hay una ficha con ese nombre (y otros códigos), la nueva lleva el código para distinguirla.
    const repetido = fichas.some((f) => normalizarNombre(f.nombre) === normalizarNombre(nombre));
    const visible = repetido ? `${nombre} (${codigo})` : nombre;
    return { id: idFicha(visible, new Set(fichas.map((f) => f.id))), nombre: visible, codigosRps: [codigo] };
  }

  /**
   * «Guardar en la ficha del cliente» y «Añadir el código y aplicar»: añade el código del pedido a la
   * ficha (la indicada, la de ese código o una nueva) y guarda lo marcado del elemento. Sin versión:
   * se aplica sobre la última, y el motivo lo pone el servidor.
   */
  async function writeDesdePedido({ numeroPedido, cliente, fichaId = null, elemento, claves = [], updatedBy, params } = {}) {
    const by = autor(updatedBy);
    const pedido = typeof numeroPedido === 'string' ? numeroPedido.trim() : '';
    const codigo = typeof cliente?.codigo === 'string' ? cliente.codigo.trim() : '';
    const nombre = typeof cliente?.nombre === 'string' ? cliente.nombre.trim() : '';
    if (!pedido) throw storeError('INVALID_INPUT', 'Falta el número de pedido.');
    if (!codigo || !nombre) throw storeError('INVALID_INPUT', 'Falta el cliente de RPS del pedido.');
    if (!Array.isArray(claves) || claves.some((c) => typeof c !== 'string')) throw storeError('INVALID_INPUT', 'Indica qué se guarda en la ficha.');
    if (claves.length && !esElemento(elemento)) throw storeError('INVALID_INPUT', 'Falta el elemento del pedido.');
    const current = await readCurrent({ enLaCola: true });
    const delCodigo = fichaPorCodigo(current.fichas, codigo);
    let ficha;
    if (fichaId) {
      ficha = current.fichas.find((f) => f.id === fichaId);
      if (!ficha) throw storeError('NOT_FOUND', 'Esa ficha ya no existe: vuelve a obtener el pedido.');
      if (delCodigo && delCodigo.id !== ficha.id) throw storeError('CODE_TAKEN', `El código ${codigo} ya está en la ficha «${delCodigo.nombre}».`);
    } else {
      ficha = delCodigo ?? nuevaFicha(current.fichas, nombre, codigo);
    }
    let siguiente = ficha.codigosRps.includes(codigo) ? ficha : { ...ficha, codigosRps: [...ficha.codigosRps, codigo] };
    if (claves.length) {
      try {
        siguiente = fichaConCambios(siguiente, elemento, claves, params);
      } catch {
        throw storeError('INVALID_INPUT', 'El elemento del pedido no tiene la forma esperada.');
      }
    }
    const existe = current.fichas.some((f) => f.id === ficha.id);
    const fichas = existe ? current.fichas.map((f) => (f.id === ficha.id ? siguiente : f)) : [...current.fichas, siguiente];
    const why = claves.length ? `Desde el pedido ${pedido}` : `Código añadido desde el pedido ${pedido}`;
    const snapshot = await escribir(current, fichas, by, why);
    return { ficha: snapshot.fichas.find((f) => f.id === ficha.id) ?? siguiente, snapshot };
  }

  async function history(limit = 20) {
    try {
      const content = await fs.readFile(historyFile, 'utf8');
      return content.split('\n').filter(Boolean).map((line) => JSON.parse(line)).reverse().slice(0, limit);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  return {
    get,
    getSnapshot,
    save: (input) => enCola(() => write(input)),
    desdePedido: (input) => enCola(() => writeDesdePedido(input)),
    history
  };
}
```

- [ ] **Step 7: Configuración**

En `src/config.js`, después de `const ruleParametersFile = …`:

```js
const remolquesParametersFile = process.env.REMOLQUES_PARAMETERS_FILE || path.join(path.dirname(ruleParametersFile), 'remolques-parameters.json');
```

y en `config`, sustituir la línea `remolquesParametersFile: process.env.REMOLQUES_PARAMETERS_FILE || path.join(…),` por:

```js
  remolquesParametersFile,
  // Fichas de cliente de remolques (fase 3): junto a sus parámetros. Si no existe, se crea la
  // primera vez con lo que había por cliente en los parámetros.
  remolquesClientesFile: process.env.REMOLQUES_CLIENTES_FILE || path.join(path.dirname(remolquesParametersFile), 'remolques-clientes.json'),
```

- [ ] **Step 8: La API de fichas en la web**

Crear `src/client/remolques/fichasClientes.ts`:

```ts
import type { ElementoFicha } from '../../remolques/clientes/diferencias.ts';
import type { FichaCliente, SnapshotFichas } from '../../remolques/clientes/tipos.ts';
import type { ClienteRps } from '../../remolques/rps/types.ts';
import { REMOLQUES_PARAMETERS_SAVED } from './useRemolquesParameters';

// Las fichas de cliente de remolques (fase 3) desde la web: leerlas y guardar desde un pedido. La
// hoja de Parámetros guarda todas a la vez con su propio borrador (useFichasClientes).

export const RUTA_FICHAS = '/api/remolques/clientes';
/** Se lanza al guardar fichas: la hoja de Clientes las vuelve a leer. */
export const REMOLQUES_CLIENTES_SAVED = 'remolques-clientes-saved';

/** El nombre que se ve del cliente de RPS: el alias si lo tiene (como la cabecera del pedido). */
export const nombreClienteRps = (cliente: Pick<ClienteRps, 'nombre' | 'alias'>): string =>
  (cliente.alias?.trim() || cliente.nombre).trim();

export async function leerFichas(): Promise<SnapshotFichas> {
  const respuesta = await fetch(RUTA_FICHAS, { cache: 'no-store' });
  if (!respuesta.ok) throw new Error('No se pudieron leer las fichas de cliente.');
  const datos = await respuesta.json() as SnapshotFichas;
  if (!Number.isInteger(datos?.version) || !Array.isArray(datos?.fichas)) throw new Error('Las fichas de cliente recibidas no son válidas.');
  return datos;
}

export interface CuerpoDesdePedido {
  numeroPedido: string;
  cliente: Pick<ClienteRps, 'codigo' | 'nombre'>;
  /** La ficha a la que se añade (sugerida); sin ella, la del código o una nueva. */
  fichaId?: string | null;
  elemento?: ElementoFicha;
  /** Lo marcado; vacío = solo añadir el código. */
  claves: string[];
  updatedBy: string;
}

/** Las fichas cambian los parámetros con que se calcula (extras de baquetón, recogidas propias). */
export function avisarFichasGuardadas() {
  window.dispatchEvent(new Event(REMOLQUES_CLIENTES_SAVED));
  window.dispatchEvent(new Event(REMOLQUES_PARAMETERS_SAVED));
}

export async function guardarDesdePedido(cuerpo: CuerpoDesdePedido): Promise<{ ficha: FichaCliente; snapshot: SnapshotFichas }> {
  const respuesta = await fetch(`${RUTA_FICHAS}/desde-pedido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => ({})) as { error?: string; ficha?: FichaCliente; snapshot?: SnapshotFichas };
  if (!respuesta.ok || !datos.ficha || !datos.snapshot) throw new Error(datos.error || 'No se pudo guardar en la ficha del cliente.');
  avisarFichasGuardadas();
  return { ficha: datos.ficha, snapshot: datos.snapshot };
}
```

- [ ] **Step 9: Ejecutar las pruebas y ver que pasan**

Run: `pnpm exec vitest run src/remolquesClientesStore.test.js src/remolquesParametersStore.test.js src/config.test.js src/client/remolques/fichasClientes.test.ts`
Expected: PASS.

- [ ] **Step 10: Rutas y parámetros efectivos en el servidor**

En `src/server.js`, con las demás importaciones:

```js
import { createRemolquesClientesStore } from './remolquesClientesStore.js';
import { paramsConFichas } from './remolques/clientes/params-efectivos.ts';
import { fichasSemilla } from './remolques/clientes/semilla.ts';
```

Justo después de `const remolquesParametersStore = createRemolquesParametersStore(…);`:

```js
// Fichas de cliente de remolques (fase 3): lo que era de cada cliente en los parámetros vive aquí.
// La primera vez se crean con lo que había en los parámetros guardados.
const remolquesClientesStore = createRemolquesClientesStore({
  file: config.remolquesClientesFile,
  technicians: formOptions.tecnicos,
  semilla: async () => fichasSemilla(await remolquesParametersStore.entradasDeCliente()),
  recogidasGenerales: async () => (await remolquesParametersStore.get()).recogidas.map((r) => r.nombre)
});
/** Con lo que se calcula: los parámetros generales y lo de cada ficha (extras de baquetón, recogidas propias). */
async function parametrosRemolques() {
  const [generales, fichas] = await Promise.all([remolquesParametersStore.get(), remolquesClientesStore.get()]);
  return paramsConFichas(generales, fichas);
}
```

En `crearServicioPedidosRemolques({ … })`, `parametros: () => remolquesParametersStore.get(),` pasa a `parametros: parametrosRemolques,`.

En `GET /api/remolques/parametros`, `remolquesParametersStore.get()` pasa a `parametrosRemolques()` (el `getSnapshot()` de `?detalle=1` no cambia), y encima de la ruta:

```js
// Sin `detalle`, los efectivos (con lo de cada ficha): con ellos calcula Remolques. Con `detalle=1`,
// los generales con su versión, para la hoja de Parámetros.
```

En `POST /api/remolques/pdf`, `? await remolquesParametersStore.get()` pasa a `? await parametrosRemolques()`.

Después de `app.get('/api/remolques/parametros/history', …)`:

```js
// Fichas de cliente de remolques (fase 3): todas a la vez con versión e historial, como los
// parámetros, y «desde un pedido» para el botón de Remolques (solo una ficha, sin versión).
function errorFichas(error, res, next) {
  if (error.code === 'VERSION_CONFLICT') return res.status(409).json({ error: error.message, current: error.current });
  if (error.code === 'CODE_TAKEN') return res.status(409).json({ error: error.message });
  if (error.code === 'NOT_FOUND') return res.status(404).json({ error: error.message });
  if (error.code === 'INVALID_INPUT') return res.status(400).json({ error: error.message });
  return next(error);
}

app.get('/api/remolques/clientes', async (_req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store').json(await remolquesClientesStore.getSnapshot());
  } catch (error) { next(error); }
});

app.put('/api/remolques/clientes', async (req, res, next) => {
  try {
    res.json(await remolquesClientesStore.save(req.body));
  } catch (error) { errorFichas(error, res, next); }
});

app.get('/api/remolques/clientes/historial', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    res.set('Cache-Control', 'no-store').json({ entries: await remolquesClientesStore.history(limit) });
  } catch (error) { next(error); }
});

app.post('/api/remolques/clientes/desde-pedido', async (req, res, next) => {
  try {
    // Los extras de otro cliente que se copien salen de los parámetros efectivos de este momento.
    res.json(await remolquesClientesStore.desdePedido({ ...req.body, params: await parametrosRemolques() }));
  } catch (error) { errorFichas(error, res, next); }
});
```

En el callback de `app.listen(…)`, después de `process.send?.('ready');`:

```js
  // Las fichas de cliente de remolques se crean al arrancar si aún no existen (fase 3).
  remolquesClientesStore.get().catch((error) => console.warn('No se pudieron preparar las fichas de cliente de remolques:', error.message));
```

- [ ] **Step 11: Batería, tipos y lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: todo PASS (la paridad de remolques también, sin tocarla).

- [ ] **Step 12: Comprobarlo en la aislada**

Arrancar en segundo plano (≈ 15 s): `ISOLATED_DIR="$PWD/tmp/clientes" PORT=4313 FAKE_COORDINA_PORT=4323 bash .claude/skills/running-toldos-testar/start-isolated.sh`

Run:

```bash
curl -fsS http://127.0.0.1:4313/api/health
node --input-type=module -e "
import { DEFAULT_PARAMS } from './src/remolques/calc/params.ts';
const base = 'http://127.0.0.1:4313/api/remolques';
const fichas = await (await fetch(base + '/clientes')).json();
const generales = await (await fetch(base + '/parametros?detalle=1')).json();
const efectivos = await (await fetch(base + '/parametros')).json();
console.log(fichas.version, fichas.fichas.map((f) => f.nombre + ':' + f.codigosRps.join('/')).join(' | '));
console.log(generales.parameters.clientesBaqueton.map((c) => c.nombre).join(','), generales.parameters.recogidas.some((r) => r.nombre.startsWith('PUENTES HIJOS')));
console.log(JSON.stringify(efectivos.clientesBaqueton) === JSON.stringify(DEFAULT_PARAMS.clientesBaqueton), JSON.stringify(efectivos.recogidas) === JSON.stringify(DEFAULT_PARAMS.recogidas));
"
ls tmp/clientes/remolques-clientes*.json*
```

Expected: `/api/health` con `"simulationMode":true` y `"fileWritesEnabled":false`; luego

```
1 HIJOS DE PEDRO LOPEZ:001300 | AYALA:036662/048286 | GENERAL WOLDER:001047
GENERAL false
true true
tmp/clientes/remolques-clientes-history.jsonl  tmp/clientes/remolques-clientes.json
```

Parar la aislada.

- [ ] **Step 13: Commit**

```bash
git add src/remolquesClientesStore.js src/remolquesClientesStore.test.js src/remolquesParametersStore.js src/remolquesParametersStore.test.js src/config.js src/config.test.js src/server.js src/client/remolques/fichasClientes.ts src/client/remolques/fichasClientes.test.ts
git commit -m "feat(remolques): fichas de cliente en el servidor

Un JSON junto a los parámetros de remolques, común a todos los puestos,
con versión, historial y validación, y las rutas /api/remolques/clientes.
Se crea solo la primera vez con lo que había por cliente en los
parámetros guardados, que desde ahora se quedan con GENERAL y las
recogidas normales. El servidor y Remolques calculan con los parámetros
efectivos (generales + fichas), que con las fichas de partida son los de
siempre: nada cambia en lo guardado ni en la paridad.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Parámetros › Remolques › Clientes

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (pantalla nueva con capturas). **UI independiente: sí** (después de la tarea 3; no toca los ficheros de las tareas 5, 6 y 7).

**Files:**
- Create: `src/client/remolques/posicionesTexto.ts` + `posicionesTexto.test.ts`, `src/client/remolques/useFichasClientes.ts` + `useFichasClientes.test.tsx`, `src/client/remolques/ClientesRemolquesView.tsx` + `ClientesRemolquesView.test.tsx`
- Modify: `src/client/views/ParametersView.tsx`, `src/client/App.tsx`, `src/client/coordina/parametros.css`

**Interfaces:**
- Consumes: `leerFichas`, `RUTA_FICHAS`, `REMOLQUES_CLIENTES_SAVED`, `avisarFichasGuardadas` (tarea 3); `FichaCliente`, `SnapshotFichas`, `PerfilFicha`, `MedidaHabitual`, `ExtrasBaqueton`, `CAMPOS_EXTRAS`, `idFicha` (tarea 1); `PERFILES`, `Recogida`, `TipoPerfil`; `SaveDraftResult` (`src/client/hooks/useParameters`); `ParameterSheet`, `ParameterBand`, `NumberField`, `SelectField`, `TextField`, `ParametersHistory`, `ParametersSaveBar`.
- Produces: `leerPosiciones(texto: string): number[] | null`, `escribirPosiciones(posiciones: readonly number[]): string`, `leerCodigos(texto: string): string[]`; `useFichasClientes()` → `{ fichas, saved, dirty, ready, error, saving, update(fichas), loadVersion(valor: unknown), saveDraft(updatedBy, reason): Promise<SaveDraftResult>, discardDraft(), refresh() }`; `ClientesRemolquesView({ fichas, recogidasGenerales, onUpdate, disabled? })`; en `ParametersView`: `export type VistaRemolques = 'generales' | 'clientes'`, props `remolquesVista?: VistaRemolques | null`, `onSelectRemolques?: (vista: VistaRemolques | null) => void`, `remolquesClientes?: React.ReactNode` (sustituyen a `showRemolques`/`onSelectRemolques(boolean)`).

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/client/remolques/posicionesTexto.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { escribirPosiciones, leerCodigos, leerPosiciones } from './posicionesTexto';

describe('posiciones y códigos como texto', () => {
  it('lee posiciones con coma decimal separadas por «·», «;» o espacios', () => {
    expect(leerPosiciones('2,5 · 10 · 40;70  100 · 108,5')).toEqual([2.5, 10, 40, 70, 100, 108.5]);
    expect(leerPosiciones('')).toEqual([]);
    expect(leerPosiciones('2,5 · x')).toBeNull();
    expect(leerPosiciones('0')).toBeNull();
  });

  it('las escribe como en la hoja', () => {
    expect(escribirPosiciones([2.5, 10, 108.5])).toBe('2,5 · 10 · 108,5');
  });

  it('lee códigos separados por comas o espacios, sin repetir', () => {
    expect(leerCodigos(' 036662, 048286 036662 ')).toEqual(['036662', '048286']);
  });
});
```

Crear `src/client/remolques/ClientesRemolquesView.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params';
import { PARAMS_GENERALES } from '../../remolques/clientes/params-efectivos';
import { entradasDeCliente, fichasSemilla } from '../../remolques/clientes/semilla';
import { ClientesRemolquesView } from './ClientesRemolquesView';

const fichas = fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
const recogidas = PARAMS_GENERALES.recogidas.map((r) => r.nombre);

describe('Parámetros › Remolques › Clientes', () => {
  it('lista las fichas y abre la primera con su recogida propia y sus extras', () => {
    const html = renderToStaticMarkup(<ClientesRemolquesView fichas={fichas} recogidasGenerales={recogidas} onUpdate={() => {}} />);
    for (const nombre of ['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']) expect(html).toContain(nombre);
    expect(html).toContain('036662 · 048286');
    expect(html).toContain('aria-label="Ficha de HIJOS DE PEDRO LOPEZ"');
    expect(html).toContain('value="PUENTES HIJOS DE PEDRO LOPEZ"');
    expect(html).toContain('Paño trasero con el ancho de delante');
    expect(html).toContain('ABIERTO EN LA PARTE TRASERA (REFORZAR)');
    expect(html).toContain('Añadir ficha');
    expect(html).toContain('Añadir medida');
    expect(html).not.toContain('<select');
  });

  it('sin fichas lo dice', () => {
    const html = renderToStaticMarkup(<ClientesRemolquesView fichas={[]} recogidasGenerales={recogidas} onUpdate={() => {}} />);
    expect(html).toContain('Todavía no hay fichas');
  });

  it('bloquea la edición mientras lee o guarda', () => {
    const html = renderToStaticMarkup(<ClientesRemolquesView fichas={fichas} recogidasGenerales={recogidas} disabled onUpdate={() => {}} />);
    expect(html).toContain('<fieldset class="remolques-parameters clientes-remolques-hoja" disabled="">');
  });
});
```

Crear `src/client/remolques/useFichasClientes.test.tsx` copiando el arnés de `src/client/remolques/useRemolquesParameters.test.tsx` (líneas 1–31: `vi.mock('react', …)`, `renderHook`, `act`, `waitFor`, `afterEach`), con `useFichasClientes` en lugar de `useRemolquesParameters`, y estas pruebas:

```tsx
const FICHA = { id: 'ayala', nombre: 'AYALA', codigosRps: ['036662'] };
const snapshot = (version = 1, fichas = [FICHA]) => ({ version, updatedAt: '', updatedBy: '', reason: '', fichas });

it('el borrador no cambia lo guardado y guardar manda versión, fichas, autor y motivo', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot() })
    .mockResolvedValueOnce({ ok: true, json: async () => snapshot(2, [{ ...FICHA, codigosRps: ['048286'] }]) });
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.update([{ ...FICHA, codigosRps: ['048286'] }]));
  expect(result.current.saved.fichas[0].codigosRps).toEqual(['036662']);
  expect(result.current.dirty).toBe(true);
  await act(async () => { expect((await result.current.saveDraft('IVÁN', 'AYALA confirmado')).status).toBe('saved'); });
  expect(fetchMock.mock.calls[1][0]).toBe('/api/remolques/clientes');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ baseVersion: 1, fichas: [{ ...FICHA, codigosRps: ['048286'] }], updatedBy: 'IVÁN', reason: 'AYALA confirmado' });
  expect(result.current.dirty).toBe(false);
  expect(result.current.saved.version).toBe(2);
});

it('un conflicto conserva el borrador con la versión nueva', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot() })
    .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ current: snapshot(3) }) }));
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.update([]));
  await act(async () => { expect((await result.current.saveDraft('IVÁN', 'Prueba')).status).toBe('conflict'); });
  expect(result.current.saved.version).toBe(3);
  expect(result.current.dirty).toBe(true);
});

it('cargar una versión del historial la pone como borrador; lo que no tiene fichas, no', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot() }));
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.loadVersion({ demasiaAlto: 3 }));
  expect(result.current.dirty).toBe(false);
  act(() => result.current.loadVersion({ fichas: [] }));
  expect(result.current.fichas).toEqual([]);
  expect(result.current.dirty).toBe(true);
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/client/remolques/posicionesTexto.test.ts src/client/remolques/ClientesRemolquesView.test.tsx src/client/remolques/useFichasClientes.test.tsx`
Expected: FAIL — no existen los módulos.

- [ ] **Step 3: Posiciones y códigos como texto**

Crear `src/client/remolques/posicionesTexto.ts`:

```ts
// Las posiciones de los ollaos y los códigos de RPS se escriben en un campo de texto en la hoja
// de Clientes. La coma es la de los decimales, así que las posiciones se separan con «·», «;» o
// espacios.

/** «2,5 · 10 · 40» → [2.5, 10, 40]; null si algo no es un número mayor que 0. Vacío → []. */
export function leerPosiciones(texto: string): number[] | null {
  const numeros = texto.split(/[·;\s]+/).filter(Boolean).map((parte) => Number(parte.replace(',', '.')));
  return numeros.every((n) => Number.isFinite(n) && n > 0) ? numeros : null;
}

export const escribirPosiciones = (posiciones: readonly number[]): string =>
  posiciones.map((n) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 })).join(' · ');

/** Códigos separados por comas o espacios, sin repetir. */
export function leerCodigos(texto: string): string[] {
  return [...new Set(texto.split(/[\s,;·]+/).map((c) => c.trim()).filter(Boolean))];
}
```

- [ ] **Step 4: El borrador de la hoja Clientes**

Crear `src/client/remolques/useFichasClientes.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FichaCliente, SnapshotFichas } from '../../remolques/clientes/tipos.ts';
import type { SaveDraftResult } from '../hooks/useParameters';
import { avisarFichasGuardadas, leerFichas, REMOLQUES_CLIENTES_SAVED, RUTA_FICHAS } from './fichasClientes';

const same = (a: FichaCliente[], b: FichaCliente[]) => JSON.stringify(a) === JSON.stringify(b);
const VACIO: SnapshotFichas = { version: 0, updatedAt: '', updatedBy: '', reason: '', fichas: [] };

/** Como useRemolquesParameters: el borrador es de este puesto hasta guardarlo con quién y motivo. */
export function useFichasClientes() {
  const [saved, setSaved] = useState<SnapshotFichas>(VACIO);
  const [draft, setDraft] = useState<{ baseVersion: number; fichas: FichaCliente[] } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(saved);
  const savingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await leerFichas();
      savedRef.current = next;
      setSaved(next);
      setReady(true);
      setError('');
    } catch {
      setError('No se pudieron leer las fichas de cliente. Vuelve a intentar la conexión.');
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(refresh);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener(REMOLQUES_CLIENTES_SAVED, onFocus);
    const timer = window.setInterval(onFocus, 5 * 60 * 1000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(REMOLQUES_CLIENTES_SAVED, onFocus);
      window.clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);

  function update(fichas: FichaCliente[]) {
    setDraft((previous) => (same(fichas, savedRef.current.fichas)
      ? null
      : { baseVersion: previous?.baseVersion ?? savedRef.current.version, fichas }));
  }
  function loadVersion(valor: unknown) {
    const fichas = (valor as { fichas?: unknown } | null)?.fichas;
    if (Array.isArray(fichas)) update(fichas as FichaCliente[]);
  }
  async function saveDraft(updatedBy: string, reason: string): Promise<SaveDraftResult> {
    if (!ready || savingRef.current) return { status: 'error', message: 'Espera a que se lean o guarden las fichas.' };
    if (!draft) return { status: 'saved' };
    savingRef.current = true;
    setSaving(true);
    try {
      const response = await fetch(RUTA_FICHAS, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseVersion: draft.baseVersion, fichas: draft.fichas, updatedBy, reason }) });
      const data = await response.json();
      if (response.status === 409 && data.current) {
        savedRef.current = data.current;
        setSaved(data.current);
        setDraft((current) => (current ? { ...current, baseVersion: data.current.version } : current));
        return { status: 'conflict' };
      }
      if (!response.ok) return { status: 'error', message: data.error || 'No se pudieron guardar las fichas.' };
      savedRef.current = data;
      setSaved(data);
      setDraft((current) => (current === draft ? null : current ? { ...current, baseVersion: data.version } : null));
      avisarFichasGuardadas();
      return { status: 'saved' };
    } catch {
      return { status: 'error', message: 'No se pudieron guardar las fichas. Tu borrador sigue aquí.' };
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return { fichas: draft?.fichas ?? saved.fichas, saved, dirty: Boolean(draft), ready, error, saving, update, loadVersion, saveDraft, discardDraft: () => setDraft(null), refresh };
}
```

Si `useFichasClientes.test.tsx` necesita `window.dispatchEvent` en el `stubGlobal('window', …)` del arnés, ya lo trae (`dispatchEvent: vi.fn()`).

- [ ] **Step 5: La hoja Clientes**

Crear `src/client/remolques/ClientesRemolquesView.tsx`:

```tsx
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PERFILES, type Recogida, type TipoPerfil } from '../../remolques/calc/params.ts';
import { CAMPOS_EXTRAS, idFicha } from '../../remolques/clientes/reglas.ts';
import type { ExtrasBaqueton, FichaCliente, MedidaHabitual, PerfilFicha } from '../../remolques/clientes/tipos.ts';
import { NumberField } from '../components/NumberField';
import { ParameterBand, ParameterSheet } from '../components/ParameterSheet';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { escribirPosiciones, leerCodigos, leerPosiciones } from './posicionesTexto';

// Parámetros › Remolques › Clientes (fase 3): una ficha por cliente real, con sus códigos de RPS y lo
// habitual. Todo es opcional: «—» es «no lo dice la ficha» y al obtener el pedido no se toca.

const NADA = '—';
const SI_NO = [NADA, 'Sí', 'No'];
const deSiNo = (v: boolean | undefined) => (v === undefined ? NADA : v ? 'Sí' : 'No');
const aSiNo = (t: string) => (t === 'Sí' ? true : t === 'No' ? false : undefined);
const numero = (v: number | null) => (v == null || !Number.isFinite(v) ? undefined : v);
const LADOS = [['delante', 'Delante'], ['atras', 'Atrás'], ['laterales', 'Laterales']] as const;
const CAMPOS_POR_PERFIL: Record<TipoPerfil, Array<[Exclude<keyof PerfilFicha, 'tipoPerfil'>, string]>> = {
  'TIPO 01': [],
  'TIPO 02': [['aguas', 'Aguas (cm)']],
  'TIPO 03': [['aguas', 'Aguas (cm)'], ['radioCumbrera', 'Radio cumbrera (cm)'], ['radioHombro', 'Radio hombro (cm)']],
  'TIPO 04': [['chaflan', 'Chaflán · vértices (cm)'], ['radioChaflanAbajo', 'Radio abajo (cm)'], ['radioChaflanArriba', 'Radio arriba (cm)']],
  'TIPO 05': [['radioEsquina', 'Radio esquina (cm)']],
};
const ETIQUETAS_EXTRAS: Record<(typeof CAMPOS_EXTRAS)[number], string> = {
  extraLargoCostura: 'Extra de largo a costura (cm)', extraAnchoCostura: 'Extra de ancho a costura (cm)',
  extraBaquetonLargoDelante: 'Extra de baquetón delante (cm)', extraBaquetonLargoDetras: 'Extra de baquetón detrás (cm)',
  extraLargoFinal: 'Extra de largo final (cm)', extraAnchoFinal: 'Extra de ancho final (cm)', extraBaquetonTrasero: 'Extra de baquetón trasero (cm)',
};
const EXTRAS_VACIOS: ExtrasBaqueton = {
  extraLargoCostura: 0, extraAnchoCostura: 0, extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
  extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0, observaciones: [],
};
const recogidaVacia = (nombre: string): Recogida => ({ nombre, delante: 0, atras: 0, lateralSoloAtras: 0, lateralSoloDelante: 0, panoTraseroConAnchoDelante: false });
const medidaVacia = (): MedidaHabitual => ({ tipo: 'lona', largo: 0, ancho: 0, ollaos: { delante: [], atras: [], laterales: [] } });

/** En la ficha, lo que no se rellena no existe: fuera las claves sin valor. */
const sinVacios = (ficha: FichaCliente): FichaCliente =>
  Object.fromEntries(Object.entries(ficha).filter(([, v]) => v !== undefined && v !== '')) as unknown as FichaCliente;

/** Texto que se escribe libre y se lee al salir del campo; si no se entiende, vuelve a lo que había. */
function CampoAlSalir<T>({ label, valor, leer, onChange, hint }: {
  label: string; valor: string; leer: (texto: string) => T | null; onChange: (v: T) => void; hint?: string;
}) {
  const [texto, setTexto] = useState(valor);
  return <TextField label={label} value={texto} hint={hint} onChange={setTexto} onBlur={() => {
    const leido = leer(texto);
    if (leido === null) setTexto(valor);
    else onChange(leido);
  }} />;
}

export function ClientesRemolquesView({ fichas, recogidasGenerales, onUpdate, disabled = false }: {
  fichas: FichaCliente[]; recogidasGenerales: string[]; onUpdate: (fichas: FichaCliente[]) => void; disabled?: boolean;
}) {
  const [elegida, setElegida] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const ficha = fichas.find((f) => f.id === elegida) ?? fichas[0] ?? null;
  const consulta = busca.trim().toLocaleUpperCase('es-ES');
  const visibles = fichas.filter((f) => !consulta || `${f.nombre} ${f.codigosRps.join(' ')}`.toLocaleUpperCase('es-ES').includes(consulta));
  const cambiar = (id: string, patch: Partial<FichaCliente>) => onUpdate(fichas.map((f) => (f.id === id ? sinVacios({ ...f, ...patch }) : f)));
  const anadir = () => {
    const id = idFicha(`ficha nueva ${fichas.length + 1}`, new Set(fichas.map((f) => f.id)));
    onUpdate([...fichas, { id, nombre: '', codigosRps: [] }]);
    setElegida(id);
  };
  return <fieldset className="remolques-parameters clientes-remolques-hoja" disabled={disabled}>
    <ParameterSheet model="Clientes de remolques" kind="remolques" description="Lo habitual de cada cliente. Al obtener un pedido de RPS de uno de sus códigos, los campos vacíos se rellenan con su ficha y llevan la marca «del cliente». Lo que no se rellena no se toca.">
      <div className="clientes-remolques">
        <nav className="clientes-remolques-lista bloque-3d-hundido" aria-label="Fichas de cliente">
          <TextField label="Buscar cliente o código" value={busca} onChange={setBusca} />
          {visibles.map((f) => (
            <button key={f.id} type="button" className={f.id === ficha?.id ? 'tecla-3d is-active' : 'tecla-3d'} aria-current={f.id === ficha?.id ? 'true' : undefined} onClick={() => setElegida(f.id)}>
              <strong>{f.nombre || 'Sin nombre'}</strong>
              <small>{f.codigosRps.length ? f.codigosRps.join(' · ') : 'Sin código de RPS'}</small>
            </button>
          ))}
          <button type="button" className="ghost-button" onClick={anadir}><Plus aria-hidden="true" />Añadir ficha</button>
        </nav>
        {ficha
          ? <FichaEditor key={ficha.id} ficha={ficha} recogidasGenerales={recogidasGenerales} onChange={(patch) => cambiar(ficha.id, patch)} onQuitar={() => { onUpdate(fichas.filter((f) => f.id !== ficha.id)); setElegida(null); }} />
          : <p className="clientes-remolques-vacio">Todavía no hay fichas. Se crean aquí o con «Guardar en la ficha del cliente» desde un pedido de Remolques.</p>}
      </div>
    </ParameterSheet>
  </fieldset>;
}

function FichaEditor({ ficha, recogidasGenerales, onChange, onQuitar }: {
  ficha: FichaCliente; recogidasGenerales: string[]; onChange: (patch: Partial<FichaCliente>) => void; onQuitar: () => void;
}) {
  const perfil = ficha.perfil;
  const propia = ficha.recogidaPropia;
  const recogidas = [NADA, ...recogidasGenerales, ...(propia?.nombre ? [propia.nombre] : [])];
  const medidas = ficha.medidas ?? [];
  const extras = ficha.extrasBaqueton;
  const cambiarPropia = (patch: Partial<Recogida>) => onChange({ recogidaPropia: { ...(propia ?? recogidaVacia('')), ...patch } });
  const cambiarMedida = (i: number, patch: Partial<MedidaHabitual>) => onChange({ medidas: medidas.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return <section className="clientes-remolques-ficha" aria-label={`Ficha de ${ficha.nombre || 'cliente nuevo'}`}>
    <ParameterBand number="01" title="Cliente" description="El nombre que se ve y sus códigos de cliente de RPS. Un código solo puede estar en una ficha.">
      <div className="parameter-grid remolques-parameter-grid">
        <TextField label="Nombre" value={ficha.nombre} onChange={(nombre) => onChange({ nombre })} />
        <CampoAlSalir key={ficha.codigosRps.join(',')} label="Códigos de RPS" hint="Separados por comas" valor={ficha.codigosRps.join(', ')} leer={leerCodigos} onChange={(codigosRps) => onChange({ codigosRps })} />
        <SelectField label="Trabajo habitual" value={ficha.trabajo === 'lona' ? 'Lona' : ficha.trabajo === 'baqueton' ? 'Baquetón' : NADA} options={[NADA, 'Lona', 'Baquetón']}
          onChange={(v) => onChange({ trabajo: v === 'Lona' ? 'lona' : v === 'Baquetón' ? 'baqueton' : undefined })} />
      </div>
      <button type="button" className="ghost-button" aria-label={`Quitar la ficha ${ficha.nombre}`} onClick={onQuitar}><Trash2 aria-hidden="true" />Quitar ficha</button>
    </ParameterBand>
    <ParameterBand number="02" title="Perfil" description="El perfil habitual de sus lonas y sus medidas.">
      <div className="parameter-grid remolques-parameter-grid">
        <SelectField label="Perfil" value={perfil ? PERFILES.find((p) => p.value === perfil.tipoPerfil)?.label ?? NADA : NADA} options={[NADA, ...PERFILES.map((p) => p.label)]}
          onChange={(label) => { const tipo = PERFILES.find((p) => p.label === label)?.value; onChange({ perfil: tipo ? { tipoPerfil: tipo } : undefined }); }} />
        {perfil && CAMPOS_POR_PERFIL[perfil.tipoPerfil].map(([campo, label]) => (
          <NumberField key={campo} label={label} value={perfil[campo] ?? null} step={0.5} onChange={(v) => onChange({ perfil: { ...perfil, [campo]: numero(v) } })} />
        ))}
      </div>
    </ParameterBand>
    <ParameterBand number="03" title="Recogidas" description="Las de Parámetros o la propia del cliente.">
      <div className="parameter-grid remolques-parameter-grid">
        <SelectField label="Recogida delante" value={ficha.recogeDelante ?? NADA} options={recogidas} onChange={(v) => onChange({ recogeDelante: v === NADA ? undefined : v })} />
        <SelectField label="Recogida detrás" value={ficha.recogeAtras ?? NADA} options={recogidas} onChange={(v) => onChange({ recogeAtras: v === NADA ? undefined : v })} />
        <SelectField label="Bastilla de enfundar" value={deSiNo(ficha.bastillaEnfundar)} options={SI_NO} onChange={(v) => onChange({ bastillaEnfundar: aSiNo(v) })} />
      </div>
      <label className="remolques-parameter-check"><input type="checkbox" checked={Boolean(propia)} onChange={(e) => onChange({ recogidaPropia: e.target.checked ? recogidaVacia(`PUENTES ${ficha.nombre}`.trim()) : undefined })} /><span>Recogida propia del cliente</span></label>
      {propia && <section className="remolques-parameter-row bloque-3d-hundido" aria-label="Recogida propia">
        <div className="parameter-grid remolques-parameter-grid">
          <TextField label="Nombre de la recogida" value={propia.nombre} onChange={(nombre) => cambiarPropia({ nombre })} />
          {([['delante', 'Delante (cm)'], ['atras', 'Detrás (cm)'], ['lateralSoloAtras', 'Extra lateral solo detrás (cm)'], ['lateralSoloDelante', 'Extra lateral solo delante (cm)']] as const).map(([campo, label]) => (
            <NumberField key={campo} label={label} value={propia[campo]} step={0.5} onChange={(v) => cambiarPropia({ [campo]: v ?? Number.NaN })} />
          ))}
        </div>
        <label className="remolques-parameter-check"><input type="checkbox" checked={propia.panoTraseroConAnchoDelante ?? false} onChange={(e) => cambiarPropia({ panoTraseroConAnchoDelante: e.target.checked })} /><span>Paño trasero con el ancho de delante</span></label>
      </section>}
    </ParameterBand>
    <ParameterBand number="04" title="Ventana, rotulación y material" description="El material es el texto del campo «Material» del formulario; lo cómodo es guardarlo desde un pedido.">
      <div className="parameter-grid remolques-parameter-grid">
        <SelectField label="Ventana" value={deSiNo(ficha.ventana?.lleva)} options={SI_NO}
          onChange={(v) => { const lleva = aSiNo(v); onChange({ ventana: lleva === undefined ? undefined : lleva ? { ...ficha.ventana, lleva } : { lleva } }); }} />
        {ficha.ventana?.lleva && <>
          <NumberField label="Ancho ventana (cm)" value={ficha.ventana.ancho ?? null} step={0.5} onChange={(v) => onChange({ ventana: { ...ficha.ventana!, ancho: numero(v) } })} />
          <NumberField label="Alto ventana (cm)" value={ficha.ventana.alto ?? null} step={0.5} onChange={(v) => onChange({ ventana: { ...ficha.ventana!, alto: numero(v) } })} />
        </>}
        <SelectField label="Rotulación" value={deSiNo(ficha.rotulacion)} options={SI_NO} onChange={(v) => onChange({ rotulacion: aSiNo(v) })} />
        <TextField label="Material" value={ficha.material ?? ''} onChange={(material) => onChange({ material })} />
        <NumberField label="Sesgo detrás (cm más ancho atrás)" value={ficha.sesgoDetras ?? null} step={0.5} onChange={(v) => onChange({ sesgoDetras: numero(v) })} />
        <SelectField label="Cremallera del 9" value={deSiNo(ficha.cremallera)} options={SI_NO} onChange={(v) => onChange({ cremallera: aSiNo(v) })} />
      </div>
    </ParameterBand>
    <ParameterBand number="05" title="Extras de baquetón" description="Se suman a las demasías generales del baquetón cuando el baquetón es de este cliente.">
      <label className="remolques-parameter-check"><input type="checkbox" checked={Boolean(extras)} onChange={(e) => onChange({ extrasBaqueton: e.target.checked ? structuredClone(EXTRAS_VACIOS) : undefined })} /><span>Lleva extras de baquetón</span></label>
      {extras && <>
        <div className="parameter-grid remolques-parameter-grid">
          {CAMPOS_EXTRAS.map((campo) => <NumberField key={campo} label={ETIQUETAS_EXTRAS[campo]} value={extras[campo]} step={0.5} onChange={(v) => onChange({ extrasBaqueton: { ...extras, [campo]: v ?? Number.NaN } })} />)}
        </div>
        <label><span>Observaciones del baquetón · una por línea</span><textarea rows={Math.max(2, extras.observaciones.length)} value={extras.observaciones.join('\n')} onChange={(e) => onChange({ extrasBaqueton: { ...extras, observaciones: e.target.value.split('\n') } })} /></label>
      </>}
    </ParameterBand>
    <ParameterBand number="06" title="Observaciones fijas" description="Salen siempre en sus planteamientos, una por línea.">
      <label><span>Observaciones · una por línea</span><textarea rows={Math.max(2, ficha.observaciones?.length ?? 0)} value={(ficha.observaciones ?? []).join('\n')} onChange={(e) => onChange({ observaciones: e.target.value ? e.target.value.split('\n') : undefined })} /></label>
    </ParameterBand>
    <ParameterBand number="07" title="Medidas habituales" description="Largo × ancho del remolque (lo que se teclea) y las posiciones de los ollaos de cada lado sobre la lona hecha, de izquierda a derecha, como en el CAD. Se imprimen tal cual.">
      <div className="remolques-parameter-rows">
        {medidas.map((m, i) => <section key={i} className="remolques-parameter-row bloque-3d-hundido" aria-label={`Medida ${i + 1}`}>
          <div className="parameter-grid remolques-parameter-grid">
            <SelectField label="Elemento" value={m.tipo === 'lona' ? 'Lona' : 'Baquetón'} options={['Lona', 'Baquetón']} onChange={(v) => cambiarMedida(i, { tipo: v === 'Lona' ? 'lona' : 'baqueton' })} />
            <NumberField label="Largo (cm)" value={m.largo || null} step={0.5} onChange={(v) => cambiarMedida(i, { largo: v ?? 0 })} />
            <NumberField label="Ancho (cm)" value={m.ancho || null} step={0.5} onChange={(v) => cambiarMedida(i, { ancho: v ?? 0 })} />
          </div>
          <div className="clientes-remolques-ollaos">
            {LADOS.map(([lado, nombre]) => (
              <CampoAlSalir key={`${lado}-${m.ollaos[lado].join(',')}`} label={`${nombre} · posiciones`} hint="Separadas por «·» o espacios"
                valor={escribirPosiciones(m.ollaos[lado])} leer={leerPosiciones} onChange={(p) => cambiarMedida(i, { ollaos: { ...m.ollaos, [lado]: p } })} />
            ))}
          </div>
          <button type="button" className="ghost-button" aria-label={`Quitar la medida ${i + 1}`} onClick={() => onChange({ medidas: medidas.filter((_, j) => j !== i) })}><Trash2 aria-hidden="true" />Quitar medida</button>
        </section>)}
        <button type="button" className="ghost-button" onClick={() => onChange({ medidas: [...medidas, medidaVacia()] })}><Plus aria-hidden="true" />Añadir medida</button>
      </div>
    </ParameterBand>
  </section>;
}
```

Notas para quien lo haga: `TextField` acepta `hint` y `onBlur` (ver `src/client/components/TextField.tsx`); `SelectField` pinta las opciones con `controlLabel` y no usa `<select>`. Si `numero(v)` deja `undefined` dentro de `perfil` o `ventana`, no pasa nada: el JSON lo quita y la validación lo admite. Si `medidas` queda vacía, `onChange({ medidas: [] })` la deja como lista vacía (válida).

- [ ] **Step 6: Estilos**

Al final de `src/client/coordina/parametros.css`:

```css
/* Parámetros › Remolques › Clientes (fase 3): la lista de fichas a la izquierda y la ficha elegida. */
.clientes-remolques {
  display: grid;
  gap: 16px;
  grid-template-columns: 240px minmax(0, 1fr);
  align-items: start;
}
.clientes-remolques-lista {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 70vh;
  overflow: auto;
  padding: 10px;
  position: sticky;
  top: 8px;
}
.clientes-remolques-lista > button.tecla-3d {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}
.clientes-remolques-lista small,
.clientes-remolques-vacio { color: var(--text-muted); font-size: 12px; }
.clientes-remolques-ficha { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.clientes-remolques-ollaos {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 8px 0;
}
```

Comprobar en las capturas que `is-active` de la lista se ve como la de la lista de modelos (si no, añadir `bloque-3d-hundido` a la activa, como en `ParameterModelSelector`).

- [ ] **Step 7: La entrada «Clientes» en Parámetros**

En `src/client/views/ParametersView.tsx`:

- Junto a `type SelectedModel = …` añadir `export type VistaRemolques = 'generales' | 'clientes';`.
- En `Props`, sustituir `showRemolques?: boolean;` y `onSelectRemolques?: (selected: boolean) => void;` por:

```ts
  /** Clientes de remolques (fase 3): la hoja de fichas, junto a la de parámetros generales. */
  remolquesClientes?: React.ReactNode;
  remolquesVista?: VistaRemolques | null;
  onSelectRemolques?: (vista: VistaRemolques | null) => void;
```

- En la firma de `ParametersView`, `showRemolques = false, onSelectRemolques,` pasa a `remolquesClientes, remolquesVista = null, onSelectRemolques,`.
- El selector y el contenido:

```tsx
    <ParameterModelSelector selectedModel={remolquesVista === 'clientes' ? 'REMOLQUES-CLIENTES' : remolquesVista ? 'REMOLQUES' : selectedModel} includeRemolques={Boolean(remolques)} onSelectModel={(model) => {
      onSelectRemolques?.(model === 'REMOLQUES' ? 'generales' : model === 'REMOLQUES-CLIENTES' ? 'clientes' : null);
      if (model !== 'REMOLQUES' && model !== 'REMOLQUES-CLIENTES') setSelectedModel(model);
    }} />
    <div className="parameter-layout-main">
      <ParameterSectionIndex />
      {remolquesVista === 'clientes' ? remolquesClientes : remolquesVista ? remolques : <>
```

- En `ParameterModelSelector`, el tipo `SelectedModel | 'REMOLQUES'` pasa a `SelectedModel | 'REMOLQUES' | 'REMOLQUES-CLIENTES'` (en `selectedModel` y en `onSelectModel`), y la familia «Remolques» queda con dos teclas:

```tsx
      {includeRemolques && <section className="parameter-model-family">
        <h3>Remolques</h3>
        {([['REMOLQUES', 'Generales'], ['REMOLQUES-CLIENTES', 'Clientes']] as const).map(([model, label]) => (
          <button key={model} type="button" data-model={model} className={selectedModel === model ? 'tecla-3d is-active bloque-3d-hundido' : 'tecla-3d'} aria-current={selectedModel === model ? 'true' : undefined} onClick={() => onSelectModel(model)}>
            <span><strong>{label}</strong></span>{selectedModel === model && <Check aria-hidden="true" />}
          </button>
        ))}
      </section>}
```

En `src/client/App.tsx`:

- Importaciones: `import { ClientesRemolquesView } from './remolques/ClientesRemolquesView';`, `import { useFichasClientes } from './remolques/useFichasClientes';` y `type VistaRemolques` desde `./views/ParametersView` (añadirlo al `import { ParametersView … }` que ya hay).
- Sustituir `const [showRemolquesParameters, setShowRemolquesParameters] = useState(false);` por:

```ts
  const fichasClientes = useFichasClientes();
  // Parámetros › Remolques: la hoja general o la de clientes (fase 3); null = la de un modelo de toldo.
  const [remolquesVista, setRemolquesVista] = useState<VistaRemolques | null>(null);
  const showRemolquesParameters = remolquesVista !== null;
  const edicionRemolques = remolquesVista === 'clientes' ? fichasClientes : remolquesSettings;
```

- En `discardParameterDraft`, `if (showRemolquesParameters) remolquesSettings.discardDraft();` pasa a `if (showRemolquesParameters) edicionRemolques.discardDraft();`.
- `viewTitle`: `(showRemolquesParameters ? 'Parámetros de remolques' : 'Parámetros de modelos')` pasa a `(remolquesVista === 'clientes' ? 'Clientes de remolques' : showRemolquesParameters ? 'Parámetros de remolques' : 'Parámetros de modelos')`.
- El historial junto al título:

```tsx
            {activeTab === 'parameters' && (remolquesVista === 'clientes'
              ? <ParametersHistory key="remolques-clientes" version={fichasClientes.saved.version} endpoint="/api/remolques/clientes/historial" labels={{}} onLoadVersion={fichasClientes.loadVersion} />
              : showRemolquesParameters
                ? <ParametersHistory key="remolques" version={remolquesSettings.saved.version} endpoint="/api/remolques/parametros/history" labels={{ lona: 'Lona y contorno', ollaos: 'Ollaos', recogidas: 'Recogidas', baqueton: 'Baquetón', clientesBaqueton: 'Extras generales del baquetón' }} onLoadVersion={remolquesSettings.loadVersion} />
                : <ParametersHistory key="toldos" version={ruleSettings.version} onLoadVersion={ruleSettings.loadVersion} />)}
```

- `ParametersSaveBar`: `dirty={showRemolquesParameters ? edicionRemolques.dirty : ruleSettings.dirty}`, `saving={showRemolquesParameters ? edicionRemolques.saving : ruleSettings.saving}`, `onSave={showRemolquesParameters ? edicionRemolques.saveDraft : ruleSettings.saveDraft}`.
- `ParametersView`: `showRemolques={showRemolquesParameters}` y `onSelectRemolques={setShowRemolquesParameters}` pasan a `remolquesVista={remolquesVista}` y `onSelectRemolques={setRemolquesVista}`, y se añade:

```tsx
              remolquesClientes={<>
                {fichasClientes.error && <div role="alert" className="parameter-note">{fichasClientes.error} <button type="button" className="ghost-button" onClick={() => void fichasClientes.refresh()}>Reintentar</button></div>}
                {!fichasClientes.ready && !fichasClientes.error && <p role="status">Cargando fichas de cliente…</p>}
                <ClientesRemolquesView fichas={fichasClientes.fichas} recogidasGenerales={remolquesSettings.saved.parameters.recogidas.map((r) => r.nombre)} disabled={!fichasClientes.ready || fichasClientes.saving} onUpdate={fichasClientes.update} />
              </>}
```

(«Cargar esta versión» del historial pone las fichas de esa versión como borrador; la barra pregunta quién y por qué al guardarlo, como en los parámetros.)

- [ ] **Step 8: Ejecutar las pruebas y ver que pasan**

Run: `pnpm exec vitest run src/client/remolques src/client/views`
Expected: PASS.

- [ ] **Step 9: Capturas**

Con la aislada de la tarea 3 (`tmp/clientes`, 4313), abrir Parámetros › Remolques › Clientes con Playwright (`.claude/skills/running-toldos-testar/drive.mjs`, `openApp`, `TOLDOS_ISOLATED_URL=http://127.0.0.1:4313`), elegir HIJOS DE PEDRO LOPEZ y hacer capturas en claro y oscuro a 1280×720 y 1600×1000 en `tmp/ui-audit/remolques-clientes/` (`clientes-hpl-*`), y otra con una medida añadida (`clientes-medida-*`). Mirarlas: lista legible, bandas como las demás hojas de Parámetros, nada cortado a 1280, sin scroll horizontal. Descartar el borrador al acabar (no guardarlo).

- [ ] **Step 10: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS y build terminado.

```bash
git add src/client/remolques/posicionesTexto.ts src/client/remolques/posicionesTexto.test.ts src/client/remolques/useFichasClientes.ts src/client/remolques/useFichasClientes.test.tsx src/client/remolques/ClientesRemolquesView.tsx src/client/remolques/ClientesRemolquesView.test.tsx src/client/views/ParametersView.tsx src/client/App.tsx src/client/coordina/parametros.css
git commit -m "feat(remolques): Parámetros › Remolques › Clientes

Una hoja con las fichas de cliente (nombre, códigos de RPS, perfil,
recogidas y la propia, ventana, rotulación, material, sesgo, cremallera,
extras de baquetón, observaciones fijas y medidas habituales con sus
ollaos), que se guarda para todos con quién y motivo y tiene su
historial, como las demás hojas de Parámetros.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Parámetros generales sin clientes

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo. **UI independiente: sí** (después de la tarea 3, nunca antes; no toca los ficheros de las tareas 4, 6 y 7).

**Files:**
- Modify: `src/client/remolques/RemolquesParametersView.tsx`, `src/client/remolques/RemolquesParametersView.test.tsx`, `src/client/remolques/useRemolquesParameters.ts`, `src/client/remolques/useRemolquesParameters.test.tsx`

**Interfaces:**
- Consumes: `PARAMS_GENERALES`, `sinEntradasDeCliente` (tarea 1).
- Produces: la hoja general ya sin «Clientes con baquetón» ni «Paño trasero con el ancho de delante»; la banda 05 es «Extras generales del baquetón» (solo GENERAL). `useRemolquesParameters` arranca y restaura con `PARAMS_GENERALES` y quita los clientes al cargar una versión del historial.

- [ ] **Step 1: Cambiar las pruebas**

En `src/client/remolques/RemolquesParametersView.test.tsx`, importar `PARAMS_GENERALES` de `'../../remolques/clientes/params-efectivos'` en lugar de `DEFAULT_PARAMS`, usarlo en los dos `render`, y sustituir las expectativas de la primera prueba por:

```tsx
  expect(html.match(/class="parameter-band"/g)).toHaveLength(5);
  expect(html.match(/type="number"/g)).toHaveLength(12 + PARAMS_GENERALES.recogidas.length * 4 + 7);
  expect(html.match(/type="checkbox"/g)).toBeNull();
  expect(html.match(/<textarea/g)).toHaveLength(1);
  expect(html).toContain('Extras generales del baquetón');
  expect(html).toContain('Parámetros › Remolques › Clientes');
  expect(html).toContain('Restaurar valores por defecto');
  expect(html).toContain('Añadir recogida');
  expect(html).not.toContain('Añadir cliente');
  expect(html).not.toContain('Paño trasero con el ancho de delante');
  expect(html).not.toContain('Quitar recogida NO');
  expect(html).not.toContain('Máximo de ollaos');
  expect(html).not.toContain('Técnicos');
  expect(html).not.toContain('<select');
```

y el título de la prueba pasa a `'presenta las cinco secciones, los campos generales y las acciones, sin clientes ni técnicos ni el máximo de ollaos'`.

En `src/client/remolques/useRemolquesParameters.test.tsx`, añadir `import { PARAMS_GENERALES } from '../../remolques/clientes/params-efectivos';` y, al final:

```tsx
it('arranca con los generales y cargar una versión antigua con clientes no los mete en el borrador', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 4, parameters: PARAMS_GENERALES }) }));
  const { result } = renderHook(() => useRemolquesParameters());
  expect(result.current.parameters.clientesBaqueton.map((c) => c.nombre)).toEqual(['GENERAL']);
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.loadVersion({ ...DEFAULT_PARAMS, demasiaAlto: 12 }));
  expect(result.current.parameters.demasiaAlto).toBe(12);
  expect(result.current.parameters.clientesBaqueton.map((c) => c.nombre)).toEqual(['GENERAL']);
  expect(result.current.parameters.recogidas.some((r) => r.nombre === 'PUENTES HIJOS DE PEDRO LOPEZ')).toBe(false);
  act(() => result.current.reset());
  expect(result.current.parameters.recogidas).toEqual(PARAMS_GENERALES.recogidas);
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/client/remolques/RemolquesParametersView.test.tsx src/client/remolques/useRemolquesParameters.test.tsx`
Expected: FAIL (la hoja aún enseña los clientes; el hook arranca con `DEFAULT_PARAMS`).

- [ ] **Step 3: La hoja general**

En `src/client/remolques/RemolquesParametersView.tsx`:
- Quitar `type ClienteBaqueton` del import y la constante `newCliente`.
- En la banda 03, quitar la línea `<label className="remolques-parameter-check">…Paño trasero con el ancho de delante…</label>` y, en «Añadir recogida», quitar `, panoTraseroConAnchoDelante: false` del objeto nuevo.
- Sustituir la banda 05 entera por:

```tsx
      <ParameterBand number="05" title="Extras generales del baquetón" description="Para los baquetones sin cliente específico. Los extras de cada cliente están en su ficha, en Parámetros › Remolques › Clientes.">
        {general && <section className="remolques-parameter-row bloque-3d-hundido" aria-label="Extras generales del baquetón">
          <div className="parameter-grid remolques-parameter-grid">
            {clienteFields.map(([key, label]) => <NumberField key={key} label={label} value={numeric(general[key])} step={0.5} onChange={(value) => onUpdate({ clientesBaqueton: p.clientesBaqueton.map((r) => r.nombre === 'GENERAL' ? { ...r, [key]: value ?? NaN } : r) })} />)}
          </div>
          <label><span>Observaciones · una por línea</span><textarea rows={Math.max(2, general.observaciones.length)} value={general.observaciones.join('\n')} onChange={(e) => onUpdate({ clientesBaqueton: p.clientesBaqueton.map((r) => r.nombre === 'GENERAL' ? { ...r, observaciones: e.target.value.split('\n') } : r) })} /></label>
        </section>}
      </ParameterBand>
```

y, al principio del componente (después de `scalarFields`): `const general = p.clientesBaqueton.find((c) => c.nombre === 'GENERAL');`.

- [ ] **Step 4: El borrador de la hoja general**

En `src/client/remolques/useRemolquesParameters.ts`:
- `import { DEFAULT_PARAMS, type CalcParams } from '../../remolques/calc/params';` pasa a `import type { CalcParams } from '../../remolques/calc/params';` y se añade `import { PARAMS_GENERALES, sinEntradasDeCliente } from '../../remolques/clientes/params-efectivos';`.
- `useState<Snapshot>({ version: 0, parameters: DEFAULT_PARAMS })` pasa a `useState<Snapshot>({ version: 0, parameters: PARAMS_GENERALES })`.
- En `loadVersion`, `update(editableValues(validation.params, savedRef.current.parameters));` pasa a:

```ts
    // Las versiones de antes de la fase 3 traen los clientes: se quedan en sus fichas.
    if (validation.ok) update(editableValues(sinEntradasDeCliente(validation.params), savedRef.current.parameters));
```

(quitando el `if (validation.ok)` que ya había delante).
- En `reset`, `structuredClone(DEFAULT_PARAMS)` pasa a `structuredClone(PARAMS_GENERALES)`.

- [ ] **Step 5: Pruebas, capturas y batería**

Run: `pnpm exec vitest run src/client/remolques && pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS y build terminado.

Capturas de Parámetros › Remolques › Generales (banda 05) en la aislada de 4313, claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/remolques-clientes/generales-*`; mirarlas.

- [ ] **Step 6: Commit**

```bash
git add src/client/remolques/RemolquesParametersView.tsx src/client/remolques/RemolquesParametersView.test.tsx src/client/remolques/useRemolquesParameters.ts src/client/remolques/useRemolquesParameters.test.tsx
git commit -m "feat(remolques): Parámetros de remolques solo con lo general

Los extras de cada cliente y la recogida de puentes de HPL están ahora
en sus fichas: la hoja general se queda con los extras de GENERAL y las
recogidas normales, restaura a esos valores y, al cargar una versión
antigua del historial, no vuelve a meter los clientes.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: «Obtener datos»: la ficha, las marcas «del cliente» y la sugerencia

Modelo recomendado: el más capaz (Opus). Esfuerzo: alto (el hook de Remolques tiene consultas a RPS en vuelo, borradores y la pregunta de sustituir o añadir; la ficha y su pregunta no deben pisarlas).

**Files:**
- Create: `src/client/remolques/fichaAlObtener.ts` + `fichaAlObtener.test.ts`, `src/client/remolques/del-cliente-pantalla.test.tsx`
- Modify: `src/remolques/rps/types.ts`, `src/remolques/workspace/importar-rps.ts`, `src/remolques/workspace/__tests__/importar-rps.test.ts`, `src/remolques/workspace/estado.ts`, `src/remolques/workspace/__tests__/estado.test.ts`, `src/client/remolques/useRemolques.ts`, `src/client/remolques/Campos.tsx`, `src/client/remolques/FormularioLona.tsx`, `src/client/remolques/FormularioBaqueton.tsx`, `src/client/remolques/RemolquesView.tsx`, `src/client/coordina/remolques.css`

**Interfaces:**
- Consumes: `aplicarFichaALineas`, `marcasTrasCambio` (tarea 2); `fichaPorCodigo`, `sugerirFicha`, `FichaCliente` (tarea 1); `leerFichas`, `guardarDesdePedido`, `nombreClienteRps` (tarea 3); `ConfirmOptions` (`src/client/components/NotificationCenter`).
- Produces: `OrigenRps.cliente?: ClienteRps`; `decidirFicha(fichas, cliente: ClienteRps): { ficha: FichaCliente | null; sugerida: FichaCliente | null }`, `preguntaSugerencia(ficha: FichaCliente, pedido: PedidoRps): ConfirmOptions`, `notaFicha(ficha: FichaCliente | null, lineas: LineaPedido[]): string`; `MarcaDelCliente()` (componente) y prop `delCliente?: boolean` en `CampoNum`, `CampoSiNo`, `CampoSelect`, `CampoMaterial`; prop `delCliente?: readonly string[]` en `FormularioLona` y `FormularioBaqueton`.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/remolques/workspace/__tests__/importar-rps.test.ts`, en la prueba que comprueba `primera.origenRps` con `toMatchObject`, añadir dentro del objeto esperado `cliente: pedido.cliente,` (con el nombre de la variable del pedido de esa prueba).

En `src/remolques/workspace/__tests__/estado.test.ts`, añadir:

```ts
describe("marcas «del cliente»", () => {
  it("cambiar un campo que puso la ficha le quita la marca; los demás la conservan", () => {
    const marcada = linea("10", { delCliente: { ficha: "TALLERES CAL", campos: ["recogeDelante", "material"] } });
    const estado = reducirWorkspace(conPedido(), { tipo: "LINEA_ANADIDA", linea: marcada });
    const cambiado = reducirWorkspace(estado, { tipo: "INPUT_CAMBIADO", input: { ...marcada.input, recogeDelante: "NO" } as LonaInput });
    expect(cambiado.lineas[0].delCliente).toEqual({ ficha: "TALLERES CAL", campos: ["material"] });
    const sinMarcas = reducirWorkspace(cambiado, { tipo: "INPUT_CAMBIADO", input: { ...cambiado.lineas[0].input, material: "OTRA" } as LonaInput });
    expect(sinMarcas.lineas[0]).not.toHaveProperty("delCliente");
  });
});
```

(Si `LINEA_ANADIDA` no deja activa la línea añadida, añadir antes un `LINEA_SELECCIONADA` con la versión "10".)

Crear `src/client/remolques/fichaAlObtener.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { entradasDeCliente, fichasSemilla } from '../../remolques/clientes/semilla.ts';
import type { PedidoRps } from '../../remolques/rps/types.ts';
import { decidirFicha, notaFicha, preguntaSugerencia } from './fichaAlObtener';

const fichas = fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
const pedido = (codigo: string, nombre: string, alias: string | null = null): PedidoRps => ({
  numero: 'AR.26.04286', fecha: '2026-10-01', fechaSalida: null, cliente: { codigo, nombre, alias }, lineas: [],
});

describe('qué ficha toca a un pedido', () => {
  it('por el código: esa, sin preguntar', () => {
    expect(decidirFicha(fichas, pedido('001300', 'HIJOS DE PEDRO LOPEZ S.L.').cliente)).toMatchObject({ ficha: { id: 'hijos-de-pedro-lopez' }, sugerida: null });
  });
  it('sin código en ninguna ficha y con el nombre parecido: se sugiere', () => {
    expect(decidirFicha(fichas, pedido('099999', 'REMOLQUES AYALA NORTE').cliente)).toMatchObject({ ficha: null, sugerida: { id: 'ayala' } });
  });
  it('sin código de cliente, ni ficha ni sugerencia', () => {
    expect(decidirFicha(fichas, pedido('', 'REMOLQUES AYALA').cliente)).toEqual({ ficha: null, sugerida: null });
  });
});

describe('la pregunta y el aviso', () => {
  it('pregunta si es de la ficha, con «Añadir el código y aplicar» y «No»', () => {
    const p = pedido('099999', 'ENGANCHES AYALA', 'REMOLQUES AYALA NORTE');
    expect(preguntaSugerencia(fichas[1], p)).toEqual({
      title: '¿Es de la ficha AYALA?',
      message: 'El cliente de AR.26.04286 en RPS, REMOLQUES AYALA NORTE (código 099999), no está en ninguna ficha, pero su nombre se parece al de AYALA. Si añades el código, sus pedidos tomarán la ficha solos.',
      confirmLabel: 'Añadir el código y aplicar',
      cancelLabel: 'No',
    });
  });
  it('el aviso dice de qué ficha viene lo marcado, solo si puso algo', () => {
    expect(notaFicha(fichas[0], [{ version: '10', tipo: 'lona', input: {} as never, delCliente: { ficha: 'HIJOS DE PEDRO LOPEZ', campos: ['material'] } }]))
      .toBe(' Con la ficha de HIJOS DE PEDRO LOPEZ: lo marcado «del cliente» viene de ella.');
    expect(notaFicha(fichas[0], [{ version: '10', tipo: 'lona', input: {} as never }])).toBe('');
    expect(notaFicha(null, [])).toBe('');
  });
});
```

Crear `src/client/remolques/del-cliente-pantalla.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { emptyBaqueton, emptyLona } from '../../remolques/entradas-vacias.ts';
import { FormularioBaqueton } from './FormularioBaqueton';
import { FormularioLona } from './FormularioLona';

const marcas = (html: string) => html.match(/class="rem-del-cliente"/g)?.length ?? 0;

describe('marca «del cliente» en los formularios', () => {
  it('solo en los campos que puso la ficha', () => {
    const input = { ...emptyLona(), tipoPerfil: 'TIPO 02' as const, aguas: 20, recogeDelante: 'GOMA', recogeAtras: 'GOMA', observaciones: 'ETIQUETA' };
    const html = renderToStaticMarkup(<FormularioLona input={input} materiales={[]} params={DEFAULT_PARAMS} delCliente={['tipoPerfil', 'recogeDelante', 'observaciones']} onChange={() => {}} />);
    expect(marcas(html)).toBe(3);
    expect(html).toContain('>del cliente<');
  });

  it('el ancho de detrás que puso el sesgo se ve y va marcado', () => {
    const input = { ...emptyLona(), ancho: 120, anchoAtras: 121.5 };
    const html = renderToStaticMarkup(<FormularioLona input={input} materiales={[]} params={DEFAULT_PARAMS} delCliente={['anchoAtras']} onChange={() => {}} />);
    expect(marcas(html)).toBe(1);
  });

  it('el baquetón marca el cliente de los extras y los ollaos', () => {
    const input = { ...emptyBaqueton(), clienteEspecifico: 'AYALA', modoOllaos: 'SEGUN SE INDICA' as const };
    const html = renderToStaticMarkup(<FormularioBaqueton input={input} materiales={[]} params={DEFAULT_PARAMS} delCliente={['clienteEspecifico', 'modoOllaos', 'ollaosManuales']} onChange={() => {}} />);
    expect(marcas(html)).toBe(2);
  });

  it('sin marcas, ninguna', () => {
    expect(marcas(renderToStaticMarkup(<FormularioLona input={emptyLona()} materiales={[]} params={DEFAULT_PARAMS} onChange={() => {}} />))).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/remolques/workspace src/client/remolques/fichaAlObtener.test.ts src/client/remolques/del-cliente-pantalla.test.tsx`
Expected: FAIL (sin `cliente` en el origen, sin marcas en el reductor, sin `fichaAlObtener`, sin `delCliente` en los formularios).

- [ ] **Step 3: El cliente de RPS en el origen del elemento**

En `src/remolques/rps/types.ts`, dentro de `interface OrigenRps`, después de `texto?: string;`:

```ts
  /** El cliente de RPS del pedido: para buscar o crear su ficha («Guardar en la ficha del cliente»). */
  cliente?: ClienteRps;
```

En `src/remolques/workspace/importar-rps.ts`, en `lineasDesdePedidoRps`, dentro de `origenRps: { … }`, después de `texto: …,`:

```ts
        cliente: pedido.cliente,
```

- [ ] **Step 4: El reductor quita la marca al cambiar el campo**

En `src/remolques/workspace/estado.ts`, importar `import { marcasTrasCambio } from "../clientes/aplicar.ts";` y sustituir el caso `INPUT_CAMBIADO` por:

```ts
    case "INPUT_CAMBIADO": {
      if (!estado.versionActiva) return estado;
      return {
        ...estado,
        lineas: estado.lineas.map((linea) => {
          if (linea.version !== estado.versionActiva) return linea;
          // Lo que el técnico cambia deja de ser «del cliente»: la marca solo se queda en lo que sigue igual.
          const delCliente = marcasTrasCambio(linea.delCliente, linea.input, accion.input);
          const { delCliente: _anterior, ...resto } = linea;
          return delCliente ? { ...resto, input: accion.input, delCliente } : { ...resto, input: accion.input };
        }),
      };
    }
```

- [ ] **Step 5: Qué ficha toca y la pregunta**

Crear `src/client/remolques/fichaAlObtener.ts`:

```ts
import { fichaPorCodigo, sugerirFicha } from '../../remolques/clientes/reglas.ts';
import type { FichaCliente } from '../../remolques/clientes/tipos.ts';
import type { ClienteRps, PedidoRps } from '../../remolques/rps/types.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import type { ConfirmOptions } from '../components/NotificationCenter';
import { nombreClienteRps } from './fichasClientes';

// La ficha del cliente al obtener un pedido de RPS (fase 3): por su código; si no está en ninguna y el
// nombre se parece al de una, se pregunta. Sin código de cliente no se busca nada.

export function decidirFicha(fichas: readonly FichaCliente[], cliente: ClienteRps): { ficha: FichaCliente | null; sugerida: FichaCliente | null } {
  if (!cliente.codigo.trim()) return { ficha: null, sugerida: null };
  const ficha = fichaPorCodigo(fichas, cliente.codigo);
  return ficha ? { ficha, sugerida: null } : { ficha: null, sugerida: sugerirFicha(fichas, cliente) };
}

export function preguntaSugerencia(ficha: FichaCliente, pedido: PedidoRps): ConfirmOptions {
  return {
    title: `¿Es de la ficha ${ficha.nombre}?`,
    message: `El cliente de ${pedido.numero} en RPS, ${nombreClienteRps(pedido.cliente)} (código ${pedido.cliente.codigo}), no está en ninguna ficha, pero su nombre se parece al de ${ficha.nombre}. Si añades el código, sus pedidos tomarán la ficha solos.`,
    confirmLabel: 'Añadir el código y aplicar',
    cancelLabel: 'No',
  };
}

/** Lo que se añade al aviso de «elementos creados» si la ficha puso algo. */
export function notaFicha(ficha: FichaCliente | null, lineas: readonly LineaPedido[]): string {
  return ficha && lineas.some((linea) => linea.delCliente)
    ? ` Con la ficha de ${ficha.nombre}: lo marcado «del cliente» viene de ella.`
    : '';
}
```

- [ ] **Step 6: Aplicarla en «Obtener datos del pedido»**

En `src/client/remolques/useRemolques.ts`:

Importaciones:

```ts
import { aplicarFichaALineas } from '../../remolques/clientes/aplicar.ts';
import type { FichaCliente } from '../../remolques/clientes/tipos.ts';
import { decidirFicha, notaFicha, preguntaSugerencia } from './fichaAlObtener';
import { guardarDesdePedido, leerFichas, nombreClienteRps } from './fichasClientes';
```

Justo antes del comentario de `importarPedidoRps` («El pedido de RPS convertido en elementos…»), añadir:

```ts
  /**
   * La ficha del cliente del pedido (fase 3). Por su código de RPS; si no está en ninguna y el nombre
   * se parece al de una, pregunta «¿Es de la ficha …?»: «Añadir el código y aplicar» guarda el código
   * en esa ficha (con el «Soy») y la aplica. Si no se pueden leer las fichas, se obtiene sin ellas.
   */
  const fichaDelPedido = useCallback(async (pedido: PedidoRps): Promise<FichaCliente | null> => {
    let fichas: FichaCliente[];
    try {
      fichas = (await leerFichas()).fichas;
    } catch {
      avisar('info', 'No se pudieron leer las fichas de cliente: el pedido se obtiene sin ellas.');
      return null;
    }
    const { ficha, sugerida } = decidirFicha(fichas, pedido.cliente);
    if (ficha || !sugerida) return ficha;
    if (await confirmar(preguntaSugerencia(sugerida, pedido)) !== 'confirm') return null;
    if (!usuario) {
      avisar('info', `Se aplica la ficha de ${sugerida.nombre}, pero el código no se guarda en ella: elige «Soy» primero.`);
      return sugerida;
    }
    try {
      await guardarDesdePedido({
        numeroPedido: pedido.numero,
        cliente: { codigo: pedido.cliente.codigo, nombre: nombreClienteRps(pedido.cliente) },
        fichaId: sugerida.id,
        claves: [],
        updatedBy: usuario,
      });
      avisar('exito', `Código ${pedido.cliente.codigo} añadido a la ficha de ${sugerida.nombre}.`);
    } catch (error) {
      avisar('error', `${error instanceof Error ? error.message : 'No se pudo guardar el código en la ficha.'} La ficha se aplica solo a este pedido.`);
    }
    return sugerida;
  }, [avisar, confirmar, usuario]);
```

En `importarPedidoRps`, sustituir

```ts
    const deRps = lineasDesdePedidoRps(pedido, {
      materiales,
      params,
      realizadoPor: usuario,
      importadoEn: new Date().toISOString(),
    });
```

por

```ts
    // La ficha del cliente: solo rellena lo vacío y marca lo que pone «del cliente». Puede preguntar,
    // así que después se vuelve a comprobar que la consulta sigue siendo la de esta pantalla.
    const ficha = await fichaDelPedido(pedido);
    if (!vigente() || !esteMismo()) return;
    const deRps = aplicarFichaALineas(lineasDesdePedidoRps(pedido, {
      materiales,
      params,
      realizadoPor: usuario,
      importadoEn: new Date().toISOString(),
    }), ficha);
    const conFicha = notaFicha(ficha, deRps);
```

y añadir `${conFicha}` al final de los tres avisos de éxito de esa función:
- `…Completa en cada pestaña lo que falta; todo se puede editar.${notaRevisar}${conFicha}`
- `` `Elementos sustituidos por …de RPS.${notaRevisar}${conFicha}` ``
- `` `${n} … añadidas al pedido; lo que ya había no se ha tocado.${conFicha}` ``

y `fichaDelPedido` a las dependencias de `importarPedidoRps`: `[asegurarMateriales, avisar, fichaDelPedido, params, preguntarModoImportacion, usuario]`.

`cargarBorrador`, `cargarPedidoGuardado` y `RPS_IMPORTADO` no cambian: abrir un borrador o «Corregir» no vuelve a aplicar la ficha (sus líneas ya traen lo que tenían, con sus marcas si las había).

- [ ] **Step 7: La marca en los campos**

En `src/client/remolques/Campos.tsx`, después de `MensajeError`:

```tsx
/** El valor lo puso la ficha del cliente al obtener el pedido (fase 3); se quita al cambiarlo. Como la
 *  marca «Propuesta · compruébala» de la tela en toldos. */
export function MarcaDelCliente() {
  return <span className="rem-del-cliente" title="Lo puso la ficha del cliente: cámbialo si este pedido es distinto">del cliente</span>;
}
```

En `CampoNum`, `CampoSiNo`, `CampoSelect` y `CampoMaterial`, añadir a sus props `delCliente?: boolean;` y, justo después de su `<MensajeError … />`, `{props.delCliente && <MarcaDelCliente />}` (en `CampoMaterial`, antes de `<FabricStockCodeLine …/>`).

- [ ] **Step 8: Los formularios pasan las marcas**

En `src/client/remolques/FormularioLona.tsx` y `FormularioBaqueton.tsx`:
- Añadir a las props `delCliente = []` con tipo `/** Campos que puso la ficha del cliente (marca «del cliente»). */ delCliente?: readonly string[];`.
- Al principio del componente: `const dc = (campo: string) => delCliente.includes(campo);`.
- Importar `MarcaDelCliente` de `./Campos`.
- Añadir `delCliente={dc('<campo>')}` en estos campos (el `name` de cada uno es el campo):

| Formulario | Campos |
| --- | --- |
| Lona | `tipoPerfil`, `aguas`, `chaflan`, `radioEsquina`, los radios de la banda (`delCliente={dc(campo)}`), `CampoMaterial` (`dc('material')`), `recogeDelante`, `recogeAtras`, `bastillaEnfundar`, `anchoAtras`, `modoOllaos`, `ventana`, `ventanaAncho`, `ventanaAlto`, `rotulacion` |
| Baquetón | `clienteEspecifico`, `rotulacion`, `CampoMaterial` (`dc('material')`), `modoOllaos` |

- En los dos, las observaciones: dentro del `<div className="rem-span-4">` de `ObservationLines`, después de él, `{dc('observaciones') && <MarcaDelCliente />}`.

En `src/client/remolques/RemolquesView.tsx`:
- A `FormularioLona` y `FormularioBaqueton`, `delCliente={lineaActiva.delCliente?.campos}`.
- Después de `{ws.origenRpsActivo && <OrigenRpsElemento origen={ws.origenRpsActivo} />}`:

```tsx
          {lineaActiva.delCliente && (
            <p className="rem-nota-ficha" role="note">
              Con la ficha de {lineaActiva.delCliente.ficha}: lo marcado «del cliente» viene de ella. Lo que cambies, manda.
            </p>
          )}
```

- [ ] **Step 9: Estilos**

En `src/client/coordina/remolques.css`, después del bloque de `.rem-editor-cabecera`:

```css
/* «del cliente» (fase 3): el valor lo puso la ficha del cliente. El mismo chip ámbar que
   «Propuesta · compruébala» de la tela en toldos (border-amber-500/30 bg-amber-500/10 de CoordinaOT). */
.rem-del-cliente {
  align-self: flex-start;
  background: var(--aviso-fondo);
  border: 1px solid var(--aviso-borde);
  border-radius: 999px;
  color: var(--aviso-texto);
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  line-height: 1rem;
  margin-top: 3px;
  padding: 1px 8px;
  white-space: nowrap;
  width: fit-content;
}
.rem-nota-ficha { color: var(--text-muted); font-size: 12px; margin: 0 0 0.5rem; }
```

- [ ] **Step 10: Ejecutar las pruebas y ver que pasan**

Run: `pnpm exec vitest run src/remolques src/client/remolques`
Expected: PASS (también `resultados-paridad.test.tsx`, `obtener-pedido-pantalla.test.tsx` y las de borradores, sin tocarlas).

- [ ] **Step 11: Probarlo en la aislada y capturas**

En la aislada de 4313 (≈ 2 min): poner a la ficha del cliente de `AR.26.04286` (leer su `cliente.codigo` en `/api/remolques/rps-pedido?numero=AR.26.04286`; si RPS no responde, saltar este paso y anotarlo) un perfil «Recto con aguas», recogidas «Goma» y una observación fija con `PUT /api/remolques/clientes` (`updatedBy: 'IVÁN'`, `reason: 'Prueba'`). En Remolques, «Obtener datos del pedido» con ese número: los campos llevan «del cliente», la nota sale bajo el origen de RPS, el aviso de «elementos creados» nombra la ficha; cambiar la recogida de delante quita su marca. Quitar el código de la ficha y poner como nombre uno contenido en el de RPS: sale «¿Es de la ficha …?» y «Añadir el código y aplicar» guarda el código. Capturas en claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/remolques-clientes/` (`obtener-con-ficha-*`, `sugerencia-*`); mirarlas (el chip no descoloca la rejilla; a 1280 cabe).

- [ ] **Step 12: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS y build terminado.

```bash
git add src/remolques/rps/types.ts src/remolques/workspace/importar-rps.ts src/remolques/workspace/__tests__/importar-rps.test.ts src/remolques/workspace/estado.ts src/remolques/workspace/__tests__/estado.test.ts src/client/remolques/fichaAlObtener.ts src/client/remolques/fichaAlObtener.test.ts src/client/remolques/del-cliente-pantalla.test.tsx src/client/remolques/useRemolques.ts src/client/remolques/Campos.tsx src/client/remolques/FormularioLona.tsx src/client/remolques/FormularioBaqueton.tsx src/client/remolques/RemolquesView.tsx src/client/coordina/remolques.css
git commit -m "feat(remolques): la ficha del cliente al obtener el pedido

Al obtener un pedido de RPS, si el código del cliente está en una ficha,
los campos vacíos se rellenan con ella y llevan la marca «del cliente»,
que se quita al cambiarlos; si la medida coincide con una habitual, los
ollaos salen a medida con sus posiciones. Si el código no está en
ninguna ficha pero el nombre se parece, pregunta y puede añadir el
código. Abrir un borrador o corregir un pedido no la vuelve a aplicar.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: «Guardar en la ficha del cliente»

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio. **UI independiente: no** (usa el origen con cliente y las marcas de la tarea 6, y toca `RemolquesView.tsx` y `remolques.css` después de ella).

**Files:**
- Create: `src/client/remolques/guardarEnFicha.ts` + `guardarEnFicha.test.ts`, `src/client/remolques/useGuardarEnFicha.ts`, `src/client/remolques/GuardarEnFicha.tsx` + `GuardarEnFicha.test.tsx`
- Modify: `src/client/remolques/RemolquesView.tsx`, `src/client/coordina/remolques.css`

**Interfaces:**
- Consumes: `diferenciasConFicha`, `DiferenciaFicha`, `ElementoFicha` (tarea 2); `fichaPorCodigo`, `FichaCliente` (tarea 1); `leerFichas`, `guardarDesdePedido`, `nombreClienteRps` (tarea 3); `OrigenRps.cliente` (tarea 6); `normalizarNumeroPedidoRps` (`src/remolques/rps/numero-pedido.ts`); `Notify`.
- Produces: `clienteDeLinea(linea: LineaPedido, numeroPedido: string, pedidoRps: PedidoRps | null): ClienteRps | null`, `elementoDeLinea(linea: LineaPedido): ElementoFicha`; `useGuardarEnFicha({ usuario, numeroPedido, pedidoRps, params, notify })` → `{ abierta, ocupado, abrir(linea), guardar(claves), cerrar() }`; `GuardarEnFicha({ abierta, usuario, numeroPedido, ocupado, onGuardar, onCerrar })`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/client/remolques/guardarEnFicha.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import type { PedidoRps } from '../../remolques/rps/types.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { clienteDeLinea, elementoDeLinea } from './guardarEnFicha';

const CLIENTE = { codigo: '009999', nombre: 'TALLERES CAL S.L.', alias: 'TALLERES CAL' };
const linea = (cliente?: typeof CLIENTE): LineaPedido => ({
  version: '10', tipo: 'lona', input: emptyLona(),
  origenRps: cliente ? { numeroPedido: 'AR.26.04286', numeroLinea: 1, idLinea: 'L1', ordenFabricacion: null, importadoEn: '', cliente } : null,
});
const pedido: PedidoRps = { numero: 'AR.26.04286', fecha: null, fechaSalida: null, cliente: CLIENTE, lineas: [] };

describe('el cliente de RPS de un elemento', () => {
  it('el que guardó al importarse', () => {
    expect(clienteDeLinea(linea(CLIENTE), 'AR.26.04286', null)).toEqual(CLIENTE);
  });
  it('si no lo tiene, el del pedido de RPS en pantalla, si es este pedido', () => {
    expect(clienteDeLinea(linea(), 'AR2604286', pedido)).toEqual(CLIENTE);
    expect(clienteDeLinea(linea(), 'AR.26.04287', pedido)).toBeNull();
    expect(clienteDeLinea(linea(), 'AR.26.04286', null)).toBeNull();
  });
  it('el elemento para la ficha: su tipo y su entrada', () => {
    expect(elementoDeLinea(linea())).toEqual({ tipo: 'lona', input: emptyLona() });
  });
});
```

Crear `src/client/remolques/GuardarEnFicha.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { GuardarEnFicha } from './GuardarEnFicha';
import type { FichaAbierta } from './useGuardarEnFicha';

const abierta = (ficha: FichaAbierta['ficha']): FichaAbierta => ({
  elemento: { tipo: 'lona', input: emptyLona() },
  cliente: { codigo: '009999', nombre: 'TALLERES CAL S.L.', alias: 'TALLERES CAL' },
  ficha,
  diferencias: [
    { clave: 'medida', etiqueta: 'Medida 200 × 120 de lona con sus ollaos', antes: '—', despues: 'Delante 2,5 · 118,5', nota: 'nueva', marcada: true },
    { clave: 'recogeDelante', etiqueta: 'Recogida delante', antes: '—', despues: 'Goma', marcada: false },
  ],
});

describe('ventana «Guardar en la ficha del cliente»', () => {
  it('la medida marcada y lo habitual desmarcado, con antes y después', () => {
    const html = renderToStaticMarkup(<GuardarEnFicha abierta={abierta({ id: 't', nombre: 'TALLERES CAL', codigosRps: ['009999'] })} usuario="IVÁN" numeroPedido="AR.26.04286" ocupado={false} onGuardar={() => {}} onCerrar={() => {}} />);
    expect(html).toContain('Guardar en la ficha de TALLERES CAL');
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain('nueva');
    expect(html).toContain('— → Goma');
    expect(html).toContain('Lo guarda IVÁN con el motivo «Desde el pedido AR.26.04286»');
  });

  it('sin ficha, la crea con el nombre del cliente', () => {
    const html = renderToStaticMarkup(<GuardarEnFicha abierta={abierta(null)} usuario="IVÁN" numeroPedido="AR.26.04286" ocupado={false} onGuardar={() => {}} onCerrar={() => {}} />);
    expect(html).toContain('Crear la ficha de TALLERES CAL');
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/client/remolques/guardarEnFicha.test.ts src/client/remolques/GuardarEnFicha.test.tsx`
Expected: FAIL — no existen los módulos.

- [ ] **Step 3: El cliente y el elemento**

Crear `src/client/remolques/guardarEnFicha.ts`:

```ts
import type { BaquetonInput } from '../../remolques/calc/baqueton.ts';
import type { LonaInput } from '../../remolques/calc/lona.ts';
import type { ElementoFicha } from '../../remolques/clientes/diferencias.ts';
import { normalizarNumeroPedidoRps } from '../../remolques/rps/numero-pedido.ts';
import type { ClienteRps, PedidoRps } from '../../remolques/rps/types.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';

// «Guardar en la ficha del cliente» (fase 3): solo con un cliente de RPS, el que el elemento guardó al
// importarse o, si no lo tiene (un elemento tecleado a mano), el del pedido de RPS de esta pantalla.

export function clienteDeLinea(linea: LineaPedido, numeroPedido: string, pedidoRps: PedidoRps | null): ClienteRps | null {
  if (linea.origenRps?.cliente?.codigo) return linea.origenRps.cliente;
  if (pedidoRps?.cliente.codigo && normalizarNumeroPedidoRps(pedidoRps.numero) === normalizarNumeroPedidoRps(numeroPedido)) {
    return pedidoRps.cliente;
  }
  return null;
}

export const elementoDeLinea = (linea: LineaPedido): ElementoFicha => (linea.tipo === 'lona'
  ? { tipo: 'lona', input: linea.input as LonaInput }
  : { tipo: 'baqueton', input: linea.input as BaquetonInput });
```

Crear `src/client/remolques/useGuardarEnFicha.ts`:

```ts
import { useCallback, useState } from 'react';
import type { CalcParams } from '../../remolques/calc/params.ts';
import { diferenciasConFicha, type DiferenciaFicha, type ElementoFicha } from '../../remolques/clientes/diferencias.ts';
import { fichaPorCodigo } from '../../remolques/clientes/reglas.ts';
import type { FichaCliente } from '../../remolques/clientes/tipos.ts';
import type { ClienteRps, PedidoRps } from '../../remolques/rps/types.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import type { Notify } from '../components/NotificationCenter';
import { guardarDesdePedido, leerFichas, nombreClienteRps } from './fichasClientes';
import { clienteDeLinea, elementoDeLinea } from './guardarEnFicha';

export interface FichaAbierta {
  /** El elemento tal como estaba al pulsar el botón: cambiarlo después no cambia lo que se guarda. */
  elemento: ElementoFicha;
  cliente: ClienteRps;
  ficha: FichaCliente | null;
  diferencias: DiferenciaFicha[];
}

export function useGuardarEnFicha({ usuario, numeroPedido, pedidoRps, params, notify }: {
  usuario: string; numeroPedido: string; pedidoRps: PedidoRps | null; params: CalcParams; notify: Notify;
}) {
  const [abierta, setAbierta] = useState<FichaAbierta | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const abrir = useCallback(async (linea: LineaPedido) => {
    const cliente = clienteDeLinea(linea, numeroPedido, pedidoRps);
    if (!cliente) return;
    setOcupado(true);
    try {
      const { fichas } = await leerFichas();
      const ficha = fichaPorCodigo(fichas, cliente.codigo);
      const elemento = elementoDeLinea(linea);
      setAbierta({ elemento, cliente, ficha, diferencias: diferenciasConFicha(elemento, ficha, params) });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudieron leer las fichas de cliente.', { tone: 'error' });
    } finally {
      setOcupado(false);
    }
  }, [notify, numeroPedido, params, pedidoRps]);

  const guardar = useCallback(async (claves: string[]) => {
    if (!abierta) return;
    setOcupado(true);
    try {
      const { ficha } = await guardarDesdePedido({
        numeroPedido: numeroPedido.trim(),
        cliente: { codigo: abierta.cliente.codigo, nombre: nombreClienteRps(abierta.cliente) },
        fichaId: abierta.ficha?.id ?? null,
        elemento: abierta.elemento,
        claves,
        updatedBy: usuario,
      });
      notify(`Guardado en la ficha de ${ficha.nombre}.`, { tone: 'success', title: 'Ficha del cliente' });
      setAbierta(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar en la ficha del cliente.', { tone: 'error' });
    } finally {
      setOcupado(false);
    }
  }, [abierta, notify, numeroPedido, usuario]);

  return { abierta, ocupado, abrir, guardar, cerrar: useCallback(() => setAbierta(null), []) };
}
```

- [ ] **Step 4: La ventana**

Crear `src/client/remolques/GuardarEnFicha.tsx`:

```tsx
import React, { useEffect, useId, useState } from 'react';
import { Save } from 'lucide-react';
import { nombreClienteRps } from './fichasClientes';
import type { FichaAbierta } from './useGuardarEnFicha';

// La ventana de «Guardar en la ficha del cliente» (fase 3): lo que el elemento tiene distinto de la
// ficha, cada cosa con su casilla. La medida con sus ollaos, marcada; lo habitual, desmarcado. Quién
// guarda es el «Soy» y el motivo lo pone el servidor; queda en el historial de la ficha.
export function GuardarEnFicha({ abierta, usuario, numeroPedido, ocupado, onGuardar, onCerrar }: {
  abierta: FichaAbierta; usuario: string; numeroPedido: string; ocupado: boolean;
  onGuardar: (claves: string[]) => void; onCerrar: () => void;
}) {
  const titulo = useId();
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(abierta.diferencias.filter((d) => d.marcada).map((d) => d.clave)));
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => { if (evento.key === 'Escape' && !ocupado) onCerrar(); };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [ocupado, onCerrar]);
  const cambiar = (clave: string, si: boolean) => setMarcadas((actual) => {
    const siguiente = new Set(actual);
    if (si) siguiente.add(clave); else siguiente.delete(clave);
    return siguiente;
  });
  const nombre = abierta.ficha?.nombre ?? nombreClienteRps(abierta.cliente);
  // Sin ficha se puede crear solo con el nombre y el código; con ficha, hace falta marcar algo.
  const puedeGuardar = !ocupado && (abierta.ficha === null || marcadas.size > 0);
  return (
    <div className="parameters-save-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) onCerrar(); }}>
      <div className="parameters-save-dialog panel-3d rem-ficha-dialogo" role="dialog" aria-modal="true" aria-labelledby={titulo}>
        <h2 id={titulo}>{abierta.ficha ? `Guardar en la ficha de ${nombre}` : `Crear la ficha de ${nombre}`}</h2>
        <p>{abierta.diferencias.length > 0
          ? 'Marca lo que quieres guardar en la ficha. Lo que no marques, no cambia.'
          : abierta.ficha ? 'Este elemento no tiene nada distinto de la ficha.' : `Se crea la ficha con el código ${abierta.cliente.codigo}.`}</p>
        {abierta.diferencias.length > 0 && (
          <ul className="rem-ficha-cambios">
            {abierta.diferencias.map((d) => (
              <li key={d.clave}>
                <label>
                  <input type="checkbox" checked={marcadas.has(d.clave)} onChange={(e) => cambiar(d.clave, e.target.checked)} />
                  <span>
                    <strong>{d.etiqueta}</strong>
                    {d.nota && <small className="rem-ficha-nota">{d.nota}</small>}
                    <span className="rem-ficha-valores">{d.antes} → {d.despues}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="rem-ficha-quien">Lo guarda {usuario} con el motivo «Desde el pedido {numeroPedido.trim()}».</p>
        <div className="parameters-save-actions">
          <button className="ghost-button" type="button" disabled={ocupado} onClick={onCerrar}>Cancelar</button>
          <button className="primary-button" type="button" disabled={!puedeGuardar} onClick={() => onGuardar([...marcadas])}>
            <Save aria-hidden="true" />{ocupado ? 'Guardando…' : abierta.ficha ? 'Guardar en la ficha' : 'Crear la ficha'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: El botón en el editor**

En `src/client/remolques/RemolquesView.tsx`:
- Importar `BookUser` de `lucide-react` (junto a `FilePen, Save`), `GuardarEnFicha` de `./GuardarEnFicha`, `clienteDeLinea` de `./guardarEnFicha` y `useGuardarEnFicha` de `./useGuardarEnFicha`.
- Después de `const faltaPdf = faltaParaPdf(lineas, estadosLinea);`:

```tsx
  // «Guardar en la ficha del cliente» (fase 3): solo con un cliente de RPS en el elemento o en pantalla.
  const fichaCliente = useGuardarEnFicha({ usuario, numeroPedido, pedidoRps: rps.pedido, params, notify });
  const clienteActivo = lineaActiva ? clienteDeLinea(lineaActiva, numeroPedido, rps.pedido) : null;
```

- La cabecera del editor pasa a:

```tsx
          <header className="rem-editor-cabecera">
            <div>
              <p className="rem-editor-etiqueta">Editando dentro de {numeroPedido}</p>
              <h2>{rotuloElemento(lineaActiva, indiceActivo)}</h2>
            </div>
            {clienteActivo && (
              <button type="button" className="ghost-button rem-ficha-boton"
                disabled={!usuario || fichaCliente.ocupado} aria-busy={fichaCliente.ocupado}
                title={usuario ? `Guardar en la ficha de ${clienteActivo.alias || clienteActivo.nombre}` : 'Elige «Soy» para guardar en la ficha del cliente.'}
                onClick={() => void fichaCliente.abrir(lineaActiva)}>
                <BookUser aria-hidden="true" />
                Guardar en la ficha del cliente
              </button>
            )}
          </header>
```

- Al final del fragmento que devuelve el componente (antes de `</>`):

```tsx
      {fichaCliente.abierta && (
        <GuardarEnFicha abierta={fichaCliente.abierta} usuario={usuario} numeroPedido={numeroPedido}
          ocupado={fichaCliente.ocupado} onGuardar={(claves) => void fichaCliente.guardar(claves)} onCerrar={fichaCliente.cerrar} />
      )}
```

- [ ] **Step 6: Estilos**

En `src/client/coordina/remolques.css`, sustituir `.rem-editor-cabecera { margin-bottom: 0.5rem; }` por:

```css
.rem-editor-cabecera {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.rem-ficha-boton { flex: none; }
/* La ventana de «Guardar en la ficha del cliente»: una casilla por cosa, con antes → después. */
.rem-ficha-dialogo { max-width: 640px; }
.rem-ficha-cambios { display: flex; flex-direction: column; gap: 8px; list-style: none; margin: 8px 0; padding: 0; }
.rem-ficha-cambios label { align-items: flex-start; cursor: pointer; display: flex; gap: 10px; }
.rem-ficha-cambios label > span { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rem-ficha-nota { color: var(--aviso-texto); font-size: 11px; font-weight: 700; }
.rem-ficha-valores { color: var(--text-muted); font-size: 12px; overflow-wrap: anywhere; }
.rem-ficha-quien { color: var(--text-muted); font-size: 12px; }
```

- [ ] **Step 7: Pruebas, aislada y capturas**

Run: `pnpm exec vitest run src/client/remolques`
Expected: PASS.

En la aislada de 4313 (si RPS responde): obtener `AR.26.04286`, poner en el primer elemento los ollaos «A medida» con tres posiciones por lado, pulsar «Guardar en la ficha del cliente»: la medida sale marcada y «nueva», lo habitual desmarcado; guardar; `GET /api/remolques/clientes` tiene la medida y el historial «Desde el pedido AR.26.04286» con «IVÁN». Limpiar y volver a obtener: los ollaos salen a medida con esas posiciones y la marca. Sin «Soy» el botón está desactivado con su explicación. Capturas en claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/remolques-clientes/` (`boton-*`, `ventana-*`); mirarlas (la cabecera del editor con el botón no empuja nada a 1280).

- [ ] **Step 8: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS y build terminado.

```bash
git add src/client/remolques/guardarEnFicha.ts src/client/remolques/guardarEnFicha.test.ts src/client/remolques/useGuardarEnFicha.ts src/client/remolques/GuardarEnFicha.tsx src/client/remolques/GuardarEnFicha.test.tsx src/client/remolques/RemolquesView.tsx src/client/coordina/remolques.css
git commit -m "feat(remolques): «Guardar en la ficha del cliente»

Cada elemento de un pedido con cliente de RPS puede guardar en su ficha
lo que tiene distinto: la medida con sus ollaos a medida (marcada, nueva
o actualizando la de antes) y lo habitual (desmarcado, con el valor de
antes y el nuevo). Si el cliente no tiene ficha, la crea. Queda en el
historial con el «Soy» y el pedido, para que la base se llene con el
trabajo diario.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: e2e, otras e2e igual y documentación

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (≈ 3 min por vuelta de la e2e; si falla, el arreglo va en la tarea que toca).

**Files:**
- Create: `scripts/test-remolques-clientes-e2e.mjs`
- Modify: `README.md`, `.env.example`, `.env.production.example`, `.claude/skills/running-toldos-testar/SKILL.md`, `docs/modelos/dudas-abiertas.md`

**Interfaces:**
- Consumes: todo lo anterior; `BASE_URL`, `openApp` (`drive.mjs`); `editor`, `elegir`, `filaOllaos`, `CLAVES_OLLAOS` (`scripts/lib/remolques-e2e.mjs`); `DEFAULT_PARAMS`.
- Produces: `scripts/test-remolques-clientes-e2e.mjs`.

- [ ] **Step 1: Escribir la e2e**

Crear `scripts/test-remolques-clientes-e2e.mjs`:

```js
// Prueba e2e de las fichas de cliente de remolques (fase 3, diseño 01/10/2026): las fichas de partida
// salen de los parámetros y los generales se quedan con GENERAL; la hoja Parámetros › Remolques ›
// Clientes (crear una ficha y guardarla con quién y motivo); obtener un pedido real de RPS de un
// cliente con ficha (rellena y marca «del cliente», cambiar quita la marca); guardar una medida con
// sus ollaos con «Guardar en la ficha del cliente» y volver a obtenerlo (ollaos a medida); y la
// sugerencia por nombre («Añadir el código y aplicar»). Si RPS no responde, esa parte se anota
// (SALTADO) y se sigue.
// Va en su propia aislada, porque borra y cambia las fichas de su carpeta:
//   ISOLATED_DIR="$PWD/tmp/clientes" PORT=4313 FAKE_COORDINA_PORT=4323 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4313 node scripts/test-remolques-clientes-e2e.mjs
// Capturas en tmp/ui-audit/remolques-clientes/ (claro y oscuro, 1280×720 y 1600×1000).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { DEFAULT_PARAMS } from '../src/remolques/calc/params.ts';
import { CLAVES_OLLAOS, editor, elegir, filaOllaos } from './lib/remolques-e2e.mjs';

const FICHERO = path.resolve('tmp/clientes/remolques-clientes.json');
const SALIDA = 'tmp/ui-audit/remolques-clientes';
const PEDIDO_RPS = 'AR.26.04286'; // pedido real de remolques (3 líneas de lona), solo lectura
fs.mkdirSync(SALIDA, { recursive: true });
assert.equal(new URL(BASE_URL).port, '4313', 'esta prueba va en su aislada de 4313: borra y cambia las fichas');

const enviar = (method, datos) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos ?? {}) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}
async function guardarFichas(cambiar, reason) {
  const { datos } = await api('/api/remolques/clientes');
  const r = await api('/api/remolques/clientes', enviar('PUT', { baseVersion: datos.version, fichas: cambiar(datos.fichas), updatedBy: 'IVÁN', reason }));
  assert.equal(r.status, 200, `guardar fichas: ${JSON.stringify(r.datos)}`);
  return r.datos;
}
async function capturas(page, nombre) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['light', 'dark']) {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
      await page.screenshot({ path: `${SALIDA}/${nombre}-${width}-${tema === 'light' ? 'claro' : 'oscuro'}.png` });
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.setViewportSize({ width: 1600, height: 1000 });
}

// ── 1. Paso de lo que hay: sin fichero, la primera lectura crea las fichas de partida ──
for (const f of [FICHERO, FICHERO.replace(/\.json$/, '-history.jsonl')]) fs.rmSync(f, { force: true });
const inicio = (await api('/api/remolques/clientes')).datos;
assert.deepEqual(inicio.fichas.map((f) => f.nombre), ['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']);
assert.deepEqual(inicio.fichas[0].codigosRps, ['001300']);
assert.equal(inicio.fichas[0].recogidaPropia.nombre, 'PUENTES HIJOS DE PEDRO LOPEZ');
assert.ok(fs.existsSync(FICHERO), 'las fichas de partida se guardan en tmp/clientes');
const generales = (await api('/api/remolques/parametros?detalle=1')).datos.parameters;
assert.deepEqual(generales.clientesBaqueton.map((c) => c.nombre), ['GENERAL']);
assert.ok(!generales.recogidas.some((r) => r.nombre === 'PUENTES HIJOS DE PEDRO LOPEZ'));
const efectivos = (await api('/api/remolques/parametros')).datos;
assert.deepEqual(efectivos.clientesBaqueton, DEFAULT_PARAMS.clientesBaqueton, 'con las fichas de partida, se calcula como antes');
assert.deepEqual(efectivos.recogidas, DEFAULT_PARAMS.recogidas);
console.log('OK: fichas de partida y parámetros generales sin clientes');

const app = await openApp({ width: 1600, height: 1000 });
const { page } = app;
page.setDefaultTimeout(20000);
const inesperadas = [];
page.on('response', (r) => {
  const { pathname } = new URL(r.url());
  if (!pathname.startsWith('/api/') || r.status() < 400) return;
  if (/^\/api\/(remolques\/(rps-pedido|materiales)|coordina)/.test(pathname)) return;
  inesperadas.push(`${r.status()} ${r.request().method()} ${pathname}`);
});
const dialogo = () => page.getByRole('alertdialog');

try {
  // ── 2. Parámetros › Remolques › Clientes ──
  await page.getByRole('button', { name: 'Parámetros', exact: true }).click();
  await page.locator('[data-model="REMOLQUES-CLIENTES"]').click();
  const lista = page.getByRole('navigation', { name: 'Fichas de cliente' });
  for (const nombre of ['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']) await lista.getByRole('button', { name: new RegExp(`^${nombre}`) }).waitFor();
  await page.locator('[aria-label="Ficha de HIJOS DE PEDRO LOPEZ"]').waitFor();
  await capturas(page, 'clientes-hpl');
  await lista.getByRole('button', { name: 'Añadir ficha' }).click();
  const nueva = page.locator('section.clientes-remolques-ficha');
  await nueva.getByLabel('Nombre', { exact: true }).fill('PRUEBA PANTALLA');
  await nueva.getByLabel('Códigos de RPS').fill('999991');
  await nueva.getByLabel('Códigos de RPS').blur();
  await page.getByRole('button', { name: 'Guardar para todos' }).click();
  const guardar = page.getByRole('dialog');
  await guardar.getByText('Quién hace el cambio').click();
  await page.getByRole('option', { name: /IV[AÁ]N/ }).first().click();
  await guardar.getByLabel('Motivo').fill('Prueba e2e');
  await guardar.getByRole('button', { name: 'Guardar para todos' }).click();
  await page.getByText('Parámetros guardados').first().waitFor();
  const trasPantalla = (await api('/api/remolques/clientes')).datos;
  assert.ok(trasPantalla.fichas.some((f) => f.nombre === 'PRUEBA PANTALLA' && f.codigosRps.includes('999991')), 'la ficha nueva se guarda');
  assert.equal(trasPantalla.updatedBy, 'IVÁN');
  console.log('OK: la hoja Clientes lista, crea y guarda fichas con quién y motivo');

  // ── 3. Obtener un pedido de un cliente con ficha ──
  const rps = await api(`/api/remolques/rps-pedido?numero=${PEDIDO_RPS}`);
  const pedido = rps.status === 200 ? rps.datos.pedido : null;
  if (!pedido?.cliente?.codigo || !pedido.lineas.length) {
    console.log('SALTADO: RPS no responde en la aislada; sin «Obtener datos», el botón ni la sugerencia');
  } else {
    const { codigo, nombre, alias } = pedido.cliente;
    const propia = (await api('/api/remolques/clientes')).datos.fichas.find((f) => f.codigosRps.includes(codigo));
    const id = propia?.id ?? 'prueba-e2e';
    const nombreFicha = propia?.nombre ?? `PRUEBA ${codigo}`;
    await guardarFichas((fichas) => {
      const base = propia ?? { id, nombre: nombreFicha, codigosRps: [codigo] };
      const ficha = { ...base, perfil: { tipoPerfil: 'TIPO 02', aguas: 20 }, recogeDelante: 'GOMA', recogeAtras: 'GOMA', observaciones: ['OBSERVACIÓN FIJA DE PRUEBA'], medidas: [] };
      return propia ? fichas.map((f) => (f.id === id ? ficha : f)) : [...fichas, ficha];
    }, 'Prueba e2e: ficha del pedido');

    const obtener = async () => {
      await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).click();
      await page.getByRole('button', { name: /^Remolques/ }).click();
      if (await page.locator('.rem-pestana').count()) {
        await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
        await dialogo().getByRole('button', { name: 'Limpiar formulario' }).click();
      }
      await page.getByLabel('Pedido', { exact: true }).fill(PEDIDO_RPS);
      await page.locator('.rem-cabecera').getByRole('button', { name: 'Obtener datos del pedido', exact: true }).click();
    };
    await obtener();
    await editor(page).waitFor();
    const ed = editor(page);
    await ed.locator('.rem-del-cliente').first().waitFor();
    assert.ok(await ed.locator('.rem-del-cliente').count() >= 4, 'perfil, recogidas y observaciones llevan «del cliente»');
    await ed.locator('.rem-nota-ficha', { hasText: nombreFicha }).waitFor();
    await capturas(page, 'obtener-con-ficha');
    const antes = await ed.locator('.rem-del-cliente').count();
    await elegir(page, ed, 'recogeDelante', 'No');
    assert.equal(await ed.locator('.rem-del-cliente').count(), antes - 1, 'cambiar un campo le quita la marca');
    console.log('OK: obtener el pedido aplica la ficha con la marca «del cliente»');

    // ── 4. «Guardar en la ficha del cliente» con la medida y sus ollaos ──
    await elegir(page, ed, 'modoOllaos', 'A medida');
    const linea = pedido.lineas[0];
    const posiciones = { laterales: [2.5, Math.round(linea.largo / 2), linea.largo - 1.5], atras: [2.5, Math.round(linea.ancho / 2), linea.ancho - 1.5], delante: [2.5, Math.round(linea.ancho / 2), linea.ancho - 1.5] };
    for (const [rotulo, clave] of CLAVES_OLLAOS) {
      const fila = filaOllaos(page, ed, rotulo);
      for (let n = 0; n < 3; n++) await fila.locator('input').nth(n).fill(String(posiciones[clave][n]).replace('.', ','));
    }
    await ed.getByRole('button', { name: 'Guardar en la ficha del cliente' }).click();
    const ventana = page.getByRole('dialog', { name: new RegExp(`ficha de ${nombreFicha}`) });
    await ventana.waitFor();
    const casillaMedida = ventana.getByRole('checkbox', { name: /^Medida/ });
    assert.ok(await casillaMedida.isChecked(), 'la medida con sus ollaos sale marcada');
    await capturas(page, 'ventana');
    await ventana.getByRole('button', { name: 'Guardar en la ficha' }).click();
    await page.getByText(`Guardado en la ficha de ${nombreFicha}.`).waitFor();
    const conMedida = (await api('/api/remolques/clientes')).datos;
    const medida = conMedida.fichas.find((f) => f.id === id).medidas.find((m) => m.largo === linea.largo && m.ancho === linea.ancho);
    assert.deepEqual(medida?.ollaos, posiciones, 'la ficha guarda la medida con sus ollaos tal cual');
    assert.equal(conMedida.reason, `Desde el pedido ${PEDIDO_RPS}`);
    await obtener();
    await editor(page).waitFor();
    const valores = await filaOllaos(page, editor(page), 'DELANTE ·').locator('input').evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
    assert.deepEqual(valores.map((v) => Number(v.replace(',', '.'))), posiciones.delante, 'al volver a obtenerlo, los ollaos salen a medida con sus posiciones');
    console.log('OK: «Guardar en la ficha del cliente» y volver a obtener el pedido');

    // ── 5. Sugerencia por nombre ──
    const parecido = (alias || nombre).trim();
    await guardarFichas((fichas) => fichas.map((f) => (f.id === id ? { ...f, nombre: parecido, codigosRps: f.codigosRps.filter((c) => c !== codigo) } : f)), 'Prueba e2e: sin código');
    await obtener();
    await dialogo().getByText(`¿Es de la ficha ${parecido}?`).waitFor();
    await capturas(page, 'sugerencia');
    await dialogo().getByRole('button', { name: 'Añadir el código y aplicar' }).click();
    await editor(page).locator('.rem-del-cliente').first().waitFor();
    const trasSugerencia = (await api('/api/remolques/clientes')).datos;
    assert.ok(trasSugerencia.fichas.find((f) => f.id === id).codigosRps.includes(codigo), 'el código se añade a la ficha');
    assert.equal(trasSugerencia.reason, `Código añadido desde el pedido ${pedido.numero}`);
    console.log('OK: la sugerencia por nombre añade el código y aplica la ficha');
  }
  assert.deepEqual(inesperadas, [], `respuestas de error inesperadas: ${inesperadas.join(', ')}`);
  assert.deepEqual(app.errors, [], `errores de la página: ${app.errors.join(' | ')}`);
} finally {
  await app.browser.close();
}
console.log('OK: fichas de cliente de remolques de punta a punta');
```

Notas: el selector de «Quién hace el cambio» de `ParametersSaveBar` es un `SelectField` (botón y opciones con `role=option`); si el `getByText(...).click()` no lo abre, usar el patrón de `scripts/test-parameter-consultation.mjs`. Si la cabecera de Remolques tiene otro texto para «Limpiar», mirar `App.tsx` (botón `clear-form-button`). Los `errors` de `openApp` incluyen los `console.error` de la página: si RPS no responde, filtrarlos como hace `test-remolques-2a-e2e.mjs`.

- [ ] **Step 2: Ejecutar la e2e y las de remolques de siempre**

Arrancar la aislada de 4313 en segundo plano y esperar a `/api/health`. Luego (≈ 3 min en total; avisar a Iván del tiempo):

Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4313 node scripts/test-remolques-clientes-e2e.mjs`
Expected: las líneas `OK: …` de cada parte (o `SALTADO: RPS no responde…` en las 3–5) y `OK: fichas de cliente de remolques de punta a punta`.

Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4313 node scripts/test-remolques-2a-e2e.mjs && TOLDOS_ISOLATED_URL=http://127.0.0.1:4313 node scripts/test-remolques-4-e2e.mjs`
Expected: pasan sin cambiarlas (los parámetros efectivos son los de siempre: HPL, AYALA y la recogida de puentes siguen en los desplegables).

Run: `node scripts/test-remolques-5-e2e.mjs` y `node scripts/test-borradores-e2e.mjs`, cada una en la aislada que dice su cabecera.
Expected: pasan sin cambiarlas.

Mirar todas las capturas de `tmp/ui-audit/remolques-clientes/`.

- [ ] **Step 3: Documentación**

En `README.md`, en la sección de configuración donde está `RULE_PARAMETERS_FILE`, añadir debajo:

```
REMOLQUES_CLIENTES_FILE=/var/lib/toldos-testar/remolques-clientes.json
```

y en la parte de Remolques (o, si no hay, después de «## Flujo de revisión»):

```md
### Fichas de cliente de remolques

En Parámetros › Remolques › Clientes hay una ficha por cliente real, con sus códigos de RPS y lo
habitual (perfil, recogidas y su recogida propia, ventana, rotulación, material, sesgo detrás,
cremallera del 9, extras de baquetón, observaciones fijas y medidas habituales con sus ollaos). Al
obtener un pedido de RPS de uno de sus códigos, los campos vacíos se rellenan con la ficha y llevan la
marca «del cliente»; si el largo × ancho coincide con una medida habitual, los ollaos salen a medida.
«Guardar en la ficha del cliente», en cada elemento, guarda lo que tiene distinto. Las fichas viven en
`REMOLQUES_CLIENTES_FILE` (por defecto, junto a los parámetros de remolques) con versión e historial;
la primera vez se crean solas con lo que había por cliente en los parámetros.
```

En `.env.example` y `.env.production.example`, junto a `REMOLQUES_PARAMETERS_FILE` (o a `RULE_PARAMETERS_FILE` si esa no está):

```
# Fichas de cliente de remolques (fase 3). Por defecto, junto a remolques-parameters.json.
# REMOLQUES_CLIENTES_FILE=/var/lib/toldos-testar/remolques-clientes.json
```

En `.claude/skills/running-toldos-testar/SKILL.md`, en la lista de carpetas de la aislada:

```md
- Las fichas de cliente de remolques son `$D/remolques-clientes.json` (se crean solas la primera vez;
  borrarlas las vuelve a crear). La e2e de las fichas usa su propia aislada:
  `ISOLATED_DIR="$PWD/tmp/clientes" PORT=4313 FAKE_COORDINA_PORT=4323`.
```

En `docs/modelos/dudas-abiertas.md`, en «## Remolques», después de Q-R04:

```md
- **AYALA en RPS: ¿es el cliente 036662 «REMOLQUES AYALA», el 048286 «ENGANCHES Y REMOLQUES AYALA S.L.U» o los dos?** Su ficha lleva los dos hasta saberlo. Importa para que sus pedidos tomen la ficha solos. <sub>Q-R06</sub>
```

(Si Q-R06 ya existe, usar el siguiente número libre.)

- [ ] **Step 4: Batería completa**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS (también la paridad de remolques), sin errores y build terminado.

- [ ] **Step 5: Commit y subida**

```bash
git add scripts/test-remolques-clientes-e2e.mjs README.md .env.example .env.production.example .claude/skills/running-toldos-testar/SKILL.md docs/modelos/dudas-abiertas.md
git commit -m "test(remolques): e2e de las fichas de cliente y su documentación

Las fichas de partida y los parámetros generales sin clientes, la hoja
Clientes, obtener un pedido de un cliente con ficha (rellena y marca),
guardar una medida con sus ollaos desde el pedido y volver a obtenerlo,
y la sugerencia por nombre. Las e2e de remolques de antes siguen igual.
La duda del código de AYALA queda anotada.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git pull --rebase
git push origin main
```

---

## Después del plan

- Revisión final de toda la rama con el modelo más capaz (Opus, esfuerzo alto): que los parámetros efectivos con las fichas de partida son exactamente los de antes (y que ninguna ruta calcula con los generales a secas), la siembra (una sola vez, y con los parámetros del servidor), que «Obtener datos» con la pregunta de la ficha no pisa una consulta nueva ni la pregunta de sustituir o añadir, y que la paridad no se ha tocado.
- **Antes de desplegar, Iván confirma el código de AYALA** y quien coordina deja en `CODIGOS_RPS_SEMILLA` solo el que sea (o los dos). Después de desplegar ya se cambia en la hoja Clientes.
- Para Iván, al desplegar (en una línea): `pnpm install && pnpm build && pnpm deploy:check && pnpm pm2:reload`. Las fichas se crean solas al arrancar en `/var/lib/toldos-testar/remolques-clientes.json` con los extras y la recogida de puentes que haya en sus parámetros; conviene abrir Parámetros › Remolques › Clientes, comprobarlas y poner a HIJOS DE PEDRO LOPEZ su sesgo detrás (+1,5 cm) y sus recogidas habituales, que la semilla no inventa.

## Cobertura del spec

| Spec | Tarea |
| --- | --- |
| Decisión 1: lo que está por cliente en Parámetros (clientes de baquetón y la recogida de puentes de HPL) pasa a sus fichas; en Parámetros quedan GENERAL y las recogidas normales | 1, 3, 5 |
| Decisión 2: una ficha por cliente real con uno o varios códigos; un código en una sola ficha; sugerencia por nombre y «con un clic se añade» | 1, 3, 6 |
| Decisión 3: «Guardar en la ficha del cliente» con casillas: la medida con sus ollaos marcada, lo demás desmarcado | 2, 7 |
| 1. La ficha en Parámetros › Remolques › Clientes, con las piezas de Parámetros, claro y oscuro: nombre, códigos, trabajo, perfil y medidas, recogidas (de la tabla o la propia con paño trasero), bastilla, ventana con medidas, rotulación, material, sesgo detrás, cremallera, extras de baquetón con observaciones, observaciones fijas por líneas, medidas habituales con ollaos por lado tal cual | 1, 4 |
| 2. Paso de lo que hay: fichas creadas una vez desde los parámetros actuales (HPL con extras y recogida propia, AYALA, GENERAL WOLDER), códigos buscados en RPS y confirmados por Iván (sin código, la sugerencia la encuentra); después solo GENERAL y recogidas normales; lo guardado y la paridad no cambian | 1, 3, 5, Después del plan |
| 3. Guardado: JSON junto a los parámetros, `REMOLQUES_CLIENTES_FILE`, común a todos, versión (409), historial con «Quién hace el cambio» y «Motivo», validación; rutas GET/PUT `/api/remolques/clientes`, GET historial y POST desde-pedido | 3, 4 |
| 4. Al obtener de RPS: por código, los vacíos se rellenan y llevan «del cliente»; medida exacta → ollaos «Según se indica»; observaciones fijas añadidas; lo que el técnico cambia manda; sin código y nombre parecido: «¿Es de la ficha …?» → «Añadir el código y aplicar» (con «Soy» y «Código añadido desde el pedido AR…») / «No»; abrir un borrador o «Corregir» no la vuelve a aplicar | 2, 6 |
| 5. «Guardar en la ficha del cliente» en cada elemento (pedido con cliente de RPS): medida marcada («nueva» / «actualiza la de antes»), lo habitual desmarcado con antes y después; crea la ficha si no hay; historial con «Soy» y «Desde el pedido AR…» | 2, 3, 7 |
| Pruebas: unitarias de almacén y validación (versión, 409, historial, código en dos fichas), aplicar (solo vacío, medida exacta, observaciones, marca), sugerencia, diferencias, paso de los clientes de baquetón; paridad sin cambios; e2e (obtener con ficha, guardar medida, volver a obtener, sugerencia, pantalla Clientes) | 1, 2, 3, 4, 6, 8 |
