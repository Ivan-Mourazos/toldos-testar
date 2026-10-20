import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import AR2605132 from './__fixtures__/AR2605132.json' with { type: 'json' };
import { crearCorteRemolques } from './archivos.js';

// Nada fuera de tmp/ del repositorio en las pruebas.
const temporales = [];
afterEach(async () => { for (const d of temporales.splice(0)) await fs.rm(d, { recursive: true, force: true }); });

async function montar() {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  const raiz = await fs.mkdtemp(path.resolve('tmp/corte-archivos-'));
  temporales.push(raiz);
  const pendientes = path.join(raiz, 'BOT', 'Pendientes');
  await fs.mkdir(pendientes, { recursive: true });
  const ajustes = async () => ({ corteLonaBotDirectory: path.join(pendientes, '{TECNICO}'), corteLonaPlanoDirectory: path.join(raiz, 'planos') });
  return { pendientes, corte: crearCorteRemolques({ ajustes, oda: { disponible: false } }) };
}

describe('archivos del corte de remolques', () => {
  it('escribe el DXF del bot en la carpeta del autor, con el nombre del pedido', async () => {
    const { pendientes, corte } = await montar();
    await fs.mkdir(path.join(pendientes, 'Ivan.Sanchez'));
    const { ficheros } = await corte.preparar(AR2605132);
    await corte.escribir(ficheros);
    expect(await fs.readdir(path.join(pendientes, 'Ivan.Sanchez'))).toEqual(['AR2605132.dxf']);
  });

  it('no crea nunca la carpeta del bot: si la del autor no está, avisa y no escribe el corte', async () => {
    const { pendientes, corte } = await montar();
    const { ficheros, avisos } = await corte.preparar(AR2605132);
    await corte.escribir(ficheros);
    expect(ficheros.map((f) => f.type)).toEqual(['plano-corte-lona']);
    expect(avisos.join(' ')).toMatch(/No existe la carpeta del bot/);
    expect(await fs.readdir(pendientes)).toEqual([]);
  });
});
