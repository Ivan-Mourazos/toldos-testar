import { expect, test } from 'vitest';
import { buildFabricDiagramSvg } from './planteamientoPdf.js';
// Los planos CAD de AR2605116-2 p3, AR2605193-2 p1 y AR2605244-1 p1 rotulan 4,5.
// El 5,09 heredado de la miniatura no corresponde a la varilla del plano de corte.
test.each(['CORTINA-VENTANA', 'TOLDO-VELCRO'])('%s: rotula la varilla negra de 4,5 mm del taller', diagram => {
  const datos = buildFabricDiagramSvg({ diagram, awning: { model: 'CORTINA', width: 500, projection: 284, curtainHasWindow: true, curtainFinish: 'NORMAL', curtainWindowCorner: 100, curtainWindowHeight: 137, curtainWindowFloorHeight: 75, valanceHeight: 20 } });
  const textos = datos.nodes.map(n => n.text || '').join(' ');
  expect(textos).toContain('VARILLA NEGRA (4,5) EN PVC');
  expect(textos).not.toContain('5,09');
});
