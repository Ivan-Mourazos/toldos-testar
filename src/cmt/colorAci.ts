/**
 * Colores de índice (ACI) de ZWCAD/AutoCAD en CSS, los mismos que se ven en el plano.
 * El 7 no tiene color propio: es la tinta, negra con fondo claro y blanca con fondo oscuro;
 * por eso devuelve undefined, igual que «sin color».
 * Sin dependencias de Node: lo usan el servidor y el navegador.
 */
const BASICOS = ['', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '', '#808080', '#c0c0c0'];
const GRISES = ['#333333', '#505050', '#696969', '#828282', '#bebebe', '#ffffff'];
const BRILLOS = [255, 165, 127, 76, 38];

const hex = (...rgb: number[]) => '#' + rgb.map(v => Math.floor(v).toString(16).padStart(2, '0')).join('');

export function colorAci(aci: number): string | undefined {
  const n = Math.abs(Math.trunc(aci));
  if (!Number.isFinite(n) || n > 255) return undefined;
  if (n < 10) return BASICOS[n] || undefined;
  if (n >= 250) return GRISES[n - 250];
  // Del 10 al 249: 24 tonos de 15° y, en cada tono, cinco brillos en color pleno (par) o pálido (impar).
  const tono = Math.floor((n - 10) / 10) * 15, paso = n % 10;
  const v = BRILLOS[paso >> 1], s = paso % 2 ? 0.5 : 1;
  const sector = Math.floor(tono / 60), f = tono / 60 - sector;
  const p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
  return hex(...[[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][sector]);
}

/** Color verdadero (código 420 del DXF): 0xRRGGBB. */
export const colorVerdadero = (n: number) => Number.isFinite(n) ? hex((n >> 16) & 255, (n >> 8) & 255, n & 255) : undefined;

/** Fondo de la vista previa (--surface-2 de coordina/tokens.css) en cada modo. */
const FONDOS = { claro: '#eef2f8', oscuro: '#2a2c31' } as const;
const canales = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const luminancia = (rgb: number[]) => {
  const [r, g, b] = rgb.map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: number[], b: number[]) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/**
 * El color del plano, retocado solo si no se lee en ese fondo: lo mezcla con negro (claro) o con blanco (oscuro)
 * lo justo para llegar a contraste 3 (rayas y letra grande). Así el verde oscuro de la capa texto se ve
 * en modo oscuro y el amarillo o el blanco del CAD en modo claro, sin cambiar de tono.
 */
export function legible(color: string, fondo: keyof typeof FONDOS): string {
  const base = canales(color), meta = fondo === 'claro' ? 0 : 255, detras = canales(FONDOS[fondo]);
  for (let paso = 0; paso <= 20; paso++) {
    const mezcla = base.map(v => v + (meta - v) * paso / 20);
    if (contraste(mezcla, detras) >= 3) return paso ? hex(...mezcla) : color;
  }
  return hex(meta, meta, meta);
}
