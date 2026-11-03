# Puertas y tramos de J. ARAUJO S.L. · RPS 000460

Estudio del 03/11/2026. Las hojas del cliente están en mm; el configurador y las tablas de este expediente, en cm. El DXF de máquina está en mm. La entrada es Puertas → cliente → tipo; cada cliente conserva sus reglas de confección.

## Fuentes y prioridad

**El CAD del pedido que se está planteando no sirve para deducir sus reglas.** Iván excluyó expresamente el DWG, DXF y PNG de AR2605365 porque están pendientes de revisar y las ventanas están mal hechas. No intervienen en la implementación, las fixtures ni el inventario reproducible. Para el 5365 solo se usan su hoja y RPS. Que permanezca una copia en `tmp/` no la convierte en evidencia.

Tienen prioridad los cinco antecedentes identificados por Iván como suyos: AR2605333, AR2604373, AR2604292, AR2602986 y AR2602391. Se contrastan además con pedidos fabricados anteriores, especialmente AR2504713, que tiene las mismas ventanas y el mismo frente que el 5365. Las zonas ANTIGUO, REV0, REV1, NUEVO y REV2 repetidas dentro de los DWG son plantillas, no otras unidades del pedido.

Copias locales en `tmp/araujo/dwg`, `dxf`, `pdf` y `png`; originales de red leídos sin modificarlos. La muestra ampliada incluye **33 hojas y 32 DWG convertidos a DXF**, de 2024–2026. AR2505761 tiene hoja, pero no se encontró su DWG. El manifiesto es `tmp/araujo/muestra-copias.json`. Los hashes, cotas y textos de los 32 DXF están en `tmp/araujo/evidencia-cad.json`. La frecuencia de coordenadas sirve para apartar las plantillas repetidas, no para decidir automáticamente qué revisión es buena.

La lectura detallada de hojas y recortes del plano se concentra en los cinco antecedentes de Iván, 4713, 5294, 3688, 0776, 0512 y 5733. La exploración numérica del resto amplía el contraste y descubre excepciones; no equivale a dar por válidas todas las variantes de todas las puertas del cliente.

## Todo el histórico de RPS, no solo la muestra

`node scripts/estudiar-araujo.mjs` ejecuta únicamente un SELECT parametrizado de **todas** las líneas `PUERTA%` del cliente 000460, sin filtro de año. Guarda el texto íntegro y la clasificación en `tmp/araujo/historico.json`, y los recuentos en `resumen-rps.json`. `--local --cad` repite la clasificación sin SQL e inventaría los DXF locales excluyendo el 5365.

Resultado: **1.329 líneas, 697 pedidos, del 22/01/2008 al 02/11/2026**.

| Artículo | Líneas |
| --- | ---: |
| PUERTAENR | 154 |
| PUERTAPLE | 1.109 |
| PUERTAPLET | 14 |
| PUERTAPLETRA | 6 |
| PUERTAPLETRAM | 46 |

Por año: 2008: 80; 2009: 72; 2010: 148; 2011: 113; 2012: 70; 2013: 25; 2014: 50; 2015: 71; 2016: 74; 2017: 77; 2018: 78; 2019: 86; 2020: 58; 2021: 50; 2022: 57; 2023: 68; 2024: 56; 2025: 67; 2026: 29.

Clasificación textual orientativa, con bolsa suelta antes de tramo, y tramo antes de puerta completa:

| Tipo propuesto por artículo y texto | Líneas | Mencionan ventanas | Impresión | Rotulación | Bolsa/saco |
| --- | ---: | ---: | ---: | ---: | ---: |
| Puerta enrollable | 151 | 127 | 6 | 2 | 137 |
| Puerta plegable | 1.106 | 677 | 30 | 145 | 214 |
| Tramo suelto | 52 | 16 | 0 | 2 | 4 |
| Bolsa suelta | 20 | 0 | 0 | 0 | 20 |

