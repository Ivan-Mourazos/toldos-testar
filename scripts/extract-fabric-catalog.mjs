// scripts/extract-fabric-catalog.mjs
import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , sourcePath] = process.argv;
if (!sourcePath) {
  console.error('Uso: node scripts/extract-fabric-catalog.mjs <ruta-al-TOLDOS-TESTAR.xlsm>');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'src', 'domain', 'data', 'fabrics.json');

const workbook = XLSX.readFile(sourcePath, { cellFormula: false, cellNF: false, sheetStubs: false });
const sheet = workbook.Sheets['M.TELA'];
if (!sheet) {
  console.error('No se encontró la hoja M.TELA en el libro.');
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
const header = rows[0].map((value) => String(value).trim());
const columnIndex = {
  code: header.indexOf('REFERENCIA'),
  description: header.indexOf('DESCRIPCION'),
  width: header.indexOf('ANCHO'),
  material: header.indexOf('MATERIAL'),
  color: header.indexOf('COLOR')
};

const fabrics = [];
const seenCodes = new Set();
for (const row of rows.slice(1)) {
  const code = String(row[columnIndex.code] || '').trim();
  const description = String(row[columnIndex.description] || '').trim();
  const width = Number(row[columnIndex.width]);
  const material = String(row[columnIndex.material] || '').trim();
  const color = String(row[columnIndex.color] || '').trim();

  if (!code || !description || !Number.isFinite(width)) continue;
  if (seenCodes.has(code)) continue;
  seenCodes.add(code);
  fabrics.push({ code, description, width, material, color });
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(fabrics, null, 2));
console.log(`Escritas ${fabrics.length} telas en ${outPath}`);
