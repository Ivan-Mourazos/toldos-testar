import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import habitual from '../__fixtures__/AR2605134.json';
import { nuevaPuerta } from '../calcular.ts';
import { crearAlmacenPedidos } from '../../remolques/flujo/almacen.ts';
import { crearAlmacenConfirmaciones } from '../../flujoDwg/confirmaciones.js';
import { crearPlanoPuertas } from './archivos.ts';
import { crearServicioCadPaginasPuertas } from './cadPaginas.ts';
import { crearServicioPedidosPuertas } from './servicio.ts';
import { TIPO_PEDIDO_PUERTAS, type PedidoPuertasGuardado } from './tipos.ts';
import type { PedidoPuertas, Puerta } from '../tipos.ts';

function puertaHabitual(): Puerta {
  const f = habitual;
  return {
    ...nuevaPuerta('PUERTAENR'),
    frente: f.frente,
    alto: f.alto,
    of: f.of,
    cantidad: f.cantidad,
    color: f.color,
    rollo: 300,
    rolloCristal: 140,
    rolloSaco: 300,
    confirmada: true,
    ventanasConfirmadas: true,
    enrollable: { T: f.T, D: f.D, margen: f.margen, empates: [] },
    entradas: f.alturasTubos.map((altura) => ({ altura, diametro: 30 as const, largo: f.frente, alto: 8, huecos: [] })),
  };
}

const pedidoPantalla = (cambios: Partial<Puerta> = {}): PedidoPuertas & { cabecera: { cliente: string; fecha: string } } => ({
  schemaVersion: 1,
  kind: 'puertas',
  orderCode: 'AR.26.05134',
  cabecera: { cliente: 'PORTANOVA', fecha: '2026-10-21' },
  elementos: [{ id: 'puerta-1', input: { ...puertaHabitual(), ...cambios } }],
});

let raiz: string;
let almacen: ReturnType<typeof crearAlmacenPedidos<PedidoPuertasGuardado>>;
let servicioPuertas: ReturnType<typeof crearServicioPedidosPuertas>;
let servicioCad: ReturnType<typeof crearServicioCadPaginasPuertas>;

beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/puertas-cad-'));
  const ajustes = async () => ({
    productionEnabled: true,
    corteLonaPlanoDirectory: path.join(raiz, 'planos'),
    corteLonaDxfDirectory: path.join(raiz, '{YYYY}/DXFs'),
    corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}'),
    corteBorradoresDirectory: path.join(raiz, 'borradores'),
    corteBorradoresRed: String.raw`\\toldosgomez.local\DFS_POL\oftecnica\borradores`,
  });
  const confirmaciones = crearAlmacenConfirmaciones({ carpeta: async () => path.join(raiz, 'confirmados') });
  almacen = crearAlmacenPedidos<PedidoPuertasGuardado>({
    carpeta: async () => path.join(raiz, 'pedidos/puertas'),
    tipo: TIPO_PEDIDO_PUERTAS,
    nombre: 'puertas',
    sinCarpeta: 'Sin carpeta',
  });
  servicioPuertas = crearServicioPedidosPuertas({
    almacen,
    ajustes,
    tecnicos: ['IVÁN', 'DAVID'],
    otroProducto: async () => null,
    plano: crearPlanoPuertas({ ajustes, oda: { disponible: false, convertir: async (b) => b } }),
    confirmaciones,
    coordina: { statusOf: async (ofs) => ({ disponible: true, ofs: Object.fromEntries(ofs.map((of) => [of, { estado: 'aprobada', revisor: 'DAVID' }])) }) },
  });
  servicioCad = crearServicioCadPaginasPuertas({
    obtenerPedido: (codigo) => almacen.obtener(codigo),
    ajustes,
    oda: { disponible: false, convertir: async (b) => Buffer.from(b) },
    almacenEscritos: confirmaciones as unknown as Parameters<typeof crearServicioCadPaginasPuertas>[0]['almacenEscritos'],
  });
});

afterEach(async () => {
  await fs.rm(raiz, { recursive: true, force: true });
});

describe('vista CAD con la carpeta de puertas', () => {
  it('devuelve tieneDwg: false cuando todavía no existe ningún plano ni borrador', async () => {
    const res = await servicioCad.obtenerPaginas('AR2605134');
    expect(res).toMatchObject({ ok: true, orderCode: 'AR2605134', tieneDwg: false, origen: null, paginas: [] });
  });

  it('renderiza las presentaciones reales desde el plano guardado de puertas y las cachea', async () => {
    await servicioPuertas.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });

    const primera = await servicioCad.obtenerPaginas('AR2605134');
    expect(primera.tieneDwg).toBe(true);
    expect(primera.origen).toBe('revisado');
    expect(primera.actualizado).toBe(true);
    expect(primera.modificadoAMano).toBe(false);
    expect(primera.cacheado).toBe(false);
    expect(primera.paginas.length).toBeGreaterThan(0);
    expect(primera.paginas[0].svg).toContain('<svg');
    expect(primera.paginas[0].archivo).toBe('AR2605134.dxf');

    const segunda = await servicioCad.obtenerPaginas('AR2605134');
    expect(segunda.cacheado).toBe(true);
    expect(segunda.paginas).toEqual(primera.paginas);
  });

  it('marca desactualizado si el registro se editó sin regenerar el corte y detecta cambios hechos a mano', async () => {
    await servicioPuertas.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    await servicioPuertas.guardarRegistroSinRevisar('AR2605134', {
      pedido: pedidoPantalla({ frente: 260 }),
      usuario: 'DAVID',
    });

    const desactualizado = await servicioCad.obtenerPaginas('AR2605134');
    expect(desactualizado.tieneDwg).toBe(true);
    expect(desactualizado.actualizado).toBe(false);
    expect(desactualizado.motivoDesactualizado).toMatch(/no coinciden/i);
    expect(desactualizado.modificadoAMano).toBe(false);

    // Retoque manual en el fichero de la carpeta de planos
    const rutaPlano = path.join(raiz, 'planos/AR2605134.dxf');
    const original = await fs.readFile(rutaPlano, 'utf8');
    await fs.writeFile(rutaPlano, `${original}\n`);

    const retocado = await servicioCad.obtenerPaginas('AR2605134');
    expect(retocado.modificadoAMano).toBe(true);
    expect(retocado.archivosModificadosAMano).toEqual(['AR2605134.dxf']);
    expect(retocado.cacheado).toBe(false);
  });

  it('lee el borrador de la carpeta de borradores si el pedido todavía no está guardado en Pedidos', async () => {
    const borrador = await servicioPuertas.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    expect(borrador.status).toBe(200);

    const vista = await servicioCad.obtenerPaginas('AR2605134');
    expect(vista.tieneDwg).toBe(true);
    expect(vista.origen).toBe('borrador');
    expect(vista.paginas.length).toBeGreaterThan(0);
    expect(vista.modificadoAMano).toBe(false);
  });
});
