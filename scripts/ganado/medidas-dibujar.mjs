// Láminas de estudio, no patrones de máquina. Renderizado local con Canvas.
import fs from 'node:fs';
import path from 'node:path';
import { canvasLocal, salida } from './medidas-fuentes.mjs';
import { desarrollarDesdeCentro, contornoPerfil } from './medidas-geometria.mjs';
const canvas=canvasLocal();
const colores={tinta:'#243442',azul:'#176f8b',rojo:'#c35437',gris:'#657986'};
function lienzo(titulo,subtitulo,w=1800,h=1050){const c=canvas.createCanvas(w,h),g=c.getContext('2d');g.fillStyle='#f6f4ee';g.fillRect(0,0,w,h);g.fillStyle=colores.tinta;g.font='bold 32px sans-serif';g.fillText(titulo,45,55);g.font='21px sans-serif';g.fillText(subtitulo,45,92);return {c,g};}
function transformar(ps,b){const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys),x1=Math.max(...xs),y1=Math.max(...ys),s=Math.min(b.w/(x1-x0||1),b.h/(y1-y0||1));return p=>[b.x+(p[0]-x0)*s+(b.w-(x1-x0)*s)/2,b.y+b.h-(p[1]-y0)*s-(b.h-(y1-y0)*s)/2];}
function linea(g,ps,T,color=colores.azul,cerrada=false,width=2){g.strokeStyle=color;g.lineWidth=width;g.beginPath();ps.forEach((p,i)=>{const [x,y]=T(p);i?g.lineTo(x,y):g.moveTo(x,y);});if(cerrada)g.closePath();g.stroke();}
const iso=([x,y,z])=>[x*.7+y*.72,-x*.24+y*.25+z];
function morro3d(g,a,b,box,largo=0){
 const atras=largo?a.map(([x,y,z])=>[x-largo,y,z]):null,ps=[...a,...b,...(atras??[])].map(iso),T=transformar(ps,box);
 if(atras){linea(g,atras.map(iso),T,colores.gris);for(const k of [0,Math.floor(a.length/2),a.length-1])linea(g,[atras[k],a[k]].map(iso),T,colores.gris);}
 for(let i=0;i<a.length;i++)linea(g,[a[i],b[i]].map(iso),T,i%2? '#b4c7cb':'#89aab3',false,1.1);
 linea(g,a.map(iso),T,colores.azul,false,3);linea(g,b.map(iso),T,colores.rojo,false,3);
 for(let i=1;i<a.length;i++)linea(g,[a[i],b[i-1]].map(iso),T,'#b7c9cc',false,.8);
}
const cm=n=>(n/10).toLocaleString('es-ES',{maximumFractionDigits:2});
export function dibujarPropuesta(modelo,nombre='propuesta',cabecera={cliente:'TALLERES CAL',pedido:'AR.26.05319'}){
 const {perfilA:a,perfilB:b,medidas:m}=modelo;
 const desarrollo=desarrollarDesdeCentro(a,b),plano=[...desarrollo.a,...desarrollo.b.toReversed()];
 const max=(ps,k)=>Math.max(...ps.map(p=>p[k]))-Math.min(...ps.map(p=>p[k]));
 let {c,g}=lienzo(cabecera.cliente+' · PROPUESTA SIN VALIDAR',cabecera.pedido+` · solo estudio · caída entre cimas ${cm(m.altoA+m.aguasA-m.altoB-m.aguasB)} cm · NO VÁLIDO PARA CORTAR`);
 morro3d(g,a,b,{x:80,y:150,w:1600,h:700},m.largoCuerpo??0);
 g.font='23px sans-serif';g.fillStyle=colores.tinta;g.fillText(`Parte recta ${cm(m.largoCuerpo)} cm · ancho ${cm(m.ancho)} cm · frente ${cm(m.frente)} cm`,60,915);
 g.fillText(`Atrás ${cm(m.altoA)} + ${cm(m.aguasA)} cm · delante ${cm(m.altoB)} + ${cm(m.aguasB)} cm · diagonal ${cm(m.diagonal)} cm`,60,955);
 g.font='20px sans-serif';g.fillStyle=colores.rojo;g.fillText(`Radio candidato ${cm(m.radioA)} cm condicionado a la escala del escaneo; acabados pendientes de revisión.`,60,1000);
 fs.writeFileSync(path.join(salida,nombre+'-3d.png'),c.toBuffer('image/png'));
 ({c,g}=lienzo('DESARROLLO TERMINADO · PROPUESTA SIN VALIDAR','Dimensiones geométricas en cm · sin demasías · sin disposición de corte · NO VÁLIDO PARA CORTAR'));
 const cuerpoContorno=contornoPerfil({ancho:m.ancho,alto:m.altoA,aguas:m.aguasA,radio:m.radioA});
 const frente=b.map(p=>[p[1],p[2]]),trasero=a.map(p=>[p[1],p[2]]);
 const piezas=[{nombre:'Cuerpo recto',ps:[[0,0],[m.largoCuerpo,0],[m.largoCuerpo,cuerpoContorno],[0,cuerpoContorno]],texto:`${cm(m.largoCuerpo)} × ${cm(cuerpoContorno)}`},{nombre:'Morro desarrollado',ps:plano,texto:`envolvente ${cm(max(plano,0))} × ${cm(max(plano,1))}`},{nombre:'Frente',ps:frente,texto:`envolvente ${cm(m.frente)} × ${cm(m.altoB+m.aguasB)}`},{nombre:'Trasero: solución a revisar',ps:trasero,texto:`envolvente ${cm(m.ancho)} × ${cm(m.altoA+m.aguasA)}`}];
 piezas.forEach((p,i)=>{const x=50+(i%2)*870,y=145+Math.floor(i/2)*410;g.font='bold 23px sans-serif';g.fillStyle=colores.tinta;g.fillText(p.nombre,x,y);g.font='21px sans-serif';g.fillText(p.texto+' cm',x,y+30);linea(g,p.ps,transformar(p.ps,{x:x+20,y:y+60,w:790,h:285}),colores.azul,true,2.4);});
 g.font='20px sans-serif';g.fillStyle=colores.rojo;g.fillText('Ventana, tapa, puerta MFI, solapas y fruncido: faltan posición/medida/acabados; no se dimensionan por suposición.',45,1015);
 fs.writeFileSync(path.join(salida,nombre+'-plano.png'),c.toBuffer('image/png'));
 return {cuerpoContornoMm:cuerpoContorno,morroEnvolventeMm:[max(plano,0),max(plano,1)],piezas:piezas.map(p=>({nombre:p.nombre,medidas:p.texto+' cm'})),desarrollo};
}
export function dibujarComparado(r,nombre='caso-real-lado-a-lado'){
 const b=r.mejor;if(!b?.puntos3d)return;
 const {c,g}=lienzo(`${r.id} · ORIGINAL 3D Y DESARROLLO COMPARADO`,`Caso ${r.grupo} · máximo ${b.errorVerticesMm.toLocaleString('es-ES',{maximumFractionDigits:3})} mm · azul: calculado; rojo: original`);
 morro3d(g,b.puntos3d[0],b.puntos3d[1],{x:45,y:160,w:790,h:680});
 const n=b.generado.length/2,ps=[...b.generado.slice(0,n),...b.generado.slice(n).toReversed()],original=[...b.referencia.slice(0,n),...b.referencia.slice(n).toReversed()],T=transformar([...ps,...original],{x:950,y:160,w:790,h:680});
 linea(g,original,T,colores.rojo,true,4);linea(g,ps,T,colores.azul,true,1.7);
 g.font='23px sans-serif';g.fillStyle=colores.tinta;g.fillText('3D leído del dibujo de oficina',70,915);g.fillText('Plano terminado: superposición sin escala',960,915);
 g.font='18px sans-serif';g.fillText('Las líneas finas muestran la triangulación. Las demasías y el corte no están acreditados por esta lámina.',50,980);
 fs.writeFileSync(path.join(salida,nombre+'.png'),c.toBuffer('image/png'));
}
