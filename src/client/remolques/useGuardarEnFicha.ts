import { useCallback, useState } from 'react';
import type { CalcParams } from '../../remolques/calc/params.ts';
import { diferenciasConFicha, type DiferenciaFicha, type ElementoFicha } from '../../remolques/clientes/diferencias.ts';
import { fichaPorCodigo } from '../../remolques/clientes/reglas.ts';
import type { FichaCliente } from '../../remolques/clientes/tipos.ts';
import type { ClienteRps, PedidoRps } from '../../remolques/rps/types.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import type { Notify } from '../components/NotificationCenter';
import { guardarDesdePedido, leerFichas, nombreClienteRps } from './fichasClientes';
import { clienteDeLinea, elementoDeLinea } from './guardarEnFicha';

export interface FichaAbierta {
  /** El elemento tal como estaba al pulsar el botón: cambiarlo después no cambia lo que se guarda. */
  elemento: ElementoFicha;
  cliente: ClienteRps;
  ficha: FichaCliente | null;
  diferencias: DiferenciaFicha[];
}

export function useGuardarEnFicha({ usuario, numeroPedido, pedidoRps, params, notify }: {
  usuario: string; numeroPedido: string; pedidoRps: PedidoRps | null; params: CalcParams; notify: Notify;
}) {
  const [abierta, setAbierta] = useState<FichaAbierta | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const abrir = useCallback(async (linea: LineaPedido) => {
    const cliente = clienteDeLinea(linea, numeroPedido, pedidoRps);
    if (!cliente) return;
    setOcupado(true);
    try {
      const { fichas } = await leerFichas();
      const ficha = fichaPorCodigo(fichas, cliente.codigo);
      const elemento = elementoDeLinea(linea);
      setAbierta({ elemento, cliente, ficha, diferencias: diferenciasConFicha(elemento, ficha, params) });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudieron leer las fichas de cliente.', { tone: 'error' });
    } finally {
      setOcupado(false);
    }
  }, [notify, numeroPedido, params, pedidoRps]);

  const guardar = useCallback(async (claves: string[]) => {
    if (!abierta) return;
    setOcupado(true);
    try {
      const { ficha } = await guardarDesdePedido({
        numeroPedido: numeroPedido.trim(),
        cliente: { codigo: abierta.cliente.codigo, nombre: nombreClienteRps(abierta.cliente) },
        fichaId: abierta.ficha?.id ?? null,
        elemento: abierta.elemento,
        claves,
        updatedBy: usuario,
      });
      notify(`Guardado en la ficha de ${ficha.nombre}.`, { tone: 'success', title: 'Ficha del cliente' });
      setAbierta(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar en la ficha del cliente.', { tone: 'error' });
    } finally {
      setOcupado(false);
    }
  }, [abierta, notify, numeroPedido, usuario]);

  return { abierta, ocupado, abrir, guardar, cerrar: useCallback(() => setAbierta(null), []) };
}
