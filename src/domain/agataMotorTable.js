// Motor del Ágata Box (Modulbox-400 de Llaza) por el par mínimo de la tarifa Llaza 2026, «Tabla selección motor»
// (págs. 105 Full Box, 121 Semi Box y 153 Open): Nm según brazos, salida (filas) y línea (columnas), en cm.
// Full Box y Semi Box tienen la misma tabla; el Open solo cambia la de dos brazos, que admite líneas más cortas.
// Iván, 05/11/2026: siempre Sunea IO, salvo con interruptor, que lleva el motor mecánico Orea WT. El motor es el más
// pequeño de la familia que da el par mínimo.

const SALIDAS = [150, 200, 250, 300, 350, 400];
const TABLAS = {
  2: {
    lineas: [200, 250, 300, 350, 400, 450, 500, 550, 600],
    filas: [
      [25, 30, 30, 30, 30, 30, 30, 30, 30],
      [0, 30, 35, 35, 35, 35, 35, 35, 35],
      [0, 0, 40, 40, 40, 40, 40, 40, 40],
      [0, 0, 0, 50, 50, 50, 50, 50, 50],
      [0, 0, 0, 0, 50, 50, 50, 50, 50],
      [0, 0, 0, 0, 0, 50, 50, 50, 50]
    ]
  },
  3: {
    lineas: [300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900],
    filas: [
      [40, 40, 40, 40, 40, 40, 50, 50, 50, 50, 50, 50, 50],
      [0, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 55],
      [0, 0, 0, 55, 55, 55, 55, 70, 70, 70, 70, 70, 70],
      [0, 0, 0, 0, 0, 70, 70, 70, 70, 70, 70, 70, 70],
      [0, 0, 0, 0, 0, 0, 70, 70, 70, 70, 70, 85, 85],
      [0, 0, 0, 0, 0, 0, 0, 0, 85, 85, 85, 85, 85]
    ]
  },
  4: {
    lineas: [400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200],
    filas: [
      [50, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 70, 70, 70, 70, 70, 70],
      [0, 0, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70],
      [0, 0, 0, 0, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85],
      [0, 0, 0, 0, 0, 0, 85, 85, 85, 85, 85, 85, 85, 100, 100, 100, 100],
      [0, 0, 0, 0, 0, 0, 0, 0, 100, 100, 100, 100, 100, 100, 100, 100, 100],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 100, 100, 100, 100, 100, 100]
    ]
  }
};
// Open con dos brazos: las casillas sombreadas de la pág. 153 (líneas cortas).
const OPEN_DOS_BRAZOS = [
  [25, 30, 30, 30, 30, 30, 30, 30, 30],
  [30, 30, 35, 35, 35, 35, 35, 35, 35],
  [35, 35, 40, 40, 40, 40, 40, 40, 40],
  [0, 40, 40, 50, 50, 50, 50, 50, 50],
  [0, 50, 50, 50, 50, 50, 50, 50, 50],
  [0, 0, 50, 50, 50, 50, 50, 50, 50]
];

/** Par mínimo en Nm. Salida y línea se redondean a la medida siguiente de la tabla (del lado seguro). */
export function agataMinimumTorque({ submodel, armCount, projection, width }) {
  const arms = Math.max(2, Math.min(4, Number(armCount) || 2));
  const tabla = TABLAS[arms];
  const filas = submodel === 'OPEN' && arms === 2 ? OPEN_DOS_BRAZOS : tabla.filas;
  const s = SALIDAS.findIndex((v) => v >= Number(projection));
  const fila = filas[s < 0 ? SALIDAS.length - 1 : s];
  let c = tabla.lineas.findIndex((v) => v >= Number(width));
  if (c < 0) c = tabla.lineas.length - 1;
  // Una línea más corta que la primera con dato: el primer par que da la tabla para esa salida.
  while (c < fila.length - 1 && !fila[c]) c++;
  return fila[c] || 0;
}

/** Potencias que hay en RPS de cada familia (la de 50, 100 y 120 a 12 rpm). */
const SUNEA_IO = [35, 40, 55, 70, 85, 100, 120];
const OREA_WT = [10, 15, 25, 35, 40, 55, 70, 85, 120];

export function agataMotorForTorque(torque, control = 'RADIO') {
  const powers = control === 'INTERRUPTOR' ? OREA_WT : SUNEA_IO;
  return powers.find((p) => p >= torque) ?? powers.at(-1);
}
