# COMBURSA / ASSA ABLOY: cómo se preparan los lotes de oficina

Informe generado por `scripts/assa-investigacion/informe.mjs`. **Todas las cifras, listas de excepciones y tablas salen de los scripts; no se han rellenado a mano.** Los ficheros prueban una preparación guardada, no el corte físico, el orden de la máquina ni una contabilidad de stock.

Se han leído **44 DXF de oficina** (43 de lote y 1 especial), **116 DXF de corte** y el maestro COMBURSA (CRAWFORD). El cruce abarca 153 pedidos rotulados que existen en la foto de RPS. Hay filas con distintas referencias en 85 archivos; no sirve generar una fila independiente por artículo sin conservar estos aprovechamientos.

La foto original no tenía NumLine. A petición del análisis, el coordinador ha facilitado una foto local mediante SELECT: C:/Users/ivan.sanchez/orca/workspaces/toldos-testar/assa-estudio/tmp/assa-fase1/rps-con-linea.json, recogida en 2026-10-28T19:41:25.455Z, con 1903 registros y NumLine en 1903. Se cruzan **pedido + NumLine + referencia**, conservando IDOrderLine y OF. El detalle es [analisis.json](../../tmp/assa-investigacion/analisis.json); las citas del informe se verifican en [citas-rps.json](../../tmp/assa-investigacion/citas-rps.json).

## 1. Organización de los planos de oficina

Cada encabezado AR delimita una hoja de trabajo en Modelo. La columna izquierda conserva confección; la derecha, despiece. Las cifras grandes se repiten en ambas columnas. Se localizan primero por posición y tamaño del texto, sin utilizar la medida esperada de RPS para escoger la pieza. Los rótulos antiguos fuera de la franja principal y las copias de palets se conservan como excepciones. El especial por pedido tiene otra organización y su Modelo contiene restos históricos ajenos a la foto actual.


| Oficina | Encabezados / pedidos distintos | Filas con código (sin duplicar columnas) | Iguales / distintas a NumLine | Palets rotulados (zona principal) | Otras copias de rótulos |
| --- | --- | --- | --- | --- | --- |
| AR2603328.dxf | 1 / 1 | 0 | 0 / 0 | sin rótulo | — |
| LOTE 01-08.dxf | 2 / 2 | 18 | 7 / 11 | PALET 1, PALET 2 | — |
| LOTE 02-05.dxf | 4 / 4 | 24 | 24 / 0 | PALET 1, PALET 2, PALET 3, PALET 4 | PALET 1, PALET 2, PALET 3, PALET 4 |
| LOTE 03-10.dxf | 2 / 2 | 17 | 17 / 0 | PALET 1, PALET 2, PALET 3 | — |
| LOTE 04-04.dxf | 5 / 5 | 20 | 20 / 0 | PALET 2, PALET 3 | — |
| LOTE 04-07.dxf | 4 / 4 | 28 | 28 / 0 | PALET 1 | — |
| LOTE 05-09.dxf | 2 / 2 | 13 | 13 / 0 | PALET 1, PALET 2 | PALET 5 |
| LOTE 06-06.dxf | 7 / 7 | 23 | 23 / 0 | PALET 1, PALET 2, PALET 3, PALET 4 | — |
| LOTE 06-067-03.dxf | 2 / 1 | 1 | 1 / 0 | PALET 1, PALET 2, PALET 3, PALET 4 | — |
| LOTE 07-02.dxf | 4 / 4 | 22 | 22 / 0 | PALET 1, PALET 2, PALET 3 | — |
| LOTE 07-03.dxf | 3 / 3 | 17 | 17 / 0 | PALET 1, PALET 2, PALET 3, PALET 4 | — |
| LOTE 08-08.dxf | 1 / 1 | 11 | 0 / 11 | PALET 4, PALET 5 | PALET 5 |
| LOTE 09-05.dxf | 2 / 2 | 3 | 3 / 0 | PALET 1 | — |
| LOTE 10-01.dxf | 7 / 7 | 40 | 40 / 0 | PALET 3, PALET 4, PALET 5, PALET 6, PALET 7 | — |
| LOTE 10-10.dxf | 6 / 6 | 24 | 24 / 0 | PALET 1, PALET 2, PALET 3 | — |
| LOTE 11-04.dxf | 7 / 6 | 25 | 23 / 2 | PALET 2, PALET 1 | — |
| LOTE 12-09.dxf | 3 / 3 | 23 | 21 / 2 | PALET 1, PALET 2, PALET 3 | PALET 5 |
| LOTE 13-06.dxf | 7 / 7 | 22 | 22 / 0 | PALET 1, PALET 2, PALET 3, PALET 4 | — |
| LOTE 14-02.dxf | 5 / 5 | 10 | 10 / 0 | PALET 1, PALET 2, PALET 3 | — |
| LOTE 14-03.dxf | 6 / 6 | 26 | 25 / 1 | PALET 1, PALET 2, PALET 3, PALET 4, PALET 5 | — |
| LOTE 16-05.dxf | 7 / 7 | 18 | 18 / 0 | PALET 1, PALET 2 | — |
| LOTE 17-01.dxf | 4 / 4 | 7 | 6 / 0 | sin rótulo | — |
| LOTE 17-10.dxf | 4 / 4 | 18 | 18 / 0 | PALET 1, PALET 2, PALET 3 | — |
| LOTE 18-04.dxf | 12 / 12 | 31 | 31 / 0 | PALET 1, PALET 2, PALET 3, PALET 4, PALET 5 | — |
| LOTE 18-07.dxf | 3 / 2 | 42 | 23 / 13 | PALET 1, PALET 2, PALET 3, PALET 4, PALET 5 | — |
| LOTE 19-09.dxf | 2 / 2 | 9 | 9 / 0 | sin rótulo | — |
| LOTE 20-06.dxf | 6 / 6 | 11 | 11 / 0 | PALET 2, PALET 3, PALET 1 | — |
| LOTE 21-02.dxf | 5 / 5 | 14 | 14 / 0 | PALET1, PALET2 | — |
| LOTE 21-03.dxf | 3 / 3 | 27 | 26 / 1 | PALET 1, PALET 2, PALET 3, PALET 4 | — |
| LOTE 21-09.dxf | 5 / 4 | 23 | 21 / 2 | PALET 1, PALET 2, PALET 3, PALET 4 | — |
| LOTE 22-08.dxf | 2 / 2 | 6 | 6 / 0 | PALET 1, PALET 2, PALET 3 | PALET 5 |
| LOTE 23-05.dxf | 4 / 4 | 11 | 11 / 0 | PALET 1, PALET 2 | — |
| LOTE 24-01.dxf | 2 / 2 | 6 | 6 / 0 | PALET 1 | — |
| LOTE 24-10.dxf | 3 / 3 | 13 | 13 / 0 | PALET 1, PALET 2, PALET 3 | — |
| LOTE 25-04.dxf | 7 / 7 | 22 | 21 / 1 | PALET 1, PALET 2, PALET 3 | — |
| LOTE 25-07.dxf | 2 / 2 | 16 | 3 / 13 | PALET 5, PALET 6, PALET 7 | — |
| LOTE 26-09.dxf | 4 / 3 | 20 | 19 / 1 | PALET 1, PALET 2, PALET 3, PALET 4 | — |
| LOTE 27-06.dxf | 2 / 2 | 13 | 13 / 0 | PALET 2, PALET 1 | — |
| LOTE 28-02.dxf | 5 / 5 | 20 | 19 / 1 | PALET 1, PALET 2, PALET 3, PALET 4 | — |
| LOTE 28-03.dxf | 3 / 3 | 30 | 30 / 0 | PALET 1, PALET 2 | — |
| LOTE 29-08.dxf | 5 / 5 | 19 | 17 / 2 | PALET 1, PALET 2 | PALET 5 |
| LOTE 30-05.dxf | 5 / 5 | 11 | 11 / 0 | PALET 1, PALET 2, PALET 3 | — |
| LOTE 31-01.dxf | 3 / 3 | 7 | 7 / 0 | PALET 1, PALET 1 | — |
| LOTE 31-10.dxf | 6 / 6 | 33 | 33 / 0 | PALET 1, PALET 2, PALET 3 | — |

**La cifra grande no se puede traducir siempre a NumLine.** Después de reunir las dos columnas hay 726 observaciones con código coincidente y 61 con otro código en ese número de RPS. Otras 7 no tienen número de RPS comprobable o carecen de rótulo de referencia. Son observaciones espaciales de la hoja, no líneas nuevas de RPS. Un encabezado copiado o una renumeración también puede producir la diferencia: no se corrige el pedido por intuición.


| Oficina | Pedido / NumLine comprobados | Código escrito junto a la cifra | Código de RPS en ese número |
| --- | --- | --- | --- |
| LOTE 01-08.dxf | AR.26.02847 / 1 | 430129-0017 | 420102-0002 |
| LOTE 01-08.dxf | AR.26.02847 / 2 | 420102-0002 | 420102-0089 |
| LOTE 01-08.dxf | AR.26.02847 / 3 | 420148-0031 | 420102-0030 |
| LOTE 01-08.dxf | AR.26.02847 / 4 | 420148-0099 | 420102-0092 |
| LOTE 01-08.dxf | AR.26.02847 / 5 | 420148-0104 | 420148-0002 |
| LOTE 01-08.dxf | AR.26.02847 / 6 | 420148-0116 | 420148-0105 |
| LOTE 01-08.dxf | AR.26.02847 / 7 | 420150-0089 | 420150-0007 |
| LOTE 01-08.dxf | AR.26.02847 / 8 | 420150-0089 | 420150-0092 |
| LOTE 01-08.dxf | AR.26.02847 / 9 | 430172-0007 | 430127-0004 |
| LOTE 01-08.dxf | AR.26.02847 / 10 | 430172-0031 | 430127-0014 |
| LOTE 01-08.dxf | AR.26.02847 / 11 | 430172-0035 | 430127-0019 |
| LOTE 08-08.dxf | AR.26.03454 / 1 | 420102-0017 | 420102-0050 |
| LOTE 08-08.dxf | AR.26.03454 / 2 | 420102-0021 | 420102-0030 |
| LOTE 08-08.dxf | AR.26.03454 / 3 | 420102-0034 | 420102-0092 |
| LOTE 08-08.dxf | AR.26.03454 / 4 | 420148-0099 | 420102-0034 |
| LOTE 08-08.dxf | AR.26.03454 / 5 | 420150-0007 | 420148-0018 |
| LOTE 08-08.dxf | AR.26.03454 / 6 | 430127-0002 | 420148-0104 |
| LOTE 08-08.dxf | AR.26.03454 / 7 | 430127-0014 | 420150-0002 |
| LOTE 08-08.dxf | AR.26.03454 / 8 | 430172-0007 | 420150-0021 |
| LOTE 08-08.dxf | AR.26.03454 / 9 | 430172-0034 | 430125-0007 |
| LOTE 08-08.dxf | AR.26.03454 / 10 | 430125-0002 | 430125-0009 |
| LOTE 08-08.dxf | AR.26.03454 / 11 | 420102-0022 | 430127-0004 |
| LOTE 11-04.dxf | AR.26.01277 / 1 | 420102-0002 | 420102-0092 |
| LOTE 11-04.dxf | AR.26.01277 / 2 | 430129-0017 | 430127-0014 |
| LOTE 12-09.dxf | AR.26.04131 / 1 | 420102-0020 | 420102-0021 |
| LOTE 12-09.dxf | AR.26.04131 / 2 | 420102-0021 | 420102-0022 |
| LOTE 14-03.dxf | AR.26.00704 / 2 | 420150-0120 | 420150-0132 |
| LOTE 18-07.dxf | AR.26.02847 / 1 | 420102-0004 | 420102-0002 |
| LOTE 18-07.dxf | AR.26.02847 / 2 | 420102-0017 | 420102-0089 |
| LOTE 18-07.dxf | AR.26.02847 / 3 | 420102-0021 | 420102-0030 |
| LOTE 18-07.dxf | AR.26.02847 / 4 | 420102-0030 | 420102-0092 |
| LOTE 18-07.dxf | AR.26.02847 / 5 | 420102-0034 | 420148-0002 |
| LOTE 18-07.dxf | AR.26.02847 / 6 | 420102-0050 | 420148-0105 |
| LOTE 18-07.dxf | AR.26.02847 / 7 | 420148-0105 | 420150-0007 |
| LOTE 18-07.dxf | AR.26.02847 / 8 | 420150-0001 | 420150-0092 |
| LOTE 18-07.dxf | AR.26.02847 / 9 | 420150-0002 | 430127-0004 |
| LOTE 18-07.dxf | AR.26.02847 / 10 | 420150-0033 | 430127-0014 |
| LOTE 18-07.dxf | AR.26.02847 / 11 | 420150-0088 | 430127-0019 |
| LOTE 18-07.dxf | AR.26.02847 / 12 | 420150-0090 | 430129-0002 |
| LOTE 18-07.dxf | AR.26.02847 / 13 | 420150-0092 | 430129-0017 |
| LOTE 21-03.dxf | AR.26.00703 / 3 | 410173-0106 | 410172-0107 |
| LOTE 21-09.dxf | AR.26.04400 / 3 | 410124-0004 | 410242-0004 |
| LOTE 21-09.dxf | AR.26.04398 / 1 | 420150-0133 | 420148-0117 |
| LOTE 25-04.dxf | AR.26.01408 / 1 | 420150-0090 | 420150-0089 |
| LOTE 25-07.dxf | AR.26.02847 / 1 | 420148-0031 | 420102-0002 |
| LOTE 25-07.dxf | AR.26.02847 / 2 | 420148-0099 | 420102-0089 |
| LOTE 25-07.dxf | AR.26.02847 / 3 | 420150-0002 | 420102-0030 |
| LOTE 25-07.dxf | AR.26.02847 / 4 | 420150-0033 | 420102-0092 |
| LOTE 25-07.dxf | AR.26.02847 / 5 | 420150-0088 | 420148-0002 |
| LOTE 25-07.dxf | AR.26.02847 / 6 | 420150-0090 | 420148-0105 |
| LOTE 25-07.dxf | AR.26.02847 / 7 | 420150-0091 | 420150-0007 |
| LOTE 25-07.dxf | AR.26.02847 / 8 | 430172-0005 | 420150-0092 |
| LOTE 25-07.dxf | AR.26.02847 / 9 | 430172-0007 | 430127-0004 |
| LOTE 25-07.dxf | AR.26.02847 / 10 | 430172-0031 | 430127-0014 |
| LOTE 25-07.dxf | AR.26.02847 / 11 | 410170-0001 | 430127-0019 |
| LOTE 25-07.dxf | AR.26.02847 / 12 | 410171-0001 | 430129-0002 |
| LOTE 25-07.dxf | AR.26.02847 / 13 | 410182-0037 | 430129-0017 |
| LOTE 26-09.dxf | AR.26.04398 / 1 | 420150-0133 | 420148-0117 |
| LOTE 28-02.dxf | AR.26.00526 / 11 | 430127-0007 | 430172-0007 |
| LOTE 29-08.dxf | AR.26.03965 / 4 | 430127-0002 | 430172-0002 |
| LOTE 29-08.dxf | AR.26.03834 / 1 | 430172-0007 | 420102-0050 |

La geometría de oficina está en metros y la de corte en milímetros: el análisis usa el factor 1000 indicado para estas copias, sin fiarse de INSUNITS. El catálogo de confección se entrega en mm. La separación de columnas y los tamaños siguientes son medidas del dibujo, **no una escala de impresión**. La ventana real que se imprime y el orden de mecanizado no se pueden reconstruir a partir de estos textos.


| Separación de columnas en Modelo (m) | Hojas |
| --- | --- |
| 17,451 | 2 |
| 17,525 | 3 |
| 19,452 | 2 |
| 20,378 | 2 |
| 20,379 | 2 |
| 20,431 | 1 |
| 20,432 | 1 |
| 22,108 | 1 |
| 22,248 | 1 |
| 24,584 | 2 |
| 25,439 | 1 |
| 25,471 | 1 |
| 25,603 | 2 |
| 25,839 | 6 |
| 25,91 | 2 |
| 26,491 | 1 |
| 26,648 | 1 |
| 27,228 | 8 |
| 27,229 | 74 |
| 27,414 | 1 |
| 27,597 | 1 |
| 28,183 | 1 |
| 28,184 | 6 |
| 28,896 | 2 |
| 28,908 | 1 |
| 29,438 | 21 |
| 3,02 | 1 |
| 3,23 | 1 |
| 30,771 | 1 |
| 31,975 | 7 |
| 31,976 | 12 |
| 33,105 | 1 |
| 33,169 | 3 |
| 33,958 | 2 |
| 34,642 | 1 |
| 4,493 | 1 |
| 5,518 | 3 |
| 54,015 | 1 |


| Altura de texto de oficina (m) | Apariciones |
| --- | --- |
| 0.2 | 6005 |
| 3 | 2771 |
| 0.1 | 1395 |
| 0.01 | 1307 |
| 0.03 | 763 |
| 0.15 | 470 |
| 0.07 | 273 |
| 0.05 | 244 |
| 0.4 | 203 |
| 0.3 | 163 |
| 0.5 | 151 |
| 0.04 | 96 |
| 0.02 | 61 |
| 0.08 | 37 |
| 0.09 | 30 |

## 2. Palets y reparto

Se cuentan rótulos distintos, sin completar automáticamente los números que faltan. Dos zonas con el mismo rótulo se conservan como duplicación. Se relacionan las cifras y los códigos de las filas de palet con los de la hoja de pedido: una asignación solo se considera identificada si lleva a una única línea real. Las notas de traslado prevalecen sobre la posición del dibujo. No hay un campo de peso en la foto utilizada que permita deducir capacidad, peso máximo ni una fórmula de reparto por unidades.


| Lote de oficina | Rótulos distintos / zonas | Pedidos con filas en varios palets | Líneas identificadas por palet / filas sin vínculo único |
| --- | --- | --- | --- |
| LOTE 01-08.dxf | 2 / 2 | — | PALET 1: 0 / 11; PALET 2: 5 / 2 |
| LOTE 02-05.dxf | 4 / 4 | AR.26.01723: PALET 1+PALET 2+PALET 4; AR.26.01453: PALET 3+PALET 4; AR.26.01387: PALET 3+PALET 4 | PALET 1: 2 / 0; PALET 2: 8 / 0; PALET 3: 8 / 0; PALET 4: 6 / 0 |
| LOTE 03-10.dxf | 3 / 3 | AR.26.04399: PALET 1+PALET 2+PALET 3 | PALET 1: 2 / 1; PALET 2: 3 / 2; PALET 3: 6 / 2 |
| LOTE 04-04.dxf | 2 / 2 | — | PALET 2: 0 / 0; PALET 3: 0 / 0 |
| LOTE 04-07.dxf | 1 / 1 | — | PALET 1: 7 / 6 |
| LOTE 05-09.dxf | 2 / 2 | AR.26.04019: PALET 1+PALET 2 | PALET 1: 5 / 6; PALET 2: 1 / 0 |
| LOTE 06-06.dxf | 4 / 4 | AR.26.02139: PALET 1+PALET 4; AR.26.02244: PALET 1+PALET 2+PALET 4; AR.26.01935: PALET 2+PALET 4 | PALET 1: 2 / 0; PALET 2: 4 / 5; PALET 3: 1 / 2; PALET 4: 7 / 2 |
| LOTE 06-067-03.dxf | 4 / 4 | — | PALET 1: 0 / 0; PALET 2: 0 / 0; PALET 3: 0 / 0; PALET 4: 0 / 0 |
| LOTE 07-02.dxf | 3 / 3 | AR.26.00274: PALET 1+PALET 3; AR.26.00231: PALET 1+PALET 2 | PALET 1: 5 / 5; PALET 2: 2 / 1; PALET 3: 1 / 1 |
| LOTE 07-03.dxf | 4 / 4 | AR.26.00584: PALET 1+PALET 2+PALET 3+PALET 4 | PALET 1: 3 / 6; PALET 2: 1 / 1; PALET 3: 2 / 1; PALET 4: 2 / 1 |
| LOTE 08-08.dxf | 2 / 2 | — | PALET 4: 0 / 3; PALET 5: 0 / 7 |
| LOTE 09-05.dxf | 1 / 1 | — | PALET 1: 2 / 1 |
| LOTE 10-01.dxf | 5 / 5 | AR.25.06229: PALET 3+PALET 4+PALET 5; AR.25.06150: PALET 3+PALET 4; AR.25.06151: PALET 4+PALET 5+PALET 7; AR.25.06301: PALET 4+PALET 5+PALET 6+PALET 7 | PALET 3: 4 / 3; PALET 4: 8 / 4; PALET 5: 4 / 3; PALET 6: 2 / 0; PALET 7: 6 / 2 |
| LOTE 10-10.dxf | 3 / 3 | AR.26.04703: PALET 1+PALET 2+PALET 3; AR.26.04669: PALET 2+PALET 3 | PALET 1: 2 / 0; PALET 2: 6 / 4; PALET 3: 6 / 5 |
| LOTE 11-04.dxf | 2 / 2 | AR.26.01128: PALET 2+PALET 1 | PALET 2: 7 / 5; PALET 1: 4 / 3 |
| LOTE 12-09.dxf | 3 / 3 | AR.26.04131: PALET 1+PALET 2+PALET 3; AR.26.03778: PALET 1+PALET 3; AR.26.03972: PALET 2+PALET 3 | PALET 1: 3 / 0; PALET 2: 4 / 3; PALET 3: 8 / 5 |
| LOTE 13-06.dxf | 4 / 4 | AR.26.02446: PALET 1+PALET 2+PALET 4; AR.26.02447: PALET 1+PALET 3; AR.26.02532: PALET 1+PALET 2 | PALET 1: 3 / 0; PALET 2: 3 / 0; PALET 3: 1 / 2; PALET 4: 10 / 0 |
| LOTE 14-02.dxf | 3 / 3 | — | PALET 1: 4 / 4; PALET 2: 0 / 1; PALET 3: 1 / 0 |
| LOTE 14-03.dxf | 5 / 5 | AR.26.00624: PALET 1+PALET 2; AR.26.00749: PALET 3+PALET 4+PALET 5 | PALET 1: 3 / 2; PALET 2: 3 / 0; PALET 3: 4 / 1; PALET 4: 6 / 1; PALET 5: 2 / 2 |
| LOTE 16-05.dxf | 2 / 2 | — | PALET 1: 2 / 1; PALET 2: 10 / 4 |
| LOTE 17-01.dxf | 0 / 0 | — | sin rótulo |
| LOTE 17-10.dxf | 3 / 3 | AR.26.04884: PALET 1+PALET 2 | PALET 1: 3 / 1; PALET 2: 4 / 3; PALET 3: 5 / 1 |
| LOTE 18-04.dxf | 5 / 5 | AR.26.01169: PALET 1+PALET 5; AR.26.01385: PALET 1+PALET 4; AR.26.01129: PALET 2+PALET 3; AR.26.01294: PALET 3+PALET 4 | PALET 1: 2 / 4; PALET 2: 1 / 0; PALET 3: 4 / 3; PALET 4: 2 / 7; PALET 5: 4 / 3 |
| LOTE 18-07.dxf | 5 / 5 | AR.26.02712: PALET 1+PALET 2 | PALET 1: 4 / 3; PALET 2: 9 / 4; PALET 3: 0 / 2; PALET 4: 0 / 4; PALET 5: 0 / 14 |
| LOTE 19-09.dxf | 0 / 0 | — | sin rótulo |
| LOTE 20-06.dxf | 3 / 3 | AR.26.02857: PALET 2+PALET 3 | PALET 2: 4 / 2; PALET 3: 2 / 2; PALET 1: 0 / 1 |
| LOTE 21-02.dxf | 2 / 2 | AR.26.00397: PALET 1+PALET 2; AR.26.00325: PALET 1+PALET 2 | PALET 1: 3 / 1; PALET 2: 6 / 2 |
| LOTE 21-03.dxf | 4 / 4 | AR.26.00843: PALET 2+PALET 3+PALET 4 | PALET 1: 2 / 3; PALET 2: 6 / 1; PALET 3: 1 / 2; PALET 4: 4 / 1 |
| LOTE 21-09.dxf | 4 / 4 | AR.26.04398: PALET 1+PALET 3; AR.26.04400: PALET 2+PALET 4 | PALET 1: 1 / 0; PALET 2: 1 / 2; PALET 3: 14 / 0; PALET 4: 4 / 1 |
| LOTE 22-08.dxf | 3 / 3 | AR.26.03639: PALET 2+PALET 3 | PALET 1: 1 / 0; PALET 2: 2 / 1; PALET 3: 1 / 2 |
| LOTE 23-05.dxf | 2 / 2 | AR.26.02037: PALET 1+PALET 2 | PALET 1: 1 / 1; PALET 2: 3 / 5 |
| LOTE 24-01.dxf | 1 / 1 | — | PALET 1: 6 / 0 |
| LOTE 24-10.dxf | 3 / 3 | AR.26.04797: PALET 1+PALET 2+PALET 3; AR.26.04734: PALET 2+PALET 3; AR.26.04504: PALET 2+PALET 3 | PALET 1: 1 / 0; PALET 2: 5 / 2; PALET 3: 5 / 0 |
| LOTE 25-04.dxf | 3 / 3 | AR.26.01279: PALET 2+PALET 3; AR.26.01465: PALET 2+PALET 3; AR.26.01386: PALET 2+PALET 3 | PALET 1: 2 / 0; PALET 2: 9 / 3; PALET 3: 5 / 3 |
| LOTE 25-07.dxf | 3 / 3 | — | PALET 5: 2 / 2; PALET 6: 0 / 1; PALET 7: 0 / 9 |
| LOTE 26-09.dxf | 4 / 4 | AR.26.04398: PALET 1+PALET 3; AR.26.04400: PALET 2+PALET 4 | PALET 1: 1 / 0; PALET 2: 1 / 2; PALET 3: 14 / 0; PALET 4: 4 / 0 |
| LOTE 27-06.dxf | 2 / 2 | AR.26.02535: PALET 2+PALET 1; AR.26.02676: PALET 2+PALET 1 | PALET 2: 4 / 4; PALET 1: 7 / 0 |
| LOTE 28-02.dxf | 4 / 4 | AR.26.00526: PALET 1+PALET 2+PALET 3; AR.26.00398: PALET 3+PALET 4 | PALET 1: 2 / 0; PALET 2: 4 / 2; PALET 3: 4 / 2; PALET 4: 1 / 5 |
| LOTE 28-03.dxf | 2 / 2 | AR.26.00843: PALET 1+PALET 2; AR.26.00844: PALET 1+PALET 2; AR.26.00747: PALET 1+PALET 2 | PALET 1: 3 / 4; PALET 2: 4 / 4 |
| LOTE 29-08.dxf | 2 / 2 | — | PALET 1: 1 / 0; PALET 2: 12 / 5 |
| LOTE 30-05.dxf | 3 / 3 | AR.26.01751: PALET 1+PALET 2 | PALET 1: 1 / 0; PALET 2: 3 / 3; PALET 3: 1 / 0 |
| LOTE 31-01.dxf | 1 / 2 | — | PALET 1: 2 / 0; PALET 1: 4 / 1 |
| LOTE 31-10.dxf | 3 / 3 | AR.26.05064: PALET 1+PALET 2; AR.26.04864: PALET 2+PALET 3 | PALET 1: 7 / 4; PALET 2: 7 / 2; PALET 3: 8 / 4 |

