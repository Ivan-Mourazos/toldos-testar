// DWG, DXF del bot y PNG del papel; solo copias y salidas dentro de tmp/.
// node scripts/contrastar-puertas-santapau.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { pedidosSantaPau } from '../src/puertas/__fixtures__/santapau.ts';
import { generarCortePuertas } from '../src/puertas/corte.ts';
import { escribirPlanoPuertas } from '../src/puertas/plano.ts';
import { crearOdaConverter } from '../src/odaConverter.js';
import { leerPlanoTexto, proyectarPagina, svgPrimitivas } from '../src/flujoDwg/planoDxf.js';

const dir=path.resolve('tmp/santapau/salida');await fs.mkdir(dir,{recursive:true});
const oda=crearOdaConverter({executable:process.env.ODA_FILE_CONVERTER||'C:/Users/ivan.sanchez/tools/oda/ODAFileConverter.exe',tempRoot:path.resolve('tmp/santapau/oda')});
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1754,height:1240}});
 for(const pedido of pedidosSantaPau()){
  const corte=generarCortePuertas(pedido);
  assert.ok(corte.archivo,JSON.stringify(corte.avisos));
  const plano=escribirPlanoPuertas({pedido,cabecera:{cliente:'SANTA PAU',tecnico:'IVÁN',revisor:'',fecha:'04/11/2026'}});
  const base=path.join(dir,pedido.orderCode);
  await fs.writeFile(`${base}.json`,JSON.stringify(pedido,null,2));
  await fs.writeFile(`${base}-bot.dxf`,corte.archivo.dxf);
  await fs.writeFile(`${base}-plano.dxf`,plano);
  const dwg=await oda.convertir(Buffer.from(plano));assert.equal(dwg.subarray(0,6).toString(),'AC1032');
  await fs.writeFile(`${base}.dwg`,dwg);
  await page.setContent(`<body style="margin:0;background:white">${svgPrimitivas(proyectarPagina(leerPlanoTexto(plano)))}</body>`);
  await page.screenshot({path:`${base}-presentacion.png`});
  await fs.writeFile(`${base}-contraste.json`,JSON.stringify({avisos:corte.avisos,piezas:corte.resultados.map(r=>r.piezas.map(p=>({nombre:p.nombre,ancho:p.ancho,alto:p.alto,cantidad:p.cantidad}))),diferenciasOficina:pedido.orderCode==='AR2604815'?['Inferiores127,5 cm con regla mayoritaria; corte histórico130.','Cristales, superiores, E.T.9 y faldones35 contrastados con el fabricado.']:['Pedido pendiente: no hay plano de oficina; propuesta desde hoja y RPS.']},null,2));
  console.log(`${pedido.orderCode}: DWG, DXF bot y presentación PNG en ${dir}`);
 }
}finally{await browser.close();}
