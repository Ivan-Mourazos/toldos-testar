// Paso de los planteamientos de la web vieja de remolques a Planteamientos TGM (fase 5).
// Una vez, en el .90, desde /webs/toldos-testar y primero simulando:
//   node scripts/migrar-remolques.mjs --origen /webs/remolques-tgm --simular
//   node scripts/migrar-remolques.mjs --origen /webs/remolques-tgm
// Lee (nunca escribe) <origen>/data/planteamientos.json y, si existe, <origen>/data/pedidos.json.
// Escribe solo en la carpeta interna de remolques de Configuración (o en --destino). Para saber si un
// pedido ya tiene su PDF archivado mira (sin escribir) las dos carpetas de remolques.
// Repetirlo no duplica: lo que ya está en la carpeta interna no se toca.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { formOptions } from '../src/domain/modelBehavior.js';
import { crearAlmacenPedidosRemolques } from '../src/remolques/flujo/almacen.ts';
import { aplicarMigracion, informeMigracion, planificarMigracion } from '../src/remolques/flujo/migracion.ts';
import { destinosPdfRemolques } from '../src/remolques/salida/archivo.ts';

const { values } = parseArgs({
  options: {
    origen: { type: 'string' },
    destino: { type: 'string' },
    planteamientos: { type: 'string' },
    oficina: { type: 'string' },
    simular: { type: 'boolean', default: false }
  }
});
if (!values.origen) {
  console.error('Falta --origen: la carpeta de la web vieja (p. ej. /webs/remolques-tgm).');
  process.exit(2);
}

async function leerJson(fichero, siFalta) {
  try {
    return JSON.parse(await readFile(fichero, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && siFalta !== undefined) return siFalta;
    throw new Error(`No se pudo leer ${fichero}: ${error.message}`);
  }
}

// Sin --destino, las carpetas son las de la configuración de la web (las mismas que usa el servidor).
async function carpetas() {
  if (values.destino) {
    return { interna: values.destino, planteamientos: values.planteamientos ?? '', oficina: values.oficina ?? '' };
  }
  const { config } = await import('../src/config.js');
  const { createWorkflowStore, defaultWorkflowSettings } = await import('../src/workflow.js');
  const ajustes = await createWorkflowStore({ settingsFile: config.workflowSettingsFile, defaults: defaultWorkflowSettings(config) }).getSettings();
  return {
    interna: ajustes.remolquesRevisionDirectory,
    planteamientos: values.planteamientos ?? ajustes.remolquesPlanteamientosDirectory,
    oficina: values.oficina ?? ajustes.remolquesOficinaTecnicaDirectory
  };
}

const dirs = await carpetas();
if (!dirs.interna) {
  console.error('Falta la carpeta interna de remolques (Configuración o REMOLQUES_REVISION_DIRECTORY, o --destino).');
  process.exit(2);
}
const registros = await leerJson(path.join(values.origen, 'data', 'planteamientos.json'));
if (!Array.isArray(registros)) {
  console.error('data/planteamientos.json no es una lista de planteamientos.');
  process.exit(2);
}
const estados = await leerJson(path.join(values.origen, 'data', 'pedidos.json'), []);
if (!dirs.planteamientos || !dirs.oficina) {
  console.warn('AVISO: sin las dos carpetas de remolques no se puede mirar qué PDF ya están archivados; solo cuenta data/pedidos.json.');
}

async function archivados(numeroPedido, fecha) {
  if (!dirs.planteamientos || !dirs.oficina) return [];
  let destinos;
  try {
    ({ destinos } = destinosPdfRemolques(numeroPedido, fecha, {
      remolquesPlanteamientosDirectory: dirs.planteamientos,
      remolquesOficinaTecnicaDirectory: dirs.oficina
    }));
  } catch {
    return [];
  }
  const hay = await Promise.all(destinos.map((destino) => stat(destino).then((s) => s.isFile(), () => false)));
  return destinos.filter((_, indice) => hay[indice]).map((savedPath) => ({ type: 'pdf', filename: path.basename(savedPath), savedPath }));
}

const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dirs.interna });
const existentes = new Set((await almacen.listar()).map((pedido) => pedido.orderCode));
const plan = await planificarMigracion({
  registros,
  estados: Array.isArray(estados) ? estados : [],
  existentes,
  archivados,
  tecnicos: formOptions.tecnicos,
  ahora: new Date().toISOString()
});
for (const linea of informeMigracion(plan, { simular: values.simular })) console.log(linea);
if (values.simular) process.exit(0);
const { creados, yaEstaban } = await aplicarMigracion(plan, almacen);
console.log(`Hecho: ${creados.length} pedidos creados en ${dirs.interna}; ${yaEstaban.length} ya estaban.`);
