# Iris — expediente

02/10/2026 · **Reserva completa, también motor y mando** (el 150 sin motor por defecto) · 24/09/2026: respuestas de taller · **Sin dudas abiertas:** Iván da por contestadas todas las del Iris a fecha 24/09/2026 (25/09) · [Seguimiento](./README.md) · [Dudas](./dudas-abiertas.md) · [Evidencia](../rps-iris-evidence.md) · [Informe de consumo (Codex)](./informe-iris-hera-consumo.md) · [Respuestas de taller](./dudas-hera-iris-respuestas-2026-09-24.docx)

## 1. Alcance

- Artículos de RPS: `IRIS110C/CO`, `IRIS110C/COS/GU`, `IRIS110S/CO`, `IRIS130C/CO`, `IRIS130C/COS/GU`, `IRIS130S/CO`, `IRIS150C/COCG`, `IRIS150C/COSG`. 75 OF con consumo desde 2024.
- Medidas: las del maestro `IRIS.xlsx` ([evidencia](../rps-iris-evidence.md)); no cambian.
- Hasta el 23/09 reservaba lona, cristal y las piezas comunes. Desde el 24/09, también el cofre, las guías, la cremallera, la varilla y el macarrón.
- Fuentes, por orden: guía interna de OT (`guía toldos iris.odt`) y manuales de ensamblaje de BAT (`Y:\DIBUJOS\TOLDOS\IRIS\ENVIADOS POR RAMÓN`); maestro de RPS con `InactiveDate`; consumo real (`tmp/iris/respuestas/*.mjs`, solo lectura).

### Despiece del PDF (03/10/2026)

El despiece dice lo que se reserva. Mantiene los cortes de siempre con su medida (cofre, tubo de enrolle, tubo de carga, lastre, compensación, guías, guía interior ZIP y telón) y cada uno lleva la referencia de la pieza reservada de la que sale; el cofre se separa en perfil superior e inferior, que tienen referencias distintas. Debajo van las piezas reservadas que no son un corte: casquillos, placa del eje, tapones terminales, goma de retención, tapa de guía o guía exterior, pies, pernos, tapas del cofre y máquina con manivela, o rueda, soporte y motor. El mando va en ELEMENTOS ACCESORIOS. En las piezas que salen de barra, la columna de unidades dice las piezas cortadas, no las barras.

No salen en el despiece la cremallera, la varilla vaina ni el macarrón: son material de confección (Iván, 03/10/2026) y se siguen reservando igual. El tubo de carga y el terminal compensador SWBS salen sin referencia porque no hay ninguna reservada para ellos (duda Q-DP07).

## 2. Qué reserva (24/09/2026)

Código en `irisPieces.js`; lo que existe en RPS por color y largo, en `irisStock.js`.

### Piezas comunes (23/09, sin cambios)

| Pieza | 110 | 130 | 150 | Consumo real |
| --- | --- | --- | --- | --- |
| Casquillo de punta con hueco Ø14 | `CASNMOSZ70MM` | `CASNMOSZ78MM` (Ø80) | — | 1 por toldo en todas las OF con él |
| Placa del eje extraíble | `CASPLACASZ` | `CASPLACASZ` | `CASPLACASZ` | 1 por toldo |
| Tubo de enrolle | P701 de 500 o 700 | P801 de 400, 500, 700 u 800 | Ø110 de 500, 600 u 800 | Solo los largos que se gastan |
| Pletina terminal 25×10 de 300 (lastre) | Sí | Sí | Sí | 1 barra por toldo; 2 por encima de 300 |
| Tapones terminales | 2 | 2 | 2 | Blanco o negro |
| Goma de retención | 700 | 700 | 800 | Blanca o negra |
| Con máquina | Casquillo eje cuadrado Ø70, MB-11, manivela | Ídem Ø80 | — | 1 por toldo |
| Con motor | Casquillo de motor Ø70, rueda Hi68, soporte Hipro | Casquillo Ø80, rueda P-801 mecanizada, Hipro | Rueda P-801 mecanizada, Hipro | 1 por toldo |

