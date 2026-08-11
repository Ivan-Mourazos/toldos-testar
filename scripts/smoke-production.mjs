import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const temporaryRoot = path.join(os.tmpdir(), `toldos-testar-smoke-${process.pid}`);
const port = await reservePort();
const child = spawn(process.execPath, ['src/server.js'], {
  cwd: projectDirectory,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: String(port),
    ENABLE_HERA: 'false',
    ENABLE_LEGACY_EXPORTS: 'false',
    ENABLE_FILE_WRITES: 'false',
    REVIEW_DIRECTORY: path.join(temporaryRoot, '{YYYY}', 'reviews'),
    PLANTEAMIENTOS_DIRECTORY: path.join(temporaryRoot, '{YYYY}', 'planteamientos'),
    RPS_UPLOAD_DIRECTORY: path.join(temporaryRoot, 'rps'),
    EXPORT_DIRECTORY: path.join(temporaryRoot, 'rps'),
    ORDER_ARCHIVE_ROOT: path.join(temporaryRoot, 'pedidos'),
    WORKFLOW_SETTINGS_FILE: path.join(temporaryRoot, 'workflow-settings.json')
  },
  stdio: ['ignore', 'pipe', 'pipe', 'ipc']
});

let output = '';
child.stdout.on('data', (chunk) => { output += chunk; });
child.stderr.on('data', (chunk) => { output += chunk; });

let failure = null;
try {
  await waitUntilReady(child);
  const baseUrl = `http://127.0.0.1:${port}`;

  const health = await readJson(`${baseUrl}/api/health`);
  assert(health.response.ok && health.body.ok === true, 'El healthcheck no respondió correctamente.');

  const catalog = await readJson(`${baseUrl}/api/catalog`);
  assert(catalog.response.ok, 'No se pudo leer el catálogo.');
  assert(catalog.body.features?.heraEnabled === false, 'El catálogo no marca HERA como desactivado.');
  assert(!catalog.body.models?.some((model) => model.code === 'HERA'), 'HERA sigue visible en el catálogo de producción.');

  const heraAttempt = await readJson(`${baseUrl}/api/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ awnings: [{ id: 'smoke-hera', model: 'HERA', workType: 'FULL_AWNING' }] })
  });
  assert(heraAttempt.response.status === 409, 'La API de producción no bloqueó un pedido HERA.');

  const legacyReservation = { orderCode: 'AR26SMOKE', ofs: [{ of: '0230001', materials: [] }] };
  for (const route of ['/api/export', '/api/export/save']) {
    const legacyAttempt = await readJson(`${baseUrl}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(legacyReservation)
    });
    assert(legacyAttempt.response.status === 410, `${route} sigue abierto en producción.`);
  }

  const homepage = await fetch(baseUrl, { headers: { Accept: 'text/html' } });
  assert(homepage.ok && (await homepage.text()).includes('<div id="root">'), 'El frontend de producción no está disponible.');

  console.log('[OK] Healthcheck, frontend y catálogo de producción disponibles.');
  console.log('[OK] HERA está oculto y bloqueado en producción.');
  console.log('[OK] Las exportaciones directas antiguas están cerradas en producción.');
} catch (error) {
  failure = error;
} finally {
  const exit = await stopChild(child);
  if (process.platform !== 'win32' && exit.code !== 0 && !failure) {
    failure = new Error(`El servidor no terminó limpiamente (código ${exit.code}, señal ${exit.signal || 'ninguna'}).`);
  }
}

if (failure) {
  console.error(`[ERROR] ${failure.message}`);
  if (output.trim()) console.error(output.trim().slice(-12_000));
  process.exitCode = 1;
} else {
  console.log('[OK] Prueba de humo de producción completada.');
}

async function reservePort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const address = socket.address();
  await new Promise((resolve, reject) => socket.close((error) => (error ? reject(error) : resolve())));
  return address.port;
}

async function waitUntilReady(processHandle) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('El servidor no quedó listo en 15 segundos.')), 15_000);
    const onMessage = (message) => {
      if (message === 'ready') finish();
    };
    const onExit = (code, signal) => finish(new Error(`El servidor terminó antes de estar listo (${code ?? signal}).`));
    const onError = (error) => finish(error);
    const finish = (error) => {
      clearTimeout(timeout);
      processHandle.off('message', onMessage);
      processHandle.off('exit', onExit);
      processHandle.off('error', onError);
      if (error) reject(error);
      else resolve();
    };

    processHandle.on('message', onMessage);
    processHandle.once('exit', onExit);
    processHandle.once('error', onError);
  });
}

async function readJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { response, body };
}

async function stopChild(processHandle) {
  if (processHandle.exitCode !== null || processHandle.signalCode !== null) {
    return { code: processHandle.exitCode, signal: processHandle.signalCode };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      processHandle.kill('SIGKILL');
      resolve({ code: 1, signal: 'SIGKILL' });
    }, 15_000);
    processHandle.once('exit', (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
    processHandle.kill('SIGTERM');
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
