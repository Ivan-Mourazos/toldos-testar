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

export function BotonMandarMaquina({ ruta, cuerpo, onEnviado }: { ruta: string; cuerpo?: () => Promise<Record<string, unknown>>; onEnviado?: (envio: EnvioMaquina) => void }) {
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
    <button type="button" className="ghost-button boton-3d" disabled={Boolean(motivo) || ocupado} title={motivo || undefined} onClick={() => void mandar()}>{ocupado ? 'Mandando…' : 'Mandar a la máquina de corte'}</button>
    {motivo && <small>{motivo}</small>}
  </div>;
}

export function AccionesCorteMaquina({ ruta, codigo, onEnviado }: { ruta: string; codigo: string; onEnviado?: () => void }) {
  const { notify } = useContext(CorteMaquinaContexto);
  const [ocupado, setOcupado] = useState(false);
  async function descargar(tipo: 'cmt' | 'dxf') {
    setOcupado(true);
    try {
      const respuesta = await fetch(`${ruta}/${tipo === 'cmt' ? 'cmt' : 'descargar/dxf'}`, { cache: 'no-store' });
      if (!respuesta.ok) {
        const texto = await respuesta.text();
        let mensaje = texto;
        try { mensaje = JSON.parse(texto).error || texto; } catch { /* Las dudas del CMT llegan en texto llano. */ }
        throw new Error(mensaje);
      }
      const url = URL.createObjectURL(await respuesta.blob());
      const enlace = document.createElement('a'); enlace.href = url; enlace.download = `${codigo}.${tipo}`;
      document.body.append(enlace); enlace.click(); enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo descargar el corte.', { tone: 'error' }); }
    finally { setOcupado(false); }
  }
  return <div className="corte-maquina-acciones" aria-label="Archivos del corte">
    <button type="button" className="ghost-button boton-3d" disabled={ocupado} onClick={() => void descargar('dxf')}>Descargar DXF</button>
    <button type="button" className="ghost-button boton-3d" disabled={ocupado} onClick={() => void descargar('cmt')}>Descargar CMT</button>
    <BotonMandarMaquina ruta={ruta + '/enviar'} onEnviado={onEnviado} />
  </div>;
}
