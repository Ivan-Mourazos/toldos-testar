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
import { defaultCambioCortinaParameters, normalizeCambioCortinaParameters } from '../../domain/cambioCortinaParameters.js';
import { defaultCuarzoBoxParameters, normalizeCuarzoBoxParameters } from '../../domain/storbox250Parameters.js';
import { defaultXacobeoParameters, normalizeXacobeoParameters } from '../../domain/xacobeoParameters.js';
import { defaultPuntoRectoParameters, normalizePuntoRectoParameters } from '../../domain/puntoRectoParameters.js';
import { defaultMonoblock350Parameters, normalizeMonoblock350Parameters } from '../../domain/monoblock350Parameters.js';
import { defaultMaxiscreemParameters, normalizeMaxiscreemParameters } from '../../domain/maxiscreemParameters.js';
import { defaultAmbarBoxParameters, normalizeAmbarBoxParameters } from '../../domain/ambarBoxParameters.js';
import { defaultAgataBoxParameters, normalizeAgataBoxParameters } from '../../domain/agataBoxParameters.js';
import { defaultFabricJobParameters, normalizeFabricJobParameters } from '../../domain/fabricJobParameters.js';

const parametersStorageKey = 'toldos-testar-parameters-v2';

function initialParameters(): RuleParameters {
  try {
    const saved = JSON.parse(localStorage.getItem(parametersStorageKey) || 'null');
    return {
      arzuaPro: normalizeArzuaProParameters(saved?.arzuaPro || defaultArzuaProParameters),
      galicia: normalizeGaliciaParameters(saved?.galicia || defaultGaliciaParameters),
      perlaBox: normalizePerlaBoxParameters(saved?.perlaBox || saved?.storbox400 || defaultPerlaBoxParameters),
      coralBox: normalizeCoralBoxParameters(saved?.coralBox || defaultCoralBoxParameters),
      cuarzoBox: normalizeCuarzoBoxParameters(saved?.cuarzoBox || defaultCuarzoBoxParameters),
      cortina: normalizeCortinaParameters(saved?.cortina || defaultCortinaParameters),
      cambioCortina: normalizeCambioCortinaParameters(saved?.cambioCortina || defaultCambioCortinaParameters),
      xacobeo: normalizeXacobeoParameters(saved?.xacobeo || defaultXacobeoParameters),
      puntoRecto: normalizePuntoRectoParameters(saved?.puntoRecto || defaultPuntoRectoParameters),
      monoblock350: normalizeMonoblock350Parameters(saved?.monoblock350 || defaultMonoblock350Parameters),
      maxiscreem: normalizeMaxiscreemParameters(saved?.maxiscreem || defaultMaxiscreemParameters),
      ambarBox: normalizeAmbarBoxParameters(saved?.ambarBox || defaultAmbarBoxParameters),
      agataBox: normalizeAgataBoxParameters(saved?.agataBox || defaultAgataBoxParameters),
      fabricJobs: normalizeFabricJobParameters(saved?.fabricJobs || defaultFabricJobParameters)
    } as RuleParameters;
  } catch {
    return {
      arzuaPro: structuredClone(defaultArzuaProParameters),
      galicia: structuredClone(defaultGaliciaParameters),
      perlaBox: structuredClone(defaultPerlaBoxParameters),
      coralBox: structuredClone(defaultCoralBoxParameters),
      cuarzoBox: structuredClone(defaultCuarzoBoxParameters),
      cortina: structuredClone(defaultCortinaParameters),
      cambioCortina: structuredClone(defaultCambioCortinaParameters),
      xacobeo: structuredClone(defaultXacobeoParameters),
      puntoRecto: structuredClone(defaultPuntoRectoParameters),
      monoblock350: structuredClone(defaultMonoblock350Parameters),
      maxiscreem: structuredClone(defaultMaxiscreemParameters),
      ambarBox: structuredClone(defaultAmbarBoxParameters),
      agataBox: structuredClone(defaultAgataBoxParameters),
      fabricJobs: structuredClone(defaultFabricJobParameters)
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

  function updateCuarzoBox(patch: Partial<RuleParameters['cuarzoBox']>) {
    setParameters((current) => ({
      ...current,
      cuarzoBox: normalizeCuarzoBoxParameters({ ...current.cuarzoBox, ...patch })
    }) as RuleParameters);
  }

  function resetCuarzoBox() {
    setParameters((current) => ({ ...current, cuarzoBox: structuredClone(defaultCuarzoBoxParameters) }) as RuleParameters);
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

  function updateCambioCortina(patch: Partial<RuleParameters['cambioCortina']>) {
    setParameters((current) => ({
      ...current,
      cambioCortina: normalizeCambioCortinaParameters({ ...current.cambioCortina, ...patch })
    }) as RuleParameters);
  }

  function resetCambioCortina() {
    setParameters((current) => ({ ...current, cambioCortina: structuredClone(defaultCambioCortinaParameters) }) as RuleParameters);
  }

  function updateXacobeo(patch: Partial<RuleParameters['xacobeo']>) {
    setParameters((current) => ({
      ...current,
      xacobeo: normalizeXacobeoParameters({ ...current.xacobeo, ...patch })
    }) as RuleParameters);
  }

  function resetXacobeo() {
    setParameters((current) => ({ ...current, xacobeo: structuredClone(defaultXacobeoParameters) }) as RuleParameters);
  }

  function updatePuntoRecto(patch: Partial<RuleParameters['puntoRecto']>) {
    setParameters((current) => ({
      ...current,
      puntoRecto: normalizePuntoRectoParameters({ ...current.puntoRecto, ...patch })
    }) as RuleParameters);
  }

  function resetPuntoRecto() {
    setParameters((current) => ({ ...current, puntoRecto: structuredClone(defaultPuntoRectoParameters) }) as RuleParameters);
  }

  function updateMonoblock350(patch: Partial<RuleParameters['monoblock350']>) {
    setParameters((current) => ({
      ...current,
      monoblock350: normalizeMonoblock350Parameters({ ...current.monoblock350, ...patch })
    }) as RuleParameters);
  }

  function resetMonoblock350() {
    setParameters((current) => ({ ...current, monoblock350: structuredClone(defaultMonoblock350Parameters) }) as RuleParameters);
  }

  function updateMaxiscreem(patch: Partial<RuleParameters['maxiscreem']>) {
    setParameters((current) => ({
      ...current,
      maxiscreem: normalizeMaxiscreemParameters({ ...current.maxiscreem, ...patch })
    }) as RuleParameters);
  }

  function resetMaxiscreem() {
    setParameters((current) => ({ ...current, maxiscreem: structuredClone(defaultMaxiscreemParameters) }) as RuleParameters);
  }

  function updateAmbarBox(patch: Partial<RuleParameters['ambarBox']>) {
    setParameters((current) => ({
      ...current,
      ambarBox: normalizeAmbarBoxParameters({ ...current.ambarBox, ...patch })
    }) as RuleParameters);
  }

  function resetAmbarBox() {
    setParameters((current) => ({ ...current, ambarBox: structuredClone(defaultAmbarBoxParameters) }) as RuleParameters);
  }

  function updateAgataBox(patch: Partial<RuleParameters['agataBox']>) {
    setParameters((current) => ({
      ...current,
      agataBox: normalizeAgataBoxParameters({ ...current.agataBox, ...patch })
    }) as RuleParameters);
  }

  function resetAgataBox() {
    setParameters((current) => ({ ...current, agataBox: structuredClone(defaultAgataBoxParameters) }) as RuleParameters);
  }

  function updateFabricJobs(patch: Partial<RuleParameters['fabricJobs']>) {
    setParameters((current) => ({
      ...current,
      fabricJobs: normalizeFabricJobParameters({ ...current.fabricJobs, ...patch })
    }) as RuleParameters);
  }

  function resetFabricJobs() {
    setParameters((current) => ({ ...current, fabricJobs: structuredClone(defaultFabricJobParameters) }) as RuleParameters);
  }

  return {
    parameters,
    updateArzua, resetArzua,
    updateGalicia, resetGalicia,
    updatePerlaBox, resetPerlaBox,
    updateCoralBox, resetCoralBox,
    updateCuarzoBox, resetCuarzoBox,
    updateCortina, resetCortina,
    updateCambioCortina, resetCambioCortina,
    updateXacobeo, resetXacobeo,
    updatePuntoRecto, resetPuntoRecto,
    updateMonoblock350, resetMonoblock350,
    updateMaxiscreem, resetMaxiscreem,
    updateAmbarBox, resetAmbarBox,
    updateAgataBox, resetAgataBox,
    updateFabricJobs, resetFabricJobs
  };
}
