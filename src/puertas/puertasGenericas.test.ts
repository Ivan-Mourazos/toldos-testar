import { describe, expect, it } from 'vitest';
import { cotas5743, puerta5743 } from './__fixtures__/tgm5743.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { calcularPuerta } from './calcular.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { sacoIntegradoEnrollable } from './saco.ts';
import { cotaDelVentanalTgm, derivarPuertaTgm, tramoVentanalDesdeCota } from './tgm.ts';
import type { Puerta } from './tipos.ts';

const conTgm = (p: Puerta, t: Partial<NonNullable<Puerta['tgm']>>): Puerta => ({ ...p, tgm: { ...p.tgm!, ...t } });

describe('Puertas genéricas · enrollable', () => {
  it('empieza sin saco, con el tubo de abajo en el cierre', () => {
    const p = nuevaPuertaDeCliente('general', 'enrollable');
    expect(p.tgm).toMatchObject({ abajo: 'tubo', sacoUnido: true });
    expect(p.enrollable.sinSaco).toBe(true);
  });

  it('con saco unido lo dobla en la lona de la puerta aunque el material del saco sea otro', () => {
    const p = conTgm({ ...puerta5743(), materialSaco: 'LAC900 NEGRO' }, { sacoUnido: true });
    expect(sacoIntegradoEnrollable(p)).not.toBeNull();
    expect(calcularPuerta(p).piezas.some(x => x.clase === 'saco')).toBe(false);
  });

  it('con saco aparte lo corta como pieza suelta aunque coincida el material', () => {
    const p = conTgm(puerta5743(), { sacoUnido: false });
    expect(p.materialSaco).toBe('LAC900 BLANCO');
    expect(sacoIntegradoEnrollable(p)).toBeNull();
    expect(calcularPuerta(p).piezas.some(x => x.clase === 'saco')).toBe(true);
  });

  it.each(['saco', 'tubo'] as const)('el ventanal marcado en un tramo cae en esa cota de la hoja (abajo: %s)', abajo => {
    const base = conTgm(puerta5743(), { abajo, sacoUnido: false });
    // Sin saco el tubo de abajo va en el cierre: el primer tramo no tiene E.T. debajo y no admite ventanal.
    const primero = abajo === 'saco' ? 0 : 1;
    expect(tramoVentanalDesdeCota(base, 0)).toBe(abajo === 'saco' ? 1 : null);
    for (let i = primero; i < cotas5743.length; i++) {
      const tramo = tramoVentanalDesdeCota(base, i)!;
      const p = conTgm(base, { ventanal: { tramo } });
      expect(cotaDelVentanalTgm(p)).toBe(i);
      expect(derivarPuertaTgm(p)?.enrollable.D).toBe(cotas5743[i]);
    }
  });

  it('guarda y vuelve a leer si el saco va unido o aparte', () => {
    const p = conTgm(puerta5743(), { sacoUnido: false });
    const pedido = JSON.parse(JSON.stringify(pedidoDe('AR2600001', p)));
    expect(leerPedidoPuertas(pedido).elementos[0].input.tgm?.sacoUnido).toBe(false);
    pedido.elementos[0].input.tgm.sacoUnido = 'si';
    expect(() => leerPedidoPuertas(pedido)).toThrow();
  });
});
