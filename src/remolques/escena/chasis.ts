import { semianchoCajon } from "./comun.ts";
import {
  EJE_BAJO_CAJON, ENGANCHE, GUARDABARROS_HOLGURA, LANZA_A_COSTADO, LANZA_BAJO_CAJON, LANZA_DENTRO, LANZA_LARGO,
  LANZA_SECCION, PILOTO, RADIO_BOLA, RUEDA_ANCHO, RUEDA_FUERA_CAJON, RUEDA_JOCKEY_A_BOLA, RUEDA_JOCKEY_ANCHO,
  RUEDA_JOCKEY_RADIO, RUEDA_RADIO, SEPARACION_ROTULO,
} from "./constantes.ts";
import type { Cajon, ChasisEscena, EscenaRemolque, RotuloEscena, Vec3 } from "./tipos.ts";

// Remolque genérico bajo el cajón (Iván, 30/09/2026: «indicar cuál es la parte delantera y la
// trasera… ruedas o enganche o algo»): delante la lanza en V con el enganche de bola y la rueda
// jockey; a media caja un eje con dos ruedas y sus guardabarros; detrás dos pilotos rojos en la
// cara de atrás del cajón. No está a escala de ningún pedido: solo dice dónde está cada lado.

export function chasisDe(c: Cajon): ChasisEscena {
  const fondo = -c.alto;
  const yEje = fondo - EJE_BAJO_CAJON;
  const suelo = yEje - RUEDA_RADIO;
  const zEje = c.zDesde + c.largo / 2;
  const xRueda = semianchoCajon(c, zEje) + RUEDA_FUERA_CAJON + RUEDA_ANCHO / 2;
  const ruedas = [-1, 1].map((lado) => ({ centro: [lado * xRueda, yEje, zEje] as Vec3, radio: RUEDA_RADIO, ancho: RUEDA_ANCHO }));

  const yLanza = fondo - LANZA_BAJO_CAJON;
  const zBola = c.zHasta + LANZA_LARGO;
  // La cabeza del enganche monta sobre la bola; los tubos llegan a su parte de atrás.
  const zCabeza = zBola - ENGANCHE.largo / 2 + 4;
  const zJuntan = zCabeza - ENGANCHE.largo / 2;
  const zArranque = c.zHasta - LANZA_DENTRO;
  const xArranque = semianchoCajon(c, zArranque) - LANZA_A_COSTADO;
  const xJuntan = ENGANCHE.ancho / 2 - LANZA_SECCION / 4;
  const lanza = [-1, 1].map((lado) => ({
    desde: [lado * xArranque, yLanza, zArranque] as Vec3,
    hasta: [lado * xJuntan, yLanza, zJuntan] as Vec3,
  }));
  // La rueda jockey va en el tubo derecho, por fuera de él.
  const zJockey = zBola - RUEDA_JOCKEY_A_BOLA;
  const t = (zJockey - zArranque) / (zJuntan - zArranque);
  const xJockey = xArranque + (xJuntan - xArranque) * t + LANZA_SECCION / 2 + RUEDA_JOCKEY_ANCHO / 2 + 1;
  const centroJockey: Vec3 = [xJockey, suelo + RUEDA_JOCKEY_RADIO, zJockey];

  const semiAtras = semianchoCajon(c, c.zDesde);
  const xPiloto = semiAtras - PILOTO.aEsquina - PILOTO.ancho / 2;
  const yPiloto = fondo + PILOTO.sobreFondo + PILOTO.alto / 2;

  return {
    suelo,
    lanza,
    seccionLanza: LANZA_SECCION,
    enganche: {
      bola: [0, yLanza - ENGANCHE.alto / 2, zBola],
      radioBola: RADIO_BOLA,
      cabeza: { centro: [0, yLanza, zCabeza], ...ENGANCHE },
    },
    ruedaJockey: {
      rueda: { centro: centroJockey, radio: RUEDA_JOCKEY_RADIO, ancho: RUEDA_JOCKEY_ANCHO },
      tubo: { desde: [xJockey, centroJockey[1], zJockey], hasta: [xJockey, yLanza + 12, zJockey] },
    },
    eje: { desde: ruedas[0].centro, hasta: ruedas[1].centro },
    ruedas,
    guardabarros: ruedas.map((r) => ({ centro: r.centro, radio: RUEDA_RADIO + GUARDABARROS_HOLGURA, ancho: RUEDA_ANCHO + GUARDABARROS_HOLGURA })),
    pilotos: [-1, 1].map((lado) => ({
      centro: [lado * xPiloto, yPiloto, c.zDesde - PILOTO.fondo / 2] as Vec3,
      ancho: PILOTO.ancho, alto: PILOTO.alto, fondo: PILOTO.fondo,
    })),
  };
}

/** Caja que envuelve la lona (o el baquetón) de `semiancho` y `altoMax`, su cajón y el remolque. */
export function cajaDe(semiancho: number, altoMax: number, largo: number, chasis: ChasisEscena): EscenaRemolque["caja"] {
  const x = Math.max(semiancho, ...chasis.guardabarros.map((g) => Math.abs(g.centro[0]) + g.ancho / 2));
  const zAtras = Math.min(0, ...chasis.pilotos.map((p) => p.centro[2] - p.fondo / 2));
  const { cabeza } = chasis.enganche;
  const zDelante = Math.max(largo, cabeza.centro[2] + cabeza.largo / 2);
  return { min: [-x, chasis.suelo, zAtras], max: [x, altoMax, zDelante] };
}

/** DELANTE y DETRÁS en las vistas rectas, fuera de la lona y de las cotas: en el lateral, cada uno
 *  en su punta por encima de la lona; desde arriba, más allá del enganche y de los pilotos; de
 *  frente y de espaldas, como título. */
export function rotulosDe(caja: EscenaRemolque["caja"]): RotuloEscena[] {
  const [, , zMin] = caja.min;
  const [xMax, yMax, zMax] = caja.max;
  const arriba = yMax + SEPARACION_ROTULO;
  return [
    { vistas: ["delante"], punto: [0, arriba, zMax], texto: "DELANTE", alinear: "middle" },
    { vistas: ["detras"], punto: [0, arriba, zMin], texto: "DETRÁS", alinear: "middle" },
    { vistas: ["lateral"], punto: [xMax, arriba, zMax], texto: "DELANTE", alinear: "end" },
    { vistas: ["lateral"], punto: [xMax, arriba, zMin], texto: "DETRÁS", alinear: "start" },
    { vistas: ["arriba"], punto: [0, 0, zMax + SEPARACION_ROTULO], texto: "DELANTE", alinear: "middle" },
    // Desde arriba el texto crece hacia delante: algo más lejos, para que no pise los pilotos.
    { vistas: ["arriba"], punto: [0, 0, zMin - 1.6 * SEPARACION_ROTULO], texto: "DETRÁS", alinear: "middle" },
  ];
}
