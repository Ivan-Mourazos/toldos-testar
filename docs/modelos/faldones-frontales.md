# Faldones laterales y frontales de toldo de fachada

Estudio iniciado el **29/10/2026**, por encargo de Iván. **Ampliación documental de 2025–2026:** siete pedidos originales contrastados, con **12 laterales y 6 frontales**, más una reforma vinculada al original. Se han inventariado 8.011 PDF y conservado 266 documentos candidatos. Esta muestra permite separar configuraciones; todavía no constituye el histórico completo de ventas ni valida reglas generales de corte o reserva.

**Confirmación de Iván, 29/10/2026 (OT-FF01):** los faldones de acrílico también se plantean a veces. El estudio debe recoger esos planteamientos y conservar su material. La muestra actual de acrílico no acredita qué proporción se plantea: al ampliar el histórico se distinguirán pedidos con planteamiento localizado y pedidos sin él localizado, sin excluir estos últimos por faltar DWG, DXF o PDF.

## 1. Alcance y estado recuperable

- Rama: `estudio-faldones-frontales`; revisión del código de partida: `318ad63`.
- Alcance inicial: faldones que cierran el lateral o el frente de un toldo de fachada existente, según la instrucción propia de OT. Se conservan las diferencias por perfil, anclaje, entorno y remate.
- Documentación técnica, toma de medidas, despiece preliminar y propuesta de datos de entrada. La aplicación no se ha modificado.
- Fuentes compartidas abiertas en solo lectura; conversiones, extracción y renders en `tmp/faldones-frontales/`. Sin conexiones directas a bases, SQL propio ni credenciales. Catálogo y pertenencia de OF consultados mediante GET de la web; sin escrituras en el servidor o carpetas de red.
- Evidencia duradera: [fase inicial](./faldones-frontales-evidencias.json), [ampliación con fuentes y casos](./faldones-frontales-ampliacion.json) e [índice de candidatos](./faldones-frontales-indice.json), con rutas originales, SHA-256, páginas utilizadas y límites. No se incorporan copias de documentos comerciales ni datos bancarios al expediente.
- Siguiente paso: cruzar los candidatos con el histórico exportado de ventas de 2025–2026, separar familias y completar los grupos pendientes. Se ha solicitado la ruta de ese histórico; los casos de 2023 sirven como antecedentes técnicos, no para afirmar vigencia general.

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

No se ha obtenido todavía un histórico completo de líneas, artículos, OF ni consumos de esta familia. No se declara reserva verificada. Las OF escritas en los planos permiten localizar la documentación, pero no prueban por sí solas el artículo o la cantidad reservada en RPS.

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

La compatibilidad de ganchos por cofre y el criterio de vista se completarán con documentación e histórico pendientes; no se dan por resueltos por un único ejemplo. Las referencias RPS ya contrastadas se recogen en la sección 16.

## 14. Barrido documental de 2025–2026

Se han leído por script los **8.011 PDF publicados** en `RPS/PLANTEAMIENTOS/2025` y `2026`: 4.509 de 2025 y 3.502 de 2026. La extracción identifica **10.974 páginas**; tres ficheros devuelven estructura PDF inválida, uno con nombre de temporal `.af~l.pdf`. Sus rutas y huellas están en el índice; no se declaran revisados correctamente. Ningún fichero se ha excluido solo por no llevar el producto en su nombre.

El texto reconoce **112 PDF que mencionan faldones**, correspondientes a 104 números de pedido por nombre de fichero, y otros **14 PDF con «frontales»** sin «faldón» reconocible. Un subconjunto inicial de 48 PDF de 45 números contiene entradas, tiras o ganchos de faldón. Ese filtro no confirma la familia: también aparecen cortinas, carpas y escenarios.

**3.185 PDF tienen alguna página sin texto**; 3.163 no tienen texto en ninguna. Las **3.199 páginas sin texto** se han procesado con OCR local en dos orientaciones (6.398 reconocimientos, sin errores de procesamiento). Hay 34 páginas positivas en la orientación original y 112 con giro adicional de 270°; son resultados solapados, no piezas ni pedidos distintos. El total incluye la página de control procesada antes de reanudar el lote.

