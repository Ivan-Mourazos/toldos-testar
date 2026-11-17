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
  ['5036', () => puertaPlanoReal('AR2605036'), 'fd60c3ab454370aee468c52b645feff733c3bce77f9b4c863cda3e8529115fcb', 'da9c7830d226ebf17aae5cf57698213548707fa9c6403e4d3891a5e0c6ae78c4'],
  ['apilable300', apilable, '3d8cdaeaff787ba2ea2ff776c8a2fe33ad08f23814f7c6e8457c8561d41e7791', '6d3634ce2deed8338cc332d0df848f57e65835aca73c5ce48eff5858811475b3'],
  ['apilable600', () => ({ ...apilable(), frente: 600 }), '6b3c11c9305dabb7c9dda3b5dee3072e8ec3b2a2e5e3a2abc7d45fddaee35222', '495b60b334a5482b0d6789cc36f6d5bfc466e67d46bf18a2c034eba8a7dada68'],
  ['enrollable', puerta4638, '441ff7331d85ebbc0de71f08224fcdb9d7bf35f39638b6228f2d86f4b3b6abf1', 'f8476155b98734d1f1ffecea8f7b3ff0b02169437b5dd1808f02e894ed4bc2f9'],
  ['autorreparable', autorreparable, 'cb8915f567187f8cd4467df4e5666cfa286ced7008a17399f49d6a7151fc7d56', 'e8d3f5effef53665edaddb5b190295cd963853b7b786e7768f09a217c2411762'],
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
