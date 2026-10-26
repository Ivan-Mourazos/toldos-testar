import { calcularPuerta } from '../../puertas/calcular.ts';
import type { PedidoPuertas } from '../../puertas/tipos.ts';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { pedidoValido, useFlujoCorteDwg } from '../flujoCorteDwg';

// El flujo del corte de las puertas: la pieza común de toda la web (flujoCorteDwg.tsx) con lo propio de las puertas.
export { pasoCorte, textoPaso, type EstadoCorteServidor, type Paso } from '../flujoCorteDwg';

/** Lo que falta para poder abrir el corte, o null si el pedido está completo. */
export function faltaParaAbrir(pedido: PedidoPuertas): string | null {
  if (!pedidoValido(pedido.orderCode)) return 'Falta el número de pedido';
  if (pedido.elementos.some(e => !e.input.of.trim() || e.input.of.trim().toUpperCase() === 'SIN OF')) return 'Falta la OF de algún elemento';
  const errores = pedido.elementos.reduce((n, e) => n + calcularPuerta(e.input).avisos.filter(a => a.nivel === 'error').length, 0);
  return errores ? `Quedan ${errores} comprobaciones por resolver` : null;
}

export function useFlujoCorte({ pedido, usuario, notify, askForConfirmation, activo }: {
  pedido: PedidoPuertas; usuario: string; notify: Notify; askForConfirmation: AskForConfirmation; activo: boolean;
}) {
  return useFlujoCorteDwg({ base: '/api/puertas/borrador-corte', codigo: pedido.orderCode, entrada: JSON.stringify(pedido.elementos),
    cuerpo: () => ({ pedido }), falta: faltaParaAbrir(pedido), usuario, notify, askForConfirmation, activo });
}
