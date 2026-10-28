import React from 'react';
import type { Awning, EmbudoConfiguration } from '../types';
import { normalizeEmbudo, REMATES_EMBUDO, SUJECIONES_EMBUDO } from '../../domain/embudoConfiguration.js';
import { NumberField } from './NumberField';
import { SegmentedField } from './SegmentedField';
import { SelectField } from './SelectField';

type Props = { awning: Awning; update: (patch: Partial<Awning>) => void; missing: (field: string) => boolean };

export function embudoConfigurationFields({ awning, update, missing }: Props) {
  const e = normalizeEmbudo(awning.embudo);
  const commit = (patch: Partial<EmbudoConfiguration>) => update({ embudo: { ...e, ...patch } });
  const medida = (field: keyof EmbudoConfiguration, label: string, min = 0.1) => (
    <NumberField key={field} label={label} value={e[field] as number | null} min={min} step={0.5}
      missing={missing(`embudo_${field}`)} onChange={value => commit({ [field]: value })} />
  );
  return <>
    <SegmentedField label="Forma del embudo" missing={missing('embudo_forma')} value={e.forma} options={['CÓNICO', 'RECTO']}
      onChange={forma => commit({ forma })} />
    {medida('alto', 'Alto del embudo (cm)')}
    {medida('contornoArriba', e.forma === 'RECTO' ? 'Contorno (cm)' : 'Contorno de arriba (cm)')}
    {e.forma === 'CÓNICO' && medida('contornoAbajo', 'Contorno de abajo (cm)')}
    {medida('cierre', 'Cierre (cm)', 0)}
    <NumberField label="Cantidad" value={awning.units} min={1} step={1}
      onChange={units => update({ units: units ?? 0 })} />
    {(['Arriba', 'Abajo'] as const).map(boca => <React.Fragment key={boca}>
      <SelectField label={`Remate de ${boca.toLowerCase()}`} missing={missing(`embudo_remate${boca}`)} value={e[`remate${boca}`]} options={REMATES_EMBUDO}
        allowEmpty={false} onChange={value => commit({ [`remate${boca}`]: value })} />
      {e[`remate${boca}`] === 'BASTILLA' && medida(`bastilla${boca}`, `Bastilla de ${boca.toLowerCase()} (cm)`)}
    </React.Fragment>)}
    <SelectField label="Sujeción del embudo" missing={missing('embudo_sujecion')} value={e.sujecion} options={SUJECIONES_EMBUDO}
      allowEmpty={false} onChange={sujecion => commit({ sujecion })} />
    {e.sujecion !== 'NINGUNA' && <>
      {medida('anchoCinta', 'Ancho de cinta (mm)')}
      {medida('largoCinta', 'Largo de cinta (cm)')}
    </>}
  </>;
}
