// Los ficheros de noviembre describen colocación. El estudio no actualiza el catálogo de fabricación.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';
import { codigoAssa, extraerPanos } from '../../src/assa/leerCorte.js';
import { caras, componentes, filasPanos, pedidoDe, unico, red } from './geometria.mjs';
import { leerCmt } from '../../src/cmt/binario.ts';

const base = fileURLToPath(new URL('../../tmp/assa-0711-historico/', import.meta.url));
const rps = JSON.parse(fs.readFileSync(path.join(base, 'rps.json'), 'utf8'));
const fechaFoto = rps.recogido.slice(0, 10);
const formatos = { oficina: /\.dwg$/i, cortes: /\.(dxf|cmt)$/i };
const fecha = (anio, n) => {
  const m = /^LOTE[\s_]*(\d{1,2})[-_](\d{1,2})(?!\d)/i.exec(n);
  if (!m) return null;
  const f = [anio, m[2].padStart(2, '0'), m[1].padStart(2, '0')].join('-');
  const d = new Date(f);
  return Number.isFinite(+d) && d.toISOString().slice(0, 10) === f ? f : null;
};
const inventario = [2025, 2026].flatMap(anio => Object.entries(formatos).flatMap(([tipo, ext]) => {
  const dir = path.join(base, tipo, String(anio));
  return fs.readdirSync(dir).filter(n => /^LOTE/i.test(n) && ext.test(n)).sort().map(n => {
    const local = path.join(dir, n);
    const contenido = fs.readFileSync(local);
    return { tipo, anio, nombre: n, fecha: fecha(anio, n), bytes: contenido.length,
      sha256: createHash('sha256').update(contenido).digest('hex') };
  });
}));
const palet = /^PALETS?\s*\d/i;
const rpsPorFecha = Map.groupBy(rps.lineas, l => l.entregaSolicitada);
const detalle = inventario.filter(f => f.fecha === '2026-10-31' || f.fecha >= '2026-11-01')
  .sort((a, b) => a.fecha.localeCompare(b.fecha) || b.tipo.localeCompare(a.tipo) || a.nombre.localeCompare(b.nombre))
  .map(f => {
  const local = path.join(base, f.tipo, String(f.anio), f.nombre);
  if (/\.cmt$/i.test(f.nombre)) {
    try {
      const cmt = leerCmt(fs.readFileSync(local));
      return { ...f, herramientas: Object.fromEntries([...Map.groupBy(cmt.objects, o => o.tool)].map(([h, os]) => [h, os.length])) };
    } catch (error) {
      return { ...f, errorCmt: error.message };
    }
  }
  const dxf = f.tipo === 'oficina' ? path.join(base, 'oficina-dxf', String(f.anio), f.nombre.replace(/\.dwg$/i, '.dxf')) : local;
  const modelo = leerPlanoDxf(dxf).modelo;
  const textos = modelo.filter(t => t.tipo === 'texto' && !t.deCota);
  const datos = { ...f, palets: unico(textos.map(t => t.valor.trim()).filter(t => palet.test(t))),
    pedidos: unico(textos.map(t => pedidoDe(t.valor)).filter(Boolean)),
    notasPalet: unico(textos.map(t => t.valor.trim()).filter(t => /se corta en|\d+\s*uds?\s*(?:en\s*)?palet/i.test(t))),
    codigos: unico(textos.map(t => codigoAssa(t.valor)).filter(Boolean)).sort() };
  if (f.tipo === 'oficina') return datos;

  const grupos = extraerPanos(modelo);
  const franjas = filasPanos(grupos.flatMap(g => g.panos.map(p => ({ ...p, codigo: g.codigo, rotulo: g.titulo.handle, repeticiones: g.repeticiones }))));
  const huecos = [];
  for (const f of franjas) {
    const vecinas = franjas.filter(g => g !== f && Math.min(f.caja.y1, g.caja.y1) - Math.max(f.caja.y0, g.caja.y0) > 100 &&
      g.caja.x0 > f.caja.x1 + 1).sort((a, b) => a.caja.x0 - b.caja.x0);
    if (vecinas.length) huecos.push(red(vecinas[0].caja.x0 - f.caja.x1));
  }
  const carasDePosibleCanalon = caras(modelo).filter(c => {
    const ancho = c.x1 - c.x0, alto = c.y1 - c.y0;
    return ancho >= 1000 && ancho <= 4500 && alto >= 100 && alto <= 450 && c.area < ancho * alto * .99;
  });
  const gruposCanalon = componentes(carasDePosibleCanalon, (a, b) =>
    Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 10 && Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1) <= 150);
  return { ...datos, franjas, huecos, gruposCanalon: gruposCanalon.map(cs => cs.map(({ x0, x1, y0, y1 }) => [x0, y0, x1, y1])) };
});
const salida = { foto: rps.recogido, inventario, detalle };
fs.writeFileSync(path.join(base, 'colocacion.json'), JSON.stringify(salida, null, 2) + '\n');

