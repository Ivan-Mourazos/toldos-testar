import React from 'react';
import { pt, sitio, type CajaNotas } from './ayudasHoja';

function comentario(texto: string) {
  const partes = /^([A-Z]{1,3}:)\s+([\s\S]*)$/.exec(texto);
  return partes ? <><strong>{partes[1]}</strong> {partes[2]}</> : texto;
}

/** Cada comentario conserva su fila, también cuando continúa en otra página. */
export function NotasTela({ x, y, w, h, titulo, filas }: {
  x: number; y: number; w: number; h: number; titulo: string; filas: string[];
}) {
  return (
    <div className="telas-notas telas-notas-por-toldo" style={{ ...sitio(x, y, w, h), height: 'auto', maxHeight: pt(h) }}>
      <div className="telas-notas-titulo">{titulo}</div>
      <div className="telas-comentarios">
        {filas.map((fila, indice) => <div className="telas-comentario" key={indice}>{comentario(fila)}</div>)}
      </div>
    </div>
  );
}

/** Mide filas con su filete y su letra en negrita; parte las largas sin perder texto. */
export function repartirNotasTela(medidor: HTMLElement, texto: string, primera: CajaNotas, siguiente: CajaNotas): string[][] {
  const pendientes = texto.split(/\r\n?|\n/).map((fila) => fila.trim()).filter(Boolean);
  const paginas: string[][] = [[]];
  let caja = primera;
  let disponible = caja.alto;
  const medir = (fila: string) => {
    medidor.style.width = pt(caja.ancho);
    const nodo = document.createElement('div');
    nodo.className = 'telas-comentario';
    const partes = /^([A-Z]{1,3}:)\s+([\s\S]*)$/.exec(fila);
    if (partes) {
      const letra = document.createElement('strong');
      letra.textContent = partes[1];
      nodo.append(letra, ` ${partes[2]}`);
    } else nodo.textContent = fila;
    medidor.replaceChildren(nodo);
    return nodo.getBoundingClientRect().height;
  };
  const nuevaPagina = () => {
    paginas.push([]);
    caja = siguiente;
    disponible = caja.alto;
  };
  while (pendientes.length) {
    const fila = pendientes[0];
    const alto = medir(fila);
    if (alto <= disponible) {
      paginas.at(-1)!.push(fila);
      disponible -= alto;
      pendientes.shift();
    } else if (paginas.at(-1)!.length) {
      nuevaPagina();
    } else {
      // Un comentario mayor que una página: corta por palabras, o por letras si no hay espacios.
      let inicio = 1;
      let fin = fila.length;
      while (inicio < fin) {
        const medio = Math.ceil((inicio + fin) / 2);
        if (medir(fila.slice(0, medio)) <= disponible) inicio = medio;
        else fin = medio - 1;
      }
      const espacio = fila.lastIndexOf(' ', inicio);
      const corte = espacio > 3 ? espacio : inicio;
      paginas.at(-1)!.push(fila.slice(0, corte).trimEnd());
      const letra = /^([A-Z]{1,3}:)\s/.exec(fila)?.[1];
      pendientes[0] = `${letra ? `${letra} ` : ''}${fila.slice(corte).trimStart()}`;
      nuevaPagina();
    }
  }
  medidor.replaceChildren();
  return paginas;
}
