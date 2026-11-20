import { centros, posicionLona, radioMedioTubo, type ModeloEnrolle, type Punto } from '../../puertas/enrolle/geometria.ts';

type Apoyo = ReturnType<typeof posicionLona>;
type Centro = Punto & { a: number };
type Recorrido = (marca: number) => Apoyo;

function costado(centro: Centro, distancia: number) {
  return { x: centro.x - distancia * Math.sin(centro.a), y: centro.y + distancia * Math.cos(centro.a) };
}

// Desde la costura, buscar la tangencia con el apoyo de ESTA vuelta. El límite
// entre dos bultos evita que la búsqueda salte a otro tubo o a otra revolución.
function contacto(punto: Recorrido, centro: Punto, radio: number, inicio: number, fin: number, paso: number) {
  const margen = (marca: number) => {
    const p = punto(marca);
    return (centro.x - p.x) * Math.cos(p.a) + (centro.y - p.y) * Math.sin(p.a) + radio;
  };
  let anterior = inicio;
  const pasos = Math.max(1, Math.ceil(Math.abs(fin - inicio) / paso));
  for (let i = 1; i <= pasos; i++) {
    let actual = inicio + (fin - inicio) * i / pasos;
    if (margen(actual) <= 0) {
      for (let n = 0; n < 12; n++) {
        const medio = (anterior + actual) / 2;
        if (margen(medio) > 0) anterior = medio;
        else actual = medio;
      }
      return actual;
    }
    anterior = actual;
  }
  return fin;
}

interface Lado { inicio: number; contacto: number; fin: number; signo: number }

function reconstruirLado(lado: Lado, t: Centro, radio: number, punto: Recorrido, avance: number, paso: number): Punto[] {
  const { signo, contacto, fin } = lado;
  const junta = costado(t, signo * radio);
  const apoyo = punto(contacto);
  const puntos = [junta];
  // La lona sale de la semicircunferencia interior por la tangente de la costura
  // y recupera la tangente común entre tubo y apoyo. Su intersección guía la curva.
  const nx = Math.cos(apoyo.a), ny = Math.sin(apoyo.a);
  const cx = Math.cos(t.a), cy = Math.sin(t.a);
  const proyeccion = cx * nx + cy * ny;
  const altura = Math.abs(proyeccion) < 1e-6 ? 0 : ((apoyo.x - junta.x) * nx + (apoyo.y - junta.y) * ny) / proyeccion;
  const h = Math.max(0, Math.min(radio, altura));
  const control = { x: junta.x + h * cx, y: junta.y + h * cy };
  const largo = Math.hypot(apoyo.x - junta.x, apoyo.y - junta.y);
  const pasos = Math.max(1, Math.ceil((largo + h) / paso));
  for (let k = 1; k <= pasos; k++) {
    const u = k / pasos, v = 1 - u;
    puntos.push({
      x: v*v*junta.x + 2*v*u*control.x + u*u*apoyo.x,
      y: v*v*junta.y + 2*v*u*control.y + u*u*apoyo.y,
    });
  }
  // En el tramo libre basta un segmento hasta la tangente.
  const tangente = Math.max(Math.min(fin, contacto), Math.min(avance, Math.max(fin, contacto)));
  const n = Math.ceil(Math.abs(tangente - (signo > 0 ? contacto : fin)) / paso);
  if (signo < 0 && tangente < contacto) puntos.push(punto(tangente));
  for (let k = 1; k <= n; k++) {
    const desde = signo > 0 ? contacto : tangente;
    puntos.push(punto(desde + ((signo > 0 ? tangente : fin) - desde) * k / n));
  }
  if (signo > 0 && tangente < fin) puntos.push(punto(fin));
  return puntos;
}

