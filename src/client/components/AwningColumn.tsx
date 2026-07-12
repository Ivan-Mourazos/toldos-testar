import React from 'react';
import { Copy, Lock, LockOpen, Trash2 } from 'lucide-react';
import type { Awning, Calculation } from '../types';
import { formOptions, modelNames } from '../../domain/modelBehavior.js';
import { useVisibleFields } from '../hooks/useVisibleFields';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';
import { SegmentedField } from './SegmentedField';

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
  const incomplete = !awning.model || !awning.of || !awning.width || !awning.projection;
  const status = incomplete ? 'SIN COMPLETAR' : ofCalculation ? (ofCalculation.valid ? 'VÁLIDO' : 'REVISAR') : 'SIN CALCULAR';
  const statusClass = status === 'VÁLIDO' ? 'badge-ok' : status === 'REVISAR' ? 'badge-danger' : '';
  const useEstablishedProjection = Boolean(fields.establishedProjections) && !awning.reglasModificadas;

  return (
    <article className="awning-column panel">
      <header className="awning-column-header">
        <span className="awning-column-tag">{`TOLDO ${String(index + 1).padStart(2, '0')}`}</span>
        <div className="card-actions">
          <button
            type="button"
            className={awning.reglasModificadas ? 'icon-button active' : 'icon-button'}
            aria-pressed={awning.reglasModificadas}
            aria-label={awning.reglasModificadas ? 'Reglas modificadas: volver a reglas estándar' : 'Modificar reglas del modelo'}
            onClick={() => update({ reglasModificadas: !awning.reglasModificadas })}
          >
            {awning.reglasModificadas ? <LockOpen /> : <Lock />}
          </button>
          <button type="button" className="icon-button" onClick={() => onDuplicate(awning.id)} aria-label="Duplicar"><Copy /></button>
          <button type="button" className="icon-button" onClick={() => onRemove(awning.id)} aria-label="Eliminar"><Trash2 /></button>
        </div>
      </header>

      <SelectField label="Modelo" value={awning.model} options={modelNames} placeholder="Elegir modelo…" onChange={(model) => update({ model })} />

      {awning.model && (
        <>
          {fields.tubeLoad && (
            <SegmentedField label="Tubo de carga" value={awning.tubeLoad} options={fields.tubeOptions} onChange={(tubeLoad) => update({ tubeLoad })} />
          )}
          {fields.submodel && (
            <SelectField label="Submodelo" value={awning.submodel} options={fields.submodelOptions} placeholder="Elegir submodelo…" onChange={(submodel) => update({ submodel })} />
          )}
          <TextField label="OF" value={awning.of} onChange={(of) => update({ of })} />
          <NumberField label="Unidades" value={awning.units} min={1} onChange={(units) => update({ units })} />
          <NumberField label="Frente" value={awning.width} min={0} onChange={(width) => update({ width })} />
          {useEstablishedProjection ? (
            <SelectField
              label="Salida"
              value={awning.projection === null ? '' : String(awning.projection)}
              options={(fields.establishedProjections || []).map(String)}
              placeholder="Elegir salida…"
              onChange={(v) => update({ projection: v === '' ? null : Number(v) })}
            />
          ) : (
            <NumberField label="Salida" value={awning.projection} min={0} onChange={(projection) => update({ projection })} />
          )}
          <NumberField label="Bamba" value={awning.valanceHeight} min={0} onChange={(valanceHeight) => update({ valanceHeight })} />
          {fields.device && (
            <SelectField label="Dispositivo" value={awning.device} options={fields.deviceOptions} placeholder="Elegir dispositivo…" onChange={(device) => update({ device })} />
          )}
          {fields.sensor && (
            <SelectField label="Sensor" value={awning.sensor} options={formOptions.sensores.map((s) => s.sensor)} placeholder="Elegir sensor…" onChange={(sensor) => update({ sensor })} />
          )}
          {fields.machineLocation && (
            <SegmentedField label="Local. máquina" value={awning.machineSide} options={formOptions.localizacionesMaquina} onChange={(machineSide) => update({ machineSide })} />
          )}
          {fields.crankHeight && (
            <SelectField label="Altura manivela" value={awning.crankHeight === null ? '' : String(awning.crankHeight)} options={formOptions.alturasManivela.map(String)} placeholder="Elegir altura…" onChange={(v) => update({ crankHeight: v === '' ? null : Number(v) })} />
          )}
          {fields.placement && (
            <SegmentedField label="Coloc. toldo" value={awning.placement} options={formOptions.colocaciones} onChange={(placement) => update({ placement })} />
          )}
          {fields.wallType && (
            <SelectField label="Tipo de pared" value={awning.wallType} options={formOptions.tiposPared.map((p) => p.pared)} placeholder="Elegir tipo de pared…" onChange={(wallType) => update({ wallType })} />
          )}
          {fields.arms && (
            <SegmentedField label="Nº brazos" value={awning.armCount === null ? '' : String(awning.armCount)} options={formOptions.brazos.map(String)} onChange={(v) => update({ armCount: Number(v) })} />
          )}

          {!fields.implemented && (
            <p className="awning-pending">Sin reglas de cálculo todavía. Se guarda pero no genera materiales.</p>
          )}

          {awning.reglasModificadas && (
            <p className="awning-modified-chip">Reglas modificadas: límites del modelo relajados para este toldo.</p>
          )}

          <label className="field"><span>Anotaciones</span>
            <textarea value={awning.notes} onChange={(e) => update({ notes: e.target.value })} />
          </label>
        </>
      )}

      <footer className={`awning-status ${statusClass}`}>{status}</footer>
    </article>
  );
}
