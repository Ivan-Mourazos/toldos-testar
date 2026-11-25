import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { pedidoVariasTelas } from '../domain/corteLona/fixtures/variasTelas.js';
import { generarCorteLona } from '../domain/corteLona/index.js';
import { crearEstadoCorteLona, firmasCorteLona } from '../corteLonaEstado.js';
import { huellaDatos } from '../flujoDwg/flujo.ts';
import { registrarArchivosEscritos } from './cambiosManuales.ts';
import { registrarRutasCadPaginas, type RutaAppMinima } from './rutas.ts';
import type { ReviewMinima } from './servicioCadPaginas.ts';

type ResultadoCorte = { plano: Array<{ dxf: string }>; cortes: { conSacos: Array<{ piezas: Array<{ letra: string }> }> } };
const calcularCorte = (o: unknown, opciones: unknown) => (generarCorteLona as (a: unknown, b: unknown) => ResultadoCorte)(o, opciones);

let raiz: string;
const servidores: http.Server[] = [];

beforeEach(async () => {
  await fs.mkdir(path.resolve('tmp'), { recursive: true });
  raiz = await fs.mkdtemp(path.resolve('tmp/cad-paginas-srv-'));
});

afterEach(async () => {
  for (const s of servidores.splice(0)) await new Promise<void>(resolve => s.close(() => resolve()));
  await fs.rm(raiz, { recursive: true, force: true });
});

