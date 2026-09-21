// Artículos que RPS dio de alta con el largo terminado en "CM" en vez de "C",
// sin que exista la forma normal. Las reglas componen la forma normal, así que
// sin esta tabla reservarían un código inexistente, como BONYXNE11250C, el
// brazo Onyx negro de 250. Solo artículos vigentes, consultados en STKArticle
// el 21/09/2026: los de baja no se traducen, porque eso los resucitaría.
const irregularCodes = new Set([
  'BANTICABL3M44CM', 'BANTICABRUT44CM', 'BART25GR16250CM',
  'BONYXB06T250CM', 'BONYXDNE11250CM', 'BONYXDO516250CM', 'BONYXGR16250CM', 'BONYXINE11250CM',
  'BONYXIO516250CM', 'BONYXMATX250CM', 'BONYXMT14250CM', 'BONYXNE11250CM', 'BONYXO516250CM', 'BONYXVE09250CM',
  'BPRT07BL06100CM', 'BPRT07BL1690CM', 'BPRT07DBL1690CM', 'BPRT07GR1280CM', 'BPRT07IBL1690CM',
  'BPRT07MR1490CM', 'BPRT07NE1190CM', 'BPRT07NEM190CM', 'BPRT07VE0590CM', 'BPRT07VE0980CM',
  'PRBOX400VE05600CM', 'PRBOXS300GR16600CM'
]);

export function resolveRpsCode(code) {
  const clean = String(code || '');
  return irregularCodes.has(`${clean}M`) ? `${clean}M` : clean;
}

// Se aplica una vez a la salida de cada toldo, para que reserva y despiece
// usen el mismo código aunque lo compongan reglas distintas.
export function withRpsCodes(result) {
  return {
    ...result,
    materials: (result.materials || []).map((line) => ({ ...line, code: resolveRpsCode(line.code) })),
    despiece: result.despiece
      ? { ...result.despiece, rows: (result.despiece.rows || []).map((row) => ({ ...row, reference: row.reference ? resolveRpsCode(row.reference) : row.reference })) }
      : result.despiece
  };
}
