import React from 'react';
import type { MedidasCal } from '../../remolques/ganado/medidas.ts';
import { CampoNum, CampoSelect, CampoSiNo, PasoFormulario } from './Campos';

export const MEDIDAS_VACIAS: MedidasCal = {
  recto: 0, ancho: 0, frente: 0, diagonal: 0, alto: 0, altoFrente: 0,
  aguas: 0, aguasFrente: 0, radio: 0, fruncir: 5, pasoOllaos: 30,
  ventana: true, puerta: 'NINGUNA', laterales: [],
};

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
    <CampoSiNo name="ventanaCal" label="Ventana delantera" value={m.ventana} onChange={v => set('ventana', v)} />
    <CampoSelect name="puertaCal" label="Puerta lateral" value={m.puerta} opciones={[
      { value: 'NINGUNA', label: 'Sin puerta' }, { value: 'MFI', label: 'MFI' }, { value: 'MFD', label: 'MFD' },
    ]} onChange={v => set('puerta', v as MedidasCal['puerta'])} />
    <CampoNum name="diagonalOllaos" label="Ollaos por diagonal (0: por paso)" value={m.diagonalOllaos ?? 0} onChange={v => set('diagonalOllaos', v || undefined)} />
    <CampoNum name="frenteOllaos" label="Ollaos del frente (0: por paso)" value={m.frenteOllaos ?? 0} onChange={v => set('frenteOllaos', v || undefined)} />
    <label className="rem-campo rem-span-4"><span>Ollaos laterales desde atrás (separados por ;)</span>
      <input key={m.laterales.join(';')} name="ollaosCal" data-campo="medidasCal" autoComplete="off"
        defaultValue={m.laterales.map(x => x.toLocaleString('es-ES')).join('; ')} onBlur={e => {
          const v = e.target.value;
          set('laterales', v.trim() ? v.split(';').filter(x => x.trim()).map(x => Number(x.trim().replace(',', '.'))) : []);
        }} />
    </label>
    <p className="gan-dibujo-nota rem-span-4">Sin posiciones manuales, se reparten al paso indicado. Ventana estándar 50 × 35 si cabe; se adapta al espacio bajo la curva. Con puerta, el corte completo queda a mano hasta definir su confección.</p>
    {error && <p className="gan-aviso rem-span-4" role="alert">{error}</p>}
  </PasoFormulario>;
}
