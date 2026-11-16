import { describe, expect, it } from 'vitest';
import { leerCmt, dxfACmt } from './index.ts';
import { convertirCmtRemolques } from '../corteMaquina.js';
import { generarCorteRemolques } from '../remolques/corte/index.js';
import AR2604390 from '../remolques/corte/__fixtures__/AR2604390.json' with { type: 'json' };

const dibujo = (entidades: string) => `0\nSECTION\n2\nHEADER\n9\n$EXTMIN\n10\n0\n20\n0\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entidades}\n0\nENDSEC\n0\nEOF\n`;
const arco = (r: number, capa = 'DISCO1') => `0\nARC\n8\n${capa}\n10\n0\n20\n0\n40\n${r}\n50\n0\n51\n90`;
const herramientas = (cmt: Buffer) => leerCmt(cmt).objects.map((o) => o.tool);
const CUCHILLA = 'CM-CUTK-Def', DISCO = 'CM-CUTW-Def';

describe('remolques: curvas cerradas a CUTTER en el CMT de la máquina vieja (producción, 16/11/2026)', () => {
  it('el arco de menos de 30 cm va con cuchilla; el de 30 cm o más y las rectas, con disco', () => {
    const r = dxfACmt(dibujo([arco(85), `0\nLINE\n8\nDISCO1\n10\n1000\n20\n0\n11\n2000\n21\n0`, arco(300).replace('10\n0\n20\n0', '10\n5000\n20\n0')].join('\n')), { curvasACutter: 300 });
    expect(r.dudas).toEqual([]);
    expect(herramientas(r.cmt!).sort()).toEqual([CUCHILLA, DISCO, DISCO].sort());
  });

  it('sin la opción (toldos, puertas…) todo sigue en DISCO1', () => {
    const r = dxfACmt(dibujo(arco(85)));
    expect(herramientas(r.cmt!)).toEqual([DISCO]);
  });

  it('solo toca DISCO1: lo que ya va en otra capa no cambia', () => {
    const r = dxfACmt(dibujo(arco(85, 'ROTULADOR')), { curvasACutter: 300 });
    expect(herramientas(r.cmt!)).toEqual(['CM-PEN-Def']);
  });

  it('polilínea dibujada a mano en ZWCAD: la curva del hombro sale aparte con cuchilla y las rectas siguen con disco', () => {
    // Recta de 1000, cuarto de círculo de radio 85 (bulge tan(22,5°)) y recta de 1000 hacia arriba.
    const b = Math.tan(Math.PI / 8);
    const poli = `0\nLWPOLYLINE\n5\nA1\n8\nDISCO1\n90\n4\n70\n0\n10\n0\n20\n0\n10\n1000\n20\n0\n42\n${b}\n10\n1085\n20\n85\n10\n1085\n20\n1085`;
    const r = dxfACmt(dibujo(poli), { curvasACutter: 300 });
    expect(r.dudas).toEqual([]);
    const objetos = leerCmt(r.cmt!).objects;
    expect(objetos.map((o) => o.tool).sort()).toEqual([CUCHILLA, DISCO, DISCO].sort());
    // Una curva muy abierta (radio 1000) no se parte.
    const abierta = poli.replaceAll('1085', '2000').replace('20\n85', '20\n1000');
    expect(herramientas(dxfACmt(dibujo(abierta), { curvasACutter: 300 }).cmt!)).toEqual([DISCO]);
  });

  it('arquillado real (AR2604390): sus 6 arcos (85 y 75 mm) van a CUTTER y el contorno recto sigue en DISCO1', () => {
    const { archivo } = generarCorteRemolques(AR2604390);
    const normal = dxfACmt(archivo!.dxf, { sinLeyenda: true });
    const vieja = convertirCmtRemolques(archivo!.dxf, { sinLeyenda: true });
    expect(vieja.dudas).toEqual([]);
    expect(herramientas(normal.cmt!)).not.toContain(CUCHILLA);
    expect(herramientas(vieja.cmt!).filter((t) => t === CUCHILLA)).toHaveLength(6);
    expect(herramientas(vieja.cmt!)).toContain(DISCO);
    expect(vieja.avisos.some((a) => /6 curvas de DISCO1 .* pasan a CUTTER/.test(a.motivo))).toBe(true);
  });
});
