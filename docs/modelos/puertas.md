# Puertas Portanova · fase 1

Reglas de confección vigentes a 21/10/2026. Las respuestas de Iván, incluidas las recibidas durante este encargo, prevalecen sobre los cortes históricos. Todas las medidas de este expediente y del configurador están en centímetros; los diámetros de tubo y el DXF del bot están en milímetros.

## Alcance y fuentes

Tres modelos genéricos: enrollable (`PUERTAENR`), apilable (`PUERTAPLE`) y autorreparable (`PUERTAUTO`). El técnico mira el dibujo del cliente y configura cada puerta y su OF; la web no interpreta pedidos escaneados ni deduce tubos, cintas o ventanas por el frente. Se pueden configurar varias puertas del mismo pedido, con cantidades de puertas iguales confirmadas por el técnico.

Las fuentes están en `tmp/dxf-estudio/puertas/` del repositorio principal, leído desde su ruta absoluta durante el encargo:

- `plegables/respuestas-ivan.md`, incluidos los puntos 13–15 y la corrección del doble saco.
- `genericas/INFORME.md` y `genericas/dudas.md`, con las respuestas posteriores sobre bajo, entradas y empate de enrollable.
- `plegables/configuraciones/CONFIGURADOR.md` y `CATALOGO.md`.
- Medidas originales: `genericas/contraste.json`, `plegables/verificacion/verificacion.json` y `plegables/configuraciones/configuraciones.json`.

Solo se han copiado identificación y medidas necesarias a las fixtures de `src/puertas/__fixtures__/`, sin rutas empresariales ni datos de red. Para el contraste adicional solicitado por Iván, AR2604662 no estaba en el estudio: se copiaron en solo lectura su DXF y su DWG a `tmp/puertas-bolsillo/AR2604662/` del worktree. ODA convirtió únicamente esa copia local, con todos los temporales dentro de `tmp/`; los originales no se modificaron.

Quedan fuera rejilla, mosquitera, malla, franja corrida, marcos sueltos y recambios. Guardar para revisión, Pedidos, CoordinaOT, el plano DWG y el envío del DXF llegaron en la fase 2 (22/10/2026, ver abajo). No hay reserva en RPS (Iván: «No se reserva el pvc»).

## Enrollable

F = frente; H = alto terminado; T = desde arriba hasta el eje superior del ventanal; D = entre sus dos ejes; m = margen lateral terminado. Se identifica el ventanal del dibujo, sin asumir que sea el primer tramo de tubos desde arriba.

| Pieza | Corte |
|---|---|
| Paño superior, antes de empatar | F × (T + 7,25) |
| Paño inferior, antes de empatar | F × (H − T − D − 7,25) |
| Cristal | (F − 2m + 4) × (D − 3,5) |
| Cachos laterales, dos piezas | (m + 1) × (D − 3,5) |
| Entrada suelta | Largo indicado × 8 |
| Saco | Envolvente (F + 6,5) × 26, con pestaña de 6,5 × 11 entre las cotas 13 y 24 |
| Bolsillo, solo si lo piden | Solo dos marcas de posición; no se corta ninguna pieza |

El saco conserva su contorno de ocho vértices; la envolvente no lo sustituye. La cota del bajo es **13**. Iván confirmó durante el encargo que los 125,75 de AR2603284 y AR2603277 fueron errores: debían ser 123,75. El paño inferior se calcula, sin un campo para alterar su medida.

Las entradas **se acotan de 7,5 y se cortan de 8**. Si un paño no cabe, se intenta el giro. Si necesita empate y hay una entrada viable en ese tramo, se incorpora esa entrada al paño inferior: suma 7,5 y se corta una tira menos. Se elige la más alta que permite caber en el rollo; el técnico puede cambiarla. Sin una entrada viable, se hace una unión horizontal normal de 2, con números de unión en ROTULADOR. La lógica de reparto está compartida con la apilable en `src/puertas/empates.ts`; el solape de entrada procede del parámetro de cada modelo.

Las notas de confección del alzado recogen: varilla negra Ø4,5 arriba, interior de entrada 5–5,5, electrodo de 2, huecos de 3, velcro de 3 bravo al revés y suave al derecho, soldadura del saco negro de 2 como máximo y pisado de entradas de 1. Fuente: plano AR2604069 y respuestas de Iván transmitidas por el coordinador.

## Apilable

El técnico introduce pie, cada paso y cabecera. Su suma debe ser H. La cadena se cuenta desde abajo. Las entradas llevan largo, diámetro, alto de corte y huecos propios; Ø30 propone 12 y Ø42 propone 13,5. Una medida distinta queda señalada para revisión.

El bolsillo superior propuesto es de 24: su aumento de corte es la mitad, no el bolsillo completo. Con saco sencillo de 80 cuelgan 11; con saco sencillo de 120 cuelgan 12. Para el perfil de bolsillo 24:

| Acabado | Suma de altos de paños |
|---|---|
| Saco sencillo de 80 | H + 1 + suma de entradas incorporadas |
| Saco sencillo de 120 | H + 0 + suma de entradas incorporadas |
| Doble saco | H + 25,5 + suma de entradas incorporadas |

Fuente del saco de 120 sencillo: AR2603869, H 390, un empate de 12, suma 402. Si el técnico cambia el bolsillo, se ajusta su aumento superior por la mitad de la medida indicada.

El corte empieza a 11 del borde terminado inferior con saco de 80 y a 12 con saco de 120; termina a H + bolsillo/2. En un empate en el eje y con entrada e, el paño inferior termina en y + e/2 y el superior empieza en y − e/2. Quedan e de solape; los huecos del tubo pasan al paño inferior y se suprime la entrada suelta. Se intenta girar antes de partir; si hace falta repartir, se propone el tubo más alto que cabe en el ancho real de rollo. La elección de tubos se puede editar.

Con F > 600 se añade **1 por cada lado** a los paños y se muestra el aviso, aunque algún corte antiguo lo olvidase. Las ventanas se trasladan ese centímetro dentro del paño de corte; su posición terminada no cambia.

Los huecos laterales propuestos son 5 × 7,5 para Ø30 y 5 × 9,5 para Ø42, a 1 del borde. Para cintas se proponen 12 × 7,5 o 12 × 9,5. El técnico escribe sus posiciones X y los tubos afectados. Hay un botón de propuesta de tubos impares desde abajo, que debe aplicarse expresamente; no existe una tabla por frente. Todo hueco se puede modificar.

Las ventanas se pueden introducir una a una o por filas de columnas iguales. Tienen posición desde izquierda y desde abajo, dimensiones y radios de hueco y cristal. El cristal suma 4 por dimensión, 2 por lado. Las curvas del hueco van a CUTTER; los tramos rectos del cristal van a DISCO1 y sus curvas a CUTTER.

### Saco sencillo y doble saco

Saco útil 80 → corte de 30, pestaña 10 × 13. Saco útil 120 → corte de 32, pestaña 10 × 14. La pestaña queda a 2 de un borde. Si el cuerpo es negro, se coloca el saco en el corte de ese material. Con otro color se muestran entero y partido como **alternativas del mismo saco**, sin sumarlas a la cantidad nominal. Al partir, cada mitad incorpora 1 para la unión de 2; solo una lleva la pestaña.

**Doble saco, corrección definitiva de Iván, punto 15:** el saco normal de 80 queda incorporado al paño. Aparte se corta un **envoltorio** negro de (F − 6) × 37, con pestaña 12 × 14. Se centra al ancho de la puerta, se dobla a la mitad y se suelda 2 para envolver el saco normal. No hay una tira de 12 ni un saco de 120 añadido. Los ejemplos AR2601036, AR2600520 y AR2600236 tienen un empate de 12: suman H + 37,5, que ya incluye esa entrada.

Las instrucciones son soldar solapa 2, coser velcro de 5 bravo al revés y de 5 suave al derecho, centrar el envoltorio y cerrar entradas 2 como máximo. Los refuerzos de 10 y 15 a 10 del borde, en lona de 2 mm, son notas de confección del plano: no se inventan longitudes ni se añaden piezas de stock al corte.

