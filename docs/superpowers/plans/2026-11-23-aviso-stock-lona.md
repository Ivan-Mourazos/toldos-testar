# Aviso de falta de material (stock de lona): plan de implementación

> **Para agentes:** sigue el plan tarea a tarea, con TDD. Los pasos usan casillas (`- [ ]`). Diseño: `docs/superpowers/specs/2026-11-23-aviso-stock-lona-design.md` (léelo entero antes de empezar).

**Objetivo:** al pulsar «Generar archivos» en Planteamientos, avisar en pantalla de las lonas sin stock suficiente en RPS y dejarlo apuntado en CoordinaOT. Al pasar el pedido a producción en CoordinaOT se ofrece una casilla, marcada por defecto, para mandar el correo «Falta material» a Compras y Almacén.

**Arquitectura:** Planteamientos (toldos-testar, Express) calcula ML por lona con las listas de materiales que ya existen. Consulta el stock RPS **antes** de los pasos de producción, porque esos pasos hacen las reservas, y hace un POST del resultado a CoordinaOT. CoordinaOT (coordina-ot, Next.js + SQLite) guarda la última comprobación por pedido, la enseña en el diálogo de pasar y encola el correo en la cola que ya existe (`planteamiento_correo`), con una columna `tipo` nueva.

**Stack:** Node/Express + Vitest + React (toldos-testar, pnpm); Next.js + better-sqlite3 + Vitest (coordina-ot).

## Restricciones globales

- Textos de la interfaz y del correo en castellano, mayúscula solo inicial (salvo siglas y la píldora «FALTA MATERIAL»).
- Nunca bloquear «Generar archivos» ni el paso a producción por el stock o por CoordinaOT: los fallos solo dan avisos.
- Regla: **no llega** si `disponible < necesita`. Lonas sin código RPS válido (`/^[A-Z0-9._/-]{1,40}$/`) no se comprueban.
- Correo: asunto `Falta material {pedido} · {cliente}` (sin cliente: `Falta material {pedido}`); HTML como la maqueta `toldos-testar/tmp/correo-stock-ejemplo.html`; números con formato español y 2 decimales (`42,30 m`).
- Destinatarios: `off` no encola; `ensayo` solo `CORREO_ENSAYO_PARA`; `activo` Para `CORREO_STOCK_PARA` (por defecto `compras@toldosgomez.com, almacen@toldosgomez.com`), CC `CORREO_PARA` + correo del operario que pasa el pedido, sin repetir ninguno de Para.
- No commits, push ni despliegues sin que Iván lo pida. Tests con `--maxWorkers=6`.

---

## Parte A: Planteamientos (toldos-testar)

### Tarea A1: necesidades y faltas (funciones puras)

**Archivos:**
- Crear: `src/stockLona.js`
- Test: `src/stockLona.test.js`

**Interfaces producidas:**
```js
/** @typedef {{ of: string, codigo: string, descripcion?: string, ml: number }} LineaLona */
/** @typedef {{ codigo: string, descripcion: string, ml: number, porOf: Record<string, number> }} NecesidadLona */
/** @typedef {{ codigo: string, descripcion: string, necesita: number, disponible: number }} FaltaLona */
export function necesidadesLona(lineas /* LineaLona[] */) /* NecesidadLona[] */
export function faltasLona(necesidades /* NecesidadLona[] */, stock /* {code, disponible}[] de fabricStock.getStock */) /* FaltaLona[] */
export function lineasLonaToldos(materiales /* materialesReserva(...) */) /* LineaLona[] — solo códigos que resolveFabric reconoce como tela; descripcion = nombre de la tela */
export function lineasLonaRemolques(pedido, materialesCatalogo /* lista con nombre y codigoBobina */) /* LineaLona[] — metrosTela por OF; código desde codigoBobina */
export function textoAvisoStock(faltas /* FaltaLona[] */) /* string[] — una línea por lona + la final */
```

