// Analiza Q-AS0711-02: todas las líneas de COMBURSA (2021-2026) repartidas en varios bultos/palets en RPS,
// y todos los textos «PALET X y Y» o repartos de palets en los DXF de oficina de 2025-2026.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';

const rpsHist = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../tmp/assa-dudas/rps-historico.json', import.meta.url)), 'utf8'));
const baseHist = fileURLToPath(new URL('../../tmp/assa-0711-historico/', import.meta.url));

// 1. Deduplicar bultos por IDPackingListBoxDetail
const vistos = new Set();
const bultos = rpsHist.bultos.filter(b => {
  const k = `${b.IDOrderLine}|${b.lista}|${b.numero}|${b.IDPackingListBoxDetail ?? b.cantidad}`;
  if (vistos.has(k)) return false;
  vistos.add(k);
  return true;
});

const porLinea = Map.groupBy(bultos, b => `${b.IDOrderLine}|${b.lista}`);
const multiPalet = [];
const totalLineasConBulto = porLinea.size;

for (const [, bs] of porLinea) {
  const paletsDistintos = [...new Set(bs.map(b => `${b.numero}:${(b.comentario ?? '').trim()}`))];
  if (paletsDistintos.length > 1) {
    const b0 = bs[0];
    multiPalet.push({
      entrega: b0.entregaSolicitada,
      pedido: `${b0.CodOrder}/${b0.NumLine}`,
      ref: b0.CodArticle,
      udsPedido: b0.cantidadPedido,
      lista: b0.lista,
      cerrada: b0.cerrada,
      reparto: bs.map(b => `P${b.numero}(${(b.comentario ?? '').trim() || 'sin-com'}):${b.cantidad}`).join(' + '),
      sumaBultos: bs.reduce((s, b) => s + b.cantidad, 0),
    });
  }
}

console.log(`=== 1. RPS 2021-2026: líneas repartidas en >1 bulto/palet (${multiPalet.length} de ${totalLineasConBulto} pares línea/lista) ===`);
for (const m of multiPalet) {
  console.log(`${m.entrega} | ${m.pedido.padEnd(14)} | ${m.ref.padEnd(15)} | ped=${String(m.udsPedido).padStart(3)} | sum=${String(m.sumaBultos).padStart(3)} | ${m.lista}(${m.cerrada ? 'C' : 'A'}) | ${m.reparto}`);
}

// También revisar comentarios de bulto que mencionen varios palets (ej "PALET 5 Y 6", "5-6", etc.)
const comMulti = bultos.filter(b => /\b\d+\s*(?:Y|&|\/|-)\s*\d+\b/i.test(b.comentario ?? ''));
console.log(`\n=== 2. Bultos RPS cuyo comentario menciona varios números (${comMulti.length}) ===`);
for (const b of comMulti.slice(0, 30)) {
  console.log(`${b.entregaSolicitada} | ${b.CodOrder}/${b.NumLine} | ${b.CodArticle} | ped=${b.cantidadPedido} | bulto=${b.numero} (${b.comentario}) cant=${b.cantidad}`);
}

// 3. Buscar en TODOS los DXF de oficina 2025-2026 cualquier mención de varios palets en un mismo rótulo
const reMulti = /PALETS?\s*\d+\s*(?:Y|&|\+|\/|-|,)\s*(?:PALET\s*)?\d+/i;
const reReparto = /(?:\d+\s*UDS?\s*PALET\s*\d+|PALET\s*\d+\s*[-:]?\s*\d+\s*UDS?)/i;
console.log('\n=== 3. DXF DE OFICINA 2025-2026: rótulos de palet múltiple o reparto explícito ===');
for (const anio of ['2025', '2026']) {
  const dir = path.join(baseHist, 'oficina-dxf', anio);
  if (!fs.existsSync(dir)) continue;
  for (const nombre of fs.readdirSync(dir).sort()) {
    if (!/\.dxf$/i.test(nombre)) continue;
    const modelo = leerPlanoDxf(path.join(dir, nombre)).modelo;
    const textos = modelo.filter(e => e.tipo === 'texto' && !e.deCota);
    const hits = textos.filter(t => reMulti.test(t.valor) || reReparto.test(t.valor));
    if (!hits.length) continue;
    for (const h of hits) {
      const vec = textos
        .filter(t => t !== h && Math.abs(t.punto[0] - h.punto[0]) < 20 && Math.abs(t.punto[1] - h.punto[1]) < 10)
        .filter(t => /4\d{5}\s*-\s*\d{4}|AR\.?\d{2}|[x×]\s*\d+|UDS|PALET/i.test(t.valor))
        .map(t => t.valor.replace(/\s+/g, ' ').trim());
      console.log(`${anio}/${nombre.padEnd(26)} | ${h.valor.replace(/\s+/g, ' ').trim().padEnd(28)} | vec: ${[...new Set(vec)].slice(0, 8).join(' ; ')}`);
    }
  }
}

// 4. También revisar el Packing List PL0000793 completo (del 07-11-2026)
console.log('\n=== 4. PACKING LIST PL0000793 (LOTE 07-11-2026) EN RPS ===');
const pl793 = bultos.filter(b => b.lista === 'PL0000793').sort((a, b) => a.numero - b.numero || a.CodOrder.localeCompare(b.CodOrder) || a.NumLine - b.NumLine);
for (const b of pl793) {
  console.log(`P${b.numero} (${(b.comentario ?? '').trim()}) | ${b.CodOrder}/${b.NumLine} | ${b.CodArticle} | cant=${b.cantidad}/${b.cantidadPedido} | cerrada=${b.cerrada}`);
}
