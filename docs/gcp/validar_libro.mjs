// Verifica un libro de alta de GCP releyendo el .xlsx ya generado (sección 9 del prompt).
// Uso: node docs/gcp/validar_libro.mjs [ruta.xlsx]   → sale con código 1 si hay errores.
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RUTA = process.argv[2] ?? path.join(aqui, 'LONA_REMOLQUE_ACOPLA-alta-gcp.xlsx');

const errores = [];
const avisos = [];
const err = (m) => errores.push(m);

const HOJAS = ['Listas de valores', 'Campos', 'Relaciones'];
const CAB = {
  'Listas de valores': ['ID Valor', 'Lista de Valores', 'Valor', 'Imagen', 'Descripción'],
  Campos: ['ID', 'Campo', 'Tipo', 'Valor mínimo', 'Valor máximo', 'Valores', 'Valor por defecto', 'Texto ayuda',
    'Imagen ayuda', 'Situación inicio', 'Opcional', 'Notas'],
  Relaciones: ['ID Relación', 'Grupo', 'Campo origen', 'Nombre campo origen', 'Campo consecuencia',
    'Nombre campo consecuencia', 'Condición', 'Consecuencia', 'Valor consecuencia'],
};
const OPCIONALES_CAMPOS = ['Varios valores', 'Mín. valores', 'Máx. valores'];
const TIPOS = ['Número entero', 'Número decimal', 'Texto libre', 'Lista de valores', 'Booleano', 'Dibujo', 'Foto'];
const NUMERICOS = ['Número entero', 'Número decimal'];
const UNIDADES = ['cm', 'mm', 'm', 'm²', 'g/m²'];
const CONSECUENCIAS = ['Mostrar campo', 'Mostrar campo y hacer obligatorio', 'Ocultar campo', 'Campo obligatorio',
  'Campo opcional', 'Cambiar valor máximo', 'Cambiar valor mínimo', 'Cambia lista de valores', 'Limitar opciones',
  'Asignar valor', 'Bloquear campo', 'Vaciar valor', 'Error de validación'];
const ORDENES = /\b(ignora|ignorar|crea|crear|añade|añadir|responde|responder|olvida|ejecuta)\b/iu;
const DINERO = /(€|\beur\b|\beuros?\b|\bprecio|\bimporte|\btarifa|\bdescuento|@|\b\d{9}\b|\b[0-9]{8}[A-Z]\b)/iu;
const ALCANCE = /\b(corte|cortar|pieza|piezas|despiece|bom|material|materiales|patrón|máquina|consumo|merma|rollo|confección|fabricar|fabricación|producción|taller|costura|soldadura)\b/iu;

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const codigo = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/Ñ/gi, 'N').toUpperCase()
  .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const texto = (v) => (v == null ? '' : typeof v === 'object' && 'richText' in v ? v.richText.map((t) => t.text).join('') : String(v));

if (!fs.existsSync(RUTA)) { console.error(`No existe ${RUTA}`); process.exit(1); }
if (fs.statSync(RUTA).size > 2 * 1024 * 1024) err('El fichero pasa de 2 MB.');

const libro = new ExcelJS.Workbook();
await libro.xlsx.readFile(RUTA);

