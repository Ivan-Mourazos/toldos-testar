import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { AgataBoxParameters, AgataDevice, AgataPieceDiscounts, AgataRuleVariant, AmbarBoxParameters, AmbarPlacementGroup, ArzuaProParameters, BoxDevice, BoxParameters, CambioCortinaParameters, CortinaDevice, CortinaParameters, Device, FabricJobModel, FabricJobParameters, GaliciaParameters, MaxiscreemParameters, MaxiscreemVariantGroup, Monoblock350Device, Monoblock350Parameters, PuntoRectoParameters, RuleParameters, XacobeoParameters } from '../types';
import { NumberField } from '../components/NumberField';
import { SelectField } from '../components/SelectField';

const tubes = ['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280'];
const devices: Device[] = ['MOTOR', 'MAQ. INTERIOR', 'MAQ. EXTERIOR'];
const discountGroups = ['widthDiscounts', 'rollTubeDiscounts', 'fabricWidthDiscounts'] as const;
const discountLabels = {
  widthDiscounts: 'Tubo de carga',
  rollTubeDiscounts: 'Tubo de enrollamiento',
  fabricWidthDiscounts: 'Tela'
} as const;
type DiscountGroup = typeof discountGroups[number];
type SelectedModel = 'ARZUA PRO' | 'GALICIA' | 'XACOBEO' | 'PUNTO RECTO' | 'MONOBLOCK 350' | 'MAXISCREEM' | 'CORTINA' | 'CAMBIO CORTINA' | 'OTROS TELA' | 'AMBAR BOX' | 'AGATA BOX' | 'PERLA BOX' | 'CORAL BOX' | 'CUARZO BOX';

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
  onUpdateAmbarBox: (patch: Partial<AmbarBoxParameters>) => void;
  onResetAmbarBox: () => void;
  onUpdateAgataBox: (patch: Partial<AgataBoxParameters>) => void;
  onResetAgataBox: () => void;
  onUpdateFabricJobs: (patch: Partial<FabricJobParameters>) => void;
  onResetFabricJobs: () => void;
};

