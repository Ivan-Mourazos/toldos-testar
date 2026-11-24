import sql from 'mssql';
import { config } from './config.js';
import { rankFabricMatches } from './domain/fabricSearch.js';
import { inferRollWidth, inferFabricDetails } from './domain/fabricRps.js';
import { medirConsultas } from './medir-consultas.js';
import { normalizeOf } from './reviewRules.js';

// Cada consulta a RPS queda apuntada con su tiempo en .logs/consultas-sql
// (petición de IT, 20/11/2026). El informe está en coordina-ot: `pnpm consultas-sql`.
medirConsultas({ web: 'Planteamientos', dir: '.logs/consultas-sql' });

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
      // appName: así IT ve en SQL Server (program_name) qué conexiones son nuestras.
      options: { encrypt: false, trustServerCertificate: true, appName: 'Planteamientos' },
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

// La pantalla de remolques (src/remolques/rps) lee pedidos de RPS con esta misma
// conexión de solo lectura en lugar de abrir otra: así hay un único pool y una
// única configuración. Devuelve null si no hay credenciales, que es lo que
// espera el código copiado de Remolques-TGM para caer en su modo sin RPS.
export function getRpsPoolForRemolques() {
  if (!config.db.user || !config.db.password) return null;
  return getPool();
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
      m.Quantity AS quantity,
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

  // Los motores que compras ya ha pedido para las OF del pedido (Iván, 07/10/2026, AR2604748).
  const purchaseRequest = pool.request()
    .input('company', sql.VarChar(10), config.db.company)
    .input('orderCode', sql.VarChar(40), normalizedOrderCode);
  const purchaseResult = await purchaseRequest.query(`
    SELECT
      CONVERT(varchar(40), mo.CodManufacturingOrder) AS [of],
      a.CodArticle AS code
    FROM dbo.FACOrderSL o
    JOIN dbo.FACOrderLineSL l
      ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
    JOIN dbo.CPRManufacturingOrder mo
      ON mo.IDManufacturingOrder = l.IDManufacturingOrder AND mo.CodCompany = l.CodCompany
    JOIN dbo.PUROrderLine pl
      ON pl.IDManufacturingOrder = mo.IDManufacturingOrder AND pl.CodCompany = mo.CodCompany
    JOIN dbo.STKArticle a
      ON a.IDArticle = pl.IDArticle AND a.CodCompany = pl.CodCompany
    WHERE o.CodCompany = @company
      AND REPLACE(REPLACE(REPLACE(UPPER(o.CodOrder), '.', ''), '/', ''), '-', '') = @orderCode
      AND (a.CodArticle LIKE 'RS100%//%' OR a.CodArticle LIKE 'SUNILUSIO%//%')
    ORDER BY mo.CodManufacturingOrder, a.CodArticle;
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
    materials: materialResult.recordset,
    purchasedMotors: purchaseResult.recordset
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
      ...inferFabricDetails(row),
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

function normalizeOrderCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Read-only catalogue lookup; all search values remain SQL parameters.
export async function searchRpsArticles({ query = '', limit = 30, exact = false } = {}) {
  const term = String(query).trim().slice(0, 160);
  if (!term) return [];
  const pool = await getPool();
  const request = pool.request()
    .input('company', sql.VarChar(10), config.db.company)
    .input('limit', sql.Int, Math.max(1, Math.min(Number(limit) || 30, 60)))
    .input('exactCode', sql.VarChar(160), term);
  const tokens = term.split(/\s+/).slice(0, 8);
  const conditions = tokens.map((token, index) => {
    request.input('term' + index, sql.NVarChar(200), '%' + token.replace(/[[\]%_]/g, (char) => '[' + char + ']') + '%');
    return '(a.CodArticle LIKE @term' + index + ' OR a.Description LIKE @term' + index + ')';
  });
  const result = await request.query(`
    SELECT TOP (@limit) a.CodArticle AS code, a.Description AS description, mu.CodMeasureUnit AS unitCode
    FROM dbo.STKArticle a
    LEFT JOIN dbo.GENMeasureUnit mu ON mu.IDMeasureUnit = a.IDUnitQuantityWarehouse AND mu.CodCompany = a.CodCompany
    WHERE a.CodCompany = @company
      AND (a.InactiveDate IS NULL OR a.InactiveDate > GETDATE())
      AND ${exact ? 'a.CodArticle = @exactCode' : conditions.join(' AND ')}
    ORDER BY CASE WHEN a.CodArticle = @exactCode THEN 0 ELSE 1 END, a.CodArticle
  `);
  return result.recordset.map((row) => ({ code: String(row.code).trim(), description: String(row.description || '').trim(), unitCode: String(row.unitCode || '').trim() }));
}

export async function getRpsArticle(reference) {
  return (await searchRpsArticles({ query: reference, limit: 1, exact: true }))[0] || null;
}

// Una lona del catálogo por su código exacto (la del historial que no salió en la
// búsqueda de la propuesta).
export async function findRpsFabric(code) {
  const wanted = String(code || '').trim().toUpperCase();
  if (!wanted) return null;
  const items = await loadRpsFabrics();
  return items.find((item) => item.code.toUpperCase() === wanted) || null;
}

// Stock de todas las lonas, una fila por bobina (Series) y almacén, con lo reservado
// por OF en STKStockReserve (informe tela-0930, sección c). Solo lectura; lo resume
// domain/fabricStock.js. Unos 170 ms para las ~1.500 filas.
export async function queryRpsFabricStockRows() {
  const pool = await getPool();
  const result = await pool.request()
    .input('company', sql.VarChar(10), config.db.company)
    .query(`
    SELECT
      s.IDStock AS stockId,
      a.CodArticle AS code,
      CONVERT(varchar(20), w.CodWarehouse) AS warehouseCode,
      w.Description AS warehouseName,
      s.Series AS roll,
      s.Stock AS meters,
      ISNULL(r.reserved, 0) AS reserved
    FROM dbo.STKStock s
    JOIN dbo.STKArticle a
      ON a.IDArticle = s.IDArticle AND a.CodCompany = s.CodCompany
    JOIN dbo.GENProductFamily pf
      ON pf.IDProductFamily = a.IDProductFamily AND pf.CodCompany = a.CodCompany
    LEFT JOIN dbo.GENWarehouse w
      ON w.IDWarehouse = s.IDWarehouse AND w.CodCompany = s.CodCompany
    LEFT JOIN (
      SELECT IDStock, CodCompany, SUM(Quantity) AS reserved
      FROM dbo.STKStockReserve
      GROUP BY IDStock, CodCompany
    ) r ON r.IDStock = s.IDStock AND r.CodCompany = s.CodCompany
    WHERE s.CodCompany = @company
      AND s.Stock <> 0
      AND pf.Description = 'LONA';
  `);
  return result.recordset;
}

// Reservas de lona de Almacén con su OF (reserva → material de OF → tarea → OF). Solo
// lectura. Sirve para no restar lo que ya está reservado para el propio pedido.
export async function queryRpsFabricReserveRows() {
  const pool = await getPool();
  const result = await pool.request()
    .input('company', sql.VarChar(10), config.db.company)
    .query(`
    SELECT r.IDStock AS stockId, mo.CodManufacturingOrder AS [of], r.Quantity AS quantity
    FROM dbo.STKStockReserve r
    JOIN dbo.STKStock s ON s.IDStock = r.IDStock AND s.CodCompany = r.CodCompany
    JOIN dbo.STKArticle a ON a.IDArticle = s.IDArticle AND a.CodCompany = s.CodCompany
    JOIN dbo.GENProductFamily pf ON pf.IDProductFamily = a.IDProductFamily AND pf.CodCompany = a.CodCompany
    JOIN dbo.CPRMOMaterial m ON r.ItemType = 5 AND m.IDMOMaterial = r.IDItem AND m.CodCompany = r.CodCompany
    JOIN dbo.CPRMOTask t ON t.IDMOTask = m.IDMOTask AND t.CodCompany = m.CodCompany
    JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder = t.IDManufacturingOrder AND mo.CodCompany = t.CodCompany
    WHERE r.CodCompany = @company AND pf.Description = 'LONA';
  `);
  return result.recordset;
}

// OF del pedido y códigos de lona asignados o reservados por Almacén. La reserva
// toma el artículo de la bobina, que puede ser distinto del material asignado.
export async function getRpsStockPlano(pedido) {
  const pool = await getPool();
  const { recordset } = await pool.request()
    .input('company', sql.VarChar(10), config.db.company)
    .input('pedido', sql.VarChar(40), pedido)
    .query(`
    WITH ordenes AS (
      SELECT DISTINCT mo.IDManufacturingOrder, mo.CodManufacturingOrder AS [of], c.Description AS cliente
      FROM dbo.FACOrderSL o
      LEFT JOIN dbo.FACCustomer c ON c.IDCustomer = o.IDCustomer AND c.CodCompany = o.CodCompany
      LEFT JOIN dbo.FACOrderLineSL l ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
      LEFT JOIN dbo.CPRManufacturingOrder mo ON mo.IDManufacturingOrder = l.IDManufacturingOrder AND mo.CodCompany = l.CodCompany
      WHERE o.CodCompany = @company
        AND REPLACE(REPLACE(REPLACE(UPPER(o.CodOrder), '.', ''), '/', ''), '-', '') = @pedido
    ), materiales AS (
      SELECT t.IDManufacturingOrder, m.IDMOMaterial, m.IDArticle
      FROM ordenes o
      JOIN dbo.CPRMOTask t ON t.IDManufacturingOrder = o.IDManufacturingOrder AND t.CodCompany = @company
      JOIN dbo.CPRMOMaterial m ON m.IDMOTask = t.IDMOTask AND m.CodCompany = @company
    ), articulos AS (
      SELECT m.IDManufacturingOrder, m.IDArticle, 1 AS asignada, 0 AS reservada FROM materiales m
      UNION ALL
      SELECT m.IDManufacturingOrder, s.IDArticle, 0, 1
      FROM materiales m
      JOIN dbo.STKStockReserve r ON r.ItemType = 5 AND r.IDItem = m.IDMOMaterial AND r.CodCompany = @company AND r.Quantity > 0
      JOIN dbo.STKStock s ON s.IDStock = r.IDStock AND s.CodCompany = @company
    ), lonas AS (
      SELECT x.IDManufacturingOrder, a.CodArticle AS codigo, a.Description AS descripcion,
        MAX(x.asignada) AS asignada, MAX(x.reservada) AS reservada
      FROM articulos x
      JOIN dbo.STKArticle a ON a.IDArticle = x.IDArticle AND a.CodCompany = @company
      JOIN dbo.GENProductFamily pf ON pf.IDProductFamily = a.IDProductFamily AND pf.CodCompany = @company
      WHERE pf.Description = 'LONA'
      GROUP BY x.IDManufacturingOrder, a.CodArticle, a.Description
    )
    SELECT o.[of], o.cliente, l.codigo, l.descripcion, l.asignada, l.reservada
    FROM ordenes o LEFT JOIN lonas l ON l.IDManufacturingOrder = o.IDManufacturingOrder
    ORDER BY o.[of], l.codigo;
  `);
  const ordenes = new Map();
  for (const fila of recordset) {
    const of = normalizeOf(fila.of);
    if (!/^\d{7,9}$/.test(of)) continue;
    if (!ordenes.has(of)) ordenes.set(of, { of, telas: [] });
    if (fila.codigo) ordenes.get(of).telas.push({
      codigo: fila.codigo.trim().toUpperCase(), descripcion: String(fila.descripcion ?? '').trim(),
      asignada: Boolean(fila.asignada), reservada: Boolean(fila.reservada),
    });
  }
  return { cliente: String(recordset[0]?.cliente ?? '').trim(), ordenes: [...ordenes.values()] };
}
