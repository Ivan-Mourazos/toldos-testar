import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import pdfLib from 'pdf-lib';
import fixture from '../../corte/__fixtures__/AR2605132.json';
import { crearCorteRemolques } from '../../corte/archivos.js';
import { crearAlmacenConfirmaciones } from '../../../flujoDwg/confirmaciones.js';
import { corteDelPlano } from '../../../flujoDwg/corteDwg.js';
import { crearAlmacenPedidosRemolques } from '../almacen.ts';
import { crearServicioPedidosRemolques } from '../servicio.ts';
import type { PedidoRemolques } from '../tipos.ts';

// Flujo del DWG en remolques (plan del 24/10/2026), como en puertas: el borrador del plano, «Confirmar corte», guardar para
// revisión desde el borrador y el DXF del bot desde el DWG revisado. Los remolques no imprimen el plano: sin PDF.

let raiz: string;
let borradores: boolean;
/** Cuándo aprobó CoordinaOT por última vez (sin fecha, como antes). */
let aprobadoEn: string | null;
let servicio: ReturnType<typeof crearServicioPedidosRemolques>;
const pedido = structuredClone(fixture) as PedidoRemolques;
const pantalla = (extra = {}) => ({ elementos: pedido.elementos, params: pedido.params, savedBy: 'IVÁN', ...extra });
const borrador = () => path.join(raiz, 'borradores', 'AR2605132.dxf');
const enAnio = () => path.join(raiz, 'planos', 'AR2605132.dxf');

beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/remolques-flujo-dwg-'));
  borradores = true;
  aprobadoEn = null;
  const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => path.join(raiz, 'pedidos') });
  const ajustes = async () => ({ productionEnabled: true, corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}'),
    corteLonaPlanoDirectory: path.join(raiz, 'planos'), corteLonaDxfDirectory: path.join(raiz, '{YYYY}/DXFs'),
    remolquesPlanteamientosDirectory: path.join(raiz, 'pdf'), remolquesOficinaTecnicaDirectory: path.join(raiz, '{YYYY}/oficina'),
    corteBorradoresDirectory: borradores ? path.join(raiz, 'borradores') : '', corteBorradoresRed: borradores ? String.raw`\\stinkor\oftecnica\BORRADORES CORTE` : '' });
  servicio = crearServicioPedidosRemolques({ almacen, ajustes, parametros: async () => fixture.params,
    coordina: { statusOf: async (ofs) => ({ disponible: true, ofs: Object.fromEntries(ofs.map((of) => [of, { estado: 'aprobada', revisor: 'DAVID', actualizado: aprobadoEn }])) }) },
    tecnicos: ['IVÁN', 'DAVID'], hacerPdf: async () => { const pdf = await pdfLib.PDFDocument.create(); pdf.addPage(); return pdf.save(); },
    esPedidoDeToldos: async () => false,
    // Sin ODA el plano va en DXF: se lee tal cual.
    corte: crearCorteRemolques({ ajustes, oda: { disponible: false } }),
    confirmaciones: crearAlmacenConfirmaciones({ carpeta: async () => path.join(raiz, 'confirmados') }),
    ahora: () => new Date('2026-10-24T08:00:00Z'),
  });
});
afterEach(async () => { await fs.rm(raiz, { recursive: true, force: true }); });

const abrir = (extra = {}) => servicio.borradorCorte(pantalla(extra));
const confirmar = () => servicio.confirmarCorte({ orderCode: 'AR2605132', savedBy: 'IVÁN' });
const guardar = (extra = {}) => servicio.guardar(pantalla(extra));
/** Una línea de corte más, dentro (o fuera) del recuadro CORTE, como si se dibujara en ZWCAD. */
async function dibujar(fichero: string, fuera = false) {
  const dxf = (await fs.readFile(fichero, 'latin1')).replace(/\r\n/g, '\n');
  const { recuadro } = corteDelPlano(dxf);
  const x = fuera ? recuadro.x1 + 50 : (recuadro.x0 + recuadro.x1) / 2, y = (recuadro.y0 + recuadro.y1) / 2;
  const fin = dxf.indexOf('  0\nENDSEC\n', dxf.indexOf('\nENTITIES\n'));
  await fs.writeFile(fichero, `${dxf.slice(0, fin)}  0\nLINE\n  8\nDISCO1\n 10\n${x}\n 20\n${y}\n 11\n${x + 0.5}\n 21\n${y}\n${dxf.slice(fin)}`, 'latin1');
}

describe('borrador del corte', () => {
  const red = String.raw`\\stinkor\oftecnica\BORRADORES CORTE\AR2605132.dxf`;
  it('escribe el plano de la pantalla en la carpeta de borradores y da el enlace tgm-pedidos', async () => {
    const { status, cuerpo } = await abrir();
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ ok: true, existente: false, filename: 'AR2605132.dxf', ruta: red,
      url: `tgm-pedidos://open?kind=cad&path=${encodeURIComponent(red)}` });
    expect(corteDelPlano(await fs.readFile(borrador(), 'latin1')).error).toBeNull();
    // No guarda el pedido: solo el borrador.
    await expect(servicio.obtener('AR2605132')).rejects.toMatchObject({ statusCode: 404 });
  });
  it('si ya hay uno no lo pisa, salvo que se pida generarlo de nuevo', async () => {
    await abrir();
    await fs.writeFile(borrador(), 'CAMBIADO EN ZWCAD');
    expect((await abrir()).cuerpo).toMatchObject({ existente: true });
    expect(await fs.readFile(borrador(), 'utf8')).toBe('CAMBIADO EN ZWCAD');
    expect((await abrir({ regenerar: true })).cuerpo).toMatchObject({ existente: false, sustituido: true });
  });
  it('sin «Soy» o sin la carpeta de borradores no escribe nada; sin ella se guarda como antes', async () => {
    await expect(abrir({ savedBy: '' })).rejects.toMatchObject({ message: expect.stringContaining('Soy') });
    borradores = false;
    await expect(abrir()).rejects.toMatchObject({ message: expect.stringContaining('borradores') });
    const { status, cuerpo } = await guardar();
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ planoCorte: { files: [{ filename: 'AR2605132.dxf', savedPath: enAnio() }] } });
    expect((await servicio.obtener('AR2605132')).corteConfirmado).toBeUndefined();
  });
});

