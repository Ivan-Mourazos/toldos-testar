# COMBURSA · colocación en los lotes de noviembre

Tablas generadas por `scripts/assa-investigacion/colocacion-0711.mjs --informe`. Foto RPS 2026-11-24. El inventario completo con huellas SHA-256 y el detalle por franja están en `tmp/assa-0711-historico/colocacion.json`. Se conservaron las variantes por nombre. El 31-10 sirve como comparación histórica. Los archivos de noviembre son dudosos para fijar reglas de fabricación según la indicación de taller y se usan aquí para observar colocación.

| Año | DWG de oficina | DXF de maqcorte | CMT de maqcorte |
| --- | --- | --- | --- |
| 2025 | 54 | 57 | 61 |
| 2026 | 48 | 61 | 58 |

## Archivos y palets

| Fecha de lote | Archivo | Alcance de la evidencia | Palets rotulados | Pedidos escritos | Referencias rotuladas / herramientas |
| --- | --- | --- | --- | --- | --- |
| 2026-10-31 | LOTE 31-10.dwg | Comparación histórica | PALET 1; PALET 2; PALET 3 | AR.26.04864; AR.26.04961; AR.26.05029; AR.26.04704; AR.26.05064; AR.26.05047 | 28 |
| 2026-10-31 | LOTE 31-10.cmt | Comparación histórica | — | — | Longitud de DRIVER-BLOC incorrecta |
| 2026-10-31 | LOTE 31-10.dxf | Comparación histórica | PALET 1; PALET 2; PALET 3 | — | 28 |
| 2026-11-07 | LOTE 07-11_PALET 4-5.dwg | Dudoso · lectura de colocación | PALET 1; PALET 2; PALET 3 | AR.26.04864; AR.26.04961; AR.26.05029; AR.26.04704; AR.26.05064; AR.26.05047 | 29 |
| 2026-11-07 | LOTE 07-11.dwg | Dudoso · lectura de colocación | PALET 1; PALET 2; PALET 3; PALET 4; PALET 5 y 6 | AR.26.05111; AR.26.05142; AR.26.05234; AR.26.05240; AR.26.05263 | 24 |
| 2026-11-07 | LOTE 07-11_.cmt | Dudoso · lectura de colocación | — | — | Sin nombre 1188; CM-CUTW-Def 1; CM-CUTW-6 1; CM-PEN-Def 1; CM-CUTK-Def 1 |
| 2026-11-07 | LOTE 07-11_.dxf | Dudoso · lectura de colocación | PALET 1; PALET 2; PALET 3; PALET 4 | — | 23 |
| 2026-11-07 | LOTE 07-11_PALET 4-5.cmt | Dudoso · lectura de colocación | — | — | Sin nombre 124; CM-CUTW-Def 1; CM-PEN-Def 1; CM-CUTK-Def 1 |
| 2026-11-07 | LOTE 07-11_PALET 4-5.dxf | Dudoso · lectura de colocación | — | — | 1 |
| 2026-11-14 | LOTE 14-11.dwg | Dudoso · lectura de colocación | PALET 1; PALET 2 | AR.26.05234 | 6 |
| 2026-11-14 | LOTE 14-11.cmt | Dudoso · lectura de colocación | — | — | Sin nombre 374; CM-CUTW-Def 1; CM-CUTW-6 1; CM-PEN-Def 1; CM-CUTK-Def 1 |
| 2026-11-14 | LOTE 14-11.dxf | Dudoso · lectura de colocación | PALET 1; PALET 2 | — | 6 |
| 2026-11-21 | LOTE 21-11.dwg | Dudoso · lectura de colocación | PALET 1; PALET 2 | AR.26.05469; AR.26.05404; AR.26.05556 | 8 |
| 2026-11-21 | LOTE 21-11.cmt | Dudoso · lectura de colocación | — | — | Sin nombre 351; CM-CUTW-Def 1; CM-CUTW-6 1; CM-PEN-Def 1; CM-CUTK-Def 1 |
| 2026-11-21 | LOTE 21-11.dxf | Dudoso · lectura de colocación | PALET 1; PALET 2 | — | 7 |
| 2026-11-28 | LOTE 28-11.dwg | Dudoso · entrega futura | PALET 1 | AR.26.05622 | 10 |
| 2026-11-28 | LOTE 28-11.cmt | Dudoso · entrega futura | — | — | Longitud de DRIVER-BLOC incorrecta |
| 2026-11-28 | LOTE 28-11.dxf | Dudoso · entrega futura | PALET 1 | — | 10 |

## Colocación que se alcanza a leer en los DXF de corte

Una franja reúne paños rectangulares reconocidos que se tocan y comparten ancho de trabajo. Las parejas requieren raya central de rotulador. El hueco horizontal se mide hasta la franja más próxima que solapa en altura. Puede incluir separación entre palets o entre tiradas, por lo que indica colocación dibujada. Los candidatos a canalón son caras no rectangulares agrupadas por cercanía. Algunos pueden pertenecer a otros accesorios. Los CMT se leen por herramientas cuando el lector admite el archivo. Las cantidades se cotejan solo como contexto de entrega en RPS.

| DXF | RPS con fin real / líneas por fecha | Franjas / mixtas | Ejemplos de orden espacial, por X y de arriba abajo en la misma X | Parejas reconocidas | Hueco positivo mín. / máx. mm | Grupos candidatos a canalón |
| --- | --- | --- | --- | --- | --- | --- |
| LOTE 31-10.dxf | 33 / 33 | 37 / 7 | 420102-0050 → 430172-0030; 420102-0030 → 430172-0009; 430127-0014 → 420150-0090 → 420102-0022; 430125-0002 → 430172-0002 | 13 | 854,992 / 254.590,754 | 33 |
| LOTE 07-11_.dxf | 25 / 25 | 23 / 8 | 420148-0104 → 430172-0001; 430129-0002 → 420102-0017; 430125-0002 → 420102-0089; 430172-0031 → 420148-0040 | 3 | 500 / 79.269,147 | 20 |
| LOTE 07-11_PALET 4-5.dxf | 25 / 25 | 0 / 0 | — | 0 | — | 0 |
| LOTE 14-11.dxf | 0 / 6 | 5 / 2 | 430127-0019 → 430172-0007 → 430127-0002; 420102-0050 → 420150-0090 | 0 | 1903,845 / 33.273,602 | 14 |
| LOTE 21-11.dxf | 0 / 7 | 9 / 1 | 430127-0019 → 420102-0050 | 0 | 1111,224 / 2181,427 | 16 |
| LOTE 28-11.dxf | 0 / 10 | 12 / 4 | 420148-0115 → 420150-0001; 420102-0021 → 430127-0014; 420150-0088 → 420148-0105; 430172-0002 → 430172-0007 | 6 | 1639,91 / 7196,75 | 15 |
