import { afterEach, beforeEach, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pedidoVariasTelas } from '../domain/corteLona/fixtures/variasTelas.js';
import { generarCorteLona } from '../domain/corteLona/index.js';
import { archivoCorte } from '../domain/corteLona/opcionesArchivo.js';
import { crearAlmacenConfirmaciones } from './confirmaciones.js';
import { crearFlujoDwg, planosDe, type FicheroPlano } from './flujo.ts';

// Varios planos por pedido (toldos de varias telas, 25/10/2026): se abren, se confirman, se guardan y se mandan juntos.

let raiz: string;
let flujo: ReturnType<typeof crearFlujoDwg>;
const pedido = { ...pedidoVariasTelas(), orderCode: 'AR2600096' };
// generarCorteLona es JS: sus tipos inferidos no llevan las opciones ni los planos de cristal (`incluidoEn`).
const resultado = (generarCorteLona as (o: unknown, opciones: unknown) => unknown)(pedido, { ofStockSacos: '0230811' }) as {
  plano: Array<{ dxf: string; incluidoEn?: string } | null>; cortes: Parameters<typeof archivoCorte>[0] };
const nombres = ['AR2600096 (AZUL5010-2500) (plano).dxf', 'AR2600096 (BLANCA9016-2500) (plano).dxf'];
const lineas = (t: string) => (t.match(/\nLINE\r?\n/g) ?? []).length;

beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/flujo-dwg-'));
  flujo = crearFlujoDwg({
    ajustes: async () => ({ productionEnabled: true, corteBorradoresDirectory: path.join(raiz, 'borradores'),
      corteBorradoresRed: String.raw`\\toldosgomez.local\DFS_POL\oftecnica\BORRADORES CORTE`, corteLonaPlanoDirectory: path.join(raiz, '{YYYY}') }),
    leer: async (ruta) => fs.readFile(ruta, 'utf8'),
    escribir: async (f) => { await fs.mkdir(path.dirname(f.savedPath), { recursive: true }); await fs.writeFile(f.savedPath, f.contenido); },
    confirmaciones: crearAlmacenConfirmaciones({ carpeta: async () => path.join(raiz, 'confirmados') }),
  });
});
afterEach(async () => { await fs.rm(raiz, { recursive: true, force: true }); });

const preparar = async (carpeta: string) => ({ avisos: [] as string[], ficheros: resultado.plano.filter((p) => p && !p.incluidoEn)
  .map((p, i): FicheroPlano => ({ filename: nombres[i], savedPath: path.join(carpeta, nombres[i]), contenido: Buffer.from(p!.dxf, 'utf8') })) });

it('abre los dos planos, los confirma juntos, los pasa a la carpeta del año y el bot lleva las dos telas', async () => {
  const abierto = await flujo.borrador({ orderCode: 'AR2600096', preparar });
  expect(abierto.cuerpo).toMatchObject({ existente: false, filename: nombres[0], ficheros: nombres.map((filename) => ({ filename })) });
  const confirmado = await flujo.confirmar('AR2600096', 'IVÁN');
  expect(confirmado.cuerpo).toMatchObject({ confirmado: { filename: nombres[0], ficheros: nombres } });
  const guardado = await flujo.alGuardar({ orderCode: 'AR2600096', technician: 'IVÁN', confirmOverwrite: false });
  if (!guardado || 'respuesta' in guardado) throw new Error('debería poder guardarse');
  await guardado.escribir();
  expect(await guardado.limpiar()).toEqual([]);
  expect(planosDe(guardado.corteConfirmado).map((p) => p.plano)).toEqual(nombres.map((n) => path.join(raiz, '2026', n)));
  expect(await fs.readdir(path.join(raiz, 'borradores'))).toEqual([]);
  const dwg = await flujo.corteDelDwg(guardado.corteConfirmado);
  expect(dwg.huella).toBe(guardado.corteConfirmado.huella);
  expect(dwg.planos).toHaveLength(2);
  expect(lineas(dwg.dxf)).toBe(lineas(archivoCorte(resultado.cortes, 'AR2600096')!.dxf));
});

