import { describe, expect, it } from 'vitest';
import { geometriaAlzado } from './alzado.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { calcularPuerta } from './calcular.ts';
import { fichaPorId } from './clientes.ts';
import { generarCortePuertas } from './corte.ts';
import { nuevaPuertaDeCliente } from './nuevaPuertaCliente.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { dibujarAlzadoEnrollable } from './planoEnrollable.ts';
import { enrolleTgm, puertaTgmDerivada } from './tgm.ts';
import type { Puerta } from './tipos.ts';

describe('ficha TGM', () => {
  it('está habilitada, con solo la enrollable y los valores del enrolle', () => {
    const f = fichaPorId('tgm')!;
    expect(f).toMatchObject({ nombre: 'TGM', habilitado: true, calculo: 'tgm', codigoRps: '' });
    expect(f.tipos.map(t => t.id)).toEqual(['enrollable']);
    expect(f.enrolle).toMatchObject({
      diametroEnrolle: 88.9, diametroTubo: 42, grosor: 0.8, anadido: 30, altoPerfil: 10, anchoPerfil: 10, anguloPerfil: 25,
      cierreBajo: 14, marcaCierre: 23, anchoEt: 14.5,
    });
  });

  it('una puerta nueva TGM lleva su bloque, ciega y con saco de 120', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    expect(p).toMatchObject({
      modelo: 'PUERTAENR', ventanasConfirmadas: true,
      enrollable: { sinVentanal: true, saco: 120, anchoEt: 14.5 },
      tgm: {
        altoHueco: 0, altoTotal: null, anadido: 30, diametroEnrolle: 88.9, diametroTubo: 42,
        nTubos: 3, anchoEt: 14.5, abajo: 'saco', grosor: 0.8, tubosManual: null, cierreBajo: 14, marcaCierre: 23,
        lona: 'pvc', materialEt: 'LAC900',
        ajustes: { margen: 5, desvio: 100, altoPerfil: 10, anchoPerfil: 10, anguloPerfil: 25 },
      },
    });
  });

  it('General reserva la confección por medidas al tipo Enrollable', () => {
    expect(fichaPorId('general')!.tipos.filter(t => t.calculo === 'medidas').map(t => t.id)).toEqual(['enrollable']);
  });
});

describe('pedido TGM', () => {
  it('recupera sin cambios la puerta guardada y sus medidas en cm y mm', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    const pedido = pedidoDe('PRUEBA', {
      ...p,
      enrollable: { ...p.enrollable, sinSaco: true, cierreBajo: 15, marcaCierre: 24 },
      tgm: { ...p.tgm!, altoHueco: 400, altoTotal: 430.5, anchoEt: 14.5, tubosManual: [1100, 2200, 3300],
        abajo: 'tubo', cierreBajo: 15, marcaCierre: 24, lona: 'rejilla', materialEt: 'LAC650', varilla: 'negra' },
    });
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toEqual(pedido);
  });

  it('completa las cotas y los materiales de una TGM antigua conservando su ancho guardado', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    const pedido = pedidoDe('PRUEBA', p);
    const [elemento] = pedido.elementos;
    const anterior = { ...p, tgm: { ...p.tgm, anchoEt: 8, cierreBajo: undefined, marcaCierre: undefined,
      lona: undefined, materialEt: undefined } };
    const guardado = JSON.parse(JSON.stringify({ ...pedido, elementos: [{ ...elemento, input: anterior }] }));
    expect(leerPedidoPuertas(guardado).elementos[0].input).toEqual({ ...p, tgm: { ...p.tgm, anchoEt: 8 } });
    expect(guardado.elementos[0].input.tgm).not.toHaveProperty('marcaCierre');
  });

  it('rechaza tipos de lona y materiales de E.T. ajenos a TGM', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    const pedido = pedidoDe('PRUEBA', p);
    const [elemento] = pedido.elementos;
    for (const cambios of [{ lona: 'acrilica' }, { materialEt: 'LAC450' }, { varilla: 'roja' }]) {
      const input = { ...p, tgm: { ...p.tgm, ...cambios } };
      expect(() => leerPedidoPuertas({ ...pedido, elementos: [{ ...elemento, input }] })).toThrow(/campos inválidos/);
    }
  });

  it('rechaza cotas del cierre que no son números', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    const pedido = pedidoDe('PRUEBA', p);
    const [elemento] = pedido.elementos;
    for (const input of [
      { ...p, tgm: { ...p.tgm, cierreBajo: '14' } },
      { ...p, enrollable: { ...p.enrollable, marcaCierre: '23' } },
    ]) expect(() => leerPedidoPuertas({ ...pedido, elementos: [{ ...elemento, input }] })).toThrow(/campos inválidos/);
  });

  it('rechaza una puerta TGM sin bloque de enrolle o con datos inválidos', () => {
    const p = nuevaPuertaDeCliente('tgm', 'enrollable');
    expect(() => leerPedidoPuertas(pedidoDe('PRUEBA', { ...p, tgm: undefined }))).toThrow(/campos inválidos/);
    const pedido = pedidoDe('PRUEBA', p);
    const [elemento] = pedido.elementos;
    const incompleta = { ...p, tgm: { ...p.tgm, ajustes: {} } };
    expect(() => leerPedidoPuertas({ ...pedido, elementos: [{ ...elemento, input: incompleta }] })).toThrow(/campos inválidos/);
  });
});

