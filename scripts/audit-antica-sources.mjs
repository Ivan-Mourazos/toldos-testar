// Consulta de solo lectura. Guarda evidencia local; no genera reservas ni modifica RPS.
import sql from 'mssql';
import { config } from '../src/config.js';
import { searchRpsArticles, closeRpsCatalog } from '../src/rpsCatalog.js';
import { mkdir, writeFile } from 'node:fs/promises';
const destination = 'output/modelos/antica';
await mkdir(destination, { recursive: true });
const pool = await new sql.ConnectionPool({ server: config.db.server, port: config.db.port, user: config.db.user, password: config.db.password, database: config.db.database, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 8000, requestTimeout: 60000 }).connect();
try {
  const recent = (await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
    SELECT TOP (30) o.CodOrder AS orderCode, o.OrderDate, l.Description, l.Comment, l.Quantity,
      mo.CodManufacturingOrder AS [of], mo.Notes
    FROM dbo.FACOrderSL o
    JOIN dbo.FACOrderLineSL l ON l.IDOrder=o.IDOrder AND l.CodCompany=o.CodCompany
    JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
    LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
    WHERE o.CodCompany=@company AND a.CodArticle='ANTICA'
    ORDER BY o.OrderDate DESC, o.CodOrder DESC
  `)).recordset;
  const consumed = (await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
    SELECT a.CodArticle AS code, a.Description, mu.CodMeasureUnit AS unitCode, COUNT(DISTINCT mo.IDManufacturingOrder) AS ofs
    FROM dbo.FACOrderSL o
    JOIN dbo.FACOrderLineSL l ON l.IDOrder=o.IDOrder AND l.CodCompany=o.CodCompany
    JOIN dbo.STKArticle art ON art.IDArticle=l.IDArticle AND art.CodCompany=l.CodCompany
    JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
    JOIN dbo.CPRImputationMaterialMO i ON i.IDManufacturingOrder=mo.IDManufacturingOrder AND i.CodCompany=mo.CodCompany
    JOIN dbo.STKArticle a ON a.IDArticle=i.IDArticle AND a.CodCompany=i.CodCompany
    LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit=a.IDUnitQuantityWarehouse AND mu.CodCompany=a.CodCompany
    WHERE o.CodCompany=@company AND art.CodArticle='ANTICA' AND i.ImputationDate >= '20250101'
    GROUP BY a.CodArticle, a.Description, mu.CodMeasureUnit ORDER BY ofs DESC
  `)).recordset;
  const schema = (await pool.request().query(`SELECT TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('CPRImputationMaterialMO','STKArticle','PURSupplierArticle') AND (COLUMN_NAME LIKE '%Quantity%' OR COLUMN_NAME LIKE '%Supplier%' OR COLUMN_NAME LIKE '%Reference%')`)).recordset;
  const selectedConsumption = (await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
    SELECT mo.CodManufacturingOrder AS [of], a.CodArticle AS code, a.Description, mu.CodMeasureUnit AS unitCode, SUM(i.Quantity) AS quantity
    FROM dbo.CPRManufacturingOrder mo
    JOIN dbo.CPRImputationMaterialMO i ON i.IDManufacturingOrder=mo.IDManufacturingOrder AND i.CodCompany=mo.CodCompany
    JOIN dbo.STKArticle a ON a.IDArticle=i.IDArticle AND a.CodCompany=i.CodCompany
    LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit=a.IDUnitQuantityWarehouse AND mu.CodCompany=a.CodCompany
    WHERE mo.CodCompany=@company AND mo.CodManufacturingOrder IN ('0232070','0230273','0230193','0225203','0229419')
    GROUP BY mo.CodManufacturingOrder,a.CodArticle,a.Description,mu.CodMeasureUnit
    ORDER BY mo.CodManufacturingOrder,a.CodArticle
  `)).recordset;
  const articles = {};
  for (const query of ['ANTICA','30 X 10','50 X 30','PLETINA 25','MANIVELA LUXE','TAPON ANTICA','CASPUNCE','CASPUNCEJE70MM','CASPUNCEJE78MM']) articles[query] = await searchRpsArticles({ query, limit: 80 });
  await writeFile(destination+'/rps-sources.json', JSON.stringify({ date: new Date().toISOString(), recent, consumed, selectedConsumption, schema, articles }, null, 2));
  console.log(JSON.stringify({ output: destination + '/rps-sources.json', orders: recent.length, consumedArticles: consumed.length, selectedConsumptionRows: selectedConsumption.length }));
} finally { await pool.close(); await closeRpsCatalog(); }
