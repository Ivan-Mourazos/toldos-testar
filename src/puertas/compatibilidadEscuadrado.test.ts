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
  ['5036', () => puertaPlanoReal('AR2605036'), '695a334f459471c49469e9bcd2338d02a67c6da123c14fdd924138b8718c7837', 'da9c7830d226ebf17aae5cf57698213548707fa9c6403e4d3891a5e0c6ae78c4'],
  ['apilable300', apilable, '969d8b9e13edb988fff3aa1f40670d9bb91149c68e6468e47895766e2b7314b7', '6d3634ce2deed8338cc332d0df848f57e65835aca73c5ce48eff5858811475b3'],
  ['apilable600', () => ({ ...apilable(), frente: 600 }), '255928675d1f035c8d591f20aa605aa45c311ce990be9d169100906b8b5035d6', '495b60b334a5482b0d6789cc36f6d5bfc466e67d46bf18a2c034eba8a7dada68'],
  ['enrollable', puerta4638, '126c87945822aec3e46c330ffbdc5d78d2a22e05dc95f871c5543a1e3c51a737', 'f8476155b98734d1f1ffecea8f7b3ff0b02169437b5dd1808f02e894ed4bc2f9'],
  ['autorreparable', autorreparable, 'aecd5f0ec78d75d55724e569df79108cfe7fa7f097d9a4c80e6c5005c172a896', 'e8d3f5effef53665edaddb5b190295cd963853b7b786e7768f09a217c2411762'],
  ['araujo5365', araujo5365, '03b9bc58af363e9050beddf120226ff3cde437f70115f86a2c3159c78c75e4a1', '3d1f6373804ed8a8c41e82625c2912435b1784e04c20fb10dd6ef92c85afd3ba'],
  ['araujo5733', araujo5733, 'db9bb8c779fc383d4978db2c72ab2999061c526604c4790e075c13e6c7744a34', '521ad19fd1eb262215ed7d037e144a0f372b4aad0899715e7a755fb707d1de72'],
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