El plano CAD de apilable usa `planoTaller.ts`, contrastado con AR2605036 y AR2604906:
contorno y bordes del empate en DISCO1; cabecera, bajo y huecos de entradas en referencias;
ejes de tubo en ejes (color 23), borde de entrada suelta en borrar (40) y marcas en ROTULADOR,
con FLECHA2. Cada ventana conserva el hueco en curv (3) y el cristal con sus solapes en
corte (vent) (5), con polilíneas curvas. Refuerzos y velcros van en referencia-1 (11),
con sus sombreados. Q-PU04 cerrada por Iván el 22/10/2026, por la noche: los refuerzos
son solo dibujo; no cambian el corte ni crean piezas.
Textos y llamadas se centran y alinean; los códigos bajan desde A1. Cantidad, REVÉS y OF
comparten fila en columnas en el primer paño y los demás llevan su código. Se conservan las cotas
de cada entrada; se quitan únicamente duplicados exactos de medida y referencias.
En el tubo que sirve de empate no se superpone una raya ROTULADOR al borde DISCO1;
se mantiene su flecha, como en las dos referencias manuales.

## Autorreparable

Saco actual **de 120 fijo**; el saco antiguo de 110 no es una opción.

- Cuerpo antes de empates: F × (H − 8,5), desde 12 del bajo terminado hasta H + 3,5.
- Empates normales: 2 de unión por cada uno, con posición indicada desde el borde inferior del cuerpo o propuesta para que quepa.
- Dos entradas iguales: (F + 11) × 21, rotuladas «Entrada de tubo» en ambas caras.
- Saco: F × 32.
- Ventanas individuales: cristal = hueco + 4 por dimensión; radios y posiciones según dibujo.

No se inventan cremalleras, guías, espaciadores ni refuerzos de stock a partir de estas piezas de lona.

El plano CAD de autorreparable se contrasta con AR2604904 y la primera puerta de AR2604526
(300 × 331, OF 0232191; el bot de ese pedido contiene otras puertas). Conserva DISCO1,
referencias, ROTULADOR y los dos bordes del empate en referencia-1. Las marcas laterales
y central llevan FLECHA2; las indicaciones verticales se leen en espejo a ambos lados.
Los rótulos se apartan del espaciador central y se centran en el hueco libre del paño.
El mininúmero del empate del alzado usa la letra de puerta minúscula y el número de
unión (a1, a2… b1…), igual que el corte; Iván aclaró que el «1» histórico era por
haber una sola puerta. Iván aclaró después que las referencias rosas superpuestas a los
laterales DISCO1 sobran: se eliminan en todas las autorreparables, como en AR2604526.
Se conserva la referencia central de F/2 solo con espaciador central, según la regla documentada.
El saco desplegado mantiene sus cuatro velcros de 3 y sus sombreados, sus cotas y la nota
«CREMALLERA SOLDADA HASTA MITAD DE SACO». El material del saco procede de `materialSaco`:
Iván aclaró que AMARILLO/NEGRO en el alzado de AR2604904 indica diagonales impresas
después de cortar el saco negro. La casilla descrita debajo conserva esa indicación.

### Correcciones del corte y las anotaciones · 22/10/2026, por la noche

Las entradas y los sacos de apilables y autorreparables no llevan marca central de
rotulador. Los huecos laterales de las entradas se dejan abiertos hacia fuera, con
solo los dos radios interiores, tanto en las entradas sueltas como en las incorporadas
al empate; los huecos interiores de cintas siguen cerrados. Todos van en CUTTER.
Los orillos no llevan DISCO1 y los cortes colineales compartidos se dibujan una sola vez.
El resumen de la alternativa de saco partido representa las dos mitades pegadas, con
el corte común fusionado; conserva las marcas de unión de cada mitad.

La autorreparable conserva en el corte las horizontales a 3,5, 20 y 30 cm por debajo
de la cabecera terminada, igual que AR2604904 y AR2604526. No se gira un paño si su
alto cabe en el ancho del rollo; se permite el giro cuando evita tener que partirlo.
Al colocar las piezas, las que ocupan el ancho entero del rollo van al principio.

En apilables, código, REVÉS y OF se distribuyen en columnas de la misma fila, dentro
del espacio libre entre entradas o ventanas. En autorreparables se conservan agrupados
en el hueco libre, apartados del espaciador central. Velcros y refuerzos de apilable
llevan llamadas cortas y textos en dos líneas junto a lo señalado. Los textos superiores
y de velcro de autorreparable aumentan según el espacio disponible. El empate se rotula
en el hueco lateral libre y el espaciador central queda centrado, con su flecha apartada.
El material se rotula al inicio del conjunto y REVÉS dentro del primer paño del corte.

En todos los modelos, incluidos los enrollables, los puntos 13/14 de DIMENSION se
anclan a los contornos o referencias reales; la posición de la línea de cota se conserva
separada. La cota del ancho del rollo de enrollable dispone de una referencia corta del
orillo superior en la capa `cotas`, aunque las piezas no llenen ese ancho. El escritor
compartido prolonga las auxiliares desde esos puntos (corrección
del coordinador en main 8e41bd4). Los mininúmeros de unión del alzado proceden de las
mismas posiciones locales que los del bot, con la misma letra minúscula, número,
altura y capa ROTULADOR, también en cachos, entradas y mitades de saco.

El contraste reproducible es `scripts/contrastar-puertas-revision.mjs`, con salida bajo
`tmp/puertas-revision/`: tabla, DXF y PNG lado a lado de AR2605036 y AR2604904. Se
documentan las diferencias históricas de escuadrado y despiece; las correcciones de
anotación no cambian las reglas de medidas del expediente.

### Saco con diagonales amarillas · todos los modelos (Iván, 22/10/2026)

`sacoDiagonalesAmarillas` se marca solo cuando el pedido indica impresión digital de
diagonales amarillas sobre saco negro; empieza desmarcado y los pedidos antiguos sin el
dato siguen siendo válidos. Se rechaza un valor distinto de booleano al leer el pedido.
Con la casilla, pantalla y plano escriben «SACO 900 GR AMARILLO/NEGRO» y el rótulo del
saco del DXF del bot y del resumen lo indica para que, después de cortarlo, se lleve a
impresión digital. Sin ella muestran el material configurado. No se cambia el material
negro ni las piezas, reservas o colocaciones; no se deduce la casilla por ser autorreparable.
Un saco de lona amarilla entera sigue siendo otro color de material, según el pedido.

### Espaciadores según el pedido (Iván, 22/10/2026)

`autorreparable.espaciadorCentral` es opcional y empieza desmarcado. El técnico lo activa si el
pedido dibuja líneas verticales en el medio; no depende del frente. Iván confirmó una puerta
400 × 461 con central (ventanas 156 × 40; cadena 30 / 156 / 28 / 156 / 30) y otra 220 × 371 sin
central (X2; ventanas 74 × 40; 25 / 74 / 22 / 74 / 25), ambas a 141 del bajo. AR2604904,
426 × 515, también la lleva. `autorreparable.distanciaEspaciador` permite introducir en cm la
distancia de las rayas laterales al borde según el pedido; si falta, conserva los 10 cm del
alzado anterior. Debe ser positiva y menor que medio frente. El pedido de AR2604904 indica
100 mm; su plano lo acota como 10 cm.

El alzado y el plano comparten la geometría: central continua a F/2 y F/2 − 1,9, desde 30 de
cabecera hasta 14 del bajo, con «ESPACIADOR ESPECIAL PORTANOVA» vertical. La segunda línea
va a ROTULADOR. Los empates de 2 cm se ven con sus dos bordes y «EMPATE 2cm»; la central los
cruza y el corte conserva el mismo mininúmero de unión en los dos paños. Fuente: copia local
`genericas/planos/AR2604904.dxf`, zona 496,8 / −69 / 502,3 / −62,3, y las capturas de Iván
transmitidas por el coordinador. Se mantienen siempre las dos E.T. de (F + 11) × 21.

En el corte se marcan los dos laterales a `distanciaEspaciador` y F − `distanciaEspaciador`
desde DISCO1 y, solo con la casilla, la central a F/2 − 1,9. El ancho del cuerpo sigue siendo
F: en AR2604904 son 426, nunca 423. La raya horizontal de rotulador está retranqueada
1,5 cm; por eso medir desde ella daba erróneamente 8,5 cm para el lateral. Cada paño lleva
sus verticales, con 2 cm de retranqueo en sus extremos y parando a 30 de la cabecera terminada
(33,5 del borde superior de corte). En A2 de AR2604904: X 10 / 211,1 / 416, Y 2–298;
en A1: las mismas X, Y 2–175. Se trasladan y giran junto con el paño a la capa ROTULADOR.

