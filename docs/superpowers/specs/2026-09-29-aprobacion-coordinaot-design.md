# Aprobación leída de CoordinaOT — diseño

Fecha: 29/09/2026. Aprobado por Iván en conversación el mismo día.

## Objetivo

Hoy los pedidos se aprueban o devuelven en CoordinaOT, y toldos-testar lo ignora: da
cualquier pedido guardado por «pendiente de generar» y, al pulsar «Generar archivos»,
pregunta a mano «¿Está aprobado en CoordinaOT?». Se quiere que la web de planteamientos
lea sola el estado de cada OF en CoordinaOT, lo enseñe en Pedidos y solo deje generar
cuando todo el pedido está aprobado. Generar lo sigue pulsando el autor.

Es el primer paso de la unificación con remolques: la misma pieza servirá después a los
planteamientos de remolques.

## Decisiones

- **CoordinaOT manda.** La web de planteamientos solo lee; nunca escribe en CoordinaOT
  ni tiene botones de aprobar o devolver.
- **Toldos pregunta a CoordinaOT por HTTP con una clave compartida.** Descartado leer la
  base SQLite de CoordinaOT (ata toldos a su esquema) y que CoordinaOT avise a toldos
  (se pierden avisos si toldos está reiniciándose).
- **El enlace es la OF.** Cada toldo lleva su OF (p. ej. `0230194`), la misma que usa
  CoordinaOT. No hace falta cuadrar los códigos de pedido, que cada web escribe distinto
  (`AR.26.03453` frente a `AR2603332`).
- **Si CoordinaOT no responde, no se genera** (opción A de Iván). Nunca se genera algo
  sin aprobación comprobada.
- **Generar sigue siendo manual**, del autor, en cuanto todo está aprobado.

## 1. CoordinaOT: consulta de estado de OF

Ruta nueva: `GET /api/integracion/ofs?ofs=0230194,0230195`.

- Exige la cabecera `X-Clave-Integracion` igual a la variable `INTEGRACION_CLAVE` del
  `.env.local` de CoordinaOT, comparada en tiempo constante. Sin variable configurada,
  la ruta responde 503 y no enseña nada; con clave ausente o distinta, 401.
- Acepta de 1 a 50 números de OF; cada uno debe cumplir el formato de OF de CoordinaOT.
  Fuera de eso, 400.
- Respuesta, una entrada por OF pedida:

  ```json
  { "ofs": [
    { "of": "0230194", "estado": "aprobada", "nota": "", "actualizado": "2026-09-29T08:12:00Z" },
    { "of": "0230195", "estado": "devuelta", "nota": "Falta el lado del brazo", "actualizado": "…" },
    { "of": "0230196", "estado": "sin_estado", "nota": "", "actualizado": null }
  ] }
  ```

- `estado` es uno de los de CoordinaOT (`pendiente`, `en_curso`, `por_revisar`,
  `en_revision`, `devuelta`, `aprobada`, `anulada`) o `sin_estado` si CoordinaOT no
  tiene nada de esa OF. `nota` solo trae texto si está `devuelta` (la observación de
  «Devolver con nota»).
- Solo estos campos: ni cliente, ni autor, ni revisor, ni notas internas.
- En CoordinaOT una OF puede tener varias tareas (`of_overlay.of_id` es
  `«OF»:«tarea»`). **Comprobación obligatoria al programarlo:** ver en qué tarea vive
  la revisión de oficina técnica y leer el estado de esa. Si hubiera varias con estado,
  manda la menos avanzada (una devuelta gana a una aprobada), y así queda escrito en la
  prueba.

## 2. Toldos: servidor

- Módulo `src/coordinaStatus.js`:
  - `COORDINA_URL` y `COORDINA_CLAVE` en el `.env` del servidor. Sin ellas, se trata
    como «CoordinaOT no responde».
  - Espera como máximo 4 s y guarda cada respuesta 30 s en memoria, por OF.
  - Devuelve `{ disponible: true, ofs: Map }` o `{ disponible: false, motivo }`.
