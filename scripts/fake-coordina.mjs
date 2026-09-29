// CoordinaOT simulado para la instancia aislada (4310) y las pruebas e2e: responde a
// /api/integracion/ofs como el de verdad, con todas las OF aprobadas por defecto para
// que las pruebas que generan archivos sigan funcionando. Nunca se usa contra el real.
//   POST /__estado {"ofs":{"0230195":{"estado":"devuelta","nota":"…"}}}  fija estados
//   POST /__caido {"caido":true}                                            responde 500
//   POST /__reset                                                           todo aprobado
import http from 'node:http';

const port = Number(process.env.FAKE_COORDINA_PORT || 4320);
const key = process.env.COORDINA_CLAVE || 'clave-de-prueba';
let states = {};
let down = false;

async function body(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}

const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
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

// Si ya hay un simulado escuchando (p. ej. al relanzar start-isolated.sh sin haberlo
// parado) esta copia se retira en silencio: la que sigue viva basta para las pruebas.
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`Puerto ${port} ya en uso; se asume que el simulado ya está arrancado.`);
    process.exit(0);
  }
  throw error;
});

server.listen(port, '127.0.0.1', () => console.log(`CoordinaOT simulado en http://127.0.0.1:${port}`));