`scripts/contrastar-espaciadores-puertas.mjs <estudio local>` lee 20 cortes y 27 paños,
comprueba bordes DISCO1 y las seis referencias de `__fixtures__/espaciadores-reales.json`
y produce la tabla y datos en `tmp/ui-audit/puertas-espaciador/contraste-espaciadores.{md,json}`.
Incluye paños girados de AR2604402 y AR2604013. Se conservan las diferencias históricas de
extremos (0, 1 y 1,5 cm), orientación y ancho en la tabla; la referencia aplicada es
AR2604904. En AR2604526 hay central en los dos paños de 350 (X 173,1), aunque no aparezca en
el alzado revisado: no se usa esa discrepancia para activar la casilla. Las verticales
115,2 / 402,2 / 412,2 / 428,7 pertenecen a otras piezas, no a esos dos paños.

## Comprobaciones y corte

### Bolsillo opcional común: solo marcas

La casilla común «Bolsillo» está **desmarcada**: solo se activa si lo pide el dibujo, para cualquiera de los tres modelos. **No se añade pieza, cantidad ni contorno de bolsillo al corte.** Solo aparecen las dos esquinas superiores en ROTULADOR: cada esquina es una **L de 0,5 vertical y 0,5 horizontal**, con el brazo horizontal hacia dentro del bolsillo. Son cuatro segmentos, dos por esquina. La lectura inicial de la captura como dos horizontales de 1 fue corregida por el coordinador tras contrastar AR2604763 y AR2604662.

Iván indicó que todo debe ser configurable porque el pedido trae las medidas. La distancia al borde propone **20**, el ancho **30** y el lado **izquierdo**, mirando por el revés; se pueden cambiar. La **altura del borde superior desde el bajo terminado de la puerta es obligatoria y no tiene valor por defecto**. No se calcula del primer tubo ni se fija Y=31. La web traslada la altura al origen del paño de corte donde caen las marcas, y añade a X los aumentos de escuadrado correspondientes. El alzado dibuja el bolsillo con su posición y ancho configurados y alto 17, abierto arriba, con velcro rugoso en bolsillo y suave en lona por dos lados.

Se revisaron **473 copias locales de DXF**, con **1.255 cajas de saco/paño**, y después las dos referencias confirmadas por Iván. La forma coincide en las siete; las posiciones varían:

| Pedido | X desde el borde del paño | Y de las verticales desde el bajo de corte | Y del borde superior |
|---|---|---|---|
| AR2501936, AR2503709, AR2600208, AR2600236, AR2601036 | 20 / 50 | 31 → 31,5 | 31,5 |
| AR2604763, repetido en sus dos puertas | 21 / 51 | 6 → 6,5 | 6,5 |
| AR2604662 | 21 / 51 | 6,5 → 7 | 7 |

Todas llevan los brazos horizontales de 0,5 hacia dentro a la Y superior. El paño donde aparecen en AR2604763 mide 446 × 268; en AR2604662, 311 × 283,75. Se revisaron también los planos locales: contienen las notas de bolsillo abierto arriba y velcro por dos lados. El X+1 de esos dos cortes se conserva como observación, **no como aumento universal**: el configurador usa las cotas terminadas que indica el técnico y su borde de corte. Los valores están en `marcas-bolsillo.json`; las pruebas verifican su forma y la traducción de altura con un origen conocido, sin atribuir una cota terminada no leída a esos pedidos. AR2503620 tiene otra pareja de longitud 2,427 y Y=29,073; no determina una regla del bolsillo.

La web exige confirmación del modelo y de ventanas o puerta ciega, medidas positivas, material/color y los anchos reales de rollo. Comprueba cadena de tubos, ventanas fuera del frente o del alto, ventanas que invaden un tubo o un empate, huecos solapados, radios imposibles, huecos fuera de su entrada, cantidades y empates inválidos, y piezas que no caben ni girándolas. Advierte si una apilable tiene texto «enrollable» o «varilla superior»: manda el dibujo. Las variantes fuera de fase se señalan.

La colocación conserva medidas y materiales, permite giro y comparte cortes rectos: fusiona tramos colineales y elimina DISCO1 sobre los orillos. Las marcas y los números de unión van a ROTULADOR. Se reutiliza `escribirDxf2004` y su plantilla AC1018 con capas del bot. Se obtiene un único DXF en memoria por pedido, con materiales y alternativas apilados verticalmente y separados; las alternativas quedan rotuladas para elegir una.

`POST /api/puertas/corte/vista-previa` solo acepta el documento del configurador, valida su estructura y devuelve resultados, avisos y geometría, sin DXF ni rutas de archivo. No recibe servicios de escritura, almacenes, RPS ni CoordinaOT. Sin OF dibuja **SIN OF** y el generador no ofrece archivo. Tampoco ofrece archivo si hay errores de confección. En fase 1 no existe ninguna ruta de descarga o envío.

Para fase 2, `PedidoPuertas` conserva `schemaVersion`, `kind: puertas`, `orderCode`, `elementos` con sus entradas y un sobre `summary` compatible con el vocabulario de Pedidos. El cálculo es puro y cada resultado está versionado. Las piezas, las alternativas y el archivo por pedido se mantienen separados; el futuro servicio podrá integrar los estados comunes, `DocumentosPedido.tsx` y `corteEnvios.js` sin acoplar la confección a toldos o remolques.

## Contraste y pruebas

| Modelo | Pedidos de la muestra | Resultado |
|---|---|---|
| Enrollable | AR2604858, AR2604638, AR2604524, AR2604434, AR2604349 | 5/5: paños, cristal y cachos coinciden; entradas cortadas de 8 |
| Apilable | AR2604592, AR2604723, AR2604724, AR2604859, AR2604906 | 5/5: altos individuales de paños, cristales y supresión de entrada en empate |
| Autorreparable | AR2604904, AR2604764, AR2604717, AR2604402, AR2604013 | 5/5: cuerpo; entradas verificables en 4/4, sin lectura en AR2604402 |

En autorreparable no se confunden las seis entradas anidadas del archivo AR2604013 con las dos nominales por puerta: la extracción puede incluir alternativas o repeticiones. Las pruebas comprueban su medida y las dos piezas del configurador, sin certificar esa cantidad histórica del archivo.

Además se contrastan los tres dobles sacos citados, AR2604069 con su entrada incorporada y sus tres paños (57,5; 260,25; 123,75), y los dos bajos históricos erróneos de enrollable como errores conocidos. Estas muestras representan configuraciones, no certifican todas las unidades físicas de una línea RPS ni toda la producción.

### Contraste pieza por pieza: AR2604638, AR2604725 y AR2605134

Tabla generada con `node scripts/contrastar-puertas.mjs` comparando la salida de `calcularPuerta` y `generarCortePuertas` frente a los DXF reales del bot (`bot/AR2604638.dxf`, `bot/AR2604725.dxf`), sus planos (`planos/AR2604638.dxf`, `planos/AR2604725.dxf`) y los PDFs de pedido escaneados:

- **`AR2604638` (OF `0232309`, 1 ud., `172 × 314 cm`, `LAC900 BLANCO 9016`)**: es la enrollable con ventanal que **solo lleva un paño encima del cristal** (`T = 123 cm`, `D = 60 cm`, `m = 6 cm`, cadena derecha `60 + 71 + 60 + 123 = 314 cm`).
- **`AR2604725` (OF `0232504`, 1 ud., `474 × 430 cm`, `LAC900 GRIS 7038`)**: es la enrollable con ventanal que **lleva una entrada de tubo encima de la ventana** (eje a `241 cm` desde abajo / `189 cm` desde arriba, es decir, `50 cm` por encima del eje superior del ventanal dentro de `T = 239 cm`; cadena derecha `60 + 71 + 60 + 50 + 189 = 430 cm`). En RPS figura con artículo `PUERTAPLE`, pero su plano y su pedido son de puerta enrollable (`articuloOrigen: 'PUERTAPLE'` activa el aviso `ARTICULO_MODELO`).
- **`AR2605134` (OF `0233175`, 3 uds., `212 × 360 cm`, `LAC900 AZUL 5002`)**: caso más habitual de puerta enrollable configurado entero desde el dibujo de su PDF (`T = 169 cm`, `D = 60 cm`, `m = 6 cm`, cadena derecha `60 + 71 + 60 + 169 = 360 cm`), aún sin corte manual previo.

