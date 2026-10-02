// Nombre corto de una tela para el planteamiento (Iván, 02/10/2026). RPS describe las lonas con
// gama, capas y gramaje («LONA NS86 2L 630 g/m² :BLANCO :250 AN (580)»), y en la casilla MATERIAL
// del PDF eso obligaba a letra diminuta. Se queda lo que el taller necesita:
//   · PVC (NS86, ALPHA, MONZA, G650, GAMMA, LAC, PANAMA, VIP-FR y las «(580)»):
//     «LONA PVC <gramaje> <color> :<ancho> AN». El «(580)» de RPS manda sobre el gramaje de la
//     descripción. Se conservan IGNÍFUGA y PISCINA.
//   · Acrílica: «ACR <color> :<ancho> AN», con la gama si no es la Masacril normal (RESINADO,
//     TANDEM, DOCRIL…).
//   · El color va sin la palabra RAL: «GRIS 7038».
// Lo que no sigue ese patrón (sin color o sin ancho, rejillas, mallas…) sale tal cual.

// Las lonas de PVC de siempre (toldo y remolque). Las técnicas (Soltis, Recscreen, Frontlit,
// Black out, Mesh…) siguen con el nombre de RPS: su gama es lo que las distingue.
const LONA_PVC = /^LONA (?:PISCINA )?(?:NS86|ALPHA|MONZA|G650|GAMMA|LAC\d|PANAMA|B6000|VIP-FR)/i;
const ANCHO =/:?\s*(\d{2,3})\s*AN$/i;
const GRAMAJE = /(?:^|\s)(\d{3})(?:\s*(?:G|GR|GRS)\.?|\s*g\/m²)?(?=\s|$)/gi;
// Palabras que en una acrílica no dicen nada al taller: la familia, la gama normal y el gramaje.
const ACRILICA_SOBRA = /^(LONA|ACRILICA|ACRILICO|MASACRIL|MASCRIL|\d+(G|GR|GRS)?\.?|\d*G?\/M2|\d*G?\/M²|GR\/M2)$/i;

export function shortFabricName(description) {
  const original = String(description ?? '').trim();
  const limpio = original.replace(/\s+/g, ' ');
  const es580 = /\(580\)$/.test(limpio);
  const sin580 = limpio.replace(/\s*\(580\)$/, '');
  const ancho = ANCHO.exec(sin580);
  if (!ancho) return original;
  const resto = sin580.slice(0, ancho.index);
  const corte = resto.indexOf(':');
  if (corte < 0) return original;
  const gama = resto.slice(0, corte).trim();
  const color = resto.slice(corte + 1)
    .replace(/:/g, ' ')
    .replace(/\bRAL?\s*(?=\d{4}\b)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!color) return original;
  const final = `${color} :${ancho[1]} AN`;

  if (/ACRIL/i.test(gama)) {
    const resto = gama.split(' ').filter((palabra) => !ACRILICA_SOBRA.test(palabra));
    return ['ACR', ...resto, final].join(' ');
  }
  if (!es580 && !LONA_PVC.test(gama)) return original;
  const gramajes = [...gama.matchAll(GRAMAJE)].map((m) => m[1]);
  const gramaje = es580 ? '580' : gramajes.at(-1);
  if (!gramaje) return original;
  const extras = [
    /IGN|\bB1\b|\bFR\b|-FR\b|\bM[12]\b/i.test(gama) ? 'IGNÍFUGA' : '',
    /PISCINA/i.test(gama) ? 'PISCINA' : '',
  ].filter(Boolean);
  return ['LONA PVC', gramaje, ...extras, final].join(' ');
}
