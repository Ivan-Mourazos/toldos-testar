import fs from 'node:fs/promises';
import path from 'node:path';
import { calculateOrder } from '../src/domain/rules.js';
import { buildOrderReviewPdf } from '../src/domain/reviewPdf.js';
import { createReviewPackage } from '../src/workflow.js';

const order = {
  orderCode: 'AR26MUESTRA',
  customer: 'CLIENTE DE REVISION',
  orderDate: '2026-08-07',
  technician: 'IVAN',
  reviewer: 'TAMARA',
  fabric: 'ALPHAAM03P250|||250|||PVC 580 AMARILLO 1003',
  sameFabric: true,
  notes: 'Documento generado para comprobar el circuito provisional de revision.',
  awnings: [{
    id: 'perla-a',
    of: '0230460',
    model: 'PERLA BOX',
    units: 1,
    width: 295,
    projection: 200,
    valanceHeight: 25,
    valanceCurve: 'RECTA',
    remate: '',
    structureColor: 'BLANCO',
    rotFabric: 'NO',
    rotValance: 'NO',
    device: 'MAQUINA',
    machineSide: 'M.F.DER',
    crankHeight: 120,
    placement: 'FRONTAL',
    wallType: 'DIRECTA A PARED',
    structureNotes: 'Confirmar altura de colocacion antes de fabricar.',
    fabricNotes: 'Bambalina recta y remate como tela.'
  }, {
    id: 'perla-b',
    of: '0230461',
    model: 'PERLA BOX',
    units: 1,
    width: 310,
    projection: 250,
    valanceHeight: 25,
    valanceCurve: 'RECTA',
    remate: '',
    structureColor: 'BLANCO',
    rotFabric: 'NO',
    rotValance: 'NO',
    device: 'MAQUINA',
    machineSide: 'M.F IZQ',
    crankHeight: 120,
    placement: 'TECHO',
    wallType: 'ENTRE PAREDES',
    structureNotes: 'Segundo toldo completo para comprobar la paginacion.',
    fabricNotes: 'Tejido PVC no acrilico.'
  }]
};

const calculation = calculateOrder(order);
const review = createReviewPackage({ order, calculation });
const pdf = await buildOrderReviewPdf({ order, calculation, review });
const outputDirectory = path.resolve('output', 'pdf');
const outputPath = path.join(outputDirectory, 'AR26MUESTRA.pdf');
await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(outputPath, pdf);
console.log(outputPath);
