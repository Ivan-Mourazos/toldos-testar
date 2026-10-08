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
export function IrisSquaringDiagram({ awning, parameters }: { awning: Awning; parameters?: unknown }) {
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
  const guideGap = unit * 0.9;
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
        <line className="iris-sq-guia" x1={toldo.left - guideGap} y1={0} x2={toldo.left - guideGap} y2={bottomLeft.y} />
        <line className="iris-sq-guia" x1={toldo.right + guideGap} y1={0} x2={toldo.right + guideGap} y2={bottomRight.y} />

        <g className="iris-sq-texto" fontSize={font}>
          <text x={width / 2} y={-unit * 1.6} textAnchor="middle">Frente superior {cm(view.measures.frontTop)}</text>
          <text x={width / 2} y={height + unit * 2.6} textAnchor="middle">Frente inferior {cm(view.measures.frontBottom)}</text>
          <text transform={`translate(${-unit * 3.2} ${bottomLeft.y / 2}) rotate(-90)`} textAnchor="middle">Salida izq. {cm(view.measures.exitLeft)} · guía MFI {cm(view.guides.left)}</text>
          <text transform={`translate(${width + unit * 3.2} ${bottomRight.y / 2}) rotate(90)`} textAnchor="middle">Salida der. {cm(view.measures.exitRight)} · guía MFD {cm(view.guides.right)}</text>
          <text className="iris-sq-texto-suave" x={d1.x} y={d1.y} textAnchor="end">D1 {cm(view.measures.diagonal1)}</text>
          <text className="iris-sq-texto-suave" x={d2.x} y={d2.y}>D2 {cm(view.measures.diagonal2)}</text>
          <text className="iris-sq-texto-toldo" x={(toldo.left + toldo.right) / 2} y={toldo.drop / 2} textAnchor="middle">Toldo {cm(view.toldo.width)} × {cm(view.toldo.drop)} (frente y caída menores)</text>
          {view.slack.left > 0 && <text className="iris-sq-texto-desfase" x={bottomLeft.x} y={bottomLeft.y + unit * 1.4} textAnchor="start">{cm(view.slack.left)} cm</text>}
          {view.slack.right > 0 && <text className="iris-sq-texto-desfase" x={bottomRight.x} y={bottomRight.y + unit * 1.4} textAnchor="end">{cm(view.slack.right)} cm</text>}
        </g>
      </svg>
      <figcaption>
        {view.exaggeration > 1 && <p className="iris-squaring-note">Desfases exagerados ×{view.exaggeration} para que se vean; las cotas son las reales.</p>}
        <ul className="iris-squaring-checks">
          {view.checks.map((check) => <li key={check.id} className={`is-${check.level}`}>{check.text}</li>)}
        </ul>
      </figcaption>
    </figure>
  );
}
