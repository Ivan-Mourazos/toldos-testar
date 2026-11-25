import { colocarTubos, type AjustesEnrolle, type Colocacion } from './enrolle/colocar.ts';
import { usaCotasCliente } from './clientes.ts';
import type { ConfigEnrolle } from './enrolle/geometria.ts';
import { sacoPuerta, sacoSoldadoEnEtTgm, sacoUtil } from './saco.ts';
import type { Puerta, ResultadoPuerta } from './tipos.ts';

export interface EnrolleTgm {
  cfg: ConfigEnrolle;
  ajustes: AjustesEnrolle;
  largo: number;
  conSaco: boolean;
  altoLona: number;
  anchoEt: number;
  cierreBajo: number;
  ultimoFijo?: boolean;
  colocacion: Colocacion;
}

const decima = (x: number) => Math.round(x * 10) / 10;
const positivo = (x: number) => Number.isFinite(x) && x > 0;

export const SOLDADURA_BASE_TGM = 5; // cm, referencia de cierreBajo y marcaCierre en la ficha

export function rotuloCierreTgm(p: Puerta) {
  if (!p.tgm || p.tgm.abajo === 'saco' || p.tgm.lona === 'rejilla') return null;
  const ancho = p.tgm.soldadura === undefined ? SOLDADURA_BASE_TGM : p.tgm.soldadura;
  return [p.tgm.abajo === 'envolvente' ? 'SOLDADURA COMPARTIDA' : 'SOLDADURA DEL CIERRE',
    ancho === null ? 'SIN MEDIDA' : `${(ancho * 10).toLocaleString('es-ES')} mm`] as const;
}

// Plano de Jaime en AR2605499 (Iván, 19/11/2026): en rejilla el tubo de abajo va en una E.T. sándwich de PVC
// cortada de 31 que pisa 5 cm la rejilla; el bajo terminado queda 13,3 por debajo de la raya de soldar.
export const SANDWICH_TGM = { corte: 31, solape: 5, terminado: 13.3 } as const;

/** Bajo de la rejilla TGM en cm: lo que cuelga el saco de PVC por debajo de la lona y dónde acaba el corte. */
export function abajoRejillaTgm(p: Puerta) {
  const t = p.tgm;
  if (t?.lona !== 'rejilla') return null;
  // Q-TGM14: el saco cuelga su medida útil y se corta de 31 + 2 × lo que cuelga (61 para un saco de 15).
  const colgado = t.abajo === 'saco' ? (sacoUtil(p) ?? 0) / 10 : t.abajo === 'envolvente' ? t.terminado ?? 0 : 0;
  const bajoLona = decima(colgado + SANDWICH_TGM.terminado - SANDWICH_TGM.solape);
  return { colgado, bajoLona, marca: SANDWICH_TGM.solape, corteSandwich: SANDWICH_TGM.corte,
    corteSaco: colgado > 0 ? decima(SANDWICH_TGM.corte + 2 * colgado) : null };
}

/** Cotas en cm desde el doblez del saco hasta la raya compartida con el cierre. */
export function envoltorioTgm(p: Puerta) {
  const t = p.tgm;
  if (t?.abajo !== 'envolvente' || t.lona === 'rejilla') return null;
  const terminado = t.terminado ?? 0;
  const soldadura = t.soldadura === undefined ? SOLDADURA_BASE_TGM : t.soldadura ?? 0;
  const bajoLona = terminado - (t.marcaCierre - t.cierreBajo);
  return { terminado, soldadura, alto: 2 * (terminado + soldadura), bajoLona,
    eje: bajoLona + t.diametroTubo / 20 };
}

export const BASTILLA_ARRIBA_TGM = 4.5;
// El aumento sube desde el borde terminado y la raya queda a esa misma distancia hacia dentro.
export const aumentoArribaTgm = (p: Puerta) => p.tgm?.arriba === 'bastilla'
  ? p.tgm.bastillaArriba === undefined ? BASTILLA_ARRIBA_TGM : p.tgm.bastillaArriba ?? 0
  : 3.5;

