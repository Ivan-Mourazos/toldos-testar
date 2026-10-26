import { describe, expect, it } from 'vitest';
import { abreTgmPedidos, rutaParaTgmPedidos } from './rutaPc.js';

// Iván, 26/10/2026: con la carpeta de borradores escrita con la IP, TGM Pedidos decía «La ruta no pertenece a una
// carpeta autorizada»: solo abre lo que está dentro de \\stinkor\oftecnica.
describe('ruta de red para TGM Pedidos', () => {
  it.each([
    ['\\\\192.168.0.128\\Oftecnica\\Oficina Tecnica\\BORRADORES CORTE', '\\\\stinkor\\oftecnica\\BORRADORES CORTE'],
    ['\\\\toldosgomez.local\\DFS_POL\\oftecnica\\BORRADORES CORTE', '\\\\stinkor\\oftecnica\\BORRADORES CORTE'],
    ['  \\\\STINKOR\\Oftecnica\\BORRADORES CORTE ', '\\\\stinkor\\oftecnica\\BORRADORES CORTE'],
    ['//192.168.0.128/Oftecnica/Oficina Tecnica/2026', '\\\\stinkor\\oftecnica\\2026'],
  ])('%s → %s', (entrada, salida) => {
    expect(rutaParaTgmPedidos(entrada)).toBe(salida);
    expect(abreTgmPedidos(entrada)).toBe(true);
  });
  it('lo que no es Oficina Tecnica no se toca y no lo abre', () => {
    expect(rutaParaTgmPedidos('\\\\192.168.0.128\\Oftecnica\\maqcorte\\BOT')).toBe('\\\\192.168.0.128\\Oftecnica\\maqcorte\\BOT');
    expect(abreTgmPedidos('\\\\192.168.0.128\\Oftecnica\\maqcorte\\BOT')).toBe(false);
    expect(abreTgmPedidos('\\\\stinkor\\oftecnicaX\\algo')).toBe(false);
  });
});
