// Contraste reproducible, sin escribir originales: node scripts/contrastar-capas-santapau.mjs antes|despues
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { leerPlanoDxf, enZona, transformarPrimitiva, proyectarPagina, svgPrimitivas } from './lib/plano-dxf.mjs';
import { valor } from '../src/domain/corteLona/dxfTestHelpers.js';
import { generarCortePuertas } from '../src/puertas/corte.ts';
import { pedidosSantaPau } from '../src/puertas/__fixtures__/santapau.ts';
const fase=process.argv[2]??'despues';
const codigo=process.argv[3]??'4815',pedido=`AR260${codigo}`;
if(!['4815','5363'].includes(codigo))throw new Error('Pedido no preparado');
if(!['antes','despues'].includes(fase))throw new Error('Usa antes o despues');
const raiz=path.resolve('tmp/santapau/capas'),dir=path.join(raiz,pedido,fase);await fs.mkdir(dir,{recursive:true});
const fuentes={ivan:leerPlanoDxf(`tmp/santapau/dxf/${pedido}.dxf`),web:leerPlanoDxf(`tmp/santapau/salida/${pedido}-plano.dxf`)};
const nuevo=fuentes.web.modelo.some(p=>p.tipo==='arco'&&p.capa==='texto');
const scopes=codigo==='4815'?{ivan:{A:[230.922112930609,4.036474216380333,281.5,400],B:[231.512112930609,-4.633900199184072,163.5,350]},web:{A:[100,96,281.5,400],B:[100,nuevo?90.3:90.5,163.5,350]}}:{ivan:{A:[231.344612930609,4.036474216380333,197,340],B:[231.249612930609,-3.02413352166302,216,340]},web:{A:[100,96.6,197,340],B:[100,nuevo?91:91.2,216,340]}};
const alias=c=>['DISCO1','cortes - lona','corte'].includes(c)?'corte':c==='ROTULADOR'?'marca':c;
const n=v=>Math.round(v*100)/100,pt=p=>p.map(n),normal=s=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
function clave(p){
 const c=alias(p.capa);
 if(p.tipo==='raya')return JSON.stringify([c,'raya',...[pt(p.a),pt(p.b)].sort(),n(p.curva??0)]);
 if(p.tipo==='texto')return JSON.stringify([c,'texto',normal(p.valor)]);
 if(p.tipo==='cota')return JSON.stringify([c,'cota',n(p.medida),...[pt(p.a),pt(p.b)].sort()]);
 if(p.tipo==='bloque')return JSON.stringify([c,'bloque',p.nombre,pt(p.punto),n(p.giro)]);
 if(p.tipo==='arco')return JSON.stringify([c,'arco',pt(p.punto),n(p.r),n(p.desde),n(p.hasta)]);
 return JSON.stringify([c,p.tipo,p.patron,p.puntos?.map(pt)]);
}
function contar(ps){const d={};for(const p of ps){const k=`${p.capa} / ${p.tipo}`;d[k]=(d[k]??0)+1;}return d;}
const out={fase,criterio:'Cm desde la esquina inferior izquierda terminada; emparejado de segmentos sin sentido, cotas por valor Y anclas, textos por contenido normalizado; posiciones, alturas y anclas de texto se conservan en el inventario. Se listan duplicados y capas no imprimibles, sin tratarlos como piezas que falten.',puertas:{},corte:{},papel:{}};
out.fuentes=Object.fromEntries(Object.entries(fuentes).map(([f,d])=>[f,{sha256:createHash('sha256').update(d.src).digest('hex')}]));
function cubreLinea(p,qs){
 const dx=p.b[0]-p.a[0],dy=p.b[1]-p.a[1],ll=dx*dx+dy*dy,len=Math.sqrt(ll);
 if(!len)return true;
 const ts=qs.filter(q=>q.tipo==='raya'&&q.capa===p.capa&&Math.abs((q.a[0]-p.a[0])*dy-(q.a[1]-p.a[1])*dx)/len<.015&&Math.abs((q.b[0]-p.a[0])*dy-(q.b[1]-p.a[1])*dx)/len<.015).map(q=>[q.a,q.b].map(r=>((r[0]-p.a[0])*dx+(r[1]-p.a[1])*dy)/ll).sort((a,b)=>a-b)).sort((a,b)=>a[0]-b[0]);
 let hasta=0;for(const [u,v]of ts){if(v<0)continue;if(u>hasta+.015/len)break;hasta=Math.max(hasta,v);}return hasta>=1-.015/len;
}
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1600,height:1160}});
async function pareja(nombre,a,b,zona,titulo=nombre){
 const svg=(ps,prefijo)=>svgPrimitivas(ps,{zona,ancho:780,alto:1100,trazo:.18}).replace(/id="/g,`id="${prefijo}`).replace(/url\(#/g,`url(#${prefijo}`);
 await page.setContent(`<body style="margin:0;background:white;font:18px Arial"><h3 style="margin:8px">${titulo} · Iván a la izquierda / web a la derecha · ${fase}</h3><div style="display:flex;gap:12px">${svg(a,'ivan-')}${svg(b,'web-')}</div></body>`);
 await page.screenshot({path:path.join(dir,`${nombre}.png`)});
}
try{
 for(const letra of ['A','B']){
  const grupos={},dibujos={};
  for(const [f,d]of Object.entries(fuentes)){
   const [x,y,F,H]=scopes[f][letra],zona={x0:x-.85,x1:x+F/100+1,y0:y-1.2,y1:y+H/100+.45};
   grupos[f]=d.modelo.filter(p=>!p.deCota&&enZona(p,zona)).map(p=>({...transformarPrimitiva(p,(a,b)=>[(a-x)*100,(b-y)*100],100),imprimible:d.imprime(p)}));
   dibujos[f]=d.modelo.filter(p=>d.imprime(p)&&enZona(p,zona)).map(p=>transformarPrimitiva(p,(a,b)=>[(a-x)*100,(b-y)*100],100));
  }
  const [,,F,H]=scopes.ivan[letra],zona={x0:-85,x1:F+100,y0:-120,y1:H+45};
  const visibles=f=>grupos[f].filter(p=>p.imprimible);
  const a=new Map(visibles('ivan').map(p=>[clave(p),p])),b=new Map(visibles('web').map(p=>[clave(p),p]));
  out.puertas[letra]={conteos:{ivan:contar(grupos.ivan),web:contar(grupos.web)},ivan:grupos.ivan,web:grupos.web,exactas:[...a.keys()].filter(k=>b.has(k)).length,faltaGeometriaExacta:[...a].filter(([k])=>!b.has(k)).map(([,p])=>p),sobraGeometriaExacta:[...b].filter(([k])=>!a.has(k)).map(([,p])=>p)};
  await pareja(`${letra}-conjunto`,dibujos.ivan,dibujos.web,zona);
  for(const capa of [...new Set([...grupos.ivan,...grupos.web].map(p=>alias(p.capa)))])await pareja(`${letra}-${capa.replace(/[^\w-]/g,'_')}`,dibujos.ivan.filter(p=>alias(p.capa)===capa),dibujos.web.filter(p=>alias(p.capa)===capa),zona,`${letra} · capa ${capa}`);
  for(const [nombre,y0,y1]of [['et-superior',195,235],['mirilla',110,205],['bajo',-110,40]])await pareja(`${letra}-${nombre}`,dibujos.ivan.filter(p=>enZona(p,{...zona,y0,y1})),dibujos.web.filter(p=>enZona(p,{...zona,y0,y1})),{...zona,y0,y1});
 }
 for(const [f,d]of Object.entries(fuentes)){
  out.papel[f]={entidades:d.papel,capas:[...d.capas],ventanas:d.ventanas};
  const zv=d.ventanas.find(v=>v.id===3).zona;
  const ps=d.modelo.filter(p=>!p.deCota&&enZona(p,zv));
  out.corte[f]={conteos:contar(ps),entidades:ps};
  out[f+'Raw']=d.entidades.map(r=>({tipo:r.tipo,capa:valor(r,8),handle:valor(r,5),pares:r.pares}));
 }
 const papel=proyectarPagina;
 await pareja('presentacion',papel(fuentes.ivan),papel(fuentes.web),{x0:0,x1:297,y0:0,y1:210});
 if(codigo==='5363'&&fase==='despues'){
  const ivan=fuentes.ivan,cota=ivan.modelo.find(p=>p.tipo==='cota'&&Math.abs(p.medida-295.5)<.01),[mx,my]=cota.b;
  const corte=generarCortePuertas(pedidosSantaPau()[1]).cortes.find(c=>c.colocadas.some(t=>t.pieza.clase==='pano'));
  const medida={x0:mx-.001,y0:my-.001,x1:mx+6.641,y1:my+2.961};
  const a=ivan.modelo.filter(p=>!p.deCota&&ivan.imprime(p)&&enZona(p,medida)).map(p=>({...transformarPrimitiva(p,(x,y)=>[(x-mx)*100,(y-my)*100],100),capa:alias(p.capa)==='corte'?'DISCO1':p.capa==='marca'?'ROTULADOR':p.capa}));
  const b=[...corte.entidades.lineas.map(l=>({tipo:'raya',capa:l.capa,color:l.capa==='ROTULADOR'?1:7,a:[l.x1/10,l.y1/10],b:[l.x2/10,l.y2/10]})),...corte.entidades.textos.map(t=>({tipo:'texto',capa:t.capa,color:106,valor:t.valor,punto:[t.x/10,t.y/10],h:t.h/10,ancho:0,giro:t.giro??0,ancla:t.centrado?5:7})),...corte.entidades.circulos.map(c=>({tipo:'arco',capa:c.capa,color:1,punto:[c.x/10,c.y/10],r:c.r/10,desde:0,hasta:360}))];
  out.corte.normalizado={ivan:a,web:b,origenIvan:[mx,my],largoWebCm:corte.largo/10,piezas:corte.colocadas.map(t=>({nombre:t.pieza.nombre,of:t.pieza.of,x:t.x/10,y:t.y/10,ancho:t.pieza.ancho,alto:t.pieza.alto,girada:t.girada}))};
  const maquina=ps=>ps.filter(p=>p.tipo==='raya'&&['DISCO1','CUTTER','ROTULADOR'].includes(p.capa));
  out.corte.normalizado.falta=maquina(a).filter(p=>!cubreLinea(p,b));out.corte.normalizado.sobra=maquina(b).filter(p=>!cubreLinea(p,a));
  out.corte.normalizado.toleranciaCm=.015;
  const z={x0:-40,x1:705,y0:-30,y1:340};
  await pareja('corte-normalizado',a,b,z);
  for(const c of ['DISCO1','CUTTER','ROTULADOR','texto'])await pareja(`corte-${c}`,a.filter(p=>p.capa===c),b.filter(p=>p.capa===c),z);
  for(const [letra,x0,x1]of [['A-copia-1',0,197],['A-copia-2',197,394],['B',394,610]])await pareja(`corte-${letra}`,a.filter(p=>enZona(p,{...z,x0,x1})),b.filter(p=>enZona(p,{...z,x0,x1})),{...z,x0:x0-5,x1:x1+5});
 }
 const detalle=fuentes.ivan.ventanas.find(v=>v.id===4).zona;
 const ad=fuentes.ivan.modelo.filter(p=>enZona(p,detalle)),[,yA,F]=scopes.web.A,dx=100+(F+105)/100,dy=yA+1.1;
 const bd=fuentes.web.modelo.filter(p=>enZona(p,{x0:dx+.05,x1:dx+1.5,y0:dy,y1:dy+1.95}));
 await pareja('detalle-et',ad.map(p=>transformarPrimitiva(p,(x,y)=>[(x-227)*100,(y-5.2)*100],100)),bd.map(p=>transformarPrimitiva(p,(x,y)=>[(x-dx)*100,(y-dy)*100],100)),{x0:-20,x1:150,y0:0,y1:195});
 await fs.writeFile(path.join(dir,'entidades.json'),JSON.stringify(out,null,2));
 const lineas=['# Comparación automática de entidades · 4815 · '+fase,'','Las diferencias geométricas exactas incluyen colocación del faldón y rótulos; requieren interpretación del expediente. No equivalen por sí solas a una omisión de fabricación.','','| Puerta | Capa / tipo | Iván (bruto) | Web (bruto) |','|---|---|---:|---:|'];
 lineas[0]=`# Comparación automática de entidades · ${codigo} · ${fase}`;
 if(out.corte.normalizado)lineas.push('',`Corte normalizado: faltan ${out.corte.normalizado.falta.length} segmentos y sobran ${out.corte.normalizado.sobra.length}; tolerancia0,15 mm. Listas completas en entidades.json.`,'');
 for(const [letra,p]of Object.entries(out.puertas))for(const k of [...new Set([...Object.keys(p.conteos.ivan),...Object.keys(p.conteos.web)])].sort())lineas.push(`| ${letra} | ${k} | ${p.conteos.ivan[k]??0} | ${p.conteos.web[k]??0} |`);
 for(const letra of ['A','B']){const p=out.puertas[letra];lineas.push('',`## ${letra}: diferencias entidad a entidad`,'','| Estado geométrico | Capa | Tipo | Coordenadas / valor |','|---|---|---|---|');for(const [estado,ps]of [['Falta geometría exacta',p.faltaGeometriaExacta],['Sobra geometría exacta',p.sobraGeometriaExacta]])for(const e of ps)lineas.push(`| ${estado} | ${e.capa} | ${e.tipo} | ${JSON.stringify(e).replaceAll('|','/')} |`);}
 await fs.writeFile(path.join(dir,'entidades.md'),lineas.join('\n'));
 await fs.copyFile(`tmp/santapau/salida/${pedido}-plano.dxf`,path.join(dir,'web-plano.dxf'));
 console.log(`${pedido} ${fase}: comparación de ambas puertas, todas las capas, detalle, papel y listas de entidades en ${dir}`);
}finally{await browser.close();}
