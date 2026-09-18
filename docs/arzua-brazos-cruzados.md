# ARZUA PRO: brazos cruzados

Implementación local, 18/09/2026. Fuentes: Llaza Tarifa Nacional 2026,
páginas impresas 264–266; compras y maestro de artículos RPS, solo lectura.

## Comportamiento

Selector NORMALES / CRUZADOS en ARZUA PRO. Los pedidos BRACRU se importan
como cruzados. La configuración se conserva en el pedido normalizado, borradores
y datos del PDF. Los pedidos anteriores sin campo conservan la configuración normal.

La variante implementada utiliza dos brazos físicos (un juego ONYX), soporte
ARZUA y kit inferior para EVO 80, montado a la izquierda. Inclinación máxima 30°.
Máximo 395 cm con motor/máquina interior y 400 cm con máquina exterior;
salidas 150–350 cm cada 25 cm. Los mínimos proceden de la tabla de página 265.
Las reglas modificadas no permiten saltar los límites de esta variante.

Kit: una unidad por toldo. Perfiles EVO: una barra de 500 cm por toldo;
el tubo de enrolle conserva el largo de stock de sus parámetros independientes.
No se han alterado los descuentos de corte existentes del planteamiento.

## Cotejo de compras: pedido 091076

Compra a LLAZA WORLD S.A., 16/09/2026, OF 0232215:

| Artículo | Compra | Reserva calculada |
|---|---:|---:|
| KITBRCRUARONIGR16 | 1 UNI | 1 kit |
| SOPAR350GR16 | 1 UNI | 1 juego |
| BONYXGR16200C | 1 UNI | 1 juego de brazos |
| PEVO80GR16500C | 5 METROS | 1 BARRA de 500 cm |
| TERMINEVOGR16 | 1 UNI | 1 juego solo al confirmar «JUEGO ADICIONAL» |

La última línea contradice la interpretación de la ilustración de página 266,
que muestra terminales dentro del kit. No se afirma que Compras se equivocase.
El campo «Terminales · confirmar con taller» empieza pendiente y bloquea la
reserva hasta elegir solo los del kit o juego adicional. Esta elección se
refleja en las líneas del despiece del PDF. Ninguna de las dos opciones se ha aplicado a la OF real.
Las observaciones de estructura contienen exclusivamente el texto del usuario:
no se añade ningún comentario automático de brazos cruzados al editar ni imprimir.

## Equivalencias verificadas

| Acabado | Kit RPS | Evidencia de compra |
|---|---|---|
| Blanco | KITBRCRUARONIBL16 | 089975; referencia proveedor 20029014001 |
| Negro RAL9011 | KITBRCRUARONINE11 | 089152, OF 0226675 |
| Burdeos RAL3005 | KITBRCRUARONIBU05 | 086167, OF 0218004 |
| Gris 7012 | KITBRCRUARONIGR12 | 087519 |
| Gris 7016 | KITBRCRUARONIGR16 | 091076, OF 0232215 |

El selector incluye también «ANTRACITA (RAL 7016)», equivalente al gris 7016
confirmado en la compra de la OF 0232215. El importador reconoce ANTRACITA
sin enviarlo a lacado especial. Un acabado mate/texturado o un RAL distinto
no recibe esta equivalencia automáticamente. Los pedidos ya guardados como
LACADO ESPECIAL deben corregirse seleccionando el acabado confirmado.

Tarifa: kit inferior AROND 20 029 014 001 / 20 029 014 909.
Las compras de colores no siempre tienen referencia de proveedor: no se han
rellenado por deducción. Los cinco perfiles EVO de 500 cm se verificaron en el
maestro RPS con unidad BARRA. Las tablas del código contienen referencias completas.

## Límites de la implementación

- Otros acabados y kit posterior/UNIVERS quedan bloqueados por falta de
  equivalencia confirmada para esta implementación. No se usan kits antiguos
  COMPLET ni MONOBLOC por semejanza.
- Motor requiere selección explícita: no se presenta la tabla de par estándar
  como validada para brazos cruzados. Llaza recomienda motor desde 300 cm de salida.
- Los límites de lona se aplican cuando el nombre identifica RECACRIL,
  RECSYSTEM, RECWATER, RECAFLEX PRO o las familias RecScreen de la tabla.
  Una lona genérica emite aviso de comprobación; no se le asigna una familia inferida.
- El planteamiento preexistente usa descuentos del manual COMPLET-PRO 2019.
  La tarifa AROND 2026 presenta descuentos distintos de barra frontal manual:
  11,2/11,4 cm frente a 10,2/10,4 cm existentes. No se ha resuelto esta diferencia
  dentro de la incorporación de brazos cruzados ni se han cambiado los cortes.
- La compra no acredita recepción ni consumo. No se han escrito datos en RPS,
  creado reservas, modificado la OF ni desplegado en producción.

## Verificación

Pruebas de mínimos/máximos, cantidades por toldo, las cinco referencias de kits,
terminales opcionales, colores desconocidos, motor, importación BRACRU, normalización,
regresión de configuración normal y PDF. Suite completa: 1.885 pruebas correctas.
TypeScript y build Vite correctos. PDF de muestra renderizado e inspeccionado.

`scripts/audit-crossed-purchases.mjs` permite repetir la consulta de compras
con SELECT exclusivamente. `scripts/preview-crossed-arzua.mjs` genera una muestra
local en la carpeta temporal; la selección de terminales de esa muestra es ficticia.
