import { describe, expect, it } from 'vitest';
import { geometriaAlzado } from './alzado.ts';
import { calcularPuerta } from './calcular.ts';
import { pedidosSantaPau } from './__fixtures__/santapau.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { leerPlanoTexto } from '../flujoDwg/planoDxf.js';
import { generarCortePuertas } from './corte.ts';
import { presentacionesDxf } from '../flujoDwg/planoDxf.js';
import type { Punto } from './tipos.ts';

describe('Santa Pau: entidades de confección del 4815 de Iván',()=>{
 it.each(pedidosSantaPau()[0].elementos)('$id: seis refuerzos acotados, tres flechas, ejes, solapes y velcros',({input:p})=>{
  const g=geometriaAlzado(p,calcularPuerta(p));
  const l=g.cad!;
  expect(l).toBeDefined();
  expect(l.cotas.filter(c=>c.valor===8)).toHaveLength(6);
  expect(l.cotas.filter(c=>c.valor===p.frente)).toHaveLength(2);
  expect(l.inserciones.filter(c=>c.nombre==='FLECHA2')).toHaveLength(3);
  expect(l.lineas.filter(c=>c.capa==='ejes')).toHaveLength(3);
  expect(l.lineas.filter(c=>c.capa==='borrar')).toHaveLength(3);
  expect(l.sombreados.filter(c=>c.patron==='ANSI31')).toHaveLength(7);
  expect(l.sombreados.filter(c=>c.patron==='ANGLE')).toHaveLength(1);
  expect(l.polilineas).toContainEqual(expect.objectContaining({capa:'corte (vent)',puntos:[[-1,123-p.alto],[p.frente+1,123-p.alto],[p.frente+1,187-p.alto],[-1,187-p.alto]]}));
  expect(l.textos.filter(c=>c.valor==='REFUERZO EN E.T.')).toHaveLength(6);
  expect(l.textos.some(c=>c.valor==='REVÉS')).toBe(true);
  expect(l.textos.some(c=>c.valor===p.of)).toBe(true);
  expect(l.textos.some(c=>/LOGO|POR CONFIRMAR|CONTRASTE/i.test(c.valor))).toBe(false);
 });
 it('el DXF mantiene bloques, arcos, tramas y cotas de cada puerta, con el texto junto a sus refuerzos',()=>{
  const pedido=pedidosSantaPau()[0];
  const d=leerPlanoTexto(escribirPlanoPuertas({pedido,cabecera:{cliente:'SANTA PAU',tecnico:'IVÁN',revisor:'',fecha:'04/11/2026'}})) as {modelo:Array<{tipo:string;nombre:string;patron:string;capa:string;medida:number;texto:Punto;a:Punto;valor:string}>};
  expect(d.modelo.filter(p=>p.tipo==='bloque'&&p.nombre==='FLECHA2')).toHaveLength(6);
  expect(d.modelo.filter(p=>p.tipo==='sombreado'&&p.patron==='ANSI31')).toHaveLength(14);
  expect(d.modelo.filter(p=>p.tipo==='arco'&&p.capa==='texto')).toHaveLength(12);
  const cotas=d.modelo.filter(p=>p.tipo==='cota'&&Math.abs(p.medida-8)<.001);
  expect(cotas).toHaveLength(12);
  expect(cotas.every(p=>Math.abs(p.texto[0]-p.a[0])<.3&&Math.abs(p.texto[1]-p.a[1])<.3)).toBe(true);
  expect(d.modelo.some(p=>p.tipo==='texto'&&p.valor==='SOLDADURA 2CM')).toBe(true);
 });
 it('el bot lleva las tres flechas y la señal circular del bajo que están en el CORTE de cada puerta',()=>{
  const c=generarCortePuertas(pedidosSantaPau()[0]);
  const panos=c.resultados[0].piezas.filter(p=>p.clase==='pano');
  expect(panos[0].marcas.filter(m=>m[0]===m[2]&&Math.abs(m[3]-m[1])===1)).toHaveLength(1);
  expect(panos[1].marcas.filter(m=>m[0]===m[2]&&Math.abs(m[3]-m[1])===1)).toHaveLength(2);
  expect(c.archivo!.entidades.circulos.filter(a=>a.capa==='ROTULADOR'&&a.r===7.3)).toHaveLength(2);
 });
 it('5363 revisado: inferiores137,5, tubo121, flecha superior en la E.T. y las dos cotas nuevas del cristal',()=>{
  const p=pedidosSantaPau()[1].elementos[0].input,r=calcularPuerta(p),g=geometriaAlzado(p,r);
  expect(p.entradas.map(e=>e.altura)).toEqual([59,121,210]);
  expect(r.piezas.filter(p=>p.clase==='pano').map(p=>p.alto)).toEqual([149,137.5]);
  expect(g.cad!.cotas.filter(c=>c.valor===199||c.valor===64)).toHaveLength(2);
  const superior=r.piezas.find(p=>p.nombre==='Paño superior')!;
  expect(superior.marcas).toContainEqual([98.5,19.5,98.5,18.5]);
  expect(superior.marcas.some(m=>m[0]===m[2]&&m[1]===142)).toBe(false);
 });

 it.each(pedidosSantaPau()[1].elementos)('$id: rótulos y cotas del5363 quedan centrados en sus huecos libres',({input:p})=>{
  const letra=p.frente===197?'A':'B',l=geometriaAlzado(p,calcularPuerta(p),letra).cad!,y=(a:number)=>a-p.alto;
  // DWG5363: la nota central queda debajo del eje121, junto a los refuerzos.
  const notas=l.textos.filter(t=>t.valor==='5 CM (HUECOS)').map(t=>t.y).sort((a,b)=>a-b);
  for(const [i,valor]of [72,109,223].entries())expect(notas[i]).toBeCloseTo(y(valor),3);
  expect(l.textos.some(t=>t.valor==='X'+p.cantidad)).toBe(true);
  const mirilla=l.textos.find(t=>t.valor===letra)!;
  expect(mirilla.y).toBeCloseTo(y(158),3);
  expect(mirilla.ancla).toBe(5);
  expect(mirilla.x).toBe(p.frente/2);
  const formas=geometriaAlzado(p,calcularPuerta(p),letra).formas;
  expect(formas).toContainEqual(expect.objectContaining({tipo:'texto',lineas:['velcro(5) bravo reves al corte'],alineacionVertical:'middle'}));
  expect(formas).toContainEqual(expect.objectContaining({tipo:'cota',valor:135,tamanoTexto:10}));
  const centrales=l.cotas.filter(c=>c.valor===8&&Math.abs(c.y1-y(125.5))<.001);
  expect(centrales).toHaveLength(2);
  expect(centrales.every(c=>Math.abs(c.d-y(133))<.001)).toBe(true);
 });
 it('el DXF separa las cotas135/195 y permite ampliar los ejes a14 cm',()=>{
  const pedido=pedidosSantaPau()[1];
  const d=leerPlanoTexto(escribirPlanoPuertas({pedido,cabecera:{cliente:'SANTA PAU',tecnico:'IVÁN',revisor:'',fecha:'04/11/2026'}})) as {modelo:Array<{tipo:string;deCota:boolean;valor:string;h:number}>};
  const textos=d.modelo.filter(p=>p.deCota&&p.tipo==='texto'&&['135','195','59','121','210'].includes(p.valor));
  expect(textos).toHaveLength(10);
  expect(textos.every(t=>Math.abs(t.h-(['135','195'].includes(t.valor)?.1:.14))<.00001)).toBe(true);
 });
 it('5363: como máximo664 de lona; todos los paños, nueve E.T. y18 refuerzos caben sin solaparse',()=>{
  const c=generarCortePuertas(pedidosSantaPau()[1]).cortes.find(c=>c.colocadas.some(t=>t.pieza.clase==='pano'))!;
  expect(c.largo).toBeLessThanOrEqual(6640);
  expect(c.colocadas.filter(t=>t.pieza.clase==='pano')).toHaveLength(6);
  expect(c.colocadas.filter(t=>t.pieza.clase==='entrada')).toHaveLength(9);
  expect(c.colocadas.filter(t=>t.pieza.clase==='refuerzo')).toHaveLength(18);
  const cajas=c.colocadas.map(t=>({x:t.x,y:t.y,w:(t.girada?t.pieza.alto:t.pieza.ancho)*10,h:(t.girada?t.pieza.ancho:t.pieza.alto)*10}));
  expect(cajas.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=c.largo+.01&&b.y+b.h<=c.anchoRollo+.01)).toBe(true);
  expect(cajas.every((a,i)=>cajas.slice(i+1).every(b=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<.01||Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)<.01))).toBe(true);
 });
 it.each(pedidosSantaPau())('$orderCode: una presentación por puerta conserva las dos OF',pedido=>{
  const texto=escribirPlanoPuertas({pedido,cabecera:{cliente:'SANTA PAU',tecnico:'IVÁN',revisor:'',fecha:'04/11/2026'}});
  const hojas=presentacionesDxf(texto) as Array<{nombre:string;primitivas:Array<{tipo:string;valor:string}>}>;
  expect(hojas).toHaveLength(2);
  for(const [i,h]of hojas.entries())expect(h.primitivas.some(p=>p.tipo==='texto'&&p.valor===pedido.elementos[i].input.of)).toBe(true);
 });
});
