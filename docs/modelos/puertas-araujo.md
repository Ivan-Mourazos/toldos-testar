# Puertas y tramos de J. ARAUJO S.L. · RPS 000460

Estudio del 03/11/2026. Las hojas del cliente están en mm; el configurador y las tablas de este expediente, en cm. El DXF de máquina está en mm. Se mantiene el configurador de Portanova y se añade la confección «ARAUJO · tramos y bolsas» para enrollables, plegables y piezas sueltas.

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

Los «canutillos» de las hojas se dibujan en oficina con **VARILLA BLANCA (5,5 mm)** arriba y abajo. Los laterales van **AL CORTE**, sin aumentar el frente. El acabado de 7 se observa tanto en un tramo grande como en una bolsa suelta: terminado H, corte **H + 7,4**; marcas **a 7 del borde de corte**. El terminado queda a 3,7 de cada borde. No son las entradas sueltas de Portanova de 8 cm.

El perfil de AR2604373 es distinto: marcas de **6,5** y altos de corte de **H + 7,15**. Se conserva como un segundo perfil observado; no se interpola una fórmula ni se deduce por el frente o por ser enrollable. Q-AR01 recoge cuándo usarlo y la diferencia entre la suma de piezas y la cota del conjunto.

La web exige confirmar el perfil con la hoja y el antecedente adecuado. No aplica estas dos fórmulas a extremos diferentes, bolsillos integrados, cintas o sacos de plegables grandes.

### Ventanas

Se introducen en cada tramo, desde su izquierda y su bajo **terminados**, mirando por el revés. En los recortes históricos 4713, 4292, 2391 y 0776 el hueco redondeado de 90 × 35 lleva cristal de **94 × 39**, 2 de solape por lado. Radio del hueco **2**, del cristal **4**, medidos en los vértices curvos del DXF, no inferidos de la imagen. Las ventanas de 4373 son de 90 × 30, cristal de 94 × 34. La hoja del 2391, segunda OF, pide una ventana corrida de 382 × 45: su cristal mide 386 × 49.

Se conservan los valores de la hoja, sin redondear el hueco de 35 a otro alto. Las pequeñas desviaciones CAD (90,034 en vez de 90; 307,008 en vez de 307; 301,048 en vez de 301) se documentan y no se convierten en demasías nuevas. Los radios se pueden corregir expresamente si el pedido los especifica.

El DXF común conserva los huecos y las curvas en CUTTER; los tramos rectos del cristal van a DISCO1 y sus curvas a CUTTER. Cristales iguales: una muestra con multiplicador, como en el resto de puertas. Se bloquean ventanas fuera de la pieza, radios imposibles, cristales sin sitio para sus solapes y piezas que no caben en el rollo.

### Rotulación y bolsa

El alzado se plantea por el **revés** y la posición de rotulación se describe por el **derecho**. Las anotaciones históricas lo advierten expresamente. La web conserva el texto, el ancho y la distancia al lado derecho, pero **no inventa el alto del anagrama, su arte ni su posición vertical**, ni crea un recorte del logo. Q-AR02 recoge lo que falta confirmar para rotular.

La bolsa es otra pieza rectangular, con su propio frente, alto y cantidad. No se sustituye por el saco con pestaña de Portanova. No se deduce siempre F − 7,5: el 5365 pide **440 × 30**, aunque sus tramos son de 307. El 3688 demuestra bolsas sueltas de 430 × 30 y 440 × 30; ambas cortan a 37,4 de alto. También hay bolsas de 28 que cortan a 35,4.

### Plegable continua comprobada

AR2602986 demuestra que `140 + 70 + 70` no siempre significa tres piezas: la hoja lleva una lona continua de **134 × 280**, canutillos en los extremos y dos bolsas soldadas intermedias de tubo Ø30. Cuerpo de corte **134 × 287,4**, entradas de **134 × 12** cada una y bolsa amarilla de **126,5 × 35,4**. La oficina agrupa las dos entradas en una muestra de 24,01; la web conserva dos piezas nominales de 12.

