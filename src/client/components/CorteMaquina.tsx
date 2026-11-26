import React, { createContext, useContext, useState } from 'react';
import type { WorkflowSettings } from '../types';
import type { AskForConfirmation, Notify } from './NotificationCenter';
import { ejecutarSalidaPedido } from '../salidaPedido';

export interface EnvioMaquina { usuario: string; fecha: string }
export const CorteMaquinaContexto = createContext<{ settings: WorkflowSettings | null; usuario: string; preguntar: AskForConfirmation; notify: Notify }>({
  settings: null, usuario: '', preguntar: async () => 'cancel', notify: () => {},
});

export function motivoMaquina(settings: WorkflowSettings | null, usuario: string) {
  if (!settings?.corteDirectoEnabled || !settings.corteMaquinaDxfDirectory || !settings.corteMaquinaCmtDirectory) return 'Envío directo a la máquina sin activar en Configuración';
  if (!usuario) return 'Elige quién eres en «Soy» antes de mandar el corte';
  if (!settings.productionEnabled) return 'Modo simulación: el envío a la máquina está deshabilitado';
  return '';
}

/** `principal`: el botón amarillo, para cuando mandar a la máquina es el paso que toca (Planos a corte, Iván 24/11/2026). */
export function BotonMandarMaquina({ ruta, cuerpo, onEnviado, principal = false }: { ruta: string; cuerpo?: () => Promise<Record<string, unknown>>; onEnviado?: (envio: EnvioMaquina) => void; principal?: boolean }) {
  const { settings, usuario, preguntar, notify } = useContext(CorteMaquinaContexto);
  const [ocupado, setOcupado] = useState(false);
  const motivo = motivoMaquina(settings, usuario);
  async function mandar() {
    setOcupado(true);
    try {
      await ejecutarSalidaPedido({ ruta, usuario, preguntar, notify, maquina: true, bot: true,
        cuerpo: { ...await cuerpo?.(), destino: 'maquina' }, terminado: () => {}, recibido: datos => {
          if (datos.envio) onEnviado?.(datos.envio as EnvioMaquina);
        } });
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo leer el DXF.', { tone: 'error' }); }
    finally { setOcupado(false); }
  }
  return <div className="cmt-mandar">
    <button type="button" className={`${principal ? 'primary-button' : 'ghost-button'} boton-3d`} disabled={Boolean(motivo) || ocupado} title={motivo || undefined} onClick={() => void mandar()}>{ocupado ? 'Mandando…' : 'Mandar a la máquina de corte'}</button>
    {motivo && <small>{motivo}</small>}
  </div>;
}

// En la ficha solo «Mandar a la máquina»: descargar el DXF y el CMT ahí no pinta nada (Iván, 26/11/2026).
export function AccionesCorteMaquina({ ruta, onEnviado }: { ruta: string; codigo?: string; onEnviado?: () => void }) {
  return <div className="corte-maquina-acciones" aria-label="Archivos del corte">
    <BotonMandarMaquina ruta={ruta + '/enviar'} onEnviado={onEnviado} />
  </div>;
}
