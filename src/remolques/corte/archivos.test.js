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
  it('al revisar escribe solo el plano; el DXF se prepara aparte, sin escribirlo', async () => {
    const { pendientes, corte } = await montar();
    await fs.mkdir(path.join(pendientes, 'Ivan.Sanchez'));
    const { ficheros } = await corte.preparar(AR2605132);
    await corte.escribir(ficheros);
    expect(await fs.readdir(path.join(pendientes, 'Ivan.Sanchez'))).toEqual([]);
    expect(ficheros.map((f) => f.type)).toEqual(['plano-corte-lona']);
    expect((await corte.prepararDxf(AR2605132))[0].filename).toBe('AR2605132.dxf');
  });

  it('el plano de revisión no depende de que exista la carpeta del bot', async () => {
    const { pendientes, corte } = await montar();
    const { ficheros, avisos } = await corte.preparar(AR2605132);
    await corte.escribir(ficheros);
    expect(ficheros.map((f) => f.type)).toEqual(['plano-corte-lona']);
    expect(avisos.join(' ')).not.toMatch(/carpeta del bot/);
    expect(await fs.readdir(pendientes)).toEqual([]);
  });

  // Iván, 11/11/2026: «de principio en los cortes de remolques no vamos a aprovechar con cosas de stock».
  it('de entrada no mete sacos ni tiras de stock en los huecos; queda apagado, no borrado', async () => {
    const ajustes = async () => ({});
    const stock = (cortes) => cortes.reduce((n, c) => n + c.sacos.length + c.refuerzosStock.length, 0);
    const sin = await crearCorteRemolques({ ajustes, oda: { disponible: false } }).vista(AR2605132);
    expect(stock(sin.cortes)).toBe(0);
    expect(JSON.stringify(sin.cortes)).not.toMatch(/STOCK/);
    const con = await crearCorteRemolques({ ajustes, oda: { disponible: false }, aprovecharStock: true }).vista(AR2605132);
    expect(stock(con.cortes)).toBeGreaterThan(0);
  });
});
