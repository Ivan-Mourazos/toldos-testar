# Faldones laterales y frontales de toldo de fachada

Estudio iniciado el **29/10/2026**, actualizado el **30/10/2026**, por encargo de Iván. La muestra técnica V01–V09 comprende nueve pedidos originales contrastados, con **15 laterales y 7 frontales**, más una reforma vinculada al original. El [censo por línea y cruce documental](./faldones-frontales-censo.md) conserva 219 líneas de los tres códigos principales y 13 adicionales. La [revisión técnica posterior](./faldones-frontales-revision-tecnica.md) coteja las 86 páginas de los 80 nuevos vínculos con OF de la familia y resuelve el alcance de los 11 montajes y las dos identidades hasta donde permiten sus fuentes. No amplía todavía las reglas generales de corte o reserva.

**Confirmación de Iván, 29/10/2026 (OT-FF01):** los faldones de acrílico también se plantean a veces. El estudio debe recoger esos planteamientos y conservar su material. La muestra actual de acrílico no acredita qué proporción se plantea: al ampliar el histórico se distinguirán pedidos con planteamiento localizado y pedidos sin él localizado, sin excluir estos últimos por faltar DWG, DXF o PDF.

## 1. Alcance y estado recuperable

- Rama: `estudio-faldones-frontales`; revisión del código de partida: `318ad63`.
- Alcance confirmado por Iván: faldones laterales y frontales para toldos de fachada, con prioridad en los faldones; intermedios incluidos como grupo propio. Las lonas de escenario quedan fuera. Se conservan las diferencias por perfil, anclaje, entorno y remate.
- Documentación técnica, toma de medidas, despiece preliminar y propuesta de datos de entrada. La aplicación no se ha modificado.
- Fuentes compartidas abiertas en solo lectura; conversiones, extracción y renders en `tmp/faldones-frontales/`. Sin conexiones directas a bases, SQL propio ni credenciales. Catálogo y pertenencia de OF consultados mediante GET de la web; sin escrituras en el servidor o carpetas de red.
- Evidencia duradera: [fase inicial](./faldones-frontales-evidencias.json), [ampliación con fuentes y casos](./faldones-frontales-ampliacion.json), [índice documental](./faldones-frontales-indice.json) y [clasificación razonada](./faldones-frontales-clasificacion.md), con rutas originales, SHA-256, páginas utilizadas y límites. No se incorporan copias de documentos comerciales ni datos bancarios al expediente.
- Exportado de ventas recibido y verificado: fuente F48 de la [ampliación de los ejemplos de Iván](./faldones-frontales-casos-ivan.md). El [censo trazable](./faldones-frontales-censo.json) conserva líneas, documentos y coincidencias por página/OF, incluidas ventas sin plano localizado. Los casos de2023 sirven como antecedentes técnicos, no para afirmar vigencia general. El siguiente paso es validar pieza, montaje y revisión antes de extraer medidas de los nuevos vínculos.

## 2. Fuentes y límites

Los identificadores F01–F19 corresponden al JSON de evidencia. Las referencias siguientes usan `OT` = `\\192.168.0.128\Oftecnica\Oficina Tecnica` y `RPS` = `\\192.168.0.128\RPS\VENTAS`.

| Fuente | Original y lectura | Qué acredita / límite |
| --- | --- | --- |
| F01–F03 | `OT/DIBUJOS/FALDON/FALDON.dwg`, `FALDON2.DWG` e `INFORMACION/IMAGENES/FALDON.dwg`; convertidos a DXF con ODA | Inventario de notas, cotas y variantes; una figura copiada no se atribuye automáticamente al pedido actual |
| F04 | `OT/DIBUJOS/FALDON/INFORMACION/INSTRUCCIÓN MEDICIÓN faldones.doc`; texto de sus piezas de Word | Define laterales y frontales, medición y componentes. No se ha acreditado una fecha de revisión vigente; su índice contiene textos ajenos y no se usa como norma estadística |
| F05–F06 | `OT/DIBUJOS/FALDON/Soporte-gancho/Soportes_faldon.pdf` y `Soporte_Faldon_Monobloc.pdf`; página 1 de ambos, revisada visualmente | Planos propios del 11/05/2022, en mm, modelo M.F. izquierda. El primero advierte medidas aproximadas; no valida todas las compatibilidades ni el lado opuesto |
| F07 | `OT/PROGRAMAS CALCULO/TOLDOS TESTAR 10-4.xlsm`; 32 hojas, nombres y coincidencias de texto/fórmulas | No hay hoja propia de FALDÓN o FRONTAL en este maestro. Las coincidencias de «frontal» son también posiciones de soportes; no se convierten en fórmulas de confección |
| F08, F10, F12 | DWG, escaneo del pedido y plano publicado de AR2502986 | Lateral con goma superior para Cuarzo Box; caso V01 |
| F09, F11, F13–F15 | DWG, escaneo, dos PDF publicados y libro de AR2601947 | Lateral para Perla Box, con OF de faldón distinta de la del toldo; caso V02 |
| F16–F19 | DWG, escaneo y dos PDF publicados de AR2300285 | Dos laterales y dos frontales con ventanas, solapas y pendiente; caso V03. Antecedente de 2023 |

También se inventarió por nombre `PLANTEAMIENTOS GUÍA`, sin coincidencias de nombre FALD/FRONT. Eso no descarta que existan otros casos dentro de ficheros llamados por pedido. Los `.bak`, fotografías y modelos SketchUp de la carpeta FALDÓN no se declaran versiones vigentes por su presencia.

## 3. Identidad y medición

F04 distingue dos productos con sistemas de medir, confeccionar e instalar diferentes:

| Variante | Anclaje descrito | Medidas de entrada documentadas |
| --- | --- | --- |
| Lateral | Tubo faldón entre tubo de enrolle y perfil de carga; gancho o adaptación al perfil | Altura desde tuerca del enrolle al suelo; separación a pared; distancia del perfil de carga a pared; diagonal desde suelo-pared al perfil de carga; altura del perfil de carga al suelo; posición y medidas de ventana u otros elementos |
| Frontal | Varios puntos del perfil de carga, mediante regletas según F04 | Altura desde la parte inferior del perfil al suelo en ambos extremos; extensión horizontal; posición de ventanas, entrada inferior y demás elementos |

