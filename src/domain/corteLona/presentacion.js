// Devuelve el plano de confección como DXF 2018 sobre la presentación de la oficina.
// (AUTOCAD\CAJETIN.dwg pasado a DXF con ODA: plantilla-cajetin.dxf). En la presentación A4 solo se
// rellenan los campos del cajetín y se encuadran las dos ventanas (toldo arriba, corte abajo); el
// dibujo va en el modelo, en metros. Iván, 19/10/2026: «es una plantilla que tenemos en las
// presentaciones y solo se editan los campos».
import { leerPlantilla } from './plantillas.js';
import { ALTO_CAJETIN, SITIO_CAJETIN, anadirCajetin } from './cajetin.js';
import { anchoArial } from './texto.js';

const MODELO = '1F';   // *Model_Space en la plantilla
// Capas del bot que no trae la plantilla.
// Las capas del bot con sus colores de la plantilla del bot: sin CUTTER en la tabla, ZWCAD la pintaba en blanco, como
// DISCO1 (Iván, 28/10/2026: «los cortes de cinta van de CUTTER»).
const CAPAS_BOT = [{ nombre: 'DISCO1', color: 7 }, { nombre: 'DISCO2', color: 6 }, { nombre: 'CUTTER', color: 112 }, { nombre: 'taladro', color: 160 },
  { nombre: 'ROTULADOR', color: 1 }, { nombre: 'RECUADROS', color: 30, imprimir: false }];
// Mismo orden en todos los planos (Iván, 23/10/2026): el dibujo a la izquierda, lejos de los ejes, y el corte a su
// derecha, alineado arriba; cada uno en su recuadro, pegados, con su nombre en grande encima, por fuera, para saber
// qué es cada cosa al abrir el DWG. Los dos recuadros iguales: el mismo alto y el mismo margen, el 20 % del más ancho
// a los lados y el 20 % del más alto arriba y abajo (Iván, 23/10/2026). El recuadro no se imprime ni va al bot.
export const margenRecuadro = (dibujo, corte) => [Math.max(1, 0.2 * Math.max(dibujo.x1 - dibujo.x0, corte.x1 - corte.x0)),
  Math.max(1, 0.2 * Math.max(dibujo.y1 - dibujo.y0, corte.y1 - corte.y0))];
/** Metros del dibujo al corte: los dos márgenes, con los recuadros pegados. */
export const separacionCorte = (dibujo, corte) => 2 * margenRecuadro(dibujo, corte)[0];

/**
 * plano: { lineas, polilineas, textos, zonas: { toldos, corte } } en metros (de dibujarPlano).
 * cabecera: { pedido, of, cliente, tecnico, revisor, fecha, pagina, material }.
 */
