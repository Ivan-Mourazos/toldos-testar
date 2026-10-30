# Faldones: matriz de confección, intermedios y cambios de tela

Ampliación del **30/10/2026** del [estudio de fachada](./faldones-frontales.md), posterior a la [revisión de piezas y versiones](./faldones-frontales-revision-tecnica.md). Se completa la búsqueda documental del subconjunto de **56 líneas / 53 pedidos** de intermedios y cambios de tela. Se incorporan **59 libros**, 23 escaneos completos —109 páginas—, 14 páginas de planos y una vista del DWG. El [JSON de contraste](./faldones-frontales-confeccion.json) conserva las fuentes, decisiones por línea, valores y fórmulas con sus celdas, conciliaciones y matriz.

La conclusión práctica es conservar **medida comercial, medida de instalación, entrada del cálculo, corte y reserva** como datos distintos. El código FALDONINTERMEDIO no define un único producto ni todos los cambios se calculaban igual. La revisión acredita observaciones de casos y reproduce cálculos guardados; las reglas generales de confección siguen pendientes de OT.

## Cobertura de esta ampliación

| Grupo o fuente | Cobertura | Tratamiento |
| --- | ---: | --- |
| FALDONINTERMEDIO | 38 líneas del censo | Incluye enrollables, suplementos fijos, paños con tubos y una venta de solo estructura |
| CAMBIOTELAFALDON | 10 líneas | Incluye cambios de intermedio y una línea de cambios de Cortina que se separa |
| Cambios con otra codificación, E001–E008 | 8 líneas | Siete de intermedio y uno de lateral; ya estaban identificados fuera de los tres códigos exactos |
| **Subconjunto estudiado** | **56 líneas / 53 pedidos** | No son 56 ventas adicionales al censo de 219 líneas principales y 13 adicionales |
| Libros encontrados en las raíces anuales y TOLDOS | 59 | Se conservan todos los sufijos; no se elige el archivo de número mayor como versión vigente |
| Bloques identificados por OF del mismo pedido | 38, de 34 líneas | E2 rotula la OF; se conservan entradas, corte, fórmulas y salida preparada en el libro |
| Grupos libro/OF | 36 | Dos bloques de una OF pueden formar un conjunto; dos libros pueden contener estados o piezas distintas |
| Grupos con salida de materiales guardada | 35 | 34 concuerdan con el cálculo del libro; una diferencia corresponde al cambio de Cortina separado |
| DWG recuperados o reutilizados de la fase anterior | 16 | Cajetines y figuras se atribuyen por fuente; no por el simple nombre del archivo |
| DXF de máquina localizados | 14 | Se inventarían; solo AR2600316 tiene aquí contraste completo del cuerpo de marcado |
| Escaneos completos | 23 / 109 páginas | Se revisan también las hojas posteriores con croquis y condiciones, sin copiar datos bancarios o conversaciones ajenas al objeto técnico |
| Nuevas cotas CAD seleccionadas | 6 | Cuatro de AR2600316 y dos de la pieza C de AR2601502 |

Las 22 líneas sin bloque Excel de su OF no desaparecen. Algunas tienen plano, croquis o una muestra física citada; otras corresponden a trabajo directo sin archivo localizado. Cada límite queda en su registro, sin declarar inexistente un planteamiento en cualquier soporte. Estos recuentos describen esta fase y no se suman como fuentes nuevas únicas a las fases anteriores.

Los libros se han leído **sin ejecutar macros, actualizar vínculos ni recalcularlos**. Se han conservado valores guardados y fórmulas de las hojas técnicas. Para 38 bloques se reproduce por aritmética independiente su fórmula de reserva Q28; esto no demuestra que esa cantidad se cargara en RPS o se consumiera. El único origen comercial sigue siendo el exportado local F48; no se han consultado bases ni credenciales.

`busquedaPorPedido` conserva las dos carpetas consultadas de cada año, sus archivos encontrados y la ruta de DXF comprobada. No se localizó libro en 9 de los 53 pedidos ni DWG en 37, dentro de esas rutas. Los 59 libros están en 44 pedidos; tener un libro del pedido no basta para atribuirlo a todas sus OF.

## Qué productos mezcla la codificación

