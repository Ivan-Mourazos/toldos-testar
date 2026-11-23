import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearCarpetaPlanos, plantillaPlanos } from './cmtPlanosCarpeta.js';

let base;
const ahora = () => new Date('2026-11-23T18:00:00Z');
async function fichero(relativo, minutosAtras = 0, contenido = 'DWG') {
  const completo = path.join(base, '2026', relativo);
  await fs.mkdir(path.dirname(completo), { recursive: true });
  await fs.writeFile(completo, contenido);
  const fecha = new Date(ahora().getTime() - minutosAtras * 60_000);
  await fs.utimes(completo, fecha, fecha);
}

beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), 'cmt-planos-'));
  await fichero('AR2605626.dwg', 1);
  await fichero('AR2605626.dwl', 1);
  await fichero('AR2605554.dwg', 5);
  await fichero('AR2605554.bak', 5);
  await fichero('AR2600050/AR2600050 TOLDO.dwg', 10);
  await fichero('AR2600050/viejo/AR2600050.dxf', 20);
  await fichero('notas.xlsx', 0);
});
afterEach(async () => { await fs.rm(base, { recursive: true, force: true }); });

const carpeta = (extra = {}) => crearCarpetaPlanos({ plantilla: path.join(base, '{YYYY}'), ahora, ...extra });

