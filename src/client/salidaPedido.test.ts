import { afterEach, expect, it, vi } from 'vitest';
import { ejecutarSalidaPedido } from './salidaPedido';
afterEach(() => vi.unstubAllGlobals());
const respuesta = (status: number, cuerpo: object) => new Response(JSON.stringify(cuerpo), { status });
it.each(['reviews/AR2600001', 'remolques/pedidos/AR2600001', 'puertas/pedidos/AR2600001'])('vuelve al listado solo tras completar %s y muestra lo hecho', async ruta => {
  const terminado = vi.fn(), notify = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(200, { mensaje: 'PDF, plano y DXF al bot guardados.' })));
  await ejecutarSalidaPedido({ ruta: '/api/' + ruta + '/produccion', usuario: 'IVÁN', preguntar: vi.fn(), notify, terminado });
  expect(terminado).toHaveBeenCalledOnce();
  expect(notify).toHaveBeenCalledWith('PDF, plano y DXF al bot guardados.', { tone: 'success' });
});
it('conserva las confirmaciones de cada salida antes de completar el pedido', async () => {
  const terminado = vi.fn(), preguntar = vi.fn().mockResolvedValue('confirm');
  const fetch = vi.fn().mockResolvedValueOnce(respuesta(409, { needsConfirmation: true, paso: 'PDF', existing: ['AR2600001-10.pdf'] }))
    .mockResolvedValueOnce(respuesta(409, { needsConfirmation: true, paso: 'DXF al bot', existing: ['AR2600001.dxf'] }))
    .mockResolvedValueOnce(respuesta(200, { ok: true }));
  vi.stubGlobal('fetch', fetch);
  await ejecutarSalidaPedido({ ruta: '/produccion', usuario: 'IVÁN', preguntar, notify: vi.fn(), bot: true, terminado });
  const cuerpo = JSON.parse(fetch.mock.calls[2][1].body);
  expect(cuerpo).toMatchObject({ confirmBot: true, confirmPdfOverwrite: true, confirmDxfOverwrite: true });
  expect(cuerpo.confirmOverwrite).toBeUndefined();
  expect(terminado).toHaveBeenCalledOnce();
});
it('cancelar una pregunta no vuelve al listado; el fallo parcial muestra lo que falta', async () => {
  const terminado = vi.fn(), notify = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(409, { needsConfirmation: true })));
  await ejecutarSalidaPedido({ ruta: '/produccion', usuario: 'IVÁN', preguntar: vi.fn().mockResolvedValue('cancel'), notify, terminado });
  expect(terminado).not.toHaveBeenCalled();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(500, { parcial: true, error: 'Hecho: PDF y plano. Falta: DXF al bot.' })));
  await ejecutarSalidaPedido({ ruta: '/produccion', usuario: 'IVÁN', preguntar: vi.fn(), notify, terminado });
  expect(terminado).not.toHaveBeenCalled();
  expect(notify).toHaveBeenCalledWith('Hecho: PDF y plano. Falta: DXF al bot.', { tone: 'error' });
});
it.each(['bot', 'dxfs'])('el selector usa el envío existente con destino %s y otro técnico', async destino => {
  const fetch = vi.fn().mockResolvedValue(respuesta(200, {})); vi.stubGlobal('fetch', fetch);
  await ejecutarSalidaPedido({ ruta: '/corte/enviar', cuerpo: { destino, tecnicoDestino: 'ÁNGEL', sinPdf: true }, usuario: 'IVÁN', preguntar: vi.fn().mockResolvedValue('confirm'), notify: vi.fn(), terminado: vi.fn(), bot: destino === 'bot' });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ destino, tecnicoDestino: 'ÁNGEL', sinPdf: true });
});

it('regenerar el corte refresca la ficha para revisarlo y no termina la producción', async () => {
  const actualizado = vi.fn(), terminado = vi.fn(), notify = vi.fn();
  const fetch = vi.fn().mockResolvedValueOnce(respuesta(409, { corteNoRegenerado: true, sinPlano: true }))
    .mockResolvedValueOnce(respuesta(200, { ok: true }));
  vi.stubGlobal('fetch', fetch);
  await ejecutarSalidaPedido({ ruta: '/produccion', usuario: 'IVÁN', preguntar: vi.fn().mockResolvedValue('confirm'), notify,
    guardado: { ruta: '/guardar', cuerpo: {}, usuario: 'IVÁN' }, actualizado, terminado });
  expect(actualizado).toHaveBeenCalledOnce();
  expect(terminado).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(notify).toHaveBeenCalledWith(expect.stringContaining('Revísalo'), { tone: 'info' });
});
