import React, { useState } from 'react';
import { ArrowRight, Copy, Lock, LockOpen, Trash2 } from 'lucide-react';
import type { Awning, Calculation, RuleParameters } from '../types';
import { formOptions, getRequiredDimensions } from '../../domain/modelBehavior.js';
import { useVisibleFields } from '../hooks/useVisibleFields';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';
import { SegmentedField } from './SegmentedField';
import { FabricCombobox } from './FabricCombobox';
import { controlLabel } from './controlLabels';
import { suggestedGaliciaArmCount } from '../../domain/galiciaParameters.js';

type Props = {
  awning: Awning;
  index: number;
  ofCalculation?: Calculation['ofs'][number]['calculation'];
  sameFabric: boolean;
  parameters: RuleParameters;
  onUpdate: (id: string, patch: Partial<Awning>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
};

export function AwningColumn({ awning, index, ofCalculation, parameters, sameFabric, onUpdate, onDuplicate, onRemove }: Props) {
  const fields = useVisibleFields(awning);
  const fabricOnly = awning.workType === 'FABRIC_ONLY';
  const [showGaliciaPrompt, setShowGaliciaPrompt] = useState(false);
  const update = (patch: Partial<Awning>) => onUpdate(awning.id, patch);
  const missingWindowDimensions = fields.curtain && awning.curtainHasWindow && [
    awning.curtainWindowExit,
    awning.curtainWindowCorner,
    awning.curtainWindowFloorHeight,
    awning.curtainWindowHeight
  ].some((value) => !Number(value));
  const missingCurtainConfig = fields.curtain
    && (awning.curtainHasWindow === null || !awning.curtainFinish);
  const supportsValance = fields.dimensions.includes('valanceHeight');
  const hasValance = awning.model === 'BAMBALINA' || Number(awning.valanceHeight) > 0;
  const missingValanceConfig = hasValance && !awning.valanceCurve;
  const missingFinishConfig = !awning.rotFabric
    || (hasValance && !awning.rotValance)
    || (!fabricOnly && !awning.structureColor);
  const incomplete = !awning.model
    || !awning.of
    || getRequiredDimensions(awning.model).some((field: keyof Awning) => !Number(awning[field]))
    || missingWindowDimensions
    || missingCurtainConfig
    || missingValanceConfig
    || missingFinishConfig;
  const status = incomplete ? 'SIN COMPLETAR' : ofCalculation ? (ofCalculation.valid ? 'VÁLIDO' : 'REVISAR') : 'SIN CALCULAR';
  const statusClass = status === 'VÁLIDO' ? 'badge-ok' : status === 'REVISAR' ? 'badge-danger' : '';
  // Si el toldo trae una salida que no está en la lista establecida (p. ej. un
  // borrador migrado con salida libre), mostramos el número real en vez de un
  // select en blanco que ocultaría el valor que el cálculo sí está usando.
  const projectionInList = awning.projection === null || (fields.establishedProjections || []).includes(awning.projection);
  const useEstablishedProjection = Boolean(fields.establishedProjections) && !awning.reglasModificadas && projectionInList;
  function chooseArms(value: string) {
    if (value === '3') {
      setShowGaliciaPrompt(true);
      return;
    }
    setShowGaliciaPrompt(false);
    update({ armCount: Number(value) });
  }

  function changeToGalicia() {
    setShowGaliciaPrompt(false);
    update({ model: 'GALICIA', armCount: 3 });
  }

  function updateWidth(width: number | null) {
    if (fields.galicia && width !== null) {
      update({ width, armCount: suggestedGaliciaArmCount(width, parameters.galicia) });
      return;
    }
    update({ width });
  }

  function updateValanceHeight(valanceHeight: number | null) {
    const nextHasValance = awning.model === 'BAMBALINA' || Number(valanceHeight) > 0;
    update({
      hasValance: nextHasValance,
      valanceHeight,
      valanceCurve: nextHasValance ? awning.valanceCurve : '',
      valanceFabric: nextHasValance ? awning.valanceFabric : ''
    });
  }

  return (
    <article className={`awning-column panel${fabricOnly ? ' fabric-only-column' : ''}`}>
      <header className="awning-column-header">
        <span className="awning-column-tag">{`${fabricOnly ? 'TELA' : 'TOLDO'} ${awningLetter(index)}`}</span>
        <strong className="awning-model-title">{controlLabel(awning.model)}</strong>
        <div className="card-actions">
          {!fabricOnly && <button
            type="button"
            className={awning.reglasModificadas ? 'icon-button active' : 'icon-button'}
            aria-pressed={awning.reglasModificadas}
            aria-label={awning.reglasModificadas ? 'Reglas modificadas: volver a reglas estándar' : 'Modificar reglas del modelo'}
            onClick={() => update({ reglasModificadas: !awning.reglasModificadas })}
          >
            {awning.reglasModificadas ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
          </button>}
          <button type="button" className="icon-button" onClick={() => onDuplicate(awning.id)} aria-label="Duplicar"><Copy aria-hidden="true" /></button>
          <button type="button" className="icon-button" onClick={() => onRemove(awning.id)} aria-label="Eliminar"><Trash2 aria-hidden="true" /></button>
        </div>
      </header>

      {awning.model && (
        <>
          <TextField label="OF" value={awning.of} onChange={(of) => update({ of: of.trim() })} />
          {fields.dimensions.includes('width') && <NumberField label="Frente" value={awning.width} min={0} onChange={updateWidth} />}
          {fields.dimensions.includes('projection') && (useEstablishedProjection ? (
            <SelectField
              label="Salida"
              value={awning.projection === null ? '' : String(awning.projection)}
              options={(fields.establishedProjections || []).map(String)}
              placeholder="Elegir…"
              onChange={(v) => update({ projection: v === '' ? null : Number(v) })}
            />
          ) : (
            <NumberField label="Salida" value={awning.projection} min={0} onChange={(projection) => update({ projection })} />
          ))}
          {supportsValance && (
            <NumberField label={awning.model === 'BAMBALINA' ? 'Alto' : 'Bamba (cm)'} value={awning.valanceHeight} min={0} onChange={updateValanceHeight} />
          )}
          {hasValance && (
            <div className="awning-valance-options awning-wide-field">
              <SelectField label="Curva bamba" value={awning.valanceCurve} options={formOptions.curvasBamba} placeholder="Elegir…" onChange={(valanceCurve) => update({ valanceCurve })} />
              <FabricCombobox label="Tela bamba" value={awning.valanceFabric} placeholder="Igual que la tela" onChange={(valanceFabric) => update({ valanceFabric })} />
            </div>
          )}
          {(fields.arzua || fields.galicia) && (
            <div className="awning-form-section awning-core-config">
              <SegmentedField
                label="Nº de brazos"
                value={awning.armCount === null ? '' : String(awning.armCount)}
                options={(fields.galicia ? fields.armOptions : [2, 3]).map(String)}
                onChange={fields.galicia ? (value) => update({ armCount: Number(value) }) : chooseArms}
              />
              {fields.tubeLoad && (
                <SegmentedField label="Tubo de carga" value={awning.tubeLoad} options={fields.tubeOptions} onChange={(tubeLoad) => update({ tubeLoad })} />
              )}
              {fields.arzua && showGaliciaPrompt && (
                <div className="model-switch-prompt" role="alert">
                  <div><strong>3 brazos corresponde a GALICIA</strong><span>Se conservarán la OF y las medidas.</span></div>
                  <button type="button" onClick={changeToGalicia}>Cambiar modelo<ArrowRight aria-hidden="true" /></button>
                </div>
              )}
            </div>
          )}
          {fields.tubeLoad && !fields.arzua && !fields.galicia && (
            <div className="awning-wide-field"><SegmentedField label="Tubo de carga" value={awning.tubeLoad} options={fields.tubeOptions} onChange={(tubeLoad) => update({ tubeLoad })} /></div>
          )}
          {fields.submodel && (
            <SelectField label="Submodelo" value={awning.submodel} options={fields.submodelOptions} placeholder="Elegir submodelo…" onChange={(submodel) => update({ submodel })} />
          )}
          <div className="awning-finish-row awning-wide-field">
            {!fabricOnly && <SelectField label="Lacado" value={awning.structureColor} options={formOptions.lacados} placeholder="Elegir…" allowEmpty emptyLabel="Sin indicar" onChange={(structureColor) => update({ structureColor })} />}
            <SegmentedField label="Rotulación tela" value={awning.rotFabric} options={formOptions.rotulacion} onChange={(rotFabric) => update({ rotFabric })} />
            {hasValance && <SegmentedField label="Rotulación bamba" value={awning.rotValance} options={formOptions.rotulacion} onChange={(rotValance) => update({ rotValance })} />}
          </div>
          {fields.curtain && (
            <div className="awning-form-section curtain-config">
              <span className="awning-form-section-title">Configuración de cortina</span>
              <div className="curtain-option">
                <SegmentedField label="Ventana" value={awning.curtainHasWindow === null ? '' : awning.curtainHasWindow ? 'CON VENTANA' : 'SIN VENTANA'} options={['SIN VENTANA', 'CON VENTANA']} onChange={(value) => update({ curtainHasWindow: value === 'CON VENTANA' })} />
              </div>
              {awning.curtainHasWindow !== null && <div className="curtain-option">
                <SegmentedField label="Confección" value={awning.curtainFinish} options={['NORMAL', 'VELCRO', 'TUBO']} onChange={(curtainFinish) => update({ curtainFinish: curtainFinish as Awning['curtainFinish'] })} />
              </div>}
              {awning.curtainHasWindow && <>
                <NumberField label="Salida ventana" value={awning.curtainWindowExit} min={0} onChange={(curtainWindowExit) => update({ curtainWindowExit })} />
                <NumberField label="Esquina" value={awning.curtainWindowCorner} min={0} onChange={(curtainWindowCorner) => update({ curtainWindowCorner })} />
                <NumberField label="Suelo-ventana" value={awning.curtainWindowFloorHeight} min={0} onChange={(curtainWindowFloorHeight) => update({ curtainWindowFloorHeight })} />
                <NumberField label="H. ventana" value={awning.curtainWindowHeight} min={0} onChange={(curtainWindowHeight) => update({ curtainWindowHeight })} />
              </>}
            </div>
          )}
          {!sameFabric && <div className="awning-wide-field"><FabricCombobox label="Tela" value={awning.fabric} onChange={(fabric) => update({ fabric })} /></div>}
          {(fields.device || fields.placement || fields.wallType) && (
            <div className="awning-installation-row awning-wide-field">
              {fields.device && <SelectField label="Dispositivo" value={awning.device} options={fields.deviceOptions} placeholder="Elegir…" onChange={(device) => update({ device })} />}
              {fields.placement && <SelectField label="Colocación" value={awning.placement} options={formOptions.colocaciones} placeholder="Elegir…" onChange={(placement) => update({ placement })} />}
              {fields.wallType && <SelectField label="Tipo de pared" value={awning.wallType} options={formOptions.tiposPared.map((p) => p.pared)} placeholder="No indicada" allowEmpty emptyLabel="No indicada" onChange={(wallType) => update({ wallType })} />}
            </div>
          )}
          {(fields.sensor || fields.machineLocation || fields.crankHeight) && (
            <div className="machine-controls awning-machine-controls">
              {fields.sensor && <SelectField label="Sensor" value={awning.sensor} options={formOptions.sensores.map((s) => s.sensor)} placeholder="Elegir…" onChange={(sensor) => update({ sensor })} />}
              {fields.machineLocation && <SelectField label="Lado máquina" value={awning.machineSide} options={formOptions.localizacionesMaquina} placeholder="Elegir…" onChange={(machineSide) => update({ machineSide })} />}
              {fields.crankHeight && <SelectField label="Altura manivela" value={awning.crankHeight === null ? '' : String(awning.crankHeight)} options={formOptions.alturasManivela.map(String)} placeholder="Elegir…" onChange={(v) => update({ crankHeight: v === '' ? null : Number(v) })} />}
            </div>
          )}
          {fields.arms && !fields.galicia && (
            <div className="awning-compact-choice"><SegmentedField label="Nº brazos" value={awning.armCount === null ? '' : String(awning.armCount)} options={fields.armOptions.map(String)} onChange={(v) => update({ armCount: Number(v) })} /></div>
          )}

          {!fields.implemented && (
            <p className="awning-pending">Sin reglas de cálculo todavía. Se guarda pero no genera materiales.</p>
          )}

          {awning.reglasModificadas && (
            <div className="awning-overrides">
              <p className="awning-modified-chip">Excepción técnica activa para este toldo.</p>
              {(fields.arzua || fields.galicia) && <>
                {awning.device === 'MOTOR' && <SegmentedField label="Motor" value={awning.motorPower} options={['AUTOMÁTICO', '55/17', '70/17']} onChange={(motorPower) => update({ motorPower })} />}
              </>}
            </div>
          )}

          <div className={`awning-notes awning-wide-field${fabricOnly ? ' fabric-only-notes' : ''}`}>
            {!fabricOnly && <label className="field"><span>Obs. estructura</span>
              <textarea value={awning.structureNotes} onChange={(e) => update({ structureNotes: e.target.value })} />
            </label>}
            <label className="field"><span>Obs. tela</span>
              <textarea value={awning.fabricNotes} onChange={(e) => update({ fabricNotes: e.target.value })} />
            </label>
          </div>
        </>
      )}

      <footer className={`awning-status ${statusClass}`}>{status}</footer>
    </article>
  );
}

function awningLetter(index: number) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}
