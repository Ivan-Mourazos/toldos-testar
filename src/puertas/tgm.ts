import { colocarTubos, type AjustesEnrolle, type Colocacion } from './enrolle/colocar.ts';
import type { ConfigEnrolle } from './enrolle/geometria.ts';
import { sacoPuerta, sacoUtil } from './saco.ts';
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

export function enrolleTgm(p: Puerta): EnrolleTgm | null {
  const t = p.tgm;
  if (!t || ![t.altoHueco, p.frente, t.anchoEt, t.diametroEnrolle, t.grosor].every(positivo)
    || !Number.isInteger(t.nTubos) || t.nTubos < 1) return null;

  const altoLona = t.altoTotal !== null && positivo(t.altoTotal) ? t.altoTotal : t.altoHueco + t.anadido;
  const rejilla = abajoRejillaTgm(p);
  // En rejilla el tubo de abajo siempre va en la E.T. sándwich, también con saco.
  const conSaco = !rejilla && t.abajo === 'saco';
  // El enrolle se cuenta desde la varilla. Con tubo abajo termina en el eje del tubo del cierre (Q-TGM04).
  const bajo = rejilla ? rejilla.colgado + t.diametroTubo / 20
    : conSaco ? sacoPuerta(p).rematado : (envoltorioTgm(p)?.eje ?? t.diametroTubo / 20);
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
  const rejilla = abajoRejillaTgm(p);
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
      cierreBajo: e.conSaco || rejilla ? undefined : e.cierreBajo,
      marcaCierre: rejilla ? rejilla.marca : e.conSaco ? undefined : marcaCierre + (e.cierreBajo - cierreBajo),
    },
    entradas: marcas.map(marca => ({
      altura: decima(e.altoLona - marca / 10), diametro: diametroTubo, largo: p.frente, alto: anchoEt,
      huecos: [],
    })),
  };
}

export function calcularTgm(p: Puerta, calcularEnrollable: (p: Puerta) => ResultadoPuerta): ResultadoPuerta {
  const vacio = (codigo: string, texto: string): ResultadoPuerta => ({
    version: 1, piezas: [], alternativasSaco: null, empates: [], uniones: [], bolsillo: null,
    avisos: [{ codigo, nivel: 'error', texto }],
  });
  // Iván, 19/11/2026: la web pregunta qué varilla lleva arriba.
  if (p.tgm && !p.tgm.varilla) return vacio('TGM_VARILLA', 'Elige la varilla de arriba: blanca (5,5) o negra (4,5).');
  const e = enrolleTgm(p);
  if (!e) return vacio('TGM_MEDIDAS', 'Revisa el frente, el alto del hueco y de la lona, el número de tubos y las medidas del enrolle.');
  const r = calcularEnrollable(puertaTgmDerivada(p, e));
  return { ...r, avisos: [...e.colocacion.avisos, ...r.avisos] };
}
