import { excelRound } from "./redondeo.ts";
import { ajusteContorno, findRecogida, type CalcParams, type TipoPerfil } from "./params.ts";
import { calcOllaos, sinPosiciones, type ModoOllaos, type OllaosResult, type RepartoLados } from "./ollaos.ts";
import { ollaosSegunGanchos, sinReves, type LadosAlReves } from "./ganchos.ts";

// El paño trasero usa la columna DELANTE de la recogida, igual que el Excel
// (G11 y RPS D7). Confirmado por Iván el 2026-07-17: es el comportamiento
// deseado. El interruptor queda por si algún día cambia la regla.
export const USAR_COLUMNA_ATRAS = false;

export interface CabeceraInput {
  numeroPedido: string; version: string; cliente: string; revision: string;
  realizadoPor: string; fecha: string; fechaSalida: string;
  /** Orden de fabricación, introducida manualmente por oficina técnica. */
  ordenFabricacion?: string;
}

export interface LonaInput {
  cabecera: CabeceraInput;
  cantidad: number; largo: number; ancho: number;
  /** Ancho trasero si el remolque va sesgado; 0 o ausente = igual al delantero. */
  anchoAtras?: number;
  altoDelante: number; altoAtras: number;
  /** Caída desde la cumbrera hasta los hombros del perfil. */
  aguas?: number;
  /** Radio del arco de cumbrera (TIPO 03); 0 = pico vivo. */
  radioCumbrera?: number;
  /** Radio de los hombros (TIPO 03); 0 = esquina viva. */
  radioHombro?: number;
  /** Radio real de las esquinas superiores (TIPO 05); necesario para calcular el contorno. */
  radioEsquina?: number;
  /** Chaflán (TIPO 04): cara entre los dos vértices virtuales, no la pata; necesario para calcular el contorno. */
  chaflan?: number;
  /** Radio de la arista del chaflán contra la pared (TIPO 04); 0 = viva. */
  radioChaflanAbajo?: number;
  /** Radio de la arista del chaflán contra el techo (TIPO 04); 0 = viva. */
  radioChaflanArriba?: number;
  /** Contorno real del remolque, antes de añadir las bastillas y la demasía de curva. */
  contorno?: number;
  /** Contorno real en la punta de detrás, solo si el remolque es distinto detrás: el paño
   *  contorno se corta entonces en trapecio (CAD de Iván, 30/09/2026). */
  contornoAtras?: number;
  /** Campo histórico: contenía directamente la medida final de corte. */
  contornoScad?: number;
  /** Sin elegir hasta que el usuario decide: un perfil recto por defecto pasaría
   *  la validación entera sin que nadie haya mirado la forma. */
  tipoPerfil: TipoPerfil | "";
  /** "" = sin elegir. "NO" es una respuesta, no la ausencia de una. */
  recogeDelante: string; recogeAtras: string;
  /** null = sin elegir. false es «no lleva», que es una decisión distinta. */
  bastillaEnfundar: boolean | null;
  ventana: boolean | null;
  /** Medidas exteriores de la ventana en cm. */
  ventanaAncho?: number;
  ventanaAlto?: number;
  /** Solo se indica si va rotulado; el contenido no forma parte del
   *  planteamiento. null = sin elegir. */
  rotulacion: boolean | null;
  modoOllaos: ModoOllaos;
  pasoOllaos: number;
  /** Distancia del primer y último ollao al borde; por defecto la de los parámetros. */
  primerOllao?: number;
  ollaosManuales: { laterales: number[]; atras: number[]; delante: number[] };
  /** Con «SEGUN GANCHOS»: posiciones de los ganchos sobre el remolque, con el convenio de los ollaos. */
  ganchos?: RepartoLados;
  /** Lados que el pedido mide desde el otro extremo. */
  ganchosAlReves?: LadosAlReves;
  /** Con «SEGUN GANCHOS»: un ollao más en cada extremo, a `primerOllao` del borde. Ausente = sí. */
  ollaosExtremos?: boolean;
  material: string; observaciones: string;
}

