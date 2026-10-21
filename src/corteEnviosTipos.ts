/** Un envío confirmado del corte; se conserva aunque se corrija o se genere el pedido. */
export interface EnvioCorte {
  id: string;
  fecha: string;
  usuario: string;
  destino: 'bot' | 'dxfs';
  carpeta: string;
  parcial?: boolean;
  archivos: { filename: string; savedPath: string }[];
}