### Cofre (Q-I01)

La tarjeta pregunta **Forma del cofre** (redondo o cuadrado) en el 110 y el 130 con cofre, y con guía compensadora, que siempre lleva cofre. El 150 es siempre redondo (manual del 150 y maestro de RPS) y no lo pregunta. Es obligatoria: sin ella el toldo sale "FALTA · forma del cofre".

| Pieza | 110 | 130 | 150 | Consumo real (64 OF con cofre) |
| --- | --- | --- | --- | --- |
| Perfil superior | `PECOSSU1` | `PECOSSU3` | `PECOSSU5` | 52 OF |
| Perfil inferior redondo | `PECORSU1` | `PECORSU3` | `PECORSU5` | 51 OF entre redondo y cuadrado (manual de BAT, piezas 11 y 11/1) |
| Perfil inferior cuadrado | `PECOCSU1` | `PECOCSU3` | — | |
| Tapas redondo | `TAPASSUN1` | `TAPASCOR3` | `TAPASSUN5` | 57 OF, un juego por toldo en 54 |
| Tapas cuadrado | `TAPASCOU1` | `TAPASCOU3` | — | |

- Perfiles: del largo que menos material gasta para todas las unidades del toldo (con una, el más corto que da el corte; tres cofres de 245,6 salen de dos barras de 500). El taller reparte las barras entre toldos (OF 0208933: una barra de 600 para dos).
- **La forma es obligatoria también en los pedidos ya guardados.** Un Iris con cofre guardado antes del 24/09 no tiene forma: al reabrirlo sale "FALTA · forma del cofre" y el cálculo da no válido, sin ninguna línea de reserva (tampoco la lona), hasta que se elija. Bloquea su generación. En la cola de revisión de la instancia aislada (4310) no hay ningún Iris; la del servidor real no se ha consultado.
- El 150 no pregunta la forma y se reserva siempre redondo: lo dicen el manual del 150 y el maestro de RPS (no hay `PECOCSU5` ni `TAPASCOU5`). Taller dijo "se añade para cada modelo"; Iván da la pregunta por contestada (Q-I08). La web usa por ahora el redondo en el 150, sin preguntar.
- Las 7 OF sin tapas no tienen ninguna pieza de estructura imputada: cinco OF de los pedidos AR.25.01353 a AR.25.01364 (la estructura se imputó en sus OF hermanas) y dos 150 de septiembre aún abiertas.
- El texto de la línea de RPS solo dice la forma en 3 de 144 líneas, y el Iris no tiene autorrelleno: no se deduce.

### Guías (Q-I02 y Q-I03)

Taller dijo solo "hay que reservar las guías y la cremallera, siempre la XL". La correspondencia entre la tarjeta y los sistemas de BAT no la dio taller: sale de la guía interna de OT (`guía toldos iris.odt`) y del manual de BAT, y la confirma el consumo:

| Tarjeta | BAT | Consumo real desde 2024 | La web reserva por toldo |
| --- | --- | --- | --- |
| Estándar | GPZ ÚNICA A/M | 43 OF: perfil de guía `PEMMSU13` (43), tapa de guía `PECGSU13` (42), PVC interior `PEGIZS1` (38), pies `PIEGMMSU` (43; cuatro por toldo en 35) | 2 piezas de `PEMMSU13`, `PECGSU13` y `PEGIZS1`; 4 `PIEGMMSU` |
| Pequeña | GPZ ÚNICA M (solo motor) | 4 OF, todas a motor: `PEMoSU13` (4), `PIEGURSZ13` (4, cuatro por toldo), `PECGSU13` (3), PVC interior (4: dos `PEGIZ13` y una `PEGIZS1`) | 2 piezas de `PEMoSU13`, `PECGSU13` y `PEGIZS1`; 4 `PIEGURSZ13` |
| Compensadora | GPZ C | 12 OF: guía `PEGSZ13` (10), compensador `PEGCZ13` (8) o `PEGCPZ13` (1), exterior `PEGEZ13` (10; dos barras por toldo en 8), PVC interior `PEGIZ13` (8), pies `PIE` (9, dos por toldo) | 2 piezas de `PEGSZ13`, `PEGCZ13` y `PEGIZ13`; 4 de `PEGEZ13`; 2 `PIE` |
| Sin cofre (además) | Cabrio | `PERGUIA` en 11 de 11 OF, uno por toldo | 1 `PERGUIA` |

