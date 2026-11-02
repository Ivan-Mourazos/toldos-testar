import { findClienteBaqueton, type CalcParams } from "../calc/params.ts";
import { sinPosiciones, type RepartoLados } from "../calc/ollaos.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import type { FichaCliente, MedidaHabitual } from "./tipos.ts";

const r1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
export type MedidaHecha = NonNullable<MedidaHabitual["hecha"]>;
export interface OllaosAdaptados { origenes: string[]; hecha: MedidaHecha; referencia?: MedidaHecha; sinAdaptar?: string }
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

function referencia(m: MedidaHabitual, params: CalcParams, clienteEspecifico?: string): MedidaHecha | null {
  if (m.hecha) return m.hecha;
  if (m.hechaDudosa) return null;
  const d = m.tipo === "lona" ? params.demasiaLonaHecha : params.baquetonDemasiaFinal;
  const extras = findClienteBaqueton(params, clienteEspecifico ?? "GENERAL");
  return { largo: r1(m.largo + d + (m.tipo === "baqueton" ? extras.extraLargoFinal : 0)), ancho: r1(m.ancho + d + (m.tipo === "baqueton" ? extras.extraAnchoFinal : 0)) };
}

/** Exacta, o propuesta independiente por lado. «Siempre repartidos» impide cualquier aproximación. */
export function propuestaOllaos(ficha: FichaCliente, tipo: TipoPlanteamiento, input: MedidasEntrada, params: CalcParams): { ollaos: RepartoLados | null; origenes: string[]; referencia?: MedidaHecha; sinAdaptar?: string } | null {
  const medidas = (ficha.medidas ?? []).filter(m => m.tipo === tipo);
  const exacta = medidas.find(m => m.largo === input.largo && m.ancho === input.ancho);
  const hecha = hechaParaOllaos(tipo, input, params);
  if (exacta) {
    const ref = referencia(exacta, params, input.clienteEspecifico);
    const destino = (lado: keyof RepartoLados) => lado === "laterales" ? hecha.largo : lado === "atras" ? hecha.anchoAtras ?? hecha.ancho : hecha.ancho;
    const origen = (lado: keyof RepartoLados) => lado === "laterales" ? ref!.largo : lado === "atras" ? ref!.anchoAtras ?? ref!.ancho : ref!.ancho;
    const lados = ["laterales", "atras", "delante"] as const;
    if (ref && lados.every(lado => origen(lado) === destino(lado))) return { ollaos: exacta.ollaos, origenes: [] };
    if (ficha.ollaosRepartidos) return null;
    const sinAdaptar = (motivo: string) => ({ ollaos: null, origenes: [], sinAdaptar: motivo });
    if (!ref) return sinAdaptar(exacta.hechaDudosa!);
    const ollaos = sinPosiciones();
    for (const lado of lados) {
      if (!exacta.ollaos[lado].length) continue;
      const pos = origen(lado) === destino(lado) ? [...exacta.ollaos[lado]] : adaptarPosiciones(exacta.ollaos[lado], origen(lado), destino(lado));
      if (!pos) return sinAdaptar("El patrón guardado no permite adaptar todos sus lados");
      ollaos[lado] = pos;
    }
    return { ollaos, origenes: [`${fmt(exacta.largo)}×${fmt(exacta.ancho)}`], referencia: ref };
  }
  if (ficha.ollaosRepartidos) return null;
  const ollaos = sinPosiciones(), origenes = new Set<string>();
  for (const lado of ["laterales", "atras", "delante"] as const) {
    const eje = lado === "laterales" ? "largo" : "ancho";
    const medidaDestino = lado === "atras" && (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input[eje];
    const destino = lado === "atras" ? hecha.anchoAtras ?? hecha.ancho : hecha[eje];
    const candidatas = medidas.filter(m => m.ollaos[lado].length > 0 && cercaParaOllaos(m[eje], medidaDestino))
      .sort((a, b) => Math.abs(a[eje] - medidaDestino) - Math.abs(b[eje] - medidaDestino)
        || (Math.abs(a.largo - input.largo) + Math.abs(a.ancho - input.ancho)) - (Math.abs(b.largo - input.largo) + Math.abs(b.ancho - input.ancho)));
    for (const m of candidatas) {
      const ref = referencia(m, params, input.clienteEspecifico);
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
