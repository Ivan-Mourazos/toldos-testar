import React, { useEffect, useRef, useState } from 'react';
import type { CalcParams } from '../../remolques/calc/params.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { CorteRemolquesVista, type VistaCorteRemolques } from './CorteRemolques';
import { cuerpoVistaPrevia } from './vistaPrevia';
import { clienteRpsDeLineas } from './guardarPedido';

type EstadoVista = { entrada: string; datos?: VistaCorteRemolques; error?: string; cargando?: boolean };

/** Los datos del pedido tal como los piden la vista previa del corte y el borrador del DWG. */
export function entradaCorte(lineas: LineaPedido[], params: CalcParams): string {
  const clienteRps = clienteRpsDeLineas(lineas);
  return JSON.stringify({ ...cuerpoVistaPrevia(lineas), params, ...(clienteRps ? { clienteRps } : {}) });
}

/**
 * El corte del pedido, calculado solo un momento después de cambiar los datos, como en puertas (Iván, 26/10/2026:
 * «revisa que en toda la web… el nuevo visor del corte»). `bloqueo`: lo que falta para poder calcularlo.
 */
export function useVistaCorteRemolques(entrada: string, bloqueo: string | null) {
  const solicitud = useRef<AbortController | null>(null);
  const [vista, setVista] = useState<EstadoVista | null>(null);
  const actual = vista?.entrada === entrada && !bloqueo ? vista : null;
  async function calcular() {
    solicitud.current?.abort();
    const abortar = new AbortController();
    solicitud.current = abortar;
    setVista({ entrada, cargando: true });
    try {
      const respuesta = await fetch('/api/remolques/corte/vista-previa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: entrada, signal: abortar.signal,
      });
      const datos = await respuesta.json() as VistaCorteRemolques & { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudo calcular el corte.');
      if (!abortar.signal.aborted) setVista({ entrada, datos });
    } catch (error) {
      if (!abortar.signal.aborted) setVista({ entrada, error: error instanceof Error ? error.message : 'No se pudo calcular el corte.' });
      else setVista((v) => (v?.cargando ? null : v));
    }
  }
  useEffect(() => {
    if (bloqueo) return;
    const espera = setTimeout(() => void calcular(), 600);
    return () => { clearTimeout(espera); solicitud.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrada, bloqueo]);
  return { actual, bloqueo };
}

export type VistaCorte = ReturnType<typeof useVistaCorteRemolques>;

/** El corte de todo el pedido, en la pestaña «Corte» junto al dibujo del elemento. */
export function VistaPreviaCorte({ vista }: { vista: VistaCorte }) {
  const { actual, bloqueo } = vista;
  return <section className="corte-lona rem-corte-junto" aria-label="Corte del pedido" aria-busy={Boolean(actual?.cargando)}>
    {bloqueo && <p className="corte-ayuda">Para ver el corte falta: {bloqueo}</p>}
    {!bloqueo && (!actual || actual.cargando) && <p className="corte-ayuda" role="status">Calculando el corte…</p>}
    {actual?.error && <p className="corte-aviso" role="alert">{actual.error}</p>}
    {actual?.datos && <CorteRemolquesVista datos={actual.datos} />}
  </section>;
}
