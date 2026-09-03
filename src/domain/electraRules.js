import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { crankSuffix, machineCode, resolveLacado } from './lacados.js';
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

const activeProfileReferences = Object.freeze({
  PECARMAX: new Set([
    'PECARMAX500C',
    'PECARMAXBL16500C', 'PECARMAXBL16700C', 'PECARMAXGR16700C',
    'PECARMAXMR14500C', 'PECARMAXMR14700C', 'PECARMAXNE11500C',
    'PECARMAXNE11700C', 'PECARMAXO516500C', 'PECARMAXO516700C'
  ]),
  PERPRLON: new Set([
    'PERPRLON500C',
    'PERPRLONBL16500C', 'PERPRLONGR12700C', 'PERPRLONGR16500C',
    'PERPRLONMR14500C', 'PERPRLONMR14700C', 'PERPRLONNE11700C',
    'PERPRLONO516500C', 'PERPRLONO516700C', 'PERPRLONPL27500C'
  ]),
  PUNI280: new Set([
    'PUNI280BL16600C', 'PUNI280MR14600C', 'PUNI280NE11700C'
  ])
});

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
  const specialTextile = awning.curtainHasWindow === true
    || ['VELCRO', 'TUBO'].includes(awning.curtainFinish)
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
  const fabricDrop = round1(Number(awning.projection) + dropAllowance);
  const rollTubeLength = round1(Number(awning.width) - rollDiscount);
  const loadBarLength = round1(Number(awning.width) - loadBarDiscount);
  const boxProfileLength = hasCofre ? round1(Number(awning.width) - boxProfileDiscount) : 0;
  const guideLength = hasGuide ? round1(Number(awning.projection) - guideDiscount) : 0;
  const rollStockLength = chooseStock(rollTubeLength, parameters.rollStockLengths);
  const universalLoadProfile = support === 'UNIVERSAL 3 AGUJEROS';
  const profileStockLengths = universalLoadProfile
    ? universalProfileStockLengths(lacado.suffix)
    : parameters.profileStockLengths;
  const profileStockLength = chooseStock(Math.max(loadBarLength, boxProfileLength), profileStockLengths);
  const guideStockLength = hasGuide ? chooseStock(guideLength, parameters.guideStockLengths) : null;
  const loadProfileBase = universalLoadProfile ? 'PUNI280' : 'PECARMAX';
  const loadProfileReference = resolveProfileReference(loadProfileBase, lacado.suffix, profileStockLength);
  const boxProfileReference = hasCofre
    ? resolveProfileReference('PERPRLON', lacado.suffix, profileStockLength)
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
  const valid = missingFields.length === 0
    && Boolean(fabric)
    && supportIsCompatible
    && (variantIsValidated || modified)
    && (!specialTextile || modified)
    && Boolean(rollStockLength)
    && Boolean(profileStockLength)
    && (!hasGuide || Boolean(guideStockLength))
    && (!(overWidth || overDrop) || modified);

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
  } else if (specialTextile && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: 'ELECTRA con ventana, bamba o confección especial: requiere excepción técnica para confirmar medidas y metraje.' });
  } else if ((overWidth || overDrop) && !modified) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: `ELECTRA fuera de estándar: máximo ${parameters.standardMaxWidth}x${parameters.standardMaxDrop} cm. Activa una excepción técnica para continuar.` });
  } else if (!rollStockLength || !profileStockLength || (hasGuide && !guideStockLength)) {
    diagnostics.push({ level: 'error', awningId: awning.id, message: 'ELECTRA no válido: no hay largo de stock suficiente para las piezas calculadas.' });
  }
  if (!variantIsValidated && modified) {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `ELECTRA ${variant}: variante sin caso reciente de fabricación, autorizada mediante excepción técnica.` });
  }
  if (hasGuide && lacado.suffix !== 'BL16') {
    diagnostics.push({ level: 'warn', awningId: awning.id, message: `ELECTRA con guía en ${structureColor}: RPS solo mantiene referencias activas de guía terminada en blanco; revisar referencia/lacado antes de producir.` });
  }
  if (specialTextile && modified) {
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
    fabricMl: fabricUsage.ml
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

function buildMaterials(context) {
  const {
    awning, device, support, hasCofre, hasGuide, lacado, fabric,
    rollStockLength, guideStockLength, fabricMl,
    loadProfileReference, loadProfileBase, boxProfileReference, motor
  } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const materials = [
    supportMaterial(support, lacado.suffix, units),
    line(`TURA80HG${rollStockLength}C`, units, 'TUBO DE ENROLLE P801'),
    line('CASPUNCE', units, 'CASQUILLO PUNTA'),
    line(loadProfileReference.code, units, loadProfileDescription(loadProfileBase))
  ];
  if (support === 'UNIVERSAL 3 AGUJEROS') {
    materials.push(...universalAccessories(lacado.suffix, units));
  }
  if (hasCofre) materials.push(line(boxProfileReference.code, units, 'PERFIL COFRE ELECTRA'));
  if (hasGuide) {
    materials.push(
      line(guideCode(lacado.suffix, guideStockLength), 2 * units, 'PERFIL GUÍA ELIT VERTICAL 120'),
      line(retainerCode(lacado.suffix), units, 'KIT RETENEDOR ELIT VERTICAL')
    );
  }
  if (device === 'MOTOR') {
    materials.push(
      line(motor.code, units, motor.description),
      line('RUEDAMOT78', units, 'RUEDA MOTRIZ Ø 78'),
      line('CORONALT6078', units, 'CORONA LT 60 ADAPTADA Ø 78'),
      line('SOPORTEUNVHIPRO', units, 'SOPORTE UNIVERSAL HIPRO')
    );
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    const machineBushing = hasCofre
      ? { code: 'CASMAQEJE6378MM', description: 'CASQUILLO MÁQUINA EJE 63 MM Ø78' }
      : { code: 'CASMAQEJE5078MM', description: 'CASQUILLO MÁQUINA EJE 50 MM Ø78' };
    materials.push(
      line(machineBushing.code, units, machineBushing.description),
      line(machineCode(lacado), units, `MÁQUINA ZNP 10 L170 ${lacado.crank}`),
      line(`MANIVE${crankSuffix(lacado)}${crankHeight}C`, units, `MANIVELA LUXE ${lacado.crank} ${crankHeight}`),
      line('CASPLAS', units, 'TACO NYLON MÁQUINA')
    );
  }
  if (fabric) materials.push(line(fabric.code, fabricMl, fabric.description));
  const wall = wallMaterial(awning.wallType, units);
  if (wall) materials.push(wall);
  return materials.filter(Boolean);
}

function buildDespiece(context) {
  const {
    awning, device, support, hasCofre, hasGuide, lacado,
    rollStockLength, guideStockLength,
    rollTubeLength, loadBarLength, boxProfileLength, guideLength,
    loadProfileReference, loadProfileBase, boxProfileReference, motor
  } = context;
  const units = Math.max(1, Number(awning.units) || 1);
  const rows = [];
  const push = (num, name, reference, rowUnits, length = null) => rows.push({ num, name, reference: reference || null, units: rowUnits, length });
  const supportLine = supportMaterial(support, lacado.suffix, units);
  push(1, supportLine.description, supportLine.code, units);
  push(2, 'TUBO DE ENROLLE P801', `TURA80HG${rollStockLength}C`, units, rollTubeLength);
  push(3, 'CASQUILLO PUNTA', 'CASPUNCE', units);
  push(4, loadProfileDescription(loadProfileBase), loadProfileReference.code, units, loadBarLength);
  if (support === 'UNIVERSAL 3 AGUJEROS') {
    const [caps, hooks] = universalAccessories(lacado.suffix, units);
    push(5, caps.description, caps.code, caps.quantity);
    push(6, hooks.description, hooks.code, hooks.quantity);
  } else {
    push(5, 'JUEGO DE TAPAS BARRA DE CARGA', null, units);
  }
  let number = support === 'UNIVERSAL 3 AGUJEROS' ? 7 : 6;
  if (hasCofre) push(number++, 'PERFIL COFRE ELECTRA', boxProfileReference.code, units, boxProfileLength);
  if (hasGuide) {
    push(number++, 'PERFIL GUÍA ELIT VERTICAL 120', guideCode(lacado.suffix, guideStockLength), 2 * units, guideLength);
    push(number++, 'KIT RETENEDOR ELIT VERTICAL', retainerCode(lacado.suffix), units);
  }
  if (device === 'MOTOR') {
    push(number++, motor.description, motor.code, units);
    push(number++, 'RUEDA MOTRIZ Ø 78', 'RUEDAMOT78', units);
    push(number++, 'CORONA LT 60 ADAPTADA Ø 78', 'CORONALT6078', units);
    push(number++, 'SOPORTE UNIVERSAL HIPRO', 'SOPORTEUNVHIPRO', units);
  } else {
    const crankHeight = Math.max(0, Number(awning.crankHeight) || 0);
    push(number++, hasCofre ? 'CASQUILLO MÁQUINA EJE 63 MM Ø78' : 'CASQUILLO MÁQUINA EJE 50 MM Ø78', hasCofre ? 'CASMAQEJE6378MM' : 'CASMAQEJE5078MM', units);
    push(number++, `MÁQUINA ZNP 10 L170 ${lacado.crank}`, machineCode(lacado), units);
    push(number++, `MANIVELA LUXE ${lacado.crank} ${crankHeight}`, `MANIVE${crankSuffix(lacado)}${crankHeight}C`, units, crankHeight);
    push(number++, 'TACO NYLON MÁQUINA', 'CASPLAS', units);
  }
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

function resolveProfileReference(base, suffix, stockLength) {
  const candidate = stockLength ? `${base}${suffix || ''}${stockLength}C` : '';
  return activeProfileReferences[base]?.has(candidate)
    ? { code: candidate, generic: false }
    : { code: base, generic: true };
}

function universalProfileStockLengths(suffix) {
  return suffix === 'NE11' ? [700] : [600];
}

function loadProfileDescription(base) {
  return base === 'PUNI280'
    ? 'PERFIL ALUMINIO UNIVERS 280'
    : 'PERFIL CARGA MAXISCREEN-ELIT VERTICAL';
}

function universalAccessories(suffix, units) {
  const capsSuffix = ['BL16', 'MR14', 'NE11'].includes(suffix) ? suffix : '';
  return [
    line(`TAPOPLUN280${capsSuffix}`, units, 'KIT TAPONES PLÁSTICO UNIVERS 280'),
    line('MOSQBOACIN60MM', 2 * units, 'MOSQUETÓN BOMBERO ACERO INOX 60 MM')
  ];
}

function wallMaterial(wallType, units) {
  const wall = behaviorData.options.tiposPared.find((item) => item.pared === wallType);
  return wall?.referencia ? line(wall.referencia, wall.unidades * units, wall.tornilleria) : null;
}

function effectiveNumber(awning, field, fallback) {
  const value = awning[field];
  return awning.reglasModificadas && value !== null && value !== undefined && Number.isFinite(Number(value))
    ? Math.max(0, Number(value))
    : Number(fallback) || 0;
}

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
