import React from 'react';
import type { Awning } from '../types';
import { AJUSTES_POR_DEFECTO } from '../../domain/corteLona/despiece.js';
import { bastillasTira, BORDES_TIRA } from '../../domain/corteLona/bambalina.js';
import { SegmentedField } from './SegmentedField';
import { NumberField } from './NumberField';

type Borde = 'izq' | 'der' | 'abajo' | 'arriba';
type Bastillas = NonNullable<Awning['bambaBastillas']>;

const ETIQUETAS: Record<Borde, string> = { izq: 'Punta izquierda', der: 'Punta derecha', abajo: 'Abajo', arriba: 'Arriba (varilla)' };

/**
 * Las bastillas de la bambalina suelta, borde a borde: bastilla de los cm que se quieran o al corte
 * (Iván, 20/11/2026: «tiene que salir en el formulario según se elija el material»). Sin tocar, las de siempre.
 * En PVC y Soltis van al corte; en acrílico, sin corte, se indican en el dibujo.
 */
export function BastillasBambalinaFields({ value, onda, onChange }: { value: Awning['bambaBastillas']; onda: boolean; onChange: (value: Bastillas | undefined) => void }) {
  const porDefecto = bastillasTira(AJUSTES_POR_DEFECTO, onda) as Record<Borde, number>;
  const actual = value ?? {};
  const cambiar = (borde: Borde, cm: number | undefined) => {
    const siguiente: Bastillas = { ...actual };
    if (cm === undefined || cm === porDefecto[borde]) delete siguiente[borde];
    else siguiente[borde] = cm;
    onChange(Object.keys(siguiente).length ? siguiente : undefined);
  };
  return <div className="awning-valance-hems awning-wide-field">
    <span className="awning-form-section-title">Bastillas de la bambalina</span>
    {BORDES_TIRA.map(([b]) => {
      const borde = b as Borde;
      const etiqueta = ETIQUETAS[borde];
      if (borde === 'abajo' && onda) return <p key={borde} className="curtain-field-hint" role="note">Abajo: con onda no lleva bastilla, el remate va aparte.</p>;
      const cm = actual[borde] ?? porDefecto[borde];
      return <div key={borde} className="awning-installation-row">
        <SegmentedField label={etiqueta} value={cm > 0 ? 'BASTILLA' : 'AL CORTE'} options={['BASTILLA', 'AL CORTE']}
          onChange={(opcion) => cambiar(borde, opcion === 'AL CORTE' ? 0 : porDefecto[borde] || 2)} />
        {cm > 0 && <NumberField label={`${etiqueta}: bastilla (cm)`} value={cm} min={0.5} step={0.5}
          onChange={(nuevo) => cambiar(borde, nuevo === null ? undefined : Math.max(0, nuevo))} />}
      </div>;
    })}
  </div>;
}
