import { buildIrisSquaringView } from '../../domain/irisSquaringView.js';
import type { Awning } from '../types';

type Point = { x: number; y: number };
type Corners = { topLeft: Point; topRight: Point; bottomLeft: Point; bottomRight: Point };
type Check = { id: string; level: 'ok' | 'warn' | 'error'; text: string };
type View = {
  assumeSquare: boolean;
  exaggeration: number;
  drawCorners: Corners;
  drawToldo: { left: number; right: number; drop: number };
  measures: { frontTop: number; frontBottom: number; exitLeft: number; exitRight: number; diagonal1: number; diagonal2: number };
  toldo: { width: number; drop: number };
  guides: { left: number; right: number };
  slack: { left: number; right: number };
  checks: Check[];
};

const cm = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const positive = (value: unknown) => (Number(value) > 0 ? Number(value) : 0);
const named = (name: string, value: number) => (value > 0 ? `${name} ${cm(value)}` : name);

// Hueco tipo para la plantilla: un poco fuera de escuadra, para que se vea qué es cada medida.
const TEMPLATE: Corners = { topLeft: { x: 0, y: 0 }, topRight: { x: 300, y: 0 }, bottomLeft: { x: 16, y: 236 }, bottomRight: { x: 290, y: 250 } };
const SQUARE_TEMPLATE: Corners = { topLeft: { x: 0, y: 0 }, topRight: { x: 300, y: 0 }, bottomLeft: { x: 0, y: 250 }, bottomRight: { x: 300, y: 250 } };

/**
 * Dibujo del escuadrado del Iris (Iván, 08/10/2026). Mientras faltan medidas es una plantilla que
 * dice qué es cada cota (sobre todo, cuál es la diagonal 1 y cuál la 2); con las medidas, dibuja el
 * hueco medido, sus diagonales, el rectángulo del toldo y cada guía con su corte. Sustituye al
 * dibujo en CAD. Los desfases van exagerados para que se vean; las cotas son las reales.
 */
