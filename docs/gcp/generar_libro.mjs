// Genera LONA_REMOLQUE_ACOPLA-alta-gcp.xlsx (libro de alta para GCP, solo reglas de captura).
// Los datos salen del formulario de lona de remolque de Acopla; el origen de cada cosa está en
// LONA_REMOLQUE_ACOPLA-alta-gcp-instrucciones.md. Uso: node docs/gcp/generar_libro.mjs
import ExcelJS from 'exceljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const SALIDA = path.join(aqui, 'LONA_REMOLQUE_ACOPLA-alta-gcp.xlsx');

// ── Listas de valores ────────────────────────────────────────────────────────────────────────
// Las tres primeras ya existen en GCP (LONA_REMOLQUE v1): se copian con sus valores exactos.
const LISTAS = [
  ['Tipos de lona', ['580 gr', '650 gr', '900 gr'], 'NO'],
  ['Colores lona 580 gr', ['Amarillo 1003', 'Amarillo 1019', 'Arena 938', 'Azul 5015', 'Azul europa 95', 'Blanco',
    'Burdeos - granate', 'Crema 1014', 'Gris 7037', 'Gris 7038', 'Marfil 1013', 'Marrón 204', 'Naranja 2004', 'Negro',
    'Plata 092', 'Rojo 3002', 'Verde 6024', 'Verde 6026'], 'SÍ'],
  ['Colores lona 650 gr', ['Amarillo 1003', 'Azul 5015', 'Azul europa 95', 'Blanco', 'Gris 7037', 'Gris 7038', 'Negro',
    'Rojo 3002', 'Verde 6026'], 'SÍ'],
  ['Perfiles de remolque', ['Recto', 'Recto con aguas', 'Arquillado', 'Arquillado con aguas', 'Con chaflán'], 'SÍ'],
  ['Dirección de las aguas', ['Los laterales', 'Delante y atrás'], 'NO'],
  ['Medición del chaflán', ['Cara del chaflán', 'Plano superior y aguas'], 'SÍ'],
  ['Recogidas de remolque', ['No', 'Goma', 'Ganchos corazón', 'Cremallera', 'Velcro', 'Correas', 'Puentes Esva',
    'Puentes laterales'], 'SÍ'],
  ['Reparto de ollaos', ['Repartidos automáticamente', 'A medida', 'Según ganchos'], 'NO'],
];

