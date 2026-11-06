import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { geometriaAlzado } from './alzado.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { apilable, autorreparable, pedidoDe, puerta4638 } from './__fixtures__/ejemplos.ts';
import { puertaPlanoReal } from './__fixtures__/planosReales.ts';
import { araujo5365, araujo5733 } from './__fixtures__/araujo.ts';

const hash = (x: unknown) => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
// Huellas de main 3f3428e: cálculo, alzado de pantalla, corte completo y DXF del plano.
// 06/11/2026: el corte de las puertas sin «· CORTE» y con «CORTAR POR EL REVÉS» (Iván, AR2605429).
// ARAUJO: actualizadas con la colocación legible del 04/11; el cálculo y las rayas del bot se conservan.
const casos = [
  ['5036', () => puertaPlanoReal('AR2605036'), '480e4a512eb7fc020ed0c1ed5b77587e4df4bebaa4e97fbec86f3a1cc489ce03'],
  ['apilable300', apilable, '9e8f2053cf2de2958fe84c6a23b965a7cca2d9d09dd82a3aee4ebdd09271bc68'],
  ['apilable600', () => ({ ...apilable(), frente: 600 }), '0f196f78b1125fd4e028d95cdda1676c745990b8afe0a3d48e41c963b0f448d2'],
  ['enrollable', puerta4638, '63127fd170070e2d15f8991fde8d92d5a848eaf93c6602fc9569161424c709a5'],
  ['autorreparable', autorreparable, 'e5c452ab24aad6cc590e48d1d4bf1275468b52af3d24087336bdaf6548a43477'],
  ['araujo5365', araujo5365, '03b9bc58af363e9050beddf120226ff3cde437f70115f86a2c3159c78c75e4a1'],
  ['araujo5733', araujo5733, 'db9bb8c779fc383d4978db2c72ab2999061c526604c4790e075c13e6c7744a34'],
] as const;

describe('el escuadrado del 5391 conserva las demás confecciones', () => {
  it.each(casos)('%s: mismas piezas, posiciones, rótulos y archivos', (id, crear, huella) => {
    const p = crear(), pedido = pedidoDe(id, p), r = calcularPuerta(p);
    const huellas = [hash(r), hash(geometriaAlzado(p, r)), hash(generarCortePuertas(pedido)),
      hash(escribirPlanoPuertas({ pedido, cabecera: { cliente: 'PRUEBA', tecnico: 'IVÁN', revisor: '', fecha: '04/11/2026' } }))];
    expect(hash(huellas.join(':'))).toBe(huella);
  });
});
