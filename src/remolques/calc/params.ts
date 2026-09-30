export interface Recogida {
  nombre: string;
  delante: number;
  atras: number;
  lateralSoloAtras: number;
  lateralSoloDelante: number;
  /** El paño trasero se mide con el ancho de DELANTE aunque el remolque sea más ancho detrás:
   *  su demasía ya lleva esa diferencia. Solo los puentes de Hijos de Pedro López (CAD de
   *  Iván, 30/09/2026: 130 delante, 131,5 detrás y paño trasero 130 + 42,5 = 172,5). */
  panoTraseroConAnchoDelante?: boolean;
}

export interface ClienteBaqueton {
  nombre: string;
  extraLargoCostura: number;
  extraAnchoCostura: number;
  extraBaquetonLargoDelante: number;
  extraBaquetonLargoDetras: number;
  extraLargoFinal: number;
  extraAnchoFinal: number;
  extraBaquetonTrasero: number;
  observaciones: string[];
}

export interface CalcParams {
  recogidas: Recogida[];
  demasiaAlto: number;
  demasiaContornoNormal: number;
  demasiaContornoEnfundar: number;
  demasiaLonaHecha: number;
  /** Bastillas que se suman al contorno real para obtener la medida de corte. */
  ajusteContornoBase: number;
  /** Demasía adicional del contorno cuando el perfil lleva curva. */
  ajusteContornoCurva: number;
  pasoOllaosDefecto: number;
  primerOllao: number;
  maxPosicionesOllaos: number;
  baquetonDemasiaLargoCostura: number;
  baquetonDemasiaAnchoCostura: number;
  baquetonDemasiaCostura: number;
  baquetonDemasiaFinal: number;
  clientesBaqueton: ClienteBaqueton[];
  /** Quién puede figurar como técnico: en la cabecera, al aprobar y al producir.
   *  Vive aquí y no a mano en el formulario porque tres sitios usan la misma
   *  lista y una de ellas decide quién firma una revisión. */
  tecnicos: string[];
}

/** Nombres de Iván (30/09/2026): se ve solo el nombre, sin «TIPO 0X». Los códigos no cambian (los
 *  planteamientos guardados y la web vieja los usan); el orden es el del desplegable. */
export const PERFILES = [
  { value: "TIPO 01", label: "Recto" },
  { value: "TIPO 02", label: "Recto con aguas" },
  { value: "TIPO 05", label: "Arquillado" },
  { value: "TIPO 03", label: "Arquillado con aguas" },
  { value: "TIPO 04", label: "Con chaflán" },
] as const;
export type TipoPerfil = (typeof PERFILES)[number]["value"];
export const TIPOS_PERFIL: TipoPerfil[] = PERFILES.map((perfil) => perfil.value);

/** Radios de las aristas del chaflán (TIPO 04); 0 o ausente = arista viva. */
export interface RadiosChaflan {
  abajo?: number;
  arriba?: number;
}

/**
 * El TIPO 03 y el TIPO 05 son curvos por definición. El TIPO 04 lo es solo si
 * de verdad le han puesto radio en alguna arista: con las dos vivas es un
 * chaflán recto de toda la vida.
 *
 * La demasía existe porque la tela curvada necesita algo más de material para
 * asentarse, así que sigue al radio y no al nombre del perfil (decisión de
 * Iván, 2026-08-01, al añadirse el chaflán con aristas curvadas).
 */
export function perfilTieneCurva(tipo: TipoPerfil | "", radiosChaflan?: RadiosChaflan): boolean {
  if (tipo === "TIPO 03" || tipo === "TIPO 05") return true;
  if (tipo !== "TIPO 04") return false;
  return (radiosChaflan?.abajo ?? 0) > 0 || (radiosChaflan?.arriba ?? 0) > 0;
}

/** Suma de bastillas (y demasía de curva si procede) sobre el contorno real. */
export function ajusteContorno(
  params: CalcParams, tipo: TipoPerfil | "", radiosChaflan?: RadiosChaflan,
): number {
  return params.ajusteContornoBase
    + (perfilTieneCurva(tipo, radiosChaflan) ? params.ajusteContornoCurva : 0);
}

