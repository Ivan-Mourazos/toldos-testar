import { ArrowDown, ArrowUp, ClipboardPaste, ImagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { DrawingConditionField, DrawingParameters, DrawingVariant } from '../types';

const fields: { value: DrawingConditionField; label: string; hint: string }[] = [
  { value: 'device', label: 'Accionamiento', hint: 'MOTOR, MAQ. INTERIOR…' },
  { value: 'placement', label: 'Colocación', hint: 'FRONTAL, TECHO…' },
  { value: 'submodel', label: 'Variante / submodelo', hint: 'COFRE, OPEN…' },
  { value: 'machineSide', label: 'Lado de mando', hint: 'IZQUIERDA, DERECHA' },
  { value: 'supportSystem', label: 'Sistema de anclaje', hint: 'Nombre del anclaje' },
  { value: 'tubeLoad', label: 'Tubo de carga', hint: 'EVO 80, UNIVERS 280…' },
  { value: 'hasValance', label: 'Lleva bamba', hint: 'SI o NO' },
  { value: 'valanceCurve', label: 'Curva de bamba', hint: 'RECTA, ONDA…' },
  { value: 'curtainHasWindow', label: 'Cortina con ventana', hint: 'SI o NO' },
  { value: 'curtainFinish', label: 'Acabado cortina', hint: 'NORMAL, VELCRO, TUBO' },
  { value: 'curtainSupport', label: 'Soporte cortina', hint: 'UNIVERSAL 3 AGUJEROS…' },
  { value: 'electraSupport', label: 'Soporte Electra', hint: 'SOPORTE ELIT VERTICAL…' },
  { value: 'irisGuideType', label: 'Guía Iris', hint: 'ESTÁNDAR, PEQUEÑA…' },
  { value: 'irisGuideFixing', label: 'Fijación guía Iris', hint: 'PARED o TECHO' },
  { value: 'irisWindBlock', label: 'Bloqueo viento Iris', hint: 'SI o NO' },
  { value: 'anticaVariant', label: 'Variante Antica', hint: 'TUBO 30X10…' },
  { value: 'anticaMeasurementMode', label: 'Medición Antica', hint: 'BASE o FINISHED' },
  { value: 'fabricDiagramOverride', label: 'Trabajo especial', hint: 'TOLDO-VELCRO, SUPLEMENTO…' }
];

export function DrawingParametersPanel({ model, parameters, onChange, onReset }: {
  model: string;
  parameters: DrawingParameters;
  onChange: (parameters: DrawingParameters) => void;
  onReset: () => void;
}) {
  const variants = parameters.byModel[model] || [];

  function commit(next: DrawingVariant[]) {
    const byModel = { ...parameters.byModel };
    if (next.length) byModel[model] = next;
    else delete byModel[model];
    onChange({ byModel });
  }

  function update(id: string, patch: Partial<DrawingVariant>) {
    commit(variants.map((variant) => variant.id === id ? { ...variant, ...patch } : variant));
  }

  function add() {
    commit([...variants, {
      id: `${model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name: variants.length ? `Dibujo ${variants.length + 1}` : 'Dibujo general',
      enabled: true,
      image: null,
      conditions: []
    }]);
  }

  return <section className="drawing-parameters" aria-labelledby="drawing-parameters-title">
    <header className="drawing-parameters-heading">
      <div>
        <span className="section-kicker">Biblioteca del taller · {model}</span>
        <h2 id="drawing-parameters-title">Dibujos por configuración</h2>
        <p>El PDF elige automáticamente la ficha más específica que coincida. La imagen puesta manualmente en un pedido siempre manda.</p>
      </div>
      <div className="drawing-parameters-actions">
        {variants.length > 0 && <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Vaciar dibujos</button>}
        <button className="primary-button" type="button" onClick={add}><Plus aria-hidden="true" />Añadir dibujo</button>
      </div>
    </header>

    {variants.length === 0 ? <button className="drawing-empty" type="button" onClick={add}>
      <ImagePlus aria-hidden="true" />
      <strong>Añadir el primer dibujo de {model}</strong>
      <span>Puede ser el dibujo general del modelo; después añadiremos excepciones con condiciones.</span>
    </button> : <div className="drawing-rule-list">
      {variants.map((variant, index) => <DrawingRuleCard
        key={variant.id}
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

function DrawingRuleCard({ variant, index, canMoveDown, onChange, onDelete, onMove }: {
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

  return <article className={`drawing-rule ${variant.enabled ? '' : 'is-disabled'}`} ref={pasteArea} tabIndex={0} onPaste={(event) => {
    const file = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'))?.getAsFile();
    if (file) { event.preventDefault(); void importImage(file); }
  }}>
    <div className="drawing-rule-rank">
      <button type="button" aria-label="Subir prioridad" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden="true" /></button>
      <span>{String(index + 1).padStart(2, '0')}</span><small>prioridad</small>
      <button type="button" aria-label="Bajar prioridad" disabled={!canMoveDown} onClick={() => onMove(1)}><ArrowDown aria-hidden="true" /></button>
    </div>
    <div className="drawing-rule-image">
      {variant.image ? <img src={variant.image} alt={`Dibujo ${variant.name}`} /> : <div><ImagePlus aria-hidden="true" /><span>Sin imagen</span></div>}
      <div className="drawing-image-actions">
        <button type="button" disabled={busy} onClick={() => input.current?.click()}><ImagePlus aria-hidden="true" />Importar</button>
        <button type="button" disabled={busy} onClick={() => void paste()}><ClipboardPaste aria-hidden="true" />Pegar</button>
      </div>
      <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importImage(file); }} />
    </div>
    <div className="drawing-rule-content">
      <div className="drawing-rule-title">
        <label>Nombre del dibujo<input value={variant.name} onChange={(event) => onChange({ name: event.target.value })} /></label>
        <label className="drawing-enabled"><input type="checkbox" checked={variant.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} />Activo</label>
        <button className="icon-button danger" type="button" aria-label={`Eliminar ${variant.name}`} onClick={onDelete}><Trash2 aria-hidden="true" /></button>
      </div>
      <div className="drawing-condition-heading"><div><strong>Se usa cuando…</strong><span>{variant.conditions.length ? 'deben cumplirse todas las condiciones' : 'sin condiciones: dibujo general del modelo'}</span></div>
        <button type="button" onClick={() => onChange({ conditions: [...variant.conditions, { field: 'device', value: 'MOTOR' }] })}><Plus aria-hidden="true" />Condición</button>
      </div>
      {variant.conditions.length > 0 && <div className="drawing-conditions">{variant.conditions.map((condition, conditionIndex) => {
        const meta = fields.find((field) => field.value === condition.field) || fields[0];
        return <div className="drawing-condition" key={`${conditionIndex}-${condition.field}`}>
          <select aria-label="Campo de la condición" value={condition.field} onChange={(event) => onChange({ conditions: variant.conditions.map((item, index) => index === conditionIndex ? { ...item, field: event.target.value as DrawingConditionField } : item) })}>
            {fields.map((field) => <option value={field.value} key={field.value}>{field.label}</option>)}
          </select>
          <span>=</span>
          <input aria-label={`Valor de ${meta.label}`} value={condition.value} placeholder={meta.hint} onChange={(event) => onChange({ conditions: variant.conditions.map((item, index) => index === conditionIndex ? { ...item, value: event.target.value } : item) })} />
          <button className="icon-button" type="button" aria-label="Quitar condición" onClick={() => onChange({ conditions: variant.conditions.filter((_, index) => index !== conditionIndex) })}><Trash2 aria-hidden="true" /></button>
        </div>;
      })}</div>}
      {busy && <small role="status">Preparando imagen…</small>}
      {error && <small className="drawing-error" role="alert">{error}</small>}
    </div>
  </article>;
}
