import { anchoArial } from '../../domain/corteLona/texto.js';
import {
  esVertical,
  geometriaAlzado,
  type CotaAlzado,
  type FormaAlzado,
  type GeometriaAlzado,
  type TextoAlzado,
} from '../../puertas/alzado.ts';
import { alturasTubos } from '../../puertas/calcular.ts';
import { desnivelSuelo, sacoPuerta } from '../../puertas/saco.ts';
import type { Puerta, ResultadoPuerta, Ventana } from '../../puertas/tipos.ts';
import { panoContinuoEnrollable } from '../../puertas/ventanalesEnrollable.ts';
import { textoCotaMm } from './alzadoEnMm';
import { medidaPuerta } from './medidasPuertas';

// Ajustes exclusivos de la vista en pantalla (mm, estilo plano GENERAL, cotas sin pisarse ni tapadas por rellenos).
// No modifica src/puertas/alzado*.ts ni la generación del DWG.

function cotaEstiloApilableVentanas(ventanas: Ventana[], F: number, H: number): FormaAlzado[] {
  const salida: FormaAlzado[] = [];
  const filas = new Map<number, Ventana[]>();
  for (const v of ventanas) {
    const clave = Math.round(v.y * 100);
    const fila = filas.get(clave) ?? [];
    fila.push(v);
    filas.set(clave, fila);
  }
  for (const fila of filas.values()) {
    fila.sort((a, b) => a.x - b.x);
    const vy0 = H - fila[0].y - fila[0].alto;
    const yCota = vy0 + fila[0].alto / 2;
    const hitos = [0, ...fila.flatMap(v => [v.x, v.x + v.ancho]), F];
    for (let i = 1; i < hitos.length; i++) {
      const desde = hitos[i - 1], hasta = hitos[i];
      if (hasta - desde <= 0.05) continue;
      salida.push({
        tipo: 'cota',
        x1: desde, y1: yCota, x2: hasta, y2: yCota,
        linea: yCota,
        valor: hasta - desde,
        estilo: 'XERAL 5',
        marcas: 2,
        texto: { x: (desde + hasta) / 2, y: yCota - 3, ancla: 'middle', clase: 'puerta-cota-texto' },
      });
    }
    for (const v of fila) {
      const vy = H - v.y - v.alto;
      const xVert = v.x + Math.min(12, Math.max(4, v.ancho * 0.16));
      salida.push({
        tipo: 'cota',
        x1: xVert, y1: vy, x2: xVert, y2: vy + v.alto,
        linea: xVert,
        valor: v.alto,
        estilo: 'XERAL 5',
        marcas: 2,
        texto: { x: xVert + 3, y: vy + v.alto * 0.78, ancla: 'start', clase: 'puerta-cota-texto' },
      });
    }
  }
  return salida;
}

/** Encuentra el mayor intervalo vertical libre entre obstáculos horizontales dentro de [desde, hasta]. */
function mayorTramoLibre(desde: number, hasta: number, obstaculos: Array<[number, number]>): [number, number] {
  let huecos: Array<[number, number]> = [[desde, hasta]];
  for (const [a, b] of obstaculos) {
    huecos = huecos.flatMap(([y0, y1]) => (
      b <= y0 || a >= y1
        ? [[y0, y1] as [number, number]]
        : [[y0, Math.min(y1, a)], [Math.max(y0, b), y1]].filter(([u, v]) => v - u > 2) as Array<[number, number]>
    ));
  }
  huecos.sort((u, v) => (v[1] - v[0]) - (u[1] - u[0]));
  return huecos[0] ?? [desde, hasta];
}

/** Ordena las formas para que los rellenos nunca tapen cotas ni textos. */
function ordenarCapas(formas: FormaAlzado[]): FormaAlzado[] {
  const prioridad = (f: FormaAlzado): number => {
    if (f.tipo === 'cota') return 4;
    if (f.tipo === 'texto') return 5;
    if (f.tipo === 'linea' && f.clase === 'puerta-linea-guia') return 3;
    if (f.tipo === 'rect' || f.tipo === 'poligono' || f.tipo === 'polilinea') {
      if (f.clase === 'puerta-lona' || f.clase === 'puerta-pano') return 0;
      if (f.clase === 'puerta-saco' || f.clase === 'puerta-saco-pieza' || f.clase === 'puerta-referencia') return 1;
      if (f.clase === 'puerta-franja-amarilla') return 2;
      if (f.tipo === 'polilinea') return 3;
      return 2;
    }
    return 3;
  };
  return formas.map((f, idx) => ({ f, idx, p: prioridad(f) }))
    .sort((a, b) => a.p - b.p || a.idx - b.idx)
    .map(x => x.f);
}

