import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { AgataBoxParameters, AgataDevice, AgataPieceDiscounts, AgataRuleVariant, AmbarBoxParameters, AmbarPlacementGroup, ArzuaProParameters, BoxDevice, BoxParameters, CambioCortinaParameters, CortinaDevice, CortinaParameters, Device, ElectraMatrixSupport, ElectraParameters, FabricJobModel, FabricJobParameters, GaliciaParameters, MaxiscreemParameters, MaxiscreemVariantGroup, Monoblock350Device, Monoblock350Parameters, PuntoRectoParameters, RuleParameters, XacobeoParameters } from '../types';
import { NumberField } from '../components/NumberField';
import { SelectField } from '../components/SelectField';
import { controlLabel } from '../components/controlLabels';
import { ParameterBand, ParameterNote, ParameterSheet, deviceHeader, parameterModelName } from '../components/ParameterSheet';
import { ParameterSectionIndex } from '../components/ParameterSectionIndex';
import { AnticaRuleReference, HeraRuleReference, IrisRuleReference, CambioAnticaRuleReference } from './RuleReferencePanels';
import { arzuaProManualSpec } from '../../domain/arzuaProConstants.js';
import { MONOBLOCK_UNIVERS_LESS_CM } from '../../domain/monoblock350Parameters.js';
import { DrawingParametersPanel } from '../components/DrawingParametersPanel';
import { fullAwningModelNames, fabricOnlyModelNames } from '../../domain/modelBehavior.js';
import { groupModelsByFamily } from '../../domain/catalog.js';

const tubes = ['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280'];
const devices: Device[] = ['MOTOR', 'MAQ. INTERIOR', 'MAQ. EXTERIOR'];
const discountGroups = ['widthDiscounts', 'rollTubeDiscounts', 'fabricWidthDiscounts'] as const;
const discountLabels = {
  widthDiscounts: 'Tubo de carga',
  rollTubeDiscounts: 'Tubo de enrollamiento',
  fabricWidthDiscounts: 'Tela'
} as const;
type DiscountGroup = typeof discountGroups[number];
type SelectedModel = 'ARZUA PRO' | 'GALICIA' | 'XACOBEO' | 'PUNTO RECTO' | 'MONOBLOCK 350' | 'MAXISCREEM' | 'ELECTRA' | 'CORTINA' | 'SELENA' | 'CAMBIO CORTINA' | FabricJobModel | 'HERA' | 'ANTICA' | 'IRIS' | 'AMBAR BOX' | 'AGATA BOX' | 'PERLA BOX' | 'CORAL BOX' | 'CUARZO BOX';

type Props = {
  parameters: RuleParameters;
  onUpdateArzua: (patch: Partial<ArzuaProParameters>) => void;
  onUpdateGalicia: (patch: Partial<GaliciaParameters>) => void;
  onResetArzua: () => void;
  onResetGalicia: () => void;
  onUpdatePerlaBox: (patch: Partial<BoxParameters>) => void;
  onResetPerlaBox: () => void;
  onUpdateCoralBox: (patch: Partial<BoxParameters>) => void;
  onResetCoralBox: () => void;
  onUpdateCuarzoBox: (patch: Partial<BoxParameters>) => void;
  onResetCuarzoBox: () => void;
  onUpdateCortina: (patch: Partial<CortinaParameters>) => void;
  onResetCortina: () => void;
  onUpdateSelena: (patch: Partial<CortinaParameters>) => void;
  onResetSelena: () => void;
  onUpdateCambioCortina: (patch: Partial<CambioCortinaParameters>) => void;
  onResetCambioCortina: () => void;
  onUpdateXacobeo: (patch: Partial<XacobeoParameters>) => void;
  onResetXacobeo: () => void;
  onUpdatePuntoRecto: (patch: Partial<PuntoRectoParameters>) => void;
  onResetPuntoRecto: () => void;
  onUpdateMonoblock350: (patch: Partial<Monoblock350Parameters>) => void;
  onResetMonoblock350: () => void;
  onUpdateMaxiscreem: (patch: Partial<MaxiscreemParameters>) => void;
  onResetMaxiscreem: () => void;
  onUpdateElectra: (patch: Partial<ElectraParameters>) => void;
  onResetElectra: () => void;
  onUpdateAmbarBox: (patch: Partial<AmbarBoxParameters>) => void;
  onResetAmbarBox: () => void;
  onUpdateAgataBox: (patch: Partial<AgataBoxParameters>) => void;
  onResetAgataBox: () => void;
  onUpdateFabricJobs: (patch: Partial<FabricJobParameters>) => void;
  onResetFabricJobs: () => void;
  onUpdateDrawings: (drawings: RuleParameters['drawings']) => void;
};

export function ParametersView({ parameters, onUpdateArzua, onUpdateGalicia, onResetArzua, onResetGalicia, onUpdatePerlaBox, onResetPerlaBox, onUpdateCoralBox, onResetCoralBox, onUpdateCuarzoBox, onResetCuarzoBox, onUpdateCortina, onResetCortina, onUpdateSelena, onResetSelena, onUpdateCambioCortina, onResetCambioCortina, onUpdateXacobeo, onResetXacobeo, onUpdatePuntoRecto, onResetPuntoRecto, onUpdateMonoblock350, onResetMonoblock350, onUpdateMaxiscreem, onResetMaxiscreem, onUpdateElectra, onResetElectra, onUpdateAmbarBox, onResetAmbarBox, onUpdateAgataBox, onResetAgataBox, onUpdateFabricJobs, onResetFabricJobs, onUpdateDrawings }: Props) {
  const [selectedModel, setSelectedModel] = useState<SelectedModel>('ARZUA PRO');
  const clearSelectedDrawings = () => {
    const byModel = { ...parameters.drawings.byModel };
    delete byModel[selectedModel];
    onUpdateDrawings({ byModel });
  };

  // Columna de la ficha: el índice «Ir a», la ficha del modelo y, justo debajo y con el
  // mismo ancho, sus dibujos. Igual para los 22 modelos (Iván, 25/09/2026).
  return <div className="parameter-layout">
    <ParameterModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
    <div className="parameter-layout-main">
      <ParameterSectionIndex />
      {renderSheet()}
      <DrawingParametersPanel model={selectedModel} parameters={parameters.drawings} onChange={onUpdateDrawings} onReset={clearSelectedDrawings} />
    </div>
  </div>;

  function renderSheet() {
    if (selectedModel === 'HERA' || selectedModel === 'ANTICA' || selectedModel === 'IRIS') {
      return <OrderConfiguredModelView selectedModel={selectedModel} />;
    }
    if (selectedModel === 'ARZUA PRO') {
      return <ArzuaParametersView parameters={parameters.arzuaPro} selectedModel={selectedModel} onUpdate={onUpdateArzua} onReset={onResetArzua} />;
    }
    if (selectedModel === 'GALICIA') {
      return <GaliciaParametersView parameters={parameters.galicia} onUpdate={onUpdateGalicia} onReset={onResetGalicia} />;
    }
    if (selectedModel === 'XACOBEO') {
      return <XacobeoParametersView parameters={parameters.xacobeo} selectedModel={selectedModel} onUpdate={onUpdateXacobeo} onReset={onResetXacobeo} />;
    }
    if (selectedModel === 'PUNTO RECTO') {
      return <PuntoRectoParametersView parameters={parameters.puntoRecto} selectedModel={selectedModel} onUpdate={onUpdatePuntoRecto} onReset={onResetPuntoRecto} />;
    }
    if (selectedModel === 'MONOBLOCK 350') {
      return <Monoblock350ParametersView parameters={parameters.monoblock350} selectedModel={selectedModel} onUpdate={onUpdateMonoblock350} onReset={onResetMonoblock350} />;
    }
    if (selectedModel === 'MAXISCREEM') {
      return <MaxiscreemParametersView parameters={parameters.maxiscreem} selectedModel={selectedModel} onUpdate={onUpdateMaxiscreem} onReset={onResetMaxiscreem} />;
    }
    if (selectedModel === 'ELECTRA') {
      return <ElectraParametersView parameters={parameters.electra} selectedModel={selectedModel} onUpdate={onUpdateElectra} onReset={onResetElectra} />;
    }
    if (selectedModel === 'AMBAR BOX') {
      return <AmbarBoxParametersView parameters={parameters.ambarBox} selectedModel={selectedModel} onUpdate={onUpdateAmbarBox} onReset={onResetAmbarBox} />;
    }
    if (selectedModel === 'AGATA BOX') {
      return <AgataBoxParametersView parameters={parameters.agataBox} selectedModel={selectedModel} onUpdate={onUpdateAgataBox} onReset={onResetAgataBox} />;
    }
    if (selectedModel === 'CORTINA') {
      return <CortinaParametersView parameters={parameters.cortina} selectedModel={selectedModel} onUpdate={onUpdateCortina} onReset={onResetCortina} />;
    }
    if (selectedModel === 'SELENA') {
      return <CortinaParametersView parameters={parameters.selena} selectedModel={selectedModel} onUpdate={onUpdateSelena} onReset={onResetSelena} />;
    }
    if (selectedModel === 'CAMBIO CORTINA') {
      return <CambioCortinaParametersView parameters={parameters.cambioCortina} selectedModel={selectedModel} onUpdate={onUpdateCambioCortina} onReset={onResetCambioCortina} />;
    }
    if (fabricParameterModels.has(selectedModel as FabricJobModel)) {
      return <FabricJobsParametersView parameters={parameters.fabricJobs} selectedModel={selectedModel} onUpdate={onUpdateFabricJobs} onReset={onResetFabricJobs} />;
    }
    const isPerla = selectedModel === 'PERLA BOX';
    const isCuarzo = selectedModel === 'CUARZO BOX';
    return <BoxParametersView
      parameters={isPerla ? parameters.perlaBox : isCuarzo ? parameters.cuarzoBox : parameters.coralBox}
      selectedModel={selectedModel}
      onUpdate={isPerla ? onUpdatePerlaBox : isCuarzo ? onUpdateCuarzoBox : onUpdateCoralBox}
      onReset={isPerla ? onResetPerlaBox : isCuarzo ? onResetCuarzoBox : onResetCoralBox}
    />;
  }
}

