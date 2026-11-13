import {number,value,values} from './dxf.ts';
import type {Dxf,EntidadDxf,Punto} from './tipos.ts';
import type {Fuente} from './fuente.ts';

export interface FragmentoTexto { texto:string; alto:number; espaciado:number; base?:'inferior'|'central'|'superior' }
export interface PlanTexto {
 lineas:FragmentoTexto[][]; alto:number; dy:number; giro:number; anclaje:number;
 vertical:boolean; interlineado:number; plegado:boolean;
}

/** Limpieza previa de cada dato 1/3 en dxf_input 1.2/master. S y W son expresiones codiciosas. */
export function normalizarCampo(texto:string):string {
 return texto.replace(/\\~/g,' ').replace(/\^I/g,'').replace(/\{\\L/g,'')
  .replace(/\\S.*;/g,'').replace(/\\W.*;/g,'')
  .replace(/\\U\+([a-f\d]{4})/gi,(_:string,h:string)=>String.fromCodePoint(parseInt(h,16)));
}

/** El importador repite el control del grupo al pasar un P por dentro de sus llaves. */
function separarParrafos(texto:string):string {
 let pos=texto.indexOf('\\P');
 while(pos>=0){
  const abierta=texto.lastIndexOf('{',pos-1),cerrada=texto.lastIndexOf('}',pos-1);
  if(abierta>=0&&abierta>cerrada){
   const fin=texto.indexOf(';',abierta),control=texto[abierta+1]==='\\'&&fin>=0&&fin-abierta<20?texto.slice(abierta+1,fin+1):'';
   texto=texto.slice(0,pos)+'}\\P{'+control+texto.slice(pos+2);
  }
  pos=texto.indexOf('\\P',pos+2);
 }
 return texto;
}

function interpretarControl(texto:string,alto:number):FragmentoTexto {
 const f:FragmentoTexto={texto,alto,espaciado:0};
 if(!texto.startsWith('\\'))return f;
 const codigo=texto[1]?.toUpperCase(),fin=texto.indexOf(';');
 if(['C','H','T','Q','W','A'].includes(codigo)&&fin>2){
  const dato=texto.slice(2,fin),n=dato.trim()?Number(dato):NaN;
  // float("2x") falla en Python: ese tspan queda sin texto. No es una altura relativa.
  if(!Number.isFinite(n)){f.texto='';return f;}
  f.texto=texto.slice(fin+1);
  if(codigo==='H'&&n>=0)f.alto=n;
  if(codigo==='T')f.espaciado=n*25.4/96;
  if(codigo==='A')f.base=n===0?'inferior':n===1?'central':n===2?'superior':undefined;
 }else if(codigo==='F'&&fin>2){
  // F se retira, pero la fuente sigue siendo options.font, no la escrita en el grupo.
  f.texto=texto.slice(fin+1);
 }
 return f;
}

function fragmentos(linea:string,alto:number):FragmentoTexto[]{
 const partes:FragmentoTexto[]=[];let pos=linea.indexOf('{');
 while(pos>=0){
  if(pos===0){const fin=linea.indexOf('}');if(fin<1)break;partes.push(interpretarControl(linea.slice(1,fin),alto));linea=linea.slice(fin+1);}
  else {partes.push(interpretarControl(linea.slice(0,pos),alto));linea=linea.slice(pos);}
  pos=linea.indexOf('{');
 }
 if(linea)partes.push(interpretarControl(linea,alto));
 return partes;
}

/** TEXT añade 70/71 y usa la misma función de MTEXT; 72/73 y 51 no se utilizan. */
export function prepararTexto(e:EntidadDxf,d:Pick<Dxf,'styles'>):PlanTexto {
 const tiene=(c:number)=>e.pairs.some(([codigo])=>codigo===c),alto=number(e,40);
 const campo=(s:string)=>normalizarCampo(s.trim());
 let texto=values(e,3).map(campo).join('')+campo(value(e,1)),plegado=false;
 const ancho=number(e,41),porLinea=ancho*2/alto;
 if(ancho>10&&alto>1&&[...texto].length>porLinea&&!texto.includes('\\P')&&!texto.includes('{')){
  const n=Math.trunc(porLinea);
  // El bucle Python no avanzaría con cero; se informa como entrada inválida en vez de bloquear el proceso.
  if(n<1)throw Error('La anchura y altura del texto producen cero caracteres por línea en el importador');
  const caracteres=[...texto];let pos=0;
  while(caracteres.length>pos){caracteres.splice(pos,0,'\\','P');pos+=n+2;}
  texto=caracteres.join('');plegado=true;
 }
 const ancla=tiene(71)?number(e,71):e.type==='TEXT'?1:0;
 let dy=e.type==='MTEXT'&&!tiene(70)?alto:0;
 if([4,5,6].includes(ancla))dy=alto/2;
 const anclaje=[2,5,8].includes(ancla)?.5:[3,6,9].includes(ancla)?1:0;
 let giro=number(e,230,1)===-1&&tiene(50)&&tiene(51)?180-number(e,51):number(e,50);
 if(!tiene(50)&&tiene(11)&&tiene(21)){
  const x=number(e,11)*number(e,230,1),y=number(e,21),modulo=Math.hypot(x,y);
  if(modulo>.99&&modulo<1.01)giro=Math.atan2(y,x)*180/Math.PI;
 }
 const vertical=tiene(7)&&!!(Number(d.styles[value(e,7)]?.[70]??0)&4);
 if(vertical)giro=0;
 return {lineas:separarParrafos(texto).split('\\P').map(l=>fragmentos(l,alto)),alto,dy,giro,anclaje,vertical,interlineado:1.25,plegado};
}

/** Contornos Arial en mm. La precisión nominal conserva los bytes ya contrastados de la web. */
export function contornosTexto(e:EntidadDxf,d:Pick<Dxf,'styles'>,font:Fuente):Punto[][] {
 const p=prepararTexto(e,d),angulo=p.giro*Math.PI/180,c=Math.cos(angulo),s=Math.sin(angulo);
 // adjust_coords refleja la inserción; no refleja los contornos de cada letra del SVG.
 const bx=number(e,10)*number(e,230,1),by=number(e,20);
 const baseX=bx+s*p.dy,baseY=by-c*p.dy,out:Punto[][]=[];
 let paso=0;
 for(const [numero,fragmentos]of p.lineas.entries()){
  let x=0,anterior:string|undefined,altoAnterior=0;const linea:Punto[][]=[];
  for(const f of fragmentos){
   if(f.alto===0)continue;
   // El render del robot conserva los espacios repetidos: lo prueban los rótulos web.
   const texto=f.texto;
   for(const ch of texto){
    if(anterior&&altoAnterior===f.alto)x+=font.kern(anterior,ch)*f.alto;
    const g=font.paths(ch);
    // Los controles A conservan el efecto de dominant-baseline; no cambian la fuente global.
    const base=f.base==='central'?-f.alto*(font.ascenso+font.descenso)/2:f.base==='superior'?-f.alto*font.ascenso:f.base==='inferior'?-f.alto*font.descenso:0;
    for(const path of [...g.paths].reverse())linea.push(path.map(q=>({x:x+q.x/font.units*f.alto,y:paso+q.y/font.units*f.alto+base,type:q.type,mark:q.mark})));
    x+=g.advance*f.alto+f.espaciado;anterior=ch;altoAnterior=f.alto;
   }
  }
  for(const path of linea)out.push(path.map(q=>{
   const xx=q.x-p.anclaje*x,yy=q.y;
   if(p.vertical){
    // tb avanza por columna; las letras latinas giran con la dirección vertical.
    return {...q,x:bx+numero*p.alto+yy-paso,y:by-(q.x-p.anclaje*x)};
   }
   return {...q,x:baseX+c*xx-s*yy,y:baseY+s*xx+c*yy};
  }));
  paso-=p.alto*p.interlineado;
 }
 return out;
}