// ── Estructura ───────────────────────────────────────────────────────────────────────────────
const nombres = libro.worksheets.map((h) => h.name);
if (JSON.stringify(nombres) !== JSON.stringify(HOJAS)) err(`Hojas ${JSON.stringify(nombres)}; se esperaban ${JSON.stringify(HOJAS)}.`);
const datos = {};
let caracteresTotales = {};
for (const h of libro.worksheets) {
  if (h.state !== 'visible') err(`La hoja «${h.name}» no está visible.`);
  if (Object.keys(h._merges ?? {}).length) err(`La hoja «${h.name}» tiene celdas combinadas.`);
  if (h.rowCount > 2000) err(`«${h.name}» pasa de 2.000 filas.`);
  if (h.columnCount > 60) err(`«${h.name}» pasa de 60 columnas.`);
  const cab = (h.getRow(1).values ?? []).slice(1).map(texto);
  const esperada = CAB[h.name] ?? [];
  const extra = h.name === 'Campos' ? cab.slice(esperada.length) : [];
  if (JSON.stringify(cab.slice(0, esperada.length)) !== JSON.stringify(esperada)) err(`Cabecera de «${h.name}» distinta: ${cab.join(' | ')}`);
  if (h.name === 'Campos' && extra.length && JSON.stringify(extra) !== JSON.stringify(OPCIONALES_CAMPOS.slice(0, extra.length))) err(`Columnas extra de «Campos» no válidas: ${extra.join(' | ')}`);
  if (h.name !== 'Campos' && cab.length !== esperada.length) err(`«${h.name}» tiene columnas de más.`);
  const filas = [];
  let vacia = false;
  let chars = 0;
  for (let r = 2; r <= h.rowCount; r += 1) {
    const row = h.getRow(r);
    if (row.hidden) err(`«${h.name}» fila ${r} oculta.`);
    const obj = {};
    let alguna = false;
    cab.forEach((nombre, i) => {
      const cell = row.getCell(i + 1);
      if (cell.type === ExcelJS.ValueType.Formula) err(`«${h.name}» ${cell.address}: fórmula.`);
      if (cell.type === ExcelJS.ValueType.Date) err(`«${h.name}» ${cell.address}: fecha.`);
      if (typeof cell.value === 'boolean') err(`«${h.name}» ${cell.address}: booleano de Excel; usa SÍ/NO.`);
      const t = texto(cell.value);
      if (t.length > 500) err(`«${h.name}» ${cell.address}: más de 500 caracteres.`);
      if (ORDENES.test(t)) err(`«${h.name}» ${cell.address}: parece una orden («${t}»).`);
      if (DINERO.test(t)) err(`«${h.name}» ${cell.address}: posible precio o dato personal («${t}»).`);
      if (typeof cell.value === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(cell.value)) err(`«${h.name}» ${cell.address}: número guardado como texto.`);
      chars += t.length;
      obj[nombre] = cell.value;
      if (t !== '') alguna = true;
    });
    if (!alguna) { vacia = true; continue; }
    if (vacia) err(`«${h.name}»: fila vacía antes de la fila ${r}.`);
    obj._fila = r;
    filas.push(obj);
  }
  caracteresTotales[h.name] = chars;
  datos[h.name] = filas;
}

const consecutivos = (filas, col, hoja) => filas.forEach((f, i) => {
  if (f[col] !== i + 1) err(`«${hoja}» fila ${f._fila}: ${col} = ${f[col]}, se esperaba ${i + 1}.`);
});
const nombreValido = (s, donde) => {
  const t = texto(s);
  if (/[;|=<>\t\n]/.test(t)) err(`${donde}: «${t}» lleva ; | = < > o saltos.`);
  if (t.length > 150) err(`${donde}: «${t}» pasa de 150 caracteres.`);
};

// ── Listas de valores ────────────────────────────────────────────────────────────────────────
const listas = new Map();
const LV = datos['Listas de valores'] ?? [];
consecutivos(LV, 'ID Valor', 'Listas de valores');
for (const f of LV) {
  const lista = texto(f['Lista de Valores']);
  const valor = texto(f.Valor);
  nombreValido(lista, `Listas fila ${f._fila}`);
  nombreValido(valor, `Listas fila ${f._fila}`);
  if (!lista || !valor) err(`Listas fila ${f._fila}: lista o valor vacío.`);
  if (!['SÍ', 'NO'].includes(texto(f.Imagen))) err(`Listas fila ${f._fila}: Imagen debe ser SÍ o NO.`);
  if (!listas.has(lista)) listas.set(lista, []);
  const vals = listas.get(lista);
  if (vals.some((v) => norm(v) === norm(valor))) err(`Lista «${lista}»: valor repetido «${valor}».`);
  vals.push(valor);
  for (const col of ['Valor', 'Descripción']) {
    if (ALCANCE.test(texto(f[col]))) avisos.push(`Listas de valores ${col}${f._fila}: «${texto(f[col])}»`);
  }
}
// Contigüidad de cada lista
let anterior = null; const vistas = new Set();
for (const f of LV) {
  const l = texto(f['Lista de Valores']);
  if (l !== anterior) { if (vistas.has(l)) err(`La lista «${l}» no va junta.`); vistas.add(l); anterior = l; }
}