/** Separa textos consecutivos de cotas horizontales en una misma línea (p. ej. cadena de cintas en apilables). */
function escalonarCotasHorizontales(formas: FormaAlzado[], letraBase: number) {
  const grupos = new Map<number, CotaAlzado[]>();
  for (const f of formas) {
    if (f.tipo !== 'cota' || esVertical(f) || f.texto.giro) continue;
    const yClave = Math.round(f.linea);
    const g = grupos.get(yClave) ?? [];
    g.push(f);
    grupos.set(yClave, g);
  }
  const tam = letraBase * 0.85;
  for (const grupo of grupos.values()) {
    if (grupo.length < 3) continue;
    grupo.sort((a, b) => a.texto.x - b.texto.x);
    let finAnterior = -Infinity;
    let nivel = 0;
    for (const c of grupo) {
      const w = anchoArial(textoCotaMm(c), tam) + 4;
      const inicio = c.texto.x - w / 2;
      if (inicio < finAnterior) {
        nivel = (nivel + 1) % 2;
      } else {
        nivel = 0;
      }
      if (nivel === 1) {
        c.texto = { ...c.texto, y: c.texto.y - tam * 1.15 };
      }
      finAnterior = c.texto.x + w / 2;
    }
  }
}

/** Evita que textos de cotas verticales consecutivas muy cortas se pisen (p. ej. 83 y 150 en TGM rejilla). */
function separarCotasVerticalesCortas(formas: FormaAlzado[], letraBase: number) {
  const grupos = new Map<number, CotaAlzado[]>();
  for (const f of formas) {
    if (f.tipo !== 'cota' || !esVertical(f) || f.texto.giro) continue;
    const xClave = Math.round(f.linea);
    const g = grupos.get(xClave) ?? [];
    g.push(f);
    grupos.set(xClave, g);
  }
  const altoMin = letraBase * 1.05;
  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    grupo.sort((a, b) => a.texto.y - b.texto.y);
    for (let i = 1; i < grupo.length; i++) {
      const prev = grupo[i - 1], curr = grupo[i];
      if (curr.texto.y - prev.texto.y < altoMin) {
        const delta = (altoMin - (curr.texto.y - prev.texto.y)) / 2 + 0.5;
        prev.texto = { ...prev.texto, y: prev.texto.y - delta };
        curr.texto = { ...curr.texto, y: curr.texto.y + delta };
      }
    }
  }
}

