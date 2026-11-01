// Digitalización orientativa: píxeles, sin radio ni escala de taller.
import fs from 'node:fs';
import path from 'node:path';
import { canvasLocal, salida, guardar } from './medidas-fuentes.mjs';
const canvas = canvasLocal(), img = await canvas.loadImage(path.join(salida, 'hoja-entrada-p4.png'));
const c = canvas.createCanvas(img.width, img.height), ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
const { data, width: w } = ctx.getImageData(0, 0, img.width, img.height);
const lum = (x,y) => { const i=(y*w+x)*4; return (data[i]+data[i+1]+data[i+2])/3; };
// Semillas visuales en píxeles. Camino monótono de menor coste de tinta.
function trazar([x0,y0],[x1,y1],id) {
  const W=x1-x0+1,H=y1-y0+1,costes=new Float64Array(W*H),padre=new Uint8Array(W*H);
  costes.fill(Infinity);costes[0]=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(!x&&!y)continue;const k=y*W+x,peso=Math.exp((lum(x+x0,y+y0)-100)/25)+.1;
    const opts=[x?costes[k-1]+peso:Infinity,y?costes[k-W]+peso:Infinity,x&&y?costes[k-W-1]+peso*Math.SQRT2:Infinity];
    const min=Math.min(...opts);costes[k]=min;padre[k]=opts.indexOf(min)+1;
  }
  const ps=[];let x=W-1,y=H-1;
  while(x||y){ps.push([x+x0,y+y0]);const p=padre[y*W+x];if(p===1)x--;else if(p===2)y--;else{x--;y--;}}
  ps.push([x0,y0]);ps.reverse();
  const puntos=ps.filter((_,i)=>i%6===0||i===ps.length-1), escala=Math.max(x1-x0,y1-y0);
  return {id,semillasPx:[[x0,y0],[x1,y1]],puntosPx:puntos,puntosNormalizados:puntos.map(([x,y])=>[(x-x0)/escala,(y-y0)/escala]),escalaNormalizadaPx:escala};
}
// Semillas intermedias separan las dos líneas, para que la extracción no salte
// del trazo superior al inferior cuando la tinta del primero se debilita.
function porTramos(semillas,id) {
  const puntos=semillas.slice(1).flatMap((p,i)=>trazar(semillas[i],p,id).puntosPx.slice(i?1:0));
  const [x0,y0]=semillas[0],[x1,y1]=semillas.at(-1),escala=Math.max(x1-x0,y1-y0);
  return {id,semillasPx:semillas,puntosPx:puntos,puntosNormalizados:puntos.map(([x,y])=>[(x-x0)/escala,(y-y0)/escala]),escalaNormalizadaPx:escala};
}
const trazas=[porTramos([[150,440],[710,450],[858,500],[1010,600],[1103,700],[1194,900],[1222,1100],[1224,1400]],'trazo-superior'),porTramos([[65,560],[650,560],[818,600],[958,700],[1078,900],[1101,1100],[1114,1400]],'trazo-inferior')];
guardar('curva-escaneada.json',{fuente:'fuentes/hoja-entrada.pdf, página 4',metodo:'Camino monótono sobre coste exponencial del gris entre semillas; normalización que conserva la proporción de píxeles. Se revisa por superposición.',escalaMilimetrica:null,curvaValida:null,advertencia:'Dos trazos sin identificar; no trasladar estas coordenadas a un corte.',trazas});
ctx.lineWidth=3;
for(let i=0;i<trazas.length;i++){ctx.strokeStyle=i?'#d04413':'#0078bf';ctx.beginPath();trazas[i].puntosPx.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
ctx.fillStyle='#fff';ctx.fillRect(40,80,1220,95);ctx.fillStyle='#192a38';ctx.font='bold 26px sans-serif';ctx.fillText('DOS TRAZOS SIN ESCALA MÉTRICA NI ELECCIÓN VALIDADA',55,120);ctx.font='21px sans-serif';ctx.fillText('Superposición de la extracción por script · solo orientativa',55,155);
fs.writeFileSync(path.join(salida,'curva-orientativa.png'),c.toBuffer('image/png'));
console.log(trazas.map(x=>({id:x.id,puntos:x.puntosPx.length})));
