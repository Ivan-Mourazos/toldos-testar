import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { enviarCorte } from './corteEnvios.js';
import { fuenteCorte, convertirCorte } from './corteMaquina.js';
import { checkWorkflowDirectories, defaultWorkflowSettings, normalizeWorkflowSettings } from './workflow.js';

let raiz, entrada, guardar, convertir;
beforeEach(async () => {
  raiz = await fs.mkdtemp(path.resolve('tmp/maquina-'));
  await fs.mkdir(path.join(raiz, 'maquina'));
  guardar = vi.fn();
  convertir = vi.fn(() => ({ cmt: Buffer.from([0, 255, 128]), dudas: [] }));
  entrada = { pedido: { orderCode: 'AR2600001', entregaActual: 10 }, order: { orderCode: 'AR2600001-10', technician: 'IVÁN' },
    settings: { productionEnabled: true, corteDirectoEnabled: true, corteMaquinaDxfDirectory: path.join(raiz, 'maquina/{YYYY}/DXF'), corteMaquinaCmtDirectory: path.join(raiz, 'maquina/{YYYY}') },
    usuario: 'IVÁN', destino: 'bot', confirmBot: true, elementos: [{ of: '0230001' }],
    coordina: { statusOf: async () => ({ disponible: true, ofs: { '0230001': { estado: 'aprobada' } } }) },
    comprobarCorte: async () => {}, preparar: async () => [{ filename: 'AR2600001-10.dxf', contents: Buffer.from([65, 0xe1, 10]) }], guardarRegistro: guardar, convertir };
});
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(raiz, { recursive: true, force: true }); });

