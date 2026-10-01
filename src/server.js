import compression from 'compression';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { createCoordinaClient } from './coordinaStatus.js';
import { awningLetter } from './domain/awningCompleteness.js';
import { getCatalog } from './domain/catalog.js';
import { searchStaticFabrics } from './domain/fabricCatalog.js';
import { buildOrderPlanteamientoPdf } from './domain/planteamientoPdf.js';
import { buildOrderReviewPdf } from './domain/reviewPdf.js';
import { calculateOrder } from './domain/rules.js';
import { verifyStructureArticles } from './domain/structureEdits.js';
import { buildOrderAutofill } from './domain/orderAutofill.js';
import { attachFabricProposals } from './domain/autofillFabricHint.js';
import { buildOfWorkbook, buildOrderArchiveWorkbook, buildReservationWorkbook } from './domain/reservationWorkbook.js';
import { excludeFabricCodes, findNonAcrylicReservationFabrics } from './domain/reservationFabrics.js';
import { normalizeOrder, normalizeReservation } from './domain/validation.js';
import { formOptions } from './domain/modelBehavior.js';
import { createRuleParametersStore } from './ruleParametersStore.js';
import { createRemolquesParametersStore } from './remolquesParametersStore.js';
import { getMaterialesConOrigen } from './remolques/materiales.ts';
import { pedidoRpsPorNumero } from './remolques/rps/pedido-rps.ts';
import { materialPreferidoRps } from './remolques/rps/material-rps.ts';
import { ErrorPedidoHoja, prepararPedidoHoja } from './remolques/hoja/pedido.ts';
import { crearAlmacenFichas } from './remolques/salida/fichas.ts';
import { crearServicioPdf, ErrorSalidaPdf } from './remolques/salida/navegador.ts';
import { nombrePdf } from './remolques/salida/nombre-pdf.ts';
import { crearAlmacenPedidosRemolques } from './remolques/flujo/almacen.ts';
import { ErrorPedidoRemolques } from './remolques/flujo/pedido.ts';
import {
  comprobadorPedidoToldos, crearServicioPedidosRemolques, mensajePedidoDeRemolques, paramsDeLaPantalla, yaEsPedidoDeRemolques
} from './remolques/flujo/servicio.ts';
import { crearAlmacenBorradores } from './borradores/almacen.ts';
import { crearServicioBorradores } from './borradores/servicio.ts';
import {
  applyDeploymentFeaturesToCatalog,
  assertDeploymentModelsEnabled,
  assertLegacyExportsEnabled
} from './deploymentFeatures.js';
import {
  closeRpsCatalog,
  findRpsFabric,
  getRpsOrder,
  queryRpsFabricHistoryRows,
  queryRpsFabricStockRows,
  searchRpsFabrics,
  searchRpsArticles,
  getRpsArticle
} from './rpsCatalog.js';
import { createFabricHistoryService, createFabricStockService, fabricStockHandler } from './fabricRpsServices.js';
import { preferredFabricCode } from './domain/fabricHistory.js';
import {
  checkWorkflowDirectories,
  createReviewPackage,
  createWorkflowStore,
  defaultWorkflowSettings,
  fileExists,
  getOrderYear,
  markReviewApproved,
  markReviewChangesRequested,
  markReviewFilesGenerated,
  resolveGeneratedReviewFiles,
  resolveDirectoryTemplate,
  sanitizeOrderCode,
  workflowReadiness,
  writeFileAtomic
} from './workflow.js';
import { generateFilesDecision, generationBlock, approvalReviewers, reviewAuthorship, saveReviewDecision, uniqueOfs } from './reviewRules.js';

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
    rpsUploadDirectory: config.rpsUploadDirectory,
    rpsPlanteamientosDirectory: config.rpsPlanteamientosDirectory,
    remolquesPlanteamientosDirectory: config.remolquesPlanteamientosDirectory,
    remolquesOficinaTecnicaDirectory: config.remolquesOficinaTecnicaDirectory,
    remolquesRevisionDirectory: config.remolquesRevisionDirectory,
    draftsDirectory: config.draftsDirectory
  })
});
// Parámetros de cálculo comunes a todos los puestos, con versión e historial.
const ruleParametersStore = createRuleParametersStore({
  file: config.ruleParametersFile,
  historyFile: config.ruleParametersFile.replace(/\.json$/i, '') + '-history.jsonl',
  technicians: formOptions.tecnicos
});
// Remolques usa la misma lista de técnicos que Toldos.
const remolquesParametersStore = createRemolquesParametersStore({ file: config.remolquesParametersFile, technicians: formOptions.tecnicos });
const deploymentFeatures = {
  heraEnabled: config.heraEnabled,
  legacyExportsEnabled: config.legacyExportsEnabled
};