function ajustarBeltsYPuertasLuz(p: Puerta, base: GeometriaAlzado, letra: string): GeometriaAlzado {
  const { F, H } = base;
  const esLuz = Boolean(p.puertasluz);
  const esTransp = p.puertasluz?.variante === 'transparente';
  const ofTxt = p.of.trim() || 'SIN OF';
  const formas = base.formas.map(f => ({ ...f })) as FormaAlzado[];
  const vista = { ...base.vista };

  // 1. En Belts y Puertas Luz (no transparente): recolocar el título principal en el mayor hueco libre, en una línea clara.
  if (!esTransp) {
    const idxTitulo = formas.findIndex(f => f.tipo === 'texto' && f.lineas[0] === `${letra}1`);
    if (idxTitulo >= 0) {
      const ple = p.modelo === 'PUERTAPLE';
      const tubos = ple ? alturasTubos(p) : p.entradas.map(e => e.altura);
      const altoEtDef = p.belts?.anchoEt ?? p.puertasluz?.anchoEt ?? 10;
      const obstaculos: Array<[number, number]> = [
        ...(ple ? [[0, p.apilable.bolsillo + 3] as [number, number]] : [[0, 6] as [number, number]]),
        ...p.entradas.map((e, i): [number, number] => {
          const y = H - (tubos[i] ?? e.altura);
          const a = (e.alto || altoEtDef) / 2 + 8;
          return [y - a, y + a];
        }),
        ...p.ventanas.map((v): [number, number] => [H - v.y - v.alto - 5, H - v.y + 5]),
        [H - (p.belts?.bajoEt ?? p.puertasluz?.altoFaldon ?? 16) - 8, H],
      ];
      const [y0, y1] = mayorTramoLibre(4, H - 4, obstaculos);
      const lineaUnica = [`${letra}1`, ...(p.cantidad > 1 ? [`X${p.cantidad}`] : []), 'REVÉS', ofTxt].join(' · ');
      const altoLibre = Math.max(10, y1 - y0);
      const tam = Math.min(13, Math.max(7.5, Math.min(altoLibre * 0.45, (F * 0.85) / anchoArial(lineaUnica, 1))));
      formas[idxTitulo] = {
        tipo: 'texto',
        x: F / 2,
        y: (y0 + y1) / 2 + tam * 0.35,
        lineas: [lineaUnica],
        ancla: 'middle',
        tamano: tam,
      };
    }
  }

  // 2. Ventanas individuales en Belts y Puertas Luz: cotas y textos exactamente como en las apilables.
  if (p.ventanas.length > 0 && !esTransp) {
    const esCotaVentanaVieja = (f: FormaAlzado) => {
      if (f.tipo !== 'cota') return false;
      return p.ventanas.some(v => {
        const vy = H - v.y - v.alto;
        const esH = !esVertical(f) && Math.abs(f.x1 - v.x) < 0.05 && Math.abs(f.x2 - (v.x + v.ancho)) < 0.05 && Math.abs(f.y1 - (vy + v.alto / 2)) < 0.05;
        const esV = esVertical(f) && Math.abs(f.x1 - (v.x + 10)) < 0.05 && Math.abs(f.y1 - vy) < 0.05 && Math.abs(f.y2 - (vy + v.alto)) < 0.05;
        return esH || esV;
      });
    };
    const filtradas = formas.filter(f => !esCotaVentanaVieja(f));
    formas.length = 0;
    formas.push(...filtradas, ...cotaEstiloApilableVentanas(p.ventanas, F, H));
  }

  // 3. Puertas Luz transparente: evitar solape de «3 CM (HUECOS)» con la cota 1990 y la raya roja,
  //    mostrar el alto de corte de cada tramo en su etiqueta y acotar el margen lateral real.
  if (esTransp && p.puertasluz) {
    const pl = p.puertasluz;
    const tramos = pl.tramosTransparentes ?? [];
    const margen = pl.margenLateral ?? 6;
    const hCuerpo = Math.max(40, H - pl.altoFaldon);
    let idxTramo = 0;
    for (const f of formas) {
      if (f.tipo === 'texto' && f.lineas[0]?.includes('TRANSP.')) {
        const hT = tramos[idxTramo];
        if (hT) {
          f.lineas = [`${f.lineas[0]} · ${medidaPuerta(hT)} mm`];
          f.y -= 4;
        }
        idxTramo++;
      } else if (f.tipo === 'texto' && f.lineas[0] === '3 CM (HUECOS)') {
        f.y += 5;
        f.tamano = Math.max(f.tamano ?? 5, 6);
      } else if (f.tipo === 'cota' && !esVertical(f) && Math.abs(f.x1 - (margen - 2)) < 0.05 && Math.abs(f.x2 - (F - margen + 2)) < 0.05) {
        f.linea -= 7;
        f.texto = { ...f.texto, y: f.linea - 3 };
      }
    }
    if (margen > 0 && hCuerpo > 30) {
      const yMargen = 16;
      formas.push(
        {
          tipo: 'cota', x1: 0, y1: yMargen, x2: margen, y2: yMargen, linea: yMargen, valor: margen,
          estilo: 'XERAL 5', marcas: 2, texto: { x: margen / 2, y: yMargen - 3, ancla: 'middle', clase: 'puerta-cota-texto' },
        },
        {
          tipo: 'cota', x1: F - margen, y1: yMargen, x2: F, y2: yMargen, linea: yMargen, valor: margen,
          estilo: 'XERAL 5', marcas: 2, texto: { x: F - margen / 2, y: yMargen - 3, ancla: 'middle', clase: 'puerta-cota-texto' },
        },
      );
    }
  }

  // 4. Belts enrollable: separar «DE ESTE LADO PISAR LAS E.T. 1 CM» de la cota de alto total (F + 54).
  for (const f of formas) {
    if (f.tipo === 'texto' && f.lineas[0]?.includes('PISAR LAS E.T.')) {
      f.x = F + 82;
      vista.ancho = Math.max(vista.ancho, f.x + 16 - vista.xMin);
    }
    // En etiquetas de E.T. y notas de taller muy pequeñas, mejorar legibilidad.
    if (f.tipo === 'texto' && f.tamano && f.tamano < 6.2) {
      f.tamano = 6.2;
    }
  }

  // 5. En Puertas Luz / Belts: separar el saco/faldón del borde inferior si las notas inferiores quedan apretadas.
  if (esLuz || p.belts) {
    vista.yMin = Math.min(vista.yMin, -46);
    vista.alto = Math.max(vista.alto, vista.alto + 8);
  }

  escalonarCotasHorizontales(formas, base.letraBase);
  separarCotasVerticalesCortas(formas, base.letraBase);
  return { ...base, formas: ordenarCapas(formas), vista };
}

