import type { Awning, FabricProposal } from './types';

// Aplica una tela propuesta (Tarea 3, rediseño 4 §10): el técnico elige una opción
// de un bloque de propuestas y esto la pone en el pedido, nunca sola. Si el grupo
// cubre todos los toldos y el pedido usa tela común, se cambia la tela del pedido;
// si no, se pone en cada toldo del grupo y se desactiva «misma tela», igual que
// OrderView.setOrderField al desmarcar «Por toldo»: antes, la tela común pasa a los
// toldos de fuera del grupo que no tienen tela, para que ninguno se quede sin ella.
export type FabricProposalDraft = {
  awnings: Pick<Awning, 'id' | 'fabric'>[];
  fabric: string;
  sameFabric: boolean;
  setFabric: (value: string) => void;
  setSameFabric: (value: boolean) => void;
  updateAwning: (id: string, patch: Partial<Awning>) => void;
};

export function applyFabricProposal(draft: FabricProposalDraft, proposal: FabricProposal, selection: string) {
  const allIds = draft.awnings.map((awning) => awning.id);
  const coversAll = allIds.length > 0 && allIds.every((id) => proposal.awningIds.includes(id));

  if (coversAll && draft.sameFabric) {
    draft.setFabric(selection);
    return;
  }

  if (draft.sameFabric) {
    if (draft.fabric) {
      draft.awnings
        .filter((awning) => !proposal.awningIds.includes(awning.id) && !awning.fabric)
        .forEach((awning) => draft.updateAwning(awning.id, { fabric: draft.fabric }));
    }
    draft.setSameFabric(false);
  }
  proposal.awningIds.forEach((id) => draft.updateAwning(id, { fabric: selection }));
}
