import { describe, expect, it } from 'vitest';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { calcularPuerta } from './calcular.ts';
import { fichaPorCodigo } from './clientes.ts';
import { puertasDesdeRps } from './rps.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { geometriaAlzado } from './alzado.ts';
import { pedidosSantaPau } from './__fixtures__/santapau.ts';
import type { PedidoPuertas, Puerta } from './tipos.ts';

function caso(frente=281.5,alto=400):Puerta & {santapau:NonNullable<Puerta['santapau']>}{
 const p=nuevaPuertaDeCliente('santapau','enrollable');
 return {...p,frente,alto,of:'0232635',color:'BLANCO',confirmada:true,ventanasConfirmadas:true,
  santapau:{...p.santapau!,ladoCerrado:'derecha' as const},
  ventanas:[{x:0,y:125,ancho:frente,alto:60,radio:0,radioCristal:0}],
  entradas:[59,121,210].map(altura=>({altura,largo:frente,alto:9,diametro:30 as const,huecos:[]}))};
}
describe('Santa Pau: confección contrastada con varios fabricados',()=>{
 it.each(pedidosSantaPau())('$orderCode: el taller recibe solo rótulos de oficina, sin el estudio ni las dudas',pedido=>{
  const p=pedido.elementos[0].input;
  p.notaPlano='CONTRASTE 4815 · BAJO PROPUESTO +2,5; CORTE HISTÓRICO +5';
  const g=geometriaAlzado(p,calcularPuerta(p));
  const textos=g.formas.filter(f=>f.tipo==='texto');
  expect(textos.some(t=>t.lineas.some(s=>/CONTRASTE|PROPUEST|HISTÓRICO|POR CONFIRMAR|SANTA PAU|LOGO DISP|IMPRESIÓN DIGITAL|SUELTAS DE 9/i.test(s)))).toBe(false);
  expect(textos).toContainEqual(expect.objectContaining({lineas:['A1']}));
  expect(textos).toContainEqual(expect.objectContaining({lineas:['A2']}));
  expect(textos).toContainEqual(expect.objectContaining({lineas:['VELCRO(5) SUAVE SOLDADO REVÉS'],y:p.alto-20}));
  expect(textos).toContainEqual(expect.objectContaining({lineas:['VELCRO(5) BRAVO REVÉS AL CORTE'],y:p.alto+35+p.santapau!.altoFaldon+8}));
  const dxf=escribirPlanoPuertas({pedido,cabecera:{cliente:'SANTA PAU',tecnico:'IVÁN',revisor:'',fecha:'04/11/2026'}});
  expect(dxf).not.toMatch(/CONTRASTE 4815|BAJO PROPUESTO|CORTE HISTÓRICO|POR CONFIRMAR|PROPUESTA DESDE HOJA/);
  expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({codigo:'LOGO',nivel:'aviso'}));
  expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({codigo:'NOTA_REVISION',texto:p.notaPlano,nivel:'aviso'}));
 });
 it('ofrece ficha propia y no hereda saco ni reglas Portanova',()=>{
  expect(fichaPorCodigo('038661')).toMatchObject({id:'santapau',nombre:'Santa Pau',calculo:'santapau',unidadHoja:'mm'});
  expect(nuevaPuertaDeCliente('santapau','enrollable').santapau).toMatchObject({aumentoBajo:2.5,altoFaldon:35,ladoCerrado:'sin confirmar'});
 });
 it.each([[281.5,400,219],[163.5,350,169]])('4815: F%s H%s; conserva superior y propone inferior mayoritario', (f,h,superior)=>{
  const r=calcularPuerta(caso(f,h));
  expect(r.avisos.filter(a=>a.nivel==='error')).toEqual([]);
  expect(r.piezas.filter(p=>p.clase==='pano').map(p=>[p.ancho,p.alto])).toEqual([[f,superior],[f,127.5]]);
  expect(r.piezas.find(p=>p.clase==='cristal')).toMatchObject({ancho:f+2,alto:64});
  expect(r.piezas.filter(p=>p.clase==='entrada')).toHaveLength(3);
  expect(r.piezas.filter(p=>p.clase==='entrada').every(p=>p.alto===9&&p.huecos.length===0)).toBe(true);
  expect(r.piezas.find(p=>p.clase==='saco')).toMatchObject({ancho:f,alto:35,contorno:[[0,0],[f,0],[f,35],[0,35]]});
 });
 it('5055: mirilla con márgenes y cachos 21×54; no mezcla ejes con bordes',()=>{
  const p=caso(260.5,390);p.ventanas=[{x:20,y:145,ancho:220.5,alto:50,radio:0,radioCristal:0}];p.entradas=[60,132.5,205].map(altura=>({...p.entradas[0],altura}));
  const r=calcularPuerta(p);
  expect(r.piezas.filter(x=>x.clase==='pano').map(x=>x.alto)).toEqual([199,147.5]);
  expect(r.piezas.find(x=>x.clase==='cristal')).toMatchObject({ancho:224.5,alto:54});
  expect(r.piezas.find(x=>x.clase==='cacho')).toMatchObject({ancho:21,alto:54,cantidad:2});
 });
 it('RPS identifica 038661, cantidades y rojo3002 sin completar tubos ni mirillas',()=>{
  const {puertas}=puertasDesdeRps([{articulo:'PUERTAENR',cantidad:2,of:'0233644',descripcion:'LONA PARA PUERTA ENROLLABLE',comentario:'DE MEDIDAS 197 CM X 340 CM, COLOR ROJO 3002'}],{clienteCodigo:'038661'});
  expect(puertas[0]).toMatchObject({clientePuertas:'santapau',frente:197,alto:340,cantidad:2,color:'ROJO 3002',confirmada:false,entradas:[],ventanas:[]});
  expect(puertas[0].santapau).toBeDefined();
 });
 it('rechaza datos de confección inválidos y no genera el bot con lado sin confirmar',()=>{
  const p=caso();p.santapau.ladoCerrado='sin confirmar';
  const pedido:PedidoPuertas={schemaVersion:1,kind:'puertas',orderCode:'AR2604815',elementos:[{id:'a',input:p}]};
  expect(generarCortePuertas(pedido).archivo).toBeNull();
  expect(()=>leerPedidoPuertas({...pedido,elementos:[{id:'a',input:{...p,santapau:{...p.santapau,aumentoBajo:'2,5'}}}]})).toThrow();
 });
 it('plano y bot conservan cliente, OF, instrucciones y cantidad real del 5363',()=>{
  const p=caso(197,340);p.cantidad=2;p.color='ROJO 3002';p.ventanas[0].y=135;p.of='0233644';p.entradas[1].altura=120;
  const pedido:PedidoPuertas={schemaVersion:1,kind:'puertas',orderCode:'AR2605363',elementos:[{id:'a',input:p}]};
  expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toEqual(pedido);
  const r=generarCortePuertas(pedido);expect(r.archivo).not.toBeNull();
  expect(r.resultados[0].piezas.find(x=>x.clase==='pano')).toMatchObject({alto:149,cantidad:2});
  const dxf=escribirPlanoPuertas({pedido,cabecera:{cliente:'Santa Pau',tecnico:'IVÁN',revisor:'',fecha:'04/11/2026'}});
  expect(dxf).toContain('SANTA PAU');expect(dxf).toContain('REFUERZO');expect(dxf).toContain('0233644');
  expect(dxf).not.toContain('ESPACIADOR ESPECIAL PORTANOVA');
 });
});
