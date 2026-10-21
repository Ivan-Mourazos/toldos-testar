// Los scripts antiguos montan su servidor. Este lanzador evita que hereden destinos del .env real.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const admitidos = ['hera-workflow', 'antica-workflow', 'bambalina-workflow', 'rps-e2e'];
const solicitados = process.argv.slice(2);
assert.ok(solicitados.every((n) => admitidos.includes(n)), 'Nombre de prueba no admitido.');
for (const nombre of solicitados.length ? solicitados : admitidos) {
  const raiz = path.resolve(`tmp/generacion-toldos-aislada/${nombre}`);
  assert.ok(raiz.startsWith(path.resolve('tmp') + path.sep));
  await fs.mkdir(raiz, { recursive: true });
  const rutas = {
    WORKFLOW_SETTINGS_FILE: 'settings.json', RULE_PARAMETERS_FILE: 'reglas.json', REMOLQUES_PARAMETERS_FILE: 'rem-parametros.json',
    REMOLQUES_CLIENTES_FILE: 'rem-clientes.json', REVIEW_DIRECTORY: 'review', PLANTEAMIENTOS_DIRECTORY: 'plan', RPS_UPLOAD_DIRECTORY: 'rps',
    EXPORT_DIRECTORY: 'export', ORDER_ARCHIVE_ROOT: 'archive', RPS_PLANTEAMIENTOS_DIRECTORY: 'rpsplan',
    REMOLQUES_PLANTEAMIENTOS_DIRECTORY: 'rem-plan', REMOLQUES_OFICINA_TECNICA_DIRECTORY: 'rem-oficina/{YYYY}',
    REMOLQUES_REVISION_DIRECTORY: 'rem-revision', DRAFTS_DIRECTORY: 'borradores', OFICINA_TECNICA_DIRECTORY: 'oficina-lectura',
    ODA_TEMP_DIRECTORY: 'oda', CORTE_LONA_BOT_DIRECTORY: 'bot/{TECNICO}', CORTE_LONA_PLANO_DIRECTORY: 'planos', CORTE_LONA_DXF_DIRECTORY: 'oficina/{YYYY}/DXFs',
  };
  const env = { ...process.env, ...Object.fromEntries(Object.entries(rutas).map(([k, v]) => [k, path.join(raiz, v)])), ENABLE_FILE_WRITES: 'false' };
  const log = [];
  const hijo = spawn(process.execPath, [`scripts/test-${nombre}.mjs`], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  hijo.stdout.on('data', (c) => log.push(c.toString()));
  hijo.stderr.on('data', (c) => log.push(c.toString()));
  const codigo = await new Promise((resolve, reject) => { hijo.once('error', reject); hijo.once('exit', resolve); });
  await fs.writeFile(path.join(raiz, 'resultado.log'), log.join(''));
  console.log(`${nombre}: ${codigo === 0 ? 'OK' : `FALLO (${codigo})`} · ${path.join(raiz, 'resultado.log')}`);
  if (codigo !== 0) { console.log(log.join('').split('\n').slice(-22).join('\n')); process.exitCode = 1; }
}
