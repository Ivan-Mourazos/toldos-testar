import type { CotaAlzado, FormaAlzado, GeometriaAlzado } from './alzado.ts';
import { anchoArial } from '../domain/corteLona/texto.js';
import { medidasTramoAraujo } from './araujo.ts';
import { fichaDePuerta } from './clientes.ts';
import { cajaRotulo, colocarCotasAraujo, componerRotulo, encajarRotuloGirado, obstaculosAlzado } from './rotulosAraujo.ts';
import type { Puerta } from './tipos.ts';

/** Modelo de Iván: 4292, con identificaciones discretas como en el 2391. Medidas en cm. */
export function alzadoAraujo(p: Puerta, letra: string): GeometriaAlzado {
  const a=p.araujo!, perfil=fichaDePuerta(p).perfiles[a.perfil], formas:FormaAlzado[]=[];
  const tramos=a.tramos.filter(t=>t.frente>0&&t.alto>0);
  const F=Math.max(100,...tramos.map(t=>t.frente)), base=F<250?5:10, margen=base*12;
  const vistas:NonNullable<GeometriaAlzado['vistas']>=[],grupos:FormaAlzado[][]=[];
  const num=(x:number)=>x.toLocaleString('es-ES',{maximumFractionDigits:2});
  const texto=(s:string,x:number,y:number,tamano=base,ancla:'start'|'middle'|'end'='middle')=>formas.push({tipo:'texto',x,y,lineas:[s],ancla,tamano});
  const cota=(x1:number,y1:number,x2:number,y2:number,linea:number,valor:number)=>{
    const vertical=x1===x2;
    const forma:CotaAlzado={tipo:'cota',x1,y1,x2,y2,linea,valor,marcas:base/3,estilo:base===5?'XERAL 5':'XERAL',texto:{x:vertical?linea-base:(x1+x2)/2,y:vertical?(y1+y2)/2:linea-base,ancla:'middle',giro:vertical?-90:0}};
    formas.push(forma);return forma;
  };
  let y=base*8;
  const primerTramo=tramos.findIndex(t=>t.tipo==='tramo');
  const ultimoTramo=tramos.reduce((ultimo,t,i)=>t.tipo==='tramo'?i:ultimo,-1);
  for(const [i,t] of tramos.entries()){
    const indiceForma=formas.length;
    const m=medidasTramoAraujo(t,perfil),h=m.alto,d=m.arriba.referencia,w=t.frente;
    formas.push({tipo:'rect',clase:'puerta-pano',x:0,y,ancho:w,alto:h});
    for(const yy of [y+d,y+d+t.alto])formas.push({tipo:'linea',clase:'puerta-referencia',x1:0,y1:yy,x2:w,y2:yy});
    for(const yy of [y+m.arriba.marca,y+h-m.abajo.marca])formas.push({tipo:'linea',clase:'puerta-marca',x1:p.margenMarcas,y1:yy,x2:w-p.margenMarcas,y2:yy});
    const ventanas=[...t.ventanas].sort((a,b)=>a.x-b.x);
    for(const [j,v] of ventanas.entries()){
      const vy=y+d+t.alto-v.y-v.alto;
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
      formas.push({tipo:'linea',clase:'puerta-eje',x1:0,y1:yy,x2:w,y2:yy},
        {tipo:'linea',clase:'puerta-marca',x1:p.margenMarcas,y1:yy+e.ancho/2,x2:w-p.margenMarcas,y2:yy+e.ancho/2});
      texto('E.T.'+('huecoLibre' in e&&e.huecoLibre?' (DEJAR HUECOS '+num(e.huecoLibre as number)+')':''),w/2,yy-base,Math.min(base,w*.85/anchoArial('E.T. (DEJAR HUECOS 9)',1)));
      cota(w,yy-e.ancho/2,w,yy+e.ancho/2,w+base*4,e.ancho);
      cota(0,yy,0,y+d+t.alto,-base*4,e.altura);
    }
    const codigo=letra+(i+1);
    texto('X'+t.cantidad*p.cantidad,w+base*9,y+h/2,base*2);
    const remate=(e:typeof t.arriba)=>e?.tipo==='et'?'E.T.':'VARILLA BLANCA (5,5 mm)';
    const tamanoRemate=Math.min(base,w*.88/anchoArial(remate(t.arriba).toUpperCase(),1));
    texto(remate(t.arriba),w/2,y-base*2,tamanoRemate);
    texto(remate(t.abajo),w/2,y+h+base*2,tamanoRemate);
    if(i===ultimoTramo||t.tipo==='bolsa')cota(0,y,w,y,y-base*6,w);
    cota(0,y+d,0,y+d+t.alto,-base*6,t.alto);
    cota(0,y,0,y+h,-base*10,h);
    cota(w,y,w,y+m.arriba.marca,w+base*4,m.arriba.marca);
    cota(w,y+h-m.abajo.marca,w,y+h,w+base*4,m.abajo.marca);
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
    const grupo=formas.slice(indiceForma);
    colocarCotasAraujo(grupo,base);
    // Los laterales se ajustan al hueco entre las líneas auxiliares de las cotas.
    for(const [x,giro]of [[-base*1.5,-90],[w+base*1.5,90]]){
      const limites={x:x-base*.5,y:y+1,ancho:base,alto:h-2};
      const obstaculos=obstaculosAlzado(grupo);
      for(const f of grupo)if(f.tipo==='cota'){
        const b=cajaRotulo(num(f.valor),f.texto.x,f.texto.y,base,f.texto.giro);
        obstaculos.push(b);
      }
      const sitio=encajarRotuloGirado('AL CORTE',limites,obstaculos,base,giro);
      if(sitio)formas.push({tipo:'texto',x:sitio.x,y:sitio.y,lineas:['AL CORTE'],ancla:'middle',tamano:sitio.tamano,giro});
    }
    const lineas=[...i===primerTramo?[t.of||p.of||'SIN OF','REVÉS',...tramos.some(t=>t.rotulacion)?['ROTULACIÓN','POR DERECHO']:[]]:[],codigo,
      .../AMARILLO/i.test(t.material??(t.tipo==='bolsa'?p.materialSaco:p.color))?['AMARILLO']:[]];
    const obstaculos=obstaculosAlzado(formas.slice(indiceForma));
    for(const f of grupo)if(f.tipo==='cota')obstaculos.push(cajaRotulo(num(f.valor),f.texto.x,f.texto.y,base,f.texto.giro));
    obstaculos.push(...grupo.flatMap(f=>f.tipo==='rect'&&f.clase==='puerta-cristal'?[{x:f.x,y:f.y,ancho:f.ancho,alto:f.alto}]:[]));
    for(const r of componerRotulo(lineas,{x:base,y:y+1,ancho:w-2*base,alto:h-2},obstaculos,base*2))texto(r.valor,r.x,r.y,r.tamano);
    const siguiente=tramos[i+1];
    const finales=formas.slice(indiceForma);
    const cajas=[...obstaculosAlzado(finales),...finales.flatMap(f=>f.tipo==='cota'?[cajaRotulo(num(f.valor),f.texto.x,f.texto.y,base,f.texto.giro)]:[])];
    const xMin=Math.min(...cajas.map(c=>c.x))-base,yMin=Math.min(...cajas.map(c=>c.y))-base;
    const xMax=Math.max(...cajas.map(c=>c.x+c.ancho))+base,yMax=Math.max(...cajas.map(c=>c.y+c.alto))+base;
    vistas.push({nombre:'Pieza '+(i+1)+' · '+(t.tipo==='bolsa'?'bolsa':'tramo'),xMin,yMin,ancho:xMax-xMin,alto:yMax-yMin});
    grupos.push(finales);
    // La siguiente pieza empieza después de toda la tinta de esta y de sus propias anotaciones superiores.
    // Así el remate inferior no comparte franja con el frente de la pieza siguiente.
    if(siguiente){
      const tieneFrente=i+1===ultimoTramo||siguiente.tipo==='bolsa';
      const remateSiguiente=remate(siguiente.arriba),letra=Math.min(base,siguiente.frente*.88/anchoArial(remateSiguiente.toUpperCase(),1));
      const reserva=Math.max(-cajaRotulo(remateSiguiente,0,-base*2,letra).y,
        tieneFrente?-cajaRotulo(num(siguiente.frente),0,-base*7,base).y:0);
      y=yMax+reserva+base*.5;
    }else y=yMax+base*2;
  }
  if(p.notaPlano?.trim()){texto(p.notaPlano.trim(),0,y,base,'start');y+=base*4;}
  if(!tramos.length)texto('Completa los tramos y bolsas del pedido.',0,y);
  const cajas=[...obstaculosAlzado(formas),...formas.flatMap(f=>f.tipo==='cota'?[cajaRotulo(num(f.valor),f.texto.x,f.texto.y,base,f.texto.giro)]:[])];
  const xMin=Math.min(-margen,...cajas.map(c=>c.x))-base,yMin=Math.min(...cajas.map(c=>c.y))-base;
  const xMax=Math.max(...cajas.map(c=>c.x+c.ancho))+base,yMax=Math.max(...cajas.map(c=>c.y+c.alto))+base;
  return {formas,vista:{xMin,yMin,ancho:xMax-xMin,alto:yMax-yMin},vistas,grupos,letraBase:base,F,H:y};
}
