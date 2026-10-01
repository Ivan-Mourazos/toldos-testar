import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import type { LineaPedidoRps, PedidoRps } from '../../remolques/rps/types.ts';
import { lineasDesdePedidoRps } from '../../remolques/workspace/importar-rps.ts';
import { estadoLinea } from '../../remolques/workspace/lineas.ts';
import type { EstadoConsultaRps } from '../../remolques/workspace/selectores.ts';
import { CabeceraPedido } from './CabeceraPedido';
import { OrigenRpsElemento } from './OrigenRps';
import { PestanasElementos } from './PestanasElementos';

// Iván, 30/09/2026: al obtener el pedido se crean todos los elementos de una vez, como en
// toldos. La cabecera ya no ofrece «Usar línea»: dice en qué elemento quedó cada línea de RPS.

const lineaRps = (numero: number, cambios: Partial<LineaPedidoRps> = {}): LineaPedidoRps => ({
  idLinea: `L${numero}`, numeroLinea: numero, codigoArticulo: 'LONAREMOLQUE',
  ordenFabricacion: `023178${numero}`, cantidad: 1, tipoTrabajo: 'lona',
  largo: 250, ancho: 143, alto: 88, altoDelante: null, altoAtras: null,
  aguas: null, baqueton: null, ventana: true, rotulacion: true,
  recogidaDelante: false, recogidaAtras: true,
  materialRps: { gramaje: 580, color: 'VERDE 6024', texto: 'PVC 580 · color VERDE 6024' },
  materialSugerido: 'LONA ALPHA 1L 580 g/m² :VERDE 6024 :250 AN (580)',
  tipoRotulacion: null, textoRotulacion: null,
  descripcion: 'LONA REMOLQUE', detalle: `POR CONFECCION DE LONA REMOLQUE ${numero}`,
  requiereRevision: false,
  ...cambios,
});

const pedido: PedidoRps = {
  numero: 'AR.26.04286', fecha: '2026-09-01', fechaSalida: '2026-09-08',
  cliente: { codigo: '016573', nombre: 'TALLERES CAL, C. B.', alias: null },
  lineas: [
    lineaRps(1),
    lineaRps(2, { largo: null, ancho: null, alto: null, requiereRevision: true, detalle: 'CONFECCIÓN SEGÚN PATRÓN' }),
    lineaRps(3, { tipoTrabajo: 'baqueton', alto: null, baqueton: 12 }),
  ],
};
const creadas = lineasDesdePedidoRps(pedido, {
  materiales: [], params: DEFAULT_PARAMS, realizadoPor: 'IVÁN', importadoEn: '2026-09-30T10:00:00Z',
});

const cabecera = (lineas = creadas, estadoRps: EstadoConsultaRps = 'encontrado', consultando = false) => renderToStaticMarkup(
  <CabeceraPedido
    numeroPedido="AR.26.04286" cliente="TALLERES CAL, C. B." fecha="2026-09-01" cargando={false}
    onNumeroPedidoChange={() => {}} onClienteChange={() => {}} onFechaChange={() => {}}
    estadoRps={consultando ? 'buscando' : estadoRps} pedidoRps={pedido} errorRps={null}
    lineas={lineas} onConsultarRps={() => {}}
  />,
);

