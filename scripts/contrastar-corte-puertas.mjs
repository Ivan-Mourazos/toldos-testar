// Solo copias locales: extrae los textos reales y compara las piezas medidas por los scripts del estudio.
// Uso: node scripts/contrastar-corte-puertas.mjs <carpeta del estudio puertas>
// Las salidas se limitan a tmp/ui-audit/puertas-fase3/.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { leerDxf, caja } from './lib/leer-dxf.mjs';
import { buscarPuerta } from './extraer-textos-planos-puertas.mjs';
import { nuevaPuerta, calcularPuerta } from '../src/puertas/calcular.ts';
import { generarCortePuertas } from '../src/puertas/corte.ts';

export function muestrasCorte() {
  return [
    {codigo:'AR2604638',of:'0232309',frente:172,alto:314,T:123,D:60,margen:6,color:'BLANCO 9016',alturas:[60,131,191]},
    {codigo:'AR2604725',of:'0232504',frente:474,alto:430,T:239,D:60,margen:11,color:'GRIS 7038',alturas:[60,131,191,241],sacoPartido:true},
    {codigo:'AR2605134',of:'0233175',frente:212,alto:360,T:169,D:60,margen:6,color:'AZUL 5002',alturas:[60,131,191],cantidad:3},
    {codigo:'AR2605065',of:'0233051',frente:214,alto:400,T:209,D:60,margen:8,color:'AZUL 5002',alturas:[60,131,191,241],ventanales:[{D:71,margen:8}]},
    {codigo:'AR2605038',of:'0233003',frente:321,alto:370,T:179,D:60,margen:8,color:'AZUL 5002',alturas:[60,131,191,241],ventanales:[{D:71,margen:8}]},
  ].map(f=>({codigo:f.codigo,input:{...nuevaPuerta('PUERTAENR'),frente:f.frente,alto:f.alto,of:f.of,
    rollo:300,rolloSaco:300,rolloCristal:140,color:f.color,cantidad:f.cantidad??1,confirmada:true,ventanasConfirmadas:true,
    enrollable:{T:f.T,D:f.D,margen:f.margen,empates:[],sacoPartido:f.sacoPartido,ventanales:f.ventanales},
    entradas:f.alturas.map(altura=>({altura,largo:f.frente,alto:8,diametro:30,huecos:[]}))}}));
}
export const pedidoMuestra = m => ({schemaVersion:1,kind:'puertas',orderCode:m.codigo,elementos:[{id:'puerta-1',input:m.input}]});
const escapar = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function pintarEntidades(es) {
  const ps=es.flatMap(e=>e.tipo==='LINE'?[[e.x1,e.y1],[e.x2,e.y2]]:e.tipo==='LWPOLYLINE'?e.puntos:e.x===undefined?[]:[[e.x,e.y]]).filter(p=>p.every(Number.isFinite));
  const x0=Math.min(...ps.map(p=>p[0])),x1=Math.max(...ps.map(p=>p[0])),y0=Math.min(...ps.map(p=>p[1])),y1=Math.max(...ps.map(p=>p[1]));
  const contenido=es.map(e=>{
    const color=e.capa.toUpperCase()==='ROTULADOR'?'#af6300':e.capa.toUpperCase()==='CUTTER'?'#008466':'#243746';
    const estilo=`fill="none" stroke="${color}" stroke-width="1" vector-effect="non-scaling-stroke"`;
    if(e.tipo==='LINE')return `<line x1="${e.x1}" y1="${-e.y1}" x2="${e.x2}" y2="${-e.y2}" ${estilo}/>`;
    if(e.tipo==='LWPOLYLINE')return `<${e.cerrada?'polygon':'polyline'} points="${e.puntos.map(([x,y])=>`${x},${-y}`).join(' ')}" ${estilo}/>`;
    if(e.tipo==='TEXT'||e.tipo==='MTEXT')return `<text x="${e.x}" y="${-e.y}" font-size="${e.h}" fill="${color}" font-family="Arial" ${e.centrado?'text-anchor="middle" dominant-baseline="central"':''} transform="rotate(${-e.giro||0} ${e.x} ${-e.y})">${escapar(e.valor)}</text>`;
    if(e.tipo==='ARC'){const a=e.desde*Math.PI/180,b=e.hasta*Math.PI/180;return `<path d="M${e.x+e.r*Math.cos(a)},${-e.y-e.r*Math.sin(a)} A${e.r},${e.r} 0 0 0 ${e.x+e.r*Math.cos(b)},${-e.y-e.r*Math.sin(b)}" ${estilo}/>`;}
    return '';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0-100} ${-y1-100} ${x1-x0+200} ${y1-y0+200}" style="width:100%;height:1100px;background:#f4f6f8">${contenido}</svg>`;
}
export function entidadesWeb(c) {
  return [...c.lineas.map(e=>({...e,tipo:'LINE'})),...c.textos.map(e=>({...e,tipo:'TEXT'})),...c.arcos.map(e=>({...e,tipo:'ARC'}))];
}

/** Los tramos rectos no dan el alto total del cristal: se incluyen sus arcos CUTTER. */
function contornosConCurvas(entidades) {
  const es=entidades.filter(e=>['LINE','ARC'].includes(e.tipo)&&['CUTTER','DISCO1'].includes(e.capa));
  const padre=es.map((_,i)=>i),nodos=new Map();
  const raiz=i=>padre[i]===i?i:(padre[i]=raiz(padre[i]));
  const extremos=e=>e.tipo==='LINE'?[[e.x1,e.y1],[e.x2,e.y2]]:[e.desde,e.hasta].map(a=>[e.x+e.r*Math.cos(a*Math.PI/180),e.y+e.r*Math.sin(a*Math.PI/180)]);
  es.forEach((e,i)=>{for(const p of extremos(e)){const k=p.map(n=>Math.round(n*100)).join(',');if(nodos.has(k))padre[raiz(i)]=raiz(nodos.get(k));else nodos.set(k,i);}});
  const grupos=new Map();es.forEach((e,i)=>{const k=raiz(i);grupos.set(k,[...grupos.get(k)??[],e]);});
  return [...grupos.values()].filter(g=>g.filter(e=>e.tipo==='ARC'&&Math.abs(e.r-40)<.01).length===4).map(g=>{
    const b=caja(g.flatMap(extremos));return {ancho:(b.x1-b.x0)/10,alto:(b.y1-b.y0)/10,radio:4};
  });
}

function rectangulosMedidos(es,ancho,alto) {
  const cerca=(a,b)=>Math.abs(a-b)<.02;
  const ls=es.filter(e=>e.tipo==='LINE'&&e.capa==='DISCO1');
  const hs=ls.filter(e=>cerca(e.y1,e.y2)&&Math.abs(e.x1-e.x2)>.02),vs=ls.filter(e=>cerca(e.x1,e.x2)&&Math.abs(e.y1-e.y2)>.02);
  const cajas=[];
  for(const [w,h] of [[ancho*10,alto*10],[alto*10,ancho*10]])for(const x of new Set(vs.map(e=>e.x1)))for(const y of new Set(hs.map(e=>e.y1))) {
    const vertical=a=>vs.some(e=>cerca(e.x1,a)&&Math.min(e.y1,e.y2)<=y+.02&&Math.max(e.y1,e.y2)>=y+h-.02);
    const horizontal=b=>hs.some(e=>cerca(e.y1,b)&&Math.min(e.x1,e.x2)<=x+.02&&Math.max(e.x1,e.x2)>=x+w-.02);
    if(vertical(x)&&vertical(x+w)&&horizontal(y)&&horizontal(y+h))cajas.push({x,y,w:w/10,h:h/10});
  }
  return [...new Map(cajas.map(b=>[[b.x,b.y,b.w,b.h].map(n=>n.toFixed(2)).join(','),b])).values()];
}

function contrasteAutorreparable(estudio) {
  const plano='genericas/planos/AR2604526.dxf',bot='genericas/bot/AR2604526.dxf';
  const es=leerDxf(path.join(estudio,plano)).entidades,p=buscarPuerta(es,300,331);
  if(!p)throw new Error('No se encuentra el alzado de la autorreparable de 300 × 331.');
  const red=n=>Math.round(n*10000)/10000;
  const ventanas=es.filter(e=>e.tipo==='LWPOLYLINE'&&e.capa==='curv').map(e=>caja(e.puntos))
    .map(b=>({x:red((b.x0-p.x0)*p.escala),y:red((b.y0-p.y0)*p.escala),ancho:red((b.x1-b.x0)*p.escala),alto:red((b.y1-b.y0)*p.escala),radio:2,radioCristal:4}))
    .filter(b=>b.x>=0&&b.x+b.ancho<=300&&b.y>=0&&b.y+b.alto<=331).sort((a,b)=>a.x-b.x);
  const input={...nuevaPuerta('PUERTAUTO'),frente:300,alto:331,of:'0232191',color:'GRIS 7037',rollo:300,rolloSaco:300,rolloCristal:140,confirmada:true,ventanasConfirmadas:true,ventanas};
  const cristal=calcularPuerta(input).piezas.find(p=>p.clase==='cristal');
  const curvasBot=contornosConCurvas(leerDxf(path.join(estudio,bot)).entidades);
  if(ventanas.length!==2||!curvasBot.some(c=>Math.abs(c.ancho-cristal.ancho)<.01&&Math.abs(c.alto-cristal.alto)<.01))throw new Error('No coinciden las ventanas del alzado y el cristal completo del bot de AR2604526.');
  return {pedido:'AR2604526',of:input.of,plano,bot,ventanas,cristalesBot:curvasBot.map(c=>({ancho:red(c.ancho),alto:red(c.alto),radio:c.radio})),cristalWeb:{ancho:cristal.ancho,alto:cristal.alto,cantidad:2}};
}

export function contrastarCorte(estudio) {
  const destino=path.resolve('tmp/ui-audit/puertas-fase3');fs.mkdirSync(destino,{recursive:true});
  const extraccion=JSON.parse(fs.readFileSync(path.join(estudio,'genericas/extraccion.json'),'utf8'));
  const configuraciones=JSON.parse(fs.readFileSync(path.join(estudio,'plegables/configuraciones/configuraciones.json'),'utf8')).configuraciones;
  const filas=[],textos=[];
  for(const m of muestrasCorte()) {
    const pedido=pedidoMuestra(m),r=calcularPuerta(m.input),corte=generarCortePuertas(pedido);
    const generica=extraccion.find(x=>x.pedido===m.codigo)?.lecturasBot[0];
    const config=configuraciones.find(x=>x.pedido===m.codigo);
    const alternativo=path.join(estudio,'plegables/configuraciones/bot',`${m.codigo}.dxf`);
    const real=generica?{...generica,archivo:`genericas/${generica.archivo}`}:
      fs.existsSync(alternativo)?{archivo:`plegables/configuraciones/bot/${m.codigo}.dxf`,rectangulos:[...config?.paños??[],...config?.cristales?.flatMap(c=>c.piezasVerificadas)??[]]}:null;
    const archivo=real?path.join(estudio,real.archivo):null;
    const es=archivo?leerDxf(archivo).entidades:[];
    textos.push({pedido:m.codigo,fuente:real?.archivo??'PDF: sin corte manual previo',textos:es.filter(e=>['TEXT','MTEXT'].includes(e.tipo)&&!(e.x<500&&e.y<600)).map(({capa,x,y,h,giro,valor})=>({capa,x,y,h,giro,valor}))});
    for(const p of r.piezas.filter(p=>['pano','cristal','cacho'].includes(p.clase))) {
      let medidas=real?.rectangulos.filter(b=>(Math.abs(b.w-p.ancho)<.02&&Math.abs(b.h-p.alto)<.02)||(Math.abs(b.h-p.ancho)<.02&&Math.abs(b.w-p.alto)<.02))??[];
      if(real&&!medidas.length)medidas=rectangulosMedidos(es,p.ancho,p.alto);
      filas.push({pedido:m.codigo,fuente:real?.archivo??'PDF: sin corte manual previo',pieza:p.nombre,ancho:p.ancho,alto:p.alto,cantidad:p.cantidad,coincidencias:medidas.length,estado:real?(medidas.length?'coincide':'revisar'):'regla del PDF'});
    }
    fs.writeFileSync(path.join(destino,`${m.codigo}-pedido.json`),JSON.stringify(pedido,null,2));
    if(corte.archivo)fs.writeFileSync(path.join(destino,`${m.codigo}-web.dxf`),corte.archivo.dxf,'latin1');
    if(archivo) {
      const manual=es.filter(e=>['texto','DISCO1','CUTTER','ROTULADOR'].includes(e.capa)&&!(e.x<500&&e.y<600));
      const web=leerDxf(path.join(destino,`${m.codigo}-web.dxf`)).entidades.filter(e=>!(e.x<500&&e.y<600));
      fs.writeFileSync(path.join(destino,`${m.codigo}-comparacion.html`),`<!doctype html><meta charset="utf-8"><style>body{font-family:Arial;margin:20px}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}h2{font-size:18px}</style><h1>${m.codigo}: comparación de corte</h1><p>Disposición distinta; se comparan piezas y marcas, sin reproducir aprovechamientos de stock ajeno.</p><main><section><h2>DXF manual · ${escapar(real.archivo)}</h2>${pintarEntidades(manual)}</section><section><h2>Web · ${m.input.of}</h2>${pintarEntidades(web)}</section></main>`);
    }
  }
  const autorreparable=contrasteAutorreparable(estudio),numero=n=>n.toLocaleString('es-ES',{maximumFractionDigits:4});
  fs.writeFileSync(path.join(destino,'contraste.json'),JSON.stringify({filas,textos,autorreparable},null,2));
  const tabla=['| Pedido | Fichero real | Pieza | Corte (cm) | Cantidad web | Cajas reales coincidentes | Estado |','|---|---|---|---|---|---|---|',...filas.map(f=>`| ${f.pedido} | ${f.fuente} | ${f.pieza} | ${numero(f.ancho)} × ${numero(f.alto)} | ${f.cantidad} | ${f.coincidencias} | ${f.estado} |`),
    `| AR2604526 / OF 0232191 | ${autorreparable.plano} y ${autorreparable.bot} | Dos huecos y cristal con curvas | Huecos 113 × 40; cristal 117 × 44 | 2 | 1 dibujo de cristal, X2 | coincide |`];
  fs.writeFileSync(path.join(destino,'contraste.md'),tabla.join('\n')+'\n');
  console.log(JSON.stringify({destino,filas:filas.length,revisar:filas.filter(f=>f.estado==='revisar'),rotulos:textos.map(t=>({pedido:t.pedido,altos:[...new Set(t.textos.filter(t=>/^(?:[A-Z]\d|REVÉS)$/.test(t.valor)&&t.capa.toLowerCase()==='texto').map(t=>Math.round(t.h)))],minis:t.textos.filter(t=>t.capa==='ROTULADOR'&&/^[A-Z]?\d+$/.test(t.valor)).length}))}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  if(!process.argv[2])throw new Error('Indica la carpeta local del estudio de puertas.');
  contrastarCorte(path.resolve(process.argv[2]));
}
