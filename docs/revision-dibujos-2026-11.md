# Revisión de dibujos de confección · noviembre de 2026

Se revisaron inicialmente **29 trazados**. Por decisión de Iván del 02/11, se eliminan los doce esquemas inactivos y quedan **17 dibujos de confección**. Arzúa, Galicia, Xacobeo, Monoblock, Punto Recto, Ámbar, Ágata, Maxiscreen, Cuarzo, Perla, Coral y Cambio de tela mantienen GENERAL: al taller le hace falta ver la tela. La unificación en blanco y negro y la bamba pegada al cuerpo ya están aplicadas; véase [la entrega final](dibujos-estilo-final-2026-11.md). No se cambian cálculos, reservas, selección de modelos, estructura ni flujo CAD.

La revisión sigue abierta en los casos concretos de la tabla. No se da por correcto un acabado por coincidir con pdfkit, con una hoja antigua de la aplicación o con otra pieza de la misma OF. «Correcto con evidencia» acredita el alcance descrito y exige dos pedidos distintos; no homologa una variante especial ajena a esas muestras.

## Material revisado y contraste visual

- Muestra nueva: 88 PDF escaneados, 324 páginas, desde la carpeta original tmp/dibujos-muestras, solo lectura. Se renderizan todas; no se usa la ausencia de texto OCR como prueba. La inspección detallada se concentra en hojas de telas, croquis y planos; no se afirma haber transcrito las 324 páginas comerciales.
- Localización por número de pedido en RPS/VENTAS/PLANTEAMIENTOS, solo lectura: 81 adjuntos PDF, 189 páginas de taller, todas inspeccionadas en hojas de contacto. La búsqueda por prefijo conserva -1, -2 y -10: un sufijo no implica otro pedido independiente.
- Fuentes adicionales de los expedientes: 19 PDF, 23 páginas de Enrollable y Hera, todas inspeccionadas. Permiten contrastar el producto real, porque los grupos homónimos de la muestra comercial traen Portanova y partes de aviso.
- Primera pasada: 15 PDF locales, incluidos manuales y siete pedidos. Se conservan las fuentes y presentaciones de Embudo. AR2603289/3298/3315/3420 aportan hojas GENERAL de Galicia; AR2603332, de Arzúa.
- Copias, huellas SHA-256 y páginas: revision/pedidos/manifiesto.json, revision/taller/manifiesto.json y revision/extra/manifiesto.json; procedencia.json en fuentes-taller y fuentes-extra conserva la ruta original. Ninguna escritura en la red.

**Para revisar:** [pedido y dibujo lado a lado](../tmp/ui-audit/dibujos-html/revision/contraste-pedidos.html): 28 comparaciones de 25 pedidos, 13 trazados, además del [índice CAD de Embudo](../tmp/ui-audit/dibujos-html/revision/embudos/index.html). [Láminas del catálogo](../tmp/ui-audit/dibujos-html/revision/index.html): 72 variantes y Hera, tres tamaños por variante.

El contraste suministra al dibujante compartido las **medidas de corte transcritas** y las opciones observadas en cada pedido. No simula un recálculo completo ni inventa opciones que el escaneo no trae. Se ve el JSON de cada caso y se comprueba que la selección actual coincide. Cuando falta una entrada equivalente, como en la solapa escalonada 4304, se muestra el original y la limitación. Las divergencias de cálculo se documentan abajo; estos ejemplos no certifican reservas.

La etiqueta del índice comercial no identifica siempre el producto. ARZUA contiene MONOBLOCK350 y una capota; GALICIA contiene banderas; AGATA, CORAL y PERLA incluyen partes de aviso; ENROLLABLE contiene puertas Portanova. No se cuentan esos documentos como fabricación del dibujo que falta. Los pedidos cruzados con Perla o Monoblock sí se identifican por su despiece real.

## Resultado por dibujo

Los doce trazados marcados **retirados** eran esquemas laterales o variantes heredadas que getFabricPatternDiagram no seleccionaba. Se han eliminado sus funciones, auxiliares y ramas de dibujo, incluido CAMBIO-TELA. Sus filas se conservan aquí como histórico de evidencia. No se modifica getFabricPatternDiagram: GENERAL sigue representando la tela de esos modelos. ANTICA y CAMBIO ANTICA conservan el perfil que sí dibuja la oficina (AR2603374, entrada 30×10).

