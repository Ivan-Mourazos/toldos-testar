const situo5Sensors = new Set(['VIENTO -SOL', 'VIENTO-SOL', 'SOL']);

export function resolveMotorRemote(sensor) {
  const clean = String(sensor || 'SIN SENSOR').trim().toUpperCase();
  if (situo5Sensors.has(clean)) {
    return {
      code: 'SITUOVARIOPURE',
      description: 'MANDO SITUO 5 VARIATIO IO'
    };
  }
  return {
    code: 'SITUOIO1PURE',
    description: 'MANDO SITUO 1 IO PURE'
  };
}
