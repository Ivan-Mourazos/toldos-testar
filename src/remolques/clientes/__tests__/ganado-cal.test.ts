import { describe, expect, it } from 'vitest';
import { emptyGanado } from '../../entradas-vacias.ts';
import { MEDIDAS_CAL_5319 } from '../../ganado/medidas.ts';
import { aplicarFichaAlImportar } from '../aplicar.ts';
import { validarFichas } from '../reglas.ts';
import type { GanadoInput } from '../../calc/ganado.ts';
import type { LineaPedido } from '../../workspace/lineas.ts';

const ficha = { id: 'talleres-cal', nombre: 'TALLERES CAL', codigosRps: ['016573'], refuerzoMfdCal: true };
const linea = (input: GanadoInput): LineaPedido => ({ tipo: 'ganado', version: '10', input });
describe('Refuerzo MFD de la ficha de Cal', () => {
  it('propone el refuerzo en Cal y conserva una decisión explícita del técnico', () => {
    const entrada = linea(emptyGanado('CAL_MEDIDAS'));
    const r = aplicarFichaAlImportar(entrada, ficha);
    expect((r.input as GanadoInput).medidasCal?.refuerzoMfd).toBe(true);
    expect(r.delCliente?.campos).toContain('medidasCal');
    const decidido = linea({ ...emptyGanado('CAL_MEDIDAS'), medidasCal: { ...MEDIDAS_CAL_5319, refuerzoMfd: false } });
    expect(aplicarFichaAlImportar(decidido, ficha)).toBe(decidido);
    const otro = linea(emptyGanado('REMOLCAR_ESTANDAR'));
    expect(aplicarFichaAlImportar(otro, ficha)).toBe(otro);
  });
  it('solo admite sí o no al guardar la opción', () => {
    expect(validarFichas([ficha], { recogidasGenerales: [] }).ok).toBe(true);
    expect(validarFichas([{ ...ficha, refuerzoMfdCal: 'sí' }], { recogidasGenerales: [] }).ok).toBe(false);
  });
});
