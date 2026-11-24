// Inspección detallada de 410129-0117, 410130-0175, 410170-0001 y 410171-0001 (y sus familias 410129/410130/410170/410171):
// 1) Textos y geometría en los DWG maestros del cliente (OK410129, OK410130, OK410170, OK410171, 410170, 410170-2).
// 2) En TODOS los lotes 2025-2026 de oficina y maqcorte donde aparezca cualquier 410129-*, 410130-*, 410170-*, 410171-*,
//    extrae piezas exactas por material/capa y rótulos xN, más menciones de PVC 650 / 900 g.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';
import { red } from './geometria.mjs';

const baseCliente = fileURLToPath(new URL('../../tmp/assa-dudas/cliente/dxf/', import.meta.url));
const baseHist = fileURLToPath(new URL('../../tmp/assa-0711-historico/', import.meta.url));

console.log('=== 1. DWG MAESTROS DEL CLIENTE ===');
for (const f of ['OK410129.dxf', 'OK410130.dxf', 'OK410170.dxf', 'OK410171.dxf', '410170.dxf', '410170-2.dxf']) {
  const p = path.join(baseCliente, f);
  if (!fs.existsSync(p)) continue;
  const { modelo } = leerPlanoDxf(p);
  const textos = modelo.filter(e => e.tipo === 'texto' && !e.deCota)
    .map(e => ({ v: e.valor.replace(/\s+/g, ' ').trim(), x: red(e.punto[0]), y: red(e.punto[1]), c: e.capa }));
  console.log(`\n--- ${f} (${modelo.length} ents, ${textos.length} textos) ---`);
  const interesantes = textos.filter(t => /4101|LONA|PVC|PLASTEL|MM|GR|650|900|850|X\d|TAPA|SOLAPA|ESCA|CUERPO|UDS|UD|CORT|REF|VALMEX|MUCA|PANAMA|0117|0175|0001|REVE|DERECH|SOLDA|CANT|UNID|PIEZA|320|340|2000|2300|2250|2600|370|350|400|1750|1050|700/i.test(t.v));
  for (const t of interesantes.slice(0, 80)) {
    console.log(`  ${t.c.padEnd(16)} [${String(t.x).padStart(7)}, ${String(t.y).padStart(7)}] ${t.v}`);
  }
  if (interesantes.length > 80) console.log(`  ... (+${interesantes.length - 80} textos más)`);
}

console.log('\n=== 2. MENCIONES DE 650 / 900 GR / 410130 / 410129 / 410170 / 410171 EN TODOS LOS LOTES 2025-2026 ===');
const reFam = /(?<!\d)(410129|410130|410170|410171|410172|410173)\s*-\s*(\d{4})(?!\d)/gi;

const aparicionesPvc = [];
const aparicionesFam = [];

for (const anio of ['2025', '2026']) {
  for (const carpeta of ['cortes', 'oficina-dxf']) {
    const dir = path.join(baseHist, carpeta, anio);
    if (!fs.existsSync(dir)) continue;
    for (const nombre of fs.readdirSync(dir).sort()) {
      if (!/\.dxf$/i.test(nombre)) continue;
      const modelo = leerPlanoDxf(path.join(dir, nombre)).modelo;
      const textos = modelo.filter(e => e.tipo === 'texto' && !e.deCota);
      const famHits = textos.filter(t => reFam.test(t.valor));
      reFam.lastIndex = 0;
      const pvcHits = textos.filter(t => /\b(?:650|900|850)\s*(?:G|GR|GRS)\b|\bPVC\s*(?:650|900|850)/i.test(t.valor));

      if (pvcHits.length) {
        const escala = carpeta === 'cortes' ? 1 : 1000;
        for (const p of pvcHits) {
          const cercanos = textos
            .filter(t => Math.abs(t.punto[0] - p.punto[0]) * escala < 10000 && Math.abs(t.punto[1] - p.punto[1]) * escala < 5000)
            .filter(t => /410\d{3}|[x×]\s*\d+|LONA|PVC|PLASTEL/i.test(t.valor))
            .map(t => t.valor.replace(/\s+/g, ' ').trim());
          aparicionesPvc.push({ fichero: `${carpeta}/${anio}/${nombre}`, texto: p.valor.replace(/\s+/g, ' ').trim(), capa: p.capa, vecinos: [...new Set(cercanos)] });
        }
      }

      if (famHits.length && carpeta === 'cortes') {
        const cods = [...new Set(famHits.flatMap(t => [...t.valor.matchAll(reFam)].map(m => `${m[1]}-${m[2]}`)))];
        aparicionesFam.push({ fichero: `${carpeta}/${anio}/${nombre}`, cods });
      }
    }
  }
}

console.log('\n--- Menciones de 650/900/850 g en DXF (oficina y maqcorte 2025-2026) ---');
for (const a of aparicionesPvc) {
  console.log(`${a.fichero.padEnd(42)} | ${a.texto.padEnd(26)} | vecinos: ${a.vecinos.slice(0, 8).join(' ; ')}`);
}

console.log('\n--- Lotes de maqcorte 2025-2026 con cualquier 410129/130/170/171/172/173 ---');
for (const a of aparicionesFam) {
  console.log(`${a.fichero.padEnd(42)} | ${a.cods.join(', ')}`);
}