El cruce espacial encuentra pedidos en varios palets en 29 planos. Por tanto, **no se debe imponer que todo el pedido vaya en un solo palet**. La prueba literal de reparto y los traslados se pueden revisar aquí:


| Oficina | Nota literal | Palet de la zona | Referencias próximas (no equivalen a asignación) |
| --- | --- | --- | --- |
| LOTE 10-10.dxf | se corta en palet 3 | PALET 2 |  |
| LOTE 22-08.dxf | 45 uds palet 3 | PALET 2 | 420150-0090 |
| LOTE 22-08.dxf | 45 uds palet 2 | PALET 2 |  |
| LOTE 22-08.dxf | 45 uds palet 3 | PALET 3 |  |
| LOTE 22-08.dxf | se corta en palet 3 | PALET 2 |  |
| LOTE 24-10.dxf | se corta en palet 3 | PALET 2 |  |

Caso comprobado: AR.26.03639 / 3, H0K420150-0090, pide 90 unidades; las notas del plano dicen 45 unidades en palet 3 y 45 unidades en palet 2. Es un reparto explícito, no un límite de capacidad deducido del resto de lotes.

## 3. Filas de corte, mezcla de referencias y huecos

Se reconstruyen 1857 pilas candidatas de paños: 392 contienen más de una referencia. Se considera una pila cuando los paños solapan su proyección a lo largo y sus bordes se tocan en el ancho del rollo (tolerancia de lectura de 1 mm). Las parejas unidas se desdoblan por su raya central; no se convierten en una sola unidad. Este método cubre cuerpos rectos rotulados y señala sus límites: no certifica cortinas anchas, accesorios sin rótulo ni contornos curvos.

Los palets forman columnas y dentro de ellas se puede ordenar la presentación por altura descendente. Eso describe **el orden espacial**. El DXF no demuestra el orden de ejecución del CMT. Los rótulos pueden ir encima o dentro de la pieza; los multiplicadores superiores se vinculan por su posición a un grupo concreto. Las sueltas con rótulo interior no heredan el xN de otra fila.


| Archivo de corte (todos) | Palets rotulados | Pilas / mixtas | Grupos / paños candidatos × repetición | Dobles con marca central | Separación entre pilas: mín. / mediana / máx. mm |
| --- | --- | --- | --- | --- | --- |
| 2025/LONA 3 MM.dxf | sin rótulo | 0 / 0 | 0 / 0 | 0 | — |
| 2025/LOTE  01-02.dxf | PALET 2, PALET 1 | 14 / 4 | 20 / 69 | 2 | 7900,09 / 21.300,79 / 22.884,966 |
| 2025/LOTE 01-03.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 21 / 2 | 30 / 275 | 0 | 8459,536 / 11.786,793 / 20.341,74 |
| 2025/LOTE 01-10.dxf | sin rótulo | 0 / 0 | 0 / 0 | 0 | — |
| 2025/LOTE 01-11.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 28 / 8 | 40 / 190 | 2 | 6873,408 / 8085,104 / 37.086,36 |
| 2025/LOTE 02-08.dxf | PALET 2 | 10 / 0 | 11 / 282 | 0 | 6980,14 / 9159,347 / 19.460,882 |
| 2025/LOTE 03-05.dxf | PALET 2, PALET 1 | 0 / 0 | 0 / 0 | 0 | — |
| 2025/LOTE 04-10.dxf | PALET 1, PALET 2, PALET 3 | 18 / 4 | 30 / 156 | 0 | 6493,351 / 9357,183 / 54.778,486 |
| 2025/LOTE 05-04.dxf | PALET 1, PALET 2, PALET 3 | 25 / 8 | 39 / 167 | 1 | 6749,344 / 19.441,124 / 77.502,08 |
| 2025/LOTE 05-07.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 33 / 8 | 48 / 276 | 1 | 6879,804 / 10.530,696 / 23.091,247 |
| 2025/LOTE 06-08.dxf | sin rótulo | 1 / 0 | 1 / 1 | 0 | — |
| 2025/LOTE 06-09.dxf | PALET 1, PALET 2, PALET 3, PALET 4, PALET 5 | 35 / 8 | 51 / 328 | 2 | 6024,101 / 9825,399 / 26.522,052 |
| 2025/LOTE 06-12.dxf | PALET 1 | 15 / 7 | 25 / 76 | 0 | 5927,883 / 18.649,075 / 48.104,118 |
| 2025/LOTE 06-12_RECTIFICADO.dxf | sin rótulo | 0 / 0 | 0 / 0 | 0 | — |
| 2025/LOTE 07-06.dxf | PALET 1, PALET 2, PALET 3 | 29 / 10 | 44 / 188 | 0 | 8665,654 / 20.085,738 / 42.669,187 |
| 2025/LOTE 08-02 (PALET 3_4_5).dxf | PALET 3, PALET 4, PALET 5 | 14 / 2 | 19 / 174 | 1 | 7450,11 / 11.104,75 / 24.984,172 |
| 2025/LOTE 08-03.dxf | PALET 1 | 3 / 1 | 6 / 118 | 0 | 8375,801 / 30.401,89 / 30.401,89 |
| 2025/LOTE 08-11.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 28 / 5 | 38 / 221 | 1 | 7107,511 / 7883,22 / 27.604,233 |
| 2025/LOTE 09-08.dxf | sin rótulo | 0 / 0 | 0 / 0 | 0 | — |
| 2025/LOTE 10-05.dxf | PALET 3, PALET 2, PALET 1, PALET 4, PALET 5, PALET 6, PALET 7 | 60 / 14 | 91 / 349 | 5 | 5131,683 / 7750,862 / 21.338,29 |
| 2025/LOTE 11-01.dxf | PALET 1, PALET 2 | 17 / 5 | 28 / 104 | 2 | 8540,263 / 10.738,28 / 34.391,791 |
| 2025/LOTE 11-10.dxf | PALET 1, PALET 2, PALET 3 | 9 / 2 | 16 / 117 | 0 | 8203,826 / 9739,527 / 10.990,022 |
| 2025/LOTE 12-04.dxf | PALET 2, PALET 3, PALET 4 | 24 / 7 | 40 / 193 | 2 | 7203,152 / 14.138,635 / 44.982,987 |
| 2025/LOTE 12-07.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 27 / 5 | 33 / 181 | 3 | 5540,52 / 7333,903 / 17.632,713 |
| 2025/LOTE 12-07_LINEA JAVIER.dxf | sin rótulo | 1 / 0 | 1 / 33 | 0 | — |
| 2025/LOTE 13-09.dxf | PALET 1, PALET 2, PALET 3, PALET 4, PALET 5, PALET 6, PALET 7, PALET 8, PALET 9 | 57 / 6 | 68 / 641 | 5 | 7609,884 / 10.181,031 / 130.932,724 |
| 2025/LOTE 13-12.dxf | PALET 1 | 8 / 2 | 9 / 68 | 1 | 7991,416 / 8596,427 / 18.410,278 |
| 2025/LOTE 14-06.dxf | PALET 1, PALET 2 | 15 / 0 | 15 / 138 | 0 | 10.583,108 / 12.186,969 / 14.414,471 |
| 2025/LOTE 14-06_1.dxf | sin rótulo | 3 / 0 | 3 / 5 | 0 | — |
| 2025/LOTE 15-02.dxf | PALET 1, PALET 2, PALET 3, PALET 4, PALET 5 | 17 / 3 | 23 / 177 | 1 | 6064,807 / 10.128,158 / 23.699,665 |
| 2025/LOTE 15-03.dxf | PALET 2, PALET 1, PALET 3 | 25 / 7 | 35 / 216 | 1 | 8830,117 / 13.672,316 / 51.782,619 |
| 2025/LOTE 15-11.dxf | PALET 1, PALET 2, PALET 3 | 40 / 10 | 61 / 197 | 3 | 7399,999 / 10.415,393 / 43.635,02 |
| 2025/LOTE 15-11_URGENTE.dxf | sin rótulo | 1 / 0 | 1 / 2 | 0 | — |
| 2025/LOTE 16-04.dxf | PALET 1, PALET 2 | 10 / 2 | 12 / 60 | 1 | 8142,249 / 9407,961 / 9579,265 |
| 2025/LOTE 17-05.dxf | PALET 3, PALET 2, PALET 1, PALET 4 | 11 / 3 | 13 / 43 | 2 | 9972,149 / 14.450,489 / 32.362,416 |
| 2025/LOTE 18-01.dxf | PALET 1, PALET 3 | 19 / 6 | 27 / 221 | 1 | 4004,425 / 7427,226 / 71.875,198 |
| 2025/LOTE 18-10.dxf | PALET 1, PALET 2, PALET 3 | 32 / 7 | 45 / 202 | 3 | 5577,972 / 7646,116 / 23.260,967 |
| 2025/LOTE 19-07.dxf | PALET 1, PALET 2 | 20 / 5 | 31 / 106 | 2 | 7530,055 / 10.038,168 / 31.057,556 |
| 2025/LOTE 20-09.dxf | PALET 1, PALET 2 | 14 / 3 | 20 / 157 | 3 | 5777,259 / 9904,328 / 12.517,184 |
| 2025/LOTE 21-06.dxf | PALET 1, PALET 2 | 10 / 2 | 11 / 92 | 1 | 8182,867 / 9051,547 / 10.658,644 |
| 2025/LOTE 22-02.dxf | PALET 2, PALET 3, PALET 4, PALET 5 | 47 / 8 | 60 / 310 | 2 | 6020,821 / 10.230,093 / 18.501,817 |
| 2025/LOTE 22-03.dxf | PALET 1, PALET 2 | 14 / 1 | 19 / 94 | 0 | 14.585,768 / 29.414,14 / 80.481,512 |
| 2025/LOTE 22-11.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 24 / 4 | 31 / 212 | 4 | 7878,494 / 8258,922 / 21.379,261 |
| 2025/LOTE 22-11_ADICIONALES.dxf | sin rótulo | 1 / 1 | 2 / 2 | 0 | — |
| 2025/LOTE 23-08.dxf | PALET 3, PALET 4, PALET 5, PALET 6 | 19 / 5 | 29 / 253 | 0 | 7530,314 / 16.676,656 / 23.277,157 |
| 2025/LOTE 24-05.dxf | PALET 1, PALET 2, PALET 3, PALET 4, PALET 5, PALET 6 | 54 / 12 | 76 / 392 | 4 | 7474,188 / 13.463,972 / 76.740,91 |
| 2025/LOTE 25-01.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 20 / 4 | 25 / 214 | 1 | 5481,517 / 7771,953 / 43.131,582 |
| 2025/LOTE 25-10.dxf | PALET 1, PALET 2, PALET 3, PALET 4, PALET 5 | 53 / 12 | 73 / 320 | 6 | 5217,697 / 7919,876 / 26.198,095 |
| 2025/LOTE 26-04.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 25 / 9 | 38 / 169 | 1 | 9925,207 / 14.581,645 / 63.087,39 |
| 2025/LOTE 26-07.dxf | PALET 2 | 1 / 0 | 1 / 150 | 0 | — |
| 2025/LOTE 27-09.dxf | sin rótulo | 4 / 1 | 9 / 27 | 0 | 6296,802 / 8818,489 / 8818,489 |
| 2025/LOTE 28-06.dxf | PALET 1, PALET 2 | 10 / 2 | 10 / 103 | 2 | 9973,087 / 15.398,775 / 22.021,559 |
| 2025/LOTE 29-03.dxf | PALET 2, PALET 3 | 20 / 6 | 39 / 127 | 0 | 14.638,39 / 31.898,542 / 105.873,391 |
| 2025/LOTE 29-11.dxf | PALET 1, PALET 4, PALET 5, PALET 6 | 27 / 5 | 37 / 223 | 0 | 6448,053 / 8803,536 / 24.760,162 |
| 2025/LOTE 30-07.dxf | sin rótulo | 1 / 0 | 1 / 6 | 0 | — |
| 2025/LOTE 30-08.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 18 / 3 | 20 / 172 | 1 | 6559,861 / 9644,019 / 28.594,886 |
| 2025/LOTE 31-05.dxf | PALET 1, PALET 2, PALET 3 | 18 / 6 | 27 / 221 | 0 | 9554,89 / 24.419,388 / 34.374,509 |
| 2025/LOTE_08_02 (PALET 1 Y 2).dxf | PALET 1, PALET 2 | 13 / 4 | 18 / 81 | 2 | 9155,677 / 10.303,916 / 21.712,726 |
| 2026/AR2603328.dxf | sin rótulo | 0 / 0 | 0 / 0 | 0 | — |
| 2026/LONA 3 MM.dxf | sin rótulo | 0 / 0 | 0 / 0 | 0 | — |
| 2026/LOTE 01-08.dxf | PALET 1, PALET 2 | 18 / 3 | 20 / 124 | 1 | 8442,556 / 10.254,299 / 22.627,551 |
| 2026/LOTE 02-05.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 29 / 3 | 34 / 180 | 1 | 7494,477 / 9575,015 / 22.469,51 |
| 2026/LOTE 03-10.dxf | PALET 1, PALET 2, PALET 3 | 18 / 4 | 27 / 137 | 0 | 2953,518 / 7083,251 / 18.420,411 |
| 2026/LOTE 04-04.dxf | PALET 2, PALET 3 | 6 / 1 | 6 / 160 | 1 | 21.383,739 / 21.383,739 / 21.383,739 |
| 2026/LOTE 04-07.dxf | PALET 1 | 16 / 5 | 24 / 80 | 1 | 7655,34 / 63.195,993 / 85.551,929 |
| 2026/LOTE 04-07_1.dxf | sin rótulo | 2 / 0 | 1 / 4 | 1 | — |
| 2026/LOTE 05-09.dxf | PALET 1, PALET 2 | 12 / 4 | 18 / 98 | 0 | 9173,191 / 23.981,243 / 30.473,648 |
| 2026/LOTE 06-06.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 24 / 4 | 30 / 228 | 2 | 8858,913 / 12.127,641 / 40.422,326 |
| 2026/LOTE 07-02.dxf | PALET 1, PALET 2, PALET 3 | 16 / 5 | 25 / 160 | 0 | 7009,236 / 9855,515 / 30.495,715 |
| 2026/LOTE 07-03.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 22 / 6 | 32 / 253 | 2 | 2848,633 / 7714,114 / 11.032,134 |
| 2026/LOTE 08-08.dxf | PALET 1, PALET 2 | 27 / 5 | 32 / 114 | 4 | 8211,463 / 10.241,847 / 36.812,745 |
| 2026/LOTE 09-05.dxf | PALET 1 | 7 / 1 | 7 / 85 | 1 | 9863,751 / 10.127,611 / 10.127,611 |
| 2026/LOTE 09-05_2.dxf | sin rótulo | 0 / 0 | 0 / 0 | 0 | — |
| 2026/LOTE 10-01.dxf | sin rótulo | 0 / 0 | 0 / 0 | 0 | — |
| 2026/LOTE 10-01_2.dxf | PALET 3, PALET 4, PALET 5, PALET 6, PALET 7 | 45 / 11 | 63 / 322 | 1 | 7968,776 / 9936,433 / 43.179,466 |
| 2026/LOTE 10-10.dxf | PALET 1, PALET 2, PALET 3 | 19 / 5 | 27 / 157 | 2 | 5666,473 / 8880,076 / 41.433,966 |
| 2026/LOTE 10-10_3.dxf | sin rótulo | 1 / 0 | 1 / 2 | 0 | — |
| 2026/LOTE 11-04.dxf | PALET 2, PALET 1 | 25 / 6 | 32 / 108 | 3 | 5893,719 / 18.164,55 / 30.610,146 |
| 2026/LOTE 12-09.dxf | PALET 1, PALET 2, PALET 3 | 23 / 5 | 32 / 151 | 1 | 9115,314 / 14.425,228 / 46.516,141 |
| 2026/LOTE 14-02.dxf | PALET 1, PALET 2, PALET 3 | 12 / 1 | 13 / 209 | 2 | 6052,957 / 10.054,905 / 12.221,872 |
| 2026/LOTE 14-03.dxf | PALET 1, PALET 2, PALET 3, PALET 4, PALET 5 | 31 / 5 | 36 / 374 | 2 | 6611,566 / 8458,447 / 21.042,002 |
| 2026/LOTE 15-08.dxf | PALET 4, PALET 5 | 19 / 3 | 22 / 189 | 3 | 9526,614 / 23.035,757 / 58.798,025 |
| 2026/LOTE 16-05.dxf | PALET 2 | 14 / 2 | 13 / 44 | 3 | 8709,298 / 12.526,033 / 131.995,527 |
| 2026/LOTE 17-01.dxf | sin rótulo | 3 / 0 | 3 / 7 | 0 | 33.763,707 / 33.763,707 / 33.763,707 |
| 2026/LOTE 17-10.dxf | PALET 1, PALET 2, PALET 3 | 22 / 4 | 26 / 177 | 1 | 25,432 / 8583,649 / 12.041,797 |
| 2026/LOTE 18-07.dxf | PALET 1, PALET 2 | 20 / 6 | 26 / 119 | 2 | 9068,234 / 22.178,541 / 32.546,422 |
| 2026/LOTE 18-07_2.dxf | PALET 3, PALET 4, PALET 5 | 26 / 5 | 29 / 236 | 5 | 8509,458 / 12.482,246 / 88.522,258 |
| 2026/LOTE 19-09.dxf | sin rótulo | 8 / 1 | 9 / 94 | 1 | 6375,845 / 9228,642 / 9964,64 |
| 2026/LOTE 20-06.dxf | PALET 1, PALET 2, PALET 3 | 6 / 0 | 5 / 129 | 1 | 7819,45 / 7819,45 / 7819,45 |
| 2026/LOTE 21-02.dxf | PALET1, PALET2 | 20 / 5 | 30 / 143 | 1 | 9310,541 / 11.312,25 / 13.169,873 |
| 2026/LOTE 21-02_1.dxf | sin rótulo | 0 / 0 | 0 / 0 | 0 | — |
| 2026/LOTE 21-02_2.dxf | sin rótulo | 1 / 0 | 1 / 1 | 0 | — |
| 2026/LOTE 21-03.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 18 / 3 | 23 / 195 | 2 | 20 / 8243,004 / 9187,518 |
| 2026/LOTE 21-09.dxf | sin rótulo | 2 / 0 | 2 / 3 | 0 | 9623,719 / 9623,719 / 9623,719 |
| 2026/LOTE 22-08.dxf | PALET 1, PALET 2, PALET 3 | 4 / 1 | 7 / 152 | 0 | 17.756,5 / 17.756,5 / 17.756,5 |
| 2026/LOTE 24-01.dxf | PALET 1 | 5 / 1 | 7 / 73 | 0 | 4573,632 / 6303,664 / 8812,207 |
| 2026/LOTE 24-10.dxf | PALET 1, PALET 2, PALET 3 | 12 / 3 | 18 / 108 | 0 | 6878,608 / 8846,948 / 19.752,114 |
| 2026/LOTE 25 89.dxf | sin rótulo | 1 / 0 | 1 / 1 | 0 | — |
| 2026/LOTE 25-04.dxf | PALET 1, PALET 2, PALET 3 | 27 / 4 | 34 / 171 | 3 | 3991,848 / 6637,045 / 16.013,092 |
| 2026/LOTE 25-07.dxf | PALET 5, PALET 6, PALET 7 | 12 / 1 | 13 / 74 | 0 | 9230,866 / 10.690,024 / 25.574,633 |
| 2026/LOTE 26-09.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 22 / 6 | 34 / 222 | 2 | 5922,895 / 7594,727 / 27.840,397 |
| 2026/LOTE 27-06 (2).dxf | PALET 1, PALET 2 | 0 / 0 | 0 / 0 | 0 | — |
| 2026/LOTE 27-06_nuevas.dxf | sin rótulo | 2 / 0 | 2 / 3 | 0 | 9068,963 / 9068,963 / 9068,963 |
| 2026/LOTE 28-02.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 21 / 4 | 24 / 228 | 2 | 6075,369 / 7503,972 / 24.670,104 |
| 2026/LOTE 28-02_1.dxf | sin rótulo | 1 / 0 | 1 / 60 | 0 | — |
| 2026/LOTE 28-03.dxf | PALET 1, PALET 2 | 16 / 3 | 23 / 110 | 0 | 8273,004 / 19.696,821 / 30.352,98 |
| 2026/LOTE 29-08.dxf | PALET 1, PALET 2 | 15 / 3 | 19 / 130 | 0 | 6447,807 / 9293,926 / 61.071,224 |
| 2026/LOTE 30-05.dxf | PALET 1, PALET 2, PALET 3 | 18 / 4 | 25 / 176 | 2 | 6369,392 / 8520,785 / 9017,108 |
| 2026/LOTE 31-01.dxf | PALET 1 | 3 / 0 | 3 / 64 | 0 | 9330,692 / 9330,692 / 9330,692 |
| 2026/LOTE 31-01_2.dxf | PALET 1 | 5 / 1 | 6 / 17 | 0 | 8998,013 / 10.714,936 / 10.714,987 |
| 2026/LOTE 31-10.dxf | PALET 1, PALET 2, PALET 3 | 37 / 7 | 49 / 195 | 5 | 4212,252 / 7015,256 / 17.662,032 |
| 2026/LOTE13-06.dxf | PALET 1, PALET 2, PALET 3, PALET 4 | 22 / 2 | 22 / 239 | 3 | 6712,112 / 9639,023 / 25.568,269 |
| 2026/LOTE18-04.dxf | PALET 1, PALET 2, PALET 3, PALET 4, PALET 5 | 39 / 5 | 46 / 320 | 3 | 5997,378 / 8167,85 / 46.814,213 |
| 2026/lote 23-05.dxf | PALET 1, PALET 2 | 11 / 5 | 16 / 98 | 0 | 7642,309 / 7905,774 / 12.257,716 |
| 2026/lote 25_ADRI.dxf | sin rótulo | 1 / 0 | 1 / 3 | 0 | — |
| 2026/lote rocio.dxf | PALET 2 | 8 / 0 | 7 / 48 | 1 | 7494,477 / 9198,735 / 9203,907 |

