import { createHash } from 'node:crypto';
import { anchoArial } from '../domain/corteLona/texto.js';
import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { puertasDesdeRps } from './rps.ts';
import { corteDelPlano } from '../flujoDwg/corteDwg.js';
import { geometriaAlzado } from './alzado.ts';
import { elegirPerfilAraujo } from './araujo.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { registrosDxf, numero, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { araujo5365, araujo5733, araujo6255, tramoAraujo, ventanaAraujo } from './__fixtures__/araujo.ts';
import type { PedidoPuertas, Puerta } from './tipos.ts';

const pedido = (p: Puerta): PedidoPuertas => ({ schemaVersion: 1, kind: 'puertas', orderCode: 'AR2605365', elementos: [{ id: 'a', input: p }] });
const cortes = (p: Puerta) => calcularPuerta(p).piezas.map(x => [x.clase, x.ancho, x.alto, x.cantidad]);
describe('ARAUJO, tramos y bolsas con canutillo', () => {
  it('5733: medidas de hoja y E.T. de 13/12; conserva las rayas de máquina y las referencias del plano',()=>{
    const p=araujo5733(),r=calcularPuerta(p);
    expect(r.avisos.filter(a=>a.nivel==='error')).toEqual([]);
    expect(r.piezas.map(x=>[x.clase,x.ancho,x.alto,x.cantidad])).toEqual([
      ['pano',475,99.9,4],['pano',475,49.7,1],['pano',475,36.7,1],
    ]);
    expect(r.piezas.filter(x=>x.clase==='pano').map(x=>x.of)).toEqual(['0222632','0222633','0222634']);
    expect(r.piezas[2].material).toBe('LAC900 AMARILLO');
    expect(r.piezas[0].marcas.map(m=>m[1])).toEqual([7,92.9,35.2]);
    expect(r.piezas[1].marcas.map(m=>m[1])).toEqual([24,42.7]);
    expect(r.piezas[2].marcas.map(m=>m[1])).toEqual([24,29.7]);
    const g=geometriaAlzado(p,r),pie=g.grupos![1],rect=pie.find(f=>f.tipo==='rect')!;
    const y=rect.tipo==='rect'?rect.y:0;
    const refs=pie.filter(f=>f.tipo==='linea'&&f.clase==='puerta-referencia').map(f=>f.tipo==='linea'?f.y1-y:0);
    expect(refs[0]).toBeCloseTo(3.7);expect(refs[1]).toBeCloseTo(37.7);
    expect(g.formas.filter(f=>f.tipo==='texto').flatMap(f=>f.tipo==='texto'?f.lineas:[]).join(' ')).toContain('DEJAR HUECOS 9');
    const vista=generarCortePuertas(pedido(p));
    expect(vista.archivo).not.toBeNull();
    expect(r.piezas.reduce((s,x)=>s+x.cantidad,0)).toBe(6);
    expect(r.piezas.reduce((s,x)=>s+x.ancho*x.alto*x.cantidad,0)).toBeCloseTo(230850);
    expect(vista.cortes.flatMap(c=>c.colocadas)).toHaveLength(6);
    expect(vista.archivo!.entidades.textos.some(t=>/\bET\b/.test(t.valor))).toBe(false);
    expect(leerPedidoPuertas(pedido(p))).toEqual(pedido(p));
  });
  it.each(['tramo','continua'])('las E.T. intermedias de %s y ambos extremos solo preparan el cuerpo, sin piezas ni consumo propios',forma=>{
    const p=araujo5733(),t=p.araujo!.tramos[0];
    p.araujo!.tramos=[t];t.arriba={tipo:'et',ancho:12};t.abajo={tipo:'et',ancho:12};
    if(forma==='continua'){
      p.araujo!.forma='continua';t.entradas=[];
      p.entradas=[{altura:38,alto:13,largo:475,diametro:30,huecos:[]}];
    }
    const r=calcularPuerta(p),vista=generarCortePuertas(pedido(p));
    expect(r.avisos.filter(a=>a.nivel==='error')).toEqual([]);
    expect(r.piezas).toHaveLength(1);
    expect(r.piezas[0]).toMatchObject({clase:'pano',ancho:475,alto:116.5,cantidad:4});
    expect(r.piezas[0].marcas.map(m=>m[1])).toEqual([24,92.5,43.5]);
    expect(vista.cortes.flatMap(c=>c.colocadas)).toHaveLength(4);
    expect(vista.archivo).not.toBeNull();
    expect(vista.archivo!.entidades.textos.some(t=>/\bET\b/.test(t.valor))).toBe(false);
  });
  it('5365 conserva el cálculo al corregir los rótulos del plano y del bot',()=>{
    const p=araujo5365(),doc=pedido(p);
    const valores=[JSON.stringify(calcularPuerta(p))];
    expect(valores.map(x=>createHash('sha256').update(x).digest('hex'))).toEqual([
      '9c0334ba14b36fc630c77164a78490687c495c34754fbae9fd943de266e4ede8',
    ]);
    const vista=generarCortePuertas(doc);
    expect(vista.archivo!.entidades.textos.map(t=>t.valor)).toContain('A4 · BOLSA');
    expect(vista.archivo!.entidades.textos.some(t=>/SACO/.test(t.valor))).toBe(false);
    const plano=escribirPlanoPuertas({pedido:doc,cabecera:{cliente:'ARAUJO',tecnico:'IVÁN',revisor:'',fecha:'2026-11-04'}});
    const textos=registrosDxf(plano).filter(r=>r.tipo==='TEXT'||r.tipo==='MTEXT').map(r=>valor(r,1));
    expect(textos).toContain('A4');
    expect(textos).toContain('A4 · BOLSA');
  });
  it('numera también las bolsas intercaladas igual en el alzado y en el corte',()=>{
    const p=araujo5365(),bolsa=p.araujo!.tramos[3];
    p.araujo!.tramos=[bolsa,...p.araujo!.tramos.slice(0,2),{...bolsa}];
    const g=geometriaAlzado(p,calcularPuerta(p));
    g.grupos!.forEach((grupo,i)=>expect(grupo).toContainEqual(expect.objectContaining({tipo:'texto',lineas:['A'+(i+1)]})));
    const textos=generarCortePuertas(pedido(p)).archivo!.entidades.textos.map(t=>t.valor);
    expect(textos).toContain('A1 · BOLSA');expect(textos).toContain('A4 · BOLSA');
    expect(textos).toContain('A2');expect(textos).toContain('A3');
  });
  it('rótulos de Iván: identificador dentro, X4 aparte, OF y REVÉS una vez por OF, remates breves y sin notas de soldadura añadidas',()=>{
    const p=araujo5733(),g=geometriaAlzado(p,calcularPuerta(p));
    const textos=g.formas.filter(f=>f.tipo==='texto').flatMap(f=>f.tipo==='texto'?f.lineas:[]);
    for(const t of ['A1','A2','A3','X4','VARILLA BLANCA (5,5 mm)','E.T. (DEJAR HUECOS 9)','E.T.'])expect(textos).toContain(t);
    expect(textos.join(' ')).not.toMatch(/TRAMO 1|UD\.|CANUTILLO ·|EJE A|SOLDADA ALTA FRECUENCIA|BOLSA SOLDADA/);
    const contorno=g.grupos![0].find(f=>f.tipo==='rect')!;
    const identificador=g.grupos![0].find(f=>f.tipo==='texto'&&f.lineas[0]==='A1')!;
    if(contorno.tipo==='rect'&&identificador.tipo==='texto')expect(identificador.y).toBeGreaterThan(contorno.y);
    const normal=geometriaAlzado(araujo5365(),calcularPuerta(araujo5365())).formas.filter(f=>f.tipo==='texto').flatMap(f=>f.tipo==='texto'?f.lineas:[]);
    expect(normal.filter(t=>t==='0233643')).toHaveLength(1);
    expect(normal.filter(t=>t==='REVÉS')).toHaveLength(1);
    const modelo=geometriaAlzado(araujo5365(),calcularPuerta(araujo5365())).grupos!;
    const corte=modelo[0].find(f=>f.tipo==='cota'&&f.valor===102.4)!;
    const terminado=modelo[0].find(f=>f.tipo==='cota'&&f.valor===95)!;
    if(corte.tipo==='cota'&&terminado.tipo==='cota'){
      expect(corte.linea).toBeLessThan(terminado.linea);expect(terminado.linea).toBeLessThan(0);
    }
    expect(modelo[0].filter(f=>f.tipo==='cota'&&f.valor===7)).toHaveLength(2);
    expect(modelo[2]).toContainEqual(expect.objectContaining({tipo:'cota',valor:8}));
    expect(modelo[3]).toContainEqual(expect.objectContaining({tipo:'texto',lineas:['A4']}));
  });
  it('rechaza E.T. sin ancho, marcas cruzadas y entradas fuera, solapadas o que invaden ventanas',()=>{
    for(const parche of [{abajo:{tipo:'et',ancho:0}},{arriba:{tipo:'et',ancho:150}},
      {entradas:[{altura:2,ancho:13}]},{entradas:[{altura:38,ancho:13},{altura:39,ancho:12}]},
      {entradas:[{altura:38,ancho:13}],ventanas:[ventanaAraujo(44,30)]}]){
      const p=araujo5733();Object.assign(p.araujo!.tramos[0],parche);
      expect(generarCortePuertas(pedido(p)).archivo).toBeNull();
    }
    for(const parche of [{arriba:{tipo:'otro',ancho:12}},{entradas:[{altura:'38',ancho:13}]},{abajo:{tipo:'et',ancho:Infinity}}]){
      const p=araujo5733();Object.assign(p.araujo!.tramos[0],parche);
      expect(()=>leerPedidoPuertas(pedido(p))).toThrow();
    }
  });
  it('impresa 5656 conserva el cuerpo entero; 6255 reparte a 300 y suma 2 al paño superior',()=>{
    const p=araujo5365();p.color='BLANCO';p.araujo!.forma='continua';p.araujo!.corteTrasImprimir=true;
    p.araujo!.tramos=[tramoAraujo(157,269.5)];p.entradas=[70,140].map(altura=>({altura,alto:12,largo:157,diametro:30,huecos:[]}));
    const r=generarCortePuertas(pedido(p));
    expect(r.archivo).not.toBeNull();
    expect(r.resultados[0].piezas[0]).toMatchObject({ancho:157,alto:276.9,sinGiro:true});
    expect(r.cortes.flatMap(c=>c.colocadas).filter(c=>c.pieza.clase==='pano').every(c=>!c.girada)).toBe(true);
    const q=araujo6255(),v=generarCortePuertas(pedido(q));
    expect(v.avisos.filter(a=>a.nivel==='error')).toEqual([]);
    expect(v.archivo).not.toBeNull();
    const cuerpos=v.resultados[0].piezas.filter(p=>p.clase==='pano');
    expect(cuerpos.map(p=>[p.ancho,p.alto,p.sinGiro])).toEqual([[147,300,true],[147,9.4,true]]);
    expect(cuerpos.map(p=>p.marcas.map(m=>m[1]))).toEqual([[7,72.7,162.7],[2.4,2]]);
    expect(cuerpos.map(p=>p.impresionAraujo?.desdeBajo)).toEqual([0,298]);
    expect(cuerpos.reduce((s,p)=>s+p.ancho*p.alto,0)).toBeCloseTo(147*(307.4+2));
    expect(v.cortes.flatMap(c=>c.colocadas).filter(c=>c.pieza.clase==='pano').every(c=>!c.girada)).toBe(true);
    expect(v.resultados[0].piezas.some(p=>p.clase==='entrada')).toBe(false);
    const plano=escribirPlanoPuertas({pedido:pedido(q),cabecera:{cliente:'ARAUJO',tecnico:'IVÁN',revisor:'',fecha:'2026-11-04'}});
    const dimensiones=registrosDxf(plano).filter(e=>e.tipo==='DIMENSION');
    // Las distancias a las marcas aparecen tanto en el alzado como fuera de la pieza de corte.
    for(const medida of [72.7,162.7])expect(dimensiones.filter(e=>Math.abs(numero(e,42)-medida)<1e-5)).toHaveLength(2);
    expect(dimensiones.filter(e=>Math.abs(numero(e,42)-9.4)<1e-5)).toHaveLength(1);
    expect(dimensiones.filter(e=>Math.abs(numero(e,42)-12)<1e-5)).toHaveLength(4);
    expect(registrosDxf(v.archivo!.dxf).some(e=>e.tipo==='DIMENSION')).toBe(false);
  });
  it.each([[130,260,267.4],[155,330,337.4],[185,263,270.4]])('impresas 6217/3254: %s × %s, el corte %s incluye los 7 hasta el borde que la cota a marca no mide',(frente,alto,corte)=>{
    const p=araujo5365();p.araujo!.forma='continua';p.araujo!.tramos=[tramoAraujo(frente,alto)];
    const cuerpo=calcularPuerta(p).piezas[0];
    expect(cuerpo.alto).toBe(corte);
    expect(cuerpo.marcas[1][1]).toBeCloseTo(alto+0.4);
  });
  it('impresas: cada rollo superior añade 2, sin trasladar ni perder las ventanas que cruzan el empate',()=>{
    const p=araujo6255();p.araujo!.tramos=[{...tramoAraujo(147,630),ventanas:[ventanaAraujo(20,280)]}];
    p.entradas=[];
    const v=generarCortePuertas(pedido(p));
    expect(v.avisos.filter(a=>a.nivel==='error')).toEqual([]);
    const panos=v.resultados[0].piezas.filter(p=>p.clase==='pano');
    expect(panos.map(p=>p.alto)).toEqual([300,300,41.4]);
    expect(panos.map(p=>p.impresionAraujo?.desdeBajo)).toEqual([0,298,596]);
    expect(panos.slice(0,2).map(p=>p.huecos[0].y+p.impresionAraujo!.desdeBajo)).toEqual([283.7,283.7]);
    for(const c of v.cortes)for(const t of c.colocadas.filter(t=>t.pieza.clase==='pano')){
      const dentro=(x:number,y:number)=>x>=t.x-.01&&x<=t.x+t.pieza.ancho*10+.01&&y>=t.y-.01&&y<=t.y+t.pieza.alto*10+.01;
      const cutter=c.entidades.lineas.filter(l=>l.capa==='CUTTER'&&dentro((l.x1+l.x2)/2,(l.y1+l.y2)/2));
      cutter.forEach(l=>{expect(dentro(l.x1,l.y1)).toBe(true);expect(dentro(l.x2,l.y2)).toBe(true);});
    }
  });
  it('el anagrama habitual conserva ancho, derecho y la cota de 8 desde el bajo del modelo de Iván',()=>{
    const p=araujo5365();
    expect(p.araujo!.tramos[2].rotulacion).toEqual({texto:'ANAGRAMA J. ARAUJO',ancho:20,desdeDerecha:15,desdeBajo:8});
    expect(calcularPuerta(p).avisos).toEqual([]);
    expect(geometriaAlzado(p,calcularPuerta(p)).formas.filter(f=>f.tipo==='texto').flatMap(f=>f.tipo==='texto'?f.lineas:[]).join(' ')).not.toMatch(/8 del bajo|pendientes de comprobar/);
  });
  it('la cota 8 queda a la izquierda de ROTULACIÓN, con el tamaño de las demás cotas y el 15 al borde derecho',()=>{
    const p=araujo5365(),g=geometriaAlzado(p,calcularPuerta(p));
    const grupo=g.grupos![2],rotulo=grupo.find(f=>f.tipo==='texto'&&f.lineas[0]==='ROTULACIÓN')!;
    const alto=grupo.find(f=>f.tipo==='cota'&&f.valor===8)!;
    const derecho=grupo.find(f=>f.tipo==='cota'&&f.valor===15)!;
    const contorno=grupo.find(f=>f.tipo==='rect')!;
    if(rotulo.tipo!=='texto'||alto.tipo!=='cota'||derecho.tipo!=='cota'||contorno.tipo!=='rect')throw Error('Faltan las cotas del anagrama');
    const anchoTexto=anchoArial(rotulo.lineas[0],rotulo.tamano!);
    expect(alto.linea).toBeLessThan(rotulo.x-anchoTexto-g.letraBase);
    expect(alto.texto.y).toBeLessThan(Math.min(alto.y1,alto.y2));
    expect(derecho.x2).toBe(contorno.x+contorno.ancho);
    expect(derecho.x2-derecho.x1).toBe(15);
    const plano=escribirPlanoPuertas({pedido:pedido(p),cabecera:{cliente:'ARAUJO',tecnico:'IVÁN',revisor:'',fecha:'2026-11-04'}});
    const cotas=registrosDxf(plano,'BLOCKS').filter(r=>r.tipo==='MTEXT');
    expect(numero(cotas.find(r=>valor(r,1)==='8')!,40)).toBe(0.1);
    expect(numero(cotas.find(r=>valor(r,1)==='8')!,40)).toBe(numero(cotas.find(r=>valor(r,1)==='15')!,40));
    const dimension=registrosDxf(plano).find(r=>r.tipo==='DIMENSION'&&Math.abs(numero(r,42)-8)<1e-6)!;
    expect(numero(dimension,21)).toBeGreaterThan(Math.max(numero(dimension,23),numero(dimension,24)));
    expect(numero(dimension,70)&128).toBe(128);
  });

  it('los DXF distinguen rotulador rojo a 7 del corte y referencia magenta a 3,7, exclusiva del plano',()=>{
    const p=araujo5365(),g=geometriaAlzado(p,calcularPuerta(p)),pieza=g.grupos![0];
    const contorno=pieza.find(f=>f.tipo==='rect')!;
    const y=contorno.tipo==='rect'?contorno.y:0;
    expect(pieza.filter(f=>f.tipo==='linea'&&f.clase==='puerta-marca').map(f=>f.tipo==='linea'?Number((f.y1-y).toFixed(8)):0)).toEqual([7,95.4]);
    const referencias=pieza.filter(f=>f.tipo==='linea'&&f.clase==='puerta-referencia').map(f=>f.tipo==='linea'?f.y1-y:0);
    expect(referencias[0]).toBeCloseTo(3.7);expect(referencias[1]).toBeCloseTo(98.7);
    const bot=generarCortePuertas(pedido(p)).archivo!;
    expect(bot.entidades.lineas.some(l=>l.capa==='referencias')).toBe(false);
    const plano=escribirPlanoPuertas({pedido:pedido(p),cabecera:{cliente:'ARAUJO',tecnico:'IVÁN',revisor:'',fecha:'2026-11-03'}});
    for(const dxf of [bot.dxf,plano]){
      const capas=registrosDxf(dxf,'TABLES').filter(r=>r.tipo==='LAYER');
      expect(numero(capas.find(r=>valor(r,2)==='ROTULADOR')!,62)).toBe(1);
    }
    const capas=registrosDxf(plano,'TABLES').filter(r=>r.tipo==='LAYER');
    expect(numero(capas.find(r=>valor(r,2)==='referencias')!,62)).toBe(6);
  });
  it('Iván fija 7 por defecto para todos los pedidos; COMB de 6,5 queda como elección manual',()=>{
    const p=nuevaPuertaDeCliente('araujo','enrollable-tramos');
    expect(p.araujo).toMatchObject({perfil:'7'});
    const pendiente=araujo5365();
    expect(generarCortePuertas(pedido(pendiente)).archivo).not.toBeNull();
    for(const perfil of ['7','6,5']){
      const elegido=elegirPerfilAraujo(pendiente,perfil);
      expect(elegido).toMatchObject({confirmada:false,ventanasConfirmadas:false,araujo:{perfil}});
      expect(generarCortePuertas(pedido({...elegido,confirmada:true,ventanasConfirmadas:true})).archivo).not.toBeNull();
    }
    expect(()=>elegirPerfilAraujo(pendiente,'desconocido')).toThrow();
  });
  it('la rotulación puede llevar la referencia de 8 cm por el derecho sin inventar el arte ni su alto',()=>{
    const p=araujo5365(),t=p.araujo!.tramos[2];
    t.rotulacion={...t.rotulacion!,desdeBajo:8,dosCaras:false};
    expect(calcularPuerta(p).avisos.filter(a=>a.nivel==='error')).toEqual([]);
    expect(geometriaAlzado(p,calcularPuerta(p)).formas).toContainEqual(expect.objectContaining({tipo:'cota',valor:8}));
    const original=cortes(p);
    t.rotulacion.dosCaras=true;
    expect(cortes(p)).toEqual(original);
    t.rotulacion.desdeBajo=101;
    expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({codigo:'ROTULACION',nivel:'error'}));
    t.rotulacion.dosCaras='sí' as never;
    expect(()=>leerPedidoPuertas(pedido(p))).toThrow();
  });
  it('5365: deja sitio para la letra de cota CAD entre canutillo, cadena de ventanas y frente siguiente',()=>{
    const p=araujo5365(),g=geometriaAlzado(p,calcularPuerta(p)),ventanas=g.grupos![1],siguiente=g.grupos![2];
    const cadena=ventanas.filter(f=>f.tipo==='cota'&&[39,44].includes(f.valor));
    const notas=ventanas.filter(f=>f.tipo==='texto'&&f.lineas[0].startsWith('VARILLA BLANCA'));
    const bajo=Math.max(...notas.map(f=>f.tipo==='texto'?f.y:0));
    expect(bajo-Math.max(...cadena.map(f=>f.tipo==='cota'?f.linea:0))).toBeGreaterThan(30);
    const frente=siguiente.find(f=>f.tipo==='cota'&&f.valor===307)!;
    expect((frente.tipo==='cota'?frente.linea:0)-Math.max(...cadena.map(f=>f.tipo==='cota'?f.linea:0))).toBeGreaterThan(30);
  });
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
    const vista=generarCortePuertas(pedido(p));
    expect(vista.cortes.flatMap(c=>c.colocadas).filter(t=>t.pieza.clase==='pano')).toHaveLength(3);
    expect(vista.cortes.flatMap(c=>c.colocadas).find(t=>t.pieza.clase==='saco')!.pieza.multiplicador).toBe(2);
    const textos=geometriaAlzado(p,calcularPuerta(p)).grupos!.map(g=>g.filter(f=>f.tipo==='texto').flatMap(f=>f.tipo==='texto'?f.lineas:[]));
    expect(textos.map(t=>t.find(s=>/^X\d+$/.test(s)))).toEqual(['X1','X2','X2']);
    expect(calcularPuerta(p).piezas.filter(x=>x.clase==='pano').reduce((s,x)=>s+x.ancho*x.alto*x.cantidad,0)).toBeCloseTo(307*(102.4+107.4*2));
    expect(vista.cortes.flatMap(c=>c.colocadas).filter(t=>t.pieza.clase==='pano').reduce((s,t)=>s+t.pieza.ancho*t.pieza.alto,0)).toBeCloseTo(307*(102.4+107.4*2));
    // Mismo frente y ventanas del 4713, repitiendo dos veces el tramo con las dos ventanas.
    p.araujo!.tramos[0].cantidad=2;
    const repetido=generarCortePuertas(pedido(p));
    expect(repetido.cortes.flatMap(c=>c.colocadas).filter(t=>t.pieza.clase==='pano')).toHaveLength(4);
    expect(repetido.cortes.flatMap(c=>c.colocadas).find(t=>t.pieza.clase==='cristal')!.pieza.multiplicador).toBe(4);
    expect(repetido.resultados[0].piezas.filter(x=>x.clase==='cristal').reduce((s,x)=>s+x.cantidad,0)).toBe(4);
    expect(repetido.resultados[0].piezas.filter(x=>x.clase==='cristal').reduce((s,x)=>s+x.ancho*x.alto*x.cantidad,0)).toBe(94*39*4);
  });
  it('COMB de 6,5: regla de Iván con referencia a 3,45; el 4373 histórico llevaba 0,25 más de corte', () => {
    const p = araujo5365(); p.araujo!.perfil = '6,5'; p.araujo!.tramos = [{ ...tramoAraujo(540,69,2), ventanas: [79,225,371].map(x=>ventanaAraujo(x,19.5,90,30)) }, tramoAraujo(540,65),tramoAraujo(540,53)];
    const r = calcularPuerta(p);
    expect(r.piezas.filter(x=>x.clase==='pano').map(x=>[x.ancho,x.alto,x.cantidad])).toEqual([[540,75.9,2],[540,71.9,1],[540,59.9,1]]);
    expect(r.piezas[0].marcas[0][1]).toBe(6.5);
    const g=geometriaAlzado(p,r),contorno=g.grupos![0].find(f=>f.tipo==='rect')!;
    const referencia=g.grupos![0].find(f=>f.tipo==='linea'&&f.clase==='puerta-referencia')!;
    expect((referencia.tipo==='linea'?referencia.y1:0)-(contorno.tipo==='rect'?contorno.y:0)).toBeCloseTo(3.45);
    expect(r.piezas.filter(x=>x.clase==='cristal').map(x=>[x.ancho,x.alto,x.cantidad])).toEqual([[94,34,2],[94,34,2],[94,34,2]]);
    const vista=generarCortePuertas(pedido(p));
    expect(vista.cortes.flatMap(c=>c.colocadas).filter(t=>t.pieza.clase==='pano')).toHaveLength(4);
    expect(vista.cortes.flatMap(c=>c.colocadas).find(t=>t.pieza.clase==='cristal')!.pieza.multiplicador).toBe(6);
    expect(vista.cortes.flatMap(c=>c.colocadas).filter(t=>t.pieza.clase==='pano').reduce((s,t)=>s+t.pieza.ancho*t.pieza.alto,0)).toBeCloseTo(540*(75.9*2+71.9+59.9));
    expect(geometriaAlzado(p,r).grupos![0]).toContainEqual(expect.objectContaining({tipo:'texto',lineas:['X2']}));
  });
  it('2986: cuerpo continuo de 134 × 287,4, dos entradas de 12 y bolsa separada', () => {
    const p = araujo5365(); p.modelo='PUERTAPLE'; p.color='BLANCO'; p.araujo!.forma='continua';p.araujo!.tramos=[tramoAraujo(134,280),tramoAraujo(126.5,28,1,'bolsa')];
    p.entradas=[70,140].map(altura=>({altura,diametro:30,largo:134,alto:12,huecos:[]}));
    expect(cortes(p)).toEqual([['pano',134,287.4,1],['saco',126.5,35.4,1]]);
    expect(calcularPuerta(p).piezas[0].marcas.map(m=>m[1])).toEqual([7,280.4,67.7,137.7]);
    expect(geometriaAlzado(p,calcularPuerta(p)).grupos![0].filter(f=>f.tipo==='linea'&&f.clase==='puerta-marca')).toHaveLength(4);
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
    for(const t of ['0233643','VARILLA BLANCA','ROTULACI','DISCO1','DIMENSION'])expect(dxf).toContain(t);
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
