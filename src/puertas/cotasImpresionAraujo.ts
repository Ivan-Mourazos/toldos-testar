import type { CotaAlzado, FormaAlzado } from './alzado.ts';
import type { LienzoEnrollable } from './planoEnrollable.ts';
import type { CortePuertas, Punto } from './tipos.ts';
import { colocarCotasAraujo } from './rotulosAraujo.ts';
import { entidadesDePieza } from './corteEnPlano.ts';

export const esImpresionAraujo=(c:CortePuertas)=>c.colocadas.some(t=>t.pieza.impresionAraujo||t.pieza.bolsaImpresaAraujo);

/** Muestras de oficina: recupera las rayas del bot, sin girar las piezas ni alterar su corte real. */
export function presentarImpresionAraujo(c:CortePuertas):CortePuertas {
  if(!esImpresionAraujo(c))return c;
  const entidades:CortePuertas['entidades']={lineas:[],textos:[],arcos:[],circulos:[]};
  const reservaStock=Math.max(0,...c.colocadas.filter(t=>t.pieza.id.startsWith('stock-')).map(t=>t.x+t.pieza.ancho*10));
  let x=0;
  const colocadas=c.colocadas.map(t=>{
    // Los sacos de stock rellenan sus retales originales; no son nuevas muestras de la puerta.
    const stock=t.pieza.id.startsWith('stock-'),e=entidadesDePieza(c,t),origen=stock?t.x:x,y=stock?t.y:0;
    entidades.lineas.push(...e.lineas.map(q=>({...q,x1:origen+q.x1*10,x2:origen+q.x2*10,y1:y+q.y1*10,y2:y+q.y2*10})));
    entidades.textos.push(...e.textos.map(q=>({...q,x:origen+q.x*10,y:y+q.y*10,h:q.h*10})));
    entidades.arcos.push(...e.arcos.map(q=>({...q,x:origen+q.x*10,y:y+q.y*10,r:q.r*10})));
    entidades.circulos.push(...e.circulos.map(q=>({...q,x:origen+q.x*10,y:y+q.y*10,r:q.r*10})));
    if(!stock)x=Math.max(x+t.pieza.ancho*10,reservaStock)+1600;
    return {...t,x:origen,y,girada:false};
  });
  return {...c,largo:x-1600,entidades,colocadas};
}

/** Cotas siempre fuera de las muestras: la raya de la E.T. conserva su posición de máquina. */
export function cotasImpresionAraujo(l:LienzoEnrollable,c:CortePuertas,yc:number) {
  if(!esImpresionAraujo(c))return;
  const formas:FormaAlzado[]=[...l.lineas.map(q=>({tipo:'linea' as const,clase:q.capa,x1:q.x1,x2:q.x2,y1:-q.y1,y2:-q.y2})),
    ...l.textos.map(q=>({tipo:'texto' as const,x:q.x,y:-q.y,lineas:[q.valor],tamano:q.h,ancla:q.centrado?'middle' as const:'start' as const,giro:-(q.giro??0)}))];
  const cotas:CotaAlzado[]=[];
  for(const t of c.colocadas){
    if(t.pieza.id.startsWith('stock-'))continue;
    const imp=t.pieza.impresionAraujo;
    const x=t.x/10,y=yc+t.y/10,w=t.pieza.ancho;
    const lateral=imp?.entradas.length?35+20*imp.entradas.length:15;
    cotas.push({tipo:'cota',x1:x,y1:-y,x2:x+w,y2:-y,linea:-y+20,valor:w,marcas:1.5,estilo:'XERAL 5',
      texto:{x:x+w/2,y:-y+30,ancla:'middle'}});
    cotas.push({tipo:'cota',x1:x,y1:-y,x2:x,y2:-y-t.pieza.alto,linea:x-lateral,valor:t.pieza.alto,marcas:1.5,estilo:'XERAL 5',
      texto:{x:x-lateral-5,y:-y-t.pieza.alto/2,ancla:'middle',giro:-90}});
    imp?.entradas.forEach((e,i)=>{
      const marca=e.y-e.ancho/2;
      // Las impresas conservan orientación: la altura de confección cruza el ancho del rollo.
      const cota=(desde:number,hasta:number,linea:number,valor:number):CotaAlzado=>({tipo:'cota',x1:linea>x+w?x+w:x,x2:linea>x+w?x+w:x,y1:-y-desde,y2:-y-hasta,
        linea,valor,marcas:1.5,estilo:'XERAL 5',texto:{x:linea-5,y:-y-(desde+hasta)/2,ancla:'middle',giro:-90}});
      cotas.push(cota(0,marca,x-15-i*20,marca),cota(marca,marca+e.ancho,x+w+15+i*20,e.ancho));
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
