import dotenv from 'dotenv';

dotenv.config();

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export const config = {
  port: numberFromEnv('PORT', 4300),
  exportDirectory: process.env.EXPORT_DIRECTORY || '',
  orderArchiveRoot: process.env.ORDER_ARCHIVE_ROOT || ''
};
