// Referencias observadas en las capturas del catálogo aportadas por Iván.
// La medida comercial es el largo del anillo cerrado, no la cadena desarrollada.
const sizesByColor = Object.freeze({
  BLANCO: Object.freeze([100, 150, 200, 250, 300, 400]),
  NEGRO: Object.freeze([150, 200, 300])
});

export function resolveHeraChainRing(color, ringLength) {
  const normalizedColor = String(color || '').trim().toUpperCase();
  if (!sizesByColor[normalizedColor]?.includes(ringLength)) return null;
  const prefix = normalizedColor === 'BLANCO' ? 'SCRANILBLAN' : 'SCRANILNEGRO';
  return {
    code: `${prefix}${ringLength}C`,
    description: `Screen anillo de cadena :${normalizedColor.toLowerCase()} :${ringLength}cm`
  };
}