export function escribirDxfPlano(plano, cabecera) {
  let src = plano.plantilla ?? leerPlantilla('presentacion-a4.dxf');
  const PAPEL = plano.papel ?? 'E4D4';  // *Paper_Space de la plantilla elegida
  // Modelo en metros; la presentación conserva sus medidas en mm de papel.
  src = src.replace(/(\$INSUNITS\n 70\n)\s*\d+/, '$1     6');
  let handle = parseInt(/\$HANDSEED\n\s*5\n([0-9A-F]+)/.exec(src)[1], 16);
  const nuevo = () => (handle++).toString(16).toUpperCase();
  const n = (v) => Number(v).toFixed(6);

  // Los planos de puertas llaman XERA 15 al estilo grande. Se conserva el nombre real sin cambiar
  // XERAL 15, que siguen usando toldos y remolques con la misma plantilla.
  if ([...(plano.cotas ?? []), ...(plano.corte.cotas ?? [])].some(c => c.estilo === 'XERA 15') && !src.includes('  2\nXERA 15\n')) {
    const grande = src.match(/ {2}0\nDIMSTYLE\n(?:(?! {2}0\n)[\s\S])*? {2}2\nXERAL 15\n(?:(?! {2}0\n)[\s\S])*/)?.[0];
    if (grande) src = insertarEnTabla(src, 'DIMSTYLE', grande.replace(/(105\n)[^\n]+/, `$1${nuevo()}`).replace('XERAL 15\n', 'XERA 15\n'), 1);
  }
  // Estilos que ninguna plantilla trae (las cotas grandes del corte de puertas): copia del XERA 15 con su texto y flecha.
  for (const estilo of new Set([...(plano.cotas ?? []), ...(plano.corte.cotas ?? [])].map(c => c.estilo))) {
    const e = ESTILOS_COTA[estilo];
    if (!e?.copiaDe || src.includes(`  2\n${estilo}\n`)) continue;
    const estiloDe = (nombre) => src.match(new RegExp(` {2}0\\nDIMSTYLE\\n(?:(?! {2}0\\n)[\\s\\S])*? {2}2\\n${nombre}\\n(?:(?! {2}0\\n)[\\s\\S])*`))?.[0];
    // Si la plantilla no trae XERA 15 (la de toldos), se copia su XERAL 15.
    const origen = estiloDe(e.copiaDe) ? e.copiaDe : 'XERAL 15';
    const base = estiloDe(origen);
    if (base) src = insertarEnTabla(src, 'DIMSTYLE', base.replace(/(105\n)[^\n]+/, `$1${nuevo()}`).replace(`  2\n${origen}\n`, `  2\n${estilo}\n`)
      .replace(/(\n140\n)[^\n]+/, `$1${e.texto}`).replace(/(\n 41\n)[^\n]+/, `$1${e.flecha}`), 1);
  }

  const capasNuevas = CAPAS_BOT.filter((c) => !new RegExp(`\\n  2\\n${c.nombre}\\n`).test(src));
  const registros = capasNuevas.map((c) => `  0\nLAYER\n  5\n${nuevo()}\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\n${c.nombre}\n 70\n     0\n 62\n${String(c.color).padStart(6)}\n  6\nContinuous\n${c.imprimir === false ? '290\n     0\n' : ''}370\n    -3\n390\nF\n`).join('');
  if (registros) src = insertarEnTabla(src, 'LAYER', registros, capasNuevas.length);

  // Una variante puede aportar un bloque de la oficina sin cambiar la plantilla de otros modelos.
  for (const b of plano.bloques ?? []) {
    const ini = src.indexOf(`\n  2\n${b.nombre}\n`, src.indexOf('\nBLOCKS\n'));
    if (ini < 0) throw new Error(`Falta el bloque ${b.nombre} en la plantilla.`);
    const desde = src.indexOf('\n  0\n', ini) + 1;
    const hasta = src.indexOf('  0\nENDBLK\n', desde);
    const dueno = /\n330\n([^\n]+)/.exec(src.slice(desde, hasta))[1];
    const entidad = `  0\nLWPOLYLINE\n  5\n${nuevo()}\n330\n${dueno}\n100\nAcDbEntity\n  8\n${b.capa}\n100\nAcDbPolyline\n 90\n${String(b.puntos.length).padStart(6)}\n 70\n     0\n 43\n0.0\n${b.puntos.map(([x, y]) => ` 10\n${n(x)}\n 20\n${n(y)}\n`).join('')}`;
    src = src.slice(0, desde) + entidad + src.slice(hasta);
  }

  // Cajetín de la oficina al día (CAJETIN TGM) en todos los planos, también en las plantillas propias, como la
  // de Portanova, que lo ponen a su escala y en su sitio (Iván, 22/10/2026: «así unificamos diseño»).
  // Una presentación por hoja (puertas: una por puerta, Iván 23/10/2026); cada una encuadra su zona y lleva su
  // cajetín. Sin `hojas`, la única de la plantilla con todo el dibujo, como siempre.
  const valoresCajetin = (h) => ({
    PEDIDO: cabecera.pedido, OF: cabecera.of, CLIENTE: cabecera.cliente, MATERIAL: cabecera.material,
    TECNICO: cabecera.tecnico, REVISOR: cabecera.revisor, FECHA: cabecera.fecha,
    HOJA: cabecera.pagina || '1/1', SUBTITULO: cabecera.subtitulo, ...h.cajetin
  });
  const hojas = plano.hojas ?? [{ zona: plano.zonas.toldos }];
  const { src: conCajetin, insercion: cajetin, insertar: insertarCajetin } = anadirCajetin(src, nuevo, PAPEL, valoresCajetin(hojas[0]), plano.cajetin);
  src = conCajetin;

  // Reparto de la A4 (Iván: que el dibujo y el corte se vean lo más grandes posible). Encima del
  // cajetín se prueba el corte debajo del toldo (a todo el ancho) o al lado (a la derecha), con todos
  // los tamaños, y se queda el que deja el toldo más grande sin que el corte quede a menos de 2/3 de
  // su escala (escala = mm de papel por metro de dibujo).
  // El cajetín va en la esquina de abajo a la derecha (Iván, 22/10/2026): el dibujo baja hasta el marco y solo
  // se aparta de esa esquina.
  const A4 = { x0: 10, x1: 287.1, y0: 11, y1: 199.9 };
  const esquina = { x0: SITIO_CAJETIN[0] - 3, y1: SITIO_CAJETIN[1] + ALTO_CAJETIN + 3 };
  const libre = (r) => (r.x1 > esquina.x0 && r.y0 < esquina.y1 ? { ...r, y0: esquina.y1 } : r);
  const TITULO_CORTE = 9;   // sitio para el título del corte y la raya
  // El corte va derecho, como en el rollo (Iván, 27/10/2026: «no entiendo por qué giras el corte»), y cada rollo (lona,
  // cristal, opciones) en su ventana, una debajo de otra, sin el hueco que los separa en el modelo.
  const zNormal = plano.zonas.corte;
  const zonasCorte = plano.zonas.cortes?.length ? plano.zonas.cortes : [zNormal];
  const ENTRE_VENTANAS = 4;
  // Con la vista girada 90° el ancho del corte pasa a ser su alto en la hoja.
  const anchosDe = (girado) => zonasCorte.map((z) => (girado ? z.y1 - z.y0 : z.x1 - z.x0));
  const altosDe = (girado) => zonasCorte.map((z) => (girado ? z.x1 - z.x0 : z.y1 - z.y0));
  const suma = (v) => v.reduce((a, b) => a + b, 0);
  const huecos = ENTRE_VENTANAS * (zonasCorte.length - 1);
  const escala = (z, r) => Math.min((r.x1 - r.x0) / (z.x1 - z.x0), (r.y1 - r.y0) / (z.y1 - z.y0));
  // Los cortes uno debajo de otro o, si así se ven más grandes, uno al lado de otro.
  const escalaCortes = (r, enFila, girado = false) => {
    const anchos = anchosDe(girado), altos = altosDe(girado);
    return enFila
      ? Math.min((r.x1 - r.x0 - huecos) / suma(anchos), (r.y1 - r.y0) / Math.max(...altos))
      : Math.min((r.x1 - r.x0) / Math.max(...anchos), (r.y1 - r.y0 - huecos) / suma(altos));
  };
  const enFilaEn = (r, girado = false) => zonasCorte.length > 1 && escalaCortes(r, true, girado) > escalaCortes(r, false, girado);
  const tamCortes = (r, girado = false) => escalaCortes(r, enFilaEn(r, girado), girado);
  const repartir = (zt) => {
    const repartos = [];
    // Debajo: el corte a la izquierda del cajetín; el toldo encima de los dos.
    for (let h = 25; h <= A4.y1 - A4.y0 - TITULO_CORTE - 60; h += 0.5) {
      const corte = { x0: A4.x0, y0: A4.y0, x1: esquina.x0, y1: A4.y0 + h };
      const y0 = Math.max(corte.y1 + TITULO_CORTE, esquina.y1);
      repartos.push({ zc: zNormal, corte, toldo: { x0: A4.x0, y0, x1: A4.x1, y1: A4.y1 }, raya: [[A4.x0, y0 - 2], [A4.x1, y0 - 2]] });
    }
    // Al lado: el corte a la derecha, encima del cajetín; el toldo a la izquierda, hasta abajo si no lo pisa.
    for (let w = 60; w <= A4.x1 - A4.x0 - 100; w += 0.5) {
      const corte = { x0: A4.x1 - w, y0: esquina.y1, x1: A4.x1, y1: A4.y1 - TITULO_CORTE };
      const toldo = libre({ x0: A4.x0, y0: A4.y0, x1: corte.x0 - 4, y1: A4.y1 });
      // La raya de separación no cruza el cajetín.
      const desde = corte.x0 - 2 > esquina.x0 ? esquina.y1 : A4.y0;
      repartos.push({ zc: zNormal, corte, toldo, raya: [[corte.x0 - 2, desde], [corte.x0 - 2, A4.y1]] });
      // El corte largo, girado contra el lado derecho, si así el dibujo sale más grande (dibujo alto); con un dibujo
      // alargado gana el corte debajo (Iván, 28/10/2026, AR2605035; «el criterio debe ser igual» en todos los cortes).
      // Solo se gira la vista; el corte, sus textos y sus cotas no cambian en el modelo.
      repartos.push({ zc: zNormal, corte: { ...corte }, toldo: { ...toldo }, raya: [[corte.x0 - 2, desde], [corte.x0 - 2, A4.y1]], girado: true });
    }
    // Lo más grande posible el toldo y, con eso, los cortes (Iván, 27/10/2026: «cubrir el máximo de papel»).
    const nota = (r) => Math.min(escala(zt, r.toldo), 1.5 * tamCortes(r.corte, r.girado));
    const mejor = (a, b) => nota(b) > nota(a) + 1e-9 || (nota(b) > nota(a) - 1e-9 && tamCortes(b.corte, b.girado) > tamCortes(a.corte, a.girado) + 1e-9);
    // El dibujo al máximo, con el corte a no menos del 80 % de su mejor escala (Iván, 28/10/2026, AR2605035).
    const mejorCorte = Math.max(...repartos.map((r) => tamCortes(r.corte, r.girado)));
    const validos = repartos.filter((r) => tamCortes(r.corte, r.girado) >= 0.8 * mejorCorte);
    const masDibujo = (a, b) => escala(zt, b.toldo) > escala(zt, a.toldo) + 1e-9 || (escala(zt, b.toldo) > escala(zt, a.toldo) - 1e-9 && mejor(a, b));
    const reparto = validos.reduce((a, b) => (masDibujo(a, b) ? b : a));
    const zc = reparto.zc;
    // El sitio de los cortes, sin más alto ni ancho del que usan a su escala.
    const rc = reparto.corte;
    const girado = !!reparto.girado, enFila = enFilaEn(rc, girado), ec = escalaCortes(rc, enFila, girado);
    const altos = altosDe(girado);
    const altoUsado = enFila ? Math.max(...altos) * ec : suma(altos) * ec + huecos;
    if (rc.x0 === A4.x0) rc.y1 = rc.y0 + Math.max(25, altoUsado);
    else rc.y0 = rc.y1 - altoUsado;
    // El corte girado, pegado al lado derecho; lo que sobra de su columna es para la puerta.
    if (girado) {
      const anchos = anchosDe(true), anchoUsado = enFila ? suma(anchos) * ec + huecos : Math.max(...anchos) * ec;
      rc.x0 = Math.max(rc.x0, A4.x1 - anchoUsado);
      reparto.toldo = libre({ x0: A4.x0, y0: A4.y0, x1: rc.x0 - 4, y1: A4.y1 });
      reparto.raya = [[rc.x0 - 2, rc.x0 - 2 > esquina.x0 ? esquina.y1 : A4.y0], [rc.x0 - 2, A4.y1]];
    }
    // Una ventana por rollo, arriba a la izquierda y a la misma escala: de arriba abajo o de izquierda a derecha.
    let [xv, yv] = [rc.x0, rc.y1];
    rc.ventanas = zonasCorte.map((z) => {
      const [zw, zh] = girado ? [z.y1 - z.y0, z.x1 - z.x0] : [z.x1 - z.x0, z.y1 - z.y0];
      const r = { x0: xv, x1: xv + zw * ec, y1: yv, y0: yv - zh * ec };
      if (enFila) xv = r.x1 + ENTRE_VENTANAS; else yv = r.y0 - ENTRE_VENTANAS;
      return { z, r };
    });
    if (rc.x0 === A4.x0) {
      reparto.toldo.y0 = Math.max(rc.y1 + TITULO_CORTE, esquina.y1);
      reparto.raya = [[A4.x0, reparto.toldo.y0 - 2], [A4.x1, reparto.toldo.y0 - 2]];
    }
    return { reparto, zc, rc };
  };
  const repartos = hojas.map((h) => repartir(h.zona));
  const { reparto } = repartos[0];
  // La ventana, con la proporción justa de lo que enseña, para que no asome nada vecino del modelo; el corte, arriba a
  // la izquierda de su sitio (su título va encima) y, si va girado, con la vista girada.
  const encuadre = (z, r, arriba = false, girada = false) => {
    const [zw, zh] = girada ? [z.y1 - z.y0, z.x1 - z.x0] : [z.x1 - z.x0, z.y1 - z.y0];
    const s = Math.min((r.x1 - r.x0) / zw, (r.y1 - r.y0) / zh), [w, h] = [zw * s, zh * s];
    return { z, centro: arriba ? [r.x0 + w / 2, r.y1 - h / 2] : [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2], ancho: w, alto: h, girada };
  };
  // En una presentación propia (Portanova) la ventana 2 encuadra la zona de la hoja. `corteGirable` deja girar la
  // vista del corte 90° si así se ve más grande, sin girar el corte en el modelo (Iván, 23/10/2026).
  const ventanasDe = (h, { reparto: r, zc, rc }) => {
    const pv = plano.presentacion?.ventanas;
    const v = pv ? { ...pv, 2: { ...pv[2], z: h.zona } }
      : { 2: encuadre(h.zona, r.toldo), ...Object.fromEntries(rc.ventanas.map(({ z, r: rv }, k) => [3 + k, encuadre(z, rv, true, !!r.girado)])) };
    if (plano.corteGirable) for (const id of Object.keys(v)) if (v[id].z === zNormal || v[id].z === zc) v[id] = { ...v[id], girable: true };
    return v;
  };
  const ventanas = ventanasDe(hojas[0], repartos[0]);
  // Vista del corte girada 90°: la elegida en el reparto o, si se deja girar, la que lo enseña más grande.
  const vaGirada = (v) => {
    if (v.girada) return true;
    if (!v.girable) return false;
    const zr = plano.zonas.corteReal ?? v.z, w = zr.x1 - zr.x0, alto = zr.y1 - zr.y0;
    return Math.min(v.ancho / alto, v.alto / w) > 1.02 * Math.min(v.ancho / w, v.alto / alto);
  };
  // Con la vista girada, lo que en el modelo se lee de abajo arriba saldría cabeza abajo en la hoja: esos textos y
  // cotas del corte se escriben leyendo de arriba abajo, y en la hoja quedan derechos.
  const corte = !Object.values(ventanas).some(vaGirada) ? plano.corte : {
    ...plano.corte,
    textos: plano.corte.textos.map((t) => (t.giro === 90 ? { ...t, giro: 270 } : t)),
    cotas: (plano.corte.cotas ?? []).map((c) => (c.giro === 90 ? { ...c, textoGirado: true } : c)),
  };
  const encuadrar = (t, v) => {
    const z = v.z;
    if (vaGirada(v)) {
      const zr = plano.zonas.corteReal ?? z, w = zr.x1 - zr.x0, alto = zr.y1 - zr.y0;
      {
        // Vista girada: centrada en el corte con su objetivo (17/27) y la vista en su origen.
        let r = poner(t, '10', n(v.centro[0]));
        r = poner(r, '20', n(v.centro[1]));
        r = poner(r, '40', n(v.ancho));
        r = poner(r, '41', n(v.alto));
        r = poner(r, '12', n(0));
        r = poner(r, '22', n(0));
        r = poner(r, '17', n((zr.x0 + zr.x1) / 2));
        r = poner(r, '27', n((zr.y0 + zr.y1) / 2));
        r = poner(r, '51', n(90));
        return poner(r, '45', n(Math.max(w, alto * v.alto / v.ancho) * 1.03));
      }
    }
    const altoVista = v.altoVista ?? Math.max(z.y1 - z.y0, (z.x1 - z.x0) * v.alto / v.ancho) * 1.03;
    let r = poner(t, '10', n(v.centro[0]));
    r = poner(r, '20', n(v.centro[1]));
    r = poner(r, '40', n(v.ancho));
    r = poner(r, '41', n(v.alto));
    r = poner(r, '12', n((z.x0 + z.x1) / 2));
    r = poner(r, '22', n((z.y0 + z.y1) / 2));
    return poner(r, '45', n(altoVista));
  };

  // Entidades de la presentación: fuera el cajetín viejo, MATERIALES, EMPATE y la tabla suelta;
  // las ventanas se recolocan y encuadran.
  const ini = src.indexOf('\nENTITIES\n') + '\nENTITIES\n'.length;
  const fin = src.indexOf('  0\nENDSEC\n', ini);
  const trozos = src.slice(ini, fin).split(/(?=^ {2}0\n)/m).filter(Boolean);
  const viejo = trozos.map((t) => /^ {2}0\nINSERT\n[\s\S]*?\n {2}2\nCAJETIN\n/.test(t) && /\n {2}5\n([0-9A-F]+)\n/.exec(t)[1]).find(Boolean);
  const procesar = (lista, vs) => lista.flatMap((t) => {
    const tipo = /^ {2}0\n([^\n]+)/.exec(t)[1];
    // El cajetín viejo de la plantilla, con sus atributos, sale siempre: lo sustituye el CAJETIN TGM.
    if (/\n {2}5\n([0-9A-F]+)\n/.exec(t)[1] === viejo) return [];
    if (['ATTRIB', 'SEQEND'].includes(tipo) && new RegExp(`\\n330\\n${viejo}\\n`).test(t)) return [];
    if (plano.plantilla && tipo === 'MTEXT' && /MATERIALES/.test(t)) return [poner(t, '1', plano.materiales)];
    if (tipo === 'ACAD_TABLE') return [];
    if (!plano.plantilla && tipo === 'MTEXT' && /MATERIALES/.test(t)) return [];
    if (tipo === 'TEXT' && /EMPATE:/.test(t)) return [];
    if (tipo === 'VIEWPORT') {
      const id = Number(/\n 69\n\s*(\d+)/.exec(t)?.[1]);
      const v = vs[id];
      if (v) {
        return [encuadrar(t, v)];
      }
    }
    return [t];
  });
  // Ventanas adicionales de una presentación específica (notas y detalles de taller).
  const plantillaVentana = trozos.find(t => /^ {2}0\nVIEWPORT\n/.test(t) && /\n 69\n\s*3\n/.test(t));
  const ventanasExtra = (vs) => Object.entries(vs).flatMap(([id, v]) => {
    if (Number(id) <= 3 || trozos.some(t => /^ {2}0\nVIEWPORT\n/.test(t) && Number(/\n 69\n\s*(\d+)/.exec(t)?.[1]) === Number(id))) return [];
    let t = poner(plantillaVentana, '5', nuevo());
    t = poner(t, '69', String(id));
    return [encuadrar(t, v)];
  });
  const entidades = [...procesar(trozos, ventanas), ...ventanasExtra(ventanas)];
  // En el papel: título del corte y una raya fina entre el corte y el toldo.
  const papel = (tipo, color, sub, cuerpo, capa = 'texto') => `  0\n${tipo}\n  5\n${nuevo()}\n330\n${PAPEL}\n100\nAcDbEntity\n 67\n     1\n  8\n${capa}\n 62\n${String(color).padStart(6)}\n100\n${sub}\n${cuerpo}`;
  const textosPapel = (caj, { reparto: r, rc }) => plano.presentacion ? caj + plano.presentacion.textos.map(t =>
    papel('MTEXT', 256, 'AcDbMText', ` 10\n${n(t.x)}\n 20\n${n(t.y)}\n 30\n0.0\n 40\n${n(t.h)}\n 41\n${n(t.ancho)}\n 71\n     1\n 72\n     1\n  1\n${t.valor}\n  7\narial\n 73\n     1\n 44\n1.0\n`, t.capa ?? 'texto')).join('') : caj
    + papel('LWPOLYLINE', 8, 'AcDbPolyline', ` 90\n     2\n 70\n     0\n 43\n0.0\n${r.raya.map(([x, y]) => ` 10\n${n(x)}\n 20\n${n(y)}\n`).join('')}`)
    + papel('TEXT', 7, 'AcDbText', ` 10\n${n(rc.x0)}\n 20\n${n(rc.y1 + 2)}\n 30\n0.0\n 40\n${n(Math.min(2.2, (rc.x1 - rc.x0) / anchoArial(cabecera.tituloCorte || 'CORTE', 1)))}\n  1\n${cabecera.tituloCorte || 'CORTE'}\n  7\narial\n100\nAcDbText\n`);
  const insercion = textosPapel(cajetin, repartos[0]);
  // Las demás hojas: solo lo del papel de la plantilla, con sus ventanas y su cajetín.
  const sinReactores = (t) => t.replace(/102\n\{ACAD_[A-Z]+\n(?:3[36]0\n[0-9A-F]+\n)*102\n\}\n/g, '').replace(/\n360\n[0-9A-F]+\n/g, '\n');
  const handleDe = (t) => /\n {2}5\n([0-9A-F]+)\n/.exec(t)?.[1];
  const delPapel = new Set();
  for (const t of trozos) if ([PAPEL, ...delPapel].includes(/\n330\n([0-9A-F]+)\n/.exec(sinReactores(t))?.[1])) delPapel.add(handleDe(t));
  const papelHojas = hojas.slice(1).map((h, i) => {
    const vs = ventanasDe(h, repartos[i + 1]);
    return procesar(trozos.filter(t => delPapel.has(handleDe(t))), vs).join('') + ventanasExtra(vs).join('')
      + textosPapel(insertarCajetin(PAPEL, valoresCajetin(h)), repartos[i + 1]);
  });

  // Dibujo en el modelo.
  const ent = (tipo, capa, sub, cuerpo) => `  0\n${tipo}\n  5\n${nuevo()}\n330\n${MODELO}\n100\nAcDbEntity\n  8\n${capa}\n${plano.coloresModelo?.[capa] == null ? '' : ` 62\n${plano.coloresModelo[capa]}\n`}100\n${sub}\n${cuerpo}`;
  let modelo = '';
  const lineas = [...plano.lineas, ...corte.lineas];
  const polilineas = [...plano.polilineas, ...corte.polilineas];
  const textos = [...plano.textos, ...corte.textos];
  // Una línea puede llevar su color (el cristal del corte de puertas, en azul); si no, el de su capa.
  for (const l of lineas) {
    const linea = ent('LINE', l.capa, 'AcDbLine', ` 10\n${n(l.x1)}\n 20\n${n(l.y1)}\n 30\n0.0\n 11\n${n(l.x2)}\n 21\n${n(l.y2)}\n 31\n0.0\n`);
    modelo += l.color == null ? linea : linea.replace('100\nAcDbLine', ` 62\n${l.color}\n100\nAcDbLine`);
  }
  for (const p of polilineas) {
    const entidad = ent('LWPOLYLINE', p.capa, 'AcDbPolyline', ` 90\n${String(p.puntos.length).padStart(6)}\n 70\n${p.cerrada ? '     1' : '     0'}\n 43\n0.0\n${p.puntos.map(([x, y], i) => ` 10\n${n(x)}\n 20\n${n(y)}\n${p.curvas ? ` 42\n${n(p.curvas[i] ?? 0)}\n` : ''}`).join('')}`);
    modelo += p.color == null ? entidad : entidad.replace('100\nAcDbPolyline', ` 62\n${p.color}\n100\nAcDbPolyline`);
  }
  for (const b of [...(plano.inserciones ?? []), ...(corte.inserciones ?? [])]) {
    modelo += ent('INSERT', b.capa, 'AcDbBlockReference', `  2\n${b.nombre}\n 10\n${n(b.x)}\n 20\n${n(b.y)}\n 30\n0.0\n 41\n${n(b.sx ?? 1)}\n 42\n1.0\n 43\n1.0\n 50\n${n(b.giro ?? 0)}\n`);
  }
  for (const s of [...(plano.sombreados ?? []), ...(corte.sombreados ?? [])]) {
    modelo += ent('HATCH', s.capa, 'AcDbHatch', sombreadoDxf(s, n));
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
    const ancla = t.ancla ?? (t.centrado ? 5 : 7);   // 5 centro; 7 abajo a la izquierda
    modelo += ent('MTEXT', t.capa, 'AcDbMText', ` 10\n${n(t.x)}\n 20\n${n(t.y)}\n 30\n0.0\n 40\n${n(t.h)}\n 41\n${t.ancho == null ? '0.0' : n(t.ancho)}\n 71\n     ${ancla}\n 72\n     1\n  1\n${t.valor}\n  7\narial\n 11\n${n(Math.round(Math.cos(a) * 1e9) / 1e9 || 0)}\n 21\n${n(Math.round(Math.sin(a) * 1e9) / 1e9 || 0)}\n 31\n0.0\n 73\n     1\n 44\n1.0\n`);
  }

  // Cotas de verdad, que se seleccionan y se modifican (Iván, 20/10/2026): DIMENSION con los estilos de
  // cota de la plantilla y su bloque ya dibujado como lo dibuja el CAD.
  const baseCotas = plano.plantilla ? Math.max(0, ...[...src.matchAll(/\n {2}2\n\*D(\d+)\n/g)].map(m => Number(m[1]))) : 0;
  const cotas = [...(plano.cotas ?? []), ...(corte.cotas ?? [])].map((c, i) => cotaDxf(c, baseCotas + i + 1, nuevo, ent));
  modelo += cotas.map((c) => c.entidad).join('');
  // El recuadro DIBUJO encierra también lo que la plantilla trae en el modelo (el detalle del saco de Portanova).
  const zt = plano.zonas.toldos, d = plano.detalle;
  const zd = d ? { x0: Math.min(zt.x0, d.x0), y0: Math.min(zt.y0, d.y0), x1: Math.max(zt.x1, d.x1), y1: Math.max(zt.y1, d.y1) } : zt;
  const zc = plano.zonas.corteReal ?? plano.zonas.corte;
  const [mx, my] = margenRecuadro(zd, zc), [ya, yb] = [Math.min(zd.y0, zc.y0) - my, Math.max(zd.y1, zc.y1) + my];
  for (const [nombre, z] of [['DIBUJO', zd], ['CORTE', zc]]) {
    const [x0, y0, x1, y1] = [z.x0 - mx, ya, z.x1 + mx, yb];
    modelo += ent('LWPOLYLINE', 'RECUADROS', 'AcDbPolyline', ` 90\n     4\n 70\n     1\n 43\n${n(Math.min(mx, my) / 50)}\n${[[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => ` 10\n${n(x)}\n 20\n${n(y)}\n`).join('')}`);
    // El nombre, encima y por fuera; tan alto como el margen de arriba, sin pasar del ancho del recuadro.
    modelo += ent('MTEXT', 'RECUADROS', 'AcDbMText', ` 10\n${n(x0)}\n 20\n${n(y1 + my / 5)}\n 30\n0.0\n 40\n${n(Math.min(my, (x1 - x0) / anchoArial(nombre, 1)))}\n 41\n0.0\n 71\n     7\n 72\n     1\n  1\n${nombre}\n  7\narial\n 11\n1.0\n 21\n0.0\n 31\n0.0\n 73\n     1\n 44\n1.0\n`);
  }

  src = src.slice(0, ini) + entidades.join('') + insercion + modelo + src.slice(fin);
  if (cotas.length) {
    src = insertarEnTabla(src, 'BLOCK_RECORD', cotas.map((c) => c.registro).join(''), cotas.length);
    const finBlocks = src.indexOf('  0\nENDSEC\n', src.indexOf('\nBLOCKS\n'));
    src = src.slice(0, finBlocks) + cotas.map((c) => c.bloque).join('') + src.slice(finBlocks);
  }
  if (plano.hojas) src = anadirHojas(src, hojas, papelHojas, PAPEL, nuevo);
  src = src.replace(/(\$HANDSEED\n\s*5\n)[0-9A-F]+/, `$1${handle.toString(16).toUpperCase()}`);

  // La conversión a DWG queda para el servidor en la fase 2.
  return { dxf: src.replace(/\n/g, '\r\n'), reparto: reparto.corte.x0 === A4.x0 ? 'debajo' : 'al lado', ventanas };
}

