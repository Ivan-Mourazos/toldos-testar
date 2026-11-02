import { models } from '../../src/domain/catalog.js';
import { exampleAwning, webDrawingVariants } from '../../src/domain/drawingCatalog.js';
import { normalizeOrder } from '../../src/domain/validation.js';
import { getFabricPatternDiagram, SVG_FABRIC_DIAGRAMS } from '../../src/domain/planteamientoPdf.js';

// Casos comunes al contraste SVG/pdfkit y a la comprobación de retirada de trazados.
export function casosContrasteDibujos() {
const muestras = [];
const agregar = (id, diagram, awning, calculation = { fabricWidth: 400, fabricDrop: 275 }) => {
  muestras.push({ id: id.replace(/[^a-z0-9-]/gi, '-'), diagram, awning, calculation });
};
for (const { code } of models) {
  for (const variante of webDrawingVariants(code).filter(v => v.webDrawing)) {
    const [awning] = normalizeOrder({ awnings: [exampleAwning(variante)] }).awnings;
    agregar(`catalogo-${code}-${variante.id}`, getFabricPatternDiagram(awning), awning);
  }
}
for (const diagram of SVG_FABRIC_DIAGRAMS) {
  for (const [nombre, medida, bamba] of [['normal', 400, 25], ['minimo', 50, 0], ['extremo', 1200.9, 120.5]]) {
    agregar(`reparto-${diagram}-${nombre}`, diagram, {
      model: diagram.startsWith('CORTINA') ? 'ELECTRA' : 'CAMBIO TELA', width: medida, projection: medida,
      valanceHeight: bamba, valanceCurve: nombre === 'extremo' ? 'EXTRASUAVE' : 'RECTA',
      armConfiguration: nombre === 'extremo' ? 'CROSSED' : '',
      tubeLoad: nombre === 'extremo' ? 'TUBO DE CARGA · RÓTULO MUY LARGO PARA COMPROBAR LA PARTICIÓN DE LÍNEAS' : '',
      curtainWindowCorner: medida / 8, curtainWindowHeight: medida / 2, curtainWindowFloorHeight: medida / 4,
      curtainWindowExit: medida, anticaVariant: nombre === 'extremo' ? 'TUBO 50X30 CONTRAPESO' : 'SOPORTE FIJO 3 AGUJEROS',
      anticaSupportHeight: 75.5, heraInteriorFace: 'REVÉS', submodel: nombre === 'extremo' ? 'COFRE CON VARILLA' : ''
    }, { fabricWidth: medida, fabricDrop: medida * 0.8 });
  }
}
// Ramas que no ofrece la selección general de Parámetros.
for (const curva of ['RECTA', 'NORMAL', 'SUAVE', 'EXTRASUAVE']) {
  for (const separado of [false, true]) agregar(`general-${curva}-${separado}`, 'GENERAL', {
    model: 'CAMBIO TELA', valanceHeight: 30.5, valanceCurve: curva, valanceFabric: separado ? 'OTRA TELA' : ''
  });
}
for (const forma of ['RECTO', 'CONICO']) agregar(`embudo-${forma}`, 'EMBUDO', {
  units: 4, embudo: { forma, contornoArriba: 400.5, contornoAbajo: 800.5, alto: 250.5 }
});
for (const bastilla of [true, false]) agregar(`solapas-${bastilla}`, 'SOLAPAS', { bastilla, solapas: [{ ancho: 50, alto: 250 }] });
for (const lado of ['DERECHO', 'REVÉS']) agregar(`hera-${lado}`, 'HERA', { heraInteriorFace: lado });
for (const ventana of [true, false]) agregar(`iris-${ventana}`, 'IRIS', {
  model: 'IRIS', submodel: 'IRIS 110 CON COFRE', irisGuideType: 'COMPENSADORA',
  irisAssumeSquare: false, irisFrontTop: 355, irisFrontBottom: 350, irisExitLeft: 400, irisExitRight: 405,
  irisDiagonal1: 533.1, irisDiagonal2: 537, curtainHasWindow: ventana,
  curtainWindowHeight: 150, curtainWindowFloorHeight: 70
}, { fabricWidth: 355, guideLeftLength: 398.5, guideRightLength: 403.5 });

return muestras;
}
