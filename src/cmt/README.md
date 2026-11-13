# Conversión CMT en memoria

`dxfACmt(texto, {rutaFuente?, compatibilidadRobot?, sinLeyenda?, sinTextos?, rutasFuentesReserva?, preparacionMtext?})`
convierte un DXF decodificado en memoria. Devuelve `{cmt, objetos, avisos, dudas}`;
`cmt` es null si existen dudas. No escribe ficheros ni accede a producción.
El llamante puede decodificar UTF-8/Windows-1252 con `textoDxf` de `src/cmtPiloto.js`.

## Preparación para corte

Desde la decisión de Oficina Técnica del 13/11/2026, **MTEXT se descompone por
defecto**. `preparacionMtext:'textos'` es el valor implícito. No hay caída a la
colocación de Inkscape para otros anclajes o formatos. `directa` se conserva solo
como comparación explícita del flujo antiguo; la página y el piloto no la usan.
Esa opción afecta únicamente a MTEXT: los TEXT normales siguen las reglas CAD.

INSERT se expande por su base, escala afín completa, giro y anidación. La capa 0
hereda la del INSERT; las otras permanecen, incluida marca. Los ATTRIB visibles
se convierten a TEXT en coordenadas del padre; se omiten los invisibles y no se
duplican los ATTDEF variables. Las cotas DIMENSION usan su bloque anónimo cuando
está presente. SOLID conserva su perímetro. Las polilíneas 2D se convierten por
sus tramos rectos y arcos; después el escritor conserva la unión de trazados.
Se omiten POINT, tramos de longitud cero y HATCH/WIPEOUT/IMAGE/VIEWPORT con aviso.
El espacio papel se excluye antes de expandir los bloques.

Los avisos de descomposición se agregan por tipo: un resumen de bloques/cotas/
polilíneas y otro de textos de varias líneas, sin un aviso por cada MTEXT o INSERT.
Las referencias de herramienta siguen dependiendo de las capas contrastadas:
DISCO1, DISCO2, CUTTER, ROTULADOR/TALADRO. Una capa marca no se cambia a ROTULADOR.

## MTEXT y fuentes

La colocación conserva el ancla medida en AR2601895: se mide el cuadro a h/cap
(cap es la altura de H de la fuente) y cada TEXT resultante se dibuja a h. ZWCAD
confirma que el avance para repartir líneas se mide **sin kerning**; el kerning
se aplica al dibujar el TEXT. La regla antigua con kerning y un espacio adicional
acertaba en ese pedido por compensación. El reparto actual conserva sus 166/166
contornos, y además los párrafos contrastados de AR2601766, AR2603514 y AR2603750.

Se incluyen los nueve anclajes, límites de tinta para justificar cada línea,
ancho 41 por palabras (cero no pliega), párrafos y altura total. Se lee el
XRECORD ACAD_MTEXT_2008_RT: puede conservar una justificación que no está en el
dato 1 del MTEXT. El giro usa el último 50 o vector 11/21; no exige módulo unitario.
La normal −Z refleja el conjunto. El interlineado base es 5h/3 multiplicado por 44;
«al menos» conserva exactamente T_i + 2h/3 con factor 1, y «exacto» separa bases.

El parser usa una pila para los grupos de formato. Reconoce P/N/^J, espacios
protegidos, barras y llaves escapadas, Unicode, f/F, H absoluta y relativa, W/T/Q/A,
colores C/c y símbolos %%c/%%d/%%p. Las rayas L/O/K y %%u/%%o se omiten con aviso.
Las fracciones S producen numerador/denominador reducidos y líneas cuando procede.
Los cambios de tamaño y fuente intervienen en el reparto y altura de la línea.

Arial se busca por `rutaFuente`, `CMT_ARIAL_PATH` o, en Windows,
`C:/Windows/Fonts/arial.ttf`. Las TTF de STYLE y los controles de fuente se buscan
junto a esa fuente; nunca se siguen rutas externas contenidas en el DXF. Una
fuente ausente, incluida una SHX sin lector, se sustituye por Arial y se avisa.
Las leyendas txt.shx contrastadas tienen margen cero y altura nominal h; no se
certifican avances o anclajes complejos de SHX desconocidas.

