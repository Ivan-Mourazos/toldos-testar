import React from 'react';
import type { Programa } from './tipos';

const color = (capa: string) => capa === 'CUTTER' ? 'var(--tramo-holgado)' : capa === 'ROTULADOR' ? 'var(--color-brand-700)' : 'var(--text)';
const numero = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

// Los bloques de canalón cuentan canalones (un entero o dos mitades); el resto, paños.
const piezas = (p: Programa) => p.tipo === 'canalon'
  ? `${numero(p.canalones ?? 0)} canalones`
  : `${p.panos} ${p.panos === 1 ? 'paño' : 'paños'}`;

export function VistaCorte({ programas }: { programas: Programa[] }) {
  return <section className="combursa-corte" aria-label="Vista del corte">
    <h2>Vista del corte</h2>
    <p className="combursa-ayuda">Cada conjunto se dibuja una vez. El cortador sigue su repetición. Las líneas a mano quedan fuera.</p>
    <div className="combursa-programas">{programas.map((p, i) => <article className="glass-panel" key={`${p.codigo}-${i}`}>
      <header><strong>{p.codigo}</strong><span>{piezas(p)} × {numero(p.repeticiones)}</span></header>
      <svg role="img" aria-label={`Corte ${p.codigo}, ${piezas(p)} por ${p.repeticiones}`} viewBox={`-40 -40 ${p.largoMm + 80} ${p.anchoOcupadoMm + 80}`}>
        <g transform={`translate(0 ${p.anchoOcupadoMm}) scale(1 -1)`} fill="none" strokeWidth="3" vectorEffect="non-scaling-stroke">
          {p.entidades.lineas.map((l, j) => <line key={`l${j}`} stroke={color(l.capa)} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />)}
          {p.entidades.circulos.map((c, j) => <circle key={`c${j}`} stroke={color(c.capa)} cx={c.x} cy={c.y} r={c.r} />)}
          {p.entidades.arcos.map((a, j) => {
            const rad = (n: number) => n * Math.PI / 180;
            const punto = (n: number) => `${a.x + a.r * Math.cos(rad(n))},${a.y + a.r * Math.sin(rad(n))}`;
            return <path key={`a${j}`} stroke={color(a.capa)} d={`M${punto(a.desde)} A${a.r},${a.r} 0 ${((a.hasta - a.desde + 360) % 360) > 180 ? 1 : 0},1 ${punto(a.hasta)}`} />;
          })}
        </g>
      </svg>
      <footer>{numero(p.largoMm)} × {numero(p.anchoOcupadoMm)} mm · orillo sin cortar</footer>
    </article>)}</div>
  </section>;
}
