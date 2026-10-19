// Cajetín nuevo de los planos de la web (Iván, 19/10/2026: «reconstruye un cajetín moderno», que coja
// también el revisor, sin el empate, que ya va en el dibujo, y que estorbe poco). Es un bloque
// «CAJETIN WEB» con atributos (se pueden editar en AutoCAD): una franja fina a lo ancho del pie de la
// A4, con el logo y el título y una fila de casillas. El logo de TGM se saca del bloque CAJETIN de la
// plantilla (bloque «LOGO TGM»). Medidas en mm de papel.
import { anchoArial } from './texto.js';

export const ANCHO_CAJETIN = 281.1, ALTO_CAJETIN = 15;   // dentro del marco de la A4 (x 8–289,1)
export const SITIO_CAJETIN = [8.0, 8.0];
const ANCHO = ANCHO_CAJETIN, ALTO = ALTO_CAJETIN;
const TITULO = 64;                       // casilla del logo y el título
const CASILLAS = [                       // [etiqueta, atributo, ancho en mm]
  ['PEDIDO', 'PEDIDO', 25], ['OF', 'OF', 21], ['CLIENTE', 'CLIENTE', 56], ['MATERIAL', 'MATERIAL', 46],
  ['TÉCNICO', 'TECNICO', 21], ['REVISOR', 'REVISOR', 21], ['FECHA', 'FECHA', 16.1], ['HOJA', 'HOJA', 11]
];
const ALTO_DATO = 3.0;                   // altura del dato; se reduce si no cabe en su casilla
const GRIS = 8, NARANJA = 40, TEXTO = 7;
const LOGO_MAX_X = 25;                  // en el bloque CAJETIN, el logo queda a la izquierda de x = 25

/**
 * Añade a `src` (DXF de la plantilla) los bloques LOGO TGM y CAJETIN WEB y devuelve
 * { src, insercion } con la inserción del cajetín (y sus atributos) para el espacio papel.
 * `nuevo()` da handles; `papel` es el handle de *Paper_Space; `valores` los datos por atributo.
 */
