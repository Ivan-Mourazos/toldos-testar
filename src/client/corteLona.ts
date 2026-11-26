import type { CorteDelPlanoCliente } from './components/CortesDelPlano';
export type AjustesCorte = {
  empate?: 'horizontal' | 'vertical'; empateCm?: number; aumentoEscuadrarCm?: number;
  lateralVerticalCm?: number; tiraExtraLargoCm?: number; tiraExtraAltoCm?: number;
  varillaArriba?: string; varillaArribaMm?: number; varillaTiraMm?: number; tiraPartida?: boolean;
  // Bastillas de la bambalina, en cm por borde; 0 es al corte (Iván, 19/11/2026).
  bambaPuntaIzqCm?: number; bambaPuntaDerCm?: number; bambaAbajoCm?: number; bambaArribaCm?: number;
};
export type EstadoCorte = {
  version: number; generadoEn: string; generadoPor: string; ofStockSacos: string;
  ajustes: Record<string, AjustesCorte>;
  toldos: { clave: string; id: string; letra: string; of: string; firma: string; manual?: boolean; motivoManual?: string }[];
};
export type PendienteCorte = { letra: string; motivo: 'sinGenerar' | 'viejo' };
export type VistaCorte = {
  idMaterial: string; codigoTela: string; material: string; anchoRollo: number; largo: number; largoRestos?: number;
  largoMaterial?: number;
  repeticiones?: number;
  piezas: { letra: string; unidades?: number; piezas: { nombre: string; largo: number; alto: number }[] }[];
  sacos: { largo: number; alto: number }[];
  dibujo: {
    lineas: { capa: string; x1: number; y1: number; x2: number; y2: number }[];
    textos: { capa?: string; x: number; y: number; h: number; valor: string; giro?: number; centrado?: boolean }[];
    arcos?: { capa: string; x: number; y: number; r: number; desde: number; hasta: number }[];
  };
};
export type CorteRespuesta = {
  corteLona: EstadoCorte | null; pendientes: PendienteCorte[]; avisos: string[];
  cortes: { conSacos: VistaCorte[]; trozoSeparado: VistaCorte[] | null };
  /** El recuadro CORTE del plano de cada tela que escribiría la web, con sus cotas (`archivo`: la tela). */
  cortesPlano?: CorteDelPlanoCliente[];
};

export function textoEstadoCorte(estado: 'hecho' | 'falta' | 'viejo') {
  return estado === 'hecho' ? 'Corte al día' : estado === 'viejo' ? 'El corte está viejo: han cambiado las medidas' : 'Falta generar el corte';
}