Combinaciones más repetidas. La lista completa, con coordenadas, alturas, rótulos y multiplicadores de cada fila, está en `analisis.json → cortes[].filas`.


| Referencias en la misma pila | Pilas / archivos distintos | Alturas observadas mm |
| --- | --- | --- |
| 420150-0002 + 420150-0007 | 5 / 5 | 666 |
| 420150-0002 + 420150-0033 | 5 / 5 | 666 |
| 420102-0017 + 420102-0021 | 4 / 3 | 666 |
| 420102-0050 + 430127-0019 | 4 / 4 | 680, 666, 691 |
| 420148-0099 + 420148-0105 | 4 / 4 | 661 |
| 420148-0105 + 420150-0021 | 4 / 4 | 661, 666 |
| 420102-0021 + 430127-0002 | 3 / 3 | 666, 680 |
| 420150-0002 + 420150-0090 | 3 / 3 | 666 |
| 420150-0007 + 420150-0090 | 3 / 3 | 666 |
| 420150-0021 + 430172-0007 | 3 / 3 | 966, 666 |
| 420150-0090 + 420150-0091 | 3 / 3 | 666, 641 |
| 430127-0001 + 430127-0014 | 3 / 3 | 691, 680 |
| 430172-0005 + 430172-0031 | 3 / 3 | 966 |
| 420102-0017 + 420150-0090 | 2 / 2 | 666 |
| 420102-0017 + 430125-0002 | 2 / 2 | 666, 691, 680 |
| 420102-0021 + 420102-0034 | 2 / 2 | 666 |
| 420102-0022 + 420150-0021 | 2 / 2 | 666 |
| 420102-0030 + 420102-0050 | 2 / 2 | 666 |
| 420102-0030 + 430125-0002 | 2 / 1 | 666, 680 |
| 420102-0030 + 430125-0012 | 2 / 2 | 666, 691 |
| 420102-0030 + 430127-0002 | 2 / 2 | 680, 666 |
| 420102-0030 + 430172-0009 | 2 / 2 | 966, 666 |
| 420102-0034 + 420102-0092 | 2 / 2 | 666 |
| 420102-0034 + 420148-0105 | 2 / 2 | 666, 661 |
| 420102-0034 + 420150-0002 | 2 / 2 | 666 |
| 420102-0050 + 430127-0002 | 2 / 2 | 691, 666, 680 |
| 420148-0099 + 430125-0009 | 2 / 2 | 661, 691, 680 |
| 420148-0104 + 420150-0091 | 2 / 2 | 661, 666 |
| 420148-0105 + 420150-0001 | 2 / 2 | 661, 666 |
| 420148-0105 + 420150-0007 | 2 / 2 | 666, 661 |
| 420150-0002 + 420150-0020 | 2 / 2 | 666 |
| 420150-0002 + 420150-0021 | 2 / 2 | 666 |
| 420150-0002 + 420150-0088 | 2 / 2 | 666 |
| 420150-0007 + 420150-0033 | 2 / 2 | 666 |
| 420150-0007 + 420150-0088 | 2 / 2 | 666 |


| Situación del rótulo respecto a los paños de su pila | Apariciones |
| --- | --- |
| Dentro de un paño | 1372 |
| Fuera del interior (normalmente arriba) | 1265 |
| Grupos con xN explícito | 607 |

No hay un hueco universal que se deba añadir entre todas las piezas. Dentro de muchas pilas los bordes se comparten (hueco cero); entre conjuntos hay pasillos variables. La mediana anterior mide separación vertical entre pilas con solape horizontal; **no** es una separación de seguridad ni una tolerancia para generar cortes nuevos.

## 4. Cantidades frente a RPS y notas de stock

Se comparan por referencia las líneas identificadas en las hojas con los paños rotulados × xN. Una referencia repetida en varios pedidos se suma una sola vez por IDOrderLine. Cada salida con sufijo queda separada: no se suman versiones para conseguir una coincidencia. Una ausencia de paños reconstruidos se escribe como «sin lectura de cuerpo», nunca como prueba de que se cortaron cero. Las diferencias son **diferencias de estas candidaturas**; el despiece de accesorios y la fabricación real quedan fuera de esa cuenta.


| Oficina → salida de corte | Refs con RPS y cuerpo: iguales / distintas | Refs sin lectura de cuerpo / sin RPS de hoja | Unidades RPS / paños candidatos (solo comparables) | Notas de stock en oficina |
| --- | --- | --- | --- | --- |
| AR2603328.dxf → 2026/AR2603328.dxf | 0 / 0 | 0 / 0 | 0 / 0 | 0 |
| LOTE 01-08.dxf → 2026/LOTE 01-08.dxf | 4 / 2 | 1 / 9 | 93 / 85 | 1 |
| LOTE 02-05.dxf → 2026/LOTE 02-05.dxf | 8 / 10 | 0 / 0 | 231 / 180 | 0 |
| LOTE 03-10.dxf → 2026/LOTE 03-10.dxf | 13 / 3 | 1 / 0 | 179 / 137 | 0 |
| LOTE 04-04.dxf → 2026/LOTE 04-04.dxf | 1 / 2 | 16 / 1 | 36 / 158 | 0 |
| LOTE 04-07.dxf → 2026/LOTE 04-07.dxf | 10 / 2 | 13 / 0 | 81 / 80 | 2 |
| LOTE 04-07.dxf → 2026/LOTE 04-07_1.dxf | 1 / 0 | 24 / 0 | 4 / 4 | 2 |
| LOTE 05-09.dxf → 2026/LOTE 05-09.dxf | 9 / 2 | 2 / 0 | 100 / 98 | 4 |
| LOTE 06-06.dxf → 2026/LOTE 06-06.dxf | 15 / 4 | 1 / 0 | 211 / 228 | 3 |
| LOTE 07-02.dxf → 2026/LOTE 07-02.dxf | 10 / 4 | 2 / 0 | 216 / 160 | 0 |
| LOTE 07-03.dxf → 2026/LOTE 07-03.dxf | 13 / 3 | 1 / 0 | 249 / 253 | 0 |
| LOTE 08-08.dxf → 2026/LOTE 08-08.dxf | 0 / 0 | 0 / 18 | 0 / 0 | 0 |
| LOTE 09-05.dxf → 2026/LOTE 09-05.dxf | 3 / 0 | 0 / 0 | 85 / 85 | 0 |
| LOTE 09-05.dxf → 2026/LOTE 09-05_2.dxf | 0 / 0 | 3 / 1 | 0 / 0 | 0 |
| LOTE 10-01.dxf → 2026/LOTE 10-01.dxf | 0 / 0 | 27 / 1 | 0 / 0 | 0 |
| LOTE 10-01.dxf → 2026/LOTE 10-01_2.dxf | 24 / 2 | 1 / 0 | 379 / 322 | 0 |
| LOTE 10-10.dxf → 2026/LOTE 10-10.dxf | 13 / 2 | 5 / 0 | 163 / 157 | 1 |
| LOTE 10-10.dxf → 2026/LOTE 10-10_3.dxf | 1 / 0 | 19 / 0 | 2 / 2 | 1 |
| LOTE 11-04.dxf → 2026/LOTE 11-04.dxf | 13 / 4 | 2 / 0 | 166 / 108 | 0 |
| LOTE 12-09.dxf → 2026/LOTE 12-09.dxf | 17 / 1 | 0 / 3 | 151 / 149 | 0 |
| LOTE 13-06.dxf → 2026/LOTE13-06.dxf | 15 / 1 | 5 / 0 | 373 / 239 | 0 |
| LOTE 14-02.dxf → 2026/LOTE 14-02.dxf | 7 / 1 | 0 / 0 | 208 / 209 | 0 |
| LOTE 14-03.dxf → 2026/LOTE 14-03.dxf | 18 / 2 | 2 / 2 | 349 / 368 | 0 |
| LOTE 16-05.dxf → 2026/LOTE 16-05.dxf | 7 / 3 | 8 / 0 | 53 / 44 | 1 |
| LOTE 17-01.dxf → 2026/LOTE 17-01.dxf | 1 / 1 | 5 / 1 | 10 / 7 | 0 |
| LOTE 17-10.dxf → 2026/LOTE 17-10.dxf | 12 / 1 | 1 / 0 | 186 / 177 | 0 |
| LOTE 18-04.dxf → 2026/LOTE18-04.dxf | 11 / 13 | 0 / 0 | 336 / 320 | 5 |
| LOTE 18-07.dxf → 2026/LOTE 18-07.dxf | 12 / 5 | 2 / 0 | 127 / 119 | 0 |
| LOTE 18-07.dxf → 2026/LOTE 18-07_2.dxf | 0 / 10 | 9 / 9 | 104 / 128 | 0 |
| LOTE 19-09.dxf → 2026/LOTE 19-09.dxf | 7 / 0 | 2 / 0 | 94 / 94 | 1 |
| LOTE 20-06.dxf → 2026/LOTE 20-06.dxf | 2 / 2 | 7 / 0 | 140 / 129 | 2 |
| LOTE 21-02.dxf → 2026/LOTE 21-02.dxf | 9 / 2 | 0 / 0 | 151 / 143 | 0 |
| LOTE 21-02.dxf → 2026/LOTE 21-02_1.dxf | 0 / 0 | 11 / 1 | 0 / 0 | 0 |
| LOTE 21-02.dxf → 2026/LOTE 21-02_2.dxf | 0 / 1 | 10 / 0 | 4 / 1 | 0 |
| LOTE 21-03.dxf → 2026/LOTE 21-03.dxf | 9 / 3 | 12 / 0 | 205 / 195 | 0 |
| LOTE 21-09.dxf → 2026/LOTE 21-09.dxf | 1 / 1 | 18 / 0 | 5 / 3 | 0 |
| LOTE 22-08.dxf → 2026/LOTE 22-08.dxf | 6 / 0 | 0 / 0 | 152 / 152 | 0 |
| LOTE 23-05.dxf → 2026/lote 23-05.dxf | 8 / 0 | 3 / 2 | 92 / 92 | 0 |
| LOTE 24-01.dxf → 2026/LOTE 24-01.dxf | 4 / 1 | 1 / 0 | 79 / 73 | 0 |
| LOTE 24-10.dxf → 2026/LOTE 24-10.dxf | 6 / 3 | 1 / 0 | 115 / 108 | 2 |
| LOTE 25-04.dxf → 2026/LOTE 25-04.dxf | 9 / 7 | 0 / 1 | 200 / 170 | 0 |
| LOTE 25-07.dxf → 2026/LOTE 25-07.dxf | 1 / 1 | 1 / 12 | 4 / 5 | 0 |
| LOTE 26-09.dxf → 2026/LOTE 26-09.dxf | 14 / 1 | 4 / 1 | 161 / 162 | 0 |
| LOTE 27-06.dxf → 2026/LOTE 27-06 (2).dxf | 0 / 0 | 13 / 0 | 0 / 0 | 0 |
| LOTE 27-06.dxf → 2026/LOTE 27-06_nuevas.dxf | 0 / 0 | 13 / 2 | 0 / 0 | 0 |
| LOTE 28-02.dxf → 2026/LOTE 28-02.dxf | 12 / 1 | 4 / 2 | 255 / 228 | 0 |
| LOTE 28-02.dxf → 2026/LOTE 28-02_1.dxf | 1 / 0 | 16 / 0 | 60 / 60 | 0 |
| LOTE 28-03.dxf → 2026/LOTE 28-03.dxf | 6 / 5 | 10 / 1 | 224 / 110 | 6 |
| LOTE 29-08.dxf → 2026/LOTE 29-08.dxf | 10 / 3 | 2 / 0 | 134 / 130 | 3 |
| LOTE 30-05.dxf → 2026/LOTE 30-05.dxf | 7 / 3 | 0 / 0 | 225 / 176 | 0 |
| LOTE 31-01.dxf → 2026/LOTE 31-01.dxf | 2 / 0 | 5 / 0 | 64 / 64 | 0 |
| LOTE 31-01.dxf → 2026/LOTE 31-01_2.dxf | 5 / 0 | 2 / 0 | 17 / 17 | 0 |
| LOTE 31-10.dxf → 2026/LOTE 31-10.dxf | 26 / 2 | 0 / 0 | 197 / 195 | 2 |

Las diferencias por referencia quedan todas enumeradas aquí; el detalle de cada línea/OF se conserva en los JSON. Un código sin RPS de hoja o sin lectura de cuerpo necesita revisión, aunque otro código del mismo archivo cuadre.


