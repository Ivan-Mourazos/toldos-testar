import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeRuleParameters } from '../domain/ruleParameters.js';
import { COMMON_FABRIC_SCOPE } from '../domain/parameterScopes.js';
import {
  ambitosPendientes, cargarVersionModelo, descartarAmbitos, editarParametros, guardarAmbito, guardarAmbitos,
  leerParametros, ponerGuardados, reiniciarParametros, restaurarAmbitos
} from './parametrosToldos';
import type { RuleParameters } from './types';

const base = () => normalizeRuleParameters() as RuleParameters;
const respuesta = (datos: unknown, status = 200) => ({ ok: status < 400, status, json: async () => datos });
const conCortina = (p: RuleParameters, cm: number) => ({ ...p, cortina: { ...p.cortina, fabricDropAllowanceCm: cm } });
const conGalicia = (p: RuleParameters, cm: number) => ({ ...p, galicia: { ...p.galicia, fabricDropAllowanceCm: cm } });

beforeEach(() => {
  reiniciarParametros();
  ponerGuardados({ version: 4, parameters: base(), modelos: { CORTINA: { version: 2, updatedAt: '', updatedBy: 'IVÁN', motivo: '' } } });
});
afterEach(() => vi.unstubAllGlobals());

describe('parámetros de toldos en la web, por modelo', () => {
  it('cada cambio queda pendiente en su modelo; volver a lo guardado lo quita', () => {
    editarParametros((p) => conCortina(p, 50));
    editarParametros((p) => conGalicia(p, 60));
    expect(ambitosPendientes()).toEqual(['GALICIA', 'CORTINA']);
    editarParametros((p) => conCortina(p, 45));
    expect(ambitosPendientes()).toEqual(['GALICIA']);
  });

  it('guardar un modelo manda su versión y deja pendiente lo de los demás', async () => {
    editarParametros((p) => conGalicia(conCortina(p, 50), 60));
    const enviado = leerParametros().draft;
    const fetchMock = vi.fn().mockResolvedValue(respuesta({ version: 5, parameters: conCortina(base(), 50), modelos: { CORTINA: { version: 3, updatedAt: 'x', updatedBy: 'IVÁN', motivo: '' } } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await guardarAmbito('CORTINA', 'IVÁN', '')).toEqual({ status: 'saved' });
    const [ruta, init] = fetchMock.mock.calls[0];
    expect(ruta).toBe('/api/rule-parameters/models/CORTINA');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ baseVersion: 2, parameters: JSON.parse(JSON.stringify(enviado)), updatedBy: 'IVÁN', motivo: '' });
    expect(leerParametros().shared.modelos.CORTINA.version).toBe(3);
    expect(ambitosPendientes()).toEqual(['GALICIA']);
    expect(leerParametros().draft?.galicia.fabricDropAllowanceCm).toBe(60);
    expect(leerParametros().saving).toBe(false);
  });

  it('si otro puesto guardó ese modelo: se cargan sus valores y el borrador se queda', async () => {
    editarParametros((p) => conCortina(p, 50));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({
      error: 'Otro puesto guardó este modelo antes.', current: { version: 5, parameters: conCortina(base(), 55), modelos: { CORTINA: { version: 3 } } }
    }, 409)));
    expect(await guardarAmbito('CORTINA', 'IVÁN', '')).toEqual({ status: 'conflict', message: 'Otro puesto guardó este modelo antes.' });
    expect(leerParametros().shared.parameters.cortina.fabricDropAllowanceCm).toBe(55);
    expect(leerParametros().shared.modelos.CORTINA.version).toBe(3);
    expect(leerParametros().draft?.cortina.fabricDropAllowanceCm).toBe(50);
  });

  it('sin conexión: error y el borrador intacto', async () => {
    editarParametros((p) => conCortina(p, 50));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await guardarAmbito('CORTINA', 'IVÁN', '')).toEqual({ status: 'error', message: 'No se pudo contactar con el servidor.' });
    expect(ambitosPendientes()).toEqual(['CORTINA']);
  });

  it('guardar varios: uno tras otro, cada uno con su versión', async () => {
    editarParametros((p) => conGalicia(conCortina(p, 50), 60));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(respuesta({ version: 5, parameters: conGalicia(base(), 60), modelos: { CORTINA: { version: 2 }, GALICIA: { version: 1 } } }))
      .mockResolvedValueOnce(respuesta({ version: 6, parameters: conGalicia(conCortina(base(), 50), 60), modelos: { CORTINA: { version: 3 }, GALICIA: { version: 1 } } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await guardarAmbitos(['GALICIA', 'CORTINA'], 'IVÁN', 'Prueba')).toEqual({ status: 'saved' });
    expect(fetchMock.mock.calls.map(([ruta]) => ruta)).toEqual(['/api/rule-parameters/models/GALICIA', '/api/rule-parameters/models/CORTINA']);
    expect(leerParametros().draft).toBeNull();
  });

  it('restaurar, descartar y cargar una versión tocan solo los modelos indicados', () => {
    editarParametros((p) => ({
      ...p,
      fabricJobs: { ...p.fabricJobs, valanceExtraCm: 8, dropAllowanceByModel: { ...p.fabricJobs.dropAllowanceByModel, ENROLLABLE: 30, BAMBALINA: 3 } },
      drawings: { byModel: { ENROLLABLE: [{ id: 'g', name: 'G', usage: 'manual', enabled: true, image: null, conditions: [] }] } }
    }));
    restaurarAmbitos(['ENROLLABLE', COMMON_FABRIC_SCOPE]);
    const draft = leerParametros().draft!;
    expect(draft.fabricJobs.valanceExtraCm).toBe(5);
    expect(draft.fabricJobs.dropAllowanceByModel.ENROLLABLE).toBe(25);
    expect(draft.fabricJobs.dropAllowanceByModel.BAMBALINA).toBe(3);
    expect(draft.drawings.byModel.ENROLLABLE).toHaveLength(1);
    descartarAmbitos(['ENROLLABLE', 'BAMBALINA']);
    expect(leerParametros().draft).toBeNull();
    cargarVersionModelo('GALICIA', { galicia: { fabricDropAllowanceCm: 70 }, cortina: { fabricDropAllowanceCm: 99 } });
    expect(ambitosPendientes()).toEqual(['GALICIA']);
  });
});