function ajustarPortanovaYTgm(p: Puerta, resultado: ResultadoPuerta, base: GeometriaAlzado, letra: string): GeometriaAlzado {
  const { F, H } = base;
  const ple = p.modelo === 'PUERTAPLE';
  const enr = p.modelo === 'PUERTAENR';
  const auto = p.modelo === 'PUERTAUTO';
  const desnivel = desnivelSuelo(p);
  const sinSaco = enr && p.enrollable.sinSaco;
  const saco = sacoPuerta(p);
  const hSaco = auto || enr ? saco.rematado + 2 : saco.rematado;
  const hCota = enr ? saco.rematado : hSaco;
  const tubos = ple ? alturasTubos(p) : p.entradas.map(e => e.altura);

  let formas = base.formas.map(f => (
    f.tipo === 'cota'
      ? { ...f, texto: { ...f.texto } }
      : f.tipo === 'texto'
        ? { ...f, lineas: [...f.lineas], ...(f.taller ? { taller: { guia: f.taller.guia ? [...f.taller.guia] as [number, number, number, number] : null } } : {}) }
        : { ...f }
  )) as FormaAlzado[];
  const vista = { ...base.vista };

  // 1. Apilable sin cintas: quitar el texto «CORTES EN ENTRADA DE TUBO (SOLO POR REVÉS)» que sobra.
  const hayCintas = p.entradas.some(e => e.huecos.length > 2);
  if (ple && !hayCintas) {
    formas = formas.filter(f => !(f.tipo === 'texto' && f.lineas.join(' ').includes('CORTES EN ENTRADA DE TUBO')));
  }

  // 2. Ventanas individuales (apilable, enrollable con ventanas pequeñas, autorreparable):
  //    añadir el contorno del hueco interior (puerta-ventana) y las cotas limpias encima del cristal.
  if ((!enr || p.enrollable.ventanasPequenas) && p.ventanas.length > 0) {
    // Quitar cotas viejas de ventanas y sus rectángulos simples para reconstruirlos con cristal + hueco y cotas limpias.
    const ysVentana = new Set(p.ventanas.map(v => Math.round((H - v.y - v.alto / 2) * 10)));
    formas = formas.filter(f => {
      if (f.tipo === 'rect' && f.clase === 'puerta-cristal') return false;
      if (f.tipo === 'cota') {
        if (!esVertical(f) && ysVentana.has(Math.round(f.linea * 10))) return false;
        if (esVertical(f) && p.ventanas.some(v => Math.abs(f.x1 - (v.x + 12)) < 0.05 && Math.abs(f.y1 - (H - v.y - v.alto)) < 0.05)) return false;
      }
      return true;
    });
    for (const v of p.ventanas) {
      const vy = H - v.y - v.alto;
      formas.push(
        { tipo: 'rect', clase: 'puerta-cristal', x: v.x - 2, y: vy - 2, ancho: v.ancho + 4, alto: v.alto + 4, radio: v.radioCristal },
        { tipo: 'rect', clase: 'puerta-ventana', x: v.x, y: vy, ancho: v.ancho, alto: v.alto, radio: v.radio },
      );
    }
    formas.push(...cotaEstiloApilableVentanas(p.ventanas, F, H));

    // En autorreparable: acotar la altura desde el bajo hasta cada fila de ventanas (como el DWG AR2604526).
    if (auto) {
      const filas = new Map<number, Ventana[]>();
      for (const v of p.ventanas) {
        const k = Math.round(v.y * 100);
        filas.set(k, [...(filas.get(k) ?? []), v]);
      }
      for (const fila of filas.values()) {
        fila.sort((a, b) => a.x - b.x);
        const ultima = fila.at(-1)!;
        const x = ultima.x + ultima.ancho - 8;
        const yVent = H - ultima.y;
        if (ultima.y > 0) {
          formas.push({
            tipo: 'cota',
            x1: x, y1: yVent, x2: x, y2: H, linea: x, valor: ultima.y,
            estilo: 'XERAL 5', marcas: 2,
            texto: { x: x - 4, y: (yVent + H) / 2, ancla: 'end', clase: 'puerta-cota-texto' },
          });
        }
      }
    }

    // En enrollable con ventanas pequeñas: cadena izquierda de alturas de filas de ventanas desde el bajo (como el DWG).
    if (enr && p.enrollable.ventanasPequenas) {
      const ys = [0, ...new Set(p.ventanas.map(v => v.y).filter(y => y > 0 && y < H))].sort((a, b) => a - b);
      const xCadIzq = -44;
      for (let i = 1; i < ys.length; i++) {
        const y1 = H - ys[i], y2 = H - ys[i - 1];
        formas.push({
          tipo: 'cota',
          x1: 0, y1, x2: 0, y2, linea: xCadIzq, valor: ys[i] - ys[i - 1],
          estilo: 'XERAL 5', marcas: 3,
          texto: { x: xCadIzq - 5, y: (y1 + y2) / 2 + 2.5, ancla: 'end', clase: 'puerta-cota-texto' },
        });
      }
      if (vista.xMin > xCadIzq - 34) {
        const extra = vista.xMin - (xCadIzq - 34);
        vista.xMin -= extra;
        vista.ancho += extra;
      }
    }
  }

  // 3. Refuerzos inferiores en apilable: limpios en dos líneas, cada uno en su mitad, sin pisarse ni cruzar guías.
  if (ple && !desnivel) {
    formas = formas.filter(f => !(
      (f.tipo === 'texto' && f.lineas.join(' ').includes('REFUERZO DE'))
      || (f.tipo === 'linea' && f.clase === 'puerta-linea-guia' && Math.abs(f.y2 - (H - hSaco)) < 1)
    ));
    const yTuboBajo = tubos.length ? H - tubos[0] + (p.entradas[0]?.alto || 12) / 2 : H - 40;
    const ySacoTop = H - hSaco;
    const altoHueco = ySacoTop - yTuboBajo;
    const yRef = altoHueco >= 14 ? (yTuboBajo + ySacoTop) / 2 - 2 : ySacoTop - 9;
    const tamRef = Math.min(6.5, Math.max(4.8, (F * 0.42) / anchoArial('REFUERZO 150 mm A 100 mm DEL BORDE', 1)));
    for (const [x, anchoMm] of [[F * 0.26, 100], [F * 0.74, 150]] as const) {
      formas.push({
        tipo: 'texto',
        x, y: yRef,
        tamano: tamRef,
        ancla: 'middle',
        lineas: [`REFUERZO ${anchoMm} mm A 100 mm`, 'SOLDADO · LONA 2 mm'],
        taller: { guia: null },
      });
    }
  }

  // 4. Enrollable y TGM:
  //    - Separar «DE ESTE LADO PISAR LAS E.T.» de la cota del alto total.
  //    - Mover «CERRAR E.T / 2 CM MÁXIMO» debajo del pie derecho para no pisar la cota derecha.
  const tuboParteT = enr && p.enrollable.T > 0 && !panoContinuoEnrollable(p) && tubos.some(y => y > H - p.enrollable.T + 0.1 && y < H - 0.1);
  const xAltoTotalEnr = F + (tuboParteT ? 96 : 74);
  for (const f of formas) {
    if (f.tipo === 'texto' && f.lineas.join(' ').includes('PISAR LAS E.T.')) {
      f.x = xAltoTotalEnr + 30;
      vista.ancho = Math.max(vista.ancho, f.x + 18 - vista.xMin);
    }
    if (f.tipo === 'texto' && f.lineas.join(' ').includes('CERRAR E.T')) {
      f.x = F + 42;
      f.y = H + 20;
      f.tamano = Math.max(f.tamano ?? 5, 6);
      f.ancla = 'middle';
      if (f.taller) f.taller.guia = null;
      vista.ancho = Math.max(vista.ancho, f.x + 48 - vista.xMin);
    }
  }

  // 5. Autorreparable:
  //    - Mostrar A1 + REVÉS + OF centrados en el mayor hueco libre (como en el DWG AR2604526 / AR2604904).
  //    - Eliminar la cota duplicada del saco en F + 12 (ya viene en la cadena derecha F + 34).
  //    - Bajar las cotas del espaciador (100) a la zona baja libre y apartar el texto ESPACIADOR para que no se pise con 250 ni 100.
  if (auto) {
    const distancia = p.autorreparable.distanciaEspaciador ?? 10;
    const ofTxt = p.of.trim() || 'SIN OF';
    // Quitar cota duplicada de saco en F + 12 (ya está en cadena derecha F + 34)
    formas = formas.filter(f => !(
      f.tipo === 'cota' && esVertical(f) && Math.abs(f.linea - (F + 12)) < 0.5 && Math.abs(f.valor - hCota) < 0.1
    ));
    // Reemplazar A1 suelto por el bloque completo A1 / REVÉS / OF en el mayor hueco libre del primer paño
    const idxA1 = formas.findIndex(f => f.tipo === 'texto' && f.lineas.length === 1 && f.lineas[0] === `${letra}1`);
    if (idxA1 >= 0) {
      const finPano1 = resultado.uniones.length
        ? Math.min(...resultado.uniones.map(u => H - u.altura))
        : H - hSaco;
      const obs: Array<[number, number]> = p.ventanas
        .map((v): [number, number] => [H - v.y - v.alto - 8, H - v.y + 8]);
      const [y0, y1] = mayorTramoLibre(34, finPano1 - 6, obs);
      const altoH = Math.max(24, y1 - y0);
      const tam = Math.min(20, Math.max(10, Math.min(altoH / 4.4, (F - 2 * distancia - 40) * 0.7 / anchoArial(ofTxt, 1))));
      const xCentro = p.autorreparable.espaciadorCentral ? F * 0.72 : F / 2;
      formas[idxA1] = {
        tipo: 'texto',
        x: xCentro,
        y: (y0 + y1) / 2 - tam * 1.1,
        tamano: tam,
        ancla: 'middle',
        lineas: [`${letra}1`, 'REVÉS', ofTxt],
        taller: { guia: null },
      };
    }
    // Bajar cotas horizontales de distancia del espaciador (100 mm) a una franja libre cerca del bajo
    const yCotaEsp = H - hSaco - 12;
    for (const f of formas) {
      if (f.tipo === 'cota' && !esVertical(f) && Math.abs(f.valor - distancia) < 0.05 && Math.abs(f.linea - H * 0.62) < 1) {
        f.y1 = yCotaEsp;
        f.y2 = yCotaEsp;
        f.linea = yCotaEsp;
        f.marcas = 2;
        f.texto = { ...f.texto, y: yCotaEsp - 3.5 };
      }
      // Colocar ESPACIADOR ESPECIAL PORTANOVA en zona libre (arriba si hay ventanas a media altura)
      if (f.tipo === 'texto' && f.giro === -90 && f.lineas[0]?.includes('ESPACIADOR')) {
        const yEsp = p.ventanas.length > 0 ? Math.max(76, H * 0.28) : Math.min(f.y, H * 0.56);
        if (Math.abs(f.x - (distancia + 7)) < 3) {
          f.x = distancia + 10;
          f.y = yEsp;
        } else if (Math.abs(f.x - (F - distancia - 7)) < 3) {
          f.x = F - distancia - 10;
          f.y = yEsp;
        }
      }
      if (f.tipo === 'texto' && (f.lineas[0]?.includes('CORTADA DE 21') || f.lineas[0]?.includes('MAS LARGAS EN CADA LADO'))) {
        f.tamano = Math.max(f.tamano ?? 5, 6.2);
      }
    }
  }

  // 6. TGM:
  //    - Si OF / A1 / REVÉS cruzan el empate horizontal o alguna E.T. (caso rejilla 09), compactar el bloque en el tramo libre superior.
  //    - Con bastilla lateral, dar margen a xMin para que la cota superior izquierda (40) no se corte.
  if (p.tgm) {
    const bastilla = p.tgm.laterales === 'bastilla' ? p.tgm.bastilla ?? 0 : 0;
    if (bastilla > 0 && vista.xMin > -bastilla - 34) {
      const extra = vista.xMin - (-bastilla - 34);
      vista.xMin -= extra;
      vista.ancho += extra;
    }
    const ofTxt = p.of.trim() || 'SIN OF';
    const idxOf = formas.findIndex(f => f.tipo === 'texto' && f.lineas[0] === ofTxt);
    const idxReves = formas.findIndex(f => f.tipo === 'texto' && f.lineas[0] === 'REVÉS');
    const idxA1 = formas.findIndex(f => f.tipo === 'texto' && f.lineas[0] === `${letra}1`);
    if (idxOf >= 0 && idxReves >= 0 && idxA1 >= 0) {
      const tOf = formas[idxOf] as TextoAlzado;
      const tocaObstaculo = resultado.uniones.some(u => Math.abs((H - u.altura) - tOf.y) < 18)
        || tubos.some(t => Math.abs((H - t) - tOf.y) < 14)
        || Boolean(tOf.taller?.guia);
      if (tocaObstaculo) {
        const primerObstaculo = Math.min(
          H - 20,
          ...tubos.filter(t => t > 0 && t < H).map(t => H - t - (p.tgm?.anchoEt ?? 14.5) / 2 - 4),
          ...resultado.uniones.map(u => H - u.altura - 6),
        );
        const altoDisp = Math.max(24, primerObstaculo - 8);
        const tam = Math.min(20, Math.max(10, altoDisp / 4.2));
        const yCentro = 6 + altoDisp / 2;
        formas[idxA1] = { tipo: 'texto', x: F / 2, y: yCentro - tam * 1.15, tamano: tam, ancla: 'middle', lineas: [`${letra}1`], taller: { guia: null } };
        formas[idxReves] = { tipo: 'texto', x: F / 2, y: yCentro + tam * 0.15, tamano: tam, ancla: 'middle', lineas: ['REVÉS'], taller: { guia: null } };
        formas[idxOf] = { tipo: 'texto', x: F / 2, y: yCentro + tam * 1.45, tamano: tam, ancla: 'middle', lineas: [ofTxt], taller: { guia: null } };
      }
    }
    for (const f of formas) {
      if (f.tipo === 'texto' && f.lineas[0] === 'E.T. SÁNDWICH') {
        f.tamano = Math.max(f.tamano ?? 5, 7);
      }
    }
  }

  // 7. Saco desplegado abajo: sacar la cota del ancho (wSaco) debajo del saco para que no pise «SACO 900 GR...».
  if (!sinSaco && !desnivel) {
    const doble = ple && p.apilable.doble;
    const env = doble ? Math.max(20, F - 6) : F;
    const sacoPoli = formas.find(f => f.tipo === 'poligono' && f.clase === 'puerta-saco-pieza');
    if (sacoPoli && sacoPoli.tipo === 'poligono') {
      const ys = sacoPoli.puntos.map(pt => pt[1]);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      const altoSaco = y1 - y0;
      for (const f of formas) {
        // Cota del ancho del saco: antes estaba dentro (en y1 - 8), la movemos debajo del saco (y1 + 11)
        if (f.tipo === 'cota' && !esVertical(f) && Math.abs(f.linea - (y1 - 8)) < 1 && Math.abs(f.valor - env) < 1) {
          f.y1 = y1;
          f.y2 = y1;
          f.linea = y1 + 11;
          f.marcas = 3;
          f.texto = { ...f.texto, y: y1 + 11 - 2.5 };
        }
        // Rótulo del saco («SACO 900 GR...»): centrado verticalmente dentro del saco
        if (f.tipo === 'texto' && Math.abs(f.y - (y0 + 11)) < 2 && f.lineas[0]?.startsWith('SACO')) {
          f.y = y0 + altoSaco / 2 + (f.tamano ?? 10) * 0.32;
        }
        // Notas debajo del saco: darles aire para no chocar con la cota del ancho (y1 + 11)
        if (f.tipo === 'texto' && f.y > y1 + 2 && f.y < y1 + 65) {
          f.y += 14;
          if (f.tamano && f.tamano < 6.5) f.tamano = 6.5;
          if (f.taller?.guia) f.taller.guia = [f.taller.guia[0], f.taller.guia[1] + 14, f.taller.guia[2], f.taller.guia[3]];
        }
        // Nota de velcro superior del saco: subir tamaño mínimo en autorreparable
        if (f.tipo === 'texto' && f.y < y0 && f.y > y0 - 25 && f.lineas[0]?.includes('VELCRO')) {
          if (f.tamano && f.tamano < 6.5) f.tamano = 6.5;
        }
        // Pequeña cota de velcro abajo (3 o 4,5): desplazar ligeramente abajo para no chocar con la cota del ancho
        if (f.tipo === 'cota' && !esVertical(f) && Math.abs(f.y1 - y1) < 0.5 && f.valor < 10) {
          f.linea = y1 + 20;
          f.texto = { ...f.texto, y: y1 + 23 };
        }
      }
      vista.alto += 22;
    }
  }

  escalonarCotasHorizontales(formas, base.letraBase);
  separarCotasVerticalesCortas(formas, base.letraBase);
  return { ...base, formas: ordenarCapas(formas), vista };
}

