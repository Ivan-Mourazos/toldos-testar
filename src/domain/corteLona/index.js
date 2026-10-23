import { calculateOrder } from '../rules.js';
import { normalizeOrder } from '../validation.js';
import { resolveFabric } from '../fabricCatalog.js';
import { shortFabricName } from '../fabricShortName.js';
import { awningLetter } from '../awningCompleteness.js';
import { corteReadiness, motivoCorteManual } from '../corteReadiness.js';
import { opcionesCorte, PRESUPUESTO_TETRIS } from './colocacion.js';
import { dibujo } from './dibujoCorte.js';
import { escribirDxf2004 } from './dxfCorte.js';
import { dibujarPlano } from './plano.js';
import { escribirDxfPlano } from './presentacion.js';
import { textoSeguro } from './texto.js';
import { piezasCortina } from './cortina.js';
import { configuredCurtainVelcroHeight, curtainWindowDrawingHeight, normalizeCurtainConfiguration } from '../curtainConfiguration.js';

export const OF_PROVISIONAL = 'SIN OF';

/**
 * Genera, sin escribir archivos, los cortes y planos por tela de un pedido de la web.
 * Ajustes por id de toldo (preferido), OF o letra. Medidas de los ajustes en cm,
 * salvo varillaArribaMm y varillaTiraMm. Cada opción es una lista por material;
 * trozoSeparado vale null cuando ninguna tela tiene paño pequeño.
 * El servidor debe guardar los cortes con Buffer.from(dxf, 'latin1') y los planos en UTF-8.
 */
