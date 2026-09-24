import { crankSuffix, machineCode } from './lacados.js';
import { barsForCuts as barsFor } from './math.js';
import { irisCaps, irisProfile } from './irisStock.js';

// Piezas del Iris que no dependen del cofre (redondo o cuadrado) ni del sistema de guía
// (GPZ C, ÚNICA o STORM), según el consumo real de las 75 OF de Iris imputadas desde
// 2024 (23/09/2026). El cofre, las guías y la cremallera van más abajo, desde las
// respuestas de taller del 24/09/2026:
// - casquillo de punta y placa del eje, uno por toldo;
// - tubo P701 en el 110, P801 en el 130 y Ø110 en el 150, en los largos que se gastan;
// - pletina terminal de 300 (el lastre), dos tapones terminales y la goma de retención;
// - con máquina: casquillo de eje cuadrado, máquina MB-11 y manivela;
// - con motor: casquillo de motor, rueda y soporte Hipro. El motor no se reserva: la
//   tarjeta no lo pide y se usan varios (Sunea y Sunilus de 10 a 35 Nm).
// Blanco o negro por el mismo criterio que la manivela (columna de la tabla de lacados).

const bySeries = Object.freeze({
  110: { tube: 'TURA70HG', tubeStocks: [500, 700], tip: 'CASNMOSZ70MM', crankBushing: 'CASCES132070MM', motorBushing: 'CASADMOSZ70MM', wheel: 'RUEDAMOTHI68', rubberStock: 700 },
  130: { tube: 'TURA80HG', tubeStocks: [400, 500, 700, 800], tip: 'CASNMOSZ78MM', crankBushing: 'CASCES132080MM', motorBushing: 'CASADMOSZ78MM', wheel: 'RUEDAMOT801MEC', rubberStock: 700 },
  // El 150 solo va a motor; sin casquillos Screeny en sus 6 OF.
  150: { tube: 'TUEN110', tubeStocks: [500, 600, 800], tip: null, crankBushing: null, motorBushing: null, wheel: 'RUEDAMOT801MEC', rubberStock: 800 }
});

export function irisTubeStock(series, rollTubeLength) {
  const spec = bySeries[series];
  return spec?.tubeStocks.find((length) => length >= rollTubeLength) || null;
}

export function irisCommonPieces({ series, device, lacado, units = 1, rollTubeLength, loadBarLength, ballastLength, crankHeight }) {
  const spec = bySeries[series];
  if (!spec || !lacado) return [];
  const white = lacado.crank === 'BLANCA';
  const tubeStock = irisTubeStock(series, rollTubeLength);
  const lines = [
    ...(spec.tip ? [{ code: spec.tip, quantity: units, description: 'CASQUILLO SCREENY CON HUECO Ø14 ZIP' }] : []),
    { code: 'CASPLACASZ', quantity: units, description: 'PLACA H30MM CON EJE REDONDO EXTRAIBLE' },
    ...(tubeStock ? [{ code: `${spec.tube}${tubeStock}C`, quantity: barsFor(rollTubeLength, units, tubeStock), description: `TUBO DE ENROLLE ${spec.tube}`, length: rollTubeLength }] : []),
    { code: 'PLETSCR13300C', quantity: barsFor(ballastLength, units, 300), description: 'PLETINA TERMINAL 25X10 SCREENY 300', length: ballastLength },
    { code: `TAPTERSZ13${white ? 'BLAN' : 'NEGR'}`, quantity: units * 2, description: 'TAPON TERMINAL ZIP' },
    { code: `GOMASSCR${white ? '' : 'N'}${spec.rubberStock}C`, quantity: barsFor(loadBarLength, units, spec.rubberStock), description: 'GOMA RETENCION SCREENY', length: loadBarLength }
  ];
  if (device === 'MOTOR') {
    if (spec.motorBushing) lines.push({ code: spec.motorBushing, quantity: units, description: 'CASQUILLO SCREENY PARA MOTOR 50 ZIP' });
    lines.push(
      { code: spec.wheel, quantity: units, description: 'RUEDA MOTRIZ' },
      { code: 'SOPORTEUNVHIPRO', quantity: units, description: 'SOPORTE UNIVERSAL HIPRO' }
    );
  } else if (device === 'MAQUINA' && spec.crankBushing) {
    const height = Math.max(0, Number(crankHeight) || 0);
    lines.push(
      { code: spec.crankBushing, quantity: units, description: 'CASQUILLO CON EJE CUADRADO 13X20 ZIP' },
      { code: machineCode(lacado), quantity: units, description: 'MAQUINA MB-11 L-120' },
      ...(height ? [{ code: `MANIVE${crankSuffix(lacado)}${height}C`, quantity: units, description: `MANIVELA LUXE ${height} ${lacado.crank}` }] : [])
    );
  }
  return lines.filter((line) => line.quantity > 0);
}

