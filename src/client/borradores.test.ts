import { describe, expect, it, vi } from 'vitest';
import type { Borrador } from '../borradores/tipos.ts';
import type { ConfirmOptions, DialogResult } from './components/NotificationCenter';
import {
  buscarBorradorAlObtener, contenidoBorradorToldos, descartarBorrador, guardarBorradorPreguntando, leerBorrador, listarBorradores,
  preguntaAlObtener, type Pedir,
} from './borradores';
import { defaultDraft } from './hooks/useDraft';

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
const borrador: Borrador = {
  schemaVersion: 1, kind: 'toldos', orderCode: 'AR2604286', numeroPedido: 'AR.26.04286', savedBy: 'JAIME',
  createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T09:30:00.000Z',
  summary: { customer: 'TOLDOS CAL', orderDate: '2026-10-01', elementos: 1, models: ['ARZUA PRO'] },
  contenido: { order: { orderCode: 'AR.26.04286', awnings: [] } },
};
const resumen = { ...borrador } as Partial<Borrador>;
delete resumen.contenido;
const cuerpo = { kind: 'toldos' as const, savedBy: 'IVÁN', contenido: { order: { orderCode: 'AR.26.04286', awnings: [] } } };

describe('listar, leer y descartar', () => {
  it('la lista trae si hay carpeta y los resúmenes; un fallo da su mensaje', async () => {
    const pedir = vi.fn<Pedir>(async () => respuesta(200, { configurado: true, borradores: [resumen] }));
    expect(await listarBorradores(pedir)).toEqual({ configurado: true, borradores: [resumen] });
    expect(pedir).toHaveBeenCalledWith('/api/borradores', { cache: 'no-store' });
    await expect(listarBorradores(async () => respuesta(500, { error: 'Carpeta caída' }))).rejects.toThrow('Carpeta caída');
  });

  it('leer: null (o un 404 antiguo) es que no hay; el número va tal cual en la dirección', async () => {
    expect(await leerBorrador('AR.26.04286', async () => respuesta(200, null))).toBeNull();
    const pedir = vi.fn<Pedir>(async () => respuesta(404, { error: 'No hay borrador de este pedido.' }));
    expect(await leerBorrador('AR.26.04286', pedir)).toBeNull();
    expect(pedir).toHaveBeenCalledWith('/api/borradores/AR.26.04286', { cache: 'no-store' });
    expect(await leerBorrador('AR.26.04286', async () => respuesta(200, borrador))).toEqual(borrador);
    await expect(leerBorrador('AR.26.04286', async () => respuesta(503, { error: 'No se puede comprobar' }))).rejects.toThrow('No se puede comprobar');
  });

  it('descartar usa DELETE y da el error del servidor', async () => {
    const pedir = vi.fn<Pedir>(async () => respuesta(200, { ok: true, existia: true }));
    await descartarBorrador('AR2604286', pedir);
    expect(pedir).toHaveBeenCalledWith('/api/borradores/AR2604286', { method: 'DELETE' });
    await expect(descartarBorrador('AR2604286', async () => respuesta(409, { error: 'Ocupado' }))).rejects.toThrow('Ocupado');
  });
});

