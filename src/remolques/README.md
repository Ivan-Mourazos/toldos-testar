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
