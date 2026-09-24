import React, { useState } from 'react';
import { Save, Undo2 } from 'lucide-react';
import { SelectField } from './SelectField';
import { TextField } from './TextField';
import type { SaveDraftResult } from '../hooks/useParameters';

type Props = {
  dirty: boolean;
  saving: boolean;
  technicians: string[];
  onDiscard: () => void;
  onSave: (updatedBy: string, reason: string) => Promise<SaveDraftResult>;
  onResult: (result: SaveDraftResult) => void;
};

// Los cambios de Parámetros son un borrador de este puesto hasta que se
// guardan para todos, con quién y por qué (queda en el historial).
export function ParametersSaveBar({ dirty, saving, technicians, onDiscard, onSave, onResult }: Props) {
  const [open, setOpen] = useState(false);
  const [updatedBy, setUpdatedBy] = useState('');
  const [reason, setReason] = useState('');
  if (!dirty) return null;

  async function save() {
    const result = await onSave(updatedBy, reason.trim());
    onResult(result);
    if (result.status === 'saved') {
      setOpen(false);
      setReason('');
    }
  }

  return (
    <>
      <div className="parameters-save-bar panel-3d" role="status">
        <div>
          <strong>Cambios sin guardar</strong>
          <span>Solo los ves tú. Los pedidos se siguen calculando con los parámetros guardados.</span>
        </div>
        <div className="parameters-save-actions">
          <button className="ghost-button" type="button" disabled={saving} onClick={onDiscard}><Undo2 aria-hidden="true" />Descartar</button>
          <button className="primary-button" type="button" disabled={saving} onClick={() => setOpen(true)}><Save aria-hidden="true" />Guardar para todos</button>
        </div>
      </div>
      {open && (
        <div className="parameters-save-backdrop">
          <div className="parameters-save-dialog panel-3d" role="dialog" aria-modal="true" aria-labelledby="parameters-save-title">
            <h2 id="parameters-save-title">Guardar para todos los puestos</h2>
            <p>Los pedidos nuevos se calcularán con estos valores. Queda registrado quién y por qué, y se puede volver atrás desde el historial.</p>
            <SelectField label="Quién hace el cambio" value={updatedBy} options={technicians} placeholder="Elegir técnico…" onChange={setUpdatedBy} />
            <TextField label="Motivo" value={reason} placeholder="Por ejemplo: margen de caída confirmado por OT" onChange={setReason} />
            <div className="parameters-save-actions">
              <button className="ghost-button" type="button" disabled={saving} onClick={() => setOpen(false)}>Cancelar</button>
              <button className="primary-button" type="button" disabled={saving || !updatedBy || !reason.trim()} onClick={() => void save()}>
                <Save aria-hidden="true" />{saving ? 'Guardando…' : 'Guardar para todos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
