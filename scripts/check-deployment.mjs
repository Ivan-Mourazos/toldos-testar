import { constants as fsConstants } from 'node:fs';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { comprobarCarpetaBorradores, comprobarCarpetaInternaRemolques, comprobarCarpetasRemolques, comprobarChromium } from './lib/deploy-remolques.mjs';

// 22.18: desde la pantalla de remolques, `node src/server.js` importa ficheros .ts (materiales,
// pedido-rps...) y solo Node >= 22.18 los ejecuta sin flags (type-stripping activado por
// defecto). Con uno anterior el servidor entero, toldos incluido, no llega a arrancar.
const MINIMUM_NODE = [22, 18, 0];
const DATABASE_KEYS = [
  'DB_SERVER',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_DATABASE',
  'DB_COMPANY'
];
const EFFECTIVE_ENV_KEYS = [
  'NODE_ENV',
  'HOST',
  'PORT',
  'ENABLE_HERA',
  'ENABLE_LEGACY_EXPORTS',
  'ENABLE_FILE_WRITES',
  'REVIEW_DIRECTORY',
  'PLANTEAMIENTOS_DIRECTORY',
  'RPS_UPLOAD_DIRECTORY',
  'RPS_PLANTEAMIENTOS_DIRECTORY',
  'REMOLQUES_PLANTEAMIENTOS_DIRECTORY',
  'REMOLQUES_OFICINA_TECNICA_DIRECTORY',
  'REMOLQUES_REVISION_DIRECTORY',
  'DRAFTS_DIRECTORY',
  'WORKFLOW_SETTINGS_FILE',
  'COORDINA_URL',
  'COORDINA_CLAVE',
  ...DATABASE_KEYS
];

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const failures = [];
const warnings = [];
const successes = [];

await checkNodeVersion();
await checkPackageMetadata();
await checkProductionBuild();
await checkChromium();
await checkEcosystem();
await checkEnvironment();

for (const message of successes) console.log(`[OK] ${message}`);
for (const message of warnings) console.warn(`[AVISO] ${message}`);
for (const message of failures) console.error(`[ERROR] ${message}`);

console.log(
  `\nResultado: ${successes.length} comprobaciones correctas, ${warnings.length} avisos y ${failures.length} errores.`
);

// process.exit y no exitCode: un manejador abierto (p. ej. Chromium) no puede dejar colgado el despliegue.
process.exit(failures.length > 0 ? 1 : 0);

async function checkNodeVersion() {
  const current = parseVersion(process.versions.node);
  if (!current || compareVersions(current, MINIMUM_NODE) < 0) {
    fail(`Node ${formatVersion(MINIMUM_NODE)} o superior es obligatorio; versión detectada: ${process.version}.`);
    return;
  }

  pass(`Node ${process.version} cumple el mínimo ${formatVersion(MINIMUM_NODE)}.`);
}

async function checkPackageMetadata() {
  const packageFile = path.join(projectDirectory, 'package.json');
  const nvmFile = path.join(projectDirectory, '.nvmrc');

  try {
    const packageJson = JSON.parse(await readFile(packageFile, 'utf8'));
    // Sale del mismo MINIMUM_NODE que la comprobación de arriba: si se sube uno y no el otro,
    // el despliegue se bloquea sin motivo (pasó al subir el mínimo a 22.18).
    const engineEsperado = `>=${formatVersion(MINIMUM_NODE)}`;
    if (packageJson.engines?.node !== engineEsperado) {
      fail(`package.json no fija engines.node en ${engineEsperado}.`);
    } else {
      pass('package.json fija la versión mínima de Node.');
    }

    if (packageJson.packageManager !== 'pnpm@12.5.1') {
      fail('package.json no fija packageManager en pnpm@12.5.1, la del servidor.');
    } else {
      pass('package.json fija la versión de pnpm.');
    }
  } catch (error) {
    fail(`No se pudo leer package.json: ${error.message}`);
  }

  try {
    const nvmVersion = (await readFile(nvmFile, 'utf8')).trim();
    if (nvmVersion !== '24.17.0') {
      fail('.nvmrc no fija la versión recomendada Node 24.17.0.');
    } else {
      pass('.nvmrc fija Node 24.17.0 para reproducir el entorno validado.');
    }
  } catch (error) {
    fail(`No se pudo leer .nvmrc: ${error.message}`);
  }
}

