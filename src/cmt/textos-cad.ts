import {number,value,values} from './dxf.ts';
import {normalizarCampo,prepararTexto} from './textos.ts';
import type {Fuente} from './fuente.ts';
import type {Dxf,EntidadDxf} from './tipos.ts';

/** Preparación CAD contrastada antes de importar los TEXT, distinta del MTEXT directo.
 * No se elige por pedido: el llamante debe conocer qué preparación necesita su DXF.
 */
export function descomponerMtext(e:EntidadDxf,d:Pick<Dxf,'styles'>,font:Fuente):EntidadDxf[]|null {
 const raw=values(e,3).join('')+value(e,1);
 // Solo hay evidencia completa para texto plano, anclaje superior izquierdo y 44=1.
 // Los formatos, otras normales y otros anclajes conservan el camino directo.
 if(number(e,71,1)!==1||number(e,44,1)!==1||number(e,230,1)!==1
  ||/[{}]|\\(?!P|~|U\+[a-f\d]{4})/i.test(raw))return null;
 const plan=prepararTexto({...e,pairs:e.pairs.filter(([c])=>c!==41)},d);
 if(plan.vertical)return null;
 const h=number(e,40),width=number(e,41);
 const cap=Math.max(...font.paths('H').paths.flat().map(q=>q.y))/font.units;
 if(!(cap>0))throw Error('La fuente no permite medir la altura de mayúsculas para preparar MTEXT');
 function medir(text:string){
  let advance=0,left=Infinity,top=0,prev:string|undefined;
  for(const ch of text){
   if(prev)advance+=font.kern(prev,ch)*h/cap;
   const g=font.paths(ch);
   for(const p of g.paths)for(const q of p){left=Math.min(left,advance+q.x/font.units*h/cap);top=Math.max(top,q.y/font.units*h/cap);}
   advance+=g.advance*h/cap;prev=ch;
  }
  return {advance,left:Number.isFinite(left)?Math.max(0,left):0,top};
 }
 const lines:string[]=[];
 for(const p of normalizarCampo(raw.trim()).split('\\P')){
  let line='';
  for(const word of p.split(' ')){
   const next=line?line+' '+word:word;
   // El espacio tras la palabra cuenta para decidir el salto observado en CAD.
   if(width>0&&line&&medir(next+' ').advance>width){lines.push(line);line=word;}
   else line=next;
  }
  lines.push(line);
 }
 const angle=plan.giro*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 let used=0;
 return lines.map(text=>{
  const m=medir(text),x=-m.left,y=-used-m.top;
  used+=m.top+2*h/3;
  // El tamaño de los TEXT sigue siendo 40: solo se usó la altura de mayúsculas
  // para medir el cuadro CAD. No se escala la letra por 1/cap al importarla.
  return {type:'TEXT',pairs:[[1,text],[5,value(e,5)],[8,value(e,8)],
   [10,String(number(e,10)+c*x-s*y)],[20,String(number(e,20)+s*x+c*y)],
   [40,String(h)],[50,String(plan.giro)]]};
 });
}