- [ ] **Paso 1: tests que fallan.** Casos mínimos:
  - `necesidadesLona` suma por código y reparte `porOf` (dos OF con la misma lona, una con otra), ignora `ml <= 0` y códigos no válidos, redondea a 2 decimales;
  - `faltasLona`: necesita 42.3 / disponible 18.75 → falta; disponible igual a necesita → no falta; código sin stock en la respuesta → disponible 0 y falta;
  - `lineasLonaToldos` deja fuera herrajes (códigos que no son tela del catálogo); usa un código de tela real de `src/domain/fabricCatalog.js`;
  - `lineasLonaRemolques` saca el código de `codigoBobina` y descarta «Sin material» y materiales escritos a mano;
  - `textoAvisoStock([{codigo:'LV6002G', descripcion:'Lona PVC 680 g gris', necesita:42.3, disponible:18.75}])` → `['No llega el stock de LV6002G Lona PVC 680 g gris: necesita 42,30 m, disponible 18,75 m.', 'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.']`; sin faltas → `[]`.
- [ ] **Paso 2:** `pnpm vitest run src/stockLona.test.js` → falla.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** el test pasa.

### Tarea A2: líneas de lona de puertas

**Archivos:** modificar `src/stockLona.js` y su test; leer `src/puertas/flujo/servicio.ts` (los ML por OF del cajetín, de `generarCortePuertas`).

**Interfaz:** `export function lineasLonaPuertas(resultadoCorte) /* LineaLona[] */`. Los ML de lona por OF y material son los mismos que salen en el cajetín. Busca dónde se calculan (memoria del proyecto: «ML por OF en puertas», solo apilables, enrollables y autorreparables) y reutilízalos, sin duplicar el cálculo. Código RPS del material: el mismo mecanismo que en remolques. Si un material no tiene código válido, se omite.

- [ ] Test con un pedido fixture de puertas que ya exista en los tests de `src/puertas` → falla → implementar → pasa.

### Tarea A3: comprobar al generar y avisar a CoordinaOT

**Archivos:**
- Crear: `src/stockLonaProduccion.js` y `src/stockLonaProduccion.test.js`
- Modificar: `src/coordinaStatus.js` (método nuevo), `src/server.js` (ruta `/api/reviews/:orderCode/produccion`, ~línea 1644), `src/remolques/flujo/servicio.ts` (`produccion`, ~línea 661), `src/puertas/flujo/servicio.ts` (`produccion`), y sus dependencias inyectadas.

**Interfaces:**
```js
// coordinaStatus.js: en el objeto que devuelve createCoordinaClient
async enviarStockLona(datos) /* { ok: boolean, motivo?: string } — POST `${base}/api/integracion/stock-lona`, cabecera X-Clave-Integracion, timeout 4 s, nunca lanza */

// stockLonaProduccion.js
export async function comprobarStockLona({ pedido, cliente, ofs, lineas, consultadoPor, stock /* { getStock, reset } */, coordina, now = () => new Date() })
// → { consultado: string|null, faltas: FaltaLona[], avisos: string[] }
//   avisos = textoAvisoStock(faltas), más 'No se pudo comprobar el stock de lona.' si getStock lanza,
//   o 'No se pudo avisar a CoordinaOT del stock de lona.' si enviarStockLona da ok:false.
//   Llama a stock.reset() antes de getStock (dato fresco). Con lineas vacías no consulta ni envía nada.
//   El POST lleva: { pedido, cliente, ofs, lonas: NecesidadLona[], faltas, consultado, consultadoPor }.
```

**Orden obligatorio:** `comprobarStockLona` se llama **antes** de `pasarAProduccion(...)`, porque el paso «PDF y reservas de RPS» reserva la lona. El resultado se fusiona en la respuesta de `pasarAProduccion` solo si es 200: `cuerpo.stockLona = { consultado, faltas }` y `cuerpo.avisos = [...avisosStock, ...cuerpo.avisos]`. El POST a CoordinaOT se hace después de un 200; si `pasarAProduccion` devuelve una pregunta (409/sobrescribir) o un error, no se envía nada.

- toldos: líneas de `lineasLonaToldos(materialesReserva(reserva))`. La reserva se construye igual que en `server.js` ~1514; extrae la construcción a una función si hace falta, sin cambiar lo que hace.
- remolques: `lineasLonaRemolques(pedidoEntrega(pedido), materiales)`.
- puertas: `lineasLonaPuertas(generarCortePuertas(...))`.
- `consultadoPor` = `savedBy` del cuerpo.

