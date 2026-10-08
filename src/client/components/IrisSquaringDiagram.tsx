import { buildIrisSquaringView } from '../../domain/irisSquaringView.js';
import type { Awning } from '../types';

type Point = { x: number; y: number };
type Check = { id: string; level: 'ok' | 'warn' | 'error'; text: string };
type View = {
  assumeSquare: boolean;
  exaggeration: number;
  drawCorners: { topLeft: Point; topRight: Point; bottomLeft: Point; bottomRight: Point };
  drawToldo: { left: number; right: number; drop: number };
  measures: { frontTop: number; frontBottom: number; exitLeft: number; exitRight: number; diagonal1: number; diagonal2: number };
  toldo: { width: number; drop: number };
  guides: { left: number; right: number };
  slack: { left: number; right: number };
  checks: Check[];
};

const cm = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 1 });

/**
 * Dibujo del escuadrado del Iris (Iván, 08/10/2026): el hueco medido, sus diagonales, el
 * rectángulo del toldo y cada guía con su altura, según se teclean las medidas. Sustituye al
 * dibujo en CAD. Los desfases van exagerados para que se vean; las cotas son las reales.
 */
export function IrisSquaringDiagram({ awning, parameters, guideCuts }: { awning: Awning; parameters?: unknown; guideCuts?: { left: number; right: number } }) {
  const view = buildIrisSquaringView(awning, (parameters ?? {}) as object) as View | null;
  if (!view) {
    return <p className="iris-squaring-empty">El dibujo del hueco sale al completar frente, salidas y diagonales.</p>;
  }
  const { topLeft, topRight, bottomLeft, bottomRight } = view.drawCorners;
  const width = topRight.x;
  const height = Math.max(bottomLeft.y, bottomRight.y);
  const unit = Math.max(width, height) / 34;
  const pad = unit * 5;
  const font = unit * 1.15;
  const toldo = view.drawToldo;
  // Cota de cada guía, por fuera del hueco: línea fina con topes (Iván, 08/10/2026: las rayas
  // gordas confundían con el toldo).
  const dimLeft = Math.min(0, bottomLeft.x) - unit * 1.6;
  const dimRight = Math.max(width, bottomRight.x) + unit * 1.6;
  const tick = unit * 0.5;
  // La guía se corta a la altura del hueco menos el descuento del manual: el corte sale del cálculo.
  const guideText = (side: string, cut: number | undefined, height: number) => cut && cut > 0
    ? `Guía ${side}: corte ${cm(cut)} · hueco ${cm(height)}`
    : `Guía ${side}: hueco ${cm(height)}`;
  const polygon = [topLeft, topRight, bottomRight, bottomLeft].map((p) => `${p.x},${p.y}`).join(' ');
  // Cada diagonal se rotula cerca de su extremo de arriba, para que no se pisen en el centro.
  const along = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const d1 = along(topRight, bottomLeft, 0.22);
  const d2 = along(topLeft, bottomRight, 0.22);

  return (
    <figure className="iris-squaring" aria-label="Escuadrado del hueco">
      <svg viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`} role="img" aria-label={`Hueco de ${cm(view.measures.frontTop)} por ${cm(view.guides.left)} y ${cm(view.guides.right)}; toldo de ${cm(view.toldo.width)} por ${cm(view.toldo.drop)}`}>
        <rect className="iris-sq-toldo" x={toldo.left} y={0} width={toldo.right - toldo.left} height={toldo.drop} />
        <polygon className="iris-sq-hueco" points={polygon} />
        <line className="iris-sq-diagonal" x1={topRight.x} y1={topRight.y} x2={bottomLeft.x} y2={bottomLeft.y} />
        <line className="iris-sq-diagonal" x1={topLeft.x} y1={topLeft.y} x2={bottomRight.x} y2={bottomRight.y} />
        <g className="iris-sq-cota">
          <line x1={dimLeft} y1={0} x2={dimLeft} y2={bottomLeft.y} />
          <line x1={dimLeft - tick} y1={0} x2={dimLeft + tick} y2={0} />
          <line x1={dimLeft - tick} y1={bottomLeft.y} x2={dimLeft + tick} y2={bottomLeft.y} />
          <line x1={dimRight} y1={0} x2={dimRight} y2={bottomRight.y} />
          <line x1={dimRight - tick} y1={0} x2={dimRight + tick} y2={0} />
          <line x1={dimRight - tick} y1={bottomRight.y} x2={dimRight + tick} y2={bottomRight.y} />
        </g>

        <g className="iris-sq-texto" fontSize={font}>
          <text x={width / 2} y={-unit * 1.6} textAnchor="middle">Frente superior {cm(view.measures.frontTop)}</text>
          <text x={width / 2} y={height + unit * 2.6} textAnchor="middle">Frente inferior {cm(view.measures.frontBottom)}</text>
          <text transform={`translate(${dimLeft - unit * 0.9} ${bottomLeft.y / 2}) rotate(-90)`} textAnchor="middle">{guideText('MFI', guideCuts?.left, view.guides.left)}</text>
          <text transform={`translate(${dimRight + unit * 0.9} ${bottomRight.y / 2}) rotate(90)`} textAnchor="middle">{guideText('MFD', guideCuts?.right, view.guides.right)}</text>
          <text className="iris-sq-texto-suave" x={d1.x} y={d1.y} textAnchor="end">D1 {cm(view.measures.diagonal1)}</text>
          <text className="iris-sq-texto-suave" x={d2.x} y={d2.y}>D2 {cm(view.measures.diagonal2)}</text>
          <text className="iris-sq-texto-toldo" x={(toldo.left + toldo.right) / 2} y={toldo.drop / 2} textAnchor="middle">Toldo {cm(view.toldo.width)} × {cm(view.toldo.drop)} (frente y caída menores)</text>
          {view.slack.left > 0 && <text className="iris-sq-texto-desfase" x={bottomLeft.x} y={bottomLeft.y + unit * 1.4} textAnchor="start">{cm(view.slack.left)} cm</text>}
          {view.slack.right > 0 && <text className="iris-sq-texto-desfase" x={bottomRight.x} y={bottomRight.y + unit * 1.4} textAnchor="end">{cm(view.slack.right)} cm</text>}
        </g>
      </svg>
      <figcaption>
        <p className="iris-squaring-note">En amarillo, el toldo. Línea continua, el hueco medido; discontinuas, las diagonales; a los lados, cada guía del toldo (la normal, no la compensadora): la altura del hueco en ese lado y su corte, que es esa altura menos el descuento del manual.{view.exaggeration > 1 ? ` Desfases exagerados ×${view.exaggeration} para que se vean; las cotas son las reales.` : ''}</p>
        <ul className="iris-squaring-checks">
          {view.checks.map((check) => <li key={check.id} className={`is-${check.level}`}>{check.text}</li>)}
        </ul>
      </figcaption>
    </figure>
  );
}
