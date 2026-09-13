import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';
import { getRpsOrder, closeRpsCatalog } from '../src/rpsCatalog.js';
import { calculateOrder } from '../src/domain/rules.js';
import { normalizeReservation } from '../src/domain/validation.js';
import { buildOrderPlanteamientoPdf } from '../src/domain/planteamientoPdf.js';
const source = process.env.TOLDOS_EXCEL_ROOT;
if (!source) throw new Error('Indica TOLDOS_EXCEL_ROOT.');
const output = path.resolve('output/hera-real');
await fs.mkdir(output, { recursive: true });
let rps;
try { rps = await getRpsOrder('AR2603981'); } finally { await closeRpsCatalog(); }
if (!rps) throw new Error('No se encontró AR2603981 en RPS.');
await fs.writeFile(path.join(output, 'AR2603981.json'), JSON.stringify(rps, null, 2));
const material = rps.materials.find(row => row.of === '0231249');
if (!material) throw new Error('Falta el contraste de RPS para la OF HERA.');
const checks = [];
const order = { orderCode: 'AR2603981', customer: 'CONTRASTE TECNICO - PENDIENTE REVISION TALLER', technician: '', reviewer: '', sameFabric: true, fabric: material.code + '|||300|||' + material.description + '|||SCREEN', notes: 'BORRADOR DE CONTRASTE. Cara interior pendiente. Reserva web 14,5 ml; RPS 15 ml.', awnings: [] };
for (let i = 1; i <= 5; i++) {
  const file = 'AR2603981-' + i + '.xlsx';
  const wb = XLSX.readFile(path.join(source, file));
  const s = wb.Sheets[wb.SheetNames.find(n => n.startsWith('DATOS HERA'))];
  const p = wb.Sheets[wb.SheetNames.find(n => n.startsWith('PLANTEAMIENTO HERA'))];
  const awning = { id: 'hera-' + i, of: '0231249', model: 'HERA', submodel: 'HERA 56 MAQUINA', units: 1, width: s.B7.v, projection: s.B9.v, height: s.B10.v, heraJoin: 'NINGUNO', heraTopFinish: s.D11.v, heraBottomFinish: s.D12.v, heraInteriorFace: '', structureNotes: p.C14?.v || '' };
  order.awnings.push(awning);
  const calculation = calculateOrder({ ...order, awnings: [awning] }).ofs[0].calculation;
  const fields = { rollTubeLength: s.D7.v, fabricWidth: s.D8.v, fabricDrop: s.D9.v, chainLength: s.D10.v };
  for (const [field, expected] of Object.entries(fields)) {
    const actual = calculation[field];
    if (Math.abs(expected - actual) > .011) throw new Error(file + ': diferencia en ' + field);
  }
  checks.push({ file, letter: String.fromCharCode(64+i), width: awning.width, projection: awning.projection, ...fields, fabricMl: calculation.fabricMl, notes: awning.structureNotes });
}
// Orientation is unknown in the sources. Set it only in a disposable numeric comparison;
// the printable draft retains POR DEFINIR and cannot be generated as a valid production order.
const numericOrder = structuredClone(order);
for (const a of numericOrder.awnings) a.heraInteriorFace = 'DERECHO';
const calculation = calculateOrder(numericOrder);
const reservation = normalizeReservation({ orderCode: order.orderCode, ofs: calculation.ofs });
const webQuantity = reservation.ofs[0].materials[0].quantity;
const report = { orderCode: order.orderCode, of: '0231249', source, checks, dimensionalChecks: checks.length * 4, webQuantity, rpsQuantity: material.quantity, difference: material.quantity - webQuantity, assumptions: ['Sin empate: comparación numérica con rollo de 300 cm; confirmar confección real.', 'Cara interior no documentada: pendiente, no inferida del lado izquierdo.'], pending: ['Explicar reserva 15 ml frente a 14,5 ml calculados.', 'Confirmar cara interior y ejecución del lado izquierdo 6 cm más corto en toldo A.'], productionApproved: false };
await fs.writeFile(path.join(output, 'AR2603981-contraste.json'), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(output, 'AR2603981-contraste.pdf'), await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) }));
await fs.writeFile(path.join(output, 'AR2603981-contraste.md'), '# HERA AR2603981 - revisión de taller pendiente\n\n20 medidas coinciden con los cinco Excel. OF HERA: 0231249.\n\n| Toldo | Tubo cm | Tela cm | Salida cm | Cadena cm |\n|---|---:|---:|---:|---:|\n' + checks.map(r => '| '+r.letter+' | '+r.rollTubeLength.toFixed(1)+' | '+r.fabricWidth+' | '+r.fabricDrop+' | '+r.chainLength+' |').join('\n') + '\n\nReserva calculada: '+webQuantity+' ml. Material previsto RPS: '+material.quantity+' ml. La lona adicional de la OF 0231250 queda excluida.\n\nPendiente: confirmar sin empate, cara interior, corte izquierdo 6 cm más corto del toldo A y el motivo de los 0,5 ml adicionales reservados. No se da por aprobado para producción.\n');
console.log(JSON.stringify(report));
