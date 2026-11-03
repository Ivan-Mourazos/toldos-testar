# Embudo: planteamiento desde el CAD

Decisión de Iván, 03/11/2026. Rama local: embudo-desde-cad. La reserva y las reglas de cálculo no cambian.

## Recorrido y resultado

Puertas genera sus piezas con generarCortePuertas, escribe los planos de cada familia desde src/puertas/plano.ts y usa las presentaciones del DXF/DWG para el PDF mediante htmlPresentaciones y el servicio Chromium compartido. El flujo del embudo reutiliza ese lector, esa impresión A4 y la unión de PDF; no crea otro motor de dibujo.

- Antes de confirmar el corte: generarCorteLona produce el DXF en memoria. Se imprimen únicamente sus presentaciones EMBUDO A, EMBUDO B… y sustituyen la hoja de telas de esas líneas. No se convierte a DWG ni se escribe un plano para ver la vista previa.
- Una presentación por línea de embudo, aunque varias líneas tengan la misma OF. Las unidades van como Xn en el alzado y el corte conserva todas sus piezas o la repetición que ya decidía el anidado. No se añade una hoja por unidad ni por tira de refuerzo. El corte común aparece en las hojas de las líneas que comparten material, igual que en los planos actuales.
- Cada hoja conserva el dibujo del embudo, sus remates, alto, contornos, cierre, cinta larga y corta, unidades, corte desarrollado, marcas, OF, pedido y cajetín. También conserva las observaciones del pedido y de la línea. El corte puede ir acostado debajo del alzado para ganar espacio: solo gira la ventana del CAD; las piezas de fabricación no cambian.
- Pedido mixto: la vista previa solo sustituye las hojas de embudo. Mantiene las hojas de los demás modelos y sus letras originales. El panel de una sola línea filtra después de numerar, de modo que un embudo B sigue siendo B.
- Con corte confirmado, el PDF final sigue leyendo los DWG revisados mediante flujoToldos.planosDelDwg y conRevisor. La exclusión existente sinHojaTelas y la desactivación del CAD generado impiden añadir otra copia del embudo.
- Si falla cualquier material al generar o imprimir el CAD de la vista previa, se recupera el planteamiento completo y se imprime un aviso. No se conservan páginas CAD parciales. Si falla el CAD confirmado al producir, sigue el respaldo completo y el aviso existente. En ambos respaldos se usa EMBUDO, nunca GENERAL, y se conserva el adjunto editable.

Cambios principales: src/domain/embudoPlanteamientoCad.js, src/domain/planteamientoPdf.js, src/domain/modelBehavior.js, src/domain/corteLona/plano.js, src/domain/corteLona/presentacion.js, src/flujoDwg/planoDxf.js y src/server.js. En corteLona/index.js únicamente se trasladan las observaciones al plano; no cambian las piezas, el anidado, el consumo ni la reserva.

## Contraste de los pedidos anteriores

Se han leído los **50 DXF y los 50 DWG** locales en tmp/embudos del repositorio de referencia, siempre en solo lectura. Se guarda el hash SHA-256 de cada original y la cabecera de cada DWG. Las medidas y los comentarios proceden del análisis y la extracción de RPS ya guardados; no se consulta RPS ni se abre el servidor .90.

El script **scripts/contrastar-embudos-cad.mjs** recorre todos los archivos. Extrae las presentaciones y descarta las que no encuadran dibujo. Genera entradas de prueba de 23 pedidos que permiten identificar medidas sin interpretar medidas ambiguas como diámetros o contornos. Las otras 27 filas tienen la presentación de oficina y la explicación de lo que falta; no se dibuja una forma supuesta.

Resultado: **13 coincide, 1 corregido y 36 duda**. «Coincide» significa que coinciden **las medidas cotejadas**, no que el pedido completo esté homologado: en rectos se cotejan los dos lados contiguos del corte, admitiendo giro; en cónicos, radio y longitud de los arcos del cuerpo y de sus refuerzos. Tolerancia: 0,06 cm por el redondeo angular del CAD manual. Los ejemplos web de contraste emplean una lona de prueba de 250 cm; **no se aprueba la igualdad del anidado, los metros, el material o el color del pedido original**. Las marcas confirmadas de AR2600169 y AR2605215 siguen cubiertas por sus pruebas de geometría.

Hay modelos y piezas de otros pedidos dentro de muchos DXF. Una coincidencia en el modelo no prueba por sí sola que esa pieza se fabricase o estuviese en la presentación. Por eso se conserva la evidencia visual, se dejan expresamente las dudas y no se ajusta una regla para hacer coincidir material heredado.

El cajetín heredado de AR2605215 se corrige usando los datos de su pedido: la web lleva AR2605215 / 0233311, aunque el original conserva AR2600734 / 0225549. La misma clase de problema aparece en AR2602495, cuyo remate E.T. queda fuera del modelo actual. Las discrepancias de bastilla, marcas superiores, cintas múltiples y cuerpos heredados están en **Q-EMB02 a Q-EMB06** de dudas-abiertas.md. Q-EMB01, cinta corta indicada por el pedido, sigue contestada; no se reabre.

