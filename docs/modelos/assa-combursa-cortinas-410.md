# Corte de cortinas 410 de Combursa

Las cortinas pasan por la máquina y después a confección, sin envarillar.
El corte usa las cantidades, las OF y las líneas del pedido de RPS. Cada
palet tiene filas separadas por material en el mismo DXF. El papel del
cortador cuenta las piezas físicas a partir de los programas y las coteja
con el despiece por unidad y la cantidad de RPS.

## Variantes activas

Se identifica la variante por referencia y descripción de RPS. Se aceptan
diferencias de mayúsculas, espacios y puntos finales. Un cambio de cotas,
material, mano o marcas requiere otro contraste. El dibujo conserva la mano,
los orillos, los cortes y las marcas del original. Las pilas comparten bordes
de corte tal como en los lotes. Las cortinas nunca se empatan para envarillar.

| Referencia | Despiece por unidad, medidas de corte y rollos en mm |
| --- | --- |
| `410124-0003` | ALPHA negro 580 g 2.500: 1 A1, 1 A2 y 1 frontal A3. El par A1/A2 ocupa 864 × 2.100, con abertura compartida. El A3 mide 3.330 × 320. Máquina corta con DISCO1 y marca las tres identificaciones de 10 mm con rotulador. |
| `410129-0117` | PLASTEL negra 2.040: 1 cuerpo de 2.000 × 900 con 4 agujeros Ø40 y marcas laterales, y 2 tapas de 320 × 340. Lona 3 mm 1.600: 1 frente de 2.000 × 300. |
| `410130-0006` y `410130-0018` | PLASTEL negra 2.040: 1 cuerpo de 3.000 × 1.000 o 2.400 × 1.000, con entrante y marcas de su variante. PVC negro 900 g 3.000: 1 tapa lisa y 1 de 6 agujeros Ø40, de 340 × 370. Lona 3 mm 1.600: 1 frente de 2.950 × 300 o 2.350 × 300 con marca de 750 × 100. |
| `410130-0175` | PLASTEL negra 2.040: 1 cuerpo de 2.300 × 900 con entrante de 50 mm y marcas. PVC negro 900 g 3.000: 1 tapa lisa y 1 de 6 agujeros Ø40, de 324,1 × 340. Lona 3 mm 1.600: 1 frente de 2.250 × 300 con marca de 750 × 100. |
| `410143-0002` | Lona 2 mm: 1 cuerpo de 3.350 × 1.100 con 8 agujeros Ø40 y 2 tapas de 440 × 370. Lona 3 mm: 1 frente de 3.350 × 575, con abertura y dos marcas Ø8. |
| `410143-0007` | Lona 2 mm: 1 cuerpo de 3.000 × 1.000 con 7 agujeros Ø40 y 2 tapas de 340 × 370. Lona 3 mm: 1 frente de 3.000 × 675, con los hombros de 300 mm del maestro y dos marcas Ø8. Dos cuerpos o dos frentes por tirada cuando hay unidades suficientes. |
| `410170-0001` y `410171-0001` | Lona 2 mm 2.100: 1 cuerpo de 2.600 × 1.116,2 y 2 tapas, una con 6 agujeros Ø40. Lona 1 mm 1.500: 1 tira de 2.600 × 416,2 y 12 solapas de 350 × 400, 8 lisas y 4 marcadas. Cuerpo y tira de mano derecha o izquierda según referencia. |
| `410182-0037` | Lona 2 mm 1.200: 1 cuerpo de 3.100 × 1.000 con 8 agujeros Ø40. PVC negro 900 g 3.000: 2 tapas lisas de 340 × 370. Se cortan hasta 8 tapas por ancho de rollo con DISCO1. |

Las variantes `0117` y `0175` están rotuladas en
`COMBURSA (CRAWFORD)2.dwg`. Las dos manos tienen dibujo de familia
`OK410170.dwg` y `OK410171.dwg`. El DXF de oficina recupera las vistas de
confección del 07-11. En la `0175` usa la parte de confección de la hoja,
separada de las tiradas y multiplicadores antiguos.

## Contraste de máquina

