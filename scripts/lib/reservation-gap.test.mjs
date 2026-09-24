import { describe, expect, it } from 'vitest';
import { classifyGap, rootCode } from './reservation-gap.mjs';

describe('rootCode', () => {
  it('quita el lacado y el largo para comparar la misma pieza en otro color', () => {
    expect(rootCode('SOPART250BL16')).toBe('SOPART250');
    expect(rootCode('TURA70HG600C')).toBe('TURA70HG');
    expect(rootCode('CASPUNCEJE70MM')).toBe('CASPUNCEJE70MM');
  });

  it('reconoce los colores de BAT del Iris y los largos terminados en CM', () => {
    expect(rootCode('PEGCZ13NEGR600C')).toBe(rootCode('PEGCZ13BLAN600C'));
    expect(rootCode('TAPASCOU1BRUT')).toBe('TAPASCOU1');
    expect(rootCode('PEMoSU13GR16600CM')).toBe('PEMOSU13');
    expect(rootCode('PIEGURSZ13NEGR')).toBe('PIEGURSZ13');
  });
});

describe('classifyGap', () => {
  const consumido = [
    { CodArticle: 'SOPART250BL16', Description: 'SOPORTE', ofs: 25 },
    { CodArticle: 'CASPUNCEJE70MM', Description: 'CASQUILLO PUNTA CON EJE', ofs: 20 },
    { CodArticle: 'TUBOTRAN32', Description: 'TUBO TRANSPARENTE', ofs: 15 },
    { CodArticle: 'RESTOVARILLA', Description: 'RESTO VARILLA VAINA', ofs: 6 },
    { CodArticle: 'TORNILLO', Description: 'PUNTUAL', ofs: 2 }
  ];

  it('separa lo que falta, lo que sobra y lo que queda aparte con su motivo', () => {
    const gap = classifyGap({ consumido, nuestras: new Set(['SOPART250NE11', 'CASPUNCE']) });
    expect(gap.ofsMedidas).toBe(25);
    expect(gap.falta.map((x) => x.code)).toEqual(['CASPUNCEJE70MM']);
    expect(gap.sobra).toEqual(['CASPUNCE']);
    expect(gap.aparte.map((x) => x.code)).toEqual(['TUBOTRAN32', 'RESTOVARILLA']);
    expect(gap.aparte[0].motivo).toMatch(/Embalaje/);
  });

  it('ignora el consumo puntual por debajo del 20 % de las OF', () => {
    const gap = classifyGap({ consumido, nuestras: new Set() });
    expect(gap.falta.map((x) => x.code)).not.toContain('TORNILLO');
  });

  it('sin OF medidas no lista todo como sobrante: avisa de que falta el dato', () => {
    const gap = classifyGap({ consumido: [], nuestras: new Set(['SOPARTGLBL16']) });
    expect(gap.sobra).toEqual([]);
    expect(gap.sinDatos).toMatch(/artículo de venta/);
  });
});
