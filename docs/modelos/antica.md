# Antica — expediente del modelo

[Guía](../guia-revision-modelos.md) · [Seguimiento](./README.md) · [Evidencia inicial](./antica-fuentes.json) · [Materiales y cantidades](./antica-materiales.md) · [Preguntas para taller](./antica-preguntas-taller.md)

## 1. Alcance y reanudación

Revisión iniciada el 14/09/2026 sobre 3905714, rama codex/antica. Responsable: Codex, sin delegación. Encargo: revisión completa del modelo y ficha de Parámetros; despliegue aplazado por Iván. Bambalina y Enrollable corresponden a Claude.

**Actualización 15/09/2026:** revisados 41 históricos y ampliado RPS a 118 OF y 79 líneas de compra. Se incorporan acero de brazos, tubo 50×30, contrapeso y carga de pletina con consumo nominal; escuadras visibles pendientes de detalle. Ver antica-materiales.md. Iván solicita una lista completa para su encargado, sin más preguntas técnicas sueltas: antica-preguntas-taller.md reúne 30 dudas. Ha solicitado actualizar el servidor; pendiente de conocer dirección/usuario SSH. Modelo abierto.

Resultado de la primera entrega del 14/09: inventario, contraste de cinco maestros y cuatro históricos recientes, consulta de consumos RPS, correcciones demostrables de casquillos y manivelas, cuatro brazos de fabricación propia y consulta de aumentos. **La revisión detecta pendientes; no acredita despiece ni reserva completos.** Siguiente trabajo: responder el cuestionario con encargado/OT y resolver Q01–Q08 más los casos de compras documentados en antica-materiales.md.

Evidencia copiada a output/modelos/antica/fuentes; originales en la unidad Y:, compartida como \\192.168.0.128\Oftecnica\Oficina Tecnica. Las copias y pruebas están ignoradas por Git. El JSON enlazado conserva rutas originales, SHA-256, fórmulas y consumos seleccionados para reanudar sin depender de la conversación.

## 2. Identidad

| Dato | Valor y evidencia |
| --- | --- |
| Código y nombre | ANTICA / Antica; trabajo relacionado CAMBIO ANTICA |
| Fabricante | TGM, fabricación propia; confirmado por Iván el 14/09/2026 |
| Soporte habitual | Cortina universal de tres agujeros; confirmado por Iván y RPS |
| Brazos | Fabricados en taller; no equiparar a juegos especiales BANTICA del catálogo |
| Alias Excel | Algunos maestros usan PUNTO RECTO para alojar fórmulas de Antica; no implica equivalencia técnica |
| Disponibilidad | Antica está implementado; esta rama no se ha desplegado |

## 3. Estado por área

| Área | Estado / alcance |
| --- | --- |
| Identidad | Verificada con Iván; pletina y tubo suministrados por Torres y Sáez según RPS |
| Manuales | Ficha comercial TGM localizada, descargada e inspeccionada en sus dos páginas; no hay manual de fabricación completo localizado |
| Variantes/límites | Seis variantes inventariadas; límites y especiales con dudas |
| Cálculos/parámetros | Consulta conectada a las reglas reales; regresión de maestros; excepciones de históricos registradas |
| Despiece/RPS | Casquillos punta y manivelas corregidos con evidencia; fabricación propia parcial |
| Reserva completa | No: piezas sin correspondencia, cantidades de materias primas y kits pendientes |
| Formulario/persistencia | Color de manivela independiente, cuatro brazos y seis variantes probados en recorrido local |
| PDF/dibujo | Formato existente conservado; PDF generado en seis variantes; geometría no homologada |
| Imagen sustituta | Guardado/reapertura/generación comprobados en una variante; importación y portapapeles son componentes comunes existentes |
| 3D | Diferido hasta fijar geometría/materiales reales; esquema actual no es plano de fabricación |
| OT/taller | Confirmada identidad y criterio de partir de Excel/RPS. Muestra completa pendiente |

