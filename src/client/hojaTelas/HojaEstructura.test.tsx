import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { altoFilaDespiece, HojaEstructura } from './HojaEstructura';
import { contarPaginas, HojasTelas } from './HojaTelas';
import type { FilaDespiece, HojaEstructuraDatos, HojaTelasDatos } from './tipos';

const pieza = (num: number, name: string, reference: string, length = '—', bold = false): FilaDespiece => ({ num: String(num), name, reference, units: '1', length, bold });
// El Arzúa de las pruebas del dominio: 11 filas, un accesorio y sin observaciones.
const ejemplo: HojaEstructuraDatos = {
  kind: 'estructura',
  structureIndex: 0,
  header: { of: '0230194', orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', reviewer: '—', date: '02/10/2026', letter: 'A', model: 'ARZÚA PRO', device: 'MOTOR' },
  despiece: [
    pieza(1, 'JUEGO SOPORTE AROND', 'SOPAR350BL16'),
    pieza(2, 'TUBO DE ENROLLE P801', 'TURA80HG400C', '327,2', true),
    pieza(3, 'CASQUILLO PUNTA', 'CASPUNCEJE78MM'),
    pieza(4, 'TUBO DE CARGA EVO 80', 'PEVO80BL16500C', '327,2', true),
    pieza(5, 'KIT TAPONES EVO 80', 'TAPONEVO8BL16'),
    pieza(6, 'JUEGO DE BRAZOS ONYX', 'BONYXBL16225C', '225', true),
    pieza(7, 'JUEGO DE TERMINALES', 'TERMINEVOBL16'),
    pieza(8, 'RUEDA MOTRIZ A P-801 MECANIZADA', 'RUEDAMOT801MEC'),
    pieza(9, 'MOTOR SOMFY SUNILUS 55/17 IO', 'SUNILUSIO55//17', '—', true),
    pieza(10, 'CORONA ADAPTADA LT60 P-801', 'CORONALT60'),
    pieza(11, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO')
  ],
  rowsPerPage: 28,
  accessories: [{ name: 'MANDO SITUO 1 IO PURE', reference: 'SITUOIO1PURE', units: '1' }],
  anchoring: { name: 'NO INDICADO', reference: '—', units: '—' },
  partida: [['FRENTE', '337'], ['SALIDA TOLDO', '225'], ['UNIDADES', '1']],
  valid: true,
  detalles: [['LACADO', 'BLANCO'], ['DISPOSITIVO', 'MOTOR'], ['POSICIÓN MOTOR', 'M.F.DER'], ['COLOCACIÓN TOLDO', 'FRONTAL']],
  tela: [['TELA', '326,2'], ['SALIDA PAÑO', '300'], ['PAÑO', '9,0 ML']],
  notes: '',
  footer: 'Toldo A · Estructura'
};
const telas: HojaTelasDatos = {
  kind: 'telas',
  planIndex: 0,
  header: { of: '0230194', orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', reviewer: '—', date: '02/10/2026', title: 'PLANTEAMIENTO DE TELAS' },
  diagramTitle: 'ARZÚA PRO',
  rotulacion: { tela: 'NO', bamba: 'NO' },
  datos: { material: 'ACR NEGRO 2170 :120 AN', curva: 'RECTA', remate: '—' },
  rows: [{ letter: 'A', fabricWidth: '326,2', dropLabel: 'SALIDA', fabricDrop: '300,0', units: '1', line: '' }],
  total: { label: 'ACRILI2170P120', amount: '9,0 ML' },
  notes: '',
  footer: 'Planteamiento de telas'
};
const pintar = (datos: HojaEstructuraDatos) => renderToStaticMarkup(<HojaEstructura datos={datos} onLista={() => {}} onError={() => {}} />);

describe('HojaEstructura', () => {
  it('cabecera con OF, pedido, la letra del toldo, el modelo y el dispositivo', () => {
    const html = pintar(ejemplo);
    for (const texto of ['OF:', '0230194', 'Nº PEDIDO:', 'AR2603332', 'TOLDO A', 'ARZÚA PRO', 'MOTOR']) expect(html).toContain(texto);
    expect(html).toContain('data-hoja-telas=""');
    expect(html.match(/class="estructura-pagina"/g)).toHaveLength(1);
  });

  it('despiece con las palabras enteras en la cabecera y la longitud con coma', () => {
    const html = pintar(ejemplo);
    expect(html).toContain('TUBO DE ENROLLE P801');
    expect(html).toContain('327,2');
    expect(html).toContain('>UNIDADES<');
    expect(html).toContain('>LONGITUD<');
    expect(html).not.toContain('UNID.');
    expect(html).not.toContain('LONGIT.');
  });

  it('accesorios y anclaje sin número de fila', () => {
    const html = pintar(ejemplo);
    expect(html).toContain('MANDO SITUO 1 IO PURE');
    expect(html).toContain('NO INDICADO');
    for (const numero of ['>21<', '>22<', '>23<', '>25<']) expect(html).not.toContain(numero);
  });

  it('solo las filas de accesorios que traen algo; sin ninguno, una fila con «—»', () => {
    expect(pintar(ejemplo).match(/data-accesorio=""/g)).toHaveLength(1);
    const dos = pintar({ ...ejemplo, accessories: [...ejemplo.accessories, { name: 'SENSOR EOLIS 3D', reference: 'EOLIS3D', units: '1' }] });
    expect(dos.match(/data-accesorio=""/g)).toHaveLength(2);
    const html = pintar({ ...ejemplo, accessories: [] });
    expect(html.match(/data-accesorio=""/g)).toHaveLength(1);
    expect(html).toMatch(/data-accesorio="".*?>—<.*?>—<.*?>—</s);
  });

  it('sin observaciones no hay recuadro; con ellas, sí', () => {
    expect(pintar(ejemplo)).not.toContain('OBSERVACIONES');
    const html = pintar({ ...ejemplo, notes: 'COMPROBAR ANCLAJE' });
    expect(html).toContain('OBSERVACIONES');
    expect(html).toContain('COMPROBAR ANCLAJE');
  });

  it('un cálculo que no vale pinta REVISAR', () => {
    expect(pintar(ejemplo)).toContain('VÁLIDO');
    const html = pintar({ ...ejemplo, valid: false });
    expect(html).toContain('REVISAR');
    expect(html).not.toContain('VÁLIDO');
  });

  it('un despiece largo sigue en otra página: accesorios y anclaje solo en la última', () => {
    const despiece = Array.from({ length: 30 }, (_, i) => pieza(i + 1, `PIEZA ${i + 1}`, `REF${i + 1}`));
    const html = pintar({ ...ejemplo, despiece });
    const paginas = html.split('class="estructura-pagina"').slice(1);
    expect(paginas).toHaveLength(2);
    expect(paginas[0]).toContain('Estructura · 1/2');
    expect(paginas[1]).toContain('Estructura · 2/2');
    expect(paginas[0]).toContain('PIEZA 28<');
    expect(paginas[0]).not.toContain('PIEZA 29<');
    expect(paginas[1]).toContain('PIEZA 29<');
    expect(paginas[0]).not.toContain('ELEMENTOS ACCESORIOS');
    expect(paginas[0]).not.toContain('SISTEMA DE ANCLAJE');
    expect(paginas[1]).toContain('ELEMENTOS ACCESORIOS');
    expect(paginas[1]).toContain('SISTEMA DE ANCLAJE');
    // La columna derecha va en todas.
    expect(paginas[0]).toContain('DATOS DE PARTIDA');
    expect(paginas[1]).toContain('DATOS DE PARTIDA');
  });

  it('con una sola página el pie no lleva «1/1»', () => {
    expect(pintar(ejemplo)).toContain('>Toldo A · Estructura<');
  });
});

describe('altoFilaDespiece', () => {
  it('con observaciones no pasa de 9,7 pt; sin ellas crece hasta 13', () => {
    expect(altoFilaDespiece(11, true)).toBe(9.7);
    expect(altoFilaDespiece(11, false)).toBe(17);
  });

  it('con muchas filas se estrechan para que quepan', () => {
    expect(altoFilaDespiece(28, true)).toBeLessThan(9.7);
    expect(altoFilaDespiece(28, true)).toBeGreaterThan(6);
  });

  it('menos de seis filas cuentan como seis', () => {
    expect(altoFilaDespiece(1, false, 30)).toBe(altoFilaDespiece(6, false, 30));
    expect(altoFilaDespiece(6, false, 30)).toBeLessThan(17);
  });
});

describe('HojasTelas con hojas de los dos tipos', () => {
  it('pinta la de estructura y la de telas, en ese orden, cada una con su marca', () => {
    const html = renderToStaticMarkup(<HojasTelas hojas={[ejemplo, telas]} onLista={() => {}} onError={() => {}} />);
    expect(html.match(/data-hoja-telas=""/g)).toHaveLength(2);
    expect(html.indexOf('class="estructura-pagina"')).toBeGreaterThan(-1);
    expect(html.indexOf('class="estructura-pagina"')).toBeLessThan(html.indexOf('class="telas-pagina"'));
    expect(html).toContain('PAÑO TOTAL NECESARIO');
  });

  it('cuenta las páginas de los dos tipos', () => {
    const selectores: string[] = [];
    const hoja = (paginas: number) => ({ querySelectorAll: (selector: string) => { selectores.push(selector); return { length: paginas }; } });
    const raiz = { querySelectorAll: () => [hoja(2), hoja(1)] } as unknown as ParentNode;
    expect(contarPaginas(raiz)).toEqual([2, 1]);
    expect(selectores).toEqual(['.telas-pagina, .estructura-pagina', '.telas-pagina, .estructura-pagina']);
  });
});