La hoja comercial de los casos reales precisa que los laterales se miden desde el centro del tubo de enrolle y el tornillo de carga. No se mezclan estas cotas de instalación con las cotas terminadas o de corte. Debe conservarse el punto de referencia usado en cada pedido, especialmente en cofres con adaptaciones.

En zócalos y mamparas, F04 pide medir primero el contorno completo y triangular posición y recortes respecto a puntos del toldo. No basta con largo y alto: dos alturas, la separación y una diagonal pueden cambiar la forma aunque la oferta tenga las mismas dos medidas nominales.

Las telas de los planos publicados están en **cm**; los soportes metálicos, en **mm**; el transparente se describe como **650 micras**. No se convierten sin indicar la unidad original. MFD/MFI y «derecho/revés» se conservan como datos de la fuente; queda por fijar una convención de vista para la futura aplicación.

## 4. Estado de la aplicación

`src/domain/catalog.js` no contiene un modelo propio FALDÓN, FALDÓN LATERAL o FRONTAL. Tener campos de «frontal» en despieces de otros toldos no acredita este producto. No se ha identificado un cálculo propio de faldones ni se ha añadido uno en esta fase.

F07 no ofrece una hoja dedicada. El libro de AR2601947 y el PDF `-1` corresponden al toldo Perla Box; el faldón se desarrolla en DWG/PDF `-10`. Compartir número de pedido no permite utilizar la tela o la OF del toldo como resultado del faldón.

Propuesta de organización a estudiar: una familia de trabajo «Faldones», con lateral y frontal como variantes explícitas, piezas relacionadas por pedido y OF, y remates independientes por borde. Falta contrastar el censo y los artículos antes de fijar códigos persistidos o cambiar el selector de la web.

## 5. Matriz inicial de configuraciones

| Eje | Variantes documentadas | Evidencia / cobertura actual |
| --- | --- | --- |
| Geometría | Lateral inclinado; frontal con pendiente inferior; recorte para zócalo; asiento en mampara | F04; V02 y V03. Recortes y mamparas todavía sin pedido contrastado |
| Relación con el toldo | Tubo de enrolle/carga; Monobloc; Cuarzo Box; Perla Box | F04–F06, V01 y V02. No hay tabla completa de compatibilidad |
| Confección superior | Entrada de tubo; entrada con solapa/velcro; goma elástica | F01–F02, V01–V03; dependen de variante y pedido |
| Laterales y bajo | Bastilla, tira con ollaos, entrada de tubo/fleje, velcro y solapa | F04 y V02/V03; no hay un único remate universal |
| Material | Acrílico, PVC y ventana transparente | F04; muestra real en acrílico, V03 con transparente 650 micras. PVC pendiente de contraste real |
| Planteamiento | También se realiza a veces en faldones acrílicos | OT-FF01, confirmado por Iván; registrar disponibilidad de documentos por pedido, sin dar por hecho que todos se plantean |
| Ventana | Tamaño, posición y márgenes propios; varios paños | V03. No se fija una ventana por defecto |
| Apertura / recogida | Puerta con cremallera o velcro; correas de recoger | F04 y plantillas; sin caso completo contrastado en esta fase |
| Tensado | Mordazas/cintas y abatibles, ollaos, entrada de tubo inferior | F04 y V02. Cantidad y posición dependen del pedido |
| Acabado y cara | Derecho/revés, velcro bravo/suave por cara, refuerzos y rotulación | V01–V03. Falta convención común de orientación |
| División | Varios frontales y uniones entre piezas | V03: dos frontales C/D, 313 cm cada uno, frente total 626 cm |

## 6. Casos contrastados

### V01 · AR2502986 · lateral con goma para Cuarzo Box

F10, páginas 1–2, y F12, página 1, revisados visualmente. El pedido especifica acrílico Vesubio 2636, goma elástica superior de 7 y remate amarillo; el presupuesto resume 236×85 cm. La hoja de medición aporta más cotas que ese resumen y pide una adaptación con alcayata en el cofre.

El plano F12, fechado 10/06/2025, lleva **OF 0217885**, goma elástica de 7 blanca, BN(4), un ollao en la esquina inferior y remate ondulado. Identifica 236 cm en la pieza hecha y 244 cm en el contorno de corte; este último también rotula 102,9 cm en su caja de tamaño. Esa diferencia no se convierte en una demasía rectangular general para cualquier lateral inclinado.

No se impone el tubo con garfio de la descripción genérica a esta variante. La medida nominal de la oferta tampoco sustituye a las medidas de instalación.

### V02 · AR2601947 · lateral con entrada para Perla Box

F11, páginas técnicas 1–3 y 5; F14, página 1, revisados visualmente. F13 se leyó también como texto para identificar la OF del toldo. La oferta describe inicialmente 300×290 cm; la hoja posterior de faldón toma **272 cm desde pared**, alturas **206 y 295 cm**, diagonal **326 cm** y sitúa la tira a **20 cm**. Son fases distintas del pedido.

El plano del faldón F14, fechado 26/05/2026, lleva **OF 0227726**; el toldo del PDF F13 lleva **0227725**. La pieza tiene entrada superior de tubo faldón, BN(4), refuerzo en esquina, tira de cuatro ollaos en el lado pared y tira inferior. Sus cotas incluyen 206+3=209 cm y 295 cm en los extremos; la pequeña vista de corte rotula 280×322,3 cm. No se atribuyen al faldón los 330,8×345 cm del paño del toldo.

La nota del plano pide abajo cuatro mordazas (25) con cinta negra de 55 cm y cuatro abatibles; en pared también mordazas/cinta y abatibles, sin una cantidad numérica inequívoca en esa línea. Pide ganchos para ambos lados. La documentación posterior del pedido trata una reclamación de esos ganchos: el montaje debe conservar modelo, lado y adaptación; «dos lados» no equivale a dos unidades de faldón.

