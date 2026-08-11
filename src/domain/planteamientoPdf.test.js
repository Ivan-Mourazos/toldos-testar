import { describe, expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  awningLetter,
  buildFabricLineDetail,
  buildHeraMiniPlanDetail,
  buildOrderPlanteamientoPdf,
  buildPlanteamientoPlan,
  resolveCurtainVelcroHeight,
  resolveMaterialRows,
  summarizeFabricMaterial,
  summarizeFabricPage
} from './planteamientoPdf.js';
import { calculateOrder } from './rules.js';

const heraSoltis267 = 'SOLTIS96NUBP267|||267|||SOLTIS 96 NUBE|||SOLTIS 96';
const heraAcrylic120 = 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR';

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

describe('datos del planteamiento de telas', () => {
  test('mantiene las etiquetas del Excel y formatea las medidas con un decimal', () => {
    const detail = buildFabricLineDetail(
      { model: 'CAMBIO CORTINA', units: 2 },
      { fabricWidth: 307, fabricDrop: 325.25 }
    );

    expect(detail).toMatchObject({
      workLabel: 'CAMB. CORT',
      fabricWidth: '307,0',
      fabricDrop: '325,3',
      units: '2'
    });
  });

  test('una bamba de tejido distinto se marca como NO INCLUIDA y muestra su tejido', () => {
    const detail = buildFabricLineDetail(
      {
        model: 'ARZUA PRO',
        valanceHeight: 25,
        valanceFabric: 'BAMBA-ESPECIAL-TEST'
      },
      {
        valanceFabricCode: 'BAMBA-ESPECIAL-TEST',
        valanceFabricDescription: 'LONA ACRÍLICA AZUL'
      }
    );

    expect(detail.instruction).toBe('BAMBA NO INCLUIDA DE 30CM, HECHA DE 25CM - LONA ACRÍLICA AZUL');
    expect(detail.instruction).not.toContain('BAMBALINA INCLUIDA');
  });

  test('el trabajo BAMBALINA no reutiliza el texto de bamba incluida de un toldo completo', () => {
    const detail = buildFabricLineDetail(
      { model: 'BAMBALINA', valanceHeight: 25, valanceFabric: 'BAMBA-ESPECIAL-TEST' },
      { valanceFabricCode: 'BAMBA-ESPECIAL-TEST', valanceFabricDescription: 'LONA ACRÍLICA AZUL' }
    );

    expect(detail.workLabel).toBe('CAMB. BAMBA');
    expect(detail.instruction).not.toContain('BAMBA NO INCLUIDA');
    expect(detail.instruction).not.toContain('BAMBALINA INCLUIDA');
  });

  test.each(['XACOBEO', 'CUARZO BOX'])('%s conserva la instrucción VARILLA BLANCA ATRÁS', (model) => {
    const detail = buildFabricLineDetail({ model, valanceHeight: 0 }, {});

    expect(detail.instruction).toContain('VARILLA BLANCA ATRÁS');
  });

  test('el total global suma cuerpo y bamba y fusiona una sola línea por tejido', () => {
    const totals = summarizeFabricPage([
      {
        calc: {
          fabricCode: 'TELA-A',
          mainFabricMl: 10.2,
          fabricMl: 11.25,
          valanceFabricCode: 'TELA-B',
          valanceFabricMl: 1.05
        }
      },
      { calculation: { fabricCode: 'TELA-A', fabricMl: 5.3 } },
      { calc: { fabricCode: 'TELA-B', fabricMl: 2.15 } }
    ]);

    expect(totals).toEqual([
      { code: 'TELA-A', amount: 15.5 },
      { code: 'TELA-B', amount: 3.2 }
    ]);
  });

  test('dos unidades conservan los paños y ML calculados en el total global', () => {
    const order = {
      orderCode: 'AR2600676',
      fabric: 'ACR NATURAL',
      awnings: [{
        id: 'a', of: '229652', model: 'CAMBIO TELA', units: 2,
        width: 479.5, projection: 300, valanceHeight: 25
      }]
    };
    const calculation = calculateOrder(order).ofs[0].calculation;
    const detail = buildFabricLineDetail(order.awnings[0], calculation, order);

    expect(calculation).toMatchObject({ fabricPanels: 5, fabricMl: 37 });
    expect(detail.units).toBe('2');
    expect(summarizeFabricPage([{ calculation }])).toEqual([
      { code: calculation.fabricCode, amount: 37 }
    ]);
  });

  test('ALTURA VELCRO replica la salida visible del Excel menos 10 cm', () => {
    expect(resolveCurtainVelcroHeight({ projection: 300, curtainWindowExit: 210 })).toBe(200);
    expect(resolveCurtainVelcroHeight({ projection: 300 })).toBe(290);
  });

  test('la altura de velcro variable queda en el bloque individual', () => {
    const detail = buildFabricLineDetail({
      model: 'CORTINA', projection: 300, curtainFinish: 'VELCRO'
    }, {});

    expect(detail.instruction).toContain('ALTURA VELCRO 290CM');
  });

  test('la bamba de Antica conserva su altura en el bloque individual', () => {
    const detail = buildFabricLineDetail({ model: 'CAMBIO ANTICA', valanceHeight: 25 }, {});

    expect(detail.instruction).toContain('BAMBA DE 25CM');
  });

  test('dos referencias con la misma descripción siguen siendo telas distintas', () => {
    expect(summarizeFabricMaterial([
      { calc: { fabricCode: 'ACRILI2051P120', fabricDescription: 'ACR ADMIRAL' } },
      { calc: { fabricCode: 'acrili2051p153', fabricDescription: 'ACR ADMIRAL' } }
    ])).toBe('VARIAS TELAS');
  });

  test('el mini planteamiento HERA muestra medidas base y de corte, y usa los ML calculados sin redondear la reserva', () => {
    const detail = buildHeraMiniPlanDetail(
      {
        model: 'HERA', submodel: 'HERA 43 MAQUINA', device: 'MAQUINA',
        width: 200, projection: 250, height: 240, heraJoin: 'HORIZONTAL'
      },
      {
        heraVariant: 'HERA 43 MAQUINA', width: 200, projection: 250, height: 240,
        rollTubeLength: 196.7, fabricWidth: 196, fabricDrop: 270,
        fabricCutWidth: 212, fabricCutDrop: 274, chainLength: 340,
        heraJoin: 'HORIZONTAL', fabricPanels: 3, seamCount: 2,
        fabricMl: 6.345, reservedFabricMl: 6.5, specialTubeRequired: false
      }
    );

    expect(detail).toMatchObject({
      variant: 'HERA 43 MAQUINA',
      drive: 'MÁQUINA',
      manual: true,
      width: '200 CM',
      projection: '250 CM',
      height: '240 CM',
      rollTube: '196,7 CM',
      fabricBase: '196 x 270 CM',
      fabricCut: '212 x 274 CM',
      chain: '340 CM',
      join: 'HORIZONTAL',
      panels: '3',
      seams: '2',
      fabricMl: '6,35 ML',
      specialTubeRequired: false
    });
    expect(detail.fabricMl).not.toBe('6,5 ML');
  });

  test('el mini planteamiento HERA motor omite altura y corte redundante, y marca que no lleva cadena', () => {
    const detail = buildHeraMiniPlanDetail(
      { model: 'HERA', submodel: 'HERA 56 MOTOR', width: 250, projection: 160, height: 0 },
      {
        heraVariant: 'HERA 56 MOTOR', width: 250, projection: 160, height: 0,
        rollTubeLength: 245.5, fabricWidth: 245, fabricDrop: 185,
        fabricCutWidth: 245, fabricCutDrop: 185, chainLength: null,
        heraJoin: 'NINGUNO', fabricPanels: 1, seamCount: 0, fabricMl: 1.85
      }
    );

    expect(detail).toMatchObject({
      drive: 'MOTOR',
      manual: false,
      fabricCut: '',
      chain: 'NO LLEVA',
      join: 'SIN EMPATE',
      fabricMl: '1,85 ML'
    });
  });
});

