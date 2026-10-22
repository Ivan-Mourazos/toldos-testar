import React from 'react';
import { MODELOS_PUERTAS } from '../../puertas/calcular.ts';
import { esVertical, geometriaAlzado, numAlzado, textoCota, type CotaAlzado, type FormaAlzado, type TextoAlzado } from '../../puertas/alzado.ts';
import type { Puerta, ResultadoPuerta } from '../../puertas/tipos.ts';

// Pinta el alzado de src/puertas/alzado.ts: el mismo dibujo que sale en el plano DWG.

const puntos = (ps: [number, number][]) => ps.map(([x, y]) => `${x},${y}`).join(' ');

function Texto({ t }: { t: TextoAlzado }) {
  const texto = (
    <text
      x={t.x}
      y={t.y}
      textAnchor={t.ancla === 'start' ? undefined : t.ancla}
      className={t.clase}
      style={t.tamano ? { fontSize: `${t.tamano}px` } : undefined}
      transform={t.giro ? `rotate(${t.giro} ${t.x} ${t.y})` : undefined}
    >
      {t.taller
        ? t.lineas.map((linea, idx) => (
            <tspan key={idx} x={t.x} dy={idx === 0 ? 0 : (t.tamano ?? 10) * 1.2}>
              {linea}
            </tspan>
          ))
        : t.lineas[0]}
    </text>
  );
  if (!t.taller) return texto;
  const g = t.taller.guia;
  return (
    <g className="puerta-texto-taller">
      {g && <line className="puerta-linea-guia" x1={g[0]} y1={g[1]} x2={g[2]} y2={g[3]} />}
      {texto}
    </g>
  );
}

function Cota({ c }: { c: CotaAlzado }) {
  const v = esVertical(c);
  const [a, b] = v ? [c.y1, c.y2] : [c.x1, c.x2];
  const linea = (s1: number, t1: number, s2: number, t2: number) =>
    v ? <line className="puerta-cota" x1={t1} x2={t2} y1={s1} y2={s2} /> : <line className="puerta-cota" x1={s1} x2={s2} y1={t1} y2={t2} />;
  const t = c.texto;
  return (
    <g>
      {linea(a, c.linea, b, c.linea)}
      {c.marcas > 0 && linea(a, c.linea - c.marcas, a, c.linea + c.marcas)}
      {c.marcas > 0 && linea(b, c.linea - c.marcas, b, c.linea + c.marcas)}
      <text
        x={t.x}
        y={t.y}
        textAnchor={t.ancla === 'start' ? undefined : t.ancla}
        className={t.clase}
        transform={t.giro ? `rotate(${t.giro} ${t.x} ${t.y})` : undefined}
      >
        {textoCota(c)}
      </text>
    </g>
  );
}

function Forma({ f }: { f: FormaAlzado }) {
  switch (f.tipo) {
    case 'rect':
      return <rect className={f.clase} x={f.x} y={f.y} width={f.ancho} height={f.alto} rx={f.radio} />;
    case 'linea':
      return <line className={f.clase} x1={f.x1} x2={f.x2} y1={f.y1} y2={f.y2} strokeDasharray={f.trazos} />;
    case 'poligono':
      return <polygon className={f.clase} points={puntos(f.puntos)} />;
    case 'polilinea':
      return <polyline className={f.clase} points={puntos(f.puntos)} />;
    case 'texto':
      return <Texto t={f} />;
    case 'cota':
      return <Cota c={f} />;
  }
}

export function AlzadoPuerta({ puerta: p, resultado }: { puerta: Puerta; resultado: ResultadoPuerta }) {
  const { formas, vista, letraBase, F, H } = geometriaAlzado(p, resultado);
  return (
    <section className="puerta-alzado panel panel-vidrio" aria-label="Alzado de la puerta">
      <header>
        <h2>Alzado</h2>
        <span>
          {MODELOS_PUERTAS[p.modelo]} · {p.of || 'SIN OF'}
        </span>
      </header>
      <p>Medidas terminadas · cm · vista de frente</p>
      <svg
        role="img"
        aria-label={`Alzado ${MODELOS_PUERTAS[p.modelo]} ${numAlzado(F)} por ${numAlzado(H)} centímetros`}
        style={{ '--puerta-letra': `${letraBase}px` } as React.CSSProperties}
        viewBox={`${vista.xMin} ${vista.yMin} ${vista.ancho} ${vista.alto}`}
      >
        {formas.map((f, i) => (
          <Forma key={i} f={f} />
        ))}
      </svg>
      <small>Compara tubos, huecos, ventanal y textos de taller con el dibujo del cliente.</small>
      {p.observaciones.trim() && (
        <p className="puerta-observaciones-plano" aria-label="Observaciones particulares del pedido">
          <strong>Observaciones del pedido:</strong> {p.observaciones}
        </p>
      )}
    </section>
  );
}
