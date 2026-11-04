import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { leerPlanoTexto, presentacionesDxf } from '../flujoDwg/planoDxf.js';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { calcularPuerta } from './calcular.ts';
import { geometriaAlzado } from './alzado.ts';
import { araujo5365, araujo5733, araujo4292, araujo4373, araujo2391, araujo6255 } from './__fixtures__/araujo.ts';
import type { PedidoPuertas } from './tipos.ts';

type Punto = [number,number];
interface Primitiva {tipo:string; capa:string; valor?:string; punto?:Punto; a?:Punto; b?:Punto; h?:number; giro?:number; ancla?:number; r?:number; desde?:number; hasta?:number;espacio?:string;
  recorte?:{centro:Punto;ancho:number;alto:number}}
interface Caja {x0:number; x1:number; y0:number; y1:number; nombre:string}
interface MedidaLetra {ancho:number;izquierda:number;derecha:number;ascenso:number;descenso:number}
const medidasLetra=new Map<string,MedidaLetra>();

function cajaTexto(p:Primitiva):Caja {
  const m=medidasLetra.get(p.valor!);
  if(!m)throw Error('Texto sin medir en Arial: '+p.valor);
  const h=p.h!,w=m.ancho*h,[x,y]=p.punto!,g=(p.giro??0)*Math.PI/180;
  const col=((p.ancla??5)-1)%3,fila=Math.floor(((p.ancla??5)-1)/3);
  // El SVG coloca la base a 0,36 h del centro; h es la mayúscula CAD, no la caja de tinta.
  // Canvas incluye las tildes y lo que bajan las comas y los paréntesis, también en las cotas.
  const inicio=col===0?0:col===1?-w/2:-w,base=fila===0?-h:fila===1?-h*.36:0;
  const x0=inicio-m.izquierda*h,x1=inicio+m.derecha*h,y0=base-m.descenso*h,y1=base+m.ascenso*h;
  const pts=[[x0,y0],[x1,y0],[x0,y1],[x1,y1]].map(([a,b])=>[x+a*Math.cos(g)-b*Math.sin(g),y+a*Math.sin(g)+b*Math.cos(g)]);
  return {x0:Math.min(...pts.map(p=>p[0])),x1:Math.max(...pts.map(p=>p[0])),y0:Math.min(...pts.map(p=>p[1])),y1:Math.max(...pts.map(p=>p[1])),nombre:p.valor!};
}
function cruza(a:Punto,b:Punto,c:Caja) {
  // Recorte de un segmento contra la caja: detecta también diagonales, sin falsos positivos por su caja exterior.
  let lo=0,hi=1;
  const eps=Math.min(c.x1-c.x0,c.y1-c.y0)*.02;
  for(const [v,d,min,max] of [[a[0],b[0]-a[0],c.x0+eps,c.x1-eps],[a[1],b[1]-a[1],c.y0+eps,c.y1-eps]]){
    if(Math.abs(d)<1e-10){if(v<min||v>max)return false;}
    else {const t=[(min-v)/d,(max-v)/d].sort((a,b)=>a-b);lo=Math.max(lo,t[0]);hi=Math.min(hi,t[1]);if(lo>hi)return false;}
  }
  return true;
}
export function solapes(primitivas:Primitiva[]) {
  const textos=primitivas.filter(p=>p.tipo==='texto'&&p.capa!=='RECUADROS').map(cajaTexto);
  const segmentos=primitivas.flatMap(p=>p.capa==='RECUADROS'?[]:p.tipo==='raya'?[{a:p.a!,b:p.b!,capa:p.capa}]:p.tipo==='arco'?Array.from({length:32},(_,i)=>{
    const punto=(k:number):Punto=>{const giro=((p.hasta??360)-(p.desde??0)+360)%360||360;const g=((p.desde??0)+giro*k/32)*Math.PI/180;return [p.punto![0]+p.r!*Math.cos(g),p.punto![1]+p.r!*Math.sin(g)];};
    return {a:punto(i),b:punto(i+1),capa:p.capa};
  }):[]);
  const errores:string[]=[];
  textos.forEach((a,i)=>{
    for(const b of textos.slice(i+1))if(a.x0<b.x1-1e-6&&b.x0<a.x1-1e-6&&a.y0<b.y1-1e-6&&b.y0<a.y1-1e-6)errores.push(`${a.nombre} / ${b.nombre}`);
    for(const b of segmentos)if(cruza(b.a,b.b,a))errores.push(`${a.nombre} / línea ${b.capa}`);
  });
  return errores;
}
const casos={5365:[araujo5365()],5733:[araujo5733()],4292:[araujo4292()],4373:[araujo4373()],2391:araujo2391(),6255:[araujo6255()]};
beforeAll(async()=>{
  const textos=new Set(['PRUEBA','OTRO','VARILLA BLANCA (5,5 MM)','139,5']);
  for(const [codigo,inputs]of Object.entries(casos)){
    const pedido:PedidoPuertas={schemaVersion:1,kind:'puertas',orderCode:'AR260'+codigo,elementos:inputs.map((input,i)=>({id:'p'+i,input}))};
    const corte=generarCortePuertas(pedido);
    const dxf=escribirPlanoPuertas({pedido,cabecera:{cliente:'ARAUJO',tecnico:'IVÁN',revisor:'',fecha:'2026-11-04'}});
    for(const src of [corte.archivo!.dxf,dxf])for(const p of leerPlanoTexto(src).modelo)if(p.tipo==='texto')textos.add(p.valor);
  }
  const temporal=path.resolve('tmp/araujo/salida-legible/pruebas-letra');
  await fs.mkdir(temporal,{recursive:true});
  const anteriores={TEMP:process.env.TEMP,TMP:process.env.TMP,TMPDIR:process.env.TMPDIR};
  Object.assign(process.env,{TEMP:temporal,TMP:temporal,TMPDIR:temporal});
  const registro=path.join(temporal,'chromium.log');
  const navegador=await chromium.launch({args:['--log-file='+registro],env:{...process.env,CHROME_LOG_FILE:registro}});
  try{
    const pagina=await navegador.newPage();
    const medidas=await pagina.evaluate(valores=>{
      const c=document.createElement('canvas').getContext('2d')!;c.font='1000px Arial';
      return valores.map(s=>{const m=c.measureText(s);return [s,{ancho:m.width/716,izquierda:m.actualBoundingBoxLeft/716,derecha:m.actualBoundingBoxRight/716,ascenso:m.actualBoundingBoxAscent/716,descenso:m.actualBoundingBoxDescent/716}] as const;});
    },[...textos]);
    for(const [s,m]of medidas)medidasLetra.set(s,m);
  }finally{
    await navegador.close();
    for(const [k,v]of Object.entries(anteriores))if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
},60000);
describe('Legibilidad de los planos ARAUJO y su corte',()=>{
  it('detecta el remate de una pieza contra la cota del frente siguiente aunque sus alturas nominales no se crucen',()=>{
    const rod:Primitiva={tipo:'texto',capa:'texto',valor:'VARILLA BLANCA (5,5 MM)',punto:[0,0],h:5,giro:0,ancla:5};
    const frente:Primitiva={tipo:'texto',capa:'cotas',valor:'139,5',punto:[0,-5],h:5,giro:0,ancla:5};
    expect(solapes([rod,frente])).toContain('VARILLA BLANCA (5,5 MM) / 139,5');
  });
  it('el detector encuentra texto contra texto, línea y arco, también girados',()=>{
    const t:Primitiva={tipo:'texto',capa:'texto',valor:'PRUEBA',punto:[0,0],h:10,giro:90,ancla:5};
    expect(solapes([t,{...t,valor:'OTRO'}])).toContain('PRUEBA / OTRO');
    expect(solapes([t,{tipo:'raya',capa:'marca',a:[-20,0],b:[20,0]}])).toContain('PRUEBA / línea marca');
    expect(solapes([t,{tipo:'arco',capa:'curva',punto:[0,0],r:3,desde:0,hasta:90}])).not.toEqual([]);
    expect(solapes([t,{tipo:'raya',capa:'marca',a:[20,0],b:[30,10]}])).toEqual([]);
  });
  it.each(Object.entries(casos))('%s: textos y cotas sin pisarse ni cruzar líneas del DXF', (codigo,inputs)=>{
    const pedido:PedidoPuertas={schemaVersion:1,kind:'puertas',orderCode:'AR260'+codigo,elementos:inputs.map((input,i)=>({id:'p'+i,input}))};
    const corte=generarCortePuertas(pedido);
    expect(corte.avisos.filter(a=>a.nivel==='error')).toEqual([]);
    expect(solapes(leerPlanoTexto(corte.archivo!.dxf).modelo)).toEqual([]);
    const dxf=escribirPlanoPuertas({pedido,cabecera:{cliente:'ARAUJO',tecnico:'IVÁN',revisor:'',fecha:'2026-11-04'}});
    inputs.forEach((p,i)=>{
      const g=geometriaAlzado(p,calcularPuerta(p),String.fromCharCode(65+i));
      expect(g.grupos).toHaveLength(p.araujo!.tramos.length);
      g.grupos!.forEach((grupo,j)=>{
        const textos=grupo.flatMap(f=>f.tipo==='texto'?f.lineas:[]);
        expect(textos).toContain(String.fromCharCode(65+i)+(j+1));
        expect(textos).toContain('X'+p.cantidad*p.araujo!.tramos[j].cantidad);
        expect(textos.filter(s=>s==='AL CORTE')).toHaveLength(2);
      });
    });
    const modelo=leerPlanoTexto(dxf);
    expect(solapes(modelo.modelo)).toEqual([]);
    const hojas=presentacionesDxf(dxf);
    expect(hojas).toHaveLength(inputs.length);
    for(const hoja of hojas){
      const dibujo:Primitiva[]=hoja.primitivas.filter((p:Primitiva)=>p.espacio?.startsWith('ventana '));
      expect(dibujo.filter(p=>p.tipo==='texto').length).toBeGreaterThan(10);
      expect(solapes(dibujo)).toEqual([]);
      for(const p of dibujo.filter(p=>p.tipo==='texto'&&p.recorte)){
        const b=cajaTexto(p),v=p.recorte!;
        expect(b.x0,p.valor).toBeGreaterThanOrEqual(v.centro[0]-v.ancho/2-.1);
        expect(b.x1,p.valor).toBeLessThanOrEqual(v.centro[0]+v.ancho/2+.1);
        expect(b.y0,p.valor).toBeGreaterThanOrEqual(v.centro[1]-v.alto/2-.1);
        expect(b.y1,p.valor).toBeLessThanOrEqual(v.centro[1]+v.alto/2+.1);
      }
    }
  });
});
