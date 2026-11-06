import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import pdfLib from 'pdf-lib';
import { nuevaPuerta } from '../puertas/calcular.ts';
import { crearPlanoPuertas } from '../puertas/flujo/archivos.ts';
import { crearServicioPedidosPuertas } from '../puertas/flujo/servicio.ts';
import { crearAlmacenPedidos, crearAlmacenPedidosRemolques } from '../remolques/flujo/almacen.ts';
import { crearServicioPedidosRemolques } from '../remolques/flujo/servicio.ts';
import { crearCorteRemolques } from '../remolques/corte/archivos.js';
import fixture from '../remolques/corte/__fixtures__/AR2605132.json';
import habitual from '../puertas/__fixtures__/AR2605134.json';
import type { PedidoRemolques } from '../remolques/flujo/tipos.ts';
import type { PedidoPuertasGuardado } from '../puertas/flujo/tipos.ts';
import { crearAlmacenConfirmaciones } from './confirmaciones.js';
import { corteDelPlano } from './corteDwg.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const raices: string[] = [];
afterEach(async () => { for (const raiz of raices.splice(0)) await fs.rm(raiz, { recursive: true, force: true }); });

async function preparar(tipo: 'puertas' | 'remolques', conPdf = false) {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  const raiz = await fs.mkdtemp(path.resolve('tmp/pedidos-editables-'));
  raices.push(raiz);
  let produccion = true, estado = 'aprobada', fallaGuardado = false, disponible = true, conBorradores = true;
  const ajustes = async () => ({ productionEnabled: produccion, corteLonaPlanoDirectory: path.join(raiz, 'planos'),
    corteBorradoresDirectory: conBorradores ? path.join(raiz, 'borradores') : '', corteBorradoresRed: conBorradores ? String.raw`\\toldosgomez.local\DFS_POL\oftecnica\borradores` : '',
    corteLonaBotDirectory: path.join(raiz, 'bot'), corteLonaDxfDirectory: path.join(raiz, 'dxfs'),
    remolquesPlanteamientosDirectory: path.join(raiz, 'pdf'), remolquesOficinaTecnicaDirectory: path.join(raiz, 'oficina/{YYYY}') });
  await fs.mkdir(path.join(raiz, 'pdf'), { recursive: true });
  await fs.mkdir(path.join(raiz, 'oficina'), { recursive: true });
  const comunes = { ajustes, tecnicos: ['IVÁN', 'DAVID', 'ANA'],
    coordina: { statusOf: async (ofs: string[]) => ({ disponible, ofs: disponible ? Object.fromEntries(ofs.map(of => [of, { estado, revisor: 'DAVID' }])) : {} }) },
    confirmaciones: crearAlmacenConfirmaciones({ carpeta: async () => path.join(raiz, 'confirmaciones') }) };
  const remolque = structuredClone(fixture) as PedidoRemolques;
  const puerta = { schemaVersion: 1 as const, kind: 'puertas' as const, orderCode: 'AR2605134', cabecera: { cliente: 'PRUEBA', fecha: '2026-11-05' },
    elementos: [{ id: 'A', input: { ...nuevaPuerta('PUERTAENR'), frente: habitual.frente, alto: habitual.alto, of: habitual.of,
      cantidad: habitual.cantidad, color: habitual.color, rollo: 300, rolloCristal: 140, rolloSaco: 300,
      enrollable: { T: habitual.T, D: habitual.D, margen: habitual.margen, empates: [] },
      entradas: habitual.alturasTubos.map(altura => ({ altura, diametro: 30 as const, largo: habitual.frente, alto: 8, huecos: [] })),
      confirmada: true, ventanasConfirmadas: true } }] };
  const almacen = tipo === 'puertas'
    ? crearAlmacenPedidos<PedidoPuertasGuardado>({ carpeta: async () => path.join(raiz, 'pedidos'), tipo: 'puertas', nombre: 'puertas', sinCarpeta: 'Sin carpeta' })
    : crearAlmacenPedidosRemolques({ carpeta: async () => path.join(raiz, 'pedidos') });
  const guardarReal = almacen.guardar.bind(almacen);
  // La prueba provoca un fallo después de escribir el plano para comprobar la restauración.
  almacen.guardar = async (pedido: never) => { if (fallaGuardado) throw new Error('Fallo al guardar'); return guardarReal(pedido); };
  const servicio = tipo === 'puertas'
    ? crearServicioPedidosPuertas({ ...comunes, almacen: almacen as ReturnType<typeof crearAlmacenPedidos<PedidoPuertasGuardado>>, otroProducto: async () => null,
      ...(conPdf ? { presentacionesPdf: async () => { const pdf = await pdfLib.PDFDocument.create(); pdf.addPage(); return pdf.save(); } } : {}),
      plano: crearPlanoPuertas({ ajustes, oda: { disponible: false, convertir: async c => c } }) })
    : crearServicioPedidosRemolques({ ...comunes, almacen: almacen as ReturnType<typeof crearAlmacenPedidosRemolques>, esPedidoDeToldos: async () => false,
      parametros: async () => remolque.params, hacerPdf: async () => { const pdf = await pdfLib.PDFDocument.create(); pdf.addPage(); return pdf.save(); },
      corte: crearCorteRemolques({ ajustes, oda: { disponible: false } }) });
  const codigo = tipo === 'puertas' ? puerta.orderCode : remolque.orderCode;
  const cuerpo = (cambio = false, extra = {}) => ({ savedBy: 'ANA', confirmarEntradaEntrega: true, ...(tipo === 'puertas'
    ? { pedido: { ...puerta, elementos: puerta.elementos.map(e => ({ ...e, input: { ...e.input, frente: cambio ? 210 : habitual.frente } })) } }
    : { elementos: remolque.elementos.map(e => ({ ...e, input: { ...e.input, largo: e.input.largo + (cambio ? 10 : 0) } })), params: remolque.params }), ...extra });
  const obtener = () => servicio.obtener(codigo);
  return { servicio, cuerpo, obtener, codigo, raiz, produccion: (v: boolean) => { produccion = v; }, estado: (v: string) => { estado = v; }, fallar: () => { fallaGuardado = true; }, desconectar: () => { disponible = false; }, sinBorradores: () => { conBorradores = false; } };
}

