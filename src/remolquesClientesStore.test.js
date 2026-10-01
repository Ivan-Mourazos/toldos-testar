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
const historyFile = () => path.join(dir, 'remolques-clientes-history.jsonl');
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
const NOMBRES = ['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER'];
const fichaDe = async (s, id) => (await s.getSnapshot()).fichas.find((f) => f.id === id);

beforeEach(async () => {
  const root = path.resolve('tmp/tests/remolques-clientes');
  await mkdir(root, { recursive: true });
  dir = await mkdtemp(path.join(root, 'caso-'));
  logger = { warn: vi.fn() };
});

describe('fichas de partida', () => {
  it('sin fichero se crean una sola vez, cada una en su versión 1 y con «Ficha creada» en su historial', async () => {
    const s = store();
    const [a, b] = await Promise.all([s.get(), s.get()]);
    expect(a.map((f) => f.nombre)).toEqual(NOMBRES);
    expect(b).toEqual(a);
    expect((await s.getSnapshot()).fichas.map((f) => f.version)).toEqual([1, 1, 1]);
    expect(await s.history('ayala')).toMatchObject([{ fichaId: 'ayala', version: 1, updatedBy: '', motivo: MOTIVO_SEMILLA, resumen: ['Ficha creada'] }]);
    expect(JSON.parse(await readFile(file(), 'utf8'))).toMatchObject({ formato: 2, version: 1 });
    expect((await readFile(historyFile(), 'utf8')).trim().split('\n')).toHaveLength(3);
  });

  it('si no se pueden guardar, se usan igual y se avisa', async () => {
    const bloqueo = path.join(dir, 'bloqueo');
    await writeFile(bloqueo, 'no es una carpeta');
    const s = store({ historyFile: path.join(bloqueo, 'historial.jsonl') });
    expect((await s.get()).map((f) => f.nombre)).toEqual(NOMBRES);
    expect(logger.warn).toHaveBeenCalled();
    expect(existsSync(file())).toBe(false);
  });

  it('un fichero roto no se vuelve a sembrar ni se escribe: se calcula con las de partida en memoria y se avisa', async () => {
    await writeFile(file(), '{ roto', 'utf8');
    expect((await store().get()).map((f) => f.nombre)).toEqual(NOMBRES);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(await readFile(file(), 'utf8')).toBe('{ roto');
  });
});