const app = express();
const coordina = createCoordinaClient({ url: config.coordinaUrl, key: config.coordinaClave });
const generationLocks = new Set();
// Hoja de taller de remolques (fase 4): los datos de cada PDF esperan aquí, en memoria y un
// minuto como mucho, a que la página interna los pida una sola vez; Chromium la imprime.
const fichasHojaRemolques = crearAlmacenFichas({ duracionMs: 60_000 });
const servicioPdfRemolques = crearServicioPdf({ urlHoja: urlHojaRemolques });
// Pedidos de remolques (fase 5): un JSON por pedido en la carpeta interna de Configuración y el
// mismo camino que toldos (CoordinaOT aprueba, el autor genera, los dos PDF con sus datos dentro).
// El almacén va aparte porque también lo mira el guardado de toldos: nunca hay pedidos mixtos.
const almacenPedidosRemolques = crearAlmacenPedidosRemolques({
  carpeta: async () => (await workflowStore.getSettings()).remolquesRevisionDirectory
});
const pedidosRemolques = crearServicioPedidosRemolques({
  almacen: almacenPedidosRemolques,
  ajustes: () => workflowStore.getSettings(),
  parametros: () => remolquesParametersStore.get(),
  coordina,
  tecnicos: formOptions.tecnicos,
  hacerPdf: hojaRemolquesPdf,
  // Sin carpeta de toldos configurada no puede haber pedidos de toldos que comprobar.
  esPedidoDeToldos: comprobadorPedidoToldos(workflowStore)
});

// Borradores en el servidor (diseño 01/10/2026): un JSON por número de pedido en la carpeta de
// Configuración (paso 08), de toldos o de remolques. No son pedidos: no cuentan ni van a CoordinaOT.
const borradores = crearServicioBorradores({
  almacen: crearAlmacenBorradores({ carpeta: async () => (await workflowStore.getSettings()).draftsDirectory }),
  tecnicos: formOptions.tecnicos,
  esPedidoDeToldos: comprobadorPedidoToldos(workflowStore),
  esPedidoDeRemolques: (orderCode) => yaEsPedidoDeRemolques(almacenPedidosRemolques, orderCode)
});

app.use(compression());
// La vista previa de la hoja de taller solo recibe un pedido: 1 MB de sobra. Va antes del límite
// general porque el primer express.json que lee el cuerpo es el que manda.
app.use('/api/remolques/pdf', express.json({ limit: '1mb' }));
app.use(express.json({ limit: '20mb' }));

