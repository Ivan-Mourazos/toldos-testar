import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { crearTablaCapas } from './cmtTablaCapas.js';

let raiz, tabla;
beforeEach(async () => {
  raiz = await fs.mkdtemp(path.resolve('tmp/cmt-tabla-'));
  tabla = crearTablaCapas({ archivo: path.join(raiz, 'config', 'capas.json'), inicial: { ' corte ': 'DISCO1', DISCO2: 'DISCO2' } });
});
afterEach(() => fs.rm(raiz, { recursive: true, force: true }));

it('carga, normaliza y permite sustituir la tabla', async () => {
  expect(await tabla.leer()).toEqual({ CORTE: 'DISCO1' });
  await tabla.guardar({ lineas: 'DISCO1' });
  expect(await tabla.leer()).toEqual({ CORTE: 'DISCO1', LINEAS: 'DISCO1' });
  await expect(tabla.guardar({ LINEAS: 'INVÁLIDA' })).rejects.toThrow(/Herramienta/);
  await tabla.reemplazar({ nueva: 'NO_CORTAR', ' ': 'DISCO2', cutter: 'DISCO2', 0: 'DISCO2' });
  expect(await tabla.leer()).toEqual({ NUEVA: 'NO_CORTAR' });
});

it('encola guardados simultáneos sin perder capas', async () => {
  await Promise.all([tabla.guardar({ PRIMERA: 'DISCO1' }), tabla.guardar({ SEGUNDA: 'DISCO2' })]);
  expect(await tabla.leer()).toEqual({ CORTE: 'DISCO1', PRIMERA: 'DISCO1', SEGUNDA: 'DISCO2' });
});
