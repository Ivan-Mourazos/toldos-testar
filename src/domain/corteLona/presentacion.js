// Devuelve el plano de confección como DXF 2018 sobre la presentación de la oficina.
// (AUTOCAD\CAJETIN.dwg pasado a DXF con ODA: plantilla-cajetin.dxf). En la presentación A4 solo se
// rellenan los campos del cajetín y se encuadran las dos ventanas (toldo arriba, corte abajo); el
// dibujo va en el modelo, en metros. Iván, 19/10/2026: «es una plantilla que tenemos en las
// presentaciones y solo se editan los campos».
import { leerPlantilla } from './plantillas.js';
import { ALTO_CAJETIN, SITIO_CAJETIN, anadirCajetin } from './cajetin.js';
import { anchoArial } from './texto.js';

const MODELO = '1F';   // *Model_Space en la plantilla
const PAPEL = 'E4D4';  // *Paper_Space (presentación A4) en la plantilla
// Capas del bot que no trae la plantilla.
const CAPAS_BOT = [{ nombre: 'DISCO1', color: 7 }, { nombre: 'ROTULADOR', color: 1 }];

/**
 * plano: { lineas, polilineas, textos, zonas: { toldos, corte } } en metros (de dibujarPlano).
 * cabecera: { pedido, of, cliente, tecnico, revisor, fecha, pagina, material }.
 */