export function ParametersView({ parameters, onUpdateArzua, onUpdateGalicia, onResetArzua, onResetGalicia, onUpdatePerlaBox, onResetPerlaBox, onUpdateCoralBox, onResetCoralBox, onUpdateCuarzoBox, onResetCuarzoBox, onUpdateCortina, onResetCortina, onUpdateCambioCortina, onResetCambioCortina, onUpdateXacobeo, onResetXacobeo, onUpdatePuntoRecto, onResetPuntoRecto, onUpdateMonoblock350, onResetMonoblock350, onUpdateMaxiscreem, onResetMaxiscreem, onUpdateAmbarBox, onResetAmbarBox, onUpdateAgataBox, onResetAgataBox, onUpdateFabricJobs, onResetFabricJobs }: Props) {
  const [selectedModel, setSelectedModel] = useState<SelectedModel>('ARZUA PRO');
  const isGalicia = selectedModel === 'GALICIA';
  const isBox = selectedModel === 'CORAL BOX' || selectedModel === 'PERLA BOX' || selectedModel === 'CUARZO BOX';

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

  if (selectedModel === 'CAMBIO CORTINA') {
    return <CambioCortinaParametersView
      parameters={parameters.cambioCortina}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateCambioCortina}
      onReset={onResetCambioCortina}
    />;
  }

  if (selectedModel === 'OTROS TELA') {
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => (
          <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => setSelectedModel(model)}>
            <span>{model}</span><small>{modelShortName(model)}</small>
          </button>
        ))}
      </nav>

      <header className="parameters-heading">
        <div>
          <span className="section-kicker">Modelo en producción</span>
          <h2>{selectedModel}</h2>
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
        <div className="parameter-band-title"><span>02</span><div><h3>Tela y largos de stock</h3><p>Márgenes usados para calcular caída, paños y perfiles disponibles.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Margen de caída (cm)" value={current.fabricDropAllowanceCm} min={0} step={0.5} onChange={(fabricDropAllowanceCm) => fabricDropAllowanceCm !== null && (isGalicia ? onUpdateGalicia({ fabricDropAllowanceCm }) : onUpdateArzua({ fabricDropAllowanceCm }))} />
          <NumberField label="Costura entre paños (cm)" value={current.seamAllowanceCm} min={0} step={0.1} onChange={(seamAllowanceCm) => seamAllowanceCm !== null && (isGalicia ? onUpdateGalicia({ seamAllowanceCm }) : onUpdateArzua({ seamAllowanceCm }))} />
          <NumberField label="Margen base de paño (cm)" value={current.seamBaseCm} min={0} step={0.1} onChange={(seamBaseCm) => seamBaseCm !== null && (isGalicia ? onUpdateGalicia({ seamBaseCm }) : onUpdateArzua({ seamBaseCm }))} />
          {current.stockLengths.map((stockLength, index) => (
            <NumberField key={index} label={`Largo de stock ${index + 1} (cm)`} value={stockLength} min={1} step={50} onChange={(value) => updateStockLength(index, value)} />
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

const parameterModels: SelectedModel[] = ['ARZUA PRO', 'GALICIA', 'XACOBEO', 'PUNTO RECTO', 'MONOBLOCK 350', 'MAXISCREEM', 'CORTINA', 'CAMBIO CORTINA', 'OTROS TELA', 'AMBAR BOX', 'AGATA BOX', 'PERLA BOX', 'CORAL BOX', 'CUARZO BOX'];

function modelShortName(model: SelectedModel) {
  if (model === 'ARZUA PRO') return 'PRO';
  if (model === 'GALICIA') return 'GAL';
  if (model === 'XACOBEO') return 'XAC';
  if (model === 'PUNTO RECTO') return 'P.RECTO';
  if (model === 'MONOBLOCK 350') return 'MON.350';
  if (model === 'MAXISCREEM') return 'DIANA';
  if (model === 'CORTINA') return 'CORT';
  if (model === 'CAMBIO CORTINA') return 'C.CORT';
  if (model === 'OTROS TELA') return 'TELA';
  if (model === 'AMBAR BOX') return 'MICRO';
  if (model === 'AGATA BOX') return 'MODUL';
  if (model === 'PERLA BOX') return 'S300';
  if (model === 'CUARZO BOX') return 'ST250';
  return 'COR';
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => onSelectModel(model)}><span>{model}</span><small>{modelShortName(model)}</small></button>)}
      </nav>

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><h2>XACOBEO</h2><p>Reglas XAC, despiece ART250 y reserva RPS.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites y tela</h3><p>Frente máximo, caída y márgenes de confección.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Margen de caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Largo de stock ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => onSelectModel(model)}><span>{model}</span><small>{modelShortName(model)}</small></button>)}
      </nav>

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><h2>DIANA VERTICAL</h2><p>Reglas históricas MAXISCREEM: con o sin cofre y guiado por cable o varilla.</p></div>
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => onSelectModel(model)}><span>{model}</span><small>{modelShortName(model)}</small></button>)}
      </nav>

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><h2>MONOBLOCK 350</h2><p>Hoja MON.350, estructura Arzúa Monobloc y reserva RPS.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Tela y estructura</h3><p>Márgenes de confección, stock y reparto de soportes.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Margen caída tela (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Remate de bamba (cm)" value={parameters.valanceExtraCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ valanceExtraCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Stock P801 ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => onSelectModel(model)}><span>{model}</span><small>{modelShortName(model)}</small></button>)}
      </nav>

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><h2>PUNTO RECTO</h2><p>Reglas de la hoja PUNTO RECTO, despiece PRT07 y reserva RPS.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Estructura automática</h3><p>El frente selecciona P701 o P801 y exige el número mínimo de brazos.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="P801 y 3 brazos desde (cm)" value={parameters.armSwitchWidth} min={1} onChange={(value) => value !== null && onUpdate({ armSwitchWidth: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Largo de stock ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
        <p className="parameter-note">Hasta {parameters.armSwitchWidth} cm: P701 y mínimo 2 brazos. Por encima: P801 y mínimo 3 brazos. Se pueden indicar hasta 4 brazos.</p>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Geometría del paño</h3><p>La caída sigue la diagonal de los brazos y añade el margen fijo y la bambalina.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Factor diagonal" value={parameters.fabricDropMultiplier} min={0.1} step={0.01} onChange={(value) => value !== null && onUpdate({ fabricDropMultiplier: value })} />
          <NumberField label="Margen fijo de paño (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => onSelectModel(model)}><span>{model}</span><small>{modelShortName(model)}</small></button>)}
      </nav>
      <header className="parameters-heading">
        <div><span className="section-kicker">Trabajos sin estructura</span><h2>OTROS TRABAJOS DE TELA</h2><p>Cambio de tela, Enrollable, Bambalina y Cambio Antica.</p></div>
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => onSelectModel(model)}><span>{model}</span><small>{modelShortName(model)}</small></button>)}
      </nav>

      <header className="parameters-heading">
        <div><span className="section-kicker">Trabajo de tela</span><h2>CAMBIO CORTINA</h2><p>Confección de tela sin estructura ni lacado.</p></div>
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
  const curtainDevices: CortinaDevice[] = ['MAQ. INTERIOR', 'MAQ. EXTERIOR', 'MOTOR'];
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => onSelectModel(model)}><span>{model}</span><small>{modelShortName(model)}</small></button>)}
      </nav>

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><h2>CORTINA</h2><p>Reglas de estructura, confección de tela y reserva RPS.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites y caída</h3><p>Medidas estándar y margen inferior aplicado a la tela.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Altura máxima (cm)" value={parameters.standardMaxDrop} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxDrop: value })} />
          <NumberField label="Margen inferior tela (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Largo de stock ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Descuentos dimensionales</h3><p>Centímetros descontados al frente según el accionamiento.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Pieza</th>{curtainDevices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
          <tbody>{discountRows.map(([field, label]) => <tr key={field}><td>{label}</td>{curtainDevices.map((device) => <td key={device}><input aria-label={`CORTINA ${label} ${device}`} type="number" min="0" step="0.1" value={parameters[field][device]} onChange={(event) => updateDiscount(field, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>110 estructuras y 68 PDF de 2026 revisados. La caída estándar suma 45 cm; el descuento histórico de 18 cm queda como excepción individual porque no depende del cliente, ventana ni bamba.</span></aside>
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => onSelectModel(model)}><span>{model}</span><small>{modelShortName(model)}</small></button>)}
      </nav>

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><h2>ÁMBAR BOX</h2><p>Reglas MICROBOX 300, nombre comercial actual TGM Box L300.</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites y stock</h3><p>Serie estándar con brazos PRT07 y tubo P701.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo estándar (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          {parameters.profileStockLengths.map((length, index) => <NumberField key={`profile-${index}`} label={`Perfil stock ${index + 1} (cm)`} value={length} min={1} step={100} onChange={(value) => value !== null && onUpdate({ profileStockLengths: parameters.profileStockLengths.map((item, current) => current === index ? value : item) })} />)}
          {parameters.rollStockLengths.map((length, index) => <NumberField key={`roll-${index}`} label={`Tubo stock ${index + 1} (cm)`} value={length} min={1} step={100} onChange={(value) => value !== null && onUpdate({ rollStockLengths: parameters.rollStockLengths.map((item, current) => current === index ? value : item) })} />)}
          <SelectField label="Motor" value={parameters.motorPower} options={['15/17', '35/17']} onChange={(motorPower) => onUpdate({ motorPower })} />
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>02</span><div><h3>Geometría del paño</h3><p>Diagonal de brazos, margen fijo y costuras del Excel.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Factor diagonal" value={parameters.fabricDropMultiplier} min={0.1} step={0.01} onChange={(value) => value !== null && onUpdate({ fabricDropMultiplier: value })} />
          <NumberField label="Margen fijo de paño (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          <NumberField label="Margen base de paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
        </div>
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => onSelectModel(model)}><span>{model}</span><small>{modelShortName(model)}</small></button>)}
      </nav>

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><h2>{selectedModel}</h2><p>{isPerla ? 'Reglas S-300, despiece Perla Box y reserva RPS.' : isCuarzo ? 'Reglas ST250, despiece Cuarzo Box y reserva RPS.' : 'Reglas ST400, despiece Coral Box y reserva RPS.'}</p></div>
        <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar Excel</button>
      </header>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>01</span><div><h3>Límites y tela</h3><p>Medidas generales, caída y cálculo de paños.</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <NumberField label="Frente máximo (cm)" value={parameters.standardMaxWidth} min={1} onChange={(value) => value !== null && onUpdate({ standardMaxWidth: value })} />
          <NumberField label="Margen de caída (cm)" value={parameters.fabricDropAllowanceCm} min={0} step={0.5} onChange={(value) => value !== null && onUpdate({ fabricDropAllowanceCm: value })} />
          <NumberField label="Margen base paño (cm)" value={parameters.seamBaseCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamBaseCm: value })} />
          <NumberField label="Costura entre paños (cm)" value={parameters.seamAllowanceCm} min={0} step={0.1} onChange={(value) => value !== null && onUpdate({ seamAllowanceCm: value })} />
          {parameters.stockLengths.map((length, index) => <NumberField key={index} label={`Largo de stock ${index + 1} (cm)`} value={length} min={1} step={50} onChange={(value) => value !== null && onUpdate({ stockLengths: parameters.stockLengths.map((item, current) => current === index ? value : item) })} />)}
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
      <nav className="parameter-model-switch" aria-label="Modelo que se va a parametrizar">
        {parameterModels.map((model) => <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => onSelectModel(model)}><span>{model}</span><small>{modelShortName(model)}</small></button>)}
      </nav>

      <header className="parameters-heading">
        <div><span className="section-kicker">Modelo en producción</span><h2>ÁGATA BOX</h2><p>Reglas MODUL para Open, Semiopen, Semiclose y Cofre.</p></div>
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
