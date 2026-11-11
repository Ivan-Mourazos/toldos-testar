import { controlLabel } from './controlLabels';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { EstadoBotContexto, estadoEnvioBot } from './SemaforoBot';
import type { EnvioCorte } from '../../corteEnviosTipos';
import { CARPETA_TECNICO } from '../../corteTecnicos.js';
import { authorNames } from '../../reviewRules.js';
import { carpetaLegible } from './enviosCorteTexto';

/** El historial conserva el destino real y los nombres publicados. */
export function HistorialEnvios({ envios = [], motivo }: { envios?: EnvioCorte[]; motivo?: string }) {
  const bot = useContext(EstadoBotContexto);
  if (!envios.length && !motivo) return null;
  return <div className="corte-envios">
    {motivo && <p className="corte-ayuda">{motivo}</p>}
    {envios.length > 0 && <div className="corte-envios-historial" role="status"><strong>Envíos del corte</strong>
      <ul>{envios.map((e, i) => <li key={e.id}><span>{`Envío ${e.numero ?? i + 1} · Entrega ${e.entrega ?? 1} · `}{new Date(e.fecha).toLocaleString('es-ES')} · {controlLabel(e.usuario)} · {e.destino === 'bot' ? 'Bot' : 'DXFs'}{e.parcial ? ' · Envío incompleto: revisarlo antes de repetir' : ''}{e.nota ? ` · ${e.nota}` : ''}</span><EstadoEnvio estado={estadoEnvioBot(e, bot)} /><small title={e.carpeta}>{carpetaLegible(e.carpeta)} · {e.archivos.map(a => a.filename).join(' · ')}</small></li>)}</ul>
    </div>}
  </div>;
}

function EstadoEnvio({ estado }: { estado: 'en-cola' | 'recogido' | null }) {
  if (!estado) return null;
  return <b className={`corte-envio-bot es-${estado}`}>{estado === 'recogido' ? 'Recogido por el bot' : 'En cola del bot'}</b>;
}

export type DestinoDxf = 'bot' | 'dxfs' | 'descarga';
export const DESTINOS_DXF = [
  { valor: 'bot', etiqueta: 'Bot (carpeta del técnico)' },
  { valor: 'dxfs', etiqueta: 'Carpeta DXFs del año' },
  { valor: 'descarga', etiqueta: 'Descargar en mi PC' },
] as const;

export function SelectorDestinoDxf({ destino, elegir, tecnico, elegirTecnico, tecnicoPedido }: {
  destino: DestinoDxf; elegir: (d: DestinoDxf) => void; tecnico: string; elegirTecnico: (t: string) => void; tecnicoPedido: string;
}) {
  return <>
    <label htmlFor="destino-dxf">Destino del DXF</label>
    <select id="destino-dxf" value={destino} onChange={e => elegir(e.target.value as DestinoDxf)}>
      {DESTINOS_DXF.map(d => <option key={d.valor} value={d.valor}>{d.etiqueta}</option>)}
    </select>
    {destino === 'bot' && <><label htmlFor="tecnico-dxf">Carpeta del técnico</label><select id="tecnico-dxf" value={tecnico} onChange={e => elegirTecnico(e.target.value)}>
      <option value="">Técnico del pedido · {controlLabel(tecnicoPedido)}</option>
      {Object.entries(CARPETA_TECNICO).map(([nombre, carpeta]) => <option key={nombre} value={nombre}>{controlLabel(nombre)} · {carpeta}</option>)}
    </select></>}
  </>;
}

/** El destino y la carpeta se eligen antes de pedir permiso para cortar. */
export function EnviosCorte({ tecnicoPedido, descarga, enviar, cancelar }: {
  tecnicoPedido: string; descarga: string; enviar: (destino: 'bot' | 'dxfs', tecnico?: string) => void; cancelar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [destino, elegir] = useState<DestinoDxf>('bot');
  const [tecnico, elegirTecnico] = useState('');
  useEffect(() => { dialogo.current?.showModal(); }, []);
  return <dialog ref={dialogo} className="destino-entrega destino-dxf bloque-3d" aria-labelledby="titulo-destino-dxf" onCancel={cancelar}>
    <h2 id="titulo-destino-dxf">DXF de corte</h2>
    <SelectorDestinoDxf destino={destino} elegir={elegir} tecnico={tecnico} elegirTecnico={elegirTecnico} tecnicoPedido={authorNames(tecnicoPedido).at(-1) || tecnicoPedido} />
    <footer><button type="button" className="ghost-button boton-3d" onClick={cancelar}>Cancelar</button>
      {destino === 'descarga' ? <a className="primary-button boton-3d" href={descarga} download onClick={cancelar}>Descargar en mi PC</a>
        : <button type="button" className="primary-button boton-3d" onClick={() => enviar(destino, tecnico || undefined)}>{destino === 'bot' ? 'Mandar al bot' : 'Guardar DXF'}</button>}
    </footer>
  </dialog>;
}
