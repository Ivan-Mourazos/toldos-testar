import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { leerDxf, number, value } from './dxf.ts';
import { quitarLeyendaWeb } from './leyenda.ts';
import { dxfACmt } from './index.ts';

const fixture = (id: string) => readFileSync(new URL(`./__fixtures__/oficina-${id}.dxf`, import.meta.url), 'utf8');
const arial = process.env.CMT_ARIAL_PATH ?? 'C:/Windows/Fonts/arial.ttf';
const serializar = (entidades: {type: string; pairs: [number, string][]}[], fuente = 'arial.ttf') => `0\nSECTION\n2\nHEADER\n9\n$EXTMIN\n10\n0\n20\n0\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nSTYLE\n2\nStandard\n3\n${fuente}\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entidades.map(e=>`0\n${e.type}\n${e.pairs.map(p=>p.join('\n')).join('\n')}`).join('\n')}\n0\nENDSEC\n0\nEOF\n`;
const recta = {type: 'LINE', pairs: [[8,'DISCO1'],[10,'1000'],[20,'800'],[11,'1100'],[21,'800']] as [number,string][]};

describe('leyenda de oficina: solo se retira el conjunto reconocido', () => {
  it.each(['AR2600000', 'AR2604709', 'AR2604983'])('quita figuras y rótulos reales de %s, conservando una recta ajena', id => {
    const d = leerDxf(fixture(id)); d.entities.push(recta);
    const q = quitarLeyendaWeb(d);
    expect(q.quitada).toBe(true);
    expect(q.entidades).toEqual([recta]);
    const r = dxfACmt(serializar(d.entities), {sinLeyenda: true, rutaFuente: 'no-existe.ttf'});
    expect(r.dudas).toEqual([]);
    expect(r.objetos).toHaveLength(1);
    expect(r.objetos[0].paths[0][0].x / (72/25.4)).toBeCloseTo(300);
    expect(r.objetos[0].paths[0][0].y / (72/25.4)).toBeCloseTo(20);
  });
  it('reconoce una leyenda trasladada entera, sin depender del origen ni de mayúsculas de capa', () => {
    const d = leerDxf(fixture('AR2604983'));
    for (const e of d.entities) for (const p of e.pairs) {
      if ([10,11].includes(p[0])) p[1] = String(Number(p[1])+1732.5);
      if ([20,21].includes(p[0])) p[1] = String(Number(p[1])-910);
      if (p[0]===8) p[1]=p[1].toUpperCase();
    }
    expect(quitarLeyendaWeb(d)).toEqual({quitada:true,entidades:[]});
  });
  it('conserva todas las entidades de una leyenda incompleta o con medidas cambiadas', () => {
    const d = leerDxf(fixture('AR2604983'));
    d.entities.pop();
    expect(quitarLeyendaWeb(d)).toEqual({quitada:false,entidades:d.entities});
    const cambiado = leerDxf(fixture('AR2604983'));
    cambiado.entities.find(e=>e.type==='CIRCLE')!.pairs.find(p=>p[0]===40)![1] = '30';
    expect(quitarLeyendaWeb(cambiado).quitada).toBe(false);
  });
  it('no confunde un círculo de corte o rótulos en papel con la leyenda', () => {
    const d=leerDxf(fixture('AR2604983'));
    for(const e of d.entities.filter(e=>e.type==='MTEXT'))e.pairs.push([67,'1']);
    expect(quitarLeyendaWeb(d).quitada).toBe(false);
    expect(quitarLeyendaWeb(leerDxf(serializar([recta]))).quitada).toBe(false);
  });
  it('no retira leyendas ambiguas, giradas o con coordenadas inválidas', () => {
    const ambiguo=leerDxf(fixture('AR2604983'));
    ambiguo.entities.push(structuredClone(ambiguo.entities.find(e=>e.type==='CIRCLE')!));
    expect(quitarLeyendaWeb(ambiguo).quitada).toBe(false);
    const girado=leerDxf(fixture('AR2600000'));
    girado.entities.find(e=>e.type==='TEXT')!.pairs.push([50,'90']);
    expect(quitarLeyendaWeb(girado).quitada).toBe(false);
    const invalido=leerDxf(fixture('AR2604983'));
    invalido.entities[0].pairs.find(p=>p[0]===10)![1]='no es un número';
    expect(quitarLeyendaWeb(invalido).quitada).toBe(false);
  });
});

