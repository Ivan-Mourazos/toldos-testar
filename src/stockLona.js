import { resolveFabric } from './domain/fabricCatalog.js';
import { materialesRemolques } from './materialesEntrega.js';
import { CODIGO_RPS, codigoStockMaterial } from './remolques/stockMaterial.ts';

/** @typedef {{ of: string, codigo: string, descripcion?: string, ml: number }} LineaLona */
/** @typedef {{ codigo: string, descripcion: string, ml: number, porOf: Record<string, number> }} NecesidadLona */
/** @typedef {{ codigo: string, descripcion: string, necesita: number, disponible: number }} FaltaLona */

const redondear = ml => Math.round(ml * 100) / 100;
const formatoMl = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** @param {LineaLona[]} lineas @returns {NecesidadLona[]} */
export function necesidadesLona(lineas) {
  const porCodigo = new Map();
  for (const { of, codigo, descripcion, ml } of lineas) {
    if (!CODIGO_RPS.test(codigo) || !Number.isFinite(ml) || ml <= 0) continue;
    if (!porCodigo.has(codigo)) porCodigo.set(codigo, { codigo, descripcion: '', ml: 0, porOf: new Map() });
    const lona = porCodigo.get(codigo);
    lona.descripcion ||= descripcion || '';
    lona.ml += ml;
    lona.porOf.set(of, (lona.porOf.get(of) ?? 0) + ml);
  }
  return [...porCodigo.values()].map(lona => ({
    ...lona, ml: redondear(lona.ml),
    porOf: Object.fromEntries([...lona.porOf].map(([of, ml]) => [of, redondear(ml)])),
  }));
}

/** @param {NecesidadLona[]} necesidades @param {{code: string, disponible: number}[]} stock @returns {FaltaLona[]} */
export function faltasLona(necesidades, stock) {
  const porCodigo = new Map(stock.map(({ code, disponible }) => [code, disponible]));
  return necesidades.flatMap(({ codigo, descripcion, ml }) => {
    const disponible = porCodigo.get(codigo) ?? 0;
    return disponible < ml ? [{ codigo, descripcion, necesita: ml, disponible }] : [];
  });
}

/** @param {ReturnType<typeof import('./materialesEntrega.js').materialesReserva>} materiales @returns {LineaLona[]} */
export function lineasLonaToldos(materiales) {
  return materiales.flatMap(({ of, codigo, cantidad }) => {
    const tela = CODIGO_RPS.test(codigo) && resolveFabric(codigo);
    return tela?.code === codigo ? [{ of, codigo, descripcion: tela.description, ml: cantidad }] : [];
  });
}

/** @returns {LineaLona[]} */
export function lineasLonaRemolques(pedido, materialesCatalogo) {
  return materialesRemolques(pedido).flatMap(({ of, codigo: nombre, cantidad }) => {
    const codigo = nombre === 'Sin material' ? '' : codigoStockMaterial(nombre, materialesCatalogo);
    return codigo ? [{ of, codigo, descripcion: nombre, ml: cantidad }] : [];
  });
}

// El cajetín usa el nombre corto. Esta equivalencia usa el RAL y la bobina de 300 del catálogo.
const bobinasPuertas = [{ nombre: 'LAC900 AZUL 5002', codigoBobina: 'LAC900AZ02P300' }];

/** @param {Pick<ReturnType<typeof import('./puertas/corte.ts').generarCortePuertas>, 'metrosLona'>} resultadoCorte
 * @returns {LineaLona[]}
 */
export function lineasLonaPuertas({ metrosLona = [] }) {
  return metrosLona.flatMap(({ material, of, anchoRollo, cm }) => {
    const alias = codigoStockMaterial(material, bobinasPuertas);
    const catalogada = resolveFabric(alias || material);
    const coincide = catalogada?.width * 10 === anchoRollo && (alias || catalogada.description === material);
    return coincide && CODIGO_RPS.test(catalogada.code) && cm > 0
      ? [{ of, codigo: catalogada.code, descripcion: material, ml: cm / 100 }] : [];
  });
}

/** @param {FaltaLona[]} faltas */
export function textoAvisoStock(faltas) {
  if (!faltas.length) return [];
  return [
    ...faltas.map(({ codigo, descripcion, necesita, disponible }) =>
      `No llega el stock de ${[codigo, descripcion].filter(Boolean).join(' ')}: necesita ${formatoMl.format(necesita)} m, disponible ${formatoMl.format(disponible)} m.`),
    'Al pasar el pedido en CoordinaOT podrás mandar el correo a Compras y Almacén.',
  ];
}
