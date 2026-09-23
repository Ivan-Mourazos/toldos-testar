# Iris — expediente

23/09/2026 · **Reserva parcial: solo las piezas que no dependen del cofre ni de la guía** · [Seguimiento](./README.md) · [Dudas](./dudas-abiertas.md) · [Evidencia](../rps-iris-evidence.md) · [Informe de consumo (Codex)](./informe-iris-hera-consumo.md)

## 1. Alcance

- Artículos de RPS: `IRIS110C/CO`, `IRIS110C/COS/GU`, `IRIS110S/CO`, `IRIS130C/CO`, `IRIS130C/COS/GU`, `IRIS130S/CO`, `IRIS150C/COCG`, `IRIS150C/COSG`. 75 OF con consumo desde 2024.
- Medidas: las del maestro `IRIS.xlsx` ([evidencia](../rps-iris-evidence.md)); no cambian.
- Hasta hoy solo reservaba lona y cristal.

## 2. Qué reserva ahora (23/09/2026)

Consumo por artículo y por dispositivo (`tmp/iris/comunes.mjs`). Código en `irisPieces.js`.

| Pieza | 110 | 130 | 150 | Consumo real |
| --- | --- | --- | --- | --- |
| Casquillo de punta con hueco Ø14 | `CASNMOSZ70MM` | `CASNMOSZ78MM` (Ø80) | — | 1 por toldo en todas las OF con él |
| Placa del eje extraíble | `CASPLACASZ` | `CASPLACASZ` | `CASPLACASZ` | 1 por toldo |
| Tubo de enrolle | P701 de 500 o 700 | P801 de 400, 500, 700 u 800 | Ø110 de 500, 600 u 800 | Solo los largos que se gastan (el P701 de 600 existe y no se usa) |
| Pletina terminal 25×10 de 300 (lastre) | Sí | Sí | Sí | 1 barra por toldo; 2 por encima de 300 |
| Tapones terminales | 2 | 2 | 2 | Blanco o negro |
| Goma de retención | 700 | 700 | 800 | Blanca o negra |
| Con máquina | Casquillo eje cuadrado Ø70, MB-11, manivela | Ídem Ø80 | — | 1 por toldo |
| Con motor | Casquillo de motor Ø70, rueda Hi68, soporte Hipro | Casquillo Ø80, rueda P-801 mecanizada, Hipro | Rueda P-801 mecanizada, Hipro | 1 por toldo |

- Blanco o negro por el mismo criterio que la manivela (columna de la tabla de lacados), como los tapones de plástico del resto de modelos.
- **No se reservan**, y la tarjeta avisa para añadirlos a mano:
  - los perfiles del cofre y sus tapas (dependen de si es redondo o cuadrado);
  - las guías, sus pies y la cremallera (dependen de GPZ C, ÚNICA o STORM);
  - el motor y el mando.
- Después, `validate:reserva IRIS` solo echa en falta esas piezas, la varilla vaina y el macarrón (Q-I04). Referencias rotas: 0 de 27.

## 3. Dudas

| ID | Pregunta | Qué hace la web |
| --- | --- | --- |
| Q-I01 | Cofre redondo o cuadrado: cambia perfiles (`PECORSU`/`PECOCSU`) y tapas (`TAPASSUN`/`TAPASCOU`). La tarjeta no lo pide: ¿se añade? | No los reserva |
| Q-I02 | Sistema de guía: RPS distingue GPZ C, ÚNICA y STORM; la tarjeta, estándar, pequeña y compensadora (tabla del fabricante). ¿Cómo se corresponden? El STORM se vende como `IRIS110C/CO` | No reserva guías, pies ni cremallera |
| Q-I03 | Los artículos "sin guía" (`C/COS/GU`) consumen guías, pies y cremallera (informe, pregunta 1) | — |
| Q-I04 | Varilla vaina y macarrón: en el 150 miden el ancho de la tela; en el 110 y 130 la varilla suele ser mayor (hasta 8 m por toldo) | No los reserva |
| Q-I05 | Motor: Sunea IO 10/17, Sunilus IO 10, 15, 20 o 35/17, Meteor CSI. ¿Cuál y se pide en la tarjeta? | No lo reserva; avisa |
