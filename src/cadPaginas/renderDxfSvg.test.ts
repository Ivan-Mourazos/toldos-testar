import { describe, expect, it } from 'vitest';
import { colorSobreBlanco, giroEntidadTexto, renderizarPaginasDxf } from './renderDxfSvg.ts';
import { pedidoVariasTelas } from '../domain/corteLona/fixtures/variasTelas.js';
import { generarCorteLona } from '../domain/corteLona/index.js';

function dxfConPresentaciones({
  capas = [],
  bloques = [],
  entidades = [],
  objetos = []
}: {
  capas?: string[];
  bloques?: string[];
  entidades?: string[];
  objetos?: string[];
}) {
  return [
    '0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LAYER',
    '0', 'LAYER', '5', 'L0', '2', '0', '70', '0', '62', '7', '290', '1',
    '0', 'LAYER', '5', 'L1', '2', 'ROTULADOR', '70', '0', '62', '1', '290', '1',
    '0', 'LAYER', '5', 'L2', '2', 'CUTTER', '70', '0', '62', '112', '290', '1',
    '0', 'LAYER', '5', 'L3', '2', 'taladro', '70', '0', '62', '160', '290', '1',
    '0', 'LAYER', '5', 'L4', '2', 'texto', '70', '0', '62', '106', '290', '1',
    '0', 'LAYER', '5', 'L5', '2', 'RECUADROS', '70', '0', '62', '30', '290', '0',
    ...capas,
    '0', 'ENDTAB',
    '0', 'TABLE', '2', 'BLOCK_RECORD',
    '0', 'BLOCK_RECORD', '5', 'BR_MODEL', '2', '*Model_Space',
    '0', 'BLOCK_RECORD', '5', 'BR_P0', '2', '*Paper_Space',
    '0', 'BLOCK_RECORD', '5', 'BR_P1', '2', '*Paper_Space0',
    '0', 'ENDTAB',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'BLOCKS',
    ...bloques,
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    ...entidades,
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'OBJECTS',
    ...objetos,
    '0', 'ENDSEC',
    '0', 'EOF'
  ].join('\n');
}

describe('colores ACI de la oficina sobre fondo blanco', () => {
  it('mantiene fieles los colores de capa de oficina y pasa ACI 7 a tinta negra', () => {
    expect(colorSobreBlanco(7)).toBe('#111111');
    expect(colorSobreBlanco(1)).toBe('#ff0000');   // ROTULADOR
    expect(colorSobreBlanco(112)).toBe('#00a552'); // CUTTER
    expect(colorSobreBlanco(160)).toBe('#003fff'); // taladro
    expect(colorSobreBlanco(106)).toBe('#004c13'); // texto
  });

  it('oscurece colores demasiado claros (amarillo ACI 2, blanco 255) para que se lean sobre blanco', () => {
    expect(colorSobreBlanco(2)).not.toBe('#ffff00');
    expect(colorSobreBlanco(255)).not.toBe('#ffffff');
    expect(colorSobreBlanco(7, 0x1a5fb4)).toBe('#1a5fb4');
  });
});

describe('giro exacto de TEXT y MTEXT (códigos 50, 11/21 y 101)', () => {
  it('respeta código 50 en TEXT y se detiene antes de 101 (Embedded Object)', () => {
    const giro = giroEntidadTexto({
      type: 'TEXT',
      pairs: [[10, '10'], [20, '20'], [40, '3'], [50, '90'], [101, 'Embedded Object'], [50, '180']]
    });
    expect(giro).toBe(90);
  });

  it('en MTEXT ignora 11/21 después de 101 (caso AR2605701 de ZWCAD)', () => {
    const giro = giroEntidadTexto({
      type: 'MTEXT',
      pairs: [
        [10, '10'], [20, '20'], [40, '2.5'],
        [50, '45'],
        [101, 'Embedded Object'],
        [11, '100'], [21, '0']
      ]
    });
    expect(giro).toBe(45);
  });

  it('en MTEXT usa el último 50 o vector 11/21 antes de 101', () => {
    const giro = giroEntidadTexto({
      type: 'MTEXT',
      pairs: [[10, '0'], [20, '0'], [40, '2'], [50, '15'], [11, '0'], [21, '-1'], [101, 'Embedded Object']]
    });
    expect(giro).toBeCloseTo(-90, 5);
  });
});

