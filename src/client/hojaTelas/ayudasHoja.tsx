import React, { type ReactNode } from 'react';
import { repartirNotas } from './repartirNotas';

// Lo que comparten la hoja de telas (A4) y la de estructura (A5): casillas colocadas en pt, el
// recuadro de observaciones y su reparto en páginas, y la espera de la letra y las imágenes.

export const PX_POR_PT = 4 / 3;
export const pt = (valor: number) => `${Math.round(valor * 100) / 100}pt`;
export const sitio = (x: number, y: number, w: number, h: number) => ({ left: pt(x), top: pt(y), width: pt(w), height: pt(h) });

/** Una casilla con su filete, como drawCell. `minima` (pt) la hace de una línea con letra ajustable. */
export function Celda({ x, y, w, h, clase = '', minima, children }: {
  x: number; y: number; w: number; h: number; clase?: string; minima?: number; children: ReactNode;
}) {
  return (
    <div className={`telas-celda ${clase}`.trim()} style={sitio(x, y, w, h)}>
      {minima === undefined
        ? <span className="telas-texto">{children}</span>
        : <span className="telas-texto hoja-una-linea" data-letra-minima={String(minima)}>{children}</span>}
    </div>
  );
}

// Hueco del texto de las observaciones dentro de su recuadro (pt), con la letra de la hoja de telas.
export const NOTAS_TEXTO_ARRIBA = 19.5;
export const NOTAS_TEXTO_ABAJO = 4;
export const NOTAS_TEXTO_LADO = 4;

/** El recuadro amarillo de observaciones. `lineas` null: aún sin repartir, el texto entero.
 *  `arriba` es lo que baja el texto para dejar sitio al título. */
export function Notas({ x, y, w, h, titulo, texto, lineas, refTexto, arriba = NOTAS_TEXTO_ARRIBA, clase = '' }: {
  x: number; y: number; w: number; h: number; titulo: string; texto: string; lineas: string[] | null;
  refTexto?: React.Ref<HTMLDivElement>; arriba?: number; clase?: string;
}) {
  return (
    <div className={`telas-notas ${clase}`.trim()} style={sitio(x, y, w, h)}>
      <div className="telas-notas-titulo">{titulo}</div>
      <div className="telas-notas-texto" ref={refTexto}
        style={sitio(NOTAS_TEXTO_LADO, arriba, w - NOTAS_TEXTO_LADO * 2, h - arriba - NOTAS_TEXTO_ABAJO)}>
        {lineas === null
          ? texto.split('\n').map((parrafo, indice) => <div key={indice} className="telas-nota">{parrafo}</div>)
          : lineas.map((linea, indice) => <div key={indice} className="telas-nota-linea">{linea}</div>)}
      </div>
    </div>
  );
}

// ── Reparto de las observaciones ──

interface LineaVisual { parrafo: number; inicio: number; fin: number }

/** Dónde parte el navegador cada párrafo en líneas con el ancho del medidor. */
function lineasVisuales(medidor: HTMLElement, parrafos: string[]): LineaVisual[] {
  const lineas: LineaVisual[] = [];
  parrafos.forEach((parrafo, indice) => {
    if (!parrafo) {
      lineas.push({ parrafo: indice, inicio: 0, fin: 0 });
      return;
    }
    medidor.textContent = parrafo;
    const nodo = medidor.firstChild as Text;
    const rango = document.createRange();
    let inicio = 0;
    let arriba: number | null = null;
    // Solo cuentan las letras: el espacio donde se parte la línea puede caer en cualquiera de las dos.
    for (let i = 0; i < parrafo.length; i += 1) {
      if (!/\S/.test(parrafo[i])) continue;
      rango.setStart(nodo, i);
      rango.setEnd(nodo, i + 1);
      const caja = rango.getClientRects()[0];
      if (!caja) continue;
      if (arriba !== null && caja.top > arriba + 1) {
        lineas.push({ parrafo: indice, inicio, fin: i });
        inicio = i;
      }
      arriba = caja.top;
    }
    lineas.push({ parrafo: indice, inicio, fin: parrafo.length });
  });
  medidor.textContent = '';
  return lineas;
}

/** Una caja de texto de observaciones: ancho en pt y alto en px (lo que da `clientHeight`). */
export interface CajaNotas { ancho: number; alto: number }

/** Corta las observaciones en páginas: lo que cabe en la caja de la primera y el resto, en las de
 *  continuación. Mide con el medidor, que lleva la misma letra que el recuadro. */
export function repartirObservaciones(medidor: HTMLElement, texto: string, cajaPrimera: CajaNotas, cajaSiguiente: CajaNotas): string[][] {
  const medir = (ancho: number, parrafos: string[]) => {
    medidor.style.width = pt(ancho);
    const lineas = lineasVisuales(medidor, parrafos);
    medidor.textContent = 'Ág';
    const alto = medidor.getBoundingClientRect().height;
    medidor.textContent = '';
    return { lineas, altos: lineas.map(() => alto), texto: (l: LineaVisual) => parrafos[l.parrafo].slice(l.inicio, l.fin).trimEnd() };
  };

  const parrafos = texto.split('\n');
  const primera = medir(cajaPrimera.ancho, parrafos);
  const [enPrimera = []] = repartirNotas(primera.altos, cajaPrimera.alto, Infinity);
  const paginas = [enPrimera.map((i) => primera.texto(primera.lineas[i]))];
  if (enPrimera.length === primera.lineas.length) return paginas;

  // El resto se vuelve a partir con el ancho de la página de continuación.
  const siguiente = primera.lineas[enPrimera.length];
  const resto = [parrafos[siguiente.parrafo].slice(siguiente.inicio).trimStart(), ...parrafos.slice(siguiente.parrafo + 1)];
  const continuacion = medir(cajaSiguiente.ancho, resto);
  for (const grupo of repartirNotas(continuacion.altos, cajaSiguiente.alto, cajaSiguiente.alto)) {
    paginas.push(grupo.map((i) => continuacion.texto(continuacion.lineas[i])));
  }
  return paginas;
}

// ── Carga de letra e imágenes ──

export const textoError = (error: unknown) => (error instanceof Error ? error.message : String(error));
/** Los pesos de Geist que usan las hojas, con sus letras (acentos, Ñ, º, ·). */
const PESOS = [400, 600, 700];
const MUESTRA_LETRAS = 'AÁÉÍÓÚÑÜ·º—0123456789,:';

export async function esperarLetra(): Promise<void> {
  // `document.fonts.ready` puede resolverse antes de que empiece a bajar Geist: se pide cada peso.
  const caras = await Promise.all(PESOS.map((peso) => document.fonts.load(`${peso} 12pt "Geist Variable"`, MUESTRA_LETRAS)));
  if (caras.some((lista) => lista.length === 0)) throw new Error('No se pudo cargar la letra de la hoja (Geist).');
  await document.fonts.ready;
}

export async function esperarImagenes(raiz: ParentNode): Promise<void> {
  await Promise.all(Array.from(raiz.querySelectorAll('img')).map((img) => img.decode().catch(() => {
    throw new Error(`No se pudo cargar la imagen ${img.getAttribute('src')?.slice(0, 60)}.`);
  })));
}
