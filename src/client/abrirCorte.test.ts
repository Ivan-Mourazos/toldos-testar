import { afterEach, describe, expect, it, vi } from 'vitest';
import { abrirCorteDwg } from './abrirCorte';
import type { DialogResult } from './components/NotificationCenter';

const url = 'tgm-pedidos://open?kind=cad&path=%5C%5Cstinkor%5Coftecnica%5CBORRADORES%20CORTE%5CAR2605134.dwg';
function servidor(existente: boolean) {
  const peticiones: Array<{ regenerar: boolean }> = [];
  vi.stubGlobal('fetch', vi.fn(async (_ruta: string, opciones: { body: string }) => {
    const cuerpo = JSON.parse(opciones.body) as { regenerar: boolean };
    peticiones.push({ regenerar: cuerpo.regenerar });
    return new Response(JSON.stringify({ ok: true, existente: existente && !cuerpo.regenerar, sustituido: cuerpo.regenerar,
      filename: 'AR2605134.dwg', ruta: String.raw`\\stinkor\oftecnica\BORRADORES CORTE\AR2605134.dwg`, url }), { status: 200 });
  }));
  return peticiones;
}
const abrir = (eleccion: DialogResult, usuario = 'IVÁN') => {
  const abiertas: string[] = [], avisos: string[] = [];
  const hecho = abrirCorteDwg({ ruta: '/api/puertas/borrador-corte', orderCode: 'AR2605134', cuerpo: {}, usuario,
    preguntar: async () => eleccion, notify: (m) => avisos.push(m), abrir: (u) => abiertas.push(u) });
  return { hecho, abiertas, avisos };
};
afterEach(() => { vi.unstubAllGlobals(); });

describe('Abrir corte', () => {
  it('sin borrador, lo crea y lo abre en ZWCAD', async () => {
    const peticiones = servidor(false);
    const { hecho, abiertas } = abrir('confirm');
    expect(await hecho).toBe(true);
    expect(peticiones).toEqual([{ regenerar: false }]);
    expect(abiertas).toEqual([url]);
  });
  it('con borrador, abre el que hay o lo genera de nuevo, según se elija', async () => {
    let peticiones = servidor(true);
    let r = abrir('confirm');
    expect(await r.hecho).toBe(true);
    expect(peticiones).toEqual([{ regenerar: false }]);
    expect(r.abiertas).toEqual([url]);
    peticiones = servidor(true);
    r = abrir('alternative');
    expect(await r.hecho).toBe(true);
    expect(peticiones).toEqual([{ regenerar: false }, { regenerar: true }]);
    expect(r.abiertas).toEqual([url]);
  });
  it('si se cancela o falta «Soy», no abre nada', async () => {
    servidor(true);
    let r = abrir('cancel');
    expect(await r.hecho).toBe(false);
    expect(r.abiertas).toEqual([]);
    r = abrir('confirm', '');
    expect(await r.hecho).toBe(false);
    expect(r.avisos[0]).toContain('Soy');
  });
});
