// Cajetín de los planos de la web. Iván, 22/10/2026: los planteamientos con el cajetín de siempre de la
// oficina (abajo a la derecha: logo, pedido y OF, cliente, técnico, revisión, fecha y página), «adaptado un
// poco a este siglo». Es un bloque «CAJETIN TGM» con atributos (se editan en AutoCAD). El logo de TGM se
// saca del bloque CAJETIN de la plantilla (bloque «LOGO TGM»). Medidas en mm de papel.
import { anchoArial } from './texto.js';

export const ANCHO_CAJETIN = 100, ALTO_CAJETIN = 27;   // en la esquina de abajo a la derecha del marco
export const SITIO_CAJETIN = [289.1 - ANCHO_CAJETIN, 8.0];
const ANCHO = ANCHO_CAJETIN, ALTO = ALTO_CAJETIN;
const X0 = 24;                           // a la izquierda, el logo; los datos, desde aquí
// [etiqueta, atributo, x, y de la etiqueta, ancho, alto del dato]: pedido y OF en grande, como el de siempre.
const CASILLAS = [
  ['Nº PEDIDO', 'PEDIDO', X0, 24.8, 40, 3.6], ['OF', 'OF', X0 + 44, 24.8, 32, 3.6],
  ['CLIENTE', 'CLIENTE', X0, 16.6, ANCHO - X0 - 2, 2.8],
  ['TÉCNICO', 'TECNICO', X0, 10.0, 19, 2.4], ['REVISIÓN', 'REVISOR', X0 + 20, 10.0, 19, 2.4],
  ['FECHA', 'FECHA', X0 + 40, 10.0, 17, 2.4], ['PÁG.', 'HOJA', X0 + 58, 10.0, 16, 2.4]
];
const GRIS = 8, NARANJA = 40, TEXTO = 7;
const LOGO_MAX_X = 25;                  // en el bloque CAJETIN, el logo queda a la izquierda de x = 25

/**
 * Añade a `src` (DXF de la plantilla) los bloques LOGO TGM y CAJETIN TGM y devuelve
 * { src, insercion } con la inserción del cajetín (y sus atributos) para el espacio papel.
 * `nuevo()` da handles; `papel` es el handle de *Paper_Space; `valores` los datos por atributo.
 * Una plantilla con su hoja propia (Portanova) da su `sitio` y su `escala` para no tapar sus notas.
 */