describe('corte confirmado desde el borrador', () => {
  it('sin confirmar no se guarda para revisión; confirmado, el borrador pasa a la carpeta del año', async () => {
    await expect(guardar()).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('Confirmar corte') });
    await abrir();
    const confirmado = await confirmar();
    expect(confirmado).toMatchObject({ status: 200, cuerpo: { confirmado: { por: 'IVÁN', filename: 'AR2605132.dxf' } } });
    const contenido = await fs.readFile(borrador(), 'latin1');
    const { status, cuerpo } = await guardar();
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ planoCorte: { files: [{ type: 'plano-corte-lona', filename: 'AR2605132.dxf', savedPath: enAnio() }], avisos: [] } });
    expect(await fs.readFile(enAnio(), 'latin1')).toBe(contenido);
    await expect(fs.stat(borrador())).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await servicio.obtener('AR2605132')).corteConfirmado).toMatchObject({ por: 'IVÁN', plano: enAnio() });
  });

  it('si el borrador cambia después de confirmarlo, o tiene líneas fuera de los recuadros, no se guarda', async () => {
    await abrir();
    await confirmar();
    await dibujar(borrador());
    await expect(guardar()).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('ha cambiado') });
    await dibujar(borrador(), true);
    expect(await confirmar()).toMatchObject({ status: 409, cuerpo: { fuera: 1 } });
  });

  it('pregunta antes de sustituir el plano de la carpeta del año', async () => {
    await fs.mkdir(path.dirname(enAnio()), { recursive: true });
    await fs.writeFile(enAnio(), 'HECHO A MANO');
    await abrir();
    await confirmar();
    expect((await guardar()).cuerpo).toMatchObject({ needsConfirmation: true, motivo: 'plano', existing: ['AR2605132.dxf'] });
    expect(await fs.readFile(enAnio(), 'utf8')).toBe('HECHO A MANO');
    expect((await guardar({ confirmOverwrite: true })).status).toBe(200);
  });

  it('«Guardar plano para revisar» no pisa el DWG revisado, y al corregir «Abrir corte» sigue desde él', async () => {
    await abrir();
    await confirmar();
    await guardar();
    await fs.writeFile(enAnio(), 'CAMBIADO POR EL REVISOR');
    await expect(servicio.planoCorte('AR2605132', { confirmOverwrite: true })).rejects.toMatchObject({ statusCode: 409 });
    expect(await fs.readFile(enAnio(), 'utf8')).toBe('CAMBIADO POR EL REVISOR');
    expect((await abrir()).cuerpo).toMatchObject({ existente: true, avisos: expect.arrayContaining([expect.stringContaining('revisión')]) });
    expect(await fs.readFile(borrador(), 'utf8')).toBe('CAMBIADO POR EL REVISOR');
  });

  it('el DXF del bot sale del DWG revisado; si cambió después de revisarlo se pregunta y queda la nota', async () => {
    await abrir();
    await confirmar();
    await guardar();
    const descargado = Buffer.from((await servicio.descargarCorte('AR2605132')).contents).toString('latin1');
    // Sin cambios, el corte del plano es el mismo que el que hacía la web.
    const web = Buffer.from(crearCorteRemolques({ ajustes: async () => ({}), oda: { disponible: false } }).prepararDxf(pedido)[0].contents).toString('latin1');
    const lineas = (t: string) => (t.match(/\nLINE\r?\n/g) ?? []).length;
    expect(lineas(descargado)).toBe(lineas(web));
    expect(descargado).not.toContain('RECUADROS');
    const enviar = (extra = {}) => servicio.enviarCorte('AR2605132', { usuario: 'IVÁN', destino: 'dxfs', confirmOverwrite: true, ...extra });
    expect((await enviar()).status).toBe(200);
    await dibujar(enAnio());
    expect(await enviar()).toMatchObject({ status: 409, cuerpo: { cambioCorte: true } });
    const conCambios = await enviar({ aceptarCambioCorte: true });
    expect(conCambios.status).toBe(200);
    expect((conCambios.cuerpo as { envio: { nota?: string } }).envio.nota).toContain('cambiado');
    expect(lineas(await fs.readFile(path.join(raiz, '2026/DXFs/AR2605132.dxf'), 'latin1'))).toBe(lineas(web) + 1);
    // Pasado a revisión en CoordinaOT y aprobado otra vez: antes del último cambio del DWG, se pregunta; después, sale solo.
    aprobadoEn = new Date(Date.now() - 3_600_000).toISOString();
    expect(await enviar()).toMatchObject({ status: 409, cuerpo: { cambioCorte: true, error: expect.stringContaining('CoordinaOT') } });
    aprobadoEn = new Date(Date.now() + 60_000).toISOString();
    const reaprobado = await enviar();
    expect(reaprobado.status).toBe(200);
    expect((reaprobado.cuerpo as { envio: { nota?: string } }).envio.nota).toContain('aprobado de nuevo en CoordinaOT');
  });
});
