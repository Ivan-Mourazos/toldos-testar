// Vista con la que abre el CAD los DXF/DWG de la web: el modelo encuadrado en lo dibujado y cada presentación en su
// hoja (Iván, 20/11/2026: «siempre abre el archivo desplazado y hay que ajustarlo a mano»). Las plantillas traían la
// vista de cuando se guardaron. Solo se toca la vista (VPORT *Active y la ventana 1 de cada presentación), nunca
// $EXTMIN: el CMT de la máquina toma de ahí su origen.

const MARGEN = 1.08;
const num = (v) => Number(v).toFixed(6);

/** Recuadro de lo dibujado en el modelo (las entidades de ENTITIES que no son del papel). Texto con \n. */
export function limitesModelo(src) {
  const ini = src.indexOf('\nENTITIES\n');
  if (ini < 0) return null;
  const fin = src.indexOf('\n  0\nENDSEC\n', ini);
  const caja = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const poner = (x, y, r = 0) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    caja.x0 = Math.min(caja.x0, x - r); caja.x1 = Math.max(caja.x1, x + r);
    caja.y0 = Math.min(caja.y0, y - r); caja.y1 = Math.max(caja.y1, y + r);
  };
  for (const trozo of src.slice(ini, fin).split(/\n(?= {2}0\n)/)) {
    const l = trozo.split('\n');
    if (l[0].trim() !== '0') continue;
    const tipo = l[1].trim();
    const pares = [];
    for (let i = 2; i + 1 < l.length; i += 2) pares.push([Number(l[i].trim()), l[i + 1].trim()]);
    if (pares.some(([c, v]) => c === 67 && v === '1')) continue;   // del papel
    if (['VIEWPORT', 'ATTRIB', 'SEQEND'].includes(tipo)) continue;
    const r = ['CIRCLE', 'ARC'].includes(tipo) ? Number(pares.find(([c]) => c === 40)?.[1] ?? 0) : 0;
    // 10/20 son puntos en todas; 11/21 solo en LINE y TEXT (en MTEXT y ELLIPSE es una dirección). El primer 10 del
    // HATCH es su elevación (0,0), no un punto del dibujo.
    const conOtro = ['LINE', 'TEXT'].includes(tipo);
    let saltar = tipo === 'HATCH';
    for (let i = 0; i + 1 < pares.length; i++) {
      const [c, v] = pares[i], [c2, v2] = pares[i + 1];
      if ((c === 10 && c2 === 20) || (conOtro && c === 11 && c2 === 21)) {
        if (saltar && c === 10) { saltar = false; continue; }
        poner(Number(v), Number(v2), r);
      }
    }
  }
  return Number.isFinite(caja.x0) ? caja : null;
}

// Un registro empieza en `  0\n` (con o sin salto delante): se recorre por pares código/valor para no confundir un
// valor con un código.
function posicion(lineas, codigo) {
  const desde = lineas[0] === '' ? 1 : 0;
  for (let i = desde; i + 1 < lineas.length; i += 2) if (lineas[i].trim() === String(codigo)) return i + 1;
  return -1;
}
/** Cambia en un registro el valor de un código de grupo, solo la primera vez. */
function cambiar(registro, codigo, valor) {
  const l = registro.split('\n'), i = posicion(l, codigo);
  if (i < 0) return registro;
  l[i] = valor;
  return l.join('\n');
}
function leer(registro, codigo) {
  const l = registro.split('\n'), i = posicion(l, codigo);
  return i < 0 ? NaN : Number(l[i].trim());
}

/** El modelo abre encuadrado en lo dibujado: centro (12/22) y alto (40) del VPORT *Active, con su proporción (41). */
export function encuadrarModelo(src) {
  const caja = limitesModelo(src);
  if (!caja) return src;
  const m = /\n {2}0\nVPORT\n(?:(?!\n {2}0\n)[\s\S])*?\n {2}2\n\*Active\n(?:(?!\n {2}0\n)[\s\S])*/i.exec(src);
  if (!m) return src;
  const proporcion = leer(m[0], 41) > 0 ? leer(m[0], 41) : 1.6;
  const ancho = Math.max(caja.x1 - caja.x0, 1e-6), alto = Math.max(caja.y1 - caja.y0, 1e-6);
  let r = cambiar(m[0], 12, num((caja.x0 + caja.x1) / 2));
  r = cambiar(r, 22, num((caja.y0 + caja.y1) / 2));
  r = cambiar(r, 40, num(Math.max(alto, ancho / proporcion) * MARGEN));
  return src.slice(0, m.index) + r + src.slice(m.index + m[0].length);
}

/** Cada presentación abre con la hoja entera a la vista: la ventana 1 (la del papel) centrada en los límites del papel. */
export function encuadrarPapel(src) {
  const lim = (v) => {
    const m = new RegExp(`\\$${v}\\n\\s*10\\n([^\\n]*)\\n\\s*20\\n([^\\n]*)`).exec(src);
    return m ? [Number(m[1].trim()), Number(m[2].trim())] : null;
  };
  const [a, b] = [lim('PLIMMIN') ?? [0, 0], lim('PLIMMAX')];
  if (!b || !(b[0] > a[0]) || !(b[1] > a[1])) return src;
  const [cx, cy] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], [w, h] = [b[0] - a[0], b[1] - a[1]];
  return src.replace(/ {2}0\nVIEWPORT\n(?:(?!\n {2}0\n)[\s\S])*/g, (t) => {
    if (leer(t, 69) !== 1) return t;
    const proporcion = leer(t, 40) > 0 && leer(t, 41) > 0 ? leer(t, 40) / leer(t, 41) : 1.6;
    const alto = Math.max(h, w / proporcion) * MARGEN;
    let r = cambiar(t, 10, num(cx));
    r = cambiar(r, 20, num(cy));
    r = cambiar(r, 40, num(alto * proporcion));
    r = cambiar(r, 41, num(alto));
    r = cambiar(r, 12, num(cx));
    r = cambiar(r, 22, num(cy));
    return cambiar(r, 45, num(alto));
  });
}
