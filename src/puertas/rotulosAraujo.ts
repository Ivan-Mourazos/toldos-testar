import { anchoArial } from '../domain/corteLona/texto.js';
import type { FormaAlzado } from './alzado.ts';

export interface HuecoRotulo { x: number; y: number; ancho: number; alto: number }

/** Rectángulos libres máximos: conserva también los huecos laterales, sin preferir una esquina. */
export function huecosRotulo(limite: HuecoRotulo, obstaculos: HuecoRotulo[]): HuecoRotulo[] {
  let libres = [limite];
  for (const b of obstaculos) {
    libres = libres.flatMap(a => {
      if (b.x >= a.x+a.ancho || b.x+b.ancho <= a.x || b.y >= a.y+a.alto || b.y+b.alto <= a.y) return [a];
      return [
        {x:a.x,y:a.y,ancho:b.x-a.x,alto:a.alto},
        {x:b.x+b.ancho,y:a.y,ancho:a.x+a.ancho-b.x-b.ancho,alto:a.alto},
        {x:a.x,y:a.y,ancho:a.ancho,alto:b.y-a.y},
        {x:a.x,y:b.y+b.alto,ancho:a.ancho,alto:a.y+a.alto-b.y-b.alto},
      ].filter(c=>c.ancho>0.01&&c.alto>0.01);
    }).filter((a,i,todos)=>!todos.some((b,j)=>j!==i && b.x<=a.x&&b.y<=a.y&&b.x+b.ancho>=a.x+a.ancho&&b.y+b.alto>=a.y+a.alto
      && (j<i||b.ancho*b.alto>a.ancho*a.alto)));
  }
  return libres;
}

/** El bloque entero cabe en un hueco: misma letra, líneas centradas y margen por los cuatro lados. */
export function encajarRotulo(lineas: string[], limite: HuecoRotulo, obstaculos: HuecoRotulo[], maximo: number) {
  const ancho = Math.max(...lineas.map(s=>anchoArial(s.toUpperCase(),1)));
  const candidatos = huecosRotulo(limite,obstaculos).map(c=>({
    x:c.x+c.ancho/2,y:c.y+c.alto/2,
    tamano:Math.min(maximo,c.ancho*.9/ancho,c.alto*.85/(1+(lineas.length-1)*1.5)),
  }));
  candidatos.sort((a,b)=>b.tamano-a.tamano ||
    Math.hypot(a.x-limite.x-limite.ancho/2,a.y-limite.y-limite.alto/2)-Math.hypot(b.x-limite.x-limite.ancho/2,b.y-limite.y-limite.alto/2));
  return candidatos[0];
}

export function cajaRotulo(s:string,x:number,y:number,h:number,giro=0):HuecoRotulo {
  const w=anchoArial(s.toUpperCase(),h),vertical=Math.abs(giro)===90;
  return {x:x-(vertical?h:w)/2,y:y-(vertical?w:h)/2,ancho:vertical?h:w,alto:vertical?w:h};
}

