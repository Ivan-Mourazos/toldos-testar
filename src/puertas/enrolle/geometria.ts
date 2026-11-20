// Geometría del rollo de una puerta enrollable. Traducción de las simulaciones de Codex (18/11/2026):
// la lona tensa se modela como el contorno de varios discos (tubo de enrolle y tubos ya enrollados) que crecen
// un grosor de lona por vuelta. Todo en mm y radianes.
export interface ConfigEnrolle { diametroEnrolle: number; diametroTubo: number; grosor: number; altoPerfil: number; anchoPerfil: number; conFunda?: boolean }
export const CONFIG_CODEX: ConfigEnrolle = { diametroEnrolle: 88.9, diametroTubo: 42, grosor: 0.8, altoPerfil: 0, anchoPerfil: 0 };
export interface Punto { x: number; y: number }
export interface TuboColocado extends Punto { marca: number; angulo: number }
export interface Pareja { i: number; j: number; separacion: number; donde: number }
interface Disco { x: number; y: number; base: number; inicio: number }
interface Apoyo extends Punto { a: number }
type Tramo =
  | { tipo: 'linea'; a: number; desde: Apoyo; inicio: number; fin: number }
  | { tipo: 'arco'; a: number; r: number; disco: Disco; inicio: number; fin: number };
/** Largo y marcas proyectados, con los tubos montados. */
export interface ModeloEnrolle { cfg: ConfigEnrolle; largo: number; marcas: number[]; tubos: TuboColocado[]; camino: Tramo[]; proyectar: (mm: number) => number; desplegar: (mm: number) => number }

const TAU = 2 * Math.PI, PRECISION = 0.02;
export const radioMedioTubo = (cfg: ConfigEnrolle) => (cfg.diametroTubo + cfg.grosor) / 2;
const medidas = (cfg: ConfigEnrolle) => {
  const tubo = cfg.diametroTubo / 2;
  const exterior = tubo + (cfg.conFunda ? cfg.grosor : 0);
  const mediaLona = cfg.grosor / 2;
  return { eje: cfg.diametroEnrolle / 2, exterior, desfase: exterior + mediaLona, crecimiento: cfg.grosor / TAU };
};

const identidad = (mm: number) => mm;

function proyectarLona(cfg: ConfigEnrolle, marcas: number[], largo: number) {
  if (!cfg.conFunda) return { marcas, largo, proyectar: identidad, desplegar: identidad };
  const medioArco = Math.PI * radioMedioTubo(cfg) / 2;
  const abultados: Array<{ desde: number; hasta: number }> = [];
  for (const marca of marcas) {
    const desde = Math.max(0, marca - medioArco), hasta = marca + medioArco;
    const anterior = abultados.at(-1);
    // Si dos tubos manuales se pisan, la proyección sigue siendo monótona y la revisión detecta el solape.
    if (anterior && desde <= anterior.hasta) anterior.hasta = hasta;
    else abultados.push({ desde, hasta });
  }
  const proyectar = (mm: number) => {
    const sobreTubos = abultados.reduce((suma, { desde, hasta }) => suma + Math.max(0, Math.min(mm, hasta) - desde), 0);
    return mm - (1 - 2 / Math.PI) * sobreTubos;
  };
  const desplegar = (avance: number) => {
    let mm = avance;
    for (const { desde, hasta } of abultados) {
      const sobreTubo = Math.min(Math.max(0, mm - desde) * Math.PI / 2, hasta - desde);
      mm += (1 - 2 / Math.PI) * sobreTubo;
    }
    return mm;
  };
  return { marcas: marcas.map(proyectar), largo: proyectar(largo), proyectar, desplegar };
}

function apoyo(d: Disco, a: number, g: number): Apoyo {
  const c = Math.cos(a), s = Math.sin(a), r = d.base + g * a;
  return { x: d.x + r * c - g * s, y: d.y + r * s + g * c, a };
}

