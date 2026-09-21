import { afterEach, describe, expect, test, vi } from 'vitest';

const originalNodeEnv = process.env.NODE_ENV;
const originalHeraFlag = process.env.ENABLE_HERA;
const originalLegacyExportsFlag = process.env.ENABLE_LEGACY_EXPORTS;
const originalSettingsFile = process.env.WORKFLOW_SETTINGS_FILE;
const originalRuleParametersFile = process.env.RULE_PARAMETERS_FILE;

afterEach(() => {
  restoreEnvironment('NODE_ENV', originalNodeEnv);
  restoreEnvironment('ENABLE_HERA', originalHeraFlag);
  restoreEnvironment('ENABLE_LEGACY_EXPORTS', originalLegacyExportsFlag);
  restoreEnvironment('WORKFLOW_SETTINGS_FILE', originalSettingsFile);
  restoreEnvironment('RULE_PARAMETERS_FILE', originalRuleParametersFile);
  vi.resetModules();
});

describe('configuración por entorno', () => {
  test('HERA está habilitado por defecto en desarrollo', async () => {
    const config = await loadConfig('development', '');
    expect(config.heraEnabled).toBe(true);
    expect(config.legacyExportsEnabled).toBe(true);
  });

  test('HERA está deshabilitado por defecto en producción', async () => {
    const config = await loadConfig('production', '');
    expect(config.heraEnabled).toBe(false);
    expect(config.legacyExportsEnabled).toBe(false);
  });

  test('la habilitación explícita queda disponible para pruebas controladas', async () => {
    const config = await loadConfig('production', 'true', 'true');
    expect(config.heraEnabled).toBe(true);
    expect(config.legacyExportsEnabled).toBe(true);
  });

  test('los parámetros comunes se guardan junto a la configuración del flujo', async () => {
    process.env.WORKFLOW_SETTINGS_FILE = '/var/lib/toldos-testar/workflow-settings.json';
    delete process.env.RULE_PARAMETERS_FILE;
    const config = await loadConfig('production', '');
    // path.join usa la barra de Windows al ejecutar los tests en el puesto.
    expect(config.ruleParametersFile.replace(/\\/g, '/')).toBe('/var/lib/toldos-testar/rule-parameters.json');
  });

  test('RULE_PARAMETERS_FILE manda si se indica', async () => {
    process.env.RULE_PARAMETERS_FILE = '/otra/ruta/parametros.json';
    const config = await loadConfig('production', '');
    expect(config.ruleParametersFile).toBe('/otra/ruta/parametros.json');
  });
});

async function loadConfig(nodeEnv, heraFlag, legacyExportsFlag = '') {
  process.env.NODE_ENV = nodeEnv;
  process.env.ENABLE_HERA = heraFlag;
  process.env.ENABLE_LEGACY_EXPORTS = legacyExportsFlag;
  vi.resetModules();
  return (await import('./config.js')).config;
}

function restoreEnvironment(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