#### AR2604638 (OF 0232309)

| Pieza | Web (cm) | Ref. DXF/PDF (cm) | Cant. (web / ref) | Marcas Y en web (cm) | Marcas Y en ref (cm) | Rótulo de corte en web | Estado |
|---|---|---|---|---|---|---|---|
| Paño superior | 172 × 130,25 | 172 × 130,25 | 1 / 1 | 7,5; 123,25 | 7,5; 123,25 | `A1 · PAÑO DE ARRIBA` | Coincide |
| Paño inferior | 172 × 123,75 | 172 × 123,75 | 1 / 1 | 2; 45,25; 116,25 | 2; 45,25; 116,25 | `A2 · PAÑO DE ABAJO` | Coincide |
| Cristal del ventanal | 164 × 56,5 | 164 × 56,5 | 1 / 1 | — | — | `CRISTAL · 0232309 · REVÉS` | Coincide |
| Cachos laterales | 7 × 56,5 | 7 × 56,5 | 2 / 2 | — | — | `CACHO · 0232309 · REVÉS` | Coincide |
| Saco | 178,5 × 26 | 178,5 × 26 | 1 / 1 | — | — | `SACO · 0232309 · REVÉS` | Coincide |
| Entrada de tubo 1..3 | 172 × 8 | 172 × 8 | 3 / 3 | — | — | `ENTRADA 1 · 0232309 · REVÉS` | Coincide |

#### AR2604725 (OF 0232504)

| Pieza | Web (cm) | Ref. DXF/PDF (cm) | Cant. (web / ref) | Marcas Y en web (cm) | Marcas Y en ref (cm) | Rótulo de corte en web | Estado |
|---|---|---|---|---|---|---|---|
| Paño superior | 474 × 246,25 | 474 × 246,25 | 1 / 1 | 7,5; 50; 239,25 | 7,5; 50; 239,25 | `A1 · PAÑO DE ARRIBA` | Coincide |
| Paño inferior | 474 × 123,75 | 474 × 123,75 | 1 / 1 | 2; 45,25; 116,25 | 2; 45,25; 116,25 | `A2 · PAÑO DE ABAJO` | Coincide |
| Cristal del ventanal | 456 × 56,5 | 456 × 56,5 | 1 / 1 | — | — | `CRISTAL · 0232504 · REVÉS` | Coincide |
| Cachos laterales | 12 × 56,5 | 12 × 56,5 | 2 / 2 | — | — | `CACHO · 0232504 · REVÉS` | Coincide |
| Saco partido · con pestaña | 241,25 × 26 | 241,25 × 26 | 1 / 1 | — | — | `SACO · 0232504 · REVÉS` | Coincide |
| Saco partido · sin pestaña | 241,25 × 26 | 241,25 × 26 | 1 / 1 | — | — | `SACO · 0232504 · REVÉS` | Coincide |
| Entrada de tubo 1..4 | 474 × 8 | 474 × 8 | 4 / 4 | — | — | `ENTRADA 1 · 0232504 · REVÉS` | Coincide |

#### AR2605134 (OF 0233175)

| Pieza | Web (cm) | Ref. DXF/PDF (cm) | Cant. (web / ref) | Marcas Y en web (cm) | Marcas Y en ref (cm) | Rótulo de corte en web | Estado |
|---|---|---|---|---|---|---|---|
| Paño superior | 212 × 176,25 | 212 × 176,25 | 3 / 3 | 7,5; 169,25 | 7,5; 169,25 | `A1 · PAÑO DE ARRIBA` | Coincide |
| Paño inferior | 212 × 123,75 | 212 × 123,75 | 3 / 3 | 2; 45,25; 116,25 | 2; 45,25; 116,25 | `A2 · PAÑO DE ABAJO` | Coincide |
| Cristal del ventanal | 204 × 56,5 | 204 × 56,5 | 3 / 3 | — | — | `CRISTAL · 0233175 · REVÉS` | Coincide |
| Cachos laterales | 7 × 56,5 | 7 × 56,5 | 6 / 6 | — | — | `CACHO · 0233175 · REVÉS` | Coincide |
| Saco | 218,5 × 26 | 218,5 × 26 | 3 / 3 | — | — | `SACO · 0233175 · REVÉS` | Coincide |
| Entrada de tubo 1..3 | 212 × 8 | 212 × 8 | 9 / 9 | — | — | `ENTRADA 1 · 0233175 · REVÉS` | Coincide |

#### Diferencias observadas frente al DXF manual del bot

1. **Rótulos dentro de cada pieza, revisados en fase 3**: en los DXF manuales (`AR2604638.dxf` y `AR2604725.dxf`), el técnico rotuló `A1`, `A2` y `REVÉS` (y en `AR2604638` la OF `0232309` una sola vez entre ambos paños). La web usa ahora el código corto del paño, sin «PAÑO DE ARRIBA/ABAJO», y conserva OF y REVÉS en cada pieza para identificarla. Las piezas pequeñas llevan letra de puerta y nombre de pieza. El texto sigue el frente original y gira únicamente cuando gira la pieza al colocarla, sin un giro adicional por su lado largo. Los rótulos largos de las tablas anteriores describen la salida anterior a fase 3.
2. **Sacos de stock aprovechados en el hueco sobrante de `AR2604725`**: en el DXF manual de `AR2604725`, encima de `A2` (`474 × 123,75 cm`, donde sobran `176,25 cm` de ancho de rollo), el técnico metió a mano 4 sacos de stock de otra OF (`0230811`: tres de `120 × 160` y uno de `114 × 160`). La web calcula exclusivamente las piezas del pedido de puertas.
3. **Serigrafía en observaciones**: los logos serigrafiados de `AR2604638` (`XPUERTAS`, `21 × 6 cm` en negro) y `AR2605134` (`CAIRENA`, `20 × 6 cm` en blanco) no generan geometría de cuchilla en el bot; en la web quedan recogidos en el apartado separado de observaciones del pedido bajo el alzado.

### Pendiente para más adelante

- ~~Aprovechamiento del corte en el rollo~~: hecho el 22/10/2026 (`empaquetar` en `src/puertas/corte.ts`). Se prueban columnas estrechas y anchas, por lado corto o largo, eligiendo el hueco que menos tela desperdicia, y se queda la que gasta menos rollo: `AR2604638` gasta 172 cm como su corte a mano (antes 278), `AR2604725` 948 como el real, `AR2605038` 330 (antes 651) y `AR2605134` 848 (antes 972). No mete sacos de stock de otras OF.
- **Boceto de colocación de enrollables**: incorporar el croquis/boceto específico de colocación en rollo para puertas enrollables.

Hay pruebas de validación, unión compartida, geometría de rollo, curvas, DXF y ruta sin escritura. `scripts/test-puertas-e2e.mjs` usa exclusivamente la instancia aislada, recorre los tres modelos y los tres pedidos contrastados (`AR2605134`, `AR2604638`, `AR2604725`), cambia el tema desde su botón y deja capturas de alzado y corte a 1280×720 y 1600×1000 en `tmp/ui-audit/puertas-fase1/`.

## Colocación como el Tetris · 23/10/2026

`generarCortePuertas` ejecuta ahora una búsqueda con poda de órdenes, giros permitidos y posiciones en los
cruces de bordes de las piezas. Las piezas pueden atravesar los límites de las columnas iniciales; también
se comprueba un molinillo de cinco rectángulos que no admite guillotina. No se usa una rejilla que redondee
las medidas. Las columnas anteriores se conservan como solución inicial completa: si se agota la búsqueda,
ningún rollo puede gastar más largo que esa solución. No se asegura el óptimo global cuando se alcanza el límite.

