import { describe, expect, it } from 'vitest';
import { calcularPuerta, nuevaPuerta } from './calcular.ts';
import type { Puerta } from './tipos.ts';

// AR2605639 (Portanova): T 154, D 60 en 345 de alto; la hoja pide E.T. a 60, 131 y 191 y se guardó solo la de 60.
function puerta5639(alturas: number[]): Puerta {
  const p = nuevaPuerta('PUERTAENR');
  return { ...p, frente: 312, alto: 345, of: '0234164', confirmada: true, ventanasConfirmadas: true,
    material: 'LAC900', color: 'GRIS 7038',
    enrollable: { ...p.enrollable, T: 154, D: 60, margen: 6, saco: 80, sacoPartido: true },
    entradas: alturas.map(altura => ({ altura, diametro: 30 as const, largo: 312, alto: 8, huecos: [] })) };
}

describe('E.T. de los bordes del ventanal de enrollable', () => {
  it('avisa si falta la E.T. de arriba o de abajo del ventanal', () => {
    const r = calcularPuerta(puerta5639([60]));
    const aviso = r.avisos.find(a => a.codigo === 'ET_FALTA');
    expect(aviso?.nivel).toBe('aviso');
    expect(aviso?.texto).toContain('191 y 131');
  });
  it('no avisa con las tres E.T. de la hoja', () => {
    const r = calcularPuerta(puerta5639([60, 131, 191]));
    expect(r.avisos.some(a => a.codigo === 'ET_FALTA')).toBe(false);
    expect(r.piezas.filter(x => x.clase === 'entrada').length).toBe(3);
  });
  it('sin E.T. encima del ventanal no pide la de arriba', () => {
    const p = puerta5639([60, 131]);
    const r = calcularPuerta({ ...p, enrollable: { ...p.enrollable, sinEtArriba: true } });
    expect(r.avisos.some(a => a.codigo === 'ET_FALTA')).toBe(false);
  });
});
