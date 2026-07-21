# Xacobeo: contraste Excel y RPSNext

## Fuentes

- Excel maestro `Y:\PROGRAMAS CALCULO\TOLDOS TESTAR 10-4.xlsm`, hoja oculta `XAC`.
- Planteamientos de 2026 guardados en `Y:\2026\TOLDOS`.
- Pedido motorizado `Y:\2025\TOLDOS\AR2501690.xlsm`.
- Reserva final de cada libro, tabla agrupada `RPS!K:M`.

## Reglas actuales

- Salidas estándar: 125, 150, 175, 200, 225 y 250 cm.
- Frente máximo estándar: 450 cm.
- Línea mínima: salida + 32 cm para máquina exterior y motor; salida + 37 cm para máquina interior.
- Caída de tela: salida + 45 cm + alto de bamba.
- Descuentos de tela: 12,5 cm exterior; 12 cm interior; 11 cm motor.
- Descuentos del tubo P701: 10,9 cm exterior; 10,6 cm interior; 8,9 cm motor.
- Descuentos del EVO 70: 9,9 cm exterior; 9,6 cm interior; 8,7 cm motor.

## Materiales confirmados

- Soporte `SOPART250{lacado}`.
- Tubo de enrollamiento `TURA70HG{stock}C` y casquillo `CASPUNCE`.
- Tubo de carga `PEVO702R{lacado}{stock}C`.
- Brazos `BART25{lacado}{salida}C`.
- Máquina exterior: casquillo `CASMAQEJE6370MM`, máquina según lacado y manivela según altura.
- Máquina interior: casquillo `CASMAQEJE5070MM`, definido por la tabla XAC/M REF.
- Motor: `SOPORTEUNVHIPRO`, `SUNILUSIO35//17`, `CORONA LT5070` y mando SITUO. La rueda `ADAPTADORESTUBO70` aparece con cantidad cero y no se reserva.

## Casos de control

- `AR2603241 / OF 0230011`: 365x250, máquina exterior, bamba 30; tela 352,5x325 y 13 ml.
- `AR2600759 / OF 0225532`: dos toldos en la misma OF; RPS agrupa dos unidades y suma 9,75 ml.
- `AR2501690 / OF 0215523`: 266x125, motor; confirma motor, soporte, corona, mando y 5,46 ml de tela.

El script `scripts/validate-xacobeo-production.mjs` vuelve a consultar RPSNext, localiza los Excel y compara medidas y reservas agrupadas.
