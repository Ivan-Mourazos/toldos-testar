# Galicia — expediente

23/09/2026 · **Terminado salvo las dudas Q-A04, Q-A06 y Q-G01 a Q-G03** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Dudas](./dudas-abiertas.md) · [Evidencia anterior](../rps-galicia-evidence.md) · [Arzúa Pro](./arzua-pro.md)

## 1. Qué es el Galicia

- Es un Arzúa montado con soportes **ART GALIZIA** (`SOPARTGL`) en vez del AROND: brazos Onyx, tubo de enrolle P801, barra EVO 80 o Univers 280. Admite soporte intermedio, así que puede llevar **tres brazos**.
- **En RPS no tiene artículo propio**: se vende como `ARZUA` y lo que lo distingue son los soportes `SOPARTGL`. Son unas 45 OF al año (90 con consumo desde 2025).
- En los libros del taller sí es un modelo propio: hoja `GAL`, modelo GALICIA, con sus descuentos y sus líneas mínimas de 2 y 3 brazos.
- **Decisión de Iván (23/09/2026)**: se queda como modelo aparte, como en los libros. El Arzúa ya no ofrece el soporte Galicia, y elegir 3 brazos en el Arzúa lleva al Galicia.

## 2. Fuentes

| Fuente | Qué dice |
| --- | --- |
| Manual del fabricante | **No hay**: ni en Oficina Técnica (`MK MANUALES TECNICOS LLAZA`) ni en las tarifas 2021, 2024 y 2026 |
| Intranet de producción, página [Arzúa](http://192.168.0.127/mediawiki/index.php/Arz%C3%BAa) (Esteban, 21/09/2026) | "GALIZIA, permite soporte intermedio en fijación frontal y entre paredes (para su colocación a techo necesita de una escuadra). Con tres brazos de 3,25 metros de salida, el frente máximo es de 8 metros" |
| Ficha técnica TGM 1.014.0 (intranet) | Hasta 8,00 × 3,25 con tres brazos; 6,00 × 3,50 con dos |
| Libros 2025-2026, hoja `GAL` | Descuentos y líneas mínimas que usa la web: **49 de 49 estructuras sin diferencias** (`pnpm validate:galicia`) |
| Consumo real (`CPRImputationMaterialMO`) | 90 OF de ARZUA con `SOPARTGL` desde 2025 |

## 3. Reserva frente al consumo real

`pnpm validate:reserva GALICIA` compara con las OF de ARZUA que llevan `SOPARTGL` (el validador ya separa Arzúa y Galicia por el soporte; antes el Arzúa cubría las OF del Galicia con su opción de soporte Galicia).

| Pieza | Consumo real | Antes | Ahora |
| --- | --- | --- | --- |
| Brazos Onyx | `BONYX…` es un **juego**. Con 3 brazos, juego + uno suelto I o D (100 de 132 OF de ARZUA con SOPARTGL desde 2024) | 3 juegos (6 brazos) | Juego y, con 3 brazos, suelto derecho (izquierdo si el derecho no existe en ese lacado y salida) |
| Soportes | `SOPARTGL…` es un **juego**. Con 3 brazos, juego + uno suelto | 1 juego (2 soportes) | Juego y, con 3 brazos, suelto derecho |
| Tubo de enrolle | 1 por toldo (84 de 90 OF) | 2 | 1 |
| Terminales | Juego `TERMINEVO` y, con 3 brazos, `TERMINEVOUND` para el del medio (56 OF) | No se reservaban | Juego y, con 3 brazos, el indiferente |
| Casquillo de punta, tapones EVO, varillas | En todas las OF | No se reservaban | Como en el Arzúa |
| Máquina y manivela | MB-11 L-120 (32 OF) o Geiger 1.13 L-140 (17 OF), y manivela | No se reservaban | MB-11 y manivela (Q-G01) |
| Motor | 55/17 en 13 de 18 OF, también con 3 brazos y 650 de frente (OF 0230045); kit rueda P-801 mecanizada + corona LT60 | 70/17 con 3 brazos; rueda Ø78 + corona LT60 Ø78 | 55/17; 70/17 con el candado (Q-G02); el kit del Arzúa |
| `CASPLAS` | No se consume | Se reservaba | Fuera |

Después: **no sobra nada** y solo faltan el soporte suelto izquierdo (la web reserva el derecho, Q-A04) y la máquina Geiger (Q-G01). Contrastado pieza a pieza con las OF 0230335, 0230126, 0230134, 0230045 y 0230410, que son los tests de regresión.

El mismo cambio del tubo de enrolle (1 por toldo, no 2) se aplicó al Arzúa: 217 de 247 OF desde 2025.

## 4. Referencias

- El EVO 80 se elige entre los largos que existen en cada lacado (`arzuaAvailability.js`): el de 600 negro está de baja desde 2023.
- Sin brazo Onyx en ese lacado y salida (o sin brazo suelto con 3 brazos), el toldo no es válido y dice por qué.
- `pnpm validate:rps-refs`: sin códigos rotos en blanco ni en negro (antes, `PEVO80NE11600C` de baja y `BONYXNE11175C` inexistente). En otros lacados quedan 63, casi todos soportes Galicia que solo existen en blanco, negro y marfil (Q-A02).

## 5. Formulario y PDF (puntos 8 y 9)

A 1280×720 y 1600, con el caso AR2603380 (OF 0230335): válido, sin errores ni scroll horizontal. Se entra desde el Arzúa eligiendo 3 brazos y el aviso "3 brazos es el modelo GALICIA" cambia de modelo conservando OF y medidas. El despiece del PDF tiene 14 filas numeradas seguidas y cabe; la hoja de tela da 583 × 360 y 18 ml, como el libro. El nombre no lleva "antes …".

## 6. En qué se apoya cada decisión

| Decisión | Fuente |
| --- | --- |
| Modelo aparte del Arzúa | Iván, 23/09/2026; los libros (hoja `GAL`) |
| Descuentos, mínimos, 2 brazos hasta 550 y 3 por encima | Libros: 49 de 49 estructuras |
| Juego + suelto, tubo 1, terminales, piezas de máquina, kit de motor | Consumo real de 90 OF |
| Motor 55/17 | Consumo real: 13 de 18 OF |
| Aviso con 3 brazos y salida de más de 325 | Ficha técnica TGM e intranet; no bloquea porque hay 3 OF reales con 350 |
| Máximo 700 (se salta con el candado) | La barra más larga es de 700; la ficha habla de 8 m (Q-G03) |

## 7. Dudas

| ID | Pregunta | Qué hace la web |
| --- | --- | --- |
| Q-A04 | **Resuelta (Iván, 25/09/2026):** no van de un lado concreto. Debe ser un dato opcional del pedido; si no se pone, decide el taller | Hoy, derecho. Pendiente: dato opcional en la tarjeta y, sin él, aviso en el PDF de que el lado lo decide el taller |
| Q-A06 | ¿Se reserva el largo de stock más corto que cabe? El almacén imputa muchos de 500 | 600 o 700 |
| Q-G01 | Máquina MB-11 L-120 (32 OF) o Geiger 1.13 L-140 (17 OF): ¿de qué depende? | MB-11 |
| Q-G02 | ¿Cuándo se pone el motor 70/17? (5 de 18 OF, sin relación clara con la medida) | 55/17; 70/17 con el candado |
| Q-G03 | La ficha permite 8 m con tres brazos y hay 10 OF con tubo de 800, pero la barra más larga es de 700. **Iván (25/09/2026): sí se empalma** (pendiente: dejar pasar hasta 8 m con empalme, como el Monoblock 350). Sigue abierta la salida de 350 con tres brazos: ¿se permite? | Máximo 700 con candado; aviso por encima de 325 con tres brazos |
