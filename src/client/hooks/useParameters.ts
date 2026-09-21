import { useEffect, useRef, useState } from 'react';
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
import { defaultSelenaParameters, normalizeSelenaParameters } from '../../domain/selenaParameters.js';
import { defaultCambioCortinaParameters, normalizeCambioCortinaParameters } from '../../domain/cambioCortinaParameters.js';
import { defaultCuarzoBoxParameters, normalizeCuarzoBoxParameters } from '../../domain/storbox250Parameters.js';
import { defaultXacobeoParameters, normalizeXacobeoParameters } from '../../domain/xacobeoParameters.js';
import { defaultPuntoRectoParameters, normalizePuntoRectoParameters } from '../../domain/puntoRectoParameters.js';
import { defaultMonoblock350Parameters, normalizeMonoblock350Parameters } from '../../domain/monoblock350Parameters.js';
import { defaultMaxiscreemParameters, normalizeMaxiscreemParameters } from '../../domain/maxiscreemParameters.js';
import { defaultElectraParameters, normalizeElectraParameters } from '../../domain/electraParameters.js';
import { defaultAmbarBoxParameters, normalizeAmbarBoxParameters } from '../../domain/ambarBoxParameters.js';
import { defaultAgataBoxParameters, normalizeAgataBoxParameters } from '../../domain/agataBoxParameters.js';
import { defaultFabricJobParameters, normalizeFabricJobParameters } from '../../domain/fabricJobParameters.js';
import { defaultRuleParameters, PARAMETERS_STORAGE_KEY, readStoredParameters, serializeParameterOverrides } from '../parameterStorage';

function initialParameters(): RuleParameters {
  try {
    return readStoredParameters(localStorage);
  } catch {
    return defaultRuleParameters();
  }
}

