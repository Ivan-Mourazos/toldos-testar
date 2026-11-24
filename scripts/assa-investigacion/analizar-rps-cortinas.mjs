// Analiza en RPS (2021-2026) todas las líneas y consumos de las familias 410129, 410130, 410170, 410171, 410172, 410173,
// con foco en 410129-0117, 410130-0175, 410170-0001, 410171-0001 y la decisión PVC 650 g vs 900 g.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const rps = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../tmp/assa-dudas/rps-historico.json', import.meta.url)), 'utf8'));
const cod = s => String(s ?? '').match(/(4\d{5}-\d{4})/)?.[1] ?? s;
const matPorLinea = Map.groupBy(rps.materiales, m => m.IDOrderLine);

console.log('=== 1. ARTICULOS RPS (Notes / TechnicalDescription) ===');
for (const a of rps.articulos) {
  console.log(a.CodArticle, '|', a.Description);
  if (a.Notes) console.log('  Notes:', a.Notes.replace(/\s+/g, ' ').trim());
  if (a.TechnicalDescription) console.log('  Tech:', a.TechnicalDescription.replace(/\s+/g, ' ').trim());
}

console.log('\n=== 2. TODAS LAS LINEAS HISTORICAS (2021-2026) DE LAS 4 CORTINAS/ACCESORIOS DEL 07-11 ===');
for (const ref of ['410129-0117', '410130-0175', '410170-0001', '410171-0001']) {
  const ls = rps.lineas.filter(l => cod(l.CodArticle) === ref);
  console.log(`\n--- ${ref} (${ls.length} líneas) ---`);
  for (const l of ls) {
    const ms = (matPorLinea.get(l.IDOrderLine) ?? []).map(m => `${m.codigo}:${+m.consumo.toFixed(2)}(${(m.consumo / l.cantidad).toFixed(2)}/ud)`).join(', ');
    console.log(`${l.entregaSolicitada} | ${l.CodOrder}/${l.NumLine} | uds=${String(l.cantidad).padStart(2)} | OF=${l.of_ ?? '-'} | fin=${l.finReal ?? 'SIN'} | ${ms}`);
    if (l.comentarioLinea || l.notasOf) console.log(`   comLinea=${l.comentarioLinea ?? ''} | notasOf=${l.notasOf ?? ''}`);
  }
}

console.log('\n=== 3. CONSUMOS DE PVC 650 vs 900 / PANAMA / ALPHA / PLASTEL EN TODA LA FAMILIA 410130 (2021-2026) ===');
const ls130 = rps.lineas.filter(l => cod(l.CodArticle)?.startsWith('410130-'));
const matCount130 = {};
for (const l of ls130) {
  const ms = matPorLinea.get(l.IDOrderLine) ?? [];
  for (const m of ms) {
    if (/650|900|PANAMA|PVC|ALPHA|PLAST|MUCA|VALMEX|POLYMAR/i.test(`${m.codigo} ${m.descripcion}`)) {
      const k = `${m.codigo} (${m.descripcion.trim().slice(0, 45)})`;
      matCount130[k] = (matCount130[k] ?? 0) + 1;
    }
  }
}
console.log(`Total líneas 410130-*: ${ls130.length}`);
for (const [k, n] of Object.entries(matCount130).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)} OF | ${k}`);
}

console.log('\n--- Detalle de líneas 410130-* que imputaron PVC 650 / 900 / PANAMA / RESTOPVC (2024-2026) ---');
for (const l of ls130.filter(l => l.entregaSolicitada >= '2024-01-01')) {
  const ms = (matPorLinea.get(l.IDOrderLine) ?? []).map(m => `${m.codigo}:${+m.consumo.toFixed(2)}`).join(', ');
  console.log(`${l.entregaSolicitada} | ${cod(l.CodArticle)} | uds=${String(l.cantidad).padStart(2)} | ${l.descripcion.slice(0, 48).padEnd(48)} | ${ms}`);
}

console.log('\n=== 4. CONSUMOS POR UNIDAD EN FAMILIAS 410170/410171/410172/410173 (2021-2026) ===');
for (const fam of ['410170', '410171', '410172', '410173']) {
  const ls = rps.lineas.filter(l => cod(l.CodArticle)?.startsWith(fam + '-'));
  console.log(`\n--- Familia ${fam} (${ls.length} líneas) ---`);
  for (const l of ls) {
    const ms = (matPorLinea.get(l.IDOrderLine) ?? []).map(m => `${m.codigo}:${+m.consumo.toFixed(2)}(${(m.consumo / l.cantidad).toFixed(2)}/ud)`).join(', ');
    console.log(`${l.entregaSolicitada} | ${cod(l.CodArticle)} | uds=${String(l.cantidad).padStart(2)} | fin=${l.finReal ?? 'SIN'} | ${ms}`);
  }
}
