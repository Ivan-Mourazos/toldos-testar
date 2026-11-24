// Calcula el largo real de rollo del lote 07-11-2026 separado por material (Q-AS0711-04)
// y lo contrasta con los consumos reales imputados en RPS de las 25 OF ya fabricadas.
// Uso:
//   node --env-file=".../toldos-testar/.env" scripts/assa-investigacion/consumo-lote-0711.mjs --rps
//   node scripts/assa-investigacion/consumo-lote-0711.mjs
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { prepararLote } from '../../src/assa/lote.js';
import { calcularFamilia, generarProgramas } from '../../src/assa/faseA.js';
import { bloqueCanalon, canalonDe, juegosCanalon, pilaDePlantilla } from '../../src/assa/canalon.js';

const archivoRps = fileURLToPath(new URL('../../tmp/assa-dudas/rps-0711-consumos.json', import.meta.url));

if (process.argv.includes('--rps')) {
  const [{ getRpsPoolForRemolques }, { config }, { CONSULTA_LOTE }] = await Promise.all([
    import('../../src/rpsCatalog.js'),
    import('../../src/config.js'),
    import('../../src/assa/rps.js'),
  ]);
  const pool = await getRpsPoolForRemolques();
  if (!pool) throw new Error('RPS no configurado.');
  try {
    const sel = CONSULTA_LOTE.slice(0, CONSULTA_LOTE.lastIndexOf('ORDER BY'))
      .replace('l.ReceptionDemandDate = @fecha', "l.ReceptionDemandDate = '20261107'");
    const q = async sql => (await pool.request().input('company', config.db.company).query(sql)).recordset;
    const lineas = await q(`SELECT base.*, CONVERT(varchar(10), mo.RealEndDate, 120) finReal
      FROM (${sel}) base
      LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.CodCompany=@company AND mo.CodManufacturingOrder=base.of_
      ORDER BY base.CodOrder, base.NumLine`);
    const mats = await q(`WITH base AS (${sel})
      SELECT base.IDOrderLine, base.CodOrder, base.NumLine, base.CodArticle, base.cantidad, base.of_,
        a.CodArticle codigo, a.Description descripcion, SUM(m.Quantity) consumo
      FROM base
      JOIN dbo.CPRManufacturingOrder mo ON mo.CodCompany=@company AND mo.CodManufacturingOrder=base.of_
      JOIN dbo.CPRImputationMaterialMO m ON m.CodCompany=mo.CodCompany AND m.IDManufacturingOrder=mo.IDManufacturingOrder
      JOIN dbo.STKArticle a ON a.CodCompany=m.CodCompany AND a.IDArticle=m.IDArticle
      GROUP BY base.IDOrderLine, base.CodOrder, base.NumLine, base.CodArticle, base.cantidad, base.of_, a.CodArticle, a.Description
      ORDER BY a.CodArticle, base.CodOrder, base.NumLine`);
    await fs.mkdir(fileURLToPath(new URL('../../tmp/assa-dudas/', import.meta.url)), { recursive: true });
    await fs.writeFile(archivoRps, JSON.stringify({ recogido: new Date().toISOString(), lineas, mats }, null, 2));
    console.log(`RPS 07-11 guardado: ${lineas.length} líneas (${lineas.filter(l => l.finReal).length} con fin real), ${mats.length} imputaciones.`);
  } finally {
    await pool.close();
  }
}

const datos = JSON.parse(await fs.readFile(archivoRps, 'utf8'));
const { lineas, mats } = datos;

// 1. Totales imputados reales en RPS (todas las 25 OF del 07-11)
const totalesRps = {};
const porLineaRps = Map.groupBy(mats, m => `${m.CodOrder}/${m.NumLine}`);
for (const m of mats) {
  totalesRps[m.codigo] ??= { desc: m.descripcion.trim(), total: 0, ofs: 0 };
  totalesRps[m.codigo].total += m.consumo;
  totalesRps[m.codigo].ofs++;
}

console.log('\n=== 1. CONSUMOS REALES IMPUTADOS EN RPS (LOTE 07-11, 25 OF FABRICADAS) ===');
for (const [k, v] of Object.entries(totalesRps).sort()) {
  console.log(`  ${k.padEnd(22)} | ${v.total.toFixed(2).padStart(8)} | ${String(v.ofs).padStart(2)} OF | ${v.desc}`);
}

