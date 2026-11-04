// Salidas locales de las respuestas de Iván. No carga .env ni escribe en oficina.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearOdaConverter } from '../../src/odaConverter.js';
import { emptyGanado } from '../../src/remolques/entradas-vacias.ts';
import { calcGanado } from '../../src/remolques/calc/ganado.ts';
import { MEDIDAS_CAL_5319, calcularMedidasCal } from '../../src/remolques/ganado/medidas.ts';
import { generarCorteRemolques } from '../../src/remolques/corte/index.js';
import { escribirPlanoRemolques } from '../../src/remolques/corte/plano.js';
import { juegoCorteCal } from '../../src/remolques/ganado/salidasCal.ts';
import { escribirDxf2004 } from '../../src/domain/corteLona/dxfCorte.js';
import { DEFAULT_PARAMS } from '../../src/remolques/calc/params.ts';
import { prepararPedidoHoja } from '../../src/remolques/hoja/pedido.ts';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(raiz, 'tmp/ganado-cal/salida');
const temporal = path.join(raiz, 'tmp/ganado-cal/oda-tmp');
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(temporal, { recursive: true });
const oda = crearOdaConverter({ executable: process.env.ODA_FILE_CONVERTER || 'C:/Users/ivan.sanchez/tools/oda/ODAFileConverter.exe',
  tempRoot: temporal, env: { TEMP: temporal, TMP: temporal } });
const resumen = [];
for (const [id, modelo, medidasCal, of, cliente] of [
  ['AR2601847', 'REMOLCAR_ESTANDAR', undefined, '0227492', 'REMOLCAR'],
  ['AR2605319', 'CAL_MEDIDAS', MEDIDAS_CAL_5319, '0233492', 'TALLERES CAL'],
]) {
  const input = { ...emptyGanado(modelo), medidasCal, material: 'LONA PVC 580 GRIS 7037 :250 AN (580)', arcosComprobados: true };
  input.cabecera = { ...input.cabecera, numeroPedido: id, ordenFabricacion: of, cliente, realizadoPor: 'IVÁN' };
  const e = { tipo: 'ganado', version: '10', of, input, result: calcGanado(input), paramsSnapshot: DEFAULT_PARAMS };
  const pedido = { orderCode: id, summary: { customer: cliente, technician: 'IVÁN' }, elementos: [e], params: DEFAULT_PARAMS };
  const r = generarCorteRemolques(pedido), parcial = !r.archivo;
  let bot, plano;
  if (r.archivo) { bot = r.archivo.dxf; plano = r.archivo.plano.dxf; }
  else {
    const c = juegoCorteCal(medidasCal, of);
    const entidades = {
      lineas: [...c.lineas.map(([x1,y1,x2,y2]) => ({ capa:'DISCO1',x1,y1,x2,y2 })), ...c.rot.map(([x1,y1,x2,y2]) => ({ capa:'ROTULADOR',x1,y1,x2,y2 }))],
      arcos: c.arcos.map(a => ({ ...a, capa:'DISCO1' })), circulos: c.ollaos.map(([x,y]) => ({ capa:'ROTULADOR',x,y,r:2.5 })),
      textos: [...c.textos.map(t => ({ ...t, capa:'texto' })), { capa:'texto',x:0,y:c.h+150,h:75,valor:'PARCIAL - PUERTA EN ACLARACION Q-GAN10 - NO CORTAR' }],
    };
    bot = escribirDxf2004(entidades);
    plano = escribirPlanoRemolques({ pedido, lonas:[], ganados:[e], params:DEFAULT_PARAMS, cortes:[{ entidades,largo:c.w,material:input.material }] });
  }
  const nombre = id + (parcial ? '-PARCIAL-NO-CORTAR' : '');
  fs.writeFileSync(path.join(dir, nombre + '-bot.dxf'), bot, 'latin1');
  fs.writeFileSync(path.join(dir, nombre + '-plano.dxf'), plano, 'utf8');
  const dwg = await oda.convertir(Buffer.from(plano, 'utf8'));
  if (dwg.subarray(0, 6).toString() !== 'AC1032') throw Error('ODA no generó DWG 2018');
  fs.writeFileSync(path.join(dir, nombre + '.dwg'), dwg);
  const datos = prepararPedidoHoja([{ tipo:'ganado', version:'10', input }], DEFAULT_PARAMS);
  fs.writeFileSync(path.join(dir, id + '-datos-hoja.json'), JSON.stringify(datos, null, 2));
  fs.writeFileSync(path.join(dir, id + '-pedido.json'), JSON.stringify(pedido, null, 2));
  resumen.push({ id, nombre, exportacionCompleta: !parcial, pendientes: medidasCal ? calcularMedidasCal(medidasCal).pendientes : [] });
}
fs.writeFileSync(path.join(dir, 'salidas.json'), JSON.stringify(resumen, null, 2));
console.log(resumen.map(r => `${r.id}: ${r.exportacionCompleta ? 'completo' : 'PARCIAL · puerta pendiente'}`).join('\n'));

if (process.argv.includes('--hojas')) {
  const base = process.env.TOLDOS_ISOLATED_URL || 'http://127.0.0.1:4560';
  const h = await fetch(base + '/api/health').then(r => r.json());
  if (!h.simulationMode || h.fileWritesEnabled) throw Error('Instancia sin aislar');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const r of resumen) {
      const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
      await page.route('**/api/remolques/hoja/cal-respuestas', route => route.fulfill({ status:200, contentType:'application/json', body:fs.readFileSync(path.join(dir, r.id + '-datos-hoja.json'), 'utf8') }));
      await page.goto(base + '/hoja-remolques.html?id=cal-respuestas');
      await page.waitForFunction(() => window.hojaLista || window.hojaError);
      const error = await page.evaluate(() => window.hojaError);
      await page.screenshot({ path:path.join(dir, r.nombre + '-hoja.png'), fullPage:true });
      if (error) throw Error(error);
      await page.pdf({ path:path.join(dir, r.nombre + '-hoja.pdf'), format:'A4', landscape:true, printBackground:true });
      await page.close();
    }
  } finally { await browser.close(); }
}
