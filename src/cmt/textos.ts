import { number, value, values } from './dxf.ts';
import type { EntidadDxf } from './tipos.ts';
import type { Fuente } from './fuente.ts';

/** Solo se neutralizan formatos sin efecto en los contornos ni en la herramienta de la capa. */
export function contenidoMtext(e: EntidadDxf): string {
  let texto = values(e,3).join('') + value(e,1);
  texto = texto.replace(/\\U\+([a-f\d]{4})/gi, (_: string, hex: string)=>String.fromCodePoint(parseInt(hex,16)));
  texto = texto.replace(/\\[Cc]\d+;/g, '');
  let nivel=0;
  for(const c of texto) {
    if(c==='{')nivel++;
    if(c==='}' && --nivel<0)throw new Error('tiene un grupo de formato sin abrir');
  }
  if(nivel)throw new Error('tiene un grupo de formato sin cerrar');
  texto=texto.replace(/[{}]/g,'');
  if(/\\P|\^J|[\r\n]/.test(texto))throw new Error('tiene saltos de línea cuyo interlineado no está contrastado con el robot');
  if(/\\|%%/.test(texto))throw new Error('tiene formato de letra, altura, fracciones u otro código sin contrastar');
  return texto;
}

/** MTEXT superior izquierdo: la línea base observada está una altura por debajo de la inserción. */
export function mtextAText(e: EntidadDxf, fuente: Fuente): EntidadDxf {
  const contenido=contenidoMtext(e), h=number(e,40), ancho=number(e,41);
  let largo=0, anterior: string | undefined;
  for(const c of contenido) {
    if(anterior)largo+=fuente.kern(anterior,c)*h;
    largo+=fuente.paths(c).advance*h; anterior=c;
  }
  if(ancho>0 && largo>ancho+.001)throw new Error('necesita repartir el texto en varias líneas dentro de su anchura');
  return {type:'TEXT',pairs:e.pairs.filter(([c])=>![1,3,20,41,50,71,72,73].includes(c)).concat([[1,contenido],[20,String(number(e,20)-h)]])};
}
