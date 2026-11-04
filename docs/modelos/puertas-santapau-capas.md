# Santa Pau · contraste de entidades · 04/11/2026

Referencia principal: **AR2605363.dwg corregido por Iván**, recibido el04/11 a las09:54 (revisión comunicada09:42). Sustituye al4815 como criterio actual por indicación expresa de Iván. Originales solo leídos; conversión ODA local, sin guardar nada en la red. El4815 se conserva como regresión, con su corte anterior.

## Cambios que demuestra el5363

| Dato | Salida anterior | Corte revisado de Iván / salida corregida |
|---|---|---|
| Inferior, A y B | 140 | **137,5**: borde visible135 +2,5 |
| Superior, A y B | 149 | **149**, independiente de la tira de9 que está colocada encima |
| Tubo central del ejemplo | 120 | **121**, cota y eje del plano revisado |
| Flecha superior del bot | Ausente; después se había copiado la del4815 en cabecera | **En la marca de la E.T., hacia abajo**; cabecera a7 sin flecha |
| Refuerzos | Añadidos como piezas, sin contraste de colocación | **18 de8×9**; girados9×8 en los huecos encima de dos tiras verticales |
| Cotas del cristal en alzado | Solo las alturas visibles | También **F+2 y64**, 17 cotas por alzado |

La selección **Actual · bajo +2,5** usa el5363; **Anterior · bajo +5** reproduce el4815. Se guarda la revisión con el pedido. Los documentos previos que guardaron5 sin revisión conservan el4815; no se cambia su corte al abrirlos. En4815 siguen los inferiores de130, superiores219/169 y cristal283,5/165,5×64. No se deduce un aumento por promedio histórico.

## Tabla por capa y puerta

L = segmentos de línea (las polilíneas se descomponen); B = INSERT; A = ARC/CIRCLE; H = HATCH; T = texto. Los registros originales, incluidas las polilíneas antes de descomponer, pares DXF, handles, colores, coordenadas y bloques, están en `entidades.json`. Los de cota se cuentan como DIMENSION; sus bloques se dibujan en las capturas sin duplicarlos en el inventario.

| Pedido / puerta | Capa / función | Está en Iván | Web después | Falta / sobra relevante |
|---|---|---|---|---|
|5363 A / B|cortes - lona + corte · contornos del alzado|33L +5L, con contornos de faldón repetidos y trazos del símbolo de franja|12L: tres contornos cerrados|0 /0; se eliminan superpuestos y se conserva la representación de franja por HATCH |
|4815 A / B|Mismos contornos|33L+5L /24L+5L|12L /12L|0 /0; inferior con +5 del corte, aunque el alzado antiguo lleva −2,5 |
|Ambos, A / B|corte (vent)|4L, corte completo|4L;1 por lado y2 arriba/abajo de solape|0 /0 |
|Ambos, A / B|marca · E.T., cabecera y velcro|24L +3B FLECHA2 +1 círculo|24L +3B +1 círculo|0 /0; en4815 se mantienen las posiciones del bajo de su corte |
|Ambos, A / B|ejes /borrar|3L /3L|3L /3L|0 /0; ejes por el centro del tubo y segundo borde separado4,5 |
|Ambos, A / B|referencias · terminado y bajo|5L, dos pares superpuestos|3L únicas|0 /0; no se duplican los pares a0 y5 |
|Ambos, A / B|referencia-1 · refuerzos y velcros|7L +8H|7L +8H|0 /0: seis refuerzos ANSI31, suave ANSI31 y bravo ANGLE |
|5363 A / B|referencias /cortes-lona · franja|3H /1H|3H /1H|0 /0; símbolo gráfico del5363, sin convertir sus diagonales en cortes |
|4815 A / B|Símbolo de franja|4H /1H|4H /4H|La B usa el símbolo actual; es indicación de material, no paso ni patrón de impresión |
|5363 A / B|cotas|17 /17|17 /17|0 /0: F,H,V,V+h,59/121/210,35,F del faldón,seis8,F+2,64 |
|4815 A / B|cotas|15 /15|15 /15|0 /0: se conserva su versión sin las dos cotas interiores nuevas del cristal |
|5363 A / B|texto|23T /23T +6A +12L de guías cada una|23T /22T +6A +12L|0 relevante; la B no recibe el X2 copiado del alzado de Iván (Q-SP07) |
|4815 A / B|texto|22T cada una +6A +12L|22T cada una +6A +12L|0 /0; rótulos de oficina, en mayúsculas, recolocados en el hueco libre |
|Ambos, cada hoja|Detalle lateral E.T./velcros|4L, dos rectángulos4L,1 arco,4 cotas rotuladas,4T|Las mismas entidades; detalle junto a cada puerta|0 /0; dibujo esquemático, no patrón de corte |
|5363 · corte de lona, todas las piezas|cortes-lona /corte → DISCO1|Paños6, E.T.9, refuerzos18|Las mismas piezas y posición de columnas;664 cm|**0 segmentos faltantes /0 sobrantes**, cobertura geométrica con tolerancia0,15 mm, sin contar duplicados |
|5363 · corte de lona, cada copia A y B|marca → ROTULADOR|21 segmentos y1 círculo por puerta|21 segmentos y1 círculo por puerta|**0 /0**, incluida dirección de cada flecha |
|Ambos · corte|CUTTER|No hay huecos/recortes en estas E.T.|Sin entidades CUTTER|0 /0; no se inventan recortes de tubo |
|5363 · muestras de corte|Cristal y faldón|199/218×64;197/216×35, A×2 y B×1|Mismas medidas, cantidades y marcas; muestras por clase y material|0 /0; no se añaden rótulos de E.T./refuerzo ni OF en el cristal/faldón |
|Ambos · presentación y cajetín|Bloque TGM y campos de pedido, OF, cliente, técnico, revisión, fecha, página y cm; materiales y empate2|Cajetín común TGM, materiales, dos hojas con su OF y1/2–2/2|0 campos necesarios; revisión se rellena cuando realmente se revisa, sin atribuirla a Jaime automáticamente |

