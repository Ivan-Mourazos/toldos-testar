import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Awning } from '../types';
import { awningLetter } from '../../domain/awningCompleteness.js';
import { BLOCK_GAP, cardsPerPage, pageCount, pageLabel, pageOfIndex, type AwningStatus } from '../awningBlocks';
import { onAwningFocus, revealAwningCard } from '../awningFocus';

// Toldos por bloques (rediseño 24/09/2026, §6). Todas las tarjetas se montan, en una
// fila que se desplaza por dentro: así el foco con Tab y las pruebas llegan a
// cualquier toldo, y la página visible se deduce del desplazamiento.
export function AwningBlocks({ awnings, statuses, reading = false, renderCard }: {
  awnings: Awning[];
  statuses: AwningStatus[];
  reading?: boolean;
  renderCard: (awning: Awning, index: number) => React.ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState(1);
  const [page, setPage] = useState(0);
  const pages = pageCount(awnings.length, perPage);
  const previousCount = useRef(awnings.length);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setPerPage(cardsPerPage(track.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  function cardAt(index: number) {
    return trackRef.current?.querySelector<HTMLElement>(`[data-awning-index="${index}"]`) || null;
  }

  // revealAwningCard usa el scroll-margin-top de ".awning-column[data-awning-letter]"
  // (para no quedar tapada por la barra superior), no el de la ranura que la envuelve.
  function revealableCardAt(index: number) {
    return cardAt(index)?.querySelector<HTMLElement>('[data-awning-letter]') || cardAt(index);
  }

  function goTo(target: number) {
    const track = trackRef.current;
    const next = Math.max(0, Math.min(pages - 1, target));
    const first = cardAt(next * perPage);
    if (track && first) track.scrollTo({ left: first.offsetLeft, behavior: 'smooth' });
    setPage(next);
  }

  // Al añadir un toldo, la fila salta a su bloque.
  useEffect(() => {
    if (awnings.length > previousCount.current) goTo(pageOfIndex(awnings.length - 1, perPage));
    previousCount.current = awnings.length;
  });

  // Con otro ancho cambian las tarjetas por página: la fila se recoloca en la suya. page y
  // pages se omiten a propósito: perPage solo cambia desde el ResizeObserver, en su propio
  // turno, así que leerlos aquí (sin dispararse por ellos) no deja el efecto desactualizado.
  useEffect(() => { goTo(Math.min(page, pages - 1)); }, [perPage]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  useEffect(() => onAwningFocus((letter) => {
    const index = awnings.findIndex((_, position) => awningLetter(position) === letter);
    if (index < 0) return;
    const target = pageOfIndex(index, perPage);
    const track = trackRef.current;
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      const card = revealableCardAt(index);
      if (card) revealAwningCard(card);
    };
    if (target === page) { reveal(); return; }
    goTo(target);
    // El salto vertical (revealAwningCard) tiene que esperar a que el bloque horizontal
    // termine de desplazarse: si van a la vez, el navegador puede resolver antes de tiempo
    // el scroll vertical con el desplazamiento horizontal todavía a medias. Con un salto de
    // varias páginas el desplazamiento suave tarda más que un tiempo fijo corto, así que se
    // espera a «scrollend» con un margen de seguridad por si el navegador no lo dispara.
    if (track) {
      const onScrollEnd = () => { track.removeEventListener('scrollend', onScrollEnd); reveal(); };
      track.addEventListener('scrollend', onScrollEnd);
      window.setTimeout(() => { track.removeEventListener('scrollend', onScrollEnd); reveal(); }, 900);
    } else {
      window.setTimeout(reveal, 250);
    }
  }));

  function syncPageFromScroll() {
    const track = trackRef.current;
    if (!track) return;
    // Con las ranuras de relleno el último bloque siempre llena una página, así que el
    // navegador ya no recorta el scroll antes del offset "ideal". Se deja igualmente el
    // tope como red de seguridad ante el redondeo de subpíxel del cálculo de abajo.
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    if (maxScrollLeft <= 0) { setPage(0); return; }
    if (track.scrollLeft >= maxScrollLeft - 1) { setPage(pages - 1); return; }
    setPage(Math.round(track.scrollLeft / (track.clientWidth + BLOCK_GAP)));
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'PageDown') { event.preventDefault(); goTo(page + 1); }
    if (event.key === 'PageUp') { event.preventDefault(); goTo(page - 1); }
  }

  const firstVisible = page * perPage;
  const isVisible = (index: number) => index >= firstVisible && index < firstVisible + perPage;

  return (
    <div className={`awning-blocks${reading ? ' is-reading' : ''}`} onKeyDown={onKeyDown}>
      {awnings.length > 1 && (
        <nav className="awning-index" aria-label="Índice de toldos">
          {awnings.map((awning, index) => (
            <button
              key={awning.id}
              type="button"
              className={`awning-index-item is-${statuses[index]?.kind || 'ok'}${isVisible(index) ? ' is-visible' : ''}`}
              aria-current={isVisible(index) ? 'true' : undefined}
              onClick={() => goTo(pageOfIndex(index, perPage))}
            >
              <strong>{awningLetter(index)}</strong>
              <span>{statuses[index]?.label || '✓'}</span>
            </button>
          ))}
        </nav>
      )}

      <div
        ref={trackRef}
        className="awning-grid awning-blocks-track"
        style={{ '--per-page': perPage } as React.CSSProperties}
        onScroll={syncPageFromScroll}
      >
        {awnings.map((awning, index) => (
          <div key={awning.id} className="awning-blocks-slot" data-awning-index={index}>
            {renderCard(awning, index)}
          </div>
        ))}
        {/* Si el último bloque va corto (p. ej. 5 toldos a 3 por página), rellenamos con
            ranuras invisibles: si no, el bloque no llena la página y la tarjeta anterior
            asoma junto a la última. */}
        {Array.from({ length: perPage * pages - awnings.length }, (_, filler) => (
          <div key={`filler-${filler}`} className="awning-blocks-slot is-filler" aria-hidden="true" />
        ))}
      </div>

      {pages > 1 && (
        <div className="awning-blocks-nav">
          <button type="button" className="ghost-button" aria-label="Toldos anteriores" disabled={page === 0} onClick={() => goTo(page - 1)}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="awning-blocks-label" aria-live="polite">{pageLabel(page, perPage, awnings.length)}</span>
          <button type="button" className="ghost-button" aria-label="Toldos siguientes" disabled={page >= pages - 1} onClick={() => goTo(page + 1)}>
            <ChevronRight aria-hidden="true" />
          </button>
          <span className="awning-blocks-dots">
            {Array.from({ length: pages }, (_, dot) => (
              <button key={dot} type="button" aria-label={`Página ${dot + 1}`} aria-current={dot === page ? 'true' : undefined} className={dot === page ? 'is-active' : ''} onClick={() => goTo(dot)} />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