- Las piezas de guía van por la guía más larga (MFI o MFD) y salen de barras de 600 cuando caben dos: una barra hasta 3 m de guía, dos por encima (OF 0214360, 458 de caída: 2 barras).
- De los largos que existen, el que menos material gasta: dos guías de 205 salen de una de 500 (OF 0216104).
- Los "sin guía" (`C/COS/GU`) son **sin guía compensadora** (taller, Q-I03): llevan la guía normal, sus pies y la cremallera, y así se reservan.
- Guía exterior GPZ C: 4 piezas por toldo es una **inferencia** (dos por guía), no un dato. Encaja con las 8 OF que gastaron 2 barras por toldo, pero la OF 0199118 (400 × 235) gastó 3.

### Cremallera, varilla y macarrón (Q-I02 y Q-I04)

| Pieza | Código | Regla | Evidencia |
| --- | --- | --- | --- |
| Cremallera | `ZIPXLBLAN` / `ZIPXLGRIS` | Siempre la XL. **Provisional:** una caída de tela por toldo | Acuerdo del 09/10/2025, repetido por taller el 24/09, que no dijo cuánta. Desde octubre de 2025, 11 imputaciones XL y 2 de la normal. Una caída: 0221340, 3,3 m (281,5 + 40); 0222569, 2,64 m (234 + 30); 0229575, 2,9 m (250 + 40); 0222767, 1,85 m (144,5 + 30). Dos caídas: 0229896, 8,1 m (2 × (365 + 40)); 0227816, 5,2 m con 233 de caída. En el 150, 9,38 m por toldo (0208640) y 7,8 (0215709). La web usa por ahora una caída de tela por toldo (Q-I06) |
| Varilla vaina | `VARILLAVAINARBLA` | Frente + 10 cm, en metros | Respuesta de taller (Q-I04); se vende por metros (rollo de 250 m) |
| Macarrón Ø8 | `MACARRNEGR8MM` | Frente + 10 cm, en metros | Ídem; es el Ø8 del manual de BAT (piezas 12/A y 17/A) |

La cremallera blanca o gris (la negra está de baja desde 2021) se elige por la columna de la manivela: acierta 16 de las 19 OF con XL. En el taller parece ir con la lona; la web usa por ahora el color por el lacado (Q-I02).

### Colores

- Los perfiles de BAT no siguen la tabla de lacados: blanco es `BLAN` o `BL10` (9010), negro `NEGR` o `NE05` (9005), y cada familia tiene sus colores y largos (`irisStock.js`, maestro del 24/09).
- Si BAT no tiene el lacado en esa familia, el perfil **en bruto** para lacar fuera, como hace el taller (OF 0213064 marrón 8003, 0214385 plata 9006, 0206880 marrón óxido). La tarjeta avisa.
- Si el color existe pero ningún largo llega al corte, también va en bruto, y el aviso dice que falta el largo, no el color.
- Si tampoco hay bruto, no se reserva y la tarjeta dice qué falta para añadirlo a mano. En negro 9011: el perfil inferior cuadrado del 110 (`PECOCSU1` no tiene negro y su bruto está de baja desde el 12/04/2024), las tapas cuadradas del 130 y el perfil de guía solo motor. La web usa por ahora ese aviso para añadirla a mano (Q-I07). Lista por lacado (maestro del 24/09):
  - Negro 9011 y gris 7012: perfil inferior cuadrado del 110, tapas cuadradas del 130 y perfil de guía solo motor.
  - Perfil de guía solo motor: solo existe en blanco, antracita 7016, marrón 8002 y negro mate 9111.
  - Cofre del 150 (perfil inferior y tapas): solo en blanco, gris 7012 y negro.
  - Perfil inferior cuadrado del 110: solo en blanco, antracita, marrón 8002 y 8017 y plata 9006.
  - Tapas cuadradas del 130: sin bruto.
