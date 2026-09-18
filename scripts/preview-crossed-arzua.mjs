// Generación local de una muestra; no consulta ni escribe en RPS.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { calculateOrder } from '../src/domain/rules.js';
import { buildOrderPlanteamientoPdf } from '../src/domain/planteamientoPdf.js';
const order = {
  orderCode: 'MUESTRA-CRUZADOS', sameFabric: true, structureColor: 'GRIS 7016',
  fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA',
  awnings: [{ id: 'sample', of: 'MUESTRA', model: 'ARZUA PRO', units: 1, width: 210, projection: 200,
    armCount: 2, armConfiguration: 'CROSSED', crossedAdditionalTerminals: true,
    device: 'MAQ. EXTERIOR', crankHeight: 150, machineSide: 'M.F.DER',
    tubeLoad: 'TUBO DE CARGA EVO 80', supportSystem: 'ARZUA', structureColor: 'GRIS 7016',
    structureNotes: 'MUESTRA · terminales adicionales elegidos solo para comprobar impresión.' }]
};
const calculation = calculateOrder(order);
if (!calculation.ofs[0]?.calculation.valid) throw new Error(JSON.stringify(calculation.diagnostics));
const file = join(tmpdir(), 'arzua-crossed-preview.pdf');
await writeFile(file, await buildOrderPlanteamientoPdf({ order, calculation }));
console.log(file);