export interface Pano {
  ancho: number; alto: number; etiqueta: string;
  /** Solo en el paño contorno de un remolque distinto detrás: la medida en la punta de detrás
   *  (`alto` es la de delante), porque se corta en trapecio. */
  altoAtras?: number;
}

export interface LonaResult {
  lonaHecha: { largo: number; ancho: number; anchoAtras: number };
  contornoIntroducido: number;
  ajusteContorno: number;
  contornoAjustado: number;
  /** Solo con el remolque distinto detrás: el contorno de detrás tal cual y con el mismo ajuste. */
  contornoAtrasIntroducido?: number;
  contornoAtrasAjustado?: number;
  panoDelantero: Pano; panoTrasero: Pano; panoContorno: Pano | null;
  ollaos: OllaosResult;
  reparto: { laterales: number[]; atras: number[]; delante: number[] };
  /** Solo con «SEGUN GANCHOS»: los ganchos ya sobre la lona hecha, para dibujarlos. */
  ganchos?: RepartoLados;
  metrosTela: number;
  recogeDelanteTexto: string; recogeAtrasTexto: string;
  notas: string[];
}

const r1 = (v: number) => excelRound(v, 1);

/** El remolque cambia de delante a detrás: otro ancho u otro alto (cero o ausente = igual). */
export function detrasDistinto(
  input: Pick<LonaInput, "ancho" | "anchoAtras" | "altoDelante" | "altoAtras">,
): boolean {
  return ((input.anchoAtras ?? 0) > 0 && input.anchoAtras !== input.ancho)
    || (input.altoAtras > 0 && input.altoAtras !== input.altoDelante);
}

