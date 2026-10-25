import { anchoArial } from '../domain/corteLona/texto.js';
import type { AvisoPuerta, CortePuertas, EntidadesPuertas, PiezaPuerta, Puerta, ResultadoPuerta } from './tipos.ts';

// SYSTEM DOCK · lona perimetral de abrigo de muelle (docs/modelos/system-dock.md; Iván, 23/10/2026). Una pieza
// rectangular por lona: el largo + 1 (0,5 por extremo, «AL CORTE») y el ancho + 6,6 (3,3 por cada lado, con su
// varilla negra de 4,5). Siempre PVC G650 negro en rollo de 250. Sin rotulador ni REVÉS: en el corte, la medida
// y la OF de cada lona. Las lonas iguales van por tandas a lo ancho del rollo y la tanda repetida se dibuja una vez
// con «×N»; el técnico de la máquina la repite.
export const REGLAS_SYSTEM_DOCK = { largo: 1, ancho: 6.6, material: 'PVC G650', color: 'NEGRO', rollo: 250, maxUnidades: 500 } as const;

const n = (x: number) => Math.round(x * 10000) / 10000;
const mm = (x: number) => Math.round(x * 10000) / 1000;
const numero = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const positivo = (x: number) => Number.isFinite(x) && x > 0 && x <= 5000;
/** Medida del pedido, «1040 CM X 55 CM», como en los planteamientos a mano. */
export const medidaSystemDock = (p: Pick<Puerta, 'frente' | 'alto'>) => `${numero(p.frente)} CM X ${numero(p.alto)} CM`;

export function calcularSystemDock(p: Puerta): ResultadoPuerta {
  const piezas: PiezaPuerta[] = [], avisos: AvisoPuerta[] = [];
  const aviso = (codigo: string, texto: string, nivel: 'error' | 'aviso' = 'error') => avisos.push({ codigo, texto, nivel });
  const r: ResultadoPuerta = { version: 1, piezas, alternativasSaco: null, empates: [], uniones: [], bolsillo: null, avisos };
  if (!p.confirmada) aviso('MODELO', 'Falta marcar «Confirmado con el pedido»: comprueba las medidas con el pedido del cliente.');
  if (!positivo(p.frente) || !positivo(p.alto)) aviso('MEDIDAS', 'Faltan el largo y el ancho de la lona (en cm).');
  if (!Number.isInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > REGLAS_SYSTEM_DOCK.maxUnidades) {
    aviso('CANTIDAD', `La cantidad debe ser un entero entre 1 y ${REGLAS_SYSTEM_DOCK.maxUnidades}.`);
  }
  if (!positivo(p.rollo)) aviso('ROLLO', 'Falta el ancho del rollo de lona (en «Materiales y rollos»).');
  if (!p.material.trim() || !p.color.trim()) aviso('MATERIAL', 'Faltan el material o el color de la lona.');
  if (!p.of.trim() || p.of.trim().toUpperCase() === 'SIN OF') aviso('SIN_OF', 'Sin OF: se puede ver y revisar, pero no se guardan archivos hasta poner la OF.', 'aviso');
  if (avisos.some(a => ['MEDIDAS', 'CANTIDAD'].includes(a.codigo))) return r;
  const largo = n(p.frente + REGLAS_SYSTEM_DOCK.largo), ancho = n(p.alto + REGLAS_SYSTEM_DOCK.ancho);
  if (positivo(p.rollo) && ancho > p.rollo) aviso('NO_CABE', `La lona de ${numero(ancho)} cm de ancho de corte no cabe en el rollo de ${numero(p.rollo)} cm.`);
  piezas.push({ id: 'pano-0-Lona perimetral', nombre: 'Lona perimetral', clase: 'pano', ancho: largo, alto: ancho, cantidad: p.cantidad,
    material: `${p.material.trim()} ${p.color.trim()}`.trim(), rollo: p.rollo, of: p.of.trim() || 'SIN OF', radio: 0,
    contorno: [[0, 0], [largo, 0], [largo, ancho], [0, ancho]], marcas: [], textos: [], huecos: [] });
  return r;
}

/** Una tanda: lonas una encima de otra a lo ancho del rollo; `veces`, cuántas tandas iguales seguidas. */
export interface TandaSystemDock { lonas: Array<{ pieza: PiezaPuerta; medida: string }>; largo: number; veces: number }