| Caso | Evidencia y decisión |
| --- | --- |
| L021 · AR2501474 / OF0215131 | Tres **suplementos fijos entre toldos**, no tres enrollables. Escaneo p3: largos de 400, anchos de 45/60/40, nota «MEDIDAS A REVISAR» y aprovechamiento de tubos viejos en nave. No hay corte ni reserva acreditados para ellos en los libros localizados |
| L025 · AR2501697 / OF0215519 | Solo se envían dos estructuras. La nota dice «OT NO PLANTEA NADA» y la única hoja confirma que la tela ya estaba hecha, vinculada a AR2501423, y en el local del cliente. No asignar tela nueva por el código FALDONINTERMEDIO |
| L117 · AR2600316 / OF0224609 | Intermedio de acrílico con entradas de tubo en los dos bordes largos, detalle de 320×60 y patrón de 329×73. No es el mismo despiece que el enrollable estrecho con varilla y pletina |
| L193 · AR2603406 / OF0230345 | El texto de venta, la hoja de visita y D265/D266 identifican **cambios de Cortina con ventana**: dos piezas de 201×260 y una de 233×250 en sus estados de partida. Los bloques usan CAMBIO CORTINA. Se mantienen fuera de la inferencia de reglas de faldón, aunque el artículo sea CAMBIOTELAFALDON |
| L007 / L046 / L047 | Cambios de intermedios recogidos con código CAMBIOTELAFALDON. El código no acredita que sean cambios de lateral inclinado |
| E001 / E006 / E007 | Cambios comerciales calculados en bloques ENROLLABLE. El nombre del bloque empleado no convierte la actuación en un enrollable nuevo |
| L022 / L035 | Los escaneos identifican cambios de laterales con referencia a la pieza vieja o patrón en nave. No reducirlos a rectángulos tomando las dos cifras comerciales |

Se mantiene el grupo de intermedios separado del faldón lateral y frontal prioritarios. Las lonas de escenario siguen fuera del alcance.

## Frente del conjunto y ancho de lona

La diferencia no se convierte en un descuento automático:

- **AR2506259 / L103:** la hoja p1 da un conjunto de 80 y escribe expresamente **«50 CMS DE LONA»**; el libro usa frente 50 y salida 350. La oferta p4 da 80×360. Quedan conservados el ancho del conjunto, el de la lona y ambas salidas, sin deducir una transformación obligatoria para otros pedidos.
- **AR2500742 / L005 y AR2501732 / L026:** oferta/visita de 80 de frente frente a 50 en sus bloques identificados. El antecedente anterior acredita que esa distinción existe, sin demostrar que todos estos trabajos tengan el mismo descuento de estructura.
- **AR2601354 / L134:** la visita y el libro conservan 80×240; D194 p3 imprime frente 50, corte 265 y 2,65ml. Las dos anchuras caben en una pasada de rollo de 120, por lo que una reserva coincidente no resuelve cuál era la anchura de tela. Se conservan ambos estados. El «VERDADERO» de la hoja no valida el despiece: la misma página contiene #N/D.
- **AR2604377 / E008:** la hoja p2 distingue 214 en el borde inclinado de 126 en horizontal, y 288 desde suelo de 238 de altura de lona. P3 confirma la propuesta de faldón de 126×238. La oferta llama a 214×288 «ancho×altura»: no son las dimensiones de una caja de corte. El DWG reproduce la forma, pero imprime **OF0231934**, perteneciente a otra línea, frente a **OF0231933** del cambio del lateral. La discrepancia del cajetín se conserva y no se le asigna la reserva del libro de otra OF.

La futura toma de datos debe nombrar la referencia de cada medida. No basta con preguntar largo y alto ni con restar dos cifras que tienen orígenes distintos.

## Cálculo guardado y salida de materiales

Cada bloque identificado conserva su entrada y sus celdas E2, Q13 y Q26–Q28, las referencias a la hoja TELA y el ancho de rollo `ANCHO = M.TELA!H4`. La reproducción de Q28 usa la fórmula escrita en el propio libro y se compara con su resultado guardado. **No se ha ejecutado el libro ni se ha utilizado su despiece incompleto como catálogo.**

