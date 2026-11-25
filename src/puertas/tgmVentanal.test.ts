import { describe, expect, it } from 'vitest';
import { geometriaAlzado } from './alzado.ts';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { cotas5743, puerta5743 } from './__fixtures__/tgm5743.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { leerPedidoPuertas } from './pedido.ts';
import { dibujarAlzadoEnrollable } from './planoEnrollable.ts';
import { enrolleTgm, marcasDesdeCotasTgm, puertaTgmDerivada } from './tgm.ts';
import { ventanalesEnrollable } from './ventanalesEnrollable.ts';

describe('ventanal TGM del pedido AR2605743', () => {
  it('traslada las cotas de la hoja a las marcas sin recolocar las E.T.', () => {
    const p = puerta5743('tgm');
    expect(marcasDesdeCotasTgm(p, cotas5743)).toEqual([910, 1380, 2060, 2440]);
    expect(marcasDesdeCotasTgm(p, [38, 68])).toBeNull();
    expect(marcasDesdeCotasTgm(p, [38, 68, 500])).toBeNull();
    const enrolle = enrolleTgm(p)!;
    expect(enrolle.colocacion.marcas).toEqual(p.tgm!.tubosManual);
    const derivada = puertaTgmDerivada(p, enrolle);
    expect(derivada.entradas.map(e => e.altura)).toEqual([179, 132, 64, 26]);
    expect(ventanalesEnrollable(derivada)[0]).toMatchObject({ desde: 91, D: 47, altoVisible: 35, altoCorte: 39 });
  });

  it('corta el plástico de lado a lado, conserva las cuatro E.T. y pasa las rayas al corte y al plano', () => {
    const p = puerta5743('tgm');
    const r = calcularPuerta(p);
    const [superior, inferior] = r.piezas.filter(x => x.clase === 'pano');
    const raya = (y: number) => [p.margenMarcas, y, p.frente - p.margenMarcas, y];
    expect([superior.ancho, superior.alto]).toEqual([271, 101.5]);
    expect([inferior.ancho, inferior.alto]).toEqual([271, 118]);
    expect(superior.marcas).toContainEqual(raya(superior.alto - 9));
    expect(inferior.marcas).toContainEqual(raya(3));
    expect(inferior.marcas).toContainEqual(raya(9));
    expect(r.piezas.filter(x => x.clase === 'cacho')).toEqual([]);
    expect(r.piezas.filter(x => x.clase === 'entrada').map(x => [x.ancho, x.alto])).toEqual(Array(4).fill([271, 12]));
    const cristal = r.piezas.find(x => x.clase === 'cristal')!;
    expect(cristal).toMatchObject({ ancho: 271, alto: 39 });
    expect(superior.alto + inferior.alto + cristal.alto + 20 - 4).toBe(274.5);
    expect(r.piezas.find(x => x.clase === 'saco')).toMatchObject({ ancho: 277.5, alto: 46 });
    const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
    expect(lienzo.lineas).toContainEqual({ capa: 'ROTULADOR', x1: 0, y1: -4.5, x2: 271, y2: -4.5 });
    expect(lienzo.lineas.filter(x => x.capa === 'ejes').map(x => x.y1)).toEqual([-91, -138, -206, -244]);
    expect(lienzo.polilineas).toContainEqual({ capa: 'DISCO1', color: 5, cerrada: true,
      puntos: [[0, -134], [271, -134], [271, -95], [0, -95]] });
    const derivada = puertaTgmDerivada(p, enrolleTgm(p)!);
    expect(geometriaAlzado(derivada, r).formas).toContainEqual({
      tipo: 'rect', clase: 'puerta-cristal', x: 0, y: 97, ancho: 271, alto: 35,
    });
    const corte = generarCortePuertas(pedidoDe('AR2605743', p));
    expect(corte.resultados[0].piezas).toContainEqual({ ...cristal, id: `puerta-1:${cristal.id}` });
    expect(corte.avisos).toContainEqual(expect.objectContaining({ codigo: 'TUBOS_SOLAPAN', nivel: 'error' }));
    expect(corte.archivo).toBeNull();
  });

  it('pide los campos nuevos y comprueba las marcas manuales', () => {
    for (const [cambio, codigo] of [
      [{ bastillaArriba: null }, 'TGM_BASTILLA_ARRIBA'],
      [{ soldaduraEt: null }, 'TGM_SOLDADURA_ET'],
      [{ tubosManual: null }, 'TGM_COTAS_HOJA'],
    ] as const) {
      const p = puerta5743('tgm');
      const r = calcularPuerta({ ...p, tgm: { ...p.tgm!, ...cambio } });
      expect(r.piezas).toEqual([]);
      expect(r.avisos.map(a => a.codigo)).toContain(codigo);
    }
    const p = puerta5743('tgm');
    p.tgm!.tubosManual = [5, 6, 2060, 2440];
    const e = enrolleTgm(p)!;
    expect(e.colocacion.marcas).toEqual([5, 6, 2060, 2440]);
    expect(e.colocacion.avisos.map(a => a.codigo)).toEqual(expect.arrayContaining(['TUBOS_SOLAPAN', 'TUBO_SOBRE_PERFIL']));
  });

  it('propone 4,5 cm de bastilla y conserva los pasos si cambia el alto total', () => {
    const p = puerta5743('tgm');
    p.tgm!.bastillaArriba = undefined;
    expect(calcularPuerta(p).piezas.find(x => x.nombre === 'Paño superior')?.alto).toBe(101.5);
    p.tgm!.altoTotal = 280;
    expect(enrolleTgm(p)?.colocacion.marcas).toEqual([1010, 1480, 2160, 2540]);
  });

  it('conserva los campos del ventanal al abrir el pedido guardado', () => {
    const p = puerta5743('tgm');
    const pedido = pedidoDe('AR2605743', p);
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toMatchObject({
      elementos: [expect.objectContaining({ input: p })],
    });
  });
});
