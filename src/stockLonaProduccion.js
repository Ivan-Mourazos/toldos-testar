import { pasarAProduccion } from './produccion.js';
import { faltasLona, necesidadesLona, textoAvisoStock } from './stockLona.js';

/** @typedef {import('./stockLona.js').LineaLona} LineaLona */
/** @typedef {import('./stockLona.js').FaltaLona} FaltaLona */
/** @typedef {import('./stockLona.js').NecesidadLona} NecesidadLona */
/** @typedef {{ pedido: string, cliente: string, ofs: string[], consultadoPor: string | null }} PedidoStockLona */
/** @typedef {PedidoStockLona & { lonas: NecesidadLona[], faltas: FaltaLona[], consultado: string }} DatosStockLona */
/** @typedef {{ stock: { reset: () => void, getStock: (codigos: string[]) => Promise<{ code: string, disponible: number }[]> },
 * coordina: { enviarStockLona: (datos: DatosStockLona) => Promise<{ ok: boolean }> }, now?: () => Date }} ServiciosStockLona */

const sinConsulta = () => ({ consultado: null, faltas: [], avisos: [] });
const avisoConsulta = 'No se pudo comprobar el stock de lona.';
const avisoEnvio = 'No se pudo avisar a CoordinaOT del stock de lona.';

/** @param {ServiciosStockLona & { lineas: LineaLona[] | (() => LineaLona[] | Promise<LineaLona[]>) }} opciones */
async function consultarStock({ lineas, stock, now = () => new Date() }) {
  try {
    const lonas = necesidadesLona(typeof lineas === 'function' ? await lineas() : lineas);
    if (!lonas.length) return { lonas, ...sinConsulta() };
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

/** @param {PedidoStockLona & ServiciosStockLona & { lineas: LineaLona[] }} opciones */
export async function comprobarStockLona({ pedido, cliente, ofs, consultadoPor, ...opciones }) {
  return informarStock({ pedido, cliente, ofs, consultadoPor }, await consultarStock(opciones), opciones.coordina);
}

/** Consulta antes de publicar las reservas. Solo deja constancia en CoordinaOT al cerrar la entrega.
 * @param {Parameters<typeof pasarAProduccion>[0]} pasos
 * @param {(PedidoStockLona & Parameters<typeof consultarStock>[0]) | undefined} opciones */
export async function pasarAProduccionConStock(pasos, opciones) {
  if (!opciones) return pasarAProduccion(pasos);
  const { pedido, cliente, ofs, consultadoPor, ...servicios } = opciones;
  const consulta = await consultarStock(servicios);
  const resultado = await pasarAProduccion(pasos);
  if (resultado.status !== 200) return resultado;
  const { avisos, ...stockLona } = await informarStock({ pedido, cliente, ofs, consultadoPor }, consulta, servicios.coordina);
  return { ...resultado, cuerpo: { ...resultado.cuerpo, stockLona, avisos: [...avisos, ...(resultado.cuerpo.avisos ?? [])] } };
}
