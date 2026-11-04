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
import { presentacionesDxf, svgPrimitivas } from '../src/flujoDwg/planoDxf.js';

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
  for(const [i,hoja]of presentacionesDxf(plano).entries()){
   await page.setContent(`<body style="margin:0;background:white">${svgPrimitivas(hoja.primitivas)}</body>`);
   await page.screenshot({path:i?`${base}-presentacion-${i+1}.png`:`${base}-presentacion.png`});
  }
  await fs.writeFile(`${base}-contraste.json`,JSON.stringify({avisos:corte.avisos,piezas:corte.resultados.map(r=>r.piezas.map(p=>({nombre:p.nombre,clase:p.clase,ancho:p.ancho,alto:p.alto,cantidad:p.cantidad}))),consumo:corte.cortes.map(c=>({material:c.material,anchoRolloMm:c.anchoRollo,largoMm:c.largo,areaPiezasCm2:c.colocadas.reduce((s,t)=>s+t.pieza.ancho*t.pieza.alto*(t.pieza.multiplicador??1),0)})),diferenciasOficina:pedido.orderCode==='AR2604815'?['Se conserva el corte anterior: inferiores130 y12 refuerzos de8×9.','Las E.T. van sueltas de9; cristales, superiores y faldones conservan sus medidas.']:['Referencia actual: DWG5363 corregido por Iván; inferiores137,5 y tubo central121.','Se cortan18 refuerzos de8×9 para las tres puertas; colocación de664 cm de lona.','Alzado A×2 y B×1, como el DWG corregido de Iván; Q-SP07 cerrada al verificar X1.']},null,2));
  console.log(`${pedido.orderCode}: DWG, DXF bot y presentación PNG en ${dir}`);
 }
}finally{await browser.close();}
