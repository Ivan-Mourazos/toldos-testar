import React, { useEffect, useState } from 'react';
import { FileDown, Scissors } from 'lucide-react';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import '../coordina/corte-lona.css';
import { CabeceraDocumento } from '../components/DocumentosPedido';

// El corte de lona de un pedido de remolques (20/10/2026), como saldrá al generar: por lona, el rollo
// con las piezas, los ollaos y las marcas, los metros de rollo y lo que hay que revisar. Lo que todavía
// no se sabe cortar sale como «a mano». Se calcula en el servidor (src/remolques/corte); aquí solo se ve.

type Linea = { capa: string; x1: number; y1: number; x2: number; y2: number };
type Texto = { capa: string; x: number; y: number; h: number; valor: string; centrado?: boolean; giro?: number };
type Circulo = { capa: string; x: number; y: number; r: number };
type Arco = { capa: string; x: number; y: number; r: number; desde: number; hasta: number };
export type EntidadesCorte = { lineas: Linea[]; textos: Texto[]; circulos: Circulo[]; arcos: Arco[] };

export type VistaCorteRemolques = {
  sinOf?: string[];
  avisos?: string[];
  cortes: Array<{
    nombre: string;
    material: string;
    largo: number;
    refuerzos: boolean;
    /** Con un contorno que no cabe en el rollo, cada una de las dos opciones (tira empatada o entera). */
    opcion?: string;
    elementos: Array<{ of: string; descripcion: string; cantidad: number }>;
    avisos: string[];
    entidades: EntidadesCorte;
  }>;
  aMano: Array<{ nombre: string; material: string; motivo: string; elementos: string[] }>;
};

/** Sin nada que cortar a máquina no salen «Abrir corte» ni «Confirmar corte»: la barra de arriba dice por qué. */
export const avisoCorteAMano = (vista: VistaCorteRemolques | null | undefined): string | null =>
  vista && !vista.cortes.length && vista.aMano.length ? `Se corta a mano: ${vista.aMano.map((a) => a.motivo).join('; ')}` : null;

export type PlanoCorte = { files: Array<{ filename: string }>; avisos: string[]; existentes?: string[] } | null;

/**
 * Escribe el plano del corte del pedido para revisarlo. Si ya está en su carpeta (quizá hecho a mano),
 * pregunta antes de sustituirlo (Iván, 20/10/2026). `null` si se conserva el que había.
 */
export async function escribirPlanoCorte(ruta: string, existentes: string[], preguntar: AskForConfirmation): Promise<PlanoCorte | 'conservado'> {
  const eleccion = await preguntar({
    title: 'Plano del corte',
    message: `El plano ${existentes.join(' · ')} ya está en su carpeta. ¿Sustituirlo por el de la web?`,
    confirmLabel: 'Sustituir plano',
    cancelLabel: 'Conservar el actual',
    tone: 'warning',
  });
  if (eleccion !== 'confirm') return 'conservado';
  const respuesta = await fetch(`${ruta}/plano-corte`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmOverwrite: true }),
  });
  const datos = await respuesta.json().catch(() => ({})) as { error?: string; planoCorte?: PlanoCorte };
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar el plano del corte.');
  return datos.planoCorte ?? null;
}

const ROLLO = 2500;
const metros = (mm: number) => (mm / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 });

