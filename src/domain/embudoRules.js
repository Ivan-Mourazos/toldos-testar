import { resolveFabric } from './fabricCatalog.js';
import { normalizeEmbudo, embudoIssues } from './embudoConfiguration.js';
import { piezasEmbudo } from './corteLona/embudo.js';
import { colocar } from './corteLona/colocacion.js';

export { normalizeEmbudo, embudoIssues } from './embudoConfiguration.js';

export function calculateEmbudo({ order, awning }) {
  const e = normalizeEmbudo(awning.embudo), fabric = resolveFabric(order.sameFabric !== false ? order.fabric : awning.fabric);
  const diagnostics = [], error = (message) => diagnostics.push({ level: 'error', awningId: awning.id, message });
  if (!fabric || fabric.material?.trim().toUpperCase() !== 'PLASTICA (LONA)') error('El embudo necesita una lona de PVC del catálogo.');
  const issues = embudoIssues(e);
  if (issues.length) error(`EMBUDO incompleto en OF ${awning.of}: indica ${issues.map(i => i.label).join(', ')}.`);
  let ml = 0, panels = 0;
  if (!issues.length && fabric) {
    try {
      const piezas = piezasEmbudo({ embudo: e });
      const todas = Array.from({ length: awning.units || 1 }, () => piezas).flat();
      const colocadas = colocar(todas, fabric.width * 10);
      ml = Math.ceil(Math.max(...colocadas.map(p => p.x + p.ancho)) / 10) / 100;
      panels = piezas.length;
    } catch (err) { error(err.message); }
  }
  // Iván, 28/10/2026: «son PVC, no se reserva». Ni lona, ni cinta, ni herrajes.
  return { of: awning.of, description: `EMBUDO ${e.forma} · ${e.alto ?? '—'} cm`, materials: [], despiece: null, diagnostics,
    calculation: { model: 'EMBUDO', valid: diagnostics.length === 0, minimumLine: 0,
      width: e.contornoArriba || 0, projection: e.alto || 0, fabricWidth: e.contornoArriba || 0,
      fabricDrop: e.alto || 0, fabricRollWidth: fabric?.width || 0, fabricCode: fabric?.code || '',
      fabricDescription: fabric?.description || '', fabricMl: ml, totalFabricMl: ml, mainFabricMl: ml,
      fabricPanels: panels, mainFabricPanels: panels, valanceFabricCode: '', valanceFabricDescription: '',
      valanceFabricWidth: 0, valanceFabricMl: 0, valanceFabricPanels: 0, valanceDrop: 0, structureLength: 0, stockLength: 0,
      reservedFabricMl: 0, totalReservedFabricMl: 0 } };
}