| Salida | Referencia | Líneas de RPS comprobadas | RPS / paños candidatos | Lectura |
| --- | --- | --- | --- | --- |
| 2026/LOTE 01-08.dxf | 420148-0003 | AR.26.03638 / 2 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 01-08.dxf | 430127-0002 | AR.26.03638 / 5 | 20 / 2 | saldo -18 |
| 2026/LOTE 01-08.dxf | 430172-0007 | AR.26.03638 / 7 | 15 / 25 | saldo 10 |
| 2026/LOTE 02-05.dxf | 430125-0002 | AR.26.01280 / 3; AR.26.01387 / 6 | 10 / 9 | saldo -1 |
| 2026/LOTE 02-05.dxf | 420150-0002 | AR.26.01387 / 1; AR.26.01723 / 3 | 25 / 24 | saldo -1 |
| 2026/LOTE 02-05.dxf | 420150-0090 | AR.26.01387 / 2; AR.26.01453 / 3; AR.26.01723 / 7 | 55 / 38 | saldo -17 |
| 2026/LOTE 02-05.dxf | 430172-0007 | AR.26.01387 / 5; AR.26.01723 / 9 | 35 / 34 | saldo -1 |
| 2026/LOTE 02-05.dxf | 420150-0091 | AR.26.01453 / 4 | 5 / 6 | saldo 1 |
| 2026/LOTE 02-05.dxf | 420102-0021 | AR.26.01723 / 1 | 10 / 9 | saldo -1 |
| 2026/LOTE 02-05.dxf | 420148-0105 | AR.26.01723 / 2 | 10 / 9 | saldo -1 |
| 2026/LOTE 02-05.dxf | 420150-0007 | AR.26.01723 / 4 | 4 / 3 | saldo -1 |
| 2026/LOTE 02-05.dxf | 420150-0020 | AR.26.01723 / 5 | 10 / 9 | saldo -1 |
| 2026/LOTE 02-05.dxf | 430172-0034 | AR.26.01723 / 11 | 30 / 2 | saldo -28 |
| 2026/LOTE 03-10.dxf | 420102-0021 | AR.26.04399 / 1 | 10 / 4 | saldo -6 |
| 2026/LOTE 03-10.dxf | 420102-0060 | AR.26.04399 / 2 | 36 / 12 | saldo -24 |
| 2026/LOTE 03-10.dxf | 430127-0002 | AR.26.04399 / 9 | 26 / 14 | saldo -12 |
| 2026/LOTE 03-10.dxf | 410130-0177 | AR.26.04650 / 1 | 14 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 410134-0002 | AR.26.01070 / 1 | 45 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 420148-0105 | AR.26.01128 / 1 | 8 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 420150-0007 | AR.26.01128 / 2 | 20 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 420102-0092 | AR.26.01128 / 3; AR.26.01166 / 1 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 420150-0021 | AR.26.01128 / 4 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 430172-0007 | AR.26.01128 / 6 | 39 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 420150-0092 | AR.26.01128 / 7 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 430172-0031 | AR.26.01128 / 8 | 3 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 420102-0050 | AR.26.01128 / 9 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 430127-0014 | AR.26.01166 / 2 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 420150-0033 | AR.26.01167 / 1 | 6 / 2 | saldo -4 |
| 2026/LOTE 04-04.dxf | 420102-0030 | AR.26.01168 / 1 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 420148-0018 | AR.26.01168 / 2 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 420102-0034 | AR.26.01168 / 3 | 20 / 146 | saldo 126 |
| 2026/LOTE 04-04.dxf | 420150-0020 | AR.26.01168 / 4 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 430127-0001 | AR.26.01168 / 5 | 5 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 430127-0019 | AR.26.01168 / 6 | 3 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-04.dxf | 430172-0030 | AR.26.01168 / 7 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 430125-0002 | AR.26.02677 / 1 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 420102-0002 | AR.26.02847 / 1 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 420102-0089 | AR.26.02847 / 2 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 420102-0030 | AR.26.02847 / 3 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 420102-0092 | AR.26.02847 / 4 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 420148-0002 | AR.26.02847 / 5 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 420150-0007 | AR.26.02847 / 7 | 20 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 420150-0092 | AR.26.02847 / 8 | 13 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 430127-0004 | AR.26.02847 / 9 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 430127-0014 | AR.26.02847 / 10; AR.26.03061 / 9 | 7 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 430127-0019 | AR.26.02847 / 11 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 430129-0002 | AR.26.02847 / 12 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 430129-0017 | AR.26.02847 / 13 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07.dxf | 420102-0022 | AR.26.03061 / 2 | 2 / 3 | saldo 1 |
| 2026/LOTE 04-07.dxf | 420150-0090 | AR.26.03061 / 6 | 5 / 3 | saldo -2 |
| 2026/LOTE 04-07_1.dxf | 430125-0002 | AR.26.02677 / 1 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420148-0033 | AR.26.02677 / 2; AR.26.03061 / 7 | 14 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420150-0033 | AR.26.02677 / 3 | 5 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420102-0050 | AR.26.02677 / 4 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420148-0117 | AR.26.02730 / 1 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420102-0089 | AR.26.02847 / 2 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420102-0030 | AR.26.02847 / 3 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420102-0092 | AR.26.02847 / 4 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420148-0002 | AR.26.02847 / 5 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420148-0105 | AR.26.02847 / 6; AR.26.03061 / 3 | 24 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420150-0007 | AR.26.02847 / 7 | 20 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420150-0092 | AR.26.02847 / 8 | 13 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 430127-0004 | AR.26.02847 / 9 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 430127-0014 | AR.26.02847 / 10; AR.26.03061 / 9 | 7 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 430127-0019 | AR.26.02847 / 11 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 430129-0002 | AR.26.02847 / 12 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 430129-0017 | AR.26.02847 / 13 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420102-0017 | AR.26.03061 / 1 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420102-0022 | AR.26.03061 / 2 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420148-0120 | AR.26.03061 / 4 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420150-0088 | AR.26.03061 / 5 | 5 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420150-0090 | AR.26.03061 / 6 | 5 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 420148-0099 | AR.26.03061 / 8 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 04-07_1.dxf | 430125-0009 | AR.26.03061 / 10 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 05-09.dxf | 420150-0089 | AR.26.03971 / 1 | 11 / 10 | saldo -1 |
| 2026/LOTE 05-09.dxf | 420150-0021 | AR.26.03971 / 2 | 20 / 19 | saldo -1 |
| 2026/LOTE 05-09.dxf | 420102-0092 | AR.26.04019 / 3 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 05-09.dxf | 430172-0032 | AR.26.04019 / 10 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 06-06.dxf | 420150-0033 | AR.26.01935 / 3 | 35 / 34 | saldo -1 |
| 2026/LOTE 06-06.dxf | 430127-0014 | AR.26.01935 / 5 | 3 / ? | sin lectura de cuerpo |
| 2026/LOTE 06-06.dxf | 420148-0116 | AR.26.02139 / 1; AR.26.02244 / 3 | 47 / 69 | saldo 22 |
| 2026/LOTE 06-06.dxf | 430172-0007 | AR.26.02244 / 8 | 6 / 4 | saldo -2 |
| 2026/LOTE 06-06.dxf | 430125-0002 | AR.26.02244 / 9 | 15 / 13 | saldo -2 |
| 2026/LOTE 07-02.dxf | 420150-0002 | AR.26.00231 / 4; AR.26.00325 / 3 | 34 / 8 | saldo -26 |
| 2026/LOTE 07-02.dxf | 420150-0090 | AR.26.00231 / 5; AR.26.00325 / 5 | 44 / 24 | saldo -20 |
| 2026/LOTE 07-02.dxf | 420148-0116 | AR.26.00274 / 3; AR.26.00325 / 2 | 17 / 11 | saldo -6 |
| 2026/LOTE 07-02.dxf | 420150-0092 | AR.26.00274 / 5 | 3 / ? | sin lectura de cuerpo |
| 2026/LOTE 07-02.dxf | 430127-0014 | AR.26.00323 / 1; AR.26.00325 / 4 | 5 / 1 | saldo -4 |
| 2026/LOTE 07-02.dxf | 420102-0034 | AR.26.00325 / 1 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 07-03.dxf | 420102-0086 | AR.26.00584 / 3 | 2 / 4 | saldo 2 |
| 2026/LOTE 07-03.dxf | 420150-0021 | AR.26.00584 / 6 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 07-03.dxf | 430172-0031 | AR.26.00584 / 13 | 1 / 2 | saldo 1 |
| 2026/LOTE 07-03.dxf | 430172-0033 | AR.26.00584 / 14 | 5 / 6 | saldo 1 |
| 2026/LOTE 09-05_2.dxf | 430172-0031 | AR.26.01750 / 1 | 25 / ? | sin lectura de cuerpo |
| 2026/LOTE 09-05_2.dxf | 420102-0021 | AR.26.01933 / 1 | 35 / ? | sin lectura de cuerpo |
| 2026/LOTE 09-05_2.dxf | 430127-0002 | AR.26.01933 / 2 | 25 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420102-0001 | AR.25.06150 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420148-0105 | AR.25.06150 / 2; AR.25.06301 / 3; AR.25.06315 / 1 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420150-0021 | AR.25.06150 / 3; AR.25.06315 / 3 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420150-0033 | AR.25.06150 / 4; AR.25.06229 / 6; AR.25.06301 / 5; AR.25.06315 / 4 | 117 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420150-0089 | AR.25.06150 / 5 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 430125-0002 | AR.25.06150 / 6; AR.25.06301 / 9 | 21 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 430125-0009 | AR.25.06150 / 7 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420102-0021 | AR.25.06151 / 1 | 26 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420148-0099 | AR.25.06151 / 2 | 22 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420148-0111 | AR.25.06151 / 3 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420150-0090 | AR.25.06151 / 4; AR.25.06301 / 6; AR.25.06301 / 7; AR.25.06315 / 5 | 22 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420150-0091 | AR.25.06151 / 5 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 430127-0014 | AR.25.06151 / 6; AR.25.06327 / 1 | 12 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 430172-0031 | AR.25.06151 / 7 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420102-0034 | AR.25.06229 / 1 | 52 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 430125-0007 | AR.25.06229 / 2 | 8 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 430172-0005 | AR.25.06229 / 3 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 430172-0035 | AR.25.06229 / 4 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420150-0002 | AR.25.06229 / 5; AR.25.06301 / 4 | 8 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420150-0007 | AR.25.06229 / 7; AR.25.06315 / 2 | 11 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420102-0017 | AR.25.06301 / 1 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420102-0092 | AR.25.06301 / 2 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420150-0092 | AR.25.06301 / 8 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 430127-0001 | AR.25.06301 / 10 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 430172-0002 | AR.25.06301 / 11 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 430172-0007 | AR.25.06301 / 12 | 23 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01.dxf | 420150-0129 | AR.25.06326 / 1 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-01_2.dxf | 420150-0033 | AR.25.06150 / 4; AR.25.06229 / 6; AR.25.06301 / 5; AR.25.06315 / 4 | 117 / 75 | saldo -42 |
| 2026/LOTE 10-01_2.dxf | 430125-0002 | AR.25.06150 / 6; AR.25.06301 / 9 | 21 / 6 | saldo -15 |
| 2026/LOTE 10-01_2.dxf | 420102-0017 | AR.25.06301 / 1 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10.dxf | 430127-0014 | AR.26.04669 / 5; AR.26.04710 / 4; AR.26.04796 / 2 | 7 / 3 | saldo -4 |
| 2026/LOTE 10-10.dxf | 420150-0002 | AR.26.04703 / 3; AR.26.04710 / 2 | 11 / 9 | saldo -2 |
| 2026/LOTE 10-10.dxf | 430125-0002 | AR.26.04710 / 5 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10.dxf | 410155-0002 | AR.26.04772 / 2 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10.dxf | 420102-0085 | AR.26.04796 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10.dxf | 430129-0002 | AR.26.04796 / 3 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10.dxf | 430172-0031 | AR.26.04960 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420102-0022 | AR.26.04669 / 1 | 8 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420102-0050 | AR.26.04669 / 2 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420148-0099 | AR.26.04669 / 3; AR.26.04703 / 1 | 32 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420150-0021 | AR.26.04669 / 4 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 430127-0014 | AR.26.04669 / 5; AR.26.04710 / 4; AR.26.04796 / 2 | 7 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 430172-0009 | AR.26.04669 / 6 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420150-0001 | AR.26.04703 / 2 | 8 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420150-0002 | AR.26.04703 / 3; AR.26.04710 / 2 | 11 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420150-0007 | AR.26.04703 / 4 | 15 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420150-0090 | AR.26.04703 / 5 | 30 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 430172-0007 | AR.26.04703 / 6 | 5 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 430127-0001 | AR.26.04703 / 7 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420102-0030 | AR.26.04710 / 1 | 16 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420150-0033 | AR.26.04710 / 3 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 430125-0002 | AR.26.04710 / 5 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420148-0105 | AR.26.04772 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 410155-0002 | AR.26.04772 / 2 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 420102-0085 | AR.26.04796 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 10-10_3.dxf | 430129-0002 | AR.26.04796 / 3 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 11-04.dxf | 410134-0002 | AR.26.01070 / 1 | 45 / ? | sin lectura de cuerpo |
| 2026/LOTE 11-04.dxf | 420102-0092 | AR.26.01128 / 3; AR.26.01166 / 1; AR.26.01277 / 1 | 8 / 7 | saldo -1 |
| 2026/LOTE 11-04.dxf | 430172-0007 | AR.26.01128 / 6; AR.26.01277 / 3 | 54 / 5 | saldo -49 |
| 2026/LOTE 11-04.dxf | 430127-0014 | AR.26.01166 / 2; AR.26.01277 / 2 | 7 / 2 | saldo -5 |
| 2026/LOTE 11-04.dxf | 420150-0033 | AR.26.01167 / 1 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 11-04.dxf | 430127-0001 | AR.26.01168 / 5 | 5 / 2 | saldo -3 |
| 2026/LOTE 12-09.dxf | 420102-0017 | AR.26.03972 / 2 | 6 / 4 | saldo -2 |
| 2026/LOTE13-06.dxf | 420102-0034 | AR.26.01722 / 1; AR.26.02447 / 1 | 140 / 6 | saldo -134 |
| 2026/LOTE13-06.dxf | 420150-0092 | AR.26.01722 / 2 | 3 / ? | sin lectura de cuerpo |
| 2026/LOTE13-06.dxf | 430125-0002 | AR.26.01722 / 4 | 35 / ? | sin lectura de cuerpo |
| 2026/LOTE13-06.dxf | 410143-0002 | AR.26.02532 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE13-06.dxf | 410172-0104 | AR.26.02532 / 2 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE13-06.dxf | 410173-0104 | AR.26.02532 / 3 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 14-02.dxf | 420150-0130 | AR.26.00474 / 1 | 1 / 2 | saldo 1 |
| 2026/LOTE 14-03.dxf | 430127-0002 | AR.26.00624 / 4 | 10 / 30 | saldo 20 |
| 2026/LOTE 14-03.dxf | 410129-0211 | AR.26.00704 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 14-03.dxf | 420102-0042 | AR.26.00704 / 3 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 14-03.dxf | 430127-0001 | AR.26.00749 / 10 | 2 / 1 | saldo -1 |
| 2026/LOTE 16-05.dxf | 430172-0031 | AR.26.01750 / 1 | 25 / ? | sin lectura de cuerpo |
| 2026/LOTE 16-05.dxf | 420150-0001 | AR.26.01783 / 1 | 5 / 3 | saldo -2 |
| 2026/LOTE 16-05.dxf | 420150-0092 | AR.26.01783 / 3 | 16 / 11 | saldo -5 |
| 2026/LOTE 16-05.dxf | 420150-0091 | AR.26.01901 / 4 | 5 / 3 | saldo -2 |
| 2026/LOTE 16-05.dxf | 430127-0001 | AR.26.01901 / 6 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 16-05.dxf | 430127-0014 | AR.26.01901 / 7 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 16-05.dxf | 430127-0019 | AR.26.01901 / 8 | 3 / ? | sin lectura de cuerpo |
| 2026/LOTE 16-05.dxf | 420102-0021 | AR.26.01933 / 1 | 35 / ? | sin lectura de cuerpo |
| 2026/LOTE 16-05.dxf | 430127-0002 | AR.26.01933 / 2 | 25 / ? | sin lectura de cuerpo |
| 2026/LOTE 16-05.dxf | 410129-0213 | AR.26.02090 / 1 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 16-05.dxf | 420148-0002 | AR.26.02093 / 1 | 15 / ? | sin lectura de cuerpo |
| 2026/LOTE 17-01.dxf | 430172-0007 | AR.25.06097 / 1 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 17-01.dxf | 420150-0002 | AR.25.06228 / 1 | 5 / 2 | saldo -3 |
| 2026/LOTE 17-01.dxf | — | AR.25.06366 / 1; AR.25.06366 / 2; AR.25.06366 / 3 | 24 / ? | sin lectura de cuerpo |
| 2026/LOTE 17-01.dxf | 420102-0089 | AR.25.06388 / 2 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 17-01.dxf | 420150-0090 | AR.25.06388 / 3 | 18 / ? | sin lectura de cuerpo |
| 2026/LOTE 17-01.dxf | 420150-0091 | AR.25.06388 / 4 | 9 / ? | sin lectura de cuerpo |
| 2026/LOTE 17-10.dxf | 420102-0022 | AR.26.04884 / 1; AR.26.04949 / 1 | 14 / 5 | saldo -9 |
| 2026/LOTE 17-10.dxf | 430127-0001 | AR.26.04884 / 5 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE18-04.dxf | 430127-0002 | AR.26.01129 / 1; AR.26.01169 / 3 | 47 / 35 | saldo -12 |
| 2026/LOTE18-04.dxf | 420150-0033 | AR.26.01167 / 1; AR.26.01405 / 1 | 11 / 10 | saldo -1 |
| 2026/LOTE18-04.dxf | 420150-0021 | AR.26.01170 / 1; AR.26.01264 / 1; AR.26.01385 / 3 | 18 / 17 | saldo -1 |
| 2026/LOTE18-04.dxf | 420102-0092 | AR.26.01277 / 1 | 2 / 1 | saldo -1 |
| 2026/LOTE18-04.dxf | 430127-0014 | AR.26.01277 / 2 | 5 / 4 | saldo -1 |
| 2026/LOTE18-04.dxf | 420148-0033 | AR.26.01278 / 1 | 10 / 33 | saldo 23 |
| 2026/LOTE18-04.dxf | 420102-0016 | AR.26.01294 / 1 | 12 / 4 | saldo -8 |
| 2026/LOTE18-04.dxf | 420102-0034 | AR.26.01294 / 3 | 2 / 1 | saldo -1 |
| 2026/LOTE18-04.dxf | 420102-0050 | AR.26.01294 / 4 | 10 / 4 | saldo -6 |
| 2026/LOTE18-04.dxf | 420102-0086 | AR.26.01294 / 5 | 10 / 6 | saldo -4 |
| 2026/LOTE18-04.dxf | 430125-0004 | AR.26.01294 / 7 | 11 / 7 | saldo -4 |
| 2026/LOTE18-04.dxf | 420150-0089 | AR.26.01385 / 4; AR.26.01406 / 1 | 3 / 2 | saldo -1 |
| 2026/LOTE18-04.dxf | 430127-0001 | AR.26.01385 / 6 | 1 / 2 | saldo 1 |
| 2026/LOTE 18-07.dxf | 420102-0017 | AR.26.02712 / 1 | 4 / 6 | saldo 2 |
| 2026/LOTE 18-07.dxf | 420102-0021 | AR.26.02712 / 2 | 4 / 6 | saldo 2 |
| 2026/LOTE 18-07.dxf | 430127-0014 | AR.26.02712 / 8; AR.26.02847 / 10 | 5 / 2 | saldo -3 |
| 2026/LOTE 18-07.dxf | 430127-0019 | AR.26.02712 / 9; AR.26.02847 / 11 | 2 / 1 | saldo -1 |
| 2026/LOTE 18-07.dxf | 430172-0031 | AR.26.02712 / 10 | 10 / 2 | saldo -8 |
| 2026/LOTE 18-07.dxf | 420102-0002 | AR.26.02847 / 1 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 18-07.dxf | 420148-0105 | AR.26.02847 / 6 | 23 / ? | sin lectura de cuerpo |
| 2026/LOTE 18-07_2.dxf | 420102-0017 | AR.26.02712 / 1 | 4 / 6 | saldo 2 |
| 2026/LOTE 18-07_2.dxf | 420102-0021 | AR.26.02712 / 2 | 4 / 12 | saldo 8 |
| 2026/LOTE 18-07_2.dxf | 420102-0092 | AR.26.02712 / 3; AR.26.02847 / 4 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 18-07_2.dxf | 420150-0002 | AR.26.02712 / 4 | 25 / 20 | saldo -5 |
| 2026/LOTE 18-07_2.dxf | 420150-0090 | AR.26.02712 / 5 | 25 / 59 | saldo 34 |
| 2026/LOTE 18-07_2.dxf | 430127-0001 | AR.26.02712 / 6 | 1 / 2 | saldo 1 |
| 2026/LOTE 18-07_2.dxf | 430127-0004 | AR.26.02712 / 7; AR.26.02847 / 9 | 3 / ? | sin lectura de cuerpo |
| 2026/LOTE 18-07_2.dxf | 430127-0014 | AR.26.02712 / 8; AR.26.02847 / 10 | 5 / 6 | saldo 1 |
| 2026/LOTE 18-07_2.dxf | 430127-0019 | AR.26.02712 / 9; AR.26.02847 / 11 | 2 / 5 | saldo 3 |
| 2026/LOTE 18-07_2.dxf | 430172-0031 | AR.26.02712 / 10 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 18-07_2.dxf | 420102-0002 | AR.26.02847 / 1 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 18-07_2.dxf | 420102-0089 | AR.26.02847 / 2 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 18-07_2.dxf | 420102-0030 | AR.26.02847 / 3 | 2 / 12 | saldo 10 |
| 2026/LOTE 18-07_2.dxf | 420148-0002 | AR.26.02847 / 5 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 18-07_2.dxf | 420148-0105 | AR.26.02847 / 6 | 23 / 5 | saldo -18 |
| 2026/LOTE 18-07_2.dxf | 420150-0007 | AR.26.02847 / 7 | 20 / ? | sin lectura de cuerpo |
| 2026/LOTE 18-07_2.dxf | 420150-0092 | AR.26.02847 / 8 | 13 / 1 | saldo -12 |
| 2026/LOTE 18-07_2.dxf | 430129-0002 | AR.26.02847 / 12 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 18-07_2.dxf | 430129-0017 | AR.26.02847 / 13 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 19-09.dxf | 420102-0022 | AR.26.04397 / 2 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 19-09.dxf | 430125-0002 | AR.26.04502 / 1 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 20-06.dxf | 410123-0004 | AR.26.02150 / 1 | 7 / ? | sin lectura de cuerpo |
| 2026/LOTE 20-06.dxf | 410241-0014 | AR.26.02150 / 2 | 7 / ? | sin lectura de cuerpo |
| 2026/LOTE 20-06.dxf | 410242-0007 | AR.26.02150 / 3 | 7 / ? | sin lectura de cuerpo |
| 2026/LOTE 20-06.dxf | 410245-0005 | AR.26.02150 / 4 | 7 / ? | sin lectura de cuerpo |
| 2026/LOTE 20-06.dxf | 420150-0090 | AR.26.02448 / 2; AR.26.02678 / 1 | 70 / 57 | saldo -13 |
| 2026/LOTE 20-06.dxf | 420102-0050 | AR.26.02679 / 1 | 10 / 12 | saldo 2 |
| 2026/LOTE 20-06.dxf | 430127-0014 | AR.26.02679 / 2 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 20-06.dxf | 410130-0088 | AR.26.02857 / 1 | 14 / ? | sin lectura de cuerpo |
| 2026/LOTE 20-06.dxf | — | AR.26.02857 / 2 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02.dxf | 420102-0034 | AR.26.00325 / 1; AR.26.00397 / 2 | 20 / 14 | saldo -6 |
| 2026/LOTE 21-02.dxf | 430127-0014 | AR.26.00325 / 4 | 4 / 2 | saldo -2 |
| 2026/LOTE 21-02_1.dxf | 420102-0034 | AR.26.00325 / 1; AR.26.00397 / 2 | 20 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_1.dxf | 420148-0116 | AR.26.00325 / 2 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_1.dxf | 420150-0002 | AR.26.00325 / 3; AR.26.00397 / 1 | 46 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_1.dxf | 430127-0014 | AR.26.00325 / 4 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_1.dxf | 420150-0090 | AR.26.00325 / 5 | 20 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_1.dxf | 420150-0089 | AR.26.00397 / 3 | 11 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_1.dxf | 430172-0007 | AR.26.00397 / 5 | 9 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_1.dxf | 430172-0030 | AR.26.00397 / 6 | 3 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_1.dxf | 430125-0002 | AR.26.00397 / 7 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_1.dxf | 420150-0033 | AR.26.00475 / 1; AR.26.00496 / 2 | 26 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_1.dxf | 420150-0131 | AR.26.00496 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_2.dxf | 420102-0034 | AR.26.00325 / 1; AR.26.00397 / 2 | 20 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_2.dxf | 420148-0116 | AR.26.00325 / 2 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_2.dxf | 420150-0002 | AR.26.00325 / 3; AR.26.00397 / 1 | 46 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_2.dxf | 430127-0014 | AR.26.00325 / 4 | 4 / 1 | saldo -3 |
| 2026/LOTE 21-02_2.dxf | 420150-0090 | AR.26.00325 / 5 | 20 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_2.dxf | 420150-0089 | AR.26.00397 / 3 | 11 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_2.dxf | 430172-0007 | AR.26.00397 / 5 | 9 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_2.dxf | 430172-0030 | AR.26.00397 / 6 | 3 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_2.dxf | 430125-0002 | AR.26.00397 / 7 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_2.dxf | 420150-0033 | AR.26.00475 / 1; AR.26.00496 / 2 | 26 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-02_2.dxf | 420150-0131 | AR.26.00496 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 410129-0212 | AR.26.00703 / 1 | 8 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 410130-0176 | AR.26.00703 / 2 | 16 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 410172-0107 | AR.26.00703 / 3 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 410173-0106 | AR.26.00703 / 4 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 410182-0038 | AR.26.00703 / 5 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 420102-0017 | AR.26.00747 / 1; AR.26.00843 / 5 | 20 / 12 | saldo -8 |
| 2026/LOTE 21-03.dxf | 420148-0033 | AR.26.00747 / 2 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 420148-0002 | AR.26.00747 / 3 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 430127-0014 | AR.26.00747 / 5 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 430172-0007 | AR.26.00747 / 6 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 420150-0007 | AR.26.00843 / 2 | 12 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 420150-0089 | AR.26.00843 / 9 | 2 / 3 | saldo 1 |
| 2026/LOTE 21-03.dxf | 420150-0090 | AR.26.00843 / 10 | 20 / 17 | saldo -3 |
| 2026/LOTE 21-03.dxf | 430172-0002 | AR.26.00843 / 12 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-03.dxf | 430172-0034 | AR.26.00843 / 14 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 420148-0117 | AR.26.04398 / 1 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 420150-0033 | AR.26.04398 / 2; AR.26.04503 / 7 | 83 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 410124-0003 | AR.26.04400 / 1 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 410241-0011 | AR.26.04400 / 2 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 410242-0004 | AR.26.04400 / 3 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 420150-0116 | AR.26.04400 / 4 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | — | AR.26.04400 / 5 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 420102-0004 | AR.26.04503 / 1 | 20 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 420102-0030 | AR.26.04503 / 2 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 420102-0050 | AR.26.04503 / 3 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 420148-0111 | AR.26.04503 / 4 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 420150-0002 | AR.26.04503 / 5 | 5 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 420150-0007 | AR.26.04503 / 6 | 5 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 430127-0001 | AR.26.04503 / 8; AR.26.04673 / 2 | 3 / 1 | saldo -2 |
| 2026/LOTE 21-09.dxf | 430127-0002 | AR.26.04503 / 9 | 5 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 430127-0014 | AR.26.04503 / 10 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 430129-0002 | AR.26.04503 / 11 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 430172-0002 | AR.26.04503 / 12 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 21-09.dxf | 430172-0034 | AR.26.04503 / 13 | 1 / ? | sin lectura de cuerpo |
| 2026/lote 23-05.dxf | 420102-0049 | AR.26.02151 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/lote 23-05.dxf | 420148-0115 | AR.26.02151 / 2 | 4 / ? | sin lectura de cuerpo |
| 2026/lote 23-05.dxf | 430127-0007 | AR.26.02151 / 3 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 24-01.dxf | 430125-0012 | AR.26.00176 / 2 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 24-01.dxf | 430127-0019 | AR.26.00176 / 4 | 9 / 3 | saldo -6 |
| 2026/LOTE 24-10.dxf | 430172-0007 | AR.26.04504 / 3; AR.26.04797 / 6 | 6 / 7 | saldo 1 |
| 2026/LOTE 24-10.dxf | 420148-0002 | AR.26.04504 / 4 | 4 / 3 | saldo -1 |
| 2026/LOTE 24-10.dxf | 420102-0050 | AR.26.04734 / 1; AR.26.04797 / 2 | 16 / 9 | saldo -7 |
| 2026/LOTE 24-10.dxf | 420102-0030 | AR.26.04797 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 25-04.dxf | 420102-0022 | AR.26.01279 / 1 | 10 / 4 | saldo -6 |
| 2026/LOTE 25-04.dxf | 420148-0105 | AR.26.01279 / 4 | 10 / 9 | saldo -1 |
| 2026/LOTE 25-04.dxf | 420150-0002 | AR.26.01279 / 5; AR.26.01295 / 2 | 16 / 12 | saldo -4 |
| 2026/LOTE 25-04.dxf | 430127-0002 | AR.26.01279 / 6 | 20 / 8 | saldo -12 |
| 2026/LOTE 25-04.dxf | 420150-0020 | AR.26.01454 / 1 | 2 / 1 | saldo -1 |
| 2026/LOTE 25-04.dxf | 420102-0092 | AR.26.01465 / 2 | 6 / 1 | saldo -5 |
| 2026/LOTE 25-04.dxf | 430172-0002 | AR.26.01465 / 4 | 2 / 1 | saldo -1 |
| 2026/LOTE 25-07.dxf | 430172-0005 | AR.26.03261 / 1 | 1 / 2 | saldo 1 |
| 2026/LOTE 25-07.dxf | 410129-0200 | AR.26.03261 / 3 | 12 / ? | sin lectura de cuerpo |
| 2026/LOTE 26-09.dxf | 410124-0003 | AR.26.04400 / 1 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 26-09.dxf | 410241-0011 | AR.26.04400 / 2 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 26-09.dxf | 410242-0004 | AR.26.04400 / 3 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 26-09.dxf | — | AR.26.04400 / 5 | 17 / ? | sin lectura de cuerpo |
| 2026/LOTE 26-09.dxf | 430127-0002 | AR.26.04503 / 9 | 5 / 6 | saldo 1 |
| 2026/LOTE 27-06 (2).dxf | 420102-0034 | AR.26.02535 / 1 | 30 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 430127-0002 | AR.26.02535 / 2 | 15 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 430172-0034 | AR.26.02535 / 3 | 16 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 430172-0009 | AR.26.02535 / 4 | 40 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 430125-0001 | AR.26.02535 / 5 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 420102-0089 | AR.26.02676 / 1 | 8 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 420102-0172 | AR.26.02676 / 2 | 12 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 420148-0105 | AR.26.02676 / 3 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 420150-0001 | AR.26.02676 / 4 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 420150-0091 | AR.26.02676 / 5 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 430127-0016 | AR.26.02676 / 6 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 430129-0002 | AR.26.02676 / 7 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06 (2).dxf | 430172-0005 | AR.26.02676 / 8 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 420102-0034 | AR.26.02535 / 1 | 30 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 430127-0002 | AR.26.02535 / 2 | 15 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 430172-0034 | AR.26.02535 / 3 | 16 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 430172-0009 | AR.26.02535 / 4 | 40 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 430125-0001 | AR.26.02535 / 5 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 420102-0089 | AR.26.02676 / 1 | 8 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 420102-0172 | AR.26.02676 / 2 | 12 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 420148-0105 | AR.26.02676 / 3 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 420150-0001 | AR.26.02676 / 4 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 420150-0091 | AR.26.02676 / 5 | 10 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 430127-0016 | AR.26.02676 / 6 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 430129-0002 | AR.26.02676 / 7 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 27-06_nuevas.dxf | 430172-0005 | AR.26.02676 / 8 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02.dxf | 410121-0001 | AR.26.00526 / 1 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02.dxf | 410241-0011 | AR.26.00526 / 2 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02.dxf | 410242-0004 | AR.26.00526 / 3 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02.dxf | 410245-0001 | AR.26.00526 / 4 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02.dxf | 430127-0001 | AR.26.00526 / 10 | 29 / 2 | saldo -27 |
| 2026/LOTE 28-02_1.dxf | 430125-0002 | AR.26.00398 / 1 | 20 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 420150-0007 | AR.26.00398 / 2 | 15 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 420150-0092 | AR.26.00517 / 1; AR.26.00526 / 8 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 420150-0021 | AR.26.00518 / 1; AR.26.00526 / 7 | 18 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 430172-0010 | AR.26.00518 / 2 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 420148-0033 | AR.26.00518 / 3 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 430172-0007 | AR.26.00518 / 4 | 3 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 410121-0001 | AR.26.00526 / 1 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 410241-0011 | AR.26.00526 / 2 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 410242-0004 | AR.26.00526 / 3 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 410245-0001 | AR.26.00526 / 4 | 4 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 420102-0050 | AR.26.00526 / 5 | 32 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 420102-0034 | AR.26.00526 / 6 | 50 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 430125-0012 | AR.26.00526 / 9 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 430127-0001 | AR.26.00526 / 10 | 29 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-02_1.dxf | 420150-0033 | AR.26.00526 / 12 | 15 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-03.dxf | 420102-0017 | AR.26.00747 / 1; AR.26.00843 / 5; AR.26.00844 / 6 | 26 / 13 | saldo -13 |
| 2026/LOTE 28-03.dxf | 420148-0033 | AR.26.00747 / 2 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-03.dxf | 420102-0034 | AR.26.00747 / 4; AR.26.00843 / 6 | 30 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-03.dxf | 420148-0105 | AR.26.00843 / 1; AR.26.00844 / 1 | 39 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-03.dxf | 430125-0019 | AR.26.00843 / 3 | 6 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-03.dxf | 430127-0004 | AR.26.00843 / 4; AR.26.00844 / 5 | 4 / 2 | saldo -2 |
| 2026/LOTE 28-03.dxf | 420102-0092 | AR.26.00843 / 7 | 8 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-03.dxf | 420150-0033 | AR.26.00843 / 8 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-03.dxf | 420150-0089 | AR.26.00843 / 9 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-03.dxf | 420150-0090 | AR.26.00843 / 10; AR.26.00844 / 7 | 30 / 10 | saldo -20 |
| 2026/LOTE 28-03.dxf | 420150-0091 | AR.26.00843 / 11; AR.26.00844 / 8 | 17 / 4 | saldo -13 |
| 2026/LOTE 28-03.dxf | 430172-0031 | AR.26.00843 / 13 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-03.dxf | 430172-0034 | AR.26.00843 / 14 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 28-03.dxf | 430125-0002 | AR.26.00843 / 15; AR.26.00844 / 9 | 103 / 37 | saldo -66 |
| 2026/LOTE 28-03.dxf | 420150-0001 | AR.26.00844 / 3 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 29-08.dxf | 420102-0030 | AR.26.03970 / 1 | 4 / 3 | saldo -1 |
| 2026/LOTE 29-08.dxf | 420148-0099 | AR.26.03970 / 5 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 29-08.dxf | 430172-0030 | AR.26.03970 / 8 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 29-08.dxf | 430125-0001 | AR.26.03970 / 9 | 2 / 1 | saldo -1 |
| 2026/LOTE 29-08.dxf | 430125-0002 | AR.26.03970 / 10 | 4 / 2 | saldo -2 |
| 2026/LOTE 30-05.dxf | 430125-0002 | AR.26.01722 / 4 | 35 / 17 | saldo -18 |
| 2026/LOTE 30-05.dxf | 420102-0016 | AR.26.01751 / 1 | 50 / 18 | saldo -32 |
| 2026/LOTE 30-05.dxf | 430125-0012 | AR.26.02038 / 2 | 2 / 3 | saldo 1 |
| 2026/LOTE 31-01.dxf | 430125-0013 | AR.26.00263 / 1 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 31-01.dxf | 420148-0105 | AR.26.00278 / 1 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 31-01.dxf | 430172-0033 | AR.26.00278 / 2 | 2 / ? | sin lectura de cuerpo |
| 2026/LOTE 31-01.dxf | 420150-0033 | AR.26.00278 / 3 | 11 / ? | sin lectura de cuerpo |
| 2026/LOTE 31-01.dxf | 420148-0120 | AR.26.00278 / 4 | 1 / ? | sin lectura de cuerpo |
| 2026/LOTE 31-01_2.dxf | 420150-0090 | AR.26.00177 / 3 | 28 / ? | sin lectura de cuerpo |
| 2026/LOTE 31-01_2.dxf | 430172-0007 | AR.26.00177 / 4 | 36 / ? | sin lectura de cuerpo |
| 2026/LOTE 31-10.dxf | 420102-0017 | AR.26.04864 / 1 | 4 / 3 | saldo -1 |
| 2026/LOTE 31-10.dxf | 420150-0088 | AR.26.04961 / 2 | 10 / 9 | saldo -1 |


