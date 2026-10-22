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

## Autorreparable

Saco actual **de 120 fijo**; el saco antiguo de 110 no es una opción.

- Cuerpo antes de empates: F × (H − 8,5), desde 12 del bajo terminado hasta H + 3,5.
- Empates normales: 2 de unión por cada uno, con posición indicada desde el borde inferior del cuerpo o propuesta para que quepa.
- Dos entradas, delantera y trasera: (F + 11) × 21.
- Saco: F × 32.
- Ventanas individuales: cristal = hueco + 4 por dimensión; radios y posiciones según dibujo.

No se inventan cremalleras, guías, espaciadores ni refuerzos de stock a partir de estas piezas de lona.

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

La web identifica cada paño con su código corto y cada pieza pequeña con letra de puerta y nombre; conserva OF y
REVÉS por pieza según la petición de Iván. Los textos son centrados y siguen el frente original de la pieza;
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
los cortes manuales. El plano DWG y su alzado quedan fuera de este cambio.

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
