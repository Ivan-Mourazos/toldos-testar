# Censo comercial y cruce documental de faldones

Avance del **30/10/2026** del [estudio de faldones de fachada](./faldones-frontales.md). El [censo trazable](./faldones-frontales-censo.json) contiene todas las líneas de los tres códigos seleccionados, sus documentos encontrados y el resultado del cruce de los118 candidatos que quedaban pendientes después de V08/V09. Prioridad: laterales y frontales de toldo de fachada; intermedios en grupo propio; escenarios fuera del alcance.

**Revisión técnica posterior:** se ha completado el [cotejo de piezas y versiones](./faldones-frontales-revision-tecnica.md) de los 80 documentos con OF de la familia, 86 páginas. De los 11 montajes genéricos, ocho se separan y tres siguen sin acreditar; las dos incidencias de identidad tienen decisión de exclusión por alcance o falta de identidad actual. Este censo y su JSON conservan el cruce inicial, actualizado mediante esa revisión sin alterar el origen comercial.

La fuente es el exportado entregado por Iván el29/10/2026, SHA-256 `40d38990125fa55bf6f392f7164976a6ca97a5c3ed58667f4f10d2fe369817f9`. El análisis es local y conserva los identificadores originales de línea RPS, sin conexiones a bases ni lectura de credenciales. Los PDF y escaneos compartidos se abrieron en solo lectura; copias, texto, OCR y vistas quedan en `tmp/faldones-frontales/`.

## Qué contiene cada registro

- **L001–L219:** pedido, fecha, cliente y código, número e identificador original de línea, artículo, cantidad comercial, OF y documentos donde aparece esa OF. Se conserva la línea aunque no tenga OF ni plano localizado.
- **D001–D296:** ruta original, pedido por nombre, SHA-256 y páginas de cada PDF recuperado. Un documento puede pertenecer al toldo o a otro producto del mismo pedido.
- **Cxxx:** correspondencia con los266 candidatos del [índice previo](./faldones-frontales-indice.json). Los118 antes pendientes conservan cada página, OF, línea/artículo y método de lectura de las coincidencias.
- **E001–E013:** líneas adicionales identificadas con códigos genéricos, en un grupo distinto de los totales principales.
- **S01–S15:** escaneos originales usados para aclarar los artículos genéricos; huellas y páginas efectivamente vistas. Se revisaron29 páginas, sin declarar completos los escaneos que tienen más de dos páginas.

## Censo por código y cobertura

| Artículo | Líneas | Pedidos distintos dentro del código | Cantidad comercial | Líneas con alguna OF coincidente en PDF | Con PDF del pedido, sin OF coincidente | Sin PDF del pedido localizado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| FALDON | 171 | 133 | 285 | 116 | 45 | 10 |
| CAMBIOTELAFALDON | 10 | 10 | 13 | 2 | 7 | 1 |
| FALDONINTERMEDIO | 38 | 38 | 50 | 3 | 33 | 2 |
| **Unión** | **219** | **169** | **348** | **121** | **85** | **13** |

Los169 pedidos únicos contienen296 PDF /393 páginas recuperadas en156 pedidos. Los pedidos por artículo se solapan. Las13 líneas sin PDF pertenecen a13 pedidos distintos en este inventario. «Sin PDF localizado» se refiere a la carpeta publicada investigada, no a la inexistencia de DWG, Excel, papel u otro soporte.

Hay una línea sin OF: **AR.25.02499, línea3, FALDON, cantidad1**. No se elimina. Los otros12 pedidos sin PDF son AR2500776, AR2501585, AR2501697, AR2502069, AR2503861, AR2602111, AR2602836, AR2603103, AR2603253, AR2603345, AR2604620 yAR2604755.

Una **coincidencia de OF** es un vínculo documental a comprobar, no la aprobación de las cotas o de la versión. El censo conserva todas las coincidencias por página; no se queda con la primera OF, no suma las páginas como unidades y no da por fabricado lo que consta comercialmente.

Hay dos controles concretos del límite entre venta y fabricación. En **AR2603035**, las líneas de faldón4/5 suman3 unidades comerciales, pero una nota del08/09 en la OF de pies0229668 advierte que probablemente no se fabriquen pies ni faldones. La advertencia se conserva a nivel de pedido, sin convertirla en una anulación definitiva. En **AR2505170 / OF0221577**, la nota de rectificación dice que no hay que hacer nada y que la línea queda registrada con la OF finalizada: ni la cantidad ni el estado de la OF prueban trabajo físico nuevo.

## Cómo se resuelven los118 documentos pendientes

