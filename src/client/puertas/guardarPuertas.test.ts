import { describe, expect, it } from 'vitest';
import { mirarFueraDeToldos } from './guardarPuertas';

// AR2605134 (tres lonas de puerta enrollable) se abría como toldo «Enrollable» aunque las puertas estuvieran activas.
describe('Buscar pedido: cuándo mirar remolques y puertas', () => {
  it('sin toldos, siempre', () => {
    expect(mirarFueraDeToldos([], false)).toBe(true);
    expect(mirarFueraDeToldos([], true)).toBe(true);
  });
  it('solo lonas de puerta enrollable: como puertas si están activas; si no, se quedan en Toldos', () => {
    expect(mirarFueraDeToldos(['ENROLLABLE', 'ENROLLABLE'], true)).toBe(true);
    expect(mirarFueraDeToldos(['ENROLLABLE'], false)).toBe(false);
  });
  it('con otros toldos, se queda en Toldos', () => {
    expect(mirarFueraDeToldos(['ENROLLABLE', 'CORTINA'], true)).toBe(false);
    expect(mirarFueraDeToldos(['ARZUA PRO'], true)).toBe(false);
  });
});
