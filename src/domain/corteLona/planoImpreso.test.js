import { expect, it } from 'vitest';
import { escribirPlanoImpreso } from './planoImpreso.js';

const lienzo = x => ({ lineas: [], cotas: [], arcos: [], circulos: [],
  polilineas: [{ capa: 'DISCO1', puntos: [[x, 100], [x + 2, 100], [x + 2, 102], [x, 102]], cerrada: true }],
  textos: [{ capa: 'texto', valor: 'A1', x: x + 1, y: 101, h: .1, centrado: true }] });
const nuevo = () => ({ ...lienzo(100), corte: lienzo(110), zonas: { toldos: { x0: 99, x1: 103, y0: 99, y1: 103 }, corte: { x0: 109, x1: 113, y0: 99, y1: 103 } } });
it('reutiliza una entrada idéntica sin compartir los cambios del consumidor y distingue el cajetín', () => {
  const cabecera = { pedido: 'PRUEBA', of: '0233311' };
  const p = nuevo(), a = escribirPlanoImpreso(p, cabecera), dxf = a.dxf;
  p.textos[0].valor = 'CAMBIADO'; a.dxf = 'CAMBIADO';
  const q = nuevo(), b = escribirPlanoImpreso(q, cabecera);
  expect(b.dxf).toBe(dxf); expect(q.textos[0].valor).toBe('A1');
  q.textos[0].valor = 'SEGUNDO CAMBIO';
  expect(escribirPlanoImpreso(nuevo(), cabecera).dxf).toBe(dxf);
  expect(escribirPlanoImpreso(nuevo(), { ...cabecera, of: '0233312' }).dxf).not.toBe(dxf);
});
