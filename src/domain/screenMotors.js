// Motor de Iris y HERA (Iván, 02/10/2026), sacado de lo gastado en RPS (docs/modelos/iris.md
// y hera.md): Iris 110 Sunilus IO 10/17, Iris 130 Sunilus IO 35/17 y HERA a motor Sunilus IO
// 6/17. El Iris 150 ha llevado uno distinto en cada pedido: no se reserva y se avisa. En la
// tarjeta se elige otro Sunilus sin candado (el HERA no tiene). El mando, uno por motor como en
// el resto (motorAccessories).

export const irisMotorPowers = ['10/17', '15/17', '35/17'];
export const heraMotorPowers = ['6/17', '10/17', '15/17'];

export function irisDefaultMotor(series) {
  if (String(series) === '110') return '10/17';
  if (String(series) === '130') return '35/17';
  return '';
}

export const heraDefaultMotor = '6/17';

/** El motor que se reserva: el elegido en la tarjeta si es uno de los posibles, si no, el de la regla. */
export function chosenMotor(awning, powers, fallback) {
  const chosen = String(awning?.motorPower || '');
  return powers.includes(chosen) ? chosen : fallback;
}

export function sunilusMaterial(power, units) {
  return { code: `SUNILUSIO${power.replace('/', '//')}`, quantity: units, description: `MOTOR SOMFY SUNILUS ${power} IO` };
}