export function useParameters() {
  const [parameters, setParameters] = useState<RuleParameters>(initialParameters);
  // Solo se guarda lo que el usuario cambia en Parámetros: nunca al arrancar ni
  // al abrir una revisión, para no congelar los valores del código (ver
  // parameterStorage.ts).
  const pendingSave = useRef(false);

  useEffect(() => {
    if (!pendingSave.current) return;
    pendingSave.current = false;
    try {
      localStorage.setItem(PARAMETERS_STORAGE_KEY, serializeParameterOverrides(parameters));
    } catch {
      // Sin almacenamiento disponible: el puesto sigue con los valores del código.
    }
  }, [parameters]);

  const edit: typeof setParameters = (next) => {
    pendingSave.current = true;
    setParameters(next);
  };

  function updateArzua(patch: Partial<RuleParameters['arzuaPro']>) {
    edit((current) => ({
      ...current,
      arzuaPro: normalizeArzuaProParameters({ ...current.arzuaPro, ...patch })
    }) as RuleParameters);
  }

  function resetArzua() {
    edit((current) => ({ ...current, arzuaPro: structuredClone(defaultArzuaProParameters) }) as RuleParameters);
  }

  function updateGalicia(patch: Partial<RuleParameters['galicia']>) {
    edit((current) => ({
      ...current,
      galicia: normalizeGaliciaParameters({ ...current.galicia, ...patch })
    }) as RuleParameters);
  }

  function resetGalicia() {
    edit((current) => ({ ...current, galicia: structuredClone(defaultGaliciaParameters) }) as RuleParameters);
  }

  function updatePerlaBox(patch: Partial<RuleParameters['perlaBox']>) {
    edit((current) => ({
      ...current,
      perlaBox: normalizePerlaBoxParameters({ ...current.perlaBox, ...patch })
    }) as RuleParameters);
  }

  function resetPerlaBox() {
    edit((current) => ({ ...current, perlaBox: structuredClone(defaultPerlaBoxParameters) }) as RuleParameters);
  }

  function updateCoralBox(patch: Partial<RuleParameters['coralBox']>) {
    edit((current) => ({
      ...current,
      coralBox: normalizeCoralBoxParameters({ ...current.coralBox, ...patch })
    }) as RuleParameters);
  }

  function resetCoralBox() {
    edit((current) => ({ ...current, coralBox: structuredClone(defaultCoralBoxParameters) }) as RuleParameters);
  }

  function updateCuarzoBox(patch: Partial<RuleParameters['cuarzoBox']>) {
    edit((current) => ({
      ...current,
      cuarzoBox: normalizeCuarzoBoxParameters({ ...current.cuarzoBox, ...patch })
    }) as RuleParameters);
  }

  function resetCuarzoBox() {
    edit((current) => ({ ...current, cuarzoBox: structuredClone(defaultCuarzoBoxParameters) }) as RuleParameters);
  }

  function updateCortina(patch: Partial<RuleParameters['cortina']>) {
    edit((current) => ({
      ...current,
      cortina: normalizeCortinaParameters({ ...current.cortina, ...patch })
    }) as RuleParameters);
  }

  function resetCortina() {
    edit((current) => ({ ...current, cortina: structuredClone(defaultCortinaParameters) }) as RuleParameters);
  }

  function updateSelena(patch: Partial<RuleParameters['selena']>) {
    edit((current) => ({
      ...current,
      selena: normalizeSelenaParameters({ ...current.selena, ...patch })
    }) as RuleParameters);
  }

  function resetSelena() {
    edit((current) => ({ ...current, selena: structuredClone(defaultSelenaParameters) }) as RuleParameters);
  }

  function updateCambioCortina(patch: Partial<RuleParameters['cambioCortina']>) {
    edit((current) => ({
      ...current,
      cambioCortina: normalizeCambioCortinaParameters({ ...current.cambioCortina, ...patch })
    }) as RuleParameters);
  }

  function resetCambioCortina() {
    edit((current) => ({ ...current, cambioCortina: structuredClone(defaultCambioCortinaParameters) }) as RuleParameters);
  }

  function updateXacobeo(patch: Partial<RuleParameters['xacobeo']>) {
    edit((current) => ({
      ...current,
      xacobeo: normalizeXacobeoParameters({ ...current.xacobeo, ...patch })
    }) as RuleParameters);
  }

  function resetXacobeo() {
    edit((current) => ({ ...current, xacobeo: structuredClone(defaultXacobeoParameters) }) as RuleParameters);
  }

  function updatePuntoRecto(patch: Partial<RuleParameters['puntoRecto']>) {
    edit((current) => ({
      ...current,
      puntoRecto: normalizePuntoRectoParameters({ ...current.puntoRecto, ...patch })
    }) as RuleParameters);
  }

  function resetPuntoRecto() {
    edit((current) => ({ ...current, puntoRecto: structuredClone(defaultPuntoRectoParameters) }) as RuleParameters);
  }

  function updateMonoblock350(patch: Partial<RuleParameters['monoblock350']>) {
    edit((current) => ({
      ...current,
      monoblock350: normalizeMonoblock350Parameters({ ...current.monoblock350, ...patch })
    }) as RuleParameters);
  }

  function resetMonoblock350() {
    edit((current) => ({ ...current, monoblock350: structuredClone(defaultMonoblock350Parameters) }) as RuleParameters);
  }

  function updateMaxiscreem(patch: Partial<RuleParameters['maxiscreem']>) {
    edit((current) => ({
      ...current,
      maxiscreem: normalizeMaxiscreemParameters({ ...current.maxiscreem, ...patch })
    }) as RuleParameters);
  }

  function resetMaxiscreem() {
    edit((current) => ({ ...current, maxiscreem: structuredClone(defaultMaxiscreemParameters) }) as RuleParameters);
  }

  function updateElectra(patch: Partial<RuleParameters['electra']>) {
    edit((current) => ({
      ...current,
      electra: normalizeElectraParameters({ ...current.electra, ...patch })
    }) as RuleParameters);
  }

  function resetElectra() {
    edit((current) => ({ ...current, electra: structuredClone(defaultElectraParameters) }) as RuleParameters);
  }

  function updateAmbarBox(patch: Partial<RuleParameters['ambarBox']>) {
    edit((current) => ({
      ...current,
      ambarBox: normalizeAmbarBoxParameters({ ...current.ambarBox, ...patch })
    }) as RuleParameters);
  }

  function resetAmbarBox() {
    edit((current) => ({ ...current, ambarBox: structuredClone(defaultAmbarBoxParameters) }) as RuleParameters);
  }

  function updateAgataBox(patch: Partial<RuleParameters['agataBox']>) {
    edit((current) => ({
      ...current,
      agataBox: normalizeAgataBoxParameters({ ...current.agataBox, ...patch })
    }) as RuleParameters);
  }

  function resetAgataBox() {
    edit((current) => ({ ...current, agataBox: structuredClone(defaultAgataBoxParameters) }) as RuleParameters);
  }

  function updateFabricJobs(patch: Partial<RuleParameters['fabricJobs']>) {
    edit((current) => ({
      ...current,
      fabricJobs: normalizeFabricJobParameters({ ...current.fabricJobs, ...patch })
    }) as RuleParameters);
  }

  function resetFabricJobs() {
    edit((current) => ({ ...current, fabricJobs: structuredClone(defaultFabricJobParameters) }) as RuleParameters);
  }

  function updateDrawings(drawings: RuleParameters['drawings']) {
    edit((current) => ({ ...current, drawings }) as RuleParameters);
  }

  // Corregir una revisión recalcula con los parámetros con que se guardó, pero
  // no los convierte en los del puesto.
  function loadParameters(saved: RuleParameters) {
    setParameters(defaultRuleParameters(saved));
  }

  // Vuelve a los parámetros del puesto al terminar de corregir una revisión.
  function restoreParameters() {
    setParameters(initialParameters());
  }

  return {
    parameters,
    updateArzua, resetArzua,
    updateGalicia, resetGalicia,
    updatePerlaBox, resetPerlaBox,
    updateCoralBox, resetCoralBox,
    updateCuarzoBox, resetCuarzoBox,
    updateCortina, resetCortina,
    updateSelena, resetSelena,
    updateCambioCortina, resetCambioCortina,
    updateXacobeo, resetXacobeo,
    updatePuntoRecto, resetPuntoRecto,
    updateMonoblock350, resetMonoblock350,
    updateMaxiscreem, resetMaxiscreem,
    updateElectra, resetElectra,
    updateAmbarBox, resetAmbarBox,
    updateAgataBox, resetAgataBox,
    updateFabricJobs, resetFabricJobs,
    updateDrawings,
    loadParameters,
    restoreParameters
  };
}
