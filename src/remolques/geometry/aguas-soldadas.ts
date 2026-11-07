export type PuntoDesarrollo = [number, number];

export interface MedidasContornoSoldado {
  largo: number;
  ancho: number;
  alto: number;
  aguas: number;
  /** Solape de cada unión: lo pone entero el techo, que monta encima del lateral (Iván, 06/11/2026). */
  solape: number;
  /** Demasías en la dirección longitudinal del remolque. */
  extraDelante: number;
  extraAtras: number;
  bastilla: number;
}

/**
 * Un techo y dos laterales enteros, unidos por las dos líneas inclinadas de bajada.
 * Iván, 06/11/2026: soldadura con 2 cm de solape. El techo monta encima del lateral, por el agua,
 * así que los 2 cm los lleva entero el techo; el lateral se corta a su medida, hasta la línea del borde.
 */
export function desarrolloContornoSoldado(m: MedidasContornoSoldado) {
  if (!Object.values(m).every(Number.isFinite)
    || m.largo <= 0 || m.ancho <= 0 || m.alto <= 0 || m.solape <= 0
    || m.aguas < 0 || m.aguas >= m.alto
    || m.extraDelante < 0 || m.extraAtras < 0 || m.bastilla < 0) {
    throw new Error("Revisa las medidas y el solape de las soldaduras del contorno.");
  }
  const media = m.largo / 2;
  const vertiente = Math.hypot(media, m.aguas);
  const secante = vertiente / media;
  const pendiente = m.aguas / media;
  // Todo el solape en el techo; el lateral, sin demasía en los bordes que se sueldan.
  const margenSoldadura = m.solape, margenLateral = 0;
  const altoExtremos = m.alto - m.aguas;
  const nominal: PuntoDesarrollo[] = [[0, 0], [m.largo, 0], [m.largo, altoExtremos], [media, m.alto], [0, altoExtremos]];
  const desplazar = ([x, y]: PuntoDesarrollo): PuntoDesarrollo => [x + m.extraDelante, y + m.bastilla];
  const aumentoVertical = margenLateral * secante;
  const anchoCorte = m.largo + m.extraDelante + m.extraAtras;
  const altoCorte = m.alto + m.bastilla + aumentoVertical;
  const corte: PuntoDesarrollo[] = [
    [0, 0], [anchoCorte, 0],
    [anchoCorte, altoExtremos - pendiente * m.extraAtras + m.bastilla + aumentoVertical],
    [media + m.extraDelante, altoCorte],
    [0, altoExtremos - pendiente * m.extraDelante + m.bastilla + aumentoVertical],
  ];
  const largoNominal = 2 * vertiente;
  const largoCorte = largoNominal + (m.extraDelante + m.extraAtras) * secante;
  const anchoTecho = m.ancho + 2 * margenSoldadura;
  return {
    solape: m.solape, margenSoldadura, vertiente, secante, altoExtremos,
    techo: {
      largoNominal, anchoNominal: m.ancho, largoCorte, anchoCorte: anchoTecho,
      corte: [[0, 0], [largoCorte, 0], [largoCorte, anchoTecho], [0, anchoTecho]] as PuntoDesarrollo[],
      desdeDelante: m.extraDelante * secante,
      cumbrera: (m.extraDelante * secante) + vertiente,
      uniones: [margenSoldadura, margenSoldadura + m.ancho],
      /** Límite del borde del lateral al soldar: solo se marca en el techo. */
      limitesSoldadura: [m.solape, anchoTecho - m.solape],
    },
    lateral: {
      nominal, corte, anchoCorte, altoCorte,
      union: nominal.slice(2).map(desplazar),
      nominalEnCorte: nominal.map(desplazar),
      desdeDelante: m.extraDelante, desdeAbajo: m.bastilla,
    },
  };
}

export type DesarrolloContornoSoldado = ReturnType<typeof desarrolloContornoSoldado>;
