import type { Caja } from './tipos.ts';
/** Lado mayor admitido tras escalar. Estudio Task 0: en 1.782 cortes a mano, mediana 8,6 m, P99 64 m y máximo 232,7 m.
 *  Para un plano en cm o en mm escalado ×1000, que da kilómetros. La vista previa enseña siempre las medidas en mm. */
export const LARGO_MAXIMO_MM = 250_000;
export function decidirEscala(origen: 'dwg' | 'dxf', insunits: number | undefined, caja: Caja): { factor: number; motivo: string } | { error: string } {
  const lado = Math.max(caja.x1 - caja.x0, caja.y1 - caja.y0);
  let factor: number, motivo: string;
  if (origen === 'dwg') { factor = 1000; motivo = 'Plano DWG en metros: se pasa a mm (×1000)'; }
  else if (insunits === 6) { factor = 1000; motivo = 'El DXF está en metros: se pasa a mm (×1000)'; }
  else if (insunits === 5) { factor = 10; motivo = 'El DXF está en centímetros: se pasa a mm (×10)'; }
  // $INSUNITS = 4 no es fiable: 58 de 68 DWG de la oficina dicen mm y están dibujados en metros (estudio Task 0).
  else if (insunits !== undefined && insunits !== 0 && insunits !== 4) return { error: `El DXF tiene unas unidades que no se usan en la oficina (código ${insunits}): guárdalo en metros o en mm desde ZWCAD` };
  else if (lado < 100) { factor = 1000; motivo = 'Por su tamaño, el DXF está en metros: se pasa a mm (×1000)'; }
  else { factor = 1; motivo = 'El DXF ya está en mm'; }
  const mm = lado * factor;
  if (!Number.isFinite(mm) || mm < 10 || mm > LARGO_MAXIMO_MM) return { error: `Con esa escala el corte mediría ${Math.round(mm).toLocaleString('es-ES')} mm: revisa las unidades del plano en ZWCAD` };
  return { factor, motivo };
}
