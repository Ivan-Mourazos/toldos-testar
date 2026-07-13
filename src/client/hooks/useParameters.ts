import { useEffect, useState } from 'react';
import type { RuleParameters } from '../types';
import { defaultArzuaProParameters, normalizeArzuaProParameters } from '../../domain/arzuaProParameters.js';
import { defaultGaliciaParameters, normalizeGaliciaParameters } from '../../domain/galiciaParameters.js';

const parametersStorageKey = 'toldos-testar-parameters-v2';

function initialParameters(): RuleParameters {
  try {
    const saved = JSON.parse(localStorage.getItem(parametersStorageKey) || 'null');
    return {
      arzuaPro: normalizeArzuaProParameters(saved?.arzuaPro || defaultArzuaProParameters),
      galicia: normalizeGaliciaParameters(saved?.galicia || defaultGaliciaParameters)
    } as RuleParameters;
  } catch {
    return {
      arzuaPro: structuredClone(defaultArzuaProParameters),
      galicia: structuredClone(defaultGaliciaParameters)
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

  return { parameters, updateArzua, resetArzua, updateGalicia, resetGalicia };
}
