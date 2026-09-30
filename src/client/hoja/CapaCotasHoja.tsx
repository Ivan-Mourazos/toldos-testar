import React, { useId } from 'react';
import type { CapturaVista } from '../remolques/render/captura';
import type { MarcaCota, RotuloPantalla } from '../remolques/render/proyeccion';
import { LETRA_COTA_MM, PX_POR_MM } from './medidas';

// Cotas, números de ollaos y ganchos y rótulos DELANTE / DETRÁS encima de una vista recta, en SVG
// con las coordenadas de la captura (el SVG se estira con la imagen). Todo en negro; los números
// de ollaos van en vertical para que no se pisen: los ollaos hacia arriba (sobre la lona) y los
// ganchos hacia abajo (sobre el cajón).
const LETRA = LETRA_COTA_MM * PX_POR_MM;
const TRAZO = 0.2 * PX_POR_MM;
const HALO = 0.7 * PX_POR_MM;
/** Ancho medio de una cifra de Geist en proporción de la letra: para saber hasta dónde sube un número. */
const ANCHO_CIFRA = 0.62;

/**
 * DELANTE y DETRÁS van justo encima del remolque; en una lona baja (baquetón) los números de los
 * ollaos, que suben en vertical, llegaban hasta ellos y se pisaban. Aquí suben por encima del
 * número más alto, sin salirse del recuadro.
 */
export function alturaRotulos(rotulos: RotuloPantalla[], marcas: MarcaCota[]): number[] {
  const techo = Math.min(Infinity, ...marcas.filter((m) => m.hacia === 'arriba').map((m) => m.y - m.texto.length * LETRA * ANCHO_CIFRA));
  return rotulos.map((r) => Math.max(LETRA * 1.1, Math.min(r.y, techo - LETRA * 0.6)));
}

export function CapaCotasHoja({ captura }: { captura: CapturaVista }) {
  const flecha = `hoja-flecha-${useId().replace(/:/g, '')}`;
  const { ancho, alto, cotas, rotulos } = captura;
  if (!cotas && rotulos.length === 0) return null;
  const alturas = alturaRotulos(rotulos, cotas?.marcas ?? []);
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
        // caería sobre el borde de la lona y el primer ollao.
        const aLaIzquierda = vertical && l.tx < ancho / 2;
        return (
          <g key={`l${i}`}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={TRAZO} markerStart={`url(#${flecha})`} markerEnd={`url(#${flecha})`} />
            <text
              x={vertical ? l.tx + (aLaIzquierda ? -1 : 1) * LETRA * 0.6 : l.tx}
              y={vertical ? l.ty + LETRA * 0.35 : l.ty - LETRA * 0.45}
              textAnchor={vertical ? (aLaIzquierda ? 'end' : 'start') : 'middle'} fontSize={LETRA} strokeWidth={HALO}>
              {l.texto}
            </text>
          </g>
        );
      })}
      {cotas?.marcas.map((m, i) => (
        <text key={`m${i}`} className="hoja-marca" x={m.x} y={m.y} fontSize={LETRA} strokeWidth={HALO}
          textAnchor={m.hacia === 'arriba' ? 'start' : 'end'} dominantBaseline="middle" transform={`rotate(-90 ${m.x} ${m.y})`}>
          {m.texto}
        </text>
      ))}
      {rotulos.map((r, i) => (
        <text key={r.texto + r.alinear} className="hoja-rotulo-vista" x={r.x} y={alturas[i]} textAnchor={r.alinear} fontSize={LETRA} strokeWidth={HALO}>
          {r.texto}
        </text>
      ))}
    </svg>
  );
}
