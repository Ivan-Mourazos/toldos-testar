import React, { useState } from 'react';
import { CheckCircle2, FolderCog, ShieldCheck } from 'lucide-react';
import type { WorkflowReadiness, WorkflowSettings } from '../types';
import type { Notify } from '../components/NotificationCenter';

export function SettingsView({
  settings,
  readiness,
  onSaved,
  onToast
}: {
  settings: WorkflowSettings;
  readiness: WorkflowReadiness;
  onSaved: (settings: WorkflowSettings, readiness: WorkflowReadiness) => void;
  onToast: Notify;
}) {
  const [form, setForm] = useState<WorkflowSettings>(settings);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch('/api/workflow/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la configuración.');
      setForm(data.settings);
      onSaved(data.settings, data.readiness);
      onToast(data.readiness.productionReady
        ? 'Rutas guardadas. Ya se pueden generar los archivos de pedidos aprobados.'
        : 'Rutas guardadas. La generación de archivos sigue deshabilitada.', {
        tone: 'success',
        title: 'Configuración guardada'
      });
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo guardar la configuración.', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-panel panel">
      <div className="workflow-heading">
        <div className="workflow-heading-icon"><FolderCog aria-hidden="true" /></div>
        <div>
          <span>Administración del flujo</span>
          <h2>Rutas de trabajo</h2>
          <p>Estas rutas se guardan en el servidor y son comunes para todos los puestos. En Linux usa los puntos de montaje /mnt; en desarrollo Windows se admiten rutas UNC.</p>
        </div>
      </div>

      <div className="workflow-route-grid">
        <RouteField
          step="01"
          title="Pedidos para revisión"
          description="Aquí se guarda PEDIDO.pdf para revisar. El propio PDF contiene los datos editables que abre la bandeja compartida."
          value={form.reviewDirectory}
          onChange={(reviewDirectory) => setForm({ ...form, reviewDirectory })}
          placeholder="/mnt/toldos/oficina-tecnica/{YYYY}/TOLDOS"
        />
        <RouteField
          step="02"
          title="Planteamientos generados"
          description="Aquí guarda Generar archivos el PDF definitivo PEDIDO-1.pdf. Aprobar por sí solo no escribe aquí."
          value={form.planteamientosDirectory}
          onChange={(planteamientosDirectory) => setForm({ ...form, planteamientosDirectory })}
          placeholder="/mnt/toldos/planteamientos/{YYYY}"
        />
        <RouteField
          step="03"
          title="Subida de material"
          description="Aquí guarda Generar archivos un Excel de reserva por cada OF. Aprobar por sí solo no escribe aquí."
          value={form.rpsUploadDirectory}
          onChange={(rpsUploadDirectory) => setForm({ ...form, rpsUploadDirectory })}
          placeholder="/mnt/toldos/rps"
        />
      </div>

      <div className="workflow-production-switch">
        <div>
          <ShieldCheck aria-hidden="true" />
          <span><strong>Generación de archivos</strong><small>Habilita el segundo paso: PDF definitivo y Excel de reserva para pedidos ya aprobados.</small></span>
        </div>
        <label className="workflow-toggle">
          <input
            type="checkbox"
            checked={form.productionEnabled}
            onChange={(event) => setForm({ ...form, productionEnabled: event.target.checked })}
          />
          <span>{form.productionEnabled ? 'Activado' : 'Desactivado'}</span>
        </label>
      </div>

      <div className="workflow-settings-footer">
        {readiness.productionReady && (
          <div className="workflow-ready is-ready">
            <CheckCircle2 aria-hidden="true" />
            <span>Generación de archivos preparada</span>
          </div>
        )}
        <button className="primary-button" type="button" disabled={saving} onClick={save}>
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>
    </section>
  );
}

function RouteField({ step, title, description, value, onChange, placeholder }: {
  step: string;
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="workflow-route-card">
      <span className="workflow-step">{step}</span>
      <span className="workflow-route-copy"><strong>{title}</strong><small>{description}</small></span>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} spellCheck={false} />
    </label>
  );
}