- PVC interior, guía exterior GPZ C y pies: blanco o negro por la columna de la manivela, como los tapones.
- Pies: la regla tiene excepciones. La OF 0220023 (marrón 8014) y la 0201015 (gris) gastaron pies blancos.
- `validate:rps-refs IRIS`: 143 referencias en todos los lacados, 0 rotas.

### No se reserva

- **Motor y mando** (Q-I05): taller dice que lo habitual es el Sunilus, pero lo elige taller. **Decidido por Iván el 02/10/2026** con lo gastado en RPS (90 OF de Iris y HERA con motor): el 110 reserva Sunilus IO 10/17 (16 OF; 15/17 en 8, sin medida que los separe) y el 130, Sunilus IO 35/17 (6 OF; Meteor en los grandes y pesados). El 150 ha llevado uno distinto en cada pedido (Helios CSI 30/17, Mariner, Sunilus 35/17): no se reserva motor y la tarjeta avisa. La tarjeta enseña «Motor» con el de la regla marcado y se cambia sin candado (Sunilus IO 10/17, 15/17 o 35/17). Mando: un Situo 1 IO Pure por motor (Situo 5 Variation con sensor de sol), como el resto de modelos (`src/domain/screenMotors.js`).
- Guía STORM: no es una opción de la tarjeta. La web usa por ahora la guía que se elija y la STORM se añade a mano (Q-I02).

### Pedido AR2604748: telón de cristal, motor solar y autorrelleno (07/10/2026)

Decidido por Iván el 07/10/2026 con el pedido AR2604748 (OF 0232537): Iris 110 con cofre, 253,5 × 220, negro 9005, «confeccionado en cristal transparente estabilizado» y «motor Somfy solar».

- **Telón todo de cristal.** La tarjeta pregunta «Telón»: lona, lona con ventana o todo cristal. Con todo cristal no se pide tela ni ventana y no se reserva lona. El cristal estabilizado se compra en piezas de 140 de ancho (`CRISESTP140xxxC`, familia PLÁSTICOS, por unidad): el largo es la siguiente medida que cubre el frente de la tela, como en la ventana, y se ponen las piezas que pida la caída (caída de tela ÷ 140, hacia arriba). AR2604748: 2 × `CRISESTP140250C`. Apoyo: OF 0215658 (tramo de cortina de 394 × 137 en cristal, una pieza de 450). La hoja de telas dice «CRISTAL ESTABILIZADO» y las piezas.
- **Motor solar Somfy RS100 Solar IO**, a elegir en «Motor» junto a los Sunilus. Cada motor lleva su batería y su panel, y además:
  - 10/12: soporte de batería y de antena. Es lo que gastó el HERA de la OF 0213066: `RS10010//12`, `BATERIASOLAR`, `PANELSORS100`, `RS100SOBT`, `RS100SOPAN`.
  - 15/12: soporte del panel. Es lo que compras pidió para la OF 0232537 (pedidos 091184 y 091223): `RS10015//12`, `BATERIASO16`, `PANELSORS10015`, `RS100SOPA`.
  - Mando: un Situo 1 IO Pure. Adaptación al tubo de 70: la misma que con el Sunilus (casquillo para motor 50, rueda motriz y soporte Hipro), pendiente de que la confirme el taller (Q-I09).
