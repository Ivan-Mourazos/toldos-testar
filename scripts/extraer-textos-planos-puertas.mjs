// Saca los textos de taller de los planos hechos de Portanova (DXF convertidos con ODA
// desde copias locales de los DWG) y dice dónde van respecto a la puerta.
//
// Uso: node scripts/extraer-textos-planos-puertas.mjs [carpeta]
// Por defecto lee tmp/puertas-contraste/planos/ (copias, solo lectura) y escribe
// tmp/puertas-contraste/textos-planos.json. No escribe nada fuera de tmp/.
import fs from 'node:fs';
import path from 'node:path';
import { leerDxf } from './lib/leer-dxf.mjs';

// Frente y alto de cada plano, en cm. Salen de RPS (genericas/rps.json) y de
// configuraciones.json del estudio; el script comprueba que el plano tiene esas cotas.
export const PLANOS_PUERTAS = [
  { pedido: 'AR2604069', modelo: 'PUERTAENR', frente: 315, alto: 494 },
  { pedido: 'AR2604638', modelo: 'PUERTAENR', frente: 172, alto: 314 },
  { pedido: 'AR2604725', modelo: 'PUERTAENR', frente: 474, alto: 430 },
  { pedido: 'AR2605036', modelo: 'PUERTAPLE', frente: 620, alto: 450 },
  { pedido: 'AR2604809', modelo: 'PUERTAPLE', frente: 444, alto: 605 },
  { pedido: 'AR2604904', modelo: 'PUERTAUTO', frente: 426, alto: 515 },
];

const cerca = (a, b, t = 0.6) => Math.abs(a - b) < t;

/** Busca la puerta: una cota horizontal del frente y una vertical del alto que comparten esquina. */
export function buscarPuerta(entidades, F, H) {
  const dims = entidades.filter(e => e.tipo === 'DIMENSION' && Number.isFinite(e.medida));
  const horizontales = dims.filter(d => cerca(d.medida, F) && cerca(d.p1[1], d.p2[1], 1e-3) && Math.abs(d.p1[0] - d.p2[0]) > 0);
  const verticales = dims.filter(d => cerca(d.medida, H) && Math.abs(d.p1[1] - d.p2[1]) > 10 * Math.abs(d.p1[0] - d.p2[0]));
  const candidatos = [];
  for (const h of horizontales) {
    const escala = F / Math.abs(h.p1[0] - h.p2[0]);
    for (const v of verticales) {
      if (!cerca(H / Math.abs(v.p1[1] - v.p2[1]), escala, escala * 0.01)) continue;
      const xs = [h.p1[0], h.p2[0]], ys = [v.p1[1], v.p2[1]];
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      // La cota del frente va en el borde de arriba de la lona (en la apilable, el
      // bolsillo queda por encima del alto terminado; en la autorreparable, 3,5) y
      // la del alto en un lateral.
      const tocaArriba = h.p1[1] >= y1 - 1 / escala && h.p1[1] - y1 <= 15 / escala;
      const tocaLado = [v.p1[0], v.p2[0]].some(x => Math.abs(x - x0) < 25 / escala || Math.abs(x - x1) < 25 / escala);
      if (tocaArriba && tocaLado) candidatos.push({ x0, x1, y0, y1, escala, bordeLona: Math.round((h.p1[1] - y1) * escala * 10) / 10 });
    }
  }
  return candidatos[0] ?? null;
}

function zona(x, y, F, H) {
  if (x >= 0 && x <= F && y >= 0 && y <= H) return 'dentro';
  if (y < 0) return 'arriba';
  if (y > H) return 'abajo';
  return x < 0 ? 'izquierda' : 'derecha';
}

export function textosDePlano(ruta, { frente: F, alto: H }) {
  const { entidades } = leerDxf(ruta);
  const p = buscarPuerta(entidades, F, H);
  if (!p) return { error: `No se encuentra la puerta de ${F} × ${H} en el plano` };
  const s = p.escala;
  const margen = 160 / s; // 1,6 m alrededor de la puerta
  const textos = entidades
    .filter(e => (e.tipo === 'TEXT' || e.tipo === 'MTEXT') && e.valor.trim())
    .filter(e => e.x >= p.x0 - margen && e.x <= p.x1 + margen && e.y >= p.y0 - margen && e.y <= p.y1 + margen)
    .map(e => {
      const x = (e.x - p.x0) * s, y = (p.y1 - e.y) * s; // y desde el borde de arriba, hacia abajo
      return {
        valor: e.valor.replace(/\s+/g, ' ').trim(),
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        alto: Math.round(e.h * s * 10) / 10,
        giro: Math.round(e.giro),
        capa: e.capa,
        zona: zona(x, y, F, H),
      };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const cotas = entidades
    .filter(e => e.tipo === 'DIMENSION' && Number.isFinite(e.medida))
    .filter(e => [e.p1, e.p2].every(q => q[0] >= p.x0 - margen && q[0] <= p.x1 + margen && q[1] >= p.y0 - margen && q[1] <= p.y1 + margen))
    .map(e => ({
      medida: Math.round(e.medida * 100) / 100,
      vertical: cerca(e.p1[0], e.p2[0], 1e-3),
      desde: [Math.round((e.p1[0] - p.x0) * s * 10) / 10, Math.round((p.y1 - e.p1[1]) * s * 10) / 10],
      hasta: [Math.round((e.p2[0] - p.x0) * s * 10) / 10, Math.round((p.y1 - e.p2[1]) * s * 10) / 10],
    }));
  return { puerta: { frente: F, alto: H, escala: s, bordeLonaSobreAlto: p.bordeLona }, textos, cotas };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:')}`) {
  const carpeta = process.argv[2] ?? 'tmp/puertas-contraste/planos';
  const salida = {};
  for (const plano of PLANOS_PUERTAS) {
    const ruta = path.join(carpeta, `${plano.pedido}.dxf`);
    if (!fs.existsSync(ruta)) { salida[plano.pedido] = { error: `Falta ${ruta}` }; continue; }
    salida[plano.pedido] = { modelo: plano.modelo, ...textosDePlano(ruta, plano) };
  }
  fs.mkdirSync('tmp/puertas-contraste', { recursive: true });
  fs.writeFileSync('tmp/puertas-contraste/textos-planos.json', JSON.stringify(salida, null, 1));
  for (const [pedido, r] of Object.entries(salida)) {
    console.log(`\n## ${pedido} · ${r.modelo ?? ''}`);
    if (r.error) { console.log(r.error); continue; }
    for (const t of r.textos) console.log(`${t.zona.padEnd(9)} x ${String(t.x).padStart(7)} y ${String(t.y).padStart(7)} h ${String(t.alto).padStart(5)} g ${String(t.giro).padStart(3)} ${t.capa.padEnd(10)} ${t.valor}`);
    console.log('cotas:', r.cotas.map(c => `${c.vertical ? 'V' : 'H'}${c.medida}@${c.desde.join(',')}`).join('  '));
  }
}
