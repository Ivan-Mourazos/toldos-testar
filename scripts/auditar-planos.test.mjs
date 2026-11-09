import { expect, it } from 'vitest';
import { generarMuestras } from './lib/muestras-planos.mjs';

it('genera los ocho modelos con corte y las demás familias desde fuentes locales existentes', async () => {
  const r = await generarMuestras();
  expect(r.excluidas.filter(e => e.ejemplo)).toEqual([]);
  for (const modelo of r.modelosConCorte) expect(r.muestras.some(p => p.familia === `Toldos / ${modelo}`), modelo).toBe(true);
  for (const familia of ['BAMBALINAS', 'Portanova Enrollable', 'Portanova Plegable', 'Portanova Apilable', 'Portanova Autorreparable', 'Araujo', 'Santa Pau', 'System Dock', 'REMOLCAR_ECONOMICO', 'REMOLCAR_ESTANDAR', 'CAL_MEDIDAS', 'ASSA'])
    expect(r.muestras.some(p => p.familia.includes(familia)), familia).toBe(true);
  expect(r.muestras.every(p => p.fuente && p.dxf.includes('AC1032'))).toBe(true);
  expect(r.excluidas.map(e => e.familia)).toContain('FALDONES');
}, 30000);
