// Cuenta con precisión las piezas reales (rectangulares, poligonales y rejillas) y sus xN
// en todos los lotes fabricados de 410129-0117, 410130-0175, 410170-0001 y 410171-0001.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';

const baseHist = fileURLToPath(new URL('../../tmp/assa-0711-historico/', import.meta.url));
const base2324 = fileURLToPath(new URL('../../tmp/assa-dudas/cortes-hist/', import.meta.url));
const baseCli = fileURLToPath(new URL('../../tmp/assa-dudas/cliente/dxf/', import.meta.url));

function contarEnCaja(modelo, x0, x1, y0, y1, escala = 1) {
  const segs = modelo.filter(e => !e.deCota && e.tipo === 'raya' && /^(DISCO[12]|CUTTER|ROTULADOR|cortes - lona|curv|marca)$/i.test(e.capa))
    .map(e => ({
      c: e.capa,
      a: [e.a[0] * escala, e.a[1] * escala],
      b: [e.b[0] * escala, e.b[1] * escala],
      len: Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]) * escala,
    }))
    .filter(s => Math.max(s.a[0], s.b[0]) >= x0 - 10 && Math.min(s.a[0], s.b[0]) <= x1 + 10 &&
                 Math.max(s.a[1], s.b[1]) >= y0 - 10 && Math.min(s.a[1], s.b[1]) <= y1 + 10);
  const arcos = modelo.filter(e => !e.deCota && e.tipo === 'arco')
    .map(e => ({ c: e.capa, x: e.punto[0] * escala, y: e.punto[1] * escala, r: e.r * escala }))
    .filter(a => a.x >= x0 - 10 && a.x <= x1 + 10 && a.y >= y0 - 10 && a.y <= y1 + 10);
  const textos = modelo.filter(e => !e.deCota && e.tipo === 'texto')
    .map(e => ({ c: e.capa, v: e.valor.replace(/\s+/g, ' ').trim(), x: Math.round(e.punto[0] * escala), y: Math.round(e.punto[1] * escala) }))
    .filter(t => t.x >= x0 - 1000 && t.x <= x1 + 1000 && t.y >= y0 - 1000 && t.y <= y1 + 2000 && t.v && t.v !== 'B');
  return { segs, arcos, textos };
}

// 1. Inspección exacta de las solapas 350x400 y cuerpos 2mm y tiras 1mm en 410170-0001 / 410171-0001
console.log('=== 1. 410170-0001 y 410171-0001: DESPIECE DETALLADO EN 6 LOTES ===');

