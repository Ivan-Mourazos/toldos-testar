# Remolques (fase 1 de la unificación)

Cálculo y geometría de lonas de remolque y baquetones, copiados el 29/09/2026 de
`Remolques-TGM/src/lib/{calc,geometry}` (commit a7ffef0) sin tocar la lógica: solo
cambiaron los imports (relativos y con `.ts`, para que Node 24 los ejecute sin compilar).

- `paridad-produccion.test.ts` recalcula los 32 planteamientos reales de producción
  (`__fixtures__/produccion-2026-09.json`, anonimizado) y exige el mismo resultado.
- Cualquier cambio de cálculo tiene que seguir pasando esa prueba o explicar por qué
  cambia una medida real (Iván lo aprueba).
- Diseño: `docs/superpowers/specs/2026-09-29-unificacion-remolques-design.md`.

## Fase 2a: la lógica de la pantalla de remolques

Copiada también el 29/09/2026 de `Remolques-TGM/src/lib` (commit a7ffef0), con las mismas
reglas: solo cambian los imports (relativos y con `.ts`), y cada prueba copiada sigue
pasando con el mismo número de casos que en el origen.

- `rps/`: lectura de pedidos de RPS y paso de sus líneas a planteamientos
  (`interpretar-linea`, `aplicar-linea`, `material-rps`, `numero-pedido`, `pedido-rps`, `types`).
- `pedidos/`: número de pedido, validación de un planteamiento (qué campos faltan) y
  agrupación de líneas por pedido.
- `workspace/`: estado de la pantalla, líneas del pedido, completar pedido, selectores
  y borradores locales.
- `store/types.ts`: solo los tipos de un planteamiento guardado.
- `materiales.ts`: lonas PVC de RPS (viene de `store/rps-materiales.ts`).
- `rps/pool.ts` es un adaptador, no una copia: llama a `getRpsPoolForRemolques()` de
  `src/rpsCatalog.js`, así remolques usa la misma conexión de solo lectura que toldos y no
  abre otra. Devuelve `null` si no hay credenciales, igual que el original.
- `@types/mssql` entra como dependencia de desarrollo porque el código copiado importa
  `mssql` tipado.

## Fase 4: la hoja de taller

`hoja/datos-hoja.ts` y `hoja/datos-geometria.ts` están copiados de `Remolques-TGM/src/lib/pdf`
(commit a7ffef0) con las mismas reglas: solo cambian los imports. `paridad-hoja.test.ts` compara
los 32 casos reales con `__fixtures__/hoja-produccion-2026-09.json`, que generó el código de la web
vieja sobre la misma fixture. Añadidos a propósito: la fila «BASTILLA ENFUNDAR», la tabla de
ganchos («Según ganchos»), el paño y el contorno de corte con sus dos medidas cuando el remolque es
distinto detrás, y las columnas que hagan falta si un lado lleva más de 12 ollaos (la vieja cortaba
en 12). La hoja no lleva las notas del cálculo: solo las observaciones del técnico.

## Fase 5: el flujo

`flujo/` lleva el camino de un pedido de remolques, con las reglas de toldos de
`src/reviewRules.js` (no se copian):

- `tipos.ts` y `pedido.ts`: el pedido guardado (`kind: "remolques"`, mismos estados y campos de
  fuera que toldos) y sus reglas puras (letras y OF por elemento, perfil como modelo, año).
- `almacen.ts`: un JSON por pedido en la carpeta interna (`REMOLQUES_REVISION_DIRECTORY`).
- `adjunto.ts`: el pedido dentro del PDF generado (`AR….remolques.json`, con `pdf-lib`).
- `servicio.ts`: guardar, listar, abrir, vista previa, generar (CoordinaOT en fresco, solo con todo
  aprobado, un bloqueo por pedido, `archivarPdfRemolques`) y abrir el generado. Las rutas
  `/api/remolques/pedidos…` de `src/server.js` solo lo llaman.
- `migracion.ts` y `scripts/migrar-remolques.mjs`: el paso desde la web vieja (una vez, con
  `--simular` primero).

Diseño: `docs/superpowers/specs/2026-10-01-remolques-fase-5-flujo-design.md`. Los Parámetros de
remolques (su apartado 5) los hace otra tarea.
