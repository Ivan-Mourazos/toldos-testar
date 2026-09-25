# Selena — expediente

22/09/2026 · **Terminado salvo el motor (Q-SE04, contestada el 25/09/2026)** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md)

## 1. Alcance y punto de reanudación

- Código `SELENA`: vertical con dos brazos Stor-21. Reutiliza el cálculo de Cortina con su propio margen.
- **En los libros está como CORTINA** (y uno como MAXISCREEM, por el soporte que lleva): buscar "SELENA" en los libros no encuentra nada. Se localizan por el código de pedido de RPS. 17 OF con consumo real desde 2025 y 20 toldos en 16 libros.
- Iván (22/09/2026): Selena comparte muchas piezas con Cortina, y a veces se usa el soporte Maxiscreem; por eso algún libro está hecho en esa hoja.
- Siguiente acción: ofrecer la Selena a motor (Iván, 25/09/2026: «en teoría, sí»), con el kit de la Cortina, que comparte tubo y piezas. Lo demás está cerrado.

## 2. Reglas

| Medida | Regla | Fuente |
| --- | --- | --- |
| Frente de tela, tubo y perfil | Los descuentos de Cortina (12 / 11 con máquina interior) | `cortinaRules.js` |
| Caída | Alto + 50; con bamba de la misma tela, + bamba + 5 | `selenaRules.js` (margen editable en Parámetros) |
| Descuento inferior | Ninguno: el margen ya es el recorrido vertical | `bottomDeductionCm: 0` |
| Accionamiento | Solo máquina interior; exige lado de máquina | `selenaRules.js` |
| Soporte | Universal 3 agujeros o Maxiscreem, como Cortina | Iván, 22/09/2026 |
| Ventana | Puede llevarla; entonces pide sus cuatro medidas y reserva cristal (frente de tela − 2 × esquina + 10) | Iván, 22/09/2026; la OF 0223051 consumió 14 ml de cristal |

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

## 4. Medidas contrastadas con los libros

Los 20 toldos de los 16 libros (que están como CORTINA) dan esto, con la caída que escribió el libro:

| Caso | Toldos | Caída del libro |
| --- | --- | --- |
| Con bamba de la misma tela | 4 (0218482, 0218930, 0220432, 0231210) | Alto + bamba + 55, es decir margen 50 y remate 5: **lo que hace la web** |
| Sin bamba | 3 (0222058, 0223156, 0225904) | Alto + 50: **lo que hace la web** |
| Sin bamba | 3 (0217782 ×2, 0223051 ×2) | Alto + 45, el margen de Cortina |
| Con bamba | 2 (0224370, 0224371) | Alto + bamba + 45 |
| Con el −18 de Cortina | 5 (0218484, 0218576 ×2, 0222299 ×3) | Alto + 27 |
| Suelto | 1 (0218750) | +115 |

La regla de la web (margen 50, más 5 de remate con bamba) es la mayoritaria y coincide además con la lona consumida en la OF 0231210 (6,9 ml exactos). Los demás repiten la variabilidad de Cortina: unos usan su margen y otros le restan los 18 cm.

## 5. Formulario y dibujo

Revisado a 1280×720 y 1600 (`output/modelos/selena/`, con `selena-ventana.png`): la tarjeta pide bamba, curva, lacado, lado de máquina, altura de manivela y colocación, y avisa de que es un sistema vertical con dos brazos Stor. Con un lacado sin brazos, la tarjeta queda en REVISAR con el motivo. El despiece va numerado sin saltos y lleva el juego de brazos. El dibujo es el de cortina sin ventana, rotulado SELENA.

## 6. Lo que dicen los manuales de Oficina Técnica

Buscado el 22/09/2026 en `\192.168.0.128OftecnicaOficina Tecnica`: **no hay manual propio de Selena ni del sistema Stor**. Lo único que aparece es el juego de brazos en la tarifa nacional 2026 (pág. 434): **J/B STOR-21 de 0,50 m**, en un solo tamaño, mínimo 10 juegos en blanco; en la misma página están las bridas a barandilla Ø42 y Ø51 y el enganche a obra Super-Stor, que encajan con la nota "piezas Stor barandilla" de la tarjeta.

No aparecen por ningún lado el brazo `BRSTORSUPERBL16`, el kit de guías `K/GUIABLAN` ni la máquina Geiger `MAQ13C`: son de pedidos antiguos y no se reservan (Q-SE03 resuelta). Tampoco se dice nada del accionamiento a motor, y en las 17 OF con consumo no hay ningún motor.

## 7. Dudas

| ID | Pregunta | Impacto |
| --- | --- | --- |
| Q-SE01 | **Resuelta con los libros (22/09/2026).** El margen de 50 con remate de 5 es el mayoritario y coincide con la lona consumida; se mantiene | Ninguno |
| Q-SE02 | **Resuelta por Iván el 22/09/2026.** Selena puede llevar ventana: la tarjeta la pregunta y reserva cristal | Hecho |
| Q-SE03 | **Resuelta el 22/09/2026.** No están en los manuales: son de pedidos antiguos y no se reservan | Ninguno |
| Q-SE04 | **Resuelta por Iván el 25/09/2026: en teoría, sí.** El manual no lo dice y no hay ningún motor en las 17 OF; hoy la web solo admite máquina interior | Pendiente: motor con el kit de la Cortina |
