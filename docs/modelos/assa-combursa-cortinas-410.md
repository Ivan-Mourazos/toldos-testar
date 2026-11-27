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
| `410129-0117` | PLASTEL negra 2.040: 1 cuerpo de 2.000 × 900 con 4 agujeros Ø40 y marcas laterales, y 2 tapas de 320 × 340. Lona 3 mm 1.600: 1 frente de 2.000 × 300. |
| `410130-0175` | PLASTEL negra 2.040: 1 cuerpo de 2.300 × 900 con entrante de 50 mm y marcas. PVC negro 900 g 3.000: 1 tapa lisa y 1 de 6 agujeros Ø40, de 324,1 × 340. Lona 3 mm 1.600: 1 frente de 2.250 × 300 con marca de 750 × 100. |
| `410170-0001` y `410171-0001` | Lona 2 mm 2.100: 1 cuerpo de 2.600 × 1.116,2 y 2 tapas, una con 6 agujeros Ø40. Lona 1 mm 1.500: 1 tira de 2.600 × 416,2 y 12 solapas de 350 × 400, 8 lisas y 4 marcadas. Cuerpo y tira de mano derecha o izquierda según referencia. |

Las variantes `0117` y `0175` están rotuladas en
`COMBURSA (CRAWFORD)2.dwg`. Las dos manos tienen dibujo de familia
`OK410170.dwg` y `OK410171.dwg`. El DXF de oficina recupera las vistas de
confección del 07-11. En la `0175` usa la parte de confección de la hoja,
separada de las tiradas y multiplicadores antiguos.

## Contraste de máquina

Se leyeron 20 bloques de DXF de maqcorte. Se contrastaron los contornos y
las marcas en ambos sentidos por herramienta, con tolerancia de 1 mm. Se
admiten tramos consecutivos en un solo trazo o en varios cuando cubren el
mismo recorrido. La cuenta por unidad y las incidencias de los rótulos
históricos están descritas en
[Q-AS0711-03](./dudas-abiertas.md#combursa--lote-07-11-03112026).

| Referencia | Lotes comprobados | Resultado y motivo |
| --- | --- | --- |
| `410129-0117` | 26-07 y 13-09 de 2025, 07-11-2026 | **Igual** en piezas y herramientas. Máximo 0,690 mm en los frentes de 3 mm. El «X8» del 07-11 elevaría la cantidad sobre las 27 de RPS. |
| `410130-0175` | 09-08 y 13-09 de 2025, 07-11-2026 (fichero PALET 4-5) | **Igual** en piezas y herramientas. Máximo 0,012 mm. El 07-11 histórico incluye dos tapas de relleno y un «x2» donde la cuenta de 54 cuerpos da «x27». |
| `410170-0001` | 23-08-2025, 25-07 y 07-11 de 2026 | **Difiere** en un trazo de rotulador duplicado en el conjunto de 2 mm antiguo. Se dibuja una vez. Contorno y marcas hasta 0,005 mm. Se cortan 12 solapas por unidad, frente a las 22 del caso aislado de noviembre. |
| `410171-0001` | 23-08-2025, 25-07 y 07-11 de 2026 | **Difiere** en el mismo trazo duplicado de rotulador. Contorno y marcas hasta 0,012 mm. Misma regla de 12 solapas, con el dibujo de la mano izquierda. |

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

Las cuatro preguntas para Taller están en
[Dudas abiertas](./dudas-abiertas.md#combursa--siguientes-cortinas-410-por-volumen).
