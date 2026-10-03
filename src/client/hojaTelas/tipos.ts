// Lo que manda el servidor para pintar una página de telas A4 (sale de buildFabricSheetPages en
// src/domain/planteamientoPdf.js). Los textos ya vienen con «—» en lo que no aplica.
export interface FilaHojaTelas { letter: string; fabricWidth: string; dropLabel: 'SALIDA' | 'CAÍDA'; fabricDrop: string; units: string; line: string }
export interface HojaTelasDatos {
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
