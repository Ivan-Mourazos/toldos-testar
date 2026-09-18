// Solo SELECT: compras de kits de brazo cruzado y OF asociadas.
import sql from 'mssql';
import { config } from '../src/config.js';
const pool = await new sql.ConnectionPool({ ...config.db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 8000, requestTimeout: 60000 }).connect();
try {
 const result = await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
 SELECT TOP 60 o.CodOrder,o.OrderDate,s.Description AS supplier,a.CodArticle,l.Description,l.Quantity,l.ReferenceSupplier,l.Comment,mo.CodManufacturingOrder AS [of]
 FROM dbo.PUROrderLine l JOIN dbo.PUROrder o ON o.IDOrder=l.IDOrder AND o.CodCompany=l.CodCompany
 JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
 LEFT JOIN dbo.PURSupplier s ON s.IDSupplier=o.IDSupplier AND s.CodCompany=o.CodCompany
 LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
 WHERE l.CodCompany=@company AND a.CodArticle LIKE 'KITBRCRU%' ORDER BY o.OrderDate DESC`);
 console.log(JSON.stringify(result.recordset.filter((row) => row.OrderDate >= new Date('2025-01-01')),null,2));
 const linked = await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
 SELECT o.CodOrder,o.OrderDate,a.CodArticle,l.Description,l.Quantity,mu.CodMeasureUnit AS purchaseUnit,l.ReferenceSupplier,mo.CodManufacturingOrder AS [of]
 FROM dbo.PUROrderLine l JOIN dbo.PUROrder o ON o.IDOrder=l.IDOrder AND o.CodCompany=l.CodCompany
 JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
 LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
 LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit=l.IDUnitQuantity AND mu.CodCompany=l.CodCompany
 WHERE l.CodCompany=@company AND mo.CodManufacturingOrder='0232215' ORDER BY o.OrderDate DESC`);
 console.log('COMPRAS VINCULADAS OF 0232215', JSON.stringify(linked.recordset,null,2));
 const profiles = await pool.request().input('company', sql.VarChar(10), config.db.company).query(`
 SELECT a.CodArticle,a.Description,mu.CodMeasureUnit
 FROM dbo.STKArticle a LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit=a.IDUnitQuantityWarehouse AND mu.CodCompany=a.CodCompany
 WHERE a.CodCompany=@company AND a.CodArticle IN ('PEVO80BL16500C','PEVO80NE11500C','PEVO80BU05500C','PEVO80GR12500C','PEVO80GR16500C')`);
 console.log('PERFILES 500',JSON.stringify(profiles.recordset,null,2));
} finally { await pool.close(); }
