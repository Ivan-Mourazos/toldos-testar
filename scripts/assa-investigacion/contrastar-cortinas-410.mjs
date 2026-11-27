// Lee copias de maqcorte en tmp. Los orígenes están en mm dentro de cada DXF.
import path from 'node:path';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';
import { compararOperaciones, operacionesEnPano } from '../../src/assa/comparar.js';
import { calcularDesdePlantilla } from '../../src/assa/modeloCorte.js';
import { generarProgramasCortina } from '../../src/assa/cortinas410.js';
import { primitivasDeEntidades } from '../../src/assa/documentoLote.js';
import lineas from '../../src/assa/fixtures/lote0711.json' with { type: 'json' };

const casos = [
  ['410129-0117', 'cuerpos', 2, '2025/LOTE 26-07', 5475.64, 2300.97],
  ['410129-0117', 'tapas', 6, '2025/LOTE 13-09', 614055.83, 218094.35],
  ['410129-0117', 'frentes', 5, '2025/LOTE 26-07', 9460.78, 2123.75],
  ['410129-0117', 'frentes', 5, '2026/LOTE 07-11_', 122197.69, 89326.49],
  ['410130-0006', 'cuerpos', 2, '2024/LOTE 06-04', 1020636.80, 153885.29],
  ['410130-0006', 'pares', 4, '2024/LOTE 06-04', 1045715.76, 154112.29],
  ['410130-0006', 'frentes', 5, '2024/LOTE 06-04', 1035943, 154306.31],
  ['410130-0006', 'cuerpos', 2, '2024/LOTE 13-04', -83487.77, 476414.28],
  ['410130-0006', 'pares', 4, '2024/LOTE 13-04', -67426.56, 476641.28],
  ['410130-0006', 'frentes', 4, '2024/LOTE 13-04', -73876.99, 476835.30],
  ['410130-0018', 'cuerpos', 2, '2025/LOTE 11-01', 37753.86, 159991.57],
  ['410130-0018', 'frentes', 2, '2025/LOTE 11-01', 45857.09, 160990.98, { bordeInferior: true }],
  ['410130-0018', 'cuerpos', 2, '2025/LOTE 23-08', 133546.01, 27000.16],
  ['410130-0018', 'pares', 4, '2025/LOTE 23-08', 139521.35, 26664.44],
  ['410130-0018', 'frentes', 4, '2025/LOTE 23-08', 140965.33, 26720.14],
  ['410130-0175', 'cuerpos', 2, '2025/LOTE 09-08', 4818.12, 1668.03],
  ['410130-0175', 'cuerpos', 2, '2025/LOTE 13-09', 608549.03, 206859.33],
  ['410130-0175', 'pares', 4, '2025/LOTE 13-09', 612724.06, 206848.93],
  ['410130-0175', 'pares', 4, '2026/LOTE 07-11_PALET 4-5', 5839.13, 1285.36],
  ['410130-0175', 'frentes', 5, '2025/LOTE 09-08', 14785.68, 1691.11],
  ['410130-0175', 'frentes', 5, '2026/LOTE 07-11_PALET 4-5', 11279.99, 1223.79],
  ['410143-0002', 'cuerpos', 1, '2024/LOTE 11-05', 52037.99, 26667.59],
  ['410143-0002', 'cuerpos', 1, '2025/LOTE 25-10', 63547.76, 157754.15],
  ['410143-0002', 'pares de tapas', 1, '2025/LOTE 25-10', 63547.76, 158854.15, { bordeInferior: true }],
  ['410143-0002', 'frentes', 1, '2025/LOTE 25-10', 68799.38, 157754.15],
  ['410143-0002', 'cuerpos', 1, '2025/LOTE 08-11', -79805349.30, 28349955.02],
  ['410143-0002', 'pares de tapas', 1, '2025/LOTE 08-11', -79801520.95, 28350589.07],
  ['410143-0002', 'frentes', 1, '2025/LOTE 08-11', -79800097.67, 28349955.02],
  ['410170-0001', 'juegos de cuerpo', 1, '2025/LOTE 23-08', 134366.06, 94244.14],
  ['410170-0001', 'juegos de cuerpo', 1, '2026/LOTE 25-07', 155661.2438, 190729.9961],
  ['410170-0001', 'tiras', 1, '2025/LOTE 23-08', 142635.2, 94079.66],
  ['410170-0001', 'tiras', 1, '2026/LOTE 07-11_', 116262.32, 80515.84],
  ['410170-0001', 'juegos de 8 solapas', 1, '2025/LOTE 23-08', 139689.66, 93393.05],
  ['410171-0001', 'juegos de cuerpo', 1, '2025/LOTE 23-08', 134766.39, 81825.43],
  ['410171-0001', 'juegos de cuerpo', 1, '2026/LOTE 25-07', 96865.0732, 190116.3822],
  ['410171-0001', 'tiras', 1, '2025/LOTE 23-08', 143617.27, 83040.99],
  ['410171-0001', 'tiras', 1, '2026/LOTE 07-11_', 163011.94, 46534.15],
  ['410171-0001', 'juegos de 8 solapas', 1, '2025/LOTE 23-08', 140108.88, 82173.04],
];

