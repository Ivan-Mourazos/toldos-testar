import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

/** Cajas del navegador, con las métricas de la fuente real y sus rotaciones. */
async function auditarSvg(page){
 return page.locator('.puerta-alzado svg').evaluate(async svg=>{
  await document.fonts.ready;
  const cajas=[...svg.querySelectorAll('text')].map(e=>({texto:e.textContent.trim(),caja:e.getBoundingClientRect()})).filter(c=>c.texto);
  const marco=svg.getBoundingClientRect();
  const recortados=cajas.filter(({caja:c})=>c.left<marco.left-1||c.right>marco.right+1||c.top<marco.top-1||c.bottom>marco.bottom+1).map(c=>c.texto);
  const solapes=[];
  cajas.forEach((a,i)=>{for(const b of cajas.slice(i+1))if(Math.min(a.caja.right,b.caja.right)-Math.max(a.caja.left,b.caja.left)>.5&&Math.min(a.caja.bottom,b.caja.bottom)-Math.max(a.caja.top,b.caja.top)>.5)solapes.push([a.texto,b.texto]);});
  const segmentos=[...svg.querySelectorAll('line')].map(l=>{
   const m=l.getScreenCTM();
   return [new DOMPoint(l.x1.baseVal.value,l.y1.baseVal.value).matrixTransform(m),new DOMPoint(l.x2.baseVal.value,l.y2.baseVal.value).matrixTransform(m)];
  });
  const cruces=[];
  for(const {texto,caja:c}of cajas)for(const [a,b]of segmentos){
   const dx=b.x-a.x,dy=b.y-a.y;let t0=0,t1=1;
   for(const [p,q]of [[-dx,a.x-c.left-.5],[dx,c.right-.5-a.x],[-dy,a.y-c.top-.5],[dy,c.bottom-.5-a.y]]){
    if(Math.abs(p)<1e-12){if(q<0){t1=-1;break;}continue;}
    const t=q/p;if(p<0)t0=Math.max(t0,t);else t1=Math.min(t1,t);
   }
   if(t1>t0&&Math.hypot(dx,dy)*(t1-t0)>.5)cruces.push(texto);
  }
  return {textos:cajas.length,solapes,cruces,recortados};
 });
}
const base=process.env.TOLDOS_ISOLATED_URL||'http://127.0.0.1:4482',dir='tmp/ui-audit/santapau-diagonales-centrado';
const health=await fetch(base+'/api/health').then(r=>r.json());assert.equal(health.simulationMode,true);assert.equal(health.fileWritesEnabled,false);
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch();
const auditorias=[];
try{
for(const viewport of [{width:1280,height:720},{width:1600,height:1000}]){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'});await context.addInitScript(()=>localStorage.setItem('toldos-testar-usuario','IVÁN'));
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByRole('button',{name:'Nuevo pedido',exact:true}).waitFor();
 await page.getByRole('button',{name:'Puertas',exact:true}).click();
 await page.getByRole('button',{name:'Santa Pau',exact:true}).click();
 await page.screenshot({path:`${dir}/ficha-${viewport.width}x${viewport.height}.png`});
 await page.getByRole('button',{name:'Enrollable',exact:true}).click();
 await page.screenshot({path:`${dir}/editor-inicial-${viewport.width}x${viewport.height}.png`});
 for(const [label,value]of [['Cantidad de puertas iguales','2'],['Número de pedido de Puertas','AR2605363'],['Cliente de Puertas','Santa Pau'],['OF de puerta','0233644'],['Frente (cm)','197'],['Alto (cm)','340'],['Color de puerta','ROJO 3002']]){await page.getByLabel(label,{exact:true}).fill(value);await page.getByLabel(label,{exact:true}).press('Tab');}
 await page.getByRole('tab',{name:'Mirilla y tubos',exact:true}).click();
 for(const [label,value]of [['Bajo de mirilla desde el bajo terminado (cm)','135'],['Alto visible de mirilla (cm)','60'],['Margen lateral de lona (cm; 0 de lado a lado)','0']]){await page.getByLabel(label,{exact:true}).fill(value);await page.getByLabel(label,{exact:true}).press('Tab');}
 for(const [i,value]of ['59','121','210'].entries()){await page.getByRole('button',{name:'Añadir E.T.',exact:true}).click();await page.getByLabel(`Eje de tubo ${i+1} desde el bajo (cm)`,{exact:true}).fill(value);await page.getByLabel(`Eje de tubo ${i+1} desde el bajo (cm)`,{exact:true}).press('Tab');}
 await page.getByRole('tab',{name:'Confección',exact:true}).click();
 assert.equal(await page.getByLabel('Ancho de corte del refuerzo (cm)',{exact:true}).inputValue(),'8');
 assert.equal(await page.getByRole('checkbox',{name:/Logo/i}).count(),0);
 assert.equal(await page.getByText('Bajo del paño: +2,5 cm. Comprueba la confección del pedido.',{exact:true}).count(),1);
 await page.getByRole('combobox',{name:'Lado cerrado de las E.T. por el revés',exact:true}).click();await page.getByRole('option',{name:'Derecha',exact:true}).click();
 await page.getByRole('checkbox',{name:'Confirmado con el dibujo y los rollos reales',exact:true}).check();
 for(const theme of ['claro','oscuro']){
  const dark=await page.locator('html').getAttribute('data-theme')==='dark';if(dark!==(theme==='oscuro'))await page.getByRole('button',{name:theme==='oscuro'?'Pasar a modo oscuro':'Pasar a modo claro',exact:true}).click();
  const auditoria=await auditarSvg(page);auditorias.push({viewport,theme,...auditoria});
  assert.deepEqual(auditoria.solapes,[]);assert.deepEqual(auditoria.cruces,[]);assert.deepEqual(auditoria.recortados,[]);
  await page.getByRole('tab',{name:'Confección',exact:true}).click();await page.screenshot({path:`${dir}/confeccion-${theme}-${viewport.width}x${viewport.height}.png`});
  await page.getByRole('region',{name:'Alzado de la puerta',exact:true}).screenshot({path:`${dir}/alzado-${theme}-${viewport.width}x${viewport.height}.png`});
  await page.getByRole('tab',{name:'Mirilla y tubos',exact:true}).click();await page.getByLabel('Bajo de mirilla desde el bajo terminado (cm)',{exact:true}).waitFor({state:'visible'});await page.screenshot({path:`${dir}/mirilla-${theme}-${viewport.width}x${viewport.height}.png`});
 }
 assert.deepEqual(errors,[]);
 assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth>innerWidth),false);
 console.log(viewport,'capturas y formulario correctos');
 await context.close();
}
await fs.writeFile(`${dir}/auditoria-dom.json`,JSON.stringify(auditorias,null,2));
}finally{await browser.close();}
