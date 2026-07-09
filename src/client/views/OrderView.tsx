import React from 'react';
import {
  AlertCircle,
  Copy,
  FileSpreadsheet,
  Plus,
  Trash2
} from 'lucide-react';
import type { Awning, Calculation, CalculationState, Catalog, FieldKey } from '../types';
import { getModelProfile, formatDecimal } from '../constants';
import { TextField } from '../components/TextField';
import { NumberField } from '../components/NumberField';
import { SelectField } from '../components/SelectField';

export function OrderView({
  catalog,
  orderCode,
  customer,
  technician,
  fabric,
  structureColor,
  notes,
  awnings,
  calculation,
  calculationState,
  setOrderCode,
  setCustomer,
  setTechnician,
  setFabric,
  setStructureColor,
  setNotes,
  addAwning,
  duplicateAwning,
  removeAwning,
  updateAwning
}: {
  catalog: Catalog | null;
  orderCode: string;
  customer: string;
  technician: string;
  fabric: string;
  structureColor: string;
  notes: string;
  awnings: Awning[];
  calculation: Calculation | null;
  calculationState: CalculationState;
  setOrderCode: (value: string) => void;
  setCustomer: (value: string) => void;
  setTechnician: (value: string) => void;
  setFabric: (value: string) => void;
  setStructureColor: (value: string) => void;
  setNotes: (value: string) => void;
  addAwning: () => void;
  duplicateAwning: (id: string) => void;
  removeAwning: (id: string) => void;
  updateAwning: (id: string, patch: Partial<Awning>) => void;
}) {
  return (
    <>
      <section className="workbench">
        <div className="order-strip">
          <div className="panel-title">
            <FileSpreadsheet aria-hidden="true" />
            <h2>Pedido</h2>
          </div>
          <div className="fields-grid order-fields">
            <TextField label="Pedido" value={orderCode} onChange={setOrderCode} />
            <TextField label="Cliente" value={customer} onChange={setCustomer} />
            <TextField label="Técnico" value={technician} onChange={setTechnician} />
            <TextField label="Tela" value={fabric} onChange={setFabric} placeholder="ACR ADMIRAL" />
            <TextField label="Lacado" value={structureColor} onChange={setStructureColor} />
          </div>
          <label className="wide-field">
            <span>Comentarios del pedido</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
        </div>

        <aside className="side-panel run-panel">
          <span>Estado del planteamiento</span>
          <strong>{calculation ? `${calculation.totals.awnings} toldos` : `${awnings.length} toldos`}</strong>
          <em>{buildCalculationStatus(calculationState, calculation)}</em>
          {calculation?.diagnostics.slice(0, 4).map((item, index) => (
            <p className={`diagnostic ${item.level}`} key={`${item.message}-${index}`}>
              <AlertCircle aria-hidden="true" />
              {item.message}
            </p>
          ))}
        </aside>
      </section>

      <section className="awnings-section">
        <div className="section-header">
          <div>
            <h2>Toldos</h2>
            <span>Primera ficha optimizada para ARZUA PRO</span>
          </div>
          <button className="icon-text-button" type="button" onClick={addAwning}>
            <Plus aria-hidden="true" />
            Añadir
          </button>
        </div>

        <div className="awning-list">
          {awnings.map((awning, index) => (
            <article className="awning-card" key={awning.id}>
              <div className="awning-card-header">
                <div>
                  <span>{`Toldo ${index + 1}`}</span>
                  <strong>{awning.model}</strong>
                  <em>{getModelProfile(awning.model).title}</em>
                </div>
                <div className="card-actions">
                  <button type="button" className="icon-button" onClick={() => duplicateAwning(awning.id)} aria-label={`Duplicar toldo ${index + 1}`}>
                    <Copy aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-button" onClick={() => removeAwning(awning.id)} aria-label={`Eliminar toldo ${index + 1}`}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </div>

              <AwningFields catalog={catalog} awning={awning} updateAwning={updateAwning} />
            </article>
          ))}
        </div>
      </section>

      <LiveResultView calculation={calculation} />
    </>
  );
}

function buildCalculationStatus(state: CalculationState, calculation: Calculation | null) {
  if (state === 'validating') return 'Actualizando automáticamente';
  if (state === 'error') return 'Hay datos pendientes de revisar';
  if (calculation) return `${calculation.totals.materials} líneas preparadas`;
  return 'Esperando datos';
}