export function anadirCajetin(src, nuevo, papel, valores) {
  const n = (v) => Number(v).toFixed(6);
  const regLogo = nuevo(), regCaj = nuevo();
  const registro = (h, nombre) => `  0\nBLOCK_RECORD\n  5\n${h}\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n${nombre}\n340\n0\n 70\n     0\n280\n     1\n281\n     0\n`;
  src = insertarEnTabla(src, 'BLOCK_RECORD', registro(regLogo, 'LOGO TGM') + registro(regCaj, 'CAJETIN WEB'), 2);

  const ent = (dueno, tipo, color, sub, cuerpo) => `  0\n${tipo}\n  5\n${nuevo()}\n330\n${dueno}\n100\nAcDbEntity\n  8\n0\n 62\n${String(color).padStart(6)}\n100\n${sub}\n${cuerpo}`;
  const linea = (dueno, color, x1, y1, x2, y2, grosor = 0) => ent(dueno, 'LWPOLYLINE', color, 'AcDbPolyline', ` 90\n     2\n 70\n     0\n 43\n${n(grosor)}\n 10\n${n(x1)}\n 20\n${n(y1)}\n 10\n${n(x2)}\n 20\n${n(y2)}\n`);
  const texto = (dueno, color, x, y, h, valor) => ent(dueno, 'TEXT', color, 'AcDbText', ` 10\n${n(x)}\n 20\n${n(y)}\n 30\n0.0\n 40\n${n(h)}\n  1\n${valor}\n  7\narial\n100\nAcDbText\n`);
  const inicioBloque = (reg, nombre, conAtributos) => `  0\nBLOCK\n  5\n${nuevo()}\n330\n${reg}\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n${nombre}\n 70\n${conAtributos ? '     2' : '     0'}\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n${nombre}\n  1\n\n`;
  const finBloque = (reg) => `  0\nENDBLK\n  5\n${nuevo()}\n330\n${reg}\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n`;

  // LOGO TGM: piezas del logo del bloque CAJETIN (sombreados, contornos naranjas y «TOLDOS GÓMEZ»).
  let logo = inicioBloque(regLogo, 'LOGO TGM', false);
  for (const trozo of entidadesDeBloque(src, 'CAJETIN')) {
    const tipo = /^ {2}0\n([^\n]+)/.exec(trozo)[1];
    if (!['HATCH', 'LWPOLYLINE', 'SPLINE'].includes(tipo)) continue;
    if (tipo !== 'SPLINE' && !/\n 62\n\s*40\n/.test(trozo)) continue;   // el marco del cajetín viejo no
    let t = tipo === 'HATCH' ? contornosDelLogo(trozo) : trozo;
    if (!t) continue;
    if (tipo === 'LWPOLYLINE' && Math.max(...valores10(t)) > LOGO_MAX_X) continue;   // la franja naranja no
    t = t.replace(/\n {2}5\n[0-9A-F]+\n/, `\n  5\n${nuevo()}\n`)
      .replace(/102\n\{ACAD_[A-Z]+\n(?:3[36]0\n[0-9A-F]+\n)*102\n\}\n/g, '')
      .replace(/\n330\n[0-9A-F]+\n100\nAcDbEntity/, `\n330\n${regLogo}\n100\nAcDbEntity`);
    logo += t;
  }
  logo += finBloque(regLogo);

  // CAJETIN WEB: franja con raya naranja arriba, logo y título a la izquierda y una fila de casillas.
  let caj = inicioBloque(regCaj, 'CAJETIN WEB', true);
  caj += linea(regCaj, NARANJA, 0, ALTO, ANCHO, ALTO, 0.7);
  caj += linea(regCaj, GRIS, 0, 0, ANCHO, 0, 0.25);
  // Logo: 17 mm de alto en el bloque viejo → 11 mm.
  const escalaLogo = 11 / 17;
  caj += `  0\nINSERT\n  5\n${nuevo()}\n330\n${regCaj}\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockReference\n  2\nLOGO TGM\n 10\n${n(1 - 7.1 * escalaLogo)}\n 20\n${n(2 - 4.0 * escalaLogo)}\n 30\n0.0\n 41\n${n(escalaLogo)}\n 42\n${n(escalaLogo)}\n 43\n${n(escalaLogo)}\n`;
  // Título y subtítulo, ajustados al ancho de su casilla.
  const cabe = (valor, h) => Math.min(h, (TITULO - 16) / anchoArial(valor, 1));
  const subtitulo = valores.SUBTITULO || 'LONA DE PVC';
  caj += texto(regCaj, TEXTO, 14, 7.4, cabe('PLANO DE CONFECCIÓN', 3.2), 'PLANO DE CONFECCIÓN');
  caj += texto(regCaj, GRIS, 14, 3.4, cabe(subtitulo, 1.7), subtitulo);
  // Casillas: separadas por rayas grises cortas; etiqueta pequeña en gris arriba y el dato debajo.
  let atributos = '';
  let x = TITULO;
  for (const [etiqueta, tag, w] of CASILLAS) {
    caj += linea(regCaj, GRIS, x, 2, x, ALTO - 2);
    caj += texto(regCaj, GRIS, x + 2, ALTO - 4.6, 1.5, etiqueta);
    const [ax, ay] = [x + 2, 3.2];
    caj += `  0\nATTDEF\n  5\n${nuevo()}\n330\n${regCaj}\n100\nAcDbEntity\n  8\n0\n 62\n${String(TEXTO).padStart(6)}\n100\nAcDbText\n 10\n${n(ax)}\n 20\n${n(ay)}\n 30\n0.0\n 40\n${n(ALTO_DATO)}\n  1\n\n  7\narial\n100\nAcDbAttributeDefinition\n280\n     0\n  3\n${etiqueta}\n  2\n${tag}\n 70\n     0\n280\n     1\n`;
    // El dato se reduce si no cabe en la casilla.
    const valor = valores[tag] ?? '';
    const h = valor ? Math.min(ALTO_DATO, (w - 3.5) / anchoArial(valor, 1)) : ALTO_DATO;
    atributos += `${ax},${ay},${h},${tag}\n`;
    x += w;
  }
  caj += finBloque(regCaj);

  // Los bloques nuevos al final de la sección BLOCKS.
  const finBlocks = src.indexOf('  0\nENDSEC\n', src.indexOf('\nBLOCKS\n'));
  src = src.slice(0, finBlocks) + logo + caj + src.slice(finBlocks);

  // Inserción en el papel con los atributos rellenos.
  const [ix, iy] = SITIO_CAJETIN;
  const hIns = nuevo();
  let insercion = `  0\nINSERT\n  5\n${hIns}\n330\n${papel}\n100\nAcDbEntity\n 67\n     1\n  8\n0\n100\nAcDbBlockReference\n 66\n     1\n  2\nCAJETIN WEB\n 10\n${n(ix)}\n 20\n${n(iy)}\n 30\n0.0\n`;
  for (const fila of atributos.trim().split('\n')) {
    const [ax, ay, ah, tag] = fila.split(',');
    insercion += `  0\nATTRIB\n  5\n${nuevo()}\n330\n${hIns}\n100\nAcDbEntity\n 67\n     1\n  8\n0\n 62\n${String(TEXTO).padStart(6)}\n100\nAcDbText\n 10\n${n(ix + +ax)}\n 20\n${n(iy + +ay)}\n 30\n0.0\n 40\n${n(ah)}\n  1\n${valores[tag] ?? ''}\n  7\narial\n100\nAcDbAttribute\n280\n     0\n  2\n${tag}\n 70\n     0\n280\n     1\n`;
  }
  insercion += `  0\nSEQEND\n  5\n${nuevo()}\n330\n${hIns}\n100\nAcDbEntity\n 67\n     1\n  8\n0\n`;
  return { src, insercion };
}

