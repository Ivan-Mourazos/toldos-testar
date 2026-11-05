import { afterEach, describe, expect, it, vi } from 'vitest';
import { abrirCorteGuardado, avisoParaEditar, guardarToldosEditable, preguntarCambioCorte } from './toldosEditable';
import type { AskForConfirmation } from './components/NotificationCenter';

afterEach(() => vi.unstubAllGlobals());
const respuesta = (status: number, datos: object) => ({ status, ok: status === 200, json: async () => datos });

describe('diálogos de toldos', () => {
  it.each(['puertas', 'remolques'])('Abrir para comprobar en %s abre el fichero devuelto por corte-dwg', async tipo => {
    const url = 'tgm-pedidos://open?kind=cad&path=prueba.dwg';
    const fetch = vi.fn().mockResolvedValue(respuesta(200, { ficheros: [{ filename: 'prueba.dwg', url }] }));
    const assign = vi.fn();
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('window', { location: { assign } });
    const ruta = `/api/${tipo}/pedidos/AR2600001/corte-dwg`;
    expect(await preguntarCambioCorte(async () => 'alternative', () => abrirCorteGuardado(ruta))).toBe(false);
    expect(fetch).toHaveBeenCalledWith(ruta, { cache: 'no-store' });
    expect(assign).toHaveBeenCalledWith(url);
  });
  it('espera el aviso de aprobación si se pulsa editar antes de terminar la consulta', async () => {
    const fetch = vi.fn().mockResolvedValue(respuesta(200, { disponible: true, ofs: { '0230194': { estado: 'pasada' }, '0230195': { estado: 'en_revision' } } }));
    vi.stubGlobal('fetch', fetch);
    const aviso = await avisoParaEditar([{ of: '0230194' }, { of: '0230195' }], null);
    expect(aviso).toContain('0230194'); expect(aviso).not.toContain('0230195');
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockRejectedValue(new Error('Sin conexión'));
    expect(await avisoParaEditar([{ of: '0230194' }], null)).toBe('');
  });
  it('mantener guarda la decisión sin regenerar; cancelar no guarda', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(respuesta(409, { needsRegenerateConfirmation: true })).mockResolvedValue(respuesta(200, { ok: true }));
    vi.stubGlobal('fetch', fetch);
    const preguntar = vi.fn<AskForConfirmation>().mockResolvedValue('alternative');
    await guardarToldosEditable({ savedBy: 'IVÁN' }, preguntar, vi.fn());
    expect(preguntar).toHaveBeenCalledWith(expect.objectContaining({ confirmLabel: 'Sí, regenerar (se pierden los retoques de ZWCAD)', alternativeLabel: 'No, mantener mi corte' }));
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ decisionCorte: 'mantener' });
    fetch.mockReset().mockResolvedValue(respuesta(409, { needsRegenerateConfirmation: true }));
    preguntar.mockResolvedValue('cancel');
    expect(await guardarToldosEditable({}, preguntar, vi.fn())).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('regenerar mantiene la elección durante la aceptación de la huella', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(respuesta(409, { needsRegenerateConfirmation: true }))
      .mockResolvedValueOnce(respuesta(409, { cambioCorte: true, huella: 'actual' })).mockResolvedValue(respuesta(200, { ok: true }));
    vi.stubGlobal('fetch', fetch);
    await guardarToldosEditable({}, vi.fn<AskForConfirmation>().mockResolvedValue('confirm'), vi.fn());
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toMatchObject({ decisionCorte: 'regenerar', aceptarHuellaCorte: 'actual' });
  });
  it('abrir y cancelar no aceptan ni continúan; aceptar sí', async () => {
    const abrir = vi.fn();
    expect(await preguntarCambioCorte(async () => 'alternative', abrir)).toBe(false);
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(await preguntarCambioCorte(async () => 'cancel', abrir)).toBe(false);
    expect(await preguntarCambioCorte(async () => 'confirm', abrir)).toBe(true);
    expect(abrir).toHaveBeenCalledTimes(1);
  });
});
