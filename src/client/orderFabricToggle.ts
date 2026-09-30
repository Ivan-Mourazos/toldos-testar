import type { Awning } from './types';
import { awningLetter } from '../domain/awningCompleteness.js';

// Qué pasa con la tela al marcar o desmarcar «Por toldo» (informe tela-0930, F1).
//
// - Común → por toldo: la tela común pasa a TODOS los toldos, no solo a los vacíos.
//   Con tela común, la tela propia de cada toldo no se ve (suele ser la vieja de la OF);
//   si se rescatara, el técnico vería reaparecer telas que no ha elegido. La común se
//   vacía: con «Por toldo» ya no es la del pedido y no debe salir en la cabecera.
// - Por toldo → común: la tela de los toldos sube a la común. Si todos llevan la misma,
//   se usa esa. Si llevan telas distintas no se decide solo: se devuelve el conflicto
//   para preguntar (antes se quedaba la común vacía y todos daban «FALTA · tela»).
export type FabricToggleState = {
  fabric: string;
  awnings: Pick<Awning, 'id' | 'fabric'>[];
};

export type FabricToggleGroup = { fabric: string; letters: string; count: number };

export type FabricTogglePlan = {
  sameFabric: boolean;
  fabric: string;
  awningPatches: { id: string; fabric: string }[];
  // Solo al pasar a tela común con telas distintas en los toldos: la más repetida va
  // primero y es la que se propone para todo el pedido.
  conflict: FabricToggleGroup[] | null;
};

export function planFabricToggle(state: FabricToggleState, nextSameFabric: boolean): FabricTogglePlan {
  if (!nextSameFabric) {
    const common = state.fabric;
    return {
      sameFabric: false,
      fabric: '',
      awningPatches: common
        ? state.awnings.filter((awning) => awning.fabric !== common).map((awning) => ({ id: awning.id, fabric: common }))
        : [],
      conflict: null
    };
  }

  const groups = fabricGroups(state.awnings);
  if (groups.length === 0) return { sameFabric: true, fabric: state.fabric, awningPatches: [], conflict: null };
  if (groups.length === 1) return { sameFabric: true, fabric: groups[0].fabric, awningPatches: [], conflict: null };
  return { sameFabric: true, fabric: groups[0].fabric, awningPatches: [], conflict: groups };
}

// Telas distintas de los toldos, de la más repetida a la menos (a igualdad, la del
// primer toldo), con las letras de los toldos que la llevan.
export function fabricGroups(awnings: Pick<Awning, 'id' | 'fabric'>[]): FabricToggleGroup[] {
  const byFabric = new Map<string, { indexes: number[]; first: number }>();
  awnings.forEach((awning, index) => {
    const fabric = String(awning.fabric || '').trim();
    if (!fabric) return;
    const entry = byFabric.get(fabric) || { indexes: [], first: index };
    entry.indexes.push(index);
    byFabric.set(fabric, entry);
  });
  return [...byFabric.entries()]
    .sort((a, b) => b[1].indexes.length - a[1].indexes.length || a[1].first - b[1].first)
    .map(([fabric, entry]) => ({
      fabric,
      letters: entry.indexes.map((index) => awningLetter(index)).join(', '),
      count: entry.indexes.length
    }));
}
