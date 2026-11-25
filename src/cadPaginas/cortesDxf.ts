// Solo el corte del plano del pedido, como en «Planos a corte»: lo que hay dentro de cada recuadro CORTE
// (o rectángulo de la capa 0), sin presentaciones ni cajetín. Para el dibujo ya está la pestaña Dibujo.
import { textoDxf } from '../cmtPiloto.js';
import { preparar, type ResultadoPreparacion } from '../cmt/preparacion/index.ts';
import capasIniciales from '../cmt/preparacion/capasIniciales.json' with { type: 'json' };
import type { Herramienta } from '../cmt/preparacion/tipos.ts';

export interface CorteDelPlano {
  vista: ResultadoPreparacion['vista'];
  medidasMm: ResultadoPreparacion['medidasMm'];
}

const TABLA = capasIniciales as Record<string, Herramienta>;

/** Un corte por recuadro; vacío si el plano no tiene recuadro del corte (planos antiguos). */
export function cortesDelDxf(dxf: Uint8Array | string): CorteDelPlano[] {
  const texto = textoDxf(dxf);
  const opciones = { origen: 'dwg' as const, tabla: TABLA, soloAnalisis: true };
  const primero = preparar(texto, opciones);
  const marcos = primero.pendientes.marcos?.length ?? 0;
  const resultados = marcos > 1
    ? Array.from({ length: marcos }, (_, marco) => preparar(texto, { ...opciones, decisiones: { marco } }))
    : [primero];
  return resultados
    .filter(r => r.vista.length > 0)
    .map(({ vista, medidasMm }) => ({ vista, medidasMm }));
}
