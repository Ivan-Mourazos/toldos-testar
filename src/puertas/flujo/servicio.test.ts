import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import habitual from '../__fixtures__/AR2605134.json';
import { nuevaPuerta } from '../calcular.ts';
import { crearAlmacenPedidos } from '../../remolques/flujo/almacen.ts';
import type { PedidoPuertas, Puerta } from '../tipos.ts';
import { pedidoParaEditar } from './pedido.ts';
import { crearServicioPedidosPuertas, type PlanoPuertas } from './servicio.ts';
import { crearPlanoPuertas } from './archivos.ts';
import { crearAlmacenConfirmaciones } from '../../flujoDwg/confirmaciones.js';
import { corteDelPlano } from '../../flujoDwg/corteDwg.js';
import { TIPO_PEDIDO_PUERTAS, type PedidoPuertasGuardado } from './tipos.ts';

// AR2605134 (el caso más común): tres enrollables iguales configuradas desde el PDF del pedido.
function puertaHabitual(): Puerta {
  const f = habitual;
  return { ...nuevaPuerta('PUERTAENR'), frente: f.frente, alto: f.alto, of: f.of, cantidad: f.cantidad, color: f.color,
    rollo: 300, rolloCristal: 140, rolloSaco: 300, confirmada: true, ventanasConfirmadas: true,
    enrollable: { T: f.T, D: f.D, margen: f.margen, empates: [] },
    entradas: f.alturasTubos.map((altura) => ({ altura, diametro: 30 as const, largo: f.frente, alto: 8, huecos: [] })) };
}
const pedidoPantalla = (cambios: Partial<Puerta> = {}): PedidoPuertas & { cabecera: unknown } => ({
  schemaVersion: 1, kind: 'puertas', orderCode: 'AR.26.05134',
  cabecera: { cliente: 'PORTANOVA', fecha: '2026-10-21' },
  elementos: [{ id: 'puerta-1', input: { ...puertaHabitual(), ...cambios } }],
});

let raiz: string;
let activa: boolean;
let aprobada: boolean;
let otro: string | null;
let escritos: string[];
let borradores: boolean;
let servicio: ReturnType<typeof crearServicioPedidosPuertas>;
beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/puertas-flujo-'));
  activa = true;
  aprobada = true;
  otro = null;
  escritos = [];
  borradores = true;
  const almacen = crearAlmacenPedidos<PedidoPuertasGuardado>({ carpeta: async () => path.join(raiz, 'pedidos/puertas'),
    tipo: TIPO_PEDIDO_PUERTAS, nombre: 'puertas', sinCarpeta: 'Sin carpeta' });
  const plano: PlanoPuertas = {
    async preparar(pedido, revisor, carpetaBorradores) {
      return { fichero: { type: 'plano-puertas', filename: `${pedido.orderCode}.dwg`, savedPath: path.join(carpetaBorradores ?? path.join(raiz, 'planos'), `${pedido.orderCode}.dwg`),
        contenido: Buffer.from(`PLANO ${pedido.orderCode} REVISOR ${revisor}`) }, avisos: [] };
    },
    async escribir(fichero) {
      await fs.mkdir(path.dirname(fichero.savedPath), { recursive: true });
      await fs.writeFile(fichero.savedPath, fichero.contenido);
      escritos.push(fichero.filename);
    },
  };
  servicio = crearServicioPedidosPuertas({
    almacen, plano, tecnicos: ['IVÁN', 'DAVID'], otroProducto: async () => otro,
    ajustes: async () => ({ productionEnabled: activa, corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}'),
      corteLonaPlanoDirectory: path.join(raiz, 'planos'), corteLonaDxfDirectory: path.join(raiz, '{YYYY}/DXFs'),
      corteBorradoresDirectory: borradores ? path.join(raiz, 'borradores') : '', corteBorradoresRed: borradores ? String.raw`\\stinkor\oftecnica\BORRADORES CORTE` : '' }),
    coordina: { statusOf: async (ofs) => ({ disponible: true, ofs: Object.fromEntries(ofs.map((of) => [of, aprobada ? { estado: 'aprobada', revisor: 'DAVID' } : { estado: 'en_revision' }])) }) },
    ahora: () => new Date('2026-10-22T08:00:00Z'),
  });
});
afterEach(async () => { await fs.rm(raiz, { recursive: true, force: true }); });

