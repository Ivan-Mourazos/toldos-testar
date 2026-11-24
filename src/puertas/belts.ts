import { alturasTubos } from './calcular.ts';
import { repartirPanos, type RepartoPanos } from './empates.ts';
import { flechaEmpate } from './marcasEmpate.ts';
import { numerarBorde } from './unionesCorte.ts';
import { panoContinuoEnrollable, ventanalesEnrollable } from './ventanalesEnrollable.ts';
import type { AvisoPuerta, Entrada, Hueco, PiezaPuerta, Puerta, ResultadoPuerta } from './tipos.ts';

const n = (x: number) => Math.round(x * 10000) / 10000;
const positivo = (x: number) => Number.isFinite(x) && x > 0 && x <= 3000;
const numero = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const seCruzan = (a: Hueco, b: Hueco) =>
  a.x < b.x + b.ancho - 0.001 && b.x < a.x + a.ancho - 0.001 && a.y < b.y + b.alto - 0.001 && b.y < a.y + a.alto - 0.001;

export const REGLAS_BELTS = {
  cabeceraVarillaAumento: 3.5,
  cabeceraVarillaMarca: 7,
  pestanaAncho: 3,
  altoSacoDefecto: 39,
  bajoEtEnrollable: 13,
  bajoEtApilable: 14,
  anchoEtEnrollable: 10,
  anchoEtApilable: 13.5,
  cintaAncho: 10,
  cintaAlto: 8,
  cintaRadio: 0.5,
} as const;

/** Crea los recortes de cintas para una E.T. de Belts Vigo: sin muescas laterales de 5 cm. */
export function huecosCintasBelts(xs: number[], altoEt: number, ancho: number, alto: number, radio = REGLAS_BELTS.cintaRadio): Hueco[] {
  const y = n((altoEt - alto) / 2);
  return xs.map(x => ({ x: n(x), y, ancho: n(ancho), alto: n(alto), radio: n(radio) }));
}

