// A4 de ganado aprobada en 9d96d08. Solo se adaptan rótulos de «texto» y las cotas.
import { escribirDxfPlano } from '../../domain/corteLona/presentacion.js';
import { leerPlanoTexto } from '../../flujoDwg/planoDxf.js';

import { PAPEL, cajaPuntos, limites, ejeCota, segmentos, prepararGrupo, colocar, escribirVistas } from '../../domain/corteLona/rotulosImpresion.js';

// Reconoce los contornos existentes para devolver cada instrucción de Cal a su propia pieza.
function anclarNotasGanado(g) {
  const piezas = [], extremos = new Map();
  const juntar = (puntos, entidad, tipo) => {
    const claves = puntos.map(([x, y]) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)}`);
    const grupos = [...new Set(claves.map(k => extremos.get(k)).filter(Boolean))];
    const p = grupos[0] ?? { puntos: [], formas: [] };
    if (!grupos.length) piezas.push(p);
    for (const q of grupos.slice(1)) { p.puntos.push(...q.puntos); p.formas.push(...q.formas); piezas.splice(piezas.indexOf(q), 1); for (const [k, v] of extremos) if (v === q) extremos.set(k, p); }
    p.puntos.push(...puntos); p.formas.push({ entidad, tipo });
    claves.forEach(k => extremos.set(k, p));
  };
  for (const l of g.entidades.lineas.filter(l => l.capa === 'DISCO1')) juntar([[l.x1, l.y1], [l.x2, l.y2]], l, 'lineas');
  for (const p of g.entidades.polilineas.filter(p => p.capa === 'DISCO1')) juntar(p.puntos, p, 'polilineas');
  for (const a of g.entidades.arcos.filter(a => a.capa === 'DISCO1')) {
    const ps = [a.desde, a.hasta].map(ang => [a.x + a.r * Math.cos(ang * Math.PI / 180), a.y + a.r * Math.sin(ang * Math.PI / 180)]);
    juntar(ps, a, 'arcos');
  }
  for (const p of piezas) p.caja = cajaPuntos(p.puntos);
  for (const p of [...piezas]) {
    const padre = piezas.find(q => q !== p && q.caja.x0 <= p.caja.x0 && q.caja.x1 >= p.caja.x1 && q.caja.y0 <= p.caja.y0 && q.caja.y1 >= p.caja.y1);
    if (padre) { padre.formas.push(...p.formas); padre.puntos.push(...p.puntos); piezas.splice(piezas.indexOf(p), 1); }
  }
  piezas.sort((a, b) => (b.caja.x1 - b.caja.x0) * (b.caja.y1 - b.caja.y0) - (a.caja.x1 - a.caja.x0) * (a.caja.y1 - a.caja.y0));
  const distancia = (p, punto) => {
    const b = p.caja, dx = Math.max(b.x0 - punto[0], 0, punto[0] - b.x1), dy = Math.max(b.y0 - punto[1], 0, punto[1] - b.y1);
    return Math.hypot(dx, dy);
  };
  const proxima = punto => piezas.toSorted((a, b) => distancia(a, punto) - distancia(b, punto))[0];
  for (const p of piezas) p.entidades = Object.fromEntries(Object.keys(g.entidades).map(k => [k, []]));
  for (const tipo of ['lineas', 'polilineas', 'arcos', 'circulos']) for (const f of g.entidades[tipo]) {
    const asignada = piezas.find(p => p.formas.some(q => q.entidad === f));
    const punto = tipo === 'lineas' ? [(f.x1 + f.x2) / 2, (f.y1 + f.y2) / 2] : tipo === 'polilineas' ? [f.puntos[0][0], f.puntos[0][1]] : [f.x, f.y];
    (asignada ?? proxima(punto)).entidades[tipo].push(f);
  }
  const nombres = new Map();
  for (const t of g.entidades.textos) {
    const nombre = /^([^·]+) · corte/.exec(t.valor)?.[1]?.trim();
    if (nombre) nombres.set(nombre, proxima([t.x, t.y]));
  }
  const titulo = g.entidades.textos.find(t => t.capa === 'texto');
  for (const t of g.entidades.textos) {
    if (t.capa !== 'texto') continue;
    let p = t === titulo ? piezas[0] : proxima([t.x, t.y]);
    if (/ · corte/.test(t.valor)) { t.x = (p.caja.x0 + p.caja.x1) / 2; t.encimaDe = p.caja.y1; }
    const nombre = /^Bajos /.test(t.valor) ? 'Cuerpo' : /^Ventana \d/.test(t.valor) ? 'Frente'
      : /^(Lona por el exterior|Puerta |Refuerzo MFD de Cal)/.test(t.valor) ? 'Morro' : null;
    if (nombre && nombres.has(nombre)) {
      p = nombres.get(nombre);
      const b = p.caja;
      if (nombre === 'Cuerpo') { t.x = (b.x0 + b.x1) / 2; t.y = b.y0 - .35; }
      else if (nombre === 'Frente') { t.x = b.x1 + .2; t.y = (b.y0 + b.y1) / 2; t.giro = 90; }
      else if (t.valor.startsWith('Lona por el exterior')) { t.x = (b.x0 + b.x1) / 2; t.y = b.y0 + .7 * (b.y1 - b.y0); t.giro = 90; }
      else if (t.valor.startsWith('Refuerzo MFD de Cal')) { t.x = (b.x0 + b.x1) / 2; t.y = b.y0 + .3 * (b.y1 - b.y0); t.giro = 90; }
      else {
        const ls = p.entidades.lineas.filter(l => l.capa === 'ROTULADOR' && Math.hypot(l.x2 - l.x1, l.y2 - l.y1) > .15);
        const l = ls.toSorted((a, b) => Math.hypot(b.x2 - b.x1, b.y2 - b.y1) - Math.hypot(a.x2 - a.x1, a.y2 - a.y1))[0];
        t.x = l ? (l.x1 + l.x2) / 2 + .2 : b.x1 + .2;
        t.y = l ? (l.y1 + l.y2) / 2 : (b.y0 + b.y1) / 2;
        t.giro = l ? Math.atan2(l.y2 - l.y1, l.x2 - l.x1) * 180 / Math.PI : 90;
        if (t.giro > 90 || t.giro < -90) t.giro += 180;
        if (t.valor.startsWith('Puerta ')) {
          t.referencia = l ? [(l.x1 + l.x2) / 2, (l.y1 + l.y2) / 2] : [b.x1, (b.y0 + b.y1) / 2];
          t.x = b.x1 + .65; t.y = b.y0 + .7 * (b.y1 - b.y0); t.giro = 90;
        }
      }
      t.referencia ??= [t.x, t.y];
    }
  }
}

export function presentarGanadoA4(plano, cabecera, grupos) {
  // Las notas de Cal se sitúan en el borde de su pieza, dentro de la única vista del conjunto.
  for (const g of grupos.filter(g => !g.corte && g.nombre.startsWith('GANADO'))) anclarNotasGanado(g);
  const dibujos = grupos.filter(g => !g.corte), disponibles = grupos.filter(g => g.corte);
  const ofs = dibujos.map(d => /OF (\d{7})/.exec(d.nombre)?.[1]).filter(Boolean);
  const asociados = disponibles.filter(c => c.entidades.textos.some(t => ofs.some(of => t.valor.includes(of))));
  const cortes = asociados.length ? asociados : disponibles.slice(0, 1);
  const geometria = g => limites({ ...g.entidades, textos: [], cotas: [] });
  for (const g of cortes) {
    const b = geometria(g), otros = cortes.filter(c => c !== g).map(geometria);
    g.banda = { y0: Math.max(-Infinity, ...otros.filter(c => c.y1 < b.y0).map(c => (c.y1 + b.y0) / 2)),
      y1: Math.min(Infinity, ...otros.filter(c => c.y0 > b.y1).map(c => (c.y0 + b.y1) / 2)) };
  }
  const parejas = dibujos.map(d => {
    const of = /OF (\d{7})/.exec(d.nombre)?.[1];
    const suyos = cortes.filter(c => c.entidades.textos.some(t => of && t.valor.includes(of)));
    return { dibujo: d, cortes: suyos.length ? suyos : cortes.slice(0, 1) };
  });
  const areaDibujo = { ancho: 184, alto: PAPEL.alto, centro: [102.5, PAPEL.centro[1]] };
  const areaCorte = (i, n) => ({ ancho: 86, alto: (PAPEL.alto - (n - 1) * 4) / n,
    centro: [243.5, PAPEL.centro[1] + PAPEL.alto / 2 - (i + .5) * (PAPEL.alto + 4) / n + 2] });
  const mapaCortes = new Map(cortes.map(c => {
    const n = Math.max(...parejas.filter(p => p.cortes.includes(c)).map(p => p.cortes.length), 1);
    return [c, prepararGrupo(c, areaCorte(0, n))];
  }));
  const paginas = parejas.map(p => ({ nombre: p.dibujo.nombre, vistas: [{ vista: prepararGrupo(p.dibujo, areaDibujo), area: areaDibujo },
    ...p.cortes.map((c, i) => ({ vista: mapaCortes.get(c), area: areaCorte(i, p.cortes.length) }))] }));
  const vistas = [...new Set(paginas.flatMap(p => p.vistas.map(v => v.vista)))];
  escribirVistas(plano, cabecera, paginas);
  const modelo = leerPlanoTexto(escribirDxfPlano({ ...plano, hojas: plano.hojas.slice(0, 1) }, cabecera).dxf);
  const ordenCotas = [...plano.cotas, ...plano.corte.cotas], lineas = [];
  let indiceCota = -1;
  const error = .01 / Math.max(...vistas.map(v => v.escala));
  for (const p of modelo.modelo) {
    if (p.tipo === 'cota') { indiceCota++; continue; }
    if (!modelo.imprime(p) || p.capa === 'RECUADROS') continue;
    const c = p.deCota ? ordenCotas[indiceCota] : null;
    for (const l of segmentos(p, error)) {
      if (c) {
        const e = ejeCota(c), cruz = q => (q[0] - e.origen[0]) * e.u[1] - (q[1] - e.origen[1]) * e.u[0];
        if (Math.abs(cruz(l.a)) < 1e-5 && Math.abs(cruz(l.b)) < 1e-5) continue;
      }
      lineas.push({ ...l, cota: c });
    }
  }
  for (const c of ordenCotas.filter(c => c.capa !== 'vent-pre-noimpr')) {
    const e = ejeCota(c); lineas.push({ tipo: 'raya', capa: 'cotas', deCota: true, a: e.origen, b: e.punto(e.largo), cota: c, esBase: true });
  }
  for (const v of vistas) colocar(v, lineas, plano);
  escribirVistas(plano, cabecera, paginas);
}
