import { resolveFabric } from './domain/fabricCatalog.js';
import { CODIGO_RPS, codigoStockMaterial } from './remolques/stockMaterial.ts';
import { entregasPedido, numeroEntrega } from './entregas.js';
import { generarCorteLona } from './domain/corteLona/index.js';
import { OF_STOCK_POR_DEFECTO } from './ofStockSacos.js';
import { normalizeOf } from './reviewRules.js';
export { textoAvisoStock } from './stockLonaAviso.js';
export { esLonaAcrilica } from './domain/stockSinComprobar.js';

/** @typedef {{ ofs: string[], codigo: string, descripcion?: string, ml: number, origen: 'corte' | 'reserva' }} LineaLona */
/** @typedef {{ codigo: string, descripcion: string, ml: number, ofs: string[], origen: LineaLona['origen'] | 'manual' }} NecesidadLona */
/** @typedef {{ codigo: string, descripcion: string, necesita: number, disponible: number, stock: number, reservado: number, reservadoPropio: number, ofs: string[] }} FaltaLona */
/** @typedef {Pick<ReturnType<typeof import('./remolques/corte/index.js').generarCorteRemolques>['cortes'][number], 'material' | 'largo' | 'opcion' | 'elementos'>} CorteStockRemolque */

const redondear = ml => Math.round(ml * 100) / 100;

export const entregaStockLona = pedido =>
  pedido.entregaActual != null || entregasPedido(pedido).length ? numeroEntrega(pedido) : null;

/** @param {LineaLona[]} lineas @returns {NecesidadLona[]} */
export function necesidadesLona(lineas) {
  const porCodigo = new Map();
  for (const { ofs, origen, codigo, descripcion, ml } of lineas) {
    if (!CODIGO_RPS.test(codigo) || !Number.isFinite(ml) || ml <= 0) continue;
    if (!porCodigo.has(codigo)) porCodigo.set(codigo, { codigo, descripcion: '', ml: 0, ofs: new Set(), origen });
    const lona = porCodigo.get(codigo);
    lona.descripcion ||= descripcion || '';
    lona.ml += ml;
    for (const of of ofs.map(normalizeOf).filter(Boolean)) lona.ofs.add(of);
  }
  return [...porCodigo.values()].map(lona => ({
    ...lona, ml: redondear(lona.ml), ofs: [...lona.ofs].sort(),
  }));
}

/** @param {NecesidadLona[]} necesidades @param {{ code: string, metros?: number, reservado?: number, reservadoPropio?: number, disponible: number }[]} stock @returns {FaltaLona[]} */
export function faltasLona(necesidades, stock) {
  const porCodigo = new Map(stock.map(s => [s.code, s]));
  return necesidades.flatMap(({ codigo, descripcion, ml, ofs }) => {
    const s = porCodigo.get(codigo);
    const disponible = s?.disponible ?? 0;
    return disponible < ml ? [{
      codigo, descripcion, necesita: ml, stock: s?.metros ?? 0, reservado: s?.reservado ?? 0,
      reservadoPropio: s?.reservadoPropio ?? 0, disponible, ofs,
    }] : [];
  });
}

/** @param {{ order?: any, corteLona?: { toldos?: unknown[], ajustes?: Record<string, any>, ofStockSacos?: string } }} pedido
 * @param {ReturnType<typeof import('./materialesEntrega.js').materialesReserva>} materiales @returns {LineaLona[]} */
export function lineasLonaToldos({ order, corteLona }, materiales) {
  if (corteLona?.toldos?.length) {
    const { cortes } = generarCorteLona(order, { ajustes: corteLona.ajustes, ofStockSacos: corteLona.ofStockSacos ?? OF_STOCK_POR_DEFECTO });
    if (cortes.conSacos.length) return cortes.conSacos.flatMap(corte => {
      const ofs = corte.colocadas.filter(p => !p.saco).map(p => p.of);
      return corte.codigoTela === 'CRISTATP140650' || !ofs.length ? [] : [{
        codigo: corte.codigoTela, descripcion: corte.material, ml: (corte.largoMaterial ?? corte.largo) / 1000, ofs, origen: 'corte',
      }];
    });
  }
  return materiales.flatMap(({ of, codigo, cantidad }) => {
    const tela = CODIGO_RPS.test(codigo) && resolveFabric(codigo);
    return tela?.code === codigo ? [{ ofs: [of], codigo, descripcion: tela.description, ml: cantidad, origen: 'reserva' }] : [];
  });
}