## 4. Fuentes

| ID | Fuente / localización | Uso y limitación |
| --- | --- | --- |
| F01 | Iván, 14/09/2026 | TGM propio; brazos caseros; soporte 3 agujeros Cortina |
| F02 | [Ficha oficial Antica](https://www.toldosgomez.com/archivos/upload/descargas/tgm_ficha_toldo_antica.pdf), pp. 1–2 | 575×160 cm con 2 brazos, 800×160 con 3; manual/motor; frontal/techo/entre paredes. Sin despiece de taller |
| F03 | [Página oficial](https://www.toldosgomez.com/antica) | Índice de búsqueda menciona 8×2 m y texto recomienda 5×1,2; discrepancia, no regla adoptada |
| F04 | PROGRAMAS CALCULO / ANTICA 50 X 30 CONTRAPESO.xlsm | DATOS C23/C24/C26; PUNTO RECTO L24/R24; ESTR.01 K12/K15/Q26:Q28 |
| F05 | ANTICA 50 X 30 SIN BAMBA.xlsm y ANTICA CON BAMBA.xlsm | Mismas celdas; muestras 387×100 y 328×100, esta última motor y 2 unidades |
| F06 | ANTICA FIJO SOPORTES 3 AGUJEROS.xlsm | DATOS C25=237; PUNTO RECTO L24; ESTR.01 Q27=342,2168449963792 |
| F07 | CAMBIO TELA ANTICA.xlsm | 172×140 con bamba15 → caída225. Trabajo de tela, sin estructura nueva |
| F08 | RPS, consulta 14/09/2026 | STKArticle + unidad almacén; CPRImputationMaterialMO por OF, todas las familias. No se usa la consulta filtrada a LONA como despiece completo |
| F09 | 2026/TOLDOS / AR2600591.xlsm, AR2603341.xlsm, AR2603374-1.xlsm | Casos reales con fórmulas/cortes particulares; diferencias en Q01–Q05 |
| F10 | 2026/TOLDOS / AR2604488.pdf, p.1 | PDF de revisión generado por la web, marcado borrador: no prueba independiente de las fórmulas. Sí conserva indicación de 4/3 brazos y manivelas blancas |
| F11 | Iván, 14/09/2026 | Partir de los Excel y contrastar referencias compradas/descontadas en RPS |

Reproducción de consultas: node scripts/audit-antica-sources.mjs. Solo SELECT y escritura de evidencia local; no actualiza reservas ni pedidos en RPS. Se consultaron 30 líneas recientes y 115 referencias consumidas desde 2025, más 57 filas agrupadas por artículo/unidad en cinco OF concretas. En aquella primera consulta no se leyeron compras; la ampliación del 15/09 sí consulta 79 líneas directamente vinculadas a OF y conserva sus notas técnicas. Los brazos especiales de 44 cm/RAL9003 dominan parte de la muestra agregada: no representan automáticamente el estándar TGM.

## 5. Inventario de implementación

| Área | Archivos / resultado |
| --- | --- |
| Fórmulas | src/domain/anticaRules.js y anticaParameters.js; constantes compartidas con consulta |
| Componentes verificados | src/domain/anticaComponents.js; catálogo explícito de manivela, punta según P701/P801 |
| Reserva/edición | structureEdits.js; conserva cantidades de inventario separadas de longitud de corte; advierte fabricación pendiente |
| Formulario | AwningColumn.tsx, types.ts, validation.js; anticaCrankColor opcional, automático en pedidos anteriores |
| Revisión | reviewSheetEntries.js; brazos por toldo y color de manivela visibles |
| Parámetros | RuleReferencePanels.tsx: aumentos, descuentos, ejemplo y estado TGM/RPS |
| Dibujo/notas/imagen | planteamientoPdf.js, structureNotes.js, fabricImage.js y editor compartido; formato sin redistribución |

## 6. Matriz de configuraciones

| ID | Variante | Caída, misma tela | Bamba separada | Fuente/estado |
| --- | --- | --- | --- | --- |
| C01 | 50×30 contrapeso | S√2+76+B | S+40 | F04; R24 del maestro difiere de L24 |
| C02 | 50×30 sin bamba | S√2+70 | No admite B>0 | F05 |
| C03 | 30×10 con bamba | S√2+76+B | S+40 | F05 |
| C04 | Entrada Ø33 | √(S²+H²)+38+B | √(S²+H²)+38 | Regla existente, falta fuente dimensional independiente completa |
| C05 | Entrada Ø42 | √(S²+H²)+60+B | √(S²+H²)+60 | Regla existente; test AR2201476 deduce H del resultado, no es validación independiente de H |
| C06 | Soporte fijo 3 agujeros | √(S²+H²)+75+B | S+40 | F06/F09, con diferencias de carga |

Ejes cubiertos por regresión: 6 variantes × máquina/motor × misma/otra tela (sin bamba no admite esa combinación); 2/3 brazos automáticos y selección 2–4. Se prueban los descuentos y las fórmulas, no la homologación física de todas las combinaciones. S/H/B en cm; no confundir caída terminada con corte. H obligatorio en C04–C06. Lados y posiciones se conservan; soportes mixtos por brazo como el 3341 no tienen selector específico.

F02 también ofrece tejadillo, faldón lateral, LED y automatismos. La web tiene sensores; no tiene despiece específico completo de esos complementos. Más de 700 cm de corte no cabe en stock actual. No habilitar 8 m solo por la ficha comercial.

## 7. Reglas y parámetros

| ID | Regla actual | Evidencia / límite |
| --- | --- | --- |
| R01 | Descuento tela/tubo/carga máquina: 12/11/12 cm; motor: 11/10/11 | Maestros; carga C06 cambia a 11/10 |
| R02 | Ø33 máquina: 7,2/6,2/7,2; Ø42: 10,5/11/11,5 | Constantes existentes; motor conserva descuentos generales |
| R03 | Frente >400 → 3 brazos y P801; resto 2 y P701 | Regla actual. Cantidad de brazos se puede cambiar sin cambiar tubo; Q04/Q08 |
| R04 | Stock600/700, primer largo que admite corte | Reserva actual 1 barra por toldo; no optimiza cortes conjuntos ni retales |
| R05 | Motor15/17 para2 brazos,35/17 para3–4 | Regla de código; dimensionamiento físico pendiente |
| R06 | Costura2,5; margen6,5; corte a0,1 cm; bamba aparte B+5 | Maestros utilizan también fórmula histórica margen7/costura2,2; puede variar número de paños cerca del umbral |
| R07 | Color manivela automático según lacado o BLANCA/NEGRA independiente | F08/F10, máquina conserva color propio |

La ficha es de consulta. No guarda parámetros Antica globales ni ofrece valores distintos por puesto. No se ha cambiado ninguna fórmula de caída/descuento en esta revisión. La confección/consumo de tela y la reserva consolidada son etapas distintas; no se equipara cantidad histórica imputada con fórmula universal de fabricación.

## 8. Despiece y correspondencias

Cantidades por toldo, multiplicadas por unidades salvo accesorios con consolidación máxima ya existente. Un juego de soportes se almacena como UNI en RPS; no multiplicar por dos por contener dos soportes.

| ID/posición | Pieza / cantidad o corte | RPS / unidad / estado |
| --- | --- | --- |
| P01/1 | Jgo. soporte universal 3 agujeros,1 | SOPUNI3AGUBL16 / NE11 / NEM1 y otros sufijos según lacado; UNI. Blanco/negro corroborados; especial requiere revisión |
| P02/2 | Enrollamiento,1; frente menos descuento | TURA70HG600C/700C o TURA80HG600C/700C; BARRA. Existen500 en históricos, no seleccionados automáticamente |
| P03/3 | Punta,1 | CASPUNCEJE70MM / CASPUNCEJE78MM; UNI. Sustituye CASPUNCE sin coincidencia exacta en búsqueda activa |
| P04/4 | Kit tornillos máquina,1 | Sin referencia; contenido y tratamiento pendientes |
| P05/5 | Carga,1; frente menos descuento de variante | 50×30: TUBGA50MM30MM2MM; carga maciza 30×10: PLEAC30MM10. Contrapeso añadido en posición12. Redondos/fijo pendientes; ver desglose actualizado |
| P06/6 | Kit tapones,1 | Sin referencia; contenido/material pendiente |
| P07/7 | Brazo Antica,2–4; salida | Fabricación TGM; materia prima PLEAC30MM10. Cantidad N×U, corte nominal S y consumo N×U×S/600; cortes físicos pendientes de ratificar |
| P08/8 máquina | Casquillo máquina,1 | CASMAQEJE6370MM/6378MM; UNI. Hay consumos de eje50: Q07 |
| P09/9 máquina | Taco nylon,1 | Sin referencia; comprobar inclusión en kit y variante |
| P10/10 máquina | Manivela,1; altura | MANIVEBL16{80,100,120,150,170,200,225,250}C o MANIVENE11{mismos}C; UNI. 350: MANIVEBLAN350C/MANIVENEGRO350C;325negra: MANIVENEGRO325C. Otros largos: sin asociación automática |
| P11/11 máquina | Máquina MB11 L120,1 | MAQMB11L12BLAN/NEGRO; UNI. Conserva regla previa MB11; maestros antiguos muestran MB9 |
| P12/12 C06 | Pletina25×4,1; H | Sin referencia. PLA4NEGR25MM635C aparece en3341 pero no prueba correspondencia por configuración |
| P13/8–11 motor | Rueda/corona/motor/soporte,1 cada uno | Referencias actuales conservadas; no se ha acreditado universalidad de potencia/adaptadores para las seis variantes |
| P14/21–22 motor | Mando/sensor seleccionado | Referencias actuales y agregación max conservadas |
| P15/anclaje | Tornillería según pared | Tabla compartida existente; pared vacía no inventa anclaje |
| P16 | Tela principal y bamba distinta | Código de catálogo y ML según ancho; cálculo/reserva existentes |

Materias primas contrastadas (actualización y mapeos actuales en antica-materiales.md): PLEAC30MM10 (pletina acero30×10, barra6m), TUBGA50MM30MM2MM (tubo galvanizado50×30×2, barra6m), TUBLI1-1/4 pulgada (tubo42,4), pletinas25×4, ángulos y operaciones EXT_CINCAR/EXT_LACAR. La suma de longitudes /6m no garantiza la cantidad descontada: hay barras completas, fracciones, retales y reparto entre dos toldos.

No se conoce contenido completo de kits ni todas las piezas de unión por brazo. **No se declara un porcentaje de despiece resuelto ni reserva completa.** Las líneas sin código siguen visibles; se avisa de reserva parcial. Seleccionar cuatro brazos ya no obliga a inventar un artículo de brazo comprado; añadir una referencia manual sigue comprobándose en RPS. Las cantidades añadidas sin referencia siguen protegidas por el editor general.

## 9. Contraste con consumos reales

| Caso/OF | Materiales consumidos relevantes | Lectura |
| --- | --- | --- |
| 0591 /0225203 | Punta78=1; soporteNE11=1; PLEAC30MM10=1 barra; TUBGA50MM30MM2MM=1 barra; P801600=1 barra; cincar5/lacar5 | Excel510×80,2 brazos; ventaRPS505×80. No sustituir medida de fabricación por texto comercial |
| 2898 /0229419 | Punta70=1; pletina30×10=0,3 barra; tubo50×30=1 barra; manivelaNE11170=1; eje50=1 | Confirma materiales; no define por sí solo merma/corte por brazo |
| 3341 /0230193 | Soportes2; puntas70=2; máquinas2; manivela200negra=1; P701700=1 barra; pletina30×10=0,4 barra; pletinaaluminio25×4=1 barra | Dos toldos en una OF. No generalizar una manivela compartida ni una barra por pedido |
| 3374 /0230273 | Soportes2; puntas70=2; máquinas2; P701700=1 barra; pletina30×10=1 barra; tela14 ml | Excel tiene dos cortes200/215×342,2168 y exporta6,8443 ml por entrada. Faltan materiales/operaciones por clasificar |
| 4488 /0232070 | Puntas78=2; soportesnegros2; máquinasnegras2; manivelasblancas200=2; P801500=1 barra; P801700=1 barra; tela15,1 ml | PDF645×50 con4 brazos y381,4×50 con3; envío sin lacar. No constan todos los materiales en esta consulta |

Consulta agrupada por OF/artículo/unidad, sin unir las imputaciones a múltiples líneas de venta al sumar cantidades. Esta tabla inicial no incluye compras ni reservas previstas; el anexo del 15/09 incorpora ambas y materiales de tareas RPS. Ausencia de imputación no prueba que la pieza no se utilice; posibles trabajos de fabricación propios/cliente/otros documentos pendientes.

## 10. Formulario y Parámetros

Color manivela: solo Antica completo con máquina; opciones automático/blanca/negra. Se guarda en anticaCrankColor, reaparece al corregir la revisión y modifica únicamente manivela en despiece/reserva. En motor no se utiliza. Pedidos anteriores sin el campo conservan selección por lacado. Una edición antigua del despiece detecta cambio de firma al cambiar referencias base y exige revisión, evitando aplicar correcciones obsoletas.

Brazos: selector existente en Editar despiece,2–4 por toldo; se multiplica por unidades y llega al PDF. La reserva sigue parcial para fabricación propia. Revisión provisional ahora muestra brazos y color. Panel de parámetros contiene fuente oficial, discrepancias, aumentos, descuentos y ejemplo. Se probaron las22 fichas y ancho800sin desbordamiento horizontal.

## 11. Dibujos, notas e imágenes

Se mantiene el formato habitual; no se traslada la plantilla HERA. drawAnticaDiagram es un esquema de confección lateral, no una vista frontal que cuente brazos ni un plano3D. Las cantidades efectivas están en despiece y tarjeta de revisión. Variantes33/42/fijo/contrapeso tienen representación específica existente. Antes de redibujar: confirmar geometrías de Q01–Q08 con las muestras.

Una imagen por toldo puede sustituir el esquema de tela. La prueba recorre guardado, reapertura y PDF con imagen en C03; no vuelve a ensayar el portapapeles común. Notas vacías permanecen vacías; observación de estructura llega al PDF. Se conserva autor/revisor y paginado compartido. No se acredita aceptación del dibujo por taller.


**Fallos vistos el 22/09/2026 al revisar Cambio de cortina (pendientes para este modelo):**

- F-A01 · Dibujo de Cambio Antica: el rótulo "ENTRADA TUBO 50x30" se monta sobre la línea de la lona. Muestra en `output/modelos/cambio-cortina/` (prueba `tmp/ui-audit/otros-dibujos.mjs`).
- F-A02 · Tarjeta de Cambio Antica sin configuración: el aviso sale dos veces, "CAMBIO ANTICA incompleto… falta configuración Antica" (de `fabricOnlyRules.js`) y "Toldo C … falta configuración Antica y rotulación tela" (regla única de `awningCompleteness.js`). Debe quedar solo el de la regla única.

## 12. Pruebas ejecutadas

14/09/2026: TypeScript sin errores; ESLint src y scripts del alcance sin errores;908 tests/50 archivos pasan.58 pruebas dirigidas iniciales de Antica/parámetros/edición/PDF también pasan. Vitebuild con --configLoader native correcto; aviso previo de bundle>500kB. Se usa cargador nativo por permisos del entorno de esbuild, sin cambio de configuración del proyecto.

node scripts/test-antica-workflow.mjs:6 variantes,4 brazos, selectorblanco/negro, guardar/reabrir desde Revisión, aprobar/generar únicamente en carpetas temporales locales, imagen, notas vacías, referencias en PDF y reserva. Última evidencia: output/modelos/antica/workflow/run-ETKNBP.

node scripts/test-parameter-consultation.mjs:22 fichas, ejemploAntica, HERA, Irisválida/inválida y CambioAntica; sin erroresJS ni desbordamiento800px. Evidencia: output/playwright/parameters/run-qa0ED5.

La prueba sintética usa cuatro brazos de fabricación propia y comprueba advertencia parcial; no homologa cargas estructurales ni convierte la reserva en completa. No se han modificado los pedidos reales ni reservas de RPS.

## 13. Discrepancias y decisiones

| ID | Hecho / impacto | Decisión y siguiente comprobación |
| --- | --- | --- |
| Q01 | Maestro contrapeso L24=diagonal+76+B, R24=diagonal+60+B | Mantener regla actual de primera posición; confirmar si R24 es error arrastrado o confección distinta |
| Q02 | 0591 L24=√(75²+80²)+77+20=206,65856; la regla general da209,13708 | Caso con diagonal/altura y aumento propios. Falta parametrización explícita, no alterar a todos |
| Q03 | 3341 B12indicado, caída154,8528=S√2+70 sin incorporar B; carga50×30 | Determinar remate real; no identificar variante únicamente por texto de venta «fijo» |
| Q04 | Regla3 brazos desde400;0591tiene2a510; ficha575con2 | Cantidad editable; revisiónOT de límites, motor y apoyos |
| Q05 | Maestrofijo cargaP701201, histórico3374 carga30×10200 para mismofrente212 | Mantener maestro como base segúnIván; histórica modificación identificada, no asociación RPS automática |
| Q06 | Materiales propios/kitstapones/tacos/tornillos sin consumo unitario por pieza | UsarExcel eimputaciones, conservar candidatos separados hasta reconstruir cada fabricación |
| Q07 | Casquillos máquina50y63 consumidos | Mantener63porExcel; determinar si depende de montaje/frontal/exterior |
| Q08 | 4488tieneP801para2 toldos; ancho381,4seleccionaP701enweb. Stockreal500/700,web600/700 | Falta selector/técnica de tubo y optimización de barras; no deducir diámetro del cambio de brazos |

Decisiones cerradas: TGM propio, soportehabitual3agujeros y brazoscaseros(F01); empezarporExcel yconsumosRPS(F11); manivelas independientes con referencias exactas(F08/F10); reemplazo de punta genérica por70/78(F08). No se ha solicitado homologación ni certificado de seguridad.

## 14. Entrega

Rama codex/antica. Correcciones limitadas a evidencias verificadas; resto registrado para revisión de OT. Mantener abierto el alcance de reserva completa, ajustes históricos y dibujos técnicos. No desplegado todavía; el 15/09 Iván ha solicitado actualizar el servidor. Falta dirección/usuario de acceso, ya consultados. El siguiente agente debe consultar primero Q01–Q08 y antica-fuentes.json, completar correspondencias de fabricación por OF y presentar propuestas concretas de parámetros/cortes antes de generalizarlas.

Comprobación visual: ficha oficial completa, formulario y Parámetros; muestras provisionales C01/C06 y ambas páginas de producción C01 renderizadas e inspeccionadas. El resto de variantes tiene generación y extracción textual verificadas, sin homologación visual individual de taller.
