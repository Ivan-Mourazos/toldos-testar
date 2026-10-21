import React, { useEffect, useRef, useState } from 'react';
import { Scissors } from 'lucide-react';
import type { CalcParams } from '../../remolques/calc/params.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { CorteRemolquesVista, type VistaCorteRemolques } from './CorteRemolques';
import { cuerpoVistaPrevia } from './vistaPrevia';
import { clienteRpsDeLineas } from './guardarPedido';

export function VistaPreviaCorte({ lineas, params, bloqueo }: { lineas: LineaPedido[]; params: CalcParams; bloqueo: string | null }) {
  const clienteRps = clienteRpsDeLineas(lineas);
  const entrada = JSON.stringify({ ...cuerpoVistaPrevia(lineas), params, ...(clienteRps ? { clienteRps } : {}) });
  const clave = JSON.stringify([entrada, bloqueo]);
  const [vista, setVista] = useState<{ clave: string; datos?: VistaCorteRemolques; error?: string; cargando?: boolean; vieja?: boolean } | null>(null);
  // Se descarta también si se vuelve después a las medidas anteriores.
  if (vista && vista.clave !== clave) setVista({ clave, vieja: true });
  const peticion = useRef<AbortController | null>(null);
  useEffect(() => () => { peticion.current?.abort(); }, [clave]);
  const actual = vista?.clave === clave && !bloqueo ? vista : null;

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
      <button className="primary-button boton-3d" type="button" disabled={Boolean(bloqueo) || actual?.cargando}
        onClick={() => void calcular()}>{actual?.cargando ? 'Calculando el corte…' : 'Ver vista previa del corte'}</button>
    </header>
    {bloqueo && <p className="corte-ayuda">Para ver el corte falta: {bloqueo}</p>}
    {vista && (!actual || actual.vieja) && <p className="corte-aviso" role="status">Han cambiado los datos: vuelve a calcular la vista previa del corte.</p>}
    {actual?.error && <p className="corte-aviso" role="alert">{actual.error}</p>}
    {actual?.datos && <CorteRemolquesVista datos={actual.datos} />}
  </section>;
}