describe('salida sin textos', () => {
  it('descarta TEXT y MTEXT antes de validar fuentes, formato y capa; informa del número', () => {
    const textos = ['TEXT','MTEXT'].map(type=>({type,pairs:[[8,'capa de notas'],[1,'\\S1/2;']] as [number,string][]}));
    const r=dxfACmt(serializar([recta,...textos],'fuente-desconocida.shx'),{sinTextos:true,rutaFuente:'no-existe.ttf'});
    expect(r.dudas).toEqual([]);
    expect(r.objetos).toHaveLength(1);
    expect(r.avisos.some(a=>/2 textos/.test(a.motivo))).toBe(true);
    expect(dxfACmt(serializar([recta,...textos])).cmt).toBeNull();
  });
  it('reconoce primero la leyenda aunque se pidan descartar los textos', () => {
    const d=leerDxf(fixture('AR2604983'));d.entities.push(recta);
    const r=dxfACmt(serializar(d.entities),{sinLeyenda:true,sinTextos:true});
    expect(r.dudas).toEqual([]);
    expect(r.objetos).toHaveLength(1);
  });
});

describe('geometría de los planos de oficina', () => {
  it('lee los extremos LINE con normal negativa como coordenadas del dibujo (AR2605060)', () => {
    const plano=fixture('AR2605060');
    const d=leerDxf(plano);
    const r=dxfACmt(plano,{compatibilidadRobot:false});
    expect(r.dudas).toEqual([]);
    expect(r.objetos).toHaveLength(2);
    const distancia=Math.abs(r.objetos[0].paths[0][1].y-r.objetos[0].paths[0][0].y)/(72/25.4);
    expect(distancia).toBeCloseTo(620);
    expect(number(d.entities[0],230)).toBe(-1);
  });
  it('proyecta al plano XY tanto el residuo numérico como la elevación observada', () => {
    const e={...recta,pairs:[...recta.pairs,[30,'-0.0000000000829829']] as [number,string][]};
    expect(dxfACmt(serializar([e])).dudas).toEqual([]);
    e.pairs[e.pairs.length-1]=[30,'0.1'];
    expect(dxfACmt(serializar([e])).dudas).toEqual([]);
    expect(dxfACmt(serializar([e])).avisos.some(a=>/proyecta/.test(a.motivo))).toBe(true);
  });
  it.each(['corte','curv','TALADADRO'])('conserva %s sin herramienta con aviso para el técnico', capa=>{
    const e={...recta,pairs:recta.pairs.map(([c,v]): [number,string]=>[c,c===8?capa:v])};
    const r=dxfACmt(serializar([e]));
    expect(r.dudas).toEqual([]);
    expect(r.objetos[0].tool).toBe('');
    expect(r.avisos.some(a=>a.capa===capa&&/asígnala en CUTMatic/.test(a.motivo))).toBe(true);
  });
});

