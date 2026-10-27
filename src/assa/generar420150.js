import { codigoAssa } from './leerCorte.js';

// Reglas de paños contrastadas con los lotes de máquina, no con el código de variante.
// El número de agujeros se conserva por NB probado; no se extrapola un paso no confirmado.
const AGUJEROS_POR_NB = new Map([[3250, 11], [3450, 12]]);
const vacias = () => ({ lineas: [], arcos: [], circulos: [], textos: [] });
const linea = (e, capa, x1, y1, x2, y2) => e.lineas.push({ capa, x1, y1, x2, y2 });

function ranura(e, x, y) {
  // Ranura de 70 × 20, radio 3; extremos rectos de 14 y 64 mm.
  linea(e, 'CUTTER', x - 35, y - 7, x - 35, y + 7);
  linea(e, 'CUTTER', x + 35, y - 7, x + 35, y + 7);
  linea(e, 'CUTTER', x - 32, y - 10, x + 32, y - 10);
  linea(e, 'CUTTER', x - 32, y + 10, x + 32, y + 10);
  for (const [dx, dy, desde, hasta] of [[32, 7, 0, 90], [-32, 7, 90, 180], [-32, -7, 180, 270], [32, -7, 270, 360]]) {
    e.arcos.push({ capa: 'CUTTER', x: x + dx, y: y + dy, r: 3, desde, hasta });
  }
}

export function leerMedidas420150(descripcion) {
  const texto = String(descripcion ?? '').toUpperCase(), medidas = {}, motivos = [];
  if (/\b(?:NW|NK|MH)\s*=?\s*\d/.test(texto)) motivos.push('El pedido usa NW, NK o MH: equivalencia pendiente de confirmar.');
  for (const m of texto.matchAll(/(NT|NB|NH)\s*=?\s*(\d+(?:[.,]\d+)?)(\s*[+-]\s*\d+(?:[.,]\d+)?)?/g)) {
    const valor = Number(m[2].replace(',', '.'));
    if (m[3]) motivos.push(`${m[1]} contiene una suma o descuento sin regla confirmada.`);
    if (medidas[m[1]] !== undefined && medidas[m[1]] !== valor) motivos.push(`${m[1]} aparece con dos medidas distintas.`);
    medidas[m[1]] = valor;
  }
  for (const clave of ['NT', 'NB', 'NH']) if (!Number.isFinite(medidas[clave])) motivos.push(`Falta ${clave} en la descripción de la línea de RPS.`);
  if (medidas.NH < 1000) motivos.push('NH es corta o está recortada; no se completa añadiendo cifras.');
  if (medidas.NT !== undefined && medidas.NT !== 600) motivos.push('Fondo distinto de NT600: paño sin validar.');
  if (medidas.NB !== undefined && !AGUJEROS_POR_NB.has(medidas.NB)) motivos.push(`NB${medidas.NB}: reparto de agujeros y accesorios pendiente de validar.`);
  if (/\b(?:RED|BLUE|ROT|BLAU|ROJ[OA]|AZUL|WHITE|WEISS|BLANC[OA])\b|RAL\s*(?!9005\b)\d{4}/.test(texto)) motivos.push('Color distinto de PLASTEL 8800 TE62 negra o sin correspondencia confirmada.');
  return { medidas, motivos };
}

function entidadesPano({ NB, NH }, largo, ancho) {
  const e = vacias(), y = ancho / 2;
  // El borde inferior es el orillo del rollo o el corte compartido del paño anterior.
  linea(e, 'DISCO1', 0, 0, 0, ancho);
  linea(e, 'DISCO1', largo, 0, largo, ancho);
  linea(e, 'DISCO1', 0, ancho, largo, ancho);
  ranura(e, NH - 30, y);
  ranura(e, NH + NB + 32, y);
  const desde = NH + 155, hasta = NH + NB - 153, agujeros = AGUJEROS_POR_NB.get(NB);
  for (let i = 0; i < agujeros; i++) e.circulos.push({ capa: 'CUTTER', x: desde + (hasta - desde) * i / (agujeros - 1), y, r: 7 });
  for (const dy of [-32.5, 32.5]) linea(e, 'ROTULADOR', NH + 5, y + dy, NH + NB - 3, y + dy);
  return e;
}

