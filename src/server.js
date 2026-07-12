import compression from 'compression';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { getCatalog } from './domain/catalog.js';
import { buildOrderPlanteamientoPdf } from './domain/planteamientoPdf.js';
import { calculateOrder } from './domain/rules.js';
import { buildOfWorkbook, buildOrderArchiveWorkbook, buildReservationWorkbook } from './domain/reservationWorkbook.js';
import { normalizeOrder, normalizeReservation } from './domain/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const isProduction = process.env.NODE_ENV === 'production';

const app = express();

app.use(compression());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'toldos-testar',
    exportDirectoryConfigured: Boolean(config.exportDirectory),
    orderArchiveRootConfigured: Boolean(config.orderArchiveRoot)
  });
});

app.get('/api/catalog', (_req, res) => {
  res.json(getCatalog());
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
    const reservation = normalizeReservation(req.body);
    const workbook = await buildReservationWorkbook(reservation);
    const filename = buildFilename(reservation);

    res
      .status(200)
      .setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .send(workbook);
  } catch (error) {
    next(error);
  }
});

app.post('/api/export/save', async (req, res, next) => {
  try {
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

const server = app.listen(config.port, () => {
  console.log(`Toldos Testar disponible en http://localhost:${config.port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${config.port} ya está en uso.`);
  } else {
    console.error('Error al iniciar el servidor:', error.message);
  }
  process.exit(1);
});

function buildFilename(reservation) {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const suffix = reservation.orderCode || reservation.ofs.map((item) => item.of).join('-');
  return `reserva-toldos-${sanitize(suffix)}-${stamp}.xlsx`;
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

async function fileExists(target) {
  return fs.access(target).then(() => true, () => false);
}

async function writeFileAtomic(targetPath, buffer) {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;

  await fs.writeFile(tmpPath, buffer);
  try {
    await fs.rename(tmpPath, targetPath);
  } catch (error) {
    await fs.unlink(tmpPath).catch(() => {});
    throw error;
  }
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

function sanitizeOrderCode(value) {
  const clean = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '');

  if (!clean) {
    throw new Error('El número de pedido no es válido.');
  }

  return clean.slice(0, 80);
}

function getOrderYear(orderCode) {
  const match = /^[A-Z]+(\d{2})/.exec(orderCode);
  if (!match) return null;
  return 2000 + Number(match[1]);
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
