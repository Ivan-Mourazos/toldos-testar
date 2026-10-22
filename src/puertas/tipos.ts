/** Medidas de confección en centímetros; diámetro de tubos en milímetros. */
export type ModeloPuerta = 'PUERTAENR' | 'PUERTAPLE' | 'PUERTAUTO';
export type Punto = [number, number];
export type Segmento = [number, number, number, number];
export interface Hueco { x: number; y: number; ancho: number; alto: number; radio: number }
export interface Ventana extends Hueco { radioCristal: number }
export interface Entrada { altura: number; diametro: 30 | 42; largo: number; alto: number; huecos: Hueco[] }
export interface MedidasBolsillo { distancia:number; ancho:number; lado:'izquierdo'|'derecho'; altoSuperior:number|null }
export interface Puerta {
  modelo: ModeloPuerta;
  articuloOrigen: ModeloPuerta | '';
  frente: number;
  alto: number;
  of: string;
  cantidad: number;
  margenMarcas: number;
  confirmada: boolean;
  ventanasConfirmadas: boolean;
  bolsillo: boolean;
  medidasBolsillo: MedidasBolsillo;
  material: string;
  color: string;
  materialCristal: string;
  materialSaco: string;
  rollo: number;
  rolloCristal: number;
  rolloSaco: number;
  observaciones: string;
  entradas: Entrada[];
  ventanas: Ventana[];
  enrollable: { T: number; D: number; margen: number; sacoPartido?:boolean;
    /** Ventanales consecutivos bajo el primero, separados por E.T. a las dos caras. */
    ventanales?: Array<{ D: number; margen: number }>;
    empates: Array<{ pano: 'superior' | 'inferior'; altura: number; solape: number; tubo?:number }> };
  apilable: { pie: number; pasos: number[]; cabecera: number; bolsillo: number; saco: 80 | 120 | null; doble: boolean; empates: number[] | null };
  autorreparable: { empates: number[]; espaciadorCentral?: boolean; distanciaEspaciador?: number };
}
export interface AvisoPuerta { codigo: string; nivel: 'error' | 'aviso'; texto: string }
export interface PiezaPuerta {
  id: string;
  nombre: string;
  clase: 'pano' | 'entrada' | 'cristal' | 'cacho' | 'saco';
  ancho: number;
  alto: number;
  cantidad: number;
  material: string;
  rollo: number;
  of: string;
  contorno: Punto[];
  radio: number;
  marcas: Segmento[];
  textos: Array<{x:number;y:number;valor:string}>;
  huecos: Hueco[];
  /** Cristales iguales: se dibujan una vez con «Xn» dentro, porque se cortan de restos. */
  multiplicador?: number;
  /** Posiciones en cm de los mininúmeros compartidos por las piezas que se sueldan. */
  unionesCorte?: Array<{ x: number; y: number; numero: number; giro?: number }>;
}
export interface ResultadoPuerta {
  version: 1;
  piezas: PiezaPuerta[];
  alternativasSaco: { entero: PiezaPuerta[]; partido: PiezaPuerta[] } | null;
  empates: number[];
  uniones: Array<{altura:number;solape:number;tubo?:number}>;
  bolsillo: {x:number;y:number;ancho:number;alto:number} | null;
  avisos: AvisoPuerta[];
}
/** Sobre común con Pedidos; la fase 1 solo usa este documento en memoria. */
export interface PedidoPuertas {
  schemaVersion: 1;
  kind: 'puertas';
  orderCode: string;
  /** Identificación del cliente conservada al guardar para revisión. */
  cabecera?: { cliente?: string; clienteRps?: { codigo?: string } };
  elementos: Array<{ id: string; input: Puerta }>;
  summary?: { customer: string; technician: string; reviewer: string; orderDate: string; ofs: string[]; models: string[]; awnings: number; diagnostics: number };
}
export interface EntidadesPuertas {
  lineas: Array<{ capa: string; x1: number; y1: number; x2: number; y2: number }>;
  textos: Array<{ capa: string; x: number; y: number; h: number; valor: string; giro?: number; centrado?: boolean; literal?: boolean }>;
  arcos: Array<{ capa: string; x: number; y: number; r: number; desde: number; hasta: number }>;
  circulos: Array<{ capa: string; x: number; y: number; r: number }>;
}
export interface CortePuertas {
  material: string;
  anchoRollo: number;
  largo: number;
  opcion: 'principal' | 'saco-entero' | 'saco-partido';
  entidades: EntidadesPuertas;
  colocadas: Array<{ pieza: PiezaPuerta; x: number; y: number; girada: boolean }>;
}
export interface VistaPuertas {
  resultados: ResultadoPuerta[];
  cortes: CortePuertas[];
  avisos: AvisoPuerta[];
  sinOf: string[];
}
