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
// 09/11: solo cambia la huella del plano A4; cálculo, alzado y bot fijados por separado.
// Huellas de main 3f3428e: cálculo, alzado de pantalla, corte completo y DXF del plano.
// 06/11/2026: el corte de las puertas sin «· CORTE» y con «CORTAR POR EL REVÉS» (Iván, AR2605429).
// ARAUJO: actualizadas con la colocación legible del 04/11; el cálculo y las rayas del bot se conservan.
const casos = [
  ['5036', () => puertaPlanoReal('AR2605036'), '05dcc329fac3f6683edc4fc918d5c6d4aae5a5ee20cb4a17ef34ea14128c8778', '9a087f9fc922af730998e773dde15cd969e439cb99b24608279152cdd140f597'],
  ['apilable300', apilable, '890f5f2d4b6dd71194a14632721841eef51c9a1f7f0d43cb0bff0698fdbb989a', '5905ce580cfe6d7f6fa83368e62003ec603986e1f365e765e0546e757ee47013'],
  ['apilable600', () => ({ ...apilable(), frente: 600 }), 'c0ffe409c37e19b8963ab1ef0e3a8b86fb5f8b262dea365e34762c37a0c579a8', '266a2a5635d41b41a59161a3f49d723da7f4b970c1f4988596a80cb2e45b4f48'],
  ['enrollable', puerta4638, '441ff7331d85ebbc0de71f08224fcdb9d7bf35f39638b6228f2d86f4b3b6abf1', 'f8476155b98734d1f1ffecea8f7b3ff0b02169437b5dd1808f02e894ed4bc2f9'],
  ['autorreparable', autorreparable, 'cb8915f567187f8cd4467df4e5666cfa286ced7008a17399f49d6a7151fc7d56', 'e8d3f5effef53665edaddb5b190295cd963853b7b786e7768f09a217c2411762'],
  ['araujo5365', araujo5365, '76588b25f63bfb97386800bd6aee15464125eebb0077b37247f998f9fefa931a', '3d1f6373804ed8a8c41e82625c2912435b1784e04c20fb10dd6ef92c85afd3ba'],
  ['araujo5733', araujo5733, '2fa6c52c8aad5513fb09535aa22de8bf1e1576f419740ec84084dfeffe0d8395', '521ad19fd1eb262215ed7d037e144a0f372b4aad0899715e7a755fb707d1de72'],
] as const;

describe('el escuadrado del 5391 conserva las demás confecciones', () => {
  it.each(casos)('%s: mismas piezas, posiciones, rótulos y archivos', (id, crear, huella, core) => {
    const p = crear(), pedido = pedidoDe(id, p), r = calcularPuerta(p);
    const huellas = [hash(r), hash(geometriaAlzado(p, r)), hash(generarCortePuertas(pedido)),
      hash(escribirPlanoPuertas({ pedido, cabecera: { cliente: 'PRUEBA', tecnico: 'IVÁN', revisor: '', fecha: '04/11/2026' } }))];
    expect(hash(huellas.slice(0, 3).join(':'))).toBe(core);
    expect(hash(huellas.join(':'))).toBe(huella);
  });
});
