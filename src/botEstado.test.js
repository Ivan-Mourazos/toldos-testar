import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { estadoBot, estadoBotCompartido } from './botEstado.js';

let raiz;
beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/bot-estado-'));
});
afterEach(() => fs.rm(raiz, { recursive: true, force: true }));

async function dejar(carpeta, nombre) {
  await fs.mkdir(path.join(raiz, carpeta), { recursive: true });
  const archivo = path.join(raiz, carpeta, nombre);
  await fs.writeFile(archivo, 'x');
  return archivo;
}

describe('semáforo del bot de corte', () => {
  it('sin carpeta configurada o con {PEDIDO} no afirma nada', async () => {
    expect((await estadoBot({ plantilla: '' })).estado).toBe('sin-datos');
    expect((await estadoBot({ plantilla: path.join(raiz, '{PEDIDO}') })).estado).toBe('sin-datos');
  });

  it('si no se puede leer ninguna carpeta, sin datos', async () => {
    const estado = await estadoBot({ plantilla: path.join(raiz, 'no-existe/{TECNICO}') });
    expect(estado).toMatchObject({ estado: 'sin-datos', cola: [] });
  });

  it('carpetas vacías: al día; ignora lo que no es DXF', async () => {
    await dejar('Ivan.Sanchez', 'ARCHIVO LEYENDA.dwg');
    const estado = await estadoBot({ plantilla: path.join(raiz, '{TECNICO}') });
    expect(estado).toMatchObject({ estado: 'al-dia', cola: [], desde: null });
  });

  it('un DXF recién llegado está en cola; pasado el plazo, el bot está parado', async () => {
    await dejar('Ivan.Sanchez', 'AR2600001.dxf');
    await dejar('Angel', 'AR2600002.DXF');
    const plantilla = path.join(raiz, '{TECNICO}');
    const ahora = new Date();
    const enCola = await estadoBot({ plantilla, ahora: new Date(ahora.getTime() + 60_000) });
    expect(enCola.estado).toBe('en-cola');
    expect(enCola.cola.map((c) => [c.pedido, c.tecnico]).sort()).toEqual([['AR2600001', 'IVÁN'], ['AR2600002', 'ÁNGEL']]);
    // Cada DXF dice su archivo y su carpeta, y el estado las carpetas que ha podido mirar.
    expect(enCola.cola.find((c) => c.pedido === 'AR2600001')).toMatchObject({ archivo: 'AR2600001.dxf', carpeta: path.join(raiz, 'Ivan.Sanchez') });
    expect(enCola.carpetas.sort()).toEqual([path.join(raiz, 'Angel'), path.join(raiz, 'Ivan.Sanchez')]);
    const parado = await estadoBot({ plantilla, ahora: new Date(ahora.getTime() + 16 * 60_000) });
    expect(parado.estado).toBe('parado');
    expect(parado.desde).toBe(parado.cola[0].desde);
  });

  it('un DXF copiado a mano con fecha vieja cuenta desde que llegó, no desde que se dibujó', async () => {
    const archivo = await dejar('Jaime', 'AR2600003.dxf');
    const viejo = new Date(Date.now() - 5 * 24 * 3600_000);
    await fs.utimes(archivo, viejo, viejo);
    const info = await fs.stat(archivo);
    const estado = await estadoBot({ plantilla: path.join(raiz, '{TECNICO}'), ahora: new Date(Date.now() + 60_000) });
    // Donde el sistema de archivos no guarda la fecha de creación solo queda la de modificación.
    expect(estado.estado).toBe(info.birthtimeMs > viejo.getTime() ? 'en-cola' : 'parado');
  });

  it('sin {TECNICO} mira la carpeta tal cual y resuelve el año', async () => {
    await dejar(`${new Date().getFullYear()}/DXFs`, 'AR2600004.dxf');
    const estado = await estadoBot({ plantilla: path.join(raiz, '{YYYY}/DXFs'), ahora: new Date(Date.now() + 1000) });
    expect(estado.cola).toMatchObject([{ pedido: 'AR2600004', tecnico: '' }]);
  });

  it('varias consultas seguidas comparten una sola lectura', async () => {
    let lecturas = 0;
    let t = 1_000_000;
    const consultar = estadoBotCompartido(() => { lecturas += 1; return ''; }, { ms: 30_000, reloj: () => new Date(t) });
    await consultar(); await consultar();
    expect(lecturas).toBe(1);
    t += 31_000;
    await consultar();
    expect(lecturas).toBe(2);
  });
});
