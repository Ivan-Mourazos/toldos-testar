import { describe, expect, test } from 'vitest';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  awningLetter,
  buildFabricLineDetail,
  buildGeneralFabricDiagramSpec,
  buildHeraMiniPlanDetail,
  buildOrderPlanteamientoPdf,
  buildPlanteamientoPlan,
  buildCurtainDiagramSpec,
  buildValanceDiagramSpec,
  getFabricPatternDiagram,
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
  test.each([
    ['CORTINA-SIN-VENTANA', {}, { finish: 'NORMAL', hasWindow: false }],
    ['CORTINA-VENTANA', {}, { finish: 'NORMAL', hasWindow: true }],
    ['CORTINA-VELCRO', {}, { finish: 'VELCRO', hasWindow: false }],
    ['CORTINA-VENTANA-VELCRO', {}, { finish: 'VELCRO', hasWindow: true }],
    ['CORTINA-TUBO', {}, { finish: 'TUBO', hasWindow: false }],
    ['CORTINA-TUBO-VENTANA', {}, { finish: 'TUBO', hasWindow: true }]
  ])('resuelve la geometría %s sin mezclar acabados', (diagram, awning, expected) => {
    expect(buildCurtainDiagramSpec(diagram, awning)).toMatchObject(expected);
  });

  test('el dibujo de Cortina distingue sin bamba, bambalina incluida y bamba de otra tela', () => {
    expect(buildCurtainDiagramSpec('CORTINA-TUBO', { valanceHeight: 0 }))
      .toMatchObject({ hasValance: false, separateValance: false });
    expect(buildCurtainDiagramSpec('CORTINA-TUBO', { valanceHeight: 25 }))
      .toMatchObject({ hasValance: true, separateValance: false, valanceHeight: 25 });
    expect(buildCurtainDiagramSpec('CORTINA-TUBO', { valanceHeight: 25, valanceFabric: 'TELA-B' }))
      .toMatchObject({ hasValance: true, separateValance: true, valanceHeight: 25 });
  });

  test('el dibujo de Electra conserva nombre completo, ventana y confección', () => {
    expect(buildCurtainDiagramSpec('CORTINA-VENTANA-VELCRO', { model: 'ELECTRA' })).toMatchObject({
      title: 'ELECTRA / ELIT VERTICAL · VENTANA · VELCRO',
      hasWindow: true,
      finish: 'VELCRO'
    });
  });

  test.each([
    ['RECTA', 'RECTA'],
    ['NORMAL', 'NORMAL'],
    ['SUAVE', 'SUAVE'],
    ['EXTRASUAVE', 'EXTRASUAVE']
  ])('la bambalina autónoma conserva la forma %s', (curve, expected) => {
    expect(buildValanceDiagramSpec({ model: 'BAMBALINA', valanceHeight: 25, valanceCurve: curve }))
      .toMatchObject({ standalone: true, hasValance: true, height: 25, curve: expected });
  });

  test('el patrón general conserva las bastillas fijas y solo hace variable la altura y curva de la bamba', () => {
    const spec = buildGeneralFabricDiagramSpec({
      model: 'CAMBIO TELA',
      valanceHeight: 27,
      valanceCurve: 'NORMAL'
    });

    expect(spec).toMatchObject({
      topHemCm: 2.5,
      topBastillaCm: 33.5,
      sideBastillaCm: 3.3,
      bottomHemCm: 4,
      valanceTopHemCm: 4,
      valance: { height: 27, curve: 'NORMAL', hasValance: true }
    });
    expect(spec).not.toHaveProperty('valanceSideBastillaCm');
  });

  test('el patrón general muestra dos varillas blancas y no rotula la palabra unión', async () => {
    const order = {
      orderCode: 'AR26-GENERICO-TEST',
      fabric: heraAcrylic120,
      sameFabric: true,
      awnings: [{
        id: 'generic-a', of: '0239999', model: 'CAMBIO TELA', units: 1,
        width: 401, projection: 315, valanceHeight: 27, valanceCurve: 'NORMAL'
      }]
    };
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await document.getPage(1);
    const items = (await page.getTextContent()).items.map((item) => item.str);

    expect(items.filter((text) => text === 'VARILLA BLANCA')).toHaveLength(2);
    expect(items.join(' ')).not.toContain('UNIÓN');
  });

  test.each([
    ['ARZUA PRO', 'ARZUA', 'GENERAL'],
    ['CAMBIO TELA', 'CAMBIO-TELA', 'GENERAL'],
    ['ENROLLABLE', 'ENROLLABLE', 'ENROLLABLE'],
    ['BAMBALINA', 'BAMBALINA', 'BAMBALINA'],
    ['CAMBIO ANTICA', 'ANTICA', 'ANTICA'],
    ['CORTINA', 'CORTINA-TUBO', 'CORTINA-TUBO'],
    ['IRIS', 'IRIS', 'IRIS']
  ])('separa el patrón de confección de %s de su CAD', (model, cad, expected) => {
    expect(getFabricPatternDiagram({ model }, cad)).toBe(expected);
  });

  test.each([
    ['ARZUA PRO', 'TOLDO-VELCRO', 'TOLDO-VELCRO'],
    ['ENROLLABLE', 'CAMBIO ENROLLABLE', 'CAMBIO ENROLLABLE'],
    ['BAMBALINA', 'SUPLEMENTO', 'SUPLEMENTO'],
    ['CORTINA', 'TOLDO-VELCRO', 'CORTINA-TUBO']
  ])('aplica el dibujo manual compatible de %s sin cambiar su CAD automático', (model, fabricDiagramOverride, expected) => {
    expect(getFabricPatternDiagram({ model, fabricDiagramOverride }, 'CORTINA-TUBO')).toBe(expected);
  });

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

  test('rotula la bajada vertical, el corte y el margen en cada toldo', () => {
    const detail = buildFabricLineDetail(
      { model: 'AMBAR BOX', units: 1, dropArmMode: 'VERTICAL_170' },
      {
        fabricWidth: 353,
        fabricDrop: 320,
        dropArmMode: 'VERTICAL_170',
        dropArmVerticalAllowanceCm: 40
      }
    );

    expect(detail.instruction).toContain('BAJADA VERTICAL 170°');
    expect(detail.instruction).toContain('CORTE 320CM');
    expect(detail.instruction).toContain('MARGEN 40CM');
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

  test('el trabajo BAMBALINA dice de cuánto queda hecha, como en los libros', () => {
    const detail = buildFabricLineDetail({ model: 'BAMBALINA', valanceHeight: 25 }, { fabricDrop: 30 });

    expect(detail.fabricDrop).toBe('30,0');
    expect(detail.instruction).toMatch(/^BAMBALINA HECHA DE 25CM/);
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

  test('ALTURA VELCRO en Cortina sigue lo que se resta de verdad: sin restar, salida + 8', () => {
    expect(resolveCurtainVelcroHeight({ model: 'CORTINA', projection: 300, curtainWindowExit: 210 })).toBe(200);
    expect(resolveCurtainVelcroHeight({ model: 'CORTINA', projection: 300, curtainWindowExit: 210, curtainSkipBottomDeduction: true })).toBe(218);
    expect(resolveCurtainVelcroHeight({
      model: 'CORTINA', projection: 300, curtainWindowExit: 210, reglasModificadas: true, curtainFabricDeductionCm: 10
    })).toBe(208);
  });

  test('ALTURA VELCRO replica TELA!E36: salida − 18 + 8 en Cortina y salida + 8 en Cambio de cortina', () => {
    expect(resolveCurtainVelcroHeight({ projection: 300, curtainWindowExit: 210 })).toBe(200);
    expect(resolveCurtainVelcroHeight({ projection: 300 })).toBe(290);
    // Iván, 22/09/2026: sin el descuento de 18 cm, en Cambio de cortina es +8.
    expect(resolveCurtainVelcroHeight({ model: 'CAMBIO CORTINA', projection: 300, curtainWindowExit: 210 })).toBe(218);
    expect(resolveCurtainVelcroHeight({ model: 'CAMBIO CORTINA', projection: 300 })).toBe(308);
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
        width: 200, projection: 250, height: 240, heraJoin: 'HORIZONTAL',
        machineSide: 'M.F IZQ', placement: 'FRONTAL',
        heraTopFinish: 'VARILLA PLANA', heraBottomFinish: 'PLETINA',
        heraInteriorFace: 'REVÉS', fabric: heraAcrylic120,
        structureNotes: 'ACLARACIÓN DEL PEDIDO'
      },
      {
        heraVariant: 'HERA 43 MAQUINA', width: 200, projection: 250, height: 240,
        rollTubeLength: 196.7, fabricWidth: 196, fabricDrop: 270,
        fabricCutWidth: 212, fabricCutDrop: 274, chainLength: 340,
        heraJoin: 'HORIZONTAL', fabricPanels: 3, seamCount: 2,
        fabricMl: 6.345, reservedFabricMl: 6.5, specialTubeRequired: false
      },
      { notes: 'OBSERVACIÓN GENERAL DE TELA' }
    );

    expect(detail).toMatchObject({
      variant: 'HERA 43 MAQUINA',
      drive: 'MÁQUINA',
      manual: true,
      controlSide: 'IZQUIERDA',
      placement: 'FRONTAL',
      topFinish: 'VARILLA PLANA',
      bottomFinish: 'PLETINA',
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
      fabricWidth: '196 CM',
      fabricDrop: '270 CM',
      interiorFace: 'REVÉS',
      notes: 'ACLARACIÓN DEL PEDIDO',
      fabricNotes: 'OBSERVACIÓN GENERAL DE TELA',
      specialTubeRequired: false
    });
    expect(detail.fabricMl).not.toBe('6,5 ML');
  });

  test('el mini planteamiento HERA motor omite altura y corte redundante, y marca que no lleva cadena', () => {
    const detail = buildHeraMiniPlanDetail(
      {
        model: 'HERA', submodel: 'HERA 56 MOTOR', width: 250, projection: 160, height: 0,
        machineSide: 'M.F.DER', heraTopFinish: 'VARILLA PLANA', heraBottomFinish: 'VARILLA BLANCA'
      },
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
      controlSide: 'DERECHA',
      fabricCut: '',
      chain: 'NO LLEVA',
      join: 'SIN EMPATE',
      fabricMl: '1,85 ML'
    });
  });
});

