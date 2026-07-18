import { useEffect, useState } from 'react';
import type { RuleParameters } from '../types';
import { defaultArzuaProParameters, normalizeArzuaProParameters } from '../../domain/arzuaProParameters.js';
import { defaultGaliciaParameters, normalizeGaliciaParameters } from '../../domain/galiciaParameters.js';
import {
  defaultCoralBoxParameters,
  defaultPerlaBoxParameters,
  normalizeCoralBoxParameters,
  normalizePerlaBoxParameters
} from '../../domain/storbox400Parameters.js';
import { defaultCortinaParameters, normalizeCortinaParameters } from '../../domain/cortinaParameters.js';

const parametersStorageKey = 'toldos-testar-parameters-v2';

function initialParameters(): RuleParameters {
  try {
    const saved = JSON.parse(localStorage.getItem(parametersStorageKey) || 'null');
    return {
      arzuaPro: normalizeArzuaProParameters(saved?.arzuaPro || defaultArzuaProParameters),
      galicia: normalizeGaliciaParameters(saved?.galicia || defaultGaliciaParameters),
      perlaBox: normalizePerlaBoxParameters(saved?.perlaBox || saved?.storbox400 || defaultPerlaBoxParameters),
      coralBox: normalizeCoralBoxParameters(saved?.coralBox || defaultCoralBoxParameters),
      cortina: normalizeCortinaParameters(saved?.cortina || defaultCortinaParameters)
    } as RuleParameters;
  } catch {
    return {
      arzuaPro: structuredClone(defaultArzuaProParameters),
      galicia: structuredClone(defaultGaliciaParameters),
      perlaBox: structuredClone(defaultPerlaBoxParameters),
      coralBox: structuredClone(defaultCoralBoxParameters),
      cortina: structuredClone(defaultCortinaParameters)
    } as RuleParameters;
  }
}

export function useParameters() {
  const [parameters, setParameters] = useState<RuleParameters>(initialParameters);

  useEffect(() => {
    localStorage.setItem(parametersStorageKey, JSON.stringify(parameters));
  }, [parameters]);

  function updateArzua(patch: Partial<RuleParameters['arzuaPro']>) {
    setParameters((current) => ({
      ...current,
      arzuaPro: normalizeArzuaProParameters({ ...current.arzuaPro, ...patch })
    }) as RuleParameters);
  }

  function resetArzua() {
    setParameters((current) => ({ ...current, arzuaPro: structuredClone(defaultArzuaProParameters) }) as RuleParameters);
  }

  function updateGalicia(patch: Partial<RuleParameters['galicia']>) {
    setParameters((current) => ({
      ...current,
      galicia: normalizeGaliciaParameters({ ...current.galicia, ...patch })
    }) as RuleParameters);
  }

  function resetGalicia() {
    setParameters((current) => ({ ...current, galicia: structuredClone(defaultGaliciaParameters) }) as RuleParameters);
  }

  function updatePerlaBox(patch: Partial<RuleParameters['perlaBox']>) {
    setParameters((current) => ({
      ...current,
      perlaBox: normalizePerlaBoxParameters({ ...current.perlaBox, ...patch })
    }) as RuleParameters);
  }

  function resetPerlaBox() {
    setParameters((current) => ({ ...current, perlaBox: structuredClone(defaultPerlaBoxParameters) }) as RuleParameters);
  }

  function updateCoralBox(patch: Partial<RuleParameters['coralBox']>) {
    setParameters((current) => ({
      ...current,
      coralBox: normalizeCoralBoxParameters({ ...current.coralBox, ...patch })
    }) as RuleParameters);
  }

  function resetCoralBox() {
    setParameters((current) => ({ ...current, coralBox: structuredClone(defaultCoralBoxParameters) }) as RuleParameters);
  }

  function updateCortina(patch: Partial<RuleParameters['cortina']>) {
    setParameters((current) => ({
      ...current,
      cortina: normalizeCortinaParameters({ ...current.cortina, ...patch })
    }) as RuleParameters);
  }

  function resetCortina() {
    setParameters((current) => ({ ...current, cortina: structuredClone(defaultCortinaParameters) }) as RuleParameters);
  }

  return {
    parameters,
    updateArzua, resetArzua,
    updateGalicia, resetGalicia,
    updatePerlaBox, resetPerlaBox,
    updateCoralBox, resetCoralBox,
    updateCortina, resetCortina
  };
}