### V03 · AR2300285 · dos laterales y dos frontales con ventanas

F17, páginas 1–3, y F19, ambas páginas, revisados visualmente. F18 es el planteamiento separado de los cambios de tela de fachada; sus tres lonas no se cuentan como faldones.

- F19, página 1, **OF 0188203**: laterales A/B, acrílico negro y transparente 650 micras, refuerzos, entrada de tubo/fleje, solapa con velcro y tira con ollaos. Las alturas y pendientes son diferentes en cada pieza.
- F17, página 3, pide un frente total de **626 cm dividido en dos frontales de 313 cm**. Las alturas de sus extremos y unión son **198,5 / 218,2 / 238 cm**; el bajo sigue la pendiente.
- F19, página 2, **OF 0188204**: frontales C/D. Cada ventana tiene **273×137 cm**, con márgenes laterales de 20 cm en la cota de 313: 20+273+20=313. Hay entrada superior e inferior, velcros con cara especificada y remates distintos en los bordes exteriores/de unión.
- Las pequeñas vistas de corte son distintas: **C, 317,5×228,9 cm; D, 320,5×248,6 cm**. Igual frente hecho no implica igual corte si cambian borde, pendiente o unión.

Los planos indican empate de 2 cm. Se acredita en este caso y en V01/V02; todavía no se generaliza a cualquier unión, material o máquina.

## 7. Reglas acreditadas y parámetros pendientes

| ID | Hecho documentado | Alcance permitido ahora |
| --- | --- | --- |
| R-FF01 | Medición propia según lateral o frontal | Separar las entradas y sus anclajes; F04 y hojas de los casos |
| R-FF02 | Deben conservarse las dos alturas y la pendiente del frontal | V03; no reducirlo a un rectángulo con altura media |
| R-FF03 | La ventana tiene dimensiones y posición independientes | V03; sin tamaño automático |
| R-FF04 | Cada borde puede tener remate y cara diferentes | V01–V03; no sumar un único aumento a toda la caja envolvente |
| R-FF05 | Tira inferior a 15 cm en la instrucción, pero a 20 cm en V02 | Conservar la cota de cada pedido; no establecer todavía un valor obligatorio |
| R-FF06 | Goma, garfio, regleta y soporte de cofre no son una pieza intercambiable sin verificar | F04–F06, V01/V02; compatibilidad pendiente por perfil |
| R-FF07 | Empate de 2 cm anotado en los tres planos de la muestra | Candidato a parámetro de confección; no certifica todas las combinaciones |
| R-FF08 | BN(1), BN(4), entrada, fleje, tira y solapa se anotan por separado | Mantener la anotación original; falta cerrar la transformación exacta a corte y reserva |

## 8. Despiece preliminar

No hay todavía correspondencia de artículos RPS ni cantidades generales aprobadas. F04 es un censo de componentes y se contrasta con las excepciones de los casos:

| Pieza | Función y variantes documentadas | Responsable en F04 / pendiente |
| --- | --- | --- |
| Textil opaco | Acrílico/PVC, material y color del pedido | Producción; referencia y ancho real de bobina pendientes por caso |
| Transparente | Ventana; 650 micras en V03 | Producción; paños, empates y reserva pendientes |
| Tubo faldón y garfio | Tubo descrito con diámetro 20; garfio en lateral convencional | Calderería; confirmar referencia/unidad y sustituciones para cofres |
| Gancho de carga / regleta | Adaptación al perfil y anclaje frontal | Calderería; verificar modelo, lado, acabado y cantidad |
| Tira con ollaos | F04 menciona ojal grande de 14 | Producción; unidad y reparto exacto no se deducen de esa cifra |
| Solapa y velcro | Bravo/suave; coser/soldar según material y cara | Producción; F04 cita 5 y las plantillas también contienen 3; verificar pieza y función antes de fijar ancho |
| Cinta y mordaza | Familia (25); V02 pide tramos de 55 cm abajo | Producción; no extrapolar cantidad y longitud a todas las piezas |
| Abatible / anilla / tornillería | Fijación según suelo, pared, madera y soporte | Almacén/producción; referencia, unidad y vía de reserva pendientes |
| Fleje, refuerzo y goma | Elementos de variantes concretas | Identificar por pieza y pedido; no añadirlos por defecto |

Los planos F05/F06 dan materiales y medidas concretos de soportes, no una lista RPS: pletina inox/lacada de 15×3; para Monobloc, pletina de aluminio 25×4 de 300 mm y ángulo 40×40×3 de 63 mm. Se conservan fecha, mano izquierda y la advertencia de aproximación del primer plano.

## 9. Reserva y contraste histórico

El exportado recibido aporta líneas, artículos, cantidades comerciales y OF; la sección21 describe su alcance. Falta cerrar el censo por pieza y obtener consumos: no se declara reserva verificada. Las OF escritas en los planos permiten localizar la documentación, pero no prueban por sí solas el artículo o la cantidad reservada en RPS.

El futuro contraste debe separar tela del toldo, laterales, frontales, adaptación metálica y montaje. V02 tiene OF distintas para toldo y faldón; V03 tiene OF distintas para laterales y frontales. No sumar documentos duplicados ni usar cantidad de páginas, sufijo `-10` o número de ganchos como cantidad de piezas.

## 10. Datos de entrada propuestos para la futura ficha

Esta es una propuesta documental, pendiente de contrastar con más casos:

