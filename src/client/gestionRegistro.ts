import type { GestionRegistro } from './components/ConfirmarGestionRegistro';

export async function solicitarGestionRegistro<T>(rutaPedido: string, accion: GestionRegistro, usuario: string, texto: string) {
  const respuesta = await fetch(`${rutaPedido}/${accion}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, confirmacion: accion === 'papelera' ? texto : undefined }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo actualizar el pedido.');
  return datos.review as T;
}

export const mensajeGestionRegistro = {
  terminar: 'Pedido terminado sin generar.',
  reabrir: 'El pedido vuelve a estar pendiente.',
  papelera: 'Pedido enviado a la papelera.',
};