export const soldaduraEtTgm = (p: Puerta) => p.tgm?.ventanal || usaCotasCliente(p) ? p.tgm?.soldaduraEt ?? 0 : 0;
/** Rayas de soldadura en las E.T. (TGM con ventanal). Puertas genéricas las marca como Portanova: una raya en el
 * borde de la E.T. con su flecha, aunque lleve soldadura (Iván, 25/11/2026). */
export const rayasSoldaduraEtTgm = (p: Puerta) => usaCotasCliente(p) ? 0 : soldaduraEtTgm(p);

function medidasEnrolleTgm(p: Puerta) {
  const t = p.tgm;
  if (!t || ![p.frente, t.anchoEt].every(positivo)) return null;
  const manual = usaCotasCliente(p);
  if (!manual && (![t.altoHueco, t.diametroEnrolle, t.grosor].every(positivo)
    || !Number.isInteger(t.nTubos) || t.nTubos < 1)) return null;

  const altoLona = manual ? p.alto : t.altoTotal !== null && positivo(t.altoTotal) ? t.altoTotal : t.altoHueco + t.anadido;
  const rejilla = abajoRejillaTgm(p);
  // En rejilla el tubo de abajo siempre va en la E.T. sándwich, también con saco.
  const conSaco = !rejilla && t.abajo === 'saco';
  // El enrolle se cuenta desde la varilla. Con tubo abajo termina en el eje del tubo del cierre (Q-TGM04).
  const bajo = rejilla ? rejilla.colgado + t.diametroTubo / 20
    : conSaco ? sacoPuerta(p).rematado : (envoltorioTgm(p)?.eje ?? t.diametroTubo / 20);
  const largo = decima((altoLona - bajo) * 10);
  if (!positivo(largo)) return null;

  const sacoEnEt = sacoSoldadoEnEtTgm(p);
  const ultimoFijo = !conSaco || sacoEnEt;
  const marcaInferior = sacoEnEt ? decima(largo - t.anchoEt * 5) : largo;
  return { altoLona, largo, conSaco, ultimoFijo, marcaInferior };
}

/** Cotas entre ejes, desde el tubo inferior hasta el superior, en cm. */
export function marcasDesdeCotasTgm(p: Puerta, cotas: number[]): number[] | null {
  const m = medidasEnrolleTgm(p), t = p.tgm;
  if (!m || !t || (!usaCotasCliente(p) && cotas.length !== t.nTubos - 1) || cotas.length > 99 || !cotas.every(positivo)) return null;
  let marca = m.marcaInferior;
  const marcas = [marca, ...cotas.map(cota => (marca = decima(marca - cota * 10)))].reverse();
  return marcas[0] > 0 && marcas.every((x, i) => i === 0 || x > marcas[i - 1]) ? marcas : null;
}

/** Con saco, la cota de abajo ya va entre dos E.T.; sin saco (o en rejilla) el tubo de abajo va en el cierre. */
const tramosBajoCota = (p: Puerta) => p.tgm?.lona !== 'rejilla' && p.tgm?.abajo === 'saco' ? 1 : 0;

/** Tramo del ventanal (entre E.T., desde abajo) que corresponde a la cota «indice» de la hoja; null si no cabe. */
export function tramoVentanalDesdeCota(p: Puerta, indice: number): number | null {
  const tramo = indice + tramosBajoCota(p);
  return tramo >= 1 ? tramo : null;
}

/** Cota de la hoja en la que cae el ventanal, o null si no hay. */
export function cotaDelVentanalTgm(p: Puerta): number | null {
  const tramo = p.tgm?.ventanal?.tramo;
  return tramo ? tramo - tramosBajoCota(p) : null;
}

