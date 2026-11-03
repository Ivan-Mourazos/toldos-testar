import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { pedidosCompatibilidadClientes } from './__fixtures__/compatibilidadClientes.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { fichasClientesPuertas, fichaPorCodigo, fichaDePuerta } from './clientes.ts';
import { cambiarTipoDelCliente, nuevaPuertaDeCliente, otraPuertaDelCliente } from './nuevaPuertaCliente.ts';
import { puertasDesdeRps } from './rps.ts';

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
// Huellas obtenidas en b6303cf, antes de introducir las fichas. No se regeneran durante la prueba.
const huellas:Record<string,string[]>={
 AR2605246:['f0f0a54c11d666661efcef82abf25657ae6c179f72b53d9a1d8a5a77d4f33912','b950cf07ae42f6eb13746e8a2ad6ed793c5b8fce2038622985e11ee7d19db131','aa215178836a3ac004a728f63b5bac6b98f1b74b713cd9f1e517228859e4dfd3','1e65f833fb93239b1bfef884c4fd49a1d5058d9fb4bdd29c2fc94c964f5d83de'],
 AR2605220:['2d3805fca845c43338af3ed41ae1383a2a9fd78b16c87736019930d3b76d2e33','dde695942fd7fd0ff728479db9bafcc23c76dacb9cac9d38001884440e7c307b','aa4b2c623dedad8760e5421732605f81825355cf0334a3b5582ed68bc769011c','e83568a26f54639aeae41ed7ca7fd238515af0b0419dcc11064f7adc9b869a5a'],
 AR2605035:['7a300790349ce58674f2b7412da91374b5ed904f67d19a24f7be7e9fd54ff932','911a03437a4721a0216fcdccac163e52e6f0a1b2732dbea03abf51dae39bfe35','57ebe4ed51a2000f2a9aede29dc15695caef08da06e497e2efeb064b6c66d765','9c04141298572216d657120f70fd38248e9ecdd8351c33d69e1b66b60228b21c'],
};
describe('fichas de clientes de Puertas',()=>{
 it('cada cliente tiene unidades, rollos, tipos y rótulos propios; el desconocido va a General',()=>{
  expect(fichasClientesPuertas.map(f=>f.id)).toEqual(expect.arrayContaining(['araujo','general','portanova']));
  expect(fichaPorCodigo('001336')).toMatchObject({id:'portanova',unidadHoja:'cm',rollos:{rollo:300,rolloCristal:140,rolloSaco:300},rotulos:{espaciador:'ESPACIADOR ESPECIAL PORTANOVA'}});
  expect(fichaPorCodigo('000460')).toMatchObject({id:'araujo',unidadHoja:'mm',perfiles:{'7':{marca:7,aumento:7.4},'6,5':{marca:6.5,aumento:6.9}}});
  expect(fichaPorCodigo('999999')).toMatchObject({id:'general',habilitado:false});
 });
 it('crea los cuatro tipos de ARAUJO y conserva la denominación plegable de Portanova sin otra fórmula',()=>{
  for(const [tipo,forma,pieza]of [['enrollable-tramos','sueltos','tramo'],['plegable-continua','continua','tramo'],['tramos','sueltos','tramo'],['bolsa','sueltos','bolsa']]){
   const p=nuevaPuertaDeCliente('araujo',tipo);
   expect(p).toMatchObject({clientePuertas:'araujo',tipoPuerta:tipo,araujo:{forma,tramos:[{tipo:pieza}]}});
  }
  expect(nuevaPuertaDeCliente('portanova','plegable')).toMatchObject({clientePuertas:'portanova',tipoPuerta:'plegable',modelo:'PUERTAPLE'});
  expect(()=>nuevaPuertaDeCliente('portanova','bolsa')).toThrow();
 });
 it('RPS elige ficha y tipo por cliente y artículo, incluida la continua y los tres artículos de tramo',()=>{
  const linea=(articulo:string)=>({articulo,cantidad:1,of:'0230000',descripcion:'',comentario:'DE MEDIDAS 134 X 140+70+70 CM, COLOR BLANCO'});
  for(const [art,tipo]of [['PUERTAENR','enrollable-tramos'],['PUERTAPLE','plegable-continua'],['PUERTAPLET','tramos'],['PUERTAPLETRA','tramos'],['PUERTAPLETRAM','tramos']]){
   const p=puertasDesdeRps([linea(art)],{clienteCodigo:'000460'}).puertas[0];
   expect(p).toMatchObject({clientePuertas:'araujo',tipoPuerta:tipo,confirmada:false});
   if(art==='PUERTAPLE')expect(p.araujo).toMatchObject({forma:'continua',tramos:[{frente:134,alto:280}]});
  }
  expect(puertasDesdeRps([linea('PUERTAUTO')],{clienteCodigo:'001336'}).puertas[0]).toMatchObject({clientePuertas:'portanova',tipoPuerta:'autorreparable'});
  const general=puertasDesdeRps([linea('PUERTAENR')],{clienteCodigo:'009999'}).puertas[0];
  expect(general.clientePuertas).toBe('general');
  expect(calcularPuerta({...general,confirmada:true,ventanasConfirmadas:true}).avisos).toContainEqual(expect.objectContaining({codigo:'CLIENTE_SIN_REGLAS',nivel:'error'}));
 });
 it('valida ficha y tipo sin convertir ni completar documentos antiguos',()=>{
  const p=pedidosCompatibilidadClientes()[0];
  const nuevo=nuevaPuertaDeCliente('araujo','bolsa');
  expect(()=>leerPedidoPuertas({...p,elementos:[{id:'a',input:nuevo}]})).not.toThrow();
  expect(()=>leerPedidoPuertas({...p,elementos:[{id:'a',input:{...nuevo,tipoPuerta:'autorreparable'}}]})).toThrow();
  expect(()=>leerPedidoPuertas({...p,elementos:[{id:'a',input:{...nuevo,clientePuertas:'no-existe'}}]})).toThrow();
  expect(()=>leerPedidoPuertas({...p,elementos:[{id:'a',input:{...nuevo,araujo:{...nuevo.araujo!,forma:'continua'}}}]})).toThrow();
 });
 it('una bolsa suelta de RPS abre el tipo Bolsa y conserva su pieza',()=>{
  const p=puertasDesdeRps([{articulo:'PUERTAPLET',cantidad:1,of:'0230000',descripcion:'BOLSA INFERIOR',comentario:'DE MEDIDAS 440 X 30 CM, COLOR AMARILLO'}],{clienteCodigo:'000460'}).puertas[0];
  expect(p).toMatchObject({clientePuertas:'araujo',tipoPuerta:'bolsa',araujo:{forma:'sueltos',tramos:[{tipo:'bolsa',frente:440,alto:30}]}});
 });
 it('añadir a un pedido antiguo mantiene su tipo sin copiar medidas ni confirmaciones',()=>{
  const p=pedidosCompatibilidadClientes()[2].elementos[0].input;
  expect(otraPuertaDelCliente(p)).toMatchObject({clientePuertas:'portanova',modelo:'PUERTAPLE',frente:0,alto:0,of:'',confirmada:false});
 });
 it('al cambiar de modelo se quitan tubos y ventanas; cambiar solo el nombre Plegable/Apilable conserva la geometría',()=>{
  const antiguo=pedidosCompatibilidadClientes()[2].elementos[0].input;
  const p={...antiguo,clientePuertas:'portanova',tipoPuerta:'apilable',ventanas:[{x:40,y:40,ancho:90,alto:35,radio:2,radioCristal:4}]};
  expect(cambiarTipoDelCliente(p,'plegable')).toMatchObject({modelo:'PUERTAPLE',entradas:p.entradas,ventanas:p.ventanas});
  expect(cambiarTipoDelCliente(p,'autorreparable')).toMatchObject({modelo:'PUERTAUTO',entradas:[],ventanas:[],confirmada:false,ventanasConfirmadas:false});
 });
 it.each(pedidosCompatibilidadClientes())('$orderCode abre y conserva documento, cálculo, bot y plano idénticos al commit anterior',pedido=>{
  const p=leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)));
  expect(fichaDePuerta(p.elementos[0].input).id).toBe('portanova');
  expect([hash(JSON.stringify(p)),hash(JSON.stringify(p.elementos.map(e=>calcularPuerta(e.input)))),
   hash(generarCortePuertas(p,{ofStockSacos:'0230811'}).archivo!.dxf),hash(escribirPlanoPuertas({pedido:p,ofStockSacos:'0230811',cabecera:{cliente:'PORTANOVA',tecnico:'IVÁN',revisor:'DAVID',fecha:'2026-10-23'}}))]).toEqual(huellas[p.orderCode]);
 });
});