describe('guardar para revisión', () => {
  it('guarda con el autor, el cliente y la fecha, lo lista en su año y escribe el plano para revisar', async () => {
    const { status, cuerpo } = await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ ok: true, review: { orderCode: 'AR2605134', kind: 'puertas', status: 'PENDING_REVIEW',
      summary: { customer: 'PORTANOVA', orderDate: '2026-10-21', technician: 'IVÁN', ofs: ['0233175'], models: ['Enrollable'], awnings: 1 } },
      plano: { files: [{ filename: 'AR2605134.dwg' }] } });
    expect((cuerpo as { review: object }).review).not.toHaveProperty('elementos');
    expect(escritos).toEqual(['AR2605134.dwg']);
    const { reviews } = await servicio.listar(2026);
    expect(reviews.map((r) => r.orderCode)).toEqual(['AR2605134']);
    expect(reviews[0].summary.awningList).toEqual([{ letter: 'A', model: 'Enrollable', of: '0233175', state: 'ok', notes: [] }]);
    expect((await servicio.listar(2025)).reviews).toEqual([]);
    expect((await servicio.obtener('AR2605134')).elementos[0].input.frente).toBe(212);
  });

  it('no guarda sin «Soy», sin OF, con comprobaciones pendientes ni si el número es de otro producto', async () => {
    await expect(servicio.guardar({ pedido: pedidoPantalla(), savedBy: '' })).rejects.toThrow(/Soy/);
    await expect(servicio.guardar({ pedido: pedidoPantalla({ of: '' }), savedBy: 'IVÁN' })).rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/OF de la puerta A/) });
    await expect(servicio.guardar({ pedido: pedidoPantalla({ confirmada: false }), savedBy: 'IVÁN' })).rejects.toThrow(/Confirmado con el dibujo/);
    await expect(servicio.guardar({ pedido: { kind: 'puertas' }, savedBy: 'IVÁN' })).rejects.toMatchObject({ statusCode: 400 });
    otro = 'remolques';
    await expect(servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/remolques/) });
    expect(escritos).toEqual([]);
  });

  it('pregunta antes de sustituir uno guardado y nunca pisa uno generado; el plano hecho a mano no se sustituye sin confirmar', async () => {
    expect((await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).status).toBe(200);
    expect((await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).cuerpo).toMatchObject({ needsConfirmation: true });
    const segunda = await servicio.guardar({ pedido: pedidoPantalla({ frente: 210 }), savedBy: 'DAVID', confirmOverwrite: true });
    // El plano ya estaba: se avisa y no se sustituye al volver a guardar.
    expect(segunda.cuerpo).toMatchObject({ overwritten: true, plano: { files: [], existentes: ['AR2605134.dwg'] } });
    // El autor sigue siendo quien lo guardó primero.
    expect((await servicio.obtener('AR2605134')).summary.technician).toBe('IVÁN');
    expect((await servicio.planoRevision('AR2605134', {})).status).toBe(409);
    expect((await servicio.planoRevision('AR2605134', { confirmOverwrite: true })).status).toBe(200);
    expect((await servicio.generar('AR2605134', { confirmOverwrite: true })).status).toBe(200);
    await expect(servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN', confirmOverwrite: true })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('en simulación guarda el pedido pero no escribe el plano', async () => {
    activa = false;
    const { cuerpo } = await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    expect(cuerpo).toMatchObject({ ok: true, plano: { files: [], avisos: ['Modo simulación: no se ha escrito el plano.'] } });
    expect(escritos).toEqual([]);
  });
});

