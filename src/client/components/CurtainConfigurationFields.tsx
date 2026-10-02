import React from 'react';
import type { Awning } from '../types';
import { curtainFabricAdjustments, curtainWindowDrawingHeight, normalizeCurtainConfiguration } from '../../domain/curtainConfiguration.js';
import { NumberField } from './NumberField';
import { SegmentedField } from './SegmentedField';
import { SelectField } from './SelectField';
import { useReadMode } from './ReadMode';

const adjustmentLabel = (value: string) => ({
  NINGUNO: 'Sin ajuste', 'TUBO DE CARGA': 'Descontar 18 cm · tubo de carga',
  ET: 'Descontar 11 cm · ET', PERSONALIZADO: 'Personalizado'
}[value] || value);

export function CurtainConfigurationFields({ awning, update, missing, bodyAllowanceCm }: {
  awning: Awning; update: (patch: Partial<Awning>) => void; missing: (field: string) => boolean; bodyAllowanceCm: number;
}) {
  const reading = useReadMode();
  const config = normalizeCurtainConfiguration(awning);
  const floor = config.curtainWindowReference === 'SUELO';
  const windowHeight = curtainWindowDrawingHeight(awning);
  return <>
    <div className="curtain-option">
      <SegmentedField label="Laterales" missing={missing('curtainFinish')} value={awning.curtainFinish === 'TUBO' ? 'NORMAL' : awning.curtainFinish} options={['NORMAL', 'VELCRO']} onChange={(curtainFinish) => update({ curtainFinish: curtainFinish as Awning['curtainFinish'] })} />
    </div>
    <div className="curtain-option">
      <SegmentedField label="Abajo" value={config.curtainBottomFinish} options={['TUBO DE CARGA', 'ET']} onChange={(curtainBottomFinish) => update({ curtainBottomFinish: curtainBottomFinish as Awning['curtainBottomFinish'] })} />
    </div>
    <div className="curtain-adjustment-row">
      <SelectField label="Ajuste de salida de tela" value={config.curtainFabricAdjustment} options={curtainFabricAdjustments} optionLabel={adjustmentLabel} onChange={(curtainFabricAdjustment) => update({ curtainFabricAdjustment: curtainFabricAdjustment as Awning['curtainFabricAdjustment'], curtainFabricAdjustmentCm: 0 })} />
      {config.curtainFabricAdjustment === 'PERSONALIZADO' && <NumberField label="Ajuste de salida (cm)" value={config.curtainFabricAdjustmentCm} step={0.5} missing={missing('curtainFabricAdjustmentCm')} onChange={(curtainFabricAdjustmentCm) => update({ curtainFabricAdjustmentCm })} />}
      {!reading && <p className="curtain-field-hint">Salida + {bodyAllowanceCm.toLocaleString('es-ES')} cm{config.curtainBottomFinish === 'ET' ? ' + 10 cm de ET' : ''}{Number(awning.valanceHeight) > 0 && !awning.valanceFabric ? ' + bamba + 5 cm' : ''}{config.curtainFabricAdjustment === 'PERSONALIZADO' ? '. Ajuste: positivo suma, negativo resta.' : '.'}</p>}
    </div>
    {awning.curtainHasWindow && <div className="curtain-window-measures" role="region" aria-label="Medidas de ventana">
      <div className="curtain-window-reference">
        <SegmentedField label="Medida a ventana desde" value={config.curtainWindowReference} options={['SUELO', 'TUBO DE CARGA']} onChange={(curtainWindowReference) => update({ curtainWindowReference: curtainWindowReference as Awning['curtainWindowReference'] })} />
      </div>
      <NumberField label="Esquina" missing={missing('curtainWindowCorner')} value={awning.curtainWindowCorner} min={0} onChange={(curtainWindowCorner) => update({ curtainWindowCorner })} />
      <NumberField label={floor ? 'Suelo-ventana' : 'Tubo-ventana'} missing={missing('curtainWindowFloorHeight')} value={awning.curtainWindowFloorHeight} min={floor ? 18.5 : 0} step={0.5} onChange={(curtainWindowFloorHeight) => update({ curtainWindowFloorHeight })} />
      <NumberField label="Altura ventana" missing={missing('curtainWindowHeight')} value={awning.curtainWindowHeight} min={0} onChange={(curtainWindowHeight) => update({ curtainWindowHeight })} />
      {!reading && awning.curtainWindowFloorHeight != null && <p className="curtain-field-hint">{windowHeight > 0 ? `En el dibujo: ${windowHeight.toLocaleString('es-ES')} cm${floor ? ' (medida − 18 cm)' : ''}.` : 'La distancia debe superar el descuento de suelo.'}</p>}
    </div>}
  </>;
}
