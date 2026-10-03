// Lo que manda el servidor para pintar una página de telas A4 (sale de buildFabricSheetPages en
// src/domain/planteamientoPdf.js). Los textos ya vienen con «—» en lo que no aplica.
export interface FilaHojaTelas { letter: string; fabricWidth: string; dropLabel: 'SALIDA' | 'CAÍDA'; fabricDrop: string; units: string; line: string }
export interface HojaTelasDatos {
  kind?: 'telas';
  planIndex: number;
  header: { of: string; orderCode: string; customer: string; technician: string; reviewer: string; date: string; title: string };
  diagramTitle: string;
  rotulacion: { tela: string; bamba: string };
  datos: { material: string; curva: string; remate: string };
  rows: FilaHojaTelas[];
  total: { label: string; amount: string };
  notes: string;
  footer: string;
}

// La página de estructura A5 de cada toldo (sale de buildStructureSheetPages, en el mismo fichero).
// `bold` marca tubos, brazos, motor y máquina; `rowsPerPage`, cuántas filas del despiece caben en
// una página antes de pasar a la siguiente.
export interface FilaDespiece { num: string; name: string; reference: string; units: string; length: string; bold: boolean }
export interface FilaAccesorio { name: string; reference: string; units: string }
export interface HojaEstructuraDatos {
  kind: 'estructura';
  structureIndex: number;
  header: { of: string; orderCode: string; customer: string; technician: string; reviewer: string; date: string; letter: string; model: string; device: string };
  despiece: FilaDespiece[];
  rowsPerPage: number;
  accessories: FilaAccesorio[];
  anchoring: FilaAccesorio;
  partida: Array<[string, string]>;
  valid: boolean;
  detalles: Array<[string, string]>;
  tela: Array<[string, string]>;
  notes: string;
  footer: string;
}

/** Cualquier hoja del planteamiento; sin `kind` es una de telas. */
export type HojaPlanteamiento = HojaEstructuraDatos | HojaTelasDatos;