describe('textos de oficina', () => {
  it.skipIf(!existsSync(arial))('comparación histórica directa: conserva el espacio de fragmento sin descomponer', () => {
    const e={type:'MTEXT',pairs:[[8,'texto'],[3,'{\\C1;OPCION\\~'],[1,'UNIDOS}'],[10,'200'],[20,'700'],[40,'100'],[71,'1']] as [number,string][]};
    const r=dxfACmt(serializar([e]),{rutaFuente:arial,preparacionMtext:'directa'});
    const simple={type:'TEXT',pairs:[[8,'texto'],[1,'OPCION UNIDOS'],[10,'200'],[20,'600'],[40,'100']] as [number,string][]};
    expect(r.dudas).toEqual([]);
    expect(r.cmt).toEqual(dxfACmt(serializar([simple]),{rutaFuente:arial}).cmt);
  });
  it.skipIf(!existsSync(arial))('comparación histórica directa de AR2604983, cuyo robot recibió MTEXT sin descomponer', () => {
    const d=leerDxf(fixture('AR2604983'));
    const e=d.entities.find(e=>e.type==='MTEXT')!;
    const mt=dxfACmt(serializar([e]),{rutaFuente:arial,compatibilidadRobot:false,preparacionMtext:'directa'});
    const text={type:'TEXT',pairs:e.pairs.filter(([c])=>![20,41,71,72,73].includes(c)).concat([[20,String(number(e,20)-number(e,40))]])};
    const simple=dxfACmt(serializar([text]),{rutaFuente:arial,compatibilidadRobot:false});
    expect(mt.dudas).toEqual([]);
    expect(mt.objetos.map(o=>o.paths)).toEqual(simple.objetos.map(o=>o.paths));
  });
  it.skipIf(!existsSync(arial))('comparación histórica directa: 21 contornos de AR2604983 antes de exigir descomposición', () => {
    // La etiqueta exterior real se conserva en el recorte específico, sin el resto del pedido.
    const r=dxfACmt(fixture('AR2604983-texto'),{rutaFuente:arial,preparacionMtext:'directa'});
    const robot=JSON.parse(readFileSync(new URL('./__fixtures__/oficina-mtext-robot.json',import.meta.url),'utf8')) as {objetos:{tool:string;paths:number[][][]}[]};
    expect(r.dudas).toEqual([]);
    expect(r.objetos).toHaveLength(robot.objetos.length);
    for(const [i,o] of r.objetos.entries())for(const [j,p]of o.paths.entries()) {
      expect(o.tool).toBe(robot.objetos[i].tool);
      expect(p).toHaveLength(robot.objetos[i].paths[j].length);
      for(const [k,q]of p.entries()) {
        const [x,y,t]=robot.objetos[i].paths[j][k];
        expect(q.type).toBe(t);
        expect(Math.hypot(q.x-x,q.y-y)/(72/25.4)).toBeLessThan(.05);
      }
    }
  });
  it.skipIf(!existsSync(arial))('txt.shx reproduce los contornos Arial comprobados y avisa de la sustitución', () => {
    const e={type:'TEXT',pairs:[[8,'texto'],[1,'OPCION UNIDOS'],[10,'200'],[20,'300'],[40,'400']] as [number,string][]};
    const shx=dxfACmt(serializar([e],'txt.shx'),{rutaFuente:arial});
    const ttf=dxfACmt(serializar([e]),{rutaFuente:arial});
    expect(shx.dudas).toEqual([]);
    expect(shx.cmt).toEqual(ttf.cmt);
    expect(shx.avisos.some(a=>/txt.shx.*Arial/.test(a.motivo))).toBe(true);
    const simplex=dxfACmt(serializar([e],'simplex.shx'),{rutaFuente:arial});
    expect(simplex.cmt).toEqual(ttf.cmt);
    expect(simplex.avisos.some(d=>/simplex.shx.*Arial/.test(d.motivo))).toBe(true);
  });
  it('explica al técnico qué hacer con una spline, un bloque y un texto sin conversión segura', () => {
    const r=dxfACmt(serializar([{type:'SPLINE',pairs:[[8,'DISCO1']]},{type:'MTEXT',pairs:[[8,'texto'],[1,'\\S1/2;'],[10,'0'],[20,'0'],[40,'10']]}]));
    expect(r.cmt).toBeNull();
    expect(r.dudas.some(d=>d.tipo==='SPLINE'&&d.capa==='DISCO1')).toBe(true);
    const bloque=dxfACmt(serializar([{type:'INSERT',pairs:[[8,'ROTULADOR']]}]));
    expect(bloque.dudas.some(d=>/bloque.*ROTULADOR.*descomp/i.test(d.motivo))).toBe(true);
    expect(r.dudas.some(d=>d.tipo==='MTEXT')).toBe(false);
    expect(r.dudas.some(d=>d.tipo==='SPLINE')).toBe(true);
    expect(value(leerDxf(fixture('AR2604736')).entities[0],8)).toBe('ROTULADOR');
  });
  it.skipIf(!existsSync(arial)).each(['AR2604860','AR2605027','AR2605250','AR2605332'])('convierte %s con textos y avisa de la disposición que requiere revisión', id=>{
    const r=dxfACmt(fixture(id),{sinLeyenda:true,rutaFuente:arial});
    expect(r.dudas).toEqual([]);
    expect(r.cmt).not.toBeNull();
    expect(r.avisos.some(d=>/descompuesto.*textos de varias líneas/.test(d.motivo))).toBe(true);
    expect(dxfACmt(fixture(id),{sinLeyenda:true,sinTextos:true}).dudas).toEqual([]);
  });
  it.skipIf(!existsSync(arial))('ignora las columnas CAD, como el importador, y lo avisa', () => {
    const e=leerDxf(fixture('AR2604859')).entities[0];
    const col=e.pairs.findIndex(([c,v])=>c===1070&&v==='76');
    e.pairs[col+1][1]='2';
    const r=dxfACmt(serializar([e]),{rutaFuente:arial});
    expect(r.dudas).toEqual([]);
    expect(r.cmt).not.toBeNull();
    expect(r.avisos.some(d=>/columnas CAD/.test(d.motivo))).toBe(true);
  });
});