El orden de elección, revisado con el coordinador e Iván el 23/10, es: menor largo; con ese largo,
**mayor área de sacos de stock cuando hay OF de stock**; después, menor ancho de las piezas del pedido,
mayor retal rectangular libre y desempate estable. Sin OF de stock se omite el segundo paso; también se
omite en el transparente y en las alternativas de saco entero/partido, donde no se añade stock. No se
obliga a meter sacos ni se aumenta largo para conseguirlos: primero se ahorran ML. Con el mismo largo no
se poda por ancho antes de evaluar el stock, porque se podría descartar una solución que aprovecha más.
Un empate completo conserva la primera solución. Los tipos equivalentes evitan repetir
permutaciones; los paños con distinto código de enrollable se distinguen para conservar A1 sobre A2 cuando
comparten columna. El presupuesto es de **60.000 unidades por pedido**, compartido entre todos los materiales
y alternativas: cuenta cada posición intentada, incluso las rechazadas, y también cobra la valoración de
retales en función del número de piezas. No intervienen el reloj ni el azar, por lo que una máquina más lenta
obtiene las mismas posiciones. El mismo generador sigue sirviendo la vista previa, guardado, plano y DXF del bot.

La prioridad del frente en enrollables es una preferencia cuando no cuesta largo, según la aclaración del
coordinador del 23/10: AR2604434 ya giraba sus paños y gastaba 129,75; imponer frente fijo lo subiría a 150.
Se conservan sus giros permitidos y ahora baja a 118,75. Autorreparable mantiene la prohibición de girar un
paño cuyo alto cabe en el rollo. Las franjas que llenan el ancho entero se trasladan al principio sin cambiar
el consumo. No se cambian medidas, contornos, textos, marcas, capas, cristales ni multiplicadores.

Después de elegir las piezas del pedido, los sacos aprovechan **todo el ancho real del rollo**, como en
toldos (aclaración del coordinador del 23/10). Por eso el ancho con stock puede crecer aunque el ancho del
pedido baje; la cota del plano sigue midiendo el total con stock. Los huecos se calculan contra todas las
piezas, sin suponer columnas, y se separan sin solapes, empezando por el mayor retal. Se reutilizan las
medidas y márgenes de `sacosEnHuecos`. La fusión de cortes compartidos y la eliminación de orillos siguen
en `fusionarCortesPuertas`.

### Comparación y tiempos

Base anterior: commit `c0e5abb`, incluidas las mejoras de cachos en fila del 23/10. Todos los valores de
largo y ancho son **cm**; el rollo principal mide 300. Se prueban los largos de **cada material y cada
alternativa**, no solo los que aparecen resumidos aquí. `cortesAntesTetris.json` conserva la medición anterior
y `cortesTetris.ts` reconstruye todas las configuraciones completas disponibles en las fixtures.

Medición reproducible: `node scripts/medir-tetris-puertas.mjs`, Node 24.17.0, Intel Core i5-8500 a 3 GHz,
Windows x64; tres calentamientos y nueve mediciones por pedido. Se incluyen despiece, todos los rollos,
stock, fusión y DXF en memoria; se excluyen arranque de Node, red y renderizado. La comparación histórica
se apoya en `genericas/extraccion.json` y `plegables/verificacion/verificacion.json` de las copias locales
del estudio: envolvente de DISCO1 en la banda de rollo de los paños, incluidos huecos de separación y stock.
Los cortes combinados o separados no se presentan como un único pedido equivalente. AR2605134 usa el
croquis de Iván del 22/10, posterior a su fixture original que todavía dice «sin corte manual».

<!-- tabla-tetris-inicio -->
| Pedido | Largo antes → después | Ancho pedido antes → después | Ancho con stock antes → después | Sacos antes | Sacos después | Área stock antes → después (cm²) | A mano: largo × ancho ocupado | Mediana / máx. (ms) |
|---|---:|---:|---:|---:|---:|---:|---|---:|
| AR2604858 | 794 → 794 | 260,25 → 260,75 | 288,75 → 299,75 | 3 | 9 | 61.875 → 85.125 | 794 × 300 | 18,03 / 21,24 |
| AR2604638 | 172 → 172 | 285 → 285 | 285 → 285 | 0 | 0 | 0 → 0 | 172 × 285 | 11,49 / 24,27 |
| AR2604524 | 950 → 950 | 294,25 → 278,25 | 294,25 → 294,75 | 4 | 4 | 77.880 → 77.880 | 950 × 294,25 | 15,49 / 19,04 |
| AR2604434 | 129,75 → 118,75 | 300 → 300 | 300 → 300 | 0 | 0 | 0 → 0 | 150 × 233 | 7,57 / 12,48 |
| AR2604349 | 339 → 330 | 289 → 298 | 289 → 298 | 0 | 0 | 0 → 0 | 331 × 297 | 5,53 / 9,42 |
| AR2604970 | 850,5 → 850,5 | 292,25 → 292,25 | 299,75 → 298,75 | 3 | 5 | 42.750 → 51.875 | Dos cortes separados; uno de restos | 11,61 / 14,85 |
| AR2604069 | 630 → 630 | 293,25 → 268,25 | 293,25 → 298,25 | 2 | 2 | 21.250 → 21.250 | 630 × 292,25¹ | 14,37 / 17,84 |
| AR2604725 | 948 → 948 | 290,25 → 290,25 | 290,25 → 290,25 | 4 | 4 | 77.880 → 77.880 | 948 × 290,25 (4 sacos) | 12,62 / 13,68 |
| AR2604904 | 863 → 863 | 300 → 300 | 300 → 300 | 0 | 0 | 0 → 0 | 863 × 300 | 1,46 / 5,24 |
| AR2604764 | 131 → 121 | 254,5 → 296,5 | 254,5 → 296,5 | 0 | 0 | 0 → 0 | 121 × 296,5¹ | 1,19 / 1,22 |
| AR2604717 | 955 → 955 | 300 → 300 | 300 → 300 | 4 | 4 | 40.800 → 40.800 | 955 × 300 | 1,5 / 4,43 |
| AR2604402 | 331,5 → 331,5 | 224 → 224 | 300 → 300 | 2 | 2 | 19.000 → 19.000 | 331,5 × 262¹ | 1,18 / 1,24 |
| AR2604013 | 376,5 → 376,5 | 291 → 291 | 291 → 291 | 0 | 0 | 0 → 0 | Corte combinado; no atribuible | 1,15 / 3,8 |
| AR2604592 | 800 → 800 | 296 → 296 | 296 → 296 | 0 | 0 | 0 → 0 | 800 × 296 | 8,1 / 11,95 |
| AR2604723 | 1530 → 1530 | 296 → 296 | 296 → 296 | 4 | 4 | 82.500 → 82.500 | 1446,46 × 300² | 7,66 / 9,88 |
| AR2604724 | 1500 → 1500 | 296 → 296 | 296 → 296 | 4 | 4 | 82.500 → 82.500 | 1500 × 300 | 7,31 / 10,25 |
| AR2604859 | 1413 → 1413 | 298 → 286 | 298 → 286 | 6 | 6 | 117.750 → 117.750 | 1532,87 × 298² | 9,88 / 12,25 |
| AR2604906 | 1590 → 1590 | 296 → 284 | 296 → 286 | 10 | 10 | 132.500 → 132.500 | 1084 × 296² | 10,38 / 12,57 |
| AR2605134 | 708 → 708 | 300 → 300 | 300 → 300 | 0 | 0 | 0 → 0 | 708 × 300 (croquis de Iván) | 5,55 / 8,78 |
| AR2605220 | 732 → 732 | 277,25 → 261,25 | 278,75 → 294,75 | 3 | 3 | 60.390 → 60.390 | 732 × 278,75 (3 sacos) | 11,55 / 14,04 |
| AR2605036 | 1244 → 1244 | 289 → 277 | 289 → 277 | 0 | 0 | 0 → 0 | 1240 × 289¹ | 9,74 / 11,87 |
| AR2605065 | 233,25 → 233,25 | 298,75 → 298,75 | 298,75 → 298,75 | 0 | 0 | 0 → 0 | Varias puertas; no atribuible | 4,61 / 6,63 |
| AR2604526 | 633,5 → 633,5 | 300 → 300 | 300 → 300 | 4 | 4 | 77.500 → 77.500 | Varias puertas; no atribuible | 1,32 / 1,58 |
| AR2604526-350 | 711 → 711 | 300 → 300 | 300 → 300 | 2 | 2 | 41.250 → 41.250 | Sin referencia de rollo | 1,37 / 1,67 |
| AR2604638-1ET | 172 → 172 | 269 → 269 | 269 → 269 | 0 | 0 | 0 → 0 | Sin referencia de rollo | 6,82 / 9,17 |
| EJEMPLO-APILABLE | 411 → 411 | 300 → 300 | 300 → 300 | 0 | 0 | 0 → 0 | Sin referencia de rollo | 0,64 / 0,77 |
| EJEMPLO-AUTORREPARABLE | 711 → 700 | 242,5 → 284,5 | 300 → 284,5 | 3 | 2 | 38.520 → 41.250 | Sin referencia de rollo | 1,36 / 1,9 |

