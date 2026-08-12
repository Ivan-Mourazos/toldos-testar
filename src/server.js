import compression from 'compression';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { getCatalog } from './domain/catalog.js';
import { searchStaticFabrics } from './domain/fabricCatalog.js';
import { buildOrderPlanteamientoPdf } from './domain/planteamientoPdf.js';
import { buildOrderReviewPdf } from './domain/reviewPdf.js';
import { calculateOrder } from './domain/rules.js';
import { buildOrderAutofill } from './domain/orderAutofill.js';
import { buildOfWorkbook, buildOrderArchiveWorkbook, buildReservationWorkbook } from './domain/reservationWorkbook.js';
import { excludeFabricCodes, findNonAcrylicReservationFabrics } from './domain/reservationFabrics.js';
import { normalizeOrder, normalizeReservation } from './domain/validation.js';
import {
  applyDeploymentFeaturesToCatalog,
  assertDeploymentModelsEnabled,
  assertLegacyExportsEnabled
} from './deploymentFeatures.js';
import { closeRpsCatalog, getRpsOrder, searchRpsFabrics } from './rpsCatalog.js';
import {
  createReviewPackage,
  createWorkflowStore,
  defaultWorkflowSettings,
  fileExists,
  getOrderYear,
  markReviewChangesRequested,
  markReviewProduced,
  resolveDirectoryTemplate,
  sanitizeOrderCode,
  workflowReadiness,
  writeFileAtomic
} from './workflow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const isProduction = process.env.NODE_ENV === 'production';
const workflowStore = createWorkflowStore({
  settingsFile: config.workflowSettingsFile,
  defaults: defaultWorkflowSettings({
    fileWritesEnabled: config.fileWritesEnabled,
    exportDirectory: config.exportDirectory,
    orderArchiveRoot: config.orderArchiveRoot,
    reviewDirectory: config.reviewDirectory,
    planteamientosDirectory: config.planteamientosDirectory,
    rpsUploadDirectory: config.rpsUploadDirectory
  })
});
const deploymentFeatures = {
  heraEnabled: config.heraEnabled,
  legacyExportsEnabled: config.legacyExportsEnabled
};

const app = express();

app.use(compression());
app.use(express.json({ limit: '2mb' }));

app.use('/api', (req, _res, next) => {
  try {
    assertDeploymentModelsEnabled(req.body, deploymentFeatures);
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.get('/api/health', async (_req, res, next) => {
  try {
    const settings = await workflowStore.getSettings();
    const readiness = workflowReadiness(settings);
  res.json({
    ok: true,
    app: 'toldos-testar',
      simulationMode: !readiness.productionReady,
      fileWritesEnabled: settings.productionEnabled,
      reviewReady: readiness.reviewReady,
      productionReady: readiness.productionReady
  });
  } catch (error) {
    next(error);
  }
});

app.get('/api/catalog', (_req, res) => {
  res.json(applyDeploymentFeaturesToCatalog(getCatalog(), deploymentFeatures));
});

app.get('/api/catalog/fabrics', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const limit = Number(req.query.limit) || 30;
  try {
    const items = await searchRpsFabrics({ query, limit });
    res.json({ source: 'RPSNext', items });
  } catch (error) {
    console.error('RPSNext no disponible para telas:', error.message);
    res.json({ source: 'Excel local', items: searchStaticFabrics(query, limit) });
  }
});

app.get('/api/orders/:orderCode/autofill', async (req, res, next) => {
  try {
    const orderCode = String(req.params.orderCode || '').trim();
    if (!orderCode) return res.status(400).json({ error: 'Indica un número de pedido.' });
    const source = await getRpsOrder(orderCode);
    if (!source) return res.status(404).json({ error: `El pedido ${orderCode} no existe en RPSNext.` });
    return res.json(buildOrderAutofill(source));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/calculate', (req, res, next) => {
  try {
    res.json(calculateOrder(req.body));
  } catch (error) {
    next(error);
  }
});

app.post('/api/export', async (req, res, next) => {
  try {
    assertLegacyExportsEnabled(deploymentFeatures);
    const reservation = normalizeReservation(req.body);
    const workbook = await buildReservationWorkbook(reservation);
    const filename = buildFilename(reservation);

    res
      .status(200)
      .setHeader('Content-Type', 'application/vnd.ms-excel; charset=windows-1252')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(workbook);
  } catch (error) {
    next(error);
  }
});

app.post('/api/planteamiento', async (req, res, next) => {
  try {
    const order = normalizeOrder(req.body?.order || req.body);
    const calculation = calculateOrder(order);
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation });
    const filename = `${order.orderCode ? sanitizeOrderCode(order.orderCode) : 'PLANTEAMIENTO'}-1.pdf`;

    res
      .status(200)
      .setHeader('Cache-Control', 'no-store')
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdf);
  } catch (error) {
    next(error);
  }
});

