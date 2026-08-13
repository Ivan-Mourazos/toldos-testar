import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FolderCheck, FolderCog, LoaderCircle, ShieldCheck, XCircle } from 'lucide-react';
import type { WorkflowDirectoryCheck, WorkflowReadiness, WorkflowSettings } from '../types';
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
  const [checking, setChecking] = useState(false);
  const [directoryCheck, setDirectoryCheck] = useState<WorkflowDirectoryCheck | null>(null);
  const formIsConfigured = form.productionEnabled && Boolean(form.reviewDirectory && form.planteamientosDirectory && form.rpsUploadDirectory);
  const formMatchesSaved = form.productionEnabled === settings.productionEnabled
    && form.reviewDirectory === settings.reviewDirectory
    && form.planteamientosDirectory === settings.planteamientosDirectory
    && form.rpsUploadDirectory === settings.rpsUploadDirectory;

  function updateForm(patch: Partial<WorkflowSettings>) {
    setForm((current) => ({ ...current, ...patch }));
    setDirectoryCheck(null);
  }

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

  async function checkDirectories() {
    setChecking(true);
    setDirectoryCheck(null);
    try {
      const response = await fetch('/api/workflow/check-directories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: form })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron comprobar las carpetas.');
      setDirectoryCheck(data);
      onToast(data.ok
        ? 'Las tres carpetas existen y permiten guardar archivos.'
        : 'Hay carpetas que no están accesibles. Revisa el detalle antes de generar archivos.', {
        tone: data.ok ? 'success' : 'warning',
        title: data.ok ? 'Carpetas comprobadas' : 'Revisión de carpetas'
      });
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron comprobar las carpetas.', { tone: 'error' });
    } finally {
      setChecking(false);
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
          onChange={(reviewDirectory) => updateForm({ reviewDirectory })}
          placeholder="/mnt/toldos/oficina-tecnica/{YYYY}/TOLDOS"
        />
        <RouteField
          step="02"
          title="Planteamientos generados"
          description="Aquí guarda Generar archivos el PDF definitivo PEDIDO-1.pdf. Aprobar por sí solo no escribe aquí."
          value={form.planteamientosDirectory}
          onChange={(planteamientosDirectory) => updateForm({ planteamientosDirectory })}
          placeholder="/mnt/toldos/planteamientos/{YYYY}"
        />
        <RouteField
          step="03"
          title="Subida de material"
          description="Aquí guarda Generar archivos un Excel de reserva por cada OF. Aprobar por sí solo no escribe aquí."
          value={form.rpsUploadDirectory}
          onChange={(rpsUploadDirectory) => updateForm({ rpsUploadDirectory })}
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
            onChange={(event) => updateForm({ productionEnabled: event.target.checked })}
          />
          <span>{form.productionEnabled ? 'Activado' : 'Desactivado'}</span>
        </label>
      </div>

      {directoryCheck && (
        <div className={`workflow-directory-results ${directoryCheck.ok ? 'is-ok' : 'has-errors'}`}>
          <header>
            {directoryCheck.ok ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
            <div><strong>{directoryCheck.ok ? 'Acceso de escritura confirmado' : 'Hay carpetas que necesitan atención'}</strong><small>Comprobación realizada desde el servidor.</small></div>
          </header>
          <div className="workflow-directory-list">
            {directoryCheck.directories.map((directory) => (
              <div key={directory.key} className={directory.ok ? 'is-ok' : 'has-error'}>
                {directory.ok ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
                <span><strong>{directory.label}</strong><small>{directory.ok ? directory.path : directory.error}</small></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="workflow-settings-footer">
        <div className={`workflow-ready ${directoryCheck?.ok ? 'is-ready' : ''}`}>
          {directoryCheck?.ok ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
          <span>{directoryCheck?.ok
            ? 'Carpetas comprobadas'
            : !formIsConfigured
              ? 'Completa las rutas y activa la generación'
              : !formMatchesSaved
                ? 'Hay cambios sin guardar ni comprobar'
                : readiness.productionReady
                  ? 'Rutas guardadas · falta comprobar el acceso'
                  : 'La generación sigue desactivada'}</span>
        </div>
        <div className="workflow-settings-actions">
          <button className="ghost-button" type="button" disabled={saving || checking || !formIsConfigured} onClick={() => void checkDirectories()}>
            {checking ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <FolderCheck aria-hidden="true" />}
            {checking ? 'Comprobando…' : 'Comprobar carpetas'}
          </button>
          <button className="primary-button" type="button" disabled={saving || checking} onClick={save}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
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
