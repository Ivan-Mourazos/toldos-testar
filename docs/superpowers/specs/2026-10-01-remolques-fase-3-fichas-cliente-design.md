# Remolques · fase 3: fichas de cliente — diseño

Fecha: 01/10/2026. Hablado con Iván el 01/10/2026. Diseño general:
`2026-09-29-unificacion-remolques-design.md` («Fase 3 en detalle»). Fases anteriores: 1, 2a, 2b, 4 y 5
(flujo), y los borradores en el servidor.

## Objetivo

Que lo habitual de cada cliente de remolques (perfil, medidas, recogidas, material, extras de
baquetón, observaciones y, sobre todo, las medidas de remolque con sus ollaos tal como vienen del
CAD) esté guardado en una ficha y se aplique solo al obtener sus pedidos de RPS, y que la ficha se
vaya llenando con el trabajo diario.

## Decisiones de Iván (01/10/2026)

1. **Lo que hoy está por cliente en Parámetros pasa a sus fichas**: los clientes de baquetón
   (HIJOS DE PEDRO LOPEZ, AYALA, GENERAL WOLDER, con sus extras y observaciones) y la recogida
   «PUENTES HIJOS DE PEDRO LOPEZ» (paño trasero con el ancho de delante). En Parámetros quedan solo
   los valores generales (GENERAL del baquetón) y las recogidas normales.
2. **Una ficha por cliente real, con uno o varios códigos de RPS.** Si llega un código que no
   está en ninguna ficha y el nombre se parece al de una, la web lo sugiere y con un clic se añade.
3. **«Guardar en la ficha del cliente»** enseña lo que es distinto de la ficha con casillas: la
   medida con sus ollaos marcada; lo demás, desmarcado.

## 1. La ficha

- En **Parámetros › Remolques › Clientes**, con las piezas de las demás hojas de Parámetros
  (CoordinaOT, claro y oscuro, solo escritorio).
- Cada ficha: **nombre** (el que se ve) y **códigos de RPS** (uno o varios; un código solo puede
  estar en una ficha).
- Todo lo demás opcional; lo que no se rellena no se toca:
  - trabajo habitual (lona o baquetón);
  - perfil y sus medidas (radios de cumbrera, hombro, esquina y chaflán, aguas);
  - recogidas delante y atrás (de la tabla general o la **recogida propia** del cliente, con
    «paño trasero con el ancho de delante»), bastilla de enfundar, ventana (con medidas),
    rotulación;
  - material habitual (código de RPS);
  - **sesgo detrás** (cm más ancho atrás; activa «Detrás distinto»), **cremallera**;
  - **extras de baquetón** (los siete de hoy) con sus observaciones;
  - **observaciones fijas** por líneas (salen siempre en sus planteamientos);
  - **medidas habituales**: lista de largo × ancho **del remolque** (la medida que se teclea), cada
    una con las posiciones de los ollaos por lado (delante, atrás, laterales) **medidas sobre la
    lona hecha**, de izquierda a derecha, como en el CAD. Se guardan e imprimen tal cual, sin
    ajustarlas.

## 2. Paso de lo que hay

- Al desplegar, las fichas se crean una vez a partir de los parámetros de remolques actuales:
  HIJOS DE PEDRO LOPEZ (extras de baquetón y su recogida propia), AYALA y GENERAL WOLDER. Sus
  códigos de RPS se buscan en RPS (solo lectura) por nombre y **Iván los confirma** antes (se
  dejan en el plan; sin código confirmado, la ficha se crea sin código y la sugerencia por nombre
  la encuentra).
- Después, en los parámetros quedan solo GENERAL y las recogidas normales. Un pedido guardado
  conserva sus parámetros del momento (no cambia nada en lo ya guardado ni en la paridad).

## 3. Guardado

- Un fichero JSON en el servidor junto a los parámetros de remolques (semilla de entorno
  `REMOLQUES_CLIENTES_FILE`, por defecto junto a `remolques-parameters.json`), común a todos los
  puestos, con validación de todas las fichas en cada guardado (un código en una sola ficha,
  recogidas que existen…).
