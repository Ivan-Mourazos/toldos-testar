// Ajuste de lectura por ventana. El modelo conserva sus contornos, capas y anidado.
import { escribirDxfPlano } from './presentacion.js';
import { leerPlanoTexto, presentacionesDxf, enZona } from '../../flujoDwg/planoDxf.js';
import { prepararGrupo, colocar, segmentos, ejeCota, limites } from './rotulosImpresion.js';
import { auditarDxf } from './auditoriaPlano.js';
import { anchoArial } from './texto.js';

const dentro = (x, y, z) => x >= z.x0 - 1e-6 && x <= z.x1 + 1e-6 && y >= z.y0 - 1e-6 && y <= z.y1 + 1e-6;
const igual = (a, b) => Math.abs(a - b) < 2e-6;
const coincide = (t, p) => p.tipo === 'texto' && !p.deCota && p.capa === t.capa && p.valor === t.valor && igual(t.x, p.punto[0]) && igual(t.y, p.punto[1]);
// La vista previa y el PDF piden a menudo el mismo plano. Caché acotada, por entrada completa y sin referencias compartidas.
const recientes = new Map();

// Los cruces identifican la línea atravesada; el texto se recupera por su caja en papel.
export function handlesRotulosMarcados(auditoria) {
  return new Set(auditoria.hojas.flatMap(h => {
    const cajas = [...h.cruces.map(c => c.caja), ...h.solapes.flatMap(s => [s.a, s.b]), ...h.recortes];
    return h.textos.filter(t => cajas.some(c => c.texto === t.texto && ['x0', 'x1', 'y0', 'y1'].every(k => igual(c[k], t.caja[k])))).map(t => t.handle);
  }));
}

