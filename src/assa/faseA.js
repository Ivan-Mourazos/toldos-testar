import { codigoAssa } from './leerCorte.js';
import { generarPanos420150 } from './generar420150.js';

export function fechaLote(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Elige un sábado de entrega.');
  const d = new Date(fecha + 'T12:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== fecha || d.getUTCDay() !== 6) throw new Error('La fecha de entrega debe ser un sábado válido.');
  return `LOTE ${fecha.slice(8)}-${fecha.slice(5, 7)}`;
}

export const entidadesVacias = () => ({ lineas: [], arcos: [], circulos: [], textos: [] });

/** Reglas candidatas: la autorización para fabricar exige además el contraste del catálogo. */
export function calcularFamilia(l, { nkValidado = false, terminadoMm } = {}) {
  const codigo = codigoAssa(l.CodArticle), familia = codigo?.slice(0, 6);
  const motivos = [], avisos = [], medidas = {};
  const texto = String(l.descripcion ?? '').toUpperCase().replace(/NW(?=\s*=?\s*\d)/g, 'NB');
  if (!['420102', '420148', '420150'].includes(familia)) motivos.push('Familia fuera de la fase A: preparación a mano.');
  if (!String(l.of_ ?? '').trim()) motivos.push('Falta la OF de RPS.');
  if (!Number.isSafeInteger(l.cantidad) || l.cantidad <= 0) motivos.push('La cantidad de RPS debe ser un entero positivo.');
  if (/\b(?:RED|BLUE|ROT|BLAU|ROJ[OA]|AZUL|WHITE|WEISS|BLANC[OA])\b|RAL\s*(?!9005\b)\d{4}/.test(texto)) motivos.push('Material o color distinto de PLASTEL negra: sin validación de material.');
  for (const m of texto.matchAll(/(NT|NB|NH|NK)\s*=?\s*(\d+(?:[.,]\d+)?)(\s*[+-]\s*\d+(?:[.,]\d+)?)?/g)) {
    const clave = m[1] === 'NK' && nkValidado ? 'NH' : m[1];
    const valor = Number(m[2].replace(',', '.'));
    if (clave === 'NK') motivos.push('NK: equivalencia con NH pendiente de contraste.');
    if (medidas[clave] !== undefined && medidas[clave] !== valor) motivos.push(`${clave} tiene dos medidas diferentes.`);
    medidas[clave] = valor;
    const ajuste = m[3]?.replace(/\s/g, '') ?? '';
    const permitido = !ajuste || (familia === '420102' && clave === 'NH' && ajuste === '-200') ||
      (familia === '420148' && ((clave === 'NB' && ajuste === '-8') || (clave === 'NT' && ajuste === '-5')));
    if (!permitido) motivos.push(`${clave}${ajuste}: suma o descuento sin validar para esta familia.`);
  }
  if (familia === '420150' && medidas.NH < 1000 && terminadoMm?.length === 2 &&
    terminadoMm.every(n => Number.isFinite(n) && n > 0) && medidas.NB > 1000 && terminadoMm[1] === medidas.NT) {
    medidas.NH = (terminadoMm[0] - medidas.NB + 8) / 2;
    avisos.push('Descripción de RPS recortada: medida recuperada de la ficha de medidas de producción del cliente.');
  }
  for (const k of familia === '420102' ? ['NH', 'NT'] : ['NB', 'NH', 'NT']) {
    if (!Number.isFinite(medidas[k]) || medidas[k] < (k === 'NT' ? 100 : 1000)) motivos.push(`Falta ${k} completa en la línea de RPS.`);
  }
  const trazabilidad = { referencia: l.CodArticle, pedido: l.CodOrder, linea: l.IDOrderLine, of: l.of_, numeroLinea: l.NumLine };
  const resultado = { estado: 'a-mano', familia, codigo, motivos, avisos, medidas, trazabilidad, cantidadPedida: l.cantidad,
    material: { nombre: 'PLASTEL 8800 TE62 negra', anchoRolloMm: 2040, permitirEmpates: false, permitirGiro: false } };
  if (motivos.length) return resultado;
  if (familia === '420150') {
    const g = generarPanos420150({ ...l, descripcion: `NT${medidas.NT} NB${medidas.NB} NH${medidas.NH}` });
    return { ...resultado, ...g, avisos, familia, codigo };
  }
  const { NB, NH, NT } = medidas;
  const largo = familia === '420102' ? NH - 190 : NB + 2 * NH + 5;
  const ancho = NT + (familia === '420102' ? 66 : 61);
  if (ancho > 2040) return { ...resultado, motivos: ['La pieza no cabe en el rollo de 2040 mm sin girar ni empatar.'] };
  const entidades = entidadesVacias();
  entidades.lineas.push(
    { capa: 'DISCO1', x1: 0, y1: 0, x2: 0, y2: ancho },
    { capa: 'DISCO1', x1: largo, y1: 0, x2: largo, y2: ancho },
    { capa: 'DISCO1', x1: 0, y1: ancho, x2: largo, y2: ancho });
  return { ...resultado, estado: 'generado', terminadoMm: [largo - 10, ancho - 66],
    pieza: { tipo: 'pano', medidasMm: [largo, ancho], entidades } };
}

export function desplazarEntidades(e, dx, dy) {
  return {
    lineas: e.lineas.map(l => ({ ...l, x1: l.x1 + dx, x2: l.x2 + dx, y1: l.y1 + dy, y2: l.y2 + dy })),
    arcos: e.arcos.map(a => ({ ...a, x: a.x + dx, y: a.y + dy })),
    circulos: e.circulos.map(c => ({ ...c, x: c.x + dx, y: c.y + dy })),
    textos: e.textos.map(t => ({ ...t, x: t.x + dx, y: t.y + dy })),
  };
}

export function unirEntidades(destino, origen) {
  for (const clave of ['lineas', 'arcos', 'circulos', 'textos']) destino[clave].push(...origen[clave]);
}

export function generarProgramas(g, { sueltas = false } = {}) {
  if (g.estado !== 'generado') return [];
  const capacidad = sueltas ? 1 : Math.min(3, Math.floor(2040 / g.pieza.medidasMm[1]));
  const cantidades = [[capacidad, Math.floor(g.cantidadPedida / capacidad)], [g.cantidadPedida % capacidad, 1]];
  return cantidades.filter(([n, r]) => n > 0 && r > 0).map(([panos, repeticiones]) => {
    const entidades = entidadesVacias();
    for (let i = 0; i < panos; i++) unirEntidades(entidades, desplazarEntidades(g.pieza.entidades, 0, i * g.pieza.medidasMm[1]));
    entidades.textos.push({ capa: 'texto', x: 100, y: panos * g.pieza.medidasMm[1] + 80, h: 40,
      literal: true, valor: `${g.trazabilidad.referencia} x${repeticiones}` });
    return { panos, repeticiones, anchoOcupadoMm: panos * g.pieza.medidasMm[1], entidades };
  });
}