| Dibujo | Estado | Pedidos concretos y resultado observado |
| --- | --- | --- |
| GENERAL | Corregido; duda en tejidos especiales | AR2604541-1 p2: Arzúa cruzado,197,6×265, bamba 20; AR2603850-10 p2: Monoblock485,8×295 y bamba 25. AR2605262-1 p1 y5271-1 p1: Cambio de tela, mismos rótulos2,5/33,5/3,3/4 y bamba 25/20. AR2603932-2 p1 (Punto Recto) y4955-10 p1 (Electra): blanca 5,5 abajo sin bamba; se recupera su nombre. Estos dos CAD dicen AL CORTE lateral, frente a BASTILLA de la plantilla: Q-DIB01. |
| CAMBIO-TELA | Sin evidencia · retirado | AR2605262 y5271 usan GENERAL en la hoja real. No se sustituye por este esquema heredado; sus cotas no son la prueba de confección de esos dos pedidos. |
| TOLDO-VELCRO | Corregido; evidencia parcial | AR2506340-1 p3: bandas laterales, dos blancas abajo, bamba 25 en acrílico botella separado;375/390 no se intercambian entre las piezas del pedido. Negra4,5 corregida con tres CAD de la misma varilla. Falta otro pedido independiente con este override para acreditar sus márgenes propios. |
| CAMBIO ENROLLABLE | Duda | AR2501123-2 p1: dos piezas52×325, plana y redonda arriba, pletina30×6 con PVC interior abajo. AR2602302-2 p1: tres60×375, pero ET5×2 inferior en el plano antiguo. No se convierte ese especial en la regla del producto: Iván confirmó pletina fija en enrollable.md. El override estático no permite elegir ese ET. |
| SUPLEMENTO | Sin evidencia | AR2605270 incluye un remate azul particular, pero no demuestra esta confección. Se necesita un pedido de suplemento con su remate y su plano, no una orden de bamba rectificada. |
| SOLAPAS | Duda | AR2604890-10 p5: seis piezas28/38 de ancho, largos 390/411/422; bravo 5 negro por derecho y AL CORTE. El esquema actual refleja cantidad y acabado, no cada contorno. AR2604304-10 p1 tiene escalón30→19, largo250 y cambio121,5: no cabe en los campos actuales. AR2604205 tiene D oblicua40→85, documentada en cortina-pvc-corte.md; una figura rectangular común no sustituye a su CAD. |
| EMBUDO | Duda · pasa a planteamiento desde CAD | Instrucción expresa de Iván. No se retoca GENERAL/EMBUDO ni se activa el flujo. Siete presentaciones de seis números de pedido (0734/5215 repiten diseño), con sus límites en el apartado siguiente; Q-EMB01 recoge cinta corta12/30. |
| ENROLLABLE | Correcto con evidencia · elementos fijos | AR2506340-2 p1:60×375, plana superior, AL CORTE y pletina30×6 con refuerzo PVC interior. AR2501123-2 p1 confirma pletina/PVC y AL CORTE aunque usa el dibujo especial con redonda adicional arriba. La plana superior y pletina fija están confirmadas expresamente por Iván (14/09, enrollable.md). Las medidas web salen del cálculo suministrado, no de 375 fijo. |
| BAMBALINA | Correcto con evidencia · NORMAL | AR2604987-1 p1:394×30 de corte,25 terminada; AR2605268-1 p1:488,5×26,21 terminada. Blanca arriba, bastillas laterales y remate de onda. AR2605270 confirma EXTRASUAVE30→35, pero es rectificación de 4916, no dos casos. AR2604983 tiene plana y confección especial: no se homologa como circular estándar. |
| ANTICA | Duda · base50×30 contrastada | AR2602673-1 p3:50×30 sin bamba, corte 225,56; AR2604488-1 p3:misma entrada y sin bamba, pero151 en fila frente a 140,7 en despiece. AR2603374-1 p3:30×10 con bamba 25 y bajada vertical especial. El selector actual rotula el tubo de cada variante, pero omite dibujar el faldón vertical de 3374 y remite su bamba al bloque; no se modifican los cálculos contradictorios del 4488. Faltan originales para contrapeso, Ø30/42 y pletina25×4. |
| AMBAR | Sin evidencia · retirado | Sin muestra de confección Ámbar en los 88 ni en los adjuntos por prefijo. Se conserva GENERAL y se pide muestra específica. |
| AGATA | Sin evidencia · retirado | Los dos escaneos agrupados como AGATA son partes de aviso, no hojas de confección. No acreditan el propio esquema ni el acabado de GENERAL. |
| MAXISCREEN | Duda · retirado | AR2602210-1/-2/-10 son el mismo trabajo: Recscreen350P, laterales AL CORTE, blanca 5,5 arriba y abajo y empate1. Otros adjuntos (00557,01590,03216,04956) reutilizan GENERAL o mezclan modelos. No se deduce que todo Maxiscreen lleve bastilla ni que todos deban ir al corte. Q-DIB01. |
| IRIS | Duda | AR2604748-10 p1:todo cristal, blanca 5,5 arriba y abajo, cremalleras por revés, chaflán5; la hoja usa escuadrado253,5/253,4,220,2/220,1 y diagonales 335,8/336,2. La web representa escuadrado, no las piezas de ese CAD. AR2604202 y4561 aportan planos de confección, sin autorizar universalmente varilla 8. Falta contrastar ventana y cremalleras en una presentación equivalente. |
| HERA | Correcto con evidencia · derecho interior | AR2603165-1 p1:344×235; AR2603535-1 p1:162,5×174, dos unidades. Ambos, derecho hacia el local y tubo al otro lado; los remates se indican en el bloque. No se atribuyen a este esquema cotas que no imprime ni se homologa revés interior solo por invertir el texto. |
| ARZUA | Sin evidencia · retirado | AR2604541-1 p2 y3332 de la primera muestra usan GENERAL, incluso con brazos cruzados. No se imprime este esquema de estructura en su lugar. |
| GALICIA | Sin evidencia · retirado | El grupo comercial nuevo son banderas. AR2603289/3298/3315/3420 de la primera muestra sí muestran GENERAL; no justifican activar el esquema de brazos. |
| XACOBEO | Sin evidencia · retirado | Los escaneos recibidos son documentos comerciales/servicio sin plano de confección útil; el manual ART250 del expediente establece descuentos, no prueba las bastillas de esta plantilla. |
| MONOBLOCK | Sin evidencia · retirado | AR2603850-10 p2 identifica MONOBLOCK350 y GENERAL, aunque la carpeta lo llame ARZUA. El esquema de estructura no pasa a la hoja de telas. |
| PUNTO-RECTO | Sin evidencia · retirado | AR2603932-2 p1 demuestra varillas y AL CORTE del Soltis96. La confección se compara en GENERAL; el esquema del brazo no resuelve sus acabados. |
| CUARZO | Sin evidencia · retirado | Sin muestra. Expediente de cofres documenta piezas y varilla; no acredita todas las instrucciones del patrón. |
| PERLA | Sin evidencia · retirado | AR2605110-1 p4, mezclado con Electra:Perla450×175, tela430,8×215 y sin bamba, GENERAL. Los cinco escaneos del grupo PERLA no aportan otro plano de confección equivalente. |
| CORAL | Sin evidencia · retirado | Los partes de aviso del grupo CORAL no aportan plano de tela; las apariciones cruzadas no bastan para probar remates y reserva. |
| CORTINA-SIN-VENTANA | Correcto con evidencia · tubo de carga | AR2605239-1 p5:211×170 y bamba 10; AR2604890-1 p20:568×490 y bamba 20, paños normales separados de los de velcro. Varilla arriba para enrolle, blanca abajo, bastilla y BN3. No se homologan con ello las alturas CAD de corte. |
| CORTINA-VENTANA | Corregido | AR2605116-2 p3,5193-2 p1 y5244-1 p1 confirman negra 4,5 y blanca 5,5; esquinas100/20/10 y huecos137/137/136 no son constantes. En5193,75 a suelo corresponde a 57 desde varilla;5244 mide20 a tubo y conserva20. Iván fijó después136 máximo para cristal 140: el137 histórico no se restaura como regla. |
| CORTINA-VELCRO | Duda | AR2604890-10 p1:A–C, suave 5 negro por revés y altura 390; hoja previa408. El campo editable permite390 sin cambiar el valor por defecto. BN4 inferior de aquel CAD fue expresamente descartada por Iván: se conserva BN3. Falta segundo pedido con esta combinación sin ventana. |
| CORTINA-VENTANA-VELCRO | Corregido; diferencias de altura documentadas | AR2604562-2 p1:suave 5 blanco por derecho,233 de banda frente a 235 en hoja. AR2604205-1 p4:esquinas20, hueco 135,70 a suelo→52, altura 295 y bamba 20. Negra4,5 corregida; no se cambia el cálculo de banda para forzar los valores históricos. |
| CORTINA-TUBO | Sin evidencia suficiente | El expediente cortina-pvc-corte.md §10/12 fija ETØ40 y marcas; la nueva muestra no aporta dos pedidos con entrada completa reproducible sin ventana. No se asimila una puerta Portanova a esta cortina. |
| CORTINA-TUBO-VENTANA | Sin evidencia suficiente | Existen CAD de ET en el estudio de cortina-pvc-corte, pero faltan dos pedidos con ventana, referencia desde suelo/tubo y diámetro explícitos vinculados a esta hoja. Se conserva el trazado actual sin inventar el diámetro desde un dibujo pequeño. |

