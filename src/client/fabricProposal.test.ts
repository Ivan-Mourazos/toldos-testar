import { describe, expect, it, vi } from 'vitest';
import { applyFabricProposal, appliedProposalSelection, pendingProposalIndexes, pendingFabricProposalMessage, type FabricProposalDraft } from './fabricProposal';
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

    const message = applyFabricProposal(draft, proposal, SELECTION, [proposal]);

    expect(draft.setFabric).toHaveBeenCalledWith(SELECTION);
    expect(draft.setSameFabric).not.toHaveBeenCalled();
    expect(draft.updateAwning).not.toHaveBeenCalled();
    expect(message).toBeNull();
  });

  it('con tela común vacía y los de fuera del grupo sin otra tela ni propuesta, la tela queda común (F2)', () => {
    // Antes: «Por toldo» se marcaba solo y C se quedaba sin tela.
    const draft = makeDraft({ awnings: [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }, { id: 'c', fabric: '' }] });
    const proposal: FabricProposal = { awningIds: ['a', 'b'], phrase: 'tejido acrilico color negro', options: [] };

    const message = applyFabricProposal(draft, proposal, SELECTION, [proposal]);

    expect(draft.setFabric).toHaveBeenCalledWith(SELECTION);
    expect(draft.setSameFabric).not.toHaveBeenCalled();
    expect(draft.updateAwning).not.toHaveBeenCalled();
    expect(message).toBe('La tela propuesta para A, B queda para todo el pedido: C no tenía otra.');
  });

  it('con tela común y otra propuesta para los de fuera, pasa a «Por toldo» y lo dice', () => {
    const draft = makeDraft({ awnings: [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }, { id: 'c', fabric: '' }] });
    const proposal: FabricProposal = { awningIds: ['a', 'b'], phrase: 'tejido acrilico color negro', options: [] };
    const other: FabricProposal = { awningIds: ['c'], phrase: 'pvc arena', options: [] };

    const message = applyFabricProposal(draft, proposal, SELECTION, [proposal, other]);

    expect(draft.setSameFabric).toHaveBeenCalledWith(false);
    expect(draft.setFabric).toHaveBeenCalledWith('');
    expect(draft.updateAwning).toHaveBeenCalledTimes(2);
    expect(draft.updateAwning).toHaveBeenCalledWith('a', { fabric: SELECTION });
    expect(draft.updateAwning).toHaveBeenCalledWith('b', { fabric: SELECTION });
    expect(message).toBe('El pedido pasa a «Por toldo»: A, B llevan la tela elegida; C sigue sin tela, elígela en su tarjeta.');
  });

  it('con tela ya por toldo, la pone en cada toldo del grupo sin tocar el interruptor', () => {
    const draft = makeDraft({ sameFabric: false });
    const proposal: FabricProposal = { awningIds: ['a', 'b'], phrase: 'tejido acrilico color negro', options: [] };

    applyFabricProposal(draft, proposal, SELECTION, [proposal]);

    expect(draft.setFabric).not.toHaveBeenCalled();
    expect(draft.setSameFabric).not.toHaveBeenCalled();
    expect(draft.updateAwning).toHaveBeenCalledTimes(2);
  });

  it('elegir otra opción cambia la tela puesta, sin dejar rastro de la anterior', () => {
    const draft = makeDraft({ sameFabric: false, awnings: [{ id: 'a', fabric: '' }] });
    const proposal: FabricProposal = { awningIds: ['a'], phrase: 'tejido acrilico color negro', options: [] };
    const otherSelection = 'ACRILI2020P120|||120|||ACR VERDE|||ACRILICA (LONA)';

    applyFabricProposal(draft, proposal, SELECTION, [proposal]);
    applyFabricProposal(draft, proposal, otherSelection, [proposal]);

    expect(draft.updateAwning).toHaveBeenNthCalledWith(1, 'a', { fabric: SELECTION });
    expect(draft.updateAwning).toHaveBeenNthCalledWith(2, 'a', { fabric: otherSelection });
  });

  it('al pasar a «Por toldo» por haber otra tela común, la copia a los de fuera del grupo y lo dice', () => {
    // El pedido usa la tela común X (de la reserva de RPS para A); B tiene propuesta,
    // C no. Al elegir la de B, C no puede quedarse sin tela.
    const commonFabric = 'PVC580P250|||250|||PVC 580 MARRON|||PVC';
    const draft = makeDraft({
      awnings: [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }, { id: 'c', fabric: '' }],
      fabric: commonFabric,
      sameFabric: true
    });
    const proposal: FabricProposal = { awningIds: ['b'], phrase: 'tejido acrilico color negro', options: [] };

    const message = applyFabricProposal(draft, proposal, SELECTION, [proposal]);

    expect(draft.setSameFabric).toHaveBeenCalledWith(false);
    expect(draft.updateAwning).toHaveBeenCalledWith('a', { fabric: commonFabric });
    expect(draft.updateAwning).toHaveBeenCalledWith('c', { fabric: commonFabric });
    expect(draft.updateAwning).toHaveBeenCalledWith('b', { fabric: SELECTION });
    expect(draft.updateAwning).not.toHaveBeenCalledWith('b', { fabric: commonFabric });
    expect(message).toBe('El pedido pasa a «Por toldo»: B lleva la tela elegida; A, C siguen con la tela común que había.');
  });

  it('con tela común, la tela escondida de un toldo de fuera no cuenta: recibe la común', () => {
    // Con tela común la del toldo no se ve (suele ser la vieja de la OF): lo que el
    // técnico ve y espera es la común (mismo criterio que al marcar «Por toldo», F1).
    const ownFabric = 'ACRILI2018P120|||120|||ACR AZUL|||ACRILICA (LONA)';
    const commonFabric = 'PVC580P250|||250|||PVC 580 MARRON|||PVC';
    const draft = makeDraft({
      awnings: [{ id: 'a', fabric: ownFabric }, { id: 'b', fabric: '' }],
      fabric: commonFabric,
      sameFabric: true
    });
    const proposal: FabricProposal = { awningIds: ['b'], phrase: 'tejido acrilico color negro', options: [] };

    applyFabricProposal(draft, proposal, SELECTION, [proposal]);

    expect(draft.updateAwning).toHaveBeenCalledWith('a', { fabric: commonFabric });
    expect(draft.updateAwning).toHaveBeenCalledWith('b', { fabric: SELECTION });
  });
});

