# Conversión CMT en memoria

Módulo independiente para estudiar el formato de CUTMatic. No está conectado al servidor,
a la interfaz ni a las carpetas de la máquina. No tiene dependencias nuevas.

```ts
import { dxfACmt, leerCmt, serializarCmt } from './cmt';

const resultado = dxfACmt(dxfTexto, { rutaFuente: '/ruta/administrada/arial.ttf' });
if (resultado.dudas.length) {
  // Mostrar o resolver las dudas. resultado.cmt es null: no hay fichero parcial.
} else {
  const documento = leerCmt(resultado.cmt!);
  const copiaIdentica = serializarCmt(documento);
}
```

`dxfTexto` es una cadena ya decodificada. Los DXF anteriores a 2007 suelen usar
Windows-1252; algunas copias del corpus web son UTF-8 aunque su cabecera declare
ANSI_1252. El llamante debe conservar correctamente los acentos.

Arial se busca por `rutaFuente`, después por `CMT_ARIAL_PATH` y, solo en Windows,
por `C:/Windows/Fonts/arial.ttf`. En Linux hay que proporcionar una ruta. No se
distribuye ninguna fuente. Si falta o no contiene un glifo, se devuelve una duda.
`txt.shx` usa los contornos de Arial, con aviso: en el corpus local coinciden
las 112 entidades de 22 pedidos (1.141 contornos, comparación muestreada a 0,08 mm).
Las demás fuentes SHX y TrueType distintas de Arial se rechazan: no hay ejemplos
contrastados que permitan sustituirlas.

Se admiten LINE, ARC, CIRCLE, LWPOLYLINE sin anchura y TEXT con las
restricciones comprobadas en el estudio. También MTEXT de una sola línea,
con anclaje superior izquierdo, sin giro ni ajuste automático por anchura:
la línea base está una altura por debajo de la inserción (AR2604983).
Se concatenan los fragmentos 3/1 conservando sus espacios, se decodifica Unicode
y se neutralizan grupos y cambios de color, que no cambian la herramienta de la capa.
Saltos `\\P` o `^J`, otros formatos, columnas, giro y otros anclajes devuelven
una duda concreta: su disposición no queda demostrada por estos pares.
SPLINE, INSERT, DIMENSION, HATCH, geometría 3D, textos oblicuos/reflejados/ajustados, capas desconocidas
y entidades incompletas devuelven dudas. Se excluye explícitamente el espacio
papel y se informa en los avisos. No se omiten capas de modelo por su nombre.

El origen se calcula como `(300 - $EXTMIN.x, 20 - $EXTMIN.y)` en milímetros.
DISCO1, DISCO2, CUTTER, ROTULADOR y taladro se asignan a las herramientas
comprobadas; `texto` tiene nombre de herramienta vacío. El texto de otras
capas conserva la herramienta de su capa, incluida la leyenda. `corte`, `curv`
y `TALADADRO` conservan el nombre vacío observado, con un aviso para asignar
herramienta en CUTMatic. LINE con normal -Z conserva sus extremos sin reflejarlos
(AR2605060); las demás extrusiones no comprobadas siguen bloqueadas. Solo se
tolera residuo Z subnanométrico (hasta 0,0000001 mm), comprobado en cuatro pedidos.

`sinLeyenda: true` reconoce las cinco figuras y sus cinco rótulos de la web
y de oficina, tanto descompuestas como en polilíneas, con TEXT o MTEXT y capas
sin distinguir mayúsculas. Admite traslación del conjunto, sin depender del origen.
Solo retira conjuntos completos y sin duplicados; una leyenda incompleta, girada
o modificada se conserva. Después de retirarla recoloca la esquina del dibujo a
300/20 mm. Si no se reconoce ninguna, conserva el origen anterior y lo avisa.
La plantilla de oficina procede de las dos plantillas locales, geométricamente iguales;
las posiciones antiguas de TEXT proceden de la plantilla ya existente de la web.

`sinTextos: true` (por defecto false) descarta TEXT y MTEXT antes de validar sus
fuentes, formatos y capas. Informa de cuántos textos ha descartado. El reconocimiento
de la leyenda sucede antes, para no perder los rótulos necesarios para identificarla.

Por defecto se reproduce el redondeo observado del paso SVG del robot:
seis cifras significativas en los extremos LINE, a 96 dpi y con Y desde 297 mm.
Se unen los trazados antes de redondear. Los contornos mixtos comienzan al
pasar de LINE a curva o polilínea y no fuerzan el cierre: se evita el relleno
distinto que produce el cierre exacto en CUTMatic. Es una deducción del corpus,
no una especificación del fabricante. `compatibilidadRobot: false` conserva
las coordenadas del DXF y puede mostrar esos contornos rellenos.

La miniatura fija y los parámetros están en `plantilla.json` (unos 4 KB).
CUTMatic ha aceptado y regenerado esa miniatura en cuatro ensayos del coordinador.
Las marcas de nodo nuevas valen cero. Los campos opacos de un documento leído
se conservan íntegros en `header` y `records[].raw`; `serializarCmt` serializa
esos bytes. Editar únicamente `objects[].paths[].points` no modifica `raw`.

Los fixtures proceden de AR2605305, AR2604991 y AR2605081. Los CMT completos
se guardan en base64, sin alterar sus bytes; los DXF conservan HEADER, las
definiciones LAYER/STYLE y las ENTITIES reales, quitando las tablas ajenas al
corte y los diccionarios CAD. El total es de unos 168 KB. No dependen de `tmp/`.
Las pruebas que necesitan contornos de texto se omiten con un nombre explicativo
si no está Arial. Los recortes `oficina-*` añaden leyendas viejas/nuevas, textos,
extrusión LINE negativa y los 21 contornos MTEXT originales de AR2604983; no dependen
del corpus temporal. El informe de la ampliación está en `tmp/cmt-estudio/tercera-ronda.md`.

Pruebas: `pnpm vitest run src/cmt --maxWorkers=6`.
