import React, { useEffect, useRef, useState } from 'react';
import type { DestinoEntrega as Destino } from '../../entregasTipos';

export interface CatalogoEntregas {
  siguiente: number;
  recomendado: Destino;
  pasos: { numero: number; modo: string; ofs: string[] }[];
  existentes: { numero: number; fecha?: string; ofs: string[]; modelos?: string[]; origen: string; archivos: { filename: string }[] }[];
}

export function OpcionesEntrega({ datos, destino, elegir }: { datos: CatalogoEntregas; destino: Destino; elegir: (d: Destino) => void }) {
  const correccion = datos.pasos[0]?.modo === 'sustituir' ? datos.pasos[0] : null;
  return <>
    <p>Planteamientos que ya hay en RPS y en la web para este pedido:</p>
    {datos.existentes.length ? <table><thead><tr><th>Número</th><th>Fecha</th><th>OF y modelos</th></tr></thead><tbody>
      {datos.existentes.map(e => <tr key={e.numero}><td>-{e.numero}</td><td>{e.fecha ? new Date(e.fecha).toLocaleString('es-ES') : 'Sin fecha'}</td>
        <td>{e.origen === 'Excel antiguo' ? 'Excel antiguo' : [e.ofs.join(', '), e.modelos?.join(', ')].filter(Boolean).join(' · ') || 'Web · sin datos de OF'}</td></tr>)}
    </tbody></table> : <p>No hay planteamientos anteriores.</p>}
    {datos.pasos.length > 1 && <p className="aviso-flujo-editable">Hay varias entregas pendientes. Se generan en pasos separados: {datos.pasos.map(p => `-${p.numero} (OF ${p.ofs.join(', ')})`).join('; ')}. Después de este paso, el pedido seguirá pendiente.</p>}
    {correccion && <p>Corregir OF ya generadas conserva el mismo número: sustituye -{correccion.numero}. Solo las OF nuevas pueden abrir otra entrega.</p>}
    <fieldset><legend>Destino de los archivos</legend>
      <label><input type="radio" name="destino-entrega" disabled={Boolean(correccion)} checked={destino.modo === 'nuevo'} onChange={() => elegir({ numero: datos.siguiente, modo: 'nuevo' })} />Nuevo: -{datos.siguiente}</label>
      {datos.existentes.map(e => <label key={e.numero}><input type="radio" name="destino-entrega" disabled={Boolean(correccion && correccion.numero !== e.numero)} checked={destino.modo === 'sustituir' && destino.numero === e.numero} onChange={() => elegir({ numero: e.numero, modo: 'sustituir' })} />Sustituir -{e.numero}</label>)}
    </fieldset>
  </>;
}

export function ElegirDestinoEntrega({ ruta, codigo, preguntar, cancelar, generar }: {
  ruta: string; codigo: string; preguntar: import('./NotificationCenter').AskForConfirmation;
  cancelar: () => void; generar: (d: Destino) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [datos, setDatos] = useState<CatalogoEntregas | null>(null);
  const [destino, setDestino] = useState<Destino | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { dialogo.current?.showModal(); }, []);
  useEffect(() => {
    let vigente = true;
    fetch(ruta, { cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error || 'No se pudieron consultar los planteamientos.'); return d as CatalogoEntregas; })
      .then(d => { if (vigente) { setDatos(d); setDestino({ numero: d.recomendado.numero, modo: d.recomendado.modo }); } })
      .catch(e => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
  }, [ruta]);
  async function confirmar() {
    if (!datos || !destino) return;
    if (destino.modo === 'sustituir') {
      dialogo.current?.close();
      const existente = datos.existentes.find(e => e.numero === destino.numero);
      const nombre = /^AR(\d{2})(\d{5})/.exec(codigo);
      const pdf = nombre ? `AR.${nombre[1]}.${nombre[2]}-${destino.numero}.pdf` : `${codigo}-${destino.numero}.pdf`;
      const eleccion = await preguntar({ title: `Sustituir la entrega ${destino.numero}`, message: `Se sustituirá ${pdf} y sus archivos de corte. Las reservas de las OF de este pedido se volverán a subir y RPS sustituirá las suyas.`,
        details: [...new Set([pdf, `${codigo}-${destino.numero}.dwg / .dxf`, ...(existente?.archivos.map(a => a.filename) ?? [])])], confirmLabel: 'Sí, sustituir archivos', cancelLabel: 'Cancelar', tone: 'danger' });
      if (eleccion !== 'confirm') { cancelar(); return; }
    }
    generar(destino);
  }
  return <dialog ref={dialogo} className="destino-entrega bloque-3d" aria-labelledby="titulo-destino-entrega" onCancel={cancelar}>
    <h2 id="titulo-destino-entrega">Generar archivos de {codigo}</h2>
    {error ? <p role="alert">{error}</p> : datos && destino ? <OpcionesEntrega datos={datos} destino={destino} elegir={setDestino} /> : <p role="status">Consultando planteamientos…</p>}
    <footer><button type="button" className="ghost-button boton-3d" onClick={cancelar}>Cancelar</button><button type="button" className="primary-button boton-3d" disabled={!destino || Boolean(error)} onClick={() => void confirmar()}>Generar archivos</button></footer>
  </dialog>;
}
