import { describe, expect, test, vi } from 'vitest';
import { crearImpresoraHojaTelas } from './hojaTelasPdf.js';

const PDF = Buffer.from('%PDF-falso');

/** Un almacén de fichas de mentira que apunta lo que se guarda y se borra. */
function fichasFalsas() {
  const guardadas = [];
  const borradas = [];
  return {
    guardadas,
    borradas,
    guardar: (datos) => {
      guardadas.push(datos);
      return `id-${guardadas.length}`;
    },
    borrar: (id) => borradas.push(id)
  };
}

/** Un servicio de mentira: llama a preparar como el de verdad y responde lo que se le diga. */
function servicioFalso(responder = async () => PDF) {
  const trabajos = [];
  return {
    trabajos,
    generar: vi.fn(async (trabajo) => {
      trabajos.push(trabajo);
      if (trabajo.sigueEsperando && !trabajo.sigueEsperando()) throw new Error('ya no espera');
      const id = trabajo.preparar();
      return responder(id, trabajo);
    })
  };
}

function crear(opciones = {}) {
  const fichas = opciones.fichas ?? fichasFalsas();
  const servicio = opciones.servicio ?? servicioFalso();
  const registro = [];
  let reloj = 0;
  const impresora = crearImpresoraHojaTelas({
    activa: true,
    fichas,
    servicio,
    url: (id) => `http://servidor/hoja-telas.html?id=${id}`,
    registrar: (mensaje) => registro.push(mensaje),
    ahora: () => reloj,
    ...opciones
  });
  return { impresora, fichas, servicio, registro, avanzar: (ms) => (reloj += ms) };
}

describe('impresora de la hoja de telas en HTML', () => {
  test('apagada (TELAS_HTML=0) no da opciones: el PDF sale con pdfkit como antes', () => {
    const { impresora } = crear({ activa: false });
    expect(impresora.opciones({ codigoPedido: 'AR1' })).toEqual({});
  });

  test('imprime con la página de telas y borra la ficha al acabar', async () => {
    const { impresora, fichas, servicio } = crear();
    const { renderFabricSheet } = impresora.opciones({ codigoPedido: 'AR1' });
    await expect(renderFabricSheet({ planIndex: 0 })).resolves.toBe(PDF);
    expect(servicio.trabajos[0].url('id-1')).toBe('http://servidor/hoja-telas.html?id=id-1');
    expect(fichas.guardadas).toEqual([{ planIndex: 0 }]);
    expect(fichas.borradas).toEqual(['id-1']);
  });

  test('la ficha se guarda al salir de la cola, no antes', async () => {
    const fichas = fichasFalsas();
    const servicio = { generar: vi.fn(async () => { throw new Error('cola llena'); }) };
    const { impresora } = crear({ fichas, servicio });
    await expect(impresora.opciones({}).renderFabricSheet({ planIndex: 0 })).rejects.toThrow('cola llena');
    expect(fichas.guardadas).toEqual([]);
    expect(fichas.borradas).toEqual([]);
  });

  test('si quien pidió la vista previa se fue, la hoja no entra en la cola de Chromium', async () => {
    const { impresora, servicio } = crear();
    let espera = true;
    const { renderFabricSheet } = impresora.opciones({ sigueEsperando: () => espera });
    await renderFabricSheet({ planIndex: 0 });
    expect(servicio.trabajos[0].sigueEsperando()).toBe(true);
    espera = false;
    await expect(renderFabricSheet({ planIndex: 1 })).rejects.toThrow(/ya no espera/);
    expect(servicio.generar).toHaveBeenCalledTimes(1);
  });

  test('«Generar archivos» espera siempre: el trabajo no lleva sigueEsperando', async () => {
    const { impresora, servicio } = crear();
    await impresora.opciones({ codigoPedido: 'AR1' }).renderFabricSheet({ planIndex: 0 });
    expect(servicio.trabajos[0].sigueEsperando).toBeUndefined();
  });

  test('tras el primer fallo de un PDF, el resto de sus hojas va directo a pdfkit', async () => {
    let fallar = true;
    const servicio = servicioFalso(async () => {
      if (fallar) throw new Error('Chromium roto');
      return PDF;
    });
    const { impresora } = crear({ servicio });
    const { renderFabricSheet } = impresora.opciones({ codigoPedido: 'AR1' });
    await expect(renderFabricSheet({ planIndex: 0 })).rejects.toThrow('Chromium roto');
    fallar = false;
    await expect(renderFabricSheet({ planIndex: 1 })).rejects.toThrow(/otra hoja de telas de este PDF/);
    expect(servicio.generar).toHaveBeenCalledTimes(1);
    // El PDF siguiente vuelve a probar (el fallo fue rápido: no hay pausa).
    await expect(impresora.opciones({}).renderFabricSheet({ planIndex: 0 })).resolves.toBe(PDF);
  });

  test('un fallo lento (tiempo agotado o Chromium que no arranca) pausa Chromium un minuto para todos', async () => {
    let fallar = true;
    let avanzar;
    const servicio = servicioFalso(async () => {
      if (!fallar) return PDF;
      avanzar(30_000);
      throw new Error('La hoja tardó más de 30 s');
    });
    const ctx = crear({ servicio });
    avanzar = ctx.avanzar;
    await expect(ctx.impresora.opciones({}).renderFabricSheet({ planIndex: 0 })).rejects.toThrow('30 s');
    fallar = false;
    await expect(ctx.impresora.opciones({}).renderFabricSheet({ planIndex: 0 })).rejects.toThrow(/hace poco/);
    expect(servicio.generar).toHaveBeenCalledTimes(1);
    ctx.avanzar(60_000);
    await expect(ctx.impresora.opciones({}).renderFabricSheet({ planIndex: 0 })).resolves.toBe(PDF);
  });

  test('una espera larga de quien ya se fue no pausa Chromium', async () => {
    let espera = true;
    let avanzar;
    const servicio = servicioFalso(async () => {
      if (!espera) return PDF;
      avanzar(30_000);
      espera = false;
      throw new Error('ya no espera');
    });
    const ctx = crear({ servicio });
    avanzar = ctx.avanzar;
    await expect(ctx.impresora.opciones({ sigueEsperando: () => espera }).renderFabricSheet({ planIndex: 0 })).rejects.toThrow();
    await expect(ctx.impresora.opciones({}).renderFabricSheet({ planIndex: 0 })).resolves.toBe(PDF);
  });

  test('el registro dice el pedido y la hoja', () => {
    const { impresora, registro } = crear();
    const { onFabricSheetError } = impresora.opciones({ codigoPedido: 'AR2604782' });
    onFabricSheetError(new Error('Chromium roto'), { planIndex: 2 });
    onFabricSheetError(new Error('unión rota'), null);
    expect(registro[0]).toContain('AR2604782');
    expect(registro[0]).toContain('hoja 2');
    expect(registro[0]).toContain('Chromium roto');
    expect(registro[1]).toContain('AR2604782');
    expect(registro[1]).toContain('unión rota');
  });
});
