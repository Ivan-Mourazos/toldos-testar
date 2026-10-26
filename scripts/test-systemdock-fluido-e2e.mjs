import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Regresión del acceso HTTP del taller: randomUUID requiere un contexto seguro.
const url=process.env.TOLDOS_ISOLATED_URL||'http://127.0.0.1:4338';
const health=await fetch(`${url}/api/health`).then(r=>r.json());
assert(health.simulationMode&&!health.fileWritesEnabled,'Usa una instancia aislada');
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const errores=[];
 page.on('pageerror',e=>errores.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('toldos-testar-usuario','IVÁN');
  Object.defineProperty(crypto,'randomUUID',{value:undefined,configurable:true});
 });
 await page.goto(url);
 await page.getByRole('button',{name:/^System Dock/}).click();
 await page.getByRole('button',{name:'Añadir lona',exact:true}).click();
 await page.getByRole('button',{name:'Lona 2 · SIN OF',exact:true}).waitFor({timeout:3000});
 assert.equal(await page.getByLabel('Largo de la lona (cm)',{exact:true}).inputValue(),'');
 assert.equal(await page.getByLabel('Ancho de la lona (cm)',{exact:true}).inputValue(),'');
 assert.equal(await page.getByLabel('Color de lona',{exact:true}).inputValue(),'NEGRO');
 assert.equal(await page.getByLabel('Material de lona',{exact:true}).inputValue(),'PVC G650');
 assert.equal(await page.getByLabel('Rollo de lona (cm)',{exact:true}).inputValue(),'250');
 await page.getByLabel('Largo de la lona (cm)',{exact:true}).fill('1040');
 await page.getByLabel('Ancho de la lona (cm)',{exact:true}).fill('55');
 await page.getByRole('button',{name:'Lona 1 · SIN OF',exact:true}).click();
 assert.equal(await page.getByLabel('Largo de la lona (cm)',{exact:true}).inputValue(),'');
 await page.getByRole('button',{name:'Lona 2 · SIN OF',exact:true}).click();
 assert.equal(await page.getByLabel('Largo de la lona (cm)',{exact:true}).inputValue(),'1040');
 await page.getByRole('button',{name:'Quitar lona',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:/^Lona \d ·/}).count(),1);
 assert.equal(await page.getByLabel('Largo de la lona (cm)',{exact:true}).inputValue(),'');
 assert.deepEqual(errores,[]);
 console.log('System Dock: añadir sin randomUUID, valores propios, selección y eliminación correctos.');
} finally {await browser.close();}
