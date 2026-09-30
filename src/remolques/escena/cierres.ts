import { excelRound } from "../calc/redondeo.ts";
import { findRecogida, type CalcParams } from "../calc/params.ts";
import { USAR_COLUMNA_ATRAS } from "../calc/lona.ts";
import type { LonaInput } from "../calc/lona.ts";
import { semianchoCajon } from "./comun.ts";
import {
  ALTO_GOMA_AL_CENTRO, ANCHO_VELCRO, CORAZON_A_BORDE, CORAZON_NUDO, CREMALLERA_A_ESQUINA, CREMALLERA_BAJO_CIMA, DEMASIA_SIN_RECOGIDA, GANCHO_BAJO_BORDE, GANCHO_COMPARTIDO,
  GOMA_ALTO_DOS_OLLAOS, GOMA_ALTURAS_DOS, GOMA_ALTURAS_TRES, GOMA_GANCHO_A_ESQUINA, GOMA_GANCHO_ANTES_DEL_CENTRO,
  MARGEN_CIERRE, OLLAO_EN_OREJA,
} from "./constantes.ts";
import type { Cajon, CierreEsquina, CuerpoLona, Esquina, Gancho, Perfil2D, TipoCierre, Vec3 } from "./tipos.ts";

const r1 = (v: number) => excelRound(v, 1);

export function tipoCierre(nombre: string): TipoCierre {
  if (nombre.startsWith("PUENTES")) return "PUENTES";
  if (nombre === "GANCHOS CORAZON") return "CORAZON";
  return nombre === "GOMA" || nombre === "CREMALLERA" || nombre === "VELCRO" ? nombre : "NO";
}

/** Alturas repartidas de abajo arriba, con un margen en cada punta, a un paso lo más cercano a `paso`. */
export function alturasCierre(alto: number, paso: number): number[] {
  const util = alto - 2 * MARGEN_CIERRE;
  if (util <= 0) return [r1(alto / 2)];
  const tramos = Math.max(1, Math.round(util / paso));
  return Array.from({ length: tramos + 1 }, (_, i) => r1(MARGEN_CIERRE + (util * i) / tramos));
}

/** La demasía de la recogida sobre la de «NO» se reparte entre las dos esquinas del paño:
 *  es la oreja que dobla sobre el lateral. La oreja sigue la columna con que se corta el paño,
 *  igual que en calcLona. */
export function orejaRecogida(params: CalcParams, nombre: string, cara: "delante" | "atras" = "delante"): number {
  const sinRecogida = params.recogidas.find((r) => r.nombre === "NO")?.delante ?? DEMASIA_SIN_RECOGIDA;
  const rec = findRecogida(params, nombre);
  // Para los paños traseros, usar DELANTE o ATRAS según USAR_COLUMNA_ATRAS
  const columna = cara === "delante" ? rec.delante : (USAR_COLUMNA_ATRAS ? rec.atras : rec.delante);
  return r1(Math.max(0, (columna - sinRecogida) / 2));
}

/** Dónde acaba de verdad una goma que querría ir a `punto`, y si ese gancho hay que ponerlo. */
export type ElegirGancho = (punto: Vec3) => { punto: Vec3; nuevo: boolean };

const distancia = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mismoPunto = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/** Ganchos de una cara del cajón: los de la goma perimetral (`yaPuestos`) y los que van poniendo
 *  las gomas de las esquinas. Si hay uno perimetral a menos de GANCHO_COMPARTIDO, la goma acaba en
 *  él (el más cercano); si otra goma ya puso ese mismo gancho (el del centro), lo comparte. */
export function ganchosDeCara(yaPuestos: Vec3[]): ElegirGancho {
  const puestos: Vec3[] = [];
  return (punto) => {
    let cercano: Vec3 | null = null;
    for (const p of yaPuestos) {
      if (distancia(p, punto) < GANCHO_COMPARTIDO && (!cercano || distancia(p, punto) < distancia(cercano, punto))) cercano = p;
    }
    if (cercano) return { punto: cercano, nuevo: false };
    const mismo = puestos.find((p) => mismoPunto(p, punto));
    if (mismo) return { punto: mismo, nuevo: false };
    puestos.push(punto);
    return { punto, nuevo: true };
  };
}

