import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import revision from './domain/corteLona/fixtures/revision-AR2604784.json' with { type: 'json' };
import { generarCorteLona } from './domain/corteLona/index.js';
import { crearEstadoCorteLona, corteLonaPendiente } from './corteLonaEstado.js';
import { carpetaCorte, exigirCorteAlDia, prepararArchivosCorte, escribirPlanosCorte } from './corteLonaArchivos.js';
import { defaultWorkflowSettings, normalizeWorkflowSettings, createReviewPackage, reviewSummary } from './workflow.js';
import { calculateOrder } from './domain/rules.js';
import { pedidoVariasTelas } from './domain/corteLona/fixtures/variasTelas.js';

const order = revision.order;
const corteLona = crearEstadoCorteLona(order, { resultado: generarCorteLona(order, { ofStockSacos: '0230811' }), ofStockSacos: '0230811' });
const oda = { disponible: false };

describe('Reglas y salidas del corte', () => {
  it('conserva las dos plantillas de configuración, las valida y resume los estados de la bandeja', () => {
    const seed = { corteLonaBotDirectory: path.resolve('tmp/bot/{TECNICO}'), corteLonaPlanoDirectory: path.resolve('tmp/planos/{YYYY}/{PEDIDO}') };
    const settings = defaultWorkflowSettings(seed);
    expect(normalizeWorkflowSettings({}, settings)).toMatchObject(seed);
    expect(() => normalizeWorkflowSettings({ corteLonaBotDirectory: 'relativa' }, settings)).toThrow(/absoluta/);
    const review = createReviewPackage({ order, corteLona, calculation: calculateOrder(order) });
    expect(reviewSummary(review).corteLonaEstado).toBe('hecho');
    expect(reviewSummary({ ...review, corteLona: null }).corteLonaEstado).toBe('falta');
    const viejo = structuredClone(review);
    viejo.order.awnings[0].width += 10;
    expect(reviewSummary(viejo).corteLonaEstado).toBe('viejo');
    const sinCorte = { ...review, order: { ...order, fabric: 'ACRILI2018P120' } };
    expect(reviewSummary(sinCorte)).not.toHaveProperty('corteLonaEstado');
  });
  it('bloquea guardar y generar sin corte, con letras y motivos; acepta el corte al día', () => {
    expect(() => exigirCorteAlDia(order, null)).toThrow(/A.*generar/);
    const viejo = structuredClone(order);
    viejo.awnings[0].width += 10;
    expect(() => exigirCorteAlDia(viejo, corteLona)).toThrow(/A.*viejo/);
    expect(() => exigirCorteAlDia(order, corteLona)).not.toThrow();
  });
  it('no exige corte a tela acrílica ni a modelos sin corte', () => {
    expect(corteLonaPendiente({ ...order, fabric: 'ACRILI2018P120' }, null)).toEqual([]);
    const otro = structuredClone(order);
    otro.awnings[0].model = 'HERA';
    expect(() => exigirCorteAlDia(otro, null)).not.toThrow();
  });
  it.each([{ valanceCurve: 'SIN PLANTILLA' }, { curtainHasWindow: true }])('permite revisar y producir junto a un toldo manual: %j', async (manual) => {
    const otro = structuredClone(order);
    otro.awnings.push({ ...otro.awnings[0], id: 'manual', of: '0232569', ...manual });
    const estado = crearEstadoCorteLona(otro, { resultado: generarCorteLona(otro, { ofStockSacos: '0230811' }), ofStockSacos: '0230811' });
    expect(() => exigirCorteAlDia(otro, estado)).not.toThrow();
    const review = createReviewPackage({ order: otro, corteLona: estado, calculation: calculateOrder(otro) });
    expect(reviewSummary(review).corteLonaEstado).toBe('hecho');
    expect(review.corteLona.toldos[1].manual).toBe(true);
    const settings = { productionEnabled: true, corteLonaBotDirectory: path.resolve('tmp/bot'), corteLonaPlanoDirectory: path.resolve('tmp/planos') };
    for (const tipo of ['bot', 'plano']) {
      const salida = await prepararArchivosCorte({ order: otro, corteLona: estado, settings, oda, tipo });
      expect(salida.files).toHaveLength(1);
    }
    Object.assign(otro.awnings[1], { valanceCurve: 'RECTA', curtainHasWindow: false });
    expect(() => exigirCorteAlDia(otro, estado)).toThrow(/B.*viejo/);
  });
  it('sin habilitar escrituras no crea ni convierte nada', async () => {
    const resultado = await escribirPlanosCorte({ order, corteLona, settings: { productionEnabled: false }, oda });
    expect(resultado.files).toEqual([]);
    expect(resultado.avisos.join()).toMatch(/simulación/);
    expect(await prepararArchivosCorte({ order, corteLona, settings: { productionEnabled: false }, tipo: 'bot', oda })).toEqual({ files: [], avisos: [] });
  });
  it('guarda solo plano al revisar, reescribe y prepara ambas opciones por tela al producir', async () => {
    const raiz = await fs.mkdtemp(path.resolve('tmp/corte-fase3-'));
    try {
      const settings = { productionEnabled: true, corteLonaPlanoDirectory: path.join(raiz, '{YYYY}', '{PEDIDO}'), corteLonaBotDirectory: path.join(raiz, 'bot', '{TECNICO}') };
      const guardado = await escribirPlanosCorte({ order, corteLona, settings, oda });
      expect(guardado.files).toHaveLength(1);
      expect(guardado.files[0].savedPath).toContain(path.join('2026', order.orderCode));
      expect(guardado.files[0].writtenAt).toBeTruthy();
      expect(guardado.avisos.join()).toMatch(/ODA/);
      expect(await fs.readFile(guardado.files[0].savedPath, 'utf8')).toContain('AC1032');
      await fs.writeFile(guardado.files[0].savedPath, 'viejo');
      const existente = await escribirPlanosCorte({ order, corteLona, settings, oda });
      expect(existente.existentes).toEqual([guardado.files[0].filename]);
      expect(await fs.readFile(guardado.files[0].savedPath, 'utf8')).toBe('viejo');
      await escribirPlanosCorte({ order, corteLona, settings, oda, confirmOverwrite: true });
      expect(await fs.readFile(guardado.files[0].savedPath, 'utf8')).toContain('AC1032');
      const bot = await prepararArchivosCorte({ order, corteLona, settings, oda, tipo: 'bot' });
      expect(bot.files.map(f => f.filename)).toEqual([`${order.orderCode}.dxf`]);
      expect(bot.files.every(f => f.type === 'corte-lona' && f.contents.includes(Buffer.from('AC1018')))).toBe(true);
      expect(await fs.readdir(raiz)).not.toContain('bot');
    } finally { await fs.rm(raiz, { recursive: true, force: true }); }
  });
  it('convierte el plano con ODA y propaga un fallo real de conversión', async () => {
    const settings = { productionEnabled: true, corteLonaPlanoDirectory: path.resolve('tmp/plano') };
    const convertido = await prepararArchivosCorte({ order, corteLona, settings, tipo: 'plano', oda: { disponible: true, convertir: async () => Buffer.from('DWG') } });
    expect(convertido.files[0].filename).toMatch(/\.dwg$/);
    await expect(prepararArchivosCorte({ order, corteLona, settings, tipo: 'plano', oda: { disponible: true, convertir: async () => { throw new Error('Conversión fallida'); } } })).rejects.toThrow('Conversión fallida');
  });
  it('nunca escribe el corte de un toldo sin OF, que solo es vista previa', async () => {
    const sinOf = structuredClone(order);
    sinOf.awnings[0].of = '';
    const estado = crearEstadoCorteLona(sinOf, { resultado: generarCorteLona(sinOf, { ofStockSacos: '0230811' }), ofStockSacos: '0230811' });
    const settings = { productionEnabled: true, corteLonaBotDirectory: path.resolve('tmp/bot'), corteLonaPlanoDirectory: path.resolve('tmp/planos') };
    for (const tipo of ['bot', 'plano']) {
      await expect(prepararArchivosCorte({ order: sinOf, corteLona: estado, settings, oda, tipo })).rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/Falta la OF del toldo A/) });
    }
  });
  it('reúne los anchos de un código en un DXF y conserva los nombres de sus planos', async () => {
    const otro = structuredClone(order);
    otro.sameFabric = false;
    otro.awnings[0].fabric = order.fabric;
    const partes = order.fabric.split('|||');
    partes[1] = '300';
    otro.awnings.push({ ...otro.awnings[0], id: 'otro-ancho', of: '0232569', fabric: partes.join('|||') });
    const estado = crearEstadoCorteLona(otro, { resultado: generarCorteLona(otro, { ofStockSacos: '0230811' }), ofStockSacos: '0230811' });
    const settings = { productionEnabled: true, corteLonaBotDirectory: path.resolve('tmp/bot') };
    const { files } = await prepararArchivosCorte({ order: otro, corteLona: estado, settings, tipo: 'bot', oda });
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe(`${order.orderCode}.dxf`);
    const planos = await prepararArchivosCorte({ order: otro, corteLona: estado,
      settings: { ...settings, corteLonaPlanoDirectory: path.resolve('tmp/planos') }, tipo: 'plano', oda });
    expect(planos.files).toHaveLength(2);
    expect(planos.files.map(f => f.filename).join()).toMatch(/2500.*3000/);
  });
  it('prepara un solo DXF con todas las telas y las dos opciones rotuladas (Iván, 22/10/2026: el técnico de la máquina elige)', async () => {
    const otro = pedidoVariasTelas();
    const estado = crearEstadoCorteLona(otro, { resultado: generarCorteLona(otro, { ofStockSacos: '0230811' }), ofStockSacos: '0230811' });
    const { files } = await prepararArchivosCorte({ order: otro, corteLona: estado,
      settings: { productionEnabled: true }, tipo: 'bot', soloContenido: true });
    expect(files.map(f => f.filename)).toEqual([`${otro.orderCode}.dxf`]);
    const dxf = files[0].contents.toString('latin1');
    for (const texto of ['AZUL 5010', 'BLANCO 9016', '0232568', 'REVÉS', 'A BAMBA', 'CORTAR DE RESTOS', 'OPCIÓN 1 · CON SACOS', 'OPCIÓN 2 · TROZO SEPARADO']) expect(dxf).toContain(texto);
    // La bamba sola va una vez, sin opciones.
    expect(dxf.match(/BLANCO 9016 · OPCIÓN/g)).toBeNull();
  });
  it('cada autor tiene su carpeta en BOT/Pendientes, con el nombre que tiene allí', () => {
    const plantilla = path.resolve('tmp/BOT/Pendientes/{TECNICO}');
    expect(carpetaCorte(plantilla, { orderCode: 'AR2605158', technician: 'IVÁN' })).toBe(path.resolve('tmp/BOT/Pendientes/Ivan.Sanchez'));
    expect(carpetaCorte(plantilla, { orderCode: 'AR2605158', technician: 'ADRIÁN' })).toBe(path.resolve('tmp/BOT/Pendientes/Adrian.Quinteiro'));
    expect(carpetaCorte(plantilla, { orderCode: 'AR2605158', technician: 'ÁNGEL' })).toBe(path.resolve('tmp/BOT/Pendientes/Angel'));
    // Cogido por un compañero, la carpeta es la de quien lo lleva ahora.
    expect(carpetaCorte(plantilla, { orderCode: 'AR2605158', technician: 'ÁNGEL / IVÁN' })).toBe(path.resolve('tmp/BOT/Pendientes/Ivan.Sanchez'));
    expect(carpetaCorte(plantilla, { orderCode: 'AR2605158', technician: 'IVÁN / LUIS' })).toBe(path.resolve('tmp/BOT/Pendientes/LUIS'));
  });
  it('evita colisiones entre telas de igual código con distinto ancho y no permite rutas en el técnico', async () => {
    const otro = structuredClone(order);
    otro.technician = '../../TÉCNICO/OT';
    const estado = { ...corteLona };
    const settings = { productionEnabled: true, corteLonaBotDirectory: path.resolve('tmp/bot/{TECNICO}') };
    const salida = await prepararArchivosCorte({ order: otro, corteLona: estado, settings, tipo: 'bot', oda });
    expect(salida.files.every(f => path.dirname(f.savedPath) === path.resolve('tmp/bot/TÉCNICO_OT'))).toBe(true);
  });
});
