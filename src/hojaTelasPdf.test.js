import { beforeAll, describe, expect, test, vi } from 'vitest';
import pdfLib from 'pdf-lib';
import { crearImpresoraHojaTelas, paginasDeCadaHoja } from './hojaTelasPdf.js';

const { PDFDocument } = pdfLib;

/** Un PDF como el de Chromium: tantas páginas como diga el título de la hoja. */
async function pdfConTitulo(titulo, paginas = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < paginas; i += 1) doc.addPage();
  if (titulo !== null) doc.setTitle(titulo);
  return Buffer.from(await doc.save());
}

let PDF;
beforeAll(async () => {
  PDF = await pdfConTitulo('telas-paginas:1');
});

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
    telas: true,
    estructura: true,
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
  test('con las dos apagadas (TELAS_HTML=0 y ESTRUCTURA_HTML=0) no da opciones: el PDF sale con pdfkit como antes', () => {
    const { impresora } = crear({ telas: false, estructura: false });
    expect(impresora.opciones({ codigoPedido: 'AR1' })).toEqual({});
  });

  test('con las dos activas, las opciones dicen que estructura y telas van en HTML', () => {
    const { impresora } = crear();
    expect(impresora.opciones({ codigoPedido: 'AR1' })).toMatchObject({ htmlStructure: true, htmlFabric: true });
  });

  test('solo la estructura apagada (ESTRUCTURA_HTML=0): la de telas sigue en HTML', () => {
    const { impresora } = crear({ estructura: false });
    const opciones = impresora.opciones({ codigoPedido: 'AR1' });
    expect(opciones).toMatchObject({ htmlStructure: false, htmlFabric: true });
    expect(opciones.renderSheets).toBeTypeOf('function');
    expect(opciones.onSheetError).toBeTypeOf('function');
  });

  test('solo la de telas apagada (TELAS_HTML=0): la de estructura sigue en HTML', () => {
    const { impresora } = crear({ telas: false });
    expect(impresora.opciones({ codigoPedido: 'AR1' })).toMatchObject({ htmlStructure: true, htmlFabric: false });
  });

  test('imprime todas las hojas de una vez, dice las páginas de cada una y borra la ficha', async () => {
    const tres = await pdfConTitulo('telas-paginas:2,1', 3);
    const { impresora, fichas, servicio } = crear({ servicio: servicioFalso(async () => tres) });
    const { renderSheets } = impresora.opciones({ codigoPedido: 'AR1' });
    await expect(renderSheets([{ planIndex: 0 }, { planIndex: 2 }])).resolves.toEqual({ pdf: tres, pageCounts: [2, 1] });
    expect(servicio.generar).toHaveBeenCalledTimes(1);
    expect(servicio.trabajos[0].url('id-1')).toBe('http://servidor/hoja-telas.html?id=id-1');
    expect(fichas.guardadas).toEqual([[{ planIndex: 0 }, { planIndex: 2 }]]);
    expect(fichas.borradas).toEqual(['id-1']);
  });

  test('la ficha se guarda al salir de la cola, no antes', async () => {
    const fichas = fichasFalsas();
    const servicio = { generar: vi.fn(async () => { throw new Error('cola llena'); }) };
    const { impresora } = crear({ fichas, servicio });
    await expect(impresora.opciones({}).renderSheets([{ planIndex: 0 }])).rejects.toThrow('cola llena');
    expect(fichas.guardadas).toEqual([]);
    expect(fichas.borradas).toEqual([]);
  });

  test('si quien pidió la vista previa se fue, las hojas no entran en la cola de Chromium', async () => {
    const { impresora, servicio } = crear();
    let espera = true;
    const { renderSheets } = impresora.opciones({ sigueEsperando: () => espera });
    await renderSheets([{ planIndex: 0 }]);
    expect(servicio.trabajos[0].sigueEsperando()).toBe(true);
    espera = false;
    await expect(renderSheets([{ planIndex: 0 }])).rejects.toThrow(/ya no espera/);
    expect(servicio.generar).toHaveBeenCalledTimes(1);
  });

  test('«Generar archivos» espera siempre: el trabajo no lleva sigueEsperando', async () => {
    const { impresora, servicio } = crear();
    await impresora.opciones({ codigoPedido: 'AR1' }).renderSheets([{ planIndex: 0 }]);
    expect(servicio.trabajos[0].sigueEsperando).toBeUndefined();
  });

  test('un fallo rápido no pausa: el PDF siguiente vuelve a probar', async () => {
    let fallar = true;
    const servicio = servicioFalso(async () => {
      if (fallar) throw new Error('Chromium roto');
      return PDF;
    });
    const { impresora } = crear({ servicio });
    await expect(impresora.opciones({}).renderSheets([{ planIndex: 0 }])).rejects.toThrow('Chromium roto');
    fallar = false;
    await expect(impresora.opciones({}).renderSheets([{ planIndex: 0 }])).resolves.toMatchObject({ pageCounts: [1] });
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
    await expect(ctx.impresora.opciones({}).renderSheets([{ planIndex: 0 }])).rejects.toThrow('30 s');
    fallar = false;
    await expect(ctx.impresora.opciones({}).renderSheets([{ planIndex: 0 }])).rejects.toThrow(/hace poco/);
    expect(servicio.generar).toHaveBeenCalledTimes(1);
    ctx.avanzar(60_000);
    await expect(ctx.impresora.opciones({}).renderSheets([{ planIndex: 0 }])).resolves.toMatchObject({ pageCounts: [1] });
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
    await expect(ctx.impresora.opciones({ sigueEsperando: () => espera }).renderSheets([{ planIndex: 0 }])).rejects.toThrow();
    await expect(ctx.impresora.opciones({}).renderSheets([{ planIndex: 0 }])).resolves.toMatchObject({ pageCounts: [1] });
  });

  test('el registro dice el pedido y la hoja', () => {
    const { impresora, registro } = crear();
    const { onSheetError } = impresora.opciones({ codigoPedido: 'AR2604782' });
    onSheetError(new Error('Chromium roto'), { kind: 'telas', planIndex: 2 });
    onSheetError(new Error('unión rota'), null);
    onSheetError(new Error('hoja rota'), { kind: 'estructura', header: { letter: 'B' } });
    expect(registro[0]).toContain('Hoja en HTML del pedido AR2604782 (hoja de telas 2): sale la de pdfkit.');
    expect(registro[0]).toContain('Chromium roto');
    expect(registro[1]).toContain('Hoja en HTML del pedido AR2604782 (hojas del planteamiento): sale la de pdfkit.');
    expect(registro[1]).toContain('unión rota');
    expect(registro[2]).toContain('Hoja en HTML del pedido AR2604782 (estructura del toldo B): sale la de pdfkit.');
    expect(registro[2]).toContain('hoja rota');
  });

  test('el registro habla de la hoja de telas, no de la hoja de taller de remolques', () => {
    const { impresora, registro } = crear();
    impresora.opciones({ codigoPedido: 'AR1' }).onSheetError(new Error('La hoja de taller tardó más de 30 s en prepararse.'), null);
    expect(registro[0]).toContain('La hoja de telas tardó más de 30 s');
    expect(registro[0]).not.toContain('hoja de taller');
  });

  test('una vista previa cancelada no escribe nada en el registro', () => {
    const { impresora, registro } = crear();
    let espera = true;
    const { onSheetError } = impresora.opciones({ codigoPedido: 'AR1', sigueEsperando: () => espera });
    onSheetError(new Error('Chromium roto'), null);
    expect(registro).toHaveLength(1);
    espera = false;
    onSheetError(new Error('Quien pidió el PDF ya no espera.'), null);
    expect(registro).toHaveLength(1);
  });
});

describe('paginasDeCadaHoja', () => {
  test('lee las páginas de cada hoja del título que copia Chromium', async () => {
    await expect(paginasDeCadaHoja(await pdfConTitulo('telas-paginas:1,3,1', 5))).resolves.toEqual([1, 3, 1]);
  });

  test('sin ese título (otra página, o la web no llegó a ponerlo) es un fallo: sale pdfkit', async () => {
    await expect(paginasDeCadaHoja(await pdfConTitulo('Planteamientos TGM'))).rejects.toThrow(/cuántas páginas/);
    await expect(paginasDeCadaHoja(await pdfConTitulo(null))).rejects.toThrow(/cuántas páginas/);
  });
});
