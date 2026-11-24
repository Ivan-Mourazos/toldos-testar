import { contiene } from './geometriaPlana.js';
import type { DesarrolloCal, MedidasCal, PiezaCal, PuntoCal, PrimitivaCal } from './medidas.ts';

export const CIERRES_TRASEROS = {
  SIN_RECOGIDA: 'Sin recogida trasera', GOMA_FRUNCIDA: 'Goma fruncida', CUERDA_FRUNCIDA: 'Cuerda fruncida',
  GOMA_OLLAOS: 'Goma por ollaos', OREJA: 'Con orejas', VELCRO: 'Con velcro', PUENTES: 'Con puentes',
} as const;

export const ZONAS_RECOGIDAS = { atras: 'Atrás', delante: 'Delante', mfi: 'Lateral MFI', mfd: 'Lateral MFD', puerta: 'Puerta' } as const;
type Zona = keyof typeof ZONAS_RECOGIDAS;
export const PIEZAS_CON_HEBILLA = ['Cuerpo', 'Morro', 'Frente', 'Trasero', 'Puerta'] as const;
type NombrePieza = typeof PIEZAS_CON_HEBILLA[number];

export interface VelcroGanado { anchoVelcro: number; color: string }
export interface TraseroGanado {
  ancho: number; alto: number; altoOreja: number; aguas: number; radio: number;
  oreja?: number; margenBajo: number; margenOreja?: number; margenSuperior: number; ollaos?: string;
}
export interface TrazadoGanado {
  /** Un punto por fila. La tercera columna opcional es la curvatura DXF hasta el siguiente punto. */
  corte: string;
  terminado: string;
  marcas: string;
  ollaos: string;
}
export interface RecogidasGanado {
  atras: keyof typeof CIERRES_TRASEROS;
  diametro?: number;
  salida?: number;
  marcaContinua?: boolean;
  sinPano?: boolean;
  alturaPuentes?: number;
  fueraLinea?: boolean;
  trasero?: TraseroGanado;
  velcro?: VelcroGanado;
  puerta?: { cierre: 'VELCRO' | 'PUENTES'; integrada?: boolean; solapas?: { largo: number; ancho: number }; anchoVelcro?: number; color?: string };
  recortes?: boolean;
  tira?: { largo: number; ancho: number };
  sujeciones?: Partial<Record<Zona, { pieza: NombrePieza; posiciones: string }>>;
  cintas?: Partial<Record<NombrePieza, string>>;
  trazados?: Partial<Record<'Cuerpo' | 'Morro' | 'Frente' | 'Trasero' | 'Puerta', TrazadoGanado>>;
}

export interface ReferenciaRecogida {
  pieza: NombrePieza;
  puntos: PuntoCal[];
  rotulo: string;
}
export const esFruncidoGanado = (r: RecogidasGanado) => r.atras === 'GOMA_FRUNCIDA' || r.atras === 'CUERDA_FRUNCIDA';
const fmt = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 3 });
const positivo = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
const noNegativo = (n: unknown): n is number => n === 0 || positivo(n);
const linea = (a: PuntoCal, b: PuntoCal) => ({ tipo: 'tramo' as const, a, b });
const circulo = (c: PuntoCal, r: number) => ({ tipo: 'ollao' as const, c, r });

export function filasGanado(valor: string, min: number, max = min): number[][] {
  if (typeof valor !== 'string') throw Error('Revisa las coordenadas de la recogida.');
  const filas = valor.split(/[\n;]/).filter(f => f.trim()).map(f => f.split('/').map(v => v.trim() ? Number(v.trim().replace(',', '.')) : NaN));
  if (filas.length > 500 || filas.some(f => f.length < min || f.length > max || f.some(v => !Number.isFinite(v)))) {
    throw Error('Revisa las coordenadas: separa los valores con / y las filas con salto de línea o punto y coma.');
  }
  return filas;
}

