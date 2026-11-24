import { useState } from 'react';
import { HERRAMIENTAS, type Herramienta } from '../../cmt/preparacion/tipos.ts';
import type { DecisionesPreparacion, Pendientes as DatosPendientes } from '../../cmt/preparacion/index.ts';
import { colorAci } from '../../cmt/colorAci.ts';
import { SegmentedField } from '../components/SegmentedField';
import { SelectField } from '../components/SelectField';
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

interface Props {
  pendientes: DatosPendientes;
  valor: DecisionesPreparacion;
  onCambio: (decisiones: DecisionesPreparacion) => void;
  onAplicar: () => void;
  ocupado?: boolean;
}

const CRUCES = { incluir: 'Incluirlos', excluir: 'Dejarlos fuera' } as const;
const quedaCapa = (capa: string) => `Se queda ${capa}`;

/** Lo que hay que decidir antes de generar, con los mismos controles que el resto de la web (Iván, 24/11/2026). */
export function Pendientes({ pendientes, valor, onCambio, onAplicar, ocupado }: Props) {
  const [borrador, setBorrador] = useState(() => borradorInicial(pendientes, valor));
  const confirmadas = (pendientes.capas ?? []).every(({ capa }) => valor.capas?.[capa] && valor.capas[capa] === borrador[capa]);
  const confirmacion = confirmarCapas(pendientes, valor, borrador);
  const nombreMarco = (i: number) => {
    const m = pendientes.marcos![i];
    return `Marco ${i + 1} (${medidas(m.x1 - m.x0, m.y1 - m.y0)})`;
  };
  return <div className="cmt-pendientes">
    <h4>Antes de generar</h4>
    {!!pendientes.marcos?.length && <fieldset disabled={ocupado}>
      <SegmentedField label="Elige el marco del corte" value={valor.marco === undefined ? '' : nombreMarco(valor.marco)}
        options={pendientes.marcos.map((_, i) => nombreMarco(i))}
        onChange={opcion => onCambio(aplicarDecision(valor, { marco: pendientes.marcos!.findIndex((_, i) => nombreMarco(i) === opcion) }))} />
    </fieldset>}
    {!!pendientes.cruces && <fieldset disabled={ocupado}>
      <SegmentedField label={`${pendientes.cruces === 1 ? 'Un elemento cruza' : `${mm(pendientes.cruces)} elementos cruzan`} el borde del marco`}
        value={valor.cruces ? CRUCES[valor.cruces] : ''} options={Object.values(CRUCES)}
        onChange={opcion => onCambio(aplicarDecision(valor, { cruces: opcion === CRUCES.incluir ? 'incluir' : 'excluir' }))} />
    </fieldset>}
    {!!pendientes.capas?.length && <fieldset disabled={ocupado}>
      <legend>Capas nuevas</legend>
      {pendientes.capas.map(({ capa, color, piezas, sugerida }) => <div className="cmt-capa" key={capa}>
        <span className="cmt-muestra" style={{ backgroundColor: color === 7 ? 'var(--text)' : colorAci(color) ?? 'transparent' }} title={color ? `Color ACI ${color}` : 'Sin color de capa'} />
        <span><strong>{capa}</strong><small>{mm(piezas)} {piezas === 1 ? 'elemento' : 'elementos'}{sugerida && sugerida === borrador[capa] && !valor.capas?.[capa] ? ' · Sugerida por su color' : ''}</small></span>
        <SelectField label={`Herramienta para ${capa}`} value={borrador[capa] ?? ''} options={[...HERRAMIENTAS]}
          optionLabel={h => h ? ETIQUETAS[h as Herramienta] : ''} placeholder="Elegir…" onChange={h => {
            const herramienta = h as Borrador[string];
            setBorrador(actual => ({ ...actual, [capa]: herramienta }));
            if (valor.capas?.[capa]) {
              const capas = { ...valor.capas };
              delete capas[capa];
              onCambio(aplicarDecision(valor, { capas }));
            }
          }} />
      </div>)}
      <div className="cmt-confirmar">
        <button type="button" className="ghost-button" disabled={!confirmacion || confirmadas}
          onClick={() => { if (confirmacion) onCambio(confirmacion); }}>Confirmar capas</button>
        <small>{confirmadas ? 'Capas confirmadas. Se recordarán al generar.' : 'Se recordará para la próxima vez.'}</small>
      </div>
    </fieldset>}
    {pendientes.solapes?.map(({ clave, capas, mm: largo }) => <fieldset key={clave} disabled={ocupado}>
      <SegmentedField label={`${capas.join(' y ')} se pisan en ${mm(largo)} mm`}
        value={valor.solapes?.[clave] ? quedaCapa(valor.solapes[clave]) : ''} options={capas.map(quedaCapa)}
        onChange={opcion => onCambio(aplicarDecision(valor, { solapes: { ...valor.solapes, [clave]: capas.find(c => quedaCapa(c) === opcion)! } }))} />
    </fieldset>)}
    <button type="button" className="primary-button boton-3d" disabled={ocupado || !completas(pendientes, valor)} onClick={onAplicar}>Aplicar decisiones</button>
  </div>;
}