const fabricParameterModels = new Set<FabricJobModel>(['CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA']);

const supportedParameterModels = new Set<SelectedModel>([
  'ARZUA PRO', 'GALICIA', 'XACOBEO', 'PUNTO RECTO', 'MONOBLOCK 350', 'MAXISCREEM', 'ELECTRA', 'IRIS', 'HERA', 'ANTICA',
  'CORTINA', 'SELENA', 'CAMBIO CORTINA', 'CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA',
  'AMBAR BOX', 'AGATA BOX', 'PERLA BOX', 'CORAL BOX', 'CUARZO BOX'
]);
const parameterModelGroups: { family: string; models: SelectedModel[] }[] = groupModelsByFamily(
  [...fullAwningModelNames, ...fabricOnlyModelNames]
    .filter((model): model is SelectedModel => supportedParameterModels.has(model as SelectedModel))
);

const parameterNumber = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

type GaliciaProps = {
  parameters: GaliciaParameters;
  onUpdate: (patch: Partial<GaliciaParameters>) => void;
  onReset: () => void;
};

function GaliciaParametersView({ parameters, onUpdate, onReset }: GaliciaProps) {
  function updateDiscount(group: DiscountGroup, tube: string, device: Device, value: number) {
    onUpdate({ [group]: { ...parameters[group], [tube]: { ...parameters[group][tube], [device]: value } } } as Partial<GaliciaParameters>);
  }

  function updateStockLength(index: number, value: number | null) {
    if (value === null) return;
    onUpdate({ stockLengths: parameters.stockLengths.map((currentValue, currentIndex) => currentIndex === index ? value : currentValue) });
  }

  function updateMinimum(projection: number, arms: 2 | 3, device: Device, value: number) {
    onUpdate({
      minimumLineByProjection: parameters.minimumLineByProjection.map((row) => row.projection === projection
        ? { ...row, values: { ...row.values, [arms]: { ...row.values[arms], [device]: value } } }
        : row)
    });
  }

  return (
    <ParameterSheet
      model="GALICIA"
      description="Reglas aplicadas en tiempo real al formulario, estructura, tela y reserva RPS."
      onReset={onReset}
      evidence="49 estructuras Galicia de 2026 revisadas: 43 casos estándar coinciden en medidas y 6 quedan como excepción técnica por superar 700 cm."
    >
      <ParameterBand number="01" title="Selección automática" description="El frente propone 2 o 3 brazos; los brazos determinan el motor. El tubo se elige directamente en cada toldo.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="3 brazos desde frente (cm)" value={parameters.armSwitchWidth} min={1} onChange={(armSwitchWidth) => armSwitchWidth !== null && onUpdate({ armSwitchWidth })} />
          <NumberField label="Frente máximo (cm)" value={parameters.standardMaxWidth} min={1} onChange={(standardMaxWidth) => standardMaxWidth !== null && onUpdate({ standardMaxWidth })} />
        </div>
        <ParameterNote>Motor automático: 2 brazos = 55/17 · 3 brazos = 70/17.</ParameterNote>
      </ParameterBand>

      <ParameterBand number="02" title="Tela y barras comerciales" description="Márgenes de confección y longitudes disponibles en almacén. La web elige la barra automáticamente.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Margen de caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(fabricDropAllowanceCm) => fabricDropAllowanceCm !== null && onUpdate({ fabricDropAllowanceCm })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(seamAllowanceCm) => seamAllowanceCm !== null && onUpdate({ seamAllowanceCm })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(seamBaseCm) => seamBaseCm !== null && onUpdate({ seamBaseCm })} />
          {parameters.stockLengths.map((stockLength, index) => (
            <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={stockLength} min={1} step={50} onChange={(value) => updateStockLength(index, value)} />
          ))}
        </div>
      </ParameterBand>

      <ParameterBand number="03" title="Descuentos dimensionales" description="Centímetros descontados al frente para cada pieza y para la tela.">
        <div className="parameter-table-wrap">
          <table className="parameter-table parameter-table-discounts">
            <thead><tr><th>Pieza</th><th>Tubo</th>{devices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
            <tbody>{discountGroups.flatMap((group) => tubes.map((tube, tubeIndex) => (
              <tr key={`${group}-${tube}`}>
                {tubeIndex === 0 && <td className="discount-part" rowSpan={tubes.length}>{discountLabels[group]}</td>}
                <td className="discount-tube">{controlLabel(tube)}</td>
                {devices.map((device) => <td key={device}><input aria-label={`GALICIA ${group} ${tube} ${device}`} type="number" step="0.1" min="0" value={parameters[group][tube][device]} onChange={(event) => updateDiscount(group, tube, device, Number(event.target.value))} /></td>)}
              </tr>
            )))}</tbody>
          </table>
        </div>
      </ParameterBand>

      <ParameterBand number="04" title="Líneas mínimas" description="Frente mínimo admisible para cada salida, dispositivo y número de brazos.">
        <div className="parameter-table-wrap">
          <table className="parameter-table parameter-table-lines galicia-lines">
            <thead><tr><th rowSpan={2}>Salida</th><th colSpan={3}>2 brazos</th><th colSpan={3}>3 brazos</th></tr><tr>{[2, 3].flatMap((arms) => devices.map((device) => <th key={`${arms}-${device}`}>{deviceHeader(device)}</th>))}</tr></thead>
            <tbody>{parameters.minimumLineByProjection.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{([2, 3] as const).flatMap((arms) => devices.map((device) => <td key={`${arms}-${device}`}><input aria-label={`GALICIA salida ${row.projection} ${arms} brazos ${device}`} type="number" step="0.1" min="1" value={row.values[arms][device]} onChange={(event) => updateMinimum(row.projection, arms, device, Number(event.target.value))} /></td>))}</tr>)}</tbody>
          </table>
        </div>
      </ParameterBand>
    </ParameterSheet>
  );
}

type ArzuaParametersProps = {
  parameters: ArzuaProParameters;
  selectedModel: 'ARZUA PRO';
  onUpdate: (patch: Partial<ArzuaProParameters>) => void;
  onReset: () => void;
};

const arzuaDeviceLabels: Record<Device, string> = {
  MOTOR: 'Motor',
  'MAQ. INTERIOR': 'Máquina dentro',
  'MAQ. EXTERIOR': 'Máquina fuera'
};

const arzuaDiscountGroups: DiscountGroup[] = ['fabricWidthDiscounts', 'rollTubeDiscounts', 'widthDiscounts'];

