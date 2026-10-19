import { calculateOrder } from '../rules.js';
import { normalizeOrder } from '../validation.js';
import { resolveFabric } from '../fabricCatalog.js';
import { shortFabricName } from '../fabricShortName.js';
import { awningLetter } from '../awningCompleteness.js';
import { corteReadiness, motivoCorteManual } from '../corteReadiness.js';
import { opcionesCorte } from './colocacion.js';
import { dibujo } from './dibujoCorte.js';
import { escribirDxf2004 } from './dxfCorte.js';
import { dibujarPlano } from './plano.js';
import { escribirDxfPlano } from './presentacion.js';
import { textoSeguro } from './texto.js';

/**
 * Genera, sin escribir archivos, los cortes y planos por tela de un pedido de la web.
 * Ajustes por id de toldo (preferido), OF o letra. Medidas de los ajustes en cm,
 * salvo varillaArribaMm y varillaTiraMm. Cada opción es una lista por material;
 * trozoSeparado vale null cuando ninguna tela tiene paño pequeño.
 * El servidor debe guardar los cortes con Buffer.from(dxf, 'latin1') y los planos en UTF-8.
 */
export function generarCorteLona(order, { ajustes = {}, ofStockSacos } = {}) {
  if (!/^\d{7}$/.test(String(ofStockSacos || ''))) throw new Error('Indica la OF de stock de los sacos con sus siete cifras.');
  const orden = normalizeOrder(order);
  const calculo = calculateOrder(orden);
  const avisos = [];
  const grupos = new Map();
  const modelos = new Set();
  const agregar = (t, tela) => {
    const clave = `${tela.code}|${t.anchoRollo}`;
    if (!grupos.has(clave)) grupos.set(clave, { codigoTela: tela.code, anchoRollo: t.anchoRollo * 10,
      material: shortFabricName(tela.description).replace(/^LONA /, '').replace(/\s*:\d+ AN$/, ''), toldos: [] });
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
      ajustes: ajustes[toldo.id] ?? ajustes[toldo.of] ?? ajustes[letra] ?? {}
    };
    agregar(t, { code: c.fabricCode || tela.code, description: c.fabricDescription });
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
  for (const grupo of grupos.values()) {
    const opciones = opcionesCorte(grupo.toldos, String(ofStockSacos));
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
    const geometria = dibujarPlano(grupo, opciones.conSacos, opciones.trozoSeparado);
    const datos = Object.fromEntries(Object.entries({ ...cabecera,
      tituloCorte: `CORTE · ${grupo.material} · ROLLO DE ${grupo.anchoRollo / 10} · ${(opciones.conSacos.largo / 1000).toLocaleString('es-ES')} M`,
      subtitulo: `MEDIDAS EN CM · LONA DE PVC · ${grupo.toldos.every((t) => t.cambioTela) ? 'CAMBIO DE TELA' : grupo.toldos.some((t) => t.cambioTela) ? 'TOLDO Y CAMBIO DE TELA' : 'TOLDO DE FACHADA'}`
    }).map(([k, v]) => [k, textoSeguro(v)]));
    planos.push({ codigoTela: grupo.codigoTela, material: grupo.material, geometria,
      ...escribirDxfPlano(geometria, datos), codificacion: 'utf8' });
  }
  return { modelos: [...modelos], cortes: { conSacos, trozoSeparado: trozos.length ? trozos : null }, plano: planos, avisos };
}

function fechaCorta(fecha) {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || '');
  return r ? `${r[3]}/${r[2]}/${r[1].slice(2)}` : fecha || '';
}
