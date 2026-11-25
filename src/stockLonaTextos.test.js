import { describe, expect, it, vi } from 'vitest';
import { consultaLona, lonaDeTramo } from './stockLonaTextos.js';

const t = (code, description, width) => ({ code, description, width });
const G650_250 = t('G650VE26P250', 'PVC 650 VERDE 6026:250AN', 250);
const G650_300 = t('G650VE26P300', 'PVC 650 VERDE 6026:300AN', 300);
const REJILLA = t('SEDOCRPVE26P300', 'REJILLA 1ª VERDE:300AN', 300);
const REJILLA_2 = t('REJ2VE26P300', 'REJILLA 2ª VERDE:300AN', 300);

describe('consultaLona', () => {
  it.each([
    ['G650 VERDE 6026', '650 VERDE 6026'],
    ['PVC 900 GR AMARILLO', '900 AMARILLO'],
    ['REJILLA 1ª VERDE', 'REJILLA 1 VERDE'],
  ])('%s → %s', (texto, consulta) => expect(consultaLona(texto)).toBe(consulta));

  it.each(['FUELLE', 'ACRILICO', 'LONA ENTERA', 'A1', '1209,3'])('%s no es una lona', texto => {
    expect(consultaLona(texto)).toBeNull();
  });
});

describe('lonaDeTramo', () => {
  const buscar = vi.fn(async consulta => consulta.includes('REJILLA') ? [REJILLA_2, REJILLA] : [G650_250, G650_300]);

  it('elige el rollo más estrecho que cubre el alto del trozo', async () => {
    expect(await lonaDeTramo({ textos: ['FUELLE', 'G650 VERDE 6026'], altoCm: 293 }, { buscar }))
      .toEqual({ codigo: 'G650VE26P300', descripcion: G650_300.description, texto: 'G650 VERDE 6026' });
    expect((await lonaDeTramo({ textos: ['G650 VERDE 6026'], altoCm: 175 }, { buscar }))?.codigo).toBe('G650VE26P250');
  });

  it('deja fuera la lona de 2ª salvo que el plano lo diga', async () => {
    expect((await lonaDeTramo({ textos: ['REJILLA 1ª VERDE'], altoCm: 175 }, { buscar }))?.codigo).toBe('SEDOCRPVE26P300');
    expect((await lonaDeTramo({ textos: ['REJILLA 2ª VERDE'], altoCm: 175 }, { buscar }))?.codigo).toBe('REJ2VE26P300');
  });

  it('prefiere la lona que el pedido ya tiene asignada en RPS', async () => {
    expect((await lonaDeTramo({ textos: ['G650 VERDE 6026'], altoCm: 175 }, { buscar, asignadas: ['G650VE26P300'] }))?.codigo)
      .toBe('G650VE26P300');
  });

  it('sin texto de lona no propone nada', async () => {
    expect(await lonaDeTramo({ textos: ['FUELLE', 'A1'], altoCm: 293 }, { buscar })).toBeNull();
  });
});
