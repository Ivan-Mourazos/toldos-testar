# Ágata Box: soportes y terminales consumidos

04/11/2026. Revisión de AR2605385, OF 0233696. Complementa el [expediente de cofres](./cofres.md) y las dudas Q-AG04 a Q-AG06 de [dudas abiertas](./dudas-abiertas.md).

## Fuentes y lectura de la tabla

Consultas **solo SELECT** a RPS: pedidos y líneas (`FACOrderSL`, `FACOrderLineSL`), OF (`CPRManufacturingOrder`), consumo imputado (`CPRImputationMaterialMO`) y maestro (`STKArticle`). Pedidos desde 01/01/2023 con artículo `AGATA*`, descripción AGATA o artículo ASTORGA (el Open). Hay **33 OF, 32 con consumo**: 11 cofres, 4 semicofres y 17 Open con consumo; el 5385 aún no tiene imputaciones. No aparecen otros artículos AGATA ni AGATASCLOSE en esta muestra. Se excluyen dos asistencias sin OF, 06371 y 06267 de 2024.

Medidas, brazos y colocación: hojas guardadas en `\\192.168.0.128\Oftecnica\Oficina Tecnica\{año}\TOLDOS` (en 2023 y 2024, `TOLDOS {año}`). Los libros se leen como documento del pedido; sus fórmulas no deciden las reglas. Se cruzan por OF y no se cuentan las copias del mismo libro como toldos adicionales. Los scripts y extracciones completos quedan en `tmp/agata-*.mjs`, `tmp/agata-investigacion.json`, `tmp/agata-hojas.json` y `tmp/agata-maestro.json`.

**j = juegos; D/I = pieza suelta derecha/izquierda; s = soporte suelto indiferente.** Son cantidades netas de RPS, sumadas entre lacados, para **toda la OF**, sin dividir entre toldos. `3j+1s` no son cuatro juegos. SOB recoge juegos de brazo y sueltos; PITCH indica SOBPITCH. TERM distingue MODUL, UNIV y EVO; TERRF es MODUL de regulación fina. Un cero es ausencia de imputación, no prueba de que la pieza no se haya montado.

La fecha es la del pedido. Todos los brazos identificados en el consumo son Onyx; los de la OF 0212032 quedaron con cantidad neta cero, por lo que se toman los tres brazos de la hoja. Hay diferencias entre pedido y hoja: 0200202 dice 650 en el texto y 676 en la hoja; 0212864 dice 781,5 y la hoja 780; 0193792 dice 574 y la hoja 586; 0192325 dice 807 y la hoja 800. Se muestran las medidas de la hoja y no se usan estas diferencias para inventar umbrales. La hoja de AR2304617 pone OF 0195864, mientras RPS enlaza 0195863: se señala esa discrepancia.

## Consumo por OF

