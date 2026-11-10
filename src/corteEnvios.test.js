import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { enviarCorte } from './corteEnvios.js';
import { prepararArchivosCorte } from './corteLonaArchivos.js';
import { generarCorteLona } from './domain/corteLona/index.js';
import { crearEstadoCorteLona } from './corteLonaEstado.js';
import { pedidoVariasTelas } from './domain/corteLona/fixtures/variasTelas.js';

let raiz, entrada, guardar, preparar;
beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/envios-corte-'));
  guardar = vi.fn();
  preparar = vi.fn(async () => [{ filename: 'AR2604784.dxf', contents: Buffer.from('corte nuevo') }]);
  entrada = {
    pedido: { orderCode: 'AR2604784' }, order: { orderCode: 'AR2604784', technician: 'IVÁN' }, usuario: 'IVÁN',
    settings: { productionEnabled: true, corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}'), corteLonaDxfDirectory: path.join(raiz, '{YYYY}/DXFs') },
    destino: 'dxfs', confirmBot: false, confirmOverwrite: false,
    elementos: [{ letter: 'A', of: '0232568' }],
    coordina: { statusOf: vi.fn(async () => ({ disponible: true, ofs: { '0232568': { estado: 'aprobada' } } })) },
    comprobarCorte: vi.fn(), preparar, guardarRegistro: guardar, ahora: () => new Date('2026-10-21T09:00:00Z'),
  };
});
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(raiz, { recursive: true, force: true }); });

