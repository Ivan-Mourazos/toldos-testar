import { alturasTubos } from './calcular.ts';
import { repartirPanos, type RepartoPanos } from './empates.ts';
import { flechaEmpate } from './marcasEmpate.ts';
import { numerarBorde } from './unionesCorte.ts';
import type { AvisoPuerta, Entrada, Hueco, PiezaPuerta, Puerta, ResultadoPuerta } from './tipos.ts';

const n = (x: number) => Math.round(x * 10000) / 10000;
const positivo = (x: number) => Number.isFinite(x) && x > 0 && x <= 3000;
const numero = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 2 });
const seCruzan = (a: Hueco, b: Hueco) =>
  a.x < b.x + b.ancho - 0.001 && b.x < a.x + a.ancho - 0.001 && a.y < b.y + b.alto - 0.001 && b.y < a.y + a.alto - 0.001;

export const REGLAS_PUERTAS_LUZ = {
  altoSacoArena: 22,
  pisarSacoArena: 3,
  pestanaAncho: 3,
  varillaAumento: 3.5,
  varillaMarca: 7,
  bdAumento: 4.5,
  bdMarca: 9,
  anchoEtApilable: 12,
  anchoEtEnrollable: 9,
  cintaAncho: 8,
  cintaAlto: 7.5,
  cintaRadio: 0.5,
  tiraCabeceraTransp: 13.5,
  tiraUnionTransp: 20,
  tiraPieTransp: 10,
} as const;

/** Crea los recortes de cintas para Puertas Luz: sin muescas laterales de 5 cm (8 × 7,5 cm R0,5 en 2026). */
export function huecosCintasPuertasLuz(xs: number[], altoEt: number, ancho: number = REGLAS_PUERTAS_LUZ.cintaAncho, alto: number = REGLAS_PUERTAS_LUZ.cintaAlto): Hueco[] {
  const y = n((altoEt - alto) / 2);
  return xs.map(x => ({ x: n(x), y, ancho: n(ancho), alto: n(alto), radio: REGLAS_PUERTAS_LUZ.cintaRadio }));
}

