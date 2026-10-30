# Clasificación documental de faldones y frontales

Ampliación del **29/10/2026** del [expediente](./faldones-frontales.md). Se ha leído el contexto de las **752 páginas de los 266 PDF candidatos**, contrastando el texto de todas sus páginas con el OCR disponible. Se han revisado visualmente **49 páginas de planos** y **24 páginas de 14 escaneos de apoyo**, sin declarar revisados completos esos escaneos. Las huellas de los 266 PDF locales corresponden al inventario previo.

**Actualización posterior al exportado de ventas:** este informe y su JSON conservan la clasificación inicial de10 documentos de fachada y120 compatibles pendientes. La [ampliación V08/V09](./faldones-frontales-casos-ivan.md) acredita C206 y C237: el acumulado pasa a12 y118, respectivamente. También corrige C018/C019 como **frontales nuevos, OF0213964**, separándolos del cambio de tela de otra línea, OF0213960. Las resoluciones y sus fuentes se conservan en el [JSON posterior](./faldones-frontales-casos-ivan.json).

**Cruce del30/10/2026:** los118 restantes ya tienen resultado por página/OF en el [censo comercial](./faldones-frontales-censo.md):80 coinciden con OF de la familia,1 con intermedio,35 con otros artículos y2 mantienen incidencias de identidad. Esto actualiza el trabajo pendiente descrito más abajo, sin reescribir la fotografía inicial ni admitir automáticamente reglas numéricas.

El resultado por documento, sus motivos, evidencia y fuentes P01–P14 están en [faldones-frontales-clasificacion.json](./faldones-frontales-clasificacion.json). Los identificadores **C001–C266** enlazan con el [índice documental](./faldones-frontales-indice.json); su orden se conserva. La muestra técnica V01–V07 mantiene sus medidas y sus fuentes. Esta clasificación no incorpora reglas a la web.

## 1. Resultado y significado de cada grupo

| Grupo | Documentos | Uso en el estudio |
| --- | ---: | --- |
| Fachada documentada | 10 | Casos anteriores y ejemplos cuyo escaneo/croquis acredita el vínculo; incluye cambios de tela. No son diez ventas ni diez piezas |
| Rectificación de fachada | 2 | R01 / AR2601656 y AR2603123: separar original, actuación y revisión |
| Cierre compatible, vínculo por confirmar | 120 | Confección compatible; falta acreditar artículo, montaje y tipo de trabajo. Conservar para el cruce con ventas, sin admitir reglas generales |
| Cierre a riel | 7 | Ruedas/riel o conjunto mixto; analizar montaje propio, separado del gancho al perfil |
| Cierre de estructura o conjunto mixto | 5 | Varios productos u otro anclaje; no atribuir todas sus piezas/OF a faldón de fachada |
| Taller de metal | 19 | Tubos, perfiles y herrajes; no acreditar unidades textiles con esos documentos |
| Referencia sin planteamiento de faldón | 3 | Faldones por medir, quitar ganchos o añadir un gancho al toldo. La ausencia del plano no excluye una posible línea de venta |
| Otra familia | 100 | No usar esos documentos como ejemplos de confección de este producto; otras líneas del mismo pedido pueden seguir siendo relevantes |
| **Total** | **266** | Cada documento tiene una decisión y evidencia o apoyo identificado |

Los 100 documentos de otras familias se reparten en: **45** de conjuntos de viseras/telones, **29** de lonas industriales con saco/sensor, **18** de carpas, **2** de lonas para pick-up, **2** de bambalinas, **2** de cortinas con soportes de orquesta, **1** cubierta de estructura y **1** lona del conjunto URO. «Toldo muelle» en un conjunto de viseras no se interpreta como muelle de carga.

Los **120 documentos por confirmar no son 120 pedidos**. Tampoco se cuentan las etiquetas automáticas de acrílico, PVC, transparente o cremallera como frecuencia de fabricación. Un pedido puede contener varios productos, dibujos anteriores y alternativas de corte.

## 2. Cómo se ha decidido

1. Abrir el PDF candidato completo y verificar su SHA-256, incluyendo las páginas sin la palabra de búsqueda. Incorporar el OCR previo de las páginas sin texto; las cifras de OCR no se aceptan como medidas.
2. Leer el contexto de la coincidencia: pieza, conjunto, remate, anclaje y notas. No basta con «frontal», «faldón» o «entrada de tubo faldón».
3. Contrastar visualmente los casos ambiguos y acudir al escaneo cuando sea necesario. El JSON identifica las páginas revisadas; los PDF y renders quedan únicamente en `tmp/faldones-frontales/clasificacion/`.
4. Distinguir documento textil, herraje, referencia comercial, versión anterior y actuación nueva. Una familia identificada en un documento no clasifica automáticamente el pedido entero.
5. Dejar el vínculo por confirmar cuando no se acredita el montaje o artículo. Ninguno de los 266 registros se admite por esta clasificación como regla general de corte, reserva o consumo.

