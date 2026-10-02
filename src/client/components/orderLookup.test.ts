import { describe, expect, it, vi } from 'vitest';
import { lookupOnEnter } from './orderLookup';

describe('buscar el pedido con Enter', () => {
  it('ejecuta la misma búsqueda una vez y evita el envío implícito', () => {
    const lookup = vi.fn(), preventDefault = vi.fn();
    lookupOnEnter({ key: 'Enter', composing: false, disabled: false, preventDefault, lookup });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledOnce();
  });
  it.each([{ key: 'Enter', composing: false, disabled: true }, { key: 'Enter', composing: true, disabled: false }, { key: 'Tab', composing: false, disabled: false }])('no consulta durante composición, bloqueo o con otra tecla: %j', state => {
    const lookup = vi.fn();
    lookupOnEnter({ ...state, preventDefault: vi.fn(), lookup });
    expect(lookup).not.toHaveBeenCalled();
  });
});
