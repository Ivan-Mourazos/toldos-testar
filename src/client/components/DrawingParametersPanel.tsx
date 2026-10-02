import { AlertTriangle, ArrowDown, ArrowUp, ClipboardPaste, ImagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { DrawingCondition, DrawingConditionField, DrawingParameters, DrawingVariant } from '../types';
import {
  drawingConditionLabels, drawingConditionNeedsReview, drawingConditionOptions, drawingConditionShownValue, drawingConditionValueLabel
} from '../../domain/drawingCatalog.js';
import { controlLabel } from './controlLabels';
import { LoQueSaleHoy } from './LoQueSaleHoy';
import { SegmentedField } from './SegmentedField';

type ConditionOption = { field: DrawingConditionField; label: string; values: string[] };
const USES = { manual: 'Solo a mano', auto: 'Automático cuando…' } as const;

// Parámetros › un modelo › Dibujos (Iván, 02/10/2026): arriba «Lo que sale hoy»; debajo, los dibujos
// del taller, cada uno con su imagen y «Cómo se usa»: «Solo a mano» (se elige en la tarjeta) o
// «Automático cuando…» con condiciones de valores reales del modelo (también se elige a mano).
export function DrawingParametersPanel({ model, parameters, onChange, onReset }: {
  model: string;
  parameters: DrawingParameters;
  onChange: (parameters: DrawingParameters) => void;
  onReset: () => void;
}) {
  const variants = parameters.byModel[model] || [];
  const conditionOptions = drawingConditionOptions(model) as ConditionOption[];

  function commit(next: DrawingVariant[]) {
    const byModel = { ...parameters.byModel };
    if (next.length) byModel[model] = next;
    else delete byModel[model];
    onChange({ byModel });
  }

  function update(id: string, patch: Partial<DrawingVariant>) {
    commit(variants.map((variant) => variant.id === id ? { ...variant, ...patch } : variant));
  }

  // Un dibujo nuevo empieza «Solo a mano»: no cambia ningún PDF hasta que se elige o se pasa a automático.
  function add() {
    commit([...variants, {
      id: `${model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name: variants.length ? `Dibujo ${variants.length + 1}` : 'Dibujo general',
      enabled: true,
      usage: 'manual',
      image: null,
      conditions: []
    }]);
  }

  return <section className="drawing-parameters panel-3d panel-vidrio" aria-labelledby="drawing-parameters-title">
    <header className="drawing-parameters-heading">
      <div>
        <span className="section-kicker">Dibujos · {controlLabel(model)}</span>
        <h2 id="drawing-parameters-title">Dibujos</h2>
        <p>El dibujo de la web de cada variante y los dibujos del taller que lo sustituyen. Una imagen puesta en un toldo del pedido manda sobre todos.</p>
      </div>
      <div className="drawing-parameters-actions">
        {variants.length > 0 && <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Vaciar dibujos</button>}
        <button className="primary-button" type="button" onClick={add}><Plus aria-hidden="true" />Añadir dibujo</button>
      </div>
    </header>

    <LoQueSaleHoy model={model} drawings={parameters} />

    <h3 className="drawing-workshop-title">Dibujos del taller</h3>
    <ol className="drawing-steps" aria-label="Cómo se usa">
      <li><strong>Añade un dibujo</strong> y ponle su imagen (archivo o pegar).</li>
      <li><strong>Elige cómo se usa</strong>: «Solo a mano» sale si se elige en la tarjeta del toldo; «Automático cuando…» sale solo cuando el toldo cumple sus condiciones (sin condiciones, siempre) y también se puede elegir a mano.</li>
      <li><strong>Pulsa «Guardar»</strong> en la barra del modelo: hasta entonces solo lo ves tú.</li>
    </ol>

    {variants.length === 0 ? <button className="drawing-empty" type="button" onClick={add}>
      <ImagePlus aria-hidden="true" />
      <strong>Añadir el primer dibujo de {controlLabel(model)}</strong>
      <span>Un dibujo propio del taller para elegirlo en la tarjeta o para que salga solo en algunos toldos.</span>
    </button> : <div className="drawing-rule-list">
      {variants.map((variant, index) => <DrawingRuleCard
        key={variant.id}
        model={model}
        conditionOptions={conditionOptions}
        variant={variant}
        index={index}
        canMoveDown={index < variants.length - 1}
        onChange={(patch) => update(variant.id, patch)}
        onDelete={() => commit(variants.filter((item) => item.id !== variant.id))}
        onMove={(direction) => {
          const target = index + direction;
          if (target < 0 || target >= variants.length) return;
          const next = [...variants];
          [next[index], next[target]] = [next[target], next[index]];
          commit(next);
        }}
      />)}
    </div>}
  </section>;
}

function usageHint(variant: DrawingVariant) {
  if (variant.usage === 'manual') return 'Sale solo si se elige en la tarjeta del toldo («Dibujo de confección»).';
  return variant.conditions.length
    ? 'Sale solo cuando el toldo cumple todo lo de abajo. También se puede elegir a mano en la tarjeta.'
    : 'Sin condiciones: sale siempre en este modelo. También se puede elegir a mano en la tarjeta.';
}

function DrawingRuleCard({ model, conditionOptions, variant, index, canMoveDown, onChange, onDelete, onMove }: {
  model: string;
  conditionOptions: ConditionOption[];
  variant: DrawingVariant;
  index: number;
  canMoveDown: boolean;
  onChange: (patch: Partial<DrawingVariant>) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pasteArea = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function importImage(blob: Blob) {
    if (busy) return;
    setError(''); setBusy(true);
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) throw new Error('Selecciona una imagen PNG, JPG o WebP.');
      if (blob.size > 20 * 1024 * 1024) throw new Error('La imagen supera los 20 MB.');
      const bitmap = await createImageBitmap(blob);
      try {
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No se pudo preparar la imagen.');
        context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        let data = canvas.toDataURL('image/jpeg', 0.9);
        for (const quality of [0.8, 0.65, 0.5, 0.35]) {
          if (data.length <= 600000) break;
          data = canvas.toDataURL('image/jpeg', quality);
        }
        if (data.length > 600000) throw new Error('La imagen sigue siendo demasiado grande. Recórtala o elige otra.');
        onChange({ image: data });
      } finally { bitmap.close(); }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo leer la imagen.');
    } finally { setBusy(false); }
  }

  async function paste() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((value) => ['image/png', 'image/jpeg', 'image/webp'].includes(value));
        if (type) { await importImage(await item.getType(type)); return; }
      }
      setError('El portapapeles no contiene una imagen.');
    } catch {
      setError('Haz clic en la ficha y pulsa Ctrl+V para pegar la imagen.');
      pasteArea.current?.focus();
    }
  }

  const setConditions = (conditions: DrawingCondition[]) => onChange({ conditions });

  return <article className={`drawing-rule ${variant.enabled ? '' : 'is-disabled'}`} ref={pasteArea} tabIndex={0} onPaste={(event) => {
    const file = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'))?.getAsFile();
    if (file) { event.preventDefault(); void importImage(file); }
  }}>
    <div className="drawing-rule-rank">
      <button type="button" aria-label="Subir en el orden" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden="true" /></button>
      <span>{String(index + 1).padStart(2, '0')}</span><small title="Si dos dibujos automáticos encajan igual, sale el primero">orden</small>
      <button type="button" aria-label="Bajar en el orden" disabled={!canMoveDown} onClick={() => onMove(1)}><ArrowDown aria-hidden="true" /></button>
    </div>
    <div className="drawing-rule-image">
      {variant.image ? <img src={variant.image} alt={`Dibujo ${variant.name}`} /> : <div><ImagePlus aria-hidden="true" /><span>Sin imagen</span></div>}
      <div className="drawing-image-actions">
        <button className="ghost-button" type="button" disabled={busy} onClick={() => input.current?.click()}><ImagePlus aria-hidden="true" />Importar</button>
        <button className="ghost-button" type="button" disabled={busy} onClick={() => void paste()}><ClipboardPaste aria-hidden="true" />Pegar</button>
      </div>
      <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importImage(file); }} />
    </div>
    <div className="drawing-rule-content">
      <div className="drawing-rule-title">
        <label>Nombre del dibujo<input value={variant.name} onChange={(event) => onChange({ name: event.target.value })} /></label>
        <label className="drawing-enabled" title="Si lo desactivas, se guarda pero no sale en ningún PDF ni en la tarjeta"><input type="checkbox" checked={variant.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} />Se usa</label>
        <button className="icon-button danger" type="button" aria-label={`Eliminar ${variant.name}`} onClick={onDelete}><Trash2 aria-hidden="true" /></button>
      </div>
      <div className="drawing-usage">
        <SegmentedField label="Cómo se usa" value={USES[variant.usage]} options={[USES.manual, USES.auto]} onChange={(value) => onChange({ usage: value === USES.manual ? 'manual' : 'auto' })} />
        <p className="drawing-usage-hint">{usageHint(variant)}</p>
      </div>
      {variant.usage === 'auto' && <>
        <div className="drawing-condition-heading">
          <div><strong>Condiciones</strong><span>{variant.conditions.length ? 'Tiene que cumplirlas todas.' : 'Ninguna: sale siempre.'}</span></div>
          <button className="ghost-button" type="button" disabled={!conditionOptions.length}
            onClick={() => setConditions([...variant.conditions, { field: conditionOptions[0].field, value: conditionOptions[0].values[0] }])}>
            <Plus aria-hidden="true" />Añadir condición
          </button>
        </div>
        {variant.conditions.length > 0 && <div className="drawing-conditions">{variant.conditions.map((condition, conditionIndex) => <ConditionRow
          key={`${conditionIndex}-${condition.field}`}
          model={model}
          options={conditionOptions}
          condition={condition}
          onChange={(next) => setConditions(variant.conditions.map((item, i) => i === conditionIndex ? next : item))}
          onRemove={() => setConditions(variant.conditions.filter((_, i) => i !== conditionIndex))}
        />)}</div>}
      </>}
      {busy && <small role="status">Preparando imagen…</small>}
      {error && <small className="drawing-error" role="alert">{error}</small>}
    </div>
  </article>;
}

// Una condición: campo y valor en desplegables con lo que tiene de verdad este modelo. Lo guardado
// antes que no case sale con «(revisar)» y un aviso; se sigue usando igual hasta que se cambie.
function ConditionRow({ model, options, condition, onChange, onRemove }: {
  model: string;
  options: ConditionOption[];
  condition: DrawingCondition;
  onChange: (condition: DrawingCondition) => void;
  onRemove: () => void;
}) {
  const option = options.find((item) => item.field === condition.field);
  const review = drawingConditionNeedsReview(model, condition);
  const shown = drawingConditionShownValue(model, condition);
  const label = drawingConditionLabels[condition.field as keyof typeof drawingConditionLabels] ?? condition.field;
  return <div className={`drawing-condition${review ? ' needs-review' : ''}`}>
    <select aria-label="Campo de la condición" value={condition.field} onChange={(event) => {
      const field = event.target.value as DrawingConditionField;
      onChange({ field, value: options.find((item) => item.field === field)?.values[0] ?? '' });
    }}>
      {options.map((item) => <option key={item.field} value={item.field}>{item.label}</option>)}
      {!option && <option value={condition.field}>{label} (revisar)</option>}
    </select>
    <span>=</span>
    <select aria-label={`Valor de ${label}`} value={shown} onChange={(event) => onChange({ field: condition.field, value: event.target.value })}>
      {(option?.values ?? []).map((value) => <option key={value} value={value}>{controlLabel(drawingConditionValueLabel(value))}</option>)}
      {review && <option value={shown}>{shown || 'Sin valor'} (revisar)</option>}
    </select>
    <button className="icon-button" type="button" aria-label="Quitar condición" onClick={onRemove}><Trash2 aria-hidden="true" /></button>
    {review && <small className="drawing-condition-review" role="note"><AlertTriangle aria-hidden="true" />Revisar: «{shown || 'sin valor'}» no es un valor de {label} en este modelo. Elige uno de la lista.</small>}
  </div>;
}