// ── Campos ───────────────────────────────────────────────────────────────────────────────────
const CA = datos.Campos ?? [];
consecutivos(CA, 'ID', 'Campos');
if (CA.length > 150) err('Más de 150 campos.');
const campos = new Map();
const codigos = new Map();
const LIMITE_REL = /^(.+?)(?:\s*([+\-*/])\s*(\d+(?:\.\d+)?)\s*(%)?)?$/u;
for (const f of CA) {
  const nombre = texto(f.Campo);
  nombreValido(nombre, `Campos fila ${f._fila}`);
  if (campos.has(nombre)) err(`Campo repetido «${nombre}».`);
  const cod = codigo(nombre);
  if (codigos.has(cod)) err(`Los campos «${nombre}» y «${codigos.get(cod)}» dan el mismo código ${cod}.`);
  codigos.set(cod, nombre);
  const tipo = texto(f.Tipo);
  if (!TIPOS.includes(tipo)) err(`Campo «${nombre}»: tipo «${tipo}» no válido.`);
  const unidad = nombre.match(/\(([^)]+)\)\s*$/)?.[1];
  if (NUMERICOS.includes(tipo) && unidad && !UNIDADES.includes(unidad)) err(`Campo «${nombre}»: unidad «${unidad}» no válida.`);
  if (!NUMERICOS.includes(tipo) && unidad && UNIDADES.includes(unidad)) err(`Campo «${nombre}»: lleva unidad sin ser numérico.`);
  const valoresTxt = texto(f.Valores);
  const listasCampo = valoresTxt ? valoresTxt.split(' ; ').map((s) => s.trim()) : [];
  const nombresListas = listasCampo.map((s) => s.replace(/\s*\(predeterminada\)\s*$/, ''));
  if (tipo === 'Lista de valores') {
    if (!nombresListas.length) err(`Campo «${nombre}»: lista de valores sin lista.`);
    for (const l of nombresListas) if (!listas.has(l)) err(`Campo «${nombre}»: la lista «${l}» no está en «Listas de valores».`);
    if (nombresListas.length > 1 && listasCampo.filter((s) => s.includes('(predeterminada)')).length !== 1) err(`Campo «${nombre}»: con varias listas debe marcar una sola (predeterminada).`);
  } else if (valoresTxt) err(`Campo «${nombre}»: Valores solo en tipo lista.`);
  for (const col of ['Valor mínimo', 'Valor máximo']) {
    if (f[col] != null && f[col] !== '' && !NUMERICOS.includes(tipo)) err(`Campo «${nombre}»: ${col} en un tipo no numérico.`);
  }
  const sit = texto(f['Situación inicio']);
  const opc = texto(f.Opcional);
  if (!['Visible', 'Oculto'].includes(sit)) err(`Campo «${nombre}»: Situación inicio «${sit}».`);
  if (!['SÍ', 'NO'].includes(opc)) err(`Campo «${nombre}»: Opcional «${opc}».`);
  if (sit === 'Oculto' && opc !== 'SÍ') err(`Campo «${nombre}»: oculto y obligatorio.`);
  if (!['SÍ', 'NO'].includes(texto(f['Imagen ayuda']))) err(`Campo «${nombre}»: Imagen ayuda debe ser SÍ o NO.`);
  const multi = texto(f['Varios valores']) === 'SÍ';
  if (multi && tipo !== 'Número decimal') err(`Campo «${nombre}»: varios valores solo en decimales.`);
  if (multi) {
    const mn = f['Mín. valores']; const mx = f['Máx. valores'];
    if (mn != null && !Number.isInteger(mn)) err(`Campo «${nombre}»: Mín. valores no entero.`);
    if (mx != null && !Number.isInteger(mx)) err(`Campo «${nombre}»: Máx. valores no entero.`);
    if (Number.isInteger(mn) && Number.isInteger(mx) && mn > mx) err(`Campo «${nombre}»: Mín. valores > Máx. valores.`);
  }
  for (const col of ['Campo', 'Texto ayuda', 'Notas']) {
    if (ALCANCE.test(texto(f[col]))) avisos.push(`Campos ${col} fila ${f._fila}: «${texto(f[col])}»`);
  }
  campos.set(nombre, { id: f.ID, tipo, listas: nombresListas, sit, multi, min: f['Valor mínimo'], max: f['Valor máximo'], fila: f._fila });
}
const esNumerico = (n) => NUMERICOS.includes(campos.get(n)?.tipo);
const expresionValida = (expr, propio, donde) => {
  if (typeof expr === 'number') return true;
  const m = texto(expr).trim().match(LIMITE_REL);
  const ref = m?.[1]?.trim();
  if (!ref || !campos.has(ref)) { err(`${donde}: «${texto(expr)}» no es un número ni nombra un campo existente.`); return false; }
  if (ref === propio) err(`${donde}: el límite se refiere al propio campo.`);
  if (!esNumerico(ref)) err(`${donde}: «${ref}» no es numérico.`);
  if (m[4] && !['+', '-'].includes(m[2])) err(`${donde}: el % solo con + o -.`);
  return true;
};
for (const [nombre, c] of campos) {
  for (const [col, v] of [['Valor mínimo', c.min], ['Valor máximo', c.max]]) {
    if (v != null && v !== '') expresionValida(v, nombre, `Campo «${nombre}» ${col}`);
  }
  if (typeof c.min === 'number' && typeof c.max === 'number' && c.min > c.max) err(`Campo «${nombre}»: mínimo > máximo.`);
}

