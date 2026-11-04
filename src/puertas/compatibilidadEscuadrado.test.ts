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
// ARAUJO: actualizadas con la colocación legible del 04/11; el cálculo y las rayas del bot se conservan.
const casos = [
  ['5036', () => puertaPlanoReal('AR2605036'), '25a0a24ab3efa1a66c9f3d331a1fe07404ee2a088b9f044b90ca4bdd9bbe3d42'],
  ['apilable300', apilable, 'c847c5c7c96f2b9835a29a8ba556b80445a3e90b885cd1c57c34e19744d24b92'],
  ['apilable600', () => ({ ...apilable(), frente: 600 }), '9279ae19053a5106dcecc4b92936dab9289efa0927c5c12caf888e3440d4064d'],
  ['enrollable', puerta4638, 'b3f0040ff87496f9683a68a498164bbc44a073d153d81b6233430c785cb4d623'],
  ['autorreparable', autorreparable, '779d5a40a1b0c5003f86cc7513a939f4c823a694f482e2110ca0df4701ea8248'],
  ['araujo5365', araujo5365, 'b9aa45fad1304c729546c3e59c613202419dd61e737b6d160a18eca2c645facf'],
  ['araujo5733', araujo5733, '30d5bb0031cab37230b36b56ac70b2e10c2d42a7af42949cafc2550508474c00'],
] as const;

describe('el escuadrado del 5391 conserva las demás confecciones', () => {
  it.each(casos)('%s: mismas piezas, posiciones, rótulos y archivos', (id, crear, huella) => {
    const p = crear(), pedido = pedidoDe(id, p), r = calcularPuerta(p);
    const huellas = [hash(r), hash(geometriaAlzado(p, r)), hash(generarCortePuertas(pedido)),
      hash(escribirPlanoPuertas({ pedido, cabecera: { cliente: 'PRUEBA', tecnico: 'IVÁN', revisor: '', fecha: '04/11/2026' } }))];
    expect(hash(huellas.join(':'))).toBe(huella);
  });
});
