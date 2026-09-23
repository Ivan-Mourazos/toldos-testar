// Estructura del HERA según el consumo real (CPRImputationMaterialMO de las 24 OF de
// HERA 56 imputadas desde 2025, 23/09/2026):
// - kit Swift 43-56 (mando + soporte), uno por toldo en todas;
// - adaptador Swift para el tubo Ø56: dos por toldo con cadena, uno con motor;
// - con cadena, contrapeso y dos uniones (también con el anillo cerrado, OF 0212194);
// - con motor, rueda LT50 para tubo de 53;
// - tubo de 600: los cortes que caben en una barra salen de ella (AR2603981 gastó 3
//   barras para 5 toldos);
// - abajo, perfil de contrapeso con sus dos tapones o, con pletina, la pletina 25×4;
// - macarrón y, con varilla blanca, varilla vaina: el ancho de la tela.
// El HERA 43 lleva su kit ("solamente para el Ø43") y el tubo Ø43, sin adaptador.

const TUBE_STOCK_CM = 600;
const PROFILE_STOCK_CM = 600;
const PLATE_STOCK_CM = 635;

const colorSuffix = Object.freeze({ BLANCO: 'BLAN', NEGRO: 'NEGR' });

export function heraUsesPlate(bottomFinish) {
  return /PLETINA/i.test(String(bottomFinish || ''));
}

export function heraStructurePieces({ variant, color, units = 1, rollTubeLength, fabricWidth, bottomFinish }) {
  const suffix = colorSuffix[color];
  if (!suffix || !variant) return [];
  const motor = variant === 'HERA 56 MOTOR';
  const tube43 = variant === 'HERA 43 MAQUINA';
  const finish = String(bottomFinish || '').trim().toUpperCase();
  const fabricMeters = round2(units * fabricWidth / 100);
  const lines = [
    tube43
      ? { code: `SCRKITSW43${suffix}`, quantity: units, description: 'KIT MECANISMO SWIFT 43 (MANDO+SOPORTE)' }
      : { code: `SCRKITSW4350${suffix}`, quantity: units, description: 'KIT MECANISMO SWIFT 43-56MM (MANDO+SOPORTE)' },
    ...(tube43 ? [] : [{ code: `SCRADPSWIF${suffix}`, quantity: units * (motor ? 1 : 2), description: 'ADAPTADOR SWIFT TUBO 56 MM' }]),
    {
      code: tube43 ? 'SCRTUBO43P600CM' : 'SCRTUBO53600C',
      quantity: barsFor(rollTubeLength, units, TUBE_STOCK_CM),
      description: tube43 ? 'TUBO ALUMINIO SCREEN Ø43 OJIVA PLANA 600' : 'TUBO ALUMINIO SCREEN Ø56 600',
      length: rollTubeLength
    },
    ...(motor ? [
      { code: 'RUEDAAPLT5053', quantity: units, description: 'RUEDA LT50 PARA TUBO DE 53' }
    ] : [
      { code: color === 'NEGRO' ? 'SCRECONTRCADNEGRO' : 'SCRECONTRCADBLAN', quantity: units, description: 'CONTRAPESO CADENA SCREEN' },
      { code: `SCRUNICAD${suffix}`, quantity: units * 2, description: 'UNION CADENA SCREEN' }
    ]),
    ...bottomPieces({ finish, suffix, units, fabricWidth }),
    { code: 'MACALENGUSCREN43', quantity: fabricMeters, description: 'MACARRON PVC SCREEN C/LENGUETA TUBO 43 (M)' },
    ...(finish === 'VARILLA BLANCA' ? [{ code: 'VARILLAVAINARBLA', quantity: fabricMeters, description: 'VARILLA VAINA RIGIDA 5,5 BLANCA (M)' }] : [])
  ];
  return lines.filter((line) => line.quantity > 0);
}

// El perfil de contrapeso y sus tapones solo existen en blanco (se usan también en los
// toldos negros, OF 0218353). E.T. platanero no tiene consumo: no se reserva nada abajo.
function bottomPieces({ finish, suffix, units, fabricWidth }) {
  if (heraUsesPlate(finish)) {
    return [{ code: `PLA4${suffix}25MM635C`, quantity: barsFor(fabricWidth, units, PLATE_STOCK_CM), description: 'PLETINA ALUMINIO 4MM 25MM 635', length: fabricWidth }];
  }
  if (finish === 'E.T. PLATANERO' || !finish) return [];
  return [
    { code: 'SCRPECBLAN600C', quantity: barsFor(fabricWidth, units, PROFILE_STOCK_CM), description: 'PERFIL ALUMINIO CONTRAPESO SCREEN 600', length: fabricWidth },
    { code: 'SCRTAPINFBLANDCH', quantity: units, description: 'TAPON SCREEN TUBO INFERIOR DERECHO' },
    { code: 'SCRTAPINFBLANIZQ', quantity: units, description: 'TAPON SCREEN TUBO INFERIOR IZQUIERDO' }
  ];
}

// Barras enteras para `units` cortes iguales: los que caben en una barra se sacan de ella.
export function barsFor(cut, units, stock) {
  const length = Number(cut) || 0;
  if (length <= 0) return 0;
  if (length > stock) return units * Math.ceil(length / stock);
  return Math.ceil(units / Math.floor(stock / length));
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