const mm = ([x, y]: number[]): PuntoCal => [x * 10, y * 10];
function contorno(rows: number[][]): { vertices: PuntoCal[]; bordes: PrimitivaCal[] } {
  if (rows.length < 3) throw Error('Un contorno cerrado necesita al menos tres puntos.');
  const vertices = rows.map(mm);
  const bordes = vertices.map((a, i) => {
    const b = vertices[(i + 1) % vertices.length], curva = rows[i][2] ?? 0;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.hypot(dx, dy) < 0.01 || Math.abs(curva) > 1) throw Error('Revisa los puntos repetidos y la curvatura de los contornos.');
    if (curva === 0) return linea(a, b);
    const f = (1 - curva * curva) / (4 * curva);
    const c: PuntoCal = [(a[0] + b[0]) / 2 - dy * f, (a[1] + b[1]) / 2 + dx * f];
    return { tipo: 'arco' as const, c, r: Math.hypot(a[0] - c[0], a[1] - c[1]), inicio: Math.atan2(a[1] - c[1], a[0] - c[0]), barrido: 4 * Math.atan(curva) };
  });
  const superficie = vertices.reduce((s, a, i) => {
    const b = vertices[(i + 1) % vertices.length], borde = bordes[i];
    const sector = borde.tipo === 'arco' ? borde.r ** 2 * (borde.barrido - Math.sin(borde.barrido)) : 0;
    return s + a[0] * b[1] - b[0] * a[1] + sector;
  }, 0);
  if (Math.abs(superficie) < 1) throw Error('El contorno debe encerrar una superficie.');
  return { vertices, bordes };
}

function trazadoPedido(nombre: NombrePieza, t: TrazadoGanado): PiezaCal {
  const perfil = contorno(filasGanado(t.corte, 2, 3));
  const terminado = contorno(filasGanado(t.terminado, 2, 3));
  const marcas = filasGanado(t.marcas, 4).map(f => linea(mm(f), mm(f.slice(2))));
  const ollaos = filasGanado(t.ollaos, 2).map(f => circulo(mm(f), 2.5));
  return { nombre, contorno: perfil.vertices, corte: perfil.bordes, terminado: terminado.vertices,
    bordeTerminado: terminado.bordes, marcas, ollaos };
}

function rectangulo(nombre: string, largo: number, ancho: number, doblez = 0): PiezaCal {
  const puntos = (d: number): PuntoCal[] => [[d, d], [largo * 10 - d, d], [largo * 10 - d, ancho * 10 - d], [d, ancho * 10 - d]];
  const c = puntos(0);
  const terminado = doblez ? puntos(doblez * 10) : undefined;
  return { nombre, contorno: c, corte: c.map((p, i) => linea(p, c[(i + 1) % c.length])), terminado, marcas: [], ollaos: [] };
}

function traseroOrejas(t: TraseroGanado): PiezaCal {
  const { ancho, alto, aguas, radio, altoOreja, margenBajo, margenSuperior } = t;
  const oreja = t.oreja ?? 10;
  const margenOreja = t.margenOreja ?? margenBajo;
  if (![ancho, alto].every(positivo) || ![margenBajo, margenOreja, margenSuperior, aguas, radio, altoOreja, oreja].every(noNegativo)) {
    throw Error('Revisa las medidas del paño trasero y sus añadidos.');
  }
  const hombro = alto - aguas;
  const angulo = Math.atan2(aguas, ancho / 2);
  const giro = Math.PI / 2 - angulo;
  const tangencia = hombro - radio * Math.tan(giro / 2);
  const subida = radio * (1 - Math.sin(angulo));
  if (tangencia <= 0 || !positivo(altoOreja) || altoOreja > tangencia + 0.05 || subida >= ancho / 2) {
    throw Error('El radio o la altura de las orejas no caben en el paño trasero.');
  }
  const dibujar = (bajo: number, lado: number, superior: number) => {
    const lateral = -superior, izq = -oreja - lado, der = ancho + oreja + lado;
    const r = radio + superior, cima = alto + superior / Math.cos(angulo);
    const cimaIzq = [radio - r * Math.sin(angulo), tangencia + r * Math.cos(angulo)];
    const bordeOreja = Math.min(altoOreja, tangencia);
    const ps: number[][] = [[izq, -bajo], [der, -bajo]];
    if (der !== ancho + superior) {
      ps.push([der, bordeOreja]);
      if (bordeOreja < tangencia) ps.push([ancho + superior, bordeOreja]);
    }
    ps.push([ancho + superior, tangencia, r ? Math.tan(giro / 4) : 0]);
    if (r) ps.push([ancho - cimaIzq[0], cimaIzq[1]]);
    if (aguas) ps.push([ancho / 2, cima]);
    if (r) ps.push([...cimaIzq, Math.tan(giro / 4)]);
    ps.push([lateral, tangencia]);
    if (izq !== lateral) ps.push([lateral, bordeOreja], [izq, bordeOreja]);
    return contorno(ps.filter((p, i) => i === 0 || p[0] !== ps[i - 1][0] || p[1] !== ps[i - 1][1]));
  };
  const corte = dibujar(margenBajo, margenOreja, margenSuperior), terminado = dibujar(0, 0, 0);
  const ollaos = filasGanado(t.ollaos ?? '', 2).map(f => circulo(mm(f), 2.5));
  if (ollaos.some(o => !contiene(o.c, corte.vertices))) throw Error('Hay ollaos fuera del paño trasero.');
  return { nombre: 'Trasero', contorno: corte.vertices, corte: corte.bordes, terminado: terminado.vertices, bordeTerminado: terminado.bordes, marcas: [], ollaos };
}

