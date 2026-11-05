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
  const cajas=lineas.map((s,i)=>cajaRotulo(s,0,(i-(lineas.length-1)/2)*1.5,1));
  const arriba=Math.min(...cajas.map(c=>c.y)),abajo=Math.max(...cajas.map(c=>c.y+c.alto));
  const candidatos = huecosRotulo(limite,obstaculos).map(c=>({
    x:c.x+c.ancho/2,y:c.y+c.alto/2,centroY:c.y+c.alto/2,
    tamano:Math.min(maximo,c.ancho*.9/ancho,c.alto*.85/(abajo-arriba)),
  }));
  candidatos.sort((a,b)=>b.tamano-a.tamano ||
    Math.hypot(a.x-limite.x-limite.ancho/2,a.y-limite.y-limite.alto/2)-Math.hypot(b.x-limite.x-limite.ancho/2,b.y-limite.y-limite.alto/2));
  const c=candidatos[0];
  return c&&{...c,y:c.y-(arriba+abajo)/2*c.tamano};
}

export function cajaRotulo(s:string,x:number,y:number,h:number,giro=0):HuecoRotulo {
  const texto=s.toUpperCase(),w=anchoArial(texto,h),g=giro*Math.PI/180;
  // Envolvente conservadora de la tinta Arial respecto a la base usada por el visor (0,36 h).
  // La mayúscula CAD no incluye la tilde, ni lo que bajan la coma y los paréntesis.
  const ascenso=/[ÁÉÍÓÚÜÑ]/.test(texto)?1.3:1.05,descenso=/[()]/.test(texto)?.32:/[,;]/.test(texto)?.22:.03;
  const y0=(.36-ascenso)*h,y1=(.36+descenso)*h;
  const puntos=[[-w/2,y0],[w/2,y0],[-w/2,y1],[w/2,y1]].map(([a,b])=>[x+a*Math.cos(g)-b*Math.sin(g),y+a*Math.sin(g)+b*Math.cos(g)]);
  const x0=Math.min(...puntos.map(p=>p[0])),x1=Math.max(...puntos.map(p=>p[0]));
  const arriba=Math.min(...puntos.map(p=>p[1])),abajo=Math.max(...puntos.map(p=>p[1]));
  return {x:x0,y:arriba,ancho:x1-x0,alto:abajo-arriba};
}

export function encajarRotuloGirado(s:string,limite:HuecoRotulo,obstaculos:HuecoRotulo[],maximo:number,giro:number) {
  const b=cajaRotulo(s,0,0,1,giro);
  return huecosRotulo(limite,obstaculos).map(c=>{
    const tamano=Math.min(maximo,c.ancho*.85/b.ancho,c.alto*.9/b.alto);
    return {tamano,x:c.x+c.ancho/2-(b.x+b.ancho/2)*tamano,y:c.y+c.alto/2-(b.y+b.alto/2)*tamano};
  }).sort((a,b)=>b.tamano-a.tamano||Math.abs(a.y-limite.y-limite.alto/2)-Math.abs(b.y-limite.y-limite.alto/2))[0];
}

/** Compara una columna con una fila: en piezas bajas, repartir la información a lo ancho permite letra mayor. */
export function componerRotulo(lineas:string[],limite:HuecoRotulo,obstaculos:HuecoRotulo[],maximo:number) {
  const columna=encajarRotulo(lineas,limite,obstaculos,maximo);
  const anchos=lineas.map(s=>anchoArial(s.toUpperCase(),1));
  const largo=anchos.reduce((s,w)=>s+w,0)+(lineas.length-1)*1.5;
  const cajas=lineas.map(s=>cajaRotulo(s,0,0,1)),arriba=Math.min(...cajas.map(c=>c.y)),abajo=Math.max(...cajas.map(c=>c.y+c.alto));
  const filas=huecosRotulo(limite,obstaculos).map(c=>({x:c.x+c.ancho/2,y:c.y+c.alto/2,centroY:c.y+c.alto/2,tamano:Math.min(maximo,c.ancho*.9/largo,c.alto*.85/(abajo-arriba))}))
    .sort((a,b)=>b.tamano-a.tamano||Math.hypot(a.x-limite.x-limite.ancho/2,a.y-limite.y-limite.alto/2)-Math.hypot(b.x-limite.x-limite.ancho/2,b.y-limite.y-limite.alto/2));
  const fila=filas[0];
  if(fila&&(!columna||fila.tamano>columna.tamano*1.15)){
    let x=fila.x-largo*fila.tamano/2;
    return lineas.map((valor,i)=>{const t={valor,x:x+anchos[i]*fila.tamano/2,y:fila.y-(arriba+abajo)/2*fila.tamano,centroY:fila.centroY,tamano:fila.tamano};x+=(anchos[i]+1.5)*fila.tamano;return t;});
  }
  return columna?lineas.map((valor,i)=>({valor,x:columna.x,y:columna.y+(i-(lineas.length-1)/2)*columna.tamano*1.5,centroY:columna.centroY,tamano:columna.tamano})):[];
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
    const caja=cajaRotulo(s,0,0,base,girado?-90:0),ancho=caja.ancho,alto=caja.alto;
    const preferido={x:f.texto.x,y:f.texto.y};
    let sitio:{x:number;y:number;d:number}|undefined;
    // Si la tinta de una cota corta no cabe junto a su línea, ampliar la búsqueda conserva la letra.
    for(const amplitud of [1,2,4]){
      const margen=base*5*amplitud,extremo=base*2*amplitud;
      const limite=vertical?{x:f.linea-margen,y:Math.min(f.y1,f.y2)-extremo,ancho:2*margen,alto:Math.abs(f.y2-f.y1)+2*extremo}
        :{x:Math.min(f.x1,f.x2)-extremo,y:f.linea-margen,ancho:Math.abs(f.x2-f.x1)+2*extremo,alto:2*margen};
      const candidatos=huecosRotulo(limite,obstaculos).filter(c=>c.ancho>=ancho+1.6&&c.alto>=alto+1.6).map(c=>{
      const x=Math.max(c.x-caja.x+.8,Math.min(c.x+c.ancho-caja.x-ancho-.8,preferido.x));
      const y=Math.max(c.y-caja.y+.8,Math.min(c.y+c.alto-caja.y-alto-.8,preferido.y));
      return {x,y,d:Math.hypot(x-preferido.x,y-preferido.y)};
      }).sort((a,b)=>a.d-b.d);
      sitio=candidatos[0];
      if(sitio)break;
    }
    if(!sitio)throw new Error('No hay espacio para la cota ARAUJO '+s);
    f.texto={x:sitio.x,y:sitio.y,ancla:'middle',giro:girado?-90:0,fijar:true};
    obstaculos.push(cajaRotulo(s,sitio.x,sitio.y,base,girado?-90:0));
  }
}
