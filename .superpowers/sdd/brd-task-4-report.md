# Tarea 4 — Informe: módulo común de borradores y Remolques

**Estado:** HECHA. Commit `13e7fc8` en `main` (sin subir).

## Lo hecho

- `src/client/borradores.ts` (nuevo): `Pedir`, `CuerpoBorrador`, `listarBorradores`, `leerBorrador`,
  `descartarBorrador`, `guardarBorradorPreguntando`, `preguntaAlObtener`, `buscarBorradorAlObtener`,
  `contenidoBorradorToldos`, con los nombres y firmas del bloque Interfaces.
- `src/client/borradores.test.ts` (nuevo): las pruebas del brief más una (ver desviación 2).
- `src/client/remolques/guardarPedido.ts`: `contenidoBorradorRemolques` (+ prueba en `guardarPedido.test.ts`).
- `src/client/remolques/useRemolques.ts`: el parámetro `onAbrirBorradorToldos`; devuelve además
  `guardandoBorrador`, `guardarBorrador`, `cargarBorrador` y `obtenerDatosPulsado`, con el código del brief.
- `src/client/remolques/RemolquesView.tsx`: las props `borradorSolicitado` y `onAbrirBorradorToldos`; un efecto
  que atiende cada petición una sola vez; «Obtener datos del pedido» y «Reintentar» pasan por `obtenerDatosPulsado`;
  el botón `ghost-button` «Guardar borrador» (icono `FilePen`) entre «Vista previa del PDF» y «Guardar para revisión».
- `src/client/App.tsx`: el estado `borradorRemolquesSolicitado` y `abrirBorrador(borrador, { preguntar })`
  (remolques → su pantalla; toldos → `draft.loadOrder` con los parámetros actuales), conectado a `RemolquesView`.

## Desviaciones respecto al brief

1. **Fecha «01/10» a mano.** `toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })` da «1/10»
   con el ICU de Node 24 y la prueba del brief fallaba. `diaYMes` usa ahora `padStart(2, '0')` con
   `getDate()`/`getMonth()`: igual en todos los navegadores y en Node.
2. **`buscarBorradorAlObtener` mira primero la lista.** El servidor de la tarea 3 responde **404** a
   `GET /api/borradores/<n>` cuando no hay borrador, y Chromium lo apunta en la consola como
   «Failed to load resource… 404» cada vez que se pulsa «Obtener datos del pedido». Por eso fallaba
   `scripts/test-remolques-2a-e2e.mjs` («sin errores de consola»), y lo mismo le pasaría a cualquier e2e
   que mire la consola (también en Toldos en la tarea 5). Como no puedo tocar el servidor, el cliente
   pide antes `GET /api/borradores` (sin carpeta configurada da 200 con `configurado: false`) y solo lee el
   borrador si su `orderCode` (`codigoBorrador` de `src/borradores/reglas.ts`) está en la lista. En las
   pruebas: el caso «con borrador» del brief ahora responde según la URL (lista con el resumen / el
   borrador), y hay una prueba nueva: «mira la lista primero: si no está, no lo lee». Las demás pruebas
   del brief van sin tocar.
   *Lo más limpio sería que el servidor respondiera 200 con `null` (o un `HEAD`) cuando no hay
   borrador. Lo decide quien revisa la tarea 3; si se cambia, esta función puede volver a leer directamente.*
3. **Guardar un borrador mientras se cargan los parámetros.** El brief no dice nada. `guardarBorrador`
   no mira `bloqueoParams` y el botón no se desactiva por eso: el borrador guarda líneas y cabecera,
   no resultados. Lo he dejado escrito en el comentario de la función. «Guardar para revisión» sigue igual:
   espera a los parámetros.
4. **RemolquesView ya estaba subido** (50f6b9a, con `DibujoElemento` extraído). Las ediciones del brief
   encajaron sin cambios en el código actual: los mismos anclajes y ninguna adaptación de lógica.
5. Capturas en `tmp/ui-audit/borradores-tarea-4/`, como pedía el encargo (el brief decía `tmp/ui-audit/borradores/`).