- **Autorrelleno.** El Iris entra en el autorrelleno desde RPS:
  - Variante, por el artículo: `IRIS110C` es con cofre y `S`, sin cofre.
  - Frente superior y salida izquierda, con el hueco escuadrado.
  - Lacado, accionamiento («apertura manual» es máquina; «motores» es motor) y colocación entre paredes.
  - Forma del cofre, si el texto la dice.
  - Telón de cristal, ventana y motor (solar o Sunilus) por el texto.
  - Si compras ya pidió un motor para la OF (`PUROrderLine`), manda ese.
  - Tipo de guía:
    - `COS/GU` y `COSG` («sin guía», es decir, sin compensadora; Q-I03) y `COCG` («con guía y ZIP»; sus 4 OF con consumo gastaron la guía normal) van con guía estándar.
    - `C/CO` y `S/CO` han llevado también compensadora (8 OF) y pequeña, y el texto nunca lo dice: queda para el técnico.
  - Fijación de la guía y lado del motor no salen nunca del texto.
  - Barrido de las 144 líneas de Iris desde 2021 (`tmp/iris-4748/barrido.mjs`): todas con variante y lacado. De los 78 toldos que traen medidas, 66 calculan válidos con lo recuperado. Los otros 12 se salen de las medidas del manual o son un 130 sin cofre a motor.

### Caída de la tela, entre paredes y cremallera (08/10/2026)

- **Caída de la tela = caída del hueco + 25 cm** para el tubo de enrolle, en todas las series y accionamientos (Iván, 08/10/2026). Antes 40, 30 o 49,8, sacados de 55 toldos y pendientes de ratificar. La cremallera, que se reserva por la caída de la tela, baja igual.
- **Entre paredes:** 3 mm a cada lado, 6 mm al frente, en todas las piezas horizontales (telón, cofre, tubo de enrolle, tubo de carga y lastre); no en las guías. Ya estaba así.
- **Cremallera:** siempre la XL. Ya estaba así.

### Escuadra del hueco (08/10/2026)

AR2604748: con medidas exageradas la web seguía dando válido, porque solo comprobaba que cada triángulo existiera. Desde el 08/10/2026:

- **Las seis medidas tienen que cuadrar.** Con el frente superior, las salidas y las diagonales sale el frente inferior. Si se aparta del medido más de **2 cm**, el toldo no es válido y la tarjeta dice qué frente inferior darían las demás medidas. En el CAD `EJEMPLO.dwg` la diferencia es de 0,05 cm. Los 2 cm son de la web, no de una guía (Q-I10): la cuenta amplifica el error de cinta de las diagonales; medio centímetro en cada una mueve más de 1 cm el frente inferior.
- **Guía compensadora** (Iván, 08/10/2026): se pone a partir de **1,5 o 2 cm** fuera de escuadra (o de diferencia entre frentes) y absorbe **hasta 2,5 cm** por guía. Sin ella, desde 1,5 cm avisa de hablar con comercial; con ella o sin ella, más de 2,5 cm **no es válido** (la excepción técnica permite seguir). Antes: aviso desde 0,5 cm y error desde 3. El CAD `EJEMPLO.dwg` (2,58 cm) ya no entra.
- **Frente el menor; la tela por la caída menor** (Iván, 08/10/2026): la tela no puede bajar del suelo en el lado corto, así que va por la menor de las dos alturas aunque la guía interna diga «la salida el de mayor medida». Cada guía se corta por su altura.
- **Dibujo del escuadrado en la tarjeta** (Iván, 08/10/2026, para no tener que hacerlo en CAD): según se teclean las medidas, la tarjeta dibuja el hueco medido, las dos diagonales, el rectángulo del toldo (frente y caída menores), cada guía con su altura y el desfase de cada esquina de abajo, y debajo si las medidas cuadran y qué pasa con la compensadora. Los desfases van exagerados para que se vean (lo dice el dibujo); las cotas son las reales. Sale del mismo escuadrado que el cálculo (`irisSquaringView.js`).
- Con «Hueco escuadrado: sí» no se comprueba nada de esto, porque las medidas se derivan por Pitágoras.
- Fuentes buscadas el 08/10/2026 en Oficina Técnica (`Y:`): `guía toldos iris.odt`, el protocolo de medición `I-1 06 02 R4` (el apartado de toldos está vacío) y los manuales de montaje Screeny de BAT. Ninguno da una tolerancia en cifras.

