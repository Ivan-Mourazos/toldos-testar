import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const out=path.resolve('tmp/ui-audit/dibujos-html/revision');
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 await page.goto(pathToFileURL(`${out}/index.html`).href);
 await page.evaluate(()=>document.fonts.ready);
 const incidencias=await page.evaluate(()=>Array.from(document.querySelectorAll('article')).map(a=>({variante:a.querySelector('h2').innerText,casos:Array.from(a.querySelectorAll('svg')).map(svg=>{
  const textos=Array.from(svg.querySelectorAll('text')).map(t=>{
   const b=t.getBBox(), m=t.getCTM(), root=svg.getCTM().inverse(), p=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m).matrixTransform(root));
   return {texto:t.textContent,x0:Math.min(...p.map(q=>q.x)),x1:Math.max(...p.map(q=>q.x)),y0:Math.min(...p.map(q=>q.y)),y1:Math.max(...p.map(q=>q.y))};
  });
  const solapes=[];
  for(let i=0;i<textos.length;i++) for(const b of textos.slice(i+1)) { const a=textos[i]; if(Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0)>1 && Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)>1) solapes.push([a.texto,b.texto]); }
  return {fuera:textos.filter(b=>b.x0 < -0.5 || b.x1>242.5 || b.y0<-.5 || b.y1>300.5),solapes};
 })})));
 fs.writeFileSync(`${out}/espacio.json`,JSON.stringify(incidencias,null,2));
 for(const [width,height] of [[1280,720],[1600,1000]]) for(const tema of ['claro','oscuro']) {
  await page.setViewportSize({width,height});
  await page.addStyleTag({content:`body{background:${tema==='oscuro'?'#202327':'#eee'};color:${tema==='oscuro'?'#eee':'#222'}}article{color:#222}`});
  await page.screenshot({path:`${out}/laminas-${width}-${height}-${tema}.png`});
 }
 await page.setViewportSize({width:1600,height:1000});
 // Una hoja de contacto por doce variantes; incluye los tres tamaños de cada una.
 await page.addStyleTag({content:'body{background:#fff;color:#222}body>h1,body>p,body>a{display:none}body{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px}article{padding:5px;margin:0;height:360px;overflow:hidden}article h2{font-size:12px;margin:3px}article p{font-size:9px;margin:3px}figure{margin:2px}figure svg{width:145px;height:180px}figcaption{font-size:9px;width:145px}'});
 const n=await page.locator('article').count();
 for(let i=0;i<n;i+=12) {
  await page.locator('article').evaluateAll((els,inicio)=>els.forEach((e,j)=>e.style.display=j>=inicio&&j<inicio+12?'block':'none'),i);
  await page.screenshot({path:`${out}/contacto-${Math.floor(i/12)+1}.png`,fullPage:true});
 }
 const casos=JSON.parse(fs.readFileSync(`${out}/embudos/casos.json`));
 for(const c of casos) for(const tipo of ['web','oficina']) {
  const file=`${out}/embudos/${c.pedido.replace(tipo==='oficina'?/-[AB]$/:/$^/,'')}-${tipo}.html`;
  if(!fs.existsSync(file))continue;
  await page.goto(pathToFileURL(file).href);
  await page.pdf({path:`${out}/embudos/${c.pedido}-${tipo}.pdf`,preferCSSPageSize:true,printBackground:true});
  const hojas=page.locator('section');
  for(let i=0;i<await hojas.count();i++) await hojas.nth(i).screenshot({path:`${out}/embudos/${c.pedido}-${tipo}-${i+1}.png`});
 }
 // Contraste de contenido: colores y dos tamaños de escritorio, con imágenes de altura estable.
 await page.goto(pathToFileURL(`${out}/contraste-pedidos.html`).href);
 await page.evaluate(()=>document.fonts.ready);
 for(const [width,height] of [[1280,720],[1600,1000]]) for(const colorScheme of ['light','dark']) {
  await page.setViewportSize({width,height});await page.emulateMedia({colorScheme});
  await page.screenshot({path:`${out}/contraste-${width}-${height}-${colorScheme}.png`});
 }
 await page.setViewportSize({width:1600,height:1000});await page.emulateMedia({colorScheme:'light'});
 for(const id of ['cortina-ventana-5193','cortina-velcro-4890','solapas-rectas-4890','antica-30-3374']) {
  const articulo=page.locator('#'+id);await articulo.scrollIntoViewIfNeeded();
  await articulo.locator('img').evaluate(async img=>{await img.decode();});
  await articulo.screenshot({path:`${out}/contraste-${id}.png`});
 }
 console.log(JSON.stringify({variantes:n,fuera:incidencias.filter(v=>v.casos.some(c=>c.fuera.length)).map(v=>v.variante),solapes:incidencias.filter(v=>v.casos.some(c=>c.solapes.length)).map(v=>v.variante)}));
} finally { await browser.close(); }
