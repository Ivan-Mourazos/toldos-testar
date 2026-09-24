import React from 'react';
import { UserRound, X } from 'lucide-react';
import { formOptions } from '../../domain/modelBehavior.js';
import { controlLabel } from './controlLabels';

// La primera vez no se puede cerrar sin elegir (sin onCancel): así el autor de cada
// pedido se pone solo y no hay que pedir técnico ni revisor en el formulario.
export function WhoAreYouDialog({ current, onChoose, onCancel }: {
  current: string;
  onChoose: (name: string) => void;
  onCancel?: () => void;
}) {
  return (
    <div className="confirmation-backdrop">
      <section className="confirmation-dialog who-are-you-dialog" role="dialog" aria-modal="true" aria-labelledby="who-are-you-title">
        {onCancel && <button type="button" className="confirmation-close boton-3d" onClick={onCancel} aria-label="Cerrar diálogo"><X aria-hidden="true" /></button>}
        <div className="confirmation-heading">
          <span className="confirmation-icon"><UserRound aria-hidden="true" /></span>
          <div>
            <span>Este navegador</span>
            <h2 id="who-are-you-title">¿Quién eres?</h2>
          </div>
        </div>
        <p>Se pone como autor de los pedidos que guardes y la bandeja te enseña primero los tuyos. Se cambia desde «Soy» arriba a la derecha.</p>
        <div className="who-are-you-options">
          {(formOptions.tecnicos as string[]).map((name) => (
            <button key={name} type="button" className={name === current ? 'tecla-3d is-current' : 'tecla-3d'} aria-pressed={name === current} onClick={() => onChoose(name)}>{controlLabel(name)}</button>
          ))}
        </div>
      </section>
    </div>
  );
}
