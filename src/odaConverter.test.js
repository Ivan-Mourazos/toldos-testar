import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { crearOdaConverter, comprobarOda } from './odaConverter.js';
import revision from './domain/corteLona/fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './domain/corteLona/index.js';

const temporal = path.resolve('tmp/oda-tests');
const falso = path.resolve('src/fixtures/oda-falso.mjs');
afterEach(async () => { await fs.rm(temporal, { recursive: true, force: true }); });
const crear = (modo = '', timeoutMs = 5000) => crearOdaConverter({
  executable: process.execPath, executableArgs: [falso], tempRoot: temporal, timeoutMs, env: { ODA_FAKE_MODE: modo }
});

describe('ODA aislado del taller', () => {
  it('convierte a DWG 2018 y de DWG a DXF, y elimina todos los temporales', async () => {
    const oda = crear();
    expect(await oda.convertir(Buffer.from('DXF'), { desde: 'dxf', hasta: 'dwg' })).toEqual(Buffer.from('AC1032DWG FALSO'));
    expect(await oda.convertir(Buffer.from('CONTENIDO'), { desde: 'dwg', hasta: 'dxf' })).toEqual(Buffer.from('CONTENIDO'));
    expect(await fs.readdir(temporal)).toEqual([]);
  });
  it.each(['err', 'exit', 'missing', 'timeout'])('rechaza %s y limpia aunque falle', async (modo) => {
    await expect(crear(modo, modo === 'timeout' ? 200 : 5000).convertir(Buffer.from('DXF'))).rejects.toThrow(/ODA/);
    expect(await fs.readdir(temporal)).toEqual([]);
  });
  it('sin configuración avisa y la comprobación nunca bloquea el despliegue', async () => {
    expect(await comprobarOda({ executable: '', tempRoot: temporal })).toMatchObject({ ok: false, aviso: expect.stringContaining('ODA') });
    expect(await comprobarOda({ executable: 'no-existe-oda', tempRoot: temporal })).toMatchObject({ ok: false });
    expect(await comprobarOda({ executable: process.execPath, executableArgs: [falso], tempRoot: temporal })).toMatchObject({ ok: true });
  });
  const real = process.env.ODA_FILE_CONVERTER || 'C:/Users/ivan.sanchez/tools/oda/ODAFileConverter.exe';
  it.skipIf(!existsSync(real))('la sonda de despliegue responde con ODA instalado', async () => {
    expect(await comprobarOda({ executable: real, tempRoot: temporal })).toEqual({ ok: true, mensaje: 'ODA está configurado y convierte a DWG 2018.' });
  }, 65_000);
  it.skipIf(!existsSync(real))('convierte el plano real a DWG AC1032 con ODA instalado', async () => {
    const plano = generarCorteLona(revision.order, { ofStockSacos: '0230811' }).plano[0];
    const contenido = await crearOdaConverter({ executable: real, tempRoot: temporal }).convertir(Buffer.from(plano.dxf, 'utf8'));
    expect(contenido.subarray(0, 6).toString()).toBe('AC1032');
  }, 65_000);
});
