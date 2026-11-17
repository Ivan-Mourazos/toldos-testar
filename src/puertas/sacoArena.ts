import type { AvisoPuerta, CortePuertas, PiezaPuerta, Puerta, ResultadoPuerta } from './tipos.ts';

// Planos recientes AR2602823, AR2604808 y AR2604933, estudiados por Oficina Técnica el 17/11/2026.
// Medidas en cm. La mitad incorpora 1 cm por cada extremo de la unión de 2 cm (docs/modelos/saco-arena.md).
export const REGLAS_SACO_ARENA = { soldadura: 3, aumentoAncho: 3, aumentoLargo: 13, empate: 2,
  material: 'TENTALU', color: 'PLATA/NEGRO', rollo: 300 } as const;
export const numeroSacoArena = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 3 });
const redondear = (n: number) => Math.round(n * 10000) / 10000;
export function medidasSacoArena(p: Pick<Puerta, 'frente' | 'alto'>) {
  const r = REGLAS_SACO_ARENA, confeccionado = redondear(2 * p.alto + r.soldadura);
  const largoCorte = redondear(p.frente + r.aumentoLargo);
  return { largo: p.frente, aplastado: p.alto, confeccionado, anchoCorte: redondear(confeccionado + r.aumentoAncho),
    largoCorte, largoMitad: redondear(largoCorte / 2 + r.empate / 2) };
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
    const dibujar = (largo: number, x: number, y: number, nombre: string, extremo?: 'inicio' | 'fin') => {
      const b = { ...pieza, id: `${pieza.id}:${nombre}`, nombre, ancho: largo / 10 };
      colocadas.push({ pieza: b, x, y, girada: false });
      for (const [x1, y1, x2, y2] of [[x, y, x + largo, y], [x + largo, y, x + largo, y + w], [x + largo, y + w, x, y + w], [x, y + w, x, y]]) entidades.lineas.push({ capa: 'DISCO1', x1, y1, x2, y2 });
      entidades.lineas.push({ capa: 'ROTULADOR', x1: x, y1: y + 30, x2: x + largo, y2: y + 30 });
      if (extremo) {
        const xe = extremo === 'fin' ? x + largo - 10 : x + 10;
        entidades.lineas.push({ capa: 'ROTULADOR', x1: xe, y1: y, x2: xe, y2: y + w });
        // Sin rótulos en la máquina (Iván, 17/11/2026): solo el mininúmero del empate, dentro de la pieza.
        entidades.textos.push({ capa: 'ROTULADOR', valor: '1', x: extremo === 'fin' ? xe - 25 : xe + 15, y: y + w / 2 - 5, h: 10 });
      }
    };
    dibujar(L, 0, 0, 'SIN EMPATE');
    const juntas = 2 * m.anchoCorte <= p.rollo;
    dibujar(M, xEmpate, 0, 'PARA EMPATAR 1/2', 'fin');
    dibujar(M, juntas ? xEmpate : xEmpate + M + 100, juntas ? w : 0, 'PARA EMPATAR 2/2', 'inicio');
    // La franja incluye ambas opciones separadas; nunca se mezcla con el anidado de puertas.
    return { material: pieza.material, anchoRollo: mm(p.rollo), largo: xEmpate + (juntas ? M : 2 * M + 100),
      opcion: 'principal', entidades, colocadas };
  });
}