export function calcLona(input: LonaInput, params: CalcParams): LonaResult {
  const recDel = findRecogida(params, input.recogeDelante);
  const recAtr = findRecogida(params, input.recogeAtras);

  const anchoAtras = (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input.ancho;
  const altoAtras = input.altoAtras > 0 ? input.altoAtras : input.altoDelante;
  const lonaHecha = {
    largo: r1(input.largo + params.demasiaLonaHecha),
    ancho: r1(input.ancho + params.demasiaLonaHecha),
    anchoAtras: r1(anchoAtras + params.demasiaLonaHecha),
  };

  const ajuste = ajusteContorno(params, input.tipoPerfil, {
    abajo: input.radioChaflanAbajo, arriba: input.radioChaflanArriba,
  });
  const contornoNuevo = Math.max(input.contorno ?? 0, 0);
  const contornoLegacy = Math.max(input.contornoScad ?? 0, 0);
  const usaContornoLegacy = input.contorno == null && contornoLegacy > 0;
  const contornoIntroducido = usaContornoLegacy
    ? r1(Math.max(contornoLegacy - ajuste, 0))
    : contornoNuevo;
  const contornoAjustado = usaContornoLegacy
    ? contornoLegacy
    : contornoIntroducido > 0
      ? r1(contornoIntroducido + ajuste)
      : 0;
  // Distinto detrás, el contorno cambia de una punta a otra y el paño se corta en trapecio: la
  // medida de detrás lleva el mismo ajuste. Si no, no se añade nada y el resultado queda igual.
  const sesgada = detrasDistinto(input);
  const contornoAtrasIntroducido = Math.max(input.contornoAtras ?? 0, 0);
  const contornoAtrasAjustado = contornoAtrasIntroducido > 0 ? r1(contornoAtrasIntroducido + ajuste) : 0;

  const panoDelantero: Pano = {
    ancho: r1(input.ancho + recDel.delante),
    alto: r1(input.altoDelante + params.demasiaAlto),
    etiqueta: "PAÑO DELANTERO",
  };
  const demasiaTrasera = USAR_COLUMNA_ATRAS ? recAtr.atras : recAtr.delante;
  // Hay recogidas cuya demasía ya cubre lo que el remolque crece detrás (los puentes de HPL,
  // CAD de Iván del 30/09/2026): su paño trasero se mide con el ancho de delante.
  const anchoPanoTrasero = recAtr.panoTraseroConAnchoDelante ? input.ancho : anchoAtras;
  const panoTrasero: Pano = {
    ancho: r1(anchoPanoTrasero + demasiaTrasera),
    alto: r1(altoAtras + params.demasiaAlto),
    etiqueta: "PAÑO TRASERO",
  };

  const demasiaContorno = input.bastillaEnfundar
    ? params.demasiaContornoEnfundar
    : params.demasiaContornoNormal;
  const panoContorno: Pano | null =
    contornoAjustado > 0
      ? {
          ancho: r1(input.largo + demasiaContorno + recDel.lateralSoloDelante + recAtr.lateralSoloAtras),
          alto: contornoAjustado,
          etiqueta: "PAÑO CONTORNO",
          ...(sesgada && contornoAtrasAjustado > 0 ? { altoAtras: contornoAtrasAjustado } : {}),
        }
      : null;

  const ollaos = calcOllaos(
    lonaHecha.largo, lonaHecha.ancho, input.pasoOllaos, params,
    input.primerOllao, lonaHecha.anchoAtras,
  );
  const segunGanchos = input.modoOllaos === "SEGUN GANCHOS"
    ? ollaosSegunGanchos({
        ganchos: input.ganchos ?? sinPosiciones(),
        alReves: input.ganchosAlReves ?? sinReves(),
        extremos: input.ollaosExtremos ?? true,
        distanciaExtremo: input.primerOllao ?? params.primerOllao,
        medidas: {
          laterales: { remolque: input.largo, hecha: lonaHecha.largo },
          atras: { remolque: anchoAtras, hecha: lonaHecha.anchoAtras },
          delante: { remolque: input.ancho, hecha: lonaHecha.ancho },
        },
      })
    : null;
  // Sin modo elegido no se reparte nada: enseñar un reparto plausible que
  // nadie ha confirmado es justo el fallo que este bloque corrige, y aquí
  // acabaría dibujado en la hoja de taller.
  const reparto = input.modoOllaos === ""
    ? { laterales: [], atras: [], delante: [] }
    : segunGanchos
      ? segunGanchos.ollaos
      : input.modoOllaos === "SEGUN SE INDICA"
        ? input.ollaosManuales
        : {
            laterales: ollaos.largo.posiciones,
            atras: ollaos.anchoAtras.posiciones,
            delante: ollaos.ancho.posiciones,
          };

  const metrosTela = panoContorno
    ? excelRound(
        (input.cantidad * (panoDelantero.ancho + panoTrasero.ancho + panoContorno.ancho)) / 100,
        2,
      )
    : 0;

  const notas: string[] = [];
  if (input.recogeDelante === "GOMA" || input.recogeAtras === "GOMA") {
    notas.push("GOMA: preparar orejas por lado.");
  }
  if (input.bastillaEnfundar) notas.push("Bastilla de enfundar: paño contorno con demasía 13.");
  if (input.ventana) {
    const medida = (input.ventanaAncho ?? 0) > 0 && (input.ventanaAlto ?? 0) > 0
      ? ` (${r1(input.ventanaAncho!)} × ${r1(input.ventanaAlto!)} cm)`
      : "";
    notas.push(`Ventana indicada${medida}: verificar en taller.`);
  }
  if (input.rotulacion) notas.push("Incluye rotulación.");

  return {
    lonaHecha, contornoIntroducido, ajusteContorno: ajuste, contornoAjustado,
    ...(sesgada ? { contornoAtrasIntroducido, contornoAtrasAjustado } : {}),
    panoDelantero, panoTrasero, panoContorno,
    ollaos, reparto, ...(segunGanchos ? { ganchos: segunGanchos.ganchos } : {}), metrosTela,
    recogeDelanteTexto: recDel.nombre,
    recogeAtrasTexto: recAtr.nombre,
    notas,
  };
}
