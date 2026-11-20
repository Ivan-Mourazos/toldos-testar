import type { AvisoPuerta } from '../tipos.ts';
import { angulosAlPerfil, construir, diametroFinal, revisarCiclo, separacionFinal, type ConfigEnrolle, type MemoriaContornos, type Pareja } from './geometria.ts';

export interface AjustesEnrolle {
  margen: number;
  desvio: number;
  anguloPerfil: number;
}
export interface DatosColocar {
  largo: number;
  nTubos: number;
  conSaco: boolean;
  manual?: number[] | null;
}
export interface Colocacion {
  marcas: number[];
  iguales: number[];
  parejas: Pareja[];
  angulos: number[];
  diametroFinal: number;
  desvioUsado: number;
  avisos: AvisoPuerta[];
}
const TRAMO_MINIMO = 50; // mm entre dos tubos o entre el último y el saco
const mm = (x: number) => Math.round(x).toLocaleString('es-ES');

export function repartoIgual(largo: number, nTubos: number, conSaco: boolean): number[] {
  const tramos = conSaco ? nTubos + 1 : nTubos;
  return Array.from({ length: nTubos }, (_, k) => {
    if (k + 1 === tramos) return largo;
    return Math.round(largo * (k + 1) / tramos * 10) / 10;
  });
}

interface Candidata {
  marcas: number[];
  separacion: number;
  sobrePerfil: boolean;
}

function compararFinal(a: Candidata, b: Candidata): number {
  return Number(a.sobrePerfil) - Number(b.sobrePerfil) || b.separacion - a.separacion;
}

// Cada tubo usa una base prima distinta de la secuencia de Halton para repartir bien los arranques.
function coordenadaHalton(muestra: number, base: number): number {
  let coordenada = 0;
  let peso = 1;
  for (let cifra = muestra; cifra > 0; cifra = Math.floor(cifra / base)) {
    peso /= base;
    coordenada += (cifra % base) * peso;
  }
  return coordenada;
}

function buscar(cfg: ConfigEnrolle, ajustes: AjustesEnrolle, datos: DatosColocar, iguales: number[], desvio: number, memoria: MemoriaContornos): Colocacion {
  const { largo, conSaco } = datos;
  const moviles = conSaco ? iguales.length : iguales.length - 1;
  if (moviles <= 0 || desvio === 0) return evaluar(cfg, ajustes, largo, iguales.slice(), iguales, desvio, memoria);

  const cache = new Map<string, Candidata>();
  const puntuar = (marcas: number[]): Candidata => {
    const clave = marcas.join(',');
    const previa = cache.get(clave);
    if (previa) return previa;

    const modelo = construir(cfg, marcas, largo, memoria);
    const candidata = {
      marcas,
      separacion: marcas.length < 2 ? 0 : separacionFinal(modelo).separacion,
      sobrePerfil: angulosAlPerfil(modelo).some(angulo => angulo < ajustes.anguloPerfil),
    };
    cache.set(clave, candidata);
    return candidata;
  };
  const pulir = (arranque: Candidata, pasoInicial: number, pasoMinimo = 1): Candidata => {
    let mejor = arranque;
    for (let paso = pasoInicial; paso >= pasoMinimo; paso /= 2) {
      let mejora = true;
      while (mejora) {
        mejora = false;
        for (let k = 0; k < moviles; k++) {
          for (const desplazamiento of [-paso, paso]) {
            const marca = mejor.marcas[k] + desplazamiento;
            const antes = mejor.marcas[k - 1] ?? 0;
            const despues = mejor.marcas[k + 1] ?? largo;
            if (Math.abs(marca - iguales[k]) > desvio || marca < antes + TRAMO_MINIMO || marca > despues - TRAMO_MINIMO) continue;

            const marcas = mejor.marcas.slice();
            marcas[k] = marca;
            const candidata = puntuar(marcas);
            if (compararFinal(candidata, mejor) < -1e-6) {
              mejor = candidata;
              mejora = true;
            }
          }
        }
      }
    }
    return mejor;
  };

  const pocosTubos = iguales.length <= 3;
  const tramosValidos = (marcas: number[]) =>
    marcas.every((marca, k) => marca - (marcas[k - 1] ?? 0) >= TRAMO_MINIMO)
    && (!conSaco || largo - marcas[marcas.length - 1] >= TRAMO_MINIMO);
  const arranqueIgual = tramosValidos(iguales) ? puntuar(iguales.slice()) : undefined;
  const arranques = new Set<Candidata>();
  if (arranqueIgual) arranques.add(arranqueIgual);

  const bases: number[] = [];
  for (let primo = 2; bases.length < moviles; primo++) {
    if (bases.every(base => primo % base !== 0)) bases.push(primo);
  }
  const limite = Math.floor(desvio);
  const muestras = pocosTubos ? 16 : 32;
  for (let i = 1; i <= muestras; i++) {
    const marcas = iguales.slice();
    for (let k = 0; k < moviles; k++) {
      let punto = coordenadaHalton(i, bases[k]);
      // En cadenas largas, probar arranques más alejados del reparto igual.
      if (!pocosTubos) punto = punto < 0.5 ? punto * 0.75 : 0.25 + punto * 0.75;
      marcas[k] += Math.floor(punto * (2 * limite + 1)) - limite;
    }
    if (tramosValidos(marcas)) arranques.add(puntuar(marcas));
  }

  const ordenadas = [...arranques].sort(compararFinal);
  if (!ordenadas.length) return evaluar(cfg, ajustes, largo, iguales.slice(), iguales, desvio, memoria);

  let pulidas: Candidata[];
  if (pocosTubos && arranqueIgual) {
    const alternativas = ordenadas.filter(c => c !== arranqueIgual).slice(0, 2);
    pulidas = [pulir(arranqueIgual, 50), ...alternativas.map(c => pulir(c, 8))];
  } else {
    const gruesas = ordenadas.slice(0, 4).map(c => pulir(c, 32, 16));
    pulidas = [...new Set(gruesas)].sort(compararFinal).slice(0, 3).map(c => pulir(c, 8));
  }

  // El mínimo de todo el enrollado decide entre las mejores al terminar el rollo.
  const [primera, ...finalistas] = [...new Set(pulidas)].sort(compararFinal).slice(0, 3);
  let mejor = evaluar(cfg, ajustes, largo, primera.marcas, iguales, desvio, memoria);
  for (const candidata of finalistas) {
    if (candidata.sobrePerfil !== primera.sobrePerfil) break;
    const resultado = evaluar(cfg, ajustes, largo, candidata.marcas, iguales, desvio, memoria);
    if ((resultado.parejas[0]?.separacion ?? Infinity) > (mejor.parejas[0]?.separacion ?? Infinity)) mejor = resultado;
  }
  return mejor;
}