| Oficina | Nota de stock literal | Referencias próximas (vínculo espacial) |
| --- | --- | --- |
| LOTE 01-08.dxf | stock | sin vínculo único |
| LOTE 04-07.dxf | hay 1 ud en stock | 430125-0002 |
| LOTE 04-07.dxf | hay 2ud en stock | 420150-0090 |
| LOTE 05-09.dxf | 1 uds en stock | 420150-0089, 420102-0034 |
| LOTE 05-09.dxf | 1 uds en stock | 420150-0021, 420102-0034 |
| LOTE 05-09.dxf | 4 uds en stock | sin vínculo único |
| LOTE 05-09.dxf | 1 uds en stock | sin vínculo único |
| LOTE 06-06.dxf | 1 ud stock | 420150-0033 |
| LOTE 06-06.dxf | 2uds stock | 430125-0002, 430127-0019 |
| LOTE 06-06.dxf | 1 ud stock | 420150-0033, 420150-0002 |
| LOTE 10-10.dxf | 2 uds en stock | 420150-0002 |
| LOTE 16-05.dxf | 5uds EN STOCK | 420150-0092 |
| LOTE 18-04.dxf | HOK430127-02   2uds EN STOCK | 430127-0002 |
| LOTE 18-04.dxf | HOK420150-89 1ud EN STOCK | sin vínculo único |
| LOTE 18-04.dxf | 1ud EN STOCK | 420150-0021 |
| LOTE 18-04.dxf | HOK420102-341ud EN STOCK | sin vínculo único |
| LOTE 18-04.dxf | HOK420102-921ud EN STOCK | sin vínculo único |
| LOTE 19-09.dxf | LA TENIAN EN STOCK | 430125-0002 |
| LOTE 20-06.dxf | HAY EN STOCK 10 UDS | sin vínculo único |
| LOTE 20-06.dxf | HAY EN STOCK 2 UDS | sin vínculo único |
| LOTE 24-10.dxf | hay en stock 2 | 420102-0030 |
| LOTE 24-10.dxf | hay en stock 1 | 420148-0002 |
| LOTE 28-03.dxf | HAY UNA UNIDAD EN STOCK | 420102-0017 |
| LOTE 28-03.dxf | HAY UNA UNIDAD EN STOCK | 420150-0091 |
| LOTE 28-03.dxf | HAY UNA UNIDAD EN STOCK | 430125-0002, 430125-0003 |
| LOTE 28-03.dxf | HAY UNA UNIDAD EN STOCK | 420102-0017, 430125-0002 |
| LOTE 28-03.dxf | HAY UNA UNIDAD EN STOCK | 420102-0017 |
| LOTE 28-03.dxf | HAY UNA UNIDAD EN STOCK | 420148-0002, 420150-0091, 420150-0007 |
| LOTE 29-08.dxf | 2uds stock | 420102-0050, 430125-0002 |
| LOTE 29-08.dxf | 1uds stock | 420102-0030 |
| LOTE 29-08.dxf | 1uds stock | 420102-0050, 430125-0001 |
| LOTE 31-10.dxf | 1 ud en stock | sin vínculo único |
| LOTE 31-10.dxf | 1 ud en stock | 420102-0017 |

Para los cortes sin hoja de oficina asociada, especialmente los de 2025, se conserva un segundo cruce independiente por fecha solicitada y referencia escrita (`cantidades[].rpsPorFecha`). Es una candidatura por fecha, no una asignación de ese corte a todos esos pedidos. La tabla siguiente da cobertura de ese cruce para **todos** los archivos de corte.


| Archivo | Refs con líneas RPS por fecha | Iguales / distintas con cuerpo | Refs sin lectura de cuerpo |
| --- | --- | --- | --- |
| 2025/LONA 3 MM.dxf | 0 | 0 / 0 | 0 |
| 2025/LOTE  01-02.dxf | 16 | 8 / 4 | 4 |
| 2025/LOTE 01-03.dxf | 17 | 15 / 2 | 0 |
| 2025/LOTE 01-10.dxf | 0 | 0 / 0 | 0 |
| 2025/LOTE 01-11.dxf | 17 | 15 / 1 | 1 |
| 2025/LOTE 02-08.dxf | 2 | 1 / 1 | 0 |
| 2025/LOTE 03-05.dxf | 2 | 0 / 0 | 2 |
| 2025/LOTE 04-10.dxf | 18 | 14 / 0 | 4 |
| 2025/LOTE 05-04.dxf | 17 | 16 / 0 | 1 |
| 2025/LOTE 05-07.dxf | 27 | 22 / 3 | 2 |
| 2025/LOTE 06-08.dxf | 1 | 1 / 0 | 0 |
| 2025/LOTE 06-09.dxf | 21 | 18 / 3 | 0 |
| 2025/LOTE 06-12.dxf | 17 | 15 / 1 | 1 |
| 2025/LOTE 06-12_RECTIFICADO.dxf | 1 | 0 / 0 | 1 |
| 2025/LOTE 07-06.dxf | 24 | 23 / 0 | 1 |
| 2025/LOTE 08-02 (PALET 3_4_5).dxf | 12 | 8 / 2 | 2 |
| 2025/LOTE 08-03.dxf | 3 | 3 / 0 | 0 |
| 2025/LOTE 08-11.dxf | 23 | 18 / 1 | 4 |
| 2025/LOTE 09-08.dxf | 1 | 0 / 0 | 1 |
| 2025/LOTE 10-05.dxf | 47 | 41 / 3 | 3 |
| 2025/LOTE 11-01.dxf | 18 | 14 / 2 | 2 |
| 2025/LOTE 11-10.dxf | 12 | 10 / 0 | 2 |
| 2025/LOTE 12-04.dxf | 25 | 19 / 5 | 1 |
| 2025/LOTE 12-07.dxf | 19 | 16 / 3 | 0 |
| 2025/LOTE 12-07_LINEA JAVIER.dxf | 1 | 0 / 1 | 0 |
| 2025/LOTE 13-09.dxf | 39 | 29 / 6 | 4 |
| 2025/LOTE 13-12.dxf | 6 | 5 / 1 | 0 |
| 2025/LOTE 14-06.dxf | 10 | 10 / 0 | 0 |
| 2025/LOTE 14-06_1.dxf | 1 | 0 / 1 | 0 |
| 2025/LOTE 15-02.dxf | 15 | 12 / 2 | 1 |
| 2025/LOTE 15-03.dxf | 22 | 19 / 1 | 2 |
| 2025/LOTE 15-11.dxf | 24 | 21 / 3 | 0 |
| 2025/LOTE 15-11_URGENTE.dxf | 1 | 1 / 0 | 0 |
| 2025/LOTE 16-04.dxf | 12 | 8 / 0 | 4 |
| 2025/LOTE 17-05.dxf | 10 | 5 / 3 | 2 |
| 2025/LOTE 18-01.dxf | 17 | 16 / 1 | 0 |
| 2025/LOTE 18-10.dxf | 18 | 15 / 2 | 1 |
| 2025/LOTE 19-07.dxf | 19 | 16 / 1 | 2 |
| 2025/LOTE 20-09.dxf | 9 | 9 / 0 | 0 |
| 2025/LOTE 21-06.dxf | 7 | 5 / 2 | 0 |
| 2025/LOTE 22-02.dxf | 21 | 17 / 4 | 0 |
| 2025/LOTE 22-03.dxf | 0 | 0 / 0 | 0 |
| 2025/LOTE 22-11.dxf | 15 | 12 / 3 | 0 |
| 2025/LOTE 22-11_ADICIONALES.dxf | 2 | 2 / 0 | 0 |
| 2025/LOTE 23-08.dxf | 20 | 16 / 2 | 2 |
| 2025/LOTE 24-05.dxf | 29 | 25 / 4 | 0 |
| 2025/LOTE 25-01.dxf | 18 | 15 / 3 | 0 |
| 2025/LOTE 25-10.dxf | 37 | 22 / 10 | 5 |
| 2025/LOTE 26-04.dxf | 21 | 15 / 5 | 1 |
| 2025/LOTE 26-07.dxf | 0 | 0 / 0 | 0 |
| 2025/LOTE 27-09.dxf | 4 | 4 / 0 | 0 |
| 2025/LOTE 28-06.dxf | 7 | 6 / 1 | 0 |
| 2025/LOTE 29-03.dxf | 17 | 12 / 5 | 0 |
| 2025/LOTE 29-11.dxf | 24 | 18 / 4 | 2 |
| 2025/LOTE 30-07.dxf | 1 | 0 / 1 | 0 |
| 2025/LOTE 30-08.dxf | 13 | 8 / 5 | 0 |
| 2025/LOTE 31-05.dxf | 14 | 14 / 0 | 0 |
| 2025/LOTE_08_02 (PALET 1 Y 2).dxf | 0 | 0 / 0 | 0 |
| 2026/AR2603328.dxf | 0 | 0 / 0 | 0 |
| 2026/LONA 3 MM.dxf | 0 | 0 / 0 | 0 |
| 2026/LOTE 01-08.dxf | 15 | 14 / 1 | 0 |
| 2026/LOTE 02-05.dxf | 18 | 8 / 10 | 0 |
| 2026/LOTE 03-10.dxf | 16 | 13 / 3 | 0 |
| 2026/LOTE 04-04.dxf | 4 | 3 / 1 | 0 |
| 2026/LOTE 04-07.dxf | 13 | 9 / 2 | 2 |
| 2026/LOTE 04-07_1.dxf | 0 | 0 / 0 | 0 |
| 2026/LOTE 05-09.dxf | 11 | 9 / 2 | 0 |
| 2026/LOTE 06-06.dxf | 20 | 9 / 10 | 1 |
| 2026/LOTE 07-02.dxf | 15 | 14 / 0 | 1 |
| 2026/LOTE 07-03.dxf | 16 | 12 / 3 | 1 |
| 2026/LOTE 08-08.dxf | 18 | 16 / 2 | 0 |
| 2026/LOTE 09-05.dxf | 0 | 0 / 0 | 0 |
| 2026/LOTE 09-05_2.dxf | 0 | 0 / 0 | 0 |
| 2026/LOTE 10-01.dxf | 1 | 0 / 0 | 1 |
| 2026/LOTE 10-01_2.dxf | 26 | 24 / 2 | 0 |
| 2026/LOTE 10-10.dxf | 17 | 13 / 2 | 2 |
| 2026/LOTE 10-10_3.dxf | 1 | 1 / 0 | 0 |
| 2026/LOTE 11-04.dxf | 18 | 14 / 3 | 1 |
| 2026/LOTE 12-09.dxf | 20 | 18 / 1 | 1 |
| 2026/LOTE 14-02.dxf | 8 | 7 / 1 | 0 |
| 2026/LOTE 14-03.dxf | 22 | 18 / 2 | 2 |
| 2026/LOTE 15-08.dxf | 11 | 9 / 2 | 0 |
| 2026/LOTE 16-05.dxf | 13 | 7 / 3 | 3 |
| 2026/LOTE 17-01.dxf | 3 | 1 / 1 | 1 |
| 2026/LOTE 17-10.dxf | 14 | 12 / 1 | 1 |
| 2026/LOTE 18-07.dxf | 17 | 7 / 10 | 0 |
| 2026/LOTE 18-07_2.dxf | 19 | 9 / 9 | 1 |
| 2026/LOTE 19-09.dxf | 8 | 7 / 0 | 1 |
| 2026/LOTE 20-06.dxf | 5 | 2 / 2 | 1 |
| 2026/LOTE 21-02.dxf | 11 | 9 / 2 | 0 |
| 2026/LOTE 21-02_1.dxf | 1 | 0 / 0 | 1 |
| 2026/LOTE 21-02_2.dxf | 1 | 0 / 1 | 0 |
| 2026/LOTE 21-03.dxf | 13 | 7 / 2 | 4 |
| 2026/LOTE 21-09.dxf | 2 | 1 / 1 | 0 |
| 2026/LOTE 22-08.dxf | 6 | 6 / 0 | 0 |
| 2026/LOTE 24-01.dxf | 6 | 4 / 1 | 1 |
| 2026/LOTE 24-10.dxf | 10 | 6 / 3 | 1 |
| 2026/LOTE 25 89.dxf | 0 | 0 / 0 | 0 |
| 2026/LOTE 25-04.dxf | 16 | 9 / 7 | 0 |
| 2026/LOTE 25-07.dxf | 12 | 8 / 3 | 1 |
| 2026/LOTE 26-09.dxf | 19 | 14 / 2 | 3 |
| 2026/LOTE 27-06 (2).dxf | 13 | 0 / 0 | 13 |
| 2026/LOTE 27-06_nuevas.dxf | 2 | 2 / 0 | 0 |
| 2026/LOTE 28-02.dxf | 14 | 11 / 2 | 1 |
| 2026/LOTE 28-02_1.dxf | 1 | 1 / 0 | 0 |
| 2026/LOTE 28-03.dxf | 13 | 7 / 4 | 2 |
| 2026/LOTE 29-08.dxf | 13 | 10 / 3 | 0 |
| 2026/LOTE 30-05.dxf | 10 | 7 / 3 | 0 |
| 2026/LOTE 31-01.dxf | 2 | 2 / 0 | 0 |
| 2026/LOTE 31-01_2.dxf | 5 | 5 / 0 | 0 |
| 2026/LOTE 31-10.dxf | 28 | 26 / 2 | 0 |
| 2026/LOTE13-06.dxf | 20 | 15 / 1 | 4 |
| 2026/LOTE18-04.dxf | 24 | 11 / 13 | 0 |
| 2026/lote 23-05.dxf | 9 | 8 / 0 | 1 |
| 2026/lote 25_ADRI.dxf | 0 | 0 / 0 | 0 |
| 2026/lote rocio.dxf | 0 | 0 / 0 | 0 |

Fechas con más de una salida, incluidas rectificaciones y adicionales: no se les supone una relación acumulativa.


| Fecha interpretada del nombre | Archivos |
| --- | --- |
| 2025-06-14 | LOTE 14-06.dxf; LOTE 14-06_1.dxf |
| 2025-07-12 | LOTE 12-07.dxf; LOTE 12-07_LINEA JAVIER.dxf |
| 2025-11-15 | LOTE 15-11.dxf; LOTE 15-11_URGENTE.dxf |
| 2025-11-22 | LOTE 22-11.dxf; LOTE 22-11_ADICIONALES.dxf |
| 2025-12-06 | LOTE 06-12.dxf; LOTE 06-12_RECTIFICADO.dxf |
| 2026-01-10 | LOTE 10-01.dxf; LOTE 10-01_2.dxf |
| 2026-01-31 | LOTE 31-01.dxf; LOTE 31-01_2.dxf |
| 2026-02-21 | LOTE 21-02.dxf; LOTE 21-02_1.dxf; LOTE 21-02_2.dxf |
| 2026-02-28 | LOTE 28-02.dxf; LOTE 28-02_1.dxf |
| 2026-05-09 | LOTE 09-05.dxf; LOTE 09-05_2.dxf |
| 2026-06-27 | LOTE 27-06 (2).dxf; LOTE 27-06_nuevas.dxf |
| 2026-07-04 | LOTE 04-07.dxf; LOTE 04-07_1.dxf |
| 2026-07-18 | LOTE 18-07.dxf; LOTE 18-07_2.dxf |
| 2026-10-10 | LOTE 10-10.dxf; LOTE 10-10_3.dxf |

## 5. Cambios de altura para aprovechar el rollo

En las 74 pilas reconstruidas de tres techos 430125/430127/430129, las alturas medidas son las siguientes. Es una comprobación de geometría, sin completar las alturas desde una fórmula. Las pilas de tres de otras familias también se cuentan para evitar trasladarles automáticamente la regla del techo.


| Familia | Paños en la pila | Alturas mm | Pilas / archivos |
| --- | --- | --- | --- |
| 410122 | 1 | 320 | 2 / 2 |
| 410129 | 1 | 1000 | 6 / 5 |
| 410129 | 1 | 1100 | 1 / 1 |
| 410129 | 1 | 900 | 1 / 1 |
| 410129 | 2 | 1000 | 4 / 4 |
| 410135 | 2 | 1000 | 2 / 2 |
| 410170 | 3 | 416.2 | 1 / 1 |
| 420102 | 1 | 646 | 2 / 2 |
| 420102 | 1 | 663.162 | 2 / 1 |
| 420102 | 1 | 666 | 267 / 69 |
| 420102 | 1 | 691 | 2 / 1 |
| 420102 | 1 | 966 | 20 / 8 |
| 420102 | 2 | 666 | 35 / 24 |
| 420102 | 2 | 966 | 79 / 39 |
| 420102 | 3 | 646/666 | 4 / 4 |
| 420102 | 3 | 666 | 306 / 76 |
| 420148 | 1 | 661 | 94 / 43 |
| 420148 | 1 | 961 | 20 / 15 |
| 420148 | 2 | 661 | 37 / 29 |
| 420148 | 2 | 961 | 24 / 20 |
| 420148 | 3 | 661 | 89 / 59 |
| 420150 | 1 | 618.261 | 1 / 1 |
| 420150 | 1 | 641 | 2 / 2 |
| 420150 | 1 | 666 | 277 / 67 |
| 420150 | 1 | 680 | 1 / 1 |
| 420150 | 2 | 666 | 108 / 50 |
| 420150 | 3 | 666 | 392 / 89 |
| 430125 | 1 | 680 | 43 / 22 |
| 430125 | 1 | 691 | 75 / 26 |
| 430125 | 1 | 991 | 6 / 5 |
| 430125 | 2 | 680 | 7 / 5 |
| 430125 | 2 | 691 | 24 / 17 |
| 430125 | 2 | 991 | 11 / 7 |
| 430125 | 3 | 680 | 35 / 21 |
| 430127 | 1 | 226 | 2 / 1 |
| 430127 | 1 | 655 | 1 / 1 |
| 430127 | 1 | 666 | 2 / 2 |
| 430127 | 1 | 680 | 67 / 24 |
| 430127 | 1 | 691 | 121 / 49 |
| 430127 | 1 | 700 | 1 / 1 |
| 430127 | 2 | 679.68/679.247 | 1 / 1 |
| 430127 | 2 | 680 | 8 / 8 |
| 430127 | 2 | 680/991 | 1 / 1 |
| 430127 | 2 | 691 | 51 / 22 |
| 430127 | 2 | 691/300 | 1 / 1 |
| 430127 | 3 | 680 | 38 / 29 |
| 430127 | 3 | 680.5 | 1 / 1 |
| 430129 | 1 | 991 | 40 / 31 |
| 430129 | 2 | 991 | 28 / 21 |
| 430172 | 1 | 400 | 1 / 1 |
| 430172 | 1 | 520 | 1 / 1 |
| 430172 | 1 | 680 | 1 / 1 |
| 430172 | 1 | 966 | 147 / 64 |
| 430172 | 2 | 966 | 152 / 69 |

En los techos de fondo habitual 600, la regla ya contestada por Tamara es pasar de 691 a 680 para que tres ocupen el ancho de 2040. El contraste por lote permite ver también sueltas de 680 y sueltas de 691: **no basta saber que una pieza va sola para imponerle 691**. Los 991 de otros techos no se convierten a 680 por pertenecer a la misma familia.