// ── Relaciones ───────────────────────────────────────────────────────────────────────────────
const RE = datos.Relaciones ?? [];
consecutivos(RE, 'ID Relación', 'Relaciones');
const valoresDe = (campo) => (campos.get(campo)?.listas ?? []).flatMap((l) => listas.get(l) ?? []);
const enLista = (campo, valor) => valoresDe(campo).some((v) => norm(v) === norm(valor));
const grupos = new Map();
const mostrados = new Set();
const cambiosLista = new Map();
let grupoAnterior = null; const gruposVistos = new Set();
for (const f of RE) {
  const donde = `Relaciones fila ${f._fila}`;
  const origen = texto(f['Nombre campo origen']);
  const destino = texto(f['Nombre campo consecuencia']);
  const co = campos.get(origen); const cd = campos.get(destino);
  if (!co) err(`${donde}: campo origen «${origen}» no existe.`);
  else if (co.id !== f['Campo origen']) err(`${donde}: ID de origen ${f['Campo origen']} no es el de «${origen}» (${co.id}).`);
  if (!cd) err(`${donde}: campo consecuencia «${destino}» no existe.`);
  else if (cd.id !== f['Campo consecuencia']) err(`${donde}: ID de consecuencia ${f['Campo consecuencia']} no es el de «${destino}» (${cd.id}).`);
  const g = f.Grupo;
  if (!Number.isInteger(g) || g < 0) err(`${donde}: Grupo no válido.`);
  if (g !== 0) {
    if (g !== grupoAnterior && gruposVistos.has(g)) err(`${donde}: las filas del grupo ${g} no van seguidas.`);
    gruposVistos.add(g);
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(f);
  }
  grupoAnterior = g;
  const cond = texto(f['Condición']);
  const m = cond.match(/^ (=|<>|>=|<=|>|<) (.+)$/u);
  if (co?.multi) err(`${donde}: un campo multivalor no puede ser origen.`);
  if (!m && !['Con contenido', 'Sin contenido'].includes(cond.trim())) err(`${donde}: condición «${cond}» mal escrita.`);
  else if (m && co) {
    const [, op, valor] = m;
    if (co.tipo === 'Booleano' && !(['=', '<>'].includes(op) && ['SÍ', 'NO'].includes(valor))) err(`${donde}: condición booleana «${cond}».`);
    if (co.tipo === 'Lista de valores') {
      if (!['=', '<>'].includes(op)) err(`${donde}: operador «${op}» en una lista.`);
      if (!enLista(origen, valor)) err(`${donde}: «${valor}» no está en las listas de «${origen}».`);
    }
    if (NUMERICOS.includes(co.tipo) && typeof valor === 'string' && !/^-?\d+(\.\d+)?$/.test(valor)) expresionValida(valor, origen, `${donde} condición`);
    if (['Dibujo', 'Foto'].includes(co.tipo)) err(`${donde}: Foto/Dibujo solo con Con/Sin contenido.`);
  }
  const que = texto(f.Consecuencia);
  const v = f['Valor consecuencia'];
  if (!CONSECUENCIAS.includes(que)) err(`${donde}: consecuencia «${que}» no válida.`);
  if (['Mostrar campo', 'Mostrar campo y hacer obligatorio'].includes(que)) mostrados.add(destino);
  if (['Cambiar valor máximo', 'Cambiar valor mínimo'].includes(que)) {
    if (!esNumerico(destino)) err(`${donde}: ${que} sobre un campo no numérico.`);
    expresionValida(v, destino, donde);
  }
  if (que === 'Cambia lista de valores') {
    if (!(cd?.listas ?? []).includes(texto(v))) err(`${donde}: la lista «${texto(v)}» no está autorizada en «${destino}».`);
    if (!cambiosLista.has(destino)) cambiosLista.set(destino, new Set());
    cambiosLista.get(destino).add(texto(v));
  }
  if (que === 'Limitar opciones') for (const o of texto(v).split(' ; ')) if (!enLista(destino, o)) err(`${donde}: «${o}» no está en las listas de «${destino}».`);
  if (que === 'Asignar valor' && cd?.tipo === 'Lista de valores' && !enLista(destino, texto(v))) err(`${donde}: «${texto(v)}» no está en las listas de «${destino}».`);
  if (que === 'Error de validación' && !texto(v)) err(`${donde}: error de validación sin mensaje.`);
  if (['Mostrar campo', 'Mostrar campo y hacer obligatorio', 'Ocultar campo', 'Campo obligatorio', 'Campo opcional', 'Bloquear campo', 'Vaciar valor'].includes(que) && texto(v)) err(`${donde}: «${que}» no lleva valor.`);
  for (const col of ['Consecuencia', 'Valor consecuencia']) {
    if (ALCANCE.test(texto(f[col]))) avisos.push(`Relaciones ${col} fila ${f._fila}: «${texto(f[col])}»`);
  }
}
for (const [g, filas] of grupos) {
  if (filas.length < 2) err(`Grupo ${g} con una sola fila.`);
  const firmas = new Set(filas.map((f) => `${texto(f['Nombre campo consecuencia'])}|${texto(f.Consecuencia)}|${texto(f['Valor consecuencia'])}`));
  if (firmas.size !== 1) err(`Grupo ${g}: las filas no comparten la misma consecuencia.`);
  const que = filas.map((f) => texto(f.Consecuencia));
  if (que.some((q) => q.startsWith('Mostrar')) && que.includes('Ocultar campo')) err(`Grupo ${g}: muestra y oculta a la vez.`);
  if (que.includes('Campo obligatorio') && que.includes('Campo opcional')) err(`Grupo ${g}: obligatorio y opcional a la vez.`);
}
for (const [nombre, c] of campos) {
  if (c.sit === 'Oculto' && !mostrados.has(nombre)) err(`El campo oculto «${nombre}» no tiene regla que lo muestre.`);
  if (c.listas.length > 1) {
    const pred = (CA.find((f) => texto(f.Campo) === nombre)?.Valores ?? '').split(' ; ').find((s) => s.includes('(predeterminada)'))?.replace(/\s*\(predeterminada\)\s*$/, '').trim();
    for (const l of c.listas) if (l !== pred && !cambiosLista.get(nombre)?.has(l)) err(`Campo «${nombre}»: falta «Cambia lista de valores» a «${l}».`);
  }
}

