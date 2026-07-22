import React, { useState } from 'react';
import { AlertCircle, FileSpreadsheet, Layers3, Scissors } from 'lucide-react';
import type { Awning, Calculation, CalculationState } from '../types';
import { formatDecimal } from '../constants';
import { controlLabel, legacyModelName } from './controlLabels';

type Props = {
  calculation: Calculation | null;
  state: CalculationState;
  awnings: Awning[];
};

type ResultTab = 'structure' | 'fabric' | 'rps';

export function LiveResults({ calculation, state, awnings }: Props) {
  const [activeTab, setActiveTab] = useState<ResultTab>('structure');
  const [selectedStructure, setSelectedStructure] = useState('');
  const ofCards = calculation?.ofs.filter((ofBlock) => ofBlock.calculation) || [];
  const structureBlocks = ofCards.filter((ofBlock) => findAwning(ofBlock, awnings)?.workType !== 'FABRIC_ONLY' && ofBlock.despiece);
  const materialRows = groupMaterialRows(calculation?.ofs || []);
  const diagnostics = calculation?.diagnostics || [];
  const selectedBlock = structureBlocks.find((block) => blockKey(block) === selectedStructure) || structureBlocks[0];

  return (
    <section className="planning-results panel">
      <div className="section-header planning-results-header">
        <div>
          <h2>Planteamientos</h2>
          <span>{buildStatusText(state, calculation)}</span>
        </div>
        <div className="planning-result-counts">
          <span>{structureBlocks.length} estructuras</span>
          <span>{ofCards.length} telas</span>
          <span>{materialRows.length} líneas RPS</span>
        </div>
      </div>

      {diagnostics.length > 0 && (
        <ul className="diagnostics-list">
          {diagnostics.map((item, index) => (
            <li key={`${item.message}-${index}`} className={item.level === 'error' ? 'badge-danger' : 'badge-warn'}>
              <AlertCircle aria-hidden="true" />{item.message}
            </li>
          ))}
        </ul>
      )}

      <div className="planning-tabs" role="tablist" aria-label="Vistas del planteamiento">
        <ResultTabButton active={activeTab === 'structure'} icon={<Layers3 />} label="Estructuras" count={structureBlocks.length} onClick={() => setActiveTab('structure')} />
        <ResultTabButton active={activeTab === 'fabric'} icon={<Scissors />} label="Telas" count={ofCards.length} onClick={() => setActiveTab('fabric')} />
        <ResultTabButton active={activeTab === 'rps'} icon={<FileSpreadsheet />} label="Reserva RPS" count={materialRows.length} onClick={() => setActiveTab('rps')} />
      </div>

      {activeTab === 'structure' && <StructurePreview blocks={structureBlocks} awnings={awnings} selectedBlock={selectedBlock} onSelect={setSelectedStructure} />}
      {activeTab === 'fabric' && <FabricPreview blocks={ofCards} awnings={awnings} />}
      {activeTab === 'rps' && <ReservationPreview rows={materialRows} />}
    </section>
  );
}

function ResultTabButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} className={active ? 'active' : ''} onClick={onClick}>
      {icon}<span>{label}</span><strong>{count}</strong>
    </button>
  );
}

