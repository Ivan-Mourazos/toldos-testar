import { describe, expect, it } from 'vitest';
import { agruparTelas } from './agruparTelas';

const tela = (code: string, description: string, width: number | null = 300) => ({ code, description, width });

describe('agruparTelas', () => {
  it('junta las marcas de la misma lona y deja aparte lo que no se reconoce', () => {
    const grupos = agruparTelas([
      tela('PANAMABL16P300', 'LONA PANAMA 900 :BLANCO RAL9016 :300 AN'),
      tela('POLYPR56BLIMP300', 'LONA POLYMAR PRINT 8556-5945 2L 900 :BLANCO I.D :300 AN'),
      tela('LAC900BL300', 'LONA LAC900 :BLANCO RAL9016 :300AN'),
      tela('PANAIGBLANP300', 'LONA PANAMA IGN.M2 900 :BLANCO :300AN'),
    ], {});
    expect(grupos.map(g => [g.nombre, g.marcas.map(m => m.code)])).toEqual([
      ['PVC 900 BLANCO 9016 · 300 AN', ['LAC900BL300', 'PANAMABL16P300']],
      [null, ['POLYPR56BLIMP300']],
      ['PVC 900 IGNÍFUGA BLANCO · 300 AN', ['PANAIGBLANP300']],
    ]);
  });

  it('pone primero la marca con más stock y suma el de todas', () => {
    const [grupo] = agruparTelas([
      tela('PANAMABL16P300', 'LONA PANAMA 900 :BLANCO RAL9016 :300 AN'),
      tela('LAC900BL300', 'LONA LAC900 :BLANCO RAL9016 :300AN'),
    ], { PANAMABL16P300: 120, LAC900BL300: 40 });
    expect(grupo.marcas.map(m => m.code)).toEqual(['PANAMABL16P300', 'LAC900BL300']);
    expect(grupo.stock).toBe(160);
  });

  it('separa los anchos', () => {
    const grupos = agruparTelas([
      tela('PANAMABL16P300', 'LONA PANAMA 900 :BLANCO RAL9016 :300 AN'),
      tela('PANAMABL16P250', 'LONA PANAMA 900 :BLANCO RAL9016 :250 AN', 250),
    ], {});
    expect(grupos.map(g => g.nombre)).toEqual(['PVC 900 BLANCO 9016 · 300 AN', 'PVC 900 BLANCO 9016 · 250 AN']);
  });
});
