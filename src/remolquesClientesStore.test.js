import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRemolquesClientesStore } from './remolquesClientesStore.js';
import { DEFAULT_PARAMS } from './remolques/calc/params.ts';
import { PARAMS_GENERALES } from './remolques/clientes/params-efectivos.ts';
import { entradasDeCliente, fichasSemilla, MOTIVO_SEMILLA } from './remolques/clientes/semilla.ts';
import { emptyLona } from './remolques/entradas-vacias.ts';

let dir;
let logger;
const file = () => path.join(dir, 'remolques-clientes.json');
const store = (extra = {}) => createRemolquesClientesStore({
  file: file(),
  technicians: ['IVÁN', 'JAIME'],
  semilla: async () => fichasSemilla(entradasDeCliente(DEFAULT_PARAMS)),
  recogidasGenerales: async () => PARAMS_GENERALES.recogidas.map((r) => r.nombre),
  logger,
  ...extra
});
const LONA = {
  tipo: 'lona',
  input: { ...emptyLona(), largo: 200, ancho: 120, modoOllaos: 'SEGUN SE INDICA', ollaosManuales: { delante: [2.5, 60.5, 118.5], atras: [], laterales: [] }, recogeDelante: 'GOMA' }
};

beforeEach(async () => {
  const root = path.resolve('tmp/tests/remolques-clientes');
  await mkdir(root, { recursive: true });
  dir = await mkdtemp(path.join(root, 'caso-'));
  logger = { warn: vi.fn() };
});

describe('fichas de partida', () => {
  it('sin fichero se crean una sola vez, aunque se lean dos veces a la vez', async () => {
    const s = store();
    const [a, b] = await Promise.all([s.get(), s.get()]);
    expect(a.map((f) => f.nombre)).toEqual(['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']);
    expect(b).toEqual(a);
    expect(await s.getSnapshot()).toMatchObject({ version: 1, updatedBy: '', reason: MOTIVO_SEMILLA });
    expect(await s.history()).toMatchObject([{ version: 1, reason: MOTIVO_SEMILLA, changedSections: ['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER'] }]);
    expect(JSON.parse(await readFile(file(), 'utf8')).fichas).toHaveLength(3);
  });

  it('si no se pueden guardar, se usan igual y se avisa', async () => {
    const bloqueo = path.join(dir, 'bloqueo');
    await writeFile(bloqueo, 'no es una carpeta');
    const s = store({ historyFile: path.join(bloqueo, 'historial.jsonl') });
    expect((await s.get()).map((f) => f.nombre)).toEqual(['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']);
    expect(logger.warn).toHaveBeenCalled();
    expect(existsSync(file())).toBe(false);
  });

  it('un fichero roto no se vuelve a sembrar: no hay fichas y se avisa', async () => {
    await writeFile(file(), '{ roto', 'utf8');
    expect(await store().get()).toEqual([]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(await readFile(file(), 'utf8')).toBe('{ roto');
  });
});

describe('guardar todas las fichas', () => {
  it('con versión e historial; si otro puesto guardó antes, 409 con lo actual', async () => {
    const s = store();
    const { fichas } = await s.getSnapshot();
    const cambiadas = fichas.map((f) => (f.id === 'ayala' ? { ...f, codigosRps: ['048286'] } : f));
    expect(await s.save({ baseVersion: 1, fichas: cambiadas, updatedBy: 'iván', reason: 'AYALA confirmado' }))
      .toMatchObject({ version: 2, updatedBy: 'IVÁN', reason: 'AYALA confirmado' });
    expect((await store().get()).find((f) => f.id === 'ayala').codigosRps).toEqual(['048286']);
    expect((await s.history())[0]).toMatchObject({ version: 2, changedSections: ['AYALA'], parameters: { fichas: cambiadas } });
    await expect(s.save({ baseVersion: 1, fichas, updatedBy: 'IVÁN', reason: 'Tarde' }))
      .rejects.toMatchObject({ code: 'VERSION_CONFLICT', current: { version: 2 } });
  });

  it('exige quién, motivo y versión, y no guarda un código en dos fichas', async () => {
    const s = store();
    const { fichas } = await s.getSnapshot();
    const base = { baseVersion: 1, fichas, updatedBy: 'IVÁN', reason: 'Prueba' };
    await expect(s.save({ ...base, updatedBy: 'NADIE' })).rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'Elige quién hace el cambio («Soy»).' });
    await expect(s.save({ ...base, reason: ' ' })).rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'Indica el motivo del cambio.' });
    await expect(s.save({ ...base, baseVersion: undefined })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    const repetido = fichas.map((f) => (f.id === 'ayala' ? { ...f, codigosRps: ['001300'] } : f));
    await expect(s.save({ ...base, fichas: repetido }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'El código de RPS 001300 está en dos fichas: «HIJOS DE PEDRO LOPEZ» y «AYALA»' });
    expect(await s.history()).toHaveLength(1);
  });

  it('sin cambios no crea una versión', async () => {
    const s = store();
    const { fichas } = await s.getSnapshot();
    expect((await s.save({ baseVersion: 1, fichas, updatedBy: 'IVÁN', reason: 'Nada' })).version).toBe(1);
  });
});

