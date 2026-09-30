export interface ClienteRps {
  codigo: string;
  nombre: string;
  alias: string | null;
}

export interface MaterialRps {
  gramaje: number | null;
  color: string | null;
  texto: string;
}

export interface LineaPedidoRps {
  idLinea: string;
  numeroLinea: number;
  codigoArticulo: string;
  ordenFabricacion: string | null;
  cantidad: number;
  tipoTrabajo: "lona" | "baqueton";
  largo: number | null;
  ancho: number | null;
  alto: number | null;
  altoDelante: number | null;
  altoAtras: number | null;
  aguas: number | null;
  baqueton: number | null;
  ventana: boolean;
  /** true/false si RPS lo dice explícitamente; null si no aporta el dato. */
  rotulacion: boolean | null;
  tipoRotulacion: string | null;
  textoRotulacion: string | null;
  recogidaDelante: boolean;
  recogidaAtras: boolean;
  materialRps: MaterialRps;
  /** Resuelta en el servidor: bobina compatible con mayor stock actual. */
  materialSugerido?: string | null;
  descripcion: string;
  detalle: string;
  requiereRevision: boolean;
}

export interface PedidoRps {
  numero: string;
  fecha: string | null;
  fechaSalida: string | null;
  cliente: ClienteRps;
  lineas: LineaPedidoRps[];
}

export interface OrigenRps {
  numeroPedido: string;
  numeroLinea: number;
  idLinea: string;
  ordenFabricacion: string | null;
  importadoEn: string;
  // Lo que el elemento necesita para enseñar de dónde salió sin volver a consultar RPS (los
  // borradores del navegador lo conservan). Opcional: las líneas importadas antes no lo traen.
  /** RPS no da las medidas de forma inequívoca (p. ej. «CONFECCIÓN SEGÚN PATRÓN»). */
  requiereRevision?: boolean;
  /** Lo que conviene comprobar a mano de lo que trajo RPS. */
  avisos?: string[];
  /** El texto de la línea en RPS, para contrastarlo. */
  texto?: string;
}