| Caso | Entrada del bloque y corte guardado | Reserva preparada en el libro | Qué demuestra |
| --- | --- | ---: | --- |
| L005 · AR2500742 | ENROLLABLE: 50×300 → 50×325, una unidad | 3,25ml | Aumento de salida de 25 en ese bloque; la venta de frente 80 permanece separada |
| L007 · AR2500865 | CAMBIO TELA: 50×250 → 50×295 | 2,95ml | Un cambio de intermedio con aumento de 45; no pertenece a los frontales nuevos de otra OF del pedido |
| L043 · AR2502510 | Dos bloques de 50×225 → 50×250, misma OF0217005 | 5ml en cada columna de salida | Cada bloque calcula 2,5; las columnas repiten el total de 5. No sumar 5+5 |
| L058 · AR2502951 | 50×400 → 50×425 y 50×350 → 50×375, misma OF0217792 | 8ml repetidos | 4,25+3,75=8; no son dos reservas de 8 |
| E002 · AR2502839 | CAMBIO TELA: 60×300 → 60×340 | 3,4ml | Aumento observado de 40, distinto de los cambios con 45 |
| E003 · AR2502923 | CAMBIO TELA: 80×300 → 80×345 | 3,45ml | No trasladar este corte al otro intermedio con tubos de 395×293 del pedido, L057 |
| E004 · AR2504325 | CAMBIO TELA: 70×350 → 70×395 | 3,95ml | Otro cambio con 45; no una regla de los intermedios nuevos |
| E001 · AR2501910 | ENROLLABLE: dos unidades de 62×300 → 62×325 | 6,5ml | Dos cambios comerciales en un bloque con dos unidades; no multiplicar otra vez la reserva |
| E006 · AR2602376 | ENROLLABLE: 60×190 → 60×215 | 2,15ml | D238 imprime 9,9ml para A y otro Sombrex B; ese total conjunto no es reserva exclusiva de A ni de los laterales del pedido |
| E007 · AR2604337 | ENROLLABLE: 60×175 → 60×200 | 2ml | No todos los cambios utilizan CAMBIO TELA ni un aumento de 45 |

Se observan aumentos de salida de 25, 40 y 45 en los bloques identificados. Son diferencias entre **entrada y corte guardados del modelo usado**; no márgenes trasladables a un faldón inclinado con remates propios. Tampoco describen su frecuencia física, porque hay bloques repetidos o estados de un mismo trabajo.

**Estados conservados:** AR2603392 tiene cuatro libros. Uno contiene la entrada de la OF del intermedio con tres unidades pero deja incompleta su salida RPS; otro conserva esa OF y 9ml. No son seis unidades ni 18ml de reserva. En AR2502839, la nota ordena pasar los tiempos de OF0217655 —E002— a OF0221933 —L054—: se conserva el vínculo sin declarar dos fabricaciones.

**Diferencia detectada fuera del grupo de faldón:** para la pieza D de Cortina de AR2603406, el libro guarda corte 295 y cálculo 8,85ml, pero su salida RPS preparada da 8,31. D266 imprime corte 277 y 8,3ml. Se conservan los estados, sin elegirlos por el sufijo del archivo ni convertir los 18cm de diferencia en regla de faldón. De los 35 grupos libro/OF con salida, 34 concuerdan y este difiere; los **33 grupos conciliados del ámbito de faldón/intermedio** no incluyen los dos de Cortina. Son comprobaciones del archivo, no del saldo actual del servidor.

## Matriz de confección observada

Medidas en cm, con los ejes del patrón normalizados cuando se presenta girado. Las diferencias se calculan únicamente entre las cifras indicadas; su explicación por borde no se completa por costumbre. M01–M09 reutilizan contrastes anteriores y M10–M12 incorporan intermedios de esta fase.

