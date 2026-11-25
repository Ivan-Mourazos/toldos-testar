# Comprobar el stock de lona en todos los pedidos — diseño

Fecha: 24/11/2026 · Repos: toldos-testar (Planteamientos) y coordina-ot (CoordinaOT)
Sigue a `2026-11-23-aviso-stock-lona-design.md` (v1 y v2, comprobación en los pedidos de la web).

## Objetivo

Hoy solo se comprueba el stock de lona en los pedidos hechos con la web. Se quiere comprobar **todos**:

1. los pedidos de la web, como ahora, con la regla de stock corregida;
2. los pedidos con plano hecho a mano, desde «Planos a corte»: la web detecta la lona y los ML y el técnico los confirma o los cambia;
3. en CoordinaOT, un aviso cuando se pasa una OF con lona que nadie ha comprobado.

El aviso informa y nunca bloquea: ni la generación, ni el corte ni el paso a producción.

## Decisiones (Iván, 24/11/2026)

- En RPS la oficina **asigna** material a la OF; la **reserva** la hace Almacén y no siempre coincide con lo asignado. Las asignaciones **no se usan**: en PVC hoy no se hacen.
- Lo mejor es **detectar y que el técnico confirme o edite**, en un modal bien legible.
- Se puede volver a comprobar un pedido cambiado; la nueva comprobación **sustituye** a la anterior y los ML **no se acumulan**.
- Si una OF con lona se pasa sin comprobación, CoordinaOT avisa de que falta pasar el corte.
- En el modal tiene que verse que el disponible es **el stock menos las reservas ya hechas de ese material**.

## Regla de stock (web y planos manuales)

Para cada código de lona, con los datos de RPS (solo `SELECT`):

- **Stock** = metros de las bobinas de ese código (`STKStock`), con las exclusiones actuales de `domain/fabricStock.js`: sin «No_Usar», «PROVEEDORES», filas negativas ni consignación.
- **Reservado** = reservas de Almacén sobre esas bobinas (`STKStockReserve`), **sin contar las de las OF de este pedido**. Cada reserva de lona es `ItemType = 5` y su `IDItem` es un `CPRMOMaterial`, que lleva la OF.
- **Disponible** = Stock − Reservado (bobina a bobina, nunca negativo, como ahora).
- **Llega** si `ML necesarios ≤ Disponible`.

Quitar las reservas del propio pedido evita que, al volver a pasarlo, su lona ya reservada cuente en contra. En la web esto es el único cambio de la regla actual (`src/stockLona.js`, `faltasLona`).

La consulta devuelve también, por código, lo reservado por las OF del propio pedido, solo para enseñarlo en el modal.

## Planos manuales: «Planos a corte» (toldos-testar)

### Detección

Al terminar de preparar el plano (marcos CORTE ya encontrados, `src/cmt/preparacion`):

- **Pedido, entrega y OF:** del nombre del fichero o de su carpeta. Si no salen, vacíos para que los ponga el técnico.
- **Una fila por recuadro CORTE:**
  - **ML** = largo del recuadro (`medidasMm`, el lado largo, en metros);
  - **Lona**, por este orden: (1) un texto del plano que sea un código de RPS o un nombre que case con el catálogo de telas; (2) la lona de esa OF en RPS; (3) vacía.
- Recuadros con la misma lona se suman en la comprobación, pero en el modal se ve cada uno.

Las reglas de detección de la lona se fijan con el estudio previo (ver «Orden de trabajo»), no con un solo plano.

### El modal «Comprobar stock de lona»

Salta solo al preparar el plano, antes de descargar o mandar a la máquina. También se abre con un botón «Comprobar stock» para repetir la comprobación sin regenerar.

- Cabecera: pedido, entrega y OF (editables).
- Una fila por recuadro: lona (buscador de telas de la web), ML (editable) y «Quitar» (para la segunda opción del corte o un recuadro que no cuente).
- Por cada lona, la cuenta a la vista:

  ```
  PLAST880NEGRP204 · PVC negro 204
  Stock en almacén           1.257,8 m
  − Reservado (otros pedidos)  860,0 m
  = Disponible                 397,8 m
  Necesita este pedido          42,3 m      ✔ Llega
  ```

  Si este pedido ya tiene lona reservada, se añade debajo, en gris: «Reservado para este pedido: 40,0 m (no se resta)».
  Si no llega, la línea del estado va en ámbar: «No llega: faltan 12,4 m».
- Botones: **«Confirmar y avisar a CoordinaOT»** y **«Ahora no»** (el pedido queda sin comprobar).
- Letra grande, cifras con coma (`toLocaleString('es-ES')`), diseño de CoordinaOT (`src/client/coordina/`) en claro y oscuro, a 1280×720 y 1600×1000.

### Envío

Al confirmar, el mismo `POST /api/integracion/stock-lona` que la web, con las lonas aprobadas, sus OF, las faltas, `consultado`, y por cada lona la cuenta (`stock`, `reservadoOtros`, `reservadoPropio`, `disponible`, `necesita`); la web manda lo mismo desde «Generar archivos». Además: `consultadoPor` y `origen: "plano-manual"`. Si RPS o CoordinaOT fallan, se dice en el modal y el corte sigue.