describe('renderizarPaginasDxf', () => {
  it('renderiza varias presentaciones ordenadas con fondo blanco, viewports, textos girados y colores ACI', () => {
    const src = dxfConPresentaciones({
      bloques: [
        // Bloque girado con un texto dentro
        '0', 'BLOCK', '2', 'SELLO', '10', '0', '20', '0',
        '0', 'TEXT', '8', '0', '10', '1', '20', '1', '40', '2', '50', '30', '1', 'ETIQUETA',
        '0', 'ENDBLK',
        // Segunda presentación en *Paper_Space0
        '0', 'BLOCK', '2', '*Paper_Space0', '10', '0', '20', '0',
        '0', 'TEXT', '67', '1', '8', 'texto', '10', '20', '20', '20', '40', '4', '50', '0', '1', 'HOJA DOS',
        '0', 'ENDBLK'
      ],
      entidades: [
        // Modelo: línea roja en ROTULADOR, línea verde en CUTTER, línea en RECUADROS (no imprime) y MTEXT girado 90° con 101
        '0', 'LINE', '8', 'ROTULADOR', '10', '0', '20', '0', '11', '2', '21', '0',
        '0', 'LINE', '8', 'CUTTER', '10', '0', '20', '1', '11', '2', '21', '1',
        '0', 'LINE', '8', 'RECUADROS', '10', '-1', '20', '-1', '11', '3', '21', '2',
        '0', 'MTEXT', '8', 'texto', '10', '1', '20', '0.5', '40', '0.2', '71', '5', '50', '90', '1', 'CORTE VERTICAL', '101', 'Embedded Object', '11', '50', '21', '0',
        // Papel de *Paper_Space: viewport hoja (id 1), viewport modelo (id 2), cajetín y bloque girado 60°
        '0', 'VIEWPORT', '5', 'VP1', '67', '1', '69', '1', '68', '1', '10', '148.5', '20', '105', '40', '300', '41', '220', '45', '220',
        '0', 'VIEWPORT', '5', 'VP2', '67', '1', '69', '2', '68', '2', '10', '100', '20', '100', '40', '120', '41', '80', '12', '1', '22', '0.5', '17', '0', '27', '0', '45', '4', '51', '0',
        '0', 'TEXT', '67', '1', '8', '0', '10', '200', '20', '15', '40', '3', '50', '0', '1', 'CAJETIN AR2600001',
        '0', 'INSERT', '67', '1', '8', 'taladro', '2', 'SELLO', '10', '50', '20', '50', '50', '60'
      ],
      objetos: [
        '0', 'LAYOUT', '1', 'TOLDO B', '71', '2', '330', 'BR_P1', '331', 'VP_B1', '10', '0', '20', '0', '11', '297', '21', '210',
        '0', 'LAYOUT', '1', 'TOLDO A', '71', '1', '330', 'BR_P0', '331', 'VP1', '10', '0', '20', '0', '11', '297', '21', '210'
      ]
    });

    const paginas = renderizarPaginasDxf(src);
    expect(paginas.map(p => p.nombre)).toEqual(['TOLDO A', 'TOLDO B']);

    const p1 = paginas[0];
    expect(p1.anchoMm).toBe(297);
    expect(p1.altoMm).toBe(210);
    // Fondo blanco explícito
    expect(p1.svg).toContain('fill="#ffffff"');
    // Colores ACI de la oficina: ROTULADOR (#ff0000), CUTTER (#00a552), texto (#004c13), taladro (#003fff), cajetín (#111111)
    expect(p1.svg).toContain('stroke="#ff0000"');
    expect(p1.svg).toContain('stroke="#00a552"');
    expect(p1.svg).toContain('fill="#004c13"');
    expect(p1.svg).toContain('fill="#003fff"');
    expect(p1.svg).toContain('CAJETIN AR2600001');
    // Texto girado 90° en CAD -> rotate(-90) en SVG (ignorando 11/21 tras 101)
    expect(p1.svg).toContain('rotate(-90)');
    expect(p1.svg).toContain('CORTE VERTICAL');
    // Bloque girado 60° + texto interno 30° -> 90° -> rotate(-90)
    expect(p1.svg).toContain('ETIQUETA');
    // Capa no imprimible (RECUADROS, 290=0) no aparece (color 30 -> #ff7f00 o derivado)
    expect(p1.svg).not.toContain('#ff7f00');

    expect(paginas[1].svg).toContain('HOJA DOS');
  });

  it('renderiza un plano real generado por generarCorteLona con sus presentaciones y sin entidades desconocidas', () => {
    const calcular = generarCorteLona as (o: unknown, opciones: unknown) => { plano: Array<{ dxf: string }> };
    const res = calcular({ ...pedidoVariasTelas(), orderCode: 'AR2600096' }, { ofStockSacos: '0230811' });
    const paginas = renderizarPaginasDxf(res.plano[0].dxf);
    expect(paginas.length).toBeGreaterThanOrEqual(1);
    expect(paginas[0].svg).toContain('<svg ');
    expect(paginas[0].svg).toContain('fill="#ffffff"');
    expect(paginas[0].svg).toContain('AR2600096');
    expect(paginas[0].svg).toContain('CORTE');
    expect(paginas[0].sinDibujar).toEqual({});
  });
});
