import React, { useState } from 'react';
import { VistaAbrigo } from './Abrigo';
import { VistaSacoArena } from './SacoArena';
import { SelectField } from '../components/SelectField';
import { anchoArial } from '../../domain/corteLona/texto.js';
import { MODELOS_PUERTAS } from '../../puertas/calcular.ts';
import { tipoDePuerta } from '../../puertas/clientes.ts';
import { esVertical, type CotaAlzado, type FormaAlzado, type TextoAlzado } from '../../puertas/alzado.ts';
import type { Puerta, ResultadoPuerta } from '../../puertas/tipos.ts';
import { medidaPuerta } from './medidasPuertas';
import { textoAlzadoMm, textoCotaMm } from './alzadoEnMm';
import { geometriaPantallaPuerta } from './alzadoPantalla';

// Pinta el alzado en vivo de pantalla (estilo plano GENERAL, medidas en mm, cotas agarradas a sus piezas).

const puntos = (ps: [number, number][]) => ps.map(([x, y]) => `${x},${y}`).join(' ');

/** Hueco de la línea de cota adaptado al ancho real del texto en mm. */
function tramosCotaMm(c: CotaAlzado, etiqueta: string): Array<[number, number]> {
  const v = esVertical(c);
  const a = Math.min(v ? c.y1 : c.x1, v ? c.y2 : c.x2);
  const b = Math.max(v ? c.y1 : c.x1, v ? c.y2 : c.x2);
  const t = c.texto;
  const perpendicular = v ? t.x : t.y;
  const centro = v ? t.y : t.x;
  if (!c.tamanoTexto || Math.abs(perpendicular - c.linea) > 0.01) return [[a, b]];
  const mitad = anchoArial(etiqueta, c.tamanoTexto) / 2 + 1.2;
  return [[a, Math.max(a, centro - mitad)], [Math.min(b, centro + mitad), b]].filter(([u, w]) => w > u) as Array<[number, number]>;
}