## Geometría, colocación y comprobación

- La comparación del corte del5363 lleva el origen de Iván a la esquina inferior izquierda de la lona y el bot de mm a cm. Compara segmentos por cobertura, admite unión/división de colineales y elimina duplicados. Resultado: **ninguna línea de corte o de rotulador que falte o sobre**. Las coordenadas de los círculos y las tres flechas por puerta se mantienen; los rótulos se centran en el hueco libre de su pieza.
- La colocación por columnas del5363 se prueba junto al anidado común y se elige el menor largo, conservando las mismas piezas. Para este pedido gana la de oficina: **664 cm**,18 refuerzos en los extremos libres de las tiras. La cota de alto de oficina dice295,5; las diez piezas de8 encima de una tira de216 llegan a296. La web acota **296**, su contorno real, dentro del rollo de300. Diferencia gráfica de5 mm; no se recorta ningún refuerzo para forzar la cota.
- En el4815, cuyos paños no caben apilados con la tira en300, se conserva el anidado común. La comparación se hace por pieza, medidas, marcas y cantidad, sin imponer al bot la disposición antigua del modelo.
- Se retiraron rayas de cierre de1 cm en las tiras y la marca de velcro en el corte del faldón: no aparecen en los cortes de Iván. El lado cerrado sigue siendo obligatorio y se indica en el alzado. El velcro se representa con sus marcas, círculo, guías y tramas donde corresponde.
- Los rótulos del plano siguen los de oficina: MACARRON, AL CORTE, REVÉS, OF, identificaciones,5 CM(HUECOS), REFUERZO EN E.T., pisado de1 cm, suave/bravo y soldadura. Sin logos, notas de estudio, propuestas ni «por confirmar». Se separan texto del velcro y cota de ancho del faldón para que no se pisen.
- Presentación mejorada: una hoja por puerta, OF propia, alzado ampliado y detalle lateral; muestras de faldón/cristal en filas, lona debajo con su corte real. Se reutiliza el cajetín común y el reparto de papel que maximiza el dibujo. Esto no cambia el bot.
- `vent-pre-noimpr`, recuadros y restos de plantillas de otros pedidos se inventarían en bruto, pero no se incorporan al plano de taller. El cambio de plano de oficina a capas del bot se documenta; ninguna trama, cota o nota pasa a ser un corte de máquina.

## Evidencia reproducible

`node scripts/contrastar-puertas-santapau.mjs` genera DWG2018, DXF plano/bot, pedidos, medidas/consumo y **PNG de las dos presentaciones** en `tmp/santapau/salida/`.

`node scripts/contrastar-capas-santapau.mjs despues 5363` (y4815) genera inventario completo, huellas SHA256, diferencias entidad a entidad, capturas de todas las capas por puerta, recortes de mirilla, E.T. y bajo, detalle lateral, comparación del papel y corte normalizado por cada copia A/B. Salida: `tmp/santapau/capas/AR2605363/despues/` y `AR2604815/despues/`. Las carpetas `antes/` conservan las omisiones iniciales; el inventario bruto no confunde igualdad de número de entidades con igualdad de geometría.

Pruebas TDD en `capasSantaPau.test.ts`: entidades nativas, cotas con anclas y texto junto a cada refuerzo, flechas/círculos del bot, medidas actuales, inventario físico sin solapamientos ni salida de rollo y dos presentaciones con sus OF. Se mantienen las pruebas de compatibilidad de Portanova y Araujo. Q-SP01–06 conservan el historial de respuestas; solo queda Q-SP07, sobre X2 en la B de un pedido de una unidad.

## Comprobación final de esta revisión

Los dos DWG regenerados tienen cabecera AC1032 (2018) y los cálculos no producen avisos. La verificación independiente del5363 confirma cero segmentos de corte/rotulador faltantes o sobrantes y las tres señales circulares en sus coordenadas, con tolerancia de0,15 mm. Evidencia: `tmp/santapau/verificacion-capas-final.json`. Se han mirado las cuatro hojas, el corte normalizado, el detalle lateral, los recortes y las ocho capturas de pantalla en claro/oscuro a1280×720 y1600×1000. Se separó la nota de huecos de los rótulos de refuerzo del tubo central y se amplió el recorte del bajo para incluir su cota completa.

Pasan **369 ficheros y4.828 pruebas**, typecheck, lint y compilación, incluidas las33 pruebas específicas de Santa Pau/clientes y la compatibilidad de Portanova/Araujo. Informes en `tmp/santapau/*capas-rebase.log` y `vitest-capas-afectadas.log`. La rama se rebasó sobre26e9c3c, conservando las secciones de lacados y Santa Pau del expediente; sin push. `origin/main` avanzó después a69cf03c (anchura de desplegables); ese cambio posterior no forma parte de esta validación.

**Estado de la instancia tras el cambio de cuenta:** la aislada heredada sigue respondiendo en4480 y su simulado en4490 (procesos28468 y17972). `/api/health` confirma `simulationMode: true` y `fileWritesEnabled: false`. Windows deniega detener ambos procesos, incluso con ejecución elevada; no se ha podido confirmar su cierre. Las pruebas y los generadores escriben sus evidencias en `tmp/`.
