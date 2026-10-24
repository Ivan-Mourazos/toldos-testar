import type { AskForConfirmation, Notify } from './components/NotificationCenter';

// «Abrir corte» (flujo del DWG, fase 1, plan del 24/10/2026): el servidor deja el plano del pedido en la carpeta de
// borradores y devuelve el enlace tgm-pedidos:, que abre el DWG en ZWCAD como en historial de pedidos (el protocolo ya
// está instalado en los PC). Común a los productos: cada uno da su ruta del servidor.

interface RespuestaBorrador {
  error?: string;
  existente?: boolean;
  sustituido?: boolean;
  filename?: string;
  ruta?: string;
  url?: string;
  avisos?: string[];
}

/**
 * «Confirmar corte» (fase 2): el servidor lee el borrador tal como quedó en ZWCAD y apunta su corte. Hasta entonces no se
 * puede guardar para revisión.
 */
export async function confirmarCorteDwg({ ruta, orderCode, usuario, notify }: {
  ruta: string;
  orderCode: string;
  usuario: string;
  notify: Notify;
}): Promise<boolean> {
  if (!usuario) {
    notify('Elige quién eres en «Soy» antes de confirmar el corte.', { tone: 'warning' });
    return false;
  }
  try {
    const respuesta = await fetch(ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderCode, savedBy: usuario }) });
    const datos = await respuesta.json().catch(() => ({})) as { error?: string };
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo confirmar el corte.');
    notify('Ya puedes guardar para revisión. Si vuelves a cambiar el borrador en ZWCAD, confírmalo otra vez.', { tone: 'success', title: 'Corte confirmado' });
    return true;
  } catch (error) {
    notify(error instanceof Error ? error.message : 'No se pudo confirmar el corte.', { tone: 'error', title: 'Corte sin confirmar' });
    return false;
  }
}

export async function abrirCorteDwg({ ruta, orderCode, cuerpo, usuario, preguntar, notify, abrir = (url) => window.location.assign(url) }: {
  ruta: string;
  orderCode: string;
  /** Lo que pide el servidor de cada producto para hacer el plano (el pedido de puertas, los elementos de remolques…). */
  cuerpo: Record<string, unknown>;
  usuario: string;
  preguntar: AskForConfirmation;
  notify: Notify;
  abrir?: (url: string) => void;
}): Promise<boolean> {
  if (!usuario) {
    notify('Elige quién eres en «Soy» antes de abrir el corte.', { tone: 'warning' });
    return false;
  }
  const pedir = async (regenerar: boolean) => {
    const respuesta = await fetch(ruta, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cuerpo, savedBy: usuario, regenerar }),
    });
    const datos = await respuesta.json().catch(() => ({})) as RespuestaBorrador;
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo preparar el borrador del corte.');
    return datos;
  };
  try {
    let datos = await pedir(false);
    // Si ya hay un borrador, puede llevar cambios hechos en ZWCAD: no se pisa sin preguntar.
    if (datos.existente) {
      const eleccion = await preguntar({
        title: `Corte de ${orderCode}`,
        message: `Ya hay un borrador del corte (${datos.filename}) y puede tener cambios hechos en ZWCAD. ¿Abres ese o lo generas de nuevo con los datos de la pantalla?`,
        confirmLabel: 'Abrir el que hay', alternativeLabel: 'Generar de nuevo', cancelLabel: 'Cancelar', tone: 'warning',
      });
      if (eleccion === 'alternative') datos = await pedir(true);
      else if (eleccion !== 'confirm') return false;
    }
    if (!datos.url) throw new Error('El servidor no ha dado la ruta del borrador.');
    abrir(datos.url);
    const avisos = datos.avisos?.length ? ` ${datos.avisos.join(' ')}` : '';
    notify(`Abriendo en ZWCAD: ${datos.ruta}.${avisos}`, { tone: 'success', title: datos.existente ? 'Borrador del corte' : datos.sustituido ? 'Borrador generado de nuevo' : 'Borrador del corte creado' });
    return true;
  } catch (error) {
    notify(error instanceof Error ? error.message : 'No se pudo abrir el corte.', { tone: 'error' });
    return false;
  }
}
