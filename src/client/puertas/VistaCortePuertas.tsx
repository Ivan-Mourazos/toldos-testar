import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { CortePuertas, EntidadesPuertas, PedidoPuertas, VistaPuertas } from '../../puertas/tipos.ts';
import { anchoArial } from '../../domain/corteLona/texto.js';
import { presentarImpresionAraujo } from '../../puertas/cotasImpresionAraujo.ts';
import { entidadesDePieza } from '../../puertas/corteEnPlano.ts';
import { MATERIAL_SACO_AMARILLO } from '../../puertas/saco.ts';
import '../coordina/corte-lona.css';
import { numeroPuerta, textoMedidasMm } from './medidasPuertas';
import { CortesDelPlano, type CorteDelPlanoCliente } from '../components/CortesDelPlano';

function TrazosCorte({ entidades, factorMm = 1 }: { entidades: EntidadesPuertas; factorMm?: number }) {
  return <>
    {entidades.lineas.map((l,i)=><line key={i} x1={l.x1} y1={-l.y1} x2={l.x2} y2={-l.y2} data-capa={l.capa} className={l.capa==='ROTULADOR'?'corte-marca':l.capa==='CUTTER'?'puerta-cutter':'corte-linea'} vectorEffect="non-scaling-stroke"/>)}
    {entidades.arcos.map((a,i)=>{
      const rad=(v:number)=>v*Math.PI/180;
      const x0=a.x+a.r*Math.cos(rad(a.desde)),y0=-a.y-a.r*Math.sin(rad(a.desde));
      const x1=a.x+a.r*Math.cos(rad(a.hasta)),y1=-a.y-a.r*Math.sin(rad(a.hasta));
      return <path key={i} d={`M ${x0} ${y0} A ${a.r} ${a.r} 0 0 0 ${x1} ${y1}`} data-capa={a.capa} className={a.capa==='CUTTER'?'puerta-cutter':'corte-linea'} vectorEffect="non-scaling-stroke"/>;
    })}
    {entidades.textos.map((t,i)=><text key={i} data-capa={t.capa} x={t.x} y={-t.y} fontSize={t.h} className={t.capa==='ROTULADOR'?'puerta-texto-rotulador':undefined} textAnchor={t.centrado?'middle':'start'} dominantBaseline={t.centrado?'central':'auto'} transform={t.giro?`rotate(${-t.giro} ${t.x} ${-t.y})`:undefined}>{textoMedidasMm(t.valor)}<title>{t.capa} · {textoMedidasMm(t.valor)} · {(t.h * factorMm).toLocaleString('es-ES')} mm</title></text>)}
  </>;
}

/** Recupera cada mitad del corte real en sus propias coordenadas, con sus marcas de unión. */
function SacoPartidoHorizontal({ corte }: { corte: CortePuertas }) {
  let alto = 0;
  const piezas = [];
  for (const t of corte.colocadas) {
    const base = alto + t.pieza.alto;
    piezas.push({ base, entidades: entidadesDePieza(corte, t) });
    alto = base + 4;
  }
  const ancho = Math.max(...corte.colocadas.map(t => t.pieza.ancho));
  return <>
    <p className="corte-ayuda">Piezas en horizontal · La colocación en el rollo se conserva en el DXF.</p>
    <svg role="img" aria-label={`Piezas del saco en horizontal · ${corte.material}`} className="corte-dibujo puerta-corte-dibujo"
      viewBox={`-2 -2 ${ancho + 4} ${alto}`}>
      {piezas.map(({ base, entidades }, i) => <g key={i} transform={`translate(0 ${base})`}>
        <TrazosCorte entidades={entidades} factorMm={10}/>
      </g>)}
    </svg>
  </>;
}


/** Ancho real ocupado en el rollo (mm) por las piezas colocadas, tal como se dibujan. */
export function anchoOcupadoCorte(corte: CortePuertas): number {
  const c = presentarImpresionAraujo(corte);
  const maxY = Math.max(0, ...c.colocadas.map(p => p.y + 10 * (p.girada ? p.pieza.ancho : p.pieza.alto)));
  return Math.round(maxY * 100) / 100;
}