const puertaTgm = (cambios: Partial<NonNullable<Puerta['tgm']>> = {}): Puerta => {
  const p = nuevaPuertaDeCliente('tgm', 'enrollable');
  return { ...p, of: 'OF1', frente: 300, alto: 400, color: 'BLANCO', confirmada: true,
    tgm: { ...p.tgm!, altoHueco: 400, nTubos: 3, varilla: 'blanca', ...cambios } };
};

describe('cálculo de la puerta TGM', () => {
  it.each([[5, 14, 23], [7, 16, 25]])('ajusta el cierre del tubo a una soldadura de %s cm', (soldadura, cierreBajo, marcaCierre) => {
    const p = puertaTgm({ abajo: 'tubo', soldadura });
    expect(puertaTgmDerivada(p, enrolleTgm(p)!).enrollable).toMatchObject({ cierreBajo, marcaCierre });
  });
  it('envuelve el tubo del cierre y conserva el frente de las E.T. entre bastillas', () => {
    const p = puertaTgm({ abajo: 'envolvente', altoHueco: 320, laterales: 'bastilla', bastilla: 5, terminado: 10 });
    p.rollo = 320;
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(enrolleTgm(p)?.largo).toBe(3469);
    expect(r.piezas.filter(x => x.clase === 'pano')).toMatchObject([{ ancho: 310, alto: 366.5 }]);
    const rayasDelCierre = r.piezas[0].marcas.filter(([x1, y1, x2, y2]) => y1 === y2 && y1 < 35 && x2 - x1 > 150);
    expect(rayasDelCierre).toEqual([[6.5, 23, 303.5, 23]]);
    const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
    expect(lienzo.lineas.filter(l => l.capa === 'ROTULADOR' && l.y1 === l.y2 && l.y1 < -330 && l.x2 - l.x1 > 150))
      .toMatchObject([{ y1: -340 }]);
    expect(lienzo.cotas).toContainEqual(expect.objectContaining({ y1: -340, y2: -335, valor: 5 }));
    expect(r.piezas.filter(x => x.clase === 'entrada')).toMatchObject([{ ancho: 300, huecos: [] }, { ancho: 300, huecos: [] }]);
    expect(r.alternativasSaco).toMatchObject({ entero: [{ ancho: 306, alto: 30 }], partido: [{ ancho: 160, alto: 30 }, { ancho: 148, alto: 30 }] });
    expect(leerPedidoPuertas(pedidoDe('ENV', p)).elementos[0].input).toEqual(p);
  });
  it('respeta la altura de raya de una ficha personalizada al cambiar la soldadura', () => {
    const p = puertaTgm({ abajo: 'envolvente', terminado: 12, cierreBajo: 15, marcaCierre: 25, soldadura: 7 });
    const e = enrolleTgm(p)!;
    expect(puertaTgmDerivada(p, e).enrollable).toMatchObject({ cierreBajo: 17, marcaCierre: 27 });
    expect(e.largo).toBe(4259);
  });
  it('reparte por el ancho con bastillas y embebe la primera E.T. en el paño', () => {
    const p = puertaTgm({ abajo: 'envolvente', altoHueco: 320, laterales: 'bastilla', bastilla: 5, terminado: 10 });
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.piezas.map(x => [x.ancho, x.alto])).toEqual([[310, 257.95], [310, 123.05], [300, 14.5]]);
    for (const x of r.piezas.filter(x => x.clase === 'pano')) {
      expect(x.huecos).toEqual([]);
      for (const borde of [5, 305]) expect(x.marcas).toContainEqual([borde, 0, borde, x.alto]);
    }
    const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
    expect(lienzo.textos.map(t => t.valor)).toContain('B.N. (5)');
    expect(lienzo.textos.map(t => t.valor)).not.toContain('3 CM (HUECOS)');
    expect(lienzo.cotas).toContainEqual(expect.objectContaining({ y1: -350, y2: -340, valor: 10 }));
    expect(generarCortePuertas(pedidoDe('ENV', p)).archivo?.dxf).toContain('EOF');
  });
  it('mantiene la bastilla indicada por encima de seis metros', () => {
    const p = { ...puertaTgm({ laterales: 'bastilla', bastilla: 8, lona: 'rejilla' }), frente: 650 };
    const r = calcularPuerta(p);
    expect(r.piezas.filter(x => x.clase === 'pano').map(x => x.ancho)).toEqual([666, 666]);
    expect(r.piezas.filter(x => x.clase === 'entrada').map(x => x.ancho)).toEqual([650, 650, 650, 650]);
  });
  it('pide el terminado del envoltorio y rechaza una soldadura vacía', () => {
    for (const cambios of [{ terminado: null }, { terminado: 9.4 }, { terminado: 10, soldadura: null }]) {
      const r = calcularPuerta(puertaTgm({ abajo: 'envolvente', ...cambios }));
      expect(r.avisos).toContainEqual(expect.objectContaining({ codigo: cambios.soldadura === null ? 'TGM_SOLDADURA' : 'TGM_ENVOLTORIO', nivel: 'error' }));
      expect(r.piezas).toEqual([]);
    }
  });
  it('pide la medida de bastilla del pedido', () => {
    expect(calcularPuerta(puertaTgm({ laterales: 'bastilla' })).avisos).toContainEqual(expect.objectContaining({ codigo: 'TGM_BASTILLA', nivel: 'error' }));
  });
  it('PVC: el paño inferior forma la E.T. y el superior lleva su raya de empate con flecha', () => {
    const p = { ...puertaTgm({ abajo: 'tubo', lona: 'pvc' }), rollo: 250 };
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.uniones).toEqual([
      { altura: 154.6, solape: 14.5, tubo: 2 }, { altura: 285, solape: 14.5, tubo: 1 },
    ]);
    expect(r.piezas.map(x => [x.nombre, x.ancho, x.alto])).toEqual([
      ['Paño 1', 300, 175.85], ['Paño 2', 300, 144.9], ['Paño 3', 300, 155.75],
    ]);
    const [inferior, central, superior] = r.piezas;
    expect(inferior.huecos).toEqual([]);
    expect(central.huecos).toEqual([]);
    expect(superior.huecos).toEqual([]);
    const rayas = (pieza: typeof inferior) => pieza.marcas.filter(([a, b, c, d]) => b === d && c - a > 150).map(m => m[1]);
    expect(rayas(inferior)).toEqual([23]);
    expect(rayas(central)).toEqual([14.5]);
    expect(rayas(superior)).toEqual([14.5, 148.75]);
    for (const pano of [central, superior]) {
      expect(pano.marcas).toContainEqual([150, 14.5, 150, 13.5]);
    }

    const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
    const flechas = lienzo.inserciones.filter(i => i.nombre === 'FLECHA2');
    expect(flechas.map(f => Number(f.y.toFixed(2)))).toEqual([-137.75, -268.15]);
    expect(flechas.map(f => f.giro)).toEqual([0, 0]);
    expect(generarCortePuertas(pedidoDe('PVC-TGM', p)).archivo?.dxf).toContain('EOF');
  });

  it('PVC: marca una E.T. suelta a medio ancho por debajo de su eje', () => {
    const p = puertaTgm({ abajo: 'tubo', lona: 'pvc', anchoEt: 18 });
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.uniones).toEqual([]);
    expect(r.piezas[0].marcas).toContainEqual([1.5, 290, 298.5, 290]);
    expect(r.piezas[0].marcas).toContainEqual([1.5, 159.6, 298.5, 159.6]);
    const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
    expect(lienzo.inserciones.filter(i => i.nombre === 'FLECHA2').map(f => Number(f.y.toFixed(2))))
      .toEqual([-154, -284.4]);
  });

  it('PVC: el empate que indica un tubo usa su eje y el ancho de E.T. actuales', () => {
    const base = puertaTgm({ abajo: 'tubo', lona: 'pvc', anchoEt: 18 });
    const p = { ...base, enrollable: { ...base.enrollable,
      empates: [{ pano: 'inferior' as const, altura: 160, solape: 7.5, tubo: 2 }] } };
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.uniones).toEqual([{ altura: 154.6, solape: 18, tubo: 2 }]);
  });

  it.each([
    { materialEt: 'LAC900', material: 'LAC900', pano: 'REJILLA' },
    { materialEt: 'LAC650', material: 'REJILLA SEDOCROM', pano: 'REJILLA SEDOCROM' },
  ] as const)('rejilla: empata por el rollo y corta las E.T. de $materialEt aparte', ({ materialEt, material, pano }) => {
    const base = puertaTgm({ abajo: 'tubo', lona: 'rejilla', materialEt });
    const p = { ...base, rollo: 250, material, color: 'AZUL 5002', observaciones: 'LONA DE REJILLA',
      enrollable: { ...base.enrollable, empates: [{ pano: 'inferior' as const, altura: 167.1, solape: 7.5, tubo: 2 }] } };
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.uniones).toEqual([{ altura: 257.3, solape: 2 }]);
    const panos = r.piezas.filter(x => x.clase === 'pano');
    expect(panos).toMatchObject([
      { nombre: 'Paño 1', material: `${pano} AZUL 5002`, alto: 250, huecos: [] },
      { nombre: 'Paño 2', material: `${pano} AZUL 5002`, alto: 177.2, huecos: [] },
    ]);
    expect(panos[0].marcas).toContainEqual([1.5, 142.55, 298.5, 142.55]);
    expect(panos[1].marcas).toContainEqual([1.5, 24.95, 298.5, 24.95]);
    const ets = r.piezas.filter(x => x.clase === 'entrada' && x.alto === 14.5);
    expect(ets).toHaveLength(2);
    expect(r.piezas.filter(x => x.clase === 'entrada').map(x => x.nombre)).toContain('E.T. sándwich');
    for (const et of ets) {
      expect(et).toMatchObject({ material: `${materialEt} AZUL 5002`, ancho: 300, alto: 14.5 });
      expect(et.huecos).toEqual([]);
    }
    expect(generarCortePuertas(pedidoDe('REJILLA-TGM', p)).archivo?.dxf).toContain('EOF');
  });

  it('suma los 30 cm al hueco, descuenta el rematado del saco y coloca tres tubos', () => {
    const e = enrolleTgm(puertaTgm())!;
    expect(e).toMatchObject({ altoLona: 430, conSaco: true, largo: 4170, cfg: { conFunda: true }, anchoEt: 14.5 });
    expect(e.colocacion.marcas).toHaveLength(3);
    expect(e.colocacion.avisos).toEqual([]);
  });

  it('el alto total manda y el paño incluye 3,5 cm encima de la varilla', () => {
    const p = puertaTgm({ altoTotal: 450, abajo: 'tubo' });
    expect(enrolleTgm(p)!.altoLona).toBe(450);
    const panos = calcularPuerta(p).piezas.filter(x => x.clase === 'pano');
    expect(Math.max(...panos.map(x => x.origenAlzado![1] + x.alto))).toBeCloseTo(453.5);
  });

  it('con saco corta tres E.T. de 14,5 centradas en los ejes del simulador', () => {
    const p = puertaTgm({ materialEt: 'LAC650' }), r = calcularPuerta(p), e = enrolleTgm(p)!;
    expect(r.avisos).toEqual([]);
    expect(r.piezas.map(x => x.clase)).toEqual(['pano', 'saco', 'entrada', 'entrada', 'entrada']);
    const ets = r.piezas.filter(x => x.clase === 'entrada');
    expect(ets.map(x => x.alto)).toEqual([14.5, 14.5, 14.5]);
    for (const [i, m] of e.colocacion.marcas.entries()) {
      expect(ets[i].material).toBe('LAC900 BLANCO');
      const eje = ets[i].origenAlzado![1] + ets[i].alto / 2;
      expect(Math.abs(eje - (430 - m / 10))).toBeLessThanOrEqual(0.05 + 1e-9);
      expect(ets[i].huecos).toEqual([]);
    }
  });

  it('con tubo abajo fija el último eje en el cierre y corta dos E.T.', () => {
    const p = puertaTgm({ abajo: 'tubo', cierreBajo: 15, marcaCierre: 24 });
    const e = enrolleTgm(p)!;
    expect(e).toMatchObject({ largo: 4279, conSaco: false, cfg: { conFunda: true }, cierreBajo: 15 });
    expect(e.colocacion.marcas.at(-1)).toBe(e.largo);
    expect(puertaTgmDerivada(p, e).enrollable).toMatchObject({ sinSaco: true, cierreBajo: 15, marcaCierre: 24 });
    const r = calcularPuerta(p);
    expect(r.avisos).toEqual([]);
    expect(r.piezas.map(x => x.clase)).toEqual(['pano', 'entrada', 'entrada']);
    const [pano] = r.piezas;
    expect(pano.origenAlzado?.[1]).toBe(-15);
    expect(pano.marcas).toContainEqual([1.5, 24, 298.5, 24]);
  });

  it('en manual conserva los ejes de las E.T. y sitúa en el cierre el último tubo', () => {
    const p = puertaTgm({ abajo: 'tubo', tubosManual: [1500, 2650, 4200] });
    expect(enrolleTgm(p)!.colocacion.marcas).toEqual([1500, 2650, 4279]);
    expect(p.tgm!.tubosManual).toEqual([1500, 2650, 4200]);
  });

  it('traslada al cálculo el aviso de solape entre tubos manuales', () => {
    const p = puertaTgm({ tubosManual: [1400, 1420, 1500] });
    expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({ codigo: 'TUBOS_SOLAPAN', nivel: 'error' }));
  });

  it.each([{ altoHueco: 0 }, { altoTotal: 10 }])('pide las medidas cuando la lona no se puede enrollar con %j', cambios => {
    const p = puertaTgm(cambios);
    expect(enrolleTgm(p)).toBeNull();
    expect(calcularPuerta(p).avisos).toContainEqual(expect.objectContaining({ codigo: 'TGM_MEDIDAS', nivel: 'error' }));
  });

  it.each(['saco', 'tubo'] as const)('genera corte y plano con %s y recupera el pedido', abajo => {
    const p = puertaTgm({ abajo });
    const pedido = pedidoDe('PRUEBA-TGM', p);
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toEqual(pedido);
    const corte = generarCortePuertas(pedido);
    expect(corte.archivo?.dxf).toContain('EOF');
    const dxf = escribirPlanoPuertas({ pedido, cabecera: { cliente: 'TGM', tecnico: 'IVÁN', revisor: '', fecha: '18/11/2026' } });
    expect(dxf).toContain('EOF');
    expect(dxf.includes('SOLDAR SACO NEGRO')).toBe(abajo === 'saco');
    const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
    expect(lienzo.cotas).toContainEqual(expect.objectContaining({ y1: 0, y2: -430, valor: 430 }));
    expect(lienzo.lineas.filter(l => l.capa === 'ejes')).toHaveLength(abajo === 'saco' ? 3 : 2);
    if (abajo === 'tubo') expect(lienzo.lineas).toContainEqual({ capa: 'ROTULADOR', x1: 1.5, y1: -421, x2: 298.5, y2: -421 });
  });
});

