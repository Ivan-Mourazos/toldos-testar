# Cortina — expediente

22/09/2026 · **Implementado (22/09): pendiente de la revisión de la muestra por Iván y de dos dudas para OT** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md) · [Evidencia anterior](../rps-cortina-evidence.md)

## 1. Alcance y punto de reanudación

- Código `CORTINA`: toldo cortina completo (estructura, tela y reserva). 402 cortinas en 233 libros: 243 en 2025 y 159 en 2026. 214 OF con consumo real desde 2025.
- Alcance: medidas (frente de tela, caída, tubo, perfil), reserva completa frente al consumo real, formulario y dibujo.
- Siguiente acción: Iván revisa la muestra (`output/modelos/cortina/`). Q-CO04 y Q-CO05 quedan para OT.

## 2. Reglas del maestro (`TOLDOS TESTAR 10-4.xlsm`, hoja `CORT`)

| Medida | Fórmula | Web |
| --- | --- | --- |
| Frente de tela | Frente − 12,5 (máq. exterior) / 12 (máq. interior) / 11 (motor) | Igual |
| Tubo de enrolle y perfil Univers 280 | Frente − 11 (máquina) / 10 (motor) | Igual |
| Caída con bamba de la misma tela | Alto + 40 + bamba + 5 − 18 | Alto + bamba + 45, **sin −18** |
| Caída con bamba en otra tela | Alto + 40 − 18 | Alto + 40 |
| Caída sin bamba | Alto + 40 + 5 − 18 (el +5 se suma igual) | Alto + 45 |
| Máquina | "MAQUINA ZNP 10 L170" | Despiece: MB-11 L-120 (la que se consume) |

## 3. Medidas: contraste con los libros

Recorrido de los 402 toldos (`tmp/cortina-full/scan.mjs`), 22/09/2026.

| Medida | Diferencias | Explicación |
| --- | --- | --- |
| Frente de tela | 42 | Ajustes a mano pequeños (±1 a 4 cm) y 2 frentes escritos mal |
| Tubo | 31 | Ídem |
| Perfil | 53 | Ídem |
| Caída | 209 | 109 el libro restó 18; 46 el libro no sumó el +5 sin bamba; 36 el libro sumó +10 o +15 (casi todas sin ventana); el resto, ajustes sueltos |

**El −18 no sigue una regla.** Se restó en 110 cortinas y no en 234. No depende del técnico (Tamara 39 sí y 39 no; Iván 9 sí y 18 no), ni del cliente (bares: 35 de 104; resto: 75 de 240), ni de la ventana.

**+10 / +15:** 34 cortinas, 32 con el dibujo GENERAL (sin ventana), casi todas de 2025 (Alberto, Banesa, Jaime).

## 4. Reserva frente al consumo real

`pnpm validate:reserva CORTINA` (184 OF) y consumo por OF cruzado con las medidas de los libros.

| Pieza | Consumo real | Web hoy | Regla que sale de los datos |
| --- | --- | --- | --- |
| Pletina puente abatible `PLEACIN` | 2 por cortina (166 de 184) | No | 2 por unidad |
| Anilla puente abatible `ANIACIN` | 2 por cortina | No | 2 por unidad |
| Kit regleta zamak `KITREGLETAZAMAK` | 1 por cortina (161 de 166) | No (despiece dice 2 regletas sin código) | 1 por unidad |
| Máquina MB-11 L-120 `MAQMB11L12BLAN/NEGRO` | 1 por cortina a máquina (171 OF) | Solo despiece | 1 por unidad, según lacado |
| Casquillo punta Ø78 `CASPUNCEJE78MM` | 1 por cortina (138 OF) | Solo despiece | 1 por unidad |
| Taco nailon `CASPLAS` | 4 OF | Se reserva | Quitar, como en Arzúa |
| Varilla negra `VARILLAVAINANEG5` | ≈ frente de tela (m) | No | Frente de tela × unidades |
| Varilla blanca 5,5 `VARILLAVAINARBLA` | ≈ frente de tela × 2 con bamba, × 1 sin bamba | No | Una en la cortina y otra en la bamba (igual que el dibujo) |
| Cristal `CRISTATP140650` | 125 OF; ≈ frente de tela − 2 × esquina + 10 cm | No | Una tira de 140 por ventana |
| Motor: rueda | `RUEDAMOT801MEC` (14 de 18) | `RUEDAMOT78` (no se consume) | Cambiar |
| Motor: corona | `CORONALT5078` (9) | `CORONALT6078` (no se consume) | Cambiar |
| Motor | Sunilus 15/17 (5), 35/17 (5), 55/17 (3) | Siempre 15/17 | **Q-CO04** |
| Barras de tubo y perfil | 400, 500, 600 y 700 | Solo 600 | La más corta que llegue |
| Tubo Ø70 `TURA70` y casquillos Ø70 | ≈ 1 de cada 4 OF, con cualquier frente | Siempre Ø78 | **Q-CO05** |
| Casquillo máquina eje 63 | ≈ 1 de cada 3 OF | Siempre eje 50 | **Q-CO05** |

