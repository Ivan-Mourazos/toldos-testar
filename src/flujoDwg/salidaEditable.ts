import { huellaDatos, type CorteConfirmado, type crearFlujoDwg } from './flujo.ts';

interface PedidoConCorte {
  orderCode: string;
  updatedAt: string;
  corteNoRegenerado?: boolean;
  corteConfirmado?: CorteConfirmado;
}

/** La decisión se vincula al plano y a la versión del pedido; preguntar no modifica nada. */
export async function comprobarCorteNoRegenerado<T extends PedidoConCorte>(
  flujo: ReturnType<typeof crearFlujoDwg>, pedido: T, entrada: { aceptarCorteNoRegenerado?: unknown }, usuario: string,
): Promise<{ respuesta: { status: number; cuerpo: Record<string, unknown> } } | { pedido: T; nota: string }> {
  if (!pedido.corteNoRegenerado) return { pedido, nota: '' };
  const error = 'El corte no está regenerado con los últimos datos';
  if (!pedido.corteConfirmado) return { respuesta: { status: 409, cuerpo: { corteNoRegenerado: true, sinPlano: true,
    error: `${error}. No hay un plano guardado: regenera el corte antes de continuar.` } } };
  const dwg = await flujo.corteDelDwg(pedido.corteConfirmado);
  const tokenCorte = huellaDatos({ pedido: pedido.orderCode, actualizado: pedido.updatedAt, corte: dwg.huella });
  if (entrada.aceptarCorteNoRegenerado !== tokenCorte) return { respuesta: { status: 409,
    cuerpo: { corteNoRegenerado: true, tokenCorte, error } } };
  const fecha = new Date().toISOString();
  return { pedido: { ...pedido, corteNoRegenerado: false,
    corteConfirmado: { ...pedido.corteConfirmado, huella: dwg.huella, por: usuario, fecha,
      aceptadoSinRegenerar: { por: usuario, fecha, pedidoActualizadoEn: pedido.updatedAt } } },
    nota: `Corte usado sin regenerar con los últimos datos, aceptado por ${usuario}.` };
}
