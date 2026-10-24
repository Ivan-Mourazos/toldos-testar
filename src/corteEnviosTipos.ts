/** Un envío confirmado del corte; se conserva aunque se corrija o se genere el pedido. */
export interface EnvioCorte {
  id: string;
  fecha: string;
  usuario: string;
  destino: 'bot' | 'dxfs';
  carpeta: string;
  parcial?: boolean;
  /** Lo que hay que recordar del envío (p. ej. que el corte del DWG cambió después de revisarlo). */
  nota?: string;
  archivos: { filename: string; savedPath: string }[];
}
