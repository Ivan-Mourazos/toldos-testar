export type Entidades = {
  lineas: Array<{ capa: string; x1: number; y1: number; x2: number; y2: number }>;
  arcos: Array<{ capa: string; x: number; y: number; r: number; desde: number; hasta: number }>;
  circulos: Array<{ capa: string; x: number; y: number; r: number }>;
  textos: Array<{ capa: string; x: number; y: number; h: number; valor: string }>;
};
export type Programa = { codigo: string; panos: number; repeticiones: number; largoMm: number; anchoOcupadoMm: number; entidades: Entidades };
export type LineaLote = { IDOrderLine: string; CodOrder: string; NumLine?: number; CodArticle: string; descripcion: string;
  cantidad: number; of_: string | null; comentarioLinea: string | null; codigo: string | null;
  estado: 'validado' | 'a-mano'; motivos: string[]; avisos: string[]; corteMm?: number[]; terminadoMm?: number[] };
export type Lote = { nombre: string; fecha: string; lineas: LineaLote[]; programas: Programa[]; avisos: string[]; totalUnidades: number; aMano: number; dwgDisponible: boolean; destino: string };
