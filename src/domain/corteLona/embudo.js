import { ENTRADA_CINTA_CM, embudoIssues, etiquetasEmbudo, normalizeEmbudo } from '../embudoConfiguration.js';
import { anchoArial } from './texto.js';

const grados = (a) => a * 180 / Math.PI;
const radianes = (a) => a * Math.PI / 180;
const punto = (r, a) => [r * Math.cos(radianes(a)), r * Math.sin(radianes(a))];

// Iván, 28/10/2026, docs/modelos/embudo.md y AR2605215: corona desarrollada, en cm.
export function geometriaEmbudo(raw) {
  const e = normalizeEmbudo(raw);
  const issues = embudoIssues(e);
  if (issues.length) throw new Error(`Embudo: indica ${issues.map(i => i.label).join(', ')}.`);
  if (e.forma === 'RECTO') return { forma: e.forma };
  const mayor = Math.max(e.contornoArriba, e.contornoAbajo), menor = Math.min(e.contornoArriba, e.contornoAbajo);
  const diferencia = mayor - menor;
  const generatriz = Math.hypot(e.alto, diferencia / (2 * Math.PI));
  const radioExterior = generatriz * mayor / diferencia, radioInterior = radioExterior - generatriz;
  return { forma: e.forma, generatriz, radioExterior, radioInterior, angulo: mayor / radioExterior,
    mayorAbajo: e.contornoAbajo > e.contornoArriba };
}