| Grupo | Datos que hay que conservar | Motivo |
| --- | --- | --- |
| Identidad | Pedido, OF, pieza/letra, unidades, tipo lateral/frontal, toldo asociado | Separar piezas y reservas del mismo pedido |
| Medición | Cotas originales y unidad; anclaje y punto de referencia; dos alturas; distancia horizontal y diagonal; lado y vista | Reconstruir la forma y detectar datos incompatibles sin perder la medida comercial |
| Contorno | Esquinas, recortes, zócalo, mampara y pendiente del suelo | No obligar todas las piezas a un rectángulo |
| Material | Textil, color, ancho de bobina, derecho/revés, transparente | Corte, empates, cara y reserva |
| Confección | Remate por borde, ancho de bastilla/entrada, tira/ollaos, velcro/cara, fleje, refuerzos y empate | Transformar cada borde con su regla acreditada |
| Ventana / apertura | Tamaño y posición; puerta con cremallera o velcro | Geometría y composición propias |
| Tensado / montaje | Posición de tiras, mordazas/cintas, abatibles y soportes/adaptaciones | Evitar inventar accesorios o asumir compatibilidad |
| Acabados | Remate, rotulación, observaciones y croquis del pedido | Conservar excepciones y lectura en taller |

## 11. Dibujos necesarios

Como mínimo: pieza hecha con cotas de instalación claramente separadas; vista de confección por borde y cara; contorno de corte con empates; ventana y aperturas; accesorios y detalle de anclaje cuando cambie el perfil. Un conjunto con varias piezas debe conservar letras y uniones (V03 A/B/C/D).

La vista de revés y la orientación deben ser explícitas. El soporte metálico se dibuja con su unidad y mano, separado del textil. La caja de tamaño del corte no sustituye al contorno real. Los planos publicados existentes son la muestra de lectura; todavía no se ha diseñado una nueva pantalla ni un PDF de la web.

## 12. Comprobaciones de la fase inicial

- Leídas y registradas 19 fuentes: seis DWG convertidos localmente con ODA, un DOC, dos XLSM y diez PDF. Los SHA-256 están en el JSON de evidencia.
- Revisadas visualmente las páginas técnicas indicadas en cada caso y los dos planos de soportes. Los PDF escaneados se renderizaron; no se usó OCR para fijar las cifras.
- Leídos nombres de hojas y coincidencias relevantes de los dos libros, sin macros ni recálculo. Un resultado cacheado o una hoja copiada no se toma como fórmula de faldón.
- Contraste de las OF y la separación de piezas por documento; comprobaciones aritméticas 313+313=626 y 20+273+20=313 en V03.
- Comprobados el JSON, sus 19 correspondencias de fuente/SHA-256, las referencias de los tres casos y los enlaces del expediente, seguimiento y dudas; sin errores. `git diff --check` correcto.
- Sin cambios de lógica, pantallas o parámetros; no se ha validado un nuevo cálculo de producción ni ejecutado una carga.

## 13. Dudas para cerrar antes de automatizar

| ID | Evidencia y cuestión concreta | Tratamiento hasta aclararla |
| --- | --- | --- |
| Q-FF01 | V01 rotula 236 cm hechos y 244 de corte; los frontales C/D de V03 tienen el mismo frente de 313 pero cortes distintos. Falta una tabla vigente de transformación por BN, entrada de tubo, fleje, tira, solapa, cara y material. ¿Qué aumentos y reglas de esquina se deben aplicar hoy a cada remate? | Conservar las cotas y anotaciones por caso; no registrar demasías generales inventadas |
| Q-FF02 | F04 describe la tira inferior a 15 cm; V02 la pide y dibuja a 20 cm. ¿Los 15 cm siguen como valor habitual editable, o se ha cambiado el criterio general? | La posición explícita del pedido prevalece; sin valor obligatorio nuevo |
| Q-FF03 | En la reforma AR2601656 del frontal AR2600872 se pide «aumentar a porta 35 cm para a dereita». El original tiene puerta de 120 a 165 del borde; el plano de reforma mantiene 120 y la sitúa a 200. ¿Se debía desplazar la abertura o ensancharla? | Conservar las dos versiones y la petición; no interpretar automáticamente la reforma ni convertirla en nueva fabricación |
| Q-FF04 | En AR2602384, la visita pide ventanas de130 de alto y los dos planos y el DWG muestran109. En el frontal25+109+70=204. ¿Fue una decisión para conservar esos márgenes y alinear las ventanas, o hubo otra indicación? | Conservar la petición y el diseño dibujado por separado; no crear un descuento habitual de21. Evidencia V09 |

La compatibilidad de ganchos por cofre y el criterio de vista se completarán con documentación e histórico pendientes; no se dan por resueltos por un único ejemplo. Las referencias RPS ya contrastadas se recogen en la sección 16.

## 14. Barrido documental de 2025–2026

Se han leído por script los **8.011 PDF publicados** en `RPS/PLANTEAMIENTOS/2025` y `2026`: 4.509 de 2025 y 3.502 de 2026. La extracción identifica **10.974 páginas**; tres ficheros devuelven estructura PDF inválida, uno con nombre de temporal `.af~l.pdf`. Sus rutas y huellas están en el índice; no se declaran revisados correctamente. Ningún fichero se ha excluido solo por no llevar el producto en su nombre.

El texto reconoce **112 PDF que mencionan faldones**, correspondientes a 104 números de pedido por nombre de fichero, y otros **14 PDF con «frontales»** sin «faldón» reconocible. Un subconjunto inicial de 48 PDF de 45 números contiene entradas, tiras o ganchos de faldón. Ese filtro no confirma la familia: también aparecen cortinas, carpas y escenarios.

**3.185 PDF tienen alguna página sin texto**; 3.163 no tienen texto en ninguna. Las **3.199 páginas sin texto** se han procesado con OCR local en dos orientaciones (6.398 reconocimientos, sin errores de procesamiento). Hay 34 páginas positivas en la orientación original y 112 con giro adicional de 270°; son resultados solapados, no piezas ni pedidos distintos. El total incluye la página de control procesada antes de reanudar el lote.

La unión de texto y OCR conserva **266 documentos candidatos, de 206 números por nombre de fichero**: **140 documentos se recuperan únicamente por OCR**. En la primera ampliación se habían vinculado siete documentos a casos cotejados y quedaban 259 por clasificar. Esa clasificación se ha completado documentalmente en la sección 20; los cierres sin vínculo acreditado se mantienen por confirmar. El índice conserva páginas, método, orientación, SHA-256 e indicios; no guarda las cifras del OCR como medidas. Las etiquetas automáticas de material o confección no sustituyen la decisión razonada.

