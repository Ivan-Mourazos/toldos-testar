import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Awning } from '../types';
import { awningLetter } from '../../domain/awningCompleteness.js';
import { BLOCK_GAP, cardsPerPage, pageCount, pageLabel, pageOfIndex, type AwningStatus } from '../awningBlocks';
import { onAwningFocus, revealAwningCard, scrollBehavior } from '../awningFocus';

// Lo primero que puede recibir el foco dentro de una tarjeta (PageUp/PageDown lo lleva
// a la primera tarjeta del bloque nuevo).
const FOCUSABLE = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';
// Tope por si el navegador no dispara «scrollend» (o no hay nada que desplazar).
const PROGRAMMATIC_SCROLL_TIMEOUT = 1000;

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
  const previousPerPage = useRef(perPage);
  // Mientras la fila se desplaza por código (flechas, índice, teclas, foco), el scroll pasa
  // por páginas intermedias: no se sincroniza la etiqueta con él hasta que termina.
  const programmaticScroll = useRef<{ target: number; timer: number } | null>(null);
  const syncFromScrollRef = useRef<() => void>(() => undefined);

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

  function endProgrammaticScroll() {
    const current = programmaticScroll.current;
    if (!current) return;
    window.clearTimeout(current.timer);
    programmaticScroll.current = null;
    syncFromScrollRef.current();
  }

  function startProgrammaticScroll(target: number) {
    if (programmaticScroll.current) window.clearTimeout(programmaticScroll.current.timer);
    programmaticScroll.current = { target, timer: window.setTimeout(endProgrammaticScroll, PROGRAMMATIC_SCROLL_TIMEOUT) };
  }

  function goTo(target: number, behavior: ScrollBehavior = scrollBehavior()) {
    const track = trackRef.current;
    const next = Math.max(0, Math.min(pages - 1, target));
    const first = cardAt(next * perPage);
    if (track && first) {
      startProgrammaticScroll(first.offsetLeft);
      track.scrollTo({ left: first.offsetLeft, behavior });
    }
    setPage(next);
    return next;
  }

  // Termina el desplazamiento por código cuando la fila llega a su destino. Un «scrollend»
  // de un desplazamiento anterior, interrumpido a medias, no cuenta.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScrollEnd = () => {
      const current = programmaticScroll.current;
      if (!current) return;
      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      const arrived = Math.abs(track.scrollLeft - Math.min(current.target, maxScrollLeft)) <= 4;
      if (arrived) endProgrammaticScroll();
    };
    track.addEventListener('scrollend', onScrollEnd);
    return () => track.removeEventListener('scrollend', onScrollEnd);
  }, []);

  useEffect(() => () => {
    if (programmaticScroll.current) window.clearTimeout(programmaticScroll.current.timer);
  }, []);

  // Al añadir un toldo, la fila salta a su bloque. Solo si llega uno: las cargas de
  // varios a la vez (autorrellenar, reutilizar datos, borrador recuperado) no mueven la fila.
  useEffect(() => {
    const previous = previousCount.current;
    previousCount.current = awnings.length;
    if (awnings.length === previous + 1) goTo(pageOfIndex(awnings.length - 1, perPage));
  });

  // Con otro ancho cambian las tarjetas por página: la fila se recoloca en el bloque de la
  // primera tarjeta que se veía. page y pages se omiten a propósito: perPage solo cambia
  // desde el ResizeObserver, en su propio turno, así que leerlos aquí (sin dispararse por
  // ellos) no deja el efecto desactualizado.
  useEffect(() => {
    const firstShown = page * previousPerPage.current;
    previousPerPage.current = perPage;
    goTo(pageOfIndex(firstShown, perPage));
  }, [perPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // goTo y revealableCardAt se crean en cada render pero solo leen awnings, page, perPage
  // y pages: con ellos en las dependencias el oyente siempre ve los valores actuales.
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
  }), [awnings, page, perPage, pages]); // eslint-disable-line react-hooks/exhaustive-deps

  function syncPageFromScroll() {
    const track = trackRef.current;
    if (!track || programmaticScroll.current) return;
    // Con las ranuras de relleno el último bloque siempre llena una página, así que el
    // navegador ya no recorta el scroll antes del offset "ideal". Se deja igualmente el
    // tope como red de seguridad ante el redondeo de subpíxel del cálculo de abajo.
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    if (maxScrollLeft <= 0) { setPage(0); return; }
    if (track.scrollLeft >= maxScrollLeft - 1) { setPage(pages - 1); return; }
    setPage(Math.round(track.scrollLeft / (track.clientWidth + BLOCK_GAP)));
  }
  useEffect(() => { syncFromScrollRef.current = syncPageFromScroll; });

  // El foco (Tab, o un fill() de las pruebas) puede caer en una tarjeta de otro bloque: el
  // navegador desplaza la fila lo justo para enseñarla y la deja a media tarjeta. Se
  // recoloca en el bloque de esa tarjeta. El navegador desplaza después de avisar del
  // foco, así que se espera un fotograma para no quedar pisado por ese desplazamiento. Y
  // sin animación: al escribir, el navegador vuelve a asegurar que se ve el cursor y eso
  // cortaba a medias un desplazamiento suave, con la fila de nuevo en el bloque anterior.
  function onTrackFocus(event: React.FocusEvent) {
    const slot = (event.target as HTMLElement).closest<HTMLElement>('[data-awning-index]');
    if (!slot || !trackRef.current?.contains(slot)) return;
    const index = Number(slot.dataset.awningIndex);
    const target = pageOfIndex(index, perPage);
    if (target === page) return;
    startProgrammaticScroll(Number.NaN);
    window.requestAnimationFrame(() => goTo(target, 'auto'));
  }

  function focusFirstOf(pageIndex: number) {
    const slot = cardAt(pageIndex * perPage);
    const first = Array.from(slot?.querySelectorAll<HTMLElement>(FOCUSABLE) || [])
      .find((element) => !element.matches(':disabled'));
    first?.focus({ preventScroll: true });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'PageDown' && event.key !== 'PageUp') return;
    event.preventDefault();
    const next = goTo(page + (event.key === 'PageDown' ? 1 : -1));
    // Con el foco dentro de una tarjeta, pasa a la primera del bloque nuevo: si se quedara
    // en la anterior, ya no se vería y el siguiente Tab devolvería la fila atrás.
    const focused = document.activeElement;
    const inCard = focused instanceof HTMLElement && focused.closest('[data-awning-index]') && trackRef.current?.contains(focused);
    if (inCard && next !== page) focusFirstOf(next);
  }

  const firstVisible = page * perPage;
  const isVisible = (index: number) => index >= firstVisible && index < firstVisible + perPage;

  return (
    <div className={`awning-blocks${reading ? ' is-reading' : ''}`} onKeyDown={onKeyDown}>
      {awnings.length > 1 && (
        <nav className="awning-index" aria-label="Índice de toldos">
          {awnings.map((awning, index) => {
            const status = statuses[index] || { kind: 'ok', label: '✓' };
            return (
              <button
                key={awning.id || index}
                type="button"
                className={`awning-index-item is-${status.kind}${isVisible(index) ? ' is-visible' : ''}`}
                aria-current={isVisible(index) ? 'true' : undefined}
                aria-label={`Toldo ${awningLetter(index)}: ${status.kind === 'ok' ? 'completo' : status.label}`}
                onClick={() => goTo(pageOfIndex(index, perPage))}
              >
                <strong>{awningLetter(index)}</strong>
                <span>{status.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div
        ref={trackRef}
        className="awning-grid awning-blocks-track"
        style={{ '--per-page': perPage } as React.CSSProperties}
        role="group"
        tabIndex={0}
        aria-label="Tarjetas de toldos (Re Pág y Av Pág cambian de bloque)"
        onScroll={syncPageFromScroll}
        onFocus={onTrackFocus}
      >
        {awnings.map((awning, index) => (
          <div
            key={awning.id || index}
            className={`awning-blocks-slot${index % perPage === 0 ? ' is-page-start' : ''}`}
            data-awning-index={index}
          >
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