/**
 * Nombra la presentación de la plantilla como la primera hoja y añade una presentación por cada hoja más:
 * su registro *Paper_SpaceN, su bloque con el papel (handles nuevos, ventanas con número propio), su LAYOUT
 * copiado del de la plantilla y su entrada en el diccionario de presentaciones.
 */
function anadirHojas(src, hojas, papelHojas, PAPEL, nuevo) {
  const trozosDe = (texto) => texto.split(/(?=^ {2}0\n)/m).filter(Boolean);
  const handleDe = (t) => /\n {2}5\n([0-9A-F]+)\n/.exec(t)?.[1];
  const todos = trozosDe(src);
  const layout = todos.find((t) => /^ {2}0\nLAYOUT\n/.test(t) && new RegExp(`\\n330\\n${PAPEL}\\n`).test(t));
  const hLayout = handleDe(layout);
  const nombre = (t, valor, orden) => t.replace(/(AcDbLayout\n {2}1\n)[^\n]*/, `$1${valor}`).replace(/(AcDbLayout\n {2}1\n[^\n]*\n 70\n[^\n]*\n 71\n)[^\n]*/, `$1${orden}`);
  const viejoNombre = /AcDbLayout\n {2}1\n([^\n]*)/.exec(layout)[1];
  let layouts = nombre(layout, hojas[0].nombre, 1), entradas = '', registros = '', bloques = '';
  const usados = Math.max(0, ...[...src.matchAll(/\n 69\n\s*(\d+)\n/g)].map((m) => Number(m[1])));
  papelHojas.forEach((papel, i) => {
    const br = nuevo(), hl = nuevo(), base = usados + 10 * i;
    // Handles nuevos; el dueño pasa del papel de la plantilla al de esta hoja.
    const mapa = new Map(trozosDe(papel).map((t) => [handleDe(t), nuevo()]));
    const copia = trozosDe(papel).map((t) => t
      .replace(/102\n\{ACAD_[A-Z]+\n(?:3[36]0\n[0-9A-F]+\n)*102\n\}\n/g, '').replace(/\n360\n[0-9A-F]+\n/g, '\n')
      .replace(/\n {2}5\n([0-9A-F]+)\n/, (_, h) => `\n  5\n${mapa.get(h)}\n`)
      .replace(/\n330\n([0-9A-F]+)\n/, (_, h) => `\n330\n${h === PAPEL ? br : mapa.get(h) ?? h}\n`)
      .replace(/\n 69\n\s*(\d+)\n/, (_, id) => `\n 69\n${base + Number(id)}\n`)).join('');
    const general = trozosDe(copia).find((t) => /^ {2}0\nVIEWPORT\n/.test(t) && new RegExp(`\\n 69\\n${base + 1}\\n`).test(t));
    const pagina = `*Paper_Space${i}`;
    registros += `  0\nBLOCK_RECORD\n  5\n${br}\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n${pagina}\n340\n${hl}\n 70\n     0\n280\n     1\n281\n     0\n`;
    bloques += `  0\nBLOCK\n  5\n${nuevo()}\n330\n${br}\n100\nAcDbEntity\n 67\n     1\n  8\n0\n100\nAcDbBlockBegin\n  2\n${pagina}\n 70\n     0\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n${pagina}\n  1\n\n`
      + copia + `  0\nENDBLK\n  5\n${nuevo()}\n330\n${br}\n100\nAcDbEntity\n 67\n     1\n  8\n0\n100\nAcDbBlockEnd\n`;
    layouts += nombre(layout, hojas[i + 1].nombre, i + 2).replace(/\n {2}5\n[0-9A-F]+\n/, `\n  5\n${hl}\n`)
      .replace(/102\n\{ACAD_[A-Z]+\n(?:3[36]0\n[0-9A-F]+\n)*102\n\}\n/g, '').replace(/\n360\n[0-9A-F]+\n/g, '\n')
      .replace(new RegExp(`\\n330\\n${PAPEL}\\n(331\\n[0-9A-F]+\\n)?`), `\n330\n${br}\n${general ? `331\n${handleDe(general)}\n` : ''}`);
    entradas += `  3\n${hojas[i + 1].nombre}\n350\n${hl}\n`;
  });
  src = src.replace(layout, layouts);
  src = src.replace(new RegExp(`( {2}3\\n)${viejoNombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\n350\\n${hLayout}\\n)`), `$1${hojas[0].nombre}$2${entradas}`);
  if (registros) {
    src = insertarEnTabla(src, 'BLOCK_RECORD', registros, papelHojas.length);
    const finBlocks = src.indexOf('  0\nENDSEC\n', src.indexOf('\nBLOCKS\n'));
    src = src.slice(0, finBlocks) + bloques + src.slice(finBlocks);
  }
  return src;
}

