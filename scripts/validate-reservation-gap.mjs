/**
 * Mide, modelo a modelo, la distancia entre lo que la aplicación reserva y lo
 * que el taller consume de verdad.
 *
 * El histórico de `_MaterialesPrevistosOF` NO sirve como contraste: es
 * precisamente lo que está incompleto y lo que se quiere corregir. La fuente
 * buena es `CPRImputationMaterialMO`, que es lo que salió del almacén.
 *
 * Devuelve por modelo:
 *  - falta: se consume a menudo y no lo reservamos.
 *  - sobra: lo reservamos y no aparece consumido nunca.
 *  - aparte: se consume pero queda fuera del planteamiento, con el motivo.
 *
 * Ni falta ni sobra son automáticamente un fallo. Hay consumo que no es del
 * toldo y piezas que se reservan y se montan sin imputar. Es material para
 * decidir el despiece, no un veredicto.
 */
import sql from 'mssql';
import { config } from '../src/config.js';
import { sampleAwnings } from './lib/model-samples.mjs';
import { articuloDeVenta, classifyGap } from './lib/reservation-gap.mjs';

const modelo = process.argv[2] ? process.argv[2].toUpperCase() : null;
const objetivo = modelo ? { [modelo]: articuloDeVenta[modelo] } : articuloDeVenta;
if (modelo && !articuloDeVenta[modelo]) {
  console.error(`No sé con qué artículo de venta identificar "${modelo}". Modelos: ${Object.keys(articuloDeVenta).join(', ')}`);
  process.exit(1);
}

// Todas las variantes válidas en los dos lacados habituales: una pieza que solo
// se reserva con motor o con EVO aparecería como "falta" si no se calcula.
function loQueReservamos(model) {
  const codes = new Set();
  for (const lacado of ['BLANCO', 'NEGRO (R-09011)']) {
    for (const { result } of sampleAwnings(model, lacado)) {
      for (const line of result.ofs[0].materials) codes.add(String(line.code).toUpperCase());
    }
  }
  return codes;
}

const pool = await new sql.ConnectionPool({
  server: config.db.server, port: config.db.port, user: config.db.user, password: config.db.password,
  database: config.db.database, options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 8_000, requestTimeout: 120_000
}).connect();

const informe = {};
for (const [model, filtro] of Object.entries(objetivo)) {
  const consumido = await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
    SELECT a.CodArticle, a.Description, COUNT(DISTINCT mo.IDManufacturingOrder) AS ofs
    FROM dbo.FACOrderSL o
    JOIN dbo.FACOrderLineSL l ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
    JOIN dbo.STKArticle art ON art.IDArticle = l.IDArticle AND art.CodCompany = l.CodCompany
    JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder = l.IDManufacturingOrder AND mo.CodCompany = l.CodCompany
    JOIN dbo.CPRImputationMaterialMO i ON i.IDManufacturingOrder = mo.IDManufacturingOrder AND i.CodCompany = mo.CodCompany
    JOIN dbo.STKArticle a ON a.IDArticle = i.IDArticle AND a.CodCompany = i.CodCompany
    WHERE o.CodCompany = @company AND UPPER(art.CodArticle) ${filtro} AND YEAR(i.ImputationDate) >= 2025
    GROUP BY a.CodArticle, a.Description
    ORDER BY ofs DESC;`).then((r) => r.recordset);

  informe[model] = classifyGap({ consumido, nuestras: loQueReservamos(model) });
}
await pool.close();

console.log(JSON.stringify(informe, null, 2));
