// Solo fixtures y ejemplos ya contrastados del repositorio. No consulta servicios ni lee archivos de producción.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { generarCorteLona } from '../../src/domain/corteLona/index.js';
import { modelosConCorte } from '../../src/domain/corteReadiness.js';
import { pedidoVariasTelas } from '../../src/domain/corteLona/fixtures/variasTelas.js';
import { generarCorteRemolques } from '../../src/remolques/corte/index.js';
import { emptyGanado } from '../../src/remolques/entradas-vacias.ts';
import { calcGanado } from '../../src/remolques/calc/ganado.ts';
import { MEDIDAS_CAL_5319, MEDIDAS_CAL_GEMELO } from '../../src/remolques/ganado/medidas.ts';
import { escribirPlanoPuertas } from '../../src/puertas/plano.ts';
import { pedidoDe } from '../../src/puertas/__fixtures__/ejemplos.ts';
import { puertaPlanoReal } from '../../src/puertas/__fixtures__/planosReales.ts';
import { pedidosCompatibilidadClientes } from '../../src/puertas/__fixtures__/compatibilidadClientes.ts';
import { pedidosSantaPau } from '../../src/puertas/__fixtures__/santapau.ts';
import { araujo5365, araujo5733, araujo4292, araujo4373, araujo2391, araujo6255 } from '../../src/puertas/__fixtures__/araujo.ts';
import { nuevaPuerta } from '../../src/puertas/calcular.ts';
import { prepararLote } from '../../src/assa/lote.js';
import { planoDelLote } from '../../src/assa/archivos.js';

const leer = async ruta => JSON.parse(await fs.readFile(new URL('../../' + ruta, import.meta.url), 'utf8'));
const opciones = { ofStockSacos: '0230811' }; // La misma OF de stock de las pruebas de corte; no se envía a ningún sitio.

