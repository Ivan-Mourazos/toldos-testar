import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import { calcBaqueton, type BaquetonInput } from '../../remolques/calc/baqueton.ts';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { crearPedidoRemolques, marcarPedidoGenerado } from '../../remolques/flujo/pedido.ts';
import { prepararPedidoHoja } from '../../remolques/hoja/pedido.ts';
import type { ElementoPedidoHoja } from '../../remolques/hoja/tipos.ts';
import type { CoordinaStatus } from '../types';
import { FichaPedidoRemolques } from './PedidoRemolquesDetalle';

type Caso = { caso: string; tipo: 'lona' | 'baqueton'; input: LonaInput | BaquetonInput };
const deFixture = (id: string, version: string, of: string): ElementoPedidoHoja => {
  const c = (casos as Caso[]).find((x) => x.caso === id)!;
  return { version, tipo: c.tipo, input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido: 'AR.26.04286', cliente: 'TALLERES CAL', version, ordenFabricacion: of, fecha: '2026-09-01' } } };
};
const pendiente = (params = DEFAULT_PARAMS) => crearPedidoRemolques({
  datos: prepararPedidoHoja([deFixture('lona-02', '10', '0231780'), deFixture('baqueton-01', '11', '0231781')], params),
  autoria: { technician: 'IVÁN', reviewer: '' }, existente: null, ahora: '2026-10-01T08:00:00.000Z',
});
const aprobado: CoordinaStatus = { disponible: true, ofs: { '0231780': { estado: 'aprobada', revisor: 'jaime' }, '0231781': { estado: 'aprobada', revisor: 'jaime' } } };
const nada = () => undefined;
const pintar = (props: Partial<React.ComponentProps<typeof FichaPedidoRemolques>>) => renderToStaticMarkup(
  <FichaPedidoRemolques pedido={pendiente()} cargando={false} coordina={aprobado} currentUser="IVÁN" generando={false}
    onBack={nada} onCorregir={nada} onReutilizar={nada} onGenerar={nada} notify={nada} {...props} />,
);