Se mantiene lo de antes en `useRemolques`: la espera a los parámetros y la consulta aparcada
(`obtenerDatosPulsado` llama a `obtenerDatosPedido`, que respeta `bloqueoParamsRef` y `consultaEnEspera`),
los parámetros de «Corregir» guardados con el borrador del navegador (`cargarBorrador` pone
`contenido.paramsGuardados` y borra el borrador local de ese número antes de `PEDIDO_CARGADO`),
`pantallaSigueIgual` tras guardar, `esOtroPedido` y la protección de la importación (no se ha tocado).

## Comprobaciones

- `pnpm test`: 181 ficheros, 2699 pruebas OK. `pnpm typecheck`, `pnpm lint` y `pnpm exec vite build`: OK.
- Instancia aislada `ISOLATED_DIR=tmp/borradores PORT=4311 FAKE_COORDINA_PORT=4321` (health:
  `simulationMode` true y `fileWritesEnabled` false). Guion `tmp/brd4-capturas.mjs`: Remolques, `AR.26.99611`,
  «+ Remolque» → «Guardar borrador» → aviso «Borrador guardado: AR2699611.» y la pantalla vacía → volver a
  escribirlo y pulsar «Obtener datos del pedido» → «AR2699611 tiene un borrador de Iván del 01/10. ¿Lo abres?»
  con «Abrir borrador» / «Empezar de cero» / «Cancelar» → «Abrir borrador» devuelve el elemento. Claro y oscuro,
  1280×720 y 1600×1000, sin errores de consola. Al final se borra el borrador de prueba (DELETE 200).
- `scripts/test-remolques-2a-e2e.mjs` en 4311: OK (25 «OK»; antes de la desviación 2 fallaba por los 404).
- `scripts/test-remolques-5-e2e.mjs` en su propia aislada (`ISOLATED_DIR=tmp/remolques-5`, 4311): «Remolques fase 5: OK».
- Las instancias están paradas.
- Capturas revisadas: `tmp/ui-audit/borradores-tarea-4/remolques-{boton,guardado,pregunta,abierto}-{light,dark}-{1280x720,1600x1000}.png`.
  «Guardar borrador» sale como `ghost-button`, igual que «Vista previa», en claro y en oscuro.

## Para el revisor

- En el diálogo de confirmación que ya existe, el botón alternativo («Empezar de cero») sale en rojo, con
  estilo de peligro. Es el estilo común de `alternativeLabel` y no lo he cambiado, pero para
  «Empezar de cero» quizá asusta más de lo que debe: el borrador no se pierde.
- Desviación 2 (404 del servidor): conviene decidirla al revisar la tarea 3.
- Un `bloque.ts` antiguo de otra sesión, que estaba en la carpeta temporal, se coló un momento en
  `useRemolques.ts` mientras editaba. Lo quité enseguida: el diff del commit solo tiene lo de esta tarea
  (lo he comprobado con `git diff`).

## Arreglos de la revisión

1. Servidor: `GET /api/borradores/:orderCode` da 200 con `null` si no hay borrador o carpeta (el servicio ya no lanza 404). Prueba del servicio actualizada.
2. Cliente: `leerBorrador` trata `null` como «no hay» (sigue aceptando 404). `buscarBorradorAlObtener` vuelve a una sola lectura, sin mirar antes la lista. Pruebas actualizadas.
3. `ConfirmOptions.alternativeTone` (`'danger'` por defecto, `'neutral'` = `ghost-button boton-3d`). «Empezar de cero» usa `neutral`; «Sustituir por las líneas de RPS» sigue en rojo.
4. `obtenerDatosPulsado`: tras la espera sale si `esOtroPedido(numero, estadoRef.current.numeroPedido)`; una ref `buscandoBorrador` evita dos preguntas o consultas con doble clic.
5. «Abrir borrador» desde esa pregunta carga con `preguntar: lineas.length > 0`: si la pantalla ya tiene líneas, pregunta antes de sustituirlas.
6. `RemolquesView`: «Guardar para revisión» deshabilitado mientras `ws.guardandoBorrador`.

Verificación: pnpm test (2701), typecheck, lint, vite build y `test-remolques-2a-e2e.mjs` en la instancia aislada (4311) OK. Los puntos 4 y 5 (lógica dentro del hook, que usa useReducer y muchas dependencias) no tienen prueba unitaria propia; el e2e cubre el flujo normal.
