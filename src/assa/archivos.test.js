import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { crearServicioLotes, planoDelLote } from './archivos.js';
import { prepararLote } from './lote.js';
import { corteDelPlano, entidadesBot } from '../flujoDwg/corteDwg.js';

const raiz = path.resolve('tmp/assa-archivos-tests');
afterEach(() => fs.rm(raiz, { recursive: true, force: true }));
const linea = { IDOrderLine: 'a', CodOrder: 'AR.26.04704', NumLine: 1, CodArticle: 'H0K420102-0034', descripcion: 'NH3200 NT600', cantidad: 8, of_: '0232434', entregaSolicitada: '2026-10-31' };
const certificados = { referencias: { '420102-0034': { descripciones: [{ descripcion: linea.descripcion, corteMm: [3010, 666], cuadran: 2, geometria: 2, ultimaGeometria: true }] } } };
const preparar = (f, ls, s, _c, o) => prepararLote(f, ls, s, certificados, o);

it('el plano sin presentaciones conserva arcos, textos y mm al pasar por el flujo del DWG', () => {
  const lote = preparar('2026-10-31', [linea], {});
  const plano = planoDelLote(lote);
  const corte = corteDelPlano(plano);
  expect(corte.error).toBeNull();
  const bot = entidadesBot(corte.entidades);
  expect(bot.lineas).toHaveLength(lote.entidades.lineas.length);
  expect(bot.lineas.some(l => Math.abs(Math.abs(l.x2 - l.x1) - 3010) < .01)).toBe(true);
  expect(bot.textos.some(t => t.valor.includes('H0K420102-0034'))).toBe(true);
});

it('exige abrir, confirmar, RPS sin cambios y DWG sin cambios; el envío de prueba es idempotente', async () => {
  let lineas = [linea];
  const servicio = crearServicioLotes({ carpeta: raiz, leer: async () => lineas, preparar,
    oda: { disponible: true, convertir: async b => b } });
  const input = { fecha: '2026-10-31', savedBy: 'IVÁN', sueltas: {}, palets: { a: 1 } };
  await expect(servicio.mandar(input)).rejects.toThrow(/confirmar/);
  // El palet lo pone el técnico: sin él no se abre el corte, y solo se admite un número.
  await expect(servicio.abrir({ ...input, palets: {} })).rejects.toThrow(/palet/);
  await expect(servicio.vista({ ...input, palets: { a: 'PALET 1' } })).rejects.toThrow(/palet/);
  await servicio.abrir(input);
  await servicio.confirmar(input);
  await servicio.abrir({ ...input, regenerar: true });
  await expect(servicio.mandar(input)).rejects.toThrow(/Confirmar/);
  await servicio.confirmar(input);
  lineas = [{ ...linea, cantidad: 9 }];
  await expect(servicio.mandar(input)).rejects.toThrow(/RPS|opciones/);
  lineas = [linea];
  const envio = await servicio.mandar(input);
  expect(envio.ruta).toContain('DXF');
  expect(envio.ruta).not.toMatch(/BOT[\\/]Pendientes|maqcorte/i);
  expect((await servicio.mandar(input)).yaEnviado).toBe(true);
  const bytes = await fs.readFile(envio.ruta, 'latin1');
  expect(bytes).toContain('AC1018');
  expect(bytes).toContain('LOTE 31-10');
});

it('no admite una carpeta de producción ni fabrica sin OF o sin programas validados', async () => {
  expect(() => crearServicioLotes({ carpeta: 'C:/maqcorte/BOT/Pendientes' })).toThrow(/PRUEBAS/);
  const servicio = crearServicioLotes({ carpeta: raiz, leer: async () => [{ ...linea, of_: '' }], preparar,
    oda: { disponible: false } });
  await expect(servicio.abrir({ fecha: '2026-10-31', savedBy: 'IVÁN' })).rejects.toThrow(/validado/);
});

it('bloquea el envío si el DWG cambia después de confirmar o se eligen sueltas', async () => {
  const servicio = crearServicioLotes({ carpeta: raiz, leer: async () => [linea], preparar,
    oda: { disponible: true, convertir: async b => b } });
  const input = { fecha: '2026-10-31', savedBy: 'IVÁN', sueltas: {}, palets: { a: 1 } };
  await servicio.abrir(input);
  await servicio.confirmar(input);
  await expect(servicio.mandar({ ...input, sueltas: { '420102-0034': true } })).rejects.toThrow(/opciones/);
  await expect(servicio.mandar({ ...input, palets: { a: 2 } })).rejects.toThrow(/opciones/);
  const dwg = path.join(raiz, 'COMBURSA/2026/Borradores/LOTE 31-10.dwg');
  const original = await fs.readFile(dwg, 'utf8');
  // Alarga 1 cm el final de la primera raya del corte.
  const cambiado = original.replace(/(\nLINE\r?\n(?:(?!\n {2}0\r?\n)[\s\S])*?\n {2}8\r?\nDISCO1\r?\n(?:(?!\n {2}0\r?\n)[\s\S])*?\n 11\r?\n)(-?[\d.]+)/,
    (_m, g, x) => g + (Number(x) + 0.01).toFixed(6));
  expect(cambiado).not.toBe(original);
  await fs.writeFile(dwg, cambiado);
  await expect(servicio.mandar(input)).rejects.toThrow(/DWG ha cambiado/);
});
