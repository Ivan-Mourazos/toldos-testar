import React, { useEffect, useRef } from 'react';
import { PaginaHoja } from './PaginaHoja';
import type { HojaPreparada } from './prepararHoja';

const texto = (error: unknown) => (error instanceof Error ? error.message : String(error));
const desborda = (el: HTMLElement) => el.scrollHeight > el.clientHeight + 1;

async function esperarRecursos(): Promise<void> {
  await document.fonts.ready;
  await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {
    throw new Error(`No se pudo cargar la imagen ${img.getAttribute('src')?.slice(0, 60)}.`);
  })));
}

/**
 * Todas las hojas del pedido. Cuando están pintadas comprueba que cada una cabe en su A4 (si la
 * columna de datos no cabe, prueba con la letra algo menor; si tampoco, lo dice) y, con las
 * fuentes y las imágenes cargadas, avisa de que se puede imprimir.
 */
export function HojaPedido({ hojas, onLista, onError }: {
  hojas: HojaPreparada[];
  onLista: () => void;
  onError: (mensaje: string) => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vigente = true;
    // Primero las fuentes: medir con la letra de reserva daría otro alto.
    esperarRecursos().then(() => {
      if (!vigente) return;
      const paginas = Array.from(raiz.current?.querySelectorAll<HTMLElement>('.hoja-pagina') ?? []);
      for (const pagina of paginas) {
        const columna = pagina.querySelector<HTMLElement>('.hoja-columna');
        if (columna && desborda(columna)) pagina.classList.add('hoja-apretada');
        if ((columna && desborda(columna)) || desborda(pagina)) {
          onError(`«${pagina.dataset.titulo}» no cabe en una hoja: acorta las observaciones.`);
          return;
        }
      }
      onLista();
    }, (error: unknown) => { if (vigente) onError(texto(error)); });
    return () => { vigente = false; };
  }, [hojas, onLista, onError]);

  return (
    <div ref={raiz}>
      {hojas.map(({ pagina, vistas }) => <PaginaHoja key={pagina.clave} pagina={pagina} vistas={vistas} />)}
    </div>
  );
}
