import http from 'node:http';
import { afterEach, expect, it } from 'vitest';
import { crearCierreHttp } from './cierreHttp.js';

const servidores = [];
afterEach(async () => { await Promise.all(servidores.splice(0).map(s => new Promise(resolve => { s.closeAllConnections(); s.close(resolve); }))); });

it('rechaza peticiones nuevas con 503 y Connection close durante el cierre', async () => {
  const cierre = crearCierreHttp();
  const server = http.createServer((req, res) => cierre.middleware(req, res, () => res.end('ok')));
  servidores.push(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  cierre.iniciar();
  const r = await fetch(`http://127.0.0.1:${server.address().port}`);
  expect(r.status).toBe(503);
  expect(r.headers.get('connection')).toBe('close');
  expect(await r.json()).toHaveProperty('error', expect.stringContaining('El servidor se está cerrando'));
});

it('marca también las respuestas que estaban en marcha para cerrar su conexión', () => {
  const cierre = crearCierreHttp();
  const res = { headersSent: false, once() {}, setHeader(nombre, valor) { this[nombre] = valor; } };
  cierre.middleware({}, res, () => {});
  cierre.iniciar();
  expect(res.Connection).toBe('close');
});
