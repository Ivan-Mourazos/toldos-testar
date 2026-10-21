// Lector mínimo de DXF en texto (ASCII) para los análisis de puertas.
// Solo lee: no escribe nada. Devuelve las entidades de ENTITIES y de cada bloque
// con su capa, para poder medir piezas, marcas, cotas y textos de los cortes y
// planos hechos.
import fs from 'node:fs';

const numero = v => Number(String(v).trim());

/** Limpia los códigos de formato de MTEXT (\P, \pxql;, {\f…;}, etc.). */
export function limpiarMtext(valor) {
  return String(valor)
    .replace(/\\P/g, '\n')
    .replace(/\\p[^;]*;/g, '')
    .replace(/\\[ACcFfHhLlOoQqTtWw][^;\\]*;/g, '')
    .replace(/\\[LlOoKk]/g, '')
    .replace(/\\~/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/%%[cC]/g, 'Ø')
    .replace(/%%[dD]/g, '°')
    .replace(/%%[pP]/g, '±')
    .replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .trim();
}

function pares(texto) {
  const ls = texto.split(/\r?\n/);
  const salida = [];
  for (let i = 0; i + 1 < ls.length; i += 2) salida.push([numero(ls[i]), ls[i + 1]]);
  return salida;
}

function crearEntidad(tipo, grupos) {
  const g = c => grupos.find(([k]) => k === c)?.[1];
  const todos = c => grupos.filter(([k]) => k === c).map(([, v]) => v);
  const base = { tipo, capa: String(g(8) ?? '0').trim() };
  switch (tipo) {
    case 'LINE':
      return { ...base, x1: numero(g(10)), y1: numero(g(20)), x2: numero(g(11)), y2: numero(g(21)) };
    case 'LWPOLYLINE': {
      const xs = todos(10).map(numero), ys = todos(20).map(numero);
      return { ...base, cerrada: (numero(g(70) ?? 0) & 1) === 1, puntos: xs.map((x, i) => [x, ys[i]]) };
    }
    case 'TEXT':
    case 'MTEXT': {
      const valor = tipo === 'MTEXT' ? limpiarMtext([...todos(3), ...todos(1)].join('')) : limpiarMtext(g(1) ?? '');
      return { ...base, x: numero(g(10)), y: numero(g(20)), h: numero(g(40) ?? 0), giro: numero(g(50) ?? 0), valor };
    }
    case 'DIMENSION':
      return {
        ...base,
        bloque: String(g(2) ?? '').trim(),
        medida: numero(g(42) ?? NaN),
        texto: limpiarMtext(g(1) ?? ''),
        p1: [numero(g(13) ?? NaN), numero(g(23) ?? NaN)],
        p2: [numero(g(14) ?? NaN), numero(g(24) ?? NaN)],
        linea: [numero(g(10) ?? NaN), numero(g(20) ?? NaN)],
        posTexto: [numero(g(11) ?? NaN), numero(g(21) ?? NaN)],
      };
    case 'INSERT':
      return {
        ...base,
        bloque: String(g(2) ?? '').trim(),
        x: numero(g(10) ?? 0),
        y: numero(g(20) ?? 0),
        sx: numero(g(41) ?? 1),
        sy: numero(g(42) ?? 1),
        giro: numero(g(50) ?? 0),
      };
    case 'ARC':
      return { ...base, x: numero(g(10)), y: numero(g(20)), r: numero(g(40)), desde: numero(g(50)), hasta: numero(g(51)) };
    case 'CIRCLE':
      return { ...base, x: numero(g(10)), y: numero(g(20)), r: numero(g(40)) };
    default:
      return null;
  }
}

/** Lee un DXF y devuelve { entidades, bloques: Map(nombre → entidades) }. */
export function leerDxf(ruta) {
  // Los DXF de ODA (AC1021 en adelante) van en UTF-8; los del bot, en latin1.
  const bruto = fs.readFileSync(ruta);
  const utf8 = bruto.toString('utf8');
  const lista = pares(utf8.includes('\uFFFD') ? bruto.toString('latin1') : utf8);
  const entidades = [];
  const bloques = new Map();
  let seccion = '', bloque = null, tipo = null, grupos = [];
  let polilinea = null;
  const cerrar = () => {
    if (!tipo) return;
    let e = null;
    if (tipo === 'POLYLINE') {
      polilinea = { tipo: 'LWPOLYLINE', capa: String(grupos.find(([k]) => k === 8)?.[1] ?? '0').trim(), cerrada: (numero(grupos.find(([k]) => k === 70)?.[1] ?? 0) & 1) === 1, puntos: [] };
    } else if (tipo === 'VERTEX' && polilinea) {
      polilinea.puntos.push([numero(grupos.find(([k]) => k === 10)?.[1]), numero(grupos.find(([k]) => k === 20)?.[1])]);
    } else if (tipo === 'SEQEND' && polilinea) {
      e = polilinea; polilinea = null;
    } else e = crearEntidad(tipo, grupos);
    if (e) (bloque ? bloque.entidades : seccion === 'ENTITIES' ? entidades : []).push(e);
    tipo = null; grupos = [];
  };
  for (let i = 0; i < lista.length; i++) {
    const [c, v0] = lista[i];
    const v = v0.trim();
    if (c === 0) {
      cerrar();
      if (v === 'SECTION') { seccion = String(lista[i + 1]?.[1] ?? '').trim(); continue; }
      if (v === 'ENDSEC') { seccion = ''; continue; }
      if (seccion === 'BLOCKS' && v === 'BLOCK') {
        const nombre = lista.slice(i + 1, i + 40).find(([k]) => k === 2)?.[1]?.trim() ?? '';
        bloque = { nombre, entidades: [] };
        let j = i + 1;
        while (j < lista.length && lista[j][0] !== 0) j++;
        i = j - 1;
        continue;
      }
      if (seccion === 'BLOCKS' && v === 'ENDBLK') { if (bloque) bloques.set(bloque.nombre, bloque.entidades); bloque = null; continue; }
      if (seccion === 'ENTITIES' || (seccion === 'BLOCKS' && bloque)) tipo = v;
      continue;
    }
    if (tipo) grupos.push([c, v0]);
  }
  cerrar();
  return { entidades, bloques };
}

/** Caja que envuelve una lista de puntos. */
export function caja(puntos) {
  const xs = puntos.map(p => p[0]), ys = puntos.map(p => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
