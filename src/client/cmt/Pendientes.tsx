import { useId, useState } from 'react';
import { HERRAMIENTAS, type Herramienta } from '../../cmt/preparacion/tipos.ts';
import type { DecisionesPreparacion, Pendientes as DatosPendientes } from '../../cmt/preparacion/index.ts';
import { medidas, mm } from './conversion';

export const ETIQUETAS: Record<Herramienta, string> = {
  DISCO1: 'Disco 1', DISCO2: 'Disco 2', CUTTER: 'Cutter', ROTULADOR: 'Rotulador',
  taladro: 'Taladro', texto: 'Texto', NO_CORTAR: 'No cortar (solo en el plano)',
};

export const hayPendientes = (p: DatosPendientes) => Boolean(p.marcos?.length || p.cruces || p.capas?.length || p.solapes?.length);
export function completas(p: DatosPendientes, d: DecisionesPreparacion): boolean {
  return (!p.marcos?.length || (d.marco !== undefined && Boolean(p.marcos[d.marco])))
    && (!p.cruces || d.cruces === 'incluir' || d.cruces === 'excluir')
    && (p.capas ?? []).every(({ capa }) => HERRAMIENTAS.includes(d.capas?.[capa] as Herramienta))
    && (p.solapes ?? []).every(({ clave, capas }) => capas.some(c => c === d.solapes?.[clave]));
}

export function aplicarDecision(valor: DecisionesPreparacion, cambio: Partial<DecisionesPreparacion>): DecisionesPreparacion {
  const nuevo = { ...valor, ...cambio };
  if ('marco' in cambio) delete nuevo.cruces;
  if ('marco' in cambio || 'cruces' in cambio || 'capas' in cambio) delete nuevo.solapes;
  return nuevo;
}

type Borrador = Record<string, Herramienta | ''>;
export function borradorInicial(p: DatosPendientes, d: DecisionesPreparacion): Borrador {
  return Object.fromEntries((p.capas ?? []).flatMap(({ capa, sugerida }) => {
    const herramienta = d.capas && Object.hasOwn(d.capas, capa) ? d.capas[capa] : sugerida;
    return herramienta ? [[capa, herramienta]] : [];
  }));
}

export function confirmarCapas(p: DatosPendientes, valor: DecisionesPreparacion, borrador: Borrador) {
  const capas = new Map(Object.entries(valor.capas ?? {}));
  for (const { capa } of p.capas ?? []) {
    const herramienta = borrador[capa];
    if (!herramienta || !HERRAMIENTAS.includes(herramienta)) return null;
    capas.set(capa, herramienta);
  }
  return aplicarDecision(valor, { capas: Object.fromEntries(capas) });
}

const colores = ['transparent', '#e23336', '#d9b900', '#1ca23d', '#00a7ad', '#3263e5', '#c83abd', 'var(--text)', '#72757b', '#a8aaad'];
function colorAci(aci: number) {
  if (aci < 10) return colores[aci] ?? colores[0];
  if (aci >= 250) return `hsl(0 0% ${25 + (aci - 250) * 13}%)`;
  const brillo = [50, 40, 30, 25, 15][Math.floor((aci % 10) / 2)];
  return `hsl(${Math.floor((aci - 10) / 10) * 15} ${aci % 2 ? 55 : 90}% ${brillo}%)`;
}

interface Props {
  pendientes: DatosPendientes;
  valor: DecisionesPreparacion;
  onCambio: (decisiones: DecisionesPreparacion) => void;
  onAplicar: () => void;
  ocupado?: boolean;
}

export function Pendientes({ pendientes, valor, onCambio, onAplicar, ocupado }: Props) {
  const id = useId();
  const [borrador, setBorrador] = useState(() => borradorInicial(pendientes, valor));
  const confirmadas = (pendientes.capas ?? []).every(({ capa }) => valor.capas?.[capa] && valor.capas[capa] === borrador[capa]);
  const confirmacion = confirmarCapas(pendientes, valor, borrador);
  return <div className="cmt-pendientes">
    <h4>Antes de generar</h4>
    {!!pendientes.marcos?.length && <fieldset disabled={ocupado}>
      <legend>Elige el marco del corte</legend>
      {pendientes.marcos.map((m, i) => <label className="cmt-opcion" key={i}>
        <input type="radio" name={`${id}-marco`} checked={valor.marco === i} onChange={() => onCambio(aplicarDecision(valor, { marco: i }))} />
        Marco {i + 1} ({medidas(m.x1 - m.x0, m.y1 - m.y0)})
      </label>)}
    </fieldset>}
    {!!pendientes.cruces && <fieldset disabled={ocupado}>
      <legend>{pendientes.cruces === 1 ? 'Un elemento cruza' : `${mm(pendientes.cruces)} elementos cruzan`} el borde del marco</legend>
      {(['incluir', 'excluir'] as const).map(cruces => <label className="cmt-opcion" key={cruces}>
        <input type="radio" name={`${id}-cruces`} checked={valor.cruces === cruces} onChange={() => onCambio(aplicarDecision(valor, { cruces }))} />
        {cruces === 'incluir' ? 'Incluirlos' : 'Dejarlos fuera'}
      </label>)}
    </fieldset>}
    {!!pendientes.capas?.length && <fieldset disabled={ocupado}>
      <legend>Capas nuevas</legend>
      {pendientes.capas.map(({ capa, color, piezas, sugerida }) => <label className="cmt-capa" key={capa}>
        <span className="cmt-muestra" style={{ backgroundColor: colorAci(color) }} title={color ? `Color ACI ${color}` : 'Sin color de capa'} />
        <span><strong>{capa}</strong><small>{mm(piezas)} {piezas === 1 ? 'elemento' : 'elementos'}{sugerida && sugerida === borrador[capa] && !valor.capas?.[capa] ? ' · Sugerida por su color' : ''}</small></span>
        <select aria-label={`Herramienta para ${capa}`} value={borrador[capa] ?? ''} onChange={e => {
          const herramienta = e.target.value as Borrador[string];
          setBorrador(actual => ({ ...actual, [capa]: herramienta }));
          if (valor.capas?.[capa]) {
            const capas = { ...valor.capas };
            delete capas[capa];
            onCambio(aplicarDecision(valor, { capas }));
          }
        }}>
          <option value="">Elegir…</option>
          {HERRAMIENTAS.map(h => <option key={h} value={h}>{ETIQUETAS[h]}</option>)}
        </select>
      </label>)}
      <div className="cmt-confirmar">
        <button type="button" className="ghost-button" disabled={!confirmacion || confirmadas}
          onClick={() => { if (confirmacion) onCambio(confirmacion); }}>Confirmar capas</button>
        <small>{confirmadas ? 'Capas confirmadas. Se recordarán al generar.' : 'Se recordará para la próxima vez.'}</small>
      </div>
    </fieldset>}
    {pendientes.solapes?.map(({ clave, capas, mm: largo }) => <fieldset key={clave} disabled={ocupado}>
      <legend>{capas.join(' y ')} se pisan en {mm(largo)} mm</legend>
      {capas.map(capa => <label className="cmt-opcion" key={capa}>
        <input type="radio" name={`${id}-${clave}`} checked={valor.solapes?.[clave] === capa}
          onChange={() => onCambio(aplicarDecision(valor, { solapes: { ...valor.solapes, [clave]: capa } }))} />
        Se queda {capa}
      </label>)}
    </fieldset>)}
    <button type="button" className="primary-button" disabled={ocupado || !completas(pendientes, valor)} onClick={onAplicar}>Aplicar decisiones</button>
  </div>;
}
