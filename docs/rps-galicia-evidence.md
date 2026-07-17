# Evidencia GALICIA

Fuentes revisadas hasta el 17/07/2026:

- `TOLDOS TESTAR 10-4.xlsm`, hoja `GAL`.
- `AR2603298-1.xlsm`, OF `0230134`, 430 x 350, 2 brazos, máquina exterior, UNIVERS 280.
- `AR2603315.xlsm`, OF `0230126`, 598 x 225, 3 brazos, máquina exterior, UNIVERS 280.
- Planteamiento `AR.26.03289-1`, OF `0230045`, 650 x 225, 3 brazos, motor, UNIVERS 280.
- Planteamiento `AR.26.03420-1`, OF `0230410`, 650 x 300, 3 brazos, máquina exterior, EVO 80.
- Materiales previstos de esas OF en `RPSNext`.

## Validación amplia de producción

El 17/07/2026 se ejecutó `pnpm validate:galicia` contra:

- 2.412 PDF de planteamientos de 2026.
- 43 pedidos donde el PDF contiene `JUEGO SOPORTE GALIZIA`.
- 48 libros `.xlsm` asociados y sus hojas `ESTR.01` a `ESTR.04`.
- 49 estructuras Galicia encontradas en esos libros.
- Materiales previstos de cada OF en `RPSNext`.

Resultado: las 43 estructuras estándar, de hasta 700 cm, coinciden en largos de enrolle/carga, ancho y caída de tela, metros lineales y stock. La lectura agrupa todas las estructuras del libro; no compara solo la primera página PDF.

Se encontraron seis estructuras excepcionales con frentes de 720 a 786 cm. El Excel las asocia a stock 700 aunque el corte supera ese largo. La web las bloquea como excepción fuera del máximo estándar; no se convirtió esa incoherencia histórica en regla automática.

Nueve hojas históricas muestran cantidad 1 en la fila de brazos pese a frentes que requieren 2 o 3. Los casos actuales usan cantidad física 2/3. La web conserva la regla actual y evita reproducir esos datos antiguos.

## Reglas contrastadas

- GALICIA admite 2 o 3 brazos. El Excel propone 2 hasta 550 cm de frente y 3 por encima.
- Motor: 2 brazos usa 55/17; 3 brazos usa 70/17.
- Stock de tubo GALICIA: 600 o 700 cm.
- EVO 80 o UNIVERS 280 se elige directamente en cada toldo. El formulario no pregunta particular/empresa.
- Margen de caída, costuras, margen base, largos de stock, descuentos y líneas mínimas son editables en `Parámetros > Galicia`.
- Sensores `SOL` y `VIENTO -SOL` usan `SITUOVARIOPURE` (SITUO 5 VARIATION); el resto usa `SITUOIO1PURE`, según la tabla de mando del Excel y `STKArticle` de RPSNext.
- `AR2603298-1.xlsm` sustituyó la última salida 325 por 350 y conservó mínimos 375 cm (2 brazos) y 562,5 cm (3 brazos). La web mantiene ambas salidas.
- La reserva conserva el contrato antiguo de `materiales-ot`: archivo `.xls` tabulado, Latin-1, columnas `OF`, `ARTICULO`, `CANTIDAD` y agrupación OF/artículo.
- El consumo de tela replica la hoja `TELA`: calcula primero los paños iniciales y vuelve a redondearlos tras sumar `2,5 cm` por costura y `6,5 cm` de margen base. En `AR2603315` esto convierte 5 paños teóricos en 6 y da `17,7 ml`.
- El ancho del rollo forma parte de la tela. Los pedidos `AR2600762`, `AR2602119` y `AR2602670` usan `PVC 580` de 250 cm; la web obtiene, por ejemplo, `11,1 ml` para `AR2602119`, no los `22,2 ml` que daría una tela de 120 cm.

## Criterio de reserva

- `TURA80HG...` se reserva con cantidad 2 por toldo, como las OF procesadas en RPSNext.
- La manivela aparece en el despiece y el PDF de estructura, pero no en la reserva. Las OF reales de máquina tampoco la incluyen en sus materiales previstos.
- `CASPUNCE`, la máquina y las piezas sin referencia siguen visibles en estructura, pero no generan líneas RPS.
- UNIVERS 280 de stock 700 usa su referencia completa (`PUNI280...700C`), aunque el PDF antiguo de `AR2603289` la dejase vacía.
- Duplicados históricos de RPSNext no se copian. La web reserva la cantidad física una vez y agrupa por OF + artículo.
- La muestra actual `AR2603289`, `AR2603298`, `AR2603315`, `AR2603380` y `AR2603420` no presenta diferencias inesperadas contra RPS. Cuatro OF coinciden exactamente. En `0230045`, RPS omite `PUNI280BL16700C`; el Excel también dejó esa referencia a cero. La web sí la incluye porque el toldo lleva físicamente UNIVERS 280 de stock 700.
- `AR2603380` es Galicia, no Arzúa: 596 x 300, 3 brazos, máquina exterior, EVO 80, blanco y `18 ml` de tela.

Para `AR2603315`, OF `0230126`, la simulación exacta es: soporte 1, tubo de enrollamiento 2, UNIVERS 280 1, tapones 1, brazos 3, casquillo de máquina 1, `CASPLAS` 1 y tela `17,7 ml`.

## Medidas de regresión

| OF | Enrolle | Carga | Tela | Caída | Paño |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0230134 | 418,5 | 418,5 | 417 | 420 | 16,8 |
| 0230126 | 586,5 | 586,5 | 585 | 295 | 17,7 |
| 0230045 | 640 | 640 | 639 | 295 | 17,7 |
| 0230410 | 639,5 | 638,5 | 637 | 365 | 21,9 |

La regresión automatizada cubre además motor 70/17, mando, anclaje, EVO 80, 2/3 brazos, varias unidades y stock configurable.
