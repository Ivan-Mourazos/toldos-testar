import type { AvisoPuerta, Puerta, VentanalApilable } from './tipos.ts';
import { bordesVentanal, NOTA_CACHOS_CRISTAL } from './ventanalesEnrollable.ts';

export const notaPlanoApilable = (p: Puerta): string =>
  p.notaPlano?.trim() ?? (p.apilable.ventanales?.length ? NOTA_CACHOS_CRISTAL : '');

export function ventanalesApilable(p: Puerta, ejes: number[]) {
  const vistos = new Set<number>();
  const avisos: AvisoPuerta[] = [];
  const revisar = ({ tramo, margen }: VentanalApilable) => {
    const error = (codigo: string, mensaje: string) => {
      avisos.push({ codigo, nivel: 'error', texto: `Ventanal del tramo ${tramo}. ${mensaje}` });
      return [];
    };
    if (!Number.isInteger(tramo) || tramo < 1 || tramo >= ejes.length)
      return error('VENTANAL_TRAMO', 'Ese tramo no existe. Revisa la cadena de tubos en «E.T.» o cambia el tramo.');
    if (vistos.has(tramo)) return error('VENTANAL_TRAMO', 'Hay dos ventanales en el mismo tramo. Deja uno solo.');
    vistos.add(tramo);
    if (!Number.isFinite(margen) || margen <= 0 || 2 * margen >= p.frente)
      return error('VENTANAL_MARGEN', 'Pon un margen mayor que cero y menor que la mitad del frente.');
    const inferior = p.entradas[tramo - 1], superior = p.entradas[tramo];
    const desde = ejes[tramo - 1], hasta = ejes[tramo];
    if (!inferior || !superior || Math.abs(inferior.altura - desde) > .01 || Math.abs(superior.altura - hasta) > .01)
      return error('VENTANAL_ET', 'Faltan las entradas de los dos tubos en sus ejes. Revisa la pestaña «E.T.».');
    const b = bordesVentanal(desde, hasta, inferior.alto / 2, superior.alto / 2);
    if (!(b.altoVisible > 0) || b.corteDesde < desde || b.corteHasta > hasta || p.entradas.some((e, i) =>
      i !== tramo - 1 && i !== tramo && e.altura - e.alto / 2 < b.corteHasta && e.altura + e.alto / 2 > b.corteDesde))
      return error('VENTANAL_ET', 'El cristal invade una entrada de tubo. Revisa el paso y el alto de las E.T.');
    return [{ ...b, tramo, margen }];
  };
  const ventanales = (p.apilable.ventanales ?? []).flatMap(revisar).sort((a, b) => a.tramo - b.tramo);
  return { ventanales, avisos };
}
