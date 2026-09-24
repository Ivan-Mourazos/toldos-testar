import { describe, expect, it, vi } from 'vitest';
import { applyFabricProposal, type FabricProposalDraft } from './fabricProposal';
import type { FabricProposal } from './types';

const SELECTION = 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 NEGRO 2170|||ACRILICA (LONA)';

function makeDraft(overrides: Partial<FabricProposalDraft> = {}): FabricProposalDraft {
  return {
    awnings: [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }],
    fabric: '',
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
    const draft = makeDraft({ awnings: [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }, { id: 'c', fabric: '' }] });
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
    const draft = makeDraft({ sameFabric: false, awnings: [{ id: 'a', fabric: '' }] });
    const proposal: FabricProposal = { awningIds: ['a'], phrase: 'tejido acrilico color negro', options: [] };
    const otherSelection = 'ACRILI2020P120|||120|||ACR VERDE|||ACRILICA (LONA)';

    applyFabricProposal(draft, proposal, SELECTION);
    applyFabricProposal(draft, proposal, otherSelection);

    expect(draft.updateAwning).toHaveBeenNthCalledWith(1, 'a', { fabric: SELECTION });
    expect(draft.updateAwning).toHaveBeenNthCalledWith(2, 'a', { fabric: otherSelection });
  });

  it('al desactivar la tela común, la copia a los toldos de fuera del grupo que no tienen tela', () => {
    // El pedido usa la tela común X (de la reserva de RPS para A); B tiene propuesta,
    // C no. Al elegir la de B, C no puede quedarse sin tela.
    const commonFabric = 'PVC580P250|||250|||PVC 580 MARRON|||PVC';
    const draft = makeDraft({
      awnings: [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }, { id: 'c', fabric: '' }],
      fabric: commonFabric,
      sameFabric: true
    });
    const proposal: FabricProposal = { awningIds: ['b'], phrase: 'tejido acrilico color negro', options: [] };

    applyFabricProposal(draft, proposal, SELECTION);

    expect(draft.setSameFabric).toHaveBeenCalledWith(false);
    expect(draft.updateAwning).toHaveBeenCalledWith('a', { fabric: commonFabric });
    expect(draft.updateAwning).toHaveBeenCalledWith('c', { fabric: commonFabric });
    expect(draft.updateAwning).toHaveBeenCalledWith('b', { fabric: SELECTION });
    expect(draft.updateAwning).not.toHaveBeenCalledWith('b', { fabric: commonFabric });
  });

  it('no pisa la tela propia de un toldo de fuera del grupo', () => {
    const ownFabric = 'ACRILI2018P120|||120|||ACR AZUL|||ACRILICA (LONA)';
    const draft = makeDraft({
      awnings: [{ id: 'a', fabric: ownFabric }, { id: 'b', fabric: '' }],
      fabric: 'PVC580P250|||250|||PVC 580 MARRON|||PVC',
      sameFabric: true
    });
    const proposal: FabricProposal = { awningIds: ['b'], phrase: 'tejido acrilico color negro', options: [] };

    applyFabricProposal(draft, proposal, SELECTION);

    expect(draft.updateAwning).toHaveBeenCalledTimes(1);
    expect(draft.updateAwning).toHaveBeenCalledWith('b', { fabric: SELECTION });
  });
});
