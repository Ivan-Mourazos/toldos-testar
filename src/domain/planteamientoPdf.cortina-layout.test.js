import { expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildOrderPlanteamientoPdf, resolveCurtainVelcroHeight } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';
import { formatNumber } from './math.js';

test.each(['CORTINA', 'CAMBIO CORTINA'].flatMap(model => [false, true].map(longNotes => [model, longNotes])))('%s: las cinco medidas caben bajo la bamba sin pisar observaciones (largas: %s)', async (model, longNotes) => {
  const notes = longNotes ? Array.from({ length: 35 }, (_, i) => `NOTA ${String(i + 1).padStart(2, '0')} COMPROBAR LA MEDIDA Y EL MONTAJE EN OBRA`).join('\n') : '';
  const order = normalizeOrder({
    orderCode: 'AR-Q-C04', customer: 'PRUEBA CORTINA', technician: 'IVÁN',
    fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR', notes, sameFabric: true,
    awnings: [{
      id: 'a', of: '0232626', model, units: 1, width: 200, projection: 275,
      valanceHeight: 20, valanceCurve: 'RECTA', remate: 'COMO TELA', structureColor: 'BLANCO',
      rotFabric: 'NO', rotValance: 'NO',
      device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'TECHO',
      curtainSupport: 'UNIVERSAL 3 AGUJEROS', curtainHasWindow: true, curtainFinish: 'VELCRO',
      curtainBottomFinish: 'ET', curtainWindowCorner: 15, curtainWindowHeight: 137,
      curtainWindowFloorHeight: 70, curtainWindowReference: 'SUELO', curtainFabricAdjustment: 'NINGUNO'
    }]
  });
  const calculation = calculateOrder(order);
  expect(calculation.ofs[0].calculation.valid, JSON.stringify(calculation.diagnostics)).toBe(true);
  expect(calculation.ofs[0].calculation.fabricDrop).toBe(350);
  const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
  const loading = getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loading.promise;
  try {
    const pages = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      pages.push({ page, items: (await page.getTextContent()).items });
    }
    const fabricPages = pages.filter(({ items }) => items.some(item => item.str === 'PLANTEAMIENTO DE TELAS'));
    const { page, items } = fabricPages[0];
    const top = item => page.view[3] - item.transform[5] - item.height;
    const bottom = item => page.view[3] - item.transform[5];
    const bamba = items.find(item => item.str === 'B.N(3)');
    expect(bamba).toBeDefined();
    const measures = [
      ['SALIDA:', '275'], ['ESQ. VENTANA:', '15'], ['H. TUBO-VENT.:', '52'], ['H. VENTANA:', '137'],
      ['ALTURA VELCRO:', String(resolveCurtainVelcroHeight(order.awnings[0]))]
    ];
    for (const [label, value] of measures) {
      const item = items.find(item => item.str === label);
      expect(item, label).toBeDefined();
      const measure = items.find(other => other.str === formatNumber(Number(value)) && Math.abs(other.transform[5] - item.transform[5]) < 3);
      expect(measure, `${label} conserva ${value}`).toBeDefined();
      expect(top(item), `${label} queda bajo la bamba`).toBeGreaterThan(bottom(bamba));
      expect(bottom(item), `${label} dentro del recuadro que acaba en 449`).toBeLessThan(449);
      expect(bottom(measure), `${label} no toca las observaciones que empiezan en 456`).toBeLessThan(449);
    }
    // En el dibujo, la cota de la altura de la ventana y la de la base no se tocan (con ET la base sube).
    const enDibujo = value => items.find(item => item.str === value && bottom(item) < top(bamba));
    expect(top(enDibujo('52')) - bottom(enDibujo('137')), 'cotas de la ventana separadas').toBeGreaterThan(12);
    // Las esquinas van a cada lado de la ventana, a la misma altura y por encima del cristal;
    // el cristal (137) y la base (52) son una cadena vertical dentro de la ventana (Iván, 13/10/2026).
    const esquinas = items.filter(item => item.str === '15' && bottom(item) < top(bamba))
      .sort((a, b) => a.transform[4] - b.transform[4]);
    expect(esquinas).toHaveLength(2);
    const [izquierda, derecha] = esquinas;
    const cristal = enDibujo('137');
    const base = enDibujo('52');
    expect(Math.abs(izquierda.transform[5] - derecha.transform[5]), 'esquinas a la misma altura').toBeLessThan(1);
    expect(bottom(izquierda), 'esquinas por encima del cristal').toBeLessThan(top(cristal));
    expect(cristal.transform[4], 'el cristal entre las dos esquinas').toBeGreaterThan(izquierda.transform[4]);
    expect(cristal.transform[4], 'el cristal entre las dos esquinas').toBeLessThan(derecha.transform[4]);
    expect(Math.abs(cristal.transform[4] - base.transform[4]), 'cristal y base en la misma cadena').toBeLessThan(2);
    expect(items.some(item => item.str === 'CRISTAL'), 'la ventana se rotula como cristal').toBe(true);
    const text = fabricPages.flatMap(({ items }) => items.map(item => item.str)).join(' ');
    if (longNotes) {
      expect(text).toContain('OBSERVACIONES');
      for (let i = 1; i <= 35; i++) expect(text).toContain(`NOTA ${String(i).padStart(2, '0')}`);
      const observation = items.find(item => item.str === 'OBSERVACIONES');
      expect(top(observation)).toBeGreaterThanOrEqual(456);
    } else expect(text).not.toContain('OBSERVACIONES');
  } finally { await loading.destroy(); }
});
