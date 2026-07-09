import React, { useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import type { Catalog, DimensionalRule, FabricRule, ModelParameters, ParameterOptionGroup, PartRule } from '../types';
import { arzuaTechnicalMatrices, createModelParameters, uid } from '../constants';
import { TextField } from '../components/TextField';
import { SelectField } from '../components/SelectField';
import { SectionTitle } from '../components/SectionTitle';
import { TechnicalMatrixCard } from '../components/TechnicalMatrixCard';

export function ParametersView({
  catalog,
  parametersByModel,
  updateModelParameters
}: {
  catalog: Catalog | null;
  parametersByModel: Record<string, ModelParameters>;
  updateModelParameters: (modelCode: string, updater: (current: ModelParameters) => ModelParameters) => void;
}) {
  const models = catalog?.models || [];
  const [selectedModel, setSelectedModel] = useState('ARZUA PRO');
  const activeModel = models.find((model) => model.code === selectedModel) || models[0];
  const params = activeModel ? parametersByModel[activeModel.code] || createModelParameters(activeModel) : null;

  function updateParams(updater: (current: ModelParameters) => ModelParameters) {
    if (!activeModel) return;
    updateModelParameters(activeModel.code, updater);
  }

  function updateDimensionalRule(index: number, patch: Partial<DimensionalRule>) {
    updateParams((current) => ({
      ...current,
      dimensionalRules: current.dimensionalRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule)
    }));
  }

  function updateOptionGroup(index: number, patch: Partial<ParameterOptionGroup>) {
    updateParams((current) => ({
      ...current,
      optionGroups: current.optionGroups.map((group, groupIndex) => groupIndex === index ? { ...group, ...patch } : group)
    }));
  }

  function updatePartRule(index: number, patch: Partial<PartRule>) {
    updateParams((current) => ({
      ...current,
      partRules: current.partRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule)
    }));
  }

  function updateFabricRule(index: number, patch: Partial<FabricRule>) {
    updateParams((current) => ({
      ...current,
      fabricRules: current.fabricRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule)
    }));
  }

  if (!activeModel || !params) {
    return (
      <section className="panel parameter-empty">
        <h2>Parámetros</h2>
        <p>Cargando modelos del catálogo.</p>
      </section>
    );
  }

  return (
    <section className="parameter-shell">
      <aside className="parameter-sidebar panel">
        <div className="panel-title">
          <Settings2 aria-hidden="true" />
          <h2>Modelos</h2>
        </div>
        <div className="parameter-model-list">
          {models.map((model) => {
            const state = parametersByModel[model.code]?.status || 'Pendiente';
            return (
              <button
                className={model.code === activeModel.code ? 'active' : ''}
                key={model.code}
                type="button"
                onClick={() => setSelectedModel(model.code)}
              >
                <strong>{model.code}</strong>
                <span>{model.ruleSheet || 'sin hoja'} · {state}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="parameter-workspace">
        <section className="parameter-hero">
          <div>
            <span className="parameter-kicker">Hoja Excel {params.sheet || activeModel.ruleSheet || '-'}</span>
            <h2>{activeModel.code}</h2>
            <p>{activeModel.family || 'Familia pendiente'}{activeModel.subtype ? ` · ${activeModel.subtype}` : ''}</p>
            <div className="parameter-metrics">
              <span><strong>{params.dimensionalRules.length}</strong> descuentos</span>
              <span><strong>{params.optionGroups.length}</strong> campos</span>
              <span><strong>{params.partRules.length}</strong> piezas</span>
              <span><strong>{params.fabricRules.length}</strong> reglas tela</span>
            </div>
          </div>
          <div className="parameter-status">
            <SelectField label="Estado" value={params.status} options={['Pendiente', 'En mapeo', 'Revisado', 'Validado']} onChange={(value) => updateParams((current) => ({ ...current, status: value }))} />
            <TextField label="Responsable" value={params.updatedBy} onChange={(value) => updateParams((current) => ({ ...current, updatedBy: value }))} />
          </div>
        </section>

        <section className="parameter-section panel">
          <SectionTitle title="Descuentos dimensionales" detail="Reglas que alteran frente de tela, salida de paño y largos de piezas." />
          {activeModel.code === 'ARZUA PRO' && (
            <div className="technical-matrix-grid">
              {arzuaTechnicalMatrices.map((matrix) => (
                <TechnicalMatrixCard matrix={matrix} key={matrix.title} />
              ))}
            </div>
          )}
          <div className="parameter-table-wrap">
            <table className="parameter-table">
              <thead>
                <tr>
                  <th>Regla</th>
                  <th>Frente min</th>
                  <th>Frente max</th>
                  <th>Salida min</th>
                  <th>Salida max</th>
                  <th>Dto. tela</th>
                  <th>Extra salida</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {params.dimensionalRules.map((rule, index) => (
                  <tr key={rule.id}>
                    <td><input value={rule.label} onChange={(event) => updateDimensionalRule(index, { label: event.target.value })} /></td>
                    <td><input type="number" value={rule.minWidth} onChange={(event) => updateDimensionalRule(index, { minWidth: Number(event.target.value) })} /></td>
                    <td><input type="number" value={rule.maxWidth} onChange={(event) => updateDimensionalRule(index, { maxWidth: Number(event.target.value) })} /></td>
                    <td><input type="number" value={rule.minProjection} onChange={(event) => updateDimensionalRule(index, { minProjection: Number(event.target.value) })} /></td>
                    <td><input type="number" value={rule.maxProjection} onChange={(event) => updateDimensionalRule(index, { maxProjection: Number(event.target.value) })} /></td>
                    <td><input type="number" value={rule.fabricWidthOffset} onChange={(event) => updateDimensionalRule(index, { fabricWidthOffset: Number(event.target.value) })} /></td>
                    <td><input type="number" value={rule.fabricDropOffset} onChange={(event) => updateDimensionalRule(index, { fabricDropOffset: Number(event.target.value) })} /></td>
                    <td><input value={rule.note} onChange={(event) => updateDimensionalRule(index, { note: event.target.value })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="icon-text-button"
            type="button"
            onClick={() => updateParams((current) => ({
              ...current,
              dimensionalRules: [...current.dimensionalRules, { id: uid(), label: 'Nueva regla', minWidth: 0, maxWidth: 0, minProjection: 0, maxProjection: 0, fabricWidthOffset: 0, fabricDropOffset: 0, note: '' }]
            }))}
          >
            <Plus aria-hidden="true" />
            Añadir regla
          </button>
        </section>

        <section className="parameter-section panel">
          <SectionTitle title="Opciones del formulario" detail="Listas que verá el técnico al configurar un toldo de este modelo." />
          <div className="option-grid">
            {params.optionGroups.map((group, index) => (
              <article className="option-editor" key={group.id}>
                <TextField label="Campo" value={group.label} onChange={(value) => updateOptionGroup(index, { label: value })} />
                <label>
                  <span>Valores</span>
                  <textarea value={group.values} onChange={(event) => updateOptionGroup(index, { values: event.target.value })} />
                </label>
              </article>
            ))}
          </div>
          <button
            className="icon-text-button"
            type="button"
            onClick={() => updateParams((current) => ({
              ...current,
              optionGroups: [...current.optionGroups, { id: uid(), label: 'Nuevo campo', values: '' }]
            }))}
          >
            <Plus aria-hidden="true" />
            Añadir opción
          </button>
        </section>

        <section className="parameter-section panel">
          <SectionTitle title="Piezas y referencias base" detail="Semilla para generar estructura y RPS por OF." />
          <div className="parameter-table-wrap">
            <table className="parameter-table parts-table">
              <thead>
                <tr>
                  <th>Papel</th>
                  <th>Referencia</th>
                  <th>Cantidad</th>
                  <th>Longitud / condición</th>
                </tr>
              </thead>
              <tbody>
                {params.partRules.map((rule, index) => (
                  <tr key={rule.id}>
                    <td><input value={rule.role} onChange={(event) => updatePartRule(index, { role: event.target.value })} /></td>
                    <td><input value={rule.reference} onChange={(event) => updatePartRule(index, { reference: event.target.value })} /></td>
                    <td><input value={rule.quantity} onChange={(event) => updatePartRule(index, { quantity: event.target.value })} /></td>
                    <td><input value={rule.lengthFormula} onChange={(event) => updatePartRule(index, { lengthFormula: event.target.value })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="icon-text-button"
            type="button"
            onClick={() => updateParams((current) => ({
              ...current,
              partRules: [...current.partRules, { id: uid(), role: 'Nueva pieza', reference: '', quantity: '1', lengthFormula: '' }]
            }))}
          >
            <Plus aria-hidden="true" />
            Añadir pieza
          </button>
        </section>

        <section className="parameter-section panel">
          <SectionTitle title="Reglas de tela" detail="Cálculos que deben alimentar el planteamiento DIN A4 y el consumo de paño." />
          <div className="fabric-rule-grid">
            {params.fabricRules.map((rule, index) => (
              <article className="fabric-rule" key={rule.id}>
                <TextField label="Salida" value={rule.label} onChange={(value) => updateFabricRule(index, { label: value })} />
                <TextField label="Fórmula" value={rule.formula} onChange={(value) => updateFabricRule(index, { formula: value })} />
                <TextField label="Unidad" value={rule.unit} onChange={(value) => updateFabricRule(index, { unit: value })} />
                <label className="wide-field">
                  <span>Nota</span>
                  <textarea value={rule.note} onChange={(event) => updateFabricRule(index, { note: event.target.value })} />
                </label>
              </article>
            ))}
          </div>
        </section>

        <section className="parameter-section panel">
          <SectionTitle title="Notas técnicas" detail="Decisiones abiertas antes de convertirlo en cálculo testeable." />
          <textarea className="technical-notes" value={params.notes} onChange={(event) => updateParams((current) => ({ ...current, notes: event.target.value }))} />
        </section>
      </div>
    </section>
  );
}