## Rótulos señalados por Iván

**VARILLA NEGRA (5,09) EN PVC.** Error de rótulo heredado, no medida calculada del toldo. Los CAD de AR2605116,5193 y5244 dicen4,5 y la referencia ya reservada VARILLAVAINANEG5 está descrita como4,5MM en cortinaRules.js. Se corrigen drawCurtainDiagram y drawToldoVelcroDiagram, superficie común a SVG/pdfkit. No se cambia la referencia reservada. Dos regresiones fallaban antes y pasan después.

**PARA ENROLLAR EN TUBO.** Instrucción del margen superior de tela, no longitud fija de salida. Se ve en las hojas AR2605262,5271 y5239. El rótulo corresponde a la tela que envuelve el tubo de enrolle; no al tubo de carga inferior ni a la entrada de pletina del Enrollable. Se conserva en los trazados que lo usan, sin trasladarlo a estos últimos.

**BANDILLA INCLUIDA.** No hay ese literal en el código: dice **BAMBALINA INCLUIDA**. Indica que la bamba se obtiene de la misma tela; con otra tela el dibujo cambia a BAMBA SEPARADA. La altura del distintivo es la terminada tomada de valanceHeight; la instrucción de fila dice «de 25, hecha de 20» en AR2604205 y «de 30, hecha de 25» en otros históricos. No debe confundirse con una segunda bamba ni con la caída del cuerpo.