/** Goma de la esquina: los ollaos suben por el borde libre de la oreja, en la parte baja de la
 *  pared, y cada uno baja en diagonal a un gancho de la cara del paño en el cajón. Con la pared
 *  alta todas se juntan en el gancho del centro de esa cara; con la pared más baja cada una va a
 *  un gancho cercano a la esquina, el ollao más alto al más cercano, así que se cruzan en X.
 *  `elegir` decide si el gancho ya está (ver ganchosDeCara); por defecto, siempre uno nuevo. */
export function gomaDiagonal(
  base: Vec3, alto: number, hacia: Vec3, lado: -1 | 1, oreja: number, cajon: Cajon, zCara: number,
  elegir: ElegirGancho = (punto) => ({ punto, nuevo: true }),
): CierreEsquina["gomaDiagonal"] {
  if (oreja <= 0) return [];
  const fracciones = alto <= GOMA_ALTO_DOS_OLLAOS ? GOMA_ALTURAS_DOS : GOMA_ALTURAS_TRES;
  // Del más cercano al más lejano; en un remolque estrecho se acercan todos a la esquina
  // en la misma proporción, sin pasar del centro del paño.
  const distancias = GOMA_GANCHO_A_ESQUINA.slice(0, fracciones.length);
  const semi = semianchoCajon(cajon, zCara);
  const cabe = Math.max(0, semi - GOMA_GANCHO_ANTES_DEL_CENTRO);
  const escala = Math.min(1, cabe / distancias[distancias.length - 1]);
  // Sobre la oreja, a OLLAO_EN_OREJA de su borde libre; con una oreja estrecha, en su mitad.
  const a = oreja - Math.min(OLLAO_EN_OREJA, oreja / 2);
  return fracciones.map((f, i) => {
    const y = r1(alto * f);
    // Pared alta: al centro. Si no, ollaos de abajo arriba ↔ ganchos de lejos a cerca.
    const x = alto >= ALTO_GOMA_AL_CENTRO ? 0 : r1(lado * (semi - distancias[distancias.length - 1 - i] * escala));
    const { punto: gancho, nuevo } = elegir([x, -GANCHO_BAJO_BORDE, zCara]);
    // La goma tensa dobla la arista de la esquina: con el lateral y el paño desplegados en un
    // plano va en línea recta, así que cruza la arista a esta altura.
    const d = Math.abs(base[0] - gancho[0]);
    const yArista = r1(y + ((gancho[1] - y) * a) / (a + d));
    return {
      ollao: [r1(base[0] + hacia[0] * a), y, r1(base[2] + hacia[2] * a)],
      esquina: [base[0], yArista, base[2]],
      gancho,
      ganchoNuevo: nuevo,
    };
  });
}

/** Ganchos corazón de una esquina: la fila de la oreja, a CORAZON_A_BORDE de su borde libre, y la
 *  del lateral, a lo mismo por fuera del borde; cada fila a `paso` (el de los ollaos) y las dos
 *  desfasadas medio paso, así que de abajo arriba se alternan y el cordón hace el zigzag. */
export function ganchosCorazon(base: Vec3, alto: number, hacia: Vec3, oreja: number, paso: number): CierreEsquina["corazon"] {
  if (oreja <= 0) return null;
  const sobre = (a: number, y: number): Vec3 => [r1(base[0] + hacia[0] * a), y, r1(base[2] + hacia[2] * a)];
  const enOreja = oreja - Math.min(CORAZON_A_BORDE, oreja / 2);
  const ganchos = alturasCierre(alto, paso / 2).map((y, i) => ({
    punto: sobre(i % 2 === 0 ? enOreja : oreja + CORAZON_A_BORDE, y),
    enOreja: i % 2 === 0,
  }));
  return { ganchos, nudo: sobre(oreja, r1(Math.max(ganchos[0].punto[1] - CORAZON_NUDO, ganchos[0].punto[1] / 2))) };
}