Los glifos ausentes se buscan por orden en `rutasFuentesReserva` o
`CMT_FUENTES_RESERVA` (separador de rutas del sistema). Windows prueba Lucida Sans
Unicode por defecto, contrastada para ∅. `[]` desactiva las reservas. Sin Lucida,
∅ se omite con aviso y mantiene su avance medido de 0,97607421875 alturas; los
otros glifos sin reserva producen duda. Las variantes de fuente conservan esas
reservas y sus avisos en cada conversión. No se distribuyen fuentes.

## TEXT normales y compatibilidad web

TEXT usa 72/73 y 11/21, ajustar/alinear entre dos puntos, factor de anchura,
oblicuidad de entidad o STYLE, reflejos 71, giro y normal. Los avances del cuadro
CAD se miden sin kerning e incluyen los voladizos; el trazado nominal mantiene
el kerning del importador ya contrastado. Se decodifican los símbolos CAD.

El emisor web ya proporciona 10/20 calculados con `anchoArial`. Si esos valores
coinciden con su cálculo y con el error máximo de los seis decimales publicados
(incluidos altura y giro), se conserva esa base para mantener los bytes web.
Un 10/20 ajeno a ese cálculo no sustituye al punto de alineación 11/21.

Se mantiene el redondeo SVG de LINE y la precisión nominal de los contornos.
`compatibilidadRobot:false` conserva la precisión del DXF. `sinLeyenda:true`
quita solo una leyenda completa reconocida y recoloca el dibujo a 300/20 mm.
`sinTextos:true` descarta TEXT/MTEXT tras expandir bloques, antes de cargar fuentes.
La miniatura y los parámetros permanecen en `plantilla.json`.

## Evidencia y límites

La sexta ronda utiliza 174 pares entrada → EXPLODE real de ZWCAD recibidos del
coordinador. No se ha ejecutado CAD en esta tarea. Convierten ambas versiones de
174/174; coinciden 170/174 CMT completos por defecto y 171/174 con `sinLeyenda:true`,
a 0,01 mm y con las mismas herramientas. No es igualdad binaria ni de orden.

En 576 MTEXT del modelo se contrastan 625 TEXT y 5.784 contornos: coinciden
5.755/5.784. Hay contraste real de anclajes 1/3/5/7, giros libres y ortogonales,
plegado y justificación de párrafos. Quedan dos discrepancias métricas conocidas:
CUTTER con Arial Narrow (AR2600484, 0,034106 mm) y la nota con ª (AR2603477,
5,184175 mm). Cambios de $EXTMIN al guardar explican las otras diferencias globales.
El reconocedor de leyenda no resuelve la variante Narrow ya explotada.

Sin contraste CAD real: anclajes 2/4/6/8/9, 44≠1, interlineado exacto, −Z de MTEXT,
mezcla de fuentes/alturas, fracciones, W/T/Q/A, atributos, DIMENSION y bloques
anidados de escala desigual. Tienen pruebas sintéticas. En particular, la escala
70 % y la colocación fina de las fracciones son provisionales: no están certificadas
como el EXPLODE de ZWCAD. Columnas, sangrías y tabuladores generales aún no tienen
una maquetación CAD completa; se conserva el orden del contenido y se avisa.
LEADER/MLEADER/TOLERANCE/TABLE no aparecen en el corpus y conservan su duda.

Los fixtures son independientes de tmp y de la red. `sexta-explode-zwcad.json`
recorta 17 casos reales, incluidos dos TEXT que ZWCAD recalcula al guardar, con
menos de 50 KB adicionales. Las pruebas con fuente se omiten con nombre explícito
si no está disponible. El informe completo, cambios individuales en TEXT,
recuentos del corpus y seis CMT/PNG de revisión están en
`tmp/cmt-estudio/sexta-ronda.md` y `tmp/cmt-estudio/prueba7/`.

Pruebas acotadas:
`pnpm vitest run src/cmt src/cmtPiloto.test.js src/corteEnvios.test.js src/cmtHerramientaRoutes.test.js src/client/cmt --maxWorkers=3`,
`pnpm typecheck` y `pnpm lint`. No se ejecuta la suite completa en este equipo.
