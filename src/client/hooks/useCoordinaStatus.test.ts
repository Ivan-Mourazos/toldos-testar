import { describe, expect, it } from 'vitest';
import { statusForKey } from './useCoordinaStatus';

const aprobada = { disponible: true, ofs: { '0230194': { estado: 'aprobada' } } } as never;

describe('statusForKey — qué estado enseñar para la lista de OF actual', () => {
  it('sin OF o pantalla cerrada no hay nada pendiente', () => {
    expect(statusForKey(null, '', true)).toEqual({ disponible: true, ofs: {} });
    expect(statusForKey({ key: 'A', status: aprobada }, 'A', false)).toEqual({ disponible: true, ofs: {} });
  });

  it('la respuesta de la misma clave se enseña', () => {
    expect(statusForKey({ key: 'A', status: aprobada }, 'A', true)).toBe(aprobada);
  });

  it('al cambiar de pedido no se enseña el estado del anterior: null hasta que llegue el nuevo', () => {
    expect(statusForKey({ key: 'A', status: aprobada }, 'B', true)).toBeNull();
    expect(statusForKey(null, 'B', true)).toBeNull();
  });
});
