// Lee copias de maqcorte en tmp. Los orígenes están en mm dentro de cada DXF.
import path from 'node:path';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';
import { compararOperaciones, operacionesEnPano } from '../../src/assa/comparar.js';
import { calcularDesdePlantilla } from '../../src/assa/modeloCorte.js';
import { generarProgramasCortina } from '../../src/assa/cortinas410.js';
import { primitivasDeEntidades } from '../../src/assa/documentoLote.js';
import lineas from '../../src/assa/fixtures/lote0711.json' with { type: 'json' };

const casos = [
  ['410137-0037', 'cuerpos', 1, '2023/LOTE 28-04', 17019.24443, 192085.95361],
  ['410137-0037', 'tapas', 2, '2023/LOTE 28-04', 14989.24443, 193285.95361, { unidades: 1, bordeInferior: true }],
  ['410137-0037', 'frentes', 1, '2023/LOTE 28-04', 7667.27257, 192300.04892],
  ['410137-0038', 'juegos de cuerpo', 1, '2024/LOTE 01-06', 52906.82254, 132183.54795, { bordeInferior: true }],
  ['410137-0038', 'frentes', 1, '2024/LOTE 01-06', 60223.76498, 132185.57843, { bordeInferior: true }],
  ['410137-0039', 'juegos de cuerpo', 1, '2024/LOTE 01-06', 52906.82254, 131183.54795, { tapasAlLado: [4580, 740] }],
  ['410137-0039', 'frentes', 1, '2024/LOTE 01-06', 60223.76498, 131510.57843],
  ['410149-0001', 'juegos de cuerpo', 1, '2025/LOTE 19-07', 83232.32844, 66055.91236],
  ['410149-0002', 'juegos de cuerpo', 1, '2025/LOTE 19-07', 81828.36016, 78375.87346],
  ['410149-0003', 'cuerpos', 1, '2025/LOTE 11-10', 39997.66912, 141964.40792],
  ['410149-0003', 'pares', 1, '2025/LOTE 11-10', 34343.11148, 143080.60792, { bordeInferior: true }],
  ['410179-0054', 'cuerpos con marca', 1, '2025/LOTE 29-11', 200646.65002, 165134.1831],
  ['410179-0054', 'cuerpos', 1, '2025/LOTE 29-11', 204965.42775, 165134.1831, { muestras: 0 }],
  ['410179-0054', 'cuerpos', 2, '2025/LOTE 29-11', 209958.75304, 165134.1831, { muestras: 0 }],
  ['410179-0054', 'pares', 4, '2025/LOTE 29-11', 215727.39605, 165134.1831],
  ['410135-0108', 'juegos de cuerpo', 2, '2025/LOTE 05-04', 172066.7448, 31122.53325],
  ['410135-0108', 'frentes', 2, '2025/LOTE 05-04', 178314.68001, 31122.53325],
  ['410135-0109', 'juegos de cuerpo', 2, '2025/LOTE 29-11', 87747.32077, 155486.61867, { tapasAlLado: [3400, 1480] }],
  ['410135-0109', 'frentes', 2, '2025/LOTE 29-11', 98952.32719, 155420.04426],
  ['410135-0109', 'frentes', 1, '2025/LOTE 29-11', 103519.27332, 155420.04426],
  ['410143-0006', 'juegos de cuerpo', 1, '2025/LOTE 04-10', 42271.94187, 73341.71471],
  ['410143-0006', 'frentes', 2, '2025/LOTE 04-10', 47080.61653, 73233.47403],
  ['410143-0006', 'frentes', 1, '2025/LOTE 04-10', 51656.75881, 73808.47403],
  ['410129-0053', 'juegos de cuerpo', 1, '2025/LOTE 10-05', -438537.39245, 300494.19225, { tapasArriba: [900, 640] }],
  ['410129-0053', 'frentes', 1, '2025/LOTE 10-05', -415564.74251, 300311.0078],
  ['410129-0112', 'juegos de cuerpo', 1, '2024/LOTE 24-02', 168302.76961, 99035.81787],
  ['410129-0112', 'frentes', 1, '2024/LOTE 24-02', 176724.89757, 98564.70884],
  ['410129-0115', 'juegos de cuerpo', 1, '2024/LOTE 27-07', 1379093.18249, 166625.93573],
  ['410129-0115', 'frentes', 1, '2024/LOTE 27-07', 1383444.29049, 166479.65753],
  ['410129-0010', 'cuerpos', 1, '2024/LOTE 01-06', 16507.67326, 134994.6791],
  ['410129-0010', 'tapas', 2, '2024/LOTE 01-06', 16877.67326, 135994.6791, { unidades: 1, bordeInferior: true }],
  ['410129-0010', 'frentes', 5, '2024/LOTE 01-06', 20883.72, 134994.6791],
  ['410129-0013', 'juegos de cuerpo', 2, '2024/LOTE 06-04', 946960.16193, 137893.59534],
  ['410129-0013', 'frentes', 2, '2024/LOTE 06-04', 951466.81124, 138405.44922],
  ['410129-0015', 'juegos de cuerpo', 1, '2025/LOTE 23-08', 133904.54853, 62048.3086],
  ['410129-0015', 'frentes', 1, '2025/LOTE 23-08', 139015.98706, 62387.98029],
  ['410129-0052', 'juegos de cuerpo', 2, '2025/LOTE 05-04', 170040.80725, 17733.17556],
  ['410129-0052', 'frentes', 2, '2025/LOTE 05-04', 175361.49397, 18160.69767],
  ['410129-0056', 'cuerpos', 2, '2023/LOTE 28-10', 67962.12155, 20674.20976],
  ['410129-0056', 'tapas', 4, '2023/LOTE 28-10', 71662.12155, 20674.20976, { unidades: 2 }],
  ['410129-0056', 'frentes', 3, '2023/LOTE 28-10', 79013.89377, 21012.25623],
  ['410129-0091', 'cuerpos', 2, '2024/LOTE 06-04', 1020244.01513, 129935.74152],
  ['410129-0091', 'tapas', 4, '2024/LOTE 06-04', 1023844.01513, 129935.74152, { unidades: 2 }],
  ['410129-0091', 'frentes', 3, '2024/LOTE 06-04', 1029882.4768, 130430.80315],
  ['410129-0209', 'cuerpos', 1, '2025/LOTE 05-07', 287982.70089, 529879.32519],
  ['410129-0209', 'tapas', 4, '2025/LOTE 22-11', 39196.69825, 63194.50053, { unidades: 2 }],
  ['410129-0209', 'frentes', 3, '2025/LOTE 22-11', 49167.61445, 63322.66992],
  ['410130-0167', 'cuerpos', 1, '2024/LOTE 24-02', 168317.76961, 87464.63059],
  ['410130-0167', 'tapas perforadas', 2, '2024/LOTE 24-02', 176839.43044, 87377.84264],
  ['410130-0167', 'tapas lisas', 2, '2024/LOTE 24-02', 176839.43044, 88257.84264, { bordeInferior: true }],
  ['410130-0167', 'frentes', 2, '2024/LOTE 24-02', 180099.02681, 87498.04533, { rotulos: true }],
  ['410130-0098', 'cuerpos', 2, '2025/LOTE 06-12', 61418.15426, 132763.23964],
  ['410130-0098', 'pares', 4, '2025/LOTE 06-12', 66528.09216, 132865.30381],
  ['410130-0098', 'frentes', 5, '2025/LOTE 06-12', 68604.95962, 132961.29463, { rotulos: true, difierenRotulos: true }],
  ['410130-0170', 'cuerpos', 2, '2024/LOTE 01-06', 52939.32254, 110198.93842],
  ['410130-0170', 'pares', 2, '2024/LOTE 01-06', 61453.71799, 110181.74289],
  ['410130-0170', 'frentes', 2, '2024/LOTE 01-06', 64509.60357, 110324.56392, { rotulos: true }],
  ['410130-0172', 'cuerpos', 1, '2025/LOTE  01-02', 84798.78344, 117968.46671],
  ['410130-0172', 'pares', 2, '2025/LOTE  01-02', 94427.95532, 117968.46671],
  ['410130-0172', 'frentes', 2, '2025/LOTE  01-02', 98538.45949, 117968.46671, { rotulos: true }],
  ['410130-0173', 'cuerpos', 2, '2025/LOTE 05-04', 170190.19218, 42590.6815],
  ['410130-0173', 'pares', 4, '2025/LOTE 05-04', 175861.89705, 42590.6815],
  ['410130-0173', 'frentes', 4, '2025/LOTE 05-04', 178578.47342, 42871.73961, { rotulos: true, difierenRotulos: true }],
  ['410130-0003', 'cuerpos', 2, '2025/LOTE 23-08', 136044.02424, 50644.27532],
  ['410130-0003', 'pares', 2, '2025/LOTE 23-08', 139884.17563, 50675.63516, { duplicado: true }],
  ['410130-0003', 'frentes', 2, '2025/LOTE 23-08', 141207.68111, 50772.8378],
  ['410130-0015', 'cuerpos', 2, '2024/LOTE 03-02', 4987.24082, 38583.97338],
  ['410130-0015', 'pares', 4, '2024/LOTE 03-02', 13458.20896, 38583.97338],
  ['410130-0015', 'frentes', 4, '2024/LOTE 03-02', 17017.0976, 38583.97338],
  ['410130-0169', 'cuerpos', 2, '2024/LOTE 11-05', 51734.97689, 85764.39573],
  ['410130-0169', 'pares', 2, '2024/LOTE 11-05', 57677.258, 86094.40147],
  ['410130-0169', 'frentes', 2, '2024/LOTE 11-05', 60733.14357, 86008.04045, { rotulos: true, difierenRotulos: true }],
  ['410130-0171', 'cuerpos', 2, '2024/LOTE 01-06', 52979.32254, 102072.58807],
  ['410130-0171', 'pares', 4, '2024/LOTE 01-06', 65610.29183, 102401.3904],
  ['410130-0171', 'frentes', 4, '2024/LOTE 01-06', 68264.32649, 102506.26258, { rotulos: true, difierenRotulos: true }],
  ['410124-0003', 'pares A1', 1, '2025/LOTE 08-02 (PALET 3_4_5)', 214215.26791, 53795.11857],
  ['410124-0003', 'frentes A3', 1, '2025/LOTE 08-02 (PALET 3_4_5)', 233097.26791, 53795.11857],
  ['410124-0003', 'pares A1', 1, '2026/LOTE 26-09', 120655.32666, 122857.33078, { rotulos: true }],
  ['410124-0003', 'frentes A3', 6, '2026/LOTE 26-09', 138673.32666, 122857.33078, { rotulos: true }],
  ['410129-0117', 'cuerpos', 2, '2025/LOTE 26-07', 5475.64, 2300.97],
  ['410129-0117', 'tapas', 6, '2025/LOTE 13-09', 614055.83, 218094.35],
  ['410129-0117', 'frentes', 5, '2025/LOTE 26-07', 9460.78, 2123.75],
  ['410129-0117', 'frentes', 5, '2026/LOTE 07-11_', 122197.69, 89326.49],
  ['410129-0212', 'juegos de cuerpo', 2, '2026/LOTE 21-03', 42383.25057, 74768.76546, { duplicado: true }],
  ['410129-0212', 'frentes', 2, '2026/LOTE 21-03', 47486.69630, 75718.63349],
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
const enCaja = (modelo, caja) => operacionesEnPano(modelo, caja, [], { conBordes: true });
const bordeInferior = p => p.tipo === 'raya' && Math.abs(p.a[1]) < .02 && Math.abs(p.b[1]) < .02;
function operacionesDelBloque(modelo, caja, { tapasArriba, tapasAlLado } = {}) {
  if (tapasAlLado) {
    const [anchoCuerpo, altoTapas] = tapasAlLado;
    const cuerpo = enCaja(modelo, { ...caja, x1: caja.x0 + anchoCuerpo });
    const tapas = enCaja(modelo, { ...caja, y1: caja.y0 + altoTapas })
      .filter(p => p.tipo === 'raya' && [p.a, p.b].every(([x]) => x >= anchoCuerpo - .01) &&
        [p.a, p.b].some(([x]) => x > anchoCuerpo + .01));
    return [...cuerpo, ...tapas];
  }
  if (!tapasArriba) return enCaja(modelo, caja);
  const [alto, anchoTapas] = tapasArriba;
  const y = caja.y0 + alto;
  const cuerpo = enCaja(modelo, { ...caja, y1: y });
  const tapas = enCaja(modelo, { ...caja, x1: caja.x0 + anchoTapas, y0: y })
    .filter(p => !bordeInferior(p))
    .map(p => ({ ...p, a: p.a?.map((n, i) => i ? n + alto : n),
      b: p.b?.map((n, i) => i ? n + alto : n), punto: p.punto?.map((n, i) => i ? n + alto : n) }));
  return [...cuerpo, ...tapas];
}
const adicionales = {
  '410137-0037': { CodArticle: 'H0K410137-0037', of_: '0190850', descripcion: 'PLANE SC STANDARD WB300xWT400xB2500' },
  '410137-0038': { CodArticle: 'H0K410137-0038', of_: '0204913',
    descripcion: 'PLANE SC STANDARD WB300xWT300xB4500, OP=700 SCHWARZ SCHWARZ' },
  '410137-0039': { CodArticle: 'H0K410137-0039', of_: '0204915',
    descripcion: 'PLANE SC STANDARD WB300xWT300xB4580, OP=700 SCHWARZ SCHWARZ' },
  '410149-0001': { CodArticle: 'H0K410149-0001', of_: '0218921',
    descripcion: 'PLANE TWP OBEN TRWB500XTFWB400XTWT300XB3400' },
  '410149-0002': { CodArticle: 'H0K410149-0002', of_: '0218920',
    descripcion: 'PLANE TWP OBEN TRWB500XTFWB400XTWT300XB3350' },
  '410149-0003': { CodArticle: 'H0K410149-0003', of_: '0221421',
    descripcion: 'PLANE TWP OBEN TRWB500XTFWB400TWT300XB3100' },
  '410179-0054': { CodArticle: 'H0K410179-0054', of_: '0222276',
    descripcion: 'PLANE 2MM WB=300 WT=300 H=2900 SCHWARZ PVC, WHITE PKG 750MM' },
  '410135-0108': { CodArticle: 'H0K410135-0108', of_: '0214987',
    descripcion: 'PLANE TWP OBEN WB300XWT300X3200 OP=600 SCHWARZ SCHWARZ' },
  '410135-0109': { CodArticle: 'H0K410135-0109', of_: '0222598',
    descripcion: 'PLANE TWP OBEN WB300XWT300X3400 OP=600 SCHWARZ SCHWARZ' },
  '410143-0006': { CodArticle: 'H0K410143-0006', of_: '0220718',
    descripcion: 'PLANE TWP OBEN TWB250XTWT350XB3100 OP=600 PVC BLACK 2MM REINFORCED' },
  '410129-0053': { CodArticle: 'H0K410129-0053', of_: '0215982',
    descripcion: 'TOP CURTAIN TWP WB300xWT250x3100 BLACK' },
  '410129-0112': { CodArticle: 'H0K410129-0112', of_: '0201344',
    descripcion: 'PLANE TWP OBEN WB400xWT300xB=2500 PVC BLACK' },
  '410129-0115': { CodArticle: 'H0K410129-0115', of_: '0207029',
    descripcion: 'PLANE TWP OBEN WB400xWT400xB=2550 MATTE PVC BLACK' },
  '410129-0010': { CodArticle: 'H0K410129-0010', of_: '0204747',
    descripcion: 'PLANE TWP OBEN 300x300x1900' },
  '410129-0013': { CodArticle: 'H0K410129-0013', of_: '0202636',
    descripcion: 'TOP CURTAIN TWP 300x300x2250' },
  '410129-0015': { CodArticle: 'H0K410129-0015', of_: '0219213',
    descripcion: 'PLANE TWP OBEN 300x300x2600' },
  '410129-0052': { CodArticle: 'H0K410129-0052', of_: '0214985',
    descripcion: 'TOP CURTAIN TWP 300X300X3200 U=BLACK/A=BLACK' },
  '410129-0056': { CodArticle: 'H0K410129-0056', of_: '0197602',
    descripcion: 'TOP CURTAIN TWP 300X300X1850 U=BLACK/A=BLANCK' },
  '410129-0091': { CodArticle: 'H0K410129-0091', of_: '0202634',
    descripcion: 'PLANE TWP OBEN 300x300X3600 PVC SCHWARZ' },
  '410129-0209': { CodArticle: 'H0K410129-0209', of_: '0222484',
    descripcion: 'PLANE TWP OBEN WB300XWT300X3400' },
  '410130-0167': { CodArticle: 'H0K410130-0167', of_: '0201346',
    descripcion: 'PLANE SC SEITLICH WB400xWT300xH2900 PARKING GUIDE YELLOW RAL 1021 STANDARD (750mm)' },
  '410130-0098': { CodArticle: 'H0K410130-0098', of_: '0223004',
    descripcion: 'PLANE SC SEITLICH 300X300X2700 PKG WHITE/CONTINUOUSLLY H=2700' },
  '410130-0170': { CodArticle: 'H0K410130-0170', of_: '0204972',
    descripcion: 'PLANE SC SEITLICH WB300xWT300xH2780 PARKING GUIDE YELLOW RAL 1021/STANDARD (750MM)' },
  '410130-0172': { CodArticle: 'H0K410130-0172', of_: '0213037',
    descripcion: 'PLANE SC SEITLICH WB350XWT300XH2780 PARKIING GUIDE YELLOW RAL1021/STANDARD (750MM)' },
  '410130-0173': { CodArticle: 'H0K410130-0173', of_: '0214986',
    descripcion: 'PLANE SC SEITLICH 300X300X3100 PARKING GUIDE WHITE/CONTINUOSUSLY WITH H=3100mm' },
  '410130-0003': { CodArticle: 'H0K410130-0003', of_: '0219214',
    descripcion: 'PLANE SC SEITLICH300X300X2800ANFAHRSTREIFEN:WEIß:S' },
  '410130-0015': { CodArticle: 'H0K410130-0015', of_: '0200467',
    descripcion: 'SC SIDE CURTAIN 00X300X2650 PARKING GUIDE:WHITE/ST' },
  '410130-0169': { CodArticle: 'H0K410130-0169', of_: '0203528',
    descripcion: 'PLANE SC SEITLICH WB300xWT300xH3400 PARKIING GUIDE WHITE/STANDARD (750MM)' },
  '410130-0171': { CodArticle: 'H0K410130-0171', of_: '0205130',
    descripcion: 'PLANE SC SEITLICH WB300 X WT300 X H4300 PARKING GUIDE WHITE / STANDARD (750MM)' },
  '410124-0003': { CodArticle: 'H0K410124-0003', of_: '0232002',
    descripcion: 'TOP PVC 0,5MM GLOSSY BLK TNB2080XTWB300XTWT400_W/O OP_480X200_OPEN RECESS' },
  '410129-0212': { CodArticle: '0K410129-0212', of_: '0225444',
    descripcion: 'Top PVC WB300xWT250X1900 black' },
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
  const programa = generarProgramasCortina(calcularDesdePlantilla({ ...linea, cantidad: opciones?.unidades ?? cantidad }), false, opciones?.muestras)
    .find(p => p.nombrePiezas.startsWith(nombre) && p.gruposDePiezas === cantidad);
  if (!modelos.has(fichero)) modelos.set(fichero, leerPlanoDxf(path.join(base, fichero + '.dxf')).modelo
    .map(p => /^cutter$/i.test(p.capa) ? { ...p, capa: 'CUTTER' } :
      /^disco$/i.test(p.capa) ? { ...p, capa: 'DISCO1' } :
        p.capa === 'Rotulador' || p.capa === 'MARCA' && fichero === '2023/LOTE 28-04' ? { ...p, capa: 'ROTULADOR' } : p));
  const caja = { x0, y0, x1: x0 + programa.largoMm, y1: y0 + programa.anchoOcupadoMm };
  const reales = operacionesDelBloque(modelos.get(fichero), caja, opciones)
    // El recorte con orígenes redondeados puede arrastrar menos de 0,02 mm de la columna vecina.
    .filter(p => p.tipo !== 'raya' || (Math.hypot(p.a[0] - p.b[0], p.a[1] - p.b[1]) >= .02 &&
      !(opciones?.bordeInferior && bordeInferior(p))));
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
  if (opciones?.duplicado) {
    const soloDuplicados = Number.isFinite(resultado.desviacionMm) && resultado.desviacionMm <= 1
      && resultado.diferencias.length === 1 && resultado.diferencias[0].includes('recorridos duplicados');
    if (!soloDuplicados) process.exitCode = 1;
    console.log(ref, fichero, nombre, resultado.coincide ? 'Igual' : 'Difiere', resultado.desviacionMm?.toFixed(3), 'mm',
      ...resultado.diferencias);
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
