import { describe, expect, it } from 'vitest';
import reales from './__fixtures__/pedidos-reales.json';
import habitual from './__fixtures__/AR2605134.json';
import { calcularPuerta, alturasTubos, nuevaPuerta } from './calcular.ts';
import type { Puerta } from './tipos.ts';

function base(modelo: Puerta['modelo'], frente: number, alto: number): Puerta {
  // Los cortes reales de autorreparable llevaban el saco de 120 cortado de 32 (rematado 12): ahora, el de 110.
  const nueva = nuevaPuerta(modelo);
  return { ...nueva, autorreparable: { ...nueva.autorreparable, saco: 110 }, frente, alto, of: '0230001', rollo: 300, rolloCristal: 140, rolloSaco: 300,
    material: 'LAC900', color: 'AZUL 5002', confirmada: true, ventanasConfirmadas: true };
}
describe('Despiece de puertas contrastado con medidas del bot (cm)', () => {
  it('AR2605134: tres enrollables configuradas desde el PDF, sin atribuirle un corte manual inexistente',()=>{
    const f=habitual,p=base('PUERTAENR',f.frente,f.alto);
    p.of=f.of;p.cantidad=f.cantidad;p.color=f.color;
    p.enrollable={T:f.T,D:f.D,margen:f.margen,empates:[]};
    p.entradas=f.alturasTubos.map(altura=>({altura,diametro:30,largo:f.frente,alto:8,huecos:[]}));
    const r=calcularPuerta(p),panos=r.piezas.filter(x=>x.clase==='pano');
    expect(panos.map(x=>x.alto)).toEqual(f.panos);
    expect(panos.map(x=>x.cantidad)).toEqual([3,3]);
    expect(panos.map(x=>x.marcas.filter(s=>Math.abs(s[2]-s[0])>x.ancho/2).map(s=>s[1]).sort((a,b)=>a-b))).toEqual(f.marcasPanos);
    expect(r.piezas.find(x=>x.clase==='cristal')).toMatchObject({ancho:204,alto:56.5,cantidad:3});
    expect(r.piezas.find(x=>x.clase==='cacho')).toMatchObject({ancho:7,alto:56.5,cantidad:6});
    expect(r.piezas.find(x=>x.clase==='saco')).toMatchObject({ancho:218.5,alto:26,cantidad:3});
    expect(r.piezas.filter(x=>x.clase==='entrada').reduce((n,x)=>n+x.cantidad,0)).toBe(9);
    expect(r.avisos.filter(x=>x.nivel==='error')).toEqual([]);
    expect(f.contrasteManualDisponible).toBe(false);
  });
  for (const f of reales.enrollables) it(`enrollable ${f.pedido}: paños, ventanal, cachos y entradas`, () => {
    const p = base('PUERTAENR', f.frente, f.alto);
    p.of=f.of;p.color=f.color;p.margenMarcas=f.margenMarcas;
    p.enrollable = { T: f.T, D: f.D, margen: f.m, empates: [],sacoPartido:f.sacoPartido };
    if(f.articuloRps)p.articuloOrigen='PUERTAPLE';
    p.entradas = f.alturas.map(altura => ({ altura, largo: f.frente, alto: 8, diametro: 30, huecos: [] }));
    if(f.empateTubo)p.enrollable.empates=[{pano:'superior',altura:f.alturas[f.empateTubo-1]-(f.alto-f.T-3.75),solape:7.5,tubo:f.empateTubo}];
    const r = calcularPuerta(p);
    expect(r.piezas.filter(x => x.clase === 'pano').map(x => x.alto)).toEqual(f.panos);
    expect(r.piezas.find(x => x.clase === 'cristal')).toMatchObject({ ancho: f.cristal[0], alto: f.cristal[1] });
    expect(r.piezas.find(x => x.clase === 'cacho')).toMatchObject({ ancho: f.m + 1, alto: f.D - 3.5, cantidad: 2 });
    expect(r.piezas.filter(x => x.clase === 'entrada')).toHaveLength(f.entradas);
    if(f.marcas)expect(r.piezas.filter(x=>x.clase==='pano').map(x=>x.marcas.filter(s=>Math.abs(s[2]-s[0])>x.ancho/2).map(s=>s[1]).sort((a,b)=>a-b))).toEqual(f.marcas);
    expect(r.piezas.filter(x=>x.clase==='entrada').every(x=>x.marcas.length===0)).toBe(true);
    expect(r.piezas.filter(x=>x.clase==='pano').every(x=>x.of===f.of)).toBe(true);
    const sacos = r.piezas.filter(x => x.clase === 'saco');
    expect(sacos.map(x=>[x.ancho,x.alto])).toEqual(f.sacoPartido?[[241.25,26],[241.25,26]]:[[f.frente+6.5,26]]);
    expect(sacos[0].contorno).toHaveLength(8);
    if(f.articuloRps)expect(r.avisos.map(a=>a.codigo)).toContain('ARTICULO_MODELO');
  });
  it.each([['AR2604638',false],['AR2604725',true]] as const)('%s cubre la variante con entrada adicional sobre el ventanal: %s', (pedido,entradaEncima)=>{
    const f=reales.enrollables.find(f=>f.pedido===pedido)!;
    expect(f.alturas.some(y=>y>f.alto-f.T)).toBe(entradaEncima);
  });
  for (const f of reales.autorreparables) it(`autorreparable ${f.pedido}: cuerpo y saco actual`, () => {
    const p = base('PUERTAUTO', f.frente, f.alto);
    p.autorreparable.empates = f.panos.length > 1 ? [299] : [];
    const r = calcularPuerta(p), panos = r.piezas.filter(x => x.clase === 'pano');
    expect(panos.map(x => x.alto)).toEqual(f.panos);
    expect(r.piezas.find(x => x.clase === 'saco')).toMatchObject({ ancho: f.frente, alto: 32 });
    const entradas = r.piezas.filter(x => x.clase === 'entrada');
    expect(entradas).toHaveLength(2);
    if (f.entrada) expect(entradas[0]).toMatchObject({ ancho: f.entrada[0], alto: f.entrada[1] });
  });
  for (const f of reales.apilables) it(`apilable ${f.pedido}: paños, tubos y cristales`, () => {
    const p = base('PUERTAPLE', f.frente, f.alto);
    // El saco de 80 de entonces se cortaba de 30 y quedaba de 11: con la regla del 23/10/2026 es el de 100.
    p.apilable = { ...p.apilable, pie: f.pie, pasos: f.pasos, cabecera: f.cabecera, empates: f.empates, saco: 100 };
    p.entradas = alturasTubos(p).map(altura => ({ altura, diametro: 30, largo: f.frente, alto: 12, huecos: [] }));
    p.ventanas = f.filas.flatMap(([x, y, ancho, alto, n, pilar]) => Array.from({ length: n }, (_, i) => ({ x: x + i * (ancho + pilar), y, ancho, alto, radio: 2, radioCristal: 4 })));
    const r = calcularPuerta(p);
    expect(r.piezas.filter(x => x.clase === 'pano').map(x => x.alto)).toEqual(f.panos);
    expect(r.piezas.filter(x => x.clase === 'entrada')).toHaveLength(p.entradas.length - f.empates.length);
    expect(r.piezas.filter(x => x.clase === 'cristal').every(x => x.ancho === f.cristal[0] && x.alto === f.cristal[1])).toBe(true);
    expect(r.avisos.filter(x => x.nivel === 'error')).toEqual([]);
  });
});