const arzuaDiscountTitles: Record<DiscountGroup, string> = {
  fabricWidthDiscounts: 'Tela',
  rollTubeDiscounts: 'Tubo de enrollar',
  widthDiscounts: 'Barra delantera'
};

// Descuentos del manual, en el orden motor / máquina dentro / máquina fuera.
const arzuaManualDiscounts = arzuaDiscountGroups
  .map((group) => `${arzuaDiscountTitles[group].toLocaleLowerCase('es')} ${devices.map((device) => parameterNumber.format(arzuaProManualSpec.cuttingDiscountsCm[group][device])).join(' / ')}`)
  .join(' · ');

// Arzúa Pro con el patrón común de fichas (Iván, 25/09/2026). Conserva todos los datos del
// manual Llaza y todos los campos editables de la versión anterior.
function ArzuaParametersView({ parameters, selectedModel, onUpdate, onReset }: ArzuaParametersProps) {
  const example = parameters.minimumLineByArm.find((row) => row.arm === 250);

  function updateDiscount(group: DiscountGroup, device: Device, value: number) {
    onUpdate({
      [group]: Object.fromEntries(tubes.map((tube) => [
        tube,
        { ...parameters[group][tube], [device]: value }
      ]))
    } as Partial<ArzuaProParameters>);
  }

  function updateMinimum(arm: number, device: Device, value: number) {
    onUpdate({
      minimumLineByArm: parameters.minimumLineByArm.map((row) => row.arm === arm
        ? { ...row, values: { ...row.values, [device]: value } }
        : row)
    });
  }

  function updateStockLength(index: number, value: number | null) {
    if (value === null) return;
    onUpdate({
      stockLengths: parameters.stockLengths.map((stockLength, currentIndex) => currentIndex === index ? value : stockLength)
    });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      description={`${arzuaProManualSpec.product} · fabricación e instalación rev. ${arzuaProManualSpec.revision}`}
      onReset={onReset}
      evidence={`891 Arzúa revisados: 726 máquina, 165 motor, 395 EVO 80 y 406 UNIVERS 280. Límites, pares de motor, descuentos y frentes mínimos según el manual ${arzuaProManualSpec.product} rev. 2.1.`}
    >
      <ParameterBand number="01" title="Límites" description={`Límites físicos que Llaza da para el ${arzuaProManualSpec.product.replace('Llaza ', '')}.`}>
        <div className="parameter-table-wrap">
          <table className="parameter-table" aria-label="Límites del manual Llaza">
            <thead><tr><th>Dato del manual</th><th>Valor</th><th>Qué significa</th></tr></thead>
            <tbody>
              <tr><td>Frente máximo</td><td className="num">{arzuaProManualSpec.maximumWidthCm} cm</td><td>Más ancho necesita una excepción técnica.</td></tr>
              <tr><td>Salida máxima</td><td className="num">{arzuaProManualSpec.maximumProjectionCm} cm</td><td>Es el brazo más largo admitido.</td></tr>
              <tr><td>Inclinación</td><td className="num">{arzuaProManualSpec.inclinationDegrees.min}–{arzuaProManualSpec.inclinationDegrees.max}°</td><td>Recorrido regulable del soporte.</td></tr>
              <tr><td>Tubo de enrollar</td><td className="num">Ø{arzuaProManualSpec.rollingTubeDiameterMm} mm</td><td>Permite enrollar hasta {arzuaProManualSpec.maximumProjectionCm} cm de salida.</td></tr>
            </tbody>
          </table>
        </div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Máximo que acepta la web (cm)" value={parameters.standardMaxWidth} min={1} max={700} onChange={(standardMaxWidth) => standardMaxWidth !== null && onUpdate({ standardMaxWidth })} />
        </div>
        <ParameterNote>Por encima de {arzuaProManualSpec.maximumWidthCm} cm la tarjeta pide «Modificar reglas» para documentar la excepción: un toldo de 601 cm no pasa como normal aunque haya barra de 650 o 700 cm.</ParameterNote>
      </ParameterBand>

      <ParameterBand number="02" title="Selección automática" description="Atajos de Testar. El operario puede cambiar tubo o motor en un toldo concreto.">
        <div className="parameter-grid parameter-grid-3">
          <SelectField label="Tubo · particular" value={parameters.privateTube} options={tubes} onChange={(privateTube) => onUpdate({ privateTube })} />
          <SelectField label="Tubo · empresa u hostelería" value={parameters.businessTube} options={tubes} onChange={(businessTube) => onUpdate({ businessTube })} />
          <NumberField label="Motor 70/17 desde (cm)" value={parameters.motor70WidthFrom} min={arzuaProManualSpec.maximumWidthCm + 1} onChange={(motor70WidthFrom) => motor70WidthFrom !== null && onUpdate({ motor70WidthFrom })} />
        </div>
        <ParameterNote>El tubo solo se propone; no se bloquea. Motor 55/17 hasta {arzuaProManualSpec.maximumWidthCm} cm: el manual pide entre 30 y 50 Nm con tubo Ø{arzuaProManualSpec.rollingTubeDiameterMm}. Motor 70/17 solo por excepción desde {parameters.motor70WidthFrom} cm.</ParameterNote>
        <details className="parameter-details">
          <summary>Tabla de motor del manual Llaza (tubo Ø{arzuaProManualSpec.rollingTubeDiameterMm})</summary>
          <ParameterNote>Salida a la izquierda y frente arriba; cada casilla es el par mínimo en Nm. «—»: combinación demasiado estrecha.</ParameterNote>
          <div className="parameter-table-wrap">
            <table className="parameter-table parameter-motor-table" aria-label="Par de motor del manual Llaza">
              <thead><tr><th>Salida ↓ / frente →</th>{arzuaProManualSpec.motorTube80.widthsCm.map((width) => <th key={width}>{width}</th>)}</tr></thead>
              <tbody>{arzuaProManualSpec.motorTube80.rows.map((row) => <tr key={row.projectionCm}><td className="num">{row.projectionCm} cm</td>{row.torqueNm.map((torque, index) => <td key={arzuaProManualSpec.motorTube80.widthsCm[index]} className={torque === null ? 'is-impossible' : 'num'}>{torque ?? '—'}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </details>
      </ParameterBand>

      <ParameterBand number="03" title="Tela y barras comerciales" description="El manual no da la caída ni los márgenes de unión: son reglas de confección de Testar y barras del almacén.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Tela extra en la caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(fabricDropAllowanceCm) => fabricDropAllowanceCm !== null && onUpdate({ fabricDropAllowanceCm })} />
          <NumberField label="Solape entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(seamAllowanceCm) => seamAllowanceCm !== null && onUpdate({ seamAllowanceCm })} />
          <NumberField label="Margen fijo de confección (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(seamBaseCm) => seamBaseCm !== null && onUpdate({ seamBaseCm })} />
          {parameters.stockLengths.map((stockLength, index) => <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={stockLength} min={1} step={50} onChange={(value) => updateStockLength(index, value)} />)}
        </div>
        <ParameterNote>Caída de tela: salida + {parameters.fabricDropAllowanceCm} + alto de bamba. Con la bamba en otra tela: cuerpo salida + {Math.max(0, parameters.fabricDropAllowanceCm - 5)} y bamba alto + 5.</ParameterNote>
        <ParameterNote>El solape se suma por cada unión entre paños y el margen fijo, una vez por paño. La web coge la primera barra suficientemente larga.</ParameterNote>
      </ParameterBand>

      <ParameterBand number="04" title="Descuentos al frente" description="Cada casilla se lee «frente menos este número», en cm.">
        <div className="parameter-table-wrap">
          <table className="parameter-table parameter-table-lines">
            <thead><tr><th>Pieza</th>{devices.map((device) => <th key={device}>{arzuaDeviceLabels[device]}</th>)}</tr></thead>
            <tbody>{arzuaDiscountGroups.map((group) => {
              const title = arzuaDiscountTitles[group];
              return <tr key={group}>
                <td>{title}</td>
                {devices.map((device) => <td key={device}><input aria-label={`ARZUA ${title} ${arzuaDeviceLabels[device]}`} type="number" step="0.1" min="0" value={parameters[group][tubes[0]][device]} onChange={(event) => updateDiscount(group, device, Number(event.target.value))} /></td>)}
              </tr>;
            })}</tbody>
          </table>
        </div>
        <ParameterNote>Manual Llaza (motor / máquina dentro / máquina fuera): {arzuaManualDiscounts} cm. Iguales con EVO 80 y UNIVERS 280.</ParameterNote>
      </ParameterBand>

      <ParameterBand number="05" title="Frente mínimo por salida" description="Cuanto más abre el toldo, más ancho necesita para que los brazos quepan cerrados.">
        <div className="parameter-table-wrap">
          <table className="parameter-table parameter-table-lines">
            <thead><tr><th>Salida</th>{devices.map((device) => <th key={device}>{arzuaDeviceLabels[device]}</th>)}</tr></thead>
            <tbody>{parameters.minimumLineByArm.map((row) => <tr key={row.arm}>
              <td className="num">{row.arm}</td>
              {devices.map((device) => <td key={device}><input aria-label={`ARZUA salida ${row.arm} ${arzuaDeviceLabels[device]}`} type="number" min="1" value={row.values[device]} onChange={(event) => updateMinimum(row.arm, device, Number(event.target.value))} /></td>)}
            </tr>)}</tbody>
          </table>
        </div>
        {example && <ParameterNote>Ejemplo: con salida 250 hacen falta {example.values.MOTOR} cm con motor, {example.values['MAQ. INTERIOR']} con máquina dentro y {example.values['MAQ. EXTERIOR']} con máquina fuera.</ParameterNote>}
        <ParameterNote>Corrección aplicada: las salidas 300, 325 y 350 siguen la página 6 del manual Llaza.</ParameterNote>
      </ParameterBand>
    </ParameterSheet>
  );
}

function OrderConfiguredModelView({ selectedModel }: {
  selectedModel: 'HERA' | 'ANTICA' | 'IRIS';
}) {
  return <ParameterSheet model={selectedModel} kind="consulta" description="Aumentos, descuentos y condiciones que aplica la web. Consulta sin modificar pedidos ni valores generales.">
    {selectedModel === 'ANTICA' ? <AnticaRuleReference /> : selectedModel === 'HERA' ? <HeraRuleReference /> : <IrisRuleReference />}
  </ParameterSheet>;
}

function ParameterModelSelector({ selectedModel, onSelectModel }: {
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
}) {
  return (
    <nav className="parameter-model-sidebar panel-3d" aria-label="Modelos de parámetros">
      <strong className="parameter-model-sidebar-title">Modelos</strong>
      {parameterModelGroups.map(({ family, models }) => (
        <section className="parameter-model-family" key={family || 'tela'}>
          <h3>{family || 'TRABAJOS DE TELA'}</h3>
          {models.map((model) => {
                const names = parameterModelName(model);
                const active = model === selectedModel;
                return (
                  <button
                    key={model}
                    type="button"
                    data-model={model}
                    className={active ? 'tecla-3d is-active' : 'tecla-3d'}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => onSelectModel(model)}
                  >
                    <span><strong>{names.current}</strong>{names.legacy && <small>{names.legacy}</small>}</span>
                    {active && <Check aria-hidden="true" />}
                  </button>
                );
          })}
        </section>
      ))}
    </nav>
  );
}

type XacobeoProps = {
  parameters: XacobeoParameters;
  selectedModel: SelectedModel;
  onUpdate: (patch: Partial<XacobeoParameters>) => void;
  onReset: () => void;
};

function XacobeoParametersView({ parameters, selectedModel, onUpdate, onReset }: XacobeoProps) {
  const xacDevices: Device[] = ['MAQ. EXTERIOR', 'MAQ. INTERIOR', 'MOTOR'];
  const discountRows = [
    ['fabricWidthDiscounts', 'Frente de tela'],
    ['rollTubeDiscounts', 'Tubo de enrollamiento'],
    ['loadBarDiscounts', 'Tubo de carga EVO 70']
  ] as const;

  function updateDiscount(field: typeof discountRows[number][0], device: Device, value: number) {
    onUpdate({ [field]: { ...parameters[field], [device]: value } });
  }

  function updateMinimum(projection: number, device: Device, value: number) {
    onUpdate({
      minimumLineByProjection: parameters.minimumLineByProjection.map((row) => row.projection === projection
        ? { ...row, values: { ...row.values, [device]: value } }
        : row)
    });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      description="Despiece ART250, confección de tela y reserva RPS."
      onReset={onReset}
      evidence="13 estructuras Xacobeo completas de 2026 y un caso motorizado de 2025 revisados: las 56 medidas contrastadas son correctas y las reservas RPS comprobables no presentan diferencias."
    >
      <ParameterBand number="01" title="Límites, tela y largos comerciales" description="Los largos comerciales son las barras disponibles en almacén; la web elige automáticamente la menor que permita cortar la pieza.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Margen de caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </ParameterBand>

      <ParameterBand number="02" title="Descuentos dimensionales" description="Centímetros descontados al frente según pieza y accionamiento.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{xacDevices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{discountRows.map(([field, label]) => <tr key={field}><td>{label}</td>{xacDevices.map((device) => <td key={device}><input aria-label={`XACOBEO ${label} ${device}`} type="number" min="0" step="0.1" value={parameters[field][device]} onChange={(event) => updateDiscount(field, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </ParameterBand>

      <ParameterBand number="03" title="Líneas mínimas" description="Frente mínimo por salida y tipo de accionamiento.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Salida</th>{xacDevices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{parameters.minimumLineByProjection.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{xacDevices.map((device) => <td key={device}><input aria-label={`XACOBEO salida ${row.projection} ${device}`} type="number" min="1" value={row.values[device]} onChange={(event) => updateMinimum(row.projection, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </ParameterBand>
    </ParameterSheet>
  );
}

type MaxiscreemProps = {
  parameters: MaxiscreemParameters;
  selectedModel: SelectedModel;
  onUpdate: (patch: Partial<MaxiscreemParameters>) => void;
  onReset: () => void;
};

function MaxiscreemParametersView({ parameters, selectedModel, onUpdate, onReset }: MaxiscreemProps) {
  const groups: { code: MaxiscreemVariantGroup; label: string }[] = [
    { code: 'COFRE', label: 'Con cofre' },
    { code: 'SIN_COFRE', label: 'Sin cofre' }
  ];
  const devices: BoxDevice[] = ['MAQUINA', 'MOTOR'];
  const discountRows = [
    ['fabric', 'Frente de tela'],
    ['roll', 'Tubo de enrollamiento P801'],
    ['loadBar', 'Perfil de carga'],
    ['boxProfile', 'Perfil de cofre']
  ] as const;

  function updateDiscount(group: MaxiscreemVariantGroup, device: BoxDevice, field: typeof discountRows[number][0], value: number) {
    onUpdate({
      discounts: {
        ...parameters.discounts,
        [group]: { ...parameters.discounts[group], [device]: { ...parameters.discounts[group][device], [field]: value } }
      }
    });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      description="Con o sin cofre y guiado por cable o varilla."
      onReset={onReset}
      evidence="Casos Diana/Maxiscreen de 2025 y 2026 revisados: cofre y sin cofre, máquina y motor. Tela, P801, perfiles, soportes y guías coinciden con los planteamientos disponibles."
    >
      <ParameterBand number="01" title="Límites y confección" description="Medidas máximas y márgenes usados en el paño vertical.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Caída máxima estándar (cm)" value={parameters.standardMaxDrop} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxDrop: value })} />
          <NumberField label="Margen de caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Remate de bamba (cm)" value={parameters.valanceExtraCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ valanceExtraCm: value })} />
          <NumberField label="Ajuste guía (cm)" value={parameters.guideDiscountCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ guideDiscountCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
      </ParameterBand>

      <ParameterBand number="02" title="Largos de almacén" description="La web elige automáticamente el primer largo que admite la pieza.">
        <div className="parameter-grid parameter-grid-3">
          {parameters.rollStockLengths.map((length, index) => <NumberField key={`roll-${index}`} label={`Stock P801 ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ rollStockLengths: parameters.rollStockLengths.map((item, current) => current === index ? value : item) })} />)}
          {parameters.profileStockLengths.map((length, index) => <NumberField key={`profile-${index}`} label={`Stock perfiles ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ profileStockLengths: parameters.profileStockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </ParameterBand>

      <ParameterBand number="03" title="Descuentos dimensionales" description="Valores distintos según haya cofre y según el accionamiento.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Configuración</th><th>Pieza</th>{devices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{groups.flatMap(({ code, label }) => discountRows.map(([field, piece], index) => <tr key={`${code}-${field}`}><td>{index === 0 ? label : ''}</td><td>{piece}</td>{devices.map((device) => <td key={device}><input aria-label={`MAXISCREEM ${label} ${piece} ${device}`} type="number" min="0" step="0.1" value={parameters.discounts[code][device][field]} onChange={(event) => updateDiscount(code, device, field, Number(event.target.value))} /></td>)}</tr>))}</tbody>
        </table></div>
      </ParameterBand>
    </ParameterSheet>
  );
}

type ElectraProps = {
  parameters: ElectraParameters;
  selectedModel: 'ELECTRA';
  onUpdate: (patch: Partial<ElectraParameters>) => void;
  onReset: () => void;
};

function ElectraParametersView({ parameters, selectedModel, onUpdate, onReset }: ElectraProps) {
  const supports: ElectraMatrixSupport[] = ['SOPORTE ELIT VERTICAL', 'SOPORTES ALMAGRO', 'UNIVERSAL 3 AGUJEROS'];
  const devices: CortinaDevice[] = ['MAQ. INTERIOR', 'MAQ. EXTERIOR', 'MOTOR'];
  const supportPieces = [
    ['fabric', 'Frente de tela'],
    ['roll', 'Tubo de enrollamiento P801'],
    ['loadBar', 'Perfil de carga'],
    ['guide', 'Guía sobre caída']
  ] as const;
  const cofrePieces = [
    ['fabric', 'Frente de tela'],
    ['roll', 'Tubo de enrollamiento P801'],
    ['loadBar', 'Perfil de carga'],
    ['boxProfile', 'Perfil de cofre']
  ] as const;

  function updateSupportDiscount(support: ElectraMatrixSupport, device: CortinaDevice, field: typeof supportPieces[number][0], value: number) {
    onUpdate({
      supportDiscounts: {
        ...parameters.supportDiscounts,
        [support]: {
          ...parameters.supportDiscounts[support],
          [device]: { ...parameters.supportDiscounts[support][device], [field]: value }
        }
      }
    });
  }

  function updateCofreDiscount(device: CortinaDevice, field: typeof cofrePieces[number][0], value: number) {
    onUpdate({
      cofreDiscounts: {
        ...parameters.cofreDiscounts,
        [device]: { ...parameters.cofreDiscounts[device], [field]: value }
      }
    });
  }

  function updateAllowance(device: CortinaDevice, value: number) {
    onUpdate({ fabricDropAllowanceCm: { ...parameters.fabricDropAllowanceCm, [device]: value } });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      kind="nuevo"
      description="Reglas por soporte, con o sin cofre y con o sin guía."
      onReset={onReset}
      evidence="Archivo de descuentos, reglas de Cortina con Maxiscreen y 37 líneas ELECTR de 2024–2026 revisadas. RPS usa ELECTRA; en documentación también aparece como ELIT VERTICAL."
    >
      <ParameterBand number="01" title="Límites, confección y almacén" description="El soporte es obligatorio en cada pedido. Las medidas superiores a 500 × 300 cm requieren excepción técnica.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Caída máxima estándar (cm)" value={parameters.standardMaxDrop} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxDrop: value })} />
          {devices.map((device) => <NumberField key={device} label={`Margen de caída · ${deviceHeader(device)} (cm)`} value={parameters.fabricDropAllowanceCm[device]} min={0} step={0.5} onChange={(value) => value !== null && updateAllowance(device, value)} />)}
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          {parameters.rollStockLengths.map((length, index) => <NumberField key={`roll-${index}`} label={`Stock P801 ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ rollStockLengths: parameters.rollStockLengths.map((item, current) => current === index ? value : item) })} />)}
          {parameters.profileStockLengths.map((length, index) => <NumberField key={`profile-${index}`} label={`Stock perfiles ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ profileStockLengths: parameters.profileStockLengths.map((item, current) => current === index ? value : item) })} />)}
          {parameters.guideStockLengths.map((length, index) => <NumberField key={`guide-${index}`} label={`Stock guías ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ guideStockLengths: parameters.guideStockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </ParameterBand>

      <ParameterBand number="02" title="Descuentos según soporte" description="Tabla interna de Electra y descuentos de Cortina para el soporte Maxiscreen. Todos los valores se descuentan en centímetros.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Soporte</th><th>Pieza</th>{devices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{supports.flatMap((support) => supportPieces.map(([field, label], index) => <tr key={`${support}-${field}`}><td>{index === 0 ? support : ''}</td><td>{label}</td>{devices.map((device) => <td key={device}><input aria-label={`ELECTRA ${support} ${label} ${device}`} type="number" min="0" step="0.1" value={parameters.supportDiscounts[support][device][field]} onChange={(event) => updateSupportDiscount(support, device, field, Number(event.target.value))} /></td>)}</tr>))}</tbody>
        </table></div>
      </ParameterBand>

      <ParameterBand number="03" title="Configuración con cofre" description="Descuentos recuperados de los planteamientos Electra con cofre que reutilizan la estructura MAXISCREEM.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{devices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{cofrePieces.map(([field, label]) => <tr key={field}><td>{label}</td>{devices.map((device) => <td key={device}><input aria-label={`ELECTRA cofre ${label} ${device}`} type="number" min="0" step="0.1" value={parameters.cofreDiscounts[device][field]} onChange={(event) => updateCofreDiscount(device, field, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </ParameterBand>
    </ParameterSheet>
  );
}

type Monoblock350Props = {
  parameters: Monoblock350Parameters;
  selectedModel: SelectedModel;
  onUpdate: (patch: Partial<Monoblock350Parameters>) => void;
  onReset: () => void;
};

function Monoblock350ParametersView({ parameters, selectedModel, onUpdate, onReset }: Monoblock350Props) {
  const devices: Monoblock350Device[] = ['MAQUINA', 'MOTOR'];
  const discountRows = [
    ['fabric', 'Frente de tela'],
    ['roll', 'Tubo de enrollamiento P801'],
    ['loadBar', 'Tubo de carga EVO 80'],
    ['squareBar', 'Barra cuadrada 40×40']
  ] as const;

  function updateDiscount(device: Monoblock350Device, field: typeof discountRows[number][0], value: number) {
    onUpdate({ discounts: { ...parameters.discounts, [device]: { ...parameters.discounts[device], [field]: value } } });
  }

  function updateRule(projection: number, arms: 2 | 3 | 4, field: 'minimum' | 'maximum' | 'motorPower', value: number | string) {
    onUpdate({
      dimensionalRules: parameters.dimensionalRules.map((row) => row.projection === projection
        ? { ...row, values: { ...row.values, [arms]: { ...row.values[arms], [field]: value } } }
        : row)
    });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      description="Estructura Arzúa Monobloc, confección de tela y reserva RPS."
      onReset={onReset}
      evidence="Diez planteamientos de 2026 revisados, con casos de 2, 3 y 4 brazos entre 287 y 972 cm. Medidas, soportes, P801, EVO 80, motores y tela contrastados con RPS."
    >
      <ParameterBand number="01" title="Tela y estructura" description="Márgenes de confección, barras comerciales disponibles y reparto de soportes.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Margen caída tela (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Remate de bamba (cm)" value={parameters.valanceExtraCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ valanceExtraCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Barra comercial P801 ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
          <NumberField label="Stock barra 40×40 (cm)" value={parameters.squareBarStockLength} min={1} step={50} onChange={(value) => value !== null && onUpdate({ squareBarStockLength: value })} />
          <NumberField label="Luz máxima entre apoyos (cm)" value={parameters.supportGapThresholdCm} min={1} onChange={(value) => value !== null && onUpdate({ supportGapThresholdCm: value })} />
          <NumberField label="Margen lateral soportes (cm)" value={parameters.supportEdgeOffsetCm} min={0} onChange={(value) => value !== null && onUpdate({ supportEdgeOffsetCm: value })} />
          <NumberField label="Primer currón desde (cm)" value={parameters.curronStartWidthCm} min={1} onChange={(value) => value !== null && onUpdate({ curronStartWidthCm: value })} />
          <NumberField label="Segundo currón desde (cm)" value={parameters.curronSecondWidthCm} min={1} onChange={(value) => value !== null && onUpdate({ curronSecondWidthCm: value })} />
        </div>
      </ParameterBand>

      <ParameterBand number="02" title="Descuentos dimensionales" description="Centímetros descontados al frente por accionamiento.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{devices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{discountRows.map(([field, label]) => <tr key={field}><td>{label}</td>{devices.map((device) => <td key={device}><input aria-label={`MONOBLOCK ${label} ${device}`} type="number" min="0" step="0.1" value={parameters.discounts[device][field]} onChange={(event) => updateDiscount(device, field, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
        <ParameterNote>La barra Univers 280 se descuenta {MONOBLOCK_UNIVERS_LESS_CM} cm menos que la EVO 80, porque la EVO lleva tapas más grandes.</ParameterNote>
      </ParameterBand>

      <ParameterBand number="03" title="Rangos por salida y brazos" description="Frentes mínimos, máximos y motor automático.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines monoblock-ranges-table"><thead><tr><th>Salida</th>{[2, 3, 4].map((arms) => <th key={arms}>{arms} brazos · mín/máx · motor</th>)}</tr></thead>
          <tbody>{parameters.dimensionalRules.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{([2, 3, 4] as const).map((arms) => <td key={arms}><div className="parameter-inline-fields"><input aria-label={`MONOBLOCK ${row.projection} ${arms} mínimo`} type="number" min="1" value={row.values[arms].minimum} onChange={(event) => updateRule(row.projection, arms, 'minimum', Number(event.target.value))} /><input aria-label={`MONOBLOCK ${row.projection} ${arms} máximo`} type="number" min="1" value={row.values[arms].maximum} onChange={(event) => updateRule(row.projection, arms, 'maximum', Number(event.target.value))} /><input aria-label={`MONOBLOCK ${row.projection} ${arms} motor`} value={row.values[arms].motorPower} onChange={(event) => updateRule(row.projection, arms, 'motorPower', event.target.value)} /></div></td>)}</tr>)}</tbody>
        </table></div>
      </ParameterBand>
    </ParameterSheet>
  );
}

type PuntoRectoProps = {
  parameters: PuntoRectoParameters;
  selectedModel: SelectedModel;
  onUpdate: (patch: Partial<PuntoRectoParameters>) => void;
  onReset: () => void;
};

function PuntoRectoParametersView({ parameters, selectedModel, onUpdate, onReset }: PuntoRectoProps) {
  const pointDevices: BoxDevice[] = ['MAQUINA', 'MOTOR'];
  const discountRows = [
    ['fabricWidthDiscounts', 'Frente de tela'],
    ['rollTubeDiscounts', 'Tubo de enrollamiento'],
    ['loadBarDiscounts', 'Univers 270']
  ] as const;

  function updateDiscount(field: typeof discountRows[number][0], device: BoxDevice, value: number) {
    onUpdate({ [field]: { ...parameters[field], [device]: value } });
  }

  function updateMotorPower(arms: 2 | 3 | 4, power: string) {
    onUpdate({ motorPowerByArm: { ...parameters.motorPowerByArm, [arms]: power } });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      description="Despiece PRT07, confección de tela y reserva RPS."
      onReset={onReset}
      evidence="18 estructuras de 2026 y cinco casos históricos de máquina y motor revisados. Las excepciones de caída de paño quedan editables por toldo."
    >
      <ParameterBand number="01" title="Estructura automática" description="El frente selecciona P701 o P801 y exige el número mínimo de brazos. Los largos comerciales son las barras disponibles en almacén.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="P801 y 3 brazos desde (cm)" value={parameters.armSwitchWidth} min={1} onChange={(value) => value !== null && onUpdate({ armSwitchWidth: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
        <ParameterNote>Hasta {parameters.armSwitchWidth} cm: P701 y mínimo 2 brazos. Por encima: P801 y mínimo 3 brazos. La web escoge la barra comercial más corta que admita el corte; este dato no se cubre en el pedido.</ParameterNote>
      </ParameterBand>

      <ParameterBand number="02" title="Geometría del paño" description="La caída sigue la diagonal de los brazos y añade el margen fijo y la bambalina.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Multiplicador de la salida" value={parameters.fabricDropMultiplier} min={0.1} step={0.01} onChange={(value) => value !== null && onUpdate({ fabricDropMultiplier: value })} />
          <NumberField label="Margen fijo de paño (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Margen bajada vertical (cm)" value={parameters.verticalFabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ verticalFabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
        <ParameterNote>Estándar: salida × multiplicador + margen fijo + bamba. Bajada vertical 170°: salida × 2 + margen vertical + bamba. La bamba de otro tejido se calcula aparte.</ParameterNote>
      </ParameterBand>

      <ParameterBand number="03" title="Descuentos y motores" description="Descuentos al frente y potencia automática según brazos.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{pointDevices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{discountRows.map(([field, label]) => <tr key={field}><td>{label}</td>{pointDevices.map((device) => <td key={device}><input aria-label={`PUNTO RECTO ${label} ${device}`} type="number" min="0" step="0.1" value={parameters[field][device]} onChange={(event) => updateDiscount(field, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
        <div className="parameter-grid parameter-grid-3">
          {([2, 3, 4] as const).map((arms) => <SelectField key={arms} label={`Motor con ${arms} brazos`} value={parameters.motorPowerByArm[arms]} options={['15/17', '35/17', '50/17']} onChange={(power) => updateMotorPower(arms, power)} />)}
        </div>
      </ParameterBand>
    </ParameterSheet>
  );
}

type CambioCortinaProps = {
  parameters: CambioCortinaParameters;
  selectedModel: SelectedModel;
  onUpdate: (patch: Partial<CambioCortinaParameters>) => void;
  onReset: () => void;
};

type FabricJobsProps = {
  parameters: FabricJobParameters;
  selectedModel: SelectedModel;
  onUpdate: (patch: Partial<FabricJobParameters>) => void;
  onReset: () => void;
};

function FabricJobsParametersView({ parameters, selectedModel, onUpdate, onReset }: FabricJobsProps) {
  const jobs: { model: FabricJobModel; label: string; note: string }[] = [
    { model: 'CAMBIO TELA', label: 'Cambio de tela', note: 'Margen del cuerpo' },
    { model: 'ENROLLABLE', label: 'Enrollable', note: 'Entrada de confección' }
  ];
  function updateAllowance(model: FabricJobModel, value: number) {
    onUpdate({ dropAllowanceByModel: { ...parameters.dropAllowanceByModel, [model]: value } });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      kind="tela"
      description="Comparte los márgenes comunes de confección; cada modelo conserva su caída propia."
      onReset={onReset}
      evidenceLabel="Valores por defecto"
      evidence="Cambio de tela +40 cm, Enrollable +25 cm y Bambalina +5 cm. Cambio Antica corta la medida de la tela vieja más lo que se sume en la tarjeta. La bamba en otra tela se reserva por separado."
    >
      <ParameterBand number="01" title="Márgenes de confección" description={selectedModel === 'BAMBALINA' ? 'Corte de bambalina: alto terminado + remate. El remate también se comparte con las bambas de los demás trabajos de tela.' : 'Centímetros añadidos a las medidas indicadas. El remate de bambalina se comparte con los demás trabajos de tela.'}>
        <div className="parameter-grid parameter-grid-3">
          {jobs.filter((job) => job.model === selectedModel).map((job) => <NumberField key={job.model} label={`${job.label} · ${job.note} (cm)`} value={parameters.dropAllowanceByModel[job.model]} min={0} step={0.5} onChange={(value) => value !== null && updateAllowance(job.model, value)} />)}
          {selectedModel !== 'ENROLLABLE' && <NumberField label="Remate de bambalina (cm)" value={parameters.valanceExtraCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ valanceExtraCm: value })} />}
        </div>
      </ParameterBand>
      <ParameterBand number="02" title="Paños" description="Costuras usadas para calcular el número de paños y los metros lineales.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
      </ParameterBand>
      {selectedModel === 'CAMBIO ANTICA' && <CambioAnticaRuleReference parameters={parameters} />}
    </ParameterSheet>
  );
}

function CambioCortinaParametersView({ parameters, selectedModel, onUpdate, onReset }: CambioCortinaProps) {
  return (
    <ParameterSheet
      model={selectedModel}
      kind="tela"
      description="Confección de tela sin estructura ni lacado."
      onReset={onReset}
      evidence="168 cortinas de 2025 y 2026 revisadas: la reserva de RPS coincide con la que calcula la web. En Cambio de cortina la salida medida ya es la de la tela, así que no se descuenta (Iván, 22/09/2026); un descuento puntual se pone con el candado de la tarjeta."
    >
      <ParameterBand number="01" title="Caída y paños" description="Regla estándar aplicada al alto medido y a la bamba.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Margen inferior tela (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Descuento inferior estándar (cm)" value={parameters.bottomDeductionCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ bottomDeductionCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
      </ParameterBand>
    </ParameterSheet>
  );
}

type CortinaProps = {
  parameters: CortinaParameters;
  selectedModel: SelectedModel;
  onUpdate: (patch: Partial<CortinaParameters>) => void;
  onReset: () => void;
};

function CortinaParametersView({ parameters, selectedModel, onUpdate, onReset }: CortinaProps) {
  const selena = selectedModel === 'SELENA';
  const curtainDevices: CortinaDevice[] = selena
    ? ['MAQ. INTERIOR']
    : ['MAQ. INTERIOR', 'MAQ. EXTERIOR', 'MOTOR'];
  const discountRows = [
    ['fabricWidthDiscounts', 'Frente de tela'],
    ['rollTubeDiscounts', 'Tubo de enrollamiento'],
    ['loadProfileDiscounts', 'Univers 280']
  ] as const;

  function updateDiscount(field: typeof discountRows[number][0], device: CortinaDevice, value: number) {
    onUpdate({ [field]: { ...parameters[field], [device]: value } });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      description={selena ? 'Sistema vertical con brazos Stor, confección de tela y reserva RPS.' : 'Reglas de estructura, confección de tela y reserva RPS.'}
      onReset={onReset}
      evidence={selena ? 'Pedido AR.26.03959 contrastado: frente 290, caída 160 y bamba integrada de 15 producen un corte de 278 × 230 cm y 6,9 ml. La caída suma 50 cm y la bamba integrada añade 5 cm de confección.' : '110 estructuras y 68 PDF de 2026 revisados. La variante Maxiscreem cambia únicamente el soporte y comparte estos descuentos con la Cortina normal; la caída estándar suma 45 cm.'}
    >
      <ParameterBand number="01" title="Límites y caída" description="Medidas estándar y margen inferior aplicado a la tela.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Altura máxima (cm)" value={parameters.standardMaxDrop} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxDrop: value })} />
          <NumberField label={selena ? 'Margen para recorrido vertical (cm)' : 'Margen inferior tela (cm)'} value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          {!selena && <NumberField label="Descuento inferior tela (cm)" value={parameters.bottomDeductionCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ bottomDeductionCm: value })} />}
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </ParameterBand>

      <ParameterBand number="02" title="Descuentos dimensionales" description="Centímetros descontados al frente según el accionamiento.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{curtainDevices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{discountRows.map(([field, label]) => <tr key={field}><td>{label}</td>{curtainDevices.map((device) => <td key={device}><input aria-label={`${selectedModel} ${label} ${device}`} type="number" min="0" step="0.1" value={parameters[field][device]} onChange={(event) => updateDiscount(field, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </ParameterBand>
    </ParameterSheet>
  );
}

type BoxProps = {
  parameters: BoxParameters;
  selectedModel: SelectedModel;
  onUpdate: (patch: Partial<BoxParameters>) => void;
  onReset: () => void;
};

type AmbarBoxProps = {
  parameters: AmbarBoxParameters;
  selectedModel: SelectedModel;
  onUpdate: (patch: Partial<AmbarBoxParameters>) => void;
  onReset: () => void;
};

function AmbarBoxParametersView({ parameters, selectedModel, onUpdate, onReset }: AmbarBoxProps) {
  const placementGroups: { code: AmbarPlacementGroup; label: string }[] = [
    { code: 'FRONTAL_TECHO', label: 'Frontal / techo' },
    { code: 'ENTRE_PAREDES', label: 'Entre paredes' }
  ];
  const ambarDevices: BoxDevice[] = ['MAQUINA', 'MOTOR'];
  const discountRows = [
    ['fabricWidthDiscounts', 'Frente de tela'],
    ['rollTubeDiscounts', 'Tubo de enrollamiento'],
    ['profileDiscounts', 'Kit de perfiles']
  ] as const;

  function updateDiscount(field: typeof discountRows[number][0], placement: AmbarPlacementGroup, device: BoxDevice, value: number) {
    onUpdate({
      [field]: {
        ...parameters[field],
        [placement]: { ...parameters[field][placement], [device]: value }
      }
    });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      description="Reglas de estructura, tela y reserva RPS."
      onReset={onReset}
      evidence="14 estructuras Ámbar Box de 2026 revisadas. Los descuentos de tela, tubo y perfiles coinciden; cuatro caídas modificadas quedan disponibles como excepción técnica."
    >
      <ParameterBand number="01" title="Límites y barras comerciales" description="Longitudes disponibles para los perfiles y tubos de la serie. La web selecciona la adecuada automáticamente.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          {parameters.profileStockLengths.map((length, index) => <NumberField key={`profile-${index}`} label={`Perfil comercial ${index + 1} (cm)`} value={length} min={1} step={100} onChange={(value) => value !== null && onUpdate({ profileStockLengths: parameters.profileStockLengths.map((item, current) => current === index ? value : item) })} />)}
          {parameters.rollStockLengths.map((length, index) => <NumberField key={`roll-${index}`} label={`Tubo comercial ${index + 1} (cm)`} value={length} min={1} step={100} onChange={(value) => value !== null && onUpdate({ rollStockLengths: parameters.rollStockLengths.map((item, current) => current === index ? value : item) })} />)}
          <SelectField label="Motor" value={parameters.motorPower} options={['15/17', '35/17']} onChange={(motorPower) => onUpdate({ motorPower })} />
        </div>
      </ParameterBand>

      <ParameterBand number="02" title="Geometría del paño" description="Diagonal de brazos, margen fijo y costuras entre paños.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Factor diagonal" value={parameters.fabricDropMultiplier} min={0.1} step={0.01} onChange={(value) => value !== null && onUpdate({ fabricDropMultiplier: value })} />
          <NumberField label="Margen fijo de paño (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Margen bajada vertical (cm)" value={parameters.verticalFabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ verticalFabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
        <ParameterNote>Estándar: salida × factor diagonal + margen fijo + bamba. Bajada vertical 170°: salida × 2 + margen vertical + bamba. La bamba de otro tejido se calcula aparte.</ParameterNote>
      </ParameterBand>

      <ParameterBand number="03" title="Descuentos dimensionales" description="Varían por colocación y dispositivo.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Colocación</th><th>Pieza</th>{ambarDevices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{placementGroups.flatMap(({ code, label }) => discountRows.map(([field, piece], index) => <tr key={`${code}-${field}`}><td>{index === 0 ? label : ''}</td><td>{piece}</td>{ambarDevices.map((device) => <td key={device}><input aria-label={`ÁMBAR ${label} ${piece} ${device}`} type="number" min="0" step="0.1" value={parameters[field][code][device]} onChange={(event) => updateDiscount(field, code, device, Number(event.target.value))} /></td>)}</tr>))}</tbody>
        </table></div>
      </ParameterBand>
    </ParameterSheet>
  );
}

function BoxParametersView({ parameters, selectedModel, onUpdate, onReset }: BoxProps) {
  const boxDevices: BoxDevice[] = ['MAQUINA', 'MOTOR'];
  const isPerla = selectedModel === 'PERLA BOX';
  const isCuarzo = selectedModel === 'CUARZO BOX';

  function updateMinimum(projection: number, device: BoxDevice, value: number) {
    onUpdate({
      minimumLineByProjection: parameters.minimumLineByProjection.map((row) => row.projection === projection
        ? { ...row, values: { ...row.values, [device]: value } }
        : row)
    });
  }

  function updateDiscount(field: 'profileDiscountCm' | 'rollDiscountCm' | 'fabricWidthDiscountCm' | 'protectorDiscountCm', device: BoxDevice, value: number) {
    onUpdate({ [field]: { ...parameters[field], [device]: value } });
  }

  function updatePower(projection: number, power: number) {
    onUpdate({
      motorPowerByProjection: parameters.motorPowerByProjection.map((row) => row.projection === projection
        ? { ...row, power }
        : row)
    });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      description={isPerla ? 'Reglas S-300, despiece Perla Box y reserva RPS.' : isCuarzo ? 'Reglas ST250, despiece Cuarzo Box y reserva RPS.' : 'Reglas ST400, despiece Coral Box y reserva RPS.'}
      onReset={onReset}
      evidence={isPerla
        ? 'Contrastado con 80 pedidos y 85 estructuras S-300 de 2026: las 340 medidas de tela, tubo, perfiles y protector son correctas.'
        : isCuarzo
          ? 'Contrastado con 7 estructuras Cuarzo Box de 2026: las 28 medidas de tela, tubo, perfiles y barra de carga son correctas.'
          : 'Contrastado con 18 pedidos y 21 estructuras Coral Box de 2026: las 84 medidas de tela, tubo, perfiles y protector son correctas.'}
    >
      <ParameterBand number="01" title="Límites y tela" description="Medidas generales, caída y cálculo de paños.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Margen de caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Margen base paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </ParameterBand>

      <ParameterBand number="02" title="Descuentos dimensionales" description="Centímetros descontados al frente según pieza y dispositivo.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{boxDevices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{([
            ['profileDiscountCm', 'Kit de perfiles'],
            ['rollDiscountCm', 'Tubo de enrollamiento'],
            ['fabricWidthDiscountCm', 'Frente de tela'],
            ['protectorDiscountCm', isCuarzo ? 'Barra de carga' : 'Protector de lona']
          ] as const).map(([field, label]) => <tr key={field}><td>{label}</td>{boxDevices.map((device) => <td key={device}><input aria-label={`${selectedModel} ${label} ${device}`} type="number" min="0" step="0.1" value={parameters[field][device]} onChange={(event) => updateDiscount(field, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </ParameterBand>

      <ParameterBand number="03" title="Líneas mínimas y motor" description="Frente mínimo y potencia SUNEA por salida.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Salida</th>{boxDevices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}<th>Potencia del motor</th></tr></thead>
          <tbody>{parameters.minimumLineByProjection.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{boxDevices.map((device) => <td key={device}><input aria-label={`${selectedModel} salida ${row.projection} ${device}`} type="number" min="1" value={row.values[device]} onChange={(event) => updateMinimum(row.projection, device, Number(event.target.value))} /></td>)}<td><input aria-label={`${selectedModel} motor salida ${row.projection}`} type="number" min="1" value={parameters.motorPowerByProjection.find((item) => item.projection === row.projection)?.power || ''} onChange={(event) => updatePower(row.projection, Number(event.target.value))} /></td></tr>)}</tbody>
        </table></div>
      </ParameterBand>
    </ParameterSheet>
  );
}

type AgataBoxProps = {
  parameters: AgataBoxParameters;
  selectedModel: SelectedModel;
  onUpdate: (patch: Partial<AgataBoxParameters>) => void;
  onReset: () => void;
};

function AgataBoxParametersView({ parameters, selectedModel, onUpdate, onReset }: AgataBoxProps) {
  const devices: AgataDevice[] = ['MAQUINA', 'MOTOR'];
  const variants: AgataRuleVariant[] = ['OPEN', 'SEMI', 'COFRE'];
  const discountRows: [keyof AgataPieceDiscounts, string][] = [
    ['fabric', 'Tela'], ['roll', 'Tubo de enrollamiento'], ['squareBar', 'Barra cuadrada'],
    ['loadBar', 'Barra de carga'], ['diffuser', 'Difusor'], ['lira', 'Lira'],
    ['protector', 'Protector lona'], ['enclosure', 'Cierre']
  ];

  function updateMaximum(arms: 2 | 3 | 4, value: number) {
    onUpdate({ maxWidthByArms: { ...parameters.maxWidthByArms, [arms]: value } });
  }

  function updateMinimum(projection: number, device: AgataDevice, arms: 2 | 3 | 4, value: number) {
    onUpdate({
      minimumLineByProjection: parameters.minimumLineByProjection.map((row) => row.projection === projection
        ? { ...row, values: { ...row.values, [device]: { ...row.values[device], [arms]: value } } }
        : row)
    });
  }

  function updateMotor(projection: number, arms: 2 | 3 | 4, value: number) {
    onUpdate({
      motorPowerByProjection: parameters.motorPowerByProjection.map((row) => row.projection === projection
        ? { ...row, values: { ...row.values, [arms]: value } }
        : row)
    });
  }

  function updateDiscount(variant: AgataRuleVariant, device: AgataDevice, piece: keyof AgataPieceDiscounts, value: number) {
    onUpdate({
      discounts: {
        ...parameters.discounts,
        [variant]: {
          ...parameters.discounts[variant],
          [device]: { ...parameters.discounts[variant][device], [piece]: value }
        }
      }
    });
  }

  return (
    <ParameterSheet
      model={selectedModel}
      description="Reglas para Open, Semiopen, Semiclose y Cofre."
      onReset={onReset}
      evidence="Ocho planteamientos Open, Semi y Cofre de 2025-2026 revisados: medidas, soportes y motores correctos."
    >
      <ParameterBand number="01" title="Límites, paño y soportes" description="Serie de hasta cuatro brazos con selección automática por frente.">
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          {([2, 3, 4] as const).map((arms) => <NumberField key={arms} label={`Máximo con ${arms} brazos (cm)`} value={parameters.maxWidthByArms[arms]} min={1} onChange={(value) => value !== null && updateMaximum(arms, value)} />)}
          <NumberField label="Margen de caída tela (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          <NumberField label="Inicio de soportes (cm)" value={parameters.supportBaseStartWidth} min={1} onChange={(value) => value !== null && onUpdate({ supportBaseStartWidth: value })} />
          <NumberField label="Paso entre soportes (cm)" value={parameters.supportBaseStepWidth} min={1} onChange={(value) => value !== null && onUpdate({ supportBaseStepWidth: value })} />
          <NumberField label="Stock perfiles (cm)" value={parameters.profileStockLength} min={1} onChange={(value) => value !== null && onUpdate({ profileStockLength: value })} />
        </div>
      </ParameterBand>

      <ParameterBand number="02" title="Líneas mínimas y motor" description="Frente mínimo por salida, dispositivo y número de brazos.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Salida</th>{devices.flatMap((device) => ([2, 3, 4] as const).map((arms) => <th key={`${device}-${arms}`}>{device === 'MAQUINA' ? 'Máq.' : 'Motor'} · {arms}B</th>))}{([2, 3, 4] as const).map((arms) => <th key={`motor-${arms}`}>Nm · {arms}B</th>)}</tr></thead>
          <tbody>{parameters.minimumLineByProjection.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{devices.flatMap((device) => ([2, 3, 4] as const).map((arms) => <td key={`${device}-${arms}`}><input aria-label={`ÁGATA mínimo ${row.projection} ${device} ${arms} brazos`} type="number" min="1" step="0.1" value={row.values[device][arms]} onChange={(event) => updateMinimum(row.projection, device, arms, Number(event.target.value))} /></td>))}{([2, 3, 4] as const).map((arms) => <td key={`power-${arms}`}><input aria-label={`ÁGATA motor ${row.projection} ${arms} brazos`} type="number" min="1" value={parameters.motorPowerByProjection.find((item) => item.projection === row.projection)?.values[arms] || ''} onChange={(event) => updateMotor(row.projection, arms, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </ParameterBand>

      <ParameterBand number="03" title="Descuentos dimensionales" description="Centímetros descontados al frente por variante y accionamiento.">
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Variante</th><th>Pieza</th>{devices.map((device) => <th key={device}>{deviceHeader(device)}</th>)}</tr></thead>
          <tbody>{variants.flatMap((variant) => discountRows.map(([piece, label], index) => <tr key={`${variant}-${piece}`}><td>{index === 0 ? variant : ''}</td><td>{label}</td>{devices.map((device) => <td key={device}><input aria-label={`ÁGATA ${variant} ${label} ${device}`} type="number" min="0" step="0.1" value={parameters.discounts[variant][device][piece]} onChange={(event) => updateDiscount(variant, device, piece, Number(event.target.value))} /></td>)}</tr>))}</tbody>
        </table></div>
      </ParameterBand>
    </ParameterSheet>
  );
}
