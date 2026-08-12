import sql from 'mssql';
import { config } from './config.js';
import { rankFabricMatches } from './domain/fabricSearch.js';

let poolPromise;
let fabricCache = null;
let fabricCachePromise = null;
const fabricCacheTtlMs = 5 * 60 * 1000;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool({
      server: config.db.server,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      options: { encrypt: false, trustServerCertificate: true },
      pool: { min: 0, max: 5, idleTimeoutMillis: 30_000 },
      connectionTimeout: 8_000,
      requestTimeout: 15_000
    }).connect().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

export async function searchRpsFabrics({ query = '', limit = 30 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 80));
  const items = await loadRpsFabrics();
  return rankFabricMatches(items, query, safeLimit);
}

export async function getRpsOrder(orderCode) {
  const normalizedOrderCode = normalizeOrderCode(orderCode);
  if (!normalizedOrderCode) return null;

  const pool = await getPool();
  const orderRequest = pool.request()
    .input('company', sql.VarChar(10), config.db.company)
    .input('orderCode', sql.VarChar(40), normalizedOrderCode);
  const orderResult = await orderRequest.query(`
    SELECT
      o.CodOrder AS orderCode,
      o.OrderDate AS orderDate,
      o.Comment AS orderComment,
      c.CodCustomer AS customerCode,
      c.Description AS customer,
      da.Description AS business,
      l.IDOrderLine AS lineId,
      a.CodArticle AS articleCode,
      a.Description AS articleDescription,
      l.Description AS description,
      l.Comment AS comment,
      l.Quantity AS quantity,
      CONVERT(varchar(40), mo.CodManufacturingOrder) AS manufacturingOrder,
      mo.Notes AS manufacturingNotes
    FROM dbo.FACOrderSL o
    JOIN dbo.FACOrderLineSL l
      ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
    LEFT JOIN dbo.FACCustomer c
      ON c.IDCustomer = o.IDCustomer AND c.CodCompany = o.CodCompany
    LEFT JOIN dbo.FACCustomerDeliveryAddress da
      ON da.IDCustomerDeliveryAddress = o.IDCustomerDeliveryAddress
      AND da.IDCustomer = o.IDCustomer
      AND da.CodCompany = o.CodCompany
    LEFT JOIN dbo.STKArticle a
      ON a.IDArticle = l.IDArticle AND a.CodCompany = l.CodCompany
    LEFT JOIN dbo.CPRManufacturingOrder mo
      ON mo.IDManufacturingOrder = l.IDManufacturingOrder AND mo.CodCompany = l.CodCompany
    WHERE o.CodCompany = @company
      AND REPLACE(REPLACE(REPLACE(UPPER(o.CodOrder), '.', ''), '/', ''), '-', '') = @orderCode
    ORDER BY l.IDOrderLine;
  `);

  if (orderResult.recordset.length === 0) return null;
  const first = orderResult.recordset[0];
  const materialRequest = pool.request()
    .input('company', sql.VarChar(10), config.db.company)
    .input('orderCode', sql.VarChar(40), normalizedOrderCode);
  const materialResult = await materialRequest.query(`
    SELECT
      CONVERT(varchar(40), mo.CodManufacturingOrder) AS [of],
      a.CodArticle AS code,
      a.Description AS description,
      mu.CodMeasureUnit AS unitCode,
      psf.Description AS subfamily,
      m.CreationTimestamp AS createdAt
    FROM dbo.FACOrderSL o
    JOIN dbo.FACOrderLineSL l
      ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
    JOIN dbo.CPRManufacturingOrder mo
      ON mo.IDManufacturingOrder = l.IDManufacturingOrder AND mo.CodCompany = l.CodCompany
    JOIN dbo._MaterialesPrevistosOF m
      ON m.IDManufacturingOrder = mo.IDManufacturingOrder AND m.CodCompany = mo.CodCompany
    JOIN dbo.STKArticle a
      ON a.IDArticle = m.IDArticle AND a.CodCompany = m.CodCompany
    LEFT JOIN dbo.GENMeasureUnit mu
      ON mu.IDMeasureUnit = a.IDUnitQuantityWarehouse AND mu.CodCompany = a.CodCompany
    LEFT JOIN dbo.GENProductFamily pf
      ON pf.IDProductFamily = a.IDProductFamily AND pf.CodCompany = a.CodCompany
    LEFT JOIN dbo.GENProductSubFamily psf
      ON psf.IDProductSubFamily = a.IDProductSubFamily AND psf.CodCompany = a.CodCompany
    WHERE o.CodCompany = @company
      AND REPLACE(REPLACE(REPLACE(UPPER(o.CodOrder), '.', ''), '/', ''), '-', '') = @orderCode
      AND pf.Description = 'LONA'
    ORDER BY mo.CodManufacturingOrder, m.CreationTimestamp, a.CodArticle;
  `);

  return {
    header: {
      orderCode: first.orderCode,
      orderDate: first.orderDate,
      orderComment: first.orderComment,
      customerCode: first.customerCode,
      customer: first.customer,
      business: first.business
    },
    lines: orderResult.recordset.map((row) => ({
      lineId: row.lineId,
      articleCode: row.articleCode,
      articleDescription: row.articleDescription,
      description: row.description,
      comment: row.comment,
      quantity: row.quantity,
      manufacturingOrder: row.manufacturingOrder,
      manufacturingNotes: row.manufacturingNotes
    })),
    materials: materialResult.recordset
  };
}

