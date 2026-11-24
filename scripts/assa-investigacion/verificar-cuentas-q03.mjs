// Verifica pieza por pieza (incluyendo contornos abiertos al orillo y rejillas subdivididas)
// las cantidades reales y multiplicadores xN de 410129-0117, 410130-0175, 410170-0001 y 410171-0001
// en TODOS los lotes fabricados de 2023 a 2026.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';

const baseHist = fileURLToPath(new URL('../../tmp/assa-0711-historico/', import.meta.url));
const base2324 = fileURLToPath(new URL('../../tmp/assa-dudas/cortes-hist/', import.meta.url));

// Cuenta celdas de tamaño (w x h) en una región sumando el área útil o contando segmentos horizontales/verticales de malla
function analizarMalla(modelo, x0, x1, y0, y1, capasRe, escala = 1) {
  const segs = modelo.filter(e => !e.deCota && e.tipo === 'raya' && capasRe.test(e.capa))
    .map(e => ({
      c: e.capa,
      x0: Math.min(e.a[0], e.b[0]) * escala, x1: Math.max(e.a[0], e.b[0]) * escala,
      y0: Math.min(e.a[1], e.b[1]) * escala, y1: Math.max(e.a[1], e.b[1]) * escala,
    }))
    .filter(s => s.x1 >= x0 - 1 && s.x0 <= x1 + 1 && s.y1 >= y0 - 1 && s.y0 <= y1 + 1);
  // Agrupar líneas horizontales y verticales únicas (redondeando a 1 mm)
  const hs = segs.filter(s => Math.abs(s.y1 - s.y0) < 2);
  const vs = segs.filter(s => Math.abs(s.x1 - s.x0) < 2);
  const ys = [...new Set(hs.map(s => Math.round(s.y0)))].sort((a, b) => a - b);
  const xs = [...new Set(vs.map(s => Math.round(s.x0)))].sort((a, b) => a - b);
  // Longitud total de líneas H y V para diagnosticar cuántas piezas hay
  const totalH = Math.round(hs.reduce((s, l) => s + (l.x1 - l.x0), 0));
  const totalV = Math.round(vs.reduce((s, l) => s + (l.y1 - l.y0), 0));
  // Puntos de texto dentro de la región
  const textos = modelo.filter(e => !e.deCota && e.tipo === 'texto')
    .map(e => ({ v: e.valor.replace(/\s+/g, ' ').trim(), x: Math.round(e.punto[0] * escala), y: Math.round(e.punto[1] * escala), c: e.capa }))
    .filter(t => t.x >= x0 - 1000 && t.x <= x1 + 1000 && t.y >= y0 - 1000 && t.y <= y1 + 2000 && t.v && t.v !== 'B');
  // Círculos Ø40 (r ~ 20mm)
  const circs = modelo.filter(e => !e.deCota && e.tipo === 'arco' && Math.abs(e.r * escala - 20) < 3)
    .map(e => ({ x: Math.round(e.punto[0] * escala), y: Math.round(e.punto[1] * escala) }))
    .filter(c => c.x >= x0 - 20 && c.x <= x1 + 20 && c.y >= y0 - 20 && c.y <= y1 + 20);
  // Comprobar por cada celda (xi..xi+1, yj..yj+1) si tiene bordes (al menos 3 de 4, o 2 lados + interior si está al orillo)
  // Más simple: muestrear los centros de cada (xs[i]..xs[i+1], ys[j]..ys[j+1]) y ver cuántos bordes rodean esa celda
  const celdas = [];
  const yAll = [...ys];
  // Si hay verticales que bajan más abajo que el menor Y horizontal, añadir el mínimo Y de las verticales (el orillo!)
  const minYv = Math.min(...vs.map(s => Math.round(s.y0)));
  if (Number.isFinite(minYv) && (!yAll.length || minYv < yAll[0] - 50)) yAll.unshift(minYv);
  const maxYv = Math.max(...vs.map(s => Math.round(s.y1)));
  if (Number.isFinite(maxYv) && (!yAll.length || maxYv > yAll.at(-1) + 50)) yAll.push(maxYv);

  const cubreH = (y, a, b) => hs.some(h => Math.abs(h.y0 - y) < 3 && h.x0 <= a + 3 && h.x1 >= b - 3);
  const cubreV = (x, a, b) => vs.some(v => Math.abs(v.x0 - x) < 3 && v.y0 <= a + 3 && v.y1 >= b - 3);

  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < yAll.length - 1; j++) {
      const a = xs[i], b = xs[i + 1], c = yAll[j], d = yAll[j + 1];
      const w = b - a, h = d - c;
      if (w < 100 || h < 100) continue;
      const izq = cubreV(a, c, d), der = cubreV(b, c, d);
      const abj = cubreH(c, a, b), arr = cubreH(d, a, b);
      // Una pieza válida tiene los 2 lados verticales y al menos el borde superior (el inferior puede ser orillo)
      if (izq && der && (arr || abj)) {
        const key = `${w}×${h}`;
        celdas.push({ key, w, h, closed: izq && der && arr && abj, a, b, c, d });
      }
    }
  }
  const cuenta = {};
  for (const c of celdas) cuenta[c.key] = (cuenta[c.key] ?? 0) + 1;
  return { xsCount: xs.length, ysCount: yAll.length, totalH, totalV, circs: circs.length, cuenta, textos: textos.map(t => `${t.v}@[${t.x},${t.y}]`) };
}

