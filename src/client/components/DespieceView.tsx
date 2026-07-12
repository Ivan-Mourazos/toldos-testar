import React from 'react';
import type { Awning, Calculation } from '../types';

type Props = {
  calculation: Calculation | null;
  awnings: Awning[];
};

export function DespieceView({ calculation, awnings }: Props) {
  const ofBlocks = calculation?.ofs.filter((ofBlock) => ofBlock.calculation) || [];
  if (ofBlocks.length === 0) return null;

  return (
    <section className="despiece panel">
      <div className="section-header">
        <div>
          <h2>Despiece</h2>
          <span>Vista previa del despiece de cada toldo, incluidas las piezas sin código de reserva</span>
        </div>
      </div>

      <div className="despiece-grid">
        {ofBlocks.map((ofBlock) => {
          const awning = awnings.find((item) => item.of === ofBlock.of);
          const calc = ofBlock.calculation!;

          if (!ofBlock.despiece) {
            return (
              <article className="despiece-card despiece-card-empty" key={ofBlock.of}>
                <header><strong>OF {ofBlock.of} · {calc.model}</strong></header>
                <p>Despiece no disponible para {calc.model} todavía.</p>
              </article>
            );
          }

          return (
            <article className="despiece-card" key={ofBlock.of}>
              <header className="despiece-card-header">
                <strong>OF {ofBlock.of} · {calc.model}</strong>
                <span className={calc.valid ? 'badge-ok' : 'badge-danger'}>{calc.valid ? 'VÁLIDO' : 'REVISAR'}</span>
              </header>

              <div className="despiece-body">
                <table className="despiece-table">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Nombre pieza</th>
                      <th>Referencia</th>
                      <th className="num">Un.</th>
                      <th className="num">Longit.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ofBlock.despiece.rows.map((row) => (
                      <tr key={row.num}>
                        <td className="num">{row.num}</td>
                        <td>{row.name}</td>
                        <td className={row.reference ? 'code' : 'despiece-no-ref'}>{row.reference || 'Sin referencia'}</td>
                        <td className="num">{row.units}</td>
                        <td className="num">{row.length ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="despiece-side">
                  <div className="despiece-info-block">
                    <h4>Datos de partida</h4>
                    <p>Frente {awning?.width ?? '-'} cm</p>
                    <p>Salida {awning?.projection ?? '-'} cm</p>
                    <p>Unidades {awning?.units ?? '-'}</p>
                  </div>
                  <div className="despiece-info-block">
                    <h4>Dimensiones tela</h4>
                    <p>Tela {calc.fabricWidth} × {calc.fabricDrop}</p>
                    <p>Paño {calc.fabricMl} ml</p>
                  </div>
                  {ofBlock.despiece.anchoring && (
                    <div className="despiece-info-block despiece-anchoring">
                      <h4>Sistema de anclaje</h4>
                      <p>{ofBlock.despiece.anchoring.name}</p>
                      <p className={ofBlock.despiece.anchoring.reference ? 'code' : 'despiece-no-ref'}>
                        {ofBlock.despiece.anchoring.reference || 'Sin referencia confirmada'} × {ofBlock.despiece.anchoring.units}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
