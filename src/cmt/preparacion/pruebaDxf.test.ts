import { describe, expect, it } from 'vitest';
import { leerDxf } from '../dxf.ts';
import { dxfPrueba } from './pruebaDxf.ts';

describe('dxfPrueba', () => {
  it('produce un DXF que leerDxf acepta, con capas y unidades', () => {
    const d = leerDxf(dxfPrueba({ insunits: 6, capas: { corte: 1 }, entidades: ['0\nLINE\n8\ncorte\n10\n0\n20\n0\n11\n1\n21\n0'] }));
    expect(d.sections.HEADER[0].pairs).toContainEqual([9, '$INSUNITS']);
    expect(d.entities).toHaveLength(1);
    expect(d.layers.corte.color).toBe(1);
  });
});