export function enrolleTgm(p: Puerta): EnrolleTgm | null {
  if (usaCotasCliente(p)) return null;
  const m = medidasEnrolleTgm(p), t = p.tgm;
  if (!m || !t) return null;
  const { altoLona, largo, conSaco, ultimoFijo, marcaInferior } = m;
  const { margen, desvio, altoPerfil, anchoPerfil, anguloPerfil } = t.ajustes;
  const cfg: ConfigEnrolle = {
    diametroEnrolle: t.diametroEnrolle, diametroTubo: t.diametroTubo, grosor: t.grosor, altoPerfil, anchoPerfil, conFunda: true,
  };
  const ajustes: AjustesEnrolle = { margen, desvio, anguloPerfil };
  // El último eje sigue el bajo. Si cambia el alto o el saco, conserva los pasos de la hoja.
  const guardadas = t.tubosManual;
  const manual = ultimoFijo && guardadas?.length === t.nTubos
    ? t.ventanal
      ? guardadas.map(x => decima(x + marcaInferior - guardadas.at(-1)!))
      : [...guardadas.slice(0, -1), marcaInferior]
    : guardadas;
  if (t.ventanal && (manual?.length !== t.nTubos || manual.some((x, i) =>
    !positivo(x) || x > largo || (i > 0 && x <= manual[i - 1])))) return null;
  const colocacion = colocarTubos(cfg, ajustes, { largo, nTubos: t.nTubos, conSaco, manual });
  const cierreBajo = aumentoCierreTgm(t);
  return { cfg, ajustes, largo, conSaco, ultimoFijo, altoLona, anchoEt: t.anchoEt, cierreBajo, colocacion };
}

const aumentoCierreTgm = (t: NonNullable<Puerta['tgm']>) =>
  t.cierreBajo + ((t.soldadura ?? SOLDADURA_BASE_TGM) - SOLDADURA_BASE_TGM);

export function derivarPuertaTgm(p: Puerta, enrolle = enrolleTgm(p)): Puerta | null {
  const t = p.tgm;
  if (!t) return null;
  if (enrolle) return puertaTgmDerivada(p, enrolle);
  if (!usaCotasCliente(p) || !t.cotasHoja) return null;
  const medidas = medidasEnrolleTgm(p);
  const marcas = marcasDesdeCotasTgm(p, t.cotasHoja);
  if (!medidas || !marcas) return null;
  return puertaTgmDerivada(p, { ...medidas, cierreBajo: aumentoCierreTgm(t), colocacion: { marcas } });
}

/** Puerta que se dibuja en el alzado: con TGM, las E.T. y el ventanal salen de las cotas o del enrolle. */
export function puertaParaAlzadoTgm(p: Puerta): Puerta {
  if (!p.tgm) return p;
  return derivarPuertaTgm(p) ?? { ...p, enrollable: { ...p.enrollable, sinVentanal: true } };
}

/** Configuración de la enrollable con los ejes de la hoja o los del simulador. */
export function puertaTgmDerivada(p: Puerta, e: Pick<EnrolleTgm, 'altoLona' | 'conSaco' | 'cierreBajo'> & {
  colocacion: Pick<Colocacion, 'marcas'>;
}): Puerta {
  const { anchoEt, diametroTubo, cierreBajo, marcaCierre, lona, ventanal: ventanalTgm } = p.tgm!;
  // El último tubo sin saco va en el cierre y no lleva E.T.
  const marcas = e.conSaco ? e.colocacion.marcas : e.colocacion.marcas.slice(0, -1);
  const rejilla = abajoRejillaTgm(p);
  const tramo = ventanalTgm?.tramo;
  const precision = tramo === undefined && !usaCotasCliente(p) ? decima : (x: number) => Math.round(x * 100) / 100;
  const tramoValido = tramo !== undefined && Number.isInteger(tramo) && tramo >= 1 && tramo < marcas.length;
  const inferior = tramoValido ? marcas.at(-tramo) : undefined;
  const superior = tramoValido ? marcas.at(-tramo - 1) : undefined;
  const ventanal = inferior !== undefined && superior !== undefined
    ? { T: precision(superior / 10), D: precision((inferior - superior) / 10), margen: usaCotasCliente(p) ? p.enrollable.margen : 0,
      ventanales: [], sinEtArriba: false, sinEtAbajo: false } : undefined;
  return {
    ...p,
    alto: e.altoLona,
    material: lona === 'rejilla' && ['LAC650', 'LAC900'].includes(p.material.trim().toUpperCase()) ? 'REJILLA' : p.material,
    ventanas: [],
    enrollable: {
      ...p.enrollable,
      ...ventanal,
      sinVentanal: !ventanal,
      ventanasPequenas: false,
      sinSaco: !e.conSaco,
      anchoEt,
      cierreBajo: e.conSaco || rejilla ? undefined : e.cierreBajo,
      marcaCierre: rejilla ? rejilla.marca : e.conSaco ? undefined : marcaCierre + (e.cierreBajo - cierreBajo),
    },
    entradas: marcas.map(marca => ({
      altura: precision(e.altoLona - marca / 10), diametro: diametroTubo, largo: p.frente, alto: anchoEt,
      huecos: [],
    })),
  };
}