Para la siguiente fase de estilo: la oficina suele rotular la bamba abajo, con letra de pieza, doble varilla o su entrada y BN3, y deja la altura en la fila. AR2605193 tiene bamba 15; AR2605116,20; AR2604890,20, con BN4 inferior excepcional que Iván corrigió aBN3. BAMBALINA independiente4987 y5268 distingue claramente corte 30/26 de terminada 25/21. El distintivo superior repetido de la web no se retira en esta fase.

## Diferencias que no se corrigen como dibujo

1. **Acabado lateral técnico:** Punto Recto3932 (Soltis96), Electra4955 (rejilla) y Maxiscreen2210 (Recscreen350P) traen AL CORTE donde GENERAL imprime BASTILLA. La coincidencia en varios materiales demuestra el límite de la plantilla; no basta para fijar qué tejidos o pedidos deben cambiar. Q-DIB01 pide el criterio y dice qué muestra hoy la web.
2. **Cortina y bamba CAD:** la decisión del 22/10 fija bamba terminada+6,5 (3,5+3) en el corte CAD; la instrucción heredada de hoja usa altura+5. No se cambia el cálculo de la hoja ni se disfraza el desajuste cambiando solo su rótulo. Véanse cortina-pvc-corte.md §10 y corteLona/cortina.js. La presentación de corte y la hoja no son piezas intercambiables.
3. **Velcro histórico:**390 frente a 408 en 4890 y233 frente a 235 en 4562. Se transcriben ambas versiones; no se reconstruye un descuento nuevo a partir de esos dos ejemplos. El campo editable permite introducir el valor explícito.
4. **Antica4488:**140,7 en despiece y151 en fila de telas del mismo original. Requiere revisar el cálculo del caso con sus datos completos; queda anotado sin alterar reservas.
5. **Especiales:** ET5×2 de 2302, escalón de 4304 y plana especial de 4983 no se generalizan al producto estándar. Necesitan conservar su plano particular.