| Archivo con techos | Pilas de tres: alturas mm y cantidad | Pilas de uno o dos: alturas mm y cantidad |
| --- | --- | --- |
| 2025/LOTE  01-02.dxf | — | 226: 2; 691: 2 |
| 2025/LOTE 01-03.dxf | — | 691: 3 |
| 2025/LOTE 01-11.dxf | 680: 3 | 680: 6 |
| 2025/LOTE 02-08.dxf | — | 691: 1 |
| 2025/LOTE 04-10.dxf | — | 680: 1; 991: 1 |
| 2025/LOTE 05-04.dxf | — | 691: 3 |
| 2025/LOTE 05-07.dxf | — | 691: 8 |
| 2025/LOTE 06-08.dxf | — | 991: 1 |
| 2025/LOTE 06-09.dxf | — | 691: 5 |
| 2025/LOTE 06-12.dxf | — | 680: 5; 691: 2; 991: 1 |
| 2025/LOTE 07-06.dxf | — | 691: 5; 991: 4 |
| 2025/LOTE 08-02 (PALET 3_4_5).dxf | — | 691: 5 |
| 2025/LOTE 08-11.dxf | 680: 2 | 680: 5; 991: 1 |
| 2025/LOTE 10-05.dxf | — | 691: 17; 991: 5 |
| 2025/LOTE 11-01.dxf | — | 691: 5 |
| 2025/LOTE 11-10.dxf | — | 680: 6 |
| 2025/LOTE 12-04.dxf | — | 691: 12; 691/300: 1; 991: 2 |
| 2025/LOTE 12-07.dxf | — | 691: 7; 991: 3 |
| 2025/LOTE 12-07_LINEA JAVIER.dxf | 680: 1 | — |
| 2025/LOTE 13-09.dxf | 680: 2 | 655: 1; 680: 6; 691: 6; 991: 5 |
| 2025/LOTE 14-06.dxf | — | 991: 1 |
| 2025/LOTE 15-02.dxf | — | 691: 1; 991: 1 |
| 2025/LOTE 15-03.dxf | — | 666: 1; 691: 1; 991: 3 |
| 2025/LOTE 15-11.dxf | 680: 4 | 680: 4; 691: 2; 991: 1 |
| 2025/LOTE 16-04.dxf | — | 691: 4 |
| 2025/LOTE 18-01.dxf | — | 691: 4; 991: 1 |
| 2025/LOTE 18-10.dxf | 680: 2 | 680: 8; 991: 2 |
| 2025/LOTE 19-07.dxf | 680: 2 | 680: 1; 691: 6 |
| 2025/LOTE 20-09.dxf | 680: 1 | 680: 3 |
| 2025/LOTE 21-06.dxf | — | 691: 3 |
| 2025/LOTE 22-02.dxf | — | 691: 31 |
| 2025/LOTE 22-03.dxf | — | 691: 5; 991: 1 |
| 2025/LOTE 22-11.dxf | 680: 2 | 680: 5; 991: 2 |
| 2025/LOTE 23-08.dxf | — | 691: 4 |
| 2025/LOTE 24-05.dxf | — | 691: 24 |
| 2025/LOTE 25-01.dxf | — | 691: 4 |
| 2025/LOTE 25-10.dxf | 680: 2 | 680: 9; 991: 7 |
| 2025/LOTE 26-04.dxf | — | 691: 9; 700: 1 |
| 2025/LOTE 27-09.dxf | — | 680: 5; 991: 1 |
| 2025/LOTE 28-06.dxf | — | 691: 5 |
| 2025/LOTE 29-03.dxf | — | 691: 9 |
| 2025/LOTE 29-11.dxf | 680: 1 | 680: 1; 691: 3; 991: 2 |
| 2025/LOTE 30-08.dxf | — | 691: 2; 991: 2 |
| 2025/LOTE 31-05.dxf | — | 691: 2; 991: 3 |
| 2025/LOTE_08_02 (PALET 1 Y 2).dxf | — | 691: 2 |
| 2026/LOTE 01-08.dxf | — | 680: 1; 991: 1 |
| 2026/LOTE 02-05.dxf | 680: 2 | 680: 3; 691: 1 |
| 2026/LOTE 03-10.dxf | 680: 4 | 680: 7; 991: 1 |
| 2026/LOTE 04-07.dxf | — | 691: 1 |
| 2026/LOTE 05-09.dxf | 680: 1 | 680: 1; 691: 1 |
| 2026/LOTE 06-06.dxf | 680: 3 | 680: 2; 691: 2 |
| 2026/LOTE 07-02.dxf | — | 691: 3 |
| 2026/LOTE 07-03.dxf | 680: 2 | 680: 3; 691: 1; 991: 1 |
| 2026/LOTE 08-08.dxf | 680: 2 | 691: 3; 991: 1 |
| 2026/LOTE 09-05.dxf | 680: 1 | 680: 1 |
| 2026/LOTE 10-01_2.dxf | 680: 4 | 680: 2; 691: 5 |
| 2026/LOTE 10-10.dxf | — | 680: 1; 691: 3 |
| 2026/LOTE 11-04.dxf | 680: 1 | 680: 1; 691: 2 |
| 2026/LOTE 12-09.dxf | 680.5: 1 | 691: 5; 991: 1 |
| 2026/LOTE 14-02.dxf | 680: 1 | 691: 2 |
| 2026/LOTE 14-03.dxf | 680: 1 | 691: 3; 991: 3 |
| 2026/LOTE 15-08.dxf | 680: 2 | 680: 5 |
| 2026/LOTE 16-05.dxf | — | 991: 1 |
| 2026/LOTE 17-01.dxf | — | 991: 2 |
| 2026/LOTE 17-10.dxf | 680: 1 | 691: 1 |
| 2026/LOTE 18-07.dxf | — | 680: 1; 691: 5; 991: 2 |
| 2026/LOTE 18-07_2.dxf | 680: 2 | 680: 4; 680/991: 1; 691: 1 |
| 2026/LOTE 19-09.dxf | 680: 1 | — |
| 2026/LOTE 21-02.dxf | — | 680: 2; 691: 4 |
| 2026/LOTE 21-02_2.dxf | — | 680: 1 |
| 2026/LOTE 21-03.dxf | 680: 2 | 680: 2; 691: 2 |
| 2026/LOTE 21-09.dxf | — | 691: 1 |
| 2026/LOTE 22-08.dxf | — | 666: 1 |
| 2026/LOTE 24-01.dxf | 680: 1 | 680: 1 |
| 2026/LOTE 24-10.dxf | 680: 2 | 680: 1 |
| 2026/LOTE 25-04.dxf | 680: 1 | 680: 2; 691: 1; 991: 1 |
| 2026/LOTE 25-07.dxf | 680: 1 | — |
| 2026/LOTE 26-09.dxf | 680: 1 | 680: 6; 991: 5 |
| 2026/LOTE 27-06_nuevas.dxf | — | 691: 1 |
| 2026/LOTE 28-02.dxf | 680: 2 | 679.68/679.247: 1; 680: 1; 691: 2 |
| 2026/LOTE 28-02_1.dxf | 680: 1 | — |
| 2026/LOTE 28-03.dxf | 680: 2 | 680: 2; 691: 2 |
| 2026/LOTE 29-08.dxf | — | 691: 3; 991: 2 |
| 2026/LOTE 30-05.dxf | 680: 3 | 680: 2; 691: 4; 991: 2 |
| 2026/LOTE 31-01_2.dxf | — | 680: 1 |
| 2026/LOTE 31-10.dxf | 680: 1 | 680: 2; 691: 5; 991: 4 |
| 2026/LOTE13-06.dxf | 680: 4 | 680: 2; 691: 2; 991: 1 |
| 2026/LOTE18-04.dxf | 680: 2 | 680: 3; 691: 1; 991: 5 |
| 2026/lote 23-05.dxf | — | 691: 2; 991: 2 |

Excepciones a 680 en las pilas de tres de techo (se muestra el decimal leído, no se redondea a 681):


| Archivo | Referencia | Paños | Altura mm | Ocupación mm |
| --- | --- | --- | --- | --- |
| 2026/LOTE 12-09.dxf | 430127-0004 | 3 | 680.5 | 2041,5 |

**Tres alturas no significa necesariamente tres techos iguales.** Se mide también la columna que cruza el centro de cada techo. En pilas mixtas continuas de tres piezas aparecen techos de 691 junto a cuerpos más estrechos: pueden caber sin bajar el techo a 680. Estas observaciones se cuentan por paño dibujado, sin multiplicar por xN. Por eso la regla confirmada de tres techos iguales no se puede extender a cualquier fila de tres referencias.


| Altura del techo mm | Paños en pila mixta continua de tres / archivos | Ocupaciones observadas mm |
| --- | --- | --- |
| 300 | 1 / 1 | 1957 |
| 680 | 90 / 32 | 2040, 2012, 2026, 2021, 2002, 2007, 2307, 2012.433, 2051 |
| 691 | 106 / 37 | 2023, 2013, 2018, 1957, 2048, 2023.433, 2051 |
| 700 | 1 / 1 | 2032 |


| Archivo con techo 691 en pila mixta de tres | Referencias de techo | Ocupación de esa columna mm |
| --- | --- | --- |
| 2025/LOTE 01-03.dxf | 430127-0014 | 2023 |
| 2025/LOTE 06-09.dxf | 430127-0002, 430127-0001 | 2023 |
| 2025/LOTE 06-12.dxf | 430125-0019, 430127-0014 | 2023, 2013 |
| 2025/LOTE 07-06.dxf | 430125-0002, 430127-0004, 430127-0019, 430125-0001 | 2023, 2018 |
| 2025/LOTE 08-02 (PALET 3_4_5).dxf | 430127-0002 | 2023 |
| 2025/LOTE 10-05.dxf | 430125-0002, 430125-0014, 430127-0001, 430125-0012, 430127-0005 | 2023 |
| 2025/LOTE 11-01.dxf | 430125-0002, 430125-0012 | 2023 |
| 2025/LOTE 12-04.dxf | 430127-0023 | 1957 |
| 2025/LOTE 12-07.dxf | 430127-0002 | 2023 |
| 2025/LOTE 13-09.dxf | 430127-0002 | 2023 |
| 2025/LOTE 15-02.dxf | 430127-0001 | 2023 |
| 2025/LOTE 15-11.dxf | 430125-0002 | 2048 |
| 2025/LOTE 16-04.dxf | 430127-0004 | 2023 |
| 2025/LOTE 19-07.dxf | 430127-0002, 430127-0019 | 2023 |
| 2025/LOTE 22-02.dxf | 430125-0012, 430127-0002, 430125-0001, 430125-0002 | 2023 |
| 2025/LOTE 22-03.dxf | 430125-0012, 430127-0004 | 2023 |
| 2025/LOTE 23-08.dxf | 430127-0019, 430127-0002 | 2023 |
| 2025/LOTE 24-05.dxf | 430125-0009, 430125-0002, 430127-0019, 430127-0004 | 2023 |
| 2025/LOTE 26-04.dxf | 430125-0009, 430125-0012 | 2013, 2023 |
| 2025/LOTE 29-03.dxf | 430127-0014, 430127-0002 | 2023 |
| 2025/LOTE 29-11.dxf | 430127-0002, 430127-0004 | 2013 |
| 2025/LOTE 30-08.dxf | 430127-0002 | 2023 |
| 2026/LOTE 07-02.dxf | 430127-0019, 430127-0014, 430127-0004 | 2023, 2013 |
| 2026/LOTE 08-08.dxf | 430125-0007, 430127-0004 | 2023 |
| 2026/LOTE 10-01_2.dxf | 430125-0002, 430127-0001 | 2023, 2023.433 |
| 2026/LOTE 10-10.dxf | 430127-0001, 430127-0014 | 2013, 2023 |
| 2026/LOTE 12-09.dxf | 430125-0012 | 2048 |
| 2026/LOTE 14-02.dxf | 430125-0002, 430127-0014 | 2023 |
| 2026/LOTE 18-07_2.dxf | 430125-0001 | 2013 |
| 2026/LOTE 21-02.dxf | 430125-0002 | 2023 |
| 2026/LOTE 21-03.dxf | 430127-0004 | 2023 |
| 2026/LOTE 25-04.dxf | 430125-0002 | 2048 |
| 2026/LOTE 28-02.dxf | 430125-0012 | 2051 |
| 2026/LOTE 28-03.dxf | 430127-0004 | 2023 |
| 2026/LOTE 29-08.dxf | 430125-0001, 430125-0002 | 2023, 2048 |
| 2026/LOTE 30-05.dxf | 430125-0012 | 2023 |
| 2026/LOTE 31-10.dxf | 430125-0002 | 2023 |

Lecturas que superan el ancho habitual del rollo: se conservan como excepciones del dibujo o del agrupador; no autorizan ampliar el rollo ni reducir una medida por programa.


| Archivo | Referencias | Alto exterior de la pila candidata mm |
| --- | --- | --- |
| 2025/LOTE 15-11.dxf | 420102-0022, 430125-0002 | 2048 |
| 2026/LOTE 03-10.dxf | 420148-0104, 430127-0019, 430172-0007 | 2307 |
| 2026/LOTE 12-09.dxf | 430127-0004 | 2041,5 |
| 2026/LOTE 12-09.dxf | 420102-0030, 430125-0012 | 2048 |
| 2026/LOTE 25-04.dxf | 420102-0092, 430125-0002 | 2048 |
| 2026/LOTE 28-02.dxf | 430125-0002, 430125-0012 | 2051 |
| 2026/LOTE 29-08.dxf | 420102-0050, 430125-0002 | 2048 |

## 6. Parejas con raya central

Se detecta una raya vertical larga de ROTULADOR en el centro del contorno, que permite leer dos paños iguales. Es una marca geométrica; el motivo de envarillar de dos en dos ya estaba confirmado para los laterales. El examen de todos los lotes encuentra también casos rotulados como techos: se guardan como excepción y se ha preguntado al coordinador antes de convertirlos en una regla de confección. Una marca central de una pieza que no tenga la longitud doble esperada necesita contraste adicional.


| Familia | Grupos / archivos | Referencias | Largos de cada mitad mm |
| --- | --- | --- | --- |
| 420102 | 121 / 62 | 420102-0050, 420102-0030, 420102-0042, 420102-0034, 420102-0001, 420102-0085, 420102-0089, 420102-0017, 420102-0092, 420102-0021, 420102-0018, 420102-0060, 420102-0002, 420102-0086, 420102-0022, 420102-0009, 420102-0027, 420102-0004 | 3410, 3810, 3310, 4010, 3010, 4410, 3210, 3610, 7220, 7620, 3503, 4210, 3110, 3710 |
| 430125 | 12 / 11 | 430125-0002, 430125-0012, 430125-0009, 430125-0003, 430125-0004 | 3503, 3563, 3463, 3303 |
| 430127 | 1 / 1 | 430127-0001 | 3010 |


| Archivo | Referencia de techo con marca central | Paños leídos / xN | Largo de cada mitad mm |
| --- | --- | --- | --- |
| 2025/LOTE  01-02.dxf | 430127-0001 | 2 / 1 | 3010 |
| 2025/LOTE 01-11.dxf | 430125-0002 | 6 / 1 | 3503 |
| 2025/LOTE 08-02 (PALET 3_4_5).dxf | 430125-0002 | 2 / 1 | 3503 |
| 2025/LOTE 19-07.dxf | 430125-0002 | 6 / 1 | 3503 |
| 2025/LOTE 21-06.dxf | 430125-0002 | 4 / 1 | 3503 |
| 2025/LOTE 22-11.dxf | 430125-0002 | 6 / 1 | 3503 |
| 2025/LOTE 24-05.dxf | 430125-0012 | 4 / 1 | 3563 |
| 2025/LOTE 24-05.dxf | 430125-0009 | 4 / 1 | 3463 |
| 2025/LOTE 25-10.dxf | 430125-0003 | 4 / 1 | 3303 |
| 2026/LOTE 06-06.dxf | 430125-0002 | 6 / 2 | 3503 |
| 2026/LOTE 30-05.dxf | 430125-0002 | 6 / 1 | 3503 |
| 2026/LOTE13-06.dxf | 430125-0009 | 6 / 3 | 3463 |
| 2026/LOTE18-04.dxf | 430125-0004 | 4 / 1 | 3503 |

## 7. Canalones: bloques, largos y cantidades

La reconstrucción de caras cerradas encuentra 659 bloques completos de 22 caras (8 enteros y 14 mitades) y 657 bloques de 15 mitades. Hay 429 grupos parciales o de otro tamaño: no se fuerzan al patrón completo. Las caras usan DISCO1+DISCO2, rectas y uniones en T, con nodos a 0,1 mm; las ranuras pequeñas no cuentan como canalones.

Se han asociado 657 pares de combinado y mitades por largo mitad/doble, posición contigua y diferencia de altura menor de 500 mm. La asociación conserva la tolerancia y la posición; **no prueba que se cortase todo ese bloque una sola vez**. Un combinado equivale a 15 canalones y el de mitades a 7,5 solo como cuenta de componentes. Juntos dibujan 22,5: no es una orden de fabricar medios canalones ni stock de más.