Dos controles muestran el límite de cobertura: AR2601947 no se reconoce en la orientación inicial y sí al girar 270°; AR2502986 describe la pieza con material, goma y remates **sin nombrar «faldón»**, por lo que queda acreditado por el caso V01 aunque no aparezca en los candidatos por palabra. Un negativo no acredita ausencia. El singular «FRONTAL» puede designar una posición de montaje de otro toldo y no identifica esta familia por sí solo.

Esto es un **inventario documental**, distinto del censo de ventas. El exportado recibido posteriormente aporta las líneas de pedido con artículo, cantidades y OF: véase sección21. El GET de autocompletado de toldos no basta para obtenerlas: en AR2601656 devuelve líneas no reconocidas, y la ruta de pedido de remolques tampoco expone estas líneas.

## 15. Casos añadidos y separación de documentos

Las nuevas fuentes **F20–F40** están en el JSON de ampliación; F01–F19 mantienen sus identificadores. Se han leído 21 fuentes adicionales: dos DXF, cuatro fotografías técnicas, cuatro DWG y once PDF. Se indica qué páginas se han visto; recoger un escaneo no equivale a revisarlo entero. AR2601502.dwg está en `OT/2026/TOLDOS`, no en la raíz anual. El DWG propio de AR2601656 no se localizó en esas dos ubicaciones; el original AR2600872.dwg contiene una nota que lo vincula a la rectificación.

| Caso | Fuentes y piezas cotejadas | Qué aporta |
| --- | --- | --- |
| V04 · AR2501627 | F26–F28; plano de dos páginas, escaneo técnico pp. 2–4. Dos laterales A/B, OF0215423, y dos frontales C/D, OF0215424; acrílico negro + transparente650 | Frontales hechos **419×204** y **247×204**, ventanas **379×110** y **207×110**, a20 de cada lado y60 del borde inferior. Cortes **423,5×214** y **251,5×214**. ET arriba/abajo y BN1 con velcro y cara. El +4,5/+10 observado no se convierte en fórmula general. El escaneo pide dos remates especiales para Monobloc |
| V05 · AR2601478 | F29/F31; plano p1. Dos laterales A2/A3 y frontal A1; acrílico negro + transparente650. OF impresa «0226900-01», contrastada con OF0226900 y0226901 de la web | Frontal de **290**, alturas **238/200**, ventana **226×138**, márgenes32 laterales y30 arriba; corte **295,5×248,2**. Contorno inclinado, ET/BN4, velcro5 negro con cara, tira de tres ollaos. La nota por lateral especifica tubo con garfio215 y tres mordazas25 con cinta50 y abatibles; no trasladar esa cantidad a todos los laterales |
| V06 · AR2601502 | F32/F34; plano pp. 1–3. **Solo D/E de p3**, OF0226985, son los dos laterales de PVC580 arena estudiados | Recorte/escalón, pestaña, ET, BN4 y refuerzo. Torniquetes y mordazas con orígenes y posiciones propios por pieza; detalle debajo. A/B de p1 son telas con bambalinas de otra OF y C de p2 es tela con varillas: no se cuentan como estos faldones ni se les atribuye la reserva conjunta |
| V07 · AR2600872 | F37–F40; escaneo p3 y planos originales de06/04/2026. Dos laterales A/B OF0225860 y frontal C OF0225859; acrílico resinado antracita + transparente650 | Frontal hecho **475×198**, corte **477×208**, franja transparente de108 de alto, márgenes20 arriba/lados y70 abajo. Puerta de **120** situada a **165** del borde izquierdo, dos cremalleras de doble accionador y cintas para recoger. Laterales con cortes **281×224,2** y **279×215,9** |
| R01 · AR2601656 | F35/F36; escaneo y plano, dos páginas cada uno; vínculo adicional en F37 | **Reformar el frontal anterior**, no fabricar tres piezas nuevas. El escaneo identifica AR26.00872; las OF0225859/60 del plano pertenecen al original. El pedido de reforma tiene OF0227197/8. El plano de reforma sitúa la puerta de120 a200 del borde, frente a165 del original; Q-FF03 conserva la diferencia entre desplazar y ensanchar |

En V06 las posiciones escritas y corroboradas con el DWG son:

| Pieza y elemento | Origen indicado | Posiciones en cm | Separación transversal |
| --- | --- | --- | --- |
| D · torniquetes | Desde atrás | 16; 73; 130; 187; 244,5 | 2 desde abajo |
| D · mordazas | Desde abajo | 7; 42,5; 78,5; 103,5 | 10 del borde |
| E · torniquetes | Desde atrás | 25,5; 84,5; 144; 203,5; 263; 322,5 | 2 desde abajo |
| E · mordazas | Desde arriba | 5; 44; 84; 120,5 | 10 del borde |

La nota pide cintas negras de45 cm al revés, enviar10 torniquetes nuevos y conservar la lona de muestra. No se centra ni invierte este reparto aplicando reglas de remolques. La futura ficha necesita **posición, origen, borde y cara por pieza**, incluso entre dos laterales del mismo conjunto.

## 16. Artículos RPS y despiece acreditado

Consulta de catálogo por GET del29/10/2026, fuente devuelta `RPSNext`; respuesta local con SHA-256 en la ampliación. La búsqueda «FALDON» devuelve37 coincidencias. La búsqueda «FRONTAL» queda limitada a60 resultados y no se declara catálogo completo.