## Selección GENERAL e historia

Se ejecutó git log -L sobre getFabricPatternDiagram. cea6a325 (13/08) introduce la selección común; su mensaje no documenta órdenes individuales de Iván. Después se añaden excepciones para Iris (dfb7a536, dibujo antes inalcanzable), Selena (134492e7) y Solapas (1774ac34). No se encuentra autorización individual para convertir cada uno de los doce esquemas inactivos en plantilla de tela. Los pedidos ahora examinados demuestran GENERAL en Arzúa, Monoblock, Cambio de tela y Perla, y diferencias de acabado en Punto Recto/Maxiscreen. Por ello se conserva el selector; la excepción de Embudo responde a la instrucción actual de Iván, pendiente del flujo CAD.

## Correcciones y reproducción

- 3546001: GENERAL sin bamba, la cota 3,3 salía 1,70pt por debajo del recuadro. Se reduce6pt la altura gráfica del cuerpo; no la medida de confección.
- 6c2ce8f: negra 4,5 en cortinas/TOLDO-VELCRO, por los tres CAD citados.
- 0fc0093: GENERAL sin bamba recupera VARILLA BLANCA en el canto inferior, por 3932 y4955. No se inventa otra bamba para obtener el rótulo.
- Datos transcritos y hallazgos por comparación: docs/revision-dibujos-casos.json. Generación: node scripts/contrastar-pedidos-dibujos.mjs. Verifica que cada imagen existe y que la selección real corresponde al dibujo comparado.
- Escaneos: node scripts/renderizar-muestras-dibujos.mjs. MUESTRAS_DIBUJOS y SALIDA_MUESTRAS permiten usar las copias de taller/extra; la salida se exige dentro de tmp del repositorio.
- Láminas y encaje: node scripts/revisar-dibujos-confeccion.mjs y node scripts/capturar-revision-dibujos.mjs. Tres tamaños, con ejemplos fuera de rango marcados como ensayos, no como pedidos de fabricación. La equivalencia SVG/pdfkit de 175 casos no acredita sus acabados.

## Embudo: presentaciones CAD para Iván

Índice: `tmp/ui-audit/dibujos-html/revision/embudos/index.html`. Se leen **50 DXF de oficina** de la copia local `toldos-testar/tmp/embudos/dxfs`, sin escribir allí. Inventario completo con SHA-256 y nombres de presentaciones en `inventario-oficina.json`. Se conserva el HTML de todas sus presentaciones. En los siete originales seleccionados, DIN A3 puede estar vacío: el dibujo está en la segunda presentación A4 (imágenes *-oficina-2.png). AR2605215 conserva en el cajetín el pedido anterior AR2600734; no se cuenta como diseño independiente. Los restos de otros pedidos en el espacio modelo no cuentan como nuevos casos de fabricación.

Se han generado HTML, DXF, PDF e imágenes con el flujo real `generarCorteLona`: usa piezasEmbudo, dibujoCorte, dibujarPlano y escribirDxfPlano; después htmlPresentaciones, el mismo lector/proyector del flujo CAD. No es un dibujo reconstruido para la auditoría.

