# Evidencia ARZUA en RPSNext

Revisión: 2026-07-17.

## Fuentes

- Reserva importada: `_MaterialesPrevistosOF`, enlazada con `CPRManufacturingOrder`.
- Pedido y medidas: `FACOrderSL` + `FACOrderLineSL`.
- Planteamientos PDF: `GENEntityDocument`, con `EntityType = 'OrderSL'` y `EntityID = FACOrderSL.IDOrder`.
- Ruta habitual: `\\192.168.0.128\RPS\VENTAS\PLANTEAMIENTOS\2026\AR.26.xxxxx-n.pdf`.

El planteamiento y la reserva no son la misma lista. El PDF contiene piezas de fabricación sin referencia reservable o que no aparecen en `_MaterialesPrevistosOF`; por ejemplo, casquillo punta, máquina y tornillos. La app debe mantener separados `despiece` y `materials`.

## Casos contrastados

| Pedido | OF | Modelo del planteamiento | Configuración comprobada |
| --- | --- | --- | --- |
| AR.26.03332 | 0230194 | ARZUA PRO | 337x225, motor 55/17, EVO 80, soporte AROND, juego de brazos ONYX |
| AR.26.03413 | 0230341 | ARZUA PRO | 500x225, máquina exterior, UNIVERS 280, negro |
| AR.26.03466 | 0230415 | ARZUA PRO | 330x275, máquina exterior, EVO 80; enrollamiento 318,6 y carga 319,6 |
| AR.26.03298 | 0230134 | GALICIA | 430x350, máquina exterior, UNIVERS 280, 2 brazos; observación: ARZUA con soporte Galicia |
| AR.26.03289 | 0230045 | GALICIA | 650x225, motor 70/17, UNIVERS 280, 3 brazos |
| AR.26.03420 | 0230410 | GALICIA | 650x300, máquina exterior, EVO 80, 3 brazos |

## Decisiones aplicadas

- ARZUA muestra 2 brazos como configuración estándar.
- Si se solicitan 3 brazos desde ARZUA, la interfaz propone cambiar el modelo a GALICIA y conserva OF, unidades y medidas.
- GALICIA mantiene sus opciones de 2, 3 y 4 brazos; cambiar a GALICIA no significa siempre 3 brazos.
- Destino particular propone EVO 80.
- Destino hostelería o empresa propone UNIVERS 280.
- Motor ARZUA propone 55/17 por debajo del umbral y 70/17 desde el umbral configurable.
- Las longitudes de tubo de enrollamiento y tubo de carga se calculan por separado.

## Caso de aceptación AR2603332

La validación de extremo a extremo usa el pedido `AR2603332`, OF `0230194`, cliente LECHE CELTA: Arzúa Pro 337x225, una unidad, bamba de 30 cm, motor, EVO 80, colocación frontal, lacado blanco y tela `ACRILI2018P120`.

- Tela calculada: 326x300 cm, 3 paños, 9 ml.
- Reserva: 10 líneas agrupadas por OF, con cabeceras exactas `OF`, `ARTICULO`, `CANTIDAD` en `.xls` antiguo.
- Despiece: numeración del Excel anterior, incluidas piezas sin referencia reservable.
- PDF: una estructura A5 horizontal y una hoja de telas A4 horizontal en un único documento.
- Modo de pruebas: descarga local; no escribe en las carpetas compartidas.
- Flujo PC comprobado en Chromium: vista previa, descarga RPS y limpieza total del formulario sin errores de consola.
