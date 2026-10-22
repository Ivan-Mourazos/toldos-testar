import { describe, expect, it } from 'vitest';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { esClientePortanova } from './clientePortanova.ts';

describe('Selección de la plantilla Portanova', () => {
  it('usa 001336 aunque la razón social haya cambiado', () => {
    expect(esClientePortanova({ ...pedidoDe('AR2605134'), cabecera: { clienteRps: { codigo: '001336' } } }, 'OTRO NOMBRE')).toBe(true);
  });
  it('un código distinto prevalece sobre la palabra Portanova del nombre', () => {
    expect(esClientePortanova({ ...pedidoDe('AR2605134'), cabecera: { clienteRps: { codigo: '009999' } } }, 'PORTANOVA')).toBe(false);
  });
  it('sin código reconoce el nombre, sin distinguir mayúsculas', () => {
    expect(esClientePortanova(pedidoDe('AR2605134'), '2006 Portanova, S.L.')).toBe(true);
    expect(esClientePortanova(pedidoDe('AR2605134'), 'OTRO CLIENTE')).toBe(false);
  });
});
