import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { leerCmt, serializarCmt, dxfACmt } from './index.ts';

const fixture = (name: string) => readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), 'utf8');
const original = (name: string) => Buffer.from(fixture(`${name}.cmt.base64`), 'base64');
const arial = process.env.CMT_ARIAL_PATH ?? 'C:/Windows/Fonts/arial.ttf';
const dibujo = (entidades: string) => `0\nSECTION\n2\nHEADER\n9\n$EXTMIN\n10\n0\n20\n0\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entidades}\n0\nENDSEC\n0\nEOF\n`;

describe('conservación del CMT', () => {
  for (const pedido of ['AR2605305', 'AR2604991', 'AR2605081']) {
    it(`reescribe todos los bytes de ${pedido}`, () => {
      const buffer = original(pedido);
      const doc = leerCmt(buffer);
      expect(doc.consumidos).toBe(buffer.length);
      expect(serializarCmt(doc)).toEqual(buffer);
    });
  }
  it('rechaza truncados y una longitud de miniatura imposible', () => {
    const buffer = original('AR2605305');
    expect(() => leerCmt(buffer.subarray(0, -1))).toThrow();
    buffer.writeUInt32LE(0xffffffff, 22);
    expect(() => leerCmt(buffer)).toThrow();
  });
});

describe('conversión independiente del DXF', () => {
  it('sitúa una recta en 300/20 mm y asigna DISCO1', () => {
    const r = dxfACmt(dibujo('0\nLINE\n8\nDISCO1\n10\n0\n20\n0\n11\n100\n21\n0'));
    expect(r.dudas).toEqual([]);
    const o = leerCmt(r.cmt!).objects[0];
    expect(o.tool).toBe('CM-CUTW-Def');
    expect(o.paths[0].points[0].x).toBeCloseTo(300 * 72 / 25.4);
    expect(o.paths[0].points[0].y).toBeCloseTo(20 * 72 / 25.4);
  });
  for (const [tipo, extra] of [['SPLINE', ''], ['MTEXT', '1\nPendiente'], ['LINE', '']]) {
    it(`bloquea ${tipo} o capa desconocida sin fichero parcial`, () => {
      const r = dxfACmt(dibujo(`0\n${tipo}\n8\nDESCONOCIDA\n${extra}`));
      expect(r.dudas.length).toBeGreaterThan(0);
      expect(r.cmt).toBeNull();
    });
  }
  it('explica que falta la fuente y rechaza SHX', () => {
    const r = dxfACmt(dibujo('0\nTEXT\n8\ntexto\n1\nHola\n40\n10'), { rutaFuente: '/fuente/ausente/arial.ttf' });
    expect(r.cmt).toBeNull();
    expect(r.dudas.some(d => /fuente/i.test(d.motivo))).toBe(true);
    const shx = dibujo('0\nTEXT\n8\ntexto\n7\nSHX\n1\nHola\n40\n10').replace('0\nSECTION\n2\nENTITIES', '0\nSECTION\n2\nTABLES\n0\nSTYLE\n2\nSHX\n3\ntxt.shx\n0\nENDSEC\n0\nSECTION\n2\nENTITIES');
    expect(dxfACmt(shx).dudas.some(d => /shx/i.test(d.motivo))).toBe(true);
  });
  it('rechaza unidades ajenas a milímetros y entidades geométricas incompletas', () => {
    const line = dibujo('0\nLINE\n8\nDISCO1\n10\n0\n20\n0\n11\n100\n21\n0');
    expect(dxfACmt(line.replace('9\n$EXTMIN', '9\n$INSUNITS\n70\n1\n9\n$EXTMIN')).cmt).toBeNull();
    expect(dxfACmt(dibujo('0\nCIRCLE\n8\nCUTTER\n40\n10')).cmt).toBeNull();
  });
  it('convierte rectas y arcos del par real sin fuente', () => {
    const r = dxfACmt(fixture('AR2605305.dxf'));
    expect(r.dudas).toEqual([]);
    const doc = leerCmt(r.cmt!);
    expect(doc.objects).toHaveLength(6);
    expect(doc.objects.flatMap(o => o.paths).some(p => p.points.some(q => q.type === 1))).toBe(true);
    expect(new Set(doc.objects.map(o => o.tool))).toEqual(new Set(['CM-CUTW-Def', 'CM-PEN-Def']));
  });
  it.each([['DISCO1', 'CM-CUTW-Def'], ['DISCO2', 'CM-CUTW-6'], ['CUTTER', 'CM-CUTK-Def'], ['ROTULADOR', 'CM-PEN-Def'], ['taladro', 'CM-PEN-Def'], ['texto', '']])('asigna %s a %s', (capa, herramienta) => {
    const r = dxfACmt(dibujo(`0\nLINE\n8\n${capa}\n10\n0\n20\n0\n11\n100\n21\n0`));
    expect(r.dudas).toEqual([]);
    expect(leerCmt(r.cmt!).objects[0].tool).toBe(herramienta);
  });
  it('conserva un círculo como cuatro cúbicas con sus medidas', () => {
    const r = dxfACmt(dibujo('0\nCIRCLE\n8\nCUTTER\n10\n25\n20\n25\n40\n25'));
    expect(r.dudas).toEqual([]);
    const p = leerCmt(r.cmt!).objects[0].paths[0].points;
    expect(p).toHaveLength(13);
    const nodos = p.filter(q => q.type === 0 || q.type === 3);
    expect(Math.min(...nodos.map(q => q.x)) / (72 / 25.4)).toBeCloseTo(300);
    expect(Math.max(...nodos.map(q => q.x)) / (72 / 25.4)).toBeCloseTo(350);
    expect(Math.min(...nodos.map(q => q.y)) / (72 / 25.4)).toBeCloseTo(20);
    expect(Math.max(...nodos.map(q => q.y)) / (72 / 25.4)).toBeCloseTo(70);
  });
  it('reproduce el redondeo SVG del robot y permite conservar la precisión del DXF', () => {
    const dxf = dibujo('0\nLINE\n8\nDISCO1\n10\n30120\n20\n5400\n11\n30120\n21\n8237,5'.replace('8237,5', '8237.5'));
    const compatible = dxfACmt(dxf), exacto = dxfACmt(dxf, {compatibilidadRobot: false});
    expect(compatible.dudas).toEqual([]);
    const x = leerCmt(compatible.cmt!).objects[0].paths[0].points[0].x;
    expect(x).toBeCloseTo(Number((30120 * 96 / 25.4).toPrecision(6)) * .75 + 300 * 72 / 25.4, 8);
    expect(leerCmt(exacto.cmt!).objects[0].paths[0].points[0].x).toBeCloseTo((30120 + 300) * 72 / 25.4, 8);
  });
  it('deja abierto el cierre de un contorno mixto como el paso SVG del robot', () => {
    const r = dxfACmt(dibujo('0\nLINE\n8\nCUTTER\n10\n1\n20\n0\n11\n1\n21\n2\n0\nARC\n8\nCUTTER\n10\n1\n20\n1\n40\n1\n50\n90\n51\n270'));
    expect(r.dudas).toEqual([]);
    const p = leerCmt(r.cmt!).objects[0].paths[0].points;
    expect(p[0].x === p.at(-1)!.x && p[0].y === p.at(-1)!.y).toBe(false);
    expect(Math.hypot(p[0].x - p.at(-1)!.x, p[0].y - p.at(-1)!.y) / (72 / 25.4)).toBeLessThan(.01);
  });
  it('conserva la precisión de la polilínea al unirla con LINE (AR2604983)', () => {
    const x1 = 1237.342502340907, x2 = 5262.34250234114, y1 = 998.7865849022055, y2 = 1228.786584902205;
    const r = dxfACmt(dibujo(`0\nLINE\n8\nDISCO1\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y1}\n0\nLWPOLYLINE\n8\nDISCO1\n90\n3\n70\n0\n10\n${x1}\n20\n${y2}\n10\n${x2}\n20\n${y2}\n10\n${x2}\n20\n${y1}\n0\nLINE\n8\nDISCO1\n10\n${x1}\n20\n${y2}\n11\n${x1}\n21\n${y1}`));
    expect(r.dudas).toEqual([]);
    expect(r.objetos).toHaveLength(1);
    const p = leerCmt(r.cmt!).objects[0].paths[0].points;
    expect(Math.hypot(p[0].x - p.at(-1)!.x, p[0].y - p.at(-1)!.y)).toBeGreaterThan(.001);
  });
  it.skipIf(!existsSync(arial))('convierte textos reales con Arial (se omite si no está instalada)', () => {
    const r = dxfACmt(fixture('AR2604991.dxf'), { rutaFuente: arial });
    expect(r.dudas).toEqual([]);
    expect(r.objetos.some(o => o.entity === 'TEXT')).toBe(true);
    expect(leerCmt(r.cmt!).objects.length).toBe(r.objetos.length);
  });
});
