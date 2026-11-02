import React from 'react';
import type { OllaosAdaptados } from '../../remolques/clientes/adaptar-ollaos.ts';

export function AvisoOllaosAdaptados({ propuesta, modo }: { propuesta?: OllaosAdaptados; modo: string }) {
  return propuesta && modo === 'SEGUN SE INDICA'
    ? <p className="field-hint-warn rem-span-4" role="status">Propuesta · Ollaos adaptados de {propuesta.origenes.join(' y ')}: revisa. Puedes editarlos; solo pasan a la ficha con «Guardar en ficha».</p>
    : null;
}