// ── Campos ───────────────────────────────────────────────────────────────────────────────────
// [Campo, Tipo, mín, máx, Valores, defecto, ayuda, imagen, situación, opcional, notas, multivalor]
const D = 'Número decimal';
const B = 'Booleano';
const L = 'Lista de valores';
const CAMPOS = [
  ['CANTIDAD', 'Número entero', 1, '', '', 1, 'Número de lonas iguales.', 'NO', 'Visible', 'NO', ''],
  ['TIPO DE PERFIL', L, '', '', 'Perfiles de remolque', '', 'Forma del techo del remolque.', 'SÍ', 'Visible', 'NO', ''],
  ['AGUAS HACIA', L, '', '', 'Dirección de las aguas', 'Los laterales', 'Hacia dónde caen las aguas del techo.', 'SÍ', 'Oculto', 'SÍ', ''],
  ['CÓMO SE MIDE EL CHAFLÁN', L, '', '', 'Medición del chaflán', 'Cara del chaflán', 'Qué medida del chaflán se da.', 'SÍ', 'Oculto', 'SÍ', ''],
  ['AGUAS (cm)', D, '', '', '', '', 'Caída desde la cumbrera hasta los hombros del perfil.', 'SÍ', 'Oculto', 'SÍ', 'Debe ser mayor que cero.'],
  ['PLANO SUPERIOR (cm)', D, '', '', '', '', 'Tramo plano del techo, medido en el remolque entre las curvas.', 'SÍ', 'Oculto', 'SÍ', 'Debe ser mayor que cero.'],
  ['CHAFLÁN (cm)', D, '', '', '', '', 'Cara del chaflán entre los dos vértices.', 'SÍ', 'Oculto', 'SÍ', 'Debe ser mayor que cero.'],
  ['RADIO DE ESQUINA (cm)', D, '', '', '', '', 'Radio real de las esquinas superiores.', 'SÍ', 'Oculto', 'SÍ', 'Debe ser mayor que cero.'],
  ['CON RADIOS', B, '', '', '', 'NO', 'Si las aristas del perfil llevan radio. Sin radios quedan vivas.', 'NO', 'Oculto', 'SÍ', ''],
  ['RADIO CUMBRERA (cm)', D, 0, '', '', '', 'Radio del arco de cumbrera. 0 es pico vivo.', 'SÍ', 'Oculto', 'SÍ', ''],
  ['RADIO HOMBRO (cm)', D, 0, '', '', '', 'Radio de los hombros. 0 es esquina viva.', 'SÍ', 'Oculto', 'SÍ', ''],
  ['RADIO CHAFLÁN ABAJO (cm)', D, 0, '', '', '', 'Radio de la arista del chaflán contra la pared. 0 es arista viva.', 'SÍ', 'Oculto', 'SÍ',
    'Con el chaflán medido por plano superior y aguas son los radios de la lona terminada.'],
  ['RADIO CHAFLÁN ARRIBA (cm)', D, 0, '', '', '', 'Radio de la arista del chaflán contra el techo. 0 es arista viva.', 'SÍ', 'Oculto', 'SÍ',
    'Con el chaflán medido por plano superior y aguas son los radios de la lona terminada.'],
  ['CALIDAD', L, '', '', 'Tipos de lona', '', 'Gramaje de la lona.', 'NO', 'Visible', 'NO', 'En Acopla se elige la lona de RPS, que lleva la calidad y el color.'],
  ['COLOR', L, '', '', 'Colores lona 650 gr (predeterminada) ; Colores lona 580 gr', '', 'Color de la lona.', 'SÍ', 'Visible', 'NO', ''],
  ['RECOGIDA DELANTE', L, '', '', 'Recogidas de remolque', '', 'Cómo se recoge la lona en la cabeza de delante.', 'SÍ', 'Visible', 'NO', ''],
  ['RECOGIDA ATRÁS', L, '', '', 'Recogidas de remolque', '', 'Cómo se recoge la lona en la cabeza de atrás.', 'SÍ', 'Visible', 'NO', ''],
  ['BASTILLA DE ENFUNDAR', B, '', '', '', '', 'Si la lona lleva bastilla de enfundar.', 'NO', 'Visible', 'NO', ''],
  ['LARGO (cm)', D, '', '', '', '', 'Largo del remolque.', 'NO', 'Visible', 'NO', 'Debe ser mayor que cero.'],
  ['ANCHO (cm)', D, '', '', '', '', 'Ancho del remolque delante.', 'NO', 'Visible', 'NO', 'Debe ser mayor que cero.'],
  ['ALTO DELANTE (cm)', D, '', '', '', '', 'Alto del remolque delante.', 'NO', 'Visible', 'NO',
    'Debe ser mayor que cero. Con aguas hacia delante y atrás Acopla lo llama «Alto centro».'],
  ['CONTORNO (cm)', D, '', '', '', '', 'Contorno real del remolque.', 'NO', 'Visible', 'SÍ', 'Si no se escribe, Acopla lo calcula con la forma y las medidas.'],
  ['DETRÁS DISTINTO', B, '', '', '', 'NO', 'Si el remolque tiene otro ancho u otro alto detrás.', 'NO', 'Visible', 'SÍ', ''],
  ['ANCHO DETRÁS (cm)', D, '', '', '', '', 'Ancho del remolque detrás.', 'NO', 'Oculto', 'SÍ', 'Vacío o 0 es igual que delante.'],
  ['ALTO DETRÁS (cm)', D, '', '', '', '', 'Alto del remolque detrás.', 'NO', 'Oculto', 'SÍ', 'Vacío o 0 es igual que delante.'],
  ['TRASERA A LA LÍNEA POR ARRIBA', B, '', '', '', 'NO', 'La trasera, más baja, va a la línea por arriba y el remolque sigue con el alto de delante.', 'SÍ', 'Oculto', 'SÍ', ''],
  ['CONTORNO DETRÁS (cm)', D, '', '', '', '', 'Contorno real del remolque en la punta de detrás.', 'NO', 'Oculto', 'SÍ', 'Si no se escribe, Acopla lo calcula.'],
  ['DISTRIBUCIÓN DE OLLAOS', L, '', '', 'Reparto de ollaos', '', 'Cómo van repartidos los ollaos.', 'NO', 'Visible', 'NO', ''],
  ['PASO OLLAOS LATERALES (cm)', D, 1, '', '', 35, 'Separación aproximada entre ollaos de los laterales.', 'NO', 'Oculto', 'SÍ', ''],
  ['PASO OLLAOS CABEZAS (cm)', D, 1, '', '', '', 'Separación aproximada entre ollaos de delante y de atrás.', 'NO', 'Oculto', 'SÍ', 'Si no se indica, el mismo que el de los laterales.'],
  ['OLLAOS EN LOS EXTREMOS', B, '', '', '', 'SÍ', 'Un ollao más en cada extremo de cada lado.', 'NO', 'Oculto', 'SÍ', ''],
  ['PRIMER OLLAO AL BORDE (cm)', D, 0, '', '', 2.5, 'Distancia del primer y del último ollao al borde.', 'NO', 'Oculto', 'SÍ', ''],
  ['OLLAOS LATERALES (cm)', D, 0, '', '', '', 'Posiciones de los ollaos de los laterales sobre la lona hecha, de atrás a delante.', 'SÍ', 'Oculto', 'SÍ', '', [1, '']],
  ['OLLAOS ATRÁS (cm)', D, 0, '', '', '', 'Posiciones de los ollaos de atrás sobre la lona hecha, de izquierda a derecha.', 'SÍ', 'Oculto', 'SÍ', '', [1, '']],
  ['OLLAOS DELANTE (cm)', D, 0, '', '', '', 'Posiciones de los ollaos de delante sobre la lona hecha, de izquierda a derecha.', 'SÍ', 'Oculto', 'SÍ', '', [1, '']],
  ['GANCHOS LATERALES (cm)', D, 0, 'LARGO (cm)', '', '', 'Posiciones de los ganchos de los laterales sobre el remolque, de atrás a delante.', 'SÍ', 'Oculto', 'SÍ', 'Los ollaos van entre los ganchos.', [2, '']],
  ['GANCHOS ATRÁS (cm)', D, 0, '', '', '', 'Posiciones de los ganchos de atrás sobre el remolque, de izquierda a derecha.', 'SÍ', 'Oculto', 'SÍ', 'Los ollaos van entre los ganchos.', [2, '']],
  ['GANCHOS DELANTE (cm)', D, 0, 'ANCHO (cm)', '', '', 'Posiciones de los ganchos de delante sobre el remolque, de izquierda a derecha.', 'SÍ', 'Oculto', 'SÍ', 'Los ollaos van entre los ganchos.', [2, '']],
  ['VENTANA', B, '', '', '', '', 'Si la lona lleva ventana.', 'NO', 'Visible', 'NO', ''],
  ['ANCHO VENTANA (cm)', D, '', '', '', '', 'Medida exterior de la ventana, de ancho.', 'NO', 'Oculto', 'SÍ', 'Debe ser mayor que cero.'],
  ['ALTO VENTANA (cm)', D, '', '', '', '', 'Medida exterior de la ventana, de alto.', 'NO', 'Oculto', 'SÍ', 'Debe ser mayor que cero.'],
  ['ROTULACIÓN', B, '', '', '', '', 'Si la lona va rotulada. El contenido del rótulo no se indica aquí.', 'NO', 'Visible', 'NO', ''],
  ['OBSERVACIONES', 'Texto libre', '', '', '', '', 'Observaciones del técnico, una por línea.', 'NO', 'Visible', 'SÍ', ''],
];

