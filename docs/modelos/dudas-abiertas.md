# Dudas abiertas

Preguntas para Iván (Oficina Técnica) y el taller. Aquí solo están las que hacen falta para que la web funcione y los pedidos salgan bien: qué pieza lleva cada toldo, cuántas y de qué medida. Cada pregunta dice qué hace la web mientras tanto y por qué importa. El código del final (Q-…) enlaza con el expediente del modelo.

Actualizado el 30/09/2026: **el taller contestó 16 dudas** (Q-G01, Q-G02, Q-G03, Q-M03, Q-AG01, Q-AG02, Q-CO04, Q-CO05, Q-E02, Q-E03, Q-D01, Q-PR01, Q-PR02, Q-PR03, Q-PR04 y Q-A06). Iván cerró además Q-T01 (la consignación va aparte). Q-CO05 y Q-E02 se cierran: no hay medida, el taller decide y lo normal es el Ø78. Queda a medias Q-CO04 (qué Maestria va según el tamaño). Q-E01 se cierra según lo que se gasta. **Hecho en la web el 30/09/2026:** Q-G02, Q-G03, Q-AG01, Q-AG02, Q-E03, Q-D01, Q-PR01, Q-PR02, Q-PR04 y Q-A06. Ya no queda ninguna pregunta abierta de «Todos los modelos». Están en [Contestadas el 30/09/2026](#contestadas-el-30092026), con lo que cambia en la web.

Actualizado el 25/09/2026:

- **Iris y HERA ya no tienen dudas.** El taller las contestó el 24/09. Lo que la web hace de forma provisional está en [iris.md](./iris.md) y [hera.md](./hera.md).
- **Fuera lo que miraba el pasado.** Salen las preguntas sobre pedidos antiguos que pudieron salir mal y las que solo tocaban el Excel. La referencia ahora es la web.
- **Iván contestó 11 dudas el 25/09** y aclaró parte de otras tres (Q-G03, Q-M03 y Q-A02). Las contestadas están al final, en [Contestadas](#contestadas-el-25092026), con lo que cambia en la web. Las que siguen aquí son para el taller.

Cómo se decide cada respuesta: primero, el manual del fabricante (el de Oficina Técnica o, si no está, el de la web del fabricante); después, el maestro de RPS (qué piezas existen y cuáles están de baja); y por último, lo que de verdad se gasta en las OF. En el expediente de cada modelo se anota en qué se apoya cada decisión.

## SYSTEM DOCK · lonas perimetrales (23/10/2026)

Estudio de 44 pedidos de lonas; ocho pedidos escaneados y sus planteamientos y DWG revisados. Todavía no hay modelo implementado. Evidencia y discrepancias en [system-dock.md](./system-dock.md).

| Código | Pregunta | Situación mientras no se conteste |
| --- | --- | --- |
| Q-SD01 | Los pedidos anotan PVC/LAC 640 negro y los planos dicen G650 negro. ¿Qué lona y qué ancho de rollo debe proponer la web para SYSTEM DOCK? ¿Se elige por pedido o hay una referencia fija? | Contestada (Iván, 23/10/2026): **lona PVC 650 g negra (G650 negro), rollo de 250**. Siempre la misma; no recuerda otra. |
| Q-SD02 | En los ocho planos el corte suma 1 cm al largo y 6,6 cm al ancho. ¿Es la regla que debemos mantener para la lona perimetral, también en ancho 85? ¿Ese añadido se reparte en 0,5 por extremo y 3,3 por cada lado con varilla negra de 4,5, dejando los extremos «AL CORTE»? | Contestada (Iván, 23/10/2026): **la misma regla para todas**, solo cambian el largo y el alto: +1 de largo (0,5 por extremo) y +6,6 de ancho (3,3 por cada lado con varilla), también en 85. |
| Q-SD03 | En el trazado de oficina no aparecen marcas de rotulador y faltan algunos bordes exteriores. Para el bot, ¿qué rayas de doblado/soldadura y qué textos quieres en cada lona: OF, medida, REVÉS u otra identificación? ¿El borde que falta se toma del orillo o hay que cortarlo? | Contestada (Iván, 23/10/2026): **sin rotulador**. Solo la lona terminada (la capa rosa) y DISCO1, que es el corte. Textos: las varillas («VARILLA NEGRA 4,5 mm» arriba y abajo), «AL CORTE» en los extremos, la medida («1040 CM X 55 CM»), las unidades («x3») y la OF. Ejemplo de planteamiento: AR.26.04615. |

## Cortina PVC · corte y plano (22/10/2026)

Iván contestó el 22/10/2026 las siete dudas del estudio ([cortina-pvc-corte.md](./cortina-pvc-corte.md#10-dudas-para-iván-contestadas-el-22102026)) y dejó tres ejemplos base. Quedan tres cosas en las que sus ejemplos no cuadran con la regla:

| Código | Pregunta | Qué hará la web mientras tanto |
| --- | --- | --- |
| Q-CP01 | Bamba: la regla es alto + 3,5 + 3 con marca a 7 (26,5 para 20), pero los ejemplos dibujan 26 (varilla), 28 (E.T.) y 25 con B.N(2). Iván, 22/10/2026: «depende de cómo vaya unida la bamba con el toldo, si va varilla o E.T.; por eso el paño de la bamba cambia» | **Contestada.** Arriba según la unión con el cuerpo: varilla blanca +3, E.T. +5; abajo, lo de su bastilla: B.N(3) +3, B.N(2) +2; a los lados, su B.N. Como en los ejemplos base: 26 con varilla y 28 con E.T. para 20 |
| Q-CP02 | La raya «EMPATE EN HORIZONTAL» a 34 cm bajo el terminado de arriba, en los tres ejemplos: ¿es fija o depende del ancho del rollo? Iván, 22/10/2026: «no va siempre a esa medida, va a 2,50 desde abajo, que es el tamaño del paño» | **Contestada.** El paño de abajo es del ancho del rollo (250): la raya del empate va a 250 del corte de abajo y el paño de arriba lleva el resto más el solape. En los ejemplos estaba solo indicada |
| Q-CP03 | E.T. Ø40: el rotulador va a 9 por encima del terminado (21 del corte), pero la nota dice «marcar 17 cm por el derecho» y hay otra raya a 17. ¿Cuál va en el DXF de la máquina? Iván, 22/10/2026: «la de 21; la de 17 es otra referencia para que por el otro lado de la lona sepan dónde soldar» | **Contestada.** En el DXF, rotulador a 21 del corte (9 sobre el terminado). En el plano también la raya de 17 en ejes con la nota «MARCAR 17 CM POR EL DERECHO (MEDIDA LONA CORTADA) Y SOLDAR» |

## Puertas · contestadas el 22/10/2026

**Q-PU04 contestada por Iván el 22/10/2026, por la noche:** «sí, los refuerzos son
solo dibujo, no cambia el corte ni nada». Se conservan los símbolos de confección
de AR2605036/4906 (alturas esquemáticas de 13,5 y 11,5), sin crear piezas, medidas
de fabricación ni consumos a partir de ellos. Duda cerrada.

| Código | Respuesta de Iván | Qué hace la web |
| --- | --- | --- |
| Q-PU01 | «No sé por qué se hizo así, es una excepción.» Los 3 cm de AR2605065 son una excepción, no una regla | Conserva el corte de E.T. de 8 y «CERRAR E.T / 2 CM MÁXIMO», sin cambiar ninguna medida por esa nota |
| Q-PU02 | «Viene indicado en el pedido con unas líneas verticales en el medio.» El técnico decide mirando el dibujo; también introduce la distancia de las rayas laterales que marca el pedido | Casilla de espaciador central desmarcada; distancia lateral configurable, 10 cm si falta en un pedido antiguo. Alzado y plano con línea doble y nota vertical; corte con marcas en cada paño, sin pieza nueva de stock |
| Q-PU03 | AMARILLO/NEGRO es el saco negro con diagonales amarillas que se imprimen después de cortarlo; el amarillo entero es otro color de lona | Casilla de impresión para todos los modelos, desmarcada de inicio y validada al leer el pedido; alzado/plano indican AMARILLO/NEGRO y los rótulos del saco avisan al corte. Material, piezas y anidado siguen en negro |

Las posiciones y alturas de los textos de taller proceden de AR2604638, AR2604725, AR2605036,
AR2604904 y AR2605065. Son anotaciones del alzado, no nuevas fórmulas del corte.

## Piezas del despiece que no se reservan

Añadidas el 03/10/2026, al comparar en los 17 modelos lo que sale en el despiece del PDF con lo que la web reserva (`tmp/revision-modelos/despiece-vs-reserva.mjs`, 2.576 casos de ejemplo). Estas piezas salen en el despiece sin referencia y la web no reserva nada por ellas. La pregunta es la misma en todas: **¿se gasta una pieza aparte que haya que reservar, o viene dentro de otra (un kit, un juego) y está bien así?** Mientras tanto la web sigue como está: las enseña en el despiece y no las reserva.

| Código | Modelo | Pieza del despiece | Por qué importa |
| --- | --- | --- | --- |
| Q-DP01 | Cuarzo Box | Barra de carga Storbox 250 | Si no viene con el cofre, falta en la reserva |
| Q-DP02 | Ámbar, Perla y Coral Box | Juego de terminales | En el Arzúa y el Xacobeo los terminales sí se reservan |
| Q-DP03 | Electra | Cadenillas inox, puentes abatibles y regleta Zamack | En la Cortina el puente y la regleta sí llevan referencia |
| Q-DP04 | Cortina | Cadenillas inox | Sale siempre con «—» en la referencia |
| Q-DP05 | Xacobeo | Rueda motriz LT50, con la referencia `ADAPTADORESTUBO70` | Tiene referencia en el despiece pero no se reserva |
| Q-DP06 | Arzúa, Galicia, Xacobeo, Punto Recto, cofres y Antica | Kit de tornillos de máquina y taco de nylon | Tornillería menuda: seguramente no se reserva a propósito, falta confirmarlo |
| Q-DP07 | Iris | Tubo de carga (el perfil terminal de abajo) y el terminal compensador SWBS | Se cortan a medida y salen en el despiece, pero no hay ninguna referencia reservada para ellos: solo la pletina del lastre, los tapones y la goma |

Lo que sí se arregla sin preguntar (03/10/2026): el despiece del Iris y el del HERA salen de las piezas que ya se reservan; el Xacobeo pone en el despiece las referencias de tapones y terminales que ya reserva; y el Ágata Box añade al despiece los dos kits de patines.

## Iris (07 y 08/10/2026)

Del pedido AR2604748: el primer Iris con motor solar (Somfy RS100 Solar IO 15/12, el que pidió compras) y la escuadra del hueco.

| Código | Pregunta | Qué hace la web mientras tanto |
| --- | --- | --- |
| Q-I09 | ¿Qué adaptación lleva el motor solar RS100 en el tubo de 70 del Iris? El único solar anterior fue un HERA, con el kit Swift de 56 | Reserva la misma que con el Sunilus: casquillo para motor 50 ZIP, rueda motriz y soporte Hipro |
| Q-I10 | ¿Cuánto se admite entre el frente inferior medido y el que dan las salidas y las diagonales? Ninguna guía de Oficina Técnica lo dice en cifras | Más de 2 cm es error («las seis medidas no cuadran»). Se cambia en los parámetros del Iris (`squaringToleranceCm`) |
| Q-I11 | Ventana del Iris: ¿se mide desde suelo o desde tubo de carga, y se descuentan también 18 cm desde suelo? Iván, 22/10/2026: hay que preguntarlo a taller; de inicio igual que la cortina | Se elige suelo o tubo. Desde suelo descuenta 18 cm para dibujar; desde tubo conserva la medida. La ventana va de borde a borde, con alto inicial 140 cm editable. La lona descuenta ese alto y el cristal reserva tantas piezas de 140 cm como hagan falta, con aviso de empate si supera 140 |

## Clásicos

### Antica

Sus preguntas van aparte, en [la lista para el encargado](./antica-preguntas-taller.md): son muchas y el Antica es de fabricación propia.

## Remolques

Añadidas el 30/09/2026, al hacer el dibujo 3D. Cómo es cada cierre está en [cierres-y-acabados.md](../remolques/cierres-y-acabados.md).

Contestadas el 20/10/2026, al revisar los DWG de PAMILAKAN para el corte (Iván: «Pamilakan las lonas altas son
con bastilla de enfundar. Las rayas son las marcas para eso»; «cuando recoge con cremallera, las marcas en el plano
van enteras y en el corte se recortan y queda el inicio inferior y una T arriba»):

| Código | Pregunta | Respuesta | En la web |
| --- | --- | --- | --- |
| Q-R08 | Marcas de la cremallera en la cabeza | En la cabeza que recoge con cremallera, una raya a 5 cm de cada lado, desde 3,5 cm sobre la base hasta 4,5 por debajo de lo que tiene encima: entera en el plano; en el corte, el arranque de abajo y una T arriba | Hecho el 20/10 en el corte y en el plano |
| Q-R07 | Marcas de rotulador de la bastilla de enfundar en la lona alta | Son las marcas de la bastilla. En sus seis cortes a mano: el doblez a 10 cm de cada punta del contorno (en el corte, sus extremos de 3,5 a 6 cm de cada borde; en el plano, la línea entera), la marca del centro a 6–7,5 cm de la punta y sin marcas de hombro | Hecho el 20/10 en el corte y en el plano |

Faltan dos fotos de cerca (una cremallera puesta y una bastilla de enfundar); Iván las subirá.

Contestadas el 30/09 (Iván):

| Código | Pregunta | Respuesta | En la web |
| --- | --- | --- | --- |
| Q-R01 | Ganchos corazón como recogida | Sí, mejor | Hecho el 30/09: recogida «Ganchos corazón» en Parámetros (27 y 27, como la goma, hasta tener las suyas; los Parámetros ya guardados la reciben sola) y en el dibujo 3D, con los ganchos al paso de los ollaos |
| Q-R02 | Ollaos de la oreja en la esquina con goma | Como lo hace ahora | Ya lo hace |
| Q-R03 | Cada cuánto va un puente a lo alto | Da igual, el taller lo hace a su criterio; poner una medida como los ollaos | Hecho el 30/09: en el dibujo 3D los puentes van al paso de los ollaos del elemento (35 cm por defecto), con 10 cm de margen arriba y abajo |
| Q-R05 | Gancho a 0 cm | No pasa | Ya lo hace: no deja poner 0 |
| Q-R04 | Cremallera del 9: ¿qué clientes la piden? (02/10) | Sacado de RPS (`CREINY…` y `CREABI…` gastadas en lonas de remolque): REMOLQUES NUÑEZ (001302, 133 pedidos hasta 2021) y J&B AGROMÁQUINAS (000033, 73 hasta 2019). Desde 2022, solo 3 pedidos sueltos de particulares | Ninguna ficha de cliente la necesita hoy; se elige a mano en el pedido cuando haga falta |
| Q-R06 | AYALA en RPS: 036662, 048286 o los dos (02/10) | Iván dejó en la ficha de AYALA el código que es | Hecho en la ficha del servidor |
| Q-R01 | Medidas de los ganchos corazón: paño y separación (03/10) | Iván: los ganchos los pone el taller a ojo | El paño lleva lo mismo que con la goma (27 y 27, en Parámetros); el elemento dice en sus notas «el taller coloca los ganchos a ojo» |

Las muestras de PDF que tenía que mirar el taller (Cambio de tela, Enrollable, Bambalina y Cambio Antica) se quitan: Iván, 03/10/2026, «olvídate».

## Bambalinas con onda

Añadidas el 28/10/2026 (ver [bambalina.md](./bambalina.md)):

| Código | Pregunta | Ahora la web |
| --- | --- | --- |
| Q-BO01 | Con onda, ¿bastilla o remate abajo? | Contestada el 28/10 (Iván): «bastilla solo la puede llevar la bamba recta, el resto lleva remate. Los remates se cortan aparte, no se incluyen en el corte; puede ser de una tela diferente». La tira con onda es la bamba + 3 (sin la B.N(2) de abajo) |
| Q-BO02 | ¿Cuánto separar la onda del borde de abajo de la tira? En AR2603936 iba a 2,75 del orillo | Contestada el 28/10 (Iván): «sí, deja 1 cm». Ya lo hace |

## Solapas con velcro

Contestada el 28/10/2026 (Iván: «las solapas sí pueden empatarse, así que están bien en el ejemplo»):

| Código | Pregunta | Respuesta | En la web |
| --- | --- | --- | --- |
| Q-SO01 | ¿Se puede empatar una solapa oblicua más larga que el ancho del rollo? | Sí | Ya lo hace: prueba la solapa entera y acostada y partida con 2 cm de empate, y deja la que gasta menos lona. En AR2604205 la D va partida: 3,6 m de corte; entera serían 5,5 m |

## Contestadas el 01/10/2026

| Código | Pregunta | Respuesta | En la web |
| --- | --- | --- | --- |
| Q-C08 | Margen para enrolle y entrada de tubo del Cambio de tela | El taller pide 40 cm en total para el enrolle y la entrada de tubo (corregido el 02/10/2026: el 01/10 se había leído como 55). Hace falta poder variarlo en el formulario | Hecho: «Sumar para enrolle y tubo (cm)», 40 por defecto, editable por toldo sin candado. La caída y la reserva usan ese valor; vacío o negativo bloquea el cálculo con un mensaje. La ficha de revisión y su PDF muestran la suma junto a las medidas |

## Contestadas el 30/09/2026

Respuestas del taller, traídas por Iván. «Pendiente» quiere decir que la web todavía no lo aplica.

| Código | Pregunta | Respuesta | En la web |
| --- | --- | --- | --- |
| Q-G01 | Máquina del Galicia: MB-11 L-120 o Geiger 1.13 L-140 | MB-11, siempre | Ya lo hace (también en el Monoblock 350) |
| Q-G02 | Motor del Galicia: 55/17 o 70/17 | Depende del número de brazos y de la salida, como en la tarifa del Monoblock | Hecho: la tabla de motores del Monoblock 350 por brazos y salida (55/17 con dos brazos, 70/17 con tres); con el candado, otro |
| Q-AG01 | Patines, regleta de unión y pasadores del Ágata Box | Patines siempre, de codo y de horquilla. Kit de unión con más de 7 m de frente | Hecho: dos kits de patines de codo (`PABMODUL`) y dos de horquilla (`PASBMODUL`) por toldo; con más de 7 m, `KUNIONMODUL` y `PASADORMODUL`. De paso, el motor de 100 va a 12 rpm (`SUNILUSIO100//12`): el //17 no existe |
| Q-AG02 | Motor del Ágata Box | Siempre Sunea; la potencia depende del toldo | Hecho el 30/09: motor Sunea en todas las variantes, también en el Open (`SUNEAIO35//17`, `40`, `55`, `70`, `85//17` y `SUNEAIO100//12`, todos activos en RPS), con la misma tabla por brazos y salida. Descripción «MOTOR SOMFY SUNEA … IO» |
| Q-CO06 | Altura del velcro de Cortina con las reglas nuevas de tela | Iván, 02/10/2026: sigue al ajuste elegido | Hecho: en Cortina y Cambio de cortina, salida + 8 menos el descuento de la tarjeta (sin ajuste, salida + 8; con «Descontar 18», salida − 10). Selena y Electra siguen con salida − 18 + 8 |
| Q-T02 | Nombre corto de las lonas técnicas en el PDF | Iván, 02/10/2026: no; la gama es lo que las distingue | Ya lo hace: Soltis, Recscreen, Frontlit, Black out, Mesh… salen con el nombre de RPS. Solo las lonas de PVC de siempre y las acrílicas van con nombre corto |
| Q-CO04 | Motor de la cortina | Maestria; depende también del tamaño. En RPS casi no hay Maestria (2 OF): Iván aprobó el 02/10/2026 la tabla sacada de lo gastado | Hecho: 15/17 por defecto; 35/17 con salida de más de 350, o de más de 300 con PVC y ventana; 55/17 con frente de más de 800. Con el candado se elige cualquiera ([Cortina](./cortina.md#motores-consumidos-en-rps-02102026-para-q-co04)) |
| Q-G03 | Galicia con tres brazos y 3,50 m de salida | Sí se hace | Hecho: sin aviso con tres brazos y 3,50 de salida |
| Q-M03 | Monoblock de 7,10 a 7,25 m: barra de carga | Una barra; si falta poco, se empata con un resto | Ya lo hace: una barra de 7 m |
| Q-CO05 | Tubo de Ø70 en la cortina | Con poca salida y según el stock, a criterio del taller; no hay medida. Lo normal es el de Ø78 | Cerrada: Ø78 |
| Q-E02 | Tubo de Ø70 en la Electra | Como en la cortina | Cerrada: Ø78 |
| Q-E03 | Puente abatible en la Electra con cofre | Lo lleva cuando va con tubo Univers sin guías (en la práctica, casi siempre) | Hecho: la Electra con cofre y sin guía (con cofre la barra es siempre el Univers) reserva dos anillas `ANIACIN`, dos pletinas `PLEACIN` y dos mosquetones |
| Q-E01 | Tapas del perfil de carga de la Electra sin cofre | Según lo que se gasta (Iván) | Cerrada: la web reserva el juego `TAPASLAMAXSC` en negro, que es lo que se gasta en 2026 (RPS) |
| Q-D01 | Kit de montaje del cable de la Diana vertical | Va siempre con cable (taller vía Iván, 08/10/2026); en las OF anteriores no se descontaba | Hecho: `MONTCABLEMAXSC` uno por toldo siempre que lleve cable; fuera la casilla de la tarjeta |
| Q-PR01 | Kit de motor del Punto Recto | Según el tubo, de 70 o de 80. Con tubo de 70 lleva `CORONACENMEC70` y `RUEDAMOTHI68` | Hecho: con tubo de 70, `CORONACENMEC70` y `RUEDAMOTHI68` |
| Q-PR03 | Barra de carga del Punto Recto | Solo la Univers 280 | Ya lo hace |
| Q-PR04 | Punto Recto de 1,60 m de salida | Es una excepción; no hay stock | Hecho: se sigue ofreciendo, con aviso en la tarjeta de que es una excepción sin stock |
| Q-PR02 | Casquillo de máquina: eje 50 o eje 63 | Depende de la máquina: exterior, casquillos largos; interior, cortos | Hecho: el largo es el eje 63 y el corto el eje 50. Donde la tarjeta dice si la máquina es interior o exterior (Arzúa, Galicia, Cortina, Xacobeo y Electra) se elige por ella. En los modelos que solo dicen «máquina», Iván (30/09) dijo que se ponga el eje 50, que es el que más se gasta: Antica y Ágata pasan del eje 63 al 50 del mismo Ø (`CASMAQEJE5070MM` / `CASMAQEJE5078MM`); los demás ya lo llevaban. El Coral no cambia: lleva `CASTRAEX80`, que es otra pieza |
| Q-A06 | Largo de la barra que se reserva | La más corta que llegue al corte | Hecho: tubo y barra de carga, cada uno el más corto que existe en RPS en ese lacado y llega (Arzúa, Galicia y cofres); fuera el largo de 650, que no existe. En el Ágata, barras iguales empalmadas por encima de 7 m |
| Q-A06 (margen) | Barra más corta que llega: ¿con margen de corte? | Sin margen: «ya se adaptan en taller» | Cerrada: la web sigue sin margen (un corte de 400 lleva barra de 400) |
| Q-T01 | Tela en consignación: ¿cuenta como disponible? | Mejor aparte | Cerrada: ya lo hace; bajo la tela elegida el stock de RPS no suma el almacén «CONSIGNACIÓN ARZÚA» y lo enseña aparte («+ 70 m en consignación») |

## Contestadas el 25/09/2026

Respuestas de Iván. «Pendiente» quiere decir que la web todavía no lo aplica.

| Código | Pregunta | Respuesta | En la web |
| --- | --- | --- | --- |
| Q-A01 | Descuentos de lona y barra Univers del Arzúa Pro: manual o taller | Según el manual (AROND-350) | Ya lo hace: 12,4 / 12,2 / 10,8 de lona y 10,4 de barra |
| Q-A03 | Brazos cruzados en el Arzúa Pro | Sí: se están haciendo, y el kit cruzado cita el AROND-350 como soporte válido | Ya lo hace, con el kit cruzado AROND |
| Q-A04 | Lado del brazo y el soporte sueltos con tres brazos (Galicia, Monoblock 350, Ágata Box) | No es de un lado concreto. Tiene que ser un dato opcional del pedido; si no se pone, decide el taller | Hecho: «Lado del brazo suelto» en la tarjeta (Galicia, Monoblock 350 y Ágata con brazos impares). Sin elegir, se reserva el derecho y el despiece dice «lado a elegir en taller» |
| Q-G03 | Galicia con más de 7 m de frente | La barra se empalma | Hecho: hasta 8 m; por encima de 7 m, tubo de enrolle de 800 y barra de carga empalmada en barras iguales. La salida de 3,50 con tres brazos sigue abierta |
| Q-X01 | Lona del Xacobeo con máquina exterior: 12,5 u 11,9 | Como el manual: 11,9 | Hecho, en los tres accionamientos: 11,9 / 11,6 / 9,9. Los valores de antes guardados en el servidor pasan solos a los del manual |
| Q-M01 | Monoblock 350 con tres brazos: manual de 2016 o catálogo actual | El manual más reciente del modelo | Hecho: el más reciente es el catálogo MONOBLOC-350 actual (brazos Onyx). Tres brazos: mínimos 383 … 611 y máximo 8,25 con 3,25 y 3,50. Los valores de 2016 guardados en el servidor se migran solos |
| Q-M02 | Motor del Monoblock 350 con cuatro brazos | Como dice el manual | Ya lo hace: 85/17 con cuatro brazos |
| Q-M04 | Descuento de la barra Univers 280 en el Monoblock 350 | 1 cm menos que la EVO, porque la EVO lleva tapas más grandes | Hecho: barra Univers = descuento EVO − 1 cm |
| Q-SE04 | Selena a motor | En teoría, sí | Hecho: la tarjeta ofrece motor, con el kit de la Cortina (comparte tubo y piezas) y un aviso de que nunca se ha fabricado así |
| Q-CA01 | Qué «salida» se escribe en un Cambio Antica | El pedido trae la medida de la tela vieja tal cual (se abre y se mide). Con un campo sencillo para sumar lo que haga falta | Hecho: caída = medida de la tela + «Sumar a la caída». Con eso sobra también Q-CA02 (40 o 55 con la bamba en otra tela): ya no se suma nada |
| Q-A02 | Lacados poco habituales (bronce, gris texturado, lacado especial…) | A veces se venden; las piezas se mandan a lacar. Reservar la pieza en blanco y que la laquen | Hecho: si la pieza no existe en ese color, se reserva la blanca y la tarjeta avisa de qué piezas van a lacar. De unos 300 códigos inexistentes quedan 4 (barra EVO de 400 del Monoblock, que tampoco existe en blanco) |
| Q-B07 | Notas largas de la Bambalina | En la línea va «bamba de tanto, hecha de tanto»; lo demás, en Observaciones | Hecho: la línea dice «BAMBALINA DE 30CM, HECHA DE 25CM» y las notas van al recuadro de Observaciones con la letra del toldo |
| Q-C04 | Posición de las medidas bajo el dibujo de Cortina con ventana | En `drawCurtainDiagram` las filas H. VENTANA y ALTURA VELCRO quedaban debajo del marco; la última podía coincidir con las notas de tela | Hecha (02/10/2026): altura del dibujo y de la ventana reducida para dejar sitio a las cinco filas dentro del recuadro. Probados Cortina y Cambio de cortina con ventana, velcro, ET y bamba incluida, sin notas y con 35 observaciones completas; capturas claras y oscuras a 1280×720 y 1600×1000 revisadas. Solo cambia la colocación; valores y cálculos conservados |
