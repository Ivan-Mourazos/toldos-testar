import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import habitual from '../__fixtures__/AR2605134.json';
import { nuevaPuerta } from '../calcular.ts';
import { crearAlmacenPedidos } from '../../remolques/flujo/almacen.ts';
import type { PedidoPuertas, Puerta } from '../tipos.ts';
import { pedidoParaEditar } from './pedido.ts';
import { crearServicioPedidosPuertas, type PlanoPuertas } from './servicio.ts';
import { TIPO_PEDIDO_PUERTAS, type PedidoPuertasGuardado } from './tipos.ts';

// AR2605134 (el caso más común): tres enrollables iguales configuradas desde el PDF del pedido.
function puertaHabitual(): Puerta {
  const f = habitual;
  return { ...nuevaPuerta('PUERTAENR'), frente: f.frente, alto: f.alto, of: f.of, cantidad: f.cantidad, color: f.color,
    rollo: 300, rolloCristal: 140, rolloSaco: 300, confirmada: true, ventanasConfirmadas: true,
    enrollable: { T: f.T, D: f.D, margen: f.margen, empates: [] },
    entradas: f.alturasTubos.map((altura) => ({ altura, diametro: 30 as const, largo: f.frente, alto: 8, huecos: [] })) };
}
const pedidoPantalla = (cambios: Partial<Puerta> = {}): PedidoPuertas & { cabecera: unknown } => ({
  schemaVersion: 1, kind: 'puertas', orderCode: 'AR.26.05134',
  cabecera: { cliente: 'PORTANOVA', fecha: '2026-10-21' },
  elementos: [{ id: 'puerta-1', input: { ...puertaHabitual(), ...cambios } }],
});

let raiz: string;
let activa: boolean;
let aprobada: boolean;
let otro: string | null;
let escritos: string[];
let borradores: boolean;
let servicio: ReturnType<typeof crearServicioPedidosPuertas>;
beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/puertas-flujo-'));
  activa = true;
  aprobada = true;
  otro = null;
  escritos = [];
  borradores = true;
  const almacen = crearAlmacenPedidos<PedidoPuertasGuardado>({ carpeta: async () => path.join(raiz, 'pedidos/puertas'),
    tipo: TIPO_PEDIDO_PUERTAS, nombre: 'puertas', sinCarpeta: 'Sin carpeta' });
  const plano: PlanoPuertas = {
    async preparar(pedido, revisor, carpetaBorradores) {
      return { fichero: { type: 'plano-puertas', filename: `${pedido.orderCode}.dwg`, savedPath: path.join(carpetaBorradores ?? path.join(raiz, 'planos'), `${pedido.orderCode}.dwg`),
        contenido: Buffer.from(`PLANO ${pedido.orderCode} REVISOR ${revisor}`) }, avisos: [] };
    },
    async escribir(fichero) {
      await fs.mkdir(path.dirname(fichero.savedPath), { recursive: true });
      await fs.writeFile(fichero.savedPath, fichero.contenido);
      escritos.push(fichero.filename);
    },
  };
  servicio = crearServicioPedidosPuertas({
    almacen, plano, tecnicos: ['IVÁN', 'DAVID'], otroProducto: async () => otro,
    ajustes: async () => ({ productionEnabled: activa, corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}'),
      corteLonaPlanoDirectory: path.join(raiz, 'planos'), corteLonaDxfDirectory: path.join(raiz, '{YYYY}/DXFs'),
      corteBorradoresDirectory: borradores ? path.join(raiz, 'borradores') : '', corteBorradoresRed: borradores ? String.raw`\\stinkor\oftecnica\BORRADORES CORTE` : '' }),
    coordina: { statusOf: async (ofs) => ({ disponible: true, ofs: Object.fromEntries(ofs.map((of) => [of, aprobada ? { estado: 'aprobada', revisor: 'DAVID' } : { estado: 'en_revision' }])) }) },
    ahora: () => new Date('2026-10-22T08:00:00Z'),
  });
});
afterEach(async () => { await fs.rm(raiz, { recursive: true, force: true }); });

