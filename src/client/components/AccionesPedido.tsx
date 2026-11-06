import React, { useState } from 'react';
import { Factory, PencilLine, RefreshCw } from 'lucide-react';
import { CORTE_NO_REGENERADO } from '../../toldosEditable.js';
import { avisoParaEditar, regenerarCortePedido } from '../toldosEditable';
import type { CoordinaStatus } from '../types';
import type { AskForConfirmation } from './NotificationCenter';
import '../coordina/flujo-editable.css';
import { entregasPedido, numeroEntrega, ofsEntrega } from '../../entregas.js';
import type { EntregaPedido } from '../../entregasTipos';

/** El mismo orden y la misma barra para las tres familias de pedidos. */
export function AccionesPedido({ generado, ocupado, editandoPermitido, onEditar, elementos, coordina, preguntar, abrir,
  regenerar, generar, enviando, generarPermitido, motivoGenerar, envios, reutilizar }: {
  generado: boolean; ocupado: boolean; editandoPermitido: boolean; onEditar: () => void;
  elementos: { of: string }[]; coordina: CoordinaStatus | null; preguntar: AskForConfirmation;
  abrir?: React.ReactNode; regenerar?: () => void; generar: () => void; enviando?: boolean;
  generarPermitido: boolean; motivoGenerar: string; envios?: React.ReactNode; reutilizar?: React.ReactNode;
}) {
  const [consultando, setConsultando] = useState(false);
  async function editar() {
    setConsultando(true);
    try {
      const aviso = await avisoParaEditar(elementos, coordina);
      if (aviso && await preguntar({ title: 'Editar un pedido aprobado', message: aviso,
        confirmLabel: 'Editar pedido', cancelLabel: 'Cancelar', tone: 'warning' }) !== 'confirm') return;
      onEditar();
    } finally { setConsultando(false); }
  }
  return <div className="review-reader-actions" aria-label="Acciones del pedido">
    {editandoPermitido && <button className="ghost-button boton-3d" type="button" disabled={ocupado || consultando} onClick={() => void editar()}>
      <PencilLine aria-hidden="true" />Corregir
    </button>}
    {abrir}
    {!generado && regenerar && <button className="ghost-button boton-3d" type="button" disabled={ocupado} onClick={() => void regenerarCortePedido(preguntar, regenerar)}>
      <RefreshCw aria-hidden="true" />Regenerar corte
    </button>}
    {!generado && <button className="primary-button boton-3d review-generate-button" type="button" disabled={ocupado || !generarPermitido}
      title={!generarPermitido ? motivoGenerar : undefined} onClick={generar}>
      <Factory aria-hidden="true" />{enviando ? 'Generando…' : 'Generar archivos'}
    </button>}
    {envios}{generado && reutilizar}
    {!generado && !generarPermitido && motivoGenerar && <span className="review-generate-note">{motivoGenerar}</span>}
  </div>;
}

/** Marco de la ficha: cabecera, acciones y estado del corte iguales en todos los productos. */
export function CabeceraPedidoGuardado({ volver, titulo, datos, acciones, corteNoRegenerado, corteSimulado, pedido }: {
  volver: React.ReactNode; titulo: React.ReactNode; datos: string; acciones: React.ReactNode;
  corteNoRegenerado?: boolean; corteSimulado?: boolean;
  pedido?: { orderCode: string; status: string };
}) {
  return <>
    <header className="review-reader-header">{volver}<div className="review-reader-title"><h2>{titulo}</h2><small>{datos}</small></div>{acciones}</header>
    {pedido && <EntregasPedido pedido={pedido} />}
    {corteNoRegenerado && <p role="status" className="review-state-note aviso-flujo-editable">{CORTE_NO_REGENERADO}</p>}
    {corteSimulado && <p role="status" className="review-state-note aviso-flujo-editable">Corte calculado en simulación; no se ha escrito ningún plano.</p>}
  </>;
}

export function EntregasPedido({ pedido }: { pedido: { orderCode: string; status: string } }) {
  const entregas = entregasPedido(pedido) as EntregaPedido[];
  return <section className="entregas-pedido bloque-3d" aria-label="Entregas del pedido">
    <strong>{`Entrega ${numeroEntrega(pedido)}${pedido.status === 'PRODUCED' ? ' · Generada' : ' · En curso'}`}</strong>
    {pedido.status !== 'PRODUCED' && <p>{ofsEntrega(pedido).length ? `OF de esta entrega: ${ofsEntrega(pedido).join(', ')}` : 'No hay OF nuevas o cambiadas para generar.'}</p>}
    {entregas.length > 0 && <table><thead><tr><th>Entrega</th><th>OF generadas</th><th>Fecha y autor</th><th>Archivos</th></tr></thead><tbody>
      {entregas.map(e => <tr key={e.numero}><td>{e.numero}</td><td>{e.ofs.join(', ')}</td>
        <td>{new Date(e.fecha).toLocaleString('es-ES')} · {e.autor || 'Sin autor registrado'}</td>
        <td>{e.archivos.filter((a, i, todos) => todos.findIndex(b => (b.archivedFilename || b.filename) === (a.archivedFilename || a.filename)) === i).map((a, i) => {
          const copias = e.archivos.filter(b => (b.archivedFilename || b.filename) === (a.archivedFilename || a.filename));
          return <span className="entrega-archivo" key={i} title={copias.map(f => f.savedPath).join('\n')}>
            {a.archivedFilename || a.filename}{copias.length > 1 ? ` · ${copias.length} copias` : ''}
          </span>;
        })}</td></tr>)}
    </tbody></table>}
  </section>;
}
