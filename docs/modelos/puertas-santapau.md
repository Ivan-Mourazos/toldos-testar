# Puertas de Santa Pau · RPS 038661

Estudio del 04/11/2026. Cliente: DISTRIBUCIONS INDUSTRIALS SANTA PAU, S.L. La pantalla dice Santa Pau; plano y cajetín, SANTA PAU. Hoja en mm, configurador en cm y bot en mm.

**Referencia actual, 04/11/2026: AR2605363 corregido por Iván.** Sustituye al4815 como criterio actual por su indicación posterior: bajo **+2,5**, inferiores137,5, tubo central121 y flecha superior en la marca de E.T. El4815 conserva su corte anterior con bajo+5 e inferiores130. Se guarda la revisión por pedido. Se mantienen las respuestas Q-SP02–06: cristal, E.T. sueltas de9, refuerzos que se cortan, sin intervención en logos, rollos300/140/300 y lado cerrado a elegir. [Contraste completo por capas, corte y presentaciones](./puertas-santapau-capas.md). Q-SP07 queda cerrada: el DWG local corregido lleva X1 en B, igual que hoja y RPS; el informe anterior había transcrito X2.

## Fuentes y alcance

Se han convertido las copias de **14 DWG fabricados de 2023–2026** y la plantilla INDUSTRIAS SANTA PAU (23/05/2023), en `tmp/santapau/dxf/`. Se han rasterizado las 15 hojas completas en `tmp/santapau/hojas/`. Prioridad: AR2604815, AR2505055, AR2504404, AR2502196 y AR2501941; después 2024 y 2023. Los dibujos repetidos de la plantilla y las zonas «MODIFICACION EN EL SACO» y AR2302019 se excluyen como fabricación del pedido que los contiene.

`tmp/santapau/medidas.mjs` conserva cotas con sus puntos de extensión y aristas; `rectangulos.mjs` mide las separaciones del anidado. Sus JSON permiten repetir las mediciones sin red. Los PNG `*-oficina.png` son recortes del modelo, no del papel. La consulta SELECT del cliente devuelve **76 líneas PUERTA**, con los pedidos y OF; sus textos están en `rps-4815.txt` y `rps-5363.txt`. No se modifica RPS ni la red.

Después del primer estudio se recibió **AR2605363.dwg corregido por Iván**. Su copia local, convertida con ODA, es la referencia principal del contraste de confección. Hoja y RPS siguen determinando las OF, materiales y cantidades. No se modifica el original.

## Medición del bajo y las entradas

El aumento se mide desde la referencia de bajo terminado, extremo de la cota H, hasta el borde inferior real del paño. No se mide desde el borde del faldón dibujado aparte. Las cotas escritas pueden no coincidir con las coordenadas: se conservan ambas.

| Fabricado | Aumento bajo en alzado (cm) | Contraste con corte y E.T. |
| --- | ---: | --- |
| AR2604815 A/B | 2,5 / 2,5 | Paños superiores219 /169; inferiores **130 /130** del corte, frente a127,5 /127,5 del alzado. **Manda el corte**, por respuesta de Iván: bajo +5 y tiras sueltas de9 |
| AR2505055 | 2,5 | Superior 199 y tira contigua de 9 (envolvente 208). Inferior dividido en 89,5 y 67: su suma 156,5 no equivale a los 139,5 del alzado. Hay una unión y una tercera pieza A3; no se deduce una incorporación automática de E.T. de esta discrepancia |
| AR2504404 | 5 | Inferior 151,994; borde real de mirilla a 146,994 del bajo, aunque la cota escrita dice 144,994. Tres tiras de 9 contiguas al corte. Faldón de 40, excepción frente a 35 |
| AR2502196 | 2,5 | Inferior 142,5 (borde 140); superior 279 y dos tiras de 9 encima (envolvente 297). Otras dos sobre el inferior. Cuatro E.T. separadas por línea de corte |
| AR2501941 | 2,5 | Inferior 128 (borde 125,5); superior 199; cuatro tiras sueltas de 9 |
| AR2402958 | 2,5 | Inferior 139,5: borde dibujado 137, cota escrita 135. Superior 206 y cuatro tiras de 9, envolvente 242 |
| AR2402858 | 2,5 | Inferior 144,5: borde dibujado 142, cota escrita 140. Superior 281 y dos tiras de 9, envolvente 299; dos más junto al inferior |
| AR2401326 | 2,5 | Inferior 136,5: borde dibujado 134, cota escrita 132. Superior 249 y cuatro tiras de 9, envolvente 285 |
| AR2305658 | 2,5 | Inferior 134,5, borde 132; superior 227; cuatro tiras de 9 sueltas |
| AR2304157 A | 2,5 | Inferior 147,5, borde 145; superior 211; tiras de 9 en el corte |
| AR2304157 B | 17,5 | Inferior 152,503, borde 135,003; caso distinto, sin convertirlo en habitual |
| AR2304070 | 17,5 | Inferior 147,5, borde 130; superior 108,103; tiras de 9 |
| AR2302666 | 2,5 | Inferior 147,5, borde 145; superior 217,5; entradas separadas en el anidado |
| AR2301689 A/B/C | 5 / 5 / 5 | Inferiores 150, borde 145; tiras independientes de 9. Faldón antiguo 30 |
| AR2300417 A/B | 16 / 16 | Inferiores 151 / 146; bordes 135 / 130. Tiras de 9; revisiones antiguas del remate |

