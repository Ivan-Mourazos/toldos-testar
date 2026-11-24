import { describe, expect, it } from 'vitest';
import { calcularMedidasCal, MEDIDAS_CAL_5319, MEDIDAS_CAL_GEMELO } from './medidas.ts';
import { dibujoCal, juegoCorteCal } from './salidasCal.ts';
import { soportadaGanado } from '../corte/ganado.js';
import { generarCorteRemolques } from '../corte/index.js';
import { emptyGanado } from '../entradas-vacias.ts';
import { calcGanado } from '../calc/ganado.ts';
import { hojaGanado } from '../hoja/datos-hoja.ts';

describe('recogidas de ganado', () => {
  it('añade el canal y coloca las marcas a la misma medida del terminado', () => {
    const m = { ...MEDIDAS_CAL_GEMELO, fruncir: 7, recogidas: { atras: 'GOMA_FRUNCIDA' as const } };
    const [cuerpo, ...resto] = calcularMedidasCal(m).piezas;
    expect(Math.min(...cuerpo.contorno.map(([x]) => x))).toBe(-70);
    expect(cuerpo.marcas[0]).toMatchObject({ a: [70, 0] });
    expect(cuerpo.marcas[0]).toMatchObject({ b: [70, cuerpo.terminado![2][1]] });
    expect(resto.map(p => p.nombre)).not.toContain('Trasero');
    expect(calcularMedidasCal({ ...m, recogidas: undefined }).piezas[0].marcas[0]).toMatchObject({ a: [50, 0] });
    expect(calcularMedidasCal({ ...m, recogidas: { ...m.recogidas, marcaContinua: false } }).piezas[0].marcas[0]).toMatchObject({ b: [70, 20] });
  });

  it('dibuja las hebillas de 2 × 10 solo en el plano y respeta su giro', () => {
    const m = { ...MEDIDAS_CAL_GEMELO, recogidas: { atras: 'GOMA_FRUNCIDA' as const,
      sujeciones: { mfi: { pieza: 'Cuerpo' as const, posiciones: '20 / 10 / 90' } } } };
    const d = dibujoCal(m);
    const [hebilla] = d.polilineas.filter(p => p.capa === 'referencia-1');
    expect(hebilla.cerrada).toBe(true);
    const [a, b, c] = hebilla.puntos;
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeCloseTo(2);
    expect(Math.hypot(b[0] - c[0], b[1] - c[1])).toBeCloseTo(10);
    expect(d.textos.some(t => t.valor === 'CORREAS DE RECOLLER')).toBe(true);
    expect(juegoCorteCal(m)).toEqual(juegoCorteCal({ ...m, recogidas: { atras: 'GOMA_FRUNCIDA' } }));
    const input = { ...emptyGanado('CAL_MEDIDAS'), medidasCal: m, material: 'LONA PVC 580 :GRIS 7037 :250 AN' };
    input.cabecera.ordenFabricacion = '0223263';
    const result = calcGanado(input);
    const { archivo } = generarCorteRemolques({ orderCode: 'AR2506052', elementos: [{ tipo: 'ganado', input, result }] });
    expect(archivo?.dxf).toContain('AC1018');
    expect(archivo?.dxf).not.toMatch(/CORREAS DE RECOLLER|referencia-1/i);
    expect(archivo?.plano.dxf).toContain('CORREAS DE RECOLLER');
    expect(archivo?.plano.dxf).toMatch(/referencia-1\r?\n 70\r?\n\s*0\r?\n 62\r?\n\s*11/);
    expect(hojaGanado(input, result).grupos.some(g => g.titulo === 'RECOGIDAS')).toBe(true);
  });

  it('suma el doblez de 1 cm a cada borde de las solapas y mantiene la regla de caras', () => {
    const m = { ...MEDIDAS_CAL_GEMELO, puerta: 'MFI' as const,
      recogidas: { atras: 'SIN_RECOGIDA' as const, puerta: { cierre: 'VELCRO' as const, solapas: { largo: 60, ancho: 12.5 }, anchoVelcro: 5, color: 'blanco' } } };
    const g = calcularMedidasCal(m);
    const solapas = g.piezas.filter(p => p.nombre.startsWith('Solapa'));
    expect(solapas).toHaveLength(2);
    expect(solapas[0].contorno).toContainEqual([620, 145]);
    expect(g.notasRecogidas).toContain('Puerta MFI · velcro de 5 cm blanco · BRAVO en la tapa por el revés · SUAVE por el derecho');
    expect(g.pendientes.join(' ')).toContain('puerta MFI');
  });

  it('requiere la confección rectificada antes de enviar puentes al bot', () => {
    const m = { ...MEDIDAS_CAL_GEMELO, recogidas: { atras: 'PUENTES' as const, recortes: true, tira: { largo: 95, ancho: 8.5 } } };
    expect(calcularMedidasCal(m).piezas.map(p => p.nombre)).toContain('Tira de la oreja inferior');
    expect(calcularMedidasCal({ ...m, recogidas: { ...m.recogidas, recortes: false } }).piezas.map(p => p.nombre)).not.toContain('Tira de la oreja inferior');
    expect(soportadaGanado({ input: { ganado: 'CAL_MEDIDAS', medidasCal: m } })).toContain('Puentes');
  });

  it('corta los trazados indicados y exige ollaos en la puerta de puentes', () => {
    const cuerpo = { corte: '-1/-3; 199/-3; 199/335; -1/335', terminado: '0/0; 198/0; 198/332; 0/332',
      marcas: '10/0/10/2', ollaos: '12/1; 35/1; 143/331; 151/331; 171/331' };
    const trasero = { corte: '-20/-3; 181/-3; 181/75; 162/75/0,414213562; 144/93; 17/93; -1/75; -20/75',
      terminado: '0/0; 161/0; 161/75; 0/75', marcas: '', ollaos: '' };
    const morro = { ...cuerpo, ollaos: '' };
    const recogidas = { atras: 'PUENTES' as const, puerta: { cierre: 'PUENTES' as const, integrada: true },
      trazados: { Cuerpo: cuerpo, Trasero: trasero, Morro: morro } };
    const m = { ...MEDIDAS_CAL_5319, recogidas };
    expect(soportadaGanado({ input: { ganado: 'CAL_MEDIDAS', medidasCal: m } })).toContain('ollaos de la puerta MFI');
    const listo = { ...m, recogidas: { ...recogidas, trazados: { ...recogidas.trazados, Morro: { ...morro, ollaos: '26/1; 37/1; 68/1; 100/1; 111/1' } } } };
    expect(soportadaGanado({ input: { ganado: 'CAL_MEDIDAS', medidasCal: listo } })).toBeNull();
    expect(calcularMedidasCal(listo).piezas[0].ollaos.map(o => o.c[0])).toEqual([120, 350, 1430, 1510, 1710]);
    expect(juegoCorteCal(listo).arcos.some(a => Math.abs(a.r - 180) < 1)).toBe(true);
  });

  it('distingue el ancho útil de la oreja del bajo y mantiene sin ollaos la banda de velcro', () => {
    const m = { ...MEDIDAS_CAL_GEMELO, recogidas: { atras: 'VELCRO' as const, trasero: {
      ancho: 151, alto: 65, altoOreja: 39.6, margenBajo: 3, margenSuperior: 0, aguas: 0, radio: 0,
    } } };
    const p = calcularMedidasCal(m).piezas.find(p => p.nombre === 'Trasero')!;
    expect(Math.max(...p.terminado!.map(([x]) => x)) - Math.min(...p.terminado!.map(([x]) => x))).toBe(1710);
    expect(Math.max(...p.contorno.map(([x]) => x)) - Math.min(...p.contorno.map(([x]) => x))).toBe(1770);
    expect(p.ollaos).toEqual([]);
  });
});
