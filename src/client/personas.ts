// Iniciales y color de cada técnico: los mismos que en CoordinaOT (coordina-ot/src/lib/mock.ts
// 19-24), para que «Iván» sea el mismo círculo dorado allí y aquí. Los técnicos de esta web
// son los de la oficina técnica; las iniciales de CoordinaOT son dos letras sin tilde.
const PERSONAS: Record<string, { iniciales: string; color: string }> = {
  ALBERTO: { iniciales: 'AL', color: '#e0533d' },
  JAIME: { iniciales: 'JA', color: '#3d7de0' },
  TAMARA: { iniciales: 'TA', color: '#9b3de0' },
  ADRIAN: { iniciales: 'AD', color: '#1fa37a' },
  IVAN: { iniciales: 'IV', color: '#d39a1c' },
  ANGEL: { iniciales: 'AN', color: '#5a6472' }
};

// Tinta del texto sobre un color de persona: blanca u oscura, la que más contraste da
// (coordina-ot/src/lib/tinta.ts). No se oscurece el color de cada uno porque es lo que lo
// identifica; se elige la letra.
const TINTA_OSCURA = '#1a1206';
const TINTA_BLANCA = '#ffffff';

function canal(valor: number) {
  const s = valor / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

function contraste(a: number, b: number) {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function tintaSobre(fondo: string) {
  const l = luminancia(fondo);
  if (l === null) return TINTA_BLANCA;
  const oscura = luminancia(TINTA_OSCURA) as number;
  return contraste(l, 1) >= contraste(l, oscura) ? TINTA_BLANCA : TINTA_OSCURA;
}

function clave(nombre: string) {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleUpperCase('es-ES');
}

// Un técnico que CoordinaOT no tenga (nombre nuevo en la lista) sale con sus dos primeras
// letras y sin color propio: quien lo pinta usa entonces el dorado de la marca.
export function personaDe(nombre: string): { iniciales: string; color: string | null } {
  const conocida = PERSONAS[clave(nombre)];
  if (conocida) return conocida;
  return { iniciales: clave(nombre).slice(0, 2), color: null };
}