// Estilos de cota de la plantilla (los de los DWG de la oficina): dibujo en metros y cota en cm (DIMLFAC
// 100), con coma. Aquí solo lo que hace falta para dibujar su bloque: texto, flecha, prolongación de la
// línea de referencia y el hueco del texto. Las líneas de referencia arrancan a DIMEXO de lo acotado.
const SEPARA_COTA = 0.05;
const ESTILOS_COTA = {
  XERAL: { texto: 0.1, flecha: 0.025, prolonga: 0.0175, hueco: 0.003 },
  'XERAL 5': { texto: 0.05, flecha: 0.015, prolonga: 0.0175, hueco: 0.003 },
  'XERAL 15': { texto: 0.15, flecha: 0.025, prolonga: 0.0175, hueco: 0.003 },
  'XERA 15': { texto: 0.15, flecha: 0.025, prolonga: 0.0175, hueco: 0.003 },
  'XERA 20': { texto: 0.2, flecha: 0.04, prolonga: 0.0175, hueco: 0.005, copiaDe: 'XERA 15' },
};
const comaCota = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

/**
 * Una cota horizontal (giro 0) o vertical (giro 90) en metros: de (x1, y1) a (x2, y2), con la línea de cota
 * en `d` (la y si es horizontal, la x si es vertical). `valor` en cm: si no es lo que mide, va escrito.
 * Con `alineada`, la cota va paralela a los dos puntos y mide su distancia real (el lado diagonal del saco con
 * suelo inclinado; Iván, 23/10/2026); su línea va a `desvio` metros, a la izquierda de 1 → 2.
 */
