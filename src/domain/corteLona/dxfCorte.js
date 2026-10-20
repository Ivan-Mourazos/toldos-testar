// Escribe un DXF 2004 (AC1018) en mm a partir de una plantilla guardada por AutoCAD: cabecera,
// tablas y objetos tal cual; solo se cambian las entidades. Lleva la leyenda del bot explotada.
import { leerPlantilla } from './plantillas.js';
import leyendaBot from './plantillas/leyenda-bot.json' with { type: 'json' };
import { anchoArial, textoLatin1 } from './texto.js';

export const CAPAS_BOT = ['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'taladro', 'texto'];

const MODEL_SPACE = '1F';

/** lineas: { capa, x1, y1, x2, y2 }; textos: { capa, x, y, h, valor, giro? en grados }; circulos (los
 *  ollaos de remolque): { capa, x, y, r }; arcos (esquinas redondeadas): { capa, x, y, r, desde, hasta }
 *  en grados, en sentido antihorario. Desplaza todo a (dx, dy). Con `escala` 0,001 y `leyenda` false sale el
 *  plano de revisión de remolques en metros (Iván, 20/10/2026), sin la leyenda del bot. */
export function escribirDxf2004({ lineas, textos, circulos = [], arcos = [] }, { dx = 1000, dy = 1000, escala = 1, leyenda = true } = {}) {
  const src = leerPlantilla('base-corte.dxf');
  if ([...lineas, ...textos, ...circulos, ...arcos].some((e) => !CAPAS_BOT.includes(e.capa))) throw new Error('El DXF de corte solo admite capas del bot.');
  const start = src.indexOf('\nENTITIES\n') + '\nENTITIES\n'.length;
  const head = src.slice(0, start);
  const tail = src.slice(src.indexOf('  0\nENDSEC\n', start));
  let handle = parseInt(/\$HANDSEED\n\s*5\n([0-9A-F]+)/.exec(src)[1], 16);
  const n = (v) => Number(v).toFixed(6);
  const ent = (tipo, capa, sub, cuerpo) => {
    const h = (handle++).toString(16).toUpperCase();
    return `  0\n${tipo}\n  5\n${h}\n330\n${MODEL_SPACE}\n100\nAcDbEntity\n  8\n${capa}\n100\n${sub}\n${cuerpo}`;
  };
  const linea = (c, x1, y1, x2, y2) => ent('LINE', c, 'AcDbLine', ` 10\n${n(x1)}\n 20\n${n(y1)}\n 30\n0.0\n 11\n${n(x2)}\n 21\n${n(y2)}\n 31\n0.0\n`);
  // Centrado: punto de alineación (11/21) en el centro del texto (72 = 1, 73 = 2). AutoCAD dibuja desde
  // el punto de inicio (10/20) sin recalcularlo, así que también se da, con el ancho aproximado en Arial.
  const texto = (c, x, y, h, v, giro = 0, centrado = false, literal = false) => {
    // Literal: sin pasar a mayúsculas (las uniones de empate de remolque son «a1», «a2», como a mano).
    v = literal ? String(v ?? '').replace(/[\r\n\t\\{}]+/g, ' ').trim().replace(/[^\x20-\xff]/gu, (ch) => '\\U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')) : textoLatin1(v);
    let [x0, y0] = [x, y];
    if (centrado) {
      const a = (giro * Math.PI) / 180, w = anchoArial(v, h);
      [x0, y0] = [x - (w / 2) * Math.cos(a) + (h / 2) * Math.sin(a), y - (w / 2) * Math.sin(a) - (h / 2) * Math.cos(a)];
    }
    return ent('TEXT', c, 'AcDbText', ` 10\n${n(x0)}\n 20\n${n(y0)}\n 30\n0.0\n 40\n${n(h)}\n  1\n${v}\n${giro ? ` 50\n${n(giro)}\n` : ''}${centrado ? ` 72\n     1\n 11\n${n(x)}\n 21\n${n(y)}\n 31\n0.0\n` : ''}100\nAcDbText\n${centrado ? ' 73\n     2\n' : ''}`);
  };
  const circulo = (c, x, y, r) => ent('CIRCLE', c, 'AcDbCircle', ` 10\n${n(x)}\n 20\n${n(y)}\n 30\n0.0\n 40\n${n(r)}\n`);
  const arco = (c, x, y, r, a0, a1) => ent('ARC', c, 'AcDbCircle', ` 10\n${n(x)}\n 20\n${n(y)}\n 30\n0.0\n 40\n${n(r)}\n100\nAcDbArc\n 50\n${n(a0)}\n 51\n${n(a1)}\n`);
  let body = '';
  for (const e of leyenda ? leyendaBot : []) {
    const v = (c) => e.g.find((x) => x[0] === c)?.[1];
    if (e.t === 'LINE') body += linea(v('8'), v('10'), v('20'), v('11'), v('21'));
    if (e.t === 'TEXT') body += texto(v('8'), v('10'), v('20'), v('40'), v('1'));
    if (e.t === 'CIRCLE') body += circulo(v('8'), v('10'), v('20'), v('40'));
    if (e.t === 'ARC') body += arco(v('8'), v('10'), v('20'), v('40'), v('50'), v('51'));
  }
  const k = escala;
  for (const l of lineas) body += linea(l.capa, (l.x1 + dx) * k, (l.y1 + dy) * k, (l.x2 + dx) * k, (l.y2 + dy) * k);
  for (const t of textos) body += texto(t.capa, (t.x + dx) * k, (t.y + dy) * k, t.h * k, t.valor, t.giro, t.centrado, t.literal);
  for (const c of circulos) body += circulo(c.capa, (c.x + dx) * k, (c.y + dy) * k, c.r * k);
  for (const a of arcos) body += arco(a.capa, (a.x + dx) * k, (a.y + dy) * k, a.r * k, a.desde, a.hasta);
  let cabecera = head;
  if (k !== 1) cabecera = cabecera.replace(/(\$INSUNITS\n\s*70\n\s*)\d+/, `$1${k === 0.001 ? 6 : 0}`);
  const out = cabecera.replace(/(\$HANDSEED\n\s*5\n)[0-9A-F]+/, `$1${handle.toString(16).toUpperCase()}`) + body + tail;
  return out.replace(/\n/g, '\r\n');
}
