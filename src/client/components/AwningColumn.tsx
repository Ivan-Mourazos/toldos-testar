import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CircleAlert, Copy, Layers3, Lock, LockOpen, Trash2 } from 'lucide-react';
import { withoutAwningPrefix } from '../diagnosticText';
import type { Awning, BoxDevice, Calculation, CortinaDevice, ElectraSupport, RuleParameters } from '../types';
import { formOptions, getFabricDiagramOptions, normalizeValanceFinish } from '../../domain/modelBehavior.js';
import { useVisibleFields } from '../hooks/useVisibleFields';
import { awningLetter, getMissingFields } from '../../domain/awningCompleteness.js';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { SelectField } from './SelectField';
import { SegmentedField } from './SegmentedField';
import { FabricCombobox } from './FabricCombobox';
import { ObservationLines } from './ObservationLines';
import { ReadModeContext } from './ReadMode';
import { READ_GROUPS, readGroupOrder } from '../readGroups';
import type { AwningStatus } from '../awningBlocks';
import { structureNotes as getStructureNotes } from '../../domain/structureNotes.js';
import { controlLabel } from './controlLabels';
import { suggestedGaliciaArmCount } from '../../domain/galiciaParameters.js';
import { suggestedPuntoRectoArmCount } from '../../domain/puntoRectoParameters.js';
import { ambarPlacementGroup } from '../../domain/ambarBoxParameters.js';
import { normalizeAgataSubmodel, resolveAgataMinimumLine, suggestedAgataArmCount } from '../../domain/agataBoxParameters.js';
import { resolveFabricJobAllowance } from '../../domain/fabricJobParameters.js';
import { monoblockLoadBarDiscount, resolveMonoblockRule, resolveMonoblockSupportCount, suggestedMonoblockArmCount } from '../../domain/monoblock350Parameters.js';
import { maxiscreemVariantGroup } from '../../domain/maxiscreemParameters.js';
import { isOfOutsideOrder } from '../../domain/orderOfCheck.js';
import { electraHasCofre, electraHasGuide, electraMotors, getElectraDiscounts } from '../../domain/electraParameters.js';
import { irisAsksBoxShape, irisBoxShapes, irisGuideFixings, irisGuideTypes } from '../../domain/irisParameters.js';
import {
  anticaVariants,
  cambioAnticaVariants,
  normalizeAnticaVariant,
  resolveAnticaRoundEntry
} from '../../domain/anticaRules.js';
import {
  calculateVerticalDropArmFabricDrop,
  dropArmModeOptions,
  isVerticalDropArmMode,
  normalizeDropArmMode
} from '../../domain/dropArmMode.js';

