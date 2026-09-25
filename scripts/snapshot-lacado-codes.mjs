/**
 * Guarda qué referencias con color existen en RPS para las familias de piezas que
 * compone la web. Con esto, un toldo en un lacado poco habitual reserva la pieza en
 * blanco para lacarla fuera cuando en su color no existe (Iván, 25/09/2026, Q-A02).
 *
 * Solo lee RPS (STKArticle). Escribe src/domain/data/lacadoCodes.json.
 * Uso: node scripts/snapshot-lacado-codes.mjs
 */
import { writeFileSync } from 'node:fs';
import sql from 'mssql';
import { config } from '../src/config.js';
import { lacadoNames, resolveLacado } from '../src/domain/lacados.js';
import { fullAwningModelNames, sampleAwnings } from './lib/model-samples.mjs';

// Prefijo de familia: lo que va antes del sufijo de color en las referencias que emite
// la web en cada lacado (SOPAR350 en SOPAR350GR22, PEVO80 en PEVO80BR28400C).
const prefixes = new Set();
for (const model of fullAwningModelNames) {
  for (const lacadoName of lacadoNames) {
    const { suffix } = resolveLacado(lacadoName);
    if (!suffix) continue;
    for (const { result } of sampleAwnings(model, lacadoName)) {
      for (const ofBlock of result.ofs || []) {
        const codes = [
          ...(ofBlock.materials || []).map((line) => line.code),
          ...(ofBlock.despiece?.rows || []).map((row) => row.reference)
        ];
        for (const code of codes) {
          const clean = String(code || '').toUpperCase();
          const at = clean.lastIndexOf(suffix);
          if (at > 0) prefixes.add(clean.slice(0, at));
        }
      }
    }
  }
}

// Las piezas sueltas del lado que no sale en las muestras (el pedido puede elegir el
// izquierdo o el derecho, Q-A04).
for (const prefix of ['BONYXD', 'BONYXI', 'SOPARTGLD', 'SOPARTGLI', 'SOPBRAMONOBD', 'SOPBRAMONOBI', 'SOBDMODUL', 'SOBIMODUL']) prefixes.add(prefix);

const pool = await new sql.ConnectionPool({
  server: config.db.server, port: config.db.port, user: config.db.user, password: config.db.password,
  database: config.db.database, options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 8_000, requestTimeout: 60_000
}).connect();
const active = await pool.request().input('company', sql.VarChar(10), config.db.company)
  .query('SELECT a.CodArticle FROM dbo.STKArticle a WHERE a.CodCompany = @company AND a.InactiveDate IS NULL;')
  .then((r) => r.recordset.map((row) => row.CodArticle.toUpperCase()));
await pool.close();

// Todas las vigentes de esas familias, también las que no llevan color (SOPMAXSCRBOX):
// con lacado especial la web compone la referencia sin sufijo, y si existe se queda.
const familyPrefixes = [...prefixes].sort();
const codes = active.filter((code) => familyPrefixes.some((prefix) => code.startsWith(prefix))).sort();

const file = 'src/domain/data/lacadoCodes.json';
writeFileSync(file, `${JSON.stringify({
  consultedAt: new Date().toISOString().slice(0, 10),
  note: 'Generado con scripts/snapshot-lacado-codes.mjs: referencias vigentes en RPS de las familias con color que compone la web.',
  prefixes: familyPrefixes,
  codes
}, null, 1)}\n`);
console.log(`${file}: ${familyPrefixes.length} familias, ${codes.length} referencias vigentes.`);
