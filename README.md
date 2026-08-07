# Toldos Testar

Nueva app web para sustituir el Excel de planteamientos de toldos.

## Desarrollo

```bash
pnpm install
pnpm dev
```

La base actual contiene:

- interfaz para pedido con N toldos;
- catálogo inicial extraído del Excel actualizado;
- contrato de reserva compatible con `materiales-ot`;
- motor de reglas preparado para migrar cálculos por modelo sin copiar el Excel celda a celda.

## Flujo de revisión y producción

El pedido no se envía directamente a producción:

- `Guardar para revisión` crea únicamente `PEDIDO.pdf` en la carpeta TOLDOS compartida. El PDF muestra los paneles del formulario e incorpora internamente los datos editables para que la bandeja pueda volver a abrir el pedido.
- La pestaña `Revisión` muestra esa bandeja a todos los puestos. Permite abrir el pedido, pedir cambios o aprobarlo dejando nombre y observaciones.
- `Aprobar y producir` genera `PEDIDO-1.pdf` en Planteamientos y un `.xls` por OF en Subida de material. Si un archivo ya existe, exige confirmación antes de sustituirlo.
- Un pedido modificado y guardado de nuevo vuelve siempre a estado pendiente de revisión.

Mientras la aplicación todavía se use de forma local, `Guardar para revisión`
guarda `PEDIDO.pdf` en TOLDOS: paneles compactos que reproducen los datos
visibles de cada toldo y su estado, sin cálculos ni materiales de producción. Lleva la
marca `BORRADOR PARA REVISION - NO PRODUCCION` y no guarda ni envía archivos a RPS.

## Configuración de carpetas

Las tres rutas se administran desde la pestaña `Configuración` y se guardan en el servidor para todos los usuarios:

- Pedidos para revisión (TOLDOS).
- Planteamientos aprobados.
- Subida de material (RPS).

Se admite el marcador `{YYYY}`, que se sustituye por el año extraído del pedido. El interruptor `Envío a producción` es la barrera explícita para escribir PDF y RPS; aunque esté desactivado se pueden guardar pedidos para revisión. Los valores de `.env` sirven únicamente como configuración inicial.

El mapa inicial del Excel está en `docs/excel-map.md`.
Las decisiones de producto están en `docs/product-decisions.md`.

## Prueba de extremo a extremo con RPS

```bash
pnpm test:e2e:rps
```

La prueba arranca una instancia aislada con rutas temporales, consulta RPSNext en
solo lectura y contrasta cinco pedidos/OF reales. El caso `AR2603332` recorre la
interfaz completa con Chromium, abre la vista previa, guarda el archivo de revisión,
aprueba el pedido, verifica el PDF y RPS definitivos y limpia el formulario. Los artefactos
y el informe JSON quedan en `output/playwright/rps-e2e/`.

## Validación masiva de pedidos guardados

```bash
pnpm validate:rps:all
```

Por defecto recorre los libros de pedidos de 2025 y 2026, consulta RPSNext en
solo lectura y ejecuta los validadores de los 17 modelos implementados. Cada
estructura se reconstruye con las reglas de la web y se contrasta con las
medidas del libro guardado; cuando el validador dispone de los datos necesarios,
también compara los materiales con la reserva final del Excel o con los
materiales previstos actuales de RPS.

Los resultados se guardan en `output/rps-validation/report.json`, con un resumen
legible en `output/rps-validation/summary.md` y el detalle por modelo/año en
`output/rps-validation/details/`. Un estado `REVIEW` se conserva en el informe:
puede indicar una excepción histórica, un pedido aún no subido o una diferencia
que deba corregirse.

La horquilla puede ampliarse sin cambiar código:

```powershell
$env:RPS_VALIDATION_YEARS='2024,2025,2026'
pnpm validate:rps:all
```

Para años anteriores también debe existir el libro anual en
`Y:\AÑO\TOLDOS`; los PDF por sí solos no contienen todos los datos necesarios
para reconstruir fielmente el pedido. `RPS_VALIDATION_CONCURRENCY` controla el
número de validadores simultáneos y `RPS_VALIDATION_STRICT=true` hace fallar el
comando si queda cualquier modelo en revisión.

La batería completa combina la validación masiva y el recorrido real del
navegador:

```bash
pnpm test:rps:full
```
