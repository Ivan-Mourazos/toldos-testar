import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Undo2, X } from 'lucide-react';
import { formOptions } from '../../domain/modelBehavior.js';
import { controlLabel } from './controlLabels';

// Aprobar o devolver un pedido en Revisión. Antes, "Aprobar" fallaba al pulsar si el
// pedido no tenía técnico ni revisor, y no había forma de devolverlo con un motivo
// aunque el servidor ya lo admitía (request-changes).
export type ReviewDecision = { mode: 'approve' | 'return'; orderCode: string; defaultReviewer: string };

export function ReviewDecisionDialog({ decision, onCancel, onSubmit }: {
  decision: ReviewDecision;
  onCancel: () => void;
  onSubmit: (value: { reviewer: string; note: string }) => void;
}) {
  const approving = decision.mode === 'approve';
  const [reviewer, setReviewer] = useState(decision.defaultReviewer);
  const [note, setNote] = useState('');
  const firstField = useRef<HTMLSelectElement>(null);
  const canSubmit = Boolean(reviewer) && (approving || note.trim().length > 0);

  useEffect(() => {
    firstField.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="confirmation-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <form
        className={`confirmation-dialog review-decision-dialog ${approving ? 'confirmation-default' : 'confirmation-warning'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-decision-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit({ reviewer, note: note.trim() });
        }}
      >
        <button type="button" className="confirmation-close" onClick={onCancel} aria-label="Cerrar diálogo"><X aria-hidden="true" /></button>
        <div className="confirmation-heading">
          <span className="confirmation-icon">{approving ? <CheckCircle2 aria-hidden="true" /> : <Undo2 aria-hidden="true" />}</span>
          <div>
            <span>{approving ? 'Paso 2 de 3' : 'Vuelve a Por revisar'}</span>
            <h2 id="review-decision-title">{approving ? `Aprobar ${decision.orderCode}` : `Devolver ${decision.orderCode} al técnico`}</h2>
          </div>
        </div>
        <p>
          {approving
            ? 'Aprobar no genera ningún archivo ni reserva. Después, «Generar archivos» guarda el PDF y los Excel de reserva, y antes te enseña la lista.'
            : 'El pedido sigue en Por revisar con tu nota. El técnico la verá al abrirlo con «Corregir en Pedido».'}
        </p>
        <label className="review-decision-field">
          <span>Quién revisa</span>
          <select ref={firstField} value={reviewer} onChange={(event) => setReviewer(event.target.value)} required>
            <option value="">Elegir…</option>
            {formOptions.tecnicos.map((name: string) => <option key={name} value={name}>{controlLabel(name)}</option>)}
          </select>
        </label>
        <label className="review-decision-field">
          <span>{approving ? 'Nota (opcional)' : 'Qué hay que cambiar'}</span>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={approving ? 'Por ejemplo: confirmado el lacado con el cliente' : 'Por ejemplo: el toldo B lleva motor, no máquina'}
            required={!approving}
          />
        </label>
        <div className="confirmation-actions">
          <button className="ghost-button" type="button" onClick={onCancel}>Seguir revisando</button>
          <button className={approving ? 'primary-button' : 'danger-button'} type="submit" disabled={!canSubmit}>
            {approving ? 'Aprobar (sin generar)' : 'Devolver al técnico'}
          </button>
        </div>
      </form>
    </div>
  );
}
