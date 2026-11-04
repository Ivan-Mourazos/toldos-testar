import type { CotaAlzado, FormaAlzado, GeometriaAlzado } from './alzado.ts';
import { anchoArial } from '../domain/corteLona/texto.js';
import { medidasTramoAraujo } from './araujo.ts';
import { fichaDePuerta } from './clientes.ts';
import type { Puerta } from './tipos.ts';

/** Modelo de Iván: 4292, con identificaciones discretas como en el 2391. Medidas en cm. */
export function alzadoAraujo(p: Puerta, letra: string): GeometriaAlzado {
  const a=p.araujo!, perfil=fichaDePuerta(p).perfiles[a.perfil], formas:FormaAlzado[]=[];
  const tramos=a.tramos.filter(t=>t.frente>0&&t.alto>0);
  const F=Math.max(100,...tramos.map(t=>t.frente)), base=Math.max(4,F/60), margen=base*14;
  const vistas:NonNullable<GeometriaAlzado['vistas']>=[],grupos:FormaAlzado[][]=[];
  const num=(x:number)=>x.toLocaleString('es-ES',{maximumFractionDigits:2});
  const texto=(s:string,x:number,y:number,tamano=base,ancla:'start'|'middle'|'end'='middle')=>formas.push({tipo:'texto',x,y,lineas:[s],ancla,tamano});
  const cota=(x1:number,y1:number,x2:number,y2:number,linea:number,valor:number)=>{
    const vertical=x1===x2;
    const forma:CotaAlzado={tipo:'cota',x1,y1,x2,y2,linea,valor,marcas:base/3,estilo:'XERAL',texto:{x:vertical?linea-base:(x1+x2)/2,y:vertical?(y1+y2)/2:linea-base/2,ancla:'middle',giro:vertical?-90:0}};
    formas.push(forma);return forma;
  };
  let y=base*8;
  const primerTramo=tramos.findIndex(t=>t.tipo==='tramo');
  const ultimoTramo=tramos.reduce((ultimo,t,i)=>t.tipo==='tramo'?i:ultimo,-1);
  for(const [i,t] of tramos.entries()){
    const inicio=y-base*8,indiceForma=formas.length;
    const m=medidasTramoAraujo(t,perfil),h=m.alto,d=m.arriba.referencia,w=t.frente;
    formas.push({tipo:'rect',clase:'puerta-pano',x:0,y,ancho:w,alto:h});
    for(const yy of [y+d,y+d+t.alto])formas.push({tipo:'linea',clase:'puerta-referencia',x1:0,y1:yy,x2:w,y2:yy});
    for(const yy of [y+m.arriba.marca,y+h-m.abajo.marca])formas.push({tipo:'linea',clase:'puerta-marca',x1:p.margenMarcas,y1:yy,x2:w-p.margenMarcas,y2:yy});
    const ventanas=[...t.ventanas].sort((a,b)=>a.x-b.x);
    const obstaculos:Array<[number,number]>=[];
    for(const [j,v] of ventanas.entries()){
      const vy=y+d+t.alto-v.y-v.alto;
      obstaculos.push([vy-2-base,vy+v.alto+2+base]);
      formas.push({tipo:'rect',clase:'puerta-cristal',x:v.x-2,y:vy-2,ancho:v.ancho+4,alto:v.alto+4,radio:v.radioCristal},
        {tipo:'rect',clase:'puerta-ventana',x:v.x,y:vy,ancho:v.ancho,alto:v.alto,radio:v.radio});
      cota(v.x,vy,v.x+v.ancho,vy,vy+v.alto-base,v.ancho);
      cota(v.x,vy,v.x,vy+v.alto,v.x+v.ancho*.22,v.alto);
      const anterior=j?ventanas[j-1].x+ventanas[j-1].ancho:0;
      cota(anterior,vy,v.x,vy,vy+v.alto/2,v.x-anterior);
      if(j===ventanas.length-1)cota(v.x+v.ancho,vy,w,vy,vy+v.alto/2,w-v.x-v.ancho);
      cota(v.x,vy+v.alto,v.x,y+d+t.alto,v.x+v.ancho/2,v.y);
    }
    const entradas=[...(t.entradas??[]),...a.forma==='continua'&&t.tipo==='tramo'?p.entradas.map(e=>({altura:e.altura,ancho:e.alto})):[]];
    for(const e of entradas){
      const yy=y+d+t.alto-e.altura;
      obstaculos.push([yy-base*2,yy+e.ancho/2+base]);
      formas.push({tipo:'linea',clase:'puerta-eje',x1:0,y1:yy,x2:w,y2:yy},
        {tipo:'linea',clase:'puerta-marca',x1:p.margenMarcas,y1:yy+e.ancho/2,x2:w-p.margenMarcas,y2:yy+e.ancho/2});
      texto('E.T.'+('huecoLibre' in e&&e.huecoLibre?' (DEJAR HUECOS '+num(e.huecoLibre as number)+')':''),w/2,yy-base);
      cota(w,yy-e.ancho/2,w,yy+e.ancho/2,w+base*4,e.ancho);
      cota(0,yy,0,y+d+t.alto,-base*12,e.altura);
    }
    const codigo=letra+(i+1);
    let libres:Array<[number,number]>=[[y+m.arriba.marca+base/4,y+h-m.abajo.marca-base/4]];
    for(const [b0,b1]of obstaculos)libres=libres.flatMap(([u,v])=>b1<=u||b0>=v?[[u,v]]:[[u,Math.min(v,b0)],[Math.max(u,b1),v]].filter(([a,b])=>b>a)) as Array<[number,number]>;
    const [u,v]=libres.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0]??[y+m.arriba.marca,y+h-m.abajo.marca];
    const centro=(u+v)/2,primero=i===primerTramo;
    if(primero){
      const lineas=[t.of||p.of||'SIN OF','REVÉS',...tramos.some(t=>t.rotulacion)?['ROTULACIÓN','POR DERECHO']:[]];
      const tamano=Math.min(base*2,Math.max(base*.7,(v-u)/(lineas.length*1.5)));
      lineas.forEach((s,j)=>texto(s,w/2,centro+(j-(lineas.length-1)/2)*tamano*1.5,tamano));
      texto(codigo,w*.12,centro,base);
    }else if(v-u<base)texto(codigo,w*.12,y-base*2,base);
    else texto(codigo,t.tipo==='bolsa'?w*.7:w/2,centro,Math.min(base*1.5,Math.max(base*.7,(v-u)*.7)));
    if(/AMARILLO/i.test(t.material??(t.tipo==='bolsa'?p.materialSaco:p.color)))texto('AMARILLO',w*.28,t.tipo==='bolsa'?centro:y+h+base*2,base);
    texto('X'+t.cantidad*p.cantidad,t.tipo==='bolsa'?w*.88:w+base*10,y+h/2,base*2);
    const remate=(e:typeof t.arriba)=>e?.tipo==='et'?'E.T.':'VARILLA BLANCA (5,5 mm)';
    texto(remate(t.arriba),w/2,y-base*2);
    texto(remate(t.abajo),w/2,y+h+base*2);
    if(i===ultimoTramo||t.tipo==='bolsa')cota(0,y,w,y,y-base*6,w);
    cota(0,y+d,0,y+d+t.alto,-base*6,t.alto);
    cota(0,y,0,y+h,-base*10,h);
    cota(w,y,w,y+m.arriba.marca,w+base*4,m.arriba.marca);
    cota(w,y+h-m.abajo.marca,w,y+h,w+base*4,m.abajo.marca);
    for(const [x,giro]of [[-base*1.5,-90],[w+base*1.5,90]])formas.push({tipo:'texto',x,y:y+h/2,lineas:['AL CORTE'],ancla:'middle',tamano:base,giro});
    if(t.rotulacion){
      const r=t.rotulacion,bajo=r.centrada?t.alto/2:r.desdeBajo??8;
      const yy=y+d+t.alto-bajo,x=w-r.desdeDerecha;
      const rotuloX=x-r.ancho-base;
      texto('ROTULACIÓN',rotuloX,yy-base,base,'end');
      const altura=cota(x,yy,x,y+d+t.alto,rotuloX-anchoArial('ROTULACIÓN',base)-base*2,bajo);
      altura.texto={...altura.texto,y:yy-base,fijar:true};
      cota(x,yy,w,yy,yy,r.desdeDerecha);
      cota(x-r.ancho,yy,x,yy,yy-base*4,r.ancho);
    }
    const siguiente=tramos[i+1];
    y+=h+base*(i+1===ultimoTramo||siguiente?.tipo==='bolsa'?14:9);
    vistas.push({nombre:'Pieza '+(i+1)+' · '+(t.tipo==='bolsa'?'bolsa':'tramo'),xMin:-margen,yMin:inicio,ancho:F+base*31,alto:y-inicio-base*2});
    grupos.push(formas.slice(indiceForma));
  }
  if(p.notaPlano?.trim()){texto(p.notaPlano.trim(),0,y,base,'start');y+=base*4;}
  if(!tramos.length)texto('Completa los tramos y bolsas del pedido.',0,y);
  return {formas,vista:{xMin:-margen,yMin:0,ancho:F+base*31,alto:y+base*3},vistas,grupos,letraBase:base,F,H:y};
}
