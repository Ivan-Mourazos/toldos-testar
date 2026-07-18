export const perlaBoxMinimumLineByProjection = [
  150, 175, 200, 225, 250, 275, 300
].map((projection) => ({
  projection,
  values: { MAQUINA: projection + 40, MOTOR: projection + 40 }
}));

export const coralBoxMinimumLineByProjection = [
  175, 200, 225, 250, 275, 300, 325, 350, 375, 400
].map((projection) => ({
  projection,
  values: { MAQUINA: projection + 40, MOTOR: projection + 46 }
}));

export const boxMotorPowerByProjection = [
  { projection: 150, power: 30 },
  { projection: 175, power: 30 },
  { projection: 200, power: 35 },
  { projection: 225, power: 35 },
  { projection: 250, power: 40 },
  { projection: 275, power: 40 },
  { projection: 300, power: 50 },
  { projection: 325, power: 50 },
  { projection: 350, power: 50 },
  { projection: 375, power: 50 },
  { projection: 400, power: 50 }
];

export const perlaBoxEstablishedProjections = perlaBoxMinimumLineByProjection
  .map((item) => item.projection);

export const coralBoxEstablishedProjections = coralBoxMinimumLineByProjection
  .map((item) => item.projection);
