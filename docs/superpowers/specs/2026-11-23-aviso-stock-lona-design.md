# Aviso de falta de stock de lona — diseño

Fecha: 23/11/2026 · Repos: toldos-testar (Planteamientos) y coordina-ot (CoordinaOT)

## Objetivo

Cuando un pedido hecho en la web necesita más lona de la que hay en RPS:

1. el técnico lo ve en pantalla al generar los archivos;
2. al pasar el pedido a producción en CoordinaOT se puede mandar **un único correo** a Compras y Almacén. Lo decide quien pasa el pedido (por si alguien ya avisó a Compras).

Al regenerar no se manda nada. El correo sale solo al pasar a producción y solo si se marca la casilla.

## Decisiones (Iván, 23/11/2026)

- La comprobación se hace **al generar los archivos**. Al pasar a producción la lona ya está reservada en RPS y el «disponible» ya la ha restado; comparar entonces daría avisos falsos.
- Planteamientos manda a CoordinaOT los ML por lona del pedido y el resultado de la comprobación. CoordinaOT se encarga del aviso y del correo, con su propio sistema (Graph, cola, modo ensayo/activo).
- **Para:** Compras y Almacén. **CC:** Oficina Técnica, Producción y el técnico que pasa el pedido.
- El correo dice solo qué lona no llega, cuánto necesita el pedido y cuánto stock hay disponible, más la fecha de la consulta y quién la hizo. Sin más explicaciones.

## Regla de «no llega»

Para cada código de lona del pedido:

- `necesita` = suma de los ML de esa lona en todas las OF del pedido;
- `disponible` = el disponible de RPS (metros menos reservado), el mismo dato que ya da `GET /api/catalog/fabrics/stock`;
- **no llega** si `disponible < necesita`.

Las lonas sin código de RPS (texto escrito a mano) no se comprueban. Si RPS no responde, no hay aviso de falta: se dice «No se pudo consultar el stock» y no se manda nada a CoordinaOT como falta.

## Planteamientos (toldos-testar)

### Origen de los ML

Los mismos materiales que ya se apuntan en la entrega (`src/materialesEntrega.js`), filtrados a lona:

- toldos: `materialesReserva(reserva)` → solo las líneas cuyo código es una tela del catálogo (`resolveFabric`);
- remolques: `materialesRemolques(pedido)` → `metrosTela` por OF; el código de RPS sale de `codigoBobina` del material (como `codigoStockMaterial`);
- puertas: los ML de lona por OF del corte (los del cajetín, «ML por OF en puertas»).

Una función pura, `necesidadesLona(lineas) → [{ codigo, descripcion, ml, porOf }]`, agrupa por código.

### Al generar los archivos

«Generar archivos» es cuando el pedido ya está aprobado (Iván, 23/11/2026): `POST /api/reviews/:orderCode/produccion` (toldos) y `POST /api/{remolques|puertas}/pedidos/:orderCode/produccion`. Ese paso **hace también las reservas de RPS**, así que el stock se consulta **antes** del primer paso de `pasarAProduccion`, cuando el disponible aún no tiene descontado este pedido:

1. se calculan las necesidades y se consulta el stock (`fabricStock.getStock(codigos)`, saltándose la caché de 60 s);
2. al terminar bien, se añade a la respuesta `stockLona: { consultado, faltas: [{ codigo, descripcion, necesita, disponible }] }`;
3. se manda a CoordinaOT (sin bloquear la generación si falla) un `POST /api/integracion/stock-lona` con el pedido, las OF, las lonas con su ML, las faltas, `consultado` y `consultadoPor` (`savedBy` de la petición).

Si «Generar archivos» se hace con el pedido ya pasado en CoordinaOT, el aviso sale en pantalla igual, pero CoordinaOT ya no ofrecerá el correo para ese pedido.

### En pantalla

Si hay faltas, un aviso ámbar junto a los demás avisos de la generación: «No llega el stock de LV6002G: necesita 42,30 m, disponible 18,75 m.», una línea por lona, y al final: «Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.» Sin botones. La línea ámbar del buscador de tela se queda como está.

## CoordinaOT (coordina-ot)

### Recibir

`POST /api/integracion/stock-lona` con la misma clave `X-Clave-Integracion`/`INTEGRACION_CLAVE` que `GET /api/integracion/ofs`. Guarda la **última** comprobación por pedido en una tabla nueva, `stock_lona` (`pedido_id`, `datos` JSON, `consultado`, `consultado_por`, `recibido_at`). Cada generación reemplaza la anterior. Si la última no tiene faltas, no hay aviso.

### Al pasar a producción

En el diálogo de pasar el pedido (el mismo donde se ve el correo del planteamiento), si la última comprobación tiene faltas:

- bloque «Falta material» con una línea por lona: necesita / disponible;
- casilla **«Mandar correo a Compras y Almacén»**, **marcada por defecto** (lo normal es que nadie haya avisado aún). Tiene que verse bien: grande, dentro del bloque ámbar, con su texto en negrita, no perdida entre las demás opciones del diálogo;
- si ya se mandó antes un correo de falta de material de este pedido, se dice al lado «Ya se avisó el 23/11 a las 12:40 (Iván Sánchez)» y entonces la casilla sale **sin marcar**.

Al pasar con la casilla marcada se encola un correo en la misma cola que el del planteamiento (`planteamiento_correo`, sin ficheros), con el mismo modo:

- `off`: no se encola;
- `ensayo`: solo a `CORREO_ENSAYO_PARA`;
- `activo`: Para `CORREO_STOCK_PARA` (por defecto `compras@toldosgomez.com, almacen@toldosgomez.com`); CC `CORREO_PARA` (Oficina Técnica y Producción) y el técnico que pasa el pedido.

Pasar el pedido nunca falla por el stock. El aviso informa, no bloquea.

### El correo

- **Asunto:** `Falta material {pedido} · {cliente}`.
- **Cuerpo HTML**, estilo HeroUI como el del planteamiento: píldora roja «FALTA MATERIAL», pedido y cliente; una tarjeta por lona que no llega, «No llega el stock de {código} {descripción}», con **Necesita** y **Stock disponible** (en rojo); pie con «Stock consultado {fecha hora}» y «Por {técnico que generó}». Versión de texto plano con lo mismo.
- Maqueta aprobada: `toldos-testar/tmp/correo-stock-ejemplo.html`. Las direcciones exactas de Compras y Almacén se confirman antes de pasar a modo activo.

## Errores

- RPS o CoordinaOT caídos al generar: la generación sigue; aviso «No se pudo comprobar el stock» o «No se pudo avisar a CoordinaOT».
- Pedido sin comprobación en CoordinaOT (generado antes de esto, o fuera de la web): no hay bloque ni correo.
- El correo usa los reintentos de la cola actual.

## Pruebas

- toldos-testar: `necesidadesLona` por producto (toldos con bamba aparte, remolques y puertas con varias OF); regla de «no llega»; la generación no falla si el stock o CoordinaOT fallan; el aviso en la respuesta.
- coordina-ot: la ruta POST (clave, validación y reemplazo), los destinatarios por modo, el asunto y el cuerpo del correo, y que al pasar se encola el correo solo con la casilla marcada y con faltas en la última comprobación.
- Prueba completa en modo ensayo: generar un pedido con una lona sin stock, pasarlo y comprobar que el correo llega solo a Iván.

## Fuera de alcance

- Volver a consultar el stock al pasar a producción.
- Avisos de herrajes u otros materiales que no sean lona.
- Bloquear la generación o el paso a producción.
