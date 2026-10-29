# Fichas de clientes de remolques: estudio para revisión

Fecha: 29/10/2026. Histórico exportado 2026-10-29T10:20:35.818Z. Solo lectura de fuentes y del servidor; no se ha cargado ninguna ficha.

Se estudian las 2.085 líneas del histórico (1.467 números de pedido distintos), sus 276 clientes, las once fichas que existen en el servidor y los 41 PDF producidos recientes. La propuesta contiene 285 fichas y 955 medidas; conserva las once fichas vigentes y todas sus medidas. Las identidades sin regla acreditada llevan solo el código y los datos que constan: no se fabrica un perfil o reparto para completar casillas.

**Cobertura y límite:** hay 348 líneas de lona/baquetón sin medida completa acreditada en la propuesta, una línea sin tipo identificado y 46 líneas de ganado. Esas referencias se enumeran por cliente y en evidencias.json. El registro de identidades está completo para los 276 clientes del histórico; los repartos aún no lo están. Las plantillas antiguas sin código confirmado se enumeran al final y no se cargan por un parecido de nombre.

## Fuentes y criterio

- PL = \192.168.0.128\Oftecnica\Oficina Tecnica\DIBUJOS\REMOLQUES. Leídos 260 ficheros: 172 DWG convertidos con ODA a DXF, 84 XLS, un XLSB y tres DOC. Las copias y temporales de ODA están en tmp del worktree. Se leyeron textos, cotas y círculos de los DWG; las tablas de los DOC se extrajeron de su tabla de piezas de texto, sin OCR.
- OT = \192.168.0.128\Oftecnica\Oficina Tecnica. Leídas 1657 hojas de pedidos, todas las que se localizaron por el número del histórico en 2023–2026 (series AR, BE y SA). Se aprovecharon solo pestañas con número de pedido, tipo y largo × ancho coincidentes; las demás no son evidencia de ese elemento.
- Convertidos 162 DWG de pedidos sin una hoja aprovechable. Un DWG puede contener toda la plantilla copiada: que aparezca una cifra en él no demuestra que pertenezca a su elemento activo.
- RPS = \192.168.0.128\RPS\VENTAS\PEDIDOS. Buscados 470 PDF de pedidos sin reparto completo: 467 accesibles, todos escaneados sin capa de texto; 467 con reconocimiento local. Los BE se buscaron en BERGONDO y los SA en SANTIAGO. El OCR sirve para localizar indicios, nunca para fijar sin cotejo una cifra manuscrita.
- Buscados los cortes de 466 pedidos restantes en \192.168.0.128\Oftecnica\maqcorte\<año>\ARCHIVOS DXF - MAQUINA NUEVA. 300 tienen fichero y 266 tienen filas de marcas extraíbles. Sin orientación, pieza activa y origen sobre lona hecha confirmados no se convierten en medidas automáticas.
- El histórico y las extracciones previas están en C:\Users\ivan.sanchez\Documents\Proyectos DEV\toldos-testar\tmp\dxf-estudio\remolques. Se contrastan historico-remolques.json, repartos-todo.json, repartos-lonas.json, medidas-cliente.json, remolques-clientes.json y lonas-pdf.json. Cabeza A/B no equivale por sí sola a delante/detrás; medidas-cliente mezcla tipos y no se usa como agrupación final.
- Código: código explícito del histórico o GET /api/remolques/rps-pedido?numero=... del pedido más reciente, con consultas espaciadas. Los datos de cada asociación están en codigos-rps.json. No se ha consultado ninguna base de datos ni leído credenciales.
- Ollaos: cm sobre lona hecha; laterales de atrás a delante y cabezas de izquierda a derecha. Las hojas lo indican en las etiquetas de las filas. En baquetón se leen I:T de 38/39/40 si el modo es «según se indica», y 33/34/35 si es «repartidos». En lona se lee el resultado activo I:T de 26/27/28. No se recalculan fórmulas del libro: se toma lo que quedó guardado.
- Se centra trasladando todos los puntos la misma cantidad cuando los huecos interiores son simétricos (tolerancia de redondeo 0,21 cm) y la asimetría está en los márgenes. Se conserva la asimetría interna acreditada y la deliberada de REMOLCAR. No se alteran los huecos ni se sustituyen puntas fijas por un paso genérico. Las medidas ya vigentes quedan intactas.
- Se compara cada cliente × tipo × largo × ancho. Una variante necesita mayoría estricta de pedidos distintos; si no existe, se toma el ejemplo más reciente. Copias o varias fuentes del mismo pedido no añaden votos. Los PDF producidos tienen prioridad cuando son del mismo pedido y fecha.
- «Habitual» por estadística exige tres pedidos y al menos 90 % de los votos de valor observado; los valores distintos dentro de un pedido cuentan como contradicción. La plantilla expresa prevalece y sus contradicciones se señalan. No se infiere una obligación de lo que falta en un texto de RPS.
- Ganado está inventariado, pero FichaCliente no se aplica a esos elementos (aplicar.ts); manda su modelo de plantilla, conforme a docs/modelos/remolque-ganado.md. No se convierte «ganado» en lona alta por su altura.

## Archivos de revisión y carga

- fichas-vigentes.json: copia íntegra de las once fichas leídas por GET, con sus versiones.
- fichas-propuestas.json: lista válida de FichaCliente; incluye identidades, reglas acreditadas y medidas con evidencia.
- codigos-rps.json: todas las asociaciones nombre/código, pedido y método de resolución.
- evidencias.json: variantes, pedidos contados, posiciones originales y centradas, fuente, hoja y filas, descartes y referencias sin reparto completo. Los originales se identifican con SHA-256 cuando se han leído.
- scripts/cargar-fichas-remolques.mjs: por defecto es un ensayo local, sin peticiones; con --url contrasta por GET. Crear requiere POST en la API actual; modificar usa PUT /api/remolques/clientes/:id y la baseVersion estudiada. La carga se detiene ante conflicto, no borra fichas ni medidas y nunca sustituye una versión por la última solo para poder guardar.

```powershell
node scripts/cargar-fichas-remolques.mjs --dry-run
# Solo Iván, después de revisar y corregir las dudas:
node scripts/cargar-fichas-remolques.mjs --apply --url http://192.168.0.90:4400 --soy IVAN
```

El segundo comando queda documentado para Iván: no se ha ejecutado. Una corrección revisada de posiciones puede editarse en la propuesta conservando su clave de medida; el cargador verifica la versión antes de escribir.

## Dudas que afectan a reglas de cliente

- **METALURGICAS NORTE BURGOS S.L. (023649):** ¿La holgura total de 2 cm de largo y ancho de la nota de mayo se aplica tanto a la lona alta como al baquetón? FichaCliente no tiene una holgura general de lona; hay que confirmar las demasías antes de automatizarla.
- **REMOLQUES Y CARAVANAS MALLON, S. L. (001795):** Falta confirmar si las referencias RL14/RL16/RL18/RL20/RL23 son medidas del remolque o de la lona y asociar cada una a las dos cabezas. Los pedidos BE y sus cortes están localizados en las fuentes; no se cargan repartos completos deducidos de una sola fila.
- **CERRAJERIA MALDONADO / CAMACHO · CARROCERIAS Y REMOLQUES CAMACHO 1990 SL (031580):** ¿La recogida habitual actual de CAMACHO es cremallera, como dice la plantilla, o GOMA, como sus hojas del histórico? También falta aclarar si los 10 cm de aguas están incluidos en la altura.
- **CANO MUÑOZ, FRANCISCO (045288):** ¿Qué dimensiones entrega ahora CANO: remolque o lona acabada, y qué aumentos concretos deben quedar en cada uno de los siete campos de baquetón? No se suman las dos notas de +0,5 sin aclararlo.
- **CANO MUÑOZ S.L.U. (030179):** Confirmar las demasías del baquetón con la nota de CANO: la ficha de esta sociedad se conserva sin reemplazarla por las reglas inferidas de la cuenta personal 045288.
- **TALLERES R.CASAL, S. L. , (001138):** AR2401103: el croquis escribe huecos laterales 12–28–35–35–28–12 y cabezas 12–26–30–26–12. Su DXF tiene dos laterales distintos (desde corte: 13–41–76–112–140 y 13–41–69–114–140). ¿Qué lado es el patrón? FichaCliente solo admite un reparto lateral común; no se mezcla el croquis con uno de los dos cortes para completar esta medida.
- **Plantillas sin identidad RPS:** falta asociar los clientes antiguos enumerados en el apéndice. Se ha preguntado al coordinador; todos los 276 del histórico sí están asociados. No se crean fichas con códigos inventados o vacíos.
- **Referencias sin reparto:** la tabla de cada cliente identifica los pedidos y medidas pendientes. Hace falta confirmar los lados y su origen o leer las cotas manuscritas; no se pregunta de nuevo por lo ya acreditado.

## Clientes

### REMOLCAR · JUAN BARREIRO, S. L. — 000265

Ficha: `remolcar`. Histórico: **244 líneas / 171 pedidos**. PDF producidos adicionales examinados: 7. Registro vigente versión 10, conservado.

Código acreditado por histórico (AR2603999). Nombres/alias del histórico: REMOLCAR · JUAN BARREIRO, S. L..

Plantillas encontradas: `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/GANADO2,50X1,40 ARQU.NORMAL(REMOLCAR).dwg`; `PL/REMOLCAR/MEDIDAS OLLAOS NUEVAS/320X160.doc`; `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR_CABALLOS_275_x_160_arquillo_reforzado.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLQUE 300X150 ECONOMICO OBSOLETO.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR_GANADO_275_X_160_ARQUILLO_REFORZADO.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR  GANADO 300 X 160 ARCO REFORZADO.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUES CONFIRMADOS/CABALLOS 300 x160 TABLERO POLIESTER.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUE GANADO 3X160M ALTURA CABALLOS.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUE 3M ECO 3X150 (BUENO).dwg`; `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR_CABALLOS_275_x_160_arquillo_reforzadofdf.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUE 300X160 ESTANDAR.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/remolcar CABALLOS 3x1,60 arquillo reforzado.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUES CONFIRMADOS/CABALLOS 300X140 TABLERO.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR GANADO 250 X 140 ARQUILLO REFORZADO.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUES CONFIRMADOS/REMOLQUE CABALLOS 300 x160 TABLERO ATRÁS BAJA 10 CM.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR CABALLOS 250 X 140 ARQUILLO REFORZADO.dwg`; `PL/REMOLCAR/REMOLCAR.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLQUE 300X150 ECONOMICO (MODIFICADO) OBSOLETO.dwg`; `PL/REMOLCAR/REJILLA.dwg`; `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUES GANADO NUEVOS/REMOLQUE GANADO 300 x160 TABLERO ATRÁS BAJA 10 CM.dwg`

Las asimetrías deliberadas de REMOLCAR/JUAN BARREIRO se conservan, incluido el ollao adicional en la esquina trasera (instrucción de Iván).

OLLAOS/REMOLQUILLEROS.doc: con oreja, ventana y curva normal R=10,1; medidas propias. REMOLCAR/MEDIDAS OLLAOS NUEVAS/320X160.doc da laterales desde atrás 10; 38; 79; 119; 158; 198; 239; 278; 310 y trasera 10; 40; 80; 120; 156. Ese documento habla de ganchos sobre el remolque, no se copia como posiciones sobre la lona hecha.

Campos vigentes que se respetan: `perfil` = {"tipoPerfil":"TIPO 05","radioEsquina":10.1}; `recogeDelante` = "NO"; `recogeAtras` = "GOMA"; `bastillaEnfundar` = false; `ventana` = {"lleva":true,"ancho":50,"alto":35}.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 105 (AR2402349, AR2401442, AR2402915, AR2602190, AR2406550, AR2504973, AR2500972, AR2401199, AR2406341, AR2500275, AR2401001, AR2401254, AR2506341, AR2600852, AR2500804, AR2600739, AR2503696, AR2600280, AR2406601, AR2401318, AR2602890, AR2600997, AR2503374, AR2500694, AR2600815, AR2503793, AR2401787, AR2405862, AR2402844, AR2400897, AR2603690, AR2500304, AR2406454, AR2600987, AR2500949, AR2401315, AR2404141, AR2400629, AR2400014, AR2600889, AR2500156, AR2500235, AR2603230, AR2400731, AR2400013, AR2503868, AR2504984, AR2600281, AR2506284, AR2500654, AR2401431, AR2501637, AR2503280, AR2500494, AR2600543, AR2503900, AR2405087, AR2400288, AR2500864, AR2405483, AR2406102, AR2500090, AR2403813, AR2601016, AR2603306, AR2500621, AR2600439, AR2603166, AR2600995, AR2600487, AR2405784, AR2402115, AR2501686, AR2400761, AR2505412, AR2403170, AR2406322, AR2601673, AR2406134, AR2602022, AR2406826, AR2603114, AR2503974, AR2405519, AR2501252, AR2401227, AR2400229, AR2402676, AR2500777, AR2502456, AR2504629, AR2600392, AR2405382, AR2404121, AR2503740, AR2506313, AR2406782, AR2401799, AR2503423, AR2600067, AR2501698, AR2503282, AR2502233, AR2505483, AR2600122); TIPO 01: 5 (AR2505051, AR2403178, AR2602177, AR2402363, AR2601607); TIPO 03: 4 (AR2400230, AR2406064, AR2405784, AR2602890) |
| recogeDelante | NO: 118 (AR2402349, AR2401442, AR2402594, AR2404319, AR2402915, AR2400230, AR2403702, AR2602190, AR2406550, AR2402591, AR2504973, AR2500972, AR2505051, AR2406341, AR2403178, AR2500275, AR2404284, AR2401001, AR2403343, AR2506341, AR2600852, AR2500804, AR2600739, AR2503696, AR2600280, AR2406601, AR2401318, AR2602890, AR2600997, AR2503374, AR2500694, AR2600815, AR2503793, AR2401787, AR2405862, AR2403189, AR2402844, AR2400897, AR2603690, AR2500304, AR2406454, AR2600987, AR2500949, AR2401315, AR2404141, AR2400629, AR2602177, AR2400014, AR2405784, AR2600889, AR2500156, AR2500235, AR2603230, AR2402363, AR2400731, AR2400013, AR2503868, AR2504984, AR2600281, AR2400229, AR2500654, AR2401431, AR2501637, AR2503280, AR2500494, AR2600543, AR2403428, AR2503900, AR2405087, AR2400288, AR2500864, AR2405483, AR2404538, AR2406102, AR2506284, AR2500090, AR2403813, AR2601016, AR2603306, AR2500621, AR2404422, AR2600439, AR2603166, AR2600995, AR2600487, AR2601607, AR2504035, AR2501686, AR2400761, AR2505412, AR2403170, AR2406322, AR2404605, AR2601673, AR2406134, AR2602022, AR2406826, AR2503974, AR2405519, AR2501252, AR2402676, AR2500777, AR2502456, AR2504629, AR2401227, AR2600392, AR2405382, AR2404121, AR2503740, AR2506313, AR2406782, AR2401799, AR2503423, AR2600067, AR2503282, AR2502233, AR2505483, AR2600122); GOMA: 10 (AR2406064, AR2401199, AR2401254, AR2600852, AR2506284, AR2402115, AR2603114, AR2401227, AR2600281, AR2505412); no: 1 (AR2501698) |
| recogeAtras | GOMA: 124 (AR2402349, AR2401442, AR2402594, AR2404319, AR2402915, AR2400230, AR2403702, AR2406064, AR2602190, AR2406550, AR2402591, AR2504973, AR2500972, AR2505051, AR2401199, AR2406341, AR2403178, AR2500275, AR2404284, AR2401001, AR2401254, AR2403343, AR2506341, AR2600852, AR2500804, AR2600739, AR2503696, AR2600280, AR2406601, AR2401318, AR2602890, AR2600997, AR2503374, AR2500694, AR2600815, AR2503793, AR2401787, AR2405862, AR2403189, AR2402844, AR2400897, AR2603690, AR2500304, AR2406454, AR2600987, AR2500949, AR2401315, AR2404141, AR2400629, AR2602177, AR2400014, AR2405784, AR2600889, AR2500156, AR2500235, AR2603230, AR2402363, AR2400731, AR2400013, AR2503868, AR2504984, AR2600281, AR2506284, AR2400229, AR2500654, AR2401431, AR2501637, AR2503280, AR2500494, AR2600543, AR2403428, AR2503900, AR2405087, AR2400288, AR2500864, AR2405483, AR2404538, AR2406102, AR2500090, AR2403813, AR2601016, AR2603306, AR2500621, AR2404422, AR2600439, AR2603166, AR2600995, AR2600487, AR2601607, AR2402115, AR2504035, AR2501686, AR2400761, AR2505412, AR2403170, AR2406322, AR2404605, AR2601673, AR2406134, AR2602022, AR2406826, AR2603114, AR2503974, AR2405519, AR2501252, AR2401227, AR2402676, AR2500777, AR2502456, AR2504629, AR2600392, AR2405382, AR2404121, AR2503740, AR2506313, AR2406782, AR2401799, AR2503423, AR2600067, AR2501698, AR2503282, AR2502233, AR2505483, AR2600122) |
| bastillaEnfundar | NO: 103 (AR2402349, AR2404319, AR2402915, AR2400230, AR2403702, AR2406064, AR2602190, AR2406550, AR2504973, AR2500972, AR2406341, AR2403178, AR2500275, AR2404284, AR2401001, AR2403343, AR2506341, AR2600852, AR2500804, AR2600739, AR2503696, AR2600280, AR2406601, AR2602890, AR2600997, AR2503374, AR2500694, AR2600815, AR2503793, AR2405862, AR2403189, AR2402844, AR2400897, AR2603690, AR2500304, AR2406454, AR2600987, AR2500949, AR2400629, AR2500156, AR2500235, AR2603230, AR2400731, AR2400013, AR2503868, AR2400014, AR2504984, AR2600281, AR2506284, AR2400229, AR2500654, AR2501637, AR2503280, AR2500494, AR2600543, AR2403428, AR2503900, AR2405087, AR2400288, AR2500864, AR2405483, AR2404538, AR2406102, AR2500090, AR2403813, AR2603306, AR2500621, AR2404422, AR2600439, AR2603166, AR2600995, AR2600487, AR2601607, AR2405784, AR2402115, AR2501686, AR2400761, AR2505412, AR2403170, AR2406322, AR2404605, AR2601673, AR2406134, AR2602022, AR2406826, AR2603114, AR2503974, AR2405519, AR2501252, AR2402676, AR2500777, AR2502456, AR2504629, AR2600392, AR2405382, AR2404121, AR2503740, AR2506313, AR2600067, AR2501698, AR2503282, AR2505483, AR2600122); SÍ: 9 (AR2505051, AR2402349, AR2400014, AR2500972, AR2405784, AR2600889, AR2601016, AR2600281, AR2502233) |
| ventana | SÍ: 116 (AR2402349, AR2401442, AR2402594, AR2404319, AR2400230, AR2403702, AR2406064, AR2602190, AR2406550, AR2402591, AR2504973, AR2500972, AR2401199, AR2406341, AR2500275, AR2404284, AR2401001, AR2401254, AR2403343, AR2506341, AR2600852, AR2500804, AR2600739, AR2503696, AR2600280, AR2406601, AR2401318, AR2602890, AR2600997, AR2503374, AR2500694, AR2600815, AR2503793, AR2401787, AR2405862, AR2403189, AR2402844, AR2400897, AR2603690, AR2500304, AR2406454, AR2600987, AR2401315, AR2404141, AR2400629, AR2400014, AR2405784, AR2600889, AR2500156, AR2500235, AR2603230, AR2400731, AR2400013, AR2503868, AR2504984, AR2600281, AR2506284, AR2400229, AR2500654, AR2401431, AR2501637, AR2503280, AR2600543, AR2403428, AR2503900, AR2405087, AR2400288, AR2500864, AR2405483, AR2404538, AR2406102, AR2500090, AR2403813, AR2601016, AR2603306, AR2500621, AR2600439, AR2603166, AR2600995, AR2600487, AR2402115, AR2504035, AR2501686, AR2400761, AR2505412, AR2403170, AR2406322, AR2404605, AR2601673, AR2406134, AR2602022, AR2406826, AR2603114, AR2503974, AR2405519, AR2501252, AR2401227, AR2402676, AR2500777, AR2502456, AR2504629, AR2600392, AR2405382, AR2404121, AR2503740, AR2500949, AR2506313, AR2406782, AR2401799, AR2503423, AR2600067, AR2501698, AR2503282, AR2502233, AR2505483, AR2600122); NO: 11 (AR2402915, AR2505051, AR2403178, AR2500949, AR2602177, AR2402363, AR2500494, AR2401787, AR2404422, AR2601607, AR2600281) |
| rotulacion | NO: 79 (AR2402349, AR2401442, AR2404319, AR2402915, AR2400230, AR2602190, AR2402591, AR2504973, AR2505051, AR2401199, AR2406341, AR2403178, AR2401254, AR2506341, AR2600852, AR2500804, AR2600739, AR2503696, AR2401318, AR2602890, AR2600997, AR2500694, AR2600815, AR2503793, AR2401787, AR2403189, AR2402844, AR2400897, AR2500304, AR2600987, AR2500949, AR2401315, AR2400629, AR2602177, AR2400014, AR2405784, AR2600889, AR2500156, AR2402363, AR2400013, AR2503868, AR2504984, AR2600281, AR2401431, AR2501637, AR2600543, AR2403428, AR2503900, AR2405087, AR2400288, AR2405483, AR2500090, AR2403813, AR2500621, AR2404422, AR2600439, AR2603166, AR2402115, AR2400761, AR2503374, AR2600280, AR2505412, AR2403170, AR2406322, AR2404605, AR2601673, AR2602022, AR2406826, AR2500777, AR2504629, AR2405382, AR2503740, AR2506313, AR2406782, AR2401799, AR2503423, AR2600067, AR2501698, AR2505483); SI: 36 (AR2402594, AR2500972, AR2500275, AR2401001, AR2600280, AR2503374, AR2600997, AR2600739, AR2603690, AR2500235, AR2603230, AR2506284, AR2500654, AR2503280, AR2500494, AR2504973, AR2500864, AR2404538, AR2602890, AR2601016, AR2603306, AR2600995, AR2600487, AR2504035, AR2501686, AR2603114, AR2503974, AR2501252, AR2505412, AR2401227, AR2502456, AR2600392, AR2500949, AR2503282, AR2502233, AR2600122); SÍ: 10 (AR2403702, AR2406064, AR2404284, AR2403343, AR2405862, AR2406341, AR2406102, AR2406134, AR2405519, AR2404121); AGRICOLA LIÑARES: 2 (AR2402349, AR2400230); si: 2 (AR2401318, AR2404141); ALMACENES LADISLAO: 2 (AR2400229, AR2402676); no: 1 (AR2406601); sí: 1 (AR2406454); MOURE MAQUINARIA: 1 (AR2400014); AGRICAMPO: 1 (AR2402349) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 64 (AR2402349, AR2402594, AR2404319, AR2402915, AR2400230, AR2403702, AR2406708, AR2406064, AR2401959, AR2406550, AR2403456, AR2405373, AR2401199, AR2406341, AR2403178, AR2500275, AR2404284, AR2401001, AR2401254, AR2403343, AR2406601, AR2500694, AR2500398, AR2401787, AR2405862, AR2500304, AR2406454, AR2401315, AR2401318, AR2404141, AR2400629, AR2400014, AR2405784, AR2500156, AR2500235, AR2402363, AR2400013, AR2400229, AR2401431, AR2501637, AR2500494, AR2600543, AR2403428, AR2405483, AR2404538, AR2406102, AR2500090, AR2500621, AR2600487, AR2402115, AR2501686, AR2400761, AR2406322, AR2406134, AR2406826, AR2405519, AR2401227, AR2402676, AR2401474, AR2404121, AR2406782, AR2401799, AR2500247, AR2501698); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 49 (AR2601637, AR2504973, AR2500972, AR2505051, AR2505106, AR2506341, AR2603924, AR2503696, AR2602077, AR2600280, AR2501613, AR2600997, AR2503374, AR2600815, AR2503793, AR2600739, AR2603690, AR2602177, AR2603230, AR2603999, AR2503868, AR2600281, AR2506284, AR2503900, AR2500864, AR2600354, AR2602890, AR2601016, AR2603306, AR2603166, AR2504035, AR2505412, AR2602022, AR2603114, AR2503974, AR2503872, AR2501252, AR2600130, AR2601095, AR2500777, AR2502456, AR2504629, AR2504553, AR2600392, AR2500949, AR2506313, AR2506054, AR2506004, AR2600122); LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 19 (AR2603827, AR2403539, AR2402803, AR2403189, AR2406060, AR2402844, AR2400897, AR2406552, AR2400731, AR2504984, AR2504973, AR2502248, AR2600995, AR2403170, AR2404605, AR2602022, AR2503423, AR2600067, AR2505483); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 5 (AR2401442, AR2401318, AR2506027, AR2404422, AR2405967); LONA MONZA 1 L 580 G/M2: GRIS RAL 7038: 250 AN: 5 (AR2600852, AR2600987, AR2503280, AR2503740, AR2503282); LONA RECORD 1 L 580:GRIS 095 RAL 7038:220 AN: 4 (AR2402591, AR2403878, AR2403189, AR2403813); LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 4 (AR2600739, AR2600889, AR2601607, AR2405382); LONA ALPHA 1L 580  :NEGRO :250 AN: 4 (AR2602890, AR2401315, AR2405087, AR2600281); LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 2 (AR2405004, AR2400288); LONA STARPLUS 1L 610 : AZUL EUROPA R-073 : 250 AN ( 580 ): 2 (AR2600739, AR2600439); LONA G650 2L 650 :AZUL EUROPA 95 :250 AN (M5731): 2 (AR2400230, AR2400972); LONA MONZA 1L 580 :MARFIL RAL 1013 :250AN : 1 (AR2602190); LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2500804); LONA ALPHA 1L 580: AZUL RAL5015: 220 AN: 1 (AR2400668); LONA ALPHA 1L 580: AZUL EUROPA-95 : 220 AN: 1 (AR2600997); LONA ALPHA 1L 580 :ARENA  :250 AN: 1 (AR2500949); LONA STARPLUS 1L 610  :BLANCO RAL9010 :250 AN: 1 (AR2500654); LONA ALPHA 1L 580 :AMARILLO RAL1018 :250 AN: 1 (AR2601673); LONA NS86 2L 630GR [580]: BLANCO : 250 AN: 1 (AR2600281); LONA ALPHA 1L 580 :VERDE RAL6024 :250 AN: 1 (AR2502233) |
| modo | SEGUN SE INDICA: 153 (AR2402349, AR2401442, AR2402594, AR2404319, AR2405004, AR2402915, AR2400230, AR2601637, AR2403702, AR2406708, AR2406064, AR2602190, AR2401959, AR2406550, AR2402591, AR2504973, AR2403456, AR2500972, AR2505051, AR2401199, AR2406341, AR2403178, AR2500275, AR2404284, AR2401001, AR2401254, AR2403343, AR2403878, AR2505106, AR2506341, AR2600852, AR2603924, AR2500804, AR2603827, AR2400668, AR2403539, AR2600739, AR2402803, AR2503696, AR2602077, AR2600280, AR2406601, AR2401318, AR2501613, AR2602890, AR2600997, AR2503374, AR2500694, AR2500398, AR2600815, AR2503793, AR2401787, AR2405862, AR2403189, AR2406060, AR2402844, AR2400897, AR2603690, AR2500304, AR2406454, AR2600987, AR2506027, AR2500949, AR2401315, AR2404141, AR2400629, AR2602177, AR2400014, AR2405784, AR2600889, AR2406552, AR2500235, AR2603230, AR2402363, AR2603999, AR2400731, AR2400013, AR2503868, AR2504984, AR2600281, AR2506284, AR2400229, AR2500654, AR2401431, AR2501637, AR2503280, AR2500494, AR2600543, AR2403428, AR2503900, AR2405087, AR2400288, AR2500864, AR2405483, AR2600354, AR2404538, AR2406102, AR2400972, AR2502248, AR2403813, AR2601016, AR2603306, AR2500621, AR2404422, AR2600439, AR2603166, AR2600995, AR2600487, AR2601607, AR2402115, AR2504035, AR2501686, AR2400761, AR2505412, AR2403170, AR2406322, AR2404605, AR2601673, AR2406134, AR2602022, AR2405967, AR2406826, AR2603114, AR2503974, AR2405519, AR2503872, AR2501252, AR2600130, AR2401227, AR2402676, AR2601095, AR2500777, AR2502456, AR2401474, AR2504629, AR2504553, AR2600392, AR2405382, AR2404121, AR2503740, AR2506313, AR2406782, AR2401799, AR2503423, AR2600067, AR2500247, AR2501698, AR2503282, AR2502233, AR2505483, AR2506054, AR2506004, AR2600122); REPARTIDOS: 3 (AR2405373, AR2500156, AR2500090) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 200 × 160 | 10,5; 41,5; 80,5; 116,5; 150,5 | 10,5; 41,5; 80,5; 116,5; 150,5 | 10; 41; 81; 121; 161; 191 | Vigente v10; se conserva. AR2604824; OT/2026/AR2604824.pdf; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2604824 / 1 pedido(s): AR2503280. |
| lona; 230 × 130 | 10; 45; 86; 121 | 10; 45; 86; 121 | 5; 11; 52; 98; 141; 185; 221 | Vigente v10; se conserva. AR2506284; OT/2025/AR2506284-14.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 8 pedido(s): AR2401001, AR2403813, AR2406322, AR2500494, AR2503374, AR2503696, AR2600280, AR2605023 / 5 pedido(s): AR2500949, AR2503868, AR2505412, AR2506284, AR2600987 / 3 pedido(s): AR2400013, AR2400230, AR2405087 / 2 pedido(s): AR2403189, AR2405784 / 1 pedido(s): AR2403170 / 1 pedido(s): AR2503793 / 1 pedido(s): AR2501698 / 1 pedido(s): AR2406601 / 1 pedido(s): AR2406341. |
| baqueton; 210 × 130 | 8; 42; 89,8; 123 | 8; 42; 89,8; 123 | 10; 43,5; 85; 127,5; 169,5; 200,5 | Vigente v10; se conserva. AR2506054; OT/2025/AR2506054.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2602022, AR2605051 / 1 pedido(s): AR2506054 / 1 pedido(s): AR2504553. |
| lona; 140 × 110 | 4,3; 31,8; 78,5; 106,5 | 4,3; 31,8; 78,5; 106,5 | 5; 11; 48; 93,8; 128,8 | Vigente v10; se conserva. AR2605120; OT/2026/AR2605120.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605120. |
| lona; 180 × 120 | 10; 42; 76; 111 | 10; 42; 76; 111 | 10; 46; 93; 138; 171 | Vigente v10; se conserva. AR2602190; OT/2026/AR2602190.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 3 pedido(s): AR2500235, AR2503974, AR2602190 / 1 pedido(s): AR2402594 / 1 pedido(s): AR2401315 / 1 pedido(s): AR2605132. |
| lona; 270 × 160 | 10,5; 41,5; 80,5; 116,5; 150,5 | 10,5; 41,5; 80,5; 116,5; 150,5 | 5; 11; 47; 91; 137; 180; 225; 261 | Vigente v10; se conserva. AR2506284; OT/2025/AR2506284-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 5 pedido(s): AR2402676, AR2406782, AR2500275, AR2600889, AR2603114 / 2 pedido(s): AR2505412, AR2506284 / 2 pedido(s): AR2401227, AR2401318 / 1 pedido(s): AR2402115 / 1 pedido(s): AR2605132 / 1 pedido(s): AR2406064. |
| lona; 150 × 110 | 10,5; 37,5; 76,5; 100,5 | 10,5; 37,5; 76,5; 100,5 | 10; 50; 100; 141 | Vigente v10; se conserva. AR2406341; OT/2024/AR2406341-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2406341 / 1 pedido(s): AR2404121. |
| baqueton; 150 × 110 | 10,5; 37,5; 76,5; 100,5 | 10,5; 37,5; 76,5; 100,5 | 10; 50; 100; 141 | Vigente v10; se conserva. AR2503872; OT/2025/AR2503872.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2503872, AR2600280 / 1 pedido(s): AR2405967. |
| lona; 225 × 125 | 10; 40; 88; 116 | 10; 38; 86; 116 | 5; 11; 48; 93; 136; 181; 216 | Vigente v10; se conserva. AR2402844; OT/2024/AR2402844.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2400230, AR2401431 / 1 pedido(s): AR2402844 / 1 pedido(s): AR2405483. |
| baqueton; 225 × 125 | 10; 40; 88; 116 | 10; 38; 86; 116 | 5; 11; 48; 93; 136; 181; 216 | Vigente v10; se conserva. AR2402803; OT/2024/AR2402803.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2402803, AR2505106. |
| lona; 250 × 140 | 6,5; 46,5; 98,5; 134,5 | 6,5; 46,5; 98,5; 134,5 | 10; 44; 86; 128; 168; 208; 241 | Vigente v10; se conserva. AR2600739; OT/2026/AR2600739-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 19 pedido(s): AR2400731, AR2402915, AR2403178, AR2403189, AR2403343, AR2403428, AR2406550, AR2503374, AR2503740, AR2503793, AR2506284, AR2506313, AR2600122, AR2600280, AR2600739, AR2600815, AR2600852, AR2602890, AR2603690 / 2 pedido(s): AR2600543, AR2600997 / 2 pedido(s): AR2401787, AR2405519 / 1 pedido(s): AR2605152. |
| baqueton; 250 × 140 | 6,5; 46,5; 98,5; 134,5 | 6,5; 46,5; 98,5; 134,5 | 10; 44; 86; 128; 168; 208; 241 | Vigente v10; se conserva. AR2506004; OT/2025/AR2506004.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2406708, AR2506004 / 1 pedido(s): AR2500398 / 1 pedido(s): AR2400731. |
| lona; 260 × 160 | 10,5; 44,5; 80,5; 119,5; 150,5 | 10,5; 44,5; 80,5; 119,5; 150,5 | 10; 45; 91; 133; 176; 218; 251 | Vigente v10; se conserva. AR2602890; OT/2026/AR2602890-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2602890 / 1 pedido(s): AR2500090 / 1 pedido(s): AR2402349 / 1 pedido(s): AR2406102. |
| baqueton; 260 × 160 | 10,5; 44,5; 80,5; 119,5; 150,5 | 10,5; 44,5; 80,5; 119,5; 150,5 | 10; 45; 91; 133; 176; 218; 251 | Vigente v10; se conserva. AR2501613; OT/2025/AR2501613.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2501613, AR2602890. |
| baqueton; 130 × 100 | 8; 50,5; 93 | 8; 50,5; 93 | 8; 42; 89,8; 123 |  AR2603827; OT/2026/AR2603827-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2603827 / 1 pedido(s): AR2405373. |
| baqueton; 140 × 110 | 10; 35; 74; 101 | 10; 35; 74; 101 | 6; 42; 94; 134 |  AR2603827; OT/2026/AR2603827-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2603827 / 1 pedido(s): AR2406552. |
| baqueton; 150 × 90 | 10; 32; 61; 81 | 10; 32; 61; 81 | 10; 51; 101; 141 |  AR2601637; OT/2026/AR2601637.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601637. |
| baqueton; 160,5 × 121 | 11; 46; 80; 112 | 11; 46; 80; 112 | 5; 10; 41,5; 80,5; 151,5 |  AR2400668; OT/2024/AR2400668.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400668. |
| baqueton; 160 × 120 | 10; 42; 76; 111 | 10; 42; 76; 111 | 2,5; 10; 42; 81; 120; 150 |  AR2400972; OT/2024/AR2400972.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2400972, AR2600130, AR2603999 / 2 pedido(s): AR2403456, AR2403539. |
| baqueton; 180 × 120 | 10; 42; 76; 111 | 10; 42; 76; 111 | 14,5; 49,7; 91; 132,5; 167,2 |  AR2602077; OT/2026/AR2602077.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602077. |
| baqueton; 180 × 130 | 10; 45; 86; 121 | 10; 45; 86; 121 | 13,8; 48,5; 90; 131,3; 166,5 |  AR2506027; OT/2025/AR2506027.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2401474, AR2506027. |
| baqueton; 200 × 125 | 10; 40; 88; 116 | 10; 40; 88; 116 | 2,5; 40; 80; 120; 160; 198,5 |  AR2406060; OT/2024/AR2406060.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2406060 / 1 pedido(s): AR2403189. |
| baqueton; 200 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 |  AR2600739; OT/2026/AR2600739.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600739. |
| baqueton; 200 × 140 | 6; 42; 94; 134 | 6; 42; 94; 134 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 |  AR2603924; OT/2026/AR2603924.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603924. |
| baqueton; 225 × 160 | 10; 44; 80; 119; 150 | 10; 44; 80; 119; 150 | 10; 46; 91; 136; 181; 216 |  AR2403456; OT/2024/AR2403456-12.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403456. |
| baqueton; 230 × 130 | 10; 45; 86; 121 | 10; 45; 86; 121 | 10; 52; 98; 141; 185; 221 |  AR2401315; OT/2024/AR2401315.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2401315, AR2403456 / 1 pedido(s): AR2505412 / 1 pedido(s): AR2503374. |
| baqueton; 230 × 160 | 11; 42; 81; 117; 151 | 11; 42; 81; 117; 151 | 10; 46; 90; 133; 179; 220 |  AR2600280; OT/2026/AR2600280-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600280. |
| baqueton; 250 × 160 | 10; 40; 80; 119,7; 150 | 10; 40; 80; 119,7; 150 | 10; 43; 83; 123; 165; 207; 241 |  AR2600354; OT/2026/AR2600354.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600354. |
| baqueton; 270 × 160 | 10; 45,3; 80,5; 115,8; 151 | 10; 45,3; 80,5; 115,8; 151 | 10; 47; 91; 137; 180; 225; 261 |  AR2601095; OT/2026/AR2601095.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2601095 / 1 pedido(s): AR2405004 / 1 pedido(s): AR2403878. |
| baqueton; 310 × 200 | 10; 41; 81; 121; 161; 191 | 10; 41; 81; 121; 161; 191 | 10; 45,8; 88,3; 133,3; 178; 223,3; 266; 301 |  AR2500247; OT/2025/AR2500247.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500247. |
| baqueton; 311 × 160 | 11; 41; 80; 121; 151 | 11; 41; 80; 121; 151 | 10,5; 45,5; 88,3; 133,5; 178,3; 223,3; 265,8; 301,5 |  AR2502248; OT/2025/AR2502248.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502248. |
| lona; 130 × 100 | 5; 32; 71; 96 | 5; 32; 71; 96 | 10; 45; 86; 121 |  AR2600739; OT/2026/AR2600739-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600739. |
| lona; 150 × 115,5 | 10; 39; 79,5; 106,5 | 10; 39; 79,5; 106,5 | 5; 10; 51; 101; 141 |  AR2404422; OT/2024/AR2404422.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404422. |
| lona; 150 × 120 | 10; 42; 76; 111 | 10; 42; 76; 111 | 5; 10; 51; 101; 141 |  AR2401318; OT/2024/AR2401318.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401318. |
| lona; 160 × 120 | 10; 45; 79; 111 | 10; 45; 79; 111 | 5; 11; 41; 80; 121; 153,7 |  AR2506284; OT/2025/AR2506284-13.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2506284 / 1 pedido(s): AR2602177 / 1 pedido(s): AR2600995 / 1 pedido(s): AR2404605 / 1 pedido(s): AR2400897. |
| lona; 175 × 110 | 10; 37; 76; 101 | 10; 37; 76; 101 | 5; 10; 43; 88; 127; 166 |  AR2500804; OT/2025/AR2500804.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2500804, AR2504973. |
| lona; 180 × 110 | 10; 37; 76; 101 | 10; 37; 76; 101 | 10; 46; 93; 138; 171 |  AR2502456; OT/2025/AR2502456.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502456. |
| lona; 180 × 130 | 8; 42; 90; 123 | 8; 42; 90; 123 | 5; 10; 51; 93; 138; 171 |  AR2400761; OT/2024/AR2400761.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2400761 / 1 pedido(s): AR2600852. |
| lona; 180 × 140 | 6; 42; 94; 134 | 6; 42; 94; 134 | 10; 46; 93; 138; 171 |  AR2406454; OT/2024/AR2406454.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406454. |
| lona; 183 × 115 | 6,5; 31,5; 57,5; 83,5; 109,5 | 2,5; 34; 66; 100; 113,5 | 2,5; 25; 46; 68; 90; 113; 133; 155; 175; 181,5 |  AR2601607; OT/2026/AR2601607.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601607. |
| lona; 200 × 120 | 10; 45; 79; 111 | 10; 45; 79; 111 | 5; 10; 41; 81; 121; 161; 191 |  AR2504035; OT/2025/AR2504035.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 4 pedido(s): AR2402349, AR2402594, AR2504035, AR2600439 / 1 pedido(s): AR2600067. |
| lona; 200 × 125 | 10; 41,5; 84,5; 116 | 10; 41,5; 84,5; 116 | 10; 41; 81; 121; 161; 191 |  AR2500156; OT/2025/AR2500156.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500156. |
| lona; 200 × 130 | 8; 42; 89,8; 123 | 8; 42; 89,8; 123 | 5; 10; 41; 81; 121; 161; 191 |  AR2600739; OT/2026/AR2600739.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2500777, AR2600739, AR2602022. |
| lona; 200 × 140 | 6; 42; 94; 134 | 6; 42; 94; 134 | 10; 41; 81; 121; 161; 191 |  AR2600392; OT/2026/AR2600392.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600392. |
| lona; 210 × 130 | 8; 42; 89,8; 123 | 8; 42; 89,8; 123 | 2,5; 10; 48; 85,5; 128; 170; 201 |  AR2500864; OT/2025/AR2500864.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 7 pedido(s): AR2404284, AR2500621, AR2500864, AR2503374, AR2504984, AR2505483, AR2604801 / 3 pedido(s): AR2401442, AR2600487, AR2600543 / 2 pedido(s): AR2402591, AR2503423 / 1 pedido(s): AR2400230 / 1 pedido(s): AR2405862 / 1 pedido(s): AR2404319 / 1 pedido(s): AR2404141. |
| lona; 210 × 135 | 8; 43,8; 91,5; 128 | 8; 43,8; 91,5; 128 | 2,5; 10; 48; 85,5; 128; 170; 201 |  AR2401787; OT/2024/AR2401787-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2401787 / 1 pedido(s): AR2400629. |
| lona; 210 × 140 | 6; 42; 94; 134 | 6; 42; 94; 134 | 2,5; 10; 48; 85,5; 128; 170; 201 |  AR2504973; OT/2025/AR2504973-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504973. |
| lona; 210 × 160 | 11; 42; 81; 117; 151 | 11; 42; 81; 117; 151 | 5; 10; 43,5; 85; 127,5; 169,5; 200,5 |  AR2400014; OT/2024/AR2400014-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400014. |
| lona; 220 × 140 | 6; 42; 94; 134 | 6; 42; 94; 134 | 5; 11; 45; 89; 133; 177; 211 |  AR2402349; OT/2024/AR2402349-5.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402349. |
| lona; 221 × 161 | 11; 42,5; 81,5; 117,5; 152 | 11; 42,5; 81,5; 117,5; 152 | 5; 11; 45,5; 89,5; 133,5; 177,5; 212 |  AR2402363; OT/2024/AR2402363.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402363. |
| lona; 225 × 160 | 10; 44; 80; 119; 150 | 10; 44; 80; 119; 150 | 10; 45; 90; 135; 180; 216; 221 |  AR2401199; OT/2024/AR2401199.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2401199 / 1 pedido(s): AR2401254. |
| lona; 230 × 155 | 5; 41,5; 78; 114,5; 151 | 5; 41,5; 78; 114,5; 151 | 5; 10; 47; 93; 139; 185; 221; 226 |  AR2604801; OT/2026/AR2604801.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2604801. |
| lona; 240 × 140 | 6; 42; 94; 134 | 6; 42; 94; 134 | 10; 41,4; 79,7; 118,1; 158,4; 198,8; 231 |  AR2501252; OT/2025/AR2501252.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2406134, AR2501252, AR2503282 / 1 pedido(s): AR2401318. |
| lona; 250 × 130 | 8; 42; 89,8; 123 | 8; 42; 89,8; 123 | 10; 44; 86; 128; 168; 208; 241 |  AR2603230; OT/2026/AR2603230.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603230. |
| lona; 250 × 150 | 7; 46; 106; 145 | 7; 46; 106; 145 | 5; 10; 44; 86; 128; 167,8; 208; 241 |  AR2600281; OT/2026/AR2600281.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2403702, AR2406134 / 1 pedido(s): AR2600281 / 1 pedido(s): AR2603306 / 1 pedido(s): AR2600997 / 1 pedido(s): AR2501686. |
| lona; 250 × 160 | 11; 42; 81; 117; 151 | 11; 42; 81; 117; 151 | 5; 10; 44; 86; 128; 168; 208; 241 |  AR2506284; OT/2025/AR2506284-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 7 pedido(s): AR2400229, AR2500694, AR2500972, AR2503793, AR2506284, AR2601673, AR2603166 / 1 pedido(s): AR2404538. |
| lona; 250 × 170 | 10; 43; 86; 127; 160 | 10; 43; 86; 127; 160 | 5; 10; 44; 86; 128; 168; 208; 241 |  AR2400014; OT/2024/AR2400014-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400014. |
| lona; 255 × 150 | 7; 46; 106; 145 | 7; 46; 106; 145 | 5; 10; 45; 88; 131; 172; 213; 246 |  AR2506341; OT/2025/AR2506341.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2500304, AR2503696, AR2506341 / 2 pedido(s): AR2403813, AR2406826. |
| lona; 260 × 135 | 8; 43,8; 91,5; 128 | 8; 43,8; 91,5; 128 | 10; 45; 91; 133; 176; 218; 251 |  AR2401799; OT/2024/AR2401799.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401799. |
| lona; 260 × 140 | 6; 42; 94; 134 | 6; 42; 94; 134 | 5; 10; 45; 91; 133; 176; 218; 251 |  AR2400013; OT/2024/AR2400013-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2400013 / 1 pedido(s): AR2500949 / 1 pedido(s): AR2405382. |
| lona; 260 × 150 | 6; 45; 105; 144 | 6; 45; 105; 144 | 2,5; 10; 45; 91; 133; 176; 218; 251 |  AR2401787; OT/2024/AR2401787-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2401787 / 1 pedido(s): AR2404121 / 1 pedido(s): AR2403702. |
| lona; 261 × 150 | 7; 46; 106; 145 | 7; 46; 106; 145 | 5; 10; 46; 92; 134; 177; 219; 252 |  AR2504629; OT/2025/AR2504629.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504629. |
| lona; 270 × 140 | 6; 42; 94; 134 | 6; 42; 94; 134 | 5; 11; 47; 91; 137; 180; 225; 261 |  AR2503900; OT/2025/AR2503900.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503900. |
| lona; 270 × 170 | 10; 43; 86; 127; 160 | 10; 43; 86; 127; 160 | 5; 11; 47; 91; 137; 180; 225; 261 |  AR2402349; OT/2024/AR2402349-4.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402349. |
| lona; 300 × 160 | 5; 25; 60; 100; 138; 158,5 | 5; 25; 60; 100; 138; 158,5 | 12,5; 45; 88; 131,5; 173,5; 216,5; 258; 289,5 |  AR2402349; OT/2024/AR2402349-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2402349 / 1 pedido(s): AR2400288. |
| lona; 300 × 180 | 13,8; 48,5; 90; 131,3; 166,5 | 13,8; 48,5; 90; 131,3; 166,5 | 2,5; 45; 88; 131,5; 173,5; 216,5; 258; 289,5 |  AR2502233; OT/2025/AR2502233.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502233. |
| lona; 300 × 190 | 8; 51; 98; 143; 183 | 8; 51; 98; 143; 183 | 12,5; 45; 88; 131,5; 173,5; 216,5; 258; 289,5 |  AR2500972; OT/2025/AR2500972.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500972. |
| lona; 310 × 150 | 7; 46; 106; 145 | 7; 46; 106; 145 | 5; 10; 45,8; 88,3; 133,3; 178; 223,3; 266; 301 |  AR2500654; OT/2025/AR2500654.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2500654, AR2505051. |
| lona; 310 × 170 | 10; 43; 86; 127; 160 | 10; 43; 86; 127; 160 | 5; 10; 52,3; 93,6; 134,9; 176,1; 217,4; 258,7; 300; 306 |  AR2405784; OT/2024/AR2405784-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405784. |
| lona; 315 × 180 | 13,8; 48,5; 90; 131,3; 166,5 | 13,8; 48,5; 90; 131,3; 166,5 | 5; 10; 57; 94,6; 136,9; 179,1; 221,4; 263,7; 306 |  AR2601016; OT/2026/AR2601016.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601016. |
| lona; 320 × 180 | 14; 48,5; 90; 131,5; 166,5 | 14; 48,5; 90; 131,5; 166,5 | 5; 24; 58,5; 99; 138,5; 178; 218,5; 258,5; 294; 315,5 |  AR2400014; OT/2024/AR2400014-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400014. |
| lona; 380 × 235 | 7,5; 38,9; 77,2; 115,6; 155,9; 196,3; 228,5 | 7,5; 38,9; 77,2; 115,6; 155,9; 196,3; 228,5 | 5; 10; 42,8; 75,6; 108,5; 141,3; 174,1; 206,7; 239,7; 272,5; 305,4; 338,2 |  AR2600281; OT/2026/AR2600281-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600281. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 202 × 115 | AR2400505 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400505.dwg; OT/2024/AR2400505.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 308,5 × 160 | AR2400781, AR2400822 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2400781.dwg; OT/2024/AR2400822.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 160 × 130 | AR2401029 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2401029.dwg; OT/2024/AR2401029.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 300 × 200 | AR2405087, AR2405177 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405087.dwg; OT/2024/AR2405087.xlsb; OT/2024/AR2405177.dwg; OT/2024/AR2405177.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 150 × 115 | AR2500379 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2500379.dwg; OT/2025/AR2500379.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 161 × 120 | AR2500559 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2500559.dwg; OT/2025/AR2500559.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 195 × 283 | AR2500862 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 270 × 130 | AR2505412 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2505412-10.xlsb; OT/2025/AR2505412-11.xlsb; OT/2025/AR2505412-12.xlsb; OT/2025/AR2505412.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 230 × 140 | AR2603632 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603632.dwg; OT/2026/AR2603632.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### TALLERES CAL, C. B. — 016573

Ficha: `talleres-cal-c-b`. Histórico: **215 líneas / 113 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por histórico (AR2604596). Nombres/alias del histórico: TALLERES CAL, C. B..

Plantillas encontradas: `PL/REMOLQUES GANADO/TALLERES CAL/REF 280 X 140.dwg`; `PL/REMOLQUES GANADO/TALLERES CAL/ref 260 x120.dwg`; `PL/TALLERES CAL2.DWG`; `PL/REMOLQUES GANADO/TALLERES CAL/AR2103811-2.dwg`; `PL/REMOLQUES GANADO/TALLERES CAL/REF 280 X 154.dwg`; `PL/REMOLQUES GANADO/TALLERES CAL/REF 280 X 130.dwg`; `PL/REMOLQUES GANADO/TALLERES CAL/ref 300x154.dwg`

TALLERES CAL2.DWG: siempre ventana; «CAMBIO LA CURVA, AHORA TIENE RADIO 8CM» y «ARCO DE 8 CM DESDE EL 14-02-19». Esta nota fechada prevalece sobre los 9 cm de REMOLQUILLEROS.doc.

El documento indica el primer lateral a 10 cm desde la esquina trasera y el resto según medidas del pedido; las cabezas se reparten entre 30 y 40 cm, próximas a 35. No se activa un reparto genérico para todos sus lados.

Reglas añadidas a la propuesta: `ventana` = {"lleva":true}; `perfil` = {"tipoPerfil":"TIPO 05","radioEsquina":8}; `bastillaEnfundar` = false.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 84 (AR2500037, AR2400461, AR2506260, AR2406479, AR2505303, AR2500610, AR2505112, AR2600269, AR2400071, AR2504986, AR2406178, AR2506374, AR2400064, AR2400673, AR2402295, AR2405130, AR2503489, AR2407077, AR2405983, AR2505688, AR2503274, AR2600669, AR2501227, AR2601018, AR2504326, AR2500010, AR2506052, AR2405711, AR2602298, AR2406195, AR2402319, AR2405521, AR2401635, AR2600027, AR2405338, AR2504722, AR2500826, AR2504358, AR2400077, AR2400701, AR2500243, AR2500107, AR2603582, AR2600810, AR2401289, AR2501548, AR2503143, AR2402801, AR2504919, AR2503227, AR2406781, AR2502022, AR2500335, AR2501420, AR2500309, AR2601761, AR2506170, AR2401060, AR2503735, AR2406760, AR2403882, AR2401241, AR2601861, AR2406914, AR2601621, AR2601461, AR2402172, AR2500859, AR2501556, AR2506435, AR2505197, AR2600295, AR2503152, AR2401758, AR2505219, AR2504854, AR2601515, AR2601672, AR2600183, AR2402401, AR2502453, AR2601270, AR2505574, AR2502276); TIPO 03: 5 (AR2503143, AR2406883, AR2504854, AR2406824, AR2600051); TIPO 02: 2 (AR2406627, AR2500335) |
| recogeDelante | NO: 83 (AR2400461, AR2506260, AR2406479, AR2404748, AR2505303, AR2500610, AR2505112, AR2400071, AR2504986, AR2406178, AR2404626, AR2506374, AR2400064, AR2400673, AR2406627, AR2405130, AR2503489, AR2407077, AR2405983, AR2505688, AR2503274, AR2600669, AR2501227, AR2601018, AR2503143, AR2504326, AR2500010, AR2506052, AR2503341, AR2602298, AR2406195, AR2402319, AR2405711, AR2405521, AR2401635, AR2406883, AR2600027, AR2405338, AR2504722, AR2500826, AR2504358, AR2400077, AR2400701, AR2500107, AR2603582, AR2600810, AR2504854, AR2401289, AR2501548, AR2402801, AR2504919, AR2503227, AR2406781, AR2502022, AR2500335, AR2500309, AR2601761, AR2506170, AR2401060, AR2503735, AR2402295, AR2406760, AR2403882, AR2401241, AR2601861, AR2601621, AR2600269, AR2601461, AR2402172, AR2501556, AR2506435, AR2505197, AR2503152, AR2401758, AR2505219, AR2601515, AR2600051, AR2600183, AR2402401, AR2502453, AR2601270, AR2505574, AR2502276); CREMALLERA: 17 (AR2500037, AR2600269, AR2402295, AR2405711, AR2403642, AR2500243, AR2400673, AR2500335, AR2501420, AR2406914, AR2500859, AR2406824, AR2404748, AR2600295, AR2504919, AR2601672, AR2501556) |
| recogeAtras | GOMA: 83 (AR2400461, AR2506260, AR2406479, AR2404748, AR2505303, AR2500610, AR2505112, AR2400071, AR2504986, AR2406178, AR2404626, AR2506374, AR2400064, AR2400673, AR2402295, AR2406627, AR2405130, AR2503489, AR2407077, AR2405983, AR2505688, AR2503274, AR2600669, AR2501227, AR2601018, AR2503143, AR2504326, AR2500010, AR2506052, AR2503341, AR2602298, AR2406195, AR2402319, AR2405711, AR2405521, AR2401635, AR2406883, AR2600027, AR2405338, AR2504722, AR2500826, AR2504358, AR2400077, AR2400701, AR2500107, AR2603582, AR2600810, AR2504854, AR2401289, AR2501548, AR2402801, AR2504919, AR2503227, AR2406781, AR2502022, AR2500335, AR2500309, AR2601761, AR2506170, AR2401060, AR2503735, AR2406760, AR2403882, AR2401241, AR2601861, AR2601621, AR2600269, AR2601461, AR2402172, AR2501556, AR2506435, AR2505197, AR2503152, AR2401758, AR2505219, AR2601515, AR2600051, AR2600183, AR2402401, AR2502453, AR2601270, AR2505574, AR2502276); CREMALLERA: 16 (AR2500037, AR2600269, AR2405711, AR2403642, AR2500243, AR2400673, AR2500335, AR2501420, AR2406914, AR2500859, AR2406824, AR2600295, AR2504919, AR2601672, AR2404748, AR2501556); NO: 1 (AR2404748) |
| bastillaEnfundar | NO: 81 (AR2500037, AR2400461, AR2506260, AR2406479, AR2404748, AR2505303, AR2500610, AR2505112, AR2600269, AR2400071, AR2504986, AR2406178, AR2404626, AR2506374, AR2400064, AR2400673, AR2402295, AR2406627, AR2503489, AR2407077, AR2405983, AR2505688, AR2600669, AR2501227, AR2601018, AR2503143, AR2504326, AR2500010, AR2506052, AR2405711, AR2503341, AR2602298, AR2406195, AR2405521, AR2406883, AR2600027, AR2405338, AR2504722, AR2500826, AR2504358, AR2400077, AR2400701, AR2500243, AR2500107, AR2405130, AR2603582, AR2600810, AR2504854, AR2501548, AR2402801, AR2504919, AR2503227, AR2500335, AR2501420, AR2500309, AR2601761, AR2506170, AR2401060, AR2503735, AR2403882, AR2601861, AR2406914, AR2601621, AR2601461, AR2402172, AR2500859, AR2501556, AR2506435, AR2505197, AR2600295, AR2503152, AR2502022, AR2505219, AR2601515, AR2601672, AR2600051, AR2600183, AR2502453, AR2601270, AR2505574, AR2502276); SÍ: 6 (AR2405130, AR2503274, AR2402319, AR2403642, AR2502022, AR2400461) |
| ventana | SÍ: 77 (AR2400461, AR2406479, AR2404748, AR2505303, AR2500610, AR2505112, AR2400071, AR2406178, AR2404626, AR2506374, AR2400064, AR2400673, AR2504986, AR2402295, AR2406627, AR2405130, AR2503489, AR2407077, AR2505688, AR2503274, AR2600669, AR2501227, AR2503143, AR2504326, AR2500010, AR2506052, AR2503341, AR2406195, AR2602298, AR2402319, AR2405711, AR2405521, AR2401635, AR2600027, AR2405338, AR2504722, AR2500826, AR2504358, AR2400077, AR2500107, AR2603582, AR2600810, AR2504854, AR2401289, AR2501548, AR2402801, AR2504919, AR2503227, AR2406781, AR2502022, AR2500335, AR2500309, AR2601761, AR2506170, AR2401060, AR2503735, AR2403882, AR2401241, AR2601861, AR2601621, AR2600269, AR2601461, AR2402172, AR2501556, AR2505197, AR2503152, AR2401758, AR2505219, AR2601515, AR2601672, AR2600051, AR2600183, AR2402401, AR2502453, AR2601270, AR2505574, AR2502276); NO: 28 (AR2500037, AR2506260, AR2600269, AR2504986, AR2405983, AR2601018, AR2405711, AR2602298, AR2400064, AR2406883, AR2403642, AR2400701, AR2501227, AR2500243, AR2400673, AR2500335, AR2501420, AR2406760, AR2406914, AR2500859, AR2406824, AR2506435, AR2505303, AR2404748, AR2600295, AR2504919, AR2503735, AR2501556) |
| rotulacion | SI: 69 (AR2400461, AR2505303, AR2500610, AR2505112, AR2600269, AR2504986, AR2506374, AR2503489, AR2407077, AR2505688, AR2503274, AR2600669, AR2501227, AR2601018, AR2503143, AR2504326, AR2500010, AR2506052, AR2503341, AR2602298, AR2404626, AR2401635, AR2406883, AR2504722, AR2500826, AR2504358, AR2400077, AR2500243, AR2500107, AR2603582, AR2600810, AR2504854, AR2401289, AR2501548, AR2504919, AR2503227, AR2500335, AR2406781, AR2502022, AR2501420, AR2500309, AR2601761, AR2506170, AR2503735, AR2406760, AR2600027, AR2401241, AR2601861, AR2406914, AR2601621, AR2601461, AR2402172, AR2500859, AR2406824, AR2501556, AR2506435, AR2505197, AR2600295, AR2503152, AR2401758, AR2505219, AR2601515, AR2601672, AR2600051, AR2600183, AR2402401, AR2502453, AR2601270, AR2505574); SÍ: 15 (AR2500037, AR2406479, AR2404748, AR2406178, AR2404626, AR2406627, AR2405983, AR2405711, AR2406195, AR2405521, AR2405338, AR2403642, AR2402801, AR2403882, AR2603582); TALLERES CAL: 6 (AR2400673, AR2402295, AR2405130, AR2402319, AR2400701, AR2401060); NO: 2 (AR2506260, AR2600810); SÍ : 2 (AR2400071, AR2400064); si: 1 (AR2600027); sí: 1 (AR2502276) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 30 (AR2400461, AR2506260, AR2406479, AR2404748, AR2404626, AR2400673, AR2503143, AR2402319, AR2405521, AR2401635, AR2600027, AR2500107, AR2600810, AR2503227, AR2500309, AR2601761, AR2506170, AR2401060, AR2503735, AR2405711, AR2600269, AR2500859, AR2501556, AR2505197, AR2500610, AR2405338, AR2503489, AR2504326, AR2502453, AR2407077); LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 23 (AR2506374, AR2503489, AR2505688, AR2601018, AR2505303, AR2504326, AR2506052, AR2503341, AR2602298, AR2504722, AR2504358, AR2603582, AR2504854, AR2601761, AR2600027, AR2601621, AR2505197, AR2601461, AR2505219, AR2600051, AR2503735, AR2502276, AR2501556); LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 20 (AR2504986, AR2503274, AR2602298, AR2405711, AR2500243, AR2406178, AR2600810, AR2401289, AR2406479, AR2407077, AR2501420, AR2406760, AR2601761, AR2601861, AR2406914, AR2601461, AR2402172, AR2601515, AR2600183, AR2601270); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 13 (AR2406627, AR2406883, AR2405338, AR2400701, AR2405130, AR2500335, AR2404626, AR2400071, AR2401758, AR2402172, AR2405711, AR2404748, AR2400461); LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 12 (AR2500037, AR2500610, AR2402295, AR2407077, AR2406195, AR2400064, AR2406781, AR2502022, AR2603582, AR2406824, AR2405711, AR2400516); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 12 (AR2506260, AR2405711, AR2602298, AR2500826, AR2501548, AR2402801, AR2500335, AR2401241, AR2506435, AR2404748, AR2503152, AR2404626); LONA ALPHA 1L 580 :VERDE RAL6024 :250 AN: 11 (AR2400071, AR2405130, AR2405983, AR2501227, AR2405711, AR2403642, AR2400461, AR2403882, AR2401635, AR2502022, AR2402401); LONA STARPLUS 1L 610  :ROJO RAL3002 :250 AN: 5 (AR2404748, AR2406178, AR2400071, AR2500010, AR2406479); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 4 (AR2505112, AR2504986, AR2601672, AR2501227); LONA ALPHA 1L 580: AZUL RAL5015: 220 AN: 3 (AR2400064, AR2400077, AR2400071); LONA ALPHA 1L 580  :NEGRO :250 AN: 3 (AR2503143, AR2504326, AR2506374); LONA STARPLUS 1L 610 : AZUL EUROPA R-073 : 250 AN ( 580 ): 2 (AR2600669, AR2600295); LONA NS86 2L 630GR [580] : AZUL CLARO (SIMILAR 5015 ): 250AN: 1 (AR2505303); LONA STARPLUS 1L 610 : AZUL EUROPA R-073: 250 ANC ( 580 ): 1 (AR2600269); LONA NS86 2L 630GR  [580]: AZUL CLARO 5015 : 250 AN: 1 (AR2505688); LONA G650 2L 650 :NEGRO :250 AN (M5734): 1 (AR2501227); LONA MONZA 1 L 580 G/M2: BURDEOS RAL3005 : 250 AN: 1 (AR2504919); LONA MONZA 1L 580 G/M2: ROJO RAL 3020 : 250 ANCH: 1 (AR2600669); LONA NS86 2L 630GR [580]: ROJO (COR/400): 250 AN: 1 (AR2505688); LONA ALPHA 1L 580 :NARANJA RAL2004 :250 AN: 1 (AR2501466); LONA NS86 2L 630GR [580]: BLANCO : 250 AN: 1 (AR2504919); LONA G650 2L 650 :AZUL RAL5015 :250 AN (M5729): 1 (AR2501227); LONA MONZA 1L 580 GR ROJO RAL 3020 250AN: 1 (AR2505574) |
| modo | SEGUN SE INDICA: 88 (AR2500037, AR2400461, AR2404748, AR2505303, AR2500610, AR2505112, AR2600269, AR2400071, AR2504986, AR2406178, AR2404626, AR2506374, AR2400064, AR2400673, AR2402295, AR2406627, AR2405130, AR2503489, AR2405983, AR2505688, AR2503274, AR2501227, AR2601018, AR2503143, AR2504326, AR2500010, AR2506052, AR2405711, AR2503341, AR2602298, AR2406195, AR2402319, AR2405521, AR2401635, AR2406883, AR2600027, AR2405338, AR2403642, AR2504722, AR2500826, AR2504358, AR2400077, AR2400701, AR2500243, AR2500107, AR2603582, AR2600810, AR2504854, AR2401289, AR2501548, AR2402801, AR2504919, AR2503227, AR2500335, AR2406781, AR2501420, AR2500309, AR2601761, AR2506170, AR2401060, AR2503735, AR2406760, AR2403882, AR2401241, AR2601861, AR2406914, AR2601621, AR2601461, AR2402172, AR2500859, AR2406824, AR2501556, AR2501466, AR2506435, AR2505197, AR2600295, AR2503152, AR2505219, AR2601515, AR2601672, AR2600051, AR2600183, AR2402401, AR2502453, AR2601270, AR2505574, AR2400516, AR2502276); REPARTIDOS: 6 (AR2506260, AR2406479, AR2407077, AR2600669, AR2502022, AR2401758) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 250 × 155 | 2,5; 32,7; 62,9; 93,1; 123,3; 153,5 | 2,5; 32,7; 62,9; 93,1; 123,3; 153,5 | 2,5; 10; 50,5; 100,5; 150,5; 200,5; 241; 248,5 |  AR2400516; OT/2024/AR2400516.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400516. |
| baqueton; 260 × 165 | 10,5; 46,8; 83; 119,3; 155,5 | 2,5; 34,7; 66,9; 99,1; 131,3; 163,5 | 2,5; 10; 43,5; 87; 130,5; 174; 217,5; 251; 258,5 |  AR2501466; OT/2025/AR2501466.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501466. |
| lona; 140 × 113 | 2,5; 39,7; 74,3; 109 | 2,5; 39,7; 74,3; 109 | 2,5; 10; 46; 92; 131; 138,5 |  AR2406760; OT/2024/AR2406760.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406760. |
| lona; 150 × 113 | 2,5; 38,8; 75,2; 111,5 | 2,5; 38,8; 75,2; 111,5 | 2,5; 10; 50; 100; 141; 148,5 |  AR2505303; OT/2025/AR2505303-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505303. |
| lona; 160 × 110 | 10; 37; 74; 100 | 10; 37; 74; 100 | 10,5; 32,5; 64,5; 96,5; 128,5; 150,5 |  AR2601621; OT/2026/AR2601621.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601621. |
| lona; 170 × 123 | 5,5; 43,2; 80,8; 118,5 | 5,5; 43,2; 80,8; 118,5 | 2,5; 10; 57; 114; 161; 168,5 |  AR2405983; OT/2024/AR2405983.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405983. |
| lona; 180 × 124 | 2,5; 32,5; 62,5; 92,5; 122,5 | 2,5; 32,5; 62,5; 92,5; 122,5 | 2,5; 10; 60; 120; 171; 178,5 |  AR2504986; OT/2025/AR2504986.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504986. |
| lona; 185 × 123 | 5,5; 43,2; 80,8; 118,5 | 5,5; 43,2; 80,8; 118,5 | 2,5; 10; 61,5; 123; 176; 183,5 |  AR2405521; OT/2024/AR2405521-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405521. |
| lona; 199 × 122 | 5; 43; 80,5; 118 | 5; 43; 80,5; 118 | 2,5; 10; 66; 132; 190; 197,5 |  AR2400461; OT/2024/AR2400461-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400461. |
| lona; 200 × 122 | 5; 42,7; 80,3; 118 | 5; 42,7; 80,3; 118 | 2,5; 10; 55,3; 100,5; 145,8; 191; 198,5 |  AR2404748; OT/2024/AR2404748-13.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2404748 / 1 pedido(s): AR2404626 / 1 pedido(s): AR2400673. |
| lona; 200 × 123 | 5; 43; 81; 119 | 5; 43; 81; 119 | 2,5; 10; 50; 100; 150; 191; 198,5 |  AR2500309; OT/2025/AR2500309.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500309. |
| lona; 200 × 125 | 2,5; 32,8; 63; 93,3; 123,5 | 2,5; 32,8; 63; 93,3; 123,5 | 2,5; 10; 28; 56; 84; 112; 140; 168; 191; 198,5 |  AR2600051; OT/2026/AR2600051.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2600051 / 1 pedido(s): AR2502453. |
| lona; 200 × 133 | 5; 36; 67; 98; 129 | 5; 36; 67; 98; 129 | 2,5; 10; 50; 100; 150; 191; 198,5 |  AR2501227; OT/2025/AR2501227.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501227. |
| lona; 222 × 134 | 2,5; 35; 67,5; 100; 132,5 | 2,5; 35; 67,5; 100; 132,5 | 2,5; 10; 55,8; 111,5; 167,3; 213; 220,5 |  AR2504919; OT/2025/AR2504919-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504919. |
| lona; 224 × 133 | 5; 36; 67; 98; 129 | 5; 36; 67; 98; 129 | 2,5; 10; 56; 112; 168; 215; 222,5 |  AR2602298; OT/2026/AR2602298-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602298. |
| lona; 225 × 122 | 5; 42,7; 80,3; 118 | 5; 42,7; 80,3; 118 | 2,8; 10; 56,5; 112,5; 168,5; 216; 223,5 |  AR2401289; OT/2024/AR2401289.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401289. |
| lona; 225 × 132 | 5; 35,8; 66,5; 97,2; 128 | 5; 35,8; 66,5; 97,2; 128 | 2,5; 10; 56; 112; 168; 216; 223,5 |  AR2403882; OT/2024/AR2403882.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2403882 / 1 pedido(s): AR2400071. |
| lona; 225 × 133 | 5; 36; 67; 98; 129 | 5; 36; 67; 98; 129 | 2,5; 10; 56; 112; 168; 216; 223,5 |  AR2500243; OT/2025/AR2500243-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 6 pedido(s): AR2500243, AR2503489, AR2505112, AR2505197, AR2505219, AR2602298 / 2 pedido(s): AR2406781, AR2601461 / 1 pedido(s): AR2602298 / 1 pedido(s): AR2600810 / 1 pedido(s): AR2505688 / 1 pedido(s): AR2503227. |
| lona; 225 × 134 | 2,5; 35; 67,5; 100; 132,5 | 2,5; 35; 67,5; 100; 132,5 | 2,5; 10; 56; 112; 168; 216; 223,5 |  AR2506260; OT/2025/AR2506260.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2506260 / 1 pedido(s): AR2501556. |
| lona; 225 × 142 | 5,2; 38,5; 71,1; 105; 138,2 | 5,2; 38,5; 71,1; 105; 138,2 | 2,5; 10; 20,5; 50,5; 88,5; 136,5; 175,5; 210,5; 216; 223,5 |  AR2400064; OT/2024/AR2400064.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400064. |
| lona; 225 × 143 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 10; 56; 112; 168; 216; 223,5 |  AR2600027; OT/2026/AR2600027-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2500335, AR2504722 / 1 pedido(s): AR2600027 / 1 pedido(s): AR2504358 / 1 pedido(s): AR2500107 / 1 pedido(s): AR2605157. |
| lona; 230 × 132 | 5; 35,8; 66,5; 97,3; 128 | 5; 35,8; 66,5; 97,3; 128 | 5; 10; 33; 66; 99; 132; 165; 198; 221; 226 |  AR2500826; OT/2025/AR2500826.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500826. |
| lona; 230 × 145 | 5; 39; 73; 107; 141 | 5; 39; 73; 107; 141 | 2,5; 10; 57,5; 115; 172; 221; 228,5 |  AR2501548; OT/2025/AR2501548.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501548. |
| lona; 230 × 157 | 5; 42; 79; 116; 153 | 5; 42; 79; 116; 153 | 2,5; 10; 57; 115; 173; 221; 228,5 |  AR2400077; OT/2024/AR2400077.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400077. |
| lona; 239 × 161 | 5; 42,8; 81; 119,3; 157 | 5; 42,8; 81; 119,3; 157 | 0,5; 10; 60; 120; 180; 230; 237,5 |  AR2601672; OT/2026/AR2601672.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601672. |
| lona; 240 × 140 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 10; 30; 60; 90; 120; 150; 180; 210; 231; 238,5 |  AR2600669; OT/2026/AR2600669-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600669. |
| lona; 240 × 143 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 10; 48; 96; 142; 186; 231; 238,5 |  AR2501227; OT/2025/AR2501227-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501227. |
| lona; 250 × 140 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 10; 50; 100; 151; 201; 241; 248,5 |  AR2503143; OT/2025/AR2503143.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503143. |
| lona; 250 × 142 | 5; 38,3; 71,5; 104,8; 138 | 5; 38,3; 71,5; 104,8; 138 | 2,5; 10; 50; 100; 150; 200; 243; 248,5 |  AR2405338; OT/2024/AR2405338-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2401635, AR2405338 / 2 pedido(s): AR2402172, AR2405130 / 1 pedido(s): AR2404748 / 1 pedido(s): AR2404626 / 1 pedido(s): AR2402401 / 1 pedido(s): AR2402295 / 1 pedido(s): AR2401758 / 1 pedido(s): AR2401241 / 1 pedido(s): AR2400071 / 1 pedido(s): AR2400064. |
| lona; 250 × 143 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 10; 50; 100; 150; 200; 241; 248,5 |  AR2600669; OT/2026/AR2600669-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 15 pedido(s): AR2501227, AR2501420, AR2503341, AR2504326, AR2504986, AR2505303, AR2506052, AR2506374, AR2600027, AR2600183, AR2600269, AR2600669, AR2601515, AR2601761, AR2601861 / 4 pedido(s): AR2500037, AR2500243, AR2500610, AR2500859 / 2 pedido(s): AR2407077, AR2601461 / 2 pedido(s): AR2503489, AR2503735 / 2 pedido(s): AR2405521, AR2405711 / 1 pedido(s): AR2505688 / 1 pedido(s): AR2503143 / 1 pedido(s): AR2406479 / 1 pedido(s): AR2406178. |
| lona; 250 × 156 | 5; 42; 78,5; 115,5; 152 | 5; 42; 78,5; 115,5; 152 | 2,5; 10; 23; 63; 93; 150; 190; 230; 241; 248,5 |  AR2400701; OT/2024/AR2400701.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400701. |
| lona; 254 × 160 | 5; 42,8; 80,5; 118,3; 156 | 5; 42,8; 80,5; 118,3; 156 | 2,5; 10; 50,5; 101; 151,5; 202; 245; 252,5 |  AR2501556; OT/2025/AR2501556.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501556. |
| lona; 257 × 143 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 10; 64; 128; 193; 248; 255,5 |  AR2600027; OT/2026/AR2600027-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600027. |
| lona; 258 × 158 | 5; 42,5; 79,5; 117; 154 | 5; 42,5; 79,5; 117; 154 | 2,5; 10; 51,5; 103; 154,5; 206; 249; 256,5 |  AR2402295; OT/2024/AR2402295-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402295. |
| lona; 260 × 142 | 5; 38,3; 71,5; 104,8; 138 | 5; 38,3; 71,5; 104,8; 138 | 2,5; 10; 52; 104; 156; 208; 251; 258,5 |  AR2500010; OT/2025/AR2500010.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2500010 / 1 pedido(s): AR2404748. |
| lona; 260 × 143 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 10; 52; 104; 156; 208; 251; 258,5 |  AR2505574; OT/2025/AR2505574.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2504326, AR2505574 / 1 pedido(s): AR2502022 / 1 pedido(s): AR2406178. |
| lona; 260 × 155 | 2,5; 32,7; 62,9; 93,1; 123,3; 153,5 | 2,5; 32,7; 62,9; 93,1; 123,3; 153,5 | 2,5; 10; 52; 104; 156; 208; 251; 258,5 |  AR2603582; OT/2026/AR2603582-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2603582 / 1 pedido(s): AR2406195. |
| lona; 260 × 157 | 2,5; 33,1; 63,7; 94,3; 124,9; 155,5 | 2,5; 33,1; 63,7; 94,3; 124,9; 155,5 | 2,5; 10; 52; 104; 156; 208; 251; 258,5 |  AR2603582; OT/2026/AR2603582-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2504326, AR2603582 / 1 pedido(s): AR2504919. |
| lona; 260 × 158 | 5; 42,3; 79,5; 116,8; 154 | 5; 42,3; 79,5; 116,8; 154 | 2,5; 10; 67; 130; 194; 251; 258,5 |  AR2601018; OT/2026/AR2601018-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601018. |
| lona; 260 × 162 | 5; 43,3; 81,5; 119,8; 158 | 5; 43,3; 81,5; 119,8; 158 | 2,5; 10; 52; 104; 156; 208; 251; 258,5 |  AR2406914; OT/2024/AR2406914.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406914. |
| lona; 261 × 155 | 5; 41,5; 78; 114,5; 151 | 5; 41,5; 78; 114,5; 151 | 2,5; 10; 43,5; 87; 130,5; 174; 217,5; 252; 259,5 |  AR2400461; OT/2024/AR2400461-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400461. |
| lona; 261 × 156 | 5; 41,3; 78,5; 115,8; 152 | 5; 41,3; 78,5; 115,8; 152 | 2,5; 10; 52; 104; 156; 208; 254; 258,5 |  AR2404626; OT/2024/AR2404626-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404626. |
| lona; 261 × 162 | 5; 43,3; 81,5; 119,8; 158 | 5; 43,3; 81,5; 119,8; 158 | 2,5; 10; 62,5; 114,5; 166,5; 218,5; 252; 259,5 |  AR2404748; OT/2024/AR2404748-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2404748 / 1 pedido(s): AR2404626 / 1 pedido(s): AR2401635. |
| lona; 261 × 163 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 10; 65; 130; 195; 252; 259,5 |  AR2506260; OT/2025/AR2506260-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2506260 / 1 pedido(s): AR2601270. |
| lona; 263 × 162 | 5; 43,5; 81,5; 120; 158 | 5; 43,5; 81,5; 120; 158 | 2,5; 10; 65; 130; 195; 254; 261,5 |  AR2400673; OT/2024/AR2400673-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400673. |
| lona; 263 × 163 | 26,5; 63,5; 100,5; 137,5 | 26,5; 63,5; 100,5; 137,5 | 2,5; 10; 65; 131; 196; 254; 261,5 |  AR2504854; OT/2025/AR2504854-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2504854 / 1 pedido(s): AR2502022. |
| lona; 265 × 134,5 | 5,5; 36,4; 67,8; 99,1; 130 | 5,5; 36,4; 67,8; 99,1; 130 | 2,5; 10; 30; 60; 90; 120; 150; 180; 210; 240; 256; 263,5 |  AR2405711; OT/2024/AR2405711-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405711. |
| lona; 270 × 140 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 10; 54; 108; 162; 216; 261; 268,5 |  AR2506170; OT/2025/AR2506170.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506170. |
| lona; 270 × 142 | 5; 38,3; 71,5; 104,8; 138 | 5; 38,3; 71,5; 104,8; 138 | 2,5; 10; 54; 108; 162; 216; 268,5 |  AR2405338; OT/2024/AR2405338-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405338. |
| lona; 270 × 143 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 10; 54; 108; 162; 216; 260; 268,5 |  AR2605157; OT/2026/AR2605157.pdf; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2605157 / 1 pedido(s): AR2502276. |
| lona; 270 × 155 | 5; 41,5; 78; 114,5; 151 | 5; 41,5; 78; 114,5; 151 | 2,5; 10; 54; 108; 162; 216; 268,5 |  AR2506435; OT/2025/AR2506435.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2506435 / 1 pedido(s): AR2506374. |
| lona; 270 × 157 | 5; 42; 79; 116; 153 | 5; 42; 79; 116; 153 | 2,5; 10; 54,5; 108,5; 162,5; 216,5; 263; 268 |  AR2400071; OT/2024/ar2400071-16.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400071. |
| lona; 271 × 163 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 10; 67; 135; 202; 262; 269,5 |  AR2506374; OT/2025/AR2506374-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506374. |
| lona; 272 × 163 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 10; 68; 136; 204; 263; 270,5 |  AR2505197; OT/2025/AR2505197-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505197. |
| lona; 274 × 180 | 2,5; 32,3; 63; 93,8; 123,5; 178,5 | 2,5; 32,3; 63; 93,8; 123,5; 178,5 | 2,5; 12,5; 37,8; 74,2; 110,5; 146,8; 183,2; 218,5 |  AR2600295; OT/2026/AR2600295.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600295. |
| lona; 279 × 159 | 5; 42,5; 80; 117,5; 155 | 5; 42,5; 80; 117,5; 155 | 2,5; 10; 62; 114; 166; 218; 270; 277,5 |  AR2407077; OT/2024/AR2407077-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2407077. |
| lona; 280 × 157 | 5; 34,6; 64,2; 93,8; 123,4; 153 | 5; 34,6; 64,2; 93,8; 123,4; 153 | 2,5; 10; 56; 112; 168; 224; 271; 278,5 |  AR2500610; OT/2025/AR2500610-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500610. |
| lona; 297 × 162 | 4,8; 44,4; 81,5; 118,6; 158,2 | 4,8; 44,4; 81,5; 118,6; 158,2 | 2,5; 10; 58; 116; 174; 232; 288; 295,5 |  AR2402801; OT/2024/AR2402801.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402801. |
| lona; 300 × 155 | 2,5; 10; 40,3; 78; 115,8; 146; 153,5 | 2,5; 10; 40,3; 78; 115,8; 146; 153,5 | 2,5; 10; 60; 120; 180; 240; 291; 298,5 |  AR2600810; OT/2026/AR2600810.xlsb / LONA REMOLQUE 0225623, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600810. |
| lona; 300 × 157 | 2,5; 33,1; 63,7; 94,3; 124,9; 155,5 | 2,5; 33,1; 63,7; 94,3; 124,9; 155,5 | 2,5; 10; 50; 100; 150,5; 201; 251; 291; 298,5 |  AR2503152; OT/2025/AR2503152.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503152. |
| lona; 300 × 158 | 5; 42,5; 79,5; 117; 154 | 5; 42,5; 79,5; 117; 154 | 2,5; 10; 50; 100; 150; 200; 250; 291; 298,5 |  AR2402319; OT/2024/AR2402319.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402319. |
| lona; 300 × 160 | 2,5; 33,7; 65,9; 96,1; 127,3; 158,5 | 2,5; 33,7; 65,9; 96,1; 127,3; 158,5 | 2,5; 10; 60; 120; 181; 241; 291; 298,5 |  AR2503143; OT/2025/AR2503143-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503143. |
| lona; 300 × 161 | 5; 35,4; 65,8; 96,2; 126,6; 157 | 5; 35,4; 65,8; 96,2; 126,6; 157 | 2,5; 10; 37,5; 75; 112,5; 150; 187,5; 225; 262,5; 291; 298,5 |  AR2500335; OT/2025/AR2500335-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500335. |
| lona; 313 × 162 | 5; 43,3; 81,5; 119,8; 158 | 5; 43,3; 81,5; 119,8; 158 | 2,5; 10; 52; 104; 156; 208; 260; 304; 311,5 |  AR2405130; OT/2024/AR2405130-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2403642, AR2405130. |
| lona; 313 × 163 | 5; 43,8; 82; 120,3; 159 | 5; 43,8; 82; 120,3; 159 | 2,5; 10; 68,8; 127,6; 186,4; 245,2; 304; 311,5 |  AR2502022; OT/2025/AR2502022-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502022. |
| lona; 313 × 173 | 5; 37,8; 70,6; 103,4; 136,2; 169 | 5; 37,8; 70,6; 103,4; 136,2; 169 | 2,5; 10; 62; 124; 186; 248; 304; 311,5 |  AR2503274; OT/2025/AR2503274.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503274. |
| lona; 315 × 162 | 5; 43,5; 81,5; 120; 158 | 5; 43,5; 81,5; 120; 158 | 2,5; 10; 62,5; 125; 187,5; 250; 306; 313,5 |  AR2400461; OT/2024/AR2400461-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400461. |
| lona; 350 × 175 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 | 2,5; 10; 39; 78; 117; 156; 195; 234; 273; 312; 341; 348,5 |  AR2406824; OT/2024/AR2406824.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406824. |
| lona; 355 × 167 | 5; 57,7; 110,3; 163 | 5; 57,7; 110,3; 163 | 2,5; 10; 38; 90; 136; 185; 230; 275; 320; 346; 353,5 |  AR2406883; OT/2024/AR2406883.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406883. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 258 × 156 | AR2401060 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2401060-10.xlsb; OT/2024/AR2401060-11.xlsb; OT/2024/AR2401060.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 280 × 140 | AR2401732 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2401732.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 280 × 154 | AR2401758 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2401758.dwg; OT/2024/AR2401758.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 250 × 159 | AR2403642 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2403642-10.xlsb; OT/2024/AR2403642-11.xlsb; OT/2024/AR2403642.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 275 × 155 | AR2404748 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404748-10.xlsb; OT/2024/AR2404748-11.xlsb; OT/2024/AR2404748-12.xlsb; OT/2024/AR2404748-13.xlsb; OT/2024/AR2404748-14.xlsb; OT/2024/AR2404748.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 322 × 160 | AR2405338 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2405338-10.xlsb; OT/2024/AR2405338-11.xlsb; OT/2024/AR2405338.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 280 × 155 | AR2405521, AR2505898, AR2506199 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2405521-11.xlsb; OT/2024/AR2405521-12.xlsb; OT/2024/AR2405521.dwg; OT/2025/AR2505898.dwg; OT/2025/AR2506199.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 251 × 141 | AR2406627 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2406627.dwg; OT/2024/AR2406627.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 188 × 149,5 | AR2406732 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 275 × 160 | AR2501383 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501383.dwg; OT/2025/AR2501383.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 200 × 115 | AR2504854 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2504854-10.xlsb; OT/2025/AR2504854-11.xlsb; OT/2025/AR2504854.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 250 × 143 | AR2506052 | Modelo de ganado; fuera de FichaCliente. OT/2025/AR2506052.dwg; OT/2025/AR2506052.xlsb; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 250 × 177 | AR2601018 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601018-10.xlsb; OT/2026/AR2601018-11.xlsb; OT/2026/AR2601018.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 160 × 110 | AR2601621 | Modelo de ganado; fuera de FichaCliente. OT/2026/AR2601621.dwg; OT/2026/AR2601621.xlsb; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 248 × 173 | AR2602458 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602458.dwg; OT/2026/AR2602458.xlsm; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 152 × 113 | AR2604132 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604132.dwg; OT/2026/AR2604132.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 258 × 163 | AR2604286 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604286.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### HIJOS DE PEDRO LOPEZ GARCIA, S. L. — 001300

Ficha: `hijos-de-pedro-lopez`. Histórico: **169 líneas / 154 pedidos**. PDF producidos adicionales examinados: 5. Registro vigente versión 8, conservado.

Código acreditado por histórico (AR2604609). Nombres/alias del histórico: HIJOS DE PEDRO LOPEZ GARCIA, S. L..

Plantillas encontradas: `PL/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES HIJOS DE PEDRO LOPEZ(CM) DELANTE Y ATRAS.xls`; `PL/CALCULOS REMOLQUES/BAQUETÓN (HIJOS DE PEDRO LOPEZ).xls`; `PL/HIJOS DE PEDRO LOPEZ/HIJOS DE PEDRO LOPEZ2.DWG`; `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUES PUENTES HIJOS DE PEDRO LOPEZ(CM).xls`; `PL/HIJOS DE PEDRO LOPEZ/HIJOS DE PEDRO LOPEZ.DWG`; `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES HIJOS DE PEDRO LOPEZ(CM) DELANTE Y ATRAS.xls`; `PL/HIJOS DE PEDRO LOPEZ/RECOGE CON GANCHOS CORAZÓN.dwg`; `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUES PUENTES HIJOS DE PEDRO LOPEZ(CM)2.xls`; `PL/CALCULOS REMOLQUES/REMOLQUES PUENTES HIJOS DE PEDRO LOPEZ(CM).xls`; `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/BAQUETÓN (HIJOS DE PEDRO LOPEZ).xls`

Conservadas sus demasías de baquetón, recogida propia con puentes, sesgo trasero de 1,5 cm, rotulación y las cuatro medidas vigentes.

OLLAOS REMOLQUES.doc los incluye en repartidos, con excepciones por medida. Los datos de puentes y sesgo están también en docs/remolques/cierres-y-acabados.md. La ficha conserva las medidas exactas antes de recurrir al reparto genérico.

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `ventana` = {"lleva":false}.

Campos vigentes que se respetan: `extrasBaqueton` = {"extraLargoCostura":11,"extraAnchoCostura":2,"extraBaquetonLargoDelante":1,"extraBaquetonLargoDetras":11,"extraLargoFinal":0,"extraAnchoFinal":0,"extraBaquetonTrasero":10,"observaciones":["ABIERTO EN LA PARTE TRASERA (REFORZAR)"]}; `recogidaPropia` = {"nombre":"PUENTES HIJOS DE PEDRO LOPEZ","delante":42.5,"atras":42.5,"lateralSoloAtras":11.5,"lateralSoloDelante":9,"panoTraseroConAnchoDelante":true}; `recogeAtras` = "PUENTES HIJOS DE PEDRO LOPEZ"; `recogeDelante` = "NO"; `bastillaEnfundar` = false; `rotulacion` = true; `sesgoDetras` = 1.5.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 34 (AR2401369, AR2500415, AR2406762, AR2403022, AR2500835, AR2602990, AR2504036, AR2505776, AR2401864, AR2600005, AR2406256, AR2404054, AR2503961, AR2400756, AR2500996, AR2406784, AR2405640, AR2503522, AR2401572, AR2502368, AR2403278, AR2501391, AR2400543, AR2400554, AR2400205, AR2506129, AR2505467, AR2503054, AR2600136, AR2506051, AR2400504, AR2402665, AR2402389, AR2600488); TIPO 01: 7 (AR2601766, AR2505949, AR2506268, AR2500071, AR2500070, AR2602230, AR2401766); TIPO 05: 3 (AR2403277, AR2403259, AR2406670) |
| recogeDelante | NO: 45 (AR2403277, AR2500415, AR2405223, AR2406762, AR2403022, AR2500835, AR2602990, AR2601766, AR2504036, AR2505776, AR2401864, AR2505949, AR2600005, AR2406256, AR2403179, AR2404054, AR2506268, AR2503961, AR2400756, AR2403259, AR2500996, AR2406784, AR2405640, AR2500071, AR2503522, AR2401572, AR2502368, AR2403278, AR2501391, AR2400543, AR2400554, AR2400205, AR2506129, AR2505467, AR2503054, AR2500070, AR2406670, AR2600136, AR2602230, AR2506051, AR2400504, AR2402665, AR2402389, AR2401766, AR2600488); PUENTES HIJOS DE PEDRO LOPEZ: 1 (AR2401369) |
| recogeAtras | PUENTES HIJOS DE PEDRO LOPEZ: 45 (AR2401369, AR2403277, AR2500415, AR2405223, AR2406762, AR2403022, AR2500835, AR2602990, AR2601766, AR2504036, AR2505776, AR2401864, AR2505949, AR2600005, AR2406256, AR2404054, AR2506268, AR2503961, AR2400756, AR2403259, AR2500996, AR2406784, AR2405640, AR2500071, AR2503522, AR2401572, AR2502368, AR2403278, AR2501391, AR2400543, AR2400554, AR2400205, AR2506129, AR2505467, AR2503054, AR2500070, AR2406670, AR2600136, AR2602230, AR2506051, AR2400504, AR2402665, AR2402389, AR2401766, AR2600488); GOMA: 1 (AR2403179) |
| bastillaEnfundar | NO: 38 (AR2401369, AR2403277, AR2500415, AR2405223, AR2406762, AR2403022, AR2500835, AR2602990, AR2601766, AR2504036, AR2505776, AR2505949, AR2600005, AR2406256, AR2404054, AR2503961, AR2400756, AR2403259, AR2405640, AR2500071, AR2503522, AR2502368, AR2403278, AR2501391, AR2400543, AR2400554, AR2400205, AR2506129, AR2505467, AR2503054, AR2500070, AR2406670, AR2600136, AR2602230, AR2506051, AR2400504, AR2402665, AR2600488); SÍ: 4 (AR2403179, AR2506268, AR2500996, AR2406784) |
| ventana | NO: 46 (AR2401369, AR2403277, AR2500415, AR2405223, AR2406762, AR2403022, AR2500835, AR2602990, AR2601766, AR2504036, AR2505776, AR2401864, AR2505949, AR2600005, AR2406256, AR2403179, AR2404054, AR2506268, AR2503961, AR2400756, AR2403259, AR2500996, AR2406784, AR2405640, AR2500071, AR2503522, AR2401572, AR2502368, AR2403278, AR2501391, AR2400543, AR2400554, AR2400205, AR2506129, AR2505467, AR2503054, AR2500070, AR2406670, AR2600136, AR2602230, AR2506051, AR2400504, AR2402665, AR2402389, AR2401766, AR2600488) |
| rotulacion | SI: 21 (AR2500415, AR2500835, AR2602990, AR2601766, AR2504036, AR2505776, AR2401864, AR2505949, AR2600005, AR2506268, AR2503961, AR2500996, AR2406784, AR2503522, AR2401572, AR2502368, AR2506129, AR2503054, AR2506051, AR2401766, AR2600488); SÍ: 13 (AR2403277, AR2405223, AR2403022, AR2406256, AR2403179, AR2403259, AR2405640, AR2500071, AR2403278, AR2500070, AR2406670, AR2602230, AR2402665); YUNQUE: 5 (AR2401369, AR2404054, AR2400756, AR2400543, AR2400205); SÍ : 4 (AR2400554, AR2505467, AR2600136, AR2400504); NO: 2 (AR2501391, AR2402389); IMPRESIÓN DIGITAL: 1 (AR2406762) |
| material | LONA G650 2L 650 :GRIS RAL7038 :250 AN (M5739): 107 (AR2401369, AR2405640, AR2501342, AR2501003, AR2403277, AR2505228, AR2500415, AR2601120, AR2505139, AR2506314, AR2403022, AR2500210, AR2500835, AR2505361, AR2501403, AR2405075, AR2600341, AR2603151, AR2504706, AR2504098, AR2601527, AR2406738, AR2401156, AR2602990, AR2500815, AR2406766, AR2503521, AR2601766, AR2503961, AR2504036, AR2505776, AR2503799, AR2403542, AR2501831, AR2405693, AR2600476, AR2600542, AR2505675, AR2401864, AR2401500, AR2500707, AR2600005, AR2501185, AR2504037, AR2406256, AR2600101, AR2500609, AR2406255, AR2406480, AR2403179, AR2404054, AR2600006, AR2506268, AR2400118, AR2400756, AR2505861, AR2403259, AR2500996, AR2406455, AR2603149, AR2406784, AR2503522, AR2501881, AR2406847, AR2401572, AR2406120, AR2500650, AR2502368, AR2403278, AR2501391, AR2504097, AR2402504, AR2400554, AR2504633, AR2404468, AR2602511, AR2506129, AR2505467, AR2504584, AR2503054, AR2603173, AR2500496, AR2603006, AR2403654, AR2401578, AR2600136, AR2505218, AR2505325, AR2505685, AR2506051, AR2407012, AR2603498, AR2501404, AR2600705, AR2400504, AR2600254, AR2402665, AR2404305, AR2400755, AR2401967, AR2604280, AR2402389, AR2601066, AR2401766, AR2406046, AR2600488, AR2505975); LONA G650 2L 650 :AZUL RAL5015 :250 AN (M5729): 10 (AR2405223, AR2501005, AR2500122, AR2601671, AR2500071, AR2505637, AR2401698, AR2400543, AR2400205, AR2500007); LONA G650 2L 650 :NEGRO :250 AN (M5734): 5 (AR2501991, AR2404992, AR2603653, AR2406369, AR2600902); LONA G650 2L 650 :ROJO :250 AN (M5714): 3 (AR2506072, AR2500070, AR2406670); LONA G650 2L 650 :VERDE RAL6026 :250 AN (M5728): 2 (AR2602230, AR2400212); LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2600788); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2406046); LONA ID: 1 (AR2406762); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2406525); LONA G650 2L 650 :GRIS RAL7037 :250 AN (M5736): 1 (AR2505949) |
| modo | SEGUN SE INDICA: 127 (AR2401369, AR2600788, AR2405640, AR2501991, AR2501342, AR2501003, AR2403277, AR2505228, AR2500415, AR2405223, AR2601120, AR2505139, AR2406046, AR2404992, AR2406762, AR2506314, AR2403022, AR2500210, AR2500835, AR2505361, AR2501403, AR2405075, AR2600341, AR2603151, AR2504706, AR2504098, AR2601527, AR2406738, AR2401156, AR2602990, AR2500815, AR2406766, AR2503521, AR2601766, AR2406525, AR2603653, AR2503961, AR2506072, AR2504036, AR2505776, AR2503799, AR2403542, AR2501831, AR2405693, AR2505675, AR2401864, AR2401500, AR2505949, AR2500707, AR2600005, AR2406369, AR2501185, AR2504037, AR2406256, AR2600101, AR2500609, AR2406255, AR2406480, AR2403179, AR2404054, AR2600006, AR2506268, AR2501005, AR2400118, AR2400756, AR2505861, AR2403259, AR2500996, AR2601671, AR2406455, AR2603149, AR2406784, AR2500071, AR2503522, AR2505637, AR2501881, AR2401698, AR2406847, AR2401572, AR2406120, AR2500650, AR2502368, AR2403278, AR2501391, AR2400543, AR2504097, AR2402504, AR2400554, AR2504633, AR2404468, AR2400205, AR2602511, AR2506129, AR2505467, AR2504584, AR2503054, AR2500070, AR2603173, AR2500496, AR2603006, AR2403654, AR2406670, AR2401578, AR2600136, AR2505218, AR2602230, AR2505325, AR2505685, AR2506051, AR2407012, AR2603498, AR2501404, AR2600705, AR2500007, AR2400212, AR2400504, AR2600254, AR2402665, AR2400755, AR2401967, AR2604280, AR2402389, AR2600902, AR2601066, AR2401766, AR2600488, AR2505975); REPARTIDOS: 2 (AR2500122, AR2404305) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 200 × 130 | 2,7; 42,6; 88,4; 128,4 | 2,7; 42,6; 88,4; 128,4 | 2,7; 29,8; 58,1; 86,4; 114,7; 143; 171,3; 198,4 | Vigente v8; se conserva. AR2600101; OT/2026/AR2600101.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 14 pedido(s): AR2406847, AR2500007, AR2500122, AR2500650, AR2501404, AR2505218, AR2505325, AR2505861, AR2506314, AR2600101, AR2600254, AR2603006, AR2605017, AR2605177 / 8 pedido(s): AR2401500, AR2401698, AR2405640, AR2405693, AR2406369, AR2406480, AR2406766, AR2505637 / 3 pedido(s): AR2505975, AR2506072, AR2603653 / 2 pedido(s): AR2400212, AR2400755 / 2 pedido(s): AR2600341, AR2601671 / 1 pedido(s): AR2601527 / 1 pedido(s): AR2601066 / 1 pedido(s): AR2600788. |
| lona; 200 × 130 | 2,5; 42,5; 88,2; 128,2 | 4; 44; 89,7; 129,7 | 2,7; 29,8; 58,1; 86,4; 114,7; 143; 171,3; 198,4 | Vigente v8; se conserva. AR2600005; OT/2026/AR2600005.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2402665, AR2600005 / 1 pedido(s): AR2403278 / 1 pedido(s): AR2400756 / 1 pedido(s): AR2605078. |
| lona; 180 × 120 | 2,7; 40,1; 80,9; 118,4 | 2,7; 40,1; 80,9; 118,4 | 2,7; 30,5; 60,5; 90,5; 120,5; 150,5; 178,3 | Vigente v8; se conserva. AR2406784; OT/2024/AR2406784.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2406784 / 1 pedido(s): AR2605103 / 1 pedido(s): AR2503522. |
| lona; 140 × 108 | 2,5; 37,1; 71,8; 106,5 | 2,5; 37,6; 72,8; 108 | 2,5; 37,1; 71,7; 106,3; 141 | Vigente v8; se conserva. |
| baqueton; 160 × 120 | 2,65; 40,15; 80,85; 118,35 | 2,65; 40,15; 80,85; 118,35 | 2,8; 31,8; 64,3; 96,8; 129,3; 158,2 |  AR2403542; OT/2024/AR2403542.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2401578, AR2403542, AR2404992 / 2 pedido(s): AR2501185, AR2600705. |
| baqueton; 180 × 120 | 3; 40; 81; 118,5 | 3; 40; 81; 118,5 | 2,5; 30,5; 60,5; 90,5; 120,5; 150,5; 178,5 |  AR2504098; OT/2025/AR2504098.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 5 pedido(s): AR2400118, AR2402504, AR2504098, AR2504584, AR2604280 / 2 pedido(s): AR2403654, AR2603173 / 2 pedido(s): AR2401156, AR2504037. |
| baqueton; 205 × 130 | 2,65; 42,55; 88,35; 128,35 | 2,65; 42,55; 88,35; 128,35 | 2,5; 31,2; 59,9; 88,6; 117,4; 146,1; 174,8; 203,5 |  AR2501881; OT/2025/AR2501881.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501881. |
| baqueton; 210 × 130 | 2,65; 42,65; 88,43; 128,35 | 2,65; 42,65; 88,43; 128,35 | 2; 31,6; 61,1; 90,7; 120,3; 149,9; 179,4; 209 |  AR2500609; OT/2025/AR2500609.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2500609 / 1 pedido(s): AR2406120. |
| baqueton; 220 × 130 | 2,65; 42,55; 88,35; 128,35 | 2,65; 42,55; 88,35; 128,35 | 2,65; 31,45; 63,05; 94,65; 126,05; 157,85; 189,45; 218,35 |  AR2505139; OT/2025/AR2505139.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 6 pedido(s): AR2500210, AR2500815, AR2501403, AR2503521, AR2504633, AR2603151 / 4 pedido(s): AR2500496, AR2505139, AR2505228, AR2603498 / 3 pedido(s): AR2401967, AR2406738, AR2501831. |
| baqueton; 220 × 160 | 1,5; 33,1; 64,7; 96,3; 127,9; 159,5 | 1,5; 33,1; 64,7; 96,3; 127,9; 159,5 | 2,5; 31,4; 63; 94,6; 126,2; 189,4; 218,2 |  AR2406455; OT/2024/AR2406455.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406455. |
| baqueton; 250 × 140 | 2,6; 37; 70,5; 104; 138,4 | 2,6; 37; 70,5; 104; 138,4 | 2,8; 31; 62,5; 94; 125,5; 157; 188,5; 220; 248,2 |  AR2504097; OT/2025/AR2504097.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 9 pedido(s): AR2404468, AR2405075, AR2501342, AR2503054, AR2503799, AR2503961, AR2504097, AR2505361, AR2603149 / 1 pedido(s): AR2503961 / 1 pedido(s): AR2404305 / 1 pedido(s): AR2504706 / 1 pedido(s): AR2406046. |
| baqueton; 250 × 150 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,8; 31; 62,5; 94; 125,5; 157; 188,5; 220; 248,5 |  AR2602511; OT/2026/AR2602511.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2505685, AR2601766 / 1 pedido(s): AR2602511 / 1 pedido(s): AR2505675 / 1 pedido(s): AR2406525 / 1 pedido(s): AR2405640. |
| baqueton; 260 × 160 | 2,8; 31,8; 64,3; 96,8; 129,3; 158,2 | 2,8; 31,8; 64,3; 96,8; 129,3; 158,2 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2500707; OT/2025/AR2500707.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 4 pedido(s): AR2407012, AR2500707, AR2600902, AR2601120 / 1 pedido(s): AR2501003. |
| baqueton; 300 × 150 | 2,6; 29,2; 58,4; 87,6; 116,8; 146 | 2,6; 29,2; 58,4; 87,6; 116,8; 146 | 2,5; 32,9; 65,8; 98,7; 131,6; 164,4; 197,3; 230,2; 263,1; 296 |  AR2600006; OT/2026/AR2600006.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600006. |
| baqueton; 300 × 180 | 2,65; 30,55; 60,55; 90,55; 120,55; 150,55; 178,35 | 2,65; 30,55; 60,55; 90,55; 120,55; 150,55; 178,35 | 2; 31,7; 61,4; 91,1; 120,8; 150,5; 180,2; 209,9; 239,6; 269,3; 299 |  AR2406046; OT/2024/AR2406046-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406046. |
| baqueton; 300 × 200 | 2,65; 29,75; 58,05; 86,35; 114,65; 142,95; 171,25; 198,35 | 2,65; 29,75; 58,05; 86,35; 114,65; 142,95; 171,25; 198,35 | 2,5; 35,4; 68,3; 101,2; 134,1; 166,9; 199,8; 232,7; 265,6; 298,5 |  AR2501005; OT/2025/AR2501005.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501005. |
| baqueton; 320 × 170 | 2,5; 35,7; 68,9; 102,1; 135,3; 168,5 | 2,5; 35,7; 68,9; 102,1; 135,3; 168,5 | 2,5; 36,8; 68,7; 100,5; 132,4; 164,2; 196,1; 227,9; 259,8; 291,6; 319,5 |  AR2600341; OT/2026/AR2600341.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600341. |
| baqueton; 351 × 209 | 1,5; 31,1; 60,6; 90,2; 119,8; 149,4; 178,9; 208,5 | 11,5; 42,7; 73,8; 105; 136,2; 167,3; 198,5 | 2; 36,8; 71,6; 106,4; 141,2; 176; 210,8; 245,6; 280,4; 315,2; 350 |  AR2501991; OT/2025/AR2501991.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501991. |
| baqueton; 452 × 222 | 2; 34; 65; 96; 127; 158; 189; 221 | 2; 34; 65; 96; 127; 158; 189; 221 | 117,5; 161,1; 204,7; 248,3; 291,9; 335,5 |  AR2406256; OT/2024/AR2406256-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406256. |
| lona; 160 × 120 | 2,5; 31,5; 60,5; 89,58; 118,5 | 3,25; 32,25; 61,25; 90,25; 119,25 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 |  AR2403179; OT/2024/AR2403179.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2403179 / 1 pedido(s): AR2400554. |
| lona; 200 × 120 | 2,65; 40,15; 80,85; 118,35 | 3,4; 40,9; 81,6; 119,1 | 2,65; 29,75; 58,05; 86,35; 114,65; 142,95; 171,25; 198,35 |  AR2401766; OT/2024/AR2401766.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401766. |
| lona; 211 × 125 | 2,5; 33,5; 63; 92,5; 123,5 | 3,25; 34,25; 63,75; 93,25; 124,25 | 2,25; 36,85; 71,45; 105,95; 140,55; 175,15; 209,75 |  AR2500070; OT/2025/AR2500070.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2406670, AR2500070. |
| lona; 220 × 130 | 2,65; 42,55; 88,35; 128,35 | 3,4; 43,3; 89,1; 129,1 | 2,65; 31,55; 63,15; 94,75; 126,35; 157,95; 189,55; 218,35 |  AR2602230; OT/2026/AR2602230.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 3 pedido(s): AR2505467, AR2600136, AR2602230 / 2 pedido(s): AR2400504, AR2401369 / 1 pedido(s): AR2604800 / 1 pedido(s): AR2600488. |
| lona; 220 × 140 | 2,6; 37; 70,5; 104; 138,4 | 3,35; 37,75; 71,25; 104,75; 139,15 | 2,65; 31,45; 63,05; 94,65; 126,25; 157,85; 189,45; 218,35 |  AR2400756; OT/2024/AR2400756-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400756. |
| lona; 223 × 165 | 2,5; 34,7; 66,9; 99,1; 131,3; 163,5 | 3,25; 35,45; 67,65; 99,85; 132,05; 164,25 | 6,25; 41,45; 76,75; 111,95; 147,25; 182,45; 217,75 |  AR2504036; OT/2025/AR2504036.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504036. |
| lona; 250 × 140 | 2,6; 37; 70,5; 104; 138,4 | 3,35; 37,75; 71,25; 104,75; 139,15 | 2,8; 31; 62,5; 94; 125,5; 157; 188,5; 220; 248,2 |  AR2506268; OT/2025/AR2506268.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2505949, AR2506268 / 1 pedido(s): AR2406762. |
| lona; 250 × 150 | 17,1; 46,3; 75,5; 104,7; 133,9 | 17,85; 47,05; 76,25; 105,45; 134,65 | 2,8; 31; 62,5; 94; 125,5; 157; 188,5; 219,9; 248,2 |  AR2501391; OT/2025/AR2501391.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2501391 / 1 pedido(s): AR2401572 / 1 pedido(s): AR2400205. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 250 × 160 | AR2402389, AR2403022, AR2500835, AR2503054 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2402389.dwg; OT/2024/AR2402389.xlsb; OT/2024/AR2403022.dwg; OT/2024/AR2403022.xlsb; OT/2025/AR2500835.dwg; OT/2025/AR2500835.xlsb; OT/2025/AR2503054.dwg; OT/2025/AR2503054.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 221 × 130 | AR2403259 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2403259.dwg; OT/2024/AR2403259.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 400 × 210 | AR2404054 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404054.dwg; OT/2024/AR2404054.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 450 × 210 | AR2404960 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404960.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 301 × 181 | AR2405194 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405194.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 320 × 170 | AR2405495, AR2500996, AR2503324 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405495.dwg; OT/2025/AR2500996.dwg; OT/2025/AR2500996.xlsb; OT/2025/AR2503324.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 310 × 150 | AR2405640, AR2502368, AR2502944 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405640-10.xlsb; OT/2024/AR2405640-11.xlsb; OT/2024/AR2405640-12.xlsb; OT/2024/AR2405640-13.xlsb; OT/2024/AR2405640.dwg; OT/2025/AR2502368.dwg; OT/2025/AR2502368.xlsb; OT/2025/AR2502944.dwg; OT/2025/AR2502944.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 330 × 150 | AR2405948 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405948.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 220 × 150 | AR2406256 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2406256-10.xlsb; OT/2024/AR2406256.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 270 × 170 | AR2500320 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2500320.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 371 × 221 | AR2500334 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2500334.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 260 × 160 | AR2500415 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2500415.dwg; OT/2025/AR2500415.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 300 × 150 | AR2503054 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503054.dwg; OT/2025/AR2503054.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 250 × 160 | AR2503961 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503961-11.xlsb; OT/2025/AR2503961.dwg; OT/2025/AR2503961.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 200 × 1300 | AR2601757 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601757.dwg; OT/2026/AR2601757.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### TALLERES SANTABALLA · SANTABALLA PALAS, S.L. — 049971

Ficha: `talleres-santaballa`. Histórico: **143 líneas / 68 pedidos**. PDF producidos adicionales examinados: 2. Registro vigente versión 2, conservado.

Código acreditado por histórico (AR2604602). Nombres/alias del histórico: TALLERES SANTABALLA · SANTABALLA PALAS, S.L..

Plantillas encontradas: `PL/SANTABALLA/RUEDA SANTABALLA.dwg`; `PL/SANTABALLA_recover.dwg`; `PL/SANTABALLA.dwg`

SANTABALLA.dwg: «CON VENTANA», «CON ORELLA», «OLLADOS A REPARTIR». Hay variantes sin aguas y con distintas aguas; no se fija una sola altura de aguas. REMOLQUILLEROS.doc indica R=10,1 cm habitual.

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `ventana` = {"lleva":true}.

Campos vigentes que se respetan: `recogeAtras` = "GOMA".

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 47 (AR2500626, AR2600007, AR2405389, AR2504727, AR2600377, AR2500064, AR2502866, AR2500832, AR2400611, AR2401748, AR2403653, AR2602633, AR2505859, AR2402628, AR2600153, AR2600875, AR2604093, AR2502334, AR2602963, AR2602254, AR2401328, AR2501995, AR2406136, AR2503373, AR2502410, AR2503897, AR2406591, AR2405136, AR2401975, AR2500659, AR2501663, AR2602153, AR2400206, AR2505469, AR2406316, AR2402799, AR2504172, AR2503183, AR2604092, AR2505004, AR2603478, AR2600515, AR2405339, AR2603691, AR2403257, AR2500181, AR2405985); TIPO 05: 8 (AR2500064, AR2400301, AR2406591, AR2404928, AR2501667, AR2602633, AR2401975, AR2505859) |
| recogeDelante | NO: 47 (AR2500626, AR2504727, AR2600377, AR2500064, AR2500832, AR2400611, AR2401748, AR2403653, AR2602633, AR2600007, AR2403859, AR2505859, AR2402628, AR2600153, AR2600875, AR2604093, AR2403667, AR2502334, AR2602963, AR2602254, AR2401328, AR2501667, AR2503373, AR2502410, AR2405136, AR2402393, AR2400301, AR2406591, AR2500659, AR2602153, AR2400206, AR2404928, AR2505469, AR2406316, AR2501995, AR2402799, AR2503183, AR2604092, AR2505004, AR2401975, AR2603478, AR2503897, AR2600515, AR2405339, AR2603691, AR2403257, AR2405985); GOMA: 16 (AR2600007, AR2405389, AR2502866, AR2501995, AR2401328, AR2406136, AR2503897, AR2406591, AR2401975, AR2403817, AR2501663, AR2505859, AR2406316, AR2504172, AR2505469, AR2500181) |
| recogeAtras | GOMA: 54 (AR2500626, AR2600007, AR2405389, AR2504727, AR2600377, AR2500064, AR2502866, AR2500832, AR2400611, AR2401748, AR2403653, AR2602633, AR2403859, AR2505859, AR2402628, AR2600153, AR2600875, AR2604093, AR2403667, AR2502334, AR2602963, AR2602254, AR2401328, AR2501995, AR2406136, AR2503373, AR2502410, AR2503897, AR2406591, AR2405136, AR2402393, AR2401975, AR2400301, AR2403817, AR2500659, AR2501663, AR2602153, AR2400206, AR2404928, AR2505469, AR2501667, AR2406316, AR2402799, AR2504172, AR2503183, AR2604092, AR2505004, AR2603478, AR2600515, AR2405339, AR2603691, AR2403257, AR2500181, AR2405985); NO: 1 (AR2501667) |
| bastillaEnfundar | NO: 47 (AR2500626, AR2600007, AR2405389, AR2504727, AR2600377, AR2500064, AR2502866, AR2500832, AR2400611, AR2403653, AR2403859, AR2505859, AR2600153, AR2600875, AR2604093, AR2403667, AR2502334, AR2602963, AR2602254, AR2501995, AR2406136, AR2503373, AR2502410, AR2406591, AR2401975, AR2400301, AR2403817, AR2501663, AR2602153, AR2400206, AR2404928, AR2505469, AR2501667, AR2406316, AR2402799, AR2500659, AR2602633, AR2604092, AR2505004, AR2603478, AR2503897, AR2600515, AR2405339, AR2603691, AR2403257, AR2500181, AR2405985); SÍ: 10 (AR2602633, AR2600875, AR2501667, AR2502410, AR2503897, AR2500659, AR2600153, AR2504172, AR2503183, AR2505004) |
| ventana | SÍ: 52 (AR2500626, AR2405389, AR2504727, AR2600377, AR2500064, AR2502866, AR2500832, AR2400611, AR2401748, AR2403653, AR2602633, AR2600007, AR2403859, AR2505859, AR2402628, AR2600153, AR2600875, AR2604093, AR2403667, AR2502334, AR2602963, AR2602254, AR2401328, AR2406136, AR2503373, AR2502410, AR2405136, AR2402393, AR2400301, AR2406591, AR2403817, AR2500659, AR2602153, AR2400206, AR2404928, AR2505469, AR2501667, AR2406316, AR2501995, AR2402799, AR2503183, AR2604092, AR2505004, AR2401975, AR2603478, AR2503897, AR2600515, AR2405339, AR2603691, AR2403257, AR2500181, AR2405985); NO: 11 (AR2600007, AR2501995, AR2501667, AR2503897, AR2406591, AR2505859, AR2401975, AR2501663, AR2406316, AR2504172, AR2505469) |
| rotulacion | SI: 38 (AR2500626, AR2600007, AR2504727, AR2600377, AR2500064, AR2502866, AR2500832, AR2400611, AR2401748, AR2602633, AR2505859, AR2600153, AR2600875, AR2502334, AR2602963, AR2602254, AR2501995, AR2503373, AR2502410, AR2503897, AR2406591, AR2402393, AR2401975, AR2500659, AR2501663, AR2602153, AR2400206, AR2404928, AR2505469, AR2406316, AR2504172, AR2503183, AR2604092, AR2505004, AR2603478, AR2600515, AR2603691, AR2500181); SÍ: 13 (AR2405389, AR2403653, AR2403859, AR2402628, AR2604093, AR2403667, AR2501667, AR2406136, AR2403817, AR2402799, AR2405339, AR2403257, AR2405985); SI : 2 (AR2401328, AR2405136); SÍ : 1 (AR2400301) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 29 (AR2600007, AR2405389, AR2504727, AR2600377, AR2500064, AR2500832, AR2400611, AR2401748, AR2403653, AR2600875, AR2602963, AR2602254, AR2401328, AR2503897, AR2405136, AR2402393, AR2505859, AR2406591, AR2500659, AR2501663, AR2602153, AR2404928, AR2600153, AR2501667, AR2406316, AR2402799, AR2603478, AR2600515, AR2403257); LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 10 (AR2500064, AR2400301, AR2403653, AR2405766, AR2406316, AR2501667, AR2500659, AR2405339, AR2500181, AR2403257); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 8 (AR2502334, AR2406136, AR2406591, AR2402799, AR2604092, AR2402393, AR2501995, AR2401975); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 7 (AR2500626, AR2406591, AR2500659, AR2401975, AR2404189, AR2500181, AR2405985); LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 7 (AR2403859, AR2600875, AR2403667, AR2501667, AR2502410, AR2500064, AR2504172); LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 7 (AR2505859, AR2600153, AR2604093, AR2501995, AR2503373, AR2505004, AR2603691); LONA ALPHA 1L 580  :NEGRO :250 AN: 5 (AR2502866, AR2602963, AR2401975, AR2406591, AR2503373); LONA ALPHA 1L 580: AZUL RAL5015: 220 AN: 4 (AR2402628, AR2400301, AR2400206, AR2403257); LONA NS86 2L 630GR [580]: ROJO (COR/400): 250 AN: 2 (AR2602633, AR2503897); LONA ALPHA 1L 580 :VERDE RAL6024 :250 AN: 2 (AR2503373, AR2504172); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 2 (AR2502410, AR2505004); LONA MONZA 1 L 580 G/M2: GRIS RAL 7038: 250 AN: 1 (AR2600875); LONA STARPLUS 1L 610  :BLANCO RAL9010 :250 AN: 1 (AR2501995); LONA ALPHA 1L 580 :AMARILLO RAL1018 :250 AN: 1 (AR2406591); LONA RECORD 1 L 580:GRIS 095 RAL 7038:220 AN: 1 (AR2403817); LONA NS86 2L 630 G/M2 : AZUL CLARO (SIMILAR 5015): 1 (AR2505469); LONA MONZA 1 L 580 G/M2: GRIS RAL 7037: 250 AN: 1 (AR2503183); LONA ALPHA 1L 580 :MARRON - 204 MC :250 AN: 1 (AR2600377); LONA STARPLUS 1L 610:PLATA 092:250 AN: 1 (AR2400611) |
| modo | REPARTIDOS: 31 (AR2500626, AR2600007, AR2405389, AR2504727, AR2600377, AR2500064, AR2502866, AR2500832, AR2401748, AR2505859, AR2600153, AR2502334, AR2501995, AR2501667, AR2503373, AR2502410, AR2503897, AR2406591, AR2402393, AR2500659, AR2501663, AR2405766, AR2505469, AR2406316, AR2504172, AR2503183, AR2505004, AR2600515, AR2404189, AR2500181, AR2403257); SEGUN SE INDICA: 29 (AR2400611, AR2403653, AR2602633, AR2403859, AR2406591, AR2402628, AR2600875, AR2604093, AR2403667, AR2602963, AR2602254, AR2401328, AR2400301, AR2406136, AR2405136, AR2401975, AR2403817, AR2602153, AR2400206, AR2404928, AR2501667, AR2402799, AR2505469, AR2604092, AR2603478, AR2405339, AR2603691, AR2403257, AR2405985) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 310 × 188 | 2,5; 33,2; 63,8; 94,5; 125,2; 155,9; 186,5 | 2,5; 33,2; 63,8; 94,5; 125,2; 155,9; 186,5 | 2,5; 36,5; 70,5; 104,5; 138,5; 172,5; 206,5; 240,5; 274,5; 308,5 | Vigente v2; se conserva. AR2500626; OT/2025/AR2500626.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2500626, AR2605291. |
| lona; 160 × 100 | 2,5; 26,5; 50,5; 74,5; 98,5 | 2,5; 26,5; 50,5; 74,5; 98,5 | 2,5; 36,4; 65,8; 95,2; 124,6; 158,5 | Vigente v2; se conserva. AR2605291; OT/2026/AR2605291.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605291. |
| baqueton; 180 × 120 | 2,5; 41,2; 79,8; 118,5 | 25; 41,2; 79,8; 118,5 | 2,5; 37,78; 73,2; 108,1; 143,3; 178,5 |  AR2406591; OT/2024/AR2406591-6.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406591. |
| baqueton; 250 × 172 | 2,5; 36,1; 69,7; 103,3; 136,9; 170,5 | 2,5; 36,1; 69,7; 103,3; 136,9; 170,5 | 2,5; 37,6; 72,8; 107,9; 143,1; 178,2; 213,4; 248,5 |  AR2400301; OT/2024/AR2400301-2.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400301. |
| baqueton; 251 × 142 | 3,5; 37,5; 71,5; 105,5; 139,5 | 3,5; 37,5; 71,5; 105,5; 139,5 | 3; 33,8; 64,5; 95,3; 126; 156,8; 187,5; 218,3; 249 |  AR2404189; OT/2024/AR2404189.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404189. |
| baqueton; 260 × 160 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2505469; OT/2025/AR2505469.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505469. |
| baqueton; 260 × 162 | 2,5; 31,7; 65,7; 97,3; 128,9; 160,5 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2500659; OT/2025/AR2500659-10.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500659. |
| baqueton; 260 × 163 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2500181; OT/2025/AR2500181.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500181. |
| baqueton; 276 × 151 | 2,5; 31,7; 61,3; 90,7; 120,1; 149,5 | 2,5; 31,9; 61,3; 90,7; 120,1; 149,5 | 2,5; 32,7; 62,9; 93,2; 123,4; 153,6; 183,8; 214,1; 274,5 |  AR2405766; OT/2024/AR2405766.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405766. |
| baqueton; 505 × 255 | 2,5; 31,7; 65,3; 96,6; 128; 159,4; 190,8; 222,1; 253,5 | 2,5; 33,9; 65,3; 96,6; 128; 159,4; 190,8; 222,1; 253,5 | 2,5; 35,9; 69,3; 102,7; 136,1; 169,5; 202,9; 236,3; 269,7; 336,5; 369,9; 403,3 |  AR2502866; OT/2025/AR2502866.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502866. |
| lona; 115 × 100 | 2,5; 26,5; 50,5; 74,5; 98,5 | 2,5; 26,5; 50,5; 74,5; 98,5 | 2,5; 39,5; 76,5; 113,5 |  AR2500064; OT/2025/AR2500064-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500064. |
| lona; 155 × 105 | 2,5; 37,5; 72,5; 103,5 | 2,5; 37,5; 72,5; 103,5 | 2,5; 32,7; 62,9; 93,1; 123,3; 153,5 |  AR2505859; OT/2025/AR2505859-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2505859 / 1 pedido(s): AR2406591. |
| lona; 160 × 112 | 2,5; 27,5; 56,5; 85,5; 110,5 | 2,5; 27,5; 56,5; 85,5; 110,5 | 2,5; 15; 54,5; 80,5; 106,5; 132,5; 158,5 |  AR2403653; OT/2024/AR2403653-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403653. |
| lona; 174 × 118 | 2,5; 31; 59,5; 88; 116,5 | 2,5; 31; 59,5; 88; 116,5 | 2,5; 30; 58,5; 87; 115,5; 144; 172,5 |  AR2501667; OT/2025/AR2501667-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501667. |
| lona; 175 × 110 | 2,5; 37,8; 73,2; 108,5 | 2,5; 37,8; 73,2; 108,5 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 |  AR2405985; OT/2024/AR2405985.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2402628, AR2405985. |
| lona; 175 × 111 | 18,7; 56; 93,3 | 18,7; 56; 93,3 | 18; 53; 88; 123; 158 |  AR2401748; OT/2024/AR2401748-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401748. |
| lona; 175 × 112 | 2,5; 38,5; 74,5; 110,5 | 2,5; 38,5; 74,5; 110,5 | 2,5; 31; 59,5; 88; 116,5; 145; 173,5 |  AR2600875; OT/2026/AR2600875.xlsb / LONA REMOLQUE 0225813, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600875. |
| lona; 175 × 120 | 2,5; 29; 60,5; 92; 118,5 | 2,5; 29; 60,5; 92; 118,5 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 |  AR2402799; OT/2024/AR2402799-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2402799 / 1 pedido(s): AR2402393. |
| lona; 180 × 115 | 2,5; 40,3; 75,7; 113,5 | 2,5; 40,3; 75,7; 113,5 | 2,5; 39,2; 73,4; 107,6; 141,8; 178,5 |  AR2401975; OT/2024/AR2401975-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401975. |
| lona; 180 × 120 | 2,5; 41,2; 79,8; 118,5 | 2,5; 41,2; 79,8; 118,5 | 2,5; 37,7; 72,9; 108,1; 143,3; 178,5 |  AR2400301; OT/2024/AR2400301.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400301. |
| lona; 185 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 38,5; 75; 111; 147,5; 183,5 |  AR2400611; OT/2024/AR2400611-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400611. |
| lona; 200 × 120 | 2,5; 41,2; 79,8; 118,5 | 2,5; 41,2; 79,8; 118,5 | 2,5; 41,7; 80,9; 120,1; 159,3; 198,5 |  AR2602254; OT/2026/AR2602254-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 5 pedido(s): AR2405339, AR2503373, AR2600007, AR2600377, AR2602633 / 2 pedido(s): AR2602153, AR2602254 / 2 pedido(s): AR2401328, AR2405136 / 1 pedido(s): AR2600153. |
| lona; 200 × 123 | 2,5; 32,3; 62; 91,8; 121,5 | 2,5; 32,3; 62; 91,8; 121,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 |  AR2503897; OT/2025/AR2503897.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503897. |
| lona; 200 × 130 | 2,5; 44,5; 86,5; 128,5 | 2,5; 44,5; 86,5; 128,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 |  AR2603691; OT/2026/AR2603691.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603691. |
| lona; 210 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 36,8; 71,2; 105,5; 139,8; 174,2; 208,5 |  AR2500064; OT/2025/AR2500064-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2406316, AR2500064 / 1 pedido(s): AR2406591. |
| lona; 219 × 130 | 5,5; 37,5; 65,5; 95,5; 126 | 5,5; 35,5; 65,5; 95,3; 125 | 2; 10; 29,5; 60,5; 92,5; 124; 155,5; 187; 213,5 |  AR2403859; OT/2024/AR2403859.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2403667, AR2403859. |
| lona; 220 × 130 | 2,5; 27,7; 52,9; 78,1; 103,3; 128,5 | 2,5; 27,7; 52,9; 78,1; 103,3; 128,5 | 2,5; 33,4; 64,2; 95,1; 125,9; 156,8; 187,6; 218,5 |  AR2404928; OT/2024/AR2404928.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404928. |
| lona; 225 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34,1; 65,6; 97,2; 128,8; 160,4; 191,9; 223,5 |  AR2602254; OT/2026/AR2602254-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2500832, AR2602254. |
| lona; 225 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,1; 65,6; 97,2; 128,8; 160,4; 191,9; 223,5 |  AR2505004; OT/2025/AR2505004-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505004. |
| lona; 225 × 140 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 39,5; 76; 113; 150; 186,5; 223,5 |  AR2400611; OT/2024/AR2400611-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400611. |
| lona; 226 × 126 | 2,5; 33; 63,5; 94; 124,5 | 2,5; 33; 63,5; 94; 124,5 | 2,5; 34,2; 65,9; 97,6; 129,4; 161,1; 192,8; 224,5 |  AR2600515; OT/2026/AR2600515.xlsb / LONA REMOLQUE 224998, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600515. |
| lona; 226 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,2; 65,9; 97,6; 129,4; 161,1; 192,8; 224,5 |  AR2604092; OT/2026/AR2604092.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604092. |
| lona; 226 × 132 | 2,5; 34,8; 66,5; 98,3; 130,5 | 2,5; 34,8; 66,5; 98,3; 130,5 | 2,5; 34,6; 66,2; 97,7; 129,3; 160,9; 192,5; 224,5 |  AR2603478; OT/2026/AR2603478.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603478. |
| lona; 226 × 160 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 34,2; 65,9; 97,6; 129,4; 161,1; 192,8; 224,5 |  AR2504172; OT/2025/AR2504172-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504172. |
| lona; 230 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34,8; 67,1; 99,4; 131,6; 163,9; 196,2; 228,5 |  AR2501995; OT/2025/AR2501995-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501995. |
| lona; 230 × 141 | 2,5; 36,8; 71; 105,3; 139,5 | 2,5; 36,8; 71; 105,3; 139,5 | 2,5; 34,8; 67,1; 99,4; 131,6; 163,9; 196,2; 228,5 |  AR2501995; OT/2025/AR2501995-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501995. |
| lona; 240 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 36,2; 69,9; 103,6; 137,4; 171,1; 204,8; 238,5 |  AR2500832; OT/2025/AR2500832-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2500832, AR2502334. |
| lona; 246 × 136 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 29,4; 56,3; 83,2; 110,1; 136,9; 163,8; 190,7; 217,6; 244,5 |  AR2505859; OT/2025/AR2505859.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505859. |
| lona; 250 × 140 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 33,3; 64; 94,8; 125,5; 156,3; 187; 217,8; 248,5 |  AR2602153; OT/2026/AR2602153-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 5 pedido(s): AR2502410, AR2503373, AR2504727, AR2505469, AR2602153 / 1 pedido(s): AR2600875. |
| lona; 250 × 142 | 2,5; 37; 71,5; 106; 140,5 | 2,5; 37; 71,5; 106; 140,5 | 2,5; 33,3; 64; 94,8; 125,5; 156,3; 187; 217,8; 248,5 |  AR2600153; OT/2026/AR2600153-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600153. |
| lona; 250 × 145 | 2,5; 37,8; 73; 108,3; 143,5 | 2,5; 37,8; 73; 108,3; 143,5 | 2,5; 33,3; 64; 94,8; 125,5; 156,3; 187; 217,8; 248,5 |  AR2604093; OT/2026/AR2604093.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604093. |
| lona; 250 × 152 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 | 2,5; 33,3; 64; 94,8; 125,5; 156,3; 187; 217,8; 248,5 |  AR2406316; OT/2024/AR2406316-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406316. |
| lona; 250 × 163 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 33,3; 64; 94,8; 125,5; 156,3; 187; 217,8; 248,5 |  AR2503373; OT/2025/AR2503373-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503373. |
| lona; 250 × 175 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 | 12,5; 44,8; 77,1; 109,4; 141,6; 173,9; 206,2; 238,5 |  AR2501995; OT/2025/AR2501995-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501995. |
| lona; 251 × 140 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 33,3; 64; 94,7; 125,5; 156,3; 187; 217,8; 249,5 |  AR2501667; OT/2025/AR2501667-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501667. |
| lona; 251 × 155 | 2,5; 32,5; 63; 93; 123,5; 153,5 | 2,5; 32,5; 63; 93; 123,5; 153,5 | 2,5; 38; 73; 108,5; 143,5; 179; 214; 249,5 |  AR2400611; OT/2024/AR2400611-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400611. |
| lona; 260 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2600515; OT/2026/AR2600515.xlsb / LONA REMOLQUE 224999, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2600515 / 1 pedido(s): AR2401328. |
| lona; 260 × 151 | 2,5; 39,3; 76; 112,8; 149,5 | 2,5; 39,3; 76; 112,8; 149,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2505859; OT/2025/AR2505859-13.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2505859 / 1 pedido(s): AR2403257. |
| lona; 260 × 152 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2505469; OT/2025/AR2505469-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2500064, AR2505469, AR2604816. |
| lona; 260 × 153 | 2,5; 32,6; 62,2; 91,8; 121,4; 151,5 | 2,5; 32,6; 62,2; 91,8; 121,4; 151,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2602963; OT/2026/AR2602963-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602963. |
| lona; 260 × 157 | 2,5; 33; 63,5; 94,5; 125; 155,5 | 2,5; 33; 63,5; 94,5; 125; 155,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2400206; OT/2024/AR2400206.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400206. |
| lona; 260 × 160 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2600007; OT/2026/AR2600007-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2401328, AR2505469, AR2600007 / 1 pedido(s): AR2403653. |
| lona; 260 × 162 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2505469; OT/2025/AR2505469-13.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2500659, AR2505469 / 1 pedido(s): AR2406136. |
| lona; 260 × 164 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2600377; OT/2026/AR2600377.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600377. |
| lona; 260 × 170 | 2,5; 35,7; 68,9; 102,1; 135,3; 168,5 | 2,5; 35,7; 68,9; 102,1; 135,3; 168,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2500181; OT/2025/AR2500181.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500181. |
| lona; 260 × 171 | 2,5; 35,9; 69,3; 102,7; 136,1; 169,5 | 2,5; 35,9; 69,3; 102,7; 136,1; 169,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2505859; OT/2025/AR2505859-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505859. |
| lona; 267 × 163 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 29; 55,5; 82; 108,5; 135; 161,5 | 2,5; 35,4; 68,3; 101,1; 134; 166,9; 199,8; 232,6; 265,5 |  AR2505859; OT/2025/AR2505859-14.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505859. |
| lona; 270 × 150 | 2,5; 41,5; 75,5; 109,5; 148,5 | 2,5; 41,5; 75,5; 109,5; 148,5 | 2,5; 35,8; 69; 102,3; 135,5; 168,8; 202; 235,3; 268,5 |  AR2401975; OT/2024/AR2401975-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401975. |
| lona; 270 × 170 | 2,5; 35,7; 68,9; 102,1; 135,3; 168,5 | 2,5; 35,7; 68,9; 102,1; 135,3; 168,5 | 2,5; 35,8; 69; 102,3; 135,5; 168,8; 202; 235,3; 268,5 |  AR2502866; OT/2025/AR2502866.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502866. |
| lona; 270 × 171 | 3; 36,2; 69,4; 102,6; 135,8; 169 | 3; 36,2; 69,4; 102,6; 135,8; 169 | 2,5; 35,8; 69; 102,3; 135,5; 168,8; 202; 235,3; 268,5 |  AR2602963; OT/2026/AR2602963-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602963. |
| lona; 275 × 164 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5 | 2,5; 32,6; 62,7; 92,8; 122,9; 153,1; 183,2; 213,3; 243,4; 273,5 |  AR2406316; OT/2024/AR2406316-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406316. |
| lona; 290 × 212 | 2,5; 37,2; 71,8; 106,5; 141,2; 175,8; 210,5 | 2,5; 37,2; 71,8; 106,5; 141,2; 175,8; 210,5 | 2,5; 31,1; 59,7; 88,3; 114,7; 145,5; 174,1; 202,7; 231,3; 259,9; 288,5 |  AR2406591; OT/2024/AR2406591-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406591. |
| lona; 300 × 160 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 35,4; 68,3; 101,2; 134,1; 166,9; 199,8; 232,7; 265,6; 298,5 |  AR2600153; OT/2026/AR2600153-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2600153 / 1 pedido(s): AR2403653. |
| lona; 300 × 163 | 2,5; 42,3; 82; 121,8; 161,5 | 2,5; 42,3; 82; 121,8; 161,5 | 2,5; 35,4; 68,3; 101,2; 134,1; 166,9; 199,8; 232,7; 265,6; 298,5 |  AR2402799; OT/2024/AR2402799-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402799. |
| lona; 300 × 172 | 2,5; 36,7; 69,4; 102,6; 136,3; 170,5 | 2,5; 36,7; 69,4; 102,6; 136,3; 170,5 | 2,5; 35,4; 68,3; 101,2; 134,1; 166,9; 199,8; 232,7; 265,6; 298,5 |  AR2602633; OT/2026/AR2602633-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602633. |
| lona; 300 × 182 | 2,5; 38,1; 73,7; 109,3; 144,9; 180,5 | 2,5; 38,1; 73,7; 109,3; 144,9; 180,5 | 2,5; 35,4; 68,3; 101,2; 134,1; 166,9; 199,8; 232,7; 265,6; 298,5 |  AR2604816; OT/2026/AR2604816.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2604816. |
| lona; 300 × 195 | 2,5; 34,3; 66,2; 98; 129,8; 161,7; 193,5 | 2,5; 34,3; 66,2; 98; 129,8; 161,7; 193,5 | 2,5; 35,3; 68,1; 100,8; 136,6; 166,4; 199,2; 231,9; 264,7; 297,5 |  AR2401975; OT/2024/AR2401975-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401975. |
| lona; 310 × 160 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 36,5; 70,5; 104,5; 138,5; 172,5; 206,5; 240,5; 274,5; 308,5 |  AR2504172; OT/2025/AR2504172.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2503897, AR2504172. |
| lona; 310 × 162 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 | 2,5; 36,5; 70,5; 104,5; 138,5; 172,5; 206,5; 240,5; 274,5; 308,5 |  AR2501663; OT/2025/AR2501663.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501663. |
| lona; 310 × 163 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 35,8; 69; 102,3; 135,6; 168,9; 202,1; 235,4; 268,7; 308,5 |  AR2503183; OT/2025/AR2503183.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503183. |
| lona; 310 × 180 | 2,5; 37,7; 72,9; 108,1; 143,3; 178,5 | 2,5; 37,7; 72,9; 108,1; 143,3; 178,5 | 2,5; 36,5; 70,5; 104,5; 138,5; 172,5; 206,5; 240,5; 274,5; 308,5 |  AR2600875; OT/2026/AR2600875.xlsb / LONA REMOLQUE 0225811, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2502410, AR2600875. |
| lona; 320 × 167 | 2,5; 35,1; 67,7; 100,3; 132,9; 165,5 | 2,5; 35,1; 67,7; 100,3; 132,9; 165,5 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5; 192,1; 223,7; 255,3; 286,9; 318,5 |  AR2505004; OT/2025/AR2505004.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505004. |
| lona; 340 × 150 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 36,1; 69,7; 103,3; 136,9; 170,5; 204,1; 237,7; 271,3; 304,9; 338,5 |  AR2500659; OT/2025/AR2500659-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500659. |
| lona; 350 × 187 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 185,5 | 2,5; 33; 63,5; 94; 124,5; 155; 185,5 | 2,5; 34; 65,4; 96,9; 128,3; 159,8; 191,2; 222,7; 254,1; 285,6; 317; 348,5 |  AR2406316; OT/2024/AR2406316-4.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406316. |
| lona; 350 × 202 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5 | 2,5; 37,1; 71,7; 106,3; 140,9; 175,5; 210,1; 244,7; 279,3; 313,9; 348,5 |  AR2503897; OT/2025/AR2503897-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503897. |
| lona; 400 × 171 | 2,5; 41,8; 83,5; 125,3; 167 | 2,5; 41,8; 83,5; 125,3; 167 | 2,5; 52; 101,5; 151; 200,5; 250; 299,5; 349; 398,5 |  AR2600875; OT/2026/AR2600875.xlsb / LONA REMOLQUE 0225812, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600875. |
| lona; 500 × 255 | 2,5; 33,3; 64; 94,8; 125,5; 156,3; 187; 217,8; 253,5 | 2,5; 33,3; 64; 94,8; 125,5; 156,3; 187; 217,8; 253,5 | 90,05; 119,25; 148,45; 177,55; 206,75; 235,95; 265,15; 294,25; 323,45; 352,65; 381,85; 410,95 |  AR2501667; OT/2025/AR2501667-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501667. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 260 × 150 | AR2400301 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2400301-2.xlsb; OT/2024/AR2400301.dwg; OT/2024/AR2400301.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 260 × 141 | AR2403257 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2403257-10.xlsb; OT/2024/AR2403257-11.xlsb; OT/2024/AR2403257.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 269 × 170 | AR2403817 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2403817.dwg; OT/2024/AR2403817.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 251 × 153 | AR2404155 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404155.dwg; OT/2024/AR2404155.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 280,5 × 153,5 | AR2404844 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 151 × 261 | AR2405724 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405724.dwg; OT/2024/AR2405724.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 140 × 111 | AR2406591 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2406591-1.xlsb; OT/2024/AR2406591-2.xlsb; OT/2024/AR2406591-3.xlsb; OT/2024/AR2406591-4.xlsb; OT/2024/AR2406591-5.xlsb; OT/2024/AR2406591-6.xlsb; OT/2024/AR2406591.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 231 × 133 | AR2406591 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2406591-1.xlsb; OT/2024/AR2406591-2.xlsb; OT/2024/AR2406591-3.xlsb; OT/2024/AR2406591-4.xlsb; OT/2024/AR2406591-5.xlsb; OT/2024/AR2406591-6.xlsb; OT/2024/AR2406591.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 210 × 122 | AR2502410 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2502410-11.xlsb; OT/2025/AR2502410-12.xlsb; OT/2025/AR2502410.dwg; OT/2025/AR2502410.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 250,5 × 140,5 | AR2503373 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503373-10.xlsb; OT/2025/AR2503373-11.xlsb; OT/2025/AR2503373-12.xlsb; OT/2025/AR2503373-13.xlsb; OT/2025/AR2503373-14.xlsb; OT/2025/AR2503373.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 250 × 140 | AR2504727 | Modelo de ganado; fuera de FichaCliente. OT/2025/AR2504727.dwg; OT/2025/AR2504727.xlsb; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 212 × 160 | AR2506346 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2506346.dwg; OT/2025/AR2506346.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 240 × 130 | AR2600267 | Modelo de ganado; fuera de FichaCliente. OT/2026/AR2600267.dwg; OT/2026/AR2600267.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 300 × 161 | AR2601616 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601616.dwg; OT/2026/AR2601616.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 260 × 163 | AR2601616 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601616.dwg; OT/2026/AR2601616.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 300 × 152,5 | AR2602777 | Modelo de ganado; fuera de FichaCliente. OT/2026/AR2602777.dwg; OT/2026/AR2602777.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 301 × 163,5 | AR2602777 | Modelo de ganado; fuera de FichaCliente. OT/2026/AR2602777.dwg; OT/2026/AR2602777.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 200 × 121 | AR2604412, AR2604414 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604412.dwg; OT/2026/AR2604414.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 280 × 152 | AR2604414 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604414.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 280 × 152 | AR2604414 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604414.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 250 × 141 | AR2604602 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604602.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### PAMILAKAN SAS — 048363

Ficha: `pamilakan-sas`. Histórico: **126 líneas / 106 pedidos**. PDF producidos adicionales examinados: 6. Registro vigente versión 5, conservado.

Código acreditado por histórico (AR2604490). Nombres/alias del histórico: PAMILAKAN SAS.

Plantillas encontradas: `PL/PAMILAKAN/PAMILAKAN SAS.dwg`

Se conserva bastillaEnfundar=true de la ficha vigente, confirmada por Iván el 20/10/2026 en Q-R07 (docs/modelos/dudas-abiertas.md).

PAMILAKAN/PAMILAKAN SAS.dwg combina refuerzos en esquinas sin marcar y ejemplos sin refuerzos. También indica cremallera de 10 con dos cursores de un medallón: no se transforma en cremallera del 9.

Campos vigentes que se respetan: `perfil` = {"tipoPerfil":"TIPO 01"}; `bastillaEnfundar` = true; `ventana` = {"lleva":false}; `rotulacion` = false; `recogeAtras` = "CREMALLERA".

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 23 (AR2404598, AR2600968, AR2403608, AR2502766, AR2405795, AR2600707, AR2603744, AR2603438, AR2403950, AR2502379, AR2603907, AR2401687, AR2404050, AR2501973, AR2602423, AR2600014, AR2404194, AR2603235, AR2403880, AR2406297, AR2401000, AR2401187, AR2405868); TIPO 02: 4 (AR2502297, AR2401000, AR2400478, AR2501555); TIPO 05: 4 (AR2403127, AR2602769, AR2401566, AR2402752); TIPO 03: 1 (AR2403739) |
| recogeDelante | NO: 29 (AR2502297, AR2600968, AR2403608, AR2405795, AR2400342, AR2600707, AR2401000, AR2603744, AR2603438, AR2602769, AR2403950, AR2401566, AR2603907, AR2401687, AR2404050, AR2501973, AR2405541, AR2403249, AR2400676, AR2602423, AR2400478, AR2600014, AR2404194, AR2603235, AR2403880, AR2403739, AR2501555, AR2401187, AR2402752); CREMALLERA: 7 (AR2404598, AR2502766, AR2403127, AR2502379, AR2406297, AR2401000, AR2405868) |
| recogeAtras | CREMALLERA: 23 (AR2404598, AR2502297, AR2502766, AR2400342, AR2403127, AR2401000, AR2603744, AR2603438, AR2403950, AR2502379, AR2401687, AR2404050, AR2405541, AR2403249, AR2405795, AR2600014, AR2603235, AR2406297, AR2403739, AR2501555, AR2401187, AR2402752, AR2405868); NO: 12 (AR2600968, AR2403608, AR2405795, AR2600707, AR2602769, AR2401566, AR2501973, AR2400676, AR2602423, AR2400478, AR2404194, AR2403880); GOMA: 1 (AR2603907) |
| bastillaEnfundar | SÍ: 28 (AR2404598, AR2502297, AR2600968, AR2502766, AR2403127, AR2401000, AR2603744, AR2603438, AR2602769, AR2401566, AR2502379, AR2401687, AR2404050, AR2501973, AR2403249, AR2405795, AR2400676, AR2602423, AR2600014, AR2404194, AR2603235, AR2403880, AR2406297, AR2403739, AR2501555, AR2401187, AR2402752, AR2405868); NO: 8 (AR2403608, AR2405795, AR2400342, AR2600707, AR2403950, AR2603907, AR2405541, AR2400478) |
| ventana | NO: 34 (AR2404598, AR2502297, AR2600968, AR2403608, AR2502766, AR2400342, AR2600707, AR2403127, AR2401000, AR2603744, AR2603438, AR2602769, AR2403950, AR2401566, AR2502379, AR2603907, AR2401687, AR2404050, AR2501973, AR2405541, AR2403249, AR2400676, AR2602423, AR2400478, AR2600014, AR2404194, AR2603235, AR2403880, AR2406297, AR2403739, AR2501555, AR2401187, AR2402752, AR2405868) |
| rotulacion | NO: 34 (AR2404598, AR2502297, AR2600968, AR2403608, AR2502766, AR2405795, AR2400342, AR2600707, AR2403127, AR2401000, AR2603744, AR2603438, AR2602769, AR2403950, AR2401566, AR2502379, AR2603907, AR2401687, AR2404050, AR2501973, AR2405541, AR2403249, AR2602423, AR2400478, AR2600014, AR2404194, AR2603235, AR2403880, AR2406297, AR2403739, AR2501555, AR2401187, AR2402752, AR2405868); SIN LOGO NI ETIQUETA: 1 (AR2400676) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 38 (AR2404598, AR2404880, AR2405072, AR2405795, AR2404597, AR2400342, AR2501765, AR2404840, AR2400537, AR2403127, AR2401000, AR2405388, AR2402988, AR2402779, AR2403950, AR2403335, AR2404050, AR2403442, AR2403249, AR2502181, AR2402954, AR2400676, AR2402471, AR2401187, AR2405926, AR2405748, AR2402238, AR2404836, AR2406558, AR2405271, AR2404166, AR2404596, AR2403276, AR2406081, AR2402415, AR2402752, AR2501687, AR2405421); LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 17 (AR2502379, AR2500908, AR2502766, AR2502555, AR2603086, AR2602929, AR2603744, AR2603438, AR2601407, AR2501973, AR2602423, AR2601067, AR2600014, AR2501554, AR2501253, AR2603235, AR2501555); LONA ALPHA 1L 580  :NEGRO :250 AN: 13 (AR2500908, AR2600968, AR2500354, AR2404156, AR2600707, AR2402629, AR2603360, AR2603236, AR2404704, AR2404919, AR2403880, AR2506098, AR2406297); LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 12 (AR2502297, AR2500388, AR2602769, AR2401566, AR2603907, AR2405138, AR2405541, AR2404510, AR2404383, AR2405387, AR2405868, AR2400131); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 6 (AR2402238, AR2405987, AR2501441, AR2501009, AR2402895, AR2603056); LONA STARPLUS 1L 610  :ROJO RAL3002 :250 AN: 3 (AR2403608, AR2501009, AR2401000); LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 3 (AR2402954, AR2401000, AR2403541); LONA STARPLUS 1L 610:CREMA RA1014:250 AN: 3 (AR2403060, AR2401687, AR2404194); LONA G650 2L 650 :GRIS RAL7037 :250 AN (M5736): 3 (AR2501253, AR2501066, AR2400225); LONA ALPHA 1L 580: AZUL EUROPA-95 : 220 AN: 2 (AR2601173, AR2600972); LONA NS86 2L 630GR [580]: ROJO (COR/400): 250 AN: 2 (AR2501177, AR2501253); LONA STARPLUS 1L 610:MARFIL RAL1013:250 AN: 2 (AR2401187, AR2400478); LONA ALPHA 1L 580 :AMARILLO RAL1018 :250 AN: 2 (AR2502379, AR2600250); LONA MONZA 1 L 580 G/M2: GRIS RAL 7037: 250 AN: 2 (AR2601635, AR2503188); LONA ALPHA 1L 580 :NARANJA RAL2004 :250 AN: 2 (AR2400225, AR2601090); LONA NS86 2L 630GR[580:crema 1015 :250 AN: 1 (AR2604224); LONA ALPHA 1L 580: VERDE RAL 6026: 220 AN: 1 (AR2400342); LONA RECORD 1 L 580:GRIS 095 RAL 7038:220 AN: 1 (AR2401443); LONA RECORD 1 L 580:BLANCO 099 RAL 9010:220 AN: 1 (AR2403739) |
| modo | SEGUN SE INDICA: 78 (AR2502379, AR2500908, AR2604224, AR2400342, AR2404598, AR2402238, AR2600968, AR2405072, AR2403608, AR2502766, AR2402954, AR2601173, AR2404597, AR2404840, AR2404156, AR2603086, AR2400537, AR2600707, AR2402629, AR2501177, AR2602929, AR2403127, AR2401000, AR2405388, AR2603744, AR2603438, AR2602769, AR2402988, AR2402779, AR2403950, AR2401566, AR2401187, AR2603360, AR2601407, AR2603907, AR2405138, AR2601635, AR2403060, AR2403335, AR2603236, AR2401687, AR2404050, AR2403442, AR2403249, AR2400676, AR2402471, AR2404704, AR2601067, AR2401443, AR2400478, AR2600014, AR2501554, AR2404194, AR2405748, AR2404836, AR2404919, AR2406558, AR2603235, AR2503188, AR2403880, AR2501441, AR2404510, AR2600250, AR2506098, AR2406297, AR2404166, AR2403541, AR2404596, AR2601090, AR2403739, AR2403276, AR2402895, AR2404383, AR2402415, AR2405387, AR2603056, AR2402752, AR2405421); REPARTIDOS: 24 (AR2404880, AR2502297, AR2500354, AR2405795, AR2502555, AR2501765, AR2500388, AR2600972, AR2405987, AR2501973, AR2405541, AR2501009, AR2502181, AR2602423, AR2501253, AR2501066, AR2405926, AR2400225, AR2405271, AR2501555, AR2406081, AR2405868, AR2501687, AR2400131) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 205 × 145 | 2,5; 49,5; 96,5; 143,5 | 2,5; 49,5; 96,5; 143,5 | 2,5; 42,7; 82,9; 123,1; 163,3; 203,5 | Vigente v5; se conserva. AR2604990; OT/2026/AR2604990.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2604990. |
| baqueton; 258 × 132 | 2,5; 28,1; 53,7; 79,3; 104,9; 130,5 | 2,5; 28,1; 53,7; 79,3; 104,9; 130,5 | 2,5; 30,7; 58,9; 87,2; 115,4; 143,6; 171,8; 200,1; 228,3; 256,5 | Vigente v5; se conserva. AR2605082; OT/2026/AR2605082.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605082. |
| lona; 202 × 127 | 2,5; 33,3; 64; 94,8; 125,5 | 2,5; 33,3; 64; 94,8; 125,5 | 2,5; 42,1; 81,7; 121,3; 160,9; 200,5 | Vigente v5; se conserva. AR2605126; OT/2026/AR2605126.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605126. |
| lona; 172 × 127 | 2,5; 43,5; 84,5; 125,5 | 2,5; 43,5; 84,5; 125,5 | 2,5; 30,5; 58,5; 86,5; 114,5; 142,5; 170,5 | Vigente v5; se conserva. AR2605127; OT/2026/AR2605127.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605127. |
| baqueton; 100 × 70 | 2,5; 15,7; 28,9; 42,1; 55,3; 68,5 | 2,5; 15,7; 28,9; 42,1; 55,3; 68,5 | 2,5; 21,7; 40,9; 60,1; 79,3; 98,5 |  AR2402238; OT/2024/AR2402238-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402238. |
| baqueton; 102 × 62 | 2,5; 21,8; 41,2; 60,5 | 2,5; 21,8; 41,2; 60,5 | 2,5; 35,2; 67,8; 100,5 |  AR2601090; OT/2026/AR2601090.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601090. |
| baqueton; 102 × 74 | 2,5; 25,8; 49,2; 72,5 | 2,5; 25,8; 49,2; 72,5 | 2,5; 27; 51,5; 76; 100,5 |  AR2603360; OT/2026/AR2603360.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2603236, AR2603360. |
| baqueton; 107 × 102 | 2,5; 27,3; 52; 75,8; 100,5 | 2,5; 27,3; 52; 75,8; 100,5 | 2,5; 27,3; 52; 76,8; 105,5 |  AR2401443; OT/2024/AR2401443.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401443. |
| baqueton; 114 × 95 | 2,5; 32,8; 63,2; 93,5 | 2,5; 32,8; 63,2; 93,5 | 2,5; 30; 57,5; 85; 112,5 |  AR2402629; OT/2024/AR2402629.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402629. |
| baqueton; 116 × 104 | 2,5; 31,7; 42,5; 62,5; 82,5; 102,5 | 2,5; 22,5; 42,5; 62,5; 82,5; 102,5 | 2,5; 24,9; 47,3; 69,7; 92,1; 114,5 |  AR2501687; OT/2025/AR2501687.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501687. |
| baqueton; 116 × 105 | 2,5; 19,3; 36,2; 53; 69,8; 86,7; 103,5 | 2,5; 19,3; 36,2; 53; 69,8; 86,7; 103,5 | 2,5; 18,5; 34,5; 50,5; 66,5; 82,5; 98,5; 114,5 |  AR2601407; OT/2026/AR2601407.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601407. |
| baqueton; 120 × 103 | 2,5; 22,3; 42,1; 61,9; 81,7; 101,5 | 2,5; 22,3; 42,1; 61,9; 81,7; 101,5 | 2,5; 21,8; 41,2; 60,5; 79,8; 99,2; 118,5 |  AR2501554; OT/2025/AR2501554.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501554. |
| baqueton; 121 × 105 | 2,5; 22,7; 42,9; 63,1; 83,3; 103,5 | 2,5; 22,7; 42,9; 63,1; 83,3; 103,5 | 2,5; 22; 41,5; 61; 80,5; 100; 119,5 |  AR2601173; OT/2026/AR2601173.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601173. |
| baqueton; 130 × 110 | 2,5; 29; 55,5; 82; 108,5 | 2,5; 29; 55,5; 82; 108,5 | 2,5; 26,2; 52,4; 78,6; 104,8; 128,5 |  AR2405421; OT/2024/AR2405421.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405421. |
| baqueton; 133 × 105 | 2,5; 22,7; 42,9; 63,1; 83,3; 103,5 | 2,5; 22,7; 42,9; 63,1; 83,3; 103,5 | 2,5; 28,3; 54,1; 79,9; 105,7; 131,5 |  AR2402988; OT/2024/AR2402988.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402988. |
| baqueton; 140 × 107 | 2,5; 36,8; 71,2; 105,5 | 2,5; 36,8; 71,2; 105,5 | 2,5; 23,7; 54,9; 86,1; 117,3; 138,5 |  AR2404704; OT/2024/ar2404704.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404704. |
| baqueton; 144 × 124 | 2,5; 22,5; 42,5; 62,5; 82,5; 102,5; 122,5 | 2,5; 22,5; 42,5; 62,5; 82,5; 102,5; 122,5 | 2,5; 22,5; 42,5; 62,5; 82,5; 102,5; 122,5; 142,5 |  AR2600250; OT/2026/AR2600250.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600250. |
| baqueton; 149 × 104 | 2,5; 35,3; 69,7; 102,5 | 2,5; 35,3; 69,7; 102,5 | 2,5; 28,2; 59,4; 90,6; 121,8; 147,5 |  AR2403060; OT/2024/AR2403060.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403060. |
| baqueton; 152 × 107 | 2,5; 28,3; 54; 79,8; 105,5 | 2,5; 28,3; 54; 79,8; 105,5 | 2,5; 27,2; 51,8; 76,5; 101,2; 125,8; 150,5 |  AR2502379; OT/2025/AR2502379-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502379. |
| baqueton; 154 × 107 | 2,5; 23,1; 43,7; 64,3; 84,9; 105,5 | 2,5; 23,1; 43,7; 64,3; 84,9; 105,5 | 2,5; 21,3; 40; 58,8; 77,5; 96,3; 115; 133,8; 152,5 |  AR2603086; OT/2026/AR2603086.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603086. |
| baqueton; 154 × 112 | 2,5; 24,1; 45,7; 67,3; 88,9; 110,5 | 2,5; 24,1; 45,7; 67,3; 88,9; 110,5 | 2,5; 21,3; 40; 58,8; 77,5; 96,3; 115; 133,8; 152,5 |  AR2506098; OT/2025/AR2506098.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506098. |
| baqueton; 157 × 110 | 2,5; 29; 55,5; 82; 108,5 | 2,5; 29; 55,5; 82; 108,5 | 2,5; 32,2; 63,4; 94,6; 125,8; 155,5 |  AR2403335; OT/2024/AR2403335.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403335. |
| baqueton; 157 × 117 | 2,5; 30,8; 59; 87,3; 115,5 | 2,5; 30,8; 59; 87,3; 115,5 | 2,5; 33,1; 63,7; 94,3; 124,9; 155,5 |  AR2403442; OT/2024/AR2403442.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403442. |
| baqueton; 158 × 102 | 2,5; 35,2; 67,8; 100,5 | 2,5; 35,2; 67,8; 100,5 | 2,5; 33,3; 64,1; 94,9; 125,7; 156,5 |  AR2406558; OT/2024/AR2406558.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406558. |
| baqueton; 158 × 103 | 2,5; 35,5; 68,5; 101,5 | 2,5; 35,5; 68,5; 101,5 | 2,5; 33,3; 64,1; 94,9; 125,7; 156,5 |  AR2501066; OT/2025/AR2501066.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501066. |
| baqueton; 158 × 108 | 2,5; 23,3; 44,1; 64,9; 85,7; 106,5 | 2,5; 23,3; 44,1; 64,9; 85,7; 106,5 | 2,5; 4,5; 29,5; 54,5; 79,5; 104,5; 129,5; 154,5; 156,5 |  AR2401000; OT/2024/AR2401000-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401000. |
| baqueton; 158 × 118 | 2,5; 16,8; 31; 45,3; 59,5; 73,8; 88; 102,3; 116,5 | 2,5; 16,8; 31; 45,3; 59,5; 73,8; 88; 102,3; 116,5 | 2,5; 17,9; 33,3; 48,7; 64,1; 79,5; 94,9; 110,3; 125,7; 141,1; 156,5 |  AR2503188; OT/2025/AR2503188.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503188. |
| baqueton; 158 × 137 | 2,5; 35,8; 69; 102,3; 135,5 | 2,5; 35,8; 69; 102,3; 135,5 | 2,5; 21,8; 41; 60,3; 79,5; 98,8; 118; 137,3; 156,5 |  AR2405387; OT/2024/AR2405387.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405387. |
| baqueton; 162 × 148 | 2,5; 21,4; 39,3; 57,1; 75; 92,9; 110,8; 128,6; 146,5 | 2,5; 21,4; 39,3; 57,1; 75; 92,9; 110,8; 128,6; 146,5 | 2,5; 22,3; 42; 61,8; 81,5; 101,3; 121; 140,8; 160,5 |  AR2401566; OT/2024/AR2401566.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401566. |
| baqueton; 163 × 123 | 2,5; 32,3; 62; 91,8; 121,5 | 2,5; 32,3; 62; 91,8; 121,5 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 |  AR2604802; OT/2026/AR2604802.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2604802. |
| baqueton; 163 × 133 | 2,5; 18,6; 34,8; 50,9; 67; 83,1; 99,3; 115,4; 131,5 | 2,5; 18,6; 34,8; 50,9; 67; 83,1; 99,3; 115,4; 131,5 | 2,5; 18,4; 34,3; 50,2; 66,1; 82; 97,9; 113,8; 129,7; 145,6; 161,5 |  AR2402238; OT/2024/AR2402238-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402238. |
| baqueton; 164 × 122 | 2,5; 31,7; 41,8; 61,5; 81,2; 100,8; 120,5 | 2,5; 22,2; 41,8; 61,5; 81,2; 100,8; 120,5 | 2,5; 22,5; 42,5; 62,5; 82,5; 102,5; 122,5; 142,5; 162,5 |  AR2405926; OT/2024/AR2405926.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405926. |
| baqueton; 164 × 124 | 2,5; 42,5; 82,5; 122,5 | 2,5; 42,5; 82,5; 122,5 | 2,5; 42,5; 82,5; 122,5; 162,5 |  AR2401187; OT/2024/AR2401187-12.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401187. |
| baqueton; 167 × 127 | 2,5; 23; 43,5; 64; 84,5; 105; 125,5 | 2,5; 23; 43,5; 64; 84,5; 105; 125,5 | 2,5; 22,9; 43,3; 63,6; 84; 104,4; 124,8; 145,1; 165,5 |  AR2603056; OT/2026/AR2603056.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603056. |
| baqueton; 168 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68,1; 100,9; 133,7; 166,5 |  AR2404156; OT/2024/AR2404156.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404156. |
| baqueton; 172 × 127 | 2,5; 43,5; 84,5; 125,5 | 2,5; 43,5; 84,5; 125,5 | 2,5; 30,5; 58,5; 86,5; 114,5; 142,5; 170,5 |  AR2404383; OT/2024/AR2404383.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404383. |
| baqueton; 176 × 125 | 2,5; 17,6; 32,8; 47,9; 63; 78,1; 93,3; 108,4; 123,5 | 2,5; 17,6; 32,8; 47,9; 63; 78,1; 93,3; 108,4; 123,5 | 2,5; 21,6; 40,7; 59,8; 78,9; 98,1; 117,2; 136,3; 155,4; 174,5 |  AR2403541; OT/2024/AR2403541-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403541. |
| baqueton; 183 × 103 | 2,5; 22,3; 42,1; 61,9; 81,7; 101,5 | 2,5; 22,3; 42,1; 61,9; 81,7; 101,5 | 2,5; 22,4; 42,3; 62,2; 82,1; 101,9; 121,8; 141,7; 161,6; 181,5 |  AR2404597; OT/2024/AR2404597.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404597. |
| baqueton; 187 × 125 | 2,5; 26,7; 50,9; 75,1; 99,3; 123,5 | 2,5; 26,7; 50,9; 75,1; 99,3; 123,5 | 2,5; 25,4; 48,3; 71,1; 94; 116,9; 139,8; 162,6; 185,5 |  AR2401000; OT/2024/AR2401000-13.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401000. |
| baqueton; 202 × 127 | 2,5; 23; 43,5; 64; 84,5; 105; 125,5 | 2,5; 23; 43,5; 64; 84,5; 105; 125,5 | 2,5; 22,3; 42,1; 61,9; 81,7; 101,5; 121,3; 141,1; 160,9; 180,7; 200,5 |  AR2400537; OT/2024/AR2400537.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400537. |
| baqueton; 202 × 132 | 2,5; 31,7; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5 |  AR2501253; OT/2025/AR2501253-12.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501253. |
| baqueton; 202 × 146 | 2,5; 16,7; 30,9; 45,1; 59,3; 73,5; 87,7; 101,9; 116,1; 130,3; 144,5 | 2,5; 16,7; 30,9; 45,1; 59,3; 73,5; 87,7; 101,9; 116,1; 130,3; 144,5 | 2,5; 22,3; 42,1; 61,9; 81,7; 101,5; 121,3; 140,9; 160,9; 180,7; 200,5 |  AR2402415; OT/2024/AR2402415.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402415. |
| baqueton; 203 × 124 | 2,5; 32,5; 62,5; 92,5; 122,5 | 2,5; 32,5; 62,5; 92,5; 122,5 | 2,5; 35,7; 68,8; 102; 135,2; 168,3; 201,5 |  AR2604224; OT/2026/AR2604224.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604224. |
| baqueton; 203 × 127 | 2,5; 33,3; 64; 94,8; 125,5 | 2,5; 33,3; 64; 94,8; 125,5 | 2,5; 35,7; 68,8; 102; 135,2; 168,3; 201,5 |  AR2402471; OT/2024/AR2402471.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402471. |
| baqueton; 203 × 157 | 2,5; 28; 53,5; 79; 104,5; 130; 155,5 | 2,5; 28; 53,5; 79; 104,5; 130; 155,5 | 2,5; 27,4; 52,3; 77,1; 101,9; 126,9; 151,8; 176,6; 201,5 |  AR2404596; OT/2024/AR2404596.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404596. |
| baqueton; 204 × 110 | 14; 42; 70,5; 98 | 14; 42; 70,5; 98 | 35; 62; 89; 116; 143; 170 |  AR2402954; OT/2024/AR2402954.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402954 / 1 pedido(s): AR2402954. |
| baqueton; 209 × 121 | 2,5; 41,5; 80,5; 119,5 | 2,5; 41,5; 80,5; 119,5 | 2,5; 53,8; 105; 156,3; 207,5 |  AR2501441; OT/2025/AR2501441.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2501009, AR2501441. |
| baqueton; 210 × 143 | 2,5; 25,7; 48,8; 72; 95,2; 118,3; 141,5 | 2,5; 25,7; 48,8; 72; 95,2; 118,3; 141,5 | 2,5; 23,1; 43,7; 64,3; 84,9; 105,5; 126,1; 146,7; 167,3; 187,9; 208,5 |  AR2500908; OT/2025/AR2500908-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500908. |
| baqueton; 212 × 137 | 2,5; 17,3; 32,1; 46,8; 61,6; 76,4; 91,2; 105,9; 120,7; 135,5 | 2,5; 17,3; 32,1; 46,8; 61,6; 76,4; 91,2; 105,9; 120,7; 135,5 | 2,5; 23,3; 44,1; 64,9; 85,7; 106,5; 127,3; 148,1; 168,9; 189,7; 210,5 |  AR2405138; OT/2024/AR2405138.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405138. |
| baqueton; 214 × 123 | 2,5; 42,2; 81,8; 121,5 | 2,5; 42,2; 81,8; 121,5 | 2,5; 55; 107,5; 160; 212,5 |  AR2405072; OT/2024/AR2405072.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405072. |
| baqueton; 217 × 140 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 38; 73,5; 109; 144,5; 180; 215,5 |  AR2400342; OT/2024/ar2400342.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2400342 / 1 pedido(s): AR2406081. |
| baqueton; 217 × 142 | 2,5; 37,5; 71,5; 105,5; 140,5 | 2,5; 37,5; 71,5; 105,5; 140,5 | 2,5; 38; 73,5; 109; 144,5; 180; 215,5 |  AR2402752; OT/2024/AR2402752.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402752. |
| baqueton; 220 × 138 | 2,5; 31,7; 69,5; 103; 136,5 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 33,4; 64,2; 95,1; 125,9; 156,8; 187,7; 218,5 |  AR2500388; OT/2025/AR2500388.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500388. |
| baqueton; 222 × 148 | 2,5; 23,1; 43,6; 64,2; 84,8; 105,4; 125,9; 146,5 | 2,5; 23,1; 43,6; 64,2; 84,8; 105,4; 125,9; 146,5 | 2,5; 46,1; 89,7; 133,3; 176,9; 220,5 |  AR2404919; OT/2024/AR2404919.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404919. |
| baqueton; 223 × 127 | 2,5; 23; 43,5; 64; 84,5; 105; 125,5 | 2,5; 23; 43,5; 64; 84,5; 105; 125,5 | 2,5; 24,4; 46,4; 68,2; 90,1; 112; 133,9; 155,8; 177,7; 199,6; 221,5 |  AR2403276; OT/2024/AR2403276.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403276. |
| baqueton; 232 × 132 | 26; 66,5; 107 | 26; 66,5; 107 | 20,5; 68,5; 116,5; 164,5; 212,5 |  AR2502379; OT/2025/AR2502379-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502379. |
| baqueton; 242 × 131 | 2,5; 27,9; 53,3; 78,7; 104,1; 129,5 | 2,5; 27,9; 53,3; 78,7; 104,1; 129,5 | 2,5; 26,3; 50,1; 73,9; 97,7; 121,5; 145,3; 168,9; 192,9; 216,7; 240,5 |  AR2502555; OT/2025/AR2502555.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502555. |
| baqueton; 245 × 138 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 36,9; 71,4; 105,8; 140,2; 174,7; 210,1; 243,5 |  AR2500354; OT/2025/AR2500354.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500354. |
| baqueton; 246 × 99 | 14,4; 38,1; 61,9; 85,6 | 14,4; 38,1; 61,9; 85,6 | 2,5; 26,7; 50,9; 75,1; 99,3; 123,5; 147,7; 171,9; 196,1; 220,3; 244,5 |  AR2602929; OT/2026/AR2602929.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602929. |
| baqueton; 252 × 128 | 2,5; 27,3; 52,1; 76,9; 101,7; 126,5 | 2,5; 27,3; 52,1; 76,9; 101,7; 126,5 | 2,5; 27,3; 52,1; 76,9; 101,7; 126,5; 151,3; 176,1; 200,9; 225,7; 250,5 |  AR2501009; OT/2025/AR2501009-11.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501009. |
| baqueton; 257 × 135 | 2,5; 24,3; 46,2; 68; 89,8; 111,7; 133,5 | 2,5; 24,3; 46,2; 68; 89,8; 111,7; 133,5 | 23,6; 44,7; 65,8; 86,8; 107,9; 129; 150,1; 171,2; 192,3; 213,3; 234,4 |  AR2500908; OT/2025/AR2500908.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500908. |
| baqueton; 260 × 138 | 2,5; 31,7; 56,1; 82,9; 109,7; 136,5 | 2,5; 29,3; 56,1; 82,9; 109,7; 136,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2501253; OT/2025/AR2501253-11.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501253. |
| baqueton; 262 × 142 | 2,5; 37; 71,5; 106; 140,5 | 2,5; 37; 71,5; 106; 140,5 | 2,5; 34,8; 67; 99,3; 131,5; 163,8; 196; 228,3; 260,5 |  AR2402779; OT/2024/AR2402779.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402779. |
| baqueton; 262 × 143 | 2,5; 31,7; 68,5; 101,5; 134,5 | 6; 39; 72; 105; 138 | 31; 64,5; 98; 131,5; 165; 198,5; 232 |  AR2502181; OT/2025/AR2502181.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502181. |
| baqueton; 265 × 157 | 2,5; 33,1; 63,7; 94,3; 124,9; 155,5 | 2,5; 33,1; 63,7; 94,3; 124,9; 155,5 | 2,5; 54,7; 106,9; 159,1; 211,3; 263,5 |  AR2404166; OT/2024/AR2404166.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404166. |
| baqueton; 267 × 137 | 2,5; 35,8; 69; 102,3; 135,5 | 2,5; 35,8; 69; 102,3; 135,5 | 2,5; 31,7; 60,9; 119,4; 148,6; 177,8; 207,1; 236,3; 265,5 |  AR2405748; OT/2024/AR2405748.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405748. |
| baqueton; 268 × 160 | 2,5; 18,1; 33,7; 49,3; 64,9; 80,5; 96,1; 111,7; 127,3; 142,9; 158,5 | 2,5; 18,1; 33,7; 49,3; 64,9; 80,5; 96,1; 111,7; 127,3; 142,9; 158,5 | 53,85; 68,55; 83,15; 97,85; 112,55; 127,15; 141,85; 156,55; 171,15; 185,85; 200,55; 215,15 |  AR2404836; OT/2024/AR2404836.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404836. |
| baqueton; 303 × 171 | 2,5; 27,3; 35,9; 69,3; 102,7; 136,1 | 2,5; 27,3; 35,9; 69,3; 102,7; 136,1 | 2,5; 45,2; 87,9; 130,6; 173,4; 216,1; 258,8; 301,5 |  AR2405388; OT/2024/AR2405388.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405388. |
| baqueton; 350 × 250 | 2,5; 39,5; 82,5; 125,5; 168,5; 211,5; 248,5 | 2,5; 39,5; 82,5; 125,5; 168,5; 211,5; 248,5 | 2,5; 12,7; 22,9; 33; 43,2; 53,4; 63,6; 73; 83,9; 94,1; 104,3; 114,4 |  AR2402895; OT/2024/AR2402895.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402895. |
| lona; 122 × 109 | 2,5; 23,5; 44,5; 65,5; 86,5; 107,5 | 2,5; 23,5; 44,5; 65,5; 86,5; 107,5 | 2,5; 22,2; 41,8; 61,5; 81,2; 100,8; 120,5 |  AR2403950; OT/2024/AR2403950.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403950. |
| lona; 123 × 103 | 2,5; 16,6; 30,8; 44,9; 59,1; 73,2; 87,4; 101,5 | 2,5; 16,6; 30,8; 44,9; 59,1; 73,2; 87,4; 101,5 | 2,5; 17,4; 32,3; 47,1; 62; 76,9; 91,8; 106,6; 121,5 |  AR2403249; OT/2024/AR2403249.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403249. |
| lona; 127 × 107 | 5,5; 32,5; 54; 75,5; 102,5 | 5,5; 32,5; 54; 75,5; 102,5 | 5; 32; 64; 96; 123 |  AR2602769; OT/2026/AR2602769.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2602769 / 1 pedido(s): AR2602423. |
| lona; 132 × 102 | 2,5; 35,2; 67,8; 100,5 | 2,5; 35,2; 67,8; 100,5 | 2,5; 34,5; 66,5; 98,5; 130,5 |  AR2502297; OT/2025/AR2502297.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502297. |
| lona; 143 × 110 | 2,5; 29; 55,5; 82; 108,5 | 2,5; 29; 55,5; 82; 108,5 | 2,5; 30,3; 58,1; 85,9; 113,7; 141,5 |  AR2405541; OT/2024/AR2405541.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405541. |
| lona; 152 × 118 | 2,5; 25,3; 48,1; 70,9; 93,7; 116,5 | 2,5; 25,3; 48,1; 70,9; 93,7; 116,5 | 2,5; 27,2; 51,8; 76,5; 101,2; 125,8; 150,5 |  AR2600707; OT/2026/AR2600707.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600707. |
| lona; 152 × 128 | 2,5; 27,3; 52,1; 76,9; 101,7; 126,5 | 2,5; 27,3; 52,1; 76,9; 101,7; 126,5 | 2,5; 27,2; 51,8; 76,5; 101,2; 125,8; 150,5 |  AR2600968; OT/2026/AR2600968.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600968. |
| lona; 154 × 109 | 2,5; 35,3; 74,7; 107,5 | 2,5; 35,3; 74,7; 107,5 | 3; 32,8; 62,6; 92,4; 122,2; 152 |  AR2403880; OT/2024/AR2403880.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403880. |
| lona; 157 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 40,9; 79,3; 117,9; 155,5 |  AR2401566; OT/2024/AR2401566.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401566. |
| lona; 162 × 122 | 2,5; 41,8; 81,2; 120,5 | 2,5; 41,8; 81,2; 120,5 | 2,5; 42,3; 81,5; 120,8; 160,5 |  AR2401187; OT/2024/AR2401187-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401187. |
| lona; 163 × 123 | 2; 22; 42; 62; 82; 102; 122 | 2; 22; 42; 62; 82; 102; 122 | 2; 22; 42; 62; 82; 102; 122; 142; 162 |  AR2400676; OT/2024/AR2400676.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400676. |
| lona; 165 × 105 | 2,5; 22,7; 42,9; 63,1; 83,3; 103,5 | 2,5; 22,7; 42,9; 63,1; 83,3; 103,5 | 2,5; 34,7; 66,9; 99,1; 131,3; 163,5 |  AR2400478; OT/2024/AR2400478.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400478. |
| lona; 182 × 132 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 32; 62; 91,5; 121; 151; 180,5 |  AR2404050; OT/2024/AR2404050.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404050. |
| lona; 202 × 122 | 2,5; 41,8; 81,2; 120,5 | 2,5; 41,8; 81,2; 120,5 | 2,5; 42,1; 81,7; 121,3; 160,9; 200,5 |  AR2405868; OT/2024/AR2405868.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405868. |
| lona; 202 × 142 | 2,5; 30,1; 57,7; 85,3; 112,9; 140,5 | 2,5; 30,1; 57,7; 85,3; 112,9; 140,5 | 2,5; 27,3; 52; 76,8; 101,5; 126,3; 151; 175,8; 200,5 |  AR2401687; OT/2024/AR2401687.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401687. |
| lona; 205 × 137 | 2,5; 35,8; 69; 102,3; 135,5 | 2,5; 35,8; 69; 102,3; 135,5 | 2,5; 42,7; 82,9; 123,1; 163,3; 203,5 |  AR2400342; OT/2024/AR2400342-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400342. |
| lona; 206 × 116 | 2,5; 30,5; 58,5; 86,5; 114,5 | 2,5; 30,5; 58,5; 86,5; 114,5 | 2,5; 27,8; 53; 78,3; 103,5; 128,8; 154; 179,3; 204,5 |  AR2600014; OT/2026/AR2600014.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600014. |
| lona; 207 × 107 | 2,5; 23,1; 43,7; 64,3; 84,9; 105,5 | 2,5; 23,1; 43,7; 64,3; 84,9; 105,5 | 2,5; 22,8; 43,1; 63,4; 83,7; 104; 124,3; 144,6; 164,9; 185,2; 205,5 |  AR2403608; OT/2024/AR2403608.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403608. |
| lona; 209 × 122 | 2,5; 41,8; 81,2; 120,5 | 2,5; 41,8; 81,2; 120,5 | 2,5; 36,7; 70,8; 105; 139,2; 173,3; 207,5 |  AR2502766; OT/2025/AR2502766.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2502379, AR2502766 / 1 pedido(s): AR2603744. |
| lona; 216 × 142 | 2,5; 37; 71,5; 106; 140,5 | 2,5; 37; 71,5; 106; 140,5 | 2,5; 32,8; 63,1; 93,4; 123,6; 153,9; 184,2; 214,5 |  AR2604944; OT/2026/AR2604944.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2604944. |
| lona; 218 × 119 | 2,5; 16,9; 45,6; 60; 74,4; 88,8; 103,1; 117,5 | 2,5; 16,9; 45,6; 60; 74,4; 88,8; 103,1; 117,5 | 2,5; 33,1; 63,6; 94,2; 124,8; 155,4; 185,9; 216,5 |  AR2401000; OT/2024/AR2401000-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401000. |
| lona; 220 × 139 | 2,5; 36,3; 70; 103,8; 137,5 | 2,5; 36,3; 70; 103,8; 137,5 | 2,5; 33,4; 64,2; 95,1; 125,9; 156,8; 187,6; 218,5 |  AR2603438; OT/2026/AR2603438.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603438. |
| lona; 222 × 195 | 42,7; 52,8; 62,8; 72,9; 82,9; 93; 103; 113,1; 123,1; 133,2; 143,2; 153,3 | 42,7; 52,8; 62,8; 72,9; 82,9; 93; 103; 113,1; 123,1; 133,2; 143,2; 153,3 | 54,4; 64,8; 75,2; 85,5; 95,9; 106,3; 116,7; 127,1; 137,4; 147,8; 158,2; 168,6 |  AR2404598; OT/2024/ar2404598.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404598. |
| lona; 244 × 135 | 12,6; 22,7; 32,8; 42,8; 52,9; 63; 73,1; 83,1; 93,2; 103,3; 113,4; 123,4 | 12,6; 22,7; 32,8; 42,8; 52,9; 63; 73,1; 83,1; 93,2; 103,3; 113,4; 123,4 | 2,5; 12,8; 23; 33,3; 43,5; 53,8; 64,1; 74,3; 84,6; 94,1; 105,1; 115,4 |  AR2406297; OT/2024/AR2406297.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406297. |
| lona; 244 × 137 | 12,7; 23; 33,2; 43,4; 53,7; 63,9; 74,1; 84,3; 94,6; 104,8; 115; 125,3 | 12,7; 23; 33,2; 43,4; 53,7; 63,9; 74,1; 84,3; 94,6; 104,8; 115; 125,3 | 36,8; 71,1; 105,4; 139,6; 173,9; 208,2 |  AR2603235; OT/2026/AR2603235.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603235. |
| lona; 245 × 138 | 2,5; 47,2; 91,8; 136,5 | 2,5; 47,2; 91,8; 136,5 | 3; 43; 83; 123; 163; 203; 243 |  AR2405795; OT/2024/AR2405795-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405795. |
| lona; 247 × 143 | 2,5; 48,8; 95,2; 141,5 | 2,5; 48,8; 95,2; 141,5 | 2,5; 43; 83,5; 124; 164,5; 205; 245,5 |  AR2501555; OT/2025/AR2501555.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501555. |
| lona; 257 × 149 | 2,5; 31,5; 60,5; 89,5; 118,5; 147,5 | 2,5; 31,5; 60,5; 89,5; 118,5; 147,5 | 2,5; 44,7; 86,8; 129; 171,2; 213,3; 255,5 |  AR2402752; OT/2024/AR2402752.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402752. |
| lona; 268 × 148 | 2,5; 23,1; 43,6; 64,2; 84,8; 105,4; 125,9; 146,5 | 2,5; 23,1; 43,6; 64,2; 84,8; 105,4; 125,9; 146,5 | 13,5; 35,5; 57,5; 79,5; 101,5; 123,5; 145,5; 167,5; 189,5; 211,5; 233,5; 255,5 |  AR2403127; OT/2024/AR2403127.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403127. |
| lona; 301 × 101 | 2,5; 34,8; 67,2; 99,5 | 2,5; 34,8; 67,2; 99,5 | 17,35; 47,05; 76,75; 106,45; 136,15; 165,85; 195,55; 225,25; 254,95; 284,65 |  AR2404194; OT/2024/AR2404194.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404194. |
| lona; 62 × 62 | 2,5; 9,2; 18,1; 27; 36; 44,9; 53,8; 60,5 | 2,5; 9,2; 18,1; 27; 36; 44,9; 53,8; 60,5 | 2,5; 8,7; 17,6; 26,5; 35,5; 44,4; 53,3; 60,5 |  AR2403739; OT/2024/AR2403739.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403739. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 92 × 50 | AR2400131 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400131.dwg; OT/2024/AR2400131.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 202 × 112 | AR2400225 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400225-1.xlsb; OT/2024/AR2400225-2.xlsb; OT/2024/AR2400225.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 226 × 115 | AR2400225 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400225-1.xlsb; OT/2024/AR2400225-2.xlsb; OT/2024/AR2400225.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 158 × 120 | AR2400478 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400478.dwg; OT/2024/AR2400478.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 213 × 133 | AR2401000 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2401000-10.xlsb; OT/2024/AR2401000-11.xlsb; OT/2024/AR2401000-12.xlsb; OT/2024/AR2401000-13.xlsb; OT/2024/AR2401000.dwg; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 258 × 141 | AR2401187 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2401187-10.xlsb; OT/2024/AR2401187-11.xlsb; OT/2024/AR2401187-12.xlsb; OT/2024/AR2401187.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 126 × 106 | AR2402954 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2402954-10.xlsb; OT/2024/AR2402954-11.xlsb; OT/2024/AR2402954.dwg; OT/2024/AR2402954.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 194 × 143 | AR2403541 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2403541-10.xlsb; OT/2024/AR2403541-11.xlsb; OT/2024/ar2403541.dwg; OT/2024/ar2403541.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 122 × 112 | AR2404510 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404510.dwg; OT/2024/AR2404510.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 270 × 160 | AR2404840 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404840.dwg; OT/2024/AR2404840.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 131 × 95 | AR2404880 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404880.dwg; OT/2024/AR2404880.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 112 × 157 | AR2405271 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405271.dwg; OT/2024/AR2405271.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 107 × 128 | AR2405540 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405540.dwg; OT/2024/AR2405540.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 254 × 158 | AR2405795 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405795-10.xlsb; OT/2024/AR2405795-11.xlsb; OT/2024/AR2405795.dwg; OT/2024/AR2405795.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 164 × 134 | AR2405987 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405987.dwg; OT/2024/AR2405987.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 140 × 55 | AR2501177 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501177.dwg; OT/2025/AR2501177.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 210 × 136 | AR2501253 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501253-10.xlsb; OT/2025/AR2501253-11.xlsb; OT/2025/AR2501253-12.xlsb; OT/2025/AR2501253.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 311 × 172 | AR2501765 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501765.dwg; OT/2025/AR2501765.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 185 × 132 | AR2501973 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501973.dwg; OT/2025/AR2501973.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 220 × 120 | AR2600972 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2600972.dwg; OT/2026/AR2600972.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 228 × 136 | AR2601067 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601067.dwg; OT/2026/AR2601067.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 190 × 132 | AR2601172 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601172.dwg; OT/2026/AR2601172.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 170 × 125 | AR2601635 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601635.dwg; OT/2026/AR2601635.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 92 × 84 | AR2603907 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603907.dwg; OT/2026/AR2603907.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 265 × 135 | AR2604490 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604490.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ENGANCHES Y REMOLQUES AYALA S.L.U — 048286

Ficha: `ayala`. Histórico: **115 líneas / 42 pedidos**. PDF producidos adicionales examinados: 1. Registro vigente versión 7, conservado.

Código acreditado por histórico (AR2604276). Nombres/alias del histórico: ENGANCHES Y REMOLQUES AYALA S.L.U.

Plantillas encontradas: `PL/AYALA/AYALA.dwg`; `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUES BAQUETON AYALA.xls`

Reglas añadidas a la propuesta: `recogeDelante` = "NO"; `bastillaEnfundar` = false; `rotulacion` = false.

Campos vigentes que se respetan: `extrasBaqueton` = {"extraLargoCostura":1,"extraAnchoCostura":1,"extraBaquetonLargoDelante":0,"extraBaquetonLargoDetras":0,"extraLargoFinal":1,"extraAnchoFinal":1,"extraBaquetonTrasero":0,"observaciones":[]}; `recogeAtras` = "GOMA"; `ventana` = {"lleva":false}.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 23 (AR2400922, AR2504928, AR2503249, AR2502311, AR2601615, AR2503833, AR2603115, AR2501369, AR2401063, AR2405907, AR2603583, AR2505827, AR2403710, AR2505705, AR2402309, AR2401761, AR2400758, AR2500948, AR2600484, AR2406884, AR2602085, AR2500145, AR2500201); TIPO 03: 16 (AR2500201, AR2401042, AR2505827, AR2402309, AR2502311, AR2601895, AR2501007, AR2404016, AR2503833, AR2405961, AR2601615, AR2602175, AR2600484, AR2601896, AR2401761, AR2505795) |
| recogeDelante | NO: 30 (AR2500201, AR2401042, AR2400922, AR2504928, AR2503249, AR2601615, AR2505827, AR2402309, AR2503833, AR2603115, AR2601895, AR2501369, AR2401063, AR2405907, AR2603583, AR2403710, AR2502311, AR2505705, AR2401761, AR2400758, AR2501007, AR2500948, AR2404016, AR2602175, AR2600484, AR2406884, AR2601896, AR2602085, AR2505795, AR2500145); GOMA: 2 (AR2502311, AR2405961) |
| recogeAtras | GOMA: 31 (AR2500201, AR2401042, AR2400922, AR2504928, AR2503249, AR2502311, AR2601615, AR2505827, AR2402309, AR2503833, AR2603115, AR2601895, AR2501369, AR2401063, AR2405907, AR2603583, AR2403710, AR2505705, AR2401761, AR2400758, AR2501007, AR2500948, AR2404016, AR2405961, AR2602175, AR2600484, AR2406884, AR2601896, AR2602085, AR2505795, AR2500145) |
| bastillaEnfundar | NO: 29 (AR2500201, AR2401042, AR2400922, AR2504928, AR2503249, AR2601615, AR2505827, AR2402309, AR2503833, AR2601895, AR2501369, AR2401063, AR2405907, AR2603583, AR2403710, AR2502311, AR2505705, AR2400758, AR2501007, AR2500948, AR2404016, AR2405961, AR2602175, AR2600484, AR2406884, AR2601896, AR2602085, AR2505795, AR2500145); SÍ: 2 (AR2502311, AR2603115) |
| ventana | NO: 31 (AR2500201, AR2401042, AR2400922, AR2504928, AR2503249, AR2502311, AR2601615, AR2505827, AR2402309, AR2503833, AR2603115, AR2601895, AR2501369, AR2401063, AR2405907, AR2603583, AR2403710, AR2505705, AR2401761, AR2400758, AR2501007, AR2500948, AR2404016, AR2405961, AR2602175, AR2600484, AR2406884, AR2601896, AR2602085, AR2505795, AR2500145) |
| rotulacion | NO: 30 (AR2500201, AR2401042, AR2400922, AR2504928, AR2503249, AR2502311, AR2601615, AR2505827, AR2402309, AR2503833, AR2603115, AR2601895, AR2501369, AR2401063, AR2405907, AR2603583, AR2403710, AR2505705, AR2401761, AR2400758, AR2501007, AR2500948, AR2404016, AR2602175, AR2600484, AR2406884, AR2601896, AR2602085, AR2505795, AR2500145) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 19 (AR2406443, AR2500201, AR2401042, AR2400922, AR2406126, AR2504301, AR2500145, AR2406884, AR2402309, AR2405907, AR2403710, AR2404942, AR2400758, AR2500948, AR2404016, AR2405961, AR2403190, AR2600484, AR2401761); LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 16 (AR2505703, AR2504928, AR2502311, AR2601615, AR2505827, AR2503833, AR2603115, AR2601895, AR2501369, AR2603583, AR2505705, AR2602175, AR2503249, AR2506095, AR2602085, AR2505795); LONA ALPHA 1L 580  :NEGRO :250 AN: 3 (AR2401063, AR2402309, AR2601615); LONA G650 2L 650 :GRIS RAL7037 :250 AN (M5736): 3 (AR2401761, AR2501007, AR2500948); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 2 (AR2503249, AR2601896); LONA ALPHA 1L 580 :NARANJA RAL2004 :250 AN: 2 (AR2603583, AR2500201) |
| modo | SEGUN SE INDICA: 36 (AR2406443, AR2505703, AR2401042, AR2400922, AR2504928, AR2503249, AR2406126, AR2502311, AR2504301, AR2601615, AR2505827, AR2406884, AR2402309, AR2405907, AR2503833, AR2603115, AR2601895, AR2501369, AR2401063, AR2603583, AR2403710, AR2505705, AR2404942, AR2401761, AR2400758, AR2501007, AR2500948, AR2404016, AR2405961, AR2403190, AR2602175, AR2600484, AR2506095, AR2601896, AR2602085, AR2505795); REPARTIDOS: 2 (AR2500201, AR2500145) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 222 × 130 | 8,5; 41,5; 90,5; 123 | 8,5; 41,5; 90,5; 123 | 7; 35; 83,5; 138,5; 187; 214,5 | Vigente v7; se conserva. AR2605129; OT/2026/AR2605129.pdf; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2600484, AR2605129 / 2 pedido(s): AR2502311, AR2504928 / 2 pedido(s): AR2400922, AR2401063 / 1 pedido(s): AR2402309. |
| baqueton; 200 × 130 | 6; 42; 91; 123,5 | 6; 42; 91; 123,5 | 7,5; 33,5; 77; 127; 170,5; 195,5 | Vigente v7; se conserva. AR2500948; OT/2025/AR2500948-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 3 pedido(s): AR2500145, AR2500948, AR2504928 / 2 pedido(s): AR2401761, AR2601615 / 1 pedido(s): AR2605129 / 1 pedido(s): AR2403710 / 1 pedido(s): AR2400758. |
| baqueton; 250 × 152 | 5; 32,5; 76,7; 121,5; 149 | 5; 32,5; 76,7; 121,5; 149 | 8; 33,5; 77; 127; 177; 220,5; 245,5 | Vigente v7; se conserva. AR2605129; OT/2026/AR2605129.pdf; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2605129 / 1 pedido(s): AR2600484 / 1 pedido(s): AR2401761. |
| baqueton; 250 × 170 | 15; 58; 112; 155 | 15; 58; 112; 155 | 8; 33,5; 77; 127; 177; 220,5; 245,5 | Vigente v7; se conserva. AR2605129; OT/2026/AR2605129.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605129. |
| baqueton; 140 × 105 | 5; 37,3; 69,7; 102 | 5; 37,3; 69,7; 102 | 5; 33,5; 70,5; 108; 137 |  AR2502311; OT/2025/AR2502311.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502311. |
| baqueton; 140 × 115 | 5; 36,3; 80,8; 112 | 5; 36,3; 80,8; 112 | 9; 32,5; 69,5; 107; 132 |  AR2506095; OT/2025/AR2506095-12.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506095. |
| baqueton; 150 × 105 | 10; 36,5; 69; 96 | 10; 36,5; 69; 96 | 12; 41; 75; 109; 139 |  AR2404016; OT/2024/AR2404016.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404016. |
| baqueton; 160 × 115 | 8,5; 41,8; 75,2; 108,5 | 8,5; 41,8; 75,2; 108,5 | 5; 34,5; 81; 127,5; 157 |  AR2504301; OT/2025/AR2504301.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2504301 / 1 pedido(s): AR2405907. |
| baqueton; 160 × 130 | 9; 42; 91; 123,5 | 9; 42; 91; 123,5 | 5; 34,5; 81; 127,5; 157 |  AR2500145; OT/2025/AR2500145-10.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500145. |
| baqueton; 170 × 130 | 9; 42; 91; 123,5 | 9; 42; 91; 123,5 | 5; 36; 86; 136; 167 |  AR2502311; OT/2025/AR2502311-12.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502311. |
| baqueton; 180 × 115 | 16,5; 58,5; 100,5 | 16,5; 58,5; 100,5 | 13; 60; 125,5; 171,5 |  AR2406443; OT/2024/AR2406443-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2406443 / 1 pedido(s): AR2406126 / 1 pedido(s): AR2400922. |
| baqueton; 180 × 130 | 9; 42; 91; 123,5 | 9; 42; 91; 123,5 | 7; 37,5; 94; 149,5; 177,5 |  AR2402309; OT/2024/AR2402309-3.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402309. |
| baqueton; 210 × 138 | 9; 44; 96; 131,5 | 9; 44; 96; 131,5 | 6,6; 34,6; 78,1; 130,1; 176,6; 204,5 |  AR2406443; OT/2024/AR2406443-12.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2406443 / 1 pedido(s): AR2406126. |
| baqueton; 220 × 130 | 9; 42; 91; 123,5 | 9; 42; 91; 123,5 | 7,5; 35; 83,5; 138,5; 187; 215 |  AR2505703; OT/2025/AR2505703.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 6 pedido(s): AR2406126, AR2406884, AR2504928, AR2505703, AR2601615, AR2603583 / 1 pedido(s): AR2406443 / 1 pedido(s): AR2405907 / 1 pedido(s): AR2404942. |
| baqueton; 220 × 140 | 10; 35; 72,5; 109,5; 133 | 10; 35; 72,5; 109,5; 133 | 7,5; 35; 83,5; 138,5; 187; 215 |  AR2500948; OT/2025/AR2500948-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2406884, AR2500948, AR2603583. |
| baqueton; 220 × 152 | 5; 32,5; 76,7; 121,5; 149 | 5; 32,5; 76,7; 121,5; 149 | 7,5; 35; 83,5; 138,5; 187; 215 |  AR2403710; OT/2024/AR2403710-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403710. |
| baqueton; 230 × 152 | 5; 32,5; 76,7; 121,5; 149 | 5; 32,5; 76,7; 121,5; 149 | 7,8; 36,6; 87,3; 144,7; 195,4; 224,7 |  AR2600484; OT/2026/AR2600484.xlsb / BAQUETÓN 0224958, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600484. |
| baqueton; 260 × 140 | 10; 35; 72,5; 109,5; 133 | 10; 35; 72,5; 109,5; 133 | 20; 71,5; 133; 193; 242,5 |  AR2404942; OT/2024/AR2404942-1.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404942. |
| baqueton; 264 × 164 | 5; 38,5; 82,7; 127,5; 161 | 5; 38,5; 82,7; 127,5; 161 | 6,5; 38,5; 82; 132; 182; 225,5; 258 |  AR2403190; OT/2024/AR2403190.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403190. |
| baqueton; 300 × 180 | 4,8; 32,5; 88,3; 144,5; 175 | 4,8; 32,5; 88,3; 144,5; 175 | 9; 40; 77; 114; 151; 188; 225; 262; 293,5 |  AR2502311; OT/2025/AR2502311-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502311. |
| baqueton; 302 × 154 | 5; 32,5; 76,7; 121,5; 149 | 5; 32,5; 76,7; 121,5; 149 | 9; 40; 77; 114; 151; 188; 225; 262; 293,5 |  AR2500145; OT/2025/AR2500145-11.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500145. |
| baqueton; 306 × 180 | 4,8; 32,5; 88,3; 144,5; 175 | 4,8; 32,5; 88,3; 144,5; 175 | 9; 40; 77; 114; 188; 225; 262; 293,5 |  AR2405907; OT/2024/AR2405907-13.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405907. |
| lona; 162 × 115 | 8; 41,3; 74,7; 108 | 8; 41,3; 74,7; 108 | 5,5; 35; 81,5; 128; 157,5 |  AR2503249; OT/2025/AR2503249-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2503249 / 1 pedido(s): AR2400758. |
| lona; 182 × 115 | 8; 41,3; 74,7; 108 | 8; 41,3; 74,7; 108 | 5,8; 33,5; 89,3; 145,5; 176 |  AR2503249; OT/2025/AR2503249.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503249. |
| lona; 182 × 130 | 8,5; 41,5; 90,5; 123 | 8,5; 41,5; 90,5; 123 | 7; 37,5; 93,8; 149,5; 177,3 |  AR2405907; OT/2024/AR2405907-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2401042, AR2401761, AR2405907 / 1 pedido(s): AR2505705. |
| lona; 183 × 130 | 8,5; 41,5; 90,5; 123 | 8,5; 41,5; 90,5; 123 | 8,5; 38,5; 92; 145; 175 |  AR2500201; OT/2025/AR2500201-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500201. |
| lona; 200 × 130 | 8,5; 41,5; 90,5; 123 | 8,5; 41,5; 90,5; 123 | 6,6; 31,6; 75,1; 125,1; 168,6; 194,5 |  AR2503833; OT/2025/AR2503833-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2503833, AR2602175 / 1 pedido(s): AR2400758. |
| lona; 202 × 130 | 8,5; 41,5; 90,5; 123 | 8,5; 41,5; 90,5; 123 | 8,6; 33,6; 77,1; 127,1; 170,6; 196,5 |  AR2500948; OT/2025/AR2500948-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 4 pedido(s): AR2500948, AR2502311, AR2504928, AR2601615 / 1 pedido(s): AR2500145 / 1 pedido(s): AR2404016 / 1 pedido(s): AR2402309. |
| lona; 220 × 150 | 5; 33,5; 75; 117; 146 | 5; 33,5; 75; 117; 146 | 7; 35; 83,5; 138,5; 187; 214,5 |  AR2600484; OT/2026/AR2600484.xlsb / LONA REMOLQUE 0224956, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600484. |
| lona; 222 × 132 | 9,5; 42,5; 91,5; 124 | 9,5; 42,5; 91,5; 124 | 7,3; 35,5; 84; 139,5; 187,5; 215,8 |  AR2406884; OT/2024/AR2406884-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2406884 / 1 pedido(s): AR2401761. |
| lona; 222 × 135 | 8,6; 43,8; 93,2; 127,9 | 8,6; 43,8; 93,2; 127,9 | 7; 35; 83,5; 138,5; 187; 214,5 |  AR2600484; OT/2026/AR2600484.xlsb / LONA REMOLQUE 0224955, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600484. |
| lona; 222 × 140 | 7; 30,5; 70; 110; 134 | 7; 30,5; 70; 110; 134 | 8; 35,5; 84; 139; 187,5; 215,5 |  AR2505795; OT/2025/AR2505795.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505795. |
| lona; 222 × 153 | 5; 32,5; 77,3; 121,5; 149 | 5; 32,5; 77,3; 121,5; 149 | 8; 35,5; 84; 139; 187,5; 215,5 |  AR2503833; OT/2025/AR2503833.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503833. |
| lona; 223 × 132 | 8,5; 42; 92; 125 | 8,5; 42; 92; 125 | 7; 35; 83,5; 138,5; 187; 214,54 |  AR2403710; OT/2024/AR2403710-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403710. |
| lona; 250 × 134 | 7,5; 27; 52; 85; 112,5 | 7,5; 30; 60,5; 89; 113 | 50,5; 80,5; 110,5; 140,5; 170,5; 200,5 |  AR2500948; OT/2025/AR2500948-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500948. |
| lona; 250 × 150 | 6,5; 31,5; 73,1; 116,7; 144,5 | 6,5; 31,5; 73,1; 116,7; 144,5 | 10,5; 38; 73; 108; 143; 178; 213; 240,5 |  AR2601896; OT/2026/AR2601896.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601896. |
| lona; 250 × 152 | 6,5; 31,9; 74,1; 118,3; 146 | 6,5; 31,9; 74,1; 118,3; 146 | 7; 32,5; 76; 126; 176; 219,5; 244,5 |  AR2500201; OT/2025/AR2500201-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2500201, AR2601895. |
| lona; 250 × 180 | 6,5; 36,5; 90; 143; 173,5 | 6,5; 36,5; 90; 143; 173,5 | 10,5; 38; 73; 108; 143; 178; 213; 240,5 |  AR2505827; OT/2025/AR2505827-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505827. |
| lona; 252 × 130 | 8,5; 41,5; 90,5; 123 | 8,5; 41,5; 90,5; 123 | 9; 34,5; 78; 128; 178; 221,5; 246,5 |  AR2402309; OT/2024/AR2402309-4.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402309. |
| lona; 252 × 152 | 10,75; 48,95; 103,95; 142,25 | 10,75; 48,95; 103,95; 142,25 | 11,5; 39; 74; 109; 144; 179; 214; 241,5 |  AR2602085; OT/2026/AR2602085.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 3 pedido(s): AR2501369, AR2505827, AR2602085 / 2 pedido(s): AR2400758, AR2400922 / 1 pedido(s): AR2402309. |
| lona; 252 × 172 | 16,5; 59,5; 113,5; 156,5 | 16,5; 59,5; 113,5; 156,5 | 8; 33,5; 77; 127; 177; 220,5; 245,5 |  AR2603583; OT/2026/AR2603583-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2405961, AR2603583. |
| lona; 253 × 132 | 8,75; 41,95; 90,95; 124,25 | 8,75; 41,95; 90,95; 124,25 | 8,5; 34; 77,5; 127,5; 177,5; 221; 246 |  AR2501007; OT/2025/AR2501007.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501007. |
| lona; 300 × 172 | 15,5; 59,5; 113,5; 157,5 | 15,5; 59,5; 113,5; 157,5 | 9; 40,5; 77,5; 114,5; 151,5; 188,5; 225,5; 262,5; 293,5 |  AR2603115; OT/2026/AR2603115.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603115. |
| lona; 303 × 173 | 17; 60; 114; 157 | 17; 60; 114; 157 | 8,5; 41; 78; 115; 152; 189; 226; 263; 296 |  AR2502311; OT/2025/AR2502311.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502311. |
| lona; 303 × 183 | 8; 38,5; 92; 150,5; 178,3 | 8; 38,5; 92; 150,5; 178,3 | 8,5; 41; 78; 115; 152; 189; 226; 263; 296 |  AR2502311; OT/2025/AR2502311-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502311. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 222 × 130 | AR2500145, AR2505705 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2500145-10.xlsb; OT/2025/AR2500145-11.xlsb; OT/2025/AR2500145-12.xlsb; OT/2025/AR2500145-13.xlsb; OT/2025/AR2500145.dwg; OT/2025/AR2505705-11.xlsb; OT/2025/AR2505705.dwg; OT/2025/AR2505705.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 252 × 132 | AR2501286 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501286-10.xlsb; OT/2025/AR2501286-11.xlsb; OT/2025/AR2501286-12.xlsb; OT/2025/AR2501286.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 220 × 130 | AR2505705 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2505705-11.xlsb; OT/2025/AR2505705.dwg; OT/2025/AR2505705.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 300 × 170 | AR2506095 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2506095-12.xlsb; OT/2025/AR2506095.dwg; OT/2025/AR2506095.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 252 × 182 | AR2602800 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602800.dwg; OT/2026/AR2602800.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 220 × 140 | AR2604276 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604276.dwg; OT/2026/AR2604276.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### NL DIGITAL — 049631

Ficha: `nl-digital`. Histórico: **91 líneas / 20 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504257). Nombres/alias del histórico: NL DIGITAL.

Plantillas encontradas: `PL/NL.DIGITAL/NL.DIGITAL.dwg`

Reglas añadidas a la propuesta: `ventana` = {"lleva":false}; `rotulacion` = false.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 16 (AR2404172, AR2404780, AR2404248, AR2403877, AR2504105, AR2404082, AR2403994, AR2503420, AR2503198, AR2503812, AR2405960, AR2503985, AR2504257, AR2404641, AR2404309, AR2403955); TIPO 02: 5 (AR2404172, AR2404082, AR2504257, AR2404248, AR2404641); TIPO 03: 1 (AR2404384) |
| recogeDelante | NO: 19 (AR2404172, AR2404248, AR2403877, AR2404082, AR2403994, AR2503420, AR2503198, AR2404780, AR2503812, AR2405960, AR2504105, AR2503985, AR2405518, AR2504257, AR2404384, AR2404783, AR2404309, AR2403955, AR2404641); CREMALLERA: 3 (AR2404780, AR2504105, AR2404641) |
| recogeAtras | CREMALLERA: 16 (AR2404780, AR2403877, AR2504105, AR2404172, AR2404082, AR2403994, AR2503985, AR2503812, AR2405518, AR2504257, AR2404384, AR2404783, AR2404641, AR2404309, AR2404248, AR2403955); NO: 12 (AR2404172, AR2404248, AR2404082, AR2403994, AR2503420, AR2503198, AR2403877, AR2503812, AR2405960, AR2503985, AR2504105, AR2504257) |
| bastillaEnfundar | SÍ: 19 (AR2404172, AR2404780, AR2404248, AR2403877, AR2504105, AR2404082, AR2403994, AR2503420, AR2503198, AR2503812, AR2405960, AR2503985, AR2405518, AR2504257, AR2404384, AR2404783, AR2404641, AR2404309, AR2403955); NO: 5 (AR2403877, AR2504105, AR2504257, AR2503985, AR2404248) |
| ventana | NO: 19 (AR2404172, AR2404780, AR2404248, AR2403877, AR2504105, AR2404082, AR2403994, AR2503420, AR2503198, AR2503812, AR2405960, AR2503985, AR2405518, AR2504257, AR2404384, AR2404783, AR2404641, AR2404309, AR2403955) |
| rotulacion | NO: 18 (AR2404172, AR2404780, AR2404248, AR2403877, AR2504105, AR2404082, AR2403994, AR2503420, AR2503198, AR2503812, AR2405960, AR2503985, AR2504257, AR2404384, AR2404783, AR2404641, AR2404309, AR2403955) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 10 (AR2404172, AR2404780, AR2404248, AR2403877, AR2404082, AR2403994, AR2404384, AR2404641, AR2403955, AR2404309); LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 8 (AR2503812, AR2403994, AR2504105, AR2405518, AR2404172, AR2404783, AR2504257, AR2503985); LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 5 (AR2504105, AR2503420, AR2503812, AR2504257, AR2503985); LONA ALPHA 1L 580  :NEGRO :250 AN: 4 (AR2405960, AR2503985, AR2404172, AR2504105); LONA STARPLUS 1L 610  :BLANCO RAL9010 :250 AN: 3 (AR2404780, AR2403877, AR2404082); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 2 (AR2504257, AR2404309); LONA ALPHA 1L 580 :VERDE RAL6024 :250 AN: 1 (AR2504105); LONA STARPLUS 1L 610:CREMA RA1014:250 AN: 1 (AR2403994); LONA MONZA 1 L 580 G/M2: GRIS RAL 7037: 250 AN: 1 (AR2503198); LONA G650 2L 650 :AZUL EUROPA 95 :250 AN (M5731): 1 (AR2404082); LONA RECORD 1 L 580:GRIS 095 RAL 7038:220 AN: 1 (AR2503812); LONA STARPLUS 1L 610:MARFIL RAL1013:250 AN: 1 (AR2404641); LONA STARPLUS 1L 610  :BLANCO RAL9010 :300 AN: 1 (AR2404248); LONA ALPHA 1L 580 :AMARILLO RAL1018 :250 AN: 1 (AR2404309) |
| modo | SEGUN SE INDICA: 14 (AR2404172, AR2404780, AR2404248, AR2403877, AR2504105, AR2404082, AR2403994, AR2504257, AR2503985, AR2405518, AR2404384, AR2404783, AR2404641, AR2403955); REPARTIDOS: 11 (AR2504105, AR2503420, AR2503198, AR2503812, AR2405960, AR2403994, AR2503985, AR2504257, AR2404641, AR2404309, AR2403955) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 152 × 116 | 2,5; 31,7; 39,6; 58,5; 77; 96,1; 114,5 | 2,5; 20,9; 39,6; 58,5; 77; 96,1; 114,5 | 2,5; 23,7; 44,6; 65,6; 87,1; 108,4; 129,4; 150,5 |  AR2503812; OT/2025/AR2503812-10.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503812. |
| baqueton; 155 × 106 | 2,5; 28; 53,5; 79; 104,5 | 2,5; 28; 53,5; 79; 104,5 | 2,5; 27,7; 52,8; 78; 103,2; 128,3; 153,5 |  AR2504257; OT/2025/AR2504257-15.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| baqueton; 155 × 114 | 2,5; 30; 57,5; 85; 112,5 | 2,5; 30; 57,5; 85; 112,5 | 2,5; 32,7; 62,9; 93,1; 123,3; 153,5 |  AR2504105; OT/2025/AR2504105-14.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504105. |
| baqueton; 155 × 118 | 2,5; 40,2; 78,5; 116,5 | 2,5; 40,2; 78,5; 116,5 | 2,5; 40,3; 78; 115,8; 153,5 |  AR2404082; OT/2024/AR2404082-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404082. |
| baqueton; 158 × 100 | 2,5; 31,7; 50,5; 75; 98,5 | 2,5; 26; 50,5; 75; 98,5 | 2,5; 28,2; 53,8; 79,5; 105,2; 126,3; 156,5 |  AR2503812; OT/2025/AR2503812-12.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503812. |
| baqueton; 159 × 102 | 2,5; 35,2; 67,8; 100,5 | 2,5; 35,2; 67,8; 100,5 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5 |  AR2504257; OT/2025/AR2504257-12.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| baqueton; 162 × 122 | 2,5; 26,1; 49,7; 73,3; 96,9; 120,5 | 2,5; 26,1; 49,7; 73,3; 96,9; 120,5 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 |  AR2504105; OT/2025/AR2504105-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504105 / 1 pedido(s): AR2504105. |
| baqueton; 163 × 80 | 2,5; 27,8; 53,2; 78,5 | 2,5; 27,8; 53,2; 78,5 | 2,5; 42,3; 82; 121,8; 161,5 |  AR2503985; OT/2025/AR2503985-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503985. |
| baqueton; 170 × 125 | 2,5; 42,8; 83,2; 123,5 | 2,5; 42,8; 83,2; 123,5 | 2,5; 30,2; 57,8; 85,5; 113,2; 140,8; 168,5 |  AR2504105; OT/2025/AR2504105-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504105. |
| baqueton; 180 × 135 | 2,5; 46,2; 89,8; 133,5 | 2,5; 46,2; 89,8; 133,5 | 2,5; 46,3; 90,5; 134,8; 178,5 |  AR2404082; OT/2024/AR2404082-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404082. |
| baqueton; 200 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 30,5; 58,5; 86,5; 114,5; 142,5; 170,5; 198,5 |  AR2504257; OT/2025/AR2504257-13.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| baqueton; 201 × 131 | 2,5; 27,9; 53,3; 78,7; 104,1; 129,5 | 2,5; 27,9; 53,3; 78,7; 104,1; 129,5 | 2,5; 27,1; 51,8; 76,4; 101; 125,6; 150,3; 174,9; 199,5 |  AR2404780; OT/2024/AR2404780-2.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404780. |
| baqueton; 202 × 138 | 2,5; 17,4; 32,3; 47,2; 61,1; 76,9; 91,8; 106,7; 121,6; 136,5 | 2,5; 17,4; 32,3; 47,2; 62,1; 76,9; 91,8; 106,7; 121,6; 136,5 | 2,5; 22,3; 42,1; 61,9; 81,7; 101,5; 121,3; 141,1; 160,9; 180,7; 200,5 |  AR2404780; OT/2024/AR2404780-1.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404780. |
| baqueton; 212 × 137 | 2,5; 35; 67,5; 100; 135,5 | 2,5; 35; 67,5; 100; 135,5 | 2,5; 44,1; 85,7; 127,3; 168,9; 210,5 |  AR2504257; OT/2025/AR2504257-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| baqueton; 213 × 142 | 2,5; 37; 71,5; 106; 140,5 | 2,5; 37; 71,5; 106; 140,5 | 2,5; 44,3; 86,1; 127,9; 169,7; 211,5 |  AR2404384; OT/2024/AR2404384.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404384. |
| baqueton; 220 × 135 | 2,5; 34,8; 68; 101,3; 133,5 | 2,5; 34,8; 68; 101,3; 133,5 | 2,5; 33,4; 64,2; 95,1; 125,9; 156,8; 187,6; 218,5 |  AR2503812; OT/2025/AR2503812-11.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503812. |
| baqueton; 238 × 143 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 37,3; 72; 106,8; 141,5 | 2,5; 49,3; 96,1; 142,9; 189,7; 236,5 |  AR2504105; OT/2025/AR2504105-13.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504105. |
| baqueton; 252 × 127 | 2,5; 43,5; 84,5; 125,5 | 2,5; 43,5; 84,5; 125,5 | 2,5; 43,8; 85,2; 126,5; 167,8; 209,2; 250,5 |  AR2503985; OT/2025/AR2503985-14.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503985. |
| baqueton; 254 × 135 | 2,5; 28,7; 54,9; 81,1; 107,3; 133,5 | 2,5; 28,7; 54,9; 81,1; 107,3; 133,5 | 2,5; 27,5; 52,5; 77,5; 102,5; 127,5; 152,5; 177,5; 202,5; 227,5; 252,5 |  AR2503985; OT/2025/AR2503985-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503985. |
| baqueton; 256 × 146 | 2,5; 37,8; 73,5; 109; 144,5 | 2,5; 38; 73,5; 109; 144,5 | 2,5; 38,5; 74,5; 110,5; 146,5; 182,5; 218,5; 254,5 |  AR2404309; OT/2024/AR2404309-10.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404309. |
| baqueton; 260 × 134 | 2,5; 45,8; 89,2; 132,5 | 2,5; 45,8; 89,2; 132,5 | 2,5; 45,2; 87,8; 130,5; 173,2; 215,8; 258,5 |  AR2504257; OT/2025/AR2504257-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| baqueton; 260 × 160 | 2,5; 28,5; 54,5; 80,5; 106,5; 132,5; 158,5 | 2,5; 28,5; 54,5; 80,5; 106,5; 132,5; 158,5 | 2,5; 28,1; 53,7; 79,3; 104,9; 130,5; 156,1; 181,7; 207,3; 232,9; 258,5 |  AR2503985; OT/2025/AR2503985-13.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503985. |
| baqueton; 264 × 136 | 2,5; 28,9; 55,3; 81,7; 108,1; 134,5 | 2,5; 28,9; 55,3; 81,7; 108,1; 134,5 | 2,5; 28,5; 54,5; 80,5; 106,5; 132,5; 158,5; 184,5; 210,5; 236,5; 262,5 |  AR2504257; OT/2025/AR2504257-14.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| baqueton; 264 × 167 | 2,5; 43; 84,5; 125; 165,5 | 2,5; 43; 84,5; 125; 165,5 | 2,5; 39,6; 76,8; 113,9; 151,1; 188,2; 225,4; 262,5 |  AR2503812; OT/2025/AR2503812-13.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503812. |
| baqueton; 266 × 128 | 2,5; 27,3; 52,1; 76,9; 101,7; 126,5 | 2,5; 27,3; 52,1; 76,9; 101,7; 126,5 | 2,5; 28,7; 54,9; 81,1; 107,3; 133,5; 159,7; 185,9; 212,1; 238,3; 264,5 |  AR2404172; OT/2024/AR2404172-12.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404172. |
| baqueton; 530 × 250 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5; 184,4 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5; 184,4 | 2,5; 33,8; 65,1; 96,4; 127,6; 158,9; 190,2; 221,5; 256,9; 292,3; 327,7; 363,1 |  AR2404641; OT/2024/AR2404641-2.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404641. |
| lona; 115 × 100 | 2,5; 26,5; 50,5; 74,5; 98,5 | 2,5; 26,5; 50,5; 74,5; 98,5 | 2,5; 30,3; 58; 85,8; 113,5 |  AR2504105; OT/2025/AR2504105-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504105. |
| lona; 120 × 105 | 2,5; 27,8; 53; 78,3; 103,5 | 2,5; 27,8; 53; 78,3; 103,5 | 2,5; 31,5; 60,5; 89,5; 118,5 |  AR2503985; OT/2025/AR2503985-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503985. |
| lona; 132 × 99 | 2,5; 26,3; 50; 73,8; 97,5 | 2,5; 26,3; 50; 73,8; 97,5 | 2,5; 28,1; 53,7; 79,3; 104,9; 130,5 |  AR2404641; OT/2024/AR2404641-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404641. |
| lona; 144 × 141 | 2,5; 25,3; 48,2; 71; 93,8; 116,7; 139,5 | 2,5; 25,3; 48,2; 71; 93,8; 116,7; 139,5 | 2,5; 25,8; 49,2; 72,5; 95,8; 119,2; 142,5 |  AR2503985; OT/2025/AR2503985-13.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503985. |
| lona; 152 × 104 | 2,5; 16,8; 31,1; 45,4; 59,6; 73,9; 88,2; 102,5 | 2,5; 16,8; 31,1; 45,4; 59,6; 73,9; 88,2; 102,5 | 2,5; 17,3; 32,1; 46,9; 61,7; 76,5; 91,3; 106,1; 120,9; 135,7; 150,5 |  AR2404172; OT/2024/AR2404172-13.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404172. |
| lona; 152 × 117 | 2,5; 47,7; 70,3; 92,9; 115,5 | 2,5; 47,7; 70,3; 92,9; 115,5 | 2,5; 27,2; 51,8; 76,5; 101,2; 125,8; 150,5 |  AR2403877; OT/2024/AR2403877.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403877. |
| lona; 158 × 100 | 2,5; 34,5; 66,5; 98,5 | 2,5; 34,5; 66,5; 98,5 | 2,5; 33,3; 64,1; 94,9; 125,7; 156,5 |  AR2504257; OT/2025/AR2504257-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| lona; 158 × 115 | 2,5; 30,3; 58; 85,8; 113,5 | 2,5; 30,3; 58; 85,8; 113,5 | 2,5; 33,3; 64,1; 94,9; 125,7; 156,5 |  AR2404248; OT/2024/AR2404248-4.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404248. |
| lona; 160 × 120 | 2,5; 41,2; 79,8; 118,5 | 2,5; 41,2; 79,8; 118,5 | 2,5; 41,5; 80,5; 119,5; 158,5 |  AR2404082; OT/2024/AR2404082-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404082. |
| lona; 162 × 122 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 |  AR2404172; OT/2024/AR2404172-14.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404172. |
| lona; 181 × 131 | 2,5; 44,8; 87,2; 129,5 | 2,5; 44,8; 87,2; 129,5 | 2,5; 32; 61,5; 91; 120,5; 150; 179,5 |  AR2404172; OT/2024/AR2404172-15.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404172. |
| lona; 202 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5 |  AR2504105; OT/2025/AR2504105-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504105. |
| lona; 203 × 137 | 2,5; 36,3; 69; 101,8; 135,5 | 2,5; 36,3; 69; 101,8; 135,5 | 2,5; 35,7; 68,8; 102; 135,2; 168,3; 201,5 |  AR2404082; OT/2024/AR2404082-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404082. |
| lona; 204 × 133 | 2,5; 34,8; 67; 99,3; 131,5 | 2,5; 34,8; 67; 99,3; 131,5 | 2,5; 42,5; 82,5; 122,5; 162,5; 202,5 |  AR2404780; OT/2024/AR2404780-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404780. |
| lona; 206 × 112 | 2,5; 33,5; 60,5; 87,5; 110,5 | 2,5; 33,5; 60,5; 87,5; 110,5 | 2,5; 42,9; 83,3; 123,7; 164,1; 204,5 |  AR2405518; OT/2024/AR2405518.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405518. |
| lona; 207 × 138 | 2,5; 47,2; 91,8; 136,5 | 2,5; 47,2; 91,8; 136,5 | 2,5; 31,5; 60,5; 89,5; 118,5; 147,5; 176,5; 205,5 |  AR2404082; OT/2024/AR2404082-14.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404082. |
| lona; 208 × 136 | 2,5; 35,8; 68,5; 101,3; 134,5 | 2,5; 35,8; 68,5; 101,3; 134,5 | 2,5; 36,5; 70,5; 104,5; 138,5; 172,5; 206,5 |  AR2404172; OT/2024/AR2404172-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404172. |
| lona; 210 × 130 | 2,5; 32,8; 86,2; 128,5 | 2,5; 32,8; 86,2; 128,5 | 2,5; 54; 105,5; 157; 208,5 |  AR2404384; OT/2024/AR2404384.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404384. |
| lona; 210 × 135 | 2,5; 28,7; 54,9; 81,1; 107,3; 133,5 | 2,5; 28,7; 54,9; 81,1; 107,3; 133,5 | 2,5; 28,3; 54; 79,8; 105,5; 131,3; 157; 182,8; 208,5 |  AR2504257; OT/2025/AR2504257-13.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| lona; 211 × 143 | 2,5; 30,3; 58,1; 85,9; 113,7; 141,5 | 2,5; 30,3; 58,1; 85,9; 113,7; 141,5 | 2,5; 28,8; 54,5; 80,3; 106; 131,8; 157,5; 183,3; 209,5 |  AR2404172; OT/2024/AR2404172-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404172 / 1 pedido(s): AR2404172. |
| lona; 213 × 148 | 2,5; 38,5; 74,5; 110,5; 146,5 | 2,5; 38,5; 74,5; 110,5; 146,5 | 2,5; 37,3; 72,2; 107; 141,8; 176,7; 211,5 |  AR2404082; OT/2024/AR2404082-13.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404082. |
| lona; 215 × 132 | 2,5; 27,32; 53,4; 79,6; 105,8; 130,5 | 2,5; 27,32; 53,4; 79,6; 105,8; 130,5 | 2,5; 29,3; 55; 80,8; 108,5; 134,3; 161; 186,8; 213,5 |  AR2404309; OT/2024/AR2404309-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404309. |
| lona; 223 × 132 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 33,8; 65,1; 96,4; 127,6; 158,9; 190,2; 221,5 |  AR2503985; OT/2025/AR2503985-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503985. |
| lona; 228 × 86 | 2,5; 29,8; 57,2; 84,5 | 2,5; 29,8; 57,2; 84,5 | 2,5; 27,4; 52,3; 77,2; 102,1; 126,9; 151,8; 176,7; 201,6; 226,5 |  AR2404248; OT/2024/AR2404248-6.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404248. |
| lona; 233 × 150 | 2,5; 40,8; 75,5; 110,3; 148,5 | 2,5; 40,8; 75,5; 110,3; 148,5 | 2,5; 32,7; 67,9; 100,6; 133,3; 166,1; 198,8; 231,5 |  AR2404783; OT/2024/ar2404783.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404783. |
| lona; 234 × 138 | 2,5; 29,3; 56,1; 82,9; 109,7; 136,5 | 2,5; 29,3; 56,1; 82,9; 109,7; 136,5 | 2,5; 28,1; 53,6; 79,2; 104,7; 155,8; 181,4; 206,9; 232,5 |  AR2503985; OT/2025/AR2503985-15.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503985. |
| lona; 245 × 138 | 2,5; 47; 92; 136,5 | 2,5; 47; 92; 136,5 | 2,5; 37; 71,5; 106; 140; 174,5; 209; 243,5 |  AR2403994; OT/2024/AR2403994-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403994. |
| lona; 250 × 125 | 2,5; 42,8; 83,2; 123,5 | 2,5; 42,8; 83,2; 123,5 | 2,5; 43,5; 84,5; 125,5; 166,5; 207,5; 248,5 |  AR2504105; OT/2025/AR2504105-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504105. |
| lona; 250 × 126 | 2,5; 26,9; 51,3; 75,7; 100,1; 124,5 | 2,5; 26,9; 51,3; 75,7; 100,1; 124,5 | 2,5; 27,1; 52,2; 77,3; 101,4; 126,5; 150,6; 174,7; 199,8; 224,9; 248,5 |  AR2503812; OT/2025/AR2503812-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503812. |
| lona; 250 × 144 | 2,5; 25,8; 49,2; 72,5; 95,8; 119,2; 142,5 | 2,5; 25,8; 49,2; 72,5; 95,8; 119,2; 142,5 | 2,5; 27,1; 51,7; 76,3; 100,9; 125,5; 150,1; 174,7; 199,3; 223,9; 248,5 |  AR2503985; OT/2025/AR2503985-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503985. |
| lona; 250 × 150 | 2,5; 26,8; 51,2; 75,5; 99,8; 124,2; 148,5 | 2,5; 26,8; 51,2; 75,5; 99,8; 124,2; 148,5 | 2,5; 27,1; 51,7; 76,3; 100,9; 125,5; 150,1; 174,7; 199,3; 223,9; 248,5 |  AR2503420; OT/2025/AR2503420.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503420. |
| lona; 251 × 137 | 2,5; 35,5; 68,5; 101,5; 134,8 | 2,5; 35,5; 68,5; 101,5; 134,8 | 2,5; 44,5; 85,5; 126,5; 167,5; 208,5; 249,5 |  AR2503812; OT/2025/AR2503812-14.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503812. |
| lona; 252 × 130 | 2,5; 23,5; 44,3; 65,5; 86,8; 107,5; 128,5 | 2,5; 23,5; 44,3; 65,5; 86,8; 107,5; 128,5 | 11,45; 32,35; 53,25; 74,25; 95,15; 116,05; 136,95; 157,85; 178,75; 199,75; 220,65; 241,55 |  AR2503812; OT/2025/AR2503812-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503812. |
| lona; 252 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 38; 73,5; 109; 144; 179,5; 215; 250,5 |  AR2403994; OT/2024/AR2403994-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403994. |
| lona; 258 × 168 | 2,5; 35,2; 68,1; 100,9; 133,6; 166,5 | 2,5; 35,2; 68,1; 100,9; 133,6; 166,5 | 2,5; 33,5; 65,5; 97,5; 129,5; 161,5; 193,5; 225,5; 256,5 |  AR2503812; OT/2025/AR2503812-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503812. |
| lona; 260 × 135 | 2,5; 28,7; 54,9; 81,1; 107,3; 133,5 | 2,5; 28,7; 54,9; 81,1; 107,3; 133,5 | 2,5; 28,1; 53,7; 79,3; 104,9; 130,5; 156,1; 181,7; 207,3; 232,9; 258,5 |  AR2503985; OT/2025/AR2503985-14.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503985. |
| lona; 261 × 145 | 2,5; 26; 49,5; 73; 96,5; 120; 143,5 | 2,5; 26; 49,5; 73; 96,5; 120; 143,5 | 2,5; 31,1; 59,6; 88,2; 116,7; 145,3; 173,8; 202,4; 230,9; 259,5 |  AR2504257; OT/2025/AR2504257-14.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| lona; 261 × 148 | 2,5; 26,5; 50,5; 74,5; 98,5; 122,5; 146,5 | 2,5; 26,5; 50,5; 74,5; 98,5; 122,5; 146,5 | 2,5; 34,6; 66,8; 131; 163,1; 195,3; 227,4; 259,5 |  AR2404309; OT/2024/AR2404309-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404309. |
| lona; 262 × 137 | 2,5; 29,7; 55,9; 82,1; 108,3; 135,5 | 2,5; 29,7; 55,9; 82,1; 108,3; 135,5 | 2,5; 28,3; 54,1; 79,9; 105,7; 131,5; 157,3; 183,1; 208,9; 234,7; 260,5 |  AR2404082; OT/2024/AR2404082-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404082. |
| lona; 262 × 156 | 2,5; 27,8; 53,2; 78,5; 103,8; 129,2; 154,5 | 2,5; 27,8; 53,2; 78,5; 103,8; 129,2; 154,5 | 2,5; 28,3; 54,1; 79,9; 105,7; 131,5; 157,3; 183,1; 208,9; 234,7; 260,5 |  AR2404248; OT/2024/AR2404248-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404248. |
| lona; 263 × 134 | 2,5; 28,2; 54,4; 80,6; 106,8; 132,5 | 2,5; 28,2; 54,4; 80,6; 106,8; 132,5 | 2,5; 28,4; 54,3; 80,2; 106,1; 132; 157,9; 183,8; 209,7; 235,6; 261,5 |  AR2403877; OT/2024/AR2403877-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403877. |
| lona; 265 × 145 | 2,5; 26; 49,5; 73; 96,5; 120; 143,5 | 2,5; 26; 49,5; 73; 96,5; 120; 143,5 | 2,5; 28,6; 54,7; 80,8; 106,9; 133; 159,1; 185,2; 211,3; 237,4; 263,5 |  AR2404248; OT/2024/AR2404248-5.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2404248 / 1 pedido(s): AR2403994. |
| lona; 265 × 150 | 2,5; 26,8; 51,2; 75,5; 99,8; 124,2; 148,5 | 2,5; 26,8; 51,2; 75,5; 99,8; 124,2; 148,5 | 2,5; 28,6; 54,7; 80,8; 106,9; 133; 159,1; 185,2; 211,3; 237,4; 263,5 |  AR2504257; OT/2025/AR2504257-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| lona; 268 × 145 | 2,5; 30,5; 59; 87; 115,5; 143,5 | 2,5; 30,5; 59; 87; 115,5; 143,5 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5; 233,5; 266,5 |  AR2403955; OT/2024/AR2403955-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403955. |
| lona; 270 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 29,1; 55,7; 82,3; 108,9; 135,5; 162,1; 188,7; 215,3; 241,9; 268,5 |  AR2404780; OT/2024/AR2404780-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404780. |
| lona; 270 × 165 | 2,5; 29,3; 56,2; 83; 109,8; 136,7; 163,5 | 2,5; 29,3; 56,2; 83; 109,8; 136,7; 163,5 | 2,5; 26,7; 50,9; 75; 99,2; 123,4; 147,6; 171,8; 196; 220,1; 244,3; 268,5 |  AR2504257; OT/2025/AR2504257-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504257. |
| lona; 277 × 162 | 2,5; 28,8; 55,2; 81,5; 107,8; 134,2; 160,5 | 2,5; 28,8; 55,2; 81,5; 107,8; 134,2; 160,5 | 2,5; 32,8; 63,2; 93,5; 123,8; 154,2; 184,5; 214,8; 245,2; 275,5 |  AR2404248; OT/2024/AR2404248-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404248. |
| lona; 278 × 164 | 2,5; 29,2; 55,8; 82,5; 109,2; 135,8; 162,5 | 2,5; 29,2; 55,8; 82,5; 109,2; 135,8; 162,5 | 2,5; 27,4; 52,3; 77,2; 102,1; 127; 152; 176,9; 201,8; 226,7; 251,6; 276,5 |  AR2404641; OT/2024/AR2404641-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404641. |
| lona; 285 × 155 | 2,5; 40,5; 78; 116; 153,5 | 2,5; 40,5; 78; 116; 153,5 | 2,5; 42,5; 83; 123; 163; 203; 243,5; 283,5 |  AR2403994; OT/2024/AR2403994-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403994. |
| lona; 313 × 172 | 2,5; 26,5; 50,5; 74,5; 98,5; 122,5; 146,5; 170,5 | 2,5; 26,5; 50,5; 74,5; 98,5; 122,5; 146,5; 170,5 | 15,35; 41,15; 66,85; 92,65; 118,35; 144,15; 169,85; 195,65; 221,35; 247,15; 272,85; 298,65 |  AR2404082; OT/2024/AR2404082-15.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404082. |
| lona; 367 × 192 | 2,5; 29,4; 56,2; 83,1; 109,9; 136,8; 163,6; 190,5 | 2,5; 29,4; 56,2; 83,1; 109,9; 136,8; 163,6; 190,5 | 41,4; 67,3; 93,3; 119,2; 145,1; 171; 197; 222,9; 248,8; 274,8; 300,7; 326,6 |  AR2404641; OT/2024/AR2404641-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404641. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 315 × 175 | AR2403877 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2403877-10.xlsb; OT/2024/AR2403877-11.xlsb; OT/2024/AR2403877.dwg; OT/2024/AR2403877.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 188 × 96 | AR2403955 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2403955-1.xlsb; OT/2024/AR2403955.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 512 × 226 | AR2403955 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2403955-1.xlsb; OT/2024/AR2403955.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 252 × 135 | AR2403994 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2403994-1.xlsb; OT/2024/AR2403994-2.xlsb; OT/2024/AR2403994-3.xlsb; OT/2024/AR2403994-4.xlsb; OT/2024/AR2403994.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 280 × 90 | AR2404248 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404248-1.xlsb; OT/2024/AR2404248-2.xlsb; OT/2024/AR2404248-3.xlsb; OT/2024/AR2404248-4.xlsb; OT/2024/AR2404248-5.xlsb; OT/2024/AR2404248-6.xlsb; OT/2024/AR2404248.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 130 × 130 | AR2404641, AR2405534 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404641-1.xlsb; OT/2024/AR2404641-2.xlsb; OT/2024/AR2404641-3.xlsb; OT/2024/AR2404641.dwg; OT/2024/AR2405534.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 309 × 179 | AR2503198 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503198-10.dwg; OT/2025/AR2503198.dwg; OT/2025/AR2503198.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| tipo sin identificar; 250 × 145 | AR2503812 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503812-10.xlsb; OT/2025/AR2503812-11.xlsb; OT/2025/AR2503812-12.xlsb; OT/2025/AR2503812-13.xlsb; OT/2025/AR2503812-14.xlsb; OT/2025/AR2503812.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 275 × 125 | AR2503985 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503985-10.xlsb; OT/2025/AR2503985-11.xlsb; OT/2025/AR2503985-12.xlsb; OT/2025/AR2503985-13.xlsb; OT/2025/AR2503985-14.xlsb; OT/2025/AR2503985-15.xlsb; OT/2025/AR2503985.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### INCAR · EURO REMOLQUE, S. L. — 021493

Ficha: `euro-remolque`. Histórico: **90 líneas / 82 pedidos**. PDF producidos adicionales examinados: 1. Registro vigente versión 1, conservado.

Código acreditado por histórico (AR2604383). Nombres/alias del histórico: INCAR · EURO REMOLQUE, S. L..

Plantillas encontradas: `PL/INCAR (EURO REMOLQUE)/FOTOS AR2306267/AR2306267.dwg`; `PL/INCAR (EURO REMOLQUE)/INCAR (EURO REMOLQUE).DWG`; `PL/REMOLQUES GANADO/INCAR GANADO 300 X 160.dwg`

Reglas añadidas a la propuesta: `ventana` = {"lleva":true}; `recogeDelante` = "NO"; `recogeAtras` = "GOMA"; `bastillaEnfundar` = false.

Campos vigentes que se respetan: `observaciones` = ["SI SE MANDA GOMA PARA VARIOS REMOLQUES, MANDAR LA GOMA POR SEPARADO"].

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 25 (AR2504989, AR2402017, AR2400860, AR2503722, AR2400974, AR2402347, AR2601271, AR2401008, AR2401225, AR2405115, AR2402321, AR2400645, AR2405574, AR2502620, AR2406101, AR2402320, AR2503824, AR2400511, AR2402511, AR2401329, AR2402946, AR2404922, AR2404967, AR2403045, AR2601570); TIPO 04: 21 (AR2601080, AR2603563, AR2603096, AR2600693, AR2506073, AR2501638, AR2504094, AR2406768, AR2604263, AR2502030, AR2500907, AR2604335, AR2500478, AR2600511, AR2504256, AR2602866, AR2601020, AR2600251, AR2500521, AR2500139, AR2500261); TIPO 01: 1 (AR2405925) |
| recogeDelante | NO: 50 (AR2601080, AR2603563, AR2405925, AR2404232, AR2603096, AR2504989, AR2402017, AR2400860, AR2600693, AR2400974, AR2506073, AR2402347, AR2601271, AR2501638, AR2401008, AR2401225, AR2405115, AR2504094, AR2402321, AR2406768, AR2604263, AR2502030, AR2400645, AR2403606, AR2500907, AR2604335, AR2500478, AR2600511, AR2405574, AR2502620, AR2504256, AR2406101, AR2602866, AR2402320, AR2503824, AR2601020, AR2400511, AR2402511, AR2600251, AR2401329, AR2500521, AR2500139, AR2403314, AR2402946, AR2404922, AR2404967, AR2403455, AR2500261, AR2403045, AR2601570); GOMA: 1 (AR2503722) |
| recogeAtras | GOMA: 51 (AR2601080, AR2603563, AR2405925, AR2404232, AR2603096, AR2504989, AR2402017, AR2400860, AR2503722, AR2600693, AR2400974, AR2506073, AR2402347, AR2601271, AR2501638, AR2401008, AR2401225, AR2405115, AR2504094, AR2402321, AR2406768, AR2604263, AR2502030, AR2400645, AR2403606, AR2500907, AR2604335, AR2500478, AR2600511, AR2405574, AR2502620, AR2504256, AR2406101, AR2602866, AR2402320, AR2503824, AR2601020, AR2400511, AR2402511, AR2600251, AR2401329, AR2500521, AR2500139, AR2403314, AR2402946, AR2404922, AR2404967, AR2403455, AR2500261, AR2403045, AR2601570) |
| bastillaEnfundar | NO: 46 (AR2601080, AR2603563, AR2405925, AR2404232, AR2603096, AR2504989, AR2402017, AR2400860, AR2600693, AR2400974, AR2506073, AR2402347, AR2601271, AR2501638, AR2401008, AR2405115, AR2504094, AR2402321, AR2406768, AR2604263, AR2502030, AR2400645, AR2403606, AR2500907, AR2604335, AR2500478, AR2600511, AR2405574, AR2502620, AR2504256, AR2406101, AR2402320, AR2503824, AR2601020, AR2400511, AR2600251, AR2500521, AR2500139, AR2403314, AR2402946, AR2404922, AR2404967, AR2403455, AR2500261, AR2403045, AR2601570); SÍ: 2 (AR2503722, AR2602866) |
| ventana | SÍ: 50 (AR2601080, AR2603563, AR2405925, AR2404232, AR2603096, AR2504989, AR2402017, AR2400860, AR2503722, AR2600693, AR2400974, AR2506073, AR2402347, AR2601271, AR2501638, AR2401008, AR2405115, AR2504094, AR2402321, AR2406768, AR2604263, AR2502030, AR2400645, AR2403606, AR2500907, AR2604335, AR2500478, AR2600511, AR2405574, AR2502620, AR2504256, AR2406101, AR2602866, AR2402320, AR2503824, AR2601020, AR2400511, AR2402511, AR2600251, AR2401329, AR2500521, AR2500139, AR2403314, AR2402946, AR2404922, AR2404967, AR2403455, AR2500261, AR2403045, AR2601570); NO: 1 (AR2401225) |
| rotulacion | SI: 28 (AR2601080, AR2504989, AR2402017, AR2503722, AR2600693, AR2506073, AR2601271, AR2401008, AR2405115, AR2504094, AR2402321, AR2406768, AR2604263, AR2502030, AR2500907, AR2500478, AR2504256, AR2602866, AR2402320, AR2503824, AR2601020, AR2600251, AR2500521, AR2500139, AR2404922, AR2404967, AR2500261, AR2601570); SÍ: 11 (AR2404232, AR2400860, AR2403606, AR2604335, AR2405574, AR2406101, AR2400511, AR2403314, AR2402946, AR2403455, AR2403045); NO: 10 (AR2603563, AR2405925, AR2603096, AR2400974, AR2501638, AR2401225, AR2400645, AR2600511, AR2502620, AR2401329); TALLERES XUSTAS: 1 (AR2402347); JUAN CARAVANAS: 1 (AR2402511) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 24 (AR2402066, AR2402017, AR2400860, AR2600693, AR2400974, AR2600565, AR2405115, AR2402321, AR2400645, AR2403606, AR2500478, AR2400475, AR2600511, AR2404103, AR2402320, AR2402511, AR2401329, AR2500521, AR2404922, AR2404967, AR2403455, AR2500261, AR2403045, AR2405935); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 21 (AR2601377, AR2603563, AR2601570, AR2505651, AR2501529, AR2504989, AR2602078, AR2503722, AR2506073, AR2504856, AR2501475, AR2604089, AR2504094, AR2604263, AR2502030, AR2500907, AR2604335, AR2501235, AR2502972, AR2504256, AR2503824); LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 20 (AR2601080, AR2404232, AR2402267, AR2402347, AR2406190, AR2501638, AR2401008, AR2401225, AR2406768, AR2501756, AR2405710, AR2505227, AR2406101, AR2501098, AR2400511, AR2600251, AR2602341, AR2501699, AR2402946, AR2404708); LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 5 (AR2405925, AR2603096, AR2601271, AR2405574, AR2502620); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 2 (AR2406768, AR2403314); LONA STARPLUS 1L 610  :ROJO RAL3002 :250 AN: 1 (AR2404232); LONA ALPHA 1L 580 :VERDE RAL6024 :250 AN: 1 (AR2600666); LONA NS86 2L 630GR  [580]: AZUL CLARO 5015 : 250 AN: 1 (AR2602866); LONA MONZA 1 L 580 G/M2: GRIS RAL 7038: 250 AN: 1 (AR2601020); LONA G650 2L 650 :GRIS RAL7038 :250 AN (M5739): 1 (AR2500139); LONA ALPHA 1L 580: AZUL RAL5015: 220 AN: 1 (AR2400386) |
| modo | SEGUN SE INDICA: 69 (AR2601377, AR2601080, AR2603563, AR2601570, AR2402066, AR2505651, AR2405925, AR2402267, AR2501529, AR2603096, AR2504989, AR2602078, AR2402017, AR2400860, AR2503722, AR2600693, AR2400974, AR2506073, AR2402347, AR2504856, AR2501475, AR2601271, AR2604089, AR2501638, AR2401008, AR2401225, AR2405115, AR2504094, AR2402321, AR2406768, AR2604263, AR2502030, AR2501756, AR2400645, AR2403606, AR2500907, AR2405710, AR2604335, AR2501235, AR2500478, AR2400475, AR2600511, AR2405574, AR2502620, AR2502972, AR2505227, AR2504256, AR2406101, AR2602866, AR2402320, AR2503824, AR2501098, AR2601020, AR2400511, AR2402511, AR2600251, AR2401329, AR2500521, AR2602341, AR2501699, AR2403314, AR2402946, AR2400386, AR2404922, AR2404967, AR2403455, AR2500261, AR2403045, AR2405935); REPARTIDOS: 5 (AR2404232, AR2406190, AR2404103, AR2500139, AR2404708) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 160 × 120 | 10,5; 35,5; 85,5; 110,5 | 10,5; 35,5; 85,5; 110,5 | 13,5; 42,5; 80,5; 118,5; 147,5 | Vigente v1; se conserva. AR2604263; OT/2026/AR2604263.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604263. |
| baqueton; 160 × 120 | 10,5; 35,5; 85,5; 110,5 | 10,5; 35,5; 85,5; 110,5 | 13,5; 42,5; 80,5; 118,5; 147,5 | Vigente v1; se conserva. AR2601377; OT/2026/AR2601377.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2404103, AR2601377. |
| lona; 175 × 110 | 10,5; 55,5; 100,5 | 10,5; 55,5; 100,5 | 13,5; 46,5; 87,5; 129,5; 162,5 | Vigente v1; se conserva. AR2502030; OT/2025/AR2502030.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2403314, AR2404967 / 1 pedido(s): AR2502030 / 1 pedido(s): AR2400511. |
| baqueton; 175 × 110 | 10,5; 55,5; 100,5 | 10,5; 55,5; 100,5 | 13,5; 46,5; 87,5; 129,5; 162,5 | Vigente v1; se conserva. AR2504856; OT/2025/AR2504856.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2504856, AR2505651 / 1 pedido(s): AR2405710. |
| lona; 200 × 125 | 12,5; 45,5; 80,5; 113,5 | 12,5; 45,5; 80,5; 113,5 | 10,5; 50,5; 100,5; 150,5; 190,5 | Vigente v1; se conserva. AR2506073; OT/2025/AR2506073.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2403455, AR2403606, AR2506073 / 2 pedido(s): AR2400645, AR2405115. |
| baqueton; 200 × 125 | 12,5; 45,5; 80,5; 113,5 | 12,5; 45,5; 80,5; 113,5 | 10,5; 50,5; 100,5; 150,5; 190,5 | Vigente v1; se conserva. AR2605273; OT/2026/AR2605273.pdf; mayoría de pedidos. Variantes: 2 pedido(s): AR2406768, AR2605273 / 1 pedido(s): AR2404708. |
| lona; 225 × 125 | 12,5; 45,5; 80,5; 113,5 | 12,5; 45,5; 80,5; 113,5 | 13,5; 48,5; 92,5; 135,5; 178,5; 212,5 | Vigente v1; se conserva. AR2500139; OT/2025/AR2500139.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2500139, AR2603096 / 2 pedido(s): AR2404232, AR2501638 / 1 pedido(s): AR2406101 / 1 pedido(s): AR2402347 / 1 pedido(s): AR2401008. |
| baqueton; 225 × 125 | 12,5; 45,5; 80,5; 113,5 | 12,5; 45,5; 80,5; 113,5 | 13,5; 48,5; 92,5; 135,5; 178,5; 212,5 | Vigente v1; se conserva. AR2505227; OT/2025/AR2505227.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2505227 / 1 pedido(s): AR2402267 / 1 pedido(s): AR2400386. |
| lona; 250 × 140 | 12,5; 49,5; 91,5; 128,5 | 12,5; 49,5; 91,5; 128,5 | 10,5; 50,5; 100,5; 150,5; 200,5; 240,5 | Vigente v1; se conserva. AR2600251; OT/2026/AR2600251.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 7 pedido(s): AR2500521, AR2500907, AR2502620, AR2504094, AR2504256, AR2600251, AR2601080 / 2 pedido(s): AR2404232, AR2600511 / 2 pedido(s): AR2401225, AR2403045 / 1 pedido(s): AR2503824 / 1 pedido(s): AR2601570. |
| baqueton; 250 × 140 | 12,5; 49,5; 91,5; 128,5 | 12,5; 49,5; 91,5; 128,5 | 10,5; 50,5; 100,5; 150,5; 200,5; 240,5 | Vigente v1; se conserva. AR2501475; OT/2025/AR2501475.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2501475 / 1 pedido(s): AR2502972. |
| lona; 260 × 150 | 12,5; 54,5; 96,5; 138,5 | 12,5; 54,5; 96,5; 138,5 | 12,5; 46,5; 88,5; 130,5; 172,5; 214,5; 248,5 | Vigente v1; se conserva. AR2600693; OT/2026/AR2600693.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 7 pedido(s): AR2402017, AR2402320, AR2405574, AR2406768, AR2600693, AR2601020, AR2603563. |
| baqueton; 260 × 150 | 12,5; 54,5; 96,5; 138,5 | 12,5; 54,5; 96,5; 138,5 | 12,5; 46,5; 88,5; 130,5; 172,5; 214,5; 248,5 | Vigente v1; se conserva. AR2603563; OT/2026/AR2603563-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603563. |
| lona; 300 × 175 | 13; 57; 119; 163 | 13; 57; 119; 163 | 13; 51; 101; 151; 201; 251; 288 | Vigente v1; se conserva. |
| baqueton; 300 × 175 | 13; 57; 119; 163 | 13; 57; 119; 163 | 13; 51; 101; 151; 201; 251; 288 | Vigente v1; se conserva. |
| baqueton; 150 × 110 | 12,5; 41,2; 69,8; 98,5 | 12,5; 41,2; 69,8; 98,5 | 12,5; 54,5; 96,5; 138,5 |  AR2406190; OT/2024/AR2406190.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406190. |
| baqueton; 180 × 115 | 10,5; 34,3; 81,8; 105,5 | 10,5; 34,3; 81,8; 105,5 | 13; 46; 88; 131; 168 |  AR2602078; OT/2026/AR2602078.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602078. |
| baqueton; 180 × 120 | 10,5; 35,5; 85,5; 110,5 | 10,5; 35,5; 85,5; 110,5 | 13; 50; 93; 135; 168 |  AR2501098; OT/2025/AR2501098.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501098. |
| baqueton; 200 × 120 | 10,5; 35,5; 85,5; 110,5 | 10,5; 35,5; 85,5; 110,5 | 10,5; 50,5; 100,5; 150,5; 190,5 |  AR2402066; OT/2024/AR2402066.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402066. |
| baqueton; 235 × 150 | 12,5; 54,5; 96,5; 138,5 | 12,5; 54,5; 96,5; 138,5 | 12,5; 48,5; 95; 141,5; 188; 223,5 |  AR2400475; OT/2024/AR2400475.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400475. |
| baqueton; 250 × 150 | 12; 54; 97; 139 | 12; 54; 97; 139 | 10; 50; 100; 151; 201; 241 |  AR2501756; OT/2025/AR2501756.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2501756, AR2604089 / 2 pedido(s): AR2501235, AR2501529. |
| baqueton; 252 × 142 | 13,5; 50,5; 92,5; 129,5 | 13,5; 50,5; 92,5; 129,5 | 11,5; 51,5; 101,5; 151,5; 201,5; 241,5 |  AR2501699; OT/2025/AR2501699.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501699. |
| baqueton; 256 × 146 | 12,5; 52,5; 94,5; 134,5 | 12,5; 52,5; 94,5; 134,5 | 10,5; 44,5; 86,5; 128,5; 170,5; 212,5; 246,5 |  AR2601570; OT/2026/AR2601570-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601570. |
| baqueton; 280 × 175 | 12; 45,8; 87,3; 128,8; 163 | 12; 45,8; 87,3; 128,8; 163 | 12,5; 47,3; 93,8; 140,3; 185,8; 232,3; 268,5 |  AR2405935; OT/2024/AR2405935.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405935. |
| baqueton; 300 × 150 | 12; 54; 97; 139 | 12; 54; 97; 139 | 13; 50; 100; 150; 200; 250; 288 |  AR2602341; OT/2026/AR2602341.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602341. |
| lona; 180 × 120 | 10; 41; 83; 110 | 10; 41; 83; 110 | 13; 46; 88; 131; 168 |  AR2400974; OT/2024/AR2400974.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400974. |
| lona; 220 × 130 | 12,5; 47; 84; 118,5 | 12,5; 47; 84; 118,5 | 13,5; 50,5; 90,5; 130,5; 170,5; 207,5 |  AR2604335; OT/2026/AR2604335.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604335. |
| lona; 225 × 130 | 12; 45; 86; 119 | 12; 45; 86; 119 | 13; 47; 90; 133; 177; 212 |  AR2603563; OT/2026/AR2603563-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2402017, AR2402321, AR2603563 / 1 pedido(s): AR2500478. |
| lona; 235 × 145 | 12; 51,5; 94,5; 134 | 12; 51,5; 94,5; 134 | 12,5; 48,3; 94,8; 141,3; 187,8; 223,5 |  AR2401329; OT/2024/AR2401329.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401329. |
| lona; 250 × 150 | 12,5; 54,5; 96,5; 138,5 | 12,5; 54,5; 96,5; 138,5 | 10,5; 50,5; 100,5; 150,5; 200,5; 240,5 |  AR2504989; OT/2025/AR2504989.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2400860, AR2504989. |
| lona; 250 × 160 | 12,5; 57,5; 103,5; 148,5 | 12,5; 57,5; 103,5; 148,5 | 10,5; 50,5; 100,5; 150,5; 200,5; 240,5 |  AR2402946; OT/2024/AR2402946.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402946. |
| lona; 255 × 175 | 12; 45; 87; 130; 164 | 12; 45; 87; 130; 164 | 11; 52; 102; 153; 204; 245 |  AR2404922; OT/2024/AR2404922.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404922. |
| lona; 260 × 165 | 12,75; 44,45; 82,95; 121,45; 153,25 | 12,75; 44,45; 82,95; 121,45; 153,25 | 12,5; 46,5; 88,5; 130,5; 172,5; 214,5; 248,5 |  AR2601271; OT/2026/AR2601271.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601271. |
| lona; 300 × 150 | 12,5; 54,5; 96,5; 138,5 | 12,5; 54,5; 96,5; 138,5 | 13; 50; 100; 150; 200; 240; 288 |  AR2602866; OT/2026/AR2602866.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602866. |
| lona; 301 × 162,5 | 2,5; 34,2; 97,6; 129,3; 161 | 2,5; 34,2; 97,6; 129,3; 161 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5; 233,5; 266,5; 299,5 |  AR2402511; OT/2024/AR2402511.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402511. |
| lona; 333 × 168 | 12,5; 55; 114,5; 156,5 | 12,5; 55; 114,5; 156,5 | 20; 68; 124,5; 176; 227,5; 284,5; 328 |  AR2405925; OT/2024/AR2405925.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405925. |
| lona; 335 × 170 | 12,5; 45; 85; 125; 158 | 12,5; 45; 85; 125; 158 | 12,5; 53,5; 110,8; 167,8; 224,8; 281,8; 323 |  AR2500261; OT/2025/AR2500261.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500261. |
| lona; 400 × 210 | 12,5; 51,5; 105,5; 159,5; 198,5 | 12,5; 51,5; 105,5; 159,5; 198,5 | 12,5; 50; 100; 150; 200; 250; 300; 350; 388 |  AR2503722; OT/2025/AR2503722.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503722. |

### METALURGICAS NORTE BURGOS S.L. — 023649

Ficha: `metalurgicas-norte-burgos-s-l`. Histórico: **80 líneas / 57 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2603988). Nombres/alias del histórico: METALURGICAS NORTE BURGOS S.L..

Plantillas encontradas: `PL/METALURGICAS NORTE/NORTE.dwg`; `PL/METALURGICAS NORTE/NORTE2.DWG`; `PL/METALURGICAS NORTE/_CLOSE.dwg`

METALURGICAS NORTE/NORTE.dwg: puentes como ESVA, sin ventana, azul 5015; 10 cm de aguas incluidas en la altura; «toldo bajo» es baquetón sin aguas.

Nota fechada 10/03/2026: +1,5 cm. Nota 20/05/2026: +0,5 cm más, total remolque +2 cm en largo y ancho. Las hojas antiguas no bastan para convertir esa nota en las siete demasías de baquetón ni en una holgura general de lona.

Reglas añadidas a la propuesta: `ventana` = {"lleva":false}; `perfil` = {"tipoPerfil":"TIPO 03"}; `recogeAtras` = "PUENTES ESVA"; `bastillaEnfundar` = false.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 37 (AR2406114, AR2402778, AR2502117, AR2503685, AR2504797, AR2506302, AR2505254, AR2404582, AR2502805, AR2401158, AR2505455, AR2501137, AR2400680, AR2403085, AR2600222, AR2405707, AR2600406, AR2401226, AR2503180, AR2505724, AR2503492, AR2600792, AR2400730, AR2600750, AR2600255, AR2401917, AR2405116, AR2504111, AR2400792, AR2405634, AR2500391, AR2505110, AR2500829, AR2401819, AR2406296, AR2600853, AR2404307); TIPO 01: 1 (AR2503492) |
| recogeDelante | NO: 34 (AR2406114, AR2402778, AR2502117, AR2503685, AR2504797, AR2506302, AR2505254, AR2404582, AR2502805, AR2401158, AR2505455, AR2503492, AR2501137, AR2403085, AR2600222, AR2405707, AR2600406, AR2401226, AR2503180, AR2505724, AR2600792, AR2400730, AR2600750, AR2600255, AR2401917, AR2402200, AR2504111, AR2405634, AR2500391, AR2505110, AR2500829, AR2406296, AR2600853, AR2404307); PUENTES ESVA: 4 (AR2400680, AR2405116, AR2400792, AR2401819) |
| recogeAtras | PUENTES ESVA: 38 (AR2406114, AR2402778, AR2502117, AR2503685, AR2504797, AR2506302, AR2505254, AR2404582, AR2502805, AR2401158, AR2505455, AR2503492, AR2501137, AR2400680, AR2403085, AR2600222, AR2405707, AR2600406, AR2401226, AR2503180, AR2505724, AR2600792, AR2400730, AR2600750, AR2600255, AR2401917, AR2402200, AR2405116, AR2504111, AR2400792, AR2405634, AR2500391, AR2505110, AR2500829, AR2401819, AR2406296, AR2600853, AR2404307) |
| bastillaEnfundar | NO: 36 (AR2406114, AR2402778, AR2502117, AR2503685, AR2504797, AR2506302, AR2505254, AR2404582, AR2502805, AR2401158, AR2505455, AR2503492, AR2501137, AR2400680, AR2403085, AR2600222, AR2405707, AR2600406, AR2503180, AR2505724, AR2600792, AR2400730, AR2600750, AR2401917, AR2402200, AR2405116, AR2504111, AR2400792, AR2405634, AR2500391, AR2505110, AR2500829, AR2401819, AR2406296, AR2600853, AR2404307); SÍ: 1 (AR2600255) |
| ventana | NO: 36 (AR2406114, AR2402778, AR2502117, AR2503685, AR2506302, AR2505254, AR2404582, AR2502805, AR2401158, AR2505455, AR2503492, AR2501137, AR2400680, AR2403085, AR2405707, AR2600406, AR2401226, AR2503180, AR2505724, AR2600792, AR2400730, AR2600750, AR2600255, AR2401917, AR2402200, AR2405116, AR2504111, AR2400792, AR2405634, AR2500391, AR2505110, AR2500829, AR2401819, AR2406296, AR2600853, AR2404307); SÍ: 2 (AR2504797, AR2600222) |
| rotulacion | SI: 26 (AR2503685, AR2504797, AR2506302, AR2505254, AR2401158, AR2505455, AR2503492, AR2501137, AR2400680, AR2600222, AR2600406, AR2401226, AR2503180, AR2505724, AR2600792, AR2400730, AR2600750, AR2600255, AR2402200, AR2405116, AR2504111, AR2400792, AR2500391, AR2500829, AR2401819, AR2600853); NO: 7 (AR2406114, AR2502117, AR2502805, AR2405707, AR2405634, AR2505110, AR2404307); SÍ: 5 (AR2402778, AR2404582, AR2403085, AR2401917, AR2406296) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 35 (AR2406590, AR2406114, AR2402778, AR2502117, AR2503685, AR2504797, AR2506302, AR2404582, AR2502805, AR2505110, AR2401158, AR2505455, AR2501137, AR2501277, AR2600406, AR2401226, AR2503798, AR2503180, AR2503492, AR2600792, AR2600750, AR2600255, AR2401917, AR2404808, AR2404154, AR2402200, AR2405116, AR2504111, AR2503505, AR2500391, AR2500829, AR2501670, AR2406296, AR2600853, AR2500229); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 3 (AR2505254, AR2503492, AR2600222); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 3 (AR2400680, AR2406114, AR2500391); LONA ALPHA 1L 580  :NEGRO :250 AN: 2 (AR2406114, AR2405707); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 2 (AR2400792, AR2401819); LONA STARPLUS 1L 610  :ROJO RAL3002 :250 AN: 2 (AR2405634, AR2404307); LONA ALPHA 1L 580 :AMARILLO RAL1018 :250 AN: 1 (AR2403085); LONA NS86 2L 630GR  [580]: AZUL CLARO 5015 : 250 AN: 1 (AR2505724); LONA ALPHA 1L 580: AZUL RAL5015: 220 AN: 1 (AR2400730) |
| modo | SEGUN SE INDICA: 45 (AR2406590, AR2406114, AR2402778, AR2502117, AR2503685, AR2504797, AR2506302, AR2505254, AR2404582, AR2502805, AR2505110, AR2401158, AR2505455, AR2503492, AR2501137, AR2501277, AR2400680, AR2403085, AR2600222, AR2405707, AR2600406, AR2401226, AR2503798, AR2503180, AR2505724, AR2600792, AR2400730, AR2600750, AR2600255, AR2401917, AR2404808, AR2402200, AR2405116, AR2504111, AR2400792, AR2503505, AR2405634, AR2500391, AR2500829, AR2501670, AR2401819, AR2406296, AR2600853, AR2404307, AR2500229); REPARTIDOS: 2 (AR2406114, AR2404154) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 160 × 120 | 10; 40,3; 80,8; 111 | 10; 40,3; 80,8; 111 | 10,6; 50,5; 110,5; 150,4 |  AR2501277; OT/2025/AR2501277.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2501277 / 1 pedido(s): AR2406590. |
| baqueton; 180 × 120 | 10; 40,3; 80,8; 111 | 10; 40,3; 80,8; 111 | 9,5; 40; 93,5; 143,5; 171 |  AR2406114; OT/2024/AR2406114-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406114. |
| baqueton; 200 × 130 | 10; 42,8; 88,3; 121 | 10; 42,8; 88,3; 121 | 12,5; 62,8; 138,3; 188,5 |  AR2500229; OT/2025/AR2500229.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2500229, AR2503798. |
| baqueton; 220 × 120 | 10; 40,3; 80,8; 111 | 10; 40,3; 80,8; 111 | 10,25; 45,45; 110,45; 175,45; 210,75 |  AR2503492; OT/2025/AR2503492-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503492. |
| baqueton; 225 × 130 | 10; 42,8; 88,3; 121 | 10; 42,8; 88,3; 121 | 10,3; 47,5; 114,5; 180; 215,8 |  AR2600406; OT/2026/AR2600406.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2503505, AR2600406 / 1 pedido(s): AR2505110 / 1 pedido(s): AR2406114 / 1 pedido(s): AR2405116 / 1 pedido(s): AR2404154. |
| baqueton; 225 × 150 | 10; 50,3; 100,8; 141 | 10; 50,3; 100,8; 141 | 10,3; 47,5; 113; 180; 215,8 |  AR2500391; OT/2025/AR2500391-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500391. |
| baqueton; 230 × 135 | 10; 45,3; 90,8; 126 | 10; 45,3; 90,8; 126 | 11; 49; 114,5; 181,5; 221 |  AR2402778; OT/2024/AR2402778.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402778. |
| baqueton; 250 × 130 | 10; 42,7; 88,2; 121 | 10; 42,7; 88,2; 121 | 9,5; 46,3; 98,8; 151,3; 203,8; 239 |  AR2500829; OT/2025/AR2500829.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500829. |
| baqueton; 250 × 140 | 10; 45,3; 95,8; 131 | 10; 45,3; 95,8; 131 | 11; 46,3; 98,8; 151,3; 203,8; 240 |  AR2502117; OT/2025/AR2502117.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2502117 / 1 pedido(s): AR2406590. |
| baqueton; 250 × 150 | 10; 50,3; 100,7; 141 | 10; 50,3; 100,7; 141 | 9,5; 46,3; 98,8; 151,3; 203,8; 239 |  AR2501670; OT/2025/AR2501670.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501670. |
| baqueton; 253 × 133 | 10; 43,5; 90,5; 124 | 10; 43,5; 90,5; 124 | 11; 47,8; 100,3; 152,8; 205,3; 240,5 |  AR2505110; OT/2025/AR2505110-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505110. |
| baqueton; 300 × 160 | 10; 50; 110; 150,5 | 10; 50; 110; 150,5 | 10; 52,5; 117,8; 183,3; 248,5; 291 |  AR2503180; OT/2025/AR2503180.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503180. |
| baqueton; 312 × 205 | 10; 33,3; 79,8; 126,3; 172,8; 196 | 10; 33,3; 79,8; 126,3; 172,8; 196 | 11; 35,3; 83,9; 156,7; 181; 229,5; 277,6; 302,5 |  AR2404808; OT/2024/AR2404808.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404808. |
| lona; 150 × 110 | 10; 37,8; 73,3; 101 | 10; 37,8; 73,3; 101 | 10; 47,8; 103,3; 141 |  AR2504111; OT/2025/AR2504111.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504111. |
| lona; 151 × 100 | 10; 37; 64; 91 | 10; 37; 64; 91 | 10; 54; 98; 142 |  AR2400730; OT/2024/AR2400730.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400730. |
| lona; 160 × 120 | 10; 40,3; 80,8; 111 | 10; 40,3; 80,8; 111 | 10,6; 50,5; 110,5; 150,4 |  AR2505110; OT/2025/AR2505110.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505110. |
| lona; 180 × 120 | 10; 40,3; 80,8; 111 | 10; 40,3; 80,8; 111 | 10; 37,5; 87,5; 141; 171,5 |  AR2503685; OT/2025/AR2503685.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503685. |
| lona; 180 × 130 | 10; 42,7; 88,2; 121 | 10; 42,7; 88,2; 121 | 10; 37,5; 87,5; 141; 171,5 |  AR2500829; OT/2025/AR2500829.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500829. |
| lona; 200 × 120 | 10; 33,5; 60,5; 87,5; 111 | 10; 33,5; 60,5; 87,5; 111 | 10; 40,1; 80,4; 120,6; 160,9; 191 |  AR2505254; OT/2025/AR2505254.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505254. |
| lona; 200 × 130 | 10; 42,7; 88,2; 121 | 10; 42,7; 88,2; 121 | 10; 40; 97; 157,5; 191 |  AR2600406; OT/2026/AR2600406.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2600406 / 1 pedido(s): AR2600853. |
| lona; 200 × 140 | 10; 45,3; 95,8; 131 | 10; 45,3; 95,8; 131 | 10; 40,1; 80,4; 120,6; 160,9; 191 |  AR2505724; OT/2025/AR2505724-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505724. |
| lona; 207 × 120 | 10; 40,3; 80,8; 111 | 10; 40,3; 80,8; 111 | 10; 47,5; 107,5; 164; 197 |  AR2401917; OT/2024/AR2401917-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401917. |
| lona; 225 × 130 | 10; 42,7; 88,2; 121 | 10; 42,7; 88,2; 121 | 10; 47; 114; 179,5; 215 |  AR2505724; OT/2025/AR2505724.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 3 pedido(s): AR2501137, AR2503492, AR2505724 / 2 pedido(s): AR2500391, AR2502805 / 1 pedido(s): AR2401158. |
| lona; 225 × 150 | 10; 50,3; 100,8; 141 | 10; 50,3; 100,8; 141 | 10; 46,5; 112; 179; 215,5 |  AR2401917; OT/2024/AR2401917-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2401917 / 1 pedido(s): AR2401226. |
| lona; 230 × 130 | 10; 42,8; 88,3; 121 | 10; 42,8; 88,3; 121 | 10; 46,5; 113,5; 182; 220 |  AR2404582; OT/2024/AR2404582.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404582. |
| lona; 230 × 140 | 10; 45,3; 95,8; 131 | 10; 45,3; 95,8; 131 | 10; 52; 119; 184,5; 220 |  AR2600750; OT/2026/AR2600750.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600750. |
| lona; 230 × 160 | 10; 52,8; 108,3; 151 | 10; 52,8; 108,3; 151 | 20; 58; 123,5; 190,5; 230 |  AR2402778; OT/2024/AR2402778.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402778. |
| lona; 235 × 149 | 10; 47,5; 102,5; 140 | 10; 47,5; 102,5; 140 | 13; 52,5; 119,5; 185; 223 |  AR2503492; OT/2025/AR2503492-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503492. |
| lona; 250 × 130 | 10; 42,7; 88,2; 121 | 10; 42,7; 88,2; 121 | 9,5; 46,3; 98,8; 151,3; 203,8; 239 |  AR2600792; OT/2026/AR2600792.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2600792 / 1 pedido(s): AR2405116. |
| lona; 250 × 140 | 10; 45,3; 95,8; 131 | 10; 45,3; 95,8; 131 | 11; 46,3; 98,8; 151,3; 203,8; 240,5 |  AR2503180; OT/2025/AR2503180.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503180. |
| lona; 250 × 150 | 10; 47,8; 103,3; 141 | 10; 47,8; 103,3; 141 | 9,5; 46,3; 98,8; 151,1; 203,8; 239 |  AR2600222; OT/2026/AR2600222.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 4 pedido(s): AR2404307, AR2405634, AR2405707, AR2406296 / 3 pedido(s): AR2504797, AR2505455, AR2506302 / 1 pedido(s): AR2600222 / 1 pedido(s): AR2502117 / 1 pedido(s): AR2403085. |
| lona; 261 × 150 | 10; 50,3; 100,8; 141 | 10; 50,3; 100,8; 141 | 10,5; 48,7; 103,2; 158,7; 213,2; 251,5 |  AR2406114; OT/2024/AR2406114-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406114. |
| lona; 271 × 181 | 17,5; 53,5; 91; 128,5; 164,5 | 17,5; 63; 119; 164,5 | 17,5; 68,5; 136; 203,5; 254,5 |  AR2400680; OT/2024/AR2400680.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400680. |
| lona; 300 × 180 | 10; 50,3; 90,5; 130,8; 171 | 10; 50,3; 90,5; 130,8; 171 | 11; 66,1; 122,2; 178,3; 234,4; 290,5 |  AR2402200; OT/2024/AR2402200.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402200. |
| lona; 310 × 164 | 12,6; 52,5; 112,5; 152,4 | 12,6; 52,5; 112,5; 152,4 | 9,75; 34,05; 82,65; 131,25; 179,75; 228,25; 276,85; 301,25 |  AR2600255; OT/2026/AR2600255.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600255. |
| lona; 330 × 190 | 10; 45,2; 95,5; 147,2; 181 | 10; 45,2; 95,5; 147,2; 181 | 10,5; 49,5; 107,5; 165,5; 223,5; 281,5; 320,5 |  AR2500391; OT/2025/AR2500391-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500391. |
| lona; 400 × 190 | 10; 45; 95,5; 146; 181 | 10; 45; 95,5; 146; 181 | 13; 50,5; 100,5; 150,5; 200,5; 250,5; 300,5; 350,5; 388,5 |  AR2400792; OT/2024/AR2400792.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400792. |
| lona; 400 × 193 | 10; 46,7; 97; 147,3; 184 | 10; 46,7; 97; 147,3; 184 | 12,8; 50,5; 100,5; 200,5; 250,5; 300,5; 350,5; 388,3 |  AR2401819; OT/2024/AR2401819.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401819. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 280 × 160 | AR2404101 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404101.dwg; OT/2024/AR2404101.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 412 × 195 | AR2502225 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2502225.dwg; OT/2025/AR2502225.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 303 × 160 | AR2601144 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601144.dwg; OT/2026/AR2601144.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 210,5 × 130,5 | AR2602338 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602338.dwg; OT/2026/AR2602338.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 275 × 150 | AR2603557 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603557.dwg; OT/2026/AR2603557.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 262 × 162 | AR2603988 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603988.dwg; OT/2026/AR2603988.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

**Duda para Iván:** ¿La holgura total de 2 cm de largo y ancho de la nota de mayo se aplica tanto a la lona alta como al baquetón? FichaCliente no tiene una holgura general de lona; hay que confirmar las demasías antes de automatizarla.

### www.remolquesnunez.com · REMOLQUES NUÑEZ, S. L. — 001302

Ficha: `www-remolquesnunez-com-remolques-nunez-s-l`. Histórico: **80 líneas / 32 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por histórico (AR2603693). Nombres/alias del histórico: www.remolquesnunez.com · REMOLQUES NUÑEZ, S. L..

Plantillas encontradas: `PL/NUÑEZ(TUBILLA-BURGOS)(remolquesnuñez.com)4.DWG`; `PL/REMOLQUES GANADO/REMOLQUES NUÑEZ (TUBILLA)/REMOLQUES NUÑEZ VAN-1.dwg`

OLLAOS/REMOLQUILLEROS.doc: cremallera gorda, normalmente gris, sin ventana, 2 cm de aguas a mayores; si baja menos de 10 cm es baquetón sin aumento de aguas.

El aumento de aguas es una operación sobre el pedido, no una altura fija de aguas que se pueda imponer a todos los perfiles.

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `ventana` = {"lleva":false}; `perfil` = {"tipoPerfil":"TIPO 02"}; `recogeAtras` = "CREMALLERA".

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 25 (AR2401157, AR2600480, AR2501947, AR2601189, AR2401840, AR2500595, AR2503142, AR2503951, AR2404306, AR2407011, AR2403884, AR2502213, AR2405345, AR2501121, AR2403077, AR2404382, AR2506231, AR2506039, AR2600701, AR2505807, AR2505957, AR2406560, AR2504494, AR2601288, AR2600738); TIPO 03: 1 (AR2400340) |
| recogeDelante | NO: 23 (AR2401157, AR2600480, AR2406162, AR2501947, AR2601189, AR2401840, AR2503142, AR2503951, AR2404306, AR2407011, AR2403884, AR2405345, AR2501121, AR2403077, AR2500595, AR2404382, AR2400340, AR2505807, AR2505957, AR2406560, AR2504494, AR2601288, AR2600738); CREMALLERA: 8 (AR2600480, AR2401157, AR2500595, AR2502213, AR2506231, AR2506039, AR2600701, AR2403884) |
| recogeAtras | CREMALLERA: 27 (AR2401157, AR2600480, AR2406162, AR2501947, AR2601189, AR2401840, AR2500595, AR2503142, AR2503951, AR2404306, AR2407011, AR2403884, AR2502213, AR2405345, AR2501121, AR2403077, AR2404382, AR2506231, AR2400340, AR2506039, AR2600701, AR2505807, AR2505957, AR2406560, AR2504494, AR2601288, AR2600738) |
| bastillaEnfundar | NO: 25 (AR2600480, AR2401157, AR2406162, AR2501947, AR2601189, AR2401840, AR2503142, AR2404306, AR2407011, AR2403884, AR2502213, AR2501121, AR2500595, AR2405345, AR2404382, AR2506231, AR2400340, AR2506039, AR2505807, AR2403077, AR2406560, AR2504494, AR2601288, AR2503951, AR2600738); SÍ: 7 (AR2401157, AR2500595, AR2503951, AR2405345, AR2403077, AR2600701, AR2505957) |
| ventana | NO: 27 (AR2401157, AR2600480, AR2406162, AR2501947, AR2601189, AR2401840, AR2500595, AR2503142, AR2503951, AR2404306, AR2407011, AR2403884, AR2502213, AR2405345, AR2501121, AR2403077, AR2404382, AR2506231, AR2400340, AR2506039, AR2600701, AR2505807, AR2505957, AR2406560, AR2504494, AR2601288, AR2600738) |
| rotulacion | SI: 20 (AR2401157, AR2600480, AR2501947, AR2601189, AR2401840, AR2500595, AR2503142, AR2503951, AR2407011, AR2502213, AR2501121, AR2404382, AR2506231, AR2506039, AR2600701, AR2505807, AR2505957, AR2504494, AR2601288, AR2600738); SÍ: 7 (AR2406162, AR2404306, AR2403884, AR2405345, AR2403077, AR2400340, AR2406560) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 12 (AR2401157, AR2600480, AR2401840, AR2406162, AR2404306, AR2407011, AR2403884, AR2405345, AR2403077, AR2400340, AR2500595, AR2406560); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 12 (AR2502012, AR2501947, AR2503951, AR2503142, AR2502213, AR2501121, AR2506231, AR2506039, AR2505807, AR2505957, AR2504494, AR2601288); LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 3 (AR2601189, AR2600701, AR2600738); LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 2 (AR2600480, AR2400340); LONA MONZA 1 L 580 G/M2: GRIS RAL 7038: 250 AN: 2 (AR2503142, AR2503182); LONA STARPLUS 1L 610  :ROJO RAL3002 :250 AN: 1 (AR2500595); LONA ALPHA 1L 580 :VERDE RAL6024 :250 AN: 1 (AR2404382) |
| modo | REPARTIDOS: 21 (AR2401157, AR2600480, AR2501947, AR2601189, AR2500595, AR2503142, AR2503951, AR2404306, AR2407011, AR2502213, AR2501121, AR2404382, AR2506231, AR2506039, AR2600701, AR2505807, AR2505957, AR2406560, AR2504494, AR2601288, AR2600738); SEGUN SE INDICA: 11 (AR2401840, AR2406162, AR2502012, AR2501947, AR2503142, AR2403884, AR2405345, AR2403077, AR2400340, AR2503182, AR2406560) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 143 × 100 | 2,5; 34,5; 66,5; 98,5 | 2,5; 34,5; 66,5; 98,5 | 2,5; 37,5; 72; 106,5; 141,5 |  AR2403884; OT/2024/AR2403884-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2403077, AR2403884. |
| baqueton; 153 × 105 | 2,5; 36,2; 69,8; 103,5 | 2,5; 36,2; 69,8; 103,5 | 4; 33,2; 62,4; 91,6; 120,8; 150 |  AR2401840; OT/2024/AR2401840-15.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401840. |
| baqueton; 173 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 36,3; 70,1; 103,9; 137,7; 171,5 |  AR2500595; OT/2025/AR2500595-10.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500595. |
| baqueton; 193 × 120 | 2,5; 41,2; 79,8; 118,5 | 2,5; 41,2; 79,8; 118,5 | 2,5; 34; 65,5; 97; 128,5; 160; 191,5 |  AR2605088; OT/2026/AR2605088.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605088. |
| baqueton; 193 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 3; 34,3; 65,7; 97; 128,3; 159,7; 191,5 |  AR2400340; OT/2024/AR2400340-2.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400340. |
| baqueton; 213 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 37,3; 72,2; 107; 141,8; 176,7; 211,5 |  AR2501121; OT/2025/AR2501121-11.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501121. |
| baqueton; 213 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 37,3; 72,2; 107; 141,8; 176,7; 211,5 |  AR2501121; OT/2025/AR2501121.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501121. |
| baqueton; 223 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 33,8; 65,1; 96,4; 127,6; 158,9; 190,2; 221,5 |  AR2501947; OT/2025/AR2501947-14.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501947. |
| baqueton; 223 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5; 185; 221,5 |  AR2605088; OT/2026/AR2605088.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605088. |
| baqueton; 233 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,2; 67,9; 100,6; 133,4; 166,1; 198,8; 231,5 |  AR2502012; OT/2025/AR2502012-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2501947, AR2502012, AR2503142. |
| baqueton; 253 × 150 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 33,6; 64,8; 95,9; 127; 158,1; 189,3; 220,4; 251,5 |  AR2502012; OT/2025/AR2502012.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2501947, AR2502012 / 1 pedido(s): AR2605088. |
| baqueton; 275 × 160 | 2,5; 31,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 32,6; 62,7; 92,8; 122,9; 153,1; 183,2; 213,3; 243,4; 273,5 |  AR2406560; OT/2024/AR2406560.xlsb / BAQUETÓN, filas 33/34/35, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2406560 / 1 pedido(s): AR2401840. |
| baqueton; 303 × 190 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5; 188,5 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5; 188,5 | 2,5; 35,7; 68,9; 102,2; 135,4; 168,6; 201,8; 235,1; 268,3; 301,5 |  AR2501947; OT/2025/AR2501947-15.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501947. |
| baqueton; 303 × 200 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 | 19,55; 52,65; 85,75; 118,85; 151,95; 185,15; 218,25; 251,35; 284,45 |  AR2401840; OT/2024/AR2401840-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401840. |
| baqueton; 337 × 175 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 | 2,5; 35,8; 69,1; 102,4; 135,7; 169; 202,3; 235,6; 268,9; 302,2; 335,5 |  AR2503182; OT/2025/AR2503182.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503182. |
| lona; 143 × 100 | 2,5; 34,5; 66,5; 98,5 | 2,5; 34,5; 66,5; 98,5 | 2,5; 37,5; 71,5; 107,5; 141,5 |  AR2401840; OT/2024/AR2401840-14.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401840. |
| lona; 153 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 32,3; 62,1; 91,9; 121,7; 151,5 |  AR2506039; OT/2025/AR2506039.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506039. |
| lona; 173 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 36,3; 70,1; 103,9; 137,7; 171,5 |  AR2500595; OT/2025/AR2500595-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2500595 / 1 pedido(s): AR2406560. |
| lona; 193 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 4; 35; 66; 97; 128; 159; 190 |  AR2403884; OT/2024/AR2403884-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2403884 / 1 pedido(s): AR2403077. |
| lona; 193 × 135 | 2,5; 34,3; 68; 102; 133,5 | 2,5; 34,3; 68; 102; 133,5 | 2,5; 35; 66; 97; 128; 159; 191,5 |  AR2401840; OT/2024/AR2401840-13.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401840. |
| lona; 213 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 37,3; 72,2; 107; 141,8; 176,7; 211,5 |  AR2600480; OT/2026/AR2600480.xlsb / LONA REMOLQUE 224964, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600480. |
| lona; 213 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 37,3; 72,2; 107; 141,8; 176,7; 211,5 |  AR2501947; OT/2025/AR2501947-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 5 pedido(s): AR2400340, AR2404382, AR2501121, AR2501947, AR2601288. |
| lona; 223 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 33,8; 65,1; 96,4; 127,6; 158,9; 190,2; 221,5 |  AR2503951; OT/2025/AR2503951-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503951. |
| lona; 223 × 150 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 33,8; 65,1; 96,4; 127,7; 158,7; 190,2; 221,5 |  AR2500595; OT/2025/AR2500595-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500595. |
| lona; 225 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39,3; 76,2; 113; 149,8; 186,7; 223,5 |  AR2605088; OT/2026/AR2605088.pdf; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2605088 / 1 pedido(s): AR2405345. |
| lona; 233 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 25,2; 67,9; 100,6; 133,4; 166,1; 198,8; 231,5 |  AR2600738; OT/2026/AR2600738.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 2 pedido(s): AR2503142, AR2600480 / 1 pedido(s): AR2600738 / 1 pedido(s): AR2405345 / 1 pedido(s): AR2403884. |
| lona; 235 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5; 233,5 |  AR2605088; OT/2026/AR2605088.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605088. |
| lona; 243 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 36,6; 70,8; 104,9; 139,1; 173,2; 207,4; 241,5 |  AR2600480; OT/2026/AR2600480.xlsb / LONA REMOLQUE 224961, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600480. |
| lona; 243 × 150 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 36,6; 70,8; 104,9; 139,1; 173,2; 207,3; 241,5 |  AR2407011; OT/2024/AR2407011.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2407011. |
| lona; 245 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 32,6; 62,8; 92,9; 123; 153,1; 183,3; 213,4; 243,5 |  AR2502213; OT/2025/AR2502213.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502213. |
| lona; 253 × 150 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 38,1; 73,6; 109,2; 144,8; 180,4; 215,9; 251,5 |  AR2600480; OT/2026/AR2600480.xlsb / LONA REMOLQUE 224963, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2600480 / 1 pedido(s): AR2403884 / 1 pedido(s): AR2401840. |
| lona; 253 × 170 | 2,5; 35,7; 68,9; 102,1; 135,3; 168,5 | 2,5; 35,7; 68,9; 102,1; 135,3; 168,5 | 2,5; 38,1; 73,6; 109,2; 144,8; 180,4; 215,9; 251,5 |  AR2504494; OT/2025/AR2504494.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504494. |
| lona; 255 × 150 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 33,6; 65,3; 96,6; 128; 159,4; 190,8; 222,1; 253,5 |  AR2505807; OT/2025/AR2505807.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2505807 / 1 pedido(s): AR2406162. |
| lona; 255 × 180 | 17,5; 46,7; 75,9; 105,1; 134,3; 163,5 | 17,5; 46,7; 75,9; 105,1; 134,3; 163,5 | 17,5; 50,1; 81,3; 112,4; 143,6; 174,7; 205,9; 238,5 |  AR2405345; OT/2024/AR2405345-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405345. |
| lona; 273 × 150 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 36,1; 69,8; 103,4; 137; 170,6; 204,3; 237,9; 271,5 |  AR2506231; OT/2025/AR2506231.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506231. |
| lona; 273 × 160 | 2,5; 33,7; 64,9; 96,14; 127,3; 158,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 36,5; 70; 103,5; 137; 170,5; 204; 237,5; 271,5 |  AR2403077; OT/2024/AR2403077-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403077. |
| lona; 273 × 170 | 2,5; 35,7; 68,9; 102,1; 135,3; 168,5 | 2,5; 35,7; 68,9; 102,1; 135,3; 168,5 | 2,5; 36,1; 69,8; 103,4; 137; 170,6; 204,3; 237,9; 271,5 |  AR2605088; OT/2026/AR2605088.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605088. |
| lona; 273 × 190 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5; 188,5 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5; 188,5 | 2,5; 36,1; 69,8; 103,4; 137; 170,6; 204,3; 237,9; 271,5 |  AR2600701; OT/2026/AR2600701.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2600701 / 1 pedido(s): AR2600480. |
| lona; 303 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 35,7; 68,9; 102,2; 135,4; 168,6; 201,8; 235,1; 268,3; 301,5 |  AR2605088; OT/2026/AR2605088.pdf; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2605088 / 1 pedido(s): AR2600480. |
| lona; 303 × 180 | 2,5; 37,7; 72,9; 108,1; 143,3; 178,5 | 2,5; 37,7; 72,9; 108,1; 143,3; 178,5 | 2,5; 35,7; 68,9; 102,2; 135,4; 168,6; 201,8; 235,1; 268,3; 301,5 |  AR2505957; OT/2025/AR2505957.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505957. |
| lona; 303 × 200 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 | 2,5; 35,7; 68,9; 102,2; 135,4; 168,6; 201,8; 235,1; 268,3; 301,5 |  AR2503951; OT/2025/AR2503951.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503951. |
| lona; 303 × 210 | 2,5; 36,8; 71,2; 105,5; 139,8; 174,2; 208,5 | 2,5; 36,8; 71,2; 105,5; 139,8; 174,2; 208,5 | 2,5; 35,7; 68,9; 102,2; 135,4; 168,6; 201,8; 235,1; 268,3; 301,5 |  AR2503142; OT/2025/AR2503142-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503142. |
| lona; 403 × 160 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 19,15; 52,45; 85,65; 118,95; 152,15; 185,45; 218,65; 252,15; 285,15; 318,45; 351,65; 384,85 |  AR2500595; OT/2025/AR2500595-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500595. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 305 × 190 | AR2401157 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2401157-1.xlsb; OT/2024/AR2401157-2.xlsb; OT/2024/AR2401157-3.xlsb; OT/2024/AR2401157-4.xlsb; OT/2024/AR2401157-5.xlsb; OT/2024/AR2401157.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 355 × 190 | AR2401157 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2401157-1.xlsb; OT/2024/AR2401157-2.xlsb; OT/2024/AR2401157-3.xlsb; OT/2024/AR2401157-4.xlsb; OT/2024/AR2401157-5.xlsb; OT/2024/AR2401157.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 220 × 160 | AR2407010 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 353 × 135 | AR2501121 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501121-11.xlsb; OT/2025/AR2501121.dwg; OT/2025/AR2501121.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 253 × 135 | AR2501947 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501947-10.xlsb; OT/2025/AR2501947-11.xlsb; OT/2025/AR2501947-12.xlsb; OT/2025/AR2501947-13.xlsb; OT/2025/AR2501947-14.xlsb; OT/2025/AR2501947-15.xlsb; OT/2025/AR2501947.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 2530 × 150 | AR2600738 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2600738.dwg; OT/2026/AR2600738.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 255 × 170 | AR2601189 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601189.dwg; OT/2026/AR2601189.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 313 × 180 | AR2602076 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602076.dwg; OT/2026/AR2602076.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 255 × 150 | AR2602076, AR2603693 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602076.dwg; OT/2026/AR2602076.xlsb; OT/2026/AR2603693.dwg; OT/2026/AR2603693.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 305 × 170 | AR2602076 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602076.dwg; OT/2026/AR2602076.xlsb; OT/2026/AR2602076.dwg; OT/2026/AR2602076.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 303 × 170 | AR2603693 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603693.dwg; OT/2026/AR2603693.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 253 × 180 | AR2603693 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603693.dwg; OT/2026/AR2603693.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### CANO MUÑOZ, FRANCISCO — 045288

Ficha: `cano-munoz-francisco`. Histórico: **61 líneas / 41 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2506232). Nombres/alias del histórico: CANO MUÑOZ, FRANCISCO.

Plantillas encontradas: `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/CANO MUÑOZ.xls`; `PL/CANO MUÑOZ(METALCAR)/CANO BAQUETON.xls`; `PL/CANO MUÑOZ(METALCAR)/Copia de CANO BAQUETON.xls`; `PL/CANO MUÑOZ(METALCAR)/REMOLQUES CANO(METALURGIA Y CARROCERIAS).dwg`; `PL/CALCULOS REMOLQUES/CANO MUÑOZ.xls`

CANO MUÑOZ(METALCAR)/REMOLQUES CANO(METALURGIA Y CARROCERIAS).dwg: el cliente da la holgura; en lonas que recogen, solo aumento de costura. Indica 16 cm de aguas incluidos en altura y cremallera atrás.

En baquetón indica +0,5 cm al largo y ancho; también hay una nota de +0,5 al ancho por la máquina de corte. Son notas distintas y no se suman a ciegas. El propio DWG pide consultar AR1502785 si hay duda.

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `perfil` = {"tipoPerfil":"TIPO 03"}; `recogeDelante` = "NO"; `recogeAtras` = "CREMALLERA"; `ventana` = {"lleva":false}.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 21 (AR2506232, AR2500120, AR2502938, AR2405774, AR2500557, AR2505290, AR2500050, AR2502639, AR2505702, AR2502662, AR2502285, AR2504126, AR2406975, AR2502864, AR2505925, AR2504407, AR2406500, AR2403311, AR2404257, AR2500855, AR2505107); TIPO 02: 1 (AR2504932) |
| recogeDelante | NO: 22 (AR2506232, AR2500120, AR2502938, AR2500557, AR2501116, AR2500050, AR2502639, AR2505702, AR2502662, AR2502285, AR2504126, AR2406975, AR2502864, AR2505925, AR2504407, AR2406846, AR2406500, AR2403311, AR2404257, AR2500855, AR2504932, AR2505107); CREMALLERA: 2 (AR2405774, AR2505290) |
| recogeAtras | CREMALLERA: 24 (AR2506232, AR2500120, AR2502938, AR2405774, AR2500557, AR2501116, AR2505290, AR2500050, AR2502639, AR2505702, AR2502662, AR2502285, AR2504126, AR2406975, AR2502864, AR2505925, AR2504407, AR2406846, AR2406500, AR2403311, AR2404257, AR2500855, AR2504932, AR2505107) |
| bastillaEnfundar | NO: 21 (AR2506232, AR2500120, AR2502938, AR2405774, AR2500557, AR2501116, AR2500050, AR2502639, AR2505702, AR2502662, AR2502285, AR2504126, AR2406975, AR2502864, AR2505925, AR2504407, AR2403311, AR2404257, AR2500855, AR2504932, AR2505107); SÍ: 3 (AR2505290, AR2406846, AR2406500) |
| ventana | NO: 24 (AR2506232, AR2500120, AR2502938, AR2405774, AR2500557, AR2501116, AR2505290, AR2500050, AR2502639, AR2505702, AR2502662, AR2502285, AR2504126, AR2406975, AR2502864, AR2505925, AR2504407, AR2406846, AR2406500, AR2403311, AR2404257, AR2500855, AR2504932, AR2505107) |
| rotulacion | SI: 17 (AR2506232, AR2500120, AR2502938, AR2500557, AR2505290, AR2500050, AR2502639, AR2505702, AR2502662, AR2502285, AR2504126, AR2406975, AR2502864, AR2505925, AR2500855, AR2504932, AR2505107); SÍ: 6 (AR2405774, AR2501116, AR2406846, AR2406500, AR2403311, AR2404257); SII: 1 (AR2504407) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 25 (AR2506232, AR2500120, AR2502938, AR2405774, AR2500557, AR2501116, AR2500050, AR2501877, AR2502639, AR2404304, AR2504126, AR2401455, AR2406975, AR2502864, AR2505925, AR2506127, AR2504407, AR2406846, AR2406500, AR2403311, AR2504504, AR2500855, AR2500740, AR2504932, AR2505107); LONA NS86 2L 630GR  [580]: AZUL CLARO 5015 : 250 AN: 2 (AR2505702, AR2505360); LONA G650 2L 650 :AZUL RAL5015 :250 AN (M5729): 1 (AR2501116); LONA NS86 2L 630GR [580] : AZUL CLARO (SIMILAR 5015 ): 250AN: 1 (AR2505290); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2502662); LONA NS86 2L 630GR [580]: ROJO (COR/400): 250 AN: 1 (AR2502285); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2404257) |
| modo | REPARTIDOS: 23 (AR2506232, AR2500120, AR2502938, AR2405774, AR2500557, AR2501116, AR2505290, AR2500050, AR2502639, AR2404304, AR2505702, AR2502662, AR2502285, AR2504126, AR2406975, AR2502864, AR2505925, AR2504407, AR2406500, AR2500855, AR2500740, AR2504932, AR2505107); SEGUN SE INDICA: 10 (AR2506232, AR2501877, AR2401455, AR2505360, AR2505925, AR2506127, AR2406846, AR2403311, AR2504504, AR2404257) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 156 × 121 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 32,9; 63,3; 93,7; 124,1; 154,5 |  AR2505360; OT/2025/AR2505360.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505360. |
| baqueton; 157 × 122 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 33,1; 63,5; 94,3; 124,9; 155,5 |  AR2501877; OT/2025/AR2501877.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501877. |
| baqueton; 186 × 121 | 2,75; 31,85; 61,05; 90,15; 119,25 | 2,75; 31,85; 61,05; 90,15; 119,25 | 2,75; 33,05; 63,25; 93,55; 123,75; 154,05; 184,25 |  AR2401455; OT/2024/AR2401455-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401455. |
| baqueton; 187 × 122 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 33; 63,5; 94; 124,5; 155; 185,5 |  AR2506127; OT/2025/AR2506127.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506127. |
| baqueton; 221 × 121 | 2,75; 31,85; 61,05; 90,15; 119,25 | 2,75; 31,85; 61,05; 90,15; 119,25 | 2,75; 33,65; 64,65; 95,55; 126,45; 157,35; 188,35; 219,25 |  AR2401455; OT/2024/AR2401455-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401455. |
| baqueton; 221 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5; 188,5; 219,5 |  AR2506232; OT/2025/AR2506232.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 5 pedido(s): AR2504504, AR2505360, AR2505925, AR2506127, AR2506232. |
| baqueton; 221 × 151 | 2,5; 31,9; 61,3; 90,7; 120,1; 149,5 | 2,5; 31,9; 61,3; 90,7; 120,1; 149,5 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5; 188,5; 219,5 |  AR2506232; OT/2025/AR2506232-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506232. |
| baqueton; 222 × 132 | 2,5; 34,4; 66,5; 98,6; 130,5 | 2,5; 34,4; 66,5; 98,6; 130,5 | 2,5; 33,9; 65,1; 96; 127; 157,9; 189,1; 220,5 |  AR2501116; OT/2025/AR2501116-10.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501116. |
| baqueton; 251 × 131 | 2,75; 34,35; 66,05; 97,65; 129,25 | 2,75; 34,35; 66,05; 97,65; 129,25 | 2,75; 33,15; 64,15; 95,05; 126,05; 156,95; 187,85; 218,85; 249,25 |  AR2404304; OT/2024/AR2404304.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404304. |
| baqueton; 251 × 151 | 2,5; 31,9; 61,3; 90,7; 120,1; 149,5 | 2,5; 31,9; 61,3; 90,7; 120,1; 149,5 | 2,5; 37,8; 73,1; 108,4; 143,6; 178,9; 214,2; 249,5 |  AR2500740; OT/2025/AR2500740.xlsb / BAQUETÓN, filas 33/34/35, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2500740 / 1 pedido(s): AR2500557. |
| lona; 158 × 102 | 2,5; 35,2; 67,8; 100,5 | 2,5; 35,2; 67,8; 100,5 | 2,5; 33,3; 64,1; 94,9; 125,7; 156,5 |  AR2505702; OT/2025/AR2505702.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2505702, AR2505925. |
| lona; 188 × 122 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 33,2; 63,8; 94,5; 125,2; 155,8; 186,5 |  AR2506232; OT/2025/AR2506232.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2506232 / 1 pedido(s): AR2500050 / 1 pedido(s): AR2405774. |
| lona; 223 × 122 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 33,8; 65,1; 96,4; 127,6; 158,9; 190,2; 221,5 |  AR2406975; OT/2024/AR2406975.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2404257, AR2406975 / 1 pedido(s): AR2501116. |
| lona; 223 × 132 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 33,8; 65,1; 96,4; 127,6; 158,9; 190,2; 221,5 |  AR2500050; OT/2025/AR2500050-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 4 pedido(s): AR2500050, AR2502864, AR2502938, AR2504932 / 1 pedido(s): AR2501116 / 1 pedido(s): AR2502639. |
| lona; 253 × 152 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 | 2,5; 33,6; 64,8; 95,9; 127; 158,1; 189,3; 220,4; 251,5 |  AR2500855; OT/2025/AR2500855.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 7 pedido(s): AR2500120, AR2500557, AR2500855, AR2502662, AR2504126, AR2504407, AR2505107 / 1 pedido(s): AR2403311. |
| lona; 353 × 202 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5 | 17,05; 46,15; 75,25; 104,35; 133,35; 162,45; 191,55; 220,65; 249,75; 278,85; 307,85; 336,95 |  AR2406500; OT/2024/AR2406500.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406500. |
| lona; 403 × 182 | 2,5; 38,1; 73,7; 109,3; 144,9; 180,5 | 2,5; 38,1; 73,7; 109,3; 144,9; 180,5 | 19,1; 52,4; 85,6; 118,9; 152,1; 185,4; 218,6; 251,9; 285,1; 318,4; 351,6; 384,9 |  AR2505290; OT/2025/AR2505290.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505290. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 158 × 122 | AR2400010, AR2400036 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400010-1.xlsb; OT/2024/AR2400010-2.xlsb; OT/2024/AR2400010-3.xlsb; OT/2024/AR2400010.dwg; OT/2024/AR2400036.dwg; OT/2024/AR2400036.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 253 × 153 | AR2400449 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400449-1.xlsb; OT/2024/AR2400449-2.xlsb; OT/2024/AR2400449.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 253 × 133 | AR2400649 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400649.dwg; OT/2024/AR2400649.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 253 × 132 | AR2404486, AR2502285 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404486.dwg; OT/2024/AR2404486.xlsb; OT/2025/AR2502285.dwg; OT/2025/AR2502285.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 186 × 131 | AR2406252 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2406252-10.xlsb; OT/2024/AR2406252-11.xlsb; OT/2024/AR2406252.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 353 × 172 | AR2406846 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2406846.dwg; OT/2024/AR2406846.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

**Duda para Iván:** ¿Qué dimensiones entrega ahora CANO: remolque o lona acabada, y qué aumentos concretos deben quedar en cada uno de los siete campos de baquetón? No se suman las dos notas de +0,5 sin aclararlo.

### REMOLQUES Y CARAVANAS MALLON, S. L. — 001795

Ficha: `remolques-y-caravanas-mallon-s-l`. Histórico: **57 líneas / 57 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600466). Nombres/alias del histórico: REMOLQUES Y CARAVANAS MALLON, S. L..

Plantillas encontradas: `PL/MALLON.dwg`

MALLON.dwg: radio de INBA R=12 desde el 10/12/2019; referencia AR2007020 hecha con la curva nueva. Prevalece sobre los antiguos radios de 11 cm con oreja y 8 cm con puentes del DOC.

Referencias rotuladas RL14 138×108×62, RL16 158×118×72, RL18 178×118×72, RL20 199×118×72 y RL23 229×139,5×72. Las cotas laterales se recogen como datos parciales, sin convertir ganchos, contorno o la cota de una pieza en una medida completa de remolque.

Reglas añadidas a la propuesta: `ventana` = {"lleva":false}.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 2 (BE2401106, BE2401282) |
| recogeDelante | NO: 1 (BE2401106); GOMA: 1 (BE2401282) |
| recogeAtras | PUENTES ESVA: 1 (BE2401106); GOMA: 1 (BE2401282) |
| bastillaEnfundar | NO: 2 (BE2401106, BE2401282) |
| ventana | NO: 2 (BE2401106, BE2401282) |
| rotulacion | SI: 2 (BE2401106, BE2401282) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (BE2401106); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (BE2401282) |
| modo | REPARTIDOS: 1 (BE2401106); SEGUN SE INDICA: 1 (BE2401282) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 256 × 150 | 50,3; 100,7 | 1; 37,8; 75,5; 113,3; 150 | 1; 51,4; 102,8; 154,2; 205,6; 256 |  BE2401106; OT/2024/BE2401106.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): BE2401106. |
| lona; 310 × 160 | 10,5; 40,5; 80,5; 120,5; 150,5 | 10,5; 40,5; 80,5; 120,5; 150,5 | 10; 54; 105; 157; 210; 260; 300 |  BE2401282; OT/2024/BE2401282.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): BE2401282. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 180 × 131 | BE2400166 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 231 × 140 | BE2400179 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 270 × 160 | BE2400248 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 200 × 121 | BE2400535 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 232 × 136 | BE2400632 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 200 × 119 | BE2400651 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 178 × 118 | BE2400657, BE2400662, BE2500203, BE2501174 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 178 × 118 | BE2400658 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 180 × 119 | BE2400681 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 230 × 160 | BE2400692 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 200 × 130 | BE2400808 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 257 × 150 | BE2400824 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 199 × 118 | BE2400855, BE2500433, BE2600335 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 201 × 120 | BE2400924, BE2500829 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 201 × 131 | BE2400931, BE2500295 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 230 × 140 | BE2401105, BE2501175, BE2600448, BE2600466 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/BE2401105.dwg; OT/2024/BE2401105.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 200 × 129 | BE2401121, BE2401125 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 231 × 141 | BE2401123, BE2500102, BE2500724 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 275 × 160 | BE2401143, BE2600431, BE2600432 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 270 × 160 | BE2401172 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 260 × 140 | BE2401239 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 310 × 159 | BE2500023 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 229 × 140 | BE2500028 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 400 × 170 | BE2500239 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 311 × 160 | BE2500370 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 201 × 121 | BE2500371 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 160 × 120 | BE2500434 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 215 × 145 | BE2500671 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 230 × 130 | BE2500964, BE2600282 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 175 × 110 | BE2501124 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 200 × 124 | BE2600127 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 178 × 120 | BE2600234 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 179 × 129 | BE2600310 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 158 × 118 | BE2600446, BE2600447 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

Cotas laterales parciales de la plantilla (origen rotulado ATRÁS, dimensión en cm, sin completar cabezas): RL14 138×108: 10; 33; 56; 84; 105; 134. RL16 158×118: 13; 31; 70; 90; 128; 148. RL18 178×118: 13; 37; 73; 107; 145; 174. RL20 199×118: 13; 41; 83; 118; 162; 195. RL23 229×139,5: 13; 30; 58; 78; 105; 125; 152; 172; 219. Son cotas que terminan en centros de círculos, contrastadas por script en MALLON.dwg; falta acreditar la clave de medida del remolque y las dos cabezas antes de cargarlas.

**Duda para Iván:** Falta confirmar si las referencias RL14/RL16/RL18/RL20/RL23 son medidas del remolque o de la lona y asociar cada una a las dos cabezas. Los pedidos BE y sus cortes están localizados en las fuentes; no se cargan repartos completos deducidos de una sola fila.

### REMOLQUES YAGÜE · LEON PEREZ, ADELINA — 038304

Ficha: `remolques-yague-leon-perez-adelina`. Histórico: **53 líneas / 41 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2604146). Nombres/alias del histórico: REMOLQUES YAGÜE · LEON PEREZ, ADELINA.

Plantillas encontradas: `PL/ADELINA LEÓN PÉREZ -REMOLQUES YAGUE.dwg`

ADELINA LEÓN PÉREZ -REMOLQUES YAGUE.dwg y REMOLQUILLEROS.doc: recoge con cremallera, normalmente gris, sin ventana, 7 cm de aguas habituales sin curva y no incluidos en altura; ollaos a repartir. Las excepciones de aguas y perfil se mantienen en sus pedidos.

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `ventana` = {"lleva":false}; `recogeAtras` = "CREMALLERA".

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 22 (AR2501596, AR2404614, AR2502922, AR2502149, AR2504043, AR2402644, AR2600690, AR2502782, AR2401918, AR2406576, AR2604146, AR2505156, AR2505858, AR2501979, AR2503121, AR2500329, AR2505982, AR2504096, AR2502299, AR2505302, AR2503241, AR2501597); TIPO 03: 3 (AR2403402, AR2403296, AR2403336); TIPO 01: 2 (AR2404537, AR2406249) |
| recogeDelante | NO: 24 (AR2501596, AR2404614, AR2502922, AR2502149, AR2402644, AR2600690, AR2401918, AR2404537, AR2604146, AR2505156, AR2505858, AR2501979, AR2403402, AR2503121, AR2500329, AR2505982, AR2406249, AR2504096, AR2502299, AR2505302, AR2503241, AR2403296, AR2403336, AR2501597); CREMALLERA: 3 (AR2502782, AR2405583, AR2406566); PUENTES ESVA: 2 (AR2504043, AR2406576) |
| recogeAtras | CREMALLERA: 27 (AR2501596, AR2404614, AR2502922, AR2502149, AR2402644, AR2600690, AR2502782, AR2405583, AR2401918, AR2404537, AR2604146, AR2505156, AR2505858, AR2501979, AR2406566, AR2403402, AR2503121, AR2500329, AR2505982, AR2406249, AR2504096, AR2502299, AR2505302, AR2503241, AR2403296, AR2403336, AR2501597); PUENTES ESVA: 2 (AR2504043, AR2406576) |
| bastillaEnfundar | NO: 24 (AR2501596, AR2404614, AR2502922, AR2502149, AR2504043, AR2600690, AR2405583, AR2604146, AR2505156, AR2505858, AR2501979, AR2406566, AR2403402, AR2503121, AR2500329, AR2505982, AR2406249, AR2504096, AR2502299, AR2505302, AR2503241, AR2403296, AR2403336, AR2501597); SÍ: 3 (AR2502782, AR2401918, AR2404537) |
| ventana | NO: 29 (AR2501596, AR2404614, AR2502922, AR2502149, AR2504043, AR2402644, AR2600690, AR2502782, AR2405583, AR2401918, AR2406576, AR2404537, AR2604146, AR2505156, AR2505858, AR2501979, AR2406566, AR2403402, AR2503121, AR2500329, AR2505982, AR2406249, AR2504096, AR2502299, AR2505302, AR2503241, AR2403296, AR2403336, AR2501597) |
| rotulacion | SI: 20 (AR2501596, AR2404614, AR2502922, AR2502149, AR2504043, AR2600690, AR2502782, AR2401918, AR2406576, AR2404537, AR2505156, AR2505858, AR2503121, AR2500329, AR2505982, AR2504096, AR2502299, AR2505302, AR2503241, AR2501597); SÍ: 7 (AR2402644, AR2405583, AR2406566, AR2403402, AR2406249, AR2403296, AR2403336); SI - REMOLQUES YAGÜE: 1 (AR2604146); NO: 1 (AR2501979) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 18 (AR2501596, AR2502149, AR2504043, AR2505992, AR2600690, AR2502782, AR2604146, AR2505156, AR2505858, AR2501979, AR2503121, AR2505982, AR2501246, AR2504096, AR2502299, AR2505302, AR2602577, AR2501597); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 13 (AR2404614, AR2402644, AR2405583, AR2401918, AR2406576, AR2400208, AR2404537, AR2406566, AR2403402, AR2500329, AR2406249, AR2401307, AR2403336); LONA MONZA 1 L 580 G/M2: GRIS RAL 7038: 250 AN: 2 (AR2600924, AR2503241); LONA NS86 2L 630GR [580]: ROJO (COR/400): 250 AN: 1 (AR2502922); LONA RECORD 1 L 580:GRIS 095 RAL 7038:220 AN: 1 (AR2403296) |
| modo | REPARTIDOS: 24 (AR2501596, AR2600924, AR2404614, AR2502922, AR2502149, AR2504043, AR2600690, AR2502782, AR2406576, AR2404537, AR2505156, AR2505858, AR2501979, AR2406566, AR2503121, AR2500329, AR2505982, AR2406249, AR2501246, AR2504096, AR2502299, AR2505302, AR2503241, AR2501597); SEGUN SE INDICA: 12 (AR2505992, AR2402644, AR2405583, AR2401918, AR2400208, AR2604146, AR2505858, AR2403402, AR2401307, AR2403296, AR2602577, AR2403336) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 161 × 121 | 1,5; 31,3; 61; 90,8; 120,5 | 1,5; 31,3; 61; 90,8; 120,5 | 1,5; 33,3; 65,1; 96,9; 128,7; 160,5 |  AR2400208; OT/2024/AR2400208.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400208. |
| baqueton; 180 × 129 | 2,5; 44,2; 85,8; 127,5 | 2,5; 44,2; 85,8; 127,5 | 2,5; 37,7; 72,9; 108,1; 143,3; 178,5 |  AR2600924; OT/2026/AR2600924.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600924. |
| baqueton; 181 × 121 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 37,9; 73,3; 108,7; 144,1; 179,5 |  AR2505156; OT/2025/AR2505156-10.xlsb / BAQUETÓN, filas 33/34/35, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2505156 / 1 pedido(s): AR2406249. |
| baqueton; 201 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 35,3; 68,2; 101; 133,8; 166,7; 199,5 |  AR2505992; OT/2025/AR2505992.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505992. |
| baqueton; 209 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 36,7; 70,8; 105; 139,2; 173,3; 207,5 |  AR2505858; OT/2025/AR2505858.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505858. |
| baqueton; 209 × 132 | 2,5; 34,4; 66,5; 98,5; 130,5 | 2,5; 34,4; 66,5; 98,5; 130,5 | 2,5; 36,7; 70,8; 105; 139,2; 173,3; 207,5 |  AR2401307; OT/2024/AR2401307.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401307. |
| baqueton; 252 × 131 | 2,5; 31,7; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5; 188,5; 219,5; 250,5 |  AR2501246; OT/2025/AR2501246.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501246. |
| baqueton; 307 × 240 | 2,5; 41,8; 81,2; 120,5; 159,8; 199,2; 238,5 | 2,5; 41,8; 81,2; 120,5; 159,8; 199,2; 238,5 | 2,5; 40,4; 78,3; 116,1; 154; 191,9; 229,8; 267,6; 305,5 |  AR2602577; OT/2026/AR2602577.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602577. |
| lona; 161 × 121 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 33,9; 65,3; 96,7; 128,1; 159,5 |  AR2502922; OT/2025/AR2502922.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502922. |
| lona; 181 × 121 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 37,9; 73,3; 108,7; 144,1; 179,5 |  AR2600690; OT/2026/AR2600690.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2501596, AR2505302, AR2600690 / 1 pedido(s): AR2402644. |
| lona; 182 × 122 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 32; 61,5; 91; 120,5 | 2,5; 38,1; 73,7; 109,3; 144,9; 180,5 |  AR2404614; OT/2024/AR2404614-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404614. |
| lona; 200 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 |  AR2604146; OT/2026/AR2604146.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604146. |
| lona; 201 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 35,3; 68,2; 101; 133,8; 166,7; 199,5 |  AR2505982; OT/2025/AR2505982.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505982. |
| lona; 208 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 36,5; 70,5; 104,5; 138,5; 172,5; 206,5 |  AR2404614; OT/2024/AR2404614-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404614. |
| lona; 209 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 36,7; 70,8; 105; 139,2; 173,3; 207,5 |  AR2504096; OT/2025/AR2504096.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 4 pedido(s): AR2502922, AR2503121, AR2504043, AR2504096 / 1 pedido(s): AR2505858. |
| lona; 209 × 132 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 36,7; 70,8; 105; 139,2; 173,3; 207,5 |  AR2501597; OT/2025/AR2501597.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2501597, AR2502149. |
| lona; 226 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,2; 65,9; 97,6; 129,3; 161,1; 192,8; 224,5 |  AR2500329; OT/2025/AR2500329.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2500329, AR2503241. |
| lona; 226 × 132 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,2; 65,9; 97,6; 129,4; 161,1; 192,8; 224,5 |  AR2501979; OT/2025/AR2501979.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501979. |
| lona; 226 × 140 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 34,2; 65,9; 97,6; 129,4; 161,1; 192,8; 224,5 |  AR2505156; OT/2025/AR2505156-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505156. |
| lona; 248 × 141 | 2,5; 36,8; 71; 105,3; 139,5 | 2,5; 36,8; 71; 105,3; 139,5 | 2,5; 29,6; 56,7; 83,8; 110,9; 138,1; 165,2; 192,3; 219,4; 246,5 |  AR2403336; OT/2024/AR2403336.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403336. |
| lona; 251 × 136 | 12,5; 40,5; 68,5; 96,5; 124,5 | 12,5; 40,5; 68,5; 96,5; 124,5 | 20; 53; 86,1; 119,1; 152,1; 185,2; 218,2; 242 |  AR2406576; OT/2024/AR2406576.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406576. |
| lona; 255 × 160 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 33,9; 65,3; 96,6; 128; 159,4; 190,8; 222,1; 253,5 |  AR2406566; OT/2024/AR2406566.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406566. |
| lona; 255 × 163 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 | 2,5; 33,9; 65,2; 96,6; 128; 159,4; 190,7; 222,1; 253,5 |  AR2405583; OT/2024/AR2405583-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405583. |
| lona; 257 × 168 | 2,5; 35,3; 68,1; 100,9; 133,7; 166,5 | 2,5; 35,3; 68,1; 100,9; 133,7; 166,5 | 2,5; 34,1; 65,7; 97,4; 129; 160,6; 192,2; 223,9; 255,5 |  AR2405583; OT/2024/AR2405583-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405583. |
| lona; 260 × 164 | 2,5; 34,8; 66,5; 98,5; 130,5; 162,5 | 2,5; 34,8; 66,5; 98,5; 130,5; 162,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5; 258,5 |  AR2502299; OT/2025/AR2502299.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502299. |
| lona; 301 × 161 | 2,5; 33,9; 62,3; 96,7; 128,1; 159,5 | 2,5; 33,9; 62,3; 96,7; 128,1; 159,5 | 2,5; 32,2; 61,9; 91,6; 121,3; 151; 180,7; 210,4; 240,1; 269,8; 299,5 |  AR2406249; OT/2024/AR2406249.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2406249 / 1 pedido(s): AR2404537. |
| lona; 305 × 171 | 2,5; 33,3; 59,7; 86; 112,3; 138,7; 169,5 | 2,5; 33,3; 59,7; 86; 112,3; 138,7; 169,5 | 2,5; 31,9; 58,8; 85,7; 112,6; 139,5; 166,5; 193,4; 220,3; 247,2; 274,1; 303,5 |  AR2401918; OT/2024/AR2401918.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401918. |
| lona; 307 × 182 | 2,5; 38,1; 73,7; 109,3; 144,9; 180,5 | 2,5; 38,1; 73,7; 109,3; 144,9; 180,5 | 2,5; 36,2; 69,8; 103,5; 137,2; 170,8; 204,5; 238,2; 271,8; 305,5 |  AR2502782; OT/2025/AR2502782.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502782. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 303 × 161 | AR2405583 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2405583-10.xlsb; OT/2024/AR2405583-11.xlsb; OT/2024/AR2405583.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 301 × 161 | AR2505156, AR2601490, AR2603339 | Modelo de ganado; fuera de FichaCliente. OT/2025/AR2505156-10.xlsb; OT/2025/AR2505156-11.xlsb; OT/2025/AR2505156.dwg; OT/2026/AR2601490.dwg; OT/2026/AR2601490.xlsb; OT/2026/AR2603339.dwg; OT/2026/AR2603339.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 226 × 136 | AR2601490 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601490.dwg; OT/2026/AR2601490.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 250 × 151 | AR2602796 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602796.dwg; OT/2026/AR2602796.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 229 × 136 | AR2603339 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603339.dwg; OT/2026/AR2603339.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### REMOLQUES CELIS · DE CELIS PEREZ, LUIS MIGUEL — 006835

Ficha: `remolques-celis-de-celis-perez-luis-miguel`. Histórico: **44 líneas / 31 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2603574). Nombres/alias del histórico: REMOLQUES CELIS · DE CELIS PEREZ, LUIS MIGUEL.

Plantillas encontradas: `PL/LUIS MIGUEL DE CELIS2_recover.dwg`; `PL/LUIS MIGUEL DE CELIS2.dwg`; `PL/REMOLQUES GANADO/LUIS MIGUEL DE CELIS.DWG`

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `recogeDelante` = "NO"; `recogeAtras` = "GOMA"; `ventana` = {"lleva":false}; `rotulacion` = false.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 13 (AR2500109, AR2404127, AR2602805, AR2502622, AR2506203, AR2501051, AR2504555, AR2402626, AR2501283, AR2500834, AR2501323, AR2406870, AR2503952); TIPO 01: 3 (AR2403594, AR2404963, AR2600737); TIPO 02: 3 (AR2506406, AR2400246, AR2504183) |
| recogeDelante | NO: 18 (AR2403525, AR2500109, AR2404127, AR2506406, AR2602805, AR2502622, AR2501051, AR2400246, AR2504555, AR2404963, AR2402626, AR2501283, AR2500834, AR2501323, AR2600737, AR2406870, AR2504183, AR2503952); GOMA: 2 (AR2403594, AR2506203) |
| recogeAtras | GOMA: 19 (AR2403525, AR2403594, AR2500109, AR2404127, AR2506406, AR2602805, AR2506203, AR2501051, AR2400246, AR2504555, AR2404963, AR2402626, AR2501283, AR2501323, AR2600737, AR2406870, AR2504183, AR2503952, AR2502622); CREMALLERA: 2 (AR2502622, AR2500834) |
| bastillaEnfundar | NO: 16 (AR2403594, AR2500109, AR2404127, AR2506406, AR2602805, AR2502622, AR2506203, AR2501051, AR2400246, AR2504555, AR2404963, AR2501283, AR2500834, AR2501323, AR2406870, AR2504183); SÍ: 3 (AR2403525, AR2600737, AR2503952) |
| ventana | NO: 20 (AR2403525, AR2403594, AR2500109, AR2404127, AR2506406, AR2602805, AR2502622, AR2506203, AR2501051, AR2400246, AR2504555, AR2404963, AR2402626, AR2501283, AR2500834, AR2501323, AR2600737, AR2406870, AR2504183, AR2503952) |
| rotulacion | NO: 19 (AR2403525, AR2403594, AR2500109, AR2404127, AR2506406, AR2602805, AR2502622, AR2506203, AR2501051, AR2400246, AR2504555, AR2404963, AR2402626, AR2501283, AR2501323, AR2600737, AR2406870, AR2504183, AR2503952) |
| material | LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 5 (AR2500109, AR2504555, AR2404963, AR2501323, AR2400246); LONA STARPLUS 1L 610:BURDEOS 179:250 AN: 4 (AR2403525, AR2500109, AR2501051, AR2404127); LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 4 (AR2600456, AR2400246, AR2402626, AR2500109); LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 4 (AR2506203, AR2600187, AR2600737, AR2600327); LONA ALPHA 1L 580  :NEGRO :250 AN: 2 (AR2500834, AR2504183); LONA ALPHA 1L 580 :ARENA  :250 AN: 1 (AR2403594); LONA G650 2L 650 :PLATA:250 AN : 1 (AR2404127); LONA ALPHA 1L 580 :MARRON - 204 MC :250 AN: 1 (AR2500109); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2506406); LONA NS86 2L 630GR  [580]: AZUL CLARO 5015 : 250 AN: 1 (AR2602805); LONA RECORD 1 L 580:GRIS 095 RAL 7038:220 AN: 1 (AR2502622); LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2500109); LONA G650 2L 650 :GRIS RAL7037 :250 AN (M5736): 1 (AR2501283); LONA ALPHA 1L 580 :VERDE RAL6024 :250 AN: 1 (AR2406870); LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2503952); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2502622); LONA MONZA 1 L 580 G/M2: GRIS RAL 7037: 250 AN: 1 (AR2600925) |
| modo | REPARTIDOS: 15 (AR2500109, AR2404127, AR2506406, AR2502622, AR2506203, AR2501051, AR2504555, AR2404963, AR2501283, AR2500834, AR2501323, AR2600737, AR2504183, AR2503952, AR2600925); SEGUN SE INDICA: 9 (AR2403525, AR2403594, AR2600456, AR2602805, AR2400246, AR2402626, AR2600187, AR2406870, AR2600327) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 202 × 132 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5 |  AR2600187; OT/2026/AR2600187.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600187. |
| baqueton; 203 × 133 | 2,5; 45,5; 88,5; 131,5 | 2,5; 45,5; 88,5; 131,5 | 2,5; 42,3; 82,1; 121,9; 161,7; 201,5 |  AR2600925; OT/2026/AR2600925.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600925. |
| baqueton; 210 × 136 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 36,8; 71,2; 105,5; 139,8; 174,2; 208,5 |  AR2600327; OT/2026/AR2600327.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600327. |
| baqueton; 242 × 142 | 5; 38,3; 71,5; 104,8; 138 | 5; 38,3; 71,5; 104,8; 138 | 7,5; 40,1; 72,6; 105,2; 137,8; 170,4; 202,9; 235,5 |  AR2600456; OT/2026/AR2600456.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600456. |
| lona; 121 × 102 | 2,5; 35,2; 67,8; 100,5 | 2,5; 35,2; 67,8; 100,5 | 2,5; 31,8; 61; 90,3; 119,5 |  AR2500834; OT/2025/AR2500834.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500834. |
| lona; 150 × 110 | 2,5; 37,8; 73,2; 108,5 | 2,5; 37,8; 73,2; 108,5 | 2,5; 29,7; 59,9; 90,1; 120,3; 150,5 |  AR2403594; OT/2024/AR2403594.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403594. |
| lona; 172 × 132 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 36,1; 69,7; 103,3; 136,9; 170,5 |  AR2600737; OT/2026/AR2600737.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600737. |
| lona; 202 × 132 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5 |  AR2400246; OT/2024/ar2400246.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400246. |
| lona; 202 × 135 | 2,5; 35; 68; 101; 133,5 | 2,5; 35; 68; 101; 133,5 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5 |  AR2406870; OT/2024/AR2406870.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406870. |
| lona; 202 × 136 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 35,5; 68,5; 101,5; 134,5; 167,5; 200,5 |  AR2500109; OT/2025/AR2500109-14.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500109. |
| lona; 221 × 127 | 2,5; 33; 64; 94,8; 125,5 | 2,5; 33; 64; 94,8; 125,5 | 2,5; 33,9; 64,9; 95,3; 126,7; 157,1; 188,1; 219,5 |  AR2502622; OT/2025/AR2502622-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502622. |
| lona; 222 × 136 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 33,6; 64,8; 95,9; 127,1; 158,2; 189,3; 220,5 |  AR2500109; OT/2025/AR2500109-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500109. |
| lona; 226 × 132 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,9; 66,4; 97,8; 129,2; 160,6; 192,1; 224,5 |  AR2502622; OT/2025/AR2502622-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502622. |
| lona; 231 × 175 | 2,5; 31; 59,5; 88; 116,5; 145; 173,5 | 2,5; 31; 59,5; 88; 116,5; 145; 173,5 | 2,5; 30,9; 59,3; 87,6; 116; 144,4; 172,8; 201,1; 229,5 |  AR2402626; OT/2024/AR2402626.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402626. |
| lona; 232 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 35,1; 67,6; 100,2; 132,8; 165,4; 197,9; 230,5 |  AR2602805; OT/2026/AR2602805.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602805. |
| lona; 232 × 146 | 2,5; 38; 73,5; 109; 144,5 | 2,5; 38; 73,5; 109; 144,5 | 2,5; 35,1; 67,6; 100,2; 132,8; 165,4; 197,9; 230,5 |  AR2501283; OT/2025/AR2501283.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501283. |
| lona; 242 × 136 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 36,5; 70,5; 104,5; 138,5; 172,5; 206,5; 240,5 |  AR2501323; OT/2025/AR2501323.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501323. |
| lona; 242 × 156 | 2,5; 33,2; 63,4; 93,6; 123,8; 154,5 | 2,5; 33,2; 63,4; 93,6; 123,8; 154,5 | 2,5; 37,2; 70,9; 104,6; 138,4; 172,1; 205,8; 240,5 |  AR2404127; OT/2024/AR2404127-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404127. |
| lona; 252 × 152 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 | 2,5; 37,9; 73,4; 108,8; 144,2; 179,6; 215,1; 250,5 |  AR2400246; OT/2024/ar2400246-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400246. |
| lona; 252 × 156 | 2,5; 32,9; 63,3; 93,7; 124,1; 154,5 | 2,5; 32,9; 63,3; 93,7; 124,1; 154,5 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5; 188,5; 219,5; 250,5 |  AR2501051; OT/2025/AR2501051.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2500109, AR2501051. |
| lona; 254 × 148 | 2,5; 38,5; 74,5; 110,5; 146,5 | 2,5; 38,5; 74,5; 110,5; 146,5 | 2,5; 38,2; 73,9; 109,6; 145,4; 181,1; 216,8; 252,5 |  AR2404963; OT/2024/AR2404963.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404963. |
| lona; 257 × 164 | 2,5; 34,2; 66,4; 98,6; 130,8; 162,5 | 2,5; 34,2; 66,4; 98,6; 130,8; 162,5 | 2,5; 36,4; 67,3; 98,1; 129; 159,9; 190,8; 221,6; 255,5 |  AR2404127; OT/2024/AR2404127-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404127. |
| lona; 261 × 146 | 10; 39,5; 73,5; 107,5; 137 | 10; 39,5; 73,5; 107,5; 137 | 2,5; 10; 43,5; 72,5; 101,5; 130,5; 159,5; 188,5; 217,5; 254 |  AR2504555; OT/2025/AR2504555.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504555. |
| lona; 261 × 156 | 2,5; 32,9; 63,3; 93,7; 124,1; 154,5 | 2,5; 32,9; 63,3; 93,7; 124,1; 154,5 | 2,5; 35,4; 67,3; 99,1; 131; 162,9; 194,8; 226,6; 259,5 |  AR2502622; OT/2025/AR2502622-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502622. |
| lona; 261 × 161 | 2,5; 33,9; 65,3; 96,7; 128,1; 159,5 | 2,5; 33,9; 65,3; 96,7; 128,1; 159,5 | 2,5; 34,6; 66,8; 98,9; 131; 163,1; 195,3; 227,4; 259,5 |  AR2504183; OT/2025/AR2504183.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504183. |
| lona; 262 × 146 | 2,5; 38; 73,5; 109; 144,5 | 2,5; 38; 73,5; 109; 144,5 | 2,5; 34,8; 67; 99,3; 131,5; 163,8; 196; 228,3; 260,5 |  AR2500109; OT/2025/AR2500109-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500109. |
| lona; 262 × 152 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 | 2,5; 34,8; 67; 99,3; 131,5; 163,8; 196; 228,3; 260,5 |  AR2506406; OT/2025/AR2506406.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506406. |
| lona; 262 × 162 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 | 2,5; 34,8; 67; 99,3; 131,5; 163,8; 196; 228,3; 260,5 |  AR2500109; OT/2025/AR2500109-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500109. |
| lona; 282 × 186 | 2,5; 32,8; 63,2; 93,5; 123,8; 154,2; 184,5 | 2,5; 32,8; 63,2; 93,5; 123,8; 154,2; 184,5 | 2,5; 37,3; 72; 106,8; 141,5; 176,3; 211; 245,8; 280,5 |  AR2506203; OT/2025/AR2506203.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506203. |
| lona; 306 × 170 | 2,5; 37,1; 69,4; 101,6; 133,8; 168,5 | 2,5; 37,1; 69,4; 101,6; 133,8; 168,5 | 2,5; 38,4; 71,3; 104,2; 137,1; 169,9; 202,8; 235,7; 268,6; 304,5 |  AR2403525; OT/2024/AR2403525.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403525. |
| lona; 307 × 156 | 2,5; 32,9; 63,3; 93,7; 124,1; 154,5 | 2,5; 32,9; 63,3; 93,7; 124,1; 154,5 | 2,5; 36,2; 70,1; 103,5; 137,2; 170,8; 204,5; 238,2; 271,8; 305,5 |  AR2503952; OT/2025/AR2503952.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503952. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 212 × 135 | AR2403700 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2403700.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 205 × 1366 | AR2502622 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2502622-1.xlsb; OT/2025/AR2502622-2.xlsb; OT/2025/AR2502622-3.xlsb; OT/2025/AR2502622-4.xlsb; OT/2025/AR2502622.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 321 × 152 | AR2504183 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2504183.dwg; OT/2025/AR2504183.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 200 × 153 | AR2505243 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2505243.dwg; OT/2025/AR2505243.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 181 × 136 | AR2602337 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602337.dwg; OT/2026/AR2602337.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 262,5 × 143,5 | AR2602645 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602645.dwg; OT/2026/AR2602645.xlsm; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 262 × 147 | AR2602645 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602645.dwg; OT/2026/AR2602645.xlsm; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 177 × 146 | AR2603340 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603340.dwg; OT/2026/AR2603340.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 262 × 1665 | AR2603340 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603340.dwg; OT/2026/AR2603340.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 311 × 206 | AR2603574 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603574.dwg; OT/2026/AR2603574.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 231 × 142 | AR2603574 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603574.dwg; OT/2026/AR2603574.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### CARMA · LOPEZ LEIRO, CARLOS — 000108

Ficha: `carma`. Histórico: **35 líneas / 30 pedidos**. PDF producidos adicionales examinados: 2. Registro vigente versión 3, conservado.

Código acreditado por histórico (AR2604112). Nombres/alias del histórico: CARMA · LOPEZ LEIRO, CARLOS.

Plantillas encontradas: `PL/(CARMA) CARLOS LOPEZ LEIRO.dwg`

Reglas añadidas a la propuesta: `bastillaEnfundar` = false; `ventana` = {"lleva":false}.

Campos vigentes que se respetan: `perfil` = {"tipoPerfil":"TIPO 05","radioEsquina":8.1}; `recogeAtras` = "GOMA"; `recogeDelante` = "NO"; `ollaosRepartidos` = true.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 18 (AR2601801, AR2505766, AR2602496, AR2604026, AR2402907, AR2401743, AR2501645, AR2600683, AR2500677, AR2505195, AR2401823, AR2402410, AR2600105, AR2504484, AR2400754, AR2406575, AR2401161, AR2602203); TIPO 03: 1 (AR2604070); TIPO 01: 1 (AR2401269) |
| recogeDelante | NO: 21 (AR2405175, AR2601801, AR2505766, AR2405480, AR2602496, AR2604026, AR2402907, AR2401743, AR2501645, AR2600683, AR2500677, AR2505195, AR2401823, AR2402410, AR2600105, AR2504484, AR2406575, AR2404768, AR2401161, AR2401269, AR2602203); GOMA: 2 (AR2402907, AR2604070); VELCRO: 1 (AR2400754) |
| recogeAtras | GOMA: 22 (AR2405175, AR2601801, AR2505766, AR2405480, AR2602496, AR2604026, AR2402907, AR2401743, AR2501645, AR2600683, AR2500677, AR2505195, AR2401823, AR2402410, AR2600105, AR2604070, AR2504484, AR2406575, AR2404768, AR2401161, AR2401269, AR2602203); VELCRO: 1 (AR2400754) |
| bastillaEnfundar | NO: 19 (AR2405175, AR2601801, AR2505766, AR2405480, AR2602496, AR2604026, AR2402907, AR2501645, AR2600683, AR2500677, AR2505195, AR2401823, AR2600105, AR2604070, AR2504484, AR2400754, AR2406575, AR2404768, AR2602203) |
| ventana | NO: 22 (AR2405175, AR2601801, AR2505766, AR2405480, AR2602496, AR2604026, AR2402907, AR2401743, AR2501645, AR2600683, AR2500677, AR2505195, AR2401823, AR2402410, AR2600105, AR2604070, AR2504484, AR2400754, AR2404768, AR2401161, AR2401269, AR2602203); SÍ: 1 (AR2406575) |
| rotulacion | SI: 16 (AR2405175, AR2601801, AR2505766, AR2405480, AR2602496, AR2401743, AR2501645, AR2600683, AR2500677, AR2505195, AR2401823, AR2402410, AR2600105, AR2400754, AR2404768, AR2602203); TALLERES CARLOS: 3 (AR2504484, AR2401161, AR2401269); SI - TALLERES CARLOS: 2 (AR2604026, AR2604070); SÍ: 2 (AR2402907, AR2406575) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 16 (AR2405175, AR2601801, AR2405480, AR2602496, AR2401743, AR2501645, AR2500677, AR2505195, AR2402907, AR2600105, AR2504484, AR2404280, AR2406575, AR2404768, AR2600124, AR2602203); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 6 (AR2402907, AR2401823, AR2402410, AR2405949, AR2401161, AR2401269); LONA NS86 2L 630GR  [580]: AZUL CLARO 5015 : 250 AN: 4 (AR2604112, AR2604026, AR2600683, AR2604070); LONA MONZA 1L 580GR ROJO RAL 3020 250 ANC: 1 (AR2505766); LONA STARPLUS 1L 610  :BLANCO RAL9010 :300 AN: 1 (AR2400754); LONA ALPHA 1L 580 :NARANJA RAL2004 :250 AN: 1 (AR2604084); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2600105); LONA ALPHA 1L 580: AZUL RAL5015: 220 AN: 1 (AR2400249) |
| modo | SEGUN SE INDICA: 15 (AR2601801, AR2604112, AR2604026, AR2402907, AR2401743, AR2401823, AR2402410, AR2604070, AR2406575, AR2604084, AR2404768, AR2600124, AR2400249, AR2401269, AR2602203); REPARTIDOS: 14 (AR2405175, AR2505766, AR2405480, AR2602496, AR2501645, AR2600683, AR2500677, AR2505195, AR2600105, AR2504484, AR2404280, AR2400754, AR2405949, AR2401161) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 206 × 130 | 2,5; 44,3; 86,7; 128,5 | 2,5; 44,3; 86,7; 128,5 | 2,5; 42,7; 82,9; 123,1; 163,3; 203,5 | Vigente v3; se conserva. AR2605188; OT/2026/AR2605188.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605188. |
| lona; 230 × 150 | 2,5; 44,2; 75,5; 106,7; 148,5 | 2,5; 44,2; 75,5; 106,7; 148,5 | 2,5; 34,8; 67,1; 99,4; 131,6; 163,9; 196,2; 228,5 | Vigente v3; se conserva. AR2404768; OT/2024/AR2404768.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404768. |
| baqueton; 152 × 115 | 2,5; 31,7; 58; 85,8; 113,5 | 2,5; 30,3; 58; 85,8; 113,5 | 2,5; 32,1; 61,7; 91,3; 120,9; 150,5 |  AR2405949; OT/2024/AR2405949.xlsb / BAQUETÓN, filas 33/34/35, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2405949 / 1 pedido(s): AR2400249. |
| baqueton; 153 × 116 | 2,5; 30,5; 58,5; 86,5; 114,5 | 2,5; 30,5; 58,5; 86,5; 114,5 | 2,5; 32,3; 62,1; 91,9; 121,7; 151,5 |  AR2604084; OT/2026/AR2604084.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604084. |
| baqueton; 155,5 × 115 | 2,5; 39,5; 76,5; 113,5 | 2,5; 39,5; 76,5; 113,5 | 2,5; 32,8; 63,1; 93,4; 123,7; 154 |  AR2600124; OT/2026/AR2600124.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600124. |
| baqueton; 204 × 131 | 2,5; 44,8; 87,2; 129,5 | 2,5; 44,8; 87,2; 129,5 | 2,5; 42,5; 82,5; 122,5; 162,5; 202,5 |  AR2404280; OT/2024/AR2404280-10.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404280. |
| baqueton; 207 × 129,5 | 2,5; 44,3; 86,2; 128 | 2,5; 44,3; 86,2; 128 | 2,5; 43,1; 83,7; 134,5; 164,9; 205,5 |  AR2604112; OT/2026/AR2604112.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604112. |
| baqueton; 266 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 31,6; 60,7; 89,8; 118,9; 148,1; 177,2; 206,3; 235,4; 264,5 |  AR2406575; OT/2024/AR2406575.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406575. |
| lona; 150 × 111 | 1,5; 37,5; 74,5; 110,5 | 1,5; 37,5; 74,5; 110,5 | 2,5; 38,8; 112,3; 148,5 |  AR2406575; OT/2024/AR2406575.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406575. |
| lona; 152 × 116 | 2,5; 19; 34; 58,5; 83; 98; 114,5 | 2,5; 39,8; 77,2; 114,5 | 2,5; 39,5; 76,5; 113,5; 150,5 |  AR2601801; OT/2026/AR2601801.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601801. |
| lona; 159,5 × 114 | 2,5; 39,2; 75,8; 112,5 | 2,5; 39,2; 75,8; 112,5 | 2,5; 33,6; 64,7; 95,8; 126,9; 158 |  AR2505766; OT/2025/AR2505766.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505766. |
| lona; 160 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 |  AR2500677; OT/2025/AR2500677.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2500677 / 1 pedido(s): AR2401269. |
| lona; 160 × 121 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 |  AR2600105; OT/2026/AR2600105-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600105. |
| lona; 160 × 125 | 2,5; 21; 36; 63; 90; 105; 123,5 | 2,5; 42,8; 83,2; 123,5 | 22; 61; 100; 139 |  AR2602203; OT/2026/AR2602203.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602203. |
| lona; 175 × 110 | 2,5; 37,8; 73,2; 108,5 | 2,5; 37,8; 73,2; 108,5 | 2,5; 36,9; 70,9; 105,1; 139,3; 173,5 |  AR2600105; OT/2026/AR2600105.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600105. |
| lona; 175 × 117 | 2,5; 40,2; 77,8; 115,5 | 2,5; 40,2; 77,8; 115,5 | 2,5; 36,9; 70,9; 105,1; 139,3; 173,5 |  AR2604070; OT/2026/AR2604070.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604070. |
| lona; 179,5 × 127,5 | 2,5; 33,4; 64,3; 95,1; 126 | 2,5; 33,4; 64,3; 95,1; 126 | 2,5; 37,6; 72,7; 107,8; 142,9; 178 |  AR2501645; OT/2025/AR2501645.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501645. |
| lona; 205 × 110,5 | 2,5; 20,5; 30,5; 55,8; 81; 91; 109 | 2,5; 24,5; 55,7; 87; 109 | 2,5; 36,7; 69,3; 103; 136,7; 170,3; 203,5 |  AR2402907; OT/2024/AR2402907-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402907. |
| lona; 205 × 125 | 2,5; 30; 40; 63; 86; 96; 123,5 | 2,5; 31,7; 63; 94,2; 123,5 | 2,5; 36,7; 69,3; 103; 136,7; 170,3; 203,5 |  AR2402410; OT/2024/AR2402410.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402410. |
| lona; 205 × 128 | 2,5; 43,8; 85,2; 126,5 | 2,5; 43,8; 85,2; 126,5 | 2,5; 42,7; 82,9; 123,1; 163,3; 203,5 |  AR2602496; OT/2026/AR2602496.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602496. |
| lona; 205 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 36; 69,5; 103; 136,5; 170; 203,5 |  AR2505195; OT/2025/AR2505195.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505195. |
| lona; 206 × 129,5 | 16,35; 48,95; 81,55; 114,15 | 16,35; 48,95; 81,55; 114,15 | 17,75; 52,05; 86,35; 120,65; 154,95; 189,25 |  AR2401161; OT/2024/AR2401161.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401161. |
| lona; 209 × 119,5 | 2,5; 31,4; 60,2; 89,1; 118 | 2,5; 31,4; 60,2; 89,1; 118 | 2,5; 32,8; 61,1; 90,4; 119,6; 148,9; 178,2; 207,5 |  AR2405480; OT/2024/AR2405480.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2405175, AR2405480. |
| lona; 210 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 31,9; 61,4; 90,8; 120,2; 149,6; 179,1; 208,5 |  AR2605000; OT/2026/AR2605000.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605000. |
| lona; 217,5 × 115,5 | 2,5; 39,7; 76,7; 114 | 2,5; 39,7; 76,7; 114 | 2,5; 38,1; 73,7; 109,3; 144,8; 180,4; 216 |  AR2401743; OT/2024/AR2401743.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401743. |
| lona; 219,5 × 128 | 2,5; 46; 83; 126,5 | 2,5; 46; 83; 126,5 | 2,5; 36,8; 73,5; 110,3; 147; 183,8; 218 |  AR2604026; OT/2026/AR2604026.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604026. |
| lona; 220 × 129,5 | 2,5; 41,8; 83,6; 128 | 2,5; 41,8; 83,6; 128 | 2,5; 38,5; 74,5; 110,5; 146,5; 182,5; 218,5 |  AR2401823; OT/2024/AR2401823.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401823. |
| lona; 249,5 × 149 | 2,5; 38,8; 75; 111,3; 147,5 | 2,5; 38,8; 75; 111,3; 147,5 | 2,5; 37,6; 72,6; 107,7; 142,8; 177,9; 212,9; 248 |  AR2504484; OT/2025/AR2504484.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504484. |
| lona; 250 × 151 | 2,5; 39,3; 76; 112,8; 149,5 | 2,5; 39,3; 76; 112,8; 149,5 | 2,5; 33,3; 64; 94,8; 125,5; 156,3; 187; 217,8; 248,5 |  AR2600683; OT/2026/AR2600683.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600683. |
| lona; 250 × 180 | 20,1; 55,3; 90,5; 125,7; 160,9 | 20,1; 55,3; 90,5; 125,7; 160,9 | 20,05; 55,25; 90,35; 125,55; 160,65; 195,85; 230,95 |  AR2400754; OT/2024/AR2400754.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400754. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 205,5 × 129,5 | AR2402907 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2402907-10.xlsb; OT/2024/AR2402907-11.xlsb; OT/2024/AR2402907.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 204 × 128 | AR2404280 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2404280-10.xlsb; OT/2024/AR2404280-11.xlsb; OT/2024/AR2404280.dwg; OT/2024/AR2404280-10.xlsb; OT/2024/AR2404280-11.xlsb; OT/2024/AR2404280.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 330 × 156 | AR2505484 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |

### CANO MUÑOZ S.L.U. — 030179

Ficha: `cano-munoz-s-l-u`. Histórico: **19 líneas / 12 pedidos**. PDF producidos adicionales examinados: 1. Registro vigente versión 2, conservado.

Código acreditado por histórico (AR2604501). Nombres/alias del histórico: CANO MUÑOZ S.L.U..

Plantillas encontradas: `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/CANO MUÑOZ.xls`; `PL/CANO MUÑOZ(METALCAR)/CANO BAQUETON.xls`; `PL/CANO MUÑOZ(METALCAR)/Copia de CANO BAQUETON.xls`; `PL/CANO MUÑOZ(METALCAR)/REMOLQUES CANO(METALURGIA Y CARROCERIAS).dwg`; `PL/CALCULOS REMOLQUES/CANO MUÑOZ.xls`

CANO MUÑOZ S.L.U. y CANO MUÑOZ, FRANCISCO tienen códigos diferentes (030179 y 045288). Se conserva cada identidad y la ficha vigente de la sociedad; no se fusionan sus códigos por el apellido.

Las notas de CANO sobre medidas acabadas, holgura aportada por el cliente y +0,5 cm de baquetón se documentan como revisión de demasías, sin sobrescribir parámetros vigentes.

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `rotulacion` = true.

Campos vigentes que se respetan: `perfil` = {"tipoPerfil":"TIPO 03","aguas":16,"radioCumbrera":11,"radioHombro":9.2}; `recogeDelante` = "NO"; `recogeAtras` = "CREMALLERA"; `bastillaEnfundar` = false; `ventana` = {"lleva":false}.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 4 (AR2602736, AR2603150, AR2600668, AR2601834) |
| recogeDelante | NO: 4 (AR2602736, AR2603150, AR2600668, AR2601834) |
| recogeAtras | CREMALLERA: 4 (AR2602736, AR2603150, AR2600668, AR2601834) |
| bastillaEnfundar | NO: 4 (AR2602736, AR2603150, AR2600668, AR2601834) |
| ventana | NO: 4 (AR2602736, AR2603150, AR2600668, AR2601834) |
| rotulacion | SI: 4 (AR2602736, AR2603150, AR2600668, AR2601834) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 4 (AR2603150, AR2600405, AR2603905, AR2600668); LONA NS86 2L 630GR  [580]: AZUL CLARO 5015 : 250 AN: 2 (AR2602736, AR2603662); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2601834) |
| modo | SEGUN SE INDICA: 6 (AR2602736, AR2603150, AR2600405, AR2603905, AR2603662, AR2601834); REPARTIDOS: 1 (AR2600668) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 186 × 121 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 32,8; 63,2; 93,5; 123,8; 154,2; 184,5 | Vigente v2; se conserva. AR2600405; OT/2026/AR2600405.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 3 pedido(s): AR2600405, AR2603905, AR2605192. |
| lona; 253 × 152 | 2,5; 39,5; 76,5; 113,5; 150,5 | 2,5; 39,5; 76,5; 113,5; 150,5 | 2,5; 33,6; 64,8; 95,9; 127; 158,1; 189,3; 220,4; 251,5 | Vigente v2; se conserva. AR2600668; OT/2026/AR2600668.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2600668, AR2601834 / 1 pedido(s): AR2605192. |
| baqueton; 156 × 121 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 32,9; 63,3; 93,7; 124,1; 154,5 |  AR2603905; OT/2026/AR2603905.xlsb / BAQUETÓN (4), filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603905. |
| baqueton; 221 × 121 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 31,8; 61; 90,3; 119,5 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5; 188,5; 219,5 |  AR2603905; OT/2026/AR2603905.xlsb / BAQUETÓN (2), filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603905. |
| baqueton; 221 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5; 188,5; 219,5 |  AR2603905; OT/2026/AR2603905.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603905. |
| baqueton; 252 × 151 | 2,75; 39,35; 76,05; 112,65; 149,25 | 2,75; 39,35; 76,05; 112,65; 149,25 | 2,75; 33,65; 64,65; 95,55; 126,55; 157,45; 188,35; 219,35; 250,25 |  AR2603662; OT/2026/AR2603662.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603662. |
| lona; 223 × 132 | 2,5; 34,1; 66,3; 98,4; 130,5 | 2,5; 34,1; 66,3; 98,4; 130,5 | 2,5; 33,8; 65,1; 96,4; 127,6; 158,9; 190,5; 221,5 |  AR2603150; OT/2026/AR2603150-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2603150 / 1 pedido(s): AR2602736. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 222 × 132 | AR2600445 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2600445.dwg; OT/2026/AR2600445.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 187 × 121 | AR2601487 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601487-10.xlsb; OT/2026/AR2601487-11.xlsb; OT/2026/AR2601487.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 222 × 131 | AR2601487 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601487-10.xlsb; OT/2026/AR2601487-11.xlsb; OT/2026/AR2601487.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 22 × 121 | AR2601834 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601834.dwg; OT/2026/AR2601834.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 221 × 151 | AR2603765 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603765.dwg; OT/2026/AR2603765.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 223 × 152 | AR2603765 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603765.dwg; OT/2026/AR2603765.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

**Duda para Iván:** Confirmar las demasías del baquetón con la nota de CANO: la ficha de esta sociedad se conserva sin reemplazarla por las reglas inferidas de la cuenta personal 045288.

### CARBAJO CARBAJO, ELISEO — 052321

Ficha: `carbajo-carbajo-eliseo`. Histórico: **19 líneas / 12 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2602232). Nombres/alias del histórico: CARBAJO CARBAJO, ELISEO.

Plantillas encontradas: `PL/TALLERES CARBAJO.dwg`

Reglas añadidas a la propuesta: `perfil` = {"tipoPerfil":"TIPO 02"}; `recogeAtras` = "CREMALLERA"; `ventana` = {"lleva":false}; `rotulacion` = false; `material` = "LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN".

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 9 (AR2502729, AR2600667, AR2504812, AR2600066, AR2600931, AR2503552, AR2502010, AR2600596, AR2501173); TIPO 04: 1 (AR2602232) |
| recogeDelante | NO: 8 (AR2602232, AR2502729, AR2600667, AR2504812, AR2600931, AR2600596, AR2501173, AR2503552); CREMALLERA: 7 (AR2502729, AR2600066, AR2503552, AR2502010, AR2600596, AR2502212, AR2505566) |
| recogeAtras | CREMALLERA: 11 (AR2602232, AR2502729, AR2600667, AR2600066, AR2600931, AR2503552, AR2502010, AR2600596, AR2501173, AR2502212, AR2505566); GOMA: 1 (AR2504812) |
| bastillaEnfundar | NO: 10 (AR2502729, AR2600667, AR2504812, AR2600066, AR2600931, AR2502010, AR2600596, AR2501173, AR2502212, AR2503552); SÍ: 4 (AR2600066, AR2503552, AR2600596, AR2505566) |
| ventana | NO: 12 (AR2602232, AR2502729, AR2600667, AR2504812, AR2600066, AR2600931, AR2503552, AR2502010, AR2600596, AR2501173, AR2502212, AR2505566) |
| rotulacion | NO: 12 (AR2602232, AR2502729, AR2600667, AR2504812, AR2600066, AR2600931, AR2503552, AR2502010, AR2600596, AR2501173, AR2502212, AR2505566) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 11 (AR2602232, AR2502729, AR2600667, AR2504812, AR2600066, AR2503552, AR2502010, AR2600596, AR2501173, AR2502212, AR2505566); LONA MONZA 1 L 580 G/M2: GRIS RAL 7038: 250 AN: 1 (AR2600931) |
| modo | SEGUN SE INDICA: 12 (AR2602232, AR2502729, AR2600667, AR2504812, AR2600066, AR2600931, AR2503552, AR2502010, AR2600596, AR2501173, AR2502212, AR2505566) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 161 × 121 | 2,5; 17,5; 46,5; 75,5; 104,5; 119,5 | 2,5; 17,5; 46,5; 75,5; 104,5; 119,5 | 2,5; 16; 42; 68; 94; 120; 146; 159,5 |  AR2501173; OT/2025/AR2501173.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2501173 / 1 pedido(s): AR2504812. |
| lona; 181 × 131 | 18; 50; 82; 114 | 18; 50; 82; 114 | 16; 46; 76; 106; 136; 166 |  AR2600596; OT/2026/AR2600596.xlsb / LONA REMOLQUE 0225172, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600596. |
| lona; 201 × 131 | 17; 49; 83; 115 | 17; 49; 83; 115 | 20; 53,4; 84,8; 117,2; 149,6; 182 |  AR2600667; OT/2026/AR2600667.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2600667 / 1 pedido(s): AR2504812 / 1 pedido(s): AR2503552 / 1 pedido(s): AR2502729. |
| lona; 201 × 141 | 17; 44; 71; 98; 125 | 17; 44; 71; 98; 125 | 13,5; 48,5; 83,5; 118,5; 153,5; 188,5 |  AR2600931; OT/2026/AR2600931.xlsm / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600931. |
| lona; 236 × 150 | 10; 53; 98; 141 | 10; 53; 98; 141 | 15; 50; 95; 142; 187; 222 |  AR2502010; OT/2025/AR2502010.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502010. |
| lona; 251 × 141 | 17; 44; 71; 98; 125 | 17; 44; 71; 98; 125 | 13,5; 45,5; 77,5; 109,5; 141; 173,5; 205,5; 237,5 |  AR2600066; OT/2026/AR2600066-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2600066 / 1 pedido(s): AR2502729. |
| lona; 251 × 171 | 15,5; 43,7; 71,9; 100,1; 128,3; 156,5 | 15,5; 43,7; 71,9; 100,1; 128,3; 156,5 | 17; 48,1; 79,3; 110; 141,6; 172,7; 203,9; 235 |  AR2602232; OT/2026/AR2602232.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2602232 / 1 pedido(s): AR2502212. |
| lona; 251 × 178 | 19; 47; 75; 104; 132; 160 | 19; 47; 75; 104; 132; 160 | 17; 48; 79; 110; 142; 173; 204; 235 |  AR2502729; OT/2025/AR2502729-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502729. |
| lona; 302 × 151 | 16; 46; 76; 106; 136 | 16; 46; 76; 106; 136 | 11,5; 46,5; 81,5; 116,5; 151,5; 186,5; 221,5; 256,5; 291,5 |  AR2600066; OT/2026/AR2600066.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600066. |
| lona; 303 × 167 | 6,5; 37,5; 68,5; 99,5; 130,5; 161,5 | 6,5; 37,5; 68,5; 99,5; 130,5; 161,5 | 17; 47; 77; 107; 137; 167; 197; 227; 257; 287 |  AR2503552; OT/2025/AR2503552-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503552. |
| lona; 318 × 182 | 4; 31; 61; 91,5; 122; 152; 179 | 4; 31; 61; 91,5; 122; 152; 179 | 8; 38; 68; 98; 128; 159,5; 191; 221; 281; 311 |  AR2505566; OT/2025/AR2505566.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505566. |
| lona; 401 × 166 | 14; 48,8; 83,5; 118,3; 153 | 14; 48,8; 83,5; 118,3; 153 | 16,5; 53,4; 90,3; 127,2; 164,1; 201; 237,9; 274,8; 311,7; 348,6; 385,5 |  AR2600596; OT/2026/AR2600596.xlsb / LONA REMOLQUE 0225173, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600596. |

### CARROCERIAS VALLEJO, S.A. — 032353

Ficha: `carrocerias-vallejo-s-a`. Histórico: **18 líneas / 14 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2604282). Nombres/alias del histórico: CARROCERIAS VALLEJO, S.A..

Plantillas encontradas: `PL/CARROCERIAS VALLEJO.dwg`

REMOLQUILLEROS.doc describe GOMA, VELCRO o CREMALLERA a consultar, perfiles variados y ollaos a repartir. La estadística del histórico se muestra para revisar lo habitual; no convierte las distintas recogidas en una única obligación.

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `perfil` = {"tipoPerfil":"TIPO 03"}; `bastillaEnfundar` = false; `ventana` = {"lleva":false}; `rotulacion` = false.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 7 (AR2505607, AR2403537, AR2402566, AR2503579, AR2401427, AR2406530, AR2402738) |
| recogeDelante | NO: 6 (AR2505607, AR2403537, AR2402566, AR2503579, AR2401427, AR2402738); no: 1 (AR2406530) |
| recogeAtras | VELCRO: 6 (AR2505607, AR2403537, AR2402566, AR2503579, AR2401427, AR2402738); velcro: 1 (AR2406530); PUENTES ESVA: 1 (AR2406530) |
| bastillaEnfundar | NO: 6 (AR2505607, AR2403537, AR2402566, AR2503579, AR2406530, AR2402738) |
| ventana | NO: 7 (AR2505607, AR2403537, AR2402566, AR2503579, AR2401427, AR2406530, AR2402738) |
| rotulacion | NO: 7 (AR2505607, AR2403537, AR2402566, AR2503579, AR2401427, AR2406530, AR2402738) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 5 (AR2601576, AR2505416, AR2403537, AR2406530, AR2402738); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 4 (AR2505607, AR2503579, AR2604282, AR2504955); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 3 (AR2501243, AR2402566, AR2401427) |
| modo | SEGUN SE INDICA: 11 (AR2505607, AR2501243, AR2505416, AR2403537, AR2402566, AR2503579, AR2604282, AR2401427, AR2504955, AR2406530, AR2402738) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 160 × 120 | 10; 43,7; 77,3; 111 | 10; 43,7; 77,3; 111 | 12; 46,3; 80,5; 114,8; 149 |  AR2604282; OT/2026/AR2604282.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604282. |
| baqueton; 164 × 125 | 2,5; 43,8; 82,2; 123,5 | 2,5; 43,8; 82,2; 123,5 | 2,5; 58,5; 106,5; 162,5 |  AR2504955; OT/2025/AR2504955.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504955. |
| baqueton; 250 × 150 | 10; 47,8; 103,3; 141 | 10; 47,8; 103,3; 141 | 9,5; 46,3; 98,8; 151,3; 203,8; 239 |  AR2505416; OT/2025/AR2505416.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505416. |
| lona; 200 × 130 | 10; 42,7; 88,2; 121 | 10; 42,7; 88,2; 121 | 10; 43,5; 103,5; 160; 190 |  AR2406530; OT/2024/AR2406530-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406530. |
| lona; 200 × 135 | 2,5; 42; 94; 133,5 | 2,5; 42; 94; 133,5 | 2,5; 36; 92,5; 155; 198,5 |  AR2505607; OT/2025/AR2505607.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505607. |
| lona; 220 × 135 | 2,5; 42,3; 93,7; 133,5 | 2,5; 42,3; 93,7; 133,5 | 2,5; 36,3; 103,5; 175; 218,5 |  AR2503579; OT/2025/AR2503579.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2402566, AR2503579. |
| lona; 220 × 145 | 2,5; 44,8; 101,2; 143,5 | 2,5; 44,8; 101,2; 143,5 | 2,5; 36,3; 103,5; 175; 218,5 |  AR2406530; OT/2024/AR2406530-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2406530 / 1 pedido(s): AR2403537. |
| lona; 260 × 165 | 2,5; 52,5; 113,5; 163,5 | 2,5; 52,5; 113,5; 163,5 | 2,5; 53,2; 103,4; 153,6; 203,8; 258,5 |  AR2402738; OT/2024/AR2402738.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402738. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 224 × 135 | AR2501243 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501243.dwg; OT/2025/AR2501243.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 250 × 150 | AR2601077 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601077-10.xlsb; OT/2026/AR2601077-11.xlsb; OT/2026/AR2601077-12.xlsb; OT/2026/AR2601077-13.xlsb; OT/2026/AR2601077.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 180 × 120 | AR2601077 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601077-10.xlsb; OT/2026/AR2601077-11.xlsb; OT/2026/AR2601077-12.xlsb; OT/2026/AR2601077-13.xlsb; OT/2026/AR2601077.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 225 × 130 | AR2601077 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601077-10.xlsb; OT/2026/AR2601077-11.xlsb; OT/2026/AR2601077-12.xlsb; OT/2026/AR2601077-13.xlsb; OT/2026/AR2601077.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### HNOS. SANCHEZ-LAFUENTE S.A. — 042412

Ficha: `hnos-sanchez-lafuente-s-a`. Histórico: **18 líneas / 10 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2602967). Nombres/alias del histórico: HNOS. SANCHEZ-LAFUENTE S.A..

Plantillas encontradas: `PL/HNOS. SANCHES-LAFUENTE/HNOS.SANCHEZ-LAFUENTE.dwg`

HNOS. SANCHES-LAFUENTE/HNOS.SANCHEZ-LAFUENTE.dwg: «VAN SIEMPRE DE RECOGER CON VELCRO», «LOS OLLAOS REPARTIDOS», identificar cada lona con su referencia.

Cambio desde 12/03/2026, aprobado para todos el 10/06/2026: 2,5 cm más de ancho por lado en la trasera (5 cm total) por los cierres. Se lleva a observaciones; no se confunde con un remolque físicamente 5 cm más ancho detrás.

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `perfil` = {"tipoPerfil":"TIPO 02"}; `bastillaEnfundar` = false; `ventana` = {"lleva":false}; `rotulacion` = false; `recogeAtras` = "VELCRO"; `observaciones` = ["IDENTIFICAR CADA LONA CON SU REFERENCIA","TRASERA: 5 CM MÁS DE ANCHO POR LOS CIERRES (2,5 CM POR LADO)"].

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 5 (AR2502675, AR2602714, AR2600093, AR2500429, AR2404011) |
| recogeDelante | NO: 4 (AR2502675, AR2602714, AR2600093, AR2500429); CREMALLERA: 1 (AR2404011) |
| recogeAtras | GOMA: 2 (AR2502675, AR2600093); VELCRO: 2 (AR2602714, AR2500429); CREMALLERA: 1 (AR2404011) |
| bastillaEnfundar | NO: 5 (AR2502675, AR2602714, AR2600093, AR2500429, AR2404011) |
| ventana | NO: 5 (AR2502675, AR2602714, AR2600093, AR2500429, AR2404011) |
| rotulacion | NO: 5 (AR2502675, AR2602714, AR2600093, AR2500429, AR2404011) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 4 (AR2505947, AR2502675, AR2600093, AR2505996); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 2 (AR2500429, AR2404011); LONA MONZA 1 L 580 G/M2: GRIS RAL 7038: 250 AN: 1 (AR2601052); LONA ALPHA 1L 580  :NEGRO :250 AN: 1 (AR2602714) |
| modo | SEGUN SE INDICA: 7 (AR2601052, AR2505947, AR2502675, AR2602714, AR2600093, AR2404011, AR2505996); REPARTIDOS: 1 (AR2500429) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 120 × 102 | 2,5; 35,2; 67,8; 100,5 | 2,5; 35,2; 67,8; 100,5 | 2,5; 31,5; 60,5; 89,5; 118,5 |  AR2500429; OT/2025/AR2500429-12.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500429. |
| baqueton; 160 × 102 | 2,5; 35,2; 67,8; 100,5 | 2,5; 35,2; 67,8; 100,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 |  AR2505996; OT/2025/AR2505996.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505996. |
| baqueton; 160 × 107 | 37,7; 70,3 | 37,7; 70,3 | 33,7; 64,9; 96,1; 127,3 |  AR2601052; OT/2026/AR2601052.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601052. |
| baqueton; 185 × 110 | 2,5; 31,7; 73,2; 108,5 | 2,5; 37,8; 73,2; 108,5 | 2,5; 32,7; 62,8; 93; 123,2; 153,3; 183,5 |  AR2500429; OT/2025/AR2500429-11.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500429. |
| baqueton; 185 × 115 | 2,5; 39,4; 76,5; 113,5 | 2,5; 39,4; 76,5; 113,5 | 2,5; 32,7; 62,8; 93; 123,2; 153,3; 183,5 |  AR2505947; OT/2025/AR2505947.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505947. |
| baqueton; 205 × 136 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 36; 69,5; 103; 136,5; 170; 203,5 |  AR2600093; OT/2026/AR2600093.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2600093 / 1 pedido(s): AR2500429. |
| lona; 160 × 102 | 2,5; 35,2; 67,8; 100,5 | 2,5; 35,2; 67,8; 100,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 |  AR2500429; OT/2025/AR2500429-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500429. |
| lona; 205 × 136 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 36; 69,5; 103; 136,5; 170; 203,5 |  AR2600093; OT/2026/AR2600093.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2502675, AR2600093. |
| lona; 211 × 136 | 2,5; 29; 55,5; 81,5; 108; 134,5 | 2,5; 29; 55,5; 81,5; 108; 134,5 | 2,5; 28,5; 54,5; 80; 106; 132; 158; 183,5; 209,5 |  AR2404011; OT/2024/AR2404011.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404011. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 160 × 108 | AR2602714 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602714.dwg; OT/2026/AR2602714.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ANTIGUO COBELO · VAZQUEZ BARREIRO, JAVIER — 042623

Ficha: `antiguo-cobelo-vazquez-barreiro-javier`. Histórico: **17 líneas / 14 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (SA2600310). Nombres/alias del histórico: ANTIGUO COBELO · VAZQUEZ BARREIRO, JAVIER.

Plantillas encontradas: `PL/CALCULOS EXCEL2/REMOLQUES ORIGINALES EN CM/COBELO.xls`; `PL/COBELO (RVG)-2.DWG`

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `ventana` = {"lleva":true}; `recogeDelante` = "NO"; `recogeAtras` = "GOMA"; `bastillaEnfundar` = false.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 2 (AR2504171, AR2400848) |
| recogeDelante | NO: 3 (AR2504171, AR2404578, AR2400848) |
| recogeAtras | GOMA: 3 (AR2504171, AR2404578, AR2400848) |
| bastillaEnfundar | NO: 3 (AR2504171, AR2404578, AR2400848) |
| ventana | SÍ: 3 (AR2504171, AR2404578, AR2400848) |
| rotulacion | NO: 1 (AR2504171); SÍ: 1 (AR2404578); SI: 1 (AR2504171); RGONZALEZ: 1 (AR2400848); REYFER: 1 (AR2400848) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 2 (AR2404578, AR2400848); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2504171); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2504171) |
| modo | SEGUN SE INDICA: 3 (AR2504171, AR2404578, AR2400848) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 200 × 130 | 7; 39,3; 65,5; 91,7; 124 | 7; 39,3; 65,5; 91,7; 124 | 2,5; 10; 36,1; 68,3; 100,5; 132,7; 164,9; 194 |  AR2404578; OT/2024/AR2404578.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2404578 / 1 pedido(s): AR2400848. |
| lona; 230 × 130 | 7; 39,3; 65,5; 91,7; 124 | 7; 39,3; 65,5; 91,7; 124 | 2,5; 10; 43,3; 72,2; 101,1; 129,9; 158,8; 187,7; 224 |  AR2504171; OT/2025/AR2504171-12.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504171. |
| lona; 250 × 159 | 7; 48; 80; 112; 144 | 7; 48; 80; 112; 144 | 2,5; 10; 35,1; 65,2; 95,4; 125,5; 155,6; 185,8; 215,9; 244 |  AR2504171; OT/2025/AR2504171-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504171. |
| lona; 260 × 140 | 7; 36,5; 70,5; 104,5; 134 | 7; 36,5; 70,5; 104,5; 134 | 2,5; 10; 43,5; 72,5; 101,5; 130,5; 159,5; 188,5; 217,5; 254 |  AR2504171; OT/2025/AR2504171.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504171. |
| lona; 270 × 150 | 7; 45,5; 75,5; 105,5; 144 | 5; 38; 88; 113,5; 146 | 2,5; 10; 41; 68; 95; 122; 149; 176; 203; 230; 264 |  AR2400848; OT/2024/AR2400848-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400848. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 250 × 140 | SA2400675, SA2500879, SA2500880, SA2500901, SA2500902 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 215 × 130 | SA2500878 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 230 × 153 | SA2500900 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 260 × 165 | SA2600274 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 270 × 175 | SA2600275 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 270 × 150 | SA2600298 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 160 × 110 | SA2600310 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### TALLERES CARBAJO C.B. — 020015

Ficha: `talleres-carbajo-c-b`. Histórico: **14 líneas / 9 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2501069). Nombres/alias del histórico: TALLERES CARBAJO C.B..

Plantillas encontradas: `PL/TALLERES CARBAJO.dwg`

Reglas añadidas a la propuesta: `perfil` = {"tipoPerfil":"TIPO 02"}; `bastillaEnfundar` = false; `ventana` = {"lleva":false}; `rotulacion` = false.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 7 (AR2400496, AR2501069, AR2404797, AR2404498, AR2401300, AR2402604, AR2400097) |
| recogeDelante | NO: 8 (AR2400496, AR2501069, AR2404797, AR2405908, AR2401300, AR2402604, AR2400097, AR2405968); CREMALLERA: 1 (AR2404498) |
| recogeAtras | CREMALLERA: 7 (AR2400496, AR2404797, AR2405908, AR2404498, AR2401300, AR2402604, AR2405968); GOMA: 2 (AR2501069, AR2400097) |
| bastillaEnfundar | NO: 8 (AR2400496, AR2501069, AR2404797, AR2405908, AR2404498, AR2402604, AR2400097, AR2405968) |
| ventana | NO: 9 (AR2400496, AR2501069, AR2404797, AR2405908, AR2404498, AR2401300, AR2402604, AR2400097, AR2405968) |
| rotulacion | NO: 8 (AR2501069, AR2404797, AR2405908, AR2404498, AR2401300, AR2402604, AR2400097, AR2405968) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 7 (AR2400496, AR2404797, AR2405908, AR2404498, AR2401300, AR2400097, AR2405968); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2501069); LONA RECORD 1 L 580:GRIS 095 RAL 7038:220 AN: 1 (AR2402604) |
| modo | SEGUN SE INDICA: 9 (AR2400496, AR2501069, AR2404797, AR2405908, AR2404498, AR2401300, AR2402604, AR2400097, AR2405968) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 181 × 131 | 18; 50; 82; 114 | 18; 50; 82; 114 | 15,95; 45,95; 75,95; 105,95; 135,95; 166,05 |  AR2401300; OT/2024/AR2401300.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401300. |
| baqueton; 201 × 131 | 18; 50; 82; 114 | 18; 50; 82; 114 | 33,5; 60,5; 87,5; 114,5; 141,5; 168,5 |  AR2404797; OT/2024/AR2404797.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404797 / 1 pedido(s): AR2404797. |
| lona; 141 × 111 | 2,5; 15,5; 42,5; 69,5; 96,5; 109,5 | 2,5; 15,5; 42,5; 69,5; 96,5; 109,5 | 2,5; 16; 43,5; 71; 98,5; 126; 139,5 |  AR2501069; OT/2025/AR2501069.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2501069 / 1 pedido(s): AR2401300. |
| lona; 161 × 121 | 17; 46; 75; 105 | 17; 46; 75; 105 | 16; 42; 68; 94; 120; 146 |  AR2405908; OT/2024/AR2405908.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405908. |
| lona; 181 × 131 | 17; 49,7; 82,3; 115 | 17; 49,7; 82,3; 115 | 16; 46; 76; 106; 136; 166 |  AR2404797; OT/2024/AR2404797-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2404797 / 1 pedido(s): AR2404498 / 1 pedido(s): AR2400496. |
| lona; 201 × 131 | 17; 49,7; 82,3; 115 | 17; 49,7; 82,3; 115 | 20; 52; 84,5; 117; 149,5; 182 |  AR2402604; OT/2024/AR2402604-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2402604 / 1 pedido(s): AR2400097. |
| lona; 251 × 131 | 17; 49; 83; 115 | 17; 49; 83; 115 | 13,5; 46,5; 78,5; 110,5; 142,5; 174,5; 206,5; 238,5 |  AR2405968; OT/2024/AR2405968.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405968. |
| lona; 251 × 141 | 17; 44; 98; 125 | 17; 44; 98; 125 | 14; 46; 78; 110; 142; 174; 206; 238 |  AR2404797; OT/2024/AR2404797-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2404797 / 1 pedido(s): AR2400496. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 232 × 155 | AR2402604 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2402604-1.xlsb; OT/2024/AR2402604-2.xlsb; OT/2024/AR2402604.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### REMOLQUES CAREDU · INDUVEC, S.L. — 000530

Ficha: `remolques-caredu-induvec-s-l`. Histórico: **13 líneas / 12 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600858). Nombres/alias del histórico: REMOLQUES CAREDU · INDUVEC, S.L..

Plantillas encontradas: `PL/CAREDU(INDUVEC).dwg`

CAREDU(INDUVEC).dwg: si no pide ventana no la lleva; si no indica color, gris 7038. Los DOC los incluyen en repartidos. No se convierte el gris habitual en una bobina concreta si no está acreditada.

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `recogeDelante` = "NO"; `recogeAtras` = "GOMA"; `bastillaEnfundar` = false.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 9 (AR2405831, AR2401285, AR2400702, AR2401084, AR2503831, AR2402914, AR2402675, AR2403147, AR2600858); TIPO 02: 1 (AR2504249); TIPO 03: 1 (AR2403623) |
| recogeDelante | NO: 10 (AR2405831, AR2401285, AR2400702, AR2401084, AR2503831, AR2402914, AR2403623, AR2402675, AR2403147, AR2600858); PUENTES ESVA: 1 (AR2504249) |
| recogeAtras | GOMA: 10 (AR2405831, AR2401285, AR2400702, AR2401084, AR2503831, AR2402914, AR2403623, AR2402675, AR2403147, AR2600858); PUENTES ESVA: 1 (AR2504249) |
| bastillaEnfundar | NO: 9 (AR2405831, AR2504249, AR2400702, AR2401084, AR2503831, AR2402914, AR2403623, AR2403147, AR2600858) |
| ventana | NO: 9 (AR2401285, AR2504249, AR2400702, AR2401084, AR2402914, AR2403623, AR2402675, AR2403147, AR2600858); SÍ: 2 (AR2405831, AR2503831) |
| rotulacion | SI: 6 (AR2401285, AR2504249, AR2400702, AR2503831, AR2403623, AR2600858); SÍ: 4 (AR2405831, AR2402914, AR2402675, AR2403147); TALLERES CAL: 1 (AR2401084) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 8 (AR2405831, AR2401285, AR2400702, AR2401084, AR2402914, AR2403623, AR2402675, AR2403147); LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2504249); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2503831); LONA MONZA 1 L 580 G/M2: GRIS RAL 7038: 250 AN: 1 (AR2600858) |
| modo | SEGUN SE INDICA: 8 (AR2401285, AR2504249, AR2401084, AR2402914, AR2403623, AR2402675, AR2403147, AR2600858); REPARTIDOS: 3 (AR2405831, AR2400702, AR2503831) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 135 × 105 | 2,5; 36,2; 69,8; 103,5 | 2,5; 36,2; 69,8; 103,5 | 2,5; 35,3; 68; 100,8; 133,5 |  AR2402914; OT/2024/AR2402914.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402914. |
| lona; 163 × 112 | 2,5; 38,5; 74,5; 110,5 | 2,5; 38,5; 74,5; 110,5 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 |  AR2503831; OT/2025/AR2503831.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503831. |
| lona; 166,5 × 121 | 11,5; 43,5; 78,5; 110,5 | 11,5; 43,5; 78,5; 110,5 | 10; 35; 70; 100; 130; 159 |  AR2504249; OT/2025/AR2504249.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504249. |
| lona; 175 × 110 | 2,5; 37,8; 73,2; 108,5 | 2,5; 37,8; 73,2; 108,5 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 |  AR2405831; OT/2024/AR2405831.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405831. |
| lona; 175 × 115 | 2,5; 39,5; 76,5; 113,5 | 2,5; 39,5; 76,5; 113,5 | 2,5; 36,5; 71; 105; 139,5; 173,5 |  AR2403623; OT/2024/AR2403623.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2403623 / 1 pedido(s): AR2402675. |
| lona; 220 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 38,5; 74,5; 110,5; 146,5; 182,5; 218,5 |  AR2600858; OT/2026/AR2600858.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600858. |
| lona; 225 × 128 | 2,5; 33,5; 64,5; 95,5; 126,5 | 2,5; 33,5; 64,5; 95,5; 126,5 | 2,5; 39,9; 76,2; 113; 149,8; 186,7; 223,5 |  AR2401285; OT/2024/AR2401285.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401285. |
| lona; 225 × 135 | 2,5; 36,5; 68; 99; 133,5 | 2,5; 36,5; 68; 99; 133,5 | 2,5; 35,9; 66,7; 97,6; 128,4; 159,3; 190,1; 223,5 |  AR2403147; OT/2024/AR2403147.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403147. |
| lona; 287 × 176 | 2,5; 45,5; 88,5; 131,5; 174,5 | 2,5; 45,5; 88,5; 131,5; 174,5 | 22,7; 63,2; 103,6; 144; 184,4; 224,9; 265,3 |  AR2401084; OT/2024/AR2401084-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401084. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 169 × 118 | AR2503848 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503848.dwg; OT/2025/AR2503848.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### TALLERES GONZALO · FERRODEZA, S. L. — 016533

Ficha: `talleres-gonzalo-ferrodeza-s-l`. Histórico: **13 líneas / 11 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2602760). Nombres/alias del histórico: TALLERES GONZALO · FERRODEZA, S. L..

Plantillas encontradas: `PL/REMOLQUES GANADO/FERRODEZA/FERRODEZA CABALOS-GANADO REF 1500 BAIXO (SIN PUERTA).dwg`; `PL/REMOLQUES GANADO/FERRODEZA/FERRODEZA_GANADERO_1250_KG.dwg`; `PL/FERRODEZA (GONZALOMERZA)2.DWG`; `PL/REMOLQUES GANADO/FERRODEZA/FERRODEZA REF.1050 REDONDO.dwg`; `PL/FERRODEZA (GONZALOMERZA).dwg`

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `recogeAtras` = "GOMA".

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 7 (AR2400377, AR2602760, AR2503892, AR2601617, AR2503801, AR2502739, AR2401525); TIPO 04: 2 (AR2403286, AR2504106) |
| recogeDelante | NO: 7 (AR2400377, AR2602760, AR2503892, AR2601617, AR2503801, AR2502739, AR2401525); GOMA: 2 (AR2403286, AR2504106) |
| recogeAtras | GOMA: 9 (AR2403286, AR2400377, AR2602760, AR2503892, AR2504106, AR2601617, AR2503801, AR2502739, AR2401525) |
| bastillaEnfundar | NO: 6 (AR2403286, AR2400377, AR2504106, AR2601617, AR2503801, AR2502739); SÍ: 1 (AR2503892) |
| ventana | NO: 5 (AR2403286, AR2503892, AR2504106, AR2502739, AR2401525); SÍ: 4 (AR2400377, AR2602760, AR2601617, AR2503801) |
| rotulacion | SI: 6 (AR2602760, AR2503892, AR2601617, AR2503801, AR2502739, AR2401525); SÍ: 2 (AR2403286, AR2400377); NO: 1 (AR2504106) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 4 (AR2503892, AR2601617, AR2503801, AR2502739); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 2 (AR2403286, AR2400377); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 2 (AR2504106, AR2401525); LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2602760); LONA G650 2L 650 :GRIS RAL7038 :250 AN (M5739): 1 (AR2502739) |
| modo | SEGUN SE INDICA: 6 (AR2403286, AR2400377, AR2602760, AR2601617, AR2502739, AR2401525); REPARTIDOS: 4 (AR2503892, AR2504106, AR2503801, AR2502739) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 259 × 159,5 | 2,5; 33,6; 64,7; 95,8; 126,9; 158 | 2,5; 33,6; 64,7; 95,8; 126,9; 158 | 2,5; 34,4; 66,3; 98,1; 130; 161,9; 193,8; 225,6; 257,5 |  AR2502739; OT/2025/AR2502739.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502739. |
| lona; 219,5 × 139 | 2,5; 36,3; 70; 103,8; 137,5 | 2,5; 36,3; 70; 103,8; 137,5 | 2,5; 33,3; 64,1; 94,9; 125,6; 156,4; 187,2; 218 |  AR2503801; OT/2025/AR2503801.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503801. |
| lona; 249,5 × 169,5 | 2,5; 35,5; 68,7; 101,9; 135,1; 168 | 2,5; 35,5; 68,7; 101,9; 135,1; 168 | 2,5; 41; 74,7; 108,4; 142,1; 175,8; 209,5; 248 |  AR2403286; OT/2024/AR2403286.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403286. |
| lona; 250 × 143 | 2,5; 48,8; 95,2; 141,5 | 2,5; 48,8; 95,2; 141,5 | 2,5; 10; 50; 100; 150; 200; 241; 248,5 |  AR2602760; OT/2026/AR2602760.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2601617, AR2602760. |
| lona; 260 × 160 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 226,5; 258,5 |  AR2504106; OT/2025/AR2504106.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504106. |
| lona; 265,5 × 139,5 | 2,5; 36,5; 70,8; 104,5; 137,5 | 2,5; 36,5; 70,8; 104,5; 137,5 | 2,5; 41,3; 73,1; 104,9; 136,8; 200,4; 232,2; 264 |  AR2401525; OT/2024/AR2401525.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401525. |
| lona; 320 × 178,5 | 2,5; 37,4; 72,3; 107,2; 142,1; 177 | 2,5; 37,4; 72,3; 107,2; 142,1; 177 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5; 192,1; 223,7; 255,3; 286,9; 318,5 |  AR2503892; OT/2025/AR2503892.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503892. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 274 × 149,5 | AR2400377 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400377.dwg; OT/2024/AR2400377.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 360 × 188,5 | AR2400377 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400377.dwg; OT/2024/AR2400377.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 259 × 159,5 | AR2502739 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2502739.dwg; OT/2025/AR2502739.xlsb; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 275 × 165,5 | AR2504146 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2504146.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 259,5 × 158,5 | AR2602603 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2602603.dwg; OT/2026/AR2602603.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### J. CARBALLO, S. C. — 000494

Ficha: `j-carballo-s-c`. Histórico: **11 líneas / 10 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2506256). Nombres/alias del histórico: J. CARBALLO, S. C..

Plantillas encontradas: `PL/J.CARBALLO.dwg`

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 3 (AR2400134, AR2500308, AR2502665); TIPO 03: 2 (AR2506256, AR2406953); TIPO 01: 2 (AR2503850, AR2400481); TIPO 05: 2 (AR2403990, AR2405249) |
| recogeDelante | VELCRO: 4 (AR2506256, AR2400134, AR2500308, AR2403990); NO: 3 (AR2406953, AR2405249, AR2400481); GOMA: 2 (AR2503850, AR2502665) |
| recogeAtras | VELCRO: 6 (AR2506256, AR2400134, AR2500308, AR2406953, AR2403990, AR2405249); GOMA: 3 (AR2503850, AR2502665, AR2400481) |
| bastillaEnfundar | NO: 8 (AR2506256, AR2400134, AR2500308, AR2406953, AR2503850, AR2502665, AR2405249, AR2400481); SÍ: 1 (AR2403990) |
| ventana | NO: 8 (AR2506256, AR2500308, AR2406953, AR2503850, AR2502665, AR2403990, AR2405249, AR2400481); SÍ: 1 (AR2400134) |
| rotulacion | NO: 5 (AR2506256, AR2400134, AR2503850, AR2502665, AR2403990); SI: 1 (AR2500308) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 4 (AR2506256, AR2406953, AR2503850, AR2502665); LONA ALPHA 1L 580: AZUL RAL5015: 220 AN: 2 (AR2400134, AR2400481); LONA STARPLUS 1L 610  :BLANCO RAL9010 :250 AN: 2 (AR2500308, AR2405249); LONA LAC 640 2L 640GR :BLANCO RAL9010 :250 AN: 1 (AR2403990) |
| modo | REPARTIDOS: 6 (AR2506256, AR2500308, AR2406953, AR2503850, AR2502665, AR2405249); SEGUN SE INDICA: 3 (AR2400134, AR2403990, AR2400481) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 211 × 125 | 2,5; 32,8; 63; 93,3; 123,5 | 2,5; 32,8; 63; 93,3; 123,5 | 2,5; 37; 71,5; 106; 140,5; 175,1; 209,5 |  AR2400481; OT/2024/ar2400481.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400481. |
| lona; 213 × 127,5 | 2,5; 33,4; 64,3; 95,1; 126 | 2,5; 33,4; 64,3; 95,1; 126 | 2,5; 37,3; 72,2; 107; 141,8; 176,7; 211,5 |  AR2502665; OT/2025/AR2502665.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502665. |
| lona; 228 × 133 | 2,5; 34,8; 67; 99,3; 131,5 | 2,5; 34,8; 67; 99,3; 131,5 | 2,5; 34,5; 66,5; 98,5; 130,5; 162,5; 194,5; 226,5 |  AR2500308; OT/2025/AR2500308.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500308. |
| lona; 233,5 × 140 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 35,3; 68,1; 100,9; 133,6; 166,4; 199,2; 232 |  AR2506256; OT/2025/AR2506256.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506256. |
| lona; 261,5 × 141 | 2,5; 36,8; 71; 105,3; 139,5 | 2,5; 36,8; 71; 105,3; 139,5 | 2,5; 34,7; 66,9; 99,1; 131,3; 163,4; 195,6; 227,8; 260 |  AR2503850; OT/2025/AR2503850.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503850. |
| lona; 261 × 141 | 2,5; 36,8; 71; 105,3; 139,5 | 2,5; 36,8; 71; 105,3; 139,5 | 2,5; 34,6; 66,8; 98,9; 131; 163,1; 195,3; 227,4; 259,5 |  AR2406953; OT/2024/AR2406953.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406953. |
| lona; 267,5 × 169,5 | 2,5; 35,5; 68,5; 102; 135; 168 | 2,5; 35,5; 68,5; 102; 135; 168 | 2,5; 35,5; 68,5; 101,5; 134,5; 167; 200; 233; 266 |  AR2400134; OT/2024/AR2400134.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400134. |
| lona; 363 × 209 | 2,5; 36,5; 71; 105; 139; 173,5; 207,5 | 2,5; 36,5; 71; 105; 139; 173,5; 207,5 | 2,5; 38,5; 74,5; 110; 146; 182; 218; 254; 289,5; 325,5; 361,5 |  AR2403990; OT/2024/AR2403990.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403990. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 261 × 132 | AR2405249 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405249.dwg; OT/2024/AR2405249.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 161 × 121 | AR2405289 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405289.dwg; OT/2024/AR2405289.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### REMOLQUES TARRAGONA S.L — 052388

Ficha: `remolques-tarragona-s-l`. Histórico: **10 líneas / 6 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601328). Nombres/alias del histórico: REMOLQUES TARRAGONA S.L.

Plantillas encontradas: `PL/REMOLQUES TARRAGONA.dwg`

Reglas añadidas a la propuesta: `recogeDelante` = "NO"; `ventana` = {"lleva":false}; `rotulacion` = false.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 2 (AR2601328, AR2600694); TIPO 01: 2 (AR2501494, AR2505552) |
| recogeDelante | NO: 4 (AR2601328, AR2501494, AR2505552, AR2600694) |
| recogeAtras | CREMALLERA: 2 (AR2601328, AR2505552); GOMA: 2 (AR2501494, AR2600694) |
| bastillaEnfundar | SÍ: 3 (AR2601328, AR2501494, AR2505552); NO: 2 (AR2501494, AR2600694) |
| ventana | NO: 4 (AR2601328, AR2501494, AR2505552, AR2600694) |
| rotulacion | NO: 4 (AR2601328, AR2501494, AR2505552, AR2600694) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 4 (AR2601328, AR2505552, AR2600694, AR2502089); LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2501494); LONA STARPLUS 1L 610  :ROJO RAL3002 :250 AN: 1 (AR2501494); LONA G650 2L 650 :GRIS RAL7038 :250 AN (M5739): 1 (AR2501494); LONA MONZA 1 L 580 G/M2: GRIS RAL 7038: 250 AN: 1 (AR2600856) |
| modo | REPARTIDOS: 3 (AR2601328, AR2501494, AR2505552); SEGUN SE INDICA: 3 (AR2600694, AR2502089, AR2600856) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 153 × 120 | 2,5; 41; 80; 118,5 | 2,5; 41; 80; 118,5 | 2,5; 32,5; 62; 92; 121,5; 151,5 |  AR2605071; OT/2026/AR2605071.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605071. |
| baqueton; 200 × 132 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 34,5; 66,5; 98,5; 130,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 |  AR2600694; OT/2026/AR2600694-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600694. |
| baqueton; 203 × 133 | 2,5; 34,8; 67; 99,3; 131,5 | 2,5; 34,8; 67; 99,3; 131,5 | 2,5; 35,7; 68,8; 102; 135,2; 168,3; 201,5 |  AR2502089; OT/2025/AR2502089.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502089. |
| baqueton; 222 × 152 | 2,5; 51,8; 101,2; 150,5 | 2,5; 51,8; 101,2; 150,5 | 2,5; 46,1; 90; 133,3; 176,9; 220,5 |  AR2600856; OT/2026/AR2600856.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600856. |
| lona; 238 × 145 | 2,5; 37,8; 73; 108,3; 143,5 | 2,5; 37,8; 73; 108,3; 143,5 | 10; 55; 100; 145; 190; 229 |  AR2600694; OT/2026/AR2600694.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600694. |
| lona; 250 × 165 | 5,2; 36,4; 67,6; 98,8; 120; 161,2 | 5,2; 36,4; 67,6; 98,8; 120; 161,2 | 2,5; 10; 38,9; 67,8; 96,6; 125,5; 154,5; 183,3; 212,1; 241; 248,5 |  AR2501494; OT/2025/AR2501494-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501494. |
| lona; 300 × 150 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 35,4; 68,3; 101,2; 134,1; 166,9; 199,8; 232,7; 265,6; 298,5 |  AR2505552; OT/2025/AR2505552.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505552. |
| lona; 302 × 152 | 2,5; 39,5; 76,5; 113,5; 150,5 | 2,5; 39,5; 76,5; 113,5; 150,5 | 2,5; 39,8; 77; 114,3; 151,5; 188,8; 226; 263,3; 300,5 |  AR2601328; OT/2026/AR2601328.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601328. |
| lona; 450 × 130 | 5; 35,3; 65,5; 95,8; 126 | 5; 35,3; 65,5; 95,8; 126 | 2,5; 10; 40,8; 71,6; 102,4; 133,1; 163,9; 194,7; 225,5; 256,3; 287,1; 317,9 |  AR2501494; OT/2025/AR2501494-10.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501494. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 300 × 150 | AR2501494 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501494-10.xlsb; OT/2025/AR2501494-11.xlsb; OT/2025/AR2501494-12.xlsb; OT/2025/AR2501494-13.xlsb; OT/2025/AR2501494.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Baquetón; 200 × 140 | AR2501494 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501494-10.xlsb; OT/2025/AR2501494-11.xlsb; OT/2025/AR2501494-12.xlsb; OT/2025/AR2501494-13.xlsb; OT/2025/AR2501494.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### CERRAJERIA MALDONADO / CAMACHO · CARROCERIAS Y REMOLQUES CAMACHO 1990 SL — 031580

Ficha: `camacho`. Histórico: **9 líneas / 8 pedidos**. PDF producidos adicionales examinados: 1. Registro vigente versión 2, conservado.

Código acreditado por GET RPS pedido (AR2601661). Nombres/alias del histórico: CERRAJERIA MALDONADO / CAMACHO · CARROCERIAS Y REMOLQUES CAMACHO 1990 SL.

Plantillas encontradas: `PL/REMOLQUE MACHADO-CAMACHO (ANTIGUO MALDONADO).dwg`; `PL/CERRAJERIA MALDONADO.DWG`

CERRAJERIA MALDONADO.DWG: normalmente azules, normalmente 10 cm de aguas (la propia plantilla pregunta si están incluidos), recogen con cremallera y ollaos repartidos.

Sus hojas del histórico registran GOMA detrás. Se conserva el reparto de la ficha vigente y se deja la recogida sin fijar, pendiente de aclarar la contradicción entre la plantilla y las hojas.

Reglas añadidas a la propuesta: `bastillaEnfundar` = false.

Campos vigentes que se respetan: `ollaosRepartidos` = true.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 6 (AR2400971, AR2505086, AR2501350, AR2502234, AR2404719, AR2601661); TIPO 01: 1 (AR2600337) |
| recogeDelante | NO: 6 (AR2400971, AR2505086, AR2501350, AR2502234, AR2404719, AR2601661); GOMA: 1 (AR2600337) |
| recogeAtras | GOMA: 7 (AR2400971, AR2505086, AR2501350, AR2502234, AR2600337, AR2404719, AR2601661) |
| bastillaEnfundar | NO: 7 (AR2400971, AR2505086, AR2501350, AR2502234, AR2600337, AR2404719, AR2601661) |
| ventana | NO: 6 (AR2505086, AR2501350, AR2502234, AR2600337, AR2404719, AR2601661); SÍ: 1 (AR2400971) |
| rotulacion | SI: 5 (AR2505086, AR2501350, AR2502234, AR2600337, AR2601661); SÍ: 1 (AR2400971); CERRAJERIA MALDONADO: 1 (AR2404719) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 3 (AR2406943, AR2400971, AR2404719); LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 2 (AR2505086, AR2601661); LONA NS86 2L 630GR [580]: BLANCO : 250 AN: 2 (AR2501350, AR2502234); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2501350); LONA STARPLUS 1L 610 : VERDE RAL 6026 : 250 AN ( 580 ): 1 (AR2600337) |
| modo | REPARTIDOS: 7 (AR2406943, AR2400971, AR2505086, AR2501350, AR2502234, AR2600337, AR2404719); SEGUN SE INDICA: 1 (AR2601661) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 208 × 138 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 36,5; 70,5; 104,5; 138,5; 172,5; 206,5 |  AR2501350; OT/2025/AR2501350.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501350. |
| baqueton; 226 × 138 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 34,2; 65,9; 97,6; 129,3; 161,1; 192,8; 224,5 |  AR2406943; OT/2024/AR2406943.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406943. |
| lona; 144 × 113 | 2,5; 29,8; 57; 84,3; 111,5 | 2,5; 29,8; 57; 84,3; 111,5 | 2,5; 37,5; 72,5; 107,5; 142,5 |  AR2601661; OT/2026/AR2601661.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601661. |
| lona; 184 × 138 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 38,5; 74,5; 110,5; 146,5; 182,5 |  AR2605297; OT/2026/AR2605297.pdf; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2605297 / 1 pedido(s): AR2400971. |
| lona; 204 × 138 | 5; 37,3; 69,5; 101,8; 134 | 5; 37,3; 69,5; 101,8; 134 | 5; 37,5; 70; 102,5; 135; 167,5; 200 |  AR2404719; OT/2024/AR2404719.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404719. |
| lona; 206 × 117 | 2,5; 40,2; 77,8; 115,5 | 2,5; 40,2; 77,8; 115,5 | 2,5; 36,2; 69,8; 103,5; 137,2; 170,8; 204,5 |  AR2600337; OT/2026/AR2600337.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600337. |
| lona; 225 × 158 | 2,5; 33,3; 64,1; 94,9; 125,7; 156,5 | 2,5; 33,3; 64,1; 94,9; 125,7; 156,5 | 2,5; 34,07; 65,6; 97,2; 128,8; 160,4; 191,9; 223,5 |  AR2502234; OT/2025/AR2502234.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502234. |
| lona; 232 × 138 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 35,1; 67,6; 100,2; 132,8; 165,4; 197,9; 230,5 |  AR2501350; OT/2025/AR2501350.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501350. |
| lona; 255 × 138 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 36; 69,5; 103; 136,5 | 2,5; 33,9; 65,3; 96,6; 128; 159,4; 190,8; 222,1; 253,5 |  AR2505086; OT/2025/AR2505086.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505086. |

**Duda para Iván:** ¿La recogida habitual actual de CAMACHO es cremallera, como dice la plantilla, o GOMA, como sus hojas del histórico? También falta aclarar si los 10 cm de aguas están incluidos en la altura.

### INDUSTRIAS EDUARDO ROMAY, S. L. — 003491

Ficha: `industrias-eduardo-romay-s-l`. Histórico: **9 líneas / 7 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2603807). Nombres/alias del histórico: INDUSTRIAS EDUARDO ROMAY, S. L..

Plantillas encontradas: `PL/ROMAY2.DWG`

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `perfil` = {"tipoPerfil":"TIPO 05"}; `recogeAtras` = "PUENTES ESVA"; `bastillaEnfundar` = false; `ventana` = {"lleva":false}.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 4 (AR2500461, AR2400119, AR2400339, AR2603807) |
| recogeDelante | PUENTES ESVA: 5 (AR2400119, AR2400339, AR2403666, AR2405273, AR2603807); NO: 1 (AR2500461) |
| recogeAtras | PUENTES ESVA: 6 (AR2500461, AR2400119, AR2400339, AR2403666, AR2405273, AR2603807) |
| bastillaEnfundar | NO: 6 (AR2500461, AR2400119, AR2400339, AR2403666, AR2405273, AR2603807) |
| ventana | NO: 6 (AR2500461, AR2400119, AR2400339, AR2403666, AR2405273, AR2603807) |
| rotulacion | NO: 4 (AR2500461, AR2403666, AR2405273, AR2603807); SI: 1 (AR2400119); SÍ : 1 (AR2400339) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 4 (AR2400119, AR2400339, AR2403666, AR2405273); LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2500461); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2603807) |
| modo | SEGUN SE INDICA: 4 (AR2400339, AR2403666, AR2603807, AR2400119); REPARTIDOS: 3 (AR2500461, AR2400119, AR2405273) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 140,5 × 103 | 9,95; 51,95; 94,05 | 9,95; 51,95; 94,05 | 7,5; 39,1; 70,8; 102,4; 134 |  AR2500461; OT/2025/AR2500461.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500461. |
| lona; 200 × 127 | 10; 46; 82; 118 | 10; 46; 82; 118 | 10; 46; 82; 118; 154; 190,5 |  AR2400119; OT/2024/AR2400119-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400119. |
| lona; 205 × 115 | 10; 42; 74; 106 | 10; 42; 74; 106 | 10; 41,3; 72,8; 104,3; 135,5; 164; 195,3 |  AR2403666; OT/2024/AR2403666.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403666. |
| lona; 210 × 130 | 10; 47; 84; 121 | 10; 47; 84; 121 | 10; 41,7; 73,4; 105; 137; 168,5; 200 |  AR2400339; OT/2024/ar2400339.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400339. |
| lona; 230 × 130 | 10; 47; 84; 121 | 10; 47; 84; 121 | 10; 45; 80; 115; 150; 185; 220,5 |  AR2400119; OT/2024/AR2400119-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400119. |
| lona; 250 × 135 | 10; 48,5; 87,5; 126 | 10; 48,5; 87,5; 126 | 10; 42; 74; 106; 138; 169,8; 201,7; 240,3 |  AR2405273; OT/2024/AR2405273.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405273. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 210 × 104,5 | AR2500663 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2500663.dwg; OT/2025/AR2500663.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 230 × 167 | AR2603807 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2603807.dwg; OT/2026/AR2603807.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### AUTO RECAMBIOS AJALVIR S.L. — 036805

Ficha: `auto-recambios-ajalvir-s-l`. Histórico: **8 líneas / 7 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505976). Nombres/alias del histórico: AUTO RECAMBIOS AJALVIR S.L..

Plantillas encontradas: `PL/AJALVIR/AJALVIR.dwg`

Reglas añadidas a la propuesta: `ollaosRepartidos` = true.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2501207); TIPO 01: 1 (AR2406750) |
| recogeDelante | NO: 2 (AR2501207, AR2406750) |
| recogeAtras | GOMA: 2 (AR2501207, AR2406750) |
| bastillaEnfundar | NO: 2 (AR2501207, AR2406750) |
| ventana | NO: 2 (AR2501207, AR2406750) |
| rotulacion | NO: 2 (AR2501207, AR2406750) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 6 (AR2501115, AR2501207, AR2503493, AR2505976, AR2502308, AR2505046); LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2406750) |
| modo | REPARTIDOS: 4 (AR2501115, AR2501207, AR2406750, AR2502308); SEGUN SE INDICA: 3 (AR2503493, AR2505976, AR2505046) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 200 × 130 | 2,5; 34; 65,5; 97; 128,5 | 14,5; 48,5; 82,5; 116,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 |  AR2505976; OT/2025/AR2505976.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 5 pedido(s): AR2501115, AR2502308, AR2503493, AR2505046, AR2505976. |
| lona; 200 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 |  AR2501207; OT/2025/AR2501207.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501207. |
| lona; 265 × 166 | 2,5; 34,9; 67,3; 99,7; 132,1; 164,5 | 2,5; 34,9; 67,3; 99,7; 132,1; 164,5 | 2,5; 35,1; 67,8; 100,4; 133; 165,6; 198,3; 230,9; 263,5 |  AR2406750; OT/2024/AR2406750.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406750. |

### IBERICA DE REMOLQUES S.A. — 053595

Ficha: `iberica-de-remolques-s-a`. Histórico: **8 líneas / 8 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2603495). Nombres/alias del histórico: IBERICA DE REMOLQUES S.A..

Plantillas encontradas: `PL/IBERICA DE REMOLQUES.dwg`

Reglas añadidas a la propuesta: `recogeDelante` = "NO"; `recogeAtras` = "VELCRO"; `bastillaEnfundar` = false; `ventana` = {"lleva":false}; `rotulacion` = false; `material` = "LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN".

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 5 (AR2600664, AR2603022, AR2601198, AR2603495, AR2602006); TIPO 05: 1 (AR2602277) |
| recogeDelante | NO: 6 (AR2600664, AR2603022, AR2602277, AR2601198, AR2603495, AR2602006) |
| recogeAtras | VELCRO: 6 (AR2600664, AR2603022, AR2602277, AR2601198, AR2603495, AR2602006) |
| bastillaEnfundar | NO: 6 (AR2600664, AR2603022, AR2602277, AR2601198, AR2603495, AR2602006) |
| ventana | NO: 6 (AR2600664, AR2603022, AR2602277, AR2601198, AR2603495, AR2602006) |
| rotulacion | NO: 6 (AR2600664, AR2603022, AR2602277, AR2601198, AR2603495, AR2602006) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 7 (AR2601956, AR2600664, AR2603022, AR2602277, AR2601198, AR2603495, AR2602006) |
| modo | REPARTIDOS: 4 (AR2600664, AR2602277, AR2601198, AR2602006); SEGUN SE INDICA: 3 (AR2601956, AR2603022, AR2603495) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 250 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 43,5; 84,5; 125,5; 166,5; 207,5; 248,5 |  AR2601956; OT/2026/AR2601956.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601956. |
| lona; 200 × 150 | 2,5; 37,8; 75,6; 113,4; 148,5 | 2,5; 37,8; 75,6; 113,4; 148,5 | 2,5; 33,5; 67; 100,5; 134; 167,5; 198,5 |  AR2602277; OT/2026/AR2602277.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2602277 / 1 pedido(s): AR2602006. |
| lona; 220 × 140 | 35,2; 70,5; 105,8 | 35,2; 70,5; 105,8 | 36,9; 73,7; 110,5; 147,3; 184,1 |  AR2600664; OT/2026/AR2600664.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600664. |
| lona; 250 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 37,6; 72,8; 107,9; 143,1; 178,2; 213,4; 248,5 |  AR2601198; OT/2026/AR2601198.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601198. |
| lona; 250 × 150 | 2,5; 37,8; 75,6; 113,4; 148,5 | 2,5; 37,8; 75,6; 113,4; 148,5 | 2,5; 37,6; 72,8; 107,9; 143,1; 178,2; 213,3; 248,5 |  AR2603495; OT/2026/AR2603495.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2603022, AR2603495. |

### TALLERES R.CASAL, S. L. , — 001138

Ficha: `talleres-r-casal-s-l`. Histórico: **8 líneas / 8 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504657). Nombres/alias del histórico: TALLERES R.CASAL, S. L. ,.

Plantillas encontradas: `PL/T.CASAL.dwg`

Reglas añadidas a la propuesta: `recogeDelante` = "NO"; `recogeAtras` = "GOMA"; `bastillaEnfundar` = false; `ventana` = {"lleva":false}; `rotulacion` = false.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 2 (AR2502416, AR2504657); TIPO 02: 1 (AR2501808) |
| recogeDelante | NO: 3 (AR2501808, AR2502416, AR2504657) |
| recogeAtras | GOMA: 3 (AR2501808, AR2502416, AR2504657) |
| bastillaEnfundar | NO: 3 (AR2501808, AR2502416, AR2504657) |
| ventana | NO: 3 (AR2501808, AR2502416, AR2504657) |
| rotulacion | NO: 3 (AR2501808, AR2502416, AR2504657) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 2 (AR2501808, AR2401103); LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2502416); LONA ALPHA 1L 580: NEGRO: 220 AN: 1 (AR2502057); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2405582); LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2403829); LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2504657); LONA MONZA 1L 580G/M2: BURDEOS RAL 3005: 250 AN (580): 1 (AR2503364) |
| modo | SEGUN SE INDICA: 8 (AR2501808, AR2502416, AR2502057, AR2405582, AR2403829, AR2401103, AR2504657, AR2503364) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 150 × 104 | 12; 38; 67; 93 | 12; 38; 67; 93 | 13,5; 41,5; 75,5; 109,5; 137,5 |  AR2405582; OT/2024/AR2405582.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405582. |
| baqueton; 150 × 105 | 11,5; 38,5; 67,5; 94,5 | 11,5; 38,5; 67,5; 94,5 | 12,5; 41,5; 75,5; 109,5; 138,5 |  AR2502057; OT/2025/AR2502057.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502057. |
| baqueton; 160 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 |  AR2503364; OT/2025/AR2503364.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503364. |
| baqueton; 180 × 120 | 10,5; 35,5; 85,5; 110,5 | 10,5; 35,5; 85,5; 110,5 | 13; 46; 88; 131; 168 |  AR2604926; OT/2026/AR2604926.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2604926. |
| baqueton; 260 × 150 | 14; 51; 100; 137,3 | 14; 51; 100; 137,3 | 12,5; 46,5; 88,5; 130,5; 172,5; 214,5; 248,5 |  AR2403829; OT/2024/AR2403829.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403829. |
| lona; 170 × 115 | 5; 40; 74; 111 | 24; 58; 90 | 2,5; 33; 66; 97; 130; 168,5 |  AR2502416; OT/2025/AR2502416.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502416. |
| lona; 174 × 116 | 2,5; 39; 78; 111 | 29; 58; 88 | 2,5; 31; 59; 88; 117; 145,5; 171 |  AR2504657; OT/2025/AR2504657.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504657. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 160 × 120 | AR2501808 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2501808.dwg; OT/2025/AR2501808.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

**Duda para Iván:** AR2401103: el croquis escribe huecos laterales 12–28–35–35–28–12 y cabezas 12–26–30–26–12. Su DXF tiene dos laterales distintos (desde corte: 13–41–76–112–140 y 13–41–69–114–140). ¿Qué lado es el patrón? FichaCliente solo admite un reparto lateral común; no se mezcla el croquis con uno de los dos cortes para completar esta medida.

### CONSTRUCCIONES METALICAS LOUREIRO REIS, S.L.U. — 024041

Ficha: `construcciones-metalicas-loureiro-reis-s-l-u`. Histórico: **5 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2401290). Nombres/alias del histórico: CONSTRUCCIONES METALICAS LOUREIRO REIS, S.L.U..

Plantillas encontradas: `PL/LOUREIRO REIS.dwg`

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 2 (AR2401290, AR2401132) |
| recogeDelante | NO: 2 (AR2401290, AR2401132) |
| recogeAtras | GOMA: 2 (AR2401290, AR2401132) |
| bastillaEnfundar | NO: 2 (AR2401290, AR2401132) |
| ventana | NO: 2 (AR2401290, AR2401132) |
| rotulacion | SI: 2 (AR2401290, AR2401132) |
| material | LONA ALPHA 1L 580: AZUL RAL5015: 220 AN: 2 (AR2401290, AR2401132) |
| modo | REPARTIDOS: 2 (AR2401290, AR2401132) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 153 × 102,5 | 2,5; 35,5; 68; 101 | 2,5; 35,5; 68; 101 | 2,5; 40; 77; 114,5; 151,5 |  AR2401290; OT/2024/AR2401290-2.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2401132, AR2401290. |
| lona; 183 × 125 | 2,5; 33; 63; 93,5; 123,5 | 2,5; 33; 63; 93,5; 123,5 | 2,5; 38,5; 74; 110; 145,5; 181,5 |  AR2401290; OT/2024/AR2401290-1.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 2 pedido(s): AR2401132, AR2401290. |
| lona; 205 × 125 | 2,5; 33; 63; 93,5; 123,5 | 2,5; 33; 63; 93,5; 123,5 | 2,5; 36; 69,5; 103; 136,5; 170; 203,5 |  AR2401132; OT/2024/AR2401132-3.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401132. |

### REMOLKEA · NUÑEZ MARTIN, GEMMA — 048954

Ficha: `remolkea-nunez-martin-gemma`. Histórico: **5 líneas / 5 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600103). Nombres/alias del histórico: REMOLKEA · NUÑEZ MARTIN, GEMMA.

Plantillas encontradas: `PL/GEMMA NUÑEZ MARTIN (REMOLKEA).dwg`

Reglas añadidas a la propuesta: `perfil` = {"tipoPerfil":"TIPO 03"}; `recogeDelante` = "NO"; `bastillaEnfundar` = false; `ventana` = {"lleva":false}.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 3 (AR2600103, AR2500805, AR2506171) |
| recogeDelante | NO: 4 (AR2600103, AR2402094, AR2500805, AR2506171) |
| recogeAtras | GOMA: 3 (AR2402094, AR2500805, AR2506171); VELCRO: 1 (AR2600103) |
| bastillaEnfundar | NO: 4 (AR2600103, AR2402094, AR2500805, AR2506171) |
| ventana | NO: 4 (AR2600103, AR2402094, AR2500805, AR2506171) |
| rotulacion | SI: 3 (AR2600103, AR2500805, AR2506171); NO: 1 (AR2402094) |
| material | LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 4 (AR2600103, AR2505588, AR2500805, AR2506171); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2402094) |
| modo | REPARTIDOS: 4 (AR2600103, AR2402094, AR2500805, AR2506171); SEGUN SE INDICA: 1 (AR2505588) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 150 × 115 | 2,5; 30,3; 58; 85,8; 113,5 | 2,5; 30,3; 58; 85,8; 113,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 |  AR2505588; OT/2025/AR2505588.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505588. |
| lona; 181 × 126 | 2,5; 33; 63,5; 94; 124,5 | 2,5; 33; 63,5; 94; 124,5 | 2,5; 37,9; 73,3; 108,7; 144,1; 179,5 |  AR2506171; OT/2025/AR2506171.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506171. |
| lona; 230 × 159 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5 | 2,5; 33,5; 64,5; 95,5; 126,5; 157,5 | 2,5; 34,8; 67,1; 99,4; 131,6; 163,9; 196,2; 228,5 |  AR2500805; OT/2025/AR2500805.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500805. |
| lona; 250 × 150 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 31,7; 60,9; 90,1; 119,3; 148,5 | 2,5; 33,3; 64; 94,8; 125,5; 187; 217,8; 248,5 |  AR2600103; OT/2026/AR2600103.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600103. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 164 × 156 | AR2402094 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2402094.dwg; OT/2024/AR2402094.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### REMOLQUES HERMANOS CERVERA S.L — 048657

Ficha: `remolques-hermanos-cervera-s-l`. Histórico: **5 líneas / 4 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601463). Nombres/alias del histórico: REMOLQUES HERMANOS CERVERA S.L.

Plantillas encontradas: `PL/REMOLQUES HNOS.CERVERA.dwg`

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 2 (AR2600266, AR2600800) |
| recogeDelante | NO: 2 (AR2600266, AR2600800) |
| recogeAtras | GOMA: 2 (AR2600266, AR2600800) |
| bastillaEnfundar | NO: 2 (AR2600266, AR2600800) |
| ventana | NO: 2 (AR2600266, AR2600800) |
| rotulacion | NO: 2 (AR2600266, AR2600800) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 2 (AR2600266, AR2600800); LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2503575) |
| modo | SEGUN SE INDICA: 2 (AR2503575, AR2600800); REPARTIDOS: 1 (AR2600266) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 262 × 162 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 | 2,5; 34,1; 65,7; 97,3; 128,9; 160,5 | 2,5; 34,8; 67; 99,3; 131,5; 163,8; 196; 228,3; 260,5 |  AR2503575; OT/2025/AR2503575.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503575. |
| lona; 220 × 125 | 2,5; 32,3; 63; 93,8; 123,5 | 2,5; 32,3; 63; 93,8; 123,5 | 2,5; 12,5; 37,8; 74,2; 110,5; 146,8; 183,2; 218,5 |  AR2600266; OT/2026/AR2600266.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600266. |
| lona; 250 × 125 | 2,5; 32,8; 63; 93,3; 123,5 | 2,5; 32,8; 63; 93,3; 123,5 | 16,5; 47,6; 78,8; 109,9; 141,1; 172,2; 203,4; 234,5 |  AR2600800; OT/2026/AR2600800.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600800. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 264 × 142 | AR2600266 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2600266.dwg; OT/2026/AR2600266.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Ganado; 275 × 126 | AR2601463 | Modelo de ganado; fuera de FichaCliente. OT/2026/AR2601463.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### REMOLQUES JALON S.L — 048719

Ficha: `remolques-jalon-s-l`. Histórico: **5 líneas / 3 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2602280). Nombres/alias del histórico: REMOLQUES JALON S.L.

Plantillas encontradas: `PL/JALON.dwg`

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 2 (AR2602280, AR2504983) |
| modo | SEGUN SE INDICA: 2 (AR2602280, AR2504983) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 159,5 × 117 | 7; 29; 59; 89; 111 | 7; 29; 59; 89; 111 | 10,5; 35,25; 65,25; 95,25; 125,25; 150 |  AR2602280; OT/2026/AR2602280-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602280. |
| baqueton; 241 × 136 | 5; 36,8; 68,5; 100,3; 132 | 5; 36,8; 68,5; 100,3; 132 | 12,5; 43,5; 74,5; 105,5; 136,5; 167,5; 198,5; 229,5 |  AR2504983; OT/2025/AR2504983.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504983. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 211 × 136 | AR2504631 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2504631.dwg; OT/2025/AR2504631.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### CERRAJERIA CERRI · FERNANDEZ MUNICIO, JUAN — 005734

Ficha: `cerrajeria-cerri-fernandez-municio-juan`. Histórico: **4 líneas / 4 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2604535). Nombres/alias del histórico: CERRAJERIA CERRI · FERNANDEZ MUNICIO, JUAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 2 (AR2403313, AR2603385) |
| recogeDelante | NO: 2 (AR2403313, AR2603385) |
| recogeAtras | VELCRO: 2 (AR2403313, AR2603385) |
| bastillaEnfundar | NO: 2 (AR2403313, AR2603385) |
| ventana | NO: 2 (AR2403313, AR2603385) |
| rotulacion | NO: 2 (AR2403313, AR2603385) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2403313); LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2603385) |
| modo | SEGUN SE INDICA: 2 (AR2403313, AR2603385) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 203 × 128 | 2,5; 33,5; 64,5; 95,5; 126,5 | 2,5; 33,5; 64,5; 95,5; 126,5 | 2,5; 42,3; 82,1; 121,9; 161,7; 201,5 |  AR2603385; OT/2026/AR2603385.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603385. |
| lona; 230 × 142 | 16; 53; 90; 127 | 16; 53; 90; 127 | 5; 10; 40,1; 70,3; 100,4; 130,6; 160,7; 190,9; 221 |  AR2403313; OT/2024/AR2403313.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403313. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 350 × 180 | AR2401317 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2401317.dwg; OT/2024/AR2401317.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 150 × 108 | AR2604535 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604535.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### TALLERES ALDIPE, S. L. — 000064

Ficha: `talleres-aldipe-s-l`. Histórico: **3 líneas / 3 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600587). Nombres/alias del histórico: TALLERES ALDIPE, S. L..

Plantillas encontradas: `PL/ALDIPE.dwg`

Reglas añadidas a la propuesta: `ollaosRepartidos` = true; `recogeAtras` = "GOMA"; `ventana` = {"lleva":false}.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 2 (AR2600587, AR2501122); TIPO 03: 1 (AR2401587) |
| recogeDelante | NO: 2 (AR2600587, AR2501122); GOMA: 1 (AR2401587) |
| recogeAtras | GOMA: 3 (AR2600587, AR2401587, AR2501122) |
| bastillaEnfundar | NO: 2 (AR2600587, AR2501122) |
| ventana | NO: 3 (AR2600587, AR2401587, AR2501122) |
| rotulacion | TALLERES ALDIPE: 1 (AR2600587); NO: 1 (AR2401587); SI: 1 (AR2501122) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 2 (AR2401587, AR2501122); LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2600587) |
| modo | REPARTIDOS: 2 (AR2600587, AR2501122); SEGUN SE INDICA: 1 (AR2401587) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 180 × 110 | 2,5; 37,8; 73,2; 108,5 | 2,5; 37,8; 73,2; 108,5 | 2,5; 37,7; 72,9; 108,1; 143,3; 178,5 |  AR2501122; OT/2025/AR2501122.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501122. |
| lona; 194 × 139 | 2,5; 33,7; 67,5; 101,2; 135 | 2,5; 33,7; 67,5; 101,2; 135 | 2,5; 34,2; 65,8; 97,5; 129,2; 160,8; 192,5 |  AR2600587; OT/2026/AR2600587.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600587. |
| lona; 200 × 130 | 10; 45; 86; 121 | 10; 45; 86; 121 | 10; 41; 81; 121; 161; 191 |  AR2605267; OT/2026/AR2605267.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605267. |
| lona; 201,5 × 121,5 | 10; 43; 78; 112,8 | 10; 43; 78; 112,8 | 10; 36; 79; 122; 165; 192,5 |  AR2401587; OT/2024/AR2401587.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401587. |

### TALLERES J. LEMA · TRANSFORMACIONES BERGANTIÑOS S.L — 046101

Ficha: `talleres-j-lema-transformaciones-bergantinos-s-l`. Histórico: **3 líneas / 3 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600892). Nombres/alias del histórico: TALLERES J. LEMA · TRANSFORMACIONES BERGANTIÑOS S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| recogeDelante | NO: 1 (AR2402627) |
| recogeAtras | GOMA: 1 (AR2402627) |
| ventana | SÍ: 1 (AR2402627) |
| rotulacion | SÍ: 1 (AR2402627) |
| material | LONA ALPHA 1L 580 :NARANJA RAL2004 :250 AN: 1 (AR2402627) |
| modo | SEGUN SE INDICA: 1 (AR2402627) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 216 × 134,5 | 22; 68; 113 | 22,75; 67,75; 112,75 | 20,5; 56,5; 90,5; 126,5; 160,5; 196,5 |  AR2402627; OT/2024/AR2402627.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402627. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 160 × 120 | AR2503272 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503272.dwg; OT/2025/AR2503272.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 176 × 111 | AR2600892 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2600892.dwg; OT/2026/AR2600892.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ALBA ALVAREZ, NOE — 052354

Ficha: `alba-alvarez-noe`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2506290). Nombres/alias del histórico: ALBA ALVAREZ, NOE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2501346) |
| recogeDelante | NO: 1 (AR2501346) |
| recogeAtras | GOMA: 1 (AR2501346) |
| bastillaEnfundar | SÍ: 1 (AR2501346) |
| ventana | NO: 1 (AR2501346) |
| rotulacion | NO: 1 (AR2501346) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2501346) |
| modo | SEGUN SE INDICA: 1 (AR2501346) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 160 × 120,5 | 15; 45,4; 76,1; 106,5 | 15; 45,4; 76,1; 106,5 | 15; 42,8; 68; 93; 118,3; 146 |  AR2501346; OT/2025/AR2501346.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501346. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 283,5 × 150 | AR2506290 | Modelo de ganado; fuera de FichaCliente. OT/2025/AR2506290.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ALVARELLOS GARCIA, ADRIAN — 048310

Ficha: `alvarellos-garcia-adrian`. Histórico: **2 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600084). Nombres/alias del histórico: ALVARELLOS GARCIA, ADRIAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 202 × 131 | AR2600084 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 226 × 146 | AR2600084 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### BLANCO BARROS, FERNANDO — 053458

Ficha: `blanco-barros-fernando`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601802). Nombres/alias del histórico: BLANCO BARROS, FERNANDO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 2 (AR2506369, AR2601802) |
| modo | SEGUN SE INDICA: 2 (AR2506369, AR2601802) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 202 × 132,5 | 2,5; 34,6; 66,8; 98,9; 131 | 2,5; 34,6; 66,8; 98,9; 131 | 2,5; 42,1; 81,7; 121,3; 160,9; 200,5 |  AR2601802; OT/2026/AR2601802.xlsb / BAQUETÓN, filas 38/39/40, I:T; más reciente sin mayoría clara. Variantes: 1 pedido(s): AR2601802 / 1 pedido(s): AR2506369. |

### CANOSA LEMA, CELESTINO — 054207

Ficha: `canosa-lema-celestino`. Histórico: **2 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2603456). Nombres/alias del histórico: CANOSA LEMA, CELESTINO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2603456) |
| recogeDelante | NO: 1 (AR2603456) |
| recogeAtras | GOMA: 1 (AR2603456) |
| bastillaEnfundar | NO: 1 (AR2603456) |
| ventana | NO: 1 (AR2603456) |
| rotulacion | NO: 1 (AR2603456) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2603456) |
| modo | SEGUN SE INDICA: 1 (AR2603456) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 160 × 140 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 36,5; 70,5; 104,5; 138,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 |  AR2603456; OT/2026/AR2603456-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603456. |

### CASAS FERRERO, IVAN — 037583

Ficha: `casas-ferrero-ivan`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500702). Nombres/alias del histórico: CASAS FERRERO, IVAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 256 × 150 | BE2500701 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 391 × 205 | BE2500702 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### CORRAL EXPOSITO, ANTONIO ANGEL — 045310

Ficha: `corral-exposito-antonio-angel`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505127). Nombres/alias del histórico: CORRAL EXPOSITO, ANTONIO ANGEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2505127) |
| recogeDelante | NO: 1 (AR2505127) |
| recogeAtras | GOMA: 1 (AR2505127) |
| bastillaEnfundar | NO: 1 (AR2505127) |
| ventana | SÍ: 1 (AR2505127) |
| rotulacion | NO: 1 (AR2505127) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2505127) |
| modo | SEGUN SE INDICA: 1 (AR2505127) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 150 × 109 | 9,5; 37; 73; 100,5 | 9,5; 37; 73; 100,5 | 10,75; 39,45; 75,45; 111,45; 140,25 |  AR2505127; OT/2025/AR2505127.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505127. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 290 × 184 | AR2400410 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/ar2400410.dwg; OT/2024/AR2400410.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### FERREIRO CONDE, JESUS — 052333

Ficha: `ferreiro-conde-jesus`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2503766). Nombres/alias del histórico: FERREIRO CONDE, JESUS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 299 × 151,5 | AR2501220 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 152 × 105,5 | AR2503766 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503766.dwg; OT/2025/AR2503766.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### FERROELEÑA S.L. — 053029

Ficha: `ferroelena-s-l`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505511). Nombres/alias del histórico: FERROELEÑA S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 2 (AR2503486, AR2505511) |
| recogeDelante | NO: 2 (AR2503486, AR2505511) |
| recogeAtras | NO: 2 (AR2503486, AR2505511) |
| bastillaEnfundar | SÍ: 2 (AR2503486, AR2505511) |
| ventana | NO: 2 (AR2503486, AR2505511) |
| rotulacion | NO: 2 (AR2503486, AR2505511) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 2 (AR2503486, AR2505511) |

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 400,5 × 121 | AR2503486 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503486.dwg; OT/2025/AR2503486.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 400 × 120,5 | AR2505511 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2505511.dwg; OT/2025/AR2505511.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### GARCIA GARCIA, ALBERTO — 051667

Ficha: `garcia-garcia-alberto`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405410). Nombres/alias del histórico: GARCIA GARCIA, ALBERTO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA G650 2L 650 :AZUL EUROPA 95 :300 AN (M5731): 2 (AR2404829, AR2405410) |
| modo | SEGUN SE INDICA: 2 (AR2404829, AR2405410) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 260 × 149 | 2,5; 35,5; 74,5; 114; 147,5 | 2,5; 35,5; 74,5; 114; 147,5 | 2,5; 42; 86; 130; 173,5; 217,5; 258,5 |  AR2404829; OT/2024/AR2404829.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404829. |
| baqueton; 263 × 154 | 2,5; 37; 77; 117,5; 152,5 | 2,5; 37; 77; 117,5; 152,5 | 2,5; 43,5; 87,5; 131,5; 175; 219; 261,5 |  AR2405410; OT/2024/AR2405410.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405410. |

### LAGO GRAÑA, VERONICA — 051467

Ficha: `lago-grana-veronica`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2502616). Nombres/alias del histórico: LAGO GRAÑA, VERONICA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2404021) |
| recogeDelante | NO: 1 (AR2404021) |
| recogeAtras | GOMA: 1 (AR2404021) |
| bastillaEnfundar | NO: 1 (AR2404021) |
| ventana | NO: 1 (AR2404021) |
| rotulacion | NO: 1 (AR2404021) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 2 (AR2404021, AR2502616) |
| modo | REPARTIDOS: 2 (AR2404021, AR2502616) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 257 × 131 | 2,5; 31,7; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,1; 65,8; 97,4; 129; 160,6; 192,3; 223,9; 255,5 |  AR2502616; OT/2025/AR2502616.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502616. |
| lona; 225 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34,1; 65,6; 97,2; 128,8; 160,4; 191,9; 223,5 |  AR2404021; OT/2024/AR2404021.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404021. |

### ORGALES PEREZ, JUAN — 052733

Ficha: `orgales-perez-juan`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2501012). Nombres/alias del histórico: ORGALES PEREZ, JUAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 250 × 140 | BE2500575 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 256 × 173 | BE2501012 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### PERNAS PERNAS, MAIKEL — 053799

Ficha: `pernas-pernas-maikel`. Histórico: **2 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601694). Nombres/alias del histórico: PERNAS PERNAS, MAIKEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2601694) |
| recogeDelante | NO: 1 (AR2601694) |
| recogeAtras | GOMA: 1 (AR2601694) |
| bastillaEnfundar | NO: 1 (AR2601694) |
| ventana | SÍ: 1 (AR2601694) |
| rotulacion | NO: 1 (AR2601694) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2601694) |
| modo | SEGUN SE INDICA: 1 (AR2601694) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 175 × 115 | 2,5; 28,5; 82,5; 113,5 | 2,5; 28,5; 82,5; 113,5 | 2,5; 25; 65; 108; 150; 173,5 |  AR2601694; OT/2026/AR2601694.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601694. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 250 × 147 | AR2601694 | Modelo de ganado; fuera de FichaCliente. OT/2026/AR2601694.dwg; OT/2026/AR2601694.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### QUIJANO GONZALEZ, EDUARDO — 053773

Ficha: `quijano-gonzalez-eduardo`. Histórico: **2 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601579). Nombres/alias del histórico: QUIJANO GONZALEZ, EDUARDO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2601579) |
| recogeDelante | NO: 1 (AR2601579) |
| recogeAtras | NO: 1 (AR2601579) |
| bastillaEnfundar | NO: 1 (AR2601579) |
| ventana | NO: 1 (AR2601579) |
| rotulacion | NO: 1 (AR2601579) |
| material | LONA G650 2L 650 :GRIS RAL7037 :250 AN (M5736): 1 (AR2601579) |
| modo | SEGUN SE INDICA: 1 (AR2601579); REPARTIDOS: 1 (AR2601579) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 250 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 37,6; 72,8; 107,9; 143,1; 178,2; 213,4; 248,5 |  AR2601579; OT/2026/AR2601579.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601579. |
| lona; 150 × 40 | 2,5; 14,5; 26,5; 38,5 | 2,5; 14,5; 26,5; 38,5 | 2,5; 39; 75,5; 112; 148,5 |  AR2601579; OT/2026/AR2601579.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601579. |

### ROJAS CONTARDO, PABLO — 054131

Ficha: `rojas-contardo-pablo`. Histórico: **2 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2603148). Nombres/alias del histórico: ROJAS CONTARDO, PABLO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2603148) |
| modo | SEGUN SE INDICA: 1 (AR2603148) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 160 × 120 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 31,5; 60,5; 89,5; 118,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 |  AR2603148; OT/2026/AR2603148-11.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603148. |
| baqueton; 200 × 130 | 2,5; 34; 65,5; 97; 128,5 | 14,5; 48,5; 82,5; 116,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 |  AR2603148; OT/2026/AR2603148-10.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603148. |

### TALLERES MECANICOS O CRUCE · JOSE BREIJO SANTALLA Y OTRO, S. L. — 029831

Ficha: `talleres-mecanicos-o-cruce-jose-breijo-santalla-y-otro-s-l`. Histórico: **2 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2602976). Nombres/alias del histórico: TALLERES MECANICOS O CRUCE · JOSE BREIJO SANTALLA Y OTRO, S. L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2602976) |
| recogeDelante | NO: 1 (AR2602976) |
| recogeAtras | GOMA: 1 (AR2602976) |
| bastillaEnfundar | NO: 1 (AR2602976) |
| ventana | SÍ: 1 (AR2602976); NO: 1 (AR2602976) |
| rotulacion | SI: 1 (AR2602976) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2602976); LONA ALPHA 1L 580 :AMARILLO RAL1003 :250 AN: 1 (AR2602976) |
| modo | SEGUN SE INDICA: 1 (AR2602976) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 225 × 128 | 2,5; 33,5; 64,5; 95,5; 126,5 | 2,5; 33,5; 64,5; 95,5; 126,5 | 2,5; 39,3; 76,2; 113; 149,8; 186,7; 223,5 |  AR2602976; OT/2026/AR2602976-11.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602976. |

### TALLERES ODL · CCI  CARROCERIAS INTELIGENTES S.L. — 001166

Ficha: `talleres-odl-cci-carrocerias-inteligentes-s-l`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600366). Nombres/alias del histórico: TALLERES ODL · CCI  CARROCERIAS INTELIGENTES S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2406681); TIPO 05: 1 (AR2600366) |
| recogeDelante | GOMA: 1 (AR2406681); NO: 1 (AR2600366) |
| recogeAtras | GOMA: 1 (AR2406681); NO: 1 (AR2600366) |
| bastillaEnfundar | NO: 2 (AR2406681, AR2600366) |
| ventana | SÍ: 2 (AR2406681, AR2600366) |
| rotulacion | NO: 2 (AR2406681, AR2600366) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 2 (AR2406681, AR2600366) |
| modo | SEGUN SE INDICA: 2 (AR2406681, AR2600366) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 259,5 × 159,5 | 10,1; 50,6; 110,1; 150,4 | 19; 59; 103,3; 141,3 | 18; 54; 90,5; 130,5; 170; 205; 241,3 |  AR2406681; OT/2024/AR2406681.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406681. |

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 235 × 126 | AR2600366 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2600366.dwg; OT/2026/AR2600366.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### TEIJEIRO MARTINEZ, AGUSTIN — 053869

Ficha: `teijeiro-martinez-agustin`. Histórico: **2 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600419). Nombres/alias del histórico: TEIJEIRO MARTINEZ, AGUSTIN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 255 × 150 | BE2600419 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 255 × 150 | BE2600419 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### VIEITES GOMEZ, JESUS — 054473

Ficha: `vieites-gomez-jesus`. Histórico: **2 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2604619). Nombres/alias del histórico: VIEITES GOMEZ, JESUS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 181 × 110 | AR2604619 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604619.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 186 × 110 | AR2604619 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604619.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### VILLAR VAZQUEZ, JUAN CARLOS — 010192

Ficha: `villar-vazquez-juan-carlos`. Histórico: **2 líneas / 2 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500904). Nombres/alias del histórico: VILLAR VAZQUEZ, JUAN CARLOS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 257 × 150 | BE2400677 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |
| Lona alta; 162 × 112 | BE2500904 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### ADAN QUINTELA, MIGUEL ANGEL — 052308

Ficha: `adan-quintela-miguel-angel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2501034). Nombres/alias del histórico: ADAN QUINTELA, MIGUEL ANGEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2501034) |
| recogeDelante | NO: 1 (AR2501034) |
| recogeAtras | GOMA: 1 (AR2501034) |
| bastillaEnfundar | NO: 1 (AR2501034) |
| ventana | NO: 1 (AR2501034) |
| rotulacion | NO: 1 (AR2501034) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2501034) |
| modo | SEGUN SE INDICA: 1 (AR2501034) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 239 × 131 | 10; 35,3; 66; 96,7; 122 | 10; 35,3; 66; 96,7; 122 | 10; 34,3; 62,9; 91,4; 120; 148,6; 177,1; 205,7; 230 |  AR2501034; OT/2025/AR2501034.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501034. |

### AGUION CARREIRA, MARCOS — 036048

Ficha: `aguion-carreira-marcos`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500266). Nombres/alias del histórico: AGUION CARREIRA, MARCOS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 215 × 130 | BE2500266 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### ALBARIÑO ABELLA, VENERANDO — 053053

Ficha: `albarino-abella-venerando`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504254). Nombres/alias del histórico: ALBARIÑO ABELLA, VENERANDO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 1 (AR2504254) |
| recogeDelante | NO: 1 (AR2504254) |
| recogeAtras | GOMA: 1 (AR2504254) |
| bastillaEnfundar | NO: 1 (AR2504254) |
| ventana | NO: 1 (AR2504254) |
| rotulacion | NO: 1 (AR2504254) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2504254) |
| modo | SEGUN SE INDICA: 1 (AR2504254) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 160 × 110 | 18; 54; 91,5 | 18; 54; 91,5 | 16; 48; 80; 112; 144,5 |  AR2504254; OT/2025/AR2504254.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504254. |

### ALFONSO DE JESUS, JUAN ANTONIO — 009413

Ficha: `alfonso-de-jesus-juan-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504348). Nombres/alias del histórico: ALFONSO DE JESUS, JUAN ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2504348) |
| recogeDelante | VELCRO: 1 (AR2504348) |
| recogeAtras | GOMA: 1 (AR2504348) |
| bastillaEnfundar | NO: 1 (AR2504348) |
| ventana | NO: 1 (AR2504348) |
| rotulacion | NO: 1 (AR2504348) |
| material | LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2504348) |
| modo | SEGUN SE INDICA: 1 (AR2504348) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 177 × 120 | 5,5; 31,5; 62; 91,5; 113 | 12; 28,5; 61,5; 96,2; 115 | 2,5; 5,5; 35; 85; 136; 167; 177,5 |  AR2504348; OT/2025/AR2504348.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504348. |

### ALUMINIOS BERES, S. L. — 022526

Ficha: `aluminios-beres-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2503919). Nombres/alias del histórico: ALUMINIOS BERES, S. L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 190 × 131 | AR2503919 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503919.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ALVAREZ HERMIDA, JOSE — 052393

Ficha: `alvarez-hermida-jose`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2501503). Nombres/alias del histórico: ALVAREZ HERMIDA, JOSE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2501503) |
| recogeDelante | NO: 1 (AR2501503) |
| recogeAtras | GOMA: 1 (AR2501503) |
| bastillaEnfundar | NO: 1 (AR2501503) |
| ventana | SÍ: 1 (AR2501503) |
| rotulacion | NO: 1 (AR2501503) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2501503) |
| modo | SEGUN SE INDICA: 1 (AR2501503) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 201 × 130 | 5; 28,5; 65,5; 101,5; 126 | 5; 28,5; 65,5; 101,5; 126 | 6,5; 37,5; 68,5; 100,5; 132,5; 164,5; 195,5 |  AR2501503; OT/2025/AR2501503.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501503. |

### ALVES FERNANDEZ, ALBERTO — 053283

Ficha: `alves-fernandez-alberto`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505391). Nombres/alias del histórico: ALVES FERNANDEZ, ALBERTO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 199 × 99 | AR2505391 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |

### AMERICO DOS ANJOS, MANUEL — 051182

Ficha: `americo-dos-anjos-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2401210). Nombres/alias del histórico: AMERICO DOS ANJOS, MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 250 × 165 | BE2401210 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### ANDUJAR MARTINEZ, JOSE MANUEL — 036319

Ficha: `andujar-martinez-jose-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2502312). Nombres/alias del histórico: ANDUJAR MARTINEZ, JOSE MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2502312) |
| modo | SEGUN SE INDICA: 1 (AR2502312) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 275 × 195 | 2,5; 19; 69; 109; 149; 181,5 | 2,5; 25; 75; 115; 155; 193,5 | 2,5; 25; 70; 110; 155; 196; 240; 267,5 |  AR2502312; OT/2025/AR2502312.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502312. |

### ANGEL ROADE, S. L. — 009750

Ficha: `angel-roade-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504327). Nombres/alias del histórico: ANGEL ROADE, S. L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 260 × 157 | AR2504327 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### ANTELO LUACES, DOMINGO — 018666

Ficha: `antelo-luaces-domingo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2503399). Nombres/alias del histórico: ANTELO LUACES, DOMINGO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 360 × 179 | AR2503399 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503399.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ANTIGUO RUA NOBEL · TALLERES Y SERVICIOS JYP S.L. — 047706

Ficha: `antiguo-rua-nobel-talleres-y-servicios-jyp-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400033). Nombres/alias del histórico: ANTIGUO RUA NOBEL · TALLERES Y SERVICIOS JYP S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 230 × 140 | BE2400033 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### ANVASOAN S.L. — 050508

Ficha: `anvasoan-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2402186). Nombres/alias del histórico: ANVASOAN S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA G650 2L 650 :AZUL RAL5015 :250 AN (M5729): 1 (AR2402186) |
| modo | SEGUN SE INDICA: 1 (AR2402186) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 161 × 112 | 14; 42; 70,5; 98 | 14; 42; 70,5; 98 | 13,5; 40,5; 67,5; 94,5; 121,5; 148,5 |  AR2402186; OT/2024/AR2402186.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402186. |

### APARICIO QUINDIMIL, JOSE ANTONIO — 052162

Ficha: `aparicio-quindimil-jose-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500060). Nombres/alias del histórico: APARICIO QUINDIMIL, JOSE ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 221 × 131 | BE2500060 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### ARDIACA PAREDES, JOSEP — 053351

Ficha: `ardiaca-paredes-josep`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505734). Nombres/alias del histórico: ARDIACA PAREDES, JOSEP.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2505734) |
| recogeDelante | NO: 1 (AR2505734) |
| recogeAtras | GOMA: 1 (AR2505734) |
| bastillaEnfundar | NO: 1 (AR2505734) |
| ventana | NO: 1 (AR2505734) |
| rotulacion | NO: 1 (AR2505734) |
| material | LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2505734) |
| modo | SEGUN SE INDICA: 1 (AR2505734) |

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 161 × 123 | AR2505734 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2505734.dwg; OT/2025/AR2505734.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ARES SOUTO, JAVIER — 023262

Ficha: `ares-souto-javier`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504920). Nombres/alias del histórico: ARES SOUTO, JAVIER.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 222 × 134 | AR2504920 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### BARRO GRUEIRO, CLAUDIO — 053659

Ficha: `barro-grueiro-claudio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601051). Nombres/alias del histórico: BARRO GRUEIRO, CLAUDIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2601051) |
| recogeDelante | NO: 1 (AR2601051) |
| recogeAtras | GOMA: 1 (AR2601051) |
| bastillaEnfundar | NO: 1 (AR2601051) |
| ventana | SÍ: 1 (AR2601051) |
| rotulacion | NO: 1 (AR2601051) |
| material | LONA NS86 2L 630GR [580]: BLANCO : 250 AN: 1 (AR2601051) |
| modo | SEGUN SE INDICA: 1 (AR2601051) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 202 × 124 | 10,5; 40,5; 85,5; 114,5 | 10,5; 40,5; 85,5; 114,5 | 10,5; 51,5; 102,5; 150,5; 192,5 |  AR2601051; OT/2026/AR2601051.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601051. |

### BASCUÑANA SANCHEZ, DAVID — 051361

Ficha: `bascunana-sanchez-david`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2403610). Nombres/alias del histórico: BASCUÑANA SANCHEZ, DAVID.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| recogeDelante | GOMA: 1 (AR2403610) |
| recogeAtras | GOMA: 1 (AR2403610) |
| bastillaEnfundar | NO: 1 (AR2403610) |
| ventana | NO: 1 (AR2403610) |
| rotulacion | NO: 1 (AR2403610) |
| material | LONA RECORD 1 L 580:BLANCO 099 RAL 9010:220 AN: 1 (AR2403610) |
| modo | SEGUN SE INDICA: 1 (AR2403610) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 200 × 130 | 20; 65; 110,5 | 12,5; 45; 90; 123 | 12,5; 50; 100; 150; 188 |  AR2403610; OT/2024/AR2403610.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403610. |

### BEA LOPE, HECTOR — 054474

Ficha: `bea-lope-hector`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2604632). Nombres/alias del histórico: BEA LOPE, HECTOR.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 234 × 141 | AR2604632 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604632.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### BERTOA CASTRO, JOSE ANTONIO — 051561

Ficha: `bertoa-castro-jose-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2404389). Nombres/alias del histórico: BERTOA CASTRO, JOSE ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 195 × 155 | AR2404389 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |

### BLANCO MIRANDA, LINO — 054057

Ficha: `blanco-miranda-lino`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600569). Nombres/alias del histórico: BLANCO MIRANDA, LINO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 230 × 130 | BE2600569 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### BODEGAS SEIXIDO, S. L. , — 007494

Ficha: `bodegas-seixido-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504220). Nombres/alias del histórico: BODEGAS SEIXIDO, S. L. ,.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2504220) |
| recogeDelante | NO: 1 (AR2504220) |
| recogeAtras | NO: 1 (AR2504220) |
| bastillaEnfundar | NO: 1 (AR2504220) |
| ventana | NO: 1 (AR2504220) |
| rotulacion | NO: 1 (AR2504220) |
| material | LONA ALPHA 1L 580  :NEGRO :250 AN: 1 (AR2504220) |
| modo | SEGUN SE INDICA: 1 (AR2504220) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 195 × 125 | 12,75; 44,25; 81,75; 113,25 | 12,75; 44,25; 81,75; 113,25 | 12,5; 48,5; 95,5; 142,5; 181 |  AR2504220; OT/2025/AR2504220.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504220. |

### BORONAT, ANDREU — 053633

Ficha: `boronat-andreu`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600859). Nombres/alias del histórico: BORONAT, ANDREU.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2600859) |
| recogeDelante | NO: 1 (AR2600859) |
| recogeAtras | GOMA: 1 (AR2600859) |
| bastillaEnfundar | NO: 1 (AR2600859) |
| ventana | SÍ: 1 (AR2600859) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2600859) |
| modo | REPARTIDOS: 1 (AR2600859) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 210 × 124 | 2,5; 42,5; 82,5; 122,5 | 2,5; 42,5; 82,5; 122,5 | 2,5; 10; 41,8; 73,7; 105,5; 137,3; 169,2; 201; 208,5 |  AR2600859; OT/2026/AR2600859.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600859. |

### BOUSO LEIVAS, STEFAN — 053330

Ficha: `bouso-leivas-stefan`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505603). Nombres/alias del histórico: BOUSO LEIVAS, STEFAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2505603) |
| recogeDelante | NO: 1 (AR2505603) |
| recogeAtras | GOMA: 1 (AR2505603) |
| bastillaEnfundar | NO: 1 (AR2505603) |
| ventana | NO: 1 (AR2505603) |
| rotulacion | NO: 1 (AR2505603) |
| material | LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2505603) |
| modo | SEGUN SE INDICA: 1 (AR2505603) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 255 × 150 | 2,5; 47; 102; 148,5 | 2,5; 47; 102; 148,5 | 2,5; 43; 84; 127; 170; 212; 253,5 |  AR2505603; OT/2025/AR2505603.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505603. |

### BOUZA SANCHEZ, ALVARO — 009438

Ficha: `bouza-sanchez-alvaro`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400851). Nombres/alias del histórico: BOUZA SANCHEZ, ALVARO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 301 × 167 | BE2400851 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### CAFETERIA ROSALIA · OCAMPO FERNANDEZ, JOSE ANGEL — 030174

Ficha: `cafeteria-rosalia-ocampo-fernandez-jose-angel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505725). Nombres/alias del histórico: CAFETERIA ROSALIA · OCAMPO FERNANDEZ, JOSE ANGEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 225 × 130 | AR2505725 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### CAL LOPEZ, JESUS — 052322

Ficha: `cal-lopez-jesus`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500271). Nombres/alias del histórico: CAL LOPEZ, JESUS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 156 × 100 | BE2500271 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### CALVEIRO NOVO, JOSE ANTONIO — 051930

Ficha: `calveiro-novo-jose-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406023). Nombres/alias del histórico: CALVEIRO NOVO, JOSE ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2406023) |
| recogeDelante | NO: 1 (AR2406023) |
| recogeAtras | GOMA: 1 (AR2406023) |
| bastillaEnfundar | NO: 1 (AR2406023) |
| ventana | NO: 1 (AR2406023) |
| rotulacion | NO: 1 (AR2406023) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2406023) |
| modo | SEGUN SE INDICA: 1 (AR2406023) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 270 × 160 | 5; 44; 81; 117; 155 | 5; 44; 81; 117; 155 | 5; 10; 30; 60; 90; 120; 150; 180; 210; 236; 265 |  AR2406023; OT/2024/AR2406023.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406023. |

### CALVO ESPAÑA, ISMAEL — 052688

Ficha: `calvo-espana-ismael`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500539). Nombres/alias del histórico: CALVO ESPAÑA, ISMAEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 220 × 140 | BE2500539 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### CAMBA GIL, RAMON — 051746

Ficha: `camba-gil-ramon`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405178). Nombres/alias del histórico: CAMBA GIL, RAMON.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2405178) |
| recogeDelante | NO: 1 (AR2405178) |
| recogeAtras | GOMA: 1 (AR2405178) |
| bastillaEnfundar | NO: 1 (AR2405178) |
| ventana | NO: 1 (AR2405178) |
| rotulacion | NO: 1 (AR2405178) |
| material | LONA ALPHA 1L 580: VERDE RAL 6026: 220 AN: 1 (AR2405178) |
| modo | SEGUN SE INDICA: 1 (AR2405178) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 205,5 × 121 | 5; 35; 90; 115 | 11; 41; 81; 111 | 5; 24; 55; 87; 119; 150; 182; 202 |  AR2405178; OT/2024/AR2405178.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405178. |

### CAMPOS AUTOTECNICA S.C — 050969

Ficha: `campos-autotecnica-s-c`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2402012). Nombres/alias del histórico: CAMPOS AUTOTECNICA S.C.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 04: 1 (AR2402012) |
| recogeDelante | PUENTES ESVA: 1 (AR2402012) |
| recogeAtras | PUENTES ESVA: 1 (AR2402012) |
| bastillaEnfundar | NO: 1 (AR2402012) |
| ventana | NO: 1 (AR2402012) |
| rotulacion | NO: 1 (AR2402012) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2402012) |
| modo | SEGUN SE INDICA: 1 (AR2402012) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 250 × 140 | 10; 28; 49,3; 70,6; 92; 113; 131 | 10; 28; 49,3; 70,6; 91,96; 113; 131 | 9,8; 27,8; 49,5; 71,2; 92,9; 114,6; 136,4; 158,1; 179,8; 201,5; 223,2; 241,2 |  AR2402012; OT/2024/AR2402012.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402012. |

### CARDELLE HIDRAULICA, S. L. , — 012688

Ficha: `cardelle-hidraulica-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500727). Nombres/alias del histórico: CARDELLE HIDRAULICA, S. L. ,.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 275 × 167 | BE2500727 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### CARMELO · CARMELO BARREIRO PAZ — 045150

Ficha: `carmelo-carmelo-barreiro-paz`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2501233). Nombres/alias del histórico: CARMELO · CARMELO BARREIRO PAZ.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 290 × 152,5 | AR2501233 | Modelo de ganado; fuera de FichaCliente. OT/2025/AR2501233.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### CARRASCO GASCON, FRANCISCO — 051418

Ficha: `carrasco-gascon-francisco`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2403830). Nombres/alias del histórico: CARRASCO GASCON, FRANCISCO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2403830) |
| recogeDelante | NO: 1 (AR2403830) |
| recogeAtras | GOMA: 1 (AR2403830) |
| bastillaEnfundar | NO: 1 (AR2403830) |
| ventana | NO: 1 (AR2403830) |
| rotulacion | NO: 1 (AR2403830) |
| material | LONA RECORD 1 L 580:GRIS 095 RAL 7038:220 AN: 1 (AR2403830) |
| modo | SEGUN SE INDICA: 1 (AR2403830) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 208,5 × 137 | 10; 48,5; 89,5; 128 | 10; 48,5; 89,5; 128 | 10; 41,6; 73,2; 104,8; 136,3; 167,9; 199,5 |  AR2403830; OT/2024/AR2403830.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403830. |

### CARRO VAZQUEZ, SERGIO — 052107

Ficha: `carro-vazquez-sergio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2401292). Nombres/alias del histórico: CARRO VAZQUEZ, SERGIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 279 × 124 | BE2401292 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### CARROCEROS DEL NOROESTE, S. L. — 000564

Ficha: `carroceros-del-noroeste-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405193). Nombres/alias del histórico: CARROCEROS DEL NOROESTE, S. L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2405193) |
| recogeDelante | NO: 1 (AR2405193) |
| recogeAtras | VELCRO: 1 (AR2405193) |
| bastillaEnfundar | NO: 1 (AR2405193) |
| ventana | NO: 1 (AR2405193) |
| rotulacion | NO: 1 (AR2405193) |
| material | LONA RECORD 1 L 580:GRIS 095 RAL 7038:220 AN: 1 (AR2405193) |
| modo | SEGUN SE INDICA: 1 (AR2405193) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 121 × 103 | 12; 50; 92 | 12; 35; 69; 92 | 10; 30; 92; 112 |  AR2405193; OT/2024/AR2405193.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405193. |

### CASAL PACHECO, MANUEL — 020894

Ficha: `casal-pacheco-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2500013). Nombres/alias del histórico: CASAL PACHECO, MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| recogeDelante | GOMA: 1 (AR2500013) |
| recogeAtras | GOMA: 1 (AR2500013) |
| bastillaEnfundar | NO: 1 (AR2500013) |
| ventana | NO: 1 (AR2500013) |
| rotulacion | NO: 1 (AR2500013) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2500013) |
| modo | SEGUN SE INDICA: 1 (AR2500013) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 230 × 130 | 10; 40; 85; 120 | 10; 40; 85; 120 | 10,5; 45,5; 90,5; 140,5; 185,5; 220,5 |  AR2500013; OT/2025/AR2500013.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500013. |

### CASTILLO DE MOYA, IVAN — 054187

Ficha: `castillo-de-moya-ivan`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2603364). Nombres/alias del histórico: CASTILLO DE MOYA, IVAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 1 (AR2603364) |
| recogeDelante | NO: 1 (AR2603364) |
| recogeAtras | GOMA: 1 (AR2603364) |
| bastillaEnfundar | NO: 1 (AR2603364) |
| ventana | NO: 1 (AR2603364) |
| rotulacion | NO: 1 (AR2603364) |
| material | LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2603364) |
| modo | SEGUN SE INDICA: 1 (AR2603364) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 149,5 × 104,5 | 2,5; 37; 67; 103 | 2,5; 37; 67; 103 | 2,5; 41,5; 74,5; 107,5; 148 |  AR2603364; OT/2026/AR2603364.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603364. |

### CASTRO BELLON, PABLO — 031692

Ficha: `castro-bellon-pablo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505558). Nombres/alias del histórico: CASTRO BELLON, PABLO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2505558) |
| recogeDelante | GOMA: 1 (AR2505558) |
| recogeAtras | GOMA: 1 (AR2505558) |
| bastillaEnfundar | NO: 1 (AR2505558) |
| ventana | NO: 1 (AR2505558) |
| rotulacion | NO: 1 (AR2505558) |
| material | LONA MONZA 1L 580 GR ROJO RAL 3020 250AN: 1 (AR2505558) |
| modo | SEGUN SE INDICA: 1 (AR2505558) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 250 × 140 | 2,5; 27,5; 38,3; 70,5; 102,8; 113,5; 138,5 | 2,5; 24; 54; 84; 113; 138,5 | 2,5; 24; 55; 88; 125; 152; 185; 216; 248,5 |  AR2505558; OT/2025/AR2505558.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505558. |

### CASTRO CARRO, FRANCISCO — 052922

Ficha: `castro-carro-francisco`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2503639). Nombres/alias del histórico: CASTRO CARRO, FRANCISCO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2503639) |
| recogeDelante | NO: 1 (AR2503639) |
| recogeAtras | GOMA: 1 (AR2503639) |
| bastillaEnfundar | NO: 1 (AR2503639) |
| ventana | NO: 1 (AR2503639) |
| rotulacion | NO: 1 (AR2503639) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2503639) |
| modo | SEGUN SE INDICA: 1 (AR2503639) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 190 × 120 | 12; 42,5; 79,5; 109,5 | 12; 42,5; 79,5; 109,5 | 10; 45; 95; 145; 180,5 |  AR2503639; OT/2025/AR2503639.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503639. |

### CASTRO GARCIA, ROGELIO — 050904

Ficha: `castro-garcia-rogelio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2401752). Nombres/alias del histórico: CASTRO GARCIA, ROGELIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2401752) |
| recogeDelante | NO: 1 (AR2401752) |
| recogeAtras | GOMA: 1 (AR2401752) |
| bastillaEnfundar | NO: 1 (AR2401752) |
| ventana | NO: 1 (AR2401752) |
| rotulacion | NO: 1 (AR2401752) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2401752) |
| modo | SEGUN SE INDICA: 1 (AR2401752) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 230 × 140 | 5; 45; 100; 135 | 5,5; 50,5; 90,5; 135,5 | 5; 50; 93; 138; 184; 225 |  AR2401752; OT/2024/AR2401752.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401752. |

### CASTRO MOURIÑO, JUAN JOSE — 019415

Ficha: `castro-mourino-juan-jose`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2402048). Nombres/alias del histórico: CASTRO MOURIÑO, JUAN JOSE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2402048) |
| recogeDelante | NO: 1 (AR2402048) |
| recogeAtras | GOMA: 1 (AR2402048) |
| ventana | NO: 1 (AR2402048) |
| rotulacion | NO: 1 (AR2402048) |
| material | LONA G650 2L 650 : VAINILLA 923 :250AN: 1 (AR2402048) |
| modo | SEGUN SE INDICA: 1 (AR2402048) |

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 160 × 110 | AR2402048 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2402048.dwg; OT/2024/AR2402048.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### CASTRO RODRIGUEZ, MARIA LUISA — 053628

Ficha: `castro-rodriguez-maria-luisa`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600832). Nombres/alias del histórico: CASTRO RODRIGUEZ, MARIA LUISA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| modo | SEGUN SE INDICA: 1 (AR2600832) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 300 × 163 | 2,5; 40; 82; 123; 161,5 | 2,5; 42; 86; 126; 161,5 | 2,5; 37; 75; 110; 147; 185; 223; 263; 298,5 |  AR2600832; OT/2026/AR2600832.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600832. |

### CERNADAS FERNANDEZ, JUAN — 053305

Ficha: `cernadas-fernandez-juan`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505489). Nombres/alias del histórico: CERNADAS FERNANDEZ, JUAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 191 × 140 | AR2505489 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |

### CHG QUIEROUNTOLDO2013 S.L. — 047782

Ficha: `chg-quierountoldo2013-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505659). Nombres/alias del histórico: CHG QUIEROUNTOLDO2013 S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2505659) |
| recogeDelante | NO: 1 (AR2505659) |
| recogeAtras | VELCRO: 1 (AR2505659) |
| bastillaEnfundar | NO: 1 (AR2505659) |
| ventana | NO: 1 (AR2505659) |
| rotulacion | NO: 1 (AR2505659) |
| material | LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2505659) |
| modo | REPARTIDOS: 1 (AR2505659) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 134 × 110 | 2,5; 37,8; 73,2; 108,5 | 2,5; 37,8; 73,2; 108,5 | 2,5; 35; 67,5; 100; 132,5 |  AR2605145; OT/2026/AR2605145.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605145. |
| lona; 206 × 133 | 2,5; 33,5; 67; 100,5 | 2,5; 33,5; 67; 100,5 | 2,5; 34,5; 69; 103,5; 138; 172,5; 204,5 |  AR2505659; OT/2025/AR2505659.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505659. |

### CIBREIRO RODRIGUEZ, JOSE — 051737

Ficha: `cibreiro-rodriguez-jose`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405149). Nombres/alias del histórico: CIBREIRO RODRIGUEZ, JOSE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2405149) |
| recogeDelante | NO: 1 (AR2405149) |
| recogeAtras | PUENTES ESVA: 1 (AR2405149) |
| bastillaEnfundar | NO: 1 (AR2405149) |
| ventana | NO: 1 (AR2405149) |
| rotulacion | NO: 1 (AR2405149) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2405149) |
| modo | REPARTIDOS: 1 (AR2405149) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 276 × 150 | 10; 38,5; 75,5; 112,5; 141 | 10; 38,5; 75,5; 112,5; 141 | 10; 36,9; 70,8; 104,6; 138,5; 172,3; 206,2; 240; 267 |  AR2405149; OT/2024/AR2405149.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405149. |

### CLH · EXOLUM CORPORATION S.A. — 015375

Ficha: `clh-exolum-corporation-s-a`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2501970). Nombres/alias del histórico: CLH · EXOLUM CORPORATION S.A..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2501970) |
| recogeDelante | NO: 1 (AR2501970) |
| recogeAtras | NO: 1 (AR2501970) |
| bastillaEnfundar | NO: 1 (AR2501970) |
| ventana | NO: 1 (AR2501970) |
| rotulacion | NO: 1 (AR2501970) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2501970) |
| modo | SEGUN SE INDICA: 1 (AR2501970) |

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 300 × 150 | AR2501970 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/ar2501970.dwg; OT/2025/AR2501970.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### CLIENTE TPV — 016564

Ficha: `cliente-tpv`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504855). Nombres/alias del histórico: CLIENTE TPV.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 200 × 115 | AR2504855 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### COAFOR, SDAD. COOP. GALEGA , — 015645

Ficha: `coafor-sdad-coop-galega`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2403932). Nombres/alias del histórico: COAFOR, SDAD. COOP. GALEGA ,.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| recogeDelante | NO: 1 (AR2403932) |
| recogeAtras | GOMA: 1 (AR2403932) |
| bastillaEnfundar | NO: 1 (AR2403932) |
| ventana | NO: 1 (AR2403932) |
| rotulacion | NO: 1 (AR2403932) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2403932) |
| modo | SEGUN SE INDICA: 1 (AR2403932) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 191 × 121,5 | 12; 43,3; 80,7; 111 | 12; 43,3; 80,7; 111 | 10; 45; 95; 145; 181 |  AR2403932; OT/2024/AR2403932.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403932. |

### CONCELLO DE PONTEDEUME — 013287

Ficha: `concello-de-pontedeume`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2602109). Nombres/alias del histórico: CONCELLO DE PONTEDEUME.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2602109) |
| recogeDelante | NO: 1 (AR2602109) |
| recogeAtras | GOMA: 1 (AR2602109) |
| bastillaEnfundar | NO: 1 (AR2602109) |
| ventana | NO: 1 (AR2602109) |
| rotulacion | NO: 1 (AR2602109) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2602109) |
| modo | SEGUN SE INDICA: 1 (AR2602109) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 179,5 × 110 | 2,5; 37; 71; 107,5 | 2,5; 25; 55; 82; 107,5 | 2,5; 36; 65; 93; 120; 148; 177 |  AR2602109; OT/2026/AR2602109.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602109. |

### COOPERATIVAS LACTEAS UNIDAS SCG (CLUN) — 038264

Ficha: `cooperativas-lacteas-unidas-scg-clun`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601575). Nombres/alias del histórico: COOPERATIVAS LACTEAS UNIDAS SCG (CLUN).

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 256 × 146 | AR2601575 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601575.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### DEJESUS MACHADO, ANTONIO — 025062

Ficha: `dejesus-machado-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600382). Nombres/alias del histórico: DEJESUS MACHADO, ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 250 × 149 | BE2600382 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### DIAZ IZQUIERDO, ANA — 052652

Ficha: `diaz-izquierdo-ana`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2502595). Nombres/alias del histórico: DIAZ IZQUIERDO, ANA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2502595) |
| recogeDelante | NO: 1 (AR2502595) |
| recogeAtras | GOMA: 1 (AR2502595) |
| bastillaEnfundar | NO: 1 (AR2502595) |
| ventana | NO: 1 (AR2502595) |
| rotulacion | NO: 1 (AR2502595) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2502595) |
| modo | REPARTIDOS: 1 (AR2502595) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 152 × 110 | 10; 40,3; 70,7; 101 | 10; 40,3; 70,7; 101 | 2,5; 10; 43,3; 76,5; 109,8; 143 |  AR2502595; OT/2025/AR2502595.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502595. |

### DIAZ MENENDEZ, CARLOS — 053657

Ficha: `diaz-menendez-carlos`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601042). Nombres/alias del histórico: DIAZ MENENDEZ, CARLOS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2601042) |
| recogeDelante | NO: 1 (AR2601042) |
| recogeAtras | GOMA: 1 (AR2601042) |
| bastillaEnfundar | NO: 1 (AR2601042) |
| ventana | NO: 1 (AR2601042) |
| rotulacion | NO: 1 (AR2601042) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2601042) |
| modo | REPARTIDOS: 1 (AR2601042) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 200 × 130 | 2,5; 44,5; 86,5; 128,5 | 2,5; 44,5; 86,5; 128,5 | 2,5; 41,7; 80,9; 120,1; 159,3; 198,5 |  AR2601042; OT/2026/AR2601042.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601042. |

### DIVIRTT S.L — 053625

Ficha: `divirtt-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600225). Nombres/alias del histórico: DIVIRTT S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 350 × 195 | BE2600225 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### DOCAMPO ABEIJON, FERNANDO — 053410

Ficha: `docampo-abeijon-fernando`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2506092). Nombres/alias del histórico: DOCAMPO ABEIJON, FERNANDO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2506092) |
| recogeDelante | NO: 1 (AR2506092) |
| recogeAtras | GOMA: 1 (AR2506092) |
| bastillaEnfundar | NO: 1 (AR2506092) |
| ventana | NO: 1 (AR2506092) |
| rotulacion | NO: 1 (AR2506092) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2506092) |
| modo | SEGUN SE INDICA: 1 (AR2506092) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 120 × 85 | 11; 43; 75 | 5; 30,5; 55,5; 81 | 5; 41,7; 78,3; 116 |  AR2506092; OT/2025/AR2506092.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506092. |

### DOMANGUES ESTRAVIZ, RUBEN — 051204

Ficha: `domangues-estraviz-ruben`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400498). Nombres/alias del histórico: DOMANGUES ESTRAVIZ, RUBEN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 250 × 140 | BE2400498 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### DURAN VEIGA, ANDRES — 052066

Ficha: `duran-veiga-andres`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406832). Nombres/alias del histórico: DURAN VEIGA, ANDRES.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 195,5 × 119 | AR2406832 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2406832.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ELECTRIFICACIONES MIÑONES SL — 045829

Ficha: `electrificaciones-minones-sl`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601560). Nombres/alias del histórico: ELECTRIFICACIONES MIÑONES SL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 265 × 133 | AR2601560 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2601560.dwg; OT/2026/AR2601560.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ENRIQUEZ COLLAZO, MANUEL — 033788

Ficha: `enriquez-collazo-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600570). Nombres/alias del histórico: ENRIQUEZ COLLAZO, MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2600570) |

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 165,5 × 119 | AR2600570 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2600570.dwg; OT/2026/AR2600570.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ESTRELLA GALICIA · HIJOS DE RIVERA, S.A.U. — 003380

Ficha: `estrella-galicia-hijos-de-rivera-s-a-u`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2500051). Nombres/alias del histórico: ESTRELLA GALICIA · HIJOS DE RIVERA, S.A.U..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 188 × 122 | AR2500051 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### EXPLOTACIONES FORESTALES GARAFETE S.L — 050070

Ficha: `explotaciones-forestales-garafete-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405950). Nombres/alias del histórico: EXPLOTACIONES FORESTALES GARAFETE S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2405950) |
| recogeDelante | NO: 1 (AR2405950) |
| recogeAtras | GOMA: 1 (AR2405950) |
| bastillaEnfundar | NO: 1 (AR2405950) |
| ventana | NO: 1 (AR2405950) |
| rotulacion | NO: 1 (AR2405950) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2405950) |
| modo | SEGUN SE INDICA: 1 (AR2405950) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 225 × 140 | 5,5; 48,5; 92,5; 135,5 | 5,5; 48,5; 92,5; 135,5 | 5; 47; 90; 134; 178; 220 |  AR2405950; OT/2024/AR2405950.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405950. |

### FACENDA O AGRO BAIXA LIMIA S.L — 054059

Ficha: `facenda-o-agro-baixa-limia-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600570). Nombres/alias del histórico: FACENDA O AGRO BAIXA LIMIA S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 240 × 140 | BE2600570 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### FERNANDEZ BARRO, PEDRO — 050818

Ficha: `fernandez-barro-pedro`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400243). Nombres/alias del histórico: FERNANDEZ BARRO, PEDRO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 257 × 150 | BE2400243 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### FERNANDEZ CALVO, MANUEL — 053179

Ficha: `fernandez-calvo-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504541). Nombres/alias del histórico: FERNANDEZ CALVO, MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2504541) |
| recogeDelante | NO: 1 (AR2504541) |
| recogeAtras | GOMA: 1 (AR2504541) |
| bastillaEnfundar | NO: 1 (AR2504541) |
| ventana | SÍ: 1 (AR2504541) |
| rotulacion | NO: 1 (AR2504541) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2504541) |
| modo | SEGUN SE INDICA: 1 (AR2504541) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 228,5 × 148 | 5; 15; 45; 75; 110; 134 | 5; 15; 45; 75; 110; 134 | 5; 15; 60; 90; 117; 145; 175; 200; 223 |  AR2504541; OT/2025/AR2504541.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504541. |

### FERNANDEZ DE LA LLAVE, LUIS MIGUEL — 054425

Ficha: `fernandez-de-la-llave-luis-miguel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2604390). Nombres/alias del histórico: FERNANDEZ DE LA LLAVE, LUIS MIGUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 176 × 126 | AR2604390 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604390.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### FERNANDEZ DIAZ, JOSE RAMON — 012790

Ficha: `fernandez-diaz-jose-ramon`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2501008). Nombres/alias del histórico: FERNANDEZ DIAZ, JOSE RAMON.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2501008) |
| recogeDelante | NO: 1 (AR2501008) |
| recogeAtras | GOMA: 1 (AR2501008) |
| bastillaEnfundar | NO: 1 (AR2501008) |
| ventana | NO: 1 (AR2501008) |
| rotulacion | NO: 1 (AR2501008) |
| material | LONA ALPHA 1L 580  :NEGRO :250 AN: 1 (AR2501008) |
| modo | SEGUN SE INDICA: 1 (AR2501008) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 200 × 125 | 9,5; 33; 62; 91; 115,5 | 9,5; 33; 62; 91; 115,5 | 8; 31; 62; 94; 126; 158; 187,5 |  AR2501008; OT/2025/AR2501008.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501008. |

### FERNANDEZ FONDEVILA, CARLOS — 050653

Ficha: `fernandez-fondevila-carlos`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400350). Nombres/alias del histórico: FERNANDEZ FONDEVILA, CARLOS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2400350) |
| recogeDelante | NO: 1 (AR2400350) |
| recogeAtras | GOMA: 1 (AR2400350) |
| bastillaEnfundar | NO: 1 (AR2400350) |
| ventana | SÍ: 1 (AR2400350) |
| rotulacion | NO: 1 (AR2400350) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2400350) |
| modo | SEGUN SE INDICA: 1 (AR2400350) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 231 × 131 | 2,5; 8,3; 66; 123,8; 129,5 | 2,5; 7,8; 25,5; 45,5; 65,5; 85,5; 105,5; 123,8; 129,5 | 2,5; 6,3; 28,5; 60,5; 92,5; 124,5; 156,5; 188,5; 218,3; 229,5 |  AR2400350; OT/2024/AR2400350.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400350. |

### FERNANDEZ FRAGA, JOSE MANUEL — 051815

Ficha: `fernandez-fraga-jose-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400987). Nombres/alias del histórico: FERNANDEZ FRAGA, JOSE MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 110 × 140 | BE2400987 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### FERNANDEZ GOMEZ , ALBERTO — 051979

Ficha: `fernandez-gomez-alberto`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406331). Nombres/alias del histórico: FERNANDEZ GOMEZ , ALBERTO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA G650 2L 650 :VERDE RAL6026 :250 AN (M5728): 1 (AR2406331) |
| modo | REPARTIDOS: 1 (AR2406331) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 291 × 168 | 2,5; 31,7; 83,5; 124; 164,5 | 3,5; 44; 84,5; 125; 165,5 | 2,5; 43,5; 84,5; 125,5; 166,5; 207,5; 248,5; 289,5 |  AR2406331; OT/2024/AR2406331.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406331. |

### FERNANDEZ GOMEZ, JAIME — 053417

Ficha: `fernandez-gomez-jaime`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2506133). Nombres/alias del histórico: FERNANDEZ GOMEZ, JAIME.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2506133) |
| recogeDelante | NO: 1 (AR2506133) |
| recogeAtras | GOMA: 1 (AR2506133) |
| bastillaEnfundar | NO: 1 (AR2506133) |
| ventana | NO: 1 (AR2506133) |
| rotulacion | NO: 1 (AR2506133) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2506133) |
| modo | SEGUN SE INDICA: 1 (AR2506133) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 200 × 125,5 | 2,5; 45; 90; 124 | 2,5; 32; 65; 95; 124 | 2,5; 35; 70; 100; 133; 165; 198,5 |  AR2506133; OT/2025/AR2506133.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506133. |

### FERNANDEZ GONZALEZ, ORFIDIO — 053055

Ficha: `fernandez-gonzalez-orfidio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504260). Nombres/alias del histórico: FERNANDEZ GONZALEZ, ORFIDIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2504260) |
| modo | SEGUN SE INDICA: 1 (AR2504260) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 180 × 110 | 13,5; 40,5; 67,5; 96 | 13,5; 40,5; 67,5; 96 | 11,3; 33,8; 56,3; 78,8; 101,3; 123,8; 146,3; 169,3 |  AR2504260; OT/2025/AR2504260.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504260. |

### FERNANDEZ VILELA, LUIS — 038983

Ficha: `fernandez-vilela-luis`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600495). Nombres/alias del histórico: FERNANDEZ VILELA, LUIS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 150 × 101 | BE2600495 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### FERREIRA FABEIRO, ROBERTO — 054382

Ficha: `ferreira-fabeiro-roberto`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2604206). Nombres/alias del histórico: FERREIRA FABEIRO, ROBERTO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA G650 2L 650 :GRIS RAL7037 :250 AN (M5736): 1 (AR2604206) |
| modo | SEGUN SE INDICA: 1 (AR2604206) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 175 × 115 | 10; 38; 79,1; 107,5 | 8; 26,5; 58; 89,5; 108 | 5; 27; 65; 99; 140; 167 |  AR2604206; OT/2026/AR2604206.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2604206. |

### FERRO AMEAL, FAUSTINO — 053364

Ficha: `ferro-ameal-faustino`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505792). Nombres/alias del histórico: FERRO AMEAL, FAUSTINO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 150 × 115 | AR2505792 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2505792.dwg; OT/2025/AR2505792.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### FERRODEIRO, S.L. — 052636

Ficha: `ferrodeiro-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2502519). Nombres/alias del histórico: FERRODEIRO, S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2502519) |
| recogeDelante | NO: 1 (AR2502519) |
| recogeAtras | GOMA: 1 (AR2502519) |
| bastillaEnfundar | NO: 1 (AR2502519) |
| ventana | SÍ: 1 (AR2502519) |
| rotulacion | NO: 1 (AR2502519) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2502519) |
| modo | REPARTIDOS: 1 (AR2502519) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 160 × 125 | 2,5; 32,8; 63; 93,3; 123,5 | 2,5; 32,8; 63; 93,3; 123,5 | 2,5; 33,7; 64,9; 96,1; 127,3; 158,5 |  AR2502519; OT/2025/AR2502519.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502519. |

### FREIRE FERNANDEZ, MANUEL — 038568

Ficha: `freire-fernandez-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500087). Nombres/alias del histórico: FREIRE FERNANDEZ, MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 260 × 160 | BE2500087 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### FRICUR INSTALACIONES, S.L. — 043449

Ficha: `fricur-instalaciones-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600353). Nombres/alias del histórico: FRICUR INSTALACIONES, S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 260 × 161 | BE2600353 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### GANADERIA PARDO, S. C. — 023233

Ficha: `ganaderia-pardo-s-c`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505854). Nombres/alias del histórico: GANADERIA PARDO, S. C..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 200 × 125,5 | AR2505854 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2505854.dwg; OT/2025/AR2505854.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### GANADERIA RON, S.C. — 054259

Ficha: `ganaderia-ron-s-c`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2603663). Nombres/alias del histórico: GANADERIA RON, S.C..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 273 × 150 | AR2603663 | Modelo de ganado; fuera de FichaCliente. OT/2026/AR2603663.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### GANDARA LEMA, DAVID — 051947

Ficha: `gandara-lema-david`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406159). Nombres/alias del histórico: GANDARA LEMA, DAVID.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2406159) |
| recogeDelante | GOMA: 1 (AR2406159) |
| recogeAtras | GOMA: 1 (AR2406159) |
| bastillaEnfundar | NO: 1 (AR2406159) |
| ventana | NO: 1 (AR2406159) |
| rotulacion | NO: 1 (AR2406159) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2406159) |
| modo | SEGUN SE INDICA: 1 (AR2406159) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 206 × 127 | 7; 31; 64,5; 97; 120,3 | 7; 31; 64,5; 97; 120,3 | 7; 29; 58,8; 88,3; 118; 148; 178; 200 |  AR2406159; OT/2024/AR2406159.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406159. |

### GARCIA MORIS, SONIA — 053233

Ficha: `garcia-moris-sonia`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505196). Nombres/alias del histórico: GARCIA MORIS, SONIA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2505196) |
| recogeDelante | NO: 1 (AR2505196) |
| recogeAtras | CREMALLERA: 1 (AR2505196) |
| bastillaEnfundar | NO: 1 (AR2505196) |
| ventana | NO: 1 (AR2505196) |
| rotulacion | NO: 1 (AR2505196) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2505196) |
| modo | SEGUN SE INDICA: 1 (AR2505196) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 161,5 × 120 | 6,5; 36,5; 83,5; 114 | 6,5; 36,5; 83,5; 114 | 8,8; 39; 83; 126,5; 155 |  AR2505196; OT/2025/AR2505196.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505196. |

### GARCIA SECO, REGINO — 028190

Ficha: `garcia-seco-regino`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500609). Nombres/alias del histórico: GARCIA SECO, REGINO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 302 × 151 | BE2500609 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### GAREA FERNANDEZ, JOSE — 051526

Ficha: `garea-fernandez-jose`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2404260). Nombres/alias del histórico: GAREA FERNANDEZ, JOSE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| recogeDelante | NO: 1 (AR2404260) |
| recogeAtras | GOMA: 1 (AR2404260) |
| bastillaEnfundar | NO: 1 (AR2404260) |
| ventana | SÍ: 1 (AR2404260) |
| rotulacion | NO: 1 (AR2404260) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2404260) |
| modo | SEGUN SE INDICA: 1 (AR2404260) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 176 × 110 | 10; 37,3; 72,2; 101 | 10; 37,3; 72,2; 101 | 6; 16; 60; 117,5; 162 |  AR2404260; OT/2024/ar2404260.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404260. |

### GARRIDO GOMEZ, JOSEP DONAT — 054360

Ficha: `garrido-gomez-josep-donat`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2604095). Nombres/alias del histórico: GARRIDO GOMEZ, JOSEP DONAT.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 11 × 92 | AR2604095 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604095.dwg; OT/2026/AR2604095.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### GIS CERCEDA S.L.U — 053748

Ficha: `gis-cerceda-s-l-u`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600342). Nombres/alias del histórico: GIS CERCEDA S.L.U.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 210 × 129 | BE2600342 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### GOLPE ROMERO, BERNARDO — 006406

Ficha: `golpe-romero-bernardo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400372). Nombres/alias del histórico: GOLPE ROMERO, BERNARDO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 240 × 160 | BE2400372 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### GOMEZ ALAMANCOS, TERESA — 017592

Ficha: `gomez-alamancos-teresa`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2401982). Nombres/alias del histórico: GOMEZ ALAMANCOS, TERESA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 04: 1 (AR2401982) |
| recogeDelante | NO: 1 (AR2401982) |
| recogeAtras | PUENTES ESVA: 1 (AR2401982) |
| bastillaEnfundar | NO: 1 (AR2401982) |
| ventana | NO: 1 (AR2401982) |
| rotulacion | NO: 1 (AR2401982) |
| material | LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2401982) |
| modo | SEGUN SE INDICA: 1 (AR2401982) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 140 × 108,5 | 5; 37; 73; 106 | 5; 33; 70; 106 | 5; 10; 45; 95; 131,5; 136,5 |  AR2401982; OT/2024/AR2401982.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401982. |

### GOMEZ CAMINO, LUCIA — 020641

Ficha: `gomez-camino-lucia`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400960). Nombres/alias del histórico: GOMEZ CAMINO, LUCIA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 310 × 172 | AR2400960 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2400960.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### GOMEZ DOMINGUEZ, MIGUEL — 053409

Ficha: `gomez-dominguez-miguel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2506111). Nombres/alias del histórico: GOMEZ DOMINGUEZ, MIGUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 200 × 126 | AR2506111 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2506111.dwg; OT/2025/AR2506111.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### GOMEZ GARCIA, JOSE ANTONIO — 053940

Ficha: `gomez-garcia-jose-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600467). Nombres/alias del histórico: GOMEZ GARCIA, JOSE ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 225 × 125 | BE2600467 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### GOMEZ OTERO, ANTONIO — 038642

Ficha: `gomez-otero-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600460). Nombres/alias del histórico: GOMEZ OTERO, ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 270 × 150 | BE2600460 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### GOMEZ PAZOS, JUAN — 051552

Ficha: `gomez-pazos-juan`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2404366). Nombres/alias del histórico: GOMEZ PAZOS, JUAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| recogeDelante | NO: 1 (AR2404366) |
| recogeAtras | GOMA: 1 (AR2404366) |
| bastillaEnfundar | NO: 1 (AR2404366) |
| ventana | SÍ: 1 (AR2404366) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2404366) |
| modo | SEGUN SE INDICA: 1 (AR2404366) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 175 × 115 | 36,5; 79,5 | 25; 58; 90 | 5; 27; 66; 103; 141; 166 |  AR2404366; OT/2024/AR2404366.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404366. |

### GONZALEZ AGRASAR, SUSANA — 051056

Ficha: `gonzalez-agrasar-susana`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2402296). Nombres/alias del histórico: GONZALEZ AGRASAR, SUSANA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2402296) |
| modo | SEGUN SE INDICA: 1 (AR2402296) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 180 × 110 | 10; 38; 73,5; 101 | 10; 38; 73,5; 101 | 10; 32,5; 67,5; 112,5; 148; 171 |  AR2402296; OT/2024/AR2402296.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402296. |

### GONZALEZ DE ALEDO GOMEZ, ALVARO — 052015

Ficha: `gonzalez-de-aledo-gomez-alvaro`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406616). Nombres/alias del histórico: GONZALEZ DE ALEDO GOMEZ, ALVARO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 305 × 175 | AR2406616 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2406616.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### GONZALEZ DOPAZO, JOSE MANUEL — 053469

Ficha: `gonzalez-dopazo-jose-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2506445). Nombres/alias del histórico: GONZALEZ DOPAZO, JOSE MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2506445) |
| modo | SEGUN SE INDICA: 1 (AR2506445) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 163 × 110 | 2,5; 37,8; 73,2; 108,5 | 2,5; 37,8; 73,2; 108,5 | 2,5; 34,3; 66,1; 97,9; 129,7; 161,5 |  AR2506445; OT/2025/AR2506445.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506445. |

### GONZALEZ HERMIDA, DAVID — 036339

Ficha: `gonzalez-hermida-david`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400239). Nombres/alias del histórico: GONZALEZ HERMIDA, DAVID.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2400239) |
| recogeDelante | NO: 1 (AR2400239) |
| recogeAtras | GOMA: 1 (AR2400239) |
| bastillaEnfundar | NO: 1 (AR2400239) |
| ventana | SÍ: 1 (AR2400239) |
| rotulacion | NO: 1 (AR2400239) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2400239) |
| modo | SEGUN SE INDICA: 1 (AR2400239) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 140 × 100 | 2,5; 34,5; 66,5; 98,5 | 2,5; 34,5; 66,5; 98,5 | 2,5; 36,5; 70,5; 104,5; 138,5 |  AR2400239; OT/2024/AR2400239.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400239. |

### GONZALEZ TORRES, JOSE — 051093

Ficha: `gonzalez-torres-jose`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2402422). Nombres/alias del histórico: GONZALEZ TORRES, JOSE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 260 × 150 | AR2402422 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### HERTRANS, SDAD. COOP. LTDA. — 001510

Ficha: `hertrans-sdad-coop-ltda`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2501169). Nombres/alias del histórico: HERTRANS, SDAD. COOP. LTDA..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 350 × 151 | BE2501169 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### IBABRE, BALOIRAS BREA IVAN — 033454

Ficha: `ibabre-baloiras-brea-ivan`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2402595). Nombres/alias del histórico: IBABRE, BALOIRAS BREA IVAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| recogeDelante | NO: 1 (AR2402595) |
| recogeAtras | GOMA: 1 (AR2402595) |
| bastillaEnfundar | NO: 1 (AR2402595) |
| ventana | NO: 1 (AR2402595) |
| rotulacion | NO: 1 (AR2402595) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2402595) |
| modo | SEGUN SE INDICA: 1 (AR2402595) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 199,5 × 124,5 | 10; 45; 80; 115,5 | 10; 50; 80; 110 | 2,5; 15; 40; 70; 100; 130; 160; 198 |  AR2402595; OT/2024/AR2402595.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402595. |

### INFORMACION & COMUNICACION LOCAL S.A. (INCOLSA) — 006397

Ficha: `informacion-comunicacion-local-s-a-incolsa`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2407078). Nombres/alias del histórico: INFORMACION & COMUNICACION LOCAL S.A. (INCOLSA).

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 250 × 143 | AR2407078 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### JIMENEZ CALIZ HNOS., S.L. — 016071

Ficha: `jimenez-caliz-hnos-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600682). Nombres/alias del histórico: JIMENEZ CALIZ HNOS., S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2600682) |
| recogeDelante | NO: 1 (AR2600682) |
| recogeAtras | VELCRO: 1 (AR2600682) |
| bastillaEnfundar | SÍ: 1 (AR2600682) |
| ventana | NO: 1 (AR2600682) |
| rotulacion | NO: 1 (AR2600682) |
| material | LONA MONZA 1 L 580 G/M2: GRIS RAL 7037: 250 AN: 1 (AR2600682) |
| modo | SEGUN SE INDICA: 1 (AR2600682) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 400 × 200 | 4,5; 42,7; 81,3; 119,7; 158,1; 196,5 | 4,5; 42,7; 81,3; 119,7; 158,1; 196,5 | 4,5; 43,7; 82,9; 122,1; 161,3; 200,5; 239,7; 278,9; 318,1; 357,3; 396,5 |  AR2600682; OT/2026/AR2600682.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600682. |

### LACTEOS TERRA DE MELIDE, S. L. , — 004338

Ficha: `lacteos-terra-de-melide-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2506342). Nombres/alias del histórico: LACTEOS TERRA DE MELIDE, S. L. ,.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 1 (AR2506342) |
| recogeDelante | NO: 1 (AR2506342) |
| recogeAtras | GOMA: 1 (AR2506342) |
| bastillaEnfundar | NO: 1 (AR2506342) |
| ventana | NO: 1 (AR2506342) |
| rotulacion | NO: 1 (AR2506342) |
| material | LONA ALPHA 1L 580 :AMARILLO RAL1018 :250 AN: 1 (AR2506342) |
| modo | REPARTIDOS: 1 (AR2506342) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 193,5 × 109,5 | 2,5; 37,7; 72,8; 108 | 2,5; 37,7; 72,8; 108 | 2,5; 34,1; 65,7; 97,3; 128,8; 160,4; 192 |  AR2506342; OT/2025/AR2506342.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506342. |

### LAGO CASAL, FRANCISCO — 022314

Ficha: `lago-casal-francisco`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406910). Nombres/alias del histórico: LAGO CASAL, FRANCISCO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2406910) |
| recogeDelante | NO: 1 (AR2406910) |
| recogeAtras | VELCRO: 1 (AR2406910) |
| bastillaEnfundar | NO: 1 (AR2406910) |
| ventana | NO: 1 (AR2406910) |
| rotulacion | NO: 1 (AR2406910) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2406910) |
| modo | REPARTIDOS: 1 (AR2406910) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 230 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,8; 67,1; 99,4; 131,7; 164; 196,2; 228,5 |  AR2406910; OT/2024/AR2406910.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406910. |

### LAVANDERIA AXIÑA S.L — 053222

Ficha: `lavanderia-axina-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500989). Nombres/alias del histórico: LAVANDERIA AXIÑA S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 160 × 110 | BE2500989 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### LAZITURRI, S.L. — 054263

Ficha: `laziturri-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2603682). Nombres/alias del histórico: LAZITURRI, S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA LAC 640 2L 640GR :BLANCO RAL9010 :250 AN: 1 (AR2603682) |
| modo | SEGUN SE INDICA: 1 (AR2603682) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 150 × 100 | 2,5; 98,5 | 2,5; 98,5 | 6; 145 |  AR2603682; OT/2026/AR2603682.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603682. |

### LEIRAS INSUA, YOLANDA — 052448

Ficha: `leiras-insua-yolanda`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2501754). Nombres/alias del histórico: LEIRAS INSUA, YOLANDA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| recogeDelante | NO: 1 (AR2501754) |
| recogeAtras | GOMA: 1 (AR2501754) |
| bastillaEnfundar | NO: 1 (AR2501754) |
| ventana | NO: 1 (AR2501754) |
| rotulacion | NO: 1 (AR2501754) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2501754) |
| modo | SEGUN SE INDICA: 1 (AR2501754) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 150 × 108 | 10; 26; 76; 99 | 10; 26; 76; 99 | 5; 25; 75; 125; 146 |  AR2501754; OT/2025/AR2501754.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501754. |

### LIBRERIA SIGLO XXI · MRV CONSTRUCCIONES SAN MIGUEL  S.L — 052508

Ficha: `libreria-siglo-xxi-mrv-construcciones-san-miguel-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2501981). Nombres/alias del histórico: LIBRERIA SIGLO XXI · MRV CONSTRUCCIONES SAN MIGUEL  S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2501981) |
| modo | SEGUN SE INDICA: 1 (AR2501981) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 180,5 × 121 | 22,5; 40,5; 81,5; 119,5 | 2,5; 40,5; 81,5; 119,5 | 2,5; 34,2; 62,5; 90,8; 119,1; 147,4; 179 |  AR2501981; OT/2025/AR2501981-2.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501981. |

### LOPEZ BARCALA, CESAR — 039696

Ficha: `lopez-barcala-cesar`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400199). Nombres/alias del histórico: LOPEZ BARCALA, CESAR.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2400199) |
| recogeDelante | NO: 1 (AR2400199) |
| recogeAtras | GOMA: 1 (AR2400199) |
| bastillaEnfundar | NO: 1 (AR2400199) |
| ventana | NO: 1 (AR2400199) |
| rotulacion | NO: 1 (AR2400199) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2400199) |
| modo | SEGUN SE INDICA: 1 (AR2400199) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 260 × 180 | 2,5; 39,5; 73,5; 106,5; 139,5; 178,5 | 2,5; 26,5; 58,5; 93,5; 127,5; 157,5; 178,5 | 2,5; 30,5; 62,5; 93,5; 124,5; 157,5; 189,5; 222,5; 258,5 |  AR2400199; OT/2024/AR2400199.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400199. |

### LOPEZ CARBALLAL, GUILLERMO — 010815

Ficha: `lopez-carballal-guillermo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600204). Nombres/alias del histórico: LOPEZ CARBALLAL, GUILLERMO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 220 × 130 | BE2600204 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### LOPEZ PRADO, ROBERTO CARLOS — 050840

Ficha: `lopez-prado-roberto-carlos`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2401457). Nombres/alias del histórico: LOPEZ PRADO, ROBERTO CARLOS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 204 × 87 | AR2401457 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2401457.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### LOPEZ REGUEIRA, JUAN — 017555

Ficha: `lopez-regueira-juan`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2401009). Nombres/alias del histórico: LOPEZ REGUEIRA, JUAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 162 × 99 | BE2401009 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### LOPEZ VAAMONDE, RICARDO PEDRO — 052864

Ficha: `lopez-vaamonde-ricardo-pedro`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2503441). Nombres/alias del histórico: LOPEZ VAAMONDE, RICARDO PEDRO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 171 × 1133 | AR2503441 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2503441.dwg; OT/2025/AR2503441.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### LOPEZ VALIN, ANGELES — 051650

Ficha: `lopez-valin-angeles`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400828). Nombres/alias del histórico: LOPEZ VALIN, ANGELES.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 176 × 113 | BE2400828 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### LOPEZ VIANA, OSCAR — 053477

Ficha: `lopez-viana-oscar`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2506477). Nombres/alias del histórico: LOPEZ VIANA, OSCAR.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2506477) |
| recogeDelante | NO: 1 (AR2506477) |
| recogeAtras | GOMA: 1 (AR2506477) |
| bastillaEnfundar | NO: 1 (AR2506477) |
| ventana | SÍ: 1 (AR2506477) |
| rotulacion | NO: 1 (AR2506477) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2506477) |
| modo | SEGUN SE INDICA: 1 (AR2506477) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 210 × 120 | 6; 26; 60; 94; 114,5 | 11; 41,3; 79,8; 110 | 9,5; 37; 72; 106,5; 140,5; 173,5; 200,5 |  AR2506477; OT/2025/AR2506477.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2506477. |

### LORENZO BARBEITO, JOSE SALVADOR — 050688

Ficha: `lorenzo-barbeito-jose-salvador`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400117). Nombres/alias del histórico: LORENZO BARBEITO, JOSE SALVADOR.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 255 × 160 | BE2400117 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### LOSADA GOMEZ, ALEJANDRO — 051435

Ficha: `losada-gomez-alejandro`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400653). Nombres/alias del histórico: LOSADA GOMEZ, ALEJANDRO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 206 × 120 | BE2400653 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### MACERO MONTAÑEZ, JESUS — 054454

Ficha: `macero-montanez-jesus`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por histórico (AR2604519). Nombres/alias del histórico: MACERO MONTAÑEZ, JESUS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 185 × 125 | AR2604519 | Sin los tres lados acreditados sobre la lona hecha. OT/2026/AR2604519.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### MADERA CHIQUILLO S.L — 053586

Ficha: `madera-chiquillo-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600156). Nombres/alias del histórico: MADERA CHIQUILLO S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 200 × 130 | BE2600156 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### MADERAS JORGE REY S.L. — 048540

Ficha: `maderas-jorge-rey-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406680). Nombres/alias del histórico: MADERAS JORGE REY S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2406680) |
| recogeDelante | NO: 1 (AR2406680) |
| recogeAtras | GOMA: 1 (AR2406680) |
| bastillaEnfundar | NO: 1 (AR2406680) |
| ventana | SÍ: 1 (AR2406680) |
| rotulacion | NO: 1 (AR2406680) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2406680) |
| modo | SEGUN SE INDICA: 1 (AR2406680) |

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 271 × 174 | AR2406680 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2406680.dwg; OT/2024/AR2406680.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### MAGARIÑOS VILLAR, JAVIER — 023117

Ficha: `magarinos-villar-javier`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2402953). Nombres/alias del histórico: MAGARIÑOS VILLAR, JAVIER.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 203,5 × 157,5 | AR2402953 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |

### MAHIA FREIRE, JOSE — 051879

Ficha: `mahia-freire-jose`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405834). Nombres/alias del histórico: MAHIA FREIRE, JOSE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2405834) |
| recogeDelante | NO: 1 (AR2405834) |
| recogeAtras | GOMA: 1 (AR2405834) |
| bastillaEnfundar | NO: 1 (AR2405834) |
| ventana | SÍ: 1 (AR2405834) |
| rotulacion | NO: 1 (AR2405834) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2405834) |
| modo | SEGUN SE INDICA: 1 (AR2405834) |

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 175,5 × 112,5 | AR2405834 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2405834.dwg; OT/2024/AR2405834.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### MARCOS OJEDA, SIMON — 053172

Ficha: `marcos-ojeda-simon`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504838). Nombres/alias del histórico: MARCOS OJEDA, SIMON.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :NEGRO :250 AN: 1 (AR2504838) |
| modo | SEGUN SE INDICA: 1 (AR2504838) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 302,5 × 161 | 15,5; 43,5; 68,5; 93,5; 118,5; 146,5 | 15,5; 43,5; 68,5; 93,5; 118,5; 146,5 | 7,5; 30; 60; 90; 120; 150,5; 181; 211; 241; 271; 294,8 |  AR2504838; OT/2025/AR2504838.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504838. |

### MARTINEZ GARRIDO, ALBERTO — 053509

Ficha: `martinez-garrido-alberto`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600170). Nombres/alias del histórico: MARTINEZ GARRIDO, ALBERTO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 185 × 155 | AR2600170 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |

### MARTINEZ LORENZO, RAIMUNDO — 052013

Ficha: `martinez-lorenzo-raimundo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406570). Nombres/alias del histórico: MARTINEZ LORENZO, RAIMUNDO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2406570) |
| modo | SEGUN SE INDICA: 1 (AR2406570) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 160,5 × 120 | 6; 10; 40; 80; 110,5 | 6; 10; 40; 80; 110,5 | 7,5; 35,5; 80,5; 125; 153,3 |  AR2406570; OT/2024/AR2406570.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406570. |

### MATIAS VAQUERIZO, MARIO — 051916

Ficha: `matias-vaquerizo-mario`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405969). Nombres/alias del histórico: MATIAS VAQUERIZO, MARIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2405969) |
| recogeDelante | GOMA: 1 (AR2405969) |
| recogeAtras | GOMA: 1 (AR2405969) |
| bastillaEnfundar | SÍ: 1 (AR2405969) |
| ventana | NO: 1 (AR2405969) |
| rotulacion | NO: 1 (AR2405969) |
| material | LONA ALPHA 1L 580  :NEGRO :250 AN: 1 (AR2405969) |
| modo | REPARTIDOS: 1 (AR2405969) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 320 × 180 | 10; 36,8; 63,7; 90,5; 117,3; 144,2; 171 | 10; 36,8; 63,7; 90,5; 117,3; 144,2; 171 | 22,55; 47,65; 72,75; 97,85; 122,85; 147,95; 173,05; 198,15; 223,25; 248,35; 273,35; 298,45 |  AR2405969; OT/2024/AR2405969.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405969. |

### MEDANCLI S.L — 053269

Ficha: `medancli-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2501030). Nombres/alias del histórico: MEDANCLI S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 230 × 140 | BE2501030 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### MENDEZ VILAS, DIEGO — 052258

Ficha: `mendez-vilas-diego`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2500716). Nombres/alias del histórico: MENDEZ VILAS, DIEGO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 357 × 176,5 | AR2500716 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2500716.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### METALES JAIFER, S.L. — 041356

Ficha: `metales-jaifer-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406695). Nombres/alias del histórico: METALES JAIFER, S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2406695) |
| recogeDelante | NO: 1 (AR2406695) |
| recogeAtras | GOMA: 1 (AR2406695) |
| bastillaEnfundar | NO: 1 (AR2406695) |
| ventana | SÍ: 1 (AR2406695) |
| rotulacion | SI: 1 (AR2406695) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2406695) |
| modo | SEGUN SE INDICA: 1 (AR2406695) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 206 × 140 | 17; 70; 124 | 17; 70; 124 | 12; 63,5; 143; 195 |  AR2406695; OT/2024/AR2406695.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406695. |

### MONTAJES ELECTRICOS TIBAR, S. L. — 027577

Ficha: `montajes-electricos-tibar-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2401042). Nombres/alias del histórico: MONTAJES ELECTRICOS TIBAR, S. L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 260 × 140 | BE2401042 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### MONTERO PINTOR, ANTONIO MANUEL — 052016

Ficha: `montero-pintor-antonio-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2401206). Nombres/alias del histórico: MONTERO PINTOR, ANTONIO MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 270 × 160 | BE2401206 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### MORADA  ALCANTARA, ANTONIO — 036277

Ficha: `morada-alcantara-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504136). Nombres/alias del histórico: MORADA  ALCANTARA, ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2504136) |
| recogeDelante | PUENTES ESVA: 1 (AR2504136) |
| recogeAtras | PUENTES ESVA: 1 (AR2504136) |
| bastillaEnfundar | NO: 1 (AR2504136) |
| ventana | NO: 1 (AR2504136) |
| rotulacion | NO: 1 (AR2504136) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2504136) |
| modo | SEGUN SE INDICA: 1 (AR2504136) |

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 312 × 160,5 | AR2504136 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2504136.dwg; OT/2025/AR2504136.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### MORANDEIRA PEREZ, DAVID — 052029

Ficha: `morandeira-perez-david`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406615). Nombres/alias del histórico: MORANDEIRA PEREZ, DAVID.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2406615) |
| recogeDelante | NO: 1 (AR2406615) |
| recogeAtras | GOMA: 1 (AR2406615) |
| bastillaEnfundar | NO: 1 (AR2406615) |
| ventana | SÍ: 1 (AR2406615) |
| rotulacion | SÍ: 1 (AR2406615) |
| material | LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2406615) |
| modo | SEGUN SE INDICA: 1 (AR2406615) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 170 × 115,5 | 12,25; 43,25; 73,25; 104,25 | 3; 39; 75; 110 | 3; 16; 46; 76,5; 107; 137; 168 |  AR2406615; OT/2024/AR2406615.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406615. |

### MUÑIZ LAMPON, JUAN ANTONIO — 050740

Ficha: `muniz-lampon-juan-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400806). Nombres/alias del histórico: MUÑIZ LAMPON, JUAN ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 153 × 160 | AR2400806 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400806.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### NUÑEZ BARRAL, CARLOS — 051391

Ficha: `nunez-barral-carlos`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400625). Nombres/alias del histórico: NUÑEZ BARRAL, CARLOS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 180 × 110 | BE2400625 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### ORMAECHEA PADILLA, CRISTINA — 053594

Ficha: `ormaechea-padilla-cristina`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600663). Nombres/alias del histórico: ORMAECHEA PADILLA, CRISTINA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 305 × 154 | AR2600663 | Modelo de ganado; fuera de FichaCliente. OT/2026/AR2600663.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### PANADERIA VEIGANOVA · PEREZ BREA, MARIA JESUS — 030107

Ficha: `panaderia-veiganova-perez-brea-maria-jesus`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2602498). Nombres/alias del histórico: PANADERIA VEIGANOVA · PEREZ BREA, MARIA JESUS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 170 × 125,5 | AR2602498 | Sin los tres lados acreditados sobre la lona hecha. ; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### PARADA SANCHEZ, JOSE FERNANDO — 051693

Ficha: `parada-sanchez-jose-fernando`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2404925). Nombres/alias del histórico: PARADA SANCHEZ, JOSE FERNANDO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 1 (AR2404925) |
| recogeDelante | CREMALLERA: 1 (AR2404925) |
| recogeAtras | CREMALLERA: 1 (AR2404925) |
| bastillaEnfundar | NO: 1 (AR2404925) |
| ventana | NO: 1 (AR2404925) |
| rotulacion | NO: 1 (AR2404925) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2404925) |
| modo | SEGUN SE INDICA: 1 (AR2404925) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 242 × 135 | 5; 45; 91; 131 | 5; 45; 91; 131 | 10; 46; 82; 121,5; 161; 197; 233 |  AR2404925; OT/2024/AR2404925.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2404925. |

### PARGA GONZALEZ, ALVARO — 052235

Ficha: `parga-gonzalez-alvaro`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500160). Nombres/alias del histórico: PARGA GONZALEZ, ALVARO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 200 × 134 | BE2500160 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### PAZOS LEIRO, JULIO CESAR — 051957

Ficha: `pazos-leiro-julio-cesar`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406205). Nombres/alias del histórico: PAZOS LEIRO, JULIO CESAR.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2406205) |
| modo | SEGUN SE INDICA: 1 (AR2406205) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 225,5 × 145 | 16; 71; 128,5 | 16; 71; 128,5 | 20; 65; 112,5; 161,5; 207,3 |  AR2406205; OT/2024/AR2406205.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406205. |

### PAZOS PIAY, MARCIAL — 032691

Ficha: `pazos-piay-marcial`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405050). Nombres/alias del histórico: PAZOS PIAY, MARCIAL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2405050) |
| recogeDelante | NO: 1 (AR2405050) |
| recogeAtras | GOMA: 1 (AR2405050) |
| bastillaEnfundar | NO: 1 (AR2405050) |
| ventana | NO: 1 (AR2405050) |
| rotulacion | NO: 1 (AR2405050) |
| material | LONA G650 2L 650 :GRIS RAL7037 :250 AN (M5736): 1 (AR2405050) |
| modo | SEGUN SE INDICA: 1 (AR2405050) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 220 × 130 | 6; 34; 65; 96; 123 | 6; 34; 65; 96; 123 | 10; 34; 72; 110; 147; 185; 210 |  AR2405050; OT/2024/AR2405050.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405050. |

### PEDREIRA TASENDE, IGNACIO — 051674

Ficha: `pedreira-tasende-ignacio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400852). Nombres/alias del histórico: PEDREIRA TASENDE, IGNACIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 276 × 150 | BE2400852 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### PEDREIRA, ANTONIO — 017858

Ficha: `pedreira-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500972). Nombres/alias del histórico: PEDREIRA, ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 260 × 140 | BE2500972 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### PENA LOPEZ, JOSE FRANCISCO — 050647

Ficha: `pena-lopez-jose-francisco`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400072). Nombres/alias del histórico: PENA LOPEZ, JOSE FRANCISCO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 230 × 130 | BE2400072 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### PEREZ HERMIDA, JOSE MANUEL — 046705

Ficha: `perez-hermida-jose-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400434). Nombres/alias del histórico: PEREZ HERMIDA, JOSE MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 233 × 125 | BE2400434 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### PEREZ LOPEZ, JOSE MARIA — 053690

Ficha: `perez-lopez-jose-maria`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601199). Nombres/alias del histórico: PEREZ LOPEZ, JOSE MARIA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 220 × 160 | AR2601199 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |

### PIÑEIRO BALAY, SANTIAGO — 050726

Ficha: `pineiro-balay-santiago`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400151). Nombres/alias del histórico: PIÑEIRO BALAY, SANTIAGO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 230 × 130 | BE2400151 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### PIÑON PUMA, OSCAR — 052640

Ficha: `pinon-puma-oscar`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2502271). Nombres/alias del histórico: PIÑON PUMA, OSCAR.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2502271) |
| recogeDelante | PUENTES ESVA: 1 (AR2502271) |
| recogeAtras | PUENTES ESVA: 1 (AR2502271) |
| bastillaEnfundar | NO: 1 (AR2502271) |
| ventana | NO: 1 (AR2502271) |
| rotulacion | NO: 1 (AR2502271) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2502271) |
| modo | SEGUN SE INDICA: 1 (AR2502271) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 209,5 × 129 | 2,5; 34; 66; 96; 127,5 | 2,5; 34; 66; 96; 127,5 | 2,5; 30; 60; 90; 120; 150; 180; 208 |  AR2502271; OT/2025/AR2502271.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502271. |

### PORTOS FERNANDEZ, CESAREO — 018638

Ficha: `portos-fernandez-cesareo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2500598). Nombres/alias del histórico: PORTOS FERNANDEZ, CESAREO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2500598) |
| recogeDelante | NO: 1 (AR2500598) |
| recogeAtras | GOMA: 1 (AR2500598) |
| bastillaEnfundar | NO: 1 (AR2500598) |
| ventana | NO: 1 (AR2500598) |
| rotulacion | NO: 1 (AR2500598) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2500598) |
| modo | REPARTIDOS: 1 (AR2500598) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 248 × 126 | 2,5; 33; 63,5; 94; 124,5 | 2,5; 33; 63,5; 94; 124,5 | 2,5; 37,4; 72,2; 107,1; 141,9; 176,8; 211,7; 246,5 |  AR2500598; OT/2025/AR2500598.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500598. |

### POSE CANOSA, MANUEL — 051067

Ficha: `pose-canosa-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400415). Nombres/alias del histórico: POSE CANOSA, MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 220 × 130 | BE2400415 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### POSE DEAN, FRANCISCO — 053772

Ficha: `pose-dean-francisco`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601559). Nombres/alias del histórico: POSE DEAN, FRANCISCO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2601559) |
| recogeDelante | NO: 1 (AR2601559) |
| recogeAtras | GOMA: 1 (AR2601559) |
| bastillaEnfundar | NO: 1 (AR2601559) |
| ventana | SÍ: 1 (AR2601559) |
| rotulacion | NO: 1 (AR2601559) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2601559) |
| modo | SEGUN SE INDICA: 1 (AR2601559) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 150 × 110 | 7; 39; 72; 104 | 5,5; 25,5; 55,5; 85,5; 105,5 | 5,5; 25,5; 55,5; 85,5; 115,5; 145,5 |  AR2601559; OT/2026/AR2601559.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601559. |

### PRIETO CUBA,TOMAS — 044989

Ficha: `prieto-cuba-tomas`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2401272). Nombres/alias del histórico: PRIETO CUBA,TOMAS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 300 × 160 | BE2401272 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### PRIETO VILARIÑO, CRISTIAN — 052398

Ficha: `prieto-vilarino-cristian`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2501521). Nombres/alias del histórico: PRIETO VILARIÑO, CRISTIAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 160 × 200 | AR2501521 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |

### PUGA SEXTO, JOSE MARIA — 050586

Ficha: `puga-sexto-jose-maria`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400030). Nombres/alias del histórico: PUGA SEXTO, JOSE MARIA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 1 (AR2400030) |
| recogeDelante | NO: 1 (AR2400030) |
| recogeAtras | GOMA: 1 (AR2400030) |
| bastillaEnfundar | NO: 1 (AR2400030) |
| ventana | NO: 1 (AR2400030) |
| rotulacion | NO: 1 (AR2400030) |
| material | LONA ALPHA 1L 580: AZUL RAL5015: 220 AN: 1 (AR2400030) |
| modo | SEGUN SE INDICA: 1 (AR2400030) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 155,5 × 100 | 8; 35; 66; 95 | 8; 35; 65; 95 | 10; 37; 66; 91; 117; 150 |  AR2400030; OT/2024/AR2400030.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400030. |

### REGO DO SANTOS · GARCIA GARCIA, VICTOR MANUEL — 016537

Ficha: `rego-do-santos-garcia-garcia-victor-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601123). Nombres/alias del histórico: REGO DO SANTOS · GARCIA GARCIA, VICTOR MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2601123) |
| recogeDelante | NO: 1 (AR2601123) |
| recogeAtras | GOMA: 1 (AR2601123) |
| bastillaEnfundar | NO: 1 (AR2601123) |
| ventana | NO: 1 (AR2601123) |
| rotulacion | SI: 1 (AR2601123) |
| material | LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2601123) |
| modo | REPARTIDOS: 1 (AR2601123) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 180 × 120 | 2,5; 41,2; 79,8; 118,5 | 2,5; 41,2; 79,8; 118,5 | 2,5; 37,7; 72,9; 108,1; 143,3; 178,5 |  AR2601123; OT/2026/AR2601123.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601123. |

### REMOLQUES DESCANSABACAS · TUX 4 SL — 049668

Ficha: `remolques-descansabacas-tux-4-sl`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400808). Nombres/alias del histórico: REMOLQUES DESCANSABACAS · TUX 4 SL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2400808) |
| recogeDelante | VELCRO: 1 (AR2400808) |
| recogeAtras | VELCRO: 1 (AR2400808) |
| ventana | NO: 1 (AR2400808) |
| rotulacion | NO: 1 (AR2400808) |
| material | LONA STARPLUS 1L 610  :BLANCO RAL9010 :300 AN: 1 (AR2400808) |
| modo | REPARTIDOS: 1 (AR2400808) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 355,5 × 206 | 2,5; 36,2; 69,8; 103,5; 137,2; 170,8; 204,5 | 2,5; 36,2; 69,8; 103,5; 137,2; 170,8; 204,5 | 2,5; 34,5; 66,4; 98,4; 130,3; 162,3; 194,2; 226,2; 258,1; 290,1; 322; 354 |  AR2400808; OT/2024/AR2400808.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400808. |

### REY LOPEZ, CESAREO — 051711

Ficha: `rey-lopez-cesareo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405005). Nombres/alias del histórico: REY LOPEZ, CESAREO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 152 × 285 | AR2405005 | Modelo de ganado; fuera de FichaCliente. OT/2024/AR2405005.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### REY MIGUEZ, DAVID — 051884

Ficha: `rey-miguez-david`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405866). Nombres/alias del histórico: REY MIGUEZ, DAVID.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2405866) |
| recogeDelante | NO: 1 (AR2405866) |
| recogeAtras | GOMA: 1 (AR2405866) |
| bastillaEnfundar | NO: 1 (AR2405866) |
| ventana | SÍ: 1 (AR2405866) |
| rotulacion | NO: 1 (AR2405866) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2405866) |
| modo | SEGUN SE INDICA: 1 (AR2405866) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 300 × 160 | 12,3; 38,8; 80,5; 121,5; 148 | 12,3; 43,3; 80,8; 118,3; 150 | 10; 33,5; 60,5; 115,8; 149,8; 183,8; 211; 238,5; 266,3; 290,5 |  AR2405866; OT/2024/AR2405866.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405866. |

### REY YAÑEZ, JULIO — 052172

Ficha: `rey-yanez-julio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500069). Nombres/alias del histórico: REY YAÑEZ, JULIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 250 × 160 | BE2500069 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### RIAL BOO, EDUARDO — 050870

Ficha: `rial-boo-eduardo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2401614). Nombres/alias del histórico: RIAL BOO, EDUARDO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2401614) |
| recogeDelante | GOMA: 1 (AR2401614) |
| recogeAtras | NO: 1 (AR2401614) |
| ventana | SÍ: 1 (AR2401614) |
| rotulacion | NO: 1 (AR2401614) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2401614) |
| modo | SEGUN SE INDICA: 1 (AR2401614) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 230 × 131 | 10; 43,5; 90; 122,5 | 10; 43,5; 90; 122,5 | 2,5; 10; 47,8; 97,5; 142,5; 187,5; 221; 228,5 |  AR2401614; OT/2024/AR2401614.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2401614. |

### RIAL LOPEZ, ISMAEL — 052157

Ficha: `rial-lopez-ismael`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2500169). Nombres/alias del histórico: RIAL LOPEZ, ISMAEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 1 (AR2500169) |
| recogeDelante | NO: 1 (AR2500169) |
| recogeAtras | GOMA: 1 (AR2500169) |
| bastillaEnfundar | NO: 1 (AR2500169) |
| ventana | SÍ: 1 (AR2500169) |
| rotulacion | SI: 1 (AR2500169) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2500169) |
| modo | SEGUN SE INDICA: 1 (AR2500169) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 266 × 143 | 2,5; 35; 72; 109; 141,5 | 2,5; 35; 72; 109; 141,5 | 6; 55; 110; 160; 210; 260 |  AR2500169; OT/2025/AR2500169.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500169. |

### RIAL SUAREZ, JOSE MANUEL — 053275

Ficha: `rial-suarez-jose-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2501043). Nombres/alias del histórico: RIAL SUAREZ, JOSE MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 230 × 135 | BE2501043 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### RIVAS CASTELO, JESUS — 025596

Ficha: `rivas-castelo-jesus`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505953). Nombres/alias del histórico: RIVAS CASTELO, JESUS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 216 × 112 | AR2505953 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2505953.dwg; OT/2025/AR2505953.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### RODRIGUEZ CARRUCHO, ALBERTO — 051838

Ficha: `rodriguez-carrucho-alberto`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2401003). Nombres/alias del histórico: RODRIGUEZ CARRUCHO, ALBERTO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 201 × 146 | BE2401003 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### RODRIGUEZ EXPOSITO, GUMERSINDO — 052080

Ficha: `rodriguez-exposito-gumersindo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406886). Nombres/alias del histórico: RODRIGUEZ EXPOSITO, GUMERSINDO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 222 × 132 | AR2406886 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### RODRIGUEZ FERNANDEZ, CARLOS — 051958

Ficha: `rodriguez-fernandez-carlos`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406207). Nombres/alias del histórico: RODRIGUEZ FERNANDEZ, CARLOS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2406207) |
| recogeDelante | NO: 1 (AR2406207) |
| recogeAtras | GOMA: 1 (AR2406207) |
| bastillaEnfundar | NO: 1 (AR2406207) |
| ventana | SÍ: 1 (AR2406207) |
| rotulacion | NO: 1 (AR2406207) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2406207) |
| modo | SEGUN SE INDICA: 1 (AR2406207) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 250 × 143 | 12; 40,5; 74,5; 109,3; 135,3 | 12; 40,5; 74,5; 109,3; 135,3 | 11; 39,3; 74; 109; 143,5; 178,8; 215; 242 |  AR2406207; OT/2024/ar2406207.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406207. |

### RODRIGUEZ FUENTES, SANDRA — 020273

Ficha: `rodriguez-fuentes-sandra`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2602205). Nombres/alias del histórico: RODRIGUEZ FUENTES, SANDRA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2602205) |
| recogeDelante | NO: 1 (AR2602205) |
| recogeAtras | GOMA: 1 (AR2602205) |
| bastillaEnfundar | NO: 1 (AR2602205) |
| ventana | NO: 1 (AR2602205) |
| rotulacion | NO: 1 (AR2602205) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2602205) |
| modo | SEGUN SE INDICA: 1 (AR2602205) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 174 × 115 | 3,5; 31; 85; 112,5 | 3,5; 25,5; 58,5; 90,5; 112,5 | 3,5; 29; 60; 88; 116; 145; 171,5 |  AR2602205; OT/2026/AR2602205.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602205. |

### RODRIGUEZ GARCIA, DIEGO — 053972

Ficha: `rodriguez-garcia-diego`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600492). Nombres/alias del histórico: RODRIGUEZ GARCIA, DIEGO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 206 × 119 | BE2600492 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### RODRIGUEZ LISTA, JUAN CARLOS — 050596

Ficha: `rodriguez-lista-juan-carlos`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400076). Nombres/alias del histórico: RODRIGUEZ LISTA, JUAN CARLOS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2400076) |
| recogeDelante | NO: 1 (AR2400076) |
| recogeAtras | GOMA: 1 (AR2400076) |
| bastillaEnfundar | NO: 1 (AR2400076) |
| ventana | NO: 1 (AR2400076) |
| rotulacion | NO: 1 (AR2400076) |
| material | LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2400076) |
| modo | SEGUN SE INDICA: 1 (AR2400076) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 163 × 99 | 10; 50; 90 | 10; 50; 90 | 9; 24; 64; 104; 144; 154 |  AR2400076; OT/2024/AR2400076.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400076. |

### RODRIGUEZ MOURELLE, MARIA JOSE — 052139

Ficha: `rodriguez-mourelle-maria-jose`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2500089). Nombres/alias del histórico: RODRIGUEZ MOURELLE, MARIA JOSE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 1 (AR2500089) |
| recogeDelante | NO: 1 (AR2500089) |
| recogeAtras | GOMA: 1 (AR2500089) |
| bastillaEnfundar | NO: 1 (AR2500089) |
| ventana | NO: 1 (AR2500089) |
| rotulacion | NO: 1 (AR2500089) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2500089) |
| modo | SEGUN SE INDICA: 1 (AR2500089) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 260 × 170 | 2,5; 14,5; 55; 85,5; 116; 156,5; 168,5 | 2,5; 35; 70; 105; 135; 168,5 | 2,5; 14,5; 35; 66; 96; 130; 160; 195; 226; 258,5 |  AR2500089; OT/2025/AR2500089.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500089. |

### RODRIGUEZ PAZ, INOCENCIO — 052250

Ficha: `rodriguez-paz-inocencio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500177). Nombres/alias del histórico: RODRIGUEZ PAZ, INOCENCIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 200 × 120 | BE2500177 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### RODRIGUEZ VAZQUEZ, JOSE MARIA — 053127

Ficha: `rodriguez-vazquez-jose-maria`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500888). Nombres/alias del histórico: RODRIGUEZ VAZQUEZ, JOSE MARIA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 255 × 135 | BE2500888 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### ROUCO IGLESIAS, RUBEN — 051396

Ficha: `rouco-iglesias-ruben`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2403757). Nombres/alias del histórico: ROUCO IGLESIAS, RUBEN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2403757) |
| recogeDelante | NO: 1 (AR2403757) |
| recogeAtras | GOMA: 1 (AR2403757) |
| bastillaEnfundar | NO: 1 (AR2403757) |
| ventana | NO: 1 (AR2403757) |
| rotulacion | NO: 1 (AR2403757) |
| material | LONA ALPHA 1L 580  :NEGRO :250 AN: 1 (AR2403757) |
| modo | SEGUN SE INDICA: 1 (AR2403757) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 155 × 105 | 10,5; 38,5; 67,5; 95,5 | 5; 25; 53; 81; 100 | 5; 28; 56; 85; 116; 150 |  AR2403757; OT/2024/AR2403757.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2403757. |

### S. A. T. ISIDRO,  XUGA 1070 , — 010191

Ficha: `s-a-t-isidro-xuga-1070`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600446). Nombres/alias del histórico: S. A. T. ISIDRO,  XUGA 1070 ,.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2600446) |
| recogeDelante | NO: 1 (AR2600446) |
| recogeAtras | GOMA: 1 (AR2600446) |
| bastillaEnfundar | NO: 1 (AR2600446) |
| ventana | SÍ: 1 (AR2600446) |
| rotulacion | NO: 1 (AR2600446) |
| material | LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2600446) |
| modo | SEGUN SE INDICA: 1 (AR2600446) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 200 × 120 | 5,5; 25,5; 60,5; 95,5; 115,5 | 4; 30; 60; 90; 115 | 10,5; 40,5; 80,5; 120,5; 160,5; 190,5 |  AR2600446; OT/2026/AR2600446.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600446. |

### SABIO FERNANDEZ, RAFAEL — 054217

Ficha: `sabio-fernandez-rafael`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600690). Nombres/alias del histórico: SABIO FERNANDEZ, RAFAEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 260 × 150 | BE2600690 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### SAGASETA MUNARRIZ, ANGEL — 053886

Ficha: `sagaseta-munarriz-angel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2602080). Nombres/alias del histórico: SAGASETA MUNARRIZ, ANGEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA G650 2L 650 :GRIS RAL7037 :250 AN (M5736): 1 (AR2602080) |
| modo | SEGUN SE INDICA: 1 (AR2602080) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 276 × 175 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 | 2,5; 36,7; 70,9; 105,1; 139,3; 173,5 | 2,5; 36,5; 70,5; 104,5; 138,5; 172,5; 206,5; 240,5; 274,5 |  AR2602080; OT/2026/AR2602080.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602080. |

### SAIT, S. L. , — 009386

Ficha: `sait-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400444). Nombres/alias del histórico: SAIT, S. L. ,.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 275 × 150 | BE2400444 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### SANCHEZ AGUIRREBEITIA, IÑIGO — 053681

Ficha: `sanchez-aguirrebeitia-inigo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2602127). Nombres/alias del histórico: SANCHEZ AGUIRREBEITIA, IÑIGO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2602127) |
| recogeDelante | NO: 1 (AR2602127) |
| recogeAtras | GOMA: 1 (AR2602127) |
| bastillaEnfundar | NO: 1 (AR2602127) |
| ventana | SÍ: 1 (AR2602127) |
| rotulacion | NO: 1 (AR2602127) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2602127) |
| modo | SEGUN SE INDICA: 1 (AR2602127) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 200 × 133 | 2,5; 34,8; 67; 99,3; 131,5 | 2,5; 34,8; 67; 99,3; 131,5 | 2,5; 41,7; 80,9; 120,1; 159,3; 198,5 |  AR2602127; OT/2026/AR2602127.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602127. |

### SANCHEZ VAZQUEZ, IVAN — 050628

Ficha: `sanchez-vazquez-ivan`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400228). Nombres/alias del histórico: SANCHEZ VAZQUEZ, IVAN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 243 × 146 | AR2400228 | Sin los tres lados acreditados sobre la lona hecha. OT/2024/AR2400228.dwg; OT/2024/AR2400228.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### SANESTEVAN COIRA, DANIEL — 052912

Ficha: `sanestevan-coira-daniel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500698). Nombres/alias del histórico: SANESTEVAN COIRA, DANIEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 240 × 153 | BE2500698 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### SANISIDRO LAIÑO, SANTIAGO — 052647

Ficha: `sanisidro-laino-santiago`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2502568). Nombres/alias del histórico: SANISIDRO LAIÑO, SANTIAGO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2502568) |
| modo | SEGUN SE INDICA: 1 (AR2502568) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 180 × 125 | 5,5; 37; 89; 120,5 | 16; 47,5; 78,5; 110 | 12,5; 46,8; 90,5; 134,3; 168,5 |  AR2502568; OT/2025/AR2502568.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502568. |

### SARTAGES MEDRANO, RAMON — 029848

Ficha: `sartages-medrano-ramon`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505052). Nombres/alias del histórico: SARTAGES MEDRANO, RAMON.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2505052) |
| modo | SEGUN SE INDICA: 1 (AR2505052) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 180 × 130 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 34; 65,5; 97; 128,5 | 2,5; 37,7; 72,9; 108,1; 143,3; 178,5 |  AR2505052; OT/2025/AR2505052.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505052. |

### SEIJO TORREIRO, ANTONIO — 053592

Ficha: `seijo-torreiro-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600163). Nombres/alias del histórico: SEIJO TORREIRO, ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 222 × 127 | BE2600163 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### SOUTO VILARIÑO, ANA — 051846

Ficha: `souto-vilarino-ana`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405636). Nombres/alias del histórico: SOUTO VILARIÑO, ANA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2405636) |
| recogeDelante | NO: 1 (AR2405636) |
| recogeAtras | GOMA: 1 (AR2405636) |
| bastillaEnfundar | NO: 1 (AR2405636) |
| ventana | SÍ: 1 (AR2405636) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2405636) |
| modo | SEGUN SE INDICA: 1 (AR2405636) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 155,5 × 105 | 7; 30; 76; 99 | 5; 25; 55; 85; 100 | 2,5; 5; 32; 62; 92; 122; 150; 154 |  AR2405636; OT/2024/AR2405636.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405636. |

### SUAREZ ALVAREZ, ROBERTO — 050760

Ficha: `suarez-alvarez-roberto`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400187). Nombres/alias del histórico: SUAREZ ALVAREZ, ROBERTO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 250 × 141 | BE2400187 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### SUAREZ PEREZ, RAFAEL — 053777

Ficha: `suarez-perez-rafael`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601586). Nombres/alias del histórico: SUAREZ PEREZ, RAFAEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2601586) |
| modo | SEGUN SE INDICA: 1 (AR2601586) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 150 × 100 | 5; 35,5; 65,5; 96 | 5; 35,5; 65,5; 96 | 7,5; 34,7; 61,9; 89,1; 116,3; 143,5 |  AR2601586; OT/2026/AR2601586.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601586. |

### SUAREZ PIMENTEL, OSCAR — 052069

Ficha: `suarez-pimentel-oscar`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406834). Nombres/alias del histórico: SUAREZ PIMENTEL, OSCAR.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2406834) |
| modo | SEGUN SE INDICA: 1 (AR2406834) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 150 × 100 | 5,5; 35,5; 65,5; 95,5 | 5; 30; 68; 95 | 5,5; 35,5; 60,5; 90,5; 115,5; 145,5 |  AR2406834; OT/2024/AR2406834.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406834. |

### SUMINISTROS Y REPARACIONES MYT S.L — 053211

Ficha: `suministros-y-reparaciones-myt-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505061). Nombres/alias del histórico: SUMINISTROS Y REPARACIONES MYT S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 03: 1 (AR2505061) |
| recogeDelante | NO: 1 (AR2505061) |
| recogeAtras | GOMA: 1 (AR2505061) |
| bastillaEnfundar | NO: 1 (AR2505061) |
| ventana | NO: 1 (AR2505061) |
| rotulacion | NO: 1 (AR2505061) |
| material | LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2505061) |
| modo | SEGUN SE INDICA: 1 (AR2505061) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 174,5 × 114,5 | 2,5; 37; 78; 113 | 2,5; 26; 57; 88; 113 | 2,5; 26; 65; 102; 139; 173 |  AR2505061; OT/2025/AR2505061.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505061. |

### SUPERMUIÑO S.L — 049022

Ficha: `supermuino-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2500586). Nombres/alias del histórico: SUPERMUIÑO S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2500586) |
| recogeDelante | NO: 1 (AR2500586) |
| recogeAtras | NO: 1 (AR2500586) |
| bastillaEnfundar | NO: 1 (AR2500586) |
| ventana | NO: 1 (AR2500586) |
| rotulacion | NO: 1 (AR2500586) |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2500586) |
| modo | SEGUN SE INDICA: 1 (AR2500586) |

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 229 × 129 | AR2500586 | Sin los tres lados acreditados sobre la lona hecha. OT/2025/AR2500586.dwg; OT/2025/AR2500586.xlsb; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### T.G TALLERES GONZALEZ, S. L. — 007698

Ficha: `t-g-talleres-gonzalez-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2500542). Nombres/alias del histórico: T.G TALLERES GONZALEZ, S. L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2500542) |
| recogeDelante | NO: 1 (AR2500542) |
| recogeAtras | GOMA: 1 (AR2500542) |
| bastillaEnfundar | NO: 1 (AR2500542) |
| ventana | NO: 1 (AR2500542) |
| rotulacion | NO: 1 (AR2500542) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2500542) |
| modo | SEGUN SE INDICA: 1 (AR2500542) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 175 × 120 | 7,5; 27; 52; 85; 112,5 | 7,5; 30; 60,5; 89; 113 | 13; 43; 73; 103; 133; 163 |  AR2500542; OT/2025/AR2500542.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500542. |

### TALLER DE ARTESANOS ZOCLOS · MILLAN GOMEZ,LUIS — 051556

Ficha: `taller-de-artesanos-zoclos-millan-gomez-luis`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406885). Nombres/alias del histórico: TALLER DE ARTESANOS ZOCLOS · MILLAN GOMEZ,LUIS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Baquetón; 220 × 130 | AR2406885 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### TALLERES JOSE SUAREZ S.L. — 030323

Ficha: `talleres-jose-suarez-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406598). Nombres/alias del histórico: TALLERES JOSE SUAREZ S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2406598) |
| modo | REPARTIDOS: 1 (AR2406598) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 210 × 128 | 2,5; 31,7; 64,5; 95,5; 126,5 | 2,5; 33,5; 64,5; 95,5; 126,5 | 2,5; 31,9; 61,4; 90,8; 120,2; 149,6; 179,1; 208,5 |  AR2406598; OT/2024/AR2406598.xlsb / BAQUETÓN, filas 33/34/35, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406598. |

### TALLERES TREBORE JARDINERIA S.L. — 036510

Ficha: `talleres-trebore-jardineria-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500759). Nombres/alias del histórico: TALLERES TREBORE JARDINERIA S.L..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 300 × 160 | BE2500759 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### TIPSA RECAMBIOS S.L — 047265

Ficha: `tipsa-recambios-s-l`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2600017). Nombres/alias del histórico: TIPSA RECAMBIOS S.L.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 02: 1 (AR2600017) |
| recogeDelante | CREMALLERA: 1 (AR2600017) |
| recogeAtras | CREMALLERA: 1 (AR2600017) |
| bastillaEnfundar | NO: 1 (AR2600017) |
| ventana | NO: 1 (AR2600017) |
| rotulacion | SI: 1 (AR2600017) |
| material | LONA NS86 2L 630GR [580]: GRIS 7038 (COR/900): 250AN: 1 (AR2600017) |
| modo | REPARTIDOS: 1 (AR2600017) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 153 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 32,3; 62,1; 91,9; 121,7; 151,5 |  AR2600017; OT/2026/AR2600017.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2600017. |

### TOBIO ARRIBAS, JORGE — 050707

Ficha: `tobio-arribas-jorge`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400631). Nombres/alias del histórico: TOBIO ARRIBAS, JORGE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2400631) |
| modo | SEGUN SE INDICA: 1 (AR2400631) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 160 × 115,5 | 7; 20,5; 36; 81; 96; 109,5 | 2,5; 13; 42; 73,5; 103; 114 | 2,5; 16; 80; 144,5; 158,5 |  AR2400631; OT/2024/AR2400631.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400631. |

### TOJEIRO LOPEZ, AMANDINO — 050834

Ficha: `tojeiro-lopez-amandino`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400254). Nombres/alias del histórico: TOJEIRO LOPEZ, AMANDINO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 257 × 140 | BE2400254 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### TOLDOS Y CERRAMIENTOS GYG S.L.U. — 041952

Ficha: `toldos-y-cerramientos-gyg-s-l-u`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505739). Nombres/alias del histórico: TOLDOS Y CERRAMIENTOS GYG S.L.U..

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2505739) |
| recogeDelante | NO: 1 (AR2505739) |
| recogeAtras | VELCRO: 1 (AR2505739) |
| bastillaEnfundar | NO: 1 (AR2505739) |
| ventana | NO: 1 (AR2505739) |
| rotulacion | NO: 1 (AR2505739) |
| material | LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2505739) |
| modo | SEGUN SE INDICA: 1 (AR2505739) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 155,5 × 128 | 2,5; 64,5; 126,5 | 2,5; 64,5; 126,5 | 2,5; 52,5; 101,5; 154 |  AR2505739; OT/2025/AR2505739.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505739. |

### U.T.E PORTOS SECTOR CENTRO — 052095

Ficha: `u-t-e-portos-sector-centro`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2401271). Nombres/alias del histórico: U.T.E PORTOS SECTOR CENTRO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 210 × 130 | BE2401271 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### URIA MARTINEZ, LUIS MIGUEL — 054199

Ficha: `uria-martinez-luis-miguel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2603435). Nombres/alias del histórico: URIA MARTINEZ, LUIS MIGUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA G650 2L 650 :GRIS RAL7037 :250 AN (M5736): 1 (AR2603435) |
| modo | SEGUN SE INDICA: 1 (AR2603435) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 271 × 162 | 2,5; 42; 81,5; 121; 160,5 | 2,5; 42; 81,5; 121; 160,5 | 2,5; 35,9; 69,3; 102,6; 136; 169,4; 202,8; 236,1; 269,5 |  AR2603435; OT/2026/AR2603435.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2603435. |

### VAELLO RODRIGUEZ, JOSE ANTONIO — 053832

Ficha: `vaello-rodriguez-jose-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601884). Nombres/alias del histórico: VAELLO RODRIGUEZ, JOSE ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :AZUL EUROPA :250 AN: 1 (AR2601884) |
| modo | SEGUN SE INDICA: 1 (AR2601884) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 201 × 131 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 34,3; 66; 97,8; 129,5 | 2,5; 41,9; 81,3; 120,7; 160,1; 199,5 |  AR2601884; OT/2026/AR2601884.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601884. |

### VAN BERKUM, CECILIA MARGARETHA — 053917

Ficha: `van-berkum-cecilia-margaretha`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2602182). Nombres/alias del histórico: VAN BERKUM, CECILIA MARGARETHA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2602182) |
| recogeDelante | NO: 1 (AR2602182) |
| recogeAtras | GOMA: 1 (AR2602182) |
| bastillaEnfundar | NO: 1 (AR2602182) |
| ventana | SÍ: 1 (AR2602182) |
| rotulacion | NO: 1 (AR2602182) |
| material | LONA STARPLUS 1L 610 :CREMA 1014 :250 AN (580): 1 (AR2602182) |
| modo | SEGUN SE INDICA: 1 (AR2602182) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 251 × 140 | 2,5; 33; 70,5; 108; 138,5 | 2,5; 28,5; 53; 81,5; 111; 138,5 | 2,5; 29; 64; 100; 138,5; 176; 210; 249,5 |  AR2602182; OT/2026/AR2602182.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2602182. |

### VARELA FERNANDEZ, JOSE MANUEL — 051411

Ficha: `varela-fernandez-jose-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2400638). Nombres/alias del histórico: VARELA FERNANDEZ, JOSE MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 124 × 98 | BE2400638 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### VARELA FREIRE, ALVARO — 053339

Ficha: `varela-freire-alvaro`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505632). Nombres/alias del histórico: VARELA FREIRE, ALVARO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 219 × 158 | AR2505632 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |

### VARELA GANDOY, JOSE LUIS — 051899

Ficha: `varela-gandoy-jose-luis`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405906). Nombres/alias del histórico: VARELA GANDOY, JOSE LUIS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2405906) |
| recogeDelante | NO: 1 (AR2405906) |
| recogeAtras | GOMA: 1 (AR2405906) |
| bastillaEnfundar | NO: 1 (AR2405906) |
| ventana | SÍ: 1 (AR2405906) |
| rotulacion | NO: 1 (AR2405906) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2405906) |
| modo | SEGUN SE INDICA: 1 (AR2405906) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 173,5 × 117 | 5; 30; 57; 85; 113 | 5; 30; 57; 85; 113 | 5; 29; 58; 86; 115; 143; 169,5 |  AR2405906; OT/2024/AR2405906.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2405906. |

### VARELA LOPEZ, ALBERTO — 054094

Ficha: `varela-lopez-alberto`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2600602). Nombres/alias del histórico: VARELA LOPEZ, ALBERTO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 225 × 140 | BE2600602 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### VAZQUEZ BARROS,DOMINGO — 044426

Ficha: `vazquez-barros-domingo`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500033). Nombres/alias del histórico: VAZQUEZ BARROS,DOMINGO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 170 × 125 | BE2500033 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### VAZQUEZ CASTRO, JOSE RAMON — 051720

Ficha: `vazquez-castro-jose-ramon`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2405036). Nombres/alias del histórico: VAZQUEZ CASTRO, JOSE RAMON.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 305 × 161 | AR2405036 | Modelo de ganado; fuera de FichaCliente. ; escaneo RPS localizado (detalle en evidencias.json) |

### VAZQUEZ QUINTEIRO, JUSTA — 020501

Ficha: `vazquez-quinteiro-justa`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2406740). Nombres/alias del histórico: VAZQUEZ QUINTEIRO, JUSTA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2406740) |
| recogeDelante | NO: 1 (AR2406740) |
| recogeAtras | GOMA: 1 (AR2406740) |
| bastillaEnfundar | NO: 1 (AR2406740) |
| ventana | SÍ: 1 (AR2406740) |
| rotulacion | NO: 1 (AR2406740) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2406740) |
| modo | SEGUN SE INDICA: 1 (AR2406740) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 161 × 115 | 7; 23,5; 44; 66; 87; 106,5 | 6,5; 23; 44; 66,8; 87,8; 106,5 | 7,5; 28; 54,5; 81; 107; 132; 153 |  AR2406740; OT/2024/AR2406740.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2406740. |

### VAZQUEZ TORRES, LAURA — 051163

Ficha: `vazquez-torres-laura`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2402694). Nombres/alias del histórico: VAZQUEZ TORRES, LAURA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA ALPHA 1L 580  :VERDE RAL6026 :250 AN: 1 (AR2402694) |
| modo | SEGUN SE INDICA: 1 (AR2402694) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 177 × 112 | 2,5; 17,5; 28; 56,5; 85; 95; 110,5 | 2,5; 18; 56; 94; 110,5 | 2,5; 33; 69; 106; 142; 175,5 |  AR2402694; OT/2024/AR2402694.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2402694. |

### VENCES BOUZAS, BENJAMIN — 050685

Ficha: `vences-bouzas-benjamin`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2400508). Nombres/alias del histórico: VENCES BOUZAS, BENJAMIN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2400508) |
| recogeDelante | NO: 1 (AR2400508) |
| recogeAtras | GOMA: 1 (AR2400508) |
| bastillaEnfundar | NO: 1 (AR2400508) |
| ventana | NO: 1 (AR2400508) |
| rotulacion | no: 1 (AR2400508) |
| material | LONA STARPLUS 1L 610:GRIS 095  7038 (CLARO):250 AN: 1 (AR2400508) |
| modo | SEGUN SE INDICA: 1 (AR2400508) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 140 × 110 | 4; 40; 71; 107 | 4; 40; 71; 107 | 2,5; 16,5; 31,5; 57,5; 77,5; 113,5; 138,5 |  AR2400508; OT/2024/ar2400508.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2400508. |

### VIDAL NUÑEZ, JOAQUIN — 052410

Ficha: `vidal-nunez-joaquin`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2501584). Nombres/alias del histórico: VIDAL NUÑEZ, JOAQUIN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2501584) |
| recogeDelante | NO: 1 (AR2501584) |
| recogeAtras | GOMA: 1 (AR2501584) |
| bastillaEnfundar | NO: 1 (AR2501584) |
| ventana | SÍ: 1 (AR2501584) |
| rotulacion | NO: 1 (AR2501584) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2501584) |
| modo | SEGUN SE INDICA: 1 (AR2501584) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 160 × 109 | 19; 54; 99 | 19; 54; 99 | 5,7; 25; 62; 98; 140 |  AR2501584; OT/2025/AR2501584.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2501584. |

### VIDAL OTERO, ANDREA — 053280

Ficha: `vidal-otero-andrea`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2505385). Nombres/alias del histórico: VIDAL OTERO, ANDREA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| material | LONA G650 2L 650 :VERDE RAL6026 :250 AN (M5728): 1 (AR2505385) |
| modo | SEGUN SE INDICA: 1 (AR2505385) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 310 × 170 | 5,5; 42,5; 85,5; 128,5; 166,5 | 5,5; 50,5; 85,5; 120,5; 166,5 | 5,5; 45,5; 87,5; 132,5; 176,5; 218,5; 262,5; 305,5 |  AR2505385; OT/2025/AR2505385.xlsb / BAQUETÓN, filas 38/39/40, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2505385. |

### VIDAL SANTORUM, ANA BELEN — 052571

Ficha: `vidal-santorum-ana-belen`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2502296). Nombres/alias del histórico: VIDAL SANTORUM, ANA BELEN.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2502296) |
| recogeDelante | NO: 1 (AR2502296) |
| recogeAtras | GOMA: 1 (AR2502296) |
| bastillaEnfundar | NO: 1 (AR2502296) |
| ventana | NO: 1 (AR2502296) |
| rotulacion | NO: 1 (AR2502296) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2502296) |
| modo | REPARTIDOS: 1 (AR2502296) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 230 × 124 | 2,5; 42,5; 82,5; 122,5 | 2,5; 42,5; 82,5; 122,5 | 2,5; 34,8; 67,1; 99,4; 131,6; 163,9; 196,2; 228,5 |  AR2502296; OT/2025/AR2502296.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2502296. |

### VIDAL VAZQUEZ, JUAN ANTONIO — 053078

Ficha: `vidal-vazquez-juan-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504350). Nombres/alias del histórico: VIDAL VAZQUEZ, JUAN ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2504350) |
| recogeDelante | NO: 1 (AR2504350) |
| recogeAtras | GOMA: 1 (AR2504350) |
| bastillaEnfundar | NO: 1 (AR2504350) |
| ventana | NO: 1 (AR2504350) |
| rotulacion | NO: 1 (AR2504350) |
| material | LONA ALPHA 1L 580 :NARANJA RAL2004 :250 AN: 1 (AR2504350) |
| modo | SEGUN SE INDICA: 1 (AR2504350) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 260 × 140 | 35,5; 70,5; 105,5 | 35,5; 105,5 | 25; 68; 110; 152; 195; 238 |  AR2504350; OT/2025/AR2504350.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504350. |

### VILA VEIGA, JOSE MANUEL — 021774

Ficha: `vila-veiga-jose-manuel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2504507). Nombres/alias del histórico: VILA VEIGA, JOSE MANUEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2504507) |
| recogeDelante | NO: 1 (AR2504507) |
| recogeAtras | GOMA: 1 (AR2504507) |
| bastillaEnfundar | NO: 1 (AR2504507) |
| ventana | NO: 1 (AR2504507) |
| rotulacion | NO: 1 (AR2504507) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2504507) |
| modo | SEGUN SE INDICA: 1 (AR2504507) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 181 × 112 | 7; 41; 75; 108 | 25; 57; 90 | 7; 62; 92; 122; 152; 177 |  AR2504507; OT/2025/AR2504507.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2504507. |

### VILAR LOPEZ, FIDEL — 052312

Ficha: `vilar-lopez-fidel`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (BE2500250). Nombres/alias del histórico: VILAR LOPEZ, FIDEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Lona alta; 250 × 140 | BE2500250 | Sin los tres lados acreditados sobre la lona hecha. ; escaneo RPS localizado (detalle en evidencias.json) |

### VILAR SANCHEZ, ISMAEL — 052904

Ficha: `vilar-sanchez-ismael`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2503567). Nombres/alias del histórico: VILAR SANCHEZ, ISMAEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 01: 1 (AR2503567) |
| recogeDelante | NO: 1 (AR2503567) |
| recogeAtras | GOMA: 1 (AR2503567) |
| bastillaEnfundar | NO: 1 (AR2503567) |
| ventana | NO: 1 (AR2503567) |
| rotulacion | NO: 1 (AR2503567) |
| material | LONA NS86 2L 630GR [580]: GRIS 7037 (COR/902): 250AN: 1 (AR2503567) |
| modo | SEGUN SE INDICA: 1 (AR2503567) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 150 × 110 | 5; 37; 74; 106 | 5; 37; 74; 106 | 5; 52; 99; 146 |  AR2503567; OT/2025/AR2503567.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2503567. |

### VILARIÑO SILVA, JORGE — 053666

Ficha: `vilarino-silva-jorge`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601075). Nombres/alias del histórico: VILARIÑO SILVA, JORGE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2601075) |
| recogeDelante | GOMA: 1 (AR2601075) |
| recogeAtras | GOMA: 1 (AR2601075) |
| bastillaEnfundar | NO: 1 (AR2601075) |
| ventana | NO: 1 (AR2601075) |
| rotulacion | NO: 1 (AR2601075) |
| material | LONA ALPHA 1L 580  :AZUL RAL5015 :250 AN: 1 (AR2601075) |
| modo | SEGUN SE INDICA: 1 (AR2601075) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 229,5 × 132,5 | 28; 65; 103 | 33,75; 66,75; 99,75 | 36; 76; 116; 156; 194 |  AR2601075; OT/2026/AR2601075.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2601075. |

### YEBRA PASTOR, ENRIQUE — 053739

Ficha: `yebra-pastor-enrique`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2601412). Nombres/alias del histórico: YEBRA PASTOR, ENRIQUE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Sin medidas completas acreditadas para cargar.

Referencias que quedan fuera de las medidas automáticas:

| Tipo y medida del histórico | Pedidos | Motivo y fuentes |
| --- | --- | --- |
| Ganado; 235 × 150 | AR2601412 | Modelo de ganado; fuera de FichaCliente. OT/2026/AR2601412.dwg; corte localizado; escaneo RPS localizado (detalle en evidencias.json) |

### ZAYAS LUQUE, JUAN ANTONIO — 041861

Ficha: `zayas-luque-juan-antonio`. Histórico: **1 líneas / 1 pedidos**. PDF producidos adicionales examinados: 0. Alta propuesta.

Código acreditado por GET RPS pedido (AR2500189). Nombres/alias del histórico: ZAYAS LUQUE, JUAN ANTONIO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Valores observados en las hojas coincidentes (un pedido puede tener elementos con valores distintos):

| Campo | Valores y pedidos que lo acreditan |
| --- | --- |
| perfil | TIPO 05: 1 (AR2500189) |
| recogeDelante | NO: 1 (AR2500189) |
| recogeAtras | GOMA: 1 (AR2500189) |
| bastillaEnfundar | NO: 1 (AR2500189) |
| ventana | SÍ: 1 (AR2500189) |
| rotulacion | NO: 1 (AR2500189) |
| material | LONA STARPLUS 1L 610:GRIS 096 7037 (OSCURO):250 AN: 1 (AR2500189) |
| modo | REPARTIDOS: 1 (AR2500189) |

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 156 × 158 | 2,5; 33,3; 64,1; 94,9; 125,7; 156,5 | 2,5; 33,3; 64,1; 94,9; 125,7; 156,5 | 17; 42; 67; 87; 114; 127 |  AR2500189; OT/2025/AR2500189.xlsb / LONA REMOLQUE, filas 26/27/28, I:T; mayoría de pedidos. Variantes: 1 pedido(s): AR2500189. |

### BENEDICTO CASTELLS, MIRIAM — 054524

Ficha: `benedicto-castells-miriam`. Histórico: **0 líneas / 0 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por GET RPS pedido PDF producido (AR2604843). Nombres/alias del histórico: BENEDICTO CASTELLS, MIRIAM.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 244 × 143 | 2,5; 30,3; 58,1; 85,9; 113,7; 141,5 | 2,5; 30,3; 58,1; 85,9; 113,7; 141,5 | 2,5; 32,5; 62,5; 92,5; 122,5; 152,5; 182,5; 212,5; 242,5 |  AR2604843; OT/2026/AR2604843.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2604843. |

### DOMINGUEZ GALIÑANES, JUAN JOSE — 054592

Ficha: `dominguez-galinanes-juan-jose`. Histórico: **0 líneas / 0 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por GET RPS pedido PDF producido (AR2605140). Nombres/alias del histórico: DOMINGUEZ GALIÑANES, JUAN JOSE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 175 × 125 | 2,5; 32,8; 63; 93,3; 123,5 | 2,5; 32,8; 63; 93,3; 123,5 | 2,5; 31; 59,5; 88; 116,5; 145; 173,5 |  AR2605140; OT/2026/AR2605140.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605140. |

### FERNANDEZ FERNANDEZ, JESUS — 054576

Ficha: `fernandez-fernandez-jesus`. Histórico: **0 líneas / 0 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por GET RPS pedido PDF producido (AR2605079). Nombres/alias del histórico: FERNANDEZ FERNANDEZ, JESUS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 260 × 140 | 7; 36,5; 70,5; 104,5; 134 | 7; 36,5; 70,5; 104,5; 134 | 2,5; 10; 43,5; 72,5; 101,5; 130,5; 159,5; 188,5; 217,5; 254 |  AR2605079; OT/2026/AR2605079.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605079. |

### FIDALGO LEON, DANIEL — 054552

Ficha: `fidalgo-leon-daniel`. Histórico: **0 líneas / 0 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por GET RPS pedido PDF producido (AR2604959). Nombres/alias del histórico: FIDALGO LEON, DANIEL.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 179 × 117 | 2,5; 40,2; 77,8; 115,5 | 2,5; 40,2; 77,8; 115,5 | 2,5; 37,5; 72,5; 107,5; 142,5; 177,5 |  AR2604959; OT/2026/AR2604959.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2604959. |

### GENERAL WOLDER — 001047

Ficha: `general-wolder`. Histórico: **0 líneas / 0 pedidos**. PDF producidos adicionales examinados: 0. Registro vigente versión 1, conservado.

Código acreditado por registro vigente leído por GET. Nombres/alias del histórico: GENERAL WOLDER.

Plantillas encontradas: `PL/general wolder.DWG`; `PL/CALCULOS REMOLQUES/GENERAL WOLDER.xls`; `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/GENERAL WOLDER.xls`

Campos vigentes que se respetan: `extrasBaqueton` = {"extraLargoCostura":-1,"extraAnchoCostura":-1,"extraBaquetonLargoDelante":-0.5,"extraBaquetonLargoDetras":-0.5,"extraLargoFinal":0,"extraAnchoFinal":0,"extraBaquetonTrasero":0,"observaciones":["OLLAOS EN ALTA FRECUENCIA","ETIQUETA EN I.D EN LA PARTE TRASERA ENTRE LOS 2 OLLAOS MÁS A LA DERECHA","MANDAR GOMA SUELTA"]}.

Sin medidas completas acreditadas para cargar.

### LLANOS MARTINEZ, JORGE — 054612

Ficha: `llanos-martinez-jorge`. Histórico: **0 líneas / 0 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por GET RPS pedido PDF producido (AR2605260). Nombres/alias del histórico: LLANOS MARTINEZ, JORGE.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 251 × 136 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 35,5; 68,5; 101,5; 134,5 | 2,5; 37,8; 73,1; 108,4; 143,6; 178,9; 214,2; 249,5 |  AR2605260; OT/2026/AR2605260.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605260. |

### LOPEZ BARREIRO, PABLO — 054595

Ficha: `lopez-barreiro-pablo`. Histórico: **0 líneas / 0 pedidos**. PDF producidos adicionales examinados: 1. Alta propuesta.

Código acreditado por GET RPS pedido PDF producido (AR2605158). Nombres/alias del histórico: LOPEZ BARREIRO, PABLO.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| lona; 184 × 120 | 2,5; 12,5; 30,5; 45,5; 60,5; 75,5; 90,5; 108,5; 118,5 | 2,5; 30,5; 60,5; 90,5; 118,5 | 2,5; 15; 38; 73; 109; 145; 181,5 |  AR2605158; OT/2026/AR2605158.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605158. |

### REMOLQUES ROBUSTOS — 054598

Ficha: `remolques-robustos`. Histórico: **0 líneas / 0 pedidos**. PDF producidos adicionales examinados: 1. Registro vigente versión 1, conservado.

Código acreditado por GET RPS pedido PDF producido (AR2605183). Nombres/alias del histórico: REMOLQUES ROBUSTOS.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

Campos vigentes que se respetan: nombre y códigos, sin preferencias añadidas.

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 200 × 135 | 2,5; 35,3; 68; 100,8; 133,5 | 2,5; 46,2; 89,8; 133,5 | 2,5; 35,2; 67,8; 100,5; 133,2; 165,8; 198,5 | Vigente v1; se conserva. AR2605183; OT/2026/AR2605183.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605183. |

### UGARTE SARO, AIDA — 054529

Ficha: `ugarte-saro-aida`. Histórico: **0 líneas / 0 pedidos**. PDF producidos adicionales examinados: 2. Alta propuesta.

Código acreditado por GET RPS pedido PDF producido (AR2605055). Nombres/alias del histórico: UGARTE SARO, AIDA.

Plantillas encontradas: ninguna con identidad acreditada en el inventario de PL.

No hay una regla fija de cliente acreditada; se propone la identidad y solo las medidas que constan.

Medidas propuestas; todas las posiciones son cm sobre la lona hecha.

| Tipo; remolque largo × ancho | Delante | Detrás | Laterales (atrás → delante) | Evidencia y elección |
| --- | --- | --- | --- | --- |
| baqueton; 246 × 144 | 2,5; 37,5; 72,5; 107,5; 142,5 | 2,5; 37,5; 72,5; 107,5; 142,5 | 2,5; 37,1; 71,6; 106,2; 140,8; 175,4; 209,9; 244,5 |  AR2604869; OT/2026/AR2604869.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2604869. |
| baqueton; 252 × 150 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 39; 75,5; 112; 148,5 | 2,5; 37,9; 73,4; 108,8; 144,2; 179,6; 215,1; 250,5 |  AR2605055; OT/2026/AR2605055.pdf; mayoría de pedidos. Variantes: 1 pedido(s): AR2605055. |

## Apéndice: inventario completo de plantillas

Todas las fuentes siguientes se abrieron en solo lectura. Las copias, recuperados y carpetas antiguas se incluyen en el inventario; su presencia no las convierte en una regla actual. Los SHA-256 y las notas extraídas están en evidencias.json.

- `PL/REMOLQUE MACHADO-CAMACHO (ANTIGUO MALDONADO).dwg`: 24 textos leídos.
- `PL/AR2005931.dwg`: 27 textos leídos.
- `PL/INBA.dwg`: 192 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/AR1505353-2.xls`: 2 hojas leídas.
- `PL/AR1903899.dwg`: 32 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/AR0906906-1.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/GANADO2,50X1,40 ARQU.NORMAL(REMOLCAR).dwg`: 0 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/ESVA( GANADERO 1300).dwg`: 31 textos leídos.
- `PL/REMOLQUES GANADO/MUESTRA3.dwg`: 88 textos leídos.
- `PL/AR1807168.dwg`: 45 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES(CM)(RECOGER DELANTE Y ATRAS) M2.xls`: 2 hojas leídas.
- `PL/BAQUETON.DWG`: 185 textos leídos.
- `PL/MALLON.dwg`: 491 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/CANO MUÑOZ.xls`: 2 hojas leídas.
- `PL/REMOLCAR/MEDIDAS OLLAOS NUEVAS/320X160.doc`: DOC leído.
- `PL/CALCULOS REMOLQUES/PEDIDO 2/AR1601566-1.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/remolques especiales/CON CORDA FRUNCIDA.dwg`: 14 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/GL1,5.dwg`: 46 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/J&B O CON CREMALLERA ATRÁS.xls`: 2 hojas leídas.
- `PL/J.CARBALLO.dwg`: 129 textos leídos.
- `PL/REMOLQUES GANADO/FERRODEZA/FERRODEZA CABALOS-GANADO REF 1500 BAIXO (SIN PUERTA).dwg`: 50 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES(CM)(RECOGER DELANTE Y ATRAS) M2.xls`: 2 hojas leídas.
- `PL/OLLAOS/REMOLQUILLEROS.doc`: DOC leído.
- `PL/CALCULOS EXCEL2/TOLDOS/ART325 INCLUIDA.xls`: 4 hojas leídas.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/J&B O CON CREMALLERA ATRÁS Y DELANTE.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR_CABALLOS_275_x_160_arquillo_reforzado.dwg`: 13 textos leídos.
- `PL/METALURGICAS NORTE/NORTE.dwg`: 535 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUES GOMA- CREMALLERA - VELCRO.xls`: 2 hojas leídas.
- `PL/SANTABALLA/RUEDA SANTABALLA.dwg`: 34 textos leídos.
- `PL/IBERICA DE REMOLQUES.dwg`: 31 textos leídos.
- `PL/REMOLQUES GANADO/inca.dwg`: 0 textos leídos.
- `PL/METALURGICAS NORTE/NORTE2.DWG`: 346 textos leídos.
- `PL/BOLUCI(VULCANO).dwg`: 5 textos leídos.
- `PL/JUAN FERNANDEZ(CACERES).dwg`: 28 textos leídos.
- `PL/REMOLQUES GANADO/FERRODEZA/FERRODEZA_GANADERO_1250_KG.dwg`: 21 textos leídos.
- `PL/REMOLQUES GANADO/MEDI.dwg`: 38 textos leídos.
- `PL/METALURGICAS PEREZ.dwg`: 12 textos leídos.
- `PL/Dibujo4_recover.dwg`: 34 textos leídos.
- `PL/SEVENTEEN.dwg`: 53 textos leídos.
- `PL/LUIS MIGUEL DE CELIS2_recover.dwg`: 71 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLQUE 300X150 ECONOMICO OBSOLETO.dwg`: 74 textos leídos.
- `PL/ARCOS REMOLQUES.dwg`: 120 textos leídos.
- `PL/DONO.dwg`: 128 textos leídos.
- `PL/EDER ELECTRO MECANICAS.dwg`: 126 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES HIJOS DE PEDRO LOPEZ(CM) DELANTE Y ATRAS.xls`: 2 hojas leídas.
- `PL/ESVA/ESVA.DWG`: 694 textos leídos.
- `PL/LUIS MIGUEL DE CELIS2.dwg`: 97 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/GANADERO RECTO 250 X 1400.dwg`: 27 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/BAQUETON.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR_GANADO_275_X_160_ARQUILLO_REFORZADO.dwg`: 8 textos leídos.
- `PL/CANO MUÑOZ(METALCAR)/CANO BAQUETON.xls`: 2 hojas leídas.
- `PL/NUÑEZ(TUBILLA-BURGOS)(remolquesnuñez.com)4.DWG`: 564 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR  GANADO 300 X 160 ARCO REFORZADO.dwg`: 14 textos leídos.
- `PL/GEMMA NUÑEZ MARTIN (REMOLKEA).dwg`: 179 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUES BAQUETON (NUEVO).xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUES CONFIRMADOS/CABALLOS 300 x160 TABLERO POLIESTER.dwg`: 35 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/J&B O CON CREMALLERA ATRÁS Y DELANTE.xls`: 2 hojas leídas.
- `PL/general wolder.DWG`: 371 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUE GANADO 3X160M ALTURA CABALLOS.dwg`: 60 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUE 3M ECO 3X150 (BUENO).dwg`: 102 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/EJEM.ARCO EN  SENTIDO CONTRARIO.xls`: 2 hojas leídas.
- `PL/OLLAOS/OLLAOS REMOLQUES.doc`: DOC leído.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/GANADERO 1 RECTO 300 X 145.dwg`: 25 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUES PUENTES ESVA.xls`: 2 hojas leídas.
- `PL/ESVA/ESVA_recover.dwg`: 571 textos leídos.
- `PL/REMOLQUES ALCES.DWG`: 102 textos leídos.
- `PL/ADELINA LEÓN PÉREZ -REMOLQUES YAGUE.dwg`: 350 textos leídos.
- `PL/CALCULOS REMOLQUES/AR1505353-2.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/ALCE-GANADO.dwg`: 11 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/AR0906906-1.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/JB/RANCHERO II LARGO.dwg`: 83 textos leídos.
- `PL/ESVA/LONA CHURRERIA.dwg`: 118 textos leídos.
- `PL/REMOLQUES GANADO/AR1502785-7.xls`: 2 hojas leídas.
- `PL/FERRODEZA (GONZALOMERZA)2.DWG`: 172 textos leídos.
- `PL/REMOLQUES GANADO/LUIS MIGUEL DE CELIS.DWG`: 72 textos leídos.
- `PL/CALCULOS REMOLQUES/BAQUETÓN (HIJOS DE PEDRO LOPEZ).xls`: 2 hojas leídas.
- `PL/AYALA/AYALA.dwg`: 659 textos leídos.
- `PL/ALBERTO PACIN.dwg`: 6 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/BAQUETON.xls`: 2 hojas leídas.
- `PL/CALCULOS REMOLQUES/PEDIDO 2/AR1601566-2.xls`: 2 hojas leídas.
- `PL/J&J(BURGOS).dwg`: 11 textos leídos.
- `PL/HIJOS DE PEDRO LOPEZ/HIJOS DE PEDRO LOPEZ2.DWG`: 162 textos leídos.
- `PL/REMOLQUES GANADO/MUESTRA.dwg`: 277 textos leídos.
- `PL/BAQUETON2.dwg`: 62 textos leídos.
- `PL/CALCULOS REMOLQUES/PEDIDO/AR1601575.dwg`: 23 textos leídos.
- `PL/NL.DIGITAL/NL.DIGITAL.dwg`: 2346 textos leídos.
- `PL/AR1901084.dwg`: 32 textos leídos.
- `PL/CANO MUÑOZ(METALCAR)/Copia de CANO BAQUETON.xls`: 2 hojas leídas.
- `PL/CANO MUÑOZ(METALCAR)/REMOLQUES CANO(METALURGIA Y CARROCERIAS).dwg`: 289 textos leídos.
- `PL/ESVA/ARCO NUEVO.dwg`: 73 textos leídos.
- `PL/GONZALEZ (CAMPORRAPADO-BOQUEIXO).dwg`: 4 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/GANADERO 1 RECTO 280 X 145.dwg`: 21 textos leídos.
- `PL/CALCULOS EXCEL2/etiquetas/ETIQUETAS14.xls`: 4 hojas leídas.
- `PL/REMOLQUES GANADO/MUESTRA_recover.dwg`: 77 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES ATRÁS M2 CM.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/AR1502785-2.xls`: 2 hojas leídas.
- `PL/MATOVA (AGRICOLA).dwg`: 7 textos leídos.
- `PL/REMOLQUES GANADO/TALLERES CAL/REF 280 X 140.dwg`: 187 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUES PUENTES(LATERALES ESVA)CM M2.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/AR1502785-4.xls`: 2 hojas leídas.
- `PL/ALDIPE.dwg`: 186 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR_CABALLOS_275_x_160_arquillo_reforzadofdf.dwg`: 13 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUES PUENTES HIJOS DE PEDRO LOPEZ(CM).xls`: 2 hojas leídas.
- `PL/CALCULOS REMOLQUES/PEDIDO/AR1601575.xls`: 2 hojas leídas.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUES BAQUETON AYALA.xls`: 2 hojas leídas.
- `PL/CALCULOS EXCEL2/TOLDOS/T.f - MODELO ART 325(BIEN).xls`: 4 hojas leídas.
- `PL/REMOLQUES AGRONALON.dwg`: 72 textos leídos.
- `PL/ROMAY2.DWG`: 67 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/GANADERO CM.dwg`: 69 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES(CM)(RECOGER DELANTE Y ATRAS).xls`: 2 hojas leídas.
- `PL/LOMBREBA2.DWG`: 97 textos leídos.
- `PL/CERRAJERIA MALDONADO.DWG`: 90 textos leídos.
- `PL/CALCULOS EXCEL2/TOLDOS/TOLDOS.xls`: 5 hojas leídas.
- `PL/CAREDU(INDUVEC).dwg`: 142 textos leídos.
- `PL/CARROCERIAS CAYVOL.dwg`: 16 textos leídos.
- `PL/HIJOS DE PEDRO LOPEZ/HIJOS DE PEDRO LOPEZ.DWG`: 798 textos leídos.
- `PL/ESVA/GL1,5 ESPECIAL.dwg`: 49 textos leídos.
- `PL/TALLERES ORENSANOS.dwg`: 6 textos leídos.
- `PL/AR2103992.dwg`: 30 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/ESVA GL1.DWG`: 126 textos leídos.
- `PL/JUAN FERNANDEZ.dwg`: 62 textos leídos.
- `PL/TALLERES CARBAJO.dwg`: 217 textos leídos.
- `PL/CALCULOS REMOLQUES/CANO MUÑOZ.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/TALLERES CAL/ref 260 x120.dwg`: 30 textos leídos.
- `PL/TALLERES CAL2.DWG`: 624 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES ATRÁS M2 CM.xls`: 2 hojas leídas.
- `PL/CALCULOS EXCEL2/REMOLQUES ORIGINALES EN CM/COBELO.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/TALLERES CAL/AR2103811-2.dwg`: 116 textos leídos.
- `PL/CALCULOS REMOLQUES/REMOLQUES BAQUETON (NUEVO).xls`: 2 hojas leídas.
- `PL/CALCULOS REMOLQUES/PEDIDO 5/AR1601590.xls`: 2 hojas leídas.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES BAQUETÓN(ANTERIOR).xls`: 2 hojas leídas.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES HIJOS DE PEDRO LOPEZ(CM) DELANTE Y ATRAS.xls`: 2 hojas leídas.
- `PL/CALCULOS REMOLQUES/REMOLQUES GOMA- CREMALLERA - VELCRO.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/AR1505274.dwg`: 18 textos leídos.
- `PL/CALCULOS REMOLQUES/PEDIDO 4/AR1601591.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/FERRODEZA/FERRODEZA REF.1050 REDONDO.dwg`: 82 textos leídos.
- `PL/ESVA/REMOLQUES DE GANADO CONFIRMADOS/REMOLQUE GANADERO GL-14 (ARCO NUEVO).dwg`: 79 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/GANADERO II (1500).dwg`: 263 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/GANADERO 2 RECTO 2930 X 154.dwg`: 26 textos leídos.
- `PL/ESVA/2800 X 1500.dwg`: 34 textos leídos.
- `PL/SEREN.dwg`: 0 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/remolques baqueton (CM).xls`: 2 hojas leídas.
- `PL/MARIA GIL (ARES).dwg`: 172 textos leídos.
- `PL/COBELO (RVG)-2.DWG`: 1082 textos leídos.
- `PL/CALCULOS REMOLQUES/REMOLQUES PUENTES(LATERALES ESVA)CM M2.xls`: 2 hojas leídas.
- `PL/HIJOS DE PEDRO LOPEZ/RECOGE CON GANCHOS CORAZÓN.dwg`: 138 textos leídos.
- `PL/CALCULOS EXCEL2/MEDIDASestructura.xls`: 2 hojas leídas.
- `PL/JOSE MANUEL LOURES.dwg`: 0 textos leídos.
- `PL/CARROCERIAS VALLEJO.dwg`: 120 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES CON CREMALLERA ATRÁS M2 CM.xls`: 2 hojas leídas.
- `PL/CURVAS BERGONDO.dwg`: 25 textos leídos.
- `PL/PAMILAKAN/PAMILAKAN SAS.dwg`: 760 textos leídos.
- `PL/CALCULOS EXCEL2/PROGRAMA ELIT MOTORIZADO DICIEMBRE 2002.xls`: 2 hojas leídas.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/remolques(NORMAL) CM.xls`: 2 hojas leídas.
- `PL/AR2305318.dwg`: 735 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/ESVA GANADERO I.dwg`: 12 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/AR19N00350-2.xls`: 2 hojas leídas.
- `PL/AR2103242.dwg`: 60 textos leídos.
- `PL/TALLERES DE LA AZABA.dwg`: 56 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/EJEM.ARCO EN  SENTIDO CONTRARIO.xls`: 2 hojas leídas.
- `PL/FOTOS VARIAS/FOTOS REMOLQUES NUÑEZ/AR1905054.dwg`: 69 textos leídos.
- `PL/LOUREIRO REIS.dwg`: 12 textos leídos.
- `PL/CALCULOS REMOLQUES/PEDIDO 3/AR16N00145.dwg`: 68 textos leídos.
- `PL/KARGO.dwg`: 22 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUE 300X160 ESTANDAR.dwg`: 207 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/ESVA CABALLOS II (1500).dwg`: 24 textos leídos.
- `PL/CALCULOS EXCEL2/PROGRAMA DESCOMPTES ELIT CENADOR PAGODA.XLS`: 4 hojas leídas.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUE.G3M.FINAL.xlsb`: 7 hojas leídas.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/CONTORNO.xls`: 3 hojas leídas.
- `PL/HIJOS DE JEREMIAS.dwg`: 6 textos leídos.
- `PL/ESVA/REMOLQUE CON GOMA FRUNCIDA PARA ABRAZAR TUBOS.dwg`: 71 textos leídos.
- `PL/REMOLQUES TARRAGONA.dwg`: 67 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/remolques(NORMAL) M2 CM.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/TALLERES CAL/REF 280 X 154.dwg`: 159 textos leídos.
- `PL/REMOLQUES GANADO/AR1502785.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/remolcar CABALLOS 3x1,60 arquillo reforzado.dwg`: 18 textos leídos.
- `PL/ESVA/ESVA3.DWG`: 572 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/remolques(NORMAL) M2 CM.xls`: 2 hojas leídas.
- `PL/T.dwg`: 17 textos leídos.
- `PL/REMOLQUES GANADO/TALLERES CAL/REF 280 X 130.dwg`: 25 textos leídos.
- `PL/INCAR (EURO REMOLQUE)/FOTOS AR2306267/AR2306267.dwg`: 631 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/GANADERO 2 RECTO 2930 X 1700.dwg`: 51 textos leídos.
- `PL/REMOLQUES GANADO/1500.dwg`: 0 textos leídos.
- `PL/LAMEIRO.dwg`: 6 textos leídos.
- `PL/CALCULOS EXCEL2/TOLDOS/TOLDOS2.xls`: 4 hojas leídas.
- `PL/INCAR (EURO REMOLQUE)/INCAR (EURO REMOLQUE).DWG`: 534 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUES CONFIRMADOS/CABALLOS 300X140 TABLERO.dwg`: 63 textos leídos.
- `PL/TALLERES IGLESIAS.dwg`: 0 textos leídos.
- `PL/HNOS. SANCHES-LAFUENTE/HNOS.SANCHEZ-LAFUENTE.dwg`: 527 textos leídos.
- `PL/gozlez(tordoia).dwg`: 68 textos leídos.
- `PL/CALCULOS EXCEL2/aguas.xls`: 3 hojas leídas.
- `PL/CALCULOS EXCEL2/etiquetas/TOLDOS.NET.xls`: 4 hojas leídas.
- `PL/CALCULOS EXCEL2/TOLDOS/ART325 NO INCLUIDA.xls`: 4 hojas leídas.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES BAQUETÓN(ANTERIOR).xls`: 2 hojas leídas.
- `PL/CARAVANAS CARBON.dwg`: 0 textos leídos.
- `PL/TRIÑANES.dwg`: 18 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES(CM) RECOGER ATRAS.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/TALLERES CAL/ref 300x154.dwg`: 42 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR GANADO 250 X 140 ARQUILLO REFORZADO.dwg`: 11 textos leídos.
- `PL/CALCULOS REMOLQUES/PEDIDO 2/AR1601566.dwg`: 27 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUES CONFIRMADOS/REMOLQUE CABALLOS 300 x160 TABLERO ATRÁS BAJA 10 CM.dwg`: 89 textos leídos.
- `PL/AR19N00027.dwg`: 30 textos leídos.
- `PL/HIJOS DE LORENZO GONZALEZ.dwg`: 0 textos leídos.
- `PL/CALCULOS REMOLQUES/REMOLQUES PUENTES ESVA.xls`: 2 hojas leídas.
- `PL/REGO DOS SANTOS.dwg`: 95 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLCAR CABALLOS 250 X 140 ARQUILLO REFORZADO.dwg`: 14 textos leídos.
- `PL/CALCULOS REMOLQUES/GENERAL WOLDER.xls`: 2 hojas leídas.
- `PL/CARAVANAS VINALOPO.dwg`: 55 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES CON CREMALLERA ATRÁS M2 CM.xls`: 2 hojas leídas.
- `PL/(CARMA) CARLOS LOPEZ LEIRO.dwg`: 149 textos leídos.
- `PL/INDUVISA(padron).dwg`: 40 textos leídos.
- `PL/CALCULOS EXCEL2/etiquetas/LOLA.xls`: 4 hojas leídas.
- `PL/METALURGICAS NORTE/_CLOSE.dwg`: 333 textos leídos.
- `PL/REMOLQUES GANADO/remolques especiales/remolque con puerta trasero (como tienda de campaña).dwg`: 9 textos leídos.
- `PL/CALCULOS EXCEL2/etiquetas/LOLA2.xls`: 4 hojas leídas.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/ESVA_CABALLOS_II_1600(ANTIGUO).dwg`: 20 textos leídos.
- `PL/REMOLCAR/REMOLCAR.dwg`: 1393 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/ESVA GANADERO II 1600.dwg`: 59 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/BAQUETÓN (3GM).xls`: 3 hojas leídas.
- `PL/SANTABALLA_recover.dwg`: 303 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/AR1504122.dwg`: 18 textos leídos.
- `PL/T.CASAL.dwg`: 47 textos leídos.
- `PL/SANTABALLA.dwg`: 579 textos leídos.
- `PL/REMOLQUES GANADO/AR1502785-6.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/Ganadero CM de ESVA (AR1503588).dwg`: 69 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/remolques baqueton (CM).xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/AR1502785-3.xls`: 2 hojas leídas.
- `PL/REMOLQUES RODRIGUEZ.dwg`: 23 textos leídos.
- `PL/J&B.dwg`: 177 textos leídos.
- `PL/CALCULOS EXCEL2/TOLDOS/TOLDOS2(BAMBNO).xls`: 4 hojas leídas.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/remolques(NORMAL) CM.xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/REMOLQUES NUÑEZ (TUBILLA)/REMOLQUES NUÑEZ VAN-1.dwg`: 25 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/REMOLQUES PUENTES HIJOS DE PEDRO LOPEZ(CM)2.xls`: 2 hojas leídas.
- `PL/CALCULOS REMOLQUES/PEDIDO 4/AR1601591.dwg`: 14 textos leídos.
- `PL/REMOLQUES HNOS.CERVERA.dwg`: 138 textos leídos.
- `PL/REMOLQUES GANADO/REMOLCAR/Nueva carpeta (ANTIGUOS NO SE UTILIZAN)/REMOLQUE 300X150 ECONOMICO (MODIFICADO) OBSOLETO.dwg`: 83 textos leídos.
- `PL/CALCULOS EXCEL2/etiquetas/ETIQUETAS14N.xls`: 4 hojas leídas.
- `PL/NUÑEZ PICA.dwg`: 58 textos leídos.
- `PL/REMOLQUES GANADO/JB/RANCHERO I (1300).dwg`: 151 textos leídos.
- `PL/AR2002470.dwg`: 68 textos leídos.
- `PL/REMOLQUES GANADO/INCAR GANADO 300 X 160.dwg`: 11 textos leídos.
- `PL/REMOLQUES GANADO/1500..dwg`: 0 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES(CM)(RECOGER DELANTE Y ATRAS).xls`: 2 hojas leídas.
- `PL/FERRODEZA (GONZALOMERZA).dwg`: 29 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/J&B O CON CREMALLERA ATRÁS.xls`: 2 hojas leídas.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/Nueva carpeta/CONTORNO.xls`: 3 hojas leídas.
- `PL/REMOLCAR/REJILLA.dwg`: 26 textos leídos.
- `PL/CALCULOS REMOLQUES/PEDIDO 5/AR1601590.dwg`: 20 textos leídos.
- `PL/REMOLQUES MB3.dwg`: 36 textos leídos.
- `PL/RAMON GIRON.dwg`: 16 textos leídos.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/GENERAL WOLDER.xls`: 2 hojas leídas.
- `PL/CALCULOS REMOLQUES/REMOLQUES PUENTES HIJOS DE PEDRO LOPEZ(CM).xls`: 2 hojas leídas.
- `PL/AJALVIR/AJALVIR.dwg`: 84 textos leídos.
- `PL/CALCULOS REMOLQUES/Nueva carpeta/REMOLQUES PUENTES(CM) RECOGER ATRAS.xls`: 2 hojas leídas.
- `PL/CALCULOS EXCEL2/CALCULOS REMOLQUES/BAQUETÓN (HIJOS DE PEDRO LOPEZ).xls`: 2 hojas leídas.
- `PL/REMOLQUES GANADO/REMOLCAR/REMOLQUES GANADO NUEVOS/REMOLQUE GANADO 300 x160 TABLERO ATRÁS BAJA 10 CM.dwg`: 85 textos leídos.
- `PL/JALON.dwg`: 245 textos leídos.
- `PL/REMOLQUES GANADO/AR1502785-5.xls`: 2 hojas leídas.
- `PL/ALBERTO SANCHEZ SERRANO.dwg`: 30 textos leídos.
- `PL/REMOLQUES GANADO/ESVA/Nueva carpeta/ESVA_CABALLOS_II_1600.dwg`: 32 textos leídos.

## Apéndice: plantillas de cliente sin código confirmado

Estas identidades no están acreditadas en los 276 clientes del histórico. Requieren un pedido RPS o confirmación de su nombre/alias actual; no se asignan a otro cliente solo por el apellido.

- `PL/INBA.dwg`: BASTILLA DE ENFUNDAR (10 CM)
- `PL/BOLUCI(VULCANO).dwg`: HAY CURVA(PREGUNTAR)
- `PL/JUAN FERNANDEZ(CACERES).dwg`: - pone 4 ganchos a lo largo del remolque / - cuando solo se daban 2 cm de aumento al largo le quedo algo justo. sin embargo al ancho tambien le quedo justo Â¡Â¡ cuidadoÂ¡Â¡
- `PL/METALURGICAS PEREZ.dwg`: sin una asociación RPS acreditada.
- `PL/SEVENTEEN.dwg`: OLLAOS REPARTIDOS
- `PL/ARCOS REMOLQUES.dwg`: CONTORNO RECOLLE / CONTORNO NON RECOLLE / ALTURA ORELLA + 1 / CARLOS LOPEZ LEIRO
- `PL/DONO.dwg`: CASI SIEMPRE PIDE VENTANA / LAS LONA DE GANADO LLEVAN LA CURVA DEL GANADO 1 / LOS PEDIDOS CON LAS MEDIDAS ESTAN EN ; C - DISCODUROALBERTO -  DIBuJOS IMPORTANTES - LONAS GANADO
- `PL/EDER ELECTRO MECANICAS.dwg`: AZUL EUROPA LONA 2ª CALIDAD 500-700GR (ANCHO 320 CM PREGUNTAR) / SE PUEDE UTILIZAR LONA DE VESTAS (550 GR) / SE ESTAN HACIENDO DE LA LONA CFR 550 GR AZUL 5003 (VESTAS) HASTA QUE SE TERMINE; ESTAS LONAS NO LLEVAN OLLAOS
- `PL/ESVA/ESVA.DWG`: CUANDO PASA DE 60 CM DE ALTO SIEMPRE CON PUENTES; NORMALMENTE GRISES / CUANDO  RECOGE LATERALES CON PUENTES METER LOS PUENTES EN EL LATERAL (TIPO HIJO PEDRO LOPEZ (SOLO DELANTE) / NO PONER CUÑOS TGM / RECOGE LATERALES
- `PL/ESVA/ESVA_recover.dwg`: CUANDO PASA DE 60 CM DE ALTO SIEMPRE CON PUENTES; NORMALMENTE GRISES / CUANDO  RECOGE LATERALES CON PUENTES METER LOS PUENTES EN EL LATERAL (TIPO HIJO PEDRO LOPEZ (SOLO DELANTE) / NO PONER CUÑOS TGM / RECOGE LATERALES
- `PL/REMOLQUES ALCES.DWG`: CON CURVA DE "120 CM" / CON CURVA DE "140 CM" / -TIENE 2 TIPOS DE ARCOS SEGUN MEDIDA; -TIENE MUESTRA DE GANCHOS; -NORMALMENTE  CREMALLERA; -NORMALMENTE COLOR AZUL; -CAIDA ESTANDAR 55 CM; - INTENTAR HACER LONAS DE LA MEDIDA QUE PIDE / PARA 120 CM DE ANCHO
- `PL/ESVA/LONA CHURRERIA.dwg`: NO RECORTAR PARA BASTILLA / 4 CORREAS CUERO ; HEBILLA - NEGRO 55 CM / LAS CORREAS VAN SUELTAS, NORMALMENTE DE CUERO, PUEDEN IR TAMBIÉN EN PVC / PVC RECORD 580 GR GRIS 7038
- `PL/ALBERTO PACIN.dwg`: sin una asociación RPS acreditada.
- `PL/J&J(BURGOS).dwg`: sin una asociación RPS acreditada.
- `PL/ESVA/ARCO NUEVO.dwg`: GANADERO GL-1 ESPECIAL (132) ARCO NUEVO (AR1506680) / 2800 X 1500 ARCO NUEVO
- `PL/GONZALEZ (CAMPORRAPADO-BOQUEIXO).dwg`: sin una asociación RPS acreditada.
- `PL/MATOVA (AGRICOLA).dwg`: sin una asociación RPS acreditada.
- `PL/REMOLQUES AGRONALON.dwg`: sin una asociación RPS acreditada.
- `PL/LOMBREBA2.DWG`: sin una asociación RPS acreditada.
- `PL/CARROCERIAS CAYVOL.dwg`: LOS HACE DE TODOS LO COLORES
- `PL/ESVA/GL1,5 ESPECIAL.dwg`: GANADERO GL-1 (132) ARCO NUEVO (AR1506680) / PUERTA TRASERA BAJA MÁS
- `PL/TALLERES ORENSANOS.dwg`: VERDE 165; CURVA  6 CM RADIO / GANCHOS: ; LATERALES, DELANTERA Y TRASERA: 1º A 10 CM RESTO A 30 CM
- `PL/JUAN FERNANDEZ.dwg`: - pone 4 ganchos a lo largo del remolque / - cuando solo se daban 2 cm de aumento al largo le quedo algo justo. sin embargo al ancho tambien le quedo justo Â¡Â¡ cuidadoÂ¡Â¡
- `PL/ESVA/REMOLQUES DE GANADO CONFIRMADOS/REMOLQUE GANADERO GL-14 (ARCO NUEVO).dwg`: B.N.(3) + OLLAOS / CON PUENTES ATRÁS Y LATERAL / TOLDO GANADERO GL-14 (ARCO NUEVO) / MATERIALES 580 GR GRIS 7038
- `PL/ESVA/2800 X 1500.dwg`: sin una asociación RPS acreditada.
- `PL/SEREN.dwg`: sin una asociación RPS acreditada.
- `PL/MARIA GIL (ARES).dwg`: sin una asociación RPS acreditada.
- `PL/JOSE MANUEL LOURES.dwg`: sin una asociación RPS acreditada.
- `PL/CURVAS BERGONDO.dwg`: sin una asociación RPS acreditada.
- `PL/TALLERES DE LA AZABA.dwg`: HASTA PIDIO UNO GRIS Y UNO AZUL / ALTO: 45 CM DELANTE EN LINEA; 70 CM ATRÁS NO EN LINEA / ANCHO: 25 CM DELANTE; 115 CM ATRÁS
- `PL/KARGO.dwg`: sin una asociación RPS acreditada.
- `PL/HIJOS DE JEREMIAS.dwg`: sin una asociación RPS acreditada.
- `PL/ESVA/REMOLQUE CON GOMA FRUNCIDA PARA ABRAZAR TUBOS.dwg`: CAPUCHÓN CON VELVRO / CORTAR Y COSER CAPUCHÓN / ESQUINAS SIN CERRAR / ESQUINAS CERRADAS
- `PL/ESVA/ESVA3.DWG`: CUANDO PASA DE 60 CM DE ALTO SIEMPRE CON PUENTES; NORMALMENTE GRISES / CUANDO  RECOGE LATERALES CON PUENTES METER LOS PUENTES EN EL LATERAL (TIPO HIJO PEDRO LOPEZ (SOLO DELANTE) / NO PONER CUÑOS TGM / RECOGE LATERALES
- `PL/LAMEIRO.dwg`: sin una asociación RPS acreditada.
- `PL/TALLERES IGLESIAS.dwg`: sin una asociación RPS acreditada.
- `PL/gozlez(tordoia).dwg`: sin una asociación RPS acreditada.
- `PL/CARAVANAS CARBON.dwg`: sin una asociación RPS acreditada.
- `PL/TRIÑANES.dwg`: NORMALMENTE  LOS PIDE DE BAQUETON; ; NO TIENE  MUESTRA  ARCO
- `PL/HIJOS DE LORENZO GONZALEZ.dwg`: sin una asociación RPS acreditada.
- `PL/REGO DOS SANTOS.dwg`: sin una asociación RPS acreditada.
- `PL/CARAVANAS VINALOPO.dwg`: a veces los pide con aguas (10cm) en esquina; y otras en esquina planos; normalmente llevan cremallera; y de colores varios
- `PL/INDUVISA(padron).dwg`: CON CURVA Y 10 CM DE AGUAS
- `PL/REMOLQUES RODRIGUEZ.dwg`: sin una asociación RPS acreditada.
- `PL/J&B.dwg`: SOLO DAR AUMENTO PARA COSER. EL YA LE DA LOS AUMENTOS DE HOLGURA.; NORMALMENTE 2 CM AL ANCHO Y 2 AL LARGO (preguntar) / LA MEDIDAS STANDAR DE  LA ALTURA SON:; PEQUENA=BAQUETON; MEDIANA=52 CM; ALTURA=95 CM / NO PONER CUÑOS TGM; RECOGEN CON CREMALLERA (NORMALMENTE DE 6 - SI PIDE ANCHA ES DE 9) / OVEJAS - SIN CREMALLERA - VELCRO DELANTE - FIJA ATRÁS
- `PL/NUÑEZ PICA.dwg`: sin una asociación RPS acreditada.
- `PL/REMOLQUES MB3.dwg`: RECOLLE CON GOMA; AGUAS 7 CM; CURVA - TRUNQUE (HIJOS DE PEDRO LOPEZ); AZUL 5015
- `PL/RAMON GIRON.dwg`: sin una asociación RPS acreditada.
- `PL/ALBERTO SANCHEZ SERRANO.dwg`: ALBERTO SANCHEZ SERRANO; ; NORMALMENTE SIN CURVA, SI LA LLEVA YA DICEN CUAL ES; ; OLLAOS REPARTIDOS

J&B.dwg contiene cinco repartos escritos «laterales desde delante»: 115×93,5; 150×114,5; 200×131; 230×131; 260×131. Se conserva el texto en evidencias.json; no se carga hasta confirmar cliente, tipo y longitud hecha. Al hacerlo se invierte toda la lista con L_hecha − posición y se ordena de atrás a delante, sin cambiar los huecos.

EDER ELECTRO MECÁNICAS indica expresamente que sus lonas no llevan ollaos. FichaCliente no tiene un estado «sin ollaos» que impida un reparto genérico, y validarFichas rechaza una medida con los tres lados vacíos: no se finge un reparto de ceros ni se marca repartidos.

## Comprobaciones

La prueba scripts/fichas-propuestas.test.ts valida el JSON completo con validarFichas, acredita la cobertura de códigos y comprueba la conservación del registro leído. scripts/fichas-remolques.test.js cubre centrado, inversión, comparación sin duplicar pedidos, recencia sin mayoría, ensayo sin escrituras, altas por POST, cambios por PUT con versión y parada en conflicto. El resultado de la suite completa, TypeScript y lint se comunica con el commit al coordinador.
