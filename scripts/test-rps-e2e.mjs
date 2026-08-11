import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { config } from '../src/config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactDirectory = path.join(root, 'output', 'playwright', 'rps-e2e');
const workflowDirectory = path.join(artifactDirectory, `workflow-${Date.now()}`);
const reportPath = path.join(artifactDirectory, 'report.json');
const startedAt = new Date().toISOString();
const report = {
  startedAt,
  mode: 'review-production',
  rps: {},
  apiCases: [],
  browserCase: null,
  consoleErrors: [],
  requestFailures: []
};

await mkdir(artifactDirectory, { recursive: true });

const port = await findFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = [];
const server = spawn(process.execPath, ['src/server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    ENABLE_FILE_WRITES: 'false',
    ENABLE_LEGACY_EXPORTS: 'true',
    WORKFLOW_SETTINGS_FILE: path.join(workflowDirectory, 'settings.json'),
    NODE_ENV: 'production'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));

let browser;
let rpsPool;
let exitCode = 0;

try {
  const health = await waitForJson(`${baseUrl}/api/health`);
  assert.equal(health.ok, true);
  assert.equal(health.simulationMode, true);
  assert.equal(health.fileWritesEnabled, false);

  const settingsResponse = await fetch(`${baseUrl}/api/workflow/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productionEnabled: true,
      reviewDirectory: path.join(workflowDirectory, '{YYYY}', 'TOLDOS'),
      planteamientosDirectory: path.join(workflowDirectory, 'PLANTEAMIENTOS', '{YYYY}'),
      rpsUploadDirectory: path.join(workflowDirectory, 'RPS')
    })
  });
  assert.equal(settingsResponse.status, 200);
  assert.equal((await settingsResponse.json()).readiness.productionReady, true);

  rpsPool = await connectRps();
  report.rps = await verifyOrdersInRps(rpsPool);

  for (const testCase of apiCases()) {
    report.apiCases.push(await verifyApiCase(baseUrl, testCase));
  }

  browser = await chromium.launch({ headless: true });
  report.browserCase = await verifyBrowserCase(browser, baseUrl);

  assert.deepEqual(report.consoleErrors, [], 'La consola del navegador contiene errores.');
  assert.deepEqual(report.requestFailures, [], 'Hay peticiones fallidas en el navegador.');
  report.ok = true;
} catch (error) {
  exitCode = 1;
  report.ok = false;
  report.error = {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack || ''
  };
} finally {
  if (browser) await browser.close().catch(() => {});
  if (rpsPool) await rpsPool.close().catch(() => {});
  server.kill();
  report.finishedAt = new Date().toISOString();
  report.serverOutput = serverOutput.join('').trim().split(/\r?\n/).filter(Boolean);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

if (exitCode) {
  console.error(`E2E RPS falló. Informe: ${reportPath}`);
  console.error(report.error?.message || 'Error desconocido');
  process.exit(exitCode);
}

console.log(`E2E RPS correcto: ${report.apiCases.length} casos API + 1 caso de navegador.`);
console.log(`RPSNext verificado en lectura: ${report.rps.orders.length} pedidos y ${report.rps.materialRows.length} OFs.`);
console.log(`Artefactos: ${artifactDirectory}`);

async function verifyBrowserCase(browserInstance, url) {
  const context = await browserInstance.newContext({
    acceptDownloads: true,
    locale: 'es-ES',
    viewport: { width: 1600, height: 1200 }
  });
  await context.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: undefined
    });
  });

  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.consoleErrors.push(error.message));
  page.on('requestfailed', (request) => {
    report.requestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'fallo'}`);
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByText('Producción activa', { exact: true }).waitFor();
  await page.getByText('Aprobación obligatoria', { exact: true }).waitFor();

  await page.getByRole('textbox', { name: 'Pedido' }).fill('AR2603332');
  await page.getByRole('textbox', { name: 'Cliente' }).fill('LECHE CELTA');

  const fabric = page.getByRole('combobox', { name: 'Buscar código o color…' });
  await fabric.fill('ACRILI2018P120');
  const fabricOption = page.getByRole('option').filter({ hasText: 'ACRILI2018P120' }).first();
  await fabricOption.waitFor();
  await fabricOption.click();

  await page.getByRole('button', { name: /Añadir toldo/ }).click();
  await page.getByRole('dialog', { name: 'Elegir modelo de toldo' })
    .getByRole('button', { name: /Arzúa Pro/ })
    .click();

  const awning = page.locator('article.awning-column').last();
  await awning.getByLabel('OF', { exact: true }).fill('0230194');
  await awning.getByLabel('Frente', { exact: true }).fill('337');
  await chooseSelect(awning, 'Salida', '225');
  await awning.getByLabel('Bamba (cm)', { exact: true }).fill('30');
  await chooseSelect(awning, 'Curva bamba', 'Recta');
  await chooseSegment(awning, 'Remate', 'Como tela');
  await chooseSegment(awning, 'Nº de brazos', '2');
  await chooseSegment(awning, 'Tubo de carga', 'Evo 80');
  await chooseSelect(awning, 'Lacado', 'Blanco');
  await chooseSegment(awning, 'Rotulación tela', 'No');
  await chooseSegment(awning, 'Rotulación bamba', 'No');
  await chooseSelect(awning, 'Dispositivo', 'Motor');
  await chooseSelect(awning, 'Colocación', 'Frontal');
  await chooseSelect(awning, 'Sensor', 'Sin sensor');

  await page.getByText('VÁLIDO', { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByText('326 × 300 cm', { exact: true }).waitFor();
  await page.getByText('9 ml', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'Vista previa' }).click();
  const preview = page.getByRole('dialog', { name: 'Vista previa del planteamiento' });
  await preview.waitFor({ timeout: 20_000 });
  await preview.locator('.pdf-preview-page').nth(1).waitFor({ timeout: 20_000 });
  assert.equal(await preview.locator('.pdf-preview-page').count(), 2);

  await preview.getByRole('button', { name: 'Cerrar vista previa' }).click();
  await page.getByRole('button', { name: 'Guardar para revisión' }).click();
  await page.getByText(/guardado en la bandeja compartida/).waitFor();

  await page.getByRole('button', { name: 'Revisión', exact: true }).click();
  const reviewItem = page.getByRole('button').filter({ hasText: 'AR2603332' });
  await reviewItem.waitFor();
  await page.getByRole('textbox', { name: 'Revisado por' }).fill('E2E Oficina técnica');
  await page.getByRole('button', { name: 'Aprobar y producir' }).click();
  await page.getByText(/PDF y RPS guardados/).waitFor({ timeout: 20_000 });

  const rpsPath = path.join(workflowDirectory, 'RPS', '0230194.xls');
  const pdfPath = path.join(workflowDirectory, 'PLANTEAMIENTOS', '2026', 'AR2603332-1.pdf');
  const rpsContent = (await readFile(rpsPath)).toString('latin1');
  assert.deepEqual(parseRpsWorkbook(rpsContent), [
    ['OF', 'ARTICULO', 'CANTIDAD'],
    ['0230194', 'SOPAR350BL16', '1'],
    ['0230194', 'TURA80HG600C', '2'],
    ['0230194', 'PEVO80BL16600C', '1'],
    ['0230194', 'BONYXBL16225C', '1'],
    ['0230194', 'RUEDAMOT78', '1'],
    ['0230194', 'SUNILUSIO55//17', '1'],
    ['0230194', 'CORONALT6078', '1'],
    ['0230194', 'SOPORTEUNVHIPRO', '1'],
    ['0230194', 'SITUOIO1PURE', '1'],
    ['0230194', 'ACRILI2018P120', '9']
  ]);
  const pdf = await inspectPdf(await readFile(pdfPath));
  assert.equal(pdf.pages, 2);
  assert.match(pdf.text, /AR2603332/);
  assert.match(pdf.text, /0230194/);

  await page.getByRole('button', { name: 'Abrir pedido y comprobar' }).click();
  await page.getByText(/abierto desde la bandeja/).waitFor();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Limpiar' }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Pedido' }).inputValue(), '');
  assert.equal(await page.locator('article.awning-column').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Guardar para revisión' }).isDisabled(), true);

  const screenshotPath = path.join(artifactDirectory, 'AR2603332-final.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await context.close();

  return {
    orderCode: 'AR2603332',
    of: '0230194',
    model: 'ARZUA PRO',
    rpsFile: path.basename(rpsPath),
    pdfFile: path.basename(pdfPath),
    pdfPages: pdf.pages,
    reviewVerified: true,
    productionVerified: true,
    clearVerified: true,
    screenshot: path.basename(screenshotPath)
  };
}

async function verifyApiCase(baseUrl, testCase) {
  const calculationResponse = await fetch(`${baseUrl}/api/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testCase.order)
  });
  assert.equal(calculationResponse.status, 200, `${testCase.orderCode}: /api/calculate`);
  const calculation = await calculationResponse.json();
  const ofBlock = calculation.ofs.find((item) => item.of === testCase.of);
  assert.ok(ofBlock, `${testCase.orderCode}: no aparece la OF ${testCase.of}.`);
  assert.equal(ofBlock.calculation.valid, true, `${testCase.orderCode}: cálculo inválido.`);

  for (const [field, expected] of Object.entries(testCase.calculation)) {
    assert.equal(ofBlock.calculation[field], expected, `${testCase.orderCode}: ${field}`);
  }
  for (const [code, quantity] of Object.entries(testCase.materials)) {
    const material = ofBlock.materials.find((item) => item.code === code);
    assert.ok(material, `${testCase.orderCode}: falta ${code}.`);
    assert.equal(material.quantity, quantity, `${testCase.orderCode}: cantidad de ${code}.`);
  }

  const exportResponse = await fetch(`${baseUrl}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderCode: calculation.orderCode, ofs: calculation.ofs })
  });
  assert.equal(exportResponse.status, 200, `${testCase.orderCode}: /api/export`);
  assert.match(exportResponse.headers.get('content-type') || '', /application\/vnd\.ms-excel/);
  const exportedRows = parseRpsWorkbook(Buffer.from(await exportResponse.arrayBuffer()).toString('latin1'));
  assert.deepEqual(exportedRows[0], ['OF', 'ARTICULO', 'CANTIDAD']);
  for (const [code, quantity] of Object.entries(testCase.materials)) {
    assert.ok(
      exportedRows.some((row) => row[0] === testCase.of && row[1] === code && decimal(row[2]) === quantity),
      `${testCase.orderCode}: el XLS no contiene ${code} x${quantity}.`
    );
  }

  const pdfResponse = await fetch(`${baseUrl}/api/planteamiento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: testCase.order })
  });
  assert.equal(pdfResponse.status, 200, `${testCase.orderCode}: /api/planteamiento`);
  assert.match(pdfResponse.headers.get('content-type') || '', /application\/pdf/);
  assert.match(
    pdfResponse.headers.get('content-disposition') || '',
    new RegExp(`filename="${testCase.orderCode}-1\\.pdf"`)
  );
  const pdf = await inspectPdf(Buffer.from(await pdfResponse.arrayBuffer()));
  assert.equal(pdf.pages, testCase.pdfPages, `${testCase.orderCode}: páginas PDF.`);
  assert.match(pdf.text, new RegExp(testCase.orderCode));
  assert.match(pdf.text, new RegExp(testCase.of));

  return {
    orderCode: testCase.orderCode,
    of: testCase.of,
    model: testCase.order.awnings[0].model,
    checks: Object.keys(testCase.calculation).length + Object.keys(testCase.materials).length,
    exportedRows: exportedRows.length - 1,
    pdfPages: pdf.pages
  };
}

async function verifyOrdersInRps(pool) {
  const cases = apiCases();
  const request = pool.request().input('company', sql.VarChar(10), config.db.company);
  const orderConditions = cases.map((testCase, index) => {
    request.input(`order${index}`, sql.VarChar(40), testCase.orderCode);
    return `REPLACE(REPLACE(o.CodOrder, '.', ''), '-', '') = @order${index}`;
  });
  const orders = await request.query(`
    SELECT
      o.CodOrder AS orderCode,
      CONVERT(varchar(40), mo.CodManufacturingOrder) AS [of],
      a.CodArticle AS article
    FROM dbo.FACOrderSL o
    JOIN dbo.FACOrderLineSL l
      ON l.IDOrder = o.IDOrder AND l.CodCompany = o.CodCompany
    LEFT JOIN dbo.CPRManufacturingOrder mo
      ON mo.IDManufacturingOrder = l.IDManufacturingOrder AND mo.CodCompany = l.CodCompany
    LEFT JOIN dbo.STKArticle a
      ON a.IDArticle = l.IDArticle AND a.CodCompany = l.CodCompany
    WHERE o.CodCompany = @company
      AND (${orderConditions.join(' OR ')})
  `);

  for (const testCase of cases) {
    assert.ok(
      orders.recordset.some((row) => normalizeOrderCode(row.orderCode) === testCase.orderCode && String(row.of || '') === testCase.of),
      `RPSNext no relaciona ${testCase.orderCode} con la OF ${testCase.of}.`
    );
  }

  const materialRequest = pool.request().input('company', sql.VarChar(10), config.db.company);
  const ofParameters = cases.map((testCase, index) => {
    materialRequest.input(`of${index}`, sql.VarChar(40), testCase.of);
    return `@of${index}`;
  });
  const materialRows = await materialRequest.query(`
    SELECT
      CONVERT(varchar(40), mo.CodManufacturingOrder) AS [of],
      COUNT(*) AS materialRows
    FROM dbo._MaterialesPrevistosOF m
    JOIN dbo.CPRManufacturingOrder mo
      ON mo.IDManufacturingOrder = m.IDManufacturingOrder AND mo.CodCompany = m.CodCompany
    WHERE mo.CodCompany = @company
      AND CONVERT(varchar(40), mo.CodManufacturingOrder) IN (${ofParameters.join(', ')})
    GROUP BY mo.CodManufacturingOrder
  `);

  for (const testCase of cases) {
    assert.ok(
      materialRows.recordset.some((row) => String(row.of) === testCase.of && Number(row.materialRows) > 0),
      `RPSNext no contiene materiales previstos para la OF ${testCase.of}.`
    );
  }

  return {
    source: 'RPSNext',
    readOnly: true,
    orders: cases.map((testCase) => ({ orderCode: testCase.orderCode, of: testCase.of })),
    materialRows: materialRows.recordset.map((row) => ({ of: String(row.of), rows: Number(row.materialRows) }))
  };
}

function apiCases() {
  return [
    {
      orderCode: 'AR2603332',
      of: '0230194',
      order: order('AR2603332', 'ACRILI2018P120|||120|||LONA ACRILICA MASACRIL AZUL 2018', {
        of: '0230194', model: 'ARZUA PRO', width: 337, projection: 225,
        valanceHeight: 30, destination: 'PARTICULAR', tubeLoad: 'TUBO DE CARGA EVO 80',
        device: 'MOTOR', sensor: 'SITUO IO 1 PURE'
      }),
      calculation: { fabricWidth: 326, fabricDrop: 300, fabricMl: 9, motorPower: '55/17' },
      materials: { TURA80HG600C: 2, 'SUNILUSIO55//17': 1, ACRILI2018P120: 9, SITUOIO1PURE: 1 },
      pdfPages: 2
    },
    {
      orderCode: 'AR2603298',
      of: '0230134',
      order: order('AR2603298', 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL NEGRO 2170', {
        of: '0230134', model: 'GALICIA', width: 430, projection: 350,
        valanceHeight: 25, armCount: 2, device: 'MAQ. EXTERIOR', crankHeight: 250,
        tubeLoad: 'TUBO DE CARGA UNIVERS 280'
      }),
      calculation: { fabricWidth: 417, fabricDrop: 420, fabricMl: 16.8, armCount: 2 },
      materials: { SOPARTGLBL16: 1, TURA80HG600C: 2, BONYXBL16350C: 2, ACRILI2170P120: 16.8 },
      pdfPages: 2
    },
    {
      orderCode: 'AR2603241',
      of: '0230011',
      order: order('AR2603241', 'ACRILI2925P120|||120|||LONA ACRILICA MASACRIL KANSAS 2925', {
        of: '0230011', model: 'XACOBEO', width: 365, projection: 250,
        valanceHeight: 30, device: 'MAQ. EXTERIOR', crankHeight: 170
      }),
      calculation: { fabricWidth: 352.5, fabricDrop: 325, fabricMl: 13, rollTubeLength: 354.1 },
      materials: { SOPART250BL16: 1, TURA70HG600C: 1, BART25BL16250C: 1, ACRILI2925P120: 13 },
      pdfPages: 2
    },
    {
      orderCode: 'AR2603393',
      of: '0230266',
      order: order('AR2603393', 'ACRILI2245P120|||120|||LONA ACRILICA MASACRIL BOTELLA 2245', {
        of: '0230266', model: 'MONOBLOCK 350', width: 695, projection: 275,
        valanceHeight: 25, device: 'MAQUINA', armCount: 3, crankHeight: 200,
        placement: 'TECHO'
      }),
      calculation: { fabricWidth: 680.8, fabricDrop: 345, fabricMl: 20.7, supportCount: 8 },
      materials: { TURA80HG700C: 1, PEVO80BL16700C: 1, SOPFTEMONUNDBL16: 8, ACRILI2245P120: 20.7 },
      pdfPages: 2
    },
    {
      orderCode: 'AR2603413',
      of: '0230342',
      order: order('AR2603413', 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL NEGRO 2170', {
        of: '0230342', model: 'CORTINA', width: 165, projection: 310,
        valanceHeight: 20, device: 'MAQ. INTERIOR', crankHeight: 200,
        curtainHasWindow: true, curtainFinish: 'NORMAL', curtainWindowExit: 310,
        curtainWindowCorner: 15, curtainWindowFloorHeight: 70, curtainWindowHeight: 140,
        structureColor: 'NEGRO (R-09011)'
      }),
      calculation: { fabricWidth: 153, fabricDrop: 375, fabricMl: 7.5, rollTubeLength: 154 },
      materials: { SOPUNI3AGUNE11: 1, CASMAQEJE5078MM: 1, MOSQBOACIN60MM: 2, ACRILI2170P120: 7.5 },
      pdfPages: 2
    }
  ];
}

function order(orderCode, fabric, awningPatch) {
  return {
    orderCode,
    customer: 'CASO REAL RPS',
    orderDate: '2026-07-17',
    technician: '',
    reviewer: '',
    fabric,
    sameFabric: true,
    awnings: [{
      id: `${orderCode}-A`,
      workType: 'FULL_AWNING',
      units: 1,
      hasValance: Number(awningPatch.valanceHeight) > 0,
      valanceCurve: Number(awningPatch.valanceHeight) > 0 ? 'RECTA' : '',
      valanceFabric: '',
      remate: Number(awningPatch.valanceHeight) > 0 ? 'COMO TELA' : '',
      remateColor: '',
      structureColor: 'BLANCO',
      rotFabric: 'NO',
      rotValance: Number(awningPatch.valanceHeight) > 0 ? 'NO' : '',
      armCount: null,
      device: '',
      placement: 'FRONTAL',
      wallType: '',
      tubeLoad: '',
      destination: '',
      supportSystem: '',
      motorPower: '',
      submodel: '',
      sensor: 'SIN SENSOR',
      machineSide: '',
      crankHeight: null,
      curtainHasWindow: null,
      curtainFinish: '',
      reglasModificadas: false,
      fabric: '',
      structureNotes: '',
      fabricNotes: '',
      ...awningPatch
    }]
  };
}

async function chooseSelect(scope, label, option) {
  await scope.getByRole('combobox', { name: label, exact: true }).click();
  await scope.getByRole('option', { name: option, exact: true }).click();
}

async function chooseSegment(scope, label, option) {
  await scope.getByRole('group', { name: label, exact: true })
    .getByRole('button', { name: option, exact: true })
    .click();
}

function parseRpsWorkbook(content) {
  return content.trim().split(/\r?\n/).map((line) => line.split('\t'));
}

function decimal(value) {
  return Number(String(value).replace(',', '.'));
}

async function inspectPdf(buffer) {
  assert.equal(buffer.subarray(0, 4).toString('ascii'), '%PDF');
  assert.ok(buffer.length > 10_000, 'El PDF generado es anormalmente pequeño.');
  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const document = await loadingTask.promise;
  const text = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    text.push(content.items.map((item) => item.str || '').join(' '));
  }
  const result = { pages: document.numPages, text: text.join('\n') };
  await loadingTask.destroy();
  return result;
}

async function connectRps() {
  return new sql.ConnectionPool({
    server: config.db.server,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    options: { encrypt: false, trustServerCertificate: true },
    pool: { min: 0, max: 2, idleTimeoutMillis: 15_000 },
    connectionTimeout: 8_000,
    requestTimeout: 20_000
  }).connect();
}

function normalizeOrderCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function waitForJson(url) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`El servidor de pruebas no arrancó: ${lastError?.message || 'timeout'}`);
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() => resolve(address.port));
    });
  });
}
