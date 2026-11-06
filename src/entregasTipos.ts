export interface MaterialEntrega {
  of: string;
  codigo: string;
  cantidad: number;
  unidad?: string;
}

/** Historial inmutable de lo generado. `null` en materiales significa que el histórico no lo conservó. */
export interface EntregaPedido {
  numero: number;
  fecha: string;
  autor: string;
  ofs: string[];
  archivos: { type?: string; filename: string; savedPath?: string; archivedFilename?: string }[];
  datos: Record<string, string>;
  instantanea: unknown;
  materiales: MaterialEntrega[] | null;
  legacy?: boolean;
  corteConfirmado?: unknown;
}