function contorno(cfg: ConfigEnrolle, discos: Disco[], largo: number): Tramo[] {
  const { desfase, crecimiento: g } = medidas(cfg);
  const fin = largo / desfase + TAU, lista = [0, fin];
  for (let i = 1; i < discos.length; i++) {
    const d = discos[i];
    if (d.inicio < fin) lista.push(d.inicio);
    for (let k = 0; k < i; k++) {
      const p = discos[k];
      const dx = d.x - p.x, dy = d.y - p.y, sep = Math.hypot(dx, dy);
      if (!sep || Math.abs(p.base - d.base) > sep) continue;
      const dir = Math.atan2(dy, dx), medio = Math.acos((p.base - d.base) / sep), desde = Math.max(p.inicio, d.inicio);
      for (let lado = 0; lado < 2; lado++) {
        const raiz = lado ? dir + medio : dir - medio;
        for (let a = raiz + TAU * Math.ceil((desde - raiz) / TAU); a < fin; a += TAU) if (a > desde) lista.push(a);
      }
    }
  }
  // Ordenar como números en un array tipado es mucho más rápido que con una función de comparación.
  const eventos = Float64Array.from(lista).sort();
  const arcos: Array<{ a: number; b: number; disco: Disco }> = [];
  for (let i = 1; i < eventos.length; i++) {
    const a = eventos[i - 1], b = eventos[i];
    if (b - a < 1e-10) continue;
    const m = (a + b) / 2, c = Math.cos(m), s = Math.sin(m);
    let dueno = discos[0], alto = dueno.base;
    for (let k = 1; k < discos.length; k++) {
      const d = discos[k];
      if (m < d.inicio) continue;
      const h = d.base + d.x * c + d.y * s;
      if (h > alto) { dueno = d; alto = h; }
    }
    const ultimo = arcos.at(-1);
    if (ultimo && ultimo.disco === dueno) ultimo.b = b; else arcos.push({ a, b, disco: dueno });
  }
  const tramos: Tramo[] = [];
  let recorrido = 0, anterior: Apoyo | null = null;
  for (const { a, b, disco } of arcos) {
    const primero = apoyo(disco, a, g);
    if (anterior) {
      const tramo = Math.hypot(primero.x - anterior.x, primero.y - anterior.y);
      if (tramo > 1e-8) { tramos.push({ tipo: 'linea', a, desde: anterior, inicio: recorrido, fin: recorrido + tramo }); recorrido += tramo; }
      if (recorrido >= largo) break;
    }
    const r = disco.base + g * a, tramo = (b - a) * (r + g * (b - a) / 2);
    tramos.push({ tipo: 'arco', a, r, disco, inicio: recorrido, fin: recorrido + tramo });
    recorrido += tramo;
    if (recorrido >= largo) break;
    anterior = apoyo(disco, b, g);
  }
  return tramos;
}

function anguloEnArco(tramo: Extract<Tramo, { tipo: 'arco' }>, distancia: number, crecimiento: number): number {
  const { a, r } = tramo;
  return a + 2 * distancia / (r + Math.sqrt(r * r + 2 * crecimiento * distancia));
}

function en(cfg: ConfigEnrolle, camino: Tramo[], largo: number): Apoyo {
  const g = cfg.grosor / TAU; // el crecimiento de medidas(), sin crear el objeto en cada punto
  let lo = 0, hi = camino.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (camino[m].fin < largo) lo = m + 1; else hi = m; }
  const p = camino[lo], ds = largo - p.inicio;
  if (p.tipo === 'linea') return { x: p.desde.x - ds * Math.sin(p.a), y: p.desde.y + ds * Math.cos(p.a), a: p.a };
  return apoyo(p.disco, anguloEnArco(p, ds, g), g);
}

/** El perfil fleco abulta en la lona a partir de la vuelta siguiente. */
function discosIniciales(cfg: ConfigEnrolle): Disco[] {
  const { eje, crecimiento } = medidas(cfg);
  const discos: Disco[] = [{ x: 0, y: 0, base: eje + cfg.grosor / 2, inicio: 0 }];
  if (cfg.altoPerfil > 0 && cfg.anchoPerfil > 0) {
    const radioPerfil = cfg.anchoPerfil / 2;
    const inicio = Math.PI;
    discos.push({
      x: eje + cfg.altoPerfil - radioPerfil,
      y: 0,
      inicio,
      base: radioPerfil + cfg.grosor / 2 - crecimiento * inicio,
    });
  }
  return discos;
}