| Pedido | OF | Resultado | Alcance / duda |
| --- | --- | --- | --- |
| AR2500066 | 0212450 / 0212449 | duda | Dos OF y dos formas; no hay una presentación de embudo identificada con seguridad. |
| AR2500096 | 0212491 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2500190 | 0212719 | duda | Boca rectangular con aro, remaches y lona de muelle: fuera del cónico/recto circular. |
| AR2500282 | 0212851 | duda | B.D. y varios diámetros: falta definir ese remate, no equivale a B.N. |
| AR2500421 | 0213123 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2500446 | 0213199 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2500515 | 0213321 | duda | Desagüe con círculo y enfundado: no es un recto simple. |
| AR2500699 | 0213675 | duda | El cuerpo marca también la boca superior a 10 cm aunque solo aparece una tira de refuerzo inferior. Q-EMB03. |
| AR2500738 | 0213740 | duda | Bocas ovaladas de dos ejes; no convertir a contorno circular. |
| AR2500868 | 0213986 / 0213985 | duda | Bocas rectangulares con aro dentro de un pedido de lonas Tauliner. |
| AR2501416 | 0215017 | duda | La presentación está sin dibujo de confección visible. |
| AR2501419 | 0215020 | duda | Tiras soldadas y varios diámetros, sin bastillas del modelo actual. |
| AR2501759 | 0215612 | duda | La misma marca superior sin tira que AR2500699. Q-EMB03. |
| AR2502053 | 0216105 | duda | La presentación está sin dibujo de confección visible. |
| AR2502734 | 0217458 | duda | Hay coronas antiguas de 100/65 y arcos de cierre separados; no se da por homologado el anidado. Q-EMB03. |
| AR2502817 | 0217572 | duda | Aprovechar mordazas existentes; el archivo conserva coronas de otros pedidos. No se reconstruye la sujeción. |
| AR2503676 | 0219135 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2503702 | 0219122 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2504203 | 0220037 | duda | Tiras soldadas, no bastillas del modelo actual. |
| AR2504236 | 0220000 | duda | Bocas rectangulares con aro suministrado y detalle de soldadura. |
| AR2504591 | 0220560 | duda | Mordazas existentes y piezas antiguas en el modelo; revisar con el original antes de fabricar. |
| AR2505116 | 0221508 | duda | Varias medidas sin contornos inequívocos; no completar por suposición. |
| AR2505117 | 0221509 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2506008 | 0223203 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2506104 | 0223355 | duda | Tiras soldadas y marcado antes de cortar, fuera de las bastillas del modelo actual. |
| AR2506287 | 0223650 | duda | La presentación de embudo no muestra su confección; la otra es de otro pedido. |
| AR2600169 | 0224292 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2600441 | 0224863 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2600734 | 0225549 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2600743 | 0225520 | duda | Dos largos y ancho 82 en el corte; no hay remates identificados. |
| AR2600857 | 0225764 | duda | Tira soldada; se marca antes de soldar y cortar, fuera del remate actual. |
| AR2601112 | 0226247 | duda | Dos formas y refuerzos sin medidas completas; no interpretar sus cotas como contornos. |
| AR2601178 | 0226342 | duda | La presentación está sin dibujo de confección visible. |
| AR2601252 | 0226528 | duda | El dibujo muestra refuerzo en ambas bocas; la referencia de Nutrimentos era solo abajo. Mantener la elección del pedido; Q-EMB05. |
| AR2601501 | 0226931 | duda | La entrada superior y el cierre se dibujan por tramos. No se ha homologado su posición en el corte conjunto. |
| AR2601575 | 0227052 | duda | Secciones cuadradas y dos largos; no es un recto circular. |
| AR2601582 | 0227101 | duda | Dos cintas negras y dos mordazas separadas 10: la tarjeta no representa esa disposición. Q-EMB04. |
| AR2601767 | 0227401 | duda | E.T (4) exterior, empate y ojales; remate diferente de entrada de cinta. |
| AR2601772 | 0227413 | duda | Tira soldada y marcado previo al corte; no equivale a B.N. |
| AR2601883 | 0227584 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2602495 | 0228684 | duda | E.T (4) exterior y cajetín con OF antigua 0227401; RPS guardado dice 0228684. |
| AR2602541 | 0228772 / 0228771 | duda | Bocas rectangulares con aro y doble material dentro de un pedido mixto. |
| AR2602675 | 0229032 | duda | Las presentaciones dicen 80 y 100, pero los arcos del corte conservan radios del embudo de 70; no se homologa por copiar el dibujo. Q-EMB06. |
| AR2602793 | 0229243 | duda | La nota B.N (10) y la entrada de 6 sumarían 166, pero el corte mide 165. Q-EMB02. |
| AR2603196 | 0229916 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2603913 | 0231144 | duda | Bocas rectangulares con aro y remaches dentro de un pedido mixto. |
| AR2604290 | 0231785 | coincide | Coinciden las medidas cotejadas; nueva presentación con la OF del pedido. |
| AR2604482 | 0232092 / 0232091 | duda | Boca ovalada y cuadrada; no convertirlas a círculo aunque el desarrollo sea rectangular. |
| AR2605066 | 0233036 / 0233035 | duda | El DXF disponible encuadra las lonas Tauliner; no acredita el embudo de sus otras OF. |
| AR2605215 | 0233311 | corregido | El cajetín de oficina conserva AR2600734 / 0225549. La web usa AR2605215 / 0233311. |

