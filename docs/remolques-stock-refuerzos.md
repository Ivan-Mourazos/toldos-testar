# Sacos y tiras de stock en remolques · 10/11/2026

Primero se colocan los sacos; después se aprovecha lo que quede con refuerzos longitudinales de stock.
No se alarga el rollo, no se mueven piezas ni se añaden bolsas. Ganado, toldos y puertas conservan sus cortes.

## Regla y evidencia

Se leyeron **2799 DXF / .bak** de `maqcorte/2026/ARCHIVOS DXF - MAQUINA NUEVA` y
`BOT/Pendientes/*`, solo lectura: **182 cortes** contienen rótulos de estas tiras, además del catálogo local.
La copia del
catálogo coincide por SHA con `tmp/stock/out/MATERIAL PARA STOCK.dxf` del repo principal. Las copias y
procedencias están en `tmp/sacos-stock/refuerzos/`, con `evidencia.json` y `evidencia-parcial.json`.
La detección automática solo sirve para localizar candidatos: los ejemplos siguientes se comprobaron
por sus bordes de corte. Los cruces con líneas de otras piezas no demuestran medidas de una tira.

| Referencia | Medida / regla que acredita |
| --- | --- |
| `MATERIAL PARA STOCK.dxf`, entidades 1403F/41/42/43 y 14046/47/48/49 | Dos rectángulos de **3000 × 200** y **3000 × 165 mm**, largos en el eje del rollo. Son ejemplos de catálogo; el largo no es fijo en los pedidos. |
| Misma copia, textos 14044 y 1404A | **`T.O / REF 20cm STOCK`** y **`REF 16.5cm STOCK`**, capa **`texto`**, sin OF propia. Contornos en **`DISCO1`**. |
| AR2601123, DXF y `.bak` | Tira cerrada de **1230 × 165 mm**; menor largo cerrado medido entre las dos medidas del catálogo en esta lectura. |
| AR2601991, DXF | Tiras de **1370,6 × 200** y **1668,1 × 200 mm**: largos ajustados al hueco, no solo 3 m. |
| AR2604569, DXF | Tira de **6692,6 × 165 mm**. No se fraccionan a 3 m. |
| Plantilla estándar de ganado / AR2601847 | Su rótulo «16.5cm» acompaña una tira histórica de **175 mm**. Se conserva esa plantilla, sin convertir esa excepción en tolerancia para tiras nuevas. |

Las tiras nuevas tienen **200 o 165 mm exactos**. No se aplica la tolerancia de los sacos ni se deduce
otra tolerancia de los cruces de cortes. Se colocan a lo largo, con todo el largo rectangular disponible,
redondeado hacia abajo a 0,1 mm. Se comparan combinaciones de ambos anchos y se elige la de mayor superficie;
a igualdad, menos tiras. Se descuentan solo las tiras elegidas antes de buscar el siguiente hueco.
Los cortes compartidos se fusionan y los orillos no se cortan. Las marcas de montaje siguen a **10 mm**.

El mínimo conservador es **1230 mm**, basado en AR2601123, no una afirmación de que el taller rechace todo
lo menor. Puede variarse mediante `largoMinimoRefuerzoMm` al generar el corte; la duda sobre aceptar
largos inferiores queda en `docs/modelos/dudas-abiertas.md` (Q-STOCK-R01). No se asigna la OF de los sacos
a estas tiras: catálogo y ejemplos no identifican una OF propia de refuerzo.

## Referencia AR2605467: sacos nominales, solo en remolques

El manual de Adrián revisado por Iván lleva **dos sacos de 1200 × 800 mm**, no de 1250 × 850.
Descontando su desplazamiento de dibujo de 1000 mm, están en **(1325, 1630)** y **(2525, 1630)**.
La web reproduce esas posiciones, número y medidas, el rótulo común **`SACOS 120X80 STOCK`** en `texto`
y la OF **0230811** en cada saco. No cabe después ninguna tira longitudinal del mínimo indicado.

Por tanto, en remolques se prioriza el nominal cuando cabe, sin agrandar hasta agotar ±5 cm. Si no cabe
el nominal, se permite reducir dentro de la tolerancia confirmada y se rotula el nominal del catálogo:
por ejemplo, AR2605088/corte 3 mide realmente **120 × 77**, rotulado **120X80**. Los datos conservan ambos
campos: `medida` real y `medidaCatalogo`. **Toldos y puertas siguen con su colocación y rótulo real anteriores**.

## Resultados por pedido

Comparación contra `544472fa`. Medidas de las tiras en **largo × ancho, cm**. Los cuatro sacos de las
muestras anteriores se mantienen; AR2605467 ya tenía dos. Las tiras de esta tabla son todas nuevas.
En alternativas se elige un solo corte, no se suman las dos opciones.