function programa(pieza, panos, repeticiones, trazabilidad) {
  const entidades = vacias();
  for (let i = 0; i < panos; i++) {
    const dy = i * pieza.medidasMm[1], e = pieza.entidades;
    entidades.lineas.push(...e.lineas.map(l => ({ ...l, y1: l.y1 + dy, y2: l.y2 + dy })));
    entidades.arcos.push(...e.arcos.map(a => ({ ...a, y: a.y + dy })));
    entidades.circulos.push(...e.circulos.map(c => ({ ...c, y: c.y + dy })));
    entidades.textos.push({ capa: 'ROTULADOR', x: 100, y: dy + 80, h: 20, literal: true,
      valor: `${trazabilidad.referencia} ${trazabilidad.pedido} OF ${trazabilidad.of}` });
  }
  return { panos, repeticiones, unidades: panos * repeticiones, anchoOcupadoMm: panos * pieza.medidasMm[1], orillo: 'inferior', entidades };
}

/** Recibe campos de la línea SELECT de RPS; nunca completa medidas con el maestro de artículos. */
export function generarPanos420150(lineaRps, { completarConjuntosDe3 = false } = {}) {
  const trazabilidad = { referencia: lineaRps.CodArticle, pedido: lineaRps.CodOrder, linea: lineaRps.IDOrderLine, of: lineaRps.of_ };
  const { medidas, motivos } = leerMedidas420150(lineaRps.descripcion);
  if (!codigoAssa(lineaRps.CodArticle)?.startsWith('420150-')) motivos.push('La referencia no pertenece a la familia 420150.');
  if (!String(lineaRps.of_ ?? '').trim()) motivos.push('Falta la OF de RPS.');
  if (!Number.isSafeInteger(lineaRps.cantidad) || lineaRps.cantidad <= 0) motivos.push('La cantidad debe ser un entero positivo de RPS.');
  const material = { nombre: 'PLASTEL 8800 TE62 negra', anchoRolloMm: 2040, permitirEmpates: false, permitirGiro: false };
  if (motivos.length) return { estado: 'a-mano', motivos, trazabilidad, medidas, material, programas: [] };
  const { NB, NH, NT } = medidas, largo = NB + 2 * NH + 2, ancho = NT + 66;
  const pieza = { tipo: 'pano', medidasMm: [largo, ancho], contorno: [[0, 0], [largo, 0], [largo, ancho], [0, ancho]],
    entidades: entidadesPano(medidas, largo, ancho) };
  const cantidadCortada = completarConjuntosDe3 ? Math.ceil(lineaRps.cantidad / 3) * 3 : lineaRps.cantidad;
  const programas = [], conjuntos = Math.floor(cantidadCortada / 3), sueltas = cantidadCortada % 3;
  if (conjuntos) programas.push(programa(pieza, 3, conjuntos, trazabilidad));
  if (sueltas) programas.push(programa(pieza, sueltas, 1, trazabilidad));
  return { estado: 'generado', alcance: 'solo-panos', motivos: [], trazabilidad, medidas, material,
    cantidadPedida: lineaRps.cantidad, cantidadCortada, extraStock: cantidadCortada - lineaRps.cantidad,
    completarConjuntosDe3, terminadoMm: [largo - 10, NT], pieza, programas };
}

/** El conjunto completo queda retenido mientras no se confirme el despiece de accesorios. */
export function generar420150(lineaRps, opciones = {}) {
  const panos = generarPanos420150(lineaRps, opciones);
  return { estado: 'a-mano', aptoFabricacion: false, trazabilidad: panos.trazabilidad, panos,
    motivos: [...panos.motivos, 'Canalones y refuerzos separados: forma, reparto y cantidad por envolvente pendientes de confirmar (Q-ASSA-F1-01).'] };
}