## CoordinaOT (coordina-ot)

- **Guardar:** igual que la v2, una comprobación por pedido y entrega; la nueva **sustituye** a la anterior (`stock_lona_entrega`, `ON CONFLICT … DO UPDATE`). Se guarda el `origen`.
- **Al pasar, con faltas:** el mismo bloque «Falta material» y la casilla del correo. Si la falta de una lona ya se avisó con los mismos ML, la casilla sale sin marcar y se dice «Ya se avisó el … (técnico)». Si cambió la lona o los ML, la casilla sale marcada.
- **El correo a Compras y Almacén** refleja la misma cuenta que el modal, en cada tarjeta de lona que no llega:

  ```
  No llega el stock de PLAST880NEGRP204 PVC negro 204
  Stock en almacén             1.257,8 m
  − Reservado (otros pedidos)    860,0 m
  = Disponible                   397,8 m
  Necesita este pedido           410,2 m
  Faltan                          12,4 m   (en rojo)
  ```

  Con la línea gris «Reservado para este pedido: … m (no se resta)» si la hay. Igual en la versión de texto plano y en el bloque «Falta material» del diálogo de pasar. Vale para los pedidos de la web y para los planos manuales.
- **Al pasar, sin comprobación:** si una OF del pedido lleva un artículo de la familia LONA en RPS y no tiene comprobación (ni de la web ni de un plano), aviso: «Sin comprobar el stock de lona: falta pasar el corte de la OF …». No bloquea.

## Errores

- RPS caído: «No se pudo comprobar el stock»; no se manda nada como falta.
- CoordinaOT caído al confirmar: se avisa en el modal; el corte sigue.
- Sin pedido u OF identificados: no se puede confirmar hasta que el técnico los ponga.

## Pruebas

- toldos-testar: la regla (sin reservas, con reservas de otros, con reservas del propio pedido que no restan); detección de ML por recuadro y de la lona por texto y por RPS; el modal (detecta, edita, quita, suma por lona, enseña la cuenta); el envío con `origen`.
- coordina-ot: sustitución de la comprobación; casilla marcada o no según cambien los ML; aviso de OF con lona sin comprobar; nada bloquea el paso.
- Capturas del modal con Playwright en la instancia aislada, claro y oscuro.

## Orden de trabajo

1. **Arreglo de la regla en la web** (pequeño): no restar las reservas del propio pedido.
2. **Estudio previo** por script, delegado: muchos planos manuales ya fabricados; cómo aparece la lona escrita, con qué frecuencia se detectaría y si pedido y OF salen del nombre o la carpeta. Solo lectura, nada fuera de `tmp/`.
3. **Modal en «Planos a corte»** con la detección afinada por el estudio.
4. **CoordinaOT:** `origen`, casilla según cambios y aviso de OF sin comprobar.

## Resultado del estudio y decisiones (25/11/2026)

Estudio en `tmp/estudio-lona-planos/` (453 planos de 2026, revisado):

- En los planos a mano el «recuadro» es una plantilla fija (11,89 / 12,89 / 13,05 × 2,75 m en 81 de 82), no el corte. **Los ML salen de la caja de las piezas que van a la máquina** (`medidasMm` de `preparar`, lado largo), nunca del recuadro.
- La lona escrita junto al corte: 0 de 269 planos a mano. **Lona por este orden:** la única lona reservada por Almacén para esa OF (`STKStockReserve`); si no, la única lona de la familia LONA asignada a la OF (`CPRMOMaterial`); si no, la elige el técnico. Si la OF tiene varias, una fila por lona con los ML vacíos para que los reparta el técnico.
- Pedido desde el nombre del fichero o la carpeta (93 %). Con varias OF en el pedido, el técnico marca las suyas. Entrega = sufijo del nombre (`-2`, `.2`, `_2`) o vacía.
- Varias lonas pueden ir en el mismo DXF (Iván): el modal deja añadir filas y repartir los ML.
- **Planos de la web** (recuadro `CORTE` de la web o `CAJETIN TGM`): no abren el modal; ya se comprobaron en «Generar archivos».
- **COMBURSA** queda fuera («es otro mundo»): sin pedido en el nombre, no abre el modal.

### Contrato con CoordinaOT

- El envío admite una clave más de primer nivel, `origen`: `"web"` | `"plano-manual"` (sin ella = `"web"`, para no romper lo desplegado). CoordinaOT se despliega antes.
- `lonas[].origen` sigue siendo `corte` | `reserva` | `manual`.
- Con `origen: "plano-manual"` la comprobación **sustituye solo a las OF que trae**: CoordinaOT conserva, del registro del mismo pedido y entrega, las lonas, faltas y OF de otras OF.
- Casilla del correo: el aviso guarda los ML avisados (`necesita`); si la falta vuelve con la misma lona y los mismos ML, la casilla sale sin marcar con «Ya se avisó el … (técnico)»; si cambian, marcada. Requiere una columna nueva opcional en `stock_lona_aviso` (`ALTER TABLE … ADD COLUMN`, sin tocar datos).

## Fuera de alcance

- Asignaciones de material (`CPRMOMaterial` sin reserva).
- Bloquear la generación, el corte o el paso a producción.
- Otros materiales que no sean lona.
