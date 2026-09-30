import React, { useId } from 'react';
import type { CapturaVista } from '../remolques/render/captura';
import { LETRA_COTA_MM, PX_POR_MM } from './medidas';

// Cotas y rótulos DELANTE / DETRÁS encima de una vista recta, en SVG con las coordenadas de la
// captura (el SVG se estira con la imagen). Todo en negro. Sin los números de los ollaos ni de los
// ganchos (Iván, 30/09/2026: distraen, y ya están en las tablas de debajo); sí las medidas.
const LETRA = LETRA_COTA_MM * PX_POR_MM;
const TRAZO = 0.2 * PX_POR_MM;
const HALO = 0.7 * PX_POR_MM;

export function CapaCotasHoja({ captura }: { captura: CapturaVista }) {
  const flecha = `hoja-flecha-${useId().replace(/:/g, '')}`;
  const { ancho, alto, cotas, rotulos } = captura;
  if (!cotas && rotulos.length === 0) return null;
  return (
    <svg className="hoja-cotas" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id={flecha} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M8 0 L0 4 L8 8 z" />
        </marker>
      </defs>
      {cotas?.lineas.map((l, i) => {
        const vertical = Math.abs(l.x2 - l.x1) < Math.abs(l.y2 - l.y1);
        // Una cota vertical en la mitad izquierda lleva el número a su izquierda: a la derecha
        // caería sobre el borde de la lona. La horizontal, encima de su línea salvo que pida ir debajo.
        const aLaIzquierda = vertical && l.tx < ancho / 2;
        const yHorizontal = l.textoDebajo ? l.ty + LETRA * 1.05 : l.ty - LETRA * 0.45;
        return (
          <g key={`l${i}`}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={TRAZO} markerStart={`url(#${flecha})`} markerEnd={`url(#${flecha})`} />
            <text
              x={vertical ? l.tx + (aLaIzquierda ? -1 : 1) * LETRA * 0.6 : l.tx}
              y={vertical ? l.ty + LETRA * 0.35 : yHorizontal}
              textAnchor={vertical ? (aLaIzquierda ? 'end' : 'start') : 'middle'} fontSize={LETRA} strokeWidth={HALO}>
              {l.texto}
            </text>
          </g>
        );
      })}
      {rotulos.map((r) => (
        <text key={r.texto + r.alinear} className="hoja-rotulo-vista" x={r.x} y={Math.max(LETRA * 1.1, r.y)} textAnchor={r.alinear}
          fontSize={LETRA} strokeWidth={HALO}>
          {r.texto}
        </text>
      ))}
    </svg>
  );
}