En total, 820 líneas mencionan ventanas y 509 no; 36 mencionan impresión y 1.293 no; 149 mencionan rotulación y 1.180 no; 375 mencionan bolsa/saco y 954 no. Solo 11 escriben literalmente canutillo. **No mencionar algo no demuestra que no exista**: muchas ventanas, bolsas y cantidades solo se ven en el escaneo. Se reconocen pares de medidas en 1.221 líneas; las 108 restantes no proporcionan un par legible por el script. Hay errores de escritura, dimensiones con `CM` entre los números y cantidades entre paréntesis; no se usa este análisis estadístico como receta de fabricación.

## Qué está demostrado

### Dos canutillos en cada pieza independiente

Los «canutillos» de las hojas se dibujan en oficina con **VARILLA BLANCA (5,5 mm)** arriba y abajo. Los laterales van **AL CORTE**, sin aumentar el frente. Con el canutillo de 7, el usuario introduce la medida del cliente H y la web corta **H + 7,4**. Hay dos líneas distintas: **rotulador rojo a 7 del borde de corte** y **referencia magenta de lona terminada a 3,7**, separadas 3,3. La referencia solo se dibuja en el plano, nunca como marca de máquina. No son las entradas sueltas de Portanova de 8 cm.

La plantilla identifica como COMB el canutillo de **6,5**. Iván precisó sus medidas el 03/11/2026: referencia magenta a **3,45** del corte y rotulador **3,05** más allá, a **6,5**; la regla de corte es **H + 6,9**. El 4373 histórico cortó H + 7,15, es decir, **0,25 más**; esta diferencia solo se consulta si se vuelve a usar COMB. Se conserva como opción manual con ese aviso. **Iván, 03/11/2026:** «no tengo claro por qué hay 6,5 o 7, pero vamos a dejar los 7; es mejor que tenga ese margen». Por tanto **7 es el valor inicial para todos los pedidos ARAUJO, incluido LAC 900 azul 5002**, sin deducirlo del material ni bloquear la confirmación. Q-AR01 queda contestada para el remate habitual. La cota aislada de conjunto de 4373 no impone una corrección al corte nuevo.

La web permite cambiar el perfil a mano y pide confirmar el dibujo del pedido. No aplica estos dos perfiles a extremos diferentes, bolsillos integrados, cintas o sacos de plegables grandes.

### Ventanas

Se introducen en cada tramo, desde su izquierda y su bajo **terminados**, mirando por el revés. En los recortes históricos 4713, 4292, 2391 y 0776 el hueco redondeado de 90 × 35 lleva cristal de **94 × 39**, 2 de solape por lado. Radio del hueco **2**, del cristal **4**, medidos en los vértices curvos del DXF, no inferidos de la imagen. Las ventanas de 4373 son de 90 × 30, cristal de 94 × 34. La hoja del 2391, segunda OF, pide una ventana corrida de 382 × 45: su cristal mide 386 × 49.

Se conservan los valores de la hoja, sin redondear el hueco de 35 a otro alto. Las pequeñas desviaciones CAD (90,034 en vez de 90; 307,008 en vez de 307; 301,048 en vez de 301) se documentan y no se convierten en demasías nuevas. Los radios se pueden corregir expresamente si el pedido los especifica.

El DXF común conserva los huecos y las curvas en CUTTER; los tramos rectos del cristal van a DISCO1 y sus curvas a CUTTER. Cristales iguales: una muestra con multiplicador, como en el resto de puertas. Se bloquean ventanas fuera de la pieza, radios imposibles, cristales sin sitio para sus solapes y piezas que no caben en el rollo.

### Rotulación y bolsa

El alzado se plantea por el **revés** y la posición de rotulación se describe por el **derecho**. La plantilla vigente propone **8 cm desde el bajo y una cara**, salvo que el pedido pida las dos. También contiene una pieza corta con el cuño centrado en el alto. La web propone los 8 cm, permite editar la distancia, centrarlo o pedir ambas caras, y conserva texto, ancho y distancia lateral. **No inventa el alto del anagrama ni su arte y no crea un recorte del logo.** Q-AR02 solo conserva lo que falta para rotular.

