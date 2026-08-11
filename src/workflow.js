import fs from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export const REVIEW_FILE_SUFFIX = '.pdf';
const LEGACY_REVIEW_FILE_SUFFIX = '.toldos.json';
const NOT_EDITABLE_REVIEW_PDF = 'NOT_EDITABLE_REVIEW_PDF';

export function defaultWorkflowSettings(seed = {}) {
  const archiveTemplate = seed.orderArchiveRoot
    ? path.join(seed.orderArchiveRoot, '{YYYY}', 'TOLDOS')
    : '';
  return {
    schemaVersion: 1,
    productionEnabled: Boolean(seed.fileWritesEnabled),
    reviewDirectory: seed.reviewDirectory || archiveTemplate,
    planteamientosDirectory: seed.planteamientosDirectory || archiveTemplate,
    rpsUploadDirectory: seed.rpsUploadDirectory || seed.exportDirectory || ''
  };
}

export function normalizeWorkflowSettings(input, current = defaultWorkflowSettings()) {
  const settings = {
    schemaVersion: 1,
    productionEnabled: input?.productionEnabled === true,
    reviewDirectory: cleanPath(input?.reviewDirectory ?? current.reviewDirectory),
    planteamientosDirectory: cleanPath(input?.planteamientosDirectory ?? current.planteamientosDirectory),
    rpsUploadDirectory: cleanPath(input?.rpsUploadDirectory ?? current.rpsUploadDirectory)
  };

  for (const [label, value] of [
    ['carpeta de revisión', settings.reviewDirectory],
    ['carpeta de planteamientos', settings.planteamientosDirectory],
    ['carpeta de subida de material', settings.rpsUploadDirectory]
  ]) {
    if (value && !isAbsolutePathTemplate(value)) {
      throw new Error(`La ${label} debe ser una ruta absoluta o de red.`);
    }
  }

  return settings;
}

export function workflowReadiness(settings) {
  const missing = [];
  if (!settings.reviewDirectory) missing.push('Carpeta TOLDOS para revisión');
  if (!settings.planteamientosDirectory) missing.push('Carpeta de planteamientos');
  if (!settings.rpsUploadDirectory) missing.push('Carpeta de subida de material');
  return {
    reviewReady: Boolean(settings.reviewDirectory),
    productionReady: settings.productionEnabled && missing.length === 0,
    missing
  };
}

export function resolveDirectoryTemplate(template, orderCodeOrYear) {
  const year = typeof orderCodeOrYear === 'number'
    ? orderCodeOrYear
    : getOrderYear(orderCodeOrYear);
  if (!year) throw new Error('No pude determinar el año desde el número de pedido.');
  return String(template || '').replaceAll('{YYYY}', String(year));
}

export function sanitizeOrderCode(value) {
  const clean = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '');
  if (!clean) throw new Error('El número de pedido no es válido.');
  return clean.slice(0, 80);
}

export function getOrderYear(orderCode) {
  const match = /^[A-Z]+(\d{2})/.exec(String(orderCode || '').toUpperCase());
  if (!match) return null;
  return 2000 + Number(match[1]);
}

export function reviewFilename(orderCode) {
  return `${sanitizeOrderCode(orderCode)}${REVIEW_FILE_SUFFIX}`;
}

export function createReviewPackage({ order, calculation, existing = null, now = new Date().toISOString() }) {
  const orderCode = sanitizeOrderCode(order.orderCode);
  const ofs = Array.from(new Set(calculation.ofs.map((item) => item.of).filter(Boolean)));
  const models = Array.from(new Set(order.awnings.map((item) => item.model).filter(Boolean)));
  return {
    schemaVersion: 1,
    kind: 'toldos-testar-review',
    orderCode,
    status: 'PENDING_REVIEW',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    createdBy: order.technician || existing?.createdBy || '',
    reviewedAt: null,
    reviewedBy: '',
    reviewNote: '',
    production: null,
    summary: {
      customer: order.customer || '',
      orderDate: order.orderDate || '',
      technician: order.technician || '',
      reviewer: order.reviewer || '',
      awnings: order.awnings.length,
      ofs,
      models,
      diagnostics: calculation.diagnostics.length
    },
    order: structuredClone(order)
  };
}

export function reviewSummary(review) {
  const summary = { ...review };
  delete summary.order;
  return summary;
}

export function markReviewChangesRequested(review, { reviewer, note, now = new Date().toISOString() }) {
  return {
    ...review,
    status: 'CHANGES_REQUESTED',
    updatedAt: now,
    reviewedAt: now,
    reviewedBy: cleanText(reviewer),
    reviewNote: cleanText(note),
    production: null
  };
}

export function markReviewProduced(review, { reviewer, note, files, now = new Date().toISOString() }) {
  return {
    ...review,
    status: 'PRODUCED',
    updatedAt: now,
    reviewedAt: now,
    reviewedBy: cleanText(reviewer),
    reviewNote: cleanText(note),
    production: { createdAt: now, files }
  };
}

