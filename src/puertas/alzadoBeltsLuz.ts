import { alturasTubos } from './calcular.ts';
import { REGLAS_PUERTAS_LUZ } from './puertasluz.ts';
import { rotuloSaco } from './saco.ts';
import { panoContinuoEnrollable, ventanalesEnrollable } from './ventanalesEnrollable.ts';
import type { CotaAlzado, FormaAlzado, GeometriaAlzado } from './alzado.ts';
import type { Puerta, ResultadoPuerta } from './tipos.ts';

function cotaH(x1: number, x2: number, y: number, linea: number, estilo: CotaAlzado['estilo'] = 'XERAL', sufijo?: string): CotaAlzado {
  const valor = Math.abs(x2 - x1);
  return {
    tipo: 'cota', x1, y1: y, x2, y2: y, linea, valor, sufijo, estilo, marcas: 4,
    texto: { x: (x1 + x2) / 2, y: linea - 3, ancla: 'middle', clase: 'puerta-cota-texto' },
  };
}
function cotaV(x: number, y1: number, y2: number, linea: number, estilo: CotaAlzado['estilo'] = 'XERAL', sufijo?: string): CotaAlzado {
  const valor = Math.abs(y2 - y1);
  const izq = linea < x;
  return {
    tipo: 'cota', x1: x, y1, x2: x, y2, linea, valor, sufijo, estilo, marcas: 4,
    texto: { x: linea + (izq ? -8 : 8), y: (y1 + y2) / 2, ancla: izq ? 'end' : 'start', giro: -90, clase: 'puerta-cota-texto' },
  };
}

