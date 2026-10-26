import { describe, expect, it } from 'vitest';
import { carpetasACopiar, copiasQueSobran } from './copia-seguridad.mjs';

const cfg = {
  workflowSettingsFile: '/var/lib/toldos-testar/workflow-settings.json',
  ruleParametersFile: '/var/lib/toldos-testar/rule-parameters.json',
  remolquesParametersFile: '/var/lib/toldos-testar/remolques-parameters.json',
  remolquesClientesFile: '/var/lib/toldos-testar/remolques-clientes.json',
  remolquesRevisionDirectory: '/var/lib/toldos-testar/remolques',
  draftsDirectory: ''
};

describe('carpetasACopiar', () => {
  it('copia la carpeta de la Configuración una vez, con lo que va dentro', () => {
    expect(carpetasACopiar(cfg)).toEqual(['/var/lib/toldos-testar']);
  });
  it('la Configuración guardada manda sobre el .env y lo de fuera se añade', () => {
    expect(carpetasACopiar(cfg, { draftsDirectory: '/srv/borradores' })).toEqual(['/srv/borradores', '/var/lib/toldos-testar']);
  });
  it('lo que está en la red (/mnt) no se copia', () => {
    expect(carpetasACopiar(cfg, { remolquesRevisionDirectory: '/mnt/planteamientos/oftecnica/remolques' })).toEqual(['/var/lib/toldos-testar']);
  });
});

describe('copiasQueSobran', () => {
  it('borra solo las copias de más de 30 días y nada que no sea una copia', () => {
    const nombres = ['planteamientos-2026-09-25.tar.gz', 'planteamientos-2026-09-26.tar.gz', 'planteamientos-2026-10-26.tar.gz', 'planteamientos-2026-09-01.tar.gz.parcial', 'otra-cosa.txt'];
    expect(copiasQueSobran(nombres, new Date('2026-10-26T01:00:00Z'))).toEqual(['planteamientos-2026-09-25.tar.gz']);
  });
});
