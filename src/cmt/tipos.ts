export interface Punto {
  x: number; y: number; type: number; mark: number;
  /** Procedencia del segmento: LINE pasa por otra precisión SVG que las curvas y polilíneas. */
  lineaDxf?: boolean;
}
export interface Duda { handle?: string; tipo?: string; capa?: string; fuenteDxf?: string; motivo: string }
export interface ObjetoGeometrico {
  paths: Punto[][];
  tool: string;
  source: string[];
  entity: string;
  layer: string;
  serial: number;
  firstSteps?: number;
  flags?: number;
}
export interface EntidadDxf { type: string; pairs: [number, string][]; transformacion?: [number,number,number,number,number,number]; fuenteCad?:string; trackingCad?:number }
export interface Dxf {
  entities: EntidadDxf[];
  layers: Record<string, { color: number; flags: number }>;
  styles: Record<string, Record<number, string>>;
  sections: Record<string, EntidadDxf[]>;
}
export interface OpcionesCmt {
  /** Arial del sistema o una copia proporcionada por el administrador. No se distribuye. */
  rutaFuente?: string;
  /** Reproduce las seis cifras del paso SVG del robot. Por defecto, true. */
  compatibilidadRobot?: boolean;
  /** Quita la leyenda completa reconocida de la web u oficina y lleva el dibujo a 300 y 20 mm. */
  sinLeyenda?: boolean;
  /** Descarta TEXT y MTEXT antes de validar fuentes y formato. Por defecto, false. */
  sinTextos?: boolean;
  /** Por defecto textos: preparación para corte siempre descompuesta. directa solo para comparar. */
  preparacionMtext?: 'directa'|'textos';
  /** Rutas TrueType por orden; CMT_FUENTES_RESERVA usa el separador de rutas del sistema. */
  rutasFuentesReserva?: string[];
}
