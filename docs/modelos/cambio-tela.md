# Cambio de tela — expediente

01/10/2026 · **Terminado** · [Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Auditoría](../auditoria-2026-09-21.md)

## 1. Alcance y punto de reanudación

- Código `CAMBIO TELA`, trabajo de tela (`FABRIC_ONLY`) sobre un toldo de fachada existente. Es el trabajo de tela más frecuente: 436 de 575 en 2026 y 481 en 2025.
- Alcance: caída y frente de la tela, bamba de la misma tela o de otra, reserva de lona, excepciones por pedido y planteamiento de telas.
- Rama: `main`. Último commit del modelo: el de este expediente.
- Siguiente acción: ninguna. Muestra del PDF revisada por Iván y dudas respondidas.

## 2. Reglas

| ID | Regla | Fuente | Implementación |
| --- | --- | --- | --- |
| R01 | Frente de tela = frente medido, sin descuento | Hoja `CAM. TELA` del maestro | `fabricOnlyRules.js` |
| R02 | Caída del cuerpo = salida + «Sumar para enrolle y tubo (cm)», 55 cm por defecto, editable por toldo sin candado; vacío, negativo o no numérico no permite calcular | Taller, nota de Iván aplicada el 01/10/2026 (Q-C08): 40 para el enrolle más entrada de tubo | `fabricOnlyRules.js`, `fabricJobParameters.js`, `AwningColumn.tsx` |
| R03 | Con bamba de la misma tela, + alto de bamba + 5 (remate) | Maestro; **Iván, 14/09/2026: el +5 es el remate de la bamba y solo va si hay bamba** | Ídem (`c4488e4`) |
| R04 | Con bamba en otra tela, el cuerpo sigue en salida + lo indicado para enrolle y tubo; la bamba se calcula y reserva aparte: alto + 5 | Maestro; mismo criterio que Arzúa (AR2601535-1); Q-C08 para el margen del cuerpo | Ídem |
| R05 | Reserva de lona: `ESTR.01!Q28`, costuras de 2,2 cm y 7 cm de margen; el planteamiento visible usa 2,5 y 6,5 | Maestro | `legacyRpsFabricMath.js` |
| R06 | El margen puntual se indica ahora en el campo de enrolle y tubo. Los borradores con un antiguo «Margen de caída» técnico conservan ese valor al recuperarse | Libros de 2025 y 2026; Q-C08 | Tests en `cambioTelaRules.test.js` y `cambioTelaExtra.test.ts` |
| R07 | La bamba acrílica en otra tela se reserva siempre. La de PVC no se reserva por ahora: al generar los archivos, la web pregunta por las telas no acrílicas (también la de la bamba) y el técnico elige "No incluir" | **Iván, 22/09/2026** | `reservationFabrics.js`; test Q-C06 en `reservationFabrics.test.js` |

## 3. Estado por área

| Área | Estado | Evidencia |
| --- | --- | --- |
| Medidas | Verificado | 2026: 1308 comprobaciones sobre 436 trabajos; 2025: 1443 sobre 481. Todas las diferencias explicadas (§4) |
| Reserva de lona | Verificado | La web reserva lo que calcula el propio libro en todas las OF de 2026; las diferencias con RPS son errores históricos del Excel o de la subida (§5) |
| Referencias | No aplica | Solo reserva lona, del catálogo de telas |
| Formulario | Verificado | Regla única de toldo completo; campo de enrolle y tubo por toldo (Q-C08), también en lectura y ficha/PDF de revisión |
| Dibujo y PDF | Verificado por Iván (22/09) | Muestra en `output/modelos/cambio-tela/ct-pdf-1..3.png` (sin bamba, bamba de la misma tela, bamba en otra tela) |
| Revisión con OT | Hecha | Q-C02, Q-C06 y Q-C07 resueltas por Iván el 22/09 |

## 4. Medidas: diferencias con los libros

### Cambio del 01/10/2026 (Q-C08)

