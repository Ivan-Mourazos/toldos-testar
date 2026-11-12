import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { dejarCmtPiloto, textoDxf } from './cmtPiloto.js';
import { leerCmt } from './cmt/index.ts';

const fixture = (nombre) => fs.readFile(path.resolve('src/cmt/__fixtures__', nombre));

let raiz;
beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/cmt-piloto-'));
});
afterEach(async () => { await fs.rm(raiz, { recursive: true, force: true }); });

describe('Piloto del CMT: nuestro fichero junto al que hará el robot, en una carpeta aparte', () => {
  it('sin carpeta configurada no hace nada', async () => {
    const convertir = vi.fn();
    expect(await dejarCmtPiloto({ carpeta: '', archivos: [{ filename: 'AR2600001.dxf', contents: Buffer.from('x') }], convertir })).toEqual([]);
    expect(convertir).not.toHaveBeenCalled();
  });

  it('deja el .cmt con el nombre del pedido, y es un CMT que se lee entero', async () => {
    // AR2605305 no lleva textos: no depende de que haya Arial en el equipo.
    const contents = await fixture('AR2605305.dxf');
    const carpeta = path.join(raiz, 'piloto');
    const r = await dejarCmtPiloto({ carpeta, archivos: [{ filename: 'AR2605305.dxf', contents }] });
    expect(r).toEqual([{ filename: 'AR2605305.cmt', ok: true, objetos: 6 }]);
    const doc = leerCmt(await fs.readFile(path.join(carpeta, 'AR2605305.cmt')));
    expect(doc.objects).toHaveLength(6);
  });

  it('si el DXF trae algo que no se sabe convertir, no deja un CMT a medias: deja las dudas escritas', async () => {
    const convertir = () => ({ cmt: null, objetos: [], avisos: [], dudas: [{ motivo: 'Entidad sin soportar: MTEXT', capa: 'ROTULADOR', handle: '2A' }] });
    const r = await dejarCmtPiloto({ carpeta: raiz, archivos: [{ filename: 'AR2600002.dxf', contents: Buffer.from('x') }], convertir });
    expect(r).toEqual([{ filename: 'AR2600002.dudas.txt', ok: false, dudas: 1 }]);
    await expect(fs.stat(path.join(raiz, 'AR2600002.cmt'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(path.join(raiz, 'AR2600002.dudas.txt'), 'utf8')).toContain('Entidad sin soportar: MTEXT (capa ROTULADOR, entidad 2A)');
  });

  it('un CMT anterior del mismo pedido no se queda si ahora hay dudas, ni las dudas si ahora sale bien', async () => {
    const archivos = [{ filename: 'AR2605305.dxf', contents: await fixture('AR2605305.dxf') }];
    await dejarCmtPiloto({ carpeta: raiz, archivos });
    await dejarCmtPiloto({ carpeta: raiz, archivos, convertir: () => ({ cmt: null, objetos: [], avisos: [], dudas: [{ motivo: 'duda' }] }) });
    expect((await fs.readdir(raiz)).sort()).toEqual(['AR2605305.dudas.txt']);
    await dejarCmtPiloto({ carpeta: raiz, archivos });
    expect((await fs.readdir(raiz)).sort()).toEqual(['AR2605305.cmt']);
  });

  it('un fallo del piloto nunca sale hacia fuera: el envío al robot no depende de él', async () => {
    const aviso = vi.fn();
    const r = await dejarCmtPiloto({ carpeta: raiz, archivos: [{ filename: 'AR2600003.dxf', contents: Buffer.from('x') }],
      convertir: () => { throw new Error('roto'); }, aviso });
    expect(r).toEqual([{ filename: 'AR2600003.dxf', ok: false, error: 'roto' }]);
    expect(aviso).toHaveBeenCalledOnce();
  });

  it('lee los acentos tanto si el DXF viene en UTF-8 como en Windows-1252', () => {
    expect(textoDxf(Buffer.from('REVÉS', 'utf8'))).toBe('REVÉS');
    expect(textoDxf(Buffer.from('REVÉS', 'latin1'))).toBe('REVÉS');
    expect(textoDxf('IGNÍFUGA')).toBe('IGNÍFUGA');
  });
});