La unión de texto y OCR conserva **266 documentos candidatos, de 206 números por nombre de fichero**: **140 documentos se recuperan únicamente por OCR**. Se han vinculado siete de esos documentos a casos cotejados; los otros **259 siguen pendientes de clasificación**. El índice conserva páginas, método, orientación, SHA-256 e indicios; no guarda las cifras del OCR como medidas. Las etiquetas de material, apertura, riel u otra familia son ayudas automáticas, sin exclusiones definitivas.

Dos controles muestran el límite de cobertura: AR2601947 no se reconoce en la orientación inicial y sí al girar 270°; AR2502986 describe la pieza con material, goma y remates **sin nombrar «faldón»**, por lo que queda acreditado por el caso V01 aunque no aparezca en los candidatos por palabra. Un negativo no acredita ausencia. El singular «FRONTAL» puede designar una posición de montaje de otro toldo y no identifica esta familia por sí solo.

Esto es un **inventario documental**, no el censo de ventas. Faltan las líneas originales de pedido con artículo, cantidades y OF, incluidos los acrílicos sin planteamiento localizado. El GET de autocompletado de toldos no sirve para obtenerlas: en AR2601656 devuelve líneas no reconocidas, y la ruta de pedido de remolques tampoco expone estas líneas.

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
| `FALDONINTERMEDIO` | Faldón intermedio entre toldos | UNI; variante existente en catálogo, sin caso específico validado todavía |
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
- `AR.26.03123-10.pdf` contiene AR2601618 / OF0227170. La OF pertenece a **AR26.01618**, mientras AR26.03123 tiene OF0229790: no contar la copia como otro ejemplo de fabricación.
- **AR2601656** conserva OF del original AR2600872 porque es una reforma, vinculada por escaneo y nota del DWG. El propio DWG original mantiene165/120, mientras el PDF reformado muestra200/120; no sustituir las cotas originales ni deducir cambios por la fecha del fichero.

Se han comprobado por script: cobertura única de las3.199 páginas en ambas orientaciones; correspondencia de huellas entre OCR y PDF; fuentes, referencias y OF de los casos; aritmética de ventanas y posiciones de puerta; cajas DXF frente a planos; JSON y enlaces del expediente. Los ficheros locales de auditoría completos permanecen en `tmp/`; el índice duradero conserva candidatos, método y SHA-256, sin copiar textos comerciales ajenos.

## 19. Trabajo pendiente para cerrar el estudio

1. Incorporar el histórico exportado de2025–2026 con pedido, cliente, artículo, cantidad, descripción y OF. Separar nuevo, cambio de tela, reforma y montaje; registrar también los excluidos y su motivo. No eliminar acrílicos sin plano localizado.
2. Clasificar los259 documentos candidatos pendientes y agrupar los pedidos reales por material, perfil, remate, ventana/apertura, riel, recorte y anclaje. Comprobar duplicados y versiones con el pedido, no solo por nombre o cabecera.
3. Recuperar para cada grupo escaneo, DWG/planteamiento y DXF cuando existan; ampliar a faldón intermedio, mamparas, zócalos y cambios de tela. La lista de documentos encontrados debe permanecer separada del censo de pedidos.
4. Contrastar por script todos los casos recuperables, distinguiendo instalación, hecho, corte, marcado y reserva. Resolver Q-FF01/Q-FF02 antes de fijar aumentos y valores habituales; aclarar la reforma Q-FF03 sin propagarla a un cálculo general.
5. Completar códigos y consumos de despiece, equivalencias de tubo y compatibilidad de soportes. Preparar después propuesta de cálculo, ficha y dibujo; la implementación tendrá sus propias pruebas.

**Estado:** ampliación documental consolidada, sin cambios de producción ni carga. Quedan pendientes el censo de ventas, clasificación completa y reglas generales de confección y reserva.
