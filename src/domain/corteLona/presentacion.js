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

  // Los planos de puertas llaman XERA 15 al estilo grande. Se conserva el nombre real sin cambiar
  // XERAL 15, que siguen usando toldos y remolques con la misma plantilla.
  if ([...(plano.cotas ?? []), ...(plano.corte.cotas ?? [])].some(c => c.estilo === 'XERA 15')) {
    const grande = src.match(/ {2}0\nDIMSTYLE\n(?:(?! {2}0\n)[\s\S])*? {2}2\nXERAL 15\n(?:(?! {2}0\n)[\s\S])*/)?.[0];
    if (grande) src = insertarEnTabla(src, 'DIMSTYLE', grande.replace(/(105\n)[^\n]+/, `$1${nuevo()}`).replace('XERAL 15\n', 'XERA 15\n'), 1);
  }

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
  // `corteDerecho`: el corte no se gira en la hoja (remolques: el DWG solo se guarda, Iván 20/10/2026).
  for (const [girado, zcp] of plano.corteDerecho ? [[false, zNormal]] : [[false, zNormal], [true, zGirada]]) {
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
    textos: plano.corte.textos.map((t) => { const [x, y] = girar([t.x, t.y]); return { ...t, x, y, giro: legible(((t.giro || 0) + 90) % 360) }; }),
    // Remolques: esquinas en arco y ollaos (círculos); girados con el corte.
    arcos: (plano.corte.arcos ?? []).map((a) => { const [x, y] = girar([a.x, a.y]); return { ...a, x, y, desde: (a.desde + 90) % 360, hasta: (a.hasta + 90) % 360 || 360 }; }),
    circulos: (plano.corte.circulos ?? []).map((c) => { const [x, y] = girar([c.x, c.y]); return { ...c, x, y }; }),
    // Girada, una cota horizontal pasa a vertical y al revés; su línea de cota gira con ella.
    cotas: (plano.corte.cotas ?? []).map((c) => {
      const [x1, y1] = girar([c.x1, c.y1]), [x2, y2] = girar([c.x2, c.y2]);
      const d = c.giro === 90 ? ccy + (c.d - ccx) : ccx - (c.d - ccy) + apartar;
      return { ...c, x1, y1, x2, y2, d, giro: c.giro === 90 ? 0 : 90 };
    })
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
  // Remolques: arcos (esquinas redondeadas, en grados y antihorario) y círculos (ollaos).
  for (const a of [...(plano.arcos ?? []), ...(corte.arcos ?? [])]) {
    modelo += ent('ARC', a.capa, 'AcDbCircle', ` 10\n${n(a.x)}\n 20\n${n(a.y)}\n 30\n0.0\n 40\n${n(a.r)}\n100\nAcDbArc\n 50\n${n(a.desde)}\n 51\n${n(a.hasta)}\n`);
  }
  for (const c of [...(plano.circulos ?? []), ...(corte.circulos ?? [])]) {
    modelo += ent('CIRCLE', c.capa, 'AcDbCircle', ` 10\n${n(c.x)}\n 20\n${n(c.y)}\n 30\n0.0\n 40\n${n(c.r)}\n`);
  }
  // Textos como MTEXT anclado por el centro (71 = 5): AutoCAD lo coloca al mostrarlo. Con TEXT
  // centrado hay que dar también la posición de inicio, y AutoCAD la usa tal cual (salían corridos).
  for (const t of textos) {
    const a = ((t.giro || 0) * Math.PI) / 180;
    const ancla = t.centrado ? 5 : 7;   // 5 centro; 7 abajo a la izquierda
    modelo += ent('MTEXT', t.capa, 'AcDbMText', ` 10\n${n(t.x)}\n 20\n${n(t.y)}\n 30\n0.0\n 40\n${n(t.h)}\n 41\n0.0\n 71\n     ${ancla}\n 72\n     1\n  1\n${t.valor}\n  7\narial\n 11\n${n(Math.cos(a))}\n 21\n${n(Math.sin(a))}\n 31\n0.0\n 73\n     1\n 44\n1.0\n`);
  }

  // Cotas de verdad, que se seleccionan y se modifican (Iván, 20/10/2026): DIMENSION con los estilos de
  // cota de la plantilla y su bloque ya dibujado como lo dibuja el CAD.
  const cotas = [...(plano.cotas ?? []), ...(corte.cotas ?? [])].map((c, i) => cotaDxf(c, i + 1, nuevo, ent));
  modelo += cotas.map((c) => c.entidad).join('');

  src = src.slice(0, ini) + entidades.join('') + insercion + modelo + src.slice(fin);
  if (cotas.length) {
    src = insertarEnTabla(src, 'BLOCK_RECORD', cotas.map((c) => c.registro).join(''), cotas.length);
    const finBlocks = src.indexOf('  0\nENDSEC\n', src.indexOf('\nBLOCKS\n'));
    src = src.slice(0, finBlocks) + cotas.map((c) => c.bloque).join('') + src.slice(finBlocks);
  }
  src = src.replace(/(\$HANDSEED\n\s*5\n)[0-9A-F]+/, `$1${handle.toString(16).toUpperCase()}`);

  // La conversión a DWG queda para el servidor en la fase 2.
  return { dxf: src.replace(/\n/g, '\r\n'), reparto: `${reparto.corte.x0 === A4.x0 ? 'debajo' : 'al lado'}${reparto.girado ? ', girado' : ''}`, ventanas };
}

