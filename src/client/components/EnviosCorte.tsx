import React, { useState } from 'react';
import { Download, FolderDown, Send } from 'lucide-react';
import type { EnvioCorte } from '../../corteEnviosTipos';
import type { AskForConfirmation, Notify } from './NotificationCenter';

/** Las mismas acciones y preguntas para todos los productos que envíen un corte. */
export function EnviosCorte({ ruta, usuario, permitido, motivo, ocupado = false, envios = [], descarga, descargaSeparada, notify, preguntar }: {
  ruta: string; usuario: string; permitido: boolean; motivo?: string; ocupado?: boolean; envios?: EnvioCorte[];
  descarga?: string; descargaSeparada?: string; notify: Notify; preguntar: AskForConfirmation;
}) {
  const [trabajando, setTrabajando] = useState(false);
  const [historial, setHistorial] = useState<EnvioCorte[] | null>(null);
  async function enviar(destino: 'bot' | 'dxfs') {
    if (trabajando || ocupado || !permitido) return;
    setTrabajando(true);
    try {
      if (destino === 'bot' && await preguntar({ title: 'Mandar corte al bot', message: 'El corte irá al bot y se cortará. ¿Seguro?',
        confirmLabel: 'Mandar corte al bot', cancelLabel: 'Cancelar', tone: 'danger' }) !== 'confirm') return;
      let confirmOverwrite = false;
      for (;;) {
        const res = await fetch(`${ruta}/enviar`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario, destino, confirmBot: destino === 'bot', confirmOverwrite }) });
        const datos = await res.json();
        if (res.status === 409 && datos.needsConfirmation && !confirmOverwrite) {
          if (await preguntar({ title: 'El DXF ya existe', message: 'Ya hay un DXF de este pedido. ¿Quieres sustituirlo?',
            details: [datos.carpeta, ...(datos.existing || [])].filter(Boolean), confirmLabel: 'Sustituir DXF', cancelLabel: 'Conservar el actual', tone: 'warning' }) !== 'confirm') return;
          confirmOverwrite = true;
          continue;
        }
        if (!res.ok) throw new Error(datos.error || 'No se pudo guardar el corte.');
        setHistorial(datos.enviosCorte);
        notify(destino === 'bot' ? 'Corte mandado al bot.' : 'DXF guardado en DXFs.', { tone: 'success' });
        return;
      }
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo guardar el corte.', { tone: 'error' }); }
    finally { setTrabajando(false); }
  }
  const registros = historial ?? envios;
  return <div className="corte-envios" aria-label="Envíos del corte" aria-busy={trabajando}>
    <div className="corte-envios-acciones">
      <button type="button" className="primary-button boton-3d" disabled={!permitido || ocupado || trabajando} title={motivo} onClick={() => void enviar('bot')}><Send size={16} aria-hidden="true" />Mandar corte al bot</button>
      <button type="button" className="ghost-button boton-3d" disabled={!permitido || ocupado || trabajando} title={motivo} onClick={() => void enviar('dxfs')}><FolderDown size={16} aria-hidden="true" />Guardar DXF en DXFs</button>
      {descarga && <a className="ghost-button boton-3d" href={descarga} download><Download size={16} aria-hidden="true" />Descargar DXF{descargaSeparada ? ' · con sacos' : ''}</a>}
      {descargaSeparada && <a className="ghost-button boton-3d" href={descargaSeparada} download><Download size={16} aria-hidden="true" />Descargar DXF · trozo separado</a>}
    </div>
    {descargaSeparada && <p className="corte-ayuda">Al mandar al bot o guardar en DXFs salen las dos opciones en archivos separados. Cada archivo incluye todas las telas del pedido.</p>}
    {!permitido && motivo && <p className="corte-ayuda">{motivo}</p>}
    {registros.length > 0 && <div className="corte-envios-historial" role="status"><strong>Envíos del corte</strong>
      <ul>{registros.map((e) => <li key={e.id}><span>{new Date(e.fecha).toLocaleString('es-ES')} · {e.usuario} · {e.destino === 'bot' ? 'Bot' : 'DXFs'}{e.parcial ? ' · Envío incompleto: revisarlo antes de repetir' : ''}</span><small>{e.carpeta} · {e.archivos.map((a) => a.filename).join(' · ')}</small></li>)}</ul>
    </div>}
  </div>;
}
