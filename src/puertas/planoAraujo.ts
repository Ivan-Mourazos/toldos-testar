import { corregirRotulosPuertas } from './presentacionImpresion.js';
import { anchoArial, textoSeguro } from '../domain/corteLona/texto.js';
import { geometriaAlzado } from './alzado.ts';
import { calcularPuerta } from './calcular.ts';
import { cotasImpresionAraujo, esImpresionAraujo, presentarImpresionAraujo } from './cotasImpresionAraujo.ts';
import { corteEnPlano, entidadesDePieza, textosFuera } from './corteEnPlano.ts';
import { ENTRE_MUESTRAS } from './planoTaller.ts';
import { bloqueFlechaEnrollable, dibujarCorte, hojasPuertas, lienzoAMetros, origenCorte, sumarLienzo, type LienzoEnrollable } from './planoEnrollable.ts';
import type { CortePuertas, PedidoPuertas, Punto } from './tipos.ts';

const vacio=():LienzoEnrollable=>({lineas:[],polilineas:[],textos:[],cotas:[],inserciones:[],sombreados:[],arcos:[],circulos:[]});
const capa=(clase:string)=>clase.includes('marca')?'ROTULADOR':clase.includes('referencia')?'referencias':clase.includes('eje')?'ejes':clase.includes('cristal')?'corte (vent)':clase.includes('ventana')?'curv':'DISCO1';
function rect(l:LienzoEnrollable,c:string,x:number,y:number,w:number,h:number,r=0){
  if(!r){l.polilineas.push({capa:c,puntos:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],cerrada:true});return;}
  const b=Math.tan(Math.PI/8);
  l.polilineas.push({capa:c,cerrada:true,puntos:[[x+r,y],[x+w-r,y],[x+w,y+r],[x+w,y+h-r],[x+w-r,y+h],[x+r,y+h],[x,y+h-r],[x,y+r]],curvas:[0,b,0,b,0,b,0,b]});
}
/** Cada material auxiliar ocupa una fila de muestras; los cortes originales del bot se conservan. */
function filasCorte(cortes:CortePuertas[],pedido:PedidoPuertas):CortePuertas[][] {
  const filas:CortePuertas[][]=[];
  for(const c of cortes){
    const clase=c.colocadas[0]?.pieza.clase;
    const muestra=pedido.elementos.length>1&&['saco','cristal'].includes(clase)&&c.colocadas.every(t=>t.pieza.clase===clase);
    const fila=muestra?filas.find(f=>f[0].material===c.material&&f[0].anchoRollo===c.anchoRollo&&f[0].opcion===c.opcion
      &&f[0].colocadas.every(t=>t.pieza.clase===clase)):undefined;
    if(fila)fila.push(c);else filas.push([c]);
  }
  return filas;
}
/** Plano de oficina y corte recibido del anidado común: las curvas y marcas proceden de las mismas medidas. */
export function escribirPlanoAraujo(pedido:PedidoPuertas,cortes:CortePuertas[],cabecera:{cliente:string;tecnico:string;revisor:string;fecha:string},subtitulo='MEDIDAS EN CM · ARAUJO · TRAMOS Y BOLSAS'):string{
  const l=vacio();let dy=0,ancho=0,izquierda=0,bajoAnterior=0;
  const zonasPuertas:Array<{x0:number;y0:number;x1:number;y1:number}>=[];
  const hojas:Array<{nombre:string;zona:{x0:number;y0:number;x1:number;y1:number};cajetin:{HOJA:string;OF:string}}>=[];
  for(const [i,e] of pedido.elementos.entries()){
    const g=geometriaAlzado(e.input,calcularPuerta(e.input),String.fromCharCode(65+i));
    if(i>0&&e.input.araujo)dy=bajoAnterior+g.vista.yMin-180;
    const ofsPuerta=[...new Set([e.input.of,...e.input.araujo?.tramos.map(t=>t.of)??[]].filter(Boolean))];
    hojas.push({nombre:String.fromCharCode(65+i),zona:{x0:100+g.vista.xMin/100,x1:100+(g.vista.xMin+g.vista.ancho)/100,
      y0:100+(dy-g.vista.yMin-g.vista.alto)/100,y1:100+(dy-g.vista.yMin)/100},cajetin:{HOJA:(i+1)+'/'+pedido.elementos.length,OF:ofsPuerta.length>1?'VARIAS':e.input.of}});
    if(g.cad)sumarLienzo(l,g.cad,0,dy);
    else for(const f of g.formas){
      if(f.tipo==='rect')rect(l,capa(f.clase),f.x,dy-f.y-f.alto,f.ancho,f.alto,f.radio);
      else if(f.tipo==='linea')l.lineas.push({capa:capa(f.clase),x1:f.x1,x2:f.x2,y1:dy-f.y1,y2:dy-f.y2});
      else if(f.tipo==='texto')l.textos.push({capa:'texto',valor:textoSeguro(f.lineas.join(' · ')),x:f.x,y:dy-f.y,h:f.tamano??g.letraBase,centrado:f.ancla==='middle',...(f.ancla==='end'?{ancla:6}:{}),giro:-(f.giro??0)});
      else if(f.tipo==='cota')l.cotas.push({capa:'cotas',estilo:f.estilo??'XERAL',x1:f.x1,x2:f.x2,y1:dy-f.y1,y2:dy-f.y2,d:f.x1===f.x2?f.linea:dy-f.linea,giro:f.x1===f.x2?90:0,valor:f.valor,textoHorizontal:f.x1===f.x2&&!f.texto.giro,...(f.texto.fijar?{posicionTexto:[f.texto.x,dy-f.texto.y] as Punto}:{})});
      else l.polilineas.push({capa:capa(f.clase),puntos:f.puntos.map(([x,y]):Punto=>[x,dy-y]),cerrada:f.tipo==='poligono'});
    }
    zonasPuertas.push({x0:100+g.vista.xMin/100,x1:100+(g.vista.xMin+g.vista.ancho)/100,y0:100+(dy-g.vista.yMin-g.vista.alto)/100,y1:100+(dy-g.vista.yMin)/100});
    bajoAnterior=dy-g.vista.yMin-g.vista.alto;
    izquierda=Math.min(izquierda,g.vista.xMin);ancho=Math.max(ancho,g.vista.xMin+g.vista.ancho);dy-=g.vista.alto+50;
  }
  const za={x0:100+izquierda/100,y0:100+dy/100,x1:100+ancho/100,y1:101};
  const lc=vacio();let yc=0,wc=0;
  const zonasCorte:Array<{x0:number;y0:number;x1:number;y1:number}>=[];
  for(const fila of filasCorte(cortes,pedido)){
    if(fila.length>1){
      const orden=(id:string)=>pedido.elementos.findIndex(e=>id.startsWith(e.id+':'));
      const muestras=fila.flatMap(c=>c.colocadas.map(t=>({c,t}))).sort((a,b)=>orden(a.t.pieza.id)-orden(b.t.pieza.id));
      const techo=yc;let x=0,fondo=techo;
      for(const {c,t} of muestras){
        const p=t.pieza,y=techo-p.alto;
        // Igual que la rama muestra de Portanova: rayas locales del bot, sin volver a cortar ni rotular.
        sumarLienzo(lc,{...vacio(),...entidadesDePieza(c,t)},x,y);
        lc.cotas.push({capa:'cotas',estilo:'XERA 20',x1:x,y1:y,x2:x+p.ancho,y2:y,d:y-30,giro:0,valor:p.ancho},
          {capa:'cotas',estilo:'XERA 20',x1:x,y1:y,x2:x,y2:techo,d:x-35,giro:90,valor:p.alto});
        x+=p.ancho+ENTRE_MUESTRAS;fondo=Math.min(fondo,y);
      }
      const anchoFila=x-ENTRE_MUESTRAS,titulo=textoSeguro(fila[0].material),hTitulo=Math.max(10,Math.min(20,anchoFila/10));
      lc.textos.push({capa:'texto',valor:titulo,x:anchoFila/2,y:techo+30,h:hTitulo,centrado:true});
      zonasCorte.push({x0:Math.min(-75,anchoFila/2-anchoArial(titulo,hTitulo)/2-5),y0:fondo-80,
        x1:Math.max(anchoFila+40,anchoFila/2+anchoArial(titulo,hTitulo)/2+5),y1:techo+50});
      wc=Math.max(wc,anchoFila);yc=fondo-140;
      continue;
    }
    const original=fila[0];
    const c=presentarImpresionAraujo(original),impresa=esImpresionAraujo(c);
    const ocupado=Math.max(0,...c.colocadas.map(t=>t.y/10+(t.girada?t.pieza.ancho:t.pieza.alto)));
    yc-=ocupado;
    const fuera=textosFuera(c);
    const e=corteEnPlano({...c,entidades:{...c.entidades,textos:c.entidades.textos.filter(t=>!fuera.includes(t))}},yc);
    sumarLienzo(lc,{...vacio(),...e});
    cotasImpresionAraujo(lc,c,yc);
    const titulo=textoSeguro(c.material),hTitulo=Math.max(10,Math.min(20,c.largo/100));
    lc.textos.push({capa:'texto',valor:titulo,x:c.largo/20,y:yc+ocupado+30,h:hTitulo,centrado:true});
    if(!impresa)lc.cotas.push({capa:'cotas',estilo:'XERA 20',x1:0,y1:yc,x2:c.largo/10,y2:yc,d:yc-45,giro:0,valor:c.largo/10,posicionTexto:[c.largo/20,yc-65]},
      {capa:'cotas',estilo:'XERA 20',x1:0,y1:yc,x2:0,y2:yc+ocupado,d:-35,giro:90,valor:ocupado});
    zonasCorte.push({x0:Math.min(impresa?Math.min(-100,...lc.cotas.filter(q=>q.giro===90).map(q=>q.d-15)):-75,c.largo/20-anchoArial(titulo,hTitulo)/2-5),y0:yc-80,
      x1:Math.max(c.largo/10+40,c.largo/20+anchoArial(titulo,hTitulo)/2+5),y1:yc+ocupado+50});
    wc=Math.max(wc,c.largo/10);yc-=140;
  }
  const santaPau=pedido.elementos.every(e=>e.input.santapau),corteSanta=santaPau?dibujarCorte(cortes,pedido):null;
  const zona=corteSanta?.zona??{x0:-70,y0:yc+60,x1:wc+40,y1:100},[ox,oy]=origenCorte(za,zona);
  const zc={x0:ox+zona.x0/100,y0:oy+zona.y0/100,x1:ox+zona.x1/100,y1:oy+zona.y1/100};
  const ofs=[...new Set(pedido.elementos.flatMap(e=>[e.input.of.trim(),...e.input.araujo?.tramos.map(t=>t.of?.trim()??'')??[]]).filter(Boolean))];
  return corregirRotulosPuertas({...lienzoAMetros(l,100,100),corte:lienzoAMetros(corteSanta?.lienzo??lc,ox,oy),...(santaPau
    ?{zonas:{toldos:za,corte:zc},hojas:hojasPuertas(pedido,zonasPuertas),bloques:[{...bloqueFlechaEnrollable,capa:'marca'}],capas:[{nombre:'cortes - lona',color:7},{nombre:'corte (vent)',color:5}]}
    :{hojas,girarCorte:false,zonas:{toldos:za,corte:zc,cortes:zonasCorte.map(z=>({x0:ox+z.x0/100,y0:oy+z.y0/100,x1:ox+z.x1/100,y1:oy+z.y1/100}))}})},
    {pedido:pedido.orderCode,of:ofs.length>1?'VARIAS':ofs[0]??'',cliente:textoSeguro(cabecera.cliente),tecnico:textoSeguro(cabecera.tecnico),revisor:textoSeguro(cabecera.revisor),
      fecha:cabecera.fecha,pagina:'1/1',material:[...new Set(cortes.map(c=>textoSeguro(c.material)))].join(' / '),subtitulo}).dxf;
}