/**
 * Tandas del rollo como en los planteamientos a mano (AR.26.04615: una 1270 y tres 1040 en una tanda de 246,4;
 * AR.26.00937: cuatro 1040 ×25). De la lona más larga a la más corta, se llena cada tanda hasta el ancho del rollo
 * y las tandas iguales seguidas se juntan en una con «×N».
 */
export function tandasSystemDock(lonas: Array<{ pieza: PiezaPuerta; medida: string }>, rolloCm: number): TandaSystemDock[] {
  const unidades = lonas.flatMap(l => Array.from({ length: l.pieza.cantidad }, () => l))
    .sort((a, b) => b.pieza.ancho - a.pieza.ancho || b.pieza.alto - a.pieza.alto || a.pieza.of.localeCompare(b.pieza.of));
  const tandas: TandaSystemDock[] = [];
  let actual: TandaSystemDock | null = null, ocupado = 0;
  for (const u of unidades) {
    if (!actual || ocupado + u.pieza.alto > rolloCm + 0.001) {
      actual = { lonas: [], largo: 0, veces: 1 }; tandas.push(actual); ocupado = 0;
    }
    actual.lonas.push(u); actual.largo = Math.max(actual.largo, u.pieza.ancho); ocupado += u.pieza.alto;
  }
  const clave = (t: TandaSystemDock) => t.lonas.map(l => l.pieza.id).join('|');
  return tandas.reduce<TandaSystemDock[]>((out, t) => {
    const previa = out.at(-1);
    if (previa && clave(previa) === clave(t)) previa.veces++;
    else out.push(t);
    return out;
  }, []);
}

/** Corte de la lona: cada tanda distinta una vez, con su «×N», la medida y la OF de cada lona. */
export function cortarSystemDock(lonas: Array<{ pieza: PiezaPuerta; medida: string }>): CortePuertas[] {
  if (!lonas.length) return [];
  const grupos = new Map<string, typeof lonas>();
  for (const l of lonas) {
    const k = JSON.stringify([l.pieza.material, l.pieza.rollo]);
    grupos.set(k, [...grupos.get(k) ?? [], l]);
  }
  return [...grupos.values()].map(grupo => {
    const rolloCm = grupo[0].pieza.rollo, rollo = mm(rolloCm);
    const entidades: EntidadesPuertas = { lineas: [], textos: [], arcos: [], circulos: [] };
    const colocadas: CortePuertas['colocadas'] = [];
    let x = 0, total = 0;
    for (const t of tandasSystemDock(grupo, rolloCm)) {
      let y = 0;
      for (const { pieza, medida } of t.lonas) {
        const w = mm(pieza.ancho), h = mm(pieza.alto);
        entidades.lineas.push({ capa: 'DISCO1', x1: x, y1: y, x2: x + w, y2: y }, { capa: 'DISCO1', x1: x + w, y1: y, x2: x + w, y2: y + h },
          { capa: 'DISCO1', x1: x + w, y1: y + h, x2: x, y2: y + h }, { capa: 'DISCO1', x1: x, y1: y + h, x2: x, y2: y });
        const alto = Math.min(120, h * .25, (w * .35) / anchoArial(medida, 1));
        entidades.textos.push({ capa: 'texto', x: x + w * .25, y: y + h / 2, h: alto, valor: medida, centrado: true },
          { capa: 'texto', x: x + w * .65, y: y + h / 2, h: alto, valor: pieza.of, centrado: true });
        colocadas.push({ pieza, x, y, girada: false });
        y += h;
      }
      if (t.veces > 1) entidades.textos.push({ capa: 'texto', x, y: rollo + 120, h: 150, valor: `TANDA ×${t.veces} · CORTAR ${t.veces} VECES` });
      x += mm(t.largo); total += t.largo * t.veces;
    }
    // Arriba, las unidades totales, para que el técnico de corte cuente las tandas (Iván, 23/10/2026).
    const unidades = grupo.reduce((s, l) => s + l.pieza.cantidad, 0);
    entidades.textos.push({ capa: 'texto', x: 0, y: rollo + 480, h: 150, valor: `UNIDADES TOTALES: ${unidades}` },
      { capa: 'texto', x: 0, y: rollo + 300, h: 100, valor: `${grupo[0].pieza.material} · CORTE · ${numero(total / 100)} M EN TOTAL` });
    return { material: grupo[0].pieza.material, anchoRollo: rollo, largo: x, opcion: 'principal' as const, entidades, colocadas };
  });
}
