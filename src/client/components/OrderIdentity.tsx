import React, { useRef } from 'react';
import { enUnRenglon, useAltoAjustado } from '../hooks/useAltoAjustado';

// La cabecera común conserva los campos y las condiciones de cada pantalla.
// `accion`: un botón en la misma fila, detrás de la fecha (remolques: «Traer de RPS»).
export function OrderIdentity({ pedido, cliente, fecha, onClienteChange, onFechaChange, clientDisabled = false, dateDisabled = false, accion }: {
  pedido: React.ReactNode; cliente: string; fecha: string;
  onClienteChange: (value: string) => void; onFechaChange: (value: string) => void;
  clientDisabled?: boolean; dateDisabled?: boolean; accion?: React.ReactNode;
}) {
  return <div className="order-header-group order-header-general">
    <h3>Datos del pedido</h3>
    <div className={`order-header-grid${accion ? ' con-accion' : ''}`}>
      {pedido}
      <label className="field"><span>Cliente</span><OrderCustomer value={cliente} disabled={clientDisabled} onChange={onClienteChange} /></label>
      <label className="field"><span>Fecha</span><input type="date" value={fecha} disabled={dateDisabled} onChange={e => onFechaChange(e.target.value)} /></label>
      {accion && <div className="order-header-accion">{accion}</div>}
    </div>
  </div>;
}

// La pieza de Cliente de Remolques pasa a común: crece sin introducir saltos manuales.
function OrderCustomer({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAltoAjustado(ref, value);
  return <textarea ref={ref} rows={1} name="clientePedido" aria-label="Cliente" className="order-customer" autoComplete="off" spellCheck={false} value={value} disabled={disabled}
    onChange={e => onChange(enUnRenglon(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} />;
}