describe('appliedProposalSelection · la marca del botón sale del pedido (F3)', () => {
  const proposal: FabricProposal = { awningIds: ['a', 'b'], phrase: 'negro', options: [] };

  it('con tela común, la opción marcada es la tela común', () => {
    expect(appliedProposalSelection(proposal, { fabric: SELECTION, sameFabric: true, awnings: [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }] })).toBe(SELECTION);
  });

  it('con tela común vacía no hay nada marcado, aunque los toldos guarden una escondida', () => {
    expect(appliedProposalSelection(proposal, { fabric: '', sameFabric: true, awnings: [{ id: 'a', fabric: SELECTION }, { id: 'b', fabric: SELECTION }] })).toBe('');
  });

  it('por toldo, solo si todos los del grupo la llevan', () => {
    const order = { fabric: SELECTION, sameFabric: false, awnings: [{ id: 'a', fabric: SELECTION }, { id: 'b', fabric: '' }] };
    expect(appliedProposalSelection(proposal, order)).toBe('');
    expect(appliedProposalSelection(proposal, { ...order, awnings: [{ id: 'a', fabric: SELECTION }, { id: 'b', fabric: SELECTION }] })).toBe(SELECTION);
  });
});

describe('pendingProposalIndexes · «Propuesta · compruébala»', () => {
  const preselected: FabricProposal = { awningIds: ['a'], phrase: 'negro', options: [], preselected: SELECTION };
  const order = { fabric: SELECTION, sameFabric: true, awnings: [{ id: 'a', fabric: '' }] };

  it('la propuesta puesta sola queda por comprobar', () => {
    expect(pendingProposalIndexes([preselected], order, new Set())).toEqual([0]);
  });

  it('deja de estarlo al confirmarla o al cambiar la tela', () => {
    expect(pendingProposalIndexes([preselected], order, new Set([0]))).toEqual([]);
    expect(pendingProposalIndexes([preselected], { ...order, fabric: 'OTRA|||120|||OTRA' }, new Set())).toEqual([]);
  });

  it('una propuesta sin tela puesta de antemano no pide comprobar nada', () => {
    expect(pendingProposalIndexes([{ ...preselected, preselected: undefined }], order, new Set())).toEqual([]);
  });
});

describe('aviso antes de guardar telas propuestas', () => {
  const proposals: FabricProposal[] = [{ awningIds: ['a', 'c'], phrase: 'negro', options: [], preselected: SELECTION }];
  const order = { fabric: SELECTION, sameFabric: true, awnings: [{ id: 'a', fabric: '' }, { id: 'b', fabric: '' }, { id: 'c', fabric: '' }], fabricProposals: proposals, confirmedFabricProposals: [] };

  it('nombra una vez las letras actuales de los toldos que siguen sin comprobar', () => {
    expect(pendingFabricProposalMessage(order)).toBe('Hay telas propuestas sin comprobar en A, C. ¿Guardar igualmente?');
    expect(pendingFabricProposalMessage({ ...order, awnings: [order.awnings[2], order.awnings[1]] })).toBe('Hay telas propuestas sin comprobar en A. ¿Guardar igualmente?');
  });

  it('no avisa sin propuestas, después de confirmar o al elegir otra tela', () => {
    expect(pendingFabricProposalMessage({ ...order, fabricProposals: [] })).toBeNull();
    expect(pendingFabricProposalMessage({ ...order, confirmedFabricProposals: [0] })).toBeNull();
    expect(pendingFabricProposalMessage({ ...order, fabric: 'OTRA' })).toBeNull();
  });

  it('cambiar la tela de un toldo no comprueba la de los demás del grupo', () => {
    const awnings = [{ id: 'a', fabric: SELECTION }, { id: 'b', fabric: '' }, { id: 'c', fabric: 'OTRA' }];
    expect(pendingFabricProposalMessage({ ...order, sameFabric: false, awnings })).toBe('Hay telas propuestas sin comprobar en A. ¿Guardar igualmente?');
    expect(pendingProposalIndexes(proposals, { ...order, sameFabric: false, awnings }, new Set())).toEqual([0]);
  });
});
