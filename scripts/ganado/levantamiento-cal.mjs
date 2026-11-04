// Lee las secciones espaciales originales: rectas 3D y arcos con su radio real.
// Solo usa copias locales y escribe evidencia en tmp/ganado-cal/levantamiento.
import fs from 'node:fs';
import path from 'node:path';
import { extraerSecciones } from './medidas-cad.mjs';
import { vertices } from './medidas-dxf.mjs';
import { canvasLocal } from './medidas-fuentes.mjs';
import { contornoPerfil } from '../../src/remolques/ganado/geometria.js';
import { calcularMedidasCal, MEDIDAS_CAL_5319, MEDIDAS_CAL_GEMELO } from '../../src/remolques/ganado/medidas.ts';
import { CORTE_ESTANDAR } from '../../src/remolques/ganado/estandarDatos.ts';
const dir='tmp/ganado-cal/levantamiento';fs.mkdirSync(dir,{recursive:true});
const fuentes=[['AR2605319','tmp/ganado-cal/fuentes/dxf/AR2605319.dxf'],
 ...['AR2506052','AR2601847','AR2605060','AR2604281','AR2505892'].map(id=>[id,`tmp/ganado-medidas/fuentes/dxf/${id}.dxf`])];
const distancia=(a,b)=>Math.hypot(...a.map((x,k)=>x-b[k]));
const informe=[];
for(const [id,f] of fuentes){
 const {perfiles,es}=extraerSecciones(f),unicos=[];
 for(const p of perfiles){
  const zs=p.segmentos.flatMap(s=>[s.a[2],s.b[2]]),base=Math.min(...zs),cima=Math.max(...zs);
  const rectas=p.segmentos.filter(s=>!s.curva),arcos=p.segmentos.filter(s=>s.curva);
  const laterales=rectas.filter(s=>Math.abs(s.a[1]-s.b[1])<1e-7),aguas=rectas.filter(s=>!laterales.includes(s));
  const q=aguas[0],pendiente=Math.abs((q.b[2]-q.a[2])/(q.b[1]-q.a[1]));
  const ancho=p.caja[1][1]-p.caja[1][0],agua=ancho/2*pendiente,alto=cima-base-agua,radio=p.radios[0];
  const sum=ss=>ss.reduce((s,t)=>s+(t.curva?distancia(t.u,[0,0,0])*Math.abs(t.ang):distancia(t.a,t.b)),0)*1000;
  const medido=sum(p.segmentos),calculado=contornoPerfil({ancho:ancho*1000,alto:alto*1000,aguas:agua*1000,radio:radio*1000});
  const fila={id:p.id,anchoMm:ancho*1000,altoLateralMm:alto*1000,aguasMm:agua*1000,radioMm:radio*1000,
   lateralesMm:sum(laterales),aguasRectasMm:sum(aguas),arcosMm:sum(arcos),recorrido3dMm:medido,formulaMm:calculado,errorMm:Math.abs(medido-calculado),
   tramos:p.segmentos.map(s=>({id:s.id,tipo:s.curva?'arco':'recta',a:s.a,b:s.b,radioMm:s.curva?distancia(s.u,[0,0,0])*1000:null,barridoRad:s.ang??null,longitudMm:sum([s])}))};
  if(!unicos.some(x=>['anchoMm','altoLateralMm','aguasMm','radioMm'].every(k=>Math.abs(x[k]-fila[k])<.01)))unicos.push(fila);
 }
 informe.push({id,fuente:f,perfiles:unicos});
 if(!unicos.length||unicos.some(p=>p.errorMm>1e-6))throw Error('El recorrido 3D no reproduce la fórmula: '+id);
 if(id==='AR2605319'){dibujar5319(perfiles,es);dibujarVentana(perfiles,es);}
}
function dibujar5319(perfiles,es){
 const ancho=perfiles.find(p=>p.id.startsWith('10EFF')),frente=perfiles.find(p=>p.id.startsWith('10EF9'));
 const origen=[ancho.caja[0][0],ancho.caja[1][0],0],nube=[];
 const muestrear=s=>Array.from({length:s.curva?65:2},(_,i)=>{
  const t=i/(s.curva?64:1);if(!s.curva)return s.a.map((x,k)=>x+(s.b[k]-x)*t);
  const v=s.u,n=s.n,ang=s.ang*t,c=Math.cos(ang),si=Math.sin(ang),cr=[n[1]*v[2]-n[2]*v[1],n[2]*v[0]-n[0]*v[2],n[0]*v[1]-n[1]*v[0]];
  return s.c.map((x,k)=>x+v[k]*c+cr[k]*si);
 });
 for(const p of [ancho,frente])for(const s of p.segmentos)nube.push({puntos:muestrear(s),arco:s.curva});
 for(const e of es.filter(e=>e.t==='LINE')){
  const ps=vertices(e);if(ps.length===2&&ps.every(p=>p[0]>=ancho.caja[0][0]-1e-7&&p[0]<=frente.caja[0][0]+1e-7&&p[1]>=ancho.caja[1][0]-1e-7&&p[1]<=ancho.caja[1][1]+1e-7&&p[2]>=-.001&&p[2]<.8)&&Math.abs(ps[0][0]-ps[1][0])>.1)nube.push({puntos:ps,auxiliar:true});
 }
 const {createCanvas}=canvasLocal();
 for(const [nombre,proyectar] of [['isometrica',([x,y,z])=>[x*.8+y*.7,z+x*.2-y*.25]],['perfil',([,y,z])=>[y,z]]]){
  const c=createCanvas(1700,950),ctx=c.getContext('2d');ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,1700,950);
  const lineas=nube.map(l=>({...l,puntos:l.puntos.map(p=>proyectar(p.map((x,k)=>x-origen[k])))}));
  const ps=lineas.flatMap(l=>l.puntos),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys),x1=Math.max(...xs),y1=Math.max(...ys),escala=Math.min(1500/(x1-x0),650/(y1-y0));
  const T=([x,y])=>[80+(x-x0)*escala,820-(y-y0)*escala];
  for(const l of lineas){ctx.strokeStyle=l.auxiliar?'#b6bbc0':l.arco?'#c0392b':'#134b67';ctx.lineWidth=l.auxiliar?1:4;ctx.beginPath();l.puntos.forEach((p,i)=>i?ctx.lineTo(...T(p)):ctx.moveTo(...T(p)));ctx.stroke();}
  ctx.fillStyle='#16384d';ctx.font='bold 30px sans-serif';ctx.fillText('AR2605319 · levantamiento original · '+nombre,60,55);
  ctx.font='23px sans-serif';ctx.fillText('Cuerpo: ancho 161 · lateral 67 · aguas 10 · cima 77 · radio exterior 9,5 cm',60,100);
  ctx.fillText('Frente: ancho 55 · lateral 57 · aguas 10 · cima 67 · radio exterior 9,5 cm',60,137);
  ctx.fillText('Rojo: arcos reales del CAD. Gris: generatrices originales. Sin sustituir los arcos por sus cuerdas.',60,910);
  fs.writeFileSync(path.join(dir,`AR2605319-3d-${nombre}.png`),c.toBuffer('image/png'));
 }
}
function dibujarVentana(perfiles,es){
 const frente=perfiles.find(p=>p.id==='10EF2'),perfil=frente.puntos.map(p=>[(p[1]-frente.caja[1][0])*1000,p[2]*1000]);
 const esq=vertices(es.find(e=>e.id==='EC11'))[0],rect=id=>vertices(es.find(e=>e.id===id)).map(p=>[(p[1]-esq[1])*1000,(esq[0]-p[0])*1000]);
 const ventana=rect('EC13'),tapa=rect('EC14'),{createCanvas}=canvasLocal(),c=createCanvas(1350,950),ctx=c.getContext('2d');
 ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,1350,950);ctx.fillStyle='#16384d';ctx.font='bold 29px sans-serif';ctx.fillText('AR2605319 · frente orientado como en el levantamiento',45,50);
 ctx.font='22px sans-serif';ctx.fillText('Sección 10EF2: ancho 55, alto lateral 57 + aguas 10. Hueco EC13 y tapa EC14.',45,90);
 const pintar=(ps,tx,color)=>{ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ps.forEach(([x,y],i)=>i?ctx.lineTo(tx+x,820-y):ctx.moveTo(tx+x,820-y));ctx.closePath();ctx.stroke();};
 pintar(perfil,60,'#134b67');pintar(ventana,60,'#c0392b');
 ctx.fillStyle='#16384d';ctx.fillText('Frente: 55 ancho × 67 alto total',60,870);ctx.fillText('Ventana: 35 ancho × 45 alto',60,905);
 pintar(tapa.map(([x,y])=>[x-85,y-65]),800,'#134b67');
 ctx.fillText('Tapa: 38 ancho × 48 alto',780,870);ctx.fillText('En el plano girado: 48 × 38',780,905);
 ctx.fillText('Ventana a 8 cm del bajo;',720,140);ctx.fillText('borde superior a 53 cm.',720,170);
 ctx.fillText('La regla actual (5 bajo tangencia)',720,225);ctx.fillText('no reproduce esta posición.',720,255);
 fs.writeFileSync(path.join(dir,'AR2605319-ventana-orientada.png'),c.toBuffer('image/png'));
}
fs.writeFileSync(path.join(dir,'recorridos.json'),JSON.stringify(informe,null,2));
const fmt=n=>n.toLocaleString('es-ES',{maximumFractionDigits:4});
const filas=informe.flatMap(c=>c.perfiles.map(p=>`| ${c.id} | ${p.id} | ${fmt(p.anchoMm/10)} | ${fmt(p.altoLateralMm/10)} + ${fmt(p.aguasMm/10)} | ${fmt(p.lateralesMm)} + ${fmt(p.aguasRectasMm)} + ${fmt(p.arcosMm)} | ${fmt(p.recorrido3dMm)} | ${fmt(p.errorMm)} |`));
fs.writeFileSync(path.join(dir,'RECORRIDOS.md'),'# Recorrido real de las secciones 3D\n\nRectas por distancia euclídea espacial; arcos por radio × barrido en radianes.\n\n| Pedido | Entidad | Ancho cm | Lateral + aguas cm | Laterales + aguas + arcos mm | Total mm | Diferencia con fórmula mm |\n|---|---|---|---|---|---|---|\n'+filas.join('\n')+'\n');
const antes5319=calcularMedidasCal({...MEDIDAS_CAL_5319,alto:57,aguasFrente:0,margenBajo:3.5,divisionesCurva:5}).desarrolloCuerpo.corte/10;
const nuevo5319=calcularMedidasCal(MEDIDAS_CAL_5319).desarrolloCuerpo,gemelo=calcularMedidasCal(MEDIDAS_CAL_GEMELO).desarrolloCuerpo;
const cuerpo1847=informe.find(c=>c.id==='AR2601847').perfiles.find(p=>p.id==='110F1');
const comparacion=[
 {id:'AR2605319',antesCm:antes5319,despuesCm:nuevo5319.corte/10,cadCm:297.5,recorrido3dCm:nuevo5319.total/10,holguraCm:nuevo5319.holgura/10,bajosCm:nuevo5319.bastillas/10},
 {id:'AR2506052',antesCm:gemelo.corte/10,despuesCm:gemelo.corte/10,cadCm:333.69,recorrido3dCm:gemelo.total/10,holguraCm:gemelo.holgura/10,bajosCm:gemelo.bastillas/10},
 {id:'AR2601847',antesCm:(CORTE_ESTANDAR.cuerpo.x1-CORTE_ESTANDAR.cuerpo.x0)/10,despuesCm:(CORTE_ESTANDAR.cuerpo.x1-CORTE_ESTANDAR.cuerpo.x0)/10,cadCm:282.5,recorrido3dCm:cuerpo1847.recorrido3dMm/10,holguraCm:1.5,bajosCm:7,formulaDesde3dCm:cuerpo1847.recorrido3dMm/10+8.5,nota:'Conserva su corte de plantilla; el 3D deja una diferencia de confección de 1,681 mm.'},
];
fs.writeFileSync(path.join(dir,'antes-despues.json'),JSON.stringify(comparacion,null,2));
fs.writeFileSync(path.join(dir,'ANTES-DESPUES.md'),'# Paño del cuerpo: antes / después\n\nFórmula: 2(H−t) + 2(√((W/2)²+A²)−t) + 2Rθ + holgura + 2b.\nθ = π/2 − atan2(A,W/2); t = R tan(θ/2). Altos hasta el cruce teórico.\n\n| Pedido | Antes cm | Después cm | CAD cm | Recorrido 3D cm | Holgura cm | Dos bajos cm |\n|---|---|---|---|---|---|---|\n'+comparacion.map(c=>`| ${c.id} | ${fmt(c.antesCm)} | ${fmt(c.despuesCm)} | ${fmt(c.cadCm)} | ${fmt(c.recorrido3dCm)} | ${fmt(c.holguraCm)} | ${fmt(c.bajosCm)} |`).join('\n')+'\n\n5319: se conserva el resultado exacto 297,6628, con 1,628 mm respecto al CAD; aceptación expresa del coordinador el 04/11. No hay redondeo a 0,5 cm. El 1847 conserva su plantilla de 282,5; su fórmula desde el perfil 3D da 282,3319, diferencia observada de confección que no se convierte en una constante.\n');
console.log(informe.map(c=>`${c.id}: ${c.perfiles.length} perfiles; error máximo ${fmt(Math.max(...c.perfiles.map(p=>p.errorMm)))} mm`).join('\n'));
