import React, { useState } from 'react';
import { ArrowRight, Copy, Lock, LockOpen, Trash2 } from 'lucide-react';
import type { Awning, Calculation, RuleParameters } from '../types';
import { fabricOnlyModelNames, formOptions, fullAwningModelNames, getRequiredDimensions } from '../../domain/modelBehavior.js';
import { useVisibleFields } from '../hooks/useVisibleFields';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';
import { SegmentedField } from './SegmentedField';
import { FabricCombobox } from './FabricCombobox';
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
  const modelOptions = fabricOnly ? fabricOnlyModelNames : fullAwningModelNames;
  const [showGaliciaPrompt, setShowGaliciaPrompt] = useState(false);
  const update = (patch: Partial<Awning>) => onUpdate(awning.id, patch);
  const missingWindowDimensions = fields.curtain && awning.curtainHasWindow && [
    awning.curtainWindowExit,
    awning.curtainWindowCorner,
    awning.curtainWindowFloorHeight,
    awning.curtainWindowHeight
  ].some((value) => !Number(value));
  const incomplete = !awning.model
    || !awning.of
    || getRequiredDimensions(awning.model).some((field: keyof Awning) => !Number(awning[field]))
    || missingWindowDimensions;
  const status = incomplete ? 'SIN COMPLETAR' : ofCalculation ? (ofCalculation.valid ? 'VÁLIDO' : 'REVISAR') : 'SIN CALCULAR';
  const statusClass = status === 'VÁLIDO' ? 'badge-ok' : status === 'REVISAR' ? 'badge-danger' : '';
  // Si el toldo trae una salida que no está en la lista establecida (p. ej. un
  // borrador migrado con salida libre), mostramos el número real en vez de un
  // select en blanco que ocultaría el valor que el cálculo sí está usando.
  const projectionInList = awning.projection === null || (fields.establishedProjections || []).includes(awning.projection);
  const useEstablishedProjection = Boolean(fields.establishedProjections) && !awning.reglasModificadas && projectionInList;
  const automaticArms = fields.galicia
    ? suggestedGaliciaArmCount(awning.width, parameters.galicia)
    : 2;

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

  return (
    <article className={`awning-column panel${fabricOnly ? ' fabric-only-column' : ''}`}>
      <header className="awning-column-header">
        <span className="awning-column-tag">{`${fabricOnly ? 'TELA' : 'TOLDO'} ${awningLetter(index)}`}</span>
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

      <div className="awning-model-field"><SelectField label={fabricOnly ? 'Tipo de trabajo' : 'Modelo'} value={awning.model} options={modelOptions} placeholder="Elegir…" onChange={(model) => { setShowGaliciaPrompt(false); update({ model }); }} /></div>

      {awning.model && (
        <>
          {(fields.arzua || fields.galicia) && (
            <div className="awning-form-section">
              <span className="awning-form-section-title">Configuración</span>
              <SegmentedField
                label="Nº de brazos"
                value={String(awning.armCount || automaticArms)}
                options={(fields.galicia ? fields.armOptions : [2, 3]).map(String)}
                onChange={fields.galicia ? (value) => update({ armCount: Number(value) }) : chooseArms}
              />
              {fields.arzua && showGaliciaPrompt && (
                <div className="model-switch-prompt" role="alert">
                  <div><strong>3 brazos corresponde a GALICIA</strong><span>Se conservarán la OF, unidades y medidas.</span></div>
                  <button type="button" onClick={changeToGalicia}>Cambiar modelo<ArrowRight aria-hidden="true" /></button>
                </div>
              )}
            </div>
          )}
          {fields.tubeLoad && (
            <div className="awning-wide-field"><SegmentedField label="Tubo de carga" value={awning.tubeLoad} options={fields.tubeOptions} onChange={(tubeLoad) => update({ tubeLoad })} /></div>
          )}
          {fields.submodel && (
            <SelectField label="Submodelo" value={awning.submodel} options={fields.submodelOptions} placeholder="Elegir submodelo…" onChange={(submodel) => update({ submodel })} />
          )}
          <TextField label="OF" value={awning.of} onChange={(of) => update({ of: of.trim() })} />
          <NumberField label="Unidades" value={awning.units} min={1} onChange={(units) => update({ units })} />
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
          {fields.dimensions.includes('valanceHeight') && (
            <NumberField label={awning.model === 'BAMBALINA' ? 'Alto' : 'Bamba'} value={awning.valanceHeight} min={0} onChange={(valanceHeight) => update({ valanceHeight })} />
          )}
          {fields.curtain && (
            <div className="awning-form-section curtain-config">
              <span className="awning-form-section-title">Configuración de cortina</span>
              <div className="curtain-option">
                <SegmentedField label="Ventana" value={awning.curtainHasWindow ? 'CON VENTANA' : 'SIN VENTANA'} options={['SIN VENTANA', 'CON VENTANA']} onChange={(value) => update({ curtainHasWindow: value === 'CON VENTANA' })} />
              </div>
              <div className="curtain-option">
                <SegmentedField label="Confección" value={awning.curtainFinish} options={['NORMAL', 'VELCRO', 'TUBO']} onChange={(curtainFinish) => update({ curtainFinish: curtainFinish as Awning['curtainFinish'] })} />
              </div>
              {awning.curtainHasWindow && <>
                <NumberField label="Salida ventana" value={awning.curtainWindowExit} min={0} onChange={(curtainWindowExit) => update({ curtainWindowExit })} />
                <NumberField label="Esquina" value={awning.curtainWindowCorner} min={0} onChange={(curtainWindowCorner) => update({ curtainWindowCorner })} />
                <NumberField label="Suelo-ventana" value={awning.curtainWindowFloorHeight} min={0} onChange={(curtainWindowFloorHeight) => update({ curtainWindowFloorHeight })} />
                <NumberField label="H. ventana" value={awning.curtainWindowHeight} min={0} onChange={(curtainWindowHeight) => update({ curtainWindowHeight })} />
              </>}
            </div>
          )}
          {!sameFabric && <div className="awning-wide-field"><FabricCombobox label="Tela" value={awning.fabric} onChange={(fabric) => update({ fabric })} /></div>}
          {fields.device && (
            <SelectField label="Dispositivo" value={awning.device} options={fields.deviceOptions} placeholder="Elegir…" onChange={(device) => update({ device })} />
          )}
          {fields.sensor && (
            <SelectField label="Sensor" value={awning.sensor} options={formOptions.sensores.map((s) => s.sensor)} placeholder="Elegir…" onChange={(sensor) => update({ sensor })} />
          )}
          {(fields.machineLocation || fields.crankHeight) && (
            <div className="machine-controls awning-wide-field">
              {fields.machineLocation && <SegmentedField label="Lado máquina" value={awning.machineSide} options={formOptions.localizacionesMaquina} onChange={(machineSide) => update({ machineSide })} />}
              {fields.crankHeight && <SelectField label="Altura manivela" value={awning.crankHeight === null ? '' : String(awning.crankHeight)} options={formOptions.alturasManivela.map(String)} placeholder="Elegir…" onChange={(v) => update({ crankHeight: v === '' ? null : Number(v) })} />}
            </div>
          )}
          {fields.placement && (
            <div className="awning-wide-field"><SegmentedField label="Colocación" value={awning.placement} options={formOptions.colocaciones} onChange={(placement) => update({ placement })} /></div>
          )}
          {fields.wallType && (
            <SelectField label="Tipo de pared" value={awning.wallType} options={formOptions.tiposPared.map((p) => p.pared)} placeholder="No indicada" allowEmpty emptyLabel="No indicada" onChange={(wallType) => update({ wallType })} />
          )}
          {fields.arms && !fields.galicia && (
            <SegmentedField label="Nº brazos" value={awning.armCount === null ? '' : String(awning.armCount)} options={fields.armOptions.map(String)} onChange={(v) => update({ armCount: Number(v) })} />
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
