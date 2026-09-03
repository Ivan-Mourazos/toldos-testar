import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Calculator, Check, ChevronDown, Layers3, Package, RotateCcw, Ruler, Scissors } from 'lucide-react';
import type { AgataBoxParameters, AgataDevice, AgataPieceDiscounts, AgataRuleVariant, AmbarBoxParameters, AmbarPlacementGroup, ArzuaProParameters, BoxDevice, BoxParameters, CambioCortinaParameters, CortinaDevice, CortinaParameters, Device, ElectraMatrixSupport, ElectraParameters, FabricJobModel, FabricJobParameters, GaliciaParameters, MaxiscreemParameters, MaxiscreemVariantGroup, Monoblock350Device, Monoblock350Parameters, PuntoRectoParameters, RuleParameters, XacobeoParameters } from '../types';
import { NumberField } from '../components/NumberField';
import { SelectField } from '../components/SelectField';
import { controlLabel, legacyModelName } from '../components/controlLabels';
import { arzuaProManualSpec } from '../../domain/arzuaProConstants.js';

const tubes = ['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280'];
const devices: Device[] = ['MOTOR', 'MAQ. INTERIOR', 'MAQ. EXTERIOR'];
const discountGroups = ['widthDiscounts', 'rollTubeDiscounts', 'fabricWidthDiscounts'] as const;
const discountLabels = {
  widthDiscounts: 'Tubo de carga',
  rollTubeDiscounts: 'Tubo de enrollamiento',
  fabricWidthDiscounts: 'Tela'
} as const;
type DiscountGroup = typeof discountGroups[number];
type SelectedModel = 'ARZUA PRO' | 'GALICIA' | 'XACOBEO' | 'PUNTO RECTO' | 'MONOBLOCK 350' | 'MAXISCREEM' | 'ELECTRA' | 'CORTINA' | 'SELENA' | 'CAMBIO CORTINA' | FabricJobModel | 'HERA' | 'ANTICA' | 'AMBAR BOX' | 'AGATA BOX' | 'PERLA BOX' | 'CORAL BOX' | 'CUARZO BOX';

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
};