app.use('/api', (req, _res, next) => {
  try {
    assertDeploymentModelsEnabled(req.body, deploymentFeatures);
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/favicon.ico', (_req, res) => res.redirect(308, '/favicon.png'));

// Datos de la web que necesita la barra de arriba (diseño 29/09/2026).
app.get('/api/app-info', (_req, res) => {
  res.set('Cache-Control', 'no-store').json({ remolquesUrl: config.remolquesUrl });
});

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

// Búsqueda de telas con reserva: primero RPS, y si falla, el Excel local. La
// usan tanto el buscador de tela como las propuestas del autorrelleno.
async function searchCatalogFabrics(query, limit) {
  try {
    return { source: 'RPSNext', items: await searchRpsFabrics({ query, limit }) };
  } catch (error) {
    console.error('RPSNext no disponible para telas:', error.message);
    return { source: 'Excel local', items: searchStaticFabrics(query, limit) };
  }
}

app.get('/api/catalog/fabrics', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const limit = Number(req.query.limit) || 30;
  res.json(await searchCatalogFabrics(query, limit));
});

// Stock de las telas elegidas (informe tela-0930): solo lectura de RPS, 60 s en caché.
const fabricStock = createFabricStockService({ loadRows: queryRpsFabricStockRows });
app.get('/api/catalog/fabrics/stock', fabricStockHandler(fabricStock));

// Qué lona se usó antes con la misma frase de RPS, para dejar puesta la más probable.
const fabricHistory = createFabricHistoryService({ loadRows: queryRpsFabricHistoryRows });

app.get('/api/catalog/articles', async (req, res) => {
  try {
    res.json({ source: 'RPSNext', items: await searchRpsArticles({ query: req.query.q, limit: req.query.limit }) });
  } catch (error) {
    console.error('RPSNext no disponible para artículos:', error.message);
    res.status(503).json({ error: 'No se pudo consultar RPS. Reintenta la búsqueda.' });
  }
});

app.get('/api/orders/:orderCode/autofill', async (req, res, next) => {
  try {
    const orderCode = String(req.params.orderCode || '').trim();
    if (!orderCode) return res.status(400).json({ error: 'Indica un número de pedido.' });
    const source = await getRpsOrder(orderCode);
    if (!source) return res.status(404).json({ error: `El pedido ${orderCode} no existe en RPSNext.` });
    const result = buildOrderAutofill(source);
    // Si las propuestas de tela fallan, el pedido se devuelve igual, sin ellas. Sin
    // historial (aún cargando o RPS lento) la tela puesta es la 1.ª del buscador.
    const history = await fabricHistory.getWithin(4000);
    await attachFabricProposals(result, {
      search: async (query, limit) => (await searchCatalogFabrics(query, limit)).items,
      preferredCode: history ? async (query) => preferredFabricCode(history, query) : null,
      findFabric: async (code) => findRpsFabric(code).catch(() => null)
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// Las OF que pertenecen al pedido, para avisar de una tecleada por error. Solo
// lectura y sin SQL propio: reutiliza la consulta del autorrelleno.
app.get('/api/orders/:orderCode/ofs', async (req, res, next) => {
  try {
    const orderCode = String(req.params.orderCode || '').trim();
    if (!orderCode) return res.status(400).json({ error: 'Indica un número de pedido.' });
    const source = await getRpsOrder(orderCode);
    if (!source) return res.status(404).json({ error: `El pedido ${orderCode} no existe en RPSNext.` });
    const ofs = [...new Set((source.lines || [])
      .map((line) => String(line.manufacturingOrder || '').trim())
      .filter(Boolean))];
    return res.json({ orderCode: source.header?.orderCode || orderCode, ofs });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/calculate', async (req, res, next) => {
  try {
    res.json(await calculateConfiguredOrder(req.body));
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
    const calculation = await calculateConfiguredOrder(order);
    // El panel «Despiece y dibujo» pide el pedido entero y un solo toldo, para que salga
    // con su letra.
    const onlyAwningId = typeof req.body?.onlyAwningId === 'string' && req.body.onlyAwningId ? req.body.onlyAwningId : null;
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, onlyAwningId });
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
    const calculation = await calculateConfiguredOrder(order);
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

app.get('/api/rule-parameters', async (_req, res, next) => {
  try {
    res.json(await ruleParametersStore.get());
  } catch (error) {
    next(error);
  }
});

app.put('/api/rule-parameters', async (req, res, next) => {
  try {
    res.json(await ruleParametersStore.save(req.body || {}));
  } catch (error) {
    if (error.code === 'VERSION_CONFLICT') {
      res.status(409).json({ error: error.message, current: error.current });
      return;
    }
    if (error.code === 'INVALID_INPUT') {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

app.get('/api/rule-parameters/history', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    res.json({ entries: await ruleParametersStore.history(limit) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/workflow/check-directories', async (req, res, next) => {
  try {
    res.json(await checkWorkflowDirectories(req.body?.settings || req.body));
  } catch (error) {
    next(error);
  }
});

// Remolques (fase 2a, solo lectura). Cuerpos y códigos son los de las rutas de
// Remolques-TGM (api/materiales, api/rps/pedido, api/parametros); lo único añadido
// es `origen` en materiales, para poder avisar si RPS no ha respondido.
app.get('/api/remolques/materiales', async (_req, res, next) => {
  try {
    res.json(await getMaterialesConOrigen());
  } catch (error) {
    next(error);
  }
});

app.get('/api/remolques/rps-pedido', async (req, res) => {
  try {
    const numero = typeof req.query.numero === 'string' ? req.query.numero : '';
    const [pedido, { materiales }] = await Promise.all([pedidoRpsPorNumero(numero), getMaterialesConOrigen()]);
    // Número no válido o pedido inexistente: 200 con pedido null, como en el original.
    const enriquecido = pedido
      ? { ...pedido, lineas: pedido.lineas.map((linea) => ({ ...linea, materialSugerido: materialPreferidoRps(linea, materiales) || null })) }
      : null;
    res.set('Cache-Control', 'no-store').json({ pedido: enriquecido });
  } catch (error) {
    console.error('No se pudo consultar RPS para remolques', error instanceof Error ? error.message : error);
    res.status(503).json({ error: error instanceof Error ? error.message : 'No se pudo consultar RPS.' });
  }
});

app.get('/api/remolques/parametros', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store').json(await (req.query.detalle === '1' ? remolquesParametersStore.getSnapshot() : remolquesParametersStore.get()));
  } catch (error) {
    next(error);
  }
});

app.put('/api/remolques/parametros', async (req, res, next) => {
  try {
    res.json(await remolquesParametersStore.save(req.body));
  } catch (error) {
    if (error.code === 'VERSION_CONFLICT') return res.status(409).json({ error: error.message, current: error.current });
    if (error.code === 'INVALID_INPUT') return res.status(400).json({ error: error.message });
    next(error);
  }
});

app.get('/api/remolques/parametros/history', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    res.set('Cache-Control', 'no-store').json({ entries: await remolquesParametersStore.history(limit) });
  } catch (error) { next(error); }
});

// La página interna de la hoja pide sus datos con el identificador que le dio el PDF. Un solo uso.
app.get('/api/remolques/hoja/:id', (req, res) => {
  const datos = fichasHojaRemolques.tomar(req.params.id);
  if (!datos) {
    res.status(404).json({ error: 'Los datos de esta hoja ya no están disponibles: vuelve a pedir el PDF.' });
    return;
  }
  res.set('Cache-Control', 'no-store').json(datos);
});

// Vista previa de la hoja de taller: hace el PDF y lo devuelve. Nunca lo guarda en ninguna
// carpeta; el archivo (src/remolques/salida/archivo.ts) lo llamará la fase 5.
app.post('/api/remolques/pdf', async (req, res, next) => {
  let id = null;
  // Si quien pidió el PDF cierra la conexión mientras espera en la cola, su hoja no se hace.
  let seFue = false;
  res.on('close', () => {
    if (!res.writableFinished) seFue = true;
  });
  try {
    // «Corregir» un pedido guardado manda los parámetros con que se guardó; si no, los comunes.
    const params = req.body?.params == null
      ? await remolquesParametersStore.get()
      : paramsDeLaPantalla(req.body.params);
    const datos = prepararPedidoHoja(req.body?.elementos, params);
    const pdf = await servicioPdfRemolques.generar({
      // La ficha se guarda al salir de la cola: su minuto empieza cuando Chromium va a pedirla.
      preparar: () => (id = fichasHojaRemolques.guardar(datos)),
      sigueEsperando: () => !seFue
    });
    if (seFue) return;
    res.set('Cache-Control', 'no-store')
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', `inline; filename="${nombrePdf(datos.elementos[0].input.cabecera.numeroPedido)}"`)
      .send(pdf);
  } catch (error) {
    if (seFue) return;
    if (error instanceof ErrorPedidoHoja || error instanceof ErrorPedidoRemolques) {
      next(error);
    } else if (error instanceof ErrorSalidaPdf) {
      console.error('No se pudo hacer la hoja de taller de remolques:', error.message);
      next(error);
    } else {
      // Un fallo que no es del pedido ni de Chromium es del servidor: 500, no el 400 por defecto.
      console.error('Fallo inesperado al hacer la hoja de taller de remolques:', error);
      next(httpError(500, 'No se pudo hacer la hoja de taller por un fallo del servidor. Avisa a informática.'));
    }
  } finally {
    if (id) fichasHojaRemolques.borrar(id);
  }
});

// Pedidos de remolques (fase 5). Un error del pedido llega con su código; uno inesperado es 500.
function rutaRemolques(manejar) {
  return async (req, res, next) => {
    try {
      await manejar(req, res);
    } catch (error) {
      if (error?.statusCode) return next(error);
      console.error('Fallo inesperado en los pedidos de remolques:', error);
      return next(httpError(500, 'No se pudo completar la operación por un fallo del servidor. Avisa a informática.'));
    }
  };
}

app.get('/api/remolques/pedidos', rutaRemolques(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  if (year < 2000 || year > 2100) throw httpError(400, 'El año no es válido.');
  res.set('Cache-Control', 'no-store').json(await pedidosRemolques.listar(year));
}));

app.post('/api/remolques/pedidos', rutaRemolques(async (req, res) => {
  const { status, cuerpo } = await pedidosRemolques.guardar(req.body);
  // Guardado para revisión: su borrador sobra (diseño 01/10/2026). Nunca falla.
  if (status === 200) await borradores.borrarTrasRevision(cuerpo.review.orderCode);
  res.status(status).json(cuerpo);
}));

app.get('/api/remolques/pedidos/:orderCode', rutaRemolques(async (req, res) => {
  res.set('Cache-Control', 'no-store').json(await pedidosRemolques.obtener(req.params.orderCode));
}));

// La hoja de un pedido guardado, con sus parámetros: nunca se archiva.
app.get('/api/remolques/pedidos/:orderCode/vista-previa', rutaRemolques(async (req, res) => {
  const { pdf, nombre } = await pedidosRemolques.vistaPrevia(req.params.orderCode);
  enviarPdf(res, pdf, nombre);
}));

app.post('/api/remolques/pedidos/:orderCode/generar', rutaRemolques(async (req, res) => {
  const { status, cuerpo } = await pedidosRemolques.generar(req.params.orderCode, req.body);
  res.status(status).json(cuerpo);
}));

app.get('/api/remolques/pedidos/:orderCode/archivo', rutaRemolques(async (req, res) => {
  const { pdf, nombre } = await pedidosRemolques.archivo(req.params.orderCode);
  enviarPdf(res, pdf, nombre);
}));

// Borradores (diseño 01/10/2026). Un error del borrador llega con su código; uno inesperado es 500.
function rutaBorradores(manejar) {
  return async (req, res, next) => {
    try {
      await manejar(req, res);
    } catch (error) {
      if (error?.statusCode) return next(error);
      console.error('Fallo inesperado en los borradores:', error);
      return next(httpError(500, 'No se pudo completar la operación por un fallo del servidor. Avisa a informática.'));
    }
  };
}

app.get('/api/borradores', rutaBorradores(async (_req, res) => {
  res.set('Cache-Control', 'no-store').json(await borradores.listar());
}));

app.get('/api/borradores/:orderCode', rutaBorradores(async (req, res) => {
  res.set('Cache-Control', 'no-store').json(await borradores.obtener(req.params.orderCode));
}));

app.put('/api/borradores/:orderCode', rutaBorradores(async (req, res) => {
  const { status, cuerpo } = await borradores.guardar(req.params.orderCode, req.body);
  res.status(status).json(cuerpo);
}));

app.delete('/api/borradores/:orderCode', rutaBorradores(async (req, res) => {
  const { status, cuerpo } = await borradores.descartar(req.params.orderCode);
  res.status(status).json(cuerpo);
}));

// Estado de las OF en CoordinaOT para la web (Pedidos y el pedido abierto). La clave
// vive aquí, en el servidor: el navegador nunca la ve.
app.get('/api/coordina/ofs', async (req, res, next) => {
  try {
    const ofs = String(req.query.ofs || '').split(',').map((of) => of.trim()).filter(Boolean).slice(0, 500);
    res.set('Cache-Control', 'no-store').json(await coordina.statusOf(ofs));
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

app.get('/api/reviews/:orderCode/generated-files/:fileIndex', async (req, res, next) => {
  try {
    const [review, settings] = await Promise.all([
      workflowStore.getReview(req.params.orderCode),
      workflowStore.getSettings()
    ]);
    const candidates = resolveGeneratedReviewFiles(review, settings, req.params.fileIndex);
    let file = null;
    let contents = null;
    for (const candidate of candidates) {
      try {
        contents = await fs.readFile(candidate.savedPath);
        file = candidate;
        break;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    if (!file || !contents) {
      const error = new Error('El archivo generado ya no está disponible en sus carpetas de destino o procesados.');
      error.code = 'ENOENT';
      throw error;
    }
    const disposition = file.type === 'pdf' ? 'inline' : 'attachment';
    const contentType = file.type === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${file.filename.replace(/["\\\r\n]/g, '_')}"`);
    res.setHeader('X-Toldos-File-Source', file.source);
    res.send(contents);
  } catch (error) {
    if (error.code === 'ENOENT') return next(httpError(404, 'El archivo generado ya no está disponible en su carpeta de destino.'));
    next(error);
  }
});

app.post('/api/reviews', async (req, res, next) => {
  try {
    const rawOrder = req.body?.order || req.body;
    const normalizedOrder = normalizeOrder(rawOrder);
    const orderCode = sanitizeOrderCode(normalizedOrder.orderCode);
    // Un pedido es de toldos o de remolques. Si la carpeta interna de remolques falla, toldos sigue.
    if (await yaEsPedidoDeRemolques(almacenPedidosRemolques, orderCode)) {
      throw httpError(409, mensajePedidoDeRemolques(orderCode));
    }
    let existing = null;
    try {
      existing = await workflowStore.getReview(orderCode);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const decision = saveReviewDecision(existing, req.body?.confirmOverwrite === true);
    if (decision.action === 'refuse') throw httpError(decision.statusCode, decision.error);
    if (decision.action === 'confirm') {
      res.status(409).json({
        needsConfirmation: true,
        existing: [`${orderCode}.pdf`],
        error: 'Este pedido ya existe en la bandeja de revisión.'
      });
      return;
    }

    // El autor no cambia al corregir (diseño 24/09/2026, apartado 2): se decide aquí
    // con el pedido guardado delante, no solo con lo que mande el navegador.
    const authorship = reviewAuthorship({
      existingTechnician: existing?.order?.technician,
      existingReviewer: existing?.order?.reviewer,
      technician: rawOrder?.technician,
      reviewer: rawOrder?.reviewer,
      savedBy: req.body?.savedBy
    });
    const order = structuredClone({ ...rawOrder, orderCode, ...authorship });
    const calculation = await calculateConfiguredOrder(order);
    const review = createReviewPackage({ order, calculation, existing });
    const pdf = await buildOrderReviewPdf({ order, calculation, review });
    const savedPath = await workflowStore.saveReview(review, pdf);
    // Pasado a revisión, su borrador sobra (diseño 01/10/2026). Si no se puede borrar, se apunta
    // y el pedido queda guardado igual.
    await borradores.borrarTrasRevision(orderCode);
    res.json({ ok: true, review, savedPath, overwritten: Boolean(existing) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/reviews/:orderCode/request-changes', async (req, res, next) => {
  try {
    const review = await workflowStore.getReview(req.params.orderCode);
    if (review.status === 'APPROVED' || review.status === 'PRODUCED') {
      throw httpError(409, 'La revisión ya está cerrada y no se puede devolver sin guardar antes una nueva versión del pedido.');
    }
    const reviewer = String(req.body?.reviewer || '').trim();
    const note = String(req.body?.note || '').trim();
    if (!reviewer) throw new Error('Indica quién realiza la revisión.');
    if (!note) throw new Error('Describe los cambios que hay que realizar.');
    const updated = markReviewChangesRequested(review, { reviewer, note });
    const calculation = await calculateConfiguredOrder(updated.order);
    const pdf = await buildOrderReviewPdf({ order: updated.order, calculation, review: updated });
    await workflowStore.saveReview(updated, pdf);
    res.json({ ok: true, review: updated });
  } catch (error) {
    if (error.code === 'ENOENT') return next(httpError(404, 'No se encontró el pedido de revisión.'));
    next(error);
  }
});

app.post(['/api/reviews/:orderCode/mark-approved', '/api/reviews/:orderCode/approve'], async (req, res, next) => {
  try {
    const review = await workflowStore.getReview(req.params.orderCode);
    if (review.status === 'PRODUCED') {
      throw httpError(409, 'Este pedido ya pertenece al histórico de producción y no se puede cambiar desde la revisión web.');
    }
    if (review.status === 'APPROVED') {
      res.json({ ok: true, review, unchanged: true });
      return;
    }
    const reviewer = String(req.body?.reviewer || review.order?.reviewer || review.order?.technician || '').trim();
    if (!reviewer) throw new Error('El pedido necesita un técnico o revisor asignado para aprobarlo.');
    const updated = markReviewApproved(review, { reviewer, note: req.body?.note });
    const calculation = await calculateConfiguredOrder(updated.order);
    const pdf = await buildOrderReviewPdf({ order: updated.order, calculation, review: updated });
    await workflowStore.saveReview(updated, pdf);
    res.json({ ok: true, review: updated });
  } catch (error) {
    if (error.code === 'ENOENT') return next(httpError(404, 'No se encontró el pedido de revisión.'));
    next(error);
  }
});

app.post('/api/reviews/:orderCode/generate-files', async (req, res, next) => {
  const lockKey = sanitizeOrderCode(req.params.orderCode);
  if (generationLocks.has(lockKey)) {
    res.status(409).json({ error: 'Ya se están generando los archivos de este pedido.' });
    return;
  }
  generationLocks.add(lockKey);
  try {
    const settings = await workflowStore.getSettings();
    const readiness = workflowReadiness(settings);
    if (!readiness.productionReady) {
      throw httpError(403, readiness.missing.length
        ? `Las carpetas de salida no están configuradas: ${readiness.missing.join(', ')}.`
        : 'Activa las salidas manuales en Configuración.');
    }

    const review = await workflowStore.getReview(req.params.orderCode);
    const decision = generateFilesDecision(review.status);
    if (decision.action === 'unchanged') {
      res.json({ ok: true, review, unchanged: true, saved: review.production?.files || [] });
      return;
    }
    if (decision.action === 'refuse') throw httpError(decision.statusCode, decision.error);

    const order = normalizeOrder(review.order);
    assertDeploymentModelsEnabled(order, deploymentFeatures);

    // Solo se genera lo que CoordinaOT ha aprobado, OF por OF, preguntando en el momento.
    // Si CoordinaOT no responde, no se genera (diseño 29/09/2026, opción A).
    const approvalAwnings = order.awnings.map((awning, index) => ({ letter: awningLetter(index), of: awning.of }));
    const approval = await coordina.statusOf(uniqueOfs(approvalAwnings), { fresh: true });
    const approvalBlock = generationBlock(approvalAwnings, approval);
    if (approvalBlock) throw httpError(approval.disponible ? 409 : 503, approvalBlock);
    const reviewer = approvalReviewers(approvalAwnings, approval, formOptions.tecnicos);

    const calculation = await calculateConfiguredOrder(order);
    const blockingDiagnostics = calculation.diagnostics.filter((item) => item.level === 'error' || item.level === 'pending');
    if (calculation.ofs.length !== order.awnings.length || blockingDiagnostics.length > 0) {
      throw new Error('El pedido tiene toldos incompletos o diagnósticos bloqueantes. Guarda una nueva revisión corregida antes de generar archivos.');
    }

    const nonAcrylicFabrics = findNonAcrylicReservationFabrics(order, calculation);
    const hasNonAcrylicDecision = typeof req.body?.includeNonAcrylicFabrics === 'boolean';
    if (nonAcrylicFabrics.length > 0 && !hasNonAcrylicDecision) {
      res.status(409).json({ needsFabricConfirmation: true, fabrics: nonAcrylicFabrics });
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
      savedPath: path.join(pdfDirectory, `${cleanOrder}-1.pdf`)
    });

    await Promise.all(targets.map(async (target) => {
      if (target.build) target.contents = await target.build();
      target.exists = await fileExists(target.savedPath);
    }));
    const existing = targets.filter((target) => target.exists).map((target) => target.filename);
    if (existing.length > 0 && req.body?.confirmOverwrite !== true) {
      res.status(409).json({ needsConfirmation: true, existing });
      return;
    }

    const saved = targets.map((target) => ({
      type: target.type,
      of: target.of,
      filename: target.filename,
      savedPath: target.savedPath,
      overwritten: target.exists
    }));
    const updated = markReviewFilesGenerated(review, {
      generatedBy: review.order?.technician || review.createdBy,
      files: saved.map(({ type, of, filename, savedPath }) => ({ type, of, filename, savedPath })),
      excludedNonAcrylicFabrics
    });
    // Quien aprobó en CoordinaOT queda como revisor del pedido antes de dibujar el PDF, para
    // que «REVISOR:» del planteamiento definitivo salga relleno sin que nadie lo teclee.
    if (reviewer) {
      updated.order = { ...updated.order, reviewer };
      updated.reviewedBy = reviewer;
    }
    const pdfTarget = targets.find((target) => target.type === 'pdf');
    pdfTarget.contents = await buildOrderPlanteamientoPdf({ order: updated.order, calculation, review: updated });

    await Promise.all([fs.mkdir(rpsDirectory, { recursive: true }), fs.mkdir(pdfDirectory, { recursive: true })]);
    for (const target of targets) await writeFileAtomic(target.savedPath, target.contents);

    // Se guarda exactamente el mismo PDF en ambos destinos; solo cambia el
    // nombre: PEDIDO-1.pdf en Planteamientos y PEDIDO.pdf en la carpeta anual.
    await workflowStore.saveReview(updated, pdfTarget.contents);
    res.json({ ok: true, review: updated, saved, excludedNonAcrylicFabrics });
  } catch (error) {
    if (error.code === 'ENOENT') return next(httpError(404, 'No se encontró el pedido de revisión.'));
    next(error);
  } finally {
    generationLocks.delete(lockKey);
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

      const calculation = await calculateConfiguredOrder(orderPayload);
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
  // El historial de telas tarda unos segundos: se prepara en segundo plano para que el
  // primer autorrelleno ya lo tenga.
  if (config.db.user && config.db.password) {
    fabricHistory.get().catch((error) => console.error('No se pudo preparar el historial de telas:', error.message));
  }
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
  // Chromium se cierra a la vez que el servidor HTTP, no después: las hojas de taller que esperan
  // en la cola se rechazan enseguida con 503 y el cierre no espera a hacerlas (con la cola llena
  // pasaría de los 12 s del forzado).
  const pdfClosed = servicioPdfRemolques.cerrar().catch((error) => {
    closeErrors.push(error);
  });
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

  await pdfClosed;

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

/** Dirección de la página de la hoja para el Chromium del propio servidor. */
function urlHojaRemolques(id) {
  const { port } = server.address();
  const comodin = ['', '0.0.0.0', '::'].includes(config.host);
  const host = comodin ? '127.0.0.1' : config.host.includes(':') ? `[${config.host}]` : config.host;
  return `http://${host}:${port}/hoja-remolques.html?id=${encodeURIComponent(id)}`;
}

/** La hoja de taller de remolques en PDF con el servicio de Chromium; su ficha se borra siempre. */
async function hojaRemolquesPdf(datos) {
  let id = null;
  try {
    return await servicioPdfRemolques.generar({ preparar: () => (id = fichasHojaRemolques.guardar(datos)) });
  } finally {
    if (id) fichasHojaRemolques.borrar(id);
  }
}

function enviarPdf(res, pdf, nombre) {
  res.set('Cache-Control', 'no-store')
    .setHeader('Content-Type', 'application/pdf')
    .setHeader('Content-Disposition', `inline; filename="${String(nombre).replace(/["\\\r\n]/g, '_')}"`)
    .send(Buffer.from(pdf));
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

  return path.join(config.orderArchiveRoot, String(year), 'TOLDOS', `${cleanOrder}.pdf`);
}

function serveDistFolder() {
  // Los recursos con hash se guardan un año; las páginas HTML no (hoja-remolques.html la abre
  // Chromium directamente y tiene que llevar siempre los recursos del último despliegue).
  app.use(express.static(distDir, {
    index: false,
    maxAge: '1y',
    immutable: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
  }));
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
  // VITE_HMR_PORT: cada instancia aislada usa su propio puerto de recarga; con el de
  // siempre (24678) dos instancias a la vez se estorban y la hoja en PDF falla.
  const hmrPort = Number(process.env.VITE_HMR_PORT) || undefined;
  const vite = await createServer({
    server: { middlewareMode: true, ...(hmrPort ? { hmr: { port: hmrPort } } : {}) },
    appType: 'spa'
  });
  app.use(vite.middlewares);
}

async function calculateConfiguredOrder(order) {
  return verifyStructureArticles(calculateOrder(order), getRpsArticle);
}