describe('generar archivos', () => {
  it('solo con CoordinaOT aprobado: escribe el plano definitivo con el revisor y pasa a generado', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    aprobada = false;
    await expect(servicio.generar('AR2605134', {})).rejects.toMatchObject({ statusCode: 409 });
    aprobada = true;
    expect((await servicio.generar('AR2605134', {})).cuerpo).toMatchObject({ needsConfirmation: true, existing: ['AR2605134.dwg'] });
    const { status, cuerpo } = await servicio.generar('AR2605134', { confirmOverwrite: true });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ review: { status: 'PRODUCED', reviewedBy: 'DAVID' }, saved: [{ type: 'plano-puertas', filename: 'AR2605134.dwg' }] });
    expect(await fs.readFile(path.join(raiz, 'planos/AR2605134.dwg'), 'utf8')).toBe('PLANO AR2605134 REVISOR DAVID');
    expect((await servicio.generar('AR2605134', {})).cuerpo).toMatchObject({ unchanged: true });
  });

  it('con la generación apagada no hace nada', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    activa = false;
    await expect(servicio.generar('AR2605134', { confirmOverwrite: true })).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('corte', () => {
  it('enseña el corte y descarga un solo DXF con el número del pedido', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    const vista = await servicio.corte('AR2605134');
    expect(vista.sinOf).toEqual([]);
    expect(vista.cortes.length).toBeGreaterThan(0);
    const dxf = await servicio.descargarCorte('AR2605134');
    expect(dxf.filename).toBe('AR2605134.dxf');
    expect(Buffer.from(dxf.contents).toString('latin1')).toContain('AC1018');
  });

  it('manda el corte con las comprobaciones comunes (autor, CoordinaOT) y lo deja apuntado', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    await expect(servicio.enviarCorte('AR2605134', { usuario: 'DAVID', destino: 'dxfs' })).rejects.toMatchObject({ statusCode: 403 });
    aprobada = false;
    await expect(servicio.enviarCorte('AR2605134', { usuario: 'IVÁN', destino: 'dxfs' })).rejects.toMatchObject({ statusCode: 409 });
    aprobada = true;
    expect((await servicio.enviarCorte('AR2605134', { usuario: 'IVÁN', destino: 'dxfs' })).status).toBe(200);
    const pedido = await servicio.obtener('AR2605134');
    expect(pedido.enviosCorte?.map((e) => e.archivos.map((a) => a.filename))).toEqual([['AR2605134.dxf']]);
    // La carpeta del bot no la crea la web.
    await expect(servicio.enviarCorte('AR2605134', { usuario: 'IVÁN', destino: 'bot', confirmBot: true })).rejects.toThrow(/No existe la carpeta del bot/);
  });
});

it('«Corregir» vuelve a la pantalla con lo guardado (número tal cual, cliente y puertas)', async () => {
  await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
  const editable = pedidoParaEditar(await servicio.obtener('AR2605134'));
  expect(editable).toMatchObject({ kind: 'puertas', orderCode: 'AR.26.05134', cabecera: { cliente: 'PORTANOVA', fecha: '2026-10-21' } });
  expect(editable.elementos[0].input).toEqual(puertaHabitual());
});

// Flujo del DWG, fase 1 (plan del 24/10/2026): el borrador del plano en su carpeta y el enlace para abrirlo en ZWCAD.
describe('borrador del corte', () => {
  const red = String.raw`\\stinkor\oftecnica\BORRADORES CORTE\AR2605134.dwg`;
  it('escribe el plano en la carpeta de borradores y da el enlace tgm-pedidos con su ruta de red', async () => {
    const { status, cuerpo } = await servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ ok: true, existente: false, filename: 'AR2605134.dwg', ruta: red,
      url: `tgm-pedidos://open?kind=cad&path=${encodeURIComponent(red)}` });
    expect(await fs.readFile(path.join(raiz, 'borradores', 'AR2605134.dwg'), 'utf8')).toBe('PLANO AR2605134 REVISOR ');
  });
  it('si ya hay un borrador no lo pisa: lo abre, salvo que se pida generarlo de nuevo', async () => {
    await servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    await fs.writeFile(path.join(raiz, 'borradores', 'AR2605134.dwg'), 'CAMBIADO EN ZWCAD');
    expect((await servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).cuerpo).toMatchObject({ existente: true, ruta: red });
    expect(await fs.readFile(path.join(raiz, 'borradores', 'AR2605134.dwg'), 'utf8')).toBe('CAMBIADO EN ZWCAD');
    expect((await servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN', regenerar: true })).cuerpo).toMatchObject({ existente: false, sustituido: true });
    expect(await fs.readFile(path.join(raiz, 'borradores', 'AR2605134.dwg'), 'utf8')).toBe('PLANO AR2605134 REVISOR ');
  });
  it('no escribe nada sin «Soy», en simulación, sin las carpetas o con comprobaciones pendientes', async () => {
    await expect(servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: '' })).rejects.toMatchObject({ message: expect.stringContaining('Soy') });
    activa = false;
    await expect(servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).rejects.toMatchObject({ message: expect.stringContaining('simulación') });
    activa = true;
    borradores = false;
    await expect(servicio.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' })).rejects.toMatchObject({ message: expect.stringContaining('borradores') });
    borradores = true;
    await expect(servicio.borradorCorte({ pedido: pedidoPantalla({ alto: 0 }), savedBy: 'IVÁN' })).rejects.toMatchObject({ message: expect.stringContaining('comprobaciones') });
    expect(escritos).toEqual([]);
  });
});

