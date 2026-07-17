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
- `Guardar PDF` permite elegir la carpeta y el nombre mediante el selector de archivos del navegador; si el navegador no soporta esa API, realiza una descarga normal.
- El formulario empieza limpio en cada carga y no recupera borradores anteriores de `localStorage`.
- `Limpiar` reinicia pedido, toldos y datos generales sin borrar el historial.
- Para habilitar escrituras reales en una fase futura habrá que definir explícitamente `ENABLE_FILE_WRITES=true` y reiniciar el servidor.

El `.env` local usa las mismas rutas que `materiales-ot`: subida de materiales para los `.xls` y carpeta anual de reservas para el resumen.

El mapa inicial del Excel está en `docs/excel-map.md`.
Las decisiones de producto están en `docs/product-decisions.md`.