No hay PDF binariamente idénticos entre los 266. Esto no descarta páginas repetidas, revisiones o planos casi iguales. Tampoco el texto idéntico demuestra duplicado.

## 3. Casos que cambian la interpretación

| Documentos | Contraste y decisión |
| --- | --- |
| C030/C031 · AR2501141 | P01 p1 identifica **lonas para pick-up**. Sus entradas de tubo faldón no las convierten en faldones de toldo de fachada |
| C065/C066/C067 · AR2502272 | P13 p1 identifica **lona techo de estructura**; p2 describe otras lonas con entradas y tubos. Separar cubierta, cierres y documento de tubos, aunque compartan el término faldón |
| C068 · AR2502337 | El plano tiene cuatro piezas pequeñas con bolsillo/cenefa. Las dos primeras páginas de P02 hablan de toldos cortina; no bastan para acreditar el montaje de esas piezas. Sigue por confirmar |
| C082/C083 · AR2502801 | P03 pp.1–2 y el plano contienen toldos cortina, lona confeccionada y cierre con ventana. El documento de tubos no es otra unidad textil; no trasladar la reserva conjunta a una sola pieza |
| C089/C125 · AR2502980 / AR2504450 | El primero es un conjunto para camping con Elektra, ventanas, puerta y lonas. El segundo tiene medidas y anotaciones de reparación distintas. La semejanza del conjunto no demuestra duplicado ni autoriza a intercambiar medidas |
| C110/C111 · AR2503645 | P05 p1 dice **lona para estructura**. Separar su lona de gran tamaño del documento de tubos; la entrada de tubo no acredita un faldón de fachada |
| C136 · AR2504913 | P06 pp.1–2 usa la hoja de faldón y explica que se aprovechan tubos existentes en el **cofre**. Conservar esta variante triangular con muesca, pese a que su forma aislada podría parecer una cubierta. No se han fijado sus aumentos de corte |
| C159 · AR2505626 | P14 pp.1–2 identifica **lona de techo de carpa TGM / lona para estructura**. Los «ollaos frontales» del perímetro no convierten la cubierta en un frontal vertical |
| C175 · AR2506102 | El plano identifica **bambalina/faldilla** y da dos cortes alternativos para aprovechar restos, con instrucción de usar solo uno. No sumar ambas alternativas como consumo o producción |
| C241/C242 · AR2602825 | P08 pp.1–2 identifica cambio de lona de **dos carpas de aluminio**. El tubo faldón de sus techos/bambas no acredita un cierre de fachada |
| C249/C250 · AR2603376 | Los PDF describen **cortina con soportes de hierro plegado de orquesta**. El cliente del escaneo P09 difiere del publicado; no unir ventas o medidas por el nombre del fichero. Falta el cruce por OF |
| C265 · AR2605163 | P10 p1 identifica trabajo de **escenario**. La pieza llamada faldón frontal forma parte de viseras, alas y telones, con confección propia |

## 4. Piezas, versiones y rectificaciones

### AR2500865: OCR idéntico, piezas distintas

C018 (`-20.pdf`) y C019 (`-21.pdf`) generan el mismo texto OCR. El dibujo distingue **B** y **A**, con diferencias visibles, y las huellas de los renders son distintas. Se conservan ambas piezas. La atribución inicial del JSON a cambio de tela se corrige con el exportado F48: **línea5, FALDON nuevo, OF0213964, cantidad2, frontales**. P12 pp.1–2 describe también un cambio de tela enrollable que corresponde a **otra línea,2 / OF0213960**. El escaneo de un pedido mixto no determina el tipo de actuación de todas sus OF.

### AR2600320: dos versiones de once páginas

C188 (`-10.pdf`) y C189 (`-10..pdf`) tienen once páginas cada uno. La página6 difiere: una incluye el detalle «ARRIBA PIQ» y la anotación adicional de piquetes. Se conservan las dos versiones. El punto duplicado del nombre no determina la vigente, y los dos PDF no acreditan dos fabricaciones.

### AR2603123: rectificación de AR2601618

Se precisa la advertencia del expediente anterior: **el PDF C244 no se descarta entero**.

- **Página1:** cajetín AR2603123 / OF0229790, dibujo actual con medidas distintas. Junto al material mantiene una anotación OF0227170; la primera OF encontrada en el texto no identifica necesariamente el trabajo actual.
- **Página2:** AR2601618 / OF0227170, versión anterior marcada visualmente **RECTIFICADO**. La marca no aparecía en la extracción de texto utilizada para el primer barrido.
- **P11 pp.1–2:** identifica el pedido original AR2601618 y pide un **lateral MFD nuevo**. La nota aclara que el frontal no se hizo en este pedido. Registrar la actuación como rectificación; no sumar un frontal por el croquis tachado ni duplicar la página anterior como pieza nueva.

Se mantienen las dos OF y su función: original/anotación heredada y actuación actual. La pertenencia de ambas OF ya se contrastó mediante GET en la ampliación anterior. Esta relación queda como **ID03**; no añade una nueva duda para OT.