// Entidades (texto DXF) de un bloque de la sección BLOCKS.
function entidadesDeBloque(src, nombre) {
  const ini = src.indexOf(`\n  2\n${nombre}\n`, src.indexOf('\nBLOCKS\n'));
  const desde = src.indexOf('\n  0\n', ini) + 1;
  const hasta = src.indexOf('  0\nENDBLK\n', desde);
  return src.slice(desde, hasta).split(/(?=^ {2}0\n)/m).filter(Boolean);
}

const valores10 = (t) => [...t.matchAll(/\n 10\n([^\n]+)/g)].map((m) => +m[1]);

// Un sombreado del bloque viejo mezcla el logo y la franja naranja: se quedan solo los contornos del
// logo (los que no pasan de x = 25). Contornos de polilínea sin curvas, como los de la plantilla.
function contornosDelLogo(trozo) {
  const l = trozo.split('\n');
  const i91 = l.findIndex((x, k) => x === ' 91' && k % 2 === 0);   // códigos en las líneas pares
  if (i91 < 0) return trozo;
  const cuantos = +l[i91 + 1];
  let k = i91 + 2;
  const quedan = [];
  for (let c = 0; c < cuantos; c++) {
    const inicio = k;
    // 92 tipo, 72 curvas, 73 cerrado, 93 vértices, vértices 10/20 (y 42 si hay curvas), 97 y sus 330.
    const curvas = +l[k + 3] === 1;
    const vertices = +l[k + 7];
    k += 8;
    const xs = [];
    for (let v = 0; v < vertices; v++) { xs.push(+l[k + 1]); k += curvas ? 6 : 4; }
    const fuentes = +l[k + 1];
    k += 2 + 2 * fuentes;
    if (Math.max(...xs) <= LOGO_MAX_X) quedan.push(l.slice(inicio, k));
  }
  if (!quedan.length) return null;
  return [...l.slice(0, i91), ' 91', String(quedan.length).padStart(9), ...quedan.flat(), ...l.slice(k)].join('\n');
}

function insertarEnTabla(src, tabla, registros, cuantos) {
  const ini = src.indexOf(`\n  2\n${tabla}\n`);
  const fin = src.indexOf('\n  0\nENDTAB\n', ini);
  const cabecera = src.slice(ini, fin).replace(/(AcDbSymbolTable\n 70\n)\s*(\d+)/, (_, a, num) => `${a}${String(Number(num) + cuantos).padStart(6)}`);
  return src.slice(0, ini) + cabecera + '\n' + registros.replace(/\n$/, '') + src.slice(fin);
}
