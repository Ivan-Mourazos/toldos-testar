// Solo lectura: contraste de fabricación y consumos Antica; no escribe en RPS.
import sql from 'mssql';
import { config } from '../src/config.js';
import { mkdir, writeFile } from 'node:fs/promises';
const destination = 'output/modelos/antica/materials';
await mkdir(destination, { recursive: true });
const pool = await new sql.ConnectionPool({ ...config.db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 8000, requestTimeout: 60000 }).connect();
const request = () => pool.request().input('company', sql.VarChar(10), config.db.company);
const scope = `WITH target AS (
 SELECT DISTINCT mo.IDManufacturingOrder, mo.CodCompany, mo.CodManufacturingOrder
 FROM dbo.FACOrderSL o
 JOIN dbo.FACOrderLineSL l ON l.IDOrder=o.IDOrder AND l.CodCompany=o.CodCompany
 JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
 JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
 WHERE o.CodCompany=@company AND a.CodArticle='ANTICA' AND o.OrderDate >= '20240101'
)`;
try {
 const orders = (await request().query(`
 SELECT o.CodOrder AS orderCode,o.OrderDate,l.Quantity,l.Description,l.Comment,mo.CodManufacturingOrder AS [of],mo.Notes
 FROM dbo.FACOrderSL o JOIN dbo.FACOrderLineSL l ON l.IDOrder=o.IDOrder AND l.CodCompany=o.CodCompany
 JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
 LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder=l.IDManufacturingOrder AND mo.CodCompany=l.CodCompany
 WHERE o.CodCompany=@company AND a.CodArticle='ANTICA' AND o.OrderDate >= '20240101'
 ORDER BY o.OrderDate DESC,mo.CodManufacturingOrder`)).recordset;
 const consumed = (await request().query(scope+`
 SELECT mo.CodManufacturingOrder AS [of],a.CodArticle AS code,a.Description AS description,mu.CodMeasureUnit AS unitCode,SUM(i.Quantity) AS quantity
 FROM target mo JOIN dbo.CPRImputationMaterialMO i ON i.IDManufacturingOrder=mo.IDManufacturingOrder AND i.CodCompany=mo.CodCompany
 JOIN dbo.STKArticle a ON a.IDArticle=i.IDArticle AND a.CodCompany=i.CodCompany
 LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit=a.IDUnitQuantityWarehouse AND mu.CodCompany=a.CodCompany
 GROUP BY mo.CodManufacturingOrder,a.CodArticle,a.Description,mu.CodMeasureUnit ORDER BY mo.CodManufacturingOrder,a.CodArticle`)).recordset;
 const planned = (await request().query(scope+`
 SELECT mo.CodManufacturingOrder AS [of],a.CodArticle AS code,a.Description AS description,mu.CodMeasureUnit AS unitCode,SUM(i.Quantity) AS quantity
 FROM target mo JOIN dbo._MaterialesPrevistosOF i ON i.IDManufacturingOrder=mo.IDManufacturingOrder AND i.CodCompany=mo.CodCompany
 JOIN dbo.STKArticle a ON a.IDArticle=i.IDArticle AND a.CodCompany=i.CodCompany
 LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit=a.IDUnitQuantityWarehouse AND mu.CodCompany=a.CodCompany
 GROUP BY mo.CodManufacturingOrder,a.CodArticle,a.Description,mu.CodMeasureUnit ORDER BY mo.CodManufacturingOrder,a.CodArticle`)).recordset;
 const bom = (await request().query(scope+`
 SELECT mo.CodManufacturingOrder AS [of],a.CodArticle AS code,m.Description,m.Quantity,m.QuantityImputed,m.FixedQuantity,m.Notes,mu.CodMeasureUnit AS unitCode
 FROM target mo JOIN dbo.CPRMOTask task ON task.IDManufacturingOrder=mo.IDManufacturingOrder AND task.CodCompany=mo.CodCompany
 JOIN dbo.CPRMOMaterial m ON m.IDMOTask=task.IDMOTask AND m.CodCompany=task.CodCompany
 JOIN dbo.STKArticle a ON a.IDArticle=m.IDArticle AND a.CodCompany=m.CodCompany
 LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit=a.IDUnitQuantityWarehouse AND mu.CodCompany=a.CodCompany
 ORDER BY mo.CodManufacturingOrder,a.CodArticle`)).recordset;
 const templates = (await request().query(`
 SELECT a.CodArticle AS product,s.Version,s.Active,m.CodMaterial,ma.CodArticle AS material,m.Description,m.Quantity,m.QuantityFormula,m.Notes,mu.CodMeasureUnit AS unitCode
 FROM dbo.CPRStructure s JOIN dbo.STKArticle a ON a.IDArticle=s.IDArticle AND a.CodCompany=s.CodCompany
 JOIN dbo.CPRTask task ON task.IDStructure=s.IDStructure AND task.CodCompany=s.CodCompany
 JOIN dbo.CPRMaterial m ON m.IDTask=task.IDTask AND m.CodCompany=task.CodCompany
 JOIN dbo.STKArticle ma ON ma.IDArticle=m.IDArticle AND ma.CodCompany=m.CodCompany
 LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit=ma.IDUnitQuantityWarehouse AND mu.CodCompany=ma.CodCompany
 WHERE s.CodCompany=@company AND (a.CodArticle='ANTICA' OR a.CodArticle LIKE 'BANTICA%' OR a.CodArticle LIKE 'PRANTICA%')
 ORDER BY a.CodArticle,s.Version,m.CodMaterial`)).recordset;
 const purchases = (await request().query(scope+`
 SELECT mo.CodManufacturingOrder AS [of],a.CodArticle AS code,l.Description,l.Quantity,mu.CodMeasureUnit AS unitCode,l.ReferenceSupplier,l.Comment
 FROM target mo JOIN dbo.PUROrderLine l ON l.IDManufacturingOrder=mo.IDManufacturingOrder AND l.CodCompany=mo.CodCompany
 LEFT JOIN dbo.STKArticle a ON a.IDArticle=l.IDArticle AND a.CodCompany=l.CodCompany
 LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit=l.IDUnitQuantity AND mu.CodCompany=l.CodCompany
 ORDER BY mo.CodManufacturingOrder,a.CodArticle`)).recordset;
 const suppliers = (await request().query(`
 SELECT a.CodArticle AS code,a.Description AS description,mu.CodMeasureUnit AS unitCode,s.CodSupplier,s.Description AS supplier,sa.ReferenceSupplier,sa.DescriptionSupplier,sa.Blocked
 FROM dbo.STKArticle a
 LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit=a.IDUnitQuantityWarehouse AND mu.CodCompany=a.CodCompany
 LEFT JOIN dbo.PURSupplierArticle sa ON sa.IDArticle=a.IDArticle AND sa.CodCompany=a.CodCompany
 LEFT JOIN dbo.PURSupplier s ON s.IDSupplier=sa.IDSupplier AND s.CodCompany=sa.CodCompany
 WHERE a.CodCompany=@company AND a.CodArticle IN ('PLEAC30MM10','TUBGA50MM30MM2MM','TUBLI1-1/4"','PLA4BLAN25MM635C','PLA4NEGR25MM635C','EMBEBRON60MM40','ANCIN40MM40','ANCIN45MM45','TAPONTOR13MMNEGRO','TAPONTOR17MMNEGRO')
 ORDER BY a.CodArticle,s.CodSupplier`)).recordset;
 const rawSteelMovements = (await request().query(scope+`
 SELECT mo.CodManufacturingOrder AS [of],a.CodArticle AS code,i.Quantity,i.QuantitySecondUnit,i.Description,i.DocumentNumber,i.ImputationDate
 FROM target mo JOIN dbo.CPRImputationMaterialMO i ON i.IDManufacturingOrder=mo.IDManufacturingOrder AND i.CodCompany=mo.CodCompany
 JOIN dbo.STKArticle a ON a.IDArticle=i.IDArticle AND a.CodCompany=i.CodCompany
 WHERE a.CodArticle IN ('PLEAC30MM10','TUBGA50MM30MM2MM')
 ORDER BY mo.CodManufacturingOrder,a.CodArticle,i.ImputationDate`)).recordset;
 const schema = (await request().query(`SELECT TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('CPRManufacturingOrder','CPRMaterial','CPRStructure','PURSupplierArticle','PURSupplier','STKArticle') OR TABLE_NAME LIKE 'CPR%Material%' ORDER BY TABLE_NAME,ORDINAL_POSITION`)).recordset;
 await writeFile(destination+'/rps-materials.json',JSON.stringify({date:new Date().toISOString(),orders,consumed,planned,bom,templates,purchases,suppliers,rawSteelMovements,schema},null,2));
 console.log(JSON.stringify({orders:orders.length,ofs:new Set(orders.map(o=>o.of)).size,consumed:consumed.length,planned:planned.length,bom:bom.length,templates:templates.length,purchases:purchases.length,suppliers:suppliers.length,output:destination+'/rps-materials.json'}));
} finally {await pool.close();}
