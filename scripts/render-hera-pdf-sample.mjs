import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { calculateOrder } from '../src/domain/rules.js';
import { buildOrderPlanteamientoPdf } from '../src/domain/planteamientoPdf.js';
import { buildOrderReviewPdf } from '../src/domain/reviewPdf.js';
import { createReviewPackage } from '../src/workflow.js';

const soltis = 'SOLTIS96NUBP267|||267|||SOLTIS 96 NUBE|||SOLTIS 96';
const acrylic = 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR';

const order = {
  orderCode: 'AR26HERA-MUESTRA',
  customer: 'MUESTRA INTERNA HERA',
  orderDate: '2026-08-11',
  technician: 'IVÁN',
  reviewer: 'TAMARA',
  sameFabric: false,
  fabric: '',
  notes: 'Muestra técnica del mini planteamiento HERA previo al desarrollo CAD.',
  awnings: [{
    id: 'hera-56-machine',
    of: '0231000',
    model: 'HERA',
    submodel: 'HERA 56 MAQUINA',
    heraJoin: 'NINGUNO',
    units: 1,
    width: 163.5,
    projection: 165,
    height: 230,
    fabric: soltis,
    fabricNotes: 'Caso dimensional equivalente a AR.24.00727.'
  }, {
    id: 'hera-43-machine',
    of: '0231001',
    model: 'HERA',
    submodel: 'HERA 43 MAQUINA',
    heraJoin: 'VERTICAL',
    units: 1,
    width: 205,
    projection: 140,
    height: 240,
    fabric: acrylic,
    fabricNotes: 'Acrílico: bastillas laterales y empate indicados en el corte.'
  }, {
    id: 'hera-56-motor-special',
    of: '0231002',
    model: 'HERA',
    submodel: 'HERA 56 MOTOR',
    heraJoin: 'VERTICAL',
    units: 1,
    width: 320,
    projection: 160,
    height: null,
    fabric: soltis,
    fabricNotes: 'Frente superior a 300 cm: tubo especial y revisión de presupuesto.'
  }]
};

const calculation = calculateOrder(order);
const errors = calculation.diagnostics.filter((item) => item.level === 'error');
if (errors.length) throw new Error(errors.map((item) => item.message).join('\n'));

const outputDirectory = path.resolve('output', 'pdf');
const productionPath = path.join(outputDirectory, 'hera-mini-planteamiento.pdf');
const reviewPath = path.join(outputDirectory, 'hera-revision.pdf');
await mkdir(outputDirectory, { recursive: true });
const review = createReviewPackage({ order, calculation });
const [productionPdf, reviewPdf] = await Promise.all([
  buildOrderPlanteamientoPdf({ order, calculation }),
  buildOrderReviewPdf({ order, calculation, review })
]);
await Promise.all([
  writeFile(productionPath, productionPdf),
  writeFile(reviewPath, reviewPdf)
]);
console.log(productionPath);
console.log(reviewPath);
