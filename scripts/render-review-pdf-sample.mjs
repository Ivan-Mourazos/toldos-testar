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
  fabric: 'ACRILI2038P120|||120|||LONA ACRILICA MASACRIL 300 BEIGE 2038',
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
    id: 'enrollable-b',
    of: '3300002',
    model: 'ENROLLABLE',
    units: 2,
    width: 180,
    projection: 230,
    valanceHeight: 0,
    rotFabric: 'NO',
    fabricNotes: 'Dos unidades iguales.'
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