| Archivo | Combinados por largo mm | Mitades por largo mm | Grupos parciales | xN explícitos en bloques completos |
| --- | --- | --- | --- | --- |
| 2025/LONA 3 MM.dxf | — | — | 0 | ninguno |
| 2025/LOTE  01-02.dxf | 3410: 1; 3610: 2 | 1705: 1; 1805: 2 | 5 | ninguno |
| 2025/LOTE 01-03.dxf | 3410: 6; 3600: 1; 3610: 3; 3660: 1 | 1705: 6; 1800: 1; 1805: 3; 1830: 1 | 9 | ninguno |
| 2025/LOTE 01-10.dxf | — | — | 0 | ninguno |
| 2025/LOTE 01-11.dxf | 3410: 5; 3560: 2; 3610: 5 | 1705: 5; 1780: 2; 1805: 5 | 1 | ninguno |
| 2025/LOTE 02-08.dxf | 3360: 1; 3600: 1; 3610: 3 | 1680: 1; 1800: 1; 1805: 3 | 4 | ninguno |
| 2025/LOTE 03-05.dxf | — | — | 0 | ninguno |
| 2025/LOTE 04-10.dxf | 3410: 3; 3600: 3; 3610: 2 | 1705: 3; 1800: 3; 1805: 2 | 5 | ninguno |
| 2025/LOTE 05-04.dxf | 3360: 1; 3410: 4; 3600: 2; 3610: 3 | 1680: 1; 1705: 4; 1800: 2; 1805: 3 | 9 | ninguno |
| 2025/LOTE 05-07.dxf | 2763: 1; 3410: 4; 3600: 1; 3610: 7; 3660: 1 | 1381,5: 1; 1705: 4; 1800: 1; 1805: 7; 1830: 1 | 13 | ninguno |
| 2025/LOTE 06-08.dxf | — | — | 0 | ninguno |
| 2025/LOTE 06-09.dxf | 3410: 7; 3600: 4; 3610: 2; 3660: 1 | 1705: 7; 1800: 4; 1805: 2; 1830: 1 | 6 | ninguno |
| 2025/LOTE 06-12.dxf | 3410: 2; 3610: 1; 3660: 1 | 1705: 2; 1805: 1; 1830: 1 | 1 | ninguno |
| 2025/LOTE 06-12_RECTIFICADO.dxf | — | — | 0 | ninguno |
| 2025/LOTE 07-06.dxf | 3360: 1; 3410: 1; 3560: 1; 3600: 3; 3610: 5 | 1680: 1; 1705: 1; 1780: 1; 1800: 3; 1805: 5 | 5 | ninguno |
| 2025/LOTE 08-02 (PALET 3_4_5).dxf | 2460: 1; 3410: 2; 3600: 1; 3610: 2 | 1230: 1; 1705: 2; 1800: 1; 1805: 2 | 10 | ninguno |
| 2025/LOTE 08-03.dxf | 3600: 1; 3610: 2 | 1800: 1; 1805: 2 | 1 | ninguno |
| 2025/LOTE 08-11.dxf | 3410: 4; 3560: 1; 3610: 5 | 1705: 4; 1780: 1; 1805: 5 | 7 | ninguno |
| 2025/LOTE 09-08.dxf | — | — | 0 | ninguno |
| 2025/LOTE 10-05.dxf | 3163: 1; 3360: 1; 3410: 5; 3600: 5; 3610: 9; 3660: 1 | 1581,5: 1; 1680: 1; 1705: 5; 1800: 5; 1805: 9; 1830: 1 | 9 | ninguno |
| 2025/LOTE 11-01.dxf | 3200: 1; 3410: 3; 3600: 2; 3610: 2 | 1600: 1; 1705: 3; 1800: 2; 1805: 2 | 4 | ninguno |
| 2025/LOTE 11-10.dxf | 3410: 1; 3600: 1; 3610: 1; 3660: 1 | 1705: 1; 1800: 1; 1805: 1; 1830: 1 | 3 | ninguno |
| 2025/LOTE 12-04.dxf | 3063: 1; 3410: 3; 3610: 2; 3660: 1 | 1531,5: 1; 1705: 3; 1805: 2; 1830: 1 | 7 | ninguno |
| 2025/LOTE 12-07.dxf | 3410: 1; 3560: 1; 3600: 2; 3610: 2 | 1705: 1; 1780: 1; 1800: 2; 1805: 2 | 6 | ninguno |
| 2025/LOTE 12-07_LINEA JAVIER.dxf | — | — | 0 | ninguno |
| 2025/LOTE 13-09.dxf | 3410: 7; 3600: 1; 3610: 9; 3660: 1 | 1705: 7; 1800: 1; 1805: 9; 1830: 1 | 7 | ninguno |
| 2025/LOTE 13-12.dxf | 3410: 1; 3600: 1; 3610: 2 | 1705: 1; 1800: 1; 1805: 2 | 3 | ninguno |
| 2025/LOTE 14-06.dxf | 3410: 3; 3600: 3; 3610: 1 | 1705: 3; 1800: 3; 1805: 1 | 6 | ninguno |
| 2025/LOTE 14-06_1.dxf | — | — | 2 | ninguno |
| 2025/LOTE 15-02.dxf | 2460: 1; 3410: 3; 3600: 3; 3610: 2 | 1230: 1; 1705: 3; 1800: 3; 1805: 2 | 1 | ninguno |
| 2025/LOTE 15-03.dxf | 3410: 5; 3610: 4; 3660: 1 | 1705: 5; 1805: 4; 1830: 1 | 5 | ninguno |
| 2025/LOTE 15-11.dxf | 3410: 1; 3600: 1; 3610: 5; 3660: 1 | 1705: 1; 1800: 1; 1805: 5; 1830: 1 | 3 | ninguno |
| 2025/LOTE 15-11_URGENTE.dxf | — | — | 0 | ninguno |
| 2025/LOTE 16-04.dxf | 3360: 1; 3560: 1 | 1680: 1; 1780: 1 | 1 | ninguno |
| 2025/LOTE 17-05.dxf | 3600: 1; 3610: 1 | 1800: 1; 1805: 1 | 1 | ninguno |
| 2025/LOTE 18-01.dxf | 3410: 4; 3600: 1; 3610: 3 | 1705: 4; 1800: 1; 1805: 3 | 11 | ninguno |
| 2025/LOTE 18-10.dxf | 3410: 6; 3560: 1; 3600: 1; 3610: 4 | 1705: 6; 1780: 1; 1800: 1; 1805: 4 | 2 | ninguno |
| 2025/LOTE 19-07.dxf | 3410: 5; 3560: 1; 3610: 4 | 1705: 5; 1780: 1; 1805: 4 | 3 | ninguno |
| 2025/LOTE 20-09.dxf | 3600: 1; 3610: 2; 3660: 1 | 1800: 1; 1805: 2; 1830: 1 | 1 | ninguno |
| 2025/LOTE 21-06.dxf | 3410: 2; 3600: 1 | 1705: 2; 1800: 1 | 2 | ninguno |
| 2025/LOTE 22-02.dxf | 3410: 3; 3600: 1; 3610: 4 | 1705: 3; 1800: 1; 1805: 4 | 9 | ninguno |
| 2025/LOTE 22-03.dxf | 3360: 1; 3410: 1; 3610: 1 | 1680: 1; 1705: 1; 1805: 1 | 1 | ninguno |
| 2025/LOTE 22-11.dxf | 3410: 2; 3600: 3; 3610: 1 | 1705: 2; 1800: 3; 1805: 1 | 7 | ninguno |
| 2025/LOTE 22-11_ADICIONALES.dxf | — | — | 2 | ninguno |
| 2025/LOTE 23-08.dxf | 3410: 2; 3560: 1; 3610: 4 | 1705: 2; 1780: 1; 1805: 4 | 8 | ninguno |
| 2025/LOTE 24-05.dxf | 3360: 1; 3410: 8; 3560: 2; 3600: 2; 3610: 11; 3660: 2 | 1680: 1; 1705: 8; 1780: 2; 1800: 2; 1805: 11; 1830: 2 | 20 | ninguno |
| 2025/LOTE 25-01.dxf | 2360: 1; 3410: 2; 3610: 3; 3660: 1 | 1180: 1; 1705: 2; 1805: 3; 1830: 1 | 8 | ninguno |
| 2025/LOTE 25-10.dxf | 3410: 5; 3560: 2; 3600: 3; 3610: 9; 3660: 1 | 1705: 5; 1780: 2; 1800: 3; 1805: 9; 1830: 1 | 4 | ninguno |
| 2025/LOTE 26-04.dxf | 3410: 4; 3560: 1; 3600: 2; 3610: 4; 3660: 1 | 1705: 4; 1780: 1; 1800: 2; 1805: 4; 1830: 1 | 7 | ninguno |
| 2025/LOTE 26-07.dxf | 3610: 1 | 1805: 1 | 0 | ninguno |
| 2025/LOTE 27-09.dxf | 3600: 1; 3660: 1 | 1800: 1; 1830: 1 | 1 | ninguno |
| 2025/LOTE 28-06.dxf | 3410: 1; 3610: 1; 3660: 1 | 1705: 1; 1805: 1; 1830: 1 | 5 | ninguno |
| 2025/LOTE 29-03.dxf | 3410: 7; 3560: 1; 3610: 3; 3660: 2 | 1705: 7; 1780: 1; 1805: 3; 1830: 2 | 2 | ninguno |
| 2025/LOTE 29-11.dxf | 3360: 1; 3410: 1; 3600: 3; 3610: 4; 3660: 1 | 1680: 1; 1705: 1; 1800: 3; 1805: 4; 1830: 1 | 10 | ninguno |
| 2025/LOTE 30-07.dxf | — | — | 0 | ninguno |
| 2025/LOTE 30-08.dxf | 3410: 1; 3600: 1; 3610: 2 | 1705: 1; 1800: 1; 1805: 2 | 7 | ninguno |
| 2025/LOTE 31-05.dxf | 3410: 3; 3600: 2; 3610: 3; 3660: 1 | 1705: 3; 1800: 2; 1805: 3; 1830: 1 | 9 | ninguno |
| 2025/LOTE_08_02 (PALET 1 Y 2).dxf | 3163: 1; 3600: 1; 3610: 2 | 1581,5: 1; 1800: 1; 1805: 2 | 2 | ninguno |
| 2026/AR2603328.dxf | — | — | 0 | ninguno |
| 2026/LONA 3 MM.dxf | — | — | 0 | ninguno |
| 2026/LOTE 01-08.dxf | 3410: 2; 3610: 2 | 1705: 2; 1805: 2 | 7 | ninguno |
| 2026/LOTE 02-05.dxf | 3410: 3; 3600: 3; 3610: 5 | 1705: 3; 1800: 3; 1805: 5 | 7 | ninguno |
| 2026/LOTE 03-10.dxf | 3410: 2; 3560: 1; 3600: 1; 3610: 2; 3660: 1 | 1705: 2; 1780: 1; 1800: 1; 1805: 2; 1830: 1 | 0 | ninguno |
| 2026/LOTE 04-04.dxf | 3610: 2 | 1805: 2 | 3 | ninguno |
| 2026/LOTE 04-07.dxf | 3410: 1; 3610: 2; 3660: 1 | 1705: 1; 1805: 2; 1830: 1 | 0 | ninguno |
| 2026/LOTE 04-07_1.dxf | — | — | 0 | ninguno |
| 2026/LOTE 05-09.dxf | 3410: 3; 3610: 2 | 1705: 3; 1805: 2 | 4 | ninguno |
| 2026/LOTE 06-06.dxf | 3360: 1; 3410: 4; 3560: 1; 3600: 2; 3610: 4; 3660: 1 | 1680: 1; 1705: 4; 1780: 1; 1800: 2; 1805: 4; 1830: 1 | 11 | ninguno |
| 2026/LOTE 07-02.dxf | 3360: 1; 3560: 1; 3600: 1; 3610: 4; 3660: 1 | 1680: 1; 1780: 1; 1800: 1; 1805: 4; 1830: 1 | 5 | ninguno |
| 2026/LOTE 07-03.dxf | 3410: 2; 3600: 1; 3610: 3; 3660: 1 | 1705: 2; 1800: 1; 1805: 3; 1830: 1 | 8 | ninguno |
| 2026/LOTE 08-08.dxf | 3360: 1; 3410: 2; 3600: 1; 3610: 1; 3660: 1 | 1680: 1; 1705: 2; 1800: 1; 1805: 1; 1830: 1 | 0 | ninguno |
| 2026/LOTE 09-05.dxf | 3610: 1 | 1805: 1 | 2 | ninguno |
| 2026/LOTE 09-05_2.dxf | 3560: 1 | — | 3 | ninguno |
| 2026/LOTE 10-01.dxf | — | — | 0 | ninguno |
| 2026/LOTE 10-01_2.dxf | 3260: 1; 3410: 6; 3600: 2; 3610: 10; 3660: 2 | 1705: 6; 1800: 2; 1805: 10; 1830: 2 | 20 | ninguno |
| 2026/LOTE 10-10.dxf | 3410: 4; 3600: 2; 3610: 2; 3660: 2 | 1705: 4; 1800: 2; 1805: 2; 1830: 2 | 0 | ninguno |
| 2026/LOTE 10-10_3.dxf | — | — | 0 | ninguno |
| 2026/LOTE 11-04.dxf | 3410: 3; 3560: 1; 3600: 1; 3610: 2; 3660: 1 | 1705: 3; 1780: 1; 1800: 1; 1805: 2; 1830: 1 | 10 | ninguno |
| 2026/LOTE 12-09.dxf | 3360: 1; 3410: 2; 3610: 3 | 1680: 1; 1705: 2; 1805: 3 | 1 | ninguno |
| 2026/LOTE 14-02.dxf | 3410: 1; 3600: 2; 3660: 1 | 1705: 1; 1800: 2; 1830: 1 | 6 | ninguno |
| 2026/LOTE 14-03.dxf | 3410: 4; 3560: 1; 3600: 1; 3610: 4; 3660: 1 | 1705: 4; 1780: 1; 1800: 1; 1805: 4; 1830: 1 | 5 | ninguno |
| 2026/LOTE 15-08.dxf | 3410: 1; 3610: 1; 3660: 1 | 1705: 1; 1805: 1; 1830: 1 | 3 | ninguno |
| 2026/LOTE 16-05.dxf | 3410: 3; 3560: 1; 3610: 2; 3660: 1 | 1705: 3; 1780: 1; 1805: 2; 1830: 1 | 8 | ninguno |
| 2026/LOTE 17-01.dxf | 3600: 1; 3610: 1 | 1800: 1; 1805: 1 | 6 | ninguno |
| 2026/LOTE 17-10.dxf | 3410: 3; 3600: 2; 3610: 2 | 1705: 3; 1800: 2; 1805: 2 | 2 | ninguno |
| 2026/LOTE 18-07.dxf | 3360: 2; 3410: 2; 3560: 1; 3600: 1; 3610: 2; 3660: 2 | 1680: 2; 1705: 2; 1780: 1; 1800: 1; 1805: 2; 1830: 2 | 0 | ninguno |
| 2026/LOTE 18-07_2.dxf | 3410: 3; 3560: 1; 3600: 1; 3610: 3; 3660: 1 | 1705: 3; 1780: 1; 1800: 1; 1805: 3; 1830: 1 | 0 | ninguno |
| 2026/LOTE 19-09.dxf | 3410: 2; 3560: 1; 3610: 1 | 1705: 2; 1780: 1; 1805: 1 | 1 | ninguno |
| 2026/LOTE 20-06.dxf | 3600: 1; 3610: 1; 3660: 1 | 1800: 1; 1805: 1; 1830: 1 | 4 | ninguno |
| 2026/LOTE 21-02.dxf | 3410: 1; 3600: 2; 3610: 3; 3660: 1 | 1705: 1; 1800: 2; 1805: 3; 1830: 1 | 8 | ninguno |
| 2026/LOTE 21-02_1.dxf | — | — | 0 | ninguno |
| 2026/LOTE 21-02_2.dxf | — | — | 0 | ninguno |
| 2026/LOTE 21-03.dxf | 3360: 1; 3410: 1; 3610: 3 | 1680: 1; 1705: 1; 1805: 3 | 0 | ninguno |
| 2026/LOTE 21-09.dxf | 3410: 1 | 1705: 1 | 0 | ninguno |
| 2026/LOTE 22-08.dxf | 3410: 2; 3610: 1 | 1705: 2; 1805: 1 | 0 | ninguno |
| 2026/LOTE 24-01.dxf | 3410: 1; 3560: 1; 3600: 1 | 1705: 1; 1780: 1; 1800: 1 | 4 | ninguno |
| 2026/LOTE 24-10.dxf | 3610: 1 | 1805: 1 | 4 | ninguno |
| 2026/LOTE 25 89.dxf | — | — | 0 | ninguno |
| 2026/LOTE 25-04.dxf | 3600: 3; 3610: 2 | 1800: 3; 1805: 2 | 2 | ninguno |
| 2026/LOTE 25-07.dxf | 3410: 1; 3600: 1; 3610: 3 | 1705: 1; 1800: 1; 1805: 3 | 3 | ninguno |
| 2026/LOTE 26-09.dxf | 2460: 1; 3410: 2; 3600: 2; 3610: 4; 3660: 1 | 1230: 1; 1705: 2; 1800: 2; 1805: 4; 1830: 1 | 3 | ninguno |
| 2026/LOTE 27-06 (2).dxf | — | — | 0 | ninguno |
| 2026/LOTE 27-06_nuevas.dxf | — | — | 0 | ninguno |
| 2026/LOTE 28-02.dxf | 3410: 4; 3610: 3; 3660: 1; 3760: 1 | 1705: 4; 1805: 3; 1830: 1; 1880: 1 | 6 | ninguno |
| 2026/LOTE 28-02_1.dxf | 3660: 1 | 1830: 1 | 0 | ninguno |
| 2026/LOTE 28-03.dxf | 3360: 1; 3410: 3; 3600: 1; 3610: 2; 3660: 1 | 1680: 1; 1705: 3; 1800: 1; 1805: 2; 1830: 1 | 0 | ninguno |
| 2026/LOTE 29-08.dxf | 3410: 1; 3610: 2 | 1705: 1; 1805: 2 | 0 | ninguno |
| 2026/LOTE 30-05.dxf | 3610: 2; 3660: 1 | 1805: 2; 1830: 1 | 0 | ninguno |
| 2026/LOTE 31-01.dxf | 3610: 1 | 1805: 1 | 3 | ninguno |
| 2026/LOTE 31-01_2.dxf | 3610: 1 | 1805: 1 | 7 | ninguno |
| 2026/LOTE 31-10.dxf | 3410: 2; 3600: 1; 3610: 2; 3660: 1 | 1705: 2; 1800: 1; 1805: 2; 1830: 1 | 0 | ninguno |
| 2026/LOTE13-06.dxf | 3410: 1; 3610: 2 | 1705: 1; 1805: 2 | 8 | ninguno |
| 2026/LOTE18-04.dxf | 3410: 5; 3610: 6; 3660: 1 | 1705: 5; 1805: 6; 1830: 1 | 10 | ninguno |
| 2026/lote 23-05.dxf | 3410: 1; 3560: 1; 3610: 1; 3760: 1 | 1705: 1; 1780: 1; 1805: 1; 1880: 1 | 0 | ninguno |
| 2026/lote 25_ADRI.dxf | — | — | 0 | ninguno |
| 2026/lote rocio.dxf | 3410: 2; 3600: 1; 3610: 1 | 1705: 2; 1800: 1; 1805: 1 | 0 | ninguno |

Referencias que reutilizan un mismo largo de bloque completo, tomando solo los rótulos que el lector ha podido vincular encima del bloque. Compartir largo no demuestra por sí solo que se cortasen juntas en el mismo palet. Los grupos sin rótulo y los próximos se conservan separados en `canalones.json`.


| Largo del combinado mm | Bloques / archivos | Referencias rotuladas |
| --- | --- | --- |
| 2360 | 1 / 1 | 420150-0109 |
| 2460 | 3 / 3 | 420150-0116 |
| 2763 | 1 / 1 | 430127-0025 |
| 3063 | 1 / 1 | 430127-0023 |
| 3163 | 2 / 2 | 430127-0005 |
| 3200 | 1 / 1 | 420150-0127 |
| 3260 | 1 / 1 | 420150-0129 |
| 3360 | 16 / 15 | 430127-0004 |
| 3410 | 210 / 74 | 430127-0001, 420150-0007, 420150-0021, 420150-0087, 420150-0088, 420150-0089, 420150-0001 |
| 3560 | 27 / 24 | 430127-0019, 420150-0064, 420150-0132 |
| 3600 | 95 / 57 | 420150-0002, 420150-0020, 420150-0133 |
| 3610 | 250 / 86 | 420150-0090, 430127-0002, 420150-0091, 420150-0033, 420150-0092 |
| 3660 | 49 / 44 | 430127-0014 |
| 3760 | 2 / 2 | 430127-0007 |

Comparación con las unidades identificadas en oficina, sin usar los bloques dibujados como cantidad producida:


| Oficina → corte | Unidades RPS de familias con canalón | Bloques combinados / mitades dibujados |
| --- | --- | --- |
| AR2603328.dxf → 2026/AR2603328.dxf | 0 | 0 / 0 |
| LOTE 01-08.dxf → 2026/LOTE 01-08.dxf | 66 | 4 / 4 |
| LOTE 02-05.dxf → 2026/LOTE 02-05.dxf | 200 | 11 / 11 |
| LOTE 03-10.dxf → 2026/LOTE 03-10.dxf | 122 | 7 / 7 |
| LOTE 04-04.dxf → 2026/LOTE 04-04.dxf | 99 | 2 / 2 |
| LOTE 04-07.dxf → 2026/LOTE 04-07.dxf | 60 | 4 / 4 |
| LOTE 05-09.dxf → 2026/LOTE 05-09.dxf | 89 | 5 / 5 |
| LOTE 06-06.dxf → 2026/LOTE 06-06.dxf | 122 | 13 / 13 |
| LOTE 07-02.dxf → 2026/LOTE 07-02.dxf | 157 | 8 / 8 |
| LOTE 07-03.dxf → 2026/LOTE 07-03.dxf | 177 | 7 / 7 |
| LOTE 08-08.dxf → 2026/LOTE 08-08.dxf | 0 | 6 / 6 |
| LOTE 09-05.dxf → 2026/LOTE 09-05.dxf | 50 | 1 / 1 |
| LOTE 10-01.dxf → 2026/LOTE 10-01.dxf | 216 | 0 / 0 |
| LOTE 10-10.dxf → 2026/LOTE 10-10.dxf | 102 | 10 / 10 |
| LOTE 11-04.dxf → 2026/LOTE 11-04.dxf | 119 | 8 / 8 |
| LOTE 12-09.dxf → 2026/LOTE 12-09.dxf | 109 | 6 / 6 |
| LOTE 13-06.dxf → 2026/LOTE13-06.dxf | 181 | 3 / 3 |
| LOTE 14-02.dxf → 2026/LOTE 14-02.dxf | 77 | 4 / 4 |
| LOTE 14-03.dxf → 2026/LOTE 14-03.dxf | 231 | 11 / 11 |
| LOTE 16-05.dxf → 2026/LOTE 16-05.dxf | 88 | 7 / 7 |
| LOTE 17-01.dxf → 2026/LOTE 17-01.dxf | 43 | 2 / 2 |
| LOTE 17-10.dxf → 2026/LOTE 17-10.dxf | 99 | 7 / 7 |
| LOTE 18-04.dxf → 2026/LOTE18-04.dxf | 199 | 12 / 12 |
| LOTE 18-07.dxf → 2026/LOTE 18-07.dxf | 107 | 10 / 10 |
| LOTE 19-09.dxf → 2026/LOTE 19-09.dxf | 32 | 4 / 4 |
| LOTE 20-06.dxf → 2026/LOTE 20-06.dxf | 131 | 3 / 3 |
| LOTE 21-02.dxf → 2026/LOTE 21-02.dxf | 121 | 7 / 7 |
| LOTE 21-03.dxf → 2026/LOTE 21-03.dxf | 60 | 5 / 5 |
| LOTE 21-09.dxf → 2026/LOTE 21-09.dxf | 132 | 1 / 1 |
| LOTE 22-08.dxf → 2026/LOTE 22-08.dxf | 149 | 3 / 3 |
| LOTE 23-05.dxf → 2026/lote 23-05.dxf | 61 | 4 / 4 |
| LOTE 24-01.dxf → 2026/LOTE 24-01.dxf | 78 | 3 / 3 |
| LOTE 24-10.dxf → 2026/LOTE 24-10.dxf | 63 | 1 / 1 |
| LOTE 25-04.dxf → 2026/LOTE 25-04.dxf | 102 | 5 / 5 |
| LOTE 25-07.dxf → 2026/LOTE 25-07.dxf | 1 | 5 / 5 |
| LOTE 26-09.dxf → 2026/LOTE 26-09.dxf | 130 | 10 / 10 |
| LOTE 28-02.dxf → 2026/LOTE 28-02.dxf | 147 | 9 / 9 |
| LOTE 28-03.dxf → 2026/LOTE 28-03.dxf | 99 | 8 / 8 |
| LOTE 29-08.dxf → 2026/LOTE 29-08.dxf | 99 | 3 / 3 |
| LOTE 30-05.dxf → 2026/LOTE 30-05.dxf | 56 | 3 / 3 |
| LOTE 31-01.dxf → 2026/LOTE 31-01.dxf | 77 | 1 / 1 |
| LOTE 31-10.dxf → 2026/LOTE 31-10.dxf | 100 | 6 / 6 |

**Regla confirmada por Iván (28/10/2026):** se ponen los bloques y el cortador aplica en el bot la repetición necesaria; esa repetición no queda escrita en el DXF guardado. Se hace un canalón por unidad, entero o dos mitades, y lo que manda el pedido, sin stock. Esto explica que las caras del DXF no cuadren con las unidades de RPS: representan la plantilla de bloques, no el número de ciclos ejecutados. La web debe conservar las unidades y la instrucción de repetición junto con el bloque; no deducir la producción contando sus caras.

## 8. CUTTER 625 × 400 y rótulos «3 MM»

Se reconstruyen 724 rectángulos de 625 × 400 en 268 conjuntos próximos; 259 conjuntos tienen un rótulo «3 MM» cerca. El rótulo prueba una indicación de espesor, no el nombre completo del material. Se mantienen las capas CUTTER de esas piezas.


| Techo vecino (sin atribuirle las piezas) | Conjuntos / archivos | Rectángulos dibujados por conjunto | Conjuntos con varias referencias alrededor |
| --- | --- | --- | --- |
| 430125-0001 | 5 / 5 | 3 | 2 |
| 430125-0002 | 33 / 28 | 2, 3, 4, 1 | 15 |
| 430125-0007 | 2 / 2 | 3 | 0 |
| 430125-0009 | 7 / 6 | 3, 2 | 3 |
| 430125-0012 | 7 / 7 | 3 | 5 |
| 430125-0013 | 1 / 1 | 3 | 1 |
| 430125-0019 | 6 / 6 | 3, 2 | 1 |
| 430127-0001 | 16 / 16 | 2, 3 | 6 |
| 430127-0002 | 34 / 28 | 2, 3 | 16 |
| 430127-0004 | 9 / 9 | 3, 2 | 4 |
| 430127-0005 | 1 / 1 | 3 | 0 |
| 430127-0007 | 1 / 1 | 3 | 0 |
| 430127-0014 | 42 / 39 | 3, 2, 1 | 19 |
| 430127-0019 | 18 / 18 | 2, 3, 1 | 5 |
| 430127-0025 | 1 / 1 | 2 | 1 |
| sin techo vecino único | 85 / 44 | 2, 8, 3, 1 | 71 |