function LiveResultView({ calculation }: { calculation: Calculation | null }) {
  const materialRows = calculation?.ofs.flatMap((ofBlock) =>
    ofBlock.materials.map((material) => ({
      of: ofBlock.of,
      description: material.description || '',
      code: material.code,
      quantity: material.quantity
    }))
  ) || [];

  return (
    <section className="live-results panel">
      <div className="section-header">
        <div>
          <h2>Resultado en vivo</h2>
          <span>Medidas y reserva se actualizan al cambiar el pedido</span>
        </div>
        <strong>{materialRows.length} líneas RPS</strong>
      </div>

      {calculation?.ofs.some((ofBlock) => ofBlock.calculation) && (
        <div className="calculation-strip">
          {calculation.ofs.filter((ofBlock) => ofBlock.calculation).map((ofBlock) => (
            <article key={ofBlock.of}>
              <span>OF {ofBlock.of}</span>
              <strong>{ofBlock.calculation?.valid ? 'Válido' : 'Revisar'}</strong>
              <em>Tela {formatDecimal(ofBlock.calculation?.fabricWidth)} x {formatDecimal(ofBlock.calculation?.fabricDrop)} · {formatDecimal(ofBlock.calculation?.fabricMl)} ml</em>
            </article>
          ))}
        </div>
      )}

      <div className="result-table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th>OF</th>
              <th>Artículo</th>
              <th>Descripción</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {materialRows.length === 0 ? (
              <tr><td colSpan={4}>Todavía no hay líneas de reserva preparadas.</td></tr>
            ) : materialRows.map((row) => (
              <tr key={`${row.of}-${row.code}`}>
                <td>{row.of}</td>
                <td><strong>{row.code}</strong></td>
                <td>{row.description || '-'}</td>
                <td>{formatDecimal(row.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AwningFields({
  catalog,
  awning,
  updateAwning
}: {
  catalog: Catalog | null;
  awning: Awning;
  updateAwning: (id: string, patch: Partial<Awning>) => void;
}) {
  const profile = getModelProfile(awning.model);
  const isArzua = awning.model === 'ARZUA PRO';
  const visibleSections = profile.sections.map((section) => ({
    ...section,
    fields: section.fields.filter((field) => shouldShowAwningField(awning, field))
  })).filter((section) => section.fields.length > 0);

  return (
    <div className="model-form">
      <section className="field-group model-context">
        <h3>{profile.title}</h3>
        <p>{profile.summary}</p>
      </section>

      {visibleSections.map((section) => (
        <section className={`field-group ${section.className || ''}`} key={section.id}>
          <h3>{section.title}</h3>
          {section.description && <p>{section.description}</p>}
          <div className={section.id === 'identity' ? 'group-grid compact-grid' : 'group-grid'}>
            {section.fields.map((field) => renderAwningField({ field, catalog, awning, updateAwning }))}
          </div>
        </section>
      ))}

      <section className={`field-group overrides-group ${isArzua ? '' : 'collapsed-technical'}`}>
        <h3>Ajustes técnicos</h3>
        {!isArzua && <p>Este modelo todavía no tiene reglas específicas mapeadas. Usa ajustes solo si necesitas documentar una excepción.</p>}
        <div className="group-grid">
          <SelectField
            label="Reglas cálculo"
            value={awning.calculationModelOverride}
            options={['SEGÚN MODELO', 'ARZUA PRO', 'GALICIA', 'CORTINA']}
            onChange={(value) => updateAwning(awning.id, { calculationModelOverride: value })}
          />
          <SelectField
            label="Soportes / piezas"
            value={awning.supportSystemOverride}
            options={['SEGÚN MODELO', 'ARZUA PRO', 'GALICIA']}
            onChange={(value) => updateAwning(awning.id, { supportSystemOverride: value })}
          />
          <label>
            <span>Línea mínima override</span>
            <input
              type="number"
              min={0}
              placeholder="Sin override"
              value={awning.minimumLineOverride}
              onChange={(event) => updateAwning(awning.id, { minimumLineOverride: event.target.value })}
            />
          </label>
        </div>
        <label>
          <span>Motivo del ajuste</span>
          <textarea
            placeholder="Ej.: ARZUA con soporte Galicia. Se fuerza línea mínima 350 para validar."
            value={awning.overrideReason}
            onChange={(event) => updateAwning(awning.id, { overrideReason: event.target.value })}
          />
        </label>
      </section>

      <label className="wide-field notes-field">
        <span>Anotaciones del toldo</span>
        <textarea value={awning.notes} onChange={(event) => updateAwning(awning.id, { notes: event.target.value })} />
      </label>
    </div>
  );
}

function shouldShowAwningField(awning: Awning, field: FieldKey) {
  if (field === 'sensor') return awning.device === 'MOTOR';
  if (field === 'machineSide' || field === 'crankHeight') return awning.device !== 'MOTOR';
  return true;
}

function renderAwningField({
  field,
  catalog,
  awning,
  updateAwning
}: {
  field: FieldKey;
  catalog: Catalog | null;
  awning: Awning;
  updateAwning: (id: string, patch: Partial<Awning>) => void;
}) {
  switch (field) {
    case 'of':
      return <TextField key={field} label="OF" value={awning.of} onChange={(value) => updateAwning(awning.id, { of: value })} />;
    case 'model':
      return (
        <label key={field}>
          <span>Modelo</span>
          <select value={awning.model} onChange={(event) => updateAwning(awning.id, createModelSwitchPatch(event.target.value))}>
            {catalog?.models.map((model) => (
              <option value={model.code} key={model.code}>{model.code}</option>
            ))}
          </select>
        </label>
      );
    case 'units':
      return <NumberField key={field} label="Un." value={awning.units} min={1} onChange={(value) => updateAwning(awning.id, { units: value })} />;
    case 'width':
      return <NumberField key={field} label="Frente" value={awning.width} min={0} max={600} onChange={(value) => updateAwning(awning.id, { width: value })} />;
    case 'projection':
      return <NumberField key={field} label="Salida" value={awning.projection} onChange={(value) => updateAwning(awning.id, { projection: value })} />;
    case 'armCount':
      return <NumberField key={field} label="Brazos" value={awning.armCount} min={0} onChange={(value) => updateAwning(awning.id, { armCount: value })} />;
    case 'device':
      return <SelectField key={field} label="Dispositivo" value={awning.device} options={['MOTOR', 'MAQ. INTERIOR', 'MAQ. EXTERIOR']} onChange={(value) => updateAwning(awning.id, normalizeDevicePatch(value))} />;
    case 'tubeLoad':
      return <SelectField key={field} label="Tubo carga" value={awning.tubeLoad} options={['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280']} onChange={(value) => updateAwning(awning.id, { tubeLoad: value })} />;
    case 'valance':
      return <SelectField key={field} label="Bamba" value={awning.valance} options={['BAMBA INCLUIDA', 'SIN BAMBA', 'MODO DE BAMBA']} onChange={(value) => updateAwning(awning.id, { valance: value })} />;
    case 'placement':
      return <SelectField key={field} label="Colocación" value={awning.placement} options={['FRONTAL', 'TECHO', 'ENTRE PAREDES']} onChange={(value) => updateAwning(awning.id, { placement: value })} />;
    case 'wallType':
      return <SelectField key={field} label="Pared" value={awning.wallType} options={['DIRECTA A PARED', 'DIRECTA A HORMIGO ARMADO', 'DIRECTA A MADERA', 'PARED CON SATE', 'PARED TRANSVENTILADA CON AISLANTE', 'CON SEPARADORES']} onChange={(value) => updateAwning(awning.id, { wallType: value })} />;
    case 'machineSide':
      return <SelectField key={field} label="Lado máquina" value={awning.machineSide} options={['DERECHA', 'IZQUIERDA']} onChange={(value) => updateAwning(awning.id, { machineSide: value })} />;
    case 'crankHeight':
      return <NumberField key={field} label="Altura manivela" value={awning.crankHeight} min={80} onChange={(value) => updateAwning(awning.id, { crankHeight: value })} />;
    case 'sensor':
      return <SelectField key={field} label="Sensor" value={awning.sensor} options={['SIN SENSOR', 'VIENTO', 'VIENTO -SOL']} onChange={(value) => updateAwning(awning.id, { sensor: value })} />;
    default:
      return null;
  }
}

function createModelSwitchPatch(model: string): Partial<Awning> {
  if (model === 'ARZUA PRO') {
    return {
      model,
      armCount: 2,
      device: 'MOTOR',
      tubeLoad: 'TUBO DE CARGA EVO 80',
      valance: 'BAMBA INCLUIDA',
      placement: 'FRONTAL',
      wallType: 'DIRECTA A PARED',
      sensor: 'SIN SENSOR',
      machineSide: 'DERECHA',
      crankHeight: 170
    };
  }

  return {
    model,
    calculationModelOverride: 'SEGÚN MODELO',
    supportSystemOverride: 'SEGÚN MODELO',
    minimumLineOverride: '',
    overrideReason: ''
  };
}

function normalizeDevicePatch(device: string): Partial<Awning> {
  return device === 'MOTOR'
    ? { device, sensor: 'SIN SENSOR' }
    : { device, sensor: 'SIN SENSOR', crankHeight: 170 };
}