| Pedido / corte | ml antes → después | Sacos después | Tiras añadidas (cm) |
| --- | --- | --- | --- |
| AR2604390 | 3,080 → 3,080 | 0 | 1 de 129 × 20 |
| AR2604412 | 4,192 → 4,192 | 0 | 2 de 268,7 × 20 |
| AR2604800 | 2,318 → 2,318 | 0 | 0 |
| AR2604802 | 1,440 → 1,440 | 0 | 1 de 144 × 20 y 2 de 144 × 16,5 |
| AR2604990 | 4,120 → 4,120 | 1 de 120 × 80 | 1 de 412 × 20 |
| AR2605000 | 4,055 → 4,055 | 0 | 1 de 331 × 20 y 1 de 331 × 16,5 |
| AR2605023 | 5,178 → 5,178 | 0 | 1 de 384,8 × 16,5 |
| AR2605071 | 2,940 → 2,940 | 0 | 1 de 294 × 20 y 3 de 294 × 16,5 |
| AR2605078 | 8,380 → 8,380 | 0 | 1 de 838 × 20 |
| AR2605079 · empatada | 4,623 → 4,623 | 0 | 0 |
| AR2605079 · entera de restos | 4,623 → 4,623 | 1 de 120 × 80 | 0 |
| AR2605088 · gris claro | 18,513 → 18,513 | 0 | 1 de 491,6 × 20 |
| AR2605088 · gris empatada | 4,480 → 4,480 | 0 | 1 de 150 × 20 |
| AR2605088 · gris entera de restos | 4,310 → 4,310 | 1 de 120 × 77 (nominal 120 × 80) | 0 |
| AR2605120 | 2,145 → 2,145 | 0 | 0 |
| AR2605129 | 13,315 → 13,315 | 0 | 1 de 724,5 × 20 y 1 de 450 × 20 |
| AR2605132 | 8,031 → 8,031 | 0 | 1 de 397,8 × 16,5 y 1 de 254,8 × 20 |
| AR2605158 | 4,222 → 4,222 | 0 | 3 de 281,7 × 20 |
| AR2605192 | 5,705 → 5,705 | 1 de 120 × 80 | 0 |
| **AR2605442** | **5,015 → 5,015** | **0** | **3 de 167,9 × 20** |
| **AR2605448** | **5,516 → 5,516** | **0** | **0; los 24 cm libres a lo largo no dan una tira de 123 cm** |
| **AR2605456** | **3,818 → 3,818** | **0** | **1 de 249,3 × 20 y 3 de 249,3 × 16,5** |
| **AR2605467** | **4,210 → 4,210** | **2 de 120 × 80** | **0** |

## Archivos y validación

Implementación en `src/remolques/corte/{retales,sacos,refuerzos,index,archivos}.js`. Nuevas pruebas en
`refuerzos-stock.test.js` y fixtures de AR2605467 en `__fixtures__/sacos-stock/`: pedido íntegro y las
98 entidades del corte manual, sin su cabecera CAD. Pruebas existentes adaptadas a la ampliación de stock.
No se tocan las plantillas de ganado, los colocadores de toldos/puertas ni pruebas o fixtures de paridad.

Evidencia en `tmp/ui-audit/sacos-stock/`: **46 PNG antes/después de los 23 cortes**, un PNG del manual
AR2605467 y ocho hojas comparativas `refuerzos-1.png` a `refuerzos-8.png`, revisadas visualmente.
`referencias-refuerzos.png` reconstruye los bordes y rótulos originales del catálogo y los tres manuales.
Los datos completos antes/después están en `tmp/sacos-stock/{antes,despues}-refuerzos.json`.
Se comprueban las piezas y sus segmentos, largos, empates, alternativas, orillos, rótulos, separación de
sacos/tiras, tolerancia y mínimo. Los SHA de toldos, puerta AR2604725 y ganado siguen protegidos.

Validación final: **5336 pruebas en 415 archivos**, `--maxWorkers=4`, **390,31 s**; TypeScript y ESLint
también pasan. Hay **25 pruebas nuevas**, además de las adaptadas a la nueva regla. La primera ejecución
completa señaló un rótulo de saco girado que salía del contorno; se corrigió, se añadió la comprobación
de encaje y separación de la OF, y se repitió la suite completa. No hubo fallos de tiempo. Registros en
`tmp/sacos-stock/refuerzos-vitest-{completo,final}.log`.

Se usan los binarios locales con Node porque `pnpm` no está disponible en PATH. No se ha hecho push,
merge ni escritura en la red.
