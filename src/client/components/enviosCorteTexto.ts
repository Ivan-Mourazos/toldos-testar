// Dónde ha ido el corte, dicho como se ve desde Windows (Iván, 22/10/2026: «no sé dónde manda el DXF»: la web lo
// estaba dejando en DXF PRUEBAS WEB y el aviso no lo decía). El servidor guarda la ruta de sus montajes
// (/mnt/planteamientos/…), que en la oficina no dice nada: se traduce cada montaje a su carpeta compartida.
const MONTAJES: Array<[string, string]> = [
  ['/mnt/planteamientos/bot-pendientes', 'maqcorte\\BOT\\Pendientes'],
  ['/mnt/bot-pendientes', 'maqcorte\\BOT\\Pendientes'],
  ['/mnt/planteamientos/oftecnica', 'Oficina Tecnica'],
  ['/mnt/oftecnica', 'Oficina Tecnica'],
];

export function carpetaLegible(carpeta: string): string {
  const limpia = carpeta.replace(/\/+$/, '');
  for (const [montaje, compartida] of MONTAJES) {
    if (limpia === montaje || limpia.startsWith(`${montaje}/`)) return [compartida, ...limpia.slice(montaje.length).split('/').filter(Boolean)].join('\\');
  }
  return carpeta;
}

export function mensajeEnvio(destino: 'bot' | 'dxfs', carpeta: string, archivos: string[], anio = new Date().getFullYear()): string {
  const donde = carpetaLegible(carpeta);
  const lista = archivos.join(', ');
  if (destino === 'dxfs') return `DXF guardado en ${donde}: ${lista}.`;
  // Solo si va de verdad a Pendientes se dice que el bot lo recoge; si no, que no va al bot.
  return /BOT\\Pendientes/.test(donde)
    ? `Corte mandado al bot: ${lista} en ${donde}. El bot lo recoge en unos minutos y lo deja en maqcorte\\${anio}\\ARCHIVOS DXF - MAQUINA NUEVA.`
    : `Corte guardado en ${donde}: ${lista}. Esa carpeta no es la del bot (BOT\\Pendientes): revisa «Corte de lona · DXF del bot» en Configuración.`;
}
