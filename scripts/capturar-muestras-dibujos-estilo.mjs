import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const out=path.resolve('tmp/ui-audit/dibujos-estilo/final');
const revision=path.resolve('tmp/ui-audit/dibujos-html/revision');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 async function inspeccionar(file){
  await page.goto(pathToFileURL(file).href);await page.evaluate(()=>document.fonts.ready);
  return page.locator('svg').evaluateAll(svgs=>svgs.map((svg,i)=>{
   const root=svg.getCTM().inverse();
   const textos=[...svg.querySelectorAll('text')].map(t=>{const b=t.getBBox(),m=t.getCTM();const puntos=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m).matrixTransform(root));return {texto:t.textContent,x0:Math.min(...puntos.map(p=>p.x)),x1:Math.max(...puntos.map(p=>p.x)),y0:Math.min(...puntos.map(p=>p.y)),y1:Math.max(...puntos.map(p=>p.y))};});
   const solapes=[];for(let i=0;i<textos.length;i++)for(const b of textos.slice(i+1)){const a=textos[i];if(Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>1&&Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)>1)solapes.push([a.texto,b.texto]);}
   const colores=[...svg.querySelectorAll('[fill],[stroke]')].flatMap(e=>['fill','stroke'].map(k=>e.getAttribute(k)).filter(c=>c&&c!=='none'&&!/^#([0-9a-f]{2})\1\1$/i.test(c)));
   return {id:svg.parentElement.id||`${svg.closest('article')?.querySelector('h2')?.textContent}-${i}`,fuera:textos.filter(t=>t.x0<-.5||t.x1>242.5||t.y0<-.5||t.y1>300.5),solapes,colores};
  }));
 }
 const catalogo=await inspeccionar(`${revision}/index.html`);
 const final=await inspeccionar(`${out}/index.html`);
 fs.writeFileSync(`${out}/encaje.json`,JSON.stringify({catalogo,final},null,2));
 for(const articulo of await page.locator('article').all()){
  const id=await articulo.getAttribute('id');await articulo.locator('figure').first().screenshot({path:`${out}/${id}.png`});
 }
 for(const [width,height]of [[1280,720],[1600,1000]])for(const colorScheme of ['light','dark']){await page.setViewportSize({width,height});await page.emulateMedia({colorScheme});await page.screenshot({path:`${out}/pagina-${width}-${height}-${colorScheme}.png`});}
 await page.setViewportSize({width:2000,height:1});await page.emulateMedia({colorScheme:'light'});
 const casos=JSON.parse(fs.readFileSync(`${out}/casos.json`));
 await page.setContent(`<style>body{margin:0;background:#fff;display:grid;grid-template-columns:repeat(5,400px);grid-auto-rows:max-content;align-content:start;align-items:start}img{width:400px;display:block}</style>${casos.map(c=>`<img src="${pathToFileURL(`${out}/${c.id}.png`)}">`).join('')}`);
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));await page.screenshot({path:`${out}/contacto.png`,fullPage:true});
 const resumen={catalogo:catalogo.length,final:final.length,fuera:[...catalogo,...final].filter(c=>c.fuera.length),solapes:[...catalogo,...final].filter(c=>c.solapes.length),colores:[...catalogo,...final].filter(c=>c.colores.length)};
 fs.writeFileSync(`${out}/resumen.json`,JSON.stringify(resumen,null,2));console.log(JSON.stringify(resumen));
}finally{await browser.close();}
