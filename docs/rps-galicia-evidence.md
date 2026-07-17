# Evidencia GALICIA

Fuentes revisadas el 13/07/2026:

- `TOLDOS TESTAR 10-4.xlsm`, hoja `GAL`.
- `AR2603298-1.xlsm`, OF `0230134`, 430 x 350, 2 brazos, máquina exterior, UNIVERS 280.
- `AR2603315.xlsm`, OF `0230126`, 598 x 225, 3 brazos, máquina exterior, UNIVERS 280.
- Planteamiento `AR.26.03289-1`, OF `0230045`, 650 x 225, 3 brazos, motor, UNIVERS 280.
- Planteamiento `AR.26.03420-1`, OF `0230410`, 650 x 300, 3 brazos, máquina exterior, EVO 80.
- Materiales previstos de esas OF en `RPSNext`.

## Reglas contrastadas

- GALICIA admite 2 o 3 brazos. El Excel propone 2 hasta 550 cm de frente y 3 por encima.
- Motor: 2 brazos usa 55/17; 3 brazos usa 70/17.
- Stock de tubo GALICIA: 600 o 700 cm.
- Destino particular propone EVO 80; hostelería/empresa propone UNIVERS 280. El técnico puede cambiarlo.
- Sensores `SOL` y `VIENTO -SOL` usan `SITUOVARIOPURE` (SITUO 5 VARIATION); el resto usa `SITUOIO1PURE`, según la tabla de mando del Excel y `STKArticle` de RPSNext.
- `AR2603298-1.xlsm` sustituyó la última salida 325 por 350 y conservó mínimos 375 cm (2 brazos) y 562,5 cm (3 brazos). La web mantiene ambas salidas.
- La reserva conserva el contrato antiguo de `materiales-ot`: archivo `.xls` tabulado, Latin-1, columnas `OF`, `ARTICULO`, `CANTIDAD` y agrupación OF/artículo.
- El consumo de tela replica la hoja `TELA`: calcula primero los paños iniciales y vuelve a redondearlos tras sumar `2,5 cm` por costura y `6,5 cm` de margen base. En `AR2603315` esto convierte 5 paños teóricos en 6 y da `17,7 ml`.

## Medidas de regresión

| OF | Enrolle | Carga | Tela | Caída | Paño |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0230134 | 418,5 | 418,5 | 417 | 420 | 16,8 |
| 0230126 | 586,5 | 586,5 | 585 | 295 | 17,7 |
| 0230045 | 640 | 640 | 639 | 295 | 17,7 |
| 0230410 | 639,5 | 638,5 | 637 | 365 | 21,9 |

RPSNext contiene en algunas OF líneas duplicadas por reimportaciones posteriores. La web genera las cantidades físicas del planteamiento y agrupa una sola vez al exportar.
