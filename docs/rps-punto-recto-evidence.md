# Evidencia RPS: Punto Recto

## Fuentes

- `Y:\PROGRAMAS CALCULO\TOLDOS TESTAR 10-4.xlsm`, hoja oculta `PUNTO RECTO`.
- Pedidos `PUNREC` de RPSNext desde 2024 hasta julio de 2026.
- Planteamientos reales de `Y:\2026\TOLDOS` y `Y:\2024\TOLDOS 2024`.

## Reglas confirmadas

- Hasta 400 cm: tubo de enrollamiento P701 y mínimo 2 brazos.
- Por encima de 400 cm: tubo de enrollamiento P801 y mínimo 3 brazos.
- Se admiten 2, 3 o 4 brazos; motor automático 15/17, 35/17 o 50/17 respectivamente. Un brazo queda disponible solo como excepción técnica.
- Descuentos de máquina: tela 12 cm, enrollamiento 11 cm y Univers 270 11 cm.
- Descuentos de motor: tela 11 cm, enrollamiento 10 cm y Univers 270 10 cm.
- Caída base: `salida × √2 + 60 + bambalina`.
- RPS confirma 2,5 cm entre paños y 6,5 cm de margen base cuando el ancho queda cerca del límite del rollo.
- El Excel permite modificaciones manuales de esa caída. La web las conserva como excepción técnica por toldo.

## Despiece base

- Soporte universal de tres agujeros `SOPUNI3AGU{lacado}`.
- P701 `TURA70HG{stock}C` o P801 `TURA80HG{stock}C`.
- Casquillo punta `CASPUNCE`.
- Tubo de carga `PUNI270{lacado}{stock}C`.
- Brazos `BPRT07{lacado}{salida}C`.
- Máquina: casquillo Ø70/Ø78 y máquina ZNP; la manivela figura en estructura sin referencia RPS.
- Motor: rueda y corona Ø70/Ø78, Sunilus según brazos, soporte Hipro, mando y sensor cuando corresponda.

## Casos representativos

- `AR2601952`: dos toldos de máquina, 100 cm de salida y reserva agrupada por OF.
- `AR2601354`: dos toldos motorizados con P701/P801 en la misma OF.
- `AR2401159`: 600 cm, 3 brazos, P801 y motor 35/17.
- `AR2402213`: excepción histórica de 800 cm y 4 brazos.
- `AR2601071`, `AR2602249`, `AR2603326`: caída de paño modificada manualmente.

Los mandos ausentes por errores de búsqueda heredados del Excel no se toman como regla: la web reserva el mando coherente con el sensor, igual que el resto de modelos motorizados.
`AR2601354` tampoco se usa para validar accesorios: el Excel aplicó rueda y corona Ø78 a los dos toldos aunque uno lleva P701. La web calcula cada estructura por separado.