export function prepararTrayectoria(modelo: ModeloEnrolle, extension = 0) {
  const pasos = Math.max(1, Math.min(50000, Math.ceil(modelo.largo / 2)));
  const paso = modelo.largo / pasos;
  const muestras = Array.from({ length: pasos + 1 }, (_, i) => posicionLona(modelo, i * paso));
  const enrollada: Recorrido = marca => {
    if (marca >= modelo.largo) {
      const fin = muestras[pasos];
      return { ...costado(fin, marca - modelo.largo), a: fin.a };
    }
    const indice = Math.max(0, marca / paso), i = Math.min(pasos - 1, Math.floor(indice));
    const p = muestras[i], q = muestras[i + 1], f = indice - i;
    return { x: p.x + f * (q.x - p.x), y: p.y + f * (q.y - p.y), a: p.a + f * (q.a - p.a) };
  };
  const radio = radioMedioTubo(modelo.cfg);
  const lados = modelo.tubos.map((t, i) => [-1, 1].map(signo => {
    const vecino = modelo.marcas[i + signo];
    const fin = vecino === undefined ? (signo < 0 ? 0 : modelo.largo + extension) : (vecino + t.marca) / 2;
    const inicio = t.marca + signo * radio;
    const centro = { ...t, a: t.angulo };
    const marcaContacto = contacto(enrollada, centro, radio, inicio, fin, paso);
    const lado = { inicio, fin, contacto: marcaContacto, signo };
    return { ...lado, enrollado: reconstruirLado(lado, centro, radio, enrollada, modelo.largo, paso) };
  }));
  return { modelo, enrollada, lados, paso, radio };
}

export function fotograma(trayectoria: ReturnType<typeof prepararTrayectoria>, avance: number) {
  const { modelo, enrollada, radio, paso } = trayectoria;
  const apoyo = posicionLona(modelo, avance);
  const tubos = centros(modelo, avance).map((p, i) => ({
    ...p, a: modelo.marcas[i] <= avance ? modelo.tubos[i].angulo : apoyo.a,
  }));
  const punto: Recorrido = marca => marca < avance ? enrollada(marca) : { ...costado(apoyo, marca - avance), a: apoyo.a };
  const lados = trayectoria.lados.map((par, i) => par.map(lado => {
    const marca = modelo.marcas[i];
    if (marca === modelo.largo && lado.signo > 0) {
      return [costado(tubos[i], radio), costado(tubos[i], lado.fin - marca)];
    }
    if (avance >= Math.min(modelo.largo, Math.max(marca, lado.fin, lado.inicio))) return lado.enrollado;
    if (avance <= Math.min(marca - radio, lado.fin, lado.inicio)) return [costado(tubos[i], lado.signo * radio), punto(lado.fin)];
    return reconstruirLado(lado, tubos[i], radio, punto, avance, paso);
  }));
  return { apoyo, tubos, punto, lados };
}

type Trayectoria = ReturnType<typeof prepararTrayectoria>;

/**
 * El motor gira el rollo a ritmo constante. Entre dos bultos la lona va recta y
 * su ángulo no cambia: si la reproducción avanzara a mm constantes, el rollo se
 * quedaría quieto en cada tramo recto y luego giraría de golpe sobre el tubo.
 * Por eso la reproducción avanza por giro (0 a 1) y aquí se pasa a mm de avance.
 */
export function avancePorGiro({ modelo }: Trayectoria, giro: number) {
  const g = Math.max(0, Math.min(1, giro));
  const desde = posicionLona(modelo, 0).a, hasta = posicionLona(modelo, modelo.largo).a;
  const objetivo = desde + g * (hasta - desde);
  if (g <= 0) return 0;
  if (g >= 1) return modelo.largo;
  let lo = 0, hi = modelo.largo;
  for (let n = 0; n < 50; n++) {
    const medio = (lo + hi) / 2;
    if (posicionLona(modelo, medio).a < objetivo) lo = medio; else hi = medio;
  }
  return hi;
}

/** Giro (0 a 1) que corresponde a un avance, para seguir la reproducción desde la barra. */
export function giroPorAvance({ modelo }: Trayectoria, avance: number) {
  const desde = posicionLona(modelo, 0).a, hasta = posicionLona(modelo, modelo.largo).a;
  if (hasta <= desde) return avance >= modelo.largo ? 1 : 0;
  const a = posicionLona(modelo, Math.max(0, Math.min(modelo.largo, avance))).a;
  return Math.max(0, Math.min(1, (a - desde) / (hasta - desde)));
}

/** Primeros milímetros del propio paño, medidos por longitud de arco desde la costura. */
export function colasSoldadas(lona: Punto[], largo: number) {
  const cola = [lona[0]];
  let faltan = largo;
  for (let i = 1; i < lona.length && faltan > 0; i++) {
    const a = lona[i - 1], b = lona[i], dx = b.x - a.x, dy = b.y - a.y;
    const tramo = Math.hypot(dx, dy);
    if (faltan < tramo) {
      cola.push({ x: a.x + dx * faltan / tramo, y: a.y + dy * faltan / tramo });
      break;
    }
    cola.push(b);
    faltan -= tramo;
  }
  return cola;
}
