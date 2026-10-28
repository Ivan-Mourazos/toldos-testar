import crypto from 'node:crypto';
import { cajaDe } from './geometria.mjs';
export const puntos = p => p.tipo === 'raya' ? [p.a, p.b] : p.tipo === 'relleno' ? p.puntos : p.tipo === 'arco' ?
  [[p.punto[0] - p.r, p.punto[1] - p.r], [p.punto[0] + p.r, p.punto[1] + p.r]] : p.punto ? [p.punto] : [];
export const textoDeReferencia = p => p.h <= .25 && !/^\s*[x×]\s*\d+\s*$/i.test(p.valor) &&
  !/stock|palet|EN LA N[UÚ]MERO/i.test(p.valor);
export const distanciaCajas = (a, b) => Math.hypot(Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), Math.max(a.y0 - b.y1, b.y0 - a.y1, 0));
export function distanciaPunto(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
export function cotaDePieza(c, pieza) {
  return c.a && c.b && [c.a, c.b].every(q => pieza.some(p => p.tipo === 'raya' && distanciaPunto(q, p.a, p.b) < .025));
}
export function firmaEntidades(es) {
  const ps = es.flatMap(puntos), caja = cajaDe(ps), r = n => Math.round(n * 10000) / 10;
  const p = q => [r(q[0] - caja.x0), r(q[1] - caja.y0)];
  const lista = es.map(e => {
    if (e.tipo === 'raya') return [e.tipo, e.capa, ...[p(e.a), p(e.b)].sort((a, b) => a[0] - b[0] || a[1] - b[1]), e.curva ?? 0];
    if (e.tipo === 'texto') return [e.tipo, e.capa, p(e.punto), e.valor, r(e.h), e.giro ?? 0];
    if (e.tipo === 'arco') return [e.tipo, e.capa, p(e.punto), r(e.r), e.desde, e.hasta];
    return [e.tipo, e.capa, puntos(e).map(p)];
  }).map(e => JSON.stringify(e)).sort();
  return crypto.createHash('sha256').update(lista.join('\n')).digest('hex');
}
export function entidadesMm(es) {
  const caja = cajaDe(es.flatMap(puntos)), mm = q => [Math.round((q[0] - caja.x0) * 10000) / 10, Math.round((q[1] - caja.y0) * 10000) / 10];
  const entidades = { lineas: [], arcos: [], textos: [] };
  for (const e of es) {
    const comun = { capa: e.capa, color: e.color, deCota: !!e.deCota };
    if (e.tipo === 'raya') {
      const [a, b] = [mm(e.a), mm(e.b)];
      entidades.lineas.push({ ...comun, x1: a[0], y1: a[1], x2: b[0], y2: b[1], ...(e.curva ? { curva: e.curva } : {}) });
    } else if (e.tipo === 'relleno') {
      for (let i = 0; i < e.puntos.length; i++) {
        const [a, b] = [mm(e.puntos[i]), mm(e.puntos[(i + 1) % e.puntos.length])];
        if (a[0] !== b[0] || a[1] !== b[1]) entidades.lineas.push({ ...comun, x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
      }
    } else if (e.tipo === 'arco') {
      const [x, y] = mm(e.punto); entidades.arcos.push({ ...comun, x, y, r: Math.round(e.r * 10000) / 10, desde: e.desde, hasta: e.hasta });
    } else if (e.tipo === 'texto') {
      const [x, y] = mm(e.punto); entidades.textos.push({ ...comun, x, y, h: Math.round(e.h * 10000) / 10,
        valor: e.valor, giro: e.giro ?? 0, ancho: Math.round((e.ancho ?? 0) * 10000) / 10,
        ancla: e.ancla, escalaX: e.escalaX ?? 1, literal: true });
    }
  }
  return { entidades, origenMetros: [caja.x0, caja.y0], largoMm: Math.round((caja.x1 - caja.x0) * 1000), altoMm: Math.round((caja.y1 - caja.y0) * 1000) };
}