- **Una versión por ficha** (cambio de Iván del 01/10/2026: «Si cada vez que cambie algo de un
  cliente tengo que poner una explicación me voy a volver loco»). Cada ficha tiene su versión y su
  botón «Guardar»: guardar una no choca con quien edita otra; solo hay 409 si **esa misma ficha**
  cambió desde que se cargó. Quién guarda es el «Soy»; el **motivo es opcional**.
- **Historial por ficha, automático**: cada cambio queda con quién, cuándo, el motivo si se puso y
  **qué cambió**, escrito solo («Medida 220 × 130 de lona nueva», «Recogida detrás: — → Goma»,
  «Códigos de RPS: + 099991», «Ficha creada», «Ficha quitada»). «Cargar esta versión» la pone como
  cambios sin guardar de esa ficha. Crear y quitar una ficha (con confirmación) se guardan al momento.
- Rutas: `GET /api/remolques/clientes` (todas, cada una con su `version`), `POST
  /api/remolques/clientes` (crear), `PUT /api/remolques/clientes/:id` (`{ ficha, baseVersion,
  updatedBy, motivo? }`), `DELETE /api/remolques/clientes/:id` (`{ baseVersion, updatedBy }`),
  `GET /api/remolques/clientes/:id/historial`, y `POST /api/remolques/clientes/desde-pedido` para el
  botón (añade o actualiza solo lo marcado en una ficha, creándola si hace falta; queda en el
  historial de esa ficha). El `PUT` de todas a la vez responde 410 («recarga la página»).
- El fichero es `{ formato: 2, version, fichas }`: cada ficha lleva su `version` y `version` de fuera
  solo cuenta guardados (para que la web de antes aún pueda leerlo). El de antes (sin versión por
  ficha) se lee tal cual: cada ficha es la versión 1, y su historial (cada renglón con todas las
  fichas) se reparte por ficha al leerlo, comparando cada renglón con el anterior. Al primer guardado
  se escribe ya en el formato nuevo.

## 4. Al obtener un pedido de RPS

- Si el **código del cliente** está en una ficha: los campos **vacíos** de cada elemento se
  rellenan con la ficha y llevan la marca **«del cliente»** (como la marca «Propuesta» de toldos).
  Si el largo × ancho del remolque coincide **exactamente** con una medida habitual, los ollaos
  pasan a «Según se indica» con esas posiciones. Las observaciones fijas se añaden a las del
  elemento. Lo que el técnico cambie, manda.
- Si el código no está en ninguna ficha y el nombre (o alias) de RPS se parece al de una ficha
  (contiene el nombre de la ficha, sin acentos ni mayúsculas, como hoy los clientes de
  baquetón): aviso «¿Es de la ficha HIJOS DE PEDRO LOPEZ?» → **«Añadir el código y aplicar»**
  (guarda el código en la ficha, con el «Soy» y el motivo «Código añadido desde el pedido AR…»)
  / **«No»**.
- Abrir un borrador o «Corregir» un pedido guardado no vuelve a aplicar la ficha: los datos ya
  están.

## 5. «Guardar en la ficha del cliente»

- Botón en cada elemento de Remolques (pedido con cliente de RPS).
- Ventana con lo que es distinto de la ficha, cada cosa con su casilla: la **medida largo × ancho
  con sus ollaos** (si el elemento tiene ollaos «Según se indica» o a medida) marcada por defecto
  («nueva» o «actualiza la de antes»); lo habitual (perfil y medidas, recogidas, material, ventana,
  rotulación, sesgo, cremallera, extras de baquetón), desmarcado, con el valor de antes y el
  nuevo.
- Si el cliente no tiene ficha, la crea con su nombre y código de RPS.
- Queda en el historial con el «Soy» y el motivo «Desde el pedido AR…».

## Pruebas

- Unitarias: almacén y validación de fichas (versión, 409, historial, código en dos fichas),
  aplicar la ficha (solo rellena lo vacío, medida exacta → ollaos según se indica, observaciones,
  marca «del cliente»), sugerencia por nombre, diferencias para el botón, paso de los clientes de
  baquetón.
- La paridad de remolques no cambia (los 32 casos).
- e2e en la instancia aislada: obtener un pedido de un cliente con ficha (rellena y marca),
  guardar una medida nueva con «Guardar en la ficha del cliente», volver a obtenerlo (ollaos según
  se indica), la sugerencia por nombre y la pantalla Parámetros › Remolques › Clientes.