export function IrisSquaringDiagram({ awning, parameters, guideCuts }: { awning: Awning; parameters?: unknown; guideCuts?: { left: number; right: number } }) {
  const view = buildIrisSquaringView(awning, (parameters ?? {}) as object) as View | null;
  const square = awning.irisAssumeSquare === true;
  const corners = view ? view.drawCorners : square ? SQUARE_TEMPLATE : TEMPLATE;
  const { topLeft, topRight, bottomLeft, bottomRight } = corners;
  const measures = view ? view.measures : {
    frontTop: positive(awning.irisFrontTop),
    frontBottom: positive(awning.irisFrontBottom),
    exitLeft: positive(awning.irisExitLeft),
    exitRight: positive(awning.irisExitRight),
    diagonal1: positive(awning.irisDiagonal1),
    diagonal2: positive(awning.irisDiagonal2)
  };
  const width = Math.max(topRight.x, bottomRight.x);
  const height = Math.max(bottomLeft.y, bottomRight.y);
  const unit = Math.max(width, height) / 34;
  const pad = unit * 5;
  const font = unit * 1.15;
  // Cota de cada guía por fuera del hueco (solo con dibujo real): línea fina con topes.
  const dimLeft = Math.min(0, bottomLeft.x) - unit * 1.6;
  const dimRight = Math.max(width, bottomRight.x) + unit * 1.6;
  const tick = unit * 0.5;
  // La guía se corta a la altura del hueco menos el descuento del manual: el corte sale del cálculo.
  const guideText = (side: string, cut: number | undefined, guideHeight: number) => cut && cut > 0
    ? `Guía ${side}: corte ${cm(cut)} · hueco ${cm(guideHeight)}`
    : `Guía ${side}: hueco ${cm(guideHeight)}`;
  const polygon = [topLeft, topRight, bottomRight, bottomLeft].map((p) => `${p.x},${p.y}`).join(' ');
  // Cada diagonal se rotula cerca de su extremo de arriba, para que no se pisen en el centro.
  const along = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const d1 = along(topRight, bottomLeft, 0.12);
  const d2 = along(topLeft, bottomRight, 0.12);
  const midLeft = along(topLeft, bottomLeft, 0.5);
  const midRight = along(topRight, bottomRight, 0.5);
  const showBottom = !square || Boolean(view);
  const diagonals = !square;

  return (
    <figure className={`iris-squaring${view ? '' : ' is-template'}`} aria-label="Escuadrado del hueco">
      <svg viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`} role="img"
        aria-label={view ? `Hueco de ${cm(measures.frontTop)} por ${cm(view.guides.left)} y ${cm(view.guides.right)}; toldo de ${cm(view.toldo.width)} por ${cm(view.toldo.drop)}` : 'Plantilla de las medidas del hueco'}>
        {view && <rect className="iris-sq-toldo" x={view.drawToldo.left} y={0} width={view.drawToldo.right - view.drawToldo.left} height={view.drawToldo.drop} />}
        <polygon className="iris-sq-hueco" points={polygon} />
        {diagonals && <line className="iris-sq-diagonal" x1={topRight.x} y1={topRight.y} x2={bottomLeft.x} y2={bottomLeft.y} />}
        {diagonals && <line className="iris-sq-diagonal" x1={topLeft.x} y1={topLeft.y} x2={bottomRight.x} y2={bottomRight.y} />}
        {view && (
          <g className="iris-sq-cota">
            <line x1={dimLeft} y1={0} x2={dimLeft} y2={bottomLeft.y} />
            <line x1={dimLeft - tick} y1={0} x2={dimLeft + tick} y2={0} />
            <line x1={dimLeft - tick} y1={bottomLeft.y} x2={dimLeft + tick} y2={bottomLeft.y} />
            <line x1={dimRight} y1={0} x2={dimRight} y2={bottomRight.y} />
            <line x1={dimRight - tick} y1={0} x2={dimRight + tick} y2={0} />
            <line x1={dimRight - tick} y1={bottomRight.y} x2={dimRight + tick} y2={bottomRight.y} />
          </g>
        )}

        <g className="iris-sq-texto" fontSize={font}>
          <text x={topRight.x / 2} y={-unit * 1.6} textAnchor="middle">{named('Frente superior', measures.frontTop)}</text>
          {showBottom && <text x={(bottomLeft.x + bottomRight.x) / 2} y={height + unit * 2.6} textAnchor="middle">{named('Frente inferior', measures.frontBottom)}</text>}
          <text className="iris-sq-texto-lado" transform={`translate(${midLeft.x + unit * 1.3} ${midLeft.y}) rotate(-90)`} textAnchor="middle">{named('Salida izquierda', measures.exitLeft)}</text>
          {!square && <text className="iris-sq-texto-lado" transform={`translate(${midRight.x - unit * 1.3} ${midRight.y}) rotate(90)`} textAnchor="middle">{named('Salida derecha', measures.exitRight)}</text>}
          {diagonals && <text className="iris-sq-texto-suave" x={d1.x} y={d1.y} textAnchor="end">{named('Diagonal 1', measures.diagonal1)}</text>}
          {diagonals && <text className="iris-sq-texto-suave" x={d2.x} y={d2.y}>{named('Diagonal 2', measures.diagonal2)}</text>}
          {view && (
            <>
              <text transform={`translate(${dimLeft - unit * 0.9} ${bottomLeft.y / 2}) rotate(-90)`} textAnchor="middle">{guideText('MFI', guideCuts?.left, view.guides.left)}</text>
              <text transform={`translate(${dimRight + unit * 0.9} ${bottomRight.y / 2}) rotate(90)`} textAnchor="middle">{guideText('MFD', guideCuts?.right, view.guides.right)}</text>
              <text className="iris-sq-texto-toldo" x={(view.drawToldo.left + view.drawToldo.right) / 2} y={view.drawToldo.drop / 2} textAnchor="middle">Toldo {cm(view.toldo.width)} × {cm(view.toldo.drop)} (frente y caída menores)</text>
              {view.slack.left > 0 && <text className="iris-sq-texto-desfase" x={bottomLeft.x} y={bottomLeft.y + unit * 1.4} textAnchor="start">{cm(view.slack.left)} cm</text>}
              {view.slack.right > 0 && <text className="iris-sq-texto-desfase" x={bottomRight.x} y={bottomRight.y + unit * 1.4} textAnchor="end">{cm(view.slack.right)} cm</text>}
            </>
          )}
        </g>
      </svg>
      <figcaption>
        {view ? (
          <>
            <p className="iris-squaring-note">En amarillo, el toldo. Línea continua, el hueco medido; discontinuas, las diagonales; a los lados, cada guía del toldo (la normal, no la compensadora): la altura del hueco en ese lado y su corte, que es esa altura menos el descuento del manual.{view.exaggeration > 1 ? ` Desfases exagerados ×${view.exaggeration} para que se vean; las cotas son las reales.` : ''}</p>
            <ul className="iris-squaring-checks">
              {view.checks.map((check) => <li key={check.id} className={`is-${check.level}`}>{check.text}</li>)}
            </ul>
          </>
        ) : (
          <p className="iris-squaring-note">{square
            ? 'Hueco escuadrado: basta con el frente superior y la salida izquierda.'
            : 'Qué es cada medida: la diagonal 1 va de la esquina de arriba a la derecha a la de abajo a la izquierda (cierra con la salida izquierda); la diagonal 2, de arriba a la izquierda a abajo a la derecha. Al completar las seis, sale el dibujo del hueco medido con el toldo.'}</p>
        )}
      </figcaption>
    </figure>
  );
}
