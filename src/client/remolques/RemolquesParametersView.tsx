import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { type CalcParams, type ClienteBaqueton } from '../../remolques/calc/params';
import { ParameterBand, ParameterSheet } from '../components/ParameterSheet';
import { NumberField } from '../components/NumberField';
import { TextField } from '../components/TextField';

const lonaFields = [
  ['demasiaAlto', 'Demasía de alto (cm)'], ['demasiaContornoNormal', 'Demasía de contorno normal (cm)'],
  ['demasiaContornoEnfundar', 'Demasía de contorno para enfundar (cm)'], ['demasiaLonaHecha', 'Demasía de lona hecha (cm)'],
  ['ajusteContornoBase', 'Ajuste de contorno base (cm)'], ['ajusteContornoCurva', 'Ajuste de contorno en curva (cm)']
] as const;
const baquetonFields = [
  ['baquetonDemasiaLargoCostura', 'Demasía de largo a costura (cm)'], ['baquetonDemasiaAnchoCostura', 'Demasía de ancho a costura (cm)'],
  ['baquetonDemasiaCostura', 'Demasía de costura (cm)'], ['baquetonDemasiaFinal', 'Demasía final (cm)']
] as const;
const clienteFields = [
  ['extraLargoCostura', 'Extra de largo a costura (cm)'], ['extraAnchoCostura', 'Extra de ancho a costura (cm)'],
  ['extraBaquetonLargoDelante', 'Extra de baquetón delante (cm)'], ['extraBaquetonLargoDetras', 'Extra de baquetón detrás (cm)'],
  ['extraLargoFinal', 'Extra de largo final (cm)'], ['extraAnchoFinal', 'Extra de ancho final (cm)'], ['extraBaquetonTrasero', 'Extra de baquetón trasero (cm)']
] as const;
const recogidaFields = [['delante', 'Delante (cm)'], ['atras', 'Detrás (cm)'], ['lateralSoloAtras', 'Extra lateral solo detrás (cm)'], ['lateralSoloDelante', 'Extra lateral solo delante (cm)']] as const;
const newCliente: ClienteBaqueton = { nombre: '', extraLargoCostura: 0, extraAnchoCostura: 0, extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0, extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0, observaciones: [] };
const numeric = (value: number) => Number.isFinite(value) ? value : null;

