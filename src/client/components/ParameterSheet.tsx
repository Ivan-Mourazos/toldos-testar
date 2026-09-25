import React from 'react';
import { RotateCcw } from 'lucide-react';
import { controlLabel, legacyModelName } from './controlLabels';

// Piezas comunes de la ficha de un modelo en Parámetros (Iván, 25/09/2026: «que todos los
// modelos se vean igual»). Cabecera oscura con el nombre, el producto del proveedor y una
// línea de descripción; secciones numeradas «01 Título» con la explicación a la izquierda
// y los campos o la tabla a la derecha; y una línea final con el contraste real.

export type SheetKind = 'produccion' | 'nuevo' | 'consulta' | 'tela';

const kickers: Record<SheetKind, string> = {
  produccion: 'Modelo en producción',
  nuevo: 'Modelo nuevo',
  consulta: 'Solo consulta',
  tela: 'Trabajo de tela'
};

export function parameterModelName(model: string) {
  const current = controlLabel(model);
  const legacy = legacyModelName(model);
  return { current, legacy: legacy && legacy.toLocaleUpperCase('es') !== current.toLocaleUpperCase('es') ? legacy : '' };
}

export function ParameterSheet({ model, kind = 'produccion', description, onReset, evidence, evidenceLabel = 'Contraste real', children }: {
  model: string;
  kind?: SheetKind;
  description: string;
  onReset?: () => void;
  evidence?: React.ReactNode;
  evidenceLabel?: string;
  children: React.ReactNode;
}) {
  const names = parameterModelName(model);
  return (
    <section className="parameters-page panel-3d">
      <header className="parameters-heading">
        <div>
          <span className="section-kicker">{kickers[kind]}</span>
          <h2>{names.current}{names.legacy && <small>{names.legacy}</small>}</h2>
          <p>{description}</p>
        </div>
        {onReset && <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Restaurar valores por defecto</button>}
      </header>
      {children}
      {evidence && <aside className="rps-evidence"><strong>{evidenceLabel}</strong><span>{evidence}</span></aside>}
    </section>
  );
}

export function ParameterBand({ number, title, description, children }: {
  number: string;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="parameter-band">
      <div className="parameter-band-title"><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></div>
      <div className="parameter-band-content">{children}</div>
    </div>
  );
}

// Nota de una línea bajo los campos o la tabla de una sección.
export function ParameterNote({ children }: { children: React.ReactNode }) {
  return <p className="parameter-note">{children}</p>;
}

// Cabecera de columna de un accionamiento en minúsculas de frase («Máq. interior»); los
// valores guardados siguen en mayúsculas.
export const deviceHeader = (device: string) => controlLabel(device);