Se leyeron 55 bloques de DXF de maqcorte. Se contrastaron los contornos y
las marcas en ambos sentidos por herramienta, con tolerancia de 1 mm. Se
admiten tramos consecutivos en un solo trazo o en varios cuando cubren el
mismo recorrido. La cuenta por unidad y las incidencias de los rótulos
históricos están descritas en
[Q-AS0711-03](./dudas-abiertas.md#combursa--lote-07-11-03112026).

| Referencia | Lotes comprobados | Resultado y motivo |
| --- | --- | --- |
| `410124-0003` | 08-02-2025 (geometría) y 26-09-2026 (geometría y letras) | **Igual** en geometría por herramienta, dentro de 0,001 mm. El maestro identifica A1, A2 y A3 en la capa de números de paño. El corte de 2026 las lleva en rotulador, 17 de cada una. En el de 2025 aparecen como rótulos de plano. Las tres OF imputan ALPHA 580 g negro de 2.500 mm. |
| `410129-0117` | 26-07 y 13-09 de 2025, 07-11-2026 | **Igual** en piezas y herramientas. Máximo 0,690 mm en los frentes de 3 mm. El «X8» del 07-11 elevaría la cantidad sobre las 27 de RPS. |
| `410130-0006` | 06-04 y 13-04 de 2024 | **Igual** en contorno y herramientas geométricas. Máximo 0,023 mm. Usa la columna alternada con DISCO1. El 13-04 añade una letra B en rotulador. La web conserva la marca rectangular del maestro y del 06-04, con el blanco indicado en el rótulo del programa. |
| `410130-0018` | 11-01-2025 (cuerpo y frente), 23-08-2025 (juego completo) | **Igual**. Máximo 0,033 mm. El 23-08 corta las cuatro tapas perforadas y luego las cuatro lisas con travesaños DISCO2. El 11-01 usa un recorte de PVC con alturas de 374 y 378 mm en dos tapas. |
| `410130-0175` | 09-08 y 13-09 de 2025, 07-11-2026 (fichero PALET 4-5) | **Igual** en piezas y herramientas. Máximo 0,012 mm. El 07-11 histórico incluye dos tapas de relleno y un «x2» donde la cuenta de 54 cuerpos da «x27». |
| `410143-0002` | 11-05-2024 (cuerpo), 25-10 y 08-11 de 2025 (juego completo) | **Igual**. Máximo 0,006 mm. El maestro `HOK410143.dwg` da el cuerpo, las tapas de 370 × 440 y el frente. Los dos lotes de 2025 cortan las tapas en pareja de 880 × 370. Las cinco OF imputan lona negra de 2 y 3 mm. |
| `410143-0007` | 01-11-2025 (cuerpo y frente doble), 10-01-2026 (cuerpo y frente, sueltos y dobles, y tapas) | **Igual** con el maestro `HOK410143.dwg` y el corte rectificado del 10-01, dentro de 0,001 mm por herramienta frente a máquina. **Difiere** del 01-11 en el frente. El cuerpo coincide dentro de 0,001 mm, pero los hombros antiguos miden 400 mm y desplazan los cortes y las marcas 100 mm. Las OF `0221907` y `0223600` imputan lona negra de 2 y 3 mm. La segunda corresponde al pedido de rectificación del mismo muelle. |
| `410170-0001` | 23-08-2025, 25-07 y 07-11 de 2026 | **Difiere** en un trazo de rotulador duplicado en el conjunto de 2 mm antiguo. Se dibuja una vez. Contorno y marcas hasta 0,005 mm. Se cortan 12 solapas por unidad, frente a las 22 del caso aislado de noviembre. |
| `410171-0001` | 23-08-2025, 25-07 y 07-11 de 2026 | **Difiere** en el mismo trazo duplicado de rotulador. Contorno y marcas hasta 0,012 mm. Misma regla de 12 solapas, con el dibujo de la mano izquierda. |
| `410182-0037` | 21-07-2023, 23-08-2025 y 25-07-2026 (cuerpo y tapas en los tres) | **Igual** en las piezas y herramientas según el maestro `OK410182.dwg`, dentro de 0,001 mm frente a máquina. La cantidad **difiere** en 2023, con 66 tapas para 31 cuerpos. En 2025 se ven 2 tapas y 1 cuerpo. En 2026 el cuerpo lleva «X26» y la malla tiene 52 tapas, tal como pide el maestro. Las OF imputan lona de 2 mm y resto de PVC. Los DXF rotulan ese PVC como negro de 900 g. |

Para repetir el contraste, con las copias de máquina en
`tmp/assa-410/cortes/<año>/`, ejecuta
`node scripts/assa-investigacion/contrastar-cortinas-410.mjs`.
El contraste general del catálogo lista aparte las cortinas multimaterial
que se comprueban con ese programa.

## Prueba con las 25 líneas del 07-11-2026

Se leyeron las 25 líneas de RPS y los palets por albarán. Quedaron 25
validadas, 314 unidades de pedido, 55 programas y 41 filas del papel del
cortador cuadradas. Para las cortinas, el palet 3 lleva la `0117` (27
unidades), el palet 4 las dos manos (1 de cada una) y el palet 5 la
`0175` (54 unidades, todas en el palet 5 según expedición). El plano histórico
indicaba «5 y 6» y situaba la mano derecha en el 3.

| Palet | Referencia | Piezas en el DXF y en el papel |
| --- | --- | --- |
| 3 | `410129-0117` | 81 PLASTEL y 27 lona de 3 mm |
| 4 | `410170-0001` | 3 lona de 2 mm y 13 lona de 1 mm |
| 4 | `410171-0001` | 3 lona de 2 mm y 13 lona de 1 mm |
| 5 | `410130-0175` | 54 PLASTEL, 108 PVC 900 g y 54 lona de 3 mm |

Se abrió, confirmó y extrajo el corte del DWG mediante ODA. El DXF de
máquina releído contiene 1.988 líneas (12 de la leyenda estándar) y
651 círculos o arcos. Los 16 programas de cortinas releídos coinciden por
herramienta con el plano generado, con una desviación máxima de
0,00049 mm. Se verificó la copia de prueba por SHA-256. En la misma
carpeta se dejó el DXF de oficina, con hojas de pedido y de cortador.

```text
\\192.168.0.128\Oftecnica\Oficina Tecnica\DXF PRUEBAS WEB\COMBURSA\Cortinas 410 - LOTE 07-11 - 20261127-075605
```

## Prueba con el lote 13-06-2026

Se regeneraron las 20 líneas del lote con los palets de RPS. Salieron 38
programas y cuadraron las 29 filas del papel del cortador. La
`410143-0002`, pedido `AR.26.02532` línea 1, OF `0228780`, aporta dos
unidades en el palet 2. Son seis piezas en lona de 2 mm y dos frentes en
lona de 3 mm. Las dos líneas de las manos `0104` siguen a mano en
esta prueba. Se extrajo el DXF de máquina desde el DWG confirmado con ODA y
se verificaron por SHA-256 las copias de máquina y de oficina.

```text
\\192.168.0.128\Oftecnica\Oficina Tecnica\DXF PRUEBAS WEB\COMBURSA\Cortinas 410 - LOTE 13-06 - 20261127-082105
```

## Prueba con el lote 23-08-2025

Se regeneraron las 22 líneas del lote con los palets de RPS. Salieron 38
programas y cuadraron las 30 filas del papel del cortador. Hubo tres
líneas a mano. La `410130-0018`, pedido `AR.25.03758` línea 5 y OF
`0219216`, aporta cuatro cuerpos, ocho tapas y cuatro frentes en el palet
3. Se extrajo el DXF de máquina desde el DWG confirmado con ODA y se
verificaron por SHA-256 los dos DXF de prueba.

```text
\\192.168.0.128\Oftecnica\Oficina Tecnica\DXF PRUEBAS WEB\COMBURSA\Cortinas 410 - LOTE 23-08 - 20261127-082709
```

## Prueba con el lote 26-09-2026

Se regeneraron 21 líneas de RPS con palets de expedición. Salieron 38
programas y cuadraron 28 filas del papel. Cuatro líneas quedaron a mano.
Las 17 unidades de `410124-0003` del pedido `AR.26.04400` línea 1 y OF
`0232002` van al palet 4. El papel da 51 piezas en ALPHA negro 580 g.
La relectura del DXF de máquina tras ODA conservó las marcas A1, A2 y A3,
su giro y su altura. Se cotejaron los dos DXF de prueba por SHA-256.

```text
\\192.168.0.128\Oftecnica\Oficina Tecnica\DXF PRUEBAS WEB\COMBURSA\Cortinas 410 - LOTE 26-09 - 20261127-083244
```

## Prueba con el lote 10-01-2026

Se regeneraron las 40 líneas del lote. La prueba desglosó la línea 1 del
pedido `AR.25.06262` en los dos palets de su albarán `PL0000749`, porque
el generador recibe un palet por línea. Se conservaron el pedido, el
número de línea y la OF `0223600` en los dos bloques. Salieron 78
programas y cuadraron las 53 filas del papel.

| Palet | Unidades de la 410143-0007 | Piezas en lona de 2 mm | Frentes en lona de 3 mm |
| --- | ---: | ---: | ---: |
| 1 | 17 | 51 | 17 |
| 2 | 18 | 54 | 18 |

Se extrajo el DXF de máquina desde el DWG confirmado con ODA. Sus diez
programas de la cortina coinciden por herramienta con el plano generado,
con una desviación máxima de 0,00044 mm. Las dos copias se cotejaron por
SHA-256.

```text
\\192.168.0.128\Oftecnica\Oficina Tecnica\DXF PRUEBAS WEB\COMBURSA\Cortinas 410 - LOTE 10-01 - 20261127-084924
```

## Prueba con el lote 15-08-2026

Se regeneraron las 14 líneas de RPS. La prueba desglosó otra línea del
lote, la `410170-0001`, por sus dos palets de expedición. Salieron 39
programas y cuadraron las 24 filas del papel. La línea 13 de
`AR.26.03453`, OF `0230371`, aporta al palet 3 los 26 cuerpos en lona de
2 mm y 52 tapas de PVC negro de 900 g. Los tres programas de la cortina
coinciden con el DXF extraído del DWG confirmado con ODA dentro de
0,00047 mm. Se cotejaron por SHA-256 las copias de oficina y máquina.

```text
\\192.168.0.128\Oftecnica\Oficina Tecnica\DXF PRUEBAS WEB\COMBURSA\Cortinas 410 - LOTE 15-08 - 20261127-085456
```

## Siguientes referencias a mano

El SELECT de RPS entre 2023 y 2026 devolvió 216 líneas para 116 referencias
`410xxx`. Las dos manos `0001` y la `410174-0049` empatan en número de líneas.
La tabla recoge los siguientes contrastes, ordenados por número de líneas
y, a igualdad, por unidades. Las demás referencias quedan a mano hasta
contrastar sus piezas, herramientas y materiales. `MUESTRALONA` siempre se
prepara a mano.

| Referencia | Líneas / unidades de RPS | Evidencia y motivo |
| --- | --- | --- |
| `410174-0049` | 7 / 39 | Los cortes 04-10, 25-10 y 06-12 rectificado de 2025 rotulan lona de 2 mm, PVC 900 g y lona de 1 mm. La lona de 1 mm mezcla solapas lisas y tiras para rotular. Pendiente confirmar la cantidad de cada una y el uso de la tira que se corta primero. Q-A410-01. |
| `410129-0003` | 6 / 16 | Dos líneas de 2023 y 2024 son de puerta plegable. Cuatro de 2025 son de cortina superior. Falta asignar el dibujo y el despiece a la segunda descripción. Q-A410-02. |
| `410241-0011`, `410242-0004` | 5 / 69 cada una | Las diez OF imputan ALPHA negro 580 g de 2.500 mm. En el 22-06-2024 se cuentan cuatro piezas de cada uno de los cinco tipos por mano, para cuatro cortinas por mano. Se marcó D o C, como figura en los maestros. El 26-09-2026 añade el número de pieza al texto de rotulador. Q-A410-04. |
| `410129-0105` | 5 / 66 | El juego de máquina del 04-10-2025 tiene dos tapas de 470 × 340 por cuerpo y un frente de 2.500 × 300. El cuerpo de 2.500 × 1.200 lleva seis agujeros, a diferencia de los cinco del maestro. Q-A410-03. |

| Referencia | Líneas / unidades de RPS | Evidencia y motivo en la segunda tanda |
| --- | --- | --- |
| `410172-0104`, `410173-0104` | 5 / 14 cada una | El maestro indica 12 solapas. Se ven cortes de separación con disco en 11-05-2024 y marcas de separación con rotulador en 25-10-2025. Q-A410-05. |
| `410245-0005` | 4 / 55 | Las cuatro OF imputan ALPHA negro de 580 g. El 22-06-2024 identifica D1, D2 y D3. Falta contrastar cada contorno y marca con el maestro. |
| `410129-0005` | 4 / 9 | Maestro y cortes de 27-07-2024 y 23-08-2025 dan 3.000 mm de largo. RPS dice 300. Q-A410-07. |
| `410129-0002` | 4 / 7 | El maestro incluye marcas laterales ausentes en 13-04-2024 y 11-01-2025. Q-A410-06. |
| `410143-0003` | 3 / 29 | Los círculos Ø8 del frente cambian de herramienta entre 18-08-2023 y 08-06-2024. Q-A410-08. |

Las preguntas para Taller están en
[Dudas abiertas](./dudas-abiertas.md#combursa--siguientes-cortinas-410-por-volumen).
