import type { AvisoPuerta } from '../tipos.ts';
import { angulosAlPerfil, construir, diametroFinal, revisarCiclo, separacionFinal, type ConfigEnrolle, type Pareja } from './geometria.ts';

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

/** Busca, paso a paso, las marcas que más separan los tubos con el rollo terminado. */
function buscar(cfg: ConfigEnrolle, ajustes: AjustesEnrolle, datos: DatosColocar, iguales: number[], desvio: number): number[] {
  const moviles = datos.conSaco ? iguales.length : iguales.length - 1;
  const nota = (marcas: number[]) => {
    const modelo = construir(cfg, marcas, datos.largo);
    const encima = angulosAlPerfil(modelo).some(angulo => angulo < ajustes.anguloPerfil);
    const separacion = marcas.length < 2 ? 0 : separacionFinal(modelo).separacion;
    return separacion - (encima ? 1000 : 0);
  };
  let marcas = iguales.slice();
  let mejor = nota(marcas);
  for (let paso = 50; paso >= 1; paso /= 2) {
    let mejora = true;
    while (mejora) {
      mejora = false;
      for (let k = 0; k < moviles; k++) {
        for (const desplazamiento of [-paso, paso]) {
          const marca = marcas[k] + desplazamiento;
          const antes = marcas[k - 1] ?? 0;
          const despues = marcas[k + 1] ?? datos.largo;
          if (Math.abs(marca - iguales[k]) > desvio || marca < antes + TRAMO_MINIMO || marca > despues - TRAMO_MINIMO) continue;

          const candidatas = marcas.slice();
          candidatas[k] = marca;
          const puntuacion = nota(candidatas);
          if (puntuacion > mejor + 1e-6) {
            mejor = puntuacion;
            marcas = candidatas;
            mejora = true;
          }
        }
      }
    }
  }
  return marcas;
}

function evaluar(cfg: ConfigEnrolle, ajustes: AjustesEnrolle, largo: number, marcas: number[], iguales: number[], desvioUsado: number): Colocacion {
  const modelo = construir(cfg, marcas, largo);
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
  const dentro = evaluar(cfg, ajustes, largo, buscar(cfg, ajustes, datos, iguales, desvio), iguales, desvio);
  if (!dentro.avisos.length) return dentro;
  // Si no cabe dentro del desvío, se prueba con el doble y se avisa para que lo decida el técnico.
  const ampliado = 2 * desvio;
  const fuera = evaluar(cfg, ajustes, largo, buscar(cfg, ajustes, datos, iguales, ampliado), iguales, ampliado);
  if (fuera.avisos.length) return dentro;
  fuera.avisos.push({
    codigo: 'DESVIO_EXCEDIDO',
    nivel: 'aviso',
    texto: `Para separar los tubos, algún tramo se aleja del reparto igual más de ${mm(desvio)} mm. Revisa las posiciones.`,
  });
  return fuera;
}