export async function generarMuestras() {
  const muestras = [], excluidas = [], integridadRemolques = [];
  const registrar = async (familia, ejemplo, fuente, generar) => {
    try {
      const planos = await generar();
      if (!planos.length) throw Error('El generador no devuelve planos');
      planos.forEach((dxf, i) => muestras.push({ familia, ejemplo: ejemplo + (planos.length > 1 ? ` / material ${i + 1}` : ''), fuente, dxf }));
    } catch (error) { excluidas.push({ familia, ejemplo, fuente, motivo: error.message }); }
  };
  const toldo = order => {
    const r = generarCorteLona(order, opciones);
    if (!r.plano.length) throw Error(r.avisos.join('; ') || 'Sin plano');
    return r.plano.filter(Boolean).map(p => p.dxf);
  };
  const revision = await leer('src/domain/corteLona/fixtures/revision-AR2604784.json');
  for (const model of ['ARZUA PRO', 'GALICIA', 'MONOBLOCK 350', 'CAMBIO TELA']) {
    await registrar(`Toldos / ${model}`, 'AR2604784 adaptado como en index.test.js', 'src/domain/corteLona/index.test.js', () => {
      const order = structuredClone(revision.order);
      Object.assign(order.awnings[0], { model, armCount: 2, workType: model === 'CAMBIO TELA' ? 'FABRIC_ONLY' : 'FULL_AWNING' });
      return toldo(order);
    });
  }
  await registrar('Toldos / CORTINA', 'AR2605193 con ventana y bambalina', 'src/domain/corteLona/fixtures/AR2605193-pedido.json', async () => toldo(await leer('src/domain/corteLona/fixtures/AR2605193-pedido.json')));
  await registrar('Toldos / CAMBIO CORTINA', 'AR2601829 varilla', 'src/domain/corteLona/index.test.js', () => toldo({
    orderCode: 'AR2601829', customer: 'PRUEBA CAMBIO CORTINA', technician: 'IVÁN', orderDate: '2026-10-27',
    fabric: 'PVC580BL|||250|||LONA PVC 580 BLANCO :250 AN|||PLASTICA (LONA)',
    awnings: [{ id: 'cc-1', of: '0230037', model: 'CAMBIO CORTINA', workType: 'FABRIC_ONLY', units: 1,
      width: 342, projection: 200, hasValance: false, valanceHeight: 0, rotFabric: 'NO', curtainHasWindow: false,
      curtainFinish: 'NORMAL', curtainBottomFinish: 'TUBO DE CARGA', curtainTopFinish: 'VARILLA', curtainFabricAdjustment: 'NINGUNO', curtainFabricAdjustmentCm: 0 }] }));
  await registrar('Toldos / SOLAPAS', 'AR2604205 siete solapas incluida oblicua', 'src/domain/corteLona/index.test.js', () => {
    const velcro = { tipo: 'BRAVO', lado: 'POR REVÉS', color: 'BLANCO', anchoCm: 5 };
    return toldo({ orderCode: 'AR2604205', customer: 'CONSTRUCCIONES VALIÑAS, S.L', technician: 'IVÁN', orderDate: '2026-10-27',
      fabric: 'PVC650BL|||250|||LONA PVC 650 BLANCO BRILLO :250 AN|||PLASTICA (LONA)',
      awnings: [{ id: 'sol-1', of: '0231643', model: 'SOLAPAS', workType: 'FABRIC_ONLY', units: 1, rotFabric: 'NO', bastilla: false,
        solapas: [['A', 51], ['B', 25.5], ['C', 35.5], ['D', 40], ['E', 37], ['F', 26.5], ['G', 35.5]].map(([nombre, ancho]) => ({
          id: 's-' + nombre.toLowerCase(), nombre, largoCm: 275, oblicua: nombre === 'D', ...(nombre === 'D' ? { anchoIzqCm: ancho, anchoDerCm: 85 } : { anchoCm: ancho }),
          velcroIzq: velcro, velcroDer: velcro, velcroDerDistinto: false })) }] });
  });
  const embudos = await leer('src/domain/__fixtures__/embudos-oficina.json');
  for (const [tipo, e] of Object.entries(embudos).filter(([, e]) => typeof e === 'object')) {
    await registrar('Toldos / EMBUDO', `${e.pedido} ${tipo}${tipo === 'recto' ? ' (vista previa sin OF)' : ''}`, 'src/domain/__fixtures__/embudos-oficina.json + embudoPlanteamientoCad.test.js', () => toldo({
      orderCode: e.pedido, customer: tipo === 'conico' ? 'BARCALA' : '', technician: 'IVÁN', notes: 'COMPROBAR MUESTRA DEL CLIENTE', sameFabric: true,
      fabric: 'PVC900BL|||250|||LONA PVC 900 BLANCO :250 AN|||PLASTICA (LONA)',
      awnings: [{ id: 'a', model: 'EMBUDO', of: tipo === 'conico' ? '0233311' : '', units: e.cantidad, fabricNotes: 'DOBLE COSTURA EN SOLDADURA', embudo: e.entrada }] }));
  }
  await registrar('Toldos / BAMBALINAS', 'Bamba separada por material', 'src/domain/corteLona/fixtures/variasTelas.js', () => toldo(pedidoVariasTelas()));

  const dir = 'src/remolques/corte/__fixtures__';
  const archivos = (await fs.readdir(new URL('../../' + dir, import.meta.url))).filter(n => /^AR\d+\.json$/.test(n)).sort();
  const base = await leer(`${dir}/AR2605071.json`);
  const remolque = order => {
    const r = generarCorteRemolques(order);
    if (!r.archivo?.plano?.dxf) throw Error(JSON.stringify(r.aMano ?? 'Sin plano'));
    integridadRemolques.push({ pedido: order.orderCode,
      bot: createHash('sha256').update(r.archivo.dxf).digest('hex'),
      colocacion: createHash('sha256').update(JSON.stringify(r.cortes.map(c => ({ entidades: c.entidades, largo: c.largo })))).digest('hex') });
    return [r.archivo.plano.dxf];
  };
  for (const archivo of archivos) await registrar('Remolques / rectos y aguas', archivo.slice(0, -5), `${dir}/${archivo}`, async () => remolque(await leer(`${dir}/${archivo}`)));
  for (const [modelo, pedido, of, medidasCal, cliente] of [
    ['REMOLCAR_ECONOMICO', 'AR2600752', '0225519', null, 'JUAN BARREIRO, S. L.'],
    ['REMOLCAR_ESTANDAR', 'AR2601847', '0227492', null, 'REMOLCAR'],
    ['CAL_MEDIDAS', 'AR2506052', '0223263', MEDIDAS_CAL_GEMELO, 'TALLERES CAL'],
    ['CAL_MEDIDAS', 'AR2605319', '0233492', MEDIDAS_CAL_5319, 'TALLERES CAL'],
  ]) await registrar(`Remolques / ganado ${modelo}`, pedido, 'src/remolques/corte/ganado*.test.js', () => {
    const input = { ...emptyGanado(modelo), ...(medidasCal ? { medidasCal } : {}),
      material: medidasCal ? 'LONA PVC 580 GRIS 7037 :250 AN (580)' : 'LONA NS86 2L 630 g/m² :GRIS CLARO 7038 :250 AN (580)', arcosComprobados: true };
    input.cabecera = { ...input.cabecera, numeroPedido: pedido, cliente, ordenFabricacion: of };
    const elemento = { tipo: 'ganado', version: '10', input, result: calcGanado(input), paramsSnapshot: base.params, of };
    return remolque({ ...base, orderCode: pedido, numeroPedido: pedido, elementos: [elemento] });
  });
  const puerta = (pedido, cliente) => [escribirPlanoPuertas({ pedido, ...opciones, cabecera: { cliente, tecnico: 'IVÁN', revisor: '', fecha: '2026-11-05' } })];
  for (const [tipo, id] of [['Enrollable', 'AR2604638'], ['Plegable', 'AR2605036'], ['Apilable', 'AR2604906'], ['Autorreparable', 'AR2604904']])
    await registrar(`Puertas / Portanova ${tipo}`, id, 'src/puertas/__fixtures__/planosReales.ts', () => puerta(pedidoDe(id, puertaPlanoReal(id)), 'PORTANOVA'));
  for (const p of pedidosCompatibilidadClientes()) await registrar('Puertas / Portanova compatibilidad', p.orderCode, 'src/puertas/__fixtures__/compatibilidadClientes.ts', () => puerta(p, 'PORTANOVA'));
  for (const [id, generar] of [['AR2605365', araujo5365], ['AR2505733', araujo5733], ['AR2604292', araujo4292], ['AR2604373', araujo4373], ['AR2602391', araujo2391], ['AR2506255', araujo6255]])
    await registrar('Puertas / Araujo', id, 'src/puertas/__fixtures__/araujo.ts', () => { const p = generar(); return puerta(pedidoDe(id, ...(Array.isArray(p) ? p : [p])), 'ARAUJO'); });
  for (const p of pedidosSantaPau()) await registrar('Puertas / Santa Pau', p.orderCode, 'src/puertas/__fixtures__/santapau.ts', () => puerta(p, 'SANTA PAU'));
  await registrar('Puertas / System Dock', 'AR2604615', 'src/puertas/systemDock.test.ts', () => {
    const lonas = [[1040, 55, 3, '0232270'], [1270, 55, 1, '0232269']].map(([frente, alto, cantidad, of]) => ({
      ...nuevaPuerta('SYSTEMDOCK'), frente, alto, cantidad, of, material: 'PVC G650', color: 'NEGRO', rollo: 250, confirmada: true }));
    return puerta(pedidoDe('AR2604615', ...lonas), 'SYSTEM DOCK');
  });
  await registrar('ASSA / lote', '2026-11-07 AR2605234', 'src/assa/documentoLote.test.js', () => {
    const linea = { IDOrderLine: 'a', CodOrder: 'AR.26.05234', NumLine: 1, CodArticle: 'H0K420102-0021', descripcion: 'NH3800 NT600', cantidad: 18, of_: '0233342', entregaSolicitada: '2026-11-07' };
    const certificado = { referencias: { '420102-0021': { descripciones: [{ descripcion: linea.descripcion, corteMm: [3610, 666], geometria: 1, ultimaGeometria: true }] } } };
    return [planoDelLote(prepararLote('2026-11-07', [linea], {}, certificado, { palets: { a: 1 } }))];
  });
  for (const familia of ['FALDONES', 'BAMBALINA independiente']) excluidas.push({ familia, motivo: 'Sin generador de plano A4 en corteReadiness; las bambalinas vinculadas al toldo sí se auditan', fuente: 'src/domain/corteReadiness.js' });
  const cubiertos = modelosConCorte.filter(m => muestras.some(p => p.familia === `Toldos / ${m}`));
  for (const m of modelosConCorte.filter(m => !cubiertos.includes(m))) if (!excluidas.some(e => e.familia === `Toldos / ${m}`)) excluidas.push({ familia: `Toldos / ${m}`, motivo: 'Sin ejemplo generado' });
  return { muestras, excluidas, modelosConCorte: [...modelosConCorte], integridadRemolques };
}
