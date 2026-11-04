import { describe, expect, it } from 'vitest';
import { calcularMedidasCal, MEDIDAS_CAL_5319, MEDIDAS_CAL_GEMELO } from './medidas.ts';

describe('Caballos por medidas de Cal', () => {
  it('respeta una ventana indicada en el pedido y amplía la tapa 3 cm', () => {
    const g = calcularMedidasCal({ ...MEDIDAS_CAL_5319, ventanaMedidas: { ancho: 35, alto: 45 } });
    expect(g.ventana).toEqual({ ancho: 35, alto: 45 });
    const tapa = g.piezas.find(p => p.nombre === 'Tapa ventana')!;
    expect(tapa.contorno[2]).toEqual([380, 480]);
  });

  it('avisa si la ventana indicada no cabe, sin recortar sus medidas', () => {
    for (const ventanaMedidas of [{ ancho: 80, alto: 35 }, { ancho: 35, alto: 60 }, { ancho: 0, alto: 35 }]) {
      expect(() => calcularMedidasCal({ ...MEDIDAS_CAL_5319, ventanaMedidas })).toThrow(/ventana/i);
    }
  });

  it('conserva recto y diagonal con el centímetro de lona hecha del gemelo', () => {
    const r = calcularMedidasCal(MEDIDAS_CAL_GEMELO);
    expect(r.proyeccion).toBeCloseTo(636.867, 3);
    expect(r.largoHecho).toBeCloseTo(2596.867, 3);
    expect(r.piezas.map(p => p.nombre)).toEqual(['Cuerpo', 'Morro', 'Frente', 'Tapa ventana']);
    expect(r.ventana).toEqual({ ancho: 50, alto: 35 });
    expect(r.piezas[0].contorno[1][0] - r.piezas[0].contorno[0][0]).toBeCloseTo(2020);
  });

  it('usa el exterior R9,5 en el 5319 sin forzar los 300 de largo', () => {
    const r = calcularMedidasCal(MEDIDAS_CAL_5319);
    expect(r.medidas.radioA).toBe(95);
    expect(r.medidas.radioB).toBe(95);
    expect(r.medidas.altoA + r.medidas.aguasA).toBe(770);
    expect(r.medidas.altoB + r.medidas.aguasB).toBe(670);
    expect(r.largoHecho).toBeCloseTo(2993.176, 3);
    expect(r.ventana).toEqual({ ancho: 50, alto: 35 });
    expect(r.piezas[0].ollaos).toHaveLength(16);
    expect(r.piezas[0].ollaos.slice(0, 8).map(p => p.c[0])).toEqual([25, 100, 300, 550, 940, 1260, 1570, 1930]);
    expect(r.pendientes).toEqual([]);
    expect(r.puerta).toMatchObject({ lado: 'MFI', separacionBorde: 4 });
    expect(r.puerta!.ancho).toBeCloseTo(103);
  });

  it('marca las dos cremalleras a 4 cm de los extremos de la diagonal, sin añadir una puerta rectangular', () => {
    const con = calcularMedidasCal(MEDIDAS_CAL_5319);
    const sin = calcularMedidasCal({ ...MEDIDAS_CAL_5319, puerta: 'NINGUNA' });
    const morro = con.piezas[1], marcas = morro.marcas.slice(-2);
    expect(morro.corte).toEqual(sin.piezas[1].corte);
    expect(con.piezas.length).toBe(sin.piezas.length);
    expect(marcas.every(p => p.tipo === 'tramo')).toBe(true);
    expect(con.puerta!.alto).toBeCloseTo(50.345940986);
    const ps = morro.terminado!, n = ps.length / 2, a = ps[n - 1], b = ps[n];
    if (marcas[0].tipo !== 'tramo' || marcas[1].tipo !== 'tramo') throw Error('Faltan cremalleras');
    expect(Math.hypot(marcas[0].a[0] - a[0], marcas[0].a[1] - a[1])).toBeCloseTo(40);
    expect(Math.hypot(marcas[1].a[0] - b[0], marcas[1].a[1] - b[1])).toBeCloseTo(40);
    expect(calcularMedidasCal({ ...MEDIDAS_CAL_5319, puertaMorro: undefined }).pendientes.join(' ')).toMatch(/puerta MFI/);
  });

  it('calcula el paño del 5319 desde el 3D y conserva visible la diferencia del acabado CAD', () => {
    const r = calcularMedidasCal(MEDIDAS_CAL_5319);
    expect(r.desarrolloCuerpo.total).toBeCloseTo(2901.628124, 3);
    expect(r.desarrolloCuerpo.bastillas).toBe(60);
    expect(r.desarrolloCuerpo.corte).toBeCloseTo(2976.628124, 3);
    expect(r.desarrolloCuerpo.corte - 2975).toBeCloseTo(1.628124, 3);
    const distinto = calcularMedidasCal({ ...MEDIDAS_CAL_5319, margenBajo: 3.5 });
    expect(distinto.desarrolloCuerpo.corte - r.desarrolloCuerpo.corte).toBe(10);
    expect(calcularMedidasCal(MEDIDAS_CAL_GEMELO).desarrolloCuerpo.corte).toBeCloseTo(3336.889742, 3);
  });

  it('mantiene los 5 cm de fruncido confirmados, editables sin mover el terminado', () => {
    const base = calcularMedidasCal(MEDIDAS_CAL_5319).piezas[0];
    const editado = calcularMedidasCal({ ...MEDIDAS_CAL_5319, fruncir: 8 }).piezas[0];
    expect(MEDIDAS_CAL_5319.fruncir).toBe(5);
    expect(base.contorno[0][0]).toBe(-50);
    expect(editado.contorno[0][0]).toBe(-80);
    expect(editado.terminado).toEqual(base.terminado);
    expect(editado.ollaos).toEqual(base.ollaos);
  });

  it('reduce la ventana al espacio disponible y mantiene la tapa con 3 cm más', () => {
    const r = calcularMedidasCal({ ...MEDIDAS_CAL_GEMELO, frente: 40, altoFrente: 35, aguasFrente: 0 });
    expect(r.ventana).toEqual({ ancho: 41, alto: 22 });
    const tapa = r.piezas.at(-1)!;
    expect(tapa.contorno[2]).toEqual([440, 250]);
  });

  it('rechaza datos incompletos, diagonales imposibles y ollaos fuera del cuerpo', () => {
    for (const cambio of [{ radio: -1 }, { diagonal: 1 }, { recto: NaN }, { laterales: [220] }, { alto: -1 }, { aguas: Infinity }]) {
      expect(() => calcularMedidasCal({ ...MEDIDAS_CAL_5319, ...cambio })).toThrow();
    }
  });

  it('conserva el refuerzo MFD de Cal como pieza de corte y marca en una sola diagonal', () => {
    const sin = calcularMedidasCal({ ...MEDIDAS_CAL_5319, refuerzoMfd: false });
    const con = calcularMedidasCal({ ...MEDIDAS_CAL_5319, refuerzoMfd: true });
    const ref = con.piezas.find(p => p.nombre === 'Refuerzo MFD')!;
    expect(ref).toBeDefined();
    expect(ref.ollaos).toEqual([]);
    expect(ref.corte).toHaveLength(4);
    // El corte 10EE7 y su marca 10EE4 tienen este sentido; no se espeja la pieza suelta.
    expect(ref.contorno.reduce((s, p, i, ps) => s + p[0] * ps[(i + 1) % ps.length][1] - p[1] * ps[(i + 1) % ps.length][0], 0)).toBeLessThan(0);
    const largos = ref.contorno.map((p, i, ps) => Math.hypot(p[0] - ps[(i + 1) % ps.length][0], p[1] - ps[(i + 1) % ps.length][1]));
    expect(largos.map(x => Math.round(x * 100) / 100)).toEqual([54.6, 193.89, 53.74, 197.81]);
    expect(con.piezas[1].marcas.length - sin.piezas[1].marcas.length).toBe(4);
    expect(con.piezas[1].corte).toEqual(sin.piezas[1].corte);
    expect(sin.piezas.some(p => p.nombre === 'Refuerzo MFD')).toBe(false);
  });
});
