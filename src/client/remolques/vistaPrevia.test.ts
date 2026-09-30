import { describe, expect, it } from 'vitest';
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import type { LonaInput } from '../../remolques/calc/lona.ts';
import { estadoLinea, type LineaPedido } from '../../remolques/workspace/lineas.ts';
import { crearGuardaPeticion, cuerpoVistaPrevia, faltaParaPdf } from './vistaPrevia';

const lona02 = (casos as Array<{ caso: string; input: LonaInput }>).find((c) => c.caso === 'lona-02')!.input;
const linea = (version: string, cambios: Partial<LonaInput> = {}): LineaPedido => ({
  version, tipo: 'lona', id: `id-${version}`, snapshotSvg: '<svg/>', origenRps: null,
  input: { ...lona02, ...cambios, cabecera: { ...lona02.cabecera, numeroPedido: 'AR.26.99990', version } },
});
const estados = (lineas: LineaPedido[]) => Object.fromEntries(lineas.map((l) => [l.version, estadoLinea(l)]));

describe('vista previa del PDF de remolques', () => {
  it('sin elementos no hay PDF', () => {
    expect(faltaParaPdf([], {})).toBe('Añade al menos un elemento.');
  });

  it('dice el primer elemento que falta, con el rótulo de su pestaña', () => {
    const lineas = [linea('10'), linea('11', { altoDelante: 0 })];
    expect(faltaParaPdf(lineas, estados(lineas))).toBe('B · Remolque 200×121: Introduce el alto delantero.');
  });

  it('con todo listo no falta nada', () => {
    const lineas = [linea('10'), linea('11')];
    expect(faltaParaPdf(lineas, estados(lineas))).toBeNull();
  });

  it('manda solo versión, tipo y datos de cada elemento', () => {
    const cuerpo = cuerpoVistaPrevia([linea('10')]);
    expect(cuerpo.elementos).toHaveLength(1);
    expect(Object.keys(cuerpo.elementos[0]).sort()).toEqual(['input', 'tipo', 'version']);
  });

  it('las observaciones van sin las líneas vacías que dejó «Añadir línea»', () => {
    const cuerpo = cuerpoVistaPrevia([linea('10', { observaciones: 'UNA\n\n DOS \n' })]);
    expect(cuerpo.elementos[0].input.observaciones).toBe('UNA\nDOS');
  });
});

describe('guarda de peticiones de la vista previa', () => {
  it('una respuesta que llega tras cerrar o cambiar de pedido ya no es vigente', () => {
    const guarda = crearGuardaPeticion();
    const { numero, senal } = guarda.nueva();
    expect(guarda.vigente(numero)).toBe(true);
    guarda.invalidar();
    expect(guarda.vigente(numero)).toBe(false);
    expect(senal.aborted).toBe(true);
  });

  it('una petición nueva anula la anterior', () => {
    const guarda = crearGuardaPeticion();
    const primera = guarda.nueva();
    const segunda = guarda.nueva();
    expect(guarda.vigente(primera.numero)).toBe(false);
    expect(primera.senal.aborted).toBe(true);
    expect(guarda.vigente(segunda.numero)).toBe(true);
  });
});
