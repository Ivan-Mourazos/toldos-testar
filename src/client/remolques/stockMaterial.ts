import type { Material } from '../../remolques/calc/materiales-seed.ts';

// El material de remolques guarda el nombre de la bobina, no su código. Para preguntar su stock
// (GET /api/catalog/fabrics/stock, el mismo de la tela de los toldos) hace falta el código de
// artículo de RPS, que sale de la lista de /api/remolques/materiales.

/** Lo que admite el endpoint de stock (ver parseCodes en fabricRpsServices.js). */
const CODIGO_RPS = /^[A-Z0-9._/-]{1,40}$/;

/** Código de artículo de RPS de la bobina elegida; '' si es texto manual o no tiene código válido. */
export function codigoStockMaterial(valor: string, opciones: Material[]): string {
  const buscado = valor.trim();
  if (!buscado) return '';
  const material = opciones.find((o) => o.nombre === valor) ?? opciones.find((o) => o.nombre.trim() === buscado);
  const codigo = material?.codigoBobina.trim().toUpperCase() ?? '';
  return CODIGO_RPS.test(codigo) ? codigo : '';
}
