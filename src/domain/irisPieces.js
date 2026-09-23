import { crankSuffix, machineCode } from './lacados.js';
import { barsForCuts as barsFor } from './math.js';

// Piezas del Iris que no dependen del cofre (redondo o cuadrado) ni del sistema de guía
// (GPZ C, ÚNICA o STORM), según el consumo real de las 75 OF de Iris imputadas desde
// 2024 (23/09/2026). Los perfiles del cofre, las guías, sus pies y la cremallera esperan
// a las preguntas 1, 2 y 4 del informe de Codex (informe-iris-hera-consumo.md):
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
