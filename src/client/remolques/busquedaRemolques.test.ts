import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FilaBusqueda, ResultadoBusqueda } from '../../remolques/flujo/buscar.ts';
import {
  buscarRemolques, estadoBuscadorInicial, fechaCorta, filtrosDesdeFormulario, formularioVacio, leerOpcionesBuscador, RUTA_BUSCAR,
  textoContador, textoCorte, textoMedidas, textoRecogidas,
} from './busquedaRemolques';

afterEach(() => vi.unstubAllGlobals());
const respuesta = (status: number, datos: unknown) => ({ ok: status < 400, status, json: async () => datos });
const fila = (cambios: Partial<FilaBusqueda> = {}): FilaBusqueda => ({
  orderCode: 'AR2501234', numeroPedido: 'AR.25.01234', version: '10', letra: 'A', tipo: 'lona', cliente: 'REMOLQUES AYALA',
  fecha: '2025-12-01', modelo: 'Con chaflán', largo: 190, ancho: 136.5, alto: 103, recogeDelante: 'NO', recogeAtras: 'CREMALLERA',
  material: 'LONA NS86', of: '0199999', estado: 'PENDING_REVIEW', ...cambios,
});
const resultado = (cambios: Partial<ResultadoBusqueda> = {}): ResultadoBusqueda => ({ filas: [], total: 0, pedidos: 0, cortado: false, limite: 500, ...cambios });

describe('formulario del buscador → filtros', () => {
  it('vacío no filtra nada', () => {
    expect(filtrosDesdeFormulario(formularioVacio())).toEqual({});
    expect(estadoBuscadorInicial()).toEqual({ formulario: formularioVacio(), resultado: null });
  });

  it('recorta textos, quita lo vacío y pone el margen por defecto a las medidas sin margen', () => {
    const f = formularioVacio();
    f.texto = ' AR.26.04286 ';
    f.cliente = 'ayala';
    f.tipo = 'lona';
    f.perfil = 'TIPO 04';
    f.recogida = 'CREMALLERA';
    f.ladoRecogida = 'delante';
    f.medidas.largo = { valor: 190, margen: null };
    f.medidas.aguas = { valor: 10, margen: 1.5 };
    f.medidas.ancho = { valor: null, margen: 3 };
    f.ventana = 'no';
    f.material = ' 7038 ';
    f.estado = 'pendientes';
    f.desde = '2025-01-01';
    f.hasta = '2025-12-31';
    expect(filtrosDesdeFormulario(f)).toEqual({
      texto: 'AR.26.04286', cliente: 'ayala', tipo: 'lona', perfil: 'TIPO 04',
      recogida: { nombre: 'CREMALLERA', lado: 'delante' },
      medidas: { largo: { valor: 190, margen: 5 }, aguas: { valor: 10, margen: 1.5 } },
      ventana: 'no', material: '7038', estado: 'pendientes', desde: '2025-01-01', hasta: '2025-12-31',
    });
  });
});

describe('llamada al servidor', () => {
  it('manda los filtros por POST y devuelve el resultado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, resultado({ total: 0 })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await buscarRemolques({ cliente: 'cal' })).toEqual(resultado());
    expect(fetchMock.mock.calls[0][0]).toBe(RUTA_BUSCAR);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ cliente: 'cal' });
  });

  it('si el servidor no puede, su mensaje; si la respuesta no tiene forma, un aviso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respuesta(400, { error: 'Los filtros de la búsqueda no son válidos: La medida «largo» no es válida.' }))
      .mockResolvedValueOnce(respuesta(200, {})));
    await expect(buscarRemolques({})).rejects.toThrow('La medida «largo» no es válida.');
    await expect(buscarRemolques({})).rejects.toThrow('La respuesta de la búsqueda no es válida.');
  });

  it('opciones: las recogidas de los parámetros y los nombres de las fichas; si algo falla, vacío', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url === '/api/remolques/parametros'
      ? respuesta(200, { recogidas: [{ nombre: 'NO' }, { nombre: 'GOMA' }, { nombre: 'PUENTES HIJOS DE PEDRO LOPEZ' }] })
      : respuesta(200, { fichas: [{ id: 'gw', nombre: 'GENERAL WOLDER', codigosRps: [] }, { id: 'ayala', nombre: 'AYALA', codigosRps: [] }] }))));
    expect(await leerOpcionesBuscador()).toEqual({ recogidas: ['NO', 'GOMA', 'PUENTES HIJOS DE PEDRO LOPEZ'], clientes: ['AYALA', 'GENERAL WOLDER'] });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('caído')));
    expect(await leerOpcionesBuscador()).toEqual({ recogidas: [], clientes: [] });
  });
});

describe('textos de la lista', () => {
  it('contador en singular y plural, sin resultados y aviso de corte', () => {
    expect(textoContador(resultado({ total: 1, pedidos: 1 }))).toBe('1 remolque en 1 pedido');
    expect(textoContador(resultado({ total: 5, pedidos: 3 }))).toBe('5 remolques en 3 pedidos');
    expect(textoContador(resultado())).toBe('Ningún remolque cumple estos filtros');
    expect(textoCorte(resultado({ total: 812, pedidos: 300, cortado: true }))).toBe('Se enseñan los 500 más nuevos: afina los filtros para ver el resto.');
  });

  it('medidas con coma, recogidas con su nombre y fecha corta', () => {
    expect(textoMedidas(fila())).toBe('190 × 136,5 × 103 cm');
    expect(textoMedidas(fila({ tipo: 'baqueton', alto: null, largo: 260, ancho: 160 }))).toBe('260 × 160 cm');
    expect(textoRecogidas(fila())).toBe('No / Cremallera');
    expect(textoRecogidas(fila({ recogeDelante: '', recogeAtras: 'PUENTES ESVA' }))).toBe('— / Puentes ESVA');
    expect(textoRecogidas(fila({ tipo: 'baqueton', recogeDelante: '', recogeAtras: '' }))).toBe('—');
    expect(fechaCorta('2025-12-01')).toBe('01/12/2025');
    expect(fechaCorta('')).toBe('—');
  });
});
