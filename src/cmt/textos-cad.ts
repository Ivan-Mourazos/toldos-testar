import {number,value,values} from './dxf.ts';
import {fuenteCad} from './fuentes-cad.ts';
import {anchoArial} from '../domain/corteLona/texto.js';
import type {Fuente} from './fuente.ts';
import type {Dxf,Duda,EntidadDxf,Punto} from './tipos.ts';
interface Formato {alto:number;ancho:number;tracking:number;oblicuo:number;fuente:string;bold:boolean;italic:boolean;base:number}
export interface TrozoCad extends Formato {texto:string;fraccion?:{arriba:string;abajo:string;separador:string}}
interface ParrafoCad {lineas:TrozoCad[][];alineaciones:(number|undefined)[];rayas:boolean;desconocidos:string[]}
const rad=(n:number)=>n*Math.PI/180;
const estilo=(e:EntidadDxf,d:Pick<Dxf,'styles'>)=>d.styles[value(e,7,'Standard')]??{};
/** Controles de TEXT, también válidos dentro de MTEXT. Las rayas no se cortan. */
export function caracteresCad(texto:string):string {
 return texto.replace(/\\U\+([a-f\d]{4})/gi,(_:string,n:string)=>String.fromCharCode(parseInt(n,16)))
  .replace(/%%([cdpuo])/gi,(_:string,c:string)=>({c:'∅',d:'°',p:'±',u:'',o:''})[c.toLowerCase()]!);
}
/** Parser con pila de formatos y párrafos; 3/1 se concatenan antes de interpretar. */
export function interpretarMtext(raw:string,alto:number,initial:Partial<Formato>={}):ParrafoCad {
 let f:Formato={alto,ancho:1,tracking:1,oblicuo:0,fuente:'',bold:false,italic:false,base:0,...initial};
 const stack:Formato[]=[],lineas:TrozoCad[][]=[[]],alineaciones:(number|undefined)[]=[undefined],desconocidos:string[]=[];
 let alignment:number|undefined,rayas=/%%[uo]/i.test(raw);
 const add=(texto:string,fraccion?:TrozoCad['fraccion'])=>{
  const line=lineas.at(-1)!,prev=line.at(-1),next={...f,texto,fraccion};
  if(!fraccion&&prev&&!prev.fraccion&&Object.keys(f).every(k=>prev[k as keyof Formato]===f[k as keyof Formato]))prev.texto+=texto;else line.push(next);
 };
 const newline=()=>{lineas.push([]);alineaciones.push(alignment);};
 const text=caracteresCad(raw);
 for(let i=0;i<text.length;){
  const ch=text[i++];
  if(ch==='{'){stack.push({...f});continue;}
  if(ch==='}'){f=stack.pop()??f;continue;}
  if(ch==='^'&&['J','I'].includes(text[i])){if(text[i++]==='J')newline();else add('    ');continue;}
  if(ch!=='\\'){add(ch);continue;}
  const code=text[i++];
  if(['\\','{','}'].includes(code)){add(code);continue;}
  if(code==='~'){add('\u00a0');continue;}
  if(code==='P'||code==='N'){newline();continue;}
  if('LlOoKk'.includes(code)){rayas=true;continue;}
  const end=text.indexOf(';',i);
  if(end<0){desconocidos.push('\\'+code);continue;}
  const arg=text.slice(i,end);i=end+1;
  if(code==='f'||code==='F'){
   const [name,...options]=arg.split('|');f={...f,fuente:name};
   for(const o of options){if(o[0]==='b')f.bold=o.slice(1)==='1';if(o[0]==='i')f.italic=o.slice(1)==='1';}
  }else if(code==='H'){
   const n=parseFloat(arg);if(n>0)f={...f,alto:arg.endsWith('x')?f.alto*n:n};
  }else if(code==='W'||code==='T'||code==='Q'||code==='A'){
   const n=Number(arg);if(Number.isFinite(n))f={...f,...(code==='W'?{ancho:n}:code==='T'?{tracking:n}:code==='Q'?{oblicuo:n}:{base:n})};
  }else if(code==='p'){
   const q=arg.match(/q([lcr])/i);if(q){alignment={l:0,c:.5,r:1}[q[1].toLowerCase()];alineaciones[alineaciones.length-1]=alignment;}
   if(/(?:^|,)[it]/i.test(arg))desconocidos.push('sangría o tabulador de párrafo');
  }else if(code==='S'){
   const m=arg.match(/^(.*?)([/^#])(.*)$/);if(m)add('',{arriba:m[1].trim(),abajo:m[3].trim(),separador:m[2]});
  }else if(!['C','c'].includes(code))desconocidos.push('\\'+code);
 }
 return {lineas,alineaciones,rayas,desconocidos};
}
/** El último dato 50 o vector 11/21 manda según el orden del registro DXF. */
export function giroMtext(e:EntidadDxf):number {
 let angle=0;
 for(let i=0;i<e.pairs.length;i++){
  const [code,v]=e.pairs[i];if(code===50)angle=Number(v);
  if(code===11){const y=e.pairs.slice(i+1).find(([c])=>c===21)?.[1];if(y!==undefined&&Math.hypot(Number(v),Number(y)))angle=Math.atan2(Number(y),Number(v))*180/Math.PI;}
 }
 return angle;
}
/** TEXT con alineación, escala y reflejos CAD; conserva el tamaño nominal contrastado. */
export function contornosTextCad(e:EntidadDxf,d:Pick<Dxf,'styles'>,base:Fuente,avisos:Duda[]=[]):Punto[][] {
 const st=estilo(e,d),font=fuenteCad(base,e.fuenteCad??st[3]??st[1000]??'',false,false,avisos);
 const h=number(e,40),width=number(e,41,Number(st[41]??1)),oblique=number(e,51,Number(st[50]??0));
 const tracking=e.trackingCad??1,raw=caracteresCad(value(e,1));
 if(/%%[uo]/i.test(value(e,1))&&!avisos.some(a=>/rayas de subrayado/.test(a.motivo)))avisos.push({motivo:'Se han omitido las rayas de subrayado, suprarrayado o tachado de los textos'});
 const paths:Punto[][]=[];let x=0,cadAdvance=0,cadRight=0,cadLeft=0,prev:string|undefined;
 for(const ch of raw){
  if(prev)x+=font.kern(prev,ch)*h;
  const g=font.paths(ch);
  for(const p of g.paths)for(const q of p){cadRight=Math.max(cadRight,cadAdvance+q.x/font.units*h);cadLeft=Math.min(cadLeft,cadAdvance+q.x/font.units*h);}
  for(const p of [...g.paths].reverse())paths.push(p.map(q=>({...q,x:x+q.x/font.units*h,y:q.y/font.units*h})));
  x+=g.advance*h*tracking;cadAdvance+=g.advance*h*tracking;prev=ch;
 }
 const halign=number(e,72),valign=number(e,73),fit=[3,5].includes(halign);
 let bx=number(e,halign||valign?11:10),by=number(e,halign||valign?21:20),angle=number(e,50);
 let sx=width,sy=1,offsetX=0,offsetY=0;
 const cap=Math.max(0,...font.paths('H').paths.flat().map(q=>q.y))/font.units;
 // TEXT justificado usa el avance CAD y el posible voladizo derecho (A/SOLAPA).
 const layoutWidth=Math.max(cadAdvance,cadRight)*width/cap;
 offsetX=halign===1||halign===4?-(layoutWidth+cadLeft*width/cap)/2:halign===2?-layoutWidth:0;
 if(valign===1)offsetY=-font.descenso*h/cap;else if(valign===2||halign===4)offsetY=-h/2;else if(valign===3)offsetY=-h;
 if(fit){
  bx=number(e,10);by=number(e,20);const dx=number(e,11)-bx,dy=number(e,21)-by;
  angle=Math.atan2(dy,dx)*180/Math.PI;const ratio=x?Math.hypot(dx,dy)/(x*width):1;
  sx=width*ratio;if(halign===3)sy=ratio;
 }
 const c=Math.cos(rad(angle)),s=Math.sin(rad(angle)),shear=Math.tan(rad(oblique));
 const flags=number(e,71,Number(st[71]??0)),mx=flags&2?-1:1,my=flags&4?-1:1,normal=number(e,230,1)<0?-1:1;
 // El emisor web ya calcula 10/20 con anchoArial y publica seis decimales.
 // Se reconoce ese cálculo, incluidos los errores máximos de redondeo de ángulo y puntos.
 // Conservar su base evita cambiar los bytes web; un 10/20 ajeno no anula 11/21.
 if([0,1,2].includes(halign)&&[0,2,3].includes(valign)&&(halign||valign)&&width===1&&!oblique&&!flags&&normal===1&&font===base){
  const w=anchoArial(value(e,1),h),dx=-w*halign/2,dy=valign===2?-h/2:valign===3?-h:0;
  const px=bx+dx*c-dy*s,py=by+dx*s+dy*c;
  const tolerancia=1.000001e-6+Math.hypot(dx,dy)*rad(.0000005)+Math.hypot(dx,dy)/h*.0000005;
  if(Math.abs(number(e,10)-px)<=tolerancia&&Math.abs(number(e,20)-py)<=tolerancia){bx=number(e,10);by=number(e,20);offsetX=0;offsetY=0;}
 }
 return paths.map(p=>p.map(q=>{
  const xx=(q.x*sx+q.y*sy*shear)*mx+offsetX,yy=q.y*sy*my+offsetY;
  return {...q,x:normal*(bx+c*xx-s*yy),y:by+s*xx+c*yy};
 }));
}
/** Descompone el cuadro CAD antes de importar TEXT; no recurre al MTEXT de Inkscape. */
export function descomponerMtext(e:EntidadDxf,d:Pick<Dxf,'styles'>&Partial<Pick<Dxf,'sections'>>,base:Fuente,avisos:Duda[]=[]):EntidadDxf[] {
 const st=estilo(e,d),h=number(e,40),width=number(e,41),ancla=number(e,71,1);
 let raw=values(e,3).join('')+value(e,1);
 const dictionary=d.sections?.OBJECTS?.find(o=>value(o,5)===value(e,360));
 if(dictionary){
  const i=dictionary.pairs.findIndex(([c,v])=>c===3&&v==='ACAD_MTEXT_2008_RT');
  const record=d.sections?.OBJECTS?.find(o=>value(o,5)===dictionary.pairs[i+1]?.[1]);
  if(i>=0&&record)raw=values(record,3).join('')+value(record,1,raw);
 }
 const parsed=interpretarMtext(raw.trim(),h,{ancho:Number(st[41]??1),oblicuo:Number(st[50]??0),fuente:st[3]||st[1000]||''});
 if(parsed.rayas&&!avisos.some(a=>/rayas de subrayado/.test(a.motivo)))avisos.push({motivo:'Se han omitido las rayas de subrayado, suprarrayado o tachado de los textos'});
 if(parsed.desconocidos.length&&!avisos.some(a=>/controles de párrafo/.test(a.motivo)))avisos.push({motivo:`Hay controles de párrafo sin contraste CAD: ${[...new Set(parsed.desconocidos)].join(', ')}`});
 const fontFor=(f:TrozoCad)=>fuenteCad(base,f.fuente,f.bold,f.italic,avisos);
 const capFor=(font:Fuente)=>{
  const cap=Math.max(0,...font.paths('H').paths.flat().map(q=>q.y))/font.units;
  if(!(cap>0))throw Error('La fuente no permite medir la altura de mayúsculas para preparar MTEXT');return cap;
 };
 const measure=(runs:TrozoCad[]):{advance:number;left:number;right:number;top:number;bottom:number}=>{
  let advance=0,left=Infinity,right=0,top=h,bottom=0;
  for(const f of runs){
   const font=fontFor(f),scale=f.alto/capFor(font),shx=/\.shx$/i.test(f.fuente);
   if(f.fraccion){
    const n={...f,fraccion:undefined,alto:f.alto*.7},a=measure([{...n,texto:f.fraccion.arriba}]),b=measure([{...n,texto:f.fraccion.abajo}]);
    advance+=Math.max(a.advance,b.advance)+(f.fraccion.separador==='#'?f.alto*.4:0);top=Math.max(top,f.alto*1.35);bottom=Math.min(bottom,-f.alto*.25);continue;
   }
   for(const ch of f.texto){
    // EXPLODE mide los avances sin kerning; los TEXT importados conservan su propio kerning.
    const g=font.paths(ch);
    for(const p of g.paths)for(const q of p){const x=advance+(q.x+q.y*Math.tan(rad(f.oblicuo)))/font.units*scale*f.ancho;left=Math.min(left,shx?advance:x);right=Math.max(right,x);top=Math.max(top,shx?f.alto:q.y/font.units*scale);bottom=Math.min(bottom,shx?0:q.y/font.units*scale);}
    advance+=g.advance*scale*f.ancho*f.tracking;
   }
  }
  return {advance,left:Number.isFinite(left)?Math.max(0,left):0,right,top,bottom};
 };
 const lines:{runs:TrozoCad[];alignment:number;metric:ReturnType<typeof measure>}[]=[];
 for(const [i,runs]of parsed.lineas.entries()){
  let line:TrozoCad[]=[],word:TrozoCad[]=[];
  const pushWord=()=>{
   const next=[...line,...word],last=word.at(-1)??line.at(-1);
   if(width>0&&line.length&&last&&measure(next).advance>width+1e-8){
    lines.push({runs:line,alignment:parsed.alineaciones[i]??(ancla-1)%3/2,metric:measure(line)});
    line=word.map((r,j)=>j===0?{...r,texto:r.texto.replace(/^ +/,'')}:r);
   }else line=next;
   word=[];
  };
  for(const f of runs){
   if(f.fraccion){word.push(f);continue;}
   for(const chunk of f.texto.split(/( +)/).filter(Boolean)){
    if(/^ +$/.test(chunk)){if(word.length)pushWord();word.push({...f,texto:chunk});}else word.push({...f,texto:chunk});
   }
  }
  if(word.length)pushWord();
  const merged:TrozoCad[]=[];
  for(const f of line){const last=merged.at(-1);if(last&&!last.fraccion&&!f.fraccion&&Object.keys(f).every(k=>k==='texto'||last[k as keyof TrozoCad]===f[k as keyof TrozoCad]))last.texto+=f.texto;else merged.push({...f});}
  lines.push({runs:merged,alignment:parsed.alineaciones[i]??(ancla-1)%3/2,metric:measure(merged)});
 }
 // Los párrafos plegados también deben conservar un TEXT por formato, no por palabra.
 for(const line of lines){
  const merged:TrozoCad[]=[];
  for(const f of line.runs){const last=merged.at(-1);if(last&&!last.fraccion&&!f.fraccion&&Object.keys(f).every(k=>k==='texto'||last[k as keyof TrozoCad]===f[k as keyof TrozoCad]))last.texto+=f.texto;else merged.push({...f});}
  line.runs=merged;
 }
 const factor=number(e,44,1),exact=number(e,73,1)===2,step=5*h/3*factor;
 let used=0;
 const positioned=lines.map((line,i)=>{
  const y=i===0?-line.metric.top:exact?-lines[0].metric.top-i*step:-used-line.metric.top;
  // Con factor 1 se conserva literalmente T_i + 2h/3, la regla medida.
  used=exact?-y:used+Math.max(0,line.metric.top+2*h/3+h*5/3*(factor-1));
  return {...line,y};
 });
 const total=positioned.length?Math.max(...positioned.map(l=>-l.y-l.metric.bottom)):0;
 const v=Math.floor((ancla-1)/3)/2,anchor=(ancla-1)%3/2,box=width>0?width:Math.max(0,...lines.map(l=>l.metric.advance));
 const angle=giroMtext(e),c=Math.cos(rad(angle)),s=Math.sin(rad(angle)),out:EntidadDxf[]=[];
 for(const line of positioned){
  let x=-anchor*box+line.alignment*(box-line.metric.right+line.metric.left)-line.metric.left;
  const y=line.y+v*total;
  const emit=(f:TrozoCad,dx:number,dy:number)=>{
   const font=fontFor(f);
   out.push({type:'TEXT',fuenteCad:font===base?'':font.file.split(/[\\/]/).at(-1),trackingCad:f.tracking,
    pairs:[[1,f.texto],[5,value(e,5)],[8,value(e,8)],[7,value(e,7,'Standard')],
     [10,String(number(e,10)+c*dx-s*dy)],[20,String(number(e,20)+s*dx+c*dy)],
     [40,String(f.alto)],[41,String(f.ancho)],[51,String(f.oblicuo)],[50,String(angle)],[230,value(e,230,'1')]]});
  };
  const rule=(x1:number,y1:number,x2:number,y2:number)=>{
   const normal=number(e,230,1)<0?-1:1;
   out.push({type:'LINE',pairs:[[10,String(normal*(number(e,10)+c*x1-s*y1))],[20,String(number(e,20)+s*x1+c*y1)],
    [11,String(normal*(number(e,10)+c*x2-s*y2))],[21,String(number(e,20)+s*x2+c*y2)]]});
  };
  for(const f of line.runs){
   if(f.fraccion){
    const n={...f,fraccion:undefined,alto:f.alto*.7},a={...n,texto:f.fraccion.arriba},b={...n,texto:f.fraccion.abajo};
    const ma=measure([a]),mb=measure([b]),w=Math.max(ma.advance,mb.advance),diagonal=f.fraccion.separador==='#';
    emit(a,x+(diagonal?0:(w-ma.advance)/2),y+f.alto*.65);
    emit(b,x+(diagonal?f.alto*.4:(w-mb.advance)/2),y-f.alto*.25);
    if(f.fraccion.separador==='/')rule(x,y+f.alto*.55,x+w,y+f.alto*.55);
    if(diagonal)rule(x+ma.advance*.7,y-f.alto*.15,x+ma.advance*.7+f.alto*.4,y+f.alto*1.1);
    x+=w+(diagonal?f.alto*.4:0);
   }else{
    const delta=f.base===1?(line.metric.top-f.alto)/2:f.base===2?line.metric.top-f.alto:0;
    emit(f,x,y+delta);x+=measure([f]).advance;
   }
  }
 }
 return out;
}