describe('buildOrderPlanteamientoPdf', () => {
  // ÁGATA BOX COFRE/MOTOR 250x150 es el caso real con más filas de despiece (20):
  // sirve de tope superior para probar que la tabla ya no está limitada a veinte
  // filas fijas, sino que se ajusta a las que tenga cada modelo.
  function buildAgataBoxTwentyRowOrder() {
    return {
      orderCode: 'AR2699002', customer: 'PRUEBA AGATA', orderDate: '2026-09-06',
      technician: 'Iván', reviewer: 'Adrián', sameFabric: true,
      fabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 :NEGRO 2170 :120 AN',
      structureColor: 'BLANCO', notes: '',
      awnings: [{
        id: 'a', of: '0299002', model: 'AGATA BOX', units: 1, width: 250, projection: 150,
        valanceHeight: 0, submodel: 'COFRE', device: 'MOTOR', armCount: 2,
        machineSide: 'M.F.DER', crankHeight: 150, placement: 'FRONTAL',
        structureColor: 'BLANCO', wallType: '', sensor: 'SIN SENSOR',
        reglasModificadas: false
      }]
    };
  }

  test.each([
    [undefined, undefined, 'MEDIDA GUÍAS 246'],
    [true, '', ''],
    [true, 'GUÍAS SEGÚN REVISIÓN', 'GUÍAS SEGÚN REVISIÓN']
  ])('el PDF Electra respeta las observaciones editadas (%s, %s)', async (structureNotesEdited, structureNotes, expectedNote) => {
    const order = {
      orderCode: 'AR2601519', customer: 'CLIENTE ELECTRA', fabric: 'ACR NEGRO',
      structureColor: 'BLANCO', sameFabric: true,
      awnings: [{
        id: 'electra-a', of: '0227009', model: 'ELECTRA', units: 1,
        structureNotesEdited, structureNotes,
        width: 345, projection: 260, valanceHeight: 0,
        submodel: 'SIN COFRE / CON GUÍA', electraSupport: 'UNIVERSAL 3 AGUJEROS',
        device: 'MAQ. INTERIOR', machineSide: 'M.F.DER', crankHeight: 150,
        placement: 'FRONTAL', structureColor: 'BLANCO',
        curtainHasWindow: false, curtainFinish: 'NORMAL', rotFabric: 'NO', rotValance: 'NO'
      }]
    };
    const calculation = calculateOrder(order);
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await document.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');

    expect(calculation.ofs[0].calculation).toMatchObject({ guideLength: 246, valid: true });
    expect(text).toContain('ELITGU12BL16500C');
    expect(text).toContain('KITRETENEDORBL16');
    if (expectedNote) expect(text).toContain(expectedNote);
    if (structureNotesEdited) expect(text).not.toContain('MEDIDA GUÍAS 246');
  });

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
          machineSide: 'M.F IZQ', placement: 'FRONTAL',
          heraTopFinish: 'VARILLA PLANA', heraBottomFinish: 'PLETINA',
          heraInteriorFace: 'REVÉS',
          fabric: heraAcrylic120, structureNotes: 'Confirmar sentido del empate en CAD.'
        },
        {
          id: 'hera-motor', of: '0231002', model: 'HERA', submodel: 'HERA 56 MOTOR',
          units: 1, width: 250, projection: 160, height: 0, heraJoin: 'NINGUNO',
          machineSide: 'M.F.DER', placement: 'FRONTAL',
          heraTopFinish: 'VARILLA PLANA', heraBottomFinish: 'VARILLA BLANCA',
          heraInteriorFace: 'DERECHO',
          fabric: heraSoltis267
        }
      ]
    };
    const calculation = calculateOrder(order);
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;

    expect(document.numPages).toBe(2);
    const firstPage = await document.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    expect(viewport.width).toBeCloseTo(595.28, 0);
    expect(viewport.height).toBeCloseTo(419.53, 0);
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => item.str).join(' '));
    }

    expect(calculation.ofs[0].calculation).toMatchObject({ fabricMl: 5.1, reservedFabricMl: 5.5 });
    expect(pageTexts[0]).toContain('HERA 43');
    expect(pageTexts[0]).toContain('Nº DE PEDIDO');
    expect(pageTexts[0]).toContain('DATOS DADOS');
    expect(pageTexts[0]).toContain('DATOS PLANTEAMIENTO');
    expect(pageTexts[0]).toContain('ARRIBA');
    expect(pageTexts[0]).toContain('VARILLA PLANA');
    expect(pageTexts[0]).toContain('ABAJO');
    expect(pageTexts[0]).toContain('PLETINA');
    expect(pageTexts[0]).toContain('FRENTE TOLDO');
    expect(pageTexts[0]).toContain('320');
    expect(pageTexts[0]).toContain('SALIDA TOLDO');
    expect(pageTexts[0]).toContain('140');
    expect(pageTexts[0]).toContain('ALTURA TOLDO');
    expect(pageTexts[0]).toContain('240');
    expect(pageTexts[0]).toContain('316,7');
    expect(pageTexts[0]).toContain('TELA');
    expect(pageTexts[0]).toContain('316');
    expect(pageTexts[0]).toContain('SALIDA DE TELA');
    expect(pageTexts[0]).toContain('160');
    expect(pageTexts[0]).toContain('CADENA');
    expect(pageTexts[0]).toContain('340');
    expect(pageTexts[0]).toContain('REVÉS DENTRO');
    expect(pageTexts[0]).toContain('Confirmar sentido del empate en CAD.');
    expect(pageTexts[0]).not.toContain('LADO ACCIONAMIENTO');
    expect(pageTexts[0]).not.toContain('ML CALCULADOS');
    expect(pageTexts[0]).not.toContain('COMPROBACIÓN CAD REQUERIDA');
    expect(pageTexts[0]).not.toContain('TUBO ESPECIAL - CAMBIAR PRESUPUESTO');
    expect(pageTexts[1]).toContain('HERA 56');
    expect(pageTexts[1]).toContain('DERECHO DENTRO');
    expect(pageTexts[1]).not.toContain('CADENA');
  });

  test('los trabajos textiles no generan estructura y comparten el patrón general cuando corresponde', () => {
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
    expect(plan.fabricPages.map(({ diagram }) => diagram)).toEqual(['GENERAL', 'ENROLLABLE']);
    expect(plan.fabricPages.flatMap(({ entries }) => entries.map(({ awning }) => awning.id))).toEqual(['a', 'b', 'c']);
  });

  test('el patrón textil de Arzua no se divide por el tubo de carga de la estructura', () => {
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

    expect(plan.fabricPages).toHaveLength(1);
    expect(plan.fabricPages[0].diagram).toBe('GENERAL');
    expect(plan.fabricPages[0].entries.map(({ awning }) => awning.id)).toEqual(['a', 'b']);
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

    expect(plan.fabricPages.map(({ diagram }) => diagram)).toEqual(['GENERAL', 'GENERAL']);
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

  test.each([
    ['TUBO 50X30', 'ENTRADA TUBO 50x30'],
    ['TUBO 50X30 CONTRAPESO', 'ENTRADA TUBO 50x30'],
    // La pletina del soporte fijo va al final de la lona, como el tubo.
    ['SOPORTE FIJO 3 AGUJEROS', 'ENTRADA PLETINA 25x4']
  ])('el rótulo de %s queda separado de las dos líneas de lona (F-A01)', async (anticaVariant, labelText) => {
    const order = {
      orderCode: 'AR26-ANTICA-F-A01', fabric: heraAcrylic120, sameFabric: true,
      awnings: [{
        id: 'antica', of: '0240003', model: 'CAMBIO ANTICA', units: 1,
        width: 300, projection: 200, valanceHeight: 0, anticaVariant,
        anticaMeasurementMode: 'BASE', rotFabric: 'NO'
      }]
    };
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
    const loading = getDocument({ data: new Uint8Array(buffer) });
    try {
      const document = await loading.promise;
      const page = await document.getPage(1);
      const content = await page.getTextContent();
      const label = content.items.find((item) => item.str === labelText);
      expect(label).toBeDefined();
      // F-A01 se reproduce con 300 × 200: el texto cruzaba las dos líneas.
      // Pasamos el borde superior del texto al eje Y descendente de los trazos PDFKit.
      const labelTop = page.view[3] - label.transform[5]
        - content.styles[label.fontName].ascent * label.height;
      const operators = await page.getOperatorList();
      const fabricLines = [];
      let strokeColor;
      for (let i = 0; i < operators.fnArray.length; i += 1) {
        if (operators.fnArray[i] === OPS.setStrokeRGBColor) strokeColor = operators.argsArray[i][0];
        if (operators.fnArray[i] === OPS.constructPath && ['#7fa594', '#bfd2ca'].includes(strokeColor)) {
          // Solo los trazos largos: el soporte fijo dibuja su eje con el mismo verde.
          const bounds = operators.argsArray[i][2];
          if (bounds[2] - bounds[0] > 40) fabricLines.push(bounds);
        }
      }
      expect(fabricLines).toHaveLength(2);
      for (const bounds of fabricLines) {
        // Tres puntos de separación incluyen la mitad del grosor del trazo.
        expect(labelTop).toBeGreaterThan(bounds[3] + 3);
      }
    } finally {
      await loading.destroy();
    }
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

  test('Cortina no mezcla páginas sin bamba, incluida y de otra tela', () => {
    const awnings = [
      { id: 'none', model: 'CORTINA', curtainHasWindow: false, curtainFinish: 'TUBO', valanceHeight: 0 },
      { id: 'same', model: 'CORTINA', curtainHasWindow: false, curtainFinish: 'TUBO', valanceHeight: 25 },
      { id: 'other', model: 'CORTINA', curtainHasWindow: false, curtainFinish: 'TUBO', valanceHeight: 25, valanceFabric: 'TELA-B' }
    ];
    const calculation = { ofs: awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex })) };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages).toHaveLength(3);
    expect(plan.fabricPages.map(({ diagram }) => diagram)).toEqual(['CORTINA-TUBO', 'CORTINA-TUBO', 'CORTINA-TUBO']);
    expect(plan.fabricPages.map(({ entries }) => entries.map(({ awning }) => awning.id)))
      .toEqual([['none'], ['same'], ['other']]);
  });

  test('Cortina no mezcla alturas ni curvas de bambalina en un dibujo compartido', () => {
    const awnings = [
      { id: '20-recta', model: 'CORTINA', curtainHasWindow: false, curtainFinish: 'NORMAL', valanceHeight: 20, valanceCurve: 'RECTA' },
      { id: '30-recta', model: 'CORTINA', curtainHasWindow: false, curtainFinish: 'NORMAL', valanceHeight: 30, valanceCurve: 'RECTA' },
      { id: '20-suave', model: 'CORTINA', curtainHasWindow: false, curtainFinish: 'NORMAL', valanceHeight: 20, valanceCurve: 'SUAVE' }
    ];
    const calculation = { ofs: awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex })) };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages).toHaveLength(3);
    expect(plan.fabricPages.map(({ entries }) => entries[0].awning.id))
      .toEqual(['20-recta', '30-recta', '20-suave']);
  });

  test('Cortina Velcro no comparte un dibujo cuando cambia la altura calculada', () => {
    const awnings = [
      { id: 'velcro-250', model: 'CORTINA', projection: 250, curtainHasWindow: false, curtainFinish: 'VELCRO', valanceHeight: 0 },
      { id: 'velcro-300', model: 'CORTINA', projection: 300, curtainHasWindow: false, curtainFinish: 'VELCRO', valanceHeight: 0 }
    ];
    const calculation = { ofs: awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex })) };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages).toHaveLength(2);
    expect(plan.fabricPages.map(({ entries }) => entries[0].awning.id))
      .toEqual(['velcro-250', 'velcro-300']);
  });

  test('los dibujos manuales forman páginas propias sin cambiar el modelo de cálculo', () => {
    const awnings = [
      { id: 'general', model: 'CAMBIO TELA' },
      { id: 'velcro', model: 'CAMBIO TELA', fabricDiagramOverride: 'TOLDO-VELCRO' },
      { id: 'roller', model: 'ENROLLABLE', fabricDiagramOverride: 'CAMBIO ENROLLABLE' },
      { id: 'supplement', model: 'BAMBALINA', valanceHeight: 25, valanceCurve: 'NORMAL', fabricDiagramOverride: 'SUPLEMENTO' }
    ];
    const calculation = { ofs: awnings.map((awning, awningIndex) => ({ awningId: awning.id, awningIndex })) };
    const plan = buildPlanteamientoPlan({ awnings }, calculation);

    expect(plan.fabricPages.map(({ diagram }) => diagram))
      .toEqual(['GENERAL', 'TOLDO-VELCRO', 'CAMBIO ENROLLABLE', 'SUPLEMENTO']);
  });

  test('el PDF renderiza las tres plantillas manuales del Excel', async () => {
    const order = {
      orderCode: 'AR-DIBUJOS-MANUALES', customer: 'CLIENTE', fabric: 'ACR NEGRO', sameFabric: true,
      awnings: [
        {
          id: 'velcro', of: '3300001', model: 'CAMBIO TELA', units: 1,
          width: 300, projection: 250, valanceHeight: 0, fabricDiagramOverride: 'TOLDO-VELCRO'
        },
        {
          id: 'roller', of: '3300002', model: 'ENROLLABLE', units: 1,
          width: 300, projection: 250, valanceHeight: 0, fabricDiagramOverride: 'CAMBIO ENROLLABLE'
        },
        {
          id: 'supplement', of: '3300003', model: 'BAMBALINA', units: 1,
          width: 300, projection: 0, valanceHeight: 25, valanceCurve: 'NORMAL', fabricDiagramOverride: 'SUPLEMENTO'
        }
      ]
    };
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => item.str).join(' '));
    }

    expect(pageTexts).toHaveLength(3);
    expect(pageTexts[0]).toContain('TOLDO · VELCRO');
    expect(pageTexts[0]).toContain('B.N(4)');
    expect(pageTexts[1]).toContain('CAMBIO ENROLLABLE');
    expect(pageTexts[1]).toContain('PLETINA 30 × 6');
    // El título ya no da por hecha la sujeción: se configura por pedido.
    expect(pageTexts[2]).toContain('SUPLEMENTO');
    expect(pageTexts[2]).not.toContain('CON BROCHES');
    // El solape sobre la onda tampoco se da por hecho, y el dibujo dice cuál va delante.
    expect(pageTexts[2]).not.toContain('POR ENCIMA DE LA ONDA');
    expect(pageTexts[2]).toContain('BAMBALINA');
    expect(pageTexts[2]).toContain('SUPLEMENTO POR DETRÁS');
  });

  test('el PDF de CORTINA Tubo rotula E.T. Ø40 y omite la varilla inferior normal', async () => {
    const order = {
      orderCode: 'AR-CORTINA-TUBO', customer: 'CLIENTE', fabric: 'ACR NEGRO', sameFabric: true,
      awnings: [{
        id: 'tube', of: '0239999', model: 'CORTINA', units: 1,
        width: 250, projection: 300, valanceHeight: 0,
        curtainHasWindow: false, curtainFinish: 'TUBO', rotFabric: 'NO',
        device: 'MOTOR', placement: 'FRONTAL', structureColor: 'BLANCO'
      }]
    };
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await document.getPage(document.numPages);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');

    expect(text).toContain('E.T. Ø40');
    expect(text).toContain('SIN BAMBA');
    expect(text).not.toContain('VARILLA BLANCA (5,5)');
  });

  test('una OF va en el encabezado y varias se señalan arriba y aparecen dentro de cada bloque', async () => {
    const order = {
      orderCode: 'AR26-OF-TELAS', fabric: 'ACR NEGRO', sameFabric: true,
      awnings: [
        { id: 'fabric-a', of: '0231001', model: 'CAMBIO TELA', units: 1, width: 300, projection: 250, valanceHeight: 0 },
        { id: 'fabric-b', of: '0231002', model: 'CAMBIO TELA', units: 1, width: 280, projection: 220, valanceHeight: 25 }
      ]
    };
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => item.str).join(' '));
    }

    expect(pageTexts).toHaveLength(2);
    expect(pageTexts[0]).toContain('VER EN CADA TOLDO');
    expect(pageTexts[1]).toContain('VER EN CADA TOLDO');
    expect(pageTexts[0]).toContain('OF 0231001');
    expect(pageTexts[1]).toContain('OF 0231002');
    expect(pageTexts.join(' ')).not.toContain('0231001 · 0231002');
    expect(pageTexts.join(' ')).not.toContain('FECHA FABRIC.');

    const singleOrder = { ...order, awnings: [order.awnings[0]] };
    const singleBuffer = await buildOrderPlanteamientoPdf({
      order: singleOrder,
      calculation: calculateOrder(singleOrder)
    });
    const singleDocument = await getDocument({ data: new Uint8Array(singleBuffer) }).promise;
    const singlePage = await singleDocument.getPage(1);
    const singleContent = await singlePage.getTextContent();
    const singleText = singleContent.items.map((item) => item.str).join(' ');

    expect(singleText).toMatch(/OF\s+0231001/);
    expect(singleText.match(/OF\s+0231001/g)).toHaveLength(1);

    const sharedOfOrder = {
      ...order,
      awnings: order.awnings.map((awning) => ({ ...awning, of: '0231001' }))
    };
    const sharedOfBuffer = await buildOrderPlanteamientoPdf({
      order: sharedOfOrder,
      calculation: calculateOrder(sharedOfOrder)
    });
    const sharedOfDocument = await getDocument({ data: new Uint8Array(sharedOfBuffer) }).promise;
    const sharedOfTexts = [];
    for (let pageNumber = 1; pageNumber <= sharedOfDocument.numPages; pageNumber += 1) {
      const page = await sharedOfDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      sharedOfTexts.push(content.items.map((item) => item.str).join(' '));
    }

    expect(sharedOfTexts).toHaveLength(2);
    expect(sharedOfTexts.every((text) => /OF\s+0231001/.test(text))).toBe(true);
    expect(sharedOfTexts.join(' ')).not.toContain('VER EN CADA TOLDO');
  });

  test('la palabra DESPIECE se dibuja completa y recta en vertical', async () => {
    const order = {
      orderCode: 'AR26-DESPIECE', fabric: 'ACR AZUL', structureColor: 'BLANCO',
      awnings: [{
        id: 'structure', of: '0230194', model: 'ARZUA PRO', units: 1, width: 337, projection: 225,
        valanceHeight: 30, device: 'MOTOR', sensor: 'SIN SENSOR', motorPower: '40',
        tubeLoad: 'TUBO DE CARGA EVO 80', placement: 'FRONTAL', machineSide: 'M.F.DER'
      }]
    };
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await document.getPage(1);
    const content = await page.getTextContent();
    const label = content.items.find((item) => item.str === 'DESPIECE');

    expect(label).toBeDefined();
    expect(Math.abs(label.transform[1])).toBeGreaterThan(0);
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

  test('imprime todas las piezas del despiece y sube los bloques de abajo', async () => {
    const order = {
      orderCode: 'AR2699001', customer: 'PRUEBA DESPIECE', orderDate: '2026-09-06',
      technician: 'Iván', reviewer: 'Adrián', sameFabric: true,
      fabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 :NEGRO 2170 :120 AN',
      structureColor: 'BLANCO', notes: '',
      awnings: [{
        id: 'a', of: '0299001', model: 'ARZUA PRO', units: 1, width: 400, projection: 250,
        valanceHeight: 0, device: 'MAQ. INTERIOR', armCount: 2, machineSide: 'M.F.DER',
        crankHeight: 150, placement: 'FRONTAL', structureColor: 'BLANCO', wallType: '',
        sensor: 'SIN SENSOR', rotFabric: 'NO', rotValance: 'NO',
        tubeLoad: 'TUBO DE CARGA UNIVERS 280', supportSystem: 'ARZUA',
        structureNotes: '', reglasModificadas: false
      }]
    };
    const calculation = calculateOrder(order);
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await document.getPage(1);
    const items = (await page.getTextContent()).items;
    const text = items.map((item) => item.str).join(' ');

    // Las once piezas del Arzúa siguen ahí.
    for (const referencia of calculation.ofs[0].despiece.rows.map((row) => row.reference).filter(Boolean)) {
      expect(text).toContain(referencia);
    }
    // Y la tabla ya no imprime numeración hasta 20 cuando sólo hay once piezas.
    expect(text).not.toContain(' 20 ');

    // El bloque de abajo (ELEMENTOS ACCESORIOS) tiene que subir de verdad cuando el
    // despiece encoge: se compara contra Ágata Box, que con sus veinte filas usa
    // toda la tabla y por tanto empuja ese bloque más abajo en la página. En el
    // espacio de coordenadas de pdfjs, el eje Y de transform crece hacia arriba
    // (comprobado empíricamente), así que "más arriba en la página" es un
    // transform[5] MAYOR.
    const agataOrder = buildAgataBoxTwentyRowOrder();
    const agataCalculation = calculateOrder(agataOrder);
    expect(agataCalculation.ofs[0].despiece.rows).toHaveLength(24);
    const agataBuffer = await buildOrderPlanteamientoPdf({ order: agataOrder, calculation: agataCalculation });
    const agataDocument = await getDocument({ data: new Uint8Array(agataBuffer) }).promise;
    const agataPage = await agataDocument.getPage(1);
    const agataItems = (await agataPage.getTextContent()).items;

    const arzuaAccessoriesLabel = items.find((item) => item.str === 'ELEMENTOS ACCESORIOS');
    const agataAccessoriesLabel = agataItems.find((item) => item.str === 'ELEMENTOS ACCESORIOS');
    expect(arzuaAccessoriesLabel).toBeDefined();
    expect(agataAccessoriesLabel).toBeDefined();
    expect(arzuaAccessoriesLabel.transform[5]).toBeGreaterThan(agataAccessoriesLabel.transform[5]);
  });

  test('Ágata Box con sus veinticuatro filas de despiece (el máximo real) las imprime todas', async () => {
    const order = buildAgataBoxTwentyRowOrder();
    const calculation = calculateOrder(order);
    const despieceRows = calculation.ofs[0].despiece.rows;

    // Esta es justo la invariante que generaliza drawDespieceTable: con las veinte
    // filas que antes venían fijas, la tabla debe seguir imprimiéndolas todas y el
    // resto del layout (bloques de abajo) no debe perder ni recortar ninguna.
    expect(despieceRows).toHaveLength(24);

    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await document.getPage(1);
    const text = (await page.getTextContent()).items.map((item) => item.str).join(' ');

    for (const referencia of despieceRows.map((row) => row.reference).filter(Boolean)) {
      expect(text).toContain(referencia);
    }
  });

  const CUATRO_OBSERVACIONES = [
    'PONER REFUERZO EN EL LATERAL DERECHO',
    'CLIENTE AVISA ANTES DE IR AL DOMICILIO',
    'OJO CON EL CANALON, VA MUY JUSTO POR ARRIBA',
    'LLEVAR ANCLAJE QUIMICO DE REPUESTO'
  ].join('\n');

  async function textoDeLaHoja(order) {
    const calculation = calculateOrder(order);
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const paginas = [];
    for (let numero = 1; numero <= document.numPages; numero += 1) {
      const page = await document.getPage(numero);
      paginas.push((await page.getTextContent()).items.map((item) => item.str).join(' '));
    }
    return paginas;
  }

  function pedidoArzua(observaciones) {
    return {
      orderCode: 'AR2699002', customer: 'PRUEBA OBSERVACIONES', orderDate: '2026-09-06',
      technician: 'Iván', reviewer: 'Adrián', sameFabric: true,
      fabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 :NEGRO 2170 :120 AN',
      structureColor: 'BLANCO', notes: observaciones,
      awnings: [{
        id: 'a', of: '0299002', model: 'ARZUA PRO', units: 1, width: 400, projection: 250,
        valanceHeight: 0, device: 'MAQ. INTERIOR', armCount: 2, machineSide: 'M.F.DER',
        crankHeight: 150, placement: 'FRONTAL', structureColor: 'BLANCO', wallType: '',
        sensor: 'SIN SENSOR', rotFabric: 'NO', rotValance: 'NO',
        tubeLoad: 'TUBO DE CARGA UNIVERS 280', supportSystem: 'ARZUA',
        structureNotes: observaciones, reglasModificadas: false
      }]
    };
  }

  // Casilla REVISOR (diseño 24/09/2026, apartado 2): el nombre de quien guardó una
  // corrección, o vacía si nadie corrigió. Vacía se imprime como «-», igual que el resto.
  async function celdaRevisor(order) {
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const items = (await (await document.getPage(1)).getTextContent()).items.map((item) => item.str.trim()).filter(Boolean);
    const index = items.indexOf('REVISOR:');
    expect(index).toBeGreaterThanOrEqual(0);
    return items[index + 1];
  }

  test('la casilla REVISOR muestra order.reviewer', async () => {
    const order = { ...pedidoArzua(''), technician: 'IVÁN', reviewer: 'JAIME' };
    expect(await celdaRevisor(order)).toBe('JAIME');
  });

  test('la casilla REVISOR queda vacía si nadie corrigió', async () => {
    const order = { ...pedidoArzua(''), technician: 'IVÁN', reviewer: '' };
    const revisor = await celdaRevisor(order);
    expect(revisor).toBe('-');
    expect(revisor).not.toBe('IVÁN');
  });

  test('imprime las cuatro observaciones de estructura', async () => {
    const [estructura] = await textoDeLaHoja(pedidoArzua(CUATRO_OBSERVACIONES));
    expect(estructura).toContain('PONER REFUERZO EN EL LATERAL DERECHO');
    expect(estructura).toContain('CLIENTE AVISA ANTES DE IR AL DOMICILIO');
    expect(estructura).toContain('OJO CON EL CANALON, VA MUY JUSTO POR ARRIBA');
    expect(estructura).toContain('LLEVAR ANCLAJE QUIMICO DE REPUESTO');
  });

  test('imprime las cuatro observaciones de tela', async () => {
    const paginas = await textoDeLaHoja(pedidoArzua(CUATRO_OBSERVACIONES));
    const telas = paginas[paginas.length - 1];
    expect(telas).toContain('PONER REFUERZO EN EL LATERAL DERECHO');
    expect(telas).toContain('LLEVAR ANCLAJE QUIMICO DE REPUESTO');
  });

  async function notesBox(order, calculation) {
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const operators = await (await document.getPage(1)).getOperatorList();
    const colorIndex = operators.fnArray.findIndex((operation, index) =>
      operation === OPS.setFillRGBColor && operators.argsArray[index][0] === '#fff8df');
    if (colorIndex < 0) return null;
    expect(operators.fnArray[colorIndex + 1]).toBe(OPS.setStrokeRGBColor);
    expect(operators.argsArray[colorIndex + 1][0]).toBe('#f7bd19');
    expect(operators.fnArray[colorIndex + 2]).toBe(OPS.constructPath);
    return operators.argsArray[colorIndex + 2][2];
  }

  test('el recuadro crece con cinco piezas y conserva tres líneas con veinte', async () => {
    async function boundsFor(count) {
      const order = pedidoArzua('Comprobar fijación y color del perfil.');
      const calculation = calculateOrder(order);
      calculation.ofs[0].despiece.rows = Array.from({ length: count }, (_, index) => ({
        num: index + 1, name: `PIEZA ${index + 1}`, reference: `TEST${index + 1}`, units: 1, length: 200
      }));
      return notesBox(order, calculation);
    }
    const five = await boundsFor(5);
    const twenty = await boundsFor(20);
    expect(five[3] - five[1]).toBeGreaterThan(140);
    expect(twenty[3] - twenty[1]).toBeGreaterThan(54);
    expect(five[3] - five[1]).toBeGreaterThan(twenty[3] - twenty[1]);
  });

  test('las observaciones largas continúan completas en estructura y tela con pedido y OF', async () => {
    const largo = Array.from({ length: 70 }, (_, index) =>
      `NOTA ${String(index + 1).padStart(2, '0')} COMPROBAR EL MONTAJE Y LA MEDIDA EN OBRA`).join('\n');
    const paginas = await textoDeLaHoja(pedidoArzua(largo));
    const fabricStart = paginas.findIndex((text) => text.includes('PLANTEAMIENTO DE TELAS'));
    expect(fabricStart).toBeGreaterThan(1);
    expect(paginas.length - fabricStart).toBeGreaterThan(1);
    for (const group of [paginas.slice(0, fabricStart), paginas.slice(fabricStart)]) {
      const numbers = group.flatMap((text) => [...text.matchAll(/NOTA (\d{2})/g)].map((match) => Number(match[1])));
      expect(numbers).toEqual(Array.from({ length: 70 }, (_, index) => index + 1));
      for (const page of group.slice(1)) {
        expect(page).toContain('Observaciones (continuación)');
        expect(page).toContain('AR2699002');
        expect(page).toContain('0299002');
      }
    }
    expect(paginas.join(' ')).not.toContain('(sigue en el pedido)');
  });

  test('el fondo amarillo destaca observaciones escritas y no aparece con notas vacías', async () => {
    const filled = pedidoArzua('Confirmar el color del perfil.');
    expect(await notesBox(filled, calculateOrder(filled))).not.toBeNull();
    const empty = pedidoArzua('');
    expect(await notesBox(empty, calculateOrder(empty))).toBeNull();

    async function fabricHasHighlight(order) {
      const buffer = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
      const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
      const operators = await (await document.getPage(document.numPages)).getOperatorList();
      return operators.fnArray.some((operation, index) =>
        operation === OPS.setFillRGBColor && operators.argsArray[index][0] === '#fff8df');
    }
    expect(await fabricHasHighlight(filled)).toBe(true);
    expect(await fabricHasHighlight(empty)).toBe(false);
  });

  async function paginaUno(order, calculation) {
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await document.getPage(1);
    return (await page.getTextContent()).items;
  }

  function buildAgataBoxTechoOrder() {
    const order = buildAgataBoxTwentyRowOrder();
    order.awnings[0].placement = 'TECHO';
    return order;
  }

  test('ÁGATA BOX COFRE/MOTOR con colocación TECHO imprime sus veinticuatro filas en una hoja', async () => {
    const order = buildAgataBoxTechoOrder();
    const calculation = calculateOrder(order);
    const despieceRows = calculation.ofs[0].despiece.rows;

    // Desde el 23/09/2026 el Ágata con cofre y motor reserva lo que se consume y tiene
    // 24 filas (con TECHO, el soporte de techo sustituye al frontal): todas en la hoja.
    expect(despieceRows).toHaveLength(24);

    const items = await paginaUno(order, calculation);
    const text = items.map((item) => item.str).join(' ');
    for (const referencia of despieceRows.map((row) => row.reference).filter(Boolean)) {
      expect(text).toContain(referencia);
    }
    // Ésta es justo la fila que el bucle fijo de veinte descartaba en silencio.
    expect(text).toContain('SOTEMODULBL16');
  });

  test('el ELECTRA con catorce filas de despiece (banda ajustada) conserva la medida de guías al recortar', async () => {
    // Mismo pedido que "el PDF Electra incluye guías...": SIN COFRE / CON GUÍA +
    // MAQ. INTERIOR da quince filas de despiece, la banda de observaciones más
    // ajustada que produce ELECTRA. Con dos observaciones largas la caja no
    // tiene sitio para las tres líneas (medida de guías + dos observaciones), así
    // que algo se recorta: tiene que ser el final de las observaciones, nunca la
    // medida de guías.
    const dosObservaciones = [
      'PONER REFUERZO EN EL LATERAL DERECHO PORQUE EL MURO ESTÁ FLOJO Y NO AGUANTA BIEN',
      'CLIENTE AVISA ANTES DE IR AL DOMICILIO EL DÍA DE LA INSTALACIÓN, LLAMAR SIEMPRE ANTES'
    ].join('\n');
    const order = {
      orderCode: 'AR2601520', customer: 'CLIENTE ELECTRA OBS', fabric: 'ACR NEGRO',
      structureColor: 'BLANCO', sameFabric: true,
      awnings: [{
        id: 'electra-b', of: '0227010', model: 'ELECTRA', units: 1,
        width: 345, projection: 260, valanceHeight: 0,
        submodel: 'SIN COFRE / CON GUÍA', electraSupport: 'UNIVERSAL 3 AGUJEROS',
        device: 'MAQ. INTERIOR', machineSide: 'M.F.DER', crankHeight: 150,
        placement: 'FRONTAL', structureColor: 'BLANCO',
        curtainHasWindow: false, curtainFinish: 'NORMAL', rotFabric: 'NO', rotValance: 'NO',
        structureNotes: dosObservaciones
      }]
    };
    const calculation = calculateOrder(order);
    // 14 filas desde el 23/09/2026 (sin CASPLAS, que no se consume).
    expect(calculation.ofs[0].despiece.rows).toHaveLength(14);
    expect(calculation.ofs[0].calculation).toMatchObject({ guideLength: 246, valid: true });

    const items = await paginaUno(order, calculation);
    const text = items.map((item) => item.str).join(' ');
    expect(text).toContain('MEDIDA GUÍAS 246');
  });

});

