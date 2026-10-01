import { describe, expect, it } from 'vitest';
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { muestrasHoja, type CasoFixture } from '../../remolques/hoja/muestras.ts';
import { prepararPedidoHoja } from '../../remolques/hoja/pedido.ts';
import type { Capturador, VistaHoja } from '../remolques/render/captura';
import { aPixeles, NOTA_VISTA_MM, tamanoVista } from './medidas';
import { prepararHoja } from './prepararHoja';

function capturadorFalso() {
  const llamadas: Array<[VistaHoja, number, number]> = [];
  const reservas: number[] = [];
  const capturador: Capturador = {
    capturar: (_escena, vista, ancho, alto, reserva = 0) => {
      llamadas.push([vista, ancho, alto]);
      reservas.push(reserva);
      return { png: `data:image/png;base64,${vista}`, ancho, alto, cotas: null, rotulos: [] };
    },
    liberar: () => {},
  };
  return { capturador, llamadas, reservas };
}

const muestras = muestrasHoja(casos as CasoFixture[]);

describe('prepararHoja', () => {
  it('una hoja por elemento, en orden, con sus cinco vistas al tamaño de la hoja', () => {
    const { capturador, llamadas } = capturadorFalso();
    const hojas = prepararHoja(prepararPedidoHoja(muestras.varios, DEFAULT_PARAMS), capturador);
    expect(hojas.map((h) => h.pagina.titulo)).toEqual(['REMOLQUE · 1 DE 3', 'BAQUETÓN · 2 DE 3', 'REMOLQUE · 3 DE 3']);
    expect(llamadas).toHaveLength(15);
    const { ancho, alto } = tamanoVista('lateral', false);
    expect(llamadas[4]).toEqual(['lateral', aPixeles(ancho), aPixeles(alto)]);
    expect(Object.keys(hojas[0].vistas!)).toEqual(['tres-cuartos', 'tres-cuartos-detras', 'delante', 'detras', 'lateral']);
  });

  it('con «Según ganchos» captura las vistas al tamaño más pequeño', () => {
    const { capturador, llamadas } = capturadorFalso();
    const [hoja] = prepararHoja(prepararPedidoHoja(muestras['segun-ganchos'], DEFAULT_PARAMS), capturador);
    expect(hoja.pagina.ganchos).not.toBeNull();
    expect(llamadas[0]).toEqual(['tres-cuartos', aPixeles(tamanoVista('tres-cuartos', true).ancho), aPixeles(tamanoVista('tres-cuartos', true).alto)]);
  });

  it('la vista de delante y la de detrás de una lona dejan al pie la franja de su recogida; el baquetón no', () => {
    const { capturador, reservas } = capturadorFalso();
    prepararHoja(prepararPedidoHoja(muestras.varios, DEFAULT_PARAMS), capturador);
    const franja = aPixeles(NOTA_VISTA_MM);
    // tres-cuartos, tres-cuartos-detras, delante, detras, lateral de cada elemento: lona, baquetón, lona.
    expect(reservas).toEqual([0, 0, franja, franja, 0, 0, 0, 0, 0, 0, 0, 0, franja, franja, 0]);
  });

  it('pone en cada hoja el revisor que traen los datos, y vacío si no traen', () => {
    const { capturador } = capturadorFalso();
    const datos = { ...prepararPedidoHoja(muestras.varios, DEFAULT_PARAMS), revisadoPor: 'JAIME' };
    expect(prepararHoja(datos, capturador).map((h) => h.pagina.cabecera.revisadoPor)).toEqual(['JAIME', 'JAIME', 'JAIME']);
    expect(prepararHoja(prepararPedidoHoja(muestras.varios, DEFAULT_PARAMS), capturador)[0].pagina.cabecera.revisadoPor).toBe('');
  });
});
