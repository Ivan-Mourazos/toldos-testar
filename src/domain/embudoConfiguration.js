// Iván, 28/10/2026: embudos de descarga de solo PVC; la cinta la mide el cliente.
export const REMATES_EMBUDO = ['REFUERZO 10', 'BASTILLA', 'ENTRADA CINTA', 'NADA'];
// AR2600169 (Iván, 28/10/2026): la entrada de la cinta de 25 añade 6 cm a la boca.
export const ENTRADA_CINTA_CM = 6;
export const SUJECIONES_EMBUDO = ['MORDAZA', 'CARRACA', 'HEBILLA', 'OJALES Y GOMA', 'VELCRO', 'NINGUNA'];

/** @param {any} raw @returns {import('../client/types').EmbudoConfiguration} */
export function normalizeEmbudo(raw = {}) {
  const e = raw ?? {};
  return {
    forma: String(e.forma ?? 'CÓNICO').trim().toUpperCase().replace('CONICO', 'CÓNICO'),
    alto: numero(e.alto), contornoArriba: numero(e.contornoArriba), contornoAbajo: numero(e.contornoAbajo),
    cierre: e.cierre === undefined ? 3 : numero(e.cierre),
    remateArriba: String(e.remateArriba ?? 'REFUERZO 10').trim().toUpperCase(),
    remateAbajo: String(e.remateAbajo ?? 'REFUERZO 10').trim().toUpperCase(),
    bastillaArriba: e.bastillaArriba === undefined ? 10 : numero(e.bastillaArriba),
    bastillaAbajo: e.bastillaAbajo === undefined ? 10 : numero(e.bastillaAbajo),
    sujecion: String(e.sujecion ?? 'MORDAZA').trim().toUpperCase(),
    anchoCinta: e.anchoCinta === undefined ? 25 : numero(e.anchoCinta), largoCinta: numero(e.largoCinta)
  };
}

export function embudoIssues(raw = {}) {
  const e = normalizeEmbudo(raw), out = [];
  const add = (field, label) => out.push({ field: `embudo_${field}`, label });
  if (!['CÓNICO', 'RECTO'].includes(e.forma)) add('forma', 'forma del embudo');
  for (const [f, label] of [['alto', 'alto del embudo (cm)'], ['contornoArriba', e.forma === 'RECTO' ? 'contorno (cm)' : 'contorno de arriba (cm)'],
    ...(e.forma === 'CÓNICO' ? [['contornoAbajo', 'contorno de abajo (cm)']] : [])]) {
    if (!(e[f] > 0)) add(f, label);
  }
  if (e.forma === 'CÓNICO' && e.contornoArriba > 0 && e.contornoArriba === e.contornoAbajo) add('contornoAbajo', 'contornos distintos en CÓNICO; para iguales elige RECTO');
  if (!(e.cierre >= 0) || e.cierre == null) add('cierre', 'cierre (cm)');
  for (const boca of ['Arriba', 'Abajo']) {
    if (!REMATES_EMBUDO.includes(e[`remate${boca}`])) add(`remate${boca}`, `remate de ${boca.toLowerCase()}`);
    if (e[`remate${boca}`] === 'BASTILLA' && !(e[`bastilla${boca}`] > 0)) add(`bastilla${boca}`, `bastilla de ${boca.toLowerCase()} (cm)`);
  }
  if (!SUJECIONES_EMBUDO.includes(e.sujecion)) add('sujecion', 'sujeción');
  if (e.sujecion !== 'NINGUNA') {
    if (!(e.anchoCinta > 0)) add('anchoCinta', 'ancho de cinta (mm)');
    if (!(e.largoCinta > 0)) add('largoCinta', 'largo de cinta (cm)');
  }
  return out;
}

export function etiquetasEmbudo(raw = {}) {
  const e = normalizeEmbudo(raw), n = (v) => Number(v).toLocaleString('es-ES');
  // En el recto el refuerzo es una bastilla de 10 (AR2506008: «refuerzo arriba y abajo» = B.N.(10)).
  const remate = (boca) => e[`remate${boca}`] === 'BASTILLA' ? `B.N (${n(e[`bastilla${boca}`])})`
    : e[`remate${boca}`] === 'REFUERZO 10' ? (e.forma === 'RECTO' ? 'B.N (10)' : 'REF.(10)')
    : e[`remate${boca}`] === 'ENTRADA CINTA' ? `E.CINTA (${n(e.anchoCinta)})` : 'AL CORTE';
  const cinta = e.sujecion === 'NINGUNA' ? [] : e.forma === 'RECTO'
    ? [`${e.sujecion} (${n(e.anchoCinta)}) CON CINTA DE ${n(e.largoCinta)} CM METIDA EN ENTRADA`]
    : [`CINTA (${n(e.anchoCinta)}) BLANCA DE ${n(e.largoCinta)} CM`,
      e.sujecion === 'MORDAZA' ? `MORDAZA(${n(e.anchoCinta)}) CON CINTA DE 12 CM` : `${e.sujecion} (${n(e.anchoCinta)})`];
  return { arriba: remate('Arriba'), abajo: remate('Abajo'), cierre: `CERRAR ${n(e.cierre)} CM`, cinta };
}

function numero(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
