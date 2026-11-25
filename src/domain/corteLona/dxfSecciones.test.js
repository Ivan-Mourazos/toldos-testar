import { describe, expect, it } from 'vitest';
import { paresDxf, registrosDxf } from './dxfTestHelpers.js';

describe('Lectura de un DXF por secciones', () => {
  it.each(['\n', '\r\n'])('respeta los pares aunque otra sección tenga un nombre igual (%j)', salto => {
    const dxf = ['0', 'SECTION', '2', 'TABLES', '0', 'BLOCK_RECORD', '2', 'ENTITIES', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES', '0', 'TEXT', '1', '0', '2', 'ENDSEC', '0', 'ENDSEC', '0', 'EOF'].join(salto);
    expect(registrosDxf(dxf)).toEqual([{ tipo: 'TEXT', pares: [[1, '0'], [2, 'ENDSEC']] }]);
  });

  it('conserva la lectura histórica cuando falta la sección pedida', () => {
    const dxf = '0\nSECTION\n2\nENTITIES\n0\nTEXT\n1\nUna nota\n0\nENDSEC\n0\nEOF';
    expect(registrosDxf(dxf, 'BLOCKS')).toEqual([
      { tipo: 'SECTION', pares: [[2, 'ENTITIES']] },
      { tipo: 'TEXT', pares: [[1, 'Una nota']] },
    ]);
  });

  it('lee el último par completo sin salto y descarta un código sin valor', () => {
    expect(paresDxf('  1\r\n Texto ')).toEqual([[1, 'Texto']]);
    const dxf = '0\r\nSECTION\r\n2\r\nENTITIES\r\n0\r\nTEXT\r\n1\r\nNota';
    const registros = [{ tipo: 'TEXT', pares: [[1, 'Nota']] }];
    expect(registrosDxf(dxf)).toEqual(registros);
    expect(registrosDxf(`${dxf}\r\n 20`)).toEqual(registros);
  });
});
