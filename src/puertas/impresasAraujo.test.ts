import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { geometriaAlzado } from './alzado.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { cotasImpresionAraujo, presentarImpresionAraujo } from './cotasImpresionAraujo.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { registrosDxf, numero, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { araujo2391, araujo6255, araujo5365, araujo5733, araujo4292, araujo4373 } from './__fixtures__/araujo.ts';
import type { PedidoPuertas, Puerta } from './tipos.ts';
import type { LienzoEnrollable } from './planoEnrollable.ts';
import { entidadesDePieza } from './corteEnPlano.ts';

const pedido=(inputs:Puerta[]):PedidoPuertas=>({schemaVersion:1,kind:'puertas',orderCode:'AR2506255',elementos:inputs.map((input,i)=>({id:'p'+i,input}))});
describe('Correcciones de Iván: marcas y piezas independientes de Araujo',()=>{
  it('6255: las cotas izquierdas miden del corte inferior a las marcas rojas y la cadena derecha une marcas',()=>{
    const p=araujo6255(),g=geometriaAlzado(p,calcularPuerta(p)).grupos![0];
    const rect=g.find(f=>f.tipo==='rect')!;
    if(rect.tipo!=='rect')throw Error('Falta el cuerpo');
    const marcas=g.filter(f=>f.tipo==='linea'&&f.clase==='puerta-marca').map(f=>f.tipo==='linea'?f.y1:0);
    const cotas=g.filter(f=>f.tipo==='cota');
    for(const medida of [72.7,162.7,300.4]){
      const c=cotas.find(c=>Math.abs(c.valor-medida)<1e-6)!;
      expect(c).toBeDefined();expect(c.y2).toBeCloseTo(rect.y+rect.alto);
      expect(marcas.some(y=>Math.abs(y-c.y1)<1e-6)).toBe(true);
    }
    for(const medida of [65.7,90,137.7]){
      const c=cotas.find(c=>Math.abs(c.valor-medida)<1e-6)!;
      expect(c).toBeDefined();
      expect(marcas.some(y=>Math.abs(y-c.y1)<1e-6)).toBe(true);
      expect(marcas.some(y=>Math.abs(y-c.y2)<1e-6)).toBe(true);
    }
  });
  it('6255: cuerpo, cabecera y bolsa conservan medidas; las muestras quedan horizontales, separadas y con cotas exteriores',()=>{
    const v=generarCortePuertas(pedido([araujo6255()]));
    expect(v.resultados[0].piezas.map(p=>[p.ancho,p.alto])).toEqual([[147,300],[147,9.4],[139.5,35.4]]);
    for(const original of v.cortes){
      const antes=JSON.stringify(original);
      const c=presentarImpresionAraujo(original);
      expect(JSON.stringify(original)).toBe(antes);
      expect(c.colocadas.every(t=>!t.girada)).toBe(true);
      const l:LienzoEnrollable={lineas:[],polilineas:[],textos:[],cotas:[],inserciones:[],sombreados:[],arcos:[],circulos:[]};
      cotasImpresionAraujo(l,c,0);
      for(const q of l.cotas.filter(q=>q.giro===90)){
        // La auxiliar sale del borde próximo: tampoco debe atravesar el interior de la muestra.
        expect(c.colocadas.some(t=>Math.abs(q.x1-(q.d>q.x1?t.x/10+t.pieza.ancho:t.x/10))<1e-6)).toBe(true);
      }
      for(const t of c.colocadas){
        const x=t.x/10,y=t.y/10,w=t.pieza.ancho,h=t.pieza.alto;
        expect(l.cotas.some(q=>Math.abs(q.valor-h)<1e-6&&q.giro===90)).toBe(true);
        expect(l.cotas.some(q=>q.valor===w&&q.giro===0)).toBe(true);
        for(const q of l.cotas)expect(q.giro===90?q.d<=x||q.d>=x+w:q.d<=y||q.d>=y+h).toBe(true);
      }
      for(const [i,t]of c.colocadas.entries())for(const otra of c.colocadas.slice(i+1))
        expect(otra.x-t.x-t.pieza.ancho*10).toBeGreaterThanOrEqual(1400);
    }
  });
  it.each([
    ['5365',araujo5365,'8731ea90b4d4c773d18c0b26b4c7ee49064b9902d89d063272ed120c288e457d'],
    ['5733',araujo5733,'a8cc252132663da218dd6b6cc0875a9142b1d70638a931e89a58d362bcd04495'],
    ['4292',araujo4292,'77de5aa841397bd6b400714add03454c05b54fc8d540ab0d727b420fcf63c5d0'],
    ['4373',araujo4373,'ec4469b30074a818f476a40d4d6f5d854ca4fc1afbad90c6ed8ac88c037d96fe'],
  ] as const)('%s: el corte, el alzado y el plano no impresos conservan la huella previa a esta revisión',(codigo,crear,huella)=>{
    const p=crear(),doc={...pedido([p]),orderCode:'AR260'+codigo};
    const datos=[generarCortePuertas(doc),[geometriaAlzado(p,calcularPuerta(p))],escribirPlanoPuertas({pedido:doc,cabecera:{cliente:'ARAUJO',tecnico:'IVÁN',revisor:'',fecha:'2026-11-05'}})];
    expect(createHash('sha256').update(JSON.stringify(datos)).digest('hex')).toBe(huella);
  });
  it('la presentación impresa conserva juntos los sacos de stock de los retales, sin dispersarlos entre muestras',()=>{
    const v=generarCortePuertas(pedido([araujo6255()]),{ofStockSacos:'0233011'});
    const original=v.cortes.find(c=>c.colocadas.some(t=>t.pieza.impresionAraujo))!;
    const c=presentarImpresionAraujo(original),stock=original.colocadas.filter(t=>t.pieza.id.startsWith('stock-'));
    expect(stock.length).toBeGreaterThan(0);
    expect(c.colocadas.filter(t=>t.pieza.id.startsWith('stock-'))).toEqual(stock);
    expect(c.largo).toBeLessThanOrEqual(original.largo+1470+1600);
  });
  it('2391: cada puerta tiene sus muestras de cristal y bolsa, incluso con la misma OF',()=>{
    const inputs=araujo2391();inputs[1].of=inputs[0].of;
    const v=generarCortePuertas(pedido(inputs));
    const auxiliares=v.cortes.filter(c=>c.colocadas.some(t=>t.pieza.clase==='cristal'||t.pieza.clase==='saco'));
    expect(auxiliares).toHaveLength(4);
    auxiliares.forEach(c=>{
      expect(new Set(c.colocadas.map(t=>t.pieza.id.split(':')[0])).size).toBe(1);
      expect(c.colocadas.every(t=>!t.girada)).toBe(true);
    });
    expect(auxiliares.filter(c=>c.colocadas[0].pieza.clase==='cristal').map(c=>c.colocadas[0].pieza.multiplicador).sort()).toEqual([1,2]);
    for(const c of auxiliares)for(const t of c.colocadas.filter(t=>t.pieza.clase==='cristal')){
      const e=entidadesDePieza(c,t),p=t.pieza;
      expect(e.lineas.filter(q=>q.capa==='DISCO1').reduce((s,q)=>s+Math.hypot(q.x2-q.x1,q.y2-q.y1),0)).toBeCloseTo(2*(p.ancho+p.alto)-8*p.radio);
      expect(e.arcos).toHaveLength(4);
    }
  });
  it('2391: la envolvente completa de cada alzado deja al menos 150 cm antes de la siguiente puerta',()=>{
    const inputs=araujo2391(),doc=pedido(inputs);
    const dxf=escribirPlanoPuertas({pedido:doc,cabecera:{cliente:'ARAUJO',tecnico:'IVÁN',revisor:'',fecha:'2026-11-05'}});
    const textos=registrosDxf(dxf).filter(r=>r.tipo==='MTEXT'&&['A1','B1'].includes(valor(r,1)));
    const b=textos.find(t=>valor(t,1)==='B1')!;
    const g0=geometriaAlzado(inputs[0],calcularPuerta(inputs[0])),g1=geometriaAlzado(inputs[1],calcularPuerta(inputs[1]),'B');
    const local=g1.formas.find(f=>f.tipo==='texto'&&f.lineas[0]==='B1');
    if(local?.tipo!=='texto')throw Error('Falta B1');
    const dy=(numero(b,20)-100)*100+local.y;
    expect(-g0.vista.yMin-g0.vista.alto-(dy-g1.vista.yMin)).toBeGreaterThanOrEqual(150);
  });
  it('separa también un cristal alto de otra puerta cuando necesita girarse para caber en su rollo',()=>{
    const inputs=araujo2391(),t=inputs[0].araujo!.tramos[1];
    t.alto=220;t.ventanas=[{...t.ventanas[0],alto:145}];
    const v=generarCortePuertas(pedido(inputs));
    expect(v.avisos.filter(a=>a.nivel==='error')).toEqual([]);
    expect(v.archivo).not.toBeNull();
    const cristal=v.cortes.flatMap(c=>c.colocadas).find(t=>t.pieza.clase==='cristal'&&t.pieza.alto===149)!;
    expect(cristal.girada).toBe(true);
  });
});