describe('guardar para revisión', () => {
  it('guarda con el autor, el cliente y la fecha, lo lista en su año y escribe el plano para revisar', async () => {
    const { status, cuerpo } = await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ ok: true, review: { orderCode: 'AR2605134', kind: 'puertas', status: 'PENDING_REVIEW',
      summary: { customer: 'PORTANOVA', orderDate: '2026-10-21', technician: 'IVÁN', ofs: ['0233175'], models: ['Enrollable'], awnings: 1 } },
      plano: { files: [{ filename: 'AR2605134.dwg' }] } });
    expect((cuerpo as { review: object }).review).not.toHaveProperty('elementos');
    expect(escritos).toEqual(['AR2605134.dwg']);
    const { reviews } = await servicio.listar(2026);
    expect(reviews.map((r) => r.orderCode)).toEqual(['AR2605134']);
    expect(reviews[0].summary.awningList).toEqual([{ letter: 'A', model: 'Enrollable', of: '0233175', state: 'ok', notes: [] }]);
    expect((await servicio.listar(2025)).reviews).toEqual([]);
    expect((await servicio.obtener('AR2605134')).elementos[0].input.frente).toBe(212);
  });

  it('no guarda sin «Soy», sin OF, con comprobaciones pendientes ni si el número es de otro producto', async () => {
    await expect(servicio.guardar({ pedido: pedidoPantalla(), savedBy: '' })).rejects.toThrow(/Soy/);
    await expect(servicio.guardar({ pedido: pedidoPantalla({ of: '' }), savedBy: 'IVÁN' })).rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/OF de la puerta A/) });
    await expect(servicio.guardar({ pedido: pedidoPantalla({ confirmada: false }), savedBy: 'IVÁN' })).rejects.toThrow(/Confirma el modelo/);
    await expect(servicio.guardar({ pedido: { kind: 'puertas' }, savedBy: 'IVÁN' })).rejects.toMatchObject({ statusCode: 400 });
    otro = 'remolques';
    await expect(servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/remolques/) });
    expect(escritos).toEqual([]);
  });

  it('pregunta antes de sustituir uno guardado y nunca pisa uno generado; el plano hecho a mano no se sustituye sin confirmar', async () => {
    expect((await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).status).toBe(200);
    expect((await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).cuerpo).toMatchObject({ needsConfirmation: true });
    const segunda = await servicio.guardar({ pedido: pedidoPantalla({ frente: 210 }), savedBy: 'DAVID', confirmOverwrite: true });
    // El plano ya estaba: se avisa y no se sustituye al volver a guardar.
    expect(segunda.cuerpo).toMatchObject({ overwritten: true, plano: { files: [], existentes: ['AR2605134.dwg'] } });
    // El autor sigue siendo quien lo guardó primero.
    expect((await servicio.obtener('AR2605134')).summary.technician).toBe('IVÁN');
    expect((await servicio.planoRevision('AR2605134', {})).status).toBe(409);
    expect((await servicio.planoRevision('AR2605134', { confirmOverwrite: true })).status).toBe(200);
    expect((await servicio.generar('AR2605134', { confirmOverwrite: true })).status).toBe(200);
    await expect(servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN', confirmOverwrite: true })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('en simulación guarda el pedido pero no escribe el plano', async () => {
    activa = false;
    const { cuerpo } = await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    expect(cuerpo).toMatchObject({ ok: true, plano: { files: [], avisos: ['Modo simulación: no se ha escrito el plano.'] } });
    expect(escritos).toEqual([]);
  });
});