La bolsa es otra pieza rectangular, con su propio frente, alto y cantidad. No se sustituye por el saco con pestaña de Portanova. No se deduce siempre F − 7,5: el 5365 pide **440 × 30**, aunque sus tramos son de 307. El 3688 demuestra bolsas sueltas de 430 × 30 y 440 × 30; ambas cortan a 37,4 de alto. También hay bolsas de 28 que cortan a 35,4.

### Plegable continua comprobada

AR2602986 demuestra que `140 + 70 + 70` no siempre significa tres piezas: la hoja lleva una lona continua de **134 × 280**, canutillos en los extremos y dos bolsas soldadas intermedias de tubo Ø30. Cuerpo de corte **134 × 287,4**, entradas de **134 × 12** cada una y bolsa amarilla de **126,5 × 35,4**. La oficina agrupa las dos entradas en una muestra de 24,01; la web conserva dos piezas nominales de 12.

Con ejes a 70 y 140 desde el bajo terminado, las rayas del cuerpo se sitúan a `eje + 3,7 − 12/2`: **67,7 y 137,7 desde el corte inferior**, como el plano. La web permite introducir esas entradas y solo esa clase de cuerpo continuo rectangular que cabe entero. No inventa reparto, recortes para cintas ni altos de entradas a partir del artículo PUERTAPLE. Se debe indicar la impresión y el barniz en la nota del plano. El CAD de este antecedente escribe OF 0229533 y RPS 0229535; se conserva la OF de RPS al traerlo (Q-AR04).

## Contraste pedido / oficina / web

Medidas de corte en cm. «Coincide» se refiere a esas medidas nominales, no a identidad de todo el DWG, su colocación o sus textos. Las pequeñas fracciones de dibujo citadas arriba no se añaden a las medidas del cliente.

| Pedido y referencia | Pedido / hoja | Oficina | Web y alcance |
| --- | --- | --- | --- |
| **AR2605333, Iván**, OF 0233571 | Bolsa suelta 334,5 × 28 | 334,5 × 35,4; marcas 7 | Coincide con la pieza suelta; artículo PUERTAPLET conservado |
| **AR2604373, Iván**, OF 0231897 | 540 × 69 (2 uds), 65 y 53; 3 ventanas por tramo de 69 | Altos 76,15 / 72,15 / 60,15; rotulador a 6,5; cristal 94 × 34 | Con COMB revisado por Iván: 75,9 / 71,9 / 59,9. El histórico tiene 0,25 más por pieza; preguntar solo al reutilizar ese remate. Cantidades y cristal sin cambios |
| **AR2604292, Iván**, OF 0231784 | 178 × 140 / 90 / 80; bolsa 170,5 × 28; ventana 90 × 35 a 35 del bajo | 147,4 / 97,4 / 87,4; bolsa 35,4; cristal 94 × 39 | Coincide al introducir la ventana a 35, no a 30. Anagrama a 15 del derecho |
| **AR2602986, Iván**, OF RPS 0229535 | Continua 134 × 280; ejes 70 y 140; bolsa 126,5 × 28 | Cuerpo 287,4, dos ET de 12, bolsa 35,4 | Coincide en piezas; OF distinta escrita en CAD, Q-AR04 |
| **AR2602391, Iván**, OF 0228521 | 301 × 157 / 100 / 90; bolsa 293,5 × 28; dos ventanas 90 × 35 | 164,4 / 107,4 / 97,4; bolsa 35,4; cristales 94 × 39 | Coincide; se respeta su bolsa y su OF |
| **AR2602391, Iván**, OF 0228522 | 412 × 160 / 70 / 75 / 95; bolsa 404,5 × 28; ventana 382 × 45 | 167,4 / 77,4 / 82,4 / 102,4; bolsa 35,4; cristal 386 × 49 | Mismos altos; ventana corrida configurable con sus radios y posición |
| AR2504713, OF 0220812 | 307 × 95 (1) y 100 (2); bolsa 299,5 × 28 (2); ventanas 90 × 35 a 30 del bajo | 102,4 y 107,4; bolsas 35,4; cristal 94,034 × 39 | Coincide nominalmente. RPS no multiplica todo por 2. Referencia de las ventanas del 5365 |
| AR2605294, OF 0233443 | Tramo 207,5 × 85 blanco | 207,508 × 92,4; marcas 7 | 207,5 × 92,4; se aparta el resto de dibujos copiados con otra OF |
| AR2603688, OF 0230793 | Dos bolsas diferentes: 430 × 30 y 440 × 30 | Ambas de 37,4; alternativa de corte de pieza/restos | Dos filas independientes; no 2 conjuntos de 2 bolsas |
| AR2600776, OF 0225577 | 255 × 100 con ventanas y 255 × 90 liso | 107,4 / 97,4; cristal 94 × 39 | Configurable como dos tramos; RPS dice «diferentes medidas» y no inventa cuáles |
| AR2600512, OF 0225032 | Tramo amarillo 480 × 30 | 480 × 37,4, marcas 7 | Coincide; sin puerta ficticia |
| AR2505733, OF 0222632/33/34 | 4 tramos de 475 × 92,5 con entrada intermedia; otros extremos diferentes | 99,7; piezas de 49,5 y 36,5; entradas y acabados distintos | **No se aplica H + 7,4 automáticamente**: Q-AR03. No está dentro de los dos perfiles implementados |

