import React from 'react';
import { CheckCircle2, CircleDashed } from 'lucide-react';

// Solo resume los estados que ya calcula cada editor. No decide si se puede guardar.
// `avisos`: elementos listos que llevan un aviso; el aviso no impide guardar, así que cuentan
// como listos (la tarjeta dice «VÁLIDO») y solo se menciona.
export function OrderProgress({ total, ready, avisos = 0 }: { total: number; ready: number; avisos?: number }) {
  const pending = total - ready;
  return (
    <div className={`order-progress${total > 0 && pending === 0 ? ' is-ok' : ''}`} aria-label="Estado de los elementos">
      {total > 0 && pending === 0 ? <CheckCircle2 aria-hidden="true" /> : <CircleDashed aria-hidden="true" />}
      <strong>{total ? `${ready} de ${total} ${ready === 1 ? 'listo' : 'listos'}` : 'Sin elementos'}</strong>
      {pending > 0 && <span>{pending} por completar o revisar</span>}
      {avisos > 0 && <span>{avisos} con aviso</span>}
    </div>
  );
}
