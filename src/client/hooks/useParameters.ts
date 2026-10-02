import { useEffect, useSyncExternalStore } from 'react';
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
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import {
  ambitosPendientes, descartarBorrador, editarParametros, guardarAmbitos, leerParametros, ponerPedido,
  refrescarParametros, suscribirParametros, type SaveDraftResult
} from '../parametrosToldos';

export type { SaveDraftResult } from '../parametrosToldos';

const REFRESH_EVERY_MS = 5 * 60 * 1000;
// Claves de cuando cada navegador guardaba sus parámetros (hasta el 21/09/2026).
const LEGACY_STORAGE_KEYS = ['toldos-testar-parameters-v2', 'toldos-testar-parameters-v3'];
const normalize = (saved?: unknown) => normalizeRuleParameters(saved) as RuleParameters;

/** El estado de los parámetros de toldos, el mismo en toda la página (App, Parámetros, el historial). */
export function useEstadoParametros() {
  return useSyncExternalStore(suscribirParametros, leerParametros, leerParametros);
}

/**
 * Parámetros de cálculo en tres capas (docs/superpowers/specs/2026-09-21-
 * parametros-comunes-design.md):
 *  - vigentes: los comunes del servidor;
 *  - borrador: lo que se edita en Parámetros, solo en este puesto hasta guardar;
 *  - del pedido: los de una revisión abierta para corregirla.
 * Los pedidos se calculan con los del pedido o, si no hay, con los vigentes;
 * nunca con un borrador sin guardar. Desde el 02/10/2026 el estado vive en
 * parametrosToldos.ts y cada modelo se guarda con su versión desde su ficha.
 * Solo App llama a este hook (refresca al volver a la ventana y cada 5 minutos).
 */
export function useParameters() {
  const estado = useEstadoParametros();
  const hayBorrador = estado.draft !== null;

  useEffect(() => {
    try {
      for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
    } catch {
      // Sin almacenamiento disponible: no hay nada que limpiar.
    }
    const onFocus = () => { void refrescarParametros(); };
    onFocus();
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, REFRESH_EVERY_MS);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!hayBorrador) return undefined;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hayBorrador]);

  // Cada edición de Parámetros va al borrador. Si deja todo como los vigentes,
  // el borrador desaparece.
  const edit = editarParametros;

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

  function discardDraft() {
    descartarBorrador();
  }

  // Pone una versión entera del historial como borrador: volver atrás es guardar.
  function loadVersion(overrides: unknown) {
    edit(() => normalize(overrides));
  }

  // La barra común de App: guarda cada modelo con cambios, uno tras otro, cada uno con su versión.
  function saveDraft(updatedBy: string, reason: string): Promise<SaveDraftResult> {
    return guardarAmbitos(ambitosPendientes(), updatedBy, reason);
  }

  // Corregir una revisión recalcula con los parámetros con que se guardó, sin
  // tocar los comunes.
  function loadParameters(saved: RuleParameters, version: number | null = null) {
    ponerPedido({ parameters: normalize(saved), version });
  }

  // Al guardar o limpiar el pedido se vuelve a los comunes.
  function restoreParameters() {
    ponerPedido(null);
  }

  return {
    parameters: estado.order?.parameters ?? estado.shared.parameters,
    generalParameters: estado.draft ?? estado.shared.parameters,
    parametersVersion: estado.order ? estado.order.version : estado.shared.version,
    version: estado.shared.version,
    // Cambios sin guardar en cualquier modelo; cada ficha tiene su propia barra.
    dirty: estado.draft !== null,
    saving: estado.saving,
    refresh: refrescarParametros,
    discardDraft,
    loadVersion,
    saveDraft,
    loadParameters,
    restoreParameters,
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
    updateDrawings
  };
}
