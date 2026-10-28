// Largo de la mitad de canalón de cada 420150 según la plantilla COMBURSA (CRAWFORD) de la oficina (solo lectura).
// Iván, 28/10/2026: «la plantilla manda». Uso:
// ASSA_PLANTILLA="<ruta>/COMBURSA (CRAWFORD).dxf" node scripts/extraer-canalones-assa.mjs
import fs from 'node:fs';
import { leerPlanoDxf } from './lib/plano-dxf.mjs';
import { codigoAssa } from '../src/assa/leerCorte.js';

const plantilla = process.env.ASSA_PLANTILLA;
if (!plantilla) throw new Error('Indica ASSA_PLANTILLA: el DXF de la plantilla COMBURSA (CRAWFORD).');
const modelo = leerPlanoDxf(plantilla).modelo;
// La plantilla está en metros: los bordes del canalón bajan 5 cm a lo largo de la mitad.
const bordes = modelo.filter(p => p.tipo === 'raya' && !p.deCota && p.a && Math.abs(Math.abs(p.a[1] - p.b[1]) - 0.05) < 0.002 &&
  Math.abs(p.a[0] - p.b[0]) > 1 && Math.abs(p.a[0] - p.b[0]) < 2);
// Pestañas: tramos de 6 a 10 cm casi paralelos al borde, en las puntas gruesas.
const pestanas = modelo.filter(p => p.tipo === 'raya' && !p.deCota && p.a && Math.abs(p.a[0] - p.b[0]) > 0.06 && Math.abs(p.a[0] - p.b[0]) < 0.1 &&
  Math.abs(p.a[1] - p.b[1]) > 0.0005 && Math.abs(p.a[1] - p.b[1]) < 0.006);
const rotulos = modelo.filter(p => p.tipo === 'texto' && !p.deCota && codigoAssa(p.valor));
// Cada tramo va con el rótulo más cercano: así no se mezclan los de la referencia vecina.
function contar(rayas) {
  const cuenta = {};
  for (const p of rayas) {
    const c = [(p.a[0] + p.b[0]) / 2, (p.a[1] + p.b[1]) / 2];
    let rotulo = null, d = Infinity;
    for (const t of rotulos) { const e = Math.hypot(t.punto[0] - c[0], t.punto[1] - c[1]); if (e < d) { d = e; rotulo = t; } }
    const codigo = rotulo && d < 4 ? codigoAssa(rotulo.valor) : null;
    if (!codigo?.startsWith('420150-')) continue;
    const largo = Math.round(Math.abs(p.a[0] - p.b[0]) * 1000);
    (cuenta[codigo] ??= {})[largo] = (cuenta[codigo][largo] ?? 0) + 1;
  }
  return cuenta;
}
const cuenta = contar(bordes), cuentaPestanas = contar(pestanas);
const moda = porLargo => Number(Object.entries(porLargo ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0]) || null;
// Un juego completo deja unos 52 bordes; con menos de 36 el dibujo no es un juego entero y no se usa. Una referencia puede
// tener dos juegos (la 0090: «tiene pedido 2 medidas»); se guardan los dos y el lote elige por el NB del pedido.
const largos = {}, dudosos = {};
for (const [codigo, porLargo] of Object.entries(cuenta).sort()) {
  const pestana = moda(cuentaPestanas[codigo]);
  const juegos = Object.entries(porLargo).filter(([, n]) => n >= 36).map(([mitad]) => ({ mitad: Number(mitad), pestana }));
  if (juegos.length && pestana) largos[codigo] = juegos;
  if (Object.values(porLargo).some(n => n < 36)) dudosos[codigo] = porLargo;
}
const salida = new URL('../src/assa/canalones420150.json', import.meta.url);
fs.writeFileSync(salida, JSON.stringify({ fuente: 'COMBURSA (CRAWFORD).dwg, plantilla de la oficina; mm', canalonMm: largos }, null, 2) + '\n');
console.log(JSON.stringify({ referencias: Object.keys(largos).length, dudosos }, null, 2));
