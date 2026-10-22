import { describe, expect, it } from 'vitest';
import { apilable, autorreparable, pedidoDe, puerta4638 } from './__fixtures__/ejemplos.ts';
import { calcularPuerta, nuevaPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { geometriaAlzado } from './alzado.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';

describe('Saco negro con diagonales amarillas impresas después del corte', () => {
  it('es opcional en pedidos antiguos y valida el booleano recibido', () => {
    const pedido = pedidoDe('AR2600001', autorreparable());
    expect(nuevaPuerta()).toMatchObject({ sacoDiagonalesAmarillas: false });
    const antiguo = structuredClone(pedido);
    delete (antiguo.elementos[0].input as unknown as Record<string, unknown>).sacoDiagonalesAmarillas;
    expect(() => leerPedidoPuertas(antiguo)).not.toThrow();
    const invalido = structuredClone(pedido);
    (invalido.elementos[0].input as unknown as Record<string, unknown>).sacoDiagonalesAmarillas = 'true';
    expect(() => leerPedidoPuertas(invalido)).toThrow(/inválidos/);
    expect(leerPedidoPuertas(pedidoDe('AR2600001', { ...autorreparable(), sacoDiagonalesAmarillas: true })).elementos[0].input)
      .toMatchObject({ sacoDiagonalesAmarillas: true });
  });

  it.each([puerta4638, apilable, autorreparable])('%s: solo cambia la indicación; piezas, material negro y anidado se conservan', crear => {
    const sin = crear(), con = { ...sin, sacoDiagonalesAmarillas: true };
    expect(calcularPuerta(con)).toEqual(calcularPuerta(sin));
    const corteSin = generarCortePuertas(pedidoDe('AR2600001', sin)), corteCon = generarCortePuertas(pedidoDe('AR2600001', con));
    const geometria = (cortes: typeof corteSin.cortes) => cortes.map(c => ({ ...c,
      entidades: { lineas: c.entidades.lineas, arcos: c.entidades.arcos, circulos: c.entidades.circulos },
      colocadas: c.colocadas.map(t => ({ ...t, pieza: Object.fromEntries(Object.entries(t.pieza).filter(([k]) => k !== 'sacoDiagonalesAmarillas')) })),
    }));
    expect(geometria(corteCon.cortes)).toEqual(geometria(corteSin.cortes));
    expect(corteCon.cortes.some(c => c.entidades.textos.some(t => t.valor.includes('SACO AMARILLO/NEGRO')))).toBe(true);
    expect(corteSin.cortes.some(c => c.entidades.textos.some(t => t.valor.includes('AMARILLO/NEGRO')))).toBe(false);
    expect(corteCon.cortes.some(c => /AMARILLO/.test(c.material))).toBe(false);
    for (const [p, rotulo] of [[sin, 'SACO 900 GR NEGRO'], [con, 'SACO 900 GR AMARILLO/NEGRO']] as const) {
      expect(geometriaAlzado(p, calcularPuerta(p)).formas.some(f => f.tipo === 'texto' && f.lineas.includes(rotulo))).toBe(true);
      expect(escribirPlanoPuertas({ pedido: pedidoDe('AR2600001', p), cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: '', fecha: '2026-10-22' } })).toContain(rotulo);
    }
    expect(geometriaAlzado(sin, calcularPuerta(sin)).formas.some(f => f.tipo === 'texto' && f.lineas.some(t => t.includes('AMARILLO/NEGRO')))).toBe(false);
  });
});
