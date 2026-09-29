import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import { calcLona, type LonaInput, type LonaResult } from '../../remolques/calc/lona.ts';
import { calcBaqueton, type BaquetonInput, type BaquetonResult } from '../../remolques/calc/baqueton.ts';
import type { CalcParams } from '../../remolques/calc/params.ts';
import { ResultadosBaqueton, ResultadosLona } from './Resultados';

// La pantalla de remolques pinta `calcLona` / `calcBaqueton` con `ResultadosLona` /
// `ResultadosBaqueton` (RemolquesView). Esta prueba pasa por esas mismas funciones con los 32
// planteamientos reales de producción y compara lo que acaba en pantalla —tarjetas, tabla del
// reparto de ollaos automático («Repartidos automáticamente»), editor de ollaos «A medida»,
// pie y notas— con el `result` que se guardó. `paridad-produccion.test.ts` ya cubre el cálculo;
// esto cubre su presentación (formato, tabla de reparto y textos), que la e2e solo comprueba
// con casos «A medida» y que de otro modo no tendría ninguna prueba versionada.
type Caso = {
  caso: string;
  tipo: 'lona' | 'baqueton';
  input: LonaInput & BaquetonInput;
  paramsSnapshot: CalcParams;
  result: LonaResult & BaquetonResult;
};

const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const desescapar = (t: string) => t
  .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Lo que la pantalla debe enseñar de cada caso, con el formato de la web (coma decimal).
function tarjetasEsperadas(c: Caso): Record<string, string> {
  const r = c.result;
  if (c.tipo === 'lona') {
    return {
      'Lona hecha': r.lonaHecha.anchoAtras != null && r.lonaHecha.anchoAtras !== r.lonaHecha.ancho
        ? `${fmt(r.lonaHecha.largo)} × ${fmt(r.lonaHecha.ancho)} del. / ${fmt(r.lonaHecha.anchoAtras)} tras.`
        : `${fmt(r.lonaHecha.largo)} × ${fmt(r.lonaHecha.ancho)}`,
      [`Contorno corte (+${fmt(r.ajusteContorno)})`]: r.contornoAjustado ? fmt(r.contornoAjustado) : '—',
      'Paño delantero': `${fmt(r.panoDelantero.ancho)} × ${fmt(r.panoDelantero.alto)}`,
      'Paño trasero': `${fmt(r.panoTrasero.ancho)} × ${fmt(r.panoTrasero.alto)}`,
      'Paño contorno': r.panoContorno ? `${fmt(r.panoContorno.ancho)} × ${fmt(r.panoContorno.alto)}` : '—',
      'Recoge delante': r.recogeDelanteTexto,
      'Recoge atrás': r.recogeAtrasTexto,
      'Metros de tela': `${fmt(r.metrosTela)} m`,
    };
  }
  return {
    'Paño único': `${fmt(r.panoUnico.largo)} × ${fmt(r.panoUnico.ancho)}`,
    'Remolque hecho': `${fmt(r.remolqueHecho.largo)} × ${fmt(r.remolqueHecho.ancho)}`,
    'Baquetón + costura': fmt(r.baquetonCostura),
    'Esquinas del./tras.': `${fmt(r.esquinaDelante)} / ${fmt(r.esquinaDetras)}`,
    'Delante': r.baquetonDelantero != null ? `${fmt(r.baquetonDelantero)} · NO EN LÍNEA` : 'EN LÍNEA',
    'Detrás': r.baquetonTrasero != null ? `${fmt(r.baquetonTrasero)} · NO EN LÍNEA` : 'EN LÍNEA',
    'Superficie': `${fmt(r.superficieM2)} m²/ud`,
    'Metros de tela': `${fmt(r.metrosTela)} m`,
  };
}

function pintar(c: Caso): string {
  const params = c.paramsSnapshot;
  const propsComunes = {
    modoOllaos: c.input.modoOllaos as 'REPARTIDOS' | 'SEGUN SE INDICA',
    primerOllao: c.input.primerOllao ?? params.primerOllao,
    onOllaosChange: () => {},
  };
  return renderToStaticMarkup(
    c.tipo === 'lona'
      ? <ResultadosLona res={calcLona(c.input, params)} {...propsComunes} />
      : <ResultadosBaqueton res={calcBaqueton(c.input, params)} {...propsComunes} />,
  );
}

function leerTarjetas(html: string) {
  const tarjetas: Record<string, string> = {};
  for (const m of html.matchAll(/<div class="rem-dato"><span>(.*?)<\/span><strong>(.*?)<\/strong><\/div>/g)) {
    tarjetas[desescapar(m[1])] = desescapar(m[2]);
  }
  return tarjetas;
}

/** Posiciones de cada fila, de la tabla del reparto automático o de las casillas del editor a medida. */
function leerReparto(html: string, modo: string) {
  const claves = ['laterales', 'atras', 'delante'] as const;
  const reparto: Record<string, number[]> = {};
  if (modo === 'REPARTIDOS') {
    const filas = [...html.matchAll(/<tr><th scope="row">.*?<\/th>(.*?)<\/tr>/g)];
    expect(filas).toHaveLength(3);
    filas.forEach((fila, n) => {
      const celdas = [...fila[1].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((m) => m[1]);
      const total = Number(celdas.pop());
      const posiciones = celdas.filter((t) => t !== '–').map((t) => Number(t.replace(',', '.')));
      // El «Total» de la tabla tiene que coincidir con las posiciones que enseña.
      expect(total).toBe(posiciones.length);
      reparto[claves[n]] = posiciones;
    });
  } else {
    const filas = html.split('<section class="rem-ollaos-fila">').slice(1);
    expect(filas).toHaveLength(3);
    filas.forEach((fila, n) => {
      reparto[claves[n]] = [...fila.matchAll(/<input[^>]*? value="([^"]*)"/g)]
        .map((m) => m[1]).filter((v) => v !== '').map((v) => Number(v.replace(',', '.')));
    });
  }
  return reparto;
}

describe('la pantalla de remolques enseña lo mismo que se guardó en producción', () => {
  const lista = casos as unknown as Caso[];

  it('hay 32 planteamientos reales y de los dos modos de ollaos', () => {
    expect(lista).toHaveLength(32);
    expect(lista.some((c) => c.input.modoOllaos === 'REPARTIDOS')).toBe(true);
    expect(lista.some((c) => c.input.modoOllaos === 'SEGUN SE INDICA')).toBe(true);
  });

  it.each(lista.map((c) => [c.caso, c] as const))('%s', (_nombre, caso) => {
    const html = pintar(caso);
    expect(leerTarjetas(html)).toEqual(tarjetasEsperadas(caso));
    expect(leerReparto(html, caso.input.modoOllaos)).toEqual(caso.result.reparto);
    const notas = [...html.matchAll(/<li>(.*?)<\/li>/g)].map((m) => desescapar(m[1]));
    expect(notas).toEqual(caso.result.notas);
    if (caso.input.modoOllaos === 'REPARTIDOS') {
      const primer = caso.input.primerOllao ?? caso.paramsSnapshot.primerOllao;
      expect(html).toContain(`Primer y último ollao a ${fmt(primer)} cm del borde.`);
    } else {
      expect(html).not.toContain('Primer y último ollao');
    }
  });
});