/** Alzado en cm (y hacia abajo, compatible con SVG y con escribirPlanoAraujo para DWG/DXF) de Belts Vigo. */
export function alzadoBelts(p: Puerta, r: ResultadoPuerta, letra = 'A'): GeometriaAlzado {
  const F = p.frente > 0 ? p.frente : 300;
  const H = p.alto > 0 ? p.alto : 400;
  const b = p.belts!;
  const ple = p.modelo === 'PUERTAPLE';
  const enr = p.modelo === 'PUERTAENR';
  const formas: FormaAlzado[] = [];
  const letraBase = Math.min(10, Math.max(7, Math.min(F / 28, H / 42)));

  // Contorno del cuerpo
  formas.push({ tipo: 'rect', clase: 'puerta-lona', x: 0, y: 0, ancho: F, alto: H });
  // Pestaña 3 cm y E.T. inferior integrada
  if (b.bajoEt > 0) {
    formas.push({ tipo: 'rect', clase: 'puerta-referencia', x: b.pestana3 ? -3 : 0, y: H - b.bajoEt, ancho: F + (b.pestana3 ? 3 : 0), alto: b.bajoEt });
    formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: 0, y1: H - b.bajoEt, x2: F, y2: H - b.bajoEt });
    formas.push({ tipo: 'texto', x: F / 2, y: H - b.bajoEt / 2 + 2, lineas: [b.etiquetaEtInferior || 'E.T. INFERIOR'], ancla: 'middle', tamano: Math.min(5.5, b.bajoEt * 0.45) });
    if (b.pestana3) {
      formas.push({ tipo: 'texto', x: -3, y: H + 11, lineas: ['DEJAR 3 CM MÁS PARA CERRAR DESPUÉS E.T'], ancla: 'start', tamano: 5 });
      formas.push({ tipo: 'texto', x: F + 2, y: H + 11, lineas: ['CERRAR E.T · 2 CM MÁXIMO'], ancla: 'end', tamano: 5 });
    }
  }

  // Cabecera
  if (enr) {
    if (b.cabecera === 'varilla') {
      formas.push({ tipo: 'linea', clase: 'puerta-referencia', x1: 0, y1: 0, x2: F, y2: 0 });
      formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: p.margenMarcas, y1: 3.5, x2: F - p.margenMarcas, y2: 3.5 });
      formas.push({ tipo: 'texto', x: F / 2, y: -7, lineas: ['VARILLA NEGRA (4,5)'], ancla: 'middle', tamano: 6.5 });
    } else {
      formas.push({ tipo: 'texto', x: F / 2, y: -7, lineas: ['AL CORTE'], ancla: 'middle', tamano: 6.5 });
    }
  } else {
    formas.push({ tipo: 'rect', clase: 'puerta-referencia', x: 0, y: 0, ancho: F, alto: p.apilable.bolsillo });
    formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: p.margenMarcas, y1: p.apilable.bolsillo / 2, x2: F - p.margenMarcas, y2: p.apilable.bolsillo / 2 });
    formas.push({ tipo: 'texto', x: F / 2, y: -7, lineas: [b.etiquetaEt || 'E.T Ø40 mm'], ancla: 'middle', tamano: 6.5 });
  }

  // Laterales AL CORTE y notas de Belts
  formas.push({ tipo: 'texto', x: -7, y: H * 0.22, lineas: ['AL CORTE'], ancla: 'middle', giro: -90, tamano: 6 });
  formas.push({ tipo: 'texto', x: F + 7, y: H * 0.22, lineas: ['AL CORTE'], ancla: 'middle', giro: -90, tamano: 6 });
  if (enr && b.pisarEt1cm) {
    formas.push({ tipo: 'texto', x: F + 76, y: H / 2, lineas: ['DE ESTE LADO PISAR LAS E.T. 1 CM'], ancla: 'middle', giro: -90, tamano: 7 });
  }

  // Entradas de tubo
  const tubos = ple ? alturasTubos(p) : p.entradas.map(e => e.altura);
  const tocaVentana = (y: number, altoE: number) => p.ventanas.some(v => {
    const vy0 = H - v.y - v.alto, vy1 = H - v.y;
    return y + altoE / 2 + 12 >= vy0 && y - altoE / 2 - 4 <= vy1;
  });
  let etiquetaVelcroPuesta = false;
  for (const [i, e] of p.entradas.entries()) {
    const eje = tubos[i] ?? e.altura;
    const altoE = e.alto || b.anchoEt;
    const y = H - eje;
    formas.push({ tipo: 'rect', clase: 'puerta-referencia', x: 0, y: y - altoE / 2, ancho: F, alto: altoE });
    formas.push({ tipo: 'linea', clase: 'puerta-eje', x1: 0, y1: y, x2: F, y2: y, trazos: '4 3' });
    formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: p.margenMarcas, y1: y + altoE / 2, x2: F - p.margenMarcas, y2: y + altoE / 2 });
    if (!tocaVentana(y, altoE) && !e.huecos.length) {
      formas.push({ tipo: 'texto', x: F / 2, y: y + altoE / 2 + 7, lineas: [b.etiquetaEt || `E.T ${altoE} CM`], ancla: 'middle', tamano: Math.min(5.5, altoE * 0.5) });
      if (enr && b.cierreVelcro && !etiquetaVelcroPuesta) {
        formas.push({ tipo: 'texto', x: F - 6, y: y + altoE / 2 + 7, lineas: ['CIERRE VELCRO (3)'], ancla: 'end', tamano: 4.5 });
        etiquetaVelcroPuesta = true;
      }
    }
    formas.push(cotaV(0, y - altoE / 2, y + altoE / 2, -16, 'XERAL 5'));
    for (const h of e.huecos) {
      formas.push({ tipo: 'rect', clase: 'puerta-ventana', x: h.x, y: y - altoE / 2 + h.y, ancho: h.ancho, alto: h.alto, radio: h.radio });
    }
  }

  // Ventanales (si enrollable con ventanal)
  if (enr && !panoContinuoEnrollable(p) && p.enrollable.T > 0) {
    const vs = ventanalesEnrollable(p);
    let yT = p.enrollable.T;
    for (const v of vs) {
      const altoVis = Math.max(4, v.D - b.anchoEt);
      const yIni = yT + b.anchoEt / 2;
      formas.push({ tipo: 'rect', clase: 'puerta-cristal', x: v.margen, y: yIni, ancho: Math.max(4, F - 2 * v.margen), alto: altoVis });
      formas.push(cotaH(v.margen - 2, F - v.margen + 2, yIni + altoVis / 2, yIni + altoVis / 2, 'XERAL 5'));
      yT += v.D;
    }
  }

  // Ventanas individuales
  for (const v of p.ventanas) {
    const vy = H - v.y - v.alto;
    formas.push({ tipo: 'rect', clase: 'puerta-ventana', x: v.x, y: vy, ancho: v.ancho, alto: v.alto, radio: v.radio });
    formas.push({ tipo: 'rect', clase: 'puerta-cristal', x: v.x - 2, y: vy - 2, ancho: v.ancho + 4, alto: v.alto + 4, radio: v.radioCristal });
    formas.push(cotaH(v.x, v.x + v.ancho, vy + v.alto / 2, vy + v.alto / 2, 'XERAL 5'));
    formas.push(cotaV(v.x + 10, vy, vy + v.alto, v.x + 10, 'XERAL 5'));
  }

  // Identificación de paños (REVÉS, OF, cantidad, A1/A2…)
  const ofTxt = p.of.trim() || 'SIN OF';
  const yTitulo = Math.min(H * 0.14, 50);
  formas.push({
    tipo: 'texto', x: F / 2, y: yTitulo,
    lineas: [`${letra}1`, ...(p.cantidad > 1 ? [`X${p.cantidad}`] : []), 'REVÉS', ofTxt],
    ancla: 'middle', tamano: Math.min(12, F / 24),
  });

  // Cotas principales: frente, cadena derecha y alto total
  formas.push(cotaH(0, F, 0, -26, 'XERA 15'));
  const hitos = [...new Set([0, ...tubos.filter(y => y > 0 && y < H), H])].sort((a, c) => a - c);
  hitos.slice(1).forEach((y, i) => {
    formas.push(cotaV(F, H - y, H - hitos[i], F + 26, 'XERAL'));
  });
  formas.push(cotaV(F, 0, H, F + 54, 'XERA 15'));

  // Saco exterior desplegado rectangular sin pestaña
  const ySaco = H + 28;
  formas.push({ tipo: 'rect', clase: 'puerta-referencia', x: 0, y: ySaco, ancho: F, alto: b.altoSaco });
  formas.push({ tipo: 'texto', x: F / 2, y: ySaco + b.altoSaco / 2 + 3, lineas: [rotuloSaco(p)], ancla: 'middle', tamano: Math.min(9, b.altoSaco * 0.35) });
  formas.push(cotaH(0, F, ySaco + b.altoSaco, ySaco + b.altoSaco + 10, 'XERAL 5'));
  formas.push(cotaV(0, ySaco, ySaco + b.altoSaco, -18, 'XERAL 5'));

  const xMin = -55;
  const xMax = F + (enr && b.pisarEt1cm ? 95 : 75);
  const yMin = -48;
  const yMax = ySaco + b.altoSaco + 28;
  return { formas, vista: { xMin, yMin, ancho: xMax - xMin, alto: yMax - yMin }, letraBase, F, H };
}

