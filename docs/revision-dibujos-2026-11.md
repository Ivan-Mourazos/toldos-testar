# Revisión de dibujos de confección · noviembre de 2026

Estado provisional. La revisión no acredita la confección de las 72 variantes. Se ha hecho inventario completo, lectura de expedientes, inspección del trazado, generación de 219 muestras (72 variantes y HERA, tres tamaños) y revisión de sus siete hojas de contacto. «Sin evidencia» significa que falta contraste de fabricación suficiente, aunque el dibujo quepa y coincida con pdfkit.

## Evidencias reproducibles

- Láminas: `tmp/ui-audit/dibujos-html/revision/index.html`; una página enlazada por variante y tres medidas (400, 50 y 1200,9 cm). El alto de bamba es 25, 0 y 120,5 cm respectivamente. Los extremos son pruebas de espacio, no autorización de fabricación.
- `variantes.json`: entradas normalizadas, selección efectiva de dibujo y cálculos. Se distinguen los cálculos válidos del motor de las medidas simuladas utilizadas cuando el ejemplo queda incompleto o fuera de límites. No se da por válido el cálculo de un ejemplo incompleto.
- `fuentes.json`: expedientes consultados, SHA-256 y pasajes con número de línea. La documentación de materiales o reservas no prueba por sí sola un acabado de confección.
- `espacio.json`: cajas de los rótulos en Chromium, con transformaciones incluidas. Mide salidas del recuadro y cruces entre textos; no detecta por sí solo un acabado equivocado ni todos los cruces con líneas.
- Regenerar: `node scripts/revisar-dibujos-confeccion.mjs` y `node scripts/capturar-revision-dibujos.mjs`. Las fuentes se leen de la copia local del proyecto original; `FUENTES_TOLDOS` permite indicar otra carpeta tmp. Solo se escribe dentro de tmp del worktree.
- Capturas claras/oscuras a 1280×720 y 1600×1000 y hojas de contacto en esa carpeta. No se ha modificado ninguna pantalla de la aplicación.

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
| Maxiscreem / Diana | verticales.md, rps-maxiscreem-evidence.md | GENERAL conservado. No se ha demostrado que el patrón actual sea suficiente para variantes de cofre/cable/guía |
| Cuarzo Box | cofres.md | GENERAL conservado; varilla blanca documentada, resto del patrón sin homologar |
| Perla Box | cofres.md | GENERAL conservado; varillas negra y blanca documentadas, no todo el patrón |
| Coral Box | cofres.md | GENERAL conservado; misma limitación |
| Embudo | embudo.md; incorporación del trazado en 10203b6 | **Pasa a planteamiento desde CAD**, instrucción de Iván recibida durante esta revisión. No se cambia getFabricPatternDiagram ni el flujo de producción |

No se afirma que GENERAL fuera un olvido para todos los modelos, ni que sea correcto para todos. No se ha encontrado documentación de una decisión individual de Iván para los once modelos de toldo anteriores. Se conserva la selección mientras falte evidencia.

## Tabla completa por variante