function StructurePreview({ blocks, awnings, selectedBlock, onSelect }: {
  blocks: Calculation['ofs'];
  awnings: Awning[];
  selectedBlock?: Calculation['ofs'][number];
  onSelect: (key: string) => void;
}) {
  if (!selectedBlock) return <EmptyResult text="Los trabajos de tela no generan planteamiento de estructura." />;
  const awning = findAwning(selectedBlock, awnings);
  const calc = selectedBlock.calculation!;

  return (
    <div className="structure-preview">
      <nav className="structure-selector" aria-label="Estructura que se muestra">
        {blocks.map((block, index) => {
          const item = findAwning(block, awnings);
          const active = blockKey(block) === blockKey(selectedBlock);
          return (
            <button key={blockKey(block)} type="button" className={active ? 'active' : ''} aria-pressed={active} onClick={() => onSelect(blockKey(block))}>
              <strong>{awningLetter(block.awningIndex ?? index)}</strong>
              <span>{controlLabel(item?.model || block.calculation?.model || '')}</span>
              <small>OF {block.of || 'sin OF'}</small>
            </button>
          );
        })}
      </nav>

      <article className="structure-sheet-preview">
        <header>
          <div><span>Estructura {awningLetter(selectedBlock.awningIndex ?? 0)}</span><h3>{controlLabel(awning?.model || calc.model)} {legacyModelName(awning?.model || calc.model) && <small>antes {legacyModelName(awning?.model || calc.model)}</small>}</h3></div>
          <div className="structure-sheet-meta"><span>OF</span><strong>{selectedBlock.of || '-'}</strong><span>Estado</span><strong className={calc.valid ? 'text-ok' : 'text-danger'}>{calc.valid ? 'Válido' : 'Revisar'}</strong></div>
        </header>
        <div className="structure-sheet-body">
          <div className="despiece-table-wrap">
            <table className="despiece-table">
              <thead><tr><th>Nº</th><th>Nombre pieza</th><th>Referencia</th><th className="num">Un.</th><th className="num">Longitud de corte</th></tr></thead>
              <tbody>{selectedBlock.despiece?.rows.map((row) => (
                <tr key={row.num}><td className="num">{row.num}</td><td>{row.name}</td><td className={row.reference ? 'code' : 'despiece-no-ref'}>{row.reference || 'Sin código de reserva'}</td><td className="num">{row.units}</td><td className="num">{row.length === null ? '-' : `${formatDecimal(row.length)} cm`}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <aside className="structure-sheet-side">
            <InfoBlock title="Datos de partida" lines={[`Frente ${awning?.width ?? '-'} cm`, `Salida ${awning?.projection ?? '-'} cm`]} />
            <InfoBlock title="Tela calculada" lines={[`${formatDecimal(calc.fabricWidth)} × ${formatDecimal(calc.fabricDrop)} cm`, `${formatDecimal(calc.fabricMl)} ml`]} />
            {selectedBlock.despiece?.anchoring && <InfoBlock title="Anclaje" lines={[selectedBlock.despiece.anchoring.name, `${selectedBlock.despiece.anchoring.reference || 'Sin referencia'} × ${selectedBlock.despiece.anchoring.units}`]} />}
          </aside>
        </div>
      </article>
    </div>
  );
}

function FabricPreview({ blocks, awnings }: { blocks: Calculation['ofs']; awnings: Awning[] }) {
  if (blocks.length === 0) return <EmptyResult text="Completa un elemento para preparar el planteamiento de telas." />;
  return (
    <div className="fabric-preview-table-wrap">
      <table className="fabric-preview-table">
        <thead><tr><th>Elemento</th><th>Modelo</th><th>OF</th><th>Tela</th><th className="num">Frente tela</th><th className="num">Salida paño</th><th className="num">Paños</th><th className="num">Total</th><th>Bamba</th></tr></thead>
        <tbody>{blocks.map((block, index) => {
          const awning = findAwning(block, awnings);
          const calc = block.calculation!;
          return (
            <tr key={blockKey(block)}>
              <td><strong className="result-letter">{awningLetter(block.awningIndex ?? index)}</strong></td>
              <td><strong>{controlLabel(awning?.model || calc.model)}</strong>{legacyModelName(awning?.model || calc.model) && <small>antes {legacyModelName(awning?.model || calc.model)}</small>}</td>
              <td>{block.of || '-'}</td><td className="code">{calc.fabricCode || '-'}</td>
              <td className="num">{formatDecimal(calc.fabricWidth)} cm</td><td className="num">{formatDecimal(calc.fabricDrop)} cm</td><td className="num">{calc.fabricPanels || '-'}</td><td className="num"><strong>{formatDecimal(calc.fabricMl)} ml</strong></td>
              <td>{Number(awning?.valanceHeight) > 0 ? `${formatDecimal(awning?.valanceHeight)} cm${calc.valanceFabricCode ? ` · ${calc.valanceFabricCode}` : ''}` : 'Sin bamba'}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

function ReservationPreview({ rows }: { rows: ReturnType<typeof groupMaterialRows> }) {
  return (
    <div className="reservation-preview">
      <p className="result-explanation"><FileSpreadsheet aria-hidden="true" /><span><strong>Material que se reservará.</strong> Se agrupa por OF y artículo. Es normal que algunas piezas también aparezcan en Estructuras: allí se explica cómo fabricar el toldo; aquí se indica qué reservar en RPS.</span></p>
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

function findAwning(ofBlock: Calculation['ofs'][number], awnings: Awning[]) {
  return awnings.find((item) => item.id === ofBlock.awningId)
    || (ofBlock.awningIndex !== undefined ? awnings[ofBlock.awningIndex] : undefined)
    || awnings.find((item) => item.of.trim() === ofBlock.of);
}

function blockKey(block: Calculation['ofs'][number]) {
  return block.awningId || `${block.awningIndex ?? ''}-${block.of}`;
}

function groupMaterialRows(ofs: Calculation['ofs']) {
  const rows = new Map<string, { of: string; description: string; code: string; quantity: number }>();
  for (const ofBlock of ofs) {
    for (const material of ofBlock.materials) {
      const key = `${ofBlock.of.trim().toUpperCase()}||${material.code.trim().toUpperCase()}`;
      const current = rows.get(key) || { of: ofBlock.of, description: material.description || '', code: material.code, quantity: 0 };
      current.quantity = material.aggregation === 'max'
        ? Math.round(Math.max(current.quantity, material.quantity) * 1000) / 1000
        : Math.round((current.quantity + material.quantity) * 1000) / 1000;
      rows.set(key, current);
    }
  }
  return Array.from(rows.values());
}

function awningLetter(index: number) {
  let number = index + 1;
  let label = '';
  while (number > 0) {
    number -= 1;
    label = String.fromCharCode(65 + (number % 26)) + label;
    number = Math.floor(number / 26);
  }
  return label;
}

function buildStatusText(state: CalculationState, calculation: Calculation | null) {
  if (state === 'validating') return 'Actualizando automáticamente…';
  if (state === 'error') return 'Hay datos pendientes de revisar';
  if (calculation) return 'Estructura, tela y reserva se actualizan al cambiar el pedido';
  return 'Esperando datos del pedido';
}
