import { describe, expect, it } from 'vitest';
import { abreTgmPedidos, rutaParaTgmPedidos } from './rutaPc.js';

// Iván, 26/10/2026: con la IP, TGM Pedidos decía «no pertenece a una carpeta autorizada»; con \\stinkor, «no se
// encuentra el archivo» (ese servidor ya no responde). La web usa la ruta de DFS (la unidad Y:).
describe('ruta de red para abrir los DWG desde los PC', () => {
  it.each([
    ['\\\\192.168.0.128\\Oftecnica\\Oficina Tecnica\\BORRADORES CORTE', '\\\\toldosgomez.local\\DFS_POL\\oftecnica\\BORRADORES CORTE'],
    ['\\\\stinkor\\oftecnica\\BORRADORES CORTE', '\\\\toldosgomez.local\\DFS_POL\\oftecnica\\BORRADORES CORTE'],
    ['  \\\\TOLDOSGOMEZ.LOCAL\\DFS_POL\\Oftecnica\\BORRADORES CORTE ', '\\\\toldosgomez.local\\DFS_POL\\oftecnica\\BORRADORES CORTE'],
    ['//192.168.0.128/Oftecnica/Oficina Tecnica/2026', '\\\\toldosgomez.local\\DFS_POL\\oftecnica\\2026'],
  ])('%s → %s', (entrada, salida) => {
    expect(rutaParaTgmPedidos(entrada)).toBe(salida);
    expect(abreTgmPedidos(entrada)).toBe(true);
  });
  it('lo que no es Oficina Tecnica no se toca y no vale', () => {
    expect(rutaParaTgmPedidos('\\\\192.168.0.128\\Oftecnica\\maqcorte\\BOT')).toBe('\\\\192.168.0.128\\Oftecnica\\maqcorte\\BOT');
    expect(abreTgmPedidos('\\\\192.168.0.128\\Oftecnica\\maqcorte\\BOT')).toBe(false);
    expect(abreTgmPedidos('\\\\stinkor\\oftecnicaX\\algo')).toBe(false);
  });
});
