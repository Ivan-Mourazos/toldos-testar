# Perla Box: evidencia de reglas

## Nombres

- Nombre actual: `Perla Box`.
- Alias de entrada: `Perlabox`, `Storbox S-300`, `Storbox S300`.
- Artículo comercial en RPS: `PERLABOX`, descrito como `TOLDO COFRE STORBOX S-300 DE LLAZA`.
- Fuente de reglas: `Y:\PROGRAMAS CALCULO\MODELOS CONCRETOS\STORBOX S-300\4UDS.xlsm`, hoja `S300`.
- Los planteamientos históricos imprimen por error `STORBOX 400` en la cabecera. En RPS son `PERLABOX`; la web usa el nombre actual correcto.

## Matriz S-300

- Frente máximo estándar: 600 cm.
- Descuento kit de perfiles: 15,7 cm.
- Descuento tubo de enrollamiento: motor 13,5 cm; máquina 13,1 cm.
- Descuento de frente de tela: 19,2 cm.
- Descuento protector de lona: 15,7 cm.
- Caída de tela: salida + 45 cm + alto de bamba.
- Paños: redondeo superior de `(frente tela + 6) / ancho rollo`.
- Stock estándar: 600 cm.

## Salidas y motor

| Salida | Frente mínimo | SUNEA |
| ---: | ---: | ---: |
| 150 | 190 | 30/17 |
| 175 | 215 | 30/17 |
| 200 | 240 | 35/17 |
| 225 | 265 | 35/17 |
| 250 | 290 | 40/17 |
| 275 | 315 | 40/17 |
| 300 | 340 | 50/17 |

## Despiece y reserva RPS

- Soporte `SOSTORBS300{lacado}`, perfil `PRBOXS300{lacado}{stock}C` y tapas `TAPBS300{lacado}` se muestran en el despiece, pero no se suben como líneas separadas a RPS.
- Tubo de enrollamiento: `TURA80HG{stock}C`, dos unidades por toldo.
- Motor: dos ruedas `RUEDAMOT78` por toldo, además de corona, soporte, mando, motor y sensor cuando corresponda.

Los descuentos, líneas mínimas y potencias son editables desde la pestaña Parámetros.

## Contraste de producción 2026

- 80 pedidos Perla Box localizados en RPS.
- 77 Excel de pedido y 85 estructuras completas revisadas.
- 54 estructuras con motor y 31 con máquina.
- 340 comprobaciones dimensionales sin diferencias: tela, tubo, perfiles y protector.
- Salidas reales encontradas: 150, 175, 200, 225, 250, 275 y 300 cm.
- El dibujo de tela del Excel S-300 es el esquema `GENERAL`; se conserva con el diseño moderno del PDF.

Cada toldo permite desbloquear una excepción individual para modificar frente mínimo, descuentos dimensionales y potencia del motor sin alterar la configuración general.