function ajustarAraujo(base: GeometriaAlzado): GeometriaAlzado {
  const formas = base.formas.map(f => (
    f.tipo === 'cota' ? { ...f, texto: { ...f.texto } } : { ...f }
  )) as FormaAlzado[];
  // En bolsas estrechas de Araujo, garantizar que AL CORTE no quede microscópico y separar cotas 70 si se rozan.
  for (const f of formas) {
    if (f.tipo === 'texto' && f.lineas[0] === 'AL CORTE' && f.tamano && f.tamano < 5.5) {
      f.tamano = 5.5;
    }
  }
  separarCotasVerticalesCortas(formas, base.letraBase);
  const grupos = base.grupos?.map(g => ordenarCapas(g));
  return { ...base, formas: ordenarCapas(formas), ...(grupos ? { grupos } : {}) };
}

function ajustarSantaPau(base: GeometriaAlzado): GeometriaAlzado {
  const formas = base.formas.map(f => (
    f.tipo === 'cota' ? { ...f, texto: { ...f.texto } } : { ...f }
  )) as FormaAlzado[];
  // En el detalle derecho (tres cotas consecutivas de 50 mm), asegurar que los textos tengan separación mínima.
  const detalle50 = formas.filter(
    (f): f is CotaAlzado => f.tipo === 'cota' && esVertical(f) && Math.abs(f.valor - 5) < 0.05 && f.x1 > base.F,
  );
  if (detalle50.length >= 2) {
    for (const c of detalle50) {
      c.tamanoTexto = Math.min(c.tamanoTexto ?? 10, 7.5);
    }
  }
  return { ...base, formas: ordenarCapas(formas) };
}

/**
 * Geometría de pantalla en cm (el renderizador convierte los textos a mm) con correcciones de legibilidad,
 * orden de capas, ventanas estilo apilable y cotas limpias frente al DWG de referencia.
 */
export function geometriaPantallaPuerta(p: Puerta, resultado: ResultadoPuerta, letra = 'A'): GeometriaAlzado {
  const base = geometriaAlzado(p, resultado, letra);
  if (p.modelo === 'SYSTEMDOCK') return { ...base, formas: ordenarCapas(base.formas) };
  if (p.santapau) return ajustarSantaPau(base);
  if (p.araujo) return ajustarAraujo(base);
  if (p.belts || p.puertasluz) return ajustarBeltsYPuertasLuz(p, base, letra);
  return ajustarPortanovaYTgm(p, resultado, base, letra);
}
