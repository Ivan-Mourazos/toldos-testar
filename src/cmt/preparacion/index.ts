import { colorAci, colorVerdadero } from '../colorAci.ts';
import { leerDxf, number, value } from '../dxf.ts';
import { leerFuente } from '../fuente.ts';
import { quitarLeyendaWeb } from '../leyenda.ts';
import { conReservas } from '../reservas.ts';
import { descomponerMtext } from '../textos-cad.ts';
import type { Dxf, Duda, EntidadDxf } from '../tipos.ts';
import { asignarCapas, claveCapa, herramientaCapa, normalizarCapas, type CapaDesconocida } from './capas.ts';
import { cajaDudosa } from './cajaDudosa.ts';
import { descomponer, hornear, transformarPieza } from './hornear.ts';
import { cotasDelPlano, cotasParaVista, textoLimpio, tramosDelCorte, type CotaVista, type TramoCorte } from './lonasCorte.ts';
import { buscarMarcos, cajaDe, clasificar, esBorde, marcosWeb, toleranciaDe, unirMarcos } from './marco.ts';
import { escribirDxfLimpio } from './salida.ts';
import { aplicarSolapes, buscarSolapes, longitud, quitarRepetidos, type GrupoSolape } from './solapes.ts';
import type { Caja, Herramienta, Pieza } from './tipos.ts';
import { decidirEscala, LARGO_MAXIMO_MM } from './unidades.ts';

export interface DecisionesPreparacion { marco?: number; cruces?: 'incluir' | 'excluir'; capas?: Record<string, Herramienta>; solapes?: Record<string, string> }
export interface OpcionesPreparacion { origen: 'dwg' | 'dxf'; tabla: Record<string, Herramienta>; decisiones?: DecisionesPreparacion; rutaFuente?: string; sinTextos?: boolean; soloAnalisis?: boolean }
export interface Pendientes { marcos?: Caja[]; cruces?: number; capas?: CapaDesconocida[]; solapes?: GrupoSolape[] }
export interface ResultadoPreparacion {
  listo: boolean; dxf: string | null; escala: number | null; medidasMm: { ancho: number; alto: number } | null;
  planoWeb?: boolean;
  // Trozos de lona del corte con la cota que los mide y lo que pone dentro, para el aviso de stock.
  tramos?: TramoCorte[];
  pendientes: Pendientes; avisos: Duda[]; dudas: Duda[];
  // Líneas, arcos y textos del corte en mm, para la vista previa, con el color CSS que tienen en el plano
  // (sin color = tinta: el 7 de CAD, negro en fondo claro y blanco en oscuro).
  vista: (Pieza & { cruza?: boolean; color?: string })[];
  // Cotas del plano dentro del marco, en mm, para enseñarlas en la vista previa (no se cortan).
  cotas?: CotaVista[];
  capasNuevas: Record<string, Herramienta>; // decisiones de capa aplicadas, para guardar en la tabla
}

type PiezaVista = ResultadoPreparacion['vista'][number];
type DudaLocal = { duda: Duda; caja: Caja | null; capa: string };
const lado = (c: Caja) => Math.max(c.x1 - c.x0, c.y1 - c.y0);
const r2 = (v: number) => Math.round(v * 100) / 100;
const escalarCaja = (c: Caja, k: number): Caja => ({ x0: c.x0 * k, y0: c.y0 * k, x1: c.x1 * k, y1: c.y1 * k });
const escalarPieza = (p: PiezaVista, k: number): PiezaVista => transformarPieza(p, [k, 0, 0, k, 0, 0]);

function insunits(d: Dxf): number | undefined {
  const cab = d.sections.HEADER?.[0]?.pairs ?? [];
  const i = cab.findIndex(([c, v]) => c === 9 && v === '$INSUNITS');
  if (i < 0) return undefined;
  return cab[i + 1]?.[0] === 70 && cab[i + 1][1] !== '' ? Number(cab[i + 1][1]) : NaN;
}

