import { effectiveOverride } from './ruleOverrides.js';
import { tipBushing } from './tipBushing.js';
import { formatNumber } from './math.js';
import { findNegativeCuts, negativeCutMessage } from './cutGuards.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, plasticCapSuffix, resolveLacado, universProfileSuffix } from './lacados.js';
import { resolveMotorRemote } from './motorAccessories.js';
import { universProfileStockLengths } from './universProfileLengths.js';
import { pickVerticalProfileLength, verticalProfileCode } from './boxAvailability.js';
import behaviorData from './data/modelBehavior.json' with { type: 'json' };
import {
  electraCofreSupport,
  electraHasCofre,
  electraHasGuide,
  getElectraMotor,
  getElectraDiscounts,
  normalizeElectraDevice,
  normalizeElectraParameters,
  normalizeElectraSupport,
  normalizeElectraVariant
} from './electraParameters.js';

const historicallyValidatedVariants = new Set([
  'CON COFRE / SIN GUÍA',
  'SIN COFRE / CON GUÍA'
]);


export function calculateElectra({ order, awning }) {
  const parameters = normalizeElectraParameters(order.parameters?.electra);
  const structureColor = awning.structureColor || order.structureColor;
  const lacado = resolveLacado(structureColor);
  const device = normalizeElectraDevice(awning.device);
  const variant = normalizeElectraVariant(awning.submodel);
  const support = normalizeElectraSupport(awning.electraSupport);
  const hasCofre = electraHasCofre(variant);
  const hasGuide = electraHasGuide(variant);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = fabricSelection ? resolveFabric(fabricSelection) : null;
  const modified = Boolean(awning.reglasModificadas);
  const motor = device === 'MOTOR' ? getElectraMotor(awning.motorPower) : null;
  const variantIsValidated = !variant || historicallyValidatedVariants.has(variant);
  const supportIsCompatible = !variant || !support || (hasCofre
    ? support === electraCofreSupport
    : support !== electraCofreSupport);
  const unvalidatedTextile = ['VELCRO', 'TUBO'].includes(awning.curtainFinish)
    || Number(awning.valanceHeight) > 0;
  const diagnostics = [];
  const missingFields = [];

  if (!variant) missingFields.push('variante');
  if (!support) missingFields.push('tipo de soporte');
  if (!structureColor) missingFields.push('lacado');
  if (!fabricSelection) missingFields.push('tela');
  if (!device) missingFields.push('accionamiento válido');
  if (!awning.placement) missingFields.push('colocación');
  if (device && !awning.machineSide) missingFields.push(device === 'MOTOR' ? 'posición del motor' : 'lado de máquina');
  if (device && device !== 'MOTOR' && !Number(awning.crankHeight)) missingFields.push('altura de manivela');
  if (device === 'MOTOR' && !motor) missingFields.push('motor Electra confirmado');
  if (awning.curtainHasWindow === null || awning.curtainHasWindow === undefined) missingFields.push('ventana sí/no');
  if (!awning.curtainFinish) missingFields.push('confección');
  if (awning.curtainHasWindow && [
    awning.curtainWindowExit,
    awning.curtainWindowCorner,
    awning.curtainWindowFloorHeight,
    awning.curtainWindowHeight
  ].some((value) => !Number(value))) missingFields.push('medidas de ventana');
  const hasConfirmedCofreGuideDiscount = modified
    && awning.electraGuideDiscountCm !== null
    && awning.electraGuideDiscountCm !== undefined
    && Number.isFinite(Number(awning.electraGuideDiscountCm));
  if (hasCofre && hasGuide && modified && !hasConfirmedCofreGuideDiscount) missingFields.push('descuento de guía confirmado');

  const defaults = getElectraDiscounts(parameters, variant, support, device);
  const fabricDiscount = effectiveNumber(awning, 'electraFabricWidthDiscountCm', defaults.fabric);
  const rollDiscount = effectiveNumber(awning, 'electraRollDiscountCm', defaults.roll);
  const loadBarDiscount = effectiveNumber(awning, 'electraLoadBarDiscountCm', defaults.loadBar);
  const boxProfileDiscount = hasCofre
    ? effectiveNumber(awning, 'electraBoxProfileDiscountCm', defaults.boxProfile)
    : 0;
  const guideDiscount = hasGuide
    ? effectiveNumber(awning, 'electraGuideDiscountCm', defaults.guide)
    : 0;
  const dropAllowance = effectiveNumber(
    awning,
    'electraFabricDropAllowanceCm',
    parameters.fabricDropAllowanceCm[device || 'MAQ. INTERIOR']
  );

  const fabricWidth = round1(Number(awning.width) - fabricDiscount);
  const valanceHeight = Math.max(0, Number(awning.valanceHeight) || 0);
  const fabricDrop = round1(Number(awning.projection) + dropAllowance + valanceHeight);
  const rollTubeLength = round1(Number(awning.width) - rollDiscount);
  const loadBarLength = round1(Number(awning.width) - loadBarDiscount);
  const boxProfileLength = hasCofre ? round1(Number(awning.width) - boxProfileDiscount) : 0;
  const guideLength = hasGuide ? round1(Number(awning.projection) - guideDiscount) : 0;
  const rollStockLength = chooseStock(rollTubeLength, parameters.rollStockLengths);
  // El perfil de carga depende de la variante, no del soporte: sin cofre se consume el
  // perfil Maxiscreen-Elit (PECARMAX) también con soporte universal, y con cofre el
  // Univers 280 (consumo real de 35 OF desde 2024).
  const universalLoadProfile = hasCofre;
  // El UNIVERS-280 tiene sus propias referencias en blanco y negro; ver lacados.js.
  const loadProfileSuffix = universalLoadProfile ? universProfileSuffix(lacado.suffix) : lacado.suffix;
  // Perfil de carga y perfil del cofre eligen su largo cada uno: en las OF reales van,
  // por ejemplo, cofre de 700 con Univers de 600. El Univers, entre los largos que
  // existen en ese lacado (universProfileLengths.js).
  // El lacado especial se hace lacando fuera un perfil estándar: se reserva la
  // referencia base, como antes, con su aviso.
  const specialLacado = !lacado.suffix;
  const loadStockLengths = universalLoadProfile && !specialLacado
    ? universProfileStockLengths(loadProfileSuffix, [400, 500, 600, 700])
    : parameters.profileStockLengths;
  const loadStockLength = chooseStock(loadBarLength, loadStockLengths);
  const boxStockLength = hasCofre ? chooseStock(boxProfileLength, parameters.profileStockLengths) : null;
  const profileStockLength = hasCofre ? (loadStockLength && boxStockLength ? Math.max(loadStockLength, boxStockLength) : null) : loadStockLength;
  const guideStockLength = hasGuide ? chooseStock(guideLength, parameters.guideStockLengths) : null;
  const loadProfileBase = universalLoadProfile ? 'PUNI280' : 'PECARMAX';
  const loadProfileReference = universalLoadProfile
    ? { code: loadStockLength && !specialLacado ? `PUNI280${loadProfileSuffix}${loadStockLength}C` : 'PUNI280', generic: !loadStockLength || specialLacado }
    : verticalReference('PECARMAX', loadProfileSuffix, loadBarLength, parameters.profileStockLengths);
  const boxProfileReference = hasCofre
    ? verticalReference('PERPRLON', lacado.suffix, boxProfileLength, parameters.profileStockLengths)
    : null;
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  });
  const overWidth = Number(awning.width) > parameters.standardMaxWidth;
  const overDrop = Number(awning.projection) > parameters.standardMaxDrop;
  const negativeCuts = missingFields.length === 0
    ? findNegativeCuts([
      { name: 'TELÓN', length: fabricWidth },
      { name: 'TUBO DE ENROLLE', length: rollTubeLength },
      { name: 'PERFIL DE CARGA', length: loadBarLength },
      ...(hasCofre ? [{ name: 'PERFIL DE COFRE', length: boxProfileLength }] : []),
      ...(hasGuide ? [{ name: 'PERFIL DE GUÍA', length: guideLength }] : [])
    ])
    : [];
  const valid = missingFields.length === 0
    && negativeCuts.length === 0
    && Boolean(fabric)
    && supportIsCompatible
    && (variantIsValidated || modified)
    && (!unvalidatedTextile || modified)
    && Boolean(rollStockLength)
    && Boolean(profileStockLength)
    && (!hasGuide || Boolean(guideStockLength))
    && (!(overWidth || overDrop) || modified);

  if (negativeCuts.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: negativeCutMessage('ELECTRA', awning.of, negativeCuts) });
  }
  if (fabricSelection && !fabric) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela no encontrada en el catálogo: "${fabricSelection}".` });
  }
  if (missingFields.length) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ELECTRA incompleto en OF ${awning.of}: falta ${missingFields.join(' y ')}.` });
  } else if (!supportIsCompatible) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: hasCofre
      ? `ELECTRA ${variant}: el soporte debe ser ${electraCofreSupport}.`
      : `ELECTRA ${variant}: ${electraCofreSupport} solo corresponde a variantes con cofre.` });
  } else if (!variantIsValidated && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ELECTRA ${variant}: no hay fabricación reciente validada. Activa una excepción técnica y confirma las reglas para continuar.` });
  } else if (unvalidatedTextile && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: 'ELECTRA con bamba o confección especial: requiere excepción técnica para confirmar medidas y metraje.' });
  } else if ((overWidth || overDrop) && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ELECTRA fuera de estándar: ${awning.width}x${awning.projection} cm, máximo ${parameters.standardMaxWidth}x${parameters.standardMaxDrop} cm. Activa una excepción técnica para continuar.` });
  } else if (!rollStockLength || !profileStockLength || (hasGuide && !guideStockLength)) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: 'ELECTRA no válido: no hay largo de stock suficiente para las piezas calculadas.' });
  }
  if (!variantIsValidated && modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `ELECTRA ${variant}: variante sin caso reciente de fabricación, autorizada mediante excepción técnica.` });
  }
  if (hasGuide && lacado.suffix !== 'BL16') {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `ELECTRA con guía en ${structureColor}: RPS solo mantiene referencias activas de guía terminada en blanco; revisar referencia/lacado antes de producir.` });
  }
  if (unvalidatedTextile && modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: 'ELECTRA con confección especial: revisar medidas de ventana/bamba y metraje antes de producir.' });
  }
  if (profileStockLength && loadProfileReference?.generic) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `ELECTRA: no hay referencia terminada activa confirmada para el perfil de carga ${structureColor} de ${profileStockLength} cm; se reserva la referencia base ${loadProfileBase}.` });
  }
  if (profileStockLength && boxProfileReference?.generic) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `ELECTRA: no hay referencia terminada activa confirmada para el perfil de cofre ${structureColor} de ${profileStockLength} cm; se reserva la referencia base PERPRLON.` });
  }
  if (modified && valid) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de ELECTRA modificadas.` });
  }

  const context = {
    awning, device, variant, support, hasCofre, hasGuide, lacado, fabric,
    rollStockLength, profileStockLength, guideStockLength,
    rollTubeLength, loadBarLength, boxProfileLength, guideLength,
    loadProfileReference, loadProfileBase, boxProfileReference, motor,
    fabricMl: fabricUsage.ml, fabricWidth
  };

  return {
    of: awning.of,
    description: buildDescription(awning, variant, support, { fabricWidth, fabricDrop, fabricMl: fabricUsage.ml }),
    materials: valid ? buildMaterials(context) : [],
    despiece: valid ? buildDespiece(context) : null,
    diagnostics,
    calculation: {
      model: 'ELECTRA', valid, minimumLine: 0,
      width: awning.width, projection: awning.projection,
      fabricWidth, fabricDrop, fabricUsageDrop: fabricDrop,
      fabricMl: fabricUsage.ml, fabricPanels: fabricUsage.panels,
      mainFabricMl: fabricUsage.ml, mainFabricPanels: fabricUsage.panels,
      fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '',
      fabricRollWidth: fabric?.width || 120,
      structureLength: loadBarLength, rollTubeLength, stockLength: profileStockLength,
      submodel: variant, electraSupport: support,
      guideType: hasGuide ? 'GUÍA ELIT VERTICAL 120' : '', guideLength,
      boxProfileLength, loadBarLength, rollStockLength, profileStockLength, guideStockLength,
      motorPower: motor?.value || '', armCount: 0,
      electraFabricWidthDiscountCm: fabricDiscount,
      electraRollDiscountCm: rollDiscount,
      electraLoadBarDiscountCm: loadBarDiscount,
      electraBoxProfileDiscountCm: boxProfileDiscount,
      electraGuideDiscountCm: guideDiscount,
      electraFabricDropAllowanceCm: dropAllowance
    }
  };
}

// Piezas del Electra, contrastadas con el consumo real (35 OF desde 2024):
// - Perfil de carga según la variante, con sus tapas: sin cofre, el juego de tapas
//   Maxiscreen (en negro en 13 de 14 OF, también con estructura blanca); con cofre,
//   los tapones del Univers 280.
// - Guías: de una barra salen las dos (se reservaban dos barras) y una tira de felpa
//   FELPAELIT por guía.
// - Varilla blanca al largo de la barra y, con cofre, también la negra.
// - Con ventana, el cristal de 140, como en Cortina.
// - Motor con rueda P-801 mecanizada y corona LT50 Ø78, como en Cortina; sin CASPLAS.
function electraPieces(context) {
  const {
    awning, device, support, hasCofre, hasGuide, lacado, rollStockLength, guideStockLength,
    rollTubeLength, loadBarLength, boxProfileLength, guideLength, loadProfileReference,
    boxProfileReference, motor, fabricWidth
  } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const supportLine = supportMaterial(support, lacado.suffix, units);
  const varillaMl = Math.ceil(Number(loadBarLength) || 0) / 100;
  const pieces = [
    { ...supportLine },
    { code: `TURA80HG${rollStockLength}C`, quantity: units, description: 'TUBO DE ENROLLE P801', length: rollTubeLength },
    { code: tipBushing('P801').code, quantity: units, description: tipBushing('P801').description },
    { code: loadProfileReference.code, quantity: units, description: loadProfileDescription(), length: loadBarLength },
    hasCofre
      ? plasticUniversalCaps(lacado, units)
      : { code: 'TAPASLAMAXSCNE11', quantity: units, description: 'JGO TAPAS PERFIL CARGA MAXISCREEN' }
  ];
  if (hasCofre) pieces.push({ code: boxProfileReference.code, quantity: units, description: 'PERFIL COFRE ELECTRA', length: boxProfileLength });
  if (hasGuide) {
    const guideBars = guideStockLength ? Math.max(1, Math.ceil((2 * guideLength) / guideStockLength)) : 2;
    pieces.push(
      { code: guideCode(lacado.suffix, guideStockLength), quantity: guideBars * units, description: 'PERFIL GUÍA ELIT VERTICAL 120', length: guideLength },
      { code: retainerCode(lacado.suffix), quantity: units, description: 'KIT RETENEDOR ELIT VERTICAL' },
      { code: 'FELPAELIT', quantity: round1((2 * guideLength) / 100 * units), description: 'FELPA 7X8 ELIT VERTICAL', despiece: false }
    );
  }
  if (support === 'UNIVERSAL 3 AGUJEROS') pieces.push(...universalSupportAccessories(units));
  if (!hasCofre) {
    pieces.push(
      { code: null, quantity: 2 * units, description: 'CADENILLAS INOX', reserve: false },
      { code: null, quantity: 2 * units, description: 'PUENTES ABATIBLES', reserve: false },
      { code: null, quantity: 2 * units, description: 'REGLETA ZAMACK', reserve: false }
    );
  }
  pieces.push({ code: 'VARILLAVAINARBLA', quantity: round1(varillaMl * units), description: 'VARILLA VAINA RIGIDA 5,5 BLANCA', despiece: false });
  if (hasCofre) pieces.push({ code: 'VARILLAVAINANEG5', quantity: round1(varillaMl * units), description: 'VARILLA VAINA NEGRA 4,5MM', despiece: false });
  if (awning.curtainHasWindow === true) {
    const glassCm = Number(fabricWidth) - 2 * (Number(awning.curtainWindowCorner) || 0) + 10;
    if (glassCm > 0) pieces.push({ code: 'CRISTATP140650', quantity: Math.round(glassCm / 100 * units * 100) / 100, description: 'CRISTAL UV ALTA TRANSPARENCIA 140 AN', despiece: false });
  }
  if (device === 'MOTOR') {
    const remote = resolveMotorRemote(awning.sensor);
    pieces.push(
      { code: motor.code, quantity: units, description: motor.description },
      { code: 'RUEDAMOT801MEC', quantity: units, description: 'RUEDA MOTRIZ A P-801 MECANIZADA' },
      { code: 'CORONALT5078', quantity: units, description: 'CORONA ADAPTADA LT50 TUBO Ø78' },
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' },
      { code: remote.code, quantity: units, description: remote.description, aggregation: 'max' }
    );
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    const machineBushing = hasCofre
      ? { code: 'CASMAQEJE6378MM', description: 'CASQUILLO MÁQUINA EJE 63 MM Ø78' }
      : { code: 'CASMAQEJE5078MM', description: 'CASQUILLO MÁQUINA EJE 50 MM Ø78' };
    pieces.push(
      { code: machineBushing.code, quantity: units, description: machineBushing.description },
      { code: machineCode(lacado), quantity: units, description: `MÁQUINA MB-11 L-120 ${lacado.crank}` },
      { code: `MANIVE${crankSuffix(lacado)}${crankHeight}C`, quantity: units, description: `MANIVELA LUXE ${lacado.crank} ${crankHeight}`, length: crankHeight }
    );
  }
  return pieces.filter(Boolean);
}

function buildMaterials(context) {
  const { awning, fabric, fabricMl } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = electraPieces(context)
    .filter((piece) => piece.code && piece.reserve !== false)
    .map(({ code, quantity, description, aggregation }) => (aggregation
      ? { ...line(code, quantity, description), aggregation }
      : line(code, quantity, description)));
  if (fabric) materials.push(line(fabric.code, fabricMl, fabric.description));
  const wall = wallMaterial(awning.wallType, units);
  if (wall) materials.push(wall);
  return materials.filter(Boolean);
}

function buildDespiece(context) {
  const { awning } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const rows = electraPieces(context)
    .filter((piece) => piece.despiece !== false)
    .map((piece, index) => ({ num: index + 1, name: piece.description, reference: piece.code || null, units: piece.quantity, length: piece.length ?? null }));
  const wall = behaviorData.options.tiposPared.find((item) => item.pared === awning.wallType);
  const anchoring = wall ? { name: wall.tornilleria, reference: wall.referencia || null, units: wall.unidades * units } : null;
  return { rows, anchoring };
}

function supportMaterial(support, suffix, units) {
  if (support === electraCofreSupport) {
    const code = suffix === 'BL16' ? 'SOPMAXSCRBOXBL16'
      : suffix === 'NE11' ? 'SOPMAXSCRBOXNE11' : 'SOPMAXSCRBOX';
    return line(code, units, 'SOPORTE MAXISCREEM PARA COFRE');
  }
  if (support === 'SOPORTES ALMAGRO') {
    const code = suffix === 'BL16' ? 'SOPALMAGRBLAN'
      : suffix === 'NE11' ? 'SOPALMAGRNEGR'
        : suffix === 'MR14' ? 'SOPALMAGRMR14' : 'SOPALMAGR';
    return line(code, units, 'JGO. SOPORTES ALMAGRO');
  }
  if (support === 'UNIVERSAL 3 AGUJEROS') {
    return line(`SOPUNI3AGU${suffix}`, units, 'JGO. SOPORTE UNIVERSAL 3 AGUJEROS');
  }
  if (support === 'SOPORTE MAXISCREEN') {
    return line(`SOPMAXSCR${suffix}`, units, 'JGO. SOPORTE MAXISCREEN SIN COFRE');
  }
  const code = suffix === 'BL16' ? 'ELITSOSTBL16' : suffix === 'NE11' ? 'ELITSOSTNE11' : 'ELITSOST';
  return line(code, units, 'JGO. SOPORTE ELIT VERTICAL');
}

function guideCode(suffix, stockLength) {
  return suffix === 'BL16' ? `ELITGU12BL16${stockLength}C` : 'ELITGU12';
}

function retainerCode(suffix) {
  if (suffix === 'BL16') return 'KITRETENEDORBL16';
  if (suffix === 'NE11') return 'KITRETENEDORNE11';
  return 'KITRETENEDOR';
}

// Referencia de PECARMAX o PERPRLON con el largo que existe en ese lacado; si no hay
// ninguno, la referencia base con aviso (generic), como antes.
function verticalReference(base, suffix, needed, wanted) {
  const length = pickVerticalProfileLength(base, suffix, wanted, needed);
  return length ? { code: verticalProfileCode(base, suffix, length), generic: false } : { code: base, generic: true };
}



function loadProfileDescription() {
  return 'TUBO DE CARGA ELIT';
}

function plasticUniversalCaps(lacado, units) {
  return line(`TAPOPLUN280${plasticCapSuffix(lacado)}`, units, 'KIT TAPONES PLÁSTICO UNIVERS 280');
}

function universalSupportAccessories(units) {
  return [line('MOSQBOACIN60MM', 2 * units, 'MOSQUETÓN BOMBERO ACERO INOX 60 MM')];
}

function wallMaterial(wallType, units) {
  const wall = behaviorData.options.tiposPared.find((item) => item.pared === wallType);
  return wall?.referencia ? line(wall.referencia, wall.unidades * units, wall.tornilleria) : null;
}

function effectiveNumber(awning, field, fallback) { return effectiveOverride(awning, field, fallback); }

function chooseStock(length, stockLengths) {
  return stockLengths.find((stock) => stock >= length) || null;
}

function line(code, quantity, description) {
  return code ? { code, quantity, description } : null;
}

function buildDescription(awning, variant, support, calculation) {
  return `Toldo ELECTRA / ELIT VERTICAL · ${variant} · ${support} · ${formatNumber(awning.width)}x${formatNumber(awning.projection)} · tela ${formatNumber(calculation.fabricWidth)}x${formatNumber(calculation.fabricDrop)} · ${formatNumber(calculation.fabricMl)} ml`;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
