# Revisión de dibujos de confección · noviembre de 2026

Segunda pasada en curso con los88 pedidos nuevos y adjuntos de taller leídos de RPS en solo lectura. No se repiten mediciones: la serie de2,198s queda excluida de cualquier conclusión de rendimiento por indicación del coordinador.

Primera pasada: la revisión no acredita la confección de las 72 variantes. Se ha hecho inventario completo, lectura de expedientes, inspección del trazado, generación de 219 muestras (72 variantes y HERA, tres tamaños) y revisión de sus siete hojas de contacto. «Sin evidencia» significa que falta contraste de fabricación suficiente, aunque el dibujo quepa y coincida con pdfkit.

## Evidencias reproducibles

- Láminas: `tmp/ui-audit/dibujos-html/revision/index.html`; una página enlazada por variante y tres medidas (400, 50 y 1200,9 cm). El alto de bamba es 25, 0 y 120,5 cm respectivamente. Los extremos son pruebas de espacio, no autorización de fabricación.
- `variantes.json`: entradas normalizadas, selección efectiva de dibujo y cálculos. Se distinguen los cálculos válidos del motor de las medidas simuladas utilizadas cuando el ejemplo queda incompleto o fuera de límites. No se da por válido el cálculo de un ejemplo incompleto.
- `fuentes.json`: expedientes consultados, SHA-256 y pasajes con número de línea. La documentación de materiales o reservas no prueba por sí sola un acabado de confección.
- `espacio.json`: cajas de los rótulos en Chromium, con transformaciones incluidas. Mide salidas del recuadro y cruces entre textos; no detecta por sí solo un acabado equivocado ni todos los cruces con líneas.
- Regenerar: `node scripts/revisar-dibujos-confeccion.mjs` y `node scripts/capturar-revision-dibujos.mjs`. Las fuentes se leen de la copia local del proyecto original; `FUENTES_TOLDOS` permite indicar otra carpeta tmp. Solo se escribe dentro de tmp del worktree.
- Capturas claras/oscuras a 1280×720 y 1600×1000 y hojas de contacto en esa carpeta. No se ha modificado ninguna pantalla de la aplicación.

## Pedidos y manuales de la carpeta pdfs

Se han leído los15 PDF locales de la carpeta indicada y renderizado las12 páginas de los siete PDF de pedidos. Evidencias: pdfs-fuentes.json y pedidos-reales-contacto.png. AR2603289, AR2603298, AR2603315 y AR2603420 muestran GENERAL en Galicia; AR2603332 lo muestra en Arzúa. Es evidencia adicional para conservar esa selección, sin convertir estos casos en una homologación de todos los remates. El pedido3298 incluye también Cortina con ventana y una tapa con velcro específica: no se generaliza esa tapa. Los PDF de pedidos son escaneos sin texto útil, por lo que no se da por ausencia un rótulo que el extractor no devuelve.

El manual COMPLET-PRO350 de fabricación rev2.1, página6, documenta descuentos de tejido y perfiles; no basta para confirmar por sí solo los2,5/33,5/3,3/4cm del patrón. Los manuales de instalación y el Monobloc2016 son fuentes con alcance propio: no se sustituyen las decisiones más recientes del expediente por un manual antiguo. catalogo-dibujos-modelos.pdf y cabeceras-revisor.pdf son muestras generadas por la aplicación, no pedidos de fabricación independientes.

## Corrección común: GENERAL sin bamba

El rótulo de bastilla lateral «3,3» alcanzaba y=301,70 pt en un recuadro de 300 pt, medido con getBBox y la matriz de transformación del SVG. Base tipográfica y=299,70 pt. Se reduce 6 pt el cuerpo cuando no hay bamba para conservar la cota completa. El cambio está en drawGeneralDiagram, por lo que afecta igual a SVG y pdfkit. No cambia medidas de confección, cálculo ni reserva. La prueba de regresión falla antes de la corrección y pasa después.