describe('el pedido de remolques abierto en Pedidos', () => {
  it('pendiente y aprobado: cada elemento con su OF y quién lo aprobó, «Corregir» y «Generar archivos» encendido para el autor', () => {
    const html = pintar({});
    expect(html).toContain('Remolque · Arquillado con aguas');
    expect(html).toContain('Baquetón');
    expect(html).toContain('OF 0231780');
    expect(html).toContain('Aprobado por Jaime');
    expect(html).toContain('Corregir');
    expect(html).toContain('Generar archivos');
    expect(html).not.toMatch(/review-generate-button" type="button" disabled=""/);
  });

  it('otro técnico ve el botón apagado y por qué', () => {
    const html = pintar({ currentUser: 'JAIME' });
    expect(html).toMatch(/review-generate-button" type="button" disabled=""/);
    expect(html).toContain('Lo genera el autor (Iván)');
  });

  it('devuelto en CoordinaOT: la nota en su elemento', () => {
    const html = pintar({ coordina: { disponible: true, ofs: { '0231780': { estado: 'devuelta', nota: 'Falta cota del alto' }, '0231781': { estado: 'aprobada', revisor: 'jaime' } } } });
    expect(html).toContain('Falta cota del alto');
    expect(html).toContain('Sin aprobar en CoordinaOT: A (0231780) devuelta.');
  });

  it('generado: sin «Generar archivos», con el PDF, quién lo revisó y «Reutilizar datos»', () => {
    const generado = marcarPedidoGenerado(pendiente(), {
      revisor: 'JAIME', ahora: '2026-10-02T08:00:00.000Z',
      ficheros: [{ type: 'pdf', filename: 'AR2604286-10.pdf', savedPath: '/p/AR2604286-10.pdf' }, { type: 'pdf', filename: 'AR2604286.pdf', savedPath: '/o/2026/AR2604286.pdf' }],
    });
    const html = pintar({ pedido: generado });
    expect(html).not.toContain('Generar archivos');
    expect(html).not.toContain('Corregir');
    expect(html).toContain('Reutilizar datos');
    expect(html).toContain('href="/api/remolques/pedidos/AR2604286/archivo"');
    expect(html).toContain('revisado por Jaime');
  });

  it('mientras carga lo dice', () => {
    expect(pintar({ cargando: true, pedido: null })).toContain('Cargando el pedido…');
  });

  it('abierto desde el buscador: vuelve al buscador y abre el elemento buscado', () => {
    expect(pintar({})).toContain('← Pedidos');
    const html = desescapar(pintar({ textoVolver: '← Buscar remolques', elementoInicial: '11' }));
    expect(html).toContain('← Buscar remolques');
    expect(html).not.toContain('← Pedidos');
    expect(html).toMatch(/aria-current="true"[^>]*><span class="rem-pestana-rotulo">B · /);
  });
});

// Lo que React escapa en el HTML, de vuelta, para buscar los textos tal cual.
const desescapar = (t: string) => t.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
/** La parte de solo lectura, sin lo que va dentro de los fieldset desactivados. */
const fueraDeLosCamposApagados = (html: string) => html
  .slice(html.indexOf('aria-label="Pedido de remolques en solo lectura"'))
  .replace(/<fieldset class="rem-lectura-campos" disabled="">[\s\S]*?<\/fieldset>/g, '');

describe('el pedido de remolques abierto en Pedidos, en solo lectura', () => {
  it('debajo de la lista: las pestañas A y B y el formulario del primer elemento con sus datos, sin poder escribir', () => {
    const html = desescapar(pintar({}));
    expect(html).toContain('aria-label="Pedido de remolques en solo lectura"');
    // Las pestañas de la pantalla de Remolques, para cambiar de elemento y nada más.
    expect(html).toContain('A · Remolque 200×121');
    expect(html).toContain('B · Baquetón 260×160');
    expect(html).not.toContain('+ Remolque');
    expect(html).not.toContain('+ Baquetón');
    expect(html).not.toContain('Eliminar ');
    // El formulario del remolque A, con lo que se guardó.
    expect(html).toContain('Datos del remolque');
    expect(html).toMatch(/data-campo="largo"[^>]*value="200"/);
    expect(html).toMatch(/data-campo="ordenFabricacion"[^>]*value="0231780"/);
    // Todas las casillas, desplegables y botones del formulario y de los resultados van dentro de
    // un fieldset desactivado: fuera solo quedan las pestañas (el dibujo, sin 3D en la prueba, no
    // tiene botones).
    expect(html).toContain('<fieldset class="rem-lectura-campos" disabled="">');
    const fuera = fueraDeLosCamposApagados(html);
    expect(fuera).not.toMatch(/<(input|textarea|select)\b/);
    const botonesFuera = fuera.match(/<button[^>]*>/g) ?? [];
    expect(botonesFuera).toHaveLength(2);
    expect(botonesFuera.every((boton) => boton.includes('rem-pestana-abrir'))).toBe(true);
    // Nada de lo que solo sirve al editar.
    expect(html).not.toContain('Obtener datos del pedido');
    expect(html).not.toContain('Limpiar');
    expect(html).not.toContain('Añadir línea');
    expect(html).not.toContain('Guardar para revisión');
  });

  it('las pestañas cambian de elemento: con el B elegido salen el formulario y los resultados del baquetón', () => {
    const primero = desescapar(pintar({}));
    expect(primero).toMatch(/aria-current="true"[^>]*><span class="rem-pestana-rotulo">A · /);
    expect(primero).toContain('aria-label="Resultados de la lona"');
    expect(primero).not.toContain('Datos del baquetón');

    const segundo = desescapar(pintar({ elementoInicial: '11' }));
    expect(segundo).toMatch(/aria-current="true"[^>]*><span class="rem-pestana-rotulo">B · /);
    expect(segundo).toContain('Datos del baquetón');
    expect(segundo).not.toContain('Datos del remolque');
    expect(segundo).toContain('aria-label="Resultados del baquetón"');
    expect(segundo).toMatch(/data-campo="baqueton"[^>]*value="12"/);
    // Un elemento que ya no está abre el primero.
    expect(desescapar(pintar({ elementoInicial: '99' }))).toContain('Datos del remolque');
  });

  it('los resultados salen de los parámetros con que se guardó el pedido, no de los de ahora', () => {
    const guardados = {
      ...DEFAULT_PARAMS,
      demasiaLonaHecha: DEFAULT_PARAMS.demasiaLonaHecha + 5,
      baquetonDemasiaLargoCostura: DEFAULT_PARAMS.baquetonDemasiaLargoCostura + 3,
    };
    const pedido = pendiente(guardados);
    const lona = pedido.elementos[0].input as LonaInput;
    const baq = pedido.elementos[1].input as BaquetonInput;
    const lonaHecha = (params: typeof DEFAULT_PARAMS) => {
      const { largo, ancho } = calcLona(lona, params).lonaHecha;
      return `Lona hecha</span><strong>${fmt(largo)} × ${fmt(ancho)}</strong>`;
    };
    expect(lonaHecha(guardados)).not.toBe(lonaHecha(DEFAULT_PARAMS));
    const html = desescapar(pintar({ pedido }));
    expect(html).toContain(lonaHecha(guardados));
    expect(html).not.toContain(lonaHecha(DEFAULT_PARAMS));

    const panoUnico = (params: typeof DEFAULT_PARAMS) => {
      const { largo, ancho } = calcBaqueton(baq, params).panoUnico;
      return `Paño único</span><strong>${fmt(largo)} × ${fmt(ancho)}</strong>`;
    };
    expect(panoUnico(guardados)).not.toBe(panoUnico(DEFAULT_PARAMS));
    const delBaqueton = desescapar(pintar({ pedido, elementoInicial: '11' }));
    expect(delBaqueton).toContain(panoUnico(guardados));
    expect(delBaqueton).not.toContain(panoUnico(DEFAULT_PARAMS));
  });
});
