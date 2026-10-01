// Paso de los planteamientos de la web vieja de remolques a Planteamientos TGM (fase 5).
// Una vez, en el .90, desde /webs/toldos-testar y primero simulando:
//   node scripts/migrar-remolques.mjs --origen /webs/remolques-tgm --simular
//   node scripts/migrar-remolques.mjs --origen /webs/remolques-tgm
// Lee (nunca escribe) <origen>/data/planteamientos.json y, si existe, <origen>/data/pedidos.json.
// Escribe solo en la carpeta interna de remolques de Configuración (o en --destino). Para saber si un
// pedido ya tiene su PDF archivado mira (sin escribir) las dos carpetas de remolques, y para no pasar
// un número que ya es un pedido de toldos mira (sin escribir) la carpeta de revisión de toldos.
// Repetirlo no duplica: lo que ya está en la carpeta interna no se toca.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { formOptions } from '../src/domain/modelBehavior.js';
import { crearAlmacenPedidosRemolques } from '../src/remolques/flujo/almacen.ts';
import { aplicarMigracion, informeMigracion, planificarMigracion } from '../src/remolques/flujo/migracion.ts';
import { comprobadorPedidoToldos } from '../src/remolques/flujo/servicio.ts';
import { destinosPdfRemolques } from '../src/remolques/salida/archivo.ts';
import { createWorkflowStore, defaultWorkflowSettings } from '../src/workflow.js';

const USO = [
  'Uso: node scripts/migrar-remolques.mjs --origen <carpeta de la web vieja> [--simular]',
  '  Sin --destino, las carpetas salen de la configuración de la web.',
  '  Con --destino <carpeta interna>: --planteamientos <carpeta>, --oficina <carpeta con {YYYY}> y',
  '  --toldos <carpeta de revisión de toldos con {YYYY}> (las tres opcionales).'
].join('\n');

/** Un error que se explica solo: se escribe su mensaje, sin la traza de Node, y se sale con su código. */
class ErrorComando extends Error {
  constructor(mensaje, codigoSalida) {
    super(mensaje);
    this.codigoSalida = codigoSalida;
  }
}

function leerOpciones() {
  try {
    return parseArgs({
      options: {
        origen: { type: 'string' },
        destino: { type: 'string' },
        planteamientos: { type: 'string' },
        oficina: { type: 'string' },
        toldos: { type: 'string' },
        simular: { type: 'boolean', default: false }
      }
    }).values;
  } catch (error) {
    // Los mensajes de parseArgs van en inglés y largos: basta con decir qué opción sobra o falla.
    const opcion = /'([^']+)'/.exec(error.message)?.[1];
    throw new ErrorComando(`Opción no válida${opcion ? `: ${opcion}` : ''}.\n${USO}`, 2);
  }
}

async function leerJson(fichero, siFalta) {
  try {
    return JSON.parse(await readFile(fichero, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && siFalta !== undefined) return siFalta;
    throw new ErrorComando(`No se pudo leer ${fichero}: ${error.message}`, 2);
  }
}

/**
 * La misma tienda de toldos que el servidor, para una carpeta de revisión dada con --toldos. El
 * fichero de ajustes no existe a propósito: así manda la carpeta que se pasa. Solo se lee.
 */
function tiendaToldos(reviewDirectory) {
  return createWorkflowStore({
    settingsFile: fileURLToPath(new URL('.sin-ajustes-de-migracion.json', import.meta.url)),
    defaults: { ...defaultWorkflowSettings(), reviewDirectory }
  });
}

// Sin --destino, las carpetas son las de la configuración de la web (las mismas que usa el servidor).
async function carpetas(values) {
  if (values.destino) {
    return {
      interna: values.destino,
      planteamientos: values.planteamientos ?? '',
      oficina: values.oficina ?? '',
      toldos: values.toldos ? tiendaToldos(values.toldos) : null
    };
  }
  const { config } = await import('../src/config.js');
  const tienda = createWorkflowStore({ settingsFile: config.workflowSettingsFile, defaults: defaultWorkflowSettings(config) });
  const ajustes = await tienda.getSettings();
  return {
    interna: ajustes.remolquesRevisionDirectory,
    planteamientos: values.planteamientos ?? ajustes.remolquesPlanteamientosDirectory,
    oficina: values.oficina ?? ajustes.remolquesOficinaTecnicaDirectory,
    toldos: values.toldos ? tiendaToldos(values.toldos) : (ajustes.reviewDirectory ? tienda : null)
  };
}

async function principal() {
  const values = leerOpciones();
  if (!values.origen) throw new ErrorComando(`Falta --origen: la carpeta de la web vieja (p. ej. /webs/remolques-tgm).\n${USO}`, 2);
  const dirs = await carpetas(values);
  if (!dirs.interna) {
    throw new ErrorComando('Falta la carpeta interna de remolques (Configuración o REMOLQUES_REVISION_DIRECTORY, o --destino).', 2);
  }
  const registros = await leerJson(path.join(values.origen, 'data', 'planteamientos.json'));
  if (!Array.isArray(registros)) throw new ErrorComando('data/planteamientos.json no es una lista de planteamientos.', 2);
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
    ahora: new Date().toISOString(),
    esPedidoDeToldos: dirs.toldos ? comprobadorPedidoToldos(dirs.toldos) : null
  });
  for (const linea of informeMigracion(plan, { simular: values.simular })) console.log(linea);
  if (values.simular) return;
  const { creados, yaEstaban } = await aplicarMigracion(plan, almacen);
  console.log(`Hecho: ${creados.length} pedidos creados en ${dirs.interna}; ${yaEstaban.length} ya estaban.`);
}

try {
  await principal();
} catch (error) {
  if (error instanceof ErrorComando) {
    console.error(error.message);
    process.exit(error.codigoSalida);
  }
  // Lo inesperado (una carpeta caída, no se puede mirar toldos…) también en corto: no se ha creado lo que falta.
  console.error(`No se pudo terminar el paso: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
