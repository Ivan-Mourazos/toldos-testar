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
Las declaraciones SHX y otras fuentes se rechazan aunque exista Arial.

Se admiten LINE, ARC, CIRCLE, LWPOLYLINE sin anchura y TEXT de Arial con las
restricciones comprobadas en el estudio. MTEXT, SPLINE, INSERT, DIMENSION,
HATCH, geometría 3D, textos oblicuos/reflejados/ajustados, capas desconocidas
y entidades incompletas devuelven dudas. Se excluye explícitamente el espacio
papel y se informa en los avisos. No se omiten capas de modelo por su nombre.

El origen se calcula como `(300 - $EXTMIN.x, 20 - $EXTMIN.y)` en milímetros.
DISCO1, DISCO2, CUTTER, ROTULADOR y taladro se asignan a las herramientas
comprobadas; `texto` tiene nombre de herramienta vacío. El texto de otras
capas conserva la herramienta de su capa, incluida la leyenda.

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
La prueba de textos se omite con un nombre explicativo si no está Arial.

Pruebas: `pnpm vitest run src/cmt --maxWorkers=6`.