describe.each(['puertas', 'remolques'] as const)('%s: reglas comunes del pedido editable', tipo => {
  it('guardar un generado sin cambiar sus datos no abre una entrega vacía ni toca archivos', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true });
    const antes = await t.obtener();
    const bytes = await fs.readFile(antes.corteConfirmado!.plano);
    expect((await t.servicio.guardar(t.cuerpo())).cuerpo).toMatchObject({ unchanged: true });
    expect(await t.obtener()).toEqual(antes);
    expect(await fs.readFile(antes.corteConfirmado!.plano)).toEqual(bytes);
  });
  it('las dos copias del PDF llevan el pedido completo con su entrega y permiten recuperarlo', async () => {
    const t = await preparar(tipo, true);
    await t.servicio.guardar(t.cuerpo());
    expect((await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true })).status).toBe(200);
    const pedido = await t.obtener();
    const archivos = pedido.production!.files.filter(f => f.type === 'pdf');
    expect(archivos).toHaveLength(2);
    expect(await fs.readFile(archivos[0].savedPath)).toEqual(await fs.readFile(archivos[1].savedPath));
    for (const f of archivos) {
      const tarea = getDocument({ data: new Uint8Array(await fs.readFile(f.savedPath)) });
      const doc = await tarea.promise;
      try {
        const adjuntos = await doc.getAttachments();
        const entradas = (adjuntos instanceof Map ? [...adjuntos.entries()] : Object.entries(adjuntos ?? {})) as Array<[string, { filename: string; content?: Uint8Array }]>;
        const encontrado = entradas.find(([, a]) => a.filename.endsWith(`.${tipo}.json`));
        expect(encontrado).toBeTruthy();
        const contenido = encontrado![1].content ?? await doc.getAttachmentContent(encontrado![0]);
        if (!contenido) throw new Error('El adjunto no contiene los datos del pedido');
        const datos = JSON.parse(Buffer.from(contenido).toString('utf8'));
        expect(datos.orderCode).toBe(t.codigo);
        expect(datos.entregas[0]).toMatchObject({ numero: 10, autor: 'IVÁN' });
        expect(datos.elementos).toHaveLength(pedido.elementos.length);
      } finally { await tarea.destroy(); }
    }
  }, 20000);
  it('genera OF nuevas en -11 y confirma sustituir -10 al corregir', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    expect((await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true })).status).toBe(200);
    const primera = await t.obtener();
    expect(primera.entregas).toMatchObject([{ numero: 10, autor: 'IVÁN' }]);
    const originales = await Promise.all([primera.corteConfirmado!.plano, ...primera.production!.files.map(f => f.savedPath)].map(async ruta => ({ ruta, bytes: await fs.readFile(ruta) })));
    const cuerpo = t.cuerpo();
    if ('pedido' in cuerpo && cuerpo.pedido) {
      const e = structuredClone(cuerpo.pedido.elementos[0]);
      e.id = 'nueva'; e.input.of = '0239998';
      cuerpo.pedido.elementos.push(e);
    } else if ('elementos' in cuerpo && cuerpo.elementos) {
      const e = structuredClone(cuerpo.elementos[0]);
      e.version = 'entrega-nueva'; e.input.cabecera.ordenFabricacion = '0239998';
      cuerpo.elementos.push(e);
    }
    expect((await t.servicio.guardar(cuerpo)).status).toBe(200);
    const pendiente = await t.obtener();
    expect(pendiente).toMatchObject({ entregaActual: 11, status: 'PENDING_REVIEW' });
    expect(pendiente.corteConfirmado!.filename).toContain('-11');
    expect((await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true })).status).toBe(200);
    const segunda = await t.obtener();
    expect(segunda.entregas).toHaveLength(2);
    expect(segunda.entregas![1].ofs).toEqual(['0239998']);
    for (const f of originales) expect(await fs.readFile(f.ruta)).toEqual(f.bytes);
    const archivosSegunda = await Promise.all(segunda.entregas![1].archivos.filter(f => f.savedPath).map(async f => ({ ruta: f.savedPath!, bytes: await fs.readFile(f.savedPath!) })));
    const correccion = t.cuerpo(true, { decisionCorte: 'regenerar' });
    expect((await t.servicio.guardar(correccion)).status).toBe(200);
    const aviso = await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true });
    expect(aviso).toMatchObject({ status: 409, cuerpo: { needsEntregaConfirmation: true, entrega: 10 } });
    expect((await t.obtener()).status).toBe('PENDING_REVIEW');
    expect((await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true, confirmarEntrega: true })).status).toBe(200);
    expect((await t.obtener()).entregas).toHaveLength(2);
    expect((await t.obtener()).entregas![0].revisiones).toHaveLength(1);
    for (const f of archivosSegunda) expect(await fs.readFile(f.ruta)).toEqual(f.bytes);
  }, 30000);
  it('separa una corrección y una OF nueva en dos generaciones con sus propios cortes', async () => {
    const t = await preparar(tipo, true);
    await t.servicio.guardar(t.cuerpo());
    await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true });
    const mixto = t.cuerpo(true, { decisionCorte: 'regenerar' });
    if ('pedido' in mixto && mixto.pedido) {
      const e = structuredClone(mixto.pedido.elementos[0]); e.id = 'nueva'; e.input.of = '0239998'; mixto.pedido.elementos.push(e);
    } else if ('elementos' in mixto && mixto.elementos) {
      const e = structuredClone(mixto.elementos[0]); e.version = 'nueva'; e.input.cabecera.ordenFabricacion = '0239998'; mixto.elementos.push(e);
    }
    expect((await t.servicio.guardar(mixto)).status).toBe(200);
    expect((await t.obtener()).entregaActual).toBe(10);
    expect((await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true, confirmarEntrega: true })).status).toBe(200);
    expect(await t.obtener()).toMatchObject({ status: 'PENDING_REVIEW', entregaActual: 11, entregaPorPreparar: true });
    const primero = await t.obtener();
    const archivos = await Promise.all(primero.production!.files.map(async f => ({ ruta: f.savedPath, bytes: await fs.readFile(f.savedPath) })));
    expect((await t.servicio.generar(t.codigo, {})).cuerpo).toMatchObject({ needsPrepararEntrega: true });
    expect((await t.servicio.guardar({ ...mixto, destinoEntrega: { numero: 11, modo: 'nuevo' }, confirmarEntrega: true })).status).toBe(200);
    expect((await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true })).status).toBe(200);
    expect(await t.obtener()).toMatchObject({ status: 'PRODUCED', entregaActual: 11, entregas: [{ numero: 10 }, { numero: 11, ofs: ['0239998'] }] });
    for (const f of archivos) expect(await fs.readFile(f.ruta)).toEqual(f.bytes);
  }, 30000);
  it.each(['generar', 'bot'] as const)('con la marca activa, %s exige decidir antes de escribir y usar el corte queda registrado', async accion => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    await t.servicio.guardar(t.cuerpo(true, { decisionCorte: 'mantener' }));
    await fs.mkdir(path.join(t.raiz, 'bot'), { recursive: true });
    const bytes = await fs.readFile((await t.obtener()).corteConfirmado!.plano);
    const salir = (extra = {}) => accion === 'generar'
      ? t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true, ...extra })
      : t.servicio.enviarCorte(t.codigo, { usuario: 'IVÁN', destino: 'bot', confirmBot: true, ...extra });
    const pregunta = await salir();
    expect(pregunta).toMatchObject({ status: 409, cuerpo: { corteNoRegenerado: true, error: expect.stringContaining('El corte no está regenerado') } });
    expect(await fs.readdir(path.join(t.raiz, 'bot'))).toEqual([]);
    expect((await t.obtener()).corteNoRegenerado).toBe(true);
    const token = (pregunta.cuerpo as { tokenCorte: string }).tokenCorte;
    expect(typeof token).toBe('string');
    expect((await salir({ aceptarCorteNoRegenerado: 'otra-version' })).status).toBe(409);
    expect((await salir({ aceptarCorteNoRegenerado: token })).status).toBe(200);
    const pedido = await t.obtener();
    expect(pedido.corteNoRegenerado).toBe(false);
    expect(pedido.corteConfirmado).toMatchObject({ por: 'IVÁN', aceptadoSinRegenerar: { por: 'IVÁN' } });
    expect(await fs.readFile(pedido.corteConfirmado!.plano)).toEqual(bytes);
    if (accion === 'generar' || tipo === 'puertas') expect(pedido.status).toBe('PRODUCED');
  }, 20000);

  it('sin carpeta de borradores, regenerar conserva la ficha del corte y su enlace', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    t.sinBorradores();
    expect((await t.servicio.guardar(t.cuerpo(true, { decisionCorte: 'regenerar' }))).status).toBe(200);
    expect((await t.obtener()).corteConfirmado?.huella).toBeTruthy();
    expect(await t.servicio.estadoCorte(t.codigo)).toMatchObject({ revisado: true });
  });

  it('regenerar después de simular no vuelve a preguntar si se sustituye el plano', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    t.produccion(false);
    await t.servicio.guardar(t.cuerpo(true, { decisionCorte: 'regenerar' }));
    t.produccion(true);
    expect((await t.servicio.guardar(t.cuerpo(true, { decisionCorte: 'regenerar' }))).status).toBe(200);
    expect((await t.obtener()).corteConfirmado?.huella).toBeTruthy();
  });
  it('otro técnico guarda sin sustituir ni convertirse en revisor; mantiene autor y apunta updatedBy', async () => {
    const t = await preparar(tipo);
    expect((await t.servicio.guardar(t.cuerpo())).status).toBe(200);
    expect((await t.servicio.guardar(t.cuerpo(false, { savedBy: 'IVÁN' }))).status).toBe(200);
    expect(await t.obtener()).toMatchObject({ createdBy: 'ANA', updatedBy: 'IVÁN', summary: { technician: 'ANA', reviewer: 'DAVID' } });
  });

  it('CoordinaOT caído permite guardar; quien guarda nunca se convierte en revisor', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    t.desconectar();
    expect((await t.servicio.guardar(t.cuerpo(false, { savedBy: 'IVÁN' }))).status).toBe(200);
    expect(await t.obtener()).toMatchObject({ updatedBy: 'IVÁN', summary: { technician: 'ANA', reviewer: '' } });
    await expect(t.servicio.generar(t.codigo, {})).rejects.toMatchObject({ statusCode: 503 });
  });

  it('mantener conserva la marca en sucesivos guardados hasta aceptar expresamente el corte', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    await t.servicio.guardar(t.cuerpo(true, { decisionCorte: 'mantener' }));
    expect((await t.servicio.guardar(t.cuerpo(true, { decisionCorte: 'mantener' }))).status).toBe(200);
    expect((await t.obtener()).corteNoRegenerado).toBe(true);
    const pregunta = (await t.servicio.guardar(t.cuerpo(true))).cuerpo as { huella: string };
    expect(pregunta).toMatchObject({ cambioCorte: true });
    expect((await t.obtener()).corteNoRegenerado).toBe(true);
    await t.servicio.guardar(t.cuerpo(true, { aceptarHuellaCorte: pregunta.huella }));
    expect((await t.obtener()).corteNoRegenerado).toBe(false);
  });

  it('un plano ajeno pregunta antes de escribir o guardar; cancelar conserva todo', async () => {
    const t = await preparar(tipo);
    const ruta = path.join(t.raiz, 'planos', `${t.codigo}-10.dxf`);
    await fs.mkdir(path.dirname(ruta), { recursive: true });
    await fs.writeFile(ruta, 'Plano manual ajeno');
    expect((await t.servicio.guardar(t.cuerpo())).cuerpo).toMatchObject({ needsPlanoConfirmation: true });
    expect(await fs.readFile(ruta, 'utf8')).toBe('Plano manual ajeno');
    await expect(t.obtener()).rejects.toMatchObject({ statusCode: 404 });
    expect((await t.servicio.guardar(t.cuerpo(false, { confirmPlanoOverwrite: true }))).status).toBe(200);
    expect(await fs.readFile(ruta, 'utf8')).not.toBe('Plano manual ajeno');
  });

  it('si falla el primer guardado retira el plano nuevo y no deja un pedido a medias', async () => {
    const t = await preparar(tipo);
    t.fallar();
    await expect(t.servicio.guardar(t.cuerpo())).rejects.toThrow('Fallo al guardar');
    expect(await fs.readdir(path.join(t.raiz, 'planos')).catch(() => [])).toEqual([]);
    await expect(t.obtener()).rejects.toMatchObject({ statusCode: 404 });
  });

  it('pregunta antes de cambiar un corte y mantener conserva bytes y marca el pedido', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    const original = (await t.obtener()).corteConfirmado!;
    const bytes = await fs.readFile(original.plano);
    expect((await t.servicio.guardar(t.cuerpo(true))).cuerpo).toMatchObject({ needsRegenerateConfirmation: true });
    expect(await fs.readFile(original.plano)).toEqual(bytes);
    expect((await t.servicio.guardar(t.cuerpo(true, { decisionCorte: 'mantener' }))).status).toBe(200);
    expect(await t.obtener()).toMatchObject({ corteNoRegenerado: true, corteConfirmado: { huella: original.huella } });
    expect(await fs.readFile(original.plano)).toEqual(bytes);
    expect((await t.servicio.listar(2026)).reviews[0]).toMatchObject({ corteNoRegenerado: true });
    const pregunta = (await t.servicio.generar(t.codigo, { savedBy: 'IVÁN' })).cuerpo as { tokenCorte: string };
    expect(pregunta).toMatchObject({ corteNoRegenerado: true });
    expect((await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', aceptarCorteNoRegenerado: pregunta.tokenCorte })).status).toBe(200);
    expect(await t.obtener()).toMatchObject({ corteNoRegenerado: false, corteConfirmado: { huella: original.huella } });
  }, 20000);

  it('regenera, guarda y acepta de una vez; si falla el guardado restaura el plano', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    expect((await t.servicio.guardar(t.cuerpo(true, { decisionCorte: 'regenerar' }))).status).toBe(200);
    const pedido = await t.obtener();
    expect(pedido.corteNoRegenerado).toBe(false);
    expect((await t.servicio.guardar(t.cuerpo(true))).status).toBe(200);
    const bytes = await fs.readFile(pedido.corteConfirmado!.plano);
    t.fallar();
    await expect(t.servicio.guardar(t.cuerpo(false, { decisionCorte: 'regenerar' }))).rejects.toThrow('Fallo al guardar');
    expect(await fs.readFile(pedido.corteConfirmado!.plano)).toEqual(bytes);
  }, 20000);

  it('en simulación regenerar guarda la decisión sin modificar el plano anterior', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    const ruta = (await t.obtener()).corteConfirmado!.plano, bytes = await fs.readFile(ruta);
    t.produccion(false);
    expect((await t.servicio.guardar(t.cuerpo(true, { decisionCorte: 'regenerar' }))).status).toBe(200);
    expect(await t.obtener()).toMatchObject({ corteSimulado: true, corteNoRegenerado: false });
    expect((await t.obtener()).corteConfirmado).toBeUndefined();
    expect(await fs.readFile(ruta)).toEqual(bytes);
    t.produccion(true);
    await expect(t.servicio.generar(t.codigo, { savedBy: 'IVÁN' })).rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/simulación.*regenera/i) });
  });

  it('un DWG cambiado pregunta, aceptar guarda su huella y sin cambios sigue', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    const ruta = (await t.obtener()).corteConfirmado!.plano;
    const dxf = (await fs.readFile(ruta, 'utf8')).replace(/\r\n/g, '\n');
    const { recuadro } = corteDelPlano(dxf);
    const fin = dxf.indexOf('  0\nENDSEC\n', dxf.indexOf('\nENTITIES\n'));
    const x = (recuadro.x0 + recuadro.x1) / 2, y = (recuadro.y0 + recuadro.y1) / 2;
    await fs.writeFile(ruta, `${dxf.slice(0, fin)}  0\nLINE\n  8\nDISCO1\n 10\n${x}\n 20\n${y}\n 11\n${x + 1}\n 21\n${y}\n${dxf.slice(fin)}`);
    const pregunta = (await t.servicio.guardar(t.cuerpo())).cuerpo as { cambioCorte: boolean; huella: string };
    expect(pregunta.cambioCorte).toBe(true);
    expect((await t.servicio.guardar(t.cuerpo(false, { aceptarHuellaCorte: pregunta.huella }))).status).toBe(200);
    expect((await t.obtener()).corteConfirmado!.huella).toBe(pregunta.huella);
    expect((await t.servicio.guardar(t.cuerpo())).status).toBe(200);
  });

  it('abre el plano guardado aunque los nuevos datos estén incompletos', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    const bytes = await fs.readFile((await t.obtener()).corteConfirmado!.plano);
    const abierto = await t.servicio.borradorCorte({ orderCode: t.codigo, savedBy: 'IVÁN' });
    expect(abierto).toMatchObject({ status: 200, cuerpo: { existente: true } });
    expect(await fs.readFile((await t.obtener()).corteConfirmado!.plano)).toEqual(bytes);
  });

  it('también pregunta al cambiar la cabecera, que forma parte del plano', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    const entrada = t.cuerpo();
    if ('pedido' in entrada) entrada.pedido.cabecera.cliente = 'Otro cliente';
    if ('elementos' in entrada) for (const e of entrada.elementos) e.input.cabecera.cliente = 'Otro cliente';
    expect((await t.servicio.guardar(entrada)).cuerpo).toMatchObject({ needsRegenerateConfirmation: true });
  });

  it('si falla guardar tras aceptar un borrador, conserva el borrador y retira la copia', async () => {
    const t = await preparar(tipo);
    await t.servicio.borradorCorte(t.cuerpo());
    const pregunta = (await t.servicio.guardar(t.cuerpo())).cuerpo as { huella: string };
    expect(pregunta).toMatchObject({ cambioCorte: true });
    t.fallar();
    await expect(t.servicio.guardar(t.cuerpo(false, { aceptarHuellaCorte: pregunta.huella }))).rejects.toThrow('Fallo al guardar');
    expect((await fs.readdir(path.join(t.raiz, 'borradores'))).length).toBe(1);
    expect(await fs.readdir(path.join(t.raiz, 'planos')).catch(() => [])).toEqual([]);
  });

  it('generar admite pasadas, rechaza una OF en revisión y conserva el corte', async () => {
    const t = await preparar(tipo);
    await t.servicio.guardar(t.cuerpo());
    t.estado('en_revision');
    await expect(t.servicio.generar(t.codigo, { savedBy: 'IVÁN' })).rejects.toMatchObject({ statusCode: 409 });
    t.estado('pasada');
    expect((await t.servicio.generar(t.codigo, { savedBy: 'IVÁN', confirmOverwrite: true })).status).toBe(200);
    expect(await t.obtener()).toMatchObject({ status: 'PRODUCED', reviewedBy: 'DAVID', production: { createdBy: 'IVÁN' } });
    expect((await t.servicio.guardar(t.cuerpo(true))).cuerpo).toMatchObject({ needsRegenerateConfirmation: true });
    expect((await t.servicio.guardar(t.cuerpo(true, { decisionCorte: 'regenerar' }))).status).toBe(200);
    expect((await t.obtener()).entregaActual).toBe(10);
  });
});
