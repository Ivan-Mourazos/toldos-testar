import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react';
import type { Awning, ReviewPackage, RuleParameters } from '../types';
import { awningLetter, getMissingFields, describeMissing } from '../../domain/awningCompleteness.js';
import { fabricSelectionLabel } from '../../domain/fabricCatalog.js';
import { controlLabel } from './controlLabels';

type Diagnostic = { level: string; awningId?: string; message: string };

// "Qué revisar": una línea por toldo con lo que más se equivoca (modelo, medidas, tela,
// lacado, dispositivo) y su estado. Iván, 23/09/2026: al revisar no se sabe bien qué
// mirar de los datos introducidos.
export function ReviewChecklist({ review, parameters, onFocusAwning }: {
  review: ReviewPackage;
  parameters: RuleParameters;
  onFocusAwning: (letter: string) => void;
}) {
  // Cada toldo necesita un id propio para repartir los avisos: en pedidos con el id
  // vacío o repetido, cada fila se llevaba los avisos de todos los toldos.
  const order = useMemo(() => withUniqueAwningIds(review.order), [review.order]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[] | null>(null);
  const [onlyWithWarnings, setOnlyWithWarnings] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...order, parameters }),
      signal: controller.signal
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setDiagnostics(data?.diagnostics || []))
      .catch(() => { /* cancelado o sin conexión: el resumen sale sin avisos */ });
    return () => controller.abort();
  }, [order, parameters]);

  const rows = order.awnings.map((awning, index) => {
    const missing = getMissingFields(awning, order);
    const own = (diagnostics || []).filter((item) => item.awningId === awning.id);
    const errors = own.filter((item) => item.level === 'error').length;
    const pending = own.filter((item) => item.level === 'pending').length;
    const warnings = own.filter((item) => item.level === 'warn').length;
    const state = missing.length || errors || pending ? 'error' : warnings ? 'warn' : 'ok';
    return { awning, index, letter: awningLetter(index), missing, own, errors, pending, warnings, state };
  });
  const visibleRows = onlyWithWarnings ? rows.filter((row) => row.state !== 'ok') : rows;

  return (
    <section className="review-checklist" aria-label="Qué revisar">
      <h3>Qué revisar</h3>
      <label className="review-checklist-toggle">
        <input type="checkbox" checked={onlyWithWarnings} onChange={(event) => setOnlyWithWarnings(event.target.checked)} />
        Solo los que tienen avisos
      </label>
      {visibleRows.length === 0
        ? <p className="review-checklist-empty">{onlyWithWarnings ? 'Ningún toldo tiene avisos.' : 'El pedido no tiene toldos.'}</p>
        : <ol>
        {visibleRows.map(({ awning, index, letter, missing, own, errors, pending, warnings, state }) => {
          return (
            <li key={awning.id || index}>
              <button type="button" className={`review-checklist-row pieza-3d is-${state}`} onClick={() => onFocusAwning(letter)}>
                <span className="review-checklist-letter">{letter}</span>
                <span className="review-checklist-model">
                  <strong>{controlLabel(awning.model)}</strong>
                  {variantOf(awning) && <small>{controlLabel(variantOf(awning))}</small>}
                </span>
                <span>{measuresOf(awning)}</span>
                <span className="review-checklist-fabric">{fabricOf(awning, order) || 'Sin tela'}</span>
                <span>{controlLabel(awning.structureColor || order.structureColor || '') || '—'}</span>
                <span>{controlLabel(awning.device || '') || '—'}</span>
                <span className="review-checklist-state" title={own.map((item) => item.message).join('\n') || undefined}>
                  {state === 'ok' && <><CheckCircle2 aria-hidden="true" />Completo</>}
                  {state === 'warn' && <><AlertTriangle aria-hidden="true" />{warnings} {warnings === 1 ? 'aviso' : 'avisos'}</>}
                  {state === 'error' && <><CircleAlert aria-hidden="true" />{missing.length ? `Falta ${describeMissing(missing)}` : errors ? `${errors} ${errors === 1 ? 'error' : 'errores'}` : `${pending} por resolver`}</>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>}
    </section>
  );
}

function withUniqueAwningIds(order: ReviewPackage['order']): ReviewPackage['order'] {
  const seen = new Set<string>();
  const awnings = order.awnings.map((awning, index) => {
    const id = awning.id && !seen.has(awning.id) ? awning.id : `toldo-${index + 1}`;
    seen.add(id);
    return id === awning.id ? awning : { ...awning, id };
  });
  return awnings.every((awning, index) => awning === order.awnings[index]) ? order : { ...order, awnings };
}

function variantOf(awning: Awning) {
  return awning.submodel || awning.anticaVariant || '';
}

function measuresOf(awning: Awning) {
  if (awning.model === 'IRIS') return pair(awning.irisFrontTop, awning.irisExitLeft);
  if (awning.model === 'BAMBALINA') return pair(awning.width, awning.valanceHeight);
  return pair(awning.width, awning.projection);
}

function pair(first: unknown, second: unknown) {
  return `${Number(first) || '—'} × ${Number(second) || '—'}`;
}

function fabricOf(awning: Awning, order: ReviewPackage['order']) {
  const selection = order.sameFabric === false ? awning.fabric : order.fabric;
  return selection ? fabricSelectionLabel(selection) : '';
}
