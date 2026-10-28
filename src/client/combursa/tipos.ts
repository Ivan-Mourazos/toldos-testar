export type Entidades = {
  lineas: Array<{ capa: string; x1: number; y1: number; x2: number; y2: number }>;
  arcos: Array<{ capa: string; x: number; y: number; r: number; desde: number; hasta: number }>;
  circulos: Array<{ capa: string; x: number; y: number; r: number }>;
  textos: Array<{ capa: string; x: number; y: number; h: number; valor: string }>;
};
export type Programa = { codigo: string; tipo?: 'canalon'; palet?: number | null; canalones?: number; referencias?: string[]; panos: number; filas?: number; unidos?: boolean; repeticiones: number; largoMm: number; anchoOcupadoMm: number; entidades: Entidades };
export type LineaLote = { IDOrderLine: string; CodOrder: string; NumLine?: number; CodArticle: string; descripcion: string;
  cantidad: number; of_: string | null; comentarioLinea: string | null; codigo: string | null;
  estado: 'validado' | 'a-mano'; motivos: string[]; avisos: string[]; corteMm?: number[]; terminadoMm?: number[]; palet?: number | null };
/** Una fila del papel del cortador: lo que se corta de una referencia (o de un juego de canalones) en un palet. */
export type FilaCortador = { palet: number | null; referencia: string; referencias?: string[]; unidades: number; como: string[]; pedidas: number; cuadra: boolean };
export type Lote = { nombre: string; fecha: string; lineas: LineaLote[]; programas: Programa[]; cortador: FilaCortador[]; avisos: string[]; paletsCompletos: boolean; totalUnidades: number; aMano: number; dwgDisponible: boolean; destino: string };
