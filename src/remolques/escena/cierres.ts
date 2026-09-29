import { excelRound } from "../calc/redondeo.ts";
import { findRecogida, type CalcParams } from "../calc/params.ts";
import { USAR_COLUMNA_ATRAS } from "../calc/lona.ts";
import type { LonaInput } from "../calc/lona.ts";
import {
  ANCHO_VELCRO, CREMALLERA_A_ESQUINA, CREMALLERA_BAJO_CIMA, DEMASIA_SIN_RECOGIDA, MARGEN_CIERRE, PASO_CIERRE,
} from "./constantes.ts";
import type { CierreEsquina, CuerpoLona, Esquina, Perfil2D, TipoCierre, Vec3 } from "./tipos.ts";

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

export function cierresLona(input: LonaInput, cuerpo: CuerpoLona, params: CalcParams): CierreEsquina[] {
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
    return {
      esquina, tipo,
      base: [lado * semi, 0, z],
      alto,
      haciaLateral: hacia,
      normal: [lado, 0, 0],
      oreja: conOreja ? orejaRecogida(params, nombre, cara) : 0,
      alturas: tipo === "GOMA" || tipo === "PUENTES" ? alturasCierre(alto) : [],
      cremallera: tipo === "CREMALLERA" ? { distancia: CREMALLERA_A_ESQUINA, hasta: r1(alto - CREMALLERA_BAJO_CIMA) } : null,
      velcro: tipo === "VELCRO" ? { ancho: ANCHO_VELCRO } : null,
    };
  });
}
