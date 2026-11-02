// Compara píxeles y texto antes/después con los mismos casos que el contraste SVG/pdfkit.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {casosContrasteDibujos} from './lib/casos-contraste-dibujos.mjs';
import {buildFabricDiagramSvg,buildFabricDiagramBoxPdf,buildOrderPlanteamientoPdf} from '../src/domain/planteamientoPdf.js';
import {calculateOrder} from '../src/domain/rules.js';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const out=path.resolve('tmp/ui-audit/dibujos-estilo/retirada');fs.mkdirSync(out,{recursive:true});
const fase=process.argv[2];assert.ok(['antes','despues','comparar'].includes(fase));
const hash=b=>createHash('sha256').update(b).digest('hex');
async function huellaPdf(buffer){
 const task=getDocument({data:new Uint8Array(buffer)});try{
  const pdf=await task.promise;const hojas=[];
  for(let n=1;n<=pdf.numPages;n++){
   const pagina=await pdf.getPage(n),viewport=pagina.getViewport({scale:1});
   const lienzo=pdf.canvasFactory.create(Math.ceil(viewport.width),Math.ceil(viewport.height));
   try{
    await pagina.render({canvasContext:lienzo.context,viewport}).promise;
    const texto=await pagina.getTextContent();
    hojas.push({pixeles:hash(lienzo.context.getImageData(0,0,lienzo.canvas.width,lienzo.canvas.height).data),textos:hash(JSON.stringify(texto.items))});
   }finally{pdf.canvasFactory.destroy(lienzo);}
  }return hojas;
 }finally{await task.destroy();}
}
function comprobar(resultados){
 const antes=JSON.parse(fs.readFileSync(`${out}/antes.json`));
 // Los fontName de pdfjs llevan el número de documento; no son diferencias visibles.
 const visible=r=>({id:r.id,diagram:r.diagram,svg:r.svg,pdf:r.pdf.map(p=>p.pixeles),hojaCompleta:r.hojaCompleta?.map(p=>p.pixeles)});
 const cambios=resultados.filter(r=>JSON.stringify(visible(antes.find(a=>a.id===r.id)))!==JSON.stringify(visible(r)));
 const eliminados=antes.filter(a=>!resultados.some(r=>r.id===a.id));
 const resumen={antes:antes.length,despues:resultados.length,catalogo:resultados.filter(r=>r.hojaCompleta).length,cambios,casosRetirados:eliminados.map(c=>c.id)};
 fs.writeFileSync(`${out}/comparacion.json`,JSON.stringify(resumen,null,2));assert.equal(cambios.length,0,'Cambió el resultado impreso de casos conservados');console.log(JSON.stringify(resumen));

}
if(fase==='comparar'){comprobar(JSON.parse(fs.readFileSync(`${out}/despues.json`)));process.exit(0);}
const resultados=[];
for(const c of casosContrasteDibujos()){
 const r={id:c.id,diagram:c.diagram,svg:hash(JSON.stringify(buildFabricDiagramSvg(c))),pdf:await huellaPdf(await buildFabricDiagramBoxPdf(c))};
 if(c.id.startsWith('catalogo-')){
  const order={orderCode:'CONTRASTE',fabric:'ACRILI2170P120|||120|||ACR NEGRO',sameFabric:true,awnings:[c.awning]};
  r.hojaCompleta=await huellaPdf(await buildOrderPlanteamientoPdf({order,calculation:calculateOrder(order)}));
 }
 resultados.push(r);
}
fs.writeFileSync(`${out}/${fase}.json`,JSON.stringify(resultados,null,2));
if(fase==='despues')comprobar(resultados);else console.log(JSON.stringify({referencia:resultados.length,catalogo:resultados.filter(r=>r.hojaCompleta).length}));