console.log('================ A. 410129-0117 (3 LOTES FABRICADOS) ================');
{
  const m1 = leerPlanoDxf(path.join(baseHist, 'cortes/2025/LOTE 26-07.dxf')).modelo;
  console.log('\n2025-07-26 (RPS=12 uds):');
  console.log('  PLASTEL:', analizarMalla(m1, 5400, 7900, 2200, 4200, /^DISCO[12]$/));
  console.log('  3MM    :', analizarMalla(m1, 9400, 15600, 2000, 3800, /^CUTTER$/));

  const m2 = leerPlanoDxf(path.join(baseHist, 'cortes/2025/LOTE 13-09.dxf')).modelo;
  console.log('\n2025-09-13 (RPS=6 uds):');
  console.log('  PLASTEL:', analizarMalla(m2, 607500, 614600, 217800, 220400, /^DISCO[12]$/));
  console.log('  3MM    :', analizarMalla(m2, 616500, 621000, 218000, 220000, /^CUTTER$/));

  const m3 = leerPlanoDxf(path.join(baseHist, 'cortes/2026/LOTE 07-11_.dxf')).modelo;
  console.log('\n2026-11-07 (RPS=27 uds):');
  console.log('  PLASTEL-1 (X8):', analizarMalla(m3, 105400, 113700, 89400, 91600, /^DISCO[12]$/));
  console.log('  PLASTEL-2 (sueltos+tapas):', analizarMalla(m3, 114600, 121500, 89400, 91600, /^DISCO[12]$/));
  console.log('  3MM-1 (X5):', analizarMalla(m3, 122000, 124400, 89200, 91000, /^CUTTER$/));
  console.log('  3MM-2 (sueltas):', analizarMalla(m3, 124500, 126800, 89200, 90200, /^CUTTER$/));
}

console.log('\n================ B. 410130-0175 (3 LOTES FABRICADOS) ================');
{
  const m1 = leerPlanoDxf(path.join(baseHist, 'cortes/2025/LOTE 09-08.dxf')).modelo;
  console.log('\n2025-08-09 (RPS=24 uds):');
  console.log('  PLASTEL:', analizarMalla(m1, 4700, 7200, 1500, 3600, /^DISCO[12]$/));
  console.log('  PVC900 :', analizarMalla(m1, 9600, 11800, 1400, 4400, /^DISCO[12]$/));
  console.log('  3MM    :', analizarMalla(m1, 14600, 26200, 1500, 3400, /^CUTTER$/));

  const m2 = leerPlanoDxf(path.join(baseHist, 'cortes/2025/LOTE 13-09.dxf')).modelo;
  console.log('\n2025-09-13 (RPS=12 uds):');
  console.log('  PLASTEL:', analizarMalla(m2, 608400, 611000, 206700, 208800, /^DISCO[12]$/));
  console.log('  PVC900 :', analizarMalla(m2, 612600, 613800, 206700, 209700, /^DISCO[12]$/));
  console.log('  3MM    :', analizarMalla(m2, 616800, 624000, 206700, 208600, /^CUTTER$/));

  const m3 = leerPlanoDxf(path.join(baseHist, 'cortes/2026/LOTE 07-11_PALET 4-5.dxf')).modelo;
  console.log('\n2026-11-07 maqcorte (RPS=54 uds):');
  console.log('  PLASTEL:', analizarMalla(m3, 1500, 4100, 1200, 3200, /^DISCO[12]$/));
  console.log('  PVC900 :', analizarMalla(m3, 5700, 10500, 1200, 4200, /^DISCO[12]$/));
  console.log('  3MM-1  :', analizarMalla(m3, 11100, 13700, 1100, 2900, /^CUTTER$/));
  console.log('  3MM-2  :', analizarMalla(m3, 14200, 16800, 1100, 2600, /^CUTTER$/));
}