| Fecha pedido | Pedido / OF | Frente × salida (cm) | Brazos | Colocación | Variante | SOTE | SOFT | SOIN | SOTL | SOB | TERM | TERRF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-03 | AR2605385 / 0233696 | 724×300 (caso de Iván; OF 2 uds) | 3 (caso de Iván) | TECHO (Iván) | COFRE | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-07-29 | AR2603766 / 0230908 | 684×350 / 690×350 | 3 / 3 | FRONTAL / FRONTAL | COFRE | 0 | 7j | 8j | 8j | 3j | 0 | 3j |
| 2026-06-18 | AR2603035 / 0229667 | 717×400 | 3 | FRONTAL | OPEN | 0 | 4j | 5j | 0 | 1D+1j | 2j | 0 |
| 2026-05-29 | AR2602591 / 0229023 | 575×400 | 2 | FRONTAL | OPEN | 0 | 3j | 0 | 0 | 1j | 2j | 0 |
| 2026-05-22 | AR2602461 / 0228656 | 555×400 | 2 | TECHO | OPEN | 2j+1s | 2j+1s | 0 | 0 | 1PITCH | 1j | 0 |
| 2026-04-15 | AR2601609 / 0227173 | 650×200 | 3 | TECHO | COFRE | 3j | 3j | 4j | 3j | 2D+1I | 1j+1D | 0 |
| 2025-10-23 | AR2505527 / 0222310 | 1145×350 | 4 | FRONTAL | SEMI | 0 | 6j | 1j | 6j | 2j | 0 | 2j |
| 2025-10-20 | AR2505459 / 0222144 | 730×400 | 3 | FRONTAL | OPEN | 0 | 4j | 5j | 0 | 1D+1j | 1j+1I | 0 |
| 2025-06-20 | AR2503291 / 0218485 | 875×400 | 3 | FRONTAL | OPEN | 0 | 4j | 5j | 0 | 1I+1j | 2UNIV | 0 |
| 2025-06-04 | AR2502951 / 0217790 | 628×400 / 636×400 | 2 / 2 | FRONTAL / FRONTAL | OPEN | 0 | 6j | 10j | 0 | 2j | 2j | 0 |
| 2025-06-03 | AR2502907 / 0217750 | 800×300 | 3 | FRONTAL | SEMI | 0 | 3j+1s | 5j | 4j | 1I+1j | 1j+1D | 0 |
| 2025-04-23 | AR2502004 / 0216062 | 1040×275 | 4 | FRONTAL | COFRE | 0 | 5j | 6j | 6j | 2j | 0 | 2j |
| 2025-04-22 | AR2501971 / 0215970 | 700×400 (pedido) | 3 (consumo) | FRONTAL (escaneo) | OPEN | 0 | 4j | 5j | 0 | 1D+1j | 3UNIV | 0 |
| 2025-02-04 | AR2500525 / 0213315 | 775×400 | 3 | FRONTAL | OPEN | 0 | 3j | 0 | 0 | 1I+1j | 2UNIV | 0 |
| 2025-01-21 | AR2500296 / 0212864 | 780×350 | 3 | TECHO | COFRE | 3j+1s | 3j+1s | 6j | 4j | 1I+1j | 0 | 1j |
| 2025-01-02 | AR2500024 / 0212274 | 570×375 / 625×375 | 2 / 2 | FRONTAL / FRONTAL | OPEN | 0 | 5j | 8j | 0 | 2j | 2UNIV | 0 |
| 2024-12-19 | AR2406985 / 0212103 | 793×400 | 3 | FRONTAL | OPEN | 0 | 3j | 0 | 0 | 1D+1j | 2UNIV | 0 |
| 2024-12-17 | AR2406955 / 0212032 | 736×400 | 3 | FRONTAL | COFRE | 0 | 4j | 5j | 4j | 1D+1j | 0 | 2j |
| 2024-06-14 | AR2403423 / 0206073 | 1005×350 | 4 | FRONTAL | COFRE | 0 | 5j | 7j | 6j | 2j | 0 | 2j |
| 2024-05-23 | AR2402888 / 0205224 | 1100×400 | 4 | TECHO | OPEN | 5j | 5j | 6j | 0 | 2PITCH | 2j | 0 |
| 2024-05-08 | AR2402516 / 0204497 | 743×400 | 3 | FRONTAL | COFRE | 0 | 4j | 5j | 4j | 1I+1j | 1j+1I | 0 |
| 2024-04-26 | AR2402211 / 0204044 | 700×325 | 3 | FRONTAL | COFRE | 0 | 4j | 5j | 4j | 1I+1j | 1j+1I | 0 |
| 2024-03-04 | AR2401115 / 0202119 | 573×400 | 2 | FRONTAL | OPEN | 0 | 3j | 0 | 0 | 1j | 1UNIV | 0 |
| 2024-01-09 | AR2400104 / 0200202 | 676×300 | 3 | FRONTAL | COFRE | 0 | 4j | 4j | 3j | 1D+1j | 1D+1j | 0 |
| 2023-10-24 | AR2305950 / 0198041 | 475×400 / 495×400 | 2 / 2 | FRONTAL / FRONTAL | OPEN | 0 | 5j | 0 | 0 | 2j | 2j | 0 |
| 2023-08-31 | AR2304914 / 0196249 | 830×400 | 3 | FRONTAL | SEMI | 0 | 4j | 0 | 0 | 1I+1j | 1j+1I | 0 |
| 2023-08-09 | AR2304617 / 0195863 | 700×400 (hoja OF 0195864) | 3 | FRONTAL (hoja OF 0195864) | OPEN | 0 | 0 | 4j | 0 | 1D+1j | 2j | 0 |
| 2023-08-07 | AR2304556 / 0195697 | 505×400 (2 uds) | 2 | TECHO | OPEN | 5j | 5j | 0 | 0 | 2j | 2j | 0 |
| 2023-06-16 | AR2303372 / 0193792 | 586×400 | 2 | FRONTAL | OPEN | 0 | 3j | 0 | 0 | 1j | 1j | 0 |
| 2023-05-23 | AR2302760 / 0192755 | 525×400 (2 uds) | 2 | FRONTAL | OPEN | 0 | 6j | 0 | 0 | 2j | 2EVO | 0 |
| 2023-05-10 | AR2302458 / 0192325 | 800×400 | 3 | FRONTAL | SEMI | 0 | 0 | 0 | 0 | 1D+1j | 1j+1D | 0 |
| 2023-05-02 | AR2302251 / 0191958 | 625×300 | 3 | FRONTAL | COFRE | 0 | 4j | 4j | 3j | 1I+1j | 2j | 0 |
| 2023-04-27 | AR2302192 / 0191726 | 775×300 | 3 | FRONTAL | COFRE | 0 | 4j | 5j | 4j | 1D+1j | 2j | 0 |

Para AR2501971 no se encontró libro: se revisó visualmente la primera página del escaneo `\\192.168.0.128\RPS\VENTAS\PEDIDOS\2025\AR.25.01971.pdf`, que señala sujeción frontal y 700×400. Los tres brazos salen del juego más derecho consumidos. En AR2304617 se conserva la advertencia de OF distinta en la hoja. En AR2605385 los ceros significan **todavía sin consumo**; la geometría de la tabla es el toldo comunicado por Iván y no describe el segundo toldo de esa OF.

