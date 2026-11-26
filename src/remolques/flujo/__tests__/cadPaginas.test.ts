import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import pedido4390 from '../../corte/__fixtures__/AR2604390.json';
import { generarCorteRemolques } from '../../corte/index.js';
import { crearServicioCadPaginasFlujo } from '../../../puertas/flujo/cadPaginas.ts';
import { puerta5743 } from '../../../puertas/__fixtures__/tgm5743.ts';
import { pedidoDe } from '../../../puertas/__fixtures__/ejemplos.ts';
import { escribirPlanoPuertas } from '../../../puertas/plano.ts';

// Iván, 25/11/2026: «quiero que la web tenga en todo el nuevo flujo y el nuevo dibujo». Remolques enseña el plano del
// CAD como toldos y puertas: las presentaciones y la pestaña Corte con las cotas de cada bloque.
type Pedido = { summary: { technician: string }; orderCode: string; production?: { files: { type: string; filename: string; savedPath: string }[] }; firma: string };

let raiz: string;
beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/remolques-cad-'));
});
afterEach(async () => { await fs.rm(raiz, { recursive: true, force: true }); });

function servicio(pedido: Pedido | null) {
  return crearServicioCadPaginasFlujo<Pedido>({
    obtenerPedido: async () => pedido,
    ajustes: async () => ({ corteBorradoresDirectory: path.join(raiz, 'borradores') }) as never,
    oda: { disponible: false, convertir: async (b) => Buffer.from(b) },
    tipoPlano: 'plano-corte-lona',
    huella: () => 'firma-actual',
  });
}

describe('dibujo del CAD de un pedido de remolques', () => {
  it('lee el plano del corte guardado: presentaciones, corte con sus cotas y al día', async () => {
    const dxf = generarCorteRemolques(pedido4390 as never).archivo!.plano.dxf;
    const ruta = path.join(raiz, 'AR2604390.dxf');
    await fs.writeFile(ruta, dxf, 'utf8');
    const r = await servicio({ orderCode: 'AR2604390', summary: { technician: 'IVÁN' }, firma: 'firma-actual',
      production: { files: [{ type: 'plano-corte-lona', filename: 'AR2604390.dxf', savedPath: ruta }] } }).obtenerPaginas('AR2604390');
    expect(r.tieneDwg).toBe(true);
    expect(r.origen).toBe('revisado');
    expect(r.actualizado).toBe(true);
    expect(r.paginas.length).toBeGreaterThan(0);
    expect(r.cortes).toHaveLength(1);
    expect(r.cortes[0].cotas.map(c => `${c.eje} ${c.texto}`).sort()).toEqual(['x 308', 'y 247,9']);
  });

  it('sin plano guardado ni borrador, dice que no hay DWG', async () => {
    const r = await servicio({ orderCode: 'AR2604390', summary: { technician: 'IVÁN' }, firma: '' }).obtenerPaginas('AR2604390');
    expect(r.tieneDwg).toBe(false);
    expect(r.paginas).toEqual([]);
  });

  it('sin DWG, enseña el plano que escribiría la web: el corte todo junto, con sus cotas', async () => {
    // Iván, 26/11/2026: «que salga el corte tal cual en el CAD, no hace falta un apartado para el saco y otro para el cristal».
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2605743', puerta5743('general')), cabecera: { cliente: 'General', tecnico: 'IVÁN', revisor: '', fecha: '26/11/2026' } });
    const r = await crearServicioCadPaginasFlujo<Pedido>({
      obtenerPedido: async () => ({ orderCode: 'AR2605743', summary: { technician: 'IVÁN' }, firma: '' }),
      ajustes: async () => ({ corteBorradoresDirectory: path.join(raiz, 'borradores') }) as never,
      oda: { disponible: false, convertir: async (b) => Buffer.from(b) },
      tipoPlano: 'plano-puertas',
      huella: () => '',
      planoDeLaWeb: async () => dxf,
    }).obtenerPaginas('AR2605743');
    expect(r.origen).toBe('web');
    expect(r.paginas.length).toBeGreaterThan(0);
    expect(r.cortes).toHaveLength(1);
    expect(r.cortes[0].cotas.map(c => c.texto)).toEqual(expect.arrayContaining(['39', '262,5']));
  });
});