describe('semilla que no valida', () => {
  it('se calcula con las fichas del código, sin escribir nada', async () => {
    const s = store({ semilla: async () => [{ id: 'x', nombre: '', codigosRps: [] }] });
    expect((await s.get()).map((f) => f.nombre)).toEqual(NOMBRES);
    expect(existsSync(file())).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('guardar una ficha', () => {
  it('sube solo su versión, sin motivo, con el resumen de lo cambiado en su historial', async () => {
    const s = store();
    const ayala = await fichaDe(s, 'ayala');
    const { ficha, snapshot } = await s.guardarFicha({ id: 'ayala', baseVersion: 1, ficha: { ...ayala, codigosRps: [...ayala.codigosRps, '099991'], recogeAtras: 'GOMA' }, updatedBy: 'iván' });
    expect(ficha).toMatchObject({ id: 'ayala', version: 2, codigosRps: ['036662', '048286', '099991'] });
    expect(snapshot.fichas.map((f) => f.version)).toEqual([1, 2, 1]);
    expect((await store().get()).find((f) => f.id === 'ayala').recogeAtras).toBe('GOMA');
    expect((await s.history('ayala'))[0]).toMatchObject({ version: 2, updatedBy: 'IVÁN', motivo: '', resumen: ['Códigos de RPS: + 099991', 'Recogida detrás: — → Goma'], ficha: { version: 2 } });
    expect(await s.history('hijos-de-pedro-lopez')).toHaveLength(1);
  });

  it('guardar otra ficha no choca; la misma con una versión vieja, 409 con la ficha de ahora', async () => {
    const s = store();
    const [hpl, ayala] = (await s.getSnapshot()).fichas;
    await s.guardarFicha({ id: 'ayala', baseVersion: 1, ficha: { ...ayala, rotulacion: true }, updatedBy: 'JAIME', motivo: 'Lo dijo el cliente' });
    expect((await s.guardarFicha({ id: hpl.id, baseVersion: 1, ficha: { ...hpl, cremallera: true }, updatedBy: 'IVÁN' })).ficha.version).toBe(2);
    await expect(s.guardarFicha({ id: 'ayala', baseVersion: 1, ficha: { ...ayala, rotulacion: false }, updatedBy: 'IVÁN' }))
      .rejects.toMatchObject({ code: 'VERSION_CONFLICT', current: { id: 'ayala', version: 2, rotulacion: true } });
    expect((await s.history('ayala'))[0]).toMatchObject({ motivo: 'Lo dijo el cliente', updatedBy: 'JAIME' });
  });

  it('exige quién y versión; valida contra todas las fichas', async () => {
    const s = store();
    const ayala = await fichaDe(s, 'ayala');
    const base = { id: 'ayala', baseVersion: 1, ficha: ayala, updatedBy: 'IVÁN' };
    await expect(s.guardarFicha({ ...base, updatedBy: 'NADIE' })).rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'Elige quién hace el cambio («Soy»).' });
    await expect(s.guardarFicha({ ...base, baseVersion: undefined })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(s.guardarFicha({ ...base, ficha: null })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(s.guardarFicha({ ...base, ficha: { ...ayala, codigosRps: ['001300'] } }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT', message: 'El código de RPS 001300 está en dos fichas: «HIJOS DE PEDRO LOPEZ» y «AYALA»' });
    await expect(s.guardarFicha({ ...base, ficha: { ...ayala, recogeDelante: 'NO EXISTE' } })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(s.guardarFicha({ ...base, id: 'no-existe' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await s.history('ayala')).toHaveLength(1);
  });

  it('sin cambios no crea una versión; el identificador lo pone la ruta', async () => {
    const s = store();
    const ayala = await fichaDe(s, 'ayala');
    expect((await s.guardarFicha({ id: 'ayala', baseVersion: 1, ficha: { ...ayala, id: 'otro', version: 7 }, updatedBy: 'IVÁN' })).ficha.version).toBe(1);
    expect(await s.history('ayala')).toHaveLength(1);
  });
});

describe('crear y quitar fichas', () => {
  it('crear guarda al momento con «Ficha creada»; el nombre repetido no se deja', async () => {
    const s = store();
    const { ficha } = await s.crearFicha({ ficha: { nombre: ' Talleres Cal ', codigosRps: ['009999'] }, updatedBy: 'IVÁN' });
    expect(ficha).toEqual({ id: 'talleres-cal', nombre: 'Talleres Cal', codigosRps: ['009999'], version: 1 });
    expect(await s.history('talleres-cal')).toMatchObject([{ version: 1, resumen: ['Ficha creada'], updatedBy: 'IVÁN' }]);
    await expect(s.crearFicha({ ficha: { nombre: 'ayala' }, updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(s.crearFicha({ ficha: { nombre: ' ' }, updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('quitar con su versión deja «Ficha quitada» en su historial; con versión vieja, 409', async () => {
    const s = store();
    const ayala = await fichaDe(s, 'ayala');
    await s.guardarFicha({ id: 'ayala', baseVersion: 1, ficha: { ...ayala, rotulacion: true }, updatedBy: 'IVÁN' });
    await expect(s.quitarFicha({ id: 'ayala', baseVersion: 1, updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    const { snapshot } = await s.quitarFicha({ id: 'ayala', baseVersion: 2, updatedBy: 'JAIME' });
    expect(snapshot.fichas.map((f) => f.id)).toEqual(['hijos-de-pedro-lopez', 'general-wolder']);
    expect((await s.history('ayala'))[0]).toMatchObject({ version: 3, quitada: true, resumen: ['Ficha quitada'], updatedBy: 'JAIME', ficha: { rotulacion: true } });
    await expect(s.quitarFicha({ id: 'ayala', baseVersion: 3, updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('desde un pedido', () => {
  const pedido = { numeroPedido: 'AR.26.04286', updatedBy: 'IVÁN', params: DEFAULT_PARAMS };

  it('añade el código a una ficha con el motivo «Código añadido desde el pedido…» en su historial', async () => {
    const s = store();
    const { ficha } = await s.desdePedido({ ...pedido, cliente: { codigo: '036999', nombre: 'REMOLQUES AYALA BIS' }, fichaId: 'ayala', claves: [] });
    expect(ficha).toMatchObject({ codigosRps: ['036662', '048286', '036999'], version: 2 });
    expect((await s.history('ayala'))[0]).toMatchObject({ version: 2, updatedBy: 'IVÁN', motivo: 'Código añadido desde el pedido AR.26.04286', resumen: ['Códigos de RPS: + 036999'] });
  });

  it('crea la ficha si el cliente no tiene, y guarda solo lo marcado', async () => {
    const s = store();
    const { ficha, snapshot } = await s.desdePedido({ ...pedido, updatedBy: 'JAIME', cliente: { codigo: '009999', nombre: 'TALLERES CAL' }, elemento: LONA, claves: ['medida'] });
    expect(ficha).toEqual({ id: 'talleres-cal', nombre: 'TALLERES CAL', codigosRps: ['009999'], version: 1, medidas: [{ tipo: 'lona', largo: 200, ancho: 120, ollaos: LONA.input.ollaosManuales }] });
    expect(snapshot.fichas).toHaveLength(4);
    expect(await s.history('talleres-cal')).toMatchObject([{ version: 1, motivo: 'Desde el pedido AR.26.04286', resumen: ['Ficha creada'], updatedBy: 'JAIME' }]);
  });

  it('en una ficha que ya existe, el resumen dice la medida nueva', async () => {
    const s = store();
    await s.desdePedido({ ...pedido, cliente: { codigo: '036662', nombre: 'AYALA' }, elemento: LONA, claves: ['medida'] });
    expect((await s.history('ayala'))[0]).toMatchObject({ motivo: 'Desde el pedido AR.26.04286', resumen: ['Medida 200 × 120 de lona nueva'] });
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
    expect(await s.history('ayala')).toHaveLength(1);
  });
});

describe('fichero de la fase 3 recién desplegada (una versión para todas)', () => {
  // Como puede estar ya en el servidor: versión global y un historial con todas las fichas en cada renglón.
  const semilla = () => fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
  async function ficheroAntiguo() {
    const v1 = semilla();
    const v2 = v1.map((f) => (f.id === 'ayala' ? { ...f, rotulacion: true } : f));
    const lineas = [
      { version: 1, updatedAt: '2026-10-01T08:00:00.000Z', updatedBy: '', reason: MOTIVO_SEMILLA, changedSections: NOMBRES, parameters: { fichas: v1 } },
      { version: 2, updatedAt: '2026-10-01T09:00:00.000Z', updatedBy: 'JAIME', reason: 'AYALA rotula', changedSections: ['AYALA'], parameters: { fichas: v2 } }
    ];
    await writeFile(file(), `${JSON.stringify({ version: 2, updatedAt: '2026-10-01T09:00:00.000Z', updatedBy: 'JAIME', reason: 'AYALA rotula', fichas: v2 }, null, 2)}\n`, 'utf8');
    await writeFile(historyFile(), lineas.map((l) => `${JSON.stringify(l)}\n`).join(''), 'utf8');
    return v2;
  }

  it('se lee tal cual: cada ficha en su versión 1 y su historial de antes, sin escribir nada', async () => {
    const v2 = await ficheroAntiguo();
    const antes = await readFile(file(), 'utf8');
    const s = store();
    expect(await s.estado()).toBe('ok');
    expect((await s.getSnapshot()).fichas).toEqual(v2.map((f) => ({ ...f, version: 1 })));
    expect((await s.get()).map((f) => f.nombre)).toEqual(NOMBRES);
    expect((await s.history('ayala')).map((e) => [e.anterior, e.updatedBy, e.motivo, e.resumen])).toEqual([
      [true, 'JAIME', 'AYALA rotula', ['Rotulación: — → Sí']],
      [true, '', MOTIVO_SEMILLA, ['Ficha creada']]
    ]);
    expect(await s.history('general-wolder')).toHaveLength(1);
    expect(await readFile(file(), 'utf8')).toBe(antes);
  });

  it('al guardar una ficha se escribe todo en el formato nuevo y el historial de antes se conserva', async () => {
    await ficheroAntiguo();
    const s = store();
    const hpl = await fichaDe(s, 'hijos-de-pedro-lopez');
    await s.guardarFicha({ id: hpl.id, baseVersion: 1, ficha: { ...hpl, cremallera: true }, updatedBy: 'IVÁN' });
    const guardado = JSON.parse(await readFile(file(), 'utf8'));
    // Sigue llevando la `version` de todo el fichero (sube en cada guardado): la web de antes lo leería.
    expect(guardado).toEqual({ formato: 2, version: 3, fichas: expect.any(Array) });
    expect(guardado.fichas.map((f) => [f.id, f.version])).toEqual([['hijos-de-pedro-lopez', 2], ['ayala', 1], ['general-wolder', 1]]);
    expect(guardado.fichas[1].rotulacion).toBe(true);
    expect((await s.history('hijos-de-pedro-lopez')).map((e) => e.resumen)).toEqual([['Cremallera del 9: — → Sí'], ['Ficha creada']]);
    expect(await s.history('ayala')).toHaveLength(2);
    expect((await readFile(historyFile(), 'utf8')).trim().split('\n')).toHaveLength(3);
  });
});

describe('fichero ilegible', () => {
  const roto = [['JSON roto', '{ roto'], ['forma equivocada', JSON.stringify({ version: 3, fichas: 'no' })]];
  const pedido = { numeroPedido: 'AR.26.04286', updatedBy: 'IVÁN', params: DEFAULT_PARAMS, cliente: { codigo: '036999', nombre: 'X' }, claves: [] };

  it.each(roto)('%s: ni desde un pedido ni al guardar, crear o quitar se toca el fichero', async (_n, contenido) => {
    await writeFile(file(), contenido, 'utf8');
    const s = store();
    await expect(s.desdePedido(pedido)).rejects.toMatchObject({ code: 'FICHAS_ILEGIBLES' });
    await expect(s.guardarFicha({ id: 'ayala', baseVersion: 1, ficha: { id: 'ayala', nombre: 'AYALA', codigosRps: [] }, updatedBy: 'IVÁN' }))
      .rejects.toMatchObject({ code: 'FICHAS_ILEGIBLES', message: 'Las fichas de cliente no se pueden leer; revisa el fichero antes de guardar.' });
    await expect(s.crearFicha({ ficha: { nombre: 'NUEVA' }, updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'FICHAS_ILEGIBLES' });
    await expect(s.quitarFicha({ id: 'ayala', baseVersion: 1, updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'FICHAS_ILEGIBLES' });
    expect(await readFile(file(), 'utf8')).toBe(contenido);
    expect((await s.get()).map((f) => f.nombre)).toEqual(NOMBRES);
    expect(await s.getSnapshot()).toMatchObject({ ilegible: true, fichas: [] });
    expect(await s.estado()).toBe('ilegible');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('un error de lectura que no es «no existe» también cuenta como ilegible', async () => {
    await mkdir(file());
    expect(await store().estado()).toBe('ilegible');
  });
});

describe('estado de las fichas', () => {
  it('«sin-guardar» mientras la semilla no se pueda guardar, y solo se avisa una vez', async () => {
    const bloqueo = path.join(dir, 'bloqueo');
    await writeFile(bloqueo, 'no es una carpeta');
    const s = store({ historyFile: path.join(bloqueo, 'historial.jsonl') });
    expect(await s.estado()).toBe('sin-guardar');
    await s.get();
    await s.estado();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('«ok» cuando están en su fichero', async () => {
    expect(await store().estado()).toBe('ok');
  });
});
