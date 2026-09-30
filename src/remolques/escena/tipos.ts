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
export type TipoCierre = "NO" | "GOMA" | "CORAZON" | "CREMALLERA" | "VELCRO" | "PUENTES";

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
  /** Alturas de los puentes, repartidas a lo alto con el paso de los ollaos. */
  alturas: number[];
  /** Ganchos corazón, de abajo arriba, alternando la fila de la oreja y la del lateral a un lado y
   *  otro del borde libre de la oreja (`enOreja`); el cordón va de uno a otro en zigzag y se anuda
   *  en `nudo`, en el borde de la oreja por debajo del primero. null en las demás recogidas o sin oreja. */
  corazon: { ganchos: Array<{ punto: Vec3; enOreja: boolean }>; nudo: Vec3 } | null;
  /** Goma: cada ollao del borde libre de la oreja, de abajo arriba, con el gancho del cajón al que
   *  baja en diagonal (en la cara del paño) y el punto de la arista de la esquina por donde la goma
   *  dobla de una cara a la otra. Vacío en las demás recogidas o sin oreja. `ganchoNuevo` es false
   *  cuando la goma acaba en un gancho que ya está (uno de la goma perimetral de esa cara, o el del
   *  centro que ya puso otra goma): ese gancho no se vuelve a dibujar. */
  gomaDiagonal: Array<{ ollao: Vec3; esquina: Vec3; gancho: Vec3; ganchoNuevo: boolean }>;
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

/** Rueda: centro, radio del neumático y ancho; el eje va a lo ancho (x). */
export interface RuedaEscena { centro: Vec3; radio: number; ancho: number }
export interface TuboEscena { desde: Vec3; hasta: Vec3 }

/** Remolque genérico bajo el cajón, para que se vea dónde está delante y detrás (no a escala). */
export interface ChasisEscena {
  /** Altura del suelo: donde apoyan las ruedas. */
  suelo: number;
  /** Los dos tubos de la lanza en V, izquierdo y derecho, de bajo el cajón al enganche. */
  lanza: TuboEscena[];
  seccionLanza: number;
  enganche: { bola: Vec3; radioBola: number; cabeza: { centro: Vec3; largo: number; ancho: number; alto: number } };
  ruedaJockey: { rueda: RuedaEscena; tubo: TuboEscena };
  eje: TuboEscena;
  /** Izquierda y derecha. */
  ruedas: RuedaEscena[];
  guardabarros: RuedaEscena[];
  /** Pilotos traseros, izquierdo y derecho, en la cara de atrás del cajón. */
  pilotos: Array<{ centro: Vec3; ancho: number; alto: number; fondo: number }>;
}

/** Rótulo DELANTE o DETRÁS de las vistas rectas; `alinear` es el del texto respecto a su punto. */
export interface RotuloEscena { vistas: Vista[]; punto: Vec3; texto: "DELANTE" | "DETRÁS"; alinear: "start" | "middle" | "end" }

export interface VentanaEscena { centro: Vec3; ancho: number; alto: number }

/** Línea de cota, con las vistas en que se enseña. */
export interface CotaEscena { vistas: Vista[]; desde: Vec3; hasta: Vec3; texto: string }
/** Número junto a un ollao o un gancho. `hacia`: hacia dónde se escribe en la hoja de taller, que
 *  los pone en vertical para que no se pisen (ollaos hacia arriba, sobre la lona; ganchos hacia
 *  abajo, sobre el cajón). */
export interface EtiquetaEscena { vistas: Vista[]; punto: Vec3; texto: string; hacia: "arriba" | "abajo" }

export interface EscenaRemolque {
  cuerpo: CuerpoLona | CuerpoBaqueton;
  /** Color base del material (hex). */
  color: string;
  cajon: Cajon;
  chasis: ChasisEscena;
  ollaos: Marca[];
  ganchos: Gancho[];
  gomas: Goma[];
  cierres: CierreEsquina[];
  ventana: VentanaEscena | null;
  cotas: CotaEscena[];
  etiquetas: EtiquetaEscena[];
  /** Se ven siempre, con o sin cotas. */
  rotulos: RotuloEscena[];
  /** Caja que envuelve lona, cajón y remolque, para encuadrar las cámaras. */
  caja: { min: Vec3; max: Vec3 };
}

export type ElementoEscena =
  | { tipo: "lona"; input: LonaInput; res: LonaResult }
  | { tipo: "baqueton"; input: BaquetonInput; res: BaquetonResult };
