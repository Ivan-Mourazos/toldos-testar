import sql from 'mssql';
import { config } from './config.js';

let poolPromise;

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
  const pool = await getPool();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 80));
  const clean = String(query || '').trim();
  const request = pool.request();
  request.input('limit', sql.Int, safeLimit);
  request.input('company', sql.VarChar(10), config.db.company);
  request.input('query', sql.NVarChar(160), `%${escapeLike(clean)}%`);
  request.input('prefix', sql.NVarChar(160), `${escapeLike(clean)}%`);

  const result = await request.query(`
    SELECT TOP (@limit)
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
      AND (
        @query = '%%'
        OR a.CodArticle COLLATE Latin1_General_CI_AI LIKE @query ESCAPE '\\'
        OR a.Description COLLATE Latin1_General_CI_AI LIKE @query ESCAPE '\\'
      )
    ORDER BY
      CASE WHEN a.CodArticle COLLATE Latin1_General_CI_AI LIKE @prefix ESCAPE '\\' THEN 0 ELSE 1 END,
      a.CodArticle;
  `);

  return result.recordset.map((row) => ({
    code: String(row.code || '').trim(),
    description: String(row.description || '').trim(),
    width: inferRollWidth(row.code, row.unitCode),
    family: String(row.family || '').trim(),
    subfamily: String(row.subfamily || '').trim()
  }));
}

export async function closeRpsCatalog() {
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

function escapeLike(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
    .replaceAll('[', '\\[');
}
