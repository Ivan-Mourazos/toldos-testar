export const legacyArzuaMinimumLineByArm = [
  { arm: 150, values: { 'MAQ. EXTERIOR': 200, 'MAQ. INTERIOR': 195, MOTOR: 195 } },
  { arm: 175, values: { 'MAQ. EXTERIOR': 225, 'MAQ. INTERIOR': 220, MOTOR: 220 } },
  { arm: 200, values: { 'MAQ. EXTERIOR': 250, 'MAQ. INTERIOR': 245, MOTOR: 245 } },
  { arm: 225, values: { 'MAQ. EXTERIOR': 275, 'MAQ. INTERIOR': 270, MOTOR: 270 } },
  { arm: 250, values: { 'MAQ. EXTERIOR': 300, 'MAQ. INTERIOR': 295, MOTOR: 295 } },
  { arm: 275, values: { 'MAQ. EXTERIOR': 325, 'MAQ. INTERIOR': 320, MOTOR: 320 } },
  { arm: 300, values: { 'MAQ. EXTERIOR': 345, 'MAQ. INTERIOR': 350, MOTOR: 350 } },
  { arm: 325, values: { 'MAQ. EXTERIOR': 375, 'MAQ. INTERIOR': 375, MOTOR: 375 } },
  { arm: 350, values: { 'MAQ. EXTERIOR': 395, 'MAQ. INTERIOR': 400, MOTOR: 400 } }
];

// Manual Llaza COMPLET-PRO 350, fabricación rev. 2.1, página 6.
// La tabla PRO.MIN del Excel maestro tenía mal copiadas las tres últimas filas.
export const minimumLineByArm = [
  { arm: 150, values: { 'MAQ. EXTERIOR': 200, 'MAQ. INTERIOR': 195, MOTOR: 195 } },
  { arm: 175, values: { 'MAQ. EXTERIOR': 225, 'MAQ. INTERIOR': 220, MOTOR: 220 } },
  { arm: 200, values: { 'MAQ. EXTERIOR': 250, 'MAQ. INTERIOR': 245, MOTOR: 245 } },
  { arm: 225, values: { 'MAQ. EXTERIOR': 275, 'MAQ. INTERIOR': 270, MOTOR: 270 } },
  { arm: 250, values: { 'MAQ. EXTERIOR': 300, 'MAQ. INTERIOR': 295, MOTOR: 295 } },
  { arm: 275, values: { 'MAQ. EXTERIOR': 325, 'MAQ. INTERIOR': 320, MOTOR: 320 } },
  { arm: 300, values: { 'MAQ. EXTERIOR': 350, 'MAQ. INTERIOR': 345, MOTOR: 345 } },
  { arm: 325, values: { 'MAQ. EXTERIOR': 375, 'MAQ. INTERIOR': 370, MOTOR: 370 } },
  { arm: 350, values: { 'MAQ. EXTERIOR': 400, 'MAQ. INTERIOR': 395, MOTOR: 395 } }
];

export const arzuaProManualSpec = {
  product: 'Llaza COMPLET-PRO 350',
  revision: '2.1 · 31/01/2019',
  fabricationReference: '45098059001',
  installationReference: '45098059000',
  maximumWidthCm: 600,
  maximumProjectionCm: 350,
  inclinationDegrees: { min: 0, max: 85 },
  rollingTubeDiameterMm: 80,
  cuttingDiscountsCm: {
    rollTubeDiscounts: { MOTOR: 9.8, 'MAQ. INTERIOR': 11.2, 'MAQ. EXTERIOR': 11.4 },
    fabricWidthDiscounts: { MOTOR: 10.8, 'MAQ. INTERIOR': 12.2, 'MAQ. EXTERIOR': 12.4 },
    widthDiscounts: { MOTOR: 9.8, 'MAQ. INTERIOR': 10.2, 'MAQ. EXTERIOR': 10.4 }
  },
  motorTube80: {
    widthsCm: [200, 250, 300, 350, 400, 450, 500, 550, 600],
    rows: [
      { projectionCm: 150, torqueNm: [30, 30, 30, 30, 30, 30, 30, 30, 30] },
      { projectionCm: 200, torqueNm: [null, 30, 35, 35, 35, 35, 35, 35, 35] },
      { projectionCm: 250, torqueNm: [null, null, 40, 40, 40, 40, 40, 40, 40] },
      { projectionCm: 300, torqueNm: [null, null, null, 50, 50, 50, 50, 50, 50] },
      { projectionCm: 350, torqueNm: [null, null, null, null, 50, 50, 50, 50, 50] }
    ]
  }
};

export const arzuaProEstablishedProjections = minimumLineByArm.map((item) => item.arm);