Exploración adicional de cotas propias, disponible por fichero en `evidencia-cad.json`:

| Pedidos | Contraste que aportan / límite |
| --- | --- |
| AR2405185 | Tramos 85/100/95 → 92,4/107,4/102,4; cuatro bolsas diferentes de 28 → 35,4; mismos huecos 90 × 35 y cristales 94 × 39 |
| AR2406815; AR2500683 | Bolsa 382 × 30 → 382 × 37,4; tramo 307 × 100 → 307 × 107,4 y bolsas 442/299,5 × 28 → alto 35,4 |
| AR2502869 | Dos frentes, 257 y 287; cortes 182,4/122,4/117,4 y 137,4/97,4/87,4; bolsas de 35,4 |
| AR2503814; AR2504134 | 336 × 178 → alto 183,4; 308,5 × 90/100 → 97,4/107,4; ventanas y bolsas de distinto frente |
| AR2506245; AR2506358 | 177 × 130/90/80 → 137,4/97,4/87,4; 242 × 137/75/75 → 144,4/82,4/82,4; cristales de ancho 104 y alto 39 |
| AR2600201 | Dos frentes 308 y 159; altos 185/128 → 192,4/135,4; bolsas 300,5 y 151,5; ventana 110 × 40 → cristal 114 × 44 |
| AR2601226 | Tramos de 95 → 102,4 y bolsa suelta 427,5 × 30 → 37,4; hay cotas de preparación diferentes en el tramo de cabecera, no se generalizan |
| AR2602928 | Frente 151; altos 124/90/80 → 131,4/97,4/87,4; bolsa 143,5 × 35,4 y cristal 94 × 39 |
| AR2506130 | Dos configuraciones del mismo pedido: una cabecera 122,5 y otra 120; el CAD conserva ambas. No se mezclan cantidades/versiones |
| AR2403533; AR2501193; AR2501526 | Plegables impresas continuas: alturas totales 250/300/280 y entradas de unos 12; las cotas repetidas de bolsa son 35,4. AR2501526 confirma cuerpo 287,4 y dos ET de 12 |
| AR2406217; AR2504664; AR2506255 | Revisiones y diferencias de longitud/cadena en lonas impresas: 260,4/330,4; 311,7/315,7; 300/300,4, respectivamente. No se usan para inventar demasías, Q-AR05 |
| AR2404939 | Tramo de reposición con ventanas, corte 461,01 × 130,4 para alto 123; figuras y OF diferentes dentro del mismo archivo, se separan |
| AR2600252; AR2601995 | Plegables grandes con cintas/entradas de 13, empates y bolsas integradas; son otro acabado, **no cubierto por la lona continua sencilla**. Los mismos pedidos incluyen enrollables/tramos de alto +7,4 |
| AR2505761 | Hoja y RPS de puerta impresa; DWG no disponible. No sirve para afirmar una medida de corte de oficina |