describe('carpeta de planos del año', () => {
  it('lista DWG y DXF también de las subcarpetas, del más reciente al más antiguo', async () => {
    const r = await carpeta().listar();
    expect(r).toMatchObject({ anio: 2026, total: 4, pagina: 1, paginas: 1 });
    expect(r.planos.map(p => p.ruta)).toEqual(['AR2605626.dwg', 'AR2605554.dwg', 'AR2600050/AR2600050 TOLDO.dwg', 'AR2600050/viejo/AR2600050.dxf']);
    expect(r.planos[2]).toMatchObject({ nombre: 'AR2600050 TOLDO.dwg', subcarpeta: 'AR2600050' });
  });
  it('marca como abierto el plano con .dwl de ZWCAD al lado', async () => {
    const { planos } = await carpeta().listar();
    expect(planos.find(p => p.nombre === 'AR2605626.dwg').abierto).toBe(true);
    expect(planos.find(p => p.nombre === 'AR2605554.dwg').abierto).toBe(false);
  });
  it('busca por número sin distinguir mayúsculas, espacios ni tildes', async () => {
    expect((await carpeta().listar({ texto: '5626' })).planos.map(p => p.nombre)).toEqual(['AR2605626.dwg']);
    expect((await carpeta().listar({ texto: 'ar2600050toldo' })).total).toBe(1);
    expect((await carpeta().listar({ texto: '2600050' })).total).toBe(2);
    expect((await carpeta().listar({ texto: 'nada' }))).toMatchObject({ total: 0, paginas: 1, planos: [] });
  });
  it('pagina y corrige páginas fuera de rango', async () => {
    const c = carpeta();
    expect((await c.listar({ porPagina: 3, pagina: 2 }))).toMatchObject({ total: 4, pagina: 2, paginas: 2 });
    expect((await c.listar({ porPagina: 3, pagina: 2 })).planos.map(p => p.nombre)).toEqual(['AR2600050.dxf']);
    expect((await c.listar({ porPagina: 3, pagina: 99 })).pagina).toBe(2);
    expect((await c.listar({ porPagina: 3, pagina: -1 })).pagina).toBe(1);
  });
  it('lee el plano elegido y nunca sale de la carpeta del año', async () => {
    const c = carpeta();
    expect((await c.leer('AR2600050/AR2600050 TOLDO.dwg'))).toMatchObject({ nombre: 'AR2600050 TOLDO.dwg' });
    expect((await c.leer('AR2605626.dwg')).contenido.toString()).toBe('DWG');
    await fichero('../fuera.dwg');
    for (const ruta of ['../fuera.dwg', 'AR2600050/../../fuera.dwg', path.join(base, 'fuera.dwg'), 'notas.xlsx', '', 42]) {
      await expect(c.leer(ruta)).rejects.toMatchObject({ status: 400 });
    }
    await expect(c.leer('NO-EXISTE.dwg')).rejects.toMatchObject({ status: 404 });
  });
  it('rechaza planos de más de 30 MB', async () => {
    await fichero('GRANDE.dwg', 0, Buffer.alloc(30 * 1024 * 1024 + 1));
    await expect(carpeta().leer('GRANDE.dwg')).rejects.toMatchObject({ status: 413 });
  });
  it('avisa si falta configurar la carpeta o no se puede leer', async () => {
    await expect(crearCarpetaPlanos({ plantilla: async () => '', ahora }).listar()).rejects.toMatchObject({ status: 409 });
    await expect(crearCarpetaPlanos({ plantilla: path.join(base, 'no', '{YYYY}'), ahora }).listar()).rejects.toMatchObject({ status: 503 });
  });
  it('enseña lo guardado al momento y lo refresca por detrás pasados 30 segundos', async () => {
    let hora = ahora().getTime();
    const c = carpeta({ ahora: () => new Date(hora) });
    expect((await c.listar()).total).toBe(4);
    await fichero('AR2605700.dwg');
    expect((await c.listar()).total).toBe(4);
    hora += 31_000;
    expect((await c.listar()).total).toBe(4); // lo guardado, sin esperar a la red
    await new Promise(resolve => setTimeout(resolve, 50));
    expect((await c.listar()).total).toBe(5);
  });
  it('espera a la lectura nueva si lo guardado es muy viejo o se pide actualizar', async () => {
    let hora = ahora().getTime();
    const c = carpeta({ ahora: () => new Date(hora) });
    await c.listar();
    await fichero('AR2605700.dwg');
    expect((await c.listar({ fresco: true })).total).toBe(5);
    await fichero('AR2605701.dwg');
    hora += 5 * 60_000;
    expect((await c.listar()).total).toBe(6);
  });
  it('si la búsqueda no encuentra nada, mira de nuevo la carpeta: el plano puede estar recién guardado', async () => {
    let hora = ahora().getTime();
    const c = carpeta({ ahora: () => new Date(hora) });
    await c.listar();
    await fichero('AR2605700.dwg');
    expect((await c.listar({ texto: '5700' })).total).toBe(0); // recién leída: no se repite
    hora += 6_000;
    expect((await c.listar({ texto: '5700' })).planos.map(p => p.nombre)).toEqual(['AR2605700.dwg']);
  });
  it('tras un fallo de lectura vuelve a intentarlo', async () => {
    const otra = path.join(base, 'tarde', '{YYYY}');
    const c = crearCarpetaPlanos({ plantilla: otra, ahora });
    await expect(c.listar()).rejects.toMatchObject({ status: 503 });
    await fs.mkdir(path.join(base, 'tarde', '2026'), { recursive: true });
    expect((await c.listar()).total).toBe(0);
  });
});

describe('plantilla de la carpeta de planos', () => {
  it('sale de la carpeta de planos del corte, sin pedido ni técnico', () => {
    expect(plantillaPlanos({ corteLonaPlanoDirectory: '/mnt/oftecnica/{YYYY}' }, {})).toBe('/mnt/oftecnica/{YYYY}');
    expect(plantillaPlanos({ corteLonaPlanoDirectory: '/mnt/oftecnica/{YYYY}/{PEDIDO}' }, {})).toBe('/mnt/oftecnica/{YYYY}');
    expect(plantillaPlanos({ corteLonaPlanoDirectory: 'X:\\Oficina\\{YYYY}\\{TECNICO}\\planos' }, {})).toBe('X:\\Oficina\\{YYYY}');
    expect(plantillaPlanos({ corteLonaPlanoDirectory: '/mnt/oftecnica/fija' }, {})).toBe('');
    expect(plantillaPlanos({}, {})).toBe('');
  });
  it('CMT_PLANOS_DIRECTORY manda sobre la configuración', () => {
    expect(plantillaPlanos({ corteLonaPlanoDirectory: '/a/{YYYY}' }, { CMT_PLANOS_DIRECTORY: '/b/{YYYY}' })).toBe('/b/{YYYY}');
  });
});
