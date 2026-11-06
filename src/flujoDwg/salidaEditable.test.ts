import { describe, expect, it, vi } from 'vitest';
import { comprobarCorteNoRegenerado } from './salidaEditable';

describe('permiso para salir con un corte sin regenerar', () => {
  const pedido = { orderCode: 'AR2600001', updatedAt: '2026-11-06T00:00:00Z', corteNoRegenerado: true,
    corteConfirmado: { huella: 'antes', por: 'ANA', fecha: '', filename: 'corte.dxf', plano: 'tmp/corte.dxf' } };
  function preparar() {
    const leer = vi.fn(async () => ({ huella: 'actual' }));
    return { leer, flujo: { corteDelDwg: leer } as unknown as Parameters<typeof comprobarCorteNoRegenerado>[0] };
  }
  it.each(['pedido', 'plano'])('si cambia el %s, la aceptación anterior no sirve', async cambio => {
    const { flujo, leer } = preparar();
    const pregunta = await comprobarCorteNoRegenerado(flujo, pedido, {}, 'IVÁN');
    if (!('respuesta' in pregunta)) throw new Error('Debe preguntar');
    const token = pregunta.respuesta.cuerpo.tokenCorte;
    const nuevo = cambio === 'pedido' ? { ...pedido, updatedAt: '2026-11-06T00:01:00Z' } : pedido;
    if (cambio === 'plano') leer.mockResolvedValue({ huella: 'nuevo retoque' });
    expect(await comprobarCorteNoRegenerado(flujo, nuevo, { aceptarCorteNoRegenerado: token }, 'IVÁN'))
      .toMatchObject({ respuesta: { status: 409, cuerpo: { corteNoRegenerado: true } } });
    expect(pedido.corteNoRegenerado).toBe(true);
  });
  it('sin plano exige regenerarlo aunque el cliente intente aceptarlo', async () => {
    const { flujo, leer } = preparar();
    expect(await comprobarCorteNoRegenerado(flujo, { ...pedido, corteConfirmado: undefined }, { aceptarCorteNoRegenerado: true }, 'IVÁN'))
      .toMatchObject({ respuesta: { status: 409, cuerpo: { sinPlano: true } } });
    expect(leer).not.toHaveBeenCalled();
  });
});