console.log('\n================ C. 410170-0001 y 410171-0001 (5 LOTES FABRICADOS) ================');
{
  const lotes170 = [
    ['2023-07-28 (10+10 uds)', path.join(base2324, '2023_LOTE 28-07.dxf'), [
      ['170-2mm', 38000, 48500, -1000, 3500, /^(DISCO[12]|CUTTER)$/],
      ['170-1mm-tiras', 49000, 52000, -1000, 3500, /^DISCO[12]$/],
      ['170-1mm-solapas1', 53000, 56800, -1000, 3500, /^DISCO[12]$/],
      ['170-1mm-solapas2', 57000, 59500, -1000, 3500, /^DISCO[12]$/],
      ['171-2mm', 90000, 98500, -1000, 3500, /^(DISCO[12]|CUTTER)$/],
      ['171-1mm-tiras', 98800, 102000, -1000, 3500, /^DISCO[12]$/],
      ['171-1mm-solapas1', 103000, 107200, -1000, 3500, /^DISCO[12]$/],
      ['171-1mm-solapas2', 107400, 109600, -1000, 3500, /^DISCO[12]$/],
    ]],
    ['2023-08-18 (10+10 uds)', path.join(base2324, '2023_LOTE 18-08.dxf'), [
      ['170-2mm', -355000, -349000, -1657500, -1653000, /^(DISCO[12]|CUTTER)$/],
      ['170-1mm-solapasA', -348000, -345000, -1657500, -1653000, /^DISCO[12]$/],
      ['170-1mm-solapasB', -344000, -339000, -1657500, -1653000, /^DISCO[12]$/],
      ['170-1mm-tiras', -338000, -330000, -1657500, -1653000, /^DISCO[12]$/],
      ['171-2mm', -312000, -305000, -1657500, -1653000, /^(DISCO[12]|CUTTER)$/],
      ['171-1mm-solapasA', -304000, -301000, -1657500, -1653000, /^DISCO[12]$/],
      ['171-1mm-solapasB', -300500, -295500, -1657500, -1653000, /^DISCO[12]$/],
      ['171-1mm-tiras', -294500, -286000, -1657500, -1653000, /^DISCO[12]$/],
    ]],
    ['2024-06-08 (16+16 uds)', path.join(base2324, '2024_LOTE 08-06.dxf'), [
      ['171-2mm', 25000, 33000, 120000, 126000, /^(DISCO[12]|CUTTER)$/],
      ['171-1mm-solapas', 33000, 52500, 120000, 123000, /^DISCO[12]$/],
      ['171-1mm-tiras', 54000, 61500, 120000, 123000, /^DISCO[12]$/],
      ['170-2mm', 25000, 33000, 109000, 114000, /^(DISCO[12]|CUTTER)$/],
      ['170-1mm-solapas', 33000, 52500, 109000, 112000, /^DISCO[12]$/],
      ['170-1mm-tiras', 54000, 61500, 109000, 112000, /^DISCO[12]$/],
    ]],
    ['2025-08-23 (1+1 uds)', path.join(baseHist, 'cortes/2025/LOTE 23-08.dxf'), [
      ['170-2mm', 134000, 139000, 93000, 96500, /^(DISCO[12]|CUTTER)$/],
      ['170-1mm-solapas', 139500, 142000, 93000, 97500, /^DISCO[12]$/],
      ['170-1mm-tira', 142500, 146500, 93000, 96500, /^DISCO[12]$/],
      ['171-2mm', 134000, 139000, 81500, 85000, /^(DISCO[12]|CUTTER)$/],
      ['171-1mm-solapas', 139500, 142000, 81500, 85500, /^DISCO[12]$/],
      ['171-1mm-tira', 142500, 147000, 81500, 85500, /^DISCO[12]$/],
    ]],
    ['2026-07-25 (26+26 uds)', path.join(baseHist, 'cortes/2026/LOTE 25-07.dxf'), [
      ['171-2mm', 96500, 101000, 189000, 192500, /^(DISCO[12]|CUTTER)$/],
      ['171-1mm-solapas', 102000, 107500, 186500, 192500, /^DISCO[12]$/],
      ['171-1mm-tiras', 107500, 116500, 186500, 192500, /^DISCO[12]$/],
      ['170-2mm', 155000, 160000, 189500, 193000, /^(DISCO[12]|CUTTER)$/],
      ['170-1mm-solapas', 161000, 166500, 187500, 193500, /^DISCO[12]$/],
      ['170-1mm-tiras', 166500, 175500, 187500, 193500, /^DISCO[12]$/],
    ]],
    ['2026-11-07 (1+1 uds)', path.join(baseHist, 'cortes/2026/LOTE 07-11_.dxf'), [
      ['170-2mm', 107500, 112500, 80000, 83000, /^(DISCO[12]|CUTTER)$/],
      ['170-1mm-solapas', 112800, 115200, 78000, 83600, /^DISCO[12]$/],
      ['170-1mm-tira', 115500, 120000, 78000, 83000, /^DISCO[12]$/],
      ['171-2mm', 154500, 159000, 46500, 49500, /^(DISCO[12]|CUTTER)$/],
      ['171-1mm-solapas', 159200, 162000, 45000, 50500, /^DISCO[12]$/],
      ['171-1mm-tira', 162200, 167000, 45000, 50000, /^DISCO[12]$/],
    ]],
  ];
  for (const [nombre, ruta, zonas] of lotes170) {
    console.log(`\n--- ${nombre} ---`);
    const m = leerPlanoDxf(ruta).modelo;
    for (const [zNom, x0, x1, y0, y1, re] of zonas) {
      const r = analizarMalla(m, x0, x1, y0, y1, re);
      console.log(`  ${zNom.padEnd(18)}: cuenta=${JSON.stringify(r.cuenta)} Ø40=${r.circs} | textos=${r.textos.filter(t => /X\d|LONA|41017|PALET|DERECHO/i.test(t)).join(' ; ')}`);
    }
  }
}