El estudio inicial contó11 de19 alzados con+2,5, pero **Iván descartó usar la mayoría histórica como regla**. Primero indicó el corte4815 (+5) y después el5363 corregido (+2,5). La revisión5363 es la inicial para nuevos pedidos; la4815 permanece disponible y los documentos sin revisión que guardaron5 conservan su corte. La tabla conserva el contraste histórico como apoyo. Las E.T. se cortan sueltas de9, sin incorporar ninguna ni proponer empates de Portanova. Si un paño no cabe, requiere estudio del técnico.

## Piezas y confección implementable

F = frente; H = alto; V = bajo visible de mirilla desde el bajo terminado; h = alto visible; m = margen lateral de lona. Las medidas de mirilla y ejes se transcriben de la hoja: no se adivinan por el frente.

| Pieza | Corte en cm |
| --- | --- |
| Paño superior | F × (H − V − h + 4) |
| Paño inferior | F × (V + 2,5), revisión actual5363; F × (V + 5) en la revisión anterior4815 |
| Cristal con mirilla de lado a lado | (F + 2) × (h + 4), según 4815: 283,5 / 165,5 × 64 |
| Cristal con márgenes | (F − 2m + 4) × (h + 4), como 5055: 224,5 × 54 para F260,5, m20 y h50 |
| Cachos laterales si m > 0 | Dos de (m + 1) × (h + 4), como 5055: 21 × 54 |
| E.T. | Largo indicado × 9; sin huecos de cintas ni recortes de máquina |
| Refuerzos de E.T. | Ancho indicado en pedido × alto de E.T.; **dos por cada E.T.**. 4815/5363: 8×9, seis por puerta |
| Faldón | F × 35, rectangular, sin pestaña; alto editable para excepciones (4404: 40; 1689: 30) |

Cabecera: +4 y marca a 7 del corte superior; se rotula **MACARRÓN (5,5 MM)**, como los fabricados. Las E.T. llevan marca en el paño a eje −4,5; encima de la mirilla el 4815 la lleva al lado opuesto, eje +4,5. Se identifica ese caso por quedar por encima de la mirilla. No se intercambian cotas de mirilla por ejes de tubo.

En el bajo mandan las marcas del **corte**:15 y20 desde el borde cortado del paño inferior, en ambas revisiones. Las marcas de E.T. del inferior quedan a57 y119 desde ese borde en5363, y59,5 y121,5 en4815. Se conservan tres flechas y una señal circular por puerta. La flecha superior del5363 va hacia abajo en la E.T.; la del corte4815 está en la cabecera. El faldón lleva su velcro en el alzado, sin raya en su corte. Notas: velcro suave de5 al revés; bravo de5 al revés del faldón, soldar2. No se genera una pestaña de saco Portanova ni su saco útil de120.

**E.T. cerradas:** 4815 pide tubos planos30×10 y un lado cerrado de lona; el plano indica pisar1 cm ese lado. El5363 precisa derecho cerrado e izquierdo preparado para cerrar después de introducir el tubo. El lado se exige al técnico; no se deduce para todos los pedidos. El cierre se indica en el alzado: las tiras de corte no llevan raya de cierre ni abertura.

**Refuerzos:** Iván confirma que **sí se cortan**, del ancho indicado en el pedido y del mismo alto que la E.T. En4815/5363 son8×9, misma lona/color del cuerpo, dos por E.T. Se dibujan en el alzado y se añaden como piezas reales de clase `refuerzo` al anidado, al DXF del bot y al consumo:12 en4815 (dos puertas),18 en5363 (tres puertas). El ancho es editable; el alto procede de la entrada. Un ancho inválido impide generar.

