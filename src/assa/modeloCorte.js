import catalogo from './catalogoModelos.json' with { type: 'json' };
import { codigoAssa } from './leerCorte.js';
import { calcularFamilia, esTecho, piezaConAlto, piezaDePlantilla } from './faseA.js';
import { canalonDe } from './canalon.js';
import { calcularCortina410 } from './cortinas410.js';

export const CANALON_SIN_PLANTILLA = 'Canalón a mano: falta un juego de plantilla inequívoco para esta referencia y sus medidas.';
const requiereCanalon = familia => ['420150', '430127', '430129', '430172'].includes(familia);
const iguales = (a, b, tolerancia = 1) => a.every((n, i) => Math.abs(n - b[i]) <= tolerancia);
const precision = n => Math.round(n * 10) / 10;
const distancia = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

function masCercanos(cuerpos, puntuar) {
  const ordenados = cuerpos.map(c => ({ cuerpo: c, distancia: puntuar(c) })).sort((a, b) => a.distancia - b.distancia);
  return ordenados.filter(c => c.distancia === ordenados[0].distancia).map(c => c.cuerpo);
}

function operacionesUnicas(operaciones) {
  const clave = p => {
    if (p.tipo === 'arco') return JSON.stringify([p.capa, p.punto.map(precision), precision(p.r), p.desde % 360,
      (p.hasta - p.desde + 360) % 360 || 360]);
    const extremos = [p.a.map(precision), p.b.map(precision)];
    const invertir = extremos[0][0] > extremos[1][0] || (extremos[0][0] === extremos[1][0] && extremos[0][1] > extremos[1][1]);
    return JSON.stringify([p.capa, ...invertir ? extremos.reverse() : extremos, (invertir ? -1 : 1) * (p.curva ?? 0)]);
  };
  return new Map(operaciones.map(p => [clave(p), p]));
}

function cuerposUnicos(cuerpos) {
  const vistos = new Map();
  for (const cuerpo of cuerpos) {
    const operaciones = operacionesUnicas(cuerpo.operaciones);
    const firma = JSON.stringify([cuerpo.medidasMm.map(precision), [...operaciones.keys()].sort()]);
    if (!vistos.has(firma)) vistos.set(firma, { ...cuerpo, operaciones: [...operaciones.values()] });
  }
  return [...vistos.values()];
}

export function plantillaVigente(ref) {
  return Object.keys(catalogo.plantillasCorte).filter(ruta => ref.fuentes[ruta])
    .sort((a, b) => catalogo.plantillasCorte[b].localeCompare(catalogo.plantillasCorte[a]))[0];
}

