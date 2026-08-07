import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export const config = {
  port: numberFromEnv('PORT', 4400),
  fileWritesEnabled: String(process.env.ENABLE_FILE_WRITES || '').toLowerCase() === 'true',
  exportDirectory: process.env.EXPORT_DIRECTORY || '',
  orderArchiveRoot: process.env.ORDER_ARCHIVE_ROOT || '',
  reviewDirectory: process.env.REVIEW_DIRECTORY || '',
  planteamientosDirectory: process.env.PLANTEAMIENTOS_DIRECTORY || '',
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