| Pedido / pieza | Comparación y límite |
| --- | --- |
| AR2503676 | Familia Barcala 88/76 y alto 90; mismos radios 660,15/570,13, refuerzos10 y cierre3 del expediente. El analizador histórico interpreta erróneamente «LARGO100» como alto: no se usa ese campo inferido |
| AR2600734 | Repite familia y dos unidades. No cuenta como geometría nueva; sí confirma la repetición del acabado |
| AR2605215 | Fixture revisado con Iván: alto 90, 88/76, dos cuerpos y cuatro refuerzos. La presentación generada rotula X2 y conserva el corte anidado |
| AR2600169 | Recto 66×100, cierre4, entrada de cinta6 arriba, bastilla10 abajo; corte 70×116 y marcas20/104 confirmados por fixture |
| AR2506008 | Recto con BN10 en ambas bocas: alto 120 pasa a 140. Contorno63 procede de la prueba existente, queda pendiente confirmar redondeo frente al diámetro20 de RPS; no se fija una regla de conversión |
| AR2601252 A | Cono100/65, alto 80 y X3, radios229,12/148,93. El original pide cinta corta30; la web imprime12: discrepancia abierta |
| AR2601252 B | Cono100/65, alto 100 y X3, radios286,16/186. Misma discrepancia. La venta dice seis de diferentes medidas: se conservan las dos piezas, sin deducir medidas de la descripción genérica |

El análisis heredado registra al menos 13 cónicos, pero incluye copias fuera de presentación, refuerzos y arcos auxiliares. No se convierten sus 13 coincidencias en 13 pedidos nuevos ni se afirma haber homologado todos. En AR2502734 y AR2502817 hay cuerpos anteriores y valores de cierre negativos en el analizador: evidencia de extracción ambigua, no demostración de un corte mal fabricado.

**Problemas pendientes del plano:** cinta corta de mordaza fija 12 frente a 30 en varios originales (AR2500699, AR2501759 y AR2601252). El campo largoCinta solo gobierna la cinta larga. No hay un campo que conserve los 30 del tramo corto; no se añade a escondidas ni se cambia el cálculo. Las presentaciones de ejemplo1252 se entregan con esa diferencia visible, no como aprobadas.

**Flujo CAD que ya existe:** corteReadiness.js ya admite EMBUDO. En server.js, al generar con corteConfirmado, se llama a flujoToldos.planosDelDwg, htmlPresentaciones y presentacionesPdf; se anteponen esas páginas y sinHojaTelas excluye las letras incluidas en el CAD. Si falla, vuelve el planteamiento completo con aviso. Por tanto no hace falta inventar otra canalización: falta validar el recorrido confirmado específicamente con Embudo y decidir la distribución de sus piezas. La vista previa sin corte confirmado continúa mostrando GENERAL.

**Para completar el planteamiento de Embudo desde CAD como Puertas:** reutilizar las presentaciones existentes del DXF, renderizarlas a PDF por el servicio de flujoDwg y agregarlas al planteamiento conservando OF, adjunto editable y respaldo. Decidir si se quiere una presentación por cuerpo/refuerzo o por embudo con el corte común: hoy la hoja EMBUDO A lleva alzado y corte anidado, mientras Puertas delega en escritores específicos por familia/pieza. Al activar el flujo se debería excluir el Embudo de la hoja de telas (incluido su GENERAL y las instrucciones de toldo) y conservar su información en las presentaciones CAD. Hay que probar pedidos mixtos, varias OF y repeticiones antes de activar la exclusión. **Este cambio de flujo no está implementado**, conforme a la instrucción de Iván.


## Muestras que aún hacen falta

Para cerrar las filas pendientes, pedir originales **con hoja de telas o plano de taller**, dos pedidos distintos cuando se quiera aprobar un dibujo: Ámbar, Cuarzo, Ágata, Coral y Xacobeo; Selena y Cambio de cortina para cubrir sus combinaciones con la familia Cortina; segundo TOLDO-VELCRO y segundo CORTINA-VELCRO sin ventana; dos ET con/sin ventana que incluyan diámetro y referencia de la medida; suplemento; Antica contrapeso, Ø30, Ø42 y soporte fijo. Las ondas SUAVE/FRANJAS y los acabados especiales de Bambalina tampoco quedan homologados por los dos casos NORMAL. Para IRIS hace falta una presentación de confección comparable, no solo otra hoja de escuadrado. Monoblock ya tiene una muestra real cruzada; no sigue figurando como modelo completamente sin muestra.

