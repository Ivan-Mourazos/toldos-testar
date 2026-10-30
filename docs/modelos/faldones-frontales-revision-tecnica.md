# Faldones y frontales: revisión de piezas, versiones y montajes

Revisión del **30/10/2026**, posterior al [censo comercial](./faldones-frontales-censo.md). Se han revisado visualmente las **86 páginas de los 80 PDF** que el cruce relacionaba con OF de FALDON/CAMBIOTELAFALDON. También se han revisado completos **16 escaneos de pedido, 59 páginas**, para resolver montajes, identidades y tres discrepancias concretas. El [JSON de revisión](./faldones-frontales-revision-tecnica.json) conserva la decisión por página, piezas, OF, línea RPS, fuentes y huellas.

Esta fase termina el cotejo documental de esos 80 vínculos. **No aprueba una fórmula general de corte ni demuestra fabricación física o consumo.** Los 11 montajes genéricos tienen ahora ocho decisiones de separación y tres exclusiones provisionales por falta de acreditación. Las dos incidencias de identidad tienen decisión de alcance, sin corregir sus cajetines por parecido. El censo inicial sigue siendo una fotografía comercial; esta revisión se aplica como complemento, sin reescribir el origen.

## Cobertura y límites de la comprobación

| Comprobación de esta fase | Resultado | Qué permite afirmar |
| --- | ---: | --- |
| PDF con OF de la familia seleccionados del cruce | 80, de 64 pedidos | Se identifica qué se desarrolla en cada página y qué pertenece solo al despiece conjunto |
| Páginas de esos PDF leídas visualmente | 86 | Se incluyen las dos páginas de C027, C084, C115, C171, C238 y C248 |
| Pedidos con búsqueda de DWG | 77 | Unión de los 64 anteriores, los 11 montajes y las dos identidades |
| DWG recuperados y convertidos con ODA local | 76 | Textos y cotas disponibles para contraste, sin validar automáticamente todas sus figuras |
| DWG no localizado | 1: AR2601631 / C216 | Consultadas la raíz de 2026 y su subcarpeta TOLDOS; se conserva solo la evidencia del PDF |
| Escaneos completos revisados | 16 / 59 páginas | No solo la primera hoja: se consideran croquis, fotos, notas y ofertas relevantes |
| Cotas CAD seleccionadas y verificadas contra el plano | 21, en cinco casos | Concordancia de esas cotas de detalle/patrón; no de todo el corte de las 86 páginas |

Los recuentos no se suman a los de fases anteriores como si fueran documentos distintos: se han vuelto a leer fuentes ya utilizadas. El único origen comercial es el exportado local F48, cuya huella se conserva también en `metodo.origenComercial` del JSON. No se han ejecutado consultas a bases de datos ni cargas en la web.

Las copias, renders y conversiones quedan en `tmp/faldones-frontales/revision-tecnica/`; el expediente conserva rutas originales y SHA-256. **Los DWG incluyen figuras y notas copiadas de otros trabajos.** Encontrar un texto o una cota en el archivo no basta para atribuirlo al pedido actual: las cinco comprobaciones numéricas identifican los bloques DIMENSION y su posición, cotejados con los detalles principales y patrones del PDF. Los demás DWG se declaran recuperados y leídos, no íntegramente validados.

## Piezas, páginas y OF: correcciones de interpretación

La cantidad comercial, el número de paños confeccionados y el de componentes cortados son datos distintos. Las correspondencias siguientes están escritas en los planos o acreditadas por la línea comercial; no se deducen del orden de los PDF.