app.post('/api/review-pdf', async (req, res, next) => {
  try {
    const rawOrder = req.body?.order || req.body;
    const normalizedOrder = normalizeOrder(rawOrder);
    const orderCode = normalizedOrder.orderCode ? sanitizeOrderCode(normalizedOrder.orderCode) : 'PEDIDO';
    const order = structuredClone({ ...rawOrder, orderCode });
    const calculation = calculateOrder(order);
    const review = createReviewPackage({ order, calculation });
    const pdf = await buildOrderReviewPdf({ order, calculation, review });
    const filename = `${orderCode}.pdf`;

    res
      .status(200)
      .setHeader('Cache-Control', 'no-store')
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdf);
  } catch (error) {
    next(error);
  }
});

app.get('/api/workflow/settings', async (_req, res, next) => {
  try {
    const settings = await workflowStore.getSettings();
    res.json({ settings, readiness: workflowReadiness(settings) });
  } catch (error) {
    next(error);
  }
});

app.put('/api/workflow/settings', async (req, res, next) => {
  try {
    const settings = await workflowStore.saveSettings(req.body);
    res.json({ settings, readiness: workflowReadiness(settings) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/reviews', async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    if (year < 2000 || year > 2100) throw new Error('El año de revisión no es válido.');
    res.json({ year, reviews: await workflowStore.listReviews(year) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/reviews/:orderCode', async (req, res, next) => {
  try {
    res.json(await workflowStore.getReview(req.params.orderCode));
  } catch (error) {
    if (error.code === 'ENOENT') return next(httpError(404, 'No se encontró el pedido de revisión.'));
    next(error);
  }
});

app.post('/api/reviews', async (req, res, next) => {
  try {
    const rawOrder = req.body?.order || req.body;
    const normalizedOrder = normalizeOrder(rawOrder);
    const orderCode = sanitizeOrderCode(normalizedOrder.orderCode);
    const order = structuredClone({ ...rawOrder, orderCode });
    const calculation = calculateOrder(order);
    let existing = null;
    try {
      existing = await workflowStore.getReview(orderCode);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    if (existing && req.body?.confirmOverwrite !== true) {
      res.status(409).json({
        needsConfirmation: true,
        existing: [`${orderCode}.pdf`],
        error: 'Este pedido ya existe en la bandeja de revisión.'
      });
      return;
    }

    const review = createReviewPackage({ order, calculation, existing });
    const pdf = await buildOrderReviewPdf({ order, calculation, review });
    const savedPath = await workflowStore.saveReview(review, pdf);
    res.json({ ok: true, review, savedPath, overwritten: Boolean(existing) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/reviews/:orderCode/request-changes', async (req, res, next) => {
  try {
    const review = await workflowStore.getReview(req.params.orderCode);
    const reviewer = String(req.body?.reviewer || '').trim();
    const note = String(req.body?.note || '').trim();
    if (!reviewer) throw new Error('Indica quién realiza la revisión.');
    if (!note) throw new Error('Describe los cambios que hay que realizar.');
    const updated = markReviewChangesRequested(review, { reviewer, note });
    const calculation = calculateOrder(updated.order);
    const pdf = await buildOrderReviewPdf({ order: updated.order, calculation, review: updated });
    await workflowStore.saveReview(updated, pdf);
    res.json({ ok: true, review: updated });
  } catch (error) {
    if (error.code === 'ENOENT') return next(httpError(404, 'No se encontró el pedido de revisión.'));
    next(error);
  }
});

app.post('/api/reviews/:orderCode/approve', async (req, res, next) => {
  try {
    const settings = await workflowStore.getSettings();
    const readiness = workflowReadiness(settings);
    if (!readiness.productionReady) {
      throw httpError(403, readiness.missing.length
        ? `Producción no configurada: ${readiness.missing.join(', ')}.`
        : 'Activa el envío a producción en Configuración.');
    }

    const review = await workflowStore.getReview(req.params.orderCode);
    const reviewer = String(req.body?.reviewer || '').trim();
    if (!reviewer) throw new Error('Indica quién aprueba el pedido.');

    const order = normalizeOrder(review.order);
    assertDeploymentModelsEnabled(order, deploymentFeatures);
    const calculation = calculateOrder(order);
    const blockingDiagnostics = calculation.diagnostics.filter((item) => item.level === 'error' || item.level === 'pending');
    if (calculation.ofs.length !== order.awnings.length || blockingDiagnostics.length > 0) {
      throw new Error('El pedido tiene toldos incompletos o diagnósticos bloqueantes. Ábrelo y corrígelo antes de aprobar.');
    }
    const nonAcrylicFabrics = findNonAcrylicReservationFabrics(order, calculation);
    const hasNonAcrylicDecision = typeof req.body?.includeNonAcrylicFabrics === 'boolean';
    if (nonAcrylicFabrics.length > 0 && !hasNonAcrylicDecision) {
      res.status(409).json({
        needsFabricConfirmation: true,
        fabrics: nonAcrylicFabrics
      });
      return;
    }

    let reservation = normalizeReservation({ orderCode: order.orderCode, ofs: calculation.ofs });
    const excludedNonAcrylicFabrics = nonAcrylicFabrics.length > 0 && req.body.includeNonAcrylicFabrics === false
      ? nonAcrylicFabrics
      : [];
    if (excludedNonAcrylicFabrics.length > 0) {
      reservation = excludeFabricCodes(reservation, excludedNonAcrylicFabrics);
    }
    const cleanOrder = sanitizeOrderCode(order.orderCode);
    const rpsDirectory = resolveDirectoryTemplate(settings.rpsUploadDirectory, cleanOrder);
    const pdfDirectory = resolveDirectoryTemplate(settings.planteamientosDirectory, cleanOrder);
    const targets = reservation.ofs.map((ofBlock) => ({
      type: 'rps',
      of: ofBlock.of,
      filename: `${sanitizeOf(ofBlock.of)}.xls`,
      savedPath: path.join(rpsDirectory, `${sanitizeOf(ofBlock.of)}.xls`),
      build: () => buildOfWorkbook(ofBlock)
    }));
    const duplicated = findDuplicatedFilenames(targets);
    if (duplicated.length > 0) throw new Error(`Hay OFs duplicadas en la reserva: ${duplicated.join(', ')}.`);
    targets.push({
      type: 'pdf',
      filename: `${cleanOrder}-1.pdf`,
      savedPath: path.join(pdfDirectory, `${cleanOrder}-1.pdf`),
      build: () => buildOrderPlanteamientoPdf({ order, calculation })
    });

    await Promise.all(targets.map(async (target) => {
      target.contents = await target.build();
      target.exists = await fileExists(target.savedPath);
    }));
    const existing = targets.filter((target) => target.exists).map((target) => target.filename);
    if (existing.length > 0 && req.body?.confirmOverwrite !== true) {
      res.status(409).json({ needsConfirmation: true, existing });
      return;
    }

    await Promise.all([fs.mkdir(rpsDirectory, { recursive: true }), fs.mkdir(pdfDirectory, { recursive: true })]);
    const saved = [];
    for (const target of targets) {
      await writeFileAtomic(target.savedPath, target.contents);
      saved.push({ type: target.type, of: target.of, filename: target.filename, savedPath: target.savedPath, overwritten: target.exists });
    }

    const updated = markReviewProduced(review, {
      reviewer,
      note: req.body?.note,
      files: saved.map(({ type, of, filename, savedPath }) => ({ type, of, filename, savedPath }))
    });
    const reviewPdf = await buildOrderReviewPdf({ order: updated.order, calculation, review: updated });
    await workflowStore.saveReview(updated, reviewPdf);
    res.json({ ok: true, review: updated, saved, excludedNonAcrylicFabrics });
  } catch (error) {
    if (error.code === 'ENOENT') return next(httpError(404, 'No se encontró el pedido de revisión.'));
    next(error);
  }
});

app.post('/api/export/save', async (req, res, next) => {
  try {
    assertLegacyExportsEnabled(deploymentFeatures);
    if (!config.fileWritesEnabled) {
      res.status(403).json({
        error: 'Modo de simulación activo: el guardado de reservas y archivos compartidos está deshabilitado.'
      });
      return;
    }

    if (!config.exportDirectory) {
      res.status(400).json({
        error: 'No hay carpeta de guardado configurada. Define EXPORT_DIRECTORY en .env.'
      });
      return;
    }

    const reservation = normalizeReservation(req.body?.reservation || req.body);
    const orderPayload = req.body?.order ? normalizeOrder(req.body.order) : null;
    const confirmOverwrite = req.body?.confirmOverwrite === true;
    const targets = reservation.ofs.map((ofBlock) => {
      const filename = `${sanitizeOf(ofBlock.of)}.xls`;
      return {
        ofBlock,
        of: ofBlock.of,
        filename,
        savedPath: path.join(config.exportDirectory, filename)
      };
    });
    const duplicated = findDuplicatedFilenames(targets);

    if (duplicated.length > 0) {
      res.status(400).json({
        error: `Hay OFs duplicadas en la reserva: ${duplicated.join(', ')}.`
      });
      return;
    }

    await Promise.all(targets.map(async (target) => {
      target.workbook = await buildOfWorkbook(target.ofBlock);
    }));

    let archiveTarget = null;
    if (config.orderArchiveRoot && reservation.orderCode) {
      archiveTarget = {
        savedPath: buildOrderArchivePath(reservation.orderCode),
        workbook: await buildOrderArchiveWorkbook(reservation, orderPayload)
      };
      archiveTarget.filename = path.basename(archiveTarget.savedPath);
    }

    let planteamientoTarget = null;
    if (orderPayload && reservation.orderCode) {
      if (!config.orderArchiveRoot) {
        res.status(400).json({
          error: 'No hay carpeta raíz de archivo configurada. Define ORDER_ARCHIVE_ROOT en .env.'
        });
        return;
      }

      const calculation = calculateOrder(orderPayload);
      planteamientoTarget = {
        savedPath: buildPlanteamientoPath(reservation.orderCode),
        workbook: await buildOrderPlanteamientoPdf({ order: orderPayload, calculation })
      };
      planteamientoTarget.filename = path.basename(planteamientoTarget.savedPath);
    }

    await fs.mkdir(config.exportDirectory, { recursive: true });

    const existing = await Promise.all(targets.map(async (target) => {
      target.exists = await fileExists(target.savedPath);
      return target.exists ? target.filename : null;
    })).then((filenames) => filenames.filter(Boolean));

    if (archiveTarget) {
      archiveTarget.exists = await fileExists(archiveTarget.savedPath);
      if (archiveTarget.exists) existing.push(`${archiveTarget.filename} (archivo de pedido)`);
    }

    if (planteamientoTarget) {
      planteamientoTarget.exists = await fileExists(planteamientoTarget.savedPath);
      if (planteamientoTarget.exists) existing.push(`${planteamientoTarget.filename} (planteamiento)`);
    }

    if (existing.length > 0 && !confirmOverwrite) {
      res.status(409).json({ needsConfirmation: true, existing });
      return;
    }

    const saveResults = await Promise.allSettled(
      targets.map(async (target) => {
        await writeFileAtomic(target.savedPath, target.workbook);
        return {
          of: target.of,
          filename: target.filename,
          savedPath: target.savedPath,
          overwritten: Boolean(target.exists)
        };
      })
    );

    const saved = saveResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const failedIndex = saveResults.findIndex((result) => result.status === 'rejected');
    if (failedIndex !== -1) {
      console.error(saveResults[failedIndex].reason);
      throw httpError(500, buildPartialSaveMessage(targets[failedIndex].filename, saved));
    }

    let orderArchive = null;
    if (archiveTarget) {
      try {
        await fs.mkdir(path.dirname(archiveTarget.savedPath), { recursive: true });
        await writeFileAtomic(archiveTarget.savedPath, archiveTarget.workbook);
      } catch (error) {
        console.error(error);
        throw httpError(
          500,
          `Las reservas de OF se guardaron, pero no se pudo escribir el archivo de pedido ${archiveTarget.filename}. Revisa la carpeta de archivo.`
        );
      }
      orderArchive = {
        filename: archiveTarget.filename,
        savedPath: archiveTarget.savedPath,
        overwritten: Boolean(archiveTarget.exists)
      };
    }

    let planteamiento = null;
    if (planteamientoTarget) {
      try {
        await fs.mkdir(path.dirname(planteamientoTarget.savedPath), { recursive: true });
        await writeFileAtomic(planteamientoTarget.savedPath, planteamientoTarget.workbook);
      } catch (error) {
        console.error(error);
        throw httpError(
          500,
          `Las reservas se guardaron, pero no se pudo escribir el planteamiento ${planteamientoTarget.filename}. Revisa la carpeta de TOLDOS.`
        );
      }
      planteamiento = {
        filename: planteamientoTarget.filename,
        savedPath: planteamientoTarget.savedPath,
        overwritten: Boolean(planteamientoTarget.exists)
      };
    }

    res.json({ ok: true, saved, orderArchive, planteamiento });
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta de API no disponible.' });
});

await configureFrontend();

app.use((error, _req, res, _next) => {
  const status = error.statusCode || 400;
  res.status(status).json({ error: error.message || 'No se pudo completar la operación.' });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`Toldos Testar disponible en http://${config.host}:${config.port}`);
  process.send?.('ready');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${config.port} ya está en uso.`);
  } else {
    console.error('Error al iniciar el servidor:', error.message);
  }
  process.exit(1);
});

let shutdownStarted = false;

async function shutdown(signal) {
  if (shutdownStarted) return;
  shutdownStarted = true;
  console.log(`${signal} recibido: cerrando Toldos Testar…`);

  const forceTimer = setTimeout(() => {
    console.error('El cierre ordenado superó 12 segundos; se fuerza la salida.');
    server.closeAllConnections?.();
    process.exit(1);
  }, 12_000);
  forceTimer.unref();

  let exitCode = 0;
  const closeErrors = [];
  try {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  } catch (error) {
    closeErrors.push(error);
  }

  try {
    await closeRpsCatalog();
  } catch (error) {
    closeErrors.push(error);
  }

  try {
    if (closeErrors.length > 0) throw new AggregateError(closeErrors, 'Falló el cierre de uno o más recursos.');
    console.log('Servidor HTTP y conexión RPS cerrados correctamente.');
  } catch (error) {
    exitCode = 1;
    console.error('No se pudo completar el cierre ordenado:', error.message);
  } finally {
    if (exitCode === 0) clearTimeout(forceTimer);
    else server.closeAllConnections?.();
    process.exitCode = exitCode;
  }
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

function buildFilename(reservation) {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const suffix = reservation.orderCode || reservation.ofs.map((item) => item.of).join('-');
  return `reserva-toldos-${sanitize(suffix)}-${stamp}.xls`;
}

function sanitize(value) {
  return String(value || 'rps')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'rps';
}

function sanitizeOf(value) {
  const clean = String(value || '')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '');

  if (!clean) {
    throw new Error('Hay una OF sin número válido.');
  }

  return clean.slice(0, 80);
}

function findDuplicatedFilenames(targets) {
  const seen = new Set();
  const duplicated = new Set();

  for (const target of targets) {
    const key = target.filename.toLowerCase();
    if (seen.has(key)) {
      duplicated.add(target.of);
    }
    seen.add(key);
  }

  return Array.from(duplicated);
}

function httpError(status, message) {
  const error = new Error(message);
  error.statusCode = status;
  return error;
}

function buildPartialSaveMessage(failedFilename, saved) {
  const savedList = saved.map((item) => item.filename).join(', ');
  return saved.length > 0
    ? `No se pudo guardar ${failedFilename}. Sí se guardaron: ${savedList}. Revisa la carpeta compartida y vuelve a generar.`
    : `No se pudo guardar ${failedFilename}. Revisa el acceso a la carpeta compartida.`;
}

function buildOrderArchivePath(orderCode) {
  const cleanOrder = sanitizeOrderCode(orderCode);
  const year = getOrderYear(cleanOrder);

  if (!year) {
    throw new Error('No pude determinar el año desde el número de pedido.');
  }

  return path.join(config.orderArchiveRoot, String(year), 'Reserva Materiales', `M.${cleanOrder}.xlsx`);
}

function buildPlanteamientoPath(orderCode) {
  const cleanOrder = sanitizeOrderCode(orderCode);
  const year = getOrderYear(cleanOrder);

  if (!year) {
    throw new Error('No pude determinar el año desde el número de pedido.');
  }

  return path.join(config.orderArchiveRoot, String(year), 'TOLDOS', `${cleanOrder}-1.pdf`);
}

function serveDistFolder() {
  app.use(express.static(distDir, { index: false, maxAge: '1y', immutable: true }));
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html')) {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
      return;
    }
    next();
  });
}

async function configureFrontend() {
  if (isProduction) {
    try {
      await fs.access(path.join(distDir, 'index.html'));
    } catch {
      throw new Error('Falta dist/index.html. Ejecuta `pnpm build` antes de iniciar la aplicación en producción.');
    }
    serveDistFolder();
    return;
  }

  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
}