Las dudas necesarias están en dudas-abiertas.md: Q-EMB01 y Q-DIB01. No se reabren como preguntas decisiones ya contestadas de BN3, cristal 136 o pletina del Enrollable.

## Comprobaciones

Segunda pasada: pnpm typecheck y pnpm lint aprobados. pnpm exec vite build aprobado (aviso de tamaño de chunks). pnpm exec vitest run --maxWorkers=2: **341 ficheros y 4.570 pruebas aprobadas**, 188,42 s. Registros typecheck-segunda.log, lint-segunda.log, build-segunda.log y vitest-segunda.log en revision/.

219 muestras del catálogo regeneradas: cero cajas de texto fuera del recuadro y cero cruces entre textos detectados. Las 28 comparaciones de pedidos tampoco tienen texto fuera. Esto comprueba encaje tipográfico; no demuestra que una línea, un contorno o una instrucción de confección sea correcta. Capturas de las láminas y del contraste en claro/oscuro, 1280×720 y 1600×1000; revisadas también cuatro comparaciones ampliadas.

No se repite la medición de tiempos: hay otro agente trabajando en la máquina y el coordinador la hará al final. La serie anterior con máximo 2,198 s no cuenta ni acredita cumplimiento del límite de 2 s.

Primera pasada ya comprobada: fuentes de dibujos en Windows (regular, negrita y cursiva embebidas), HTTP aislada con DIBUJOS_HTML=0 (PDF 200 y 72 miniaturas 200) y health simulationMode=true/fileWritesEnabled=false. La segunda pasada no cambia ese flujo. No hay push, cambio de rama ni despliegue; solo se integró origin/main al inicio del encargo anterior.


## Retirada de trazados inactivos · decisión de Iván del 02/11

Se comprueban estructura, miniaturas y el `cadDiagram` del plan: las miniaturas y la hoja de telas usan getFabricPatternDiagram; estructura solo pinta su Iris propio. getAwningDiagram puede conservar los identificadores del catálogo, pero no los envía directamente al dibujante de telas. Se conservan los campos `diagram` de modelBehavior.json y el selector sin cambios. Cualquier identificador antiguo o desconocido que se suministre al renderizador se representa con GENERAL, también en SVG, sin huecos.

Quedan GENERAL, TOLDO-VELCRO, CAMBIO ENROLLABLE, SUPLEMENTO, SOLAPAS, EMBUDO, ENROLLABLE, BAMBALINA, ANTICA, IRIS, HERA y las seis variantes CORTINA. Embudo mantiene su trazado propio pendiente de la decisión CAD. Los modelos Antica y Cambio Antica comparten ANTICA.

Comparación reproducible: `scripts/contrastar-dibujos-html.mjs` y `scripts/comprobar-retirada-dibujos.mjs` comparten los casos de `scripts/lib/casos-contraste-dibujos.mjs`. La referencia previa tiene 175 casos y la entrega 139: salen 36 ensayos de los doce trazados retirados. Los 139 SVG y los píxeles PDF conservados son idénticos; también las hojas completas de las 72 variantes del catálogo, estructura incluida. Se comparan píxeles y nodos SVG, no los identificadores internos de fuentes que pdfjs numera por documento. Evidencia en `tmp/ui-audit/dibujos-estilo/retirada/comparacion.json`.

El contacto actual solo muestra los 17 dibujos conservados: `tmp/ui-audit/dibujos-estilo/final/contacto.png`. El barrido de espacio conserva 219 SVG del catálogo y 51 de las láminas finales; cero colores, textos fuera o solapes entre textos. No se ha medido rendimiento HTTP.

Validación de esta retirada: tipos, lint y build aprobados; **347 ficheros y 4.622 pruebas aprobadas**, 221,16 s. Se eliminan **268 líneas** de planteamientoPdf.js, con reducción neta de **255**. El contraste SVG/pdfkit de los 139 casos conservados no encuentra textos distintos ni posiciones sin casar (máximo 0,0915 mm entre motores). La comparación antes/después no encuentra diferencias en los 139 SVG/píxeles PDF ni en las hojas completas de las 72 variantes del catálogo. Instancia aislada y simulado cerrados. Sin push, merge ni cambio de rama.