/** Opciones expresas: las familias no participantes siguen llamando al escritor histórico. */
export function escribirPlanoImpreso(plano, cabecera, opciones = {}) {
  if (opciones.familia === 'puertas') return resolverPlano(plano, cabecera, opciones);
  const clave = JSON.stringify([plano, cabecera, opciones]), guardado = recientes.get(clave);
  if (guardado) {
    recientes.delete(clave); recientes.set(clave, guardado);
    Object.assign(plano, structuredClone(guardado.copia));
    return structuredClone(guardado.resultado);
  }
  const candidatos = []; let error;
  for (const variante of ['auto', 'lado144', 'lado', 'debajo64', 'debajo80', 'debajo40']) {
    try {
      const copia = structuredClone(plano), resultado = resolverPlano(copia, cabecera, { ...opciones, variante });
      const a = auditarDxf(resultado.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
      if (a.hojas.some(h => h.solapes.length || h.cruces.length || h.recortes.length || h.encimaCajetin.length)) continue;
      const ts = a.hojas.flatMap(h => h.textos).filter(t => t.ventana && t.capa !== 'ROTULADOR');
      const minimo = Math.min(...ts.map(t => t.alturaMm)), media = ts.reduce((s, t) => s + Math.min(3, t.alturaMm), 0) / ts.length;
      const limiteCorte = (copia.zonas.corte.x0 + copia.zonas.toldos.x1) / 2;
      const dibujo = Math.min(...copia.hojas.flatMap(h => Object.values(h.ventanas)).filter(v => (v.z.x0 + v.z.x1) / 2 < limiteCorte).map(v => v.escala));
      candidatos.push({ copia, resultado, minimo, media, dibujo });
      if (minimo >= 2.15) break;
    } catch (e) { error = e; }
  }
  if (!candidatos.length) throw error ?? Error('No hay una disposición A4 sin colisiones');
  // Una ganancia marginal de letra no justifica reducir el alzado a una miniatura.
  const maxDibujo = Math.max(...candidatos.map(c => c.dibujo));
  const mejor = candidatos.filter(c => c.dibujo >= .8 * maxDibujo).sort((a, b) => Math.abs(b.minimo - a.minimo) > .1
    ? b.minimo - a.minimo : b.dibujo - a.dibujo || b.media - a.media)[0];
  recientes.set(clave, structuredClone({ copia: mejor.copia, resultado: mejor.resultado }));
  if (recientes.size > 8) recientes.delete(recientes.keys().next().value);
  Object.assign(plano, mejor.copia);
  return mejor.resultado;
}

function resolverPlano(plano, cabecera, { familia = 'toldos', conservarDisposicion = false, variante = 'auto', usarHojaCompleta = false } = {}) {
  const inicial = escribirDxfPlano(plano, cabecera);
  const modelo = leerPlanoTexto(inicial.dxf), originales = presentacionesDxf(inicial.dxf);
  const bandasCorte = plano.gruposCorte ? plano.gruposCorte.toSorted((a, b) => b.y1 - a.y1).reduce((zs, z) => {
    const previo = zs.at(-1);
    if (previo && z.y1 >= previo.y0) { previo.y0 = Math.min(previo.y0, z.y0); previo.y1 = Math.max(previo.y1, z.y1); }
    else zs.push({ ...z });
    return zs;
  }, []) : null;
  const textos = [...plano.textos ?? [], ...plano.corte.textos ?? []];
  const cotas = [...plano.cotas ?? [], ...plano.corte.cotas ?? []];
  const marcados = familia === 'puertas' && !usarHojaCompleta ? handlesRotulosMarcados(auditarDxf(inicial.dxf, { capasTextosExcluidas: ['ROTULADOR'] })) : new Set();
  const moviles = new Set(), glifosMoviles = new Set();
  // La vista histórica gira ciertos rótulos del corte al escribir. Conservamos esa dirección en el modelo.
  for (const t of textos) {
    const p = modelo.modelo.find(p => coincide(t, p));
    if (p) t.giro = p.giro;
  }
  let actual;
  for (const p of modelo.modelo) {
    if (p.tipo === 'cota') actual = cotas.find(c => c.capa === p.capa && c.estilo === p.estilo
      && igual(c.x1, p.a[0]) && igual(c.y1, p.a[1]) && igual(c.x2, p.b[0]) && igual(c.y2, p.b[1]));
    else if (actual && p.tipo === 'texto' && p.deCota) {
      if (actual.giro === 90 && !actual.textoHorizontal) actual.textoGirado = ((p.giro % 360) + 360) % 360 === 270;
      if (marcados.has(p.handle)) { moviles.add(actual); glifosMoviles.add(p.handle); actual.alturaTexto = p.h; actual.huecoTexto = true; }
    }
  }
  const ids = new WeakMap(); let siguiente = 0;
  const id = p => { if (!ids.has(p)) ids.set(p, ++siguiente); return ids.get(p); };
  const grupos = new Map(), paginas = [];
  const idsPrimera = [...new Map(originales[0].primitivas.filter(p => p.recorte).map(p => [p.recorte.id, p.recorte])).keys()];
  for (const [i, h] of originales.entries()) {
    let vs = [...new Map(h.primitivas.filter(p => p.recorte).map(p => [p.recorte.id, p.recorte])).values()]
      .map((v, k) => ({ ...v, id: idsPrimera[k] ?? 2 + k }));
    if (bandasCorte) {
      const r = plano.areaCorte, alto = (r.y1 - r.y0 - 3 * (bandasCorte.length - 1)) / bandasCorte.length;
      vs = [...vs.filter(v => v.modelo[0] < (plano.zonas.corte.x0 + plano.zonas.toldos.x1) / 2),
        ...bandasCorte.map((z, k) => ({ id: k ? 6 + k : 4, modelo: [(z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2], zona: z, giro: 0,
          ancho: r.x1 - r.x0, alto, centro: [(r.x0 + r.x1) / 2, r.y1 - alto / 2 - k * (alto + 3)] }))];
    }
    const vistas = vs.map(v => {
      const corte = v.modelo[0] > (plano.zonas.corte.x0 + plano.zonas.toldos.x1) / 2;
      const zonasCorte = bandasCorte ?? (plano.zonas.cortes?.length ? plano.zonas.cortes : [plano.zonas.corteReal ?? plano.zonas.corte]);
      const distancia = z => Math.hypot(v.modelo[0] - (z.x0 + z.x1) / 2, v.modelo[1] - (z.y0 + z.y1) / 2);
      const z = corte ? zonasCorte.toSorted((a, b) => distancia(a) - distancia(b))[0] : v.zona;
      const pool = corte ? plano.corte : plano;
      const ts = (pool.textos ?? []).filter(t => dentro(t.x, t.y, z));
      const qs = (pool.cotas ?? []).filter(c => dentro((c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2, z));
      const visibles = modelo.modelo.filter(p => modelo.imprime(p) && enZona(p, z));
      const fijos = visibles.filter(p => p.tipo === 'texto' && (p.deCota ? familia === 'puertas' && !glifosMoviles.has(p.handle) : !ts.some(t => coincide(t, p))));
      const clave = `${corte}:${ts.map(id)}:${qs.map(id)}:${fijos.map(p => p.handle)}`;
      let g = grupos.get(clave);
      const area = { ancho: v.ancho, alto: v.alto, centro: v.centro };
      if (!g) {
        const lineas = visibles.flatMap(p => segmentos(p, .0002)).map(p => ({ capa: p.capa, x1: p.a[0], y1: p.a[1], x2: p.b[0], y2: p.b[1] }));
        const entidades = { lineas, polilineas: [], arcos: [], circulos: [], textos: ts, cotas: qs, fijos };
        g = { nombre: `${h.nombre} · ${v.id}`, corte, sinTitulo: true, interiores: corte, cabecerasAmpliadas: true, cotasFijas: familia === 'puertas', margenPapel: 6,
          ...(familia === 'toldos' ? { cercaPrimero: true, enlacesSinCruces: true, interioresObligatorios: corte,
            factoresTexto: [1, .92, .84, .76, .68, .6, .52, .44, .36, .28, .2, .15, .1, .075, .05, .03, .02, .01] } : {}),
          ...(familia === 'puertas' ? { cotasRecolocables: qs.filter(c => moviles.has(c)), interioresObligatorios: corte,
            factoresTexto: [1, .92, .84, .76, .68, .6, .52, .44, .36, .28, .2, .15, .1, .075, .05, .03, .02, .01] } : {}),
          ...(familia === 'puertas' && !corte ? { anchoRotulosDibujo: area.ancho - 12, notasSinReferencia: true, margenPapel: 2 } : {}),
          ...(usarHojaCompleta ? { anchoRotulosCorte: 100 } : {}),
          ...(conservarDisposicion ? { giroFijo: v.giro } : {}), entidades, area, original: v };
        if (corte) g.banda = {
          y0: Math.max(-Infinity, ...zonasCorte.filter(a => a !== z && a.y1 < z.y0).map(a => (a.y1 + z.y0) / 2)),
          y1: Math.min(Infinity, ...zonasCorte.filter(a => a !== z && a.y0 > z.y1).map(a => (a.y0 + z.y1) / 2)) };
        grupos.set(clave, g);
      }
      return { grupo: g, area, id: v.id };
    });
    paginas.push({ ...plano.hojas?.[i], zona: plano.hojas?.[i]?.zona ?? plano.zonas.toldos, nombre: plano.hojas?.[i]?.nombre ?? h.nombre, vistas });
  }
  if (usarHojaCompleta) for (const h of paginas) {
    for (const v of h.vistas) v.area = { ancho: 276, alto: 65, centro: [148.5, v.grupo.corte ? 80.5 : 159.5] };
    h.textos = [{ valor: h.nombre, x: 10, y: 199, h: 2.4, ancho: 276 }, { valor: 'CORTE', x: 10, y: 122, h: 2.4, ancho: 276 }];
  }
  if (familia === 'toldos') for (const h of paginas) {
    const cs = h.vistas.filter(v => v.grupo.corte), d = h.vistas.find(v => !v.grupo.corte);
    const zs = cs.map(v => limites(v.grupo.entidades));
    if (!d) continue;
    if (variante.startsWith('lado')) {
      const anchoDibujo = variante === 'lado144' ? 138 : 196, anchoCorte = 270 - anchoDibujo;
      d.area = { ancho: anchoDibujo, alto: 151, centro: [10.5 + anchoDibujo / 2, 118.5] };
      cs.forEach((v, i) => { const alto = (151 - 4 * (cs.length - 1)) / cs.length;
        v.area = { ancho: anchoCorte, alto, centro: [16.5 + anchoDibujo + anchoCorte / 2, 194 - (i + .5) * (alto + 4) + 2] }; });
      continue;
    }
    if (variante === 'auto' && !zs.some(z => (z.x1 - z.x0) / (z.y1 - z.y0) > 3.2)) continue;
    const ancho = (276 - 6 * (cs.length - 1)) / cs.length;
    const alto = variante.startsWith('debajo') ? Number(variante.slice(6))
      : Math.min(76, Math.max(40, Math.ceil(Math.max(...zs.map(z => ancho * (z.y1 - z.y0) / (z.x1 - z.x0))) + 14)));
    d.area = { ancho: 276, alto: 151 - alto - 6, centro: [148.5, 194 - (151 - alto - 6) / 2] };
    cs.forEach((v, i) => { v.area = { ancho, alto, centro: [10.5 + ancho / 2 + i * (ancho + 6), 43 + alto / 2] }; });
  }
  if (familia === 'toldos') {
    for (const h of paginas) {
      const cs = h.vistas.filter(v => v.grupo.corte), x0 = Math.min(...cs.map(v => v.area.centro[0] - v.area.ancho / 2));
      const x1 = Math.max(...cs.map(v => v.area.centro[0] + v.area.ancho / 2)), top = Math.max(...cs.map(v => v.area.centro[1] + v.area.alto / 2));
      const valor = cabecera.tituloCorte || 'CORTE', ancho = x1 - x0;
      let filas = 1, linea = '';
      for (const palabra of valor.split(/\s+/)) {
        if (linea && anchoArial(`${linea} ${palabra}`, 2.2) > ancho) { filas++; linea = palabra; }
        else linea += (linea ? ' ' : '') + palabra;
      }
      const reserva = filas * 2.2 * 1.4 + 2;
      for (const v of cs) if (v.area.centro[1] + v.area.alto / 2 > top - 1) v.area = { ...v.area,
        alto: Math.max(12, v.area.alto - reserva), centro: [v.area.centro[0], v.area.centro[1] - reserva / 2] };
      h.textos = [{ valor: h.nombre, x: 10, y: 199, h: 2.4, ancho: 276 }, { valor, x: x0, y: top, h: 2.2, ancho }];
    }
  }
  for (const g of grupos.values()) {
    const opciones = paginas.flatMap(h => h.vistas.filter(v => v.grupo === g).map(v => v.area));
    const z = limites(g.entidades), escala = a => Math.max(Math.min(a.ancho / (z.x1 - z.x0), a.alto / (z.y1 - z.y0)),
      g.corte ? Math.min(a.ancho / (z.y1 - z.y0), a.alto / (z.x1 - z.x0)) : 0);
    g.area = opciones.toSorted((a, b) => escala(a) - escala(b))[0];
  }
  for (const g of grupos.values()) g.vista = prepararGrupo(g, g.area);
  // Tras preparar las alturas se reconstruyen las líneas de cota con su hueco real.
  const preparado = leerPlanoTexto(escribirDxfPlano(plano, cabecera).dxf), lineas = [];
  actual = null;
  const error = .01 / Math.max(...[...grupos.values()].map(g => g.vista.escala));
  for (const p of preparado.modelo) {
    if (p.tipo === 'cota') {
      actual = cotas.find(c => c.capa === p.capa && c.estilo === p.estilo && igual(c.x1, p.a[0]) && igual(c.y1, p.a[1]) && igual(c.x2, p.b[0]) && igual(c.y2, p.b[1]));
      continue;
    }
    if (!preparado.imprime(p) || p.capa === 'RECUADROS') continue;
    for (const l of segmentos(p, error)) {
      if (p.deCota && actual && (familia !== 'puertas' || moviles.has(actual))) {
        const e = ejeCota(actual), cruz = q => (q[0] - e.origen[0]) * e.u[1] - (q[1] - e.origen[1]) * e.u[0];
        if (Math.abs(cruz(l.a)) < 1e-5 && Math.abs(cruz(l.b)) < 1e-5) continue;
      }
      lineas.push({ ...l, capa: ['CUTTER', 'DISCO2'].includes(l.capa) ? 'DISCO1' : l.capa, cota: p.deCota ? actual : null });
    }
  }
  for (const c of cotas.filter(c => c.capa !== 'vent-pre-noimpr' && (familia !== 'puertas' || moviles.has(c)))) {
    const e = ejeCota(c); lineas.push({ tipo: 'raya', capa: 'cotas', deCota: true, a: e.origen, b: e.punto(e.largo), cota: c, esBase: true });
  }
  for (const g of grupos.values()) colocar(g.vista, lineas, plano);
  if (familia === 'toldos' || usarHojaCompleta) plano.presentacion = { ventanas: {}, textos: [] };
  plano.hojas = paginas.map(({ vistas, ...h }) => ({ ...h, ventanas: Object.fromEntries(vistas.map(({ grupo: g, area, id }) => {
    const v = g.vista, z = v.zona, w = v.giro ? z.y1 - z.y0 : z.x1 - z.x0, alto = v.giro ? z.x1 - z.x0 : z.y1 - z.y0;
    const escala = Math.min(v.escala, .96 * Math.min(area.ancho / w, area.alto / alto));
    return [id, { z, giro: v.giro, escala, centro: area.centro, ancho: w * escala, alto: alto * escala }];
  })) }));
  plano.soloVentanasDeclaradas = true;
  const resultado = escribirDxfPlano(plano, cabecera), primera = paginas[0];
  const dibujo = primera.vistas.find(v => !v.grupo.corte), corte = primera.vistas.find(v => v.grupo.corte);
  return { ...resultado, ventanas: plano.hojas[0].ventanas,
    reparto: corte.area.centro[0] - corte.area.ancho / 2 >= dibujo.area.centro[0] + dibujo.area.ancho / 2 - 1 ? 'al lado' : 'debajo' };
}
