import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
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
    rpsUploadDirectory: seed.rpsUploadDirectory || seed.exportDirectory || '',
    rpsPlanteamientosDirectory: seed.rpsPlanteamientosDirectory || inferRpsPlanteamientosDirectory(seed.rpsUploadDirectory)
  };
}

export function normalizeWorkflowSettings(input, current = defaultWorkflowSettings()) {
  const settings = {
    schemaVersion: 1,
    productionEnabled: input?.productionEnabled === true,
    reviewDirectory: cleanPath(input?.reviewDirectory ?? current.reviewDirectory),
    planteamientosDirectory: cleanPath(input?.planteamientosDirectory ?? current.planteamientosDirectory),
    rpsUploadDirectory: cleanPath(input?.rpsUploadDirectory ?? current.rpsUploadDirectory),
    rpsPlanteamientosDirectory: cleanPath(input?.rpsPlanteamientosDirectory ?? current.rpsPlanteamientosDirectory)
  };

  for (const [label, value] of [
    ['carpeta de revisión', settings.reviewDirectory],
    ['carpeta de planteamientos', settings.planteamientosDirectory],
    ['carpeta de subida de material', settings.rpsUploadDirectory],
    ['archivo histórico de planteamientos de RPS', settings.rpsPlanteamientosDirectory]
  ]) {
    if (value && !isAbsolutePathTemplate(value)) {
      throw new Error(`La ${label} debe ser una ruta absoluta válida en el sistema del servidor.`);
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

export async function checkWorkflowDirectories(input, { year = new Date().getFullYear() } = {}) {
  const settings = normalizeWorkflowSettings(input);
  const definitions = [
    ['reviewDirectory', 'Pedidos para revisión', settings.reviewDirectory, 'write'],
    ['planteamientosDirectory', 'Planteamientos generados', settings.planteamientosDirectory, 'write'],
    ['rpsUploadDirectory', 'Subida de material', settings.rpsUploadDirectory, 'write']
  ];
  if (settings.rpsPlanteamientosDirectory) {
    definitions.push(['rpsPlanteamientosDirectory', 'Histórico de planteamientos RPS', settings.rpsPlanteamientosDirectory, 'read']);
  }
  const directories = await Promise.all(definitions.map(async ([key, label, template, accessMode]) => {
    if (!template) return { key, label, path: '', ok: false, error: 'Falta indicar la ruta.' };
    const directory = resolveDirectoryTemplate(template, year);
    const probePath = path.join(directory, `.toldos-write-check-${randomUUID()}.tmp`);
    let probeCreated = false;
    try {
      const stat = await fs.stat(directory);
      if (!stat.isDirectory()) throw new Error('La ruta no es una carpeta.');
      if (accessMode === 'read') {
        await fs.access(directory, 4);
        return { key, label, path: directory, ok: true, error: '' };
      }
      await fs.writeFile(probePath, '', { flag: 'wx' });
      probeCreated = true;
      await fs.unlink(probePath);
      probeCreated = false;
      return { key, label, path: directory, ok: true, error: '' };
    } catch (error) {
      return { key, label, path: directory, ok: false, error: directoryCheckError(error) };
    } finally {
      if (probeCreated) await fs.unlink(probePath).catch(() => {});
    }
  }));
  return {
    checkedAt: new Date().toISOString(),
    ok: directories.every((item) => item.ok),
    directories
  };
}

function directoryCheckError(error) {
  if (error?.code === 'ENOENT') return 'La carpeta no existe o no está accesible.';
  if (error?.code === 'EACCES' || error?.code === 'EPERM') return 'El servidor no tiene permiso de escritura.';
  return error instanceof Error ? error.message : 'No se pudo comprobar la carpeta.';
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

export function markReviewApproved(review, { reviewer, note = '', now = new Date().toISOString() }) {
  return {
    ...review,
    status: 'APPROVED',
    updatedAt: now,
    reviewedAt: now,
    reviewedBy: cleanText(reviewer),
    reviewNote: cleanText(note),
    production: null
  };
}

export function markReviewFilesGenerated(review, { generatedBy = '', files, excludedNonAcrylicFabrics = [], now = new Date().toISOString() }) {
  return {
    ...review,
    status: 'PRODUCED',
    updatedAt: now,
    production: {
      createdAt: now,
      createdBy: cleanText(generatedBy),
      files,
      excludedNonAcrylicFabrics: structuredClone(excludedNonAcrylicFabrics)
    }
  };
}

export const markReviewProduced = markReviewFilesGenerated;

export function resolveGeneratedReviewFiles(review, settings, fileIndex) {
  const index = Number(fileIndex);
  if (review?.status !== 'PRODUCED' || !Number.isInteger(index) || index < 0) {
    throw new Error('El archivo generado solicitado no es válido.');
  }

  const file = review.production?.files?.[index];
  const filename = cleanText(file?.filename);
  if (!file || !filename || path.basename(filename) !== filename) {
    throw new Error('El archivo generado solicitado no es válido.');
  }

  const directoryTemplate = file.type === 'pdf'
    ? settings?.planteamientosDirectory
    : file.type === 'rps'
      ? settings?.rpsUploadDirectory
      : '';
  if (!directoryTemplate) throw new Error('La carpeta del archivo generado no está configurada.');

  const original = {
    ...file,
    filename,
    source: 'original',
    savedPath: path.join(resolveDirectoryTemplate(directoryTemplate, review.orderCode), filename)
  };
  if (file.type === 'rps') {
    return [
      original,
      { ...original, source: 'processed', savedPath: path.join(resolveDirectoryTemplate(directoryTemplate, review.orderCode), 'procesados', filename) }
    ];
  }

  const historicalTemplate = settings?.rpsPlanteamientosDirectory;
  return historicalTemplate
    ? [original, {
      ...original,
      source: 'rps-archive',
      savedPath: path.join(
        resolveDirectoryTemplate(historicalTemplate, review.orderCode),
        rpsPlanteamientoFilename(review.orderCode, filename)
      )
    }]
    : [original];
}

export function resolveGeneratedReviewFile(review, settings, fileIndex) {
  return resolveGeneratedReviewFiles(review, settings, fileIndex)[0];
}

export function rpsPlanteamientoFilename(orderCode, filename) {
  const compact = sanitizeOrderCode(orderCode);
  const match = /^([A-Z]+)(\d{2})(\d+)$/.exec(compact);
  if (!match) return filename;
  const suffix = filename.toUpperCase().startsWith(compact)
    ? filename.slice(compact.length)
    : '-1.pdf';
  return `${match[1]}.${match[2]}.${match[3].padStart(5, '0')}${suffix}`;
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
  const root = path.parse(clean.replaceAll('{YYYY}', '2026')).root;
  if (root && clean.length <= root.length) return clean;
  return clean.replace(/[\\/]+$/, '');
}

function inferRpsPlanteamientosDirectory(rpsUploadDirectory) {
  const match = /^(\\\\[^\\]+)\\/.exec(String(rpsUploadDirectory || '').trim());
  return match ? path.join(match[1], 'RPS', 'VENTAS', 'PLANTEAMIENTOS', '{YYYY}') : '';
}

function cleanText(value) {
  return String(value || '').trim();
}

export function isAbsolutePathTemplate(value, platform = process.platform) {
  const sample = String(value || '').replaceAll('{YYYY}', '2026');
  if (platform !== 'win32') {
    const looksLikeWindowsPath = /^[a-z]:[\\/]/i.test(sample) || sample.startsWith('\\\\') || sample.startsWith('//');
    if (looksLikeWindowsPath) return false;
    return path.posix.isAbsolute(sample);
  }
  return path.win32.isAbsolute(sample);
}