Los estados «corregido» de la tabla solo acreditan esta reparación de encaje. Los remates siguen sin homologación completa. Embudo conserva su selección GENERAL expresamente por la nueva instrucción de Iván.

## Investigación de GENERAL, modelo a modelo

`git log -L :getFabricPatternDiagram:src/domain/planteamientoPdf.js` llega a cea6a325 (13/08/2026): introduce una selección común que sustituye los esquemas del CAD por GENERAL salvo familias explícitas. El mensaje «Refine application layout and functionality» no documenta una orden individual de Iván. La misma función recibe después excepciones para Iris (dfb7a536), Selena (134492e7) y Solapas (1774ac34). El commit de Iris explica expresamente que su dibujo era inalcanzable por faltar la excepción. Esto demuestra que la existencia de un trazado no prueba que deba seleccionarse.

| Modelo | Evidencia revisada | Conclusión y comportamiento conservado |
| --- | --- | --- |
| Arzúa Pro | arzua-pro.md; cea6a325; prueba de hoja que agrupa Arzúa y Galicia | GENERAL desde agosto; no se ha localizado orden específica que exija volver al esquema de estructura |
| Galicia | galicia.md; misma prueba de agrupación | GENERAL conservado; decidir acabado por fabricación, no por existencia del esquema de brazos |
| Xacobeo | xacobeo.md; manual ART250 citado por el expediente | GENERAL conservado; descuentos del manual no homologan sus bastillas |
| Monoblock 350 | monoblock-350.md | GENERAL conservado; expediente de piezas y medidas, sin aprobación completa del patrón |
| Punto Recto | punto-recto.md | GENERAL conservado por falta de evidencia de confección específica |
| Ámbar Box | cofres.md | GENERAL conservado; piezas y reserva no prueban el acabado del dibujo |
| Ágata Box | cofres.md | GENERAL conservado en el catálogo. Falta contrastar confección por submodelo, no solo el dibujo general |
| Maxiscreem / Diana | verticales.md, expediente de consumo citado por verticales.md | GENERAL conservado. No se ha demostrado que el patrón actual sea suficiente para variantes de cofre/cable/guía |
| Cuarzo Box | cofres.md | GENERAL conservado; varilla blanca documentada, resto del patrón sin homologar |
| Perla Box | cofres.md | GENERAL conservado; varillas negra y blanca documentadas, no todo el patrón |
| Coral Box | cofres.md | GENERAL conservado; misma limitación |
| Embudo | embudo.md; incorporación del trazado en 10203b6 | **Pasa a planteamiento desde CAD**, instrucción de Iván recibida durante esta revisión. No se cambia getFabricPatternDiagram ni el flujo de producción |

No se afirma que GENERAL fuera un olvido para todos los modelos, ni que sea correcto para todos. No se ha encontrado documentación de una decisión individual de Iván para los once modelos de toldo anteriores. Se conserva la selección mientras falte evidencia.

## Inventario inicial por variante (sustituido por la revisión por dibujo)

Las72 filas iniciales se conservan en variantes.json; se retiran de este informe porque repetían la misma limitación. La segunda pasada se organiza por los29 trazados compartidos.

HERA es una fila adicional: webDrawingVariants lo marca sin dibujo de web, aunque la hoja de telas sí usa su esquema de cara interior. No se oculta esta diferencia del catálogo.

## Embudo: presentaciones CAD para Iván

Índice: `tmp/ui-audit/dibujos-html/revision/embudos/index.html`. Se leen **50 DXF de oficina** de la copia local `toldos-testar/tmp/embudos/dxfs`, sin escribir allí. Inventario completo con SHA-256 y nombres de presentaciones en `inventario-oficina.json`. Se conserva el HTML de todas sus presentaciones. En los siete originales seleccionados, DIN A3 puede estar vacío: el dibujo está en la segunda presentación A4 (imágenes *-oficina-2.png). AR2605215 conserva en el cajetín el pedido anterior AR2600734; no se cuenta como diseño independiente. Los restos de otros pedidos en el espacio modelo no cuentan como nuevos casos de fabricación.

