import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ArzuaProParameters, Device, GaliciaParameters, RuleParameters } from '../types';
import { NumberField } from '../components/NumberField';
import { SelectField } from '../components/SelectField';

const tubes = ['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280'];
const devices: Device[] = ['MOTOR', 'MAQ. INTERIOR', 'MAQ. EXTERIOR'];
const discountGroups = ['widthDiscounts', 'rollTubeDiscounts', 'fabricWidthDiscounts'] as const;
type DiscountGroup = typeof discountGroups[number];
type SelectedModel = 'ARZUA PRO' | 'GALICIA';

type Props = {
  parameters: RuleParameters;
  onUpdateArzua: (patch: Partial<ArzuaProParameters>) => void;
  onUpdateGalicia: (patch: Partial<GaliciaParameters>) => void;
  onResetArzua: () => void;
  onResetGalicia: () => void;
};

export function ParametersView({ parameters, onUpdateArzua, onUpdateGalicia, onResetArzua, onResetGalicia }: Props) {
  const [selectedModel, setSelectedModel] = useState<SelectedModel>('ARZUA PRO');
  const current = selectedModel === 'ARZUA PRO' ? parameters.arzuaPro : parameters.galicia;
  const isGalicia = selectedModel === 'GALICIA';

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

  function updateArzuaStockLength(index: number, value: number | null) {
    if (value === null) return;
    onUpdateArzua({
      stockLengths: parameters.arzuaPro.stockLengths.map((currentValue, currentIndex) => (
        currentIndex === index ? value : currentValue
      ))
    });
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
        {(['ARZUA PRO', 'GALICIA'] as SelectedModel[]).map((model) => (
          <button key={model} type="button" className={selectedModel === model ? 'active' : ''} onClick={() => setSelectedModel(model)}>
            <span>{model}</span><small>{model === 'ARZUA PRO' ? 'PRO' : 'GAL'}</small>
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
        <div className="parameter-band-title"><span>01</span><div><h3>Selección automática</h3><p>{isGalicia ? 'El frente propone 2 o 3 brazos; los brazos determinan el motor.' : 'El destino propone el tubo; el frente determina la potencia del motor.'}</p></div></div>
        <div className="parameter-grid parameter-grid-3">
          <SelectField label="Particular" value={current.privateTube} options={tubes} onChange={(privateTube) => isGalicia ? onUpdateGalicia({ privateTube }) : onUpdateArzua({ privateTube })} />
          <SelectField label="Hostelería / empresa" value={current.businessTube} options={tubes} onChange={(businessTube) => isGalicia ? onUpdateGalicia({ businessTube }) : onUpdateArzua({ businessTube })} />
          {isGalicia ? (
            <NumberField label="3 brazos desde frente (cm)" value={parameters.galicia.armSwitchWidth} min={1} onChange={(armSwitchWidth) => armSwitchWidth !== null && onUpdateGalicia({ armSwitchWidth })} />
          ) : (
            <NumberField label="Motor 70 desde frente (cm)" value={parameters.arzuaPro.motor70WidthFrom} min={1} onChange={(motor70WidthFrom) => motor70WidthFrom !== null && onUpdateArzua({ motor70WidthFrom })} />
          )}
          <NumberField label={`Frente máximo ${selectedModel} (cm)`} value={current.standardMaxWidth} min={1} onChange={(standardMaxWidth) => standardMaxWidth !== null && (isGalicia ? onUpdateGalicia({ standardMaxWidth }) : onUpdateArzua({ standardMaxWidth }))} />
        </div>
        {isGalicia && <p className="parameter-note">Motor automático: 2 brazos = 55/17 · 3 brazos = 70/17.</p>}
      </div>

      {!isGalicia && (
        <div className="parameter-band">
          <div className="parameter-band-title"><span>02</span><div><h3>Tela y largos de stock</h3><p>Márgenes usados para calcular caída, paños y perfiles disponibles.</p></div></div>
          <div className="parameter-grid parameter-grid-3">
            <NumberField label="Margen de caída (cm)" value={parameters.arzuaPro.fabricDropAllowanceCm} min={0} step={0.5} onChange={(fabricDropAllowanceCm) => fabricDropAllowanceCm !== null && onUpdateArzua({ fabricDropAllowanceCm })} />
            <NumberField label="Costura entre paños (cm)" value={parameters.arzuaPro.seamAllowanceCm} min={0} step={0.1} onChange={(seamAllowanceCm) => seamAllowanceCm !== null && onUpdateArzua({ seamAllowanceCm })} />
            <NumberField label="Margen base de paño (cm)" value={parameters.arzuaPro.seamBaseCm} min={0} step={0.1} onChange={(seamBaseCm) => seamBaseCm !== null && onUpdateArzua({ seamBaseCm })} />
            {parameters.arzuaPro.stockLengths.map((stockLength, index) => (
              <NumberField key={index} label={`Largo de stock ${index + 1} (cm)`} value={stockLength} min={1} step={50} onChange={(value) => updateArzuaStockLength(index, value)} />
            ))}
          </div>
        </div>
      )}

      <div className="parameter-band">
        <div className="parameter-band-title"><span>{isGalicia ? '02' : '03'}</span><div><h3>Descuentos dimensionales</h3><p>Centímetros descontados al frente para cada pieza y para la tela.</p></div></div>
        <div className="discount-tables">
          {discountGroups.map((group) => (
            <div className="parameter-table-wrap" key={group}>
              <h4>{group === 'widthDiscounts' ? 'Tubo de carga' : group === 'rollTubeDiscounts' ? 'Tubo de enrollamiento' : 'Tela'}</h4>
              <table className="parameter-table"><thead><tr><th>Tubo</th>{devices.map((device) => <th key={device}>{device}</th>)}</tr></thead>
                <tbody>{tubes.map((tube) => <tr key={tube}><td>{tube.replace('TUBO DE CARGA ', '')}</td>{devices.map((device) => <td key={device}><input aria-label={`${selectedModel} ${group} ${tube} ${device}`} type="number" step="0.1" min="0" value={current[group][tube][device]} onChange={(event) => updateDiscount(group, tube, device, Number(event.target.value))} /></td>)}</tr>)}</tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      <div className="parameter-band">
        <div className="parameter-band-title"><span>{isGalicia ? '03' : '04'}</span><div><h3>Líneas mínimas</h3><p>Frente mínimo admisible para cada salida, dispositivo y número de brazos.</p></div></div>
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

      <aside className="rps-evidence"><strong>Contraste real</strong><span>{isGalicia ? 'AR2603298, AR2603289 y AR2603420: máquina/motor, 2/3 brazos, EVO 80/UNIVERS 280 y salida especial 350.' : '891 ARZUA revisados: 726 máquina, 165 motor, 395 EVO 80 y 406 UNIVERS 280.'}</span></aside>
    </section>
  );
}
