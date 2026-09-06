import { describe, expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  awningLetter,
  buildFabricLineDetail,
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

  test('el PDF Electra incluye guías, retenedor y medida de guías en el despiece', async () => {
    const order = {
      orderCode: 'AR2601519', customer: 'CLIENTE ELECTRA', fabric: 'ACR NEGRO',
      structureColor: 'BLANCO', sameFabric: true,
      awnings: [{
        id: 'electra-a', of: '0227009', model: 'ELECTRA', units: 1,
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
    expect(text).toContain('MEDIDA GUÍAS 246');
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
    expect(pageTexts[2]).toContain('SUPLEMENTO CON BROCHES');
    expect(pageTexts[2]).toContain('3 CM POR ENCIMA DE LA ONDA');
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
    expect(agataCalculation.ofs[0].despiece.rows).toHaveLength(20);
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

  test('Ágata Box con sus veinte filas de despiece (el máximo real) las imprime todas', async () => {
    const order = buildAgataBoxTwentyRowOrder();
    const calculation = calculateOrder(order);
    const despieceRows = calculation.ofs[0].despiece.rows;

    // Esta es justo la invariante que generaliza drawDespieceTable: con las veinte
    // filas que antes venían fijas, la tabla debe seguir imprimiéndolas todas y el
    // resto del layout (bloques de abajo) no debe perder ni recortar ninguna.
    expect(despieceRows).toHaveLength(20);

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

  test('avisa cuando el texto no cabe en lugar de cortarlo en silencio', async () => {
    const largo = Array.from({ length: 40 }, (_, i) => `OBSERVACION NUMERO ${i + 1} CON TEXTO SUFICIENTE PARA NO CABER`).join('\n');
    const [estructura] = await textoDeLaHoja(pedidoArzua(largo));
    expect(estructura).toContain('(sigue en el pedido)');
  });

  test('sin hueco bajo el anclaje, las observaciones vuelven a la caja estrecha de la derecha y avisan del corte', async () => {
    // ÁGATA BOX COFRE/MOTOR 250x150 es el mismo pedido de veinte filas de despiece
    // que usa buildAgataBoxTwentyRowOrder mas arriba: llena la tabla y deja el
    // hueco de las observaciones en 0 pt, forzando la rama del else en
    // drawStructurePage (la caja de 164x35,53 en rightX/336, no la banda ancha).
    const order = buildAgataBoxTwentyRowOrder();
    order.notes = CUATRO_OBSERVACIONES;
    order.awnings[0].structureNotes = CUATRO_OBSERVACIONES;
    const calculation = calculateOrder(order);
    expect(calculation.ofs[0].despiece.rows).toHaveLength(20);

    const [estructura, items] = await (async () => {
      const buffer = await buildOrderPlanteamientoPdf({ order, calculation });
      const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
      const page = await document.getPage(1);
      const content = await page.getTextContent();
      return [content.items.map((item) => item.str).join(' '), content.items];
    })();

    // La caja pequeña sólo tiene ~35,53 pt de alto: ni la primera observación
    // completa cabe entera, así que el aviso de corte tiene que aparecer.
    expect(estructura).toContain('(sigue en el pedido)');

    // Y el rótulo "Observaciones:" tiene que estar en la columna derecha
    // (rightX = 417.28 + 4 de relleno interior = 421.28 medido), no en la banda
    // ancha de la izquierda (margin = 14).
    const label = items.find((item) => item.str === 'Observaciones:');
    expect(label).toBeDefined();
    expect(label.transform[4]).toBeGreaterThan(300);
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
