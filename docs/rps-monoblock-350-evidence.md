# Evidencia RPS: Monoblock 350

## Fuentes

- `Y:\PROGRAMAS CALCULO\TOLDOS TESTAR 10-4.xlsm`, hoja oculta `MON.350`.
- Pedidos `MONOB` de RPSNext entre 2024 y julio de 2026.
- Planteamientos reales de `Y:\2026\TOLDOS`.

## Reglas confirmadas

- Salidas establecidas: 150, 175, 200, 225, 250, 275, 300, 325 y 350 cm.
- Admite 2, 3 o 4 brazos. Cada combinación de salida y brazos tiene frente mínimo y máximo.
- Siempre utiliza tubo de enrollamiento P801, tubo de carga EVO 80 y barra cuadrada 40×40.
- Descuentos de máquina: tela 14,2 cm, P801 13,2 cm, EVO 80 12,2 cm y barra 1 cm.
- Descuentos de motor: tela 13 cm, P801 12 cm, EVO 80 11,5 cm y barra 1 cm.
- Caída de tela con bamba del mismo tejido: `salida + 40 + bamba + 5`. Los 5 cm se mantienen aunque la bamba sea cero.
- Con bamba de tejido distinto, el paño principal usa `salida + 40` y la bamba se reserva por separado con `alto + 5`.
- Soportes de brazos: uno por brazo. Los soportes de fijación se calculan como dos por brazo más uno o dos intermedios según la luz libre de 400 cm.
- Currón: ninguno hasta 650 cm, uno hasta 850 cm y dos por encima de 850 cm.
- Stock P801/EVO 80: 600 cm por debajo de 600 cm de corte y 700 cm desde ese punto.

## Despiece base

- Juego soporte brazo Monobloc 350 `SOPBRAMONOB{lacado}`.
- P801 `TURA80HG{stock}C` y casquillo punta `CASPUNCE`.
- EVO 80 `PEVO80{lacado}{stock}C` y tapones `TAPONEVO7{lacado}`.
- Brazos Onyx `BONYX{lacado}{salida}C`.
- Barra 40×40 blanca o negra de 700 cm.
- Soportes de colocación frontal o techo y juego máquina-punta Monoblock 350.
- Máquina: casquillo Ø78, máquina ZNP y manivela.
- Motor: rueda Ø78, soporte Hipro, corona LT60, motor Sunilus, mando y sensor.

## Casos representativos

- `AR2603393`, OF `0230266`: 695×275, máquina, 3 brazos y techo. Coinciden medidas, ocho soportes, 20,7 ml y reserva.
- `AR2602642`, OF `0229011`: 488×300, motor, 2 brazos y frontal. Coinciden medidas, seis soportes y 18,5 ml.
- `AR2601779`, OF `0227437`: 725×350, motor, 3 brazos, sensor de movimiento y lacado especial.
- `AR2601152`, OF `0226281`: 675×350, máquina, 3 brazos y un currón.
- `AR2600662`, OF `0225355`: dos estructuras de la misma OF, correctamente agrupables en una sola reserva.
- `AR2600566` y `AR2601539`: número de soportes modificado respecto a la fórmula; se conservan como excepciones técnicas individuales.
- `AR2600156`, OF `0224325`: 972×250, motor, 4 brazos y dos currones.

## Correcciones respecto al Excel

- La tabla antigua nombra un motor `55/12`, pero no existe esa referencia en RPS. La web usa el artículo vigente `SUNILUSIO50//12` para las combinaciones equivalentes.
- El Excel deja vacía en algunos lacados la referencia del kit de tapones aunque RPS sí contiene el artículo. La web genera el código por lacado.
- Las filas duplicadas observadas en `_MaterialesPrevistosOF` no se toman como cantidades de diseño: la reserva de la web se consolida una vez por OF y artículo.

## Validación automatizada

El comando `npm run validate:monoblock` consulta RPSNext en modo lectura y contrasta los Excel de 2025 y 2026.

- 39 pedidos RPS localizados en 39 libros.
- 48 estructuras: 32 de máquina y 16 de motor.
- 234 comprobaciones de frente de tela, caída, P801, EVO 80 y soportes.
- Ninguna diferencia inesperada en las reglas dimensionales.
- Diez diferencias históricas quedan clasificadas como ajustes manuales: tres caídas y siete cantidades de soportes.

La reserva antigua no se usa como autoridad cuando omite referencias que sí forman parte del conjunto técnico, principalmente tapones EVO, motores o mandos. Esas líneas se conservan en la simulación de la web.
