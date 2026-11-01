// Lectura de escaneos de RPS: conserva la huella y renderiza cada página sin interpretar texto OCR.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const require=createRequire(import.meta.resolve('pdfjs-dist/package.json'));
const {createCanvas}=require('@napi-rs/canvas');
const fuente=process.env.MUESTRAS_DIBUJOS || 'C:/Users/ivan.sanchez/Documents/Proyectos DEV/toldos-testar/tmp/dibujos-muestras';
const salida=path.resolve(process.env.SALIDA_MUESTRAS || 'tmp/ui-audit/dibujos-html/revision/pedidos');
if(!salida.startsWith(path.resolve('tmp')+path.sep)) throw new Error('La salida debe quedar en tmp del repositorio.');
fs.mkdirSync(salida,{recursive:true});
const manifiesto=[];
for(const entrada of fs.readdirSync(fuente,{withFileTypes:true}).filter(e=>e.isDirectory())) {
 const grupo=entrada.name, paginas=[];
 for(const file of fs.readdirSync(path.join(fuente,grupo)).filter(f=>/\.pdf$/i.test(f))) {
  const bytes=fs.readFileSync(path.join(fuente,grupo,file));
  const task=getDocument({data:new Uint8Array(bytes), wasmUrl:fileURLToPath(new URL('wasm/',import.meta.resolve('pdfjs-dist/package.json'))).replaceAll('\\','/'), standardFontDataUrl:fileURLToPath(new URL('standard_fonts/',import.meta.resolve('pdfjs-dist/package.json'))).replaceAll('\\','/'), verbosity:0,stopAtErrors:true}),pdf=await task.promise;
  const r={grupo,file,sha256:createHash('sha256').update(bytes).digest('hex'),paginas:[]};
  for(let n=1;n<=pdf.numPages;n++) {
   const p=await pdf.getPage(n),v0=p.getViewport({scale:1}),v=p.getViewport({scale:1400/v0.width}),canvas=createCanvas(Math.ceil(v.width),Math.ceil(v.height));
   await p.render({canvasContext:canvas.getContext('2d'),viewport:v}).promise;
   const nombre=`${grupo}-${file.replace('.pdf','')}-p${n}.png`;
   fs.writeFileSync(path.join(salida,nombre),canvas.toBuffer('image/png'));
   r.paginas.push({pagina:n,imagen:nombre,ancho:canvas.width,alto:canvas.height});paginas.push({nombre,canvas});
  }
  manifiesto.push(r);fs.writeFileSync(path.join(salida,'manifiesto.json'),JSON.stringify(manifiesto,null,2));await task.destroy();
 }
 // Una hoja de contacto por cuatro páginas, sin saltarse las páginas comerciales.
 for(let i=0;i<paginas.length;i+=4) {
  const lote=paginas.slice(i,i+4),alto=1500,ancho=1800,c=createCanvas(ancho,alto),ctx=c.getContext('2d');
  ctx.fillStyle='#ddd';ctx.fillRect(0,0,ancho,alto);
  for(const [j,p] of lote.entries()) {
   const x=(j%2)*900,y=Math.floor(j/2)*750,scale=Math.min(890/p.canvas.width,710/p.canvas.height);
   ctx.fillStyle='#000';ctx.font='18px Arial';ctx.fillText(p.nombre,x+6,y+24);ctx.drawImage(p.canvas,x+5,y+32,p.canvas.width*scale,p.canvas.height*scale);
  }
  fs.writeFileSync(path.join(salida,`${grupo}-contacto-${i/4+1}.png`),c.toBuffer('image/png'));
 }
 console.log(`${grupo}: ${paginas.length} páginas`);
}
fs.writeFileSync(path.join(salida,'manifiesto.json'),JSON.stringify(manifiesto,null,2));
console.log(JSON.stringify({pedidos:manifiesto.length,paginas:manifiesto.reduce((s,r)=>s+r.paginas.length,0)}));