/** Compara una columna con una fila: en piezas bajas, repartir la información a lo ancho permite letra mayor. */
export function componerRotulo(lineas:string[],limite:HuecoRotulo,obstaculos:HuecoRotulo[],maximo:number) {
  const columna=encajarRotulo(lineas,limite,obstaculos,maximo);
  const anchos=lineas.map(s=>anchoArial(s.toUpperCase(),1));
  const largo=anchos.reduce((s,w)=>s+w,0)+(lineas.length-1)*1.5;
  const filas=huecosRotulo(limite,obstaculos).map(c=>({x:c.x+c.ancho/2,y:c.y+c.alto/2,tamano:Math.min(maximo,c.ancho*.9/largo,c.alto*.85)}))
    .sort((a,b)=>b.tamano-a.tamano||Math.hypot(a.x-limite.x-limite.ancho/2,a.y-limite.y-limite.alto/2)-Math.hypot(b.x-limite.x-limite.ancho/2,b.y-limite.y-limite.alto/2));
  const fila=filas[0];
  if(fila&&(!columna||fila.tamano>columna.tamano*1.15)){
    let x=fila.x-largo*fila.tamano/2;
    return lineas.map((valor,i)=>{const t={valor,x:x+anchos[i]*fila.tamano/2,y:fila.y,tamano:fila.tamano};x+=(anchos[i]+1.5)*fila.tamano;return t;});
  }
  return columna?lineas.map((valor,i)=>({valor,x:columna.x,y:columna.y+(i-(lineas.length-1)/2)*columna.tamano*1.5,tamano:columna.tamano})):[];
}
export function cajaLinea(x1:number,y1:number,x2:number,y2:number,margen=.8):HuecoRotulo {
  return {x:Math.min(x1,x2)-margen,y:Math.min(y1,y2)-margen,ancho:Math.abs(x2-x1)+2*margen,alto:Math.abs(y2-y1)+2*margen};
}
/** Cajas de las líneas que realmente se escriben al DXF, incluido DIMEXO de 5 cm. */
export function obstaculosAlzado(formas:FormaAlzado[]):HuecoRotulo[] {
  return formas.flatMap((f):HuecoRotulo[]=>{
    if(f.tipo==='texto'){
      const s=f.lineas.join(' · '),h=f.tamano??5,w=anchoArial(s.toUpperCase(),h);
      return [cajaRotulo(s,f.x+(f.ancla==='start'?w/2:f.ancla==='end'?-w/2:0),f.y,h,f.giro)];
    }
    if(f.tipo==='linea')return [cajaLinea(f.x1,f.y1,f.x2,f.y2)];
    if(f.tipo==='rect')return [cajaLinea(f.x,f.y,f.x+f.ancho,f.y),cajaLinea(f.x,f.y+f.alto,f.x+f.ancho,f.y+f.alto),
      cajaLinea(f.x,f.y,f.x,f.y+f.alto),cajaLinea(f.x+f.ancho,f.y,f.x+f.ancho,f.y+f.alto)];
    if(f.tipo!=='cota')return [];
    const vertical=f.x1===f.x2;
    const lineas=[vertical?cajaLinea(f.linea,f.y1,f.linea,f.y2):cajaLinea(f.x1,f.linea,f.x2,f.linea)];
    for(const [x,y] of [[f.x1,f.y1],[f.x2,f.y2]]){
      const d=f.linea-(vertical?x:y),s=Math.sign(d);
      if(Math.abs(d)>5)lineas.push(vertical?cajaLinea(x+s*5,y,f.linea+s*1.75,y):cajaLinea(x,y+s*5,x,f.linea+s*1.75));
    }
    return lineas;
  });
}

/** Conserva la letra de cota; mueve solo su texto al punto libre más cercano a su línea. */
export function colocarCotasAraujo(formas:FormaAlzado[],base:number) {
  const obstaculos=obstaculosAlzado(formas);
  for(const f of formas){
    if(f.tipo!=='cota')continue;
    const vertical=f.x1===f.x2,s=String(Math.round(f.valor*10)/10).replace('.',','),w=anchoArial(s,base);
    const girado=vertical&&w<=Math.abs(f.y2-f.y1)*.9;
    const ancho=girado?base:w,alto=girado?w:base;
    const preferido={x:f.texto.x,y:f.texto.y};
    const margen=base*5;
    const limite=vertical?{x:f.linea-margen,y:Math.min(f.y1,f.y2)-base*2,ancho:2*margen,alto:Math.abs(f.y2-f.y1)+base*4}
      :{x:Math.min(f.x1,f.x2)-base*2,y:f.linea-margen,ancho:Math.abs(f.x2-f.x1)+base*4,alto:2*margen};
    const candidatos=huecosRotulo(limite,obstaculos).filter(c=>c.ancho>=ancho+1.6&&c.alto>=alto+1.6).map(c=>{
      const x=Math.max(c.x+ancho/2+.8,Math.min(c.x+c.ancho-ancho/2-.8,preferido.x));
      const y=Math.max(c.y+alto/2+.8,Math.min(c.y+c.alto-alto/2-.8,preferido.y));
      return {x,y,d:Math.hypot(x-preferido.x,y-preferido.y)};
    }).sort((a,b)=>a.d-b.d);
    const sitio=candidatos[0];
    if(!sitio)throw new Error('No hay espacio para la cota ARAUJO '+s);
    f.texto={x:sitio.x,y:sitio.y,ancla:'middle',giro:girado?-90:0,fijar:true};
    obstaculos.push(cajaRotulo(s,sitio.x,sitio.y,base,girado?-90:0));
  }
}
