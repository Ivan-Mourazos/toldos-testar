import React, { useState } from 'react';
import { ArrowRight, Copy, Lock, LockOpen, Trash2 } from 'lucide-react';
import type { Awning, BoxDevice, Calculation, CortinaDevice, RuleParameters } from '../types';
import { formOptions, getRequiredDimensions } from '../../domain/modelBehavior.js';
import { useVisibleFields } from '../hooks/useVisibleFields';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';
import { SegmentedField } from './SegmentedField';
import { FabricCombobox } from './FabricCombobox';
import { controlLabel } from './controlLabels';
import { suggestedGaliciaArmCount } from '../../domain/galiciaParameters.js';
import { suggestedPuntoRectoArmCount } from '../../domain/puntoRectoParameters.js';
import { ambarPlacementGroup } from '../../domain/ambarBoxParameters.js';
import { normalizeAgataSubmodel, resolveAgataMinimumLine, suggestedAgataArmCount } from '../../domain/agataBoxParameters.js';
import { resolveFabricJobAllowance } from '../../domain/fabricJobParameters.js';
import { resolveMonoblockRule, resolveMonoblockSupportCount, suggestedMonoblockArmCount } from '../../domain/monoblock350Parameters.js';
import { maxiscreemVariantGroup } from '../../domain/maxiscreemParameters.js';

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
  const standaloneValance = awning.model === 'BAMBALINA';
  const simpleFabricJob = ['CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA'].includes(awning.model);
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
  const cortinaDevice = normalizeCortinaDevice(awning.device);
  const isBox = awning.model === 'PERLA BOX' || awning.model === 'CORAL BOX' || awning.model === 'CUARZO BOX';
  const isXacobeo = awning.model === 'XACOBEO';
  const isPuntoRecto = awning.model === 'PUNTO RECTO';
  const isMonoblock350 = awning.model === 'MONOBLOCK 350';
  const isMaxiscreem = awning.model === 'MAXISCREEM';
  const isAmbarBox = awning.model === 'AMBAR BOX';
  const isAgataBox = awning.model === 'AGATA BOX';
  const boxDevice = normalizeBoxDevice(awning.device);
  const maxisGroup = maxiscreemVariantGroup(awning.submodel);
  const maxisDiscounts = parameters.maxiscreem.discounts[maxisGroup][boxDevice || 'MAQUINA'];
  const monoblockArmCount = Number(awning.armCount) || suggestedMonoblockArmCount(awning.width, awning.projection, parameters.monoblock350);
  const monoblockRule = resolveMonoblockRule(awning.projection, monoblockArmCount, parameters.monoblock350);
  const monoblockDiscounts = parameters.monoblock350.discounts[boxDevice || 'MAQUINA'];
  const monoblockSupportCount = resolveMonoblockSupportCount(awning.width, awning.projection, monoblockArmCount, parameters.monoblock350);
  const xacDevice = normalizeCortinaDevice(awning.device);
  const boxParameters = awning.model === 'PERLA BOX'
    ? parameters.perlaBox
    : awning.model === 'CUARZO BOX'
      ? parameters.cuarzoBox
      : parameters.coralBox;
  const boxMinimumLine = boxDevice ? lookupBoxMinimum(boxParameters.minimumLineByProjection, awning.projection, boxDevice) : null;
  const xacMinimumLine = xacDevice ? lookupXacMinimum(parameters.xacobeo.minimumLineByProjection, awning.projection, xacDevice) : null;
  const ambarGroup = ambarPlacementGroup(awning.placement);
  const agataDevice = boxDevice;
  const agataVariant = normalizeAgataSubmodel(awning.submodel) || 'OPEN';
  const agataArmCount = Number(awning.armCount) || suggestedAgataArmCount(awning.width);
  const agataMinimumLine = agataDevice
    ? resolveAgataMinimumLine(awning.projection, agataDevice, agataArmCount, parameters.agataBox)
    : null;
  const agataDiscounts = agataDevice ? parameters.agataBox.discounts[agataVariant][agataDevice] : null;
  const hasValance = awning.model === 'BAMBALINA' || Number(awning.valanceHeight) > 0;
  const missingValanceConfig = hasValance && (
    !awning.valanceCurve
    || !awning.remate
    || (awning.remate === 'OTRO' && !awning.remateColor)
  );
  const missingFinishConfig = (!standaloneValance && !awning.rotFabric)
    || (hasValance && !awning.rotValance)
    || (!fabricOnly && !awning.structureColor);
  const incomplete = !awning.model
    || !awning.of
    || (fields.submodel && !awning.submodel)
    || getRequiredDimensions(awning.model).some((field: keyof Awning) => !Number(awning[field]))
    || missingWindowDimensions
    || missingCurtainConfig
    || missingValanceConfig
    || missingFinishConfig;
  const pointRequiredArms = suggestedPuntoRectoArmCount(awning.width, parameters.puntoRecto);
  const monoblockRequiredArms = suggestedMonoblockArmCount(awning.width, awning.projection, parameters.monoblock350);
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
    if (isPuntoRecto && width !== null) {
      const required = suggestedPuntoRectoArmCount(width, parameters.puntoRecto);
      update({ width, armCount: Math.max(Number(awning.armCount) || 0, required) });
      return;
    }
    if (isAgataBox && width !== null) {
      update({ width, armCount: suggestedAgataArmCount(width) });
      return;
    }
    if (isMonoblock350 && width !== null) {
      update({
        width,
        ...(Number(awning.projection) > 0
          ? { armCount: suggestedMonoblockArmCount(width, awning.projection, parameters.monoblock350) }
          : {})
      });
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
      valanceFabric: nextHasValance ? awning.valanceFabric : '',
      remate: nextHasValance ? awning.remate : '',
      remateColor: nextHasValance ? awning.remateColor : ''
    });
  }

  function updateProjection(projection: number | null) {
    if (isMonoblock350 && projection !== null && Number(awning.width) > 0) {
      update({ projection, armCount: suggestedMonoblockArmCount(awning.width, projection, parameters.monoblock350) });
      return;
    }
    update({ projection });
  }

  return (
    <article className={`awning-column panel${fabricOnly ? ' fabric-only-column' : ''}`}>
      <header className="awning-column-header">
        <span className="awning-column-tag">{`${fabricOnly ? 'TELA' : 'TOLDO'} ${awningLetter(index)}`}</span>
        <strong className="awning-model-title">{controlLabel(awning.model)}</strong>
        <div className="card-actions">
          <button
            type="button"
            className={awning.reglasModificadas ? 'icon-button active' : 'icon-button'}
            aria-pressed={awning.reglasModificadas}
            aria-label={awning.reglasModificadas ? 'Reglas modificadas: volver a reglas estándar' : 'Modificar reglas del modelo'}
            onClick={() => update({
              reglasModificadas: !awning.reglasModificadas,
              ...(awning.model === 'CAMBIO CORTINA' && !awning.reglasModificadas && awning.curtainFabricDeductionCm === null
                ? { curtainFabricDeductionCm: parameters.cambioCortina.bottomDeductionCm }
                : {}),
              ...(awning.model === 'CORTINA' && !awning.reglasModificadas && cortinaDevice
                ? {
                    curtainFabricDeductionCm: awning.curtainFabricDeductionCm ?? 0,
                    curtainFabricWidthDiscountCm: awning.curtainFabricWidthDiscountCm ?? parameters.cortina.fabricWidthDiscounts[cortinaDevice],
                    curtainRollTubeDiscountCm: awning.curtainRollTubeDiscountCm ?? parameters.cortina.rollTubeDiscounts[cortinaDevice],
                    curtainLoadProfileDiscountCm: awning.curtainLoadProfileDiscountCm ?? parameters.cortina.loadProfileDiscounts[cortinaDevice]
                  }
                : {}),
              ...(isBox && !awning.reglasModificadas && boxDevice
                ? {
                    boxMinimumLineCm: awning.boxMinimumLineCm ?? boxMinimumLine,
                    boxProfileDiscountCm: awning.boxProfileDiscountCm ?? boxParameters.profileDiscountCm[boxDevice],
                    boxRollDiscountCm: awning.boxRollDiscountCm ?? boxParameters.rollDiscountCm[boxDevice],
                    boxFabricWidthDiscountCm: awning.boxFabricWidthDiscountCm ?? boxParameters.fabricWidthDiscountCm[boxDevice],
                    boxProtectorDiscountCm: awning.boxProtectorDiscountCm ?? boxParameters.protectorDiscountCm[boxDevice]
                  }
                : {}),
              ...(isXacobeo && !awning.reglasModificadas && xacDevice
                ? {
                    xacMinimumLineCm: awning.xacMinimumLineCm ?? xacMinimumLine,
                    xacFabricWidthDiscountCm: awning.xacFabricWidthDiscountCm ?? parameters.xacobeo.fabricWidthDiscounts[xacDevice],
                    xacRollDiscountCm: awning.xacRollDiscountCm ?? parameters.xacobeo.rollTubeDiscounts[xacDevice],
                    xacLoadBarDiscountCm: awning.xacLoadBarDiscountCm ?? parameters.xacobeo.loadBarDiscounts[xacDevice]
                  }
                : {}),
              ...(isPuntoRecto && !awning.reglasModificadas
                ? {
                    pointFabricWidthDiscountCm: awning.pointFabricWidthDiscountCm ?? parameters.puntoRecto.fabricWidthDiscounts[boxDevice || 'MAQUINA'],
                    pointRollDiscountCm: awning.pointRollDiscountCm ?? parameters.puntoRecto.rollTubeDiscounts[boxDevice || 'MAQUINA'],
                    pointLoadBarDiscountCm: awning.pointLoadBarDiscountCm ?? parameters.puntoRecto.loadBarDiscounts[boxDevice || 'MAQUINA'],
                    pointFabricDropMultiplier: awning.pointFabricDropMultiplier ?? parameters.puntoRecto.fabricDropMultiplier,
                    pointFabricDropAllowanceCm: awning.pointFabricDropAllowanceCm ?? parameters.puntoRecto.fabricDropAllowanceCm
                  }
                : {}),
              ...(isMonoblock350 && !awning.reglasModificadas
                ? {
                    monoblockMinimumLineCm: awning.monoblockMinimumLineCm ?? monoblockRule?.minimum ?? null,
                    monoblockMaximumLineCm: awning.monoblockMaximumLineCm ?? monoblockRule?.maximum ?? null,
                    monoblockSupportCount: awning.monoblockSupportCount ?? ofCalculation?.supportCount ?? monoblockSupportCount,
                    monoblockFabricWidthDiscountCm: awning.monoblockFabricWidthDiscountCm ?? monoblockDiscounts.fabric,
                    monoblockRollDiscountCm: awning.monoblockRollDiscountCm ?? monoblockDiscounts.roll,
                    monoblockLoadBarDiscountCm: awning.monoblockLoadBarDiscountCm ?? monoblockDiscounts.loadBar,
                    monoblockSquareBarDiscountCm: awning.monoblockSquareBarDiscountCm ?? monoblockDiscounts.squareBar,
                    monoblockFabricDropAllowanceCm: awning.monoblockFabricDropAllowanceCm ?? parameters.monoblock350.fabricDropAllowanceCm
                  }
                : {}),
              ...(isMaxiscreem && !awning.reglasModificadas
                ? {
                    maxisFabricWidthDiscountCm: awning.maxisFabricWidthDiscountCm ?? maxisDiscounts.fabric,
                    maxisRollDiscountCm: awning.maxisRollDiscountCm ?? maxisDiscounts.roll,
                    maxisLoadBarDiscountCm: awning.maxisLoadBarDiscountCm ?? maxisDiscounts.loadBar,
                    maxisBoxProfileDiscountCm: awning.maxisBoxProfileDiscountCm ?? maxisDiscounts.boxProfile,
                    maxisFabricDropAllowanceCm: awning.maxisFabricDropAllowanceCm ?? parameters.maxiscreem.fabricDropAllowanceCm
                  }
                : {}),
              ...(isAmbarBox && !awning.reglasModificadas && boxDevice
                ? {
                    ambarFabricWidthDiscountCm: awning.ambarFabricWidthDiscountCm ?? parameters.ambarBox.fabricWidthDiscounts[ambarGroup][boxDevice],
                    ambarRollDiscountCm: awning.ambarRollDiscountCm ?? parameters.ambarBox.rollTubeDiscounts[ambarGroup][boxDevice],
                    ambarProfileDiscountCm: awning.ambarProfileDiscountCm ?? parameters.ambarBox.profileDiscounts[ambarGroup][boxDevice],
                    ambarFabricDropMultiplier: awning.ambarFabricDropMultiplier ?? parameters.ambarBox.fabricDropMultiplier,
                    ambarFabricDropAllowanceCm: awning.ambarFabricDropAllowanceCm ?? parameters.ambarBox.fabricDropAllowanceCm
                  }
                : {}),
              ...(isAgataBox && !awning.reglasModificadas && agataDevice && agataDiscounts
                ? {
                    agataMinimumLineCm: awning.agataMinimumLineCm ?? agataMinimumLine,
                    agataSupportCount: awning.agataSupportCount ?? ofCalculation?.supportCount ?? null,
                    agataFabricWidthDiscountCm: awning.agataFabricWidthDiscountCm ?? agataDiscounts.fabric,
                    agataRollDiscountCm: awning.agataRollDiscountCm ?? agataDiscounts.roll,
                    agataFabricDropAllowanceCm: awning.agataFabricDropAllowanceCm ?? parameters.agataBox.fabricDropAllowanceCm
                  }
                : {}),
              ...(simpleFabricJob && !awning.reglasModificadas
                ? {
                    fabricJobWidthAdjustmentCm: awning.fabricJobWidthAdjustmentCm ?? 0,
                    fabricJobDropAllowanceCm: awning.fabricJobDropAllowanceCm ?? resolveFabricJobAllowance(awning.model, hasValance, parameters.fabricJobs),
                    fabricJobValanceExtraCm: awning.fabricJobValanceExtraCm ?? parameters.fabricJobs.valanceExtraCm
                  }
                : {})
            })}
          >
            {awning.reglasModificadas ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
          </button>
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
              onChange={(v) => updateProjection(v === '' ? null : Number(v))}
            />
          ) : (
            <NumberField label="Salida" value={awning.projection} min={0} onChange={updateProjection} />
          ))}
          {supportsValance && (
            <NumberField label={awning.model === 'BAMBALINA' ? 'Alto' : 'Bamba (cm)'} value={awning.valanceHeight} min={0} onChange={updateValanceHeight} />
          )}
          {hasValance && (
            <div className="awning-valance-options awning-wide-field">
              <SelectField label="Curva bamba" value={awning.valanceCurve} options={formOptions.curvasBamba} placeholder="Elegir…" onChange={(valanceCurve) => update({ valanceCurve })} />
              {!standaloneValance && <FabricCombobox label="Tela bamba" value={awning.valanceFabric} placeholder="Igual que la tela" onChange={(valanceFabric) => update({ valanceFabric })} />}
              <SegmentedField label="Remate" value={awning.remate} options={['COMO TELA', 'OTRO']} onChange={(remate) => update({ remate, remateColor: remate === 'COMO TELA' ? '' : awning.remateColor })} />
              {awning.remate === 'OTRO' && <TextField label="Color remate" value={awning.remateColor} onChange={(remateColor) => update({ remateColor })} />}
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
            <SelectField label="Variante" value={awning.submodel} options={fields.submodelOptions} placeholder="Elegir variante…" onChange={(submodel) => update({ submodel, ...(isAgataBox && submodel === 'COFRE' && awning.device === 'MAQUINA' ? { device: '' } : {}) })} />
          )}
          <div className="awning-finish-row awning-wide-field">
            {!fabricOnly && <SelectField label="Lacado" value={awning.structureColor} options={formOptions.lacados} placeholder="Elegir…" allowEmpty emptyLabel="Sin indicar" onChange={(structureColor) => update({ structureColor })} />}
            {!standaloneValance && <SegmentedField label="Rotulación tela" value={awning.rotFabric} options={formOptions.rotulacion} onChange={(rotFabric) => update({ rotFabric })} />}
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
            <div className="awning-compact-choice"><SegmentedField label={isPuntoRecto ? `Nº brazos · mínimo ${pointRequiredArms}` : isMonoblock350 ? `Nº brazos · automático ${monoblockRequiredArms}` : isAgataBox ? `Nº brazos · automático ${suggestedAgataArmCount(awning.width)}` : 'Nº brazos'} value={awning.armCount === null ? '' : String(awning.armCount)} options={fields.armOptions.map(String)} onChange={(v) => update({ armCount: Number(v) })} /></div>
          )}

          {!fields.implemented && (
            <p className="awning-pending">Sin reglas de cálculo todavía. Se guarda pero no genera materiales.</p>
          )}

          {awning.reglasModificadas && (
            <div className="awning-overrides">
              <p className="awning-modified-chip">Excepción técnica activa para este toldo.</p>
              {fields.curtain && (
                <NumberField
                  label="Descuento inferior tela (cm)"
                  value={awning.curtainFabricDeductionCm}
                  min={0}
                  step={0.5}
                  onChange={(curtainFabricDeductionCm) => update({ curtainFabricDeductionCm })}
                />
              )}
              {awning.model === 'CORTINA' && <>
                <NumberField label="Descuento frente tela (cm)" value={awning.curtainFabricWidthDiscountCm} min={0} step={0.5} onChange={(curtainFabricWidthDiscountCm) => update({ curtainFabricWidthDiscountCm })} />
                <NumberField label="Descuento tubo enrollamiento (cm)" value={awning.curtainRollTubeDiscountCm} min={0} step={0.5} onChange={(curtainRollTubeDiscountCm) => update({ curtainRollTubeDiscountCm })} />
                <NumberField label="Descuento Univers 280 (cm)" value={awning.curtainLoadProfileDiscountCm} min={0} step={0.5} onChange={(curtainLoadProfileDiscountCm) => update({ curtainLoadProfileDiscountCm })} />
              </>}
              {isBox && <>
                <NumberField label="Frente mínimo (cm)" value={awning.boxMinimumLineCm} min={0} step={0.5} onChange={(boxMinimumLineCm) => update({ boxMinimumLineCm })} />
                <NumberField label="Descuento kit perfiles (cm)" value={awning.boxProfileDiscountCm} min={0} step={0.1} onChange={(boxProfileDiscountCm) => update({ boxProfileDiscountCm })} />
                <NumberField label="Descuento tubo enrollamiento (cm)" value={awning.boxRollDiscountCm} min={0} step={0.1} onChange={(boxRollDiscountCm) => update({ boxRollDiscountCm })} />
                <NumberField label="Descuento frente tela (cm)" value={awning.boxFabricWidthDiscountCm} min={0} step={0.1} onChange={(boxFabricWidthDiscountCm) => update({ boxFabricWidthDiscountCm })} />
                <NumberField label="Descuento protector lona (cm)" value={awning.boxProtectorDiscountCm} min={0} step={0.1} onChange={(boxProtectorDiscountCm) => update({ boxProtectorDiscountCm })} />
                {boxDevice === 'MOTOR' && <SegmentedField label="Motor" value={awning.motorPower || 'AUTOMÁTICO'} options={['AUTOMÁTICO', '30/17', '35/17', '40/17', '50/17']} onChange={(motorPower) => update({ motorPower })} />}
              </>}
              {isXacobeo && <>
                <NumberField label="Frente mínimo (cm)" value={awning.xacMinimumLineCm} min={0} step={0.5} onChange={(xacMinimumLineCm) => update({ xacMinimumLineCm })} />
                <NumberField label="Descuento frente tela (cm)" value={awning.xacFabricWidthDiscountCm} min={0} step={0.1} onChange={(xacFabricWidthDiscountCm) => update({ xacFabricWidthDiscountCm })} />
                <NumberField label="Descuento tubo enrollamiento (cm)" value={awning.xacRollDiscountCm} min={0} step={0.1} onChange={(xacRollDiscountCm) => update({ xacRollDiscountCm })} />
                <NumberField label="Descuento tubo de carga (cm)" value={awning.xacLoadBarDiscountCm} min={0} step={0.1} onChange={(xacLoadBarDiscountCm) => update({ xacLoadBarDiscountCm })} />
              </>}
              {isPuntoRecto && <>
                <NumberField label="Nº de brazos manual" value={awning.armCount} min={1} max={4} step={1} onChange={(armCount) => update({ armCount })} />
                <NumberField label="Descuento frente tela (cm)" value={awning.pointFabricWidthDiscountCm} min={0} step={0.1} onChange={(pointFabricWidthDiscountCm) => update({ pointFabricWidthDiscountCm })} />
                <NumberField label="Descuento tubo enrollamiento (cm)" value={awning.pointRollDiscountCm} min={0} step={0.1} onChange={(pointRollDiscountCm) => update({ pointRollDiscountCm })} />
                <NumberField label="Descuento Univers 270 (cm)" value={awning.pointLoadBarDiscountCm} min={0} step={0.1} onChange={(pointLoadBarDiscountCm) => update({ pointLoadBarDiscountCm })} />
                <NumberField label="Factor diagonal de paño" value={awning.pointFabricDropMultiplier} min={0} step={0.01} onChange={(pointFabricDropMultiplier) => update({ pointFabricDropMultiplier })} />
                <NumberField label="Margen fijo de paño (cm)" value={awning.pointFabricDropAllowanceCm} min={0} step={0.5} onChange={(pointFabricDropAllowanceCm) => update({ pointFabricDropAllowanceCm })} />
              </>}
              {isMonoblock350 && <>
                <NumberField label="Frente mínimo (cm)" value={awning.monoblockMinimumLineCm} min={0} step={0.1} onChange={(monoblockMinimumLineCm) => update({ monoblockMinimumLineCm })} />
                <NumberField label="Frente máximo (cm)" value={awning.monoblockMaximumLineCm} min={0} step={0.1} onChange={(monoblockMaximumLineCm) => update({ monoblockMaximumLineCm })} />
                <NumberField label="Nº de soportes" value={awning.monoblockSupportCount} min={1} step={1} onChange={(monoblockSupportCount) => update({ monoblockSupportCount })} />
                <NumberField label="Descuento frente tela (cm)" value={awning.monoblockFabricWidthDiscountCm} min={0} step={0.1} onChange={(monoblockFabricWidthDiscountCm) => update({ monoblockFabricWidthDiscountCm })} />
                <NumberField label="Descuento P801 (cm)" value={awning.monoblockRollDiscountCm} min={0} step={0.1} onChange={(monoblockRollDiscountCm) => update({ monoblockRollDiscountCm })} />
                <NumberField label="Descuento EVO 80 (cm)" value={awning.monoblockLoadBarDiscountCm} min={0} step={0.1} onChange={(monoblockLoadBarDiscountCm) => update({ monoblockLoadBarDiscountCm })} />
                <NumberField label="Descuento barra 40×40 (cm)" value={awning.monoblockSquareBarDiscountCm} min={0} step={0.1} onChange={(monoblockSquareBarDiscountCm) => update({ monoblockSquareBarDiscountCm })} />
                <NumberField label="Margen caída tela (cm)" value={awning.monoblockFabricDropAllowanceCm} min={0} step={0.5} onChange={(monoblockFabricDropAllowanceCm) => update({ monoblockFabricDropAllowanceCm })} />
                {boxDevice === 'MOTOR' && <SegmentedField label="Motor" value={awning.motorPower || 'AUTOMÁTICO'} options={['AUTOMÁTICO', '40/17', '50/12', '55/17', '70/17', '85/17', '100/12']} onChange={(motorPower) => update({ motorPower })} />}
              </>}
              {isMaxiscreem && <>
                <NumberField label="Descuento frente tela (cm)" value={awning.maxisFabricWidthDiscountCm} min={0} step={0.1} onChange={(maxisFabricWidthDiscountCm) => update({ maxisFabricWidthDiscountCm })} />
                <NumberField label="Descuento tubo P801 (cm)" value={awning.maxisRollDiscountCm} min={0} step={0.1} onChange={(maxisRollDiscountCm) => update({ maxisRollDiscountCm })} />
                <NumberField label="Descuento perfil de carga (cm)" value={awning.maxisLoadBarDiscountCm} min={0} step={0.1} onChange={(maxisLoadBarDiscountCm) => update({ maxisLoadBarDiscountCm })} />
                {maxisGroup === 'COFRE' && <NumberField label="Descuento perfil de cofre (cm)" value={awning.maxisBoxProfileDiscountCm} min={0} step={0.1} onChange={(maxisBoxProfileDiscountCm) => update({ maxisBoxProfileDiscountCm })} />}
                <NumberField label="Margen caída tela (cm)" value={awning.maxisFabricDropAllowanceCm} min={0} step={0.5} onChange={(maxisFabricDropAllowanceCm) => update({ maxisFabricDropAllowanceCm })} />
              </>}
              {isAmbarBox && <>
                <NumberField label="Descuento frente tela (cm)" value={awning.ambarFabricWidthDiscountCm} min={0} step={0.1} onChange={(ambarFabricWidthDiscountCm) => update({ ambarFabricWidthDiscountCm })} />
                <NumberField label="Descuento tubo enrollamiento (cm)" value={awning.ambarRollDiscountCm} min={0} step={0.1} onChange={(ambarRollDiscountCm) => update({ ambarRollDiscountCm })} />
                <NumberField label="Descuento kit perfiles (cm)" value={awning.ambarProfileDiscountCm} min={0} step={0.1} onChange={(ambarProfileDiscountCm) => update({ ambarProfileDiscountCm })} />
                <NumberField label="Factor diagonal de paño" value={awning.ambarFabricDropMultiplier} min={0} step={0.01} onChange={(ambarFabricDropMultiplier) => update({ ambarFabricDropMultiplier })} />
                <NumberField label="Margen fijo de paño (cm)" value={awning.ambarFabricDropAllowanceCm} min={0} step={0.5} onChange={(ambarFabricDropAllowanceCm) => update({ ambarFabricDropAllowanceCm })} />
              </>}
              {isAgataBox && <>
                <NumberField label="Frente mínimo (cm)" value={awning.agataMinimumLineCm} min={0} step={0.1} onChange={(agataMinimumLineCm) => update({ agataMinimumLineCm })} />
                <NumberField label="Nº de soportes" value={awning.agataSupportCount} min={1} step={1} onChange={(agataSupportCount) => update({ agataSupportCount })} />
                <NumberField label="Descuento frente tela (cm)" value={awning.agataFabricWidthDiscountCm} min={0} step={0.1} onChange={(agataFabricWidthDiscountCm) => update({ agataFabricWidthDiscountCm })} />
                <NumberField label="Descuento tubo enrollamiento (cm)" value={awning.agataRollDiscountCm} min={0} step={0.1} onChange={(agataRollDiscountCm) => update({ agataRollDiscountCm })} />
                <NumberField label="Margen caída tela (cm)" value={awning.agataFabricDropAllowanceCm} min={0} step={0.5} onChange={(agataFabricDropAllowanceCm) => update({ agataFabricDropAllowanceCm })} />
                {agataDevice === 'MOTOR' && <SegmentedField label="Motor" value={awning.motorPower || 'AUTOMÁTICO'} options={['AUTOMÁTICO', '35/17', '40/17', '55/17', '70/17', '85/17', '100/17']} onChange={(motorPower) => update({ motorPower })} />}
              </>}
              {simpleFabricJob && <>
                <NumberField label="Ajuste de frente (cm)" value={awning.fabricJobWidthAdjustmentCm} step={0.1} onChange={(fabricJobWidthAdjustmentCm) => update({ fabricJobWidthAdjustmentCm })} />
                <NumberField label="Margen de caída (cm)" value={awning.fabricJobDropAllowanceCm} min={0} step={0.5} onChange={(fabricJobDropAllowanceCm) => update({ fabricJobDropAllowanceCm })} />
                {hasValance && <NumberField label="Remate de bamba (cm)" value={awning.fabricJobValanceExtraCm} min={0} step={0.5} onChange={(fabricJobValanceExtraCm) => update({ fabricJobValanceExtraCm })} />}
              </>}
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

function normalizeCortinaDevice(value: string): CortinaDevice | null {
  if (value === 'MAQ. INTERIOR' || value === 'MAQ. EXTERIOR' || value === 'MOTOR') return value;
  return null;
}

function normalizeBoxDevice(value: string): BoxDevice | null {
  const clean = value.trim().toUpperCase();
  if (clean === 'MOTOR') return 'MOTOR';
  if (clean.includes('MAQ')) return 'MAQUINA';
  return null;
}

function lookupBoxMinimum(rows: RuleParameters['perlaBox']['minimumLineByProjection'], projection: number | null, device: BoxDevice) {
  const target = Number(projection);
  const row = rows.find((item) => item.projection === target)
    || rows.find((item) => item.projection >= target)
    || rows[rows.length - 1];
  return row?.values[device] ?? null;
}

function lookupXacMinimum(rows: RuleParameters['xacobeo']['minimumLineByProjection'], projection: number | null, device: CortinaDevice) {
  const target = Number(projection);
  const row = rows.find((item) => item.projection === target)
    || rows.find((item) => item.projection >= target)
    || rows[rows.length - 1];
  return row?.values[device] ?? null;
}