async function montarApp({
  reviewRef,
  borradoresDir,
  convertir
}: {
  reviewRef: { valor: ReviewMinima | null };
  borradoresDir: string;
  convertir: (bytes: Uint8Array) => Promise<Buffer>;
}) {
  let handlerRegistrado: Parameters<RutaAppMinima['get']>[1] | null = null;
  const app: RutaAppMinima = {
    get: (_ruta, handler) => { handlerRegistrado = handler; }
  };
  const servicio = registrarRutasCadPaginas(app, {
    obtenerReview: async () => reviewRef.valor,
    ajustes: async () => ({ corteBorradoresDirectory: borradoresDir }),
    oda: { disponible: true, convertir }
  });
  const server = http.createServer((req, res) => {
    const match = /^\/api\/reviews\/([^/]+)\/cad-paginas$/.exec(req.url ?? '');
    if (!match || !handlerRegistrado) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No encontrado' }));
      return;
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const enviar = (status: number, cuerpo: unknown) => {
      res.writeHead(status, headers);
      res.end(JSON.stringify(cuerpo));
    };
    void handlerRegistrado(
      { params: { orderCode: decodeURIComponent(match[1]) } },
      {
        set: (k, v) => {
          headers[k] = v;
          return { json: (cuerpo) => enviar(200, cuerpo) };
        }
      },
      (err) => {
        const e = err as Error & { statusCode?: number };
        enviar(e?.statusCode || 400, { error: e?.message || 'Error' });
      }
    );
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  servidores.push(server);
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, servicio };
}

describe('GET /api/reviews/:orderCode/cad-paginas', () => {
  it('usa caché por mtime+tamaño y la invalida cuando el DWG cambia en disco', async () => {
    const pedido = { ...pedidoVariasTelas(), orderCode: 'AR2600096' };
    const resCorte = calcularCorte(pedido, { ofStockSacos: '0230811' });
    const dxf = resCorte.plano[0].dxf;
    const rutaDwg = path.join(raiz, '2026', 'AR2600096 (plano).dwg');
    await fs.mkdir(path.dirname(rutaDwg), { recursive: true });
    await fs.writeFile(rutaDwg, Buffer.from(dxf, 'utf8'));

    const estado = crearEstadoCorteLona(pedido, { resultado: resCorte, ofStockSacos: '0230811' });
    const escritos = await registrarArchivosEscritos([{ filename: 'AR2600096 (plano).dwg', plano: rutaDwg }]);
    const reviewRef: { valor: ReviewMinima | null } = {
      valor: {
        orderCode: 'AR2600096',
        order: pedido,
        corteLona: estado,
        corteConfirmado: {
          huella: 'h1',
          por: 'IVÁN',
          fecha: new Date().toISOString(),
          filename: 'AR2600096 (plano).dwg',
          plano: rutaDwg,
          datos: huellaDatos(firmasCorteLona(estado)),
          archivosEscritos: escritos
        }
      }
    };

    const convertir = vi.fn(async (bytes: Uint8Array) => Buffer.from(bytes));
    const { url } = await montarApp({ reviewRef, borradoresDir: path.join(raiz, 'borradores'), convertir });

    // Primera petición: convierte con ODA y devuelve SVG real
    const r1 = await (await fetch(`${url}/api/reviews/AR2600096/cad-paginas`)).json();
    expect(r1.tieneDwg).toBe(true);
    expect(r1.origen).toBe('revisado');
    expect(r1.actualizado).toBe(true);
    expect(r1.modificadoAMano).toBe(false);
    expect(r1.cacheado).toBe(false);
    expect(r1.paginas.length).toBeGreaterThanOrEqual(1);
    expect(r1.paginas[0].svg).toContain('fill="#ffffff"');
    // La pestaña Corte enseña solo lo de dentro del recuadro CORTE, como «Planos a corte».
    expect(r1.cortes.length).toBeGreaterThanOrEqual(1);
    expect(r1.cortes[0].archivo).toBe('AR2600096 (plano).dwg');
    expect(r1.cortes[0].vista.length).toBeGreaterThan(0);
    expect(r1.cortes[0].medidasMm.ancho).toBeGreaterThan(0);
    expect(convertir).toHaveBeenCalledTimes(1);

    // Segunda petición sin cambios: sirve de caché sin llamar a ODA
    const r2 = await (await fetch(`${url}/api/reviews/AR2600096/cad-paginas`)).json();
    expect(r2.cacheado).toBe(true);
    expect(r2.paginas[0].svg).toBe(r1.paginas[0].svg);
    expect(convertir).toHaveBeenCalledTimes(1);

    // Modificamos el DWG a mano (como en ZWCAD): invalida caché y detecta modificadoAMano
    const dxfEditado = dxf.replace('AR2600096', 'AR2600096-EDITADO');
    await fs.writeFile(rutaDwg, Buffer.from(dxfEditado, 'utf8'));
    const r3 = await (await fetch(`${url}/api/reviews/AR2600096/cad-paginas`)).json();
    expect(r3.cacheado).toBe(false);
    expect(r3.modificadoAMano).toBe(true);
    expect(r3.archivosModificadosAMano).toEqual(['AR2600096 (plano).dwg']);
    expect(r3.paginas[0].svg).toContain('AR2600096-EDITADO');
    expect(convertir).toHaveBeenCalledTimes(2);
  });

  it('usa el borrador si no existe DWG revisado y devuelve tieneDwg: false cuando no hay ninguno', async () => {
    const borradoresDir = path.join(raiz, 'borradores');
    const reviewRef: { valor: ReviewMinima | null } = {
      valor: { orderCode: 'AR2600099', order: { ...pedidoVariasTelas(), orderCode: 'AR2600099' } }
    };
    const convertir = vi.fn(async (bytes: Uint8Array) => Buffer.from(bytes));
    const { url } = await montarApp({ reviewRef, borradoresDir, convertir });

    // Sin DWG todavía
    const vacio = await (await fetch(`${url}/api/reviews/AR2600099/cad-paginas`)).json();
    expect(vacio.tieneDwg).toBe(false);
    expect(vacio.origen).toBeNull();
    expect(vacio.paginas).toEqual([]);

    // Creamos borrador DXF
    await fs.mkdir(borradoresDir, { recursive: true });
    const dxf = calcularCorte({ ...pedidoVariasTelas(), orderCode: 'AR2600099' }, { ofStockSacos: '0230811' }).plano[0].dxf;
    await fs.writeFile(path.join(borradoresDir, 'AR2600099 (plano).dxf'), dxf, 'utf8');
    const conBorrador = await (await fetch(`${url}/api/reviews/AR2600099/cad-paginas`)).json();
    expect(conBorrador.tieneDwg).toBe(true);
    expect(conBorrador.origen).toBe('borrador');
    expect(conBorrador.paginas.length).toBeGreaterThanOrEqual(1);
    expect(convertir).not.toHaveBeenCalled(); // DXF no necesita ODA
  });

  it('marca actualizado: false si cambiaron las medidas o las letras desde que se generó el DWG', async () => {
    const pedido = { ...pedidoVariasTelas(), orderCode: 'AR2600096' };
    const resCorte = calcularCorte(pedido, { ofStockSacos: '0230811' });
    const estado = crearEstadoCorteLona(pedido, { resultado: resCorte, ofStockSacos: '0230811' });
    const rutaDxf = path.join(raiz, '2026', 'AR2600096 (plano).dxf');
    await fs.mkdir(path.dirname(rutaDxf), { recursive: true });
    await fs.writeFile(rutaDxf, resCorte.plano[0].dxf, 'utf8');

    // Cambiamos el frente del primer toldo
    const pedidoCambiado = structuredClone(pedido);
    pedidoCambiado.awnings[0].width = Number(pedidoCambiado.awnings[0].width) + 25;

    const reviewRef: { valor: ReviewMinima | null } = {
      valor: {
        orderCode: 'AR2600096',
        order: pedidoCambiado,
        corteLona: estado,
        corteConfirmado: {
          huella: 'h1',
          por: 'IVÁN',
          fecha: new Date().toISOString(),
          filename: 'AR2600096 (plano).dxf',
          plano: rutaDxf,
          datos: huellaDatos(firmasCorteLona(estado))
        }
      }
    };
    const { url } = await montarApp({ reviewRef, borradoresDir: path.join(raiz, 'borradores'), convertir: async b => Buffer.from(b) });
    const r = await (await fetch(`${url}/api/reviews/AR2600096/cad-paginas`)).json();
    expect(r.tieneDwg).toBe(true);
    expect(r.actualizado).toBe(false);
    expect(r.motivoDesactualizado).toContain('medidas');
    expect(r.pendientes.length).toBeGreaterThan(0);

    // Ahora cambiamos la letra del toldo
    const pedidoLetra = structuredClone(pedido);
    (pedidoLetra.awnings[0] as Record<string, unknown>).letra = 'Z';
    reviewRef.valor = { ...reviewRef.valor!, order: pedidoLetra };
    const rLetra = await (await fetch(`${url}/api/reviews/AR2600096/cad-paginas`)).json();
    expect(rLetra.actualizado).toBe(false);
    expect(rLetra.letrasCambiadas).toBe(true);
    expect(rLetra.motivoDesactualizado).toContain('letras');
  });
});
