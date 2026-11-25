import { fichasClientesPuertas, type FichaClientePuertas } from '../../puertas/clientes.ts';

/** Clientes de Puertas en el inicio: los que tienen ficha propia y, al final, Puertas genéricas (otros clientes). */
export function clientesInicioPuertas(busqueda: string) {
  const texto = busqueda.toLocaleLowerCase('es');
  const encontrados = fichasClientesPuertas.filter(f => f.nombre.toLocaleLowerCase('es').includes(texto));
  return [...encontrados.filter(f => f.id !== 'general'), ...encontrados.filter(f => f.id === 'general')];
}

/** Cabecera de un pedido nuevo: con Puertas genéricas el cliente queda vacío para escribir el real. */
export function cabeceraInicialPuertas(ficha: FichaClientePuertas, fecha: string) {
  if (ficha.id === 'general') return { cliente: '', fecha };
  return { cliente: ficha.nombre, fecha, clienteRps: { codigo: ficha.codigoRps, nombre: ficha.nombre } };
}
