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

- `POST /api/export`: descarga un `.xlsx` de revisión con hoja `RPS`.
- `POST /api/export/save`: guarda un `.xls` antiguo por OF en `EXPORT_DIRECTORY`, con el mismo formato TSV `latin1` que usa `materiales-ot` para importación, y guarda el resumen de pedido en `ORDER_ARCHIVE_ROOT\AAAA\Reserva Materiales\M.PEDIDO.xlsx`.
- Si se envía el pedido completo, `POST /api/export/save` también guarda el planteamiento en `ORDER_ARCHIVE_ROOT\AAAA\TOLDOS\PEDIDO-1.pdf`: una página de estructura por toldo y páginas de tela agrupando OFs en bloques A/B/C/D.

El `.env` local usa las mismas rutas que `materiales-ot`: subida de materiales para los `.xls` y carpeta anual de reservas para el resumen.

El mapa inicial del Excel está en `docs/excel-map.md`.
Las decisiones de producto están en `docs/product-decisions.md`.
