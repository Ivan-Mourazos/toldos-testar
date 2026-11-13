import type { DestinoEntrega } from '../entregasTipos';
import type { AskForConfirmation, Notify } from './components/NotificationCenter';
import { decidirCortePendiente } from './toldosEditable';

export interface SalidaPedido {
  ruta: string; usuario: string; preguntar: AskForConfirmation; notify: Notify;
  maquina?: boolean; recibido?: (datos: Record<string, unknown>) => void;
  cuerpo?: Record<string, unknown>; destinoEntrega?: DestinoEntrega; bot?: boolean;
  guardado?: { ruta: string; cuerpo: Record<string, unknown>; usuario: string };
  actualizado?: () => void;
  terminado: () => void;
}

/** Las preguntas siempre se resuelven en el servidor antes de publicar las salidas. */
export async function ejecutarSalidaPedido({ ruta, usuario, preguntar, notify, cuerpo, destinoEntrega, bot, maquina, guardado, actualizado, terminado, recibido }: SalidaPedido) {
  const entrada: Record<string, unknown> = { ...cuerpo, savedBy: usuario, usuario, destinoEntrega, confirmarEntrega: Boolean(destinoEntrega) };
  try {
    if (bot) {
      if (await preguntar({ title: maquina ? 'Mandar corte a la máquina' : 'Pasar el corte al bot', message: maquina ? 'Se mandarán el DXF y el CMT a la máquina de corte. Si ya se mandaron, volverán a salir. Comprueba el pedido antes de confirmar.' : 'El corte irá al bot y se cortará. Si ya se mandó, volverá a salir: la web no puede saber si ya se cortó.',
        confirmLabel: maquina ? 'Sí, mandar a la máquina' : 'Sí, mandar al bot', cancelLabel: 'Cancelar', tone: 'danger' }) !== 'confirm') return;
      entrada.confirmBot = true;
    }
    for (;;) {
      const respuesta = await fetch(ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entrada) });
      const datos = await respuesta.json();
      if (respuesta.status === 409 && datos.needsBotConfirmation) {
        if (await preguntar({ title: 'Confirmar el envío del corte', message: datos.error, confirmLabel: maquina ? 'Mandar a la máquina' : 'Mandar al bot', tone: 'danger' }) !== 'confirm') return;
        entrada.confirmBot = true; continue;
      }
      if (respuesta.status === 409 && datos.needsPrepararEntrega) {
        notify('Esta entrega necesita preparar su corte. Regenera el corte, revísalo y vuelve a pasar el pedido a producción.', { tone: 'warning' });
        return;
      }
      if (respuesta.status === 409 && datos.corteNoRegenerado && guardado) {
        const permiso = await decidirCortePendiente(datos, preguntar, guardado, actualizado);
        if (permiso === null) return;
        if (!permiso) { notify('Corte regenerado. Revísalo antes de continuar con la entrega.', { tone: 'info' }); return; }
        entrada.aceptarCorteNoRegenerado = permiso;
        continue;
      }
      if (respuesta.status === 409 && datos.cambioCorte) {
        if (await preguntar({ title: 'El corte ha cambiado', message: datos.error || 'El DWG ha cambiado desde que se revisó. Comprueba los cambios antes de aceptarlos.', confirmLabel: 'Aceptar los cambios', cancelLabel: 'Cancelar', tone: 'warning' }) !== 'confirm') return;
        entrada.aceptarHuellaCorte = datos.huella;
        entrada.aceptarCambioCorte = true;
        continue;
      }
      if (respuesta.status === 409 && datos.needsFabricConfirmation) {
        const decision = await preguntar({ title: 'Telas no acrílicas', message: 'Decide si deben incluirse en la reserva de material.',
          details: (datos.fabrics ?? []).map((f: { code: string; description: string }) => f.code + ' · ' + f.description), confirmLabel: 'Incluir en la reserva', alternativeLabel: 'No incluir', alternativeTone: 'neutral', cancelLabel: 'Cancelar', tone: 'warning' });
        if (decision !== 'confirm' && decision !== 'alternative') return;
        entrada.includeNonAcrylicFabrics = decision === 'confirm';
        continue;
      }
      if (respuesta.status === 409 && datos.pdfExiste) {
        const decision = await preguntar({ title: 'PDF de las presentaciones', message: datos.error,
          confirmLabel: 'Otra parte: guardar como ' + datos.siguiente, alternativeLabel: 'Es lo mismo: sustituir ' + datos.existente,
          alternativeTone: 'neutral', cancelLabel: 'Cancelar', tone: 'warning' });
        if (decision !== 'confirm' && decision !== 'alternative') return;
        entrada.pdfModo = decision === 'confirm' ? 'siguiente' : 'sustituir';
        continue;
      }
      if (respuesta.status === 409 && (datos.needsConfirmation || datos.needsEntregaConfirmation)) {
        if (await preguntar({ title: 'Sustituir archivos existentes', message: datos.error || 'Estos archivos ya existen. Comprueba la lista antes de sustituirlos.',
          details: [datos.carpeta, ...(datos.existing ?? [])].filter(Boolean), confirmLabel: 'Sustituir archivos', cancelLabel: 'Conservar los actuales', tone: 'danger' }) !== 'confirm') return;
        if (datos.needsEntregaConfirmation) entrada.confirmarEntrega = true;
        else if (datos.paso) entrada[String(datos.paso).startsWith('DXF') ? 'confirmDxfOverwrite' : datos.paso === 'Plano' ? 'confirmPlanoOverwrite' : 'confirmPdfOverwrite'] = true;
        else entrada.confirmOverwrite = true;
        if (datos.motivo === 'pdf') entrada.pdfModo = 'sustituir';
        continue;
      }
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudo completar la salida del pedido.');
      notify(datos.mensaje || (datos.presentaciones ? 'PDF guardado en planteamientos y en la carpeta del año.' : cuerpo?.destino === 'bot' ? 'DXF mandado al bot.' : cuerpo?.destino === 'dxfs' ? 'DXF guardado en la carpeta del año.' : cuerpo?.soloPdf ? 'PDF guardado.' : 'Plano guardado.'), { tone: 'success' });
      for (const aviso of datos.avisos ?? []) notify(aviso, { tone: 'warning' });
      recibido?.(datos);
      terminado();
      return;
    }
  } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo completar la salida del pedido.', { tone: 'error' }); }
}