export function calcularDesdePlantilla(linea) {
  const codigo = codigoAssa(linea.CodArticle), articulo = catalogo.referencias[codigo];
  if (codigo?.startsWith('410')) return calcularCortina410(linea, codigo);
  if (String(linea.CodArticle ?? '').trim().toUpperCase() === 'MUESTRALONA') {
    return { estado: 'a-mano', motivos: ['Las muestras de lona se preparan a mano.'], avisos: [] };
  }
  const alias = articulo?.corteComo;
  const ref = alias ? catalogo.referencias[alias.codigo] : articulo;
  const medidas = ref?.medidasTerminadas.map(m => m.mm) ?? [];
  const terminados = [...new Map(medidas.map(m => [m.join('|'), m])).values()];
  const terminadoMm = terminados.length === 1 ? terminados[0] : undefined;
  const material = articulo?.materialBase ?? undefined;
  const g = calcularFamilia(linea, { soloMedidas: true, terminadoMm, material, nkValidado: codigo === '420148-0105' });
  const manual = motivo => ({ ...g, estado: 'a-mano', motivos: [...g.motivos, motivo], pieza: undefined, terminadoMm, canalon: null });
  if (!ref) return manual('La referencia no aparece en los archivos de modelos de Combursa.');
  if (articulo.motivoManual) return manual(articulo.motivoManual);
  if (alias && Object.entries(alias.medidas).some(([clave, mm]) => g.medidas[clave] !== mm)) {
    return manual('Las medidas de RPS difieren de las confirmadas por el taller para esta referencia.');
  }
  const fuente = plantillaVigente(ref);
  if (!fuente) return manual('La referencia está inventariada, pero falta un programa de corte identificable en las plantillas de producción.');
  if (g.estado !== 'generado') return g;

  const esperado = g.pieza.medidasMm;
  const candidatos = cuerposUnicos(ref.cuerpos[fuente] ?? []);
  const normal = masCercanos(candidatos.filter(c => iguales(c.medidasMm, esperado)), c => distancia(c.medidasMm, esperado));
  const techoEstrecho = esTecho(g.familia) && g.medidas.NT === 600;
  const reducidos = techoEstrecho ? candidatos.filter(c => iguales(c.medidasMm, [esperado[0], 680])) : [];
  const familiaConMargen = esTecho(g.familia) ? 50 : 10;
  const acabado = c => [c.medidasMm[0] - familiaConMargen, (techoEstrecho ? 691 : c.medidasMm[1]) - 66];
  const confirmadoPorMedidas = terminadoMm && iguales(terminadoMm, g.terminadoMm);
  const corroborados = terminadoMm ? candidatos.filter(c =>
    Math.abs(c.medidasMm[1] - esperado[1]) <= 1 && (iguales(acabado(c), terminadoMm) || confirmadoPorMedidas)) : [];
  const seleccion = normal.length ? normal : reducidos.length ? reducidos : corroborados;
  if (seleccion.length > 1) return manual('La plantilla vigente tiene varios cuerpos distintos para esas medidas; falta confirmar cuál corresponde.');
  const cuerpo = seleccion[0];
  // El cuerpo 420150 tiene un patrón confirmado por NB. Cuando el catálogo solo tiene sus medidas terminadas,
  // se puede aplicar ese patrón a la variante sin trasladar agujeros desde otro dibujo.
  const patron = !cuerpo && !candidatos.length && g.familia === '420150' && confirmadoPorMedidas ?
    calcularFamilia(linea, { terminadoMm, material }) : null;
  if (!cuerpo && patron?.estado !== 'generado') return manual(candidatos.length ?
    'El cuerpo de la plantilla vigente tiene otras medidas y falta una ficha que confirme el dibujo aplicable.' :
    'El código está rotulado, pero falta un contorno de cuerpo que se pueda atribuir con esas medidas.');
  if (cuerpo && cuerpo.medidasMm[1] > g.material.anchoRolloMm) return manual('El dibujo de plantilla no cabe en el rollo sin girar ni empatar.');

  const versionesCanalon = ref.canalones.filter(c => c.ruta === fuente && !c.parcial).map(c => c.juego);
  const canalon = requiereCanalon(g.familia) ? canalonDe(codigo, g.medidas.NB, versionesCanalon) : null;
  if (requiereCanalon(g.familia) && !canalon) return manual(versionesCanalon.length ? CANALON_SIN_PLANTILLA :
    'Canalón a mano: no hay un bloque completo atribuido a la referencia en la plantilla vigente.');
  const dibujo = cuerpo ? piezaDePlantilla(cuerpo.medidasMm.map(precision), cuerpo.operaciones) : patron.pieza;
  const pieza = techoEstrecho ? piezaConAlto(dibujo, 691) : dibujo;
  const acabadoDibujo = cuerpo ? (terminadoMm && (iguales(acabado(cuerpo), terminadoMm) || confirmadoPorMedidas) ?
    terminadoMm : acabado(cuerpo).map(precision)) : patron.terminadoMm;
  const avisos = [...g.avisos];
  if (!iguales(pieza.medidasMm, esperado)) avisos.push('Se aplican las medidas del dibujo vigente de la plantilla.');
  return { ...g, avisos, pieza, terminadoMm: acabadoDibujo, canalon,
    fuentePlantilla: { fichero: fuente, rotulo: cuerpo?.rotulo ?? null, ...(alias && { referencia: alias.codigo }) } };
}
