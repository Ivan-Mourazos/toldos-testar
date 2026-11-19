import { colocarTubos, type AjustesEnrolle, type Colocacion } from './enrolle/colocar.ts';
import type { ConfigEnrolle } from './enrolle/geometria.ts';
import { sacoPuerta } from './saco.ts';
import type { Puerta, ResultadoPuerta } from './tipos.ts';

export interface EnrolleTgm {
  cfg: ConfigEnrolle;
  ajustes: AjustesEnrolle;
  largo: number;
  conSaco: boolean;
  altoLona: number;
  anchoEt: number;
  cierreBajo: number;
  colocacion: Colocacion;
}

const decima = (x: number) => Math.round(x * 10) / 10;
const positivo = (x: number) => Number.isFinite(x) && x > 0;

export const SOLDADURA_BASE_TGM = 5; // cm, referencia de cierreBajo y marcaCierre en la ficha

export function rotuloCierreTgm(p: Puerta) {
  if (!p.tgm || p.tgm.abajo === 'saco') return null;
  const ancho = p.tgm.soldadura === undefined ? SOLDADURA_BASE_TGM : p.tgm.soldadura;
  return [p.tgm.abajo === 'envolvente' ? 'SOLDADURA COMPARTIDA' : 'SOLDADURA DEL CIERRE',
    ancho === null ? 'SIN MEDIDA' : `${(ancho * 10).toLocaleString('es-ES')} mm`] as const;
}

/** Cotas en cm desde el doblez del saco hasta la raya compartida con el cierre. */
export function envoltorioTgm(p: Puerta) {
  const t = p.tgm;
  if (t?.abajo !== 'envolvente') return null;
  const terminado = t.terminado ?? 0;
  const soldadura = t.soldadura === undefined ? SOLDADURA_BASE_TGM : t.soldadura ?? 0;
  const bajoLona = terminado - (t.marcaCierre - t.cierreBajo);
  return { terminado, soldadura, alto: 2 * (terminado + soldadura), bajoLona,
    eje: bajoLona + t.diametroTubo / 20 };
}

export function enrolleTgm(p: Puerta): EnrolleTgm | null {
  const t = p.tgm;
  if (!t || ![t.altoHueco, p.frente, t.anchoEt, t.diametroEnrolle, t.grosor].every(positivo)
    || !Number.isInteger(t.nTubos) || t.nTubos < 1) return null;

  const altoLona = t.altoTotal !== null && positivo(t.altoTotal) ? t.altoTotal : t.altoHueco + t.anadido;
  const conSaco = t.abajo === 'saco';
  // El enrolle se cuenta desde la varilla. Con tubo abajo termina en el eje del tubo del cierre (Q-TGM04).
  const bajo = conSaco ? sacoPuerta(p).rematado : (envoltorioTgm(p)?.eje ?? t.diametroTubo / 20);
  const largo = decima((altoLona - bajo) * 10);
  if (!positivo(largo)) return null;

  const { margen, desvio, altoPerfil, anchoPerfil, anguloPerfil } = t.ajustes;
  const cfg: ConfigEnrolle = {
    diametroEnrolle: t.diametroEnrolle, diametroTubo: t.diametroTubo, grosor: t.grosor, altoPerfil, anchoPerfil, conFunda: true,
  };
  const ajustes: AjustesEnrolle = { margen, desvio, anguloPerfil };
  // También en manual, el cierre queda fijo aunque cambie el alto de la lona.
  const manual = !conSaco && t.tubosManual?.length === t.nTubos
    ? [...t.tubosManual.slice(0, -1), largo]
    : t.tubosManual;
  const colocacion = colocarTubos(cfg, ajustes, { largo, nTubos: t.nTubos, conSaco, manual });
  const cierreBajo = t.cierreBajo + ((t.soldadura ?? SOLDADURA_BASE_TGM) - SOLDADURA_BASE_TGM);
  return { cfg, ajustes, largo, conSaco, altoLona, anchoEt: t.anchoEt, cierreBajo, colocacion };
}

/** Configuración de la enrollable ciega con los ejes que ha colocado el simulador. */
export function puertaTgmDerivada(p: Puerta, e: EnrolleTgm): Puerta {
  const { anchoEt, diametroTubo, cierreBajo, marcaCierre, lona } = p.tgm!;
  // El último tubo sin saco va en el cierre y no lleva E.T.
  const marcas = e.conSaco ? e.colocacion.marcas : e.colocacion.marcas.slice(0, -1);
  return {
    ...p,
    alto: e.altoLona,
    material: lona === 'rejilla' && ['LAC650', 'LAC900'].includes(p.material.trim().toUpperCase()) ? 'REJILLA' : p.material,
    ventanas: [],
    enrollable: {
      ...p.enrollable,
      sinVentanal: true,
      ventanasPequenas: false,
      sinSaco: !e.conSaco,
      anchoEt,
      cierreBajo: e.conSaco ? undefined : e.cierreBajo,
      marcaCierre: e.conSaco ? undefined : marcaCierre + (e.cierreBajo - cierreBajo),
    },
    entradas: marcas.map(marca => ({
      altura: decima(e.altoLona - marca / 10), diametro: diametroTubo, largo: p.frente, alto: anchoEt,
      huecos: [],
    })),
  };
}

export function calcularTgm(p: Puerta, calcularEnrollable: (p: Puerta) => ResultadoPuerta): ResultadoPuerta {
  const e = enrolleTgm(p);
  if (!e) return {
    version: 1, piezas: [], alternativasSaco: null, empates: [], uniones: [], bolsillo: null,
    avisos: [{ codigo: 'TGM_MEDIDAS', nivel: 'error', texto: 'Revisa el frente, el alto del hueco y de la lona, el número de tubos y las medidas del enrolle.' }],
  };
  const r = calcularEnrollable(puertaTgmDerivada(p, e));
  return { ...r, avisos: [...e.colocacion.avisos, ...r.avisos] };
}