// Cofre, según las respuestas de taller del 24/09/2026 (Q-I01: "sí cambia y se añade")
// y el consumo de las OF con cofre imputadas desde 2024:
// - perfil superior, el mismo con cofre redondo o cuadrado (en 52 de las 64 OF);
// - perfil inferior redondo o cuadrado (51 de 64; manual de BAT, piezas 11 y 11/1);
// - un juego de tapas por toldo (57 de 64, uno por toldo en 54).
// Las 7 OF sin tapas no tienen imputada ninguna pieza de estructura: cinco de los
// pedidos AR.25.01353 a 01364 (se imputó en sus OF hermanas) y dos 150 aún abiertas.
// El 150 solo tiene cofre redondo (manual del 150 y maestro de RPS).
const boxFamilies = Object.freeze({
  110: { top: 'PECOSSU1', REDONDO: { bottom: 'PECORSU1', caps: 'TAPASSUN1' }, CUADRADO: { bottom: 'PECOCSU1', caps: 'TAPASCOU1' } },
  130: { top: 'PECOSSU3', REDONDO: { bottom: 'PECORSU3', caps: 'TAPASCOR3' }, CUADRADO: { bottom: 'PECOCSU3', caps: 'TAPASCOU3' } },
  150: { top: 'PECOSSU5', REDONDO: { bottom: 'PECORSU5', caps: 'TAPASSUN5' } }
});

/**
 * Perfiles y tapas del cofre. `missing` lista lo que no existe en RPS en ese lacado
 * (ni lacado ni en bruto) y `raw`, si alguna pieza sale en bruto para lacar fuera.
 */
export function irisBoxPieces({ series, shape, lacado, units = 1, boxProfileLength }) {
  const spec = boxFamilies[series];
  const variant = spec?.[shape];
  const result = { lines: [], missing: [], raw: false };
  if (!variant || !lacado || !(boxProfileLength > 0)) return result;
  const shapeName = shape === 'CUADRADO' ? 'CUADRADO' : 'REDONDO';
  const pieces = [
    [spec.top, `PERFIL COFRE SUPERIOR ${series}`, 'perfil superior del cofre'],
    [variant.bottom, `PERFIL COFRE INFERIOR ${shapeName} ${series}`, `perfil inferior del cofre ${shapeName.toLowerCase()}`]
  ];
  for (const [family, description, label] of pieces) {
    const profile = irisProfile(family, lacado, boxProfileLength);
    if (!profile) {
      result.missing.push(label);
      continue;
    }
    result.raw ||= profile.raw;
    result.lines.push({ code: profile.code, quantity: barsFor(boxProfileLength, units, profile.stock), description, length: boxProfileLength });
  }
  const capsPiece = irisCaps(variant.caps, lacado);
  if (capsPiece) {
    result.raw ||= capsPiece.raw;
    result.lines.push({ code: capsPiece.code, quantity: units, description: `JGO TAPAS COFRE ${shapeName} ${series}` });
  } else {
    result.missing.push(`tapas del cofre ${shapeName.toLowerCase()}`);
  }
  return result;
}

// Guías según el sistema (Q-I02, "hay que reservar las guías y la cremallera"). La
// correspondencia con la tarjeta sale de la guía interna de OT (guía toldos iris.odt)
// y del manual de BAT: estándar = GPZ ÚNICA A/M, pequeña = GPZ ÚNICA M (solo motor),
// compensadora = GPZ C. Cantidades, del consumo desde 2024:
// - ÚNICA A/M (43 OF): perfil de guía (43), perfil tapa de guía (42) y guía PVC
//   interior (38), dos piezas por toldo (una barra de 600 hasta 3 m de guía); cuatro
//   pies (en las 43, cuatro por toldo en 35).
// - ÚNICA M (4 OF, todas a motor): perfil de guía solo motor y cuatro pies de enganche
//   (4 de 4); tapa de guía (3 de 4) y PVC interior como la A/M.
// - GPZ C (12 OF): perfil de guía (10), compensador (9) y PVC interior (8), dos piezas
//   por toldo; guía exterior, cuatro (2 barras por toldo en 8); dos pies (9).
// - Sin cofre (Cabrio), además un juego de pernos de guía (11 de 11 OF).
// Los perfiles van en el color del lacado (irisStock.js); el PVC y los pies, en blanco
// o negro por la columna de la manivela, como los tapones.
const GUIDE_PVC_STOCK_CM = 600;

