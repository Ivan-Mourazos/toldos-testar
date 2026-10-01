import React, { useEffect, useId, useState } from 'react';
import { Save } from 'lucide-react';
import { nombreClienteRps } from './fichasClientes';
import type { FichaAbierta } from './useGuardarEnFicha';

// La ventana de «Guardar en la ficha del cliente» (fase 3): lo que el elemento tiene distinto de la
// ficha, cada cosa con su casilla. La medida con sus ollaos, marcada; lo habitual, desmarcado. Quién
// guarda es el «Soy» y el motivo lo pone el servidor; queda en el historial de la ficha.
export function GuardarEnFicha({ abierta, usuario, numeroPedido, ocupado, onGuardar, onCerrar }: {
  abierta: FichaAbierta; usuario: string; numeroPedido: string; ocupado: boolean;
  onGuardar: (claves: string[]) => void; onCerrar: () => void;
}) {
  const titulo = useId();
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(abierta.diferencias.filter((d) => d.marcada).map((d) => d.clave)));
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => { if (evento.key === 'Escape' && !ocupado) onCerrar(); };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [ocupado, onCerrar]);
  const cambiar = (clave: string, si: boolean) => setMarcadas((actual) => {
    const siguiente = new Set(actual);
    if (si) siguiente.add(clave); else siguiente.delete(clave);
    return siguiente;
  });
  const nombre = abierta.ficha?.nombre ?? nombreClienteRps(abierta.cliente);
  // Sin ficha se puede crear solo con el nombre y el código; con ficha, hace falta marcar algo.
  const puedeGuardar = !ocupado && (abierta.ficha === null || marcadas.size > 0);
  return (
    <div className="parameters-save-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) onCerrar(); }}>
      <div className="parameters-save-dialog panel-3d rem-ficha-dialogo" role="dialog" aria-modal="true" aria-labelledby={titulo}>
        <h2 id={titulo}>{abierta.ficha ? `Guardar en la ficha de ${nombre}` : `Crear la ficha de ${nombre}`}</h2>
        <p>{abierta.diferencias.length > 0
          ? 'Marca lo que quieres guardar en la ficha. Lo que no marques, no cambia.'
          : abierta.ficha ? 'Este elemento no tiene nada distinto de la ficha.' : `Se crea la ficha con el código ${abierta.cliente.codigo}.`}</p>
        {abierta.diferencias.length > 0 && (
          <ul className="rem-ficha-cambios">
            {abierta.diferencias.map((d) => (
              <li key={d.clave}>
                <label>
                  <input type="checkbox" checked={marcadas.has(d.clave)} onChange={(e) => cambiar(d.clave, e.target.checked)} />
                  <span>
                    <strong>{d.etiqueta}</strong>
                    {d.nota && <small className="rem-ficha-nota">{d.nota}</small>}
                    <span className="rem-ficha-valores">{d.antes} → {d.despues}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <p className="rem-ficha-quien">Lo guarda {usuario} con el motivo «{marcadas.size > 0 ? 'Desde el pedido' : 'Código añadido desde el pedido'} {numeroPedido.trim()}».</p>
        <div className="parameters-save-actions">
          <button className="ghost-button" type="button" disabled={ocupado} onClick={onCerrar}>Cancelar</button>
          <button className="primary-button" type="button" disabled={!puedeGuardar} onClick={() => onGuardar([...marcadas])}>
            <Save aria-hidden="true" />{ocupado ? 'Guardando…' : abierta.ficha ? 'Guardar en la ficha' : 'Crear la ficha'}
          </button>
        </div>
      </div>
    </div>
  );
}
