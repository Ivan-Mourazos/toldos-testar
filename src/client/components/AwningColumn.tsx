import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import type { Awning, Calculation } from '../types';
import { formOptions } from '../../domain/modelBehavior.js';
import { modelNames } from '../../domain/modelBehavior.js';
import { useVisibleFields } from '../hooks/useVisibleFields';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';

type Props = {
  awning: Awning;
  index: number;
  ofCalculation?: Calculation['ofs'][number]['calculation'];
  onUpdate: (id: string, patch: Partial<Awning>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
};

export function AwningColumn({ awning, index, ofCalculation, onUpdate, onDuplicate, onRemove }: Props) {
  const fields = useVisibleFields(awning);
  const update = (patch: Partial<Awning>) => onUpdate(awning.id, patch);
  const valid = ofCalculation ? ofCalculation.valid : null;

  return (
    <article className="awning-column panel">
      <header className="awning-column-header">
        <span className="awning-column-tag">{`TOLDO ${String(index + 1).padStart(2, '0')}`}</span>
        <div className="card-actions">
          <button type="button" className="icon-button" onClick={() => onDuplicate(awning.id)} aria-label="Duplicar"><Copy /></button>
          <button type="button" className="icon-button" onClick={() => onRemove(awning.id)} aria-label="Eliminar"><Trash2 /></button>
        </div>
      </header>

      <SelectField label="Modelo" value={awning.model} options={modelNames} onChange={(model) => update({ model })} />
      {fields.tubeLoad && (
        <SelectField label="Tubo de carga" value={awning.tubeLoad} options={fields.tubeOptions} onChange={(tubeLoad) => update({ tubeLoad })} />
      )}
      {fields.submodel && (
        <SelectField label="Submodelo" value={awning.submodel} options={fields.submodelOptions} onChange={(submodel) => update({ submodel })} />
      )}
      <TextField label="OF" value={awning.of} onChange={(of) => update({ of })} />
      <NumberField label="Unidades" value={awning.units} min={1} onChange={(units) => update({ units })} />
      <NumberField label="Frente" value={awning.width} min={0} onChange={(width) => update({ width })} />
      <NumberField label="Salida" value={awning.projection} min={0} onChange={(projection) => update({ projection })} />
      <NumberField label="Bamba" value={awning.valanceHeight} min={0} onChange={(valanceHeight) => update({ valanceHeight })} />
      {fields.device && (
        <SelectField label="Dispositivo" value={awning.device} options={fields.deviceOptions} onChange={(device) => update({ device })} />
      )}
      {fields.sensor && (
        <SelectField label="Sensor" value={awning.sensor} options={formOptions.sensores.map((s) => s.sensor)} onChange={(sensor) => update({ sensor })} />
      )}
      {fields.machineLocation && (
        <SelectField label="Local. máquina" value={awning.machineSide} options={formOptions.localizacionesMaquina} onChange={(machineSide) => update({ machineSide })} />
      )}
      {fields.crankHeight && (
        <SelectField label="Altura manivela" value={String(awning.crankHeight)} options={formOptions.alturasManivela.map(String)} onChange={(v) => update({ crankHeight: Number(v) })} />
      )}
      {fields.placement && (
        <SelectField label="Coloc. toldo" value={awning.placement} options={formOptions.colocaciones} onChange={(placement) => update({ placement })} />
      )}
      {fields.wallType && (
        <SelectField label="Tipo de pared" value={awning.wallType} options={formOptions.tiposPared.map((p) => p.pared)} onChange={(wallType) => update({ wallType })} />
      )}
      {fields.arms && (
        <SelectField label="Nº brazos" value={String(awning.armCount)} options={formOptions.brazos.map(String)} onChange={(v) => update({ armCount: Number(v) })} />
      )}

      {!fields.implemented && (
        <p className="awning-pending">Sin reglas de cálculo todavía. Se guarda pero no genera materiales.</p>
      )}

      <details className="awning-overrides">
        <summary>Ajustes técnicos</summary>
        <SelectField label="Reglas cálculo" value={awning.calculationModelOverride} options={['SEGÚN MODELO', 'ARZUA PRO', 'GALICIA', 'CORTINA']} onChange={(v) => update({ calculationModelOverride: v })} />
        <SelectField label="Soportes / piezas" value={awning.supportSystemOverride} options={['SEGÚN MODELO', 'ARZUA PRO', 'GALICIA']} onChange={(v) => update({ supportSystemOverride: v })} />
        <label className="field"><span>Línea mínima override</span>
          <input type="number" min={0} placeholder="Sin override" value={awning.minimumLineOverride}
            onChange={(e) => update({ minimumLineOverride: e.target.value })} />
        </label>
        <label className="field"><span>Motivo del ajuste</span>
          <textarea value={awning.overrideReason} onChange={(e) => update({ overrideReason: e.target.value })} />
        </label>
      </details>

      <label className="field"><span>Anotaciones</span>
        <textarea value={awning.notes} onChange={(e) => update({ notes: e.target.value })} />
      </label>

      <footer className={`awning-status ${valid === null ? '' : valid ? 'badge-ok' : 'badge-danger'}`}>
        {valid === null ? 'SIN CALCULAR' : valid ? 'VÁLIDO' : 'REVISAR'}
      </footer>
    </article>
  );
}
