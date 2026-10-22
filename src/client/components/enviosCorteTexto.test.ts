import { describe, expect, it } from 'vitest';
import { carpetaLegible, mensajeEnvio } from './enviosCorteTexto';

// Iván, 22/10/2026: «el botón de mandar archivo de corte al bot no funciona, no sé dónde manda el DXF». La web lo
// dejaba en DXF PRUEBAS WEB (la configuración del servidor seguía en pruebas) y el aviso no decía la carpeta.
describe('dónde ha ido el corte, dicho como en Windows', () => {
  it('cada montaje del servidor, con su carpeta compartida', () => {
    expect(carpetaLegible('/mnt/planteamientos/bot-pendientes/Ivan.Sanchez')).toBe('maqcorte\\BOT\\Pendientes\\Ivan.Sanchez');
    expect(carpetaLegible('/mnt/planteamientos/oftecnica/2026/DXFs')).toBe('Oficina Tecnica\\2026\\DXFs');
    expect(carpetaLegible('/mnt/oftecnica/DXF PRUEBAS WEB')).toBe('Oficina Tecnica\\DXF PRUEBAS WEB');
  });
  it('una ruta que no es de un montaje conocido se enseña tal cual', () => {
    expect(carpetaLegible('C:\\pruebas\\DXFs')).toBe('C:\\pruebas\\DXFs');
    expect(carpetaLegible('/home/web/tmp/corte-bot/Ivan.Sanchez')).toBe('/home/web/tmp/corte-bot/Ivan.Sanchez');
  });
  it('al bot: el fichero, la carpeta y adónde lo lleva el bot', () => {
    expect(mensajeEnvio('bot', '/mnt/planteamientos/bot-pendientes/Ivan.Sanchez', ['AR2605192.dxf'], 2026)).toBe(
      'Corte mandado al bot: AR2605192.dxf en maqcorte\\BOT\\Pendientes\\Ivan.Sanchez. El bot lo recoge en unos minutos y lo deja en maqcorte\\2026\\ARCHIVOS DXF - MAQUINA NUEVA.');
  });
  it('si «al bot» no va a Pendientes, lo dice y manda a Configuración', () => {
    expect(mensajeEnvio('bot', '/mnt/oftecnica/DXF PRUEBAS WEB', ['AR2605192.dxf'], 2026)).toBe(
      'Corte guardado en Oficina Tecnica\\DXF PRUEBAS WEB: AR2605192.dxf. Esa carpeta no es la del bot (BOT\\Pendientes): revisa «Corte de lona · DXF del bot» en Configuración.');
  });
  it('en DXFs: la carpeta y el fichero', () => {
    expect(mensajeEnvio('dxfs', '/mnt/planteamientos/oftecnica/2026/DXFs', ['AR2605192.dxf'], 2026)).toBe('DXF guardado en Oficina Tecnica\\2026\\DXFs: AR2605192.dxf.');
  });
});
