// Cotas de P1602298.dwg y P1602304.dwg. Las D conservan su referencia de RPS.
const lateral = {
  cota: 'NH', margenLargo: -147, margenCuerpo: -5,
  variantes: [[3200, 600, 'E8D6'], [3200, 900, 'E92E'], [3400, 600, 'E952'],
    [3400, 900, 'E976'], [3600, 600, 'E99A'], [3600, 900, 'E9BE']],
};
const techo = {
  cota: 'NB', margenLargo: 610, margenCuerpo: 55,
  // Iván, 27/11/2026: al NT900 se le quita 1 mm (1021 → 1020) para cortar dos en el ancho del rollo de 2040.
  // El NT600 (721) va de dos en dos: las tres filas del LOTE 05-12 (2163 mm) no caben.
  recorteCorte: { 900: 1 },
  variantes: [[3250, 600, 'E8AF'], [3250, 900, 'E91F'], [3450, 600, 'E940'], [3450, 900, 'E961']],
};
const antiguos = {
  'D001602298-001': { familia: 'P1602298', variante: 3, rotulo: 'E8B3', descripcion: 'SIDE CURTAIN WIDTH=600' },
  'D001602304-001': { familia: 'P1602304', variante: 3, rotulo: 'E8AD', descripcion: 'ROOF CURTAIN' },
};
const familias = { P1602298: lateral, P1602304: techo };

export const familiaTunel = codigo => antiguos[codigo]?.familia ?? codigo?.match(/^P160(?:2298|2304)(?=-)/)?.[0];

export function medidasTunel(codigo, texto, leidas) {
  const familia = familiaTunel(codigo);
  const { cota, margenLargo, margenCuerpo, variantes, recorteCorte = {} } = familias[familia];
  const antiguo = antiguos[codigo];
  const variante = antiguo?.variante ?? Number(codigo.split('-')[1]);
  const nominal = variantes[variante - 1];
  if (!nominal) return { motivo: 'La variante de túnel no está identificada en la plantilla.' };
  const [nominalLargo, NT, rotulo] = nominal;
  const medidas = { [cota]: nominalLargo, NT };
  if (antiguo && texto.trim() === antiguo.descripcion) Object.assign(leidas, medidas);
  const falta = Object.keys(medidas).find(k => !leidas[k]);
  if (falta) return { motivo: `Falta ${falta} completa en la línea de RPS.` };
  if (Object.entries(leidas).some(([k, mm]) => medidas[k] !== mm)) {
    return { motivo: 'Las cotas de RPS difieren de las de esta variante de túnel en la plantilla.' };
  }
  const largo = nominalLargo + margenLargo, cuerpo = NT + margenCuerpo;
  return {
    corteMm: [largo, cuerpo + 2 * 33 - (recorteCorte[NT] ?? 0)],
    terminadoMm: [largo, cuerpo],
    fuentePlantilla: { fichero: (antiguo ? codigo.split('-')[0] : familia) + '.dwg', rotulo: antiguo?.rotulo ?? rotulo },
  };
}
