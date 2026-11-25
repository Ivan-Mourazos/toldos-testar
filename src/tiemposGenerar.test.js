import { EventEmitter } from 'node:events';
import { afterEach, expect, it, vi } from 'vitest';
import { medirFaseGenerar, registrarBytesGenerados, tiemposGenerar } from './tiemposGenerar.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function peticion(ruta, ejecutar) {
  const res = Object.assign(new EventEmitter(), {
    statusCode: 200,
    json(cuerpo) { this.emit('finish'); return cuerpo; },
  });
  return tiemposGenerar(ruta, String)({ params: { orderCode: 'AR2604784' } }, res, () => ejecutar(res));
}

it('con la medida apagada ejecuta la petición sin escribir tiempos', async () => {
  vi.stubEnv('TIEMPOS_GENERAR', '');
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const cuerpo = { ok: true };
  expect(await peticion('generate-files', async res => res.json(cuerpo))).toBe(cuerpo);
  expect(log).not.toHaveBeenCalled();
});

it('emite una sola línea por petición con las fases y la pregunta, sin copiar datos del cuerpo', async () => {
  vi.stubEnv('TIEMPOS_GENERAR', '1');
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await peticion('produccion', async res => {
    await medirFaseGenerar('coordina', async () => true);
    await medirFaseGenerar('oda', async () => Buffer.alloc(10));
    registrarBytesGenerados(Buffer.alloc(20));
    res.statusCode = 409;
    res.json({ needsConfirmation: true, existing: ['ruta privada'] });
  });
  expect(log).toHaveBeenCalledTimes(1);
  const linea = JSON.parse(log.mock.calls[0][0]);
  expect(linea).toMatchObject({
    evento: 'tiempos-generar', pedido: 'AR2604784', ruta: 'produccion', status: 409,
    ronda: 'needsConfirmation', conversionesOda: 1, bytesEscritos: 20, totalMs: expect.any(Number),
    fasesMs: { carpetasRed: 0, coordina: expect.any(Number), oda: expect.any(Number), calculo: 0, excel: 0,
      presentacionesChromium: 0, planteamientoPdf: 0, unirPdf: 0, adjuntos: 0, escrituras: 0, saveReview: 0 },
  });
  expect(log.mock.calls[0][0]).not.toContain('ruta privada');
});