/** Cálculo contrastado para Belts Vigo (RPS 038908): enrollables y apilables. */
export function calcularBelts(p: Puerta): ResultadoPuerta {
  const piezas: PiezaPuerta[] = [];
  const avisos: AvisoPuerta[] = [];
  const aviso = (codigo: string, texto: string, nivel: AvisoPuerta['nivel'] = 'error') => {
    if (!avisos.some(a => a.codigo === codigo && a.texto === texto)) avisos.push({ codigo, texto, nivel });
  };
  const r: ResultadoPuerta = { version: 1, piezas, alternativasSaco: null, empates: [], uniones: [], bolsillo: null, avisos };
  const b0 = p.belts;
  if (!b0) {
    aviso('BELTS_CONFIG', 'Falta la configuración de Belts Vigo en la puerta.');
    return r;
  }
  const b = b0;
  if (p.modelo !== 'PUERTAENR' && p.modelo !== 'PUERTAPLE') {
    aviso('MODELO', 'La ficha de Belts Vigo solo tiene contrastadas enrollables y apilables.');
    return r;
  }
  if (!p.confirmada || !p.ventanasConfirmadas) {
    aviso('CONFIRMACION', 'Falta marcar «Confirmado con el dibujo»: comprueba medidas, tubos, ventanas y saco con el plano del cliente.');
  }
  if (!positivo(p.frente) || !positivo(p.alto)) aviso('MEDIDAS', 'Faltan el frente y el alto de la puerta (en cm).');
  if (!Number.isInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > 50) aviso('CANTIDAD', 'La cantidad tiene que ser un número entero entre 1 y 50.');
  if (!positivo(p.rollo)) aviso('ROLLO', 'Falta el ancho del rollo de lona.');
  if (!p.material.trim() || !p.color.trim()) aviso('MATERIAL', 'Faltan el material o el color de la lona.');
  if (!p.of.trim() || p.of.trim().toUpperCase() === 'SIN OF') aviso('SIN_OF', 'Sin OF: se puede revisar, pero no se guardan archivos hasta poner la OF.', 'aviso');
  if (!Number.isFinite(b.bajoEt) || b.bajoEt < 0 || b.bajoEt > 60) aviso('BAJO_ET', 'Revisa la bajada de la E.T. inferior del paño.');
  if (!positivo(b.altoSaco)) aviso('SACO', 'Indica el alto de corte del saco exterior (390 mm por defecto).');
  if (!positivo(b.anchoEt)) aviso('ANCHO_ET', 'Indica el ancho de corte de las entradas de tubo.');
  if (avisos.some(a => ['MEDIDAS', 'CANTIDAD', 'BAJO_ET', 'SACO', 'ANCHO_ET'].includes(a.codigo))) return r;

  const lona = `${p.material.trim()} ${p.color.trim()}`.trim();
  const pestana = b.pestana3 ? REGLAS_BELTS.pestanaAncho : 0;
  const marcaBajo = b.marcaBajoEt !== undefined && Number.isFinite(b.marcaBajoEt) ? b.marcaBajoEt : n(2 * b.bajoEt);
  let numeroUnion = 0;

  function pieza(nombre: string, clase: PiezaPuerta['clase'], w: number, h: number, material = lona, rollo = p.rollo, cantidad = 1): PiezaPuerta {
    return {
      id: `belts-${clase}-${piezas.length}-${nombre}`,
      nombre, clase, ancho: n(w), alto: n(h), material, rollo, cantidad: cantidad * p.cantidad,
      of: p.of.trim() || 'SIN OF', radio: 0,
      contorno: [[0, 0], [n(w), 0], [n(w), n(h)], [0, n(h)]],
      marcas: [], textos: [], huecos: [],
    };
  }
  const agregar = (x: PiezaPuerta) => { piezas.push(x); return x; };

  function aplicarPestanaInferior(x: PiezaPuerta, altoPestana: number) {
    if (!pestana) return;
    const w = n(p.frente + pestana), h = x.alto;
    const hp = Math.min(h, Math.max(4, n(altoPestana || 2 * b.bajoEt || 24)));
    x.ancho = w;
    x.contorno = [[0, 0], [w, 0], [w, h], [pestana, h], [pestana, hp], [0, hp]];
    x.marcas = x.marcas.map(([x1, y1, x2, y2]) => [n(x1 + pestana), y1, n(x2 + pestana), y2]);
    x.huecos = x.huecos.map(q => ({ ...q, x: n(q.x + pestana) }));
    x.unionesCorte = x.unionesCorte?.map(u => ({ ...u, x: n(u.x + pestana) }));
    if (x.origenAlzado) x.origenAlzado = [n(x.origenAlzado[0] - pestana), x.origenAlzado[1]];
  }

  function marca(x: PiezaPuerta, y: number, direccion?: 1 | -1, desfaseX = 0) {
    y = n(y);
    const m = p.margenMarcas;
    if (y < 0 || y > x.alto) return;
    if (x.marcas.some(s => Math.abs(s[1] - y) < 0.001 && Math.abs(s[3] - y) < 0.001 && Math.abs(s[2] - s[0]) > p.frente / 2)) return;
    x.marcas.push([n(desfaseX + m), y, n(desfaseX + p.frente - m), y]);
    if (direccion) {
      const cx = n(desfaseX + p.frente / 2), base = n(y + direccion), punta = n(base + direccion * 1.53205);
      x.marcas.push([cx, y, cx, base], [n(cx - 0.8), base, n(cx + 0.8), base], [n(cx - 0.8), base, cx, punta], [cx, punta, n(cx + 0.8), base]);
    }
  }

  function comprobarHueco(v: Hueco, w: number, h: number, nombre: string) {
    if (![v.x, v.y, v.ancho, v.alto, v.radio].every(Number.isFinite) || !positivo(v.ancho) || !positivo(v.alto)
      || v.radio < 0 || 2 * v.radio > Math.min(v.ancho, v.alto) || v.x < 0 || v.y < 0
      || v.x + v.ancho > w + 0.01 || v.y + v.alto > h + 0.01) {
      aviso('HUECO', `${nombre}: hueco o radio fuera de la pieza.`);
    }
  }

  const paneles: Array<{ pieza: PiezaPuerta; desde: number; hasta: number; tienePestana: boolean }> = [];
  function panel(nombre: string, desde: number, hasta: number) {
    const x = agregar(pieza(nombre, 'pano', p.frente, hasta - desde));
    x.origenAlzado = [0, desde];
    if (p.modelo === 'PUERTAENR' && p.enrollable.ventanasPequenas) x.rotulosEnHueco = true;
    paneles.push({ pieza: x, desde, hasta, tienePestana: false });
    return x;
  }

  function reparto(plan: RepartoPanos, nombre: string) {
    if (plan.error) aviso('EMPATE', plan.error);
    const numeros = plan.uniones.map(() => ++numeroUnion);
    for (const [i, t] of plan.tramos.entries()) {
      const x = panel(`${nombre}${plan.tramos.length > 1 ? ` ${i + 1}` : ''}`, t.desde, t.hasta);
      if (t.unionInferior !== undefined) {
        const u = plan.uniones[t.unionInferior];
        if (u.tubo) marca(x, u.solape, -1);
        else { marca(x, u.solape); x.marcas.push(...flechaEmpate(p.frente / 2, u.solape, -1)); }
        if (!u.tubo) numerarBorde(x, numeros[t.unionInferior], 'abajo');
      }
      if (t.unionSuperior !== undefined) {
        const u = plan.uniones[t.unionSuperior];
        if (!u.tubo) numerarBorde(x, numeros[t.unionSuperior], 'arriba');
        if (u.tubo && p.entradas[u.tubo - 1]) {
          x.huecos.push(...p.entradas[u.tubo - 1].huecos.map(h => ({ ...h, y: n(x.alto - u.solape + h.y) })));
          (x.entradasIncorporadas ??= []).push({ tubo: u.tubo, y: n(x.alto - u.solape / 2), alto: u.solape });
        }
      }
    }
  }

  function entrada(e: Entrada, i: number) {
    const alto = e.alto || b.anchoEt;
    const x = agregar(pieza(`Entrada de tubo ${i + 1}`, 'entrada', e.largo || p.frente, alto));
    x.huecos = e.huecos.map(h => ({ ...h }));
    x.origenAlzado = [0, n(e.altura - alto / 2)];
  }

  if (p.modelo === 'PUERTAENR') {
    const e = p.enrollable;
    const ciega = panoContinuoEnrollable(p);
    const aumentoArriba = b.cabecera === 'varilla' ? REGLAS_BELTS.cabeceraVarillaAumento : 0;
    const origenInferior = n(-b.bajoEt);
    const anchoEfectivo = n(p.frente + pestana);

    // Ventanales con cachos laterales (tipo AR2505965) usando el ancho de E.T. real de Belts Vigo
    const ventanalesBase = ciega ? [] : ventanalesEnrollable(p);
    const solapeEt = b.anchoEt;
    const altoVentanales = ventanalesBase.reduce((s, v) => s + v.D, 0);
    const bordeSuperior = n(p.alto - e.T - (e.sinEtArriba ? 0 : solapeEt / 2));
    const bordeInferior = n(p.alto - e.T - altoVentanales + (e.sinEtAbajo ? 0 : solapeEt / 2));

    if (!ciega && (!positivo(e.T) || ventanalesBase.some(v => !positivo(v.D) || !positivo(v.margen) || 2 * v.margen >= p.frente) || e.T + altoVentanales >= p.alto)) {
      aviso('VENTANAL', 'Revisa T, las cotas de los ventanales y los márgenes laterales.');
    }

    const etVentanal = (t: Entrada) => !ciega && (
      Boolean(e.sinEtArriba) && Math.abs(t.altura - (p.alto - e.T)) < 0.01
      || Boolean(e.sinEtAbajo) && Math.abs(t.altura - (p.alto - e.T - altoVentanales)) < 0.01
    );
    const incorporadas = new Set<number>();

    const panos = ciega
      ? [['inferior', n(p.alto + aumentoArriba - origenInferior), origenInferior, anchoEfectivo]] as const
      : [
          ['superior', n(p.alto + aumentoArriba - bordeSuperior), bordeSuperior, p.frente],
          ['inferior', n(bordeInferior - origenInferior), origenInferior, anchoEfectivo],
        ] as const;

    for (const [nombre, h, origen, anchoPlan] of panos) {
      const manual = e.empates.filter(u => u.pano === nombre);
      const tubos = p.entradas
        .map((t, i) => ({ eje: n(t.altura - origen), solape: t.alto || solapeEt, tubo: i + 1 }))
        .filter(t => !etVentanal(p.entradas[t.tubo - 1]));
      const indicados = manual.map(u => ({ eje: u.altura, solape: u.solape, tubo: u.tubo }));
      const plan = repartirPanos({ desde: 0, hasta: h, frente: anchoPlan, rollo: p.rollo, tubos, normal: true, indicados: indicados.length ? indicados : undefined });
      const antes = paneles.length;
      reparto(plan, ciega ? 'Paño' : `Paño ${nombre}`);
      r.uniones.push(...plan.uniones.map(u => ({ altura: n(u.eje + origen), solape: u.solape, tubo: u.tubo })));
      plan.uniones.forEach(u => { if (u.tubo) incorporadas.add(u.tubo); });
      const grupo = paneles.slice(antes);
      for (const pan of grupo) {
        pan.desde = n(pan.desde + origen);
        pan.hasta = n(pan.hasta + origen);
        pan.pieza.origenAlzado = [0, pan.desde];
      }
      const marcarEn = (y: number, dir?: 1 | -1) => {
        const pan = grupo.find(t => y >= t.desde - 0.001 && y <= t.hasta + 0.001);
        if (pan) marca(pan.pieza, y - pan.desde, dir);
      };
      if (nombre === 'inferior' && marcaBajo > 0) marcarEn(origen + marcaBajo);
      else if (nombre === 'superior' && !e.sinEtArriba) marcarEn(origen + solapeEt, -1);

      if ((ciega || nombre === 'superior') && b.cabecera === 'varilla') marcarEn(origen + h - REGLAS_BELTS.cabeceraVarillaMarca);
      else if (nombre === 'inferior' && !ciega && !e.sinEtAbajo) marcarEn(origen + h - solapeEt, 1);

      for (const [i, t] of p.entradas.entries()) {
        if (plan.uniones.some(u => u.tubo === i + 1) || etVentanal(t)) continue;
        const aEt = t.alto || solapeEt;
        const y = n(t.altura - aEt / 2);
        if (y > origen + 0.5 && y < origen + h - 0.5) {
          // Evitar marcar encima de la línea de cabecera o borde del ventanal
          if (!ciega && Math.abs(t.altura - (p.alto - e.T)) < 0.05) continue;
          if (!ciega && Math.abs(t.altura - (p.alto - e.T - altoVentanales)) < 0.05) continue;
          marcarEn(y, 1);
        }
      }
    }

    // Cristales, cachos y E.T. entre ventanales (como AR2505965)
    if (!ciega && ventanalesBase.length > 0) {
      let eje = p.alto - e.T;
      for (let i = 0; i < ventanalesBase.length; i++) {
        const v = ventanalesBase[i];
        const altoCristal = n(v.D - solapeEt + 4);
        agregar(pieza(ventanalesBase.length > 1 ? `Cristal del ventanal ${i + 1}` : 'Cristal del ventanal', 'cristal', p.frente - 2 * v.margen + 4, altoCristal, p.materialCristal, p.rolloCristal));
        agregar(pieza(ventanalesBase.length > 1 ? `Cachos laterales · ventanal ${i + 1}` : 'Cachos laterales', 'cacho', v.margen + 1, altoCristal, lona, p.rollo, 2));
        if (i < ventanalesBase.length - 1) {
          eje = n(eje - v.D);
          agregar(pieza(`Entrada entre ventanales ${i + 1} · delantera`, 'entrada', p.frente, solapeEt));
          agregar(pieza(`Entrada entre ventanales ${i + 1} · trasera`, 'entrada', p.frente, solapeEt));
          p.entradas.forEach((t, j) => { if (Math.abs(t.altura - eje) < 0.01) incorporadas.add(j + 1); });
        }
      }
    }

    p.entradas.forEach((t, i) => {
      if (!incorporadas.has(i + 1) && !etVentanal(t)) entrada(t, i);
    });
  } else {
    // APILABLE Belts Vigo
    const a = p.apilable;
    const alturas = alturasTubos(p);
    if (!positivo(a.pie) || !positivo(a.cabecera) || a.pasos.some(x => !positivo(x)) || Math.abs(alturas.at(-1)! + a.cabecera - p.alto) > 0.05) {
      aviso('CADENA', `La cadena del dibujo (pie + pasos + cabecera) suma ${numero((alturas.at(-1) ?? 0) + a.cabecera)} cm y el alto es ${numero(p.alto)} cm: tienen que coincidir.`);
    }
    if (p.entradas.length !== alturas.length) aviso('ENTRADAS', 'Falta una entrada de tubo por cada tubo de la cadena.');
    if (!positivo(a.bolsillo)) aviso('BOLSILLO', 'Falta el bolsillo superior del dibujo.');

    const bajo = n(-b.bajoEt);
    const arriba = n(p.alto + a.bolsillo / 2);
    const anchoEfectivo = n(p.frente + pestana);
    const tubos = alturas.map((eje, i) => ({ eje, solape: p.entradas[i]?.alto || b.anchoEt, tubo: i + 1 }));
    let empates = a.empates === null ? null : [...a.empates];
    if (empates && (new Set(empates).size !== empates.length || empates.some((v, i) => !Number.isInteger(v) || v < 1 || v > alturas.length || (i > 0 && v <= empates![i - 1])))) {
      aviso('EMPATE', 'Los tubos de empate deben existir, estar ordenados y no repetirse.');
      empates = [];
    }
    const plan = repartirPanos({ desde: bajo, hasta: arriba, frente: anchoEfectivo, rollo: p.rollo, tubos, indicados: empates?.map(t => tubos[t - 1]) });
    reparto(plan, 'Paño');
    empates = plan.uniones.flatMap(u => (u.tubo ? [u.tubo] : []));
    r.empates = empates;
    r.uniones.push(...plan.uniones.map(u => ({ altura: u.eje, solape: u.solape, tubo: u.tubo })));

    for (const [i, e] of p.entradas.entries()) {
      const altoE = e.alto || b.anchoEt;
      if (!empates.includes(i + 1)) entrada({ ...e, alto: altoE }, i);
      for (const pan of paneles) {
        const y = n(alturas[i] - altoE / 2 - pan.desde);
        if (y >= 0 && y <= pan.pieza.alto && !empates.includes(i + 1)) marca(pan.pieza, y, 1);
      }
    }
    const ultimo = paneles.at(-1)?.pieza;
    if (ultimo) marca(ultimo, ultimo.alto - a.bolsillo);
    const primero = paneles[0]?.pieza;
    if (primero && marcaBajo > 0) marca(primero, marcaBajo);
  }

  // Ventanas individuales (enrollable con ventanas pequeñas o apilable)
  for (const [i, v] of p.ventanas.entries()) {
    if (p.modelo === 'PUERTAENR' && !p.enrollable.ventanasPequenas) {
      aviso('VENTANA_MODELO', 'Elige ventanas individuales para introducir huecos en la enrollable.');
      break;
    }
    if (v.x < 0 || v.x + v.ancho > p.frente + 0.01 || v.y < 0 || v.y + v.alto > p.alto + 0.01) {
      aviso('VENTANA_FRENTE', `Ventana ${i + 1}: no cabe dentro del frente o del alto.`);
    }
    comprobarHueco(v, p.frente, p.alto, `Ventana ${i + 1}`);
    if (p.ventanas.slice(0, i).some(o => seCruzan(o, v))) aviso('VENTANAS_SOLAPADAS', `Ventana ${i + 1}: se solapa con otra ventana.`);
    const destino = paneles.find(x => v.y >= x.desde - 0.01 && v.y + v.alto <= x.hasta + 0.01);
    if (!destino) aviso('VENTANA_EMPATE', `Ventana ${i + 1}: cruza un empate o un remate del paño.`);
    else destino.pieza.huecos.push({ ...v, y: n(v.y - destino.desde) });
    const cristal = agregar(pieza(`Cristal ${i + 1}`, 'cristal', v.ancho + 4, v.alto + 4, p.materialCristal, p.rolloCristal));
    cristal.radio = v.radioCristal;
  }

  // Pestaña lateral de 3 cm en el paño más bajo (el que contiene el bajo terminado)
  const masBajo = paneles.sort((a, c) => a.desde - c.desde)[0];
  if (masBajo && pestana > 0) {
    aplicarPestanaInferior(masBajo.pieza, marcaBajo);
    masBajo.tienePestana = true;
  }

  // Saco exterior rectangular SIN pestaña (ancho exacto F × altoSaco)
  const saco = agregar(pieza('Saco', 'saco', p.frente, b.altoSaco, p.materialSaco, p.rolloSaco));
  if (p.sacoDiagonalesAmarillas) saco.sacoDiagonalesAmarillas = true;

  // Comprobación final de rollo y piezas
  for (const x of piezas) {
    if (!positivo(x.ancho) || !positivo(x.alto)) aviso('PIEZA', `${x.nombre}: las medidas de corte deben ser positivas.`);
    if (!positivo(x.rollo)) aviso('ROLLO_MATERIAL', `Introduce el ancho real del rollo de ${x.material}.`);
    else if (Math.min(x.ancho, x.alto) > x.rollo + 0.01) aviso('NO_CABE', `${x.nombre}: no cabe en el rollo de ${numero(x.rollo)} cm.`);
    if (!x.material.trim()) aviso('MATERIAL', `${x.nombre}: falta el material.`);
    x.huecos.forEach(h => comprobarHueco(h, x.ancho, x.alto, x.nombre));
  }
  return r;
}