| Modelo | Variante | Dibujo efectivo | Estado | Evidencia y límite |
| --- | --- | --- | --- | --- |
| ARZUA PRO | General | GENERAL | corregido | [Expediente](modelos/arzua-pro.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| ARZUA PRO | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/arzua-pro.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CAMBIO CORTINA | Con ventana | CORTINA-VENTANA | sin evidencia | [Expediente](modelos/cambio-cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CAMBIO CORTINA | Con ventana · velcro | CORTINA-VENTANA-VELCRO | sin evidencia | [Expediente](modelos/cambio-cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CAMBIO CORTINA | Con ventana · ET abajo | CORTINA-TUBO-VENTANA | sin evidencia | [Expediente](modelos/cambio-cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CAMBIO CORTINA | Sin ventana | CORTINA-SIN-VENTANA | sin evidencia | [Expediente](modelos/cambio-cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CAMBIO CORTINA | Sin ventana · velcro | CORTINA-VELCRO | sin evidencia | [Expediente](modelos/cambio-cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CAMBIO CORTINA | Sin ventana · ET abajo | CORTINA-TUBO | sin evidencia | [Expediente](modelos/cambio-cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CAMBIO CORTINA | Con ventana · velcro · ET abajo | CORTINA-VENTANA-VELCRO | sin evidencia | [Expediente](modelos/cambio-cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CAMBIO CORTINA | Sin ventana · velcro · ET abajo | CORTINA-VELCRO | sin evidencia | [Expediente](modelos/cambio-cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CAMBIO TELA | General | GENERAL | corregido | [Expediente](modelos/cambio-tela.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CAMBIO TELA | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/cambio-tela.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CORTINA | Con ventana | CORTINA-VENTANA | sin evidencia | [Expediente](modelos/cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CORTINA | Con ventana · velcro | CORTINA-VENTANA-VELCRO | sin evidencia | [Expediente](modelos/cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CORTINA | Con ventana · ET abajo | CORTINA-TUBO-VENTANA | sin evidencia | [Expediente](modelos/cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CORTINA | Sin ventana | CORTINA-SIN-VENTANA | sin evidencia | [Expediente](modelos/cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CORTINA | Sin ventana · velcro | CORTINA-VELCRO | sin evidencia | [Expediente](modelos/cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CORTINA | Sin ventana · ET abajo | CORTINA-TUBO | sin evidencia | [Expediente](modelos/cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CORTINA | Con ventana · velcro · ET abajo | CORTINA-VENTANA-VELCRO | sin evidencia | [Expediente](modelos/cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CORTINA | Sin ventana · velcro · ET abajo | CORTINA-VELCRO | sin evidencia | [Expediente](modelos/cortina.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| ELECTRA | Con ventana | CORTINA-VENTANA | sin evidencia | [Expediente](modelos/verticales.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| ELECTRA | Con ventana · velcro | CORTINA-VENTANA-VELCRO | sin evidencia | [Expediente](modelos/verticales.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| ELECTRA | Con ventana · tubo | CORTINA-TUBO-VENTANA | sin evidencia | [Expediente](modelos/verticales.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| ELECTRA | Sin ventana | CORTINA-SIN-VENTANA | sin evidencia | [Expediente](modelos/verticales.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| ELECTRA | Sin ventana · velcro | CORTINA-VELCRO | sin evidencia | [Expediente](modelos/verticales.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| ELECTRA | Sin ventana · tubo | CORTINA-TUBO | sin evidencia | [Expediente](modelos/verticales.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| IRIS | IRIS 110 CON COFRE | IRIS | sin evidencia | [Expediente](modelos/iris.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| IRIS | IRIS 110 SIN COFRE | IRIS | sin evidencia | [Expediente](modelos/iris.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| IRIS | IRIS 130 CON COFRE | IRIS | sin evidencia | [Expediente](modelos/iris.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| IRIS | IRIS 130 SIN COFRE | IRIS | sin evidencia | [Expediente](modelos/iris.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| IRIS | IRIS 150 CON COFRE | IRIS | sin evidencia | [Expediente](modelos/iris.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| IRIS | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/iris.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| SELENA | Sin ventana | CORTINA-SIN-VENTANA | sin evidencia | [Expediente](modelos/selena.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| SELENA | Con ventana | CORTINA-VENTANA | sin evidencia | [Expediente](modelos/selena.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| ENROLLABLE | General | ENROLLABLE | sin evidencia | [Expediente](modelos/enrollable.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| ENROLLABLE | Cambio enrollable | CAMBIO ENROLLABLE | sin evidencia | [Expediente](modelos/enrollable.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| GALICIA | General | GENERAL | corregido | [Expediente](modelos/galicia.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| GALICIA | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/galicia.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| HERA | Hera | HERA | sin evidencia | [Expediente](modelos/hera.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| AMBAR BOX | General | GENERAL | corregido | [Expediente](modelos/cofres.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| AMBAR BOX | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/cofres.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| AGATA BOX | General | GENERAL | corregido | [Expediente](modelos/cofres.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| AGATA BOX | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/cofres.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| MAXISCREEM | General | GENERAL | corregido | [Expediente](modelos/verticales.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| MAXISCREEM | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/verticales.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| MONOBLOCK 350 | General | GENERAL | corregido | [Expediente](modelos/monoblock-350.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| MONOBLOCK 350 | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/monoblock-350.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| PUNTO RECTO | General | GENERAL | corregido | [Expediente](modelos/punto-recto.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| PUNTO RECTO | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/punto-recto.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| ANTICA | TUBO 50X30 CONTRAPESO | ANTICA | sin evidencia | [Expediente](modelos/antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| ANTICA | TUBO 50X30 SIN BAMBA | ANTICA | sin evidencia | [Expediente](modelos/antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| ANTICA | TUBO 30X10 CON BAMBA | ANTICA | sin evidencia | [Expediente](modelos/antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| ANTICA | ENTRADA TUBO Ø33 MM | ANTICA | sin evidencia | [Expediente](modelos/antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| ANTICA | ENTRADA TUBO Ø42 MM | ANTICA | sin evidencia | [Expediente](modelos/antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| ANTICA | SOPORTE FIJO 3 AGUJEROS | ANTICA | sin evidencia | [Expediente](modelos/antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| CUARZO BOX | General | GENERAL | corregido | [Expediente](modelos/cofres.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CUARZO BOX | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/cofres.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| PERLA BOX | General | GENERAL | corregido | [Expediente](modelos/cofres.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| PERLA BOX | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/cofres.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CORAL BOX | General | GENERAL | corregido | [Expediente](modelos/cofres.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| CORAL BOX | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/cofres.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| XACOBEO | General | GENERAL | corregido | [Expediente](modelos/xacobeo.md). Solo encaje sin bamba; confección sin acreditar. Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| XACOBEO | Toldo con velcro | TOLDO-VELCRO | sin evidencia | [Expediente](modelos/xacobeo.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| BAMBALINA | General | BAMBALINA | sin evidencia | [Expediente](modelos/bambalina.md). Varilla y bastillas confirmadas; ondas pendientes de contraste OT. |
| BAMBALINA | Suplemento | SUPLEMENTO | sin evidencia | [Expediente](modelos/bambalina.md). Varilla y bastillas confirmadas; ondas pendientes de contraste OT. |
| CAMBIO ANTICA | TUBO 50X30 CONTRAPESO | ANTICA | sin evidencia | [Expediente](modelos/cambio-antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| CAMBIO ANTICA | TUBO 50X30 SIN BAMBA | ANTICA | sin evidencia | [Expediente](modelos/cambio-antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| CAMBIO ANTICA | TUBO 30X10 CON BAMBA | ANTICA | sin evidencia | [Expediente](modelos/cambio-antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| CAMBIO ANTICA | ENTRADA TUBO Ø33 MM | ANTICA | sin evidencia | [Expediente](modelos/cambio-antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| CAMBIO ANTICA | ENTRADA TUBO Ø42 MM | ANTICA | sin evidencia | [Expediente](modelos/cambio-antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| CAMBIO ANTICA | SOPORTE FIJO 3 AGUJEROS | ANTICA | sin evidencia | [Expediente](modelos/cambio-antica.md). Expediente: geometría no homologada; no acreditar confección por el render. |
| SOLAPAS | General | SOLAPAS | sin evidencia | [Expediente](modelos/cofres.md). Expediente consultado; falta acreditar todos los remates del dibujo con varios planos de fabricación identificados. |
| EMBUDO | General | GENERAL | duda | [Expediente](modelos/embudo.md). Pasa a planteamiento desde CAD por indicación de Iván. No se cambia el flujo. |

HERA es una fila adicional: webDrawingVariants lo marca sin dibujo de web, aunque la hoja de telas sí usa su esquema de cara interior. No se oculta esta diferencia del catálogo.

## Embudo: presentaciones CAD para Iván

Índice: `tmp/ui-audit/dibujos-html/revision/embudos/index.html`. Se leen **50 DXF de oficina** de la copia local `toldos-testar/tmp/embudos/dxfs`, sin escribir allí. Inventario completo con SHA-256 y nombres de presentaciones en `inventario-oficina.json`. Se conserva el HTML de todas sus presentaciones. Los restos de otros pedidos en el espacio modelo no cuentan como nuevos casos de fabricación.

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

**Para pasar el planteamiento de Embudo a CAD como Puertas:** reutilizar las presentaciones existentes del DXF, renderizarlas a PDF por el servicio de flujoDwg y agregarlas al planteamiento conservando OF, adjunto editable y respaldo. Decidir si se quiere una presentación por cuerpo/refuerzo o por embudo con el corte común: hoy la hoja EMBUDO A lleva alzado y corte anidado, mientras Puertas delega en escritores específicos por familia/pieza. Al activar el flujo se debería excluir el Embudo de la hoja de telas (incluido su GENERAL y las instrucciones de toldo) y conservar su información en las presentaciones CAD. Hay que probar pedidos mixtos, varias OF y repeticiones antes de activar la exclusión. **Este cambio de flujo no está implementado**, conforme a la instrucción de Iván.

## Pendiente para cerrar la revisión de fabricación

Falta vincular varios planos de pedidos reales por cada variante de toldo, inspeccionar manuales originales cuando el expediente solo los cita, probar todas las combinaciones relevantes con geometría admitida y resolver las dudas de taller existentes. La equivalencia SVG/pdfkit de175 casos no sustituye este trabajo. Las miniaturas de Parámetros siguen usando pdfkit.

## Comprobaciones de esta revisión

En curso; se actualizará al terminar. No hay push, cambio de rama ni despliegue. Se integró origin/main en dibujos-html según el encargo.