Con ejes a 70 y 140 desde el bajo terminado, las rayas del cuerpo se sitúan a `eje + 3,7 − 12/2`: **67,7 y 137,7 desde el corte inferior**, como el plano. La web permite introducir esas entradas y solo esa clase de cuerpo continuo rectangular que cabe entero. No inventa reparto, recortes para cintas ni altos de entradas a partir del artículo PUERTAPLE. Se debe indicar la impresión y el barniz en la nota del plano. El CAD de este antecedente escribe OF 0229533 y RPS 0229535; se conserva la OF de RPS al traerlo (Q-AR04).

## Contraste pedido / oficina / web

Medidas de corte en cm. «Coincide» se refiere a esas medidas nominales, no a identidad de todo el DWG, su colocación o sus textos. Las pequeñas fracciones de dibujo citadas arriba no se añaden a las medidas del cliente.

| Pedido y referencia | Pedido / hoja | Oficina | Web y alcance |
| --- | --- | --- | --- |
| **AR2605333, Iván**, OF 0233571 | Bolsa suelta 334,5 × 28 | 334,5 × 35,4; marcas 7 | Coincide con la pieza suelta; artículo PUERTAPLET conservado |
| **AR2604373, Iván**, OF 0231897 | 540 × 69 (2 uds), 65 y 53; 3 ventanas por tramo de 69 | Altos 76,15 / 72,15 / 60,15; marcas 6,5; cristal 94 × 34 | Mismas piezas y cantidades con el segundo perfil. Cota del conjunto 283,6 frente a suma 284,6: Q-AR01 |
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

La hoja de AR.26.05365 pide tres piezas separadas, cada una con «1 UNIDAD», y una bolsa. Frente 307; altos 95, 95 y 100. En el tramo de ventanas: 44 + 90 + 39 + 90 + 44 = 307, huecos de 35 de alto a 30 del bajo. En el tercero, anagrama de 20 de ancho a 15 del lado derecho. Bolsa amarilla de **440 × 30**. Lona ignífuga de 900 g lacada a dos caras, azul 5002. OF RPS **0233643**.

Con el perfil demostrado por 4713, 5333, 4292 y 3688:

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

«Traer de RPS» activa esta confección solo para el cliente 000460. Acepta los tres artículos históricos de tramo sin perder su nombre. Propone frentes, cadena de altos y cantidades por tramo explícitas en el texto; una bolsa solo si RPS escribe sus dos medidas. No inventa la bolsa de 440 del 5365, que solo está en la hoja, ni sus ventanas o el anagrama. Si RPS dice «diferentes medidas», deja una pieza vacía y un conjunto, para repartir las cantidades con el escaneo. Las plegables continuas se eligen expresamente y se pueden reunir los altos de la propuesta en un único cuerpo, antes de introducir sus entradas.

Las pruebas se escribieron antes del cálculo. Cubren 5365, 4713, 4373, 4292, las dos OF del 2391, 2986, 5333, 5294 y 0512, lectura/validación de documentos, importación RPS de los tres artículos de tramo, radios, solapes, piezas que no caben, cantidades y DXF/plano. Se mantiene la batería de puertas de Portanova.

Evidencia local del 5365: `tmp/araujo/salida/AR2605365-pedido.json`, `AR2605365-bot.dxf`, `AR2605365.dxf`, `AR2605365.dwg`, PNG y `medidas.json`. Capturas de Datos, Tramos y Ventanas, claro y oscuro a 1280×720 y 1600×1000, en `tmp/ui-audit/puertas-araujo/`. La prueba de navegador usa la respuesta real de la consulta SELECT conservada como respuesta simulada del endpoint de RPS: el proceso aislado no pudo conectar con SQL. No es una prueba de red SQL desde ese proceso.

La instancia se arranca exclusivamente con el script aislado, puertos 4460/4470, datos bajo `tmp/araujo/aislada`; `/api/health` confirmó `simulationMode: true` y `fileWritesEnabled: false`. No se ha escrito en red ni en BOT/Pendientes, ni se ha tocado la paridad de remolques. Las dudas de fabricación se mantienen como Q-AR01–Q-AR06 en `dudas-abiertas.md`.
