import type { Material } from './calc/materiales-seed.ts';
import { claveLona, leerLona, nombreLona } from '../domain/lonaSimple.js';

// El material de remolques guarda el nombre de la bobina, no su código. Para preguntar su stock
// (GET /api/catalog/fabrics/stock, el mismo de la tela de los toldos) hace falta el código de
// artículo de RPS, que sale de la lista de /api/remolques/materiales.
//
// Desde el 26/11/2026 se elige por nombre simple («PVC 580 AZUL 5015 · 250 AN», todas las marcas;
// domain/lonaSimple.js). Los pedidos guardados con el nombre de una marca se siguen leyendo.

/** Lo que admite el endpoint de stock (ver parseCodes en fabricRpsServices.js). */
export const CODIGO_RPS = /^[A-Z0-9._/-]{1,40}$/;

const claveDe = (texto: string) => {
  const lona = leerLona(texto);
  return lona?.ancho ? claveLona(lona) : null;
};
const stockDe = (m: { stockArzua?: number | null }) => (m.stockArzua == null ? Number.NEGATIVE_INFINITY : Number(m.stockArzua));

/** Junta las bobinas de la misma lona en una opción con su desglose por marca. Lo que no es una
 * lona de PVC reconocible (o ya es una opción simple) queda como está. El código de la opción es el
 * de la marca con más stock en Arzúa; el stock, la suma. */
export function opcionesSimples(materiales: readonly Material[]): Material[] {
  const grupos = new Map<string, Material[]>();
  const sueltas: Material[] = [];
  const vistos = new Set<string>();
  for (const material of materiales) {
    const clave = material.marcas ? null : claveDe(material.nombre);
    if (!clave) { sueltas.push(material); continue; }
    // La lista del servidor junta RPS, la semilla y el catálogo: un código puede venir dos veces.
    if (vistos.has(material.codigoBobina)) continue;
    vistos.add(material.codigoBobina);
    (grupos.get(clave) ?? grupos.set(clave, []).get(clave)!).push(material);
  }
  const simples = [...grupos.values()].map((bobinas): Material => {
    const marcas = [...bobinas].sort((a, b) => stockDe(b) - stockDe(a) || a.codigoBobina.localeCompare(b.codigoBobina));
    const conDato = marcas.filter(m => m.stockArzua != null);
    // El nombre no puede depender del orden de llegada: se toma el de la primera por código.
    const porCodigo = [...bobinas].sort((a, b) => a.codigoBobina.localeCompare(b.codigoBobina));
    return {
      nombre: nombreLona(leerLona(porCodigo[0].nombre)!),
      codigoBobina: marcas[0].codigoBobina,
      stockArzua: conDato.length ? conDato.reduce((total, m) => total + Number(m.stockArzua), 0) : null,
      marcas: marcas.map(({ nombre, codigoBobina, stockArzua }) => ({ nombre, codigoBobina, stockArzua: stockArzua ?? null })),
    };
  });
  return [...simples, ...sueltas];
}

/** La opción que corresponde a lo escrito: la bobina exacta (pedidos antiguos y texto de RPS) o,
 * si es un nombre simple, su grupo, aunque el nombre del color cambie («PLATA 9006» / «GRIS 9006»). */
export function materialElegido(valor: string, opciones: readonly Material[]): Material | undefined {
  const buscado = valor.trim();
  if (!buscado) return undefined;
  const exacta = opciones.find((o) => o.nombre === valor) ?? opciones.find((o) => o.nombre.trim() === buscado);
  if (exacta) return exacta;
  const clave = claveDe(buscado);
  return clave ? opcionesSimples(opciones).find(o => o.marcas && claveDe(o.nombre) === clave) : undefined;
}

/** Código de artículo de RPS de la bobina elegida; '' si es texto manual o no tiene código válido.
 * Para un nombre simple, el de la marca con más stock: la comprobación mira después todas. */
export function codigoStockMaterial(valor: string, opciones: readonly Material[]): string {
  const codigo = materialElegido(valor, opciones)?.codigoBobina.trim().toUpperCase() ?? '';
  return CODIGO_RPS.test(codigo) ? codigo : '';
}
