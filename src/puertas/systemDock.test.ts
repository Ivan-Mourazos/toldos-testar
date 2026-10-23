import { describe, expect, it } from 'vitest';
import { nuevaPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { puertasDesdeRps } from './rps.ts';
import { calcularSystemDock, tandasSystemDock } from './systemDock.ts';
import type { PedidoPuertas, Puerta } from './tipos.ts';

// Pedidos de SYSTEM DOCK del estudio (docs/modelos/system-dock.md) y reglas de Iván (23/10/2026).
const lona = (largo: number, ancho: number, cantidad: number, of: string): Puerta => ({
  ...nuevaPuerta('SYSTEMDOCK'), frente: largo, alto: ancho, cantidad, of, material: 'PVC G650', color: 'NEGRO', rollo: 250, confirmada: true,
});
const pedido = (orderCode: string, ...lonas: Puerta[]): PedidoPuertas => ({ schemaVersion: 1, kind: 'puertas', orderCode,
  elementos: lonas.map((input, i) => ({ id: `lona-${i + 1}`, input })) });

describe('SYSTEM DOCK · lona perimetral', () => {
  it('una pieza por lona: largo + 1 y ancho + 6,6, también en 85, sin avisos que bloqueen', () => {
    const r = calcularSystemDock(lona(1040, 55, 3, '0232270'));
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.piezas.map(p => [p.ancho, p.alto, p.cantidad, p.material, p.of])).toEqual([[1041, 61.6, 3, 'PVC G650 NEGRO', '0232270']]);
    expect(calcularSystemDock(lona(1060, 85, 1, '0229533')).piezas.map(p => [p.ancho, p.alto])).toEqual([[1061, 91.6]]);
  });

  it('admite los lotes grandes de 100 lonas iguales (AR.26.00937), hasta 500', () => {
    expect(calcularSystemDock(lona(1040, 55, 100, '0225903')).avisos.some(a => a.codigo === 'CANTIDAD')).toBe(false);
    expect(calcularSystemDock(lona(1040, 55, 501, '0225903')).avisos.some(a => a.codigo === 'CANTIDAD')).toBe(true);
  });

  it('AR.26.04615: una tanda de cuatro (la 1270 y las tres 1040) de 1271 × 246,4, como el planteamiento a mano', () => {
    const { cortes, archivo } = generarCortePuertas(pedido('AR2604615', lona(1040, 55, 3, '0232270'), lona(1270, 55, 1, '0232269')));
    expect(cortes).toHaveLength(1);
    const [c] = cortes;
    expect([c.material, c.anchoRollo, c.largo]).toEqual(['PVC G650 NEGRO', 2500, 12710]);
    expect(Math.max(...c.colocadas.map(k => k.y + k.pieza.alto * 10))).toBeCloseTo(2464, 6);
    // Sin rotulador ni REVÉS: la medida y la OF de cada lona.
    const textos = c.entidades.textos.map(t => t.valor);
    expect(textos.filter(v => v === '1040 CM X 55 CM')).toHaveLength(3);
    expect(textos.filter(v => v === '0232270')).toHaveLength(3);
    expect(textos).toContain('1270 CM X 55 CM');
    expect(textos.some(v => /REVÉS|DERECHO/.test(v))).toBe(false);
    expect(c.entidades.lineas.every(l => l.capa === 'DISCO1')).toBe(true);
    // Los orillos no se cortan: ninguna raya horizontal sobre y = 0 ni sobre el ancho del rollo.
    expect(c.entidades.lineas.some(l => l.y1 === l.y2 && (l.y1 === 0 || l.y1 === 2500))).toBe(false);
    expect(archivo?.dxf).toContain('DISCO1');
  });

  it('AR.26.00937: cien lonas iguales en una tanda de cuatro dibujada una vez con «×25»', () => {
    const tandas = tandasSystemDock(calcularSystemDock(lona(1040, 55, 100, '0225903')).piezas.map(pieza => ({ pieza, medida: '1040 CM X 55 CM' })), 250);
    expect(tandas.map(t => [t.lonas.length, t.largo, t.veces])).toEqual([[4, 1041, 25]]);
    const [c] = generarCortePuertas(pedido('AR2600937', lona(1040, 55, 100, '0225903'))).cortes;
    expect(c.largo).toBe(10410);
    expect(c.colocadas).toHaveLength(4);
    const textos = c.entidades.textos.map(t => t.valor);
    expect(textos).toContain('TANDA ×25 · CORTAR 25 VECES');
    expect(textos).toContain('PVC G650 NEGRO · CORTE · 260,25 M EN TOTAL');
  });

  it('41 lonas iguales: una tanda de 4 «×10» y una suelta, con las unidades totales arriba (Iván, 23/10/2026)', () => {
    const [c] = generarCortePuertas(pedido('AR2600041', lona(1040, 55, 41, '0230041'))).cortes;
    const tandas = tandasSystemDock(calcularSystemDock(lona(1040, 55, 41, '0230041')).piezas.map(pieza => ({ pieza, medida: '' })), 250);
    expect(tandas.map(t => [t.lonas.length, t.veces])).toEqual([[4, 10], [1, 1]]);
    expect(c.colocadas).toHaveLength(5);
    expect(c.largo).toBe(20820);
    const textos = c.entidades.textos.map(t => t.valor);
    expect(textos).toContain('UNIDADES TOTALES: 41');
    expect(textos).toContain('TANDA ×10 · CORTAR 10 VECES');
  });

  it('con lonas de 85 caben dos por tanda en el rollo de 250 (AR.26.02949)', () => {
    const tandas = tandasSystemDock([
      ...calcularSystemDock(lona(1060, 85, 1, '0229533')).piezas, ...calcularSystemDock(lona(1040, 85, 2, '0229532')).piezas,
    ].map(pieza => ({ pieza, medida: '' })), 250);
    expect(tandas.map(t => [t.lonas.map(l => l.pieza.ancho), t.veces])).toEqual([[[1061, 1041], 1], [[1041], 1]]);
  });

  it('desde RPS: «LONA PERIMETRAL 10400X550 (ESTANDAR)» en mm, la OF y la cantidad, con PVC G650 negro de 250', () => {
    const { puertas } = puertasDesdeRps([
      { articulo: 'A110210400550-4', cantidad: 100, descripcion: 'LONA PERIMETRAL 10400X550 (ESTANDAR)', comentario: 'SU PEDIDO Nº NN26000095', of: '0225903' },
      { articulo: 'A110210400550', cantidad: 65, descripcion: 'LONA PERIMETRAL', comentario: 'PVC POLIESTER LAC 640 G/M2, 1040 X 55 CM, VARILLA EN EXTREMOS', of: '0217372' },
      { articulo: 'PORTES', cantidad: 1, descripcion: 'PORTES', comentario: '', of: '' },
    ], { clienteCodigo: '032286' });
    expect(puertas.map(p => [p.modelo, p.frente, p.alto, p.cantidad, p.of, p.material, p.color, p.rollo]))
      .toEqual([['SYSTEMDOCK', 1040, 55, 100, '0225903', 'PVC G650', 'NEGRO', 250], ['SYSTEMDOCK', 1040, 55, 65, '0217372', 'PVC G650', 'NEGRO', 250]]);
    // De otro cliente no se toma como SYSTEM DOCK.
    expect(puertasDesdeRps([{ articulo: 'X', cantidad: 1, descripcion: 'LONA PERIMETRAL 10400X550', comentario: '', of: '1' }], { clienteCodigo: '001336' }).puertas).toEqual([]);
  });
});