Se han generado HTML, DXF, PDF e imágenes con el flujo real `generarCorteLona`: usa piezasEmbudo, dibujoCorte, dibujarPlano y escribirDxfPlano; después htmlPresentaciones, el mismo lector/proyector del flujo CAD. No es un dibujo reconstruido para la auditoría.

| Pedido / pieza | Comparación y límite |
| --- | --- |
| AR2503676 | Familia Barcala 88/76 y alto90; mismos radios 660,15/570,13, refuerzos10 y cierre3 del expediente. El analizador histórico interpreta erróneamente «LARGO100» como alto: no se usa ese campo inferido |
| AR2600734 | Repite familia y dos unidades. No cuenta como geometría nueva; sí confirma la repetición del acabado |
| AR2605215 | Fixture revisado con Iván: alto90, 88/76, dos cuerpos y cuatro refuerzos. La presentación generada rotula X2 y conserva el corte anidado |
| AR2600169 | Recto 66×100, cierre4, entrada de cinta6 arriba, bastilla10 abajo; corte70×116 y marcas20/104 confirmados por fixture |
| AR2506008 | Recto con BN10 en ambas bocas: alto120 pasa a140. Contorno63 procede de la prueba existente, queda pendiente confirmar redondeo frente al diámetro20 de RPS; no se fija una regla de conversión |
| AR2601252 A | Cono100/65, alto80 y X3, radios229,12/148,93. El original pide cinta corta30; la web imprime12: discrepancia abierta |
| AR2601252 B | Cono100/65, alto100 y X3, radios286,16/186. Misma discrepancia. La venta dice seis de diferentes medidas: se conservan las dos piezas, sin deducir medidas de la descripción genérica |

El análisis heredado registra al menos 13 cónicos, pero incluye copias fuera de presentación, refuerzos y arcos auxiliares. No se convierten sus 13 coincidencias en 13 pedidos nuevos ni se afirma haber homologado todos. En AR2502734 y AR2502817 hay cuerpos anteriores y valores de cierre negativos en el analizador: evidencia de extracción ambigua, no demostración de un corte mal fabricado.

**Problemas pendientes del plano:** cinta corta de mordaza fija12 frente a30 en varios originales (AR2500699, AR2501759 y AR2601252). El campo largoCinta solo gobierna la cinta larga. No hay un campo que conserve los30 del tramo corto; no se añade a escondidas ni se cambia el cálculo. Las presentaciones de ejemplo1252 se entregan con esa diferencia visible, no como aprobadas.

**Flujo CAD que ya existe:** corteReadiness.js ya admite EMBUDO. En server.js, al generar con corteConfirmado, se llama a flujoToldos.planosDelDwg, htmlPresentaciones y presentacionesPdf; se anteponen esas páginas y sinHojaTelas excluye las letras incluidas en el CAD. Si falla, vuelve el planteamiento completo con aviso. Por tanto no hace falta inventar otra canalización: falta validar el recorrido confirmado específicamente con Embudo y decidir la distribución de sus piezas. La vista previa sin corte confirmado continúa mostrando GENERAL.

**Para completar el planteamiento de Embudo desde CAD como Puertas:** reutilizar las presentaciones existentes del DXF, renderizarlas a PDF por el servicio de flujoDwg y agregarlas al planteamiento conservando OF, adjunto editable y respaldo. Decidir si se quiere una presentación por cuerpo/refuerzo o por embudo con el corte común: hoy la hoja EMBUDO A lleva alzado y corte anidado, mientras Puertas delega en escritores específicos por familia/pieza. Al activar el flujo se debería excluir el Embudo de la hoja de telas (incluido su GENERAL y las instrucciones de toldo) y conservar su información en las presentaciones CAD. Hay que probar pedidos mixtos, varias OF y repeticiones antes de activar la exclusión. **Este cambio de flujo no está implementado**, conforme a la instrucción de Iván.

## Pendiente para cerrar la revisión de fabricación

