import { awningLetter } from '../../domain/awningCompleteness.js';
import React from 'react';
import { AlertCircle, ChevronDown, FileSpreadsheet } from 'lucide-react';
import type { Awning, Calculation, CalculationState } from '../types';
import { FabricImageEditor } from './FabricImageEditor';
import { StructureEditor } from './StructureEditor';
import { formatDecimal } from '../constants';
import { isVerticalAwningModel } from '../../domain/modelBehavior.js';
import { controlLabel, legacyModelName } from './controlLabels';
import { formatSummary, groupMaterialRows, planningSummary } from '../awningPanel';
import { requestAwningFocus } from '../awningFocus';

type Props = {
  calculation: Calculation | null;
  state: CalculationState;
  awnings: Awning[];
};

type UpdateAwning = (id: string, patch: Partial<Awning>) => void;

// Zona «Planteamientos» bajo los toldos (rediseño 3 §2): una línea resumen plegada. El
// despiece y la tela de cada toldo se editan en su panel «Despiece y dibujo»; aquí solo
// quedan los avisos del pedido (siempre visibles) y, al desplegar, la reserva RPS completa.
export function LiveResults({ calculation, state, awnings }: Props) {
  const materialRows = groupMaterialRows(calculation?.ofs || []);
  const summary = planningSummary(calculation);
  const diagnostics = calculation?.diagnostics || [];
  const orderDiagnostics = diagnostics.filter((item) => !awnings.some((awning) => awning.id === item.awningId));
  const awningSummaries = awnings.flatMap((awning, index) => {
    const own = diagnostics.filter((item) => item.awningId === awning.id);
    return own.length ? [{ letter: awningLetter(index), count: own.length, errors: own.some((item) => item.level === 'error' || item.level === 'pending') }] : [];
  });
  const warningCount = orderDiagnostics.length + awningSummaries.reduce((total, item) => total + item.count, 0);

  return (
    <section className="planning-summary-panel">
      <details className="planning-summary">
        {/* Un <h2> dentro de <summary> perdería su papel de encabezado (el summary es un
            botón); el título va en un <span> con el mismo aspecto. El chevrón y «Ver/Ocultar
            reserva RPS» dicen que la línea se despliega. */}
        <summary>
          <span className="planning-summary-title">
            <span className="planning-summary-heading">Planteamientos</span>
            <span className="planning-summary-status">{buildStatusText(state, calculation)}</span>
          </span>
          <span className="planning-summary-text">{formatSummary(summary)}</span>
          {warningCount > 0 && (
            <span className="planning-summary-warnings badge-warn">
              <AlertCircle aria-hidden="true" />{warningCount} {warningCount === 1 ? 'aviso' : 'avisos'}
            </span>
          )}
          <span className="planning-summary-toggle">
            <span className="planning-summary-toggle-closed">Ver reserva RPS</span>
            <span className="planning-summary-toggle-open">Ocultar reserva RPS</span>
            <ChevronDown aria-hidden="true" />
          </span>
        </summary>
        <ReservationPreview rows={materialRows} />
      </details>

      {/* Los avisos de cada toldo ya están en su tarjeta: aquí solo los del pedido y una
          línea por toldo que lleva a ella (antes salían todos dos veces). Siempre visibles,
          fuera de la línea resumen plegada. */}
      {(orderDiagnostics.length > 0 || awningSummaries.length > 0) && (
        <ul className="diagnostics-list">
          {orderDiagnostics.map((item, index) => (
            <li key={`${item.message}-${index}`} className={item.level === 'error' ? 'badge-danger' : 'badge-warn'}>
              <AlertCircle aria-hidden="true" />{item.message}
            </li>
          ))}
          {awningSummaries.map((summary) => (
            <li key={summary.letter} className={summary.errors ? 'badge-danger' : 'badge-warn'}>
              <AlertCircle aria-hidden="true" />
              <button type="button" className="diagnostics-awning-link" onClick={() => requestAwningFocus(summary.letter)}>
                Toldo {summary.letter}: {summary.count} {summary.count === 1 ? 'aviso' : 'avisos'} · ver en su tarjeta
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type OfBlock = Calculation['ofs'][number];

// Cuerpo de la hoja de estructura de un toldo: el editor del despiece, la tabla y sus
// datos. Lo usan la zona «Planteamientos» y el panel «Despiece y dibujo» del toldo.
export function StructureSheet({ block, awning, onUpdate, onEditingChange }: { block: OfBlock; awning?: Awning; onUpdate?: UpdateAwning; onEditingChange?: (editing: boolean) => void }) {
  const calc = block.calculation!;
  return (
    <>
      {awning && block.structureEditor && onUpdate && <StructureEditor key={awning.id} awning={awning} editor={block.structureEditor} armCount={calc.armCount} onUpdate={onUpdate} onEditingChange={onEditingChange} />}
      <div className="structure-sheet-body">
        <div className="despiece-table-wrap">
          <table className="despiece-table">
            <thead><tr><th>Nº</th><th>Nombre pieza</th><th>Referencia</th><th className="num">Un.</th><th className="num">Corte (cm)</th></tr></thead>
            <tbody>{block.despiece?.rows.map((row) => (
              <tr key={row.num}><td className="num">{row.num}</td><td>{row.name}</td><td className={row.reference ? 'code' : 'despiece-no-ref'}>{row.reference || 'Sin código de reserva'}</td><td className="num">{row.units}</td><td className="num">{row.length === null ? '-' : `${formatDecimal(row.length)} cm`}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <aside className="structure-sheet-side">
          <InfoBlock title="Datos de partida" lines={[`Frente ${awning?.width ?? calc.width ?? '-'} cm`, `${isVerticalAwningModel(awning?.model) ? 'Caída' : 'Salida'} ${awning?.projection ?? calc.projection ?? '-'} cm`]} />
          <InfoBlock title="Tela calculada" lines={[`${formatDecimal(calc.fabricWidth)} × ${formatDecimal(calc.fabricDrop)} cm`, `${formatDecimal(calc.fabricMl)} ml`]} />
          {block.despiece?.anchoring && <InfoBlock title="Anclaje" lines={[block.despiece.anchoring.name, `${block.despiece.anchoring.reference || 'Sin referencia'} × ${block.despiece.anchoring.units}`]} />}
        </aside>
      </div>
    </>
  );
}

// Planteamiento de tela de un solo toldo: su fila, la imagen de tela y la bamba separada.
// Lo usa el panel «Despiece y dibujo»; la zona «Planteamientos» pinta las mismas filas.
export function FabricSheet({ block, awning, onUpdate }: { block: OfBlock; awning?: Awning; onUpdate?: UpdateAwning }) {
  return <FabricTable><FabricRows block={block} index={0} awning={awning} onUpdate={onUpdate} /></FabricTable>;
}

function FabricTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="fabric-preview-table-wrap">
      <table className="fabric-preview-table">
        <thead><tr><th>Elemento</th><th>Modelo</th><th>OF</th><th>Tela</th><th className="num">Frente tela</th><th className="num">Salida paño</th><th className="num">Paños</th><th className="num">Total</th><th>Indicaciones</th></tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function FabricRows({ block, index, awning, onUpdate }: { block: OfBlock; index: number; awning?: Awning; onUpdate?: UpdateAwning }) {
  const calc = block.calculation!;
  const heraVariant = calc.model === 'HERA' ? calc.heraVariant || awning?.submodel : '';
  const mainFabricMl = calc.mainFabricMl ?? calc.fabricMl;
  const mainFabricPanels = calc.mainFabricPanels ?? calc.fabricPanels;
  const hasSeparateValance = Boolean(calc.valanceFabricCode) && Number(calc.valanceFabricMl) > 0;
  return (
    <>
      <tr>
        <td><strong className="result-letter">{awningLetter(block.awningIndex ?? index)}</strong></td>
        <td><strong>{controlLabel(awning?.model || calc.model)}</strong>{legacyModelName(awning?.model || calc.model) && <small>{legacyModelName(awning?.model || calc.model)}</small>}{heraVariant && <small>{controlLabel(heraVariant)}</small>}</td>
        <td>{block.of || '-'}</td><td className="code">{calc.fabricCode || '-'}</td>
        <td className="num">{formatDecimal(calc.fabricWidth)} cm</td><td className="num">{formatDecimal(calc.fabricDrop)} cm</td><td className="num">{mainFabricPanels || '-'}</td><td className="num"><strong>{formatDecimal(mainFabricMl)} ml</strong></td>
        <td><FabricIndication awning={awning} calculation={calc} /></td>
      </tr>
      {awning && <tr><td colSpan={9}>{onUpdate ? <FabricImageEditor awning={awning} onUpdate={onUpdate} /> : awning.fabricImage ? <img className="fabric-custom-image" src={awning.fabricImage} alt="Imagen personalizada del planteamiento de tela" /> : null}</td></tr>}
      {hasSeparateValance && (
        <tr className="fabric-valance-row">
          <td><small>{awningLetter(block.awningIndex ?? index)} · bamba</small></td>
          <td><strong>Bambalina</strong><small>tejido independiente</small></td>
          <td>{block.of || '-'}</td><td className="code">{calc.valanceFabricCode}</td>
          <td className="num">{formatDecimal(calc.valanceFabricWidth ?? calc.fabricWidth)} cm</td><td className="num">{formatDecimal(calc.valanceDrop)} cm</td><td className="num">{calc.valanceFabricPanels || '-'}</td><td className="num"><strong>{formatDecimal(calc.valanceFabricMl)} ml</strong></td>
          <td>Bamba separada de {formatDecimal(awning?.valanceHeight)} cm</td>
        </tr>
      )}
    </>
  );
}

type OfCalculation = NonNullable<Calculation['ofs'][number]['calculation']>;

function FabricIndication({ awning, calculation }: { awning?: Awning; calculation: OfCalculation }) {
  if (calculation.model !== 'HERA' && awning?.model !== 'HERA') {
    return Number(awning?.valanceHeight) > 0
      ? `${formatDecimal(awning?.valanceHeight)} cm${calculation.valanceFabricCode ? ` · ${calculation.valanceFabricCode}` : ''}`
      : 'Sin bamba';
  }

  const variant = calculation.heraVariant || awning?.submodel || '';
  const join = calculation.heraJoin || awning?.heraJoin || '';
  const tube = variant && Number.isFinite(Number(calculation.rollTubeLength))
    ? `Tubo: ${formatDecimal(calculation.rollTubeLength)} cm`
    : 'Tubo: pendiente';
  const chain = variant.includes('MOTOR')
    ? 'Cadena: no lleva'
    : Number.isFinite(Number(calculation.chainLength)) && calculation.chainLength !== null
      ? `Cadena: ${formatDecimal(calculation.chainLength)} cm`
      : 'Cadena: pendiente';

  return (
    <>
      <strong>CAD manual</strong>
      <small>{tube} · {chain}</small>
      {calculation.chainRingLength != null && <small>Anillo cerrado: {formatDecimal(calculation.chainRingLength)} cm · {awning?.heraChainColor || 'Color pendiente'} · {calculation.chainRingCode || 'Referencia pendiente'}</small>}
      <small>Empate: {join ? controlLabel(join) : 'Sin indicar'}</small>
      {calculation.specialTubeRequired && <small>Tubo especial · cambiar presupuesto</small>}
    </>
  );
}

function ReservationPreview({ rows }: { rows: ReturnType<typeof groupMaterialRows> }) {
  const ofCount = new Set(rows.map((row) => row.of).filter(Boolean)).size;
  return (
    <div className="rps-result-preview">
      <header className="rps-result-summary">
        <span className="rps-result-icon"><FileSpreadsheet aria-hidden="true" /></span>
        <span><strong>Material para reservar</strong><small>{rows.length} {rows.length === 1 ? 'línea agrupada' : 'líneas agrupadas'} por OF y artículo</small></span>
        <strong className="rps-result-of-count">{ofCount} {ofCount === 1 ? 'OF' : 'OFs'}</strong>
      </header>
      <p className="rps-result-note">Las piezas que también aparecen en Estructuras explican cómo fabricar el toldo; esta tabla recoge únicamente qué reservar en RPS.</p>
      {rows.length === 0 ? <EmptyResult text="Todavía no hay líneas de reserva preparadas." /> : (
        <div className="rps-table-wrap"><table className="rps-table"><thead><tr><th>OF</th><th>Artículo</th><th>Descripción</th><th className="num">Cantidad total</th></tr></thead><tbody>
          {rows.map((row, index) => <tr key={`${row.of}-${row.code}-${index}`}><td>{row.of}</td><td className="code">{row.code}</td><td>{row.description || '-'}</td><td className="num">{formatDecimal(row.quantity)}</td></tr>)}
        </tbody></table></div>
      )}
    </div>
  );
}

function InfoBlock({ title, lines }: { title: string; lines: string[] }) {
  return <div className="structure-info-block"><h4>{title}</h4>{lines.map((line) => <p key={line}>{line}</p>)}</div>;
}

function EmptyResult({ text }: { text: string }) {
  return <p className="result-empty">{text}</p>;
}

function buildStatusText(state: CalculationState, calculation: Calculation | null) {
  if (state === 'validating') return 'Actualizando automáticamente…';
  if (state === 'error') return 'Hay datos pendientes de revisar';
  if (calculation) return 'Estructura, tela y reserva se actualizan al cambiar el pedido';
  return 'Esperando datos del pedido';
}
