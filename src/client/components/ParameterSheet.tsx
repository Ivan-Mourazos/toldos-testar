import React, { useLayoutEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { controlLabel, legacyModelName } from './controlLabels';

// Piezas comunes de la ficha de un modelo en Parámetros (Iván, 25/09/2026: «que todos los
// modelos se vean igual»). Cabecera oscura con el nombre, el producto del proveedor y una
// línea de descripción; secciones numeradas «01 Título» con los campos o la tabla a la derecha.
// La explicación aprovecha el hueco de la última fila, o se queda junto al título si no cabe.
// Al final va una línea con el contraste real.

export type SheetKind = 'produccion' | 'nuevo' | 'consulta' | 'tela' | 'remolques';

const kickers: Record<SheetKind, string> = {
  produccion: 'Modelo en producción',
  nuevo: 'Modelo nuevo',
  consulta: 'Solo consulta',
  tela: 'Trabajo de tela',
  remolques: 'Lonas y baquetón'
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
    <section className="parameters-page panel-3d panel-vidrio">
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
  const content = React.Children.toArray(children);
  const gridIndex = content.findIndex(child => React.isValidElement<{ className?: string }>(child)
    && child.type === 'div' && child.props.className?.split(' ').includes('parameter-grid'));
  const grid = gridIndex >= 0 ? content[gridIndex] as React.ReactElement<{ children?: React.ReactNode; ref?: React.Ref<HTMLDivElement> }> : null;
  const gridRef = useRef<HTMLDivElement>(null);
  const [descriptionColumn, setDescriptionColumn] = useState(0);
  const hasGrid = Boolean(grid);
  const fieldCount = React.Children.count(grid?.props.children);

  useLayoutEffect(() => {
    const element = gridRef.current;
    if (!element) { setDescriptionColumn(0); return; }
    const measure = () => {
      const fields = Array.from(element.children).filter(child => !child.classList.contains('parameter-grid-description'));
      const style = getComputedStyle(element);
      const columns = style.gridTemplateColumns.split(' ').map(Number.parseFloat);
      const gap = Number.parseFloat(style.columnGap) || 0;
      const last = fields.at(-1);
      // Solo rejillas de campos. Tablas y contenido libre conservan la explicación junto al título.
      let next = 0;
      if (element.clientWidth > 0 && last && fields.every(child => child.matches('label, .field'))) {
        const used = Math.round((last.getBoundingClientRect().right - element.getBoundingClientRect().left + gap) / (columns[0] + gap));
        if (columns.length - used >= 2) next = used + 1;
      }
      setDescriptionColumn(current => current === next ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasGrid, fieldCount]);

  if (grid) content[gridIndex] = React.cloneElement(grid, { ref: gridRef }, grid.props.children,
    descriptionColumn > 0 && <p key="descripcion" className="parameter-grid-description" role="note" style={{ gridColumn: `${descriptionColumn} / -1` }}><span>{description}</span></p>);

  return (
    <div className="parameter-band">
      <div className="parameter-band-title"><span>{number}</span><div><h3>{title}</h3>{descriptionColumn === 0 && <p>{description}</p>}</div></div>
      <div className="parameter-band-content">{content}</div>
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
