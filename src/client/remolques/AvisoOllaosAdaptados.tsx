import React from 'react';
import type { OllaosAdaptados } from '../../remolques/clientes/adaptar-ollaos.ts';

export function AvisoOllaosAdaptados({ propuesta, modo }: { propuesta?: OllaosAdaptados; modo: string }) {
  const medida = (m: OllaosAdaptados['hecha']) => `${m.largo.toLocaleString('es-ES')}×${m.ancho.toLocaleString('es-ES')}${m.anchoAtras && m.anchoAtras !== m.ancho ? ` (detrás ${m.anchoAtras.toLocaleString('es-ES')})` : ''}`;
  if (propuesta?.sinAdaptar && modo !== 'REPARTIDOS') return <p className="field-hint-warn rem-span-4" role="status">Ollaos sin adaptar: no se han podido adaptar a la lona de {medida(propuesta.hecha)}. {propuesta.sinAdaptar}. Revisa la referencia en la ficha y las posiciones antes de continuar.</p>;
  return propuesta && modo === 'SEGUN SE INDICA'
    ? <p className="field-hint-warn rem-span-4" role="status">Propuesta · {propuesta.referencia
      ? `Ollaos adaptados a la lona de ${medida(propuesta.hecha)} (apuntados para ${medida(propuesta.referencia)})`
      : `Ollaos adaptados de ${propuesta.origenes.join(' y ')}`}: revisa. Puedes editarlos; solo pasan a la ficha con «Guardar en ficha».</p>
    : null;
}
