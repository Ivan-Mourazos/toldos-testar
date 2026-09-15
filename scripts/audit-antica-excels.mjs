// Solo lectura: extrae celdas y fórmulas cacheadas, sin ejecutar macros.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import xlsx from 'xlsx';
const base = 'output/modelos/antica/materials';
const rps = JSON.parse(await readFile(base + '/rps-materials.json', 'utf8'));
const files = (await readdir(base + '/historicos')).filter(name => /\.xlsm$/i.test(name));
const cases = [], excluded = [], sources = [];
const known = new Set(rps.orders.map(order => order.of));
for (const file of files) {
  const buffer = await readFile(base + '/historicos/' + file);
  sources.push({ file, sha256: createHash('sha256').update(buffer).digest('hex') });
  const workbook = xlsx.read(buffer);
  for (const sheet of workbook.SheetNames.filter(name => /^ESTR\.0[1-4]$/.test(name))) {
    const cells = workbook.Sheets[sheet];
    const of = String(cells.E2?.v ?? cells.O3?.v ?? '').trim().padStart(7, '0');
    const units = Number(cells.Q13?.v);
    if (!known.has(of) || !(units > 0)) { excluded.push({ file, sheet, of, units }); continue; }
    const input = Object.fromEntries(['Q11','Q12','Q13','Q20','Q21','Q26','Q27','Q28','L33','D6'].map(key => [key, cells[key]?.v ?? null]));
    const rows = [];
    for (let row = 11; row <= 24; row++) {
      if (typeof cells['E' + row]?.v !== 'string' || !cells['E' + row].v.trim()) continue;
      rows.push({ cell: 'E' + row, name: cells['E' + row].v, ref: cells['I' + row]?.v ?? null, qty: cells['J' + row]?.v ?? null, cut: cells['K' + row]?.v ?? null, quantityFormula: cells['J' + row]?.f ?? null, cutFormula: cells['K' + row]?.f ?? null });
    }
    cases.push({ file, sheet, of, input, rows });
  }
}
await writeFile(base + '/excel-evidence.json', JSON.stringify({ sources, cases, excluded }, null, 2));
console.log(JSON.stringify({ files: files.length, cases: cases.length, ofs: new Set(cases.map(c => c.of)).size, excluded: excluded.length }));