describe('Comprobaciones y reglas confirmadas', () => {
  it('el bolsillo viene desmarcado y solo añade dos esquinas en L, sin pieza ni contorno',()=>{
    const p=base('PUERTAENR',172,314);p.enrollable={T:123,D:60,margen:6,empates:[]};
    p.entradas=[{altura:71,diametro:30,largo:172,alto:8,huecos:[]}];
    expect(p.bolsillo).toBe(false);
    const sin=calcularPuerta(p);p.bolsillo=true;p.medidasBolsillo.altoSuperior=66.25;const con=calcularPuerta(p);
    expect(con.piezas.map(x=>[x.clase,x.ancho,x.alto,x.cantidad])).toEqual(sin.piezas.map(x=>[x.clase,x.ancho,x.alto,x.cantidad]));
    const marcas=con.piezas.find(x=>x.nombre==='Paño inferior')!.marcas;
    expect(marcas.slice(-4)).toEqual([[20,54.75,20,55.25],[20,55.25,20.5,55.25],[50,54.75,50,55.25],[50,55.25,49.5,55.25]]);
    expect(con.bolsillo).toEqual({x:20,y:49.25,ancho:30,alto:17});
    expect(con.piezas.some(x=>/bolsillo/i.test(x.nombre))).toBe(false);
  });
  it('propone 1 + 17 desde el saco doblado y permite otra altura terminada',()=>{
    const p=base('PUERTAUTO',200,300);p.bolsillo=true;
    expect(calcularPuerta(p).bolsillo).toEqual({x:20,y:1,ancho:30,alto:17});
    p.medidasBolsillo.altoSuperior=44;
    expect(calcularPuerta(p).bolsillo).toEqual({x:20,y:27,ancho:30,alto:17});
  });
  // Iván, 23/10/2026: el 80 integrado queda rematado de 9 y no de 11, así que el paño inferior sale 2 cm más corto
  // que en estos cortes reales (281,5 → 279,5…): H + 35,5 con la entrada incorporada.
  it.each([
    ['AR2601036',424,500,42,[58,52,58,52,58,52,58],279.5,256],
    ['AR2600520',430,475,41,[52,52,52,52,52,52,52],266.5,244],
    ['AR2600236',382,450,37,[49,49,49,49,49,49,49],250.5,235],
  ] as const)('doble saco %s: la entrada incorporada ya cuenta en H + 35,5', (_pedido,F,H,pie,pasos,inferior,superior) => {
    const p=base('PUERTAPLE',F,H);
    p.apilable={...p.apilable,pie,pasos:[...pasos],cabecera:70,saco:80,doble:true,empates:[5]};
    p.entradas=alturasTubos(p).map(altura=>({altura,diametro:30,largo:F,alto:12,huecos:[]}));
    const r=calcularPuerta(p);
    expect(r.piezas.filter(x=>x.clase==='pano').map(x=>x.alto)).toEqual([inferior,superior]);
    expect(r.alternativasSaco!.entero[0]).toMatchObject({ancho:F-6+12,alto:37});
    expect(r.alternativasSaco!.entero[0].contorno.slice(4)).toEqual([[12,16],[0,16],[0,2],[12,2]]);
  });
  it.each([['AR2603284',251,297,106],['AR2603277',358,430,239]] as const)('bajo %s: los 125,75 antiguos son un error conocido, confirmado por Iván', (_pedido,F,H,T)=>{
    const p=base('PUERTAENR',F,H); p.enrollable={T,D:60,margen:6,empates:[]};
    const inferior=calcularPuerta(p).piezas.find(x=>x.nombre==='Paño inferior')!;
    expect(inferior.alto).toBe(123.75); expect(inferior.alto).not.toBe(125.75);
  });
  it('no deduce ventanas ni confirma un modelo por sus valores propuestos', () => {
    expect(calcularPuerta(nuevaPuerta('PUERTAPLE')).avisos.map(x => x.codigo)).toEqual(expect.arrayContaining(['MODELO', 'MEDIDAS', 'ROLLO', 'VENTANAS']));
  });
  it('parte la enrollable con unión normal de 2 si no hay entrada viable (respuesta nueva de Iván)', () => {
    const p = base('PUERTAENR', 422, 460);
    p.rollo = 250; p.enrollable = { T: 269, D: 60, margen: 11, empates: [] };
    const r = calcularPuerta(p);
    expect(r.piezas.filter(x => x.clase === 'pano').map(x => x.alto)).toEqual([250,28.25,123.75]);
    expect(r.uniones).toHaveLength(1);
    expect(r.uniones[0].solape).toBe(2);
    expect(r.avisos.some(x=>x.codigo==='NO_CABE')).toBe(false);
    expect(r.piezas.filter(x=>x.clase==='pano').flatMap(x=>x.unionesCorte??[])).toHaveLength(4);
  });
  it('AR2604069: al incorporar la entrada suma 7,5 y se corta una tira menos',()=>{
    const p=base('PUERTAENR',315,494);p.enrollable={T:303,D:60,margen:8,empates:[]};
    p.entradas=[{altura:241,largo:315,alto:8,diametro:30,huecos:[]}];
    const r=calcularPuerta(p);
    expect(r.piezas.filter(x=>x.clase==='pano').map(x=>x.alto)).toEqual([57.5,260.25,123.75]);
    expect(r.piezas.filter(x=>x.clase==='entrada')).toHaveLength(0);
    expect(r.uniones[0]).toMatchObject({solape:7.5,tubo:1});
  });
  it('avisa de cadena, ventanas fuera del frente, paso insuficiente y texto contradictorio', () => {
    const p = base('PUERTAPLE', 400, 475);
    p.observaciones = 'enrollable con varilla superior';
    p.apilable = { ...p.apilable, pie: 41, pasos: [52,52,52], cabecera: 70, saco: 80 };
    p.entradas = alturasTubos(p).map(altura => ({ altura, diametro: 30, largo: 400, alto: 12, huecos: [] }));
    p.ventanas = [{ x: 390, y: 100, ancho: 80, alto: 90, radio: 2, radioCristal: 4 }];
    expect(calcularPuerta(p).avisos.map(x => x.codigo)).toEqual(expect.arrayContaining(['CADENA', 'VENTANA_FRENTE', 'VENTANA_TUBOS', 'TEXTO_MODELO']));
  });
  it('propone el tubo más alto que cabe y conserva los huecos en la entrada incorporada', () => {
    const p = base('PUERTAPLE', 500, 575);
    p.apilable = { ...p.apilable, pie: 37, pasos: Array(9).fill(52), cabecera: 70, saco: 80 };
    p.entradas = alturasTubos(p).map(altura => ({ altura, diametro: 30, largo: 500, alto: 12, huecos: [{ x: 29, y: 2.25, ancho: 12, alto: 7.5, radio: 0.5 }] }));
    const r = calcularPuerta(p);
    expect(r.empates).toEqual([6]);
    expect(r.piezas.find(x => x.clase === 'pano')!.huecos).toHaveLength(1);
    expect(r.piezas.filter(x => x.clase === 'entrada')).toHaveLength(9);
  });
  it('aplica +1 por lado por encima de 600 y no duplica alternativas del saco', () => {
    const p = base('PUERTAPLE', 620, 450);
    p.apilable = { ...p.apilable, pie: 37, pasos: Array(7).fill(49), cabecera: 70, saco: 120 };
    p.entradas = alturasTubos(p).map(altura => ({ altura, diametro: 42, largo: 622, alto: 13.5, huecos: [] }));
    const r = calcularPuerta(p);
    expect(r.piezas.find(x => x.clase === 'pano')!.ancho).toBe(622);
    expect(r.avisos.map(x => x.codigo)).toContain('ESCUADRADO');
    expect(r.alternativasSaco?.entero).toHaveLength(1);
    expect(r.alternativasSaco?.partido).toHaveLength(2);
    expect(r.piezas.filter(x => x.clase === 'saco')).toHaveLength(0);
    p.color = 'NEGRO 9005';
    expect(calcularPuerta(p).alternativasSaco).toBeNull();
    expect(calcularPuerta(p).piezas.find(x => x.clase === 'saco')!.alto).toBe(34); // Saco de 120: rematado 13, corte 34 (Iván, 23/10/2026).
  });
  it('rechaza huecos solapados, radios imposibles y entradas no positivas', () => {
    const p = base('PUERTAENR', 172, 314);
    p.enrollable = { T: 123, D: 60, margen: 6, empates: [] };
    p.entradas = [{ altura: 30, diametro: 30, largo: -1, alto: 8, huecos: [] }];
    p.ventanas = [{ x: 10, y: 20, ancho: 40, alto: 20, radio: 12, radioCristal: 4 }];
    expect(calcularPuerta(p).avisos.some(x => x.nivel === 'error')).toBe(true);
  });
});

