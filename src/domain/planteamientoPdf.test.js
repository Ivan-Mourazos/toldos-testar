import { describe, expect, test } from 'vitest';
import { buildOrderPlanteamientoPdf, buildPlanteamientoPlan, resolveMaterialRows } from './planteamientoPdf.js';
import { calculateOrder } from './rules.js';

function materialsOf(count) {
  return Array.from({ length: count }, (_, index) => ({
    code: `ART-${index}`,
    description: `Descripcion ${index}`,
    quantity: index + 1
  }));
}

describe('resolveMaterialRows', () => {
  test('deja pasar todas las lineas cuando caben (<= maxRows)', () => {
    const materials = materialsOf(11);
    const { rows, overflowLabel } = resolveMaterialRows(materials);
    expect(rows).toHaveLength(11);
    expect(rows).toEqual(materials);
    expect(overflowLabel).toBeNull();
  });

  test('10 lineas (MAQ. EXTERIOR EVO) se muestran completas sin recorte', () => {
    const materials = materialsOf(10);
    const { rows, overflowLabel } = resolveMaterialRows(materials);
    expect(rows).toHaveLength(10);
    expect(overflowLabel).toBeNull();
  });

  test('nunca pierde lineas en silencio: si excede maxRows, recorta y añade fila de resumen', () => {
    const materials = materialsOf(14);
    const { rows, overflowLabel } = resolveMaterialRows(materials, 11);
    expect(rows).toHaveLength(10);
    expect(rows).toEqual(materials.slice(0, 10));
    expect(overflowLabel).toBe('... y 4 lineas mas (ver RPS)');
  });

  test('respeta un maxRows distinto al por defecto', () => {
    const materials = materialsOf(5);
    const { rows, overflowLabel } = resolveMaterialRows(materials, 4);
    expect(rows).toHaveLength(3);
    expect(overflowLabel).toBe('... y 2 lineas mas (ver RPS)');
  });
});

describe('buildOrderPlanteamientoPdf', () => {
  test('los trabajos textiles no generan estructura y separan dibujos distintos', () => {
    const order = {
      awnings: [
        { id: 'a', model: 'ARZUA PRO' },
        { id: 'b', model: 'CAMBIO TELA' },
        { id: 'c', model: 'ENROLLABLE' }
      ]
    };
    const calculation = {
      ofs: order.awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex }))
    };
    const plan = buildPlanteamientoPlan(order, calculation);

    expect(plan.structureEntries.map(({ awning }) => awning.id)).toEqual(['a']);
    expect(plan.fabricPages.map(({ diagram }) => diagram)).toEqual(['ARZUA', 'CAMBIO-TELA', 'ENROLLABLE']);
    expect(plan.fabricPages.flatMap(({ entries }) => entries.map(({ awning }) => awning.id))).toEqual(['a', 'b', 'c']);
  });

  test('Arzua con tubos de carga distintos no comparte un dibujo ambiguo', () => {
    const awnings = [
      { id: 'a', model: 'ARZUA PRO', tubeLoad: 'TUBO DE CARGA EVO 80' },
      { id: 'b', model: 'ARZUA PRO', tubeLoad: 'TUBO DE CARGA UNIVERS 280' }
    ];
    const calculation = {
      ofs: awnings.map((awning, awningIndex) => ({
        awningId: awning.id,
        awningIndex,
        calculation: { tubeLoad: awning.tubeLoad }
      }))
    };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages).toHaveLength(2);
    expect(plan.fabricPages.map(({ diagram }) => diagram)).toEqual(['ARZUA', 'ARZUA']);
    expect(plan.fabricPages.map(({ diagramCalculation }) => diagramCalculation.tubeLoad))
      .toEqual(['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280']);
  });

  test('el dibujo toma el tubo del despiece para no contradecir la estructura', () => {
    const awning = { id: 'a', model: 'ARZUA PRO', tubeLoad: 'TUBO DE CARGA UNIVERS 280' };
    const calculation = {
      ofs: [{
        awningId: 'a',
        awningIndex: 0,
        calculation: { tubeLoad: 'TUBO DE CARGA UNIVERS 280' },
        despiece: { rows: [{ num: 5, name: 'TUBO DE CARGA EVO 80' }] }
      }]
    };
    const plan = buildPlanteamientoPlan({ awnings: [awning] }, calculation);

    expect(plan.fabricPages[0].diagramCalculation.tubeLoad).toBe('TUBO DE CARGA EVO 80');
  });

  test('Antica separa las configuraciones técnicas en páginas distintas', () => {
    const awnings = [
      { id: 'a', model: 'CAMBIO ANTICA', anticaVariant: 'SOPORTE FIJO 3 AGUJEROS' },
      { id: 'b', model: 'CAMBIO ANTICA', anticaVariant: 'TUBO 30X10' },
      { id: 'c', model: 'CAMBIO ANTICA', anticaVariant: 'TUBO 50X30 CONTRAPESO' }
    ];
    const calculation = { ofs: awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex })) };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages).toHaveLength(3);
    expect(plan.fabricPages.map(({ diagramAwning }) => diagramAwning.anticaVariant))
      .toEqual(['SOPORTE FIJO 3 AGUJEROS', 'TUBO 30X10', 'TUBO 50X30 CONTRAPESO']);
  });

  test('cortinas con medidas de ventana distintas no comparten dibujo', () => {
    const awnings = [
      { id: 'a', model: 'CAMBIO CORTINA', curtainHasWindow: true, curtainFinish: 'NORMAL', curtainWindowExit: 320, curtainWindowCorner: 20, curtainWindowFloorHeight: 70, curtainWindowHeight: 140 },
      { id: 'b', model: 'CAMBIO CORTINA', curtainHasWindow: true, curtainFinish: 'NORMAL', curtainWindowExit: 300, curtainWindowCorner: 15, curtainWindowFloorHeight: 60, curtainWindowHeight: 130 }
    ];
    const calculation = { ofs: awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex })) };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages).toHaveLength(2);
    expect(plan.fabricPages.every(({ diagram }) => diagram === 'CORTINA-VENTANA')).toBe(true);
  });

  test.runIf(process.platform === 'win32')('incrusta las fuentes para que el PDF sea estable entre visores de PC', async () => {
    const order = {
      orderCode: 'AR-PDF-TEST',
      fabric: 'ACR AZUL',
      structureColor: 'BLANCO',
      awnings: [{
        of: '0230194', model: 'ARZUA PRO', units: 1, width: 337, projection: 225,
        valanceHeight: 30, device: 'MOTOR', sensor: 'SIN SENSOR',
        tubeLoad: 'TUBO DE CARGA EVO 80', placement: 'FRONTAL'
      }]
    };

    const buffer = await buildOrderPlanteamientoPdf({
      order,
      calculation: calculateOrder(order)
    });
    const pdfSource = buffer.toString('latin1');

    expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
    expect(pdfSource).toContain('/FontFile2');
    expect(pdfSource).toContain('SegoeUI');
  });
});
