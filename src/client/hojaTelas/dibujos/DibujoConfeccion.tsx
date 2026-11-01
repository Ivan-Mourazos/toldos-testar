import React from 'react';
import type { DibujoSvgDatos } from './tipos';

export async function esperarFuentesDibujo(datos?: DibujoSvgDatos): Promise<void> {
  const fuentes = new Map<string, string>();
  for (const nodo of datos?.nodes ?? []) {
    if (nodo.tag !== 'text') continue;
    const a = nodo.attrs;
    fuentes.set(`${a.fontStyle} ${a.fontWeight} 12px "${a.fontFamily}"`, nodo.text);
  }
  await Promise.all(Array.from(fuentes, ([fuente, texto]) => document.fonts.load(fuente, texto)));
  await document.fonts.ready;
}

// Un único lienzo de 242 × 300 para hojas y miniaturas. La geometría compartida del dominio
// entrega primitivas y líneas de texto, nunca HTML: React escapa todos los rótulos del pedido.
export function DibujoConfeccion({ datos }: { datos: DibujoSvgDatos }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${datos.width} ${datos.height}`}
      width="100%" height="100%" role="img" aria-label="Dibujo de confección"
      style={{ display: 'block', background: '#fff' }}>
      {datos.nodes.map((nodo, indice) => nodo.tag === 'path'
        ? <path key={indice} {...nodo.attrs} />
        : <text key={indice} {...nodo.attrs} xmlSpace="preserve">{nodo.text}</text>)}
    </svg>
  );
}
