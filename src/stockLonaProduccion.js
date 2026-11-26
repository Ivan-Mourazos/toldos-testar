import { pasarAProduccion } from './produccion.js';
import { evaluarStockLona, faltaParaCoordina, necesidadesLona } from './stockLona.js';
import { esLonaAcrilica, fueraDeReservas, ofsEnReservas } from './domain/stockSinComprobar.js';
import { textoAnchoSinAviso, textoAvisoStock, textoDudasAncho } from './stockLonaAviso.js';
import { resolveFabric } from './domain/fabricCatalog.js';
import { CODIGO_RPS } from './remolques/stockMaterial.ts';

/** @typedef {import('./stockLona.js').LineaLona} LineaLona */
/** @typedef {import('./stockLona.js').FaltaLona} FaltaLona */
/** @typedef {import('./stockLona.js').NecesidadLona} NecesidadLona */
/** @typedef {{ pedido: string, entrega: number | null, cliente: string, ofs: string[], consultadoPor: string | null,
 * origen?: 'plano-manual' }} PedidoStockLona */
/** @typedef {PedidoStockLona & { lonas: NecesidadLona[], faltas: FaltaLona[], consultado: string }} DatosStockLona */
/** @typedef {{ stock: { reset: () => void, getStock: (codigos: string[], opciones?: { ofs?: string[] }) => Promise<import('./stockLona.js').StockCodigo[]>,
 *   grupoLona?: (codigo: string, descripcion?: string, ancho?: number | null) => Promise<import('./stockLona.js').GrupoLona | undefined> },
 * coordina: { enviarStockLona: (datos: DatosStockLona) => Promise<{ ok: boolean, motivo?: string }> }, now?: () => Date,
 * resolverTela?: (codigo: string) => Promise<string | undefined>,
 * articulosVenta?: (pedido: string) => Promise<{ of: string, codigo?: string | null, generico?: string | null, subfamilia?: string | null }[]> }} ServiciosStockLona */

const sinConsulta = () => ({ consultado: null, faltas: [], dudas: [], avisos: [] });
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

/** `enExcel`: códigos que ya van en el Excel de asignación (reservas de toldos); esos tampoco se comprueban.
 * Tampoco las OF con un artículo incluido en reservas.
 * @param {ServiciosStockLona & { lineas: LineasStock, lonasAprobadas?: unknown, ofsStock?: string[], enExcel?: string[] }} opciones @param {string[]} ofs
 * @param {string} [cliente] @param {string} [pedido] */
async function consultarStock({ lineas, lonasAprobadas, stock, resolverTela, articulosVenta, ofsStock, enExcel = [], now = () => new Date() }, ofs, cliente, pedido) {
  let propuesta;
  try {
    propuesta = necesidadesLona(typeof lineas === 'function' ? await lineas() : lineas);
  } catch (error) {
    if (lonasAprobadas !== undefined) throw error;
    return { ...sinConsulta(), lonas: [], avisos: [avisoConsulta] };
  }
  const aprobadas = await validarLonasAprobadas(propuesta, lonasAprobadas, ofs, resolverTela);
  // Lo que se asigna con el Excel (y las acrílicas, que siempre van en él) ya lo comprueba esa asignación.
  // Si no queda nada, la entrega queda comprobada y sin faltas.
  const asignadas = new Set(enExcel);
  let lonas = aprobadas.filter(lona => !esLonaAcrilica(lona) && !asignadas.has(lona.codigo));
  // Si RPS no responde se comprueba todo: mejor un aviso de más que uno de menos.
  if (lonas.length && articulosVenta && pedido) {
    const enReservas = ofsEnReservas(await articulosVenta(pedido).catch(() => []));
    lonas = fueraDeReservas(lonas, enReservas.map(({ of }) => of));
  }
  try {
    if (!lonas.length) return { lonas, ...sinConsulta(), consultado: propuesta.length || aprobadas.length ? now().toISOString() : null };
    stock.reset();
    // La misma lona de otras marcas cuenta (domain/lonaSimple.js); las más anchas, solo si se decide no avisar.
    const grupos = await Promise.all(lonas.map(async lona =>
      (await stock.grupoLona?.(lona.codigo, lona.descripcion, resolveFabric(lona.codigo)?.width ?? null))
        ?? { nombre: null, mismoAncho: [lona.codigo], masAnchas: [] }));
    const codigos = [...new Set(grupos.flatMap(g => [...g.mismoAncho, ...g.masAnchas.map(a => a.codigo)]))];
    const disponible = await stock.getStock(codigos, { ofs: ofsStock ?? ofs });
    const consultado = now().toISOString();
    const { faltas, dudas } = evaluarStockLona(lonas, disponible, grupos);
    return { lonas, consultado, faltas, dudas, avisos: textoAvisoStock(faltas) };
  } catch {
    return { ...sinConsulta(), lonas: [], avisos: [avisoConsulta] };
  }
}

