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
  expect(vista.cortes[0].entidades.textos.find(t=>t.valor==='OF: 0234153')).toMatchObject({giro:0,h:expect.any(Number)});
  expect(vista.cortes[0].entidades.textos.find(t=>t.valor==='D')?.h).toBeGreaterThan(150);
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

const pedido5646 = () => ({
  schemaVersion: 1 as const, kind: 'puertas' as const, orderCode: 'AR2605646',
  elementos: cargar().map((p,i)=>({id:String(i),input:{...p,confirmada:true,
    ...(i>=2?{frente:[400,335,335,335,335,340][i-2],alto:i<5?75:3}:{})}})),
});

it('presenta los contornos del dibujo en ACI 7, el CUTTER del corte en verde, la llamada en texto 106 y las cotas en verde', async () => {
  const { leerPlanoTexto } = await import('../flujoDwg/planoDxf.js');
  const { escribirPlanoTaller, dibujarAlzadoTaller } = await import('./planoTaller.ts');
  const p=pedido5646();
  const frontal=dibujarAlzadoTaller(p.elementos[0].input,'A').lienzo;
  expect(frontal.textos.find(t=>t.valor==='X 1')?.h).toBeCloseTo(100/3);
  const plano=escribirPlanoTaller(p,generarCortePuertas(p).cortes,{cliente:'Portanova',tecnico:'OT',revisor:'',fecha:'2026-11-20'});
  const modelo: Array<{tipo:string;capa:string;color:number;deCota?:boolean;valor?:string;h:number}>=leerPlanoTexto(plano).modelo;
  const contornos=modelo.filter(v=>v.tipo==='raya'&&['CUTTER','DISCO1'].includes(v.capa));
  expect(contornos.length).toBeGreaterThan(20);
  // Negro en el dibujo; en el corte el CUTTER sigue en verde, como siempre (Iván, 20/11/2026).
  expect([...new Set(contornos.filter(v=>v.capa==='DISCO1').map(v=>v.color))]).toEqual([7]);
  expect([...new Set(contornos.filter(v=>v.capa==='CUTTER').map(v=>v.color))]).toEqual([3]);
  expect(modelo.filter(v=>v.tipo==='raya'&&v.capa==='texto'&&v.color===106).length).toBeGreaterThanOrEqual(2);
  expect(modelo.some(v=>v.deCota&&v.color===3)).toBe(true);
  for(const [valor,h] of [['LONA 3MM',.2],['OLLAO GRANDE EN ESQUINA',.10],['AL CORTE ALREDEDOR',.10],['X 1',.30],['OF: 0234151',.15]] as const){
    expect(modelo.some(v=>v.tipo==='texto'&&v.valor===valor&&v.color===106&&v.h>=h),valor).toBe(true);
  }
});

it('encaja letra, cantidad y OF del corte de 5646 dentro de cada contorno, fuera de las marcas', async () => {
  const {anchoArial}=await import('../domain/corteLona/texto.js');
  const {cortes}=generarCortePuertas(pedido5646());
  for(const c of cortes) for(const t of c.colocadas){
    const p=t.pieza, min=p.nombre==='E'?18:p.nombre==='B'||p.nombre==='C'?90:140;
    const dentro=c.entidades.textos.filter(s=>s.x>t.x&&s.x<t.x+10*p.ancho&&s.y>t.y&&s.y<t.y+10*p.alto);
    for(const valor of [p.nombre,'X 1','OF: '+p.of]) expect(dentro.some(s=>s.valor===valor&&s.h>=min),valor).toBe(true);
    for(const s of dentro){
      const w=anchoArial(s.valor,s.h)/2, h=s.h/2;
      expect(s.y+.69*s.h).toBeLessThan(t.y+10*p.alto);
      expect(s.y-h).toBeGreaterThan(t.y);
      expect(s.y+h).toBeLessThan(t.y+10*p.alto);
      expect(s.x-w).toBeGreaterThan(t.x);
      for(const y of [s.y-h,s.y+h]){
        const borde=p.contorno.filter(([x])=>x>0);
        const [a,b]=borde;
        const limite=a[0]+(b[0]-a[0])*((y-t.y)/10-a[1])/(b[1]-a[1]);
        expect(s.x+w).toBeLessThan(t.x+limite*10);
      }
      for(const m of p.circulosMarca??[]) expect(Math.abs(s.x-t.x-10*m.x)>w+2.5||Math.abs(s.y-t.y-10*m.y)>h+2.5).toBe(true);
      for(const otro of dentro.filter(o=>o!==s)) expect(Math.abs(otro.x-s.x)>w+anchoArial(otro.valor,otro.h)/2||Math.abs(otro.y-s.y)>h+otro.h/2).toBe(true);
    }
  }
});