- [ ] **Paso 1: tests de `comprobarStockLona`** con dobles de `stock` y `coordina`: con faltas (avisos + POST con datos), sin faltas (POST con `faltas: []`, sin avisos), `getStock` lanza (aviso, sin POST), `enviarStockLona` ok:false (aviso), líneas vacías (nada).
- [ ] **Paso 2: test de `enviarStockLona`** con `fetchImpl` falso: URL, cabecera, cuerpo JSON; sin url/clave → `{ok:false}` sin llamar; 500 → `{ok:false}`.
- [ ] **Paso 3: test de integración** de la ruta de producción de remolques (o la que tenga ya tests de `produccion`): la respuesta lleva `stockLona` y los avisos, y el stock se consulta antes del primer `preparar`.
- [ ] **Paso 4:** implementar y pasar los tests.

### Tarea A4: aviso en pantalla

**Archivos:** el cliente que muestra el resultado de «Generar archivos»: busca dónde se pintan `cuerpo.avisos` tras `/produccion` (`src/client/components/AccionesPedido.tsx` y los detalles de remolques y puertas).

- [ ] Si `stockLona.faltas.length > 0`, aviso ámbar (el tono de aviso que ya usa la web) con las líneas de `textoAvisoStock`, la primera en negrita. Si los avisos genéricos ya salen en ámbar, basta con que las líneas vayan primero y no se repitan.
- [ ] Test de render con `stockLona` con faltas → aparece el texto; sin faltas → no aparece.
- [ ] `pnpm vitest run --maxWorkers=6`, `pnpm lint` y `pnpm tsc --noEmit` (o los scripts de `package.json`) en verde.

---

## Parte B: CoordinaOT (coordina-ot)

### Tarea B1: tabla y ruta de entrada

**Archivos:**
- Modificar: `src/lib/server/estado-db.ts` (migración: tabla `stock_lona` y columna `tipo` en `planteamiento_correo`)
- Crear: `src/lib/server/stock-lona-db.ts`, `src/app/api/integracion/stock-lona/route.ts`
- Test: `src/lib/__tests__/stock-lona-db.test.ts`, `src/lib/__tests__/stock-lona-route.test.ts`

**Esquema:**
```sql
CREATE TABLE IF NOT EXISTS stock_lona (
  pedido_id TEXT PRIMARY KEY,
  datos TEXT NOT NULL,            -- JSON: { cliente, ofs, lonas, faltas }
  consultado TEXT NOT NULL,
  consultado_por TEXT,
  recibido_at TEXT NOT NULL
);
-- planteamiento_correo: ALTER TABLE ... ADD COLUMN tipo TEXT NOT NULL DEFAULT 'planteamiento' (solo si no existe, como las demás migraciones del fichero)
```

**Interfaces:**
```ts
export interface FaltaLona { codigo: string; descripcion: string; necesita: number; disponible: number }
export interface StockLona { pedido: string; cliente: string; ofs: string[]; faltas: FaltaLona[]; consultado: string; consultadoPor: string | null; recibidoAt: string }
export function guardarStockLona(s: Omit<StockLona, "recibidoAt">, ahora?: Date): void   // reemplaza la anterior
export function leerStockLona(pedido: string): StockLona | null
export function validarStockLona(body: unknown): Omit<StockLona, "recibidoAt"> | null    // pedido normalizado como en el resto; números finitos >= 0; máx. 50 lonas; textos recortados
```

Ruta `POST`: la misma comprobación de clave que `GET /api/integracion/ofs` (503 sin `INTEGRACION_CLAVE`, 401 si no coincide), 400 si `validarStockLona` da null, 200 `{ ok: true }`. Sin caché.

- [ ] Tests: guardar/leer/reemplazar; validación (falta pedido, número negativo, demasiadas lonas); ruta 503/401/400/200.
- [ ] Todas las lecturas existentes de `planteamiento_correo` (`leerCorreosDe`, `reenviarUltimo`, la vista del pase) filtran `tipo = 'planteamiento'`. Test: un correo `stock` no aparece en `leerCorreosDe` ni se reenvía con «Reenviar»; `correosParaEnviar` sí lo manda.

