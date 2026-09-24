import React, { useEffect, useState } from 'react';

type Section = { id: string; number: string; title: string };

// Índice fijo de las secciones de Parámetros (01, 02… y Dibujos). Cada modelo ocupaba unos
// 2.500 px y había que bajar a ciegas (revisión de interfaz, F1, 23/09/2026). Lee las
// secciones que haya en pantalla, así sirve para las vistas de los 22 modelos sin tocarlas.
export function ParameterSectionIndex() {
  const [sections, setSections] = useState<Section[]>([]);
  const [top, setTop] = useState(0);

  useEffect(() => {
    const root = document.querySelector('.workspace-content') || document.body;
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const found: Section[] = [];
        root.querySelectorAll<HTMLElement>('.parameter-band').forEach((band, index) => {
          const number = band.querySelector('.parameter-band-title > span')?.textContent?.trim() || String(index + 1).padStart(2, '0');
          const title = band.querySelector('.parameter-band-title h3')?.textContent?.trim() || '';
          if (!band.id) band.id = `parametros-seccion-${index + 1}`;
          found.push({ id: band.id, number, title });
        });
        const drawings = root.querySelector<HTMLElement>('.drawing-parameters');
        if (drawings) {
          if (!drawings.id) drawings.id = 'parametros-dibujos';
          found.push({ id: drawings.id, number: '', title: 'Dibujos' });
        }
        setSections((current) => JSON.stringify(current) === JSON.stringify(found) ? current : found);
        // Debajo de la barra superior y de la barra de "Cambios sin guardar", que también son fijas.
        const topnavHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topnav-height')) || 0;
        const saveBarHeight = document.querySelector<HTMLElement>('.parameters-save-bar')?.getBoundingClientRect().height || 0;
        setTop(topnavHeight + saveBarHeight);
      });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  if (sections.length < 2) return null;
  return (
    <nav className="parameter-section-index" aria-label="Secciones de los parámetros" style={{ top }}>
      <span>Ir a</span>
      {sections.map((section) => (
        <button key={section.id} type="button" onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          {section.number && <strong>{section.number}</strong>}{section.title}
        </button>
      ))}
    </nav>
  );
}