/**
 * Contornos ya calculados, por largo y marcas anteriores. Al buscar el reparto se prueban cientos de
 * colocaciones que solo cambian un tubo: los contornos de los tubos de delante no cambian y se reutilizan.
 * Solo vale para una misma configuración.
 */
export type MemoriaContornos = Map<string, Tramo[]>;

export function construir(cfg: ConfigEnrolle, marcasPlanas: number[], largoPlano = marcasPlanas.at(-1) ?? 0, memoria?: MemoriaContornos): ModeloEnrolle {
  const { marcas, largo, proyectar, desplegar } = proyectarLona(cfg, marcasPlanas, largoPlano);
  const { desfase, crecimiento: g } = medidas(cfg);
  const discos = discosIniciales(cfg), tubos: TuboColocado[] = [];
  let clave = String(largo);
  const calcular = () => {
    if (!memoria) return contorno(cfg, discos, largo);
    let camino = memoria.get(clave);
    if (!camino) { camino = contorno(cfg, discos, largo); memoria.set(clave, camino); }
    return camino;
  };
  let camino = calcular();
  for (const marca of marcas) {
    const p = en(cfg, camino, marca);
    const x = p.x + desfase * Math.cos(p.a), y = p.y + desfase * Math.sin(p.a);
    tubos.push({ x, y, marca, angulo: p.a });
    if (marca < largo) {
      // El tubo empieza a estorbar en la vuelta siguiente, por el lado contrario (Codex).
      // Por ambas caras, el disco de apoyo incluye un grosor de lona.
      const inicio = p.a + Math.PI;
      discos.push({ x, y, inicio, base: desfase - g * inicio });
      clave += ',' + marca;
      camino = calcular();
    }
  }
  return { cfg, largo, marcas, tubos, camino, proyectar, desplegar };
}

export function posicionLona(m: ModeloEnrolle, avance: number): Apoyo {
  return en(m.cfg, m.camino, avance);
}

function centroLibre(p: Apoyo, distancia: number, desfase: number, entrada: number, c: number, s: number): Punto {
  // Al llegar el bulto a la tangente, se levanta progresivamente hasta apoyar en la vuelta de debajo.
  const altura = entrada > 0 ? desfase * Math.max(0, 1 - distancia / entrada) : desfase;
  return { x: p.x + altura * c - distancia * s, y: p.y + altura * s + distancia * c };
}

export function centros(m: ModeloEnrolle, avance: number): Punto[] {
  const { desfase } = medidas(m.cfg), p = posicionLona(m, avance), c = Math.cos(p.a), s = Math.sin(p.a);
  const entrada = m.cfg.conFunda ? radioMedioTubo(m.cfg) : 0;
  return m.tubos.map(t => avance >= t.marca ? t : centroLibre(p, t.marca - avance, desfase, entrada, c, s));
}

/** Ángulo de apoyo de cada tubo respecto al perfil, en grados de 0 a 180. */
export function angulosAlPerfil(m: ModeloEnrolle): number[] {
  return m.tubos.map(t => {
    const angulo = ((t.angulo % TAU) + TAU) % TAU;
    return Math.min(angulo, TAU - angulo) * 180 / Math.PI;
  });
}

export function separacionFinal(m: ModeloEnrolle): Pareja {
  const diametro = 2 * medidas(m.cfg).exterior;
  let mejor: Pareja = { i: 0, j: 0, separacion: Infinity, donde: m.largo };
  for (let i = 0; i < m.tubos.length; i++) for (let j = i + 1; j < m.tubos.length; j++) {
    const a = m.tubos[i], b = m.tubos[j];
    const s = Math.hypot(a.x - b.x, a.y - b.y) - diametro;
    if (s < mejor.separacion) mejor = { i, j, separacion: s, donde: m.largo };
  }
  return mejor;
}