### AR2601656: reforma del frontal de AR2600872

Se conserva R01 / ID04 y Q-FF03. Llevar el plano general del conjunto no acredita fabricar de nuevo sus tres piezas.

Además, se han detectado referencias a otros números en **12 documentos**. El JSON las conserva por documento: pueden ser versiones, plantillas copiadas, referencias legítimas o errores de OCR. Se deben comprobar por página y OF; no son motivo para excluir un pedido entero. La cabecera incorrecta de C021 y la relación de C244 ya tienen contraste específico.

## 5. Consecuencias para la futura ficha

Estas son necesidades de datos acreditadas por la documentación, **no fórmulas nuevas**:

| Dato que debe conservarse | Evidencia / motivo |
| --- | --- |
| Tipo de trabajo: nuevo, cambio de tela, reforma o rectificación; pedido/OF original y actual | C018/C019, R01 y C213/C244 tienen tratamientos distintos aunque usen el mismo material y dibujo de base |
| Pieza, letra y versión; vigencia y alternativas | A/B no se deducen del OCR; una página anterior o un segundo corte alternativo no son unidades adicionales |
| Montaje y producto asociado | Gancho/cofre, riel, estructura y carpa no comparten automáticamente herrajes, corte o reserva |
| Contorno con muescas/recortes y referencias de instalación | C136 es un faldón de cofre de forma especial; V06 conserva recortes y orígenes distintos por pieza |
| Material por componente y remate por borde/cara | Hay acrílico con transparente y entradas o solapas en PVC; el material principal no define toda la confección |
| Ventana, apertura y recogida por pieza | C043, C210, C217 y C248 contienen configuraciones distintas; mantener tamaño/posición y cara separados |
| Posición y origen de tiras, ollaos y mordazas; muestra y trabajo en obra | V06, C020 y C252 impiden sustituir todo por un reparto centrado o simétrico |
| Medición, hecho, corte/marcado y reserva separados | El tamaño del dibujo, la oferta o el anidado de varias piezas no acreditan una reserva individual |

## 6. Qué queda para cerrar

El **histórico exportado de ventas de2025–2026 ya se ha recibido**, fuente F48 de la ampliación V08/V09. La sección21 del expediente describe los219 registros de los tres códigos comerciales y su cobertura documental inicial. Se mantienen fuera de esta investigación las conexiones directas a bases y las credenciales; el análisis lee el fichero entregado por Iván.

Iván dispone del exportador `scripts/exportar-historico-faldones.mjs`. Desde la raíz del worktree, `node scripts/exportar-historico-faldones.mjs --exportar` consulta las conexiones ya configuradas de la aplicación `historial-pedido-hecho`: líneas de ventas RPS y, si está disponible, el histórico técnico. Lo ejecuta Iván; el agente solo ha probado `--dry-run` y las pruebas sin conexión. Sin `--exportar` no lee configuración ni abre conexiones. El JSON nuevo queda en `tmp/faldones-frontales/exportaciones/`, incluye todas las líneas de los pedidos seleccionados y los controles documentales, y registra si falta el histórico técnico. No filtra por presencia de OF o plano ni considera todas las coincidencias como faldones de fachada.

El cruce por página/OF debe resolver los **118 documentos compatibles** que quedan tras acreditar C206/C237, separar las líneas de los **5 conjuntos mixtos** y decidir el alcance de los **7 cierres a riel**. Los artículos vendidos sin plano, incluidos acrílicos, siguen entrando en el censo. Los documentos de otras familias y los herrajes se conservan como contexto, sin ocupar el lugar de las líneas textiles.

Después se compararán medidas, remates y reserva dentro de grupos ya identificados. Siguen abiertas Q-FF01/Q-FF02 sobre aumentos y tira inferior, Q-FF03 sobre la reforma de la puerta y Q-FF04 sobre la ventana130/109 de O Lugar. No se ha modificado producción, cargado datos ni subido la rama.

## 7. Comprobaciones de esta clasificación

- JSON y correspondencia única de los 266 documentos con su índice, grupo e identificador: correctos. Los grupos suman 266 y ninguno admite reglas generales por esta clasificación.
- SHA-256 de los 266 PDF locales frente al inventario, 14 escaneos de apoyo y 49 renders citados: correctos. Conservadas también las 40 fuentes de la muestra anterior.
- 263 fragmentos textuales/OCR cotejados por script con su página y método; los otros 3 documentos tienen apoyo externo identificado. Los fragmentos OCR sirven para localizar, sin convertir sus cifras en medidas.
- Relaciones, referencias, páginas revisadas y 84 enlaces locales de los documentos de seguimiento: correctos. A/B y las versiones diferentes se conservan; no hay PDF binariamente idénticos en el conjunto.
- `git diff --check` correcto. Verificación documental; sin cambios de lógica, pantallas o parámetros de producción.
