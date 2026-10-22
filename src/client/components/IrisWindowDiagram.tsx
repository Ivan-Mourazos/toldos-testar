import { getIrisWindow } from '../../domain/irisWindow.js';
import type { Awning } from '../types';
import '../coordina/iris-window.css';

const cm = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 1 });

export function IrisWindowDiagram({ awning }: { awning: Awning }) {
  const window = getIrisWindow(awning);
  const top = window.valid ? window.top / window.drop * 180 : 45;
  const height = window.valid ? window.height / window.drop * 180 : 80;
  const bottom = top + height;
  return <figure className="iris-window-diagram" aria-label="Ventana del Iris">
    <svg viewBox="0 0 480 250" role="img" aria-label="Ventana de borde a borde, con alto y distancia al suelo">
      <g stroke="var(--text-muted)" strokeWidth="1" fill="none">
        <rect x="100" y="26" width="240" height="180" fill="var(--color-brand-100)" />
        <rect x="100" y={26 + top} width="240" height={height} fill="var(--surface-2)" />
        {window.valid && window.height > 140 && Array.from({ length: Math.min(19, Math.ceil(window.height / 140) - 1) }, (_, i) => {
          const y = 26 + top + (i + 1) * 140 / window.height * height;
          return <line key={i} x1="100" x2="340" y1={y} y2={y} strokeDasharray="4 3" />;
        })}
        <path d={`M354 ${26 + top}h10 M359 ${26 + top}v${height} M354 ${26 + bottom}h10`} />
        <path d={`M82 ${26 + bottom}h10 M87 ${26 + bottom}V206 M82 206h10`} />
        <path d="M90 211H350" strokeDasharray="4 3" />
      </g>
      <g fill="var(--text)" fontSize="11" fontFamily="var(--font-sans), sans-serif" textAnchor="middle">
        <text x="220" y="14">VENTANA DE BORDE A BORDE</text>
        <text x="220" y={26 + top + height / 2 + 4}>CRISTAL</text>
        {top > 19 && <text x="220" y={26 + top / 2 + 4} fill="var(--color-brand-900)">LONA</text>}
        {180 - bottom > 19 && <text x="220" y={26 + bottom + (180 - bottom) / 2 + 4} fill="var(--color-brand-900)">LONA</text>}
        <text transform={`translate(377 ${26 + top + height / 2}) rotate(90)`}>
          Alto {window.height ? `${cm(window.height)} cm` : 'por indicar'}
        </text>
        <text transform={`translate(69 ${26 + bottom + (180 - bottom) / 2}) rotate(-90)`}>
          Tubo {window.floor > 0 ? `${cm(window.floor)} cm` : 'por indicar'}
        </text>
        <text x="220" y="232">TUBO DE CARGA</text>
      </g>
    </svg>
    <figcaption className="curtain-field-hint">{window.valid
      ? `Ventana de ${cm(window.height)} cm de alto. Tubo-ventana: ${cm(window.floor)} cm${window.reference === 'SUELO' ? ` (${cm(window.measure)} − 18 cm de suelo)` : ''}. Lona por encima: ${cm(window.top)} cm.${window.height > 140 ? ` Cristal en ${Math.ceil(window.height / 140)} piezas con empate horizontal.` : ''}`
      : 'Indica el alto y la distancia al borde inferior de la ventana. Desde suelo se descuentan 18 cm, igual que en la cortina. El dibujo es orientativo hasta completar las medidas.'}</figcaption>
  </figure>;
}