// ── Relaciones ───────────────────────────────────────────────────────────────────────────────
// Cada regla: { g: grupo (0 = suelta), si: [[campo, condición], …], c: campo, que: consecuencia, v: valor }
const MOSTRAR_OB = 'Mostrar campo y hacer obligatorio';
const regla = (si, c, que, v = '') => ({ si, c, que, v });
const PERFIL = 'TIPO DE PERFIL';
const CHAFLAN_PLANO = [[PERFIL, ' = Con chaflán'], ['CÓMO SE MIDE EL CHAFLÁN', ' = Plano superior y aguas']];
const LONGITUDINAL = [[PERFIL, ' = Recto con aguas'], ['AGUAS HACIA', ' = Delante y atrás']];
const REGLAS = [
  regla([[PERFIL, ' = Recto con aguas']], 'AGUAS (cm)', MOSTRAR_OB),
  regla([[PERFIL, ' = Arquillado con aguas']], 'AGUAS (cm)', MOSTRAR_OB),
  regla([[PERFIL, ' = Recto con aguas']], 'AGUAS HACIA', MOSTRAR_OB),
  regla([[PERFIL, ' = Con chaflán']], 'CÓMO SE MIDE EL CHAFLÁN', MOSTRAR_OB),
  regla(CHAFLAN_PLANO, 'PLANO SUPERIOR (cm)', MOSTRAR_OB),
  regla(CHAFLAN_PLANO, 'AGUAS (cm)', MOSTRAR_OB),
  regla([[PERFIL, ' = Con chaflán'], ['CÓMO SE MIDE EL CHAFLÁN', ' = Cara del chaflán']], 'CHAFLÁN (cm)', MOSTRAR_OB),
  regla([[PERFIL, ' = Arquillado']], 'RADIO DE ESQUINA (cm)', MOSTRAR_OB),
  regla([[PERFIL, ' = Arquillado con aguas']], 'CON RADIOS', 'Mostrar campo'),
  regla([[PERFIL, ' = Con chaflán']], 'CON RADIOS', 'Mostrar campo'),
  regla([[PERFIL, ' = Arquillado con aguas'], ['CON RADIOS', ' = SÍ']], 'RADIO CUMBRERA (cm)', 'Mostrar campo'),
  regla([[PERFIL, ' = Arquillado con aguas'], ['CON RADIOS', ' = SÍ']], 'RADIO HOMBRO (cm)', 'Mostrar campo'),
  regla([[PERFIL, ' = Con chaflán'], ['CON RADIOS', ' = SÍ']], 'RADIO CHAFLÁN ABAJO (cm)', 'Mostrar campo'),
  regla([[PERFIL, ' = Con chaflán'], ['CON RADIOS', ' = SÍ']], 'RADIO CHAFLÁN ARRIBA (cm)', 'Mostrar campo'),
  regla([[...LONGITUDINAL[0]], [...LONGITUDINAL[1]], ['AGUAS (cm)', ' >= ALTO DELANTE (cm)']], 'AGUAS (cm)', 'Error de validación',
    'Las aguas deben ser menores que el alto del centro para dejar altura en los extremos.'),
  regla([...CHAFLAN_PLANO, ['PLANO SUPERIOR (cm)', ' >= ANCHO (cm)']], 'PLANO SUPERIOR (cm)', 'Error de validación',
    'El plano superior debe ser menor que el ancho del remolque.'),
  regla([...CHAFLAN_PLANO, ['AGUAS (cm)', ' >= ALTO DELANTE (cm)']], 'AGUAS (cm)', 'Error de validación',
    'Las aguas deben ser menores que el alto del remolque.'),
  regla([['CALIDAD', ' = 580 gr']], 'COLOR', 'Cambia lista de valores', 'Colores lona 580 gr'),
  regla([['CALIDAD', ' = 650 gr']], 'COLOR', 'Cambia lista de valores', 'Colores lona 650 gr'),
  regla([['CALIDAD', ' = 900 gr']], 'CALIDAD', 'Error de validación', 'Acopla solo plantea lonas de 580 gr y de 650 gr.'),
  regla(LONGITUDINAL, 'CONTORNO (cm)', 'Ocultar campo'),
  regla([['DETRÁS DISTINTO', ' = SÍ']], 'ANCHO DETRÁS (cm)', 'Mostrar campo'),
  regla([['DETRÁS DISTINTO', ' = SÍ']], 'ALTO DETRÁS (cm)', 'Mostrar campo'),
  regla([['DETRÁS DISTINTO', ' = SÍ']], 'TRASERA A LA LÍNEA POR ARRIBA', MOSTRAR_OB),
  regla([['DETRÁS DISTINTO', ' = SÍ'], ['TRASERA A LA LÍNEA POR ARRIBA', ' = NO']], 'CONTORNO DETRÁS (cm)', 'Mostrar campo'),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = Repartidos automáticamente']], 'PASO OLLAOS LATERALES (cm)', MOSTRAR_OB),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = Repartidos automáticamente']], 'PASO OLLAOS CABEZAS (cm)', 'Mostrar campo'),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = Repartidos automáticamente']], 'PRIMER OLLAO AL BORDE (cm)', MOSTRAR_OB),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = A medida']], 'OLLAOS LATERALES (cm)', MOSTRAR_OB),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = A medida']], 'OLLAOS ATRÁS (cm)', MOSTRAR_OB),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = A medida']], 'OLLAOS DELANTE (cm)', MOSTRAR_OB),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = Según ganchos']], 'OLLAOS EN LOS EXTREMOS', MOSTRAR_OB),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = Según ganchos']], 'GANCHOS LATERALES (cm)', MOSTRAR_OB),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = Según ganchos']], 'GANCHOS ATRÁS (cm)', MOSTRAR_OB),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = Según ganchos']], 'GANCHOS DELANTE (cm)', MOSTRAR_OB),
  regla([['DISTRIBUCIÓN DE OLLAOS', ' = Según ganchos'], ['OLLAOS EN LOS EXTREMOS', ' = SÍ']], 'PRIMER OLLAO AL BORDE (cm)', MOSTRAR_OB),
  regla([['VENTANA', ' = SÍ']], 'ANCHO VENTANA (cm)', MOSTRAR_OB),
  regla([['VENTANA', ' = SÍ']], 'ALTO VENTANA (cm)', MOSTRAR_OB),
  regla([['VENTANA', ' = SÍ'], ['ANCHO VENTANA (cm)', ' >= ANCHO (cm)']], 'ANCHO VENTANA (cm)', 'Error de validación',
    'El ancho de la ventana debe ser menor que el ancho del remolque.'),
  regla([['VENTANA', ' = SÍ'], ['ALTO VENTANA (cm)', ' >= ALTO DELANTE (cm)']], 'ALTO VENTANA (cm)', 'Error de validación',
    'El alto de la ventana debe ser menor que el alto delantero.'),
];

