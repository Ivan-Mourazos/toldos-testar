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
  it('6255: la marca superior no lleva cota de 7 ni rótulo de E.T.; conserva la cota inferior de 7',()=>{
    const p=araujo6255(),g=geometriaAlzado(p,calcularPuerta(p)).grupos![0];
    const cuerpo=g.find(f=>f.tipo==='rect')!;
    if(cuerpo.tipo!=='rect')throw Error('Falta el cuerpo');
    const siete=g.filter(f=>f.tipo==='cota').filter(f=>f.valor===7);
    expect(siete).toHaveLength(1);
    expect(siete[0].y2).toBeCloseTo(cuerpo.y+cuerpo.alto);
    expect(g.filter(f=>f.tipo==='texto'&&f.lineas[0]==='E.T.')).toHaveLength(2);
  });
  it('2391: bolsas y cristales en dos filas, de A a B, con 80 cm entre muestras y dos cotas por pieza',()=>{
    const doc=pedido(araujo2391());
    const dxf=escribirPlanoPuertas({pedido:doc,cabecera:{cliente:'ARAUJO',tecnico:'IVÁN',revisor:'',fecha:'2026-11-05'}});
    const registros=registrosDxf(dxf),cotas=registros.filter(r=>r.tipo==='DIMENSION'&&valor(r,3)==='XERA 20');
    const filas=[[[293.5,35.4,0],[404.5,35.4,0]],[[94,39,4],[386,49,4]]];
    const techos:number[]=[];
    for(const fila of filas){
      const anchos=fila.map(([ancho])=>cotas.find(r=>Math.abs(numero(r,42)-ancho)<1e-6)!);
      anchos.forEach(r=>expect(r).toBeDefined());
      expect(numero(anchos[1],13)-numero(anchos[0],14)).toBeCloseTo(.8,5);
      const arriba=fila.map(([,alto,radio],i)=>numero(anchos[i],23)+(alto-radio)/100);
      expect(arriba[0]).toBeCloseTo(arriba[1],5);techos.push(arriba[0]);
      fila.forEach(([,alto,radio],i)=>{
        const ancho=anchos[i],x=numero(ancho,13),y=numero(ancho,23);
        // El escritor ancla las auxiliares de los cristales redondeados al inicio de sus tramos rectos.
        const altura=cotas.find(r=>Math.abs(numero(r,42)-alto)<1e-6&&Math.abs(numero(r,13)-x-radio/100)<1e-6&&Math.abs(numero(r,23)-y+radio/100)<1e-6);
        expect(altura).toBeDefined();
        expect(numero(altura!,10)).toBeLessThan(x);
        expect(numero(ancho,20)).toBeLessThan(y);
      });
    }
    expect(Math.abs(techos[0]-techos[1])).toBeGreaterThan(1);
    for(const material of ['LAC900 AMARILLO','TRANSP. 1000MI'])
      expect(registros.filter(r=>r.tipo==='MTEXT'&&valor(r,8)==='texto'&&valor(r,1)===material)).toHaveLength(1);
  });
  it.each([
    ['5365',araujo5365,'95f07300beba1202e4090f7a0b31c5ba4a98b360aba65ab5754125c70f8f9ffa'],
    ['5733',araujo5733,'8a4024f0892c18541777bbde037231cf3f694e92706aee3ca2c56e05078bd4ec'],
    ['4292',araujo4292,'481760a6a7ca878bb35759b99628b8b24551be7762bc8ee3fee59c0a6ce81582'],
    ['4373',araujo4373,'22bc254bd5706c7ba774f991ed04bb14734f5c3dd3360b0aab330d3667952a45'],
    ['2391',araujo2391,'6a4d929766cc29095885f8297cab165e3ae0255840a248f692fe0b09acfa1b4a'],
    ['6255',araujo6255,'a436b75b9385c97763d7e9526645df94076f2e1c1268b118785962a88835beca'],
  ] as const)('%s: el resultado completo y el DXF del bot conservan la huella de b8c23c3',(_codigo,crear,huella)=>{
    const doc=pedido([crear()].flat());
    expect(createHash('sha256').update(JSON.stringify(generarCortePuertas(doc))).digest('hex')).toBe(huella);
  });
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
