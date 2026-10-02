import React from 'react';
import type { DrawingParameters } from '../types';
import { automaticDrawingsForVariant, replacementLines, webDrawingVariants } from '../../domain/drawingCatalog.js';
import { controlLabel } from './controlLabels';
import { MiniaturaDibujo } from './MiniaturaDibujo';

// «Lo que sale hoy» (Iván, 02/10/2026): cada variante del modelo con la miniatura del dibujo de la
// web (la hace el servidor con el mismo código que el PDF) y el dibujo del taller que la sustituye
// solo, con los dibujos de esta pantalla (también los cambios sin guardar).
export function LoQueSaleHoy({ model, drawings }: { model: string; drawings: DrawingParameters }) {
  const variants = webDrawingVariants(model);
  return <section className="drawing-today" aria-labelledby="drawing-today-title">
    <div className="drawing-today-heading">
      <h3 id="drawing-today-title">Lo que sale hoy</h3>
      <p>El dibujo de la web en cada variante, con un toldo de ejemplo de 400 × 250 cm, y el dibujo del taller que lo sustituye solo.</p>
    </div>
    <ul className="drawing-today-grid">
      {variants.map((variant) => {
        const label = controlLabel(variant.label);
        return <li key={variant.id} className="drawing-today-item bloque-3d">
          {variant.webDrawing
            ? <MiniaturaDibujo model={model} variant={variant.id} label={label} />
            : <div className="drawing-today-none">La hoja de Hera es una tabla por toldo: la web no dibuja la confección.</div>}
          <strong>{label}</strong>
          {replacementLines(automaticDrawingsForVariant(variant, drawings)).map((line) => <small key={line}>{line}</small>)}
        </li>;
      })}
    </ul>
  </section>;
}