| Referencia | Descripción o distinción acreditada | Unidad RPS / límite |
| --- | --- | --- |
| `FALDON` | Faldón lateral o frontal nuevo para toldo fachada | UNI; el artículo no distingue la geometría lateral/frontal |
| `CAMBIOTELAFALDON` | Cambio de tela a faldón de toldo fachada | UNI; separar del nuevo y de las reformas |
| `FALDONINTERMEDIO` | Faldón intermedio entre toldos | UNI; en AR2602384 hay una unidad nominal66×265, OF0228561, con fabricación directa anotada; no se acredita su corte con los planos A/B |
| `GAFALD` / `GFALI` | Gancho derecho / izquierdo genérico | UNI; no demuestra compatibilidad con cualquier cofre |
| `GAFALDTCBL`, `GAFALDTCNEG` / `GFALITCBL`, `GFALITCNEG` | Gancho de tubo de carga inox, derecho / izquierdo, blanco / negro | UNI |
| `GAFALDTMOBL`, `GAFALDTMONEG` / `GFALITMOBL`, `GFALITMONEG` | Gancho de tubo Monobloc aluminio, derecho / izquierdo, blanco / negro | UNI |
| `GANCHOFATE` | Gancho de tubo de enrolle, inox | UNI |
| `TUBLI3/8` | Tubo galvanizado liso de6m, 3/8", descrito para faldones | BARRA; no se ha acreditado equivalencia con «diám.20» de F04 ni una regla de reserva de barras |
| `REFUFALDON` | Refuerzo para faldón de stock | M²; no acredita consumo fijo por esquina |

La consulta distingue además faldones de sombrillas, puertas, escenarios y otros productos. Compartir la palabra no autoriza a incluirlos en esta familia. Las fotografías F22–F25 permiten reconocer las formas de gancho y pletina; sin escala ni referencia escrita no acreditan medidas ni asociación exacta a un código RPS. Siguen pendientes los códigos y consumos inequívocos de cada tubo, cinta, mordaza, abatible, cremallera, velcro y transparente según configuración.

## 17. DXF de acrílico: marcado y medidas

Se han contrastado los DXF de máquina **F20/F21** con V01/V02. La leyenda de herramientas próxima al origen se separa del cuerpo situado con coordenadas X superiores a500 en estos dos ficheros; no se propone ese umbral para otros dibujos. Se miden LINE/ARC/CIRCLE, incluyendo solo los extremos y cuadrantes contenidos en el arco, para evitar agrandar la caja con la circunferencia completa.

| Pedido | Entidades del cuerpo / capa | Caja en unidades DXF | Equivalente contrastado con el plano |
| --- | --- | --- | --- |
| AR2502986 | 27 / ROTULADOR | 2440×1029,4930 | **244×102,9493cm** frente a244×102,9 rotulados |
| AR2601947 | 14 / ROTULADOR | 3223,4303×2800 | **322,3430×280cm** frente a322,3×280 rotulados |

La comparación acredita una escala de10 unidades DXF por cm y diferencias inferiores a0,051cm respecto al tamaño rotulado. **La geometría del cuerpo está en ROTULADOR**. La existencia de capas DISCO/CUTTER en la leyenda no prueba que esas herramientas se hayan usado en la pieza. Estos ficheros acreditan el marcado y sus dimensiones; no certifican ejecución física ni permiten deducir automáticamente reserva de tejido.

## 18. Identidad, revisiones y controles de la ampliación

Las OF se han contrastado mediante `GET /api/orders/<pedido>/ofs`; la ampliación conserva fecha, URL, respuesta y SHA-256 local de12 consultas. Ese endpoint confirma pertenencia, sin aportar artículo, cantidad o consumo. Se han detectado y conservado estas incidencias:

- `AR.25.00926-1.pdf` imprime AR2400926, pero su OF0214058 pertenece a **AR25.00926**. La web devuelve otras OF para AR24.00926: no asociar solo por la cabecera.
- `AR.26.03123-10.pdf` contiene **dos estados**: p1 actual AR2603123 / OF0229790 y p2 anterior AR2601618 / OF0227170, marcada visualmente «RECTIFICADO». El nuevo escaneo confirma una rectificación con lateral nuevo; no descartar el PDF entero ni sumar la página anterior como otra fabricación. Se precisa así la advertencia de la primera ampliación; detalle ID03 de la clasificación.
- **AR2601656** conserva OF del original AR2600872 porque es una reforma, vinculada por escaneo y nota del DWG. El propio DWG original mantiene165/120, mientras el PDF reformado muestra200/120; no sustituir las cotas originales ni deducir cambios por la fecha del fichero.

Se han comprobado por script: cobertura única de las3.199 páginas en ambas orientaciones; correspondencia de huellas entre OCR y PDF; fuentes, referencias y OF de los casos; aritmética de ventanas y posiciones de puerta; cajas DXF frente a planos; JSON y enlaces del expediente. Los ficheros locales de auditoría completos permanecen en `tmp/`; el índice duradero conserva candidatos, método y SHA-256, sin copiar textos comerciales ajenos.

## 19. Trabajo pendiente para cerrar el estudio

1. Ampliar el censo a más actuaciones genéricas y reformas cuando se acredite su alcance. Ya están trazadas219 líneas de códigos principales y13 adicionales; se separan sus grupos y se conservan los acrílicos sin plano localizado.
2. El cotejo de pieza y página de los 80 documentos con OF de la familia está terminado en la sección24. De los 11 montajes genéricos, ocho se separan y tres quedan sin acreditar, fuera de las reglas; las dos incidencias de identidad tienen decisión de exclusión sin corregir números. Completar el documento de intermedio C186 dentro de su grupo propio. Los 5 conjuntos mixtos y 7 cierres a riel conservan su clasificación anterior, separados de estas reglas. Los recuentos documentales no equivalen a pedidos ni unidades.
3. Recuperar para cada grupo escaneo, DWG/planteamiento y DXF cuando existan; completar intermedios y cambios de tela dentro del alcance de fachada. Mamparas y zócalos se estudian como condicionantes del faldón, sin ampliar el producto a otros cerramientos ni escenarios.
4. Contrastar por script todos los casos recuperables, distinguiendo instalación, hecho, corte, marcado y reserva. Resolver Q-FF01/Q-FF02 antes de fijar aumentos y valores habituales; aclarar la reforma Q-FF03 y la altura de ventana Q-FF04 sin propagarlas a un cálculo general.
5. Completar códigos y consumos de despiece, equivalencias de tubo y compatibilidad de soportes. Preparar después propuesta de cálculo, ficha y dibujo; la implementación tendrá sus propias pruebas.