function cotaDxf(c, numero, nuevo, ent) {
  const e = ESTILOS_COTA[c.estilo] ?? ESTILOS_COTA.XERAL;
  const n = (v) => Number(v).toFixed(6);
  const v = c.giro === 90;
  const largo = Math.hypot(c.x2 - c.x1, c.y2 - c.y1), ux = (c.x2 - c.x1) / largo, uy = (c.y2 - c.y1) / largo;
  // Todo se calcula como si fuera horizontal: a lo largo (s) y a lo ancho (t); `xy` lo devuelve al plano.
  const xy = c.alineada ? (s, t) => [c.x1 + s * ux - t * uy, c.y1 + s * uy + t * ux] : (s, t) => (v ? [t, s] : [s, t]);
  const [s1, t1, s2, t2] = c.alineada ? [0, 0, largo, 0] : v ? [c.y1, c.x1, c.y2, c.x2] : [c.x1, c.y1, c.x2, c.y2];
  if (c.alineada) c = { ...c, d: c.desvio };
  const mide = Math.abs(s2 - s1) * 100;
  const texto = c.rotulo ?? (c.valor == null || Math.abs(mide - c.valor) < 0.05 ? comaCota(mide) : comaCota(c.valor));
  const registro = nuevo();
  const nombre = `*D${numero}`;
  const dentro = (tipo, sub, cuerpo) => `  0\n${tipo}\n  5\n${nuevo()}\n330\n${registro}\n100\nAcDbEntity\n  8\n0\n 62\n     0\n100\n${sub}\n${cuerpo}`;
  const linea = (a, b) => dentro('LINE', 'AcDbLine', ` 10\n${n(a[0])}\n 20\n${n(a[1])}\n 30\n0.0\n 11\n${n(b[0])}\n 21\n${n(b[1])}\n 31\n0.0\n`);
  let cuerpo = '';
  // Líneas de referencia desde lo acotado (con el hueco DIMEXO del estilo) hasta pasar un poco la línea de cota.
  // Antes eran de largo fijo y, con la línea de cota lejos, quedaban en el aire (Iván, 22/10/2026).
  for (const [s, t] of [[s1, t1], [s2, t2]]) {
    const hasta = Math.abs(c.d - t);
    if (hasta <= SEPARA_COTA) continue;
    const signo = Math.sign(c.d - t);
    cuerpo += linea(xy(s, c.d + signo * e.prolonga), xy(s, t + signo * SEPARA_COTA));
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
  cuerpo += dentro('MTEXT', 'AcDbMText', ` 10\n${n(tx)}\n 20\n${n(ty)}\n 30\n0.0\n 40\n${n(e.texto)}\n 41\n0.0\n 71\n     5\n 72\n     1\n  1\n${texto}\n  7\nXERAL\n 11\n${c.alineada ? n(ux) : v ? '0.0' : '1.0'}\n 21\n${c.alineada ? n(uy) : v ? (c.textoGirado ? '-1.0' : '1.0') : '0.0'}\n 31\n0.0\n 73\n     1\n 44\n1.0\n`);
  const bloque = `  0\nBLOCK\n  5\n${nuevo()}\n330\n${registro}\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n${nombre}\n 70\n     1\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n${nombre}\n  1\n\n`
    + cuerpo + `  0\nENDBLK\n  5\n${nuevo()}\n330\n${registro}\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n`;
  const [dx, dy] = xy(s2, c.d);
  const override = c.rotulo == null && texto === comaCota(mide) ? '' : `  1\n${texto}\n`;
  const entidad = ent('DIMENSION', c.capa, 'AcDbDimension', `280\n     0\n  2\n${nombre}\n 10\n${n(dx)}\n 20\n${n(dy)}\n 30\n0.0\n 11\n${n(tx)}\n 21\n${n(ty)}\n 31\n0.0\n 70\n    ${c.alineada ? 33 : 32}\n 71\n     5\n 42\n${n(mide)}\n${override}${c.textoGirado ? ' 53\n180.0\n' : ''}  3\n${c.estilo ?? 'XERAL'}\n100\nAcDbAlignedDimension\n 13\n${n(c.x1)}\n 23\n${n(c.y1)}\n 33\n0.0\n 14\n${n(c.x2)}\n 24\n${n(c.y2)}\n 34\n0.0\n${c.alineada ? '' : `${v ? ' 50\n90.0\n' : ''}100\nAcDbRotatedDimension\n`}`);
  const registroTabla = `  0\nBLOCK_RECORD\n  5\n${registro}\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n${nombre}\n340\n0\n 70\n     0\n280\n     1\n281\n     0\n`;
  return { entidad, bloque, registro: registroTabla };
}

// Contorno de polilínea independiente, sin referencias a handles de otra copia del DWG.
// El patrón ANGLE y su paso son los del velcro de la plantilla de puertas de la oficina.
function sombreadoDxf(s, n) {
  const patron = s.solido ? '' : ' 52\n0.0\n 41\n0.001\n 77\n     0\n 78\n     2\n'
    + ' 53\n0.0\n 43\n0.0\n 44\n0.0\n 45\n0.0\n 46\n0.006985\n 79\n     2\n 49\n0.00508\n 49\n-0.001905\n'
    + ' 53\n90.0\n 43\n0.0\n 44\n0.0\n 45\n-0.006985\n 46\n0.0\n 79\n     2\n 49\n0.00508\n 49\n-0.001905\n';
  return ` 10\n0.0\n 20\n0.0\n 30\n0.0\n210\n0.0\n220\n0.0\n230\n1.0\n  2\n${s.solido ? 'SOLID' : 'ANGLE'}\n 70\n${s.solido ? '     1' : '     0'}\n 71\n     0\n 91\n     1\n 92\n     2\n 72\n     0\n 73\n     1\n 93\n${s.puntos.length}\n${s.puntos.map(([x, y]) => ` 10\n${n(x)}\n 20\n${n(y)}\n`).join('')} 97\n     0\n 75\n     0\n 76\n     1\n${patron} 98\n     0\n`;
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