type Props = {
  awning: Awning;
  index: number;
  ofCalculation?: Calculation['ofs'][number]['calculation'];
  diagnostics?: Calculation['diagnostics'];
  sameFabric: boolean;
  knownOfs?: string[] | null;
  orderFabric?: string;
  parameters: RuleParameters;
  readOnly?: boolean;
  // Estado del toldo en el pedido abierto, el mismo que enseña el índice de bloques: en
  // lectura no hay cálculo propio de la tarjeta (ofCalculation) para deducirlo.
  readStatus?: AwningStatus;
  onUpdate: (id: string, patch: Partial<Awning>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  // Abre el panel «Despiece y dibujo» de este toldo (solo al editar).
  onOpenPanel?: (id: string) => void;
};

// Estilo del estado en la cabecera de la ficha de lectura: los mismos colores que al editar.
const readStatusBadge: Record<AwningStatus['kind'], string> = { ok: 'badge-ok', missing: 'badge-warn', error: 'badge-danger', warn: 'badge-warn' };

const electraCofreSupports: ElectraSupport[] = ['SOPORTE MAXISCREEM BOX'];
const electraOpenSupports: ElectraSupport[] = ['SOPORTE ELIT VERTICAL', 'SOPORTES ALMAGRO', 'UNIVERSAL 3 AGUJEROS', 'SOPORTE MAXISCREEN'];

export function getElectraSupportOptions(submodel: string): ElectraSupport[] {
  return electraHasCofre(submodel) ? electraCofreSupports : electraOpenSupports;
}

// La excepción técnica en la ficha de lectura: una línea al final con un botón para ver
// lo que se ha cambiado, y así los datos del toldo se leen sin ese bloque en medio
// (Iván, 25/09/2026). Al editar sigue a la vista, como siempre.
function ExceptionBlock({ readOnly, children }: { readOnly: boolean; children: React.ReactNode }) {
  if (!readOnly) return <div className="awning-overrides">{children}</div>;
  return (
    <details className="read-exception">
      <summary>Excepción técnica activa para este toldo.<span className="read-exception-toggle">Ver cambios</span></summary>
      <div className="read-exception-list">{children}</div>
    </details>
  );
}

export function AwningColumn({ awning, index, ofCalculation, diagnostics = [], parameters, sameFabric, knownOfs = null, orderFabric = '', readOnly = false, readStatus, onUpdate, onDuplicate, onRemove, onOpenPanel }: Props) {
  const fields = useVisibleFields(awning);
  const fabricOnly = awning.workType === 'FABRIC_ONLY';
  const standaloneValance = awning.model === 'BAMBALINA';
  const simpleFabricJob = ['CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA'].includes(awning.model);
  const fabricDiagramOptions = getFabricDiagramOptions(awning.model);
  const [showGaliciaPrompt, setShowGaliciaPrompt] = useState(false);
  const update = (patch: Partial<Awning>) => onUpdate(awning.id, patch);
  const supportsValance = fields.dimensions.includes('valanceHeight');
  const cortinaDevice = normalizeCortinaDevice(awning.device);
  const isBox = awning.model === 'PERLA BOX' || awning.model === 'CORAL BOX' || awning.model === 'CUARZO BOX';
  const isXacobeo = awning.model === 'XACOBEO';
  const isPuntoRecto = awning.model === 'PUNTO RECTO';
  const isMonoblock350 = awning.model === 'MONOBLOCK 350';
  const isMaxiscreem = awning.model === 'MAXISCREEM';
  const isElectra = awning.model === 'ELECTRA';
  const isAmbarBox = awning.model === 'AMBAR BOX';
  const isAgataBox = awning.model === 'AGATA BOX';
  const isHera = awning.model === 'HERA';
  const isSelena = awning.model === 'SELENA';
  const isAntica = awning.model === 'ANTICA' || awning.model === 'CAMBIO ANTICA';
  const isFullAntica = awning.model === 'ANTICA';
  const normalizedAnticaVariant = normalizeAnticaVariant(awning.anticaVariant);
  const roundAnticaEntry = resolveAnticaRoundEntry(normalizedAnticaVariant);
  // Cambio Antica: el pedido trae la medida de la tela vieja tal cual (Iván, 25/09/2026).
  const isCambioAntica = awning.model === 'CAMBIO ANTICA';
  const isFullAnticaRound = isFullAntica && Boolean(roundAnticaEntry);
  const widthLabel = isCambioAntica ? 'Frente de tela' : 'Frente';
  const projectionLabel = isSelena || isElectra ? 'Caída' : isCambioAntica
    ? 'Caída de tela'
    : isFullAnticaRound ? 'Salida brazo' : 'Salida';
  const boxDevice = normalizeBoxDevice(awning.device);
  const curtainLikeParameters = isSelena ? parameters.selena : parameters.cortina;
  const maxisGroup = maxiscreemVariantGroup(awning.submodel);
  const maxisDiscounts = parameters.maxiscreem.discounts[maxisGroup][boxDevice || 'MAQUINA'];
  const electraDevice = normalizeCortinaDevice(awning.device);
  const electraDiscounts = getElectraDiscounts(parameters.electra, awning.submodel, awning.electraSupport, electraDevice || 'MAQ. INTERIOR');
  const electraWithCofre = electraHasCofre(awning.submodel);
  const electraWithGuide = electraHasGuide(awning.submodel);
  const electraSupportOptions = getElectraSupportOptions(awning.submodel);
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
  const hasSeparateValance = hasValance && Boolean(awning.valanceFabric.trim());
  const isDropArmModel = isAmbarBox || isPuntoRecto;
  const dropArmMode = normalizeDropArmMode(awning.dropArmMode);
  const verticalDrop = isVerticalDropArmMode(dropArmMode);
  const defaultVerticalAllowance = isAmbarBox
    ? parameters.ambarBox.verticalFabricDropAllowanceCm
    : parameters.puntoRecto.verticalFabricDropAllowanceCm;
  const verticalDropAllowance = awning.reglasModificadas && awning.dropArmVerticalAllowanceCm != null
    ? Math.max(0, Number(awning.dropArmVerticalAllowanceCm) || 0)
    : defaultVerticalAllowance;
  const verticalFabricDrop = calculateVerticalDropArmFabricDrop({
    projection: awning.projection,
    allowanceCm: verticalDropAllowance,
    valanceHeight: awning.valanceHeight ?? 0,
    separateValance: hasSeparateValance
  });
  const valanceFinish = normalizeValanceFinish(awning, awning.remate);
  const pointRequiredArms = suggestedPuntoRectoArmCount(awning.width, parameters.puntoRecto);
  const monoblockRequiredArms = suggestedMonoblockArmCount(awning.width, awning.projection, parameters.monoblock350);
  // Misma regla que el cálculo y la generación de archivos (awningCompleteness.js).
  const missingFields = getMissingFields(awning, { fabric: orderFabric, sameFabric });
  const missingSet = new Set(missingFields.map((item) => item.field));
  const isMissing = (field: string) => missingSet.has(field);
  const status = missingFields.length
    ? `FALTA · ${missingFields.map((item) => item.label).join(' · ')}`
    : ofCalculation ? (ofCalculation.valid ? 'VÁLIDO' : 'REVISAR') : 'SIN CALCULAR';
  // La variante decide el resto de la tarjeta: va justo después de las medidas en todos los
  // modelos (en Iris salía en mitad de la tarjeta). A lo ancho: las variantes son largas
  // ("SIN COFRE / CON GUÍA", "HERA 56 máquina") y en una columna se cortaban.
  const variantField = fields.submodel ? (
    <div className="awning-wide-field">
      <SelectField label="Variante" missing={isMissing('submodel')} value={awning.submodel} options={fields.submodelOptions} placeholder="Elegir variante…"
        onChange={isHera ? (submodel) => update({ submodel, height: submodel === 'HERA 56 MOTOR' ? null : awning.height }) : updateSubmodel} />
    </div>
  ) : null;
  const statusClass = missingFields.length ? 'badge-warn' : status === 'VÁLIDO' ? 'badge-ok' : status === 'REVISAR' ? 'badge-danger' : '';
  // Si el toldo trae una salida que no está en la lista establecida (p. ej. un
  // borrador migrado con salida libre), mostramos el número real en vez de un
  // select en blanco que ocultaría el valor que el cálculo sí está usando.
  const projectionInList = awning.projection === null || (fields.establishedProjections || []).includes(awning.projection);
  const useEstablishedProjection = Boolean(fields.establishedProjections) && !awning.reglasModificadas && projectionInList;
  // El Arzúa es de dos brazos; con tres (soportes Galicia) es el modelo GALICIA.
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
    update({ model: 'GALICIA', armCount: 3, supportSystem: '' });
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
    const remate = normalizeValanceFinish({ model: awning.model, valanceHeight }, awning.remate);
    update({
      hasValance: nextHasValance,
      valanceHeight,
      valanceCurve: nextHasValance ? awning.valanceCurve : '',
      valanceFabric: nextHasValance ? awning.valanceFabric : '',
      remate,
      remateColor: remate === 'OTRO' ? awning.remateColor : ''
    });
  }

  function updateProjection(projection: number | null) {
    if (isMonoblock350 && projection !== null && Number(awning.width) > 0) {
      update({ projection, armCount: suggestedMonoblockArmCount(awning.width, projection, parameters.monoblock350) });
      return;
    }
    update({ projection });
  }

  function updateSubmodel(submodel: string) {
    const patch: Partial<Awning> = { submodel };
    if (isAgataBox && submodel === 'COFRE' && awning.device === 'MAQUINA') patch.device = '';
    if (isElectra) {
      const compatibleSupports = getElectraSupportOptions(submodel);
      if (!compatibleSupports.includes(awning.electraSupport as ElectraSupport)) patch.electraSupport = '';
    }
    update(patch);
  }

  function updateDevice(device: string) {
    update({
      device,
      ...(isElectra
        ? { motorPower: device === 'MOTOR' && electraMotors.some(({ value }) => value === awning.motorPower) ? awning.motorPower : '' }
        : {})
    });
  }

  return (
    <fieldset
      className={`awning-column panel hoja-3d${fabricOnly ? ' fabric-only-column' : ''}${readOnly ? ' is-readonly' : ''}`}
      disabled={readOnly}
      aria-label={`${fabricOnly ? 'Trabajo de tela' : 'Toldo'} ${String.fromCharCode(65 + index)} · ${controlLabel(awning.model)}`}
      aria-readonly={readOnly || undefined}
      data-awning-letter={awningLetter(index)}
    >
      {/* Cabecera en una línea: «TOLDO A · Arzúa Pro» y el estado. El nombre antiguo ya sale
          en Parámetros y en «Añadir toldo»; aquí solo ocupaba sitio (Iván, 25/09/2026). */}
      <header className="awning-column-header">
        <span className="awning-column-heading">
          <span className="awning-column-tag">{`${fabricOnly ? 'TELA' : 'TOLDO'} ${awningLetter(index)}`}</span>
          <strong className="awning-model-title">{controlLabel(awning.model)}</strong>
          {/* El estado también arriba: con varias tarjetas había que bajar para verlo. Todo
              en mayúsculas, como al editar: «VÁLIDO», «FALTA 1», «1 ERROR», «2 AVISOS». */}
          {readOnly
            ? readStatus && <span className={`awning-header-status ${readStatusBadge[readStatus.kind]}`}>{readStatus.kind === 'ok' ? 'VÁLIDO' : readStatus.label.toLocaleUpperCase('es-ES')}</span>
            : <span className={`awning-header-status ${statusClass}`}>{missingFields.length ? `FALTA ${missingFields.length}` : status}</span>}
        </span>
        {!readOnly && <div className="card-actions">
          {onOpenPanel && <button type="button" className="ghost-button awning-panel-open" onClick={() => onOpenPanel(awning.id)}><Layers3 aria-hidden="true" />Despiece y dibujo</button>}
          {!isHera && <button
            type="button"
            className={awning.reglasModificadas ? 'icon-button active' : 'icon-button'}
            aria-pressed={awning.reglasModificadas}
            aria-label={awning.reglasModificadas ? 'Reglas modificadas: volver a reglas estándar' : 'Modificar reglas del modelo'}
            onClick={() => update({
              reglasModificadas: !awning.reglasModificadas,
              ...(awning.model === 'CAMBIO CORTINA' && !awning.reglasModificadas && awning.curtainFabricDeductionCm === null
                ? { curtainFabricDeductionCm: parameters.cambioCortina.bottomDeductionCm }
                : {}),
              ...((awning.model === 'CORTINA' || isSelena) && !awning.reglasModificadas && cortinaDevice
                ? {
                    curtainFabricDeductionCm: awning.curtainFabricDeductionCm
                      ?? (awning.curtainSkipBottomDeduction ? 0 : curtainLikeParameters.bottomDeductionCm ?? 0),
                    ...(awning.model === 'CORTINA' && cortinaDevice === 'MOTOR'
                      ? { motorPower: ['35/17', '55/17'].includes(awning.motorPower) ? awning.motorPower : '15/17' }
                      : {}),
                    curtainFabricWidthDiscountCm: awning.curtainFabricWidthDiscountCm ?? curtainLikeParameters.fabricWidthDiscounts[cortinaDevice],
                    curtainRollTubeDiscountCm: awning.curtainRollTubeDiscountCm ?? curtainLikeParameters.rollTubeDiscounts[cortinaDevice],
                    curtainLoadProfileDiscountCm: awning.curtainLoadProfileDiscountCm ?? curtainLikeParameters.loadProfileDiscounts[cortinaDevice]
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
                    pointFabricDropAllowanceCm: awning.pointFabricDropAllowanceCm ?? parameters.puntoRecto.fabricDropAllowanceCm,
                    dropArmVerticalAllowanceCm: awning.dropArmVerticalAllowanceCm ?? parameters.puntoRecto.verticalFabricDropAllowanceCm
                  }
                : {}),
              ...(isMonoblock350 && !awning.reglasModificadas
                ? {
                    monoblockMinimumLineCm: awning.monoblockMinimumLineCm ?? monoblockRule?.minimum ?? null,
                    monoblockMaximumLineCm: awning.monoblockMaximumLineCm ?? monoblockRule?.maximum ?? null,
                    monoblockSupportCount: awning.monoblockSupportCount ?? ofCalculation?.supportCount ?? monoblockSupportCount,
                    monoblockFabricWidthDiscountCm: awning.monoblockFabricWidthDiscountCm ?? monoblockDiscounts.fabric,
                    monoblockRollDiscountCm: awning.monoblockRollDiscountCm ?? monoblockDiscounts.roll,
                    monoblockLoadBarDiscountCm: awning.monoblockLoadBarDiscountCm ?? monoblockLoadBarDiscount(monoblockDiscounts.loadBar, awning.tubeLoad),
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
              ...(isElectra && !awning.reglasModificadas && electraDevice && awning.submodel && awning.electraSupport
                ? {
                    electraFabricWidthDiscountCm: awning.electraFabricWidthDiscountCm ?? electraDiscounts.fabric,
                    electraRollDiscountCm: awning.electraRollDiscountCm ?? electraDiscounts.roll,
                    electraLoadBarDiscountCm: awning.electraLoadBarDiscountCm ?? electraDiscounts.loadBar,
                    electraBoxProfileDiscountCm: awning.electraBoxProfileDiscountCm ?? (electraWithCofre ? electraDiscounts.boxProfile ?? 0 : 0),
                    electraGuideDiscountCm: awning.electraGuideDiscountCm ?? (electraWithGuide ? (electraWithCofre ? null : electraDiscounts.guide) : 0),
                    electraFabricDropAllowanceCm: awning.electraFabricDropAllowanceCm ?? parameters.electra.fabricDropAllowanceCm[electraDevice]
                  }
                : {}),
              ...(isAmbarBox && !awning.reglasModificadas && boxDevice
                ? {
                    ambarFabricWidthDiscountCm: awning.ambarFabricWidthDiscountCm ?? parameters.ambarBox.fabricWidthDiscounts[ambarGroup][boxDevice],
                    ambarRollDiscountCm: awning.ambarRollDiscountCm ?? parameters.ambarBox.rollTubeDiscounts[ambarGroup][boxDevice],
                    ambarProfileDiscountCm: awning.ambarProfileDiscountCm ?? parameters.ambarBox.profileDiscounts[ambarGroup][boxDevice],
                    ambarFabricDropMultiplier: awning.ambarFabricDropMultiplier ?? parameters.ambarBox.fabricDropMultiplier,
                    ambarFabricDropAllowanceCm: awning.ambarFabricDropAllowanceCm ?? parameters.ambarBox.fabricDropAllowanceCm,
                    dropArmVerticalAllowanceCm: awning.dropArmVerticalAllowanceCm ?? parameters.ambarBox.verticalFabricDropAllowanceCm
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
                    fabricJobDropAllowanceCm: awning.fabricJobDropAllowanceCm
                      ?? resolveFabricJobAllowance(awning.model, hasValance, parameters.fabricJobs),
                    fabricJobValanceExtraCm: awning.fabricJobValanceExtraCm ?? parameters.fabricJobs.valanceExtraCm
                  }
                : {})
            })}
          >
            {awning.reglasModificadas ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
          </button>}
          <button type="button" className="icon-button" onClick={() => onDuplicate(awning.id)} aria-label="Duplicar"><Copy aria-hidden="true" /></button>
          <button type="button" className="icon-button" onClick={() => onRemove(awning.id)} aria-label="Eliminar"><Trash2 aria-hidden="true" /></button>
        </div>}
      </header>

      <ReadModeContext.Provider value={readOnly}>
      {awning.model && (
        <ReadSheetBody reading={readOnly}>
          {/* En su propia línea: dentro del campo alargaba la fila y bajaba Frente y Salida. */}
          {!readOnly && isOfOutsideOrder(awning.of, knownOfs) && <p className="field-hint-warn awning-row-warn" role="status">La OF {awning.of} no pertenece al pedido en RPS.</p>}
          <TextField label="OF" missing={isMissing('of')} value={awning.of} onChange={(of) => update({ of: of.trim() })} />
          {fields.dimensions.includes('width') && <NumberField label={widthLabel} missing={isMissing('width')} value={awning.width} min={0} onChange={updateWidth} />}
          {fields.dimensions.includes('projection') && (useEstablishedProjection ? (
            <SelectField
              label={projectionLabel} missing={isMissing('projection')}
              value={awning.projection === null ? '' : String(awning.projection)}
              options={(fields.establishedProjections || []).map(String)}
              placeholder="Elegir…"
              onChange={(v) => updateProjection(v === '' ? null : Number(v))}
            />
          ) : (
            <NumberField label={projectionLabel} missing={isMissing('projection')} value={awning.projection} min={0} onChange={updateProjection} />
          ))}
          {!supportsValance && variantField}
          {fields.iris && (
            <div className="awning-form-section">
              <span className="awning-form-section-title">Configuración IRIS</span>
              <SegmentedField
                label="Hueco escuadrado"
                value={awning.irisAssumeSquare ? 'SÍ' : 'NO'}
                options={['SÍ', 'NO']}
                onChange={(value) => update({ irisAssumeSquare: value === 'SÍ' })}
              />
              <NumberField label="Frente superior" missing={isMissing('irisFrontTop')} value={awning.irisFrontTop} min={0} onChange={(irisFrontTop) => update({ irisFrontTop })} />
              <NumberField label="Salida izquierda" missing={isMissing('irisExitLeft')} value={awning.irisExitLeft} min={0} onChange={(irisExitLeft) => update({ irisExitLeft })} />
              {!awning.irisAssumeSquare && (
                <>
                  <NumberField label="Frente inferior" value={awning.irisFrontBottom} min={0} onChange={(irisFrontBottom) => update({ irisFrontBottom })} />
                  <NumberField label="Salida derecha" value={awning.irisExitRight} min={0} onChange={(irisExitRight) => update({ irisExitRight })} />
                  <NumberField label="Diagonal 1 (a salida izq.)" value={awning.irisDiagonal1} min={0} onChange={(irisDiagonal1) => update({ irisDiagonal1 })} />
                  <NumberField label="Diagonal 2 (a salida der.)" value={awning.irisDiagonal2} min={0} onChange={(irisDiagonal2) => update({ irisDiagonal2 })} />
                </>
              )}
              <SelectField
                label="Tipo de guía"
                value={awning.irisGuideType}
                options={irisGuideTypes}
                onChange={(value) => update({ irisGuideType: value as Awning['irisGuideType'] })}
              />
              <SelectField
                label="Fijación de la guía"
                value={awning.irisGuideFixing}
                options={irisGuideFixings}
                onChange={(value) => update({ irisGuideFixing: value as Awning['irisGuideFixing'] })}
              />
              {/* Solo con cofre y en el 110 y el 130: el 150 siempre lo lleva redondo. */}
              {irisAsksBoxShape(awning) && (
                <SegmentedField
                  label="Forma del cofre" missing={isMissing('irisBoxShape')}
                  value={awning.irisBoxShape}
                  options={irisBoxShapes}
                  onChange={(value) => update({ irisBoxShape: value as Awning['irisBoxShape'] })}
                />
              )}
              <SegmentedField
                label="Secur Wind Block"
                value={awning.irisWindBlock ? 'SÍ' : 'NO'}
                options={['SÍ', 'NO']}
                onChange={(value) => update({ irisWindBlock: value === 'SÍ' })}
              />
              <SegmentedField
                label="Ventana de cristal" missing={isMissing('curtainHasWindow')}
                value={awning.curtainHasWindow === null ? '' : awning.curtainHasWindow ? 'CON VENTANA' : 'SIN VENTANA'}
                options={['SIN VENTANA', 'CON VENTANA']}
                onChange={(value) => update({ curtainHasWindow: value === 'CON VENTANA' })}
              />
            </div>
          )}
          {isDropArmModel && (
            <div className={`awning-form-section drop-arm-mode${verticalDrop ? ' is-vertical' : ''}`}>
              <span className="awning-form-section-title">Recorrido de los brazos PRT</span>
              <SegmentedField
                label="Posición de trabajo"
                value={dropArmMode}
                options={[...dropArmModeOptions]}
                onChange={(dropArmMode) => update({ dropArmMode: dropArmMode as Awning['dropArmMode'] })}
              />
              {verticalDrop && !readOnly && (
                <div className="drop-arm-mode-summary" role="note">
                  <strong>Corte vertical previsto: {formatDropArmMeasure(verticalFabricDrop)} cm</strong>
                  <span>
                    2 × salida + {formatDropArmMeasure(verticalDropAllowance)} cm
                    {hasSeparateValance ? '; la bambalina se corta aparte.' : Number(awning.valanceHeight) > 0 ? ' + bambalina incluida.' : '.'}
                    {isAmbarBox ? ' Verificar la capacidad de enrolle según frente, tubo y tejido.' : ' Confirmar montaje con un máximo de trabajo de 170°.'}
                  </span>
                </div>
              )}
            </div>
          )}
          {isHera && (
            <SelectField label={awning.submodel === 'HERA 56 MOTOR' ? 'Color mecanismos' : 'Color cadena'} missing={isMissing('heraChainColor')} value={awning.heraChainColor} options={['BLANCO', 'NEGRO']} placeholder="Elegir…" onChange={(heraChainColor) => update({ heraChainColor: heraChainColor as Awning['heraChainColor'] })} />
          )}
          {isHera && awning.submodel !== 'HERA 56 MOTOR' && (
            <NumberField label="Altura instalación" missing={isMissing('height')} value={awning.height} min={0} step={0.1} onChange={(height) => update({ height })} />
          )}
          {isHera && (
            <div className="awning-wide-field">
              <SegmentedField label="Empate indicado por cliente" missing={isMissing('heraJoin')} value={awning.heraJoin} options={['NINGUNO', 'VERTICAL', 'HORIZONTAL']} onChange={(heraJoin) => update({ heraJoin: heraJoin as Awning['heraJoin'] })} />
            </div>
          )}

          {isSelena && !readOnly && (
            <p className="awning-pending">
              Sistema vertical con dos brazos Stor. Confirma siempre el lado de la máquina antes de generar el planteamiento.
            </p>
          )}
          {isHera && (
            <div className="awning-installation-row awning-wide-field">
              <SelectField label="Arriba" missing={isMissing('heraTopFinish')} value={awning.heraTopFinish} options={['VARILLA PLANA']} placeholder="Elegir remate…" onChange={(heraTopFinish) => update({ heraTopFinish })} />
              <SelectField label="Abajo" missing={isMissing('heraBottomFinish')} value={awning.heraBottomFinish} options={['VARILLA BLANCA', 'PLETINA', 'ENTRADA DE PLETINA', 'E.T. PLATANERO']} placeholder="Elegir remate…" onChange={(heraBottomFinish) => update({ heraBottomFinish })} />
            </div>
          )}
          {isHera && (
            <div className="awning-wide-field">
              <SegmentedField label="Cara hacia el interior (ventana)" missing={isMissing('heraInteriorFace')} value={awning.heraInteriorFace} options={['DERECHO', 'REVÉS']} onChange={(heraInteriorFace) => update({ heraInteriorFace: heraInteriorFace as Awning['heraInteriorFace'] })} />
            </div>
          )}
          {supportsValance && (
            <NumberField label={awning.model === 'BAMBALINA' ? 'Alto terminado (cm)' : 'Bamba (cm)'} missing={isMissing('valanceHeight')} value={awning.valanceHeight} min={0} onChange={updateValanceHeight} />
          )}
          {hasValance && (
            <div className="awning-valance-options awning-wide-field">
              <SelectField label="Curva bamba" missing={isMissing('valanceCurve')} value={awning.valanceCurve} options={formOptions.curvasBamba} placeholder="Elegir…" onChange={(valanceCurve) => update({ valanceCurve })} />
              {!standaloneValance && <FabricCombobox label="Tela bamba" value={awning.valanceFabric} placeholder="Igual que la tela" readEmptyAs="Igual que la tela" disabled={readOnly} onChange={(valanceFabric) => update({ valanceFabric })} />}
              <SegmentedField label="Remate" missing={isMissing('remate')} value={valanceFinish} options={['COMO TELA', 'OTRO']} onChange={(remate) => update({ remate, remateColor: remate === 'COMO TELA' ? '' : awning.remateColor })} />
              {valanceFinish === 'OTRO' && <TextField label="Color remate" missing={isMissing('remateColor')} value={awning.remateColor} onChange={(remateColor) => update({ remateColor })} />}
            </div>
          )}
          {supportsValance && variantField}
          {fabricDiagramOptions.length > 1 && (
            <div className="awning-wide-field">
              <SelectField
                label="Dibujo de confección"
                value={awning.fabricDiagramOverride}
                options={fabricDiagramOptions.filter(({ value }) => value).map(({ value }) => value)}
                placeholder="Automático"
                allowEmpty
                emptyLabel="Automático"
                onChange={(fabricDiagramOverride) => update({ fabricDiagramOverride: fabricDiagramOverride as Awning['fabricDiagramOverride'] })}
              />
            </div>
          )}
          {awning.fabricDiagramOverride === 'SUPLEMENTO' && (
            <div className="awning-form-section awning-wide-field">
              <SelectField label="Sujeción del suplemento" value={awning.supplementFastening} options={['BROCHES', 'VELCRO', 'OTRO']} placeholder="Sin indicar" allowEmpty emptyLabel="Sin indicar" onChange={(supplementFastening) => update({ supplementFastening, supplementFasteningOther: supplementFastening === 'OTRO' ? awning.supplementFasteningOther : '', supplementFasteningPitchCm: supplementFastening === 'BROCHES' ? awning.supplementFasteningPitchCm : null })} />
              {awning.supplementFastening === 'OTRO' && <TextField label="Indicar sujeción" value={awning.supplementFasteningOther} onChange={(supplementFasteningOther) => update({ supplementFasteningOther })} />}
              {awning.supplementFastening === 'BROCHES' && <NumberField label="Distancia entre broches (cm)" value={awning.supplementFasteningPitchCm} min={0} step={0.5} onChange={(supplementFasteningPitchCm) => update({ supplementFasteningPitchCm })} />}
              <NumberField label="Solape sobre la onda (cm)" value={awning.supplementWaveOverlapCm} min={0} step={0.5} onChange={(supplementWaveOverlapCm) => update({ supplementWaveOverlapCm })} />
              <SelectField label="Remate inferior" value={awning.supplementBottomFinish} options={['OLLAOS', 'CADENILLA', 'OTRO']} placeholder="Sin indicar" allowEmpty emptyLabel="Sin indicar" onChange={(supplementBottomFinish) => update({ supplementBottomFinish, supplementBottomFinishOther: supplementBottomFinish === 'OTRO' ? awning.supplementBottomFinishOther : '' })} />
              {awning.supplementBottomFinish === 'OTRO' && <TextField label="Indicar remate" value={awning.supplementBottomFinishOther} onChange={(supplementBottomFinishOther) => update({ supplementBottomFinishOther })} />}
              <NumberField label="Bastilla de unión (cm)" value={awning.supplementJoinHemCm} min={0} step={0.5} onChange={(supplementJoinHemCm) => update({ supplementJoinHemCm })} />
              <NumberField label="Bastilla lateral (cm)" value={awning.supplementSideHemCm} min={0} step={0.5} onChange={(supplementSideHemCm) => update({ supplementSideHemCm })} />
              <NumberField label="Bastilla inferior (cm)" value={awning.supplementBottomHemCm} min={0} step={0.5} onChange={(supplementBottomHemCm) => update({ supplementBottomHemCm })} />
            </div>
          )}
          {(fields.arzua || fields.galicia) && (
            <div className="awning-form-section awning-core-config">
              {fields.arzua && <>
                <SegmentedField label="Configuración de brazos" value={awning.armConfiguration === 'CROSSED' ? 'CRUZADOS' : 'NORMALES'} options={['NORMALES', 'CRUZADOS']} onChange={(value) => {
                  setShowGaliciaPrompt(false);
                  update({ armConfiguration: value === 'CRUZADOS' ? 'CROSSED' : 'STANDARD', ...(value === 'CRUZADOS' ? { armCount: 2, supportSystem: 'ARZUA', tubeLoad: 'TUBO DE CARGA EVO 80' } : {}) });
                }} />
                {awning.armConfiguration === 'CROSSED' && !readOnly && <p>Dos brazos · kit izquierdo · inclinación máxima 30°. Kit inferior para EVO 80.</p>}
                {awning.armConfiguration === 'CROSSED' && <SelectField label="Terminales · confirmar con taller" value={awning.crossedAdditionalTerminals === true ? 'JUEGO ADICIONAL' : awning.crossedAdditionalTerminals === false ? 'SOLO LOS DEL KIT' : ''} options={['SOLO LOS DEL KIT', 'JUEGO ADICIONAL']} placeholder="Pendiente de confirmar…" onChange={(value) => update({ crossedAdditionalTerminals: value === 'JUEGO ADICIONAL' ? true : value === 'SOLO LOS DEL KIT' ? false : null })} />}
              </>}
              <SegmentedField
                label="Nº de brazos"
                value={fields.arzua ? '2' : awning.armCount == null ? '' : String(awning.armCount)}
                options={(fields.galicia ? fields.armOptions : awning.armConfiguration === 'CROSSED' ? [2] : [2, 3]).map(String)}
                onChange={fields.galicia ? (value) => update({ armCount: Number(value) }) : chooseArms}
              />
              {fields.tubeLoad && (
                <SegmentedField label="Tubo de carga" missing={isMissing('tubeLoad')} value={awning.tubeLoad} options={fields.tubeOptions} onChange={(tubeLoad) => update({ tubeLoad })} />
              )}
              {fields.supportOptions.length > 0 && (
                <SegmentedField label="Soporte" value={awning.supportSystem} options={fields.supportOptions} onChange={(supportSystem) => update({ supportSystem })} />
              )}
              {fields.arzua && showGaliciaPrompt && !readOnly && (
                <div className="model-switch-prompt" role="alert">
                  <div><strong>3 brazos es el modelo GALICIA</strong><span>Se conservarán la OF y las medidas.</span></div>
                  <button type="button" onClick={changeToGalicia}>Cambiar modelo<ArrowRight aria-hidden="true" /></button>
                </div>
              )}
            </div>
          )}
          {fields.tubeLoad && !fields.arzua && !fields.galicia && (
            <div className="awning-wide-field"><SegmentedField label="Tubo de carga" missing={isMissing('tubeLoad')} value={awning.tubeLoad} options={fields.tubeOptions} onChange={(tubeLoad) => update({ tubeLoad })} /></div>
          )}
          {isAntica && (
            <div className="awning-wide-field">
              <SelectField
                label="Configuración Antica" missing={isMissing('anticaVariant')}
                value={awning.anticaVariant}
                options={[...(isFullAntica ? anticaVariants : cambioAnticaVariants)]}
                placeholder="Elegir configuración…"
                onChange={(anticaVariant) => update({
                  anticaVariant: anticaVariant as Awning['anticaVariant'],
                  ...(anticaVariant === 'TUBO 50X30 SIN BAMBA'
                    ? { hasValance: false, valanceHeight: 0, valanceCurve: '', valanceFabric: '', remate: '', remateColor: '', rotValance: '' }
                    : {}),
                  ...(anticaVariant !== 'SOPORTE FIJO 3 AGUJEROS' && !resolveAnticaRoundEntry(anticaVariant)
                    ? { anticaSupportHeight: null }
                    : {})
                })}
              />
              {isCambioAntica && (
                <NumberField label="Sumar a la caída (cm)" value={awning.cambioAnticaExtraCm} step={0.5} onChange={(cambioAnticaExtraCm) => update({ cambioAnticaExtraCm })} />
              )}
              {isFullAntica && (awning.anticaVariant === 'SOPORTE FIJO 3 AGUJEROS' || isFullAnticaRound) && (
                <NumberField label="Altura soporte-brazo (cm)" missing={isMissing('anticaSupportHeight')} value={awning.anticaSupportHeight} min={0} step={0.1} onChange={(anticaSupportHeight) => update({ anticaSupportHeight })} />
              )}
            </div>
          )}
          {(fields.requiresStructureColor || fields.requiresRotFabric || hasValance) && <div className="awning-finish-row awning-wide-field">
            {fields.requiresStructureColor && <SelectField label="Lacado" missing={isMissing('structureColor')} value={awning.structureColor} options={formOptions.lacados} placeholder="Elegir…" allowEmpty emptyLabel="Sin indicar" onChange={(structureColor) => update({ structureColor })} />}
            {fields.requiresRotFabric && !standaloneValance && <SegmentedField label="Rotulación tela" missing={isMissing('rotFabric')} value={awning.rotFabric} options={formOptions.rotulacion} onChange={(rotFabric) => update({ rotFabric })} />}
            {hasValance && <SegmentedField label="Rotulación bamba" missing={isMissing('rotValance')} value={awning.rotValance} options={formOptions.rotulacion} onChange={(rotValance) => update({ rotValance })} />}
          </div>}
          {(fields.curtain || fields.curtainWindow || isElectra) && (
            <div className="awning-form-section curtain-config">
              <span className="awning-form-section-title">{isElectra ? 'Configuración textil Electra / Elit Vertical' : 'Configuración de cortina'}</span>
              {(awning.model === 'CORTINA' || isSelena) && <div className="curtain-option">
                <SelectField
                  label="Soporte"
                  value={awning.curtainSupport || 'UNIVERSAL 3 AGUJEROS'}
                  options={['UNIVERSAL 3 AGUJEROS', 'MAXISCREEM']}
                  onChange={(curtainSupport) => update({ curtainSupport: curtainSupport as Awning['curtainSupport'] })}
                />
              </div>}
              {isElectra && <div className="curtain-option">
                <SelectField
                  label="Tipo de soporte" missing={isMissing('electraSupport')}
                  value={awning.electraSupport}
                  options={electraSupportOptions}
                  placeholder="Obligatorio · elegir soporte…"
                  onChange={(electraSupport) => update({ electraSupport: electraSupport as Awning['electraSupport'] })}
                />
              </div>}
              {(fields.curtain || fields.curtainWindow) && <div className="curtain-option">
                <SegmentedField label="Ventana" missing={isMissing('curtainHasWindow')} value={awning.curtainHasWindow === null ? '' : awning.curtainHasWindow ? 'CON VENTANA' : 'SIN VENTANA'} options={['SIN VENTANA', 'CON VENTANA']} onChange={(value) => update({ curtainHasWindow: value === 'CON VENTANA' })} />
              </div>}
              {fields.curtain && awning.curtainHasWindow !== null && <div className="curtain-option">
                <SegmentedField label="Confección" missing={isMissing('curtainFinish')} value={awning.curtainFinish} options={['NORMAL', 'VELCRO', 'TUBO']} onChange={(curtainFinish) => update({ curtainFinish: curtainFinish as Awning['curtainFinish'] })} />
              </div>}
              {awning.model === 'CORTINA' && !awning.reglasModificadas && <div className="curtain-option">
                <SegmentedField label={`Restar ${parameters.cortina.bottomDeductionCm} cm abajo`} value={awning.curtainSkipBottomDeduction ? 'NO' : 'SI'} options={['SI', 'NO']} onChange={(value) => update({ curtainSkipBottomDeduction: value === 'NO' })} />
              </div>}
              {awning.model === 'CAMBIO CORTINA' && <div className="curtain-option">
                <SegmentedField label="Arriba" value={awning.curtainTopFinish || 'VARILLA'} options={['VARILLA', 'REMACHADO']} onChange={(curtainTopFinish) => update({ curtainTopFinish: curtainTopFinish as Awning['curtainTopFinish'] })} />
              </div>}
              {(fields.curtain || fields.curtainWindow) && awning.curtainHasWindow && <div className="curtain-window-measures" role="group" aria-label="Medidas de ventana">
                <NumberField label="Salida ventana" missing={isMissing('curtainWindowExit')} value={awning.curtainWindowExit} min={0} onChange={(curtainWindowExit) => update({ curtainWindowExit })} />
                <NumberField label="Esquina" missing={isMissing('curtainWindowCorner')} value={awning.curtainWindowCorner} min={0} onChange={(curtainWindowCorner) => update({ curtainWindowCorner })} />
                <NumberField label="Suelo-ventana" missing={isMissing('curtainWindowFloorHeight')} value={awning.curtainWindowFloorHeight} min={0} onChange={(curtainWindowFloorHeight) => update({ curtainWindowFloorHeight })} />
                <NumberField label="Altura ventana" missing={isMissing('curtainWindowHeight')} value={awning.curtainWindowHeight} min={0} onChange={(curtainWindowHeight) => update({ curtainWindowHeight })} />
              </div>}
            </div>
          )}
          {!sameFabric && <div className="awning-wide-field"><FabricCombobox label="Tela" value={awning.fabric} disabled={readOnly} onChange={(fabric) => update({ fabric })} /></div>}
          {(fields.device || fields.sensor || fields.motorLocation || fields.machineLocation || fields.crankHeight) && (
            <div className="awning-actuation-row awning-wide-field">
              {fields.device && <SelectField label="Dispositivo" missing={isMissing('device')} value={awning.device} options={fields.deviceOptions} placeholder="Elegir…" onChange={updateDevice} />}
              {isElectra && electraDevice === 'MOTOR' && <SelectField label="Motor Electra" missing={isMissing('motorPower')} value={awning.motorPower} options={electraMotors.map(({ value }) => value)} placeholder="Obligatorio · elegir motor…" onChange={(motorPower) => update({ motorPower })} />}
              {fields.sensor && <SelectField label="Sensor" value={awning.sensor} options={formOptions.sensores.map((s) => s.sensor)} placeholder="Elegir…" onChange={(sensor) => update({ sensor })} />}
              {fields.motorLocation && <SelectField label="Posición motor" missing={isMissing('machineSide')} value={awning.machineSide} options={formOptions.localizacionesMaquina} placeholder="Elegir…" onChange={(machineSide) => update({ machineSide })} />}
              {fields.machineLocation && <SelectField label="Lado máquina" missing={isMissing('machineSide')} value={awning.machineSide} options={formOptions.localizacionesMaquina} placeholder="Elegir…" onChange={(machineSide) => update({ machineSide })} />}
              {isFullAntica && fields.crankHeight && <SelectField label="Color manivela" value={awning.anticaCrankColor || 'AUTOMÁTICO'} options={['AUTOMÁTICO', 'BLANCA', 'NEGRA']} onChange={(v) => update({ anticaCrankColor: v as Awning['anticaCrankColor'] })} />}
              {fields.crankHeight && <SelectField label="Altura manivela" missing={isMissing('crankHeight')} value={awning.crankHeight === null ? '' : String(awning.crankHeight)} options={formOptions.alturasManivela.map(String)} placeholder="Elegir…" onChange={(v) => update({ crankHeight: v === '' ? null : Number(v) })} />}
            </div>
          )}
          {(fields.placement || fields.wallType) && (
            <div className="awning-installation-row awning-wide-field">
              {fields.placement && <SelectField label="Colocación" missing={isMissing('placement')} value={awning.placement} options={formOptions.colocaciones} placeholder="Elegir…" onChange={(placement) => update({ placement })} />}
              {fields.wallType && <SelectField label="Tipo de pared" value={awning.wallType} options={formOptions.tiposPared.map((p) => p.pared)} placeholder="No indicada" allowEmpty emptyLabel="No indicada" onChange={(wallType) => update({ wallType })} />}
            </div>
          )}
          {fields.arms && !fields.galicia && (
            <div className="awning-compact-choice"><SegmentedField label={isPuntoRecto ? `Nº brazos · mínimo ${pointRequiredArms}` : isMonoblock350 ? `Nº brazos · automático ${monoblockRequiredArms}` : isAgataBox ? `Nº brazos · automático ${suggestedAgataArmCount(awning.width)}` : 'Nº brazos'} value={awning.armCount == null ? '' : String(awning.armCount)} options={fields.armOptions.map(String)} onChange={(v) => update({ armCount: Number(v) })} /></div>
          )}

          {!fields.implemented && !readOnly && (
            <p className="awning-pending">Sin reglas de cálculo todavía. Se guarda pero no genera materiales.</p>
          )}

          {awning.reglasModificadas && (
            <ExceptionBlock readOnly={readOnly}>
              {!readOnly && <p className="awning-modified-chip">Excepción técnica activa para este toldo.</p>}
              {(awning.model === 'CORTINA' || awning.model === 'CAMBIO CORTINA' || isSelena) && (
                <NumberField
                  label="Descuento inferior tela (cm)"
                  value={awning.curtainFabricDeductionCm}
                  min={0}
                  step={0.5}
                  onChange={(curtainFabricDeductionCm) => update({ curtainFabricDeductionCm })}
                />
              )}
              {(awning.model === 'CORTINA' || isSelena) && <>
                <NumberField label="Descuento frente tela (cm)" value={awning.curtainFabricWidthDiscountCm} min={0} step={0.5} onChange={(curtainFabricWidthDiscountCm) => update({ curtainFabricWidthDiscountCm })} />
                <NumberField label="Descuento tubo enrollamiento (cm)" value={awning.curtainRollTubeDiscountCm} min={0} step={0.5} onChange={(curtainRollTubeDiscountCm) => update({ curtainRollTubeDiscountCm })} />
                <NumberField label="Descuento Univers 280 (cm)" value={awning.curtainLoadProfileDiscountCm} min={0} step={0.5} onChange={(curtainLoadProfileDiscountCm) => update({ curtainLoadProfileDiscountCm })} />
                {awning.model === 'CORTINA' && cortinaDevice === 'MOTOR' && <SegmentedField label="Motor" value={['35/17', '55/17'].includes(awning.motorPower) ? awning.motorPower : '15/17'} options={['15/17', '35/17', '55/17']} onChange={(motorPower) => update({ motorPower })} />}
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
                {verticalDrop ? (
                  <NumberField label="Margen bajada vertical (cm)" value={awning.dropArmVerticalAllowanceCm} min={0} step={0.5} onChange={(dropArmVerticalAllowanceCm) => update({ dropArmVerticalAllowanceCm })} />
                ) : <>
                  <NumberField label="Factor diagonal de paño" value={awning.pointFabricDropMultiplier} min={0} step={0.01} onChange={(pointFabricDropMultiplier) => update({ pointFabricDropMultiplier })} />
                  <NumberField label="Margen fijo de paño (cm)" value={awning.pointFabricDropAllowanceCm} min={0} step={0.5} onChange={(pointFabricDropAllowanceCm) => update({ pointFabricDropAllowanceCm })} />
                </>}
              </>}
              {isMonoblock350 && <>
                <NumberField label="Frente mínimo (cm)" value={awning.monoblockMinimumLineCm} min={0} step={0.1} onChange={(monoblockMinimumLineCm) => update({ monoblockMinimumLineCm })} />
                <NumberField label="Frente máximo (cm)" value={awning.monoblockMaximumLineCm} min={0} step={0.1} onChange={(monoblockMaximumLineCm) => update({ monoblockMaximumLineCm })} />
                <NumberField label="Nº de soportes" value={awning.monoblockSupportCount} min={1} step={1} onChange={(monoblockSupportCount) => update({ monoblockSupportCount })} />
                <NumberField label="Descuento frente tela (cm)" value={awning.monoblockFabricWidthDiscountCm} min={0} step={0.1} onChange={(monoblockFabricWidthDiscountCm) => update({ monoblockFabricWidthDiscountCm })} />
                <NumberField label="Descuento P801 (cm)" value={awning.monoblockRollDiscountCm} min={0} step={0.1} onChange={(monoblockRollDiscountCm) => update({ monoblockRollDiscountCm })} />
                <NumberField label="Descuento barra de carga (cm)" value={awning.monoblockLoadBarDiscountCm} min={0} step={0.1} onChange={(monoblockLoadBarDiscountCm) => update({ monoblockLoadBarDiscountCm })} />
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
              {isElectra && <>
                <NumberField label="Descuento frente tela (cm)" value={awning.electraFabricWidthDiscountCm} min={0} step={0.1} onChange={(electraFabricWidthDiscountCm) => update({ electraFabricWidthDiscountCm })} />
                <NumberField label="Descuento tubo P801 (cm)" value={awning.electraRollDiscountCm} min={0} step={0.1} onChange={(electraRollDiscountCm) => update({ electraRollDiscountCm })} />
                <NumberField label="Descuento perfil de carga (cm)" value={awning.electraLoadBarDiscountCm} min={0} step={0.1} onChange={(electraLoadBarDiscountCm) => update({ electraLoadBarDiscountCm })} />
                {electraWithCofre && <NumberField label="Descuento perfil de cofre (cm)" value={awning.electraBoxProfileDiscountCm} min={0} step={0.1} onChange={(electraBoxProfileDiscountCm) => update({ electraBoxProfileDiscountCm })} />}
                {electraWithGuide && <NumberField label="Descuento guía sobre caída (cm)" value={awning.electraGuideDiscountCm} min={0} step={0.1} onChange={(electraGuideDiscountCm) => update({ electraGuideDiscountCm })} />}
                <NumberField label="Margen caída tela (cm)" value={awning.electraFabricDropAllowanceCm} min={0} step={0.5} onChange={(electraFabricDropAllowanceCm) => update({ electraFabricDropAllowanceCm })} />
              </>}
              {isAmbarBox && <>
                <NumberField label="Descuento frente tela (cm)" value={awning.ambarFabricWidthDiscountCm} min={0} step={0.1} onChange={(ambarFabricWidthDiscountCm) => update({ ambarFabricWidthDiscountCm })} />
                <NumberField label="Descuento tubo enrollamiento (cm)" value={awning.ambarRollDiscountCm} min={0} step={0.1} onChange={(ambarRollDiscountCm) => update({ ambarRollDiscountCm })} />
                <NumberField label="Descuento kit perfiles (cm)" value={awning.ambarProfileDiscountCm} min={0} step={0.1} onChange={(ambarProfileDiscountCm) => update({ ambarProfileDiscountCm })} />
                {verticalDrop ? (
                  <NumberField label="Margen bajada vertical (cm)" value={awning.dropArmVerticalAllowanceCm} min={0} step={0.5} onChange={(dropArmVerticalAllowanceCm) => update({ dropArmVerticalAllowanceCm })} />
                ) : <>
                  <NumberField label="Factor diagonal de paño" value={awning.ambarFabricDropMultiplier} min={0} step={0.01} onChange={(ambarFabricDropMultiplier) => update({ ambarFabricDropMultiplier })} />
                  <NumberField label="Margen fijo de paño (cm)" value={awning.ambarFabricDropAllowanceCm} min={0} step={0.5} onChange={(ambarFabricDropAllowanceCm) => update({ ambarFabricDropAllowanceCm })} />
                </>}
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
                {!standaloneValance && !isCambioAntica && <NumberField label="Margen de caída (cm)" value={awning.fabricJobDropAllowanceCm} min={0} step={0.5} onChange={(fabricJobDropAllowanceCm) => update({ fabricJobDropAllowanceCm })} />}
                {hasValance && <NumberField label="Remate de bamba (cm)" value={awning.fabricJobValanceExtraCm} min={0} step={0.5} onChange={(fabricJobValanceExtraCm) => update({ fabricJobValanceExtraCm })} />}
              </>}
              {(fields.arzua || fields.galicia) && <>
                {awning.device === 'MOTOR' && <SegmentedField label="Motor" value={awning.motorPower} options={['AUTOMÁTICO', '55/17', '70/17']} onChange={(motorPower) => update({ motorPower })} />}
              </>}
            </ExceptionBlock>
          )}

          {!fabricOnly && (
            <div className="awning-structure-notes awning-wide-field">
              <ObservationLines label="Obs. estructura" value={getStructureNotes(awning, ofCalculation)} onChange={(structureNotes) => update({ structureNotes, ...(isElectra ? { structureNotesEdited: true } : {}) })} />
            </div>
          )}

        </ReadSheetBody>
      )}
      </ReadModeContext.Provider>

      {!readOnly && (missingFields.length ? (
        <footer className={`awning-status ${statusClass}`}>
          FALTA{missingFields.map((item) => (
            <React.Fragment key={item.field}> · <button type="button" className="awning-status-link" onClick={(event) => focusMissingField(event.currentTarget, item)}>{item.label}</button></React.Fragment>
          ))}
        </footer>
      // Válido ya lo dice la etiqueta de arriba: el pie solo sale si hay algo que atender.
      ) : status === 'VÁLIDO' ? null : <footer className={`awning-status ${statusClass}`}>{status}</footer>)}
      {/* También en la ficha de lectura: «2 AVISOS» arriba y aquí qué son. */}
      {diagnostics.length > 0 && (
        <ul className="awning-diagnostics" aria-label="Avisos del cálculo">
          {diagnostics.map((item, index) => (
            <li key={index} className={item.level === 'error' ? 'is-error' : 'is-pending'}>
              {item.level === 'error' ? <CircleAlert aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
              <span>{withoutAwningPrefix(item.message)}</span>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

// Ficha de lectura (rediseño 3 §1): en lectura los campos van dentro de un cuerpo que se
// aplana en una rejilla, con los títulos de grupo delante; el orden CSS de cada par los
// reúne bajo su título. Al editar no hay envoltorio: la tarjeta sigue igual.
function ReadSheetBody({ reading, children }: { reading: boolean; children: React.ReactNode }) {
  if (!reading) return <>{children}</>;
  return (
    <div className="awning-column-body">
      {READ_GROUPS.map((group) => (
        <h5 key={group.id} className="read-group-title" data-group={group.id} style={{ order: readGroupOrder(group.id) }}>{group.title}</h5>
      ))}
      {children}
    </div>
  );
}

// Lleva al campo que falta: el que tiene la misma etiqueta (regla del nombre único) o, si
// no, el primero marcado. La tela es del pedido y está arriba, en su buscador.
function focusMissingField(origin: HTMLElement, item: { field: string; label: string }) {
  const target = item.field === 'fabric'
    ? document.querySelector<HTMLElement>('.order-header .fabric-combobox input')
    : findMissingControl(origin.closest('.awning-column'), item.label);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.focus({ preventScroll: true });
}

function findMissingControl(card: Element | null, label: string) {
  if (!card) return null;
  const wanted = label.toLocaleLowerCase('es-ES');
  const marked = Array.from(card.querySelectorAll<HTMLElement>('.is-missing'));
  const match = marked.find((element) => element.querySelector('span')?.textContent?.trim().toLocaleLowerCase('es-ES') === wanted) || marked[0];
  return match?.querySelector<HTMLElement>('input, button, textarea, [tabindex]') || null;
}

function formatDropArmMeasure(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
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
