import { expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pasarAProduccion, prepararPlanoProduccion } from './produccion.js';

it('comprueba todos los pasos antes de escribir y manda al bot al final', async () => {
  const llamadas = [];
  const finalizar = vi.fn(() => llamadas.push('cerrar'));
  const pasos = ['PDF', 'Plano', 'DXF al bot'].map(nombre => ({ nombre, preparar: async () => {
    llamadas.push(`comprobar ${nombre}`);
    return { status: 200, cuerpo: {}, ejecutar: async () => { llamadas.push(nombre); return { status: 200, cuerpo: {} }; }, ...(nombre === 'PDF' ? { finalizar } : {}) };
  } }));
  expect(await pasarAProduccion(pasos)).toMatchObject({ status: 200, cuerpo: { hechos: ['PDF', 'Plano', 'DXF al bot'] } });
  expect(llamadas).toEqual(['comprobar PDF', 'comprobar Plano', 'comprobar DXF al bot', 'PDF', 'Plano', 'DXF al bot', 'cerrar']);
});

it('una pregunta del último paso no escribe nada', async () => {
  const escribir = vi.fn();
  const respuesta = await pasarAProduccion([
    { nombre: 'PDF', preparar: async () => ({ status: 200, cuerpo: {}, ejecutar: escribir }) },
    { nombre: 'DXF al bot', preparar: async () => ({ status: 409, cuerpo: { needsConfirmation: true } }) },
  ]);
  expect(respuesta).toMatchObject({ status: 409, cuerpo: { paso: 'DXF al bot', needsConfirmation: true } });
  expect(escribir).not.toHaveBeenCalled();
});

it('un fallo dice qué salió y qué falta, sin cerrar la entrega', async () => {
  const finalizar = vi.fn();
  const respuesta = await pasarAProduccion([
    { nombre: 'PDF', preparar: async () => ({ status: 200, cuerpo: {}, finalizar }) },
    { nombre: 'DXF al bot', preparar: async () => ({ status: 200, cuerpo: {}, ejecutar: async () => { throw new Error('Bot sin permiso'); } }) },
  ]);
  expect(respuesta).toMatchObject({ status: 500, cuerpo: { parcial: true, hechos: ['PDF'], pendientes: ['DXF al bot'], error: expect.stringContaining('Bot sin permiso') } });
  expect(finalizar).not.toHaveBeenCalled();
});

it('comprueba todos los planos revisados de un pedido y no los vuelve a dibujar', async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  const raiz = await fs.mkdtemp(path.resolve('tmp/produccion-planos-'));
  const planos = ['azul.dwg', 'blanco.dwg'].map(filename => ({ filename, plano: path.join(raiz, filename) }));
  const preparar = vi.fn(), escribir = vi.fn();
  try {
    await fs.writeFile(planos[0].plano, 'retoques de ZWCAD');
    const entrada = { confirmado: { ...planos[0], planos }, preparar, escribir };
    await expect(prepararPlanoProduccion(entrada)).rejects.toThrow(/blanco.dwg/);
    await fs.writeFile(planos[1].plano, 'segunda tela');
    expect(await prepararPlanoProduccion(entrada)).toMatchObject({ status: 200, cuerpo: { files: [
      { filename: 'azul.dwg', savedPath: planos[0].plano }, { filename: 'blanco.dwg', savedPath: planos[1].plano },
    ] } });
    expect(preparar).not.toHaveBeenCalled();
    expect(escribir).not.toHaveBeenCalled();
  } finally { await fs.rm(raiz, { recursive: true, force: true }); }
});
