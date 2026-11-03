import type { FormaAlzado, GeometriaAlzado } from './alzado.ts';
import { PERFILES_ARAUJO } from './araujo.ts';
import type { Puerta } from './tipos.ts';

/** Alzado por el revés. La rotulación se describe por el derecho, sin inventar su altura o dibujar un logo. */
export function alzadoAraujo(p: Puerta, letra: string): GeometriaAlzado {
  const a=p.araujo!, perfil=PERFILES_ARAUJO[a.perfil], formas:FormaAlzado[]=[];
  const tramos=a.tramos.filter(t=>t.frente>0&&t.alto>0);
  const F=Math.max(100,...tramos.map(t=>t.frente)), base=Math.max(4,F/60), margen=base*8;
  const vistas:NonNullable<GeometriaAlzado['vistas']>=[];
  const grupos:FormaAlzado[][]=[];
  let y=base*6;
  const texto=(s:string,x:number,yy:number,ancla:'start'|'middle'|'end'='middle',tamano=base)=>formas.push({tipo:'texto',x,y:yy,lineas:[s],ancla,tamano});
  const cota=(x1:number,y1:number,x2:number,y2:number,linea:number,valor:number)=>{
    const vertical=x1===x2;
    formas.push({tipo:'cota',x1,y1,x2,y2,linea,valor,marcas:base/3,estilo:'XERAL',texto:{x:vertical?linea+base:(x1+x2)/2,y:vertical?(y1+y2)/2:linea-base/2,ancla:'middle',giro:vertical?-90:0}});
  };
  for(const [i,t] of tramos.entries()){
    const indiceForma=formas.length;
    const inicio=y-base*6;
    const h=t.alto+perfil.aumento,d=perfil.aumento/2,w=t.frente;
    formas.push({tipo:'rect',clase:'puerta-pano',x:0,y,ancho:w,alto:h});
    for(const yy of [y+d,y+d+t.alto])formas.push({tipo:'linea',clase:'puerta-referencia',x1:0,y1:yy,x2:w,y2:yy});
    for(const yy of [y+perfil.marca,y+h-perfil.marca])formas.push({tipo:'linea',clase:'puerta-marca',x1:p.margenMarcas,y1:yy,x2:w-p.margenMarcas,y2:yy});
    const ventanas=[...t.ventanas].sort((a,b)=>a.x-b.x);
    for(const [j,v] of ventanas.entries()){
      const vy=y+d+t.alto-v.y-v.alto;
      formas.push({tipo:'rect',clase:'puerta-cristal',x:v.x-2,y:vy-2,ancho:v.ancho+4,alto:v.alto+4,radio:v.radioCristal},
        {tipo:'rect',clase:'puerta-ventana',x:v.x,y:vy,ancho:v.ancho,alto:v.alto,radio:v.radio});
      cota(v.x,vy,v.x+v.ancho,vy,vy-base,v.ancho);
      cota(v.x,vy,v.x,vy+v.alto,v.x-base,v.alto);
      const anterior=j?ventanas[j-1].x+ventanas[j-1].ancho:0;
      cota(anterior,y+h,v.x,y+h,y+h+base*4,v.x-anterior);
      if(j===ventanas.length-1)cota(v.x+v.ancho,y+h,w,y+h,y+h+base*4,w-v.x-v.ancho);
      cota(v.x,vy+v.alto,v.x,y+d+t.alto,v.x+base*3,v.y);
    }
    if(a.forma==='continua'&&t.tipo==='tramo')for(const e of p.entradas){
      const yy=y+d+t.alto-e.altura;
      formas.push({tipo:'linea',clase:'puerta-referencia',x1:0,y1:yy,x2:w,y2:yy});
      texto(`E.T. ${e.alto.toLocaleString('es-ES')} cm · eje a ${e.altura.toLocaleString('es-ES')} del bajo`,w/2,yy-base);
    }
    const nombre=t.tipo==='bolsa'?'BOLSA':a.forma==='continua'?'CUERPO CONTINUO':`TRAMO ${i+1}`;
    texto(`${letra}${i+1} · ${nombre} · ${t.cantidad*p.cantidad} ud. · ${p.of||'SIN OF'} · REVÉS`,0,y-base*3,'start');
    texto('CANUTILLO · VARILLA BLANCA Ø5,5 mm',w/2,y-base);
    texto('CANUTILLO · VARILLA BLANCA Ø5,5 mm',w/2,y+h+base*1.7);
    cota(0,y,w,y,y-base*5,w);
    cota(w,y+d,w,y+d+t.alto,w+base*4,t.alto);
    cota(0,y,0,y+h,-base*5,h);
    cota(w,y,w,y+perfil.marca,w+base*8,perfil.marca);
    for(const [x,giro]of [[-base,-90],[w+base,90]])formas.push({tipo:'texto',x,y:y+h/2,lineas:['AL CORTE'],ancla:'middle',tamano:base,giro});
    y+=h+base*4;
    if(t.rotulacion){
      texto(`${t.rotulacion.texto} · ancho ${t.rotulacion.ancho.toLocaleString('es-ES')} · a ${t.rotulacion.desdeDerecha.toLocaleString('es-ES')} del lado derecho, visto por el derecho`,0,y,'start',base*.85);
      texto('Altura y arte de rotulación pendientes de comprobar; no se cortan.',0,y+base*1.7,'start',base*.85);y+=base*4;
    }
    y+=base*6;
    vistas.push({nombre:`Pieza ${i+1} · ${t.tipo==='bolsa'?'bolsa':'tramo'}`,xMin:-margen,yMin:inicio,ancho:F+margen*2.8,alto:y-inicio-base*2});
    grupos.push(formas.slice(indiceForma));
  }
  if(p.notaPlano?.trim()){texto(p.notaPlano.trim(),0,y,'start');y+=base*4;}
  if(!tramos.length)texto('Completa los tramos y bolsas del pedido.',0,y,'start');
  return {formas,vista:{xMin:-margen,yMin:-base*2,ancho:F+margen*2.8,alto:y+base*3},vistas,grupos,letraBase:base,F,H:y};
}