export function generarCorteLona(order, { ajustes = {}, ofStockSacos } = {}) {
  if (!/^\d{7}$/.test(String(ofStockSacos || ''))) throw new Error('Indica la OF de stock de los sacos con sus siete cifras.');
  // Vista previa sin OF (Iván, 21/10/2026: «ver una vista previa del corte» de un pedido inventado): el cálculo agrupa
  // por OF, así que el toldo sin OF se calcula con «SIN OF» en sus piezas. Nunca se escriben archivos así
  // (`sinOf`, ver corteLonaArchivos.js).
  const sinOf = (order.awnings ?? []).flatMap((t, i) => (String(t.of ?? '').trim() ? [] : [awningLetter(i)]));
  const orden = normalizeOrder(sinOf.length
    ? { ...order, awnings: order.awnings.map((t) => (String(t.of ?? '').trim() ? t : { ...t, of: OF_PROVISIONAL })) }
    : order);
  const calculo = calculateOrder(orden);
  const avisos = sinOf.map((letra) => `Toldo ${letra}: sin OF, es solo una vista previa; escribe la OF antes de guardarlo.`);
  const grupos = new Map();
  const modelos = new Set();
  const agregar = (t, tela) => {
    const clave = `${tela.code}|${t.anchoRollo}`;
    if (!grupos.has(clave)) grupos.set(clave, { codigoTela: tela.code, anchoRollo: t.anchoRollo * 10,
      material: tela.nombreCorte ?? shortFabricName(tela.description).replace(/^LONA /, '').replace(/\s*:\d+ AN$/, ''), toldos: [] });
    grupos.get(clave).toldos.push(t);
  };
  const avisar = (letra, of, mensaje) => avisos.push(`Toldo ${letra}, OF ${of || 'sin indicar'}: ${mensaje}`);
  for (const [i, toldo] of orden.awnings.entries()) {
    const letra = awningLetter(i);
    if (!corteReadiness(toldo.model).ready) {
      avisar(letra, toldo.of, 'el corte de este modelo está pendiente.');
      continue;
    }
    const manual = motivoCorteManual(toldo);
    if (manual) {
      avisar(letra, toldo.of, manual);
      continue;
    }
    const tela = resolveFabric(orden.sameFabric ? orden.fabric : toldo.fabric);
    if (tela?.material?.trim().toUpperCase() !== 'PLASTICA (LONA)') {
      avisar(letra, toldo.of, 'esta fase solo corta lona de PVC (PLASTICA (LONA)).');
      continue;
    }
    const bloque = calculo.ofs.find((o) => o.awningIndex === i);
    const c = bloque?.calculation;
    if (!c || c.valid === false || calculo.diagnostics.some((d) => d.level === 'error' && d.awningId === toldo.id)) {
      avisar(letra, toldo.of, 'completa o corrige el planteamiento antes de generar el corte.');
      continue;
    }
    if (![c.fabricWidth, c.fabricDrop, c.fabricRollWidth].every((v) => Number.isFinite(v) && v > 0)) {
      avisar(letra, toldo.of, 'faltan medidas válidas de la lona o del rollo.');
      continue;
    }
    const t = {
      letra, of: bloque.of, modelo: toldo.model, cambioTela: toldo.workType !== 'FULL_AWNING',
      frenteTela: c.fabricWidth, caidaTela: c.fabricDrop, anchoRollo: c.fabricRollWidth,
      bamba: toldo.hasValance && !toldo.valanceFabric ? Number(toldo.valanceHeight) : 0,
      unidades: Number(toldo.units), tela: c.fabricDescription,
      ajustes: ajustes[toldo.id] ?? ajustes[toldo.of] ?? ajustes[letra] ?? {},
      ...(toldo.model === 'CORTINA' ? { cortina: datosCortina(toldo) } : {})
    };
    let cristal = [];
    if (t.cortina) {
      // Lo que no se puede fabricar se avisa y ese toldo queda fuera, sin parar el resto del pedido.
      try {
        const piezas = piezasCortina(t);
        cristal = piezas.cristal;
        avisos.push(...piezas.avisos.map((a) => `Toldo ${letra}, OF ${t.of}: ${a}`));
      } catch (error) {
        avisar(letra, toldo.of, error.message);
        continue;
      }
    }
    agregar(t, { code: c.fabricCode || tela.code, description: c.fabricDescription });
    if (cristal.length) agregar({ ...t, soloCristal: true, anchoRollo: CRISTAL.ancho, anchoRolloLona: t.anchoRollo }, CRISTAL);
    if (toldo.hasValance && toldo.valanceFabric) {
      const telaBamba = resolveFabric(toldo.valanceFabric);
      if (telaBamba?.material?.trim().toUpperCase() === 'PLASTICA (LONA)') {
        agregar({ ...t, soloBamba: true, bamba: Number(toldo.valanceHeight), anchoRollo: telaBamba.width,
          tela: telaBamba.description }, telaBamba);
      } else avisar(letra, toldo.of, 'la bamba va en otro material y no entra en este corte.');
    }
    modelos.add(toldo.model);
  }
  const conSacos = [], trozos = [], planos = [];
  // Un solo presupuesto de intentos del Tetris para todas las telas del pedido, como en puertas.
  const presupuesto = { restantes: PRESUPUESTO_TETRIS };
  const calculados = [...grupos.values()].map((grupo) => ({ grupo, opciones: opcionesCorte(grupo.toldos, String(ofStockSacos), presupuesto),
    cristal: grupo.toldos.every((t) => t.soloCristal) }));
  for (const { grupo, opciones, cristal } of calculados) {
    const of = [...new Set(grupo.toldos.map((t) => t.of))].join(' / ');
    const cabecera = { pedido: orden.orderCode, of, cliente: orden.customer, tecnico: orden.technician,
      revisor: orden.reviewer, fecha: fechaCorta(orden.orderDate), pagina: '1/1', material: grupo.material };
    const completar = (corte) => {
      const dib = dibujo(corte.colocadas, grupo.anchoRollo, { of, tela: grupo.material });
      dib.textos.push(...(corte.textosExtra || []));
      if (corte.largoRestos) dib.textos.push({ capa: 'texto', valor: grupo.material.toUpperCase(),
        x: corte.largo + 1500 + corte.largoRestos / 2, y: grupo.anchoRollo + 140, h: 100, centrado: true });
      return { codigoTela: grupo.codigoTela, material: grupo.material, anchoRollo: grupo.anchoRollo,
        ...corte, dibujo: dib, dxf: escribirDxf2004(dib), codificacion: 'latin1' };
    };
    conSacos.push(completar(opciones.conSacos));
    if (opciones.trozoSeparado) trozos.push(completar(opciones.trozoSeparado));
    // El cristal de las cortinas va en el plano de su lona, como en los de la oficina (AR2605080); su sitio en la
    // lista se rellena después con ese mismo plano, para que cada corte siga teniendo el suyo.
    if (cristal) { planos.push(null); continue; }
    const cristales = calculados.filter((c) => c.cristal && c.grupo.toldos.some((ct) => grupo.toldos.some((t) => !t.soloBamba && t.letra === ct.letra)))
      .map((c) => ({ material: c.grupo.material, anchoRollo: c.grupo.anchoRollo, corte: c.opciones.conSacos, codigoTela: c.grupo.codigoTela }));
    const geometria = dibujarPlano(grupo, opciones.conSacos, opciones.trozoSeparado, cristales);
    const cortinas = grupo.toldos.every((t) => t.cortina);
    const datos = Object.fromEntries(Object.entries({ ...cabecera,
      tituloCorte: `CORTE · ${grupo.material} · ROLLO DE ${grupo.anchoRollo / 10} · ${(opciones.conSacos.largo / 1000).toLocaleString('es-ES')} M`,
      subtitulo: `MEDIDAS EN CM · LONA DE PVC · ${cortinas ? 'CORTINA' : grupo.toldos.every((t) => t.cambioTela) ? 'CAMBIO DE TELA' : grupo.toldos.some((t) => t.cambioTela) ? 'TOLDO Y CAMBIO DE TELA' : 'TOLDO DE FACHADA'}`
    }).map(([k, v]) => [k, textoSeguro(v)]));
    planos.push({ codigoTela: grupo.codigoTela, material: grupo.material, geometria,
      ...escribirDxfPlano(geometria, datos), codificacion: 'utf8', cristales: cristales.map((c) => c.codigoTela) });
  }
  calculados.forEach(({ grupo, cristal }, i) => {
    if (!cristal) return;
    const suyo = planos.find((p) => p?.cristales?.includes(grupo.codigoTela));
    planos[i] = { ...suyo, codigoTela: grupo.codigoTela, material: grupo.material, incluidoEn: suyo.codigoTela };
  });
  return { modelos: [...modelos], cortes: { conSacos, trozoSeparado: trozos.length ? trozos : null }, plano: planos, avisos, sinOf };
}

// Cristal de la ventana de la cortina: el artículo que ya reserva la web (CRISTATP140650, 140 de ancho).
const CRISTAL = { code: 'CRISTATP140650', description: 'CRISTAL UV ALTA TRANSPARENCIA 140 AN', nombreCorte: 'TRANSPARENTE 650 MI', ancho: 140 };

/** Lo que la cortina necesita para su corte, sacado de su tarjeta (docs/modelos/cortina-pvc-corte.md). */
function datosCortina(toldo) {
  return {
    abajo: normalizeCurtainConfiguration(toldo).curtainBottomFinish === 'ET' ? 'ET' : 'VARILLA',
    ventana: toldo.curtainHasWindow ? { alto: Number(toldo.curtainWindowHeight), esquina: Number(toldo.curtainWindowCorner),
      desdeAbajo: curtainWindowDrawingHeight(toldo) } : null,
    anchoCristal: CRISTAL.ancho,
    laterales: toldo.curtainFinish === 'VELCRO' ? 'VELCRO' : 'NORMAL',
    alturaVelcro: configuredCurtainVelcroHeight(toldo)
  };
}

function fechaCorta(fecha) {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || '');
  return r ? `${r[3]}/${r[2]}/${r[1].slice(2)}` : fecha || '';
}