export function anadirCajetin(src, nuevo, papel, valores, { sitio = SITIO_CAJETIN, escala = 1 } = {}) {
  const n = (v) => Number(v).toFixed(6);
  const regLogo = nuevo(), regCaj = nuevo();
  const registro = (h, nombre) => `  0\nBLOCK_RECORD\n  5\n${h}\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n${nombre}\n340\n0\n 70\n     0\n280\n     1\n281\n     0\n`;
  src = insertarEnTabla(src, 'BLOCK_RECORD', registro(regLogo, 'LOGO TGM') + registro(regCaj, 'CAJETIN TGM'), 2);

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

  // CAJETIN TGM: raya naranja arriba; el logo a la izquierda; pedido y OF en grande; cliente; técnico,
  // revisión, fecha y página; y abajo, en pequeño, las medidas, el trabajo y el material.
  let caj = inicioBloque(regCaj, 'CAJETIN TGM', true);
  caj += linea(regCaj, NARANJA, 0, ALTO, ANCHO, ALTO, 0.7);
  caj += linea(regCaj, GRIS, 0, 0, ANCHO, 0, 0.25);
  caj += linea(regCaj, GRIS, 0, 0, 0, ALTO, 0.25);
  caj += linea(regCaj, GRIS, X0 - 2, 19.0, ANCHO - 2, 19.0, 0.13);
  caj += linea(regCaj, GRIS, X0 - 2, 4.6, ANCHO - 2, 4.6, 0.13);
  // Logo a su tamaño del bloque viejo (17 mm), centrado en su franja.
  caj += `  0\nINSERT\n  5\n${nuevo()}\n330\n${regCaj}\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockReference\n  2\nLOGO TGM\n 10\n${n(2 - 7.1)}\n 20\n${n(5 - 4.0)}\n 30\n0.0\n`;
  const pie = ['MEDIDAS EN CM', String(valores.SUBTITULO || '').replace(/^MEDIDAS EN CM · /, ''), valores.MATERIAL].filter(Boolean).join(' · ');
  caj += texto(regCaj, GRIS, X0, 1.8, Math.min(1.6, (ANCHO - X0 - 2) / anchoArial(pie, 1)), pie);
  // Cada dato con su etiqueta pequeña en gris encima; se reduce si no cabe en su sitio.
  let atributos = '';
  for (const [etiqueta, tag, x, y, w, alto] of CASILLAS) {
    caj += texto(regCaj, GRIS, x, y, 1.4, etiqueta);
    const [ax, ay] = [x, y - alto - 1.0];
    caj += `  0\nATTDEF\n  5\n${nuevo()}\n330\n${regCaj}\n100\nAcDbEntity\n  8\n0\n 62\n${String(TEXTO).padStart(6)}\n100\nAcDbText\n 10\n${n(ax)}\n 20\n${n(ay)}\n 30\n0.0\n 40\n${n(alto)}\n  1\n\n  7\narial\n100\nAcDbAttributeDefinition\n280\n     0\n  3\n${etiqueta}\n  2\n${tag}\n 70\n     0\n280\n     1\n`;
    const valor = valores[tag] ?? '';
    const h = valor ? Math.min(alto, (w - 1) / anchoArial(valor, 1)) : alto;
    atributos += `${ax},${ay},${h},${tag}\n`;
  }
  caj += finBloque(regCaj);

  // Los bloques nuevos al final de la sección BLOCKS.
  const finBlocks = src.indexOf('  0\nENDSEC\n', src.indexOf('\nBLOCKS\n'));
  src = src.slice(0, finBlocks) + logo + caj + src.slice(finBlocks);

  // Inserción en el papel con los atributos rellenos; `insertar` sirve para otras presentaciones del mismo DXF.
  const [ix, iy] = sitio;
  const escalar = escala === 1 ? '' : ` 41\n${n(escala)}\n 42\n${n(escala)}\n 43\n${n(escala)}\n`;
  const insertar = (papelHoja, valoresHoja) => {
    const hIns = nuevo();
    let insercion = `  0\nINSERT\n  5\n${hIns}\n330\n${papelHoja}\n100\nAcDbEntity\n 67\n     1\n  8\n0\n100\nAcDbBlockReference\n 66\n     1\n  2\nCAJETIN TGM\n 10\n${n(ix)}\n 20\n${n(iy)}\n 30\n0.0\n${escalar}`;
    for (const fila of atributos.trim().split('\n')) {
      const [ax, ay, , tag] = fila.split(',');
      const [, , w, alto] = CASILLAS.find(c => c[1] === tag).slice(2);
      const valor = valoresHoja[tag] ?? '';
      const ah = valor ? Math.min(alto, (w - 1) / anchoArial(valor, 1)) : alto;
      insercion += `  0\nATTRIB\n  5\n${nuevo()}\n330\n${hIns}\n100\nAcDbEntity\n 67\n     1\n  8\n0\n 62\n${String(TEXTO).padStart(6)}\n100\nAcDbText\n 10\n${n(ix + ax * escala)}\n 20\n${n(iy + ay * escala)}\n 30\n0.0\n 40\n${n(ah * escala)}\n  1\n${valor}\n  7\narial\n100\nAcDbAttribute\n280\n     0\n  2\n${tag}\n 70\n     0\n280\n     1\n`;
    }
    return insercion + `  0\nSEQEND\n  5\n${nuevo()}\n330\n${hIns}\n100\nAcDbEntity\n 67\n     1\n  8\n0\n`;
  };
  return { src, insercion: insertar(papel, valores), insertar };
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
