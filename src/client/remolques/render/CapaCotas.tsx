import React, { useId } from 'react';
import type { CotasPantalla, RotuloPantalla } from './proyeccion';
import { trazarCota } from './trazadoCota';

// Cotas encima del render, en SVG: el texto se lee igual de nítido en cualquier vista. Cómo va cada
// una (flechas por fuera si es corta, el alto de la ventana dentro si fuera no cabe): trazadoCota.
export function CapaCotas({ cotas, ancho, alto }: { cotas: CotasPantalla; ancho: number; alto: number }) {
  const id = useId().replace(/:/g, '');
  const flecha = `rem-render-flecha-${id}`;
  const flechaFuera = `rem-render-flecha-fuera-${id}`;
  const estilo = { anchoLienzo: ancho, letra: 11, flecha: 8, hueco: 8, bajaVertical: 4, subeHorizontal: 6, bajaHorizontal: 14 };
  return (
    <svg className="rem-render-cotas" width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true">
      <defs>
        <marker id={flecha} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M8 0 L0 4 L8 8 z" />
        </marker>
        {/* La misma flecha con la punta en el extremo y el cuerpo hacia fuera. */}
        <marker id={flechaFuera} markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto-start-reverse">
          <path d="M8 0 L0 4 L8 8 z" />
        </marker>
      </defs>
      {cotas.lineas.map((l, i) => {
        const t = trazarCota(l, estilo);
        const punta = `url(#${t.fuera ? flechaFuera : flecha})`;
        return (
          <g key={`l${i}`}>
            <line {...t.linea} markerStart={punta} markerEnd={punta} />
            {t.colas.map((c, j) => <line key={j} {...c} />)}
            <text x={t.texto.x} y={t.texto.y} textAnchor={t.texto.anchor}>{l.texto}</text>
          </g>
        );
      })}
      {cotas.marcas.map((m, i) => (
        <text key={`m${i}`} className="rem-render-marca" x={m.x} y={m.y} textAnchor="middle">{m.texto}</text>
      ))}
    </svg>
  );
}

// DELANTE y DETRÁS de las vistas rectas: se ven siempre, con o sin cotas, en otra capa para que
// apagar las cotas no se los lleve.
export function CapaRotulos({ rotulos, ancho, alto }: { rotulos: RotuloPantalla[]; ancho: number; alto: number }) {
  return (
    <svg className="rem-render-rotulos" width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true">
      {rotulos.map((r) => (
        <text key={r.texto + r.alinear} x={r.x} y={r.y} textAnchor={r.alinear}>{r.texto}</text>
      ))}
    </svg>
  );
}
