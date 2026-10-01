import { constants as fsConstants } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comprobarCarpetaInternaRemolques, comprobarCarpetasRemolques, comprobarChromium } from './deploy-remolques.mjs';

const paquete = { dependencies: { 'playwright-core': '1.61.1' }, devDependencies: { playwright: '^1.61.1' } };
const navegadorFalso = (fallo) => ({
  chromium: {
    executablePath: () => '/cache/chrome',
    launch: async () => {
      if (fallo) throw new Error(fallo);
      return { close: async () => {} };
    }
  }
});

describe('comprobarChromium', () => {
  it('acepta Chromium instalado que arranca', async () => {
    const r = await comprobarChromium({ paquete, importarPlaywright: async () => navegadorFalso(), acceso: async () => {} });
    expect(r.errores).toEqual([]);
    expect(r.exitos[0]).toContain('arranca');
  });

  it('falla si falta el ejecutable y explica cómo instalarlo', async () => {
    const r = await comprobarChromium({ paquete, importarPlaywright: async () => navegadorFalso(), acceso: async () => { throw new Error('ENOENT'); } });
    expect(r.errores[0]).toContain('pnpm exec playwright-core install chromium');
  });

  it('falla si está el fichero pero no arranca', async () => {
    const r = await comprobarChromium({ paquete, importarPlaywright: async () => navegadorFalso('libnss3.so missing\nmás'), acceso: async () => {} });
    expect(r.errores[0]).toContain('--with-deps');
    expect(r.errores[0]).toContain('libnss3.so missing');
  });

  it('falla si playwright y playwright-core difieren o falta playwright-core', async () => {
    const distinto = { dependencies: { 'playwright-core': '1.61.1' }, devDependencies: { playwright: '^1.60.0' } };
    expect((await comprobarChromium({ paquete: distinto, importarPlaywright: async () => navegadorFalso() })).errores[0]).toContain('misma versión');
    expect((await comprobarChromium({ paquete: {}, importarPlaywright: async () => navegadorFalso() })).errores[0]).toContain('playwright-core');
  });
});

describe('comprobarCarpetasRemolques', () => {
  const existe = async () => {};

  it('avisa, sin fallar, si no están definidas', async () => {
    const r = await comprobarCarpetasRemolques({ planteamientos: '', oficinaTecnica: '', escrituraActiva: true, estricto: true, acceso: existe });
    expect(r.errores).toEqual([]);
    expect(r.avisos).toHaveLength(2);
  });

  it('falla si la de oficina técnica no lleva {YYYY}', async () => {
    const r = await comprobarCarpetasRemolques({ planteamientos: '/mnt/a', oficinaTecnica: '/mnt/b', escrituraActiva: false, estricto: false, acceso: existe });
    expect(r.errores[0]).toContain('{YYYY}');
  });

  it('comprueba la parte anterior a {YYYY} y exige escritura si está activa', async () => {
    const visto = [];
    const acceso = async (ruta) => { visto.push(ruta); throw new Error('EACCES'); };
    const r = await comprobarCarpetasRemolques({ planteamientos: '/mnt/a', oficinaTecnica: '/mnt/b/{YYYY}', escrituraActiva: true, estricto: true, acceso });
    expect(visto).toEqual(['/mnt/a', '/mnt/b']);
    expect(r.errores).toHaveLength(2);
    const sinEscritura = await comprobarCarpetasRemolques({ planteamientos: '/mnt/a', oficinaTecnica: '/mnt/b/{YYYY}', escrituraActiva: false, estricto: false, acceso });
    expect(sinEscritura.errores).toEqual([]);
    expect(sinEscritura.avisos).toHaveLength(2);
  });

  it('una ruta de Windows es error solo en despliegue estricto', async () => {
    const dev = await comprobarCarpetasRemolques({ planteamientos: 'C:\\x', oficinaTecnica: '/m/{YYYY}', escrituraActiva: false, estricto: false, acceso: existe });
    expect(dev.errores).toEqual([]);
    expect(dev.avisos[0]).toContain('Windows');
    const prod = await comprobarCarpetasRemolques({ planteamientos: 'C:\\x', oficinaTecnica: '/m/{YYYY}', escrituraActiva: false, estricto: true, acceso: existe });
    expect(prod.errores[0]).toContain('Windows');
  });
});

describe('comprobarCarpetaInternaRemolques', () => {
  const existe = async () => {};

  it('avisa, sin fallar, si no está definida', async () => {
    const r = await comprobarCarpetaInternaRemolques({ carpeta: '', estricto: true, acceso: existe });
    expect(r.errores).toEqual([]);
    expect(r.avisos[0]).toContain('REMOLQUES_REVISION_DIRECTORY no está definido');
  });

  it('falla si lleva {YYYY}', async () => {
    const r = await comprobarCarpetaInternaRemolques({ carpeta: '/var/lib/x/{YYYY}', estricto: false, acceso: existe });
    expect(r.errores[0]).toContain('{YYYY}');
  });

  it('exige una ruta Linux absoluta con permiso de escritura', async () => {
    const visto = [];
    const ok = await comprobarCarpetaInternaRemolques({ carpeta: '/var/lib/toldos-testar/remolques-pedidos', estricto: true, acceso: async (ruta, modo) => { visto.push([ruta, modo]); } });
    expect(ok.exitos).toHaveLength(1);
    expect(visto).toEqual([['/var/lib/toldos-testar/remolques-pedidos', fsConstants.R_OK | fsConstants.W_OK]]);
    const sinPermiso = await comprobarCarpetaInternaRemolques({ carpeta: '/var/lib/x', estricto: true, acceso: async () => { throw new Error('EACCES'); } });
    expect(sinPermiso.errores[0]).toContain('sin permiso de escritura');
    const ventanas = await comprobarCarpetaInternaRemolques({ carpeta: 'C:\\pedidos', estricto: false, acceso: existe });
    expect(ventanas.avisos[0]).toContain('Windows');
    const relativa = await comprobarCarpetaInternaRemolques({ carpeta: 'pedidos', estricto: true, acceso: existe });
    expect(relativa.errores[0]).toContain('no usa una ruta Linux absoluta');
  });
});
