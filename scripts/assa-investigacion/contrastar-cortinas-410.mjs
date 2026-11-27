// Lee copias de maqcorte en tmp. Los orígenes están en mm dentro de cada DXF.
import path from 'node:path';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';
import { compararOperaciones, operacionesEnPano } from '../../src/assa/comparar.js';
import { calcularDesdePlantilla } from '../../src/assa/modeloCorte.js';
import { generarProgramasCortina } from '../../src/assa/cortinas410.js';
import { primitivasDeEntidades } from '../../src/assa/documentoLote.js';
import lineas from '../../src/assa/fixtures/lote0711.json' with { type: 'json' };

const casos = [
  ['410124-0003', 'pares A1', 1, '2025/LOTE 08-02 (PALET 3_4_5)', 214215.26791, 53795.11857],
  ['410124-0003', 'frentes A3', 1, '2025/LOTE 08-02 (PALET 3_4_5)', 233097.26791, 53795.11857],
  ['410124-0003', 'pares A1', 1, '2026/LOTE 26-09', 120655.32666, 122857.33078, { rotulos: true }],
  ['410124-0003', 'frentes A3', 6, '2026/LOTE 26-09', 138673.32666, 122857.33078, { rotulos: true }],
  ['410129-0117', 'cuerpos', 2, '2025/LOTE 26-07', 5475.64, 2300.97],
  ['410129-0117', 'tapas', 6, '2025/LOTE 13-09', 614055.83, 218094.35],
  ['410129-0117', 'frentes', 5, '2025/LOTE 26-07', 9460.78, 2123.75],
  ['410129-0117', 'frentes', 5, '2026/LOTE 07-11_', 122197.69, 89326.49],
  ['410130-0004', 'cuerpos', 2, '2024/LOTE 06-04', 1020611.79666, 167027.03661],
  ['410130-0004', 'pares', 4, '2024/LOTE 06-04', 1029279.95379, 167027.03661],
  ['410130-0004', 'frentes', 4, '2024/LOTE 06-04', 1033774.53637, 167203.91105, { rotulos: true }],
  ['410130-0004', 'cuerpos', 2, '2024/LOTE 17-08', 65350.89929, 112340.56302],
  ['410130-0004', 'frentes', 2, '2024/LOTE 17-08', 74738.14165, 112517.43746, { rotulos: true, difierenRotulos: true, diferenciaMm: 300 }],
  ['410130-0006', 'cuerpos', 2, '2024/LOTE 06-04', 1020636.80, 153885.29],
  ['410130-0006', 'pares', 4, '2024/LOTE 06-04', 1045715.76, 154112.29],
  ['410130-0006', 'frentes', 5, '2024/LOTE 06-04', 1035943, 154306.31],
  ['410130-0006', 'cuerpos', 2, '2024/LOTE 13-04', -83487.77, 476414.28],
  ['410130-0006', 'pares', 4, '2024/LOTE 13-04', -67426.56, 476641.28],
  ['410130-0006', 'frentes', 4, '2024/LOTE 13-04', -73876.99, 476835.30],
  ['410130-0017', 'cuerpos', 2, '2023/LOTE 30-06', -30136.55100, 155462.72931],
  ['410130-0017', 'frentes', 4, '2023/LOTE 30-06', -19444.39414, 155832.34946, { diferenciaMm: 372.5 }],
  ['410130-0017', 'cuerpos', 2, '2024/LOTE 01-06', -39747.03079, 131621.38847],
  ['410130-0017', 'pares', 2, '2024/LOTE 01-06', -23465.80410, 131901.38847],
  ['410130-0017', 'frentes', 5, '2024/LOTE 01-06', -21821.17008, 131991.00863, { rotulos: true, difierenRotulos: true }],
  ['410130-0018', 'cuerpos', 2, '2025/LOTE 11-01', 37753.86, 159991.57],
  ['410130-0018', 'frentes', 2, '2025/LOTE 11-01', 45857.09, 160990.98, { bordeInferior: true }],
  ['410130-0018', 'cuerpos', 2, '2025/LOTE 23-08', 133546.01, 27000.16],
  ['410130-0018', 'pares', 4, '2025/LOTE 23-08', 139521.35, 26664.44],
  ['410130-0018', 'frentes', 4, '2025/LOTE 23-08', 140965.33, 26720.14],
  ['410130-0165', 'cuerpos', 2, '2023/LOTE 14-07', 1009002.42951, 396937.71339],
  ['410130-0165', 'tapas perforadas', 8, '2023/LOTE 14-07', 1023405.31771, 397292.96691],
  ['410130-0165', 'tapas lisas', 8, '2023/LOTE 14-07', 1025349.91771, 397292.96691],
  ['410130-0165', 'frentes', 5, '2023/LOTE 14-07', 1030508.73625, 396996.99756],
  ['410130-0166', 'cuerpos', 2, '2023/LOTE 28-10', 17802.99699, 15134.21505],
  ['410130-0166', 'tapas perforadas', 8, '2023/LOTE 28-10', 31702.54842, 15212.81992],
  ['410130-0166', 'tapas lisas', 8, '2023/LOTE 28-10', 36500.32709, 15253.10513],
  ['410130-0166', 'frentes', 3, '2023/LOTE 28-10', 41476.89049, 15205.39767],
  ['410130-0175', 'cuerpos', 2, '2025/LOTE 09-08', 4818.12, 1668.03],
  ['410130-0175', 'cuerpos', 2, '2025/LOTE 13-09', 608549.03, 206859.33],
  ['410130-0175', 'pares', 4, '2025/LOTE 13-09', 612724.06, 206848.93],
  ['410130-0175', 'pares', 4, '2026/LOTE 07-11_PALET 4-5', 5839.13, 1285.36],
  ['410130-0175', 'frentes', 5, '2025/LOTE 09-08', 14785.68, 1691.11],
  ['410130-0175', 'frentes', 5, '2026/LOTE 07-11_PALET 4-5', 11279.99, 1223.79],
  ['410134-0002', 'juegos de cuerpo', 2, '2025/LOTE 29-11', 88166.64072, 164949.74736, { diferenciaMm: 340 }],
  ['410134-0002', 'frentes', 2, '2025/LOTE 29-11', 97451.26368, 164962.45621],
  ['410134-0002', 'juegos de cuerpo', 2, '2026/LOTE 11-04', 212220.90641, 122254.38288],
  ['410134-0002', 'juegos de cuerpo', 1, '2026/LOTE 11-04', 215857.56393, 122260.47444],
  ['410134-0002', 'frentes', 2, '2026/LOTE 11-04', 221277.36732, 122244.63640],
  ['410134-0002', 'frentes', 1, '2026/LOTE 11-04', 224291.90637, 122233.13527],
  ['410143-0002', 'cuerpos', 1, '2024/LOTE 11-05', 52037.99, 26667.59],
  ['410143-0002', 'cuerpos', 1, '2025/LOTE 25-10', 63547.76, 157754.15],
  ['410143-0002', 'pares de tapas', 1, '2025/LOTE 25-10', 63547.76, 158854.15, { bordeInferior: true }],
  ['410143-0002', 'frentes', 1, '2025/LOTE 25-10', 68799.38, 157754.15],
  ['410143-0002', 'cuerpos', 1, '2025/LOTE 08-11', -79805349.30, 28349955.02],
  ['410143-0002', 'pares de tapas', 1, '2025/LOTE 08-11', -79801520.95, 28350589.07],
  ['410143-0002', 'frentes', 1, '2025/LOTE 08-11', -79800097.67, 28349955.02],
  ['410143-0007', 'cuerpos', 2, '2025/LOTE 01-11', -30548.83159, 237695.36829],
  ['410143-0007', 'frentes', 2, '2025/LOTE 01-11', -13103.60023, 237695.36829, { diferenciaMm: 100 }],
  ['410143-0007', 'cuerpos', 2, '2026/LOTE 10-01', 4498.26176, 3562.03284],
  ['410143-0007', 'cuerpos', 1, '2026/LOTE 10-01', 8949.70615, 3562.03284],
  ['410143-0007', 'pares de tapas', 7, '2026/LOTE 10-01', 14254.28682, 3562.03284],
  ['410143-0007', 'frentes', 2, '2026/LOTE 10-01', 19049.12468, 3562.03284],
  ['410143-0007', 'frentes', 1, '2026/LOTE 10-01', 23554.00114, 3562.03284],
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
  ['410182-0031', 'cuerpos', 2, '2025/LOTE 23-08', 27886.49592, 90740.89154],
  ['410182-0031', 'cuerpos', 1, '2025/LOTE 23-08', 31241.00323, 90731.00728],
  ['410182-0031', 'tapas lisas', 8, '2025/LOTE 23-08', 38218.76128, 90833.21196, { unidades: 4 }],
  ['410182-0031', 'tapas lisas', 2, '2025/LOTE 23-08', 41958.76128, 90833.21196, { unidades: 1 }],
  ['410182-0037', 'cuerpos', 1, '2025/LOTE 23-08', 136527.01783, 72608.83405],
  ['410182-0037', 'tapas lisas', 2, '2025/LOTE 23-08', 141091.48120, 72738.83405, { unidades: 1 }],
  ['410182-0037', 'cuerpos', 1, '2026/LOTE 25-07', 284389.26998, 191910.67594],
  ['410182-0037', 'tapas lisas', 8, '2026/LOTE 25-07', 288953.73336, 192040.67594, { unidades: 4 }],
  ['410182-0037', 'cuerpos', 1, '2023/LOTE 21-07', 146021.64256, 189525.45664, { bordeInferior: true }],
  ['410182-0037', 'tapas lisas', 6, '2023/LOTE 21-07', 155353.37944, 188655.45664, { unidades: 3 }],
];