export function CorteRemolques({ ruta, version, generado = false, notify, onConfirm, acciones }: { ruta: string; version: string; generado?: boolean; notify: Notify; onConfirm: AskForConfirmation; acciones?: React.ReactNode }) {
  // El resultado lleva para qué pedido y versión es: si cambian, se ve «Calculando…» hasta el nuevo.
  const clave = `${ruta}|${version}`;
  const [leido, setLeido] = useState<{ clave: string; datos?: VistaCorteRemolques; error?: string } | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`${ruta}/corte`, { cache: 'no-store' })
      .then(async (respuesta) => {
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudo calcular el corte de lona.');
        return datos as VistaCorteRemolques;
      })
      .then((datos) => { if (!cancelado) setLeido({ clave, datos }); })
      .catch((error) => { if (!cancelado) setLeido({ clave, error: error instanceof Error ? error.message : 'No se pudo calcular el corte de lona.' }); });
    return () => { cancelado = true; };
  }, [ruta, clave]);

  const [guardandoPlano, setGuardandoPlano] = useState(false);
  // El plano del corte para revisarlo antes de aprobar (también sale al guardar para revisión).
  async function guardarPlano() {
    setGuardandoPlano(true);
    try {
      const respuesta = await fetch(`${ruta}/plano-corte`, { method: 'POST' });
      const datos = await respuesta.json().catch(() => ({})) as { error?: string; existing?: string[]; planoCorte?: PlanoCorte };
      let planoCorte = datos.planoCorte ?? null;
      if (respuesta.status === 409 && datos.existing?.length) {
        const sustituido = await escribirPlanoCorte(ruta, datos.existing, onConfirm);
        if (sustituido === 'conservado') return;
        planoCorte = sustituido;
      } else if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar el plano del corte.');
      const planos = planoCorte?.files.map((fichero) => fichero.filename) ?? [];
      const avisos = planoCorte?.avisos ?? [];
      const mensaje = planos.length
        ? `Plano del corte guardado para revisar: ${planos.join(' · ')}.${avisos.length ? ` ${avisos.join(' ')}` : ''}`
        : avisos.join(' ') || 'Este pedido no tiene corte de lona que guardar.';
      notify(mensaje, { tone: planos.length ? 'success' : 'warning', title: 'Plano del corte' });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar el plano del corte.', { tone: 'error' });
    } finally {
      setGuardandoPlano(false);
    }
  }

  const estado = leido?.clave === clave ? leido : null;
  const datos = estado?.datos;
  if (datos && datos.cortes.length === 0) return null;
  return (
    <section className="corte-lona panel bloque-3d" aria-label="Corte" aria-busy={!estado}>
      <CabeceraDocumento titulo="Corte" icono={<Scissors aria-hidden="true" />}>
        {!generado && (
          <button className="ghost-button boton-3d" type="button" disabled={guardandoPlano || !datos?.cortes.length} onClick={() => void guardarPlano()}>
            <FileDown aria-hidden="true" />{guardandoPlano ? 'Guardando plano…' : 'Guardar plano para revisar'}
          </button>
        )}
      </CabeceraDocumento>
      <p className="corte-ayuda">El plano sale al guardar para revisión. El DXF se manda al bot con el botón de arriba.</p>
      {Boolean(datos?.cortes.length) && acciones}
      {!estado && <p className="corte-ayuda">Calculando el corte…</p>}
      {estado?.error && <p role="alert" className="corte-aviso">{estado.error}</p>}
      {datos && <CorteRemolquesVista datos={datos} />}
    </section>
  );
}

export function CorteRemolquesVista({ datos }: { datos: VistaCorteRemolques }) {
  return (
    <>
      {Boolean(datos.avisos?.length) && <ul className="corte-avisos">{datos.avisos!.map((aviso) => <li key={aviso}>{aviso}</li>)}</ul>}
      {datos.cortes.length === 0 && datos.aMano.length === 0 && <p className="corte-ayuda">Este pedido no tiene lona que cortar.</p>}
      {datos.aMano.length > 0 && (
        <ul className="corte-avisos">
          {datos.aMano.map((a) => <li key={a.nombre}>{`${a.material}: se corta a mano (${a.motivo}).`}</li>)}
        </ul>
      )}
      {datos.cortes.map((corte, i) => (
        <article className="corte-material" key={`${corte.nombre}-${i}`}>
          <header><h3>{corte.material}</h3><span>{`Rollo de 250 cm · ${corte.nombre}.dxf`}</span></header>
          {corte.opcion && <p className="corte-aviso">{corte.opcion.replace(' · ELEGIR SOLO UNA', '')} · las dos van en el mismo DXF y el técnico de la máquina elige una.</p>}
          {corte.avisos.length > 0 && <ul className="corte-avisos">{corte.avisos.map((aviso, i) => <li key={i}>{aviso}</li>)}</ul>}
          <section className="corte-opcion">
            <header><strong>{corte.refuerzos ? 'Con refuerzos en las esquinas' : 'Corte'}</strong><span><b>{metros(corte.largo)} m</b> de rollo</span></header>
            <DibujoCorteRemolques entidades={corte.entidades} largo={corte.largo} material={corte.material} />
            <small className="corte-leyenda"><span>DISCO1 · corte</span><span>ROTULADOR · ollaos y marcas</span></small>
            <p>{corte.elementos.map((e) => `OF ${e.of || '—'} · ${e.descripcion}${e.cantidad > 1 ? ` × ${e.cantidad}` : ''}`).join(' · ')}</p>
          </section>
        </article>
      ))}
    </>
  );
}

