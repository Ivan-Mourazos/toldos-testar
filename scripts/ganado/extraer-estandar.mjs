// Extrae el estándar de Remolcar, sin modificar las fuentes. Copias locales en tmp/dxf-estudio/ganado:
// originales/AR2601847-bot.dxf (maqcorte), plantillas/dxf/t163.dxf (plantilla convertida con ODA).
// La zona de confección es la versión AR2601847 de t163, no las versiones económicas del mismo archivo.
// Uso: node scripts/ganado/extraer-estandar.mjs [--comprobar]
import { extraerGanado } from './extraer-economico.mjs';

extraerGanado({
  modelo: 'ESTANDAR',
  bot: 'originales/AR2601847-bot.dxf',
  plantilla: 'plantillas/dxf/t163.dxf',
  salida: 'src/remolques/ganado/estandarDatos.ts',
  zona: { x0: 1298, x1: 1304.2, y0: 588.5, y1: 592.3 },
});
