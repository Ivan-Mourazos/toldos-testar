import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import habitual from '../__fixtures__/AR2605134.json';
import { nuevaPuerta } from '../calcular.ts';
import { REGLAS_SYSTEM_DOCK } from '../systemDock.ts';
import { crearAlmacenPedidos } from '../../remolques/flujo/almacen.ts';
import { crearAlmacenConfirmaciones } from '../../flujoDwg/confirmaciones.js';
import { corteDelPlano } from '../../flujoDwg/corteDwg.js';
import { isPendingGeneration, TERMINADO_SIN_GENERAR } from '../../reviewRules.js';
import { MENSAJE_CAMBIOS_A_MANO } from '../../cadPaginas/cambiosManuales.ts';
import { crearPlanoPuertas } from './archivos.ts';
import { crearServicioBorradoresPuertas } from './borradores.ts';
import { crearServicioPedidosPuertas } from './servicio.ts';
import { TIPO_PEDIDO_PUERTAS, type PedidoPuertasGuardado } from './tipos.ts';
import type { PedidoPuertas, Puerta } from '../tipos.ts';

function puertaHabitual(): Puerta {
  const f = habitual;
  return {
    ...nuevaPuerta('PUERTAENR'),
    frente: f.frente,
    alto: f.alto,
    of: f.of,
    cantidad: f.cantidad,
    color: f.color,
    rollo: 300,
    rolloCristal: 140,
    rolloSaco: 300,
    confirmada: true,
    ventanasConfirmadas: true,
    enrollable: { T: f.T, D: f.D, margen: f.margen, empates: [] },
    entradas: f.alturasTubos.map((altura) => ({ altura, diametro: 30 as const, largo: f.frente, alto: 8, huecos: [] })),
  };
}

const pedidoPantalla = (cambios: Partial<Puerta> = {}, codigo = 'AR.26.05134'): PedidoPuertas & { cabecera: { cliente: string; fecha: string } } => ({
  schemaVersion: 1,
  kind: 'puertas',
  orderCode: codigo,
  cabecera: { cliente: 'PORTANOVA', fecha: '2026-10-21' },
  elementos: [{ id: 'puerta-1', input: { ...puertaHabitual(), ...cambios } }],
});

let raiz: string;
let carpetaPedidos: string;
let servicio: ReturnType<typeof crearServicioPedidosPuertas>;
let borradores: ReturnType<typeof crearServicioBorradoresPuertas>;

beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/puertas-mecanica-'));
  carpetaPedidos = path.join(raiz, 'pedidos/puertas');
  const almacen = crearAlmacenPedidos<PedidoPuertasGuardado>({
    carpeta: async () => carpetaPedidos,
    tipo: TIPO_PEDIDO_PUERTAS,
    nombre: 'puertas',
    sinCarpeta: 'Sin carpeta',
  });
  const ajustes = async () => ({
    productionEnabled: true,
    corteLonaPlanoDirectory: path.join(raiz, 'planos'),
    corteLonaDxfDirectory: path.join(raiz, '{YYYY}/DXFs'),
    corteLonaBotDirectory: path.join(raiz, 'bot/{TECNICO}'),
    remolquesPlanteamientosDirectory: path.join(raiz, 'planteamientos/{YYYY}'),
    corteBorradoresDirectory: path.join(raiz, 'borradores'),
    corteBorradoresRed: String.raw`\\toldosgomez.local\DFS_POL\oftecnica\borradores`,
  });
  borradores = crearServicioBorradoresPuertas({
    carpeta: async () => path.join(raiz, 'borradores-web'),
    tecnicos: ['IVÁN', 'DAVID', 'JAIME'],
    existePedido: async (c) => Boolean(await almacen.obtener(c)),
    ahora: () => new Date('2026-11-25T09:00:00Z'),
  });
  servicio = crearServicioPedidosPuertas({
    almacen,
    carpetaPedidos: async () => carpetaPedidos,
    borradores,
    avisarCambiosManualesDwg: true,
    ajustes,
    tecnicos: ['IVÁN', 'DAVID', 'JAIME'],
    otroProducto: async () => null,
    plano: crearPlanoPuertas({ ajustes, oda: { disponible: false, convertir: async (b) => b } }),
    confirmaciones: crearAlmacenConfirmaciones({ carpeta: async () => path.join(raiz, 'confirmados') }),
    coordina: { statusOf: async (ofs) => ({ disponible: true, ofs: Object.fromEntries(ofs.map((of) => [of, { estado: 'aprobada', revisor: 'DAVID' }])) }) },
    ahora: () => new Date('2026-11-25T10:30:00Z'),
  });
});

