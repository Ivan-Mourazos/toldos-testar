import path from 'node:path';

export function withRpsDateWindow(request, sql, {
  defaultFrom = '2025-01-01',
  defaultTo = '2027-01-01'
} = {}) {
  const from = validIsoDate(process.env.RPS_DATE_FROM, defaultFrom);
  const to = validIsoDate(process.env.RPS_DATE_TO, defaultTo);

  if (from >= to) {
    throw new Error(`Rango RPS no válido: ${from} debe ser anterior a ${to}.`);
  }

  return request
    .input('dateFrom', sql.Date, from)
    .input('dateTo', sql.Date, to);
}

export function toldosRoots(defaultRoots) {
  const configured = String(process.env.TOLDOS_EXCEL_ROOT || '').trim();
  return configured
    ? configured.split(path.delimiter).map((root) => root.trim()).filter(Boolean)
    : defaultRoots;
}

function validIsoDate(value, fallback) {
  const candidate = String(value || fallback).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    throw new Error(`Fecha RPS no válida: ${candidate}. Usa AAAA-MM-DD.`);
  }
  return candidate;
}