| Puertas distintas en el pedido | Mediana / máx. (ms) |
|---|---:|
| 1 | 11,26 / 11,51 |
| 2 | 9,64 / 10,37 |
| 3 | 5,73 / 6,44 |
| 4 | 10,16 / 11,39 |
| 5 | 9,93 / 10,7 |
<!-- tabla-tetris-fin -->

¹ Referencias históricas de despiece: AR2605036 corta frente 620 frente a los 622 actuales por escuadrado;
AR2604069 conserva diferencias históricas de 1 cm en los paños; AR2604764 incluye ventanas que la muestra
ciega no reconstruye; AR2604402 no permite comprobar sus E.T. y sí incluye un saco de stock de 120 × 80.
Se compara ocupación literal, sin afirmar igualdad completa del inventario.

² AR2604723 y AR2604906 tienen E.T. partidas en dos mitades de 256 y 266, respectivamente; AR2604859
incluye entradas enteras y alternativas partidas con separaciones. La web conserva las entradas enteras
configuradas y sus marcas; este encargo no introduce empates nuevos para imitar esas referencias.

AR2605220 conserva 732 de largo y tres sacos de 122 × 165, como a mano: recuperan **60.390 cm²**,
frente a los 53.592 de seis sacos de 116 × 77. Iván y el coordinador confirmaron que prima el área,
no la cantidad. El ancho del pedido baja de 277,25 a 261,25; con stock mide 294,75. A mano: 732 × 278,75,
A1 con cuatro E.T. y los dos cachos de 56,5 × 9 juntos, y A2 con los tres sacos encima. La nueva solución
reparte E.T. entre ambos paños y mantiene los cachos pegados con corte compartido. La prueba actualiza
las posiciones porque se prioriza el stock y, con esa área y largo, se reduce el ancho del pedido.
AR2604725 conserva los cuatro sacos de antes de Tetris y sus 77.880 cm², con ancho del pedido 290,25;
sin OF de stock, el ancho baja a 246,25. Ninguna configuración de la tabla pierde área ni cantidad de
stock respecto a la base con el mismo largo. El ejemplo autorreparable baja de 711 a 700 aunque pase
de tres sacos a dos: manda el ahorro de largo, conservando el alzado y las piezas.

`marcas-bolsillo.json` solo tiene fragmentos medidos: AR2501936 (478 × 272), AR2503709 (385 × 254,5),
AR2600208 (530 × 69,5), AR2600236 (382 × 252,5), AR2601036 (424 × 281,5), AR2604763 (446 × 268)
y AR2604662 (311 × 283,75). No hay configuraciones completas de esas puertas en las fixtures: faltan sus
otros paños, entradas y/o modelo confirmado. No se inventan pedidos ni un consumo global a partir de esos
fragmentos. Las referencias repetidas de espaciadores usan las mismas piezas; se añade aparte la variante
350 × 420 de AR2604526 para no confundirla con la de 300 × 331 de `planosReales.ts`.

Validación: TDD con casos de huecos entre columnas, giro, segundo y tercer criterio, presupuesto agotado,
molinillo sin guillotina y un oráculo independiente que enumera todas las casillas de seis problemas pequeños.
Las configuraciones reales comprueban conservación de cantidades, límites, ausencia de solapes incluso con
stock, determinismo, ausencia de mutaciones y que ningún material ni alternativa aumenta su largo.
La vista previa real se comprueba en la aislada 4316 (`simulationMode: true`, `fileWritesEnabled: false`):
capturas revisadas de AR2604349 y AR2605220, claro/oscuro, 1280 × 720 y 1600 × 1000, en
`tmp/ui-audit/corte-tetris/`. Sin cambios en los componentes ni estilos del cliente.

La batería completa pasa con 3.952 pruebas en 285 archivos, además de `pnpm typecheck` y `pnpm lint`.
Una repetición con el paralelismo automático agotó los 5 segundos en dos pruebas ajenas a puertas
(`bambaRemate/ELECTRA` y `model-samples`); la ejecución completa final con `pnpm test --maxWorkers=2`
pasa las 3.952 sin ampliar sus límites. Las 232 pruebas de puertas pasan también por separado.

## Dudas abiertas

No queda ninguna duda de regla de fase 1: Iván cerró bajo, empate de enrollable, demasías de entradas y doble saco durante el encargo. Los datos variables de cada dibujo siguen siendo responsabilidad del técnico; una cota sin introducir permanece pendiente y no se deduce de las frecuencias del catálogo.

## Fase 3 · corte, identificación y varios ventanales (22/10/2026)

El contraste reproducible es `node scripts/contrastar-corte-puertas.mjs <carpeta local del estudio puertas>`.
Solo lee copias locales y escribe en `tmp/ui-audit/puertas-fase3/`: `contraste.md`, `contraste.json`,
documentos de muestra y comparaciones del DXF manual y la web. La tabla distingue coincidencia de medidas de
cantidad nominal: encontrar dos cajas iguales en un fichero con varias puertas no demuestra a cuál pertenece cada una.
AR2605134 sigue siendo un contraste con su PDF, sin atribuirle un corte manual inexistente.

### Textos y mininúmeros

- `genericas/bot/AR2604638.dxf`: A1, A2, REVÉS y OF con altura 200 mm, giro 0.
- `plegables/configuraciones/bot/AR2604725.dxf`: A1 y REVÉS de 300 mm, A2 de 200 mm, giro 0.
  Sus dos textos ROTULADOR «1», de 10 mm, pertenecen al **saco partido**, no a una entrada de tubo incorporada.
  Este pedido tiene un tubo adicional sobre el ventanal, pero sus dos paños caben sin empate adicional.
- `genericas/bot/AR2605038.dxf`: los ocho emparejamientos de los laterales de los dos ventanales de la puerta D
  aparecen como D1…D8, dos veces cada uno, en ROTULADOR de 12 mm. Sirven para comprobar qué piezas se unen.

La web identifica cada paño con su código corto y cada pieza pequeña con letra de puerta y nombre, con su OF.
**REVÉS ya no va en cada pieza** (Iván, 22/10/2026): las puertas se cortan siempre por el revés y se avisa una vez
al principio de cada material, como el DERECHO de remolques. Los textos son centrados y siguen el frente original de la pieza;
giran al girar la pieza, sin un giro adicional por el lado mayor. Se usan máximos de 200/300 mm en paños,
reduciéndolos cuando falta espacio. Son rótulos adaptados al hueco disponible; no se copian las posiciones
arbitrarias del ratón ni las omisiones de identificación de los cortes históricos. Después de Z se continúa AA, AB…

Los números actuales siguen **el criterio expresamente solicitado de toldos y remolques**: letra minúscula de la
puerta y número (`a1`, `a2`…), en ROTULADOR de **10 mm**, conservando las minúsculas en el DXF AC1018.
Se colocan a 1 cm del borde dentro del solape y, en un borde entero, a 4 cm de cada punta. Las piezas de ambos
lados de una soldadura llevan el mismo número. Cada unión nueva de una puerta recibe un número distinto,
incluidos los grupos superior/inferior y el saco partido. Se aplica también a la E.T. incorporada de solape 7,5
o 12/13,5: el número permanece a 1 del borde; no se centra fuera del solape ni se escribe «UNIÓN…» en grande.
En las uniones individuales de cachos, el número va en el extremo correspondiente, a 4 del lateral exterior,
y se repite junto al mismo extremo del paño o de la E.T. que lo recibe.

### Ventanales consecutivos de enrollable

Las fuentes son el alzado convertido desde el DWG y el DXF del bot de `genericas/planos/AR2605065.dxf`,
`genericas/bot/AR2605065.dxf`, `genericas/planos/AR2605038.dxf` y `genericas/bot/AR2605038.dxf`.
Los scripts del estudio ya extrajeron sus cajas y geometría en `genericas/extraccion.json`.