Falta vincular varios planos de pedidos reales por cada variante de toldo, inspeccionar manuales originales cuando el expediente solo los cita, probar todas las combinaciones relevantes con geometría admitida y resolver las dudas de taller existentes. La equivalencia SVG/pdfkit de175 casos no sustituye este trabajo. Las miniaturas de Parámetros siguen usando pdfkit.

## Comprobaciones de esta revisión

- Prueba de regresión y pruebas de dibujos/Embudo: 96 aprobadas.
- pnpm typecheck: aprobado.
- pnpm exec vite build: aprobado; avisos existentes de chunks grandes.
- Después de corregir: 219 muestras, cero cajas de texto fuera y cero cruces de texto detectados por el barrido. Antes había 13 variantes GENERAL con la cota fuera, incluida la selección conservada de Embudo.
- scripts/comprobar-fuentes-dibujos.mjs: aprobado en Windows; descargadas y embebidas regular, negrita y cursiva Liberation Sans. No demuestra salida en Linux.
- Medición HTTP: 20 peticiones por caso en aislada4342, health verificado (simulationMode=true, fileWritesEnabled=false). Arzúa: mediana1234,68ms, máximo1334,14ms. Cuatro modelos: mediana1943,02ms, máximo2198,13ms; siete de20 superan2s. Calentamientos2340,50/2229,81ms. No cumple el límite estricto. Al principio coincidió con la cola final de las pruebas específicas; se conserva toda la serie, sin descartar esos datos ni atribuir causalidad a los6pt de encaje. Evidencia: tmp/ui-audit/dibujos-html/segunda-pasada/revision-svg/.
- pnpm lint: aprobado.
- pnpm exec vitest run --maxWorkers=2: 340 ficheros, 4567 pruebas aprobadas (281,03s). Registro completo en revision/vitest.log.
- HTTP aislada4344 con DIBUJOS_HTML=0: POST /api/planteamiento responde200, PDF de dos páginas con las instrucciones de confección. Las72 miniaturas responden200 y entregan PDF; miniaturas-http.json y http-dibujos-html-0.pdf. No se migran las miniaturas a SVG. No hay push, cambio de rama ni despliegue. Se integró origin/main en dibujos-html según el encargo.

## Segunda pasada · corrección de la varilla negra

AR2605116-2.pdf p3, AR2605193-2.pdf p1 y AR2605244-1.pdf p1 rotulan VARILLA NEGRA (4,5). Son planos CAD de corte de tres pedidos distintos, no la miniatura heredada. La hoja de telas de esos mismos pedidos aún decía5,09. Se cambia exclusivamente el rótulo a4,5 en drawCurtainDiagram y drawToldoVelcroDiagram. La referencia reservada ya es VARILLAVAINANEG5, descrita como4,5MM en cortinaRules.js; no cambia cálculo ni reserva. Dos regresiones rojas antes y verdes después. Evidencia renderizada en tmp/ui-audit/dibujos-html/revision/taller/CORTINA-*.png.

La tabla definitiva por29 dibujos y el contraste de pedidos están en preparación. Se han localizado81 adjuntos PDF de taller (189páginas), además de los88 escaneos comerciales; la carpeta ARZUA incluye realmente varios MONOBLOCK350 y una capota que queda fuera del catálogo de toldos.

### GENERAL sin bamba · varilla inferior

Los CAD AR2603932-2 (Punto Recto, sin bamba) y AR2604955-10 (Electra, rejilla sin bamba) rotulan varilla blanca5,5 abajo. El trazado GENERAL perdía incluso el nombre del remate cuando valanceHeight era0, porque solo lo dibujaba dentro de la rama de bamba. Se rotula VARILLA BLANCA dentro del canto inferior cuando no hay bamba, sin cambiar sus márgenes ni los acabados laterales. Estos últimos no quedan homologados para el especial de rejilla: el CAD dice AL CORTE y el patrón general dice BASTILLA; se documentará como diferencia, sin deducir una regla por un solo material. Regresión roja antes de añadir el rótulo.
