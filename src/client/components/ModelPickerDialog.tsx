import React, { useEffect } from 'react';
import { Layers3, Scissors, X } from 'lucide-react';
import type { Awning } from '../types';
import { controlLabel, legacyModelName } from './controlLabels';
import { getModelBehavior } from '../../domain/modelBehavior.js';

type Props = {
  workType: Awning['workType'];
  models: string[];
  onSelect: (model: string) => void;
  onClose: () => void;
};

export function ModelPickerDialog({ workType, models, onSelect, onClose }: Props) {
  const fabricOnly = workType === 'FABRIC_ONLY';

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="model-picker-backdrop" role="dialog" aria-modal="true" aria-label={fabricOnly ? 'Elegir trabajo de tela' : 'Elegir modelo de toldo'} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="model-picker">
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

        <div className="model-picker-grid">
          {models.map((model) => {
            const implemented = getModelBehavior(model).implemented;
            return (
              <button key={model} type="button" className="model-picker-option" onClick={() => onSelect(model)}>
                <strong>{controlLabel(model)}</strong>
                <span>{legacyModelName(model) ? `Antes ${legacyModelName(model)} · ` : ''}{fabricOnly ? 'Sin estructura' : implemented ? 'Estructura y tela' : 'Pendiente de reglas'}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
