import React, { useState } from 'react';
import { ArrowRight, Copy, Lock, LockOpen, Trash2 } from 'lucide-react';
import type { Awning, Calculation, RuleParameters } from '../types';
import { formOptions, modelNames } from '../../domain/modelBehavior.js';
import { useVisibleFields } from '../hooks/useVisibleFields';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';
import { SegmentedField } from './SegmentedField';
import { resolveArzuaMotorPower, resolveArzuaSupport, suggestedTubeForDestination } from '../../domain/arzuaProParameters.js';
import { resolveGaliciaMotorPower, suggestedGaliciaArmCount, suggestedGaliciaTube } from '../../domain/galiciaParameters.js';

type Props = {
  awning: Awning;
  index: number;
  ofCalculation?: Calculation['ofs'][number]['calculation'];
  parameters: RuleParameters;
  onUpdate: (id: string, patch: Partial<Awning>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
};

export function AwningColumn({ awning, index, ofCalculation, parameters, onUpdate, onDuplicate, onRemove }: Props) {
  const fields = useVisibleFields(awning);
  const [showGaliciaPrompt, setShowGaliciaPrompt] = useState(false);
  const update = (patch: Partial<Awning>) => onUpdate(awning.id, patch);
  const incomplete = !awning.model || !awning.of || !awning.width || !awning.projection;
  const status = incomplete ? 'SIN COMPLETAR' : ofCalculation ? (ofCalculation.valid ? 'VÁLIDO' : 'REVISAR') : 'SIN CALCULAR';
  const statusClass = status === 'VÁLIDO' ? 'badge-ok' : status === 'REVISAR' ? 'badge-danger' : '';
  // Si el toldo trae una salida que no está en la lista establecida (p. ej. un
  // borrador migrado con salida libre), mostramos el número real en vez de un
  // select en blanco que ocultaría el valor que el cálculo sí está usando.
  const projectionInList = awning.projection === null || (fields.establishedProjections || []).includes(awning.projection);
  const useEstablishedProjection = Boolean(fields.establishedProjections) && !awning.reglasModificadas && projectionInList;
  const automaticSupport = fields.galicia ? 'GALICIA' : resolveArzuaSupport(awning, parameters.arzuaPro);
  const automaticMotor = fields.galicia
    ? resolveGaliciaMotorPower(awning, parameters.galicia)
    : resolveArzuaMotorPower(awning, parameters.arzuaPro);
  const automaticArms = fields.galicia
    ? suggestedGaliciaArmCount(awning.width, parameters.galicia)
    : 2;
  const effectiveSupport = ofCalculation?.supportSystem || automaticSupport;
  const effectiveMotor = ofCalculation?.motorPower || automaticMotor;
  const effectiveArms = ofCalculation?.armCount || awning.armCount || automaticArms;
  const effectiveTube = awning.tubeLoad || (fields.galicia
    ? suggestedGaliciaTube(awning.destination, parameters.galicia)
    : suggestedTubeForDestination(awning.destination, parameters.arzuaPro));

  function updateDestination(destination: string) {
    const tubeLoad = fields.galicia
      ? suggestedGaliciaTube(destination, parameters.galicia)
      : suggestedTubeForDestination(destination, parameters.arzuaPro);
    update({ destination, tubeLoad });
  }

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
            {awning.reglasModificadas ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
          </button>
          <button type="button" className="icon-button" onClick={() => onDuplicate(awning.id)} aria-label="Duplicar"><Copy aria-hidden="true" /></button>
          <button type="button" className="icon-button" onClick={() => onRemove(awning.id)} aria-label="Eliminar"><Trash2 aria-hidden="true" /></button>
        </div>
      </header>

      <div className="awning-model-field"><SelectField label="Modelo" value={awning.model} options={modelNames} placeholder="Elegir modelo…" onChange={(model) => { setShowGaliciaPrompt(false); update({ model }); }} /></div>

      {awning.model && (
        <>
          {(fields.arzua || fields.galicia) && (
            <div className="awning-form-section">
              <span className="awning-form-section-title">Uso</span>
              <SegmentedField label="Destino" value={awning.destination} options={['PARTICULAR', 'HOSTELERÍA / EMPRESA']} onChange={updateDestination} />
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
          <NumberField label="Frente" value={awning.width} min={0} onChange={updateWidth} />
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
          {(fields.arzua || fields.galicia) && (
            <>
              <div className="automatic-decisions" aria-live="polite">
                <div className="automatic-decisions-head"><span>Decisiones automáticas</span><small>RPSNext + reglas del modelo</small></div>
                <dl>
                  <div><dt>Tubo</dt><dd>{effectiveTube ? effectiveTube.replace('TUBO DE CARGA ', '') : 'Pendiente de destino'}</dd></div>
                  <div><dt>Soporte</dt><dd>{effectiveSupport}</dd></div>
                  <div><dt>Brazos</dt><dd>{fields.galicia ? `${effectiveArms} · individuales` : '2 · juego ARZUA'}</dd></div>
                  <div><dt>Motor</dt><dd>{awning.device === 'MOTOR' ? effectiveMotor : 'No aplica'}</dd></div>
                </dl>
              </div>
            </>
          )}
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
            <div className="awning-wide-field"><SegmentedField label="Coloc. toldo" value={awning.placement} options={formOptions.colocaciones} onChange={(placement) => update({ placement })} /></div>
          )}
          {fields.wallType && (
            <SelectField label="Tipo de pared" value={awning.wallType} options={formOptions.tiposPared.map((p) => p.pared)} placeholder="Elegir tipo de pared…" onChange={(wallType) => update({ wallType })} />
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

          <label className="field awning-wide-field"><span>Anotaciones</span>
            <textarea value={awning.notes} onChange={(e) => update({ notes: e.target.value })} />
          </label>
        </>
      )}

      <footer className={`awning-status ${statusClass}`}>{status}</footer>
    </article>
  );
}