export function nombrePerfil(tipo: TipoPerfil): string {
  return PERFILES.find((perfil) => perfil.value === tipo)?.label ?? tipo;
}

const r = (
  nombre: string, delante: number, atras: number,
  lateralSoloAtras = 0, lateralSoloDelante = 0,
): Recogida => ({ nombre, delante, atras, lateralSoloAtras, lateralSoloDelante });

export const DEFAULT_PARAMS: CalcParams = {
  recogidas: [
    r("NO", 3, 3),
    r("GOMA", 27, 27),
    // Provisional (30/09/2026): las mismas medidas que la goma hasta que el taller dé las suyas
    // (docs/modelos/dudas-abiertas.md, Q-R01).
    r("GANCHOS CORAZON", 27, 27),
    r("CREMALLERA", 3, 3),
    r("VELCRO", 27, 27),
    r("PUENTES ESVA", 21, 21, 19, 19),
    r("PUENTES LATERALES", 41, 21, 9, 9),
    // Sus remolques son 1,5 cm más anchos detrás y los 42,5 ya lo incluyen: el paño trasero
    // se mide con el ancho de delante (CAD de Iván, 30/09/2026).
    { ...r("PUENTES HIJOS DE PEDRO LOPEZ", 42.5, 42.5, 11.5, 9), panoTraseroConAnchoDelante: true },
  ],
  demasiaAlto: 4.5,
  demasiaContornoNormal: 3,
  demasiaContornoEnfundar: 13,
  demasiaLonaHecha: 1,
  ajusteContornoBase: 7,
  ajusteContornoCurva: 1.5,
  pasoOllaosDefecto: 35,
  primerOllao: 2.5,
  maxPosicionesOllaos: 12,
  baquetonDemasiaLargoCostura: 7,
  baquetonDemasiaAnchoCostura: 7,
  baquetonDemasiaCostura: 2,
  baquetonDemasiaFinal: 1,
  tecnicos: ["IVAN", "ADRIAN", "JAIME", "TAMARA", "ALBERTO", "ANGEL"],
  clientesBaqueton: [
    {
      nombre: "GENERAL",
      extraLargoCostura: 0, extraAnchoCostura: 0,
      extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0,
      observaciones: [],
    },
    {
      nombre: "HIJOS DE PEDRO LOPEZ",
      extraLargoCostura: 11, extraAnchoCostura: 2,
      extraBaquetonLargoDelante: 1, extraBaquetonLargoDetras: 11,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 10,
      observaciones: ["ABIERTO EN LA PARTE TRASERA (REFORZAR)"],
    },
    {
      nombre: "AYALA",
      extraLargoCostura: 1, extraAnchoCostura: 1,
      extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
      extraLargoFinal: 1, extraAnchoFinal: 1, extraBaquetonTrasero: 0,
      observaciones: [],
    },
    {
      nombre: "GENERAL WOLDER",
      extraLargoCostura: -1, extraAnchoCostura: -1,
      extraBaquetonLargoDelante: -0.5, extraBaquetonLargoDetras: -0.5,
      extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0,
      observaciones: [
        "OLLAOS EN ALTA FRECUENCIA",
        "ETIQUETA EN I.D EN LA PARTE TRASERA ENTRE LOS 2 OLLAOS MÁS A LA DERECHA",
        "MANDAR GOMA SUELTA",
      ],
    },
  ],
};

export function findRecogida(params: CalcParams, nombre: string): Recogida {
  return (
    params.recogidas.find((x) => x.nombre === nombre) ??
    params.recogidas.find((x) => x.nombre === "NO")!
  );
}

export function findClienteBaqueton(params: CalcParams, nombre: string): ClienteBaqueton {
  return (
    params.clientesBaqueton.find((x) => x.nombre === nombre) ??
    params.clientesBaqueton.find((x) => x.nombre === "GENERAL")!
  );
}