// ── Escritura ────────────────────────────────────────────────────────────────────────────────
const libro = new ExcelJS.Workbook();
const hoja = (nombre, cabecera, filas) => {
  const h = libro.addWorksheet(nombre);
  h.addRow(cabecera);
  for (const fila of filas) h.addRow(fila.map((v) => (v === '' || v == null ? null : v)));
  h.getRow(1).font = { bold: true };
  h.columns.forEach((col) => { col.width = 24; });
};

let idValor = 0;
hoja('Listas de valores', ['ID Valor', 'Lista de Valores', 'Valor', 'Imagen', 'Descripción'],
  LISTAS.flatMap(([lista, valores, imagen]) => valores.map((valor) => [++idValor, lista, valor, imagen, ''])));

const idCampo = new Map(CAMPOS.map((c, i) => [c[0], i + 1]));
hoja('Campos', ['ID', 'Campo', 'Tipo', 'Valor mínimo', 'Valor máximo', 'Valores', 'Valor por defecto', 'Texto ayuda',
  'Imagen ayuda', 'Situación inicio', 'Opcional', 'Notas', 'Varios valores', 'Mín. valores', 'Máx. valores'],
  CAMPOS.map(([campo, tipo, min, max, valores, def, ayuda, img, sit, opc, notas, multi], i) => [
    i + 1, campo, tipo, min, max, valores, def, ayuda, img, sit, opc, notas,
    multi ? 'SÍ' : 'NO', multi ? multi[0] : '', multi ? multi[1] : '',
  ]));

const filasRel = [];
let grupo = 0;
for (const r of REGLAS) {
  const g = r.si.length > 1 ? ++grupo : 0;
  for (const [origen, condicion] of r.si) {
    if (!idCampo.has(origen) || !idCampo.has(r.c)) throw new Error(`Campo desconocido en una regla: ${origen} / ${r.c}`);
    filasRel.push([filasRel.length + 1, g, idCampo.get(origen), origen, idCampo.get(r.c), r.c, condicion, r.que, r.v]);
  }
}
hoja('Relaciones', ['ID Relación', 'Grupo', 'Campo origen', 'Nombre campo origen', 'Campo consecuencia',
  'Nombre campo consecuencia', 'Condición', 'Consecuencia', 'Valor consecuencia'], filasRel);

await libro.xlsx.writeFile(SALIDA);
console.log(`Escrito ${SALIDA}: ${LISTAS.length} listas, ${idValor} valores, ${CAMPOS.length} campos, ${filasRel.length} relaciones, ${grupo} grupos`);