- Reglas puras en `src/reviewRules.js`, compartidas con la web:
  - `coordinaGroup(awnings, estados)` → `'por_revisar' | 'devuelto' | 'aprobado'`.
    Devuelto si alguna OF está `devuelta`; aprobado si todas están `aprobada`; por
    revisar en cualquier otro caso, incluido `sin_estado` y CoordinaOT caído.
  - `generationBlock(awnings, estados)` → `null` si se puede generar, o el motivo en
    castellano llano: «Falta la OF en el toldo B», «Sin aprobar en CoordinaOT: B
    (0230195) devuelta, C (0230196) en revisión», o «No se puede comprobar la aprobación
    en CoordinaOT; inténtalo en un momento».
- `GET /api/coordina/ofs?ofs=…` reenvía la consulta para la web (la clave nunca llega al
  navegador) y responde `{ disponible, ofs }`.
- `POST /api/reviews/:orderCode/generate-files` consulta CoordinaOT **sin caché** y
  aplica `generationBlock`. Con motivo: 409, o 503 si CoordinaOT no responde, sin
  generar nada. La comprobación está en el servidor, no solo en pantalla.
- Los pedidos ya generados (`PRODUCED`) no se consultan: siguen en el historial como
  están.

## 3. Toldos: pantalla de Pedidos

- Al abrir Pedidos, y cada 60 s mientras está abierta, la web pide el estado de las OF
  de los pedidos pendientes (una sola petición con todas).
- Los grupos de pendientes salen de `coordinaGroup`:
  - **Por revisar**: alguna OF sin aprobar todavía.
  - **Devueltos**: alguna OF devuelta. La nota de CoordinaOT se ve al desplegar la
    fila, en la línea de ese toldo.
  - **Aprobados · falta generar**: todas aprobadas.
- Las marcas de cada toldo en la fila (A, B…) añaden su estado en CoordinaOT: ✓
  aprobada, ↩ devuelta, punto de «en revisión». Se mantiene el aviso de cálculo que ya
  tienen.
- Si CoordinaOT no responde: aviso en la barra de Pedidos («No se puede consultar
  CoordinaOT; los pedidos se muestran como por revisar») y todo pendiente queda en Por
  revisar.
- En el pedido abierto, «Generar archivos» solo se activa para el autor cuando
  `generationBlock` es `null`. Si no, queda apagado con el motivo escrito al lado. Se
  quita la pregunta «¿Está aprobado en CoordinaOT?»; la confirmación que queda solo
  dice qué archivos se van a guardar y dónde.

## 4. Pruebas

- **Toldos, unitarias** (vitest): `coordinaGroup` y `generationBlock` con todas las
  combinaciones (todas aprobadas, una devuelta, `sin_estado`, sin OF, CoordinaOT caído),
  y `coordinaStatus.js` con un `fetch` simulado (tiempo agotado, 401, respuesta buena,
  caché de 30 s).
- **CoordinaOT, unitarias**: sin clave → 401; sin variable → 503; formato de OF
  inválido → 400; OF con varias tareas; OF sin estado; la respuesta no trae campos de
  más.
- **Extremo a extremo** en la instancia aislada de toldos (4310) con un CoordinaOT
  simulado en otro puerto: en revisión, aprobado (se genera), devuelto (se ve la nota)
  y caído (aviso y no se genera). Capturas en claro y oscuro.

## 5. Despliegue

1. CoordinaOT primero, con `INTEGRACION_CLAVE` en su `.env.local`.
2. Toldos después, con `COORDINA_URL` (p. ej. `http://127.0.0.1:<puerto de
   CoordinaOT>`) y la misma clave en `COORDINA_CLAVE`.
3. Cada web con su línea de despliegue. Iván recibirá los pasos exactos, incluida la
   orden para generar la clave.

## Fuera de alcance

- Remolques (se integra en fases posteriores y reutilizará esta pieza).
- Generar archivos de forma automática al aprobar.
- Cualquier escritura en CoordinaOT.
