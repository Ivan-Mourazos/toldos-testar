export const minimumLineByArm = [
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

export const arzuaProEstablishedProjections = minimumLineByArm.map((item) => item.arm);
