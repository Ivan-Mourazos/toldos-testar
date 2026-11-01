// Parejas terminado/corte de las copias CAD de Cal. Se observa el incremento;
// no se impone +10 para buscar una coincidencia ni se mezclan los juegos A/B/C.
import fs from 'node:fs';
import path from 'node:path';
import { salida, guardar } from './medidas-fuentes.mjs';
import { distancia } from './medidas-geometria.mjs';
import { ajustar } from './medidas-cad.mjs';
const datos=JSON.parse(fs.readFileSync(path.join(salida,'radio-carton.json'))),filas=[];
const caja=ps=>[0,1].map(i=>[Math.min(...ps.map(p=>p[i])),Math.max(...ps.map(p=>p[i]))]);
const centro=ps=>[0,1].map(i=>ps.reduce((s,p)=>s+p[i],0)/ps.length);
function arcosPolilinea(p){const out=[];for(let i=0;i<p.vertices.length;i++){const q=p.bulges[i];if(!q)continue;const a=p.vertices[i].slice(0,2).map(x=>x*1000),b=p.vertices[(i+1)%p.vertices.length].slice(0,2).map(x=>x*1000),dx=b[0]-a[0],dy=b[1]-a[1],centro=[(a[0]+b[0])/2-dy*(1-q*q)/(4*q),(a[1]+b[1])/2+dx*(1-q*q)/(4*q)];out.push({centro,a,b,r:distancia(a,centro)});}return out;}
function comprobarBot(p,bot){const ar=arcosPolilinea(p);if(ar.length!==2)return null;const candidatos=bot.filter(b=>ar.some(a=>Math.abs(a.r-b.radioMm)<.001));let mejor=null;for(const b1 of candidatos)for(const b2 of candidatos){if(b1.id===b2.id)continue;const puntos=b=>{const a=b.desde*Math.PI/180,c=b.hasta*Math.PI/180;return [b.centro,[b.centro[0]+b.radioMm*Math.cos(a),b.centro[1]+b.radioMm*Math.sin(a)],[b.centro[0]+b.radioMm*Math.cos(c),b.centro[1]+b.radioMm*Math.sin(c)]];};for(const invertir of [false,true]){const a=ar.flatMap(x=>[x.centro,x.a,x.b]),b=[b1,b2].flatMap(x=>{const [c,u,v]=puntos(x);return invertir?[c,v,u]:[c,u,v];}),r=ajustar(a,b);if(!mejor||r.max<mejor.errorMm)mejor={errorMm:r.max,arcos:[b1.id,b2.id],estado:r.max<=.2?'cuadra':'no cuadra'};}}return mejor;}
for(const c of datos.cad){
 const terminados=c.curvas.filter(p=>/referencias|referencia-1/i.test(p.capa));
 const cortes=c.curvas.filter(p=>/disco|corte|curv/i.test(p.capa));
 for(const t of terminados){
  const candidatos=cortes.filter(p=>p.radiosMm.length===t.radiosMm.length&&distancia(centro(t.vertices),centro(p.vertices))<.1).map(p=>({p,d:distancia(centro(t.vertices),centro(p.vertices))})).sort((a,b)=>a.d-b.d);
  const corte=candidatos[0]?.p;if(!corte)continue;
  const bc=caja(corte.vertices),bt=caja(t.vertices);
  const incrementos=t.radiosMm.map((r,i)=>corte.radiosMm[i]-r);
  filas.push({id:c.id,fuente:c.fuente,botFuente:c.botFuente,terminado:t.id,capaTerminado:t.capa,corte:corte.id,capaCorte:corte.capa,textosCercanos:t.textosCercanos,radiosTerminadoMm:t.radiosMm,radiosCorteMm:corte.radiosMm,incrementosRadioMm:incrementos,medidaTerminadoMm:bt.map(([a,b])=>(b-a)*1000),medidaCorteMm:bc.map(([a,b])=>(b-a)*1000),diferenciaEnvolventeMm:bc.map(([a,b],i)=>(b-a-bt[i][1]+bt[i][0])*1000),incrementoUniforme:Math.max(...incrementos)-Math.min(...incrementos)<.01,contrasteArcosBot:comprobarBot(corte,c.arcosBot)});
 }
}
guardar('acabados-cal.json',{metodo:'Misma fuente, capas referencias y corte/curv/DISCO, misma cantidad de arcos y centros de vértices a menos de 10 cm. Son parejas candidatas: se conserva la etiqueta cercana para separar juegos y revisarlas. Todas las medidas vienen de los vértices y abombamientos originales.',filas});
const n=x=>x.toLocaleString('es-ES',{maximumFractionDigits:3});
guardar('RADIOS-CAL.md','# Radios y acabados de Cal, extraídos por script\n\nLas etiquetas cercanas no sustituyen la asociación por línea y OF. En particular, A/B/C de un pedido son juegos diferentes. No se usa la nota R8 de los remolques normales para decidir el radio de caballos.\n\n| Fuente | Etiqueta cercana | Terminado → corte | Radio terminado mm | Radio corte mm | Incremento mm |\n|---|---|---|---|---|---|\n'+filas.map(r=>`| ${r.id} | ${r.textosCercanos.map(t=>t.texto).join('; ')} | ${r.terminado} → ${r.corte} | ${r.radiosTerminadoMm.map(n).join('; ')} | ${r.radiosCorteMm.map(n).join('; ')} | ${r.incrementosRadioMm.map(n).join('; ')} |`).join('\n')+'\n\n## Fuentes\n\n'+datos.cad.map(c=>`- ${c.id}: \`${c.fuente}\`; original \`${c.original}\`.`).join('\n')+'\n');
const pedidos=filas.filter(r=>/^AR/.test(r.id)),incremento10=pedidos.filter(r=>r.incrementosRadioMm.every(x=>Math.abs(x-10)<.01));
console.log(JSON.stringify({parejas:filas.length,parejasPedidos:pedidos.length,parejasPedidosCon10mm:incremento10.length,pedidosCon10mm:[...new Set(incremento10.map(r=>r.id))],juegoC5157:filas.filter(r=>r.id==='AR2605157'&&r.textosCercanos.some(t=>t.texto==='C'))}));
