// Radios del cartón bajo la escala física del PDF, sin afirmar que el escáner
// mantuviese el tamaño del cartón. Contraste independiente con los CAD de Cal.
import fs from 'node:fs';
import path from 'node:path';
import { canvasLocal, salida, guardar, fuentes } from './medidas-fuentes.mjs';
import { ajustarCirculo, distancia } from './medidas-geometria.mjs';
import { leerDxf, vertices, bulges, texto } from './medidas-dxf.mjs';
const canvas=canvasLocal();globalThis.DOMMatrix=canvas.DOMMatrix;globalThis.ImageData=canvas.ImageData;globalThis.Path2D=canvas.Path2D;
const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfBytes=fs.readFileSync(path.join(salida,'fuentes/hoja-entrada.pdf'));
const doc=await pdfjs.getDocument({data:new Uint8Array(pdfBytes)}).promise;
const pagina=await doc.getPage(4),vista=pagina.getViewport({scale:2.3}),ops=await pagina.getOperatorList();
const imagenes=[];let transformacion=[1,0,0,1,0,0];const pila=[];
for(let i=0;i<ops.fnArray.length;i++){
 const fn=ops.fnArray[i],args=ops.argsArray[i];
 if(fn===pdfjs.OPS.save)pila.push([...transformacion]);
 if(fn===pdfjs.OPS.restore)transformacion=pila.pop()??[1,0,0,1,0,0];
 if(fn===pdfjs.OPS.transform){const [a,b,c,d,e,f]=transformacion,[g,h,j,k,l,m]=args;transformacion=[a*g+c*h,b*g+d*h,a*j+c*k,b*j+d*k,a*l+c*m+e,b*l+d*m+f];}
 if(fn===pdfjs.OPS.paintImageXObject)imagenes.push({argumentos:args,matrizPDF:[...transformacion]});
}
const curva=JSON.parse(fs.readFileSync(path.join(salida,'curva-escaneada.json'))),factorMmPx=25.4/72/2.3;
function zona(trazo,min=15,max=75){const ps=trazo.puntosPx;return ps.filter((p,i)=>{if(i<4||i+4>=ps.length)return false;const a=ps[i-4],b=ps[i+4],ang=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;return ang>=min&&ang<=max;});}
const radios=curva.trazas.map(t=>{const ps=zona(t),r=ajustarCirculo(ps.map(p=>p.map(x=>x*factorMmPx))),variantes=[[10,80],[20,70],[25,65]].map(([a,b])=>{const q=ajustarCirculo(zona(t,a,b).map(p=>p.map(x=>x*factorMmPx)));return {tangentes:[a,b],radioMm:q.radio,rmsMm:q.rms};});return {id:t.id,puntos:ps.length,centroMm:r.centro,radioMm:r.radio,rmsMm:r.rms,maxMm:r.max,variantes};});
const separaciones=zona(curva.trazas[0],20,70).map(p=>Math.min(...curva.trazas[1].puntosPx.map(q=>distancia(p,q)))*factorMmPx).sort((a,b)=>a-b);
const media=[];for(const p of zona(curva.trazas[0],20,70)){let mejor=curva.trazas[1].puntosPx[0];for(const q of curva.trazas[1].puntosPx)if(distancia(p,q)<distancia(p,mejor))mejor=q;media.push([(p[0]+mejor[0])/2*factorMmPx,(p[1]+mejor[1])/2*factorMmPx]);}
const mid=ajustarCirculo(media);
const cad=[];
for(const f of fuentes().filter(f=>f.cliente==='TALLERES CAL, C. B.'||/^t18[7-9]$|^t19[0-2]$|^t205$/.test(f.id))){
 const es=leerDxf(f.dxf).entidades,curvas=[];
 for(const e of es.filter(e=>['LWPOLYLINE','POLYLINE'].includes(e.t))){const ps=vertices(e),bs=bulges(e).map(q=>q*(+e.g[230]===-1?-1:1));if(ps.length>12||bs.filter(Boolean).length<2)continue;const rs=bs.map((q,i)=>q?distancia(ps[i],ps[(i+1)%ps.length])*(1+q*q)/(4*Math.abs(q))*1000:0).filter(Boolean);const centro=[0,1].map(k=>ps.reduce((s,p)=>s+p[k],0)/ps.length),cercanos=es.filter(t=>/TEXT/.test(t.t)).map(t=>({texto:texto(t),d:Math.hypot(+t.g[10]-centro[0],+t.g[20]-centro[1])})).sort((a,b)=>a.d-b.d).slice(0,3);curvas.push({id:e.id,capa:e.capa,radiosMm:rs,vertices:ps,bulges:bs,textosCercanos:cercanos});}
 const bot=f.bot&&fs.existsSync(f.bot)?leerDxf(f.bot).entidades.filter(e=>e.t==='ARC').map(e=>({id:e.id,capa:e.capa,radioMm:+e.g[40],centro:[+e.g[10],+e.g[20]],desde:+e.g[50],hasta:+e.g[51]})):[];
 cad.push({id:f.id,fuente:f.dxf,original:f.original,botFuente:f.bot,curvas,arcosBot:bot});
}
guardar('radio-carton.json',{hipotesis:'El tamaño del cartón se conserva en la imagen colocada en el PDF. La declaración de tamaño real se refiere al cartón; no se dispone de una cota testigo que pruebe la escala del escaneo. Resultados condicionales, no radio aprobado.',pagina:{view:pagina.view,userUnit:pagina.userUnit,rotacion:pagina.rotate,viewport:vista.width+' × '+vista.height,imagenes},factorMmPx,radios,radioLineaMediaMm:mid.radio,errorLineaMediaRmsMm:mid.rms,diferenciaCentrosMm:distancia(radios[0].centroMm,radios[1].centroMm),separacionRayasMm:{min:separaciones[0],mediana:separaciones[Math.floor(separaciones.length/2)],max:separaciones.at(-1)},cad});
console.log(JSON.stringify({pagina:pagina.view,imagenes,factorMmPx,radios,radioLineaMediaMm:mid.radio,separacionMedianaMm:separaciones[Math.floor(separaciones.length/2)],centrosDistanciaMm:distancia(radios[0].centroMm,radios[1].centroMm),casosCal:cad.length}));