export function ParametersView({ parameters, onUpdateArzua, onUpdateGalicia, onResetArzua, onResetGalicia, onUpdatePerlaBox, onResetPerlaBox, onUpdateCoralBox, onResetCoralBox, onUpdateCuarzoBox, onResetCuarzoBox, onUpdateCortina, onResetCortina, onUpdateSelena, onResetSelena, onUpdateCambioCortina, onResetCambioCortina, onUpdateXacobeo, onResetXacobeo, onUpdatePuntoRecto, onResetPuntoRecto, onUpdateMonoblock350, onResetMonoblock350, onUpdateMaxiscreem, onResetMaxiscreem, onUpdateElectra, onResetElectra, onUpdateAmbarBox, onResetAmbarBox, onUpdateAgataBox, onResetAgataBox, onUpdateFabricJobs, onResetFabricJobs }: Props) {
  const [selectedModel, setSelectedModel] = useState<SelectedModel>('ARZUA PRO');
  const isGalicia = selectedModel === 'GALICIA';
  const isBox = selectedModel === 'CORAL BOX' || selectedModel === 'PERLA BOX' || selectedModel === 'CUARZO BOX';

  if (selectedModel === 'HERA' || selectedModel === 'ANTICA') {
    return <OrderConfiguredModelView selectedModel={selectedModel} onSelectModel={setSelectedModel} />;
  }

  if (selectedModel === 'XACOBEO') {
    return <XacobeoParametersView
      parameters={parameters.xacobeo}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateXacobeo}
      onReset={onResetXacobeo}
    />;
  }

  if (selectedModel === 'PUNTO RECTO') {
    return <PuntoRectoParametersView
      parameters={parameters.puntoRecto}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdatePuntoRecto}
      onReset={onResetPuntoRecto}
    />;
  }

  if (selectedModel === 'MONOBLOCK 350') {
    return <Monoblock350ParametersView
      parameters={parameters.monoblock350}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateMonoblock350}
      onReset={onResetMonoblock350}
    />;
  }

  if (selectedModel === 'MAXISCREEM') {
    return <MaxiscreemParametersView
      parameters={parameters.maxiscreem}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateMaxiscreem}
      onReset={onResetMaxiscreem}
    />;
  }

  if (selectedModel === 'ELECTRA') {
    return <ElectraParametersView
      parameters={parameters.electra}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateElectra}
      onReset={onResetElectra}
    />;
  }

  if (selectedModel === 'AMBAR BOX') {
    return <AmbarBoxParametersView
      parameters={parameters.ambarBox}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateAmbarBox}
      onReset={onResetAmbarBox}
    />;
  }

  if (selectedModel === 'AGATA BOX') {
    return <AgataBoxParametersView
      parameters={parameters.agataBox}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateAgataBox}
      onReset={onResetAgataBox}
    />;
  }

  if (selectedModel === 'CORTINA') {
    return <CortinaParametersView
      parameters={parameters.cortina}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateCortina}
      onReset={onResetCortina}
    />;
  }

  if (selectedModel === 'SELENA') {
    return <CortinaParametersView
      parameters={parameters.selena}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateSelena}
      onReset={onResetSelena}
    />;
  }

  if (selectedModel === 'CAMBIO CORTINA') {
    return <CambioCortinaParametersView
      parameters={parameters.cambioCortina}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateCambioCortina}
      onReset={onResetCambioCortina}
    />;
  }

  if (fabricParameterModels.has(selectedModel as FabricJobModel)) {
    return <FabricJobsParametersView
      parameters={parameters.fabricJobs}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateFabricJobs}
      onReset={onResetFabricJobs}
    />;
  }

  if (isBox) {
    const isPerla = selectedModel === 'PERLA BOX';
    const isCuarzo = selectedModel === 'CUARZO BOX';
    return <BoxParametersView
      parameters={isPerla ? parameters.perlaBox : isCuarzo ? parameters.cuarzoBox : parameters.coralBox}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={isPerla ? onUpdatePerlaBox : isCuarzo ? onUpdateCuarzoBox : onUpdateCoralBox}
      onReset={isPerla ? onResetPerlaBox : isCuarzo ? onResetCuarzoBox : onResetCoralBox}
    />;
  }

  if (selectedModel === 'ARZUA PRO') {
    return <ArzuaParametersView
      parameters={parameters.arzuaPro}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateArzua}
      onReset={onResetArzua}
    />;
  }

  const current = isGalicia ? parameters.galicia : parameters.arzuaPro;

  function updateDiscount(group: DiscountGroup, tube: string, device: Device, value: number) {
    const matrix = {
      ...current[group],
      [tube]: { ...current[group][tube], [device]: value }
    };
    if (isGalicia) onUpdateGalicia({ [group]: matrix } as Partial<GaliciaParameters>);
    else onUpdateArzua({ [group]: matrix } as Partial<ArzuaProParameters>);
  }

  function updateArzuaMinimum(arm: number, device: Device, value: number) {
    onUpdateArzua({
      minimumLineByArm: parameters.arzuaPro.minimumLineByArm.map((row) => row.arm === arm
        ? { ...row, values: { ...row.values, [device]: value } }
        : row)
    });
  }

  function updateStockLength(index: number, value: number | null) {
    if (value === null) return;
    const stockLengths = current.stockLengths.map((currentValue, currentIndex) => (
        currentIndex === index ? value : currentValue
    ));
    if (isGalicia) onUpdateGalicia({ stockLengths });
    else onUpdateArzua({ stockLengths });
  }

  function updateGaliciaMinimum(projection: number, arms: 2 | 3, device: Device, value: number) {
    onUpdateGalicia({
      minimumLineByProjection: parameters.galicia.minimumLineByProjection.map((row) => row.projection === projection
        ? { ...row, values: { ...row.values, [arms]: { ...row.values[arms], [device]: value } } }
        : row)
    });
  }

  return (
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />

      <header className="parameters-heading">
        <div>
          <span className="section-kicker">Modelo en producción</span>
          <ParameterModelTitle model={selectedModel} />
          <p>Reglas aplicadas en tiempo real al formulario, estructura, tela y reserva RPS.</p>
        </div>
        <button className="ghost-button" type="button" onClick={isGalicia ? onResetGalicia : onResetArzua}>
          <RotateCcw aria-hidden="true" />Restaurar Excel
        </button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Selección automática</h3><p>{isGalicia ? 'El frente propone 2 o 3 brazos; los brazos determinan el motor.' : 'El frente determina la potencia del motor.'} El tubo se elige directamente en cada toldo.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          {isGalicia ? (
            <NumberField label="3 brazos desde frente (cm)" value={parameters.galicia.armSwitchWidth} min={1} onChange={(armSwitchWidth) => armSwitchWidth !== null && onUpdateGalicia({ armSwitchWidth })} />
          ) : (
            <NumberField label="Motor 70 desde frente (cm)" value={parameters.arzuaPro.motor70WidthFrom} min={1} onChange={(motor70WidthFrom) => motor70WidthFrom !== null && onUpdateArzua({ motor70WidthFrom })} />
          )}
          <NumberField label={`Frente máximo ${selectedModel} (cm)`} value={current.standardMaxWidth} min={1} onChange={(standardMaxWidth) => standardMaxWidth !== null && (isGalicia ? onUpdateGalicia({ standardMaxWidth }) : onUpdateArzua({ standardMaxWidth }))} />
        </div>
        {isGalicia && <p className="parameter-note">Motor automático: 2 brazos = 55/17 · 3 brazos = 70/17.</p>}
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Tela y barras comerciales</h3><p>Márgenes de confección y longitudes disponibles en almacén. La web elige la barra automáticamente.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Margen de caída (cm)" value={current.fabricDropAllowanceCm} min={0} step={0.5} onChange={(fabricDropAllowanceCm) => fabricDropAllowanceCm !== null && (isGalicia ? onUpdateGalicia({ fabricDropAllowanceCm }) : onUpdateArzua({ fabricDropAllowanceCm }))} />
          <NumberField label="Costura entre paños (cm)" value={current.seamAllowanceCm} min={0} step={0.1} onChange={(seamAllowanceCm) => seamAllowanceCm !== null && (isGalicia ? onUpdateGalicia({ seamAllowanceCm }) : onUpdateArzua({ seamAllowanceCm }))} />
          <NumberField label="Margen base de paño (cm)" value={current.seamBaseCm} min={0} step={0.1} onChange={(seamBaseCm) => seamBaseCm !== null && (isGalicia ? onUpdateGalicia({ seamBaseCm }) : onUpdateArzua({ seamBaseCm }))} />
          {current.stockLengths.map((stockLength, index) => (
            <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={stockLength} min={1} step={50} onChange={(value) => updateStockLength(index, value)} />
          ))}
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Descuentos dimensionales</h3><p>Centímetros descontados al frente para cada pieza y para la tela.</p></div></div>
        <div className="parameter-table-wrap discount-table-wrap">
          <table className="parameter-table parameter-table-discounts">
            <thead><tr><th>Pieza</th><th>Tubo</th>{devices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
            <tbody>{discountGroups.flatMap((group) => tubes.map((tube, tubeIndex) => (
              <tr key={`${group}-${tube}`}>
                {tubeIndex === 0 && <td className="discount-part" rowSpan={tubes.length}>{discountLabels[group]}</td>}
                <td>{tube.replace('TUBO DE CARGA ', '')}</td>
                {devices.map((device) => <td key={device}><input aria-label={`${selectedModel} ${group} ${tube} ${device}`} type="number" step="0.1" min="0" value={current[group][tube][device]} onChange={(event) => updateDiscount(group, tube, device, Number(event.target.value))} /></td>)}
              </tr>
            )))}</tbody>
          </table>
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>04</span><div><h3>Líneas mínimas</h3><p>Frente mínimo admisible para cada salida, dispositivo y número de brazos.</p></div></div>
        <div className="parameter-table-wrap">
          {isGalicia ? (
            <table className="parameter-table parameter-table-lines galicia-lines">
              <thead><tr><th rowSpan={2}>Salida</th><th colSpan={3}>2 brazos</th><th colSpan={3}>3 brazos</th></tr><tr>{[2, 3].flatMap((arms) => devices.map((device) => <th key={`${arms}-${device}`}>{device}</th>))}</tr></thead>
              <tbody>{parameters.galicia.minimumLineByProjection.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{([2, 3] as const).flatMap((arms) => devices.map((device) => <td key={`${arms}-${device}`}><input aria-label={`GALICIA salida ${row.projection} ${arms} brazos ${device}`} type="number" step="0.1" min="1" value={row.values[arms][device]} onChange={(event) => updateGaliciaMinimum(row.projection, arms, device, Number(event.target.value))} /></td>))}</tr>)}</tbody>
            </table>
          ) : (
            <table className="parameter-table parameter-table-lines"><thead><tr><th>Salida</th>{devices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
              <tbody>{parameters.arzuaPro.minimumLineByArm.map((row) => <tr key={row.arm}><td className="num">{row.arm}</td>{devices.map((device) => <td key={device}><input aria-label={`ARZUA salida ${row.arm} ${device}`} type="number" min="1" value={row.values[device]} onChange={(event) => updateArzuaMinimum(row.arm, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
            </table>
          )}
        </div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>{isGalicia ? '49 estructuras Galicia de 2026 revisadas: 43 casos estándar coinciden en medidas y 6 quedan como excepción técnica por superar 700 cm.' : '891 ARZUA revisados: 726 máquina, 165 motor, 395 EVO 80 y 406 UNIVERS 280.'}</span></aside>
    </section>
  );
}

const fabricParameterModels = new Set<FabricJobModel>(['CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA']);

const parameterModels: SelectedModel[] = [
  'ARZUA PRO', 'GALICIA', 'XACOBEO', 'PUNTO RECTO', 'MONOBLOCK 350', 'MAXISCREEM', 'ELECTRA', 'HERA', 'ANTICA',
  'CORTINA', 'SELENA', 'CAMBIO CORTINA', 'CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA',
  'AMBAR BOX', 'AGATA BOX', 'PERLA BOX', 'CORAL BOX', 'CUARZO BOX'
];

function parameterModelName(model: SelectedModel) {
  return { current: controlLabel(model), legacy: legacyModelName(model) || controlLabel(model) };
}

function ParameterModelTitle({ model }: { model: SelectedModel }) {
  const names = parameterModelName(model);
  return <h2>{names.current}<small>RPS · {names.legacy}</small></h2>;
}

type ArzuaParametersProps = {
  parameters: ArzuaProParameters;
  selectedModel: 'ARZUA PRO';
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<ArzuaProParameters>) => void;
  onReset: () => void;
};

const arzuaDeviceLabels: Record<Device, string> = {
  MOTOR: 'Motor',
  'MAQ. INTERIOR': 'Máquina dentro',
  'MAQ. EXTERIOR': 'Máquina fuera'
};

const arzuaDiscountGroups: DiscountGroup[] = ['fabricWidthDiscounts', 'rollTubeDiscounts', 'widthDiscounts'];

const arzuaDiscountCopy: Record<DiscountGroup, { title: string; help: string; source: string }> = {
  fabricWidthDiscounts: {
    title: 'Tela',
    help: 'Ancho que se corta de la lona.',
    source: 'Manual Llaza'
  },
  rollTubeDiscounts: {
    title: 'Tubo de enrollar',
    help: 'Tubo redondo donde se recoge la tela.',
    source: 'Manual Llaza'
  },
  widthDiscounts: {
    title: 'Barra delantera',
    help: 'Perfil que cierra el toldo por delante.',
    source: 'Manual Llaza'
  }
};

const parameterNumber = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

function ArzuaParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: ArzuaParametersProps) {
  const exampleFront = 400;
  const exampleDiscount = parameters.fabricWidthDiscounts[tubes[0]].MOTOR;
  const exampleFabric = exampleFront - exampleDiscount;

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
    <section className="parameters-page arzua-parameters">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading arzua-parameters-heading">
        <div>
          <span className="section-kicker">Manual revisado · modelo en producción</span>
          <ParameterModelTitle model={selectedModel} />
          <p>{arzuaProManualSpec.product} · fabricación e instalación rev. {arzuaProManualSpec.revision}</p>
        </div>
        <button className="ghost-button" type="button" onClick={onReset}>
          <RotateCcw aria-hidden="true" />Restaurar valores correctos
        </button>
      </header>

      <div className="arzua-source-strip" aria-label="Origen de los parámetros">
        <span className="parameter-source source-manual"><BookOpen aria-hidden="true" />Manual Llaza<small>Todos los límites y descuentos técnicos</small></span>
        <span className="parameter-source source-workshop"><Calculator aria-hidden="true" />Confección Testar<small>Solo lo que el manual no especifica</small></span>
        <span className="parameter-source source-stock"><Package aria-hidden="true" />Almacén<small>Barras disponibles y preferencias</small></span>
      </div>

      <section className="arzua-guide" aria-labelledby="arzua-guide-title">
        <header>
          <span>Antes de cambiar números</span>
          <h3 id="arzua-guide-title">La web hace tres cosas, siempre en este orden</h3>
          <p>Primero mira el toldo, después calcula lo que hay que cortar y al final comprueba que cabe.</p>
        </header>
        <ol className="arzua-guide-steps">
          <li><span>1</span><Ruler aria-hidden="true" /><div><strong>Mide</strong><small>Frente = ancho total. Salida = lo que abre el brazo.</small></div></li>
          <li><span>2</span><Scissors aria-hidden="true" /><div><strong>Resta</strong><small>Al frente le quita unos centímetros para obtener cada corte.</small></div></li>
          <li><span>3</span><Check aria-hidden="true" /><div><strong>Comprueba</strong><small>La salida necesita un frente mínimo. Si no llega, el toldo no es válido.</small></div></li>
        </ol>
        <div className="arzua-measure-rule" aria-label={`Ejemplo: ${exampleFront} menos ${exampleDiscount} es ${exampleFabric} centímetros de tela`}>
          <span>Ejemplo con motor y EVO 80</span>
          <strong><b>{exampleFront}</b><i>frente</i><em>−</em><b>{parameterNumber.format(exampleDiscount)}</b><i>descuento</i><em>=</em><b>{parameterNumber.format(exampleFabric)}</b><i>tela</i></strong>
        </div>
      </section>

      <div className="parameter-band arzua-parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Hasta dónde puede llegar</h3><p>Estos son los límites físicos que Llaza da para el COMPLET-PRO 350.</p></div></div>
        <div className="arzua-parameter-content">
          <div className="arzua-limit-grid">
            <article><small>Frente máximo</small><strong>{arzuaProManualSpec.maximumWidthCm}<span> cm</span></strong><p>Más ancho necesita una excepción técnica.</p></article>
            <article><small>Salida máxima</small><strong>{arzuaProManualSpec.maximumProjectionCm}<span> cm</span></strong><p>Es el brazo más largo admitido.</p></article>
            <article><small>Inclinación</small><strong>{arzuaProManualSpec.inclinationDegrees.min}–{arzuaProManualSpec.inclinationDegrees.max}<span>°</span></strong><p>Recorrido regulable del soporte.</p></article>
            <article><small>Tubo usado</small><strong>Ø{arzuaProManualSpec.rollingTubeDiameterMm}<span> mm</span></strong><p>Permite enrollar hasta 350 cm de salida.</p></article>
          </div>
          <div className="arzua-edit-grid arzua-edit-grid-2">
            <div className="arzua-input-card source-manual">
              <NumberField label="Frente máximo normal (cm)" value={parameters.standardMaxWidth} min={1} max={700} onChange={(standardMaxWidth) => standardMaxWidth !== null && onUpdate({ standardMaxWidth })} />
              <small>Llaza marca 600 cm. La opción “Modificar reglas” permite documentar una excepción.</small>
            </div>
            <aside className="arzua-plain-note"><BookOpen aria-hidden="true" /><div><strong>Qué significa</strong><span>Un toldo de 601 cm no debe pasar como uno normal aunque exista una barra de 650 o 700 cm en almacén.</span></div></aside>
          </div>
        </div>
      </div>

      <div className="parameter-band arzua-parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Qué elige la web sola</h3><p>Son atajos de Testar. El operario todavía puede cambiar tubo o motor en un toldo concreto.</p></div></div>
        <div className="arzua-parameter-content">
          <div className="arzua-edit-grid arzua-edit-grid-3">
            <div className="arzua-input-card source-stock">
              <SelectField label="Para un particular, proponer" value={parameters.privateTube} options={tubes} onChange={(privateTube) => onUpdate({ privateTube })} />
              <small>Solo lo propone; no lo bloquea.</small>
            </div>
            <div className="arzua-input-card source-stock">
              <SelectField label="Para empresa u hostelería, proponer" value={parameters.businessTube} options={tubes} onChange={(businessTube) => onUpdate({ businessTube })} />
              <small>Solo lo propone; no lo bloquea.</small>
            </div>
            <div className="arzua-input-card source-workshop">
              <NumberField label="Motor 70/17 solo en excepción desde (cm)" value={parameters.motor70WidthFrom} min={arzuaProManualSpec.maximumWidthCm + 1} onChange={(motor70WidthFrom) => motor70WidthFrom !== null && onUpdate({ motor70WidthFrom })} />
              <small>Llaza llega hasta 600 cm. Dentro del manual, el 55/17 cubre el máximo exigido de 50 Nm.</small>
            </div>
          </div>

          <div className="arzua-motor-summary">
            <div><span>Dentro del manual: hasta {arzuaProManualSpec.maximumWidthCm} cm</span><strong>Motor 55/17</strong></div>
            <ChevronDown aria-hidden="true" />
            <div><span>Fuera del manual: desde {parameters.motor70WidthFrom} cm</span><strong>Motor 70/17 por excepción</strong></div>
            <p>La web consulta la tabla Llaza para tubo Ø80. Como pide entre 30 y 50 Nm, el 55/17 sirve para todas las combinaciones estándar.</p>
          </div>

          <details className="arzua-reference-details">
            <summary>Ver la tabla de motor del manual Llaza (tubo Ø80)</summary>
            <p>Busca la salida a la izquierda y el frente arriba. El número de la casilla es el par mínimo en Nm. “—” significa que esa combinación es demasiado estrecha.</p>
            <div className="parameter-table-wrap">
              <table className="parameter-table arzua-motor-table">
                <thead><tr><th>Salida ↓ / frente →</th>{arzuaProManualSpec.motorTube80.widthsCm.map((width) => <th key={width}>{width}</th>)}</tr></thead>
                <tbody>{arzuaProManualSpec.motorTube80.rows.map((row) => <tr key={row.projectionCm}><td className="num">{row.projectionCm} cm</td>{row.torqueNm.map((torque, index) => <td key={arzuaProManualSpec.motorTube80.widthsCm[index]} className={torque === null ? 'is-impossible' : 'num'}>{torque ?? '—'}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </details>
        </div>
      </div>

      <div className="parameter-band arzua-parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Cuánta tela y qué barra</h3><p>Llaza no da aquí el largo de caída ni los márgenes de unión. Por eso esta parte usa las reglas internas de confección y el stock real.</p></div></div>
        <div className="arzua-parameter-content">
          <div className="arzua-fabric-recipes">
            <article><span>Si tela y bamba son iguales</span><strong>salida + {parameters.fabricDropAllowanceCm} + alto de bamba</strong></article>
            <article><span>Si la bamba lleva otra tela</span><strong>cuerpo: salida + {Math.max(0, parameters.fabricDropAllowanceCm - 5)} · bamba: alto + 5</strong></article>
          </div>
          <div className="arzua-edit-grid arzua-edit-grid-3">
            <div className="arzua-input-card source-workshop"><NumberField label="Tela extra en la caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(fabricDropAllowanceCm) => fabricDropAllowanceCm !== null && onUpdate({ fabricDropAllowanceCm })} /><small>Es el margen que se suma a la salida.</small></div>
            <div className="arzua-input-card source-workshop"><NumberField label="Solape entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(seamAllowanceCm) => seamAllowanceCm !== null && onUpdate({ seamAllowanceCm })} /><small>Se añade por cada unión entre paños.</small></div>
            <div className="arzua-input-card source-workshop"><NumberField label="Margen fijo de confección (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(seamBaseCm) => seamBaseCm !== null && onUpdate({ seamBaseCm })} /><small>Se añade una vez al cálculo del paño.</small></div>
          </div>
          <div className="arzua-stock-row">
            <div><Package aria-hidden="true" /><span><strong>Barras disponibles</strong><small>La web coge la primera que sea suficientemente larga.</small></span></div>
            <div className="arzua-stock-inputs">{parameters.stockLengths.map((stockLength, index) => <NumberField key={index} label={`Barra ${index + 1} (cm)`} value={stockLength} min={1} step={50} onChange={(value) => updateStockLength(index, value)} />)}</div>
          </div>
        </div>
      </div>

      <div className="parameter-band arzua-parameter-band">
        <div className="parameter-band-title"><span>04</span><div><h3>Lo que se resta al frente</h3><p>Lee cada casilla así: “frente menos este número”. Todo está en centímetros.</p></div></div>
        <div className="arzua-parameter-content">
          <div className="parameter-table-wrap discount-table-wrap">
            <table className="parameter-table parameter-table-discounts arzua-discount-table">
              <thead><tr><th>Qué cortamos</th>{devices.map((device) => <th key={device}>{arzuaDeviceLabels[device]}</th>)}</tr></thead>
              <tbody>{arzuaDiscountGroups.map((group) => {
                const copy = arzuaDiscountCopy[group];
                return <tr key={group}>
                  <td className="discount-part"><strong>{copy.title}</strong><small>{copy.help}</small><em>{copy.source}</em></td>
                  {devices.map((device) => <td key={device}><div className="arzua-table-input"><input aria-label={`ARZUA ${copy.title} ${arzuaDeviceLabels[device]}`} type="number" step="0.1" min="0" value={parameters[group][tubes[0]][device]} onChange={(event) => updateDiscount(group, device, Number(event.target.value))} /><span>cm</span></div></td>)}
                </tr>;
              })}</tbody>
            </table>
          </div>
          <aside className="arzua-manual-contrast">
            <BookOpen aria-hidden="true" />
            <div><strong>Estos valores salen literalmente del manual</strong><p>En el orden motor / máquina dentro / máquina fuera: tela 10,8 / 12,2 / 12,4 cm; tubo de enrollar 9,8 / 11,2 / 11,4 cm; barra delantera 9,8 / 10,2 / 10,4 cm. Son iguales con EVO 80 y UNIVERS 280.</p></div>
          </aside>
        </div>
      </div>

      <div className="parameter-band arzua-parameter-band">
        <div className="parameter-band-title"><span>05</span><div><h3>El frente mínimo para cada salida</h3><p>Cuanto más abre el toldo, más ancho necesita para que los brazos quepan cerrados.</p></div></div>
        <div className="arzua-parameter-content">
          <div className="arzua-minimum-example"><Ruler aria-hidden="true" /><span>Ejemplo: con salida 250, hacen falta <strong>295 cm</strong> con motor o máquina dentro, y <strong>300 cm</strong> con máquina fuera.</span></div>
          <div className="parameter-table-wrap">
            <table className="parameter-table parameter-table-lines arzua-minimum-table">
              <thead><tr><th>Si la salida es</th><th>Motor</th><th>Máquina dentro</th><th>Máquina fuera</th></tr></thead>
              <tbody>{parameters.minimumLineByArm.map((row) => <tr key={row.arm} className={row.arm >= 300 ? 'is-manual-correction' : ''}>
                <td className="num"><strong>{row.arm}</strong><span> cm</span>{row.arm >= 300 && <small>Corregido con Llaza</small>}</td>
                {(['MOTOR', 'MAQ. INTERIOR', 'MAQ. EXTERIOR'] as Device[]).map((device) => <td key={device}><div className="arzua-table-input"><input aria-label={`ARZUA salida ${row.arm} ${arzuaDeviceLabels[device]}`} type="number" min="1" value={row.values[device]} onChange={(event) => updateMinimum(row.arm, device, Number(event.target.value))} /><span>cm</span></div></td>)}
              </tr>)}</tbody>
            </table>
          </div>
          <aside className="arzua-correction-note"><Check aria-hidden="true" /><span><strong>Corrección aplicada:</strong> las salidas 300, 325 y 350 estaban mal copiadas en PRO.MIN. Ahora coinciden con la página 6 del manual Llaza.</span></aside>
        </div>
      </div>

      <aside className="rps-evidence arzua-evidence"><strong>El manual manda</strong><span>Los límites, pares de motor, descuentos y frentes mínimos salen de Llaza COMPLET-PRO 350 rev. 2.1. El Excel de Testar se usó únicamente para detectar diferencias antiguas; ya no redondea estos valores.</span></aside>
    </section>
  );
}

function OrderConfiguredModelView({ selectedModel, onSelectModel }: {
  selectedModel: 'HERA' | 'ANTICA';
  onSelectModel: (model: SelectedModel) => void;
}) {
  const hera = selectedModel === 'HERA';
  return (
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />
      <header className="parameters-heading">
        <div>
          <span className="section-kicker">Modelo en producción</span>
          <ParameterModelTitle model={selectedModel} />
          <p>{hera ? 'HERA 43 y HERA 56, con máquina o motor según variante.' : 'Configuraciones de soporte, tubo y contrapeso según el pedido.'}</p>
        </div>
      </header>
      <div className="parameter-band parameter-band-message">
        <div className="parameter-band-title"><span>01</span><div><h3>Configuración por pedido</h3><p>Este modelo no tiene valores globales que deban modificarse aquí.</p></div></div>
        <div className="parameter-model-information">
          <strong>{hera ? 'Variante, lado y acabados' : 'Soporte, medida y terminación'}</strong>
          <p>La web muestra y valida sus opciones directamente al añadir el toldo. Así cada unidad conserva la configuración que realmente corresponde, sin aplicar un ajuste general a otros pedidos.</p>
        </div>
      </div>
    </section>
  );
}

function ParameterModelSelector({ selectedModel, onSelectModel }: {
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedNames = parameterModelName(selectedModel);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="parameter-model-selector">
      <div className="parameter-model-picker" ref={pickerRef}>
        <span className="parameter-model-picker-label">Modelo del catálogo</span>
        <button
          className="parameter-model-trigger"
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="parameter-model-trigger-icon"><Layers3 aria-hidden="true" /></span>
          <span className="parameter-model-trigger-copy">
            <strong>{selectedNames.current}</strong>
            <small><span>RPS</span>{selectedNames.legacy}</small>
          </span>
          <ChevronDown className={open ? 'is-open' : ''} aria-hidden="true" />
        </button>
        {open && (
          <div className="parameter-model-menu" role="listbox" aria-label="Modelos configurables">
            <header><span>Modelos actuales</span><small>Debajo aparece su denominación anterior en RPS</small></header>
            <div className="parameter-model-options">
              {parameterModels.map((model) => {
                const names = parameterModelName(model);
                const active = model === selectedModel;
                return (
                  <button
                    key={model}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={active ? 'is-active' : ''}
                    onClick={() => { onSelectModel(model); setOpen(false); }}
                  >
                    <span><strong>{names.current}</strong><small><span>RPS</span>{names.legacy}</small></span>
                    {active && <Check aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <small>{parameterModels.length} modelos · nombre actual y denominación de RPS siempre visibles</small>
    </div>
  );
}

type XacobeoProps = {
  parameters: XacobeoParameters;
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<XacobeoParameters>) => void;
  onReset: () => void;
};

function XacobeoParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: XacobeoProps) {
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
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><ParameterModelTitle model={selectedModel} /><p>Reglas XAC, despiece ART250 y reserva RPS.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites, tela y largos comerciales</h3><p>Los largos comerciales son las barras disponibles en almacén; la web elige automáticamente la menor que permita cortar la pieza.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Margen de caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Descuentos dimensionales</h3><p>Centímetros descontados al frente según pieza y accionamiento.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{xacDevices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{discountRows.map(([field, label]) => <tr key={field}><td>{label}</td>{xacDevices.map((device) => <td key={device}><input aria-label={`XACOBEO ${label} ${device}`} type="number" min="0" step="0.1" value={parameters[field][device]} onChange={(event) => updateDiscount(field, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Líneas mínimas</h3><p>Frente mínimo por salida y tipo de accionamiento.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Salida</th>{xacDevices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{parameters.minimumLineByProjection.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{xacDevices.map((device) => <td key={device}><input aria-label={`XACOBEO salida ${row.projection} ${device}`} type="number" min="1" value={row.values[device]} onChange={(event) => updateMinimum(row.projection, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>13 estructuras Xacobeo completas de 2026 y un caso motorizado de 2025 revisados. Las 56 medidas contrastadas coinciden con XAC y las reservas RPS comprobables no presentan diferencias.</span></aside>
    </section>
  );
}

type MaxiscreemProps = {
  parameters: MaxiscreemParameters;
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<MaxiscreemParameters>) => void;
  onReset: () => void;
};

function MaxiscreemParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: MaxiscreemProps) {
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
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><ParameterModelTitle model={selectedModel} /><p>Con o sin cofre y guiado por cable o varilla.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites y confección</h3><p>Medidas máximas y márgenes usados en el paño vertical.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Caída máxima estándar (cm)" value={parameters.standardMaxDrop} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxDrop: value })} />
          <NumberField label="Margen de caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Remate de bamba (cm)" value={parameters.valanceExtraCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ valanceExtraCm: value })} />
          <NumberField label="Ajuste guía (cm)" value={parameters.guideDiscountCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ guideDiscountCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Largos de almacén</h3><p>La web elige automáticamente el primer largo que admite la pieza.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          {parameters.rollStockLengths.map((length, index) => <NumberField key={`roll-${index}`} label={`Stock P801 ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ rollStockLengths: parameters.rollStockLengths.map((item, current) => current === index ? value : item) })} />)}
          {parameters.profileStockLengths.map((length, index) => <NumberField key={`profile-${index}`} label={`Stock perfiles ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ profileStockLengths: parameters.profileStockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Descuentos dimensionales</h3><p>Valores distintos según haya cofre y según el accionamiento.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Configuración</th><th>Pieza</th>{devices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{groups.flatMap(({ code, label }) => discountRows.map(([field, piece], index) => <tr key={`${code}-${field}`}><td>{index === 0 ? label : ''}</td><td>{piece}</td>{devices.map((device) => <td key={device}><input aria-label={`MAXISCREEM ${label} ${piece} ${device}`} type="number" min="0" step="0.1" value={parameters.discounts[code][device][field]} onChange={(event) => updateDiscount(code, device, field, Number(event.target.value))} /></td>)}</tr>))}</tbody>
        </table></div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>Casos Diana/Maxiscreen de 2025 y 2026 revisados: cofre y sin cofre, máquina y motor. Tela, P801, perfiles, soportes y guías coinciden con los planteamientos disponibles.</span></aside>
    </section>
  );
}

type ElectraProps = {
  parameters: ElectraParameters;
  selectedModel: 'ELECTRA';
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<ElectraParameters>) => void;
  onReset: () => void;
};

function ElectraParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: ElectraProps) {
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
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading">
        <div><span className="section-kicker">Nuevo modelo · Elit Vertical</span><ParameterModelTitle model={selectedModel} /><p>Reglas por soporte, con o sin cofre y con o sin guía.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar fuentes</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites, confección y almacén</h3><p>El soporte es obligatorio en cada pedido. Las medidas superiores a 500 × 300 cm requieren excepción técnica.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Caída máxima estándar (cm)" value={parameters.standardMaxDrop} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxDrop: value })} />
          {devices.map((device) => <NumberField key={device} label={`Margen de caída · ${device} (cm)`} value={parameters.fabricDropAllowanceCm[device]} min={0} step={0.5} onChange={(value) => value !== null && updateAllowance(device, value)} />)}
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          {parameters.rollStockLengths.map((length, index) => <NumberField key={`roll-${index}`} label={`Stock P801 ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ rollStockLengths: parameters.rollStockLengths.map((item, current) => current === index ? value : item) })} />)}
          {parameters.profileStockLengths.map((length, index) => <NumberField key={`profile-${index}`} label={`Stock perfiles ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ profileStockLengths: parameters.profileStockLengths.map((item, current) => current === index ? value : item) })} />)}
          {parameters.guideStockLengths.map((length, index) => <NumberField key={`guide-${index}`} label={`Stock guías ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ guideStockLengths: parameters.guideStockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Descuentos según soporte</h3><p>Tabla del archivo “Descontos toldos Electra según soportes”. Todos los valores se descuentan en centímetros.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Soporte</th><th>Pieza</th>{devices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{supports.flatMap((support) => supportPieces.map(([field, label], index) => <tr key={`${support}-${field}`}><td>{index === 0 ? support : ''}</td><td>{label}</td>{devices.map((device) => <td key={device}><input aria-label={`ELECTRA ${support} ${label} ${device}`} type="number" min="0" step="0.1" value={parameters.supportDiscounts[support][device][field]} onChange={(event) => updateSupportDiscount(support, device, field, Number(event.target.value))} /></td>)}</tr>))}</tbody>
        </table></div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Configuración con cofre</h3><p>Descuentos recuperados de los planteamientos Electra con cofre que reutilizan la estructura MAXISCREEM.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{devices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{cofrePieces.map(([field, label]) => <tr key={field}><td>{label}</td>{devices.map((device) => <td key={device}><input aria-label={`ELECTRA cofre ${label} ${device}`} type="number" min="0" step="0.1" value={parameters.cofreDiscounts[device][field]} onChange={(event) => updateCofreDiscount(device, field, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>Archivo de descuentos por soporte y 37 líneas ELECTR de 2024–2026 revisadas. RPS usa ELECTRA; en documentación también aparece como ELIT VERTICAL.</span></aside>
    </section>
  );
}

type Monoblock350Props = {
  parameters: Monoblock350Parameters;
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<Monoblock350Parameters>) => void;
  onReset: () => void;
};

function Monoblock350ParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: Monoblock350Props) {
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
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><ParameterModelTitle model={selectedModel} /><p>Hoja MON.350, estructura Arzúa Monobloc y reserva RPS.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Tela y estructura</h3><p>Márgenes de confección, barras comerciales disponibles y reparto de soportes.</p></div></div>
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
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Descuentos dimensionales</h3><p>Centímetros descontados al frente por accionamiento.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{devices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{discountRows.map(([field, label]) => <tr key={field}><td>{label}</td>{devices.map((device) => <td key={device}><input aria-label={`MONOBLOCK ${label} ${device}`} type="number" min="0" step="0.1" value={parameters.discounts[device][field]} onChange={(event) => updateDiscount(device, field, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Rangos por salida y brazos</h3><p>Frentes mínimos, máximos y motor automático.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Salida</th>{[2, 3, 4].map((arms) => <th key={arms}>{arms} brazos · mín/máx · motor</th>)}</tr></thead>
          <tbody>{parameters.dimensionalRules.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{([2, 3, 4] as const).map((arms) => <td key={arms}><div className="parameter-inline-fields"><input aria-label={`MONOBLOCK ${row.projection} ${arms} mínimo`} type="number" min="1" value={row.values[arms].minimum} onChange={(event) => updateRule(row.projection, arms, 'minimum', Number(event.target.value))} /><input aria-label={`MONOBLOCK ${row.projection} ${arms} máximo`} type="number" min="1" value={row.values[arms].maximum} onChange={(event) => updateRule(row.projection, arms, 'maximum', Number(event.target.value))} /><input aria-label={`MONOBLOCK ${row.projection} ${arms} motor`} value={row.values[arms].motorPower} onChange={(event) => updateRule(row.projection, arms, 'motorPower', event.target.value)} /></div></td>)}</tr>)}</tbody>
        </table></div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>Diez planteamientos de 2026 revisados, con casos de 2, 3 y 4 brazos entre 287 y 972 cm. Medidas, soportes, P801, EVO 80, motores y tela contrastados con RPS.</span></aside>
    </section>
  );
}

type PuntoRectoProps = {
  parameters: PuntoRectoParameters;
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<PuntoRectoParameters>) => void;
  onReset: () => void;
};

function PuntoRectoParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: PuntoRectoProps) {
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
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><ParameterModelTitle model={selectedModel} /><p>Reglas de la hoja PUNTO RECTO, despiece PRT07 y reserva RPS.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Estructura automática</h3><p>El frente selecciona P701 o P801 y exige el número mínimo de brazos. Los largos comerciales son las barras disponibles en almacén.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="P801 y 3 brazos desde (cm)" value={parameters.armSwitchWidth} min={1} onChange={(value) => value !== null && onUpdate({ armSwitchWidth: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
        <p className="parameter-note">Hasta {parameters.armSwitchWidth} cm: P701 y mínimo 2 brazos. Por encima: P801 y mínimo 3 brazos. La web escoge la barra comercial más corta que admita el corte; este dato no se cubre en el pedido.</p>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Geometría del paño</h3><p>La caída sigue la diagonal de los brazos y añade el margen fijo y la bambalina.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Multiplicador de la salida" value={parameters.fabricDropMultiplier} min={0.1} step={0.01} onChange={(value) => value !== null && onUpdate({ fabricDropMultiplier: value })} />
          <NumberField label="Margen fijo de paño (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Margen bajada vertical (cm)" value={parameters.verticalFabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ verticalFabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
        <p className="parameter-note">Estándar: salida × multiplicador + margen fijo + bamba. Bajada vertical 170°: salida × 2 + margen vertical + bamba. La bamba de otro tejido se calcula aparte.</p>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Descuentos y motores</h3><p>Descuentos al frente y potencia automática según brazos.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{pointDevices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{discountRows.map(([field, label]) => <tr key={field}><td>{label}</td>{pointDevices.map((device) => <td key={device}><input aria-label={`PUNTO RECTO ${label} ${device}`} type="number" min="0" step="0.1" value={parameters[field][device]} onChange={(event) => updateDiscount(field, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
        <div className="parameter-grid parameter-grid-3">
          {([2, 3, 4] as const).map((arms) => <SelectField key={arms} label={`Motor con ${arms} brazos`} value={parameters.motorPowerByArm[arms]} options={['15/17', '35/17', '50/17']} onChange={(power) => updateMotorPower(arms, power)} />)}
        </div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>18 estructuras de 2026 y cinco casos históricos de máquina y motor revisados. Las excepciones de caída de paño quedan editables por toldo.</span></aside>
    </section>
  );
}

type CambioCortinaProps = {
  parameters: CambioCortinaParameters;
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<CambioCortinaParameters>) => void;
  onReset: () => void;
};

type FabricJobsProps = {
  parameters: FabricJobParameters;
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<FabricJobParameters>) => void;
  onReset: () => void;
};

function FabricJobsParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: FabricJobsProps) {
  const jobs: { model: FabricJobModel; label: string; note: string }[] = [
    { model: 'CAMBIO TELA', label: 'Cambio de tela', note: 'Margen del cuerpo' },
    { model: 'ENROLLABLE', label: 'Enrollable', note: 'Entrada de confección' },
    { model: 'BAMBALINA', label: 'Bambalina', note: 'La caída es alto + remate' },
    { model: 'CAMBIO ANTICA', label: 'Cambio Antica', note: 'Aumento con bamba' }
  ];
  function updateAllowance(model: FabricJobModel, value: number) {
    onUpdate({ dropAllowanceByModel: { ...parameters.dropAllowanceByModel, [model]: value } });
  }

  return (
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />
      <header className="parameters-heading">
        <div><span className="section-kicker">Trabajo sin estructura</span><ParameterModelTitle model={selectedModel} /><p>Comparte los márgenes comunes de confección; cada modelo conserva su caída propia.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>
      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Márgenes de confección</h3><p>Centímetros añadidos a la salida o altura indicada.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          {jobs.map((job) => <NumberField key={job.model} label={`${job.label} · ${job.note} (cm)`} value={parameters.dropAllowanceByModel[job.model]} min={0} step={0.5} onChange={(value) => value !== null && updateAllowance(job.model, value)} />)}
          <NumberField label="Antica con bamba en otra tela (cm)" value={parameters.anticaSeparateValanceAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ anticaSeparateValanceAllowanceCm: value })} />
          <NumberField label="Remate de bambalina (cm)" value={parameters.valanceExtraCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ valanceExtraCm: value })} />
        </div>
      </div>
      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Paños</h3><p>Costuras usadas para calcular el número de paños y los metros lineales.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
      </div>
      <aside className="rps-evidence"><strong>Origen Excel</strong><span>CAM. TELA +40 cm, ENROL. +25 cm, BAMBALINA +5 cm y CAM. ANTICA +25 cm; Antica usa +40 cm cuando la bamba va en otra tela. Esa bamba se reserva por separado.</span></aside>
    </section>
  );
}

function CambioCortinaParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: CambioCortinaProps) {
  return (
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading">
        <div><span className="section-kicker">Trabajo de tela</span><ParameterModelTitle model={selectedModel} /><p>Confección de tela sin estructura ni lacado.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Caída y paños</h3><p>Regla estándar aplicada al alto medido y a la bamba.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Margen inferior tela (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Descuento inferior estándar (cm)" value={parameters.bottomDeductionCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ bottomDeductionCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>34 paños de 2026 revisados: 26 aplican el descuento estándar de 18 cm y 8 lo anulan como ajuste técnico. RPS confirma las cantidades de lona reservadas por OF.</span></aside>
    </section>
  );
}

type CortinaProps = {
  parameters: CortinaParameters;
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<CortinaParameters>) => void;
  onReset: () => void;
};

function CortinaParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: CortinaProps) {
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
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><ParameterModelTitle model={selectedModel} /><p>{selena ? 'Sistema vertical con brazos Stor, confección de tela y reserva RPS.' : 'Reglas de estructura, confección de tela y reserva RPS.'}</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites y caída</h3><p>Medidas estándar y margen inferior aplicado a la tela.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Altura máxima (cm)" value={parameters.standardMaxDrop} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxDrop: value })} />
          <NumberField label={selena ? 'Margen para recorrido vertical (cm)' : 'Margen inferior tela (cm)'} value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Descuentos dimensionales</h3><p>Centímetros descontados al frente según el accionamiento.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{curtainDevices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{discountRows.map(([field, label]) => <tr key={field}><td>{label}</td>{curtainDevices.map((device) => <td key={device}><input aria-label={`${selectedModel} ${label} ${device}`} type="number" min="0" step="0.1" value={parameters[field][device]} onChange={(event) => updateDiscount(field, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>{selena ? 'Pedido AR.26.03959 y Excel original contrastados: frente 290, caída 160 y bamba integrada de 15 producen un corte de 278 × 230 cm y 6,9 ml. La caída suma 50 cm y la bamba integrada añade 5 cm de confección.' : '110 estructuras y 68 PDF de 2026 revisados. La variante Maxiscreem cambia únicamente el soporte y comparte estos descuentos con la Cortina normal; la caída estándar suma 45 cm.'}</span></aside>
    </section>
  );
}

type BoxProps = {
  parameters: BoxParameters;
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<BoxParameters>) => void;
  onReset: () => void;
};

type AmbarBoxProps = {
  parameters: AmbarBoxParameters;
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<AmbarBoxParameters>) => void;
  onReset: () => void;
};

function AmbarBoxParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: AmbarBoxProps) {
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
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><ParameterModelTitle model={selectedModel} /><p>Reglas de estructura, tela y reserva RPS.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites y barras comerciales</h3><p>Longitudes disponibles para los perfiles y tubos de la serie. La web selecciona la adecuada automáticamente.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          {parameters.profileStockLengths.map((length, index) => <NumberField key={`profile-${index}`} label={`Perfil comercial ${index + 1} (cm)`} value={length} min={1} step={100} onChange={(value) => value !== null && onUpdate({ profileStockLengths: parameters.profileStockLengths.map((item, current) => current === index ? value : item) })} />)}
          {parameters.rollStockLengths.map((length, index) => <NumberField key={`roll-${index}`} label={`Tubo comercial ${index + 1} (cm)`} value={length} min={1} step={100} onChange={(value) => value !== null && onUpdate({ rollStockLengths: parameters.rollStockLengths.map((item, current) => current === index ? value : item) })} />)}
          <SelectField label="Motor" value={parameters.motorPower} options={['15/17', '35/17']} onChange={(motorPower) => onUpdate({ motorPower })} />
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Geometría del paño</h3><p>Diagonal de brazos, margen fijo y costuras del Excel.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Factor diagonal" value={parameters.fabricDropMultiplier} min={0.1} step={0.01} onChange={(value) => value !== null && onUpdate({ fabricDropMultiplier: value })} />
          <NumberField label="Margen fijo de paño (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Margen bajada vertical (cm)" value={parameters.verticalFabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ verticalFabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
        <p className="parameter-note">Estándar: salida × factor diagonal + margen fijo + bamba. Bajada vertical 170°: salida × 2 + margen vertical + bamba. La bamba de otro tejido se calcula aparte.</p>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Descuentos dimensionales</h3><p>Varían por colocación y dispositivo.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Colocación</th><th>Pieza</th>{ambarDevices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{placementGroups.flatMap(({ code, label }) => discountRows.map(([field, piece], index) => <tr key={`${code}-${field}`}><td>{index === 0 ? label : ''}</td><td>{piece}</td>{ambarDevices.map((device) => <td key={device}><input aria-label={`ÁMBAR ${label} ${piece} ${device}`} type="number" min="0" step="0.1" value={parameters[field][code][device]} onChange={(event) => updateDiscount(field, code, device, Number(event.target.value))} /></td>)}</tr>))}</tbody>
        </table></div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>14 estructuras Ámbar Box de 2026 revisadas. Los descuentos de tela, tubo y perfiles coinciden; cuatro caídas modificadas quedan disponibles como excepción técnica.</span></aside>
    </section>
  );
}

function BoxParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: BoxProps) {
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
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><ParameterModelTitle model={selectedModel} /><p>{isPerla ? 'Reglas S-300, despiece Perla Box y reserva RPS.' : isCuarzo ? 'Reglas ST250, despiece Cuarzo Box y reserva RPS.' : 'Reglas ST400, despiece Coral Box y reserva RPS.'}</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites y tela</h3><p>Medidas generales, caída y cálculo de paños.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Margen de caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Margen base paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Barra comercial ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Descuentos dimensionales</h3><p>Centímetros descontados al frente según pieza y dispositivo.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{boxDevices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{([
            ['profileDiscountCm', 'Kit de perfiles'],
            ['rollDiscountCm', 'Tubo de enrollamiento'],
            ['fabricWidthDiscountCm', 'Frente de tela'],
            ['protectorDiscountCm', isCuarzo ? 'Barra de carga' : 'Protector de lona']
          ] as const).map(([field, label]) => <tr key={field}><td>{label}</td>{boxDevices.map((device) => <td key={device}><input aria-label={`${selectedModel} ${label} ${device}`} type="number" min="0" step="0.1" value={parameters[field][device]} onChange={(event) => updateDiscount(field, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Líneas mínimas y motor</h3><p>Frente mínimo y potencia SUNEA por salida.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Salida</th>{boxDevices.map((device) => <th key={device}>{device}</th>)}<th>Motor</th></tr></thead>
          <tbody>{parameters.minimumLineByProjection.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{boxDevices.map((device) => <td key={device}><input aria-label={`${selectedModel} salida ${row.projection} ${device}`} type="number" min="1" value={row.values[device]} onChange={(event) => updateMinimum(row.projection, device, Number(event.target.value))} /></td>)}<td><input aria-label={`${selectedModel} motor salida ${row.projection}`} type="number" min="1" value={parameters.motorPowerByProjection.find((item) => item.projection === row.projection)?.power || ''} onChange={(event) => updatePower(row.projection, Number(event.target.value))} /></td></tr>)}</tbody>
        </table></div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>{isPerla ? '80 pedidos y 85 estructuras S-300 de 2026 revisados. Las 340 medidas de tela, tubo, perfiles y protector coinciden con el Excel.' : isCuarzo ? '7 estructuras Cuarzo Box de 2026 revisadas. Las 28 medidas de tela, tubo, perfiles y barra de carga coinciden con el Excel.' : '18 pedidos y 21 estructuras Coral Box de 2026 revisados. Las 84 medidas de tela, tubo, perfiles y protector coinciden con el Excel.'}</span></aside>
    </section>
  );
}

type AgataBoxProps = {
  parameters: AgataBoxParameters;
  selectedModel: SelectedModel;
  onSelectModel: (model: SelectedModel) => void;
  onUpdate: (patch: Partial<AgataBoxParameters>) => void;
  onReset: () => void;
};

function AgataBoxParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: AgataBoxProps) {
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
    <section className="parameters-page">
      <ParameterModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><ParameterModelTitle model={selectedModel} /><p>Reglas para Open, Semiopen, Semiclose y Cofre.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites, paño y soportes</h3><p>Serie de hasta cuatro brazos con selección automática por frente.</p></div></div>
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
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Líneas mínimas y motor</h3><p>Frente mínimo por salida, dispositivo y número de brazos.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Salida</th>{devices.flatMap((device) => ([2, 3, 4] as const).map((arms) => <th key={`${device}-${arms}`}>{device === 'MAQUINA' ? 'Maq.' : 'Motor'} · {arms}B</th>))}{([2, 3, 4] as const).map((arms) => <th key={`motor-${arms}`}>Nm · {arms}B</th>)}</tr></thead>
          <tbody>{parameters.minimumLineByProjection.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{devices.flatMap((device) => ([2, 3, 4] as const).map((arms) => <td key={`${device}-${arms}`}><input aria-label={`ÁGATA mínimo ${row.projection} ${device} ${arms} brazos`} type="number" min="1" step="0.1" value={row.values[device][arms]} onChange={(event) => updateMinimum(row.projection, device, arms, Number(event.target.value))} /></td>))}{([2, 3, 4] as const).map((arms) => <td key={`power-${arms}`}><input aria-label={`ÁGATA motor ${row.projection} ${arms} brazos`} type="number" min="1" value={parameters.motorPowerByProjection.find((item) => item.projection === row.projection)?.values[arms] || ''} onChange={(event) => updateMotor(row.projection, arms, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Descuentos dimensionales</h3><p>Centímetros descontados al frente por variante y accionamiento.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Variante</th><th>Pieza</th>{devices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{variants.flatMap((variant) => discountRows.map(([piece, label], index) => <tr key={`${variant}-${piece}`}><td>{index === 0 ? variant : ''}</td><td>{label}</td>{devices.map((device) => <td key={device}><input aria-label={`ÁGATA ${variant} ${label} ${device}`} type="number" min="0" step="0.1" value={parameters.discounts[variant][device][piece]} onChange={(event) => updateDiscount(variant, device, piece, Number(event.target.value))} /></td>)}</tr>))}</tbody>
        </table></div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>Ocho planteamientos Open, Semi y Cofre de 2025-2026 revisados. Medidas, soportes y motores reproducen los Excel de producción.</span></aside>
    </section>
  );
}
