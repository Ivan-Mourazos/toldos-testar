import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/fixtures-corte.json' with { type: 'json' };
import { cortePedido, sacosEnHuecos } from './colocacion.js';
import { despiecesPorModelo, piezasToldo } from './despiece.js';
import { modelosConCorte } from '../corteReadiness.js';

describe('Corte de los 18 pedidos contrastados con la oficina', () => {
  it.each(fixtures)('$pedido: piezas, largo, giros y sacos', ({ toldos, verticales, esperado }) => {
    const corte = cortePedido(toldos, verticales);
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
    for (const modelo of modelosConCorte) expect(piezasToldo({ ...toldo, modelo })).toEqual(piezasToldo(toldo));
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
