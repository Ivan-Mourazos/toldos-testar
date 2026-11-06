import { afterEach, describe, expect, it, vi } from 'vitest';
import { decidirCortePendiente } from './toldosEditable';

afterEach(() => vi.unstubAllGlobals());
describe('la misma decisión de corte antes de generar o enviar', () => {
  const guardado = { ruta: '/api/puertas/pedidos', cuerpo: { pedido: { orderCode: 'AR2600001' } }, usuario: 'IVÁN' };
  it.each(['cancel', 'dismiss'] as const)('cancelar (%s) no guarda ni acepta', async eleccion => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(await decidirCortePendiente({ tokenCorte: 'versión actual' }, vi.fn().mockResolvedValue(eleccion), guardado)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('usar devuelve el permiso recibido y muestra las tres opciones', async () => {
    const preguntar = vi.fn().mockResolvedValue('alternative');
    expect(await decidirCortePendiente({ tokenCorte: 'versión actual' }, preguntar, guardado)).toBe('versión actual');
    expect(preguntar).toHaveBeenCalledWith(expect.objectContaining({ confirmLabel: 'Regenerar', alternativeLabel: 'Usar este corte igualmente', cancelLabel: 'Cancelar' }));
  });
  it('regenerar guarda una vez sin otra pregunta de sustitución', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ review: {} }) }); vi.stubGlobal('fetch', fetch);
    const preguntar = vi.fn().mockResolvedValue('confirm'); const alRegenerar = vi.fn();
    expect(await decidirCortePendiente({}, preguntar, guardado, alRegenerar)).toBe('');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ decisionCorte: 'regenerar', savedBy: 'IVÁN', confirmOverwrite: true });
    expect(preguntar).toHaveBeenCalledTimes(1); expect(alRegenerar).toHaveBeenCalledOnce();
  });
  it('sin plano nunca permite aceptar un corte inexistente', async () => {
    const preguntar = vi.fn().mockResolvedValue('alternative');
    expect(await decidirCortePendiente({ sinPlano: true }, preguntar, guardado)).toBeNull();
    expect(preguntar).toHaveBeenCalledWith(expect.objectContaining({ alternativeLabel: undefined }));
  });
});
