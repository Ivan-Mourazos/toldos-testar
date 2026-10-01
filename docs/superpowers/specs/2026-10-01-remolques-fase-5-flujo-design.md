# Remolques · fase 5: flujo (revisión, CoordinaOT, generar, historial, parámetros y migración) — diseño

Fecha: 01/10/2026. Hablado con Iván el 01/10/2026. Diseño general:
`2026-09-29-unificacion-remolques-design.md`. Fases anteriores: 1, 2a, 2b y 4 (hoja de taller
en PDF, `2026-09-30-remolques-fase-4-salidas-design.md`). Después: fase 3 (fichas de cliente)
y fase 6 (retirada de la web vieja).

## Objetivo

Que un pedido de remolques siga en Planteamientos TGM el mismo camino que uno de toldos:
guardar para revisión, aprobar en CoordinaOT, generar los archivos con el revisor puesto,
quedar en el historial y poder corregirse o reutilizarse; con sus Parámetros editables y con
lo que ya hay en la web vieja pasado a la nueva. Con esto la web vieja se puede retirar.

## Decisiones de Iván (01/10/2026)

1. **Pedidos juntos** (opción A): los de remolques van en la misma pestaña Pedidos que los de
   toldos, con su etiqueta y un filtro.
2. **Lo pendiente se guarda dentro de la web**, no en las carpetas compartidas. En las
   carpetas todo queda igual que con la web vieja: solo aparecen los dos PDF finales al
   generar. Sin subcarpeta `REMOLQUES` (la de `TOLDOS` existe por los Excel de antes).
3. **Se pasa todo lo de la web vieja**: los ya generados al historial; los pendientes a la
   bandeja.
4. **Parámetros de remolques en la pestaña Parámetros**, con quién y motivo, historial y
   «Restaurar valores por defecto». **Técnicos: la lista de toldos.**

## 1. Pedidos

- La bandeja de Pedidos (`OrdersInbox`) lista toldos y remolques juntos. Cada fila lleva la
  etiqueta «Toldo» o «Remolque»; un filtro «Todos / Toldos / Remolques» junto a «Todo el
  equipo / Míos». Búsqueda por pedido, cliente, OF y modelo (en remolques: el perfil).
- Mismos grupos que toldos, calculados igual con CoordinaOT (`coordinaGroup`): «Por
  revisar», «Devueltos», «Aprobados · falta generar». Solo cuentan las tareas de Oficina
  Técnica, por OF (`normalizeOf`), como en toldos. Las etiquetas por elemento (A, B…) con su
  estado, con el agrupado de muchos elementos de `collapseAwnings`.
- «Generados» por año, con los dos tipos.

## 2. Guardar para revisión

- Botón «Guardar para revisión» en Remolques, con las mismas reglas que toldos
  (`saveReviewDecision`, `reviewAuthorship`): el autor es quien guarda primero; si otro
  guarda, pasa a ser revisor; un pedido ya generado no se pisa; uno pendiente pide confirmar.
  Solo con todos los elementos completos («Falta: …» como hoy).
- Se guarda en el servidor en un almacén de remolques: un fichero JSON por pedido en la
  **carpeta interna de remolques** (nueva en Configuración, semilla de entorno
  `REMOLQUES_REVISION_DIRECTORY`; recomendado en un sitio con copia de seguridad). Contenido:
  versión del esquema, tipo `remolques`, pedido, estado, fechas, autor, revisor, nota,
  producción (fecha, quién, rutas), resumen (cliente, fecha, OF y perfiles de cada elemento)
  y los elementos completos (entrada, resultado y parámetros del momento), como el
  `PlanteamientoRecord` de la web vieja.
- Estados: los de toldos (`PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `PRODUCED`).
- Al guardar se borran los borradores del navegador de ese pedido.

## 3. Abrir, corregir y reutilizar

- En el detalle del pedido: la vista previa de la hoja (la de la fase 4), «Corregir» (vuelve a
  Remolques con los datos y los parámetros guardados; mismo autor) y «Reutilizar datos»
  (carga todo como un pedido nuevo, sin técnico ni revisor, recalculado con los parámetros
  actuales), como en toldos.

## 4. Generar archivos

- «Generar archivos» con las mismas comprobaciones que toldos (`generationBlock`): todas las
  OF con su tarea de Oficina Técnica aprobada en CoordinaOT, consultado en fresco; si
  CoordinaOT no responde, no se genera. Solo el autor (`canGenerateReview`). Un bloqueo por
  pedido para no generar dos veces a la vez. La escritura de ficheros tiene que estar activada.
- «REVISADO POR» = el revisor de CoordinaOT (`approvalReviewers` + `reviewerName` con la lista
  de técnicos).
- El PDF final (servicio de la fase 4) lleva dentro los datos del planteamiento (adjunto JSON,
  como los de toldos), para poder recuperarlo o reutilizarlo desde el propio PDF.
- Se guarda con `archivarPdfRemolques` en las dos carpetas de siempre:
  `AR…-10.pdf` en planteamientos y `<año>/AR….pdf` en oficina técnica. Si ya existe, pregunta
  antes de sustituir (409 + confirmar).
- Hecho esto, el pedido pasa a `PRODUCED` y a «Generados».

## 5. Parámetros › Remolques

- Un apartado «Remolques» en la pestaña Parámetros, con las piezas de las hojas de toldos.
- Editable: demasías de la lona (alto, contorno normal y de enfundar, lona hecha, bastillas y
  curva), paso y primer ollao por defecto, la tabla de recogidas (con «paño trasero con el
  ancho de delante») y los clientes de baquetón con sus extras y observaciones.
- Guardar con «Quién hace el cambio» y «Motivo», versión (409 si otro guardó antes),
  historial y «Restaurar valores por defecto», como `ruleParametersStore`. Validación con
  `validarParams`.
- Los técnicos: la lista de toldos (la de «Soy»); la lista propia de remolques deja de usarse.
- Un pedido guardado conserva sus parámetros; «Corregir» los usa; «Reutilizar» usa los
  actuales.

## 6. Paso desde la web vieja

- Un comando que se ejecuta una vez en el .90 (Iván), con `--simular` primero: lee
  `data/planteamientos.json` (y `data/pedidos.json` si existe) de `/webs/remolques-tgm`, agrupa
  por pedido y crea los pedidos en el almacén de remolques: con PDF ya archivado → `PRODUCED`
  (en «Generados»); pendientes → `PENDING_REVIEW` (en «Por revisar»). Conserva autor, fechas,
  OF, entradas, resultados y parámetros. No escribe en las carpetas compartidas ni toca la web
  vieja. Informe de lo que hace; repetirlo no duplica.
- Prueba con los 32 planteamientos reales de la fixture.

## 7. Configuración

- La carpeta interna de remolques junto a las dos de la fase 4, con su comprobación.
  `deploy:check` la comprueba como las demás.

## Pruebas

- Unitarias del almacén, las reglas de guardar y generar, los parámetros y la migración.
- e2e en la instancia aislada con el CoordinaOT simulado: guardar para revisión, aprobar,
  generar, los dos PDF en las carpetas de prueba con los datos dentro y el revisor puesto,
  «Corregir», «Reutilizar», el filtro de Pedidos, y que toldos sigue igual (sus e2e).
- Migración simulada con los 32 casos: mismos resultados que en la web vieja.
