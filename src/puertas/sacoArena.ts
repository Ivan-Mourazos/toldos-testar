import type { AvisoPuerta, CortePuertas, PiezaPuerta, Puerta, ResultadoPuerta } from './tipos.ts';

// Planos recientes AR2602823, AR2604808 y AR2604933, estudiados por Oficina Técnica el 17/11/2026.
// Medidas en cm. Ancho (Iván, 17/11/2026): doblada, la lona da la medida pedida y se pisan 3 cm para cerrar; la marca
// de rotulador, a 3 cm del borde, es hasta donde llega el otro borde al soldar. Corte = 2 · aplastado + 3, sin más.
// La mitad incorpora 1 cm por cada extremo de la unión de 2 cm (docs/modelos/saco-arena.md).
export const REGLAS_SACO_ARENA = { soldadura: 3, aumentoLargo: 13, inicioLargo: 3, empate: 2,
  material: 'TENTALU', color: 'PLATA/NEGRO', rollo: 300 } as const;
export const numeroSacoArena = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 3 });
const redondear = (n: number) => Math.round(n * 10000) / 10000;
export function medidasSacoArena(p: Pick<Puerta, 'frente' | 'alto'>) {
  const r = REGLAS_SACO_ARENA, confeccionado = redondear(2 * p.alto + r.soldadura);
  const largoCorte = redondear(p.frente + r.aumentoLargo);
  return { largo: p.frente, aplastado: p.alto, confeccionado, anchoCorte: confeccionado,
    largoCorte, largoMitad: redondear(largoCorte / 2 + r.empate / 2) };
}

/**
 * Marcas de rotulador de una pieza, como las dibuja Iván (AR2604808, AR2604933): una raya a 3 cm del borde de arriba
 * (debajo quedan los cm confeccionados, arriba los 3 cm que se pisan) y rayas verticales donde empieza y acaba el largo
 * pedido: 3 cm al principio y 10 cm al final. Cada mitad lleva solo su extremo; el lado del empate va limpio.
 * Medidas en cm, origen abajo a la izquierda de la pieza: [x1, y1, x2, y2].
 */
export function marcasSacoArena(largoPieza: number, ancho: number, tramo: 'entero' | 'inicio' | 'fin') {
  const r = REGLAS_SACO_ARENA, y = ancho - r.soldadura, ini = r.inicioLargo, fin = largoPieza - (r.aumentoLargo - r.inicioLargo);
  const desde = tramo === 'fin' ? 0 : ini, hasta = tramo === 'inicio' ? largoPieza : fin;
  const rayas: Array<[number, number, number, number]> = [[desde, y, hasta, y]];
  if (tramo !== 'fin') rayas.push([ini, 0, ini, y]);
  if (tramo !== 'inicio') rayas.push([fin, 0, fin, y]);
  return rayas;
}

function piezaSaco(p: Puerta, id: string, largo: number, ancho: number): PiezaPuerta {
  return { id, nombre: id, clase: 'pano', ancho: largo, alto: ancho, cantidad: p.cantidad,
    material: `${p.material.trim()} ${p.color.trim()}`.trim(), rollo: p.rollo, of: p.of.trim() || 'SIN OF',
    contorno: [[0, 0], [largo, 0], [largo, ancho], [0, ancho]], marcas: [], textos: [], huecos: [], radio: 0 };
}

export function calcularSacoArena(p: Puerta): ResultadoPuerta {
  const avisos: AvisoPuerta[] = [], piezas: PiezaPuerta[] = [];
  const aviso = (codigo: string, texto: string, nivel: AvisoPuerta['nivel'] = 'error') => avisos.push({ codigo, texto, nivel });
  const positivo = (n: number) => Number.isFinite(n) && n > 0 && n <= 3000;
  if (!p.confirmada) aviso('MODELO', 'Falta marcar «Confirmado con el pedido»: revisa largo, aplastado, material y cara negra hacia fuera.');
  if (!positivo(p.frente) || !positivo(p.alto)) aviso('MEDIDAS', 'Faltan el largo y el aplastado del saco (en cm).');
  if (!Number.isInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > 50) aviso('CANTIDAD', 'La cantidad de sacos debe ser un entero entre 1 y 50.');
  if (!positivo(p.rollo)) aviso('ROLLO', 'Falta el ancho del rollo de restos (en cm).');
  if (!p.material.trim() || !p.color.trim()) aviso('MATERIAL', 'Faltan el material o el color del saco.');
  if (!p.of.trim() || p.of.trim().toUpperCase() === 'SIN OF') aviso('SIN_OF', 'Falta la OF: se puede revisar, pero no guardar los archivos de corte.', 'aviso');
  const resultado: ResultadoPuerta = { version: 1, piezas, avisos, alternativasSaco: null, empates: [], uniones: [], bolsillo: null };
  if (avisos.some(a => ['MEDIDAS', 'CANTIDAD', 'ROLLO'].includes(a.codigo))) return resultado;
  const m = medidasSacoArena(p), n = numeroSacoArena;
  if (m.anchoCorte > p.rollo) aviso('NO_CABE', `La pieza de ${n(m.anchoCorte)} cm de ancho no cabe en el rollo de ${n(p.rollo)} cm.`);
  else if (2 * m.anchoCorte > p.rollo) aviso('EMPATE_POR_SEPARADO', 'Las dos mitades no caben juntas a lo ancho del rollo: se colocan una a continuación de otra.', 'aviso');
  piezas.push(piezaSaco(p, 'Saco sin empate', m.largoCorte, m.anchoCorte));
  return resultado;
}

