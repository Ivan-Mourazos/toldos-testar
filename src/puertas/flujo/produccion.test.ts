import fs from 'node:fs/promises';
import path from 'node:path';
import pdfLib from 'pdf-lib';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import habitual from '../__fixtures__/AR2605134.json';
import { nuevaPuerta } from '../calcular.ts';
import { crearAlmacenPedidos } from '../../remolques/flujo/almacen.ts';
import { crearServicioPedidosPuertas } from './servicio.ts';
import { crearPlanoPuertas } from './archivos.ts';
import { TIPO_PEDIDO_PUERTAS, type PedidoPuertasGuardado } from './tipos.ts';

let raiz: string;
let servicio: ReturnType<typeof crearServicioPedidosPuertas>;
let aprobada: boolean;
beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/puertas-produccion-'));
  aprobada = true;
  const ajustes = async () => ({ productionEnabled: true, corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}'), corteLonaPlanoDirectory: path.join(raiz, 'planos'),
    corteLonaDxfDirectory: path.join(raiz, '{YYYY}/DXFs'), remolquesPlanteamientosDirectory: path.join(raiz, 'pdf'), remolquesOficinaTecnicaDirectory: path.join(raiz, '{YYYY}/oficina') });
  const almacen = crearAlmacenPedidos<PedidoPuertasGuardado>({ carpeta: async () => path.join(raiz, 'pedidos'), tipo: TIPO_PEDIDO_PUERTAS, nombre: 'puertas', sinCarpeta: 'Sin carpeta' });
  servicio = crearServicioPedidosPuertas({ almacen, ajustes, tecnicos: ['IVÁN'], otroProducto: async () => null,
    plano: crearPlanoPuertas({ ajustes, oda: { disponible: false, convertir: async b => b } }),
    coordina: { statusOf: async ofs => ({ disponible: true, ofs: Object.fromEntries(ofs.map(of => [of, { estado: aprobada ? 'aprobada' : 'en_revision' }])) }) },
    presentacionesPdf: async () => { const pdf = await pdfLib.PDFDocument.create(); pdf.addPage(); return pdf.save(); },
  });
  const f = habitual;
  const puerta = { ...nuevaPuerta('PUERTAENR'), frente: f.frente, alto: f.alto, of: f.of, cantidad: f.cantidad, color: f.color,
    rollo: 300 as const, rolloCristal: 140 as const, rolloSaco: 300 as const, confirmada: true, ventanasConfirmadas: true,
    enrollable: { T: f.T, D: f.D, margen: f.margen, empates: [] },
    entradas: f.alturasTubos.map(altura => ({ altura, diametro: 30 as const, largo: f.frente, alto: 8, huecos: [] })) };
  await servicio.guardar({ savedBy: 'IVÁN', pedido: { schemaVersion: 1, kind: 'puertas', orderCode: 'AR2605134', cabecera: { cliente: 'PRUEBA', fecha: '2026-11-10' }, elementos: [{ id: 'A', input: puerta }] } });
});
afterEach(async () => { await fs.rm(raiz, { recursive: true, force: true }); });
it('comprueba PDF, plano y bot antes de entregar las puertas', async () => {
  await fs.mkdir(path.join(raiz, 'bot/Ivan.Sanchez'), { recursive: true });
  await fs.mkdir(path.join(raiz, '2026/oficina'), { recursive: true });
  await fs.writeFile(path.join(raiz, '2026/oficina/AR2605134.pdf'), 'PDF anterior');
  const pregunta = await servicio.produccion('AR2605134', { savedBy: 'IVÁN', confirmBot: true });
  expect(pregunta).toMatchObject({ status: 409, cuerpo: { paso: 'PDF', needsConfirmation: true } });
  expect(await fs.readFile(path.join(raiz, '2026/oficina/AR2605134.pdf'), 'utf8')).toBe('PDF anterior');
  expect(await fs.readdir(path.join(raiz, 'bot/Ivan.Sanchez'))).toEqual([]);
  const hecho = await servicio.produccion('AR2605134', { savedBy: 'IVÁN', confirmBot: true, confirmPdfOverwrite: true, confirmPlanoOverwrite: true });
  expect(hecho).toMatchObject({ status: 200, cuerpo: { hechos: ['PDF', 'Plano', 'DXF al bot'] } });
  expect((await servicio.obtener('AR2605134')).status).toBe('PRODUCED');
  expect((await servicio.obtener('AR2605134')).enviosCorte).toHaveLength(1);
  expect(await fs.stat(path.join(raiz, 'pdf/AR2605134-10.pdf'))).toBeTruthy();
  expect(await fs.stat(path.join(raiz, '2026/oficina/AR2605134.pdf'))).toBeTruthy();
  expect(await fs.stat(path.join(raiz, 'bot/Ivan.Sanchez/AR2605134.dxf'))).toBeTruthy();
});
it('si falta el bot o la aprobación no guarda el PDF ni cierra el pedido', async () => {
  await expect(servicio.produccion('AR2605134', { savedBy: 'IVÁN', confirmBot: true, confirmPlanoOverwrite: true })).rejects.toThrow(/carpeta del bot/);
  expect(await fs.stat(path.join(raiz, 'pdf')).catch(() => null)).toBeNull();
  expect((await servicio.obtener('AR2605134')).status).not.toBe('PRODUCED');
  aprobada = false;
  await expect(servicio.produccion('AR2605134', { savedBy: 'IVÁN', confirmBot: true, confirmPlanoOverwrite: true })).rejects.toMatchObject({ statusCode: 409 });
});
it('el PDF separado no manda corte ni cierra la entrega', async () => {
  expect((await servicio.pdfPedido('AR2605134', { savedBy: 'IVÁN' })).status).toBe(200);
  expect((await servicio.obtener('AR2605134')).status).not.toBe('PRODUCED');
  expect((await servicio.obtener('AR2605134')).enviosCorte ?? []).toEqual([]);
  expect(await fs.stat(path.join(raiz, 'pdf/AR2605134-10.pdf'))).toBeTruthy();
});

it('el DXF existente se pregunta antes de escribir PDF y un fallo del bot conserva la entrega pendiente', async () => {
  const carpeta = path.join(raiz, 'bot/Ivan.Sanchez');
  await fs.mkdir(carpeta, { recursive: true });
  await fs.writeFile(path.join(carpeta, 'AR2605134.dxf'), 'corte anterior');
  const entrada = { savedBy: 'IVÁN', confirmBot: true, confirmPlanoOverwrite: true };
  expect(await servicio.produccion('AR2605134', entrada))
    .toMatchObject({ status: 409, cuerpo: { paso: 'DXF al bot', needsConfirmation: true } });
  expect(await fs.stat(path.join(raiz, 'pdf')).catch(() => null)).toBeNull();
  await fs.unlink(path.join(carpeta, 'AR2605134.dxf'));
  const enlazar = fs.link.bind(fs);
  const fallo = vi.spyOn(fs, 'link').mockImplementation(async (origen, destino) => {
    if (path.dirname(String(destino)) === carpeta) throw new Error('Bot sin conexión');
    return enlazar(origen, destino);
  });
  try {
    expect(await servicio.produccion('AR2605134', entrada))
      .toMatchObject({ status: 500, cuerpo: { hechos: ['PDF', 'Plano'], pendientes: ['DXF al bot'], error: expect.stringContaining('Bot sin conexión') } });
    expect((await servicio.obtener('AR2605134')).status).not.toBe('PRODUCED');
  } finally { fallo.mockRestore(); }
});
