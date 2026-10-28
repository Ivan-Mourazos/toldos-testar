import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/fixtures-corte.json' with { type: 'json' };
import { cortePedido, sacosEnHuecos } from './colocacion.js';
import { despiecesPorModelo, piezasToldo } from './despiece.js';
import { modelosConCorte } from '../corteReadiness.js';

// El Tetris (Iván, 23/10/2026: «hay que aplicarlo a todo») mejora dos cortes de la oficina; los demás, iguales.
const MEJORAS_TETRIS = {
  AR2604097: 'mismo largo, con la bamba entera de 409 encima de A1 en vez de partida en dos',
  AR2600762: '5 cm menos: A2 al lado de B2 (2379 en vez de 2384)',
};
const solapan = (a, b) => a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.hueco && b.y < a.y + a.hueco;

describe('Corte de los 18 pedidos contrastados con la oficina', () => {
  it.each(fixtures)('$pedido: piezas, largo, giros y sacos', ({ pedido, toldos, verticales, esperado }) => {
    const corte = cortePedido(toldos, verticales);
    expect(corte.largo).toBeLessThanOrEqual(esperado.largoRolloMm);
    expect(corte.colocadas.some((a, i) => corte.colocadas.slice(i + 1).some((b) => solapan(a, b)))).toBe(false);
    if (MEJORAS_TETRIS[pedido]) return;
    expect(corte.piezas).toEqual(esperado.piezas.map((p, i) => ({ ...p, unidades: toldos[i].unidades ?? 1 })));
    expect(corte.largo).toBe(esperado.largoRolloMm);
    expect(corte.colocadas.filter((p) => p.girada).map((p) => p.nombre).sort()).toEqual([...esperado.giradas].sort());
    const sacos = sacosEnHuecos(corte.colocadas, toldos[0].anchoRollo * 10, '0230811');
    expect(sacos.map((p) => ({ medida: p.medida, largo: p.ancho, ancho: p.hueco }))).toEqual(esperado.sacos);
    expect(sacos.every((p) => p.x + p.ancho <= corte.largo && p.y + p.hueco <= toldos[0].anchoRollo * 10)).toBe(true);
  });
});

describe('Ajustes y límites del despiece', () => {
  const toldo = { letra: 'A', frenteTela: 400, caidaTela: 420, bamba: 25, anchoRollo: 250 };
  it('reserva un despiece por modelo y mantiene su marca de corte', () => {
    expect(Object.keys(despiecesPorModelo)).toEqual(modelosConCorte);
    // Cortina, solapas y embudo tienen despiece propio; los de fachada comparten el mismo.
    for (const modelo of modelosConCorte.filter((m) => !['CORTINA', 'CAMBIO CORTINA', 'SOLAPAS', 'EMBUDO'].includes(m))) expect(piezasToldo({ ...toldo, modelo })).toEqual(piezasToldo(toldo));
    expect(() => piezasToldo({ ...toldo, modelo: 'HERA' })).toThrow(/pendiente/);
  });
  it('aplica el ajuste de cada toldo también al colocar', () => {
    const t = { ...toldo, ajustes: { empateCm: 3, aumentoEscuadrarCm: 6, tiraExtraAltoCm: 6 } };
    expect(cortePedido([t]).piezas[0].piezas).toEqual(piezasToldo(t));
    expect(piezasToldo(t).map((p) => [p.largo, p.alto])).toEqual([[4060, 2500], [4060, 1420], [4040, 310]]);
  });
  it.each([
    { anchoRollo: 0 }, { frenteTela: -1 }, { caidaTela: Infinity }, { caidaTela: 20 },
    { ajustes: { empateCm: 250 } }, { ajustes: { empate: 'diagonal' } }
  ])('rechaza medidas o ajustes que no permiten fabricar: %j', (cambio) => {
    expect(() => piezasToldo({ ...toldo, ...cambio })).toThrow();
  });
});

describe('Tetris en toldos (Iván, 23/10/2026)', () => {
  it('nunca gasta más que por columnas y mejora los dos pedidos conocidos', () => {
    for (const { pedido, toldos, verticales } of fixtures) {
      const columnas = cortePedido(toldos, verticales, { presupuesto: { restantes: 0 } }).largo;
      const tetris = cortePedido(toldos, verticales).largo;
      expect(tetris).toBeLessThanOrEqual(columnas);
      if (pedido === 'AR2600762') expect(tetris).toBe(23790);
    }
    const bamba = cortePedido(fixtures.find((f) => f.pedido === 'AR2604097').toldos, []);
    expect(bamba.piezas[0].piezas.map((p) => p.nombre)).toContain('A BAMBA');
  });
});