function evaluar(cfg: ConfigEnrolle, ajustes: AjustesEnrolle, largo: number, marcas: number[], iguales: number[], desvioUsado: number, memoria?: MemoriaContornos): Colocacion {
  const modelo = construir(cfg, marcas, largo, memoria);
  const parejas = revisarCiclo(modelo);
  const angulos = angulosAlPerfil(modelo);
  const avisos: AvisoPuerta[] = [];
  const justa = parejas[0];
  if (justa && justa.separacion < ajustes.margen) {
    const separacion = justa.separacion.toLocaleString('es-ES', { maximumFractionDigits: 1 });
    avisos.push({
      codigo: 'TUBOS_SOLAPAN',
      nivel: 'error',
      texto: `Los tubos ${justa.i + 1} y ${justa.j + 1} quedan a ${separacion} mm al enrollar (mínimo ${mm(ajustes.margen)} mm). Cambia el número de tubos o el reparto.`,
    });
  }
  const encima = angulos.findIndex(angulo => angulo < ajustes.anguloPerfil);
  if (encima >= 0) {
    avisos.push({
      codigo: 'TUBO_SOBRE_PERFIL',
      nivel: 'error',
      texto: `El tubo ${encima + 1} cae encima del perfil fleco (${Math.round(angulos[encima])}°, mínimo ${mm(ajustes.anguloPerfil)}°).`,
    });
  }
  return { marcas, iguales, parejas, angulos, diametroFinal: diametroFinal(modelo), desvioUsado, avisos };
}

export function colocarTubos(cfg: ConfigEnrolle, ajustes: AjustesEnrolle, datos: DatosColocar): Colocacion {
  const { largo, nTubos, conSaco, manual } = datos;
  const { desvio } = ajustes;
  const iguales = repartoIgual(largo, nTubos, conSaco);
  if (manual?.length === nTubos) {
    const usado = Math.max(0, ...manual.map((marca, k) => Math.abs(marca - iguales[k])));
    return evaluar(cfg, ajustes, largo, manual, iguales, usado);
  }
  const memoria: MemoriaContornos = new Map();
  const dentro = buscar(cfg, ajustes, datos, iguales, desvio, memoria);
  if (!dentro.avisos.length) return dentro;
  // Si no cabe dentro del desvío, se prueba con el doble y se avisa para que lo decida el técnico.
  const ampliado = 2 * desvio;
  const fuera = buscar(cfg, ajustes, datos, iguales, ampliado, memoria);
  if (fuera.avisos.length) return dentro;
  fuera.avisos.push({
    codigo: 'DESVIO_EXCEDIDO',
    nivel: 'aviso',
    texto: `Para separar los tubos, algún tramo se aleja del reparto igual más de ${mm(desvio)} mm. Revisa las posiciones.`,
  });
  return fuera;
}
