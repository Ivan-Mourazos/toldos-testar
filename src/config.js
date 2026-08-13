import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function booleanFromEnv(name, fallback = false) {
  const value = String(process.env[name] ?? '').trim().toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on', 'si', 'sí'].includes(value);
}

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: numberFromEnv('PORT', 4400),
  fileWritesEnabled: booleanFromEnv('ENABLE_FILE_WRITES'),
  heraEnabled: booleanFromEnv('ENABLE_HERA', !isProduction),
  legacyExportsEnabled: booleanFromEnv('ENABLE_LEGACY_EXPORTS', !isProduction),
  exportDirectory: process.env.EXPORT_DIRECTORY || '',
  orderArchiveRoot: process.env.ORDER_ARCHIVE_ROOT || '',
  reviewDirectory: process.env.REVIEW_DIRECTORY || '',
  planteamientosDirectory: process.env.PLANTEAMIENTOS_DIRECTORY || '',
  rpsUploadDirectory: process.env.RPS_UPLOAD_DIRECTORY || process.env.EXPORT_DIRECTORY || '',
  rpsPlanteamientosDirectory: process.env.RPS_PLANTEAMIENTOS_DIRECTORY || '',
  workflowSettingsFile: process.env.WORKFLOW_SETTINGS_FILE || path.resolve('.toldos-testar-settings.json'),
  db: {
    server: process.env.DB_SERVER || '192.168.0.124',
    port: numberFromEnv('DB_PORT', 1433),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'RPSNext',
    company: process.env.DB_COMPANY || '001'
  }
};
