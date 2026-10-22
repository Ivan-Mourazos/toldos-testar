import { describe, expect, it } from 'vitest';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { pedidoDe } from './__fixtures__/ejemplos.ts';
import { puertaPlanoReal, referenciasPlano } from './__fixtures__/planosReales.ts';
import { geometriaAlzado, type TextoAlzado } from './alzado.ts';
import { calcularPuerta } from './calcular.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { generarCortePuertas } from './corte.ts';

const cabecera = { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' };
const dibujo = (pedido: string) => {
  const p = puertaPlanoReal(pedido);
  const g = geometriaAlzado(p, calcularPuerta(p));
  return { p, g, textos: g.formas.filter((f): f is TextoAlzado => f.tipo === 'texto') };
};

describe('Plano de oficina: referencias de pedido y zona en planosReales.ts', () => {
  it.each([
    ['AR2605036', 186, 277],
    ['AR2604904', 208.5, 300],
  ] as const)('%s: A1 identifica arriba y A2 abajo también en el corte, como en el plano real', (pedido, altoArriba, altoAbajo) => {
    const p = puertaPlanoReal(pedido), cortes = generarCortePuertas(pedidoDe(pedido, p)).cortes;
    const lona = cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'pano'))!;
    for (const [codigo, alto] of [['A1', altoArriba], ['A2', altoAbajo]] as const) {
      const rotulo = lona.entidades.textos.find(t => t.valor === codigo)!;
      expect(rotulo).toBeDefined();
      const pieza = lona.colocadas.find(t => t.pieza.clase === 'pano' && rotulo.x > t.x && rotulo.y > t.y
        && rotulo.x < t.x + (t.girada ? t.pieza.alto : t.pieza.ancho) * 10
        && rotulo.y < t.y + (t.girada ? t.pieza.ancho : t.pieza.alto) * 10);
      expect(pieza?.pieza.alto).toBe(alto);
    }
  });
  it.each(['AR2604638', 'AR2604725'])('%s: rótulos separados grandes, dos AL CORTE verticales y cristal sin leyenda', pedido => {
    const { textos } = dibujo(pedido);
    for (const t of ['A1', 'REVÉS', puertaPlanoReal(pedido).of]) {
      const rotulo = textos.find(f => f.lineas.length === 1 && f.lineas[0] === t);
      expect(rotulo?.tamano).toBe(pedido === 'AR2604638' ? 20 : 30);
    }
    expect(textos.filter(t => t.lineas[0] === 'AL CORTE' && t.giro === -90)).toHaveLength(2);
    expect(textos.some(t => /^CRISTAL.*CM/.test(t.lineas.join(' ')))).toBe(false);
    expect(textos.find(t => t.lineas.join(' ') === 'DE ESTE LADO PISAR LAS E.T. 1 CM')).toMatchObject({ giro: -90, tamano: 10 });
    expect(textos.some(t => t.lineas.join(' ') === 'SOLDAR SACO NEGRO 2 CM MÁXIMO')).toBe(true);
  });

  it('AR2605065: los dos ventanales comparten el eje, pero tienen sus propias medidas', () => {
    const { g } = dibujo('AR2605065');
    expect(g.formas.filter(f => f.tipo === 'rect' && f.clase === 'puerta-cristal')).toMatchObject([
      { x: 8, y: 212.75, ancho: 198, alto: 52.5 },
      { x: 8, y: 272.75, ancho: 198, alto: 63.5 },
    ]);
    expect(g.formas.some(f => f.tipo === 'rect' && f.clase === 'puerta-entrada-alzado' && f.y === 265.25)).toBe(true);
  });

  it('AR2605036: filas de ventanas, cintas y bolsillo con sus cotas DIMENSION y estilos', () => {
    const { p, textos } = dibujo('AR2605036');
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2605036', p), cabecera });
    const cotas = registrosDxf(dxf).filter(r => r.tipo === 'DIMENSION');
    expect(registrosDxf(dxf).filter(r => r.tipo === 'ARC' && valor(r, 8) === 'referencias' && Math.abs(numero(r, 40) - .02) < 1e-6)).toHaveLength(24);
    // AR2605036: la cabecera de 70 lleva el estilo grande; las entradas de 12, XERAL.
    expect(cotas.some(r => numero(r, 42) === 70 && valor(r, 3) === 'XERA 15')).toBe(true);
    expect(cotas.some(r => numero(r, 42) === 12 && valor(r, 3) === 'XERAL')).toBe(true);
    for (const medida of [53, 146, 38, 29, 6, 23, 12, 171, 172, 24]) {
      expect(cotas.some(r => Math.abs(numero(r, 42) - medida) < 0.01 && valor(r, 3) === 'XERAL 5'), `cota ${medida}`).toBe(true);
    }
    expect(textos.filter(t => t.lineas[0] === 'E.T Ø30 mm' && t.tamano === 8)).toHaveLength(9);
    for (const ancho of [10, 15]) expect(textos.some(t => t.lineas.join(' ') === `REFUERZO DE ${ancho}CM A 10CM DEL BORDE SOLDADO LONA DE 2MM`)).toBe(true);
  });

  it('AR2604904: instrucciones de entrada, guías verticales, empate y saco', () => {
    const { textos } = dibujo('AR2604904');
    for (const t of ['E.T POR DELANTE Y POR DETRÁS CORTADA DE 21', 'E.T 5,5 cms MAS LARGAS EN CADA LADO', 'EMPATE 2cm', 'SACO DE 120', 'SACO 900 GR AMARILLO/NEGRO', 'CREMALLERA SOLDADA HASTA MITAD DE SACO']) {
      expect(textos.some(f => f.lineas.join(' ') === t), t).toBe(true);
    }
    expect(textos.some(t => t.lineas[0] === 'CREMALLERA ESPECIAL PORTANOVA' && Math.abs(t.giro ?? 0) === 90 && t.tamano === 8)).toBe(true);
  });

  it.each(referenciasPlano)('$pedido: cotas editables sin letras D/T y marcas rojas con triangulito', ({ pedido }) => {
    const { p, g } = dibujo(pedido);
    const ent = registrosDxf(escribirPlanoPuertas({ pedido: pedidoDe(pedido, p), cabecera }));
    expect(ent.some(r => r.tipo === 'DIMENSION' && numero(r, 42) === p.frente)).toBe(true);
    expect(ent.filter(r => r.tipo === 'MTEXT' && ['D', 'T'].includes(valor(r, 1) ?? ''))).toHaveLength(0);
    expect(g.formas.some(f => f.tipo === 'polilinea' && f.clase === 'puerta-rotulador' && f.puntos.length >= 4)).toBe(true);
    expect(ent.some(r => valor(r, 8) === 'ROTULADOR' && r.tipo === 'LINE' && numero(r, 20) > 90)).toBe(true);
    if (pedido === 'AR2605065') expect(ent.some(r => r.tipo === 'MTEXT' && valor(r, 8) === 'ROTULADOR' && valor(r, 1) === 'a1' && numero(r, 40) === .01)).toBe(true);
  });

  it('El corte solo acota el ancho usado de cada material y lleva su título encima', () => {
    const p = puertaPlanoReal('AR2604638'), pedido = pedidoDe('AR2604638', p);
    const cortes = generarCortePuertas(pedido).cortes;
    const ent = registrosDxf(escribirPlanoPuertas({ pedido, cabecera }));
    const cotasCorte = ent.filter(r => r.tipo === 'DIMENSION' && numero(r, 23) < 95);
    for (const c of cortes) {
      const alto = Math.max(...c.colocadas.map(t => (t.y + (t.girada ? t.pieza.ancho : t.pieza.alto) * 10) / 10));
      expect(cotasCorte.some(r => Math.abs(numero(r, 42) - alto) < 0.01)).toBe(true);
    }
    expect(ent.some(r => r.tipo === 'MTEXT' && valor(r, 1) === 'TRANSP. 1000MI')).toBe(true);
    const cristal = cotasCorte.find(r => Math.abs(numero(r, 42) - 164) < .01)!;
    expect(cristal).toBeDefined();
    expect(ent.some(r => r.tipo === 'LINE' && valor(r, 8) === 'referencias'
      && numero(r, 20) === numero(cristal, 23) && numero(r, 21) === numero(cristal, 23)
      && Math.abs(numero(r, 11) - numero(r, 10)) === Math.abs(numero(cristal, 14) - numero(cristal, 13)))).toBe(true);
  });
});