// Flujo del DWG, fase 2 (plan del 24/10/2026): confirmar el corte del borrador y guardarlo para revisión desde él.
describe('corte confirmado desde el borrador', () => {
  let flujo: ReturnType<typeof crearServicioPedidosPuertas>;
  let paginas: string[] = [], pdfFalla = false;
  const borrador = () => path.join(raiz, 'borradores', 'AR2605134.dxf');
  const enAnio = () => path.join(raiz, 'planos', 'AR2605134.dxf');
  beforeEach(async () => {
    paginas = [];
    pdfFalla = false;
    await fs.mkdir(path.join(raiz, 'bot/Ivan.Sanchez'), { recursive: true });
    const almacen = crearAlmacenPedidos<PedidoPuertasGuardado>({ carpeta: async () => path.join(raiz, 'pedidos/puertas'),
      tipo: TIPO_PEDIDO_PUERTAS, nombre: 'puertas', sinCarpeta: 'Sin carpeta' });
    const ajustes = async () => ({ productionEnabled: true, corteLonaPlanoDirectory: path.join(raiz, 'planos'), corteLonaDxfDirectory: path.join(raiz, '{YYYY}/DXFs'),
      corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}'), remolquesPlanteamientosDirectory: path.join(raiz, 'planteamientos/{YYYY}'),
      corteBorradoresDirectory: path.join(raiz, 'borradores'), corteBorradoresRed: String.raw`\\stinkor\oftecnica\BORRADORES CORTE` });
    flujo = crearServicioPedidosPuertas({
      almacen, tecnicos: ['IVÁN', 'DAVID'], otroProducto: async () => null, ajustes,
      // Sin ODA el plano va en DXF: se lee tal cual.
      plano: crearPlanoPuertas({ ajustes, oda: { disponible: false, convertir: async (c) => c } }),
      confirmaciones: crearAlmacenConfirmaciones({ carpeta: async () => path.join(raiz, 'confirmados') }),
      // El PDF de las presentaciones: aquí, la página que se imprimiría.
      presentacionesPdf: async (html) => { if (pdfFalla) throw new Error('Chromium no está'); paginas.push(html); return Buffer.from(`%PDF ${paginas.length}`); },
      coordina: { statusOf: async (ofs) => ({ disponible: true, ofs: Object.fromEntries(ofs.map((of) => [of, { estado: 'aprobada', revisor: 'DAVID' }])) }) },
      ahora: () => new Date('2026-10-24T08:00:00Z'),
    });
  });
  const abrir = () => flujo.borradorCorte({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
  const confirmar = () => flujo.confirmarCorte({ orderCode: 'AR2605134', savedBy: 'IVÁN' });
  const guardar = (extra = {}) => flujo.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN', ...extra });
  /** Una línea de corte más en el borrador, dentro (o fuera) del recuadro CORTE, como si se dibujara en ZWCAD. */
  async function dibujarEnBorrador(fuera: boolean, fichero = borrador()) {
    const dxf = (await fs.readFile(fichero, 'utf8')).replace(/\r\n/g, '\n');
    const { recuadro } = corteDelPlano(dxf);
    const x = fuera ? recuadro.x1 + 50 : (recuadro.x0 + recuadro.x1) / 2, y = (recuadro.y0 + recuadro.y1) / 2;
    const fin = dxf.indexOf('  0\nENDSEC\n', dxf.indexOf('\nENTITIES\n'));
    await fs.writeFile(fichero, `${dxf.slice(0, fin)}  0\nLINE\n  8\nDISCO1\n 10\n${x}\n 20\n${y}\n 11\n${x + 0.5}\n 21\n${y}\n${dxf.slice(fin)}`);
  }

  it('sin confirmar el corte no se guarda para revisión', async () => {
    await expect(guardar()).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('Confirmar corte') });
    await abrir();
    await expect(guardar()).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('Confirmar corte') });
  });

  it('confirmado, guarda para revisión: el borrador pasa a la carpeta del año y el pedido apunta quién lo confirmó', async () => {
    await abrir();
    const confirmado = await confirmar();
    expect(confirmado).toMatchObject({ status: 200, cuerpo: { ok: true, confirmado: { por: 'IVÁN', filename: 'AR2605134.dxf' } } });
    const contenido = await fs.readFile(borrador(), 'utf8');
    const { status, cuerpo } = await guardar();
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ plano: { files: [{ filename: 'AR2605134.dxf', savedPath: enAnio() }], avisos: [] } });
    expect(await fs.readFile(enAnio(), 'utf8')).toBe(contenido);
    await expect(fs.stat(borrador())).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await flujo.obtener('AR2605134')).corteConfirmado).toMatchObject({ por: 'IVÁN', plano: enAnio(),
      huella: (confirmado.cuerpo as { confirmado: { huella: string } }).confirmado.huella });
  });

  it('si el borrador cambia después de confirmarlo, hay que volver a confirmarlo', async () => {
    await abrir();
    await confirmar();
    await dibujarEnBorrador(false);
    await expect(guardar()).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('ha cambiado') });
    expect((await confirmar()).status).toBe(200);
    expect((await guardar()).status).toBe(200);
  });

  it('no confirma un corte con líneas fuera de los recuadros', async () => {
    await abrir();
    await dibujarEnBorrador(true);
    expect(await confirmar()).toMatchObject({ status: 409, cuerpo: { fuera: 1, error: expect.stringContaining('fuera de los recuadros') } });
  });

  it('pregunta antes de sustituir el plano de la carpeta del año', async () => {
    await fs.mkdir(path.dirname(enAnio()), { recursive: true });
    await fs.writeFile(enAnio(), 'HECHO A MANO');
    await abrir();
    await confirmar();
    expect((await guardar()).cuerpo).toMatchObject({ needsConfirmation: true, motivo: 'plano', existing: ['AR2605134.dxf'] });
    expect(await fs.readFile(enAnio(), 'utf8')).toBe('HECHO A MANO');
    expect((await guardar({ confirmOverwrite: true })).status).toBe(200);
    expect(await fs.readFile(enAnio(), 'utf8')).not.toBe('HECHO A MANO');
  });

  it('con el corte confirmado, generar no rehace el plano y «Guardar plano» no lo pisa', async () => {
    await abrir();
    await confirmar();
    await guardar();
    await fs.writeFile(enAnio(), 'CAMBIADO POR EL REVISOR');
    await expect(flujo.planoRevision('AR2605134', { confirmOverwrite: true })).rejects.toMatchObject({ statusCode: 409 });
    const { status, cuerpo } = await flujo.generar('AR2605134', {});
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ saved: [{ filename: 'AR2605134.dxf', savedPath: enAnio() }] });
    expect(await fs.readFile(enAnio(), 'utf8')).toBe('CAMBIADO POR EL REVISOR');
  });

  it('al corregir, «Abrir corte» sigue desde el DWG revisado', async () => {
    await abrir();
    await confirmar();
    await guardar();
    const revisado = await fs.readFile(enAnio(), 'utf8');
    expect((await abrir()).cuerpo).toMatchObject({ existente: true, avisos: expect.arrayContaining([expect.stringContaining('revisión')]) });
    expect(await fs.readFile(borrador(), 'utf8')).toBe(revisado);
  });

  // Fase 3: el DXF del bot sale del DWG revisado, tal como está al mandarlo.
  it('el corte que sale es el del DWG, sin recuadros ni cotas, y si cambió después de revisarlo se pregunta', async () => {
    await abrir();
    await confirmar();
    await guardar();
    const enviar = (extra = {}) => flujo.enviarCorte('AR2605134', { usuario: 'IVÁN', destino: 'dxfs', confirmOverwrite: true, ...extra });
    expect((await enviar()).status).toBe(200);
    const dxf = await fs.readFile(path.join(raiz, '2026/DXFs/AR2605134.dxf'), 'latin1');
    const capas = new Set([...dxf.matchAll(/\r?\n {2}8\r?\n([^\r\n]+)/g)].map((m) => m[1]));
    expect(dxf).toContain('AC1018');
    expect(capas.has('DISCO1')).toBe(true);
    expect(['RECUADROS', 'cotas', 'referencias'].some((c) => capas.has(c))).toBe(false);
    expect(dxf).not.toContain('DIMENSION');
    // Alguien cambia el corte en ZWCAD después de confirmarlo y revisarlo.
    await dibujarEnBorrador(false, enAnio());
    expect(await enviar()).toMatchObject({ status: 409, cuerpo: { cambioCorte: true } });
    const conCambios = await enviar({ aceptarCambioCorte: true });
    expect(conCambios.status).toBe(200);
    expect((conCambios.cuerpo as { envio: { nota?: string } }).envio.nota).toContain('cambiado');
    const nuevo = await fs.readFile(path.join(raiz, '2026/DXFs/AR2605134.dxf'), 'latin1');
    const lineas = (t: string) => (t.match(/\nLINE\r?\n/g) ?? []).length;
    expect(lineas(nuevo)).toBe(lineas(dxf) + 1);
  });

  // Fase 4: al mandar al bot, las presentaciones del DWG revisado en PDF, en planteamientos como AR…-10.pdf.
  const alBot = (extra = {}) => flujo.enviarCorte('AR2605134', { usuario: 'IVÁN', destino: 'bot', confirmBot: true, confirmOverwrite: true, ...extra });
  const pdf = (n: number) => path.join(raiz, 'planteamientos/2026', `AR2605134-${n}.pdf`);
  it('al mandar al bot guarda las presentaciones en AR…-10.pdf, con el revisor; rehecho, lo sustituye sin preguntar', async () => {
    await abrir(); await confirmar(); await guardar();
    const { status, cuerpo } = await alBot();
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ presentaciones: { filename: 'AR2605134-10.pdf' } });
    expect(await fs.readFile(pdf(10), 'utf8')).toBe('%PDF 1');
    // Una hoja por presentación, con el revisor de CoordinaOT en el cajetín.
    expect(paginas[0]).toContain('aria-label="PUERTA A"');
    expect(paginas[0]).toContain('DAVID');
    expect((await flujo.obtener('AR2605134')).presentacionesPdf).toMatchObject({ numero: 10, ruta: pdf(10) });
    expect((await alBot()).status).toBe(200);
    expect(await fs.readFile(pdf(10), 'utf8')).toBe('%PDF 2');
    // Guardar el DXF en DXFs no hace PDF.
    await flujo.enviarCorte('AR2605134', { usuario: 'IVÁN', destino: 'dxfs', confirmOverwrite: true });
    expect(paginas).toHaveLength(2);
  });
  it('si ya hay un AR…-10.pdf que no hizo la web, pregunta: otra parte del pedido (-11) o sustituirlo', async () => {
    await abrir(); await confirmar(); await guardar();
    await fs.mkdir(path.dirname(pdf(10)), { recursive: true });
    await fs.writeFile(pdf(10), 'DE LOS TOLDOS CORTINA');
    expect(await alBot()).toMatchObject({ status: 409, cuerpo: { pdfExiste: true, existente: 'AR2605134-10.pdf', siguiente: 'AR2605134-11.pdf' } });
    expect(paginas).toHaveLength(0);
    expect((await alBot({ pdfModo: 'siguiente' })).cuerpo).toMatchObject({ presentaciones: { filename: 'AR2605134-11.pdf' } });
    expect(await fs.readFile(pdf(10), 'utf8')).toBe('DE LOS TOLDOS CORTINA');
    // Ya es suyo el -11: la siguiente vez lo sustituye sin preguntar.
    expect((await alBot()).cuerpo).toMatchObject({ presentaciones: { filename: 'AR2605134-11.pdf' } });
  });
  it('si el PDF falla, el corte ya está en el bot: se avisa', async () => {
    await abrir(); await confirmar(); await guardar();
    pdfFalla = true;
    const { status, cuerpo } = await alBot();
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ avisos: [expect.stringContaining('ya está en el bot')] });
    expect(await fs.readdir(path.join(raiz, 'bot/Ivan.Sanchez'))).toEqual(['AR2605134.dxf']);
  });
});
