import { generarCorteLona } from './corteLona/index.js';
import { awningLetter } from './awningCompleteness.js';
import { htmlPresentaciones, presentacionesDxf } from '../flujoDwg/planoDxf.js';
import { conHojasDelante } from '../flujoDwg/unirPdf.js';

/** La vista previa usa el mismo DXF que se entrega a oficina, sin convertir ni escribir archivos. */
export async function planteamientoConEmbudoCad(opciones, buildWeb) {
  const { order, onlyAwningId, sinHojaTelas, cadEmbudo, review, onSheetError } = opciones;
  const letras = new Set(order.awnings.flatMap((t, i) => t.model === 'EMBUDO'
    && (!onlyAwningId || t.id === onlyAwningId) && !sinHojaTelas?.(t, i) ? [awningLetter(i)] : []));
  if (!cadEmbudo || !letras.size) return buildWeb(opciones);
  let cad;
  try {
    const stock = await cadEmbudo.ofStockSacos();
    const corte = generarCorteLona(order, { ajustes: review?.corteLona?.ajustes,
      ofStockSacos: review?.corteLona?.ofStockSacos || stock.of });
    const nombres = [...letras].map(l => `EMBUDO ${l}`);
    const planos = corte.plano.filter(p => !p.incluidoEn && p.geometria.hojas.some(h => nombres.includes(h.nombre)));
    const encontradas = planos.flatMap(p => presentacionesDxf(p.dxf).map(h => h.nombre)).filter(n => nombres.includes(n));
    if (encontradas.length !== nombres.length || new Set(encontradas).size !== nombres.length) {
      throw new Error(corte.avisos.join(' ') || 'No se han podido generar todas las presentaciones del embudo.');
    }
    cad = await Promise.all(planos.map(p => cadEmbudo.render(htmlPresentaciones(p.dxf, order.orderCode, nombres))));
    // Solo se quitan las hojas de telas después de imprimir todas las presentaciones.
    const base = await buildWeb({ ...opciones, sinHojaTelas: (t, i) => letras.has(awningLetter(i)) || sinHojaTelas?.(t, i) });
    return await conHojasDelante(base, cad);
  } catch (error) {
    const aviso = `No se pudieron sacar las presentaciones del CAD del embudo. Se incluye el planteamiento completo: ${error.message}`;
    onSheetError?.(new Error(aviso), null);
    return buildWeb({ ...opciones, order: { ...order, notes: [order.notes, aviso].filter(Boolean).join('\n') } });
  }
}