const velcro = ({ anchoVelcro, color }: Partial<VelcroGanado>) =>
  positivo(anchoVelcro) && typeof color === 'string' && color.trim()
    ? `velcro de ${fmt(anchoVelcro)} cm ${color.trim()} · BRAVO en la tapa por el revés · SUAVE por el derecho`
    : null;

export function aplicarRecogidas(g: DesarrolloCal, m: MedidasCal, r: RecogidasGanado): DesarrolloCal {
  const pendientes = [...g.pendientes], notas: string[] = [], referenciasRecogidas: ReferenciaRecogida[] = [];
  const piezas = [...g.piezas];
  const aplicarTrazado = (nombre: NombrePieza) => {
    const t = r.trazados?.[nombre];
    if (!t?.corte.trim() || !t.terminado.trim()) return false;
    const pieza = trazadoPedido(nombre, t);
    const i = piezas.findIndex(p => p.nombre === nombre);
    if (i < 0) piezas.push(pieza);
    else piezas[i] = pieza;
    return true;
  };
  if (!Object.hasOwn(CIERRES_TRASEROS, r.atras)) throw Error('Elige la recogida trasera.');
  if (esFruncidoGanado(r)) {
    if (m.fruncir <= 0 || m.fruncir >= m.recto) throw Error('El añadido para fruncir debe ser positivo y menor que el recto.');
    if ([r.diametro, r.salida].some(v => v !== undefined && !positivo(v))) throw Error('Indica un diámetro y una salida de canal mayores que cero.');
    const material = r.atras === 'GOMA_FRUNCIDA' ? 'Goma fruncida' : 'Cuerda fruncida';
    notas.push(`Atrás · ${material} · canal ${fmt(m.fruncir)} cm${r.diametro ? ` · Ø${fmt(r.diametro)} mm` : ''}${r.salida ? ` · salen ${fmt(r.salida)} cm por lado` : ''}`);
  } else {
    notas.push(`Atrás · ${CIERRES_TRASEROS[r.atras]}`);
    if (r.atras === 'PUENTES') {
      if (r.alturaPuentes !== undefined && !positivo(r.alturaPuentes)) throw Error('La altura de los puentes debe ser positiva.');
      notas.push('Puentes atrás · oreja en la orientación rectificada · puerta con ollaos por arriba');
      if (r.alturaPuentes || r.fueraLinea) notas.push(`Puentes atrás${r.alturaPuentes ? ` · a ${fmt(r.alturaPuentes)} cm` : ''}${r.fueraLinea ? ' · fuera de línea' : ''}`);
      const cuerpo = aplicarTrazado('Cuerpo'), trasero = aplicarTrazado('Trasero');
      if (!cuerpo || !trasero) pendientes.push('Puentes atrás: introduce los trazados rectificados del cuerpo y del paño trasero con sus rebajes y ollaos.');
    } else if (r.atras === 'GOMA_OLLAOS') {
      const nombre = r.sinPano ? 'Cuerpo' : 'Trasero';
      if (!aplicarTrazado(nombre) || !piezas.find(p => p.nombre === nombre)?.ollaos.length) {
        pendientes.push(`Indica el trazado de ${nombre.toLowerCase()} y los ollaos por los que pasa la goma trasera.`);
      }
    } else if (r.atras !== 'SIN_RECOGIDA') {
      if (!aplicarTrazado('Trasero')) {
        if (r.trasero?.ancho && r.trasero.alto) piezas.push(traseroOrejas(r.trasero));
        else pendientes.push('Indica las medidas del paño trasero.');
      }
      if (r.atras === 'VELCRO') {
        const acabado = velcro(r.velcro ?? {});
        if (acabado) notas.push(`Atrás · ${acabado}`);
        else pendientes.push('Indica el ancho y el color del velcro trasero.');
      }
    }
  }
  if (r.recortes) {
    if (r.atras !== 'PUENTES') throw Error('Los recortes con tira corresponden a la puerta trasera de puentes.');
    if (positivo(r.tira?.largo) && positivo(r.tira?.ancho)) piezas.push(rectangulo('Tira de la oreja inferior', r.tira.largo, r.tira.ancho));
    else pendientes.push('Indica el corte de la tira de la oreja inferior de la puerta trasera con recortes.');
  }
  if (r.puerta && m.puerta !== 'NINGUNA') {
    if (!['PUENTES', 'VELCRO'].includes(r.puerta.cierre)) throw Error('Elige el cierre de la puerta lateral.');
    const morro = aplicarTrazado('Morro');
    const revisada = morro && (r.puerta.integrada || aplicarTrazado('Puerta'));
    if (!revisada) pendientes.push(`Falta el trazado de la puerta ${m.puerta} con ${r.puerta.cierre.toLowerCase()} y sus ollaos.`);
    if (r.puerta.cierre === 'PUENTES') {
      notas.push(`Puerta ${m.puerta} · puentes · monta por arriba con ollaos`);
      const puerta = piezas.find(p => p.nombre === (r.puerta?.integrada ? 'Morro' : 'Puerta'));
      if (revisada && !puerta?.ollaos.length) pendientes.push(`Indica los ollaos de la puerta ${m.puerta} de puentes.`);
    }
    if (r.puerta.cierre === 'VELCRO') {
      const acabado = velcro(r.puerta);
      if (acabado) notas.push(`Puerta ${m.puerta} · ${acabado}`);
      else pendientes.push('Indica el ancho y el color del velcro de la puerta.');
      const s = r.puerta.solapas;
      if (s) {
        if (positivo(s.largo) && positivo(s.ancho)) {
          for (const n of [1, 2]) piezas.push(rectangulo(`Solapa puerta ${n}`, s.largo + 2, s.ancho + 2, 1));
          notas.push('Solapas de puerta · coser y doblar 1 cm alrededor');
        } else pendientes.push('Indica las medidas terminadas de las dos solapas.');
      }
    }
  }
  for (const nombre of ['Cuerpo', 'Morro', 'Frente'] as const) {
    if (nombre === 'Cuerpo' && (r.atras === 'PUENTES' || (r.atras === 'GOMA_OLLAOS' && r.sinPano))) continue;
    if (nombre === 'Morro' && r.puerta && m.puerta !== 'NINGUNA') continue;
    aplicarTrazado(nombre);
  }
  for (const [zona, s] of Object.entries(r.sujeciones ?? {})) {
    if (!s) continue;
    if (!Object.hasOwn(ZONAS_RECOGIDAS, zona) || !PIEZAS_CON_HEBILLA.includes(s.pieza)) throw Error('Revisa la zona y la pieza de las hebillas.');
    const p = piezas.find(p => p.nombre === s.pieza);
    const posiciones = filasGanado(s.posiciones, 3);
    if (!p || !posiciones.length) {
      pendientes.push(`${ZONAS_RECOGIDAS[zona as Zona]}: indica la pieza y posición de las hebillas.`);
      continue;
    }
    for (const [x, y, giro] of posiciones) {
      const a = giro * Math.PI / 180, c = Math.cos(a), s1 = Math.sin(a);
      const puntos: PuntoCal[] = [[-1, -5], [1, -5], [1, 5], [-1, 5]].map(([dx, dy]) => [(x + dx * c - dy * s1) * 10, (y + dx * s1 + dy * c) * 10]);
      referenciasRecogidas.push({ pieza: s.pieza, puntos, rotulo: 'CORREAS DE RECOLLER' });
    }
    notas.push(`${ZONAS_RECOGIDAS[zona as Zona]} · ${posiciones.length} hebillas de recogida en ${s.pieza.toLowerCase()}`);
  }
  for (const nombre of PIEZAS_CON_HEBILLA) {
    const filas = filasGanado(r.cintas?.[nombre] ?? '', 5);
    if (filas.length && !piezas.some(p => p.nombre === nombre)) {
      pendientes.push(`Falta la pieza ${nombre.toLowerCase()} donde se cose el velcro.`);
      continue;
    }
    for (const [x1, y1, x2, y2, ancho] of filas) {
      const largo = Math.hypot(x2 - x1, y2 - y1);
      if (!positivo(largo) || !positivo(ancho)) throw Error('Cada tramo de velcro necesita largo y ancho positivos.');
      const dx = -(y2 - y1) * ancho / (2 * largo), dy = (x2 - x1) * ancho / (2 * largo);
      referenciasRecogidas.push({ pieza: nombre, rotulo: 'VELCRO', puntos: [[x1 + dx, y1 + dy], [x2 + dx, y2 + dy], [x2 - dx, y2 - dy], [x1 - dx, y1 - dy]].map(mm) });
    }
  }
  return { ...g, piezas, pendientes, notasRecogidas: notas, referenciasRecogidas };
}
