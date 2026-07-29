import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'output', 'rps-validation');
const detailsRoot = path.join(outputRoot, 'details');
const years = parseYears(process.env.RPS_VALIDATION_YEARS || '2025,2026');
const concurrency = positiveInteger(process.env.RPS_VALIDATION_CONCURRENCY, 2);
const strict = String(process.env.RPS_VALIDATION_STRICT || '').toLowerCase() === 'true';
const reuseDetails = String(process.env.RPS_VALIDATION_REUSE_DETAILS || '').toLowerCase() === 'true';
const forcedDetails = new Set(String(process.env.RPS_VALIDATION_FORCE || '')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean));

const validators = [
  validator('ARZUA PRO', 'validate-arzua-production.mjs', 'arzuaStructures'),
  validator('GALICIA', 'validate-galicia-production.mjs', 'galiciaStructuresInExcel'),
  validator('XACOBEO', 'validate-xacobeo-production.mjs', 'xacobeoStructures'),
  validator('CORTINA', 'validate-cortina-production.mjs', 'cortinaStructures'),
  validator('AMBAR BOX', 'validate-ambar-box-production.mjs', 'ambarStructures'),
  validator('AGATA BOX', 'validate-agata-box-production.mjs', 'agataStructures'),
  validator('MAXISCREEM', 'validate-maxiscreem-production.mjs', 'maxiscreemStructures'),
  validator('MONOBLOCK 350', 'validate-monoblock-350-production.mjs', 'monoblockStructures'),
  validator('PUNTO RECTO', 'validate-punto-recto-production.mjs', 'puntoRectoStructures'),
  validator('CUARZO BOX', 'validate-cuarzo-box-production.mjs', 'cuarzoStructures'),
  validator('PERLA BOX', 'validate-perla-box-production.mjs', 'perlaStructures'),
  validator('CORAL BOX', 'validate-coral-box-production.mjs', 'coralStructures'),
  validator('CAMBIO CORTINA', 'validate-cambio-cortina-production.mjs', 'cambioCortinaRows'),
  {
    models: ['CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA'],
    script: 'validate-fabric-jobs-production.mjs',
    splitByModel: true
  }
];

await mkdir(detailsRoot, { recursive: true });

const jobs = years.flatMap((year) => validators.map((definition) => ({
  ...definition,
  year,
  env: yearEnvironment(year)
})));

console.log(`Validación RPS real: años ${years.join(', ')}, ${jobs.length} ejecuciones.`);
const runResults = await mapConcurrent(jobs, concurrency, runValidator);
const report = buildReport(runResults);
const reportPath = path.join(outputRoot, 'report.json');
const summaryPath = path.join(outputRoot, 'summary.md');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(summaryPath, renderMarkdown(report), 'utf8');

console.log('');
console.log(renderConsoleSummary(report));
console.log(`Informe: ${reportPath}`);
console.log(`Resumen: ${summaryPath}`);

if (report.totals.errors > 0 || (strict && report.totals.modelsRequiringReview > 0)) {
  process.exitCode = 1;
}

function validator(model, script, caseField) {
  return { models: [model], script, caseField };
}

async function runValidator(job, index) {
  const label = `${job.models.join(' / ')}${job.year ? ` ${job.year}` : ' (casos curados)'}`;
  const detailsKey = `${job.year || 'curated'}-${slug(job.models.join('-'))}`;
  const detailsName = `${detailsKey}.json`;
  const detailsPath = path.join(detailsRoot, detailsName);
  if (reuseDetails && !forcedDetails.has(detailsKey)) {
    const reused = await readReusableDetails(detailsPath);
    if (reused) {
      console.log(`[${index + 1}/${jobs.length}] ${label} (reutilizado)`);
      return {
        ...job,
        label,
        exitCode: reused.exitCode,
        stderr: reused.stderr,
        parseError: '',
        data: reused.data,
        detailsFile: path.relative(projectRoot, detailsPath).replaceAll('\\', '/')
      };
    }
  }
  console.log(`[${index + 1}/${jobs.length}] ${label}`);
  const startedAt = new Date().toISOString();
  const execution = await executeNode(path.join(projectRoot, 'scripts', job.script), job.env);
  let data = null;
  let parseError = '';
  try {
    data = parseLastJson(execution.stdout);
  } catch (error) {
    parseError = error.message;
  }

  await writeFile(detailsPath, `${JSON.stringify({
    label,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: execution.exitCode,
    stderr: execution.stderr,
    parseError,
    data
  }, null, 2)}\n`, 'utf8');

  return {
    ...job,
    label,
    exitCode: execution.exitCode,
    stderr: execution.stderr,
    parseError,
    data,
    detailsFile: path.relative(projectRoot, detailsPath).replaceAll('\\', '/')
  };
}