### Tarea B2: el correo «Falta material»

**Archivos:** crear `src/lib/correo-stock.ts` y `src/lib/__tests__/correo-stock.test.ts`; modificar `src/lib/server/correo-cola.ts`.

**Interfaces:**
```ts
// correo-stock.ts (puro)
export function asuntoCorreoStock(pedido: string, cliente: string): string
export function cuerpoCorreoStock(s: StockLona, consultadoPorNombre: string): string      // texto plano
export function cuerpoCorreoStockHtml(s: StockLona, consultadoPorNombre: string): string  // HTML de la maqueta; reutiliza la paleta C y esc() de correo-planteamiento.ts (expórtalas si hace falta)
// correo-cola.ts
export function destinatariosStock(modo: ModoCorreo): string[]
export function prepararCorreoStock(pedido: string, operarioId: string, ahora?: Date): { encolado: boolean; aviso: string | null }
export function ultimoCorreoStock(pedido: string): { enviadoAt: string | null; creadoAt: string; pasadoPor: string | null } | null
```

`prepararCorreoStock` lee `leerStockLona`. Sin faltas o con modo `off` no encola. Si no, inserta con `tipo='stock'`, `ficheros='[]'` y CC `copiasCorreo(modo, [operarioId], para)` (comprueba que eso pone `CORREO_PARA` más el operario; si no, construye el CC según las restricciones globales). El HTML: píldora roja `FALTA MATERIAL`, pedido, cliente, una tarjeta por falta («No llega el stock de **{código}** {descripción}», Necesita / Stock disponible en rojo) y el pie «Stock consultado dd/mm/aaaa hh:mm» y «Por {nombre}». Hora de Madrid.

- [ ] Tests: asunto con y sin cliente; el HTML contiene `FALTA MATERIAL`, los códigos, `42,30 m` y `18,75 m`, la fecha y el nombre, y escapa `<` en la descripción; destinatarios por modo; no encola sin faltas; encola con `tipo='stock'`.

### Tarea B3: casilla en el diálogo de pasar

**Archivos:** `src/lib/server/mandar-planteamiento.ts` (`lanzarPlanteamiento`: opción nueva `correoStock`), las rutas que lo llaman (`src/app/api/estado/route.ts`, `src/app/api/fases/cerrar-of/route.ts`: solo pasar la opción), la ruta que da los datos del diálogo (`src/app/api/planteamiento/route.ts` GET: añadir `stockLona: { faltas, consultado, consultadoPor, yaAvisado: {creadoAt, pasadoPor} | null } | null`) y el diálogo (`src/components/Board.tsx` / `PlanteamientoAlCerrar.tsx`: busca dónde sale «Se mandará el correo…»).

- [ ] Con `stockLona.faltas.length > 0`: bloque ámbar «Falta material» con una línea por lona («LV6002G · necesita 42,30 m · disponible 18,75 m»). Dentro, la casilla grande «**Mandar correo a Compras y Almacén**», **marcada por defecto**, salvo si `yaAvisado` existe: entonces sale sin marcar y al lado «Ya se avisó el dd/mm a las hh:mm (Nombre)». Estilo de los componentes que ya usa CoordinaOT.
- [ ] Al pasar se envía `correoStock: true|false`. `lanzarPlanteamiento` llama a `prepararCorreoStock` solo si `correoStock === true`, sin bloquear ni romper el pase (con `.catch` como el resto).
- [ ] Tests: `lanzarPlanteamiento` con `correoStock` true/false; el GET devuelve `stockLona`; render del bloque (marcada / desmarcada con `yaAvisado`).
- [ ] `pnpm test`, lint y typecheck de coordina-ot en verde.

---

## Verificación final (Claude)

1. Revisar los diffs de los dos repos y pasar yo los tests.
2. Prueba en local, modo ensayo: un pedido con una lona sin stock → «Generar archivos» muestra el aviso; en CoordinaOT, la fila de `stock_lona` existe; al pasar, la casilla sale marcada y el correo llega solo a Iván con el aspecto de la maqueta.
3. Antes de activar: Iván confirma las direcciones de Compras y Almacén (`CORREO_STOCK_PARA`).
