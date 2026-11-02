import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const out=path.resolve('tmp/ui-audit/dibujos-estilo/muestras');
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 await page.goto(pathToFileURL(`${out}/index.html`).href);
 await page.evaluate(()=>document.fonts.ready);
 const geometria=await page.locator('figure svg').evaluateAll(svgs=>svgs.map(svg=>{
  const textos=[...svg.querySelectorAll('text')].map(t=>{const b=t.getBBox(),m=svg.getCTM().inverse().multiply(t.getCTM());const p=[[b.x,b.y],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));return {texto:t.textContent,x0:Math.min(...p.map(p=>p.x)),x1:Math.max(...p.map(p=>p.x)),y0:Math.min(...p.map(p=>p.y)),y1:Math.max(...p.map(p=>p.y))};});
  const solapes=[];for(let i=0;i<textos.length;i++)for(const b of textos.slice(i+1)){const a=textos[i];if(Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>1&&Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)>1)solapes.push([a.texto,b.texto]);}
  return {id:svg.parentElement.id,fuera:textos.filter(t=>t.x0<-.5||t.x1>242.5||t.y0<-.5||t.y1>300.5),solapes};
 }));fs.writeFileSync(`${out}/encaje.json`,JSON.stringify(geometria,null,2));
 for(const figure of await page.locator('figure').all()) {
  const id=await figure.getAttribute('id');
  await figure.screenshot({path:`${out}/${id}.png`});
  if(id.endsWith('despues')){
   await figure.evaluate(e=>e.style.filter='grayscale(1)');
   await figure.screenshot({path:`${out}/${id}-blanco-negro.png`});
   await figure.evaluate(e=>e.style.filter='');
  }
 }
 for(const [width,height] of [[1280,720],[1600,1000]])for(const colorScheme of ['light','dark']){
  await page.setViewportSize({width,height});await page.emulateMedia({colorScheme});
  await page.screenshot({path:`${out}/pagina-${width}-${height}-${colorScheme}.png`});
 }
 // Hoja de contacto para revisar las doce capturas en una sola imagen.
 await page.setViewportSize({width:1500,height:2300});await page.emulateMedia({colorScheme:'light'});
 await page.setContent(`<style>body{margin:0;display:grid;grid-template-columns:repeat(3,500px)}img{width:500px}</style>${['cortina-ventana-5193','toldo-velcro-6340','antica-50-2673','general-arzua-4541'].flatMap(id=>['antes','despues','despues-blanco-negro'].map(f=>`<img src="${pathToFileURL(`${out}/${id}-${f}.png`)}">`)).join('')}`);
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
 await page.screenshot({path:`${out}/contacto.png`,fullPage:true});
 console.log(JSON.stringify(geometria));
}finally{await browser.close();}