| Resultado del cruce | Documentos | Qué permite afirmar |
| --- | ---: | --- |
| OF coincidente con FALDON o CAMBIOTELAFALDON | 80 | El documento contiene una OF de una línea de esta familia. Falta cotejar pieza y vigencia antes de admitir medidas o reglas |
| OF coincidente con FALDONINTERMEDIO | 1 | C186 se vincula al grupo intermedio, separado de laterales/frontales |
| OF coincidente con otro artículo | 35 | Hay identidad comercial, pero hay que interpretar el producto y montaje; resolución debajo |
| Sin coincidencia de OF | 2 | C068 y C158 conservan incidencias de identidad, sin atribución forzada |
| **Total** | **118** | El cruce no convierte esos118 documentos en118 pedidos o piezas |

El enlace admite el número exacto o **solo espacios entre sus dígitos**. Esto recupera cuatro casos: **C040 / OF0215032**, **C073 / OF0216957**, **C077 / OF0217380** y **C106 / OF0218956**. Se comprobaron sus cajetines visualmente. No se corrigen dígitos por semejanza ni se unen dos números distintos.

### Artículos genéricos: no basta con el código

Se ha leído el contexto de las35 coincidencias con otros artículos, contrastando los casos ambiguos con15 escaneos y los planos indicados. El JSON conserva las OF y páginas de cada uno. La decisión es sobre el documento y la línea; no excluye posibles faldones de otras líneas del mismo pedido.

| Documentos | Decisión y evidencia |
| --- | --- |
| C042, C107, C116, C118, C138, C145, C156, C157, C169, C199, C204, C212, C220, C226, C227, C228, C253, C254 | **18 fuera del alcance principal:** las descripciones RPS vinculadas hablan de techo/estructura, porche o pérgola. Incluyen conjuntos mixtos: separar páginas y OF, sin sumar sus cubiertas o trasladar sus remates a los faldones de toldo |
| C023 | Lona para **recoger aguas**, OF0214141. Su «entrada tubo faldón» es un remate; no identifica un frontal vertical |
| C114, C124 | Lonas estrechas para **pérgola**. S12/S13 relacionan ambos pedidos; el correo de S13 p2 cita AR25.03821 y la cobertura de la pérgola. No son intermedios de fachada solo por llevar ET arriba/abajo |
| C020 | **Frontal nuevo con otro código**, SUPLEBAMBA, OF0214033, y solapa OF0214034. S01 p1 trata una reparación del frontal anterior y p2 pide uno nuevo: son actuaciones distintas. La línea nueva se conserva como E013 |
| C128 | **Faldón frontal incluido en una OF de cambio de tela**,0220581. S04 p2 es una hoja de faldón y el plano representa ese cierre; RPS no lo separa como otra línea FALDON. No convertir la cantidad comercial del toldo en una unidad adicional de faldón |
| C183 | **Fachada con otra codificación**, OF0224032. S15 p2 usa la hoja de faldón con lateral y frontal; p1 describe cambio de tela de toldo y toldo cortina. El lateral B del plano pertenece a0224032. Mantener las piezas y OF separadas |
| C051, C053, C108, C127, C134, C146, C153, C163, C231, C255, C256 | **11 con montaje de fachada todavía no acreditado.** Hay telas con tubos, perfiles, madera, techos o conjuntos de cortina. Se conservan las fuentes y sus montajes propios, sin admitir reglas numéricas de esta familia. C108 se ha cruzado por texto/OF del conjunto Electra y lona; no se declara revisado un escaneo suyo |

Por tanto, de esos35 documentos,21 quedan fuera del alcance principal,3 acreditan fachada con otra codificación y11 requieren confirmar el montaje. Estos grupos no se suman a las cantidades de los tres códigos principales.

### Dos incidencias de identidad conservadas

- **C068 · AR2502337:** el plano imprime **OF0216658**; el exportado del pedido contiene la línea genérica **OF0216648**. La revisión visual confirma el5 del cajetín; no es un espacio de OCR. El dibujo lleva cuatro piezas con bolsillo/cenefa. No se le asigna la OF0216648 por proximidad numérica ni por la cantidad.
- **C158 · archivo ar.25.05567-12.pdf:** el cajetín no da número de pedido ni OF y fecha23/01/2025. El pedido comercial por nombre es de cierres de porche, con OF0222336; eso no basta para adjudicarle el dibujo sin identificación. Se conserva como documento de referencia pendiente de identidad, fuera de las medidas admitidas.