export function irisGuidePieces({ guideType, hasBox, lacado, units = 1, guideLength, zipLength, compensatorLength }) {
  const result = { lines: [], missing: [], raw: false };
  if (!lacado || !(guideLength > 0)) return result;
  const white = lacado.crank === 'BLANCA';
  const plain = white ? 'BLAN' : 'NEGR';
  const innerLength = zipLength > 0 ? zipLength : guideLength;
  const profile = (family, length, pieces, description, label) => {
    const found = irisProfile(family, lacado, length, pieces * units);
    if (!found) {
      result.missing.push(label);
      return;
    }
    result.raw ||= found.raw;
    result.lines.push({ code: found.code, quantity: barsFor(length, pieces * units, found.stock), description, length });
  };
  const pvc = (code, length, pieces, description) => result.lines.push({
    code, quantity: barsFor(length, pieces * units, GUIDE_PVC_STOCK_CM), description, length
  });

  if (guideType === 'COMPENSADORA') {
    profile('PEGSZ13', guideLength, 2, 'PERFIL GUIA SCREENY GPZ C', 'perfil de guía GPZ C');
    profile('PEGCZ13', compensatorLength > 0 ? compensatorLength : guideLength, 2, 'PERFIL GUIA COMPENSADORA ENTREPAREDES GPZ C', 'perfil compensador GPZ C');
    pvc(`PEGEZ13${plain}600C`, guideLength, 4, 'PERFIL GUIA EXTERIOR SCREENY GPZ C');
    pvc(`PEGIZ13${plain}600C`, innerLength, 2, 'GUIA PVC INTERIOR ZIP');
    result.lines.push({ code: `PIE${plain}`, quantity: 2 * units, description: 'PIE SCREENY GPZ C' });
  } else if (guideType === 'ESTÁNDAR' || guideType === 'PEQUEÑA') {
    const onlyMotor = guideType === 'PEQUEÑA';
    profile(onlyMotor ? 'PEMoSU13' : 'PEMMSU13', guideLength, 2,
      onlyMotor ? 'PERFIL GUIA MOTOR GPZ UNICA' : 'PERFIL GUIA MAQUINA/MOTOR GPZ UNICA',
      onlyMotor ? 'perfil de guía solo motor' : 'perfil de guía');
    profile('PECGSU13', guideLength, 2, 'PERFIL CUBIERTA GUIA', 'perfil tapa de guía');
    pvc(`PEGIZS1${plain}600C`, innerLength, 2, 'GUIA PVC INTERIOR ZIP UNICA');
    result.lines.push(onlyMotor
      ? { code: `PIEGURSZ13${plain}`, quantity: 4 * units, description: 'PIE ENGANCHE GUIA MOTOR' }
      : { code: `PIEGMMSU${plain}`, quantity: 4 * units, description: 'PIE PARA GUIA UNICA (MAQUINA/MOTOR)' });
  }
  if (!hasBox && result.lines.length) result.lines.push({ code: 'PERGUIA', quantity: units, description: 'JGO PERNO GUIA SCREENY GPZ' });
  result.lines = result.lines.filter((line) => line.quantity > 0);
  return result;
}

/**
 * Cremallera, varilla vaina y macarrón (Q-I02 y Q-I04).
 * - Cremallera: siempre la XL (acuerdo del 09/10/2025, repetido el 24/09/2026). Desde
 *   entonces se gasta la caída de la tela: 2,9 m en la OF 0229575 (250 + 40) y 2,64 en
 *   la 0222569 (234 + 30). Blanca o gris: el negro está de baja desde 2021; se elige por
 *   la columna de la manivela, que acierta 16 de las 19 OF con XL.
 * - Varilla vaina y macarrón de Ø8: frente + 10 cm, en metros (rollo de 250 m y metros).
 */
export function irisZipAndHemPieces({ lacado, units = 1, front, fabricDrop }) {
  if (!lacado || !(front > 0)) return [];
  const hemMeters = round2((front + 10) / 100 * units);
  return [
    { code: lacado.crank === 'BLANCA' ? 'ZIPXLBLAN' : 'ZIPXLGRIS', quantity: round2((Number(fabricDrop) || 0) / 100 * units), description: 'CREMALLERA XL ZIP (M)' },
    { code: 'VARILLAVAINARBLA', quantity: hemMeters, description: 'VARILLA VAINA RIGIDA 5,5 BLANCA (M)' },
    { code: 'MACARRNEGR8MM', quantity: hemMeters, description: 'MACARRON PVC NEGRO 8MM (M)' }
  ].filter((line) => line.quantity > 0);
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
