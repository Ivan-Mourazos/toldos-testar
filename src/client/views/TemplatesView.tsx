import React from 'react';
import type { Awning } from '../types';
import { createAwning } from '../constants';
import { HeaderBlock } from '../components/HeaderBlock';
import { InfoBox } from '../components/InfoBox';

export function TemplatesView({
  awnings,
  orderCode,
  customer,
  technician,
  fabric,
  structureColor,
  notes
}: {
  awnings: Awning[];
  orderCode: string;
  customer: string;
  technician: string;
  fabric: string;
  structureColor: string;
  notes: string;
}) {
  const awning = awnings[0] || createAwning();

  return (
    <section className="templates-grid">
      <article className="print-preview structure-preview">
        <div className="print-toolbar">
          <strong>Estructura</strong>
          <span>DIN A5 horizontal</span>
        </div>
        <div className="structure-sheet">
          <HeaderBlock orderCode={orderCode} customer={customer} technician={technician} title={awning.model || 'MODELO'} />
          <div className="structure-main">
            <div className="piece-table">
              <div className="table-head">
                <span>NUM</span><span>NOMBRE PIEZA</span><span>REFERENCIA</span><span>UN.</span><span>LONG.</span>
              </div>
              {[
                ['1', 'SOPORTE MODUL FRONTAL', 'SOBMODULNE11', awning.armCount || 1, ''],
                ['2', 'TUBO DE ENROLLE', 'TURA80HG700C', 1, awning.width ? awning.width - 12 : ''],
                ['3', 'CASQUILLO PUNTA', 'CASPUNCE', 1, ''],
                ['4', 'BARRA DE CARGA', '', 1, awning.width ? awning.width - 11 : ''],
                ['5', 'BRAZO', '', awning.armCount || 2, awning.projection],
                ['6', 'MOTOR SOMFY', '', 1, '']
              ].map((row) => (
                <div className="table-row" key={row[0]}>
                  {row.map((cell, index) => <span key={`${row[0]}-${index}`}>{cell}</span>)}
                </div>
              ))}
            </div>
            <aside className="structure-side">
              <InfoBox title="Datos de partida" rows={[['Frente', awning.width], ['Salida toldo', awning.projection], ['Unidades', awning.units]]} />
              <div className="status-box">VERDADERO</div>
              <InfoBox title="Detalles" rows={buildDetailRows(awning, structureColor)} />
              <InfoBox title="Dimensiones tela" rows={[['Tela', awning.width ? awning.width - 13 : 0], ['Salida paño', awning.projection ? awning.projection + 70 : 0], ['Paño', 0]]} />
            </aside>
          </div>
          <div className="observations">{buildObservationText(notes, awning)}</div>
        </div>
      </article>

      <article className="print-preview fabric-preview">
        <div className="print-toolbar">
          <strong>Tela</strong>
          <span>DIN A4 horizontal</span>
        </div>
        <div className="fabric-sheet">
          <HeaderBlock orderCode={orderCode} customer={customer} technician={technician} title="PLANTEAMIENTO DE TELAS" />
          <div className="fabric-main">
            <div className="fabric-diagram">
              <strong>GENERAL</strong>
              <div className="diagram-box">
                <span>FRENTE TELA</span>
                <span>PARA ENROLLAR EN TUBO</span>
                <span>BASTILLA</span>
              </div>
            </div>
            <div className="fabric-data">
              <InfoBox title="Rotulación" rows={[['Tela', 'SI'], ['Bamba', 'SI']]} />
              <InfoBox title="Datos básicos" rows={[['Material', fabric || 'ACR'], ['Curva', 'RECTA'], ['Remate', 'COMO TELA']]} />
              {['A', 'B', 'C', 'D'].map((label, index) => (
                <div className="fabric-line" key={label}>
                  <strong>{label}</strong>
                  <span>Tela</span>
                  <b>{index === 0 ? awning.width || 0 : 0}</b>
                  <span>Salida</span>
                  <b>{index === 0 ? (awning.projection || 0) + 70 : 0}</b>
                  <span>UN. {index === 0 ? awning.units : 0}</span>
                </div>
              ))}
              <div className="fabric-total">
                <span>Paño total necesario</span>
                <strong>0,0</strong>
                <span>ML</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

function buildDetailRows(awning: Awning, structureColor: string): Array<[string, string | number]> {
  const rows: Array<[string, string | number]> = [
    ['Lacado', structureColor],
    ['Disposit.', awning.device],
    ['Coloc.', awning.placement]
  ];

  if (awning.supportSystemOverride && awning.supportSystemOverride !== 'SEGÚN MODELO') {
    rows.push(['Soportes', awning.supportSystemOverride]);
  }
  if (awning.calculationModelOverride && awning.calculationModelOverride !== 'SEGÚN MODELO') {
    rows.push(['Reglas', awning.calculationModelOverride]);
  }
  if (awning.minimumLineOverride) {
    rows.push(['Línea min.', awning.minimumLineOverride]);
  }

  return rows;
}

function buildObservationText(orderNotes: string, awning: Awning) {
  const parts = [orderNotes, awning.notes];
  if (awning.overrideReason) parts.push(`Ajuste técnico: ${awning.overrideReason}`);
  return parts.filter(Boolean).join(' · ') || 'Observaciones:';
}
