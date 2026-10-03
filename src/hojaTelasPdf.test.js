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

  test('imprime todas las hojas de una vez, dice las páginas de cada una y borra la ficha', async () => {
    const tres = await pdfConTitulo('telas-paginas:2,1', 3);
    const { impresora, fichas, servicio } = crear({ servicio: servicioFalso(async () => tres) });
    const { renderFabricSheets } = impresora.opciones({ codigoPedido: 'AR1' });
    await expect(renderFabricSheets([{ planIndex: 0 }, { planIndex: 2 }])).resolves.toEqual({ pdf: tres, pageCounts: [2, 1] });
    expect(servicio.generar).toHaveBeenCalledTimes(1);
    expect(servicio.trabajos[0].url('id-1')).toBe('http://servidor/hoja-telas.html?id=id-1');
    expect(fichas.guardadas).toEqual([[{ planIndex: 0 }, { planIndex: 2 }]]);
    expect(fichas.borradas).toEqual(['id-1']);
  });

  test('la ficha se guarda al salir de la cola, no antes', async () => {
    const fichas = fichasFalsas();
    const servicio = { generar: vi.fn(async () => { throw new Error('cola llena'); }) };
    const { impresora } = crear({ fichas, servicio });
    await expect(impresora.opciones({}).renderFabricSheets([{ planIndex: 0 }])).rejects.toThrow('cola llena');
    expect(fichas.guardadas).toEqual([]);
    expect(fichas.borradas).toEqual([]);
  });

  test('si quien pidió la vista previa se fue, las hojas no entran en la cola de Chromium', async () => {
    const { impresora, servicio } = crear();
    let espera = true;
    const { renderFabricSheets } = impresora.opciones({ sigueEsperando: () => espera });
    await renderFabricSheets([{ planIndex: 0 }]);
    expect(servicio.trabajos[0].sigueEsperando()).toBe(true);
    espera = false;
    await expect(renderFabricSheets([{ planIndex: 0 }])).rejects.toThrow(/ya no espera/);
    expect(servicio.generar).toHaveBeenCalledTimes(1);
  });

  test('«Generar archivos» espera siempre: el trabajo no lleva sigueEsperando', async () => {
    const { impresora, servicio } = crear();
    await impresora.opciones({ codigoPedido: 'AR1' }).renderFabricSheets([{ planIndex: 0 }]);
    expect(servicio.trabajos[0].sigueEsperando).toBeUndefined();
  });

  test('un fallo rápido no pausa: el PDF siguiente vuelve a probar', async () => {
    let fallar = true;
    const servicio = servicioFalso(async () => {
      if (fallar) throw new Error('Chromium roto');
      return PDF;
    });
    const { impresora } = crear({ servicio });
    await expect(impresora.opciones({}).renderFabricSheets([{ planIndex: 0 }])).rejects.toThrow('Chromium roto');
    fallar = false;
    await expect(impresora.opciones({}).renderFabricSheets([{ planIndex: 0 }])).resolves.toMatchObject({ pageCounts: [1] });
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
    await expect(ctx.impresora.opciones({}).renderFabricSheets([{ planIndex: 0 }])).rejects.toThrow('30 s');
    fallar = false;
    await expect(ctx.impresora.opciones({}).renderFabricSheets([{ planIndex: 0 }])).rejects.toThrow(/hace poco/);
    expect(servicio.generar).toHaveBeenCalledTimes(1);
    ctx.avanzar(60_000);
    await expect(ctx.impresora.opciones({}).renderFabricSheets([{ planIndex: 0 }])).resolves.toMatchObject({ pageCounts: [1] });
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
    await expect(ctx.impresora.opciones({ sigueEsperando: () => espera }).renderFabricSheets([{ planIndex: 0 }])).rejects.toThrow();
    await expect(ctx.impresora.opciones({}).renderFabricSheets([{ planIndex: 0 }])).resolves.toMatchObject({ pageCounts: [1] });
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
    expect(registro[1]).toContain('hojas de telas');
    expect(registro[1]).toContain('unión rota');
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
