import { codigoAssa } from '../../src/assa/leerCorte.js';
import { unico } from './geometria.mjs';

const num = n => n.toLocaleString('es-ES', { useGrouping: false, maximumFractionDigits: 3 });
const lista = xs => xs.length ? xs.join('; ') : '—';
const mm = ns => ns.map(num).join(' × ');
const celda = v => String(v ?? '—').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
const tabla = (cab, filas) => [cab, cab.map(() => '---'), ...filas].map(f => '| ' + f.map(celda).join(' | ') + ' |').join('\n');
const nombre = l => l.CodOrder + '/' + l.NumLine;
const grupos = (items, clave) => [...Map.groupBy(items, clave)].map(([k, xs]) => `${xs.length} de ${k}`);
const ficheros = xs => lista(unico(xs.map(h => h.fichero)));
const citas = new Set(['AR.26.05142/4', 'AR.26.05263/1', 'AR.26.03639/3', 'AR.26.03453/11', 'AR.26.03453/12']);

export function informe0711(vista, datos, rps) {
  const { fuentes, hallazgos, contraste, triples, lineasRps } = datos;
  const foto = rps.recogido.slice(0, 10);
  const fabricada = l => l.finReal > '1900-01-01' && l.finReal <= foto;
  const cmt = fuentes.filter(f => /\.cmt$/i.test(f.fichero));
  const alcance = [
    ['DWG de oficina convertidos a DXF', fuentes.filter(f => f.fichero.startsWith('oficina-dxf/')).length],
    ['DXF de maqcorte', fuentes.filter(f => /^cortes\/.*\.dxf$/i.test(f.fichero)).length],
    ['CMT de maqcorte', cmt.length],
    ['CMT legibles con el lector del repositorio', cmt.filter(f => !f.error).length],
    ['CMT con alguna de las nueve referencias en texto ASCII o UTF-16LE', cmt.filter(f => f.codigosEnTexto.length).length],
    ['Líneas RPS de las nueve referencias', lineasRps.length],
    ['Líneas RPS de las nueve referencias con fin real y fecha solicitada hasta la foto', lineasRps.filter(l => fabricada(l) && l.entregaSolicitada <= foto).length],
  ];
  const resumen = vista.map(v => [v.codigo, v.oficina.length, v.cortes.length, v.lotesRps.length, v.conForma.length, v.igual.length]);
  const bultosPorLinea = Map.groupBy(rps.bultos, b => b.IDOrderLine);
  const albaranesPorLinea = Map.groupBy(rps.expedicion, e => e.IDOrderLine);
  const palets = rps.lineas.filter(l => citas.has(nombre(l)));
  const reparto = palets.map(l => [l.entregaSolicitada, nombre(l), codigoAssa(l.CodArticle), l.cantidad, l.of_,
    lista((albaranesPorLinea.get(l.IDOrderLine) ?? []).map(e => e.albaran)),
    lista((bultosPorLinea.get(l.IDOrderLine) ?? []).map(b => `${b.lista} / ${b.comentario || b.numero} / ${b.cantidad} uds`))]);
  const rotulosPalet = fuentes.filter(f => /oficina-dxf\/2026\/LOTE (?:07-11|25-07|22-08)\.dxf/i.test(f.fichero))
    .map(f => [f.fichero, lista(unico([...(f.repartoEscrito ?? []), ...(f.paletsCompartidos ?? []).map(p => p.titulo)].map(t => t.valor)))]);
  const materialesPorLinea = Map.groupBy(rps.materiales, m => m.IDOrderLine);

  const secciones = vista.map(({ codigo }) => {
    const fs = hallazgos.filter(h => h.codigo === codigo);
    const ls = lineasRps.filter(l => codigoAssa(l.CodArticle) === codigo);
    const cs = contraste.filter(c => codigoAssa(c.referencia) === codigo);
    const lineas = ls.map(l => [l.entregaSolicitada, nombre(l), l.cantidad, l.of_, fabricada(l) ? l.finReal : 'Sin fin real',
      lista((materialesPorLinea.get(l.IDOrderLine) ?? []).map(m => `${m.codigo} ${num(m.cantidad)}`))]);
    const detalle = fs.filter(h => h.fichero.startsWith('cortes/')).map(h => {
      const ns = h.notasVecinas.filter(t => /^\s*[x×]\s*\d+|\b(?:[123]\s*MM|PVC|PLASTEL|STOCK)\b/i.test(t.valor));
      const normal = h.reales.length ? lista(h.reales.map(g =>
        `${lista(grupos(g.panos, mm))} (×${g.repeticiones}; ${g.id})`)) : '—';
      const manual = codigo.startsWith('410') ? lista(grupos(h.carasProximas, c =>
        `${mm(c.medidasMm)} [${c.herramienta}, ${c.vertices} vértices]`)) : '—';
      const controles = cs.filter(c => c.fecha === h.fecha && c.ficheros.includes(h.fichero));
      const control = controles[0];
      const resultados = control ? [
        `RPS ${control.cantidadRpsAgrupada} / lectura ${control.cantidadCorteAgrupada}`,
        control.geometria ? 'cuerpo igual' : 'cuerpo sin certificar',
        ...unico(control.comprobaciones.flatMap(c => c.diferencias)),
      ] : [];
      const canales = h.canalones.map(c => c.coincide ? 'Juego de canalón de plantilla presente' : c.motivo);
      return [h.fichero, lista(h.lineas.map(l => `${l.pedido}/${l.num}`)), normal, manual,
        lista(unico(ns.map(t => t.valor))), lista([...resultados, ...canales])];
    });
    const descripciones = unico(ls.map(l => l.descripcion.trim()));
    const medidas = unico(cs.map(c => c.corteMm && mm(c.corteMm)).filter(Boolean));
    const oficina = ficheros(fs.filter(h => h.fichero.startsWith('oficina-dxf/')));
    return [
      `## ${codigo}`,
      'Descripción de RPS. ' + lista(descripciones) + '.',
      'Cuerpo candidato de la regla actual en mm. ' + lista(medidas) + '.',
      'DXF de oficina con el rótulo. ' + oficina + '.',
      tabla(['Fecha pedida', 'Pedido/línea', 'Uds', 'OF', 'Fin real', 'Consumos imputados (código y cantidad RPS)'], lineas),
      tabla(['DXF de maqcorte', 'Candidatos RPS', 'Paños mm, repetición y rótulo', 'Caras próximas mm', 'Rótulos próximos', 'Contraste'], detalle),
    ].join('\n\n');
  });

  return [
    '# COMBURSA · contraste histórico de las referencias a mano del 07-11',
    `Tablas generadas por \`scripts/assa-investigacion/contrastar-0711.mjs --informe\`. Foto RPS del ${foto}. Los nombres de fichero y las fechas solicitadas se conservan aunque discrepen. El anexo local \`tmp/assa-0711-historico/contraste.json\` guarda las huellas SHA-256, coordenadas, rótulos y diferencias por paño.`,
    tabla(['Fuente', 'Total'], alcance),
    'Los recuentos son fechas distintas del archivo o de la entrega RPS, según la columna. Las fechas posteriores a la foto quedan fuera del recuento. Una aparición por rótulo puede ser una copia histórica. Los cruces por fecha y código son candidatos de lote. La geometría contrasta contorno y operaciones del cuerpo con ±1 mm usando el lector habitual. «Cuerpo y cantidad» exige además acertar el total RPS. Las caras y notas próximas sirven para revisar los juegos manuales. La proximidad admite caras de otra pieza, figuras compuestas y rótulos de otra versión. Los CMT se inventarían por sus herramientas cuando el lector los admite. Sin rótulo atribuible, sus trayectorias no se asignan a un pedido.',
    tabla(['Referencia', 'Fechas con rótulo en oficina', 'Fechas con rótulo en maqcorte', 'Fechas pedidas con OF terminada', 'Cuerpo igual', 'Cuerpo y cantidad iguales'], resumen),
    '## Bultos de expedición y rótulos del plano',
    tabla(['Fecha pedida', 'Pedido/línea', 'Referencia', 'Uds RPS', 'OF', 'Albarán', 'Lista y bulto de expedición'], reparto),
    tabla(['DXF de oficina', 'Rótulos de palet o de reparto'], rotulosPalet),
    '## Lateral 420102-0021 en tiras de tres',
    tabla(['DXF', 'Rótulo', 'Tira mm', 'Marcas de rotulador desde el extremo, mm', 'Tiras dibujadas', 'Repeticiones', 'Laterales en las tiras'],
      [...Map.groupBy(triples, t => t.fichero + '|' + t.id).values()].map(ts => {
        const [t] = ts;
        return [t.fichero, t.id, mm(t.medidasMm), t.marcas.map(num).join(' / '), ts.length, t.repeticiones, ts.length * 3 * t.repeticiones];
      })),
    ...secciones,
  ].join('\n\n') + '\n';
}
