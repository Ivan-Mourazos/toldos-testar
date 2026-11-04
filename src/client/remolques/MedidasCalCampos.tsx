import React from 'react';
import { MEDIDAS_CAL_VACIAS, type MedidasCal } from '../../remolques/ganado/medidas.ts';
import { CampoNum, CampoSelect, CampoSiNo, PasoFormulario } from './Campos';

export const MEDIDAS_VACIAS = MEDIDAS_CAL_VACIAS;

const CAMPOS = [
  ['recto', 'Recto'], ['ancho', 'Ancho del cuerpo'], ['frente', 'Ancho del frente'], ['diagonal', 'Diagonal en planta'],
  ['alto', 'Alto lateral del cuerpo'], ['altoFrente', 'Alto lateral del frente'], ['aguas', 'Aguas del cuerpo'], ['aguasFrente', 'Aguas del frente'],
  ['radio', 'Radio exterior del arco'], ['fruncir', 'Añadido atrás para fruncir'], ['pasoOllaos', 'Paso de ollaos'],
] as const;

export function MedidasCalCampos({ value, error, onChange }: { value?: MedidasCal; error?: string; onChange: (m: MedidasCal) => void }) {
  const m = value ?? MEDIDAS_VACIAS;
  const set = <K extends keyof MedidasCal>(k: K, v: MedidasCal[K]) => onChange({ ...m, [k]: v });
  return <PasoFormulario titulo="Medidas de Cal (cm)" columnas={4}>
    <p className="gan-dibujo-nota rem-span-4">Altos hasta la intersección teórica del lateral y las aguas. Radio por el exterior del arco. El cálculo añade 1 cm de lona hecha a anchos, recto y diagonal.</p>
    {CAMPOS.map(([k, label]) => <CampoNum key={k} name={k} label={label} value={m[k]} onChange={v => set(k, v)} />)}
    <CampoSelect name="recogidaAtrasCal" label="Fruncido de atrás" value={m.recogidaAtras ?? ''} sinElegir="Según pedido"
      opciones={[{ value: 'CUERDA', label: 'Cuerda fruncida' }, { value: 'GOMA', label: 'Goma fruncida' }]}
      onChange={v => set('recogidaAtras', v as MedidasCal['recogidaAtras'])} />
    <CampoSiNo name="ventanaCal" label="Ventana delantera" value={m.ventana} onChange={v => set('ventana', v)} />
    <CampoSiNo name="refuerzoMfdCal" label="Refuerzo MFD de Cal" value={m.refuerzoMfd ?? false} onChange={v => set('refuerzoMfd', v)} />
    <CampoSelect name="puertaCal" label="Puerta lateral" value={m.puerta} opciones={[
      { value: 'NINGUNA', label: 'Sin puerta' }, { value: 'MFI', label: 'MFI' }, { value: 'MFD', label: 'MFD' },
    ]} onChange={v => set('puerta', v as MedidasCal['puerta'])} />
    {m.puerta !== 'NINGUNA' && <>
      <CampoSiNo name="puertaMorroCal" label="Puerta en diagonal del morro" value={Boolean(m.puertaMorro)}
        onChange={v => set('puertaMorro', v ? { separacionBorde: 4 } : undefined)} />
      {m.puertaMorro && <CampoNum name="separacionCremallerasCal" label="Cremalleras desde los extremos (cm)" value={m.puertaMorro.separacionBorde}
        onChange={v => set('puertaMorro', { separacionBorde: v })} />}
    </>}
    <CampoNum name="diagonalOllaos" label="Ollaos por diagonal (0: por paso)" value={m.diagonalOllaos ?? 0} onChange={v => set('diagonalOllaos', v || undefined)} />
    <CampoNum name="frenteOllaos" label="Ollaos del frente (0: por paso)" value={m.frenteOllaos ?? 0} onChange={v => set('frenteOllaos', v || undefined)} />
    <label className="rem-campo rem-span-4"><span>Ollaos laterales desde atrás (separados por ;)</span>
      <input key={m.laterales.join(';')} name="ollaosCal" data-campo="medidasCal" autoComplete="off"
        defaultValue={m.laterales.map(x => x.toLocaleString('es-ES')).join('; ')} onBlur={e => {
          const v = e.target.value;
          set('laterales', v.trim() ? v.split(';').filter(x => x.trim()).map(x => Number(x.trim().replace(',', '.'))) : []);
        }} />
    </label>
    <p className="gan-dibujo-nota rem-span-4">Sin posiciones manuales, se reparten al paso indicado. Ventana estándar 50 × 35 si cabe; se adapta al espacio bajo la curva. La puerta de la diagonal va integrada en el morro, sin solapas; las demás puertas necesitan definir su confección.</p>
    {error && <p className="gan-aviso rem-span-4" role="alert">{error}</p>}
  </PasoFormulario>;
}
