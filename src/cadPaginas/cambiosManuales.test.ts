import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenConfirmaciones } from '../flujoDwg/confirmaciones.js';
import {
  MENSAJE_CAMBIOS_A_MANO,
  borrarEscritosBorrador,
  detectarCambiosManualesDwg,
  guardarEscritosBorrador,
  leerEscritosBorrador,
  registrarArchivosEscritos
} from './cambiosManuales.ts';

let raiz: string;

beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/cad-manuales-'));
});

afterEach(async () => {
  await fs.rm(raiz, { recursive: true, force: true });
});

describe('detección de cambios hechos a mano en el DWG', () => {
  it('detecta ediciones por bytes (sha256) incluso con mismo tamaño y no da falso positivo si solo cambia mtime', async () => {
    const ruta = path.join(raiz, 'AR2601234 (plano).dwg');
    await fs.writeFile(ruta, 'CONTENIDO-AAAA');
    const escritos = await registrarArchivosEscritos([{ filename: 'AR2601234 (plano).dwg', plano: ruta }]);
    const confirmado = {
      huella: 'h1',
      por: 'IVÁN',
      fecha: new Date().toISOString(),
      filename: 'AR2601234 (plano).dwg',
      plano: ruta,
      archivosEscritos: escritos
    };

    // Sin tocar -> false
    expect(await detectarCambiosManualesDwg({ corteConfirmado: confirmado })).toEqual({
      modificadoAMano: false,
      archivosModificados: []
    });

    // Solo cambia mtime con los mismos bytes -> false (no falso positivo)
    const futuro = new Date(Date.now() + 60_000);
    await fs.utimes(ruta, futuro, futuro);
    expect(await detectarCambiosManualesDwg({ corteConfirmado: confirmado })).toEqual({
      modificadoAMano: false,
      archivosModificados: []
    });

    // Mismo tamaño pero bytes distintos -> true
    await fs.writeFile(ruta, 'CONTENIDO-BBBB');
    expect(await detectarCambiosManualesDwg({ corteConfirmado: confirmado })).toEqual({
      modificadoAMano: true,
      archivosModificados: ['AR2601234 (plano).dwg']
    });
    expect(MENSAJE_CAMBIOS_A_MANO).toBe('El DWG tiene cambios hechos a mano; si regeneras se pierden');
  });

  it('detecta cambios en registros legacy (sin archivosEscritos) por mtime posterior a la fecha guardada', async () => {
    const ruta = path.join(raiz, 'AR2601235 (plano).dwg');
    await fs.writeFile(ruta, 'ORIGINAL');
    const pasado = new Date(Date.now() - 120_000).toISOString();
    const confirmado = {
      huella: 'h1',
      por: 'ANA',
      fecha: pasado,
      filename: 'AR2601235 (plano).dwg',
      plano: ruta
    };
    const r = await detectarCambiosManualesDwg({ corteConfirmado: confirmado });
    expect(r.modificadoAMano).toBe(true);
    expect(r.archivosModificados).toEqual(['AR2601235 (plano).dwg']);
  });

  it('guarda, lee y detecta cambios a mano en borradores y tolera carpeta interna sin configurar', async () => {
    const almacen = crearAlmacenConfirmaciones({ carpeta: async () => path.join(raiz, 'confirmados') });
    const ruta = path.join(raiz, 'borradores', 'AR2601236 (plano).dwg');
    await fs.mkdir(path.dirname(ruta), { recursive: true });
    await fs.writeFile(ruta, 'BORRADOR-1');
    await guardarEscritosBorrador(almacen, 'AR2601236', [{ filename: 'AR2601236 (plano).dwg', plano: ruta }]);

    const escritos = await leerEscritosBorrador(almacen, 'AR2601236');
    expect(escritos).toHaveLength(1);
    expect((await detectarCambiosManualesDwg({
      borradores: [{ filename: 'AR2601236 (plano).dwg', ruta }],
      escritosBorrador: escritos
    })).modificadoAMano).toBe(false);

    await fs.writeFile(ruta, 'BORRADOR-EDITADO-EN-ZWCAD');
    expect(await detectarCambiosManualesDwg({
      borradores: [{ filename: 'AR2601236 (plano).dwg', ruta }],
      escritosBorrador: escritos
    })).toEqual({
      modificadoAMano: true,
      archivosModificados: ['AR2601236 (plano).dwg']
    });

    await borrarEscritosBorrador(almacen, 'AR2601236');
    expect(await leerEscritosBorrador(almacen, 'AR2601236')).toEqual([]);

    // Carpeta interna vacía (409) no rompe la lectura ni el borrado
    const sinCarpeta = crearAlmacenConfirmaciones({ carpeta: async () => '' });
    expect(await leerEscritosBorrador(sinCarpeta, 'AR2601236')).toEqual([]);
    await expect(borrarEscritosBorrador(sinCarpeta, 'AR2601236')).resolves.toBeUndefined();
  });
});
