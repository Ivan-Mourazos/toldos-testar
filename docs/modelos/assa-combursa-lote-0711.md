# COMBURSA: revisión del lote 07-11-2026

## Alcance y fuentes

La referencia de fabricación es `LOTE 07-11.dwg`, copia definitiva del 03/11/2026.
Se trabaja únicamente con copias locales. La consulta autorizada
`POST /api/assa/lote/vista`, con fecha `2026-11-07`, devuelve 25 líneas de cinco
pedidos, 314 unidades y nueve líneas a mano. No se ha reconstruido RPS a partir
de las cifras del dibujo. No se han llamado las rutas de borrador, confirmación
ni envío del servidor de producción.

También se leen `LOTE 07-11_PALET 4-5`, `LOTE 31-10` y copias de oficina de
`LOTE 10-10`, `LOTE 17-10` y `LOTE 24-10`. Las conversiones ODA y todas las salidas
de revisión quedan en `tmp/combursa-0711/` y `tmp/ui-audit/combursa-0711/`.

## Cambios demostrados y realizados

1. El generador anterior dibujaba el corte y columnas de pedido, pero dejaba una
   presentación vacía, sin cajetín ni papel del cortador dibujado. El documento
   completo añade una presentación de conjunto, hojas por pedido, vistas de
   corte por palet y el papel del cortador. Todas llevan el cajetín común TGM con
   sus atributos, igual que los demás planos de la web.
2. Las hojas de pedido tienen el mismo tamaño, márgenes, paso de filas y hasta
   tres líneas por página. Se distribuyen por pedido y número de línea en una
   cuadrícula. Los dibujos no se escalan en Modelo y el corte no se mueve por
   razones estéticas. Solo el encuadre de las presentaciones cambia de escala.
3. El recuadro `CORTE`, en `RECUADROS`, encierra exclusivamente el apartado del
   corte. Confección y papel del cortador quedan fuera. Se conserva mediante
   pruebas la extracción anterior de las líneas y textos de máquina para los
   lotes automáticos. No se modifica el envío al bot.

## Estado del contraste

| Apartado | Oficina | Web anterior | Clasificación y actuación |
| --- | --- | --- | --- |
| Hojas de pedido | Cinco pedidos; incluye añadidos manuales | Dibujos de catálogo; tres avisos de falta de dibujo | La web falla: documentar y conservar los añadidos como revisión de este lote, sin extrapolar una fórmula |
| Presentación del definitivo | `Presentación1` vacía, sin ventanas ni cajetín insertado | Presentación vacía | La web falla: generar presentaciones útiles; el cajetín se contrasta con palets 4-5 y 31-10 |
| Restos históricos | Pedidos del 31-10 alrededor de x = −5.700 m, y = −1.300 m | No necesita esos restos | La oficina hizo un caso especial: conservar la fuente y excluir del documento nuevo los restos ajenos al 07-11 |
| Papel del cortador | No hay una hoja de cantidades separada identificable en el definitivo | Datos JSON, sin hoja dibujada | La web falla: dibujar las cantidades RPS y las instrucciones de los programas; no atribuir a oficina un papel que no está guardado |
| Nueve líneas a mano | Hay geometrías añadidas en capas de oficina | Sin generación automática contrastada | Duda: una copia de geometría del lote no valida una regla general ni autoriza su envío a máquina |

El resto del contraste, la medición del consumo, las capturas y las
comprobaciones finales se incorporan en esta misma revisión.