// Estilos de cota de la plantilla (los de los DWG de la oficina): dibujo en metros y cota en cm (DIMLFAC
// 100), con coma. Aquí solo lo que hace falta para dibujar su bloque: texto, flecha, prolongación de la
// línea de referencia, su largo fijo y el hueco del texto.
const ESTILOS_COTA = {
  XERAL: { texto: 0.1, flecha: 0.025, prolonga: 0.0175, largo: 0.1, hueco: 0.003 },
  'XERAL 5': { texto: 0.05, flecha: 0.015, prolonga: 0.0175, largo: 0.06, hueco: 0.003 },
  'XERAL 15': { texto: 0.15, flecha: 0.025, prolonga: 0.0175, largo: 0.1, hueco: 0.003 },
  'XERA 15': { texto: 0.15, flecha: 0.025, prolonga: 0.0175, largo: 0.1, hueco: 0.003 },
};
const comaCota = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

/**
 * Una cota horizontal (giro 0) o vertical (giro 90) en metros: de (x1, y1) a (x2, y2), con la línea de cota
 * en `d` (la y si es horizontal, la x si es vertical). `valor` en cm: si no es lo que mide, va escrito.
 */
function cotaDxf(c, numero, nuevo, ent) {
  const e = ESTILOS_COTA[c.estilo] ?? ESTILOS_COTA.XERAL;
  const n = (v) => Number(v).toFixed(6);
  const v = c.giro === 90;
  // Todo se calcula como si fuera horizontal: a lo largo (s) y a lo ancho (t); `xy` lo devuelve al plano.
  const xy = (s, t) => (v ? [t, s] : [s, t]);
  const [s1, t1, s2, t2] = v ? [c.y1, c.x1, c.y2, c.x2] : [c.x1, c.y1, c.x2, c.y2];
  const mide = Math.abs(s2 - s1) * 100;
  const texto = c.valor == null || Math.abs(mide - c.valor) < 0.05 ? comaCota(mide) : comaCota(c.valor);
  const registro = nuevo();
  const nombre = `*D${numero}`;
  const dentro = (tipo, sub, cuerpo) => `  0\n${tipo}\n  5\n${nuevo()}\n330\n${registro}\n100\nAcDbEntity\n  8\n0\n 62\n     0\n100\n${sub}\n${cuerpo}`;
  const linea = (a, b) => dentro('LINE', 'AcDbLine', ` 10\n${n(a[0])}\n 20\n${n(a[1])}\n 30\n0.0\n 11\n${n(b[0])}\n 21\n${n(b[1])}\n 31\n0.0\n`);
  let cuerpo = '';
  // Líneas de referencia: de largo fijo desde la línea de cota hacia lo acotado, y un poco más allá.
  for (const [s, t] of [[s1, t1], [s2, t2]]) {
    const hasta = Math.abs(c.d - t);
    if (hasta < 1e-6) continue;
    const signo = Math.sign(c.d - t);
    cuerpo += linea(xy(s, c.d + signo * e.prolonga), xy(s, c.d - signo * Math.min(e.largo, hasta)));
  }
  const [a, b] = [Math.min(s1, s2), Math.max(s1, s2)];
  for (const [punta, sentido] of [[a, 1], [b, -1]]) {
    const base = punta + sentido * e.flecha;
    const [p1, p2, p3] = [xy(base, c.d + e.flecha / 6), xy(base, c.d - e.flecha / 6), xy(punta, c.d)];
    cuerpo += dentro('SOLID', 'AcDbTrace', ` 10\n${n(p1[0])}\n 20\n${n(p1[1])}\n 30\n0.0\n 11\n${n(p2[0])}\n 21\n${n(p2[1])}\n 31\n0.0\n 12\n${n(p3[0])}\n 22\n${n(p3[1])}\n 32\n0.0\n 13\n${n(p3[0])}\n 23\n${n(p3[1])}\n 33\n0.0\n`);
  }
  // Línea de cota cortada por el texto si cabe; si no, entera y el texto encima.
  const medio = (a + b) / 2, ancho = anchoArial(texto, e.texto) + 2 * e.hueco;
  const cabe = ancho < b - a - 2 * e.flecha;
  if (cabe) cuerpo += linea(xy(a + e.flecha, c.d), xy(medio - ancho / 2, c.d)) + linea(xy(medio + ancho / 2, c.d), xy(b - e.flecha, c.d));
  else cuerpo += linea(xy(a + e.flecha, c.d), xy(b - e.flecha, c.d));
  const tt = cabe ? c.d : c.d + (v ? -1 : 1) * e.texto * 0.8;
  const [tx, ty] = xy(medio, tt);
  cuerpo += dentro('MTEXT', 'AcDbMText', ` 10\n${n(tx)}\n 20\n${n(ty)}\n 30\n0.0\n 40\n${n(e.texto)}\n 41\n0.0\n 71\n     5\n 72\n     1\n  1\n${texto}\n  7\nXERAL\n 11\n${v ? '0.0' : '1.0'}\n 21\n${v ? '1.0' : '0.0'}\n 31\n0.0\n 73\n     1\n 44\n1.0\n`);
  const bloque = `  0\nBLOCK\n  5\n${nuevo()}\n330\n${registro}\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n${nombre}\n 70\n     1\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n${nombre}\n  1\n\n`
    + cuerpo + `  0\nENDBLK\n  5\n${nuevo()}\n330\n${registro}\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n`;
  const [dx, dy] = xy(s2, c.d);
  const override = texto === comaCota(mide) ? '' : `  1\n${texto}\n`;
  const entidad = ent('DIMENSION', c.capa, 'AcDbDimension', `280\n     0\n  2\n${nombre}\n 10\n${n(dx)}\n 20\n${n(dy)}\n 30\n0.0\n 11\n${n(tx)}\n 21\n${n(ty)}\n 31\n0.0\n 70\n    32\n 71\n     5\n 42\n${n(mide)}\n${override}  3\n${c.estilo ?? 'XERAL'}\n100\nAcDbAlignedDimension\n 13\n${n(c.x1)}\n 23\n${n(c.y1)}\n 33\n0.0\n 14\n${n(c.x2)}\n 24\n${n(c.y2)}\n 34\n0.0\n${v ? ' 50\n90.0\n' : ''}100\nAcDbRotatedDimension\n`);
  const registroTabla = `  0\nBLOCK_RECORD\n  5\n${registro}\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n${nombre}\n340\n0\n 70\n     0\n280\n     1\n281\n     0\n`;
  return { entidad, bloque, registro: registroTabla };
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
