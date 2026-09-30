import { construirEscena } from '../../remolques/escena/index.ts';
import type { ElementoEscena } from '../../remolques/escena/tipos.ts';
import { paginaHoja, type PaginaHojaDatos } from '../../remolques/hoja/pagina.ts';
import type { DatosHojaPedido } from '../../remolques/hoja/tipos.ts';
import { VISTAS_HOJA, type CapturaVista, type Capturador, type VistaHoja } from '../remolques/render/captura';
import { aPixeles, tamanoVista } from './medidas';

export interface HojaPreparada {
  pagina: PaginaHojaDatos;
  /** null si el elemento no tiene forma que dibujar (la hoja lo dice). */
  vistas: Record<VistaHoja, CapturaVista> | null;
}

/** Los textos y las cinco vistas de cada elemento, antes de pintar nada en la página. */
export function prepararHoja(datos: DatosHojaPedido, capturador: Capturador): HojaPreparada[] {
  const total = datos.elementos.length;
  return datos.elementos.map((elemento, indice) => {
    const pagina = paginaHoja(elemento, indice, total, datos.params);
    const escena = construirEscena({ tipo: elemento.tipo, input: elemento.input, res: elemento.result } as ElementoEscena, datos.params);
    if (!escena) return { pagina, vistas: null };
    const vistas = {} as Record<VistaHoja, CapturaVista>;
    for (const vista of VISTAS_HOJA) {
      const { ancho, alto } = tamanoVista(vista, pagina.ganchos != null);
      vistas[vista] = capturador.capturar(escena, vista, aPixeles(ancho), aPixeles(alto));
    }
    return { pagina, vistas };
  });
}