/** Color de cada pieza como en ZWCAD: el suyo (verdadero o ACI) y, si es PorCapa o PorBloque, el de su capa. */
function coloreador(entidades: EntidadDxf[], d: Dxf) {
  const capas = normalizarCapas(d.layers), cache = new Map<number, string | undefined>();
  const deEntidad = (e: EntidadDxf | undefined) => {
    if (!e) return undefined;
    if (value(e, 420)) return colorVerdadero(number(e, 420));
    const propio = Math.abs(number(e, 62, 256));
    if (propio >= 1 && propio <= 255) return colorAci(propio);
    const capa = capas[claveCapa(value(e, 8).trim() || '0')];
    return capa ? colorAci(capa.color) : undefined;
  };
  const de = (id: string) => {
    const i = Number(/^e(\d+)/.exec(id)?.[1] ?? NaN);
    if (!cache.has(i)) cache.set(i, deEntidad(entidades[i]));
    return cache.get(i);
  };
  return (piezas: PiezaVista[]): PiezaVista[] => piezas.map(p => {
    const color = de(p.id);
    return color ? { ...p, color } : p;
  });
}

function expandirTextos(d: Dxf, o: OpcionesPreparacion, avisos: Duda[], errores: DudaLocal[]): EntidadDxf[] {
  if (o.sinTextos) return d.entities.filter(e => e.type !== 'TEXT' && e.type !== 'MTEXT');
  const ruta = o.rutaFuente ?? process.env.CMT_ARIAL_PATH ?? (process.platform === 'win32' ? 'C:/Windows/Fonts/arial.ttf' : undefined);
  let fuente: ReturnType<typeof leerFuente> | undefined;
  return d.entities.flatMap(e => {
    if (e.type !== 'MTEXT' || number(e, 67)) return [e];
    const capa = value(e, 8).trim() || '0', handle = value(e, 5);
    try {
      if (![10, 20, 40].every(c => value(e, c) !== '') || number(e, 40) <= 0 || !e.pairs.some(([c]) => c === 1 || c === 3)) {
        throw new Error('El MTEXT tiene datos incompletos o altura no positiva: corrígelo en ZWCAD');
      }
      if (!fuente) {
        try {
          if (!ruta) throw new Error();
          fuente = conReservas(leerFuente(ruta), {}, avisos);
        } catch {
          throw new Error('Falta la fuente Arial en el equipo que convierte: avisa al responsable o elige «sin textos»');
        }
      }
      if (number(e, 230, 1) < 0 || number(e, 210) || number(e, 220)) throw new Error('Hay un MTEXT reflejado o inclinado: descomponlo en ZWCAD');
      return descomponerMtext(e, d, fuente, avisos).map(t => ({
        ...t,
        pairs: [...t.pairs, ...([5, 8] as const).filter(c => !value(t, c)).map((c): [number, string] => [c, value(e, c)])],
        transformacion: t.transformacion ?? e.transformacion,
      }));
    } catch (error) {
      errores.push({ capa, caja: null, duda: { capa, handle, tipo: 'MTEXT', motivo: String((error as Error).message) } });
      return [];
    }
  });
}

function posicionDuda(c: Caja | null, m: Caja | undefined): 'dentro' | 'fuera' | 'cruza' {
  if (!c || !m) return 'dentro';
  const tol = toleranciaDe(m);
  if (c.x1 < m.x0 - tol || c.x0 > m.x1 + tol || c.y1 < m.y0 - tol || c.y0 > m.y1 + tol) return 'fuera';
  if (c.x0 >= m.x0 - tol && c.x1 <= m.x1 + tol && c.y0 >= m.y0 - tol && c.y1 <= m.y1 + tol) return 'dentro';
  return 'cruza';
}

function medidasDe(piezas: Pieza[]) {
  const c = cajaDe(piezas);
  return c ? { ancho: r2(c.x1 - c.x0), alto: r2(c.y1 - c.y0) } : null;
}