describe('cabecera: el pedido en RPS', () => {
  // Iván, 01/10/2026: un cliente largo se lee entero (pasa a un segundo renglón). Su nombre va
  // aparte: el de la etiqueta que lo envuelve sumaría el propio cliente.
  it('el cliente, en un área que crece, se llama «Cliente»', () => {
    expect(cabecera()).toMatch(/<textarea[^>]*name="clientePedido"[^>]*aria-label="Cliente"[^>]*>TALLERES CAL, C\. B\.<\/textarea>/);
  });

  it('ya no ofrece aplicar las líneas una a una', () => {
    const html = cabecera();
    expect(html).not.toContain('Usar línea');
    expect(html).not.toContain('Volver a aplicar');
    expect(html).not.toContain('Cambiar línea');
  });

  // Iván, 01/10/2026: la cabecera no lista las líneas de RPS (quedaba fea); los elementos están
  // debajo, en sus pestañas, y aquí solo un resumen corto como el de toldos.
  it('no lista las líneas de RPS ni sus botones', () => {
    const html = cabecera();
    expect(html).not.toContain('Pedido en RPS');
    expect(html).not.toContain('rem-rps-lineas');
    expect(html).not.toContain('Abrir B');
    expect(html).not.toContain('Abierto ·');
    expect(html).not.toContain('OF 0231781');
    expect(html).not.toContain('cm · 1 ud.');
  });

  it('con todas creadas, resume cuántas líneas hay y avisa de las que piden revisión', () => {
    const html = cabecera();
    expect(html).toContain('Datos obtenidos de RPS');
    expect(html).toContain('3 líneas de remolque');
    expect(html).toContain('1 línea por revisar');
    expect(html).not.toContain('sin elemento');
  });

  it('si falta algún elemento, lo dice y explica cómo traerlo', () => {
    const html = cabecera([creadas[0]]);
    expect(html).toContain('2 de 3 líneas de remolque sin elemento: pulsa «Obtener datos del pedido» para traerlas.');
  });

  it('sin consultar todavía no enseña ningún resumen y el botón sigue ahí', () => {
    const html = cabecera([], 'idle');
    expect(html).not.toContain('Datos obtenidos de RPS');
    expect(html).toContain('Obtener datos del pedido');
  });

  it('mientras consulta, el botón y una línea compacta lo dicen', () => {
    const html = cabecera([], 'buscando', true);
    expect(html).toContain('Consultando RPS…');
    expect(html).toContain('Consultando el pedido en RPS…');
  });

  it('el pedido no está en la cabecera como segundo grupo: una sola columna de datos', () => {
    expect(cabecera().match(/class="order-header-group /g)).toHaveLength(1);
  });

  it('los estados de RPS siguen como antes', () => {
    const error = renderToStaticMarkup(
      <CabeceraPedido
        numeroPedido="AR.26.04286" cliente="" fecha="2026-09-01" cargando={false}
        onNumeroPedidoChange={() => {}} onClienteChange={() => {}} onFechaChange={() => {}}
        estadoRps="error" pedidoRps={null} errorRps="RPS no responde."
        lineas={[]} onConsultarRps={() => {}}
      />,
    );
    expect(error).toContain('RPS no responde.');
    expect(error).toContain('Reintentar');
  });

  it('RPS no encontró el pedido: se puede seguir a mano', () => {
    expect(cabecera([], 'no-encontrado')).toContain('RPS no encontró este pedido; puedes seguir manualmente.');
  });
});

describe('el elemento creado desde RPS', () => {
  it('la pestaña de la línea para revisar lo avisa sin abrirla', () => {
    const html = renderToStaticMarkup(
      <PestanasElementos
        lineas={creadas}
        estadosLinea={Object.fromEntries(creadas.map((l) => [l.version, estadoLinea(l)]))}
        versionActiva="10" puedeAnadir onSeleccionar={() => {}} onEliminar={() => {}} onNuevo={() => {}}
      />,
    );
    expect(html.match(/>Revisar</g)).toHaveLength(1);
    expect(html).toContain('3 elementos');
    // Lo que RPS no da queda pendiente, como siempre: «falta N» en la pestaña.
    expect(html).toContain('falta');
  });

  it('el formulario dice de qué línea salió y qué hay que comprobar', () => {
    const html = renderToStaticMarkup(<OrigenRpsElemento origen={creadas[1].origenRps!} />);
    expect(html).toContain('De RPS · Línea 2');
    expect(html).toContain('OF 0231782');
    expect(html).toContain('is-revisar');
    expect(html).toContain('RPS no da las medidas completas: revísalas con el texto de la línea.');
    expect(html).toContain('RPS menciona una recogida detrás: elige de qué tipo.');
    expect(html).toContain('CONFECCIÓN SEGÚN PATRÓN');
  });
});