describe('planteamiento IRIS', () => {
  const irisAwning = {
    id: 'iris-a',
    of: '0239999',
    model: 'IRIS',
    units: 1,
    submodel: 'IRIS 110 CON COFRE',
    irisGuideType: 'ESTÁNDAR',
    irisGuideFixing: 'PARED',
    irisWindBlock: false,
    irisAssumeSquare: true,
    irisFrontTop: 300,
    irisExitLeft: 250,
    device: 'MAQUINA',
    machineSide: 'M.F.DER',
    crankHeight: 150,
    placement: 'FRONTAL',
    structureColor: 'BLANCO',
    wallType: '',
    curtainHasWindow: false,
    rotFabric: 'NO',
    reglasModificadas: false
  };

  test('el IRIS usa su propio croquis', () => {
    const calculation = {
      ofs: [{ awningId: 'iris-a', awningIndex: 0, calculation: { model: 'IRIS' } }]
    };
    const plan = buildPlanteamientoPlan({ awnings: [irisAwning] }, calculation);
    expect(plan.fabricPages.map(({ diagram }) => diagram)).toContain('IRIS');
  });

  test('el croquis IRIS marca la comprobación de diagonales y no el patrón general', async () => {
    const order = {
      orderCode: 'AR26-IRIS-PDF',
      customer: 'CLIENTE IRIS',
      sameFabric: true,
      fabric: heraAcrylic120,
      structureColor: 'BLANCO',
      awnings: [irisAwning]
    };
    const calculation = calculateOrder(order);
    expect(calculation.ofs[0].calculation.valid).toBe(true);

    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => item.str).join(' '));
    }
    const fullText = pageTexts.join(' ');

    // Texto exclusivo de drawIrisDiagram: drawGeneralDiagram (el croquis genérico al
    // que caía IRIS antes de tener croquis propio) nunca lo escribe.
    expect(fullText).toContain('COMPROBAR DIAGONALES · CREMALLERA XL');
    expect(fullText).not.toContain('PATRÓN GENERAL');
  });

  test('el PDF de un pedido IRIS se genera sin errores', async () => {
    const order = {
      orderCode: 'AR26-IRIS-PDF-2',
      customer: 'CLIENTE IRIS',
      sameFabric: true,
      fabric: heraAcrylic120,
      structureColor: 'BLANCO',
      awnings: [irisAwning]
    };
    const calculation = calculateOrder(order);
    expect(calculation.ofs[0].calculation.valid).toBe(true);

    const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    expect(document.numPages).toBeGreaterThanOrEqual(1);
  });
});

