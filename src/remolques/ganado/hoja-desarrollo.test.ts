import { describe, expect, it } from 'vitest';
import { dibujoCal } from './salidasCal.ts';
import { MEDIDAS_CAL_5319 } from './medidas.ts';

describe('Desarrollo de Cal para aprovechar la hoja', () => {
  it('conserva el aviso de corte parcial cuando falta definir otra puerta', () => {
    const hoja = dibujoCal({ ...MEDIDAS_CAL_5319, puertaMorro: undefined }, true);
    expect(hoja.textos.some(t => t.valor.includes('PARCIAL'))).toBe(true);
  });

  it('ordena las piezas en una fila de paños grandes y una columna de piezas pequeñas', () => {
    const normal = dibujoCal(MEDIDAS_CAL_5319), hoja = dibujoCal(MEDIDAS_CAL_5319, true);
    expect(hoja.alto).toBeLessThan(normal.alto * .75);
    expect(hoja.ancho / hoja.alto).toBeGreaterThan(1.3);
    expect(hoja.lineas).toHaveLength(normal.lineas.length);
    expect(hoja.arcos).toHaveLength(normal.arcos.length);
    expect(hoja.circulos).toHaveLength(normal.circulos.length);
    // Reorganizar el dibujo no cambia los radios, las cotas ni los centros relativos.
    expect(hoja.arcos.map(a => a.r)).toEqual(normal.arcos.map(a => a.r));
    expect(hoja.cotas.map(c => c.valor)).toEqual(normal.cotas.map(c => c.valor));
  });
});