// 2. Largo de rollo calculado por programas ordinarios (16 automáticas + 5 de familias de envolvente/lateral/techo ahora estudiadas)
//    NOTA: aquí calculamos cada referencia por separado (sin mezcla entre filas) para ver la base de cálculo,
//    y aparte medimos el consumo del lote completo con las 4 cortinas (410129-0117, 410130-0175, 410170-0001, 410171-0001).
const palets0711 = {
  'AR.26.05111/1': 4, 'AR.26.05111/2': 4, 'AR.26.05111/3': 3,
  'AR.26.05142/1': 3, 'AR.26.05142/2': 3, 'AR.26.05142/3': 3, 'AR.26.05142/4': 5,
  'AR.26.05234/1': 1, 'AR.26.05234/2': 4, 'AR.26.05234/3': 1, 'AR.26.05234/4': 4, 'AR.26.05234/5': 4, 'AR.26.05234/6': 4,
  'AR.26.05240/1': 4, 'AR.26.05240/2': 4, 'AR.26.05240/3': 4, 'AR.26.05240/4': 2, 'AR.26.05240/5': 4, 'AR.26.05240/6': 2,
  'AR.26.05240/7': 3, 'AR.26.05240/8': 2, 'AR.26.05240/9': 4, 'AR.26.05240/10': 2,
  'AR.26.05263/1': 3, 'AR.26.05263/2': 4,
};
const paletsId = Object.fromEntries(lineas.map(l => [l.IDOrderLine, palets0711[`${l.CodOrder}/${l.NumLine}`]]));
const loteWeb = prepararLote('2026-11-07', lineas, {}, undefined, { palets: paletsId });
const lineasAuto = loteWeb.lineas.filter(l => l.estado === 'validado').length;
const largoAuto = loteWeb.programas.reduce((s, p) => s + p.largoMm * p.repeticiones, 0) / 1000;

// Desglose de las 5 referencias de envolvente/lateral/techo investigadas (4 ya certificadas + 420148-0040 a mano)
const refs5 = ['420102-0021', '420148-0040', '430129-0002', '430172-0005', '430172-0034'];
let largoAManoEnvolvente = 0;
console.log('\n=== 2. DESGLOSE DE LAS 5 REFERENCIAS DE ENVOLVENTE/TECHO/LATERAL (TEÓRICO vs RPS IMPUTADO) ===');
for (const l of lineas) {
  const cod = l.CodArticle.slice(-11);
  if (!refs5.includes(cod)) continue;
  const g = calcularFamilia(l);
  const ps = generarProgramas(g);
  const lc = ps.reduce((s, p) => s + p.largoMm * p.repeticiones, 0) / 1000;
  let lcan = 0;
  const can = ['430129', '430172'].includes(g.familia) ? canalonDe(g.codigo, g.medidas?.NB) : null;
  if (can) {
    const j = juegosCanalon(l.cantidad, can);
    if (j.completos) lcan += bloqueCanalon(can, 'combinado').largoMm * j.completos / 1000;
    if (j.resto) lcan += pilaDePlantilla(can, j.resto.enteros, j.resto.parejas).largoMm / 1000;
  }
  const estado = loteWeb.lineas.find(x => x.IDOrderLine === l.IDOrderLine)?.estado;
  if (estado === 'a-mano') largoAManoEnvolvente += lc + lcan;
  const rpsPlast = (porLineaRps.get(`${l.CodOrder}/${l.NumLine}`) ?? [])
    .filter(m => /PLAST880|RESTOSPLASTEL/i.test(m.codigo)).reduce((s, m) => s + m.consumo, 0);
  console.log(`  ${cod} (${String(l.cantidad).padStart(2)} uds, ${estado}) | cuerpo=${lc.toFixed(3)} m | canalón=${lcan.toFixed(3)} m | total=${(lc + lcan).toFixed(3)} m | RPS PLASTEL=${rpsPlast.toFixed(2)} m`);
}

