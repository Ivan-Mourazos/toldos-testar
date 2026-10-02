// Completa el código de cliente de RPS de los pedidos de remolques guardados antes del 02/10/2026,
// para que el buscador los encuentre por él. Una vez, en el .90, desde /webs/toldos-testar y
// primero simulando:
//   node scripts/completar-codigo-cliente-remolques.mjs --simular
//   node scripts/completar-codigo-cliente-remolques.mjs
// Lee los pedidos de la carpeta interna de remolques de Configuración (o de --destino) y, de cada uno
// sin código, busca su número en RPS con un SELECT (solo lectura). Al pedido solo le añade
// `clienteRps`, con la escritura atómica del almacén: nada más cambia. Los que RPS no tiene se dejan
// como están y se listan. Repetirlo no cambia lo que ya tiene código.
import { parseArgs } from 'node:util';
import { crearAlmacenPedidosRemolques } from '../src/remolques/flujo/almacen.ts';
import { completarClienteRps, informeCompletar } from '../src/remolques/flujo/completar-cliente-rps.ts';

const USO = [
  'Uso: node scripts/completar-codigo-cliente-remolques.mjs [--simular] [--destino <carpeta interna>]',
  '  Sin --destino, la carpeta interna de remolques sale de la configuración de la web.'
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
        destino: { type: 'string' },
        simular: { type: 'boolean', default: false }
      }
    }).values;
  } catch (error) {
    // Los mensajes de parseArgs van en inglés y largos: basta con decir qué opción sobra o falla.
    const opcion = /'([^']+)'/.exec(error.message)?.[1];
    throw new ErrorComando(`Opción no válida${opcion ? `: ${opcion}` : ''}.\n${USO}`, 2);
  }
}

// Sin --destino, la carpeta es la de la configuración de la web (la misma que usa el servidor).
async function carpetaInterna(values) {
  if (values.destino !== undefined) {
    if (!values.destino.trim()) throw new ErrorComando(`--destino necesita una carpeta.\n${USO}`, 2);
    return values.destino;
  }
  const { config } = await import('../src/config.js');
  const { createWorkflowStore, defaultWorkflowSettings } = await import('../src/workflow.js');
  const tienda = createWorkflowStore({ settingsFile: config.workflowSettingsFile, defaults: defaultWorkflowSettings(config) });
  return (await tienda.getSettings()).remolquesRevisionDirectory;
}

/** La consulta a RPS (solo SELECT), que se abre solo si hay algo que mirar. */
async function abrirRps() {
  const { getRpsPoolForRemolques, closeRpsCatalog } = await import('../src/rpsCatalog.js');
  if (!getRpsPoolForRemolques()) throw new ErrorComando('La conexión de RPS no está configurada (.env): no se ha mirado nada.', 1);
  const { pedidoRpsPorNumero } = await import('../src/remolques/rps/pedido-rps.ts');
  return {
    buscarCliente: async (numeroPedido) => (await pedidoRpsPorNumero(numeroPedido))?.cliente ?? null,
    cerrar: closeRpsCatalog
  };
}

async function principal() {
  const values = leerOpciones();
  const interna = (await carpetaInterna(values)).trim();
  if (!interna) {
    throw new ErrorComando('Falta la carpeta interna de remolques (Configuración o REMOLQUES_REVISION_DIRECTORY, o --destino).', 2);
  }
  const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => interna });
  const sinCodigo = (await almacen.listar()).filter((pedido) => !pedido.clienteRps?.codigo).length;
  let rps = null;
  if (sinCodigo > 0) rps = await abrirRps();
  try {
    const resultado = await completarClienteRps({
      almacen,
      buscarCliente: (numero) => rps.buscarCliente(numero),
      simular: values.simular
    });
    for (const linea of informeCompletar(resultado, { simular: values.simular })) console.log(linea);
    if (!values.simular) console.log(`Carpeta: ${interna}`);
    if (resultado.fallos.length) process.exitCode = 1;
  } finally {
    await rps?.cerrar();
  }
}

try {
  await principal();
} catch (error) {
  if (error instanceof ErrorComando) {
    console.error(error.message);
    process.exit(error.codigoSalida);
  }
  console.error(`No se pudo terminar: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