describe('Envío común del corte, independiente de generar archivos', () => {
  it.each(['toldos-testar-review', 'puertas', 'remolques'])('al bot nunca va con sufijo; el año solo lo pone desde la segunda entrega, en %s (Iván, 09/11/2026)', async kind => {
    const inicio = kind === 'toldos-testar-review' ? 1 : 10;
    await fs.mkdir(path.join(raiz, 'bot/Ivan.Sanchez'), { recursive: true });
    for (const numero of [inicio, inicio + 1, inicio]) {
      const pedido = { ...entrada.pedido, kind, entregaActual: numero };
      const nombreBot = `${pedido.orderCode}-${numero}.dxf`;
      const nombreAnual = numero === inicio ? `${pedido.orderCode}.dxf` : nombreBot;
      const preparar = async () => [{ filename: nombreBot, contents: Buffer.from(String(numero)) }];
      for (const destino of ['dxfs', 'bot']) {
        const r = await enviarCorte({ ...entrada, pedido, preparar, destino, confirmBot: true, confirmOverwrite: true });
        expect(r.cuerpo.envio.archivos[0].filename).toBe(destino === 'bot' ? `${pedido.orderCode}.dxf` : nombreAnual);
      }
    }
    expect(await fs.readFile(path.join(raiz, '2026/DXFs/AR2604784.dxf'), 'utf8')).toBe(String(inicio));
    expect(await fs.readFile(path.join(raiz, `2026/DXFs/AR2604784-${inicio + 1}.dxf`), 'utf8')).toBe(String(inicio + 1));
  });
  it.each(['bot', 'dxfs'])('envía un solo DXF con las dos opciones de varias telas a %s (el técnico de la máquina elige)', async destino => {
    const order = { ...pedidoVariasTelas(), technician: 'IVÁN' };
    const corteLona = crearEstadoCorteLona(order, { resultado: generarCorteLona(order, { ofStockSacos: '0230811' }), ofStockSacos: '0230811' });
    const preparar = async () => (await prepararArchivosCorte({ order, corteLona, settings: entrada.settings, tipo: 'bot', soloContenido: true })).files;
    if (destino === 'bot') await fs.mkdir(path.join(raiz, 'bot/Ivan.Sanchez'), { recursive: true });
    const res = await enviarCorte({ ...entrada, order, destino, confirmBot: true, preparar });
    expect(res.status).toBe(200);
    expect(res.cuerpo.envio.archivos.map(a => a.filename)).toEqual([`${order.orderCode}.dxf`]);
    const previstos = await preparar();
    for (const [i, archivo] of res.cuerpo.envio.archivos.entries()) {
      expect(await fs.readFile(archivo.savedPath)).toEqual(previstos[i].contents);
    }
  });
  it('si la carpeta de red no admite enlaces, escribe igual el DXF nuevo (montaje CIFS del servidor)', async () => {
    vi.spyOn(fs, 'link').mockRejectedValue(Object.assign(new Error('no admitido'), { code: 'EPERM' }));
    const res = await enviarCorte(entrada);
    expect(res.status).toBe(200);
    expect(await fs.readFile(path.join(raiz, '2026/DXFs/AR2604784.dxf'), 'utf8')).toBe('corte nuevo');
    expect((await fs.readdir(path.join(raiz, '2026/DXFs'))).filter((n) => n.endsWith('.tmp'))).toEqual([]);
  });
  it('crea DXFs y registra cuándo, quién, destino y archivos en el pedido', async () => {
    const res = await enviarCorte(entrada);
    expect(res.status).toBe(200);
    expect(await fs.readFile(path.join(raiz, '2026/DXFs/AR2604784.dxf'), 'utf8')).toBe('corte nuevo');
    expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ enviosCorte: [expect.objectContaining({
      fecha: '2026-10-21T09:00:00.000Z', usuario: 'IVÁN', destino: 'dxfs', carpeta: path.join(raiz, '2026/DXFs'),
    })] }));
    expect(entrada.coordina.statusOf).toHaveBeenCalledWith(['0232568'], { fresh: true });
  });
  it('no crea nunca la carpeta del técnico del bot e informa de su ruta', async () => {
    await expect(enviarCorte({ ...entrada, destino: 'bot', confirmBot: true })).rejects.toThrow(/Ivan.Sanchez/);
    expect(await fs.readdir(raiz)).toEqual([]);
    expect(guardar).not.toHaveBeenCalled();
  });
  it('exige confirmar que se va a cortar antes de enviar al bot', async () => {
    const res = await enviarCorte({ ...entrada, destino: 'bot' });
    expect(res).toMatchObject({ status: 409, cuerpo: { needsBotConfirmation: true } });
    expect(preparar).not.toHaveBeenCalled();
  });
  it('avisa al repetir y registra el número de envío y la entrega sin alterar el anterior', async () => {
    const anterior = { id: 'primero', numero: 1, entrega: 2, destino: 'bot', archivos: [] };
    const pedido = { ...entrada.pedido, entregaActual: 2, enviosCorte: [anterior] };
    const aviso = await enviarCorte({ ...entrada, pedido, destino: 'bot' });
    expect(aviso).toMatchObject({ status: 409, cuerpo: { needsBotConfirmation: true, error: expect.stringContaining('no puede saber si ya se cortó') } });
    await fs.mkdir(path.join(raiz, 'bot/Ivan.Sanchez'), { recursive: true });
    const resultado = await enviarCorte({ ...entrada, pedido, destino: 'bot', confirmBot: true });
    expect(resultado).toMatchObject({ status: 200, cuerpo: { envio: { numero: 2, entrega: 2 } } });
    expect(guardar.mock.calls[0][0].enviosCorte[0]).toEqual(anterior);
    expect(pedido.enviosCorte).toHaveLength(1);
  });
  it.each(['bot', 'dxfs'])('pregunta antes de sustituir en %s y conserva el historial al confirmar', async (destino) => {
    const carpeta = path.join(raiz, destino === 'bot' ? 'bot/Ivan.Sanchez' : '2026/DXFs');
    await fs.mkdir(carpeta, { recursive: true });
    await fs.writeFile(path.join(carpeta, 'AR2604784.dxf'), 'anterior');
    const datos = { ...entrada, destino, confirmBot: true, pedido: { ...entrada.pedido, enviosCorte: [{ fecha: 'anterior' }] } };
    expect(await enviarCorte(datos)).toMatchObject({ status: 409, cuerpo: { needsConfirmation: true, existing: ['AR2604784.dxf'] } });
    expect(await fs.readFile(path.join(carpeta, 'AR2604784.dxf'), 'utf8')).toBe('anterior');
    expect(guardar).not.toHaveBeenCalled();
    expect((await enviarCorte({ ...datos, confirmOverwrite: true })).status).toBe(200);
    expect(guardar.mock.calls[0][0].enviosCorte).toHaveLength(2);
  });
  it.each([false, null])('sin aprobación comprobada (%s) no escribe nada', async (disponible) => {
    entrada.coordina.statusOf.mockResolvedValue({ disponible: disponible !== null, ofs: { '0232568': { estado: 'pendiente' } } });
    await expect(enviarCorte(entrada)).rejects.toThrow();
    expect(preparar).not.toHaveBeenCalled();
    expect(await fs.readdir(raiz)).toEqual([]);
  });
  it('sin OF, con corte viejo, sin «Soy» o en simulación no escribe ni registra', async () => {
    await expect(enviarCorte({ ...entrada, elementos: [{ letter: 'A', of: '' }] })).rejects.toThrow(/OF/);
    await expect(enviarCorte({ ...entrada, comprobarCorte: () => { throw new Error('El corte está viejo'); } })).rejects.toThrow(/viejo/);
    await expect(enviarCorte({ ...entrada, usuario: '' })).rejects.toThrow(/Soy/);
    await expect(enviarCorte({ ...entrada, settings: { productionEnabled: false } })).rejects.toThrow(/simulación/);
    expect(guardar).not.toHaveBeenCalled();
    expect(await fs.readdir(raiz)).toEqual([]);
  });
  it.each(['aprobada', 'pasada'])('un compañero envía con la OF %s; el autor de CoordinaOT no limita las acciones', async estado => {
    const coordina = { statusOf: vi.fn(async () => ({ disponible: true, ofs: { '0232568': { estado, autor: 'ana' } } })) };
    expect((await enviarCorte({ ...entrada, usuario: 'JAIME', coordina })).status).toBe(200);
    expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ enviosCorte: [expect.objectContaining({ usuario: 'JAIME' })] }));
  });
  it('avisa si el DXF salió pero falló el registro, para evitar repetirlo por error', async () => {
    guardar.mockRejectedValue(new Error('sin permiso'));
    await expect(enviarCorte(entrada)).rejects.toThrow(/ya se ha escrito.*registr/i);
  });
  it('conserva y valida la nueva plantilla de DXFs', async () => {
    const { defaultWorkflowSettings, normalizeWorkflowSettings } = await import('./workflow.js');
    const semilla = { corteLonaDxfDirectory: entrada.settings.corteLonaDxfDirectory };
    expect(normalizeWorkflowSettings({}, defaultWorkflowSettings(semilla))).toMatchObject(semilla);
    expect(() => normalizeWorkflowSettings({ corteLonaDxfDirectory: 'relativa/{YYYY}' })).toThrow(/absoluta/);
    expect(() => normalizeWorkflowSettings({ corteLonaDxfDirectory: path.join(raiz, '{OTRO}') })).toThrow(/plantilla/);
    expect(() => normalizeWorkflowSettings({ corteLonaDxfDirectory: raiz })).toThrow(/YYYY/);
  });
  it('si falla el segundo archivo, registra el que ya salió y avisa antes de repetir', async () => {
    preparar.mockResolvedValue([{ filename: 'primero.dxf', contents: Buffer.from('uno') }, { filename: 'segundo.dxf', contents: Buffer.from('dos') }]);
    const enlazar = fs.link.bind(fs);
    vi.spyOn(fs, 'link').mockImplementationOnce(enlazar).mockRejectedValueOnce(new Error('carpeta caída'));
    await expect(enviarCorte(entrada)).rejects.toThrow(/parte del corte.*registrad/i);
    expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ enviosCorte: [expect.objectContaining({ parcial: true, archivos: [expect.objectContaining({ filename: 'primero.dxf' })] })] }));
  });
});

