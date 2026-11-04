import { DIBUJO_ESTANDAR, PIEZAS_ESTANDAR, CORTE_ESTANDAR } from './estandarDatos.ts';

/** Plano de Iván del 03/11/2026. Las dos zonas diagonales ya forman parte del morro de la plantilla.
 * No se confunden con los rectángulos sueltos del bot: no tienen ni la misma forma ni las mismas medidas. */
export const PIEZAS_ESTANDAR_CONFECCION = PIEZAS_ESTANDAR.map(p => p.nombre === 'Cuerpo'
  ? { ...p, acabado: `${p.acabado}; correas por dentro después de enfundar; ollaos a 20 / 59 / 98 / 137 / 176 desde atrás` }
  : p.nombre === 'Frente'
    ? { ...p, hecho: '47 de ancho × 71 de alto; ventana de 30 × 50', corte: '51,5 × 73' }
    : p.nombre.endsWith('(98 × 32)') ? { ...p, nombre: 'Hueco de puerta' }
      : p.nombre.endsWith('(34,5 × 56)') ? { ...p, nombre: 'Tapa de ventana' } : p);

export const DIBUJO_ESTANDAR_CONFECCION = {
  ...DIBUJO_ESTANDAR,
  textos: [...DIBUJO_ESTANDAR.textos.map(t => t.valor === 'Pieza del corte sin dibujo'
    ? { ...t, valor: t.x === 135 ? 'Hueco de puerta' : 'Tapa de ventana' }
    : t.valor.startsWith('de confección (') ? { ...t, valor: t.x === 135 ? 'Corte 98 × 32' : 'Corte 34,5 × 56' } : t),
    { valor: 'CORREAS POR DENTRO', x: 170, y: 350, h: 5, giro: 0 },
    { valor: 'DESPUÉS DE ENFUNDAR', x: 170, y: 340, h: 5, giro: 0 },
    { valor: 'CORREAS POR DENTRO', x: 170, y: 200, h: 5, giro: 0 },
    { valor: 'DESPUÉS DE ENFUNDAR', x: 170, y: 190, h: 5, giro: 0 },
  ],
};

/** Ubicación y medidas leídas del bot ya extraído, sin atribuir acabados de otra pieza. */
export const RECTANGULOS_ESTANDAR_PENDIENTES = [
  { nombre: 'Hueco de puerta', x0: 2925, x1: 3905, y0: 0, y1: 320 },
  { nombre: 'Tapa de ventana', x0: 2825, x1: 3170, y0: 1420, y1: 1980 },
].map(p => ({ ...p, ollaos: CORTE_ESTANDAR.ollaos.filter(([x, y]) => x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1).length }));
