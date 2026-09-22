# Selena — expediente

22/09/2026 · **Reserva terminada; medidas pendientes de Q-SE01** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md)

## 1. Alcance y punto de reanudación

- Código `SELENA`: vertical con dos brazos Stor-21. Reutiliza el cálculo de Cortina con su propio margen.
- **No pasa por los libros de Excel**: el recorrido de los 1.900 libros de 2025 y 2026 no encuentra ninguna Selena. Todo lo que se puede medir sale de RPS: 17 OF con consumo real desde 2025.
- Siguiente acción: Iván u OT responden Q-SE01..Q-SE04.

## 2. Reglas

| Medida | Regla | Fuente |
| --- | --- | --- |
| Frente de tela, tubo y perfil | Los descuentos de Cortina (12 / 11 con máquina interior) | `cortinaRules.js` |
| Caída | Alto + 50; con bamba de la misma tela, + bamba + 5 | `selenaRules.js` (margen editable en Parámetros) |
| Descuento inferior | Ninguno: el margen ya es el recorrido vertical | `bottomDeductionCm: 0` |
| Accionamiento | Solo máquina interior; exige lado de máquina | `selenaRules.js` |

## 3. Reserva frente al consumo real (17 OF desde 2025)

| Pieza | Consumo real | Antes | Ahora |
| --- | --- | --- | --- |
| Juego de brazos Stor-21 `BRASTOR{lacado}` | 1 por unidad (13 OF; en las más antiguas, `BRSTORSUPERBL16`) | No se reservaba | 1 por unidad, del color del lacado |
| Máquina MB-11 L-120 | 13 OF | Solo despiece | Se reserva |
| Casquillo de punta Ø78 | 11 OF | No | Se reserva |
| Varillas negra y blanca | 10 y 9 OF | No | Por metros de frente de tela |
| Taco de nailon `CASPLAS` | 0 OF | Se reservaba | Fuera |
| Mosquetones `MOSQBOACIN60MM` | 0 OF | Se reservaban | Fuera |
| Puente abatible y regleta | 0 OF | — | No se añaden (son de Cortina) |

`pnpm validate:reserva SELENA` después: quedan el brazo antiguo `BRSTORSUPERBL16` (6 OF, todas de 2024), el kit de guías `K/GUIABLAN` (3 OF de 2024), los casquillos Ø70 y las telas propias de cada pedido. **Q-SE03**.

### Lacados que ahora se bloquean

Los brazos Stor-21 solo existen en RPS en siete colores: blanco 9016 y 9006, negro 9011 y negro mate 9111, burdeos 3005, gris 7016 y verde 6005 (`selenaArms.js`). Tampoco hay perfil Univers en el lacado especial, el gris 7016 mate texturado ni el negro mate 9005, y el bronce 28 está de baja (`universProfileLengths.js`). En esos lacados el toldo sale **no válido con su aviso**, en vez de reservar una referencia que RPS no tiene. Con esto, Cortina y Selena quedan sin códigos rotos en ningún lacado (antes, Selena tenía 13).

## 4. Medidas: lo que se puede comprobar

Sin libros, la única comparación posible es la lona consumida. De las 17 OF, 10 tienen medidas en el pedido y consumo de una sola tela:

| OF | Medidas | Consumido | Margen 45 | Margen 50 |
| --- | --- | --- | --- | --- |
| 0218484 | 185 × 175 | 4,35 | **4,4** | 4,5 |
| 0220034 | 335 × 150 | 5,85 | **5,85** | 6 |
| 0224371 | 111 × 157 + bamba 12 | 2,14 | **2,19** | 2,24 |
| 0222058 | 320,5 × 150 | 6 | 5,85 | **6** |
| 0231210 | 290 × 160 + bamba 15 | 6,9 | 6,75 | **6,9** |
| 0218930, 0218482, 0220432, 0218750, 0224370 | — | 4,7 / 7,05 / 6,75 / 14 / 4,28 | No cuadra | No cuadra |

El consumo incluye retales (`RESTOVARILLA` aparece en 7 OF), así que no decide por sí solo. **Q-SE01**.

## 5. Formulario y dibujo

Revisado a 1280×720 y 1600 (`output/modelos/selena/`): la tarjeta pide bamba, curva, lacado, lado de máquina, altura de manivela y colocación, y avisa de que es un sistema vertical con dos brazos Stor. Con un lacado sin brazos, la tarjeta queda en REVISAR con el motivo. El despiece va numerado sin saltos y lleva el juego de brazos. El dibujo es el de cortina sin ventana, rotulado SELENA.

## 6. Dudas

| ID | Pregunta | Impacto |
| --- | --- | --- |
| Q-SE01 | ¿El margen de caída de Selena es 50 o 45? Con 45 cuadran tres pedidos y con 50, otros dos | 5 cm en todas las Selena |
| Q-SE02 | La OF 0223051 consumió 14 ml de cristal. ¿Puede llevar ventana una Selena? Hoy la web no la ofrece | Ventana y reserva de cristal |
| Q-SE03 | ¿Siguen vigentes el brazo `BRSTORSUPERBL16`, el kit de guías `K/GUIABLAN` y la máquina Geiger `MAQ13C` (2 OF), o son de pedidos antiguos? | Piezas que faltarían en la reserva |
| Q-SE04 | ¿Existe Selena a motor? Hoy solo se admite máquina interior | Accionamiento |