| ID / caso | Referencia de entrada | Patrón o corte | Diferencia | Remates y condición conservados |
| --- | --- | --- | --- | --- |
| M01 · C055 | Hecho 225×205,5 | 233×215,5 | +8 / +10 | BN4 a ambos lados; ET superior/inferior |
| M02 · C096 | Hecho 570×230 | 579×240,5 | +9 / +10,5 | BN sin ancho escrito; ET superior/inferior |
| M03 · C155 B | Hecho 225×213 | 230×223 | +5 / +10 | BN1 con velcro en un lado y BN4 en el otro; ET superior/inferior |
| M04 · C238 | Hecho 248×170 | 257×182 | +9 / +12 | BN sin ancho escrito; ET superior/inferior |
| M05 · C120 | Detalle 281×221, distinto de venta 273×135 | 290×231,5 | +9 / +10,5 | **Excluido de inferencia:** cambio de medidas sin acreditar |
| M06 · V04 C | Hecho 419×204 | 423,5×214 | +4,5 / +10 | ET superior/inferior y BN1 con velcro/cara indicada; no deducir el otro borde desde la diferencia |
| M07 · V04 D | Hecho 247×204 | 251,5×214 | +4,5 / +10 | Mismo límite de atribución por borde que C |
| M08 · V07 C | Frontal original con puerta 475×198 | 477×208 | +2 / +10 | ET superior/inferior y remates propios del original; reforma R01 separada |
| M09 · V09 B | Hecho 337×204 | 342×214 | +5 / +10 | BN4 izquierdo, BN1 con velcro suave derecho en el otro lado; ET superior/inferior |
| M10 · L117 / C186 | Detalle longitudinal 320×60 | 329×73 | +9 / +13 | BN4,5 en extremos; ET en ambos bordes largos. Acrílico antracita; sin reserva acreditada |
| M11 · E005 C | **Medida comercial** 70×350 | AL CORTE 70×375 | 0 / +25 | PVC580 arena; varillas según plano. No es comparación de hecho y patrón ni reserva exclusiva acreditada |
| M12 · L219 | Frente/salida nominal del enrollable 70×275 | 70×300 | 0 / +25 | Varilla plana superior, pletina30×6 inferior y refuerzo PVC interior. PDF imprime 3ml; no acredita consumo ejecutado |

M10 aporta un contraste nuevo de entradas de tubo en ambos bordes con diferencia total de 13 en ese eje. No se divide automáticamente en dos márgenes de 6,5 ni se sustituye por el +10 de otros paños. Los casos V03, V05 y V08 conservan contornos, pendientes, esquinas y patrones propios en sus expedientes: sus cajas giradas no se reducen a esta tabla de rectángulos.

### CAD y DXF de marcado de AR2600316

Los bloques DIMENSION *D143–*D146 dan 320, 60, 73 y 329, sin texto sobrescrito y con tolerancia de rotulación inferior a 0,051cm. El DXF de máquina contiene **ocho líneas del cuerpo en ROTULADOR**, con caja **3290×730 unidades DXF**, concordante con **329×73cm** del patrón. Se separa la leyenda junto al origen. Quedan conservadas las entidades y su zona, las cotas y las huellas de DWG/DXF. Se acredita geometría de marcado, sin afirmar ejecución del corte o reserva de rollo.

Para E005 se contrastan además *D19 y *D20, de 70 y 375. El plano D202 p2 identifica la pieza C / OF0226984. Su anidado compartido con las otras OF no permite asignarle todo el tejido del pedido.

## Medidas recuperadas que siguen condicionadas

