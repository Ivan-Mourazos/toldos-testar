import { findClienteBaqueton, DEFAULT_PARAMS, type CalcParams } from "../calc/params.ts";
import { sinPosiciones, type RepartoLados } from "../calc/ollaos.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import type { FichaCliente, MedidaHabitual } from "./tipos.ts";

const r1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
export type MedidaHecha = NonNullable<MedidaHabitual["hecha"]>;
export interface OllaosAdaptados { origenes: string[]; hecha: MedidaHecha }
interface MedidasEntrada { largo: number; ancho: number; anchoAtras?: number; demasiaLonaHecha?: number; clienteEspecifico?: string }

/** Límite prudente de propuesta, por lado: cinco cm y como máximo el 5 % de la medida original. */
export const cercaParaOllaos = (origen: number, destino: number) => origen > 0 && destino > 0
  && Math.abs(destino - origen) <= Math.min(5, origen * 0.05);

/** Mantiene los márgenes originales y estira los huecos; nunca invierte el convenio de los lados. */
export function adaptarPosiciones(pos: readonly number[], origen: number, destino: number): number[] | null {
  if (!Number.isFinite(origen) || !Number.isFinite(destino) || pos.length < 2
    || !pos.every((v, i) => Number.isFinite(v) && v > 0 && v < origen && (i === 0 || v > pos[i - 1]))) return null;
  const primero = pos[0], ultimo = destino - (origen - pos[pos.length - 1]);
  if (!(ultimo > primero)) return null;
  const escala = (ultimo - primero) / (pos[pos.length - 1] - primero);
  const estiradas = pos.map(v => r1(primero + (v - primero) * escala));
  const maximo = Math.max(...pos.slice(1).map((v, i) => v - pos[i])) + 0.5;
  const salida = [estiradas[0]];
  for (let i = 1; i < estiradas.length; i++) {
    const a = estiradas[i - 1], b = estiradas[i];
    const intervalos = Math.ceil(r1(b - a) / maximo);
    for (let k = 1; k <= intervalos; k++) salida.push(r1(a + (b - a) * k / intervalos));
  }
  return salida.every((v, i) => i === 0 || v > salida[i - 1]) ? salida : null;
}

export function hechaParaOllaos(tipo: TipoPlanteamiento, input: MedidasEntrada, params: CalcParams): MedidaHecha {
  if (tipo === "lona") {
    const d = input.demasiaLonaHecha ?? params.demasiaLonaHecha;
    return { largo: r1(input.largo + d), ancho: r1(input.ancho + d), anchoAtras: r1(((input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input.ancho) + d) };
  }
  const cli = findClienteBaqueton(params, input.clienteEspecifico ?? "GENERAL");
  return { largo: r1(input.largo + params.baquetonDemasiaFinal + cli.extraLargoFinal), ancho: r1(input.ancho + params.baquetonDemasiaFinal + cli.extraAnchoFinal) };
}

function referencia(m: MedidaHabitual, ficha: FichaCliente): MedidaHecha | null {
  if (m.hecha) return m.hecha;
  // Las referencias antiguas generales se tomaron con +1. Una ficha con otra demasía puede mezclar
  // periodos (NORTE: +1, +1,5, +2): sin la medida hecha de origen no se inventa su periodo.
  if (m.tipo === "lona" && ficha.demasiaLonaHecha !== undefined && ficha.demasiaLonaHecha !== DEFAULT_PARAMS.demasiaLonaHecha) return null;
  const d = m.tipo === "lona" ? DEFAULT_PARAMS.demasiaLonaHecha : DEFAULT_PARAMS.baquetonDemasiaFinal;
  return { largo: m.largo + d + (m.tipo === "baqueton" ? ficha.extrasBaqueton?.extraLargoFinal ?? 0 : 0), ancho: m.ancho + d + (m.tipo === "baqueton" ? ficha.extrasBaqueton?.extraAnchoFinal ?? 0 : 0) };
}

/** Exacta, o propuesta independiente por lado. «Siempre repartidos» impide cualquier aproximación. */
export function propuestaOllaos(ficha: FichaCliente, tipo: TipoPlanteamiento, input: MedidasEntrada, params: CalcParams): { ollaos: RepartoLados; origenes: string[] } | null {
  const medidas = (ficha.medidas ?? []).filter(m => m.tipo === tipo);
  const exacta = medidas.find(m => m.largo === input.largo && m.ancho === input.ancho);
  if (exacta) return { ollaos: exacta.ollaos, origenes: [] };
  if (ficha.ollaosRepartidos) return null;
  const hecha = hechaParaOllaos(tipo, input, params), ollaos = sinPosiciones(), origenes = new Set<string>();
  for (const lado of ["laterales", "atras", "delante"] as const) {
    const eje = lado === "laterales" ? "largo" : "ancho";
    const medidaDestino = lado === "atras" && (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input[eje];
    const destino = lado === "atras" ? hecha.anchoAtras ?? hecha.ancho : hecha[eje];
    const candidatas = medidas.filter(m => m.ollaos[lado].length > 0 && cercaParaOllaos(m[eje], medidaDestino))
      .sort((a, b) => Math.abs(a[eje] - medidaDestino) - Math.abs(b[eje] - medidaDestino)
        || (Math.abs(a.largo - input.largo) + Math.abs(a.ancho - input.ancho)) - (Math.abs(b.largo - input.largo) + Math.abs(b.ancho - input.ancho)));
    for (const m of candidatas) {
      const ref = referencia(m, ficha);
      if (!ref) continue;
      const origen = lado === "atras" ? ref.anchoAtras ?? ref.ancho : ref[eje];
      if (origen === destino) { ollaos[lado] = [...m.ollaos[lado]]; break; }
      const posiciones = adaptarPosiciones(m.ollaos[lado], origen, destino);
      if (!posiciones) continue;
      ollaos[lado] = posiciones;
      origenes.add(`${fmt(m.largo)}×${fmt(m.ancho)}`);
      break;
    }
  }
  return Object.values(ollaos).some(p => p.length) ? { ollaos, origenes: [...origenes] } : null;
}
