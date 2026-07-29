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

## Reservas

La app mantiene dos salidas:

- `POST /api/export`: descarga un `.xls` tabulado antiguo compatible con RPS; no escribe en carpetas compartidas.
- `POST /api/planteamiento`: genera y devuelve `PEDIDO-1.pdf` para que el navegador muestre "Guardar como". Incluye una página de estructura por toldo y páginas de tela agrupando OFs.
- `POST /api/export/save`: permanece bloqueado con `403` mientras `ENABLE_FILE_WRITES=false` (valor recomendado y predeterminado).

## Modo de pruebas

- La interfaz muestra permanentemente `Modo pruebas · No guarda reservas`.
- `Simular RPS` solo descarga el Excel de revisión.
- Cada simulación correcta se guarda en el historial local del navegador para poder reutilizar el pedido sin escribir en RPS.
- `Guardar PDF` permite elegir la carpeta y el nombre mediante el selector de archivos del navegador; si el navegador no soporta esa API, realiza una descarga normal.
- El formulario empieza limpio en cada carga y no recupera borradores anteriores de `localStorage`.
- `Limpiar` reinicia pedido, toldos y datos generales sin borrar el historial.
- Para habilitar escrituras reales en una fase futura habrá que definir explícitamente `ENABLE_FILE_WRITES=true` y reiniciar el servidor.

El `.env` local usa las mismas rutas que `materiales-ot`: subida de materiales para los `.xls` y carpeta anual de reservas para el resumen.

El mapa inicial del Excel está en `docs/excel-map.md`.
Las decisiones de producto están en `docs/product-decisions.md`.

## Prueba de extremo a extremo con RPS

```bash
pnpm test:e2e:rps
```

La prueba arranca una instancia aislada en modo simulación, consulta RPSNext en
solo lectura y contrasta cinco pedidos/OF reales. El caso `AR2603332` recorre la
interfaz completa con Chromium, descarga el `.xls`, abre la vista previa,
descarga el PDF, comprueba el historial y limpia el formulario. Los artefactos
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