**Estado:** censo comercial y cotejo de piezas/versiones de los 80 nuevos vínculos terminados. Quedan pendientes las reglas generales de confección y reserva, el grupo de intermedios/cambios de tela sin plano y las tres confirmaciones de montaje Q-FF05. Se conservan los límites históricos por pieza sin dar por validadas todas sus cotas. Sin cambios de producción ni carga.

## 20. Clasificación de los266 candidatos y evolución

En la clasificación inicial se leyeron las **752 páginas** de los candidatos y se contrastaron **49 páginas de planos** y **24 páginas de14 escaneos de apoyo**. El [informe de clasificación](./faldones-frontales-clasificacion.md) y su [evidencia inicial por documento](./faldones-frontales-clasificacion.json) conservan esa fotografía anterior al exportado. Las [resoluciones posteriores](./faldones-frontales-casos-ivan.json) acreditan C206/C237 y corrigen el tipo de actuación de C018/C019. La tabla siguiente conserva el estado tras esas dos admisiones, **antes del cruce comercial del30/10**: la sección23 desglosa los118 que entonces quedaban pendientes. C001–C266 son identificadores documentales, no fichas ni unidades de producción.

| Resultado | Documentos |
| --- | ---: |
| Otra familia | 100 |
| Tubos/perfiles/herrajes de taller | 19 |
| Referencia sin planteamiento de faldón | 3 |
| Fachada documentada | 12 |
| Rectificación de fachada | 2 |
| Cierre compatible, vínculo por confirmar | 118 |
| Cierre a riel | 7 |
| Cierre de estructura o conjunto mixto | 5 |
| **Total** | **266** |

La clasificación evita tres errores concretos: deduplicar A/B de AR2500865 por tener el mismo OCR, descartar todo AR2603123 por llevar una página anterior, y excluir el faldón triangular de AR2504913 por su forma. El escaneo vincula este último con un cofre y sus tubos existentes. Las referencias a otros números detectadas en 12 documentos se conservan para cotejar por página y OF, sin exclusiones automáticas.

Se han comprobado las correspondencias de los 266 registros con el índice, las huellas de los PDF locales, fuentes de apoyo y renders, las referencias internas y los recuentos por grupo. No se han extraído reglas numéricas nuevas de OCR ni cambios para la web.

## 21. Exportado de ventas recibido y cobertura inicial

Iván ha entregado el exportado F48, de29/10/2026 a21:34:55 UTC, SHA-256 `40d38990125fa55bf6f392f7164976a6ca97a5c3ed58667f4f10d2fe369817f9`. Comprende530 pedidos y1.917 líneas de contexto del período2025–2026; las fechas presentes van de02/01/2025 a23/10/2026. Se ha analizado localmente, sin que el estudio ejecute conexiones a bases ni lea credenciales. No son1.917 ventas de faldones: el exportador incluye otras líneas de los pedidos seleccionados.

| Grupo comercial por código exacto | Líneas | Pedidos distintos en ese código | Cantidad comercial |
| --- | ---: | ---: | ---: |
| FALDON · nuevos laterales/frontales | 171 | 133 | 285 |
| CAMBIOTELAFALDON · cambios de tela | 10 | 10 | 13 |
| FALDONINTERMEDIO · grupo separado | 38 | 38 | 50 |
| **Unión de los tres códigos** | **219** | **169** | **348** |

Los dos primeros códigos suman181 líneas,139 pedidos distintos y298 unidades comerciales. Los pedidos por código se solapan; no sumar133+10+38 como pedidos únicos. La cantidad comercial no demuestra que una pieza se fabricase: hay notas de actuaciones que finalmente no se hacen y revisiones que deben conservarse aparte.

Se han recuperado y leído texto/OCR de **296 PDF /393 páginas** de156 de esos169 pedidos, incluyendo198 PDF adicionales a los98 que ya tenían contexto recuperado. Sus huellas se han contrastado con el inventario anterior, sin errores de lectura. Es **cobertura documental por pedido**, no prueba de que todos esos PDF sean de faldones: pueden pertenecer al toldo, mampara u otra OF. El cruce de la sección23 conserva el vínculo por página/OF; la revisión posterior de la sección24 distingue piezas y versiones en los 80 candidatos vinculados a la familia.

En el inventario publicado no se localizaron PDF de13 de los169 pedidos: AR2500776, AR2501585, AR2501697, AR2502069, AR2502499, AR2503861, AR2602111, AR2602836, AR2603103, AR2603253, AR2603345, AR2604620 yAR2604755. Se mantienen en ventas; no se declara que carezcan de planteamiento en cualquier soporte. **AR2502499, línea3, FALDON, cantidad1, tampoco tiene OF en el exportado.**

El apartado técnico `historico` del exportado devuelve30 registros de otras familias:28 puertas y2 remolques. No aporta medidas técnicas de faldón. Los artículos de escenario se excluyen del censo de fachada; las notas, reformas y posibles cambios de tela codificados con artículos genéricos siguen siendo un grupo adicional por verificar. Estos recuentos describen los códigos seleccionados, no una exhaustividad semántica ya cerrada.

## 22. Ejemplos aportados por Iván: V08 y V09

El [contraste detallado de Vita-K y O Lugar](./faldones-frontales-casos-ivan.md) incorpora las fuentes F41–F48 y los casos V08/V09, con [datos y cotas verificables](./faldones-frontales-casos-ivan.json).

