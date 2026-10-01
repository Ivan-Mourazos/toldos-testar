# Borradores en el servidor (toldos y remolques) — diseño

Fecha: 01/10/2026. Hablado con Iván el 01/10/2026.

## Objetivo

Poder dejar un pedido a medias y empezar otro sin borrar la pantalla, y seguirlo después desde
cualquier puesto. Hoy el borrador de toldos vive solo en el navegador y es uno solo (el del pedido
en pantalla); el de remolques es uno por pedido, pero también solo en el navegador. Mandar a
revisar un pedido a medias no es la solución: sale en «Por revisar» y en CoordinaOT como si
estuviera listo.

## Decisiones de Iván (01/10/2026)

1. **Todos ven todos los borradores**, pero se nota que son borradores.
2. **Un borrador por número de pedido**: sin número no hay borrador.
3. **Con botón** «Guardar borrador», no automático.
4. Desaparecen al **pasar a revisión** (solo) o con **«Descartar borrador»** (cualquiera, con
   confirmación). Sin borrado automático ni marca de antiguo.

## Enfoque

Un **almacén propio de borradores**: un fichero JSON por pedido en una carpeta interna del
servidor (como la de los pedidos de remolques), el mismo para toldos y remolques. No se añade un
estado «Borrador» a los pedidos para revisión: los de toldos son PDF en la carpeta compartida y el
estado nuevo habría que excluirlo del contador, de CoordinaOT y de «Generar» en muchos sitios.

## 1. Guardar borrador

- Botón **«Guardar borrador»** en Nuevo pedido, en Toldos y en Remolques, junto a «Guardar para
  revisión».
- Pide número de pedido y «Soy» (`savedBy` de la lista de técnicos). No hace falta que el pedido
  esté completo ni calculado.
- Si ya hay borrador de ese número: se actualiza. Si lo guardó otra persona, pregunta antes («Este
  borrador es de Jaime, ¿lo sustituyes?»; 409 con `needsConfirmation` y `confirmOverwrite`).
- Si el número ya es un pedido guardado para revisión o generado (de toldos o de remolques), no
  deja: «Este pedido ya está en Pedidos: ábrelo y usa «Corregir».» (409).
- Un número es de toldos o de remolques: un borrador de toldos no puede tener el número de un
  borrador o pedido de remolques, ni al revés.
- Tras guardar: la pantalla queda limpia (como tras «Guardar para revisión»), se borra el borrador
  del navegador de ese pedido y aviso «Borrador guardado: AR…».

## 2. Pedidos

- Apartado **«Borradores»** encima de «Por revisar», visible para todos, con la etiqueta
  **«Borrador»** bien distinta y la de «Toldo» / «Remolque». Respeta el filtro «Todos / Toldos /
  Remolques» y la búsqueda; «Míos» enseña solo los guardados por mí.
- Cada fila: número, cliente, quién lo guardó y cuándo, y los elementos (modelos / perfiles).
- **No cuenta** en el número de «Pedidos N» ni pregunta a CoordinaOT.
- Al abrirlo: **«Seguir con el borrador»** (lo carga en Nuevo pedido, en Toldos o en Remolques,
  para seguir editando; si la pantalla tiene datos, pregunta antes) y **«Descartar borrador»**
  (confirmación; se borra).

## 3. Abrir un pedido que tiene borrador

- Al pulsar «Obtener datos del pedido» (toldos y remolques), si hay borrador de ese número:
  «AR… tiene un borrador de Jaime del 01/10. ¿Lo abres?» → **«Abrir borrador»** / **«Empezar de
  cero»** (sigue con RPS como hoy; el borrador sigue ahí hasta que se guarde o se descarte).

## 4. Pasar a revisión

- «Guardar para revisión» igual que hoy (toldos y remolques); al guardar bien, borra el borrador
  de ese número. Si borrar el borrador falla, el pedido queda guardado igual y se registra el fallo.

## 5. Datos y servidor

- Carpeta interna nueva en **Configuración, paso 08 «Borradores»**, semilla de entorno
  `DRAFTS_DIRECTORY` (recomendado `/var/lib/toldos-testar/borradores`), absoluta y sin `{YYYY}`;
  `deploy:check` la comprueba como la de pedidos de remolques. Sin carpeta, «Guardar borrador»
  dice que falta configurarla y Pedidos no enseña borradores (sin romper lo demás).
- Fichero `<CODIGO>.json` (código normalizado, solo letras y cifras), escritura atómica (temporal y
  renombrar), con: versión del esquema, `kind: 'toldos' | 'remolques'`, número, cliente, fecha del
  pedido, `savedBy`, `createdAt`, `updatedAt`, resumen (elementos y modelos) y el contenido:
  - toldos: el formulario tal cual (`order`, como el que se manda a revisión, aunque incompleto);
  - remolques: las líneas (entrada de cada elemento) y, si se estaba corrigiendo, sus parámetros
    guardados.
- Rutas: `GET /api/borradores` (resúmenes), `GET /api/borradores/:orderCode`,
  `PUT /api/borradores/:orderCode` (guardar; `{ kind, savedBy, contenido, confirmOverwrite? }`),
  `DELETE /api/borradores/:orderCode`. Un bloqueo por número para que dos guardados no se crucen.
- El borrador del navegador sigue como hoy, para no perder lo escrito si se cierra la ventana.

## Pruebas

- Unitarias: almacén (guardar, sustituir, listar, borrar, fichero roto se salta), reglas (número
  obligatorio, otro autor pide confirmar, número ya en Pedidos o del otro producto da 409).
- e2e en la instancia aislada: guardar borrador de toldos y de remolques; verlos en «Borradores»
  como otro técnico; «Seguir con el borrador»; pasarlo a revisión y comprobar que desaparece;
  descartar otro; aviso al obtener un pedido con borrador. Las e2e de toldos y remolques siguen
  pasando.