/** `ganchos`: los del cajón para la goma perimetral (genéricos o del pedido). */
export function cierresLona(
  input: LonaInput, cuerpo: CuerpoLona, params: CalcParams, cajon: Cajon, ganchos: Gancho[] = [],
): CierreEsquina[] {
  const elegir = {
    delante: ganchosDeCara(ganchos.filter((g) => g.lado === "delante").map((g) => g.punto)),
    atras: ganchosDeCara(ganchos.filter((g) => g.lado === "atras").map((g) => g.punto)),
  };
  // Puentes y ganchos corazón van a lo alto con el paso de los ollaos del elemento.
  const paso = input.pasoOllaos > 0 ? input.pasoOllaos : params.pasoOllaosDefecto;
  const esquinas: Array<{ esquina: Esquina; nombre: string; perfil: Perfil2D; z: number; lado: -1 | 1; hacia: Vec3; cara: "delante" | "atras" }> = [
    { esquina: "delante-izquierda", nombre: input.recogeDelante, perfil: cuerpo.perfilDelante, z: cuerpo.largo, lado: -1, hacia: [0, 0, -1], cara: "delante" },
    { esquina: "delante-derecha", nombre: input.recogeDelante, perfil: cuerpo.perfilDelante, z: cuerpo.largo, lado: 1, hacia: [0, 0, -1], cara: "delante" },
    { esquina: "atras-izquierda", nombre: input.recogeAtras, perfil: cuerpo.perfilAtras, z: 0, lado: -1, hacia: [0, 0, 1], cara: "atras" },
    { esquina: "atras-derecha", nombre: input.recogeAtras, perfil: cuerpo.perfilAtras, z: 0, lado: 1, hacia: [0, 0, 1], cara: "atras" },
  ];
  return esquinas.map(({ esquina, nombre, perfil, z, lado, hacia, cara }) => {
    const tipo = tipoCierre(nombre);
    // El segundo punto del perfil es donde acaba la pared vertical (el hombro o el arranque del radio).
    const alto = perfil[1][1];
    const semi = perfil[perfil.length - 1][0];
    const conOreja = tipo === "GOMA" || tipo === "CORAZON" || tipo === "VELCRO" || tipo === "PUENTES";
    const oreja = conOreja ? orejaRecogida(params, nombre, cara) : 0;
    const base: Vec3 = [lado * semi, 0, z];
    return {
      esquina, tipo,
      base,
      alto,
      haciaLateral: hacia,
      normal: [lado, 0, 0],
      oreja,
      alturas: tipo === "PUENTES" ? alturasCierre(alto, paso) : [],
      corazon: tipo === "CORAZON" ? ganchosCorazon(base, alto, hacia, oreja, paso) : null,
      gomaDiagonal: tipo === "GOMA"
        ? gomaDiagonal(base, alto, hacia, lado, oreja, cajon, cara === "delante" ? cajon.zHasta : cajon.zDesde, elegir[cara])
        : [],
      // En el paño (Iván, 30/09/2026): de la esquina hacia el centro, a lo ancho; la normal del paño
      // es la contraria a la dirección que se aleja de él por el lateral.
      cremallera: tipo === "CREMALLERA"
        ? {
          distancia: CREMALLERA_A_ESQUINA, hasta: r1(alto - CREMALLERA_BAJO_CIMA),
          pie: [r1(lado * (semi - CREMALLERA_A_ESQUINA)), 0, z], normal: [0, 0, -hacia[2]],
        }
        : null,
      velcro: tipo === "VELCRO" ? { ancho: ANCHO_VELCRO } : null,
    };
  });
}
