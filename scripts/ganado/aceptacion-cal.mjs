/** Q-GAN07, Iván 04/11/2026: aprobación de este contraste, sin mover la geometría. */
export function aceptarGemeloCal(piezas) {
  const max = c => Math.max(c.ida.max, c.vuelta.max);
  const aceptado = piezas.some(p => p.nombre === 'Morro') && piezas.every(p => p.cuadra || (p.nombre === 'Morro'
    && Object.values(p.contraste).every(c => c.ida.total === c.vuelta.total)
    && max(p.contraste.tramos) <= 1.5 && max(p.contraste.arcos) <= 1
    && max(p.contraste.marcas) <= 1 && max(p.contraste.ollaos) <= 1.045));
  return { aceptado, toleranciasMm: { contorno: 1.5, ollaos: 1 },
    excepcionHistorica: 'Iván da por bueno el gemelo cuyo error observado de ollaos es 1,045 mm. Se conserva el valor sin redondear; esta aceptación concreta no amplía la tolerancia nominal de 1 mm.',
    fuente: 'Q-GAN07 · Iván · 04/11/2026' };
}