const base = process.argv[2] ?? 'tmp/assa-410/cortes';
const modelos = new Map();
const adicionales = {
  '410124-0003': { CodArticle: 'H0K410124-0003', of_: '0232002',
    descripcion: 'TOP PVC 0,5MM GLOSSY BLK TNB2080XTWB300XTWT400_W/O OP_480X200_OPEN RECESS' },
  '410130-0004': { CodArticle: 'H0K410130-0004', of_: '0202637',
    descripcion: 'PLANE SC SEITLICH300X300X2900 ANFAHRSTREIFEN:WEIßS' },
  '410130-0006': { CodArticle: 'H0K410130-0006', of_: '0202631',
    descripcion: 'SC SIDE CURTAIN 300X300X3000 ANFAHRSTREIFEN:WEI?/S' },
  '410130-0017': { CodArticle: 'H0K410130-0017', of_: '0204748',
    descripcion: 'SC SIDE CURTAIN 300X300X2500 PARK GUIDE=WHITE' },
  '410130-0018': { CodArticle: 'H0K410130-0018', of_: '0219216',
    descripcion: 'SC SIDE CURTAIN 300X300X2400 ANFAHRSTREIFEN: WEIS/STANDARD' },
  '410130-0165': { CodArticle: 'H0K410130-0165', of_: '0192925',
    descripcion: 'PLANE SC SEITLICH WB300xWT250xH2500 PARKING GUIDE WHITE/STANDARD (750mm)' },
  '410130-0166': { CodArticle: 'H0K410130-0166', of_: '0197603',
    descripcion: 'PLANE SC SEITLICH WB300 X WT300 X H2450 PARKING GUIDE WHITE/STANDAR (750MM)' },
  '410134-0002': { CodArticle: 'H0K410134-0002', of_: '0226166',
    descripcion: 'PLANE SC STANDARD 300X300X2500 OP=600 PVC SCHWARZ, REINFORCED' },
  '410143-0002': { CodArticle: 'H0K410143-0002', of_: '0221850',
    descripcion: 'PLANE SC IN COMPLETE WIDTH WB400xWT300xB3350 OP=600 PVC BACLK, 2MM REINFORCED' },
  '410143-0007': { CodArticle: 'H0K410143-0007', of_: '0223600',
    descripcion: 'PLANE SC IN COMPLETE WIDTH WB300XWT300XB3000 OP=700 PVC BLACK, 2mm REINFORCED' },
  '410182-0031': { CodArticle: 'H0K410182-0031', of_: '0218644',
    descripcion: 'PLANE OBEN 2MM SC WB=300 WT=300 B=2500 SCHWARZ' },
  '410182-0037': { CodArticle: 'H0K410182-0037', of_: '0230371',
    descripcion: 'PLANE OBEN 2MM SC WB=300 WT=300 B=3100 SCHWARZ' },
};
for (const [ref, nombre, cantidad, fichero, x0, y0, opciones] of casos) {
  const linea = adicionales[ref] ?? lineas.find(l => l.CodArticle.endsWith(ref));
  const programa = generarProgramasCortina(calcularDesdePlantilla({ ...linea, cantidad: opciones?.unidades ?? cantidad }), false)
    .find(p => p.nombrePiezas.startsWith(nombre) && p.gruposDePiezas === cantidad);
  if (!modelos.has(fichero)) modelos.set(fichero, leerPlanoDxf(path.join(base, fichero + '.dxf')).modelo
    .map(p => /^cutter$/i.test(p.capa) ? { ...p, capa: 'CUTTER' } :
      p.capa === 'Disco' ? { ...p, capa: 'DISCO1' } :
        p.capa === 'Rotulador' ? { ...p, capa: 'ROTULADOR' } : p));
  const caja = { x0, y0, x1: x0 + programa.largoMm, y1: y0 + programa.anchoOcupadoMm };
  const reales = operacionesEnPano(modelos.get(fichero), caja, [], { conBordes: true })
    // El recorte con orígenes redondeados puede arrastrar menos de 0,02 mm de la columna vecina.
    .filter(p => p.tipo !== 'raya' || (Math.hypot(p.a[0] - p.b[0], p.a[1] - p.b[1]) >= .02 &&
      !(opciones?.bordeInferior && Math.abs(p.a[1]) < .02 && Math.abs(p.b[1]) < .02)));
  const esperadas = primitivasDeEntidades(programa.entidades, 1).filter(p => p.tipo !== 'texto');
  const resultado = compararOperaciones(esperadas, reales, 1);
  if (opciones?.rotulos) {
    const rotulos = modelos.get(fichero).filter(p => p.tipo === 'texto' && p.capa === 'ROTULADOR' &&
      p.punto[0] >= caja.x0 && p.punto[0] < caja.x1 && p.punto[1] >= caja.y0 && p.punto[1] < caja.y1);
    const buscados = programa.entidades.textos.filter(t => t.capa === 'ROTULADOR');
    const coincide = rotulos.length === buscados.length && buscados.every(t => rotulos.some(p => p.valor === t.valor &&
      Math.hypot(p.punto[0] - x0 - t.x, p.punto[1] - y0 - t.y) <= 1 && Math.abs(p.h - t.h) <= 1 && p.giro === t.giro));
    if (coincide === Boolean(opciones.difierenRotulos)) process.exitCode = 1;
    if (!coincide) console.log(ref, fichero, nombre, 'Difiere en los textos de rotulador');
  }
  if (opciones?.diferenciaMm !== undefined) {
    if (resultado.coincide || resultado.desviacionMm === null ||
      Math.abs(resultado.desviacionMm - opciones.diferenciaMm) > 1) process.exitCode = 1;
    console.log(ref, fichero, nombre, resultado.coincide ? 'Igual' : 'Difiere', resultado.desviacionMm?.toFixed(3), 'mm');
    continue;
  }
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

const marcasAlfa = modelos.get('2026/LOTE 26-09').filter(p => p.tipo === 'texto' && p.capa === 'ROTULADOR' && /^A[123]$/.test(p.valor));
for (const valor of ['A1', 'A2', 'A3']) {
  const cantidad = marcasAlfa.filter(p => p.valor === valor).length;
  console.log('410124-0003 2026/LOTE 26-09', valor, `${cantidad}/17`);
  if (cantidad !== 17) process.exitCode = 1;
}
