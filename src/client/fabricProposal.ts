import type { Awning, FabricProposal } from './types';
import { awningLetter } from '../domain/awningCompleteness.js';

// Aplica una tela propuesta (Tarea 3, rediseño 4 §10): el técnico elige una opción
// de un bloque de propuestas y esto la pone en el pedido.
//
// - El grupo cubre todos los toldos y el pedido usa tela común: cambia la tela común.
// - Tela común y el grupo no cubre todos (informe tela-0930, F2): si los de fuera no
//   tienen otra tela (la común está vacía o es la misma) ni otra propuesta, la tela
//   queda común; antes se marcaba «Por toldo» solo y los de fuera se quedaban sin tela.
//   Si sí la tienen, el pedido pasa a «Por toldo»: los de fuera reciben la común que
//   hubiera (todos, porque la suya escondida no es la que el técnico veía) y los del
//   grupo la elegida.
// - Ya por toldo: se pone en cada toldo del grupo.
//
// Devuelve el aviso para el técnico cuando el cambio va más allá del grupo (null si no).
export type FabricProposalDraft = {
  awnings: Pick<Awning, 'id' | 'fabric'>[];
  fabric: string;
  sameFabric: boolean;
  setFabric: (value: string) => void;
  setSameFabric: (value: boolean) => void;
  updateAwning: (id: string, patch: Partial<Awning>) => void;
};

export function applyFabricProposal(
  draft: FabricProposalDraft,
  proposal: FabricProposal,
  selection: string,
  allProposals: FabricProposal[] = [proposal]
): string | null {
  const inGroup = (id: string) => proposal.awningIds.includes(id);
  const outside = draft.awnings.filter((awning) => !inGroup(awning.id));

  if (!draft.sameFabric) {
    proposal.awningIds.forEach((id) => draft.updateAwning(id, { fabric: selection }));
    return null;
  }
  if (outside.length === 0) {
    draft.setFabric(selection);
    return null;
  }

  const groupLetters = lettersOf(draft.awnings, (awning) => inGroup(awning.id));
  const outsideLetters = lettersOf(draft.awnings, (awning) => !inGroup(awning.id));
  const outsideHasOtherProposal = allProposals
    .filter((other) => other !== proposal)
    .some((other) => other.awningIds.some((id) => outside.some((awning) => awning.id === id)));
  const outsideHasOtherFabric = Boolean(draft.fabric) && draft.fabric !== selection;

  if (!outsideHasOtherProposal && !outsideHasOtherFabric) {
    draft.setFabric(selection);
    return draft.fabric === selection
      ? null
      : `La tela propuesta para ${groupLetters} queda para todo el pedido: ${outsideLetters} no ${outside.length === 1 ? 'tenía' : 'tenían'} otra.`;
  }

  const common = draft.fabric;
  if (common) outside.forEach((awning) => draft.updateAwning(awning.id, { fabric: common }));
  proposal.awningIds.forEach((id) => draft.updateAwning(id, { fabric: selection }));
  draft.setSameFabric(false);
  draft.setFabric('');
  const groupVerb = proposal.awningIds.length === 1 ? 'lleva' : 'llevan';
  const outsideText = common
    ? `${outsideLetters} ${outside.length === 1 ? 'sigue' : 'siguen'} con la tela común que había.`
    : `${outsideLetters} ${outside.length === 1 ? 'sigue' : 'siguen'} sin tela, elígela en su tarjeta.`;
  return `El pedido pasa a «Por toldo»: ${groupLetters} ${groupVerb} la tela elegida; ${outsideText}`;
}

type FabricOrder = { fabric: string; sameFabric: boolean; awnings: Pick<Awning, 'id' | 'fabric'>[] };

// La opción que el pedido lleva de verdad en los toldos del grupo (F3): la tela común
// si el pedido la usa; si no, la de los toldos del grupo cuando todos llevan la misma.
// '' si no hay ninguna puesta.
export function appliedProposalSelection(proposal: FabricProposal, order: FabricOrder): string {
  if (order.sameFabric) return order.fabric || '';
  const fabrics = proposal.awningIds.map((id) => order.awnings.find((awning) => awning.id === id)?.fabric || '');
  if (fabrics.length === 0 || !fabrics[0] || fabrics.some((fabric) => fabric !== fabrics[0])) return '';
  return fabrics[0];
}

// Propuestas cuya tela se puso sola al obtener el pedido y siguen sin comprobar: la
// tela puesta es aún la propuesta y el técnico no la ha confirmado (pulsar una opción
// o «Correcta»). Si cambia la tela por otra, deja de estar pendiente.
export function pendingProposalIndexes(proposals: FabricProposal[], order: FabricOrder, confirmed: ReadonlySet<number>): number[] {
  return proposals.flatMap((proposal, index) => (
    proposal.preselected && !confirmed.has(index) && appliedProposalSelection(proposal, order) === proposal.preselected ? [index] : []
  ));
}

function lettersOf(awnings: Pick<Awning, 'id'>[], keep: (awning: Pick<Awning, 'id'>) => boolean) {
  return awnings.flatMap((awning, index) => (keep(awning) ? [awningLetter(index)] : [])).join(', ');
}