## El 5365 que genera la web

La hoja de AR.26.05365 pide tres piezas separadas, cada una con «1 UNIDAD», y una bolsa. Frente 307; altos 95, 95 y 100. En el tramo de ventanas: 44 + 90 + 39 + 90 + 44 = 307, huecos de 35 de alto a 30 del bajo. En el tercero, anagrama de 20 de ancho a 15 del lado derecho; la plantilla aporta su referencia de 8 cm desde el bajo por el derecho. Bolsa amarilla de **440 × 30**. Lona ignífuga de 900 g lacada a dos caras, azul 5002. OF RPS **0233643**.

Con el canutillo de 7 fijado por Iván y contrastado con 4713, 5333, 4292 y 3688:

| Pieza | Corte | Cantidad |
| --- | --- | ---: |
| Tramo liso | 307 × 102,4 | 1 |
| Tramo con dos huecos 90 × 35 | 307 × 102,4 | 1 |
| Cristal, radio 4 | 94 × 39 | 2 |
| Tramo con nota de anagrama | 307 × 107,4 | 1 |
| Bolsa amarilla | 440 × 37,4 | 1 |

Los huecos de corte empiezan en X 44 y 173, Y **33,7** desde el borde de corte. Marcas a 7 y a H de corte − 7. Se agrupan los cristales iguales en una muestra ×2. No hay cachos laterales de ventanal ni saco con pestaña ni alternativas de saco partido.

Se reutiliza el anidado común de puertas, agrupando por material y ancho de rollo. Con los rollos iniciales de 300/140/300, el azul necesita **614 de largo**, con los dos tramos de 102,4 en una columna y el de 107,4 en la otra; la bolsa amarilla ocupa 440 de largo en otro material. Se permiten giros. Los cristales van agrupados como muestras de restos; la cota de la muestra no es consumo de dos cristales anidados. La oficina del 4713 usa también dos columnas de frente 307 (614 nominales), con 209,8 de ancho ocupado porque allí hay dos tramos de 107,4, frente a 204,8 del 5365. El orden concreto lo optimiza el anidado; no se copia la posición del CAD histórico.

Los anchos de rollo deben comprobarse para el material real de ARAUJO: 300/140/300 son los valores iniciales heredados del configurador, no una deducción de sus planos. Q-AR06.

El alzado muestra cada tramo separado, contorno, terminado, canutillos, marcas, ventanas, cantidades, OF y nota de rotulación por el derecho. El plano usa cotas DIMENSION editables y las capas de oficina; el resumen de corte conserva las entidades del bot, con sus curvas, giros y multiplicadores. Las diferencias de presentación respecto a la oficina son identificaciones uniformes por pieza, nota literal del anagrama sin inventar su altura y anidado común; no se afirma paridad gráfica de todo el histórico.

## Uso y comprobaciones

«Traer de RPS» elige la ficha por el código del cliente. Para ARAUJO (000460), `PUERTAENR` propone enrollable de tramos y `PUERTAPLE` propone plegable continua; los tres artículos históricos de tramo proponen tramos sueltos, o Bolsa si el texto solo describe bolsas. Conserva el artículo original. Propone frentes, cadena de altos y cantidades por tramo explícitas en el texto; una bolsa solo si RPS escribe sus dos medidas. No inventa la bolsa de 440 del 5365, que solo está en la hoja, ni sus ventanas o el anagrama. Si RPS dice «diferentes medidas», deja una pieza vacía y un conjunto, para repartir las cantidades con el escaneo. Para la continua reúne los altos de igual frente y cantidad uno en un cuerpo; las entradas intermedias se introducen con la hoja. Todo queda sin confirmar hasta revisar el dibujo.

