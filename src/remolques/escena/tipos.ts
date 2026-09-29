import type { BaquetonInput, BaquetonResult } from "../calc/baqueton.ts";
import type { LonaInput, LonaResult } from "../calc/lona.ts";

// Descripción de la escena del render (fase 2b): dónde va cada cosa en centímetros, sin
// three.js, para poder probarla. Ejes: y hacia arriba (y = 0 es el borde de arriba del cajón);
// z a lo largo (0 = trasera de la lona hecha, largo = delantera); x a lo ancho, centrado, con
// x < 0 el lado izquierdo del remolque mirando hacia delante desde detrás.

export type Vec3 = [number, number, number];
export type Perfil2D = Array<[number, number]>;
export type Vista = "tres-cuartos" | "delante" | "detras" | "lateral" | "arriba";
export type LadoBorde = "delante" | "atras" | "izquierdo" | "derecho";
export type Esquina = "delante-izquierda" | "delante-derecha" | "atras-izquierda" | "atras-derecha";
export type TipoCierre = "NO" | "GOMA" | "CREMALLERA" | "VELCRO" | "PUENTES";

/** Un ollao o un gancho: su lado, su posición con el convenio de los ollaos y dónde cae. */
export interface Marca { lado: LadoBorde; posicion: number; punto: Vec3; normal: Vec3 }
/** `delPedido`: el gancho viene del pedido («Según ganchos»); si no, es uno genérico entre dos ollaos. */
export interface Gancho extends Marca { delPedido: boolean }
/** Recorrido de la goma de un lado: de ollao a gancho, en orden a lo largo del borde. */
export interface Goma { lado: LadoBorde; puntos: Vec3[] }

export interface CierreEsquina {
  esquina: Esquina;
  tipo: TipoCierre;
  /** Pie de la arista vertical de la esquina (y = 0). */
  base: Vec3;
  /** Alto de la pared en esa esquina: hasta donde sube la arista vertical. */
  alto: number;
  /** Dirección, sobre el lateral, que se aleja del paño delantero o trasero. */
  haciaLateral: Vec3;
  /** Normal hacia fuera del lateral. */
  normal: Vec3;
  /** Ancho de la oreja o solapa que dobla sobre el lateral; 0 si no lleva. */
  oreja: number;
  /** Alturas de los ollaos de la oreja (goma) o de los puentes. */
  alturas: number[];
  /** Cremallera: distancia a la esquina y alto hasta el que llega. */
  cremallera: { distancia: number; hasta: number } | null;
  /** Velcro: ancho de la tira en el borde de la oreja. */
  velcro: { ancho: number } | null;
}

export interface CuerpoLona {
  tipo: "lona";
  /** Perfiles de las caras, x centrado, emparejados punto a punto. */
  perfilDelante: Perfil2D;
  perfilAtras: Perfil2D;
  largo: number;
  /** Alto del dobladillo de la bastilla de enfundar; 0 sin bastilla. */
  bastilla: number;
}

export interface CuerpoBaqueton {
  tipo: "baqueton";
  largo: number;
  ancho: number;
  caidaLateral: number;
  caidaDelante: number;
  caidaAtras: number;
}

/** Cajón genérico de chapa galvanizada, con las medidas del remolque. */
export interface Cajon { largo: number; anchoDelante: number; anchoAtras: number; alto: number; zDesde: number; zHasta: number }

export interface VentanaEscena { centro: Vec3; ancho: number; alto: number }

/** Línea de cota, con las vistas en que se enseña. */
export interface CotaEscena { vistas: Vista[]; desde: Vec3; hasta: Vec3; texto: string }
/** Número junto a un ollao o un gancho. */
export interface EtiquetaEscena { vistas: Vista[]; punto: Vec3; texto: string }

export interface EscenaRemolque {
  cuerpo: CuerpoLona | CuerpoBaqueton;
  /** Color base del material (hex). */
  color: string;
  cajon: Cajon;
  ollaos: Marca[];
  ganchos: Gancho[];
  gomas: Goma[];
  cierres: CierreEsquina[];
  ventana: VentanaEscena | null;
  cotas: CotaEscena[];
  etiquetas: EtiquetaEscena[];
  /** Caja que envuelve lona y cajón, para encuadrar las cámaras. */
  caja: { min: Vec3; max: Vec3 };
}

export type ElementoEscena =
  | { tipo: "lona"; input: LonaInput; res: LonaResult }
  | { tipo: "baqueton"; input: BaquetonInput; res: BaquetonResult };
