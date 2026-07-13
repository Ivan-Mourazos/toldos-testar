export const galiciaMinimumLineByProjection = [
  { projection: 150, values: { 2: { 'MAQ. EXTERIOR': 195, 'MAQ. INTERIOR': 200, MOTOR: 200 }, 3: { 'MAQ. EXTERIOR': 292.5, 'MAQ. INTERIOR': 300, MOTOR: 300 } } },
  { projection: 175, values: { 2: { 'MAQ. EXTERIOR': 220, 'MAQ. INTERIOR': 225, MOTOR: 225 }, 3: { 'MAQ. EXTERIOR': 330, 'MAQ. INTERIOR': 337.5, MOTOR: 337.5 } } },
  { projection: 200, values: { 2: { 'MAQ. EXTERIOR': 245, 'MAQ. INTERIOR': 250, MOTOR: 250 }, 3: { 'MAQ. EXTERIOR': 367.5, 'MAQ. INTERIOR': 375, MOTOR: 375 } } },
  { projection: 225, values: { 2: { 'MAQ. EXTERIOR': 270, 'MAQ. INTERIOR': 275, MOTOR: 275 }, 3: { 'MAQ. EXTERIOR': 405, 'MAQ. INTERIOR': 412.5, MOTOR: 412.5 } } },
  { projection: 250, values: { 2: { 'MAQ. EXTERIOR': 295, 'MAQ. INTERIOR': 300, MOTOR: 300 }, 3: { 'MAQ. EXTERIOR': 442.5, 'MAQ. INTERIOR': 450, MOTOR: 450 } } },
  { projection: 275, values: { 2: { 'MAQ. EXTERIOR': 320, 'MAQ. INTERIOR': 325, MOTOR: 325 }, 3: { 'MAQ. EXTERIOR': 480, 'MAQ. INTERIOR': 487.5, MOTOR: 487.5 } } },
  { projection: 300, values: { 2: { 'MAQ. EXTERIOR': 345, 'MAQ. INTERIOR': 350, MOTOR: 350 }, 3: { 'MAQ. EXTERIOR': 517.5, 'MAQ. INTERIOR': 525, MOTOR: 525 } } },
  { projection: 325, values: { 2: { 'MAQ. EXTERIOR': 375, 'MAQ. INTERIOR': 375, MOTOR: 375 }, 3: { 'MAQ. EXTERIOR': 562.5, 'MAQ. INTERIOR': 562.5, MOTOR: 562.5 } } },
  // AR2603298 sustituyó manualmente la salida 325 por 350 conservando estos mínimos.
  { projection: 350, values: { 2: { 'MAQ. EXTERIOR': 375, 'MAQ. INTERIOR': 375, MOTOR: 375 }, 3: { 'MAQ. EXTERIOR': 562.5, 'MAQ. INTERIOR': 562.5, MOTOR: 562.5 } } }
];

export const galiciaEstablishedProjections = galiciaMinimumLineByProjection.map((item) => item.projection);
