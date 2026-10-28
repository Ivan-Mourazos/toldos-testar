import React from 'react';
import { Printer } from 'lucide-react';
import type { Lote } from './tipos';

const numero = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const escapar = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// El papel que le llega al cortador (Iván, 28/10/2026): las cantidades de cada referencia, que tienen que coincidir con
// las del corte que se le pasa. Sale de los mismos programas del corte, por palet.
export function HojaCortador({ lote }: { lote: Lote }) {
  const imprimir = () => {
    const filas = lote.cortador.map(f => `<tr><td>${f.palet ?? '—'}</td><td>${escapar(f.referencia)}${f.referencias ? `<br><small>${escapar(f.referencias.join(' · '))}</small>` : ''}</td>`
      + `<td class="n">${numero(f.unidades)}</td><td>${escapar(f.como.join(' + '))}</td></tr>`).join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(lote.nombre)} · cortador</title><style>
      body{font:12pt Arial,sans-serif;margin:12mm} h1{font-size:18pt;margin:0 0 6mm} table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #000;padding:2mm 3mm;text-align:left;vertical-align:top} td.n{text-align:right;font-weight:bold;font-size:14pt}
      small{color:#444}</style></head><body><h1>${escapar(lote.nombre)} · cantidades a cortar</h1>
      <table><thead><tr><th>Palet</th><th>Referencia</th><th>Cantidad</th><th>Cómo va en el corte</th></tr></thead><tbody>${filas}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  const descuadres = lote.cortador.filter(f => !f.cuadra).length;
  return <section className="glass-panel combursa-listado" aria-label="Papel del cortador">
    <header><h2>Papel del cortador</h2><span>{descuadres ? `${descuadres} sin cuadrar con RPS` : 'Cuadra con RPS'}</span>
      <button type="button" className="boton-3d" onClick={imprimir}><Printer size={16} aria-hidden="true" /> Imprimir</button></header>
    <div className="combursa-tabla-scroll"><table>
      <thead><tr><th>Palet</th><th>Referencia</th><th>Cantidad</th><th>Cómo va en el corte</th><th>Pedido en RPS</th></tr></thead>
      <tbody>{lote.cortador.map(f => <tr key={`${f.palet}-${f.referencia}`}>
        <td>{f.palet ?? 'Sin palet'}</td>
        <td className="combursa-referencia">{f.referencia}{f.referencias && <small>{f.referencias.join(' · ')}</small>}</td>
        <td className="combursa-numero">{numero(f.unidades)}</td>
        <td>{f.como.join(' + ')}</td>
        <td>{f.cuadra ? <span className="combursa-validado">{numero(f.pedidas)}</span> : <strong className="combursa-manual">{numero(f.pedidas)}</strong>}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}