export function escribirDxfPlano(plano, cabecera) {
  let src = leerPlantilla('presentacion-a4.dxf');
  // Modelo en metros; la presentación conserva sus medidas en mm de papel.
  src = src.replace(/(\$INSUNITS\n 70\n)\s*\d+/, '$1     6');
  let handle = parseInt(/\$HANDSEED\n\s*5\n([0-9A-F]+)/.exec(src)[1], 16);
  const nuevo = () => (handle++).toString(16).toUpperCase();
  const n = (v) => Number(v).toFixed(6);

  const capasNuevas = CAPAS_BOT.filter((c) => !new RegExp(`\\n  2\\n${c.nombre}\\n`).test(src));
  const registros = capasNuevas.map((c) => `  0\nLAYER\n  5\n${nuevo()}\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\n${c.nombre}\n 70\n     0\n 62\n${String(c.color).padStart(6)}\n  6\nContinuous\n370\n    -3\n390\nF\n`).join('');
  if (registros) src = insertarEnTabla(src, 'LAYER', registros, capasNuevas.length);

  // Cajetín nuevo (bloque CAJETIN WEB con todos los datos del pedido, revisor incluido).
  const { src: conCajetin, insercion: cajetin } = anadirCajetin(src, nuevo, PAPEL, {
    PEDIDO: cabecera.pedido, OF: cabecera.of, CLIENTE: cabecera.cliente, MATERIAL: cabecera.material,
    TECNICO: cabecera.tecnico, REVISOR: cabecera.revisor, FECHA: cabecera.fecha,
    HOJA: cabecera.pagina || '1/1', SUBTITULO: cabecera.subtitulo
  });
  src = conCajetin;

  // Reparto de la A4 (Iván: que el dibujo y el corte se vean lo más grandes posible). Encima del
  // cajetín se prueba el corte debajo del toldo (a todo el ancho) o al lado (a la derecha), con todos
  // los tamaños, y se queda el que deja el toldo más grande sin que el corte quede a menos de 2/3 de
  // su escala (escala = mm de papel por metro de dibujo).
  const A4 = { x0: 10, x1: 287.1, y0: SITIO_CAJETIN[1] + ALTO_CAJETIN + 3, y1: 199.9 };
  const TITULO_CORTE = 9;   // sitio para el título del corte y la raya
  // El corte se puede poner girado 90° si así se ve más grande (Iván, 19/10/2026): se prueban las dos.
  const zt = plano.zonas.toldos;
  const zNormal = plano.zonas.corte;
  const [ccx, ccy] = [(zNormal.x0 + zNormal.x1) / 2, (zNormal.y0 + zNormal.y1) / 2];
  const [mw, mh] = [(zNormal.x1 - zNormal.x0) / 2, (zNormal.y1 - zNormal.y0) / 2];
  // Girado, el corte se aparta a la derecha de los toldos para que ninguna ventana vea la otra zona.
  const apartar = Math.max(0, zt.x1 + 10 - (ccx - mh));
  const zGirada = { x0: ccx - mh + apartar, x1: ccx + mh + apartar, y0: ccy - mw, y1: ccy + mw };
  const escala = (z, r) => Math.min((r.x1 - r.x0) / (z.x1 - z.x0), (r.y1 - r.y0) / (z.y1 - z.y0));
  const repartos = [];
  for (const [girado, zcp] of [[false, zNormal], [true, zGirada]]) {
    for (let h = 25; h <= A4.y1 - A4.y0 - TITULO_CORTE - 60; h += 0.5) {
      const corte = { x0: A4.x0, y0: A4.y0, x1: A4.x1, y1: A4.y0 + h };
      repartos.push({ girado, zc: zcp, corte, toldo: { x0: A4.x0, y0: corte.y1 + TITULO_CORTE, x1: A4.x1, y1: A4.y1 }, raya: [[A4.x0, corte.y1 + 7], [A4.x1, corte.y1 + 7]] });
    }
    for (let w = 60; w <= A4.x1 - A4.x0 - 100; w += 0.5) {
      const corte = { x0: A4.x1 - w, y0: A4.y0, x1: A4.x1, y1: A4.y1 - TITULO_CORTE };
      repartos.push({ girado, zc: zcp, corte, toldo: { x0: A4.x0, y0: A4.y0, x1: corte.x0 - 4, y1: A4.y1 }, raya: [[corte.x0 - 2, A4.y0], [corte.x0 - 2, A4.y1]] });
    }
  }
  // A igual nota se prefiere el corte sin girar, como va en el rollo.
  const nota = (r) => Math.min(escala(zt, r.toldo), 1.5 * escala(r.zc, r.corte)) * (r.girado ? 0.98 : 1);
  const reparto = repartos.reduce((a, b) => (nota(b) > nota(a) + 1e-9 ? b : a));
  const zc = reparto.zc;
  // Corte girado 90° alrededor del centro de su zona (solo en el plano; el DXF del bot va sin girar).
  const girar = ([x, y]) => [ccx - (y - ccy) + apartar, ccy + (x - ccx)];
  // Los textos nunca cabeza abajo: horizontales o verticales leyendo de abajo arriba (van centrados).
  const legible = (g) => ({ 180: 0, 270: 90 })[g] ?? g;
  const corte = !reparto.girado ? plano.corte : {
    lineas: plano.corte.lineas.map((l) => { const [a, b] = girar([l.x1, l.y1]), [c, d] = girar([l.x2, l.y2]); return { ...l, x1: a, y1: b, x2: c, y2: d }; }),
    polilineas: plano.corte.polilineas.map((p) => ({ ...p, puntos: p.puntos.map(girar) })),
    textos: plano.corte.textos.map((t) => { const [x, y] = girar([t.x, t.y]); return { ...t, x, y, giro: legible(((t.giro || 0) + 90) % 360) }; })
  };
  // La ventana del corte, sin más alto ni ancho del que usa a su escala.
  const ec = escala(zc, reparto.corte);
  const rc = reparto.corte;
  if (rc.x0 === A4.x0) rc.y1 = rc.y0 + Math.max(25, (zc.y1 - zc.y0) * ec);
  else rc.y0 = rc.y1 - (zc.y1 - zc.y0) * ec;
  if (rc.x0 === A4.x0) { reparto.toldo.y0 = rc.y1 + TITULO_CORTE; reparto.raya = [[A4.x0, rc.y1 + 7], [A4.x1, rc.y1 + 7]]; }
  const encuadre = (z, r) => ({ z, centro: [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2], ancho: r.x1 - r.x0, alto: r.y1 - r.y0 });
  const ventanas = { 2: encuadre(zt, reparto.toldo), 3: encuadre(zc, rc) };

  // Entidades de la presentación: fuera el cajetín viejo, MATERIALES, EMPATE y la tabla suelta;
  // las ventanas se recolocan y encuadran.
  const ini = src.indexOf('\nENTITIES\n') + '\nENTITIES\n'.length;
  const fin = src.indexOf('  0\nENDSEC\n', ini);
  const trozos = src.slice(ini, fin).split(/(?=^ {2}0\n)/m).filter(Boolean);
  const viejo = trozos.map((t) => /^ {2}0\nINSERT\n[\s\S]*?\n {2}2\nCAJETIN\n/.test(t) && /\n {2}5\n([0-9A-F]+)\n/.exec(t)[1]).find(Boolean);
  const entidades = trozos.flatMap((t) => {
    const tipo = /^ {2}0\n([^\n]+)/.exec(t)[1];
    if (tipo === 'ACAD_TABLE') return [];
    if (/\n {2}5\n([0-9A-F]+)\n/.exec(t)[1] === viejo) return [];
    if (['ATTRIB', 'SEQEND'].includes(tipo) && new RegExp(`\\n330\\n${viejo}\\n`).test(t)) return [];
    if (tipo === 'MTEXT' && /MATERIALES/.test(t)) return [];
    if (tipo === 'TEXT' && /EMPATE:/.test(t)) return [];
    if (tipo === 'VIEWPORT') {
      const id = Number(/\n 69\n\s*(\d+)/.exec(t)?.[1]);
      const v = ventanas[id];
      if (v) {
        const z = v.z;
        const altoVista = Math.max(z.y1 - z.y0, (z.x1 - z.x0) * v.alto / v.ancho) * 1.03;
        let r = poner(t, '10', n(v.centro[0]));
        r = poner(r, '20', n(v.centro[1]));
        r = poner(r, '40', n(v.ancho));
        r = poner(r, '41', n(v.alto));
        r = poner(r, '12', n((z.x0 + z.x1) / 2));
        r = poner(r, '22', n((z.y0 + z.y1) / 2));
        r = poner(r, '45', n(altoVista));
        return [r];
      }
    }
    return [t];
  });
  // En el papel: título del corte y una raya fina entre el corte y el toldo.
  const papel = (tipo, color, sub, cuerpo) => `  0\n${tipo}\n  5\n${nuevo()}\n330\n${PAPEL}\n100\nAcDbEntity\n 67\n     1\n  8\ntexto\n 62\n${String(color).padStart(6)}\n100\n${sub}\n${cuerpo}`;
  const insercion = cajetin
    + papel('LWPOLYLINE', 8, 'AcDbPolyline', ` 90\n     2\n 70\n     0\n 43\n0.0\n${reparto.raya.map(([x, y]) => ` 10\n${n(x)}\n 20\n${n(y)}\n`).join('')}`)
    + papel('TEXT', 7, 'AcDbText', ` 10\n${n(rc.x0)}\n 20\n${n(rc.y1 + 2)}\n 30\n0.0\n 40\n${n(Math.min(2.2, (rc.x1 - rc.x0) / anchoArial(cabecera.tituloCorte || 'CORTE', 1)))}\n  1\n${cabecera.tituloCorte || 'CORTE'}\n  7\narial\n100\nAcDbText\n`);

  // Dibujo en el modelo.
  const ent = (tipo, capa, sub, cuerpo) => `  0\n${tipo}\n  5\n${nuevo()}\n330\n${MODELO}\n100\nAcDbEntity\n  8\n${capa}\n100\n${sub}\n${cuerpo}`;
  let modelo = '';
  const lineas = [...plano.lineas, ...corte.lineas];
  const polilineas = [...plano.polilineas, ...corte.polilineas];
  const textos = [...plano.textos, ...corte.textos];
  for (const l of lineas) modelo += ent('LINE', l.capa, 'AcDbLine', ` 10\n${n(l.x1)}\n 20\n${n(l.y1)}\n 30\n0.0\n 11\n${n(l.x2)}\n 21\n${n(l.y2)}\n 31\n0.0\n`);
  for (const p of polilineas) {
    modelo += ent('LWPOLYLINE', p.capa, 'AcDbPolyline', ` 90\n${String(p.puntos.length).padStart(6)}\n 70\n${p.cerrada ? '     1' : '     0'}\n 43\n0.0\n${p.puntos.map(([x, y]) => ` 10\n${n(x)}\n 20\n${n(y)}\n`).join('')}`);
  }
  // Textos como MTEXT anclado por el centro (71 = 5): AutoCAD lo coloca al mostrarlo. Con TEXT
  // centrado hay que dar también la posición de inicio, y AutoCAD la usa tal cual (salían corridos).
  for (const t of textos) {
    const a = ((t.giro || 0) * Math.PI) / 180;
    const ancla = t.centrado ? 5 : 7;   // 5 centro; 7 abajo a la izquierda
    modelo += ent('MTEXT', t.capa, 'AcDbMText', ` 10\n${n(t.x)}\n 20\n${n(t.y)}\n 30\n0.0\n 40\n${n(t.h)}\n 41\n0.0\n 71\n     ${ancla}\n 72\n     1\n  1\n${t.valor}\n  7\narial\n 11\n${n(Math.cos(a))}\n 21\n${n(Math.sin(a))}\n 31\n0.0\n 73\n     1\n 44\n1.0\n`);
  }

  src = src.slice(0, ini) + entidades.join('') + insercion + modelo + src.slice(fin);
  src = src.replace(/(\$HANDSEED\n\s*5\n)[0-9A-F]+/, `$1${handle.toString(16).toUpperCase()}`);

  // La conversión a DWG queda para el servidor en la fase 2.
  return { dxf: src.replace(/\n/g, '\r\n'), reparto: `${reparto.corte.x0 === A4.x0 ? 'debajo' : 'al lado'}${reparto.girado ? ', girado' : ''}`, ventanas };
}

// Cambia el primer valor de un código de grupo dentro de una entidad.
function poner(trozo, codigo, valor) {
  const re = new RegExp(`(\\n${codigo.padStart(3)}\\n)[^\\n]*`);
  return re.test(trozo) ? trozo.replace(re, `$1${valor}`) : trozo;
}

function insertarEnTabla(src, tabla, registros, cuantos) {
  const ini = src.indexOf(`\n  2\n${tabla}\n`);
  const fin = src.indexOf('\n  0\nENDTAB\n', ini);
  const cabecera = src.slice(ini, fin).replace(/(AcDbSymbolTable\n 70\n)\s*(\d+)/, (_, a, num) => `${a}${String(Number(num) + cuantos).padStart(6)}`);
  return src.slice(0, ini) + cabecera + '\n' + registros.replace(/\n$/, '') + src.slice(fin);
}
