import React, { useState } from 'react';
import { Factory, PencilLine, RefreshCw } from 'lucide-react';
import { CORTE_NO_REGENERADO } from '../../toldosEditable.js';
import { avisoParaEditar, regenerarCortePedido } from '../toldosEditable';
import type { CoordinaStatus } from '../types';
import type { AskForConfirmation } from './NotificationCenter';
import '../coordina/flujo-editable.css';

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
    {!generado && editandoPermitido && <button className="ghost-button boton-3d" type="button" disabled={ocupado || consultando} onClick={() => void editar()}>
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
export function CabeceraPedidoGuardado({ volver, titulo, datos, acciones, corteNoRegenerado, corteSimulado }: {
  volver: React.ReactNode; titulo: React.ReactNode; datos: string; acciones: React.ReactNode;
  corteNoRegenerado?: boolean; corteSimulado?: boolean;
}) {
  return <>
    <header className="review-reader-header">{volver}<div className="review-reader-title"><h2>{titulo}</h2><small>{datos}</small></div>{acciones}</header>
    {corteNoRegenerado && <p role="status" className="review-state-note aviso-flujo-editable">{CORTE_NO_REGENERADO}</p>}
    {corteSimulado && <p role="status" className="review-state-note aviso-flujo-editable">Corte calculado en simulación; no se ha escrito ningún plano.</p>}
  </>;
}