function analizar170(etiqueta, ruta, rx0, rx1, ry0, ry1) {
  const { modelo } = leerPlanoDxf(ruta);
  const { segs, arcos, textos } = contarEnCaja(modelo, rx0, rx1, ry0, ry1);
  // Agrupar segmentos de corte (DISCO1/2 + CUTTER) en componentes conectados (gap < 250mm)
  const corte = segs.filter(s => /^(DISCO[12]|CUTTER)$/i.test(s.c));
  const comps = [];
  for (const s of corte) {
    const sx0 = Math.min(s.a[0], s.b[0]), sx1 = Math.max(s.a[0], s.b[0]);
    const sy0 = Math.min(s.a[1], s.b[1]), sy1 = Math.max(s.a[1], s.b[1]);
    comps.push({ x0: sx0, x1: sx1, y0: sy0, y1: sy1, segs: [s] });
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const a = comps[i], b = comps[j];
        if (a.x0 <= b.x1 + 120 && a.x1 >= b.x0 - 120 && a.y0 <= b.y1 + 120 && a.y1 >= b.y0 - 120) {
          a.x0 = Math.min(a.x0, b.x0); a.x1 = Math.max(a.x1, b.x1);
          a.y0 = Math.min(a.y0, b.y0); a.y1 = Math.max(a.y1, b.y1);
          a.segs.push(...b.segs);
          comps.splice(j, 1);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  comps.sort((a, b) => a.x0 - b.x0 || b.y0 - a.y0);
  console.log(`\n--- ${etiqueta} ---`);
  for (const c of comps) {
    const w = Math.round(c.x1 - c.x0), h = Math.round(c.y1 - c.y0);
    if (w < 100 && h < 100) continue;
    const capas = [...new Set(c.segs.map(s => s.c))].join(',');
    const o40 = arcos.filter(a => Math.abs(a.r - 20) < 3 && a.x >= c.x0 - 20 && a.x <= c.x1 + 20 && a.y >= c.y0 - 20 && a.y <= c.y1 + 20).length;
    const rot = segs.filter(s => s.c === 'ROTULADOR' && Math.min(s.a[0], s.b[0]) >= c.x0 - 20 && Math.max(s.a[0], s.b[0]) <= c.x1 + 20 &&
      Math.min(s.a[1], s.b[1]) >= c.y0 - 20 && Math.max(s.a[1], s.b[1]) <= c.y1 + 20).length;
    const ts = textos.filter(t => t.x >= c.x0 - 1200 && t.x <= c.x1 + 1200 && t.y >= c.y0 - 1000 && t.y <= c.y1 + 1800)
      .filter(t => /X\s*\d+|LONA|41017|PALET/i.test(t.v))
      .map(t => `${t.v}@[${t.x},${t.y}]`);
    // Detectar qué tipo de bloque es por dimensiones
    let nota = '';
    if (Math.abs(w - 2600) < 30 && h > 900 && h < 1300) nota = `≈CUERPO 2mm (${w}×${h})`;
    else if (Math.abs(h - 2600) < 30 && w > 900 && w < 1300) nota = `≈CUERPO 2mm rot (${w}×${h})`;
    else if (Math.abs(w - 2600) < 30 && Math.abs(h % 416.2) < 30) nota = `≈${Math.round(h / 416.2)}×TIRA 1mm (2600×416)`;
    else if (Math.abs(w - 2600) < 30 && Math.abs(h % 400) < 30) nota = `≈${Math.round(h / 400)}×TIRA 1mm (2600×400)`;
    else if (w % 350 < 20 && h % 400 < 20) nota = `≈SOLAPAS 350×400 (rejilla ${Math.round(w / 350)}×${Math.round(h / 400)}=${Math.round(w / 350) * Math.round(h / 400)})`;
    else if (w % 400 < 20 && h % 350 < 20) nota = `≈SOLAPAS 400×350 (rejilla ${Math.round(w / 400)}×${Math.round(h / 350)}=${Math.round(w / 400) * Math.round(h / 350)})`;
    else if (Math.abs(w - 370) < 15 && Math.abs(h - 448) < 15) nota = `≈TAPA 2mm (370×448)`;
    console.log(`  [${capas.padEnd(13)}] ${String(w).padStart(5)}×${String(h).padStart(4)} @[${Math.round(c.x0)},${Math.round(c.y0)}] Ø40=${String(o40).padStart(2)} rot=${String(rot).padStart(2)} ${nota} | ${ts.join(' ; ')}`);
  }
}

analizar170('2023-07-28 410170-0001 (10 uds)', path.join(base2324, '2023_LOTE 28-07.dxf'), 38000, 60000, -1500, 4000);
analizar170('2023-07-28 410171-0001 (10 uds)', path.join(base2324, '2023_LOTE 28-07.dxf'), 89500, 110500, -1500, 4000);
analizar170('2023-08-18 410170-0001 (10 uds)', path.join(base2324, '2023_LOTE 18-08.dxf'), -356000, -329000, -1658000, -1652000);
analizar170('2024-06-08 410170-0001 (16 uds)', path.join(base2324, '2024_LOTE 08-06.dxf'), 25000, 62000, 108500, 113000);
analizar170('2024-06-08 410171-0001 (16 uds)', path.join(base2324, '2024_LOTE 08-06.dxf'), 25000, 62000, 119500, 126500);
analizar170('2025-08-23 410170-0001 (1 ud)', path.join(baseHist, 'cortes/2025/LOTE 23-08.dxf'), 133500, 147000, 92500, 98000);
analizar170('2026-07-25 410171-0001 (26 uds)', path.join(baseHist, 'cortes/2026/LOTE 25-07.dxf'), 96000, 117000, 186500, 193500);
analizar170('2026-07-25 410170-0001 (26 uds)', path.join(baseHist, 'cortes/2026/LOTE 25-07.dxf'), 155000, 176000, 187500, 194000);
analizar170('2026-11-07 410170-0001 (1 ud)', path.join(baseHist, 'cortes/2026/LOTE 07-11_.dxf'), 107000, 120500, 78000, 84000);
analizar170('2026-11-07 410171-0001 (1 ud)', path.join(baseHist, 'cortes/2026/LOTE 07-11_.dxf'), 154000, 167500, 45000, 50500);

// 2. Verificar también qué hay exactamente en 410129-0117 del 07-11 (oficina + maqcorte) para explicar el X8
console.log('\n=== 2. 410129-0117 en 07-11 (oficina + maqcorte): detalle de bloques ===');
analizar170('2026-11-07 410129-0117 maqcorte (27 uds)', path.join(baseHist, 'cortes/2026/LOTE 07-11_.dxf'), 105000, 127500, 88800, 92500);

// 3. Ver también en OK410170.dxf y OK410171.dxf los textos exactos de la variante 0001
console.log('\n=== 3. OK410170.dxf / OK410171.dxf: textos alrededor de 0001 ===');
for (const fn of ['OK410170.dxf', 'OK410171.dxf']) {
  const { modelo } = leerPlanoDxf(path.join(baseCli, fn));
  const ts = modelo.filter(e => e.tipo === 'texto' && !e.deCota);
  const refs = ts.filter(t => /41017[01]\s*-\s*0001/i.test(t.valor));
  console.log(`\n--- ${fn} (${refs.length} rótulos 0001) ---`);
  for (const r of refs.slice(0, 3)) {
    const vec = ts.filter(t => Math.abs(t.punto[0] - r.punto[0]) < 8 && Math.abs(t.punto[1] - r.punto[1]) < 6)
      .map(t => t.valor.replace(/\s+/g, ' ').trim());
    console.log('  Rótulo:', r.valor.trim(), '@', r.punto.map(v => +v.toFixed(1)), '->', [...new Set(vec)].join(' | '));
  }
}