- **V08 · AR2601308:** dos laterales nuevos, OF0226602, acrílico negro y transparente650. Contornos distintos hasta mampara; A lleva escalón y refuerzo posterior10cm de PVC. Cada lateral pide2 mordazas(25) con cinta negra50cm y2 abatibles. Se separan los croquis de visita, el tachado, el detalle de confección y los patrones135×163,1 /134×170.
- **V09 · AR2602384:** lateral A OF0228556 y frontal B OF0228555, con solapa independiente OF0228560. Frontal hecho337×204 y patrón342×214; ventana297×109. El lateral lleva ET superior, velcro suave derecho anterior y tira con ollaos abajo, sin inventar sus posiciones. El transparente conjunto510,6×113 se cuenta una vez aunque figure en los dos PDF.
- **Diferencia conservada:** la ventana manuscrita130 pasa a109 en ambos planos y en el DWG. Q-FF04 pregunta por esa decisión; no se introduce un descuento de21. Las cotas de una anotación posterior de julio no se adjudican a la solapa de mayo.
- **Corrección AR2500865:** C018/C019 son frontales nuevos, línea5 / OF0213964. El cambio de tela enrollable es otra línea y otra OF,0213960. Se corrige la atribución previa del tipo de trabajo y se mantienen A/B como piezas distintas.

## 23. Censo por línea y cruce del30/10/2026

El [informe de censo](./faldones-frontales-censo.md) y su [JSON por línea/documento](./faldones-frontales-censo.json) consolidan219 líneas principales,296 PDF /393 páginas y13 líneas adicionales con otra codificación. Se conservan cliente/código, UUID de línea, pedido, cantidad comercial, OF y todas sus coincidencias por página. **121 líneas** tienen alguna OF coincidente en los PDF;85 tienen PDF del pedido sin esa coincidencia y13 no tienen PDF publicado localizado. La falta de OF/plano no elimina una venta.

Los118 candidatos antes pendientes quedan cruzados: **80 con OF de FALDON/CAMBIOTELAFALDON,1 de intermedio,35 de otros artículos y2 sin identidad de OF resuelta**. De los35 de otros artículos,21 se separan como estructura/pérgola/recogida de aguas,3 acreditan fachada con otra codificación y11 no acreditan todavía el montaje. Los dos problemas de identidad son C068 (OF impresa0216658 frente a0216648 del pedido) y C158 (cajetín sin pedido/OF). No se corrigen números por parecido.

Ese es el estado del cruce inicial conservado en su JSON. La revisión posterior de la sección24 decide el alcance de las dos incidencias de identidad y reduce a tres los montajes sin acreditar; no modifica sus números ni reescribe el origen comercial.

Se revisaron15 escaneos adicionales,29 páginas, y22 páginas de planos indicadas en el censo; no se suman automáticamente a los recuentos visuales de fases previas porque hay documentos revisados otra vez. La consulta por artículo exacto perdía cambios de tela a intermedios/lateral, un suplemento frontal y notas sin OF; E001–E013 los conservan aparte. C128/C183 muestran además faldones incluidos en otra codificación, sin inventar nuevas líneas ni cantidades físicas.

El cruce comercial no valida medidas de corte. Se conservaron también dos ejemplos que impiden equiparar cantidad y fabricación: AR2603035 advierte de posible no fabricación de pies/faldones en una nota de otra OF del pedido; AR2505170 mantiene una rectificación registrada con OF finalizada aunque la nota dice que no hay que hacer nada.

## 24. Cotejo técnico de los 80 vínculos, montajes e identidades

El [informe de revisión técnica](./faldones-frontales-revision-tecnica.md) y su [evidencia por página](./faldones-frontales-revision-tecnica.json) registran las **86 páginas de los 80 PDF**, de 64 pedidos, y **16 escaneos completos / 59 páginas**. Se buscaron DWG de 77 pedidos: 76 recuperados y convertidos localmente con ODA; no localizado AR2601631 / C216 en las dos rutas consultadas. Los 21 bloques DIMENSION cotejados de cinco casos acreditan esas cotas de detalle/patrón, sin declarar validado todo el corte de los archivos recuperados.

Las principales precisiones son:

- **Piezas y OF:** C027 contiene cuatro paños en una OF; C115 separa p1 de otra OF/artículo y p2 del faldón; C238 p2 es solo tubo. C070 desarrolla una unidad comercial de frontal en dos paños; C191/C192 desarrollan marcos por bandas. No contar páginas, letras o componentes como unidades fabricadas. El informe conserva también las correspondencias de conjuntos con cajetín VARIAS y anidados repetidos.
- **Versiones:** C077 / AR2502681 tiene una oferta con ventana y una hoja posterior de 25/08/2025 que escribe «VENTANA NO», coherente con el plano opaco. C060 / AR2502085 conserva el rótulo contradictorio «3 ollados», pero el escaneo y los diagramas muestran 4+5 puntos y piden 9 mordazas. C120 / AR2504200 sigue con venta 273×135 frente a plano 281×221; el escaneo desvaído no acredita el cambio y se excluye de reglas numéricas.
- **Montajes:** ocho de los 11 genéricos quedan con Cortina, estructura o fijación directa independiente. C053 / AR2501946, C163 / AR2505788 y C255 / AR2604299 no identifican el montaje en las fuentes consultadas; Q-FF05 pregunta si colgaban de un toldo. Mientras tanto no se admiten sus medidas como regla de fachada.
- **Identidad y alcance:** C068 se acredita como lonas interiores decorativas, fuera de esta familia. Su OF impresa también aparece así en ATTRIB del DXF y no se corrige por la distinta OF comercial. C158 queda como referencia PORTANOVA sin pedido/OF acreditados para el expediente actual de Jimena Rocha; no se le trasladan las medidas u OF del cierre de porche actual.
- **Confección:** los cinco contrastes conservan diferencias de ancho/alto de +8/+10, +9/+10,5, +5/+10 y +9/+12, según caso y remates escritos; el quinto está excluido de reglas por discrepancia comercial. Refuerzan la necesidad de distinguir borde, material, cara, componentes y versión. No fijan una fórmula general ni cierran Q-FF01.

La revisión documental de estos vínculos queda completada con sus exclusiones y límites expresos. El siguiente contraste se centra en grupos de confección comparables y componentes/reserva, manteniendo intermedios separados. No se ha implementado ni cargado ningún cambio en la web.
