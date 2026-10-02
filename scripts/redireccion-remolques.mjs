// Fase 6 de remolques (Iván, 02/10/2026): la web vieja (PM2 `remolques-tgm`, puerto 4500) se
// retira y su puerto lleva a Planteamientos TGM, para que los favoritos de cada puesto sigan
// sirviendo. Solo redirige: no lee ni escribe nada.
//
// En el servidor, desde /webs/toldos-testar:
//   pm2 start scripts/redireccion-remolques.mjs --name remolques-redireccion
// Variables opcionales: REDIRECCION_PUERTO (4500) y DESTINO_PUERTO (4400).
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const SERVIDOR = '192.168.0.90';
const NOMBRE_VALIDO = /^[A-Za-z0-9.-]+$/;

/** A dónde mandar a quien llega: el mismo servidor por el que entró, en el puerto de la web nueva. */
export function destinoRedireccion(host, puertoDestino) {
  const nombre = String(host || '').split(':')[0];
  return `http://${NOMBRE_VALIDO.test(nombre) ? nombre : SERVIDOR}:${puertoDestino}/`;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const puerto = Number(process.env.REDIRECCION_PUERTO) || 4500;
  const destino = Number(process.env.DESTINO_PUERTO) || 4400;
  http.createServer((req, res) => {
    res.writeHead(302, { Location: destinoRedireccion(req.headers.host, destino), 'Cache-Control': 'no-store' });
    res.end('Remolques está ahora en Planteamientos TGM.');
  }).listen(puerto, () => console.log(`Redirigiendo el ${puerto} a Planteamientos TGM (${destino}).`));
}
