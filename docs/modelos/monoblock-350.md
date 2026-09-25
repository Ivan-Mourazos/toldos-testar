# Monoblock 350 — expediente

23/09/2026 · **Terminado salvo las dudas Q-M01 a Q-M04, Q-A04, Q-A06, Q-G01 y Q-PR02** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Dudas](./dudas-abiertas.md) · [Evidencia anterior](../rps-monoblock-350-evidence.md)

## 1. Qué es y fuentes

- Artículo de RPS `MONOB`. En la intranet es el **Arzúa Monobloc**: brazos Onyx sobre barra cuadrada 40×40, de 2 a 4 brazos y hasta 12 m de línea.
- 59 OF con consumo real desde 2024 y 50 estructuras en 41 libros de 2025-2026.

| Fuente | Qué es |
| --- | --- |
| Manual técnico Llaza ART MONOBLOC 350, rev. 1 (20/11/2016), ref. 45098021000 | En Oficina Técnica y en la intranet ("Manual técnico 2"). Es para brazos ART 350 |
| Catálogo Llaza MONOBLOC-350 actual, con brazos Onyx | Intranet ("Catálogo comercial del proveedor 3", subido el 22/09/2026) |
| Página [Arzúa Monobloc](http://192.168.0.127/mediawiki/index.php/Arz%C3%BAa_Monobloc) (Esteban, 22/09/2026) | 1 juego de brazos llega a 6 m × 3,50; se van añadiendo juegos |
| Libros, hoja `MON.350` | Medidas: 244 comprobaciones, ninguna diferencia inesperada (`pnpm validate:monoblock`) |
| Consumo real (`CPRImputationMaterialMO`) | Reserva (`pnpm validate:reserva "MONOBLOCK 350"`) |

## 2. Manual y catálogo frente a la web

| Regla | Manual 2016 (ART 350) | Catálogo actual (Onyx) | Web |
| --- | --- | --- | --- |
| Cortes con máquina: tubo, lona, EVO, barra 40×40 | 132 / 142 / 122 / 10 mm | — | Igual |
| Cortes con motor Ø60 a tubo Ø80 | 120 / 130 / 115 / 10 mm | — | Igual |
| Línea mínima, 2 y 4 brazos | 212 … 412 y 404 … 804 | Igual | Igual |
| Línea mínima, 3 brazos (salida 2,00 a 3,50) | 382, 429, 457, 495, 532, 570, 607 | 383, 421, 459, 497, 535, 573, 611 | **La del catálogo** desde el 25/09/2026 (Q-M01) |
| Línea máxima con 3,25 y 3,50 de salida y 3 brazos | 7,75 | 8,25 | **8,25** desde el 25/09/2026 (Q-M01) |
| Motor | Par por salida (40 a 100 Nm) | "A partir de 2 brazos o 3,00 m, motor" | El que se consume (apartado 3) |

La tabla del Monoblock (mínimos, máximos y motor por salida y brazos) está guardada en los parámetros comunes del servidor, así que cambiar los mínimos no llegaría a producción sin migrarlos: por eso Q-M01 se decide antes de tocarla.

## 3. Reserva frente al consumo real

`validate:reserva` pasa de faltar 20 piezas y sobrar 5 a **faltar solo el casquillo de eje 63 (Q-PR02) y el soporte de brazo suelto izquierdo (Q-A04)**. Contrastado pieza a pieza con las OF 0230266, 0229011, 0227437, 0226281 y 0224325.

| Pieza | Consumo real | Antes | Ahora |
| --- | --- | --- | --- |
| Brazos Onyx | `BONYX…` es un juego: 2 brazos = 1 juego, 3 = juego + suelto, 4 = 2 juegos | Un juego por brazo (el doble) | Por juegos (`onyxArmLines`) |
| Soporte de brazo | Igual, `SOPBRAMONOB…` en juego y suelto `…D`/`…I` | Uno por brazo | Por juegos |
| Soportes a pared o techo | En juego (`SOPFROMONOBL` / `SOPFTECMONOB`) y un suelto si es impar | Todos sueltos | El número del manual, en juegos + suelto |
| Barra de carga | **Univers 280 en 31 de 59 OF**, EVO 80 en el resto | Siempre EVO | Se elige en la tarjeta, como en el Arzúa. La Univers se descuenta 1 cm menos que la EVO (Q-M04, 25/09/2026) |
| Tapones de la barra | `TAPONEVO8` o `TAPOPLUN280` | `TAPONEVO7` (EVO 70) | Según la barra |
| Terminales | Juego y, con 3 brazos, el indiferente | No se reservaban | Como el Galicia |
| Tapones del tubo 40×40 | 2 por toldo (`TAPTUBO40BL16` / `…NE05`) | No se reservaban | 2 |
| Varillas | En 46 de 59 OF | No se reservaban | Como el Arzúa |
| Currón | Apoyo intermedio `APOIN40` (1 a partir de unos 675, 2 a partir de 850) | `CURRONMOPL…`, que no se consume y en blanco está de baja | `APOIN40` con los mismos umbrales |
| Frentes grandes | Tubo de 800 desde 720; por encima, dos barras | Una barra de 700 aunque no llegue | Tubo hasta 800 y, por encima, empalme en barras iguales; barra de carga y 40×40 con una de 700 hasta 725 (Q-M03) |
| Motor | 55/17 con 2 brazos, 70/17 con 3 y con 4 (2 OF), kit rueda P-801 y corona LT60 | Del par del manual (40/17, 50/12…; ni el 40/17 ni el 50/12 se consumen), rueda Ø78 y corona Ø78 | 55/17, 70/17 y, con 4, 85/17 del manual (Q-M02); kit del Arzúa. Los valores guardados del manual se migran |

## 4. Referencias

- Brazo Onyx inexistente en ese lacado y salida (o sin brazo suelto con 3 brazos): el toldo no es válido y dice por qué. Así el negro de 150 con 3 brazos ya no reserva `BONYXDNE11150C`, que no existe.
- EVO 80 y Univers 280 solo en los largos que existen en cada lacado.
- `pnpm validate:rps-refs`: ninguna referencia rota en blanco ni en negro. En otros lacados quedan 114: los soportes del Monoblock solo existen en unos pocos colores (Q-A02). **Resuelto el 25/09/2026 (Iván):** la pieza que no existe en ese color se reserva en blanco para lacarla fuera, con un aviso en la tarjeta ([lacadoFallback.js](../../src/domain/lacadoFallback.js)). Quedan 4: la barra EVO de 400 en bronce, marrón y gris texturado (tampoco existe en blanco) y en lacado especial; es el largo de barra de Q-A06.

## 5. Formulario y PDF (puntos 8 y 9)

A 1280×720 y 1600, con AR2603393 (OF 0230266: 695 × 275, 3 brazos, techo, máquina) y un toldo de 972 × 250 con 4 brazos, frontal y motor: los dos válidos, sin errores ni scroll horizontal. La tarjeta pregunta ahora el tubo de carga. El despiece del PDF sale numerado seguido (18 filas con máquina) y las observaciones pasan a la columna derecha cuando no caben debajo. El nombre enseña "antes ARZUA MONOBLOC", que es el nombre de la intranet.

## 6. En qué se apoya cada decisión

| Decisión | Fuente |
| --- | --- |
| Cortes, mínimos y máximos | Manual 2016; los libros los confirman (244 comprobaciones) |
| Juegos y sueltos, soportes, tapones, terminales, varillas, apoyo del currón, kit de motor | Consumo real de 59 OF |
| Barra Univers como opción | Consumo real: 31 de 59 OF |
| Motor por brazos | Consumo real (2 y 3 brazos); manual (4 brazos) |
| Empalme por encima de 725 | Consumo real de frentes de 720 a 972 |

## 7. Dudas

| ID | Pregunta | Qué hace la web |
| --- | --- | --- |
| Q-M01 | **Resuelta (Iván, 25/09/2026): el manual más reciente del modelo.** Cambian los de 3 brazos y el máximo con 3,50 (7,75 o 8,25) | Hecho: el documento más reciente del modelo es el catálogo MONOBLOC-350 actual (Onyx, intranet 22/09/2026); en Oficina Técnica solo está el manual de 2016. Mínimos y máximos de tres brazos del catálogo; los del manual guardados en el servidor se migran solos |
| Q-M02 | **Resuelta (Iván, 25/09/2026): como dice el manual.** Con 4 brazos se consumió el 70/17 (2 OF) y el manual pide 85-100 Nm | 55/17, 70/17 y 85/17: ya es lo del manual |
| Q-M03 | Frentes de 720 a 725: el almacén usó una barra de 700 aunque el corte pasa de 700. ¿Hasta dónde vale una sola? Por encima, ¿cómo se empalma? Iván (25/09/2026): revisar pedidos pasados. Revisados (libros 2025-2026 cruzados con el consumo, `tmp/cofres/anchos.mjs "MONOB"`): en los cuatro de 720 y 725 se imputó una sola barra (700, 700, 600 y 600) y ningún retal; desde 800, dos barras iguales. No se ve cómo se completa el corte de 709-715: pasa al taller | Una hasta 725; después, barras iguales |
| Q-M04 | **Resuelta (Iván, 25/09/2026):** la barra Univers se descuenta 1 cm menos que la EVO, porque la EVO lleva tapas más grandes | Hecho: descuento de la EVO − 1 cm (también en Parámetros y en la excepción técnica) |
| Q-A04, Q-A06, Q-G01, Q-PR02 | Lado del suelto, largo de stock, máquina MB-11 o Geiger, casquillo de eje 50 o 63 | Derecho, 600/700, MB-11, eje 50 |