describe('guardarBorradorPreguntando', () => {
  it('guarda con PUT y devuelve el resumen', async () => {
    const pedir = vi.fn<Pedir>(async () => respuesta(200, { ok: true, borrador: resumen, sustituido: false }));
    const confirmar = vi.fn();
    expect(await guardarBorradorPreguntando({ numero: 'AR.26.04286', cuerpo, confirmar, pedir })).toEqual({ ok: true, borrador: resumen });
    expect(confirmar).not.toHaveBeenCalled();
    const [url, init] = pedir.mock.calls[0];
    expect(url).toBe('/api/borradores/AR.26.04286');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({ ...cuerpo, confirmOverwrite: false });
  });

  it('si es de otra persona pregunta, y solo sustituye si se confirma', async () => {
    const pedir = vi.fn<Pedir>()
      .mockResolvedValueOnce(respuesta(409, { needsConfirmation: true, savedBy: 'JAIME', error: 'Este borrador es de JAIME.' }))
      .mockResolvedValueOnce(respuesta(200, { ok: true, borrador: resumen, sustituido: true }));
    let pregunta: ConfirmOptions | null = null;
    const confirmar = vi.fn(async (opciones: ConfirmOptions): Promise<DialogResult> => { pregunta = opciones; return 'confirm'; });
    expect(await guardarBorradorPreguntando({ numero: 'AR.26.04286', cuerpo, confirmar, pedir })).toEqual({ ok: true, borrador: resumen });
    expect(pregunta).toMatchObject({ message: expect.stringContaining('Este borrador es de Jaime, ¿lo sustituyes?'), confirmLabel: 'Sustituir borrador' });
    expect(JSON.parse(String(pedir.mock.calls[1][1]?.body)).confirmOverwrite).toBe(true);

    const noSustituir = vi.fn<Pedir>(async () => respuesta(409, { needsConfirmation: true, savedBy: 'JAIME' }));
    expect(await guardarBorradorPreguntando({ numero: 'AR2604286', cuerpo, confirmar: async () => 'cancel', pedir: noSustituir }))
      .toEqual({ ok: false, mensaje: null });
    expect(noSustituir).toHaveBeenCalledTimes(1);
  });

  it('los demás errores dan el texto del servidor, y sin red un texto propio', async () => {
    const yaEnPedidos = async () => respuesta(409, { error: 'Este pedido ya está en Pedidos: ábrelo y usa «Corregir».' });
    expect(await guardarBorradorPreguntando({ numero: 'AR2604286', cuerpo, confirmar: vi.fn(), pedir: yaEnPedidos }))
      .toEqual({ ok: false, mensaje: 'Este pedido ya está en Pedidos: ábrelo y usa «Corregir».' });
    const sinRed = async () => { throw new TypeError('Failed to fetch'); };
    expect(await guardarBorradorPreguntando({ numero: 'AR2604286', cuerpo, confirmar: vi.fn(), pedir: sinRed }))
      .toEqual({ ok: false, mensaje: 'No se pudo guardar el borrador.' });
  });
});

describe('«Obtener datos del pedido» con borrador', () => {
  it('la pregunta dice de quién y de cuándo, y si se abre en la otra pantalla', () => {
    const misma = preguntaAlObtener(borrador, 'toldos');
    expect(misma).toMatchObject({ confirmLabel: 'Abrir borrador', alternativeLabel: 'Empezar de cero', alternativeTone: 'neutral', cancelLabel: 'Cancelar' });
    expect(misma.message).toContain('AR2604286 tiene un borrador de Jaime del 01/10. ¿Lo abres?');
    expect(misma.message).not.toContain('se abrirá en');
    expect(preguntaAlObtener(borrador, 'remolques').message).toContain('Es de toldos: se abrirá en Toldos.');
  });

  it('sin número, sin borrador o si falla la lectura, sigue con RPS sin preguntar', async () => {
    const confirmar = vi.fn();
    const pedir = vi.fn<Pedir>(async () => respuesta(404, {}));
    expect(await buscarBorradorAlObtener(' . ', 'toldos', confirmar, pedir)).toEqual({ accion: 'seguir' });
    expect(pedir).not.toHaveBeenCalled();
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', confirmar, pedir)).toEqual({ accion: 'seguir' });
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', confirmar, async () => { throw new Error('caído'); })).toEqual({ accion: 'seguir' });
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('una sola lectura: sin borrador (null) sigue con RPS', async () => {
    const pedir = vi.fn<Pedir>(async () => respuesta(200, null));
    expect(await buscarBorradorAlObtener('AR.26.04286', 'toldos', vi.fn(), pedir)).toEqual({ accion: 'seguir' });
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(pedir).toHaveBeenCalledWith('/api/borradores/AR.26.04286', { cache: 'no-store' });
  });

  it('con borrador: «Abrir borrador», «Empezar de cero» o nada', async () => {
    const pedir: Pedir = async () => respuesta(200, borrador);
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', async () => 'confirm', pedir)).toEqual({ accion: 'abrir', borrador });
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', async () => 'alternative', pedir)).toEqual({ accion: 'seguir' });
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', async () => 'cancel', pedir)).toEqual({ accion: 'cancelar' });
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', async () => 'dismiss', pedir)).toEqual({ accion: 'cancelar' });
  });
});

describe('contenidoBorradorToldos', () => {
  it('lleva solo los campos del formulario, sin funciones ni parámetros', () => {
    const formulario = { ...defaultDraft(), orderCode: 'AR.26.04286', customer: 'TOLDOS CAL', setOrderCode: () => undefined, parameters: { x: 1 } };
    const { order } = contenidoBorradorToldos(formulario);
    expect(order).toEqual({ ...defaultDraft(), orderCode: 'AR.26.04286', customer: 'TOLDOS CAL', orderDate: formulario.orderDate });
    expect(order).not.toHaveProperty('setOrderCode');
    expect(order).not.toHaveProperty('parameters');
  });
});