export function RemolquesParametersView({ parameters: p, onUpdate, onReset, disabled = false }: {
  parameters: CalcParams; onUpdate: (patch: Partial<CalcParams>) => void; onReset: () => void; disabled?: boolean;
}) {
  const scalarFields = (fields: ReadonlyArray<readonly [keyof CalcParams, string]>) => <div className="parameter-grid remolques-parameter-grid">
    {fields.map(([key, label]) => <NumberField key={key} label={label} value={numeric(p[key] as number)} step={0.5} onChange={(value) => onUpdate({ [key]: value ?? NaN })} />)}
  </div>;
  return <fieldset className="remolques-parameters" disabled={disabled}>
    <ParameterSheet model="Remolques" kind="remolques" description="Medidas en centímetros. Los cambios se aplican a todos los puestos al guardar con autor y motivo." onReset={onReset}>
      <ParameterBand number="01" title="Lona y contorno" description="Demasías y ajustes del cálculo de lona.">{scalarFields(lonaFields)}</ParameterBand>
      <ParameterBand number="02" title="Ollaos" description="Separación por defecto y posición del primer ollao.">
        {scalarFields([['pasoOllaosDefecto', 'Paso de ollaos por defecto (cm)'], ['primerOllao', 'Primer ollao (cm)']])}
      </ParameterBand>
      <ParameterBand number="03" title="Recogidas" description="Medidas por tipo de recogida. La entrada NO es necesaria para los pedidos sin recogida.">
        <div className="remolques-parameter-rows">
          {p.recogidas.map((row, i) => <section className="remolques-parameter-row bloque-3d-hundido" key={i} aria-label={`Recogida ${row.nombre || i + 1}`}>
            <div className="remolques-parameter-row-heading">
              {row.nombre === 'NO' ? <strong>NO</strong> : <TextField label="Nombre de recogida" value={row.nombre} onChange={(nombre) => onUpdate({ recogidas: p.recogidas.map((r, index) => index === i ? { ...r, nombre } : r) })} />}
              {row.nombre !== 'NO' && <button type="button" className="ghost-button" aria-label={`Quitar recogida ${row.nombre || i + 1}`} onClick={() => onUpdate({ recogidas: p.recogidas.filter((_, index) => index !== i) })}><Trash2 aria-hidden="true" />Quitar</button>}
            </div>
            <div className="parameter-grid remolques-parameter-grid">
              {recogidaFields.map(([key, label]) => <NumberField key={key} label={label} value={numeric(row[key])} step={0.5} onChange={(value) => onUpdate({ recogidas: p.recogidas.map((r, index) => index === i ? { ...r, [key]: value ?? NaN } : r) })} />)}
            </div>
            <label className="remolques-parameter-check"><input type="checkbox" checked={row.panoTraseroConAnchoDelante ?? false} onChange={(e) => onUpdate({ recogidas: p.recogidas.map((r, index) => index === i ? { ...r, panoTraseroConAnchoDelante: e.target.checked } : r) })} /><span>Paño trasero con el ancho de delante</span></label>
          </section>)}
          <button type="button" className="ghost-button" onClick={() => onUpdate({ recogidas: [...p.recogidas, { nombre: '', delante: 0, atras: 0, lateralSoloAtras: 0, lateralSoloDelante: 0, panoTraseroConAnchoDelante: false }] })}><Plus aria-hidden="true" />Añadir recogida</button>
        </div>
      </ParameterBand>
      <ParameterBand number="04" title="Baquetón" description="Demasías comunes para costura y medida final.">{scalarFields(baquetonFields)}</ParameterBand>
      <ParameterBand number="05" title="Clientes con baquetón" description="Extras por cliente y observaciones. GENERAL se aplica cuando no hay un cliente específico.">
        <div className="remolques-parameter-rows">
          {p.clientesBaqueton.map((row, i) => <section className="remolques-parameter-row bloque-3d-hundido" key={i} aria-label={`Cliente ${row.nombre || i + 1}`}>
            <div className="remolques-parameter-row-heading">
              {row.nombre === 'GENERAL' ? <strong>GENERAL</strong> : <TextField label="Nombre de cliente" value={row.nombre} onChange={(nombre) => onUpdate({ clientesBaqueton: p.clientesBaqueton.map((r, index) => index === i ? { ...r, nombre } : r) })} />}
              {row.nombre !== 'GENERAL' && <button type="button" className="ghost-button" aria-label={`Quitar cliente ${row.nombre || i + 1}`} onClick={() => onUpdate({ clientesBaqueton: p.clientesBaqueton.filter((_, index) => index !== i) })}><Trash2 aria-hidden="true" />Quitar</button>}
            </div>
            <div className="parameter-grid remolques-parameter-grid">
              {clienteFields.map(([key, label]) => <NumberField key={key} label={label} value={numeric(row[key])} step={0.5} onChange={(value) => onUpdate({ clientesBaqueton: p.clientesBaqueton.map((r, index) => index === i ? { ...r, [key]: value ?? NaN } : r) })} />)}
            </div>
            <label><span>Observaciones · una por línea</span><textarea rows={Math.max(2, row.observaciones.length)} value={row.observaciones.join('\n')} onChange={(e) => onUpdate({ clientesBaqueton: p.clientesBaqueton.map((r, index) => index === i ? { ...r, observaciones: e.target.value.split('\n') } : r) })} /></label>
          </section>)}
          <button type="button" className="ghost-button" onClick={() => onUpdate({ clientesBaqueton: [...p.clientesBaqueton, structuredClone(newCliente)] })}><Plus aria-hidden="true" />Añadir cliente</button>
        </div>
      </ParameterBand>
    </ParameterSheet>
  </fieldset>;
}