Antes se sumaban 40 cm; ahora el valor por defecto es 55 cm en total para enrolle y entrada de tubo, no 55 adicionales al margen antiguo. La caída crece 15 cm y el consumo aumenta `0,15 × paños × pasadas` ml; con tres paños y una unidad pasa de 8,70 a 9,15 ml para una salida de 250 cm sin bamba. La reserva usa la misma caída con sus propios paños. La bamba en otra tela no cambia. Si varias piezas caben juntas en el rollo se cuentan las pasadas que necesitan.

Se puede indicar 40 cm para reproducir un pedido anterior, o cualquier valor no negativo. Los casos históricos de las pruebas indican su margen expresamente. Las comprobaciones de 2025 y 2026 descritas debajo corresponden a la regla antigua, no verifican el nuevo valor de 55. El PDF de telas sigue mostrando la medida final de corte y sus metros; la ficha de revisión y su PDF muestran además cuánto se suma.

Validador `pnpm validate:fabric-jobs` (`RPS_VALIDATION_YEAR=2025|2026`), 22/09/2026.

| Caso | 2026 | 2025 | Explicación |
| --- | --- | --- | --- |
| Caída −5 cm sin bamba | 43 | 53 | El libro suma el remate de 5 cm aunque no haya bamba. El `+5` se fue añadiendo al maestro columna a columna y cada pedido congeló el estado del día (ver F-C01). Regla R03 |
| +15 escrito a mano | 4 | 3 | AR2600490, AR2600553, AR2602326, AR2603391; AR2502366 (`+15+15`), AR2502455-1 y AR2502455-2 (estos dos son Cambio Antica: desde el 23/09 el validador los cuenta allí, ver [cambio-antica.md](./cambio-antica.md)). **Q-C02** |
| Otros ajustes a mano | 3 | 3 | AR2603013 (`−36`, dos toldos), AR2601988 (`+157` con salida 20); AR2502113-1 (`+50` en vez de `+40`, dos toldos), AR2503323 (`+29`) |
| Metros de tela | 50 y 2 | — | 50 son consecuencia de las caídas anteriores. AR2600131: la celda usa ancho 120 con una tela de 153 (RPS recibió 17,6, lo mismo que la web). AR2603078: 15 escrito a mano |

No queda ninguna diferencia sin explicar.

### De dónde sale el +5 (F-C01)

La cadena del alto es `ESTR.0n!Q27` → `TELA!N15` → `CAM. TELA` fila 5, una columna por toldo. En AR2600109:

~~~
B5 (toldo 01) = IF('DATOS '!C12=0, 'DATOS '!C25+40+'DATOS '!C26,    'DATOS '!C25+40)
C5 (toldo 02) = IF('DATOS '!C12=0, 'DATOS '!G25+40+'DATOS '!G26+5,  'DATOS '!G25+40)
~~~

El `+5` falta en unas columnas y está en otras según el libro, y donde está se suma fuera del alto de bamba, así que también se aplica con bamba 0. El Excel se contradice consigo mismo; vale el criterio de Iván.

## 5. Reserva: diferencias con el libro y con RPS (2026)

La web coincide con lo que calcula cada libro en su hoja de estructura (`Q28`) en todas las OF. Lo que no coincide es lo que el libro exportó o lo que llegó a RPS:

| Grupo | OF | Qué pasó |
| --- | --- | --- |
| Bamba en otra tela sin reservar | 11: 0224622, 0224854, 0225709, 0225885, 0227211, 0228162, 0228643, 0229087, 0229273, 0229891, 0231722 | El libro solo exporta la tela del cuerpo; la de la bamba no se reservaba. En algunas aparece después añadida a mano en RPS. Solo AR2600936 lleva bamba de PVC (`DATOS!C12` = "PVC NEGRO"); las demás son acrílicas (o "COMO TELA" / "GRANATE - AZUL"). **Q-C06: en las acrílicas era un error del libro**; la web las reserva (R07) |
| Exportación rota | 0226126 (7,4 de 18,5), 0228186 (15,4 de 30,8) | La tabla de exportación del libro lleva menos de lo que calcula el propio libro. RPS se quedó corto |
| Subida incompleta | 0227787 | Dos libros para la misma OF; solo llegó el primero a RPS (51,8 de 62,9 ml) |
| Redondeo | 0230245 | 61,05 frente a 61,1 |