| Documento / páginas | Correspondencia acreditada | Tratamiento |
| --- | --- | --- |
| C025 / C026 | A lateral OF0214282; B/C frontales OF0214281 | El anidado conjunto se repite. Los frontales comparten frente 423, pero tienen cortes 425 y 428: no imponer igual aumento |
| C027 p1 / p2 | A/B laterales y C/D frontales, todos OF0214388 | Una OF contiene cuatro piezas; cada página desarrolla dos. No multiplicar el transparente ni el anidado repetidos |
| C061 / C062 | A/D laterales OF0216347; B/C frontales OF0216346 | El cuerpo resuelve el cajetín «VARIAS». Las solapas son componentes; D mantiene la nota pendiente de confirmar el velcro |
| C070 | Un frontal comercial 574,7×180, OF0216780, desarrollado en dos paños de 287,4×180 | La tira superior 574,7×6 es otro componente, no un tercer faldón ni otra venta |
| C071 / C072 | A/B laterales OF0216906; C frontal OF0216907 | A lleva ventana y B es opaco. No copiar ventanas entre piezas |
| C075 / C076 | A/B laterales OF0217226; C/D frontales OF0217227 | El anidado completo se repite; A/B tienen recortes y alturas propios |
| C079 / C080 / C081 | A/B laterales OF0217564; C–H frontales OF0217562; solapas OF0217563 | Son ocho paños y componentes del conjunto, repartidos entre hojas; no tres versiones del mismo dibujo |
| C084 p1 / p2 | A/B laterales OF0217616; C/D frontales OF0217617 | «Ollaos según muestra» no aporta posiciones numéricas para automatizar |
| C085 / C086 | A/D laterales OF0217690; B/C frontales inclinados OF0217691 | Las letras no identifican siempre A/B como laterales; un frontal también puede tener alturas diferentes |
| C091 / C092 frente a C061 / C062 | Conjuntos de Bar Baloca con geometría comparable, pero pedidos, OF y materiales distintos | Conservar acrílico y PVC como actuaciones comerciales separadas; la semejanza no prueba duplicado, sustitución ni dos fabricaciones |
| C115 p1 / p2 | p1: LONAEC OF0219736; p2: FALDON OF0219737 | La coincidencia de una OF en p2 no clasifica como faldón todo el PDF |
| C155 | La hoja desarrolla B, OF0222083; A lateral figura en el anidado inferior | Ver el patrón pequeño de A no acredita toda su geometría hecha |
| C178 / C179 / C180 | Laterales 1–4 OF0223796; frontales 5–8 OF0223797 | Son piezas distintas, no revisiones. Se conservan la fecha del plano de marzo de 2026 y el pedido de 2025 |
| C184 | El detalle principal desarrolla C/D frontales OF0224328; OF0224327 aparece en los patrones A/B inferiores | La coincidencia de OF en un anidado no equivale a disponer del detalle principal de esa pieza |
| C191 / C192 | A/B laterales OF0225536; C–F frontales OF0225537 | A1–A4, B1–B4, etc. son bandas del marco de PVC, no nuevos faldones. Solapas superiores de 7cm separadas |
| C198 | C frontal OF0225883, más bambalina de PVC y tira de velcro | Los componentes de PVC no son demasía de acrílico ni unidades comerciales adicionales |
| C238 p1 / p2 | p1: paño OF0228686; p2: tubo de calderería de la misma OF | El tubo de 246 frente al paño de 248 no constituye un segundo textil |
| C248 p1 / p2 | A lateral OF0230264; B1/B2 frontales OF0230263, cantidad comercial 2 | En este caso B1/B2 sí corresponden a dos unidades de frontal; no aplicar la interpretación de las bandas de C191 |

Las 86 decisiones están en `revisiones` del JSON. `piezasDesarrolladas` distingue el detalle de esa página de `ofPorLetras`, que puede describir la correspondencia escrita para el conjunto completo. Ninguno de esos dos campos se suma como unidades fabricadas. Las relaciones entre hojas se conservan en `relaciones`.

## Tres discrepancias contrastadas con el escaneo completo

### C060 · AR2502085: rótulo de ollaos frente a posiciones

El plano muestra en A cuatro posiciones, **10, 108, 208 y 308 desde la izquierda del croquis**, y en B cinco, **12, 50, 107, 213 y 311 desde la derecha**. Sin embargo, ambos llevan el rótulo «T.ORELLA(3OLLADOS)».

La hoja escaneada p1 dibuja también cuatro y cinco puntos y pide **9 mordazas blancas de 2,5cm (25mm) con cinta de 60cm, 5 abatibles y 2 ganchos**. Corrobora el recuento de los diagramas frente al rótulo contradictorio. Se conserva este como incidencia de la fuente; no se convierte el «3» en cantidad ni se sustituye por seis el total de mordazas. Tampoco se extrapolan las posiciones ni se aplica el centrado de remolques.

### C077 · AR2502681: ventana comercial y lateral opaco

La oferta de **22/04/2025**, conservada en p5 del escaneo, pedía ventana; así quedó también en la descripción comercial. La hoja de faldón de **25/08/2025**, p3, escribe **«VENTANA NO»**, con el contorno y medidas del lateral. Acredita la variante opaca posterior representada en el plano. Se conservan oferta, instrucción posterior y dibujo como estados diferentes, sin añadir una ventana por defecto desde la venta.

### C120 · AR2504200: medidas sin cambio acreditado

La línea comercial da **273×135**; el PDF y las cotas del DWG dan **281×221**, con patrón **290×231,5**. El escaneo completo conserva un croquis tachado en p1 y una hoja de faldón muy desvaída en p2. No permite leer de forma fiable las dos cotas del plano ni acreditar la indicación que originó el cambio.

La concordancia PDF/DWG queda registrada, pero **este caso se excluye de las reglas numéricas**. No se elige una fabricación por fecha del archivo ni se considera resuelta la diferencia sumando un margen de confección. Si se pretende reutilizar esta medida, OT tendrá que identificar el cambio; no bloquea la clasificación del resto de casos.