export function createWorkflowStore({ settingsFile, defaults }) {
  let cached = null;

  async function getSettings() {
    if (cached) return cached;
    try {
      const parsed = JSON.parse(await fs.readFile(settingsFile, 'utf8'));
      cached = normalizeWorkflowSettings(parsed, defaults);
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('No se pudo leer la configuración del flujo:', error.message);
      cached = normalizeWorkflowSettings(defaults, defaults);
    }
    return cached;
  }

  async function saveSettings(input) {
    const current = await getSettings();
    const next = normalizeWorkflowSettings(input, current);
    await fs.mkdir(path.dirname(settingsFile), { recursive: true });
    await writeJsonAtomic(settingsFile, next);
    cached = next;
    return next;
  }

  async function getReview(orderCode) {
    const settings = await getSettings();
    if (!settings.reviewDirectory) throw new Error('Configura primero la carpeta TOLDOS para revisión.');
    const reviewPath = buildReviewPath(settings.reviewDirectory, orderCode);
    try {
      return await extractReviewPackageFromPdf(await fs.readFile(reviewPath));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const legacyPath = buildLegacyReviewPath(settings.reviewDirectory, orderCode);
      return JSON.parse(await fs.readFile(legacyPath, 'utf8'));
    }
  }

  async function saveReview(review, pdf) {
    const settings = await getSettings();
    if (!settings.reviewDirectory) throw new Error('Configura primero la carpeta TOLDOS para revisión.');
    if (!Buffer.isBuffer(pdf) || pdf.subarray(0, 4).toString('ascii') !== '%PDF') {
      throw new Error('No se pudo generar el PDF editable de revisión.');
    }
    const reviewPath = buildReviewPath(settings.reviewDirectory, review.orderCode);
    await fs.mkdir(path.dirname(reviewPath), { recursive: true });
    await writeFileAtomic(reviewPath, pdf);
    return reviewPath;
  }

  async function listReviews(year = new Date().getFullYear()) {
    const settings = await getSettings();
    if (!settings.reviewDirectory) return [];
    const directory = resolveDirectoryTemplate(settings.reviewDirectory, year);
    let names;
    try {
      names = await fs.readdir(directory);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
    const pdfNames = names.filter((name) => name.toLowerCase().endsWith(REVIEW_FILE_SUFFIX));
    const pdfCodes = new Set(pdfNames.map((name) => name.slice(0, -REVIEW_FILE_SUFFIX.length).toUpperCase()));
    const legacyNames = names.filter((name) => name.toLowerCase().endsWith(LEGACY_REVIEW_FILE_SUFFIX)
      && !pdfCodes.has(name.slice(0, -LEGACY_REVIEW_FILE_SUFFIX.length).toUpperCase()));
    const reviews = await Promise.all([...pdfNames, ...legacyNames]
      .map(async (name) => {
        try {
          const filePath = path.join(directory, name);
          const review = name.toLowerCase().endsWith(REVIEW_FILE_SUFFIX)
            ? await extractReviewPackageFromPdf(await fs.readFile(filePath))
            : JSON.parse(await fs.readFile(filePath, 'utf8'));
          return reviewSummary(review);
        } catch (error) {
          if (error.code !== NOT_EDITABLE_REVIEW_PDF) {
            console.error(`No se pudo leer ${name}:`, error.message);
          }
          return null;
        }
      }));
    return reviews.filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  return { getSettings, saveSettings, getReview, saveReview, listReviews };
}

export function buildReviewPath(template, orderCode) {
  return path.join(resolveDirectoryTemplate(template, orderCode), reviewFilename(orderCode));
}

export async function extractReviewPackageFromPdf(buffer) {
  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const document = await loadingTask.promise;
  try {
    const attachments = await document.getAttachments();
    const entries = attachments instanceof Map ? [...attachments.entries()] : Object.entries(attachments || {});
    const match = entries.find(([, item]) => String(item.filename || '').toLowerCase().endsWith(LEGACY_REVIEW_FILE_SUFFIX));
    const content = match ? (match[1].content || await document.getAttachmentContent(match[0])) : null;
    if (!content) {
      const error = new Error('El PDF no contiene los datos editables del pedido.');
      error.code = NOT_EDITABLE_REVIEW_PDF;
      throw error;
    }
    const review = JSON.parse(Buffer.from(content).toString('utf8'));
    if (review?.kind !== 'toldos-testar-review' || !review?.orderCode || !review?.order) {
      throw new Error('Los datos editables incrustados en el PDF no son válidos.');
    }
    return review;
  } finally {
    await loadingTask.destroy();
  }
}

export async function fileExists(target) {
  return fs.access(target).then(() => true, () => false);
}

export async function writeFileAtomic(targetPath, contents) {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmpPath, contents);
  try {
    await fs.rename(tmpPath, targetPath);
  } catch (error) {
    await fs.unlink(tmpPath).catch(() => {});
    throw error;
  }
}

async function writeJsonAtomic(targetPath, value) {
  await writeFileAtomic(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}

function buildLegacyReviewPath(template, orderCode) {
  return path.join(resolveDirectoryTemplate(template, orderCode), `${sanitizeOrderCode(orderCode)}${LEGACY_REVIEW_FILE_SUFFIX}`);
}

function cleanPath(value) {
  const clean = String(value || '').trim().replace(/\{(\d{4})\}/g, '$1');
  if (!clean) return '';
  const root = path.win32.parse(clean.replaceAll('{YYYY}', '2026')).root;
  if (root && clean.length <= root.length) return clean;
  return clean.replace(/[\\/]+$/, '');
}

function cleanText(value) {
  return String(value || '').trim();
}

function isAbsolutePathTemplate(value) {
  const sample = value.replaceAll('{YYYY}', '2026');
  return path.isAbsolute(sample) || path.win32.isAbsolute(sample);
}
