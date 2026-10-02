import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Layers3, Scissors, X } from 'lucide-react';
import type { Awning } from '../types';
import { controlLabel, legacyModelName } from './controlLabels';
import { groupModelsByFamily } from '../../domain/catalog.js';
import { modelReadiness, modelReadinessText } from '../../domain/modelReadiness.js';

type Props = {
  workType: Awning['workType'];
  models: string[];
  onSelect: (model: string) => void;
  onClose: () => void;
  // Cambiar el modelo de una tarjeta que ya existe (Iván, 02/10/2026): se puede pasar de toldo a
  // trabajo de tela y el elemento sigue en su puesto.
  cambio?: { letra: string; actual: string; onWorkType: (workType: Awning['workType']) => void };
};

// Iván, 25/09/2026: familias en columnas y filas compactas, para que la lista entre
// entera a 1280×720, con una marca de completo o de pendiente que se explica al pasar
// el ratón (o al llegar con el teclado).
export function ModelPickerDialog({ workType, models, onSelect, onClose, cambio }: Props) {
  const fabricOnly = workType === 'FABRIC_ONLY';
  const families = groupModelsByFamily(models);
  const anyPending = models.some((model) => !modelReadiness(model).ready);
  const anyReady = models.some((model) => modelReadiness(model).ready);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="model-picker-backdrop" role="dialog" aria-modal="true" aria-label={fabricOnly ? 'Elegir trabajo de tela' : 'Elegir modelo de toldo'} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={fabricOnly ? 'model-picker is-fabric' : 'model-picker'}>
        <header className="model-picker-header">
          <div className={fabricOnly ? 'model-picker-icon fabric' : 'model-picker-icon'}>
            {fabricOnly ? <Scissors aria-hidden="true" /> : <Layers3 aria-hidden="true" />}
          </div>
          <div>
            <span>{cambio ? `Cambiar el elemento ${cambio.letra}` : 'Nuevo elemento'}</span>
            <h2>{fabricOnly ? 'Elige el trabajo de tela' : 'Elige el modelo de toldo'}</h2>
          </div>
          {cambio && (
            <div className="orders-scope tira-3d glass-chip model-picker-kind" role="group" aria-label="Tipo de elemento">
              <button type="button" className={fabricOnly ? undefined : 'pestana-activa'} aria-pressed={!fabricOnly} onClick={() => cambio.onWorkType('FULL_AWNING')}>Toldo</button>
              <button type="button" className={fabricOnly ? 'pestana-activa' : undefined} aria-pressed={fabricOnly} onClick={() => cambio.onWorkType('FABRIC_ONLY')}>Trabajo de tela</button>
            </div>
          )}
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar selector"><X aria-hidden="true" /></button>
        </header>
        {cambio && <p className="model-picker-note">Sigue en el puesto {cambio.letra} con su OF, unidades, medidas y tela. Lo propio del modelo anterior se quita.</p>}

        <div className="model-picker-columns" style={{ gridTemplateColumns: `repeat(${families.length}, minmax(0, 1fr))` }}>
          {families.map(({ family, models: group }) => (
            <section className="model-picker-family" key={family || 'sin-familia'}>
              {family && <h3 className="model-picker-family-title">{family}</h3>}
              <ul className="model-picker-list">
                {group.map((model: string) => {
                  const { ready } = modelReadiness(model);
                  const help = modelReadinessText(model);
                  const helpId = `model-picker-help-${model.replace(/\W+/g, '-')}`;
                  const actual = cambio?.actual === model;
                  return (
                    <li key={model}>
                      <button type="button" className={actual ? 'model-picker-option is-current' : 'model-picker-option'} disabled={actual} aria-current={actual || undefined} onClick={() => onSelect(model)} aria-describedby={helpId}>
                        <span className="model-picker-name">
                          <strong>{controlLabel(model)}</strong>
                          {actual ? <small>Ahora</small> : legacyModelName(model) && <small>{legacyModelName(model)}</small>}
                        </span>
                        <span className={ready ? 'model-picker-status is-ready' : 'model-picker-status is-pending'}>
                          {ready ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
                          <span className="model-picker-tip" id={helpId} aria-hidden="true">{help}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <footer className="model-picker-legend">
          {anyReady && <span><CheckCircle2 aria-hidden="true" className="is-ready" />Completo</span>}
          {anyPending && <span><AlertTriangle aria-hidden="true" className="is-pending" />Falta confirmar algo con el taller · pasa el ratón por el aviso</span>}
        </footer>
      </section>
    </div>
  );
}