/** Cabecera en mm con las medidas reales ocupadas y el ancho del rollo. */
export function textoCabeceraCorte(corte: CortePuertas): string {
  const ocupado = anchoOcupadoCorte(corte);
  if (ocupado <= 0) return `Rollo de ${numeroPuerta(corte.anchoRollo)} mm · ${numeroPuerta(corte.largo)} mm`;
  return `Ocupa ${numeroPuerta(corte.largo)} × ${numeroPuerta(ocupado)} mm · rollo de ${numeroPuerta(corte.anchoRollo)} mm`;
}

type TextoCorte = CortePuertas['entidades']['textos'][number];

function cajaTextoCorte(t: TextoCorte): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const etiqueta = textoMedidasMm(t.valor);
  const ancho = anchoArial(etiqueta, t.h);
  if (t.giro) {
    return t.centrado
      ? { xMin: t.x - t.h / 2, xMax: t.x + t.h / 2, yMin: t.y - ancho / 2, yMax: t.y + ancho / 2 }
      : { xMin: t.x - t.h, xMax: t.x + t.h, yMin: t.y, yMax: t.y + ancho };
  }
  return t.centrado
    ? { xMin: t.x - ancho / 2, xMax: t.x + ancho / 2, yMin: t.y - t.h / 2, yMax: t.y + t.h / 2 }
    : { xMin: t.x, xMax: t.x + ancho, yMin: t.y - t.h * 0.25, yMax: t.y + t.h };
}

/**
 * Calcula los textos recolocados (si el rótulo del material flotaba encima del rollo vacío) y la caja exacta
 * del dibujo ajustado para que entren piezas, rótulos de material y textos sin espacio sobrante del rollo.
 */
export function geometriaCorteAjustado(corte: CortePuertas) {
  const c = presentarImpresionAraujo(corte);
  const ocupado = anchoOcupadoCorte(c);
  const extension = c.extensionDibujo ?? c.largo;

  // En clientes que colocan el bloque de títulos encima del rollo entero (todos los textos sobre lo ocupado
  // empiezan en y >= anchoRollo), bajar ese bloque junto a lo realmente ocupado para evitar espacio vacío.
  const sobreOcupado = ocupado > 0 && ocupado < c.anchoRollo
    ? c.entidades.textos.filter(t => t.y > ocupado)
    : [];
  const bloqueFlotando = sobreOcupado.length > 0 && sobreOcupado.every(t => t.y >= c.anchoRollo);
  let dySobreRollo = 0;
  if (bloqueFlotando) {
    const yMinSobre = Math.min(...sobreOcupado.map(t => t.y));
    const hRef = Math.max(...sobreOcupado.map(t => t.h));
    const yObjetivo = ocupado + hRef * 0.6;
    if (yObjetivo < yMinSobre) dySobreRollo = yObjetivo - yMinSobre;
  }

  const textos = dySobreRollo < 0
    ? c.entidades.textos.map(t => (t.y > ocupado ? { ...t, y: t.y + dySobreRollo } : t))
    : c.entidades.textos;

  let xMin = 0;
  let xMax = extension;
  let yMin = 0;
  let yMax = ocupado > 0 ? ocupado : c.anchoRollo;

  for (const l of c.entidades.lineas) {
    xMin = Math.min(xMin, l.x1, l.x2);
    xMax = Math.max(xMax, l.x1, l.x2);
    yMin = Math.min(yMin, l.y1, l.y2);
    yMax = Math.max(yMax, l.y1, l.y2);
  }
  for (const a of c.entidades.arcos) {
    xMin = Math.min(xMin, a.x - a.r);
    xMax = Math.max(xMax, a.x + a.r);
    yMin = Math.min(yMin, a.y - a.r);
    yMax = Math.max(yMax, a.y + a.r);
  }
  for (const t of textos) {
    const caja = cajaTextoCorte(t);
    xMin = Math.min(xMin, caja.xMin);
    xMax = Math.max(xMax, caja.xMax);
    yMin = Math.min(yMin, caja.yMin);
    yMax = Math.max(yMax, caja.yMax);
  }

  const margen = Math.max(20, Math.min(xMax - xMin, yMax - yMin) * 0.04);
  return {
    corte: c,
    ocupado,
    textos,
    vista: {
      x: xMin - margen,
      y: -yMax - margen,
      ancho: xMax - xMin + 2 * margen,
      alto: yMax - yMin + 2 * margen,
    },
  };
}