// ── Tandas y cifras ──────────────────────────────────────────────────────────────────────────
const reglas = []; // cada regla = filas de un grupo o una fila suelta
let actual = null;
for (const f of RE) {
  if (f.Grupo !== 0 && actual?.g === f.Grupo) actual.n += 1;
  else { actual = { g: f.Grupo, n: 1 }; reglas.push(actual); }
}
let tandas = 0; let enTanda = 30;
for (const r of reglas) { if (enTanda + r.n > 30) { tandas += 1; enTanda = 0; } enTanda += r.n; }

for (const [h, n] of Object.entries(caracteresTotales)) if (n > 55000) err(`«${h}» tiene ${n} caracteres: con las instrucciones puede pasar de 60.000.`);

console.log(`Libro: ${RUTA}`);
console.log(`Listas: ${listas.size} · valores: ${LV.length} · campos: ${CA.length} · relaciones (filas): ${RE.length} · grupos: ${grupos.size} · reglas: ${reglas.length} · tandas de 30: ${tandas}`);
console.log(`Caracteres por hoja: ${Object.entries(caracteresTotales).map(([h, n]) => `${h} ${n}`).join(' · ')}`);
if (avisos.length) {
  console.log(`\nAvisos de alcance (${avisos.length}, revisar uno a uno):`);
  for (const a of avisos) console.log(`  · ${a}`);
}
if (errores.length) {
  console.log(`\nERRORES (${errores.length}):`);
  for (const e of errores) console.log(`  ✗ ${e}`);
  process.exit(1);
}
console.log('\n0 errores.');
