import { describe, expect, it } from 'vitest';
import { decidirEscala } from './unidades.ts';
const caja = (w: number, h: number) => ({ x0: 0, y0: 0, x1: w, y1: h });
describe('decidirEscala', () => {
  it('DWG siempre ×1000', () => expect(decidirEscala('dwg', 4, caja(6, 2.5))).toMatchObject({ factor: 1000 }));
  it('DXF en metros declarados', () => expect(decidirEscala('dxf', 6, caja(6, 2.5))).toMatchObject({ factor: 1000 }));
  it('DXF de la web en mm', () => expect(decidirEscala('dxf', 4, caja(6000, 2500))).toMatchObject({ factor: 1 }));
  it('DXF que dice mm pero mide 6 unidades se toma en metros', () => expect(decidirEscala('dxf', 4, caja(6, 2.5))).toMatchObject({ factor: 1000 }));
  it('DWG que daría 300 m no se genera', () => expect(decidirEscala('dwg', 6, caja(300, 2))).toHaveProperty('error'));
});
it('acepta centímetros y deja pendientes las pulgadas', () => {
  expect(decidirEscala('dxf', 5, caja(10, 4))).toMatchObject({ factor: 10 });
  expect(decidirEscala('dxf', 1, caja(600, 250))).toHaveProperty('error');
});
