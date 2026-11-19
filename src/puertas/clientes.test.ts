import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { pedidosCompatibilidadClientes } from './__fixtures__/compatibilidadClientes.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { fichasClientesPuertas, fichaPorCodigo, fichaPorId, fichaDePuerta, validarFichaClientePuertas } from './clientes.ts';
import { cambiarTipoDelCliente, nuevaPuertaDeCliente, otraPuertaDelCliente } from './nuevaPuertaCliente.ts';
import { puertasDesdeRps } from './rps.ts';

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
// Iván, 17/11/2026: documento y cálculo conservan sus SHA; bot y plano incluyen el catálogo nuevo de sacos.
// Se regeneraron con generarCortePuertas y escribirPlanoPuertas; nunca durante la prueba.
// 06/11/2026: el bot y el plano cambian por el título del corte (sin «· CORTE», con «CORTAR POR EL REVÉS»); documento y cálculo, iguales. En las enrollables, textos de una línea centrados, A1/A2 grandes y AL CORTE centrado.
// 19/11/2026: el 5246 sale del ejemplo 4638, que ya lleva sus tres E.T. (60, 131 y 191); antes solo la de 60.
const huellas:Record<string,string[]>={
 AR2605246:['59fcde4280e6cf8c534127defa01fd1c31c47776df1e6e7910b56f4a4cfb8527','1b185ef12a60d50204a74854496e4bffb82a11391ab039f957a5e1f6e127e753','8f4c45a6d646e9431abd2555a070a7d920d973c051d98af406ff38b2e0cc6421','1416564f53d5386cd8e015039abeb25d1123ec089831af99a4bcd0d33fb4c7c4'],
 AR2605220:['2d3805fca845c43338af3ed41ae1383a2a9fd78b16c87736019930d3b76d2e33','f404e03c7050d002944949bf369652a289a8ee31668bbfef6add86b62fada5c3','0b07a6990d1e0753ea1b66ad1b5e59bbb8b0c7693b4fcf33846ae38a8ec59e82','ba839dc8738b514d5c23adece4aa0654a087567b9490e5d4d312471ef48e3810'],
 AR2605035:['7a300790349ce58674f2b7412da91374b5ed904f67d19a24f7be7e9fd54ff932','4a34ddd7d8e82bc5c891fca4f12b655cf881f7997ee211d24c56d13b076a515c','98cf2a1f82093c07c0e5dc446421d6526375e87e463a6cd0d646f6234c0a6cf0','943427c2782516abb4ab85aed138174836c2e05c8c2b5988b01b4b3dc064eb77'],
};
describe('fichas de clientes de Puertas',()=>{
 it('rechaza una ficha de cálculo TGM sin los parámetros de enrolle',()=>{
  const {enrolle,...ficha}=fichaPorId('tgm')!;
  expect(enrolle).toBeDefined();
  expect(()=>validarFichaClientePuertas(ficha)).toThrow(/Ficha de cliente de Puertas inválida/);
  expect(()=>validarFichaClientePuertas({...ficha,enrolle:{...enrolle,anguloPerfil:0}})).toThrow(/Ficha de cliente de Puertas inválida/);
  expect(()=>validarFichaClientePuertas({...ficha,enrolle:{...enrolle,altoPerfil:0}})).not.toThrow();
 });
 it('cada cliente tiene unidades, rollos, tipos y rótulos propios; el desconocido va a General',()=>{
  expect(fichasClientesPuertas.map(f=>f.id)).toEqual(expect.arrayContaining(['araujo','general','portanova']));
  expect(fichaPorCodigo('001336')).toMatchObject({id:'portanova',unidadHoja:'cm',rollos:{rollo:300,rolloCristal:140,rolloSaco:300},rotulos:{espaciador:'ESPACIADOR ESPECIAL PORTANOVA'}});
  expect(fichaPorCodigo('000460')).toMatchObject({id:'araujo',nombre:'Araujo',unidadHoja:'mm',rollosConfirmados:true,rollos:{rollo:300,rolloCristal:140,rolloSaco:300},perfiles:{'7':{marca:7,aumento:7.4},'6,5':{marca:6.5,aumento:6.9}}});
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
 it.each(pedidosCompatibilidadClientes())('$orderCode abre y conserva documento, cálculo y bot idénticos; presentación A4 revisada',pedido=>{
  const p=leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)));
  expect(fichaDePuerta(p.elementos[0].input).id).toBe('portanova');
  expect([hash(JSON.stringify(p)),hash(JSON.stringify(p.elementos.map(e=>calcularPuerta(e.input)))),
   hash(generarCortePuertas(p,{ofStockSacos:'0230811'}).archivo!.dxf),hash(escribirPlanoPuertas({pedido:p,ofStockSacos:'0230811',cabecera:{cliente:'PORTANOVA',tecnico:'IVÁN',revisor:'DAVID',fecha:'2026-10-23'}}))]).toEqual(huellas[p.orderCode]);
 });
});