Las pruebas se escribieron antes del cálculo. Cubren 5365, 4713, 4373, 4292, las dos OF del 2391, 2986, 5333, 5294 y 0512, lectura/validación de documentos, importación RPS de los tres artículos de tramo, radios, solapes, piezas que no caben, cantidades y DXF/plano. Se mantiene la batería de puertas de Portanova.

Evidencia local del 5365: `tmp/araujo/salida/AR2605365-pedido.json`, `AR2605365-bot.dxf`, `AR2605365.dxf`, `AR2605365.dwg`, PNG y `medidas.json`. Capturas de Datos, Tramos y Ventanas, claro y oscuro a 1280×720 y 1600×1000, en `tmp/ui-audit/puertas-araujo/`. La prueba de navegador usa la respuesta real de la consulta SELECT conservada como respuesta simulada del endpoint de RPS: el proceso aislado no pudo conectar con SQL. No es una prueba de red SQL desde ese proceso.

La instancia se arranca exclusivamente con el script aislado, puertos 4460/4470, datos bajo `tmp/araujo/aislada-clientes`; `/api/health` confirmó `simulationMode: true` y `fileWritesEnabled: false`. No se ha escrito en red ni en BOT/Pendientes, ni se ha tocado la paridad de remolques. `dudas-abiertas.md` conserva solo las decisiones pendientes; los criterios ya contestados quedan en este expediente.

## Elección por cliente y compatibilidad (03/11/2026)

La entrada es «Puertas → cliente → tipo», con el mismo diseño de CoordinaOT. ARAUJO ofrece Enrollable de tramos, Plegable continua, Tramos sueltos y Bolsa. Desaparece el selector «Confección». Los tipos comparten las mismas piezas, corte y plano; se pueden añadir bolsas a una puerta completa. Añadir otra puerta mantiene el cliente y el tipo elegidos.

Las fichas están en `src/puertas/clientes/`, un JSON por cliente; incluyen unidades de hoja (ARAUJO mm, Portanova cm), rollos, remates, perfiles 7 y 6,5, perfil inicial 7, referencias de rotulación, rótulos y tipos. Se descubren automáticamente sin otra lista en código. Véase su README para añadir una ficha con una confección existente contrastada.

Portanova (001336) ofrece Enrollable, Plegable, Apilable y Autorreparable. Plegable usa el cálculo `PUERTAPLE` existente. General aparece deshabilitado: no está demostrado que el acabado Portanova sirva para cualquier cliente. RPS puede mostrar sus datos, pero el cálculo devuelve `CLIENTE_SIN_REGLAS` y bloquea el corte. Así no se generan piezas con remates o rótulos de otro cliente.

Los documentos guardados anteriores mantienen sus datos y su interpretación sin migración. Las pruebas de `clientes.test.ts` abren casos construidos con las fixtures existentes AR2605246, AR2605220 y AR2605035 y comparan las huellas SHA-256 del documento, resultado de cálculo, DXF del bot y plano contra las obtenidas antes de introducir las fichas (b6303cf). Las cuatro huellas de cada caso permanecen idénticas.

Al añadir una puerta a un documento antiguo se conserva el cliente y el modelo de ese pedido. Al pasar entre Plegable y Apilable se conservan sus tubos y ventanas; al elegir otro modelo de Portanova se vacían para revisarlos con el nuevo dibujo. Si «Traer de RPS» encuentra otro cliente y el formulario tiene medidas u OF, pide confirmar la sustitución antes de cargar la ficha y las puertas de RPS; cancelar conserva el formulario.

