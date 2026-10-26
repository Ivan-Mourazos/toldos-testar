import { describe, expect, it } from 'vitest';
import { apilable, pedidoDe } from '../../puertas/__fixtures__/ejemplos';
import { faltaParaAbrir, pasoCorte, textoPaso } from './flujoCorte';

// Iván, 26/10/2026: los botones del corte arriba y cada uno cuando toca.
describe('pasos del corte de puertas', () => {
  const activo = { activo: true };
  it('sin la carpeta de borradores, como antes', () => {
    expect(pasoCorte({ activo: false }, null, false)).toEqual({ paso: 'sin-flujo' });
    expect(pasoCorte(null, null, false)).toEqual({ paso: 'sin-flujo' });
  });
  it('incompleto → abrir → confirmar → guardar', () => {
    expect(pasoCorte({ ...activo, borrador: false }, 'Falta la OF', false)).toEqual({ paso: 'incompleto', motivo: 'Falta la OF' });
    expect(pasoCorte({ ...activo, borrador: false }, null, false).paso).toBe('abrir');
    expect(pasoCorte({ ...activo, borrador: true, confirmado: null }, null, false).paso).toBe('confirmar');
    expect(pasoCorte({ ...activo, borrador: true, confirmado: { por: 'IVÁN', fecha: '2026-10-26T09:00:00Z' } }, null, false))
      .toEqual({ paso: 'guardar', por: 'IVÁN' });
  });
  it('datos cambiados tras abrir o DWG tocado tras confirmar: no se guarda', () => {
    const confirmado = { por: 'IVÁN', fecha: '2026-10-26T09:00:00Z' };
    expect(pasoCorte({ ...activo, borrador: true, confirmado }, null, true).paso).toBe('datos-cambiados');
    expect(pasoCorte({ ...activo, borrador: true, confirmado, cambiadoTrasConfirmar: true }, null, false).paso).toBe('tocado');
    expect(textoPaso({ paso: 'tocado' })).toMatch(/vuelve a confirmar/);
  });
  it('para abrir hace falta número de pedido, OF y ninguna comprobación pendiente', () => {
    expect(faltaParaAbrir(pedidoDe('', apilable()))).toMatch(/número de pedido/);
    const sinOf = apilable(); sinOf.of = '';
    expect(faltaParaAbrir(pedidoDe('AR2600001', sinOf))).toMatch(/OF/);
    const bien = apilable(); bien.ventanas = [];
    expect(faltaParaAbrir(pedidoDe('AR2600001', bien))).toBeNull();
    const mal = apilable(); mal.rollo = 0;
    expect(faltaParaAbrir(pedidoDe('AR2600001', mal))).toMatch(/comprobaciones/);
  });
});