describe('desde un pedido', () => {
  const pedido = { numeroPedido: 'AR.26.04286', updatedBy: 'IVÁN', params: DEFAULT_PARAMS };

  it('añade el código a una ficha con el motivo «Código añadido desde el pedido…»', async () => {
    const s = store();
    const { ficha, snapshot } = await s.desdePedido({ ...pedido, cliente: { codigo: '036999', nombre: 'REMOLQUES AYALA BIS' }, fichaId: 'ayala', claves: [] });
    expect(ficha.codigosRps).toEqual(['036662', '048286', '036999']);
    expect(snapshot).toMatchObject({ version: 2, updatedBy: 'IVÁN', reason: 'Código añadido desde el pedido AR.26.04286' });
  });

  it('crea la ficha si el cliente no tiene, y guarda solo lo marcado', async () => {
    const s = store();
    const { ficha, snapshot } = await s.desdePedido({ ...pedido, updatedBy: 'JAIME', cliente: { codigo: '009999', nombre: 'TALLERES CAL' }, elemento: LONA, claves: ['medida'] });
    expect(ficha).toEqual({ id: 'talleres-cal', nombre: 'TALLERES CAL', codigosRps: ['009999'], medidas: [{ tipo: 'lona', largo: 200, ancho: 120, ollaos: LONA.input.ollaosManuales }] });
    expect(snapshot.reason).toBe('Desde el pedido AR.26.04286');
    expect((await s.history(1))[0]).toMatchObject({ changedSections: ['TALLERES CAL'], updatedBy: 'JAIME' });
  });

  it('un nombre que ya es de otra ficha lleva el código', async () => {
    const s = store();
    const { ficha } = await s.desdePedido({ ...pedido, cliente: { codigo: '777777', nombre: 'Ayala' }, claves: [] });
    expect(ficha).toMatchObject({ nombre: 'Ayala (777777)', codigosRps: ['777777'] });
  });

  it('una ficha que ya no existe o un código de otra ficha no se guardan', async () => {
    const s = store();
    await expect(s.desdePedido({ ...pedido, cliente: { codigo: '1', nombre: 'X' }, fichaId: 'no-existe', claves: [] }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(s.desdePedido({ ...pedido, cliente: { codigo: '001300', nombre: 'X' }, fichaId: 'ayala', claves: [] }))
      .rejects.toMatchObject({ code: 'CODE_TAKEN', message: 'El código 001300 ya está en la ficha «HIJOS DE PEDRO LOPEZ».' });
    await expect(s.desdePedido({ ...pedido, cliente: { codigo: '', nombre: 'X' }, claves: [] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(s.desdePedido({ ...pedido, cliente: { codigo: '1', nombre: 'X' }, claves: ['medida'] }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'Falta el elemento del pedido.' });
    expect(await s.history()).toHaveLength(1);
  });
});