it('envía los bytes del DXF intactos y el CMT sin leyenda, sin sufijo, y registra ambos', async () => {
  expect((await enviarCorte(entrada)).status).toBe(200);
  expect(await fs.readFile(path.join(raiz, 'maquina/2026/DXF/AR2600001.dxf'))).toEqual(Buffer.from([65, 0xe1, 10]));
  expect(await fs.readFile(path.join(raiz, 'maquina/2026/AR2600001.cmt'))).toEqual(Buffer.from([0, 255, 128]));
  expect(convertir).toHaveBeenCalledWith('Aá\n', { sinLeyenda: true });
  expect(guardar.mock.calls[0][0].enviosCorte[0]).toMatchObject({ destino: 'maquina', archivos: [expect.objectContaining({ filename: 'AR2600001.dxf' }), expect.objectContaining({ filename: 'AR2600001.cmt' })] });
});
it('las dudas impiden crear carpetas, escribir o registrar, aunque haya un CMT', async () => {
  convertir.mockReturnValue({ cmt: Buffer.from('incompleto'), dudas: [{ motivo: 'SPLINE no admitida', capa: 'CORTE' }] });
  await expect(enviarCorte(entrada)).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('SPLINE no admitida') });
  expect(await fs.readdir(path.join(raiz, 'maquina'))).toEqual([]);
  expect(guardar).not.toHaveBeenCalled();
});
it('al mandar de nuevo desde producción convierte el DXF actual aceptado; Historial conserva el original', async () => {
  entrada.pedido.enviosCorte = [{ entrega: 10, archivos: [{ filename: 'AR2600001.dxf', dxfBase64: Buffer.from('anterior').toString('base64') }] }];
  await enviarCorte(entrada);
  expect(convertir).toHaveBeenLastCalledWith('Aá\n', { sinLeyenda: true });
  await enviarCorte({ ...entrada, destino: 'maquina', confirmOverwrite: true });
  expect(convertir).toHaveBeenLastCalledWith('anterior', { sinLeyenda: true });
});
it('exige confirmación de corte y después pregunta por todos los archivos existentes', async () => {
  expect(await enviarCorte({ ...entrada, confirmBot: false })).toMatchObject({ status: 409, cuerpo: { needsBotConfirmation: true, error: expect.stringContaining('máquina') } });
  await enviarCorte(entrada);
  expect(await enviarCorte(entrada)).toMatchObject({ status: 409, cuerpo: { needsConfirmation: true, existing: ['AR2600001.dxf', 'AR2600001.cmt'] } });
  expect((await enviarCorte({ ...entrada, confirmOverwrite: true })).status).toBe(200);
});
it('un fallo al publicar el segundo fichero registra el primero y explica la salida parcial', async () => {
  const enlace = fs.link.bind(fs);
  vi.spyOn(fs, 'link').mockImplementation(async (de, a) => { if (a.endsWith('.cmt')) throw new Error('Disco lleno'); return enlace(de, a); });
  await expect(enviarCorte(entrada)).rejects.toThrow(/Solo una parte/);
  expect(guardar.mock.calls[0][0].enviosCorte[0]).toMatchObject({ destino: 'maquina', parcial: true, archivos: [expect.objectContaining({ filename: 'AR2600001.dxf' })] });
});
it('simulación devuelve 403 antes de convertir o preparar', async () => {
  await expect(enviarCorte({ ...entrada, settings: { ...entrada.settings, productionEnabled: false } })).rejects.toMatchObject({ statusCode: 403 });
  expect(convertir).not.toHaveBeenCalled();
});
it('no crea una raíz de máquina que no existe', async () => {
  entrada.settings.corteMaquinaCmtDirectory = path.join(raiz, 'no-existe/{YYYY}');
  await expect(enviarCorte(entrada)).rejects.toThrow(/raíz/);
  expect(await fs.readdir(path.join(raiz, 'maquina'))).toEqual([]);
});
it('si desaparece la raíz después de preparar producción, tampoco la vuelve a crear', async () => {
  const plan = await enviarCorte({ ...entrada, prepararSolo: true });
  await fs.rmdir(path.join(raiz, 'maquina'));
  await expect(plan.ejecutar()).rejects.toThrow();
  expect(await fs.stat(path.join(raiz, 'maquina')).catch(() => null)).toBeNull();
  expect(guardar).not.toHaveBeenCalled();
});
it('comprobar carpetas acepta el año pendiente sin crearlo; apagado no comprueba las máquinas', async () => {
  let r = await checkWorkflowDirectories(entrada.settings);
  expect(r.directories.filter(d => d.key.startsWith('corteMaquina'))).toEqual([
    expect.objectContaining({ key: 'corteMaquinaDxfDirectory', ok: true }), expect.objectContaining({ key: 'corteMaquinaCmtDirectory', ok: true }),
  ]);
  expect(await fs.readdir(path.join(raiz, 'maquina'))).toEqual([]);
  r = await checkWorkflowDirectories({ ...entrada.settings, corteDirectoEnabled: false });
  expect(r.directories.filter(d => d.key.startsWith('corteMaquina'))).toEqual([]);
});
it('un fichero antiguo cambiado después del envío y una excepción del conversor son dudas, no otro DXF', async () => {
  const savedPath = path.join(raiz, 'antiguo.dxf'); await fs.writeFile(savedPath, 'otro dibujo');
  await expect(fuenteCorte({ orderCode: 'AR2600001', enviosCorte: [{ fecha: '2020-01-01T00:00:00Z', archivos: [{ filename: 'antiguo.dxf', savedPath }] }] }, vi.fn())).rejects.toMatchObject({ statusCode: 409 });
  await expect(convertirCorte(Buffer.from('dxf'), () => { throw new Error('DXF roto'); })).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('DXF roto') });
});
it('el destino máquina se rechaza con el interruptor apagado y el bot conserva su piloto', async () => {
  entrada.settings.corteDirectoEnabled = false;
  await expect(enviarCorte({ ...entrada, destino: 'maquina' })).rejects.toMatchObject({ statusCode: 409 });
  entrada.settings.corteLonaBotDirectory = path.join(raiz, 'bot');
  await fs.mkdir(entrada.settings.corteLonaBotDirectory);
  const pilotoCmt = vi.fn();
  expect((await enviarCorte({ ...entrada, pilotoCmt })).cuerpo.envio.destino).toBe('bot');
  expect(pilotoCmt).toHaveBeenCalledOnce();
  expect(convertir).not.toHaveBeenCalled();
});
it('configuración apagada por defecto: requiere las dos carpetas absolutas con año', () => {
  expect(defaultWorkflowSettings().corteDirectoEnabled).toBe(false);
  expect(() => normalizeWorkflowSettings({ corteDirectoEnabled: true })).toThrow(/dos carpetas/);
  expect(() => normalizeWorkflowSettings({ corteMaquinaDxfDirectory: path.join(raiz, 'maquina') })).toThrow(/YYYY/);
  expect(normalizeWorkflowSettings(entrada.settings).corteDirectoEnabled).toBe(true);
});
it('para un envío conserva la copia original aunque el DWG o el destino cambien', async () => {
  const preparar = vi.fn();
  const pedido = { orderCode: 'AR2600001', entregaActual: 10, enviosCorte: [{ entrega: 10, archivos: [{ filename: 'AR2600001.dxf', dxfBase64: Buffer.from('enviado').toString('base64') }] }] };
  expect((await fuenteCorte(pedido, preparar)).contents.toString()).toBe('enviado');
  expect(preparar).not.toHaveBeenCalled();
});
it('un envío antiguo usa savedPath y si falta devuelve 409 sin regenerar otro dibujo', async () => {
  const savedPath = path.join(raiz, 'enviado.dxf');
  const pedido = { orderCode: 'AR2600001', enviosCorte: [{ archivos: [{ filename: 'enviado.dxf', savedPath }] }] };
  await fs.writeFile(savedPath, 'original');
  expect((await fuenteCorte(pedido, vi.fn())).contents.toString()).toBe('original');
  await fs.unlink(savedPath);
  await expect(fuenteCorte(pedido, vi.fn())).rejects.toMatchObject({ statusCode: 409 });
});
it('sin envíos usa el mismo preparador que el envío y bloquea un corte pendiente de regenerar', async () => {
  const preparar = vi.fn(async () => [{ filename: 'AR2600001-10.dxf', contents: Buffer.from('DWG revisado') }]);
  expect(await fuenteCorte({ orderCode: 'AR2600001' }, preparar)).toMatchObject({ filename: 'AR2600001.dxf', contents: Buffer.from('DWG revisado') });
  await expect(fuenteCorte({ orderCode: 'AR2600001', corteNoRegenerado: true }, preparar)).rejects.toMatchObject({ statusCode: 409 });
  await expect(convertirCorte(Buffer.from('dxf'), () => ({ cmt: null, dudas: [{ motivo: 'No se conoce la herramienta' }] }))).rejects.toThrow('No se conoce la herramienta');
});