/** Alzado en cm (y hacia abajo, compatible con SVG y con escribirPlanoAraujo para DWG/DXF) de Puertas Luz. */
export function alzadoPuertasLuz(p: Puerta, _r: ResultadoPuerta, letra = 'A'): GeometriaAlzado {
  const F = p.frente > 0 ? p.frente : 300;
  const H = p.alto > 0 ? p.alto : 400;
  const pl = p.puertasluz!;
  const formas: FormaAlzado[] = [];
  const letraBase = Math.min(10, Math.max(7, Math.min(F / 28, H / 42)));
  const ofTxt = p.of.trim() || 'SIN OF';

  if (pl.variante === 'transparente') {
    const margen = pl.margenLateral ?? 6;
    const tramos = pl.tramosTransparentes ?? [92, 88, 59.5];
    const hCuerpo = Math.max(40, H - pl.altoFaldon);
    formas.push({ tipo: 'rect', clase: 'puerta-lona', x: 0, y: 0, ancho: F, alto: hCuerpo });
    formas.push({ tipo: 'rect', clase: 'puerta-referencia', x: 0, y: hCuerpo, ancho: F, alto: pl.altoFaldon });
    formas.push({ tipo: 'texto', x: F / 2, y: -7, lineas: ['VARILLA NEGRA (4,5)'], ancla: 'middle', tamano: 6.5 });
    formas.push({ tipo: 'texto', x: -7, y: hCuerpo * 0.3, lineas: ['AL CORTE'], ancla: 'middle', giro: -90, tamano: 6 });
    formas.push({ tipo: 'texto', x: F + 7, y: hCuerpo * 0.3, lineas: ['AL CORTE'], ancla: 'middle', giro: -90, tamano: 6 });
    formas.push({ tipo: 'texto', x: F / 2, y: hCuerpo + pl.altoFaldon / 2 + 2, lineas: [`SACO DE ${Math.round(pl.altoFaldon * 10)}`], ancla: 'middle', tamano: 7 });

    const sumaTramos = tramos.reduce((s, v) => s + v, 0) || 1;
    let yCursor = 8;
    const utilH = Math.max(20, hCuerpo - 16);
    for (const [i, hT] of tramos.entries()) {
      const hVis = (hT / sumaTramos) * utilH;
      formas.push({ tipo: 'rect', clase: 'puerta-cristal', x: margen, y: yCursor, ancho: Math.max(4, F - 2 * margen), alto: Math.max(8, hVis - 6) });
      formas.push({ tipo: 'texto', x: F / 2, y: yCursor + hVis / 2, lineas: [i === 0 ? `${ofTxt} · TRANSP. 1` : `TRANSP. ${i + 1}`], ancla: 'middle', tamano: Math.min(9, F / 24) });
      formas.push(cotaH(margen - 2, F - margen + 2, yCursor + hVis - 10, yCursor + hVis - 10, 'XERAL 5'));
      if (i < tramos.length - 1) {
        const yEt = yCursor + hVis - 3;
        formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: 0, y1: yEt, x2: F, y2: yEt });
        formas.push({ tipo: 'texto', x: F / 2, y: yEt + 2, lineas: ['3 CM (HUECOS)'], ancla: 'middle', tamano: 5 });
      }
      yCursor += hVis;
    }
    formas.push(cotaH(0, F, 0, -24, 'XERA 15'));
    formas.push(cotaV(F, 0, hCuerpo, F + 24, 'XERAL'));
    formas.push(cotaV(F, hCuerpo, H, F + 24, 'XERAL'));
    formas.push(cotaV(F, 0, H, F + 50, 'XERA 15'));
  } else {
    const ple = pl.variante === 'apilable';
    formas.push({ tipo: 'rect', clase: 'puerta-lona', x: 0, y: 0, ancho: F, alto: H });
    formas.push({ tipo: 'rect', clase: 'puerta-referencia', x: pl.pestana3 ? -3 : 0, y: H - pl.altoFaldon, ancho: F + (pl.pestana3 ? 3 : 0), alto: pl.altoFaldon });
    formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: 0, y1: H - pl.altoFaldon, x2: F, y2: H - pl.altoFaldon });
    formas.push({ tipo: 'texto', x: F / 2, y: H - pl.altoFaldon - 4, lineas: ['SOLDAR SACO 2CM'], ancla: 'middle', tamano: 5.5 });
    formas.push({ tipo: 'texto', x: -4, y: H + 12, lineas: ['DEJAR 3 CM MÁS PARA CERRAR DESPUÉS E.T'], ancla: 'start', tamano: 5 });
    formas.push({ tipo: 'texto', x: F + 4, y: H + 12, lineas: ['CERRAR E.T · 2 CM MÁXIMO'], ancla: 'end', tamano: 5 });

    if (ple) {
      formas.push({ tipo: 'rect', clase: 'puerta-referencia', x: 0, y: 0, ancho: F, alto: p.apilable.bolsillo });
      formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: p.margenMarcas, y1: p.apilable.bolsillo / 2, x2: F - p.margenMarcas, y2: p.apilable.bolsillo / 2 });
      formas.push({ tipo: 'texto', x: F / 2, y: -7, lineas: ['E.T Ø40 mm'], ancla: 'middle', tamano: 6.5 });
    } else {
      formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: p.margenMarcas, y1: pl.cabecera === 'bd' ? 4.5 : 3.5, x2: F - p.margenMarcas, y2: pl.cabecera === 'bd' ? 4.5 : 3.5 });
      formas.push({ tipo: 'texto', x: F / 2, y: -7, lineas: [pl.cabecera === 'bd' ? 'BD (4.5)' : 'VARILLA NEGRA (4,5)'], ancla: 'middle', tamano: 6.5 });
    }

    const tubos = ple ? alturasTubos(p) : p.entradas.map(e => e.altura);
    const tocaVentana = (y: number, altoE: number) => p.ventanas.some(v => {
      const vy0 = H - v.y - v.alto, vy1 = H - v.y;
      return y + altoE / 2 + 12 >= vy0 && y - altoE / 2 - 4 <= vy1;
    });
    let rotulosEt = 0;
    for (const [i, e] of p.entradas.entries()) {
      const eje = tubos[i] ?? e.altura;
      const altoE = e.alto || pl.anchoEt;
      const y = H - eje;
      formas.push({ tipo: 'rect', clase: 'puerta-referencia', x: 0, y: y - altoE / 2, ancho: F, alto: altoE });
      formas.push({ tipo: 'linea', clase: 'puerta-eje', x1: 0, y1: y, x2: F, y2: y, trazos: '4 3' });
      formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: p.margenMarcas, y1: y + altoE / 2, x2: F - p.margenMarcas, y2: y + altoE / 2 });
      if (!tocaVentana(y, altoE) && !e.huecos.length && rotulosEt < 2) {
        formas.push({ tipo: 'texto', x: F / 2, y: y + altoE / 2 + 7, lineas: [ple ? 'E.T Ø40 mm' : '3 CM (HUECOS)'], ancla: 'middle', tamano: Math.min(5.5, altoE * 0.45) });
        rotulosEt++;
      }
      formas.push(cotaV(0, y - altoE / 2, y + altoE / 2, -16, 'XERAL 5'));
      for (const h of e.huecos) {
        formas.push({ tipo: 'rect', clase: 'puerta-ventana', x: h.x, y: y - altoE / 2 + h.y, ancho: h.ancho, alto: h.alto, radio: h.radio });
      }
    }

    for (const v of p.ventanas) {
      const vy = H - v.y - v.alto;
      formas.push({ tipo: 'rect', clase: 'puerta-ventana', x: v.x, y: vy, ancho: v.ancho, alto: v.alto, radio: v.radio });
      formas.push({ tipo: 'rect', clase: 'puerta-cristal', x: v.x - 2, y: vy - 2, ancho: v.ancho + 4, alto: v.alto + 4, radio: v.radioCristal });
      formas.push(cotaH(v.x, v.x + v.ancho, vy + v.alto / 2, vy + v.alto / 2, 'XERAL 5'));
      formas.push(cotaV(v.x + 10, vy, vy + v.alto, v.x + 10, 'XERAL 5'));
    }

    formas.push({
      tipo: 'texto', x: F / 2, y: Math.min(H * 0.14, 48),
      lineas: [`${letra}1`, ...(p.cantidad > 1 ? [`X${p.cantidad}`] : []), 'REVÉS', ofTxt],
      ancla: 'middle', tamano: Math.min(11, F / 26),
    });

    formas.push(cotaH(0, F, 0, -24, 'XERA 15'));
    const hitos = [...new Set([0, pl.altoFaldon, ...tubos.filter(y => y > pl.altoFaldon && y < H), H])].sort((a, c) => a - c);
    hitos.slice(1).forEach((y, i) => formas.push(cotaV(F, H - y, H - hitos[i], F + 24, 'XERAL')));
    formas.push(cotaV(F, 0, H, F + 52, 'XERA 15'));
  }

  // Faldón exterior desplegado
  const wFaldon = F + pl.extraAnchoFaldon;
  const hFaldon = 2 * pl.altoFaldon;
  const yFaldon = H + 28;
  formas.push({ tipo: 'rect', clase: 'puerta-referencia', x: 0, y: yFaldon, ancho: wFaldon, alto: hFaldon });
  formas.push({ tipo: 'texto', x: wFaldon / 2, y: yFaldon + hFaldon / 2 + 3, lineas: [rotuloSaco(p)], ancla: 'middle', tamano: Math.min(9, hFaldon * 0.32) });
  formas.push(cotaH(0, wFaldon, yFaldon + hFaldon, yFaldon + hFaldon + 8, 'XERAL 5'));
  formas.push(cotaV(0, yFaldon, yFaldon + hFaldon, -18, 'XERAL 5'));

  // Saco interior para arena (22 cm)
  let yFondo = yFaldon + hFaldon + 20;
  if (pl.sacoArena) {
    const wArena = Math.max(20, F - pl.descuentoSacoArena);
    const hArena = REGLAS_PUERTAS_LUZ.altoSacoArena;
    const yArena = yFondo + 14;
    const solTxt = pl.soldaduraSacoArena.toLocaleString('es-ES', { maximumFractionDigits: 1 });
    formas.push({ tipo: 'rect', clase: 'puerta-referencia', x: 0, y: yArena, ancho: wArena, alto: hArena });
    formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: 0, y1: yArena + pl.soldaduraSacoArena, x2: wArena, y2: yArena + pl.soldaduraSacoArena });
    formas.push({ tipo: 'linea', clase: 'puerta-marca', x1: REGLAS_PUERTAS_LUZ.pisarSacoArena, y1: yArena, x2: REGLAS_PUERTAS_LUZ.pisarSacoArena, y2: yArena + hArena });
    formas.push({ tipo: 'texto', x: wArena / 2, y: yArena - 5, lineas: [`SOLDAR ${solTxt}CM PARA CERRAR EL CILINDRO`], ancla: 'middle', tamano: 5 });
    formas.push({ tipo: 'texto', x: wArena / 2, y: yArena + hArena / 2 + 2, lineas: [(pl.materialSacoArena || `${p.material} ${p.color}`).replace(/^LAC\s*900\s*/i, 'SACO 900 GR ')], ancla: 'middle', tamano: 6 });
    formas.push({ tipo: 'texto', x: wArena / 2, y: yArena + hArena + 8, lineas: ['SACO PARA CLIENTE RELLENE DE ARENA · PISAR 3CM'], ancla: 'middle', tamano: 5 });
    formas.push(cotaH(0, wArena, yArena + hArena, yArena + hArena + 22, 'XERAL 5'));
    formas.push(cotaV(0, yArena, yArena + hArena, -18, 'XERAL 5'));
    yFondo = yArena + hArena + 34;
  }

  return {
    formas,
    vista: { xMin: -52, yMin: -44, ancho: Math.max(F, wFaldon) + 130, alto: yFondo + 52 },
    letraBase, F, H,
  };
}
