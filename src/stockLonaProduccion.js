import { pasarAProduccion } from './produccion.js';
import { faltasLona, necesidadesLona } from './stockLona.js';
import { textoAvisoStock } from './stockLonaAviso.js';
import { resolveFabric } from './domain/fabricCatalog.js';
import { CODIGO_RPS } from './remolques/stockMaterial.ts';

/** @typedef {import('./stockLona.js').LineaLona} LineaLona */
/** @typedef {import('./stockLona.js').FaltaLona} FaltaLona */
/** @typedef {import('./stockLona.js').NecesidadLona} NecesidadLona */
/** @typedef {{ pedido: string, entrega: number | null, cliente: string, ofs: string[], consultadoPor: string | null }} PedidoStockLona */
/** @typedef {PedidoStockLona & { lonas: NecesidadLona[], faltas: FaltaLona[], consultado: string }} DatosStockLona */
/** @typedef {{ stock: { reset: () => void, getStock: (codigos: string[]) => Promise<{ code: string, disponible: number }[]> },
 * coordina: { enviarStockLona: (datos: DatosStockLona) => Promise<{ ok: boolean }> }, now?: () => Date,
 * resolverTela?: (codigo: string) => Promise<string | undefined> }} ServiciosStockLona */

const sinConsulta = () => ({ consultado: null, faltas: [], avisos: [] });
const avisoConsulta = 'No se pudo comprobar el stock de lona.';
const avisoEnvio = 'No se pudo avisar a CoordinaOT del stock de lona.';

/** @typedef {LineaLona[] | (() => LineaLona[] | Promise<LineaLona[]>)} LineasStock */

/** @param {NecesidadLona[]} lonas @param {unknown} aprobadas @param {string[]} ofsEntrega
 * @param {ServiciosStockLona['resolverTela']} resolverTela @returns {Promise<NecesidadLona[]>} */
async function validarLonasAprobadas(lonas, aprobadas, ofsEntrega, resolverTela) {
  if (aprobadas === undefined) return lonas;
  const error = mensaje => Object.assign(new Error(mensaje), { statusCode: 400 });
  if (!Array.isArray(aprobadas)) throw error('Indica la lista de lonas aprobadas.');
  const detectadas = new Map(lonas.map(lona => [lona.codigo, lona]));
  const seleccionadas = new Set(ofsEntrega);
  const vistas = new Set();
  const filas = aprobadas.map(fila => {
    const { codigo, ml, ofs } = fila ?? {};
    if (typeof codigo !== 'string' || !CODIGO_RPS.test(codigo)) throw error('Hay un código de lona que no tiene formato de RPS.');
    if (vistas.has(codigo)) throw error(`La lona ${codigo} está repetida.`);
    vistas.add(codigo);
    if (typeof ml !== 'number' || !Number.isFinite(ml) || ml <= 0) {
      throw error(`Indica un número de metros mayor que cero para ${codigo}.`);
    }
    if (ofs !== undefined && (!Array.isArray(ofs) || ofs.some(of => !seleccionadas.has(of)))) {
      throw error(`Hay OF de ${codigo} que no pertenecen a esta entrega.`);
    }
    const detectada = detectadas.get(codigo);
    const asignadas = [...new Set(/** @type {string[]} */ (ofs ?? detectada?.ofs ?? ofsEntrega))].sort();
    const origen = detectada?.ml === ml && detectada.ofs.join(',') === asignadas.join(',') ? detectada.origen : /** @type {const} */ ('manual');
    return { codigo, ml, ofs: asignadas, origen };
  });
  return Promise.all(filas.map(async fila => {
    const tela = resolveFabric(fila.codigo);
    const descripcion = (tela?.code === fila.codigo ? tela.description : undefined) ?? await resolverTela?.(fila.codigo);
    if (!descripcion) throw error(`La lona ${fila.codigo} no existe en el catálogo de telas.`);
    return { ...fila, descripcion };
  }));
}

/** @param {ServiciosStockLona & { lineas: LineasStock, lonasAprobadas?: unknown }} opciones @param {string[]} ofs */
async function consultarStock({ lineas, lonasAprobadas, stock, resolverTela, now = () => new Date() }, ofs) {
  let propuesta;
  try {
    propuesta = necesidadesLona(typeof lineas === 'function' ? await lineas() : lineas);
  } catch (error) {
    if (lonasAprobadas !== undefined) throw error;
    return { ...sinConsulta(), lonas: [], avisos: [avisoConsulta] };
  }
  const lonas = await validarLonasAprobadas(propuesta, lonasAprobadas, ofs, resolverTela);
  try {
    if (!lonas.length) return { lonas, ...sinConsulta(), consultado: propuesta.length ? now().toISOString() : null };
    stock.reset();
    const disponible = await stock.getStock(lonas.map(lona => lona.codigo));
    const consultado = now().toISOString();
    const faltas = faltasLona(lonas, disponible);
    return { lonas, consultado, faltas, avisos: textoAvisoStock(faltas) };
  } catch {
    return { ...sinConsulta(), lonas: [], avisos: [avisoConsulta] };
  }
}

/** @param {PedidoStockLona} pedido @param {Awaited<ReturnType<typeof consultarStock>>} consulta
 * @param {ServiciosStockLona['coordina']} coordina */
async function informarStock(pedido, { lonas, consultado, faltas, avisos }, coordina) {
  if (consultado) {
    const datos = { ...pedido, lonas, faltas, consultado };
    try {
      if ((await coordina.enviarStockLona(datos)).ok) return { consultado, faltas, avisos };
    } catch {
      // Un fallo al avisar tampoco invalida la comprobación ni los archivos generados.
    }
    return { consultado, faltas, avisos: [...avisos, avisoEnvio] };
  }
  return { consultado, faltas, avisos };
}

/** @param {PedidoStockLona & Parameters<typeof consultarStock>[0]} opciones */
export async function comprobarStockLona({ pedido, entrega, cliente, ofs, consultadoPor, ...opciones }) {
  return informarStock({ pedido, entrega, cliente, ofs, consultadoPor }, await consultarStock(opciones, ofs), opciones.coordina);
}

/** Consulta antes de publicar las reservas. Solo deja constancia en CoordinaOT al cerrar la entrega.
 * @param {Parameters<typeof pasarAProduccion>[0]} pasos
 * @param {(PedidoStockLona & Parameters<typeof consultarStock>[0]) | undefined} opciones */
export async function pasarAProduccionConStock(pasos, opciones) {
  if (!opciones) return pasarAProduccion(pasos);
  const { pedido, entrega, cliente, ofs, consultadoPor, ...servicios } = opciones;
  const consulta = await consultarStock(servicios, ofs);
  const resultado = await pasarAProduccion(pasos);
  if (resultado.status !== 200) return resultado;
  const { avisos, ...stockLona } = await informarStock({ pedido, entrega, cliente, ofs, consultadoPor }, consulta, servicios.coordina);
  return { ...resultado, cuerpo: { ...resultado.cuerpo, stockLona, avisos: [...avisos, ...(resultado.cuerpo.avisos ?? [])] } };
}