// El rollo visto desde arriba, en mm: y hacia arriba como en el DXF (en el SVG se le da la vuelta).
export function DibujoCorteRemolques({ entidades, largo, material }: { entidades: EntidadesCorte; largo: number; material: string }) {
  const { lineas, textos, circulos, arcos } = entidades;
  let maxX = largo, maxY = ROLLO, minX = 0, minY = 0;
  for (const l of lineas) { maxX = Math.max(maxX, l.x1, l.x2); maxY = Math.max(maxY, l.y1, l.y2); minX = Math.min(minX, l.x1, l.x2); minY = Math.min(minY, l.y1, l.y2); }
  for (const t of textos) { maxY = Math.max(maxY, t.y + t.h); maxX = Math.max(maxX, t.x); minY = Math.min(minY, t.y - t.h); }
  const margen = 120;
  // Los ollaos (2,5 mm) a su tamaño, salvo en cortes muy largos, donde se dejan en un punto que se vea.
  const radioOllao = (r: number) => Math.max(r, (maxX - minX + margen * 2) / 1500);
  const punto = (a: Arco, grados: number) => [a.x + a.r * Math.cos((grados * Math.PI) / 180), -(a.y + a.r * Math.sin((grados * Math.PI) / 180))];
  return (
    <svg className="corte-dibujo is-remolques" role="img" aria-label={`Vista del corte ${material}`}
      viewBox={`${minX - margen} ${-maxY - margen} ${maxX - minX + margen * 2} ${maxY - minY + margen * 2}`}>
      <rect x="0" y={-ROLLO} width={largo} height={ROLLO} className="corte-rollo" />
      {lineas.map((l, i) => <line key={i} x1={l.x1} y1={-l.y1} x2={l.x2} y2={-l.y2} className={l.capa === 'ROTULADOR' ? 'corte-marca' : 'corte-linea'} vectorEffect="non-scaling-stroke" />)}
      {arcos.map((a, i) => {
        const [x0, y0] = punto(a, a.desde), [x1, y1] = punto(a, a.hasta);
        const grande = ((a.hasta - a.desde + 360) % 360) > 180 ? 1 : 0;
        return <path key={i} d={`M${x0} ${y0} A${a.r} ${a.r} 0 ${grande} 0 ${x1} ${y1}`} className="corte-linea" vectorEffect="non-scaling-stroke" />;
      })}
      {circulos.map((c, i) => <circle key={i} cx={c.x} cy={-c.y} r={radioOllao(c.r)} className="corte-marca" vectorEffect="non-scaling-stroke" />)}
      {textos.filter((t) => t.capa !== 'ROTULADOR').map((t, i) => (
        <text key={i} x={t.x} y={-t.y} fontSize={t.h} textAnchor={t.centrado ? 'middle' : 'start'} transform={t.giro ? `rotate(${-t.giro} ${t.x} ${-t.y})` : undefined}>{t.valor}</text>
      ))}
    </svg>
  );
}
