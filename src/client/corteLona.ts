export type AjustesCorte = {
  empate?: 'horizontal' | 'vertical'; empateCm?: number; aumentoEscuadrarCm?: number;
  lateralVerticalCm?: number; tiraExtraLargoCm?: number; tiraExtraAltoCm?: number;
  varillaArriba?: string; varillaArribaMm?: number; varillaTiraMm?: number; tiraPartida?: boolean;
};
export type EstadoCorte = {
  version: number; generadoEn: string; generadoPor: string; ofStockSacos: string;
  ajustes: Record<string, AjustesCorte>;
  toldos: { clave: string; id: string; letra: string; of: string; firma: string; manual?: boolean; motivoManual?: string }[];
};
export type PendienteCorte = { letra: string; motivo: 'sinGenerar' | 'viejo' };
export type VistaCorte = {
  idMaterial: string; codigoTela: string; material: string; anchoRollo: number; largo: number; largoRestos?: number;
  piezas: { letra: string; unidades?: number; piezas: { nombre: string; largo: number; alto: number }[] }[];
  sacos: { largo: number; alto: number }[];
  dibujo: {
    lineas: { capa: string; x1: number; y1: number; x2: number; y2: number }[];
    textos: { x: number; y: number; h: number; valor: string; giro?: number; centrado?: boolean }[];
  };
};
export type CorteRespuesta = {
  corteLona: EstadoCorte | null; pendientes: PendienteCorte[]; avisos: string[];
  cortes: { conSacos: VistaCorte[]; trozoSeparado: VistaCorte[] | null };
};

export function textoEstadoCorte(estado: 'hecho' | 'falta' | 'viejo') {
  return estado === 'hecho' ? 'Corte al día' : estado === 'viejo' ? 'El corte está viejo: han cambiado las medidas' : 'Falta generar el corte';
}