async function readReusableDetails(detailsPath) {
  try {
    const details = JSON.parse(await readFile(detailsPath, 'utf8'));
    return details?.data && !details.parseError ? details : null;
  } catch {
    return null;
  }
}

function buildReport(runs) {
  const modelResults = runs.flatMap((run) => {
    if (!run.data) {
      return run.models.map((model) => failedModelResult(run, model));
    }
    if (run.splitByModel) {
      return run.models.map((model) => modelResult(run, model, run.data.perModel?.[model] || {}));
    }
    return [modelResult(run, run.models[0], run.data)];
  });

  const byModel = [...new Set(modelResults.map((item) => item.model))].sort()
    .map((model) => {
      const results = modelResults.filter((item) => item.model === model);
      return {
        model,
        status: aggregateStatus(results),
        years: results.map((item) => item.year).filter(Boolean),
        ordersFound: sum(results, 'ordersFound'),
        matchedExcelFiles: sum(results, 'matchedExcelFiles'),
        cases: sum(results, 'cases'),
        dimensionalChecks: sum(results, 'dimensionalChecks'),
        dimensionalMismatches: sum(results, 'dimensionalMismatches'),
        reservationChecks: sum(results, 'reservationChecks'),
        reservationMismatches: sum(results, 'reservationMismatches'),
        notUploaded: sum(results, 'notUploaded'),
        runs: results
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    scope: {
      years,
      dateFrom: `${Math.min(...years)}-01-01`,
      dateToExclusive: `${Math.max(...years) + 1}-01-01`,
      excelRoots: years.map((year) => `Y:\\${year}\\TOLDOS`),
      source: 'Libros de pedido guardados y materiales previstos actuales de RPS'
    },
    totals: {
      models: byModel.length,
      modelsMatching: byModel.filter((item) => item.status === 'MATCH').length,
      modelsRequiringReview: byModel.filter((item) => item.status === 'REVIEW').length,
      modelsWithoutData: byModel.filter((item) => item.status === 'NO_DATA').length,
      errors: byModel.filter((item) => item.status === 'ERROR').length,
      ordersFound: sum(byModel, 'ordersFound'),
      matchedExcelFiles: sum(byModel, 'matchedExcelFiles'),
      cases: sum(byModel, 'cases'),
      dimensionalChecks: sum(byModel, 'dimensionalChecks'),
      dimensionalMismatches: sum(byModel, 'dimensionalMismatches'),
      reservationChecks: sum(byModel, 'reservationChecks'),
      reservationMismatches: sum(byModel, 'reservationMismatches'),
      notUploaded: sum(byModel, 'notUploaded')
    },
    models: byModel
  };
}

function modelResult(run, model, data) {
  const cases = numberFrom(data, [
    run.caseField,
    'jobs',
    'productionCases',
    'standardDimensionCases'
  ]);
  const dimensionalChecks = numberFrom(data, ['dimensionalChecks', 'standardDimensionalChecks', 'checks'])
    || (Array.isArray(data.dimensionMismatches) ? cases * 4 : 0);
  const dimensionalMismatches = numberFrom(data, ['dimensionalMismatchCount', 'mismatchCount'])
    || arrayLength(data.dimensionMismatches)
    || arrayLength(data.unexpectedDropDeltas);
  const reservationMismatches = numberFrom(data, [
    'rpsReservationMismatchCount',
    'reservationMismatchCount',
    'reservationGapCount',
    'excelReservationMismatchCount'
  ]) || arrayLength(data.reservationMismatches);
  const reservationChecks = numberFrom(data, [
    'reservationOfsCheckedInRps',
    'reservationOfsChecked',
    'reservationFilesChecked',
    'reservationChecks'
  ]) || numberFrom(data.currentReservationBaseline || {}, ['ofs']);
  const notUploaded = Array.isArray(data.reservationOfsNotUploaded)
    ? data.reservationOfsNotUploaded.length
    : numberFrom(data, ['reservationOfsNotUploaded']);
  const ordersFound = numberFrom(data, [
    'rpsOrders',
    'rpsOrders2026',
    'galiciaOrdersInCombinedSource',
    'galiciaOrdersFoundInPdfs',
    'reservationOfsInExcel'
  ]);
  const hasDifferences = dimensionalMismatches > 0 || reservationMismatches > 0 || notUploaded > 0;
  const status = cases === 0 ? 'NO_DATA' : hasDifferences ? 'REVIEW' : 'MATCH';

  return {
    model,
    year: run.year,
    status,
    ordersFound,
    matchedExcelFiles: numberFrom(data, ['matchedExcelFiles']),
    cases,
    dimensionalChecks,
    dimensionalMismatches,
    reservationChecks,
    reservationMismatches,
    notUploaded,
    detailsFile: run.detailsFile,
    exitCode: run.exitCode
  };
}

function failedModelResult(run, model) {
  return {
    model,
    year: run.year,
    status: 'ERROR',
    ordersFound: 0,
    matchedExcelFiles: 0,
    cases: 0,
    dimensionalChecks: 0,
    dimensionalMismatches: 0,
    reservationChecks: 0,
    reservationMismatches: 0,
    notUploaded: 0,
    detailsFile: run.detailsFile,
    exitCode: run.exitCode,
    error: run.parseError || run.stderr || 'El validador no devolvió datos.'
  };
}

function aggregateStatus(results) {
  if (results.some((item) => item.status === 'ERROR')) return 'ERROR';
  if (results.every((item) => item.status === 'NO_DATA')) return 'NO_DATA';
  if (results.some((item) => item.status === 'REVIEW')) return 'REVIEW';
  return 'MATCH';
}

function yearEnvironment(year) {
  return {
    TOLDOS_EXCEL_ROOT: `Y:\\${year}\\TOLDOS`,
    RPS_PLANTEAMIENTOS_ROOT: `\\\\192.168.0.128\\RPS\\VENTAS\\PLANTEAMIENTOS\\${year}`,
    RPS_DATE_FROM: `${year}-01-01`,
    RPS_DATE_TO: `${year + 1}-01-01`,
    RPS_VALIDATION_YEAR: String(year),
    DOTENV_CONFIG_QUIET: 'true'
  };
}

function executeNode(script, extraEnv) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      cwd: projectRoot,
      env: { ...process.env, ...extraEnv },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => resolve({ exitCode: -1, stdout, stderr: `${stderr}\n${error.message}`.trim() }));
    child.on('close', (exitCode) => resolve({ exitCode: exitCode ?? -1, stdout, stderr: stderr.trim() }));
  });
}

