import { excelRound } from "../calc/redondeo.ts";
import { findRecogida, type CalcParams } from "../calc/params.ts";
import { USAR_COLUMNA_ATRAS } from "../calc/lona.ts";
import type { LonaInput } from "../calc/lona.ts";
import { semianchoCajon } from "./comun.ts";
import {
  ALTO_GOMA_AL_CENTRO, ANCHO_VELCRO, CREMALLERA_A_ESQUINA, CREMALLERA_BAJO_CIMA, DEMASIA_SIN_RECOGIDA, GANCHO_BAJO_BORDE,
  GOMA_ALTO_DOS_OLLAOS, GOMA_ALTURAS_DOS, GOMA_ALTURAS_TRES, GOMA_GANCHO_A_ESQUINA, GOMA_GANCHO_ANTES_DEL_CENTRO,
  MARGEN_CIERRE, OLLAO_EN_OREJA, PASO_CIERRE,
} from "./constantes.ts";
import type { Cajon, CierreEsquina, CuerpoLona, Esquina, Perfil2D, TipoCierre, Vec3 } from "./tipos.ts";

const r1 = (v: number) => excelRound(v, 1);

export function tipoCierre(nombre: string): TipoCierre {
  if (nombre.startsWith("PUENTES")) return "PUENTES";
  return nombre === "GOMA" || nombre === "CREMALLERA" || nombre === "VELCRO" ? nombre : "NO";
}

/** Alturas repartidas de abajo arriba, con un margen en cada punta. */
export function alturasCierre(alto: number): number[] {
  const util = alto - 2 * MARGEN_CIERRE;
  if (util <= 0) return [r1(alto / 2)];
  const tramos = Math.max(1, Math.round(util / PASO_CIERRE));
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

/** Goma de la esquina: los ollaos suben por el borde libre de la oreja, en la parte baja de la
 *  pared, y cada uno baja en diagonal a un gancho de la cara del paño en el cajón. Con la pared
 *  alta todas se juntan en el gancho del centro de esa cara; con la pared más baja cada una va a
 *  un gancho cercano a la esquina, el ollao más alto al más cercano, así que se cruzan en X. */
export function gomaDiagonal(
  base: Vec3, alto: number, hacia: Vec3, lado: -1 | 1, oreja: number, cajon: Cajon, zCara: number,
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
    // La goma tensa dobla la arista de la esquina: con el lateral y el paño desplegados en un
    // plano va en línea recta, así que cruza la arista a esta altura.
    const d = Math.abs(base[0] - x);
    const yArista = r1(y + ((-GANCHO_BAJO_BORDE - y) * a) / (a + d));
    return {
      ollao: [r1(base[0] + hacia[0] * a), y, r1(base[2] + hacia[2] * a)],
      esquina: [base[0], yArista, base[2]],
      gancho: [x, -GANCHO_BAJO_BORDE, zCara],
    };
  });
}

export function cierresLona(input: LonaInput, cuerpo: CuerpoLona, params: CalcParams, cajon: Cajon): CierreEsquina[] {
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
    const conOreja = tipo === "GOMA" || tipo === "VELCRO" || tipo === "PUENTES";
    const oreja = conOreja ? orejaRecogida(params, nombre, cara) : 0;
    const base: Vec3 = [lado * semi, 0, z];
    return {
      esquina, tipo,
      base,
      alto,
      haciaLateral: hacia,
      normal: [lado, 0, 0],
      oreja,
      alturas: tipo === "PUENTES" ? alturasCierre(alto) : [],
      gomaDiagonal: tipo === "GOMA"
        ? gomaDiagonal(base, alto, hacia, lado, oreja, cajon, cara === "delante" ? cajon.zHasta : cajon.zDesde)
        : [],
      cremallera: tipo === "CREMALLERA" ? { distancia: CREMALLERA_A_ESQUINA, hasta: r1(alto - CREMALLERA_BAJO_CIMA) } : null,
      velcro: tipo === "VELCRO" ? { ancho: ANCHO_VELCRO } : null,
    };
  });
}
