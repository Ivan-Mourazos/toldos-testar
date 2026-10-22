# Cortina de PVC: estudio del plano y del corte

22/10/2026. Estudio para revisar con Iván antes de programar el corte de Cortina y Cambio de cortina. **No se ha cambiado el código de la web ni se ha enviado ningún archivo al taller.**

La cortina con ventana se confecciona con bandas superior e inferior, montantes laterales y cristal. No se puede obtener su corte aplicando directamente las piezas de fachada. Hay una base repetida y comprobable —bastillas laterales, solapes del cristal, varillas y marcas—, pero las alturas del cuerpo y de la bamba tienen variantes que hay que decidir antes de automatizarlas. La ET especial y las solapas tampoco son una simple variante de la tira de fachada.

## 1. Fuentes, comprobaciones y alcance

Se consultó RPS únicamente con `SELECT`. Todos los originales se copiaron a `tmp/cortina-pvc/` de este worktree antes de leerlos o convertirlos. No se arrancó la web, no se escribió en las carpetas compartidas, no se accedió a `BOT/Pendientes` y no se tocó el servidor de producción.

Fuentes originales:

- Líneas y materiales imputados de RPS: `FACOrderSL`, `FACOrderLineSL`, `STKArticle`, `CPRManufacturingOrder` y `CPRImputationMaterialMO`.
- DWG y planteamientos guardados: `\\192.168.0.128\Oftecnica\Oficina Tecnica\2026\TOLDOS\`.
- DXF manuales: `\\192.168.0.128\Oftecnica\maqcorte\2026\ARCHIVOS DXF - MAQUINA NUEVA\`.
- Planteamientos PDF: `\\192.168.0.128\RPS\VENTAS\PLANTEAMIENTOS\2026\`.
- **Pedidos originales escaneados**, localizados por el coordinador: `\\192.168.0.128\RPS\VENTAS\PEDIDOS\2026\AR.26.NNNNN.pdf`. Son necesarios para entender las cotas manuscritas y los cambios posteriores de Oficina Técnica.
- Expedientes [Cortina](cortina.md), [Cambio de cortina](cambio-cortina.md), [dudas abiertas](dudas-abiertas.md), [corte de fachada](../dxf-corte-pvc.md) y código actual de `src/domain/`.

Se copiaron 72 ficheros de planos, cortes y planteamientos, más 13 pedidos escaneados. ODA convirtió las 13 copias DWG a DXF 2018. Se extrajeron 36 PDF de planteamiento, 10 libros y 48 fichas de cortina de la muestra de PVC. Los pedidos escaneados se renderizaron localmente a 200 ppp con PDF.js y canvas porque Poppler no estaba accesible; su lectura manuscrita es visual, **no una extracción automática de cifras**.

Las tablas de este documento proceden de scripts conservados en [tmp/cortina-pvc](../../tmp/cortina-pvc/). `contrastar.mjs` comprueba por pedido su existencia, el artículo Cortina y la prueba de PVC; usa `isPvcFabric` o la indicación expresa de PVC en la línea comercial de RPS. Esto último se identifica aparte: no equivale a tener un consumo ya imputado.

### Muestra comprobada

Tabla generada por `contrastar.mjs` desde las líneas reales de RPS, los planteamientos copiados y el inventario de ficheros.

Pedido | OF cortina | Unidades RPS | Prueba de PVC | Ventana en ficha | Bamba ficha (cm)
--- | --- | --- | --- | --- | ---
AR2605080 | 0233094 | 1 | Lona PVC imputada en RPS | con ventana | 0
AR2604574 | 0232321 | 2 | Lona PVC imputada en RPS | con ventana | 15
AR2604562 | 0232246 | 4 | Lona PVC imputada en RPS | con ventana | 20
AR2604890 | 0232762 | 18 | RPS: descripción comercial expresa PVC | sin ventana | 20
AR2604205 | 0231642 | 8 | Lona PVC imputada en RPS | con ventana | 20
AR2604384 | 0231927, 0231928 | 2 | RPS: descripción comercial expresa PVC | con ventana | 0
AR2604312 | 0231857 | 7 | Lona PVC imputada en RPS | con ventana | 15
AR2603873 | 0231083 | 2 | Lona PVC imputada en RPS | con ventana / sin ventana | 20
AR2602685 | 0229193 | 3 | Lona PVC imputada en RPS | sin ventana | 0
AR2602071 | 0227903 | 2 | Lona PVC imputada en RPS | Ver DWG y PDF | Ver DWG
AR2603636 | 0230751 | 3 | Lona PVC imputada en RPS | con ventana | 20
AR2603269 | 0230081 | 3 | Lona PVC imputada en RPS | con ventana | 0 / 20

Hay **12 pedidos históricos de PVC con DWG y DXF**, además de AR2605193. AR2604727 se comprobó en RPS y se excluyó: consume **Soltis 96**, no sirve para fijar reglas de PVC. AR2604384 lleva Polymar y se acepta por la especificación comercial expresa de PVC; no se ha supuesto que cualquier lona técnica sea PVC.

La columna de bamba describe la ficha de las cortinas. AR2602685 lleva además tres bambalinas como artículo independiente `BAMBA`, OF 0229195: una cortina sin bamba en su ficha no implica que no haya tiras separadas en el mismo pedido.

La presencia de un DXF con el número del pedido tampoco prueba que contenga todo el pedido. **AR2604205 contiene en ese DXF las siete solapas**, no el corte completo de las ocho cortinas. En AR2604890 hay varias disposiciones de corte dentro del mismo fichero; la caja exterior de todas ellas no es un largo de rollo.

## 2. Cómo está armado el DWG

### Dibujo de confección y corte colocado

Los DWG contienen el alzado de confección y, según el pedido, el corte colocado en el rollo debajo o a su lado. El alzado mantiene la orientación de montaje; el corte puede girar piezas para aprovechar la tela. Se dibuja la bamba separada del cuerpo, incluso siendo del mismo material. Entre cuerpo y bamba se anotan **dos varillas blancas**, una en cada pieza: no es una sola costura entre ambas. Lo muestran AR2604574, AR2604562, AR2603636, AR2603873 y AR2604890.

En la cortina con ventana, la banda inferior se identifica habitualmente como **A1**, y la superior como **A2**. Los montantes usan **A3/A4** cuando se numeran; la bamba puede llevar solo **A**. Se repite para B, C y las siguientes cortinas. AR2604312 permite seguir los cuatro lados del marco y los rótulos correspondientes hasta el corte. AR2605080 usa A1/A2 y montantes sin el mismo detalle de rotulado: no hay una nomenclatura histórica única.

AR2604890 agrupa cortinas iguales: «A-B-C», «X3», D «X1», G-H-I, etc. Añade un croquis de situación con las letras A a R, las fachadas y las solapas entre cortinas. Las 18 unidades de RPS comparten la OF 0232762; **la OF no identifica por sí sola cada cortina**.

Hay plantillas y ejemplos viejos fuera de las zonas de trabajo en varios DWG. Las notas de esos ejemplos, por ejemplo «PARA RAMÓN SIEMPRE VARILLA BLANCA», no se han convertido en reglas del pedido. Para AR2604890 se contrastó la zona real de A-B-C, alrededor de X=106–115 del modelo, con la primera página del PDF de confección; las figuras antiguas de otras zonas no son su plano aprobado.

### Capas, colores y unidades

En los planos estudiados se repite:

- `referencias`, ACI 6, rosa: contorno terminado y referencias de montaje. En la ventana también aparece el rectángulo del cristal con su solape; el hueco visible se distingue en `vent-pre-noimpr`. No basta con exportar toda la capa rosa como pieza acabada.
- `cortes - lona`, ACI 7, blanco: piezas de corte en los antiguos. AR2604562 ya dibuja estas piezas en `DISCO1`.
- `MARCA` o `ROTULADOR`, ACI 1, rojo: marcas de confección.
- `texto`, normalmente ACI 106: indicaciones y nombres de paño.
- `cotas`, normalmente ACI 3: cotas impresas. `vent-pre-noimpr`: cotas de corte, ayudas y contornos que no se imprimen. `ejes`: líneas de empates.
- `TEXT - PLANTEA` y variantes de «número de paño»: identificación pequeña; al preparar la máquina aparece también como texto en `ROTULADOR`.

En estos modelos las coordenadas del DWG están en **metros**, y las cotas expresan **centímetros**. Por ejemplo, el contorno de AR2604574 mide 3,21 unidades y se acota como 321. Los DXF de máquina están en **milímetros**, con `$INSUNITS=4`: esa misma banda mide 3210. No se debe multiplicar el DWG por 10 suponiendo que sus coordenadas sean centímetros.

Los DXF históricos no usan todos la misma versión: aparecen AC1015, AC1018 y, en AR2604890, AC1021. Esto describe los originales; la salida de la web debe conservar **DXF 2004**, como está confirmado para el bot, sin copiar las versiones antiguas.

### A4, cajetín y cotas

Los PDF manuales de AR2604890 y AR2604205 son A4 y muestran las dos orientaciones de hoja. AR2604890 reparte la confección en seis páginas y agrupa las cortinas iguales. AR2604205 coloca las siete solapas y su corte en una sola hoja. El cajetín lleva pedido, OF, cliente, técnico, revisión, fecha, página y «Medidas en: CM»; fuera de él aparece «EMPATE: 2 CM». Las capturas A4 conservan la presentación real, además de las ampliaciones del modelo.

Las cotas se disponen de forma que se pueda confeccionar sin medir en el dibujo:

- Frente terminado arriba; frente de corte en la cota auxiliar exterior.
- En el lateral del alzado: altura total del cuerpo y alturas de banda inferior, ventana y banda superior. La altura de bamba se acota aparte.
- Márgenes de ventana a izquierda y derecha junto al hueco.
- En la otra zona de cotas: alturas de corte de las bandas, cristal, montantes y bamba, con los aumentos incluidos.
- En el corte colocado: ancho ocupado y largo de cada grupo de material; cristal y PVC tienen sus propios títulos y medidas.
- En solapas desiguales: largo y ancho en ambos extremos. AR2604205 D tiene un lado oblicuo; no se puede describir solo por ancho y alto de un rectángulo.

## 3. Piezas, empates y aumentos medidos

Todas las medidas siguientes están en centímetros. Son piezas **del primer alzado seleccionado de cada pedido**, no una lista completa de unidades a cortar. `rectangulos-medidos.json` conserva capa, coordenadas e identificador de cada entidad; `comprobar-corte.mjs` busca sus medidas en las líneas del DXF real, permitiendo giros y bordes comunes. El cotejo encuentra tres o cuatro lados presentes en 31 de las 37 medidas distintas analizadas; los restantes requieren comprobar orillos, despiece de empates o diferencias reales, sin darlos por iguales automáticamente.

### Laterales y paños sin ventana

Con «B.N(4)», el ancho de corte de las bandas es **frente de tela +8**, cuatro por lateral. Lo prueban, entre otros, AR2605080: 475,5 → 483,5; AR2604574 A: 313 → 321; AR2604562 A: 449 → 457; AR2603636 A: 387 → 395; AR2602685: 303,5 → 311,5. No son los +9 de escuadrado de fachada.

AR2602685 corta cuerpos sin ventana de 311,5 × 250, con varilla arriba y abajo. AR2604890 A-B-C dibuja un cuerpo de 436 × 447 para frente terminado 428 y alto terminado 440; el empate vertical lo divide en dos paños de **219 × 447**, con 2 cm de solape. Los 219 se leen en los rectángulos auxiliares del DWG: 219 +219 −2 =436. No hay motivo para imponer a esta cortina un empate horizontal por ser el habitual de fachada.

### Marco de la ventana

El marco está **ya despiezado** en las muestras contrastadas: banda de arriba, banda de abajo y dos montantes. Los DXF cortan esas piezas; no se corta primero un rectángulo completo para desechar después un hueco grande. Los montantes pequeños se giran en el rollo: se localizaron sus cuatro lados en el DXF, girados 90°, en AR2605080, AR2604574, AR2604562, AR2604384, AR2603636, AR2603873 y AR2604312.

Tabla generada por `contrastar.mjs`; los identificadores son de la copia DWG convertida por ODA. Se muestran ejemplos suficientes para comprobar la regla y sus variantes.

Pedido | Pieza de corte medida | Cantidad en ese alzado | Identificador
--- | --- | --- | ---
AR2605080 | 483,5 × 79,5 | 1 | E9F8
AR2605080 | 483,5 × 33,5 | 1 | E9F9
AR2605080 | 19 × 166 | 2 | E9FA
AR2604574 | 321 × 69,5 | 1 | EA1D
AR2604574 | 321 × 83,5 | 1 | EA1E
AR2604574 | 19 × 141 | 2 | EA1F
AR2604562 | 457 × 89,5 | 1 | E953
AR2604562 | 457 × 75,5 | 1 | E954
AR2604562 | 54 × 124 | 2 | E955
AR2603636 | 395 × 76,5 | 1 | EA9E
AR2603636 | 395 × 50,5 | 1 | EA9F
AR2603636 | 29 × 137 | 2 | EAA0
AR2603873 | 469 × 94,5 | 1 | 17DF1
AR2603873 | 469 × 65,5 | 1 | 17DF2
AR2603873 | 103,5 × 134 | 2 | 17DF3

En AR2605080, AR2604574, AR2604562, AR2604384 y AR2603636, el montante tiene **esquina +4** y alto de ventana +4. La banda inferior añade **3,5** a su altura terminada para la varilla blanca; la superior añade **3,5** para la negra. El cristal aporta el solape de las uniones. Así, AR2604574 A tiene banda terminada inferior 80 y superior 66: cortes 83,5 y 69,5, cristal 141 para ventana de 137; 83,5 +141 +69,5 −2 −2 =290 de cuerpo de corte.

Hay variantes comprobadas. AR2603873 usa montantes de 103,5 para la esquina rotulada 100; AR2603269 A, 18,5 para esquina 15. La apertura dibujada resulta un centímetro más ancha que frente −2 × esquina en esas dos muestras. Por tanto, **no se debe corregir un centímetro a todas las ventanas ni cambiar esquina +4 por +3,5 como regla general**.

### Bamba de la misma tela o como trabajo separado

La bamba se corta aparte y tiene sus propios remates, aunque sea de la misma lona:

- AR2604574: terminada 15; corte 321 ×21,5, con B.N(3) abajo y varilla blanca arriba.
- AR2604562 y AR2603636: terminada 20; cortes de 26,5 de alto, mismo B.N(3).
- AR2603873: terminada 20; corte de 26. AR2604312: terminada 15; corte de 21. Son variantes del manual, no una justificación para redondear las anteriores.
- AR2604890 A-B-C: terminada 20; corte de 27; el alzado indica B.N(4), también en las puntas. Su variante no debe salir como B.N(3).
- AR2602685: bambalinas nuevas en OF 0229195, separadas de las cortinas de OF 0229193; se cortan con largos y alturas propios, B.N(2) y varilla blanca. El pedido original lleva croquis distintos para A, B y C.

En el cuerpo se conserva la varilla inferior tenga o no bamba, como muestra AR2605080 sin bamba. No se ha encontrado en esta muestra un caso inequívoco de bamba de **otra tela diferente** perteneciente a la misma cortina. La web ya permite escogerla y agruparla por material, pero su confección debe conservar el acabado propio de cortina; no heredar automáticamente el +5 y los +4 de ancho de fachada.

En AR2604890 hay además una cota auxiliar de 26 junto a esa bamba, mientras su contorno mide 27 y esa medida se localiza también en el DXF. En el contraste se ha conservado la geometría cortada; una cota antigua que no se actualizó no se toma como una segunda regla de confección.

### Aumento para escuadrar

AR2602071 sí contiene «AL CORTE - AUMENTO PARA ESCUADRAR» y «PONER A MEDIDA - TIENEN AUMENTO PARA ESCUADRAR». En ese alzado, 442,3 de frente terminado pasan a 452,3 de corte: **+10**, con laterales al corte. Los dibujos ordinarios anteriores llevan +8 por bastillas, no ese acabado. AR2603269 contiene además «NO DAR AUMENTO PARA ESCUADRAR».

El expediente de fachada permite reutilizar el concepto de ajuste manual, pero **la regla “si tiene empate, añadir 9” no queda demostrada para Cortina**. El empate vertical de AR2604890 y los marcos con cristal requieren su propio reparto de material y solapes. No se ha atribuido una nota de aumento de una plantilla al pedido que comparte el DWG.

### Tubo de carga y ET

Con tubo de carga se anota «VARILLA BLANCA (5,5)» en el cuerpo y otra en la bamba. La parte superior de los ejemplos normales lleva «VARILLA NEGRA (4,5)»; el formulario general de la web usa la denominación 5,09 para la negra. Son rótulos que hay que unificar con Iván, sin convertir el número entre paréntesis en centímetros de aumento.

AR2602071 es una **ET especial**, no el ejemplo de una ET ordinaria: «E.T Ø45 tipo sanwich (cortada de 30)», varilla blanca arriba y laterales al corte con aumento. La marca del alzado inferior está a **30 cm del borde**, no a 7. El DXF separa tiras de ET; su geometría no coincide sin más con los rectángulos del alzado.

Tabla generada por `comprobar-corte.mjs` sobre el DXF real de AR2602071:

AR2602071, DXF real | Medida (cm) | Identificador
--- | --- | ---
Bandas superiores A3/B3: lado a lo ancho del rollo | 300,5 | 3E84
Bandas inferiores: alto por pieza | 87 | 3E80
Tiras de ET: ancho entre dos cortes paralelos | 30 | 3E9F / 3EA0
Tira de ET aparte: largo | 502 | 3EA3
Tira de ET aparte: ancho | 30 | 3EA4

El DWG dibuja una banda superior de 303 y una inferior de 115; el DXF tiene paños superiores de 300,5, inferiores de 87 y tiras de 30. No se ha demostrado qué ajuste explica todos esos cambios. No se usa este pedido para fijar el aumento de la ET normal del formulario.

### Solapa con velcro

`SOLAPACONVELCROS` es una pieza y una OF propias: AR2604562, 0232247; AR2604205, 0231643; AR2604890, 0232764. Sus dimensiones no salen solamente del frente de la cortina.

AR2604205 es la prueba más clara: las siete solapas A–G tienen 275 de largo y distintos anchos. A mide 51, B 25,5, C 35,5, E 37, F 26,5 y G 35,5. D es oblicua: **40 en un extremo y 85 en el otro**, con un empate. Todo va «AL CORTE», con «VELCRO BRAVO (5) BLANCO AL CORTE REVÉS» en ambos lados largos. El pedido original, página 4, proporciona esos croquis; el PDF de confección los desarrolla y el DXF lleva su corte.

AR2604562 y AR2603636 ponen el velcro **suave por derecho, después de la bastilla**, de 5 cm. AR2604890 especifica **suave por revés** en las cortinas y **bravo negro por derecho** en sus solapas AB, BC, CD, JK, KL y LM. Por eso la cara del velcro no se puede fijar para todos a partir del único campo «Velcro» actual. El color también es un dato de trabajo, no una consecuencia segura del color del PVC.

## 4. Marcas y textos para confeccionar

### Líneas de rotulador

Las líneas rojas de las bandas de cuerpo con varilla están normalmente a **7 cm del corte exterior**. Al dibujar el terminado, quedan a 3,5 cm de su borde rosa, con otros 3,5 de margen de corte: son referencias para el doblez de la vaina. En AR2605080, AR2604574, AR2604562, AR2604384 y AR2603636 las líneas empiezan y terminan **4 cm dentro de cada lateral de corte**, y recorren el frente terminado. No son líneas de cuchilla ni un rectángulo de bastilla lateral que deba inventarse.

En los montantes del marco no se han encontrado las mismas líneas longitudinales de varilla. Sí aparecen identificaciones pequeñas para casar las uniones. El velcro se indica en el alzado con sus bandas y notas de cara y altura; eso tampoco autoriza a exportar sus dos bordes gráficos como nuevas líneas de rotulador.

La bamba tiene variantes: marcas a **7** del corte superior en AR2604574, AR2604562 y AR2603636; a **6,5** en AR2603873 y AR2604312. La ET especial de AR2602071 cambia la marca inferior a **30** y no retira 4 cm en los laterales al corte.

Muestra de la tabla de coordenadas que genera `contrastar.mjs`, leyendo las líneas reales dentro de cada rectángulo:

Pedido | Rectángulo de corte | Desde arriba | Desde abajo | Retiro izquierdo | Retiro derecho
--- | --- | --- | --- | --- | ---
AR2605080 | 483,5 × 79,5 | 7 | 72,5 | 4 | 4
AR2605080 | 483,5 × 33,5 | 26,5 | 7 | 4 | 4
AR2604574 | 321 × 21,5 | 7 | 14,5 | 4 | 4
AR2604562 | 457 × 26,5 | 7 | 19,5 | 4 | 4
AR2603636 | 395 × 26,5 | 7 | 19,5 | 4 | 4
AR2603873 | 469 × 26 | 6,5 | 19,5 | 4 | 4
AR2602071 | 452,3 × 115 | 85 | 30 | 0 | 0
AR2604312 | 173,5 × 21 | 6,5 | 14,5 | 4 | 4

### Mininúmeros, letras y OF

Los DXF de AR2605080, AR2604574, AR2604562, AR2604384 y AR2604312 contienen letras/números pequeños de **10 mm de alto en `ROTULADOR`**. Van dentro de las zonas de unión, junto a sus extremos, y permiten relacionar las piezas del marco después de colocarlas o girarlas. No son la letra grande del centro. En AR2605080 se leen A1 y A2 a ambos lados de la separación entre las bandas; en AR2604312 hay A1–A4 y sus correspondientes B, C, etc.

La posición exacta del punto de inserción de los textos antiguos no es uniforme. En AR2605080 el DXF coloca los puntos de A1/A2 a 1,25 y 0,75 cm de la línea de separación, respectivamente. No se ha supuesto que todo rótulo esté centrado a una distancia fija del contorno. AR2604890 también contiene textos diminutos de 0,01 mm en una parte de su exportación; es una anomalía del original, no un tamaño que deba reproducir la web.

Las letras grandes se escriben en `texto`; en los ejemplos sencillos de máquina miden 150 mm, y pueden estar giradas con la pieza. «REVÉS» indica la cara para colocar la tela. AR2604384 y AR2602685 incluyen la OF en el corte; debe mantenerse junto a una letra única por cortina. AR2604205 tiene letras A–G de **solapas**, mientras otras letras del DWG identifican **cortinas**: el identificador debe incluir el tipo de pieza para no mezclarlas.

La web **ya tiene** `numerosDeUnion` dentro de `dibujoCorte.js`: escribe números de unión de 10 mm, a 1 cm del borde y de cada punta, según la decisión del 22/10 para el corte existente. No falta inventar esa función. Lo que falta para Cortina es describir **qué borde se une con cuál**, incluyendo montantes y cristal; su función actual supone una cadena de paños de fachada y no sirve directamente para deducir las uniones de un marco.

### Qué se escribe y dónde

Los rótulos reales forman parte de la confección:

- Encima del cuerpo: «VARILLA NEGRA (4,5)» o la blanca que corresponda.
- En los laterales: «B.N(4)», o la nota completa de velcro suave, anchura, cara, posición después de la bastilla y altura hasta donde llega.
- Junto a las dos piezas inferiores: «VARILLA BLANCA (5,5)» dos veces, más B.N(3) o B.N(4) en el bajo de la bamba.
- Junto a las uniones que lo requieren: «EMPATE 2 CM», «EMPATE», o la indicación de escuadrar y poner a medida.
- Dentro del paño: letra de cortina y pieza; en la disposición de corte, «REVÉS» y, cuando procede, OF.
- Encima de cada grupo de corte: material, color y cristal, por ejemplo «PVC 580 GR ARENA» y «TRANSPARENTE 650 MI».
- En notas de taller, fuera del contorno: particularidades del pedido. AR2604574 añade mordazas, cintas y mosquetones; AR2604890 añade el croquis de situación y la referencia de cada frente. Estas notas no cambian por sí mismas una medida de corte.

En el modelo de los planos sencillos se repiten alturas de **0,10 m** para notas de confección, **0,12 m** para cotas terminadas, **0,08 m** para cotas de corte, **0,15 m** para letras y **0,01 m** para mininúmeros. Son tamaños del modelo, que la ventana gráfica reduce al imprimir. Las cotas generales del corte colocado llegan a 0,25–0,40 m en varios pedidos. La web debe ajustar su legibilidad al A4; no tomar 10 cm del modelo como tamaño de texto en papel.

## 5. Ventanas y cristal

### Hueco visible y cristal que se corta

En los cinco ejemplos siguientes se comprueba **cristal = hueco visible +4 en ancho y +4 en alto**, es decir, 2 cm por borde. La comparación usa el rectángulo de apertura en `vent-pre-noimpr` y el del cristal en `referencias`; son entidades diferentes del mismo alzado.

Tabla generada por `contrastar.mjs`:

Pedido | Hueco visible (cm) | Cristal con solape (cm) | Identificadores
--- | --- | --- | ---
AR2605080 | 445,5 × 162 | 449,5 × 166 | E9F3 / E9F4
AR2604574 | 283 × 137 | 287 × 141 | EA13 / EA14
AR2604562 | 349 × 120 | 353 × 124 | E949 / E94A
AR2604384 | 73 × 135 | 77 × 139 | EAF7 / EAF8
AR2603636 | 337 × 133 | 341 × 137 | EA95 / EA96

El frente de apertura parte del frente de tela y las esquinas. En AR2604574 A: 313 −15 −15 =283. En AR2604562 A: 449 −50 −50 =349. Las diferencias de un centímetro de AR2603873 y AR2603269 se conservan como ajustes históricos: su apertura medida, no solo su cota rotulada, es la que permite reproducir el corte.

La reserva actual de cristal que cita el expediente de Cortina, frente −2 × esquina +10, **no es el rectángulo de corte observado**. No se deben trasladar esos 10 cm al DXF como si fueran el solape.

### Cristal más alto que el rollo

AR2605080 tiene una ventana visible de 162 y cristal de 166 de alto. El cristal se gira y se divide **a lo ancho de la ventana**. El DXF contiene tres piezas de **166 ×141** y dos tiras de **166 ×17,25**, estas últimas compartiendo un contorno de 166 ×34,5. El DWG indica cuatro «EMPATE 2 CM» verticales dentro de la ventana:

**141 +141 +141 +17,25 +17,25 −4 ×2 =449,5**, el ancho total del cristal con sus solapes exteriores. No son cinco ventanas ni cinco huecos en el PVC. Es una sola ventana de cristal compuesto. Estas medidas salen de las líneas 20FE–2105 del DXF, conservadas en `cad.json`.

El artículo de RPS dice cristal de 140 de ancho, pero esta disposición y las de AR2604574/AR2604312 usan alturas de corte de **141**. Otras usan 137 o 134. Falta decidir el ancho útil que debe recibir el generador; no se puede sustituir siempre el ancho del artículo por 141.

AR2602071 incluye un vano partido en dos cuerpos, y AR2604312 siete cortinas con sus respectivos marcos. No se ha encontrado en esta muestra una prueba inequívoca de **varias ventanas independientes dentro de un único cuerpo**. La web tiene una ventana por cortina; para varias ventanas dentro del mismo paño faltan medidas y un ejemplo aprobado. Los empates del cristal de AR2605080 no justifican inventar montantes adicionales de PVC.

### De dónde se miden las alturas

La regla vigente, confirmada por Iván el 02/10, es independiente de los aumentos de la tela: si la cota es desde suelo, el dibujo resta 18; si es desde tubo de carga, se representa tal cual. `curtainWindowDrawingHeight` hace esa cuenta. La salida de la ventana es la salida del toldo; no se pide una segunda salida.

Las fichas antiguas no siempre contienen el valor manuscrito literal. Tabla generada por `proponer-5193.mjs`, usando las transcripciones visuales identificadas por página y los planteamientos reales:

Pedido | Página escaneada | Alto ventana croquis | Alto en ficha | Cota inferior croquis | Valor inferior en ficha
--- | --- | --- | --- | --- | ---
AR2604574 | 1 | 136 | 137 | 80 | 98
AR2603636 | 1 | 140 | 133 | 65 | 65
AR2603873 | 1 | 130 | 130 | 80 | 80

En AR2604574, la ficha 98 y el dibujo 80 forman la resta de 18, aunque en el pedido se lee 80. En AR2603636, el alto de cristal pasa de 140 en el croquis a 133 en ficha y alzado, y se corta a 137. **Estos cambios de Oficina Técnica no demuestran una resta universal de 1, 3 o 7 cm a las ventanas.** La web debe conservar la medida decidida por el técnico y su referencia, sin aplicar una corrección histórica otra vez.

## 6. Regla de cada medida y contraste con la web

Los datos disponibles hoy son suficientes para la cortina ordinaria con una ventana: frente, salida, accionamiento, bamba y material, laterales, acabado de abajo, esquina, alto de ventana, cota inferior y su referencia. Para Cambio de cortina se conserva además varilla o remachado arriba.

La correspondencia es:

- **Frente de tela**: `calculation.fabricWidth`. En Cortina completa se descuenta al frente 12,5 con máquina exterior, 12 con interior y 11 con motor, salvo ajuste guardado. Cambio de cortina toma el frente medido. No se vuelve a descontar del frente calculado al construir las piezas.
- **Caída calculada**: `fabricDrop`. La regla vigente es salida +40; +10 si abajo lleva ET; bamba +5 si va en la misma tela; más el ajuste elegido en la tarjeta. Sin bamba no se añade ese +5. Con bamba en otra tela, cuerpo y bamba se calculan por separado.
- **Posición inferior de ventana**: `curtainWindowFloorHeight` y `curtainWindowReference`. Solo el dibujo resta 18 desde suelo. El ajuste de tela no modifica esa referencia.
- **Hueco visible**: frente de tela y `curtainWindowCorner`, más `curtainWindowHeight`. Los ajustes manuales de los dibujos antiguos no están contenidos necesariamente en esos campos.
- **Cristal de corte**: apertura aprobada +4 en ambas dimensiones en la muestra ordinaria. Después se despieza si no cabe en su rollo.
- **Bandas de PVC**: frente de tela +8 con B.N(4); alturas determinadas por la ventana, el cuerpo terminado y las vainas. No se puede repartir solo `fabricDrop` en paños enteros ignorando el cristal.
- **Montantes**: esquina, alto de cristal y acabado lateral. Predomina esquina +4; se han medido otras variantes.
- **Bamba física**: altura terminada y su remate real; separada del cuerpo aunque sea de la misma tela. El +5 de la caída calculada no reproduce todas las tiras manuales.
- **Velcro**: su altura calculada sigue la salida y el ajuste de tela, según el expediente vigente. El corte necesita además anchura, cara, color y los extremos que se deben coser o soldar. Esos detalles se leen en las notas, no se deducen de la tela.
- **Solapa**: necesita sus propios largo, anchos y, si los tiene, desnivel y empates. RPS la identifica como trabajo aparte; la ficha actual de Cortina no proporciona todo eso.

### Caída calculada frente al desarrollo de las piezas

No son magnitudes intercambiables. Esta tabla la genera `contrastar.mjs`: recalcula las fichas web con el código actual y las fichas antiguas con los datos de frente, salida y bamba, sin descuento inferior; mide el desarrollo del cuerpo en el DWG y añade la tira de bamba medida. Son las primeras cortinas seleccionadas y **no metros de reserva de rollo**.

Pedido | Frente tela web | Frente corte | Caída web actual | Cuerpo de corte en DWG | Bamba de corte | Suma cuerpo + bamba | Diferencia
--- | --- | --- | --- | --- | --- | --- | ---
AR2605080 | 475,5 | 483,5 | 275 | 275 | 0 | 275 | 0
AR2604574 | 313 | 321 | 310 | 290 | 21,5 | 311,5 | 1,5
AR2604562 | 449 | 457 | 310 | 285 | 26,5 | 311,5 | 1,5
AR2604384 | 113 | 121 | 240 | 240 | 0 | 240 | 0
AR2603636 | 387 | 395 | 285 | 260 | 26,5 | 286,5 | 1,5
AR2603873 | 461 | 469 | 315 | 290 | 26 | 316 | 1
AR2602685 | 303,5 | 311,5 | 260 | 250 | 0 | 250 | −10
AR2603269 | 383 | 391 | 225 | 218 | 0 | 218 | −7
AR2604890 | 428 | 436 | 465 | 447 | 27 | 474 | 9
AR2604312 | 165,5 | 173,5 | 290 | 269 | 21 | 290 | 0

Las diferencias no autorizan a cambiar la regla confirmada de la web. Explican por qué falta definir el despiece: AR2604574/4562/3636 repiten 1,5 más en la tira; AR2604890 tiene otro acabado de bamba y otro criterio de altura del cuerpo sin ventana; AR2602685 iguala tres cuerpos pese a las salidas distintas. Son decisiones de confección que deben ser explícitas.

AR2605080 también enseña por qué no basta la descripción comercial: RPS dice frente 483, pero la ficha web aprobada utiliza **488**, calcula 475,5 de tela y coincide con el DWG. No se ha sustituido ese frente por el antiguo para forzar una igualdad.

## 7. Colocación en el rollo y separación de materiales

Los cortes aprovechan los huecos, comparten líneas y omiten los orillos. Los montantes se giran; una pieza desplazada no conserva su orientación del alzado. AR2604574 coloca el paño superior B2 sobre otros paños y mete montantes en el hueco; AR2603873 gira los montantes A3/A4; AR2604890 gira paños largos y reparte grandes grupos. Por tanto, **orden del alzado y orden de corte son dos cosas distintas**: se conserva la relación mediante letras y marcas.

Varios DXF manuales incluyen un grupo de cristal y otro de PVC, separados en el espacio y con sus títulos. No significan que se corten en el mismo rollo. La agrupación futura debe hacerse por **material y ancho útil**, como ya hace la web para la lona. AR2605080 incluso divide su cristal en dos disposiciones; no se debe reservar la distancia vacía entre ellas.

Los rectángulos ordinarios pueden pasar al colocador actual con sus giros. Una solapa oblicua, como AR2604205 D, requiere mantener el contorno y sus bordes de unión; no basta con cortar la caja que la contiene. Tampoco se puede calcular el consumo de AR2604890 por la caja exterior del DXF, porque contiene varias disposiciones separadas.

## 8. AR2605193

### Datos que constan en los originales

RPS confirma `CORTINAUNI`, OF **0233272**, **3 unidades de 312 ×250**, manuales, PVC 580 marfil 1013, lacado marrón 8014, ventana transparente y bamba recta de 15. En la consulta no había material consumido todavía.

El pedido escaneado `PEDIDOS/2026/AR.26.05193.pdf`, página 1, añade:

- Tres croquis válidos de frente 312; un cuarto está tachado. Dos frentes se agrupan bajo 624 y el tercero bajo 312.
- Ventana de **136 de alto**, márgenes laterales **20** y distancia inferior **75** en los tres.
- Máquinas MFI, MFD y MFI en las tres columnas; esto fija el lado, **no** si son interiores o exteriores.
- Bamba de la misma tela, recta de 15, y sin rotulación en tela ni bamba.

No hay rótulo que diga suelo o tubo junto a los 75. La flecha llega a una línea bajo la bamba, pero esa representación no basta para introducir la referencia con seguridad. Tampoco hay una prescripción expresa de velcro o ET. Se ha dejado constancia de estas limitaciones en `lectura-escaneados.json` y se conserva la ampliación [del croquis](../../tmp/cortina-pvc/capturas/AR2605193-pedido-croquis.png).

Al recoger los ficheros no se encontró planteamiento en `PLANTEAMIENTOS/2026`, ni DWG/PDF/libro del pedido en `TOLDOS`, ni DXF de máquina con ese número. **Por tanto, todavía no hay un plano manual que comparar**: el escaneado es el pedido del cliente, no el plano de confección de Oficina Técnica.

### Cómo quedaría el plano

Propuesta para revisar: tres cortinas A, B y C, con sus máquinas en los lados indicados; ventana y bamba aparte en cada alzado; OF 0233272 en las piezas; PVC marfil y cristal en grupos separados. El A4 llevaría frente terminado, altura del cuerpo, bamba 15, esquinas 20, ventana 136 y cota inferior con su referencia escrita. Las notas de varillas, bastillas y cara irían junto a sus bordes, y el cajetín identificaría técnico y revisor.

Para cuantificar una opción se ha usado **el acabado de AR2604574**, que tiene la misma salida de 250 y bamba de 15: B.N(4), varilla negra arriba, blanca abajo y bamba con blanca y B.N(3). Su cuerpo de corte mide 290 y el terminado 283. Es una **propuesta condicionada** a que Iván confirme ese acabado y la medida de ventana; no una nueva regla aprobada.

### Cómo quedaría el corte

Tabla generada por `proponer-5193.mjs`, leyendo RPS, el PDF escaneado, la transcripción visual y las piezas medidas de AR2604574. Unidades de piezas en centímetros. A1 es banda inferior, A2 superior, A3/A4 montantes y A la bamba; se repite el mismo despiece para B y C.

Máquina | Referencia de 75 | Frente tela | Cota inferior dibujada | Banda inferior A1 | Banda superior A2 | Montantes A3/A4 | Bamba A | Cristal A | Rollo PVC / cristal (m)
--- | --- | --- | --- | --- | --- | --- | --- | --- | ---
MAQ. INTERIOR | SUELO | 300 | 57 | 308 ×60,5 | 308 ×93,5 | 2 ×24 ×140 | 308 ×21,5 | 264 ×140 | 9,24 / 7,92
MAQ. INTERIOR | TUBO DE CARGA | 300 | 75 | 308 ×78,5 | 308 ×75,5 | 2 ×24 ×140 | 308 ×21,5 | 264 ×140 | 9,24 / 7,92
MAQ. EXTERIOR | SUELO | 299,5 | 57 | 307,5 ×60,5 | 307,5 ×93,5 | 2 ×24 ×140 | 307,5 ×21,5 | 263,5 ×140 | 9,225 / 7,905
MAQ. EXTERIOR | TUBO DE CARGA | 299,5 | 75 | 307,5 ×78,5 | 307,5 ×75,5 | 2 ×24 ×140 | 307,5 ×21,5 | 263,5 ×140 | 9,225 / 7,905

Estas longitudes son para **las tres cortinas juntas**, calculadas con `colocar`, sin sacos, en un rollo de PVC supuesto de 250 y cristal supuesto de 140 útil. No son una reserva aprobada ni prueban qué referencia está asignada al pedido. Si el cristal útil fuera 137, el rectángulo de 140 no cabría y habría que decidir material o empate.

Por cortina saldrían cinco piezas de PVC y una de cristal sin empates interiores; en total, **15 piezas de PVC y 3 de cristal**, bajo esas condiciones. Las bandas grandes y bambas van a lo largo del rollo porque superan 250; los montantes admiten giro. Las marcas de cuerpo irían a 7 cm de los bordes exteriores y a 4 de las puntas; la bamba seguiría la marca de 7 del ejemplo elegido. La web calcula caída 310, mientras cuerpo 290 + bamba de corte 21,5 suman 311,5: esa diferencia queda a la vista para decidirla, no se oculta en una reserva.

## 9. Qué se puede reutilizar y qué falta

Se ha comprobado el código actual, además del estudio de fachada:

- **`colocacion.js`**: reutilizable tal cual para las piezas rectangulares, sus giros y la búsqueda de menor largo. `sacosEnHuecos` y la opción de trozo separado ya existen. Su aplicación debe hacerse dentro de cada material; este estudio no establece una regla nueva para rellenar con sacos un rollo de cristal.
- **`dxfCorte.js`**: se puede reutilizar el escritor DXF 2004, unidades, leyenda, codificación y capas del bot. El dibujo que se le entregue debe contener únicamente cortes, marcas y textos del material correspondiente.
- **`cajetin.js`, `presentacion.js` y conversión ODA**: se pueden reutilizar el cajetín A4, los datos de revisión y el reparto de zonas. Faltan los alzados propios de Cortina y la paginación necesaria para pedidos de muchas cortinas, como AR2604890.
- **Agrupación por tela y bamba en otra tela de `index.js`**: ya existe. Hay que incorporar el cristal como material de corte, con su artículo y ancho útil; hoy el flujo entra por los modelos de fachada y comprueba `PLASTICA (LONA)`.
- **`despiece.js`**: sus modelos registrados son Arzúa, Galicia, Monoblock y Cambio de tela. Hace falta un despiece de Cortina y Cambio de cortina con cuerpo, marcos, cristal, bamba y acabados. Las solapas requieren una pieza propia con datos independientes.
- **`dibujoCorte.js`**: ya une bordes comunes, evita cortar orillos, gira marcas/textos y escribe números de unión. Se puede conservar esa infraestructura; deben ampliarse la descripción de uniones y las marcas por pieza. Sus retiros actuales de 15 mm para cuerpo y 20 mm para tira no son los **40 mm** medidos en estas cortinas; tampoco su marca de tira de 65 mm reproduce siempre los 70 mm observados.
- **Contornos especiales**: el colocador y el dibujante rectangular no resuelven por sí solos la solapa oblicua de AR2604205. Hace falta una representación de ese contorno y sus marcas, o mantener el caso como manual hasta implementarlo.
- **Estado del modelo y flujo de revisión**: se pueden conservar los servicios existentes de archivo, revisión y envío de corte. No debe declararse Cortina lista hasta que las piezas y sus dudas estén resueltas y contrastadas con estos originales.

La futura entrada de corte deberá conservar separadas la medida del pedido, el contorno terminado, la pieza de corte y la colocación. También hará falta guardar los ajustes de confección, cara del velcro, ancho útil del cristal y relación entre bordes que se sueldan. Hoy algunos solo están en notas o en geometría del DWG.

## 10. Dudas para Iván

Solo se plantean decisiones que afectan al corte que generará la web:

1. **Altura del cuerpo y bamba.** ¿Tomamos como base para las cortinas con ventana el cuerpo de los ejemplos AR2604574/4562/3636, y bamba de alto +6,5 con B.N(3), marca a 7? Hay tiras de +6 y de +7 con otros remates, y AR2604890 sin ventana añade 7 al cuerpo respecto al reparto de la caída calculada. Hace falta decidir qué acabado lleva cada variante; la regla de caída de la web confirmada el 02/10 se conserva.
2. **Ventana y ancho de cristal.** ¿El técnico introduce siempre el hueco visible definitivo y la web suma 2 cm de solape por lado? ¿Qué ancho útil usamos para cada cristal de RPS: 137, 140 o los 141 que aparecen en algunos cortes? En AR2603636 el pedido pide 140 de alto y el plano hace 133; en AR2604574 pasa de 136 a 137. Si se cambia para que quepa en el rollo, hay que indicarlo antes de generar.
3. **ET normal.** El formulario suma 10 a la tela con ET, pero la prueba medida es una ET especial Ø45 de 30, con cambios entre DWG y DXF. ¿Qué ancho de vaina, corte inferior y marcas debe hacer la ET ordinaria? Para la especial, ¿se introducirán ancho y piezas de vaina aparte?
4. **Velcro y solapas.** ¿Qué acabado ponemos por defecto y qué debe poder elegir el técnico: suave/bravo, derecho/revés, ancho, color y altura? Hay caras opuestas entre AR2604562 y AR2604890. Para las solapas necesitamos largo y ancho de ambos extremos, además del vínculo entre cortinas; el frente y la altura de Cortina no bastan.
5. **Variantes de ventana.** ¿La primera versión admitirá solo una ventana por cortina, dejando las demás para dibujo manual? No hay prueba suficiente de varias ventanas independientes dentro de un mismo cuerpo; sí la hay del cristal compuesto de AR2605080. También queda por decidir si la pequeña diferencia de montantes de algunos planos se guarda como ajuste de corte.
6. **Escuadrado de Cortina.** ¿Cuándo debe añadirse y con cuántos centímetros, distinguiéndolo de los 4 por lateral de B.N(4)? El caso al corte AR2602071 lleva +10; los datos no justifican aplicar los +9 de fachada a todo empate de cortina.
7. **AR2605193.** Confirmar si los 75 son a suelo o a tubo, máquina interior o exterior, y el acabado lateral/inferior. La propuesta conserva el 136 que se lee en el croquis; confirmar ese hueco antes de elegir el cristal útil. Con esas respuestas se escoge una de las cuatro variantes de la tabla y se revisa el plano.

## 11. Evidencia local y reproducción

Todo está bajo `tmp/cortina-pvc/`, ignorado por Git. El commit contiene este documento; los originales, scripts y capturas quedan en el worktree para la revisión.

Scripts de recogida y lectura:

1. `recoger.mjs`: SELECT a RPS y copia de originales; genera `rps.json`, `inventario.json` y `esquemas.json`. Solo necesita acceso de lectura a RPS y las carpetas indicadas. Lee las credenciales de la configuración local sin imprimirlas.
2. `extraer.mjs`: convierte las copias DWG con ODA y extrae PDF, adjuntos de revisión y valores de los libros. `--sin-oda` reutiliza la conversión.
3. `analizar-cad.mjs`: extrae geometría, capas, textos y cotas a `cad.json`; respeta las transformaciones de bloques y los textos UTF-8 de los DXF modernos.
4. `contrastar.mjs`: genera `pedidos-verificados.json`, `entradas.json`, `rectangulos-medidos.json`, `comparacion-web.json` y `tablas.md`, y exige al menos ocho pedidos de PVC con DWG y DXF.
5. `comprobar-corte.mjs`: coteja dimensiones del DWG con los lados de corte presentes en DXF; guarda sus coordenadas y limitaciones en `contraste-dwg-dxf.json`, `tabla-dwg-dxf.md` y `tabla-et.md`. Una coincidencia de dimensiones no se presenta como identificación completa de todos los paños.
6. `copiar-pedidos.mjs` y `leer-pedidos.mjs`: copian los pedidos escaneados y generan sus PNG a 200 ppp. `lectura-escaneados.json` identifica las lecturas manuscritas; no simula que procedan de OCR.
7. `proponer-5193.mjs`: comprueba la transcripción contra RPS, lee el escaneado y las piezas de referencia, recalcula las cuatro condiciones y las coloca con la función existente. Guarda la huella del escaneado y la propuesta en `propuesta-5193.json`, sin generar un archivo de producción.
8. `capturar.mjs` y `capturar-pdf.mjs`: generan las vistas del CAD y las hojas A4 originales en `capturas/`. Las capturas CAD son una representación local de entidades del original, no una captura de AutoCAD; las hojas PDF conservan la presentación impresa.
9. `validar-informe.mjs`: comprueba que las ocho tablas del documento coinciden con los datos del análisis, que existen los pedidos citados y los enlaces locales, y guarda las huellas SHA-256 de los 85 originales copiados en `huellas-originales.json`.

Capturas representativas inspeccionadas:

- [AR2605080: alzado y corte](../../tmp/cortina-pvc/capturas/AR2605080-dwg-general.png), [ventana y cotas ampliadas](../../tmp/cortina-pvc/capturas/AR2605080-dwg-ventana-cotas.png), [DXF](../../tmp/cortina-pvc/capturas/AR2605080-dxf-general.png), [mininúmeros ampliados](../../tmp/cortina-pvc/capturas/AR2605080-dxf-mininumeros.png).
- [AR2604562: conjunto](../../tmp/cortina-pvc/capturas/AR2604562-dwg-general.png), [marcas y velcro](../../tmp/cortina-pvc/capturas/AR2604562-dwg-velcro-marcas.png), [DXF](../../tmp/cortina-pvc/capturas/AR2604562-dxf-general.png).
- [AR2604890: A-B-C y D](../../tmp/cortina-pvc/capturas/AR2604890-dwg-panos-A-D.png), [solapas](../../tmp/cortina-pvc/capturas/AR2604890-dwg-solapas.png), [DXF](../../tmp/cortina-pvc/capturas/AR2604890-dxf-general.png), [A4 original](../../tmp/cortina-pvc/capturas/AR2604890-pdf-A4.png).
- [AR2602071: alzado y corte](../../tmp/cortina-pvc/capturas/AR2602071-dwg-general.png), [ET y cotas](../../tmp/cortina-pvc/capturas/AR2602071-dwg-ET-cotas.png), [DXF](../../tmp/cortina-pvc/capturas/AR2602071-dxf-general.png).

Como apoyo: [A4 de las solapas AR2604205](../../tmp/cortina-pvc/capturas/AR2604205-pdf-A4.png), [detalle de sus solapas en DWG](../../tmp/cortina-pvc/capturas/AR2604205-dwg-solapas.png), [montantes girados de AR2603873](../../tmp/cortina-pvc/capturas/AR2603873-dxf-ventana.png) y [croquis de AR2605193](../../tmp/cortina-pvc/capturas/AR2605193-pedido-croquis.png).