// Cortinas del 07-11: largo real en maqcorte (corrigiendo erratas de rótulo X8->X3 y x2->x27)
// - 410129-0117 (27 uds):
//     PLASTEL 2040: 3 × 8,000 m (24 cuerpos) + 6,600 m (3 cuerpos + 58 tapas) = 30,600 m (RPS: 30,70 m)
//     LONA 3 MM 1600: 5 × 2,000 m (25 tiras) + 2,000 m (2 tiras) = 12,000 m (RPS: 10,00 m)
// - 410130-0175 (54 uds):
//     PLASTEL 2040: 27 × 2,300 m (54 cuerpos en 2 filas) = 62,100 m (RPS: 69,10 m)
//     PVC 900g 3000: 4,537 m (14×8=112 tapas, 56 con Ø40 + 56 lisas) (RPS PANAMA 900: 4,70 m)
//     LONA 3 MM 1600: 10 × 2,250 m (50 tiras) + 2,250 m (4 tiras) = 24,750 m (RPS: 40,25 m)
// - 410170-0001 + 410171-0001 (1 + 1 uds):
//     LONA 2 MM 1200/2100: 2 × 2,974 m = 5,948 m (RPS: 3,20 + 3,20 = 6,40 m)
//     LONA 1 MM 1500: por ud: 1 tira 2,600 m (ancho 416) + 12 solapas (1,400 m en 3 filas de 400); en el 07-11 dibujó 22 solapas/ud (2,800 m) + tira 2,600 m.
const plastelCortinas = 30.6 + 62.1; // 92,700 m
const plastelTotalTeorico = largoAuto + largoAManoEnvolvente + plastelCortinas;
const plastelRpsTotal = (totalesRps.PLAST880NEGRP204?.total ?? 0) + (totalesRps.RESTOSPLASTEL?.total ?? 0);

console.log('\n=== 3. RESUMEN DE LARGO DE ROLLO POR MATERIAL (LOTE 07-11) ===');
console.log(`  PLASTEL 2040 mm:`);
console.log(`    ${lineasAuto} líneas automáticas web      : ${largoAuto.toFixed(3)} m`);
console.log(`     1 línea envolvente a mano     : ${largoAManoEnvolvente.toFixed(3)} m (420148-0040)`);
console.log(`     2 líneas cortinas (0117+0175) : ${plastelCortinas.toFixed(3)} m (0117: 30,600 + 0175: 62,100)`);
console.log(`    SUMA 23 líneas PLASTEL (sin mixto ni +4 sueltas 0021 ni +1 cuerpo 430129): ${plastelTotalTeorico.toFixed(3)} m`);
console.log(`    Con +4 sueltas 420102-0021 (+3,610 m) y 2.º cuerpo 430129-0002 (+3,503 m): ${(plastelTotalTeorico + 3.61 + 3.503).toFixed(3)} m`);
console.log(`    IMPUTADO REAL EN RPS (25 OF)   : ${plastelRpsTotal.toFixed(2)} m (PLAST880NEGRP204: ${(totalesRps.PLAST880NEGRP204?.total ?? 0).toFixed(2)} m + RESTOSPLASTEL: ${(totalesRps.RESTOSPLASTEL?.total ?? 0).toFixed(2)} m)`);
console.log(`  LONA 3 MM (1600 mm):`);
console.log(`    410129-0117 (27 uds: 5×2+2)    : 12,000 m (RPS: 10,00 m)`);
console.log(`    410130-0175 (54 uds: 10×2,25+2,25): 24,750 m (RPS: 40,25 m)`);
console.log(`    + refuerzos 3 mm canalones     : RPS total MUCA78NEGROP160 = ${(totalesRps.MUCA78NEGROP160?.total ?? 0).toFixed(2)} m, RESTOMUELLEC3MM = ${(totalesRps.RESTOMUELLEC3MM?.total ?? 0).toFixed(2)} m`);
console.log(`  PVC 900 g NEGRO (3000 mm):`);
console.log(`    410130-0175 (112 tapas)        : 4,537 m (RPS PANAMANE05P300: ${(totalesRps.PANAMANE05P300?.total ?? 0).toFixed(2)} m)`);
console.log(`  LONA 2 MM (2100 mm):`);
console.log(`    410170-0001 + 410171-0001 (1+1): 5,948 m (2 × 2,974 m) | RPS MUCA76NEGRP210: ${(totalesRps.MUCA76NEGRP210?.total ?? 0).toFixed(2)} m`);
console.log(`  LONA 1 MM (1500 mm):`);
console.log(`    410170-0001 + 410171-0001 (1+1): teórico 8,000 m (2 × [2,600 + 1,400]) o compartido; RPS RESTOMUELLEC1,2: ${(totalesRps['RESTOMUELLEC1,2']?.total ?? 0).toFixed(2)} m`);