| Pedido y puerta | Frente × alto | T | D, de arriba abajo | Margen | Paños superior / inferior | Cristales | Cachos |
|---|---|---|---|---|---|---|---|
| AR2605065, A, OF 0233051 | 214 × 400 | 209 | 60; 71 | 8 | 216,25 / 52,75 | 202 × 56,5; 202 × 67,5 | dos de 9 × 56,5 y dos de 9 × 67,5 |
| AR2605038, D, OF 0233003 | 321 × 370 | 179 | 60; 71 | 8 | 186,25 / 52,75 | 309 × 56,5; 309 × 67,5 | dos de 9 × 56,5 y dos de 9 × 67,5 |

El configurador conserva T, D y margen del primer ventanal y permite añadir los siguientes **debajo**, con D y
margen propios, sin medidas propuestas. Comparten el eje intermedio. El inferior pasa a ser
`H − T − suma(D) − 7,25`; cada cristal y cada cacho conserva las fórmulas del ventanal sencillo.
Los cachos se separan por lado para poder identificar sus emparejamientos con paños y entradas.

En cada eje compartido se cortan **dos entradas**, delantera y trasera, como pidió Iván el 22/10/2026.
Si ese eje ya estaba en la lista de tubos, sustituye a su entrada sencilla; no se suman tres tiras.
Se cortan de **8**, manteniendo la regla vigente de cota 7,5 / corte 8. En AR2605038 se ve una tira de 7,5
y otra de 8; esa diferencia histórica no modifica la instrucción posterior de Iván de cortarlas de 8.

### Huecos individuales en apilable y autorreparable

Son otro despiece: se conservan los huecos CUTTER del paño y los cristales redondeados, con posiciones y radios
del dibujo. AR2604906 (`plegables/configuraciones/configuraciones.json` y su DXF del bot) tiene dos filas de tres
huecos de 116 × 35, cristales de 120 × 39 con X6, y paños de 253 y 260. La regresión comprueba los seis huecos,
la única geometría de cristal con multiplicador X6 y los empates sin atravesar ventanas. La autorreparable
conserva sus dos E.T. delantera/trasera de (F + 11) × 21, independientes de la cantidad de huecos.

La autorreparable AR2604526, OF 0232191, de 300 × 331, se contrasta además desde el alzado convertido:
dos huecos de 113 × 40, a X 25/162 e Y 140, radio 2; cristales 117 × 44, radio 4, X2 en el bot.
El cuerpo mide 300 × 322,5 y las dos E.T., 311 × 21. El script local mide también las curvas del bot:
los 36 de sus tramos verticales rectos no son el alto total de 44. Ese contraste evita confundir la
caja interior entre tangencias con la envolvente completa del cristal redondeado.

Queda consultado con el coordinador si la instrucción «E.T. entre ventanas, una delante y otra detrás» debe
extenderse a alguna variante de **huecos individuales**. Los ejemplos citados de ventanales continuos sí
demuestran dos piezas en su eje común; no se duplican por deducción todos los tubos de las apilables.
Ventanales con un paño opaco intermedio o variantes no representadas requieren su propio dibujo y regla.

La vista previa permite ampliar hasta 8× y desplazar el corte; los mininúmeros usan el color de ROTULADOR.
`scripts/test-puertas-corte-fase3-e2e.mjs` comprueba la aislada antes de abrirla y toma capturas de AR2604638,
AR2604725, AR2605134 y AR2605065 en claro y oscuro, a 1280×720 y 1600×1000, además de comparaciones PNG con
los cortes manuales. El plano DWG y su alzado se revisan en la sección de fase 3 del plano de oficina.

## Fase 2 · guardar, Pedidos, plano y corte (22/10/2026)

- **Guardar para revisión** desde Puertas (cliente y fecha, o «Traer de RPS»): un JSON por pedido en la subcarpeta
  `puertas` de la carpeta interna de remolques. Un número es de un solo producto (toldos, remolques o puertas).
  Con comprobaciones en error (modelo sin confirmar, rollo sin poner…) o sin OF no se guarda.
- **Pedidos**: etiqueta «Puerta», filtro «Puertas» y ficha con los dos bloques (alzado y corte), «Corregir» solo para el
  autor si se lo devolvieron, «Generar archivos» con todas las OF aprobadas en CoordinaOT.
- **Plano**: presentación CAD como los toldos (Iván: «Es una presentación de cad. Como toldos»), con el alzado de cada
  puerta y el corte, en la carpeta de planos del corte. Sale al guardar (para revisar) y, al generar, el definitivo con
  el revisor en el cajetín; si ya está en la carpeta, se pregunta antes de sustituirlo.
- **Corte al bot**: un solo DXF por pedido con las opciones de saco dentro (el técnico de la máquina elige), con los
  botones comunes «Mandar corte al bot», «Guardar DXF en DXFs» y «Descargar DXF».
- **Buscar pedido**: si en RPS no tiene toldos ni remolques pero sí líneas de puerta (PUERTAENR, PUERTAPLE, PUERTAUTO), se
  abre en Puertas con una puerta por línea (medidas, color, cantidad y OF del texto del pedido). El modelo nunca queda
  confirmado: manda el dibujo. Los tramos (PUERTAPLET, PUERTAPLETRAM) se avisan y no se convierten.
- **E.T. entre ventanas**: dobles (delante y detrás) entre ventanales seguidos de enrollable (AR2605065, AR2605038). En las
  apilables con filas de huecos (AR2605036: 8 tiras para 8 tubos) van sencillas.
## Fase 3 · plano de oficina y alzado (22/10/2026)

### Enrollables · plantilla fija de Portanova (22/10/2026)

Iván revisó AR2605134 capa por capa y confirmó que las puertas de Portanova usan siempre
`PORTANOVA (NAVE NOVA).dwg`. La copia local convertida se conserva depurada en
`src/puertas/plantillas/portanova.dxf`: solo quedan las notas y los detalles del modelo,
la presentación, sus ventanas, capas, bloques y estilos. **El cajetín es el de todos los planos de la web
(CAJETIN TGM), en el sitio del de la plantilla y al 78 %** (Iván, 22/10/2026: «así unificamos diseño»), con los datos del pedido; esta instrucción posterior sustituye
la de mantener CAJETIN WEB. Iván amplió el uso de esta hoja a **todos los modelos de Portanova**:
se identifica en `clientePortanova.ts` por RPS `cabecera.clienteRps.codigo = 001336`, o por
el nombre con PORTANOVA si no hay código. Un código de otro cliente prevalece sobre el nombre.
Los demás clientes conservan la hoja web. El nuevo dibujo de enrollables se aplica a cualquier
cliente; el dibujo de apilables y autorreparables y los planos de toldos se conservan.

El plano específico se construye en `src/puertas/planoEnrollable.ts`. El alzado lleva los
contornos de los paños en DISCO1, sin inventar un rectángulo de puerta terminada. Arriba:
corte a +3,5, referencia a 0 y ROTULADOR a −3,5. Los cristales y sus cachos dibujan el corte
completo, solapando 2 arriba y abajo; AR2605134 lleva cristal de 204 × 56,5 y cachos de
7 × 56,5. El cristal conserva el color forzado 5 del DWG actualizado de Iván (mano3).
Las E.T. tienen sus ejes, marcas y la raya de borrar en sus capas; sus tres flechas son
inserciones del FLECHA2 de Iván. El saco desplegado y los velcros conservan referencias,
referencia-1, los sombreados SOLID/ANGLE y las guías que no se imprimen.

En el alzado, el primer paño lleva la cantidad (X3, solo si hay más de una puerta), el código, REVÉS
y la OF debajo si queda hueco, sin cruzar las entradas; los demás paños, solo su código (Iván,
22/10/2026: «llega indicar en el planteamiento que es x3»). En el corte resumido la lona no lleva
X3 (se corta todo junto): el primer paño de cada puerta lleva su OF y el primero del rollo, REVÉS.
El saco y el cristal conservan su X3. Las notas de taller, el detalle del saco y el aviso magenta **van
siempre** y proceden de la plantilla. Solo se corrigen las faltas evidentes. La nota de los
cachos debe leerse entera dentro de su ventana: Iván confirmó que su recorte era un descuido.
No se imprimen la cabecera PUERTA…, los metros del corte, las observaciones de RPS ni
CERRAR E.T. 2 CM MÁXIMO en las enrollables. Los otros modelos conservan sus instrucciones.

