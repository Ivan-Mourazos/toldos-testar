import { mkdir, writeFile } from 'node:fs/promises';
import { buildOrderPlanteamientoPdf } from '../src/domain/planteamientoPdf.js';

const outputDirectory = new URL('../tmp/pdfs/', import.meta.url);

const samples = [
  sample('arzua', 'ARZUA PRO', { tubeLoad: 'TUBO DE CARGA EVO 80' }),
  sample('galicia', 'GALICIA', { tubeLoad: 'TUBO DE CARGA UNIVERS 280', armCount: 3 }),
  sample('xacobeo', 'XACOBEO'),
  sample('monoblock', 'MONOBLOCK 350', { armCount: 3 }),
  sample('punto', 'PUNTO RECTO', { armCount: 2, rollSystem: 'P701' }),
  sample('cuarzo', 'CUARZO BOX'),
  sample('perla', 'PERLA BOX'),
  sample('coral', 'CORAL BOX'),
  sample('ambar', 'AMBAR BOX'),
  sample('agata', 'AGATA BOX', { submodel: 'COFRE', armCount: 3 }),
  sample('maxis', 'MAXISCREEM', { submodel: 'COFRE CON VARILLA' }),
  sample('cambio', 'CAMBIO TELA'),
  sample('antica-fijo', 'CAMBIO ANTICA', { anticaVariant: 'SOPORTE FIJO 3 AGUJEROS' }),
  sample('antica-30', 'CAMBIO ANTICA', { anticaVariant: 'TUBO 30X10' }),
  sample('antica-contrapeso', 'CAMBIO ANTICA', { anticaVariant: 'TUBO 50X30 CONTRAPESO' })
];

const order = {
  orderCode: 'MUESTRA-DIBUJOS',
  customer: 'OFICINA TECNICA',
  technician: 'IVAN',
  reviewer: 'REVISION',
  orderDate: '2026-07-22',
  fabric: 'ACRILI2143P120|||120|||ACR MARFIL',
  structureColor: 'BLANCO',
  remate: 'COMO TELA',
  awnings: samples.map(({ awning }) => awning)
};

const calculation = {
  ofs: samples.map(({ awning, calculation }, awningIndex) => ({
    of: awning.of,
    awningId: awning.id,
    awningIndex,
    description: awning.model,
    materials: [],
    despiece: { rows: [], anchoring: null },
    calculation
  }))
};

await mkdir(outputDirectory, { recursive: true });
const pdf = await buildOrderPlanteamientoPdf({ order, calculation });
const outputPath = new URL('catalogo-dibujos-modelos.pdf', outputDirectory);
await writeFile(outputPath, pdf);
console.log(outputPath.pathname);

function sample(id, model, overrides = {}) {
  const awning = {
    id,
    of: `OF-${id.toUpperCase()}`,
    model,
    units: 1,
    width: 450,
    projection: 250,
    valanceHeight: 25,
    valanceCurve: 'RECTA',
    device: 'MOTOR',
    placement: 'FRONTAL',
    ...overrides
  };
  return {
    awning,
    calculation: {
      valid: true,
      fabricWidth: 437,
      fabricDrop: 320,
      fabricPanels: 4,
      fabricMl: 12.8,
      fabricCode: 'ACRILI2143P120',
      armCount: overrides.armCount || 2,
      tubeLoad: overrides.tubeLoad,
      rollSystem: overrides.rollSystem,
      submodel: overrides.submodel
    }
  };
}