**Franja y faldón:** negro/amarillo significa impresión de diagonales sobre faldón, no tubo ni saco con pestaña. Se conserva el material negro y la instrucción de impresión; se puede desmarcar según pedido. **Logos: «los logos no los marcamos nosotros» (Iván).** Sin campo, aviso, nota ni marca de logo en la pantalla, el plano o el corte. Un dato de logo de un borrador inicial no interviene en el cálculo.

## Comparación con Portanova

No sirve reutilizar su confección enrollable: Portanova une ventanales entre ejes, corta E.T. de8, usa cabecera+3,5 y saco con pestaña (con saco útil de120,30 de corte y6,5 de pestaña). Santa Pau trabaja con bordes visibles de mirilla, +4 arriba, **+2,5 abajo en5363 (+5 en4815)**, E.T. de9, refuerzos de corte y faldón independiente de35. Se reutilizan ficha, sobre de pedido, anidado, capas de corte y escritor CAD común. Las huellas de Portanova y los casos Araujo deben seguir pasando.

## Casos a generar

- 4815:281,5×400 (OF0232635) y163,5×350 (OF0232636); mirilla de lado a lado, V125,h60; tubos59/121/210; blanca900, diagonales y seis refuerzos de8×9 por puerta. Inferiores130 como el corte de oficina; superiores219 /169.
- 5363 corregido:dos197×340 (OF0233644) y una216×340 (OF0233645); roja3002 M2; V135,h60; tubos59/121/210; derecho cerrado, diagonales y seis refuerzos de8×9 por puerta. **Inferiores137,5; superiores149**. Se conserva la colocación de oficina de664 cm, con18 refuerzos. Dos presentaciones, cada una con su OF y alzado ampliado.

Rollos **300/140/300** confirmados por Iván, «iguales al resto», editables y **sin aviso de provisional**. No se reservan materiales en RPS.

## Validaciones anteriores y cierre del encargo

La ficha aparece en **Puertas → Santa Pau → Enrollable**. «Traer de RPS» se ha probado contra RPS real, solo con SELECT, tanto por API como pulsando el botón: 4815 carga las OF0232635/0232636 y 5363 carga OF0233644 (dos de197×340) y OF0233645 (una de216×340), color rojo3002 y lona ignífuga M2. Tubos y mirilla quedan pendientes de transcribir, sin rellenarlos por suposición. La API de vista previa de ambos ejemplos responde200 sin errores de cálculo; evidencia en `tmp/santapau/api-verificada.json`.

Pruebas primero: los casos de Santa Pau fallaron usando el cálculo anterior y pasaron después de incorporar su confección. Tras rebasar sobre `origin/main` (450660b, corrección de bolsas y anagrama de Araujo), pasan **364 ficheros y 4.750 pruebas** con dos trabajadores, incluido el conjunto de huellas de documento, cálculo, bot y plano de Portanova y las pruebas Araujo. Pasan también **typecheck, lint y Vite build**. En este equipo se ejecuta pnpm12.5.1 a través de `corepack pnpm`; la compilación se deja en `tmp/santapau/build/` para mantener la evidencia dentro de tmp. Informes `vitest-final.log` y `vite-final.log`.

Se han revisado las ocho capturas de Mirilla y tubos / Confección, claro y oscuro, a1280×720 y1600×1000, en `tmp/ui-audit/puertas-santapau/`, además de la carga real de RPS. Sin errores de JavaScript ni desbordamiento horizontal. La vista se identifica por el revés y muestra el margen cero expresamente.

`tmp/santapau/salida/` contiene, para **AR2604815 y AR2605363**, DWG2018 (cabecera AC1032 comprobada), DXF del bot, DXF del plano, PNG de las dos presentaciones, pedido JSON y contraste con medidas y consumo. Las letras, cantidades y OF corresponden a cada puerta. El4815 aplica inferiores130 y12 refuerzos; el5363 corregido aplica inferiores137,5 y18 refuerzos. El estudio y la procedencia de las reglas quedan fuera del plano de taller.

Las seis **Q-SP01–Q-SP06 están contestadas** en `dudas-abiertas.md`, con las frases de Iván del04/11. Se retiran los avisos provisionales, las dudas de refuerzo y el aviso de logo; se mantiene la elección obligatoria del lado cerrado.

La instancia aislada4480 y su Coordina simulado4490 se han cerrado y se ha comprobado que ambos puertos dejan de responder. Rama `puertas-santapau`, cambios guardados en commits en castellano, rebasada y **sin push**.

### Revisión de rótulos del taller · 04/11/2026

Por revisión del coordinador, se elimina el bloque de notas bajo cada alzado: contraste, propuestas, dudas, logo pendiente y texto general de confección. Tampoco se imprime `notaPlano` en Santa Pau: el campo se presenta como «Nota para revisión» y se muestra en los avisos, para que los documentos anteriores no vuelvan a introducir las notas de estudio en el CAD.