## Cinco contrastes de hecho y patrón

Todas las medidas son cm. La diferencia es la observada en el caso; no es una tabla de parámetros aprobada. Se contrastan 21 bloques DIMENSION reales, sin texto de cota sobrescrito, con diferencia inferior a 0,051cm respecto a la rotulación del PDF. Los bloques, valores sin redondear y posición están en `cotejosNumericos`.

| Caso | Hecho en el plano, ancho×alto | Patrón | Diferencia observada | Condición que se conserva |
| --- | --- | --- | --- | --- |
| C055 · AR2501972 | 225×205,5 | 233×215,5 | +8 / +10 | BN4 a ambos lados, ET superior e inferior |
| C096 · AR2503100 | 570×230 | 579×240,5 | +9 / +10,5 | La nota de BN no escribe su ancho; no completarlo con 4 |
| C155 · AR2505443 | 225×213 | 230×223 | +5 / +10 | BN1 con velcro en un lateral y BN4 en el otro |
| C238 · AR2602387 | 248×170 | 257×182 | +9 / +12 | BN sin ancho escrito, ET superior e inferior; no basta con dos ET para imponer +10 |
| C120 · AR2504200 | 281×221 | 290×231,5 | +9 / +10,5 | Solo concordancia PDF/DWG; excluido de reglas por la discrepancia comercial pendiente |

Los ejemplos apoyan conservar cada remate por borde y cada componente por material. **No explican por sí solos el desarrollo de las esquinas o de cada entrada de tubo.** Q-FF01 sigue abierta; las variaciones no se promedian para inventar un aumento habitual.

## Los 11 montajes genéricos

Se ha revisado todo su escaneo, además del DWG recuperado. Se separa el sistema al que pertenece cada actuación, sin trasladar la regla de un cierre con anclajes propios al faldón de un toldo. Esto no elimina sus líneas comerciales.

| Documento / pedido | Decisión y evidencia |
| --- | --- |
| C051 · AR2501912 | Separado: conjunto de Cortina vertical y lona con tubo/chapas de aluminio, escaneo p1–3. No se acredita sujeción al tubo de enrolle/perfil de carga de un toldo de brazos |
| C108 · AR2503603 | Separado: el escaneo p1–4 distingue cambio de tela Electra/Cortina, paño con perfil fleco/cáncamos y mampara abatible. No convertir esas tres actuaciones en faldones |
| C127 · AR2504482 | Separado: lona de techo y dos traseras, plantilla y oferta de estructura en p1–3 y p5. Se mantiene con ese conjunto |
| C134 · AR2504814 | Separado: Cortina vertical y cierre sujeto a madera mediante tubo 40×20/pletina y tornillos, p1–4 y croquis CAD de OF0221028 |
| C146 · AR2505317 | Separado: lona con tubos y ángulo, p1–2; indica instalar con AR2505316, identificado en el exportado como rectificación de lona de estructura |
| C153 · AR2505376 | Separado: fotos p4/p7 y croquis muestran cierre bajo cubierta con vigas y sujeción propia mediante ángulos/omega |
| C231 · AR2602178 | Separado: columna, fijación superior a madera con tres ángulos/pasantes y presillas laterales, p1–3 |
| C256 · AR2604401 | Separado: perfil fleco remachado a galería/barrotes de aluminio y contrapeso inferior, p1–2; fijación directa al cerramiento |
| C053 · AR2501946 | **Sin acreditar:** lona 347×212, ventana, dos tubos y recogidas, p1–2 y DWG. No identifican el toldo o el montaje |
| C163 · AR2505788 | **Sin acreditar:** lona 230×218, tubo 40×20 y recogidas, única hoja y DWG. No identifican el toldo asociado |
| C255 · AR2604299 | **Sin acreditar:** dos paños grises con ventanas, p1–2 y DWG. Aprovechar tubos superiores existentes, según nota comercial, no identifica el sistema de montaje |