export function calcularTgm(p: Puerta, calcularEnrollable: (p: Puerta) => ResultadoPuerta, enrolle?: EnrolleTgm | null): ResultadoPuerta {
  const vacio = (codigo: string, texto: string): ResultadoPuerta => ({
    version: 1, piezas: [], alternativasSaco: null, empates: [], uniones: [], bolsillo: null,
    avisos: [{ codigo, nivel: 'error', texto }],
  });
  const t = p.tgm;
  if (t?.arriba === 'bastilla') {
    if (!positivo(aumentoArribaTgm(p))) return vacio('TGM_BASTILLA_ARRIBA', 'Escribe cuánto mide la bastilla en «Bastilla de arriba».');
  } else if (t && !t.varilla) {
    return vacio('TGM_VARILLA', 'Elige la varilla de arriba: blanca (5,5) o negra (4,5).');
  }
  const manual = usaCotasCliente(p);
  if (t?.ventanal && (t.lona !== 'pvc' || (!manual && t.laterales === 'bastilla')))
    return vacio('TGM_VENTANAL', manual ? 'Selecciona lona de PVC para confeccionar el ventanal.'
      : 'El ventanal de lado a lado se confecciona en PVC con los laterales al corte.');
  // Iván, 25/11/2026: la hoja del cliente no dice si las E.T. se cierran; en Puertas genéricas es opcional.
  const soldaduraOpcional = manual && !positivo(soldaduraEtTgm(p));
  if (t && (t.ventanal || manual) && !soldaduraOpcional) {
    const soldadura = soldaduraEtTgm(p);
    if (!positivo(soldadura) || t.anchoEt - 2 * soldadura < t.diametroTubo / 10)
      return vacio('TGM_SOLDADURA_ET', 'Indica la soldadura de cada borde en «Soldadura de la E.T.» y deja hueco para el tubo entre las dos franjas.');
  }
  const e = enrolle === undefined ? enrolleTgm(p) : enrolle;
  const derivada = derivarPuertaTgm(p, e);
  if (!derivada) {
    if ((manual || t?.ventanal) && medidasEnrolleTgm(p))
      return vacio('TGM_COTAS_HOJA', 'Aplica las cotas de la hoja en E.T. y comprueba que los tubos caben entre la cabecera y el bajo.');
    return vacio('TGM_MEDIDAS', manual ? 'Revisa el frente, el alto terminado y el ancho de la E.T.'
      : 'Revisa el frente, el alto del hueco y de la lona, el número de tubos y las medidas del enrolle.');
  }
  if (t?.ventanal && derivada.enrollable.sinVentanal)
    return vacio('TGM_TRAMO_VENTANAL', 'Indica en qué tramo entre dos E.T. va el ventanal, contando desde abajo.');
  const r = calcularEnrollable(derivada);
  return e ? { ...r, avisos: [...e.colocacion.avisos, ...r.avisos] } : r;
}
