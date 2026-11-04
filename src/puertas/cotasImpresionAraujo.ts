import type { CotaAlzado, FormaAlzado } from './alzado.ts';
import type { LienzoEnrollable } from './planoEnrollable.ts';
import type { CortePuertas, Punto } from './tipos.ts';
import { colocarCotasAraujo } from './rotulosAraujo.ts';

/** Solo oficina: posición de la raya que se marca a mano y ancho de E.T.; nunca añade tiras al bot. */
export function cotasImpresionAraujo(l:LienzoEnrollable,c:CortePuertas,yc:number) {
  const formas:FormaAlzado[]=[...l.lineas.map(q=>({tipo:'linea' as const,clase:q.capa,x1:q.x1,x2:q.x2,y1:-q.y1,y2:-q.y2})),
    ...l.textos.map(q=>({tipo:'texto' as const,x:q.x,y:-q.y,lineas:[q.valor],tamano:q.h,ancla:q.centrado?'middle' as const:'start' as const,giro:-(q.giro??0)}))];
  const cotas:CotaAlzado[]=[];
  for(const t of c.colocadas){
    const imp=t.pieza.impresionAraujo;
    if(!imp)continue;
    const x=t.x/10,y=yc+t.y/10,w=t.pieza.ancho;
    if(imp.partes>1){
      cotas.push({tipo:'cota',x1:x,y1:-y,x2:x+w,y2:-y,linea:-y+20,valor:w,marcas:1.5,estilo:'XERAL 5',
        texto:{x:x+w/2,y:-y+30,ancla:'middle'}});
      if(imp.parte>1)cotas.push({tipo:'cota',x1:x+w,y1:-y,x2:x+w,y2:-y-t.pieza.alto,linea:x+w+15,valor:t.pieza.alto,marcas:1.5,estilo:'XERAL 5',
        texto:{x:x+w+23,y:-y-t.pieza.alto/2,ancla:'middle',giro:-90}});
    }
    imp.entradas.forEach((e,i)=>{
      const marca=e.y-e.ancho/2;
      // Las impresas conservan orientación: la altura de confección cruza el ancho del rollo.
      const cota=(desde:number,hasta:number,linea:number,valor:number):CotaAlzado=>({tipo:'cota',x1:x,x2:x,y1:-y-desde,y2:-y-hasta,
        linea,valor,marcas:1.5,estilo:'XERAL 5',texto:{x:linea-5,y:-y-(desde+hasta)/2,ancla:'middle',giro:-90}});
      cotas.push(cota(0,marca,x+12+i*15,marca),cota(marca,marca+e.ancho,x+w-15,e.ancho));
      const eje={capa:'ejes',x1:x,y1:y+e.y,x2:x+w,y2:y+e.y};
      l.lineas.push(eje);formas.push({tipo:'linea',clase:'puerta-eje',x1:eje.x1,y1:-eje.y1,x2:eje.x2,y2:-eje.y2});
    });
  }
  formas.push(...cotas);
  colocarCotasAraujo(formas,5);
  for(const q of cotas){
    const vertical=q.x1===q.x2;
    l.cotas.push({capa:'cotas',estilo:q.estilo!,x1:q.x1,x2:q.x2,y1:-q.y1,y2:-q.y2,d:vertical?q.linea:-q.linea,giro:vertical?90:0,
      valor:q.valor,posicionTexto:[q.texto.x,-q.texto.y] as Punto,textoHorizontal:vertical&&!q.texto.giro});
  }
}