Los tres últimos quedan fuera de las reglas de faldón de fachada mientras no se identifique el montaje. Se ha consultado a Iván, sin dar por recibida una respuesta. **Q-FF05** conserva la pregunta conjunta en la [lista de dudas](./dudas-abiertas.md#faldones-laterales-y-frontales--estudio-iniciado-el-29102026).

## Las dos incidencias de identidad

- **C068 · AR2502337:** p4 dibuja cuatro piezas decorativas con bolsillo/cenefa; p5 muestra el interior del local; correos de p6–7 y oferta de p8–9 confirman su uso. Son lonas interiores, fuera del faldón de toldo de fachada. El ATTRIB del cajetín DXF confirma OF0216658, mientras el exportado tiene OF0216648. **No es un error de OCR ni se corrige la OF por semejanza.** El número impreso sigue sin identidad comercial acreditada, pero no impide separar esta familia.
- **C158 · ar.25.05567-12.pdf:** lleva PORTANOVA, fecha 23/01/2025 y cajetín sin pedido/OF. El escaneo del pedido actual AR2505567 corresponde a Jimena Rocha y cuatro cierres de porche de madera; los cajetines del DWG convertido identifican AR2505567 / OF0222336 / JIMENA. C158 queda como **referencia sin identidad actual acreditada**, fuera de las medidas admitidas. No se le asigna la OF del pedido por estar dentro de su carpeta ni se traslada la geometría del cierre actual al plano de referencia.

## Variantes que la futura ficha debe conservar

Estos son requisitos respaldados por los casos, no valores habituales aprobados:

- **Forma y referencias de medida por pieza:** C085/C086 tienen frontales inclinados; C130 es triangular; C168, C239 y V08 tienen muescas o condicionantes de obra. Centros de tubos, borde hecho, pared y suelo son referencias distintas. Una caja ancho×alto no reconstruye todos esos contornos.
- **Material por componente:** C133 es un lateral de transparente completo; C191/C192 son marcos de PVC por bandas; C198 y C252 combinan acrílico con componentes de PVC. No sustituirlos por una única elección «acrílico con ventana».
- **Remate por borde, cara y pieza:** C094 distingue suave por revés y bravo por derecho; C105/C106 diferencian ET superior de entrada de varilla blanca; C104 pide herrajes distintos para A/B/C. No copiar la configuración a toda la OF.
- **Ventanas y aperturas independientes:** C071 mantiene A con ventana y B opaco; C144 tiene un lateral con puerta y dos ventanas. El número de cristales no es el número de faldones.
- **Ollaos y amarres con origen explícito:** C027 escribe desde atrás hacia delante y sin mover metro; C040 diferencia ollaos desde izquierda de mordazas desde abajo; C123 da dos series propias para C/D. Conservar posiciones y origen, sin aplicar las convenciones de remolques.
- **Accesorios explícitos y componentes existentes:** C238 dice «SIN ABATIBLES» y pide tres cintas/mordazas blancas de 30; C133 aprovecha el tubo del cliente. C144 pide una mordaza y un puente por ollao, sin acreditar el total de ollaos: no inventar una reserva cerrada.
- **Condiciones de montaje o trabajo posterior:** C252 exige soldar primero la bambalina y después la tira contra pared y prevé cortes en obra. Un patrón disponible no demuestra que esos ajustes se ejecutasen.

## Qué queda abierto y qué no se ha cambiado

Se mantiene el alcance de fachada, con intermedios como grupo separado y escenarios fuera. Los 5 conjuntos mixtos y los 7 cierres a riel de la clasificación inicial tampoco quedan admitidos por esta revisión: conservan su clasificación anterior. C186 y los cambios de tela/intermedios sin PDF de su OF requieren su contraste propio.

Q-FF01–Q-FF04 conservan sus preguntas de confección, tira inferior, reforma y altura de ventana. Q-FF05 se limita a los tres montajes que la documentación consultada no identifica. Los límites históricos de C062 —velcro por confirmar—, C084 —ollaos según muestra—, C120 —medidas discrepantes— y C216 —DWG no localizado— quedan en cada registro; no se rellenan por costumbre.

No se han cambiado cálculo, interfaz, parámetros, fichas de producción, consumos ni históricos. La siguiente fase útil es contrastar grupos de remates comparables y sus componentes/reserva; la evidencia de esta revisión permite elegirlos sin confundir piezas, páginas o versiones. La aprobación de reglas generales corresponde a OT antes de implementarlas.

## Verificación local

Se comprueban por script:

- Cobertura exacta de los 80 documentos y sus 86 páginas, sin duplicados ni páginas omitidas.
- SHA-256 de cada PDF y render cotejado; pertenencia de cada OF a su línea RPS, artículo y cantidad comercial.
- Huellas de los 76 DWG y sus DXF locales; un único DWG no localizado entre los 77 pedidos buscados.
- Huellas y páginas completas de los 16 escaneos; referencias de montaje, identidad y discrepancias dentro de sus páginas.
- Las dos comprobaciones de identidad directamente en las entidades ATTRIB del DXF, sin adjudicación automática de OF.
- Los 21 valores DIMENSION sin sobrescritura de texto, sus posiciones y tolerancia de rotulación; ninguna regla numérica general admitida.
- Ocho montajes separados, tres sin acreditar y dos decisiones de exclusión por identidad/alcance; enlaces locales del expediente.

Además se vuelven a ejecutar las comprobaciones de clasificación, casos de Iván y censo, y `git diff --check`. La validación de esta entrega es documental; no cambia código de producto.
