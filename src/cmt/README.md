# Conversión CMT en memoria

`dxfACmt(texto, {rutaFuente?, compatibilidadRobot?, sinLeyenda?, sinTextos?, rutasFuentesReserva?, preparacionMtext?})`
convierte un DXF ya decodificado en memoria, sin escribir ficheros ni conectarse a producción.
Devuelve `{cmt, objetos, avisos, dudas}`. El llamante decodifica con `textoDxf` de
`src/cmtPiloto.js`; los DXF pueden ser UTF-8 o Windows-1252.

Arial se busca por `rutaFuente`, `CMT_ARIAL_PATH` y, en Windows,
`C:/Windows/Fonts/arial.ttf`. La fuente es global, como `options.font` en el importador
DXF de Inkscape; el STYLE del DXF no selecciona otro archivo. Se avisa de esa sustitución.
No se distribuyen fuentes. En Linux hay que configurar su ruta.

Los glifos ausentes se buscan por orden en `rutasFuentesReserva`, o en
`CMT_FUENTES_RESERVA` (separador `;` en Windows, `:` en Linux). Windows prueba por defecto
Lucida Sans Unicode (`C:/Windows/Fonts/l_10646.ttf`), contrastada para ∅. Se cargan solo
cuando hacen falta. `rutasFuentesReserva: []` desactiva las reservas. Si falta Lucida,
∅ se omite con aviso conservando su avance medido de 0,97607421875 alturas; otros glifos
sin reserva ni evidencia siguen dando duda. No se aplica kerning entre fuentes distintas.

La preparación de textos reproduce las reglas de `dxf_input_1.2.py` y `master`, cuyas
funciones de texto son equivalentes en los cuatro archivos fuente estudiados:

- TEXT inyecta 70 y 71 y usa la misma función que MTEXT. Si ya existe 71, el primer valor
  conserva prioridad: por ejemplo, 2 se interpreta como anclaje central, no como reflejo.
- Se usa la inserción 10/20. Se ignoran 72/73 y el oblicuo 51. El ancho 41 no estira las
  letras: solo puede activar el plegado. La normal afecta a la inserción X, no refleja
  los contornos de las letras. Con normal -Z y ambos 50/51 se conserva la permutación de
  ángulos del importador.
- 50 tiene prioridad, incluso si vale cero. Sin 50 se usa el vector 11/21 únicamente si
  están ambas coordenadas y su módulo está estrictamente entre 0,99 y 1,01. El bit 4 de
  STYLE 70, cuando hay un estilo explícito, activa escritura vertical y anula el giro.
- MTEXT sin 70 empieza una altura por debajo de la inserción. 2/5/8 usan anclaje central,
  3/6/9 usan final. 4/5/6 empiezan media altura por debajo. Los inferiores 7/8/9 no
  reciben una corrección vertical propia. Se gira también el desplazamiento inicial.
- El interlineado es el 125 % observado; 44 y 73 no lo modifican. Solo `\P` separa
  párrafos; `^J` queda literal. Los espacios repetidos se conservan, como demuestran
  los rótulos web contrastados.
- Con 41 > 10, 40 > 1 y texto sin `\P` ni `{`, el importador pliega por
  `floor(41 * 2 / 40)` caracteres. Su bucle inserta también un `\P` inicial vacío.
  No se sustituye por un ajuste por palabras.
- Antes de concatenar 3/1 se recortan los extremos de cada dato, como en `get_line`.
  `\~` pasa a espacio, `^I` desaparece, `\U+XXXX` se decodifica. `\S…;` y `\W…;`
  se eliminan con expresiones codiciosas. `%%c/%%d/%%p` permanecen literales.
- `mtext_normalize` repite el control de un grupo al cruzar un `\P`. El separador de
  grupos no es un parser CAD general: toma la primera llave de cierre. F elimina el
  nombre de fuente y conserva la fuente global. H numérico cambia el tamaño; H relativo
  como `2x` falla como `float()` en Python y deja ese grupo sin texto. C cambia estilo
  gráfico, sin cambiar la referencia de herramienta; T usa espaciado en píxeles SVG;
  A conserva su alineación interna. Los controles desconocidos permanecen literales.
  No se inventan fracciones, subrayados ni formatos que el script no dibuja.
- Las columnas CAD se ignoran con aviso: solo se usan los párrafos del contenido.

Se conserva el tamaño nominal ya contrastado para mantener los bytes de la web: no se
introduce la cuantización de `font-size: %.3fpx` en los casos existentes. Las hipótesis
versionadas del estudio sí incluyen las precisiones publicadas (una y tres cifras
 decimales en píxeles). La escritura vertical y los controles A no tienen ejemplos de
