// Actualiza en src/assa/validacionCatalogo.json las 4 referencias certificadas tras cerrar Q-AS0711-05
// (420102-0021, 430129-0002, 430172-0005 y 430172-0034) a partir del contraste reproducible en tmp/assa-0711-historico/contraste.json.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { codigoAssa } from '../../src/assa/leerCorte.js';

const contrastePath = fileURLToPath(new URL('../../tmp/assa-0711-historico/contraste.json', import.meta.url));
const catalogoPath = fileURLToPath(new URL('../../src/assa/validacionCatalogo.json', import.meta.url));

const fin = JSON.parse(fs.readFileSync(contrastePath, 'utf8'));
const originalTexto = fs.readFileSync(catalogoPath, 'utf8');
const eol = originalTexto.includes('\r\n') ? '\r\n' : '\n';
const catalogo = JSON.parse(originalTexto);

const refs = ['420102-0021', '430129-0002', '430172-0005', '430172-0034'];

for (const ref of refs) {
  const entrada = catalogo.referencias[ref];
  if (!entrada) throw new Error(`Falta ${ref} en validacionCatalogo.json`);
  const cs = fin.contraste.filter(c => codigoAssa(c.referencia) === ref);
  if (!cs.length) throw new Error(`Sin resultados de contraste para ${ref}`);

  const porDesc = Map.groupBy(cs, c => c.descripcion.trim());
  for (const desc of entrada.descripciones) {
    const ls = porDesc.get(desc.descripcion) ?? [];
    if (!ls.length) continue;
    const ult = [...ls].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
    const canalones = fin.hallazgos
      .filter(h => h.codigo === ref && h.fichero.startsWith('cortes/'))
      .flatMap(h => h.canalones.map(c => ({ fecha: h.fecha, coincide: c.coincide })));
    const ultCanalon = [...canalones].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);

    desc.lineas = ls.length;
    desc.cuadran = ls.filter(x => x.coincide).length;
    desc.geometria = ls.filter(x => x.geometria).length;
    desc.ultimaFecha = ult.fecha;
    desc.ultimaGeometria = ult.geometria;
    if (ref.startsWith('43')) {
      desc.canalonValidado = canalones.some(c => c.coincide) && Boolean(ultCanalon?.coincide);
    }
  }

  const porFecha = Map.groupBy(cs, c => c.fecha);
  const fechasNuevas = { ...entrada.fechas };
  for (const [fecha, ls] of [...porFecha.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    fechasNuevas[fecha] = {
      coincide: ls.every(x => x.coincide),
      cantidad: ls.reduce((s, x) => s + x.cantidad, 0),
      forma: ls.every(x => x.geometria),
      motivos: [...new Set(ls.flatMap(x => x.motivos))],
    };
  }
  entrada.fechas = Object.fromEntries(Object.entries(fechasNuevas).sort((a, b) => a[0].localeCompare(b[0])));
  console.log(ref, entrada.descripciones[0]);
}

const serializado = JSON.stringify(catalogo, null, 2).replace(/\n/g, eol) + eol;
fs.writeFileSync(catalogoPath, serializado);
console.log('validacionCatalogo.json actualizado.');