## Evidencia visual y reproducción

Todo está en tmp/ui-audit/embudo-cad/ del worktree:

- contraste/resumen.json: hashes, DWG emparejado, presentaciones, OF, medidas comparadas y resultado de cada pedido.
- contraste/AR…/oficina-web.png: 50 comparaciones de oficina y web lado a lado; donde no se puede reconstruir, se explica la duda. oficina.html y web.html conservan todas sus hojas; web.dxf y pedido-web.json permiten repetir los 23 casos generados.
- vista-previa-1280-claro.png, vista-previa-1280-oscuro.png, vista-previa-1600-claro.png y vista-previa-1600-oscuro.png: visor real de la web en 1280×720 y 1600×1000.
- http-comprobaciones.json y http-*.pdf: texto extraído y páginas de cinco PDF reales: cónico (1), recto (1), varias OF (2), mixto con Enrollable (2) y solo embudo B (1). Se comprueban las OF, las observaciones y la ausencia de hoja de telas en el embudo.
- navegador.json: errores y respuestas fallidas de la pasada final. Las consultas auxiliares de stock y listado de OF se simulan en Playwright para no consultar RPS; cálculo, CAD, impresión, PDF y visor usan los servicios reales de la instancia aislada.

Reproducción desde la raíz del worktree:

~~~powershell
node scripts/contrastar-embudos-cad.mjs 'C:/Users/ivan.sanchez/Documents/Proyectos DEV/toldos-testar/tmp/embudos'
$env:PORT='4460'
$env:FAKE_COORDINA_PORT='4470'
$env:ISOLATED_DIR='tmp/ui-audit/embudo-cad/aislada'
& 'C:/Program Files/Git/bin/bash.exe' .claude/skills/running-toldos-testar/start-isolated.sh
# En otra terminal, tras comprobar /api/health:
$env:TOLDOS_ISOLATED_URL='http://127.0.0.1:4460'
node scripts/auditar-embudo-cad.mjs
~~~

La instancia respondió simulationMode=true y fileWritesEnabled=false. No se habilita producción para la auditoría. Al terminar se cierran la instancia y el CoordinaOT simulado.

## Validación

pnpm typecheck, pnpm lint y pnpm build aprobados. Build conserva el aviso de paquetes de más de 500 kB. La última batería completa de Vitest, ejecutada con dos trabajadores y sin la auditoría de navegador en paralelo, terminó el 03/11/2026 a las 09:04:42: **356 archivos y 4.679 pruebas aprobados**, incluidas las ocho pruebas específicas. Duración: 318,19 s. Registros en tmp/ui-audit/embudo-cad/.

Las ocho pruebas nuevas cubren sustitución antes de confirmar, OF por línea con repeticiones, mixto y selección individual, ausencia de duplicados con CAD confirmado, recuperación completa con aviso visible, fallo del segundo material, espacio del corte fuera del cajetín y recuperación si la impresora pierde una página. La primera batería completa registró 354 archivos aprobados y dos con cinco fallos por tiempo (Puertas y lectura de MONOBLOCK), mientras se hacían otras comprobaciones. Esas pruebas también pasan en la última batería completa; no se han modificado ni ampliado sus límites. La auditoría final conserva cinco PDF reales, cuatro capturas de interfaz y 50 comparaciones, sin errores de navegador ni respuestas fallidas.

## Lo no comprobado

No se han reconvertido los 50 DWG con ODA en esta máquina: se contrastan sus DXF ya disponibles y se registran los hashes de los binarios originales. No se ha probado la edición manual del DWG en ZWCAD ni la impresión física, el bot, RPS en vivo, la generación real de archivos para el taller o el despliegue. La unión de páginas del CAD confirmado y el respaldo se prueban sin habilitar escrituras de producción.

La comparación geométrica no es una igualdad de píxeles ni una homologación de todos los rótulos, marcas y disposiciones de los 50 pedidos. Los 36 casos dudosos siguen requiriendo aclaración o datos para representar su forma o remate. Tampoco se ha implementado una regla nueva para bocas ovaladas/cuadradas, aro, remaches, B.D., E.T. o varias cintas de distinto color. Se conserva el dibujo propio del embudo como respaldo; el alzado nuevo es esquemático y no reproduce en perspectiva las cintas del dibujo manual.

Instancia aislada y simulado cerrados tras la auditoría. Sin push, merge ni despliegue.