/** `ajustado`: solo lo que ocupan las piezas y sus rótulos, sin el espacio vacío del resto del rollo. */
/** Todos los cortes de una ficha a la misma escala: el más largo ocupa el ancho entero y los demás su parte
 *  (Iván, 25/11/2026: un cristal de 1,5 m no puede salir tan grande como una lona de 12 m). */
export function largoReferenciaCortes(cortes: CortePuertas[]): number {
  return Math.max(0, ...cortes.map(c => geometriaCorteAjustado(c).vista.ancho));
}

export function DibujoCortePuertas({ corte, zoom = 1, ajustado = false, largoReferencia }: { corte: CortePuertas; zoom?: number; ajustado?: boolean; largoReferencia?: number }) {
  if (corte.opcion === 'saco-partido' && corte.material.trim().toUpperCase() === MATERIAL_SACO_AMARILLO
    && corte.colocadas.some(t => t.girada)) return <SacoPartidoHorizontal corte={corte} />;
  const { corte: c, ocupado, textos, vista } = geometriaCorteAjustado(corte);
  const alto = Math.max(c.anchoRollo + 430, ...c.entidades.textos.map(t => t.y + t.h + 20));
  const titulosAparte = c.extensionDibujo ? c.entidades.textos.filter(t => t.x >= c.largo + 1500).map(t => t.y + t.h) : [];
  const techo = Math.max(ocupado, ...titulosAparte);
  // El título del material va a 200 mm aunque el corte sea corto (un saco entero): la vista llega hasta donde acaba,
  // para que no se corte por la derecha. En SVG el tamaño es el del cuerpo, no el de las mayúsculas como en el DXF.
  const extension = c.extensionDibujo ?? c.largo;
  const derecha = Math.max(extension, ...c.entidades.textos.filter(t => !t.giro && !t.centrado).map(t => t.x + anchoArial(textoMedidasMm(t.valor), t.h * 0.716)));
  const textosPintar = ajustado ? textos : c.entidades.textos;
  const altoRollo = ajustado ? (ocupado > 0 ? ocupado : c.anchoRollo) : c.anchoRollo;
  const viewBox = ajustado
    ? `${vista.x} ${vista.y} ${vista.ancho} ${vista.alto}`
    : zoom > 1
      ? `0 ${-techo} ${extension} ${techo}`
      : `-100 ${-alto} ${derecha + 200} ${alto + 100}`;
  return (
    <svg
      role="img"
      aria-label={`Corte ${c.material}`}
      className={`corte-dibujo puerta-corte-dibujo${ajustado ? ' is-ajustado' : ''}`}
      style={zoom > 1 ? { width: `${zoom * 100}%`, maxHeight: 'none' }
        : ajustado && largoReferencia ? { width: `${Math.min(100, Math.max(30, vista.ancho / largoReferencia * 100))}%` } : undefined}
      viewBox={viewBox}
    >
      <rect className="corte-rollo" width={c.largo} height={altoRollo} y={-altoRollo} />
      <TrazosCorte entidades={{ ...c.entidades, textos: textosPintar }} />
    </svg>
  );
}

/** Con el recuadro CORTE del plano que escribiría la web (cotas y orden del corte real). */
type DatosVista = VistaPuertas & { cortesPlano?: Omit<CorteDelPlanoCliente, 'archivo'>[] };
type EstadoVista = { entrada: string; datos?: DatosVista; error?: string; cargando?: boolean };
export type VistaCorte = { actual: EstadoVista | null; anticuada: boolean; calcular: () => Promise<void> };

