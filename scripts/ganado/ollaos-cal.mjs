// Auditoría independiente: centros de INSERT del CAD contra cada diagonal de referencia.
import fs from 'node:fs';
import { leerDxf, vertices, punto } from './medidas-dxf.mjs';
import { calcularMedidasCal, MEDIDAS_CAL_5319 } from '../../src/remolques/ganado/medidas.ts';

const dir = 'tmp/ganado-cal/salida';
const dxf = leerDxf('tmp/ganado-cal/fuentes/dxf/AR2605319.dxf');
const es = dxf.entidades;
const distancia = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
function local(a, b, p) {
  const l = distancia(a, b), u = b.map((x, i) => (x - a[i]) / l), v = p.map((x, i) => x - a[i]);
  return { desde: v[0] * u[0] + v[1] * u[1], dentro: Math.abs(-v[0] * u[1] + v[1] * u[0]) };
}
const bordes = ['EC00', 'EBFE'].map(id => vertices(es.find(e => e.id === id)).map(p => p.slice(0, 2).map(x => x * 1000)));
const grupos = ['15138/', '13E53/'].map(prefijo => es.filter(e => e.id.startsWith(prefijo) && e.t === 'CIRCLE')
  .map(e => ({ id: e.id, p: e.T(punto(e)).slice(0, 2).map(x => x * 1000) })));
const contorno = vertices(es.find(e => e.id === 'EC0D')).map(p => p.slice(0, 2).map(x => x * 1000));
const cortes = [[contorno[0], contorno[1]], [contorno[13], contorno[14]]];
const m = calcularMedidasCal(MEDIDAS_CAL_5319).piezas[1], k = m.terminado.length / 2;
const filas = grupos.flatMap((grupo, lado) => {
  const i = lado ? k - 1 : 0, a = m.terminado[i], b = m.terminado[2 * k - 1 - i];
  return grupo.map((o, n) => {
    const cad = local(...bordes[lado], o.p), web = local(a, b, m.ollaos[lado * 4 + n].c);
    return { lado: lado ? 'MFI' : 'MFD', n: n + 1, entidad: o.id, cad, web,
      retranqueoAlCorteCadMm: local(...cortes[lado], o.p).dentro,
      errorWebMm: Math.hypot(web.desde - (25 + n * 980 / 3), web.dentro - 10),
      errorCadMm: Math.hypot(cad.desde - (25 + n * 980 / 3), cad.dentro - 10) };
  });
});
const matrices = grupos.map((ps, lado) => {
  const [a, b] = bordes[lado], v = ps[1].p.map((x, i) => x - ps[0].p[i]);
  const anguloBorde = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
  const anguloMatriz = Math.atan2(v[1], v[0]) * 180 / Math.PI;
  return { lado: lado ? 'MFI' : 'MFD', borde: lado ? 'EBFE' : 'EC00',
    vectorPasoCadMm: v, largoPasoCadMm: Math.hypot(...v), anguloBorde, anguloMatriz,
    diferenciaAngularGrados: Math.abs(anguloMatriz - anguloBorde) };
});
const resoluciones = [4, 5, 12, 32].map(divisionesCurva => {
  const m = calcularMedidasCal({ ...MEDIDAS_CAL_5319, divisionesCurva }).piezas[1], k = m.terminado.length / 2;
  const errores = [0, k - 1].flatMap((i, lado) => m.ollaos.slice(lado * 4, lado * 4 + 4).map((o, n) => {
    const p = local(m.terminado[i], m.terminado[2 * k - 1 - i], o.c);
    return Math.hypot(p.desde - (25 + n * 980 / 3), p.dentro - 10);
  }));
  return { divisionesCurva, maximoErrorMm: Math.max(...errores) };
});
if (filas.length !== 8 || filas.some(f => f.errorWebMm > .1) || resoluciones.some(r => r.maximoErrorMm > .1)) throw Error('Los ollaos no cumplen 0,1 mm.');
const informe = { filas, matrices, resoluciones, cadDesalineado: filas.some(f => f.errorCadMm > .1) };
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(dir + '/ollaos-posicion.json', JSON.stringify(informe, null, 2));
const fmt = n => n.toLocaleString('es-ES', { maximumFractionDigits: 6 });
fs.writeFileSync(dir + '/OLLAOS-POSICION.md', '# Ollaos del 5319: posición respecto a su diagonal\n\n'
  + 'Regla de la web: retranqueo perpendicular 10 mm y centros a 25 / 351,666667 / 678,333333 / 1005 mm del extremo. No se redondean los centros.\n\n'
  + '| Lado | Ollaos | Desde CAD mm | Retranqueo CAD mm | Desde web mm | Retranqueo web mm | Error web mm | Error CAD mm |\n|---|---|---|---|---|---|---|---|\n'
  + filas.map(f => `| ${f.lado} | ${f.n} | ${fmt(f.cad.desde)} | ${fmt(f.cad.dentro)} | ${fmt(f.web.desde)} | ${fmt(f.web.dentro)} | ${fmt(f.errorWebMm)} | ${fmt(f.errorCadMm)} |`).join('\n')
  + `\n\nLa matriz CAD no es paralela a su propia diagonal de referencia. El primer centro queda a 9,972241 mm y el último a 8,884340 mm. También respecto al corte EC0D: ${fmt(filas[0].retranqueoAlCorteCadMm)} → ${fmt(filas[3].retranqueoAlCorteCadMm)} mm, frente a 40 constantes. El paso conserva su longitud, pero su dirección deriva: no es un error de reparto ni de redondeo de la web.\n\n`
  + matrices.map(m => `${m.lado}, ${m.borde}: ángulo de borde ${fmt(m.anguloBorde)}°, matriz ${fmt(m.anguloMatriz)}°, diferencia ${fmt(m.diferenciaAngularGrados)}°; paso ${fmt(m.largoPasoCadMm)} mm.`).join('\n\n')
  + '\n\nLa misma matriz aparece en 15138/15144–15146 y reflejada en 13E53/13E65–13E6B. La web cumple 0,1 mm respecto a cada borde con 4, 5, 12 y 32 divisiones de curva: no se corrigen sus puntos para reproducir el desplazamiento del CAD. La comparación global anterior de 1,240189 mm también incluía la diferencia del contorno desarrollado MFI respecto al CAD simétrico (0,442337 mm en su extremo).\n');
console.log(`Ollaos web: máximo ${fmt(Math.max(...filas.map(f => f.errorWebMm)))} mm; CAD: ${fmt(Math.max(...filas.map(f => f.errorCadMm)))} mm respecto a la regla geométrica.`);