Estas incidencias impiden usar esos planos como evidencia de medidas del pedido; no bloquean el resto del estudio ni requieren inventar una regla de confección.

## Líneas relevantes fuera de los tres códigos exactos

El código comercial por sí solo pierde trabajos reales. Se conservan13 líneas adicionales identificadas; no se incorporan automáticamente a los219 totales ni se declaran fabricadas por su descripción.

| Registros | Pedido / OF | Alcance acreditado en texto o escaneo |
| --- | --- | --- |
| E001 | AR2501910 /0215854 | Cambio de tela a2 intermedios, nominal62×300, acrílico champagne, código CAMTELTOL |
| E002 | AR2502839 /0217655 | Cambio de tela a intermedio60×300, acrílico resinado beige, sin rotular |
| E003 | AR2502923 /0217738 | Cambio de tela a enrollable intermedio80×300, acrílico avena |
| E004 | AR2504325 /0220199 | Cambio de tela a enrollable intermedio70×350, acrílico verde botella |
| E005 | AR2601502 /0226984 | Cambio de tela a intermedio70×350, PVC580 arena. Es otra OF que los laterales D/E del caso V06 |
| E006 | AR2602376 /0228496 | Cambio de tela a enrollable intermedio entre toldos, sin medida en esa descripción |
| E007 | AR2604337 /0231846 | Cambio de tela a intermedio60×175, acrílico Red Generation |
| E008 | AR2604377 /0231933 | Cambio de tela a lateral214×288, acrílico grafito |
| E009–E011 | AR2603558, líneas2/3/5, sin OF | Notas comerciales de4 laterales,1 frontal120×190 y2 intermedios. No asumir fabricación ni que sean unidades adicionales a otro documento |
| E012 | AR2604514, línea3, sin OF | Nota de lateral350×500, acrílico verde botella con ventana y rotulación |
| E013 | AR2500888 /0214033 | SUPLEBAMBA: frontal nuevo con ventana, ligado por plano y hoja de faldón; la reparación y la solapa tienen sus propias líneas |

Las medidas de esta tabla son **nominales de la línea comercial**, no cortes validados. C128/C183 se conservan como actuaciones documentadas dentro de otra codificación y no generan líneas ficticias. El abono AR2503714 por error en precio de faldones tampoco se interpreta como una unidad física negativa.

## Contraste técnico posterior y trabajo restante

La fase comercial queda trazada por línea y la totalidad de los118 candidatos tiene resultado de cruce. La [revisión técnica posterior](./faldones-frontales-revision-tecnica.md) ya distingue piezas y páginas de los 80 documentos vinculados a la familia y conserva los límites por versión. Los 121 enlaces de líneas comerciales pueden incluir más de un PDF o una página con OF heredada: ni la coincidencia ni el cotejo documental aprueban automáticamente una medida de corte.

Queda ampliar la matriz de confección y corte dentro de grupos comparables y contrastar los cambios de tela/intermedios sin PDF de su OF. De los 11 montajes revisados, tres requieren la confirmación de Iván conservada como Q-FF05; los otros ocho se separan. Q-FF01–Q-FF04 mantienen sus preguntas de confección y versiones en la [lista de dudas](./dudas-abiertas.md#faldones-laterales-y-frontales--estudio-iniciado-el-29102026). No se ha implementado ni cargado ningún cálculo nuevo.

## Comprobaciones del censo

- Correspondencia de las **219 líneas principales y13 adicionales** con UUID, pedido, artículo, cliente/código, cantidad y OF del exportado; sin repetir líneas entre ambos grupos.
- **296 huellas de PDF** contrastadas con las copias locales y el inventario;393 páginas,156 pedidos con PDF,169 pedidos del censo principal. Se conserva su ausencia documental cuando corresponde.
- **146 relaciones línea-página** con número de OF coincidente, en121 líneas. Verificados método de texto/OCR, giro y las cuatro normalizaciones limitadas a espacios entre dígitos. No son146 piezas ni146 páginas físicas distintas necesariamente.
- **118 candidatos cruzados**, sin duplicados; los35 de otros artículos quedan cubiertos una sola vez por sus decisiones. Los recuentos de21 fuera de alcance y11 montajes no acreditados coinciden con sus listas.
- Huellas de los **15 escaneos** y las **22 vistas de planos** utilizadas, páginas declaradas y las dos notas sobre alcance/fabricación verificadas. Las fases anteriores conservan sus comprobaciones de fuentes, cotas y relaciones.

Validación documental local y `git diff --check`; no se modifica lógica, interfaz, datos de producción ni parámetros de cálculo.