/** El corte del pedido, calculado solo al cambiar los datos (Iván, 26/10/2026: «que salga ya el corte tal cual, con
 * los cristales y sacos; así no hay que andar bajando»). Lo comparten el resumen junto al alzado y la vista grande. */
export function useVistaCortePuertas(pedido: PedidoPuertas, activo: boolean): VistaCorte {
  const entrada = JSON.stringify(pedido), solicitud = useRef<AbortController | null>(null);
  const [vista, setVista] = useState<EstadoVista | null>(null);
  const actual = vista?.entrada === entrada ? vista : null;
  async function calcular() {
    solicitud.current?.abort(); const abortar = new AbortController(); solicitud.current = abortar;
    setVista({ entrada, cargando: true });
    try {
      const r = await fetch('/api/puertas/corte/vista-previa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: entrada, signal: abortar.signal });
      const datos = await r.json() as DatosVista & { error?: string };
      if (!r.ok) throw new Error(datos.error || 'No se pudo calcular el corte.');
      if (!abortar.signal.aborted) setVista({ entrada, datos });
    } catch (error) { if (!abortar.signal.aborted) setVista({ entrada, error: error instanceof Error ? error.message : 'No se pudo calcular el corte.' }); else setVista(v => v?.cargando ? null : v); }
  }
  // Se recalcula solo, un momento después de dejar de escribir.
  useEffect(() => {
    if (!activo || (vista?.entrada === entrada && vista.datos)) return;
    const espera = setTimeout(() => void calcular(), 600);
    return () => { clearTimeout(espera); solicitud.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrada, activo]);
  return { actual, anticuada: Boolean(vista && !actual), calcular };
}

const nombreOpcion = (c: CortePuertas) => c.opcion === 'saco-entero' ? ' · saco entero (alternativa)' : c.opcion === 'saco-partido' ? ' · saco en dos' : '';

/**
 * El corte junto al alzado. Iván, 26/11/2026: enseña lo que irá en el corte real, el recuadro CORTE del plano que
 * escribiría la web con estos datos, con sus cotas y en su orden, como la ficha del pedido. Si ese plano no tiene
 * recuadro, cada material con su rollo, uno debajo de otro.
 */
export function CorteResumen({ vista }: { vista: VistaCorte }) {
  const { actual } = vista;
  const cortesPlano = actual?.datos?.cortesPlano ?? [];
  return (
    <section className="puerta-corte-resumen panel panel-vidrio" aria-label="Corte del pedido" aria-busy={Boolean(actual?.cargando)}>
      <h2>Corte <span>{actual?.cargando ? 'calculando…' : actual?.datos && !cortesPlano.length ? `${actual.datos.cortes.length} ${actual.datos.cortes.length === 1 ? 'rollo' : 'rollos'}` : ''}</span>
        {/* Iván, 26/11/2026: rehacer el corte con el código de hoy sin tocar el DWG real ni guardar nada. */}
        <button type="button" className="ghost-button boton-3d puerta-corte-recalcular" disabled={Boolean(actual?.cargando)}
          title="Rehace el corte con la web actual. No guarda nada ni toca el DWG." onClick={() => void vista.calcular()}>
          <RefreshCw size={14} aria-hidden="true" />Recalcular corte
        </button></h2>
      {actual?.error && <p role="alert" className="corte-aviso">{actual.error}</p>}
      {actual?.datos && !actual.datos.cortes.length && <p className="puerta-ayuda">Completa las medidas y los anchos de rollo para colocar las piezas.</p>}
      {cortesPlano.length > 0
        ? <CortesDelPlano cortes={cortesPlano.map(c => ({ ...c, archivo: '' }))} />
        : actual?.datos?.cortes.map((c, i) => (
          <figure key={i}>
            <figcaption>{c.material}{nombreOpcion(c)} · {textoCabeceraCorte(c)}</figcaption>
            <DibujoCortePuertas corte={c} ajustado />
          </figure>
        ))}
    </section>
  );
}