describe('buildOrderPlanteamientoPdf', () => {
  test('HERA no genera estructura vacía y cada toldo conserva su propio mini planteamiento de tela', () => {
    const awnings = [
      { id: 'hera-a', model: 'HERA', submodel: 'HERA 43 MAQUINA' },
      { id: 'hera-b', model: 'HERA', submodel: 'HERA 56 MOTOR' }
    ];
    const calculation = {
      ofs: awnings.map((awning, awningIndex) => ({
        awningId: awning.id,
        awningIndex,
        calculation: { heraVariant: awning.submodel }
      }))
    };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.structureEntries).toEqual([]);
    expect(plan.fabricPages).toHaveLength(2);
    expect(plan.fabricPages.map(({ diagram }) => diagram)).toEqual(['HERA', 'HERA']);
    expect(plan.fabricPages.map(({ entries }) => entries.map(({ awning }) => awning.id)))
      .toEqual([['hera-a'], ['hera-b']]);
  });

  test('el PDF HERA incluye el mini planteamiento manual y motor sin usar los ML redondeados de reserva', async () => {
    const order = {
      orderCode: 'AR26-HERA-PDF',
      customer: 'CLIENTE HERA',
      technician: 'TECNICO',
      reviewer: 'REVISOR',
      sameFabric: false,
      awnings: [
        {
          id: 'hera-manual', of: '0231001', model: 'HERA', submodel: 'HERA 43 MAQUINA',
          units: 1, width: 320, projection: 140, height: 240, heraJoin: 'VERTICAL',
          fabric: heraAcrylic120, fabricNotes: 'Confirmar sentido del empate en CAD.'
        },
        {
          id: 'hera-motor', of: '0231002', model: 'HERA', submodel: 'HERA 56 MOTOR',
          units: 1, width: 250, projection: 160, height: 0, heraJoin: 'NINGUNO',
          fabric: heraSoltis267
        }
      ]
    };
    const calculation = calculateOrder(order);
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;

    expect(document.numPages).toBe(2);
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => item.str).join(' '));
    }

    expect(calculation.ofs[0].calculation).toMatchObject({ fabricMl: 5.1, reservedFabricMl: 5.5 });
    expect(pageTexts[0]).toContain('MINI PLANTEAMIENTO HERA - TELA');
    expect(pageTexts[0]).toContain('HERA 43 MAQUINA');
    expect(pageTexts[0]).toContain('FRENTE TOLDO');
    expect(pageTexts[0]).toContain('320 CM');
    expect(pageTexts[0]).toContain('SALIDA TOLDO');
    expect(pageTexts[0]).toContain('140 CM');
    expect(pageTexts[0]).toContain('ALTURA INSTALACIÓN');
    expect(pageTexts[0]).toContain('240 CM');
    expect(pageTexts[0]).toContain('316,7 CM');
    expect(pageTexts[0]).toContain('TELA BASE');
    expect(pageTexts[0]).toContain('316 x 160 CM');
    expect(pageTexts[0]).toContain('TELA DE CORTE');
    expect(pageTexts[0]).toContain('326 x 170 CM');
    expect(pageTexts[0]).toContain('CADENA');
    expect(pageTexts[0]).toContain('340 CM');
    expect(pageTexts[0]).toContain('EMPATE');
    expect(pageTexts[0]).toContain('VERTICAL');
    expect(pageTexts[0]).toContain('PAÑOS / UNIONES');
    expect(pageTexts[0]).toContain('3 / 2');
    expect(pageTexts[0]).toContain('ML CALCULADOS');
    expect(pageTexts[0]).toContain('5,1 ML');
    expect(pageTexts[0]).not.toContain('5,5 ML');
    expect(pageTexts[0]).toContain('CAD MANUAL OBLIGATORIO');
    expect(pageTexts[0]).toContain('TUBO ESPECIAL - CAMBIAR PRESUPUESTO');
    expect(pageTexts[0]).toContain('Confirmar sentido del empate en CAD.');

    expect(pageTexts[1]).toContain('HERA 56 MOTOR');
    expect(pageTexts[1]).toContain('CADENA');
    expect(pageTexts[1]).toContain('NO LLEVA');
    expect(pageTexts[1]).toContain('1,85 ML');
    expect(pageTexts[1]).not.toContain('ALTURA INSTALACIÓN');
    expect(pageTexts[1]).not.toContain('TELA DE CORTE');
    expect(pageTexts[1]).not.toContain('TUBO ESPECIAL - CAMBIAR PRESUPUESTO');
    expect(pageTexts[1]).toContain('CAD MANUAL OBLIGATORIO');
  });

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

  test('cada pagina admite cuatro toldos y la siguiente continúa con E, F y sucesivos', () => {
    const awnings = Array.from({ length: 5 }, (_, index) => ({
      id: `awning-${index}`,
      model: 'ARZUA PRO',
      tubeLoad: 'TUBO DE CARGA EVO 80'
    }));
    const calculation = {
      ofs: awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex }))
    };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages.map(({ diagram }) => diagram)).toEqual(['ARZUA', 'ARZUA']);
    expect(plan.fabricPages.map(({ entries }) => entries.length)).toEqual([4, 1]);
    expect(plan.fabricPages.map(({ entries }) => entries.map(({ index }) => awningLetter(index))))
      .toEqual([['A', 'B', 'C', 'D'], ['E']]);
    expect(plan.fabricPages.flatMap(({ entries }) => entries.map(({ awning }) => awning.id)))
      .toEqual(awnings.map(({ id }) => id));
  });

  test('Antica separa las configuraciones técnicas en páginas distintas', () => {
    const awnings = [
      { id: 'a', model: 'CAMBIO ANTICA', anticaVariant: 'SOPORTE FIJO 3 AGUJEROS' },
      { id: 'b', model: 'CAMBIO ANTICA', anticaVariant: 'TUBO 30X10' },
      { id: 'c', model: 'CAMBIO ANTICA', anticaVariant: 'TUBO 50X30 CONTRAPESO' },
      { id: 'd', model: 'CAMBIO ANTICA', anticaVariant: 'ENTRADA TUBO Ø33 MM' },
      { id: 'e', model: 'CAMBIO ANTICA', anticaVariant: 'ENTRADA TUBO Ø42 MM' }
    ];
    const calculation = { ofs: awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex })) };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages).toHaveLength(5);
    expect(plan.fabricPages.map(({ diagramAwning }) => diagramAwning.anticaVariant))
      .toEqual([
        'SOPORTE FIJO 3 AGUJEROS',
        'TUBO 30X10',
        'TUBO 50X30 CONTRAPESO',
        'ENTRADA TUBO Ø33 MM',
        'ENTRADA TUBO Ø42 MM'
      ]);
  });

  test('Antica separa el dibujo con bamba del dibujo sin bamba aunque el tubo coincida', () => {
    const awnings = [
      {
        id: 'without-valance', model: 'CAMBIO ANTICA', valanceHeight: 0,
        anticaVariant: 'ENTRADA TUBO Ø33 MM', anticaMeasurementMode: 'BASE'
      },
      {
        id: 'with-valance', model: 'CAMBIO ANTICA', valanceHeight: 25,
        anticaVariant: 'ENTRADA TUBO Ø33 MM', anticaMeasurementMode: 'BASE'
      }
    ];
    const calculation = { ofs: awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex })) };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages).toHaveLength(2);
    expect(plan.fabricPages.map(({ entries }) => entries.map(({ awning }) => awning.id)))
      .toEqual([['without-valance'], ['with-valance']]);
  });

  test('el planteamiento Ø42 conserva 273,5 × 180 y rotula el tubo redondo', async () => {
    const order = {
      orderCode: 'AR2201476', fabric: 'ACR NEGRO', sameFabric: true,
      awnings: [{
        id: 'antica-42', of: '0178935', model: 'CAMBIO ANTICA', units: 1,
        width: 273.5, projection: 180, valanceHeight: 0,
        anticaVariant: 'ENTRADA TUBO Ø42 MM', anticaMeasurementMode: 'FINISHED', rotFabric: 'NO'
      }]
    };
    const calculation = calculateOrder(order);
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await document.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');

    expect(calculation.ofs[0].calculation).toMatchObject({ fabricWidth: 273.5, fabricDrop: 180 });
    expect(text).toContain('ENTRADA TUBO Ø42 MM');
  });

  test('los dibujos redondos rotulan exactamente el diámetro de cada tubo', async () => {
    const order = {
      orderCode: 'AR26-DIAMETROS', fabric: 'ACR NEGRO', sameFabric: true,
      awnings: [
        {
          id: 'antica-33', of: '3300033', model: 'CAMBIO ANTICA', units: 1,
          width: 291.5, projection: 105, valanceHeight: 0,
          anticaVariant: 'ENTRADA TUBO Ø33 MM', anticaMeasurementMode: 'BASE', rotFabric: 'NO'
        },
        {
          id: 'antica-42', of: '4200042', model: 'CAMBIO ANTICA', units: 1,
          width: 291.5, projection: 115, valanceHeight: 0,
          anticaVariant: 'ENTRADA TUBO Ø42 MM', anticaMeasurementMode: 'BASE', rotFabric: 'NO'
        }
      ]
    };
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;

    expect(document.numPages).toBe(2);
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => item.str).join(' '));
    }
    expect(pageTexts[0]).toContain('ENTRADA TUBO Ø33 MM');
    expect(pageTexts[0]).not.toContain('ENTRADA TUBO Ø42 MM');
    expect(pageTexts[1]).toContain('ENTRADA TUBO Ø42 MM');
    expect(pageTexts[1]).not.toContain('ENTRADA TUBO Ø33 MM');
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