const base = process.argv[2] ?? 'tmp/assa-410/cortes';
const modelos = new Map();
const adicionales = {
  '410130-0006': { CodArticle: 'H0K410130-0006', of_: '0202631',
    descripcion: 'SC SIDE CURTAIN 300X300X3000 ANFAHRSTREIFEN:WEI?/S' },
  '410130-0018': { CodArticle: 'H0K410130-0018', of_: '0219216',
    descripcion: 'SC SIDE CURTAIN 300X300X2400 ANFAHRSTREIFEN: WEIS/STANDARD' },
  '410143-0002': { CodArticle: 'H0K410143-0002', of_: '0221850',
    descripcion: 'PLANE SC IN COMPLETE WIDTH WB400xWT300xB3350 OP=600 PVC BACLK, 2MM REINFORCED' },
};
for (const [ref, nombre, cantidad, fichero, x0, y0, opciones] of casos) {
  const linea = adicionales[ref] ?? lineas.find(l => l.CodArticle.endsWith(ref));
  const programa = generarProgramasCortina(calcularDesdePlantilla({ ...linea, cantidad }), false)
    .find(p => p.nombrePiezas.startsWith(nombre) && p.gruposDePiezas === cantidad);
  if (!modelos.has(fichero)) modelos.set(fichero, leerPlanoDxf(path.join(base, fichero + '.dxf')).modelo
    .map(p => /^cutter$/i.test(p.capa) ? { ...p, capa: 'CUTTER' } : p));
  const caja = { x0, y0, x1: x0 + programa.largoMm, y1: y0 + programa.anchoOcupadoMm };
  const reales = operacionesEnPano(modelos.get(fichero), caja, [], { conBordes: true })
    // El recorte con orígenes redondeados puede arrastrar menos de 0,02 mm de la columna vecina.
    .filter(p => p.tipo !== 'raya' || (Math.hypot(p.a[0] - p.b[0], p.a[1] - p.b[1]) >= .02 &&
      !(opciones?.bordeInferior && Math.abs(p.a[1]) < .02 && Math.abs(p.b[1]) < .02)));
  const esperadas = primitivasDeEntidades(programa.entidades, 1).filter(p => p.tipo !== 'texto');
  const resultado = compararOperaciones(esperadas, reales, 1);
  if (resultado.coincide) {
    console.log(ref, fichero, nombre, 'Igual', resultado.desviacionMm.toFixed(3), 'mm');
    continue;
  }

  const rotulos = reales.filter(p => p.capa === 'ROTULADOR' && p.tipo === 'raya');
  const clave = p => JSON.stringify([p.a, p.b].map(q => q.map(n => n.toFixed(3))).sort());
  const unicos = new Map(rotulos.map(p => [clave(p), p]));
  const sinDuplicados = [...reales.filter(p => !rotulos.includes(p)), ...unicos.values()];
  const contraste = compararOperaciones(esperadas, sinDuplicados, 1);
  const marcaRepetida = nombre === 'juegos de cuerpo' && rotulos.length - unicos.size === 1 && contraste.coincide;
  if (!marcaRepetida) process.exitCode = 1;
  console.log(ref, fichero, nombre, 'Difiere', resultado.desviacionMm?.toFixed(3), 'mm',
    marcaRepetida ? 'Un trazo de rotulador repetido en el original.' : resultado.diferencias.join(' '));
}
