import { normalizeModelName } from './domain/modelNames.js';

const TEMPORARILY_DISABLED_MODEL = 'HERA';

export function applyDeploymentFeaturesToCatalog(catalog, { heraEnabled }) {
  return {
    ...catalog,
    models: heraEnabled
      ? catalog.models
      : catalog.models.filter((model) => normalizeModelName(model.code) !== TEMPORARILY_DISABLED_MODEL),
    features: { heraEnabled }
  };
}

export function findDisabledModel(payload, { heraEnabled }) {
  if (heraEnabled) return null;

  const collections = [
    payload?.awnings,
    payload?.ofs,
    payload?.order?.awnings,
    payload?.order?.ofs,
    payload?.reservation?.ofs
  ];

  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;
    const item = collection.find((entry) => normalizeModelName(entry?.model) === TEMPORARILY_DISABLED_MODEL);
    if (item) return TEMPORARILY_DISABLED_MODEL;
  }

  return null;
}

export function assertDeploymentModelsEnabled(payload, features) {
  const disabledModel = findDisabledModel(payload, features);
  if (!disabledModel) return;

  const error = new Error(
    'HERA está disponible en desarrollo, pero permanece desactivado temporalmente en esta instalación de producción.'
  );
  error.statusCode = 409;
  throw error;
}

export function assertLegacyExportsEnabled({ legacyExportsEnabled }) {
  if (legacyExportsEnabled) return;

  const error = new Error(
    'La exportación directa antigua está desactivada en producción. Usa el flujo de revisión y aprobación.'
  );
  error.statusCode = 410;
  throw error;
}
