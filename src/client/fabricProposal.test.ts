import { describe, expect, it, vi } from 'vitest';
import { applyFabricProposal, type FabricProposalDraft } from './fabricProposal';
import type { FabricProposal } from './types';

const SELECTION = 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 NEGRO 2170|||ACRILICA (LONA)';

function makeDraft(overrides: Partial<FabricProposalDraft> = {}): FabricProposalDraft {
  return {
    awnings: [{ id: 'a' }, { id: 'b' }],
    sameFabric: true,
    setFabric: vi.fn(),
    setSameFabric: vi.fn(),
    updateAwning: vi.fn(),
    ...overrides
  };
}

describe('applyFabricProposal', () => {
  it('con tela común y el grupo cubriendo todos los toldos, pone la tela del pedido', () => {
    const draft = makeDraft();
    const proposal: FabricProposal = { awningIds: ['a', 'b'], phrase: 'tejido acrilico color negro', options: [] };

    applyFabricProposal(draft, proposal, SELECTION);

    expect(draft.setFabric).toHaveBeenCalledWith(SELECTION);
    expect(draft.setSameFabric).not.toHaveBeenCalled();
    expect(draft.updateAwning).not.toHaveBeenCalled();
  });

  it('con tela común pero el grupo sin cubrir todos los toldos, la pone solo en los del grupo y desactiva la tela común', () => {
    const draft = makeDraft({ awnings: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
    const proposal: FabricProposal = { awningIds: ['a', 'b'], phrase: 'tejido acrilico color negro', options: [] };

    applyFabricProposal(draft, proposal, SELECTION);

    expect(draft.setFabric).not.toHaveBeenCalled();
    expect(draft.setSameFabric).toHaveBeenCalledWith(false);
    expect(draft.updateAwning).toHaveBeenCalledTimes(2);
    expect(draft.updateAwning).toHaveBeenCalledWith('a', { fabric: SELECTION });
    expect(draft.updateAwning).toHaveBeenCalledWith('b', { fabric: SELECTION });
  });

  it('con tela ya por toldo, la pone en cada toldo del grupo sin tocar el interruptor', () => {
    const draft = makeDraft({ sameFabric: false });
    const proposal: FabricProposal = { awningIds: ['a', 'b'], phrase: 'tejido acrilico color negro', options: [] };

    applyFabricProposal(draft, proposal, SELECTION);

    expect(draft.setFabric).not.toHaveBeenCalled();
    expect(draft.setSameFabric).not.toHaveBeenCalled();
    expect(draft.updateAwning).toHaveBeenCalledTimes(2);
  });

  it('elegir otra opción cambia la tela puesta, sin dejar rastro de la anterior', () => {
    const draft = makeDraft({ sameFabric: false, awnings: [{ id: 'a' }] });
    const proposal: FabricProposal = { awningIds: ['a'], phrase: 'tejido acrilico color negro', options: [] };
    const otherSelection = 'ACRILI2020P120|||120|||ACR VERDE|||ACRILICA (LONA)';

    applyFabricProposal(draft, proposal, SELECTION);
    applyFabricProposal(draft, proposal, otherSelection);

    expect(draft.updateAwning).toHaveBeenNthCalledWith(1, 'a', { fabric: SELECTION });
    expect(draft.updateAwning).toHaveBeenNthCalledWith(2, 'a', { fabric: otherSelection });
  });
});
