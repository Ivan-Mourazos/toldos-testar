export interface MaterialEntrega {
  of: string;
  codigo: string;
  cantidad: number;
  unidad?: string;
}

/** Estado de cada entrega y metadatos de sus sustituciones. `null`: materiales históricos desconocidos. */
export interface EntregaPedido {
  numero: number;
  ordenGeneracion?: number;
  fecha: string;
  autor: string;
  ofs: string[];
  archivos: { type?: string; filename: string; savedPath?: string; archivedFilename?: string }[];
  datos: Record<string, string>;
  instantanea: unknown;
  materiales: MaterialEntrega[] | null;
  legacy?: boolean;
  corteConfirmado?: unknown;
  destino?: { numero: number; modo: 'nuevo' | 'sustituir' };
  revisiones?: { fecha: string; autor: string; archivos: EntregaPedido['archivos']; destino?: EntregaPedido['destino'] }[];
}

export interface DestinoEntrega { numero: number; modo: 'nuevo' | 'sustituir' }