Se han contrastado textos y posiciones de AR2604815, AR2505055, AR2504404 y AR2502196: macarrón sobre cabecera; AL CORTE a los lados;5 CM (HUECOS) junto a cada E.T.; REFUERZO EN E.T. junto a sus extremos; pisado de1 cm en el lateral cerrado; velcro suave y E.T. soldada en el bajo; indicación de soldar por el derecho debajo del bajo y velcro bravo bajo el faldón. Se mantienen A1/A2/B1/B2, REVÉS, OF y cantidad; mirilla y faldón se identifican por letra. Esta revisión de rótulos precedió a las respuestas de Iván: las medidas vigentes son las confirmadas arriba.

### Corte del4815 antes y después de las respuestas de Iván

| Pieza | Antes | Ahora |
| --- | --- | --- |
| Paño superior A / B | 281,5×219 /163,5×169 | Sin cambio |
| Paño inferior A / B | 281,5×127,5 /163,5×127,5 | **281,5×130 /163,5×130** |
| Marcas de velcro en inferior, desde corte | 15 /20 con el bajo inicial2,5 | **15 /20**, tomadas del corte4815 con bajo5 |
| E.T. | Tres por puerta, largo×9 | Sin cambio, sueltas |
| Cristal A / B | 283,5×64 /165,5×64 | Sin cambio |
| Faldón A / B | 281,5×35 /163,5×35 | Sin cambio |
| Refuerzos | Ninguna pieza de corte | **12 piezas de8×9** en total |

El área nominal de lona del cuerpo aumenta1.112,5 cm² por los dos inferiores y864 cm² por los refuerzos: **1.976,5 cm² (0,19765 m²)** más. El anidado incluye cada refuerzo, aunque pueda aprovechar huecos existentes sin aumentar el largo de rollo.

### Contraste final del5363 y presentaciones · 04/11/2026

El [informe por capas](./puertas-santapau-capas.md) recoge la revisión posterior del5363, que pasa a ser la referencia actual, la colocación comparada con el anidado común y las dos hojas por pedido. Se conservan bloques, arcos, tramas, solapes, cotas y detalle lateral; los textos de estudio quedan fuera del taller. El corte normalizado del5363 tiene cero segmentos faltantes o sobrantes y sus tres señales circulares coinciden con el original. Las cuatro presentaciones y las ocho capturas de pantalla están revisadas.

Validación de esta revisión: **369 ficheros y4.828 pruebas**, typecheck, lint y build correctos. Cambios guardados en la rama, sin push. **La instancia heredada sigue abierta en4480/4490:** Windows deniega detener sus procesos tras el cambio de cuenta; salud verificada en simulación y sin escritura habilitada. El informe conserva los detalles del cierre de esa revisión. Q-SP07 se ha cerrado después al reconvertir el DWG: B lleva X1.

### Cierre de la segunda comprobación · 04/11/2026

Corregidos tamaño y posición de cotas/rótulos del5363 y su correspondencia con el SVG web; B lleva X1, verificado en el DWG. El informe por capas conserva la tabla final y las diferencias gráficas normalizadas. Rebase sobre69cf03c; **4.831 pruebas en369 ficheros**, typecheck, lint y build correctos. DWG, DXF del bot y ambas presentaciones PNG regenerados para4815 y5363. Puertos4480/4490/4482/4492 cerrados, comprobado por petición HTTP. Sin push.

### Diagonales, centrado y lectura de taller · 04/11/2026

Por la revisión posterior de Iván se sustituyen los símbolos estirados por los contornos de franja de cada alzado aprobado (5363 A/B y4815 A/B), con su anchura, inclinación, separación y recorte. Los textos se centran y dimensionan en su hueco libre, incluidos los del corte. El SVG conserva el hueco de los números de cota y centra el bloque completo de las notas. La vista incluye la última cota del faldón.

El [informe por capas](./puertas-santapau-capas.md) recoge la tabla antes/después y las comprobaciones automáticas de cajas, líneas y recortes en las cuatro hojas, el bot y el navegador. Las diagonales solo son representación de impresión: no se añaden cortes ni marcas al bot. Rebase inicial sobrecb9630d; las reglas nuevas del escuadrado de apilables no cambian la confección de Santa Pau.

Cierre de esta revisión: **4.902 pruebas en377 ficheros**, typecheck, lint y build correctos sobre el cambiofed9ca9. Cero solapes, cruces con líneas y textos recortados en las hojas y en las cajas reales del SVG. DWG2018, DXF del bot y PNG regenerados. Instancia4482/4492 cerrada. Sin push.