/** Piezas con contorno propio en mm. Su caja completa, incluidos los arcos, gobierna el anidado. */
export function piezasEmbudo({ embudo, letra = 'A' }) {
  const e = normalizeEmbudo(embudo), g = geometriaEmbudo(e), labels = etiquetasEmbudo(e);
  const bastilla = (boca) => e[`remate${boca}`] === 'BASTILLA' ? e[`bastilla${boca}`] * 10 : 0;
  const refuerzo = (boca) => e[`remate${boca}`] === 'REFUERZO 10';
  const textos = [labels.cierre, labels.arriba, labels.abajo, ...labels.cinta, 'DERECHO'];
  if (g.mayorAbajo) textos.push('BOCA MAYOR ABAJO');
  const linea = (capa, a, b) => ({ capa, x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
  if (e.forma === 'RECTO') {
    // AR2600169 (Iván, 28/10/2026): cada boca añade su remate (B.N (10) = 10, E.CINTA (25) = 6; el refuerzo del recto
    // es una B.N (10)) y la raya de rotulador va al doble, donde llega el borde doblado: 100 de alto → 116, rayas a 20 y 104.
    // El cierre se marca a su medida desde el borde izquierdo.
    const anade = (boca) => ({ BASTILLA: e[`bastilla${boca}`], 'REFUERZO 10': 10, 'ENTRADA CINTA': ENTRADA_CINTA_CM })[e[`remate${boca}`]] * 10 || 0;
    const w = (e.contornoArriba + e.cierre) * 10, h = e.alto * 10 + anade('Arriba') + anade('Abajo');
    const lineas = [linea('DISCO1', [0, 0], [w, 0]), linea('DISCO1', [w, 0], [w, h]),
      linea('DISCO1', [w, h], [0, h]), linea('DISCO1', [0, h], [0, 0])];
    if (e.cierre > 0) lineas.push(linea('ROTULADOR', [e.cierre * 10, 0], [e.cierre * 10, h]));
    for (const [boca, y] of [['Arriba', h - 2 * anade('Arriba')], ['Abajo', 2 * anade('Abajo')]]) {
      if (!anade(boca)) continue;
      if (y <= 0 || y >= h) throw new Error('El remate no cabe en el alto del embudo.');
      lineas.push(linea('ROTULADOR', [0, y], [w, y]));
    }
    return [pieza(`${letra} EMBUDO`, { lineas, arcos: [], textos: [] }, textos)];
  }
  const R = g.radioExterior * 10, r = g.radioInterior * 10, angulo = grados(g.angulo);
  const grande = g.mayorAbajo ? 'Abajo' : 'Arriba', pequena = g.mayorAbajo ? 'Arriba' : 'Abajo';
  const exterior = R + bastilla(grande), interior = r - bastilla(pequena);
  if (interior <= 0) throw new Error('La bastilla supera el radio de la boca pequeña.');
  const desde = 90 - angulo / 2, hasta = desde + angulo;
  const arco = (capa, radio, cierre = 0) => ({ capa, x: 0, y: 0, r: radio, desde, hasta: hasta + grados(cierre / radio) });
  const corona = (ro, ri, cierre = 0) => {
    const a = arco('DISCO1', ro, cierre), b = arco('DISCO1', ri, cierre);
    return { arcos: [a, b], lineas: [linea('DISCO1', punto(ro, desde), punto(ri, desde)),
      linea('DISCO1', punto(ro, a.hasta), punto(ri, b.hasta))], textos: [] };
  };
  const forma = corona(exterior, interior, e.cierre * 10);
  if (e.cierre > 0) forma.lineas.push(linea('ROTULADOR', punto(exterior, hasta), punto(interior, hasta)));
  for (const [boca, radio, marca] of [[grande, R, R - 100], [pequena, r, r + 100]]) {
    if (refuerzo(boca) && (marca <= r || marca >= R)) throw new Error('El refuerzo de 10 cm no cabe en la generatriz del embudo.');
    if (refuerzo(boca) || bastilla(boca)) forma.arcos.push(arco('ROTULADOR', refuerzo(boca) ? marca : radio, bastilla(boca) ? e.cierre * 10 : 0));
  }
  const piezas = [pieza(`${letra} EMBUDO`, forma, textos)];
  for (const boca of ['Arriba', 'Abajo']) if (refuerzo(boca)) {
    const esGrande = boca === grande;
    piezas.push({ ...pieza(`${letra} REF. ${boca.toUpperCase()}`, corona(esGrande ? R : r + 100, esGrande ? R - 100 : r), ['REF.(10)', 'REF. POR EL DERECHO']),
      refuerzo: boca.toLowerCase() });
  }
  return piezas;
}

function pieza(nombre, geometria, etiquetas) {
  const puntos = geometria.lineas.flatMap(l => [[l.x1, l.y1], [l.x2, l.y2]]);
  for (const a of geometria.arcos) {
    for (const angulo of [a.desde, a.hasta, ...[0, 90, 180, 270, 360].filter(t => t >= a.desde && t <= a.hasta)]) {
      const [x, y] = punto(a.r, angulo);
      puntos.push([a.x + x, a.y + y]);
    }
  }
  const x0 = Math.min(...puntos.map(p => p[0])), y0 = Math.min(...puntos.map(p => p[1]));
  const largo = Math.max(...puntos.map(p => p[0])) - x0, alto = Math.max(...puntos.map(p => p[1])) - y0;
  geometria.lineas = geometria.lineas.map(l => ({ ...l, x1: l.x1 - x0, y1: l.y1 - y0, x2: l.x2 - x0, y2: l.y2 - y0 }));
  geometria.arcos = geometria.arcos.map(a => ({ ...a, x: a.x - x0, y: a.y - y0 }));
  // Rótulos dentro de la franja central; los refuerzos son curvos y estrechos.
  const sagita = geometria.arcos.length ? Math.max(...geometria.arcos.map(a => a.r * (1 - Math.cos(radianes(a.hasta - a.desde) / 2)))) : 0;
  const libre = Math.max(1, alto - sagita * 2);
  const h = Math.min(35, libre / (etiquetas.length * 2 + 2), ...etiquetas.map(v => largo * 0.72 / anchoArial(v, 1)));
  geometria.textos = etiquetas.map((valor, i) => ({ capa: 'texto', x: largo / 2,
    y: alto / 2 + ((etiquetas.length - 1) / 2 - i) * h * 1.7, h, valor, centrado: true }));
  return { nombre, largo, alto, marcas: [], sinReves: true, geometria };
}

/** Traslada la geometría al rollo con el mismo giro de 90° que el resto de piezas. */
export function dibujoPiezaEmbudo(p) {
  const sitio = (x, y) => p.girada ? [p.x + p.alto - y, p.y + x] : [p.x + x, p.y + y];
  return {
    lineas: p.geometria.lineas.map(l => { const a = sitio(l.x1, l.y1), b = sitio(l.x2, l.y2);
      return { ...l, x1: a[0], y1: a[1], x2: b[0], y2: b[1] }; }),
    arcos: p.geometria.arcos.map(a => { const [x, y] = sitio(a.x, a.y);
      return { ...a, x, y, desde: a.desde + (p.girada ? 90 : 0), hasta: a.hasta + (p.girada ? 90 : 0) }; }),
    textos: [...p.geometria.textos, { capa: 'texto', x: p.largo / 2, y: p.alto * 0.12,
      h: Math.min(25, p.alto * 0.07), valor: [p.nombre, p.of, p.repeticiones > 1 ? `X${p.repeticiones}` : ''].filter(Boolean).join(' · '), centrado: true }]
      .map(t => { const [x, y] = sitio(t.x, t.y); return { ...t, x, y, giro: (t.giro || 0) + (p.girada ? 90 : 0) }; })
  };
}