const num = n => n.toLocaleString('es-ES');
const lista = a => a.length ? a.join('; ') : '—';
const celda = v => String(v).replaceAll('|', '\\|').replace(/\s+/g, ' ');
const tabla = (cab, filas) => [cab, cab.map(() => '---'), ...filas].map(f => '| ' + f.map(celda).join(' | ') + ' |').join('\n');
const estado = f => f === '2026-10-31' ? 'Comparación histórica' : f > fechaFoto ? 'Dudoso · entrega futura' : 'Dudoso · lectura de colocación';
const dxf = detalle.filter(f => f.franjas);
const referencia = franjas => lista(franjas.filter(f => f.codigos.length > 1).slice(0, 4).map(f =>
  unico(f.panos.toSorted((a, b) => a.caja.x0 - b.caja.x0 || b.caja.y1 - a.caja.y1).map(p => p.codigo)).join(' → ')));
const formato = f => f.nombre.split('.').at(-1).toUpperCase();
const informes = [
  '# COMBURSA · colocación en los lotes de noviembre',
  `Tablas generadas por \`scripts/assa-investigacion/colocacion-0711.mjs --informe\`. Foto RPS ${fechaFoto}. El inventario completo con huellas SHA-256 y el detalle por franja están en \`tmp/assa-0711-historico/colocacion.json\`. Se conservaron las variantes por nombre. El 31-10 sirve como comparación histórica. Los archivos de noviembre son dudosos para fijar reglas de fabricación según la indicación de taller y se usan aquí para observar colocación.`,
  tabla(['Año', 'DWG de oficina', 'DXF de maqcorte', 'CMT de maqcorte'], [2025, 2026].map(y => [y,
    ...['DWG', 'DXF', 'CMT'].map(ext => inventario.filter(f => f.anio === y && formato(f) === ext).length)])),
  '## Archivos y palets',
  tabla(['Fecha de lote', 'Archivo', 'Alcance de la evidencia', 'Palets rotulados', 'Pedidos escritos', 'Referencias rotuladas / herramientas'], detalle.map(f =>
    [f.fecha, f.nombre, estado(f.fecha), lista(f.palets ?? []), lista(f.pedidos ?? []),
      f.codigos?.length ?? (f.herramientas ? lista(Object.entries(f.herramientas).map(([h, n]) => (h || 'Sin nombre') + ' ' + n)) : f.errorCmt)])),
  '## Colocación que se alcanza a leer en los DXF de corte',
  'Una franja reúne paños rectangulares reconocidos que se tocan y comparten ancho de trabajo. Las parejas requieren raya central de rotulador. El hueco horizontal se mide hasta la franja más próxima que solapa en altura. Puede incluir separación entre palets o entre tiradas, por lo que indica colocación dibujada. Los candidatos a canalón son caras no rectangulares agrupadas por cercanía. Algunos pueden pertenecer a otros accesorios. Los CMT se leen por herramientas cuando el lector admite el archivo. Las cantidades se cotejan solo como contexto de entrega en RPS.',
  tabla(['DXF', 'RPS con fin real / líneas por fecha', 'Franjas / mixtas', 'Ejemplos de orden espacial, por X y de arriba abajo en la misma X', 'Parejas reconocidas', 'Hueco positivo mín. / máx. mm', 'Grupos candidatos a canalón'], dxf.map(f => {
    const ls = rpsPorFecha.get(f.fecha) ?? [];
    const finReal = ls.filter(l => l.finReal > '1900-01-01' && l.finReal <= fechaFoto).length;
    return [f.nombre, finReal + ' / ' + ls.length, f.franjas.length + ' / ' + f.franjas.filter(x => x.codigos.length > 1).length,
      referencia(f.franjas), f.franjas.reduce((s, g) => s + g.panos.filter(p => p.uniones.length).length, 0) / 2,
      f.huecos.length ? num(Math.min(...f.huecos)) + ' / ' + num(Math.max(...f.huecos)) : '—', f.gruposCanalon.length];
  })),
].join('\n\n') + '\n';
fs.writeFileSync(path.join(base, 'colocacion.md'), informes);
if (process.argv.includes('--informe')) fs.writeFileSync(new URL('../../docs/modelos/assa-combursa-colocacion-noviembre.md', import.meta.url), informes);
console.log(`${inventario.length} originales inventariados; ${detalle.length} archivos de colocación y comparación leídos.`);