describe('generar archivos', () => {
  it('solo con CoordinaOT aprobado: escribe el plano definitivo con el revisor y pasa a generado', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    aprobada = false;
    await expect(servicio.generar('AR2605134', {})).rejects.toMatchObject({ statusCode: 409 });
    aprobada = true;
    expect((await servicio.generar('AR2605134', {})).cuerpo).toMatchObject({ needsConfirmation: true, existing: ['AR2605134.dwg'] });
    const { status, cuerpo } = await servicio.generar('AR2605134', { confirmOverwrite: true });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ review: { status: 'PRODUCED', reviewedBy: 'DAVID' }, saved: [{ type: 'plano-puertas', filename: 'AR2605134.dwg' }] });
    expect(await fs.readFile(path.join(raiz, 'planos/AR2605134.dwg'), 'utf8')).toBe('PLANO AR2605134 REVISOR DAVID');
    expect((await servicio.generar('AR2605134', {})).cuerpo).toMatchObject({ unchanged: true });
  });

  it('con la generación apagada no hace nada', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    activa = false;
    await expect(servicio.generar('AR2605134', { confirmOverwrite: true })).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('corte', () => {
  it('enseña el corte y descarga un solo DXF con el número del pedido', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    const vista = await servicio.corte('AR2605134');
    expect(vista.sinOf).toEqual([]);
    expect(vista.cortes.length).toBeGreaterThan(0);
    const dxf = await servicio.descargarCorte('AR2605134');
    expect(dxf.filename).toBe('AR2605134.dxf');
    expect(Buffer.from(dxf.contents).toString('latin1')).toContain('AC1018');
  });

  it('manda el corte con las comprobaciones comunes (autor, CoordinaOT) y lo deja apuntado', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    await expect(servicio.enviarCorte('AR2605134', { usuario: 'DAVID', destino: 'dxfs' })).rejects.toMatchObject({ statusCode: 403 });
    aprobada = false;
    await expect(servicio.enviarCorte('AR2605134', { usuario: 'IVÁN', destino: 'dxfs' })).rejects.toMatchObject({ statusCode: 409 });
    aprobada = true;
    expect((await servicio.enviarCorte('AR2605134', { usuario: 'IVÁN', destino: 'dxfs' })).status).toBe(200);
    const pedido = await servicio.obtener('AR2605134');
    expect(pedido.enviosCorte?.map((e) => e.archivos.map((a) => a.filename))).toEqual([['AR2605134.dxf']]);
    // La carpeta del bot no la crea la web.
    await expect(servicio.enviarCorte('AR2605134', { usuario: 'IVÁN', destino: 'bot', confirmBot: true })).rejects.toThrow(/No existe la carpeta del bot/);
  });
});

it('«Corregir» vuelve a la pantalla con lo guardado (número tal cual, cliente y puertas)', async () => {
  await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
  const editable = pedidoParaEditar(await servicio.obtener('AR2605134'));
  expect(editable).toMatchObject({ kind: 'puertas', orderCode: 'AR.26.05134', cabecera: { cliente: 'PORTANOVA', fecha: '2026-10-21' } });
  expect(editable.elementos[0].input).toEqual(puertaHabitual());
});

// Flujo del DWG, fase 1 (plan del 24/10/2026): el borrador del plano en su carpeta y el enlace para abrirlo en ZWCAD.
describe('borrador del corte', () => {
  const red = String.raw`\\stinkor\oftecnica\BORRADORES CORTE\AR2605134.dwg`;
  it('escribe el plano en la carpeta de borradores y da el enlace tgm-pedidos con su ruta de red', async () => {
    const { status, cuerpo } = await servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ ok: true, existente: false, filename: 'AR2605134.dwg', ruta: red,
      url: `tgm-pedidos://open?kind=cad&path=${encodeURIComponent(red)}` });
    expect(await fs.readFile(path.join(raiz, 'borradores', 'AR2605134.dwg'), 'utf8')).toBe('PLANO AR2605134 REVISOR ');
  });
  it('si ya hay un borrador no lo pisa: lo abre, salvo que se pida generarlo de nuevo', async () => {
    await servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    await fs.writeFile(path.join(raiz, 'borradores', 'AR2605134.dwg'), 'CAMBIADO EN ZWCAD');
    expect((await servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).cuerpo).toMatchObject({ existente: true, ruta: red });
    expect(await fs.readFile(path.join(raiz, 'borradores', 'AR2605134.dwg'), 'utf8')).toBe('CAMBIADO EN ZWCAD');
    expect((await servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN', regenerar: true })).cuerpo).toMatchObject({ existente: false, sustituido: true });
    expect(await fs.readFile(path.join(raiz, 'borradores', 'AR2605134.dwg'), 'utf8')).toBe('PLANO AR2605134 REVISOR ');
  });
  it('no escribe nada sin «Soy», en simulación, sin las carpetas o con comprobaciones pendientes', async () => {
    await expect(servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: '' })).rejects.toMatchObject({ message: expect.stringContaining('Soy') });
    activa = false;
    await expect(servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).rejects.toMatchObject({ message: expect.stringContaining('simulación') });
    activa = true;
    borradores = false;
    await expect(servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).rejects.toMatchObject({ message: expect.stringContaining('borradores') });
    borradores = true;
    await expect(servicio.borradorCorte({ pedido: pedidoPantalla({ alto: 0 }), savedBy: 'IVÁN' })).rejects.toMatchObject({ message: expect.stringContaining('comprobaciones') });
    expect(escritos).toEqual([]);
  });
});
