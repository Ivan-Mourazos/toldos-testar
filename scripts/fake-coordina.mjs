// CoordinaOT simulado para la instancia aislada (4310) y las pruebas e2e: responde a
// /api/integracion/ofs como el de verdad, con todas las OF aprobadas por defecto para
// que las pruebas que generan archivos sigan funcionando. Nunca se usa contra el real.
//   POST /__estado {"ofs":{"0230195":{"estado":"devuelta","nota":"…"}}}  fija estados
//   POST /__caido {"caido":true}                                            responde 500
//   POST /__reset                                                           todo aprobado
// Sirve también como ayudante de las pruebas e2e que lanzan su propio servidor:
// `startFakeCoordina({ port: 0 })` devuelve { url, key, close } sobre un puerto libre.
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const defaultKey = 'clave-de-prueba';

async function body(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}

const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};

// El estado vive dentro de cada instancia: así varias pruebas pueden tener su propio
// simulado a la vez sin pisarse. Con port 0 el sistema elige un puerto libre.
export function startFakeCoordina({ port = 0, key = defaultKey } = {}) {
  let states = {};
  let down = false;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname === '/__estado') { Object.assign(states, (await body(req)).ofs || {}); return send(res, 200, { ok: true }); }
    if (req.method === 'POST' && url.pathname === '/__caido') { down = Boolean((await body(req)).caido); return send(res, 200, { ok: true }); }
    if (req.method === 'POST' && url.pathname === '/__reset') { states = {}; down = false; return send(res, 200, { ok: true }); }
    if (req.method === 'GET' && url.pathname === '/api/integracion/ofs') {
      if (down) return send(res, 500, { error: 'caído' });
      if (req.headers['x-clave-integracion'] !== key) return send(res, 401, { error: 'Clave no válida' });
      const ofs = (url.searchParams.get('ofs') || '').split(',').map((of) => of.trim()).filter(Boolean);
      return send(res, 200, { ofs: ofs.map((of) => ({ of, estado: 'aprobada', nota: '', actualizado: null, ...states[of] })) });
    }
    send(res, 404, { error: 'No existe' });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const { port: actual } = server.address();
      resolve({
        url: `http://127.0.0.1:${actual}`,
        key,
        port: actual,
        // closeAllConnections: el fetch del servidor mantiene conexiones vivas y sin
        // cerrarlas close() no terminaría nunca.
        close: () => new Promise((done) => { server.close(() => done()); server.closeAllConnections(); })
      });
    });
  });
}

// Uso directo (node scripts/fake-coordina.mjs): puerto y clave por entorno.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.FAKE_COORDINA_PORT || 4320);
  // Si ya hay un simulado escuchando (p. ej. al relanzar start-isolated.sh sin haberlo
  // parado) esta copia se retira en silencio: la que sigue viva basta para las pruebas.
  try {
    const fake = await startFakeCoordina({ port, key: process.env.COORDINA_CLAVE || defaultKey });
    console.log(`CoordinaOT simulado en ${fake.url}`);
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    console.log(`Puerto ${port} ya en uso; se asume que el simulado ya está arrancado.`);
    process.exit(0);
  }
}
