/** Medidas de confección en centímetros; diámetro de tubos en milímetros. */
/** SYSTEMDOCK: lona perimetral de SYSTEM DOCK (frente = largo y alto = ancho de la lona; ver systemDock.ts). */
export type ModeloPuerta = 'PUERTAENR' | 'PUERTAPLE' | 'PUERTAUTO' | 'SYSTEMDOCK' | 'SACOARENA' | 'ABRIGO';
export type Punto = [number, number];
export type Segmento = [number, number, number, number];
export interface Hueco { x: number; y: number; ancho: number; alto: number; radio: number; abierto?: 'izquierda' | 'derecha' }
export interface Ventana extends Hueco {
  radioCristal: number;
  /** Apilables: tramo entre el tubo n y el n + 1 (desde abajo), con la ventana centrada en él, como viene en la hoja
   * (Iván, 26/10/2026: «a nosotros esa medida [desde abajo] no nos la dan»). La y se calcula de él. */
  tramo?: number;
}

export interface VentanalApilable {
  /** Tramo entre el tubo n y el n + 1, desde abajo. */
  tramo: number;
  margen: number;
}
export interface Entrada { altura: number; diametro: 30 | 42; largo: number; alto: number; huecos: Hueco[] }
export interface MedidasBolsillo { distancia:number; ancho:number; lado:'izquierdo'|'derecho'; altoSuperior:number|null }
/** ARAUJO: medidas terminadas en cm, por el revés; cada bolsa conserva su propio frente. */
export type ExtremoAraujo = { tipo: 'canutillo' } | { tipo: 'et'; ancho: number };
export interface EntradaAraujo { altura: number; ancho: number; huecoLibre?: number }
export interface TramoAraujo {
  tipo: 'tramo' | 'bolsa'; frente: number; alto: number; cantidad: number;
  ventanas: Ventana[];
  of?: string;
  material?: string;
  arriba?: ExtremoAraujo;
  abajo?: ExtremoAraujo;
  /** Ejes desde el bajo terminado; huecoLibre es una nota de soldadura, sin recortes de máquina. */
  entradas?: EntradaAraujo[];
  rotulacion?: { texto: string; ancho: number; desdeDerecha: number; desdeBajo?: number; centrada?: boolean; dosCaras?: boolean };
}
export interface ConfiguracionAraujo {
  forma: 'sueltos' | 'continua';
  corteTrasImprimir?: boolean;
  /** Dos perfiles observados; el de 6,5 solo se aplica si se confirma expresamente. */
  perfil: string;
  tramos: TramoAraujo[];
}
export type ParteAbrigo = 'frente' | 'laterales' | 'perimetral' | 'tiras';
/** Belts Vigo (RPS 038908): enrollables y apilables contrastadas en docs/modelos/puertas-belts-luz.md. */
export interface ConfiguracionBelts {
  cabecera: 'varilla' | 'corte';
  bajoEt: number;
  marcaBajoEt?: number;
  etiquetaEtInferior?: string;
  pestana3: boolean;
  altoSaco: number;
  anchoEt: number;
  etiquetaEt?: string;
  pisarEt1cm?: boolean;
  cierreVelcro?: boolean;
  cintaAncho?: number;
  cintaAlto?: number;
}
/** Puertas Luz (RPS 052082): apilable, enrollable de lona y enrollable transparente (docs/modelos/puertas-belts-luz.md). */
export interface ConfiguracionPuertasLuz {
  variante: 'apilable' | 'enrollable' | 'transparente';
  cabecera: 'varilla' | 'bd';
  altoFaldon: number;
  extraAnchoFaldon: number;
  bajoEt: number;
  pestana3: boolean;
  anchoEt: number;
  cintaAncho?: number;
  cintaAlto?: number;
  sacoArena: boolean;
  descuentoSacoArena: number;
  soldaduraSacoArena: number;
  materialSacoArena: string;
  margenLateral?: number;
  altoCabecera?: number;
  tramosTransparentes?: number[];
}
export interface Puerta {
  abrigo?: { parte: ParteAbrigo; corto: number };
  /** Santa Pau: los bordes visibles de mirilla van en ventanas; ejes de tubo en entradas. */
  santapau?: { /** Sin revisión, se conserva el corte anterior si el documento guardó +5. */
    revision?: '4815' | '5363';
    aumentoBajo: number; altoFaldon: number; ladoCerrado: 'izquierda'|'derecha'|'sin confirmar'; refuerzos: boolean; anchoRefuerzo?: number };
  belts?: ConfiguracionBelts;
  puertasluz?: ConfiguracionPuertasLuz;
  tgm?: {
    altoHueco: number; // cm
    altoTotal: number | null; // cm; si falta, se suma el añadido al alto del hueco
    anadido: number; // cm
    diametroEnrolle: number; // mm
    nTubos: number;
    diametroTubo: 42; // mm
    anchoEt: number; // cm de corte
    lona: 'pvc' | 'rejilla';
    materialEt: 'LAC650' | 'LAC900'; // Solo para las tiras aparte de la rejilla.
    arriba?: 'varilla' | 'bastilla';
    bastillaArriba?: number | null; // cm de aumento sobre el doblez.
    soldaduraEt?: number | null; // cm de soldadura en cada borde de la E.T.
    ventanal?: { tramo: number }; // Tramo entre E.T., numerado desde abajo.
    varilla?: 'blanca' | 'negra'; // Varilla de arriba: blanca 5,5 o negra 4,5; la web la pregunta.
    cierreBajo: number; // cm de lona por debajo del bajo terminado (Q-TGM05)
    marcaCierre: number; // cm desde el borde del corte (Q-TGM05)
    laterales?: 'corte' | 'bastilla';
    bastilla?: number | null;
    terminado?: number | null;
    soldadura?: number | null;
    abajo: 'tubo' | 'saco' | 'envolvente'; // La medida del saco se guarda en enrollable.saco.
    sacoUnido?: boolean; // Saco en la lona de la puerta (true) o pieza aparte (false); sin valor decide el material.
    grosor: number; // mm
    cotasHoja?: number[] | null; // cm de centro a centro, de abajo arriba.
    tubosManual: number[] | null; // mm desde el perfil; null para reparto automático
    ajustes: { margen: number; desvio: number; altoPerfil: number; anchoPerfil: number; anguloPerfil: number }; // mm y grados
  };
  /** Opcionales: los documentos anteriores conservan su interpretación y sus bytes. */
  clientePuertas?: string;
  tipoPuerta?: string;
  modelo: ModeloPuerta;
  articuloOrigen: ModeloPuerta | 'PUERTAPLET' | 'PUERTAPLETRA' | 'PUERTAPLETRAM' | '';
  araujo?: ConfiguracionAraujo;
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
  /** Saco negro que recibe diagonales amarillas en impresión digital tras cortarlo. */
  sacoDiagonalesAmarillas?: boolean;
  rollo: number;
  rolloCristal: number;
  rolloSaco: number;
  observaciones: string;
  /** Nota que se quiere ver en el plano; opcional (Iván, 23/10/2026). Las observaciones de RPS ya no se imprimen. */
  notaPlano?: string;
  entradas: Entrada[];
  ventanas: Ventana[];
  enrollable: { T: number; D: number; margen: number; sacoPartido?:boolean;
    /** Huecos individuales sobre paño continuo, como las ventanas de las apilables. */
    ventanasPequenas?: boolean;
    /** Puerta enrollable ciega, sin ventanal (Iván, 06/11/2026, AR2605429): un solo paño del saco a la cabecera,
     * sin cristal ni cachos; T, D y margen no cuentan. */
    sinVentanal?: boolean;
    /** TGM con tubo abajo, alojado en el cierre de la lona. */
    sinSaco?: boolean;
    /** Centímetros de lona por debajo del bajo terminado para el cierre (Q-TGM05). */
    cierreBajo?: number;
    /** Centímetros desde el borde de corte a la marca del cierre (Q-TGM05). */
    marcaCierre?: number;
    /** Ancho de corte de la E.T. en cm. Sin el campo, se aplica REGLAS_ENROLLABLE.corteEntrada. */
    anchoEt?: number;
    /** Sin E.T. encima: T llega al borde del paño y no hay marcas de esa E.T.
     * El cristal y los cachos solapan 2 cm con el paño. Sin el campo, con E.T. como siempre. */
    sinEtArriba?: boolean;
    /** Sin E.T. debajo: la última D llega al borde del paño inferior, sin marcas de esa E.T. */
    sinEtAbajo?: boolean;
    /** Saco útil del pedido en mm; sin el campo (guardadas antes del 23/10/2026), 120. */
    saco?: number | null;
    /** Ventanales consecutivos bajo el primero, separados por E.T. a las dos caras. */
    ventanales?: Array<{ D: number; margen: number }>;
    empates: Array<{ pano: 'superior' | 'inferior'; altura: number; solape: number; tubo?:number }> };
  apilable: { pie: number; pasos: number[]; cabecera: number; bolsillo: number;
    /** Saco útil del pedido en mm (80, 110, 120…); se remata 1 cm más grande. */
    saco: number | null; doble: boolean; empates: number[] | null;
    ventanales?: VentanalApilable[];
    /** Margen propuesto al marcar tramos. Cada ventanal guarda también su propio margen. */
    margenVentanales?: number;
    /** Doble saco: útil del saco exterior (envoltorio) en mm; sin poner, el interior + 50. */
    sacoExterior?: number | null;
    /** Lado de la pestaña del saco mirando por el revés, como el pedido; sin poner, izquierda. */
    ladoPestana?: 'izquierda' | 'derecha';
    /** Altos terminados mirando por el revés, como el alzado y la hoja de Portanova. La cadena común toma el bajo izquierdo como origen. */
    sueloInclinado?: { altoIzquierdo: number; altoDerecho: number } };
  autorreparable: { empates: number[]; espaciadorCentral?: boolean; distanciaEspaciador?: number;
    /** Saco útil del pedido en mm; sin el campo (guardadas antes del 23/10/2026), 120. */
    saco?: number | null };
}
export interface AvisoPuerta { codigo: string; nivel: 'error' | 'aviso'; texto: string }
export interface PiezaPuerta {
  abrigo?: { capa: 'DISCO1'|'CUTTER'; nota: string };
  id: string;
  nombre: string;
  clase: 'pano' | 'entrada' | 'cristal' | 'cacho' | 'saco' | 'refuerzo';
  ancho: number;
  alto: number;
  cantidad: number;
  material: string;
  rollo: number;
  of: string;
  /** Indicación de impresión del saco; no modifica su material ni su contorno. */
  sacoDiagonalesAmarillas?: boolean;
  /** El alto cruza el rollo en el corte posterior a la impresión; no se gira para ahorrar lona. */
  sinGiro?: boolean;
  /** Bolsa de una impresa Araujo: muestra horizontal independiente en oficina. */
  bolsaImpresaAraujo?: boolean;
  /** ARAUJO impresa: origen del paño desde el corte inferior del cuerpo, antes de repartir el rollo. */
  impresionAraujo?: {tramo:number;parte:number;partes:number;desdeBajo:number;empate:number;
    entradas:Array<{y:number;ancho:number;altura:number}>};
  contorno: Punto[];
  radio: number;
  marcas: Segmento[];
    /** Señal circular de rotulador, sin agujero ni corte (Santa Pau). */
    circulosMarca?: Array<{x:number;y:number;r:number}>;
  textos: Array<{x:number;y:number;valor:string}>;
  huecos: Hueco[];
  /** Cristales iguales: se dibujan una vez con «Xn» dentro, porque se cortan de restos. */
  multiplicador?: number;
  /** Posiciones en cm de los mininúmeros compartidos por las piezas que se sueldan. */
  unionesCorte?: Array<{ x: number; y: number; numero: number; giro?: number }>;
  /** E.T. que van dentro del paño (apilable con empate en un tubo): su número y el centro de su franja (Iván, 23/10/2026). */
  entradasIncorporadas?: Array<{ tubo: number; y: number; alto: number }>;
  /** Origen de la pieza en el alzado, en cm desde el bajo terminado. */
  origenAlzado?: Punto;
  /** Margen añadido después de confeccionar; los rótulos conservan las posiciones de la puerta. */
  margenEscuadrado?: number;
  /** Paño de enrollable con ventanas pequeñas: rótulos en el hueco libre, como las apilables. */
  rotulosEnHueco?: boolean;
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
  cabecera?: { cliente?: string; fecha?: string; clienteRps?: { codigo?: string; nombre?: string } };
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
  extensionDibujo?: number;
  opcion: 'principal' | 'saco-entero' | 'saco-partido';
  entidades: EntidadesPuertas;
  colocadas: Array<{ pieza: PiezaPuerta; x: number; y: number; girada: boolean; aparte?: boolean }>;
}
export interface VistaPuertas {
  resultados: ResultadoPuerta[];
  cortes: CortePuertas[];
  avisos: AvisoPuerta[];
  sinOf: string[];
}