/** Antes de la primera marca ambos tubos avanzan juntos; tras la segunda quedan fijos. */
export function revisarCiclo(m: ModeloEnrolle): Pareja[] {
  const { desfase, exterior } = medidas(m.cfg), parejas: Pareja[] = [];
  const diametro = 2 * exterior;
  const entrada = m.cfg.conFunda ? radioMedioTubo(m.cfg) : 0;
  const iniciales = entrada > 0 ? centros(m, 0) : [];
  for (let i = 0; i < m.tubos.length; i++) for (let j = i + 1; j < m.tubos.length; j++) {
    const desde = m.marcas[i], hasta = m.marcas[j];
    const fijo = m.tubos[i], segundo = m.tubos[j];
    let mejor = entrada > 0 ? Math.hypot(iniciales[i].x - iniciales[j].x, iniciales[i].y - iniciales[j].y) - diametro : Infinity;
    let donde = entrada > 0 ? 0 : desde;
    const medir = (avance: number) => {
      // Entre las dos marcas solo se mueve el segundo tubo de la pareja.
      let q: Punto = segundo;
      if (avance < hasta) {
        const p = posicionLona(m, avance);
        q = centroLibre(p, hasta - avance, desfase, entrada, Math.cos(p.a), Math.sin(p.a));
      }
      const s = Math.hypot(fijo.x - q.x, fijo.y - q.y) - diametro;
      if (s < mejor) { mejor = s; donde = avance; }
      return s;
    };
    const afinar = (a: number, b: number, sa: number, sb: number, rMin: number) => {
      const subida = entrada > 0 && b > hasta - entrada ? desfase / entrada : 0;
      const ritmo = Math.hypot(hasta - a, desfase) / rMin + subida;
      if (Math.min(sa, sb) - ritmo * (b - a) / 2 >= mejor - PRECISION) return;
      const medio = (a + b) / 2, sm = medir(medio);
      afinar(a, medio, sa, sm, rMin); afinar(medio, b, sm, sb, rMin);
    };
    for (const t of m.camino) {
      const lo = Math.max(desde, t.inicio), hi = Math.min(hasta, t.fin);
      if (lo >= hi) continue;
      let a = lo, sa = medir(a);
      if (t.tipo === 'linea') {
        if (entrada > 0 && hi > hasta - entrada) afinar(a, hi, sa, medir(hi), Infinity);
        continue;
      }
      for (let b = Math.min(a + 12, hi); a < hi; b = Math.min(a + 12, hi)) {
        const sb = medir(b); afinar(a, b, sa, sb, t.r); a = b; sa = sb;
      }
    }
    parejas.push({ i, j, separacion: mejor, donde });
  }
  return parejas.sort((a, b) => a.separacion - b.separacion);
}

export function diametroFinal(m: ModeloEnrolle): number {
  const { eje, exterior, crecimiento } = medidas(m.cfg);
  const radioTubo = m.cfg.conFunda ? exterior : exterior + m.cfg.grosor;
  let radio = eje;
  for (const t of m.tubos) radio = Math.max(radio, Math.hypot(t.x, t.y) + radioTubo);

  const medir = (p: Punto) => Math.hypot(p.x, p.y) + m.cfg.grosor / 2;
  for (const tramo of m.camino) {
    if (tramo.inicio >= m.largo) break;
    const distancia = Math.min(tramo.fin, m.largo) - tramo.inicio;
    if (tramo.tipo === 'linea') {
      // El punto más alejado de un segmento está en uno de sus extremos.
      const { a, desde } = tramo;
      const fin = { x: desde.x - distancia * Math.sin(a), y: desde.y + distancia * Math.cos(a) };
      radio = Math.max(radio, medir(desde), medir(fin));
      continue;
    }

    const { a, disco } = tramo;
    const fin = anguloEnArco(tramo, distancia, crecimiento);
    radio = Math.max(radio, medir(apoyo(disco, a, crecimiento)), medir(apoyo(disco, fin, crecimiento)));
    const distanciaEje = Math.hypot(disco.x, disco.y);
    if (distanciaEje <= crecimiento) continue;
    // El último máximo radial del arco es el mayor porque la lona crece en cada vuelta.
    const maximo = Math.atan2(disco.y, disco.x) + Math.asin(crecimiento / distanciaEje);
    const angulo = maximo + TAU * Math.floor((fin - maximo) / TAU);
    if (angulo > a) radio = Math.max(radio, medir(apoyo(disco, angulo, crecimiento)));
  }
  return 2 * radio;
}
