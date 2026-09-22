# Punto Recto — expediente

22/09/2026 · **Terminado salvo cuatro dudas para OT** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Evidencia anterior](../rps-punto-recto-evidence.md)

## 1. Alcance

- Código `PUNTO RECTO`: brazos PRT-07 sobre tubo P701 o P801, con máquina o motor.
- 19 estructuras en 13 libros de 2026 y 19 OF con consumo real desde 2025.

## 2. En qué se apoya cada decisión

No hay manual de fabricación del PRT-07 en Oficina Técnica: solo la tarifa nacional 2026. Cada cambio se apoya en una fuente distinta, y conviene no confundirlas:

| Cambio | Fuente |
| --- | --- |
| Perfil Univers 280 en vez del 270 | Consumo real (10 OF) y maestro de RPS. **La tarifa sí vende el Univers-270** (4, 5, 6 y 7 m, pág. 424), pero en RPS solo existe el blanco de 700 y no se consume. **Q-PR03** |
| Brazos vigentes y de baja por lacado | Maestro de RPS con `InactiveDate`, más la tarifa: vende el PRT-07 de 0,70 a 1,40 m (pág. 434) |
| Salida 160 | Existe en RPS en blanco, pero **no está en la tarifa**. **Q-PR04** |
| Tapones, varillas, manivela, casquillo y kit de motor | Consumo real de 19 OF |
| Medidas | Los libros de 2026 |
| Tubo Ø70 sin barra de 400 | Maestro de RPS: de baja desde 2021 |

## 3. Medidas

`pnpm validate:punto-recto` (22/09/2026): **68 comprobaciones y ninguna diferencia**. Siete toldos llevan un margen de caída escrito a mano (de 60 a 116 cm); se reproducen con la excepción técnica de la tarjeta.

## 4. Reserva frente al consumo real (19 OF)

| Pieza | Consumo real | Antes | Ahora |
| --- | --- | --- | --- |
| Perfil de carga | `PUNI280` (10 OF) | `PUNI270`, que **solo existe en blanco de 700** y no se consume | Univers 280, con los largos que existen por color |
| Kit de tapones `TAPOPLUN280` | 13 OF | No se reservaba | 1 por unidad |
| Varillas negra y blanca | 16 OF cada una | No se reservaban | Por metros de frente de tela (blanca × 2 con bamba) |
| Manivela | 5 OF | Solo en el despiece, sin código | Se reserva |
| Casquillo de máquina | Eje 50 en 10 OF; eje 63 en 6 | Siempre eje 63 | Eje 50 (**Q-PR02**) |
| Motor Ø78: rueda y corona | `RUEDAMOT801MEC` y `CORONALT5078` | `RUEDAMOT78` y `CORONALT6078`, que no se consumen | Cambiados, como en Cortina |
| Brazos PRT-07 | Según color y salida | Código compuesto con cualquier salida | Solo los que existen y no están de baja |

`pnpm validate:reserva "PUNTO RECTO"` después: solo queda el casquillo de eje 63 (Q-PR02). Ya no sobra nada salvo piezas de las variantes que no se dieron en esas OF.

## 5. Brazos que existen de verdad

Consultado en RPS el 22/09/2026 con la fecha de baja (`puntoRectoArms.js`). Solo el blanco tiene toda la gama:

| Lacado | Salidas vigentes | De baja |
| --- | --- | --- |
| Blanco 9016 | 70, 80, 90, 100, 120, 140, 160 | 110 |
| Negro 9011 | 80, 90, 140 | 70, 100, 160 |
| Negro mate 9111 | 80, 90, 100, 120, 140 | — |
| Gris 7016 | 80, 100, 120, 140 | — |
| Marrón 8014 | 80, 90, 120 | 70, 100 |
| Plata 27 | 100, 140 | 70, 120 |
| Verde 6005 | 90, 100 | 120, 160 |
| Gris 7012 | 80 | 70 |
| Gris 7022 | 100 | 70, 140 |
| Corten óxido | 100 | — |
| Burdeos, bronce, marfil | — | todas |

La lista de salidas del formulario pasa de 80…160 de diez en diez a **70, 80, 90, 100, 120, 140 y 160**: el 110 está de baja y el 130 y el 150 no han existido nunca. Si el lacado elegido no tiene esa salida, el toldo sale no válido con el motivo, en vez de reservar un brazo inexistente. La tarifa nacional 2026 (pág. 434) vende el PRT-07 de 0,70 a 1,40 m.

## 6. Formulario y dibujo

Revisado a 1280×720 y 1600 (`output/modelos/punto-recto/`): la tarjeta mantiene el recorrido de los brazos (estándar o bajada vertical 170°), el mínimo de brazos por frente y la altura de manivela. En negro con salida 100 queda en REVISAR con el motivo. El despiece va numerado sin saltos.

## 7. Dudas para OT

| ID | Pregunta | Impacto |
| --- | --- | --- |
| Q-PR01 | Con tubo Ø70 y motor se reservan `ADAPTADORESTUBO70` y `CORONA LT5070`, que existen pero no se han consumido en estas OF (solo hubo dos motores, los dos con Ø78). ¿Son las piezas correctas? | Kit de motor con tubo Ø70 |
| Q-PR02 | El casquillo de máquina: eje 50 en 10 OF y eje 63 en 6. Se reserva el de 50. ¿De qué depende? (la misma duda que en Cortina) | Casquillo de máquina |
| Q-PR03 | ¿El Punto Recto lleva perfil Univers 280 o 270? La tarifa vende los dos; en RPS el 270 solo existe en blanco de 700 y lo consumido es el 280 | Perfil de carga |
| Q-PR04 | La salida de 160 cm existe en RPS (blanco) pero no está en la tarifa 2026, que llega a 1,40 m. ¿Se sigue ofreciendo? | Salidas del formulario |

