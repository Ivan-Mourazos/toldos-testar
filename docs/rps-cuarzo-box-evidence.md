# Evidencia Cuarzo Box / STORBOX 250

## Fuentes

- RPSNext: pedidos `CUARZOBOX` de 2026.
- Planteamientos reales de `Y:\2026\TOLDOS`.
- Hoja oculta `ST250` de `TOLDOS TESTAR 10-4.xlsm`.
- Salida final agrupada de la hoja `RPS` de cada planteamiento.

## Reglas confirmadas

- Nombre actual: `CUARZO BOX`; nombre del Excel: `STORBOX 250`.
- Salidas: 125, 150, 175, 200, 225 y 250 cm.
- Frente mínimo: salida + 34 cm.
- Frente máximo estándar: 450 cm.
- Caída de tela: salida + 45 cm + alto de bamba.
- Margen base para el cálculo de paños: 6 cm.
- Potencia de motor del Excel: SUNEA 35/17 IO.

### Descuentos dimensionales

| Pieza | Máquina | Motor |
| --- | ---: | ---: |
| Frente de tela | 18,5 | 20,2 |
| Tubo de enrollamiento P701 | 17,5 | 19,2 |
| Kit de perfiles | 15,6 | 15,6 |
| Barra de carga | 16,6 | 16,6 |

## Referencias RPS confirmadas

- `TURA70HG600C`: tubo de enrollamiento P701.
- `CASPUNCE`: casquillo punta.
- `PSBOX250{lacado}450C`: kit de perfiles.
- `BART25{lacado}{salida}C`: juego de brazos ART250.
- Máquina: manivela, máquina ZNP y `CASPLAS`.
- Motor: `SOPORTEUNVHIPRO`, `CORONA LT5070` y mando IO.
- Las piezas sin referencia o con cantidad cero del Excel se muestran en el despiece, pero no se exportan a RPS.

## Resultado del contraste

- 8 pedidos Cuarzo localizados en RPSNext.
- 7 planteamientos completos encontrados en la carpeta de 2026.
- 28 comprobaciones dimensionales sin diferencias.
- 6 reservas finales comparables sin diferencias en estructura ni accesorios.
- Un Excel conserva una hoja RPS antigua de otra OF; se valida en medidas, pero se excluye del contraste de reserva.
- `AR2601205` pertenece a una versión anterior que sumaba 40 cm de caída en vez de los 45 cm del Excel vigente; se conserva como evidencia histórica, no como regla actual.

La tabla final de la hoja RPS es la referencia para cantidades. Las filas históricas de `_MaterialesPrevistosOF` pueden repetirse si una OF fue cargada más de una vez.
