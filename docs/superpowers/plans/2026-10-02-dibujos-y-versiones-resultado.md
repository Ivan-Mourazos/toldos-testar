# Resultado: dibujos y versiones por modelo

Terminadas las tareas 3 a 9 del plan `2026-10-02-dibujos-y-versiones.md`, incluida la tarea 12 de Codex. Se recuperaron los dos commits pendientes de Claude y se completó su trabajo de guardado por modelo en la carpeta de Codex. La carpeta de Claude se consultó sin modificarla.

## Cambios terminados

- Cada modelo de toldo guarda sus parámetros con su versión e historial. La barra de guardado y la restauración afectan al modelo abierto.
- Las miniaturas utilizan el código del PDF, con proporción 258/385. Las fichas muestran los dibujos, sus usos y las condiciones que se cumplen con los datos actuales.
- La tarjeta permite elegir un dibujo de taller o dejarlo en Automático. La elección se guarda con la tarjeta y se aplica al PDF. Los valores antiguos que necesitan revisión se mantienen visibles.
- La barra común de guardado queda en Remolques › Generales; Toldos utiliza la barra de cada modelo.
- Se conservan la entrada sencilla de pedidos y el contrato de parámetros de remolques. Corregir mantiene los parámetros del pedido guardado y Reutilizar utiliza los actuales.

## Commits

| Trabajo | Commit |
| --- | --- |
| Tarea 3, recuperada de Claude (`0592132`) | `fec7bdd` |
| Tarea 4, recuperada de Claude (`5fb1c2a`) | `2e3dc46` |
| Tarea 5, guardado por modelo | `8441037` |
| Validación y corrección de miniaturas | `75bd9bf` |
| Tarea 6, variantes y usos | `d13cf60` |
| Tarea 7, elección desde la tarjeta | `4570cef` |
| Tarea 8, pruebas de guardado y PDF | `2500ec3` |
| Tarea 9, separación de las barras | `1f98803` |

## Comprobaciones

Después del rebase sobre `main` pasaron 212 archivos y 2.946 pruebas con `pnpm test --maxWorkers=1`, además de `pnpm typecheck`, `pnpm lint` y `pnpm exec vite build`.

Pasaron las pruebas de navegador de consulta de parámetros, panel de toldos, dibujos, remolques 2a y remolques 4 en la instancia aislada `http://127.0.0.1:4312`, con recarga de Vite en 24312. También pasó la prueba de Bambalina en su instancia aislada. Las pruebas escriben dentro de `tmp/`; la instancia utiliza simulación y tiene deshabilitada la escritura de archivos del taller.

Se revisaron las capturas en claro y oscuro, a 1280×720 y 1600×1000:

- `tmp/ui-audit/codex-tarea5/`: guardado por modelo.
- `tmp/ui-audit/codex-dibujos/`: 28 capturas de condiciones, historial, miniaturas, cambios pendientes y dibujo elegido en la tarjeta.

Se ajustó el selector de la prueba de Iris para comprobar su aviso específico: las miniaturas también muestran estados de carga.

## Duda pendiente del modelo

La incidencia anterior de colocación del dibujo de Cortina en el PDF está anotada como Q-C04 en `docs/modelos/dudas-abiertas.md`. Este trabajo no cambia el dibujo del PDF de producción ni inventa reglas de piezas o medidas.
