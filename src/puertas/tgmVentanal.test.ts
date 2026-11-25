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
    const p = puerta5743();
    expect(marcasDesdeCotasTgm(p, cotas5743)).toEqual([850, 1320, 2000, 2380]);
    expect(marcasDesdeCotasTgm(p, [38, 68])).toBeNull();
    expect(marcasDesdeCotasTgm(p, [38, 68, 500])).toBeNull();
    const enrolle = enrolleTgm(p)!;
    expect(enrolle.colocacion.marcas).toEqual(p.tgm!.tubosManual);
    const derivada = puertaTgmDerivada(p, enrolle);
    expect(derivada.entradas.map(e => e.altura)).toEqual([185, 138, 70, 32]);
    expect(ventanalesEnrollable(derivada)[0]).toMatchObject({ desde: 85, D: 47, altoVisible: 35, altoCorte: 39 });
  });

  it('corta el plástico de lado a lado, conserva las cuatro E.T. y pasa las rayas al corte y al plano', () => {
    const p = puerta5743();
    const r = calcularPuerta(p);
    const [superior, inferior] = r.piezas.filter(x => x.clase === 'pano');
    const raya = (y: number) => [p.margenMarcas, y, p.frente - p.margenMarcas, y];
    expect([superior.ancho, superior.alto]).toEqual([271, 96]);
    expect([inferior.ancho, inferior.alto]).toEqual([271, 123]);
    expect(superior.marcas).toContainEqual(raya(91));
    expect(inferior.marcas).toContainEqual(raya(2));
    expect(inferior.marcas).toContainEqual(raya(5));
    expect(r.piezas.filter(x => x.clase === 'cacho')).toEqual([]);
    expect(r.piezas.filter(x => x.clase === 'entrada').map(x => [x.ancho, x.alto])).toEqual(Array(4).fill([271, 12]));
    expect(r.piezas.find(x => x.clase === 'cristal')).toMatchObject({ ancho: 271, alto: 39 });
    expect(r.piezas.find(x => x.clase === 'saco')).toMatchObject({ ancho: 277.5, alto: 46 });
    const { lienzo } = dibujarAlzadoEnrollable(p, 'A');
    expect(lienzo.lineas).toContainEqual({ capa: 'ROTULADOR', x1: 0, y1: 0, x2: 271, y2: 0 });
    expect(lienzo.lineas.filter(x => x.capa === 'ejes').map(x => x.y1)).toEqual([-85, -132, -200, -238]);
    expect(lienzo.polilineas).toContainEqual({ capa: 'DISCO1', color: 5, cerrada: true,
      puntos: [[0, -128], [271, -128], [271, -89], [0, -89]] });
    const derivada = puertaTgmDerivada(p, enrolleTgm(p)!);
    expect(geometriaAlzado(derivada, r).formas).toContainEqual({
      tipo: 'rect', clase: 'puerta-cristal', x: 0, y: 91, ancho: 271, alto: 35,
    });
    const corte = generarCortePuertas(pedidoDe('AR2605743', p));
    expect(JSON.stringify(corte)).toContain('Cristal del ventanal');
  });

  it('pide los campos nuevos y comprueba las marcas manuales', () => {
    for (const [cambio, codigo] of [
      [{ bastillaArriba: null }, 'TGM_BASTILLA_ARRIBA'],
      [{ trozoSaco: null }, 'TGM_TROZO_SACO'],
      [{ tubosManual: null }, 'TGM_COTAS_HOJA'],
    ] as const) {
      const p = puerta5743();
      const r = calcularPuerta({ ...p, tgm: { ...p.tgm!, ...cambio } });
      expect(r.piezas).toEqual([]);
      expect(r.avisos.map(a => a.codigo)).toContain(codigo);
    }
    const p = puerta5743();
    p.tgm!.tubosManual = [5, 6, 2000, 2380];
    const e = enrolleTgm(p)!;
    expect(e.colocacion.marcas).toEqual([5, 6, 2000, 2380]);
    expect(e.colocacion.avisos.map(a => a.codigo)).toEqual(expect.arrayContaining(['TUBOS_SOLAPAN', 'TUBO_SOBRE_PERFIL']));
  });

  it('conserva los campos del ventanal al abrir el pedido guardado', () => {
    const p = puerta5743();
    const pedido = pedidoDe('AR2605743', p);
    expect(leerPedidoPuertas(JSON.parse(JSON.stringify(pedido)))).toMatchObject({
      elementos: [expect.objectContaining({ input: p })],
    });
  });
});