async function loadRpsFabrics() {
  if (fabricCache && fabricCache.expiresAt > Date.now()) return fabricCache.items;
  if (fabricCachePromise) return fabricCachePromise;

  fabricCachePromise = (async () => {
    const pool = await getPool();
    const request = pool.request();
    request.input('company', sql.VarChar(10), config.db.company);

    const result = await request.query(`
    SELECT
      a.CodArticle AS code,
      a.Description AS description,
      mu.CodMeasureUnit AS unitCode,
      pf.Description AS family,
      psf.Description AS subfamily
    FROM dbo.STKArticle a
    LEFT JOIN dbo.GENMeasureUnit mu
      ON mu.IDMeasureUnit = a.IDUnitQuantityWarehouse
      AND mu.CodCompany = a.CodCompany
    LEFT JOIN dbo.GENProductFamily pf
      ON pf.IDProductFamily = a.IDProductFamily
      AND pf.CodCompany = a.CodCompany
    LEFT JOIN dbo.GENProductSubFamily psf
      ON psf.IDProductSubFamily = a.IDProductSubFamily
      AND psf.CodCompany = a.CodCompany
    WHERE a.CodCompany = @company
      AND (a.InactiveDate IS NULL OR a.InactiveDate > GETDATE())
      AND pf.Description = 'LONA'
    ORDER BY a.CodArticle;
  `);

    const items = result.recordset.map((row) => ({
      code: String(row.code || '').trim(),
      description: String(row.description || '').trim(),
      width: inferRollWidth(row.code, row.unitCode),
      family: String(row.family || '').trim(),
      subfamily: String(row.subfamily || '').trim()
    }));
    fabricCache = { items, expiresAt: Date.now() + fabricCacheTtlMs };
    return items;
  })().finally(() => {
    fabricCachePromise = null;
  });

  return fabricCachePromise;
}

export async function closeRpsCatalog() {
  fabricCache = null;
  fabricCachePromise = null;
  if (!poolPromise) return;
  const pool = await poolPromise.catch(() => null);
  poolPromise = null;
  if (pool) await pool.close();
}

function inferRollWidth(code, unitCode) {
  const codeMatch = /P(\d{2,3})$/i.exec(String(code || '').trim());
  if (codeMatch) return Number(codeMatch[1]);
  const unitMatch = /ML(\d{2,3})/i.exec(String(unitCode || '').trim());
  return unitMatch ? Number(unitMatch[1]) : 120;
}

function normalizeOrderCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
