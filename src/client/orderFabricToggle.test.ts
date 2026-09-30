import { describe, expect, it } from 'vitest';
import { planFabricToggle } from './orderFabricToggle';

const NEGRO = 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 NEGRO 2170|||ACRILICA (LONA)';
const AZUL = 'ACRILI2018P120|||120|||LONA ACRILICA MASACRIL 300 AZUL 2018|||ACRILICA (LONA)';

// Aplica un plan como lo hace OrderView, para comprobar la ida y vuelta.
function apply(state: { fabric: string; sameFabric: boolean; awnings: { id: string; fabric: string }[] }, next: boolean) {
  const plan = planFabricToggle(state, next);
  const awnings = state.awnings.map((awning) => {
    const patch = plan.awningPatches.find((item) => item.id === awning.id);
    return patch ? { ...awning, fabric: patch.fabric } : awning;
  });
  return { fabric: plan.fabric, sameFabric: plan.sameFabric, awnings, conflict: plan.conflict };
}

describe('planFabricToggle · «Por toldo» sin perder la tela (informe tela-0930, F1)', () => {
  it('desmarcar «Por toldo» con la tela elegida en un toldo la sube a la tela común', () => {
    // repro3: dos Arzúa, «Por toldo», tela en A, se desmarca. Antes: «Referencia» vacía
    // y los dos toldos en «FALTA · tela».
    const plan = planFabricToggle({ fabric: '', awnings: [{ id: 'a', fabric: NEGRO }, { id: 'b', fabric: '' }] }, true);
    expect(plan).toEqual({ sameFabric: true, fabric: NEGRO, awningPatches: [], conflict: null });
  });

  it('todos los toldos con la misma tela: esa es la común', () => {
    const plan = planFabricToggle({ fabric: AZUL, awnings: [{ id: 'a', fabric: NEGRO }, { id: 'b', fabric: NEGRO }] }, true);
    expect(plan.fabric).toBe(NEGRO);
    expect(plan.conflict).toBeNull();
  });

  it('telas distintas: no decide solo, propone la más repetida y dice qué toldos llevan cada una', () => {
    const plan = planFabricToggle({
      fabric: '',
      awnings: [{ id: 'a', fabric: AZUL }, { id: 'b', fabric: NEGRO }, { id: 'c', fabric: NEGRO }]
    }, true);
    expect(plan.fabric).toBe(NEGRO);
    expect(plan.conflict).toEqual([
      { fabric: NEGRO, letters: 'B, C', count: 2 },
      { fabric: AZUL, letters: 'A', count: 1 }
    ]);
  });

  it('sin tela en ningún toldo, conserva la común que hubiera', () => {
    const plan = planFabricToggle({ fabric: NEGRO, awnings: [{ id: 'a', fabric: '' }] }, true);
    expect(plan.fabric).toBe(NEGRO);
  });

  it('marcar «Por toldo» pone la común en todos, también en los que guardaban otra escondida', () => {
    const plan = planFabricToggle({ fabric: NEGRO, awnings: [{ id: 'a', fabric: AZUL }, { id: 'b', fabric: '' }, { id: 'c', fabric: NEGRO }] }, false);
    expect(plan.sameFabric).toBe(false);
    expect(plan.fabric).toBe('');
    expect(plan.awningPatches).toEqual([{ id: 'a', fabric: NEGRO }, { id: 'b', fabric: NEGRO }]);
  });

  it('ida y vuelta en los dos órdenes no pierde la tela', () => {
    const start = { fabric: NEGRO, sameFabric: true, awnings: [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }] };
    const perAwning = apply(start, false);
    expect(perAwning.awnings.map((awning) => awning.fabric)).toEqual([NEGRO, NEGRO]);
    const back = apply(perAwning, true);
    expect(back).toMatchObject({ fabric: NEGRO, sameFabric: true, conflict: null });

    const startPerAwning = { fabric: '', sameFabric: false, awnings: [{ id: 'a', fabric: AZUL }, { id: 'b', fabric: AZUL }] };
    const common = apply(startPerAwning, true);
    expect(common.fabric).toBe(AZUL);
    const again = apply(common, false);
    expect(again.awnings.map((awning) => awning.fabric)).toEqual([AZUL, AZUL]);
  });
});