function Texto({ t, araujo, minTamano }: { t: TextoAlzado; araujo: boolean; minTamano: number }) {
  const lineas = textoAlzadoMm(t.lineas.join('\n')).split('\n');
  // Los mininúmeros de unión entre ventanales (tamano <= 1.5) conservan su tamaño pequeño.
  const tamEfectivo = t.tamano !== undefined
    ? (t.tamano <= 1.5 ? t.tamano : Math.max(t.tamano, minTamano))
    : undefined;
  const multilinea = lineas.length > 1;
  const paso = (tamEfectivo ?? 10) * 1.22;
  const texto = (
    <text
      x={t.x}
      y={t.y - (t.alineacionVertical === 'middle' && multilinea ? (lineas.length - 1) * (tamEfectivo ?? 10) * 0.6 : 0)}
      dy={araujo ? (tamEfectivo ?? 5) * 0.36 : undefined}
      textAnchor={t.ancla === 'start' ? undefined : t.ancla}
      className={t.clase}
      dominantBaseline={t.alineacionVertical}
      style={tamEfectivo ? { fontSize: `${tamEfectivo / (araujo ? 0.716 : 1)}px` } : undefined}
      transform={t.giro ? `rotate(${t.giro} ${t.x} ${t.y})` : undefined}
    >
      {multilinea
        ? lineas.map((linea, idx) => (
            <tspan key={idx} x={t.x} dy={idx === 0 ? 0 : paso}>
              {linea}
            </tspan>
          ))
        : lineas[0]}
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

function Cota({ c, araujo }: { c: CotaAlzado; araujo: boolean }) {
  const v = esVertical(c);
  const [a, b] = v ? [c.y1, c.y2] : [c.x1, c.x2];
  const linea = (s1: number, t1: number, s2: number, t2: number, clase = 'puerta-cota') =>
    v ? <line className={clase} x1={t1} x2={t2} y1={s1} y2={s2} /> : <line className={clase} x1={s1} x2={s2} y1={t1} y2={t2} />;
  const t = c.texto;
  const h = c.estilo === 'XERAL 5' ? 5 : 10;
  const etiqueta = textoCotaMm(c);
  const auxiliares: Array<[number, number]> = [[a, v ? c.x1 : c.y1], [b, v ? c.x2 : c.y2]];
  const saltoAux = araujo ? 5 : 2;
  const sobresalir = araujo ? 1.75 : Math.max(1.5, c.marcas * 0.5);
  return (
    <g>
      {tramosCotaMm(c, etiqueta).map(([u, w], i) => <React.Fragment key={i}>{linea(u, c.linea, w, c.linea)}</React.Fragment>)}
      {c.marcas > 0 && linea(a, c.linea - c.marcas, a, c.linea + c.marcas)}
      {c.marcas > 0 && linea(b, c.linea - c.marcas, b, c.linea + c.marcas)}
      {auxiliares.map(([s, p], i) => {
        const dist = c.linea - p;
        if (Math.abs(dist) <= saltoAux + 1) return null;
        const dir = Math.sign(dist);
        return (
          <React.Fragment key={i}>
            {linea(s, p + dir * saltoAux, s, c.linea + dir * sobresalir, 'puerta-cota puerta-cota-aux')}
          </React.Fragment>
        );
      })}
      <text
        x={t.x}
        y={t.y}
        dy={araujo ? h * 0.36 : undefined}
        style={araujo ? { fontSize: `${h / 0.716}px` } : c.tamanoTexto ? { fontSize: `${c.tamanoTexto}px` } : undefined}
        textAnchor={t.ancla === 'start' ? undefined : t.ancla}
        className={t.clase}
        dominantBaseline={c.tamanoTexto ? 'middle' : undefined}
        transform={t.giro ? `rotate(${t.giro} ${t.x} ${t.y})` : undefined}
      >
        {etiqueta}
      </text>
    </g>
  );
}

function Forma({ f, araujo, minTamano }: { f: FormaAlzado; araujo: boolean; minTamano: number }) {
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
      return <Texto t={f} araujo={araujo} minTamano={minTamano} />;
    case 'cota':
      return <Cota c={f} araujo={araujo} />;
  }
}

export function AlzadoPuerta({ puerta: p, resultado, letra = 'A' }: { puerta: Puerta; resultado: ResultadoPuerta; letra?: string }) {
  const [pieza, setPieza] = useState('todas');
  if (p.modelo === 'ABRIGO') return <VistaAbrigo p={p} />;
  if (p.modelo === 'SACOARENA') return <VistaSacoArena puerta={p} />;
  if (p.modelo === 'SYSTEMDOCK' && !(p.frente > 0 && p.alto > 0)) {
    return (
      <section className="puerta-alzado panel panel-vidrio" aria-label="Alzado de la lona">
        <h2>Alzado</h2>
        <p>Completa el largo y el ancho de la lona para ver sus medidas reales.</p>
      </section>
    );
  }
  const { formas: todas, grupos, vista: conjunto, vistas, letraBase, F, H } = geometriaPantallaPuerta(p, resultado, letra);
  const seleccion = pieza !== 'todas' && vistas?.[Number(pieza)] ? pieza : 'todas';
  const vista = seleccion === 'todas' ? conjunto : vistas![Number(seleccion)];
  const formas = seleccion === 'todas' ? todas : grupos?.[Number(seleccion)] ?? todas;
  const minTamano = p.araujo || p.santapau ? 0 : Math.min(7, Math.max(5.2, Math.max(vista.ancho, vista.alto) * 0.0115));
  const letraEfectiva = p.araujo || p.santapau ? letraBase : Math.max(letraBase, Math.max(vista.ancho, vista.alto) * 0.0145);
  return (
    <section className="puerta-alzado panel panel-vidrio" aria-label={p.modelo === 'SYSTEMDOCK' ? 'Alzado de la lona' : 'Alzado de la puerta'}>
      <header>
        <h2>Alzado</h2>
        <span>
          {p.clientePuertas || p.araujo ? tipoDePuerta(p).nombre : MODELOS_PUERTAS[p.modelo]} · {p.of || 'SIN OF'}
        </span>
      </header>
      <p>Medidas terminadas · mm{p.modelo === 'SYSTEMDOCK' ? '' : ' · vista por el revés'}</p>
      {vistas && vistas.length > 1 && (
        <SelectField
          label="Ampliar pieza del alzado"
          value={seleccion}
          options={['todas', ...vistas.map((_, i) => String(i))]}
          optionLabel={v => (v === 'todas' ? 'Todas las piezas' : vistas[Number(v)].nombre)}
          onChange={setPieza}
        />
      )}
      <svg
        role="img"
        aria-label={`Alzado ${p.clientePuertas || p.araujo ? tipoDePuerta(p).nombre : MODELOS_PUERTAS[p.modelo]} ${medidaPuerta(F)} por ${medidaPuerta(H)} milímetros`}
        style={{ '--puerta-letra': `${letraEfectiva}px`, ...(p.modelo === 'SYSTEMDOCK' ? { aspectRatio: `${vista.ancho} / ${vista.alto}` } : {}) } as React.CSSProperties}
        viewBox={`${vista.xMin} ${vista.yMin} ${vista.ancho} ${vista.alto}`}
      >
        {formas.map((f, i) => (
          <Forma key={i} f={f} araujo={Boolean(p.araujo)} minTamano={minTamano} />
        ))}
      </svg>
      <small>{p.modelo === 'SYSTEMDOCK' ? 'Compara las medidas y el texto con el pedido del cliente.' : 'Compara tubos, huecos, ventanal y textos de taller con el dibujo del cliente.'}</small>
      {/* Iván, 10/11/2026: la descripción de la OF no hace falta junto al dibujo; sigue en la pestaña Texto. */}
    </section>
  );
}