/** @param {PedidoStockLona} pedido @param {Awaited<ReturnType<typeof consultarStock>>} consulta
 * @param {ServiciosStockLona['coordina']} coordina */
async function informarStock(pedido, { lonas, consultado, faltas, avisos }, coordina) {
  if (consultado) {
    // CoordinaOT rechaza el envío entero si una lona trae una OF que no es de la entrega.
    const deLaEntrega = new Set(pedido.ofs);
    /** @template {{ ofs: string[] }} T @param {T} fila @returns {T} */
    const ajustar = fila => {
      const ofs = fila.ofs.filter(of => deLaEntrega.has(of));
      return { ...fila, ofs: ofs.length ? ofs : [...pedido.ofs] };
    };
    // Cada falta lleva la cuenta (stock − reservado por otros = disponible) para el correo de CoordinaOT.
    const datos = { ...pedido, lonas: lonas.map(ajustar), faltas: faltas.map(faltaParaCoordina).map(ajustar), consultado };
    // Un fallo al avisar tampoco invalida la comprobación ni los archivos generados.
    let motivo;
    try {
      const respuesta = await coordina.enviarStockLona(datos);
      if (respuesta.ok) return { consultado, faltas, avisos, ...(pedido.origen && { enviado: true }) };
      motivo = respuesta.motivo;
    } catch (error) {
      motivo = error instanceof Error ? error.message : String(error);
    }
    console.warn(`[stock] CoordinaOT no aceptó el stock de lona de ${pedido.pedido}: ${motivo ?? 'sin motivo'}`, JSON.stringify(datos));
    return { consultado, faltas, avisos: [...avisos, motivo ? `${avisoEnvio.slice(0, -1)} (${motivo}).` : avisoEnvio] };
  }
  return { consultado, faltas, avisos };
}

/** Avisar: las dudas de ancho pasan a ser faltas. No avisar: se dice de qué bobina se cortará.
 * @param {Awaited<ReturnType<typeof consultarStock>>} consulta @param {boolean} avisar */
function decidirAncho(consulta, avisar) {
  const { dudas = [], ...resto } = consulta;
  if (!dudas.length) return resto;
  if (avisar) {
    const faltas = [...resto.faltas, ...dudas.map(({ masAncha: _, ...falta }) => falta)];
    return { ...resto, faltas, avisos: textoAvisoStock(faltas) };
  }
  return { ...resto, avisos: [...resto.avisos, ...textoAnchoSinAviso(dudas)] };
}

/** @param {PedidoStockLona & Parameters<typeof consultarStock>[0]} opciones */
export async function comprobarStockLona({ pedido, entrega, cliente, ofs, consultadoPor, origen, ...opciones }) {
  // Sin nadie a quien preguntar (plano manual), una bobina más ancha no quita el aviso.
  const consulta = decidirAncho(await consultarStock(opciones, ofs, cliente, pedido), true);
  return informarStock({ pedido, entrega, cliente, ofs, consultadoPor, ...(origen && { origen }) }, consulta, opciones.coordina);
}

/** Consulta antes de publicar las reservas. Solo deja constancia en CoordinaOT al cerrar la entrega.
 * @param {Parameters<typeof pasarAProduccion>[0]} pasos
 * @param {(PedidoStockLona & Parameters<typeof consultarStock>[0] & { avisarAncho?: unknown }) | undefined} opciones */
export async function pasarAProduccionConStock(pasos, opciones) {
  if (!opciones) return pasarAProduccion(pasos);
  const { pedido, entrega, cliente, ofs, consultadoPor, avisarAncho, ...servicios } = opciones;
  const comprobada = await consultarStock(servicios, ofs, cliente, pedido);
  // No llega en su ancho pero sí en uno más ancho: lo decide quien pasa el pedido (Iván, 26/11/2026).
  if (comprobada.dudas.length && typeof avisarAncho !== 'boolean') {
    return { status: 409, cuerpo: { needsAnchoDecision: true, error: 'Hay lona de otro ancho', detalles: textoDudasAncho(comprobada.dudas) } };
  }
  const consulta = decidirAncho(comprobada, avisarAncho !== false);
  const resultado = await pasarAProduccion(pasos);
  if (resultado.status !== 200) return resultado;
  const { avisos, ...stockLona } = await informarStock({ pedido, entrega, cliente, ofs, consultadoPor }, consulta, servicios.coordina);
  return { ...resultado, cuerpo: { ...resultado.cuerpo, stockLona, avisos: [...avisos, ...(resultado.cuerpo.avisos ?? [])] } };
}