/** Cálculo contrastado para Fabricados La Selva · Puertas Luz (RPS 052082). */
export function calcularPuertasLuz(p: Puerta): ResultadoPuerta {
  const piezas: PiezaPuerta[] = [];
  const avisos: AvisoPuerta[] = [];
  const aviso = (codigo: string, texto: string, nivel: AvisoPuerta['nivel'] = 'error') => {
    if (!avisos.some(a => a.codigo === codigo && a.texto === texto)) avisos.push({ codigo, texto, nivel });
  };
  const r: ResultadoPuerta = { version: 1, piezas, alternativasSaco: null, empates: [], uniones: [], bolsillo: null, avisos };
  const pl0 = p.puertasluz;
  if (!pl0) {
    aviso('LUZ_CONFIG', 'Falta la configuración de Puertas Luz en la puerta.');
    return r;
  }
  const pl = pl0;
  if (!p.confirmada || !p.ventanasConfirmadas) {
    aviso('CONFIRMACION', 'Falta marcar «Confirmado con el dibujo»: comprueba medidas, tubos, ventanas, faldón y saco de arena con el croquis del cliente.');
  }
  if (!positivo(p.frente) || !positivo(p.alto)) aviso('MEDIDAS', 'Faltan el frente y el alto de la puerta (en cm).');
  if (!Number.isInteger(p.cantidad) || p.cantidad < 1 || p.cantidad > 50) aviso('CANTIDAD', 'La cantidad tiene que ser un número entero entre 1 y 50.');
  if (!positivo(p.rollo)) aviso('ROLLO', 'Falta el ancho del rollo de lona.');
  if (!p.material.trim() || !p.color.trim()) aviso('MATERIAL', 'Faltan el material o el color de la lona.');
  if (!p.of.trim() || p.of.trim().toUpperCase() === 'SIN OF') aviso('SIN_OF', 'Sin OF: se puede revisar, pero no se guardan archivos hasta poner la OF.', 'aviso');
  if (!positivo(pl.altoFaldon)) aviso('FALDON', 'Indica el alto visible del faldón inferior (150, 180 o 350 mm).');
  if (!Number.isFinite(pl.extraAnchoFaldon) || pl.extraAnchoFaldon < 0 || pl.extraAnchoFaldon > 20) aviso('FALDON_ANCHO', 'Revisa el margen de ancho del faldón.');
  if (avisos.some(a => ['MEDIDAS', 'CANTIDAD', 'FALDON', 'FALDON_ANCHO'].includes(a.codigo))) return r;

  const lona = `${p.material.trim()} ${p.color.trim()}`.trim();
  const materialArena = pl.materialSacoArena.trim() || lona;
  let numeroUnion = 0;

  function pieza(nombre: string, clase: PiezaPuerta['clase'], w: number, h: number, material = lona, rollo = p.rollo, cantidad = 1): PiezaPuerta {
    return {
      id: `luz-${clase}-${piezas.length}-${nombre}`,
      nombre, clase, ancho: n(w), alto: n(h), material, rollo, cantidad: cantidad * p.cantidad,
      of: p.of.trim() || 'SIN OF', radio: 0,
      contorno: [[0, 0], [n(w), 0], [n(w), n(h)], [0, n(h)]],
      marcas: [], textos: [], huecos: [],
    };
  }
  const agregar = (x: PiezaPuerta) => { piezas.push(x); return x; };

  function agregarSacos() {
    const anchoFaldon = n(p.frente + pl.extraAnchoFaldon);
    const altoFaldonCorte = n(2 * pl.altoFaldon);
    const faldon = agregar(pieza('Faldón exterior', 'saco', anchoFaldon, altoFaldonCorte, p.materialSaco, p.rolloSaco));
    if (p.sacoDiagonalesAmarillas) faldon.sacoDiagonalesAmarillas = true;

    if (pl.sacoArena) {
      const anchoArena = n(p.frente - pl.descuentoSacoArena);
      if (!positivo(anchoArena)) {
        aviso('SACO_ARENA', 'El ancho del saco de arena debe ser positivo.');
        return;
      }
      const hArena = REGLAS_PUERTAS_LUZ.altoSacoArena;
      const arena = agregar(pieza('Saco para arena', 'saco', anchoArena, hArena, materialArena, p.rollo));
      arena.sacoDiagonalesAmarillas = false;
      const ySol = n(hArena - pl.soldaduraSacoArena);
      if (ySol > 0 && ySol < hArena) arena.marcas.push([0, ySol, anchoArena, ySol]);
      const xPisar = REGLAS_PUERTAS_LUZ.pisarSacoArena;
      if (xPisar < anchoArena) arena.marcas.push([xPisar, 0, xPisar, hArena]);
    }
  }

  // --- VARIANTE 1: ENROLLABLE TRANSPARENTE (AR2604660, AR2603463, AR2602586, AR2501810 L4/L5) ---
  if (pl.variante === 'transparente') {
    const margen = pl.margenLateral ?? 6;
    const tramos = pl.tramosTransparentes ?? [];
    if (!positivo(margen) || 2 * margen >= p.frente) {
      aviso('MARGEN_LATERAL', 'Revisa el margen lateral de lona (60 mm en puertas estrechas, 150 mm en anchas).');
      return r;
    }
    if (!tramos.length || tramos.some(h => !positivo(h))) {
      aviso('TRAMOS_TRANSP', 'Indica los altos de corte de cada tramo transparente (de arriba abajo).');
      return r;
    }
    const anchoCristal = n(p.frente - 2 * margen + 4);
    const anchoTiraLateral = n(margen + 1);
    for (const [i, hTramo] of tramos.entries()) {
      agregar(pieza(`Tramo transparente ${i + 1}`, 'cristal', anchoCristal, hTramo, p.materialCristal, p.rolloCristal));
      agregar(pieza(`Tira lateral tramo ${i + 1}`, 'cacho', anchoTiraLateral, hTramo, lona, p.rollo, 2));
    }
    // Cabecera de lona con varilla negra 4,5 (13,5 cm estándar; 22,5 cm en AR2604660, editable)
    const altoCab = pl.altoCabecera && positivo(pl.altoCabecera) ? pl.altoCabecera : REGLAS_PUERTAS_LUZ.tiraCabeceraTransp;
    const cab = agregar(pieza('Cabecera varilla', 'pano', p.frente, altoCab, lona, p.rollo));
    cab.marcas.push([p.margenMarcas, n(cab.alto - REGLAS_PUERTAS_LUZ.varillaMarca), n(p.frente - p.margenMarcas), n(cab.alto - REGLAS_PUERTAS_LUZ.varillaMarca)]);
    // Tiras horizontales entre tramos (20 cm con marca a 14,5 + E.T. de 9 cm)
    const nUniones = Math.max(0, tramos.length - 1);
    for (let i = 0; i < nUniones; i++) {
      const union = agregar(pieza(`Unión transparente ${i + 1}`, 'pano', p.frente, REGLAS_PUERTAS_LUZ.tiraUnionTransp, lona, p.rollo));
      union.marcas.push([p.margenMarcas, 14.5, n(p.frente - p.margenMarcas), 14.5]);
      agregar(pieza(`Entrada de tubo ${i + 1}`, 'entrada', p.frente, pl.anchoEt || REGLAS_PUERTAS_LUZ.anchoEtEnrollable, lona, p.rollo));
    }
    // Pie de unión al saco de 350 (10 cm, marca a 2,5)
    const pie = agregar(pieza('Pie unión saco', 'pano', p.frente, REGLAS_PUERTAS_LUZ.tiraPieTransp, lona, p.rollo));
    pie.marcas.push([p.margenMarcas, 2.5, n(p.frente - p.margenMarcas), 2.5]);

    agregarSacos();
    for (const x of piezas) {
      if (Math.min(x.ancho, x.alto) > x.rollo + 0.01) aviso('NO_CABE', `${x.nombre}: no cabe en el rollo de ${numero(x.rollo)} cm.`);
    }
    return r;
  }

  // --- VARIANTES DE LONA: APILABLE Y ENROLLABLE DE LONA ---
  const pestana = pl.pestana3 ? REGLAS_PUERTAS_LUZ.pestanaAncho : 0;
  const paneles: Array<{ pieza: PiezaPuerta; desde: number; hasta: number }> = [];

  function marca(x: PiezaPuerta, y: number, direccion?: 1 | -1) {
    y = n(y);
    const m = p.margenMarcas;
    if (y < 0 || y > x.alto) return;
    if (x.marcas.some(s => Math.abs(s[1] - y) < 0.001 && Math.abs(s[3] - y) < 0.001 && Math.abs(s[2] - s[0]) > p.frente / 2)) return;
    x.marcas.push([m, y, n(p.frente - m), y]);
    if (direccion) {
      const cx = n(p.frente / 2), base = n(y + direccion), punta = n(base + direccion * 1.53205);
      x.marcas.push([cx, y, cx, base], [n(cx - 0.8), base, n(cx + 0.8), base], [n(cx - 0.8), base, cx, punta], [cx, punta, n(cx + 0.8), base]);
    }
  }

  function aplicarPestanaInferior(x: PiezaPuerta, altoPestana: number) {
    if (!pestana) return;
    const w = n(p.frente + pestana), h = x.alto;
    const hp = Math.min(h, Math.max(4, n(altoPestana || 23)));
    x.ancho = w;
    x.contorno = [[0, 0], [w, 0], [w, h], [pestana, h], [pestana, hp], [0, hp]];
    x.marcas = x.marcas.map(([x1, y1, x2, y2]) => [n(x1 + pestana), y1, n(x2 + pestana), y2]);
    x.huecos = x.huecos.map(q => ({ ...q, x: n(q.x + pestana) }));
    x.unionesCorte = x.unionesCorte?.map(u => ({ ...u, x: n(u.x + pestana) }));
    if (x.origenAlzado) x.origenAlzado = [n(x.origenAlzado[0] - pestana), x.origenAlzado[1]];
  }

  function comprobarHueco(v: Hueco, w: number, h: number, nombre: string) {
    if (![v.x, v.y, v.ancho, v.alto, v.radio].every(Number.isFinite) || !positivo(v.ancho) || !positivo(v.alto)
      || v.radio < 0 || 2 * v.radio > Math.min(v.ancho, v.alto) || v.x < 0 || v.y < 0
      || v.x + v.ancho > w + 0.01 || v.y + v.alto > h + 0.01) {
      aviso('HUECO', `${nombre}: hueco o radio fuera de la pieza.`);
    }
  }

  function panel(nombre: string, desde: number, hasta: number) {
    const x = agregar(pieza(nombre, 'pano', p.frente, hasta - desde));
    x.origenAlzado = [0, desde];
    x.rotulosEnHueco = true;
    paneles.push({ pieza: x, desde, hasta });
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
    const alto = e.alto || pl.anchoEt;
    const x = agregar(pieza(`Entrada de tubo ${i + 1}`, 'entrada', e.largo || p.frente, alto));
    x.huecos = e.huecos.map(h => ({ ...h }));
    x.origenAlzado = [0, n(e.altura - alto / 2)];
  }

  if (pl.variante === 'apilable') {
    const a = p.apilable;
    const alturas = alturasTubos(p);
    if (!positivo(a.pie) || !positivo(a.cabecera) || a.pasos.some(x => !positivo(x)) || Math.abs(alturas.at(-1)! + a.cabecera - p.alto) > 0.05) {
      aviso('CADENA', `La cadena del dibujo (pie + pasos + cabecera) suma ${numero((alturas.at(-1) ?? 0) + a.cabecera)} cm y el alto es ${numero(p.alto)} cm: tienen que coincidir.`);
    }
    if (p.entradas.length !== alturas.length) aviso('ENTRADAS', 'Falta una entrada de tubo por cada tubo de la cadena.');
    if (!positivo(a.bolsillo)) aviso('BOLSILLO', 'Falta el bolsillo superior del dibujo.');

    const bajo = n(-pl.bajoEt);
    const arriba = n(p.alto + a.bolsillo / 2);
    const anchoEfectivo = n(p.frente + pestana);
    const tubos = alturas.map((eje, i) => ({ eje, solape: p.entradas[i]?.alto || pl.anchoEt, tubo: i + 1 }));
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
      const altoE = e.alto || pl.anchoEt;
      if (!empates.includes(i + 1)) entrada({ ...e, alto: altoE }, i);
      for (const pan of paneles) {
        const y = n(alturas[i] - altoE / 2 - pan.desde);
        if (y >= 0 && y <= pan.pieza.alto && !empates.includes(i + 1)) marca(pan.pieza, y, 1);
      }
    }
    const ultimo = paneles.at(-1)?.pieza;
    if (ultimo) marca(ultimo, ultimo.alto - a.bolsillo);
    const primero = paneles[0]?.pieza;
    if (primero) marca(primero, n(pl.bajoEt + pl.altoFaldon));
  } else {
    // ENROLLABLE DE LONA (AR2600326, AR2501810 L3, AR2406937 L3)
    const aumentoArriba = pl.cabecera === 'bd' ? REGLAS_PUERTAS_LUZ.bdAumento : REGLAS_PUERTAS_LUZ.varillaAumento;
    const marcaArriba = pl.cabecera === 'bd' ? REGLAS_PUERTAS_LUZ.bdMarca : REGLAS_PUERTAS_LUZ.varillaMarca;
    const origenInferior = pl.bajoEt > 0 ? n(-pl.bajoEt) : pl.altoFaldon;
    const arriba = n(p.alto + aumentoArriba);
    const anchoEfectivo = n(p.frente + pestana);
    const tubos = p.entradas.map((t, i) => ({ eje: t.altura, solape: t.alto || pl.anchoEt, tubo: i + 1 }));
    const plan = repartirPanos({ desde: origenInferior, hasta: arriba, frente: anchoEfectivo, rollo: p.rollo, tubos, normal: true });
    reparto(plan, 'Paño');
    const incorporadas = new Set(plan.uniones.flatMap(u => (u.tubo ? [u.tubo] : [])));
    r.empates = [...incorporadas];
    r.uniones.push(...plan.uniones.map(u => ({ altura: u.eje, solape: u.solape, tubo: u.tubo })));

    for (const [i, e] of p.entradas.entries()) {
      const altoE = e.alto || pl.anchoEt;
      if (!incorporadas.has(i + 1)) entrada({ ...e, alto: altoE }, i);
      for (const pan of paneles) {
        const y = n(e.altura - altoE / 2 - pan.desde);
        if (y >= 0 && y <= pan.pieza.alto && !incorporadas.has(i + 1)) marca(pan.pieza, y, 1);
      }
    }
    const ultimo = paneles.at(-1)?.pieza;
    if (ultimo) marca(ultimo, ultimo.alto - marcaArriba);
    const primero = paneles[0]?.pieza;
    if (primero) marca(primero, pl.bajoEt > 0 ? n(pl.bajoEt + pl.altoFaldon) : 2);
  }

  // Ventanas individuales
  for (const [i, v] of p.ventanas.entries()) {
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

  // Pestaña lateral de 3 cm en el paño más bajo
  const masBajo = [...paneles].sort((a, c) => a.desde - c.desde)[0];
  if (masBajo && pestana > 0) aplicarPestanaInferior(masBajo.pieza, n(pl.bajoEt + pl.altoFaldon));

  // Faldón exterior + saco para arena
  agregarSacos();

  for (const x of piezas) {
    if (!positivo(x.ancho) || !positivo(x.alto)) aviso('PIEZA', `${x.nombre}: las medidas de corte deben ser positivas.`);
    if (!positivo(x.rollo)) aviso('ROLLO_MATERIAL', `Introduce el ancho real del rollo de ${x.material}.`);
    else if (Math.min(x.ancho, x.alto) > x.rollo + 0.01) aviso('NO_CABE', `${x.nombre}: no cabe en el rollo de ${numero(x.rollo)} cm.`);
    if (!x.material.trim()) aviso('MATERIAL', `${x.nombre}: falta el material.`);
    x.huecos.forEach(h => comprobarHueco(h, x.ancho, x.alto, x.nombre));
  }
  return r;
}
