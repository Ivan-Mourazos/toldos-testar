import { describe, expect, it } from 'vitest';
import { leerPedidosDelAnio } from './listaPedidos';

const respuesta = (status: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

describe('leerPedidosDelAnio', () => {
  it('junta los de toldos, los de remolques y los de puertas del año', async () => {
    const pedidas: string[] = [];
    const r = await leerPedidosDelAnio(2026, async (url) => {
      pedidas.push(url);
      if (url.startsWith('/api/reviews')) return respuesta(200, { reviews: [{ orderCode: 'AR1' }] });
      return url.startsWith('/api/remolques')
        ? respuesta(200, { reviews: [{ orderCode: 'AR2', kind: 'remolques' }] })
        : respuesta(200, { reviews: [{ orderCode: 'AR3', kind: 'puertas' }] });
    });
    expect(pedidas).toEqual(['/api/reviews?year=2026', '/api/remolques/pedidos?year=2026', '/api/puertas/pedidos?year=2026']);
    expect(r).toEqual({ pedidos: [{ orderCode: 'AR1' }, { orderCode: 'AR2', kind: 'remolques' }, { orderCode: 'AR3', kind: 'puertas' }], avisoRemolques: null });
  });

  it('si fallan los de remolques siguen los demás, con el aviso', async () => {
    const r = await leerPedidosDelAnio(2026, async (url) => (url.startsWith('/api/reviews')
      ? respuesta(200, { reviews: [{ orderCode: 'AR1' }] })
      : url.startsWith('/api/puertas')
        ? respuesta(200, { reviews: [{ orderCode: 'AR3', kind: 'puertas' }] })
        : respuesta(400, { error: 'Falta la carpeta.' })));
    expect(r).toEqual({ pedidos: [{ orderCode: 'AR1' }, { orderCode: 'AR3', kind: 'puertas' }], avisoRemolques: 'Falta la carpeta.' });
  });

  it('si fallan los de toldos falla todo, como antes', async () => {
    await expect(leerPedidosDelAnio(2026, async (url) => (url.startsWith('/api/reviews')
      ? respuesta(500, { error: 'No hay carpeta de revisión.' })
      : respuesta(200, { reviews: [] })))).rejects.toThrow('No hay carpeta de revisión.');
  });
});
