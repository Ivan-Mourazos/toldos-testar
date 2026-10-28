import { fechaLote } from './faseA.js';

// La previsión de Producción se selecciona por la fecha pedida de CADA línea, sin sumar palets ni inventar OF.
export const CONSULTA_LOTE = `SELECT o.IDOrder, l.IDOrderLine, l.NumLine, o.CodOrder,
  c.CodCustomer, c.Description cliente, a.CodArticle,
  l.Description descripcion, l.Comment comentarioLinea, l.Quantity cantidad,
  CONVERT(varchar(10),l.ReceptionDemandDate,120) entregaSolicitada,
  mo.CodManufacturingOrder of_
  FROM dbo.FACOrderSL o
  JOIN dbo.FACCustomer c ON c.IDCustomer=o.IDCustomer AND c.CodCompany=o.CodCompany
  JOIN dbo.FACOrderLineSL l ON l.IDOrder=o.IDOrder AND l.CodCompany=o.CodCompany
  LEFT JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
  LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
  WHERE o.CodCompany=@company AND c.CodCustomer IN ('029465','018974','034019')
  AND l.ReceptionDemandDate = @fecha
  ORDER BY o.CodOrder, l.NumLine`;

export async function leerLoteRps(fecha, deps) {
  fechaLote(fecha);
  if (!deps) {
    const [{ getRpsPoolForRemolques }, { config }] = await Promise.all([import('../rpsCatalog.js'), import('../config.js')]);
    deps = { pool: await getRpsPoolForRemolques(), company: config.db.company };
  }
  if (!deps.pool) throw Object.assign(new Error('RPS no está configurado para leer el lote.'), { statusCode: 503 });
  const { recordset } = await deps.pool.request().input('company', deps.company).input('fecha', fecha).query(CONSULTA_LOTE);
  if (new Set(recordset.map(l => l.IDOrderLine)).size !== recordset.length) throw new Error('RPS devolvió líneas duplicadas: no se pueden sumar cantidades.');
  return recordset;
}
