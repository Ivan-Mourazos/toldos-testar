import React, { useState } from 'react';
import { SelectField } from '../components/SelectField';
import { MODELOS_PUERTAS } from '../../puertas/calcular.ts';
import { tipoDePuerta } from '../../puertas/clientes.ts';
import { esVertical, geometriaAlzado, type CotaAlzado, type FormaAlzado, type TextoAlzado } from '../../puertas/alzado.ts';
import type { Puerta, ResultadoPuerta } from '../../puertas/tipos.ts';
import { tramosCota } from '../../puertas/tramosCota.ts';
import { medidaPuerta } from './medidasPuertas';
import { textoAlzadoMm, textoCotaMm } from './alzadoEnMm';

// Pinta el alzado de src/puertas/alzado.ts: el mismo dibujo que sale en el plano DWG.

const puntos = (ps: [number, number][]) => ps.map(([x, y]) => `${x},${y}`).join(' ');

function Texto({ t, araujo }: { t: TextoAlzado; araujo:boolean }) {
  const lineas=textoAlzadoMm(t.lineas.join('\n')).split('\n');
  const texto = (
    <text
      x={t.x}
      y={t.y - (t.alineacionVertical === 'middle' && t.taller ? (lineas.length - 1) * (t.tamano ?? 10) * .6 : 0)}
      dy={araujo?(t.tamano??5)*.36:undefined}
      textAnchor={t.ancla === 'start' ? undefined : t.ancla}
      className={t.clase}
      dominantBaseline={t.alineacionVertical}
      style={t.tamano ? { fontSize: `${t.tamano/(araujo ? .716 : 1)}px` } : undefined}
      transform={t.giro ? `rotate(${t.giro} ${t.x} ${t.y})` : undefined}
    >
      {t.taller
        ? lineas.map((linea, idx) => (
            <tspan key={idx} x={t.x} dy={idx === 0 ? 0 : (t.tamano ?? 10) * 1.2}>
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

function Cota({ c, araujo }: { c: CotaAlzado; araujo:boolean }) {
  const v = esVertical(c);
  const [a, b] = v ? [c.y1, c.y2] : [c.x1, c.x2];
  const linea = (s1: number, t1: number, s2: number, t2: number) =>
    v ? <line className="puerta-cota" x1={t1} x2={t2} y1={s1} y2={s2} /> : <line className="puerta-cota" x1={s1} x2={s2} y1={t1} y2={t2} />;
  const t = c.texto;
  const h=c.estilo==='XERAL 5'?5:10;
  return (
    <g>
      {tramosCota(c).map(([u, w], i) => <React.Fragment key={i}>{linea(u, c.linea, w, c.linea)}</React.Fragment>)}
      {c.marcas > 0 && linea(a, c.linea - c.marcas, a, c.linea + c.marcas)}
      {c.marcas > 0 && linea(b, c.linea - c.marcas, b, c.linea + c.marcas)}
      {araujo&&[[a,v?c.x1:c.y1],[b,v?c.x2:c.y2]].map(([s,p],i)=>Math.abs(c.linea-p)>5
        ?<React.Fragment key={i}>{linea(s,p+Math.sign(c.linea-p)*5,s,c.linea+Math.sign(c.linea-p)*1.75)}</React.Fragment>:null)}
      <text
        x={t.x}
        y={t.y}
        dy={araujo?h*.36:undefined}
        style={araujo?{fontSize:`${h/.716}px`}:c.tamanoTexto?{fontSize:`${c.tamanoTexto}px`}:undefined}
        textAnchor={t.ancla === 'start' ? undefined : t.ancla}
        className={t.clase}
        dominantBaseline={c.tamanoTexto ? 'middle' : undefined}
        transform={t.giro ? `rotate(${t.giro} ${t.x} ${t.y})` : undefined}
      >
        {textoCotaMm(c)}
      </text>
    </g>
  );
}

function Forma({ f, araujo }: { f: FormaAlzado; araujo:boolean }) {
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
      return <Texto t={f} araujo={araujo} />;
    case 'cota':
      return <Cota c={f} araujo={araujo} />;
  }
}

export function AlzadoPuerta({ puerta: p, resultado, letra = 'A' }: { puerta: Puerta; resultado: ResultadoPuerta; letra?: string }) {
  const [pieza,setPieza]=useState('todas');
  if(p.modelo==='SYSTEMDOCK'&&!(p.frente>0&&p.alto>0)) return <section className="puerta-alzado panel panel-vidrio" aria-label="Alzado de la lona"><h2>Alzado</h2><p>Completa el largo y el ancho de la lona para ver sus medidas reales.</p></section>;
  const { formas: todas, grupos, vista: conjunto, vistas, letraBase, F, H } = geometriaAlzado(p, resultado, letra);
  const seleccion=pieza!=='todas'&&vistas?.[Number(pieza)]?pieza:'todas';
  const vista=seleccion==='todas'?conjunto:vistas![Number(seleccion)];
  const formas=seleccion==='todas'?todas:grupos?.[Number(seleccion)]??todas;
  return (
    <section className="puerta-alzado panel panel-vidrio" aria-label={p.modelo==='SYSTEMDOCK'?'Alzado de la lona':'Alzado de la puerta'}>
      <header>
        <h2>Alzado</h2>
        <span>
          {p.clientePuertas||p.araujo?tipoDePuerta(p).nombre:MODELOS_PUERTAS[p.modelo]} · {p.of || 'SIN OF'}
        </span>
      </header>
      <p>Medidas terminadas · mm · {p.araujo||p.santapau?'vista por el revés':'vista de frente'}</p>
      {vistas&&vistas.length>1&&<SelectField label="Ampliar pieza del alzado" value={seleccion} options={['todas',...vistas.map((_,i)=>String(i))]} optionLabel={v=>v==='todas'?'Todas las piezas':vistas[Number(v)].nombre} onChange={setPieza}/>}
      <svg
        role="img"
        aria-label={`Alzado ${p.clientePuertas||p.araujo?tipoDePuerta(p).nombre:MODELOS_PUERTAS[p.modelo]} ${medidaPuerta(F)} por ${medidaPuerta(H)} milímetros`}
        style={{ '--puerta-letra': `${letraBase}px`, ...(p.modelo==='SYSTEMDOCK'?{aspectRatio:`${vista.ancho} / ${vista.alto}`}:{}) } as React.CSSProperties}
        viewBox={`${vista.xMin} ${vista.yMin} ${vista.ancho} ${vista.alto}`}
      >
        {formas.map((f, i) => (
          <Forma key={i} f={f} araujo={Boolean(p.araujo)} />
        ))}
      </svg>
      <small>{p.modelo==='SYSTEMDOCK'?'Compara las medidas y el texto con el pedido del cliente.':'Compara tubos, huecos, ventanal y textos de taller con el dibujo del cliente.'}</small>
      {p.observaciones.trim() && (
        <p className="puerta-observaciones-plano" aria-label="Observaciones particulares del pedido">
          <strong>Observaciones del pedido:</strong> {p.observaciones}
        </p>
      )}
    </section>
  );
}
