import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FolderOpen, Scissors } from 'lucide-react';
import { abrirCorteDwg, confirmarCorteDwg } from '../abrirCorte';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import type { CalcParams } from '../../remolques/calc/params.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { CorteRemolquesVista, type VistaCorteRemolques } from './CorteRemolques';
import { cuerpoVistaPrevia } from './vistaPrevia';
import { clienteRpsDeLineas } from './guardarPedido';

export function VistaPreviaCorte({ lineas, params, bloqueo, numeroPedido, usuario, notify, preguntar }: {
  lineas: LineaPedido[]; params: CalcParams; bloqueo: string | null; numeroPedido: string; usuario: string; notify: Notify; preguntar: AskForConfirmation;
}) {
  const clienteRps = clienteRpsDeLineas(lineas);
  const entrada = JSON.stringify({ ...cuerpoVistaPrevia(lineas), params, ...(clienteRps ? { clienteRps } : {}) });
  const clave = JSON.stringify([entrada, bloqueo]);
  const [vista, setVista] = useState<{ clave: string; datos?: VistaCorteRemolques; error?: string; cargando?: boolean; vieja?: boolean } | null>(null);
  // Se descarta también si se vuelve después a las medidas anteriores.
  if (vista && vista.clave !== clave) setVista({ clave, vieja: true });
  const peticion = useRef<AbortController | null>(null);
  useEffect(() => () => { peticion.current?.abort(); }, [clave]);
  const actual = vista?.clave === clave && !bloqueo ? vista : null;

  // Flujo del DWG (fase 1): el plano en la carpeta de borradores, abierto en ZWCAD para perfilarlo; (fase 2) su corte, confirmado
  // para poder guardar para revisión. Como en puertas.
  const [abriendo, setAbriendo] = useState(false);
  async function abrirCorte() {
    setAbriendo(true);
    try { await abrirCorteDwg({ ruta: '/api/remolques/borrador-corte', orderCode: numeroPedido, cuerpo: JSON.parse(entrada), usuario, preguntar, notify }); }
    finally { setAbriendo(false); }
  }
  async function confirmarCorte() {
    setAbriendo(true);
    try { await confirmarCorteDwg({ ruta: '/api/remolques/borrador-corte/confirmar', orderCode: numeroPedido, usuario, notify }); }
    finally { setAbriendo(false); }
  }

  async function calcular() {
    peticion.current?.abort();
    const controller = new AbortController();
    peticion.current = controller;
    setVista({ clave, cargando: true });
    try {
      const respuesta = await fetch('/api/remolques/corte/vista-previa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: entrada, signal: controller.signal,
      });
      const datos = await respuesta.json() as VistaCorteRemolques & { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudo calcular la vista previa del corte.');
      if (!controller.signal.aborted) setVista({ clave, datos });
    } catch (error) {
      if (!controller.signal.aborted) setVista({ clave, error: error instanceof Error ? error.message : 'No se pudo calcular la vista previa del corte.' });
    }
  }

  return <section className="corte-lona panel bloque-3d" aria-label="Vista previa del corte" aria-busy={Boolean(actual?.cargando)}>
    <header className="corte-cabecera">
      <div><span className="corte-titulo"><Scissors aria-hidden="true" /><h2>Vista previa del corte</h2></span>
        <p>Revisa las piezas del pedido antes de guardarlo.</p></div>
      <div className="corte-acciones">
        <button type="button" className="ghost-button boton-3d" onClick={() => void abrirCorte()} disabled={Boolean(bloqueo) || abriendo}
          title="Deja el plano en la carpeta de borradores y lo abre en ZWCAD"><FolderOpen size={16} aria-hidden="true" />{abriendo ? 'Un momento…' : 'Abrir corte'}</button>
        <button type="button" className="ghost-button boton-3d" onClick={() => void confirmarCorte()} disabled={Boolean(bloqueo) || abriendo}
          title="Lee el borrador tal como quedó en ZWCAD y lo da por bueno para guardar para revisión"><CheckCircle2 size={16} aria-hidden="true" />Confirmar corte</button>
        <button className="primary-button boton-3d" type="button" disabled={Boolean(bloqueo) || actual?.cargando}
          onClick={() => void calcular()}>{actual?.cargando ? 'Calculando el corte…' : 'Ver vista previa del corte'}</button>
      </div>
    </header>
    {bloqueo && <p className="corte-ayuda">Para ver el corte falta: {bloqueo}</p>}
    {vista && (!actual || actual.vieja) && <p className="corte-aviso" role="status">Han cambiado los datos: vuelve a calcular la vista previa del corte.</p>}
    {actual?.error && <p className="corte-aviso" role="alert">{actual.error}</p>}
    {actual?.datos && <CorteRemolquesVista datos={actual.datos} />}
  </section>;
}
