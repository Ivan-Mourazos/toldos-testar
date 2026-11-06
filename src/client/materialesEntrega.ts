import type { AskForConfirmation } from './components/NotificationCenter';

export interface AvisoMateriales {
  error?: string;
  huellaMateriales: string;
  cambiosMateriales: { of: string; sinReferencia?: boolean; codigo?: string; unidad?: string; antes?: number; ahora?: number; diferencia?: number }[];
}

export async function confirmarMateriales(datos: AvisoMateriales, preguntar: AskForConfirmation) {
  const n = (v = 0) => v.toLocaleString('es-ES', { maximumFractionDigits: 6 });
  return await preguntar({ title: 'Cambios de materiales de esta entrega', message: datos.error || 'Revisa la reserva de las OF corregidas.',
    details: datos.cambiosMateriales.map(c => c.sinReferencia
      ? `OF ${c.of}: el pedido antiguo no conserva su reserva. Comprueba los materiales anteriores a mano.`
      : `OF ${c.of} · ${c.codigo}: ${n(c.antes)} → ${n(c.ahora)} ${c.unidad} (${(c.diferencia ?? 0) > 0 ? '+' : ''}${n(c.diferencia)})`),
    confirmLabel: 'He revisado los cambios; generar', cancelLabel: 'Cancelar', tone: 'warning' }) === 'confirm';
}
