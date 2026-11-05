import type { AskForConfirmation } from './components/NotificationCenter';

export async function preguntarCambioCorte(preguntar: AskForConfirmation, abrir: () => Promise<unknown>) {
  const choice = await preguntar({ title: 'El corte tiene cambios desde la última vez', amplio: true,
    message: 'El corte tiene cambios desde la última vez. Puedes abrirlo para comprobarlo o aceptar el corte guardado en ZWCAD.',
    confirmLabel: 'Aceptar', alternativeLabel: 'Abrir para comprobar', alternativeTone: 'neutral', cancelLabel: 'Cancelar', tone: 'warning' });
  if (choice === 'alternative') await abrir();
  return choice === 'confirm';
}

/** Abre lo que hay sin regenerarlo ni aceptar su huella. */
export async function abrirCorteToldos(orderCode: string, cuerpo?: Record<string, unknown>) {
  const respuesta = cuerpo ? await fetch('/api/corte-lona/borrador', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
    : await fetch(`/api/reviews/${encodeURIComponent(orderCode)}/corte-dwg`, { cache: 'no-store' });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo abrir el corte.');
  const ficheros: { url: string }[] = datos.ficheros || (datos.url ? [{ url: datos.url }] : []);
  if (!ficheros.length) throw new Error('No se encontró la ruta del corte.');
  for (const [i, f] of ficheros.entries()) {
    if (i) await new Promise(resolve => setTimeout(resolve, 1500));
    window.location.assign(f.url);
  }
}

/** Cada reintento conserva las decisiones del técnico y la huella que ha visto. */
export async function guardarToldosEditable(cuerpo: Record<string, unknown>, preguntar: AskForConfirmation, abrir: () => Promise<unknown>) {
  const entrada = { ...cuerpo };
  while (true) {
    const respuesta = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entrada) });
    const datos = await respuesta.json();
    if (respuesta.status === 409 && datos.needsRegenerateConfirmation) {
      const choice = await preguntar({ title: 'Este pedido ya tiene corte', amplio: true,
        message: 'Has cambiado datos y este pedido ya tiene corte. ¿Generar el corte de nuevo?',
        confirmLabel: 'Sí, regenerar (se pierden los retoques de ZWCAD)', alternativeLabel: 'No, mantener mi corte', alternativeTone: 'neutral',
        cancelLabel: 'Cancelar', tone: 'warning' });
      if (choice !== 'confirm' && choice !== 'alternative') return null;
      entrada.decisionCorte = choice === 'confirm' ? 'regenerar' : 'mantener';
      continue;
    }
    if (respuesta.status === 409 && datos.cambioCorte) {
      if (!await preguntarCambioCorte(preguntar, abrir)) return null;
      entrada.aceptarHuellaCorte = datos.huella;
      continue;
    }
    if (respuesta.status === 409 && (datos.needsConfirmation || datos.needsPlanoConfirmation)) {
      const choice = await preguntar({ title: datos.needsPlanoConfirmation ? 'El plano del corte ya existe' : 'Actualizar pedido',
        message: datos.error || 'El pedido ya está guardado. ¿Actualizarlo con los datos del formulario?',
        confirmLabel: 'Actualizar', cancelLabel: 'Conservar el actual', tone: 'warning', details: datos.existing });
      if (choice !== 'confirm') return null;
      entrada[datos.needsPlanoConfirmation ? 'confirmPlanoOverwrite' : 'confirmOverwrite'] = true;
      continue;
    }
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo guardar el pedido para revisión.');
    return datos;
  }
}
