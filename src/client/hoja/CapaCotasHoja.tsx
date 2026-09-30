import React, { useId } from 'react';
import type { CapturaVista } from '../remolques/render/captura';
import { trazarCota } from '../remolques/render/trazadoCota';
import { LETRA_COTA_MM, PX_POR_MM } from './medidas';

// Cotas y rótulos DELANTE / DETRÁS encima de una vista recta, en SVG con las coordenadas de la
// captura (el SVG se estira con la imagen). Todo en negro. Sin los números de los ollaos ni de los
// ganchos (Iván, 30/09/2026: distraen, y ya están en las tablas de debajo); sí las medidas.
const LETRA = LETRA_COTA_MM * PX_POR_MM;
const TRAZO = 0.2 * PX_POR_MM;
const HALO = 0.7 * PX_POR_MM;

export function CapaCotasHoja({ captura }: { captura: CapturaVista }) {
  const id = useId().replace(/:/g, '');
  const flecha = `hoja-flecha-${id}`;
  const flechaFuera = `hoja-flecha-fuera-${id}`;
  const { ancho, alto, cotas, rotulos } = captura;
  if (!cotas && rotulos.length === 0) return null;
  // Las flechas miden 8 veces el trazo (markerUnits: strokeWidth). Cómo va cada cota (flechas por
  // fuera si es corta, el alto de la ventana dentro si fuera no cabe): trazadoCota.
  const estilo = {
    anchoLienzo: ancho, letra: LETRA, flecha: 8 * TRAZO, hueco: LETRA * 0.6,
    bajaVertical: LETRA * 0.35, subeHorizontal: LETRA * 0.45, bajaHorizontal: LETRA * 1.05,
  };
  return (
    <svg className="hoja-cotas" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id={flecha} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M8 0 L0 4 L8 8 z" />
        </marker>
        {/* La misma flecha con la punta en el extremo y el cuerpo hacia fuera. */}
        <marker id={flechaFuera} markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto-start-reverse">
          <path d="M8 0 L0 4 L8 8 z" />
        </marker>
      </defs>
      {cotas?.lineas.map((l, i) => {
        // Una vertical en la mitad izquierda lleva el número a su izquierda (a la derecha caería sobre
        // el borde de la lona); la horizontal, encima de su línea salvo que pida ir debajo.
        const t = trazarCota(l, estilo);
        const punta = `url(#${t.fuera ? flechaFuera : flecha})`;
        return (
          <g key={`l${i}`}>
            <line {...t.linea} strokeWidth={TRAZO} markerStart={punta} markerEnd={punta} />
            {t.colas.map((c, j) => <line key={j} {...c} strokeWidth={TRAZO} />)}
            <text x={t.texto.x} y={t.texto.y} textAnchor={t.texto.anchor} fontSize={LETRA} strokeWidth={HALO}>
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
