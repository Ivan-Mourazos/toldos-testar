import fs from 'node:fs/promises';
import path from 'node:path';
import { buildOrderPlanteamientoPdf } from '../src/domain/planteamientoPdf.js';

const awning = {
  id: 'cambio-tela-generico',
  of: '0239999',
  model: 'CAMBIO TELA',
  units: 1,
  width: 401,
  projection: 315,
  valanceHeight: 27,
  valanceCurve: 'NORMAL',
  valanceFabric: '',
  rotFabric: 'NO',
  rotValance: 'NO',
  remate: 'COMO TELA'
};

const order = {
  orderCode: 'AR26-GENERICO',
  customer: 'MUESTRA PATRON GENERICO',
  orderDate: '2026-09-16',
  technician: 'IVAN',
  reviewer: 'REVISION',
  fabric: 'ACRILI2250P120|||120|||ACR MARFIL',
  sameFabric: true,
  notes: '',
  awnings: [awning]
};

const calculation = {
  ofs: [{
    awningId: awning.id,
    awningIndex: 0,
    of: awning.of,
    description: awning.model,
    materials: [],
    despiece: { rows: [], anchoring: null },
    calculation: {
      valid: true,
      fabricWidth: 401,
      fabricDrop: 347,
      fabricPanels: 4,
      fabricMl: 13.88,
      totalFabricMl: 13.88,
      fabricCode: 'ACRILI2250P120',
      fabricDescription: 'ACR MARFIL'
    }
  }]
};

const outputDirectory = path.resolve('output', 'pdf');
const outputPath = path.join(outputDirectory, 'muestra-patron-generico.pdf');
await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(outputPath, await buildOrderPlanteamientoPdf({ order, calculation }));
console.log(outputPath);