## 5. Cambios hechos (`65bf1d7` y siguiente)

1. Reservar puente abatible (2 pletinas y 2 anillas), kit de regleta, máquina MB-11 según lacado y casquillo de punta Ø78.
2. Quitar `CASPLAS` de la reserva.
3. Varillas negra y blanca por metros de frente de tela (blanca × 2 con bamba).
4. Cristal por ventana: frente de tela − 2 × esquina + 10 cm.
5. Kit de motor: `RUEDAMOT801MEC` y `CORONALT5078`.
6. Barras de 400, 500, 600 y 700 para tubo y perfil; el perfil Univers solo en los largos que existen en RPS para cada color (`universProfileLengths.js`: el bronce 28 solo en 700, el gris 7012 desde 500…).
7. Caída: resta 18 cm por defecto, con la opción "Restar 18 cm abajo: No" en la tarjeta; el candado permite otro valor. Sin bamba no se suma el +5 (Q-CO01, Q-CO02).
8. Casquillo de máquina: eje 50 con máquina interior y eje 63 con exterior, como en Arzúa (exterior: 15 de 21 OF con eje 63).
9. Motor 15/17 por defecto; con el candado, 35/17 o 55/17.
10. Dibujo: la cota suelo-ventana y la altura del velcro siguen lo que se resta de verdad (`curtainBottomDeduction`).
11. Despiece numerado sin saltos (con máquina hay una fila menos que con motor).
12. Selena conserva el cálculo y la reserva anteriores (`legacyReservation`) hasta su revisión: reutiliza el cálculo de Cortina.

`validate:reserva CORTINA` después: solo quedan el cristal (las muestras del validador no llevan ventana) y los casquillos Ø70 (Q-CO05). Nada se reserva sin consumirse. `validate:rps-refs`: 0 códigos rotos en Cortina y Selena.

Hallazgo transversal: un lacado escrito como "GRIS (R-7012)" no se reconoce y cae en blanco sin avisar (`resolveLacado`). Afecta a todos los modelos.

## 6. Dudas para Iván

| ID | Pregunta | Impacto |
| --- | --- | --- |
| Q-CO01 | **Resuelta por Iván el 22/09/2026.** Se restan 18 por defecto, con opción de no restarlos | Hecho |
| Q-CO02 | **Resuelta por Iván el 22/09/2026.** Sin bamba no se suma el +5 | Hecho |
| Q-CO03 | **Resuelta por Iván el 22/09/2026.** Casos esporádicos, como en los cambios de tela: se ponen con el candado | Ninguno |
| Q-CO04 | **Para OT** (Iván no lo sabe). ¿Qué motor lleva cada cortina? Se usaron 15/17 (318 × 140), 35/17 (500 × 300, 480 × 460) y 55/17 (963 × 258) | Motor y reserva |
| Q-CO05 | **Para OT** (Iván no lo sabe). El eje 63 queda resuelto con la regla de Arzúa (exterior). ¿Cuándo se usa tubo Ø70 en vez de Ø78, y casquillo de máquina eje 63 en vez de 50? En los datos no depende del frente | Tubo y casquillos |