En el 5365 se reserva una franja propia para la cadena horizontal 44–39–44 y más separación hasta el tramo siguiente. Se comprobó la presentación renderizada del plano regenerado: no se monta con «CANUTILLO · VARILLA BLANCA» ni con el 307 siguiente. No cambia ninguna medida de corte. Evidencias de la segunda parte: `tmp/araujo/salida/AR2605365-presentacion.png` y capturas en claro/oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/puertas-araujo/clientes/`.

## Plantilla ARAUJO: vigente, antecedentes y límites

Iván señaló la plantilla `ARAUJO.dwg` de `DIBUJOS\PUERTAS`, modificada el **13/02/2026 a las 14:43**. Se ha estudiado su copia local en `tmp/araujo/plantilla/`, sin escribir el original. SHA-256 del DWG: `b8c54c58645ae7e9a43a58aed2c32d104c5a27fee53a876d9b8efe2bf776fd8a`. `node scripts/estudiar-araujo.mjs --local --plantilla` inventaría textos y cotas con sus identificadores en `plantilla/evidencia.json`. Recortes renderizados en esa misma carpeta: `rev2-rotulacion-canutillos`, `rev2-dobleces`, `rev2-plegables`, `derecho-cortes`, `impresion`, `panama`, `rev1` y `antiguo`.

**Mandarán las respuestas de Iván del 03/11/2026 y después NUEVO/REV2.** ANTIGUO, REV0 y REV1 sirven para explicar cambios. REV1 dice que en COMB no se hagan marcas; REV2 lo sustituye por envarillar como las otras y marcar (texto `249F0`). No se elimina ROTULADOR por conservar una nota de una revisión anterior.

| Asunto | Qué demuestra NUEVO/REV2 | Criterio de la web |
| --- | --- | --- |
| COMB y Panamá | COMB: 59 → 66,15 y 47,5 → 54,65 en esa plantilla, rotulador a 6,5 (`21EEF`–`21F2C`). Panamá: 95 → 102,4 y bolsa 28 → 35,4 (`2AE4F`, `2B675`). Hay además ejemplos normales de 7 en el resto de la zona | La respuesta posterior de Iván prevalece: habitual 7 para todos; COMB manual con referencia a 3,45, rotulador a 6,5 y corte H + 6,9. El desfase histórico de 0,25 queda anotado, sin trasladarlo al remate habitual |
| Material | Nota `24C10`: normalmente LAC 900; si es PVC Panamá 900 g ignífugo lo especifican | Se conserva el material del pedido. El material no cambia automáticamente el perfil |
| Cuño y caras | Nota `21F7F`: 8 cm desde abajo, una cara salvo petición de las dos, distancia desde derecha variable. El ejemplo corto incorpora «en medio de la altura» (`2399F`). Notas `2C8DD` y `36834`: cuño por el derecho; puerta por el revés | 8 cm propuestos y editables, opción centrada y dos caras. La posición no fija el arte ni el alto real del anagrama; no hay un rectángulo ficticio de corte |
| Extremo con doblez | Los ejemplos «CON DOBLEZ» muestran una preparación superior de 4 y otra inferior de 7: 190 → 195,4 y 195 → 200,4 (`23A34`–`23A6D`). Hay otros detalles de soldar 5/soldar 2, cortes por el derecho y pasos de cintas sin retirar lona | Son acabados distintos a dos canutillos. No se permite deducir de ellos un despiece del 5733 ni añadirlos al cuerpo continuo sencillo |
| Impresión digital | Ejemplo **AR2203254**: cadena 108/80/75, ancho 185; cota total 263, corte de cuerpo 263,4; bolsa 177,5 × 35,4; muestra de dos ET de 24,0107 (`2DD88`, `2DD94`, `2DD9D`). Son referencias y extremos propios | Confirma que no toda impresa usa el cuerpo del 2986. Se mantiene el alcance del cuerpo continuo sencillo ya contrastado; no se inventa una regla universal de impresión ni se copia un corte de otra revisión |
| Rollos y giro | No se han encontrado notas de ancho de rollo ni una instrucción general que fije la orientación de impresión | Se mantienen anchos editables y se deja Q-AR06 abierta. Un ancho ocupado en el dibujo no prueba el ancho del rollo |

### Contraste de las dos líneas del canutillo

Se han medido los DXF originales copiados de **AR2604292, AR2602391 y AR2605333**, tanto alzado como corte. Evidencia con identificadores y coordenadas en `tmp/araujo/plantilla/canutillos-antecedentes.json`.

| Pedido | Corte → referencia magenta | Corte → marca roja | Capas observadas |
| --- | ---: | ---: | --- |
| 4292 | 3,7; entidades `38928`, `3892A`, `38969`, `3896B` | 7; `38922`, `38927`, `38962`, `38968` | `DISCO1` blanco 7, `referencias` magenta 6, `ROTULADOR` rojo 1 |
| 2391 | 3,7; `375C1`, `375C3`, `37621`, `37623` | 7; `375BC`, `375C0`, `3761A`, `37620` | `corte` blanco 7, `referencias` magenta 6, `marca` rojo 1; el bot usa las marcas con esos mismos desplazamientos |
| 5333 | 3,7; `3684B`, `3684D` | 7; `36844`, `3684A`, también `36A56`, `36A58` en el corte | `corte` blanco 7, `referencias` magenta 6, `marca` rojo 1 |

La salida de la web conserva los nombres de máquina comunes: `DISCO1` blanco 7 y `ROTULADOR` rojo 1; el plano añade `referencias` magenta 6 a 3,7 del corte. Entre magenta y rojo hay **3,3**. Las cotas históricas son de **7**; no se añaden cadenas 3,7/3,3 que esos planos no acotan. El bot no contiene la referencia magenta. Se ha descartado la interpretación inicial de una captura que intercambiaba las dos líneas: **mandan las distancias y capas del DXF**, confirmado por Iván/coordinador el 03/11/2026. Las pruebas comprueban posiciones, colores y ausencia de referencias en máquina.

### Clientes de puertas y plantillas de la carpeta

**Iván, 03/11/2026:** durante su tiempo en la empresa solo se han hecho puertas para **Portanova, ARAUJO, Belts Vigo y Puertas Luz**. La existencia de otras plantillas no las convierte en clientes actuales ni autoriza a aplicarles sus reglas. Inventario de nombres, fechas y tamaños en `tmp/araujo/plantilla/inventario-carpeta.json`; códigos contrastados por SELECT a `FACCustomer` en `clientes-rps.json`.

| Cliente real | Código RPS | Plantilla encontrada | Estado |
| --- | --- | --- | --- |
| PORTANOVA | 001336 | `PORTANOVA (NAVE NOVA).dwg`, 22/10/2026 | Ficha disponible; sus cálculos anteriores se conservan |
| ARAUJO | 000460 | `ARAUJO.dwg`, 13/02/2026 | Ficha disponible; estudio de este expediente |
| BELTS VIGO, S.L | **038908** | `BELTS VIGO.dwg`, 28/11/2025 | **Futura ficha**; solo inventariada |
| FABRICADOS LA SELVA PUERTAS LUZ, S.L. | **052082** | `PUERTAS LUZ.dwg`, 29/09/2026 | **Futura ficha**; solo inventariada |

Plantillas **antiguas**, sin implementar como fichas de puertas: **ALMAGAL** (solo `ALMAGAL.bak`, 2017; no hay DWG con ese nombre), **DICOMA ALZURIA (NAVE NOVA)** (2015), **ESTEFAN OREIRO** (2015), **INDUSTRIAS SANTA PAU** (2023), **JOSE CARLOS GARCIA** (2014), **OPERIS** (2016), **STAC (SISTEMAS TECNICOS)** (2015), **SYSTEM DOCK** (DWG de 2026 y `SYSTEM DOCK2.bak` de 2016), **TENZAMATIC** (2026) y **VILLAR MATO** (2025). La lona perimetral de System Dock sigue siendo otro producto de la web; este inventario no cambia sus reglas.

También hay dibujos sin nombre de cliente (`1412.dwg`, `AR1406234.dwg`, `AR2205194.dwg`, `B.dwg`, `Dibujo6.dwg`) y copias de seguridad de pedidos. No se les asigna un cliente por el nombre del archivo.