it('si cambia uno de los dos borradores, hay que volver a confirmar; al generar de nuevo quita el que ya no sale', async () => {
  await flujo.borrador({ orderCode: 'AR2600096', preparar });
  await flujo.confirmar('AR2600096', 'IVÁN');
  const segundo = path.join(raiz, 'borradores', nombres[1]);
  // Una raya de corte más, como si se dibujara en ZWCAD (fuera de los recuadros: tampoco vale).
  const dxf = (await fs.readFile(segundo, 'utf8')).replace(/\r\n/g, '\n');
  expect(dxf).toContain('\nENTITIES\n');
  await fs.writeFile(segundo, dxf.replace('\nENTITIES\n', '\nENTITIES\n  0\nLINE\n  8\nDISCO1\n 10\n0\n 20\n0\n 11\n1\n 21\n0\n'));
  await expect(flujo.alGuardar({ orderCode: 'AR2600096', technician: 'IVÁN', confirmOverwrite: false })).rejects.toMatchObject({ statusCode: 409 });
  const solo = async (carpeta: string) => ({ avisos: [], ficheros: (await preparar(carpeta)).ficheros.slice(0, 1) });
  expect((await flujo.borrador({ orderCode: 'AR2600096', preparar: solo, regenerar: true })).cuerpo).toMatchObject({ sustituido: true, filename: nombres[0] });
  expect(await fs.readdir(path.join(raiz, 'borradores'))).toEqual([nombres[0]]);
});

// Iván, 26/10/2026: la pantalla pone los botones según el paso del corte.
it('el estado dice si hay borrador, si está confirmado y si se tocó después de confirmar', async () => {
  expect(await flujo.estado('AR2600096')).toMatchObject({ activo: true, borrador: false, confirmado: null });
  await flujo.borrador({ orderCode: 'AR2600096', preparar });
  expect(await flujo.estado('AR2600096')).toMatchObject({ borrador: true, confirmado: null, cambiadoTrasConfirmar: false });
  await flujo.confirmar('AR2600096', 'IVÁN');
  expect(await flujo.estado('AR2600096')).toMatchObject({ borrador: true, confirmado: { por: 'IVÁN' }, cambiadoTrasConfirmar: false });
  // Guardado en ZWCAD dos minutos después de confirmar.
  const fichero = path.join(raiz, 'borradores', nombres[0]), luego = new Date(Date.now() + 120_000);
  await fs.utimes(fichero, luego, luego);
  expect(await flujo.estado('AR2600096')).toMatchObject({ cambiadoTrasConfirmar: true });
});

// Iván, 26/10/2026: «faltan los botones de abrir corte en las revisiones». El enlace sale del mismo montaje que los borradores.
it('en la revisión, «Abrir corte» da el enlace de cada DWG revisado en la carpeta del año', async () => {
  const oftecnica = path.join(raiz, 'oftecnica');
  const conRed = crearFlujoDwg({
    ajustes: async () => ({ productionEnabled: true, corteBorradoresDirectory: path.join(oftecnica, 'BORRADORES CORTE'),
      corteBorradoresRed: String.raw`\\toldosgomez.local\DFS_POL\oftecnica\BORRADORES CORTE`, corteLonaPlanoDirectory: path.join(oftecnica, '{YYYY}') }),
    leer: async (ruta) => fs.readFile(ruta, 'utf8'),
    escribir: async (f) => { await fs.mkdir(path.dirname(f.savedPath), { recursive: true }); await fs.writeFile(f.savedPath, f.contenido); },
    confirmaciones: crearAlmacenConfirmaciones({ carpeta: async () => path.join(raiz, 'confirmados') }),
  });
  await conRed.borrador({ orderCode: 'AR2600096', preparar });
  await conRed.confirmar('AR2600096', 'IVÁN');
  const guardado = await conRed.alGuardar({ orderCode: 'AR2600096', technician: 'IVÁN', confirmOverwrite: false });
  if (!guardado || 'respuesta' in guardado) throw new Error('debería poder guardarse');
  await guardado.escribir();
  const { ficheros } = await conRed.enlacesRevisado(guardado.corteConfirmado);
  const anio = path.basename(path.dirname(guardado.corteConfirmado.plano));
  expect(ficheros.map((f) => f.ruta)).toEqual(nombres.map((n) => [String.raw`\\toldosgomez.local\DFS_POL\oftecnica`, anio, n].join('\\')));
  expect(ficheros[0].url).toMatch(/^tgm-pedidos:\/\/open\?kind=cad&path=/);
  await fs.rm(guardado.corteConfirmado.plano);
  await expect(conRed.enlacesRevisado(guardado.corteConfirmado)).rejects.toMatchObject({ statusCode: 409 });
});
