// Ejemplo reproducible; no lee .env ni escribe fuera de tmp/ del worktree.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { nuevaPuertaDeCliente } from '../src/puertas/nuevaPuertaCliente.ts';
import { generarCortePuertas } from '../src/puertas/corte.ts';
import { escribirPlanoPuertas } from '../src/puertas/plano.ts';
import { crearOdaConverter } from '../src/odaConverter.js';
import { presentacionesDxf, svgPrimitivas } from '../src/flujoDwg/planoDxf.js';
import { corteDelPlano, entidadesBot } from '../src/flujoDwg/corteDwg.js';
import { escribirDxf2004 } from '../src/domain/corteLona/dxfCorte.js';

const dir = path.resolve('tmp/saco-arena');
await fs.mkdir(dir, { recursive: true });
// Chromium deja su registro en el directorio de trabajo en algunas instalaciones de Windows.
process.chdir(dir);
const pedido = { schemaVersion: 1, kind: 'puertas', orderCode: 'AR2605585',
  cabecera: { cliente: 'PORTANOVA', fecha: '2026-11-16', clienteRps: { codigo: '001336', nombre: 'PORTANOVA' } },
  elementos: [{ id: 'saco-1', input: { ...nuevaPuertaDeCliente('portanova', 'saco-confeccionado'),
    frente: 2000, alto: 9, cantidad: 1, of: '0234043', confirmada: true } }] };
const corte = generarCortePuertas(pedido);
assert.ok(corte.archivo, JSON.stringify(corte.avisos));
const plano = escribirPlanoPuertas({ pedido, cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: '', fecha: '2026-11-17' } });
const base = path.join(dir, pedido.orderCode);
await fs.writeFile(`${base}.json`, JSON.stringify(pedido, null, 2));
await fs.writeFile(`${base}-bot.dxf`, corte.archivo.dxf);
await fs.writeFile(`${base}-plano.dxf`, plano);
const oda = crearOdaConverter({ executable: process.env.ODA_FILE_CONVERTER || 'C:/Users/ivan.sanchez/tools/oda/ODAFileConverter.exe', tempRoot: path.join(dir, 'oda') });
const dwg = await oda.convertir(Buffer.from(plano));
assert.equal(dwg.subarray(0, 6).toString(), 'AC1032');
await fs.writeFile(`${base}.dwg`, dwg);
const vuelta = Buffer.from(await oda.convertir(dwg, { desde:'dwg', hasta:'dxf' })).toString('utf8');
const extraido = corteDelPlano(vuelta);
assert.equal(extraido.error, null);
const bot = entidadesBot(extraido.entidades);
assert.deepEqual(bot.noConvertibles, []);
const largos = bot.lineas.filter(l=>l.capa==='DISCO1').map(l=>Math.hypot(l.x2-l.x1,l.y2-l.y1));
for (const [medida, cantidad] of [[20130,2],[10075,4],[240,6]]) assert.equal(largos.filter(l=>Math.abs(l-medida)<.01).length,cantidad);
await fs.writeFile(`${base}-bot-desde-dwg.dxf`, escribirDxf2004(bot));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1754, height: 1240 } });
  const hojas = presentacionesDxf(plano);
  assert.equal(hojas.length, 1);
  for (const [i, hoja] of hojas.entries()) {
    await page.setContent(`<body style="margin:0;background:white">${svgPrimitivas(hoja.primitivas)}</body>`);
    await page.screenshot({ path: `${base}-presentacion${i ? '-'+(i+1) : ''}.png` });
  }
  await fs.writeFile(`${base}-contraste.json`, JSON.stringify({ avisos: corte.avisos,
    piezas: corte.cortes.flatMap(c=>c.colocadas.map(t=>({nombre:t.pieza.nombre,largoMm:t.pieza.ancho*10,anchoMm:t.pieza.alto*10}))),
    presentaciones: hojas.length, esquemaPlano: 'Sin escala, cotas reales en cm', unidadesBot: 'mm',
    vueltaDwg: { error:extraido.error,contornosSinEmpateMm:20130,contornosMitadesMm:10075,anchoMm:240 } }, null, 2));
} finally { await browser.close(); }
console.log(`AR2605585: DWG, DXF de plano y bot y PNG en ${dir}`);