| Archivo | Conjuntos / rectángulos de CUTTER | Techos vecinos (sin atribución) |
| --- | --- | --- |
| 2025/LONA 3 MM.dxf | 3 / 12 | ? |
| 2025/LOTE  01-02.dxf | 3 / 6 | 430125-0002, 430127-0001, ? |
| 2025/LOTE 01-03.dxf | 2 / 5 | 430127-0001, 430127-0014 |
| 2025/LOTE 01-11.dxf | 5 / 10 | 430125-0002, ?, 430127-0002, 430127-0019 |
| 2025/LOTE 02-08.dxf | 1 / 3 | 430127-0004 |
| 2025/LOTE 04-10.dxf | 1 / 2 | 430127-0001 |
| 2025/LOTE 05-04.dxf | 1 / 2 | ? |
| 2025/LOTE 05-07.dxf | 4 / 10 | 430125-0002, 430127-0025, 430127-0002, 430127-0014 |
| 2025/LOTE 06-09.dxf | 4 / 12 | 430127-0002, 430127-0014, ? |
| 2025/LOTE 06-12.dxf | 5 / 15 | ?, 430125-0007, 430125-0009, 430125-0019, 430127-0014 |
| 2025/LOTE 07-06.dxf | 4 / 12 | 430125-0002, 430125-0001, ?, 430127-0019 |
| 2025/LOTE 08-02 (PALET 3_4_5).dxf | 4 / 11 | 430125-0002, 430125-0019, 430127-0002 |
| 2025/LOTE 08-11.dxf | 4 / 8 | 430127-0001, 430127-0019, ?, 430125-0009 |
| 2025/LOTE 10-05.dxf | 11 / 23 | ?, 430127-0014, 430127-0002, 430125-0019, 430127-0004, 430127-0001 |
| 2025/LOTE 11-01.dxf | 4 / 8 | ?, 430127-0002 |
| 2025/LOTE 11-10.dxf | 4 / 8 | 430127-0014, ? |
| 2025/LOTE 12-04.dxf | 6 / 14 | ?, 430125-0002, 430127-0014 |
| 2025/LOTE 12-07.dxf | 4 / 8 | 430125-0002, ?, 430127-0019, 430127-0002 |
| 2025/LOTE 13-09.dxf | 6 / 18 | 430125-0012, 430125-0019, 430127-0002, 430127-0014, ? |
| 2025/LOTE 15-02.dxf | 1 / 3 | 430127-0001 |
| 2025/LOTE 15-03.dxf | 1 / 1 | 430127-0014 |
| 2025/LOTE 15-11.dxf | 4 / 9 | 430127-0014, 430127-0002, 430125-0002 |
| 2025/LOTE 16-04.dxf | 3 / 7 | 430125-0002, 430127-0004, 430127-0019 |
| 2025/LOTE 18-01.dxf | 2 / 4 | 430127-0001, ? |
| 2025/LOTE 19-07.dxf | 4 / 8 | 430127-0002, ?, 430127-0019 |
| 2025/LOTE 20-09.dxf | 2 / 6 | 430125-0002, 430127-0014 |
| 2025/LOTE 21-06.dxf | 1 / 3 | 430125-0002 |
| 2025/LOTE 22-02.dxf | 6 / 12 | 430125-0002, ?, 430127-0002 |
| 2025/LOTE 22-03.dxf | 2 / 5 | ?, 430127-0004 |
| 2025/LOTE 22-11.dxf | 1 / 3 | 430125-0002 |
| 2025/LOTE 23-08.dxf | 3 / 9 | 430125-0002, 430127-0002 |
| 2025/LOTE 24-05.dxf | 12 / 36 | 430127-0019, ?, 430125-0012, 430125-0009, 430127-0002, 430127-0014, 430127-0001 |
| 2025/LOTE 25-01.dxf | 3 / 6 | 430125-0019, 430127-0002, 430127-0014 |
| 2025/LOTE 26-04.dxf | 7 / 20 | 430125-0009, 430127-0019, 430127-0014, 430125-0012, 430127-0002, ?, 430127-0001 |
| 2025/LOTE 27-09.dxf | 1 / 2 | 430127-0014 |
| 2025/LOTE 28-06.dxf | 3 / 9 | 430125-0002, ? |
| 2025/LOTE 29-03.dxf | 4 / 11 | 430127-0002, 430127-0019, 430127-0014 |
| 2025/LOTE 29-11.dxf | 3 / 9 | 430127-0014, ? |
| 2025/LOTE 30-08.dxf | 1 / 3 | 430127-0002 |
| 2025/LOTE 31-05.dxf | 1 / 3 | 430127-0014 |
| 2025/LOTE_08_02 (PALET 1 Y 2).dxf | 1 / 3 | 430127-0005 |
| 2026/LONA 3 MM.dxf | 3 / 12 | ? |
| 2026/LOTE 01-08.dxf | 1 / 3 | 430127-0002 |
| 2026/LOTE 02-05.dxf | 3 / 9 | 430127-0001, 430125-0002 |
| 2026/LOTE 03-10.dxf | 5 / 10 | 430127-0002, ?, 430127-0014, 430127-0019 |
| 2026/LOTE 04-07.dxf | 3 / 9 | 430125-0002, 430127-0014, ? |
| 2026/LOTE 05-09.dxf | 2 / 6 | 430127-0002, 430125-0001 |
| 2026/LOTE 06-06.dxf | 5 / 15 | ?, 430127-0002, 430127-0014, 430127-0019, 430127-0004 |
| 2026/LOTE 07-02.dxf | 3 / 9 | 430127-0004, 430127-0019, ? |
| 2026/LOTE 07-03.dxf | 3 / 9 | 430125-0001, 430127-0014, 430127-0002 |
| 2026/LOTE 08-08.dxf | 4 / 12 | ?, 430125-0009, 430127-0004, 430127-0014 |
| 2026/LOTE 09-05.dxf | 1 / 3 | 430127-0002 |
| 2026/LOTE 10-01_2.dxf | 7 / 21 | 430125-0007, 430127-0014, 430125-0002, ? |
| 2026/LOTE 10-10.dxf | 4 / 12 | 430127-0014, 430125-0002, ? |
| 2026/LOTE 11-04.dxf | 3 / 9 | 430127-0001, 430127-0019, 430127-0014 |
| 2026/LOTE 12-09.dxf | 4 / 12 | ?, 430127-0004, 430125-0001 |
| 2026/LOTE 14-02.dxf | 2 / 6 | 430127-0014, ? |
| 2026/LOTE 14-03.dxf | 3 / 9 | 430127-0002, 430127-0001, 430127-0014 |
| 2026/LOTE 15-08.dxf | 3 / 9 | 430125-0002, 430127-0002, 430127-0014 |
| 2026/LOTE 16-05.dxf | 3 / 9 | 430127-0014, ?, 430127-0019 |
| 2026/LOTE 17-10.dxf | 3 / 9 | 430127-0001, 430125-0001, 430125-0012 |
| 2026/LOTE 18-07.dxf | 6 / 18 | ?, 430127-0004, 430127-0014, 430127-0019 |
| 2026/LOTE 18-07_2.dxf | 4 / 12 | ?, 430127-0019 |
| 2026/LOTE 19-09.dxf | 1 / 2 | 430127-0019 |
| 2026/LOTE 20-06.dxf | 1 / 3 | 430127-0014 |
| 2026/LOTE 21-02.dxf | 2 / 6 | 430127-0014, 430125-0002 |
| 2026/LOTE 21-03.dxf | 3 / 9 | 430125-0019, ? |
| 2026/LOTE 21-09.dxf | 1 / 3 | 430127-0001 |
| 2026/LOTE 22-08.dxf | 1 / 3 | 430127-0001 |
| 2026/LOTE 24-01.dxf | 3 / 6 | ?, 430127-0019 |
| 2026/LOTE 24-10.dxf | 2 / 6 | 430125-0002 |
| 2026/LOTE 25-04.dxf | 2 / 5 | 430127-0002, 430125-0002 |
| 2026/LOTE 25-07.dxf | 1 / 3 | 430125-0002 |
| 2026/LOTE 26-09.dxf | 4 / 8 | 430127-0002, ? |
| 2026/LOTE 28-02.dxf | 5 / 15 | 430127-0014, 430127-0001, 430127-0007, ? |
| 2026/LOTE 28-02_1.dxf | 1 / 3 | 430127-0014 |
| 2026/LOTE 28-03.dxf | 3 / 9 | 430125-0002, 430127-0014, ? |
| 2026/LOTE 29-08.dxf | 3 / 9 | 430125-0002, ? |
| 2026/LOTE 30-05.dxf | 3 / 8 | 430125-0012, ?, 430125-0002 |
| 2026/LOTE 31-01_2.dxf | 1 / 3 | 430125-0013 |
| 2026/LOTE 31-10.dxf | 4 / 12 | 430127-0014, 430125-0012, 430125-0002 |
| 2026/LOTE13-06.dxf | 3 / 9 | 430125-0009, 430127-0014, 430125-0012 |
| 2026/LOTE18-04.dxf | 4 / 11 | 430127-0002, ?, 430127-0014 |
| 2026/lote 23-05.dxf | 3 / 9 | ? |

Solo se anota el techo vecino cuando es único en ese entorno: **no se atribuyen las piezas a esa referencia ni se aplica repetición**. Hay conjuntos junto a filas mixtas y rótulos de otras familias. El coordinador confirma que es otro material y que Iván lo especificará más adelante. El número dibujado no equivale a piezas por unidad; no queda demostrada esa cantidad ni la composición exacta del material.

## 9. Dibujos de confección para copiar a la web

El script scripts/extraer-dibujos-assa.mjs entrega **113 referencias** en [dibujosConfeccion.json](../../src/assa/dibujosConfeccion.json), con mm, origen abajo a la izquierda y capas originales. Conserva líneas, arcos, textos, sus giros y anclajes; las flechas rellenas de las cotas se conservan por su contorno. No genera medidas nuevas. Las cantidades xN, cifras de línea, encabezados, stock y notas grandes del pedido se excluyen.

La selección parte del rótulo y de los componentes conectados del contorno rosa (`referencias` / `referencia-1`), no de una franja recortada a mitad de camino hacia la fila vecina. Los componentes próximos se atribuyen al contorno más cercano. Una cota solo entra si sus dos puntos de referencia pertenecen a la geometría elegida y su dibujo expandido permanece cerca; se conserva el bloque completo de la cota para no perder sus textos o flechas. Las cotas con bloque visible desplazado lejos quedan fuera. Las vistas sin contorno rosa identificable se señalan.

Se prefiere la fecha más reciente del nombre de lote de 2026, incluida la preparación de enero con pedidos de 2025. En las variantes, el coordinador ha indicado que manda la plantilla: se da prioridad a una vista cuyo dibujo coincida con ella; en su defecto se conserva la más reciente de las que encajan geométricamente, con sus cotas y textos pendientes. **No es una aprobación de fabricación.** Se conserva «revisar variantes» y todas las apariciones quedan en tmp. La firma compara geometría relativa a 0,1 mm sin depender del orden de entidades ni del sentido de cada raya; la firma completa incluye cotas y rótulos.


| Familia | Referencias extraídas | Con forma repetida en varios lotes | Con distintas formas |
| --- | --- | --- | --- |
| 410121 | 1 | 0 | 0 |
| 410123 | 1 | 0 | 0 |
| 410124 | 1 | 1 | 0 |
| 410129 | 3 | 0 | 0 |
| 410130 | 3 | 0 | 0 |
| 410134 | 1 | 1 | 0 |
| 410143 | 1 | 0 | 0 |
| 410155 | 1 | 0 | 0 |
| 410170 | 1 | 0 | 0 |
| 410171 | 1 | 0 | 0 |
| 410172 | 2 | 0 | 0 |
| 410173 | 2 | 0 | 0 |
| 410182 | 2 | 0 | 0 |
| 410241 | 2 | 1 | 0 |
| 410242 | 2 | 1 | 0 |
| 410245 | 2 | 0 | 0 |
| 420102 | 22 | 18 | 4 |
| 420148 | 17 | 12 | 0 |
| 420150 | 18 | 14 | 3 |
| 430125 | 8 | 5 | 1 |
| 430127 | 7 | 5 | 5 |
| 430129 | 4 | 4 | 0 |
| 430172 | 11 | 10 | 3 |

Referencias con variantes detectadas. Estas diferencias pueden ser cambios de dibujo, marcas o distinta composición de la vista; no se presentan como cambios de medida aprobados.


| Referencia | Fuente elegida | Formas distintas | Lotes con la forma elegida / contrastados |
| --- | --- | --- | --- |
| 420102-0022 | LOTE 31-10.dwg | 2 | 9 / 10 |
| 420102-0034 | LOTE 31-10.dwg | 2 | 16 / 17 |
| 420102-0050 | LOTE 31-10.dwg | 2 | 17 / 18 |
| 420102-0086 | LOTE 29-08.dwg | 2 | 4 / 5 |
| 420150-0002 | LOTE 31-10.dwg | 2 | 3 / 16 |
| 420150-0021 | LOTE 10-10.dwg | 2 | 9 / 9 |
| 420150-0092 | LOTE 31-10.dwg | 2 | 10 / 10 |
| 430125-0012 | LOTE 31-10.dwg | 2 | 6 / 7 |
| 430127-0001 | LOTE 17-10.dwg | 2 | 6 / 14 |
| 430127-0002 | LOTE 29-08.dwg | 2 | 7 / 10 |
| 430127-0004 | LOTE 12-09.dwg | 2 | 3 / 5 |
| 430127-0007 | LOTE 23-05.dwg | 2 | 1 / 2 |
| 430127-0014 | LOTE 31-10.dwg | 2 | 11 / 22 |
| 430172-0007 | LOTE 31-10.dwg | 2 | 22 / 23 |
| 430172-0009 | LOTE 31-10.dwg | 2 | 6 / 6 |
| 430172-0033 | LOTE 23-05.dwg | 2 | 1 / 2 |

**Contraste directo con COMBURSA (CRAWFORD).** Se ancla una raya larga del contorno rosa y se buscan todos los trazos en el maestro por capa y posición relativa, a 0,15 mm. Se permite trasladar, nunca girar ni escalar. También se cuentan los trazos del maestro que quedan dentro de la caja de esa vista y no están en ella. La coincidencia de forma se distingue de la del dibujo con cotas y textos: que los trazos encajen en esa caja no demuestra que no haya otra vista del mismo código fuera de ella. Los casos dudosos conservan su aviso.


| Referencia | Variante / fuente | Forma: faltan / extras | Dibujo: faltan / extras | Fuente elegida según plantilla |
| --- | --- | --- | --- | --- |
| 420102-0022 | 1: LOTE 31-10.dwg | 0 / 0 | 0 / 0 | LOTE 31-10.dwg |
| 420102-0022 | 2: LOTE 08-08.dwg | 1 / 0 | 1 / 11 | LOTE 31-10.dwg |
| 420102-0034 | 1: LOTE 31-10.dwg | 0 / 0 | 0 / 0 | LOTE 31-10.dwg |
| 420102-0034 | 2: LOTE 28-02.dwg | 4 / 0 | 9 / 5 | LOTE 31-10.dwg |
| 420102-0050 | 1: LOTE 31-10.dwg | 0 / 0 | 0 / 0 | LOTE 31-10.dwg |
| 420102-0050 | 2: LOTE 28-02.dwg | sin anclaje seguro | sin anclaje seguro | LOTE 31-10.dwg |
| 420102-0086 | 1: LOTE 29-08.dwg | 0 / 0 | 0 / 11 | LOTE 29-08.dwg |
| 420102-0086 | 2: LOTE 06-067-03.dwg | 0 / 0 | 8 / 8 | LOTE 29-08.dwg |
| 420150-0002 | 1: LOTE 31-10.dwg | 0 / 0 | 27 / 96 | LOTE 31-10.dwg |
| 420150-0002 | 2: LOTE 25-07.dwg | 0 / 2 | 33 / 110 | LOTE 31-10.dwg |
| 420150-0021 | 1: LOTE 10-10.dwg | 0 / 0 | 28 / 54 | LOTE 10-10.dwg |
| 420150-0021 | 2: LOTE 28-02.dwg | sin anclaje seguro | sin anclaje seguro | LOTE 10-10.dwg |
| 420150-0092 | 1: LOTE 31-10.dwg | 0 / 0 | 27 / 54 | LOTE 31-10.dwg |
| 420150-0092 | 2: LOTE 28-02.dwg | sin anclaje seguro | sin anclaje seguro | LOTE 31-10.dwg |
| 430125-0012 | 1: LOTE 31-10.dwg | 0 / 0 | 20 / 20 | LOTE 31-10.dwg |
| 430125-0012 | 2: LOTE 28-02.dwg | 6 / 6 | 31 / 42 | LOTE 31-10.dwg |
| 430127-0001 | 1: LOTE 17-10.dwg | 0 / 0 | 0 / 262 | LOTE 17-10.dwg |
| 430127-0001 | 2: LOTE 10-10.dwg | 0 / 0 | 32 / 45 | LOTE 17-10.dwg |
| 430127-0002 | 1: LOTE 29-08.dwg | 0 / 0 | 0 / 337 | LOTE 29-08.dwg |
| 430127-0002 | 2: LOTE 06-06.dwg | 0 / 0 | 40 / 56 | LOTE 29-08.dwg |
| 430127-0004 | 1: LOTE 12-09.dwg | 0 / 0 | 0 / 281 | LOTE 12-09.dwg |
| 430127-0004 | 2: LOTE 06-06.dwg | 0 / 0 | 48 / 61 | LOTE 12-09.dwg |
| 430127-0007 | 1: LOTE 23-05.dwg | 0 / 0 | 28 / 74 | LOTE 23-05.dwg |
| 430127-0007 | 2: LOTE 28-02.dwg | 0 / 0 | 0 / 281 | LOTE 23-05.dwg |
| 430127-0014 | 1: LOTE 31-10.dwg | 0 / 0 | 32 / 34 | LOTE 31-10.dwg |
| 430127-0014 | 2: LOTE 08-08.dwg | 0 / 0 | 0 / 281 | LOTE 31-10.dwg |
| 430172-0007 | 1: LOTE 31-10.dwg | 0 / 0 | 29 / 39 | LOTE 31-10.dwg |
| 430172-0007 | 2: LOTE 31-01.dwg | 2 / 12 | 30 / 50 | LOTE 31-10.dwg |
| 430172-0009 | 1: LOTE 31-10.dwg | 0 / 0 | 41 / 55 | LOTE 31-10.dwg |
| 430172-0009 | 2: LOTE 30-05.dwg | 1 / 0 | 9 / 152 | LOTE 31-10.dwg |
| 430172-0033 | 1: LOTE 23-05.dwg | 0 / 0 | 69 / 0 | LOTE 23-05.dwg |
| 430172-0033 | 2: LOTE 31-01.dwg | 4 / 10 | 52 / 10 | LOTE 23-05.dwg |


| Referencia extraída sin cruce exacto del rótulo de pedido y cifra de hoja | Fuente (no se inventa una línea RPS) |
| --- | --- |
| 410170-0001 | LOTE 25-07.dwg |
| 410171-0001 | LOTE 25-07.dwg |
| 410182-0037 | LOTE 25-07.dwg |
| 420102-0020 | LOTE 12-09.dwg |
| 420102-0021 | LOTE 12-09.dwg |
| 420148-0031 | LOTE 01-08.dwg |
| 420148-0116 | LOTE 01-08.dwg |
| 420150-0120 | LOTE 14-03.dwg |
| 420150-0133 | LOTE 26-09.dwg |
| 430127-0002 | LOTE 29-08.dwg |
| 430172-0035 | LOTE 01-08.dwg |

Referencias con línea identificada en las hojas de oficina para las que no se ha podido entregar un dibujo:


| Referencia sin dibujo | Motivos guardados por el extractor |
| --- | --- |
| 430125-0019 | No se localiza un contorno rosa cercano al rótulo. |
| 430172-0032 | No se localiza un contorno rosa cercano al rótulo. |
| 410129-0212 | No hay un rótulo completo atribuible en la columna izquierda. |

La revisión visual compara original y extracción de una referencia de cada una de las siete familias principales. Los PNG locales, a 1600 × 1000, se generan con `capturar.mjs`; no se ha arrancado la web. Las vistas se han inspeccionado y se ha corregido la pérdida inicial de cotas antes de emitir este catálogo.


| Familia | Captura original / extracción |
| --- | --- |
| 420102 | [PNG 420102](../../tmp/assa-investigacion/confeccion-420102.png) |
| 420148 | [PNG 420148](../../tmp/assa-investigacion/confeccion-420148.png) |
| 420150 | [PNG 420150](../../tmp/assa-investigacion/confeccion-420150.png) |
| 430125 | [PNG 430125](../../tmp/assa-investigacion/confeccion-430125.png) |
| 430127 | [PNG 430127](../../tmp/assa-investigacion/confeccion-430127.png) |
| 430129 | [PNG 430129](../../tmp/assa-investigacion/confeccion-430129.png) |
| 430172 | [PNG 430172](../../tmp/assa-investigacion/confeccion-430172.png) |

## 10. Repetición y comprobaciones

No se han movido ni modificado las copias de origen, ni usado maqcorte, BOT/Pendientes o el servidor de producción. No hay dependencias nuevas. Se conservan SHA-256 y tamaños de todas las fuentes. El proceso escribe los resultados grandes en tmp; el único catálogo añadido a src es el solicitado después por el coordinador.

```powershell
node scripts/assa-investigacion/analizar.mjs
node scripts/assa-investigacion/profundizar.mjs
node scripts/extraer-dibujos-assa.mjs
node scripts/assa-investigacion/plantilla.mjs
node scripts/assa-investigacion/capturar.mjs
node scripts/assa-investigacion/informe.mjs
node scripts/assa-investigacion/verificar.mjs
node --test scripts/assa-investigacion/geometria.test.mjs scripts/assa-investigacion/dibujos.test.mjs
```

Se pueden indicar otras copias con `ASSA_ESTUDIO`, `ASSA_RPS` y `ASSA_LOTES_OFICINA`. Las salidas grandes siguen en `tmp/assa-investigacion/` del repositorio. La extracción usa `analisis.json`, por lo que hay que repetir la secuencia en este orden si cambia la foto de entrada. Los PNG usan el Playwright ya instalado en el proyecto.


| Resultado local | Contenido |
| --- | --- |
| analisis.json | Fuentes, SHA-256, todos los textos, hojas, palets, filas, cuerpos y cruces por referencia |
| pilas.json / uniones.json | Alturas, ocupación y parejas con raya central |
| canalones.json / juegosCanalon.json | Caras, bloques, largos, posiciones, rótulos y repeticiones |
| materiales.json | Cada conjunto 625 × 400, sus rótulos y el límite de atribución |
| reparto.json | Candidatos de cada fila de palet y líneas identificadas |
| dibujos-apariciones.json / dibujos-variantes.json | Todas las vistas de confección, firmas, avisos y referencias sin dibujo |
| citas-rps.json / verificacion.json | Citas comprobadas, huellas de origen y condiciones del catálogo |

## 11. Dudas concretas para Iván o Tamara

1. Cuando la cifra del DWG y NumLine de RPS llevan referencias distintas, ¿es una renumeración de la hoja o un encabezado conservado de otro pedido? Las discrepancias comprobadas están en la tabla de la primera sección. La web necesita conservar NumLine real y, si procede, otra cifra de presentación.

2. ¿El palet de la previsión es siempre el palet de expedición, incluso cuando pone «se corta en palet…»? Hace falta conservar por separado destino y lugar del conjunto de corte si no coinciden.

3. Canalones: la duda sobre las cantidades queda contestada por Iván: la repetición la aplica el cortador en el bot y no se guarda en el DXF. Para implementar la web falta mostrar y conservar esa instrucción junto con el total del pedido; no se debe inventar una cantidad a partir de las caras dibujadas.

4. ¿Qué material exacto es «3 MM», de qué referencias son los 625 × 400 de cada fila mixta y cuántos se cortan por unidad? Los tres rectángulos de una plantilla no bastan para responder esa cuenta.

5. Las parejas con raya central también aparecen en varios techos. ¿Se envarillan de dos en dos igual que los laterales, o esa marca tiene otra función en esos casos? No se ha extendido la regla automáticamente.

6. Para una suelta de techo de fondo 600, ¿cuándo se conserva 691 y cuándo se usa 680? Ambas medidas se repiten; no sale una condición universal solo del número de alturas de esa suelta. ¿Se admite la excepción decimal que figura en la tabla?

7. ¿Se toma siempre como vigente el dibujo de confección del lote más reciente? Las referencias con cambios y las que no tienen dibujo quedan enumeradas; necesitan revisión de la versión, sin sustituirlas por una forma parecida.

8. ¿Qué ventana, formato y escala se imprimen del Modelo en el taller? Los archivos permiten copiar su contenido, pero no certificar la impresión que recibió el cortador.

Las 16 referencias con variantes quedan abiertas para confirmar la vista completa. Cada enlace muestra sus variantes lado a lado y el recorte de plantilla contrastado:

- **420102-0022**: dibujo coincide con plantilla; fuente elegida LOTE 31-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-420102-0022.png).

- **420102-0034**: dibujo coincide con plantilla; fuente elegida LOTE 31-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-420102-0034.png).

- **420102-0050**: dibujo coincide con plantilla; fuente elegida LOTE 31-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-420102-0050.png).

- **420102-0086**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 29-08.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-420102-0086.png).

- **420150-0002**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 31-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-420150-0002.png).

- **420150-0021**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 10-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-420150-0021.png).

- **420150-0092**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 31-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-420150-0092.png).

- **430125-0012**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 31-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-430125-0012.png).

- **430127-0001**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 17-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-430127-0001.png).

- **430127-0002**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 29-08.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-430127-0002.png).

- **430127-0004**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 12-09.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-430127-0004.png).

- **430127-0007**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 23-05.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-430127-0007.png).

- **430127-0014**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 31-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-430127-0014.png).

- **430172-0007**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 31-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-430172-0007.png).

- **430172-0009**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 31-10.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-430172-0009.png).

- **430172-0033**: forma coincide con plantilla; revisar cotas y textos; fuente elegida LOTE 23-05.dwg. [Variantes y plantilla](../../tmp/assa-investigacion/variantes-430172-0033.png).

### Respuestas de Iván (28/10/2026)

1. **Cifra del DWG distinta de NumLine:** «habrá errores». Son fallos de la hoja hecha a mano; la web usa siempre el
   NumLine de RPS.
2. **«Se corta en palet…»:** «es el palet donde va esa pieza». El palet es el de la pieza; no hay que separar destino y
   lugar del corte.
3. **«3 MM» / CUTTER 625 × 400:** «es una lona de 3 mm»; Iván especifica referencias y cantidades más adelante.
4. **Parejas con raya central en techos:** «supongo; compruébalo en los cortes: si después lo ves unido en el corte, pues
   ya sabes que sí se juntan». Regla: se juntan de dos en dos donde los cortes reales lo muestran (los 13 grupos de
   techo de la sección 6); comprobar por referencia antes de generarlo.
5. **Techos de fondo 600, 691 o 680:** «si no son 3 o más, pueden ir a 69,1 porque no cubren el ancho del paño». Regla:
   680 solo cuando van tres o más en el ancho del rollo; sueltas o de dos, 691.
6. **Dibujo de confección vigente:** «sí, lo lógico es eso»: el del lote más reciente.
7. **Lo que recibe el cortador:** «solo le llega el papel donde le ponen las cantidades que debe cortar de cada referencia,
   y debe coincidir con las cantidades que salen en el corte que le pasemos». La web debe sacar esa hoja de cantidades
   por referencia, cuadrada con el corte (repeticiones «x» incluidas).