/** @param {CorteStockRemolque[]} cortes
 * @param {Parameters<typeof codigoStockMaterial>[1]} materialesCatalogo @returns {LineaLona[]} */
export function lineasLonaRemolques(cortes, materialesCatalogo) {
  return cortes.flatMap(({ material, largo, opcion, elementos }) => {
    if (opcion && !opcion.startsWith('OPCIÓN 1')) return [];
    const codigo = codigoStockMaterial(material, materialesCatalogo);
    return codigo ? [{ ofs: elementos.map(e => e.of), codigo, descripcion: material, ml: largo / 1000, origen: 'corte' }] : [];
  });
}

// Nombres del corte y bobinas del catálogo. El ancho también tiene que coincidir.
const bobinasPuertas = {
  'LAC900 AZUL 5002': 'LAC900AZ02P300',
  'LAC900 AZUL 5010': 'LAC900AZ10P300',
  'LAC900 BLANCO 9016': 'LAC900BLANP300',
  'LAC900 GRIS 7037': 'LAC900GROSP300',
  'LAC900 GRIS 7038': 'LAC900GR38P300',
  'LAC900 GRIS 9006': 'LAC900PL06P300',
  'LAC900 PLATA 9006': 'LAC900PL06P300',
  'LAC900 NEGRO 9005': 'LAC900NE05P300',
  'LAC900 ROJO 3002': 'LAC900RO02P300',
  'LAC650 VERDE 6026': 'LAC650VE26P300',
  'PVC G650 NEGRO': 'G650NEGRP250',
  'PVC ALPHA 580 GR NEGRO': 'ALPHANEGRP250',
  // Pendientes de confirmar:
  // 'LAC900 AMARILLO': 'LAC900AM03P300',
  // 'LAC900 BLANCO': 'LAC900BLANP300',
  // 'LAC900 NEGRO': 'LAC900NE05P300',
  // 'LAC900 IGNÍFUGA M2 ROJO 3002': 'PANAIGRO20P300',
  // 'LAC900 IGNÍFUGA M2 BLANCO': 'PANAIGBLANP300',
  // 'TENTALU PLATA/NEGRO': 'TENTALUP/NP250' (el corte usa 300 cm).
};

/** @param {Pick<ReturnType<typeof import('./puertas/corte.ts').generarCortePuertas>, 'cortes'>} resultadoCorte
 * @param {string[]} [ofsEntrega]
 * @returns {LineaLona[]}
 */
export function lineasLonaPuertas({ cortes }, ofsEntrega) {
  const seleccionadas = ofsEntrega && new Set(ofsEntrega);
  return cortes.flatMap(({ material, opcion, anchoRollo, largo, colocadas }) => {
    if (opcion !== 'principal') return [];
    const nombre = material.replace(/\s*·\s*impresa$/i, '').trim();
    const clave = nombre.toUpperCase();
    const alias = Object.hasOwn(bobinasPuertas, clave) && bobinasPuertas[clave];
    const catalogada = resolveFabric(alias || nombre);
    const coincide = catalogada?.width * 10 === anchoRollo && (alias || catalogada.description === nombre);
    if (!coincide || !CODIGO_RPS.test(catalogada.code)) return [];
    const ofs = colocadas.filter(t => !t.aparte && t.pieza.clase !== 'cristal').map(t => normalizeOf(t.pieza.of))
      .filter(of => of && (!seleccionadas || seleccionadas.has(of)));
    return ofs.length ? [{ ofs, codigo: catalogada.code, descripcion: material, ml: largo / 1000, origen: 'corte' }] : [];
  });
}
