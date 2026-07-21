import { calculateAgataBox } from '../src/domain/agataBoxRules.js';
import { defaultAgataBoxParameters } from '../src/domain/agataBoxParameters.js';

const order = {
  sameFabric: true,
  fabric: 'ACRILI2143P120',
  structureColor: 'BLANCO',
  parameters: { agataBox: defaultAgataBoxParameters }
};

const cases = [
  { order: 'AR2603035', width: 717, projection: 400, valanceHeight: 25, submodel: 'OPEN', device: 'MOTOR', arms: 3, fabric: 704, drop: 470, roll: 705, supports: 5, motor: '85/17' },
  { order: 'AR2602591', width: 575, projection: 400, valanceHeight: 25, submodel: 'OPEN', device: 'MAQUINA', arms: 2, fabric: 560.8, drop: 470, roll: 561.8, supports: 4, motor: '' },
  { order: 'AR2602461', width: 555, projection: 400, valanceHeight: 30, submodel: 'OPEN', device: 'MAQUINA', arms: 2, fabric: 540.8, drop: 475, roll: 541.8, supports: 4, motor: '' },
  { order: 'AR2601609', width: 650, projection: 200, valanceHeight: 0, submodel: 'COFRE', device: 'MOTOR', arms: 3, fabric: 637, drop: 245, roll: 638, supports: 6, motor: '55/17' },
  { order: 'AR2505527', width: 1145, projection: 350, valanceHeight: 25, submodel: 'SEMICLOSE', device: 'MOTOR', arms: 4, fabric: 1132, drop: 420, roll: 1131.8, supports: 11, motor: '100/17' },
  { order: 'AR2502907', width: 800, projection: 300, valanceHeight: 0, submodel: 'SEMIOPEN', device: 'MOTOR', arms: 3, fabric: 787, drop: 345, roll: 786.8, supports: 7, motor: '70/17' },
  { order: 'AR2502004', width: 1040, projection: 275, valanceHeight: 0, submodel: 'COFRE', device: 'MOTOR', arms: 4, fabric: 1027, drop: 320, roll: 1028, supports: 10, motor: '85/17' },
  { order: 'AR2500296', width: 780, projection: 350, valanceHeight: 0, submodel: 'COFRE', device: 'MOTOR', arms: 3, fabric: 767, drop: 395, roll: 768, supports: 7, motor: '85/17' }
];

const mismatches = [];
for (const sample of cases) {
  const result = calculateAgataBox({
    order,
    awning: {
      id: sample.order, of: sample.order.slice(4), model: 'AGATA BOX', units: 1,
      width: sample.width, projection: sample.projection, valanceHeight: sample.valanceHeight,
      structureColor: 'BLANCO', device: sample.device, placement: 'FRONTAL',
      submodel: sample.submodel, armCount: sample.arms, sensor: 'SIN SENSOR',
      crankHeight: sample.device === 'MAQUINA' ? 200 : 0, wallType: '', reglasModificadas: false
    }
  });
  const checks = {
    fabricWidth: [sample.fabric, result.calculation.fabricWidth],
    fabricDrop: [sample.drop, result.calculation.fabricDrop],
    rollTubeLength: [sample.roll, result.calculation.rollTubeLength],
    supportCount: [sample.supports, result.calculation.supportCount],
    motorPower: [sample.motor, result.calculation.motorPower]
  };
  for (const [field, [expected, actual]] of Object.entries(checks)) {
    if (typeof expected === 'number' ? Math.abs(expected - Number(actual)) > 0.051 : expected !== actual) {
      mismatches.push({ order: sample.order, field, expected, actual });
    }
  }
}

console.log(JSON.stringify({ productionCases: cases.length, checks: cases.length * 5, mismatchCount: mismatches.length, mismatches }, null, 2));
if (mismatches.length) process.exitCode = 1;
