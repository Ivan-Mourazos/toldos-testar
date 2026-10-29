# Faldones laterales y frontales de toldo de fachada

Estudio iniciado el **29/10/2026**, por encargo de Iván. **Fase 1: fuentes, medición, variantes y casos de referencia.** Hay tres pedidos contrastados, con cuatro laterales y dos frontales representados en sus planos. Esta muestra permite separar configuraciones; todavía no constituye el histórico completo ni valida reglas generales de corte o reserva.

**Confirmación de Iván, 29/10/2026 (OT-FF01):** los faldones de acrílico también se plantean a veces. El estudio debe recoger esos planteamientos y conservar su material. La muestra actual de acrílico no acredita qué proporción se plantea: al ampliar el histórico se distinguirán pedidos con planteamiento localizado y pedidos sin él localizado, sin excluir estos últimos por faltar DWG, DXF o PDF.

## 1. Alcance y estado recuperable

- Rama: `estudio-faldones-frontales`; revisión del código de partida: `318ad63`.
- Alcance inicial: faldones que cierran el lateral o el frente de un toldo de fachada existente, según la instrucción propia de OT. Se conservan las diferencias por perfil, anclaje, entorno y remate.
- Documentación técnica, toma de medidas, despiece preliminar y propuesta de datos de entrada. La aplicación no se ha modificado.
- Fuentes compartidas abiertas en solo lectura; conversiones, extracción y renders en `tmp/faldones-frontales/`. Sin consultas a bases de datos, credenciales ni escrituras en el servidor o carpetas de red.
- Evidencia duradera: [faldones-frontales-evidencias.json](./faldones-frontales-evidencias.json), con rutas originales, SHA-256, páginas utilizadas y hechos de cada caso. No se incorporan documentos comerciales o datos bancarios al expediente.
- Siguiente paso: completar el censo de pedidos de 2025–2026 y escoger muestras por variante, empezando por frontales recientes y ventanas. Se ha solicitado la ruta de un histórico exportado; los casos de 2023 sirven como antecedentes técnicos, no para afirmar vigencia general.

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

## 12. Comprobaciones realizadas

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

La compatibilidad de ganchos por cofre, las referencias RPS y el criterio de vista se completarán primero con la documentación e histórico pendientes; no se presentan todavía como preguntas resueltas por un único ejemplo.

## 14. Próxima fase

1. Incorporar el histórico exportado de 2025–2026; identificar artículos y separar laterales, frontales, cambios de tela y trabajos de montaje. Registrar también los excluidos y el motivo.
2. Agrupar por variante, material, remates, perfil y presencia de ventana/apertura; incluir expresamente los acrílicos que se plantean. Localizar escaneo, plano, DWG y corte de cada grupo y registrar por separado qué documentos se han encontrado. La ausencia de un planteamiento localizado no excluye el pedido del censo.
3. Contrastar todos los casos recuperables por script, distinguiendo instalación, hecho, corte y reserva; resolver discrepancias antes de proponer fórmulas.
4. Completar despiece y códigos RPS, soportes/adaptaciones y ejemplos de frontales recientes, PVC, puertas, zócalos y mamparas.
5. Con la evidencia y respuestas de OT, preparar propuesta de cálculo, ficha y dibujo; la implementación tendrá su validación propia.

**Estado de entrega:** estudio iniciado con fuentes y tres casos contrastados; histórico completo, reglas generales, reserva e implementación pendientes. Este expediente queda enlazado en el seguimiento de modelos.