render en el corpus; usan dirección vertical y métricas ascendente/descendente TrueType,
con aviso de esa falta de contraste.

Los diez indicadores MTEXT «1» con vector (0;-1), ausentes de los CMT estudiados,
siguen omitiéndose con aviso. Es una ausencia comprobada del flujo completo, no una
regla deducida de `export_mtext`.

**Límite de la comparación MTEXT:** ninguno de los 1.476 pares que declaran DXF 2000
contiene MTEXT. Todos los MTEXT del corpus están en archivos 2004/2007. Algunos pueden
haber pasado por descomposición en ZWCAD o haber sido guardados después del CMT. El
modelo directo de Inkscape y la hipótesis de TEXT descompuesto dan resultados incompatibles
en distintos pedidos; no se elige uno por pedido consultando su CMT de referencia.
El módulo usa el modelo 1.2/master y no afirma paridad completa del flujo anterior.
Véase `tmp/cmt-estudio/quinta-ronda.md` para la medición y los contraejemplos.

`preparacionMtext:'textos'` permite elegir explícitamente la preparación CAD antes de
importar los TEXT. Reproduce los 166 contornos de AR2601895: mide el margen izquierdo
y la altura superior de tinta con `h/cap`, siendo `cap` la altura de H en la fuente;
pliega por palabras contando el espacio final. Cada base cae tras la altura superior
de esa línea y cada párrafo añade además `2*h/3`. Gira también ese desplazamiento y
mantiene `h` como tamaño de los contornos importados. Hay 94 contornos reales en los
fixtures de esta regla, sin dependencia de `tmp/` ni del CMT en ejecución.

Solo está contrastada para texto plano, anclaje 1, normal +Z e interlineado 44=1.
Los demás casos conservan la importación directa con aviso. El valor por defecto es
`'directa'`: hay ejemplos reales que coinciden únicamente por esa ruta. Ni STYLE,
40, $MEASUREMENT ni $INSUNITS permiten decidir entre las preparaciones estudiadas.
La opción no modifica TEXT ni certifica un trazado previo de letras como geometría
CAD; ese tercer camino tiene un tamaño y una cuantización distintos aún pendientes.

Se convierten LINE, ARC, CIRCLE, LWPOLYLINE sin anchura, POLYLINE/VERTEX/SEQEND 2D y
la SPLINE cúbica no racional de cuatro controles y extremos de nudos cuádruples del
corpus. INSERT descompone punto base, escala, giro, capas y anidación; la capa 0 hereda
la de la inserción. Las flechas de marca usan rotulador según los ejemplos. POINT y las
polilíneas válidas de un solo vértice se omiten con aviso. El espacio papel se excluye
antes de descomponer bloques. La elevación se proyecta a XY y se avisa.

Las referencias de herramienta siguen las capas contrastadas: DISCO1, DISCO2, CUTTER,
ROTULADOR/TALADRO. Las capas conocidas sin referencia (0, marca, corte, curv, TALADADRO,
Defpoints, cortes - lona, etc.) conservan herramienta vacía y aviso. El color ACI no
proporciona una tabla universal: el corpus tiene colores iguales con herramientas distintas.

`sinLeyenda:true` quita solo el conjunto completo reconocido web/oficina y lleva la
esquina restante a 300/20 mm. `sinTextos:true` descarta TEXT/MTEXT después de descomponer
bloques y antes de validar fuentes. Por defecto no se descartan los textos. Se mantiene
el redondeo SVG de LINE (seis cifras a 96 dpi), la unión de trazados y el origen habitual.
`compatibilidadRobot:false` conserva la precisión de la geometría DXF. La miniatura y
parámetros siguen en `plantilla.json`; el lector CMT público conserva su contrato estricto.

Los fixtures y pruebas son independientes de `tmp/` y la red. Las pruebas con fuentes
se omiten con un nombre explícito si faltan. Las regresiones incorporan 10 contornos
reales de plegado y 38 de los códigos `%%` literales, además de los casos anteriores.
La quinta ronda deja cinco CMT y un LEEME en `tmp/cmt-estudio/prueba6/` para revisión manual.
No se ha ejecutado CUTMatic ni conectado el módulo a la web.

Pruebas acotadas: `pnpm vitest run src/cmt src/cmtPiloto.test.js src/corteEnvios.test.js src/cmtHerramientaRoutes.test.js --maxWorkers=3`.
