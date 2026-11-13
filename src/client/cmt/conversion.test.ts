import { describe, expect, it, vi } from 'vitest';
import { convertirArchivo, medidasCmt, permiteSinTextos, textoEstado, type ResultadoCmt } from './conversion';
import { blobCmt, descargarCmt, descargarTodos, type DestinoDescarga } from './descarga';

const resultado: ResultadoCmt = { ok: true, nombre: 'corte.cmt', cmtBase64: 'AP+ACg==',
  resumen: { objetos: 1, porHerramienta: [], anchoMm: 1234.5, altoMm: 19.05 }, avisos: [], dudas: [] };
describe('Conversión de los ficheros de la pantalla', () => {
  it('envía los bytes originales sin recodificar y conserva sinTextos', async () => {
    const pedir = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(resultado)));
    await expect(convertirArchivo(new File([new Uint8Array([0xe1, 0, 255])], 'plano.DXF'), true, pedir)).resolves.toEqual(resultado);
    expect(pedir).toHaveBeenCalledWith('/api/cmt/convertir', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(pedir.mock.calls[0][1]!.body as string)).toEqual({ nombre: 'plano.DXF', dxfBase64: '4QD/', sinTextos: true });
  });
  it('rechaza extensión y tamaño antes de leer o subir el fichero', async () => {
    const pedir = vi.fn();
    await expect(convertirArchivo(new File(['x'], 'plano.txt'), false, pedir)).rejects.toThrow('.dxf');
    const grande = { name: 'grande.dxf', size: 30 * 1024 * 1024 + 1 } as File;
    await expect(convertirArchivo(grande, false, pedir)).rejects.toThrow('30 MB');
    expect(pedir).not.toHaveBeenCalled();
  });
  it('muestra los errores HTTP del servidor y no oculta las dudas de un 200', async () => {
    await expect(convertirArchivo(new File(['x'], 'x.dxf'), false, async () => new Response(JSON.stringify({ error: 'DXF incompleto' }), { status: 422 }))).rejects.toThrow('DXF incompleto');
    const dudas = { ...resultado, ok: false, cmtBase64: null, dudas: ['Texto no admitido'] };
    expect(await convertirArchivo(new File(['x'], 'x.dxf'), false, async () => new Response(JSON.stringify(dudas)))).toEqual(dudas);
  });
  it('explica los estados y usa coma decimal en las medidas', () => {
    expect(textoEstado('convirtiendo')).toBe('Convirtiendo…');
    expect(textoEstado('listo')).toBe('Listo');
    expect(textoEstado('error')).toBe('No se pudo convertir');
    expect(medidasCmt(resultado.resumen)).toBe('1234,5 × 19,05 mm');
  });
  it('ofrece reintentar solo cuando hay dudas de textos y no se ha reintentado ya', () => {
    expect(permiteSinTextos(['MTEXT no admitido (capa ROTULADOR)'], false)).toBe(true);
    expect(permiteSinTextos(['La fuente Arial no está disponible'], false)).toBe(true);
    expect(permiteSinTextos(['Glifo sin contorno'], false)).toBe(true);
    expect(permiteSinTextos(['SPLINE no admitida'], false)).toBe(false);
    expect(permiteSinTextos(['Texto no admitido'], true)).toBe(false);
  });
});

const destino = (extra: Partial<DestinoDescarga> = {}): DestinoDescarga => ({ seguro: true, descargar: vi.fn(), ...extra });
describe('Guardar el CMT desde el navegador', () => {
  it('el blob conserva todos los bytes, incluidos nulos y valores superiores a 127', async () => {
    expect(new Uint8Array(await blobCmt(resultado).arrayBuffer())).toEqual(new Uint8Array([0, 255, 128, 10]));
    expect(() => blobCmt({ ...resultado, ok: false })).toThrow();
  });
  it('usa el selector con el nombre sugerido y cierra el fichero', async () => {
    const escribir = vi.fn(), cerrar = vi.fn();
    const elegir = vi.fn(async () => ({ createWritable: async () => ({ write: escribir, close: cerrar }) }));
    const d = destino({ elegir });
    expect(await descargarCmt(resultado, d)).toBe(true);
    expect(elegir).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: 'corte.cmt' }));
    expect(escribir).toHaveBeenCalledWith(expect.any(Blob));
    expect(cerrar).toHaveBeenCalled();
    expect(d.descargar).not.toHaveBeenCalled();
  });
  it.each([destino({ seguro: false, elegir: vi.fn() }), destino()])('descarga normal por HTTP de oficina o sin selector', async d => {
    await descargarCmt(resultado, d);
    expect(d.descargar).toHaveBeenCalledWith(expect.any(Blob), 'corte.cmt');
    if (d.elegir) expect(d.elegir).not.toHaveBeenCalled();
  });
  it('cancelar el selector no provoca una descarga involuntaria', async () => {
    const d = destino({ elegir: async () => { throw new DOMException('', 'AbortError'); } });
    expect(await descargarCmt(resultado, d)).toBe(false);
    expect(d.descargar).not.toHaveBeenCalled();
  });
  it('si el navegador deniega el selector, sigue disponible la descarga normal', async () => {
    const d = destino({ elegir: async () => { throw new DOMException('', 'SecurityError'); } });
    expect(await descargarCmt(resultado, d)).toBe(true);
    expect(d.descargar).toHaveBeenCalled();
  });
  it('los errores al escribir se muestran y no se presentan como un guardado correcto', async () => {
    const d = destino({ elegir: async () => { throw new Error('Disco lleno'); } });
    await expect(descargarCmt(resultado, d)).rejects.toThrow('Disco lleno');
  });
  it('descarga todos los listos, excluye los fallidos y se detiene si se cancela', async () => {
    const guardar = vi.fn(async (_resultado: ResultadoCmt) => true);
    await descargarTodos([resultado, { ...resultado, ok: false, cmtBase64: null }, { ...resultado, nombre: 'otro.cmt' }], guardar);
    expect(guardar.mock.calls.map(([r]) => r.nombre)).toEqual(['corte.cmt', 'otro.cmt']);
    const cancelar = vi.fn(async () => false);
    await descargarTodos([resultado, resultado], cancelar);
    expect(cancelar).toHaveBeenCalledTimes(1);
  });
});
