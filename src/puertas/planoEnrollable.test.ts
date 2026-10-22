import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { escribirDxfPlano } from '../domain/corteLona/presentacion.js';
import { apilable, autorreparable, base, pedidoDe } from './__fixtures__/ejemplos.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';

const cabecera = { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' };
const puerta = () => ({ ...base('PUERTAENR', 212, 360), of: '0233175', cantidad: 3,
  observaciones: 'OBSERVACIÓN RPS QUE NO SE IMPRIME',
  entradas: [60, 131, 191].map(altura => ({ altura, diametro: 30 as const, largo: 212, alto: 8, huecos: [] })),
  enrollable: { T: 169, D: 60, margen: 6, empates: [] } });
const plano = () => escribirPlanoPuertas({ pedido: pedidoDe('AR2605134', puerta()), cabecera });
const modelo = (dxf: string) => registrosDxf(dxf).filter(r => valor(r, 67) !== '1');

describe('Plano de enrollables según el DWG de Iván AR2605134', () => {
  it('dibuja los paños y los solapes en DISCO1, las tres cabeceras y tres FLECHA2 de la oficina', () => {
    const ent = modelo(plano()).filter(r => numero(r, 10) < 105 && numero(r, 20) > 95);
    const horizontales = (capa: string, largo: number) => ent.filter(r => r.tipo === 'LINE' && valor(r, 8) === capa
      && Math.abs(Math.abs(numero(r, 11) - numero(r, 10)) - largo) < 1e-6 && numero(r, 20) === numero(r, 21));
    expect(horizontales('DISCO1', 2.12).map(r => numero(r, 20))).toContain(100.035);
    expect(horizontales('referencias', 2.12).map(r => numero(r, 20))).toContain(100);
    expect(horizontales('ROTULADOR', 2.12).map(r => numero(r, 20))).toContain(99.965);
    expect(ent.filter(r => r.tipo === 'INSERT' && valor(r, 2) === 'FLECHA2' && valor(r, 8) === 'ROTULADOR')).toHaveLength(3);
    const cajas = ent.filter(r => r.tipo === 'LWPOLYLINE' && valor(r, 8) === 'DISCO1').map(r => {
      const pares = r.pares as Array<[number, string]>;
      const xs = pares.filter(([k]) => k === 10).map(([, x]) => Number(x));
      const ys = pares.filter(([k]) => k === 20).map(([, y]) => Number(y));
      return [Math.round((Math.max(...xs) - Math.min(...xs)) * 1000) / 10,
        Math.round((Math.max(...ys) - Math.min(...ys)) * 1000) / 10];
    });
    expect(cajas).toContainEqual([204, 56.5]);
    expect(cajas.filter(c => c[0] === 7 && c[1] === 56.5)).toHaveLength(2);
    expect(modelo(plano()).filter(r => r.tipo === 'HATCH' && valor(r, 8) === 'referencia-1')).toHaveLength(2);
    expect(horizontales('ejes', 2.12)).toHaveLength(3);
    expect(horizontales('borrar', 2.12)).toHaveLength(1);
  });

  it('conserva las instrucciones, las notas y el detalle sin títulos ni observaciones de RPS', () => {
    const dxf = plano();
    for (const texto of ['MATERIALES:', 'TRANSP. 1000MI', 'LAC 900 AZUL 5002', 'LAC 900 NEGRO',
      'SOLDAR SACO Y E.T EN LA MISMA SOLDADURA', 'BOLSILLO NEGRO', '1 CM',
      'LAS ENTRADAS DE TUBO INTERIORES DE LAS PUERTAS ENROLLABLES TIENEN QUE IR DE 5 CM.',
      'NO PONER NUNCA LAS ETIQUETAS EN LA PROPIA LONA', 'AL CORTE', 'COSER VELCRO', '0233175']) expect(dxf.includes(texto), texto).toBe(true);
    for (const texto of ['PUERTA A ·', 'CORTE ·', 'OBSERVACIÓN RPS', 'CERRAR E.T']) expect(dxf.includes(texto), texto).toBe(false);
    const ent = registrosDxf(dxf);
    expect(ent.filter(r => r.tipo === 'INSERT' && valor(r, 67) === '1' && valor(r, 2) === 'CAJETIN WEB')).toHaveLength(1);
    expect(ent.filter(r => r.tipo === 'INSERT' && valor(r, 67) === '1' && valor(r, 2) === 'CAJETIN')).toHaveLength(0);
    const alzado = modelo(dxf).filter(r => numero(r, 10) < 105 && numero(r, 20) > 95);
    for (const texto of ['X3', 'A1', 'A2', 'REVÉS', '0233175']) expect(alzado.some(r => valor(r, 1) === texto)).toBe(true);
  });

  it('encuadra el alzado a toda la izquierda y el corte arriba a la derecha, por encima del cajetín web', () => {
    const vistas = registrosDxf(plano()).filter(r => r.tipo === 'VIEWPORT' && numero(r, 69) > 1);
    const izquierda = vistas.find(r => numero(r, 69) === 2)!;
    const derecha = vistas.find(r => numero(r, 69) === 3)!;
    expect(numero(izquierda, 40)).toBeGreaterThan(140);
    expect(numero(izquierda, 41)).toBeGreaterThan(170);
    expect(numero(izquierda, 10)).toBeLessThan(100);
    expect(numero(derecha, 10)).toBeGreaterThan(210);
    expect(numero(derecha, 20) - numero(derecha, 41) / 2).toBeGreaterThan(90);
  });

  it('acota el saco, el cristal y la lona según el corte recibido, sin fijar su colocación', () => {
    const pedido = pedidoDe('AR2605134', puerta());
    const corte = generarCortePuertas(pedido).cortes;
    const ent = registrosDxf(escribirPlanoPuertas({ pedido, cabecera }));
    const medidas = ent.filter(r => r.tipo === 'DIMENSION').map(r => numero(r, 42));
    for (const medida of [218.5, 26, 204, 56.5, 300]) expect(medidas).toContain(medida);
    for (const c of corte.filter(c => c.colocadas.some(t => t.pieza.clase === 'pano'))) expect(medidas).toContain(c.largo / 10);
    // El transparente conserva el multiplicador del bot aunque solo se anide una muestra.
    const muestras = modelo(escribirPlanoPuertas({ pedido, cabecera })).filter(r => numero(r, 10) >= 110 && numero(r, 20) > 87);
    expect(muestras.filter(r => r.tipo === 'MTEXT' && valor(r, 1) === 'X3')).toHaveLength(2);
    expect(muestras.some(r => r.tipo === 'LWPOLYLINE' && valor(r, 8) === 'DISCO1' && numero(r, 62) === 5)).toBe(true);
  });
});

describe('Regresión: resultados completos anteriores al plano específico de enrollables', () => {
  it.each([
    ['apilable', apilable, 'bb8e4835b0d00e4e35227f0344bd71f1c69d6bc9775ccf98df5f73e066a30262'],
    ['autorreparable', autorreparable, 'ace51b8a5327add6503ec4c195ce3c2cb12ffced66919332ceda3f424c0a356a'],
  ] as const)('%s conserva el DXF byte por byte', (_, crear, hash) => {
    expect(createHash('sha256').update(escribirPlanoPuertas({ pedido: pedidoDe('AR2600001', crear()), cabecera })).digest('hex')).toBe(hash);
  });
  it('la presentación de toldos conserva su resultado byte por byte', () => {
    const vacio = { lineas: [], polilineas: [], textos: [], cotas: [] };
    const toldo = { ...vacio, lineas: [{ capa: 'corte', x1: 10, y1: 10, x2: 14, y2: 12 }],
      corte: { ...vacio, lineas: [{ capa: 'DISCO1', x1: 20, y1: 20, x2: 23, y2: 22 }] },
      zonas: { toldos: { x0: 9, y0: 9, x1: 15, y1: 13 }, corte: { x0: 19, y0: 19, x1: 24, y1: 23 } } };
    const dxf = escribirDxfPlano(toldo, { pedido: 'AR2600001', of: '0232309', ...cabecera, fecha: '22/10/26', pagina: '1/1', material: 'LAC900 BLANCO' }).dxf;
    expect(createHash('sha256').update(dxf).digest('hex')).toBe('8526b3281469e689cb379271c33fe6edcb9c370b62543ba809bf5c898bdb27b6');
  });
});
