import React, { useEffect, useRef, useState } from 'react';
import type { Awning, StructureEditorState, StructureRow } from '../types';
import { formatDecimal } from '../constants';

type Article = { code: string; description: string; unitCode: string };
type Props = { awning: Awning; editor: StructureEditorState; armCount?: number; onUpdate: (id: string, patch: Partial<Awning>) => void };
const armModels = ['ANTICA', 'GALICIA', 'PUNTO RECTO', 'MONOBLOCK 350', 'AGATA BOX'];

export function StructureEditor({ awning, editor, armCount, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<StructureRow[]>([]);
  const [signature, setSignature] = useState('');
  const [searchRow, setSearchRow] = useState('');
  const [error, setError] = useState('');
  const lastUnits = useRef(new Map<string, number>());
  const changedDuringEdit = editing && signature !== editor.signature;
  const updateRow = (id: string, patch: Partial<StructureRow>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  const begin = () => { lastUnits.current = new Map(editor.rows.map((row) => [row.id, row.units])); setRows(structuredClone(editor.rows)); setSignature(editor.signature); setError(''); setEditing(true); };
  function save() {
    if (changedDuringEdit) { setError('El cálculo cambió mientras editabas. Cancela y vuelve a abrir el editor para revisarlo.'); return; }
    if (rows.some((row) => !row.name.trim() || !(row.units > 0) || !Number.isFinite(row.reservationQuantity) || row.reservationQuantity < 0 || (row.length !== null && (!Number.isFinite(row.length) || row.length < 0)))) {
      setError('Completa las descripciones, unidades y cantidades antes de aplicar.'); return;
    }
    onUpdate(awning.id, { structureEdit: { signature, rows } });
    setEditing(false); setSearchRow('');
  }
  function addRow() {
    const num = Math.max(0, ...rows.map((row) => row.num)) + 1;
    const row: StructureRow = { id: 'added:' + crypto.randomUUID(), num, name: '', reference: null, units: 1, length: null, reservationQuantity: 1, unitCode: '', kind: 'piece' };
    lastUnits.current.set(row.id, row.units);
    setRows((current) => [...current, row]); setSearchRow(row.id);
  }
  return <section className="structure-editor" aria-label="Edición del despiece">
    <div className="structure-editor-toolbar">
      {!editing ? <button type="button" onClick={begin}>Editar despiece</button> : <><button type="button" onClick={save}>{editor.stale ? 'Confirmar despiece revisado' : 'Aplicar al planteamiento y reserva'}</button><button type="button" onClick={() => { setEditing(false); setSearchRow(''); }}>Cancelar</button></>}
      {editor.modified && !editing && <button type="button" onClick={() => { if (window.confirm('¿Eliminar las modificaciones del despiece y recuperar el cálculo automático?')) onUpdate(awning.id, { structureEdit: null }); }}>Restaurar cálculo automático</button>}
      {armModels.includes(awning.model) && <label>Número de brazos por toldo <select disabled={editing} value={awning.model === 'ANTICA' ? awning.structureArmCount ?? '' : awning.armCount ?? ''} onChange={(event) => {
        const count = event.target.value ? Number(event.target.value) : null;
        onUpdate(awning.id, awning.model === 'ANTICA' ? { structureArmCount: count } : { armCount: count });
      }}><option value="">Automático ({armCount ?? '-'})</option>{(awning.model === 'GALICIA' ? [2, 3] : [2, 3, 4]).map((count) => <option key={count} value={count}>{count}</option>)}</select></label>}
      {editor.modified && <strong className="structure-edited-badge">Despiece modificado</strong>}
    </div>
    {editor.stale && <p className="structure-editor-warning" role="alert">Han cambiado los datos del toldo. La reserva está bloqueada hasta revisar las modificaciones. Compara cada fila con el cálculo actual o restaura el cálculo automático.</p>}
    {editing && <>
      <p>Las unidades son piezas del despiece. «Reserva RPS» es la cantidad de almacén: puede ser distinta y no cambia al editar la longitud de corte. Para cambiar los brazos y recalcular sus piezas, usa el selector superior antes de editar las filas.</p>
      {error && <p role="alert" className="structure-editor-warning">{error}</p>}
      <div className="structure-edit-scroll"><table className="despiece-table structure-edit-table"><thead><tr><th>Nº</th><th>Pieza / artículo RPS</th><th>Unidades</th><th>Corte (cm)</th><th>Reserva RPS</th>{editor.stale && <th>Cálculo actual</th>}<th>Acciones</th></tr></thead>
        <tbody>{rows.map((row) => { const original = editor.baseRows.find((item) => item.id === row.id); const changed = !original || ['name', 'reference', 'units', 'length', 'reservationQuantity'].some((key) => row[key as keyof StructureRow] !== original[key as keyof StructureRow]); return <tr key={row.id} className={changed ? 'structure-row-modified' : ''}>
          <td>{row.kind === 'anchoring' ? 'Anclaje' : row.num}{changed && <small>Modificada</small>}</td>
          <td><input aria-label={'Descripción fila ' + row.num} value={row.name} onChange={(event) => updateRow(row.id, { name: event.target.value })} /><small>{row.reference || 'Sin referencia de reserva'}</small><button type="button" onClick={() => setSearchRow(row.id)}>Buscar / sustituir en RPS</button></td>
          <td><input aria-label={'Unidades fila ' + row.num} type="number" min="0.001" step="any" value={Number.isFinite(row.units) ? row.units : ''} disabled={awning.model === 'ANTICA' && original?.name === 'BRAZO ANTICA'} onChange={(event) => { const units = event.target.value === '' ? NaN : Number(event.target.value); const previous = lastUnits.current.get(row.id) ?? row.units; updateRow(row.id, { units, reservationQuantity: units > 0 && previous > 0 && row.reservationQuantity > 0 ? Math.round(row.reservationQuantity * units / previous * 1000000) / 1000000 : row.reservationQuantity }); if (units > 0 && Number.isFinite(units)) lastUnits.current.set(row.id, units); }} /></td>
          <td><input aria-label={'Longitud fila ' + row.num} type="number" min="0" step="any" value={row.length ?? ''} onChange={(event) => updateRow(row.id, { length: event.target.value === '' ? null : Number(event.target.value) })} /></td>
          <td><input aria-label={'Reserva fila ' + row.num} type="number" min="0" step="any" value={Number.isFinite(row.reservationQuantity) ? row.reservationQuantity : ''} onChange={(event) => updateRow(row.id, { reservationQuantity: event.target.value === '' ? NaN : Number(event.target.value) })} /><small>{row.unitCode || (row.reservationQuantity === 0 ? 'No se reserva' : 'Cantidad de almacén')}</small></td>
          {editor.stale && <td>{original ? <>{original.name}<br />{original.reference || 'Sin referencia'}<br />{formatDecimal(original.units)} un. · corte {formatDecimal(original.length)} · reserva {formatDecimal(original.reservationQuantity)}</> : 'No existe en el cálculo actual'}</td>}
          <td><button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>Eliminar</button></td>
        </tr>; })}</tbody></table></div>
      <button type="button" disabled={rows.length >= 100} onClick={addRow}>Añadir pieza</button>
      {searchRow && <ArticleSearch key={searchRow} onClose={() => setSearchRow('')} onSelect={(article) => {
        const row = rows.find((item) => item.id === searchRow);
        if (row) updateRow(row.id, { reference: article.code, name: article.description, unitCode: article.unitCode, reservationQuantity: row.reservationQuantity || row.units });
        setSearchRow('');
      }} />}
    </>}
  </section>;
}

function ArticleSearch({ onSelect, onClose }: { onSelect: (article: Article) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Article[]>([]);
  const [status, setStatus] = useState('Escribe una referencia o descripción, por ejemplo: manivela blanca.');
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!query.trim()) { setItems([]); setStatus('Escribe una referencia o descripción.'); return; }
      setStatus('Consultando RPS…'); setItems([]);
      try {
        const response = await fetch('/api/catalog/articles?q=' + encodeURIComponent(query), { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo consultar RPS.');
        if (controller.signal.aborted) return;
        setItems(data.items); setStatus(data.items.length ? 'Artículos activos de RPS. Comprueba color, medida y unidad de almacén.' : 'No se encontraron artículos. Prueba con otra descripción o referencia.');
      } catch (error) { if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'No se pudo consultar RPS.'); }
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);
  return <div className="structure-article-search" role="dialog" aria-label="Buscar artículo en RPS">
    <header><strong>Buscar artículo en RPS</strong><button type="button" onClick={onClose}>Cerrar</button></header>
    <input aria-label="Referencia o descripción de artículo" placeholder="Referencia, manivela blanca, brazo…" value={query} onChange={(event) => { setItems([]); setQuery(event.target.value); }} />
    <p role="status">{status}</p><ul>{items.map((item) => <li key={item.code}><button type="button" onClick={() => onSelect(item)}><strong>{item.code}</strong><span>{item.description}</span><small>Unidad RPS: {item.unitCode || 'No indicada'}</small></button></li>)}</ul>
  </div>;
}
