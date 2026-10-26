import React, { useState } from 'react';
import { Download, FileText, FolderDown, Send } from 'lucide-react';
import type { EnvioCorte } from '../../corteEnviosTipos';
import type { AskForConfirmation, Notify } from './NotificationCenter';
import { carpetaLegible, mensajeEnvio } from './enviosCorteTexto';

/** Las mismas acciones y preguntas para todos los productos que envíen un corte. */
export function EnviosCorte({ ruta, usuario, permitido, motivo, ocupado = false, envios = [], descarga, conPdf = false, notify, preguntar }: {
  ruta: string; usuario: string; permitido: boolean; motivo?: string; ocupado?: boolean; envios?: EnvioCorte[];
  descarga?: string;
  /** El producto saca el PDF de las presentaciones al mandar al bot (puertas): ya mandado, «Volver a mandar el corte» y «Rehacer el PDF». */
  conPdf?: boolean;
  notify: Notify; preguntar: AskForConfirmation;
}) {
  const [trabajando, setTrabajando] = useState(false);
  const [historial, setHistorial] = useState<EnvioCorte[] | null>(null);
  async function enviar(destino: 'bot' | 'dxfs', sinPdf = false) {
    if (trabajando || ocupado || !permitido) return;
    setTrabajando(true);
    try {
      if (destino === 'bot' && await preguntar({ title: sinPdf ? 'Volver a mandar el corte' : 'Mandar corte al bot',
        message: sinPdf ? 'Se lee el DWG tal como está ahora y el corte vuelve al bot. El PDF no se toca. ¿Seguro?' : 'El corte irá al bot y se cortará. ¿Seguro?',
        confirmLabel: sinPdf ? 'Volver a mandar el corte' : 'Mandar corte al bot', cancelLabel: 'Cancelar', tone: 'danger' }) !== 'confirm') return;
      let confirmOverwrite = false, aceptarCambioCorte = false, pdfModo: 'sustituir' | 'siguiente' | undefined;
      for (;;) {
        const res = await fetch(`${ruta}/enviar`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario, destino, confirmBot: destino === 'bot', confirmOverwrite, aceptarCambioCorte, pdfModo, sinPdf }) });
        const datos = await res.json();
        // Flujo del DWG, fase 4: ya hay un PDF de presentaciones de este pedido que no hizo la web.
        if (res.status === 409 && datos.pdfExiste && !pdfModo) {
          const eleccion = await preguntar({ title: 'PDF de las presentaciones', message: datos.error || 'Ya hay un PDF de este pedido.',
            confirmLabel: `Otra parte: guardar como ${datos.siguiente}`, alternativeLabel: `Es lo mismo: sustituir ${datos.existente}`,
            alternativeTone: 'neutral', cancelLabel: 'Cancelar', tone: 'warning' });
          if (eleccion === 'confirm') pdfModo = 'siguiente';
          else if (eleccion === 'alternative') pdfModo = 'sustituir';
          else return;
          continue;
        }
        // Flujo del DWG: el corte del DWG cambió después de confirmarlo y revisarlo.
        if (res.status === 409 && datos.cambioCorte && !aceptarCambioCorte) {
          if (await preguntar({ title: 'El corte ha cambiado', message: datos.error || 'El corte del DWG ha cambiado desde que se revisó.',
            confirmLabel: 'Mandarlo con los cambios', cancelLabel: 'Cancelar', tone: 'warning' }) !== 'confirm') return;
          aceptarCambioCorte = true;
          continue;
        }
        if (res.status === 409 && datos.needsConfirmation && !confirmOverwrite) {
          if (await preguntar({ title: 'El DXF ya existe', message: 'Ya hay un DXF de este pedido. ¿Quieres sustituirlo?',
            details: [datos.carpeta, ...(datos.existing || [])].filter(Boolean), confirmLabel: 'Sustituir DXF', cancelLabel: 'Conservar el actual', tone: 'warning' }) !== 'confirm') return;
          confirmOverwrite = true;
          continue;
        }
        if (!res.ok) throw new Error(datos.error || 'No se pudo guardar el corte.');
        setHistorial(datos.enviosCorte);
        const ultimo = (datos.enviosCorte as EnvioCorte[] | undefined)?.at(-1);
        notify(ultimo ? mensajeEnvio(destino, ultimo.carpeta, ultimo.archivos.map((a) => a.filename)) : destino === 'bot' ? 'Corte mandado al bot.' : 'DXF guardado en DXFs.', { tone: 'success' });
        if (datos.presentaciones?.filename) notify(`Presentaciones guardadas en PDF: ${datos.presentaciones.filename}.`, { tone: 'success', title: 'Presentaciones' });
        for (const aviso of (datos.avisos as string[] | undefined) ?? []) notify(aviso, { tone: 'warning' });
        return;
      }
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo guardar el corte.', { tone: 'error' }); }
    finally { setTrabajando(false); }
  }
  // «Rehacer el PDF» (Iván, 26/10/2026): solo las presentaciones del DWG actual, sin mandar nada al bot.
  async function rehacerPdf() {
    if (trabajando || ocupado) return;
    setTrabajando(true);
    try {
      let pdfModo: 'sustituir' | 'siguiente' | undefined;
      for (;;) {
        const res = await fetch(`${ruta}/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, pdfModo }) });
        const datos = await res.json();
        if (res.status === 409 && datos.pdfExiste && !pdfModo) {
          const eleccion = await preguntar({ title: 'PDF de las presentaciones', message: datos.error || 'Ya hay un PDF de este pedido.',
            confirmLabel: `Otra parte: guardar como ${datos.siguiente}`, alternativeLabel: `Es lo mismo: sustituir ${datos.existente}`,
            alternativeTone: 'neutral', cancelLabel: 'Cancelar', tone: 'warning' });
          if (eleccion === 'confirm') pdfModo = 'siguiente'; else if (eleccion === 'alternative') pdfModo = 'sustituir'; else return;
          continue;
        }
        if (!res.ok) throw new Error(datos.error || 'No se pudo hacer el PDF.');
        notify(`PDF de las presentaciones rehecho: ${datos.presentaciones?.filename ?? ''}.`, { tone: 'success', title: 'Presentaciones' });
        for (const aviso of (datos.avisos as string[] | undefined) ?? []) notify(aviso, { tone: 'warning' });
        return;
      }
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo hacer el PDF.', { tone: 'error' }); }
    finally { setTrabajando(false); }
  }
  const registros = historial ?? envios;
  const yaMandado = conPdf && registros.some((e) => e.destino === 'bot' && !e.parcial);
  return <div className="corte-envios" aria-label="Envíos del corte" aria-busy={trabajando}>
    <div className="corte-envios-acciones">
      {yaMandado ? <>
        <button type="button" className="primary-button boton-3d" disabled={!permitido || ocupado || trabajando} title={motivo ?? 'Lee el DWG tal como está ahora y manda solo el corte al bot; el PDF no se toca'} onClick={() => void enviar('bot', true)}><Send size={16} aria-hidden="true" />Volver a mandar el corte</button>
        <button type="button" className="ghost-button boton-3d" disabled={ocupado || trabajando} title="Solo el PDF de las presentaciones, del DWG actual; no manda nada al bot" onClick={() => void rehacerPdf()}><FileText size={16} aria-hidden="true" />Rehacer el PDF</button>
      </> : <button type="button" className="primary-button boton-3d" disabled={!permitido || ocupado || trabajando} title={motivo} onClick={() => void enviar('bot')}><Send size={16} aria-hidden="true" />Mandar corte al bot</button>}
      <button type="button" className="ghost-button boton-3d" disabled={!permitido || ocupado || trabajando} title={motivo} onClick={() => void enviar('dxfs')}><FolderDown size={16} aria-hidden="true" />Guardar DXF en DXFs</button>
      {descarga && <a className="ghost-button boton-3d" href={descarga} download><Download size={16} aria-hidden="true" />Descargar DXF</a>}
    </div>
    {!permitido && motivo && <p className="corte-ayuda">{motivo}</p>}
    {registros.length > 0 && <div className="corte-envios-historial" role="status"><strong>Envíos del corte</strong>
      <ul>{registros.map((e) => <li key={e.id}><span>{new Date(e.fecha).toLocaleString('es-ES')} · {e.usuario} · {e.destino === 'bot' ? 'Bot' : 'DXFs'}{e.parcial ? ' · Envío incompleto: revisarlo antes de repetir' : ''}{e.nota ? ` · ${e.nota}` : ''}</span><small title={e.carpeta}>{carpetaLegible(e.carpeta)} · {e.archivos.map((a) => a.filename).join(' · ')}</small></li>)}</ul>
    </div>}
  </div>;
}