/** Ambas opciones en el mismo corte; el técnico elige una. Una muestra por OF, con repetición explícita. */
export function cortarSacosArena(sacos: Array<{ puerta: Puerta; pieza: PiezaPuerta }>): CortePuertas[] {
  return sacos.map(({ puerta: p, pieza }) => {
    const m = medidasSacoArena(p), mm = (n: number) => redondear(n * 10);
    const entidades: CortePuertas['entidades'] = { lineas: [], textos: [], arcos: [], circulos: [] };
    const colocadas: CortePuertas['colocadas'] = [];
    const w = mm(m.anchoCorte), L = mm(m.largoCorte), M = mm(m.largoMitad), xEmpate = L + 500;
    const dibujar = (largo: number, x: number, y: number, nombre: string, tramo: 'entero' | 'inicio' | 'fin') => {
      const b = { ...pieza, id: `${pieza.id}:${nombre}`, nombre, ancho: largo / 10 };
      colocadas.push({ pieza: b, x, y, girada: false });
      for (const [x1, y1, x2, y2] of [[x, y, x + largo, y], [x + largo, y, x + largo, y + w], [x + largo, y + w, x, y + w], [x, y + w, x, y]]) entidades.lineas.push({ capa: 'DISCO1', x1, y1, x2, y2 });
      for (const [x1, y1, x2, y2] of marcasSacoArena(largo / 10, w / 10, tramo)) entidades.lineas.push({ capa: 'ROTULADOR', x1: x + x1 * 10, y1: y + y1 * 10, x2: x + x2 * 10, y2: y + y2 * 10 });
      // Sin rótulos en la máquina (Iván, 17/11/2026): solo el mininúmero del empate, dentro de la pieza.
      if (tramo !== 'entero') entidades.textos.push({ capa: 'ROTULADOR', valor: '1', x: tramo === 'inicio' ? x + largo - 25 : x + 15, y: y + w / 2 - 5, h: 10 });
    };
    // Ordenado como en el plano (Iván, 17/11/2026): las dos mitades apiladas abajo, alineadas a la izquierda, y la
    // pieza sin empate encima, separada 50 cm para que se lean las cotas. Si no cabe todo a lo ancho del rollo, una opción a continuación de otra.
    const apiladas = 3 * w + 500 <= mm(p.rollo), juntas = 2 * m.anchoCorte <= p.rollo;
    if (apiladas) {
      dibujar(M, 0, 0, 'PARA EMPATAR 1/2', 'inicio');
      dibujar(M, 0, w, 'PARA EMPATAR 2/2', 'fin');
      dibujar(L, 0, 2 * w + 500, 'SIN EMPATE', 'entero');
    } else {
      dibujar(L, 0, 0, 'SIN EMPATE', 'entero');
      dibujar(M, xEmpate, 0, 'PARA EMPATAR 1/2', 'inicio');
      dibujar(M, juntas ? xEmpate : xEmpate + M + 100, juntas ? w : 0, 'PARA EMPATAR 2/2', 'fin');
    }
    // La franja incluye ambas opciones separadas; nunca se mezcla con el anidado de puertas.
    return { material: pieza.material, anchoRollo: mm(p.rollo), largo: apiladas ? Math.max(L, M) : xEmpate + (juntas ? M : 2 * M + 100),
      opcion: 'principal', entidades, colocadas };
  });
}