| Línea / pedido | Fuente y resultado | Límite conservado |
| --- | --- | --- |
| L001 / L003 · AR2500223 / AR2500618 | Croquis y ofertas de intermedios con tubos; la hoja del segundo enlaza el primero y pide aprovechar sus telas | No declarar dos telas nuevas fabricadas ni anular ventas por ese vínculo; sin corte de sus OF localizado |
| L022 · AR2501585 | Lateral en PVC con ventana/solapa, pieza vieja en nave para aprovechar tubos y comprobar confección | Oferta y cotas de visita no son iguales; sin patrón digital acreditado |
| L035 · AR2502360 | Lateral MFD, faldón viejo como patrón y refuerzo superior de 20, escaneo p1 | No es un frontal rectangular 250×150; el libro no identifica su OF |
| L149 · AR2601846 | La hoja p2 acota el lateral y escribe «UN PATRÓN TIENE JOSÉ» | La oferta anterior 250×300 y la visita/venta posterior 201×293 no se restan para obtener un corte |
| L157 · AR2602119 | Hoja posterior de 08/06: ancho 36 entre tubos de enrolle y longitud 220 desde centro de enrolle hasta tornillo de carga; tubo 25 más largo para recortar allí, pasadores con cadenillas | La oferta anterior decía 300×80 en PVC; la hoja posterior escribe AC NEGRO. Conservar los estados; los 25 extra son del **tubo**, sin aumento de tela deducido |
| L164 · AR2602376 | Dos laterales en p2, muestra/tubos viejos en nave y «PLANTEA JOSÉ SANTOS» | El libro y D238 acreditan otras piezas; no adjudicar a los laterales la reserva conjunta de 9,9ml |
| L167 · AR2602384 | Intermedio 66×265 y nota «FAI JOSÉ DIRECTAMENTE» | Los patrones A/B de V09 son de otras OF; no son el corte del intermedio |
| L171 · AR2602544 | Croquis de intermedio sin corte acotado, p5; nota de OF «FAI JOSE» | D243 desarrolla otras telas de 337/363 y total 20,7ml; no trasladarlo al intermedio |
| L207 · AR2603991 | P5 recupera dos intermedios A/B, 23×229 y 29,5×243, con ganchos y pletinas negras | Son cotas de croquis. D288 desarrolla otras telas; sus totales por tejido no acreditan reserva exclusiva de A/B |
| L212 · AR2604755 | Croquis de varios contornos y oferta 256×162 con tubos | Sin corte acreditado; no reconstruir automáticamente un rectángulo desde la oferta |
| L217 · AR2605104 | P3 y oferta p5: dos enrollables de 60×350 y uno de 60×200 | La hoja pide medir tras instalar los toldos y vincula A al toldo vecino. D295 p5 corresponde a la OF de los toldos, no a OF0233133 de los intermedios |

Los casos de muestra física o medición en obra quedan excluidos de la inferencia numérica mientras falte ese paso. No se añaden preguntas de taller para reconstruir todos los trabajos históricos: se conservan sus límites y se eligen para la automatización solo los casos suficientemente acreditados.

## Resultado para la futura ficha y pendientes reales

La futura ficha debe distinguir lateral/frontal, intermedio con tubos, suplemento fijo y enrollable; nuevo, cambio o reforma; estructura nueva o aprovechada; referencias de medida y remates por borde/cara. Cada componente mantiene su tejido y su relación con la OF y el conjunto. El tamaño del patrón, la longitud del tubo y la reserva de rollo son salidas separadas, con su evidencia o dato pendiente.

La búsqueda y el contraste de este subconjunto quedan documentados, incluidos los casos sin corte recuperable. **Siguen pendientes Q-FF01–Q-FF05**, recogidas en la [lista de dudas](./dudas-abiertas.md#faldones-laterales-y-frontales--estudio-iniciado-el-29102026): aprobación de reglas por remate/material, posición habitual de tira, reforma de puerta, altura de ventana y los tres montajes sin identificar. Esta matriz hace concreta la muestra para OT; no sustituye esas decisiones.

No se han cambiado parámetros, cálculos, pantallas, históricos ni reservas de producción. Para pasar a implementación se necesitan las reglas aprobadas y una muestra de aceptación de OT; los estados dudosos seguirán excluidos o requerirán datos explícitos en la ficha.

## Comprobaciones

- Cobertura única de las 56 líneas y sus UUID/OF/cantidades frente al exportado, sin sumarlas de nuevo al censo.
- Huellas de los 59 libros y cotejo directo de las celdas registradas contra sus copias originales; 38 bloques de 34 líneas y 36 grupos libro/OF.
- Reproducción aritmética de Q28, contraste de totales repetidos por OF y conservación de la única diferencia de reserva detectada, en Cortina separada.
- Huellas de 16 DWG, sus conversiones y 14 DXF localizados; seis cotas DIMENSION y ocho entidades del marcado de AR2600316.
- Los 23 escaneos completos y sus 109 páginas, 14 páginas de planos y una vista CAD tienen fuente y huella; no se copian sus datos ajenos a la evidencia técnica.
- Las 12 filas de matriz conservan referencia de entrada, patrón, diferencia, condición y fuente; ninguna aprueba una regla general.
- Comprobaciones de las fases anteriores, enlaces locales y `git diff --check`.

La validación de esta entrega es documental; no modifica código del producto.