afterEach(async () => {
  await fs.rm(raiz, { recursive: true, force: true });
});

describe('guardar sin revisión en puertas', () => {
  it('devuelve 204 con siExiste cuando el pedido todavía no existe', async () => {
    const res = await servicio.guardarRegistroSinRevisar('AR2605134', {
      pedido: pedidoPantalla(),
      usuario: 'DAVID',
      siExiste: true,
    });
    expect(res.status).toBe(204);
  });

  it.each(['PENDING_REVIEW', 'PRODUCED', TERMINADO_SIN_GENERAR] as const)(
    'guarda cambios en estado %s sin cambiar estado ni autor, apuntando quién editó y sin tocar el DWG',
    async (estadoInicial) => {
      await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
      if (estadoInicial === 'PRODUCED') {
        await servicio.generar('AR2605134', { confirmOverwrite: true, savedBy: 'IVÁN' });
      } else if (estadoInicial === TERMINADO_SIN_GENERAR) {
        await servicio.terminar('AR2605134', { usuario: 'IVÁN' });
      }
      const antes = await servicio.obtener('AR2605134');
      const dxfAntes = await fs.readFile(path.join(raiz, 'planos/AR2605134.dxf'), 'utf8');

      const editado = pedidoPantalla({ frente: 250, color: 'ROJO 3000' });
      editado.cabecera.cliente = 'PORTANOVA EDITADO';
      const res = await servicio.guardarRegistroSinRevisar('AR2605134', { pedido: editado, usuario: 'DAVID' });
      expect(res.status).toBe(200);

      const despues = await servicio.obtener('AR2605134');
      expect(despues.status).toBe(estadoInicial);
      expect(despues.createdBy).toBe('IVÁN');
      expect(despues.summary.technician).toBe('IVÁN');
      expect(despues.summary.customer).toBe('PORTANOVA EDITADO');
      expect(despues.elementos[0].input.frente).toBe(250);
      expect(despues.updatedBy).toBe('DAVID');
      expect(despues.ediciones).toEqual([{ usuario: 'DAVID', fecha: '2026-11-25T10:30:00.000Z', nota: 'Editado sin revisar' }]);
      expect(despues.corteConfirmado).toEqual(antes.corteConfirmado);
      expect(await fs.readFile(path.join(raiz, 'planos/AR2605134.dxf'), 'utf8')).toBe(dxfAntes);
    }
  );

  it('funciona también con System Dock, abrigo y saco confeccionado', async () => {
    const lonaSd = {
      ...nuevaPuerta('SYSTEMDOCK'),
      frente: 1040,
      alto: 55,
      cantidad: 2,
      of: '0232270',
      material: REGLAS_SYSTEM_DOCK.material,
      color: REGLAS_SYSTEM_DOCK.color,
      rollo: REGLAS_SYSTEM_DOCK.rollo,
      confirmada: true,
      ventanasConfirmadas: true,
    };
    const pedidoSd = {
      schemaVersion: 1 as const,
      kind: 'puertas' as const,
      orderCode: 'AR2605901',
      cabecera: { cliente: 'SYSTEM DOCK', fecha: '2026-11-25' },
      elementos: [{ id: 'lona-1', input: lonaSd }],
    };
    expect((await servicio.guardar({ pedido: pedidoSd, savedBy: 'IVÁN' })).status).toBe(200);
    const editado = { ...pedidoSd, elementos: [{ id: 'lona-1', input: { ...lonaSd, frente: 1100 } }] };
    const res = await servicio.guardarRegistroSinRevisar('AR2605901', { pedido: editado, usuario: 'JAIME' });
    expect(res.status).toBe(200);
    const guardado = await servicio.obtener('AR2605901');
    expect(guardado.summary.technician).toBe('IVÁN');
    expect(guardado.ediciones).toHaveLength(1);
    expect(guardado.ediciones?.[0].usuario).toBe('JAIME');
    expect(guardado.elementos[0].input.frente).toBe(1100);
  });

  it('rechaza número distinto y falta de usuario sin tocar el registro', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    await expect(servicio.guardarRegistroSinRevisar('AR2605134', { pedido: pedidoPantalla({}, 'AR2605999'), usuario: 'DAVID' }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(servicio.guardarRegistroSinRevisar('AR2605134', { pedido: pedidoPantalla(), usuario: '' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('terminado sin motivo y reapertura en puertas', () => {
  it('marca como terminado sin exigir motivo, bloquea salidas y permite volver a pendiente', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    const cerrado = await servicio.terminar('AR2605134', { usuario: 'DAVID' });
    expect(cerrado.status).toBe(200);
    const pedido = await servicio.obtener('AR2605134');
    expect(pedido.status).toBe(TERMINADO_SIN_GENERAR);
    expect(isPendingGeneration(pedido.status)).toBe(false);
    expect(pedido.terminadoSinGenerar).toMatchObject({
      usuario: 'DAVID',
      fecha: '2026-11-25T10:30:00.000Z',
      estadoAnterior: 'PENDING_REVIEW',
    });
    expect(pedido.terminadoSinGenerar?.motivo).toBeUndefined();

    await expect(servicio.generar('AR2605134', { confirmOverwrite: true, savedBy: 'DAVID' })).rejects.toMatchObject({ statusCode: 409 });
    await expect(servicio.enviarCorte('AR2605134', { usuario: 'DAVID', destino: 'dxfs' })).rejects.toMatchObject({ statusCode: 409 });
    await expect(servicio.terminar('AR2605134', { usuario: 'DAVID' })).rejects.toMatchObject({ statusCode: 409 });

    const reabierto = await servicio.reabrir('AR2605134', { usuario: 'JAIME' });
    expect(reabierto.status).toBe(200);
    const abierto = await servicio.obtener('AR2605134');
    expect(abierto.status).toBe('PENDING_REVIEW');
    expect(abierto.terminadoSinGenerar).toBeUndefined();
    expect(abierto.updatedBy).toBe('JAIME');
  });
});

describe('papelera de puertas', () => {
  it('exige escribir el código exacto, aparta el JSON a papelera y conserva los planos', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    const planoRuta = path.join(raiz, 'planos/AR2605134.dxf');
    const planoContenido = await fs.readFile(planoRuta, 'utf8');

    await expect(servicio.papelera('AR2605134', { usuario: 'IVÁN', confirmacion: 'OTRO' })).rejects.toMatchObject({ statusCode: 400 });
    expect((await servicio.listar(2026)).reviews).toHaveLength(1);

    const res = await servicio.papelera('AR2605134', { usuario: 'DAVID', confirmacion: 'AR2605134' });
    expect(res.status).toBe(200);
    const destino = (res.cuerpo as { destino: string }).destino;
    await expect(servicio.obtener('AR2605134')).rejects.toMatchObject({ statusCode: 404 });
    expect((await servicio.listar(2026)).reviews).toEqual([]);
    expect(await fs.readFile(planoRuta, 'utf8')).toBe(planoContenido);
    expect(JSON.parse(await fs.readFile(path.join(destino, 'papelera.json'), 'utf8'))).toEqual({
      codigo: 'AR2605134',
      usuario: 'DAVID',
      fecha: '2026-11-25T10:30:00.000Z',
    });

    // Recuperable devolviendo el JSON a su carpeta
    await fs.rename(path.join(destino, 'AR2605134.json'), path.join(carpetaPedidos, 'AR2605134.json'));
    expect((await servicio.obtener('AR2605134')).orderCode).toBe('AR2605134');
  });
});

describe('abrir corte desactualizado y aviso de cambios a mano en ZWCAD', () => {
  async function dibujarEnDxf(fichero: string) {
    const dxf = (await fs.readFile(fichero, 'utf8')).replace(/\r\n/g, '\n');
    const { recuadro } = corteDelPlano(dxf);
    const x = (recuadro.x0 + recuadro.x1) / 2;
    const y = (recuadro.y0 + recuadro.y1) / 2;
    const fin = dxf.indexOf('  0\nENDSEC\n', dxf.indexOf('\nENTITIES\n'));
    await fs.writeFile(fichero, `${dxf.slice(0, fin)}  0\nLINE\n  8\nDISCO1\n 10\n${x}\n 20\n${y}\n 11\n${x + 0.5}\n 21\n${y}\n${dxf.slice(fin)}`);
  }

  it('avisa cuando cambiaron los datos antes de abrir y deja abrir igual o regenerar', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    const cambiado = pedidoPantalla({ frente: 260 });

    const aviso = await servicio.borradorCorte({ pedido: cambiado, savedBy: 'IVÁN', avisarCorteDesactualizado: true });
    expect(aviso).toEqual({ status: 409, cuerpo: { corteDesactualizado: true } });

    const igual = await servicio.borradorCorte({ pedido: cambiado, savedBy: 'IVÁN', avisarCorteDesactualizado: true, abrirCorteIgual: true });
    expect(igual.status).toBe(200);
    expect(igual.cuerpo).toMatchObject({ existente: true });
  });

  it('avisa antes de pisar un DWG editado a mano en ZWCAD al regenerar', async () => {
    await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'IVÁN' });
    const planoRuta = path.join(raiz, 'planos/AR2605134.dxf');
    await dibujarEnDxf(planoRuta);

    const bloqueoGuardar = await servicio.guardar({ pedido: pedidoPantalla({ frente: 240 }), savedBy: 'IVÁN', decisionCorte: 'regenerar' });
    expect(bloqueoGuardar).toMatchObject({
      status: 409,
      cuerpo: { needsManualDwgConfirmation: true, archivosModificados: ['AR2605134.dxf'], error: MENSAJE_CAMBIOS_A_MANO },
    });

    const bloqueoAbrir = await servicio.borradorCorte({ pedido: pedidoPantalla({ frente: 240 }), savedBy: 'IVÁN', regenerar: true });
    expect(bloqueoAbrir).toMatchObject({
      status: 409,
      cuerpo: { needsManualDwgConfirmation: true, archivosModificados: ['AR2605134.dxf'], error: MENSAJE_CAMBIOS_A_MANO },
    });

    const confirmado = await servicio.guardar({
      pedido: pedidoPantalla({ frente: 240 }),
      savedBy: 'IVÁN',
      decisionCorte: 'regenerar',
      confirmarPerderCambiosDwg: true,
    });
    expect(confirmado.status).toBe(200);
  });
});

describe('borradores de puertas', () => {
  it('guarda un borrador a medias, pregunta si es de otro técnico y lo limpia al guardar el pedido', async () => {
    const guardado = await borradores.guardar('AR2605134', { savedBy: 'IVÁN', contenido: { pedido: pedidoPantalla({ confirmada: false }) } });
    expect(guardado.status).toBe(200);

    const otro = await borradores.guardar('AR2605134', { savedBy: 'DAVID', contenido: { pedido: pedidoPantalla({ confirmada: false }) } });
    expect(otro).toMatchObject({ status: 409, cuerpo: { needsConfirmation: true, savedBy: 'IVÁN' } });

    const sustituido = await borradores.guardar('AR2605134', { savedBy: 'DAVID', contenido: { pedido: pedidoPantalla() }, confirmOverwrite: true });
    expect(sustituido.status).toBe(200);
    expect((await borradores.obtener('AR2605134'))?.savedBy).toBe('DAVID');

    expect((await servicio.guardar({ pedido: pedidoPantalla(), savedBy: 'DAVID' })).status).toBe(200);
    expect(await borradores.obtener('AR2605134')).toBeNull();
  });
});