### `validate:reserva IRIS`

| | Antes (23/09) | Después (24/09) |
| --- | --- | --- |
| Códigos que reserva la muestra | 27 (solo guía estándar) | 77 (tres guías y dos formas de cofre, blanco y negro) |
| Falta | varilla, cremallera XL y normal, pies, macarrón, PVC interior, cubierta y perfil de guía, lona de otra tela, Sunea 10/17, Situo | Lona de otra tela (`SOLTIS96GROSP267`: la muestra usa otra), Sunea 10/17 y Situo (motor y mando, Q-I05), y la cremallera normal (`CREMALLEZIP…`, antes del acuerdo de la XL) |
| Sobra | Lona de la muestra | Lona de la muestra |

## 3. Dudas

**Todas contestadas.** El taller respondió el 24/09/2026 y Iván da por respondidas todas las dudas del Iris a esa fecha (25/09/2026), también las que salieron de las respuestas (Q-I06 a Q-I08). Ya no están en la [lista de dudas abiertas](./dudas-abiertas.md). Donde la web aplica una regla provisional, se dice abajo.

| ID | Pregunta | Estado |
| --- | --- | --- |
| Q-I01 | Cofre redondo o cuadrado: cambia perfiles y tapas | **Resuelta por taller el 24/09/2026.** "Sí cambia y se añade para cada modelo": campo en la tarjeta y reserva de perfiles y tapas |
| Q-I02 | Guía: GPZ C, ÚNICA y STORM frente a estándar, pequeña y compensadora | **Resuelta en parte por taller el 24/09/2026.** Taller: "hay que reservar las guías y la cremallera, siempre la XL". La correspondencia estándar = ÚNICA A/M, pequeña = ÚNICA M, compensadora = GPZ C no la dio taller: sale de la guía interna de OT y del consumo. Iván la da por respondida. La web usa por ahora: la STORM (6 OF de junio de 2025) sin opción en la tarjeta, se añade a mano; PVC interior `PEGIZS1` en la pequeña; compensador entreparedes `PEGCZ13`; y la cremallera blanca o gris por el lacado, aunque parece ir con la lona |
| Q-I03 | Los "sin guía" (`C/COS/GU`) consumen guías, pies y cremallera | **Resuelta por taller el 24/09/2026.** "Los sin guía son sin guía compensadora": llevan la guía normal |
| Q-I04 | Varilla vaina y macarrón: ¿cuánto? | **Resuelta por taller el 24/09/2026.** "Hay que reservar frente + 10 cm" |
| Q-I05 | Motor: ¿cuál y se pide en la tarjeta? | **Contestada por taller el 24/09/2026; Iván la da por respondida.** Taller: "Lo habitual es el Sunilus, pero depende de taller". Consumo desde 2024: en el 110, Sunilus IO 10/17 (8 OF) y 15/17 (5), y Sunea IO 10/17 en las 11 OF de junio de 2025 de los pedidos AR.25.01352 a AR.25.01658; en el 130, Sunilus IO 35/17 (6) y 10/17 (3), y Meteor CSI (3); en el 150, uno distinto en cada OF. La web usa por ahora: no reserva motor ni mando y avisa de que lo habitual es el Sunilus |
| Q-I06 | Cremallera XL: ¿una o dos caídas por toldo (una por lado)? | **Respondida a fecha 24/09/2026 (Iván).** Taller dijo "siempre la XL", sin decir cuánta. La web usa por ahora una caída de tela por toldo. Ver OF en §2 |
| Q-I07 | Lacados sin pieza en RPS, ni lacada ni en bruto | **Respondida a fecha 24/09/2026 (Iván).** Lista por lacado en §2, Colores. La web usa por ahora: no reserva la pieza y avisa para añadirla a mano |
| Q-I08 | ¿El 150 va siempre con cofre redondo? | **Respondida a fecha 24/09/2026 (Iván).** La web usa por ahora el redondo, sin preguntar, porque el manual del 150 y el maestro de RPS solo tienen el redondo |
