import React, { useState } from 'react';
import { BotonAbrirCorteRevisado, BotonesFlujoCorte, useFlujoCorteDwg } from './flujoCorteDwg';
import { guardarToldosEditable } from './toldosEditable';
import { abrirCorteDwg } from './abrirCorte';
import type { AskForConfirmation, Notify } from './components/NotificationCenter';

/** Puertas y remolques conservan su plano y adaptan únicamente sus datos y rutas. */
export function useCortePedidoEditable({ tipo, pedido, cuerpo, falta, aplica = true, usuario, notify, preguntar, onChanged }: {
  tipo: 'puertas' | 'remolques'; pedido: { orderCode: string; status: string; corteConfirmado?: unknown; corteSimulado?: boolean } | null;
  cuerpo: Record<string, unknown>; falta: string | null; aplica?: boolean; usuario: string; notify: Notify; preguntar: AskForConfirmation; onChanged?: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const base = `/api/${tipo}/borrador-corte`;
  const codigo = pedido?.orderCode ?? '';
  const ruta = `/api/${tipo}/pedidos/${encodeURIComponent(codigo)}`;
  const flujo = useFlujoCorteDwg({ base, codigo, entrada: JSON.stringify(cuerpo), cuerpo: () => cuerpo, falta, usuario, notify,
    askForConfirmation: preguntar, activo: Boolean(pedido && aplica && !pedido.corteConfirmado), aplica, editable: true });
  async function regenerar() {
    if (!pedido || !usuario || ocupado) return;
    setOcupado(true);
    try {
      const datos = await guardarToldosEditable({ ...cuerpo, savedBy: usuario, decisionCorte: 'regenerar' }, preguntar,
        () => abrirCorteDwg({ ruta: base, orderCode: codigo, cuerpo, usuario, preguntar, notify, editable: true }), `/api/${tipo}/pedidos`);
      if (!datos) return;
      onChanged?.();
      await flujo.refrescar();
      notify('Corte guardado con el pedido.', { tone: 'success' });
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo guardar el corte.', { tone: 'error' }); }
    finally { setOcupado(false); }
  }
  const abrir = !aplica ? null : pedido?.corteConfirmado && !pedido.corteSimulado
    ? <BotonAbrirCorteRevisado ruta={`${ruta}/corte-dwg`} notify={notify} />
    : <BotonesFlujoCorte flujo={flujo} ocupado={ocupado} />;
  return { ocupado, abrir, regenerar };
}
