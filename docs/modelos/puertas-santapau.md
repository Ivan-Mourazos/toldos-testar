# Puertas de Santa Pau · RPS 038661

Estudio del 04/11/2026. Cliente: DISTRIBUCIONS INDUSTRIALS SANTA PAU, S.L. La pantalla dice Santa Pau; plano y cajetín, SANTA PAU. Hoja en mm, configurador en cm y bot en mm.

## Fuentes y alcance

Se han convertido las copias de **14 DWG fabricados de 2023–2026** y la plantilla INDUSTRIAS SANTA PAU (23/05/2023), en `tmp/santapau/dxf/`. Se han rasterizado las 15 hojas completas en `tmp/santapau/hojas/`. Prioridad: AR2604815, AR2505055, AR2504404, AR2502196 y AR2501941; después 2024 y 2023. Los dibujos repetidos de la plantilla y las zonas «MODIFICACION EN EL SACO» y AR2302019 se excluyen como fabricación del pedido que los contiene.

`tmp/santapau/medidas.mjs` conserva cotas con sus puntos de extensión y aristas; `rectangulos.mjs` mide las separaciones del anidado. Sus JSON permiten repetir las mediciones sin red. Los PNG `*-oficina.png` son recortes del modelo, no del papel. La consulta SELECT del cliente devuelve **76 líneas PUERTA**, con los pedidos y OF; sus textos están en `rps-4815.txt` y `rps-5363.txt`. No se modifica RPS ni la red.

**AR2605363 solo aporta hoja y RPS. No tiene plano de oficina y no es evidencia de confección.** Se genera con las reglas estudiadas, sin utilizar ningún CAD del pedido en curso.

## Medición del bajo y las entradas

El aumento se mide desde la referencia de bajo terminado, extremo de la cota H, hasta el borde inferior real del paño. No se mide desde el borde del faldón dibujado aparte. Las cotas escritas pueden no coincidir con las coordenadas: se conservan ambas.

| Fabricado | Aumento bajo en alzado (cm) | Contraste con corte y E.T. |
| --- | ---: | --- |
| AR2604815 A/B | 2,5 / 2,5 | Paños superiores 219 / 169; inferiores **130 / 130**, frente a **127,5 / 127,5** del alzado. Tiras sueltas de 9 junto al conjunto. Se aplica la propuesta mayoritaria, no se copia el exceso de 2,5 del corte |
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

Resultado: **11 de 19 puertas** tienen +2,5 en el alzado, incluidas 8 de las 9 de 2024–2026. El resto no tiene un aumento único. Se propone **+2,5 editable**, como autoriza el encargo; las discrepancias del corte de 4815 y 5055 quedan en Q-SP01. No se suman las tiras contiguas al alto del paño ni se consideran E.T. incorporadas solo por compartir una envolvente. La automatización corta E.T. sueltas de 9, sin incorporar ninguna ni proponer empates de Portanova. Si un paño no cabe, requiere estudio del técnico.

## Piezas y confección implementable

F = frente; H = alto; V = bajo visible de mirilla desde el bajo terminado; h = alto visible; m = margen lateral de lona. Las medidas de mirilla y ejes se transcriben de la hoja: no se adivinan por el frente.

| Pieza | Corte en cm |
| --- | --- |
| Paño superior | F × (H − V − h + 4) |
| Paño inferior | F × (V + aumento de bajo); propuesta de aumento 2,5 |
| Cristal con mirilla de lado a lado | (F + 2) × (h + 4), según 4815: 283,5 / 165,5 × 64 |
| Cristal con márgenes | (F − 2m + 4) × (h + 4), como 5055: 224,5 × 54 para F260,5, m20 y h50 |
| Cachos laterales si m > 0 | Dos de (m + 1) × (h + 4), como 5055: 21 × 54 |
| E.T. | Largo indicado × 9; sin huecos de cintas ni recortes de máquina |
| Faldón | F × 35, rectangular, sin pestaña; alto editable para excepciones (4404: 40; 1689: 30) |

Cabecera: +4 y marca a 7 del corte superior; se rotula **MACARRÓN (5,5 MM)**, como los fabricados. Las E.T. llevan marca en el paño a eje −4,5; encima de la mirilla el 4815 la lleva al lado opuesto, eje +4,5. Se identifica ese caso por quedar por encima de la mirilla. No se intercambian cotas de mirilla por ejes de tubo.

En el bajo se conservan las posiciones observadas del velcro: 12,5 y 17,5 sobre el bajo terminado, y 5 sobre el borde del faldón. Notas: velcro suave de 5 al revés; bravo de 5 al revés del faldón, soldar 2. No se genera una pestaña de saco Portanova ni su saco útil de 120.

**E.T. cerradas:** 4815 pide tubos planos 30×10 y un lado cerrado de lona; el plano indica pisar 1 cm ese lado. El 5363 precisa derecho cerrado e izquierdo preparado para cerrar después de introducir el tubo. El lado se exige al técnico; no se deduce para todos los pedidos. El cierre se marca en la tira, sin recortar una abertura.

**Refuerzos:** 4815 y 5363 piden 8 cm en los extremos de todas las E.T., misma lona/color. Se dibujan y rotulan ambos extremos en el alzado, pero no se inventa un alto de corte ni se generan piezas de refuerzo sin confirmación (Q-SP03).

**Franja y faldón:** negro/amarillo significa impresión de diagonales sobre faldón, no tubo ni saco con pestaña. Se conserva el material negro y la instrucción de impresión; se puede desmarcar según pedido. El logo DISP a dos caras se indica en el alzado y en las instrucciones; no se inventan tamaño, posición acotada ni vector del logotipo (Q-SP04).

## Comparación con Portanova

No sirve reutilizar su confección enrollable: Portanova une ventanales entre ejes, corta E.T. de 8, usa cabecera +3,5 y saco con pestaña (con saco útil de 120, 30 de corte y 6,5 de pestaña). Santa Pau trabaja con los bordes visibles de mirilla, +4 arriba, bajo mayoritario +2,5, E.T. de 9 y faldón independiente de 35. Se reutilizan únicamente la ficha, el sobre de pedido, el anidado, las capas de corte y el escritor CAD común. Las pruebas de huellas de Portanova y los casos Araujo deben seguir pasando.

## Casos a generar

- 4815: 281,5 × 400 (OF0232635) y 163,5 × 350 (OF0232636); mirilla de lado a lado, V125, h60; tubos59/121/210; blanca900; refuerzos8; logo dos caras y diagonales. Se deja constancia de la diferencia de 2,5 del inferior respecto al corte de oficina.
- 5363, solo hoja/RPS: dos197 × 340 (OF0233644) y una216 × 340 (OF0233645); roja3002 M2; V135, h60; tubos59/120/210; derecho cerrado, refuerzos8, logo dos caras y diagonales. Verificar la transcripción de 1950/1350 de la mirilla y del eje1200 con la hoja original antes de fabricar.

Los rollos iniciales son propuestas de 300/140/300, editables y señalados para revisión: el anidado histórico acota 297–299,5 de ancho útil en varias muestras, sin acreditar el ancho comercial de todo material. No se reservan materiales en RPS.
