import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { puertasDesdeRps } from './rps.ts';
import { corteDelPlano } from '../flujoDwg/corteDwg.js';
import { araujo5365, tramoAraujo, ventanaAraujo } from './__fixtures__/araujo.ts';
import type { PedidoPuertas, Puerta } from './tipos.ts';

const pedido = (p: Puerta): PedidoPuertas => ({ schemaVersion: 1, kind: 'puertas', orderCode: 'AR2605365', elementos: [{ id: 'a', input: p }] });
const cortes = (p: Puerta) => calcularPuerta(p).piezas.map(x => [x.clase, x.ancho, x.alto, x.cantidad]);
describe('ARAUJO, tramos y bolsas con canutillo', () => {
  it('5365: tres tramos independientes, dos cristales y bolsa de 440; sin saco Portanova', () => {
    expect(cortes(araujo5365())).toEqual([
      ['pano', 307, 102.4, 1], ['pano', 307, 102.4, 1], ['cristal', 94, 39, 1], ['cristal', 94, 39, 1],
      ['pano', 307, 107.4, 1], ['saco', 440, 37.4, 1],
    ]);
    const r = calcularPuerta(araujo5365());
    expect(r.alternativasSaco).toBeNull();
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.piezas[1].huecos).toEqual([expect.objectContaining({ x: 44, y: 33.7 }), expect.objectContaining({ x: 173, y: 33.7 })]);
    expect(r.piezas[0].marcas).toEqual([[1.5, 7, 305.5, 7], [1.5, 95.4, 305.5, 95.4]]);
  });
  it.each([[334.5,28,35.4],[480,30,37.4],[207.5,85,92.4]])('tramos sueltos reales %s × %s → alto %s', (frente,alto,corte) => {
    const p = araujo5365(); p.araujo!.tramos = [tramoAraujo(frente, alto)];
    expect(cortes(p)).toEqual([['pano', frente, corte, 1]]);
  });
  it('4713: cantidades por tramo y bolsa, sin multiplicar toda la puerta por dos', () => {
    const p = araujo5365(); p.araujo!.tramos = [{ ...tramoAraujo(307,95), ventanas: [ventanaAraujo(44),ventanaAraujo(173)] }, tramoAraujo(307,100,2),tramoAraujo(299.5,28,2,'bolsa')];
    expect(cortes(p)).toEqual([['pano',307,102.4,1],['cristal',94,39,1],['cristal',94,39,1],['pano',307,107.4,2],['saco',299.5,35.4,2]]);
  });
  it('4373: perfil confirmado de 6,5, dos tramos de 69 y cristal de 94 × 34', () => {
    const p = araujo5365(); p.araujo!.perfil = '6,5'; p.araujo!.tramos = [{ ...tramoAraujo(540,69,2), ventanas: [79,225,371].map(x=>ventanaAraujo(x,19.5,90,30)) }, tramoAraujo(540,65),tramoAraujo(540,53)];
    const r = calcularPuerta(p);
    expect(r.piezas.filter(x=>x.clase==='pano').map(x=>[x.ancho,x.alto,x.cantidad])).toEqual([[540,76.15,2],[540,72.15,1],[540,60.15,1]]);
    expect(r.piezas.filter(x=>x.clase==='cristal').map(x=>[x.ancho,x.alto,x.cantidad])).toEqual([[94,34,2],[94,34,2],[94,34,2]]);
  });
  it('2986: cuerpo continuo de 134 × 287,4, dos entradas de 12 y bolsa separada', () => {
    const p = araujo5365(); p.modelo='PUERTAPLE'; p.color='BLANCO'; p.araujo!.forma='continua';p.araujo!.tramos=[tramoAraujo(134,280),tramoAraujo(126.5,28,1,'bolsa')];
    p.entradas=[70,140].map(altura=>({altura,diametro:30,largo:134,alto:12,huecos:[]}));
    expect(cortes(p)).toEqual([['pano',134,287.4,1],['saco',126.5,35.4,1],['entrada',134,12,1],['entrada',134,12,1]]);
    expect(calcularPuerta(p).piezas[0].marcas.map(m=>m[1])).toEqual([7,280.4,67.7,137.7]);
  });
  it('4292 y las dos OF de 2391 conservan medidas propias de bolsa y altos de cada tramo', () => {
    for(const [frente,altos,bolsa] of [[178,[140,90,80],170.5],[301,[157,100,90],293.5],[412,[160,70,75,95],404.5]] as const){
      const p=araujo5365();p.araujo!.tramos=[...altos.map(h=>tramoAraujo(frente,h)),tramoAraujo(bolsa,28,1,'bolsa')];
      expect(cortes(p)).toEqual([...altos.map(h=>['pano',frente,Number((h+7.4).toFixed(2)),1]),['saco',bolsa,35.4,1]]);
    }
  });
  it('bloquea huecos fuera, sin solape para cristal, radios, cantidades y piezas que no caben', () => {
    for(const parche of [{ventanas:[ventanaAraujo(1)]},{ventanas:[ventanaAraujo(44,2)]},{cantidad:0},{frente:500,alto:400},{ventanas:[{...ventanaAraujo(44),radio:30}]}]){
      const p=araujo5365();p.araujo!.tramos=[{...tramoAraujo(307,95),...parche}];
      expect(generarCortePuertas(pedido(p)).archivo).toBeNull();
    }
  });
  it('la zona de corte del plano se puede recuperar con las mismas rayas y curvas que el bot', () => {
    const p=pedido(araujo5365()),bot=generarCortePuertas(p).archivo!;
    const corte=corteDelPlano(escribirPlanoPuertas({pedido:p,cabecera:{cliente:'J. ARAUJO S.L.',tecnico:'IVÁN',revisor:'',fecha:'2026-11-03'}}));
    expect(corte.error).toBeNull();
    const lineas=corte.entidades.flatMap(e=>(e.segmentos??[]).map(([[x1,y1],[x2,y2]]:number[][])=>({capa:e.capa,largo:Math.hypot(x2-x1,y2-y1)*1000})));
    for(const capa of ['DISCO1','ROTULADOR','CUTTER']){
      const oficina=lineas.filter(l=>l.capa===capa).reduce((s,l)=>s+l.largo,0);
      const maquina=bot.entidades.lineas.filter(l=>l.capa===capa).reduce((s,l)=>s+Math.hypot(l.x2-l.x1,l.y2-l.y1),0);
      expect(oficina,capa).toBeCloseTo(maquina,0);
    }
    expect(corte.entidades.reduce((s,e)=>s+(e.arcos?.length??0),0)).toBe(bot.entidades.arcos.length);
  });
  it('pedido guardado valida toda la configuración sin aceptar formas o valores arbitrarios', () => {
    expect(leerPedidoPuertas(pedido(araujo5365()))).toEqual(pedido(araujo5365()));
    for(const v of [{perfil:'otro'},{tramos:[{...tramoAraujo(307,95),ventanas:'no'}]},{forma:'otra'}]){
      const p=pedido(araujo5365());Object.assign(p.elementos[0].input.araujo!,v);
      expect(()=>leerPedidoPuertas(p)).toThrow();
    }
  });
  it('DXF y plano conservan curvas, OF, canutillos, medidas y nota de anagrama sin cortarlo', () => {
    const p=pedido(araujo5365()),r=generarCortePuertas(p);
    expect(r.archivo).not.toBeNull();
    expect(r.cortes.flatMap(c=>c.colocadas).filter(c=>c.pieza.clase==='saco')).toHaveLength(1);
    // Dos huecos y una muestra de cristal repetida ×2, como el corte común de puertas.
    expect(r.archivo!.entidades.arcos.filter(a=>a.capa==='CUTTER')).toHaveLength(12);
    const dxf=escribirPlanoPuertas({pedido:p,cabecera:{cliente:'J. ARAUJO S.L.',tecnico:'IVÁN',revisor:'',fecha:'2026-11-03'}});
    for(const t of ['0233643','VARILLA BLANCA','ANAGRAMA J. ARAUJO','DISCO1','DIMENSION'])expect(dxf).toContain(t);
    expect(r.archivo!.dxf).not.toContain('ANAGRAMA');
  });
  it('RPS 5365 conserva cadena, cliente y OF; bolsa y ventanas requieren hoja', () => {
    const l={articulo:'PUERTAENR',cantidad:1,of:'0233643',descripcion:'LONA PARA PUERTA ENROLLABLE',comentario:'POR CONFECCION DE LONA PARA PUERTA RAPIDA DE MEDIDAS 307 X 95 CM+95 CM+100 CM, CON ENTRADAS DE TUBO Y VENTANAS DE PVC TRANSPARENTE, COLOR AZUL 5002'};
    const p=puertasDesdeRps([l],{clienteCodigo:'000460'}).puertas[0];
    expect(p.araujo?.tramos.map(t=>[t.frente,t.alto,t.cantidad])).toEqual([[307,95,1],[307,95,1],[307,100,1]]);
    expect(p.confirmada).toBe(false);expect(p.ventanasConfirmadas).toBe(false);
    expect(puertasDesdeRps([l],{clienteCodigo:'001336'}).puertas[0].araujo).toBeUndefined();
  });
  it.each(['PUERTAPLET','PUERTAPLETRA','PUERTAPLETRAM'])('RPS %s permite tramo suelto sin perder el artículo original', articulo => {
    const p=puertasDesdeRps([{articulo,cantidad:1,of:'0233571',descripcion:'TRAMO PUERTA PLEGABLE',comentario:'DE MEDIDAS 334,5 X 28 CM, COLOR AMARILLO.'}],{clienteCodigo:'000460'}).puertas[0];
    expect(p).toMatchObject({articuloOrigen:articulo,color:'AMARILLO',confirmada:false,araujo:{tramos:[{frente:334.5,alto:28}]}});
    expect(()=>leerPedidoPuertas(pedido(p))).not.toThrow();
  });
  it('RPS 4713 y 4373: cantidades de cada tramo; toma el color final de la lona', () => {
    const l={articulo:'PUERTAENR',cantidad:1,of:'0220812',descripcion:'LONA PARA PUERTA ENROLLABLE',comentario:'DE MEDIDAS 307 X 95 CM (1 UNIDAD)+100 CM (2 UNIDADES)+ BOLSA DE MEDIDAS 299,5 X 28 CM (2 UNIDADES), EN PVC COLOR AMARILLO, COLOR AZUL 5002.'};
    const p=puertasDesdeRps([l],{clienteCodigo:'000460'}).puertas[0];
    expect(p.araujo?.tramos.map(t=>[t.tipo,t.frente,t.alto,t.cantidad])).toEqual([['tramo',307,95,1],['tramo',307,100,2],['bolsa',299.5,28,2]]);
    expect(p.color).toBe('AZUL 5002');
    const q=puertasDesdeRps([{...l,comentario:'D EMEDIDAS 540 X 69 CM (2 UNIDADES)+65 CM (1 UNIDAD)+53 CM (1 UNIDAD), COLOR GRIS 7038'}],{clienteCodigo:'000460'}).puertas[0];
    expect(q.araujo?.tramos.map(t=>[t.alto,t.cantidad])).toEqual([[69,2],[65,1],[53,1]]);
    expect(q.confirmada).toBe(false);
  });
  it('RPS con diferentes medidas no multiplica dos tramos distintos por la cantidad total de la línea', () => {
    const p=puertasDesdeRps([{articulo:'PUERTAPLET',cantidad:2,of:'0225577',descripcion:'TRAMOS',comentario:'DE DIFERENTES MEDIDAS, CON VENTANAS, COLOR NARANJA 2004'}],{clienteCodigo:'000460'}).puertas[0];
    expect(p.cantidad).toBe(1);expect(p.araujo?.tramos[0]).toMatchObject({frente:0,alto:0});
    expect(generarCortePuertas(pedido(p)).archivo).toBeNull();
  });
});
