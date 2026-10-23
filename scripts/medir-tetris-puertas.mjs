// Contraste reproducible, en memoria: no abre RPS ni escribe archivos del taller.
// node scripts/medir-tetris-puertas.mjs
import assert from 'node:assert/strict';
import os from 'node:os';
import antes from '../src/puertas/__fixtures__/cortesAntesTetris.json' with { type: 'json' };
import revision from '../src/puertas/__fixtures__/cortesAntesAnchoTotal.json' with { type: 'json' };
import { pedidosTetris } from '../src/puertas/__fixtures__/cortesTetris.ts';
import { generarCortePuertas } from '../src/puertas/corte.ts';

const numero = n => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const ancho = c => Math.max(...c.colocadas.map(s => s.y / 10 + (s.girada ? s.pieza.ancho : s.pieza.alto)));
const manual = {
  AR2604638: '172 × 285', AR2604725: '948 × 290,25 (4 sacos)',
  AR2605134: '708 × 300 (croquis de Iván)', AR2605220: '732 × 278,75 (3 sacos)',
  AR2605036: '1240 × 289¹', AR2604904: '863 × 300',
  AR2604858: '794 × 300', AR2604524: '950 × 294,25', AR2604434: '150 × 233',
  AR2604349: '331 × 297', AR2604069: '630 × 292,25¹', AR2604764: '121 × 296,5¹',
  AR2604717: '955 × 300', AR2604402: '331,5 × 262¹',
  AR2604592: '800 × 296', AR2604723: '1446,46 × 300²', AR2604724: '1500 × 300',
  AR2604859: '1532,87 × 298²', AR2604906: '1084 × 296²',
  AR2604970: 'Dos cortes separados; uno de restos', AR2604013: 'Corte combinado; no atribuible',
  AR2605065: 'Varias puertas; no atribuible', AR2604526: 'Varias puertas; no atribuible',
};
console.log(`Node ${process.version}; ${os.cpus()[0].model}; ${os.platform()} ${os.arch()}.`);
console.log('Cada tiempo incluye despiece, todos los rollos, stock, fusión y DXF en memoria; 3 calentamientos y 9 mediciones por pedido.');
console.log('| Pedido | Largo antes → después | Ancho pedido antes → después | Ancho con stock antes → después | Sacos antes | Sacos después | Área stock antes → después (cm²) | A mano: largo × ancho ocupado | Mediana / máx. (ms) |');
console.log('|---|---:|---:|---:|---:|---:|---:|---|---:|');
for (const p of pedidosTetris()) {
  for (let i = 0; i < 3; i++) generarCortePuertas(p, { ofStockSacos: '0230811' });
  const tiempos = [];
  let r;
  for (let i = 0; i < 9; i++) {
    const t = performance.now();
    r = generarCortePuertas(p, { ofStockSacos: '0230811' });
    tiempos.push(performance.now() - t);
  }
  tiempos.sort((a, b) => a - b);
  const previo = antes.pedidos.find(f => f.pedido === p.orderCode);
  const rebasado = revision.pedidos.find(f => f.pedido === p.orderCode);
  assert.equal(r.cortes.length, previo.largos.length);
  r.cortes.forEach((c, i) => assert.ok(c.largo / 10 <= previo.largos[i], `${p.orderCode}: crece ${c.material}`));
  r.cortes.forEach((c, i) => assert.ok(c.largo / 10 <= rebasado.largos[i], `${p.orderCode}: crece respecto a d35e8bd ${c.material}`));
  const c = r.cortes.find(c => c.colocadas.some(s => s.pieza.clase === 'pano'));
  const sacos = c.colocadas.filter(s => s.pieza.id.startsWith('stock-'));
  const areaStock = sacos.reduce((area, s) => area + s.pieza.ancho * s.pieza.alto, 0);
  if (c.largo / 10 === rebasado.largos[0]) {
    assert.ok(areaStock >= rebasado.areaStock, `${p.orderCode}: pierde área de stock respecto a d35e8bd`);
    if (areaStock === rebasado.areaStock) assert.ok(ancho(c) <= rebasado.anchoStock, `${p.orderCode}: crece el ancho total al mismo largo y área`);
  }
  if (c.largo / 10 === previo.largos[0]) {
    assert.ok(areaStock >= previo.areaStock, `${p.orderCode}: pierde área de stock al mismo largo`);
    assert.ok(sacos.length >= previo.sacos, `${p.orderCode}: pierde sacos al mismo largo`);
  }
  const anchoPedido = ancho({ colocadas: c.colocadas.filter(s => !s.pieza.id.startsWith('stock-')) });
  console.log(`| ${p.orderCode} | ${numero(previo.largos[0])} → ${numero(c.largo / 10)} | ${numero(previo.anchoPedido)} → ${numero(anchoPedido)} | ${numero(previo.anchoStock)} → ${numero(ancho(c))} | ${previo.sacos} | ${sacos.length} | ${numero(previo.areaStock)} → ${numero(areaStock)} | ${manual[p.orderCode] ?? 'Sin referencia de rollo'} | ${numero(tiempos[4])} / ${numero(tiempos[8])} |`);
}
console.log('\n| Puertas distintas en el pedido | Mediana / máx. (ms) |');
console.log('|---|---:|');
const muestras = pedidosTetris();
for (let n = 1; n <= 5; n++) {
  const pedido = { schemaVersion: 1, kind: 'puertas', orderCode: 'MEDICION', elementos: muestras.slice(0, n).map((p, i) => ({ ...p.elementos[0], id: `puerta-${i}` })) };
  // Mismo color para buscar de verdad en un rollo común, con tamaños diferentes.
  pedido.elementos = pedido.elementos.map(e => ({ ...e, input: { ...e.input, color: 'BLANCO 9016' } }));
  const tiempos = [];
  for (let i = 0; i < 12; i++) {
    const t = performance.now();
    generarCortePuertas(pedido, { ofStockSacos: '0230811' });
    if (i >= 3) tiempos.push(performance.now() - t);
  }
  tiempos.sort((a, b) => a - b);
  assert.ok(tiempos[8] < 300, `${n} puertas: supera 300 ms`);
  console.log(`| ${n} | ${numero(tiempos[4])} / ${numero(tiempos[8])} |`);
}
