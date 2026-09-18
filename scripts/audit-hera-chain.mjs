import fs from 'node:fs/promises';
import sql from 'mssql';
import { config } from '../src/config.js';

const pool = await new sql.ConnectionPool({
  ...config.db,
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 8000, requestTimeout: 30000
}).connect();
try {
  const articles = (await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
    SELECT CodArticle, Description, InactiveDate FROM dbo.STKArticle
    WHERE CodCompany = @company AND (CodArticle LIKE 'SCRANIL%' OR Description LIKE '%anillo%cadena%')
    ORDER BY CodArticle
  `)).recordset;
  const schema = (await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME LIKE 'PUR%Order%' OR TABLE_NAME LIKE '%Movement%'
      OR TABLE_NAME IN ('CPRImputationMaterialMO', 'PURSupplierArticle', 'PURSupplier')
      OR TABLE_NAME LIKE '%Consumption%' OR TABLE_NAME = '_MaterialesPrevistosOF'
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `)).recordset;
  const consumed = (await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
    SELECT TOP (100) a.CodArticle, i.ImputationDate, i.Quantity,
      mo.CodManufacturingOrder AS [of], mo.Notes, o.CodOrder, l.Description, l.Comment
    FROM dbo.CPRImputationMaterialMO i
    JOIN dbo.STKArticle a ON a.IDArticle=i.IDArticle AND a.CodCompany=i.CodCompany
    LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=i.IDManufacturingOrder AND mo.CodCompany=i.CodCompany
    LEFT JOIN dbo.FACOrderLineSL l ON l.IDManufacturingOrder=mo.IDManufacturingOrder AND l.CodCompany=mo.CodCompany
    LEFT JOIN dbo.FACOrderSL o ON o.IDOrder=l.IDOrder AND o.CodCompany=l.CodCompany
    WHERE i.CodCompany=@company AND a.CodArticle LIKE 'SCRANIL%'
    ORDER BY i.ImputationDate DESC
  `)).recordset;
  await fs.mkdir('output/hera-chain', { recursive: true });
  const purchases = (await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
    SELECT TOP (150) o.CodOrder, o.OrderDate, s.Description AS supplier,
      a.CodArticle, l.Description, l.Quantity, l.ReceivedQuantity, l.PendingReceive,
      l.ReferenceSupplier, l.Dimension1, l.Dimension2, l.Dimension3,
      l.Comment, o.Comment AS orderComment, mo.CodManufacturingOrder AS [of]
    FROM dbo.PUROrderLine l
    JOIN dbo.PUROrder o ON o.IDOrder=l.IDOrder AND o.CodCompany=l.CodCompany
    LEFT JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
    LEFT JOIN dbo.PURSupplier s ON s.IDSupplier=o.IDSupplier AND s.CodCompany=o.CodCompany
    LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
    WHERE l.CodCompany=@company AND (a.CodArticle LIKE 'SCRANIL%'
      OR l.Description LIKE '%anillo%cadena%' OR l.Comment LIKE '%anillo%cadena%')
    ORDER BY o.OrderDate DESC, o.CodOrder DESC
  `)).recordset;
  const movements = (await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
    SELECT TOP (50) a.CodArticle, m.MovementDate, m.Quantity, m.DocumentGenerated, m.Comment
    FROM dbo.STKWarehouseMovement m
    JOIN dbo.STKArticle a ON a.IDArticle=m.IDArticle AND a.CodCompany=m.CodCompany
    WHERE m.CodCompany=@company AND a.CodArticle LIKE 'SCRANIL%'
    ORDER BY m.MovementDate DESC
  `)).recordset;
  await fs.writeFile('output/hera-chain/schema.json', JSON.stringify({ articles, schema, consumed }, null, 2));
  await fs.writeFile('output/hera-chain/purchases.json', JSON.stringify({ checkedAt: new Date().toISOString(), purchases, movements }, null, 2));
  console.log(JSON.stringify({ purchases: purchases.slice(0, 22), movements: movements.slice(0, 8), purchaseCount: purchases.length }, null, 2));
} finally {
  await pool.close();
}