describe('Saco del pedido en todas las puertas (Iván, 23/10/2026)', () => {
  // Iván, 24/10/2026 (AR2605220): el rematado queda libre bajo el paño y los 2 de soldar van encima; con el de 80,
  // libre 9, corte 22. El velcro, a 2 de cada lado, desde la mitad del corte.
  it.each([[120,13,30,13],[110,12,28,12],[100,11,26,11],[80,9,22,9]])('enrollable con saco %s: libre %s, corte %s y velcro de %s', (saco,rematado,corte,velcro) => {
    const p = base('PUERTAENR', 172, 314); p.enrollable = { T: 123, D: 60, margen: 6, empates: [], saco };
    const r = calcularPuerta(p), s = r.piezas.find(x => x.clase === 'saco')!, mitad = corte / 2;
    expect(s.alto).toBe(corte);
    expect(s.contorno.slice(4)).toEqual([[6.5,mitad+velcro],[0,mitad+velcro],[0,mitad],[6.5,mitad]]);
    // El paño inferior arranca en el rematado: con el de 100, los 123,75 de los cortes reales.
    expect(r.piezas.find(x => x.nombre === 'Paño inferior')!.alto).toBe(123.75 + 11 - rematado);
  });
  it('enrollable guardada sin saco: el de 100, como se cortaban (26 y paño desde 11)', () => {
    const p = base('PUERTAENR', 172, 314); p.enrollable = { T: 123, D: 60, margen: 6, empates: [] };
    expect(calcularPuerta(p).piezas.find(x => x.clase === 'saco')!.alto).toBe(26);
  });
  it('autorreparable con saco de 120: rematado 13, corte 34 y cuerpo desde 13', () => {
    const p = base('PUERTAUTO', 300, 331); p.autorreparable = { empates: [], saco: 120 };
    const r = calcularPuerta(p);
    expect(r.piezas.find(x => x.clase === 'saco')).toMatchObject({ nombre: 'Saco de 120', alto: 34 });
    expect(r.piezas.find(x => x.clase === 'pano')!.alto).toBe(331 + 3.5 - 13);
  });
  it.each(['PUERTAENR','PUERTAUTO'] as const)('%s sin saco puesto avisa', modelo => {
    const p = base(modelo, 300, 331);
    if (modelo === 'PUERTAENR') p.enrollable.saco = null; else p.autorreparable.saco = null;
    expect(calcularPuerta(p).avisos.some(a => a.codigo === 'SACO' && a.nivel === 'error')).toBe(true);
  });
});
