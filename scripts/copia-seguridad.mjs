// Copia de seguridad de los datos internos de Planteamientos (26/10/2026).
//
// QUÉ SE COPIA. Lo que la web guarda en el disco del servidor y no en la red: la Configuración
// (WORKFLOW_SETTINGS_FILE), los Parámetros y su historial, los de remolques y las fichas de cliente
// (junto a la Configuración), los pedidos de remolques y puertas con sus cortes confirmados (carpeta
// interna de remolques) y los borradores. Las dos últimas se leen de la Configuración guardada, que
// manda sobre el .env, igual que en la web. Lo que está en /mnt es de la red y ya tiene su copia.
//
// POR QUÉ SE HACE EN LOCAL Y LUEGO SE COPIA. El .tar.gz se crea y se comprueba en /tmp, y a la red
// solo va un fichero terminado: si la red se cae a medias, no queda una copia rota con nombre de buena.
//
// Uso, desde /webs/toldos-testar (lee su .env):
//   node scripts/copia-seguridad.mjs /mnt/backups-planteamientos
//
// Guarda `planteamientos-AAAA-MM-DD.tar.gz` y borra las de más de DIAS_QUE_SE_GUARDAN.
//
// DÓNDE. En el NAS de copias de IT, `\\192.168.0.248\backups_bd\Planteamientos`, montado en
// /mnt/backups-planteamientos (fstab, con `vers=2.0`: sin él el NAS rechaza la conexión). Hasta el
// 26/10/2026 iba al share de Oficina Técnica; David (IT) prefiere un NAS a un servidor.
//
// Este script no deja copia en local, así que si el NAS no está montado escribiría en el disco del
// propio servidor sin avisar. Por eso el cron de root solo lo lanza con el NAS montado:
//   30 2 * * * cd /webs/toldos-testar && if mountpoint -q /mnt/backups-planteamientos; then
//     node scripts/copia-seguridad.mjs /mnt/backups-planteamientos;
//     else echo "$(date -Is) ERROR el NAS no está montado"; fi >> /root/copia-seguridad.log 2>&1
//   (en una sola línea, con node por su ruta entera de nvm: cron no hereda el PATH).

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../src/config.js';

// El servidor es Linux: las rutas se tratan siempre como POSIX, también en las pruebas desde Windows.
const posix = path.posix;

const DIAS_QUE_SE_GUARDAN = 30;

export function carpetasACopiar(cfg, guardada = {}) {
  const candidatas = [
    posix.dirname(cfg.workflowSettingsFile),
    posix.dirname(cfg.ruleParametersFile),
    posix.dirname(cfg.remolquesParametersFile),
    posix.dirname(cfg.remolquesClientesFile),
    guardada.remolquesRevisionDirectory || cfg.remolquesRevisionDirectory,
    guardada.draftsDirectory || cfg.draftsDirectory
  ].filter(Boolean).map((c) => posix.resolve(c)).filter((c) => !c.startsWith('/mnt/'));
  const unicas = [...new Set(candidatas)].sort();
  // Una carpeta dentro de otra ya va en la de fuera.
  return unicas.filter((c) => !unicas.some((o) => o !== c && c.startsWith(o + posix.sep)));
}

export function copiasQueSobran(nombres, hoy, dias = DIAS_QUE_SE_GUARDAN) {
  const limite = new Date(hoy.getTime() - dias * 86400000).toISOString().slice(0, 10);
  return nombres.filter((n) => {
    const m = /^planteamientos-(\d{4}-\d{2}-\d{2})\.tar\.gz$/.exec(n);
    return m && m[1] < limite;
  });
}

function leerConfiguracionGuardada(fichero) {
  try {
    return JSON.parse(readFileSync(fichero, 'utf8'));
  } catch {
    return {};
  }
}

function main() {
  const destino = process.argv[2];
  if (!destino) throw new Error('Falta la carpeta de destino, p. ej. /mnt/backups-planteamientos');
  const carpetas = carpetasACopiar(config, leerConfiguracionGuardada(config.workflowSettingsFile)).filter((c) => existsSync(c));
  if (!carpetas.length) throw new Error('No hay ninguna carpeta interna que copiar: ¿se ha lanzado desde /webs/toldos-testar?');

  const dia = new Date().toISOString().slice(0, 10);
  const nombre = `planteamientos-${dia}.tar.gz`;
  const local = path.join(os.tmpdir(), nombre);
  // Rutas relativas a / para que al restaurar con `tar -xzf … -C /` vuelva cada cosa a su sitio.
  execFileSync('tar', ['-czf', local, '-C', '/', ...carpetas.map((c) => path.relative('/', c))]);
  const contenido = execFileSync('tar', ['-tzf', local], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).split('\n').filter(Boolean);
  if (!contenido.some((f) => !f.endsWith('/'))) throw new Error('La copia ha salido vacía; no se manda a la red.');

  mkdirSync(destino, { recursive: true });
  const temporal = path.join(destino, `${nombre}.parcial`);
  copyFileSync(local, temporal);
  renameSync(temporal, path.join(destino, nombre));
  rmSync(local, { force: true });

  const borradas = copiasQueSobran(readdirSync(destino), new Date());
  for (const n of borradas) rmSync(path.join(destino, n), { force: true });

  const tamano = (statSync(path.join(destino, nombre)).size / 1024 / 1024).toFixed(1);
  console.log(`${new Date().toISOString()} OK ${nombre} (${tamano} MB, ${contenido.length} entradas) de ${carpetas.join(', ')}; borradas ${borradas.length} antiguas`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`${new Date().toISOString()} ERROR ${error.message}`);
    process.exit(1);
  }
}
