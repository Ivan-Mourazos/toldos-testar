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
};

// Iván, 25/09/2026: familias en columnas y filas compactas, para que la lista entre
// entera a 1280×720, con una marca de completo o de pendiente que se explica al pasar
// el ratón (o al llegar con el teclado).
export function ModelPickerDialog({ workType, models, onSelect, onClose }: Props) {
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
            <span>Nuevo elemento</span>
            <h2>{fabricOnly ? 'Elige el trabajo de tela' : 'Elige el modelo de toldo'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar selector"><X aria-hidden="true" /></button>
        </header>

        <div className="model-picker-columns" style={{ gridTemplateColumns: `repeat(${families.length}, minmax(0, 1fr))` }}>
          {families.map(({ family, models: group }) => (
            <section className="model-picker-family" key={family || 'sin-familia'}>
              {family && <h3 className="model-picker-family-title">{family}</h3>}
              <ul className="model-picker-list">
                {group.map((model: string) => {
                  const { ready } = modelReadiness(model);
                  const help = modelReadinessText(model);
                  const helpId = `model-picker-help-${model.replace(/\W+/g, '-')}`;
                  return (
                    <li key={model}>
                      <button type="button" className="model-picker-option" onClick={() => onSelect(model)} aria-describedby={helpId}>
                        <span className="model-picker-name">
                          <strong>{controlLabel(model)}</strong>
                          {legacyModelName(model) && <small>{legacyModelName(model)}</small>}
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
