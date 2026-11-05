import { afterEach, describe, expect, it, vi } from 'vitest';
import { guardarToldosEditable, preguntarCambioCorte } from './toldosEditable';
import type { AskForConfirmation } from './components/NotificationCenter';

afterEach(() => vi.unstubAllGlobals());
const respuesta = (status: number, datos: object) => ({ status, ok: status === 200, json: async () => datos });

describe('diálogos de toldos', () => {
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
