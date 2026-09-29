import React, { useId } from 'react';
import type { CotasPantalla } from './proyeccion';

// Cotas encima del render, en SVG: el texto se lee igual de nítido en cualquier vista.
export function CapaCotas({ cotas, ancho, alto }: { cotas: CotasPantalla; ancho: number; alto: number }) {
  const flecha = `rem-render-flecha-${useId().replace(/:/g, '')}`;
  return (
    <svg className="rem-render-cotas" width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true">
      <defs>
        <marker id={flecha} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M8 0 L0 4 L8 8 z" />
        </marker>
      </defs>
      {cotas.lineas.map((l, i) => {
        const vertical = Math.abs(l.x2 - l.x1) < Math.abs(l.y2 - l.y1);
        return (
          <g key={`l${i}`}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} markerStart={`url(#${flecha})`} markerEnd={`url(#${flecha})`} />
            <text x={vertical ? l.tx + 8 : l.tx} y={vertical ? l.ty + 4 : l.ty - 6} textAnchor={vertical ? 'start' : 'middle'}>
              {l.texto}
            </text>
          </g>
        );
      })}
      {cotas.marcas.map((m, i) => (
        <text key={`m${i}`} className="rem-render-marca" x={m.x} y={m.y} textAnchor="middle">{m.texto}</text>
      ))}
    </svg>
  );
}