it('preparar un envío a otro técnico no escribe ni registra hasta ejecutar', async () => {
  await fs.mkdir(path.join(raiz, 'bot/Angel'), { recursive: true });
  const plan = await enviarCorte({ ...entrada, destino: 'bot', tecnicoDestino: 'ÁNGEL', confirmBot: true, prepararSolo: true });
  expect(plan.status).toBe(200);
  expect(await fs.readdir(path.join(raiz, 'bot/Angel'))).toEqual([]);
  expect(guardar).not.toHaveBeenCalled();
  await plan.ejecutar();
  expect(await fs.readFile(path.join(raiz, 'bot/Angel/AR2604784.dxf'), 'utf8')).toBe('corte nuevo');
  expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ enviosCorte: [expect.objectContaining({ carpeta: path.join(raiz, 'bot/Angel') })] }));
});
it('rechaza un técnico de destino que no esté en la tabla', async () => {
  await expect(enviarCorte({ ...entrada, destino: 'bot', tecnicoDestino: '../inventado', confirmBot: true })).rejects.toThrow(/técnico de destino/);
  expect(guardar).not.toHaveBeenCalled();
});

it('al registrar conserva la aceptación del corte y los datos guardados tras preparar el PDF', async () => {
  const corteConfirmado = { plano: 'revisado.dwg', aceptadoSinRegenerar: { por: 'IVÁN' } };
  const actual = { ...entrada.pedido, corteNoRegenerado: true, production: { files: ['pedido.pdf'] }, enviosCorte: [{ id: 'anterior' }] };
  const plan = await enviarCorte({ ...entrada, prepararSolo: true,
    pedido: { ...entrada.pedido, corteNoRegenerado: false, corteConfirmado }, obtenerActual: async () => actual });
  await plan.ejecutar();
  expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ corteNoRegenerado: false, corteConfirmado,
    production: actual.production, enviosCorte: [actual.enviosCorte[0], expect.objectContaining({ destino: 'dxfs' })] }));
});