describe('maqueta única del planteamiento de telas', () => {
  async function fabricPageText(order) {
    const buffer = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order) });
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await document.getPage(document.numPages);
    return (await page.getTextContent()).items.map((item) => item.str).join(' ');
  }

  // La maqueta del Excel rotula el total en una celda propia ("7,5 ML"); la
  // antigua lo escribía como "REFERENCIA: 7,5 ML". Así se distinguen.
  const oldTotalsPattern = /[A-Z0-9]: [\d.,]+ ML/;

  test.each([
    ['CORTINA', { curtainHasWindow: false, curtainFinish: 'NORMAL', device: 'MOTOR' }],
    ['IRIS', {
      submodel: 'IRIS 110 CON COFRE', irisGuideType: 'ESTÁNDAR', irisGuideFixing: 'PARED', irisWindBlock: false,
      irisAssumeSquare: true, irisFrontTop: 300, irisExitLeft: 250, device: 'MAQUINA', machineSide: 'M.F.DER',
      crankHeight: 150, curtainHasWindow: false
    }],
    ['BAMBALINA', { valanceHeight: 30, valanceCurve: 'RECTA' }],
    ['ENROLLABLE', {}]
  ])('%s usa la misma maqueta que el Arzua y conserva su dibujo', async (model, extra) => {
    const text = await fabricPageText({
      orderCode: 'AR26-MAQUETA', fabric: 'ACR NEGRO', sameFabric: true, rotTela: 'NO', rotBamba: 'NO',
      awnings: [{ id: 'a', of: '0239001', model, units: 1, width: 300, projection: 250, valanceHeight: 0, placement: 'FRONTAL', structureColor: 'BLANCO', ...extra }]
    });

    expect(text).toContain('PAÑO TOTAL NECESARIO');
    expect(text).toContain('DATOS BÁSICOS');
    expect(text).not.toMatch(oldTotalsPattern);
  });

  test('la cota suelo-ventana resta 18 cm en Cortina y no en Cambio de cortina (Iván, 22/09/2026)', async () => {
    const windowAwning = {
      id: 'a', of: '0239002', units: 1, width: 240, projection: 285, valanceHeight: 0,
      rotFabric: 'NO', curtainHasWindow: true, curtainFinish: 'NORMAL',
      curtainWindowExit: 200, curtainWindowCorner: 30, curtainWindowFloorHeight: 90, curtainWindowHeight: 110
    };
    const order = (awning) => ({
      orderCode: 'AR26-VENTANA', fabric: 'ACR NEGRO', sameFabric: true, rotTela: 'NO', rotBamba: 'NO', awnings: [awning]
    });

    const change = await fabricPageText(order({ ...windowAwning, model: 'CAMBIO CORTINA' }));
    const full = await fabricPageText(order({
      ...windowAwning, model: 'CORTINA', device: 'MOTOR', structureColor: 'BLANCO', placement: 'FRONTAL'
    }));

    expect(change).not.toMatch(/\b72\b/);
    expect(full).toMatch(/\b72\b/);

    const fullWithoutDeduction = await fabricPageText(order({
      ...windowAwning, model: 'CORTINA', device: 'MOTOR', structureColor: 'BLANCO', placement: 'FRONTAL', curtainSkipBottomDeduction: true
    }));
    expect(fullWithoutDeduction).not.toMatch(/\b72\b/);
  });

  test('Cambio de cortina sin ventana lo dice en el dibujo y pone sus medidas (Iván, 22/09/2026)', async () => {
    const text = await fabricPageText({
      orderCode: 'AR26-SINVENTANA', fabric: 'ACR NEGRO', sameFabric: true, rotTela: 'NO', rotBamba: 'NO',
      awnings: [{
        id: 'a', of: '0239003', model: 'CAMBIO CORTINA', units: 1, width: 113, projection: 235, valanceHeight: 0,
        rotFabric: 'NO', curtainHasWindow: false, curtainFinish: 'VELCRO'
      }]
    });

    expect(text).toContain('CORTINA · SIN VENTANA · VELCRO');
    expect(text).toMatch(/FRENTE:\s+113/);
    expect(text).toMatch(/SALIDA:\s+235/);
    expect(text).toMatch(/ALTURA VELCRO:\s+243/);
  });

  test('la bamba de una cortina lleva varilla blanca arriba y B.N(3) abajo, como el dibujo del maestro', async () => {
    const text = await fabricPageText({
      orderCode: 'AR26-BAMBA-CORTINA', fabric: 'ACR NEGRO', sameFabric: true, rotTela: 'NO', rotBamba: 'NO',
      awnings: [{
        id: 'a', of: '0239004', model: 'CAMBIO CORTINA', units: 1, width: 240, projection: 285, valanceHeight: 20,
        valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO', curtainHasWindow: true, curtainFinish: 'NORMAL',
        curtainWindowExit: 200, curtainWindowCorner: 30, curtainWindowFloorHeight: 90, curtainWindowHeight: 110
      }]
    });

    expect(text.match(/VARILLA BLANCA \(5,5\)/g)).toHaveLength(2);
    expect(text).toContain('B.N(3)');
  });

  test('el nombre del dibujo de cortina sale una sola vez, completo, en la cabecera', async () => {
    const text = await fabricPageText({
      orderCode: 'AR26-NOMBRE', fabric: 'ACR NEGRO', sameFabric: true, rotTela: 'NO', rotBamba: 'NO',
      awnings: [{
        id: 'a', of: '0239007', model: 'CAMBIO CORTINA', units: 1, width: 300, projection: 250, valanceHeight: 0,
        rotFabric: 'NO', curtainHasWindow: false, curtainFinish: 'TUBO'
      }]
    });

    expect(text.match(/CORTINA · SIN VENTANA · TUBO/g)).toHaveLength(1);
    expect(text).not.toContain('CORTINA TUBO');
  });

  test.each([
    // El nombre completo va en la cabecera y el dibujo no lo repite. En
    // Enrollable la etiqueta de la fila coincide con el nombre: dos en total.
    ['BAMBALINA', { projection: 0, valanceHeight: 30, valanceCurve: 'RECTA' }, 'BAMBALINA · RECTA', 1],
    ['CAMBIO ANTICA', { anticaVariant: 'SOPORTE FIJO 3 AGUJEROS', valanceHeight: 20, valanceCurve: 'RECTA' }, 'CAMBIO ANTICA', 1],
    ['ENROLLABLE', {}, 'ENROLLABLE', 2]
  ])('%s: el nombre del dibujo sale una sola vez', async (model, extra, heading, expected) => {
    const text = await fabricPageText({
      orderCode: 'AR26-UNA-VEZ', fabric: 'ACR NEGRO', sameFabric: true, rotTela: 'NO', rotBamba: 'NO',
      awnings: [{ id: 'a', of: '0239008', model, units: 1, width: 300, projection: 250, valanceHeight: 0, rotFabric: 'NO', rotValance: 'NO', ...extra }]
    });

    const items = text.split(/\s{2,}/).map((item) => item.trim());
    expect(items.filter((item) => item === heading)).toHaveLength(expected);
  });

  test('la cabecera del dibujo dice qué es, no "GENERAL" (Iván, 22/09/2026)', async () => {
    const text = await fabricPageText({
      orderCode: 'AR26-CABECERA', fabric: 'ACR NEGRO', sameFabric: true, rotTela: 'NO', rotBamba: 'NO',
      awnings: [{ id: 'a', of: '0239005', model: 'CAMBIO TELA', units: 1, width: 300, projection: 250, valanceHeight: 0, rotFabric: 'NO' }]
    });

    expect(text).toContain('CAMBIO DE TELA');
    expect(text).not.toContain('GENERAL');
  });

  test('Cambio de cortina: varilla arriba por defecto; remachado lleva bastilla (Iván, 22/09/2026)', async () => {
    const awning = {
      id: 'a', of: '0239006', model: 'CAMBIO CORTINA', units: 1, width: 113, projection: 235, valanceHeight: 0,
      rotFabric: 'NO', curtainHasWindow: false, curtainFinish: 'NORMAL'
    };
    const order = (item) => ({ orderCode: 'AR26-ARRIBA', fabric: 'ACR NEGRO', sameFabric: true, rotTela: 'NO', rotBamba: 'NO', awnings: [item] });

    const rod = await fabricPageText(order(awning));
    const riveted = await fabricPageText(order({ ...awning, curtainTopFinish: 'REMACHADO' }));

    expect(rod).toContain('VARILLA NEGRA (5,09) EN PVC');
    expect(rod).toContain('B.N(4)');
    expect(rod).not.toContain('PARA ENROLLAR EN TUBO');
    expect(riveted).toContain('REMACHADO · BASTILLA ARRIBA');
    expect(riveted).not.toContain('VARILLA NEGRA (5,09) EN PVC');
  });

  test('con bamba en otra tela, el paño total es la suma ya hecha, no "a + b"', async () => {
    const text = await fabricPageText({
      orderCode: 'AR26-SUMA', sameFabric: true, rotTela: 'NO', rotBamba: 'NO',
      fabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL NEGRO 2170|||ACRILICA (LONA)',
      awnings: [{
        id: 'a', of: '0228363', model: 'CAMBIO TELA', units: 1, width: 245, projection: 227,
        valanceHeight: 25, valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO',
        valanceFabric: 'ACRILI2359P120|||120|||LONA ACRILICA 2359|||ACRILICA (LONA)'
      }]
    });

    expect(text).not.toMatch(/\d \+ \d/);
    // Cuerpo: 3 paños de 2,67 = 8,01; bamba: 3 paños de 0,30 = 0,9.
    expect(text).toMatch(/8,9 ML/);
  });

  test('con telas distintas por toldo, cada fila indica su tela', async () => {
    const base = { units: 1, width: 300, projection: 250, valanceHeight: 0 };
    const text = await fabricPageText({
      orderCode: 'AR26-VARIAS', sameFabric: false,
      awnings: [
        { ...base, id: 'a', of: '0239002', model: 'CAMBIO TELA', fabric: 'ACR NEGRO' },
        { ...base, id: 'b', of: '0239003', model: 'CAMBIO TELA', fabric: 'PVC-AUDIT|||300|||PVC VERDE DE PRUEBA|||PVC' }
      ]
    });

    expect(text).toContain('VARIAS TELAS');
    expect(text).toContain('TELA PVC VERDE DE PRUEBA');
  });
});