Cambios en la herramienta hechos para medir esto (22/09/2026): el validador comparaba `Q28` (reserva) con la lona del planteamiento de la web y se quedaba solo con la última línea cuando una OF tenía varias (`194084c`). Además, un toldo incompleto mostraba la lona del planteamiento en vez de la reserva real (`b8a3dc3`).

## 6. Pruebas

- `cambioTelaExtra.test.ts`: 55 por defecto, 0 y valores cambiados, consumo y reserva, bamba integrada/separada, rechazo de valores vacíos, negativos y no finitos, persistencia y migración del margen antiguo.
- `reviewPdf.test.js`: suma para enrolle y tubo en el PDF de revisión, con coma decimal.
- Comprobación del 01/10/2026: 2531 tests, TypeScript, lint y compilación del cliente correctos. Auditoría con Playwright en la aislada 4312: valor por defecto, cambio, rechazo de vacío/negativo y capturas en claro/oscuro a 1280×720 y 1600×1000, revisadas en `tmp/ui-audit/codex-cambio-tela/`.
- `pnpm validate:fabric-jobs` ejecutado en solo lectura el 01/10: 1024 libros, 629 trabajos, 449 de Cambio de tela. Termina correctamente y registra 890 diferencias dimensionales de Cambio de tela respecto a los libros; esta comparación histórica usa el nuevo margen de 55 frente al antiguo de 40 y sus ajustes. No constituye una prueba de paridad del nuevo valor por defecto.

- `cambioTelaRules.test.js`: pedidos reales AR2603017, AR2603051-1, AR2600676, AR2601479; cuatro sin bamba (AR2600109, AR2601149, AR2601844, AR2601854); excepciones AR2602326 y AR2603013.
- `awningCompleteness.test.js`: AR2602115, frente 584, reserva 5 paños completo o incompleto.
- `fabricOnlyRules.test.js`, `differentValanceFabric.contract.test.js` y `legacyRpsReservation.test.js`: bamba en otra tela, contrato de telas distintas y límite del rollo.

## 7. Dudas para OT

| ID | Pregunta | Impacto |
| --- | --- | --- |
| Q-C02 | **Resuelta por Iván el 22/09/2026.** Los +15 cm de siete libros eran ajustes de un pedido concreto, no una regla. Desde Q-C08 se indica directamente la suma para enrolle y tubo en la tarjeta | El margen antiguo del borrador se conserva |
| Q-C08 | **Hecha el 01/10/2026.** El taller pide 40 cm para enrolle más la entrada de tubo: 55 cm en total por defecto, modificables en el formulario | R02 y R06; no hace falta activar el candado |
| Q-C06 | **Resuelta por Iván el 22/09/2026.** La bamba de PVC no se reserva por ahora; si es acrílica, no reservarla es un error. De las once OF, solo una es de PVC: las otras diez quedaron infrarreservadas | La web ya lo hace: reserva la acrílica y, con PVC, pregunta al generar (R07) |
| Q-C07 | **Resuelta por Iván el 22/09/2026.** "SALIDA" (largo de corte) y "PAÑO TOTAL NECESARIO" (total del pedido en cada toldo) se quedan como están: el taller está acostumbrado. Con dos telas (bamba en otra tela), el total se da ya sumado ("8,9 ML", no "8,0 + 0,9 ML"), a petición de Iván tras ver la muestra | `planteamientoPdf.js` |

Retirado el 25/09/2026 (Iván: no se tratan pedidos antiguos): avisar a OT de las infrarreservas históricas de §5 (bamba acrílica sin reservar en diez OF, exportación rota y subida incompleta), igual que con Bambalina (Q-B06 y Q-B08). No se corrigen pedidos ya fabricados.

## 8. Cierre

- Cerrado para su alcance: medidas, reserva y formulario verificados contra 917 trabajos reales de 2025 y 2026, sin diferencias sin explicar.
- Terminado: Iván revisó la muestra del PDF el 22/09 (solo pidió el total ya sumado) y las dudas están resueltas.
