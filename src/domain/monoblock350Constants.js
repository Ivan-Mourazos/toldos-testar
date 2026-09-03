export const monoblock350EstablishedProjections = [150, 175, 200, 225, 250, 275, 300, 325, 350];

const minimumWidths = {
  2: [212, 237, 262, 287, 312, 337, 362, 387, 412],
  3: [307, 345, 382, 429, 457, 495, 532, 570, 607],
  4: [404, 454, 504, 554, 604, 654, 704, 754, 804]
};

const maximumWidths = {
  2: [600, 600, 600, 600, 600, 600, 600, 550, 550],
  3: [900, 900, 900, 900, 900, 900, 900, 775, 775],
  4: [1200, 1200, 1200, 1200, 1200, 1200, 1200, 1100, 1100]
};

const motorTorqueTube80 = {
  2: [40, 40, 40, 50, 50, 50, 50, 50, 50],
  3: [55, 55, 70, 70, 70, 70, 70, 85, 85],
  4: [85, 85, 85, 100, 100, 100, 100, 100, 100]
};

const commercialMotorByTorque = {
  40: '40/17',
  50: '50/12',
  55: '55/17',
  70: '70/17',
  85: '85/17',
  100: '100/12'
};

export const monoblock350ManualRules = monoblock350EstablishedProjections.map((projection, index) => ({
  projection,
  values: Object.fromEntries([2, 3, 4].map((arms) => {
    const motorTorqueNm = motorTorqueTube80[arms][index];
    return [arms, {
      minimum: minimumWidths[arms][index],
      maximum: maximumWidths[arms][index],
      motorTorqueNm,
      motorPower: commercialMotorByTorque[motorTorqueNm]
    }];
  }))
}));

export const monoblock350ManualSpec = {
  product: 'Llaza MONOBLOC ART-350',
  reference: '45098021000',
  revision: '2 · 10/07/2017',
  inclinationDegrees: { wall: [0, 90], ceiling: [0, 90] },
  maximumWidthsByProjectionCm: [
    { projectionCm: 300, values: { 2: 600, 3: 900, 4: 1200 } },
    { projectionCm: 350, values: { 2: 550, 3: 775, 4: 1100 } }
  ],
  minimumWidthsByProjectionCm: monoblock350EstablishedProjections.map((projectionCm, index) => ({
    projectionCm,
    values: { 2: minimumWidths[2][index], 3: minimumWidths[3][index], 4: minimumWidths[4][index] },
    crossedArmsWidthCm: [122, 135, 147, 160, 172, 185, 197, 210, 221][index]
  })),
  motorTorqueNm: {
    tube70: {
      2: [35, 35, 35, 40, 40, 40, 40, 50, 50]
    },
    tube80: motorTorqueTube80
  },
  cuttingDiscountsCm: {
    internalGearbox: { roll: 13.2, fabric: 14.2, loadBar: 12.2, squareBar: 1 },
    somfy50Tube70: { roll: 12, fabric: 13, loadBar: 11.5, squareBar: 1 },
    somfy50Tube80: { roll: 12.4, fabric: 13.4, loadBar: 11.9, squareBar: 1 },
    somfy60Tube80: { roll: 12, fabric: 13, loadBar: 11.5, squareBar: 1 }
  },
  rollerSupports: [
    { minWidthCm: 550, maxWidthCm: 800, count: 1 },
    { minWidthCm: 801, maxWidthCm: 1100, count: 2 },
    { minWidthCm: 1101, maxWidthCm: 1400, count: 3 },
    { minWidthCm: 1401, maxWidthCm: 1600, count: 4 }
  ],
  squareBarSupportTables: {
    projectionsCm: monoblock350EstablishedProjections,
    2: [
      { widthCm: 225, counts: [2, null, null, null, null, null, null, null, null] },
      { widthCm: 250, counts: [2, 2, null, null, null, null, null, null, null] },
      { widthCm: 275, counts: [2, 2, 2, null, null, null, null, null, null] },
      { widthCm: 300, counts: [2, 2, 2, 2, null, null, null, null, null] },
      { widthCm: 325, counts: [2, 2, 2, 2, 2, null, null, null, null] },
      { widthCm: 350, counts: [2, 2, 2, 2, 3, 3, null, null, null] },
      { widthCm: 375, counts: [2, 2, 2, 2, 3, 3, 3, null, null] },
      { widthCm: 400, counts: [2, 2, 2, 3, 3, 3, 4, 4, null] },
      { widthCm: 425, counts: [2, 2, 3, 3, 3, 3, 4, 4, 4] },
      { widthCm: 450, counts: [2, 3, 3, 3, 3, 3, 4, 4, 5] },
      { widthCm: 475, counts: [3, 3, 3, 3, 3, 4, 4, 5, 5] },
      { widthCm: 500, counts: [3, 3, 3, 3, 3, 4, 4, 5, 5] },
      { widthCm: 525, counts: [3, 3, 3, 3, 3, 4, 4, 5, 5] },
      { widthCm: 550, counts: [3, 3, 3, 3, 3, 4, 4, 5, 5] },
      { widthCm: 575, counts: [3, 3, 3, 3, 3, 4, 4, 5, 5] },
      { widthCm: 600, counts: [3, 3, 3, 3, 4, 4, 5, 5, 5] }
    ],
    3: [
      { widthCm: 650, counts: [3, 3, 3, 4, 4, 4, 4, 6, 6] },
      { widthCm: 700, counts: [3, 3, 4, 4, 4, 4, 5, 6, 6] },
      { widthCm: 750, counts: [3, 4, 4, 4, 4, 5, 5, 6, 7] },
      { widthCm: 800, counts: [4, 4, 4, 4, 4, 5, 5, 6, 7] }
    ],
    4: [
      { widthCm: 850, counts: [4, 4, 4, 4, 4, 5, 6, 7, 7] },
      { widthCm: 900, counts: [4, 4, 4, 4, 5, 5, 6, 7, 7] },
      { widthCm: 950, counts: [4, 4, 4, 5, 5, 5, 6, 7, 8] },
      { widthCm: 1000, counts: [4, 4, 5, 5, 5, 6, 7, 8, 9] }
    ]
  },
  windClass: {
    widthsCm: [150, 200, 250, 300, 350, 400, 450, 500, 550, 600],
    rows: [
      { projectionCm: 150, values: ['2C', 2, 2, 2, 2, 2, 2, 2, 2, 2] },
      { projectionCm: 200, values: ['2C', '2C', 2, 2, 2, 2, 2, 2, 2, 2] },
      { projectionCm: 250, values: [null, '2C', '2C', 2, 2, 2, 2, 2, 2, 2] },
      { projectionCm: 300, values: [null, '2C', '2C', '2C', '2C', 2, 1, 1, 1, 1] },
      { projectionCm: 350, values: [null, null, '2C', '2C', '1C', '1C', 1, 0, 0, 0] }
    ],
    class1: { maxSpeedKmh: 28, pressureNm2: 40, beaufort: 4 },
    class2: { maxSpeedKmh: 38, pressureNm2: 70, beaufort: 5 }
  }
};
