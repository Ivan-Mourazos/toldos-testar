import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ArzuaProParameters, BoxDevice, BoxParameters, CortinaDevice, CortinaParameters, Device, GaliciaParameters, RuleParameters } from '../types';
import { NumberField } from '../components/NumberField';

const tubes = ['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280'];
const devices: Device[] = ['MOTOR', 'MAQ. INTERIOR', 'MAQ. EXTERIOR'];
const discountGroups = ['widthDiscounts', 'rollTubeDiscounts', 'fabricWidthDiscounts'] as const;
const discountLabels = {
  widthDiscounts: 'Tubo de carga',
  rollTubeDiscounts: 'Tubo de enrollamiento',
  fabricWidthDiscounts: 'Tela'
} as const;
type DiscountGroup = typeof discountGroups[number];
type SelectedModel = 'ARZUA PRO' | 'GALICIA' | 'CORTINA' | 'PERLA BOX' | 'CORAL BOX';

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
  onUpdateCortina: (patch: Partial<CortinaParameters>) => void;
  onResetCortina: () => void;
};

export function ParametersView({ parameters, onUpdateArzua, onUpdateGalicia, onResetArzua, onResetGalicia, onUpdatePerlaBox, onResetPerlaBox, onUpdateCoralBox, onResetCoralBox, onUpdateCortina, onResetCortina }: Props) {
  const [selectedModel, setSelectedModel] = useState<SelectedModel>('ARZUA PRO');
  const isGalicia = selectedModel === 'GALICIA';
  const isBox = selectedModel === 'CORAL BOX' || selectedModel === 'PERLA BOX';

  if (selectedModel === 'CORTINA') {
    return <CortinaParametersView
      parameters={parameters.cortina}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={onUpdateCortina}
      onReset={onResetCortina}
    />;
  }

  if (isBox) {
    const isPerla = selectedModel === 'PERLA BOX';
    return <BoxParametersView
      parameters={isPerla ? parameters.perlaBox : parameters.coralBox}
      selectedModel={selectedModel}
      onSelectModel={setSelectedModel}
      onUpdate={isPerla ? onUpdatePerlaBox : onUpdateCoralBox}
      onReset={isPerla ? onResetPerlaBox : onResetCoralBox}
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

const parameterModels: SelectedModel[] = ['ARZUA PRO', 'GALICIA', 'CORTINA', 'PERLA BOX', 'CORAL BOX'];

function modelShortName(model: SelectedModel) {
  if (model === 'ARZUA PRO') return 'PRO';
  if (model === 'GALICIA') return 'GAL';
  if (model === 'CORTINA') return 'CORT';
  if (model === 'PERLA BOX') return 'S300';
  return 'COR';
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

function BoxParametersView({ parameters, selectedModel, onSelectModel, onUpdate, onReset }: BoxProps) {
  const boxDevices: BoxDevice[] = ['MAQUINA', 'MOTOR'];
  const isPerla = selectedModel === 'PERLA BOX';

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
        <div><span className="section-kicker">Modelo en producción</span><h2>{selectedModel}</h2><p>{isPerla ? 'Reglas S-300, despiece Perla Box y reserva RPS.' : 'Reglas ST400, despiece Coral Box y reserva RPS.'}</p></div>
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
            ['protectorDiscountCm', 'Protector de lona']
          ] as const).map(([field, label]) => <tr key={field}><td>{label}</td>{boxDevices.map((device) => <td key={device}><input aria-label={`${selectedModel} ${label} ${device}`} type="number" min="0" step="0.1" value={parameters[field][device]} onChange={(event) => updateDiscount(field, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
        </table></div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>03</span><div><h3>Líneas mínimas y motor</h3><p>Frente mínimo y potencia SUNEA por salida.</p></div></div>
        <div className="parameter-table-wrap"><table className="parameter-table parameter-table-lines"><thead><tr><th>Salida</th>{boxDevices.map((device) => <th key={device}>{device}</th>)}<th>Motor</th></tr></thead>
          <tbody>{parameters.minimumLineByProjection.map((row) => <tr key={row.projection}><td className="num">{row.projection}</td>{boxDevices.map((device) => <td key={device}><input aria-label={`${selectedModel} salida ${row.projection} ${device}`} type="number" min="1" value={row.values[device]} onChange={(event) => updateMinimum(row.projection, device, Number(event.target.value))} /></td>)}<td><input aria-label={`${selectedModel} motor salida ${row.projection}`} type="number" min="1" value={parameters.motorPowerByProjection.find((item) => item.projection === row.projection)?.power || ''} onChange={(event) => updatePower(row.projection, Number(event.target.value))} /></td></tr>)}</tbody>
        </table></div>
      </div>

      <aside className="rps-evidence"><strong>Contraste real</strong><span>{isPerla ? 'Excel S-300 verificado: salidas 150–300, referencias actuales Perla Box y descuentos específicos de cofre.' : 'Pedido AR2603009 contrastado con Excel ST400 y RPS: tres Coral Box, medidas, paños y referencias verificadas.'}</span></aside>
    </section>
  );
}