## Qué se puede corregir

- **Techo = SOFT + SOTE.** Las cinco OF de techo con consumo (2023–2026) gastan ambas familias, con las mismas cantidades de juegos y sueltos en cada una. Se corrige la exclusión entre familias en reserva y despiece. La cantidad de montaje sigue pendiente de Q-AG04.
- **Cofre = SOIN + SOTL.** Aparecen juntos en los 11 cofres con consumo. También en los dos semicofres de 2025; se corrige la exclusión entre ambas familias. Se conserva la cantidad provisional de soportes de perfil. En Open no es universal: 8 de las 17 OF consumen SOIN y las otras 9 no. No se fuerza SOIN a todos los Open (Q-AG05).
- **Tres brazos necesitan tres terminales físicos.** Se añade el suelto al juego TERMI, como en 0227173, 0222144 y 0217750. Se respeta el lado elegido; sin elegir, derecho reservado y decisión en taller. Las piezas sin ese lacado van en blanco para lacar (Q-A02).
- **Referencias existentes.** El juego de techo blanco es `SOTEMODULBLAN`; `SOTEMODULBL16` no existe. Solo hay juegos de techo blanco y negro 9011 (`NE11`), además del artículo sin color: el mate del 5385 debe ir blanco para lacar. Los terminales sueltos tampoco existen en NEM1: se habilita su paso a blanco en la misma tabla de lacados que ya se usa para el resto.

## Lo que la muestra no permite fijar

**Cantidad de montaje (Q-AG04).** Para 700–743 y tres brazos predominan cuatro juegos frontales, no los cinco o seis calculados por la web. Aun así, no sale una tabla inequívoca por frente y brazos: 650 de techo lleva tres juegos; la última OF, con 684 y 690, lleva siete juegos en total y no deja repartirlos; 775 lleva tres y 800 lleva tres juegos más un suelto. Con 555 de techo son dos juegos y un suelto. Dividir por dos y redondear tampoco reproduce los tres casos individuales más recientes del Open. Se mantiene la fórmula anterior como provisional; **no se afirma que los seis juegos del 5385 estén bien**. Es necesario confirmar la tabla de juegos/sueltos antes de cambiarla. La excepción del candado sigue funcionando.

**Soporte inferior (Q-AG05).** Añadirlo al cofre está demostrado. Para su cantidad, la fórmula de perfil coincide con 650 (4), 1040 (6) y la OF de dos cofres 684/690 (8), pero falla en el cofre 780 (6 consumidos frente a 5 calculados). En semicofre 800 coincide (5), pero 1145 solo imputa 1. En Open 717, 730 y 875 se gastan cinco juegos, mientras 555, 575 y 775 no imputan ninguno. No se deduce una condición única ni una fórmula nueva.

**TERMI frente a TERRF (Q-AG06).** No hay sustitución general por fecha: el cofre de abril de 2026 lleva TERMI y los dos de julio llevan TERRF; Open de junio sigue con TERMI. No lo decide tener tres brazos: ambos cofres de 2026 los tienen. Tampoco la salida: 400 aparece con ambas familias. Los brazos identificados son Onyx en ambos grupos; PITCH solo aparece en dos Open con TERMI. Se mantiene TERMI hasta confirmar el criterio del terminal de regulación fina. No se copian los juegos sobrantes o familias UNIV/EVO de algunos consumos sin conocer su motivo.

## AR2605385 / OF 0233696: antes y después

Por **un toldo** de 724×300, tres brazos, motor y techo, negro grafito mate 9011-9111. La OF de RPS tiene dos unidades; no se presupone que sean iguales.

| Pieza | Antes | Después |
| --- | --- | --- |
| Frontal | No se pedía | `SOFTMODULNEM1`: 6 juegos, cantidad provisional (Q-AG04) |
| Techo | `SOTEMODULNEM1`: 6, código inexistente | `SOTEMODULBLAN`: 6 juegos para lacar, cantidad provisional (Q-AG04) |
| Tejadillo/lira | `SOTLMODULNEM1`: 4, rotulados como cierre | `SOTLMODULNEM1`: 4 juegos, identificados como tejadillo/lira |
| Inferior | No se pedía | `SOINMODUNEM1`: 4 juegos, fórmula provisional de perfil (Q-AG05) |
| Terminal | `TERMIMODULNEM1`: 1 juego para tres brazos | 1 juego más `TERMIMODULDBL16`: 1 suelto para lacar; lado a decidir en taller si no se indica. TERMI/TERRF pendiente (Q-AG06) |
| Brazo y soporte sueltos | Ya iban junto al juego | Se conservan |

Pruebas de coincidencia de las referencias y cantidades en despiece y reserva, incluidas una y dos unidades del caso comunicado. El PDF conserva todas las filas: en este caso, la estructura necesita continuación en una segunda hoja con el mecanismo de paginación existente; no se recortan piezas para hacerla caber. Se revisó la primera hoja renderizada en `tmp/agata-5385-1.png` y se comprueba en prueba automática que todas las referencias están en el PDF.
