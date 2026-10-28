import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Awning, SolapaItem } from '../types';
import { createDefaultSolapa, normalizeSolapas, solapaLetter } from '../../domain/solapasRules.js';
import { NumberField } from './NumberField';
import { SegmentedField } from './SegmentedField';

type Props = {
  awning: Awning;
  update: (patch: Partial<Awning>) => void;
  missing: (field: string) => boolean;
  reading: boolean;
};

export function solapasConfigurationFields({ awning, update, missing, reading }: Props) {
  const solapas: SolapaItem[] = normalizeSolapas(awning.solapas, awning.bastilla);

  function commit(next: SolapaItem[]) {
    update({
      solapas: normalizeSolapas(next, awning.bastilla)
    });
  }

  function updateSolapa(index: number, patch: Partial<SolapaItem>) {
    const next = solapas.map((item, idx) => {
      if (idx !== index) return item;
      const merged = { ...item, ...patch };
      if (!merged.velcroDerDistinto) {
        merged.velcro2Tipo = merged.velcroTipo;
        merged.velcro2Lado = merged.velcroLado;
        merged.velcro2Color = merged.velcroColor;
        merged.velcro2Ancho = merged.velcroAncho;
      }
      return merged;
    });
    commit(next);
  }

  function addSolapa() {
    const last = solapas[solapas.length - 1] || createDefaultSolapa(0);
    const fresh = createDefaultSolapa(solapas.length, {
      largo: last.largo,
      velcroTipo: last.velcroTipo,
      velcroLado: last.velcroLado,
      velcroColor: last.velcroColor,
      velcroAncho: last.velcroAncho,
      velcro2Tipo: last.velcro2Tipo,
      velcro2Lado: last.velcro2Lado,
      velcro2Color: last.velcro2Color,
      velcro2Ancho: last.velcro2Ancho,
      velcroDerDistinto: last.velcroDerDistinto
    });
    commit([...solapas, fresh]);
  }

  function removeLastSolapa() {
    if (solapas.length <= 1) return;
    commit(solapas.slice(0, -1));
  }

  return <>
    <div className="curtain-option">
      <SegmentedField
        label="Confección solapas"
        value={awning.bastilla ? 'CON BASTILLA' : 'AL CORTE'}
        options={['AL CORTE', 'CON BASTILLA']}
        onChange={(value) => {
          const bastilla = value === 'CON BASTILLA';
          update({ bastilla, solapas: normalizeSolapas(solapas, bastilla) });
        }}
      />
    </div>
    {awning.bastilla && !reading && (
      <p className="field-hint-warn awning-row-warn" role="status">
        Con bastilla: pendiente de Oficina Técnica. No se genera el corte automático.
      </p>
    )}
    {solapas.map((s, idx) => {
      const letra = s.nombre || solapaLetter(idx);
      const tag = `Solapa ${letra}`;
      return (
        <React.Fragment key={letra}>
          <NumberField
            label={`${tag} · largo (cm)`}
            missing={missing(`solapa_${idx}_largo`)}
            value={s.largo}
            min={1}
            step={0.5}
            onChange={(largo) => updateSolapa(idx, { largo })}
          />
          <div className="curtain-option">
            <SegmentedField
              label={`${tag} · forma`}
              value={s.oblicua ? 'OBLICUA' : 'RECTA'}
              options={['RECTA', 'OBLICUA']}
              onChange={(value) => updateSolapa(idx, { oblicua: value === 'OBLICUA' })}
            />
          </div>
          {!s.oblicua ? (
            <NumberField
              label={`${tag} · ancho (cm)`}
              missing={missing(`solapa_${idx}_ancho`)}
              value={s.ancho}
              min={1}
              step={0.5}
              onChange={(ancho) => updateSolapa(idx, { ancho })}
            />
          ) : (
            <>
              <NumberField
                label={`${tag} · ancho punta 1 (cm)`}
                missing={missing(`solapa_${idx}_ancho`)}
                value={s.ancho}
                min={1}
                step={0.5}
                onChange={(ancho) => updateSolapa(idx, { ancho })}
              />
              <NumberField
                label={`${tag} · ancho punta 2 (cm)`}
                missing={missing(`solapa_${idx}_ancho2`)}
                value={s.ancho2}
                min={1}
                step={0.5}
                onChange={(ancho2) => updateSolapa(idx, { ancho2 })}
              />
            </>
          )}
          <div className="curtain-option">
            <SegmentedField
              label={`${tag} · cara velcro`}
              value={s.velcroTipo}
              options={['BRAVO', 'SUAVE']}
              onChange={(velcroTipo) => updateSolapa(idx, { velcroTipo: velcroTipo as SolapaItem['velcroTipo'] })}
            />
          </div>
          <div className="curtain-option">
            <SegmentedField
              label={`${tag} · lado velcro`}
              value={s.velcroLado}
              options={['POR REVÉS', 'POR DERECHO']}
              onChange={(velcroLado) => updateSolapa(idx, { velcroLado: velcroLado as SolapaItem['velcroLado'] })}
            />
          </div>
          <div className="curtain-option">
            <SegmentedField
              label={`${tag} · color velcro`}
              value={s.velcroColor}
              options={['BLANCO', 'NEGRO']}
              onChange={(velcroColor) => updateSolapa(idx, { velcroColor: velcroColor as SolapaItem['velcroColor'] })}
            />
          </div>
          <NumberField
            label={`${tag} · ancho velcro (cm)`}
            value={s.velcroAncho}
            min={1}
            step={0.5}
            onChange={(velcroAncho) => updateSolapa(idx, { velcroAncho: velcroAncho ?? 5 })}
          />
          <div className="curtain-option">
            <SegmentedField
              label={`${tag} · segundo lado largo`}
              value={s.velcroDerDistinto ? 'DISTINTO' : 'IGUAL'}
              options={['IGUAL', 'DISTINTO']}
              onChange={(value) => updateSolapa(idx, { velcroDerDistinto: value === 'DISTINTO' })}
            />
          </div>
          {s.velcroDerDistinto && (
            <>
              <div className="curtain-option">
                <SegmentedField
                  label={`${tag} · cara velcro 2`}
                  value={s.velcro2Tipo}
                  options={['BRAVO', 'SUAVE']}
                  onChange={(velcro2Tipo) => updateSolapa(idx, { velcro2Tipo: velcro2Tipo as SolapaItem['velcro2Tipo'] })}
                />
              </div>
              <div className="curtain-option">
                <SegmentedField
                  label={`${tag} · lado velcro 2`}
                  value={s.velcro2Lado}
                  options={['POR REVÉS', 'POR DERECHO']}
                  onChange={(velcro2Lado) => updateSolapa(idx, { velcro2Lado: velcro2Lado as SolapaItem['velcro2Lado'] })}
                />
              </div>
              <div className="curtain-option">
                <SegmentedField
                  label={`${tag} · color velcro 2`}
                  value={s.velcro2Color}
                  options={['BLANCO', 'NEGRO']}
                  onChange={(velcro2Color) => updateSolapa(idx, { velcro2Color: velcro2Color as SolapaItem['velcro2Color'] })}
                />
              </div>
              <NumberField
                label={`${tag} · ancho velcro 2 (cm)`}
                value={s.velcro2Ancho}
                min={1}
                step={0.5}
                onChange={(velcro2Ancho) => updateSolapa(idx, { velcro2Ancho: velcro2Ancho ?? 5 })}
              />
            </>
          )}
        </React.Fragment>
      );
    })}
    {!reading && (
      <div className="solapas-actions" data-form-group="medidas">
        <button type="button" className="ghost-button" onClick={addSolapa}>
          <Plus aria-hidden="true" />Añadir solapa {solapaLetter(solapas.length)}
        </button>
        {solapas.length > 1 && (
          <button type="button" className="ghost-button" onClick={removeLastSolapa}>
            <Trash2 aria-hidden="true" />Quitar solapa {solapas[solapas.length - 1].nombre}
          </button>
        )}
      </div>
    )}
  </>;
}