function parseLastJson(stdout) {
  const lines = String(stdout).split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index] !== '{') continue;
    const candidate = lines.slice(index).join('\n').trim();
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue looking for an earlier top-level JSON object.
    }
  }
  throw new Error(`No se pudo localizar el JSON final. Salida: ${String(stdout).slice(0, 500)}`);
}

async function mapConcurrent(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function renderConsoleSummary(report) {
  const lines = report.models.map((item) => [
    item.status.padEnd(7),
    item.model.padEnd(18),
    `casos=${String(item.cases).padStart(4)}`,
    `checks=${String(item.dimensionalChecks).padStart(5)}`,
    `dif.dim=${String(item.dimensionalMismatches).padStart(3)}`,
    `dif.RPS=${String(item.reservationMismatches).padStart(3)}`,
    `sin subir=${String(item.notUploaded).padStart(3)}`
  ].join('  '));
  return [
    ...lines,
    '',
    `TOTAL: ${report.totals.cases} casos, ${report.totals.dimensionalChecks} comprobaciones dimensionales, `
      + `${report.totals.dimensionalMismatches} diferencias dimensionales y `
      + `${report.totals.reservationMismatches} diferencias de reserva.`
  ].join('\n');
}

function renderMarkdown(report) {
  const rows = report.models.map((item) => (
    `| ${item.model} | ${item.status} | ${item.cases} | ${item.dimensionalChecks} | `
      + `${item.dimensionalMismatches} | ${item.reservationChecks} | ${item.reservationMismatches} | ${item.notUploaded} |`
  ));
  return [
    '# Validación de pedidos reales RPS',
    '',
    `Generado: ${report.generatedAt}`,
    '',
    `Años: ${report.scope.years.join(', ')}. El límite superior de fecha es exclusivo.`,
    '',
    '| Modelo | Estado | Casos | Checks dimensión | Dif. dimensión | OF comprobadas | Dif. RPS | Sin subir |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...rows,
    '',
    `Total: ${report.totals.cases} casos y ${report.totals.dimensionalChecks} comprobaciones dimensionales.`,
    '',
    'Los estados REVIEW no se ocultan: pueden ser excepciones históricas conocidas, pedidos aún no subidos o diferencias que requieren corrección. El detalle completo está en `report.json` y `details/`.',
    ''
  ].join('\n');
}

function parseYears(value) {
  const result = [...new Set(String(value).split(',')
    .map((item) => Number(item.trim()))
    .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100))].sort();
  if (result.length === 0) throw new Error('RPS_VALIDATION_YEARS debe contener años separados por comas.');
  return result;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function numberFrom(object, fields) {
  for (const field of fields) {
    const value = Number(object?.[field]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function arrayLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

function sum(items, field) {
  return items.reduce((total, item) => total + (Number(item[field]) || 0), 0);
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