async function checkProductionBuild() {
  const indexFile = path.join(projectDirectory, 'dist', 'index.html');

  try {
    const details = await stat(indexFile);
    if (!details.isFile() || details.size === 0) {
      fail('dist/index.html no es un archivo de producción válido. Ejecuta pnpm build.');
      return;
    }
    pass('dist/index.html existe y no está vacío.');
  } catch {
    fail('Falta dist/index.html. Ejecuta pnpm build antes de iniciar PM2.');
  }
  await checkHojaRemolques();
}

// La hoja de taller de remolques (fase 4) es la segunda página del build. En desarrollo se ve con
// `?muestra=…` sin pasar por el servidor; en producción esa puerta no puede existir.
async function checkHojaRemolques() {
  try {
    await stat(path.join(projectDirectory, 'dist', 'hoja-remolques.html'));
  } catch {
    fail('Falta dist/hoja-remolques.html (hoja de taller de remolques). Ejecuta pnpm build.');
    return;
  }
  const carpeta = path.join(projectDirectory, 'dist', 'assets');
  let trozos;
  try {
    trozos = (await readdir(carpeta)).filter((nombre) => nombre.endsWith('.js'));
  } catch {
    fail('Falta dist/assets. Ejecuta pnpm build.');
    return;
  }
  const conMuestra = [];
  for (const nombre of trozos) {
    if (/muestra/i.test(nombre) || /\.get\(\s*["'`]muestra["'`]\s*\)/.test(await readFile(path.join(carpeta, nombre), 'utf8'))) {
      conMuestra.push(nombre);
    }
  }
  if (conMuestra.length > 0) {
    fail(`El build lleva la muestra de desarrollo de la hoja de remolques (${conMuestra.join(', ')}). Ejecuta pnpm build de nuevo.`);
  } else {
    pass('dist/hoja-remolques.html existe y el build no lleva las muestras de desarrollo.');
  }
}

// La hoja de taller de remolques se hace con el Chromium de playwright-core (fase 4).
async function checkChromium() {
  let paquete;
  try {
    paquete = JSON.parse(await readFile(path.join(projectDirectory, 'package.json'), 'utf8'));
  } catch (error) {
    fail(`No se pudo leer package.json: ${error.message}`);
    return;
  }
  const resultado = await comprobarChromium({ paquete, importarPlaywright: () => import('playwright-core') });
  resultado.errores.forEach(fail);
  resultado.exitos.forEach(pass);
}

async function checkEcosystem() {
  const ecosystemFile = path.join(projectDirectory, 'ecosystem.config.cjs');
  const initialFailureCount = failures.length;

  try {
    const ecosystem = require(ecosystemFile);
    const apps = ecosystem?.apps;
    if (!Array.isArray(apps) || apps.length !== 1) {
      fail('ecosystem.config.cjs debe declarar exactamente una aplicación.');
      return;
    }

    const app = apps[0];
    const expected = {
      name: 'toldos-testar',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      wait_ready: true,
      kill_timeout: 15000,
      max_memory_restart: '768M'
    };

    for (const [key, value] of Object.entries(expected)) {
      if (app[key] !== value) {
        fail(`ecosystem.config.cjs tiene un valor incorrecto para ${key}.`);
      }
    }

    if (normalizePath(app.cwd) !== normalizePath(projectDirectory)) {
      fail('El cwd de PM2 no apunta a la raíz del proyecto.');
    }

    const serverFile = path.resolve(app.cwd || projectDirectory, app.script || '');
    if (normalizePath(serverFile) !== normalizePath(path.join(projectDirectory, 'src', 'server.js'))) {
      fail('PM2 no ejecuta directamente src/server.js.');
    } else {
      await access(serverFile, fsConstants.R_OK);
    }

    if (app.env?.NODE_ENV !== 'production') {
      fail('PM2 debe definir NODE_ENV=production.');
    }
    if (!['true', 'false'].includes(app.env?.ENABLE_HERA)) {
      fail('PM2 debe definir ENABLE_HERA como true o false.');
    }
    if (app.env?.ENABLE_LEGACY_EXPORTS !== 'false') {
      fail('PM2 debe mantener cerradas las exportaciones directas antiguas.');
    }

    if ('out_file' in app || 'error_file' in app || 'log_file' in app) {
      warn('PM2 tiene rutas de log personalizadas; se recomiendan sus logs predeterminados.');
    }

    if (failures.length === initialFailureCount) {
      pass('ecosystem.config.cjs tiene una configuración PM2 válida sin requerir PM2 instalado.');
    }
  } catch (error) {
    fail(`No se pudo cargar ecosystem.config.cjs: ${error.message}`);
  }
}

async function checkEnvironment() {
  const environmentFile = path.join(projectDirectory, '.env');
  let contents;

  try {
    contents = await readFile(environmentFile, 'utf8');
  } catch {
    fail('Falta .env. Créalo a partir de .env.example y limita sus permisos.');
    return;
  }

  const parsed = parseEnvironment(contents);
  for (const lineNumber of parsed.invalidLines) {
    fail(`.env contiene una línea no válida en la posición ${lineNumber}.`);
  }
  for (const key of parsed.duplicateKeys) {
    warn(`.env repite la variable ${key}; se utilizará la última definición.`);
  }

  if (parsed.values.size === 0) {
    fail('.env no contiene variables configuradas.');
    return;
  }
  pass('.env existe y se ha analizado sin mostrar sus valores.');

  const effectiveValues = applyProcessEnvironment(parsed.values);
  checkNetworkEnvironment(effectiveValues);
  checkDatabaseEnvironment(effectiveValues);
  checkCoordinaEnvironment(effectiveValues);
  await checkWorkflowEnvironment(effectiveValues);
  await checkEnvironmentPermissions(environmentFile);
}

function applyProcessEnvironment(fileValues) {
  const effectiveValues = new Map(fileValues);
  for (const key of EFFECTIVE_ENV_KEYS) {
    if (!Object.hasOwn(process.env, key)) continue;
    const processValue = String(process.env[key] ?? '');
    if (effectiveValues.has(key) && unquote(effectiveValues.get(key)) !== processValue) {
      warn(`${key} está definido en el proceso y prevalece sobre .env; se ha validado el valor efectivo.`);
    }
    effectiveValues.set(key, processValue);
  }
  return effectiveValues;
}

function checkNetworkEnvironment(values) {
  const port = unquote(values.get('PORT'));
  if (!port) {
    warn('.env no define PORT; se utilizará el valor predeterminado de la aplicación.');
  } else if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    fail('.env define PORT con un valor no válido.');
  }

  if (!hasValue(values, 'HOST')) {
    warn('.env no define HOST; configúralo explícitamente para el despliegue Linux.');
  }
}

function checkDatabaseEnvironment(values) {
  for (const key of DATABASE_KEYS) {
    if (!hasValue(values, key)) {
      warn(`.env no define ${key}; el catálogo RPS podría no estar disponible.`);
    }
  }

  const dbPort = unquote(values.get('DB_PORT'));
  if (dbPort && (!/^\d+$/.test(dbPort) || Number(dbPort) < 1 || Number(dbPort) > 65535)) {
    fail('.env define DB_PORT con un valor no válido.');
  }
}

// «Generar archivos» pregunta a CoordinaOT por cada OF y, sin respuesta, no genera nada.
// Por eso en producción faltar la URL o la clave es un error, no un aviso: el despliegue
// pasaría en verde y el primer síntoma sería un técnico que no puede generar. Fuera de
// producción (desarrollo, pruebas) basta un aviso, porque ahí es normal no tenerlo.
function checkCoordinaEnvironment(values) {
  const inProduction = unquote(values.get('NODE_ENV')).toLowerCase() === 'production';
  const report = inProduction ? fail : warn;
  const url = unquote(values.get('COORDINA_URL'));
  const hasKey = hasValue(values, 'COORDINA_CLAVE');
  let urlOk = false;
  if (!url) {
    report('.env no define COORDINA_URL; sin ella «Generar archivos» no puede consultar CoordinaOT (p. ej. http://127.0.0.1:4300).');
  } else if (!isHttpUrl(url)) {
    report('.env define COORDINA_URL con un valor que no es una dirección http(s).');
  } else {
    urlOk = true;
  }
  if (!hasKey) report('.env no define COORDINA_CLAVE; debe ser la misma clave que INTEGRACION_CLAVE en CoordinaOT.');
  if (urlOk && hasKey) pass('La conexión con CoordinaOT está configurada (URL y clave definidas; la clave no se muestra).');
}

function isHttpUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

async function checkWorkflowEnvironment(values) {
  const heraEnabled = unquote(values.get('ENABLE_HERA')).toLowerCase();
  if (!heraEnabled) {
    pass('HERA utiliza la configuración explícita de PM2.');
  } else if (heraEnabled !== 'true' && heraEnabled !== 'false') {
    fail('.env define ENABLE_HERA con un valor distinto de true o false.');
  } else if (heraEnabled === 'true') {
    pass('HERA habilitado; se conservan las validaciones del pedido y de la reserva.');
  } else {
    pass('HERA permanece desactivado en producción.');
  }

  const legacyExports = unquote(values.get('ENABLE_LEGACY_EXPORTS')).toLowerCase();
  if (legacyExports && legacyExports !== 'true' && legacyExports !== 'false') {
    fail('.env define ENABLE_LEGACY_EXPORTS con un valor distinto de true o false.');
  } else if (legacyExports === 'true') {
    fail('ENABLE_LEGACY_EXPORTS=true no está autorizado en el despliegue de producción.');
  } else {
    pass('Las exportaciones directas antiguas permanecen cerradas en producción.');
  }

  const writes = unquote(values.get('ENABLE_FILE_WRITES')).toLowerCase();
  if (!writes) {
    warn('.env no define ENABLE_FILE_WRITES; el modo de escritura dependerá de la configuración guardada.');
  } else if (writes !== 'true' && writes !== 'false') {
    fail('.env define ENABLE_FILE_WRITES con un valor distinto de true o false.');
  } else if (writes === 'false') {
    warn('ENABLE_FILE_WRITES está desactivado; revisa la configuración antes de pasar a producción.');
  }

  const settingsFile = unquote(values.get('WORKFLOW_SETTINGS_FILE'));
  const envIsProduction = unquote(values.get('NODE_ENV')).toLowerCase() === 'production';
  const seedSettings = {
    productionEnabled: writes === 'true',
    reviewDirectory: unquote(values.get('REVIEW_DIRECTORY')),
    planteamientosDirectory: unquote(values.get('PLANTEAMIENTOS_DIRECTORY')),
    rpsUploadDirectory: unquote(values.get('RPS_UPLOAD_DIRECTORY')),
    rpsPlanteamientosDirectory: unquote(values.get('RPS_PLANTEAMIENTOS_DIRECTORY')),
    remolquesPlanteamientosDirectory: unquote(values.get('REMOLQUES_PLANTEAMIENTOS_DIRECTORY')),
    remolquesOficinaTecnicaDirectory: unquote(values.get('REMOLQUES_OFICINA_TECNICA_DIRECTORY')),
    remolquesRevisionDirectory: unquote(values.get('REMOLQUES_REVISION_DIRECTORY')),
    draftsDirectory: unquote(values.get('DRAFTS_DIRECTORY'))
  };
  let persistedSettings = null;

  if (!settingsFile) {
    warn('WORKFLOW_SETTINGS_FILE no está definido; la configuración quedaría dentro del proyecto.');
  } else {
    await inspectLinuxPath('WORKFLOW_SETTINGS_FILE', path.dirname(settingsFile), { required: envIsProduction });
    try {
      persistedSettings = JSON.parse(await readFile(settingsFile, 'utf8'));
      pass('La configuración persistente de la interfaz existe y se ha analizado.');
    } catch (error) {
      if (error.code === 'ENOENT') {
        warn('La configuración persistente aún no existe; en el primer arranque se usarán las semillas de .env.');
      } else {
        fail(`No se pudo analizar WORKFLOW_SETTINGS_FILE: ${error.message}`);
      }
    }
  }

  const effectiveSettings = persistedSettings
    ? {
        productionEnabled: persistedSettings.productionEnabled === true,
        reviewDirectory: stringOrFallback(persistedSettings.reviewDirectory, seedSettings.reviewDirectory),
        planteamientosDirectory: stringOrFallback(persistedSettings.planteamientosDirectory, seedSettings.planteamientosDirectory),
        rpsUploadDirectory: stringOrFallback(persistedSettings.rpsUploadDirectory, seedSettings.rpsUploadDirectory),
        rpsPlanteamientosDirectory: stringOrFallback(persistedSettings.rpsPlanteamientosDirectory, seedSettings.rpsPlanteamientosDirectory),
        remolquesPlanteamientosDirectory: stringOrFallback(persistedSettings.remolquesPlanteamientosDirectory, seedSettings.remolquesPlanteamientosDirectory),
        remolquesOficinaTecnicaDirectory: stringOrFallback(persistedSettings.remolquesOficinaTecnicaDirectory, seedSettings.remolquesOficinaTecnicaDirectory),
        remolquesRevisionDirectory: stringOrFallback(persistedSettings.remolquesRevisionDirectory, seedSettings.remolquesRevisionDirectory),
        draftsDirectory: stringOrFallback(persistedSettings.draftsDirectory, seedSettings.draftsDirectory)
      }
    : seedSettings;

  if (persistedSettings) {
    for (const [key, persistedKey] of [
      ['REVIEW_DIRECTORY', 'reviewDirectory'],
      ['PLANTEAMIENTOS_DIRECTORY', 'planteamientosDirectory'],
      ['RPS_UPLOAD_DIRECTORY', 'rpsUploadDirectory'],
      ['RPS_PLANTEAMIENTOS_DIRECTORY', 'rpsPlanteamientosDirectory']
    ]) {
      if (seedSettings[persistedKey] && effectiveSettings[persistedKey] !== seedSettings[persistedKey]) {
        warn(`${key} difiere del JSON persistente; se ha validado el valor persistido, que es el efectivo.`);
      }
    }
    if (effectiveSettings.productionEnabled !== seedSettings.productionEnabled) {
      warn('El interruptor persistido de producción prevalece sobre ENABLE_FILE_WRITES de .env.');
    }
  }

  const strictDeployment = envIsProduction || effectiveSettings.productionEnabled;
  for (const [key, persistedKey, writable] of [
    ['REVIEW_DIRECTORY', 'reviewDirectory', true],
    ['PLANTEAMIENTOS_DIRECTORY', 'planteamientosDirectory', true],
    ['RPS_UPLOAD_DIRECTORY', 'rpsUploadDirectory', true],
    ['RPS_PLANTEAMIENTOS_DIRECTORY', 'rpsPlanteamientosDirectory', false]
  ]) {
    const configuredPath = effectiveSettings[persistedKey];
    if (!configuredPath) {
      reportPathProblem(`${key} no está definido en la configuración efectiva.`, strictDeployment);
      continue;
    }
    await inspectLinuxPath(key, configuredPath, { template: true, required: strictDeployment, writable });
  }

  const remolques = await comprobarCarpetasRemolques({
    planteamientos: effectiveSettings.remolquesPlanteamientosDirectory,
    oficinaTecnica: effectiveSettings.remolquesOficinaTecnicaDirectory,
    escrituraActiva: effectiveSettings.productionEnabled,
    estricto: strictDeployment
  });
  remolques.errores.forEach(fail);
  remolques.avisos.forEach(warn);
  remolques.exitos.forEach(pass);

  const interna = await comprobarCarpetaInternaRemolques({
    carpeta: effectiveSettings.remolquesRevisionDirectory,
    estricto: strictDeployment
  });
  interna.errores.forEach(fail);
  interna.avisos.forEach(warn);
  interna.exitos.forEach(pass);

  const borradores = await comprobarCarpetaBorradores({
    carpeta: effectiveSettings.draftsDirectory,
    estricto: strictDeployment
  });
  borradores.errores.forEach(fail);
  borradores.avisos.forEach(warn);
  borradores.exitos.forEach(pass);

  if (effectiveSettings.productionEnabled) pass('El interruptor persistido permite el flujo completo de producción.');
  else warn('El envío a producción está desactivado en la configuración efectiva.');
}

async function inspectLinuxPath(key, configuredPath, options = {}) {
  if (looksLikeWindowsPath(configuredPath)) {
    reportPathProblem(`${key} usa una ruta de Windows/UNC; sustitúyela por un punto de montaje Linux.`, options.required);
    return;
  }

  if (!path.posix.isAbsolute(configuredPath)) {
    reportPathProblem(`${key} no usa una ruta Linux absoluta.`, options.required);
    return;
  }

  const pathToCheck = options.template
    ? configuredPath.split('{YYYY}', 1)[0].replace(/\/$/, '') || '/'
    : configuredPath;

  try {
    const mode = options.writable === false ? fsConstants.R_OK : fsConstants.R_OK | fsConstants.W_OK;
    await access(pathToCheck, mode);
    pass(`${key} apunta a una ubicación accesible para ${options.writable === false ? 'lectura' : 'lectura y escritura'}.`);
  } catch {
    reportPathProblem(`${key} apunta a una ubicación inexistente o sin permisos de lectura/escritura.`, options.required);
  }
}

function reportPathProblem(message, required) {
  if (required) fail(message);
  else warn(message);
}

function stringOrFallback(value, fallback) {
  return typeof value === 'string' ? value.trim() : fallback;
}

async function checkEnvironmentPermissions(environmentFile) {
  if (process.platform === 'win32') return;

  try {
    const details = await stat(environmentFile);
    if ((details.mode & 0o077) !== 0) {
      warn('.env puede ser leído por otros usuarios; aplica chmod 600 .env.');
    } else {
      pass('.env tiene permisos restringidos.');
    }
  } catch {
    warn('No se pudieron comprobar los permisos de .env.');
  }
}

function parseEnvironment(contents) {
  const values = new Map();
  const invalidLines = [];
  const duplicateKeys = [];

  for (const [index, originalLine] of contents.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = originalLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=([\s\S]*)$/.exec(line);
    if (!match) {
      invalidLines.push(index + 1);
      continue;
    }

    const [, key, value] = match;
    if (values.has(key)) duplicateKeys.push(key);
    values.set(key, value.trim());
  }

  return { values, invalidLines, duplicateKeys };
}

function hasValue(values, key) {
  return unquote(values.get(key)).length > 0;
}

function unquote(value = '') {
  const text = String(value).trim();
  if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
    return text.slice(1, -1);
  }
  return text;
}

function looksLikeWindowsPath(value) {
  return /^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value) || value.startsWith('//') || value.includes('\\');
}

function normalizePath(value) {
  const resolved = path.resolve(String(value || ''));
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function formatVersion(version) {
  return version.join('.');
}

function pass(message) {
  successes.push(message);
}

function warn(message) {
  warnings.push(message);
}

function fail(message) {
  failures.push(message);
}