export function preparar(dxfTexto: string, o: OpcionesPreparacion): ResultadoPreparacion {
  const dec = o.decisiones ?? {};
  const tabla = normalizarCapas(o.tabla), decisionesCapas = normalizarCapas(dec.capas ?? {});
  const avisos: Duda[] = [], dudas: Duda[] = [], pendientes: Pendientes = {};
  const resultado: ResultadoPreparacion = { listo: false, dxf: null, escala: null, medidasMm: null, pendientes, avisos, dudas, vista: [], capasNuevas: {} };
  const noCorta = (capa: string) => herramientaCapa(capa, tabla, decisionesCapas) === 'NO_CORTAR';
  const afectaAlCorte = ({ duda, capa }: DudaLocal) => duda.tipo === 'INSERT' || !noCorta(capa);
  const vacio = () => {
    dudas.push({ motivo: 'No queda nada que cortar dentro del marco o del plano' });
    return resultado;
  };
  try {
    const d = leerDxf(dxfTexto);
    resultado.planoWeb = d.sections.BLOCKS?.some(e => e.type === 'BLOCK' && value(e, 2).trim().toUpperCase() === 'CAJETIN TGM')
      || d.entities.some(e => e.type === 'INSERT' && value(e, 2).trim().toUpperCase() === 'CAJETIN TGM');
    const leyenda = quitarLeyendaWeb(d);
    d.entities = leyenda.entidades;
    if (leyenda.quitada) avisos.push({ motivo: 'Se ha quitado la leyenda del bot o de oficina' });
    const dimensiones = d.entities.filter(e => e.type === 'DIMENSION');
    descomponer(d, avisos);
    const errores: DudaLocal[] = [];
    const originales = d.entities;
    const entidades = expandirTextos(d, o, avisos, errores);
    const h = hornear(entidades, d.styles);
    const conColor = coloreador(entidades, d);
    for (const aviso of h.avisos) avisos.push(aviso);
    for (const { indice, ...duda } of h.dudas) {
      errores.push({ duda, caja: cajaDudosa(entidades[indice]), capa: duda.capa ?? '0' });
    }

    const deLaWeb = marcosWeb(originales, h.piezas);
    resultado.planoWeb ||= deLaWeb.length > 0;
    const marcos = unirMarcos(buscarMarcos(h.piezas), deLaWeb);
    if (!marcos.length && o.origen === 'dwg') {
      dudas.push({ motivo: 'No hay marco del corte: dibuja un rectángulo en la capa 0 alrededor del corte o deja el recuadro CORTE de la web' });
      return resultado;
    }
    const marco = marcos.length === 1 ? marcos[0] : dec.marco === undefined ? undefined : marcos[dec.marco];
    const cajaEscala = marco ?? marcos.reduce<Caja | null>((mayor, caja) => !mayor || lado(caja) > lado(mayor) ? caja : mayor, null)
      ?? cajaDe(h.piezas.filter(p => !noCorta(p.capa)));
    if (!cajaEscala) {
      for (const error of errores) if (afectaAlCorte(error)) dudas.push(error.duda);
      return dudas.length ? resultado : vacio();
    }
    const escala = decidirEscala(o.origen, insunits(d), cajaEscala);
    if ('error' in escala) {
      dudas.push({ motivo: escala.error });
      return resultado;
    }
    const k = escala.factor;
    resultado.escala = k;
    avisos.push({ motivo: escala.motivo });

    const tol = marco ? toleranciaDe(marco) : 0;
    resultado.cotas = cotasParaVista(dimensiones, k,
      marco && { x0: marco.x0 - tol, y0: marco.y0 - tol, x1: marco.x1 + tol, y1: marco.y1 + tol });
    const capa0 = errores.filter(({ capa }) => capa === '0').length + h.piezas.filter(p => p.capa === '0'
      && !marcos.some(m => esBorde(p, m, toleranciaDe(m)))).length;
    if (capa0) avisos.push({ motivo: `Hay ${capa0} elementos en la capa 0 que no son el marco: no se cortan` });

    if (marcos.length > 1 && !marco) {
      pendientes.marcos = marcos.map(m => escalarCaja(m, k));
      resultado.vista = conColor(h.piezas.filter(p => !noCorta(p.capa)
        && marcos.some(m => clasificar(p, m, toleranciaDe(m)) !== 'fuera')).map(p => escalarPieza(p, k)));
      return resultado;
    }

    let cruces = 0;
    const incluir = (posicion: 'dentro' | 'fuera' | 'cruza') => {
      if (posicion === 'cruza') cruces++;
      return posicion !== 'fuera' && (posicion !== 'cruza' || dec.cruces !== 'excluir');
    };
    const elegibles: PiezaVista[] = [];
    for (const p of h.piezas) {
      if (noCorta(p.capa)) continue;
      const posicion = marco ? clasificar(p, marco, tol) : 'dentro';
      if (incluir(posicion)) elegibles.push(escalarPieza({ ...p, cruza: posicion === 'cruza' && !dec.cruces }, k));
    }
    const dudasIncluidas = errores.filter(error => afectaAlCorte(error) && incluir(posicionDuda(error.caja, marco)));
    if (cruces && !dec.cruces) pendientes.cruces = cruces;
    const simuladas: Pieza[] = dudasIncluidas.map(({ capa }, i) => ({ id: `d${i}`, capa, tipo: 'linea', a: { x: 0, y: 0 }, b: { x: 0, y: 0 } }));
    const asignadas = asignarCapas([...elegibles, ...simuladas], tabla, decisionesCapas, d.layers);
    if (asignadas.desconocidas.length) pendientes.capas = asignadas.desconocidas;
    const asignadasValidas = asignadas.piezas.filter(p => p.id.startsWith('e'));
    resultado.vista = conColor(asignadasValidas);
    resultado.medidasMm = medidasDe(asignadasValidas);
    if (pendientes.cruces || pendientes.capas) return resultado;
    for (const { duda } of dudasIncluidas) dudas.push(duda);
    if (dudas.length) return resultado;
    if (!asignadasValidas.length) return vacio();

    const unicas = quitarRepetidos(asignadasValidas);
    if (unicas.mm > 0.001) avisos.push({ motivo: `Se han quitado ${r2(unicas.mm).toLocaleString('es-ES')} mm de trazos repetidos` });
    const grupos = buscarSolapes(unicas.piezas), elegidos: Record<string, string> = {};
    for (const grupo of grupos) {
      const gana = dec.solapes?.[grupo.clave];
      if (gana && grupo.capas.includes(gana)) elegidos[grupo.clave] = gana;
      else (pendientes.solapes ??= []).push(grupo);
    }
    resultado.vista = conColor(unicas.piezas);
    resultado.medidasMm = medidasDe(unicas.piezas);
    if (pendientes.solapes) return resultado;

    const finales = aplicarSolapes(unicas.piezas, elegidos).filter(p => p.tipo === 'texto' || longitud(p) > 1e-6);
    resultado.medidasMm = medidasDe(finales);
    resultado.vista = conColor(finales);
    if (!finales.length) return vacio();
    resultado.tramos = tramosDelCorte(finales, h.piezas.flatMap(p => {
      if (p.tipo !== 'texto' || (marco && clasificar(p, marco, tol) === 'fuera')) return [];
      const q = escalarPieza(p, k);
      if (q.tipo !== 'texto') return [];
      const x = Number(q.pares.find(([c]) => c === 10)?.[1]), y = Number(q.pares.find(([c]) => c === 20)?.[1]);
      return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y, texto: textoLimpio(q.pares) }] : [];
    }), cotasDelPlano(dimensiones, k));
    if (Math.max(resultado.medidasMm?.ancho ?? 0, resultado.medidasMm?.alto ?? 0) > LARGO_MAXIMO_MM) {
      dudas.push({ motivo: 'Las piezas seleccionadas superan el tamaño máximo del corte. Revisa el marco y sus cruces.' });
      return resultado;
    }
    for (const capa of [...elegibles, ...simuladas].map(p => claveCapa(p.capa))) {
      if (Object.hasOwn(decisionesCapas, capa) && !herramientaCapa(capa, tabla)) resultado.capasNuevas[capa] = decisionesCapas[capa];
    }
    // También se recuerda el descarte explícito aunque sus elementos no lleguen a la vista.
    for (const p of h.piezas) {
      const capa = claveCapa(p.capa);
      if (decisionesCapas[capa] === 'NO_CORTAR' && !herramientaCapa(capa, tabla)
        && (!marco || clasificar(p, marco, tol) !== 'fuera')) resultado.capasNuevas[capa] = 'NO_CORTAR';
    }
    for (const { capa: original, caja } of errores) {
      const capa = claveCapa(original);
      if (decisionesCapas[capa] === 'NO_CORTAR' && !herramientaCapa(capa, tabla)
        && posicionDuda(caja, marco) !== 'fuera') resultado.capasNuevas[capa] = 'NO_CORTAR';
    }
    if (!o.soloAnalisis) resultado.dxf = escribirDxfLimpio(finales);
    resultado.listo = true;
    return resultado;
  } catch (error) {
    dudas.push({ motivo: error instanceof Error ? error.message : String(error) });
    return resultado;
  }
}