El corte resumido usa las piezas y las colocaciones devueltas por `generarCortePuertas`:
no depende de un anidado concreto ni reordena el plano por su cuenta. El saco y el cristal
se dibujan una vez con su multiplicador y sus cotas totales; la lona lleva todas sus piezas,
sus marcas y las cotas del rollo. Usa las rayas fusionadas del corte de máquina, sin cerrar
orillos ni repetir aristas compartidas (aclaración posterior de Iván al revisar la comparación).
En AR2605134 son 708 × 300, seis paños, nueve E.T. de pie y
seis cachos encima. La colocación y el orden A1/A2 se deciden en el corte, no en el plano.
Iván movió «MATERIALES» abajo, junto a las notas (copia retocada del plano, 22/10/2026); la ventana
del corte llega ahora del marco de arriba hasta MATERIALES y el dibujo se pega arriba, tan grande
como quepa. Sus cotas usan el estilo XERA 20 (texto de 20 cm), que se añade al DXF copiando XERA 15,
para que se lean al imprimir sin pisar las piezas. Vale para todas las puertas de Portanova.

Con varios ventanales, los mininúmeros van en las esquinas de los cachos y de los paños que los
reciben; en la E.T. del medio solo en la delantera, la de detrás no los lleva (Iván, 22/10/2026).

`node scripts/contrastar-plano-enrollable.mjs <DXF mano3 local> <pedido JSON local> tmp/plano-enrollable <DXF mano/out local>` escribe
`tmp/plano-enrollable/comparacion.{md,json}`, el DXF generado, las dos páginas lado a lado y
ocho comparaciones de capas. Compara rayas, medidas, colores, posiciones, textos, cotas,
bloques y sombreados; proyecta también las ventanas a mm de papel. La referencia de dibujo
es mano3 de AR2605134; las notas que se borraron al limpiar esa copia se contrastan con la
plantilla fija y la primera copia mano/out. El informe distingue sus fuentes y las
diferencias de identificación o presentación autorizadas. Las pruebas conservan hashes
de los DXF completos de apilable y autorreparable para clientes que mantienen la hoja web,
y de la presentación común de toldos. Con Portanova se comprueba la misma geometría y sus
rótulos, admitiendo solo una traslación del corte en modelo para que una ventana no vea el
alzado de la otra. Las páginas de AR2605036 y AR2604904 se han revisado en la plantilla fija.

Para apilables y autorreparables, `src/puertas/planoTaller.ts` dibuja el plano de oficina por capas;
`alzado.ts` conserva el dibujo de pantalla. Las enrollables mantienen `planoEnrollable.ts`
con sus cambios de main a1b680b y solo el rótulo opcional de impresión autorizado después.
Su DXF completo de AR2605134 sin impresión queda protegido por SHA-256 de main 7ebe632.
Los ventanales
consecutivos tienen sus cachos, cristales, ejes compartidos y cotas propios. El cristal se identifica
por la cota de corte, sin leyenda dentro. Los paños llevan rótulos grandes separados; «AL CORTE»
va vertical a ambos lados, y las instrucciones de Portanova se distribuyen según cada modelo.
Las marcas de entradas y empates aparecen en ROTULADOR, con su triangulito. Las ventanas redondeadas
conservan los radios también en el DXF mediante curvas de polilínea.

Las cotas son entidades DIMENSION editables, con los estilos XERA 15, XERAL y XERAL 5 de los planos.
Se mantiene XERAL 15 para los demás modelos que lo usan; el nombre histórico XERA 15 se añade
solo si el plano lo necesita. D/T siguen como ayuda en pantalla, pero no se imprimen en CAD.
Apilables: cadenas de cada fila de ventanas, cintas, entradas, bolsillo de cabecera y saco.
Autorreparables: notas independientes de las E.T., cremalleras y espaciadores verticales,
empates y saco de 120. Las notas no crean piezas nuevas.

Cada tramo de corte ocupa solo el ancho usado por sus piezas, con el título de material encima,
el largo debajo y el ancho usado a la izquierda. Se conservan la colocación, medidas, radios,
mininúmeros y alternativas que devuelve `generarCortePuertas`. El anidado y la geometría del DXF de máquina se mantienen.
En el corte resumido se conservan exactamente las rayas del bot, sin cerrar los orillos ni
volver a anidar; saco y cristal de un material separado se dibujan una vez con su cantidad.
Las alternativas de saco se distinguen como alternativas, sin sumarlas a la cantidad nominal.
Las cotas del resumen usan XERA 20 y van fuera de las piezas; REVÉS y OF aparecen en el
primer paño del rollo, sin X en los paños de lona. El resumen conserva las marcas y mininúmeros
de cada colocación, incluidas las verticales del espaciador y los de la muestra de saco partido.
En los bots históricos de las cuatro referencias no se observa una regla adicional para
numerar ventanas recortadas en el propio paño: sus números son de empates. No se cambia
`calcular.ts` ni la regla de la E.T. delantera de los ventanales separados de enrollable.
La identificación sí se corrige, con autorización del coordinador: en apilables y autorreparables,
A1 es el paño superior y la numeración baja hacia el suelo, igual que el alzado. El anidado no cambia.
La cota del cristal mide su ancho de corte con los solapes de 2 cm, sin sobrescribir el número de una
cota que mida otra cosa.

Las referencias reproducibles están en `src/puertas/__fixtures__/planosReales.ts`.
`node scripts/contrastar-plano-puertas.mjs <carpeta local del estudio puertas>` comprueba por
script modelo, pedido y OF en RPS local, plano y bot; crea tablas de rayas por capa, longitudes,
curvas, colores y posiciones, textos/altura/giro, cotas/estilos y bloques/sombreados en
`tmp/plano-apilables/comparacion.md`, con un informe y JSON completo por pedido.
Normaliza el alzado por la cabecera y el corte por su cota de largo; pinta páginas y capas
lado a lado en PNG con `scripts/lib/plano-dxf.mjs`, sin ayudas externas. Cada diferencia
incluye su motivo y ninguna geometría no clasificada se presenta como equivalente.
AR2604526 se limita a su primera puerta: la página manual y su corte incluyen también
otras OF, por lo que no se afirma paridad de todo ese corte. AR2605036 mantiene el
escuadrado de 1 por lado del cálculo vigente aunque el histórico no lo incluyese.
El informe conserva las diferencias literales: «HASTA» corrige «ATA» en AR2604904; la OF se identifica
sin el prefijo «OF.» y la cantidad va en A1 cuando es mayor que uno. La nota particular
de 3 cm de AR2605065 es una excepción (Q-PU01 contestada); el espaciador central se configura
según el dibujo del pedido (Q-PU02 contestada).

`scripts/test-puertas-plano-fase3-e2e.mjs` siembra los cinco pedidos únicamente en `tmp/` de su
instancia aislada, comprueba dos cristales en AR2605065 y toma veinte capturas del alzado en claro
y oscuro a 1280×720 y 1600×1000. Comprueba además que ningún texto sobresalga del encuadre SVG.

## Suelo inclinado (AR2605035, 23/10/2026; sin programar)

Cuatro apilables de Portanova (FINSA + Montaxes Arca, gris 7038) con el suelo inclinado: cada puerta tiene un alto en cada lado y el cliente los acota con dos cadenas, una por lado (432 × 400/385, 440 × 410/400, 442 × 385/395…; el lado alto no siempre es el mismo). RPS solo da un alto. Decidido por Iván:

- **Datos**: las medidas del cliente, alto en el lado izquierdo y en el derecho. Solo cambia el **paño de abajo del todo**, donde va el saco; E.T., ventanas y cabecera siguen horizontales.
- **Paño de abajo**: trapecio, con un alto en cada lado.
- **Saco**: se corta en **paralelogramo**: los lados largos paralelos al bajo inclinado, con el largo de la diagonal del bajo, y las **cabezas verticales**. Así, al doblarlo y confeccionarlo, las cabezas quedan verticales y no en diagonal. «Es muy importante que la web lo haga bien». Pestaña y velcro, como siempre.
- La raya de soldar el saco, paralela al bajo, como en el dibujo de Iván.
- Los logos (FINSA en color sobre varios paños y Montaxes Arca de 22 × 9 en el paño de abajo) van impresos («4 lonas rotuladas I.D.U.V.»): observación del plano, no corte.

