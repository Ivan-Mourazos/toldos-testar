import { expect, it } from 'vitest';
import lineas from './fixtures/abrigo-5646.json';
import { puertasDesdeRps } from './rps.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';

const cargar = () => puertasDesdeRps(lineas.map(l => ({ ...l, of: l.of_ })), { clienteCodigo: '001336' }).puertas;

it('lee las medidas explícitas de 5646 y conserva las OF de los seis rectángulos pendientes', () => {
  const ps = cargar();
  expect(ps.map(p => p.of)).toEqual(['0234151','0234152',...Array(3).fill('0234153'),...Array(3).fill('0234154')]);
  expect([ps[0].frente,ps[0].alto,ps[0].cantidad]).toEqual([330,100,1]);
  expect([ps[1].frente,ps[1].abrigo?.corto,ps[1].alto]).toEqual([335,325,55]);
  expect(ps.slice(2).every(p=>p.frente===0 && calcularPuerta(p).avisos.some(a=>a.nivel==='error'))).toBe(true);
});

it('acepta los bordes en orden inverso y las tiras medidas en la línea, como en AR2600140', () => {
  const { puertas }=puertasDesdeRps([
    {...lineas[1],of:'1',comentario:'ABRIGO LONA PVC 3MM 330/340CM X 55CM'},
    {...lineas[3],of:'2',comentario:'LONA DE MEDIDAS 340 X 3 CM, CALIDAD PVC 3 MM'},
  ],{clienteCodigo:'001336'});
  expect(puertas.map(p=>[p.frente,p.alto,p.abrigo?.corto,p.cantidad])).toEqual([[340,55,330,1],[340,3,0,3]]);
});

it('aprovecha el rollo cuando el rectángulo perimetral cabe girado', () => {
  const input={...cargar()[2],frente:75,alto:400,confirmada:true};
  const vista=generarCortePuertas({schemaVersion:1,kind:'puertas',orderCode:'PRUEBA',elementos:[{id:'d',input}]});
  expect(vista.cortes[0].colocadas[0].girada).toBe(true);
  expect(vista.cortes[0].largo).toBe(4000);
});

it('corta dos manos con cinco círculos cada una y separa los tres materiales', () => {
  const elementos = cargar().map((p,i)=>({id:String(i),input:{...p,confirmada:true,
    ...(i>=2?{frente:[400,335,335,335,335,340][i-2],alto:i<5?75:3}:{})}}));
  const vista = generarCortePuertas({schemaVersion:1,kind:'puertas',orderCode:'AR2605646',elementos});
  expect(vista.archivo).toBeTruthy();
  expect(vista.cortes).toHaveLength(3);
  expect(vista.cortes.map(c=>c.colocadas.length)).toEqual([3,3,3]);
  const [b,c] = vista.resultados[1].piezas;
  expect(b.contorno).toEqual([[0,0],[335,0],[325,55],[0,55]]);
  expect(c.contorno).toEqual(b.contorno.map(([x,y])=>[x,55-y]));
  expect(b.circulosMarca?.slice(0,4).map(m=>[m.x,m.y])).toEqual([[0.5,22.5],[100,22.5],[100,32.5],[0.5,32.5]]);
  expect(b.circulosMarca?.[4].x).toBeCloseTo(324.583,2);
  expect(vista.archivo!.entidades.circulos.filter(c=>c.capa==='ROTULADOR'&&c.r===2.5)).toHaveLength(10);
  expect(vista.cortes.map(c=>[...new Set(c.entidades.lineas.map(l=>l.capa))])).toEqual([['CUTTER'],['DISCO1'],['CUTTER']]);
});
