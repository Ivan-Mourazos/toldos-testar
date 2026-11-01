import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { inferFabricDetails, inferRollWidth } from '../src/domain/fabricRps.js';

const catalogUrl = new URL('../src/domain/data/fabrics.json', import.meta.url);

export function regenerateFabrics(rows, previous, at = new Date()) {
  const byCode = new Map(rows.map((row) => [row.code.trim().toUpperCase(), row]));
  const isInactive = (row) => !row || Boolean(row.inactiveDate && new Date(row.inactiveDate) <= at);
  const result = previous.map((fabric) => {
    const row = byCode.get(fabric.code);
    const saved = { ...fabric };
    delete saved.inactive;
    return { ...saved, width: row ? inferRollWidth(row.code, row.unitCode) : inferRollWidth(fabric.code),
      ...(isInactive(row) ? { inactive: true } : {}) };
  });
  const known = new Set(previous.map((fabric) => fabric.code));
  for (const row of rows) {
    const code = row.code.trim().toUpperCase();
    if (known.has(code) || isInactive(row)) continue;
    result.push({ code, description: String(row.description || code).trim(),
      width: inferRollWidth(code, row.unitCode), ...inferFabricDetails(row) });
    known.add(code);
  }
  return result;
}

async function main() {
  const [snapshotPath, date] = process.argv.slice(2);
  if (!snapshotPath) throw new Error('Uso: node scripts/actualizar-telas-rps.mjs foto.json [fecha ISO]');
  const rows = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
  const previous = JSON.parse(await fs.readFile(catalogUrl, 'utf8'));
  const at = date ? new Date(date) : new Date();
  if (!Number.isFinite(at.getTime())) throw new Error('Fecha de corte no válida.');
  if (!Array.isArray(rows) || rows.some((row) => !row.code || (row.inactiveDate && !Number.isFinite(new Date(row.inactiveDate).getTime())))) {
    throw new Error('La foto debe ser una lista de artículos con código y fecha de baja válida.');
  }
  const result = regenerateFabrics(rows, previous, at);
  const original = await fs.readFile(catalogUrl, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  await fs.writeFile(catalogUrl, (JSON.stringify(result, null, 2) + '\n').replace(/\n/g, eol));
  const active = result.filter((fabric) => !fabric.inactive);
  console.log(JSON.stringify({ date: at.toISOString(), total: result.length, active: active.length,
    inactive: result.length - active.length, withoutWidth: active.filter((fabric) => !fabric.width).map((fabric) => fabric.code) }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
