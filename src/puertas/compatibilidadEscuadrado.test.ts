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
  ['5036', () => puertaPlanoReal('AR2605036'), 'b57ce1e0009ce0e94569cbf0a7f28e56799c7897002611139b4275f8c25ddc67', 'aa5aee411959167812ce42fd29ee976acadf0ee43d42a069f913464c408f8169'],
  ['apilable300', apilable, 'ef12077f398bfdb0cc721549a9390012659c2cbe90a64edb453b662157b1673d', '90227bce6fbd40b625a044b22e1f59fcfc8e5a71d432d2ab54d68759a91b8c9f'],
  ['apilable600', () => ({ ...apilable(), frente: 600 }), '39ab08c5e4c3093cad07f9bc860cb22f54f81dab038bcbaae776b9efc0001b03', '266a2a5635d41b41a59161a3f49d723da7f4b970c1f4988596a80cb2e45b4f48'],
  // 19/11/2026: el cálculo de la enrollable de ejemplo lleva el aviso ET_FALTA (una sola E.T.); bot y plano, iguales.
  ['enrollable', puerta4638, '6462b323bae25334a08edcf715c13cfd26eb103b845effae8aa9f58f7fd32d36', '9ce02b80e3990e29839f58c8b7a38d61f68297a50b7ba2b6f0b68170ee258ed9'],
  ['autorreparable', autorreparable, 'c4049e83324efb5d2b01d0cad8e5cd982baedd06ec4e5e4f895c12a22a8ca79f', '63412d67292406654da9cffd6630e38ebe3dc4f434f184bbe4966f5f72277846'],
  ['araujo5365', araujo5365, 'b8829583cd5c41ed9ba1c134de92c9f5debb7ed401d63088c87285e17493b648', '1c38a9a287a6cbedd1402b02c131aae5adbde61c690c4ae4bd7a23b1135df180'],
  ['araujo5733', araujo5733, 'ac0df5d734e0055d8c2157ef504ff41590b2faff32bd0113bd087c973b48bb8d', '37317a5f38aba560097c6507ec2b4f05e9959a18bc926785893a274f5793811b'],
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
