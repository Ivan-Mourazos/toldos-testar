// Motor de Iris y HERA (Iván, 02/10/2026), sacado de lo gastado en RPS (docs/modelos/iris.md
// y hera.md): Iris 110 Sunilus IO 10/17, Iris 130 Sunilus IO 35/17 y HERA a motor Sunilus IO
// 6/17. El Iris 150 ha llevado uno distinto en cada pedido: no se reserva y se avisa. En la
// tarjeta se elige otro Sunilus sin candado (el HERA no tiene). El mando, uno por motor como en
// el resto (motorAccessories).

// Motor solar Somfy RS100 Solar IO (Iván, 07/10/2026, pedido AR2604748). Cada motor lleva su
// batería y su panel. El 10/12, además, los soportes de batería y de antena: lo que gastó el
// HERA de la OF 0213066. El 15/12, el soporte del panel: lo que compras pidió para el Iris de
// la OF 0232537 (pedidos de compra 091184 y 091223).
export const solarMotorPowers = ['SOLAR 10/12', 'SOLAR 15/12'];
const solarKits = {
  'SOLAR 10/12': {
    motor: 'RS10010//12',
    battery: ['BATERIASOLAR', 'BATERIA 9,6 V MOTOR SOLAR RS100 3/6/10 NM'],
    panel: ['PANELSORS100', 'PANEL SOLAR 2,5 W RS100 3/6/10 NM'],
    supports: [['RS100SOBT', 'SOPORTE BATERIA MOTOR SOLAR IO'], ['RS100SOPAN', 'SOPORTE ANTENA MOTOR SOLAR IO']]
  },
  'SOLAR 15/12': {
    motor: 'RS10015//12',
    battery: ['BATERIASO16', 'BATERIA 16,8 V MOTOR SOLAR RS100 15/20 NM'],
    panel: ['PANELSORS10015', 'PANEL SOLAR 5,8 W RS100 15 NM'],
    supports: [['RS100SOPA', 'SOPORTE PANEL SOLAR']]
  }
};

export const irisMotorPowers = ['10/17', '15/17', '35/17', ...solarMotorPowers];
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

export function isSolarMotor(power) {
  return Object.hasOwn(solarKits, String(power || ''));
}

/** Lo que se reserva por el motor elegido: el Sunilus solo, o el solar con su kit. */
export function screenMotorMaterials(power, units) {
  const kit = solarKits[String(power || '')];
  if (!kit) return [sunilusMaterial(power, units)];
  const torque = power.replace('SOLAR ', '');
  return [
    { code: kit.motor, quantity: units, description: `MOTOR SOMFY RS100 SOLAR IO ${torque}` },
    { code: kit.battery[0], quantity: units, description: kit.battery[1] },
    { code: kit.panel[0], quantity: units, description: kit.panel[1] },
    ...kit.supports.map(([code, description]) => ({ code, quantity: units, description }))
  ];
}

/** El motor de la lista que corresponde a un código de RPS (RS10015//12, SUNILUSIO10//17…), o ''. */
export function motorPowerFromCode(code, powers) {
  const value = String(code || '').trim().toUpperCase();
  const solar = Object.entries(solarKits).find(([, kit]) => kit.motor === value)?.[0];
  const sunilus = /^SUNILUSIO(\d{1,3})\/\/(\d{2})$/.exec(value);
  const power = solar || (sunilus ? `${sunilus[1]}/${sunilus[2]}` : '');
  return powers.includes(power) ? power : '';
}

/** Nombre del motor en la tarjeta. */
export function screenMotorLabel(power) {
  return isSolarMotor(power) ? `Solar RS100 IO ${power.replace('SOLAR ', '')}` : `Sunilus IO ${power}`;
}