// Iván, 19/11/2026 (AR2605499, plano de Jaime): en rejilla el tubo de abajo va en una E.T. sándwich de PVC cortada de 31
// y, si lleva saco, es de PVC aparte, soldado en esa E.T.; los textos son los de Jaime, no los de Portanova.
describe('TGM de rejilla como el plano de Jaime (AR2605499)', () => {
  const rejilla = (cambios: Partial<NonNullable<Puerta['tgm']>> = {}, puerta: Partial<Puerta> = {}): Puerta => {
    const base = puertaTgm({ lona: 'rejilla', materialEt: 'LAC650', laterales: 'bastilla', bastilla: 10, varilla: 'blanca',
      abajo: 'tubo', altoHueco: 336, ...cambios });
    return { ...base, frente: 575, rollo: 500, material: 'REJILLA', color: 'VERDE 6026', ...puerta,
      enrollable: { ...base.enrollable, sinSaco: (cambios.abajo ?? 'tubo') !== 'saco', ...puerta.enrollable } };
  };
  const valores = (p: Puerta) => dibujarAlzadoEnrollable(p, 'A').lienzo.textos.map(t => t.valor);

  it('sin saco: la lona acaba 8,3 sobre el bajo, raya a 5 y E.T. sándwich de 31 en PVC', () => {
    const p = rejilla();
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    const panos = r.piezas.filter(x => x.clase === 'pano');
    expect(panos.map(x => [x.ancho, x.alto])).toEqual([[595, 361.2]]);
    expect(panos[0].marcas).toContainEqual([11.5, 5, 583.5, 5]);
    expect(r.piezas.filter(x => x.clase === 'entrada').map(x => [x.nombre, x.ancho, x.alto, x.material])).toEqual([
      ['Entrada de tubo 1', 575, 14.5, 'LAC650 VERDE 6026'], ['Entrada de tubo 2', 575, 14.5, 'LAC650 VERDE 6026'],
      ['E.T. sándwich', 575, 31, 'LAC650 VERDE 6026'],
    ]);
    expect(enrolleTgm(p)).toMatchObject({ conSaco: false, largo: 3639 });
    expect(generarCortePuertas(pedidoDe('REJILLA-5499', p)).archivo?.dxf).toContain('ET SÁNDWICH');
  });

  it('con saco: saco de PVC aparte de 31 + 2 × lo que cuelga, y el tubo sigue en la E.T. sándwich', () => {
    const p = rejilla({ abajo: 'saco', altoHueco: 390, altoTotal: 420 }, { frente: 689, enrollable: { saco: 150 } as Puerta['enrollable'] });
    const r = calcularPuerta(p);
    expect(r.avisos.filter(a => a.nivel === 'error')).toEqual([]);
    expect(r.piezas.filter(x => x.clase === 'pano').map(x => x.alto)).toEqual([400.2]);
    expect(r.piezas.filter(x => x.clase === 'entrada').map(x => [x.nombre, x.ancho, x.alto, x.material])).toEqual([
      ['Entrada de tubo 1', 689, 14.5, 'LAC650 VERDE 6026'], ['Entrada de tubo 2', 689, 14.5, 'LAC650 VERDE 6026'],
      ['E.T. sándwich', 689, 31, 'LAC650 VERDE 6026'], ['Saco de PVC', 689, 61, 'LAC650 VERDE 6026'],
    ]);
    expect(r.piezas.some(x => x.clase === 'saco')).toBe(false);
    expect(enrolleTgm(p)).toMatchObject({ conSaco: false, largo: 4029 });
    const textos = valores(p);
    expect(textos).toEqual(expect.arrayContaining(['SOLDAR SACO EN E.T.', 'SACO 650 GR VERDE 6026']));
    expect(textos).not.toContain('SACO ENVOLVENTE');
    expect(generarCortePuertas(pedidoDe('REJILLA-5499-D', p)).archivo?.dxf).toContain('EOF');
  });

  it('el dibujo lleva los textos de Jaime y no los de Portanova', () => {
    const textos = valores(rejilla());
    expect(textos).toEqual(expect.arrayContaining([
      'VARILLA BLANCA (5,5)', 'B.N. (10)', 'ET Ø42 MM (CORTADA DE 14,5 CM)',
      'E.T. Ø42 EN PVC TIPO SÁNDWICH CORTADA DE 31 CM EN PVC 650 VERDE 6026', 'E.T. Ø42 EN PVC VERDE 6026',
      '- COSER VARILLA BLANCA EN LAS ESQUINAS', '- COSER E.T. EN LAS ESQUINAS',
    ]));
    expect(textos.filter(t => t === 'ET Ø42 MM (CORTADA DE 14,5 CM)')).toHaveLength(2);
    for (const fuera of ['DE ESTE LADO PISAR LAS E.T. 1 CM', 'SOLDADURA DEL CIERRE', 'CERRAR E.T', 'BASTILLA DE 10 CM', 'VARILLA NEGRA (4,5)'])
      expect(textos).not.toContain(fuera);
    expect(valores(rejilla({ varilla: 'negra' }))).toEqual(expect.arrayContaining(['VARILLA NEGRA (4,5)', '- COSER VARILLA NEGRA EN LAS ESQUINAS']));
  });

  it('el alzado de pantalla dibuja la lona hasta la E.T. sándwich, con el saco colgado y sin los textos de Portanova', () => {
    const textosAlzado = (p: Puerta) => {
      const d = puertaTgmDerivada(p, enrolleTgm(p)!);
      return { d, g: geometriaAlzado(d, calcularPuerta(p)) };
    };
    const { d, g } = textosAlzado(rejilla({ abajo: 'saco', altoHueco: 390, altoTotal: 420 },
      { frente: 689, enrollable: { saco: 150 } as Puerta['enrollable'] }));
    const H = d.alto;
    const textos = g.formas.flatMap(f => f.tipo === 'texto' ? f.lineas : []);
    expect(textos).toEqual(expect.arrayContaining(['VARILLA BLANCA (5,5 mm)', 'B.N. (10)', 'E.T. SÁNDWICH']));
    for (const fuera of ['DE ESTE LADO PISAR LAS E.T. 1 CM', 'VARILLA NEGRA (4,5 mm)', 'SOLDAR SACO NEGRO 2 CM MÁXIMO'])
      expect(textos).not.toContain(fuera);
    expect(textos.some(t => t.startsWith('CERRAR E.T'))).toBe(false);
    // La lona acaba 15 + 8,3 sobre el bajo; la raya de soldar, 5 más arriba; el saco cuelga 15.
    expect(g.formas).toContainEqual(expect.objectContaining({ tipo: 'rect', clase: 'puerta-lona', alto: H - 23.3 }));
    expect(g.formas).toContainEqual(expect.objectContaining({ tipo: 'linea', clase: 'puerta-rotulador', y1: H - 28.3 }));
    expect(g.formas).toContainEqual(expect.objectContaining({ tipo: 'rect', clase: 'puerta-saco', y: H - 15, alto: 15 }));
    expect(g.formas).toContainEqual(expect.objectContaining({ tipo: 'rect', clase: 'puerta-entrada-alzado', y: H - 28.3, alto: 13.3 }));
    const negra = textosAlzado(rejilla({ varilla: 'negra' })).g.formas.flatMap(f => f.tipo === 'texto' ? f.lineas : []);
    expect(negra).toContain('VARILLA NEGRA (4,5 mm)');
  });

  it('pregunta qué varilla lleva arriba', () => {
    const r = calcularPuerta(rejilla({ varilla: undefined }));
    expect(r.avisos).toContainEqual(expect.objectContaining({ codigo: 'TGM_VARILLA', nivel: 'error' }));
    expect(r.piezas).toEqual([]);
  });
});
